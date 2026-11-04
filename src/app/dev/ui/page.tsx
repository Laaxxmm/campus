import { notFound } from "next/navigation";
import { ArrowRight, Play } from "lucide-react";
import { devLinksExposed } from "@/lib/mail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Container, PageHeader, Section, Stat } from "@/components/ui/layout";
import { StreakFlame } from "@/components/StreakFlame";
import { XpBadge } from "@/components/XpBadge";
import { ReadinessRing } from "@/components/ReadinessRing";
import { ProgressDots } from "@/components/ProgressDots";
import { OptionButton } from "@/components/OptionButton";
import { QuestionTimer, TimerBar } from "@/components/TimerBar";
import { PaletteCell } from "@/components/mock/PaletteCell";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { Heatmap } from "@/components/Heatmap";

export const dynamic = "force-dynamic";

const swatches = ["ink-900", "ink-700", "ink-50", "accent-500", "accent-600", "accent-50", "coral-500", "coral-50", "success-500", "success-700", "danger-500", "danger-700", "info-500", "bg", "surface", "border", "text-900", "text-600", "text-400"];
const spacing = [8, 16, 24, 32, 40, 48, 64, 80, 96];
const variants = ["primary", "cta", "secondary", "ghost", "danger"] as const;
const sizes = ["sm", "md", "lg"] as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 border-t border-border py-4 first:border-t-0 first:pt-0 md:grid-cols-[160px_1fr] md:items-center">
      <div className="text-xs font-medium uppercase tracking-wide text-text-600">{label}</div>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </div>
  );
}

/**
 * Component gallery — every component in every state (v4 gate). Dev/preview only:
 * 404 in production unless dev login links are explicitly exposed. The one-primary-CTA rule does not apply here.
 */
export default function DevUi() {
  if (!devLinksExposed()) notFound();
  return (
    <main className="min-h-dvh bg-surface pb-24" data-gallery>
      <Container size="app">
        <PageHeader eyebrow="LearnCrew Campus · v4" title="Design system" subtitle="Tokens, layout primitives and every component in all states. Hover/focus/active are shown statically." />

        <Section title="Colour tokens" meta="60 / 30 / 10 — surface · ink · amber">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-7">
            {swatches.map((s) => (
              <div key={s} className="rounded-sm border border-border bg-bg p-2 text-xs">
                <div className="mb-2 h-10 rounded-sm border border-border" style={{ background: `var(--${s})` }} />
                {s}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Spacing — 8pt grid" meta="4px only for icon gaps and chip padding">
          <Card>
            <ul className="space-y-2">
              {spacing.map((px) => (
                <li key={px} className="flex items-center gap-4 text-sm tabular">
                  <span className="w-12 text-text-600">{px}px</span>
                  <span className="h-4 rounded-sm bg-ink-900" style={{ width: px * 3 }} />
                </li>
              ))}
            </ul>
          </Card>
        </Section>

        <Section title="Typography" meta="Inter · 12/14/16/18/20/24/30/36">
          <Card className="space-y-4">
            <p className="text-3xl font-semibold text-ink-900">Page title 30/600</p>
            <p className="text-2xl font-semibold text-ink-900">Page title mobile 24/600</p>
            <p className="text-lg font-semibold text-ink-900">Section 18/600</p>
            <p className="text-base font-semibold text-text-900">Card header 16/600</p>
            <p className="text-base text-text-900">Body 16/400 — a rhythm that respects your week.</p>
            <p className="text-sm text-text-600">Meta 14/400 text-600</p>
            <p className="text-xs font-medium uppercase tracking-wide text-text-600">KPI label 12/500</p>
            <p className="text-6xl font-bold leading-none tabular text-ink-900">72/100</p>
          </Card>
        </Section>

        <Section title="Button" meta="sm 36 · md 44 · lg 52 · radius 8">
          <Card>
            {sizes.map((size) => (
              <Row key={size} label={`size ${size}`}>
                {variants.map((v) => (
                  <Button key={v} variant={v} size={size}>
                    {v}
                  </Button>
                ))}
              </Row>
            ))}
            <Row label="with icon">
              <Button variant="cta" size="lg">
                <Play aria-hidden />
                Start today&apos;s drill
              </Button>
              <Button variant="secondary">
                Next
                <ArrowRight aria-hidden />
              </Button>
            </Row>
            <Row label="hover">
              <Button className="bg-ink-700">primary</Button>
              <Button variant="cta" className="bg-accent-600">
                cta
              </Button>
              <Button variant="secondary" className="border-ink-700 bg-surface">
                secondary
              </Button>
              <Button variant="ghost" className="bg-ink-50">
                ghost
              </Button>
            </Row>
            <Row label="focus">
              <Button className="outline-2 outline-offset-2 outline-info-500">primary</Button>
              <Button variant="secondary" className="outline-2 outline-offset-2 outline-info-500">
                secondary
              </Button>
            </Row>
            <Row label="active">
              <Button className="translate-y-px">primary</Button>
            </Row>
            <Row label="disabled">
              {variants.map((v) => (
                <Button key={v} variant={v} disabled>
                  {v}
                </Button>
              ))}
            </Row>
            <Row label="loading">
              <Button loading>Submitting</Button>
              <Button variant="cta" size="lg" loading>
                Submit test
              </Button>
              <Button variant="secondary" loading>
                Saving
              </Button>
            </Row>
          </Card>
        </Section>

        <Section title="Card" meta="radius 12 · padding 24/32 · elevation 0/1/2">
          <div className="grid items-stretch gap-6 md:grid-cols-3">
            <Card className="h-full">
              <CardHeader title="Elevation 0" meta="static" />
              <p className="text-sm text-text-600">Border only. Default for content.</p>
            </Card>
            <Card interactive className="h-full">
              <CardHeader title="Elevation 1" meta="interactive" />
              <p className="text-sm text-text-600">Clickable cards; hover lifts to elevation 2.</p>
            </Card>
            <Card className="h-full shadow-e2">
              <CardHeader title="Elevation 2" meta="hover" />
              <p className="text-sm text-text-600">Hover state of an interactive card.</p>
            </Card>
          </div>
        </Section>

        <Section title="Inputs" meta="44px · label 14/500 above · helper 12">
          <Card className="grid gap-6 md:grid-cols-2">
            <Field label="College email" htmlFor="d-email" helper="We send a one-tap login link.">
              <Input id="d-email" placeholder="you@college.edu.in" />
            </Field>
            <Field label="Focused" htmlFor="d-focus">
              <Input id="d-focus" defaultValue="kavya@demo.edu.in" className="border-ink-900 outline-2 outline-offset-2 outline-info-500" />
            </Field>
            <Field label="With error" htmlFor="d-err" error="That email isn't on your college roster.">
              <Input id="d-err" defaultValue="someone@gmail.com" aria-invalid="true" aria-describedby="d-err-error" />
            </Field>
            <Field label="Disabled" htmlFor="d-dis">
              <Input id="d-dis" disabled defaultValue="Locked" />
            </Field>
          </Card>
        </Section>

        <Section title="Chips">
          <Card className="flex flex-wrap gap-2">
            <Badge>Neutral</Badge>
            <Badge tone="brand">Band 3</Badge>
            <Badge tone="success">Ready</Badge>
            <Badge tone="warn">Flagged</Badge>
            <Badge tone="danger">At risk</Badge>
          </Card>
        </Section>

        <Section title="TimerBar" meta="40px pill · ink → amber <5 min → coral <1 min">
          <Card className="flex flex-wrap items-start gap-8">
            <div className="space-y-2">
              <TimerBar remainingMs={24 * 60_000 + 12_000} totalMs={30 * 60_000} />
              <p className="text-xs text-text-600">neutral</p>
            </div>
            <div className="space-y-2">
              <TimerBar remainingMs={4 * 60_000 + 30_000} totalMs={30 * 60_000} />
              <p className="text-xs text-text-600">under 5 min</p>
            </div>
            <div className="space-y-2">
              <TimerBar remainingMs={42_000} totalMs={30 * 60_000} />
              <p className="text-xs text-text-600">under 1 min</p>
            </div>
            <div className="space-y-2">
              <TimerBar remainingMs={95 * 60_000} totalMs={120 * 60_000} />
              <p className="text-xs text-text-600">over 60 min → hh:mm:ss</p>
            </div>
            <div className="w-64 space-y-2">
              <QuestionTimer elapsedMs={42_000} limitSec={60} />
              <p className="text-xs text-text-600">drill question timer</p>
            </div>
          </Card>
        </Section>

        <Section title="OptionCard" meta="56px min · radio + letter key">
          <Card className="space-y-4">
            <OptionButton radio label="A" text="Idle" state="idle" />
            <OptionButton radio label="B" text="Selected" state="selected" />
            <OptionButton label="C" text="Correct (drill feedback)" state="correct" />
            <OptionButton label="D" text="Wrong (drill feedback)" state="wrong" />
            <OptionButton label="A" text="Disabled" state="disabled" />
            <OptionButton label="B" text="Review mode — correct answer" state="correct" badge="correct" />
            <OptionButton label="C" text="Review mode — your answer" state="wrong" badge="yours" />
          </Card>
        </Section>

        <Section title="Palette cell" meta="40×40 · radius 8">
          <Card>
            <div className="flex flex-wrap gap-8">
              {(
                [
                  ["Not visited", { state: "new" }],
                  ["Not answered", { state: "visited" }],
                  ["Answered", { state: "answered" }],
                  ["Flagged", { state: "visited", flagged: true }],
                  ["Answered + flagged", { state: "answered", flagged: true }],
                  ["Current", { state: "visited", current: true }],
                  ["Locked section", { state: "new", locked: true }],
                ] as const
              ).map(([label, p], i) => (
                <div key={label} className="flex flex-col items-center gap-2 text-xs text-text-600">
                  <PaletteCell n={i + 1} {...p} />
                  {label}
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <Section title="KPIs">
          <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Weekly active" value="68%" hint="target ≥ 60%" tone="good" />
            <KpiCard label="At risk" value={12} tone="bad" />
            <KpiCard label="Avg readiness" value={54} />
            <Card className="h-full">
              <Stat label="Score" value="72/100" size="lg" />
            </Card>
          </div>
        </Section>

        <Section title="Progress & gamification">
          <Card className="space-y-6">
            <div className="flex flex-wrap items-center gap-8">
              <StreakFlame days={7} />
              <StreakFlame days={0} />
              <XpBadge xp={1240} />
              <ReadinessRing score={64} label="TCS NQT ready" />
            </div>
            <ProgressDots states={["correct", "wrong", "pending", "current", "todo", "todo", "todo", "todo", "todo", "todo"]} />
          </Card>
        </Section>

        <Section title="Heatmap" meta="cells 40px · legend top-right">
          <Heatmap
            rowLabel="Batch"
            topics={[
              { id: "a", name: "Percentages", section: "quant" },
              { id: "b", name: "Time & work", section: "quant" },
              { id: "c", name: "Seating", section: "logical" },
              { id: "d", name: "Reading", section: "verbal" },
            ]}
            rows={[
              { id: "1", name: "2027 CSE-A", cells: [{ mastery: 82, n: 40 }, { mastery: 51, n: 38 }, { mastery: 33, n: 35 }, null] },
              { id: "2", name: "2027 ECE", cells: [{ mastery: 64, n: 30 }, { mastery: 22, n: 29 }, { mastery: 47, n: 30 }, { mastery: 71, n: 28 }] },
            ]}
          />
        </Section>

        <Section title="Empty state">
          <EmptyState title="No data yet" body="Real empty states, never lorem ipsum." />
        </Section>
      </Container>
    </main>
  );
}
