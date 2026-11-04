import { describe, expect, it } from "vitest";
import { dedupe, evalArithmetic, explanationSupportsAnswer, makeIdAllocator, numberIn, similarity } from "./pipeline";

describe("pipeline helpers", () => {
  it("trigram similarity", () => {
    expect(similarity("A train 120 m long crosses a pole", "A train 120 m long crosses a pole.")).toBeGreaterThan(0.92);
    expect(similarity("A train crosses a pole", "Find the odd one out")).toBeLessThan(0.3);
  });
  it("dedupe drops near-duplicates against existing and within batch", () => {
    const r = dedupe([{ stem: "What is 20% of 150?" }, { stem: "What is 20% of 150 ?" }, { stem: "Find the LCM of 12 and 18." }], [{ stem: "Find the LCM of 12 and 18", id: "Q-1" }]);
    expect(r.kept).toHaveLength(1);
    expect(r.dropped.map((d) => d.dupOf)).toEqual(["(batch)", "Q-1"]);
  });
  it("id allocator continues numbering", () => {
    const next = makeIdAllocator(["Q-QNT-PCT-0001", "Q-QNT-PCT-0009", "Q-LOG-SER-0002"]);
    expect(next("Q-QNT-PCT")).toBe("Q-QNT-PCT-0010");
    expect(next("Q-QNT-PCT")).toBe("Q-QNT-PCT-0011");
    expect(next("Q-VRB-ERR")).toBe("Q-VRB-ERR-0001");
  });
  it("safe arithmetic", () => {
    expect(evalArithmetic("20 - 20 + (20 × −20)/100")).toBe(-4);
    expect(evalArithmetic("2^3^2")).toBe(512);
    expect(() => evalArithmetic("process.exit()")).toThrow();
  });
  it("numberIn", () => {
    expect(numberIn("₹1,250")).toBe(1250);
    expect(numberIn("−4%")).toBe(-4);
    expect(numberIn("3/8")).toBe(0.375);
    expect(numberIn("Only I follows")).toBeNull();
  });
  it("explanation check", () => {
    expect(explanationSupportsAnswer({ options: ["0%", "−4%", "+4%", "−2%"], answer_index: 1, explanation: "= −4%" }).ok).toBe(true);
    expect(explanationSupportsAnswer({ options: ["10", "12", "14", "16"], answer_index: 1, explanation: "so the answer is 14" }).ok).toBe(false);
  });
});

import cases from "../../tests/fixtures/qa-cases.json";
import { judgeQa, type QaVerdict } from "./pipeline";
describe("blind QA verifier (fixtures)", () => {
  for (const c of cases as { name: string; q: { answer_index: number; status: string; explanation: string }; r: QaVerdict; status: string; passed: boolean; explanation?: string }[]) {
    it(c.name, () => {
      const out = judgeQa(c.q, c.r, "test-model");
      expect(out.status).toBe(c.status);
      expect(out.qa_flags.passed).toBe(c.passed);
      if (c.explanation) expect(out.explanation).toBe(c.explanation);
    });
  }
});
