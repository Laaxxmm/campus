import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, requireUser } from "@/lib/authz";
import { drillSummary } from "@/server/services/student";
import { insightForDrill } from "@/server/services/insights";
import { InsightCard } from "@/components/insights/InsightCard";
import type { InsightText } from "@/lib/insights/text";
import type { InsightFacts } from "@/lib/insights/rules";
import { XP } from "@/lib/xp";
import { StreakFlame } from "@/components/StreakFlame";
import { cn } from "@/lib/utils";
import { Container, PageHeader, Section, Stat } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ShareButton } from "./ShareButton";

export const dynamic = "force-dynamic";

export default async function DrillDone({ params }: { params: Promise<{ drillId: string }> }) {
  const { drillId } = await params;
  const user = requireRole(await requireUser(), ["student"]);
  if (!/^[0-9a-f-]{36}$/i.test(drillId)) notFound();
  const data = await drillSummary(user.id, drillId);
  if (!data) notFound();
  const d = data.drill;
  const st = data.streak;
  const score = d.score ?? data.results.filter((r) => r.correct).length;
  const xp = data.results.reduce((s, r) => s + r.xp, 0) + (d.completedAt ? XP.drillComplete : 0);
  const great = score >= 7;
  const insight = d.completedAt ? await insightForDrill(user, d.id) : null;
  const focusTopics = insight ? (insight.facts as InsightFacts).focus.map((f) => f.topic) : [];
  // One primary CTA: the insight's "Start focus drill" when there is one, otherwise "Back to Today".
  const backIsPrimary = focusTopics.length === 0;
  return (
    <main className="min-h-dvh bg-surface pb-16">
      <Container size="reading">
        <PageHeader title={d.completedAt ? "Drill complete" : "Drill in progress"} subtitle={great ? "Excellent work — that rhythm is paying off." : score >= 4 ? "Good effort. Review the misses and keep going." : "Every attempt makes you sharper. Tomorrow builds on today."} />
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Stat label="Score" size="lg" value={<span data-testid="score">{score}/{d.questionIds.length}</span>} />
            <div className="flex items-end gap-8">
              <Stat label="XP today" value={`+${xp}`} />
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-text-600">day streak</div>
                <div className="streak-pop mt-2 leading-none" data-testid="streak">
                  <StreakFlame days={st?.current ?? 0} size="lg" />
                </div>
              </div>
            </div>
          </div>
          <p className="mt-6 rounded-sm bg-ink-50 px-4 py-2 text-sm text-ink-700">Come back tomorrow — new drill at 5 AM.</p>
          <ShareButton text={`I scored ${score}/10 on today's LearnCrew placement drill 🔥 ${st?.current ?? 0}-day streak!`} />
        </Card>
        {insight && (
          <Section>
            <InsightCard text={insight.text as InsightText} focusTopics={focusTopics} stack />
          </Section>
        )}
        <Section>
          <ol className="divide-y divide-border rounded-md border border-border bg-bg px-6 text-base lg:px-8">
            {data.items.map((it, i) => {
              const r = data.results.find((x) => x.questionId === it.id);
              return (
                <li key={it.id} className="flex min-h-12 items-center gap-4 py-2">
                  <span className={r?.correct ? "w-4 font-bold text-success-700" : "w-4 font-bold text-danger-700"}>{r ? (r.correct ? "✓" : "✗") : "•"}</span>
                  <span className="truncate">
                    Q{i + 1}. {it.stem.split("\n")[0]}
                  </span>
                </li>
              );
            })}
          </ol>
        </Section>
        <Link
          href="/today"
          className={cn(buttonVariants({ variant: backIsPrimary ? "primary" : "secondary", size: "lg" }), "mt-12 w-full lg:mt-16")}
          data-cta={backIsPrimary ? "primary" : undefined}
        >
          Back to Today
        </Link>
      </Container>
    </main>
  );
}
