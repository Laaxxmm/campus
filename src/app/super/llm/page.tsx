import { requireRole, requireUser } from "@/lib/authz";
import { aiEnabled, MODELS } from "@/lib/llm";
import { llmUsageReport } from "@/server/services/llm-admin";
import { AdminShell } from "@/components/AdminShell";
import { KpiCard } from "@/components/KpiCard";

export const dynamic = "force-dynamic";

export default async function LlmUsage() {
  const user = requireRole(await requireUser(), ["superadmin"]);
  const r = await llmUsageReport(user);
  return (
    <AdminShell title="LLM usage & quotas" role={user.role}>
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4" data-testid="llm-kpis">
        <KpiCard label="Spend, 30 days" value={`₹${r.totalInr}`} hint={`$${r.totalUsd.toFixed(2)}`} />
        <KpiCard label="₹ / active student / month" value={`₹${r.inrPerActiveStudent}`} hint="target < ₹5" tone={r.inrPerActiveStudent < 5 ? "good" : "bad"} />
        <KpiCard label="Drafts quota" value={`${r.quota.draftsPerStudentPerMonth}/mo`} hint="per student, plus 3/hour" />
        <KpiCard label="AI features" value={aiEnabled() ? "On" : "Off"} hint={aiEnabled() ? `${MODELS.fast()} · ${MODELS.smart()}` : "no ANTHROPIC_API_KEY — templates only"} />
      </section>
      <h2 className="mb-2 mt-6 font-semibold text-ink-900">By feature</h2>
      <div className="overflow-x-auto rounded-md border border-border bg-bg">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs text-text-600">
            <tr><th className="px-4 py-2">Feature</th><th className="px-4 py-2">Model</th><th className="px-4 py-2 text-right">Calls</th><th className="px-4 py-2 text-right">Tokens in/out</th><th className="px-4 py-2 text-right">USD</th></tr>
          </thead>
          <tbody>
            {r.byFeature.map((f) => (
              <tr key={f.feature + f.model} className="border-t border-border"><td className="px-4 py-2">{f.feature}</td><td className="px-4 py-2 font-mono text-xs">{f.model}</td><td className="px-4 py-2 text-right tabular">{f.calls}</td><td className="px-4 py-2 text-right tabular">{f.input}/{f.output}</td><td className="px-4 py-2 text-right tabular">{f.usd.toFixed(3)}</td></tr>
            ))}
            {!r.byFeature.length && <tr><td colSpan={5} className="px-4 py-4 text-text-600">No LLM calls in the last 30 days. Drills, grading, insights and readiness never need one.</td></tr>}
          </tbody>
        </table>
      </div>
      <h2 className="mb-2 mt-6 font-semibold text-ink-900">By college</h2>
      <div className="overflow-x-auto rounded-md border border-border bg-bg">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs text-text-600"><tr><th className="px-4 py-2">College</th><th className="px-4 py-2 text-right">Active students</th><th className="px-4 py-2 text-right">USD</th><th className="px-4 py-2 text-right">₹ / active</th></tr></thead>
          <tbody>
            {r.byCollege.map((c) => (
              <tr key={c.id} className="border-t border-border"><td className="px-4 py-2">{c.name}</td><td className="px-4 py-2 text-right tabular">{c.active}/{c.students}</td><td className="px-4 py-2 text-right tabular">{c.usd.toFixed(3)}</td><td className="px-4 py-2 text-right tabular">₹{c.inrPerActive}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
