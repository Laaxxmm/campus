import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/authz";
import { COMPANIES } from "@/lib/companies";
import { completeOnboarding, onboardingData } from "@/server/services/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n/en";

export const dynamic = "force-dynamic";

async function complete(formData: FormData) {
  "use server";
  const user = requireRole(await requireUser(), ["student"]);
  if (formData.get("consent") !== "on") redirect("/onboarding?error=consent");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const rollNo = String(formData.get("rollNo") ?? "").trim().slice(0, 40);
  const batchId = String(formData.get("batchId") ?? "");
  const target = String(formData.get("target") ?? "");

  await completeOnboarding(user, { name, rollNo, batchId, target });
  redirect("/today");
}

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sessionUser = requireRole(await requireUser(), ["student"]);
  const { error } = await searchParams;
  const { me, batches: myBatches } = await onboardingData(sessionUser.id);
  const defaultTarget = me.targetCompany ?? myBatches.find((b) => b.id === me.batchId)?.targetCompany ?? "tcs_nqt";

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-bold">{t.onboarding.title}</h1>
      {error === "consent" && (
        <p role="alert" className="mt-3 rounded-md bg-danger-50 p-3 text-sm text-danger-700">
          {t.onboarding.mustConsent}
        </p>
      )}
      <form action={complete} className="mt-4 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">{t.onboarding.name}</label>
          <Input id="name" name="name" defaultValue={me.name ?? ""} required />
        </div>
        <div>
          <label htmlFor="rollNo" className="block text-sm font-medium">{t.onboarding.rollNo}</label>
          <Input id="rollNo" name="rollNo" defaultValue={me.rollNo ?? ""} />
        </div>
        <div>
          <label htmlFor="batchId" className="block text-sm font-medium">{t.onboarding.batch}</label>
          <select id="batchId" name="batchId" defaultValue={me.batchId ?? ""} className="h-11 w-full rounded-md border border-border bg-bg px-3">
            <option value="">—</option>
            {myBatches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="target" className="block text-sm font-medium">{t.onboarding.target}</label>
          <select id="target" name="target" defaultValue={defaultTarget} className="h-11 w-full rounded-md border border-border bg-bg px-3">
            {COMPANIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <section className="rounded-md border border-border bg-bg p-3 text-sm">
          <h2 className="font-semibold">{t.onboarding.consentTitle}</h2>
          <p className="mt-1 text-text-600">{t.onboarding.consentBody}</p>
          <label className="mt-3 flex min-h-11 items-center gap-3">
            <input type="checkbox" name="consent" className="h-5 w-5 accent-ink-900" />
            <span>
              {t.onboarding.consentCheck} (<a href="/privacy" className="text-ink-900 underline">Privacy</a>)
            </span>
          </label>
        </section>
        <Button type="submit" size="lg">{t.onboarding.submit}</Button>
      </form>
    </main>
  );
}
