import { and, eq, inArray, sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "./index";
import { attempts, collegeQuestionAccess, companyBlueprints, drills, mocks, questions, readinessSnapshots, reviewQueue, skills, streaks, users } from "./schema";
import { readBankDir } from "../lib/bank-files";
import { TOPICS, validateBank } from "../lib/question-schema";
import { syncCollegeAccess } from "../lib/bank";
import { applyActivity, NEW_STREAK, type StreakState } from "../lib/streak";
import { applyAttempt, NEW_SKILL, nextReview, optionOrder, readiness, type SkillState } from "../lib/adaptive";
import { addDays, istDate, istMidnightUtc, isoWeek } from "../lib/time";
import { mulberry32, hashString, shuffle } from "../lib/rng";
import { xpForAttempt, XP } from "../lib/xp";

type BlueprintFile = {
  company: string;
  name: string;
  section_weights: Record<string, number>;
  topic_weights: Record<string, number>;
  notes: string;
  mock: { title: string; duration_sec: number; negative_mark: number; sectional: boolean; instructions: string; blueprint: { section: string; count: number; difficulty: [number, number]; timeSec: number }[] };
}[];

export function loadBlueprints(): BlueprintFile {
  return JSON.parse(readFileSync(join(process.cwd(), "content", "blueprints.json"), "utf8"));
}

export async function seedQuestions() {
  const { ok, issues } = validateBank(readBankDir());
  if (issues.length) throw new Error(`bank has ${issues.length} validation errors — run npm run bank:validate`);
  for (let i = 0; i < ok.length; i += 200) {
    const chunk = ok.slice(i, i + 200).map((q) => ({
      id: q.id,
      section: q.section,
      topic: q.topic,
      subtopic: q.subtopic,
      stem: q.stem,
      options: q.options,
      answerIndex: q.answer_index,
      explanation: q.explanation,
      shortcut: q.shortcut ?? null,
      companyTags: q.company_tags,
      difficulty: q.difficulty,
      timeSec: q.time_sec,
      source: q.source,
      seedId: q.seed_id ?? null,
      status: q.status,
      variantGroup: q.variant_group,
      version: q.version,
    }));
    await db
      .insert(questions)
      .values(chunk)
      .onConflictDoUpdate({
        target: questions.id,
        set: {
          stem: sql`excluded.stem`,
          options: sql`excluded.options`,
          answerIndex: sql`excluded.answer_index`,
          explanation: sql`excluded.explanation`,
          shortcut: sql`excluded.shortcut`,
          companyTags: sql`excluded.company_tags`,
          difficulty: sql`excluded.difficulty`,
          timeSec: sql`excluded.time_sec`,
          subtopic: sql`excluded.subtopic`,
          variantGroup: sql`excluded.variant_group`,
        },
      });
  }
  return ok.length;
}

export async function seedBlueprintsAndMocks() {
  const bps = loadBlueprints();
  for (const b of bps) {
    await db
      .insert(companyBlueprints)
      .values({ company: b.company, sectionWeights: b.section_weights, topicWeights: b.topic_weights, notes: b.notes })
      .onConflictDoUpdate({ target: companyBlueprints.company, set: { sectionWeights: b.section_weights, topicWeights: b.topic_weights, notes: b.notes } });
    const [m] = await db.select().from(mocks).where(and(eq(mocks.company, b.company), eq(mocks.title, b.mock.title))).limit(1);
    const v = { blueprint: b.mock.blueprint, durationSec: b.mock.duration_sec, negativeMark: b.mock.negative_mark, sectional: b.mock.sectional, instructions: b.mock.instructions };
    if (m) await db.update(mocks).set(v).where(eq(mocks.id, m.id));
    else await db.insert(mocks).values({ company: b.company, title: b.mock.title, ...v });
  }
}

const isSundayIst = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() === 0;

type Student = { id: string; collegeId: string | null; targetCompany: string | null; email: string };

/**
 * 3 weeks of synthetic activity so dashboards aren't empty. Only for students with no drills yet → idempotent.
 * Deterministic per student email. Uses the real adaptive/streak/xp code so data is self-consistent.
 */
export async function seedActivity(students: Student[], opts: { days?: number; today?: string } = {}) {
  const days = opts.days ?? 21;
  const today = opts.today ?? istDate();
  const ids = students.map((s) => s.id);
  if (!ids.length) return 0;
  const already = new Set((await db.select({ u: drills.userId }).from(drills).where(inArray(drills.userId, ids)).groupBy(drills.userId)).map((r) => r.u));
  const todo = students.filter((s) => !already.has(s.id));
  if (!todo.length) return 0;

  const bps = new Map(loadBlueprints().map((b) => [b.company, b]));
  const topicsBySection: Record<string, string[]> = {};
  for (const t of TOPICS) (topicsBySection[t.section] ??= []).push(t.id);

  const byCollege = new Map<string, { id: string; topic: string; difficulty: number; timeSec: number; answerIndex: number }[]>();
  for (const cid of new Set(todo.map((s) => s.collegeId!).filter(Boolean))) {
    byCollege.set(
      cid,
      await db
        .select({ id: questions.id, topic: questions.topic, difficulty: questions.difficulty, timeSec: questions.timeSec, answerIndex: questions.answerIndex })
        .from(collegeQuestionAccess)
        .innerJoin(questions, eq(questions.id, collegeQuestionAccess.questionId))
        .where(and(eq(collegeQuestionAccess.collegeId, cid), eq(questions.status, "golden"))),
    );
  }

  let made = 0;
  for (const s of todo) {
    const pool = byCollege.get(s.collegeId ?? "") ?? [];
    if (pool.length < 10) continue;
    const rng = mulberry32(hashString(s.email));
    const ability = 0.35 + rng() * 0.5; // base accuracy
    const persona = rng();
    // ~15% dropped off (inactive last 6+ days), ~20% sporadic, rest regular.
    const pActive = persona < 0.15 ? 0.7 : persona < 0.35 ? 0.45 : 0.88;
    const stopAfter = persona < 0.15 ? days - 6 - Math.floor(rng() * 4) : days;
    const skill = new Map<string, SkillState>();
    let streak: StreakState = { ...NEW_STREAK };
    let xp = 0;
    let lastActive: Date | null = null;
    const review = new Map<string, { stage: number; dueOn: string }>();
    const drillRows: (typeof drills.$inferInsert)[] = [];
    const attemptRows: (typeof attempts.$inferInsert)[] = [];
    const snaps: (typeof readinessSnapshots.$inferInsert)[] = [];
    const recent: boolean[] = [];

    for (let d = days; d >= 1; d--) {
      const date = addDays(today, -d);
      const dayIdx = days - d;
      if (dayIdx >= stopAfter || rng() > pActive) {
        if (isSundayIst(date)) pushSnaps(date);
        continue;
      }
      const picks = shuffle(pool, rng).slice(0, 10);
      const drillId = crypto.randomUUID();
      const order = picks.map(() => optionOrder(rng));
      let score = 0;
      const startedAt = new Date(istMidnightUtc(date).getTime() + (7 + Math.floor(rng() * 14)) * 3600_000);
      picks.forEach((q, i) => {
        const p = Math.min(0.95, Math.max(0.1, ability + (3 - q.difficulty) * 0.08));
        const correct = rng() < p;
        const timeMs = Math.round(q.timeSec * 1000 * (0.35 + rng() * 0.9));
        if (correct) score++;
        xp += xpForAttempt(correct, timeMs, q.timeSec);
        const st = skill.get(q.topic) ?? { ...NEW_SKILL };
        skill.set(q.topic, applyAttempt(st, { correct, timeMs, timeSec: q.timeSec, difficulty: q.difficulty }, date));
        const nr = nextReview(review.get(q.id)?.stage ?? null, correct, date);
        if (nr) review.set(q.id, nr);
        else review.delete(q.id);
        recent.push(correct);
        if (recent.length > 50) recent.shift();
        const shown = order[i].indexOf(q.answerIndex);
        attemptRows.push({
          clientId: `seed-${drillId}-${i}`,
          userId: s.id,
          questionId: q.id,
          drillId,
          chosenIndex: correct ? q.answerIndex : order[i][(shown + 1) % 4],
          correct,
          timeMs,
          createdAt: new Date(startedAt.getTime() + i * 45_000),
        });
      });
      xp += XP.drillComplete;
      streak = applyActivity(streak, date).state;
      lastActive = new Date(startedAt.getTime() + 8 * 60_000);
      drillRows.push({ id: drillId, userId: s.id, date, questionIds: picks.map((q) => q.id), optionOrder: order, completedAt: lastActive, score });
      if (isSundayIst(date)) pushSnaps(date);
    }
    pushSnaps(today);

    function pushSnaps(date: string) {
      const ratings = new Map([...skill].map(([t, v]) => [t, v.rating]));
      const acc = recent.length ? recent.filter(Boolean).length / recent.length : null;
      const week = isoWeek(date);
      for (const [company, b] of bps) {
        if (snaps.some((x) => x.company === company && x.week === week)) continue;
        const r = readiness({ company, sectionWeights: b.section_weights, topicWeights: b.topic_weights }, topicsBySection, ratings, acc);
        snaps.push({ userId: s.id, company, week, score: r.score, topicBreakdown: r.breakdown });
      }
    }

    if (!drillRows.length) continue;
    await db.transaction(async (tx) => {
      await tx.insert(drills).values(drillRows).onConflictDoNothing();
      for (let i = 0; i < attemptRows.length; i += 500) await tx.insert(attempts).values(attemptRows.slice(i, i + 500)).onConflictDoNothing();
      const skillRows = [...skill].map(([topic, v]) => ({ userId: s.id, topic, rating: v.rating, band: v.band, streakRight: v.streakRight, streakWrong: v.streakWrong, bandChangedOn: v.bandChangedOn }));
      if (skillRows.length) await tx.insert(skills).values(skillRows).onConflictDoNothing();
      await tx.insert(streaks).values({ userId: s.id, ...streak }).onConflictDoNothing();
      const rq = [...review].map(([questionId, v]) => ({ userId: s.id, questionId, stage: v.stage, dueOn: v.dueOn }));
      if (rq.length) await tx.insert(reviewQueue).values(rq).onConflictDoNothing();
      if (snaps.length) await tx.insert(readinessSnapshots).values(snaps).onConflictDoNothing();
      await tx.update(users).set({ xp, lastActiveAt: lastActive }).where(eq(users.id, s.id));
    });
    made++;
  }
  return made;
}

export { syncCollegeAccess };
