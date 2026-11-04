/** v3 TPO coach view: interview-ready funnel per company, cohort weak topics, focus-pack assignments. College-scoped. */
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attemptInsights, batches, drills, events, focusAssignmentStudents, focusAssignments, mockAttempts, profileReviews, skills, streaks, targetCompanies, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { companyName } from "@/lib/companies";
import { topicById, topicName } from "@/lib/question-schema";
import { branchOf } from "@/lib/skills-map";
import { displayStreak, NEW_STREAK } from "@/lib/streak";
import { istDate } from "@/lib/time";
import { MIN_TOPIC_ATTEMPTS } from "@/lib/insights/rules";
import { collegeOf } from "./tpo";
import { getProfile, listProfiles, readinessFor, sectionWeightsFor, type Signals } from "./companies";
import type { SessionUser } from "@/lib/authz";

type Staff = Pick<SessionUser, "id" | "role" | "collegeId">;

/** All students' readiness signals for one college in a fixed number of queries (no N+1). */
export async function bulkSignals(collegeId: string) {
  const studs = await db.select({ id: users.id, name: users.name, branch: users.branch, batchBranch: batches.branch, batchId: users.batchId, target: users.targetCompany, batchTarget: batches.targetCompany }).from(users).leftJoin(batches, eq(batches.id, users.batchId)).where(and(eq(users.collegeId, collegeId), eq(users.role, "student")));
  const ids = studs.map((s) => s.id);
  const out = new Map<string, Signals & { name: string | null; batchId: string | null; targets: string[] }>();
  if (!ids.length) return out;
  const [sk, cnt, d14, m30, st, hr, rev, tg] = await Promise.all([
    db.select({ u: skills.userId, t: skills.topic, r: skills.rating }).from(skills).where(inArray(skills.userId, ids)),
    db.execute<{ u: string; t: string; n: number }>(sql`select a.user_id u, q.topic t, count(*)::int n from attempts a join questions q on q.id = a.question_id where a.user_id in ${ids} group by 1, 2`),
    db.select({ u: drills.userId, n: sql<number>`count(distinct ${drills.date})::int` }).from(drills).where(and(inArray(drills.userId, ids), isNotNull(drills.completedAt), gte(drills.date, istDate(new Date(Date.now() - 13 * 86_400_000))))).groupBy(drills.userId),
    db.select({ u: mockAttempts.userId, n: sql<number>`count(*)::int` }).from(mockAttempts).where(and(inArray(mockAttempts.userId, ids), isNotNull(mockAttempts.endedAt), gte(mockAttempts.endedAt, new Date(Date.now() - 30 * 86_400_000)))).groupBy(mockAttempts.userId),
    db.select().from(streaks).where(inArray(streaks.userId, ids)),
    db.select({ u: events.userId, n: sql<number>`count(distinct ${events.props}->>'id')::int` }).from(events).where(and(inArray(events.userId, ids), eq(events.name, "hr_practiced"))).groupBy(events.userId),
    db.select({ u: profileReviews.userId, kind: profileReviews.kind, score: profileReviews.score, at: profileReviews.createdAt }).from(profileReviews).where(inArray(profileReviews.userId, ids)).orderBy(desc(profileReviews.createdAt)),
    db.select().from(targetCompanies).where(inArray(targetCompanies.userId, ids)),
  ]);
  const today = istDate();
  const group = <T,>(rows: T[], key: (r: T) => string | null) => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const k = key(r);
      if (k) (m.get(k) ?? m.set(k, []).get(k)!).push(r);
    }
    return m;
  };
  const skBy = group(sk, (x) => x.u), cntBy = group([...cnt], (x) => x.u), revBy = group(rev, (x) => x.u), tgBy = group(tg, (x) => x.userId);
  const d14By = new Map(d14.map((x) => [x.u, x.n])), m30By = new Map(m30.map((x) => [x.u, x.n])), hrBy = new Map(hr.map((x) => [x.u, x.n])), stBy = new Map(st.map((x) => [x.userId, x]));
  for (const s of studs) {
    const mine = revBy.get(s.id) ?? [];
    const r = mine.find((x) => x.kind === "resume")?.score, l = mine.find((x) => x.kind === "linkedin")?.score;
    const t = (tgBy.get(s.id) ?? []).filter((x) => !x.company.startsWith("dream:")).map((x) => x.company);
    out.set(s.id, {
      name: s.name,
      batchId: s.batchId,
      targets: t.length ? t : [s.target ?? s.batchTarget ?? "tcs_nqt"],
      branch: branchOf(s.branch ?? s.batchBranch),
      ratings: new Map((skBy.get(s.id) ?? []).map((x) => [x.t, x.r])),
      attemptsByTopic: new Map((cntBy.get(s.id) ?? []).map((x) => [x.t, x.n])),
      consistency: { drillsLast14: d14By.get(s.id) ?? 0, streak: displayStreak(stBy.get(s.id) ?? NEW_STREAK, today), mocksLast30: m30By.get(s.id) ?? 0, hrPracticed: hrBy.get(s.id) ?? 0 },
      profileScore: r === undefined && l === undefined ? null : Math.round(((r ?? 0) + (l ?? 0)) / 2),
    });
  }
  return out;
}

export type FunnelRow = { company: string; name: string; targeting: number; aptitude: number; tech: number; profile: number; ready: number; avgReadiness: number };

/** Per company: students targeting it → at aptitude bar → tech ≥ 60 → profile ≥ 80 → interview-ready. */
export async function readinessFunnel(staff: Staff, opts: { collegeId?: string } = {}) {
  const cid = collegeOf(staff, opts.collegeId);
  const signals = await bulkSignals(cid);
  const rows: FunnelRow[] = [];
  let readyAny = 0;
  const readyStudents = new Set<string>();
  for (const prof of await listProfiles()) {
    const p = (await getProfile(prof.key))!;
    const sw = await sectionWeightsFor(p.key);
    const row: FunnelRow = { company: p.key, name: p.name, targeting: 0, aptitude: 0, tech: 0, profile: 0, ready: 0, avgReadiness: 0 };
    let sum = 0;
    for (const [uid, s] of signals) {
      if (!s.targets.includes(p.key)) continue;
      const r = await readinessFor(p, s, sw);
      row.targeting++;
      sum += r.score;
      if (r.aptitude.score >= 80) {
        row.aptitude++;
        if (r.tech.score >= 60) {
          row.tech++;
          if (r.profile.score >= 80) row.profile++;
        }
      }
      if (r.interviewReady) {
        row.ready++;
        readyStudents.add(uid);
      }
    }
    row.avgReadiness = row.targeting ? Math.round(sum / row.targeting) : 0;
    if (row.targeting) rows.push(row);
  }
  readyAny = readyStudents.size;
  return { rows, students: signals.size, interviewReadyPct: signals.size ? Math.round((100 * readyAny) / signals.size) : 0 };
}

/** Cohort weak topics: students with ≥ 5 attempts in 30 days and < 50% accuracy, per topic. */
export async function cohortWeakTopics(staff: Staff, opts: { collegeId?: string; batchId?: string } = {}) {
  const cid = collegeOf(staff, opts.collegeId);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().replace("Z", "");
  const rows = await db.execute<{ topic: string; user_id: string; n: number; acc: number }>(sql`
    select q.topic, a.user_id, count(*)::int n, avg(case when a.correct then 1.0 else 0 end)::float acc
    from attempts a join questions q on q.id = a.question_id join users u on u.id = a.user_id
    where u.college_id = ${cid} and u.role = 'student' and a.created_at >= ${since}::timestamp ${opts.batchId ? sql`and u.batch_id = ${opts.batchId}` : sql``}
    group by 1, 2 having count(*) >= ${MIN_TOPIC_ATTEMPTS}`);
  const by = new Map<string, { students: string[]; measured: number; accSum: number }>();
  for (const r of rows) {
    const e = by.get(r.topic) ?? { students: [], measured: 0, accSum: 0 };
    e.measured++;
    e.accSum += r.acc;
    if (r.acc < 0.5) e.students.push(r.user_id);
    by.set(r.topic, e);
  }
  return [...by]
    .map(([topic, e]) => ({ topic, name: topicName(topic), section: topicById.get(topic)?.section ?? "", weakStudents: e.students, weakCount: e.students.length, measured: e.measured, avgAccuracy: Math.round((100 * e.accSum) / e.measured) }))
    .filter((t) => t.weakCount > 0)
    .sort((a, b) => b.weakCount - a.weakCount || a.avgAccuracy - b.avgAccuracy);
}

export const AssignInput = z.object({
  topics: z.array(z.string()).min(1).max(3),
  studentIds: z.array(z.string().uuid()).min(1).max(5000),
  questionsPerDay: z.coerce.number().int().min(3).max(20).default(5),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  note: z.string().trim().max(200).optional(),
});

/** "Assign drill pack to 42 students weak in Time & Work" — only students of the TPO's own college are accepted. */
export async function assignFocusPack(staff: Staff, raw: unknown, opts: { collegeId?: string; ip?: string } = {}) {
  const cid = collegeOf(staff, opts.collegeId);
  const v = AssignInput.parse(raw);
  const topics = v.topics.filter((t) => topicById.has(t));
  if (!topics.length) throw new Error("unknown topic");
  const own = await db.select({ id: users.id }).from(users).where(and(eq(users.collegeId, cid), eq(users.role, "student"), inArray(users.id, v.studentIds)));
  if (!own.length) throw new Error("no students from your college in this selection");
  const [a] = await db.insert(focusAssignments).values({ collegeId: cid, topics, questionsPerDay: v.questionsPerDay, dueOn: v.dueOn ?? null, note: v.note ?? null, createdBy: staff.id }).returning();
  await db.insert(focusAssignmentStudents).values(own.map((s) => ({ assignmentId: a.id, userId: s.id })));
  await audit(staff, "focus.assign", { type: "focus_assignment", id: a.id, collegeId: cid, meta: { topics, students: own.length, rejected: v.studentIds.length - own.length }, ip: opts.ip });
  return { assignment: a, assigned: own.length };
}

export async function assignmentsForCollege(staff: Staff, opts: { collegeId?: string } = {}) {
  const cid = collegeOf(staff, opts.collegeId);
  return db
    .select({ id: focusAssignments.id, topics: focusAssignments.topics, dueOn: focusAssignments.dueOn, createdAt: focusAssignments.createdAt, total: sql<number>`count(${focusAssignmentStudents.userId})::int`, done: sql<number>`count(${focusAssignmentStudents.completedAt})::int` })
    .from(focusAssignments)
    .leftJoin(focusAssignmentStudents, eq(focusAssignmentStudents.assignmentId, focusAssignments.id))
    .where(eq(focusAssignments.collegeId, cid))
    .groupBy(focusAssignments.id)
    .orderBy(desc(focusAssignments.createdAt))
    .limit(20);
}

/** Student side: open TPO assignments. */
export async function myAssignments(userId: string) {
  return db
    .select({ id: focusAssignments.id, topics: focusAssignments.topics, dueOn: focusAssignments.dueOn, note: focusAssignments.note, questionsPerDay: focusAssignments.questionsPerDay, completedAt: focusAssignmentStudents.completedAt })
    .from(focusAssignmentStudents)
    .innerJoin(focusAssignments, eq(focusAssignments.id, focusAssignmentStudents.assignmentId))
    .where(eq(focusAssignmentStudents.userId, userId))
    .orderBy(desc(focusAssignments.createdAt))
    .limit(5);
}

/** Called when a focus drill tied to an assignment completes. */
export async function completeAssignment(userId: string, assignmentId: string) {
  await db.update(focusAssignmentStudents).set({ completedAt: new Date() }).where(and(eq(focusAssignmentStudents.assignmentId, assignmentId), eq(focusAssignmentStudents.userId, userId)));
}

/** Drill-down additions for the TPO student page (insights + checklists; never unshared drafts). */
export async function coachDetail(staff: Staff, studentId: string, opts: { collegeId?: string } = {}) {
  const cid = collegeOf(staff, opts.collegeId);
  const [u] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, studentId), eq(users.collegeId, cid)));
  if (!u) return null;
  const insights = await db.select({ text: attemptInsights.text, createdAt: attemptInsights.createdAt }).from(attemptInsights).where(eq(attemptInsights.userId, u.id)).orderBy(desc(attemptInsights.createdAt)).limit(3);
  const signals = (await bulkSignals(cid)).get(u.id)!;
  const readiness = [];
  for (const t of signals.targets) {
    const p = await getProfile(t);
    if (p) readiness.push({ company: t, name: companyName(t), r: await readinessFor(p, signals) });
  }
  return { insights, readiness };
}
