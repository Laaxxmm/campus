import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csv", () => {
  it("quotes commas/quotes/newlines", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("x\ny")).toBe('"x\ny"');
    expect(csvCell(12)).toBe("12");
    expect(csvCell(null)).toBe("");
  });
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+91 98400")).toBe("'+91 98400");
    expect(csvCell(-5)).toBe("-5"); // numbers untouched
  });
  it("BOM + header + CRLF", () => {
    const s = toCsv([{ a: 1 }], [{ header: "A", get: (r) => r.a }]);
    expect(s).toBe("﻿A\r\n1\r\n");
  });
});
