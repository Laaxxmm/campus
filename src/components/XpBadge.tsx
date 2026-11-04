export function XpBadge({ xp }: { xp: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-700 tabular" aria-label={`${xp} XP`}>
      ⭐ {xp.toLocaleString("en-IN")} XP
    </span>
  );
}
