export function ScoreBar({ label, score, why, bar }: { label: string; score: number; why?: string[]; bar?: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="font-medium">{label}</span><span className="font-semibold tabular">{score}</span></div>
      <div className="relative mt-1 h-2 overflow-hidden rounded-pill bg-surface" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full ${score >= 70 ? "bg-success-500" : score >= 45 ? "bg-accent-500" : "bg-coral-500"}`} style={{ width: `${score}%` }} />
        {bar !== undefined && <div aria-hidden className="absolute inset-y-0 w-0.5 bg-ink-900" style={{ left: `${bar}%` }} />}
      </div>
      {why && why.length > 0 && <p className="mt-1 text-xs text-text-600">{why.join(" · ")}</p>}
    </div>
  );
}
