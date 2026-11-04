import { Lightbulb, Target } from "lucide-react";
import type { InsightText } from "@/lib/insights/text";
import { startFocusDrill } from "@/app/actions/focus";
import { cn } from "@/lib/utils";

/**
 * v4 insight block: headline, then insight cards 2-col on desktop (1-col mobile) with "Focus this week" pinned first.
 * The focus card carries the screen's primary CTA when focusTopics are given.
 */
export function InsightCard({ text, focusTopics, compact = false, showFocus = true, stack = false, hideHeadline = false }: { text: InsightText; focusTopics: string[]; compact?: boolean; showFocus?: boolean; stack?: boolean; hideHeadline?: boolean }) {
  const focus = showFocus && !compact && (text.focus.length > 0 || focusTopics.length > 0);
  const wrong = text.whatsWrong.length > 0 || Boolean(text.note);
  return (
    <section className="h-full w-full text-left" data-testid="insight-card" aria-labelledby="insight-h">
      <h2 id="insight-h" className={cn("flex items-start gap-2 text-lg font-semibold text-ink-900", hideHeadline ? "sr-only" : "mb-6")}>
        <span aria-hidden className="flex h-6 shrink-0 items-center"><Lightbulb className="h-5 w-5 text-accent-600" /></span>
        {text.headline}
      </h2>
      {(focus || wrong) && (
        <div className={cn("grid items-stretch gap-6", hideHeadline && "h-full", focus && wrong && !stack && "lg:grid-cols-2")}>
          {focus && (
            <div className="flex h-full flex-col rounded-md border border-border bg-bg p-6 lg:p-8">
              <h3 className="text-xs font-medium uppercase tracking-wide text-text-600">Focus this week</h3>
              {text.focus.length > 0 && (
                <ul className="mt-4 space-y-2 text-base" data-testid="focus-list">
                  {text.focus.map((f) => (
                    <li key={f.topic} className="flex items-center gap-2">
                      <Target aria-hidden className="h-4 w-4 shrink-0 text-ink-700" />
                      {f.line}
                    </li>
                  ))}
                </ul>
              )}
              {focusTopics.length > 0 && (
                <form action={startFocusDrill} className="mt-auto pt-6">
                  <input type="hidden" name="topics" value={focusTopics.join(",")} />
                  <button type="submit" className="flex h-[52px] w-full items-center justify-center rounded-sm bg-accent-500 px-6 font-semibold text-ink-900 hover:bg-accent-600 active:translate-y-px" data-testid="start-focus" data-cta="primary">
                    Start focus drill · 10 Q
                  </button>
                </form>
              )}
            </div>
          )}
          {wrong && (
            <div className="h-full rounded-md border border-border bg-bg p-6 lg:p-8">
              {text.whatsWrong.length > 0 && (
                <>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-text-600">What&apos;s going wrong</h3>
                  <ul className="mt-4 space-y-4 text-base" data-testid="whats-wrong">
                    {text.whatsWrong.map((w, i) => (
                      <li key={i} className="flex gap-4">
                        <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-pill bg-coral-500" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {text.note && (
                <p className={cn("text-sm text-text-600", text.whatsWrong.length > 0 && "mt-6")} data-testid="insight-note">
                  {text.note}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
