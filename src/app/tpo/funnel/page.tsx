import { staffContext } from "@/server/staff";
import { readinessFunnel } from "@/server/services/tpo-coach";
import { TpoShell } from "@/components/TpoShell";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";
const STAGES = [["targeting", "Targeting"], ["aptitude", "Aptitude ≥ bar"], ["tech", "+ Tech ≥ 60"], ["profile", "+ Profile ≥ 80"], ["ready", "Interview-ready"]] as const;

export default async function Funnel({ searchParams }: { searchParams: Promise<{ college?: string }> }) {
  const { user, college, opts } = await staffContext((await searchParams).college);
  const f = await readinessFunnel(user, opts);
  return (
    <TpoShell title="Companies funnel" collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/tpo/funnel", label: "Companies funnel" }]}>
      <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard label="Interview-ready" value={`${f.interviewReadyPct}%`} hint={`of ${f.students} students, for at least one target`} tone={f.interviewReadyPct >= 30 ? "good" : "neutral"} />
      </section>
      <p className="mb-4 max-w-3xl text-sm text-text-600">Interview-ready = aptitude at the company&apos;s (approximate) bar, tech concepts ≥ 60, resume + LinkedIn checklist ≥ 80%, and at least one mock or 5 HR questions practised. Bars are compiled from public sources and are estimates.</p>
      {f.rows.length === 0 ? (
        <EmptyState title="No targets yet" body="Students pick target companies on their Companies tab." />
      ) : (
        <div className="space-y-4" data-testid="funnel">
          {f.rows.map((r) => (
            <section key={r.company} className="rounded-md border border-border bg-bg p-4">
              <div className="mb-4 flex items-baseline justify-between"><h2 className="font-semibold text-ink-900">{r.name}</h2><span className="text-sm text-text-600">avg readiness <b className="tabular text-text-900">{r.avgReadiness}</b></span></div>
              <ol className="space-y-2">
                {STAGES.map(([k, label]) => {
                  const n = r[k];
                  const pct = r.targeting ? Math.round((100 * n) / r.targeting) : 0;
                  return (
                    <li key={k} className="grid grid-cols-[9rem_1fr_3.5rem] items-center gap-2 text-sm">
                      <span>{label}</span>
                      <div className="h-6 overflow-hidden rounded-sm bg-surface" role="img" aria-label={`${label}: ${n} of ${r.targeting}`}><div className="h-full bg-ink-900" style={{ width: `${Math.max(pct, n ? 3 : 0)}%` }} /></div>
                      <span className="text-right tabular">{n}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </TpoShell>
  );
}
