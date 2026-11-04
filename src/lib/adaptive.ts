/** Adaptive engine — pure functions only (docs/adaptive.md). No DB, no LLM. */
import { addDays } from "./time";
import { shuffle, weightedPick, type Rng } from "./rng";

export const START_RATING = 1200;
export const K = 24;
export const BAND_RATING: Record<number, number> = { 1: 900, 2: 1050, 3: 1200, 4: 1350, 5: 1500 };
export const clampBand = (b: number) => Math.min(5, Math.max(1, Math.round(b)));

export function expectedScore(userRating: number, questionRating: number) {
  return 1 / (1 + 10 ** ((questionRating - userRating) / 400));
}
/** Outcome: correct within time = 1, correct but slower than time_sec = 0.75, wrong = 0. */
export function outcome(correct: boolean, timeMs: number, timeSec: number) {
  if (!correct) return 0;
  return timeMs > timeSec * 1000 ? 0.75 : 1;
}
export function updateRating(userRating: number, questionBand: number, correct: boolean, timeMs: number, timeSec: number) {
  const e = expectedScore(userRating, BAND_RATING[clampBand(questionBand)]);
  return userRating + K * (outcome(correct, timeMs, timeSec) - e);
}

export type SkillState = { rating: number; band: number; streakRight: number; streakWrong: number; bandChangedOn: string | null };
export const NEW_SKILL: SkillState = { rating: START_RATING, band: 2, streakRight: 0, streakWrong: 0, bandChangedOn: null };

/** Apply one graded attempt to a user×topic skill. Max one band change per topic per IST day. */
export function applyAttempt(s: SkillState, a: { correct: boolean; timeMs: number; timeSec: number; difficulty: number }, today: string): SkillState {
  const rating = updateRating(s.rating, a.difficulty, a.correct, a.timeMs, a.timeSec);
  let streakRight = a.correct ? s.streakRight + 1 : 0;
  let streakWrong = a.correct ? 0 : s.streakWrong + 1;
  let band = s.band;
  let bandChangedOn = s.bandChangedOn;
  const canMove = bandChangedOn !== today;
  if (canMove && streakRight >= 3 && band < 5) {
    band += 1;
    bandChangedOn = today;
    streakRight = 0;
  } else if (canMove && streakWrong >= 2 && band > 1) {
    band -= 1;
    bandChangedOn = today;
    streakWrong = 0;
  }
  return { rating, band, streakRight, streakWrong, bandChangedOn };
}

/** Spaced review: stages 1/3/7 days. Correct → next stage (after 3 → done), wrong → stage 1. */
export const REVIEW_GAPS = [1, 3, 7] as const;
export function nextReview(stage: number | null, correct: boolean, today: string): { stage: number; dueOn: string } | null {
  if (stage === null) return correct ? null : { stage: 1, dueOn: addDays(today, REVIEW_GAPS[0]) };
  if (!correct) return { stage: 1, dueOn: addDays(today, REVIEW_GAPS[0]) };
  if (stage >= REVIEW_GAPS.length) return null;
  return { stage: stage + 1, dueOn: addDays(today, REVIEW_GAPS[stage]) };
}

export type Candidate = { id: string; topic: string; difficulty: number };
export type ComposeInput = {
  candidates: Candidate[]; // already filtered: college access, golden, not seen in last 14 days
  fallback?: Candidate[]; // used only if candidates run out (e.g. seen earlier, oldest first)
  reviewDue: string[]; // question ids due ≤ today, oldest first
  bandFor: (topic: string) => number; // student's band per topic (default 2)
  topicWeight: (topic: string) => number; // company weight × weakness
  rng: Rng;
  size?: number;
};
export type Slot = "band" | "stretch" | "review" | "fill";

/** 6 at band, 2 at band+1, 2 spaced review; review shortfall filled from band. Never repeats a question. */
export function composeDrill(input: ComposeInput): { ids: string[]; slots: Slot[] } {
  const size = input.size ?? 10;
  const nReview = Math.min(2, input.reviewDue.length);
  const nStretch = 2;
  const nBand = size - nStretch - 2;
  const used = new Set<string>();
  const ids: string[] = [];
  const slots: Slot[] = [];

  const topics = [...new Set(input.candidates.map((c) => c.topic))];
  const pick = (wantStretch: boolean, pool: Candidate[]): Candidate | undefined => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const topic = weightedPick(topics, input.topicWeight, input.rng);
      if (!topic) break;
      const target = clampBand(input.bandFor(topic) + (wantStretch ? 1 : 0));
      const inTopic = pool.filter((c) => c.topic === topic && !used.has(c.id));
      if (!inTopic.length) continue;
      const exact = inTopic.filter((c) => c.difficulty === target);
      if (exact.length) return exact[Math.floor(input.rng() * exact.length)];
      const nearest = Math.min(...inTopic.map((c) => Math.abs(c.difficulty - target)));
      const near = inTopic.filter((c) => Math.abs(c.difficulty - target) === nearest);
      return near[Math.floor(input.rng() * near.length)];
    }
    const rest = pool.filter((c) => !used.has(c.id));
    return rest.length ? rest[Math.floor(input.rng() * rest.length)] : undefined;
  };
  const take = (c: Candidate | undefined, slot: Slot) => {
    if (!c || used.has(c.id)) return false;
    used.add(c.id);
    ids.push(c.id);
    slots.push(slot);
    return true;
  };

  for (let i = 0; i < nBand; i++) take(pick(false, input.candidates), "band");
  for (let i = 0; i < nStretch; i++) take(pick(true, input.candidates), "stretch");
  for (const r of input.reviewDue) {
    if (slots.filter((s) => s === "review").length >= nReview) break;
    if (!used.has(r)) {
      used.add(r);
      ids.push(r);
      slots.push("review");
    }
  }
  const pools = [input.candidates, input.fallback ?? []];
  for (const pool of pools) {
    while (ids.length < size && pool.some((c) => !used.has(c.id))) take(pick(false, pool), "fill");
  }
  // Shuffle so review/stretch items are spread through the drill.
  const order = shuffle(ids.map((_, i) => i), input.rng);
  return { ids: order.map((i) => ids[i]), slots: order.map((i) => slots[i]) };
}

/** Random permutation of [0,1,2,3] — option display order for one student. */
export function optionOrder(rng: Rng): number[] {
  return shuffle([0, 1, 2, 3], rng);
}
/** Map a displayed index back to the canonical option index. */
export function canonicalIndex(order: number[], displayed: number) {
  return order[displayed];
}

export const mastery = (rating: number) => 1 / (1 + Math.exp(-(rating - START_RATING) / 150));

export type Blueprint = { company: string; sectionWeights: Record<string, number>; topicWeights?: Record<string, number> | null };
/** Readiness 0–100 = Σ section_weight × section mastery × accuracy-time factor. Untouched topics count as 0.2. */
export function readiness(bp: Blueprint, topicsBySection: Record<string, string[]>, ratings: Map<string, number>, recentAccuracy: number | null) {
  const breakdown: Record<string, number> = {};
  let total = 0;
  for (const [section, w] of Object.entries(bp.sectionWeights)) {
    const topics = topicsBySection[section] ?? [];
    let num = 0;
    let den = 0;
    for (const t of topics) {
      const tw = bp.topicWeights?.[t] ?? 1;
      const r = ratings.get(t);
      const m = r === undefined ? 0.2 : mastery(r);
      breakdown[t] = Math.round(m * 100);
      num += tw * m;
      den += tw;
    }
    total += w * (den ? num / den : 0);
  }
  const factor = recentAccuracy === null ? 0.75 : Math.min(1, Math.max(0.5, 0.5 + 0.5 * recentAccuracy));
  return { score: Math.round(100 * total * factor), breakdown };
}

/** Topic weight for drill composition: company emphasis × weakness (lower mastery → picked more). */
export function topicPickWeight(topic: string, section: string, bp: Blueprint | null, rating: number | undefined) {
  const sw = bp?.sectionWeights[section] ?? 0.25;
  const tw = bp?.topicWeights?.[topic] ?? 1;
  const weakness = 1.5 - mastery(rating ?? START_RATING); // 0.5..1.5
  return sw * tw * weakness;
}
