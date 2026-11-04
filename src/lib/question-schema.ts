import { z } from "zod";
import taxonomy from "../../content/taxonomy.json";
import { COMPANY_IDS } from "./companies";

export const SECTIONS = ["quant", "logical", "verbal", "coding", "tech"] as const;
/** Aptitude sections (mocks/readiness aptitude component); "tech" = technical concept bank (v3). */
export const APTITUDE_SECTIONS = ["quant", "logical", "verbal", "coding"] as const;
export type Section = (typeof SECTIONS)[number];

type TaxTopic = { id: string; code: string; name: string; major: boolean; subtopics: string[] };
export const TAXONOMY = taxonomy as { version: number; sections: Record<Section, TaxTopic[]> };
export const SECTION_CODE: Record<Section, string> = { quant: "QNT", logical: "LOG", verbal: "VRB", coding: "COD", tech: "TEC" };

export const TOPICS = Object.entries(TAXONOMY.sections).flatMap(([section, topics]) =>
  topics.map((t) => ({ ...t, section: section as Section })),
);
export const topicById = new Map(TOPICS.map((t) => [t.id, t]));
export function topicName(id: string) {
  return topicById.get(id)?.name ?? id;
}

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export const QuestionJson = z
  .object({
    id: z.string().regex(/^Q-(QNT|LOG|VRB|COD|TEC)-[A-Z]{3}-\d{4}$/, "id must look like Q-QNT-PCT-0001"),
    section: z.enum(SECTIONS),
    topic: z.string().min(1),
    subtopic: z.string().min(1),
    stem: z.string().min(10).max(2500),
    options: z.array(z.string().min(1).max(300)).length(4, "exactly 4 options"),
    answer_index: z.number().int().min(0).max(3),
    explanation: z.string().min(5),
    shortcut: z.string().nullable().optional(),
    company_tags: z.array(z.enum(COMPANY_IDS as [string, ...string[]])).default([]),
    difficulty: z.number().int().min(1).max(5),
    time_sec: z.number().int().min(20).max(180),
    source: z.enum(["seed", "llm_variant", "tpo"]),
    seed_id: z.string().nullable().optional(),
    status: z.enum(["draft", "review", "golden", "retired"]),
    variant_group: z.string().min(1),
    version: z.number().int().min(1).default(1),
    needs_review: z.boolean().optional(),
  })
  .superRefine((q, ctx) => {
    const opts = q.options.map(norm);
    if (new Set(opts).size !== 4) ctx.addIssue({ code: "custom", path: ["options"], message: "options must be unique" });
    if (wordCount(q.explanation) > 80) ctx.addIssue({ code: "custom", path: ["explanation"], message: `explanation ${wordCount(q.explanation)} words (> 80)` });
    const t = topicById.get(q.topic);
    if (!t) ctx.addIssue({ code: "custom", path: ["topic"], message: `unknown topic ${q.topic}` });
    else {
      if (t.section !== q.section) ctx.addIssue({ code: "custom", path: ["section"], message: `topic ${q.topic} belongs to ${t.section}` });
      if (!t.subtopics.includes(q.subtopic)) ctx.addIssue({ code: "custom", path: ["subtopic"], message: `unknown subtopic ${q.subtopic} for ${q.topic}` });
      const want = `Q-${SECTION_CODE[q.section]}-${t.code}-`;
      if (!q.id.startsWith(want)) ctx.addIssue({ code: "custom", path: ["id"], message: `id should start with ${want}` });
    }
  });
export type QuestionJson = z.infer<typeof QuestionJson>;

export type BankIssue = { file: string; id?: string; message: string };

/** Validates a whole bank (array of raw items, with origin file) incl. cross-item rules. */
export function validateBank(items: { file: string; raw: unknown }[]) {
  const issues: BankIssue[] = [];
  const ok: QuestionJson[] = [];
  const ids = new Set<string>();
  const stems = new Map<string, string>();
  for (const { file, raw } of items) {
    const r = QuestionJson.safeParse(raw);
    const id = (raw as { id?: string })?.id;
    if (!r.success) {
      for (const i of r.error.issues) issues.push({ file, id, message: `${i.path.join(".")}: ${i.message}` });
      continue;
    }
    if (ids.has(r.data.id)) issues.push({ file, id, message: "duplicate id" });
    ids.add(r.data.id);
    const s = norm(r.data.stem);
    if (stems.has(s)) issues.push({ file, id, message: `duplicate stem of ${stems.get(s)}` });
    stems.set(s, r.data.id);
    ok.push(r.data);
  }
  return { ok, issues };
}

/** Coverage: golden count per topic vs. minimum (major ≥5, minor ≥3). */
export function coverage(qs: QuestionJson[]) {
  const golden = qs.filter((q) => q.status === "golden");
  return TOPICS.map((t) => {
    const n = golden.filter((q) => q.topic === t.id).length;
    const min = t.major ? 5 : 3;
    const bands = new Set(golden.filter((q) => q.topic === t.id).map((q) => q.difficulty));
    return { topic: t.id, section: t.section, n, min, ok: n >= min, bands: [...bands].sort() };
  });
}
