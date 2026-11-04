import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, pg } from "@/db";
import { collegeQuestionAccess, questions } from "@/db/schema";
import { getOrCreateDrill, gradeAttempt } from "@/lib/drill";
import { istDate } from "@/lib/time";
import { batchLeaderboard, progressFor, shortName, todaySummary } from "@/server/services/student";
import { makeCollege, makeUser, resetDb } from "./db";

let ctx: { collegeId: string; batchId: string; a: string; b: string };
beforeAll(async () => {
  await resetDb();
  const { college, batch } = await makeCollege("S");
  const rows = Array.from({ length: 20 }, (_, i) => ({ id: `Q-QNT-AVG-${8000 + i}`, section: "quant" as const, topic: "averages", subtopic: "simple_average", stem: `S ${i}`, options: ["a", "b", "c", "d"], answerIndex: 0, explanation: "e", difficulty: 2, timeSec: 60, source: "seed" as const, status: "golden" as const, variantGroup: `V${i}` }));
  await db.insert(questions).values(rows);
  await db.insert(collegeQuestionAccess).values(rows.map((r) => ({ collegeId: college.id, questionId: r.id })));
  const a = await makeUser({ collegeId: college.id, batchId: batch.id, name: "Priya Sharma" });
  const b = await makeUser({ collegeId: college.id, batchId: batch.id, name: "Arjun Iyer" });
  ctx = { collegeId: college.id, batchId: batch.id, a: a.id, b: b.id };
});
afterAll(() => pg.end());

describe("student services", () => {
  it("shortName shows first name + last initial only", () => {
    expect(shortName("Priya Sharma")).toBe("Priya S.");
    expect(shortName("Arjun")).toBe("Arjun");
    expect(shortName(null)).toBe("Student");
  });
  it("leaderboard ranks weekly XP within the batch and hides surnames", async () => {
    const d = await getOrCreateDrill(ctx.a, istDate());
    const order = d.optionOrder[0];
    await gradeAttempt(ctx.a, { clientId: "x1", drillId: d.id, questionId: d.questionIds[0], displayedIndex: order.indexOf(0), timeMs: 5000 });
    const rows = await batchLeaderboard(ctx.batchId, ctx.collegeId);
    expect(rows[0]).toMatchObject({ id: ctx.a, name: "Priya S.", xp: 15, rank: 1 });
    expect(rows[1]).toMatchObject({ id: ctx.b, xp: 0 });
    expect(JSON.stringify(rows)).not.toContain("Sharma");
  });
  it("today summary + progress render from real data", async () => {
    const t = await todaySummary(ctx.a);
    expect(t.answered).toBe(1);
    expect(t.readiness).toBeGreaterThanOrEqual(0);
    const p = await progressFor(ctx.a);
    expect(p.topics.find((x) => x.id === "averages")?.attempts).toBe(1);
    expect(p.companies).toHaveLength(6);
  });
});
