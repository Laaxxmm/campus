import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info-500 min-h-11",
  {
    variants: {
      variant: {
        primary: "bg-ink-900 text-white hover:bg-ink-700",
        cta: "bg-accent-500 text-ink-900 hover:bg-accent-600",
        secondary: "bg-bg text-text-900 border border-border hover:bg-surface",
        ghost: "text-ink-900 hover:bg-ink-50",
        danger: "bg-danger-500 text-white hover:opacity-90",
      },
      size: {
        sm: "h-11 px-3 text-sm rounded-sm",
        md: "h-11 px-4 text-base rounded-sm",
        lg: "h-14 px-6 text-lg rounded-md w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
