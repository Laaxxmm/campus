import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pg } from "@/db";
import { collegeQuestionAccess, mockAttempts, mocks, questions } from "@/db/schema";
import { attemptForClient, finalizeAllExpired, listMocks, MockError, mockResult, saveAnswers, startMock, submitMock } from "@/server/services/mocks";
import { makeCollege, makeUser, resetDb } from "./db";

let S: { id: string; collegeId: string | null; batchId: string | null };
let other: { id: string; collegeId: string | null; batchId: string | null };
let mockId: string, sectionalId: string, foreignMockId: string;
const T0 = new Date("2026-11-04T10:00:00Z");

beforeAll(async () => {
  await resetDb();
  const { college, batch } = await makeCollege("M");
  const B = await makeCollege("N");
  const qs = [
    ...Array.from({ length: 12 }, (_, i) => ({ id: `Q-QNT-PCT-${7000 + i}`, section: "quant" as const, topic: "percentages", difficulty: (i % 4) + 1 })),
    ...Array.from({ length: 12 }, (_, i) => ({ id: `Q-VRB-SYN-${7000 + i}`, section: "verbal" as const, topic: "synonyms_antonyms", difficulty: (i % 4) + 1 })),
  ].map((q, i) => ({ ...q, subtopic: "x", stem: `Mock stem ${i}`, options: ["o1", "o2", "o3", "o4"], answerIndex: i % 4, explanation: "secret-explanation", timeSec: 60, source: "seed" as const, status: "golden" as const, variantGroup: `MV${i}` }));
  await db.insert(questions).values(qs);
  await db.insert(collegeQuestionAccess).values(qs.map((q) => ({ collegeId: college.id, questionId: q.id })));
  const bp = [{ section: "quant", count: 5, difficulty: [1, 4], timeSec: 60 }, { section: "verbal", count: 5, difficulty: [1, 4], timeSec: 60 }];
  [{ id: mockId }] = await db.insert(mocks).values({ company: "wipro", title: "Neg mock", blueprint: bp, durationSec: 600, negativeMark: 0.25 }).returning();
  [{ id: sectionalId }] = await db.insert(mocks).values({ company: "tcs_nqt", title: "Sectional", blueprint: bp, durationSec: 600, sectional: true }).returning();
  [{ id: foreignMockId }] = await db.insert(mocks).values({ company: "x", title: "B only", blueprint: bp, durationSec: 600, collegeId: B.college.id }).returning();
  S = await makeUser({ collegeId: college.id, batchId: batch.id });
  other = await makeUser({ collegeId: college.id, batchId: batch.id });
});
afterAll(() => pg.end());

describe("mock exam service", () => {
  it("lists global + own-college mocks only", async () => {
    const ids = (await listMocks(S, T0)).map((m) => m.id);
    expect(ids).toContain(mockId);
    expect(ids).not.toContain(foreignMockId);
    await expect(startMock(S, foreignMockId, T0)).rejects.toThrow(MockError);
  });

  it("start creates one active attempt; second start resumes it", async () => {
    const a = await startMock(S, mockId, T0);
    const b = await startMock(S, mockId, new Date(T0.getTime() + 60_000));
    expect(b.id).toBe(a.id);
    expect(a.questionIds).toHaveLength(10);
    expect(a.endsAt.getTime() - a.startedAt.getTime()).toBe(600_000);
  });

  it("client payload never contains answer keys or explanations", async () => {
    const a = await startMock(S, mockId, T0);
    const dto = await attemptForClient(S, a.id, T0);
    const json = JSON.stringify(dto);
    expect(json).not.toMatch(/answerIndex|answer_index|secret-explanation|"correct(Choice)?"/);
    expect(dto.questions[0].options).toHaveLength(4);
  });

  it("another student cannot read or write this attempt (IDOR → 404)", async () => {
    const a = await startMock(S, mockId, T0);
    await expect(attemptForClient(other, a.id, T0)).rejects.toMatchObject({ status: 404 });
    await expect(saveAnswers(other, a.id, {}, 0, T0)).rejects.toMatchObject({ status: 404 });
    await expect(submitMock(other, a.id, {}, T0)).rejects.toMatchObject({ status: 404 });
  });

  it("autosave maps displayed → canonical; submit scores with negative marking", async () => {
    const a = await startMock(S, mockId, T0);
    const [q0, q1, q2] = a.questionIds;
    const [rq] = await db.select().from(questions).where(eq(questions.id, q0));
    const [rq1] = await db.select().from(questions).where(eq(questions.id, q1));
    const correctDisp = a.optionOrder[0].indexOf(rq.answerIndex);
    const wrongDisp = (a.optionOrder[1].indexOf(rq1.answerIndex) + 1) % 4;
    await saveAnswers(S, a.id, { [q0]: { choice: correctDisp, timeMsDelta: 30_000 }, [q1]: { choice: wrongDisp, flagged: true }, [q2]: { visited: true } }, 2, new Date(T0.getTime() + 120_000));
    const dto = await attemptForClient(S, a.id, new Date(T0.getTime() + 121_000));
    expect(dto.answers[q0].choice).toBe(correctDisp);
    expect(dto.answers[q1].flagged).toBe(true);
    await submitMock(S, a.id, {}, new Date(T0.getTime() + 180_000));
    const r = await mockResult(S, a.id);
    expect([r.correct, r.wrong, r.skipped]).toEqual([1, 1, 8]);
    expect(r.marks).toBe(0.75);
    expect(r.maxMarks).toBe(10);
    expect(r.tabSwitches).toBe(2);
    expect(r.review[0]).toMatchObject({ yourChoice: correctDisp, correct: true });
    expect(r.review[1]).toMatchObject({ flagged: true, correct: false });
    // idempotent submit; edits after submit are rejected
    await submitMock(S, a.id, {}, new Date(T0.getTime() + 190_000));
    await expect(saveAnswers(S, a.id, { [q2]: { choice: 0 } }, 0, new Date(T0.getTime() + 200_000))).rejects.toMatchObject({ status: 409 });
  });

  it("saves after the server end time are rejected; expired attempts auto-submit", async () => {
    const a = await startMock(other, mockId, T0);
    const late = new Date(a.endsAt.getTime() + 10_000);
    await expect(saveAnswers(other, a.id, { [a.questionIds[0]]: { choice: 0 } }, 0, late)).rejects.toMatchObject({ status: 409 });
    expect(await finalizeAllExpired(late)).toBe(1);
    const [row] = await db.select().from(mockAttempts).where(eq(mockAttempts.id, a.id));
    expect(row.endedAt?.getTime()).toBe(a.endsAt.getTime());
    expect(row.autoSubmitted).toBe(true);
    const r = await mockResult(other, a.id);
    expect(r.autoSubmitted).toBe(true);
    expect(r.takers).toBe(2);
    expect(r.percentile).not.toBeNull();
  });

  it("result is unavailable while the attempt is running", async () => {
    const a = await startMock(S, mockId, new Date(T0.getTime() + 3600_000));
    await expect(mockResult(S, a.id)).rejects.toMatchObject({ status: 409 });
  });

  it("sectional mock rejects edits to a closed section", async () => {
    const a = await startMock(S, sectionalId, T0);
    const quantQ = (await attemptForClient(S, a.id, T0)).questions.find((q) => q.section === "quant")!;
    const afterQuant = new Date(new Date(a.sectionEndsAt!.quant).getTime() + 10_000);
    const res = await saveAnswers(S, a.id, { [quantQ.id]: { choice: 1 } }, 0, afterQuant);
    expect(res.rejected).toBe(1);
    expect(res.openSection).toBe("verbal");
  });
});
