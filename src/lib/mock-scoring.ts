/** Pure mock scoring + timing helpers (server-only callers; tested in mock-scoring.test.ts). */
import type { SectionScore } from "./mock-types";

export type ScoredQ = { id: string; section: string; answerIndex: number };
export type StoredAnswer = { choice: number | null; flagged: boolean; visited: boolean; timeMs: number; changes?: number }; // canonical choice

export function scoreAttempt(qs: ScoredQ[], answers: Record<string, StoredAnswer>, markCorrect: number, negativeMark: number) {
  const bySection = new Map<string, SectionScore>();
  let correct = 0, wrong = 0, skipped = 0, timeMs = 0;
  for (const q of qs) {
    const s = bySection.get(q.section) ?? { section: q.section, total: 0, correct: 0, wrong: 0, skipped: 0, marks: 0, timeMs: 0 };
    const a = answers[q.id];
    s.total++;
    s.timeMs += a?.timeMs ?? 0;
    timeMs += a?.timeMs ?? 0;
    if (!a || a.choice === null || a.choice === undefined) {
      s.skipped++;
      skipped++;
    } else if (a.choice === q.answerIndex) {
      s.correct++;
      s.marks += markCorrect;
      correct++;
    } else {
      s.wrong++;
      s.marks -= negativeMark;
      wrong++;
    }
    bySection.set(q.section, s);
  }
  const sections = [...bySection.values()].map((s) => ({ ...s, marks: round2(s.marks) }));
  const marks = round2(correct * markCorrect - wrong * negativeMark);
  return { sections, correct, wrong, skipped, marks, maxMarks: round2(qs.length * markCorrect), timeMs };
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Percentile rank within a cohort: % of others strictly below + half of ties. */
export function percentileRank(mine: number, cohort: number[]) {
  if (cohort.length <= 1) return null;
  const below = cohort.filter((x) => x < mine).length;
  const equal = cohort.filter((x) => x === mine).length - 1; // exclude self
  return Math.round((100 * (below + equal / 2)) / (cohort.length - 1));
}

/** Sectional timing: each section's slice of the total duration ∝ its question count, in blueprint order. */
export function sectionDeadlines(start: Date, durationSec: number, sections: { section: string; count: number }[]) {
  const total = sections.reduce((s, x) => s + x.count, 0) || 1;
  let t = start.getTime();
  const out: Record<string, string> = {};
  for (const s of sections) {
    t += Math.round((durationSec * 1000 * s.count) / total);
    out[s.section] = new Date(t).toISOString();
  }
  return out;
}

/** Which section is open at `now` under sectional timing (null = time over). */
export function openSection(deadlines: Record<string, string>, now: Date) {
  for (const [section, end] of Object.entries(deadlines)) if (now.getTime() < new Date(end).getTime()) return section;
  return null;
}

export const SAVE_GRACE_MS = 5_000; // network grace for the last autosave
