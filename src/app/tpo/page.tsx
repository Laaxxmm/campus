import Link from "next/link";
import { staffContext } from "@/server/staff";
import { heatmap, overview } from "@/server/services/tpo";
import { readinessFunnel } from "@/server/services/tpo-coach";
import { companyName } from "@/lib/companies";
import { TpoShell } from "@/components/TpoShell";
import { KpiCard } from "@/components/KpiCard";
import { Heatmap } from "@/components/Heatmap";
import { EmptyState } from "@/components/EmptyState";
import { Section } from "@/components/ui/layout";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const metaLink = "inline-flex min-h-11 items-center text-sm text-info-500 underline hover:text-ink-900";

export default async function TpoOverview({ searchParams }: { searchParams: Promise<{ college?: string }> }) {
  const { user, college, opts } = await staffContext((await searchParams).college);
  const [o, h, f] = await Promise.all([overview(user, opts), heatmap(user, opts), readinessFunnel(user, opts)]);
  const risk = o.rows.filter((r) => r.atRisk).sort((a, b) => (b.inactiveDays ?? 999) - (a.inactiveDays ?? 999)).slice(0, 8);
  return (
    <TpoShell title="Overview" subtitle={o.total ? `Placement readiness across ${o.total} students` : undefined} collegeName={college.name}>
      {o.total === 0 ? (
        <EmptyState title="No students yet" body="Import your roster to get started.">
          <Link href="/admin/import" className={buttonVariants({ variant: "cta", className: "mt-6" })} data-cta="primary">Import roster CSV</Link>
        </EmptyState>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 xl:grid-cols-6" aria-label="Key numbers" data-testid="kpis">
            <KpiCard label="Interview-ready" value={`${f.interviewReadyPct}%`} hint="aptitude + tech + profile gates" />
            <KpiCard label="Weekly active" value={`${o.weeklyActivePct}%`} hint={`of ${o.total} students · goal ≥ 60%`} tone={o.weeklyActivePct >= 60 ? "good" : "neutral"} />
            <KpiCard label="Median streak" value={`${o.medianStreak}d`} hint="goal ≥ 5 days" tone={o.medianStreak >= 5 ? "good" : "neutral"} />
            <KpiCard label="Avg readiness" value={o.avgReadiness ?? "—"} hint="for each student's target company" />
            <KpiCard label="At risk" value={o.atRisk} hint="inactive ≥ 5 days or readiness < 40" tone={o.atRisk ? "bad" : "good"} />
            <KpiCard label="Drills this week" value={o.drillsThisWeek} hint="completed since Monday" />
          </section>
          <Section title="Topic accuracy by batch · last 30 days" meta={<Link href="/tpo/heatmap" className={metaLink}>Filter by company or drill into a batch</Link>}>
            <Heatmap topics={h.topics} rows={h.rows} metric={h.metric} rowLabel="Batch" rowHref={(id) => `/tpo/heatmap?batch=${id}`} />
          </Section>
          <Section title="Needs a nudge" meta={<Link href="/tpo/at-risk" className={metaLink}>All {o.atRisk} at-risk students</Link>}>
            <div className="overflow-x-auto rounded-md border border-border bg-bg" tabIndex={0} role="region" aria-label="Students who need a nudge">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0 bg-surface text-left text-xs font-medium uppercase tracking-wide text-text-600"><tr><th scope="col" className="px-4 py-2">Student</th><th scope="col" className="px-4 py-2">Batch</th><th scope="col" className="px-4 py-2">Why</th><th scope="col" className="px-4 py-2">Target</th></tr></thead>
                <tbody>
                  {risk.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-2"><Link href={`/tpo/students/${r.id}`} className="font-medium text-ink-900 hover:underline">{r.name}</Link></td>
                      <td className="px-4 py-2">{r.batch ?? "—"}</td>
                      <td className="px-4 py-2 text-text-600">{r.atRiskReasons.join(" · ")}</td>
                      <td className="px-4 py-2">{companyName(r.target)}</td>
                    </tr>
                  ))}
                  {!risk.length && <tr><td colSpan={4} className="px-4 py-4 text-text-600">Nobody at risk right now.</td></tr>}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </TpoShell>
  );
}
