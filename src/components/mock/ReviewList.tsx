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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="review-h" className="text-lg font-semibold text-ink-900">Review</h2>
        <div role="tablist" className="flex flex-wrap gap-1">
          {FILTERS.map((x) => (
            <button key={x.id} role="tab" aria-selected={f === x.id} onClick={() => setF(x.id)} className={cn("min-h-9 rounded-pill border px-4 text-sm", f === x.id ? "border-ink-900 bg-ink-900 text-white" : "border-border bg-bg")}>
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <ol className="mt-4 space-y-4">
        {shown.map((q) => (
          <li key={q.id} className="rounded-md border border-border bg-bg p-4" data-testid="review-item">
            <div className="mb-2 flex items-center gap-2 text-xs text-text-600">
              <span className="font-semibold">Q{q.index + 1}</span>
              {q.correct ? <span className="inline-flex items-center gap-1 text-success-700"><Check aria-hidden className="h-3.5 w-3.5" />Correct</span> : q.yourChoice === null ? <span>Skipped</span> : <span className="inline-flex items-center gap-1 text-danger-500"><X aria-hidden className="h-3.5 w-3.5" />Wrong</span>}
              {q.flagged && <span className="inline-flex items-center gap-1"><Flag aria-hidden className="h-3.5 w-3.5 text-coral-500" />Flagged</span>}
              <span className="ml-auto tabular">{Math.round(q.timeMs / 1000)}s</span>
            </div>
            <div className="text-sm leading-relaxed">{renderStem(q.stem)}</div>
            <ul className="mt-2 space-y-2 text-sm">
              {q.options.map((o, i) => (
                <li key={i} className={cn("rounded-sm border px-2 py-2", i === q.correctChoice ? "border-success-500 bg-success-50" : i === q.yourChoice ? "border-danger-500 bg-danger-50" : "border-border")}>
                  <span className="mr-2 font-semibold">{LETTERS[i]}</span>{o}
                  {i === q.yourChoice && <span className="ml-2 text-xs text-text-600">(your answer)</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-text-600">{q.explanation}</p>
            {q.shortcut && <p className="mt-2 text-xs text-ink-900">Shortcut: {q.shortcut}</p>}
          </li>
        ))}
        {!shown.length && <li className="rounded-md border border-dashed border-border p-4 text-center text-sm text-text-600">Nothing in this filter.</li>}
      </ol>
    </section>
  );
}
