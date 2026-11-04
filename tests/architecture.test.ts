import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mjs)$/.test(f) ? [p] : [];
  });
}

describe("architecture rules", () => {
  it("UI layer (src/app, src/components) never imports the database or drizzle", () => {
    const offenders = [...walk("src/app"), ...walk("src/components")].filter((f) => /from\s+["'](@\/db|drizzle-orm|postgres)(\/[^"']*)?["']/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
  it("no dangerouslySetInnerHTML anywhere in UI", () => {
    const offenders = [...walk("src/app"), ...walk("src/components")].filter((f) => readFileSync(f, "utf8").includes("dangerouslySetInnerHTML"));
    expect(offenders).toEqual([]);
  });
  it("no sql.raw outside test helpers and seed", () => {
    const offenders = walk("src").filter((f) => !f.includes("seed") && readFileSync(f, "utf8").includes("sql.raw("));
    expect(offenders).toEqual([]);
  });
  it("client components never import server-only modules", () => {
    const offenders = walk("src").filter((f) => {
      const s = readFileSync(f, "utf8");
      if (!/^["']use client["']/.test(s.trimStart())) return false;
      // value imports of server-only modules (type-only imports are erased and allowed)
      return /^import\s+(?!type\b)[^;]*from\s+["'](@\/db|@\/server|@\/auth|@\/lib\/(drill|bank|audit|rate-limit|events|llm))(\/[^"']*)?["']/m.test(s);
    });
    expect(offenders).toEqual([]);
  });
});
