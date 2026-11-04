import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { getProfile, getTargets, listProfiles, MAX_TARGETS, readinessFor, studentSignals } from "@/server/services/companies";
import { saveTargets } from "@/app/actions/companies";
import { StudentPage } from "@/components/StudentPage";
import { Section } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function Companies({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = requireRole(await requireUser(), ["student"]);
  const sp = await searchParams;
  const [profiles, targets, signals] = await Promise.all([listProfiles(), getTargets(user.id), studentSignals(user.id)]);
  const picked = targets.filter((t) => !t.isDream).map((t) => t.company);
  const dream = targets.find((t) => t.isDream);
  const cards = [];
  for (const key of [...picked, ...(dream && !dream.company.startsWith("dream:") ? [dream.company] : [])]) {
    const p = await getProfile(key);
    if (p) cards.push({ p, r: await readinessFor(p, signals), dream: dream?.company === key });
  }
  return (
    <StudentPage
      width="app"
      title="Companies"
      subtitle="Your crack-path for each target: the bar, the rounds, and what to practise next. Preparation guidance — never a promise of selection."
    >
      <Section>
        {cards.length === 0 && <p className="mb-6 rounded-sm border border-accent-500 bg-accent-50 p-4 text-base text-ink-900">Pick your target companies below to see your gap to each bar.</p>}
        <ul className="grid items-stretch gap-6 lg:grid-cols-2" data-testid="company-cards">
          {cards.map(({ p, r, dream }) => (
            <li key={p.key}>
              <Link href={`/companies/${p.key}`} className="flex h-full flex-col rounded-md border border-border bg-bg p-6 shadow-e1 transition-shadow duration-150 hover:border-ink-700 hover:shadow-e2 lg:p-8">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-lg font-semibold text-ink-900">
                    {p.name} {dream && <Star aria-label="dream company" className="inline h-4 w-4 text-accent-600" fill="var(--accent-500)" />}
                  </span>
                  <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-text-600" />
                </div>
                <div className="mt-6">
                  <div className="text-xs font-medium uppercase tracking-wide text-text-600">Readiness</div>
                  <div className="mt-2 text-5xl font-bold leading-none text-ink-900 tabular" data-testid="company-readiness">{r.score}</div>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                  <Badge tone={r.aptitude.score >= 80 ? "success" : "warn"}>Aptitude {r.aptitude.score}</Badge>
                  <Badge tone={r.tech.score >= 60 ? "success" : "warn"}>Tech {r.tech.score}</Badge>
                  <Badge>Consistency {r.consistency.score}</Badge>
                  <Badge>Profile {r.profile.score}</Badge>
                  {r.interviewReady && <Badge tone="success">Interview-ready</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {dream?.company.startsWith("dream:") && (
          <p className="mt-6 text-base text-text-600">
            <Star aria-hidden className="mr-2 inline h-4 w-4 text-accent-600" />
            Dream: {dream.dreamName} — we don&apos;t have a verified profile for it yet; your readiness for the closest pattern above still applies.
          </p>
        )}
      </Section>

      <Section>
        <form action={saveTargets} className="rounded-md border border-border bg-bg p-6 lg:p-8" data-testid="target-picker">
          <h2 className="text-lg font-semibold text-ink-900">Your targets (up to {MAX_TARGETS})</h2>
          {sp.error && <p role="alert" className="mt-4 text-sm text-danger-700">{sp.error}</p>}
          {sp.saved && <p role="status" className="mt-4 text-sm text-success-700">Saved.</p>}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {profiles.map((p) => (
              <label key={p.key} className="flex min-h-11 items-center gap-2 rounded-sm border border-border px-4 text-sm hover:border-ink-700">
                <input type="checkbox" name="companies" value={p.key} defaultChecked={picked.includes(p.key)} className="h-5 w-5 shrink-0 accent-ink-900" />
                {p.name}
              </label>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end">
            <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-text-900">
              Dream company (optional)
              <Input name="dream" defaultValue={dream?.dreamName ?? ""} placeholder="e.g. Zoho, Google" className="font-normal" />
            </label>
            <Button type="submit" variant="primary" className="w-full lg:w-auto" data-cta="primary">
              Save targets
            </Button>
          </div>
        </form>
      </Section>
    </StudentPage>
  );
}
