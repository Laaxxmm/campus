import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { batches, users } from "@/db/schema";
import { isCompany } from "@/lib/companies";
import { track } from "@/lib/events";

export async function onboardingData(userId: string) {
  const [me] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const myBatches = me?.collegeId ? await db.select().from(batches).where(eq(batches.collegeId, me.collegeId)).orderBy(asc(batches.name)) : [];
  return { me, batches: myBatches };
}

/** Saves profile + DPDP consent. Batch must belong to the student's own college. */
export async function completeOnboarding(user: { id: string; collegeId: string | null }, input: { name: string; rollNo: string; batchId: string; target: string }) {
  let batchOk: string | null = null;
  if (input.batchId && user.collegeId) {
    const [b] = await db.select({ id: batches.id, collegeId: batches.collegeId }).from(batches).where(eq(batches.id, input.batchId)).limit(1);
    if (b && b.collegeId === user.collegeId) batchOk = b.id;
  }
  await db
    .update(users)
    .set({
      name: input.name || null,
      rollNo: input.rollNo || null,
      ...(batchOk ? { batchId: batchOk } : {}),
      targetCompany: isCompany(input.target) ? input.target : null,
      consentAt: new Date(),
    })
    .where(eq(users.id, user.id));
  await track("consent_given", { userId: user.id, collegeId: user.collegeId });
}
