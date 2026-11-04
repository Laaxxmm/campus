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
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col items-center px-4 pb-10 pt-12 text-center">
      <p className="text-sm font-semibold text-text-600">{d.completedAt ? "Drill complete" : "Drill in progress"}</p>
      <div className="mt-2 text-6xl font-bold tabular" data-testid="score">{score}/10</div>
      <p className="mt-2 text-lg">{great ? "Excellent work — that rhythm is paying off." : score >= 4 ? "Good effort. Review the misses and keep going." : "Every attempt makes you sharper. Tomorrow builds on today."}</p>
      <div className="mt-6 flex items-center gap-6">
        <div>
          <div className="text-2xl font-bold text-ink-900 tabular">+{xp}</div>
          <div className="text-xs text-text-600">XP today</div>
        </div>
        <div>
          <div className="streak-pop" data-testid="streak"><StreakFlame days={st?.current ?? 0} size="lg" /></div>
          <div className="text-xs text-text-600">day streak</div>
        </div>
      </div>
      <p className="mt-6 rounded-md bg-ink-50 px-4 py-2 text-sm text-ink-700">Come back tomorrow — new drill at 5 AM.</p>
      {insight && <div className="mt-6 w-full"><InsightCard text={insight.text as InsightText} focusTopics={(insight.facts as InsightFacts).focus.map((f) => f.topic)} /></div>}
      <ShareButton text={`I scored ${score}/10 on today's LearnCrew placement drill 🔥 ${st?.current ?? 0}-day streak!`} />
      <ol className="mt-6 w-full space-y-1 text-left text-sm">
        {data.items.map((it, i) => {
          const r = data.results.find((x) => x.questionId === it.id);
          return (
            <li key={it.id} className="flex items-center gap-2 rounded-md bg-bg px-3 py-2">
              <span className={r?.correct ? "text-success-700" : "text-danger-500"}>{r ? (r.correct ? "✓" : "✗") : "•"}</span>
              <span className="truncate">Q{i + 1}. {it.stem.split("\n")[0]}</span>
            </li>
          );
        })}
      </ol>
      <Link href="/today" className="mt-8 flex min-h-12 w-full items-center justify-center rounded-md bg-ink-900 font-semibold text-white">Back to Today</Link>
    </main>
  );
}
