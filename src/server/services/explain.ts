import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attempts, explanationsCache, questions } from "@/db/schema";
import { aiEnabled, anthropic, MODELS, textOf } from "@/lib/llm";

const SYSTEM = `You are a patient aptitude tutor for Indian engineering students preparing for campus placement tests.
Given a multiple-choice question, the correct option and the option the student chose, explain in at most 110 words:
1) the likely mistake that leads to the chosen option, 2) the correct method step by step, 3) a one-line tip.
Plain text, no markdown headings, Unicode math, encouraging tone. Never mention the student by name.`;

export class ExplainError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** "Explain more" for a wrong answer. Only after the student has attempted the question; cached per (question, wrong option). */
export async function explainMore(studentId: string, questionId: string) {
  if (!aiEnabled()) throw new ExplainError(404, "Explain more is not enabled");
  const [att] = await db
    .select({ chosen: attempts.chosenIndex, correct: attempts.correct })
    .from(attempts)
    .where(and(eq(attempts.userId, studentId), eq(attempts.questionId, questionId)))
    .orderBy(desc(attempts.createdAt))
    .limit(1);
  if (!att) throw new ExplainError(403, "Answer the question first");
  if (att.correct || att.chosen === null) throw new ExplainError(400, "Explain more is for wrong answers");
  const [hit] = await db.select().from(explanationsCache).where(and(eq(explanationsCache.questionId, questionId), eq(explanationsCache.wrongIndex, att.chosen)));
  if (hit) return { text: hit.text, cached: true };
  const [q] = await db.select().from(questions).where(eq(questions.id, questionId));
  if (!q) throw new ExplainError(404, "question not found");
  const L = ["A", "B", "C", "D"];
  const prompt = `Question:\n${q.stem}\n\nOptions:\n${q.options.map((o, i) => `${L[i]}. ${o}`).join("\n")}\n\nCorrect: ${L[q.answerIndex]}\nStudent chose: ${L[att.chosen]}\nBank explanation: ${q.explanation}`;
  const msg = await anthropic().messages.create({
    model: MODELS.fast(),
    max_tokens: 1200,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.stop_reason === "refusal" ? "" : textOf(msg).trim().slice(0, 1500);
  if (!text) throw new ExplainError(502, "Couldn't generate an explanation right now");
  await db.insert(explanationsCache).values({ questionId, wrongIndex: att.chosen, text, model: MODELS.fast() }).onConflictDoNothing();
  return { text, cached: false };
}
