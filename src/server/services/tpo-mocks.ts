import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { batches, batchMocks, mocks } from "@/db/schema";
import { audit } from "@/lib/audit";
import { COMPANY_IDS } from "@/lib/companies";
import { collegeOf } from "./tpo";
import type { SessionUser } from "@/lib/authz";

type Staff = Pick<SessionUser, "id" | "role" | "collegeId">;

export const CreateMockInput = z.object({
  title: z.string().trim().min(3).max(80),
  company: z.enum(COMPANY_IDS as [string, ...string[]]),
  quant: z.coerce.number().int().min(0).max(40),
  logical: z.coerce.number().int().min(0).max(40),
  verbal: z.coerce.number().int().min(0).max(40),
  coding: z.coerce.number().int().min(0).max(20),
  minutes: z.coerce.number().int().min(5).max(180),
  negativeMark: z.coerce.number().min(0).max(1),
  sectional: z.coerce.boolean().default(false),
}).refine((v) => v.quant + v.logical + v.verbal + v.coding >= 5, "at least 5 questions");

export const ScheduleInput = z.object({
  mockId: z.string().uuid(),
  batchId: z.string().uuid(),
  opensAt: z.coerce.date(),
  closesAt: z.coerce.date(),
}).refine((v) => v.closesAt > v.opensAt, "close must be after open");

export async function collegeMocks(staff: Staff, collegeId: string) {
  const cid = collegeOf(staff, collegeId);
  const list = await db.select().from(mocks).where(or(isNull(mocks.collegeId), eq(mocks.collegeId, cid))).orderBy(asc(mocks.company), asc(mocks.title));
  const sched = await db
    .select({ id: batchMocks.id, opensAt: batchMocks.opensAt, closesAt: batchMocks.closesAt, mock: mocks.title, batch: batches.name })
    .from(batchMocks)
    .innerJoin(mocks, eq(mocks.id, batchMocks.mockId))
    .innerJoin(batches, eq(batches.id, batchMocks.batchId))
    .where(eq(batchMocks.collegeId, cid))
    .orderBy(desc(batchMocks.opensAt));
  return { mocks: list, scheduled: sched };
}

export async function createMock(staff: Staff, collegeId: string, raw: unknown, ip?: string) {
  const cid = collegeOf(staff, collegeId);
  const v = CreateMockInput.parse(raw);
  const blueprint = (["quant", "logical", "verbal", "coding"] as const).filter((s) => v[s] > 0).map((s) => ({ section: s, count: v[s], difficulty: [1, 4] as [number, number], timeSec: 60 }));
  const [m] = await db
    .insert(mocks)
    .values({ collegeId: cid, company: v.company, title: v.title, blueprint, durationSec: v.minutes * 60, negativeMark: v.negativeMark, sectional: v.sectional, createdBy: staff.id, instructions: `Created by your TPO. ${v.negativeMark ? `Each wrong answer deducts ${v.negativeMark} marks.` : "No negative marking."}` })
    .returning();
  await audit(staff, "mock.create", { type: "mock", id: m.id, collegeId: cid, meta: { title: v.title, blueprint, minutes: v.minutes }, ip });
  return m;
}

export async function scheduleMock(staff: Staff, collegeId: string, raw: unknown, ip?: string) {
  const cid = collegeOf(staff, collegeId);
  const v = ScheduleInput.parse(raw);
  const [b] = await db.select().from(batches).where(and(eq(batches.id, v.batchId), eq(batches.collegeId, cid)));
  if (!b) throw new Error("batch not found");
  const [m] = await db.select().from(mocks).where(and(eq(mocks.id, v.mockId), or(isNull(mocks.collegeId), eq(mocks.collegeId, cid))));
  if (!m) throw new Error("mock not found");
  const [row] = await db.insert(batchMocks).values({ collegeId: cid, batchId: b.id, mockId: m.id, opensAt: v.opensAt, closesAt: v.closesAt, createdBy: staff.id }).returning();
  await audit(staff, "mock.schedule", { type: "batch_mock", id: row.id, collegeId: cid, meta: { mockId: m.id, batchId: b.id, opensAt: v.opensAt, closesAt: v.closesAt }, ip });
  return row;
}
