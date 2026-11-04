import { notFound } from "next/navigation";
import { staffContext } from "@/server/staff";
import { studentDetail } from "@/server/services/tpo";
import { companyName } from "@/lib/companies";
import { TpoShell } from "@/components/TpoShell";
import { heatColor } from "@/components/Heatmap";

export const dynamic = "force-dynamic";

export default async function StudentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ college?: string }> }) {
  const { user, college, opts } = await staffContext((await searchParams).college);
  const { id } = await params;
  const s = await studentDetail(user, id, opts);
  if (!s) notFound(); // includes students of other colleges
  const max = Math.max(100, ...s.readinessTrend.map((x) => x.score));
  return (
    <TpoShell title={s.name ?? s.email} collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/tpo/students", label: "Students" }, { href: `/tpo/students/${s.id}`, label: s.name ?? "Student" }]}>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-md border border-border bg-bg p-4 text-sm">
          <h2 className="mb-2 font-semibold text-ink-900">Profile</h2>
          <dl className="grid grid-cols-2 gap-y-1">
            <dt className="text-text-600">Email</dt><dd className="break-all">{s.email}</dd>
            <dt className="text-text-600">Roll no.</dt><dd>{s.rollNo ?? "—"}</dd>
            <dt className="text-text-600">Batch</dt><dd>{s.batch ?? "—"}</dd>
            <dt className="text-text-600">Target</dt><dd>{companyName(s.target)}</dd>
            <dt className="text-text-600">XP</dt><dd className="tabular">{s.xp}</dd>
            <dt className="text-text-600">Last active</dt><dd>{s.lastActiveAt ? s.lastActiveAt.toLocaleDateString("en-IN") : "never"}</dd>
            <dt className="text-text-600">Consent</dt><dd>{s.consentAt ? "given" : "pending"}</dd>
          </dl>
        </section>
        <section className="rounded-md border border-border bg-bg p-4">
          <h2 className="mb-2 font-semibold text-ink-900">Readiness now</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {s.readinessNow.map((r) => <li key={r.company} className="flex justify-between rounded-sm bg-surface px-2 py-1"><span>{r.name}</span><span className="font-semibold tabular">{r.score}</span></li>)}
            {!s.readinessNow.length && <li className="text-text-600">No snapshot yet.</li>}
          </ul>
        </section>
        <section className="rounded-md border border-border bg-bg p-4">
          <h2 className="mb-2 font-semibold text-ink-900">{companyName(s.target)} readiness by week</h2>
          <div className="flex h-28 items-end gap-1" role="img" aria-label={`Readiness trend: ${s.readinessTrend.map((x) => `${x.week} ${x.score}`).join(", ")}`}>
            {s.readinessTrend.map((x) => (
              <div key={x.week} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-sm bg-ink-900" style={{ height: `${(x.score / max) * 100}%` }} />
                <span className="text-[10px] text-text-600">{x.week.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="mt-4 rounded-md border border-border bg-bg p-4">
        <h2 className="mb-2 font-semibold text-ink-900">Topic mastery (weakest first)</h2>
        <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {s.topics.map((t) => (
            <li key={t.topic} className="flex items-center gap-2 text-sm">
              <span className="inline-flex h-7 w-10 items-center justify-center rounded-sm tabular" style={{ background: heatColor(t.mastery), color: "var(--text-900)" }}>{t.mastery}</span>
              <span className="flex-1">{t.name}</span>
              <span className="text-xs text-text-600">L{t.band}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-border bg-bg p-4">
          <h2 className="mb-2 font-semibold text-ink-900">Last 14 drills</h2>
          <ul className="divide-y divide-border text-sm">
            {s.drills.map((d) => <li key={d.id} className="flex justify-between py-1.5"><span>{d.date}</span><span className="tabular">{d.completedAt ? `${d.score}/10` : "incomplete"}</span></li>)}
          </ul>
        </section>
        <section className="rounded-md border border-border bg-bg p-4">
          <h2 className="mb-2 font-semibold text-ink-900">Mock tests</h2>
          <ul className="divide-y divide-border text-sm">
            {s.mocks.map((m) => <li key={m.id} className="flex justify-between py-1.5"><span>{m.title}</span><span className="tabular">{m.endedAt ? `${m.marks}/${m.n}` : "in progress"}{m.tabSwitches ? ` · ${m.tabSwitches} tab switches` : ""}</span></li>)}
            {!s.mocks.length && <li className="py-1.5 text-text-600">No mocks taken.</li>}
          </ul>
        </section>
      </div>
    </TpoShell>
  );
}
