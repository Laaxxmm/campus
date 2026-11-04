import { cn } from "@/lib/utils";
import { Check, X as XIcon } from "lucide-react";

export type OptionState = "idle" | "selected" | "correct" | "wrong" | "disabled";
const styles: Record<OptionState, string> = {
  idle: "border-border bg-bg hover:border-ink-700 active:bg-surface",
  // 2px emphasis via border + 1px ring so selection never shifts layout
  selected: "border-ink-900 bg-ink-50 ring-1 ring-ink-900",
  correct: "border-success-500 bg-success-50 text-text-900 ring-1 ring-success-500",
  wrong: "border-danger-500 bg-danger-50 text-text-900 ring-1 ring-danger-500",
  disabled: "border-border bg-bg opacity-60",
};

/**
 * v4 OptionCard: min 56px, 16px padding, radio indicator left + letter key A–D, selected = 2px ink border + tint.
 * Review mode: correct / your-answer badges.
 */
export function OptionButton({
  label,
  text,
  state,
  onClick,
  radio = false,
  badge,
}: {
  label: string;
  text: string;
  state: OptionState;
  onClick?: () => void;
  radio?: boolean;
  badge?: "correct" | "yours" | "yours-correct";
}) {
  const checked = state === "selected";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state !== "idle" && state !== "selected"}
      data-state={state}
      role={radio ? "radio" : undefined}
      aria-checked={radio ? checked : undefined}
      className={cn("flex min-h-14 w-full items-center gap-4 rounded-md border p-4 text-left text-base transition-colors duration-150", styles[state])}
    >
      <span aria-hidden className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border-2", checked ? "border-ink-900" : "border-text-400")}>
        {checked && <span className="h-2 w-2 rounded-pill bg-ink-900" />}
      </span>
      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-surface text-sm font-semibold text-ink-900">
        {label}
      </span>
      <span className="sr-only">Option {label}:</span>
      <span className="flex-1">{text}</span>
      {badge && (
        <span className={cn("rounded-pill px-2 py-1 text-xs font-semibold", badge === "yours" ? "bg-danger-50 text-danger-700" : "bg-success-50 text-success-700")}>
          {badge === "correct" ? "Correct answer" : badge === "yours" ? "Your answer" : "Your answer · correct"}
        </span>
      )}
      {state === "correct" && !badge && <Check aria-label="correct" className="h-5 w-5 text-success-700" />}
      {state === "wrong" && !badge && <XIcon aria-label="wrong" className="h-5 w-5 text-danger-700" />}
    </button>
  );
}
export const OptionCard = OptionButton;
