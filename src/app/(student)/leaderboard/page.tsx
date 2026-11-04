import { requireRole, requireUser } from "@/lib/authz";
import { Trophy } from "lucide-react";
import { batchLeaderboard } from "@/server/services/student";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function Leaderboard() {
  const user = requireRole(await requireUser(), ["student"]);
  const rows = await batchLeaderboard(user.batchId, user.collegeId);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">This week in your batch</h1>
      <p className="text-sm text-text-600">Weekly XP · resets Monday. Only first name + initial are shown.</p>
      {rows.length === 0 ? (
        <EmptyState icon={Trophy} title="No batch yet" body="Ask your TPO to add you to a batch." />
      ) : (
        <ol className="divide-y divide-border rounded-lg bg-bg">
          {rows.map((r) => (
            <li key={r.id} className={`flex items-center gap-4 px-4 py-4 ${r.id === user.id ? "bg-ink-50" : ""}`}>
              <span className="w-6 text-center font-bold tabular text-text-600">{r.rank}</span>
              <span className="flex-1">{r.name}{r.id === user.id && " (you)"}</span>
              <span className="font-semibold tabular">{r.xp} XP</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
