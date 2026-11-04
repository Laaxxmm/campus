"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyText({ label, text }: { label: string; text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="rounded-sm border border-border bg-bg p-4">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-xs font-medium uppercase tracking-wide text-text-600">{label}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setOk(true);
              setTimeout(() => setOk(false), 1500);
            } catch {}
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border px-4 text-sm font-semibold text-ink-900 hover:border-ink-700 hover:bg-surface"
        >
          {ok ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
          {ok ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="whitespace-pre-line text-base text-text-900">{text}</p>
    </div>
  );
}
