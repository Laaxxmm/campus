import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { batches, colleges, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { COMPANY_IDS } from "@/lib/companies";
import { collegeOf } from "./tpo";
import type { SessionUser } from "@/lib/authz";

type Staff = Pick<SessionUser, "id" | "role" | "collegeId">;

export const BatchInput = z.object({
  name: z.string().trim().min(2).max(60),
  gradYear: z.coerce.number().int().min(2020).max(2040).optional().or(z.literal("").transform(() => undefined)),
  branch: z.string().trim().max(40).optional().transform((v) => v || null),
  targetCompany: z.enum(COMPANY_IDS as [string, ...string[]]).optional().or(z.literal("").transform(() => undefined)),
  targetDriveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
});

export async function createBatch(staff: Staff, collegeId: string | undefined, raw: unknown, ip?: string) {
  const cid = collegeOf(staff, collegeId);
  const v = BatchInput.parse(raw);
  const [b] = await db.insert(batches).values({ collegeId: cid, name: v.name, gradYear: v.gradYear ?? null, branch: v.branch, targetCompany: v.targetCompany ?? null, targetDriveDate: v.targetDriveDate ?? null }).returning();
  await audit(staff, "batch.create", { type: "batch", id: b.id, collegeId: cid, meta: v, ip });
  return b;
}

export async function updateBatch(staff: Staff, collegeId: string | undefined, batchId: string, raw: unknown, ip?: string) {
  const cid = collegeOf(staff, collegeId);
  const v = BatchInput.parse(raw);
  const [b] = await db
    .update(batches)
    .set({ name: v.name, gradYear: v.gradYear ?? null, branch: v.branch, targetCompany: v.targetCompany ?? null, targetDriveDate: v.targetDriveDate ?? null })
    .where(and(eq(batches.id, batchId), eq(batches.collegeId, cid)))
    .returning();
  if (!b) throw new Error("batch not found");
  await audit(staff, "batch.update", { type: "batch", id: b.id, collegeId: cid, meta: v, ip });
  return b;
}

export async function collegeSettings(staff: Staff, collegeId?: string) {
  const cid = collegeOf(staff, collegeId);
  const [c] = await db.select().from(colleges).where(eq(colleges.id, cid));
  const [counts] = await db
    .select({ students: sql<number>`count(*) filter (where ${users.role} = 'student')::int`, staff: sql<number>`count(*) filter (where ${users.role} in ('tpo','admin'))::int`, consented: sql<number>`count(*) filter (where ${users.role} = 'student' and ${users.consentAt} is not null)::int` })
    .from(users)
    .where(eq(users.collegeId, cid));
  return { college: c, ...counts };
}

export const CollegeInput = z.object({ name: z.string().trim().min(3).max(120), city: z.string().trim().max(60).optional().transform((v) => v || null) });
export async function updateCollege(staff: Staff, collegeId: string | undefined, raw: unknown, ip?: string) {
  const cid = collegeOf(staff, collegeId);
  const v = CollegeInput.parse(raw);
  await db.update(colleges).set(v).where(eq(colleges.id, cid));
  await audit(staff, "college.update", { type: "college", id: cid, collegeId: cid, meta: v, ip });
}
