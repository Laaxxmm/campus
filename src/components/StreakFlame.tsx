export function StreakFlame({ days, size = "md" }: { days: number; size?: "md" | "lg" }) {
  const active = days > 0;
  return (
    <span className={`inline-flex items-center gap-1 font-bold tabular ${size === "lg" ? "text-3xl" : "text-base"} ${active ? "text-streak" : "text-ink-400"}`} aria-label={`${days} day streak`}>
      <span aria-hidden className={active ? "" : "grayscale"}>🔥</span>
      {days}
    </span>
  );
}
