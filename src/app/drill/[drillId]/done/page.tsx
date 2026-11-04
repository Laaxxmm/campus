import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { drills, streaks } from "@/db/schema";
import { requireRole, requireUser } from "@/lib/authz";
import { drillForClient } from "@/lib/drill";
import { XP } from "@/lib/xp";
import { StreakFlame } from "@/components/StreakFlame";
import { ShareButton } from "./ShareButton";

export const dynamic = "force-dynamic";

export default async function DrillDone({ params }: { params: Promise<{ drillId: string }> }) {
  const { drillId } = await params;
  const user = requireRole(await requireUser(), ["student"]);
  if (!/^[0-9a-f-]{36}$/i.test(drillId)) notFound();
  const [d] = await db.select().from(drills).where(and(eq(drills.id, drillId), eq(drills.userId, user.id)));
  if (!d) notFound();
  const data = await drillForClient(user.id, drillId);
  const [st] = await db.select().from(streaks).where(eq(streaks.userId, user.id));
  const score = d.score ?? data!.results.filter((r) => r.correct).length;
  const xp = data!.results.reduce((s, r) => s + r.xp, 0) + (d.completedAt ? XP.drillComplete : 0);
  const great = score >= 7;
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col items-center px-4 pb-10 pt-12 text-center">
      {great && <div aria-hidden className="confetti pointer-events-none absolute inset-x-0 top-0 h-40" />}
      <p className="text-sm font-semibold text-ink-600">{d.completedAt ? "Drill complete" : "Drill in progress"}</p>
      <div className="mt-2 text-6xl font-bold tabular" data-testid="score">{score}/10</div>
      <p className="mt-2 text-lg">{great ? "Excellent work! 🎉" : score >= 4 ? "Good effort — keep going!" : "Every attempt makes you sharper."}</p>
      <div className="mt-6 flex items-center gap-6">
        <div>
          <div className="text-2xl font-bold text-brand-600 tabular">+{xp}</div>
          <div className="text-xs text-ink-600">XP today</div>
        </div>
        <div>
          <div className="streak-pop" data-testid="streak"><StreakFlame days={st?.current ?? 0} size="lg" /></div>
          <div className="text-xs text-ink-600">day streak</div>
        </div>
      </div>
      <p className="mt-6 rounded-md bg-brand-50 px-4 py-2 text-sm text-brand-700">Come back tomorrow — new drill at 5 AM.</p>
      <ShareButton text={`I scored ${score}/10 on today's LearnCrew placement drill 🔥 ${st?.current ?? 0}-day streak!`} />
      <ol className="mt-6 w-full space-y-1 text-left text-sm">
        {data!.items.map((it, i) => {
          const r = data!.results.find((x) => x.questionId === it.id);
          return (
            <li key={it.id} className="flex items-center gap-2 rounded-md bg-surface px-3 py-2">
              <span className={r?.correct ? "text-success" : "text-danger"}>{r ? (r.correct ? "✓" : "✗") : "•"}</span>
              <span className="truncate">Q{i + 1}. {it.stem.split("\n")[0]}</span>
            </li>
          );
        })}
      </ol>
      <Link href="/today" className="mt-8 flex min-h-12 w-full items-center justify-center rounded-md bg-brand-600 font-semibold text-white">Back to Today</Link>
    </main>
  );
}
