import { describe, expect, it } from "vitest";
import { applyAttempt, BAND_RATING, canonicalIndex, composeDrill, expectedScore, mastery, NEW_SKILL, nextReview, optionOrder, outcome, readiness, topicPickWeight, updateRating, type Candidate } from "./adaptive";
import { mulberry32 } from "./rng";

const T = "2026-11-04";
const right = { correct: true, timeMs: 10_000, timeSec: 60, difficulty: 2 };
const wrong = { ...right, correct: false };

describe("Elo", () => {
  it("band ratings and expected score", () => {
    expect(BAND_RATING).toEqual({ 1: 900, 2: 1050, 3: 1200, 4: 1350, 5: 1500 });
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
    expect(expectedScore(1200, 1500)).toBeLessThan(0.2);
  });
  it("K=24; correct-but-slow counts 0.75", () => {
    expect(updateRating(1200, 3, true, 1000, 60)).toBeCloseTo(1212);
    expect(updateRating(1200, 3, false, 1000, 60)).toBeCloseTo(1188);
    expect(outcome(true, 61_000, 60)).toBe(0.75);
    expect(updateRating(1200, 3, true, 61_000, 60)).toBeCloseTo(1206);
  });
});

describe("band moves", () => {
  it("3 right in a row → +1 band", () => {
    let s = { ...NEW_SKILL };
    s = applyAttempt(s, right, T);
    s = applyAttempt(s, right, T);
    expect(s.band).toBe(2);
    s = applyAttempt(s, right, T);
    expect(s.band).toBe(3);
    expect(s.bandChangedOn).toBe(T);
  });
  it("2 wrong in a row → −1 band", () => {
    let s = { ...NEW_SKILL, band: 3 };
    s = applyAttempt(s, wrong, T);
    s = applyAttempt(s, wrong, T);
    expect(s.band).toBe(2);
  });
  it("max one band change per topic per day", () => {
    let s = { ...NEW_SKILL };
    for (let i = 0; i < 6; i++) s = applyAttempt(s, right, T);
    expect(s.band).toBe(3);
    s = applyAttempt(s, right, "2026-11-05");
    expect(s.band).toBe(4); // streak kept counting, moves on the new day
  });
  it("clamps 1–5", () => {
    let hi = { ...NEW_SKILL, band: 5 };
    for (let i = 0; i < 3; i++) hi = applyAttempt(hi, right, T);
    expect(hi.band).toBe(5);
    let lo = { ...NEW_SKILL, band: 1 };
    for (let i = 0; i < 2; i++) lo = applyAttempt(lo, wrong, T);
    expect(lo.band).toBe(1);
  });
  it("a wrong answer breaks the right-streak", () => {
    let s = { ...NEW_SKILL };
    s = applyAttempt(s, right, T);
    s = applyAttempt(s, right, T);
    s = applyAttempt(s, wrong, T);
    s = applyAttempt(s, right, T);
    expect(s.band).toBe(2);
    expect(s.streakRight).toBe(1);
  });
});

describe("spaced review 1/3/7", () => {
  it("wrong → stage 1 due tomorrow; correct advances 1→2 (+3d) →3 (+7d) → done", () => {
    expect(nextReview(null, false, T)).toEqual({ stage: 1, dueOn: "2026-11-05" });
    expect(nextReview(null, true, T)).toBeNull();
    expect(nextReview(1, true, T)).toEqual({ stage: 2, dueOn: "2026-11-07" });
    expect(nextReview(2, true, T)).toEqual({ stage: 3, dueOn: "2026-11-11" });
    expect(nextReview(3, true, T)).toBeNull();
    expect(nextReview(3, false, T)).toEqual({ stage: 1, dueOn: "2026-11-05" });
  });
});

function pool(): Candidate[] {
  const topics = ["percentages", "averages", "time_work", "number_series"];
  return Array.from({ length: 200 }, (_, i) => ({ id: `q${i}`, topic: topics[i % 4], difficulty: (Math.floor(i / 4) % 5) + 1 }));
}

describe("drill composition", () => {
  it("6 at band, 2 at band+1, 2 review, no duplicates", () => {
    const r = composeDrill({ candidates: pool(), reviewDue: ["r1", "r2", "r3"], bandFor: () => 2, topicWeight: () => 1, rng: mulberry32(1) });
    expect(r.ids).toHaveLength(10);
    expect(new Set(r.ids).size).toBe(10);
    const count = (s: string) => r.slots.filter((x) => x === s).length;
    expect([count("band"), count("stretch"), count("review")]).toEqual([6, 2, 2]);
    const byId = new Map(pool().map((c) => [c.id, c]));
    r.ids.forEach((id, i) => {
      if (r.slots[i] === "band") expect(byId.get(id)!.difficulty).toBe(2);
      if (r.slots[i] === "stretch") expect(byId.get(id)!.difficulty).toBe(3);
    });
  });
  it("review shortfall is filled from band", () => {
    const r = composeDrill({ candidates: pool(), reviewDue: [], bandFor: () => 3, topicWeight: () => 1, rng: mulberry32(2) });
    expect(r.ids).toHaveLength(10);
    expect(r.slots.filter((s) => s === "review")).toHaveLength(0);
    expect(r.slots.filter((s) => s === "fill")).toHaveLength(2);
  });
  it("band 5 stretch caps at 5", () => {
    const r = composeDrill({ candidates: pool(), reviewDue: [], bandFor: () => 5, topicWeight: () => 1, rng: mulberry32(3) });
    const byId = new Map(pool().map((c) => [c.id, c]));
    expect(r.ids.every((id) => byId.get(id)!.difficulty <= 5)).toBe(true);
  });
  it("only draws from the given candidates (college subset + not seen in 14 days are applied upstream)", () => {
    const allowed = pool().filter((_, i) => i % 3 === 0);
    const r = composeDrill({ candidates: allowed, reviewDue: [], bandFor: () => 2, topicWeight: () => 1, rng: mulberry32(4) });
    const ok = new Set(allowed.map((c) => c.id));
    expect(r.ids.every((id) => ok.has(id))).toBe(true);
  });
  it("falls back to previously seen questions only when fresh pool runs out", () => {
    const fresh = pool().slice(0, 4);
    const seen = pool().slice(4, 40);
    const r = composeDrill({ candidates: fresh, fallback: seen, reviewDue: [], bandFor: () => 2, topicWeight: () => 1, rng: mulberry32(5) });
    expect(r.ids).toHaveLength(10);
    expect(fresh.every((c) => r.ids.includes(c.id))).toBe(true);
  });
  it("weak topics + company emphasis are picked more often", () => {
    const bp = { company: "tcs_nqt", sectionWeights: { quant: 0.5, logical: 0.5 }, topicWeights: { percentages: 2 } };
    expect(topicPickWeight("percentages", "quant", bp, 1000)).toBeGreaterThan(topicPickWeight("averages", "quant", bp, 1000));
    expect(topicPickWeight("averages", "quant", bp, 900)).toBeGreaterThan(topicPickWeight("averages", "quant", bp, 1500));
  });
  it("is deterministic for the same seed", () => {
    const a = composeDrill({ candidates: pool(), reviewDue: [], bandFor: () => 2, topicWeight: () => 1, rng: mulberry32(9) });
    const b = composeDrill({ candidates: pool(), reviewDue: [], bandFor: () => 2, topicWeight: () => 1, rng: mulberry32(9) });
    expect(a.ids).toEqual(b.ids);
  });
});

describe("option shuffle + readiness", () => {
  it("option order is a permutation and maps back", () => {
    const o = optionOrder(mulberry32(7));
    expect([...o].sort()).toEqual([0, 1, 2, 3]);
    for (let d = 0; d < 4; d++) expect(o.indexOf(canonicalIndex(o, d))).toBe(d);
  });
  it("readiness 0–100, rises with mastery, untouched topics count low", () => {
    const bp = { company: "x", sectionWeights: { quant: 0.6, verbal: 0.4 } };
    const topics = { quant: ["a", "b"], verbal: ["c"] };
    const low = readiness(bp, topics, new Map(), null).score;
    const high = readiness(bp, topics, new Map([["a", 1600], ["b", 1600], ["c", 1600]]), 0.9).score;
    expect(low).toBeLessThan(20);
    expect(high).toBeGreaterThan(80);
    expect(high).toBeLessThanOrEqual(100);
    expect(mastery(1200)).toBeCloseTo(0.5);
  });
});
