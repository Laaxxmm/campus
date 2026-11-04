import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditAction =
  | "roster.import"
  | "user.role_change"
  | "user.delete"
  | "user.export"
  | "batch.create"
  | "batch.update"
  | "college.create"
  | "college.update"
  | "question.publish"
  | "question.retire"
  | "question.edit"
  | "mock.create"
  | "mock.schedule"
  | "invite.send"
  | "export.students_csv";

/** Append-only audit record. Never throws into the caller's happy path, but logs failures. */
export async function audit(actor: { id: string; collegeId: string | null }, action: AuditAction, target: { type?: string; id?: string; collegeId?: string | null; meta?: Record<string, unknown>; ip?: string } = {}) {
  try {
    await db.insert(auditLogs).values({
      actorId: actor.id,
      collegeId: target.collegeId ?? actor.collegeId,
      action,
      targetType: target.type ?? null,
      targetId: target.id ?? null,
      meta: target.meta ?? null,
      ip: target.ip ?? null,
    });
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "audit write failed", action, err: String(e) }));
  }
}

export async function auditFor(collegeId: string | null, limit = 200) {
  return db
    .select()
    .from(auditLogs)
    .where(collegeId ? and(eq(auditLogs.collegeId, collegeId)) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
