import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * v4 containers + gutters. app 1120 (student) · reading 720 (≈70ch: single-column pages, mock stem) · wide 1440 (TPO/admin).
 * Gutters 16 mobile / 24 tablet / 32 desktop.
 */
const widths = { app: "max-w-[1120px]", reading: "max-w-[720px]", wide: "max-w-[1440px]" } as const;
export function Container({ size = "app", className, gutters = true, ...props }: React.HTMLAttributes<HTMLDivElement> & { size?: keyof typeof widths; gutters?: boolean }) {
  return <div className={cn("mx-auto w-full", widths[size], gutters && "px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

/** v4 page header: min 56 mobile / 72 desktop; title 24–30/600 + 16 subtitle; actions right on same baseline; 32 below. */
export function PageHeader({ title, subtitle, actions, eyebrow, className }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode; className?: string }) {
  return (
    <header data-page-header className={cn("mb-8 flex min-h-14 flex-wrap items-end justify-between gap-4 pt-6 lg:min-h-[72px] lg:pt-8", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-600">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold text-ink-900 lg:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-base text-text-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Section rhythm: 48 mobile / 64 desktop between sections; header→content 24. */
export function Section({ title, meta, children, className, id }: { title?: React.ReactNode; meta?: React.ReactNode; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("mt-12 first:mt-0 lg:mt-16", className)} aria-labelledby={id && title ? `${id}-h` : undefined}>
      {title && (
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 id={id ? `${id}-h` : undefined} className="text-lg font-semibold text-ink-900">
            {title}
          </h2>
          {meta && <div className="text-sm text-text-600">{meta}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** KPI numeral: label 12–14/500 uppercase tracking-wide above, value 36–60 tabular. */
export function Stat({ label, value, hint, size = "md", tone = "neutral" }: { label: string; value: React.ReactNode; hint?: React.ReactNode; size?: "md" | "lg"; tone?: "neutral" | "good" | "bad" }) {
  const color = tone === "good" ? "text-success-700" : tone === "bad" ? "text-danger-700" : "text-ink-900";
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-text-600">{label}</div>
      <div className={cn("mt-2 font-bold leading-none tabular", size === "lg" ? "text-5xl lg:text-6xl" : "text-4xl", color)}>{value}</div>
      {hint && <div className="mt-2 text-sm text-text-600">{hint}</div>}
    </div>
  );
}
