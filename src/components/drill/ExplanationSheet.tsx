"use client";
import { useState } from "react";
import { Zap } from "lucide-react";
import type { AttemptResultDto } from "@/lib/drill-types";

export function ExplanationSheet({ result, onNext, last, explainEnabled, correctText }: { result: AttemptResultDto; onNext: () => void; last: boolean; explainEnabled: boolean; correctText?: string }) {
  const [more, setMore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function explainMore() {
    setLoading(true);
    try {
      const res = await fetch("/api/explain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: result.questionId, chosenDisplayed: result.chosenDisplayed }) });
      const j = (await res.json()) as { text?: string; error?: string };
      setMore(j.text ?? j.error ?? "Couldn't load right now.");
    } catch {
      setMore("You're offline — try again later.");
    }
    setLoading(false);
  }
  return (
    <section role="dialog" aria-label="Explanation" className="fixed inset-x-0 bottom-0 z-30 max-h-[70dvh] overflow-y-auto rounded-t-lg border-t border-border bg-bg px-4 pb-4 pt-4 shadow-2xl">
      <div className="mx-auto max-w-md">
        <p className={`text-lg font-bold ${result.correct ? "text-success-700" : "text-danger-500"}`} data-testid="verdict">
          {result.correct ? `Correct! +${result.xp} XP` : result.chosenDisplayed === null ? "Skipped" : "Not quite"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text-900">{result.explanation}</p>
        {result.shortcut && <p className="mt-2 rounded-md bg-ink-50 p-2 text-sm text-ink-700"><Zap aria-hidden className="mr-1 inline h-4 w-4" />Shortcut: {result.shortcut}</p>}
        {explainEnabled && !result.correct && !more && (
          <button type="button" onClick={explainMore} disabled={loading} className="mt-2 min-h-11 text-sm font-semibold text-ink-900">
            {loading ? "Thinking…" : "Explain more"}
          </button>
        )}
        {more && <p className="mt-2 rounded-md bg-surface p-2 text-sm">{more}</p>}
        <button type="button" onClick={onNext} className="mt-4 min-h-12 w-full rounded-md bg-ink-900 font-semibold text-white">
          {last ? "Finish" : "Next"}
        </button>
      </div>
    </section>
  );
}
