/**
 * Insight engine v1 — pure, deterministic rules over attempt events (docs/PRODUCT.md pillar 2).
 * Facts are computed here; an LLM may only rephrase them (src/server/services/insights.ts).
 */

export const MIN_TOPIC_ATTEMPTS = 5; // never claim anything about a topic with fewer attempts
export const TIME_LEAK_RATIO = 1.5; // a question taking > 1.5× its target time is a time leak
export const LOW_CONFIDENCE_ACCURACY = 0.4;

/** One answered/skipped question in the session being analysed. */
export type SessionAttempt = {
  questionId: string;
  topic: string;
  section: string;
  difficulty: number;
  timeMs: number;
  timeSec: number; // target time
  chosen: number | null; // null = skipped
  correct: boolean;
  answerChanges: number;
  marked: boolean;
};

/** Rolling history per topic (last 30 days, including this session). */
export type TopicHistory = { topic: string; attempts: number; correct: number; avgTimeRatio: number };

export type SessionContext = {
  kind: "drill" | "mock";
  negativeMark: number; // 0 for drills
  previousAccuracies: number[]; // accuracy 0..1 of the last sessions of the same kind, most recent first
  topicWeight?: (topic: string) => number; // target-company emphasis (default 1)
};

export type Fact =
  | { kind: "gap"; topic: string; accuracy: number; attempts: number; sessionWrong: number }
  | { kind: "time_leak"; topic: string; count: number; extraSec: number; worstRatio: number }
  | { kind: "guessing"; topics: string[]; wrong: number; marksLost: number }
  | { kind: "second_guessing"; changedThenWrong: number; changedTotal: number }
  | { kind: "quadrant"; quadrant: "fast_accurate" | "slow_accurate" | "fast_inaccurate" | "slow_inaccurate"; accuracy: number; medianTimeRatio: number }
  | { kind: "trend"; direction: "up" | "down" | "flat"; current: number; previousAvg: number }
  | { kind: "strength"; topic: string; accuracy: number; attempts: number };

export type FocusItem = { topic: string; dailyTarget: number; reason: "gap" | "time_leak" | "guessing" | "company_weight" };
export type InsightFacts = { facts: Fact[]; focus: FocusItem[]; notEnoughData: string[]; sessionAccuracy: number | null; answered: number };

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const groupBy = <T,>(xs: T[], k: (x: T) => string) => xs.reduce<Record<string, T[]>>((acc, x) => ((acc[k(x)] ??= []).push(x), acc), {});

/** Topics with ≥ MIN attempts and accuracy < 50%, weakest first. */
export function topicGaps(session: SessionAttempt[], history: TopicHistory[]): Fact[] {
  const wrongBy = groupBy(session.filter((a) => a.chosen !== null && !a.correct), (a) => a.topic);
  return history
    .filter((h) => h.attempts >= MIN_TOPIC_ATTEMPTS && h.correct / h.attempts < 0.5)
    .map((h) => ({ kind: "gap" as const, topic: h.topic, accuracy: round2(h.correct / h.attempts), attempts: h.attempts, sessionWrong: wrongBy[h.topic]?.length ?? 0 }))
    .sort((a, b) => a.accuracy - b.accuracy || b.sessionWrong - a.sessionWrong);
}

/** Questions taking > 1.5× target time, grouped by topic. Only topics with enough history are named. */
export function timeLeaks(session: SessionAttempt[], history: TopicHistory[]): Fact[] {
  const enough = new Set(history.filter((h) => h.attempts >= MIN_TOPIC_ATTEMPTS).map((h) => h.topic));
  const slow = session.filter((a) => a.timeSec > 0 && a.timeMs > TIME_LEAK_RATIO * a.timeSec * 1000);
  return Object.entries(groupBy(slow, (a) => a.topic))
    .filter(([topic]) => enough.has(topic))
    .map(([topic, xs]) => ({
      kind: "time_leak" as const,
      topic,
      count: xs.length,
      extraSec: Math.round(xs.reduce((s, a) => s + (a.timeMs / 1000 - a.timeSec), 0)),
      worstRatio: round2(Math.max(...xs.map((a) => a.timeMs / (a.timeSec * 1000)))),
    }))
    .sort((a, b) => b.extraSec - a.extraSec);
}

/** Negative-marking mocks: wrong answers on low-confidence topics (historical accuracy < 40%) look like guesses. */
export function guessing(session: SessionAttempt[], history: TopicHistory[], negativeMark: number): Fact[] {
  if (negativeMark <= 0) return [];
  const low = new Set(history.filter((h) => h.attempts >= MIN_TOPIC_ATTEMPTS && h.correct / h.attempts < LOW_CONFIDENCE_ACCURACY).map((h) => h.topic));
  const wrong = session.filter((a) => a.chosen !== null && !a.correct && low.has(a.topic));
  if (wrong.length < 2) return [];
  return [{ kind: "guessing", topics: [...new Set(wrong.map((a) => a.topic))], wrong: wrong.length, marksLost: round2(wrong.length * negativeMark) }];
}

/** Changed the answer and still got it wrong, at least twice in the session. */
export function secondGuessing(session: SessionAttempt[]): Fact[] {
  const changed = session.filter((a) => a.answerChanges > 0 && a.chosen !== null);
  const bad = changed.filter((a) => !a.correct);
  return bad.length >= 2 ? [{ kind: "second_guessing", changedThenWrong: bad.length, changedTotal: changed.length }] : [];
}

/** Accuracy vs speed quadrant for the session (needs ≥ 5 answered). */
export function quadrant(session: SessionAttempt[]): Fact[] {
  const answered = session.filter((a) => a.chosen !== null);
  if (answered.length < MIN_TOPIC_ATTEMPTS) return [];
  const acc = answered.filter((a) => a.correct).length / answered.length;
  const ratio = median(answered.map((a) => a.timeMs / (a.timeSec * 1000)));
  const fast = ratio <= 1;
  const accurate = acc >= 0.6;
  const q = fast && accurate ? "fast_accurate" : !fast && accurate ? "slow_accurate" : fast ? "fast_inaccurate" : "slow_inaccurate";
  return [{ kind: "quadrant", quadrant: q, accuracy: round2(acc), medianTimeRatio: round2(ratio) }];
}

/** Trend vs the average of the last 3 sessions of the same kind (needs 3). ±0.1 = flat. */
export function trend(currentAccuracy: number | null, previous: number[]): Fact[] {
  if (currentAccuracy === null || previous.length < 3) return [];
  const prev = previous.slice(0, 3).reduce((s, x) => s + x, 0) / 3;
  const d = currentAccuracy - prev;
  return [{ kind: "trend", direction: d > 0.1 ? "up" : d < -0.1 ? "down" : "flat", current: round2(currentAccuracy), previousAvg: round2(prev) }];
}

export function strengths(history: TopicHistory[]): Fact[] {
  return history
    .filter((h) => h.attempts >= MIN_TOPIC_ATTEMPTS && h.correct / h.attempts >= 0.8)
    .map((h) => ({ kind: "strength" as const, topic: h.topic, accuracy: round2(h.correct / h.attempts), attempts: h.attempts }))
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 2);
}

/** Focus this week: up to 3 topics. Gaps first (5 Q/day), then time leaks (3 Q/day), then guessing topics. */
export function pickFocus(facts: Fact[], weight: (t: string) => number = () => 1): FocusItem[] {
  const out: FocusItem[] = [];
  const add = (topic: string, dailyTarget: number, reason: FocusItem["reason"]) => {
    if (out.length < 3 && !out.some((f) => f.topic === topic)) out.push({ topic, dailyTarget, reason });
  };
  const gaps = facts.filter((f): f is Extract<Fact, { kind: "gap" }> => f.kind === "gap").sort((a, b) => a.accuracy / weight(a.topic) - b.accuracy / weight(b.topic));
  for (const g of gaps) add(g.topic, g.accuracy < 0.35 ? 5 : 4, "gap");
  for (const t of facts.filter((f): f is Extract<Fact, { kind: "time_leak" }> => f.kind === "time_leak")) add(t.topic, 3, "time_leak");
  for (const g of facts.filter((f): f is Extract<Fact, { kind: "guessing" }> => f.kind === "guessing")) for (const t of g.topics) add(t, 3, "guessing");
  return out;
}

export function analyse(session: SessionAttempt[], history: TopicHistory[], ctx: SessionContext): InsightFacts {
  const answered = session.filter((a) => a.chosen !== null);
  const acc = answered.length ? answered.filter((a) => a.correct).length / answered.length : null;
  const facts: Fact[] = [
    ...topicGaps(session, history),
    ...timeLeaks(session, history),
    ...guessing(session, history, ctx.negativeMark),
    ...secondGuessing(session),
    ...quadrant(session),
    ...trend(acc, ctx.previousAccuracies),
    ...strengths(history),
  ];
  const known = new Set(history.filter((h) => h.attempts >= MIN_TOPIC_ATTEMPTS).map((h) => h.topic));
  const notEnoughData = [...new Set(session.map((a) => a.topic))].filter((t) => !known.has(t));
  return { facts, focus: pickFocus(facts, ctx.topicWeight), notEnoughData, sessionAccuracy: acc === null ? null : round2(acc), answered: answered.length };
}
