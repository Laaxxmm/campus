import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, drills, questions, skills, streaks, users } from "@/db/schema";
import { readiness } from "@/lib/adaptive";
import { blueprintFor, targetCompanyFor } from "@/lib/drill";
import { displayStreak, NEW_STREAK } from "@/lib/streak";
import { istDate, istMidnightUtc, weekStart } from "@/lib/time";
import { TOPICS, topicName } from "@/lib/question-schema";
import { COMPANIES } from "@/lib/companies";

export const topicsBySection = TOPICS.reduce<Record<string, string[]>>((acc, t) => ((acc[t.section] ??= []).push(t.id), acc), {});

export async function recentAccuracy(userId: string) {
  const rows = await db.select({ c: attempts.correct }).from(attempts).where(eq(attempts.userId, userId)).orderBy(desc(attempts.createdAt)).limit(50);
  return rows.length ? rows.filter((r) => r.c).length / rows.length : null;
}

export async function readinessFor(userId: string, company: string) {
  const bp = await blueprintFor(company);
  if (!bp) return { score: 0, breakdown: {} as Record<string, number> };
  const sk = await db.select({ topic: skills.topic, rating: skills.rating }).from(skills).where(eq(skills.userId, userId));
  return readiness(bp, topicsBySection, new Map(sk.map((s) => [s.topic, s.rating])), await recentAccuracy(userId));
}

export async function todaySummary(userId: string) {
  const today = istDate();
  const [u] = await db.select({ xp: users.xp, name: users.name }).from(users).where(eq(users.id, userId));
  const [st] = await db.select().from(streaks).where(eq(streaks.userId, userId));
  const [drill] = await db.select().from(drills).where(and(eq(drills.userId, userId), eq(drills.date, today)));
  const answered = drill
    ? (await db.select({ n: sql<number>`count(*)::int` }).from(attempts).where(and(eq(attempts.userId, userId), eq(attempts.drillId, drill.id))))[0].n
    : 0;
  const company = await targetCompanyFor(userId);
  const r = await readinessFor(userId, company);
  const sk = await db.select().from(skills).where(eq(skills.userId, userId)).orderBy(skills.rating).limit(3);
  return {
    today,
    name: u?.name ?? "",
    xp: u?.xp ?? 0,
    streak: displayStreak(st ?? NEW_STREAK, today),
    longest: st?.longest ?? 0,
    freezes: st && st.freezeWeek ? st.freezes : 1,
    drill,
    answered,
    company,
    readiness: r.score,
    weakest: sk.map((s) => ({ topic: s.topic, name: topicName(s.topic) })),
  };
}

export async function progressFor(userId: string) {
  const sk = await db.select().from(skills).where(eq(skills.userId, userId));
  const perTopic = await db
    .select({ topic: questions.topic, n: sql<number>`count(*)::int`, correct: sql<number>`sum(case when ${attempts.correct} then 1 else 0 end)::int` })
    .from(attempts)
    .innerJoin(questions, eq(questions.id, attempts.questionId))
    .where(eq(attempts.userId, userId))
    .groupBy(questions.topic);
  const acc = new Map(perTopic.map((p) => [p.topic, p]));
  const ratingMap = new Map(sk.map((s) => [s.topic, s.rating]));
  const accuracy = await recentAccuracy(userId);
  const companies = [];
  for (const c of COMPANIES) {
    const bp = await blueprintFor(c.id);
    companies.push({ ...c, score: bp ? readiness(bp, topicsBySection, ratingMap, accuracy).score : 0 });
  }
  const history = await db.select().from(drills).where(eq(drills.userId, userId)).orderBy(desc(drills.date)).limit(14);
  const topics = TOPICS.filter((t) => ratingMap.has(t.id) || acc.has(t.id)).map((t) => {
    const a = acc.get(t.id);
    const rating = ratingMap.get(t.id) ?? 1200;
    return { id: t.id, name: t.name, section: t.section, mastery: Math.round(100 / (1 + Math.exp(-(rating - 1200) / 150))), band: sk.find((s) => s.topic === t.id)?.band ?? 2, attempts: a?.n ?? 0, accuracy: a && a.n ? Math.round((100 * a.correct) / a.n) : null };
  });
  return { topics: topics.sort((a, b) => a.mastery - b.mastery), companies, history };
}

/** Weekly XP for the student's batch. Names shown as first name + last initial only. */
export async function batchLeaderboard(batchId: string | null, collegeId: string | null) {
  if (!batchId || !collegeId) return [];
  const since = istMidnightUtc(weekStart(istDate()));
  const rows = await db.execute<{ id: string; name: string | null; xp: number; drills: number }>(sql`
    with a as (
      select ${attempts.userId} uid,
        sum(case when ${attempts.correct} then 10 + case when ${attempts.timeMs} < ${questions.timeSec} * 500 then 5 else 0 end else 0 end)::int xp
      from ${attempts} join ${questions} on ${questions.id} = ${attempts.questionId}
      where ${attempts.createdAt} >= ${since}
      group by 1
    ), d as (
      select ${drills.userId} uid, count(*)::int n from ${drills}
      where ${drills.completedAt} >= ${since} group by 1
    )
    select u.id, u.name, (coalesce(a.xp,0) + 20 * coalesce(d.n,0))::int xp, coalesce(d.n,0)::int drills
    from ${users} u left join a on a.uid = u.id left join d on d.uid = u.id
    where u.batch_id = ${batchId} and u.college_id = ${collegeId} and u.role = 'student'
    order by xp desc, u.name asc limit 50`);
  return rows.map((r, i) => ({ rank: i + 1, id: r.id, name: shortName(r.name), xp: r.xp, drills: r.drills }));
}

export function shortName(name: string | null) {
  if (!name) return "Student";
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : first;
}
