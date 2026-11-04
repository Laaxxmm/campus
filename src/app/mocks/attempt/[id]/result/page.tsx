import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { companyName } from "@/lib/companies";
import { MockError, mockResult } from "@/server/services/mocks";
import { ReviewList } from "@/components/mock/ReviewList";
import { insightForMock } from "@/server/services/insights";
import { InsightCard } from "@/components/insights/InsightCard";
import type { InsightText } from "@/lib/insights/text";
import type { InsightFacts } from "@/lib/insights/rules";

export const dynamic = "force-dynamic";
const SECTION: Record<string, string> = { quant: "Quant", logical: "Logical", verbal: "Verbal", coding: "Coding" };

export default async function MockResultPage({ params }: { params: Promise<{ id: string }> }) {
  const user = requireRole(await requireUser(), ["student"]);
  const { id } = await params;
  let r;
  try {
    r = await mockResult(user, id);
  } catch (e) {
    if (e instanceof MockError && e.status === 404) notFound();
    if (e instanceof MockError && e.status === 409) redirect(`/mocks/attempt/${id}`);
    throw e;
  }
  const insight = await insightForMock(user, id);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <Link href="/mocks" className="inline-flex min-h-11 items-center gap-1 text-sm text-ink-900"><ArrowLeft aria-hidden className="h-4 w-4" /> Mocks</Link>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-text-600">{companyName(r.company)}</div>
        <h1 className="text-2xl font-bold text-ink-900">{r.title} — result</h1>
        {r.autoSubmitted && <p className="mt-2 text-sm text-text-600">Submitted automatically when time ran out.</p>}
      </div>
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-border bg-bg p-4"><div className="text-xs text-text-600">Score</div><div className="text-2xl font-bold tabular" data-testid="mock-score">{r.marks}/{r.maxMarks}</div></div>
        <div className="rounded-md border border-border bg-bg p-4"><div className="text-xs text-text-600">Percentile (college)</div><div className="text-2xl font-bold tabular">{r.percentile ?? "—"}</div><div className="text-[11px] text-text-600">{r.takers} taker{r.takers === 1 ? "" : "s"}</div></div>
        <div className="rounded-md border border-border bg-bg p-4"><div className="text-xs text-text-600">Accuracy</div><div className="text-2xl font-bold tabular">{r.accuracy === null ? "—" : `${r.accuracy}%`}</div></div>
        <div className="rounded-md border border-border bg-bg p-4"><div className="text-xs text-text-600">Avg time / Q</div><div className="text-2xl font-bold tabular">{r.avgTimeSec}s</div></div>
      </section>
      <section className="rounded-md border border-border bg-bg p-4">
        <h2 className="font-semibold">Section breakdown</h2>
        <ul className="mt-4 space-y-4">
          {r.sections.map((s) => (
            <li key={s.section}>
              <div className="flex justify-between text-sm"><span className="font-medium">{SECTION[s.section] ?? s.section}</span><span className="tabular text-text-600">{s.correct}✓ · {s.wrong}✗ · {s.skipped} skipped · {s.marks} marks</span></div>
              <div className="mt-2 flex h-3 overflow-hidden rounded-pill bg-surface" role="img" aria-label={`${s.section}: ${s.correct} correct, ${s.wrong} wrong, ${s.skipped} skipped of ${s.total}`}>
                <div className="bg-success-500" style={{ width: `${(100 * s.correct) / s.total}%` }} />
                <div className="bg-danger-500" style={{ width: `${(100 * s.wrong) / s.total}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-text-600">{r.correct} correct · {r.wrong} wrong · {r.skipped} skipped{r.tabSwitches ? ` · ${r.tabSwitches} tab switch${r.tabSwitches > 1 ? "es" : ""} recorded` : ""}</p>
      </section>
      {insight && <InsightCard text={insight.text as InsightText} focusTopics={(insight.facts as InsightFacts).focus.map((f) => f.topic)} />}
      <ReviewList items={r.review} />
    </main>
  );
}
