import { staffContext } from "@/server/staff";
import { weeklyReport } from "@/server/services/reports";
import { TpoShell } from "@/components/TpoShell";
import { KpiCard } from "@/components/KpiCard";
import { PrintButton } from "@/components/tpo/PrintButton";
import { CardHeader } from "@/components/ui/card";
import { Section } from "@/components/ui/layout";

export const dynamic = "force-dynamic";

export default async function Reports({ searchParams }: { searchParams: Promise<{ college?: string }> }) {
  const { user, college, collegeId } = await staffContext((await searchParams).college);
  const r = await weeklyReport(user, collegeId);
  const s = r.stats;
  const max = Math.max(100, ...s.readinessTrend.map((t) => t.avg));
  const card = "h-full rounded-md border border-border bg-bg p-6 lg:p-8";
  return (
    <TpoShell title={`Weekly report · ${s.week}`} subtitle={`${college.name} · placement readiness · week ${s.week}`} collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/tpo/reports", label: "Reports" }]} actions={<PrintButton />}>
      <article data-testid="weekly-report">
        <div className="grid gap-6 xl:grid-cols-12">
          <section className={`${card} xl:col-span-7`}>
            <CardHeader title="Summary" />
            <p className="max-w-3xl text-lg leading-relaxed text-ink-900" data-testid="narrative">{r.narrative}</p>
            <p className="mt-4 text-sm text-text-600">{r.model === "template" ? "Summary generated from your numbers." : `Summary drafted by AI (${r.model}) from aggregated numbers only — no student names were shared.`}</p>
          </section>
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:col-span-5" aria-label="Key numbers">
            <KpiCard label="Weekly active" value={`${s.weeklyActivePct}%`} hint={`${s.students} students`} />
            <KpiCard label="Drills" value={s.drillsThisWeek} hint="this week" />
            <KpiCard label="Avg readiness" value={s.avgReadiness ?? "—"} />
            <KpiCard label="At risk" value={s.atRisk} />
          </section>
        </div>
        <Section title="Readiness and topics" meta={<>Mock tests this week: {s.mocksTaken}{s.avgMockPct !== null ? ` · average ${s.avgMockPct}%` : ""}</>}>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-12">
            <section className={`${card} lg:col-span-2 xl:col-span-6`}>
              <CardHeader title="Readiness trend" as="h3" />
              <div className="flex h-40 items-end gap-4" role="img" aria-label={`Average readiness by week: ${s.readinessTrend.map((t) => `${t.week} ${t.avg}`).join(", ")}`}>
                {s.readinessTrend.map((t) => (
                  <div key={t.week} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-xs font-semibold tabular">{t.avg}</span>
                    <div className="w-full max-w-16 rounded-t-sm bg-ink-900" style={{ height: `${(t.avg / max) * 100}%` }} />
                    <span className="text-xs text-text-600">{t.week}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className={`${card} xl:col-span-3`}>
              <CardHeader title="Strongest topics" as="h3" />
              <ul className="divide-y divide-border text-sm">{s.strongestTopics.map((t) => <li key={t.topic} className="flex justify-between gap-4 py-2"><span>{t.topic}</span><span className="tabular">{t.mastery}</span></li>)}</ul>
            </section>
            <section className={`${card} xl:col-span-3`}>
              <CardHeader title="Needs class time" as="h3" />
              <ul className="divide-y divide-border text-sm">{s.weakestTopics.map((t) => <li key={t.topic} className="flex justify-between gap-4 py-2"><span>{t.topic}</span><span className="tabular">{t.mastery}</span></li>)}</ul>
            </section>
          </div>
        </Section>
      </article>
    </TpoShell>
  );
}
