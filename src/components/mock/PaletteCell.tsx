import { cn } from "@/lib/utils";

export type PaletteState = "new" | "visited" | "answered";

/** v4 palette cell: 40×40, radius 8. unvisited border · visited-unanswered coral outline · answered ink fill · flagged amber dot · current 2px info ring. */
export function PaletteCell({
  n,
  state,
  flagged = false,
  current = false,
  locked = false,
  onClick,
}: {
  n: number;
  state: PaletteState;
  flagged?: boolean;
  current?: boolean;
  locked?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      aria-label={`Question ${n}${state === "answered" ? ", answered" : state === "visited" ? ", not answered" : ", not visited"}${flagged ? ", flagged" : ""}`}
      aria-current={current ? "true" : undefined}
      data-state={state}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-sm text-sm font-semibold tabular transition-colors duration-150",
        state === "answered" ? "bg-ink-900 text-white" : state === "visited" ? "border-2 border-coral-500 bg-bg text-ink-900" : "border border-border bg-bg text-text-600",
        current && "ring-2 ring-info-500 ring-offset-2",
        locked && "opacity-40",
      )}
    >
      {n}
      {flagged && <span aria-hidden className="absolute right-1 top-1 h-2 w-2 rounded-pill bg-accent-500 ring-1 ring-bg" />}
    </button>
  );
}
