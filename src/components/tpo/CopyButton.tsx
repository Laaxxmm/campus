"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text, label = "Copy WhatsApp nudge" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-border bg-bg px-4 text-sm hover:bg-surface"
      data-testid="copy-nudge"
    >
      {done ? <Check aria-hidden className="h-4 w-4 text-success-700" /> : <Copy aria-hidden className="h-4 w-4" />}
      {done ? "Copied" : label}
    </button>
  );
}
