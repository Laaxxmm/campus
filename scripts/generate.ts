/**
 * Bulk variant generation via Message Batches (50% off).
 *   npx tsx scripts/generate.ts --dry-run [--limit 3] [--topic percentages]
 *   npx tsx scripts/generate.ts [--limit 50]            # needs ANTHROPIC_API_KEY
 *   npx tsx scripts/generate.ts --resume <batch_id>
 * Output: content/drafts/variants-<timestamp>.json (Zod-validated, ids assigned, deduped).
 */
import "./env";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { readBankDir } from "../src/lib/bank-files";
import { QuestionJson, SECTION_CODE, topicById, validateBank } from "../src/lib/question-schema";
import { aiEnabled, anthropic, MODELS, parseJsonObject, textOf } from "../src/lib/llm";
import { dedupe, makeIdAllocator } from "../src/lib/pipeline";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : undefined);
const dryRun = flag("--dry-run");
const limit = Number(opt("--limit") ?? 0) || Infinity;
const topic = opt("--topic");
const resume = opt("--resume");

const system = readFileSync("prompts/system.md", "utf8");
const variantTpl = readFileSync("prompts/variant.md", "utf8");
const { ok: bank } = validateBank(readBankDir());
const seeds = bank.filter((q) => q.status === "golden" && (!topic || q.topic === topic)).slice(0, limit);

function buildRequest(seed: QuestionJson): Anthropic.Messages.Batches.BatchCreateParams.Request {
  const band = seed.difficulty;
  const user = variantTpl
    .replaceAll("{{SEED_JSON}}", JSON.stringify(seed))
    .replaceAll("{{BAND_PLUS_1}}", String(Math.min(5, band + 1)))
    .replaceAll("{{BAND}}", String(band))
    .replaceAll("{{SEED_ID}}", seed.id);
  return {
    custom_id: seed.id,
    params: {
      model: MODELS.fast(),
      max_tokens: 16000,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    },
  };
}

async function main() {
  const requests = seeds.map(buildRequest);
  if (dryRun) {
    console.log(JSON.stringify({ requests }, null, 2));
    console.error(`[dry-run] ${requests.length} batch requests (model ${MODELS.fast()}), no API call made.`);
    return;
  }
  if (!aiEnabled()) {
    console.error("ANTHROPIC_API_KEY not set — use --dry-run, or add the key to .env.local");
    process.exit(2);
  }
  const client = anthropic();
  let batchId = resume;
  if (!batchId) {
    const b = await client.messages.batches.create({ requests });
    batchId = b.id;
    console.log(`batch ${batchId} created with ${requests.length} requests`);
  }
  for (;;) {
    const b = await client.messages.batches.retrieve(batchId);
    if (b.processing_status === "ended") break;
    console.log(`… ${b.processing_status} processing=${b.request_counts.processing}`);
    await new Promise((r) => setTimeout(r, 30_000));
  }

  const draftsDir = join("content", "drafts");
  mkdirSync(draftsDir, { recursive: true });
  const existingDrafts = readdirSync(draftsDir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => JSON.parse(readFileSync(join(draftsDir, f), "utf8")) as QuestionJson[]);
  const nextId = makeIdAllocator([...bank, ...existingDrafts].map((q) => q.id));
  const out: QuestionJson[] = [];
  const rejects: { seed: string; error: string }[] = [];
  for await (const r of await client.messages.batches.results(batchId)) {
    if (r.result.type !== "succeeded") {
      rejects.push({ seed: r.custom_id, error: r.result.type });
      continue;
    }
    try {
      const { items } = parseJsonObject<{ items: unknown[] }>(textOf(r.result.message));
      const seed = bank.find((q) => q.id === r.custom_id)!;
      for (const raw of items) {
        const t = topicById.get(seed.topic)!;
        const candidate = { ...(raw as object), id: nextId(`Q-${SECTION_CODE[seed.section]}-${t.code}`), section: seed.section, topic: seed.topic, source: "llm_variant", status: "draft", seed_id: seed.id, version: 1 };
        const p = QuestionJson.safeParse(candidate);
        if (p.success) out.push(p.data);
        else rejects.push({ seed: seed.id, error: p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
      }
    } catch (e) {
      rejects.push({ seed: r.custom_id, error: String(e) });
    }
  }
  const { kept, dropped } = dedupe(out, [...bank, ...existingDrafts]);
  const file = join(draftsDir, `variants-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify(kept, null, 1));
  console.log(`wrote ${kept.length} drafts → ${file}; ${dropped.length} near-duplicates dropped; ${rejects.length} rejected`);
  for (const r of rejects.slice(0, 20)) console.log("  reject", r.seed, r.error);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
