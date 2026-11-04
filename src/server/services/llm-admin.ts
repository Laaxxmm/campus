import { desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { companyProfiles, llmUsage } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireRole, type SessionUser } from "@/lib/authz";
import { MONTHLY_DRAFTS } from "./profile-coach";

type Admin = Pick<SessionUser, "id" | "role" | "collegeId">;
export const USD_INR = Number(process.env.USD_INR ?? 84);

/** LLM spend by feature and college for the last 30 days, plus ₹ per active student per month. */
export async function llmUsageReport(user: Admin, now = new Date()) {
  requireRole(user, ["superadmin"]);
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const byFeature = await db
    .select({ feature: llmUsage.feature, model: llmUsage.model, calls: sql<number>`count(*)::int`, input: sql<number>`sum(${llmUsage.inputTokens})::int`, output: sql<number>`sum(${llmUsage.outputTokens})::int`, usd: sql<number>`coalesce(sum(${llmUsage.costUsd}), 0)::float` })
    .from(llmUsage)
    .where(gte(llmUsage.createdAt, since))
    .groupBy(llmUsage.feature, llmUsage.model)
    .orderBy(desc(sql`sum(${llmUsage.costUsd})`));
  const byCollege = await db.execute<{ id: string; name: string; usd: number; students: number; active: number }>(sql`
    select c.id, c.name,
      coalesce((select sum(cost_usd) from llm_usage l where l.college_id = c.id and l.created_at >= ${since.toISOString().replace("Z", "")}::timestamp), 0)::float usd,
      (select count(*)::int from users u where u.college_id = c.id and u.role = 'student') students,
      (select count(*)::int from users u where u.college_id = c.id and u.role = 'student' and u.last_active_at >= ${since.toISOString().replace("Z", "")}::timestamp) active
    from colleges c order by c.name`);
  const totalUsd = byFeature.reduce((s, r) => s + r.usd, 0);
  const active = byCollege.reduce((s, r) => s + r.active, 0);
  const heavy = await db
    .select({ userId: llmUsage.userId, calls: sql<number>`count(*)::int`, usd: sql<number>`sum(${llmUsage.costUsd})::float` })
    .from(llmUsage)
    .where(gte(llmUsage.createdAt, since))
    .groupBy(llmUsage.userId)
    .orderBy(desc(sql`count(*)`))
    .limit(10);
  return {
    byFeature,
    byCollege: byCollege.map((c) => ({ ...c, inrPerActive: c.active ? Math.round((c.usd * USD_INR * 100) / c.active) / 100 : 0 })),
    totalUsd,
    totalInr: Math.round(totalUsd * USD_INR * 100) / 100,
    inrPerActiveStudent: active ? Math.round((totalUsd * USD_INR * 100) / active) / 100 : 0,
    quota: { draftsPerStudentPerMonth: MONTHLY_DRAFTS },
    heavy,
  };
}

export async function companyProfilesForReview(user: Admin) {
  requireRole(user, ["content"]);
  return db.select().from(companyProfiles).orderBy(companyProfiles.name);
}
export async function setCompanyProfileStatus(user: Admin, key: string, status: "golden" | "review" | "retired") {
  requireRole(user, ["content"]);
  await db.update(companyProfiles).set({ status }).where(eq(companyProfiles.key, key));
  await audit(user, status === "golden" ? "question.publish" : "question.retire", { type: "company_profile", id: key, collegeId: null, meta: { status } });
}
