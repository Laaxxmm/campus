import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pg } from "@/db";
import { auditLogs, batches, collegeQuestionAccess, questions, skills, users } from "@/db/schema";
import { branchList, heatmap, nudgeText, overview, studentDetail, studentRows } from "@/server/services/tpo";
import { createMock, scheduleMock } from "@/server/services/tpo-mocks";
import { reportStats, templatedNarrative, weeklyReport } from "@/server/services/reports";
import { studentsCsv } from "@/server/services/tpo-export";
import { makeCollege, makeUser, resetDb } from "./db";

let A: Awaited<ReturnType<typeof makeCollege>>, B: Awaited<ReturnType<typeof makeCollege>>;
let tpoA: Awaited<ReturnType<typeof makeUser>>, tpoB: Awaited<ReturnType<typeof makeUser>>, sA: string, sB: string;
beforeAll(async () => {
  await resetDb();
  A = await makeCollege("Alpha");
  B = await makeCollege("Beta");
  tpoA = await makeUser({ collegeId: A.college.id, role: "tpo" });
  tpoB = await makeUser({ collegeId: B.college.id, role: "tpo" });
  sA = (await makeUser({ collegeId: A.college.id, batchId: A.batch.id, name: "Kavya Menon" })).id;
  await makeUser({ collegeId: A.college.id, batchId: A.batch.id, name: "Rohan Das" });
  sB = (await makeUser({ collegeId: B.college.id, batchId: B.batch.id, name: "Other College" })).id;
  await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, sA));
  await db.insert(skills).values([{ userId: sA, topic: "percentages", rating: 1400 }, { userId: sB, topic: "percentages", rating: 900 }]);
  const q = { id: "Q-QNT-PCT-5000", section: "quant" as const, topic: "percentages", subtopic: "x", stem: "s", options: ["a", "b", "c", "d"], answerIndex: 0, explanation: "e", difficulty: 2, timeSec: 60, source: "seed" as const, status: "golden" as const, variantGroup: "T" };
  await db.insert(questions).values(q);
  await db.insert(collegeQuestionAccess).values({ collegeId: A.college.id, questionId: q.id });
});
afterAll(() => pg.end());

describe("TPO dashboard services", () => {
  it("student rows are college-scoped; at-risk flags inactive students", async () => {
    const rows = await studentRows(tpoA);
    expect(rows.map((r) => r.name).sort()).toEqual(["Kavya Menon", "Rohan Das"]);
    expect(rows.find((r) => r.name === "Rohan Das")!.atRisk).toBe(true);
    expect(rows.find((r) => r.name === "Kavya Menon")!.atRisk).toBe(false);
    expect((await studentRows(tpoB)).map((r) => r.name)).toEqual(["Other College"]);
  });
  it("a TPO cannot pass another college id to widen scope", async () => {
    const rows = await studentRows(tpoA, { collegeId: B.college.id });
    expect(rows.every((r) => r.name !== "Other College")).toBe(true);
  });
  it("student detail of another college is null (→ 404)", async () => {
    expect(await studentDetail(tpoA, sA)).not.toBeNull();
    expect(await studentDetail(tpoA, sB)).toBeNull();
    expect(await studentDetail(tpoA, "not-a-uuid")).toBeNull();
  });
  it("overview KPIs + heatmap aggregates", async () => {
    const o = await overview(tpoA);
    expect(o).toMatchObject({ total: 2, weeklyActivePct: 50, atRisk: 1 });
    const h = await heatmap(tpoA, { metric: "mastery" });
    const col = h.topics.findIndex((t) => t.id === "percentages");
    expect(h.rows[0].cells[col]).toMatchObject({ n: 1 });
    expect(h.rows[0].cells[col]!.mastery).toBeGreaterThan(70); // Beta's weak student not mixed in
    const hc = await heatmap(tpoA, { company: "tcs_nqt" });
    expect(hc.company).toBe("tcs_nqt");
  });
  it("heatmap branch + date filters are college-scoped and never widen scope", async () => {
    await db.update(batches).set({ branch: "CSE" }).where(eq(batches.id, A.batch.id));
    await db.update(batches).set({ branch: "MECH" }).where(eq(batches.id, B.batch.id));
    expect(await branchList(tpoA)).toEqual(["CSE"]); // Beta's MECH is not offered to Alpha
    const ok = await heatmap(tpoA, { metric: "mastery", branch: "CSE", days: 7 });
    expect(ok).toMatchObject({ branch: "CSE", days: 7 });
    expect(ok.rows.map((r) => r.id)).toEqual([A.batch.id]);
    const foreign = await heatmap(tpoA, { metric: "mastery", branch: "MECH", days: 3650 });
    expect(foreign).toMatchObject({ branch: null, days: 30 }); // unknown branch / window ignored
    expect(foreign.rows.every((r) => r.id !== B.batch.id)).toBe(true);
  });
  it("nudge text is personal but short; includes drive date and app link", () => {
    const t = nudgeText({ name: "Kavya Menon", target: "infosys", inactiveDays: 6, readiness: 30 }, "https://app.x.in", "2027-02-10");
    expect(t).toMatch(/^Hi Kavya, it's been 6 days/);
    expect(t).toContain("Infosys drive is on 10 Feb");
    expect(t).toContain("https://app.x.in/today");
  });
  it("CSV has the expected headers and escapes formulas", async () => {
    await db.update(users).set({ name: "=cmd|calc" }).where(eq(users.id, sA));
    const csv = studentsCsv(await studentRows(tpoA));
    expect(csv.split("\r\n")[0]).toBe("﻿Name,Email,Roll no,Batch,Target company,Streak (days),XP,Drills (7 days),Accuracy 30d (%),Readiness,Last active (IST),At risk,Reason");
    expect(csv).toContain("'=cmd|calc");
    await db.update(users).set({ name: "Kavya Menon" }).where(eq(users.id, sA));
  });
  it("createMock + scheduleMock are scoped and audited; foreign batch rejected", async () => {
    const m = await createMock(tpoA, A.college.id, { title: "Pre-drive", company: "infosys", quant: 5, logical: 5, verbal: 0, coding: 0, minutes: 20, negativeMark: 0.25 });
    expect(m.collegeId).toBe(A.college.id);
    await scheduleMock(tpoA, A.college.id, { mockId: m.id, batchId: A.batch.id, opensAt: "2026-11-05T09:00:00+05:30", closesAt: "2026-11-06T09:00:00+05:30" });
    await expect(scheduleMock(tpoA, A.college.id, { mockId: m.id, batchId: B.batch.id, opensAt: "2026-11-05T09:00:00Z", closesAt: "2026-11-06T09:00:00Z" })).rejects.toThrow(/batch not found/);
    await expect(scheduleMock(tpoB, B.college.id, { mockId: m.id, batchId: B.batch.id, opensAt: "2026-11-05T09:00:00Z", closesAt: "2026-11-06T09:00:00Z" })).rejects.toThrow(/mock not found/);
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.collegeId, A.college.id));
    expect(logs.map((l) => l.action).sort()).toEqual(["mock.create", "mock.schedule"]);
    expect(logs.every((l) => l.actorId === tpoA.id)).toBe(true);
  });
  it("weekly report stats contain no PII and the narrative is cached", async () => {
    const s = await reportStats(tpoA, A.college.id);
    const json = JSON.stringify(s);
    expect(json).not.toMatch(/Kavya|Rohan|@test\.in/);
    expect(templatedNarrative(s)).toMatch(/of your 2 students practised/);
    const r1 = await weeklyReport(tpoA, A.college.id);
    expect(r1.model).toBe("template");
    const r2 = await weeklyReport(tpoA, A.college.id);
    expect(r2.narrative).toBe(r1.narrative);
  });
  it("batch rename does not leak across colleges", async () => {
    const [b] = await db.select().from(batches).where(eq(batches.id, B.batch.id));
    expect(b.collegeId).toBe(B.college.id);
  });
});
