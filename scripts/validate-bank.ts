import { readBankDir } from "../src/lib/bank-files";
import { coverage, validateBank } from "../src/lib/question-schema";

const strict = !process.argv.includes("--no-coverage");
const { ok, issues } = validateBank(readBankDir());
for (const i of issues) console.error(`✗ ${i.file} ${i.id ?? ""}: ${i.message}`);
const cov = coverage(ok);
const gaps = cov.filter((c) => !c.ok);
const golden = ok.filter((q) => q.status === "golden").length;
console.log(`questions: ${ok.length} valid, ${golden} golden, ${issues.length} errors`);
const bands = [1, 2, 3, 4, 5].map((b) => `${b}:${ok.filter((q) => q.difficulty === b).length}`).join(" ");
console.log(`bands ${bands}`);
if (gaps.length) console.log("coverage gaps:", gaps.map((g) => `${g.topic} ${g.n}/${g.min}`).join(", "));
const failed = issues.length > 0 || (strict && (golden < 120 || gaps.length > 0));
if (failed) {
  console.error("bank:validate FAILED");
  process.exit(1);
}
console.log("bank:validate OK");
