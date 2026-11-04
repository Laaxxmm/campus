import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pg } from "@/db";
import { attempts, collegeQuestionAccess, drills, questions, reviewQueue, streaks, users } from "@/db/schema";
import { drillForClient, getOrCreateDrill, gradeAttempt } from "./drill";
import { makeCollege, makeUser, resetDb } from "../../tests/db";

async function seedQuestions(collegeId: string, n = 30) {
  const topics = ["percentages", "averages", "number_series"];
  const rows = Array.from({ length: n }, (_, i) => ({
    id: `Q-QNT-PCT-${String(9000 + i)}`,
    section: (i % 3 === 2 ? "logical" : "quant") as "quant" | "logical",
    topic: topics[i % 3],
    subtopic: "x",
    stem: `Stem ${i}`,
    options: [`A${i}`, `B${i}`, `C${i}`, `D${i}`],
    answerIndex: i % 4,
    explanation: `Because ${i}`,
    difficulty: (i % 5) + 1,
    timeSec: 60,
    source: "seed" as const,
    status: "golden" as const,
    variantGroup: `G${i}`,
  }));
  await db.insert(questions).values(rows);
  await db.insert(collegeQuestionAccess).values(rows.map((r) => ({ collegeId, questionId: r.id })));
  return rows;
}

describe("drill build + grading (DB)", () => {
  let userId: string;
  let qs: Awaited<ReturnType<typeof seedQuestions>>;
  beforeAll(async () => {
    await resetDb();
    const { college, batch } = await makeCollege("G");
    qs = await seedQuestions(college.id);
    userId = (await makeUser({ collegeId: college.id, batchId: batch.id })).id;
  });
  afterAll(async () => pg.end());

  it("creates exactly one drill per IST day with 10 unique questions", async () => {
    const a = await getOrCreateDrill(userId, "2026-11-04");
    const b = await getOrCreateDrill(userId, "2026-11-04");
    expect(a.id).toBe(b.id);
    expect(new Set(a.questionIds).size).toBe(10);
    expect(a.optionOrder.every((o) => [...o].sort().join() === "0,1,2,3")).toBe(true);
  });

  it("client DTO never contains the answer and grading maps shuffled options", async () => {
    const d = await getOrCreateDrill(userId, "2026-11-04");
    const dto = await drillForClient(userId, d.id);
    expect(JSON.stringify(dto!.items)).not.toMatch(/answerIndex|explanation/);
    const qid = d.questionIds[0];
    const q = qs.find((x) => x.id === qid)!;
    const correctDisplayed = d.optionOrder[0].indexOf(q.answerIndex);
    expect(dto!.items[0].options[correctDisplayed]).toBe(q.options[q.answerIndex]);
    const r = await gradeAttempt(userId, { clientId: "c-0", drillId: d.id, questionId: qid, displayedIndex: correctDisplayed, timeMs: 10_000 });
    expect(r.correct).toBe(true);
    expect(r.correctDisplayed).toBe(correctDisplayed);
    expect(r.xp).toBe(15);
    const wrong = (correctDisplayed + 1) % 4;
    const q1 = d.questionIds[1];
    const r2 = await gradeAttempt(userId, { clientId: "c-1", drillId: d.id, questionId: q1, displayedIndex: wrong === d.optionOrder[1].indexOf(qs.find((x) => x.id === q1)!.answerIndex) ? (wrong + 1) % 4 : wrong, timeMs: 10_000 });
    expect(r2.correct).toBe(false);
  });

  it("double submit (same clientId, or same question again) is idempotent", async () => {
    const d = await getOrCreateDrill(userId, "2026-11-04");
    const before = (await db.select().from(users).where(eq(users.id, userId)))[0].xp;
    const again = await gradeAttempt(userId, { clientId: "c-0", drillId: d.id, questionId: d.questionIds[0], displayedIndex: 3, timeMs: 1 });
    expect(again.duplicate).toBe(true);
    const other = await gradeAttempt(userId, { clientId: "c-0b", drillId: d.id, questionId: d.questionIds[0], displayedIndex: 2, timeMs: 1 });
    expect(other.duplicate).toBe(true);
    const after = (await db.select().from(users).where(eq(users.id, userId)))[0].xp;
    expect(after).toBe(before);
    expect((await db.select().from(attempts).where(eq(attempts.drillId, d.id))).length).toBe(2);
  });

  it("completing 10 answers completes the drill and starts the streak once", async () => {
    const d = await getOrCreateDrill(userId, "2026-11-04");
    for (let i = 2; i < 10; i++) {
      await gradeAttempt(userId, { clientId: `c-${i}`, drillId: d.id, questionId: d.questionIds[i], displayedIndex: 0, timeMs: 5000 }, new Date("2026-11-04T10:00:00Z"));
    }
    const [row] = await db.select().from(drills).where(eq(drills.id, d.id));
    expect(row.completedAt).not.toBeNull();
    expect(row.score).toBeGreaterThanOrEqual(1);
    const [st] = await db.select().from(streaks).where(eq(streaks.userId, userId));
    expect(st.current).toBe(1);
    expect(st.lastActiveDate).toBe("2026-11-04");
  });

  it("rejects questions not in the drill and other users' drills", async () => {
    const d = await getOrCreateDrill(userId, "2026-11-04");
    const outside = qs.find((q) => !d.questionIds.includes(q.id))!;
    await expect(gradeAttempt(userId, { clientId: "z", drillId: d.id, questionId: outside.id, displayedIndex: 0, timeMs: 1 })).rejects.toThrow(/not in drill/);
    const other = await makeUser({ collegeId: null });
    await expect(gradeAttempt(other.id, { clientId: "z2", drillId: d.id, questionId: d.questionIds[0], displayedIndex: 0, timeMs: 1 })).rejects.toThrow(/not found/);
  });

  it("next day's drill avoids questions seen in the last 14 days when pool allows", async () => {
    const d1 = await getOrCreateDrill(userId, "2026-11-04");
    const d2 = await getOrCreateDrill(userId, "2026-11-05");
    const reviewIds = new Set((await db.select().from(reviewQueue).where(eq(reviewQueue.userId, userId))).map((r) => r.questionId));
    const repeats = d2.questionIds.filter((id) => d1.questionIds.includes(id) && !reviewIds.has(id));
    expect(repeats).toEqual([]);
  });
});
