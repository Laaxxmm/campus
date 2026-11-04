import { eq } from "drizzle-orm";
import { db } from "@/db";
import { batches, colleges, users } from "@/db/schema";
import { isCompany } from "@/lib/companies";
import { track } from "@/lib/events";

export async function profileFor(userId: string) {
  const [row] = await db
    .select({ name: users.name, email: users.email, rollNo: users.rollNo, targetCompany: users.targetCompany, batch: batches.name, batchTarget: batches.targetCompany, college: colleges.name, consentAt: users.consentAt, xp: users.xp })
    .from(users)
    .leftJoin(batches, eq(batches.id, users.batchId))
    .leftJoin(colleges, eq(colleges.id, users.collegeId))
    .where(eq(users.id, userId));
  return row;
}
export async function setTargetCompany(userId: string, company: string) {
  if (!isCompany(company)) return false;
  await db.update(users).set({ targetCompany: company }).where(eq(users.id, userId));
  return true;
}
/** DPDP: student asks for deletion. Recorded for the college admin / superadmin to action (admin export/delete in /super). */
export async function requestDeletion(user: { id: string; collegeId: string | null }) {
  await track("data_deletion_request", { userId: user.id, collegeId: user.collegeId });
}
