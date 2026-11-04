/** Zod schemas for v3 content: concept cards, company profiles, HR question cards. Validated by `npm run content:validate`. */
import { z } from "zod";
import { COMPANY_IDS } from "./companies";
import { TOPICS, wordCount } from "./question-schema";

export const BRANCHES = ["cse_it", "ece_eee", "mech_civil", "all"] as const;
export type Branch = (typeof BRANCHES)[number];
const techTopics = TOPICS.filter((t) => t.section === "tech").map((t) => t.id) as [string, ...string[]];

/** Short concept card (read in < 1 minute), tied to a tech topic + skill key. */
export const ConceptCard = z
  .object({
    id: z.string().regex(/^C-TEC-[A-Z]{3}-\d{4}$/),
    topic: z.enum(techTopics),
    skill_key: z.string().regex(/^[a-z0-9_]+$/),
    branches: z.array(z.enum(BRANCHES)).min(1),
    title: z.string().min(3).max(80),
    body: z.string().min(20),
    example: z.string().max(600).nullable().optional(),
    interview_tip: z.string().max(240).nullable().optional(),
    status: z.enum(["draft", "review", "golden", "retired"]),
    version: z.number().int().min(1).default(1),
  })
  .superRefine((c, ctx) => {
    if (wordCount(c.body) > 120) ctx.addIssue({ code: "custom", path: ["body"], message: `body ${wordCount(c.body)} words (> 120)` });
  });
export type ConceptCard = z.infer<typeof ConceptCard>;

const Source = z.object({ title: z.string().min(3), url: z.string().url(), accessed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), kind: z.enum(["official", "secondary"]) });

export const SKILL_KEYS = [
  // aptitude groups map to taxonomy sections; tech/soft skills used in jd_skills + checklist
  "aptitude_quant", "aptitude_logical", "aptitude_verbal", "pseudocode",
  "dbms", "sql", "oop", "os", "networks", "dsa", "c", "java", "python", "web_basics", "git", "testing", "cloud_basics",
  "ece_core", "eee_core", "mech_core", "civil_core", "cad",
  "communication", "teamwork", "problem_solving", "projects", "internship", "certifications",
] as const;

export const CompanyProfile = z.object({
  key: z.enum(COMPANY_IDS as [string, ...string[]]),
  name: z.string(),
  version: z.number().int().min(1),
  updated_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  roles: z.array(z.object({ key: z.string(), name: z.string(), note: z.string().optional() })).min(1),
  rounds: z
    .array(
      z.object({
        key: z.string(),
        name: z.string(),
        kind: z.enum(["aptitude", "coding", "technical", "hr", "communication", "group"]),
        duration_min: z.number().int().positive().nullable(),
        sections: z.array(z.object({ section: z.string(), questions: z.number().int().positive().nullable(), minutes: z.number().int().positive().nullable() })).default([]),
        what_they_check: z.string(),
        prep: z.array(z.string()).min(1),
        negative_marking: z.boolean().nullable().default(null),
      }),
    )
    .min(2),
  cutoffs: z.object({
    approx: z.literal(true),
    aptitude_percent: z.number().min(0).max(100).nullable(),
    sectional: z.boolean().nullable(),
    note: z.string().min(10),
    source_refs: z.array(z.number().int().nonnegative()).min(1),
  }),
  branch_expectations: z.record(z.enum(BRANCHES), z.object({ eligible: z.boolean(), coding: z.enum(["required", "basic", "not_required"]), tech_topics: z.array(z.string()), note: z.string() })),
  jd_skills: z.array(z.object({ skill_key: z.enum(SKILL_KEYS), level: z.enum(["required", "nice_to_have"]), roles: z.array(z.string()).default([]), note: z.string() })).min(5),
  hr_focus: z.array(z.string()).min(2),
  sources: z.array(Source).min(1),
  disclaimer: z.string().min(20),
});
export type CompanyProfile = z.infer<typeof CompanyProfile>;

export const HrQuestion = z.object({
  id: z.string().regex(/^HR-\d{4}$/),
  kind: z.enum(["hr", "behavioural", "technical_hr", "company_specific"]),
  companies: z.array(z.enum(COMPANY_IDS as [string, ...string[]])).default([]),
  question: z.string().min(8),
  why_they_ask: z.string().min(10).max(300),
  structure: z.array(z.string()).min(2).max(6), // e.g. STAR steps
  model_answer_outline: z.string().min(20).max(900),
  avoid: z.array(z.string()).min(1).max(5),
});
export type HrQuestion = z.infer<typeof HrQuestion>;
