import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StreakFlame } from "@/components/StreakFlame";
import { XpBadge } from "@/components/XpBadge";
import { ReadinessRing } from "@/components/ReadinessRing";
import { ProgressDots } from "@/components/ProgressDots";
import { OptionButton } from "@/components/OptionButton";
import { TimerBar } from "@/components/TimerBar";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";

export const dynamic = "force-dynamic";

const swatches = ["ink-900", "ink-700", "accent-500", "accent-600", "coral-500", "success-500", "danger-500", "info-500", "surface", "border", "text-900", "text-600", "text-400"];

/** Component gallery — dev only (404 in production). */
export default function DevUi() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <h1 className="text-3xl font-bold text-ink-900">Design system</h1>
      <section>
        <h2 className="mb-4 text-lg font-semibold">Tokens</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {swatches.map((s) => (
            <div key={s} className="rounded-sm border border-border bg-bg p-2 text-xs">
              <div className="mb-2 h-10 rounded-sm" style={{ background: `var(--${s})` }} />
              {s}
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="cta">Start drill</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Badges, inputs, cards</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="brand">Band 3</Badge>
          <Badge tone="success">Ready</Badge>
          <Badge tone="warn">Flagged</Badge>
          <Badge tone="danger">At risk</Badge>
        </div>
        <Input placeholder="you@college.edu.in" />
        <Card>
          <CardTitle>Program card</CardTitle>
          <p className="text-sm text-text-600">Border + subtle shadow, 12px radius.</p>
        </Card>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Gamification</h2>
        <div className="flex items-center gap-4">
          <StreakFlame days={7} />
          <StreakFlame days={0} />
          <XpBadge xp={1240} />
          <ReadinessRing score={64} label="TCS NQT ready" />
        </div>
        <ProgressDots states={["correct", "wrong", "pending", "current", "todo", "todo", "todo", "todo", "todo", "todo"]} />
        <TimerBar elapsedMs={42_000} limitSec={60} />
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Options</h2>
        <OptionButton label="A" text="Idle" state="idle" />
        <OptionButton label="B" text="Selected" state="selected" />
        <OptionButton label="C" text="Correct" state="correct" />
        <OptionButton label="D" text="Wrong" state="wrong" />
      </section>
      <section className="grid grid-cols-2 gap-4">
        <KpiCard label="Weekly active" value="68%" hint="target ≥ 60%" tone="good" />
        <KpiCard label="At risk" value={12} tone="bad" />
      </section>
      <EmptyState title="No data yet" body="Real empty states, never lorem ipsum." />
    </main>
  );
}
