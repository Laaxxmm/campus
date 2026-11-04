import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn } from "@/auth";
import { hit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { t } from "@/i18n/en";

async function sendLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = String(formData.get("next") ?? "");
  if (!email || email.length > 254) redirect("/login?error=missing");
  const ip = clientIp({ headers: await headers() });
  // Per ip+email only: campus Wi-Fi puts hundreds of students behind one NAT IP (D18).
  const limit = await hit("login", `${ip}|${email}`);
  if (!limit.ok) redirect("/login?error=rate");
  try {
    await signIn("resend", { email, redirectTo: next.startsWith("/") ? next : "/home" });
  } catch (e) {
    if (e instanceof AuthError) redirect("/login?error=send");
    throw e; // NEXT_REDIRECT
  }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const msg = error === "not_invited" || error === "AccessDenied" ? t.login.notInvited : error === "rate" ? t.login.rateLimited : error ? t.login.genericError : null;
  return (
    <main className="min-h-dvh bg-surface">
      <Container size="reading" className="flex min-h-dvh flex-col justify-center py-12">
        <div className="mb-8 text-2xl font-bold text-ink-900">{t.appName}</div>
        <Card>
          <h1 className="text-2xl font-semibold text-ink-900">{t.login.title}</h1>
          <p className="mt-2 text-base text-text-600">{t.login.subtitle}</p>
          {msg && (
            <p role="alert" className="mt-6 rounded-sm bg-danger-50 p-4 text-sm text-danger-700">
              {msg}
            </p>
          )}
          <form action={sendLink} className="mt-6 space-y-6">
            <Field label={t.login.email} htmlFor="email">
              <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required placeholder="you@college.edu.in" />
            </Field>
            <input type="hidden" name="next" value={next ?? ""} />
            <Button type="submit" size="lg" className="w-full" data-cta="primary">
              {t.login.submit}
            </Button>
          </form>
        </Card>
      </Container>
    </main>
  );
}
