export function KpiCard({ label, value, hint, tone = "neutral" }: { label: string; value: string | number; hint?: string; tone?: "neutral" | "good" | "bad" }) {
  const color = tone === "good" ? "text-success-700" : tone === "bad" ? "text-danger-500" : "text-text-900";
  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-text-600">{label}</div>
      <div className={`mt-1 text-3xl font-bold tabular ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-text-600">{hint}</div>}
    </div>
  );
}
