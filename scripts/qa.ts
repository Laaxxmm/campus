/**
 * Blind QA with the smart model: it solves each draft without the answer.
 * mismatch or ambiguous → status "review"; pass → stays "draft" with qa_flags.passed = true.
 *   npx tsx scripts/qa.ts content/drafts/variants-*.json [--dry-run] [--limit 20]
 * Writes results back into the same file (qa_flags field).
 */
import "./env";
import { readFileSync, writeFileSync } from "node:fs";
import type { QuestionJson } from "../src/lib/question-schema";
import { aiEnabled, anthropic, MODELS, parseJsonObject, textOf } from "../src/lib/llm";
import { blind } from "../src/lib/pipeline";

type QaOut = { id: string; my_answer_index: number; ambiguous: boolean; issues: string[]; fixed_explanation: string | null };
type Draft = QuestionJson & { qa_flags?: unknown };

const args = process.argv.slice(2);
const files = args.filter((a) => a.endsWith(".json"));
const dryRun = args.includes("--dry-run");
const limit = Number(args[args.indexOf("--limit") + 1]) || Infinity;
const system = readFileSync("prompts/system.md", "utf8");
const tpl = readFileSync("prompts/qa.md", "utf8");

async function main() {
  if (!files.length) {
    console.error("usage: qa.ts <drafts.json…> [--dry-run]");
    process.exit(2);
  }
  if (!dryRun && !aiEnabled()) {
    console.error("ANTHROPIC_API_KEY not set — use --dry-run");
    process.exit(2);
  }
  for (const f of files) {
    const drafts = JSON.parse(readFileSync(f, "utf8")) as Draft[];
    let n = 0, pass = 0, flagged = 0;
    for (const q of drafts) {
      if (n >= limit) break;
      if (q.qa_flags) continue;
      n++;
      const prompt = tpl.replaceAll("{{QUESTION_JSON}}", JSON.stringify(blind(q))).replaceAll("{{ID}}", q.id);
      if (dryRun) {
        console.log(JSON.stringify({ model: MODELS.smart(), system: "[prompts/system.md, cached]", user: prompt }).slice(0, 400));
        continue;
      }
      const msg = await anthropic().messages.create({
        model: MODELS.smart(),
        max_tokens: 4000,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: prompt }],
      });
      const r = parseJsonObject<QaOut>(textOf(msg));
      const matches = r.my_answer_index === q.answer_index;
      const ok = matches && !r.ambiguous;
      q.qa_flags = { ...r, matches, passed: ok, model: MODELS.smart(), at: new Date().toISOString() };
      if (!ok) {
        q.status = "review";
        flagged++;
      } else pass++;
      if (r.fixed_explanation && ok) q.explanation = r.fixed_explanation;
    }
    if (!dryRun) writeFileSync(f, JSON.stringify(drafts, null, 1));
    console.log(`${f}: checked ${n}, passed ${pass}, flagged ${flagged}${dryRun ? " (dry-run)" : ""}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
