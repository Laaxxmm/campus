import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { companyBlueprints, questions, readinessSnapshots, skills, users } from "@/db/schema";
import { getOrCreateDrill } from "@/lib/drill";
import { readiness } from "@/lib/adaptive";
import { istDate, isoWeek } from "@/lib/time";
import { pruneRateLimits } from "@/lib/rate-limit";
import { finalizeAllExpired } from "./mocks";
import { topicsBySection } from "./student";

/** 05:00 IST: build today's drill for students active in the last 14 days. Idempotent (one drill per user/day). */
export async function buildDrills(now = new Date()) {
  const date = istDate(now);
  const since = new Date(now.getTime() - 14 * 86_400_000);
  const active = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "student"), isNotNull(users.consentAt), isNotNull(users.collegeId), gte(users.lastActiveAt, since)));
  let built = 0, failed = 0;
  for (const u of active) {
    try {
      await getOrCreateDrill(u.id, date);
      built++;
    } catch (e) {
      failed++;
      console.error(JSON.stringify({ level: "error", msg: "build drill failed", userId: u.id, err: String(e) }));
    }
  }
  const mocksFinalized = await finalizeAllExpired(now);
  return { date, students: active.length, built, failed, mocksFinalized };
}

/** Weekly: readiness snapshots, 7-day correct rates, retire leaked questions, prune rate-limit windows. */
export async function weekly(now = new Date()) {
  const week = isoWeek(istDate(now));
  const bps = await db.select().from(companyBlueprints);
  const students = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "student"), isNotNull(users.collegeId)));
  let snapshots = 0;
  for (let i = 0; i < students.length; i += 200) {
    const ids = students.slice(i, i + 200).map((s) => s.id);
    const sk = await db.select({ userId: skills.userId, topic: skills.topic, rating: skills.rating }).from(skills).where(inArray(skills.userId, ids));
    const acc = await db.execute<{ user_id: string; acc: number }>(sql`
      select user_id, avg(case when correct then 1.0 else 0 end)::float acc from (
        select user_id, correct, row_number() over (partition by user_id order by created_at desc) rn from attempts where user_id in ${ids}
      ) t where rn <= 50 group by user_id`);
    const accBy = new Map(acc.map((r) => [r.user_id, r.acc]));
    const rows = ids.flatMap((uid) => {
      const ratings = new Map(sk.filter((s) => s.userId === uid).map((s) => [s.topic, s.rating]));
      return bps.map((b) => {
        const r = readiness({ company: b.company, sectionWeights: b.sectionWeights as Record<string, number>, topicWeights: b.topicWeights as Record<string, number> }, topicsBySection, ratings, accBy.get(uid) ?? null);
        return { userId: uid, company: b.company, week, score: r.score, topicBreakdown: r.breakdown };
      });
    });
    if (rows.length)
      await db
        .insert(readinessSnapshots)
        .values(rows)
        .onConflictDoUpdate({ target: [readinessSnapshots.userId, readinessSnapshots.company, readinessSnapshots.week], set: { score: sql`excluded.score`, topicBreakdown: sql`excluded.topic_breakdown` } });
    snapshots += rows.length;
  }
  const retired = await retireLeaked(now);
  await pruneRateLimits();
  return { week, snapshots, retired };
}

/**
 * Leak detector: a question whose correct-rate this week is > 85% (≥ 30 attempts) after being ≤ 65% the week before
 * has probably been shared — retire it. Also refreshes questions.correct_rate_7d.
 */
export async function retireLeaked(now = new Date()) {
  const rows = await db.execute<{ id: string; n7: number; r7: number | null; np: number; rp: number | null }>(sql`
    select question_id id,
      count(*) filter (where created_at >= ${new Date(now.getTime() - 7 * 86_400_000).toISOString().replace("Z", "")}::timestamp)::int n7,
      avg(case when correct then 1.0 else 0 end) filter (where created_at >= ${new Date(now.getTime() - 7 * 86_400_000).toISOString().replace("Z", "")}::timestamp)::float r7,
      count(*) filter (where created_at < ${new Date(now.getTime() - 7 * 86_400_000).toISOString().replace("Z", "")}::timestamp)::int np,
      avg(case when correct then 1.0 else 0 end) filter (where created_at < ${new Date(now.getTime() - 7 * 86_400_000).toISOString().replace("Z", "")}::timestamp)::float rp
    from attempts where created_at >= ${new Date(now.getTime() - 14 * 86_400_000).toISOString().replace("Z", "")}::timestamp
    group by question_id`);
  const leaked: string[] = [];
  for (const r of rows) {
    if (r.r7 !== null) await db.update(questions).set({ correctRate7d: r.r7 }).where(eq(questions.id, r.id));
    if (r.n7 >= 30 && (r.r7 ?? 0) > 0.85 && r.np >= 30 && (r.rp ?? 1) <= 0.65) leaked.push(r.id);
  }
  if (leaked.length) await db.update(questions).set({ status: "retired" }).where(and(inArray(questions.id, leaked), eq(questions.status, "golden")));
  return leaked;
}
