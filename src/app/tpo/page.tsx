import Link from "next/link";
import { staffContext } from "@/server/staff";
import { heatmap, overview } from "@/server/services/tpo";
import { readinessFunnel } from "@/server/services/tpo-coach";
import { companyName } from "@/lib/companies";
import { TpoShell } from "@/components/TpoShell";
import { KpiCard } from "@/components/KpiCard";
import { Heatmap } from "@/components/Heatmap";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function TpoOverview({ searchParams }: { searchParams: Promise<{ college?: string }> }) {
  const { user, college, opts } = await staffContext((await searchParams).college);
  const [o, h, f] = await Promise.all([overview(user, opts), heatmap(user, opts), readinessFunnel(user, opts)]);
  const risk = o.rows.filter((r) => r.atRisk).sort((a, b) => (b.inactiveDays ?? 999) - (a.inactiveDays ?? 999)).slice(0, 8);
  return (
    <TpoShell title="Overview" collegeName={college.name}>
      {o.total === 0 ? (
        <EmptyState title="No students yet" body="Import your roster to get started.">
          <Link href="/admin/import" className="mt-3 inline-block font-semibold text-info-500 underline">Import roster CSV</Link>
        </EmptyState>
      ) : (
        <div className="space-y-8">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-6" aria-label="Key numbers" data-testid="kpis">
            <KpiCard label="Interview-ready" value={`${f.interviewReadyPct}%`} hint="aptitude + tech + profile gates" />
            <KpiCard label="Weekly active" value={`${o.weeklyActivePct}%`} hint={`of ${o.total} students · goal ≥ 60%`} tone={o.weeklyActivePct >= 60 ? "good" : "neutral"} />
            <KpiCard label="Median streak" value={`${o.medianStreak}d`} hint="goal ≥ 5 days" tone={o.medianStreak >= 5 ? "good" : "neutral"} />
            <KpiCard label="Avg readiness" value={o.avgReadiness ?? "—"} hint="for each student's target company" />
            <KpiCard label="At risk" value={o.atRisk} hint="inactive ≥ 5 days or readiness < 40" tone={o.atRisk ? "bad" : "good"} />
            <KpiCard label="Drills this week" value={o.drillsThisWeek} hint="completed since Monday" />
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">Topic accuracy by batch · last 30 days</h2>
              <Link href="/tpo/heatmap" className="text-sm text-info-500 underline">Filter by company or drill into a batch</Link>
            </div>
            <Heatmap topics={h.topics} rows={h.rows} metric={h.metric} rowLabel="Batch" rowHref={(id) => `/tpo/heatmap?batch=${id}`} />
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">Needs a nudge</h2>
              <Link href="/tpo/at-risk" className="text-sm text-info-500 underline">All {o.atRisk} at-risk students</Link>
            </div>
            <div className="overflow-x-auto rounded-md border border-border bg-bg">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-xs text-text-600"><tr><th className="px-3 py-2">Student</th><th className="px-3 py-2">Batch</th><th className="px-3 py-2">Why</th><th className="px-3 py-2">Target</th></tr></thead>
                <tbody>
                  {risk.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2"><Link href={`/tpo/students/${r.id}`} className="font-medium hover:underline">{r.name}</Link></td>
                      <td className="px-3 py-2">{r.batch ?? "—"}</td>
                      <td className="px-3 py-2 text-text-600">{r.atRiskReasons.join(" · ")}</td>
                      <td className="px-3 py-2">{companyName(r.target)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </TpoShell>
  );
}
