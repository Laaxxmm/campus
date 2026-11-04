import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { and, eq, sql } from "drizzle-orm";
import { db, pg } from "@/db";
import { auditLogs, batches, colleges, invites, users } from "@/db/schema";
import { commitRoster, previewRoster } from "@/server/services/roster";
import { makeCollege, makeUser, resetDb } from "./db";

let A: Awaited<ReturnType<typeof makeCollege>>, tpo: Awaited<ReturnType<typeof makeUser>>;
const good = readFileSync("fixtures/roster-200.csv", "utf8");
const bad = readFileSync("fixtures/roster-bad.csv", "utf8");
const studentsIn = async (cid: string) => (await db.select({ n: sql<number>`count(*)::int` }).from(users).where(and(eq(users.collegeId, cid), eq(users.role, "student"))))[0].n;

beforeAll(async () => {
  await resetDb();
  A = await makeCollege("Demo");
  await db.update(batches).set({ name: "2027 CSE-A" }).where(eq(batches.id, A.batch.id));
  await db.insert(batches).values({ collegeId: A.college.id, name: "2027 ECE" });
  await db.update(colleges).set({ seats: 205 }).where(eq(colleges.id, A.college.id));
  tpo = await makeUser({ collegeId: A.college.id, role: "tpo" });
  const B = await makeCollege("Sample");
  await makeUser({ collegeId: B.college.id, email: "student001@sample.learncrew.in" });
});
afterAll(() => pg.end());

describe("roster CSV import", () => {
  it("previews 200 new rows, no errors, seats ok", async () => {
    const p = await previewRoster(tpo, undefined, good, { createBatches: false });
    expect(p.fatal).toBeNull();
    expect(p.counts).toMatchObject({ total: 200, new: 200, error: 0 });
    expect(p.seats).toMatchObject({ used: 0, limit: 205, after: 200 });
  });
  it("imports 200 students, creates invites, audits; re-import creates 0 duplicates", async () => {
    const r1 = await commitRoster(tpo, undefined, good, { createBatches: false, sendInvites: true });
    expect(r1).toMatchObject({ ok: true, created: 200, updated: 0, skipped: 0, invited: 200 });
    expect(await studentsIn(A.college.id)).toBe(200);
    const r2 = await commitRoster(tpo, undefined, good, { createBatches: false, sendInvites: true });
    expect(r2).toMatchObject({ ok: true, created: 0, unchanged: 200 });
    expect(await studentsIn(A.college.id)).toBe(200);
    expect((await db.select().from(invites)).length).toBe(200);
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.action, "roster.import"));
    expect(logs).toHaveLength(2);
    expect(logs[0].meta).toMatchObject({ rows: 200 });
  });
  it("reports malformed rows instead of crashing, imports the valid ones", async () => {
    const p = await previewRoster(tpo, undefined, bad, { createBatches: false });
    const byEmail = (e: string) => p.rows.find((r) => r.email === e)!;
    expect(p.rows.find((r) => r.line === 3)!.errors).toContain("bad email"); // empty email
    expect(byEmail("not-an-email").errors).toContain("bad email");
    expect(byEmail("dup.roll@demo.learncrew.in").errors[0]).toMatch(/duplicate roll no \(line 2\)/);
    expect(byEmail("ghost@demo.learncrew.in").errors[0]).toMatch(/unknown batch "2030 MECH"/);
    expect(p.rows.find((r) => r.line === 7)!.errors[0]).toMatch(/duplicate email \(line 2\)/);
    expect(byEmail("student001@sample.learncrew.in").errors).toContain("email is registered with another college");
    expect(byEmail("x@demo.learncrew.in").errors).toContain("name missing");
    expect(byEmail("comma.name@demo.learncrew.in")).toMatchObject({ name: "Comma, Name", status: "new" });
    expect(p.counts).toMatchObject({ total: 9, new: 2, error: 7 });
    const r = await commitRoster(tpo, undefined, bad, { createBatches: false, sendInvites: false });
    expect(r).toMatchObject({ ok: true, created: 2, skipped: 7 });
    const [other] = await db.select().from(users).where(eq(users.email, "student001@sample.learncrew.in"));
    expect(other.collegeId).not.toBe(A.college.id); // never moved across colleges
  });
  it("create-batches toggle creates unknown batches", async () => {
    const csv = "name,email,roll_no,batch\nNew Mech,new.mech@demo.learncrew.in,24ME001,2030 MECH\n";
    const r = await commitRoster(tpo, undefined, csv, { createBatches: true, sendInvites: false });
    expect(r).toMatchObject({ ok: true, created: 1, newBatches: ["2030 MECH"] });
  });
  it("enforces the seat limit (blocks the whole import)", async () => {
    const csv = ["name,email", ...Array.from({ length: 5 }, (_, i) => `Extra ${i},extra${i}@demo.learncrew.in`)].join("\n");
    const r = await commitRoster(tpo, undefined, csv, { createBatches: false, sendInvites: false });
    expect(r.ok).toBe(false);
    expect(r.ok ? "" : r.error).toMatch(/Seat limit/);
    expect(await studentsIn(A.college.id)).toBe(203);
  });
  it("rejects files without the required header", async () => {
    const p = await previewRoster(tpo, undefined, "foo,bar\n1,2\n", { createBatches: false });
    expect(p.fatal).toMatch(/header row/);
  });
});
