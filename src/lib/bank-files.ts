import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Reads every content/bank/*.json (array of questions) → [{file, raw}] */
export function readBankDir(dir = join(process.cwd(), "content", "bank")) {
  const items: { file: string; raw: unknown }[] = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const data = JSON.parse(readFileSync(join(dir, f), "utf8"));
    if (!Array.isArray(data)) throw new Error(`${f}: expected a JSON array`);
    for (const raw of data) items.push({ file: f, raw });
  }
  return items;
}
