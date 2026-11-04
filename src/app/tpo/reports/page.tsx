import { staffContext } from "@/server/staff";
import { weeklyReport } from "@/server/services/reports";
import { TpoShell } from "@/components/TpoShell";
import { KpiCard } from "@/components/KpiCard";
import { PrintButton } from "@/components/tpo/PrintButton";

export const dynamic = "force-dynamic";

export default async function Reports({ searchParams }: { searchParams: Promise<{ college?: string }> }) {
  const { user, college, collegeId } = await staffContext((await searchParams).college);
  const r = await weeklyReport(user, collegeId);
  const s = r.stats;
  const max = Math.max(100, ...s.readinessTrend.map((t) => t.avg));
  return (
    <TpoShell title={`Weekly report · ${s.week}`} collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/tpo/reports", label: "Reports" }]} actions={<PrintButton />}>
      <article className="space-y-6 rounded-md border border-border bg-bg p-6 print:border-0 print:p-0" data-testid="weekly-report">
        <header>
          <p className="text-sm text-text-600">{college.name} · placement readiness · week {s.week}</p>
          <p className="mt-3 max-w-3xl text-base leading-relaxed" data-testid="narrative">{r.narrative}</p>
          <p className="mt-2 text-xs text-text-600">{r.model === "template" ? "Summary generated from your numbers." : `Summary drafted by AI (${r.model}) from aggregated numbers only — no student names were shared.`}</p>
        </header>
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Weekly active" value={`${s.weeklyActivePct}%`} hint={`${s.students} students`} />
          <KpiCard label="Drills" value={s.drillsThisWeek} hint="this week" />
          <KpiCard label="Avg readiness" value={s.avgReadiness ?? "—"} />
          <KpiCard label="At risk" value={s.atRisk} />
        </section>
        <section>
          <h2 className="mb-2 font-semibold text-ink-900">Readiness trend</h2>
          <div className="flex h-40 items-end gap-3" role="img" aria-label={`Average readiness by week: ${s.readinessTrend.map((t) => `${t.week} ${t.avg}`).join(", ")}`}>
            {s.readinessTrend.map((t) => (
              <div key={t.week} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold tabular">{t.avg}</span>
                <div className="w-full max-w-16 rounded-t-sm bg-ink-900" style={{ height: `${(t.avg / max) * 100}%` }} />
                <span className="text-[11px] text-text-600">{t.week}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          <div><h2 className="mb-1 font-semibold text-ink-900">Strongest topics</h2><ul className="text-sm">{s.strongestTopics.map((t) => <li key={t.topic} className="flex justify-between border-b border-border py-1"><span>{t.topic}</span><span className="tabular">{t.mastery}</span></li>)}</ul></div>
          <div><h2 className="mb-1 font-semibold text-ink-900">Needs class time</h2><ul className="text-sm">{s.weakestTopics.map((t) => <li key={t.topic} className="flex justify-between border-b border-border py-1"><span>{t.topic}</span><span className="tabular">{t.mastery}</span></li>)}</ul></div>
        </section>
        <p className="text-sm text-text-600">Mock tests this week: {s.mocksTaken}{s.avgMockPct !== null ? ` · average ${s.avgMockPct}%` : ""}</p>
      </article>
    </TpoShell>
  );
}
