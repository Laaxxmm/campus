import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { getProfile, getTargets, listProfiles, MAX_TARGETS, readinessFor, studentSignals } from "@/server/services/companies";
import { saveTargets } from "@/app/actions/companies";
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
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink-900">Companies</h1>
      <p className="text-sm text-text-600">Your crack-path for each target: the bar, the rounds, and what to practise next. Preparation guidance — never a promise of selection.</p>
      {cards.length === 0 && <p className="rounded-sm bg-accent-50 p-3 text-sm">Pick your target companies below to see your gap to each bar.</p>}
      <ul className="space-y-3" data-testid="company-cards">
        {cards.map(({ p, r, dream }) => (
          <li key={p.key}>
            <Link href={`/companies/${p.key}`} className="block rounded-md border border-border bg-bg p-4 shadow-sm hover:border-ink-700">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink-900">{p.name} {dream && <Star aria-label="dream company" className="inline h-4 w-4 text-accent-600" fill="var(--accent-500)" />}</span>
                <span className="flex items-center gap-2"><span className="text-2xl font-bold tabular" data-testid="company-readiness">{r.score}</span><ChevronRight aria-hidden className="h-5 w-5 text-text-600" /></span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
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
      {dream?.company.startsWith("dream:") && <p className="text-sm text-text-600"><Star aria-hidden className="mr-1 inline h-4 w-4 text-accent-600" />Dream: {dream.dreamName} — we don&apos;t have a verified profile for it yet; your readiness for the closest pattern above still applies.</p>}

      <form action={saveTargets} className="space-y-3 rounded-md border border-border bg-bg p-4" data-testid="target-picker">
        <h2 className="font-semibold text-ink-900">Your targets (up to {MAX_TARGETS})</h2>
        {sp.error && <p role="alert" className="text-sm text-danger-500">{sp.error}</p>}
        {sp.saved && <p role="status" className="text-sm text-success-700">Saved.</p>}
        <div className="grid grid-cols-2 gap-2">
          {profiles.map((p) => (
            <label key={p.key} className="flex min-h-11 items-center gap-2 rounded-sm border border-border px-3 text-sm">
              <input type="checkbox" name="companies" value={p.key} defaultChecked={picked.includes(p.key)} className="h-5 w-5 accent-ink-900" />{p.name}
            </label>
          ))}
        </div>
        <label className="block text-sm">Dream company (optional)<Input name="dream" defaultValue={dream?.dreamName ?? ""} placeholder="e.g. Zoho, Google" className="mt-1" /></label>
        <Button type="submit" variant="secondary" className="w-full">Save targets</Button>
      </form>
    </div>
  );
}
