"use client";
import { useState } from "react";
import type { AttemptResultDto } from "@/lib/drill";

export function ExplanationSheet({ result, onNext, last, explainEnabled }: { result: AttemptResultDto; onNext: () => void; last: boolean; explainEnabled: boolean }) {
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
    <section role="dialog" aria-label="Explanation" className="fixed inset-x-0 bottom-0 z-30 max-h-[70dvh] overflow-y-auto rounded-t-lg border-t border-border bg-surface px-4 pb-4 pt-4 shadow-2xl">
      <div className="mx-auto max-w-md">
        <p className={`text-lg font-bold ${result.correct ? "text-success" : "text-danger"}`} data-testid="verdict">
          {result.correct ? `Correct! +${result.xp} XP` : result.chosenDisplayed === null ? "Skipped" : "Not quite"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-900">{result.explanation}</p>
        {result.shortcut && <p className="mt-2 rounded-md bg-brand-50 p-2 text-sm text-brand-700">⚡ Shortcut: {result.shortcut}</p>}
        {explainEnabled && !result.correct && !more && (
          <button type="button" onClick={explainMore} disabled={loading} className="mt-2 min-h-11 text-sm font-semibold text-brand-600">
            {loading ? "Thinking…" : "Explain more"}
          </button>
        )}
        {more && <p className="mt-2 rounded-md bg-bg p-2 text-sm">{more}</p>}
        <button type="button" onClick={onNext} className="mt-4 min-h-12 w-full rounded-md bg-brand-600 font-semibold text-white">
          {last ? "Finish" : "Next"}
        </button>
      </div>
    </section>
  );
}
