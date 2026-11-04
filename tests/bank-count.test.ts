import { describe, expect, it } from "vitest";
import { readBankDir } from "@/lib/bank-files";
import { coverage, validateBank } from "@/lib/question-schema";

describe("bank seed count + coverage", () => {
  const { ok, issues } = validateBank(readBankDir());
  it("has zero validation errors", () => expect(issues).toEqual([]));
  it("has ≥ 260 golden questions (v1 gate 120; v2 600 needs the API pipeline — PROGRESS D15)", () => {
    expect(ok.filter((q) => q.status === "golden").length).toBeGreaterThanOrEqual(260);
  });
  it("every taxonomy topic meets its minimum and spans easy + hard bands", () => {
    for (const c of coverage(ok)) {
      expect(c.ok, `${c.topic} ${c.n}/${c.min}`).toBe(true);
      expect(c.bands.some((b) => b <= 2) && c.bands.some((b) => b >= 4), `${c.topic} bands ${c.bands}`).toBe(true);
    }
  });
  it("answer positions are balanced (no index > 35%)", () => {
    const n = [0, 1, 2, 3].map((i) => ok.filter((q) => q.answer_index === i).length / ok.length);
    expect(Math.max(...n)).toBeLessThan(0.35);
  });
});
