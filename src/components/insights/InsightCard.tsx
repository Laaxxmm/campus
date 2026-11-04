import { Lightbulb, Target } from "lucide-react";
import type { InsightText } from "@/lib/insights/text";
import { startFocusDrill } from "@/app/actions/focus";

export function InsightCard({ text, focusTopics, compact = false }: { text: InsightText; focusTopics: string[]; compact?: boolean }) {
  return (
    <section className="w-full rounded-md border border-border bg-bg p-4 text-left shadow-sm" data-testid="insight-card" aria-labelledby="insight-h">
      <h2 id="insight-h" className="flex items-center gap-2 font-semibold text-ink-900">
        <Lightbulb aria-hidden className="h-5 w-5 text-accent-600" />
        {text.headline}
      </h2>
      {text.whatsWrong.length > 0 && (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-600">What&apos;s going wrong</p>
          <ul className="mt-2 space-y-2 text-sm" data-testid="whats-wrong">
            {text.whatsWrong.map((w, i) => <li key={i} className="flex gap-2"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-coral-500" />{w}</li>)}
          </ul>
        </>
      )}
      {text.focus.length > 0 && !compact && (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-600">Focus this week</p>
          <ul className="mt-2 space-y-2 text-sm" data-testid="focus-list">
            {text.focus.map((f) => <li key={f.topic} className="flex items-center gap-2"><Target aria-hidden className="h-4 w-4 text-ink-700" />{f.line}</li>)}
          </ul>
        </>
      )}
      {text.note && <p className="mt-4 text-xs text-text-600" data-testid="insight-note">{text.note}</p>}
      {focusTopics.length > 0 && (
        <form action={startFocusDrill} className="mt-4">
          <input type="hidden" name="topics" value={focusTopics.join(",")} />
          <button type="submit" className="min-h-12 w-full rounded-sm bg-accent-500 px-4 font-semibold text-ink-900 hover:bg-accent-600" data-testid="start-focus">Start focus drill · 10 Q</button>
        </form>
      )}
    </section>
  );
}
