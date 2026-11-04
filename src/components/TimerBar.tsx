"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Per-question drill timer: thin bar + seconds left (not exam chrome). */
export function QuestionTimer({ elapsedMs, limitSec }: { elapsedMs: number; limitSec: number }) {
  const pct = Math.min(100, (elapsedMs / (limitSec * 1000)) * 100);
  const over = pct >= 100;
  const s = Math.max(0, Math.round(limitSec - elapsedMs / 1000));
  return (
    <div className="flex items-center gap-2" aria-label={over ? "Time up" : `${s} seconds left`}>
      <div className="h-1 flex-1 overflow-hidden rounded-pill bg-border">
        <div className={cn("h-full", over ? "bg-coral-500" : pct > 70 ? "bg-accent-500" : "bg-ink-900")} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs tabular text-text-600">{over ? "0s" : `${s}s`}</span>
    </div>
  );
}

export function formatClock(ms: number, long = false) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return long || h > 0 ? `${String(h).padStart(2, "0")}:${mm}:${ss}` : `${Math.floor(t / 60)}:${ss}`;
}

export type TimerTone = "neutral" | "warn" | "urgent";
export const timerTone = (remainingMs: number): TimerTone => (remainingMs < 60_000 ? "urgent" : remainingMs < 300_000 ? "warn" : "neutral");

/**
 * v4 exam TimerBar: 40px pill, tabular 20/600 mm:ss (hh:mm:ss when the test is over 60 min), 4px progress under it.
 * neutral ink → amber under 5 min → coral under 1 min. Never flashes. Announces "5 minutes left" and
 * "1 minute left" once each via a polite live region.
 */
export function TimerBar({ remainingMs, totalMs, testId }: { remainingMs: number; totalMs: number; testId?: string }) {
  const tone = timerTone(remainingMs);
  const long = totalMs > 3_600_000;
  const pct = totalMs > 0 ? Math.min(100, Math.max(0, (remainingMs / totalMs) * 100)) : 0;
  const [announce, setAnnounce] = useState("");
  const said = useRef<{ five: boolean; one: boolean }>({ five: remainingMs <= 300_000, one: remainingMs <= 60_000 });
  useEffect(() => {
    if (!said.current.five && remainingMs <= 300_000 && remainingMs > 60_000) {
      said.current.five = true;
      setAnnounce("5 minutes left");
    } else if (!said.current.one && remainingMs <= 60_000 && remainingMs > 0) {
      said.current.one = said.current.five = true;
      setAnnounce("1 minute left");
    }
  }, [remainingMs]);
  return (
    <div className={cn("flex flex-col items-stretch gap-1", long ? "w-32 sm:w-36" : "w-24 sm:w-32")} data-tone={tone}>
      <div
        role="timer"
        aria-label={`Time left ${formatClock(remainingMs, long)}`}
        data-testid={testId}
        className={cn(
          "flex h-10 items-center justify-center rounded-pill border px-2 text-xl sm:px-4 font-semibold leading-none tabular transition-colors duration-200",
          tone === "neutral" && "border-ink-900 bg-ink-900 text-white",
          tone === "warn" && "border-accent-500 bg-accent-50 text-ink-900",
          tone === "urgent" && "border-coral-500 bg-coral-50 text-ink-900",
        )}
      >
        {formatClock(remainingMs, long)}
      </div>
      <div className="h-1 overflow-hidden rounded-pill bg-border" aria-hidden>
        <div className={cn("h-full transition-[width] duration-300", tone === "neutral" ? "bg-ink-900" : tone === "warn" ? "bg-accent-500" : "bg-coral-500")} style={{ width: `${pct}%` }} />
      </div>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}
