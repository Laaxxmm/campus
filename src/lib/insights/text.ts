/** Deterministic text for insights (also the fallback when the LLM rephrasing fails). Calm, specific, no anxiety. */
import { z } from "zod";
import type { Fact, InsightFacts } from "./rules";

export type InsightText = { headline: string; whatsWrong: string[]; focus: { topic: string; line: string }[]; note: string | null };
export const InsightTextSchema = z.object({
  headline: z.string().min(3).max(140),
  whatsWrong: z.array(z.string().min(3).max(220)).max(3),
  focus: z.array(z.object({ topic: z.string(), line: z.string().min(3).max(160) })).max(3),
  note: z.string().max(220).nullable(),
});

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function factLine(f: Fact, name: (t: string) => string): string | null {
  switch (f.kind) {
    case "gap":
      return `${name(f.topic)} is your weakest area: ${pct(f.accuracy)} correct over your last ${f.attempts} questions${f.sessionWrong ? ` (${f.sessionWrong} missed today)` : ""}.`;
    case "time_leak":
      return `${name(f.topic)} is eating time: ${f.count} question${f.count > 1 ? "s" : ""} took over 1.5× the target (${f.extraSec}s extra).`;
    case "guessing":
      return `Guesses cost you ${f.marksLost} marks: ${f.wrong} wrong answers in ${f.topics.map(name).join(", ")}, where your accuracy is under 40%. Skipping is better there until it improves.`;
    case "second_guessing":
      return `You changed ${f.changedTotal} answer${f.changedTotal > 1 ? "s" : ""} and ${f.changedThenWrong} ended up wrong — trust your first working when it checks out.`;
    case "quadrant":
      return {
        fast_accurate: null,
        slow_accurate: `Accurate (${pct(f.accuracy)}) but slow — median ${f.medianTimeRatio}× the target time. Practise shortcuts on easy questions.`,
        fast_inaccurate: `Fast but only ${pct(f.accuracy)} accurate — slow down by a few seconds and check units/options.`,
        slow_inaccurate: `Both time (${f.medianTimeRatio}× target) and accuracy (${pct(f.accuracy)}) need work — go back to concepts before speed.`,
      }[f.quadrant];
    case "trend":
      return f.direction === "down" ? `Accuracy dipped to ${pct(f.current)} from about ${pct(f.previousAvg)} in your last 3 sessions.` : null;
    case "strength":
      return null;
  }
}

export function templateText(r: InsightFacts, name: (t: string) => string): InsightText {
  const lines = r.facts.map((f) => factLine(f, name)).filter((x): x is string => Boolean(x)).slice(0, 3);
  const trend = r.facts.find((f) => f.kind === "trend");
  const strength = r.facts.find((f) => f.kind === "strength");
  const headline =
    r.sessionAccuracy === null
      ? "No answers recorded yet."
      : trend?.kind === "trend" && trend.direction === "up"
        ? `Up to ${pct(trend.current)} from ${pct(trend.previousAvg)} — the rhythm is working.`
        : strength?.kind === "strength"
          ? `${name(strength.topic)} is a strength (${pct(strength.accuracy)}). Here's what to work on next.`
          : `${pct(r.sessionAccuracy)} correct this time. Here's what to work on next.`;
  return {
    headline,
    whatsWrong: lines,
    focus: r.focus.map((f) => ({ topic: f.topic, line: `${name(f.topic)} — ${f.dailyTarget} questions a day` })),
    note: r.notEnoughData.length ? `Not enough data yet on ${r.notEnoughData.slice(0, 3).map(name).join(", ")}${r.notEnoughData.length > 3 ? " and more" : ""} — keep practising and we'll say more.` : null,
  };
}
