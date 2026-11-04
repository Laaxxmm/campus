export function ReadinessRing({ score, label, size = 112 }: { score: number; label: string; size?: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 70 ? "var(--success-500)" : pct >= 40 ? "var(--accent-500)" : "var(--coral-500)"; // calm: no red for readiness
  return (
    <figure className="flex flex-col items-center" aria-label={`${label} readiness ${pct} out of 100`}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 50 50)" />
        <text x="50" y="55" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text-900)">{pct}</text>
      </svg>
      <figcaption className="mt-1 text-xs text-text-600">{label}</figcaption>
    </figure>
  );
}
