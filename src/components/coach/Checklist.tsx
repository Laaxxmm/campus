import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import type { Checklist as C } from "@/lib/coach/checklists";

const ICON = { pass: <CircleCheck aria-label="done" className="h-5 w-5 shrink-0 text-success-700" />, warn: <CircleAlert aria-label="improve" className="h-5 w-5 shrink-0 text-accent-600" />, fail: <CircleX aria-label="missing" className="h-5 w-5 shrink-0 text-coral-500" /> };

export function Checklist({ c, testid }: { c: C; testid: string }) {
  return (
    <div data-testid={testid}>
      <div className="text-xs font-medium uppercase tracking-wide text-text-600">Checklist</div>
      <div className="mt-2 text-5xl font-bold leading-none text-ink-900 tabular" data-testid={`${testid}-score`}>
        {c.score}%
      </div>
      <ul className="mt-6 space-y-4">
        {c.items.map((i) => (
          <li key={i.key} className="flex gap-4 text-base">
            {ICON[i.status]}
            <div className="min-w-0">
              <div className="font-medium text-text-900">{i.label}</div>
              {i.status !== "pass" && <div className="mt-2 text-sm text-text-600">{i.tip}</div>}
            </div>
          </li>
        ))}
      </ul>
      {(c.keywordsMissing.length > 0 || c.keywordsFound.length > 0) && (
        <p className="mt-6 border-t border-border pt-4 text-sm text-text-600">
          Target-company keywords — found: {c.keywordsFound.join(", ") || "none"} · missing: {c.keywordsMissing.join(", ") || "none"} (add only skills you really have).
        </p>
      )}
    </div>
  );
}
