import { z } from "zod";

/** Server env contract. Validated on boot by src/instrumentation.ts — the app refuses to start when invalid. */
const optional = z.string().optional().transform((v) => (v ? v : undefined));
export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a postgres:// URL"),
    AUTH_SECRET: optional,
    AUTH_URL: optional,
    AUTH_RESEND_KEY: optional,
    EMAIL_FROM: optional,
    ANTHROPIC_API_KEY: optional,
    ANTHROPIC_MODEL_FAST: optional,
    ANTHROPIC_MODEL_SMART: optional,
    APP_BASE_URL: optional,
    CRON_SECRET: optional,
    SUPERADMIN_EMAIL: optional,
    ALLOW_DEV_LOGIN_LINKS: optional,
  })
  .superRefine((e, ctx) => {
    if (e.NODE_ENV === "production") {
      if (!e.AUTH_SECRET || e.AUTH_SECRET.length < 32) ctx.addIssue({ code: "custom", path: ["AUTH_SECRET"], message: "required in production (openssl rand -base64 32)" });
      if (!e.CRON_SECRET || e.CRON_SECRET.length < 16) ctx.addIssue({ code: "custom", path: ["CRON_SECRET"], message: "required in production (≥16 chars)" });
    }
  });
export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(src: Record<string, string | undefined> = process.env): Env {
  const r = EnvSchema.safeParse(src);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${msg}`);
  }
  return r.data;
}
