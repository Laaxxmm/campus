import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { getOrCreateDrill } from "@/lib/drill";
import { todaySummary } from "@/server/services/student";
import { myAssignments } from "@/server/services/tpo-coach";
import { topicName } from "@/lib/question-schema";
import { startAssignedPack } from "@/app/actions/focus";
import { companyName } from "@/lib/companies";
import { cn } from "@/lib/utils";
import { StudentPage } from "@/components/StudentPage";
import { Section } from "@/components/ui/layout";
import { Button, buttonVariants } from "@/components/ui/button";
import { StreakFlame } from "@/components/StreakFlame";
import { XpBadge } from "@/components/XpBadge";
import { ReadinessRing } from "@/components/ReadinessRing";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function Today() {
  const user = requireRole(await requireUser(), ["student"]);
  let drillError = false;
  try {
    await getOrCreateDrill(user.id);
  } catch (e) {
    console.error("[today] drill build failed", e);
    drillError = true;
  }
  const s = await todaySummary(user.id);
  const packs = (await myAssignments(user.id)).filter((a) => !a.completedAt);
  const done = Boolean(s.drill?.completedAt);
  const first = s.name.split(" ")[0] || "there";
  // One primary CTA per screen: the drill while it's open; once it's done (or unavailable) the first TPO pack takes over.
  const drillOpen = !drillError && Boolean(s.drill) && !done;
  const primaryPack = drillOpen ? null : (packs[0]?.id ?? null);
  const resultIsPrimary = !drillOpen && !primaryPack;

  return (
    <StudentPage
      title={`Hi ${first}`}
      subtitle="A rhythm that respects your week — 10 questions, about 10 minutes."
      actions={
        <>
          <XpBadge xp={s.xp} />
          <StreakFlame days={s.streak} />
        </>
      }
    >
      <Section>
        <div className="space-y-4">
          {drillError || !s.drill ? (
            <EmptyState icon={Clock} title="Today's drill isn't ready" body="Your college's question bank is still being set up. Check back soon." />
          ) : (
            <section className="rounded-md bg-ink-900 p-6 text-white lg:p-8" data-testid="drill-card" aria-labelledby="drill-h">
              <h2 id="drill-h" className="text-xs font-medium uppercase tracking-wide text-white/80">
                Today&apos;s drill · 10 Q · ~10 min
              </h2>
              {done ? (
                <>
                  <div className="mt-2 text-5xl font-bold leading-none tabular lg:text-6xl">{s.drill.score}/10</div>
                  <p className="mt-4 text-base text-white/80">Done for today. Next drill unlocks tomorrow at 5 AM.</p>
                  <Link
                    href={`/drill/${s.drill.id}/done`}
                    className={cn(
                      "mt-6 w-full",
                      resultIsPrimary ? buttonVariants({ variant: "cta", size: "lg" }) : "flex h-11 items-center justify-center rounded-sm border border-white/40 font-semibold text-white hover:bg-white/10",
                    )}
                    data-cta={resultIsPrimary ? "primary" : undefined}
                  >
                    See result
                  </Link>
                </>
              ) : (
                <>
                  <div className="mt-2 text-3xl font-bold tabular">{s.answered ? `${s.answered}/10 answered` : "Ready when you are"}</div>
                  <Link href={`/drill/${s.drill.id}`} className={cn(buttonVariants({ variant: "cta", size: "lg" }), "mt-6 w-full text-lg")} data-testid="start-drill" data-cta="primary">
                    {s.answered ? "Continue drill" : "Start drill"}
                  </Link>
                </>
              )}
            </section>
          )}

          {packs.map((a) => (
            <form key={a.id} action={startAssignedPack} className="rounded-md border border-accent-500 bg-accent-50 p-6 lg:p-8" data-testid="assigned-pack">
              <input type="hidden" name="assignment" value={a.id} />
              <p className="text-xs font-medium uppercase tracking-wide text-ink-700">From your TPO</p>
              <p className="mt-2 text-lg font-semibold text-ink-900">Focus pack: {a.topics.map(topicName).join(", ")}</p>
              <p className="mt-2 text-sm text-text-900">
                {a.questionsPerDay} questions a day{a.dueOn ? ` · until ${a.dueOn}` : ""}
                {a.note ? ` · ${a.note}` : ""}
              </p>
              <Button type="submit" variant={a.id === primaryPack ? "primary" : "secondary"} className="mt-4 w-full" data-cta={a.id === primaryPack ? "primary" : undefined}>
                Start pack
              </Button>
            </form>
          ))}
        </div>
      </Section>

      <Section title="Placement readiness">
        <div className="flex items-center gap-6 rounded-md border border-border bg-bg p-6 lg:p-8">
          <ReadinessRing score={s.readiness} label={`${companyName(s.company)} ready`} />
          <div className="min-w-0 text-base text-text-600">
            <p>Based on your topic ratings for {companyName(s.company)}. 70+ means you&apos;re in good shape.</p>
            <Link href="/progress" className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-ink-900 hover:underline">
              See details <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Section>

      {s.weakest.length > 0 && (
        <Section title="Work on these">
          <ul className="flex flex-wrap gap-2">
            {s.weakest.map((w) => (
              <li key={w.topic} className="rounded-pill border border-border bg-bg px-4 py-2 text-sm text-text-900">
                {w.name}
              </li>
            ))}
          </ul>
        </Section>
      )}
      <p className="text-sm text-text-600">
        Longest streak {s.longest} · {s.freezes ? "1 streak freeze ready this week" : "Freeze used this week"}
      </p>
    </StudentPage>
  );
}
