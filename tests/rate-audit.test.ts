import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pg } from "@/db";
import { auditLogs } from "@/db/schema";
import { hit, LIMITS } from "@/lib/rate-limit";
import { audit, auditFor } from "@/lib/audit";
import { resetDb } from "./db";

beforeAll(resetDb);
afterAll(() => pg.end());

describe("rate limiter (Postgres fixed window)", () => {
  it("login: 5 per 15 min per ip+email, then blocked; new window resets", async () => {
    const t = new Date("2026-11-04T10:00:00Z");
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await hit("login", "1.2.3.4|a@b.in", 1, t));
    expect(results.slice(0, 5).every((r) => r.ok)).toBe(true);
    expect(results[5].ok).toBe(false);
    expect((await hit("login", "1.2.3.4|other@b.in", 1, t)).ok).toBe(true);
    const later = new Date(t.getTime() + LIMITS.login.windowMs);
    expect((await hit("login", "1.2.3.4|a@b.in", 1, later)).ok).toBe(true);
  });
  it("submit: cost counts batch size (120/min)", async () => {
    const t = new Date("2026-11-04T10:00:30Z");
    expect((await hit("submit", "u1", 100, t)).ok).toBe(true);
    expect((await hit("submit", "u1", 20, t)).ok).toBe(true);
    expect((await hit("submit", "u1", 1, t)).ok).toBe(false);
  });
  it("is atomic under concurrency", async () => {
    const t = new Date("2026-11-04T11:00:00Z");
    const rs = await Promise.all(Array.from({ length: 20 }, () => hit("explain", "u2", 1, t)));
    expect(rs.filter((r) => r.ok).length).toBe(LIMITS.explain.max);
  });
});

describe("audit log", () => {
  it("writes append-only entries scoped by college", async () => {
    await audit({ id: "00000000-0000-0000-0000-000000000001", collegeId: "00000000-0000-0000-0000-0000000000aa" }, "roster.import", { type: "batch", id: "b1", meta: { rows: 3 } });
    await audit({ id: "00000000-0000-0000-0000-000000000002", collegeId: "00000000-0000-0000-0000-0000000000bb" }, "mock.create");
    const a = await auditFor("00000000-0000-0000-0000-0000000000aa");
    expect(a).toHaveLength(1);
    expect(a[0].action).toBe("roster.import");
    expect(a[0].meta).toEqual({ rows: 3 });
    expect((await auditFor(null)).length).toBe(2);
    expect((await db.select().from(auditLogs).where(eq(auditLogs.action, "mock.create"))).length).toBe(1);
  });
});
