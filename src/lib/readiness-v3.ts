/**
 * v3 readiness — deterministic and explainable (docs/PRODUCT.md):
 *   readiness(company) = 0.40·aptitude_vs_cutoff + 0.30·tech_concepts + 0.15·consistency + 0.15·profile
 * Each component is 0–100 and carries a "why" list for the UI. No LLM, no hidden state.
 */
import { mastery } from "./adaptive";

export const READINESS_WEIGHTS = { aptitude: 0.4, tech: 0.3, consistency: 0.15, profile: 0.15 } as const;
export const DEFAULT_APTITUDE_BAR = 65; // used when a company publishes no cutoff (labelled "assumed" in the UI)
export const AT_BAR_SCORE = 80; // aptitude component value when the student exactly meets the bar
export const UNTOUCHED_MASTERY = 0.2;
export const INTERVIEW_READY = { aptitude: AT_BAR_SCORE, tech: 60, profile: 80 } as const;

export type Component = { score: number; why: string[] };
export type Readiness = { company: string; score: number; aptitude: Component; tech: Component; consistency: Component; profile: Component; interviewReady: boolean; bar: { value: number; assumed: boolean } };

export type ReadinessInput = {
  company: string;
  sectionWeights: Record<string, number>; // aptitude sections only (quant/logical/verbal/coding)
  topicsBySection: Record<string, string[]>;
  ratings: Map<string, number>; // topic → Elo rating (only topics with attempts)
  cutoffPercent: number | null;
  techTopics: string[]; // expected for the student's branch
  topicName: (t: string) => string;
  consistency: { drillsLast14: number; streak: number; mocksLast30: number; hrPracticed: number };
  profileScore: number | null; // 0–100 from resume + LinkedIn checklists; null = not started
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const m = (ratings: Map<string, number>, t: string) => (ratings.has(t) ? mastery(ratings.get(t)!) : UNTOUCHED_MASTERY);

export function aptitudeComponent(i: ReadinessInput): Component & { mastery: number; bar: { value: number; assumed: boolean } } {
  const total = Object.values(i.sectionWeights).reduce((s, w) => s + w, 0) || 1;
  let acc = 0;
  const perSection: { section: string; pct: number }[] = [];
  for (const [section, w] of Object.entries(i.sectionWeights)) {
    const topics = i.topicsBySection[section] ?? [];
    const pct = topics.length ? topics.reduce((s, t) => s + m(i.ratings, t), 0) / topics.length : UNTOUCHED_MASTERY;
    perSection.push({ section, pct: Math.round(pct * 100) });
    acc += (w / total) * pct;
  }
  const masteryPct = Math.round(acc * 100);
  const bar = { value: i.cutoffPercent ?? DEFAULT_APTITUDE_BAR, assumed: i.cutoffPercent === null };
  const score = clamp((masteryPct / bar.value) * AT_BAR_SCORE);
  const weakest = [...perSection].sort((a, b) => a.pct - b.pct)[0];
  return {
    score,
    mastery: masteryPct,
    bar,
    why: [
      `Aptitude mastery ${masteryPct} vs ${bar.assumed ? "an assumed" : "an approximate"} bar of ${bar.value}`,
      ...(weakest ? [`Weakest section: ${weakest.section} (${weakest.pct})`] : []),
    ],
  };
}

export function techComponent(i: ReadinessInput): Component {
  if (!i.techTopics.length) return { score: 0, why: ["No technical topics listed for your branch"] };
  const per = i.techTopics.map((t) => ({ t, pct: Math.round(m(i.ratings, t) * 100), seen: i.ratings.has(t) }));
  const score = clamp(per.reduce((s, x) => s + x.pct, 0) / per.length);
  const notStarted = per.filter((x) => !x.seen).map((x) => i.topicName(x.t));
  const weak = per.filter((x) => x.seen).sort((a, b) => a.pct - b.pct).slice(0, 2).map((x) => `${i.topicName(x.t)} (${x.pct})`);
  return { score, why: [...(weak.length ? [`Weakest: ${weak.join(", ")}`] : []), ...(notStarted.length ? [`Not started: ${notStarted.slice(0, 4).join(", ")}${notStarted.length > 4 ? "…" : ""}`] : [])] };
}

export function consistencyComponent(c: ReadinessInput["consistency"]): Component {
  const drills = Math.min(c.drillsLast14, 14) / 14;
  const streak = Math.min(c.streak, 10) / 10;
  const mocks = Math.min(c.mocksLast30, 3) / 3;
  return { score: clamp(50 * drills + 30 * streak + 20 * mocks), why: [`${c.drillsLast14}/14 drill days`, `${c.streak}-day streak`, `${c.mocksLast30} mock${c.mocksLast30 === 1 ? "" : "s"} in 30 days`] };
}

export function profileComponent(score: number | null): Component {
  return score === null ? { score: 0, why: ["Resume and LinkedIn checklists not started"] } : { score: clamp(score), why: [`Resume + LinkedIn checklist ${clamp(score)}% complete`] };
}

export function readinessV3(i: ReadinessInput, w = READINESS_WEIGHTS): Readiness {
  const apt = aptitudeComponent(i);
  const tech = techComponent(i);
  const cons = consistencyComponent(i.consistency);
  const prof = profileComponent(i.profileScore);
  const score = clamp(w.aptitude * apt.score + w.tech * tech.score + w.consistency * cons.score + w.profile * prof.score);
  const interviewReady = apt.score >= INTERVIEW_READY.aptitude && tech.score >= INTERVIEW_READY.tech && prof.score >= INTERVIEW_READY.profile && (i.consistency.mocksLast30 >= 1 || i.consistency.hrPracticed >= 5);
  return { company: i.company, score, aptitude: { score: apt.score, why: apt.why }, tech, consistency: cons, profile: prof, interviewReady, bar: apt.bar };
}
