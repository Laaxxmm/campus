export type DotState = "todo" | "current" | "correct" | "wrong" | "pending";
const cls: Record<DotState, string> = {
  todo: "bg-border",
  current: "bg-ink-900 ring-2 ring-ink-50",
  correct: "bg-success-500",
  wrong: "bg-danger-500",
  pending: "bg-accent-500",
};
export function ProgressDots({ states }: { states: DotState[] }) {
  return (
    <ol className="flex items-center justify-center gap-1.5" aria-label="Progress">
      {states.map((s, i) => (
        <li key={i} className={`h-2.5 w-2.5 rounded-pill ${cls[s]}`} aria-label={`Question ${i + 1}: ${s}`} />
      ))}
    </ol>
  );
}
