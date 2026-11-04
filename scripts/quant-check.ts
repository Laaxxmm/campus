/**
 * Re-solve numeric quant items in code.
 * 1) content/quant-checks.json maps question id → arithmetic expression; its value must equal the correct option's number.
 * 2) Heuristic for every quant item: the explanation must mention the correct option's number.
 *   npx tsx scripts/quant-check.ts [files…]   (default: whole bank + drafts)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readBankDir } from "../src/lib/bank-files";
import type { QuestionJson } from "../src/lib/question-schema";
import { approxEqual, evalArithmetic, explanationSupportsAnswer, numberIn } from "../src/lib/pipeline";

const files = process.argv.slice(2).filter((a) => a.endsWith(".json"));
let items: QuestionJson[];
if (files.length) items = files.flatMap((f) => JSON.parse(readFileSync(f, "utf8")));
else {
  items = readBankDir().map((x) => x.raw as QuestionJson);
  const d = join("content", "drafts");
  if (existsSync(d)) for (const f of readdirSync(d).filter((f) => f.endsWith(".json"))) items.push(...JSON.parse(readFileSync(join(d, f), "utf8")));
}
const checks: Record<string, string> = existsSync("content/quant-checks.json") ? JSON.parse(readFileSync("content/quant-checks.json", "utf8")) : {};

let errors = 0, warnings = 0, exact = 0;
for (const q of items.filter((q) => q.section === "quant")) {
  const expr = checks[q.id];
  if (expr) {
    const want = numberIn(q.options[q.answer_index]);
    const got = evalArithmetic(expr);
    if (want === null || !approxEqual(want, got, 1e-4)) {
      errors++;
      console.error(`✗ ${q.id}: expression ${expr} = ${got}, correct option says ${q.options[q.answer_index]}`);
    } else exact++;
    const others = q.options.filter((_, i) => i !== q.answer_index).map(numberIn);
    if (others.some((o) => o !== null && approxEqual(o, got, 1e-4))) {
      errors++;
      console.error(`✗ ${q.id}: a distractor also equals ${got}`);
    }
  }
  const h = explanationSupportsAnswer(q);
  if (h.checked && !h.ok) {
    warnings++;
    console.warn(`! ${q.id}: explanation never mentions the answer value "${q.options[q.answer_index]}"`);
  }
}
console.log(`quant-check: ${exact} exact checks passed, ${errors} errors, ${warnings} warnings`);
if (errors) process.exit(1);
