import { requireRole, requireUser } from "@/lib/authz";
import { Trophy } from "lucide-react";
import { batchLeaderboard } from "@/server/services/student";
import { StudentPage } from "@/components/StudentPage";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function Leaderboard() {
  const user = requireRole(await requireUser(), ["student"]);
  const rows = await batchLeaderboard(user.batchId, user.collegeId);
  return (
    <StudentPage title="This week in your batch" subtitle="Weekly XP · resets Monday. Only first name + initial are shown.">
      {rows.length === 0 ? (
        <EmptyState icon={Trophy} title="No batch yet" body="Ask your TPO to add you to a batch." />
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-md border border-border bg-bg">
          {rows.map((r) => (
            <li key={r.id} className={`flex min-h-14 items-center gap-4 px-6 py-4 lg:px-8 ${r.id === user.id ? "bg-ink-50 font-semibold" : ""}`}>
              <span className="w-8 text-lg font-bold text-text-600 tabular">{r.rank}</span>
              <span className="flex-1 text-base text-text-900">
                {r.name}
                {r.id === user.id && " (you)"}
              </span>
              <span className="text-base font-semibold text-ink-900 tabular">{r.xp} XP</span>
            </li>
          ))}
        </ol>
      )}
    </StudentPage>
  );
}
