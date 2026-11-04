/** Excel-safe CSV: UTF-8 BOM, CRLF, quoted fields, formula-injection guard (=,+,-,@,TAB,CR → leading '). */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv<T>(rows: T[], cols: { header: string; get: (r: T) => unknown }[]) {
  const lines = [cols.map((c) => csvCell(c.header)).join(","), ...rows.map((r) => cols.map((c) => csvCell(c.get(r))).join(","))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}
