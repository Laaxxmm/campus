import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pg } from "@/db";
import { attempts, collegeQuestionAccess, companyBlueprints, drills, questions, readinessSnapshots, users } from "@/db/schema";
import { cronAuthorized } from "@/lib/cron-auth";
import { buildDrills, retireLeaked, weekly } from "@/server/services/cron";
import { makeCollege, makeUser, resetDb } from "./db";

let uid: string;
beforeAll(async () => {
  process.env.CRON_SECRET = "test-cron-secret-123456";
  await resetDb();
  const { college, batch } = await makeCollege("C");
  const rows = Array.from({ length: 15 }, (_, i) => ({ id: `Q-QNT-AVG-${6000 + i}`, section: "quant" as const, topic: "averages", subtopic: "x", stem: `C ${i}`, options: ["a", "b", "c", "d"], answerIndex: 0, explanation: "e", difficulty: 2, timeSec: 60, source: "seed" as const, status: "golden" as const, variantGroup: `C${i}` }));
  await db.insert(questions).values(rows);
  await db.insert(collegeQuestionAccess).values(rows.map((r) => ({ collegeId: college.id, questionId: r.id })));
  await db.insert(companyBlueprints).values({ company: "tcs_nqt", sectionWeights: { quant: 1 } });
  const u = await makeUser({ collegeId: college.id, batchId: batch.id });
  uid = u.id;
  await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, uid));
  await makeUser({ collegeId: college.id, batchId: batch.id }); // inactive → skipped
});
afterAll(() => pg.end());

describe("cron", () => {
  const req = (h?: string) => new Request("http://x/api/cron/build-drills", { method: "POST", headers: h ? { authorization: h } : {} });
  it("401 without / with wrong secret", () => {
    expect(cronAuthorized(req())).toBe(false);
    expect(cronAuthorized(req("Bearer nope"))).toBe(false);
    expect(cronAuthorized(req("Bearer test-cron-secret-123456"))).toBe(true);
  });
  it("builds drills for active students only, idempotently", async () => {
    const a = await buildDrills();
    expect(a).toMatchObject({ students: 1, built: 1, failed: 0 });
    await buildDrills();
    expect((await db.select().from(drills)).length).toBe(1);
  });
  it("weekly writes readiness snapshots", async () => {
    const r = await weekly();
    expect(r.snapshots).toBe(2);
    expect((await db.select().from(readinessSnapshots).where(eq(readinessSnapshots.userId, uid))).length).toBe(1);
  });
  it("retires a question whose correct-rate jumps above 85% in a week", async () => {
    const now = new Date();
    const q = "Q-QNT-AVG-6000";
    const old = Array.from({ length: 40 }, (_, i) => ({ clientId: `old${i}`, userId: uid, questionId: q, correct: i % 2 === 0, timeMs: 1000, createdAt: new Date(now.getTime() - 10 * 86_400_000) }));
    const fresh = Array.from({ length: 40 }, (_, i) => ({ clientId: `new${i}`, userId: uid, questionId: q, correct: i < 38, timeMs: 1000, createdAt: new Date(now.getTime() - 86_400_000) }));
    await db.insert(attempts).values([...old, ...fresh]);
    expect(await retireLeaked(now)).toEqual([q]);
    const [row] = await db.select().from(questions).where(eq(questions.id, q));
    expect(row.status).toBe("retired");
    expect(row.correctRate7d).toBeCloseTo(0.95);
  });
});
