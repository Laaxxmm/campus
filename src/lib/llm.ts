import Anthropic from "@anthropic-ai/sdk";

/** Offline pipeline + optional explain-more only. Never used in grading/drill building. */
export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
export const MODELS = {
  fast: () => process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-5-5",
  smart: () => process.env.ANTHROPIC_MODEL_SMART || "claude-sonnet-5-5",
  best: () => process.env.ANTHROPIC_MODEL_BEST || "claude-opus-5-5",
};
let client: Anthropic | null = null;
export function anthropic() {
  if (!aiEnabled()) throw new Error("ANTHROPIC_API_KEY not set");
  return (client ??= new Anthropic());
}
export function textOf(msg: Anthropic.Message) {
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}
/** Extract the first JSON object from model text (tolerates stray fences). */
export function parseJsonObject<T = unknown>(text: string): T {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s < 0 || e < s) throw new Error("no JSON object in model output");
  return JSON.parse(text.slice(s, e + 1)) as T;
}
