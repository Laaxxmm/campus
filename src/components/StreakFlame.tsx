import { Flame } from "lucide-react";

export function StreakFlame({ days, size = "md" }: { days: number; size?: "md" | "lg" }) {
  const active = days > 0;
  return (
    <span className={`inline-flex items-center gap-1 font-bold tabular ${size === "lg" ? "text-3xl" : "text-base"} ${active ? "text-accent-600" : "text-text-400"}`} aria-label={`${days} day streak`}>
      <Flame aria-hidden className={size === "lg" ? "h-8 w-8" : "h-5 w-5"} fill={active ? "var(--accent-500)" : "none"} />
      {days}
    </span>
  );
}
