import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accounts, attempts, colleges, drills, events, invites, mockAttempts, readinessSnapshots, reviewQueue, sessions, skills, streaks, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireRole, type SessionUser } from "@/lib/authz";
import { syncCollegeAccess } from "@/lib/bank";
import { sendInvites } from "./roster";

type Admin = Pick<SessionUser, "id" | "role" | "collegeId">;
export const REAUTH_MS = 15 * 60_000;

/** v2: admin actions require a sign-in within the last 15 minutes. */
export async function recentlyAuthenticated(userId: string, now = new Date()) {
  const [e] = await db.select({ at: events.createdAt }).from(events).where(and(eq(events.userId, userId), eq(events.name, "sign_in"), gte(events.createdAt, new Date(now.getTime() - REAUTH_MS)))).limit(1);
  return Boolean(e);
}
export class ReauthRequired extends Error {
  constructor() {
    super("Please confirm it's you: sign in again (admin actions need a login within 15 minutes).");
  }
}
async function assertFresh(user: Admin) {
  requireRole(user, ["superadmin"]);
  if (!(await recentlyAuthenticated(user.id))) throw new ReauthRequired();
}

export async function listColleges(user: Admin) {
  requireRole(user, ["superadmin"]);
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString().replace("Z", "");
  return db.execute<{ id: string; name: string; city: string | null; plan: string; seats: number; students: number; active7: number; drills7: number; created_at: Date }>(sql`
    select c.id, c.name, c.city, c.plan, c.seats, c.created_at,
      (select count(*)::int from users u where u.college_id = c.id and u.role = 'student') students,
      (select count(*)::int from users u where u.college_id = c.id and u.role = 'student' and u.last_active_at >= ${since}::timestamp) active7,
      (select count(*)::int from drills d join users u on u.id = d.user_id where u.college_id = c.id and d.completed_at >= ${since}::timestamp) drills7
    from colleges c order by c.created_at`);
}

export const CreateCollegeInput = z.object({
  name: z.string().trim().min(3).max(120),
  city: z.string().trim().max(60).optional().transform((v) => v || null),
  seats: z.coerce.number().int().min(10).max(100_000),
  plan: z.enum(["pilot", "starter", "placement", "premium"]),
  tpoName: z.string().trim().min(2).max(80),
  tpoEmail: z.string().trim().toLowerCase().email(),
});

export async function createCollege(user: Admin, raw: unknown, ip?: string) {
  await assertFresh(user);
  const v = CreateCollegeInput.parse(raw);
  const [existing] = await db.select().from(users).where(eq(users.email, v.tpoEmail));
  if (existing) throw new Error("That TPO email already has an account.");
  const result = await db.transaction(async (tx) => {
    const [c] = await tx.insert(colleges).values({ name: v.name, city: v.city, seats: v.seats, plan: v.plan, bankSeed: Math.floor(Math.random() * 2 ** 31) }).returning();
    const [tpo] = await tx.insert(users).values({ email: v.tpoEmail, name: v.tpoName, role: "tpo", collegeId: c.id, consentAt: null }).returning();
    await tx.insert(invites).values({ collegeId: c.id, email: v.tpoEmail, role: "tpo" });
    return { college: c, tpo };
  });
  await syncCollegeAccess(result.college.id);
  await sendInvites(result.college.id, [v.tpoEmail]);
  await audit(user, "college.create", { type: "college", id: result.college.id, collegeId: result.college.id, meta: { name: v.name, seats: v.seats, plan: v.plan, tpo: result.tpo.id }, ip });
  return result;
}

async function findStudent(email: string) {
  const [u] = await db.select().from(users).where(and(eq(users.email, email.trim().toLowerCase()), eq(users.role, "student")));
  return u ?? null;
}

/** DPDP data export: everything we hold about one student. */
export async function exportStudent(user: Admin, email: string, ip?: string) {
  await assertFresh(user);
  const u = await findStudent(email);
  if (!u) return null;
  const [a, d, m, sk, st, rs, ev] = await Promise.all([
    db.select().from(attempts).where(eq(attempts.userId, u.id)),
    db.select().from(drills).where(eq(drills.userId, u.id)),
    db.select().from(mockAttempts).where(eq(mockAttempts.userId, u.id)),
    db.select().from(skills).where(eq(skills.userId, u.id)),
    db.select().from(streaks).where(eq(streaks.userId, u.id)),
    db.select().from(readinessSnapshots).where(eq(readinessSnapshots.userId, u.id)),
    db.select().from(events).where(eq(events.userId, u.id)),
  ]);
  await audit(user, "user.export", { type: "user", id: u.id, collegeId: u.collegeId, ip });
  return { exportedAt: new Date().toISOString(), profile: { id: u.id, name: u.name, email: u.email, rollNo: u.rollNo, collegeId: u.collegeId, batchId: u.batchId, consentAt: u.consentAt, xp: u.xp, createdAt: u.createdAt }, attempts: a, drills: d, mockAttempts: m, skills: sk, streaks: st, readiness: rs, events: ev };
}

/** DPDP erasure: removes the student and all practice data; analytics events are de-identified. */
export async function deleteStudent(user: Admin, email: string, ip?: string) {
  await assertFresh(user);
  const u = await findStudent(email);
  if (!u) return false;
  await db.transaction(async (tx) => {
    await tx.delete(attempts).where(eq(attempts.userId, u.id));
    await tx.delete(mockAttempts).where(eq(mockAttempts.userId, u.id));
    await tx.delete(drills).where(eq(drills.userId, u.id));
    await tx.delete(reviewQueue).where(eq(reviewQueue.userId, u.id));
    await tx.delete(skills).where(eq(skills.userId, u.id));
    await tx.delete(streaks).where(eq(streaks.userId, u.id));
    await tx.delete(readinessSnapshots).where(eq(readinessSnapshots.userId, u.id));
    await tx.delete(sessions).where(eq(sessions.userId, u.id));
    await tx.delete(accounts).where(eq(accounts.userId, u.id));
    await tx.delete(invites).where(eq(invites.email, u.email));
    await tx.update(events).set({ userId: null }).where(eq(events.userId, u.id));
    await tx.delete(users).where(eq(users.id, u.id));
  });
  await audit(user, "user.delete", { type: "user", id: u.id, collegeId: u.collegeId, meta: { reason: "dpdp_erasure" }, ip });
  return true;
}

export async function deletionRequests(user: Admin) {
  requireRole(user, ["superadmin"]);
  return db
    .select({ at: events.createdAt, userId: events.userId, email: users.email, name: users.name, college: colleges.name })
    .from(events)
    .innerJoin(users, eq(users.id, events.userId))
    .leftJoin(colleges, eq(colleges.id, users.collegeId))
    .where(eq(events.name, "data_deletion_request"))
    .orderBy(desc(events.createdAt))
    .limit(200);
}
