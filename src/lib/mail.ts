import { Resend } from "resend";

type LinkStore = Map<string, { url: string; at: number }>;
const g = globalThis as unknown as { __magicLinks?: LinkStore };
export const devLinks: LinkStore = (g.__magicLinks ??= new Map());

export function resendEnabled() {
  return Boolean(process.env.AUTH_RESEND_KEY);
}

/** Dev/test fallback is exposed over HTTP only when explicitly allowed or outside production. */
export function devLinksExposed() {
  if (process.env.ALLOW_DEV_LOGIN_LINKS === "true") return true;
  return !resendEnabled() && process.env.NODE_ENV !== "production";
}

export async function sendMail(to: string, subject: string, html: string, text: string) {
  if (!resendEnabled()) {
    console.log(`[mail:console] to=${to} subject="${subject}"\n${text}`);
    return { ok: true, console: true } as const;
  }
  const resend = new Resend(process.env.AUTH_RESEND_KEY);
  const from = process.env.EMAIL_FROM ?? "LearnCrew <no-reply@learncrew.in>";
  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) throw new Error(`Resend error: ${error.message}`);
  return { ok: true, console: false } as const;
}

export async function sendMagicLink(email: string, url: string) {
  const to = email.toLowerCase();
  if (!resendEnabled() || process.env.ALLOW_DEV_LOGIN_LINKS === "true") {
    devLinks.set(to, { url, at: Date.now() });
    console.log(`[auth] magic link for ${to}: ${url}`);
    if (!resendEnabled()) return;
  }
  const host = new URL(url).host;
  await sendMail(
    to,
    "Your LearnCrew login link",
    `<p>Tap to log in to LearnCrew (${host}):</p><p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#4F46E5;color:#fff;border-radius:12px;text-decoration:none">Log in</a></p><p>Link valid for 24 hours. If you didn't ask for it, ignore this email.</p>`,
    `Log in to LearnCrew: ${url}\nValid for 24 hours.`,
  );
}
