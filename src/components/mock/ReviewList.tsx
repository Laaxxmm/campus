"use client";
import { useState } from "react";
import { Check, Flag, X } from "lucide-react";
import type { MockReviewItem } from "@/lib/mock-types";
import { renderStem } from "@/lib/mini-markdown";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "wrong", label: "Wrong" },
  { id: "flagged", label: "Flagged" },
  { id: "skipped", label: "Skipped" },
] as const;
const LETTERS = ["A", "B", "C", "D"];

export function ReviewList({ items }: { items: MockReviewItem[] }) {
  const [f, setF] = useState<(typeof FILTERS)[number]["id"]>("all");
  const shown = items.filter((q) => (f === "all" ? true : f === "wrong" ? q.yourChoice !== null && !q.correct : f === "flagged" ? q.flagged : q.yourChoice === null));
  return (
    <section aria-labelledby="review-h">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 id="review-h" className="text-lg font-semibold text-ink-900">Review</h2>
        <div role="tablist" aria-label="Filter questions" className="flex flex-wrap gap-2">
          {FILTERS.map((x) => (
            <button key={x.id} role="tab" aria-selected={f === x.id} onClick={() => setF(x.id)} className={cn("min-h-11 rounded-pill border px-4 text-sm font-medium", f === x.id ? "border-ink-900 bg-ink-50 text-ink-900" : "border-border bg-bg text-text-600 hover:text-ink-900")}>
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <ol className="space-y-4">
        {shown.map((q) => (
          <li key={q.id} className="rounded-md border border-border bg-bg p-6 lg:p-8" data-testid="review-item">
            <div className="mb-4 flex items-center gap-4 text-xs text-text-600">
              <span className="font-semibold">Q{q.index + 1}</span>
              {q.correct ? <span className="inline-flex items-center gap-1 text-success-700"><Check aria-hidden className="h-3.5 w-3.5" />Correct</span> : q.yourChoice === null ? <span>Skipped</span> : <span className="inline-flex items-center gap-1 text-danger-700"><X aria-hidden className="h-3.5 w-3.5" />Wrong</span>}
              {q.flagged && <span className="inline-flex items-center gap-1"><Flag aria-hidden className="h-3.5 w-3.5 text-coral-500" />Flagged</span>}
              <span className="ml-auto tabular">{Math.round(q.timeMs / 1000)}s</span>
            </div>
            <div className="max-w-[70ch] text-base leading-relaxed">{renderStem(q.stem)}</div>
            <ul className="mt-4 space-y-2 text-base">
              {q.options.map((o, i) => (
                <li key={i} className={cn("flex min-h-14 items-center gap-4 rounded-md border p-4", i === q.correctChoice ? "border-2 border-success-500 bg-success-50" : i === q.yourChoice ? "border-2 border-danger-500 bg-danger-50" : "border-border")}>
                  <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-bg text-sm font-semibold text-ink-900">{LETTERS[i]}</span>
                  <span className="flex-1">{o}</span>
                  {i === q.correctChoice && <span className="rounded-pill bg-bg px-2 py-1 text-xs font-semibold text-success-700">{i === q.yourChoice ? "Your answer · correct" : "Correct answer"}</span>}
                  {i === q.yourChoice && i !== q.correctChoice && <span className="rounded-pill bg-bg px-2 py-1 text-xs font-semibold text-danger-700">Your answer</span>}
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-[70ch] text-sm text-text-600">{q.explanation}</p>
            {q.shortcut && <p className="mt-2 text-sm text-ink-900">Shortcut: {q.shortcut}</p>}
          </li>
        ))}
        {!shown.length && <li className="rounded-md border border-dashed border-border p-6 text-center text-sm text-text-600">Nothing in this filter.</li>}
      </ol>
    </section>
  );
}
