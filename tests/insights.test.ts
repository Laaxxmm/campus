import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pg } from "@/db";
import { attemptInsights, attempts, collegeQuestionAccess, drills, questions, weeklyFocus } from "@/db/schema";
import { createFocusDrill, insightForDrill, insightsOverview, phrase, type Rephraser } from "@/server/services/insights";
import { analyse } from "@/lib/insights/rules";
import { makeCollege, makeUser, resetDb } from "./db";

let U: { id: string; collegeId: string | null };
let drillId: string;
beforeAll(async () => {
  await resetDb();
  const { college, batch } = await makeCollege("I");
  const qs = [
    ...Array.from({ length: 15 }, (_, i) => ({ id: `Q-QNT-TWK-${7100 + i}`, topic: "time_work" })),
    ...Array.from({ length: 15 }, (_, i) => ({ id: `Q-QNT-AVG-${7100 + i}`, topic: "averages" })),
  ].map((q, i) => ({ ...q, section: "quant" as const, subtopic: "x", stem: `I${i}`, options: ["a", "b", "c", "d"], answerIndex: 0, explanation: "e", difficulty: (i % 5) + 1, timeSec: 60, source: "seed" as const, status: "golden" as const, variantGroup: `I${i}` }));
  await db.insert(questions).values(qs);
  await db.insert(collegeQuestionAccess).values(qs.map((q) => ({ collegeId: college.id, questionId: q.id })));
  const u = await makeUser({ collegeId: college.id, batchId: batch.id });
  U = { id: u.id, collegeId: college.id };
  // history: time_work weak (2/8), averages strong (8/8)
  const hist = [...Array.from({ length: 8 }, (_, i) => ({ q: `Q-QNT-TWK-${7100 + i}`, c: i < 2 })), ...Array.from({ length: 8 }, (_, i) => ({ q: `Q-QNT-AVG-${7100 + i}`, c: true }))];
  await db.insert(attempts).values(hist.map((h, i) => ({ clientId: `h${i}`, userId: u.id, questionId: h.q, correct: h.c, chosenIndex: h.c ? 0 : 1, timeMs: h.q.includes("TWK") ? 120_000 : 20_000, createdAt: new Date(Date.now() - 2 * 86_400_000) })));
  const [d] = await db.insert(drills).values({ userId: u.id, date: "2026-11-04", questionIds: ["Q-QNT-TWK-7110", "Q-QNT-AVG-7110"], optionOrder: [[0, 1, 2, 3], [0, 1, 2, 3]], completedAt: new Date(), score: 1 }).returning();
  drillId = d.id;
  await db.insert(attempts).values([
    { clientId: "s1", userId: u.id, questionId: "Q-QNT-TWK-7110", drillId: d.id, correct: false, chosenIndex: 2, timeMs: 130_000, answerChanges: 2 },
    { clientId: "s2", userId: u.id, questionId: "Q-QNT-AVG-7110", drillId: d.id, correct: true, chosenIndex: 0, timeMs: 15_000 },
  ]);
});
afterAll(() => pg.end());

describe("insight service", () => {
  it("computes facts from stored events, caches per attempt, writes weekly focus", async () => {
    const r1 = await insightForDrill(U, drillId, null);
    const facts = r1!.facts as ReturnType<typeof analyse>;
    expect(facts.facts.find((f) => f.kind === "gap")).toMatchObject({ topic: "time_work" });
    expect(facts.facts.find((f) => f.kind === "time_leak")).toMatchObject({ topic: "time_work" });
    expect(facts.focus[0]).toMatchObject({ topic: "time_work" });
    expect(r1!.model).toBe("template");
    const r2 = await insightForDrill(U, drillId, null);
    expect(r2!.id).toBe(r1!.id);
    expect((await db.select().from(attemptInsights)).length).toBe(1);
    const [wf] = await db.select().from(weeklyFocus).where(eq(weeklyFocus.userId, U.id));
    expect(wf.topics).toContain("time_work");
  });
  it("another student gets null for this drill", async () => {
    const other = await makeUser({ collegeId: U.collegeId });
    expect(await insightForDrill({ id: other.id, collegeId: U.collegeId }, drillId, null)).toBeNull();
  });
  it("LLM down → template fallback", async () => {
    const f = analyse([], [], { kind: "drill", negativeMark: 0, previousAccuracies: [] });
    const down: Rephraser = async () => {
      throw new Error("ECONNRESET");
    };
    expect((await phrase(f, down, { userId: U.id, collegeId: U.collegeId })).model).toBe("template");
  });
  it("LLM output that changes numbers or topics is rejected", async () => {
    const r = (await db.select().from(attemptInsights))[0];
    const facts = r.facts as ReturnType<typeof analyse>;
    const liar: Rephraser = async (_f, d) => ({ text: { ...d, whatsWrong: d.whatsWrong.map((w) => w.replace(/\d+/, "99")) }, model: "fake" });
    expect((await phrase(facts, liar, { userId: U.id, collegeId: U.collegeId })).model).toBe("template");
    const ok: Rephraser = async (_f, d) => ({ text: { ...d, headline: "Nice steady work today." }, model: "fake-haiku" });
    const good = await phrase(facts, ok, { userId: U.id, collegeId: U.collegeId });
    expect(good.model).toBe("fake-haiku");
    expect(good.text.headline).toBe("Nice steady work today.");
  });
  it("focus drill uses only the focus topics and is a separate 'focus' drill", async () => {
    const d = await createFocusDrill(U, ["time_work"]);
    expect(d.kind).toBe("focus");
    expect(d.questionIds.length).toBe(10);
    expect(d.questionIds.every((id) => id.includes("TWK"))).toBe(true);
    const d2 = await createFocusDrill(U, ["time_work"]); // multiple focus drills per day allowed
    expect(d2.id).not.toBe(d.id);
    await expect(createFocusDrill(U, ["not_a_topic"])).rejects.toThrow();
  });
  it("overview shows focus progress", async () => {
    const o = await insightsOverview(U);
    expect(o.progress.find((p) => p.topic === "time_work")).toBeTruthy();
    expect(o.recent.length).toBe(1);
  });
});
