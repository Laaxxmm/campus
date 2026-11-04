import { cn } from "@/lib/utils";
import { Check, X as XIcon } from "lucide-react";

export type OptionState = "idle" | "selected" | "correct" | "wrong" | "disabled";
const styles: Record<OptionState, string> = {
  idle: "border-border bg-bg active:bg-ink-50",
  selected: "border-ink-900 bg-ink-50",
  correct: "border-success-500 bg-success-50 text-text-900",
  wrong: "border-danger-500 bg-danger-50 text-text-900",
  disabled: "border-border bg-bg opacity-60",
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
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-surface text-sm font-semibold">{label}</span>
      <span className="flex-1">{text}</span>
      {state === "correct" && <Check aria-label="correct" className="h-5 w-5 text-success-500" />}
      {state === "wrong" && <XIcon aria-label="wrong" className="h-5 w-5 text-danger-500" />}
    </button>
  );
}
