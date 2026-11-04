import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { weeklyReports } from "@/db/schema";
import { aiEnabled, anthropic, MODELS, textOf } from "@/lib/llm";
import { istDate, isoWeek } from "@/lib/time";
import { topicName } from "@/lib/question-schema";
import { overview, readinessTrend } from "./tpo";
import type { SessionUser } from "@/lib/authz";

type Staff = Pick<SessionUser, "id" | "role" | "collegeId">;

export type ReportStats = {
  week: string;
  students: number;
  weeklyActivePct: number;
  drillsThisWeek: number;
  medianStreak: number;
  avgReadiness: number | null;
  readinessTrend: { week: string; avg: number }[];
  strongestTopics: { topic: string; mastery: number }[];
  weakestTopics: { topic: string; mastery: number }[];
  atRisk: number;
  mocksTaken: number;
  avgMockPct: number | null;
};

/** Aggregates only — no names, emails, roll numbers. Safe to send to an LLM. */
export async function reportStats(staff: Staff, collegeId: string, now = new Date()): Promise<ReportStats> {
  const week = isoWeek(istDate(now));
  const o = await overview(staff, { collegeId });
  const trend = await readinessTrend(collegeId, 6);
  const topics = await db.execute<{ topic: string; m: number }>(sql`
    select sk.topic, round(avg(100.0 / (1 + exp(-(sk.rating - 1200) / 150.0))))::int m
    from skills sk join users u on u.id = sk.user_id where u.college_id = ${collegeId} and u.role = 'student'
    group by 1 having count(*) >= 3 order by 2 desc`);
  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString().replace("Z", "");
  const [mk] = await db.execute<{ n: number; pct: number | null }>(sql`
    select count(*)::int n, round(avg(100.0 * greatest(ma.marks, 0) / nullif(cardinality(ma.question_ids), 0)))::int pct
    from mock_attempts ma join users u on u.id = ma.user_id where u.college_id = ${collegeId} and ma.ended_at >= ${since}::timestamp`);
  return {
    week,
    students: o.total,
    weeklyActivePct: o.weeklyActivePct,
    drillsThisWeek: o.drillsThisWeek,
    medianStreak: o.medianStreak,
    avgReadiness: o.avgReadiness,
    readinessTrend: trend.map((t) => ({ week: t.week, avg: t.avg })),
    strongestTopics: topics.slice(0, 3).map((t) => ({ topic: topicName(t.topic), mastery: t.m })),
    weakestTopics: topics.slice(-3).reverse().map((t) => ({ topic: topicName(t.topic), mastery: t.m })),
    atRisk: o.atRisk,
    mocksTaken: mk?.n ?? 0,
    avgMockPct: mk?.pct ?? null,
  };
}

export function templatedNarrative(s: ReportStats) {
  const prev = s.readinessTrend.at(-2)?.avg;
  const cur = s.readinessTrend.at(-1)?.avg ?? s.avgReadiness;
  const delta = prev !== undefined && cur !== null && cur !== undefined ? cur - prev : null;
  const lines = [
    `This week ${s.weeklyActivePct}% of your ${s.students} students practised, completing ${s.drillsThisWeek} daily drills; the median streak is ${s.medianStreak} days${s.weeklyActivePct >= 60 ? " — above the 60% pilot goal" : ", below the 60% pilot goal"}.`,
    cur !== null && cur !== undefined ? `Average readiness for each student's target company is ${cur}${delta !== null ? ` (${delta >= 0 ? "+" : ""}${delta} vs last week)` : ""}.` : "Readiness will appear after the first weekly snapshot.",
    s.strongestTopics.length ? `Strongest topics: ${s.strongestTopics.map((t) => `${t.topic} (${t.mastery})`).join(", ")}. Needs work: ${s.weakestTopics.map((t) => `${t.topic} (${t.mastery})`).join(", ")}.` : "",
    s.mocksTaken ? `${s.mocksTaken} mock tests were taken, averaging ${s.avgMockPct ?? 0}%.` : "No mock tests were taken this week — consider scheduling one for a batch.",
    s.atRisk ? `${s.atRisk} students need a nudge; the At-risk page has ready-to-send WhatsApp messages.` : "No students are currently at risk.",
  ];
  return lines.filter(Boolean).join(" ");
}

const SYSTEM = `You write a short weekly placement-readiness summary for a college Training & Placement Officer in India.
Input is aggregated JSON only (no student names). Write 4–6 plain sentences: what happened, what improved or slipped, the two weakest topics to focus class time on, and one concrete action for next week.
Calm, encouraging, specific numbers. No markdown, no bullet points, no greetings, no invented data.`;

/** Cached per (college, ISO week). Uses Sonnet when ANTHROPIC_API_KEY is set; otherwise a deterministic template. */
export async function weeklyReport(staff: Staff, collegeId: string, opts: { refresh?: boolean; now?: Date } = {}) {
  const stats = await reportStats(staff, collegeId, opts.now);
  if (!opts.refresh) {
    const [cached] = await db.select().from(weeklyReports).where(and(eq(weeklyReports.collegeId, collegeId), eq(weeklyReports.week, stats.week)));
    if (cached) return { stats, narrative: cached.narrative, model: cached.model, cachedAt: cached.createdAt };
  }
  let narrative = templatedNarrative(stats);
  let model = "template";
  if (aiEnabled()) {
    try {
      const msg = await anthropic().messages.create({
        model: MODELS.smart(),
        max_tokens: 1500,
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: JSON.stringify(stats) }],
      });
      const text = msg.stop_reason === "refusal" ? "" : textOf(msg).trim();
      if (text) {
        narrative = text.slice(0, 2000);
        model = MODELS.smart();
      }
    } catch (e) {
      console.error(JSON.stringify({ level: "warn", msg: "weekly narrative LLM failed, using template", err: String(e) }));
    }
  }
  await db
    .insert(weeklyReports)
    .values({ collegeId, week: stats.week, stats, narrative, model })
    .onConflictDoUpdate({ target: [weeklyReports.collegeId, weeklyReports.week], set: { stats, narrative, model, createdAt: new Date() } });
  return { stats, narrative, model, cachedAt: new Date() };
}
