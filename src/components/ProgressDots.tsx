export type DotState = "todo" | "current" | "correct" | "wrong" | "pending";
const cls: Record<DotState, string> = {
  todo: "bg-border",
  current: "bg-brand-600 ring-2 ring-brand-50",
  correct: "bg-success",
  wrong: "bg-danger",
  pending: "bg-warn",
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
