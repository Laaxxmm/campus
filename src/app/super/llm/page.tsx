import { requireRole, requireUser } from "@/lib/authz";
import { aiEnabled, MODELS } from "@/lib/llm";
import { llmUsageReport } from "@/server/services/llm-admin";
import { AdminShell } from "@/components/AdminShell";
import { KpiCard } from "@/components/KpiCard";

export const dynamic = "force-dynamic";

const th = "px-4 py-2";
const thNum = "px-4 py-2 text-right";
const thead = "sticky top-0 bg-surface text-left text-xs font-medium uppercase tracking-wide text-text-600";

export default async function LlmUsage() {
  const user = requireRole(await requireUser(), ["superadmin"]);
  const r = await llmUsageReport(user);
  return (
    <AdminShell title="LLM usage & quotas" subtitle="Model calls and spend over the last 30 days, with per-student quotas." role={user.role}>
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4" data-testid="llm-kpis">
        <KpiCard label="Spend, 30 days" value={`₹${r.totalInr}`} hint={`$${r.totalUsd.toFixed(2)}`} />
        <KpiCard label="₹ / active student / month" value={`₹${r.inrPerActiveStudent}`} hint="target < ₹5" tone={r.inrPerActiveStudent < 5 ? "good" : "bad"} />
        <KpiCard label="Drafts quota" value={`${r.quota.draftsPerStudentPerMonth}/mo`} hint="per student, plus 3/hour" />
        <KpiCard label="AI features" value={aiEnabled() ? "On" : "Off"} hint={aiEnabled() ? `${MODELS.fast()} · ${MODELS.smart()}` : "no ANTHROPIC_API_KEY — templates only"} />
      </section>
      <div className="mt-12 grid gap-12 lg:mt-16 xl:grid-cols-12 xl:gap-6">
        <section className="flex flex-col xl:col-span-7" aria-labelledby="feature-h">
          <h2 id="feature-h" className="mb-6 text-lg font-semibold text-ink-900">By feature</h2>
          <div className="flex-1 overflow-x-auto rounded-md border border-border bg-bg" tabIndex={0} role="region" aria-labelledby="feature-h">
            <table className="w-full min-w-[560px] text-sm">
              <thead className={thead}>
                <tr><th scope="col" className={th}>Feature</th><th scope="col" className={th}>Model</th><th scope="col" className={thNum}>Calls</th><th scope="col" className={thNum}>Tokens in/out</th><th scope="col" className={thNum}>USD</th></tr>
              </thead>
              <tbody>
                {r.byFeature.map((f) => (
                  <tr key={f.feature + f.model} className="border-t border-border"><td className="px-4 py-2">{f.feature}</td><td className="px-4 py-2 font-mono text-xs">{f.model}</td><td className="px-4 py-2 text-right tabular">{f.calls}</td><td className="px-4 py-2 text-right tabular">{f.input}/{f.output}</td><td className="px-4 py-2 text-right tabular">{f.usd.toFixed(3)}</td></tr>
                ))}
                {!r.byFeature.length && <tr><td colSpan={5} className="px-4 py-4 text-text-600">No LLM calls in the last 30 days. Drills, grading, insights and readiness never need one.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="flex flex-col xl:col-span-5" aria-labelledby="college-h">
          <h2 id="college-h" className="mb-6 text-lg font-semibold text-ink-900">By college</h2>
          <div className="flex-1 overflow-x-auto rounded-md border border-border bg-bg" tabIndex={0} role="region" aria-labelledby="college-h">
            <table className="w-full min-w-[420px] text-sm">
              <thead className={thead}><tr><th scope="col" className={th}>College</th><th scope="col" className={thNum}>Active students</th><th scope="col" className={thNum}>USD</th><th scope="col" className={thNum}>₹ / active</th></tr></thead>
              <tbody>
                {r.byCollege.map((c) => (
                  <tr key={c.id} className="border-t border-border"><td className="px-4 py-2">{c.name}</td><td className="px-4 py-2 text-right tabular">{c.active}/{c.students}</td><td className="px-4 py-2 text-right tabular">{c.usd.toFixed(3)}</td><td className="px-4 py-2 text-right tabular">₹{c.inrPerActive}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
