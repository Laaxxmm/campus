/**
 * TPO / college-admin read models. Every query is college-scoped via scoped(user) — never trust ids from the URL.
 * Aggregates run in SQL (no N+1). superadmin may pass an explicit collegeId.
 */
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { batches, colleges, companyBlueprints, drills, mockAttempts, mocks, readinessSnapshots, skills, users } from "@/db/schema";
import { requireRole, scoped, type SessionUser } from "@/lib/authz";
import { companyName, COMPANY_IDS } from "@/lib/companies";
import { TOPICS, topicName } from "@/lib/question-schema";
import { istDate, istMidnightUtc, weekStart } from "@/lib/time";
import { shortName } from "./student";

type Staff = Pick<SessionUser, "id" | "role" | "collegeId">;
export const AT_RISK_DAYS = 5;
export const AT_RISK_READINESS = 40;

/** Resolve the college a staff user is acting on (superadmin may choose). Throws for collegeless staff. */
export function collegeOf(staff: Staff, requested?: string | null) {
  requireRole(staff, ["tpo", "admin"]);
  if (staff.role === "superadmin") {
    if (!requested) throw new Error("superadmin must choose a college");
    return requested;
  }
  if (!staff.collegeId) throw new Error("staff user has no college");
  return staff.collegeId;
}

/** Raw-SQL timestamps arrive as Date (postgres-js parser, process TZ = UTC) or string. */
const toDate = (v: unknown): Date | null => (v == null ? null : v instanceof Date ? v : new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(String(v)) ? String(v) : `${String(v).replace(" ", "T")}Z`));
const ts = (d: Date) => d.toISOString().replace("Z", ""); // `timestamp` columns hold UTC wall-clock

export async function collegeInfo(collegeId: string) {
  const [c] = await db.select().from(colleges).where(eq(colleges.id, collegeId));
  return c ?? null;
}

/** One row per student with everything the dashboard needs. */
export async function studentRows(staff: Staff, opts: { collegeId?: string; batchId?: string } = {}) {
  const collegeId = collegeOf(staff, opts.collegeId);
  const today = istDate();
  const yesterday = istMidnightUtc(today).getTime() - 86_400_000;
  const since7 = ts(new Date(Date.now() - 7 * 86_400_000));
  const since30 = ts(new Date(Date.now() - 30 * 86_400_000));
  const rows = await db.execute<{
    id: string; name: string | null; email: string; roll_no: string | null; batch_id: string | null; batch: string | null;
    target: string; xp: number; last_active_at: Date | string | null; streak: number; drills7: number; att30: number; cor30: number; readiness: number | null; mock_avg: number | null;
  }>(sql`
    with s as (
      select u.id, u.name, u.email, u.roll_no, u.batch_id, b.name batch, coalesce(u.target_company, b.target_company, 'tcs_nqt') target, u.xp, u.last_active_at
      from users u left join batches b on b.id = u.batch_id
      where u.college_id = ${collegeId} and u.role = 'student' ${opts.batchId ? sql`and u.batch_id = ${opts.batchId}` : sql``}
    ),
    st as (
      select user_id, case when last_active_date >= ${new Date(yesterday).toISOString().slice(0, 10)}::date then current else 0 end streak
      from streaks where user_id in (select id from s)
    ),
    d7 as (select user_id, count(*)::int n from drills where completed_at >= ${since7}::timestamp and user_id in (select id from s) group by 1),
    a30 as (
      select user_id, count(*)::int n, sum(case when correct then 1 else 0 end)::int c
      from attempts where created_at >= ${since30}::timestamp and user_id in (select id from s) group by 1
    ),
    rs as (
      select distinct on (r.user_id) r.user_id, r.score from readiness_snapshots r join s on s.id = r.user_id and r.company = s.target
      order by r.user_id, r.week desc
    ),
    mk as (select user_id, avg(marks / nullif(correct_count + wrong_count, 0))::float avg from mock_attempts where ended_at is not null and user_id in (select id from s) group by 1)
    select s.*, coalesce(st.streak, 0)::int streak, coalesce(d7.n, 0)::int drills7, coalesce(a30.n, 0)::int att30, coalesce(a30.c, 0)::int cor30, rs.score readiness, mk.avg mock_avg
    from s left join st on st.user_id = s.id left join d7 on d7.user_id = s.id left join a30 on a30.user_id = s.id left join rs on rs.user_id = s.id left join mk on mk.user_id = s.id
    order by s.batch nulls last, s.name`);
  const now = Date.now();
  return rows.map((r) => {
    const last = toDate(r.last_active_at);
    const inactiveDays = last ? Math.floor((now - last.getTime()) / 86_400_000) : null;
    const readiness = r.readiness ?? null;
    const atRiskReasons: string[] = [];
    if (inactiveDays === null || inactiveDays >= AT_RISK_DAYS) atRiskReasons.push(inactiveDays === null ? "never practised" : `inactive ${inactiveDays} days`);
    if (readiness !== null && readiness < AT_RISK_READINESS) atRiskReasons.push(`readiness ${readiness}`);
    return {
      id: r.id,
      name: r.name ?? r.email,
      email: r.email,
      rollNo: r.roll_no,
      batchId: r.batch_id,
      batch: r.batch,
      target: r.target,
      xp: r.xp,
      lastActiveAt: last ? last.toISOString() : null,
      inactiveDays,
      streak: r.streak,
      drills7: r.drills7,
      accuracy30: r.att30 ? Math.round((100 * r.cor30) / r.att30) : null,
      readiness,
      atRisk: atRiskReasons.length > 0,
      atRiskReasons,
    };
  });
}
export type StudentRow = Awaited<ReturnType<typeof studentRows>>[number];

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round(((a[m - 1] + a[m]) / 2) * 10) / 10;
};

export async function overview(staff: Staff, opts: { collegeId?: string } = {}) {
  const collegeId = collegeOf(staff, opts.collegeId);
  const rows = await studentRows(staff, { collegeId });
  const total = rows.length;
  const active = rows.filter((r) => r.inactiveDays !== null && r.inactiveDays < 7).length;
  const withReadiness = rows.filter((r) => r.readiness !== null);
  const since = ts(istMidnightUtc(weekStart(istDate())));
  const [d] = await db.execute<{ n: number }>(sql`select count(*)::int n from drills d join users u on u.id = d.user_id where u.college_id = ${collegeId} and d.completed_at >= ${since}::timestamp`);
  return {
    total,
    weeklyActivePct: total ? Math.round((100 * active) / total) : 0,
    medianStreak: median(rows.map((r) => r.streak)),
    avgReadiness: withReadiness.length ? Math.round(withReadiness.reduce((s, r) => s + (r.readiness ?? 0), 0) / withReadiness.length) : null,
    atRisk: rows.filter((r) => r.atRisk).length,
    drillsThisWeek: d?.n ?? 0,
    rows,
  };
}

/** Heatmap: rows = batches (or students of one batch), cols = topics; value = mean mastery 0–100. */
export type HeatMetric = "accuracy" | "mastery";
/** metric "accuracy" (default) = % correct in the last 30 days — moves fast, shows where a batch is weak today.
 *  metric "mastery" = mean Elo mastery — slower, longer-term signal (D20). */
/** Distinct batch branches in the staff member's college (for the heatmap filter bar). */
export async function branchList(staff: Staff, opts: { collegeId?: string } = {}) {
  const collegeId = collegeOf(staff, opts.collegeId);
  const rows = await db
    .selectDistinct({ branch: batches.branch })
    .from(batches)
    .where(and(eq(batches.collegeId, collegeId), sql`${batches.branch} is not null and ${batches.branch} <> ''`))
    .orderBy(asc(batches.branch));
  return rows.map((r) => r.branch as string);
}

export const HEAT_WINDOWS = [7, 30, 90] as const;

export async function heatmap(staff: Staff, opts: { collegeId?: string; company?: string; batchId?: string; metric?: HeatMetric; branch?: string; days?: number } = {}) {
  const metric: HeatMetric = opts.metric === "mastery" ? "mastery" : "accuracy";
  const collegeId = collegeOf(staff, opts.collegeId);
  const days = (HEAT_WINDOWS as readonly number[]).includes(Number(opts.days)) ? Number(opts.days) : 30;
  // Only accept a branch that exists in this college; anything else is ignored (never widens scope).
  const branch = opts.branch && (await branchList(staff, { collegeId })).includes(opts.branch) ? opts.branch : null;
  const company = opts.company && (COMPANY_IDS as string[]).includes(opts.company) ? opts.company : null;
  const [bp] = company ? await db.select().from(companyBlueprints).where(eq(companyBlueprints.company, company)) : [];
  const sw = (bp?.sectionWeights ?? null) as Record<string, number> | null;
  const tw = (bp?.topicWeights ?? {}) as Record<string, number>;
  const topics = TOPICS.filter((t) => !sw || (sw[t.section] ?? 0) > 0)
    .map((t) => ({ id: t.id, name: t.name, section: t.section, weight: (sw?.[t.section] ?? 0.25) * (tw[t.id] ?? 1) }))
    .sort((a, b) => (company ? b.weight - a.weight : 0) || a.section.localeCompare(b.section));

  const byStudent = Boolean(opts.batchId);
  const rowKey = byStudent ? sql`u.id` : sql`b.id`;
  const scope = sql`u.college_id = ${collegeId} and u.role = 'student' ${byStudent ? sql`and u.batch_id = ${opts.batchId}` : sql``} ${branch ? sql`and b.branch = ${branch}` : sql``}`;
  const since = ts(new Date(Date.now() - days * 86_400_000));
  const cells =
    metric === "mastery"
      ? await db.execute<{ row_id: string; topic: string; mastery: number; n: number }>(sql`
          select ${rowKey} row_id, sk.topic, round(avg(100.0 / (1 + exp(-(sk.rating - 1200) / 150.0))))::int mastery, count(*)::int n
          from skills sk join users u on u.id = sk.user_id join batches b on b.id = u.batch_id
          where ${scope} group by 1, 2`)
      : await db.execute<{ row_id: string; topic: string; mastery: number; n: number }>(sql`
          select ${rowKey} row_id, q.topic, round(100.0 * avg(case when a.correct then 1 else 0 end))::int mastery, count(distinct a.user_id)::int n
          from attempts a join questions q on q.id = a.question_id join users u on u.id = a.user_id join batches b on b.id = u.batch_id
          where ${scope} and a.created_at >= ${since}::timestamp group by 1, 2 having count(*) >= 3`);
  const rowsMeta = byStudent
    ? (await db.select({ id: users.id, name: users.name }).from(users).where(and(eq(users.collegeId, collegeId), eq(users.batchId, opts.batchId!), eq(users.role, "student"))).orderBy(asc(users.name))).map((r) => ({ id: r.id, name: shortName(r.name) }))
    : (await db.select({ id: batches.id, name: batches.name }).from(batches).where(and(eq(batches.collegeId, collegeId), branch ? eq(batches.branch, branch) : undefined)).orderBy(asc(batches.name)));
  const grid = rowsMeta.map((r) => ({
    id: r.id,
    name: r.name,
    cells: topics.map((t) => {
      const c = cells.find((x) => x.row_id === r.id && x.topic === t.id);
      return c ? { mastery: c.mastery, n: c.n } : null;
    }),
  }));
  return { company, companyName: company ? companyName(company) : null, topics, rows: grid, byStudent, metric, branch, days };
}

/** Student drill-down, college-scoped. Null → caller 404s (also for other colleges' ids). */
export async function studentDetail(staff: Staff, studentId: string, opts: { collegeId?: string } = {}) {
  const collegeId = collegeOf(staff, opts.collegeId);
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) return null;
  const scope = scoped({ role: staff.role === "superadmin" ? "tpo" : staff.role, collegeId });
  const [u] = await db
    .select({ id: users.id, name: users.name, email: users.email, rollNo: users.rollNo, xp: users.xp, lastActiveAt: users.lastActiveAt, consentAt: users.consentAt, targetCompany: users.targetCompany, batch: batches.name, batchTarget: batches.targetCompany })
    .from(users)
    .leftJoin(batches, eq(batches.id, users.batchId))
    .where(scope.where(users.collegeId, and(eq(users.id, studentId), eq(users.role, "student"))))
    .limit(1);
  if (!u) return null;
  const sk = await db.select().from(skills).where(eq(skills.userId, u.id));
  const snaps = await db.select().from(readinessSnapshots).where(eq(readinessSnapshots.userId, u.id)).orderBy(desc(readinessSnapshots.week)).limit(60);
  const recent = await db.select().from(drills).where(eq(drills.userId, u.id)).orderBy(desc(drills.date)).limit(14);
  const mk = await db
    .select({ id: mockAttempts.id, title: mocks.title, marks: mockAttempts.marks, endedAt: mockAttempts.endedAt, tabSwitches: mockAttempts.tabSwitches, correct: mockAttempts.correctCount, wrong: mockAttempts.wrongCount, n: sql<number>`cardinality(${mockAttempts.questionIds})` })
    .from(mockAttempts)
    .innerJoin(mocks, eq(mocks.id, mockAttempts.mockId))
    .where(eq(mockAttempts.userId, u.id))
    .orderBy(desc(mockAttempts.startedAt))
    .limit(10);
  const latestWeek = snaps[0]?.week;
  return {
    ...u,
    target: u.targetCompany ?? u.batchTarget ?? "tcs_nqt",
    topics: sk.map((s) => ({ topic: s.topic, name: topicName(s.topic), band: s.band, mastery: Math.round(100 / (1 + Math.exp(-(s.rating - 1200) / 150))) })).sort((a, b) => a.mastery - b.mastery),
    readinessNow: snaps.filter((s) => s.week === latestWeek).map((s) => ({ company: s.company, name: companyName(s.company), score: s.score })),
    readinessTrend: snaps.filter((s) => s.company === (u.targetCompany ?? u.batchTarget ?? "tcs_nqt")).map((s) => ({ week: s.week, score: s.score })).reverse(),
    drills: recent,
    mocks: mk,
  };
}

/** Prefilled WhatsApp nudge (copied by the TPO; nothing is sent automatically). */
export function nudgeText(r: Pick<StudentRow, "name" | "target" | "inactiveDays" | "readiness">, appUrl: string, driveDate?: string | null) {
  const first = r.name.split(/\s+/)[0];
  const why = r.inactiveDays === null ? "you haven't started your LearnCrew practice yet" : r.inactiveDays >= AT_RISK_DAYS ? `it's been ${r.inactiveDays} days since your last LearnCrew drill` : `your ${companyName(r.target)} readiness is ${r.readiness}/100`;
  const drive = driveDate ? ` Your ${companyName(r.target)} drive is on ${new Date(driveDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.` : "";
  return `Hi ${first}, ${why}.${drive} Today's drill is 10 questions, about 10 minutes — keep the rhythm going: ${appUrl}/today`;
}

export async function batchList(staff: Staff, opts: { collegeId?: string } = {}) {
  const collegeId = collegeOf(staff, opts.collegeId);
  return db
    .select({ id: batches.id, name: batches.name, gradYear: batches.gradYear, branch: batches.branch, targetCompany: batches.targetCompany, targetDriveDate: batches.targetDriveDate, students: sql<number>`(select count(*)::int from users u where u.batch_id = ${batches.id} and u.role = 'student')` })
    .from(batches)
    .where(eq(batches.collegeId, collegeId))
    .orderBy(asc(batches.name));
}

/** Readiness trend per ISO week for the college (avg of each student's target-company snapshot). */
export async function readinessTrend(collegeId: string, weeks = 6) {
  const rows = await db.execute<{ week: string; avg: number; n: number }>(sql`
    select r.week, round(avg(r.score))::int avg, count(*)::int n
    from readiness_snapshots r join users u on u.id = r.user_id left join batches b on b.id = u.batch_id
    where u.college_id = ${collegeId} and r.company = coalesce(u.target_company, b.target_company, 'tcs_nqt')
    group by r.week order by r.week desc limit ${weeks}`);
  return rows.reverse();
}
