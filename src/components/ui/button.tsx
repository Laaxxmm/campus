import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * v4 Button spec: sm 36 (dense desktop tables only) · md 44 (default) · lg 52 (primary page CTA / exam Submit).
 * Padding x 16/20/24, radius 8, 14/16 600, icon 20 + 8 gap. Hover darken 1 step, active translateY(1px),
 * focus 2px info-500 ring + 2px offset, disabled 40%, loading = spinner replaces icon with width locked.
 * One primary CTA per screen: `cta` (amber) or `primary` (ink) filled; mark it with data-cta="primary".
 */
export const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-sm font-semibold transition-[background-color,border-color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info-500 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-ink-900 text-white hover:bg-ink-700",
        cta: "bg-accent-500 text-ink-900 hover:bg-accent-600",
        secondary: "border border-border bg-bg text-ink-900 hover:border-ink-700 hover:bg-surface",
        ghost: "text-ink-900 hover:bg-ink-50",
        danger: "bg-danger-500 text-white hover:bg-danger-700",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-base",
        lg: "h-[52px] px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block h-5 w-5 animate-spin rounded-pill border-2 border-current border-r-transparent", className)} />;
}

export function Button({ className, variant, size, loading = false, disabled, children, ...props }: ButtonProps) {
  const primary = variant === "cta" || variant === "primary" || variant === undefined;
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant ?? "primary"}
      data-filled={primary ? "" : undefined}
      {...props}
    >
      {/* width locked while loading: content stays in flow (invisible), spinner overlays */}
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      )}
    </button>
  );
}
