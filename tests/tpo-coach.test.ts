import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pg } from "@/db";
import { attempts, auditLogs, collegeQuestionAccess, companyProfiles, focusAssignmentStudents, questions, skills, targetCompanies } from "@/db/schema";
import { assignFocusPack, cohortWeakTopics, coachDetail, myAssignments, readinessFunnel } from "@/server/services/tpo-coach";
import { createFocusDrill } from "@/server/services/insights";
import { gradeAttempt } from "@/lib/drill";
import { seedV3Content } from "@/db/seed-v3";
import { makeCollege, makeUser, resetDb } from "./db";

let A: Awaited<ReturnType<typeof makeCollege>>, B: Awaited<ReturnType<typeof makeCollege>>;
let tpo: Awaited<ReturnType<typeof makeUser>>, weak: string, strong: string, other: string;
beforeAll(async () => {
  await resetDb();
  await seedV3Content();
  A = await makeCollege("Coach");
  B = await makeCollege("Other");
  tpo = await makeUser({ collegeId: A.college.id, role: "tpo" });
  weak = (await makeUser({ collegeId: A.college.id, batchId: A.batch.id })).id;
  strong = (await makeUser({ collegeId: A.college.id, batchId: A.batch.id })).id;
  other = (await makeUser({ collegeId: B.college.id, batchId: B.batch.id })).id;
  const qs = Array.from({ length: 12 }, (_, i) => ({ id: `Q-QNT-TWK-${6600 + i}`, section: "quant" as const, topic: "time_work", subtopic: "x", stem: `W${i}`, options: ["a", "b", "c", "d"], answerIndex: 0, explanation: "e", difficulty: 2, timeSec: 60, source: "seed" as const, status: "golden" as const, variantGroup: `W${i}` }));
  await db.insert(questions).values(qs);
  await db.insert(collegeQuestionAccess).values(qs.map((q) => ({ collegeId: A.college.id, questionId: q.id })));
  const rows = [weak, strong, other].flatMap((u) => qs.slice(0, 6).map((q, i) => ({ clientId: `${u}-${i}`, userId: u, questionId: q.id, correct: u === strong ? true : i === 0, chosenIndex: 0, timeMs: 30_000 })));
  await db.insert(attempts).values(rows);
  await db.insert(skills).values([{ userId: strong, topic: "time_work", rating: 1500 }]);
  await db.insert(targetCompanies).values([{ userId: weak, company: "tcs_nqt" }, { userId: strong, company: "tcs_nqt" }, { userId: strong, company: "infosys" }]);
});
afterAll(() => pg.end());

describe("TPO coach", () => {
  it("cohort weak topics count only own-college students with ≥ 5 attempts below 50%", async () => {
    const t = await cohortWeakTopics(tpo);
    const tw = t.find((x) => x.topic === "time_work")!;
    expect(tw.weakStudents).toEqual([weak]);
    expect(tw.measured).toBe(2); // the other college's student is not counted
  });
  it("funnel per company from targets", async () => {
    expect((await db.select().from(companyProfiles)).length).toBeGreaterThan(0);
    const f = await readinessFunnel(tpo);
    const tcs = f.rows.find((r) => r.company === "tcs_nqt")!;
    expect(tcs.targeting).toBe(2);
    expect(f.rows.find((r) => r.company === "infosys")!.targeting).toBe(1);
    expect(tcs.ready).toBeLessThanOrEqual(tcs.profile);
  });
  it("assign focus pack: foreign students silently dropped, audited; student sees it; completing the pack marks it done", async () => {
    const r = await assignFocusPack(tpo, { topics: ["time_work"], studentIds: [weak, other], questionsPerDay: 5 });
    expect(r.assigned).toBe(1);
    const [log] = await db.select().from(auditLogs).where(eq(auditLogs.action, "focus.assign"));
    expect(log.meta).toMatchObject({ students: 1, rejected: 1 });
    expect(await myAssignments(other)).toEqual([]);
    const [mine] = await myAssignments(weak);
    expect(mine.topics).toEqual(["time_work"]);
    const d = await createFocusDrill({ id: weak, collegeId: A.college.id }, mine.topics, { assignmentId: mine.id, size: mine.questionsPerDay });
    expect(d.questionIds).toHaveLength(5);
    for (let i = 0; i < 5; i++) await gradeAttempt(weak, { clientId: `p${i}`, drillId: d.id, questionId: d.questionIds[i], displayedIndex: 0, timeMs: 1000 });
    const [row] = await db.select().from(focusAssignmentStudents).where(eq(focusAssignmentStudents.userId, weak));
    expect(row.completedAt).not.toBeNull();
  });
  it("coach drill-down is college-scoped", async () => {
    expect(await coachDetail(tpo, other)).toBeNull();
    const c = await coachDetail(tpo, strong);
    expect(c!.readiness.map((x) => x.company).sort()).toEqual(["infosys", "tcs_nqt"]);
  });
});
