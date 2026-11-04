/** Maps checklist skill keys to measurable taxonomy topics/sections and to one concrete action + resource. */
import type { Branch } from "./content-schema";

/** Skills measured from practice: skill → taxonomy topics (any section). */
export const MEASURED: Record<string, { topics?: string[]; section?: string }> = {
  aptitude_quant: { section: "quant" },
  aptitude_logical: { section: "logical" },
  aptitude_verbal: { section: "verbal" },
  pseudocode: { section: "coding" },
  dbms: { topics: ["dbms"] },
  sql: { topics: ["sql"] },
  oop: { topics: ["oop_concepts", "oops"] },
  os: { topics: ["operating_systems"] },
  networks: { topics: ["computer_networks"] },
  dsa: { topics: ["dsa_basics", "data_structures"] },
  c: { topics: ["c_language"] },
  java: { topics: ["java"] },
  python: { topics: ["python"] },
  git: { topics: ["software_engineering"] },
  testing: { topics: ["software_engineering"] },
  ece_core: { topics: ["ece_core"] },
  eee_core: { topics: ["ece_core"] },
  mech_core: { topics: ["mech_core"] },
  civil_core: { topics: ["mech_core"] },
};

/** Official / stable learning resources only. */
export const RESOURCES: Record<string, { label: string; url: string }> = {
  sql: { label: "PostgreSQL tutorial: the SQL language", url: "https://www.postgresql.org/docs/current/tutorial-sql.html" },
  python: { label: "The Python Tutorial (python.org)", url: "https://docs.python.org/3/tutorial/" },
  java: { label: "Learn Java (dev.java)", url: "https://dev.java/learn/" },
  git: { label: "Pro Git book (git-scm.com)", url: "https://git-scm.com/book/en/v2" },
  web_basics: { label: "MDN: Learn web development", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development" },
  cloud_basics: { label: "AWS Cloud Practitioner Essentials (free)", url: "https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/" },
  dsa: { label: "NPTEL: Programming, Data Structures and Algorithms", url: "https://nptel.ac.in/courses/106106127" },
  communication: { label: "NPTEL: English language for competitive exams", url: "https://nptel.ac.in/" },
};

export const SELF_ACTIONS: Record<string, string> = {
  communication: "Record a 2-minute 'Tell me about yourself' and listen back; practise 3 HR cards aloud.",
  teamwork: "Prepare one STAR story about a team project (who did what, the conflict, the result).",
  problem_solving: "Explain one tricky bug you fixed, step by step, in under 90 seconds.",
  projects: "Write a 3-line project summary with your role, the tech stack and one number (users, speed, accuracy).",
  internship: "If you have none, list one project or course that shows the same skills — don't invent one.",
  certifications: "Optional: one free, relevant certificate beats five unrelated ones.",
  web_basics: "Build a one-page site (HTML/CSS/JS) and put it on GitHub Pages.",
  cloud_basics: "Nice-to-have only: finish one free cloud fundamentals course.",
  cad: "Show one CAD model (AutoCAD/SolidWorks) with dimensions in your portfolio.",
};

export function branchOf(raw: string | null | undefined): Branch {
  const b = (raw ?? "").toLowerCase();
  if (/cse|cs|it|computer|information|aiml|ai|data/.test(b)) return "cse_it";
  if (/ece|eee|ee|electr|instrument|telecom/.test(b)) return "ece_eee";
  if (/mech|civil|auto|aero|production|chem/.test(b)) return "mech_civil";
  return "cse_it";
}

export type SkillStatus = "have" | "weak" | "missing";
/** ≥ 65 mastery with ≥ 5 attempts = have; ≥ 45 = weak; else missing. No attempts → missing ("not measured yet"). */
export function statusFromMastery(masteryPct: number | null, attempts: number): { status: SkillStatus; note: string } {
  if (masteryPct === null || attempts < 5) return { status: "missing", note: attempts ? `only ${attempts} questions so far` : "not practised yet" };
  if (masteryPct >= 65) return { status: "have", note: `mastery ${masteryPct}` };
  if (masteryPct >= 45) return { status: "weak", note: `mastery ${masteryPct}` };
  return { status: "missing", note: `mastery ${masteryPct}` };
}
