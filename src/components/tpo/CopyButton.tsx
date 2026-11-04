"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/** Secondary action: copying a nudge is never the page's primary CTA. */
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
      className={buttonVariants({ variant: "secondary", className: "shrink-0" })}
      data-testid="copy-nudge"
    >
      {done ? <Check aria-hidden className="text-success-700" /> : <Copy aria-hidden />}
      {done ? "Copied" : label}
    </button>
  );
}
