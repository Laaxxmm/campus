export function TimerBar({ elapsedMs, limitSec }: { elapsedMs: number; limitSec: number }) {
  const pct = Math.min(100, (elapsedMs / (limitSec * 1000)) * 100);
  const over = pct >= 100;
  const s = Math.max(0, Math.round(limitSec - elapsedMs / 1000));
  return (
    <div className="flex items-center gap-2" aria-label={over ? "Time up" : `${s} seconds left`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-border">
        <div className={`h-full ${over ? "bg-danger-500" : pct > 70 ? "bg-accent-500" : "bg-ink-900"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-10 text-right text-xs tabular ${over ? "text-danger-500" : "text-text-600"}`}>{over ? "0s" : `${s}s`}</span>
    </div>
  );
}
