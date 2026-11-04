import Link from "next/link";
import { requireRole, requireUser } from "@/lib/authz";
import { getOrCreateDrill } from "@/lib/drill";
import { todaySummary } from "@/lib/queries/student";
import { companyName } from "@/lib/companies";
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
  const done = Boolean(s.drill?.completedAt);
  const first = s.name.split(" ")[0] || "there";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-brand-600">LearnCrew</span>
        <div className="flex items-center gap-2">
          <XpBadge xp={s.xp} />
          <StreakFlame days={s.streak} />
        </div>
      </div>
      <p className="text-ink-600">Hi {first} 👋</p>

      {drillError || !s.drill ? (
        <EmptyState icon="⏳" title="Today's drill isn't ready" body="Your college's question bank is still being set up. Check back soon." />
      ) : (
        <section className="rounded-lg bg-brand-600 p-5 text-white shadow-md" data-testid="drill-card">
          <div className="text-sm opacity-90">Today&apos;s drill · 10 Q · ~7 min</div>
          {done ? (
            <>
              <div className="mt-2 text-3xl font-bold tabular">{s.drill.score}/10</div>
              <p className="mt-1 text-sm opacity-90">Done for today. Next drill unlocks tomorrow at 5 AM.</p>
              <Link href={`/drill/${s.drill.id}/done`} className="mt-4 flex min-h-12 items-center justify-center rounded-md bg-white/15 font-semibold">See result</Link>
            </>
          ) : (
            <>
              <div className="mt-2 text-2xl font-bold">{s.answered ? `${s.answered}/10 answered` : "Ready when you are"}</div>
              <Link href={`/drill/${s.drill.id}`} className="mt-4 flex min-h-14 items-center justify-center rounded-md bg-white text-lg font-bold text-brand-700" data-testid="start-drill">
                {s.answered ? "Continue drill" : "Start drill"}
              </Link>
            </>
          )}
        </section>
      )}

      <section className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
        <ReadinessRing score={s.readiness} label={`${companyName(s.company)} ready`} />
        <div className="text-sm text-ink-600">
          <p className="font-semibold text-ink-900">Placement readiness</p>
          <p className="mt-1">Based on your topic ratings for {companyName(s.company)}. 70+ means you&apos;re in good shape.</p>
          <Link href="/progress" className="mt-2 inline-block font-semibold text-brand-600">See details →</Link>
        </div>
      </section>

      {s.weakest.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink-600">Work on these</h2>
          <div className="flex flex-wrap gap-2">
            {s.weakest.map((w) => (
              <span key={w.topic} className="rounded-pill border border-border bg-surface px-3 py-1.5 text-sm">{w.name}</span>
            ))}
          </div>
        </section>
      )}
      <p className="text-center text-xs text-ink-400">Longest streak {s.longest} · {s.freezes ? "1 streak freeze ready this week" : "Freeze used this week"}</p>
    </div>
  );
}
