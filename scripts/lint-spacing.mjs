#!/usr/bin/env node
/**
 * v4 8pt-grid lint. Spacing tokens are 8/16/24/32/40/48/64/80/96 (Tailwind 2,4,6,8,10,12,16,20,24).
 * 4px (Tailwind `1`) is allowed ONLY for icon-to-label gaps (`gap-1`, `gap-x-1`, `gap-y-1`) and chip inner padding
 * (`px-1`/`py-1`/`p-1` on a line that also carries `rounded-pill`). Off-grid values (0.5, 1.5, 2.5, 3, 3.5, 5, 7, 9, 11)
 * fail everywhere. `src/components/ui/` primitives are exempt: their exact specs (e.g. button px 20) come from DESIGN.md.
 * Usage: node scripts/lint-spacing.mjs [--json]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
const EXEMPT_DIRS = [join(SRC, "components", "ui")];
const PROPS = "p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap|gap-x|gap-y|space-x|space-y";
const OFF_GRID = "0\\.5|1\\.5|2\\.5|3\\.5|3|5|7|9|11";
const re = new RegExp(`(?<![\\w-])(?:[a-z0-9]+:)*-?(${PROPS})-(${OFF_GRID}|1)(?![\\w.\\-/\\]])`, "g");

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (EXEMPT_DIRS.some((d) => p.startsWith(d))) continue;
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (/\.(tsx|ts)$/.test(name) && !/\.test\.tsx?$/.test(name)) yield p;
  }
}

export function lintLine(line) {
  const out = [];
  for (const m of line.matchAll(re)) {
    const [token, prop, value] = m;
    if (value === "1") {
      if (/^gap(-x|-y)?$/.test(prop)) continue; // icon-to-label gap
      if (/^p[xy]?$/.test(prop) && line.includes("rounded-pill")) continue; // chip inner padding
    }
    out.push(token);
  }
  return out;
}

export function lintTree(dir = SRC) {
  const problems = [];
  for (const file of walk(dir)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const token of lintLine(line)) problems.push({ file: relative(ROOT, file), line: i + 1, token });
    });
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = lintTree();
  if (process.argv.includes("--json")) console.log(JSON.stringify(problems, null, 2));
  else for (const p of problems) console.log(`${p.file}:${p.line}  off-grid spacing \`${p.token}\``);
  if (problems.length) {
    console.error(`\n✗ ${problems.length} off-grid spacing class(es). Use 8pt tokens (2,4,6,8,10,12,16,20,24); see docs/DESIGN.md.`);
    process.exit(1);
  }
  console.log("✓ spacing on 8pt grid");
}
