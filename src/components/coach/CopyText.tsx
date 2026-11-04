"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyText({ label, text }: { label: string; text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="rounded-sm border border-border bg-surface p-3">
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-text-600">
        {label}
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} }} className="inline-flex min-h-9 items-center gap-1 rounded-sm px-2 text-ink-900 hover:bg-ink-50">
          {ok ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}{ok ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="whitespace-pre-line text-sm">{text}</p>
    </div>
  );
}
