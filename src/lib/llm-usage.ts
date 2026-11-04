import { db } from "@/db";
import { llmUsage } from "@/db/schema";

/** USD per 1M tokens (input, output) — Claude API list prices; cache reads ≈ 10% of input. */
const PRICE: Record<string, [number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-sonnet-5-5": [2, 10],
  "claude-opus-5-5": [4, 20],
};
export function costUsd(model: string, input: number, output: number, cached = 0) {
  const [i, o] = PRICE[model] ?? [2, 10];
  return ((input - cached) * i + cached * i * 0.1 + output * o) / 1_000_000;
}
type Usage = { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number | null };
export async function logLlmUsage(feature: string, model: string, usage: Usage | undefined, who: { userId?: string | null; collegeId?: string | null } = {}) {
  const input = (usage?.input_tokens ?? 0) + (usage?.cache_read_input_tokens ?? 0);
  const output = usage?.output_tokens ?? 0;
  const cached = usage?.cache_read_input_tokens ?? 0;
  try {
    await db.insert(llmUsage).values({ feature, model, userId: who.userId ?? null, collegeId: who.collegeId ?? null, inputTokens: input, outputTokens: output, cachedTokens: cached, costUsd: costUsd(model, input, output, cached) });
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "llm usage log failed", err: String(e) }));
  }
}
