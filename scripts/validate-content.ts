/** Validates v3 content: concept cards, company profiles (must have sources), HR question cards. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CompanyProfile, ConceptCard, HrQuestion } from "../src/lib/content-schema";

let errors = 0;
const read = (dir: string) => readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => ({ f, data: JSON.parse(readFileSync(join(dir, f), "utf8")) }));
const report = (where: string, issues: { path: PropertyKey[]; message: string }[]) => {
  for (const i of issues) console.error(`✗ ${where} ${i.path.join(".")}: ${i.message}`);
  errors += issues.length;
};
const ids = new Set<string>();
let cards = 0;
for (const { f, data } of read("content/concepts")) for (const c of data as unknown[]) {
  const r = ConceptCard.safeParse(c);
  if (!r.success) report(`${f} ${(c as { id?: string }).id}`, r.error.issues);
  else if (ids.has(r.data.id)) report(f, [{ path: [r.data.id], message: "duplicate id" }]);
  else { ids.add(r.data.id); cards++; }
}
let companies = 0;
for (const { f, data } of read("content/companies")) {
  const r = CompanyProfile.safeParse(data);
  if (!r.success) report(f, r.error.issues);
  else {
    companies++;
    for (const ref of r.data.cutoffs.source_refs) if (!r.data.sources[ref]) report(f, [{ path: ["cutoffs", "source_refs"], message: `source ${ref} missing` }]);
  }
}
let hr = 0;
for (const { f, data } of read("content/hr")) for (const q of data as unknown[]) {
  const r = HrQuestion.safeParse(q);
  if (!r.success) report(`${f} ${(q as { id?: string }).id}`, r.error.issues);
  else hr++;
}
console.log(`content: ${cards} concept cards, ${companies} company profiles, ${hr} HR questions, ${errors} errors`);
if (errors) process.exit(1);
