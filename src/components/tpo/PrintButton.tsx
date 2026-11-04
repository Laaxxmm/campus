"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="no-print inline-flex min-h-11 items-center gap-2 rounded-sm bg-ink-900 px-4 text-sm font-semibold text-white hover:bg-ink-700">
      <Printer aria-hidden className="h-4 w-4" /> Print / save PDF
    </button>
  );
}
