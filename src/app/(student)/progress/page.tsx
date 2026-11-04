import { requireRole, requireUser } from "@/lib/authz";
import { progressFor } from "@/lib/queries/student";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = requireRole(await requireUser(), ["student"]);
  const p = await progressFor(user.id);
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Your progress</h1>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink-600">Readiness by company</h2>
        <ul className="grid grid-cols-2 gap-2">
          {p.companies.map((c) => (
            <li key={c.id} className="rounded-md border border-border bg-surface p-3">
              <div className="text-xs text-ink-600">{c.name}</div>
              <div className={`text-2xl font-bold tabular ${c.score >= 70 ? "text-success" : c.score >= 40 ? "text-ink-900" : "text-danger"}`}>{c.score}</div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink-600">Topic mastery (weakest first)</h2>
        {p.topics.length === 0 ? (
          <EmptyState icon="📊" title="No data yet" body="Finish your first drill to see topic mastery." />
        ) : (
          <ul className="space-y-2">
            {p.topics.map((t) => (
              <li key={t.id} className="rounded-md bg-surface p-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="tabular text-ink-600">{t.accuracy === null ? "—" : `${t.accuracy}%`} · L{t.band}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-border" role="meter" aria-valuenow={t.mastery} aria-valuemin={0} aria-valuemax={100} aria-label={`${t.name} mastery`}>
                  <div className={`h-full ${t.mastery >= 70 ? "bg-success" : t.mastery >= 40 ? "bg-warn" : "bg-danger"}`} style={{ width: `${t.mastery}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink-600">Last 14 drills</h2>
        <ul className="divide-y divide-border rounded-md bg-surface">
          {p.history.map((d) => (
            <li key={d.id} className="flex justify-between px-3 py-2 text-sm">
              <span>{d.date}</span>
              <span className="tabular font-semibold">{d.completedAt ? `${d.score}/10` : "incomplete"}</span>
            </li>
          ))}
          {!p.history.length && <li className="px-3 py-2 text-sm text-ink-600">No drills yet.</li>}
        </ul>
      </section>
    </div>
  );
}
