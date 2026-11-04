/**
 * LLM cost model + actuals → docs/reports/llm-cost.md
 *   npx tsx scripts/llm-cost.ts [--students 500] [--usd-inr 84]
 * Model: list prices (src/lib/llm-usage.ts) × expected calls per student per month. Actuals: llm_usage, last 30 days.
 */
import "./env";
import { mkdirSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db, pg } from "../src/db";
import { costUsd } from "../src/lib/llm-usage";

const argv = process.argv.slice(2);
const arg = (k: string, d: number) => (argv.includes(k) ? Number(argv[argv.indexOf(k) + 1]) : d);
const STUDENTS = arg("--students", 500);
const USD_INR = arg("--usd-inr", 84);
const HAIKU = process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-5-5";
const SONNET = process.env.ANTHROPIC_MODEL_SMART || "claude-sonnet-5-5";

// Expected usage per ACTIVE student per month (22 drill days, ~4 mocks). Tokens per call measured from prompt sizes.
const features = [
  { feature: "Insight phrasing (after each drill/mock)", model: HAIKU, callsPerStudent: 26, input: 1400, output: 350, cached: 600, note: "optional; template fallback is free" },
  { feature: "Explain more (wrong answers)", model: HAIKU, callsPerStudent: 22 * 0.2 * 0.5, input: 700, output: 300, cached: 400, note: "20% tap daily, half served from explanations_cache" },
  { feature: "Resume/LinkedIn 'Draft for me'", model: SONNET, callsPerStudent: 3 * 0.3, input: 3000, output: 900, cached: 500, note: "quota 3/month; ~30% of students use it" },
  { feature: "Weekly TPO narrative", model: SONNET, callsPerStudent: 4.3 / STUDENTS, input: 1500, output: 400, cached: 300, note: "per college, aggregates only" },
];

async function main() {
  const rows = features.map((f) => {
    const usd = f.callsPerStudent * costUsd(f.model, f.input, f.output, f.cached);
    return { ...f, usdPerStudent: usd, inrPerStudent: usd * USD_INR };
  });
  const totalInr = rows.reduce((s, r) => s + r.inrPerStudent, 0);
  const actual = await db.execute<{ feature: string; calls: number; usd: number }>(sql`select feature, count(*)::int calls, coalesce(sum(cost_usd),0)::float usd from llm_usage where created_at >= now() - interval '30 days' group by 1 order by 3 desc`);
  const [act] = await db.execute<{ n: number }>(sql`select count(*)::int n from users where role = 'student' and last_active_at >= now() - interval '30 days'`);
  const actualUsd = actual.reduce((s, r) => s + r.usd, 0);
  const md = `# LLM cost report — ${new Date().toISOString().slice(0, 10)}

Rates: list prices per 1M tokens (Haiku 5.5 $0.10 in / $0.50 out; Sonnet 5.5 $2 / $10; cache reads ≈ 10% of input), USD→INR ${USD_INR}.
Drills, grading, adaptivity, insight **facts**, readiness and checklists never call an LLM; everything below is optional and has a free template fallback.

## Model (per active student per month)
| Feature | Model | Calls / student / mo | Tokens in/out | ₹ / student / mo | Note |
|---|---|---|---|---|---|
${rows.map((r) => `| ${r.feature} | ${r.model} | ${r.callsPerStudent.toFixed(2)} | ${r.input}/${r.output} | ₹${r.inrPerStudent.toFixed(2)} | ${r.note} |`).join("\n")}
| **Total** | | | | **₹${totalInr.toFixed(2)}** | ${STUDENTS} students → ≈ ₹${Math.round(totalInr * STUDENTS)} / month |

Worst case (every student uses all 3 drafts, every insight rephrased): ≈ ₹${(rows.reduce((s, r) => s + r.inrPerStudent / (r.feature.startsWith("Resume") ? 0.3 : 1), 0)).toFixed(2)} / student / month.
Against the ₹200–500 / student / year price this is ${((totalInr * 12) / 200 * 100).toFixed(1)}–${((totalInr * 12) / 500 * 100).toFixed(1)}% of revenue.

## Actuals (llm_usage, last 30 days)
${actual.length ? `| Feature | Calls | USD |\n|---|---|---|\n${actual.map((a) => `| ${a.feature} | ${a.calls} | ${a.usd.toFixed(4)} |`).join("\n")}\n\nTotal $${actualUsd.toFixed(4)} (₹${(actualUsd * USD_INR).toFixed(2)}) over ${act?.n ?? 0} active students = ₹${act?.n ? ((actualUsd * USD_INR) / act.n).toFixed(2) : "0"} / active student.` : "No LLM calls recorded (ANTHROPIC_API_KEY not set in this environment — all features ran on templates)."}

Controls: per-student draft quota (3/month) + 3/hour rate limit, explain-more 5/min, cached prefixes on every prompt, explanations cached per (question, wrong option), all calls logged to \`llm_usage\` (visible at /super/llm).
`;
  mkdirSync("docs/reports", { recursive: true });
  writeFileSync("docs/reports/llm-cost.md", md);
  console.log(md);
}
main().finally(() => pg.end());
