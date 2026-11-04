import { requireRole, requireUser } from "@/lib/authz";
import { batchLeaderboard } from "@/lib/queries/student";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function Leaderboard() {
  const user = requireRole(await requireUser(), ["student"]);
  const rows = await batchLeaderboard(user.batchId, user.collegeId);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">This week in your batch</h1>
      <p className="text-sm text-ink-600">Weekly XP · resets Monday. Only first name + initial are shown.</p>
      {rows.length === 0 ? (
        <EmptyState icon="🏆" title="No batch yet" body="Ask your TPO to add you to a batch." />
      ) : (
        <ol className="divide-y divide-border rounded-lg bg-surface">
          {rows.map((r) => (
            <li key={r.id} className={`flex items-center gap-3 px-4 py-3 ${r.id === user.id ? "bg-brand-50" : ""}`}>
              <span className="w-6 text-center font-bold tabular text-ink-600">{r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</span>
              <span className="flex-1">{r.name}{r.id === user.id && " (you)"}</span>
              <span className="font-semibold tabular">{r.xp} XP</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
