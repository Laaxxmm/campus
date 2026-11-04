/** Prompt-injection + PII guards for text we send to an LLM (resume / profile fields). */
const INJECTION = [
  /ignore (all |any |the )?(previous|prior|above) (instructions|prompts?|rules)/i,
  /disregard (the |all |any )?(rules|instructions|above)/i,
  /\b(system|assistant|developer)\s*:/i,
  /you are now\b/i,
  /reveal (your|the) (system )?prompt/i,
  /<\/?\s*(system|instructions?|prompt)\s*>/i,
  /\bjailbreak\b|\bDAN\b/,
];

/** Drop lines that look like instructions to the model. Returns cleaned text + how many lines were removed. */
export function stripInjection(text: string) {
  let removed = 0;
  const kept = text.split("\n").filter((l) => {
    const bad = INJECTION.some((re) => re.test(l));
    if (bad) removed++;
    return !bad;
  });
  return { text: kept.join("\n"), removed };
}

/** Remove phone numbers, emails, URLs, PIN codes and street-address lines before any LLM call. */
export function stripPii(text: string) {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/(\+?91[\s-]?)?\b\d{5}[\s-]?\d{5}\b/g, "[phone]")
    .replace(/\+\d[\d\s-]{8,}\d/g, "[phone]")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[link]")
    .replace(/\b\d{6}\b/g, "[pin]")
    .split("\n")
    .filter((l) => !/\b(door no|flat no|street|nagar|road|lane|district|taluk)\b/i.test(l))
    .join("\n");
}

export function sanitizeForLlm(text: string, maxChars = 8000) {
  const inj = stripInjection(text);
  return { text: stripPii(inj.text).slice(0, maxChars), removedInstructionLines: inj.removed };
}
