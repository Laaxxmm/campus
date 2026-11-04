import { and, desc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { attemptInsights, attempts, collegeQuestionAccess, drills, mockAttempts, mocks, questions, skills, users, weeklyFocus } from "@/db/schema";
import { analyse, type InsightFacts, type SessionAttempt, type TopicHistory } from "@/lib/insights/rules";
import { InsightTextSchema, templateText, type InsightText } from "@/lib/insights/text";
import { composeDrill, NEW_SKILL, optionOrder, topicPickWeight } from "@/lib/adaptive";
import { aiEnabled, anthropic, MODELS, parseJsonObject, textOf } from "@/lib/llm";
import { logLlmUsage } from "@/lib/llm-usage";
import { rngFor } from "@/lib/rng";
import { istDate, weekStart } from "@/lib/time";
import { topicById, topicName } from "@/lib/question-schema";
import { blueprintFor, targetCompanyFor } from "@/lib/drill";

export type Rephraser = (facts: InsightFacts, draft: InsightText) => Promise<{ text: InsightText; model: string; usage?: Parameters<typeof logLlmUsage>[2] }>;

const SYSTEM = `You rewrite placement-practice feedback for an Indian engineering student. You receive computed facts and a draft.
Rules: keep every number and topic exactly as given; do not add claims; calm, encouraging, specific; second person; no names; max 3 bullets.
Return STRICT JSON with the same shape as the draft: {"headline": string, "whatsWrong": string[], "focus": [{"topic": string, "line": string}], "note": string|null}.`;

/** Haiku rephrasing (optional). Input is computed facts only — no PII. */
export const haikuRephraser: Rephraser = async (facts, draft) => {
  const msg = await anthropic().messages.create({
    model: MODELS.fast(),
    max_tokens: 1200,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: JSON.stringify({ facts: facts.facts, focus: facts.focus, draft }) }],
  });
  return { text: parseJsonObject<InsightText>(textOf(msg)), model: MODELS.fast(), usage: msg.usage };
};

/** Validate LLM output strictly; any deviation (shape, topics, dropped numbers) → template. */
export async function phrase(facts: InsightFacts, rephraser: Rephraser | null, who: { userId: string; collegeId: string | null }) {
  const draft = templateText(facts, topicName);
  if (!rephraser) return { text: draft, model: "template" };
  try {
    const out = await rephraser(facts, draft);
    const parsed = InsightTextSchema.safeParse(out.text);
    const sameTopics = parsed.success && JSON.stringify(parsed.data.focus.map((f) => f.topic)) === JSON.stringify(draft.focus.map((f) => f.topic));
    const numbers = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).sort().join(",");
    const keepsNumbers = parsed.success && numbers(parsed.data.whatsWrong.join(" ")) === numbers(draft.whatsWrong.join(" "));
    await logLlmUsage("insight_phrase", out.model, out.usage, who);
    if (parsed.success && sameTopics && keepsNumbers && parsed.data.whatsWrong.length === draft.whatsWrong.length) return { text: parsed.data, model: out.model };
  } catch (e) {
    console.error(JSON.stringify({ level: "warn", msg: "insight rephrase failed, using template", err: String(e) }));
  }
  return { text: draft, model: "template" };
}

async function topicHistory(userId: string, until: Date): Promise<TopicHistory[]> {
  const since = new Date(until.getTime() - 30 * 86_400_000);
  const rows = await db
    .select({ topic: questions.topic, n: sql<number>`count(*)::int`, c: sql<number>`sum(case when ${attempts.correct} then 1 else 0 end)::int`, r: sql<number>`avg(${attempts.timeMs}::float / (${questions.timeSec} * 1000))` })
    .from(attempts)
    .innerJoin(questions, eq(questions.id, attempts.questionId))
    .where(and(eq(attempts.userId, userId), gte(attempts.createdAt, since), sql`${attempts.createdAt} <= ${until.toISOString().replace("Z", "")}::timestamp + interval '1 second'`))
    .groupBy(questions.topic);
  return rows.map((r) => ({ topic: r.topic, attempts: r.n, correct: r.c, avgTimeRatio: r.r }));
}

async function sessionAttempts(where: ReturnType<typeof eq>): Promise<SessionAttempt[]> {
  const rows = await db
    .select({ questionId: attempts.questionId, topic: questions.topic, section: questions.section, difficulty: questions.difficulty, timeMs: attempts.timeMs, timeSec: questions.timeSec, chosen: attempts.chosenIndex, correct: attempts.correct, answerChanges: attempts.answerChanges, marked: attempts.marked })
    .from(attempts)
    .innerJoin(questions, eq(questions.id, attempts.questionId))
    .where(where);
  return rows;
}

async function companyWeight(userId: string) {
  const bp = await blueprintFor(await targetCompanyFor(userId));
  return (t: string) => (bp?.topicWeights?.[t] ?? 1) * (bp?.sectionWeights[topicById.get(t)?.section ?? "quant"] ? 1 : 0.5);
}

async function saveFocus(userId: string, f: InsightFacts) {
  if (!f.focus.length) return;
  const ws = weekStart(istDate());
  const topics = f.focus.map((x) => x.topic);
  const targets = Object.fromEntries(f.focus.map((x) => [x.topic, x.dailyTarget]));
  await db.insert(weeklyFocus).values({ userId, weekStart: ws, topics, dailyTargets: targets }).onConflictDoUpdate({ target: [weeklyFocus.userId, weeklyFocus.weekStart], set: { topics, dailyTargets: targets } });
}

type Who = { id: string; collegeId: string | null };

/** Insight for a completed drill (cached). Null if the drill isn't this student's or has no answers. */
export async function insightForDrill(user: Who, drillId: string, rephraser: Rephraser | null = aiEnabled() ? haikuRephraser : null) {
  const [cached] = await db.select().from(attemptInsights).where(and(eq(attemptInsights.drillId, drillId), eq(attemptInsights.userId, user.id)));
  if (cached) return cached;
  const [d] = await db.select().from(drills).where(and(eq(drills.id, drillId), eq(drills.userId, user.id)));
  if (!d) return null;
  const session = await sessionAttempts(and(eq(attempts.userId, user.id), eq(attempts.drillId, d.id))!);
  if (!session.length) return null;
  const until = d.completedAt ?? new Date();
  const prev = await db.select({ score: drills.score, n: sql<number>`cardinality(${drills.questionIds})` }).from(drills).where(and(eq(drills.userId, user.id), isNotNull(drills.completedAt), lt(drills.completedAt, until))).orderBy(desc(drills.completedAt)).limit(3);
  const facts = analyse(session, await topicHistory(user.id, until), { kind: "drill", negativeMark: 0, previousAccuracies: prev.map((p) => (p.score ?? 0) / Math.max(1, p.n)), topicWeight: await companyWeight(user.id) });
  const { text, model } = await phrase(facts, rephraser, { userId: user.id, collegeId: user.collegeId });
  const [row] = await db.insert(attemptInsights).values({ userId: user.id, drillId: d.id, facts, text, model }).onConflictDoNothing().returning();
  await saveFocus(user.id, facts);
  return row ?? (await db.select().from(attemptInsights).where(eq(attemptInsights.drillId, d.id)))[0];
}

export async function insightForMock(user: Who, attemptId: string, rephraser: Rephraser | null = aiEnabled() ? haikuRephraser : null) {
  const [cached] = await db.select().from(attemptInsights).where(and(eq(attemptInsights.mockAttemptId, attemptId), eq(attemptInsights.userId, user.id)));
  if (cached) return cached;
  const [a] = await db.select().from(mockAttempts).where(and(eq(mockAttempts.id, attemptId), eq(mockAttempts.userId, user.id)));
  if (!a?.endedAt) return null;
  const [m] = await db.select().from(mocks).where(eq(mocks.id, a.mockId));
  const answered = await sessionAttempts(and(eq(attempts.userId, user.id), eq(attempts.mockAttemptId, a.id))!);
  // skipped questions have no attempt row — add them so time/skip facts see the whole paper
  const qs = await db.select().from(questions).where(inArray(questions.id, a.questionIds));
  const skipped: SessionAttempt[] = qs.filter((q) => !answered.some((x) => x.questionId === q.id)).map((q) => ({ questionId: q.id, topic: q.topic, section: q.section, difficulty: q.difficulty, timeMs: a.answers[q.id]?.timeMs ?? 0, timeSec: q.timeSec, chosen: null, correct: false, answerChanges: a.answers[q.id]?.changes ?? 0, marked: Boolean(a.answers[q.id]?.flagged) }));
  const prev = await db.select({ c: mockAttempts.correctCount, w: mockAttempts.wrongCount }).from(mockAttempts).where(and(eq(mockAttempts.userId, user.id), isNotNull(mockAttempts.endedAt), lt(mockAttempts.endedAt, a.endedAt))).orderBy(desc(mockAttempts.endedAt)).limit(3);
  const facts = analyse([...answered, ...skipped], await topicHistory(user.id, a.endedAt), { kind: "mock", negativeMark: m.negativeMark, previousAccuracies: prev.map((p) => (p.c ?? 0) / Math.max(1, (p.c ?? 0) + (p.w ?? 0))), topicWeight: await companyWeight(user.id) });
  const { text, model } = await phrase(facts, rephraser, { userId: user.id, collegeId: user.collegeId });
  const [row] = await db.insert(attemptInsights).values({ userId: user.id, mockAttemptId: a.id, facts, text, model }).onConflictDoNothing().returning();
  await saveFocus(user.id, facts);
  return row ?? (await db.select().from(attemptInsights).where(eq(attemptInsights.mockAttemptId, a.id)))[0];
}

/** One-tap focus drill: 10 questions from the given topics at the student's band, college subset, unseen first. */
export async function createFocusDrill(user: Who, topics: string[], opts: { assignmentId?: string; size?: number } = {}) {
  const valid = topics.filter((t) => topicById.has(t)).slice(0, 5);
  if (!valid.length || !user.collegeId) throw new Error("no valid topics");
  const since = new Date(Date.now() - 3 * 86_400_000);
  const recent = db.select({ q: attempts.questionId }).from(attempts).where(and(eq(attempts.userId, user.id), gte(attempts.createdAt, since)));
  const base = and(eq(collegeQuestionAccess.collegeId, user.collegeId), eq(questions.status, "golden"), inArray(questions.topic, valid));
  const cols = { id: questions.id, topic: questions.topic, difficulty: questions.difficulty };
  const fresh = await db.select(cols).from(collegeQuestionAccess).innerJoin(questions, eq(questions.id, collegeQuestionAccess.questionId)).where(and(base, sql`${questions.id} not in ${recent}`));
  const all = await db.select(cols).from(collegeQuestionAccess).innerJoin(questions, eq(questions.id, collegeQuestionAccess.questionId)).where(base);
  const sk = new Map((await db.select().from(skills).where(eq(skills.userId, user.id))).map((s) => [s.topic, s]));
  const bp = await blueprintFor(await targetCompanyFor(user.id));
  const rng = rngFor(user.id, valid.join(","), Date.now());
  const plan = composeDrill({ candidates: fresh, fallback: all, reviewDue: [], bandFor: (t) => sk.get(t)?.band ?? NEW_SKILL.band, topicWeight: (t) => topicPickWeight(t, topicById.get(t)?.section ?? "quant", bp, sk.get(t)?.rating), rng, size: opts.size ?? 10 });
  if (!plan.ids.length) throw new Error("no questions for these topics yet");
  const [d] = await db.insert(drills).values({ userId: user.id, date: istDate(), kind: "focus", focusTopics: valid, assignmentId: opts.assignmentId ?? null, questionIds: plan.ids, optionOrder: plan.ids.map(() => optionOrder(rng)) }).returning();
  return d;
}

/** /insights page data. */
export async function insightsOverview(user: Who) {
  const recent = await db.select().from(attemptInsights).where(eq(attemptInsights.userId, user.id)).orderBy(desc(attemptInsights.createdAt)).limit(6);
  const ws = weekStart(istDate());
  const [focus] = await db.select().from(weeklyFocus).where(and(eq(weeklyFocus.userId, user.id), eq(weeklyFocus.weekStart, ws)));
  let progress: { topic: string; name: string; target: number; done: number }[] = [];
  if (focus) {
    const topics = focus.topics as string[];
    const targets = focus.dailyTargets as Record<string, number>;
    const days = Math.max(1, Math.round((Date.now() - new Date(`${ws}T00:00:00+05:30`).getTime()) / 86_400_000) + 1);
    const done = await db
      .select({ topic: questions.topic, n: sql<number>`count(*)::int` })
      .from(attempts)
      .innerJoin(questions, eq(questions.id, attempts.questionId))
      .where(and(eq(attempts.userId, user.id), gte(attempts.createdAt, new Date(`${ws}T00:00:00+05:30`)), inArray(questions.topic, topics)))
      .groupBy(questions.topic);
    progress = topics.map((t) => ({ topic: t, name: topicName(t), target: (targets[t] ?? 3) * Math.min(7, days), done: done.find((d) => d.topic === t)?.n ?? 0 }));
  }
  const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, user.id));
  return { recent, focus, progress, name: u?.name ?? "" };
}
