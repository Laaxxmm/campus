"use client";
import { Button } from "@/components/ui/button";
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
    <section role="dialog" aria-label="Explanation" className="fixed inset-x-0 bottom-0 z-30 max-h-[70dvh] overflow-y-auto rounded-t-lg border-t border-border bg-bg shadow-e2">
      <div className="mx-auto max-w-[720px] px-4 pb-6 pt-6 sm:px-6 lg:pb-8">
        <p className={`text-lg font-bold ${result.correct ? "text-success-700" : "text-danger-700"}`} data-testid="verdict">
          {result.correct ? `Correct! +${result.xp} XP` : result.chosenDisplayed === null ? "Skipped" : "Not quite"}
        </p>
        {!result.correct && correctText && (
          <p className="mt-2 text-sm font-semibold text-ink-900" data-testid="correct-answer">
            Answer: {["A", "B", "C", "D"][result.correctDisplayed]}. {correctText}
          </p>
        )}
        <p className="mt-4 max-w-[70ch] text-base leading-relaxed text-text-900">{result.explanation}</p>
        {result.shortcut && <p className="mt-4 flex items-start gap-2 rounded-md bg-ink-50 p-4 text-sm text-ink-700"><Zap aria-hidden className="h-4 w-4 shrink-0 translate-y-0.5" />Shortcut: {result.shortcut}</p>}
        {explainEnabled && !result.correct && !more && (
          <button type="button" onClick={explainMore} disabled={loading} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-ink-900 underline-offset-4 hover:underline">
            {loading ? "Thinking…" : "Explain more"}
          </button>
        )}
        {more && <p className="mt-4 rounded-md bg-surface p-4 text-sm">{more}</p>}
        <Button size="lg" onClick={onNext} className="mt-6 w-full" data-cta="primary" autoFocus>
          {last ? "Finish" : "Next"}
        </Button>
      </div>
    </section>
  );
}
