import { and, asc, desc, eq, gte, inArray, lte, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, batches, collegeQuestionAccess, companyBlueprints, drills, questions, reviewQueue, skills, streaks, users } from "@/db/schema";
import { applyAttempt, canonicalIndex, composeDrill, NEW_SKILL, nextReview, optionOrder, topicPickWeight, type Blueprint, type Candidate } from "./adaptive";
import { applyActivity, NEW_STREAK } from "./streak";
import { istDate } from "./time";
import { rngFor } from "./rng";
import { xpForAttempt, XP } from "./xp";
import { topicById } from "./question-schema";
import { track } from "./events";

export const DRILL_SIZE = 10;
export const NO_REPEAT_DAYS = 14;

export async function targetCompanyFor(userId: string) {
  const [u] = await db
    .select({ target: users.targetCompany, batchTarget: batches.targetCompany })
    .from(users)
    .leftJoin(batches, eq(batches.id, users.batchId))
    .where(eq(users.id, userId))
    .limit(1);
  return u?.target ?? u?.batchTarget ?? "tcs_nqt";
}

export async function blueprintFor(company: string): Promise<Blueprint | null> {
  const [b] = await db.select().from(companyBlueprints).where(eq(companyBlueprints.company, company)).limit(1);
  return b ? { company: b.company, sectionWeights: b.sectionWeights as Record<string, number>, topicWeights: (b.topicWeights as Record<string, number>) ?? null } : null;
}

/** Pure-ish builder: reads DB, decides 10 question ids + option order. Does not write. */
export async function planDrill(userId: string, date: string) {
  const [u] = await db.select({ collegeId: users.collegeId }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u?.collegeId) throw new Error("student has no college");
  const company = await targetCompanyFor(userId);
  const bp = await blueprintFor(company);
  const mySkills = await db.select().from(skills).where(eq(skills.userId, userId));
  const skillByTopic = new Map(mySkills.map((s) => [s.topic, s]));

  const since = new Date(Date.now() - NO_REPEAT_DAYS * 86_400_000);
  const recentlySeen = db.select({ q: attempts.questionId }).from(attempts).where(and(eq(attempts.userId, userId), gte(attempts.createdAt, since)));
  const base = and(eq(collegeQuestionAccess.collegeId, u.collegeId), eq(questions.status, "golden"));
  const cols = { id: questions.id, topic: questions.topic, difficulty: questions.difficulty };
  const candidates: Candidate[] = await db
    .select(cols)
    .from(collegeQuestionAccess)
    .innerJoin(questions, eq(questions.id, collegeQuestionAccess.questionId))
    .where(and(base, notInArray(questions.id, recentlySeen)));
  let fallback: Candidate[] = [];
  if (candidates.length < DRILL_SIZE) {
    // Pool exhausted: allow least-recently-seen questions.
    fallback = await db
      .select({ ...cols, last: sql<Date>`max(${attempts.createdAt})` })
      .from(collegeQuestionAccess)
      .innerJoin(questions, eq(questions.id, collegeQuestionAccess.questionId))
      .leftJoin(attempts, and(eq(attempts.questionId, questions.id), eq(attempts.userId, userId)))
      .where(base)
      .groupBy(questions.id)
      .orderBy(sql`max(${attempts.createdAt}) asc nulls first`)
      .then((rows) => rows.map(({ id, topic, difficulty }) => ({ id, topic, difficulty })));
  }
  const due = await db
    .select({ q: reviewQueue.questionId })
    .from(reviewQueue)
    .innerJoin(questions, eq(questions.id, reviewQueue.questionId))
    .innerJoin(collegeQuestionAccess, and(eq(collegeQuestionAccess.questionId, reviewQueue.questionId), eq(collegeQuestionAccess.collegeId, u.collegeId)))
    .where(and(eq(reviewQueue.userId, userId), lte(reviewQueue.dueOn, date), eq(questions.status, "golden")))
    .orderBy(asc(reviewQueue.dueOn));

  const rng = rngFor(userId, date);
  const { ids, slots } = composeDrill({
    candidates,
    fallback,
    reviewDue: due.map((d) => d.q),
    bandFor: (t) => skillByTopic.get(t)?.band ?? NEW_SKILL.band,
    topicWeight: (t) => topicPickWeight(t, topicById.get(t)?.section ?? "quant", bp, skillByTopic.get(t)?.rating),
    rng,
    size: DRILL_SIZE,
  });
  return { questionIds: ids, slots, optionOrder: ids.map(() => optionOrder(rng)), company };
}

/** Get or create the drill for (user, IST date). Race-safe via the unique index. */
export async function getOrCreateDrill(userId: string, date = istDate()) {
  const [existing] = await db.select().from(drills).where(and(eq(drills.userId, userId), eq(drills.date, date))).limit(1);
  if (existing) return existing;
  const plan = await planDrill(userId, date);
  if (plan.questionIds.length === 0) throw new Error("no questions available for this college");
  await db.insert(drills).values({ userId, date, questionIds: plan.questionIds, optionOrder: plan.optionOrder }).onConflictDoNothing();
  const [row] = await db.select().from(drills).where(and(eq(drills.userId, userId), eq(drills.date, date))).limit(1);
  return row;
}

import type { AttemptResultDto, DrillQuestionDto } from "./drill-types";
export type { AttemptResultDto, DrillQuestionDto };

/** Questions in the student's option order. Never includes the answer. */
export async function drillForClient(userId: string, drillId: string) {
  const [d] = await db.select().from(drills).where(and(eq(drills.id, drillId), eq(drills.userId, userId))).limit(1);
  if (!d) return null;
  const qs = await db.select().from(questions).where(inArray(questions.id, d.questionIds));
  const byId = new Map(qs.map((q) => [q.id, q]));
  const items: DrillQuestionDto[] = d.questionIds.map((id, i) => {
    const q = byId.get(id)!;
    const order = d.optionOrder[i];
    return { id, index: i, section: q.section, topic: q.topic, stem: q.stem, options: order.map((k) => q.options[k]), timeSec: q.timeSec };
  });
  const done = await db.select().from(attempts).where(and(eq(attempts.userId, userId), eq(attempts.drillId, drillId)));
  const results: AttemptResultDto[] = done.map((a) => resultFor(d, byId.get(a.questionId)!, a));
  return { drill: d, items, results };
}

type DrillRow = typeof drills.$inferSelect;
type QuestionRow = typeof questions.$inferSelect;
function resultFor(d: DrillRow, q: QuestionRow, a: { chosenIndex: number | null; correct: boolean; timeMs: number }): AttemptResultDto {
  const pos = d.questionIds.indexOf(q.id);
  const order = d.optionOrder[pos];
  return {
    questionId: q.id,
    correct: a.correct,
    chosenDisplayed: a.chosenIndex === null ? null : order.indexOf(a.chosenIndex),
    correctDisplayed: order.indexOf(q.answerIndex),
    explanation: q.explanation,
    shortcut: q.shortcut,
    xp: xpForAttempt(a.correct, a.timeMs, q.timeSec),
  };
}

export type SubmitInput = { clientId: string; drillId: string; questionId: string; displayedIndex: number | null; timeMs: number };
export type SubmitOutput = AttemptResultDto & { duplicate: boolean; drillCompleted: boolean; answered: number; score: number };

/**
 * Grade one answer in code (idempotent by clientId; one answer per question per drill).
 * Side effects (skill Elo/band, review queue, XP, streak on completion) run exactly once.
 */
export async function gradeAttempt(userId: string, input: SubmitInput, now = new Date()): Promise<SubmitOutput> {
  const out = await gradeInTx(userId, input, now);
  if (out.drillCompleted && !out.duplicate) await track("drill_completed", { userId, props: { drillId: input.drillId, score: out.score } });
  return out;
}

async function gradeInTx(userId: string, input: SubmitInput, now: Date): Promise<SubmitOutput> {
  const today = istDate(now);
  return db.transaction(async (tx) => {
    const [d] = await tx.select().from(drills).where(and(eq(drills.id, input.drillId), eq(drills.userId, userId))).for("update").limit(1);
    if (!d) throw new GradeError(404, "drill not found");
    const pos = d.questionIds.indexOf(input.questionId);
    if (pos < 0) throw new GradeError(400, "question not in drill");
    const [q] = await tx.select().from(questions).where(eq(questions.id, input.questionId)).limit(1);
    const order = d.optionOrder[pos];
    const progress = async () => {
      const rows = await tx.select({ correct: attempts.correct }).from(attempts).where(and(eq(attempts.userId, userId), eq(attempts.drillId, d.id)));
      return { answered: rows.length, score: rows.filter((r) => r.correct).length };
    };

    // Replay of the same clientId, or a second answer to the same question → return the stored result.
    const [prior] = await tx
      .select()
      .from(attempts)
      .where(and(eq(attempts.userId, userId), sql`(${attempts.clientId} = ${input.clientId} or (${attempts.drillId} = ${d.id} and ${attempts.questionId} = ${q.id}))`))
      .limit(1);
    if (prior) {
      const p = await progress();
      return { ...resultFor(d, q, prior), duplicate: true, drillCompleted: Boolean(d.completedAt), ...p };
    }

    const displayed = input.displayedIndex;
    const valid = displayed !== null && Number.isInteger(displayed) && displayed >= 0 && displayed < 4;
    const chosen = valid ? canonicalIndex(order, displayed) : null;
    const correct = chosen !== null && chosen === q.answerIndex;
    const timeMs = Math.max(0, Math.min(Math.round(input.timeMs) || 0, 30 * 60_000));
    await tx.insert(attempts).values({ clientId: input.clientId.slice(0, 80), userId, questionId: q.id, drillId: d.id, chosenIndex: chosen, correct, timeMs, createdAt: now });

    // Skill (Elo + band)
    const [sk] = await tx.select().from(skills).where(and(eq(skills.userId, userId), eq(skills.topic, q.topic))).limit(1);
    const next = applyAttempt(sk ?? { ...NEW_SKILL }, { correct, timeMs, timeSec: q.timeSec, difficulty: q.difficulty }, today);
    await tx
      .insert(skills)
      .values({ userId, topic: q.topic, ...next, updatedAt: now })
      .onConflictDoUpdate({ target: [skills.userId, skills.topic], set: { ...next, updatedAt: now } });

    // Spaced review
    const [rq] = await tx.select().from(reviewQueue).where(and(eq(reviewQueue.userId, userId), eq(reviewQueue.questionId, q.id))).limit(1);
    const nr = nextReview(rq?.stage ?? null, correct, today);
    if (nr) await tx.insert(reviewQueue).values({ userId, questionId: q.id, ...nr }).onConflictDoUpdate({ target: [reviewQueue.userId, reviewQueue.questionId], set: nr });
    else if (rq) await tx.delete(reviewQueue).where(and(eq(reviewQueue.userId, userId), eq(reviewQueue.questionId, q.id)));

    let xp = xpForAttempt(correct, timeMs, q.timeSec);
    const p = await progress();
    let drillCompleted = Boolean(d.completedAt);
    if (!d.completedAt && p.answered >= d.questionIds.length) {
      drillCompleted = true;
      xp += XP.drillComplete;
      await tx.update(drills).set({ completedAt: now, score: p.score }).where(eq(drills.id, d.id));
      const [st] = await tx.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);
      // Streak counts the IST day the drill belongs to; a late-synced offline drill still counts for its own day.
      const { state } = applyActivity(st ?? { ...NEW_STREAK }, d.date <= today ? d.date : today);
      await tx.insert(streaks).values({ userId, ...state }).onConflictDoUpdate({ target: streaks.userId, set: state });
    }
    await tx.update(users).set({ xp: sql`${users.xp} + ${xp}`, lastActiveAt: now }).where(eq(users.id, userId));
    return { ...resultFor(d, q, { chosenIndex: chosen, correct, timeMs }), xp, duplicate: false, drillCompleted, ...p };
  });
}

export class GradeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function recentDrills(userId: string, limit = 14) {
  return db.select().from(drills).where(eq(drills.userId, userId)).orderBy(desc(drills.date)).limit(limit);
}
