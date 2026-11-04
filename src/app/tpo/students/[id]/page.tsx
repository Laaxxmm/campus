import { notFound } from "next/navigation";
import { staffContext } from "@/server/staff";
import { studentDetail } from "@/server/services/tpo";
import { coachDetail } from "@/server/services/tpo-coach";
import { reviewsForStaff } from "@/server/services/profile-coach";
import type { InsightText } from "@/lib/insights/text";
import { companyName } from "@/lib/companies";
import { TpoShell } from "@/components/TpoShell";
import { heatColor } from "@/components/Heatmap";
import { CardHeader } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function StudentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ college?: string }> }) {
  const { user, college, opts } = await staffContext((await searchParams).college);
  const { id } = await params;
  const s = await studentDetail(user, id, opts);
  if (!s) notFound(); // includes students of other colleges
  const [coach, reviews] = await Promise.all([coachDetail(user, s.id, opts), reviewsForStaff(user.role === "superadmin" ? { role: "superadmin", collegeId: null } : user, s.id)]);
  const max = Math.max(100, ...s.readinessTrend.map((x) => x.score));
  const card = "h-full rounded-md border border-border bg-bg p-6 lg:p-8";
  return (
    <TpoShell title={s.name ?? s.email} subtitle={`${s.batch ?? "No batch"} · target ${companyName(s.target)}`} collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/tpo/students", label: "Students" }, { href: `/tpo/students/${s.id}`, label: s.name ?? "Student" }]}>
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-12">
          <section className={`${card} text-sm xl:col-span-4`}>
            <CardHeader title="Profile" />
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
              <dt className="text-text-600">Email</dt><dd className="break-all">{s.email}</dd>
              <dt className="text-text-600">Roll no.</dt><dd>{s.rollNo ?? "—"}</dd>
              <dt className="text-text-600">Batch</dt><dd>{s.batch ?? "—"}</dd>
              <dt className="text-text-600">Target</dt><dd>{companyName(s.target)}</dd>
              <dt className="text-text-600">XP</dt><dd className="tabular">{s.xp}</dd>
              <dt className="text-text-600">Last active</dt><dd>{s.lastActiveAt ? s.lastActiveAt.toLocaleDateString("en-IN") : "never"}</dd>
              <dt className="text-text-600">Consent</dt><dd>{s.consentAt ? "given" : "pending"}</dd>
            </dl>
          </section>
          <section className={`${card} xl:col-span-4`}>
            <CardHeader title="Readiness now" />
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {s.readinessNow.map((r) => <li key={r.company} className="flex justify-between gap-2 rounded-sm border border-border px-4 py-2"><span>{r.name}</span><span className="font-semibold tabular">{r.score}</span></li>)}
              {!s.readinessNow.length && <li className="text-text-600">No snapshot yet.</li>}
            </ul>
          </section>
          <section className={`${card} lg:col-span-2 xl:col-span-4`}>
            <CardHeader title={`${companyName(s.target)} readiness by week`} />
            <div className="flex h-28 items-end gap-2" role="img" aria-label={`Readiness trend: ${s.readinessTrend.map((x) => `${x.week} ${x.score}`).join(", ")}`}>
              {s.readinessTrend.map((x) => (
                <div key={x.week} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="w-full rounded-t-sm bg-ink-900" style={{ height: `${(x.score / max) * 100}%` }} />
                  <span className="text-xs text-text-600">{x.week.slice(5)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="grid gap-6 xl:grid-cols-12" data-testid="coach-detail">
          <section className={`${card} xl:col-span-8`}>
            <CardHeader title="Latest insights" />
            {coach?.insights.length ? <div className="space-y-4">{coach.insights.map((i, k) => <div key={k} className="text-sm"><div className="font-medium text-ink-900">{(i.text as InsightText).headline}</div><ul className="mt-2 list-disc space-y-2 pl-6 text-text-600">{(i.text as InsightText).whatsWrong.map((w, j) => <li key={j}>{w}</li>)}</ul></div>)}</div> : <p className="text-sm text-text-600">No insights yet.</p>}
            <CardHeader title="Readiness by target (v3)" className="mt-8" />
            <ul className="grid gap-2 sm:grid-cols-2">{coach?.readiness.map((x) => <li key={x.company} className="rounded-sm border border-border px-4 py-2 text-sm"><div className="flex justify-between gap-2"><span>{x.name}</span><b className="tabular">{x.r.score}</b></div><div className="text-xs text-text-600">apt {x.r.aptitude.score} · tech {x.r.tech.score} · cons {x.r.consistency.score} · profile {x.r.profile.score}{x.r.interviewReady ? " · interview-ready" : ""}</div></li>)}</ul>
          </section>
          <section className={`${card} xl:col-span-4`}>
            <CardHeader title="Profile checklists" />
            <dl className="grid grid-cols-2 gap-6">
              <div><dt className="text-xs font-medium uppercase tracking-wide text-text-600">Resume</dt><dd className="mt-2 text-2xl font-bold tabular text-ink-900">{reviews?.resume ? `${reviews.resume.score}%` : <span className="text-base font-normal text-text-600">not started</span>}</dd></div>
              <div><dt className="text-xs font-medium uppercase tracking-wide text-text-600">LinkedIn</dt><dd className="mt-2 text-2xl font-bold tabular text-ink-900">{reviews?.linkedin ? `${reviews.linkedin.score}%` : <span className="text-base font-normal text-text-600">not started</span>}</dd></div>
            </dl>
            <p className="mt-4 text-sm text-text-600" data-testid="draft-privacy">{reviews?.resume?.shared || reviews?.linkedin?.shared ? "The student shared a draft with you." : "Drafts are private to the student unless they share them."}</p>
          </section>
        </div>
        <section className={card}>
          <CardHeader title="Topic mastery (weakest first)" />
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {s.topics.map((t) => (
              <li key={t.topic} className="flex items-center gap-2 text-sm">
                <span className="inline-flex h-8 w-10 items-center justify-center rounded-sm tabular" style={{ background: heatColor(t.mastery), color: "var(--text-900)" }}>{t.mastery}</span>
                <span className="flex-1">{t.name}</span>
                <span className="text-xs text-text-600">L{t.band}</span>
              </li>
            ))}
          </ul>
        </section>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className={card}>
            <CardHeader title="Last 14 drills" />
            <ul className="divide-y divide-border text-sm">
              {s.drills.map((d) => <li key={d.id} className="flex justify-between py-2"><span>{d.date}</span><span className="tabular">{d.completedAt ? `${d.score}/10` : "incomplete"}</span></li>)}
            </ul>
          </section>
          <section className={card}>
            <CardHeader title="Mock tests" />
            <ul className="divide-y divide-border text-sm">
              {s.mocks.map((m) => <li key={m.id} className="flex justify-between gap-4 py-2"><span>{m.title}</span><span className="tabular">{m.endedAt ? `${m.marks}/${m.n}` : "in progress"}{m.tabSwitches ? ` · ${m.tabSwitches} tab switches` : ""}</span></li>)}
              {!s.mocks.length && <li className="py-2 text-text-600">No mocks taken.</li>}
            </ul>
          </section>
        </div>
      </div>
    </TpoShell>
  );
}
