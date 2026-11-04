/** KPI tile: label 12/500 uppercase tracking-wide above; 36px tabular numeral; card padding 24 (dense grid tile). */
export function KpiCard({ label, value, hint, tone = "neutral" }: { label: string; value: string | number; hint?: string; tone?: "neutral" | "good" | "bad" }) {
  const color = tone === "good" ? "text-success-700" : tone === "bad" ? "text-danger-700" : "text-ink-900";
  return (
    <div className="h-full rounded-md border border-border bg-bg p-6">
      <div className="text-xs font-medium uppercase tracking-wide text-text-600">{label}</div>
      <div className={`mt-2 text-4xl font-bold leading-none tabular ${color}`}>{value}</div>
      {hint && <div className="mt-2 text-sm text-text-600">{hint}</div>}
    </div>
  );
}
