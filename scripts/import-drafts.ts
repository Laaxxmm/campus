/** Load generated drafts (content/drafts/*.json, after qa.ts) into the DB for /content/review. Idempotent by id. */
import "./env";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db, pg } from "../src/db";
import { questions } from "../src/db/schema";
import { QuestionJson } from "../src/lib/question-schema";

(async () => {
  const dir = join("content", "drafts");
  let n = 0, bad = 0;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    for (const raw of JSON.parse(readFileSync(join(dir, f), "utf8")) as (Record<string, unknown> & { qa_flags?: unknown })[]) {
      const p = QuestionJson.safeParse(raw);
      if (!p.success || p.data.status === "golden") { bad++; continue; }
      const q = p.data;
      await db
        .insert(questions)
        .values({ id: q.id, section: q.section, topic: q.topic, subtopic: q.subtopic, stem: q.stem, options: q.options, answerIndex: q.answer_index, explanation: q.explanation, shortcut: q.shortcut ?? null, companyTags: q.company_tags, difficulty: q.difficulty, timeSec: q.time_sec, source: q.source, seedId: q.seed_id ?? null, status: q.status, variantGroup: q.variant_group, version: q.version, qaFlags: raw.qa_flags ?? null })
        .onConflictDoUpdate({ target: questions.id, set: { qaFlags: sql`excluded.qa_flags` } });
      n++;
    }
  }
  console.log(`imported ${n} drafts, skipped ${bad}`);
  await pg.end();
})();
