/**
 * Resume + LinkedIn coach — deterministic checklists and templates (free, no LLM).
 * Inputs are plain text / self-entered fields; nothing here calls a network.
 */
import { z } from "zod";

export type CheckStatus = "pass" | "warn" | "fail";
export type CheckItem = { key: string; label: string; status: CheckStatus; tip: string };
export type Checklist = { items: CheckItem[]; score: number; keywordsFound: string[]; keywordsMissing: string[] };

/** JD skill → resume keywords (lower-case, matched on word boundaries). */
export const SKILL_KEYWORDS: Record<string, string[]> = {
  sql: ["sql", "mysql", "postgresql", "postgres", "oracle"],
  dbms: ["dbms", "database", "normalization"],
  python: ["python", "pandas", "django", "flask"],
  java: ["java", "spring", "jdbc"],
  c: ["c programming", "c language", "embedded c"],
  oop: ["oop", "object-oriented", "object oriented"],
  dsa: ["data structures", "algorithms", "dsa", "leetcode", "hackerrank"],
  os: ["operating systems", "linux", "unix"],
  networks: ["networking", "tcp/ip", "computer networks", "ccna"],
  web_basics: ["html", "css", "javascript", "react"],
  git: ["git", "github"],
  testing: ["testing", "junit", "selenium", "pytest"],
  cloud_basics: ["aws", "azure", "gcp", "cloud"],
  ece_core: ["vlsi", "embedded", "microcontroller", "arduino", "verilog", "8051"],
  eee_core: ["power systems", "plc", "matlab", "electrical machines"],
  mech_core: ["autocad", "solidworks", "catia", "ansys", "thermodynamics"],
  civil_core: ["autocad", "staad", "revit", "surveying"],
  cad: ["autocad", "solidworks", "catia", "creo"],
};

const has = (text: string, re: RegExp) => re.test(text);
const SECTION = (names: string) => new RegExp(`(^|\\n)\\s*(${names})\\b`, "i");

export function keywordGap(text: string, skillKeys: string[]) {
  const t = text.toLowerCase();
  const found: string[] = [];
  const missing: string[] = [];
  for (const k of skillKeys) {
    const words = SKILL_KEYWORDS[k];
    if (!words) continue;
    (words.some((w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}([^a-z]|$)`).test(t)) ? found : missing).push(k);
  }
  return { found, missing };
}

export function resumeChecklist(text: string, targetSkills: string[]): Checklist {
  const words = text.split(/\s+/).filter(Boolean).length;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const metricLines = lines.filter((l) => /\d+\s*(?:[a-z]+\s+){0,2}(%|percent|students|users|people|classmates|members|customers|downloads|teams|x\b|ms|hrs|hours|days|reports|bugs|lakh|k\b)/i.test(l) || /\b(by|to)\s+\d+/i.test(l));
  const verbs = lines.filter((l) => /^[-•*]?\s*(built|designed|developed|led|created|improved|reduced|cut|automated|implemented|analysed|analyzed|wrote|fixed|organised|organized|won)\b/i.test(l));
  const kw = keywordGap(text, targetSkills);
  const items: CheckItem[] = [
    { key: "contact", label: "Email and phone at the top", status: has(text, /@/) && has(text, /(\+91|\b\d{10}\b|\d{5}\s?\d{5})/) ? "pass" : "fail", tip: "Recruiters need one email and one phone number in the first two lines." },
    { key: "summary", label: "2-line summary with a target role", status: has(text, SECTION("summary|objective|profile")) ? "pass" : "warn", tip: "Open with who you are and the role you want, e.g. 'Final-year CSE student seeking a Systems Engineer role'." },
    { key: "education", label: "Education with CGPA/percentage", status: has(text, SECTION("education|academic")) ? (has(text, /(cgpa|gpa|%|percentage)/i) ? "pass" : "warn") : "fail", tip: "List degree, college, years and CGPA — service companies screen on it." },
    { key: "skills", label: "Skills section", status: has(text, SECTION("skills|technical skills")) ? "pass" : "fail", tip: "Group skills: Languages · Databases · Tools. Only list what you can be questioned on." },
    { key: "projects", label: "At least 2 projects", status: has(text, SECTION("projects?|academic projects")) ? (lines.filter((l) => /project|built|developed/i.test(l)).length >= 2 ? "pass" : "warn") : "fail", tip: "Two real projects beat five tutorials. For each: what, your role, tech, one result." },
    { key: "metrics", label: "Numbers that show impact", status: metricLines.length >= 3 ? "pass" : metricLines.length >= 1 ? "warn" : "fail", tip: "Add a number to project/internship lines: users, time saved, accuracy, team size." },
    { key: "action_verbs", label: "Lines start with action verbs", status: verbs.length >= 3 ? "pass" : verbs.length >= 1 ? "warn" : "fail", tip: "Start bullets with Built, Designed, Reduced, Automated… not 'Responsible for'." },
    { key: "experience", label: "Internship / experience or equivalent", status: has(text, SECTION("internship|experience|work")) ? "pass" : "warn", tip: "No internship? Add a 'Training' or 'Open-source' section — never invent one." },
    { key: "extras", label: "Certifications or achievements", status: has(text, SECTION("certifications?|achievements?|awards")) ? "pass" : "warn", tip: "One relevant certificate or contest result is enough." },
    { key: "length", label: "One page (≈ 250–700 words)", status: words >= 250 && words <= 700 ? "pass" : words >= 120 && words <= 900 ? "warn" : "fail", tip: "Freshers: one page. Cut school details and hobbies first." },
    { key: "keywords", label: "Keywords for your target companies", status: !kw.found.length && !kw.missing.length ? "warn" : kw.missing.length === 0 ? "pass" : kw.found.length >= kw.missing.length ? "warn" : "fail", tip: "Mirror the job description's words for skills you genuinely have." },
  ];
  return { items, score: scoreOf(items), keywordsFound: kw.found, keywordsMissing: kw.missing };
}

export const LinkedInFields = z.object({
  headline: z.string().trim().max(220).default(""),
  about: z.string().trim().max(2600).default(""),
  skills: z.string().trim().max(800).default(""), // comma-separated
  featured: z.string().trim().max(1000).default(""), // one link per line
  hasPhoto: z.coerce.boolean().default(false),
  customUrl: z.coerce.boolean().default(false),
  hasEducation: z.coerce.boolean().default(false),
});
export type LinkedInFields = z.infer<typeof LinkedInFields>;

export function linkedinChecklist(f: LinkedInFields, targetSkills: string[]): Checklist {
  const skills = f.skills.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  const aboutWords = f.about.split(/\s+/).filter(Boolean).length;
  const links = f.featured.split(/\s+/).filter((l) => /^https?:\/\//.test(l));
  const kw = keywordGap(`${f.headline}\n${f.about}\n${skills.join(", ")}`, targetSkills);
  const items: CheckItem[] = [
    { key: "photo", label: "Professional photo", status: f.hasPhoto ? "pass" : "fail", tip: "Plain background, face clearly visible. Profiles with photos get far more views." },
    { key: "headline", label: "Headline says role + skills (not just 'Student')", status: f.headline.length >= 30 && !/^\s*(student|fresher)\s*$/i.test(f.headline) ? "pass" : f.headline ? "warn" : "fail", tip: "e.g. 'Final-year CSE · Java, SQL, Python · Seeking software engineer roles'." },
    { key: "about", label: "About: 80+ words, what you build and want", status: aboutWords >= 80 ? "pass" : aboutWords >= 30 ? "warn" : "fail", tip: "Three short paragraphs: what you're studying, what you've built (with a number), what you want next." },
    { key: "skills", label: "At least 8 skills listed", status: skills.length >= 8 ? "pass" : skills.length >= 4 ? "warn" : "fail", tip: "Add the skills from your resume; pin the top 3 your target companies ask for." },
    { key: "featured", label: "Featured project link (GitHub/demo)", status: links.length >= 1 ? "pass" : "fail", tip: "Pin one GitHub repo or live demo so recruiters can see real work." },
    { key: "education", label: "Education filled in", status: f.hasEducation ? "pass" : "fail", tip: "Add your college, degree and graduation year." },
    { key: "custom_url", label: "Custom profile URL", status: f.customUrl ? "pass" : "warn", tip: "Edit your public profile URL to linkedin.com/in/your-name." },
    { key: "keywords", label: "Target-company keywords", status: kw.missing.length === 0 && kw.found.length ? "pass" : kw.found.length ? "warn" : "fail", tip: "Use the same words as the job descriptions, for skills you genuinely have." },
  ];
  return { items, score: scoreOf(items), keywordsFound: kw.found, keywordsMissing: kw.missing };
}

function scoreOf(items: CheckItem[]) {
  return Math.round((100 * items.reduce((s, i) => s + (i.status === "pass" ? 1 : i.status === "warn" ? 0.5 : 0), 0)) / items.length);
}

/** Free templates (no LLM) personalised from profile data. */
export function templates(p: { branch: string; skills: string[]; role: string; project?: string }) {
  const top = p.skills.slice(0, 3).join(", ") || "your top 3 skills";
  return {
    headline: `Final-year ${p.branch} student · ${top} · Seeking ${p.role} roles`,
    about: `I'm a final-year ${p.branch} student who enjoys turning problems into working software.\n\nRecently I ${p.project ?? "[built X using Y, used by Z people]"}. I'm comfortable with ${top} and practise aptitude and coding daily.\n\nI'm looking for ${p.role} opportunities where I can learn fast and ship real work. Happy to connect with recruiters and alumni.`,
    resumeSummary: `Final-year ${p.branch} student skilled in ${top}; ${p.project ? `built ${p.project}` : "[one project with a number]"}. Seeking a ${p.role} role.`,
    bullet: "Built [what] using [tech] for [who]; [result with a number — users, % faster, hours saved].",
  };
}
