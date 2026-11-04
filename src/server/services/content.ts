import { and, asc, desc, eq, ilike, inArray, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { audit } from "@/lib/audit";
import { grantNewQuestion } from "@/lib/bank";
import { requireRole, type SessionUser } from "@/lib/authz";
import { wordCount } from "@/lib/question-schema";

type Reviewer = Pick<SessionUser, "id" | "role" | "collegeId">;
const STATUSES = ["draft", "review", "golden", "retired"] as const;
export type Status = (typeof STATUSES)[number];

export async function listForReview(user: Reviewer, f: { status?: string; topic?: string; flag?: string; q?: string; page?: number }) {
  requireRole(user, ["content"]);
  const status = (STATUSES as readonly string[]).includes(f.status ?? "") ? (f.status as Status) : null;
  const conds: SQL[] = [];
  if (status) conds.push(eq(questions.status, status));
  else conds.push(inArray(questions.status, ["draft", "review"]));
  if (f.topic) conds.push(eq(questions.topic, f.topic));
  if (f.flag === "qa_failed") conds.push(sql`(${questions.qaFlags}->>'passed')::boolean = false`);
  if (f.flag === "qa_passed") conds.push(sql`(${questions.qaFlags}->>'passed')::boolean = true`);
  if (f.flag === "unchecked") conds.push(sql`${questions.qaFlags} is null`);
  if (f.q) conds.push(ilike(questions.stem, `%${f.q.replace(/[%_]/g, "")}%`));
  const page = Math.max(1, f.page ?? 1);
  const where = and(...conds);
  const rows = await db.select().from(questions).where(where).orderBy(desc(questions.status), asc(questions.id)).limit(50).offset((page - 1) * 50);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(questions).where(where);
  const counts = await db.select({ status: questions.status, n: sql<number>`count(*)::int` }).from(questions).groupBy(questions.status);
  return { rows, total: n, page, counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) as Record<Status, number> };
}

/** Approve → golden, then grant each college its deterministic subset so the next drill build can use it. */
export async function approve(user: Reviewer, ids: string[]) {
  requireRole(user, ["content"]);
  if (!ids.length) return 0;
  const updated = await db.update(questions).set({ status: "golden" }).where(and(inArray(questions.id, ids), inArray(questions.status, ["draft", "review"]))).returning({ id: questions.id });
  const granted = await grantNewQuestion(updated.map((u) => u.id));
  for (const u of updated) await audit(user, "question.publish", { type: "question", id: u.id, collegeId: null, meta: { granted } });
  return updated.length;
}

export async function approveAllQaPassed(user: Reviewer) {
  requireRole(user, ["content"]);
  const rows = await db.select({ id: questions.id }).from(questions).where(and(eq(questions.status, "draft"), sql`(${questions.qaFlags}->>'passed')::boolean = true`));
  return approve(user, rows.map((r) => r.id));
}

export async function retire(user: Reviewer, id: string) {
  requireRole(user, ["content"]);
  const [q] = await db.update(questions).set({ status: "retired" }).where(eq(questions.id, id)).returning({ id: questions.id });
  if (q) await audit(user, "question.retire", { type: "question", id, collegeId: null });
  return Boolean(q);
}

export const EditInput = z
  .object({
    stem: z.string().trim().min(10).max(2500),
    o0: z.string().trim().min(1).max(300),
    o1: z.string().trim().min(1).max(300),
    o2: z.string().trim().min(1).max(300),
    o3: z.string().trim().min(1).max(300),
    answerIndex: z.coerce.number().int().min(0).max(3),
    explanation: z.string().trim().min(5),
    shortcut: z.string().trim().max(200).optional().transform((v) => v || null),
    difficulty: z.coerce.number().int().min(1).max(5),
  })
  .superRefine((v, ctx) => {
    if (new Set([v.o0, v.o1, v.o2, v.o3].map((o) => o.toLowerCase())).size !== 4) ctx.addIssue({ code: "custom", message: "options must be unique" });
    if (wordCount(v.explanation) > 80) ctx.addIssue({ code: "custom", message: "explanation must be ≤ 80 words" });
  });

/** Edit bumps version; an edited golden question goes back to review so a second person checks it. */
export async function edit(user: Reviewer, id: string, raw: unknown) {
  requireRole(user, ["content"]);
  const v = EditInput.parse(raw);
  const [cur] = await db.select().from(questions).where(eq(questions.id, id));
  if (!cur) throw new Error("question not found");
  await db
    .update(questions)
    .set({ stem: v.stem, options: [v.o0, v.o1, v.o2, v.o3], answerIndex: v.answerIndex, explanation: v.explanation, shortcut: v.shortcut, difficulty: v.difficulty, version: cur.version + 1, status: cur.status === "golden" ? "review" : cur.status })
    .where(eq(questions.id, id));
  await audit(user, "question.edit", { type: "question", id, collegeId: null, meta: { fromVersion: cur.version } });
}
