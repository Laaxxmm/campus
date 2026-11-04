import * as React from "react";
import { cn } from "@/lib/utils";

/** v4 Input spec: 44px, label above 14/500, helper 12 text-600, 8 gaps. */
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-sm border border-border bg-bg px-4 text-base text-text-900 placeholder:text-text-600 focus:border-ink-900 focus:outline-2 focus:outline-offset-2 focus:outline-info-500 disabled:opacity-40 aria-[invalid=true]:border-danger-500",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, htmlFor, helper, error, children, className }: { label: string; htmlFor: string; helper?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-text-900">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-danger-700">
          {error}
        </p>
      ) : helper ? (
        <p id={`${htmlFor}-help`} className="text-xs text-text-600">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
