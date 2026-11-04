import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, batchMocks, collegeQuestionAccess, mockAttempts, mocks, questions, users } from "@/db/schema";
import { optionOrder } from "@/lib/adaptive";
import { rngFor, shuffle } from "@/lib/rng";
import { percentileRank, round2, SAVE_GRACE_MS, scoreAttempt, sectionDeadlines, openSection, type StoredAnswer } from "@/lib/mock-scoring";
import type { BlueprintRow, MockAnswerDto, MockAttemptDto, MockResultDto, MockSummaryDto } from "@/lib/mock-types";
import { track } from "@/lib/events";

type Student = { id: string; collegeId: string | null; batchId: string | null };

export class MockError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type MockRow = typeof mocks.$inferSelect;
type AttemptRow = typeof mockAttempts.$inferSelect;

const rows = (m: MockRow) => m.blueprint as BlueprintRow[];
const sectionsOf = (m: MockRow) => {
  const map = new Map<string, number>();
  for (const r of rows(m)) map.set(r.section, (map.get(r.section) ?? 0) + r.count);
  return [...map].map(([section, count]) => ({ section, count }));
};

/** Mocks a student can see: global + own college's; scheduled windows for their batch shown alongside. */
export async function listMocks(student: Student, now = new Date()): Promise<MockSummaryDto[]> {
  if (!student.collegeId) return [];
  await finalizeExpired(student.id, now);
  const ms = await db
    .select()
    .from(mocks)
    .where(or(isNull(mocks.collegeId), eq(mocks.collegeId, student.collegeId)))
    .orderBy(mocks.company, mocks.title);
  const sched = student.batchId
    ? await db.select().from(batchMocks).where(and(eq(batchMocks.batchId, student.batchId), eq(batchMocks.collegeId, student.collegeId), gte(batchMocks.closesAt, now)))
    : [];
  const mine = await db.select().from(mockAttempts).where(eq(mockAttempts.userId, student.id)).orderBy(desc(mockAttempts.startedAt));
  return ms.map((m) => {
    const secs = sectionsOf(m);
    const count = secs.reduce((s, x) => s + x.count, 0);
    const own = mine.filter((a) => a.mockId === m.id);
    const active = own.find((a) => !a.endedAt);
    const done = own.filter((a) => a.endedAt && a.marks !== null).sort((a, b) => (b.marks ?? 0) - (a.marks ?? 0))[0];
    const s = sched.find((x) => x.mockId === m.id);
    return {
      id: m.id,
      company: m.company,
      title: m.title,
      durationSec: m.durationSec,
      questionCount: count,
      sections: secs,
      negativeMark: m.negativeMark,
      markCorrect: m.markCorrect,
      sectional: m.sectional,
      instructions: m.instructions,
      scheduled: s ? { opensAt: s.opensAt.toISOString(), closesAt: s.closesAt.toISOString() } : null,
      activeAttemptId: active?.id ?? null,
      best: done ? { marks: done.marks ?? 0, maxMarks: round2(count * m.markCorrect), attemptId: done.id } : null,
    };
  });
}

export async function mockSummary(student: Student, mockId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(mockId)) return null;
  return (await listMocks(student)).find((m) => m.id === mockId) ?? null;
}

async function loadVisibleMock(student: Student, mockId: string) {
  if (!student.collegeId || !/^[0-9a-f-]{36}$/i.test(mockId)) throw new MockError(404, "mock not found");
  const [m] = await db.select().from(mocks).where(and(eq(mocks.id, mockId), or(isNull(mocks.collegeId), eq(mocks.collegeId, student.collegeId)))).limit(1);
  if (!m) throw new MockError(404, "mock not found");
  return m;
}

/** Start (or resume) — one active attempt per mock, server-side end time, per-student question pick + option order. */
export async function startMock(student: Student, mockId: string, now = new Date()) {
  const m = await loadVisibleMock(student, mockId);
  await finalizeExpired(student.id, now);
  const [active] = await db.select().from(mockAttempts).where(and(eq(mockAttempts.userId, student.id), eq(mockAttempts.mockId, m.id), isNull(mockAttempts.endedAt))).limit(1);
  if (active) return active;

  const prior = (await db.select({ n: sql<number>`count(*)::int` }).from(mockAttempts).where(and(eq(mockAttempts.userId, student.id), eq(mockAttempts.mockId, m.id))))[0].n;
  const rng = rngFor(student.id, m.id, prior);
  const pool = await db
    .select({ id: questions.id, section: questions.section, topic: questions.topic, difficulty: questions.difficulty })
    .from(collegeQuestionAccess)
    .innerJoin(questions, eq(questions.id, collegeQuestionAccess.questionId))
    .where(and(eq(collegeQuestionAccess.collegeId, student.collegeId!), eq(questions.status, "golden")));
  const used = new Set<string>();
  const picked: string[] = [];
  for (const r of rows(m)) {
    const [lo, hi] = r.difficulty;
    const fit = (strict: boolean) => pool.filter((q) => !used.has(q.id) && q.section === r.section && (!r.topic || q.topic === r.topic) && (!strict || (q.difficulty >= lo && q.difficulty <= hi)));
    // Prefer the blueprint's difficulty range; widen only if the college subset is short.
    const cands = [...shuffle(fit(true), rng), ...shuffle(fit(false), rng)];
    let need = r.count;
    for (const q of cands) {
      if (need <= 0) break;
      if (used.has(q.id)) continue;
      used.add(q.id);
      picked.push(q.id);
      need--;
    }
  }
  if (!picked.length) throw new MockError(409, "not enough questions for this mock");
  const endsAt = new Date(now.getTime() + m.durationSec * 1000);
  const secs = sectionsOf(m);
  try {
    const [a] = await db
      .insert(mockAttempts)
      .values({
        mockId: m.id,
        userId: student.id,
        questionIds: picked,
        optionOrder: picked.map(() => optionOrder(rng)),
        startedAt: now,
        endsAt,
        sectionEndsAt: m.sectional ? sectionDeadlines(now, m.durationSec, secs) : null,
        answers: {},
      })
      .returning();
    await track("mock_started", { userId: student.id, collegeId: student.collegeId, props: { mockId: m.id, attemptId: a.id } });
    return a;
  } catch (e) {
    // Lost a race against a concurrent start: the partial unique index guarantees one active attempt.
    const [again] = await db.select().from(mockAttempts).where(and(eq(mockAttempts.userId, student.id), eq(mockAttempts.mockId, m.id), isNull(mockAttempts.endedAt))).limit(1);
    if (again) return again;
    throw e;
  }
}

async function ownAttempt(studentId: string, attemptId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) throw new MockError(404, "attempt not found");
  const [a] = await db.select().from(mockAttempts).where(and(eq(mockAttempts.id, attemptId), eq(mockAttempts.userId, studentId))).limit(1);
  if (!a) throw new MockError(404, "attempt not found");
  const [m] = await db.select().from(mocks).where(eq(mocks.id, a.mockId)).limit(1);
  return { a, m };
}

const toDisplayed = (order: number[], canonical: number | null) => (canonical === null ? null : order.indexOf(canonical));

/** In-test payload. Never contains answer keys or explanations. */
export async function attemptForClient(student: Student, attemptId: string, now = new Date()): Promise<MockAttemptDto> {
  let { a, m } = await ownAttempt(student.id, attemptId);
  if (!a.endedAt && now.getTime() > a.endsAt.getTime() + SAVE_GRACE_MS) {
    await finalize(a, m, now, true);
    ({ a, m } = await ownAttempt(student.id, attemptId));
  }
  const qs = await db.select({ id: questions.id, section: questions.section, stem: questions.stem, options: questions.options }).from(questions).where(inArray(questions.id, a.questionIds));
  const byId = new Map(qs.map((q) => [q.id, q]));
  const answers: Record<string, MockAnswerDto> = {};
  a.questionIds.forEach((id, i) => {
    const s = a.answers[id];
    if (s) answers[id] = { ...s, choice: toDisplayed(a.optionOrder[i], s.choice) };
  });
  return {
    attemptId: a.id,
    mockId: m.id,
    title: m.title,
    company: m.company,
    negativeMark: m.negativeMark,
    markCorrect: m.markCorrect,
    sectional: m.sectional,
    serverNow: now.toISOString(),
    startedAt: a.startedAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    sectionEndsAt: a.sectionEndsAt ?? null,
    sections: sectionsOf(m).map((s) => s.section),
    questions: a.questionIds.map((id, i) => {
      const q = byId.get(id)!;
      return { id, index: i, section: q.section, stem: q.stem, options: a.optionOrder[i].map((k) => q.options[k]) };
    }),
    answers,
    ended: Boolean(a.endedAt),
  };
}

export type SavePatch = Record<string, { choice?: number | null; flagged?: boolean; visited?: boolean; timeMsDelta?: number }>;

/** Debounced autosave. Rejected (409) once time is up; sectional mocks reject edits to closed sections. */
export async function saveAnswers(student: Student, attemptId: string, patch: SavePatch, tabSwitchesDelta = 0, now = new Date()) {
  return db.transaction(async (tx) => {
    const [a] = await tx.select().from(mockAttempts).where(and(eq(mockAttempts.id, attemptId), eq(mockAttempts.userId, student.id))).for("update").limit(1);
    if (!a) throw new MockError(404, "attempt not found");
    if (a.endedAt) throw new MockError(409, "attempt already submitted");
    if (now.getTime() > a.endsAt.getTime() + SAVE_GRACE_MS) throw new MockError(409, "time is up");
    const qsec = a.sectionEndsAt
      ? new Map((await tx.select({ id: questions.id, section: questions.section }).from(questions).where(inArray(questions.id, a.questionIds))).map((q) => [q.id, q.section]))
      : null;
    const open = a.sectionEndsAt ? openSection(a.sectionEndsAt, new Date(now.getTime() - SAVE_GRACE_MS)) : null;
    const next: Record<string, StoredAnswer> = { ...a.answers };
    let rejected = 0;
    for (const [qid, p] of Object.entries(patch)) {
      const i = a.questionIds.indexOf(qid);
      if (i < 0) continue;
      if (qsec && a.sectionEndsAt && new Date(a.sectionEndsAt[qsec.get(qid)!]).getTime() + SAVE_GRACE_MS < now.getTime()) {
        rejected++;
        continue;
      }
      const cur = next[qid] ?? { choice: null, flagged: false, visited: false, timeMs: 0 };
      const displayed = p.choice;
      const choice = displayed === undefined ? cur.choice : displayed === null ? null : Number.isInteger(displayed) && displayed >= 0 && displayed < 4 ? a.optionOrder[i][displayed] : cur.choice;
      next[qid] = {
        changes: (cur.changes ?? 0) + (cur.choice !== null && choice !== cur.choice ? 1 : 0),
        choice,
        flagged: p.flagged ?? cur.flagged,
        visited: p.visited ?? cur.visited ?? true,
        timeMs: cur.timeMs + Math.max(0, Math.min(Math.round(p.timeMsDelta ?? 0), 10 * 60_000)),
      };
    }
    const tabSwitches = a.tabSwitches + Math.max(0, Math.min(Math.round(tabSwitchesDelta), 50));
    await tx.update(mockAttempts).set({ answers: next, tabSwitches }).where(eq(mockAttempts.id, a.id));
    return { ok: true as const, rejected, openSection: open, serverNow: now.toISOString() };
  });
}

/** Submit (idempotent). Scoring is server-only. */
export async function submitMock(student: Student, attemptId: string, opts: { auto?: boolean } = {}, now = new Date()) {
  const { a, m } = await ownAttempt(student.id, attemptId);
  if (!a.endedAt) await finalize(a, m, now, Boolean(opts.auto) || now.getTime() >= a.endsAt.getTime());
  return { attemptId };
}

async function finalize(a: AttemptRow, m: MockRow, now: Date, auto: boolean) {
  await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(mockAttempts).where(eq(mockAttempts.id, a.id)).for("update").limit(1);
    if (!locked || locked.endedAt) return;
    const qs = await tx.select({ id: questions.id, section: questions.section, answerIndex: questions.answerIndex }).from(questions).where(inArray(questions.id, locked.questionIds));
    const ordered = locked.questionIds.map((id) => qs.find((q) => q.id === id)!).filter(Boolean);
    const r = scoreAttempt(ordered, locked.answers, m.markCorrect, m.negativeMark);
    const endedAt = now.getTime() > locked.endsAt.getTime() ? locked.endsAt : now;
    await tx
      .update(mockAttempts)
      .set({ endedAt, autoSubmitted: auto, score: r.correct, correctCount: r.correct, wrongCount: r.wrong, marks: r.marks, sectionScores: r.sections })
      .where(eq(mockAttempts.id, locked.id));
    const rowsToInsert = ordered
      .filter((q) => locked.answers[q.id]?.choice !== null && locked.answers[q.id]?.choice !== undefined)
      .map((q) => ({
        clientId: `mock:${locked.id}:${q.id}`,
        userId: locked.userId,
        questionId: q.id,
        mockAttemptId: locked.id,
        chosenIndex: locked.answers[q.id].choice,
        correct: locked.answers[q.id].choice === q.answerIndex,
        timeMs: locked.answers[q.id].timeMs,
        answerChanges: locked.answers[q.id].changes ?? 0,
        marked: Boolean(locked.answers[q.id].flagged),
        createdAt: endedAt,
      }));
    if (rowsToInsert.length) await tx.insert(attempts).values(rowsToInsert).onConflictDoNothing();
  });
  const [u] = await db.select({ collegeId: users.collegeId }).from(users).where(eq(users.id, a.userId));
  await track("mock_submitted", { userId: a.userId, collegeId: u?.collegeId ?? null, props: { mockId: m.id, attemptId: a.id, auto } });
}

/** Auto-submit any of this student's attempts whose time has run out. */
export async function finalizeExpired(studentId: string, now = new Date()) {
  const expired = await db
    .select()
    .from(mockAttempts)
    .where(and(eq(mockAttempts.userId, studentId), isNull(mockAttempts.endedAt), lte(mockAttempts.endsAt, new Date(now.getTime() - SAVE_GRACE_MS))));
  for (const a of expired) {
    const [m] = await db.select().from(mocks).where(eq(mocks.id, a.mockId));
    await finalize(a, m, now, true);
  }
  return expired.length;
}

/** Cron sweep across all students. */
export async function finalizeAllExpired(now = new Date()) {
  const expired = await db.select().from(mockAttempts).where(and(isNull(mockAttempts.endedAt), lte(mockAttempts.endsAt, new Date(now.getTime() - SAVE_GRACE_MS))));
  for (const a of expired) {
    const [m] = await db.select().from(mocks).where(eq(mocks.id, a.mockId));
    await finalize(a, m, now, true);
  }
  return expired.length;
}

/** Result + review — only after the attempt has ended. */
export async function mockResult(student: Student, attemptId: string): Promise<MockResultDto> {
  const { a, m } = await ownAttempt(student.id, attemptId);
  if (!a.endedAt) throw new MockError(409, "attempt still in progress");
  const qs = await db.select().from(questions).where(inArray(questions.id, a.questionIds));
  const byId = new Map(qs.map((q) => [q.id, q]));
  const ordered = a.questionIds.map((id) => byId.get(id)!).filter(Boolean);
  const r = scoreAttempt(ordered.map((q) => ({ id: q.id, section: q.section, answerIndex: q.answerIndex })), a.answers, m.markCorrect, m.negativeMark);
  const cohort = await db
    .select({ marks: mockAttempts.marks })
    .from(mockAttempts)
    .innerJoin(users, eq(users.id, mockAttempts.userId))
    .where(and(eq(mockAttempts.mockId, m.id), eq(users.collegeId, student.collegeId!), sql`${mockAttempts.endedAt} is not null`));
  const attempted = r.correct + r.wrong;
  return {
    attemptId: a.id,
    mockId: m.id,
    title: m.title,
    company: m.company,
    marks: r.marks,
    maxMarks: r.maxMarks,
    correct: r.correct,
    wrong: r.wrong,
    skipped: r.skipped,
    accuracy: attempted ? Math.round((100 * r.correct) / attempted) : null,
    avgTimeSec: ordered.length ? Math.round(r.timeMs / ordered.length / 100) / 10 : 0,
    percentile: percentileRank(r.marks, cohort.map((c) => c.marks ?? 0)),
    takers: cohort.length,
    autoSubmitted: a.autoSubmitted,
    tabSwitches: a.tabSwitches,
    sections: r.sections,
    review: ordered.map((q, i) => {
      const ans = a.answers[q.id];
      const order = a.optionOrder[i];
      return {
        id: q.id,
        index: i,
        section: q.section,
        stem: q.stem,
        options: order.map((k) => q.options[k]),
        yourChoice: toDisplayed(order, ans?.choice ?? null),
        correctChoice: order.indexOf(q.answerIndex),
        correct: ans?.choice === q.answerIndex,
        flagged: Boolean(ans?.flagged),
        timeMs: ans?.timeMs ?? 0,
        explanation: q.explanation,
        shortcut: q.shortcut,
      };
    }),
  };
}
