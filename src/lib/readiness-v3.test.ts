import { describe, expect, it } from "vitest";
import { aptitudeComponent, consistencyComponent, profileComponent, READINESS_WEIGHTS, readinessV3, techComponent, type ReadinessInput } from "./readiness-v3";

const base = (o: Partial<ReadinessInput> = {}): ReadinessInput => ({
  company: "tcs_nqt",
  sectionWeights: { quant: 0.5, verbal: 0.5 },
  topicsBySection: { quant: ["percentages", "averages"], verbal: ["fill_blanks"] },
  ratings: new Map(),
  cutoffPercent: 60,
  techTopics: ["dbms", "sql"],
  topicName: (t) => t,
  consistency: { drillsLast14: 0, streak: 0, mocksLast30: 0, hrPracticed: 0 },
  profileScore: null,
  ...o,
});

describe("readiness v3", () => {
  it("weights are 40/30/15/15 and sum to 1", () => {
    expect(READINESS_WEIGHTS).toEqual({ aptitude: 0.4, tech: 0.3, consistency: 0.15, profile: 0.15 });
    expect(Object.values(READINESS_WEIGHTS).reduce((s, x) => s + x, 0)).toBeCloseTo(1);
  });
  it("aptitude: meeting the bar scores 80; untouched topics count 20%; assumed bar when unpublished", () => {
    const r = new Map([["percentages", 1200], ["averages", 1200], ["fill_blanks", 1200]]); // mastery 0.5 each
    expect(aptitudeComponent(base({ ratings: r, cutoffPercent: 50 })).score).toBe(80);
    expect(aptitudeComponent(base({ ratings: r, cutoffPercent: 100 })).score).toBe(40);
    const fresh = aptitudeComponent(base({ cutoffPercent: null }));
    expect(fresh).toMatchObject({ mastery: 20, bar: { value: 65, assumed: true } });
    expect(fresh.why[0]).toMatch(/assumed bar of 65/);
  });
  it("tech: average mastery over branch topics, lists not-started", () => {
    const t = techComponent(base({ ratings: new Map([["dbms", 1350]]) }));
    expect(t.score).toBe(Math.round((Math.round((1 / (1 + Math.exp(-1))) * 100) + 20) / 2));
    expect(t.why.join(" ")).toMatch(/Not started: sql/);
    expect(techComponent(base({ techTopics: [] })).score).toBe(0);
  });
  it("consistency: 14 drill days + 10 streak + 3 mocks = 100", () => {
    expect(consistencyComponent({ drillsLast14: 14, streak: 12, mocksLast30: 5, hrPracticed: 0 }).score).toBe(100);
    expect(consistencyComponent({ drillsLast14: 7, streak: 0, mocksLast30: 0, hrPracticed: 0 }).score).toBe(25);
  });
  it("profile: null = 0 with an explanation", () => {
    expect(profileComponent(null)).toEqual({ score: 0, why: ["Resume and LinkedIn checklists not started"] });
    expect(profileComponent(85).score).toBe(85);
  });
  it("total is the weighted sum; interview-ready needs every gate", () => {
    const strong = new Map(["percentages", "averages", "fill_blanks", "dbms", "sql"].map((t) => [t, 1500]));
    const r = readinessV3(base({ ratings: strong, consistency: { drillsLast14: 14, streak: 10, mocksLast30: 1, hrPracticed: 0 }, profileScore: 90 }));
    expect(r.score).toBe(Math.round(0.4 * r.aptitude.score + 0.3 * r.tech.score + 0.15 * r.consistency.score + 0.15 * r.profile.score));
    expect(r.interviewReady).toBe(true);
    expect(readinessV3(base({ ratings: strong, consistency: { drillsLast14: 14, streak: 10, mocksLast30: 0, hrPracticed: 0 }, profileScore: 90 })).interviewReady).toBe(false); // no mock/HR set
    expect(readinessV3(base({ ratings: strong, consistency: { drillsLast14: 14, streak: 10, mocksLast30: 1, hrPracticed: 0 }, profileScore: 50 })).interviewReady).toBe(false); // profile < 80
  });
});
