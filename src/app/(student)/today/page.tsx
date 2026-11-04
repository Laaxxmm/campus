import Link from "next/link";
import { Clock } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { getOrCreateDrill } from "@/lib/drill";
import { todaySummary } from "@/server/services/student";
import { myAssignments } from "@/server/services/tpo-coach";
import { topicName } from "@/lib/question-schema";
import { startAssignedPack } from "@/app/actions/focus";
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
  const packs = (await myAssignments(user.id)).filter((a) => !a.completedAt);
  const done = Boolean(s.drill?.completedAt);
  const first = s.name.split(" ")[0] || "there";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-ink-900">LearnCrew</span>
        <div className="flex items-center gap-2">
          <XpBadge xp={s.xp} />
          <StreakFlame days={s.streak} />
        </div>
      </div>
      <p className="text-text-600">Hi {first}. A rhythm that respects your week — 10 questions, about 10 minutes.</p>

      {drillError || !s.drill ? (
        <EmptyState icon={Clock} title="Today's drill isn't ready" body="Your college's question bank is still being set up. Check back soon." />
      ) : (
        <section className="rounded-md bg-ink-900 p-5 text-white shadow-sm" data-testid="drill-card">
          <div className="text-sm opacity-90">Today&apos;s drill · 10 Q · ~10 min</div>
          {done ? (
            <>
              <div className="mt-2 text-3xl font-bold tabular">{s.drill.score}/10</div>
              <p className="mt-1 text-sm opacity-90">Done for today. Next drill unlocks tomorrow at 5 AM.</p>
              <Link href={`/drill/${s.drill.id}/done`} className="mt-4 flex min-h-12 items-center justify-center rounded-md bg-white/15 font-semibold">See result</Link>
            </>
          ) : (
            <>
              <div className="mt-2 text-2xl font-bold">{s.answered ? `${s.answered}/10 answered` : "Ready when you are"}</div>
              <Link href={`/drill/${s.drill.id}`} className="mt-4 flex min-h-14 items-center justify-center rounded-sm bg-accent-500 text-lg font-bold text-ink-900 hover:bg-accent-600" data-testid="start-drill">
                {s.answered ? "Continue drill" : "Start drill"}
              </Link>
            </>
          )}
        </section>
      )}

      {packs.map((a) => (
        <form key={a.id} action={startAssignedPack} className="rounded-md border border-accent-500 bg-accent-50 p-4" data-testid="assigned-pack">
          <input type="hidden" name="assignment" value={a.id} />
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">From your TPO</p>
          <p className="mt-1 font-semibold text-ink-900">Focus pack: {a.topics.map(topicName).join(", ")}</p>
          <p className="text-sm text-text-600">{a.questionsPerDay} questions a day{a.dueOn ? ` · until ${a.dueOn}` : ""}{a.note ? ` · ${a.note}` : ""}</p>
          <button type="submit" className="mt-3 min-h-11 w-full rounded-sm bg-ink-900 font-semibold text-white">Start pack</button>
        </form>
      ))}

      <section className="flex items-center gap-4 rounded-lg border border-border bg-bg p-4">
        <ReadinessRing score={s.readiness} label={`${companyName(s.company)} ready`} />
        <div className="text-sm text-text-600">
          <p className="font-semibold text-text-900">Placement readiness</p>
          <p className="mt-1">Based on your topic ratings for {companyName(s.company)}. 70+ means you&apos;re in good shape.</p>
          <Link href="/progress" className="mt-2 inline-block font-semibold text-ink-900">See details →</Link>
        </div>
      </section>

      {s.weakest.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-text-600">Work on these</h2>
          <div className="flex flex-wrap gap-2">
            {s.weakest.map((w) => (
              <span key={w.topic} className="rounded-pill border border-border bg-bg px-3 py-1.5 text-sm">{w.name}</span>
            ))}
          </div>
        </section>
      )}
      <p className="text-center text-xs text-text-600">Longest streak {s.longest} · {s.freezes ? "1 streak freeze ready this week" : "Freeze used this week"}</p>
    </div>
  );
}
