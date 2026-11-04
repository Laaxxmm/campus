import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { insightsOverview } from "@/server/services/insights";
import type { InsightText } from "@/lib/insights/text";
import type { InsightFacts } from "@/lib/insights/rules";
import { InsightCard } from "@/components/insights/InsightCard";
import { EmptyState } from "@/components/EmptyState";
import { startFocusDrill } from "@/app/actions/focus";

export const dynamic = "force-dynamic";

export default async function Insights({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = requireRole(await requireUser(), ["student"]);
  const sp = await searchParams;
  const o = await insightsOverview(user);
  const latest = o.recent[0];
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-ink-900">Insights</h1>
      {sp.error && <p role="alert" className="rounded-sm bg-coral-50 p-4 text-sm">Not enough questions for that focus yet — try again after your next drill.</p>}
      {o.progress.length > 0 && (
        <section className="rounded-md border border-border bg-bg p-4" data-testid="weekly-focus">
          <h2 className="font-semibold text-ink-900">Focus this week</h2>
          <ul className="mt-4 space-y-4">
            {o.progress.map((p) => {
              const pct = Math.min(100, Math.round((100 * p.done) / Math.max(1, p.target)));
              return (
                <li key={p.topic}>
                  <div className="flex justify-between text-sm"><span className="font-medium">{p.name}</span><span className="tabular text-text-600">{p.done}/{p.target} questions</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-pill bg-surface" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} weekly target`}>
                    <div className="h-full bg-ink-900" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <form action={startFocusDrill} className="mt-4">
            <input type="hidden" name="topics" value={o.progress.map((p) => p.topic).join(",")} />
            <button type="submit" className="min-h-12 w-full rounded-sm bg-accent-500 font-semibold text-ink-900 hover:bg-accent-600">Practise focus topics · 10 Q</button>
          </form>
        </section>
      )}
      {latest ? (
        <InsightCard text={latest.text as InsightText} focusTopics={[]} />
      ) : (
        <EmptyState icon={Lightbulb} title="Your first insight arrives after a drill" body="Finish today's 10 questions — we'll show what's going wrong and what to focus on.">
          <Link href="/today" className="mt-4 inline-block font-semibold text-info-500 underline">Go to Today</Link>
        </EmptyState>
      )}
      {o.recent.length > 1 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-text-600">Earlier</h2>
          <ul className="space-y-2">
            {o.recent.slice(1).map((r) => (
              <li key={r.id} className="rounded-md border border-border bg-bg p-4 text-sm">
                <div className="text-xs text-text-600">{r.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })} · {r.mockAttemptId ? "Mock" : "Drill"}</div>
                <div className="font-medium">{(r.text as InsightText).headline}</div>
                {(r.facts as InsightFacts).focus.length > 0 && <div className="text-xs text-text-600">Focus: {(r.text as InsightText).focus.map((f) => f.line.split(" — ")[0]).join(", ")}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-center text-xs text-text-600"><Link href="/progress" className="underline">Topic mastery & history</Link> · <Link href="/leaderboard" className="underline">Leaderboard</Link></p>
    </div>
  );
}
