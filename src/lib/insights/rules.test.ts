import { describe, expect, it } from "vitest";
import { analyse, guessing, pickFocus, quadrant, secondGuessing, timeLeaks, topicGaps, trend, type SessionAttempt, type TopicHistory } from "./rules";
import { templateText, InsightTextSchema } from "./text";

const A = (topic: string, o: Partial<SessionAttempt> = {}): SessionAttempt => ({ questionId: `${topic}-${Math.random()}`, topic, section: "quant", difficulty: 3, timeMs: 30_000, timeSec: 60, chosen: 0, correct: true, answerChanges: 0, marked: false, ...o });
const H = (topic: string, attempts: number, correct: number, avgTimeRatio = 1): TopicHistory => ({ topic, attempts, correct, avgTimeRatio });
const name = (t: string) => ({ time_work: "Time & work", percentages: "Percentages", averages: "Averages", probability: "Probability" })[t] ?? t;

describe("insight rules (fixtures)", () => {
  it("gap: needs ≥ 5 attempts and < 50%", () => {
    const g = topicGaps([A("time_work", { correct: false })], [H("time_work", 8, 2), H("percentages", 4, 0), H("averages", 10, 6)]);
    expect(g).toEqual([{ kind: "gap", topic: "time_work", accuracy: 0.25, attempts: 8, sessionWrong: 1 }]);
  });
  it("time leak: > 1.5× target, grouped, only for known topics", () => {
    const s = [A("time_work", { timeMs: 100_000 }), A("time_work", { timeMs: 95_000 }), A("averages", { timeMs: 80_000 }), A("percentages", { timeMs: 200_000 })];
    const t = timeLeaks(s, [H("time_work", 6, 3), H("averages", 6, 3)]);
    expect(t.map((x) => x.kind === "time_leak" && [x.topic, x.count])).toEqual([["time_work", 2]]); // 80s = 1.33× not a leak; percentages unknown
    expect(t[0]).toMatchObject({ extraSec: 75, worstRatio: 1.67 });
  });
  it("guessing: only with negative marking, ≥ 2 wrong on < 40% topics", () => {
    const s = [A("probability", { correct: false, chosen: 1 }), A("probability", { correct: false, chosen: 2 }), A("averages", { correct: false })];
    const h = [H("probability", 10, 2), H("averages", 10, 7)];
    expect(guessing(s, h, 0)).toEqual([]);
    expect(guessing(s, h, 0.25)).toEqual([{ kind: "guessing", topics: ["probability"], wrong: 2, marksLost: 0.5 }]);
  });
  it("second guessing: ≥ 2 changed-then-wrong", () => {
    expect(secondGuessing([A("x", { answerChanges: 1, correct: false }), A("x", { answerChanges: 2, correct: false }), A("x", { answerChanges: 1 })])).toEqual([{ kind: "second_guessing", changedThenWrong: 2, changedTotal: 3 }]);
    expect(secondGuessing([A("x", { answerChanges: 1, correct: false })])).toEqual([]);
  });
  it("quadrant: accuracy vs median time ratio", () => {
    const slowAccurate = Array.from({ length: 6 }, () => A("x", { timeMs: 90_000 }));
    expect(quadrant(slowAccurate)[0]).toMatchObject({ quadrant: "slow_accurate", medianTimeRatio: 1.5 });
    const fastWrong = Array.from({ length: 6 }, (_, i) => A("x", { timeMs: 20_000, correct: i < 2 }));
    expect(quadrant(fastWrong)[0]).toMatchObject({ quadrant: "fast_inaccurate" });
    expect(quadrant([A("x")])).toEqual([]); // not enough answers
  });
  it("trend vs last 3 sessions", () => {
    expect(trend(0.8, [0.5, 0.6, 0.55])[0]).toMatchObject({ direction: "up" });
    expect(trend(0.4, [0.6, 0.6, 0.6])[0]).toMatchObject({ direction: "down" });
    expect(trend(0.6, [0.55, 0.6, 0.65])[0]).toMatchObject({ direction: "flat" });
    expect(trend(0.6, [0.5, 0.5])).toEqual([]);
  });
  it("focus: ≤ 3 topics, gaps first with company weight, then leaks", () => {
    const f = pickFocus(
      [
        { kind: "gap", topic: "averages", accuracy: 0.45, attempts: 9, sessionWrong: 0 },
        { kind: "gap", topic: "time_work", accuracy: 0.3, attempts: 9, sessionWrong: 2 },
        { kind: "time_leak", topic: "percentages", count: 2, extraSec: 40, worstRatio: 2 },
        { kind: "time_leak", topic: "probability", count: 1, extraSec: 10, worstRatio: 1.6 },
      ],
      (t) => (t === "averages" ? 2 : 1),
    );
    expect(f).toEqual([
      { topic: "averages", dailyTarget: 4, reason: "gap" },
      { topic: "time_work", dailyTarget: 5, reason: "gap" },
      { topic: "percentages", dailyTarget: 3, reason: "time_leak" },
    ]);
  });
  it("not-enough-data path: new student gets no claims, only a note", () => {
    const r = analyse([A("time_work", { correct: false }), A("percentages")], [H("time_work", 1, 0), H("percentages", 1, 1)], { kind: "drill", negativeMark: 0, previousAccuracies: [] });
    expect(r.facts.filter((f) => f.kind === "gap" || f.kind === "time_leak")).toEqual([]);
    expect(r.notEnoughData.sort()).toEqual(["percentages", "time_work"]);
    const t = templateText(r, name);
    expect(t.whatsWrong).toEqual([]);
    expect(t.note).toMatch(/Not enough data yet on/);
    expect(InsightTextSchema.parse(t)).toBeTruthy();
  });
  it("full session → ≤ 3 bullets, schema-valid template text", () => {
    const s = [...Array.from({ length: 4 }, () => A("time_work", { correct: false, timeMs: 120_000 })), ...Array.from({ length: 4 }, () => A("averages"))];
    const r = analyse(s, [H("time_work", 12, 3), H("averages", 12, 11)], { kind: "mock", negativeMark: 0.25, previousAccuracies: [0.7, 0.7, 0.7] });
    const t = templateText(r, name);
    expect(t.whatsWrong.length).toBeLessThanOrEqual(3);
    expect(t.whatsWrong[0]).toMatch(/^Time & work is your weakest area: 25% correct/);
    expect(t.focus[0]).toEqual({ topic: "time_work", line: "Time & work — 5 questions a day" });
    expect(InsightTextSchema.safeParse(t).success).toBe(true);
  });
});
