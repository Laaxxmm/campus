"use client";
import { Printer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/** Secondary action: printing is never the page's primary CTA. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonVariants({ variant: "secondary", className: "no-print" })}>
      <Printer aria-hidden /> Print / save PDF
    </button>
  );
}
