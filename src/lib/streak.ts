import { daysBetween, isoWeek } from "./time";

export type StreakState = {
  current: number;
  longest: number;
  lastActiveDate: string | null;
  freezes: number; // freezes left this ISO week (0 or 1)
  freezeWeek: string | null; // ISO week in which the freeze was last used
};
export type StreakEvent = "started" | "same_day" | "continued" | "freeze_used" | "reset";

export const NEW_STREAK: StreakState = { current: 0, longest: 0, lastActiveDate: null, freezes: 1, freezeWeek: null };

export function freezeAvailable(s: StreakState, today: string) {
  return s.freezeWeek !== isoWeek(today);
}

/** Apply "completed a drill on IST date `today`". Pure. */
export function applyActivity(s: StreakState, today: string): { state: StreakState; event: StreakEvent } {
  if (!s.lastActiveDate) {
    const current = 1;
    return { state: { ...s, current, longest: Math.max(s.longest, current), lastActiveDate: today, freezes: freezeAvailable(s, today) ? 1 : 0 }, event: "started" };
  }
  const gap = daysBetween(s.lastActiveDate, today);
  if (gap <= 0) return { state: s, event: "same_day" }; // same day (or clock skew) → no change
  let current: number;
  let event: StreakEvent;
  let freezeWeek = s.freezeWeek;
  if (gap === 1) {
    current = s.current + 1;
    event = "continued";
  } else if (gap === 2 && freezeAvailable(s, today)) {
    current = s.current + 1;
    freezeWeek = isoWeek(today);
    event = "freeze_used";
  } else {
    current = 1;
    event = "reset";
  }
  const next: StreakState = { current, longest: Math.max(s.longest, current), lastActiveDate: today, freezeWeek, freezes: freezeWeek === isoWeek(today) ? 0 : 1 };
  return { state: next, event };
}

/** Streak as displayed today: 0 if broken (missed ≥ 2 days, or 2 days with freeze spent). */
export function displayStreak(s: StreakState, today: string): number {
  if (!s.lastActiveDate) return 0;
  const gap = daysBetween(s.lastActiveDate, today);
  if (gap <= 1) return s.current;
  if (gap === 2 && freezeAvailable(s, today)) return s.current;
  return 0;
}
