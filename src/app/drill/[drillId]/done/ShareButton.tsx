"use client";
import { useState } from "react";

export function ShareButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {}
  }
  return (
    <button type="button" onClick={share} className="mt-4 min-h-11 rounded-pill border border-border bg-surface px-5 text-sm font-semibold">
      {copied ? "Copied!" : "Share my score"}
    </button>
  );
}
