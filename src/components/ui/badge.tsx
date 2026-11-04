import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-bg text-ink-600 border-border",
  brand: "bg-brand-50 text-brand-700 border-brand-50",
  success: "bg-success-50 text-success border-success-50",
  danger: "bg-danger-50 text-danger border-danger-50",
  warn: "bg-warn-50 text-ink-900 border-warn-50",
} as const;

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)} {...props} />;
}
