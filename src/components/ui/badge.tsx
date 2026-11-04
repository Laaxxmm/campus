import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-surface text-text-600 border-border",
  brand: "bg-ink-50 text-ink-700 border-ink-50",
  success: "bg-success-50 text-success-700 border-success-50",
  danger: "bg-danger-50 text-danger-500 border-danger-50",
  warn: "bg-accent-50 text-text-900 border-accent-50",
} as const;

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)} {...props} />;
}
