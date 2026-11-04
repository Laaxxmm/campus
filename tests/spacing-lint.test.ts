import { describe, expect, it } from "vitest";
import { lintLine, lintTree } from "../scripts/lint-spacing.mjs";

describe("8pt spacing lint (v4)", () => {
  it("flags off-grid values, including responsive variants and negatives", () => {
    expect(lintLine('<div className="p-3 md:px-5 -mt-3 space-y-1.5 gap-7">')).toEqual(["p-3", "md:px-5", "-mt-3", "space-y-1.5", "gap-7"]);
  });
  it("allows the 8pt scale", () => {
    expect(lintLine('<div className="p-2 p-4 px-6 mt-8 gap-10 py-12 mb-16 space-y-20 pt-24 p-0">')).toEqual([]);
  });
  it("allows 4px only for icon gaps and chip inner padding", () => {
    expect(lintLine('<span className="inline-flex gap-1">')).toEqual([]);
    expect(lintLine('<span className="rounded-pill px-2 py-1">')).toEqual([]);
    expect(lintLine('<span className="mt-1">')).toEqual(["mt-1"]);
    expect(lintLine('<span className="py-1">')).toEqual(["py-1"]);
  });
  it("ignores non-spacing utilities that look similar", () => {
    expect(lintLine('<div className="h-3 w-5 min-h-11 top-1 inset-x-3 grid-cols-3 col-span-5 z-10 text-[11px]">')).toEqual([]);
  });
  it("the source tree is clean", () => {
    expect(lintTree()).toEqual([]);
  });
});
