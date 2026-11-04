import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { companyName } from "@/lib/companies";
import { MockError, mockResult } from "@/server/services/mocks";
import { ReviewList } from "@/components/mock/ReviewList";
import { insightForMock } from "@/server/services/insights";
import { InsightCard } from "@/components/insights/InsightCard";
import { Container, PageHeader } from "@/components/ui/layout";
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
    <main className="min-h-dvh bg-surface pb-16">
      <Container size="app">
        <PageHeader
          eyebrow={companyName(r.company)}
          title={`${r.title} — result`}
          subtitle={r.autoSubmitted ? "Submitted automatically when time ran out." : undefined}
          actions={
            <Link href="/mocks" className="inline-flex h-11 items-center gap-2 rounded-sm border border-border bg-bg px-4 text-sm font-semibold text-ink-900 hover:border-ink-700">
              <ArrowLeft aria-hidden className="h-4 w-4" /> All mocks
            </Link>
          }
        />
        <div className="space-y-12 lg:space-y-16">
          {/* Hero score card: score 48–60/700 tabular, percentile + accuracy beside it */}
          <section aria-label="Score" className="rounded-md border border-border bg-bg p-6 lg:p-8">
            <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:items-end">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-text-600">Score</div>
                <div className="mt-2 text-5xl font-bold leading-none tabular text-ink-900 lg:text-6xl" data-testid="mock-score">
                  {r.marks}/{r.maxMarks}
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-6 sm:justify-self-end">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-text-600">Percentile</dt>
                  <dd className="mt-2 text-3xl font-bold leading-none tabular text-ink-900">{r.percentile ?? "—"}</dd>
                  <dd className="mt-2 text-xs text-text-600">{r.takers} taker{r.takers === 1 ? "" : "s"} in college</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-text-600">Accuracy</dt>
                  <dd className="mt-2 text-3xl font-bold leading-none tabular text-ink-900">{r.accuracy === null ? "—" : `${r.accuracy}%`}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-text-600">Avg / Q</dt>
                  <dd className="mt-2 text-3xl font-bold leading-none tabular text-ink-900">{r.avgTimeSec}s</dd>
                </div>
              </dl>
            </div>
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="text-base font-semibold text-ink-900">Section breakdown</h2>
              <ul className="mt-4 grid gap-6 md:grid-cols-2">
                {r.sections.map((s) => (
                  <li key={s.section}>
                    <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <span className="font-medium">{SECTION[s.section] ?? s.section}</span>
                      <span className="tabular text-text-600">
                        {s.correct} correct · {s.wrong} wrong · {s.skipped} skipped · {s.marks} marks
                      </span>
                    </div>
                    <div className="mt-2 flex h-2 overflow-hidden rounded-pill bg-surface" role="img" aria-label={`${s.section}: ${s.correct} correct, ${s.wrong} wrong, ${s.skipped} skipped of ${s.total}`}>
                      <div className="bg-success-500" style={{ width: `${(100 * s.correct) / s.total}%` }} />
                      <div className="bg-danger-500" style={{ width: `${(100 * s.wrong) / s.total}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-text-600">
                {r.correct} correct · {r.wrong} wrong · {r.skipped} skipped
                {r.tabSwitches ? ` · ${r.tabSwitches} tab switch${r.tabSwitches > 1 ? "es" : ""} recorded` : ""}
              </p>
            </div>
          </section>
          {insight && <InsightCard text={insight.text as InsightText} focusTopics={(insight.facts as InsightFacts).focus.map((f) => f.topic)} />}
          <ReviewList items={r.review} />
        </div>
      </Container>
    </main>
  );
}
