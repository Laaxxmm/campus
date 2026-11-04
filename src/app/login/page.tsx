import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n/en";

async function sendLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = String(formData.get("next") ?? "");
  if (!email) redirect("/login?error=missing");
  try {
    await signIn("resend", { email, redirectTo: next.startsWith("/") ? next : "/home" });
  } catch (e) {
    if (e instanceof AuthError) redirect("/login?error=send");
    throw e; // NEXT_REDIRECT
  }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const msg = error === "not_invited" || error === "AccessDenied" ? t.login.notInvited : error ? t.login.genericError : null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <div className="mb-8 text-2xl font-bold text-ink-900">{t.appName}</div>
      <h1 className="text-xl font-semibold">{t.login.title}</h1>
      <p className="mt-1 text-sm text-text-600">{t.login.subtitle}</p>
      {msg && (
        <p role="alert" className="mt-4 rounded-md bg-danger-50 p-3 text-sm text-danger-500">
          {msg}
        </p>
      )}
      <form action={sendLink} className="mt-6 space-y-3">
        <label className="block text-sm font-medium" htmlFor="email">
          {t.login.email}
        </label>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required placeholder="you@college.edu.in" />
        <input type="hidden" name="next" value={next ?? ""} />
        <Button type="submit" size="lg">
          {t.login.submit}
        </Button>
      </form>
    </main>
  );
}
