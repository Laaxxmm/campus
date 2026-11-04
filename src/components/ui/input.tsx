import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-ink-900 placeholder:text-ink-400 focus:outline-2 focus:outline-brand-600", className)}
      {...props}
    />
  );
}
