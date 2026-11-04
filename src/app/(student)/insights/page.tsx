import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { insightsOverview } from "@/server/services/insights";
import type { InsightText } from "@/lib/insights/text";
import type { InsightFacts } from "@/lib/insights/rules";
import { InsightCard } from "@/components/insights/InsightCard";
import { EmptyState } from "@/components/EmptyState";
import { startFocusDrill } from "@/app/actions/focus";
import { StudentPage } from "@/components/StudentPage";
import { Section } from "@/components/ui/layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Insights({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = requireRole(await requireUser(), ["student"]);
  const sp = await searchParams;
  const o = await insightsOverview(user);
  const latest = o.recent[0];
  const weekly = o.progress.length > 0 && (
    <section className="flex h-full flex-col rounded-md border border-border bg-bg p-6 lg:p-8" data-testid="weekly-focus" aria-labelledby="weekly-h">
      <h2 id="weekly-h" className="text-xs font-medium uppercase tracking-wide text-text-600">Focus this week</h2>
      <ul className="mt-4 space-y-4">
        {o.progress.map((p) => {
          const pct = Math.min(100, Math.round((100 * p.done) / Math.max(1, p.target)));
          return (
            <li key={p.topic}>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="font-medium text-text-900">{p.name}</span>
                <span className="tabular text-text-600">{p.done}/{p.target} questions</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-pill bg-surface" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} weekly target`}>
                <div className="h-full bg-ink-900" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <form action={startFocusDrill} className="mt-auto pt-6">
        <input type="hidden" name="topics" value={o.progress.map((p) => p.topic).join(",")} />
        <button type="submit" data-cta="primary" className="flex h-[52px] w-full items-center justify-center rounded-sm bg-accent-500 px-6 font-semibold text-ink-900 hover:bg-accent-600 active:translate-y-px">
          Practise focus topics · 10 Q
        </button>
      </form>
    </section>
  );
  return (
    <StudentPage title="Insights" subtitle={latest ? (latest.text as InsightText).headline : "What's going wrong, and what to practise next."} width={latest || weekly ? "app" : "reading"}>
      {sp.error && (
        <p role="alert" className="rounded-sm bg-coral-50 p-4 text-sm">
          Not enough questions for that focus yet — try again after your next drill.
        </p>
      )}
      <div className="space-y-12 lg:space-y-16">
        {latest ? (
          weekly ? (
            <div className="grid items-stretch gap-6 lg:grid-cols-2">
              {weekly}
              <InsightCard text={latest.text as InsightText} focusTopics={[]} showFocus={false} hideHeadline />
            </div>
          ) : (
            <InsightCard text={latest.text as InsightText} focusTopics={[]} hideHeadline />
          )
        ) : (
          <>
            {weekly}
            <EmptyState icon={Lightbulb} title="Your first insight arrives after a drill" body="Finish today's 10 questions — we'll show what's going wrong and what to focus on.">
              <Link href="/today" data-cta={weekly ? undefined : "primary"} className={cn(buttonVariants({ variant: "primary" }), "mt-6")}>
                Go to Today
              </Link>
            </EmptyState>
          </>
        )}
        {o.recent.length > 1 && (
          <Section title="Earlier">
            <ul className="divide-y divide-border rounded-md border border-border bg-bg">
              {o.recent.slice(1).map((r) => (
                <li key={r.id} className="px-6 py-4 lg:px-8">
                  <div className="text-xs text-text-600">
                    {r.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })} · {r.mockAttemptId ? "Mock" : "Drill"}
                  </div>
                  <div className="mt-2 font-medium text-text-900">{(r.text as InsightText).headline}</div>
                  {(r.facts as InsightFacts).focus.length > 0 && (
                    <div className="mt-2 text-sm text-text-600">Focus: {(r.text as InsightText).focus.map((f) => f.line.split(" — ")[0]).join(", ")}</div>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}
        <nav aria-label="More progress" className="flex flex-wrap gap-2">
          <Link href="/progress" className="inline-flex h-11 items-center rounded-sm border border-border bg-bg px-4 text-sm font-semibold text-ink-900 hover:border-ink-700">
            Topic mastery &amp; history
          </Link>
          <Link href="/leaderboard" className="inline-flex h-11 items-center rounded-sm border border-border bg-bg px-4 text-sm font-semibold text-ink-900 hover:border-ink-700">
            Leaderboard
          </Link>
        </nav>
      </div>
    </StudentPage>
  );
}
