import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attempts, batches, companyBlueprints, companyProfiles, conceptCards, drills, events, hrQuestions, mockAttempts, profileReviews, questions, skills, streaks, studentSkills, targetCompanies, users } from "@/db/schema";
import type { CompanyProfile, Branch } from "@/lib/content-schema";
import { SKILL_KEYS } from "@/lib/content-schema";
import { mastery } from "@/lib/adaptive";
import { readinessV3, AT_BAR_SCORE, INTERVIEW_READY, type Readiness } from "@/lib/readiness-v3";
import { APTITUDE_SECTIONS, TOPICS, topicName, topicById } from "@/lib/question-schema";
import { branchOf, MEASURED, RESOURCES, SELF_ACTIONS, statusFromMastery, type SkillStatus } from "@/lib/skills-map";
import { displayStreak, NEW_STREAK } from "@/lib/streak";
import { istDate } from "@/lib/time";
import { isCompany } from "@/lib/companies";
import { track } from "@/lib/events";
import { SKILL_NAMES } from "@/db/seed-v3";

export const MAX_TARGETS = 5;
type Who = { id: string; collegeId: string | null };

export async function listProfiles() {
  return db.select().from(companyProfiles).where(eq(companyProfiles.status, "golden")).orderBy(companyProfiles.name);
}
export async function getProfile(key: string) {
  const [p] = await db.select().from(companyProfiles).where(and(eq(companyProfiles.key, key), eq(companyProfiles.status, "golden")));
  if (!p) return null;
  return {
    key: p.key, name: p.name, version: p.version, updated_at: p.updatedAt, disclaimer: p.disclaimer,
    roles: p.roles, rounds: p.rounds, cutoffs: p.cutoffs, branch_expectations: p.branchExpectations, jd_skills: p.jdSkills, hr_focus: p.hrFocus, sources: p.sources,
  } as CompanyProfile;
}

export async function getTargets(userId: string) {
  const rows = await db.select().from(targetCompanies).where(eq(targetCompanies.userId, userId)).orderBy(targetCompanies.createdAt);
  if (rows.length) return rows;
  const [u] = await db.select({ t: users.targetCompany, bt: batches.targetCompany }).from(users).leftJoin(batches, eq(batches.id, users.batchId)).where(eq(users.id, userId));
  const fallback = u?.t ?? u?.bt;
  return fallback ? [{ userId, company: fallback, isDream: false, dreamName: null, createdAt: new Date() }] : [];
}

export const TargetsInput = z.object({
  companies: z.array(z.string()).max(MAX_TARGETS, `pick at most ${MAX_TARGETS} companies`),
  dream: z.string().trim().max(60).optional().transform((v) => v || null),
});

/** Up to 5 profiled companies + 1 optional dream (a profiled key or free text). */
export async function setTargets(user: Who, raw: unknown) {
  const v = TargetsInput.parse(raw);
  const keys = [...new Set(v.companies.filter(isCompany))];
  await db.transaction(async (tx) => {
    await tx.delete(targetCompanies).where(eq(targetCompanies.userId, user.id));
    if (keys.length) await tx.insert(targetCompanies).values(keys.map((company) => ({ userId: user.id, company, isDream: false })));
    if (v.dream) {
      const dreamKey: string = isCompany(v.dream) && !keys.includes(v.dream) ? v.dream : `dream:${v.dream.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
      if (!(keys as string[]).includes(dreamKey)) await tx.insert(targetCompanies).values({ userId: user.id, company: dreamKey, isDream: true, dreamName: v.dream });
    }
    if (keys[0]) await tx.update(users).set({ targetCompany: keys[0] }).where(eq(users.id, user.id));
  });
  return keys;
}

/** Everything readiness needs for one student, in a handful of queries. */
export async function studentSignals(userId: string) {
  const [u] = await db.select({ branch: users.branch, batchBranch: batches.branch }).from(users).leftJoin(batches, eq(batches.id, users.batchId)).where(eq(users.id, userId));
  const sk = await db.select({ topic: skills.topic, rating: skills.rating }).from(skills).where(eq(skills.userId, userId));
  const counts = await db.select({ topic: questions.topic, n: sql<number>`count(*)::int` }).from(attempts).innerJoin(questions, eq(questions.id, attempts.questionId)).where(eq(attempts.userId, userId)).groupBy(questions.topic);
  const since14 = istDate(new Date(Date.now() - 13 * 86_400_000));
  const [d14] = await db.select({ n: sql<number>`count(distinct ${drills.date})::int` }).from(drills).where(and(eq(drills.userId, userId), isNotNull(drills.completedAt), gte(drills.date, since14)));
  const [m30] = await db.select({ n: sql<number>`count(*)::int` }).from(mockAttempts).where(and(eq(mockAttempts.userId, userId), isNotNull(mockAttempts.endedAt), gte(mockAttempts.endedAt, new Date(Date.now() - 30 * 86_400_000))));
  const [st] = await db.select().from(streaks).where(eq(streaks.userId, userId));
  const [hr] = await db.select({ n: sql<number>`count(distinct ${events.props}->>'id')::int` }).from(events).where(and(eq(events.userId, userId), eq(events.name, "hr_practiced")));
  const reviews = await db.select({ kind: profileReviews.kind, score: profileReviews.score }).from(profileReviews).where(eq(profileReviews.userId, userId)).orderBy(desc(profileReviews.createdAt));
  const latest = (k: string) => reviews.find((r) => r.kind === k)?.score;
  const r = latest("resume"), l = latest("linkedin");
  const profileScore = r === undefined && l === undefined ? null : Math.round(((r ?? 0) + (l ?? 0)) / 2);
  return {
    branch: branchOf(u?.branch ?? u?.batchBranch),
    ratings: new Map(sk.map((s) => [s.topic, s.rating])),
    attemptsByTopic: new Map(counts.map((c) => [c.topic, c.n])),
    consistency: { drillsLast14: d14?.n ?? 0, streak: displayStreak(st ?? NEW_STREAK, istDate()), mocksLast30: m30?.n ?? 0, hrPracticed: hr?.n ?? 0 },
    profileScore,
  };
}
export type Signals = Awaited<ReturnType<typeof studentSignals>>;

const aptTopicsBySection = Object.fromEntries(APTITUDE_SECTIONS.map((s) => [s, TOPICS.filter((t) => t.section === s).map((t) => t.id)]));

export function techTopicsFor(p: CompanyProfile, branch: Branch) {
  const be = p.branch_expectations[branch] ?? p.branch_expectations.all;
  const valid = (be?.tech_topics ?? []).filter((t) => topicById.get(t)?.section === "tech");
  return valid.length ? valid : ["dbms", "oop_concepts", "dsa_basics"];
}

export async function readinessFor(p: CompanyProfile, s: Signals): Promise<Readiness> {
  const [bp] = await db.select().from(companyBlueprints).where(eq(companyBlueprints.company, p.key));
  const sw = (bp?.sectionWeights as Record<string, number>) ?? { quant: 0.35, logical: 0.3, verbal: 0.25, coding: 0.1 };
  return readinessV3({
    company: p.key,
    sectionWeights: sw,
    topicsBySection: aptTopicsBySection,
    ratings: s.ratings,
    cutoffPercent: p.cutoffs.aptitude_percent,
    techTopics: techTopicsFor(p, s.branch),
    topicName,
    consistency: s.consistency,
    profileScore: s.profileScore,
  });
}

export type RoundGap = { key: string; name: string; kind: string; status: "on_track" | "close" | "gap"; line: string };
/** Gap to bar per round, in plain words. */
export function roundGaps(p: CompanyProfile, r: Readiness, s: Signals): RoundGap[] {
  const mk = (score: number, bar: number) => (score >= bar ? "on_track" : score >= bar * 0.8 ? "close" : "gap") as RoundGap["status"];
  const codingPct = Math.round((["pseudocode_output", "arrays_strings", "data_structures", "dsa_basics"].reduce((a, t) => a + (s.ratings.has(t) ? mastery(s.ratings.get(t)!) : 0.2), 0) / 4) * 100);
  const verbalPct = Math.round((aptTopicsBySection.verbal.reduce((a, t) => a + (s.ratings.has(t) ? mastery(s.ratings.get(t)!) : 0.2), 0) / aptTopicsBySection.verbal.length) * 100);
  return p.rounds.map((round) => {
    switch (round.kind) {
      case "aptitude":
        return { key: round.key, name: round.name, kind: round.kind, status: mk(r.aptitude.score, AT_BAR_SCORE), line: `Aptitude ${r.aptitude.score}/100 vs bar ${AT_BAR_SCORE} (${r.bar.assumed ? "assumed" : "approx."} cutoff ${r.bar.value}%)` };
      case "coding":
        return { key: round.key, name: round.name, kind: round.kind, status: mk(codingPct, 60), line: `Coding & DSA mastery ${codingPct} vs 60 target` };
      case "technical":
        return { key: round.key, name: round.name, kind: round.kind, status: mk(r.tech.score, INTERVIEW_READY.tech), line: `Tech concepts ${r.tech.score} vs ${INTERVIEW_READY.tech} target` };
      case "hr":
        return { key: round.key, name: round.name, kind: round.kind, status: s.consistency.hrPracticed >= 5 ? "on_track" : s.consistency.hrPracticed >= 2 ? "close" : "gap", line: `${s.consistency.hrPracticed}/5 HR questions practised` };
      default:
        return { key: round.key, name: round.name, kind: round.kind, status: mk(verbalPct, 60), line: `Verbal/communication mastery ${verbalPct} vs 60` };
    }
  });
}

export type ChecklistItem = { key: string; name: string; level: "required" | "nice_to_have"; status: SkillStatus; source: "auto" | "self"; note: string; action: { label: string; href?: string; focusTopics?: string[] }; resource?: { label: string; url: string } };

/** Missing-skills checklist vs the company's JD patterns. Measured skills come from practice; others are self-declared. */
export async function skillsChecklist(userId: string, p: CompanyProfile, s: Signals): Promise<ChecklistItem[]> {
  const self = new Map((await db.select().from(studentSkills).where(eq(studentSkills.userId, userId))).map((x) => [x.skillKey, x]));
  return p.jd_skills.map((j) => {
    const m = MEASURED[j.skill_key];
    const base = { key: j.skill_key, name: SKILL_NAMES[j.skill_key] ?? j.skill_key, level: j.level, resource: RESOURCES[j.skill_key] };
    if (m) {
      const topics = m.topics ?? TOPICS.filter((t) => t.section === m.section).map((t) => t.id);
      const seen = topics.filter((t) => s.ratings.has(t));
      const n = topics.reduce((a, t) => a + (s.attemptsByTopic.get(t) ?? 0), 0);
      const pct = seen.length ? Math.round((seen.reduce((a, t) => a + mastery(s.ratings.get(t)!), 0) / seen.length) * 100) : null;
      const { status, note } = statusFromMastery(pct, n);
      const drillTopics = topics.filter((t) => topicById.has(t)).slice(0, 3);
      return { ...base, status, source: "auto" as const, note, action: { label: status === "have" ? "Keep it warm: 1 focus drill a week" : `Start a 10-question ${base.name} drill`, focusTopics: drillTopics, href: topicById.get(drillTopics[0])?.section === "tech" ? `/learn/${drillTopics[0]}` : undefined } };
    }
    const d = self.get(j.skill_key);
    return { ...base, status: (d?.status ?? "missing") as SkillStatus, source: "self" as const, note: d?.evidence ? `you said: ${d.evidence}` : "tell us where you stand", action: { label: SELF_ACTIONS[j.skill_key] ?? "Add evidence (a project, course or certificate) to your resume" } };
  });
}

export const SelfSkillInput = z.object({ skill: z.enum(SKILL_KEYS), status: z.enum(["have", "weak", "missing"]), evidence: z.string().trim().max(200).optional().transform((v) => v || null) });
export async function setSelfSkill(user: Who, raw: unknown) {
  const v = SelfSkillInput.parse(raw);
  if (MEASURED[v.skill]) throw new Error("This skill is measured from your practice, not self-declared");
  await db.insert(studentSkills).values({ userId: user.id, skillKey: v.skill, status: v.status, source: "self", evidence: v.evidence }).onConflictDoUpdate({ target: [studentSkills.userId, studentSkills.skillKey], set: { status: v.status, evidence: v.evidence, updatedAt: new Date() } });
}

export async function hrCardsFor(companyKey: string) {
  const all = await db.select().from(hrQuestions);
  return [...all.filter((q) => q.companies.includes(companyKey)), ...all.filter((q) => !q.companies.length)];
}
export async function markHrPracticed(user: Who, hrId: string) {
  const [q] = await db.select({ id: hrQuestions.id }).from(hrQuestions).where(eq(hrQuestions.id, hrId));
  if (q) await track("hr_practiced", { userId: user.id, collegeId: user.collegeId, props: { id: q.id } });
}
export async function conceptCardsFor(topics: string[]) {
  return topics.length ? db.select().from(conceptCards).where(and(inArray(conceptCards.topic, topics), eq(conceptCards.status, "golden"))).orderBy(conceptCards.id) : [];
}
