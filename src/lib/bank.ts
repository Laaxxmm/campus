import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { collegeQuestionAccess, colleges, questions } from "@/db/schema";
import { hashString } from "./rng";

export const ACCESS_PERCENT = 60;

/** Deterministic per-college subset: same college + question → same answer, forever. */
export function inCollegeSubset(bankSeed: number, questionId: string) {
  return hashString(`${bankSeed}:${questionId}`) % 100 < ACCESS_PERCENT;
}

/** Grants each college its 60% subset of golden questions (idempotent). Returns rows inserted. */
export async function syncCollegeAccess(collegeId?: string) {
  const cols = await db.select().from(colleges).where(collegeId ? eq(colleges.id, collegeId) : undefined);
  const golden = await db.select({ id: questions.id }).from(questions).where(eq(questions.status, "golden"));
  let inserted = 0;
  for (const c of cols) {
    const rows = golden.filter((q) => inCollegeSubset(c.bankSeed, q.id)).map((q) => ({ collegeId: c.id, questionId: q.id }));
    for (let i = 0; i < rows.length; i += 1000) {
      const r = await db.insert(collegeQuestionAccess).values(rows.slice(i, i + 1000)).onConflictDoNothing().returning();
      inserted += r.length;
    }
  }
  return inserted;
}

/** Access rows for a set of question ids (used by content review to grant newly-approved questions). */
export async function grantNewQuestion(questionIds: string[]) {
  if (!questionIds.length) return 0;
  const cols = await db.select().from(colleges);
  const rows = cols.flatMap((c) => questionIds.filter((id) => inCollegeSubset(c.bankSeed, id)).map((id) => ({ collegeId: c.id, questionId: id })));
  if (!rows.length) return 0;
  const r = await db.insert(collegeQuestionAccess).values(rows).onConflictDoNothing().returning();
  return r.length;
}

export async function accessibleCount(collegeId: string) {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(collegeQuestionAccess)
    .innerJoin(questions, eq(questions.id, collegeQuestionAccess.questionId))
    .where(and(eq(collegeQuestionAccess.collegeId, collegeId), eq(questions.status, "golden")));
  return r?.n ?? 0;
}
