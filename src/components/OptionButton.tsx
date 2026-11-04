import { cn } from "@/lib/utils";

export type OptionState = "idle" | "selected" | "correct" | "wrong" | "disabled";
const styles: Record<OptionState, string> = {
  idle: "border-border bg-surface active:bg-brand-50",
  selected: "border-brand-600 bg-brand-50",
  correct: "border-success bg-success-50 text-ink-900",
  wrong: "border-danger bg-danger-50 text-ink-900",
  disabled: "border-border bg-surface opacity-60",
};
export function OptionButton({ label, text, state, onClick }: { label: string; text: string; state: OptionState; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state !== "idle" && state !== "selected"}
      data-state={state}
      className={cn("flex min-h-12 w-full items-center gap-3 rounded-md border-2 px-3 py-2 text-left text-base transition-colors", styles[state])}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-bg text-sm font-semibold">{label}</span>
      <span className="flex-1">{text}</span>
      {state === "correct" && <span aria-label="correct">✓</span>}
      {state === "wrong" && <span aria-label="wrong">✗</span>}
    </button>
  );
}
