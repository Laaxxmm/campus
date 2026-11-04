/**
 * Near-duplicate removal for drafts: normalized-stem trigram Jaccard > 0.92 vs bank + earlier drafts → drop.
 * (Embedding similarity via VOYAGE_API_KEY is a phase-2 upgrade; trigram fallback is always on.)
 *   npx tsx scripts/dedupe.ts content/drafts/x.json [--write] [--threshold 0.92]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { readBankDir } from "../src/lib/bank-files";
import type { QuestionJson } from "../src/lib/question-schema";
import { dedupe } from "../src/lib/pipeline";

const args = process.argv.slice(2);
const files = args.filter((a) => a.endsWith(".json"));
const write = args.includes("--write");
const th = Number(args[args.indexOf("--threshold") + 1]) || 0.92;
const bank = readBankDir().map((x) => x.raw as QuestionJson);
if (!files.length) {
  const { dropped } = dedupe(bank, [], th);
  console.log(`bank self-check: ${dropped.length} near-duplicates`);
  for (const d of dropped) console.log(`  ${(d.item as QuestionJson).id} ≈ ${d.dupOf} (${d.sim.toFixed(3)})`);
  process.exit(dropped.length ? 1 : 0);
}
let pool: { stem: string; id?: string }[] = bank;
for (const f of files) {
  const items = JSON.parse(readFileSync(f, "utf8")) as QuestionJson[];
  const { kept, dropped } = dedupe(items, pool, th);
  console.log(`${f}: kept ${kept.length}, dropped ${dropped.length}`);
  for (const d of dropped) console.log(`  drop ${d.item.id} ≈ ${d.dupOf} (${d.sim.toFixed(3)})`);
  if (write) writeFileSync(f, JSON.stringify(kept, null, 1));
  pool = [...pool, ...kept];
}
