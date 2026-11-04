import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-text-900 placeholder:text-text-600 focus:outline-2 focus:outline-ink-900", className)}
      {...props}
    />
  );
}
