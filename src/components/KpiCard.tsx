export function KpiCard({ label, value, hint, tone = "neutral" }: { label: string; value: string | number; hint?: string; tone?: "neutral" | "good" | "bad" }) {
  const color = tone === "good" ? "text-success" : tone === "bad" ? "text-danger" : "text-ink-900";
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-600">{label}</div>
      <div className={`mt-1 text-3xl font-bold tabular ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-600">{hint}</div>}
    </div>
  );
}
