import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, pg } from "@/db";
import { attempts, auditLogs, collegeQuestionAccess, colleges, questions, users } from "@/db/schema";
import { approve, edit, listForReview, retire } from "@/server/services/content";
import { createCollege, deleteStudent, exportStudent, ReauthRequired } from "@/server/services/super";
import { createBatch, updateBatch } from "@/server/services/admin";
import { track } from "@/lib/events";
import { planDrill } from "@/lib/drill";
import { inCollegeSubset } from "@/lib/bank";
import { makeCollege, makeUser, resetDb } from "./db";

let A: Awaited<ReturnType<typeof makeCollege>>;
let content: Awaited<ReturnType<typeof makeUser>>, sup: Awaited<ReturnType<typeof makeUser>>, tpo: Awaited<ReturnType<typeof makeUser>>, student: Awaited<ReturnType<typeof makeUser>>;
beforeAll(async () => {
  await resetDb();
  A = await makeCollege("Adm");
  content = await makeUser({ collegeId: null, role: "content" });
  sup = await makeUser({ collegeId: null, role: "superadmin" });
  tpo = await makeUser({ collegeId: A.college.id, role: "tpo" });
  student = await makeUser({ collegeId: A.college.id, batchId: A.batch.id, email: "erase.me@test.in" });
  // Draft pool: only drafts in this topic, so an approved one must show up in the next drill plan.
  const drafts = Array.from({ length: 30 }, (_, i) => ({ id: `Q-QNT-RAT-${4000 + i}`, section: "quant" as const, topic: "ratio_proportion", subtopic: "ratio_basics", stem: `Draft stem ${i}`, options: ["a", "b", "c", "d"], answerIndex: 1, explanation: "because", difficulty: 2, timeSec: 60, source: "llm_variant" as const, status: "draft" as const, variantGroup: `D${i}`, qaFlags: i % 2 ? { passed: true, matches: true, ambiguous: false, my_answer_index: 1, issues: [] } : { passed: false, matches: false, ambiguous: false, my_answer_index: 0, issues: ["key?"] } }));
  await db.insert(questions).values(drafts);
});
afterAll(() => pg.end());

describe("content review", () => {
  it("filters by QA flag", async () => {
    expect((await listForReview(content, { flag: "qa_failed" })).total).toBe(15);
    expect((await listForReview(content, { flag: "qa_passed" })).total).toBe(15);
  });
  it("only content/superadmin may review", async () => {
    await expect(listForReview(tpo, {})).rejects.toThrow();
  });
  it("approve → golden + college access → appears in the next drill build", async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `Q-QNT-RAT-${4000 + i}`);
    const inSubset = ids.filter((id) => inCollegeSubset(A.college.bankSeed, id));
    expect(await approve(content, ids)).toBe(30);
    const access = await db.select().from(collegeQuestionAccess).where(eq(collegeQuestionAccess.collegeId, A.college.id));
    expect(access.map((a) => a.questionId).sort()).toEqual(inSubset.sort());
    const plan = await planDrill(student.id, "2026-11-04");
    expect(plan.questionIds.length).toBe(10);
    expect(plan.questionIds.every((id) => inSubset.includes(id))).toBe(true);
    expect((await db.select().from(auditLogs).where(eq(auditLogs.action, "question.publish"))).length).toBe(30);
  });
  it("edit bumps version and sends golden back to review; retire works", async () => {
    await edit(content, "Q-QNT-RAT-4000", { stem: "Edited stem text here", o0: "1", o1: "2", o2: "3", o3: "4", answerIndex: 2, explanation: "fixed", difficulty: 3 });
    const [q] = await db.select().from(questions).where(eq(questions.id, "Q-QNT-RAT-4000"));
    expect(q).toMatchObject({ version: 2, status: "review", answerIndex: 2 });
    await expect(edit(content, "Q-QNT-RAT-4001", { stem: "Edited stem text here", o0: "1", o1: "1", o2: "3", o3: "4", answerIndex: 2, explanation: "x y", difficulty: 3 })).rejects.toThrow(/unique/);
    expect(await retire(content, "Q-QNT-RAT-4002")).toBe(true);
  });
});

describe("college admin", () => {
  it("batches are created/updated within the TPO's college only", async () => {
    const b = await createBatch(tpo, undefined, { name: "2028 MECH", gradYear: "2028", branch: "MECH", targetCompany: "wipro", targetDriveDate: "2028-01-15" });
    expect(b.collegeId).toBe(A.college.id);
    const B = await makeCollege("Other");
    await expect(updateBatch(tpo, undefined, B.batch.id, { name: "hijack" })).rejects.toThrow(/not found/);
  });
});

describe("superadmin", () => {
  it("requires a sign-in within 15 minutes", async () => {
    await expect(createCollege(sup, { name: "New College", seats: 100, plan: "pilot", tpoName: "T", tpoEmail: "t@new.in" })).rejects.toBeInstanceOf(ReauthRequired);
  });
  it("creates a college with a TPO invite and its question subset", async () => {
    await track("sign_in", { userId: sup.id });
    const r = await createCollege(sup, { name: "New College", city: "Madurai", seats: 100, plan: "pilot", tpoName: "Tara", tpoEmail: "tara@new.in" });
    expect(r.tpo).toMatchObject({ role: "tpo", collegeId: r.college.id });
    const [c] = await db.select().from(colleges).where(eq(colleges.id, r.college.id));
    expect(c.seats).toBe(100);
    expect((await db.select().from(collegeQuestionAccess).where(eq(collegeQuestionAccess.collegeId, c.id))).length).toBeGreaterThan(0);
    await expect(createCollege(sup, { name: "Dup College", seats: 100, plan: "pilot", tpoName: "Tom", tpoEmail: "tara@new.in" })).rejects.toThrow(/already/);
  });
  it("exports then deletes a student (DPDP), audited", async () => {
    await db.insert(attempts).values({ clientId: "z", userId: student.id, questionId: "Q-QNT-RAT-4003", correct: true, timeMs: 1000 });
    const ex = await exportStudent(sup, "erase.me@test.in");
    expect(ex?.profile.email).toBe("erase.me@test.in");
    expect(ex?.attempts).toHaveLength(1);
    expect(await deleteStudent(sup, "erase.me@test.in")).toBe(true);
    expect(await db.select().from(users).where(eq(users.email, "erase.me@test.in"))).toHaveLength(0);
    expect(await db.select().from(attempts).where(eq(attempts.userId, student.id))).toHaveLength(0);
    const logs = await db.select().from(auditLogs).where(and(eq(auditLogs.targetId, student.id)));
    expect(logs.map((l) => l.action).sort()).toEqual(["user.delete", "user.export"]);
  });
});
