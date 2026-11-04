import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * v4 Card spec: radius 12, 1px border, padding 24 mobile / 32 desktop.
 * elevation 0 (static) · 1 (interactive) · hover 2. Header 16/600 + optional meta right; 16 gap header→body.
 */
export function Card({ className, interactive = false, dense = false, ...props }: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; dense?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-bg",
        dense ? "p-4" : "p-6 lg:p-8",
        interactive && "shadow-e1 transition-shadow duration-150 hover:shadow-e2",
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({ title, meta, className, as: As = "h2" }: { title: React.ReactNode; meta?: React.ReactNode; className?: string; as?: "h2" | "h3" }) {
  return (
    <div className={cn("mb-4 flex items-baseline justify-between gap-4", className)}>
      <As className="text-base font-semibold text-text-900">{title}</As>
      {meta && <div className="text-sm text-text-600">{meta}</div>}
    </div>
  );
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-base font-semibold text-text-900", className)} {...props} />;
}
