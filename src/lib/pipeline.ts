/** Pure helpers for the offline content pipeline (generate / qa / dedupe / quant-check). */
import type { QuestionJson } from "./question-schema";

export function normalizeStem(s: string) {
  return s
    .toLowerCase()
    .replace(/[₹,]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim();
}
export function trigrams(s: string) {
  const t = new Set<string>();
  const x = `  ${normalizeStem(s)} `;
  for (let i = 0; i < x.length - 2; i++) t.add(x.slice(i, i + 3));
  return t;
}
export function similarity(a: string, b: string) {
  const A = trigrams(a);
  const B = trigrams(b);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 1 : inter / union;
}
/** Keeps the first of any near-duplicate pair (similarity > threshold), checking against `existing` too. */
export function dedupe<T extends { stem: string }>(items: T[], existing: { stem: string; id?: string }[] = [], threshold = 0.92) {
  const kept: T[] = [];
  const dropped: { item: T; dupOf: string; sim: number }[] = [];
  const pool: { stem: string; id?: string }[] = [...existing];
  for (const it of items) {
    let hit: { id?: string; sim: number } | null = null;
    for (const p of pool) {
      const sim = similarity(it.stem, p.stem);
      if (sim > threshold) {
        hit = { id: p.id, sim };
        break;
      }
    }
    if (hit) dropped.push({ item: it, dupOf: hit.id ?? "(batch)", sim: hit.sim });
    else {
      kept.push(it);
      pool.push({ stem: it.stem, id: (it as { id?: string }).id });
    }
  }
  return { kept, dropped };
}

/** Next free ids per prefix, e.g. Q-QNT-PCT-0007. */
export function makeIdAllocator(existingIds: Iterable<string>) {
  const max = new Map<string, number>();
  for (const id of existingIds) {
    const m = id.match(/^(Q-[A-Z]{3}-[A-Z]{3})-(\d{4})$/);
    if (m) max.set(m[1], Math.max(max.get(m[1]) ?? 0, Number(m[2])));
  }
  return (prefix: string) => {
    const n = (max.get(prefix) ?? 0) + 1;
    max.set(prefix, n);
    return `${prefix}-${String(n).padStart(4, "0")}`;
  };
}

/** Tiny safe arithmetic evaluator: + − * / ^ ( ) and decimals. No identifiers. */
export function evalArithmetic(expr: string): number {
  const src = expr.replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/").replace(/\s+/g, "");
  let i = 0;
  const peek = () => src[i];
  const num = (): number => {
    if (peek() === "(") {
      i++;
      const v = add();
      if (src[i++] !== ")") throw new Error("expected )");
      return v;
    }
    if (peek() === "-") {
      i++;
      return -num();
    }
    const m = src.slice(i).match(/^\d+(\.\d+)?/);
    if (!m) throw new Error(`bad token at ${i} in ${expr}`);
    i += m[0].length;
    return Number(m[0]);
  };
  const pow = (): number => {
    const b = num();
    if (peek() === "^") {
      i++;
      return b ** pow();
    }
    return b;
  };
  const mul = (): number => {
    let v = pow();
    while (peek() === "*" || peek() === "/") v = src[i++] === "*" ? v * pow() : v / pow();
    return v;
  };
  const add = (): number => {
    let v = mul();
    while (peek() === "+" || peek() === "-") v = src[i++] === "+" ? v + mul() : v - mul();
    return v;
  };
  const v = add();
  if (i !== src.length) throw new Error(`trailing input in ${expr}`);
  return v;
}

/** First number in an option string ("₹1,250", "−4%", "3/8" → 0.375). */
export function numberIn(s: string): number | null {
  const t = s.replace(/−/g, "-").replace(/,/g, "");
  const frac = t.match(/(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const m = t.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function approxEqual(a: number, b: number, tol = 1e-6) {
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Heuristic: does the explanation mention the correct option's number (and is it unique among options)? */
export function explanationSupportsAnswer(q: Pick<QuestionJson, "options" | "answer_index" | "explanation">) {
  const ans = numberIn(q.options[q.answer_index]);
  if (ans === null) return { checked: false, ok: true };
  const nums = (q.explanation.replace(/−/g, "-").replace(/,/g, "").match(/-?\d+(?:\.\d+)?(?:\s*\/\s*\d+)?/g) ?? []).map((x) => numberIn(x) ?? NaN);
  const ok = nums.some((n) => approxEqual(Math.abs(n), Math.abs(ans)));
  return { checked: true, ok };
}

/** Strip the answer for blind QA. */
export function blind(q: QuestionJson) {
  return { id: q.id, section: q.section, topic: q.topic, stem: q.stem, options: q.options, difficulty: q.difficulty };
}

export type QaVerdict = { id: string; my_answer_index: number; ambiguous: boolean; issues: string[]; fixed_explanation: string | null };
/** Blind-QA decision: mismatch or ambiguous → "review"; agreement → stays draft with passed flag. */
export function judgeQa<T extends { answer_index: number; status: string; explanation: string }>(q: T, r: QaVerdict, model: string) {
  const matches = r.my_answer_index === q.answer_index;
  const passed = matches && !r.ambiguous;
  return {
    ...q,
    status: passed ? q.status : "review",
    explanation: passed && r.fixed_explanation ? r.fixed_explanation : q.explanation,
    qa_flags: { ...r, matches, passed, model },
  };
}
