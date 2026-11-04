/** Structured JSON logs (one line per event; Railway parses JSON). Never log emails/names — ids only. */
type Level = "debug" | "info" | "warn" | "error";
function emit(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...fields });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}
export const log = {
  debug: (m: string, f?: Record<string, unknown>) => process.env.LOG_LEVEL === "debug" && emit("debug", m, f),
  info: (m: string, f?: Record<string, unknown>) => emit("info", m, f),
  warn: (m: string, f?: Record<string, unknown>) => emit("warn", m, f),
  error: (m: string, f?: Record<string, unknown>) => emit("error", m, f),
};
