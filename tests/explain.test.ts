import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, pg } from "@/db";
import { attempts, explanationsCache, questions } from "@/db/schema";
import { ExplainError, explainMore } from "@/server/services/explain";
import { makeCollege, makeUser, resetDb } from "./db";

let uid: string;
beforeAll(async () => {
  await resetDb();
  const { college } = await makeCollege("E");
  uid = (await makeUser({ collegeId: college.id })).id;
  await db.insert(questions).values({ id: "Q-QNT-PCT-3000", section: "quant", topic: "percentages", subtopic: "x", stem: "s", options: ["a", "b", "c", "d"], answerIndex: 0, explanation: "e", difficulty: 2, timeSec: 60, source: "seed", status: "golden", variantGroup: "E" });
});
afterAll(() => pg.end());

describe("explain more", () => {
  it("is disabled without an API key (app works without Anthropic)", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(explainMore(uid, "Q-QNT-PCT-3000")).rejects.toMatchObject({ status: 404 });
  });
  it("requires a prior wrong attempt, then serves from cache with zero model calls", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-not-used";
    await expect(explainMore(uid, "Q-QNT-PCT-3000")).rejects.toBeInstanceOf(ExplainError); // not attempted
    await db.insert(attempts).values({ clientId: "e1", userId: uid, questionId: "Q-QNT-PCT-3000", chosenIndex: 2, correct: false, timeMs: 1000 });
    await db.insert(explanationsCache).values({ questionId: "Q-QNT-PCT-3000", wrongIndex: 2, text: "cached tutor text", model: "test" });
    expect(await explainMore(uid, "Q-QNT-PCT-3000")).toEqual({ text: "cached tutor text", cached: true });
    delete process.env.ANTHROPIC_API_KEY;
  });
});
