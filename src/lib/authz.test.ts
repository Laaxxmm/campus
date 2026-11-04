import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ForbiddenError, requireRole, scoped } from "./authz";
import { getStudentForStaff, listStudentsForStaff } from "../server/services/staff-students";
import { makeCollege, makeUser, resetDb } from "../../tests/db";
import { pg } from "@/db";
import { homeFor, rolesFor } from "./routes";

describe("requireRole", () => {
  it("allows listed roles", () => {
    expect(requireRole({ role: "tpo" }, ["tpo", "admin"]).role).toBe("tpo");
  });
  it("rejects other roles", () => {
    expect(() => requireRole({ role: "student" }, ["tpo"])).toThrow(ForbiddenError);
    expect(() => requireRole({ role: "content" }, ["admin"])).toThrow(ForbiddenError);
  });
  it("superadmin passes everything", () => {
    expect(requireRole({ role: "superadmin" }, ["tpo"]).role).toBe("superadmin");
  });
});

describe("scoped", () => {
  it("owns only own college", () => {
    const s = scoped({ role: "tpo", collegeId: "a" });
    expect(s.owns("a")).toBe(true);
    expect(s.owns("b")).toBe(false);
    expect(s.owns(null)).toBe(false);
  });
  it("collegeless staff owns nothing; superadmin owns all", () => {
    expect(scoped({ role: "tpo", collegeId: null }).owns(null)).toBe(false);
    expect(scoped({ role: "superadmin", collegeId: null }).owns("x")).toBe(true);
  });
});

describe("route roles", () => {
  it("maps prefixes", () => {
    expect(rolesFor("/tpo/students/123")).toContain("tpo");
    expect(rolesFor("/tpo")).not.toContain("student");
    expect(rolesFor("/today")).toEqual(["student"]);
    expect(rolesFor("/todayx")).toBeNull();
    expect(rolesFor("/")).toBeNull();
  });
  it("homes", () => {
    expect(homeFor("student", false)).toBe("/onboarding");
    expect(homeFor("student", true)).toBe("/today");
    expect(homeFor("tpo", true)).toBe("/tpo");
    expect(homeFor("superadmin", true)).toBe("/super");
  });
});

describe("cross-college isolation (DB)", () => {
  let ids: { tpoA: Awaited<ReturnType<typeof makeUser>>; studentA: string; studentB: string };
  beforeAll(async () => {
    await resetDb();
    const A = await makeCollege("Alpha");
    const B = await makeCollege("Beta");
    const tpoA = await makeUser({ collegeId: A.college.id, role: "tpo" });
    const sA = await makeUser({ collegeId: A.college.id, batchId: A.batch.id });
    const sB = await makeUser({ collegeId: B.college.id, batchId: B.batch.id });
    ids = { tpoA, studentA: sA.id, studentB: sB.id };
  });
  afterAll(async () => {
    await pg.end();
  });

  it("TPO of college A can read own student", async () => {
    expect((await getStudentForStaff(ids.tpoA, ids.studentA))?.id).toBe(ids.studentA);
  });
  it("TPO of college A cannot read college B student", async () => {
    expect(await getStudentForStaff(ids.tpoA, ids.studentB)).toBeNull();
  });
  it("list is scoped to own college", async () => {
    const list = await listStudentsForStaff(ids.tpoA);
    expect(list.map((s) => s.id)).toEqual([ids.studentA]);
  });
  it("student role cannot use staff queries", async () => {
    await expect(getStudentForStaff({ role: "student", collegeId: ids.tpoA.collegeId }, ids.studentA)).rejects.toThrow(ForbiddenError);
  });
});
