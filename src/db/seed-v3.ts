import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { companyProfiles, conceptCards, hrQuestions, skillTags } from "./schema";
import { CompanyProfile, ConceptCard, HrQuestion, SKILL_KEYS } from "../lib/content-schema";

const dir = (d: string) => join(process.cwd(), "content", d);
const readAll = (d: string) => (existsSync(dir(d)) ? readdirSync(dir(d)).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(dir(d), f), "utf8"))) : []);

const SKILL_KIND: Record<string, "aptitude" | "tech" | "soft"> = { aptitude_quant: "aptitude", aptitude_logical: "aptitude", aptitude_verbal: "aptitude", pseudocode: "aptitude", communication: "soft", teamwork: "soft", problem_solving: "soft", projects: "soft", internship: "soft", certifications: "soft" };
const SKILL_BRANCH: Record<string, string> = { ece_core: "ece_eee", eee_core: "ece_eee", mech_core: "mech_civil", civil_core: "mech_civil", cad: "mech_civil" };
export const SKILL_NAMES: Record<string, string> = {
  aptitude_quant: "Quantitative aptitude", aptitude_logical: "Logical reasoning", aptitude_verbal: "Verbal ability", pseudocode: "Pseudo-code / coding MCQs",
  dbms: "DBMS", sql: "SQL", oop: "OOP", os: "Operating systems", networks: "Computer networks", dsa: "Data structures & algorithms", c: "C", java: "Java", python: "Python",
  web_basics: "Web basics (HTML/CSS/JS)", git: "Git", testing: "Software testing", cloud_basics: "Cloud basics",
  ece_core: "ECE core", eee_core: "EEE core", mech_core: "Mechanical core", civil_core: "Civil core", cad: "CAD tools",
  communication: "Communication", teamwork: "Teamwork", problem_solving: "Problem solving", projects: "Projects", internship: "Internship", certifications: "Certifications",
};

export async function seedV3Content() {
  const cards = readAll("concepts").flat().map((c) => ConceptCard.parse(c));
  for (const c of cards)
    await db.insert(conceptCards).values({ id: c.id, topic: c.topic, skillKey: c.skill_key, branches: c.branches, title: c.title, body: c.body, example: c.example ?? null, interviewTip: c.interview_tip ?? null, status: c.status, version: c.version })
      .onConflictDoUpdate({ target: conceptCards.id, set: { title: sql`excluded.title`, body: sql`excluded.body`, example: sql`excluded.example`, interviewTip: sql`excluded.interview_tip`, branches: sql`excluded.branches` } });
  const hr = readAll("hr").flat().map((q) => HrQuestion.parse(q));
  for (const q of hr)
    await db.insert(hrQuestions).values({ id: q.id, kind: q.kind, companies: q.companies, question: q.question, whyTheyAsk: q.why_they_ask, structure: q.structure, outline: q.model_answer_outline, avoid: q.avoid })
      .onConflictDoUpdate({ target: hrQuestions.id, set: { question: sql`excluded.question`, whyTheyAsk: sql`excluded.why_they_ask`, structure: sql`excluded.structure`, outline: sql`excluded.outline`, avoid: sql`excluded.avoid` } });
  const profiles = readAll("companies").map((p) => CompanyProfile.parse(p));
  for (const p of profiles) {
    const v = { name: p.name, version: p.version, roles: p.roles, rounds: p.rounds, cutoffs: p.cutoffs, branchExpectations: p.branch_expectations, jdSkills: p.jd_skills, hrFocus: p.hr_focus, sources: p.sources, disclaimer: p.disclaimer, updatedAt: p.updated_at };
    await db.insert(companyProfiles).values({ key: p.key, ...v }).onConflictDoUpdate({ target: companyProfiles.key, set: v });
  }
  for (const key of SKILL_KEYS)
    await db.insert(skillTags).values({ key, kind: SKILL_KIND[key] ?? "tech", branch: SKILL_BRANCH[key] ?? null, name: SKILL_NAMES[key] ?? key }).onConflictDoNothing();
  return { cards: cards.length, hr: hr.length, profiles: profiles.length };
}
