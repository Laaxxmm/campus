import { requireRole, requireUser } from "@/lib/authz";
import { BarChart3 } from "lucide-react";
import { progressFor } from "@/server/services/student";
import { StudentPage } from "@/components/StudentPage";
import { Section } from "@/components/ui/layout";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = requireRole(await requireUser(), ["student"]);
  const p = await progressFor(user.id);
  return (
    <StudentPage title="Your progress">
      <Section title="Readiness by company">
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {p.companies.map((c) => (
            <li key={c.id} className="h-full rounded-md border border-border bg-bg p-6 lg:p-8">
              <div className="text-xs font-medium uppercase tracking-wide text-text-600">{c.name}</div>
              <div className={`mt-2 text-4xl font-bold leading-none tabular ${c.score >= 70 ? "text-success-700" : c.score >= 40 ? "text-ink-900" : "text-danger-700"}`}>{c.score}</div>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Topic mastery (weakest first)">
        {p.topics.length === 0 ? (
          <EmptyState icon={BarChart3} title="No data yet" body="Finish your first drill to see topic mastery." />
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border bg-bg px-6 lg:px-8">
            {p.topics.map((t) => (
              <li key={t.id} className="py-4">
                <div className="flex justify-between gap-4 text-base">
                  <span className="font-medium text-text-900">{t.name}</span>
                  <span className="tabular text-text-600">
                    {t.accuracy === null ? "—" : `${t.accuracy}%`} · L{t.band}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-pill bg-surface" role="meter" aria-valuenow={t.mastery} aria-valuemin={0} aria-valuemax={100} aria-label={`${t.name} mastery`}>
                  <div className={`h-full ${t.mastery >= 70 ? "bg-success-500" : t.mastery >= 40 ? "bg-accent-500" : "bg-danger-500"}`} style={{ width: `${t.mastery}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Last 14 drills">
        <ul className="divide-y divide-border rounded-md border border-border bg-bg px-6 lg:px-8">
          {p.history.map((d) => (
            <li key={d.id} className="flex min-h-12 items-center justify-between gap-4 py-2 text-base">
              <span className="tabular">{d.date}</span>
              <span className="font-semibold tabular">{d.completedAt ? `${d.score}/10` : "incomplete"}</span>
            </li>
          ))}
          {!p.history.length && <li className="py-4 text-base text-text-600">No drills yet.</li>}
        </ul>
      </Section>
    </StudentPage>
  );
}
