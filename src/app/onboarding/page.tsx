import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/authz";
import { COMPANIES } from "@/lib/companies";
import { completeOnboarding, onboardingData } from "@/server/services/onboarding";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Container, PageHeader } from "@/components/ui/layout";
import { t } from "@/i18n/en";

export const dynamic = "force-dynamic";
const SELECT = "h-11 w-full rounded-sm border border-border bg-bg px-4 text-base text-text-900";

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
    <main className="min-h-dvh bg-surface">
      <Container size="reading" className="pb-16">
        <PageHeader title={t.onboarding.title} />
        {error === "consent" && (
          <p role="alert" className="mb-6 rounded-sm bg-danger-50 p-4 text-sm text-danger-700">
            {t.onboarding.mustConsent}
          </p>
        )}
        <form action={complete} className="space-y-6">
          <Card className="space-y-6">
            <Field label={t.onboarding.name} htmlFor="name">
              <Input id="name" name="name" defaultValue={me.name ?? ""} required />
            </Field>
            <Field label={t.onboarding.rollNo} htmlFor="rollNo">
              <Input id="rollNo" name="rollNo" defaultValue={me.rollNo ?? ""} />
            </Field>
            <Field label={t.onboarding.batch} htmlFor="batchId">
              <select id="batchId" name="batchId" defaultValue={me.batchId ?? ""} className={SELECT}>
                <option value="">—</option>
                {myBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.onboarding.target} htmlFor="target">
              <select id="target" name="target" defaultValue={defaultTarget} className={SELECT}>
                {COMPANIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </Card>
          <Card>
            <h2 className="text-base font-semibold text-text-900">{t.onboarding.consentTitle}</h2>
            <p className="mt-2 text-sm text-text-600">{t.onboarding.consentBody}</p>
            <label className="mt-4 flex min-h-11 items-center gap-4 text-sm text-text-900">
              <input type="checkbox" name="consent" className="h-5 w-5 shrink-0 accent-ink-900" />
              <span>
                {t.onboarding.consentCheck} (<a href="/privacy" className="text-ink-900 underline">Privacy</a>)
              </span>
            </label>
          </Card>
          <Button type="submit" size="lg" className="w-full sm:w-auto" data-cta="primary">
            {t.onboarding.submit}
          </Button>
        </form>
      </Container>
    </main>
  );
}
