import { describe, expect, it } from "vitest";
import { openSection, percentileRank, scoreAttempt, sectionDeadlines } from "./mock-scoring";

const qs = [
  { id: "a", section: "quant", answerIndex: 0 },
  { id: "b", section: "quant", answerIndex: 1 },
  { id: "c", section: "verbal", answerIndex: 2 },
  { id: "d", section: "verbal", answerIndex: 3 },
];
const A = (choice: number | null, timeMs = 1000) => ({ choice, flagged: false, visited: true, timeMs });

describe("mock scoring", () => {
  it("negative marking: +1 correct, −0.25 wrong, 0 skipped", () => {
    const r = scoreAttempt(qs, { a: A(0), b: A(0), c: A(null), d: A(3) }, 1, 0.25);
    expect([r.correct, r.wrong, r.skipped]).toEqual([2, 1, 1]);
    expect(r.marks).toBe(1.75);
    expect(r.maxMarks).toBe(4);
    expect(r.sections.find((s) => s.section === "quant")).toMatchObject({ correct: 1, wrong: 1, marks: 0.75 });
    expect(r.sections.find((s) => s.section === "verbal")).toMatchObject({ correct: 1, skipped: 1, marks: 1 });
  });
  it("unanswered questions count as skipped, no negative", () => {
    expect(scoreAttempt(qs, {}, 1, 0.25)).toMatchObject({ marks: 0, skipped: 4 });
  });
  it("percentile rank", () => {
    expect(percentileRank(10, [10])).toBeNull();
    expect(percentileRank(10, [2, 5, 10])).toBe(100);
    expect(percentileRank(2, [2, 5, 10])).toBe(0);
    expect(percentileRank(5, [5, 5, 1])).toBe(75);
  });
  it("sectional deadlines are proportional and sequential", () => {
    const start = new Date("2026-11-04T10:00:00Z");
    const d = sectionDeadlines(start, 1200, [{ section: "quant", count: 10 }, { section: "verbal", count: 10 }]);
    expect(d).toEqual({ quant: "2026-11-04T10:10:00.000Z", verbal: "2026-11-04T10:20:00.000Z" });
    expect(openSection(d, new Date("2026-11-04T10:05:00Z"))).toBe("quant");
    expect(openSection(d, new Date("2026-11-04T10:15:00Z"))).toBe("verbal");
    expect(openSection(d, new Date("2026-11-04T10:21:00Z"))).toBeNull();
  });
});
