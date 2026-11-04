import { describe, expect, it } from "vitest";
import { applyActivity, displayStreak, NEW_STREAK } from "./streak";
import { addDays, istDate, isoWeek } from "./time";
import { xpForAttempt } from "./xp";

describe("IST day boundary", () => {
  it("18:29:59Z is still the same IST day, 18:30Z is the next", () => {
    expect(istDate(new Date("2026-11-04T18:29:59Z"))).toBe("2026-11-04");
    expect(istDate(new Date("2026-11-04T18:30:00Z"))).toBe("2026-11-05");
  });
  it("UTC midnight is 05:30 IST same date", () => {
    expect(istDate(new Date("2026-11-05T00:00:00Z"))).toBe("2026-11-05");
  });
  it("iso weeks", () => {
    expect(isoWeek("2026-11-04")).toBe("2026-W45");
    expect(isoWeek("2027-01-01")).toBe("2026-W53");
    expect(isoWeek("2026-01-01")).toBe("2026-W01");
  });
});

describe("streak", () => {
  const d0 = "2026-11-02"; // Monday
  it("starts at 1", () => {
    const r = applyActivity(NEW_STREAK, d0);
    expect(r.event).toBe("started");
    expect(r.state.current).toBe(1);
  });
  it("same day twice does not double count (double submit)", () => {
    const s1 = applyActivity(NEW_STREAK, d0).state;
    const r = applyActivity(s1, d0);
    expect(r.event).toBe("same_day");
    expect(r.state.current).toBe(1);
  });
  it("consecutive days continue", () => {
    let s = applyActivity(NEW_STREAK, d0).state;
    s = applyActivity(s, addDays(d0, 1)).state;
    s = applyActivity(s, addDays(d0, 2)).state;
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });
  it("a single missed day uses the weekly freeze", () => {
    let s = applyActivity(NEW_STREAK, d0).state;
    s = applyActivity(s, addDays(d0, 1)).state; // Tue
    const r = applyActivity(s, addDays(d0, 3)); // Thu, missed Wed
    expect(r.event).toBe("freeze_used");
    expect(r.state.current).toBe(3);
    expect(r.state.freezes).toBe(0);
  });
  it("second miss in the same ISO week resets", () => {
    let s = applyActivity(NEW_STREAK, d0).state;
    s = applyActivity(s, addDays(d0, 2)).state; // freeze used Wed
    const r = applyActivity(s, addDays(d0, 4)); // Fri, missed Thu
    expect(r.event).toBe("reset");
    expect(r.state.current).toBe(1);
    expect(r.state.longest).toBe(2);
  });
  it("freeze refills next ISO week", () => {
    let s = applyActivity(NEW_STREAK, d0).state;
    s = applyActivity(s, addDays(d0, 2)).state; // freeze in W45
    s = applyActivity(s, addDays(d0, 3)).state;
    s = applyActivity(s, addDays(d0, 4)).state;
    s = applyActivity(s, addDays(d0, 5)).state;
    s = applyActivity(s, addDays(d0, 6)).state; // Sun
    const r = applyActivity(s, addDays(d0, 8)); // Tue W46, missed Mon
    expect(r.event).toBe("freeze_used");
  });
  it("two missed days reset", () => {
    const s = applyActivity(NEW_STREAK, d0).state;
    expect(applyActivity(s, addDays(d0, 3)).event).toBe("reset");
  });
  it("display streak shows 0 once broken", () => {
    const s = applyActivity(NEW_STREAK, d0).state;
    expect(displayStreak(s, d0)).toBe(1);
    expect(displayStreak(s, addDays(d0, 1))).toBe(1);
    expect(displayStreak(s, addDays(d0, 2))).toBe(1); // freeze would save it
    expect(displayStreak(s, addDays(d0, 3))).toBe(0);
  });
});

describe("xp", () => {
  it("10 per correct, +5 when under half time", () => {
    expect(xpForAttempt(true, 20_000, 60)).toBe(15);
    expect(xpForAttempt(true, 40_000, 60)).toBe(10);
    expect(xpForAttempt(false, 1_000, 60)).toBe(0);
  });
});
