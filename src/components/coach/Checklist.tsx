import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import type { Checklist as C } from "@/lib/coach/checklists";

const ICON = { pass: <CircleCheck aria-label="done" className="h-5 w-5 shrink-0 text-success-700" />, warn: <CircleAlert aria-label="improve" className="h-5 w-5 shrink-0 text-accent-600" />, fail: <CircleX aria-label="missing" className="h-5 w-5 shrink-0 text-coral-500" /> };

export function Checklist({ c, testid }: { c: C; testid: string }) {
  return (
    <div data-testid={testid}>
      <div className="mb-2 flex items-baseline justify-between"><span className="text-sm font-semibold">Checklist</span><span className="text-2xl font-bold tabular" data-testid={`${testid}-score`}>{c.score}%</span></div>
      <ul className="space-y-2">
        {c.items.map((i) => (
          <li key={i.key} className="flex gap-2 text-sm">
            {ICON[i.status]}
            <div><div className="font-medium">{i.label}</div>{i.status !== "pass" && <div className="text-xs text-text-600">{i.tip}</div>}</div>
          </li>
        ))}
      </ul>
      {(c.keywordsMissing.length > 0 || c.keywordsFound.length > 0) && (
        <p className="mt-4 text-xs text-text-600">Target-company keywords — found: {c.keywordsFound.join(", ") || "none"} · missing: {c.keywordsMissing.join(", ") || "none"} (add only skills you really have).</p>
      )}
    </div>
  );
}
