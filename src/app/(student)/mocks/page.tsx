import Link from "next/link";
import { CalendarClock, ChevronRight, Clock, ListChecks } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { companyName } from "@/lib/companies";
import { listMocks } from "@/server/services/mocks";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function Mocks() {
  const user = requireRole(await requireUser(), ["student"]);
  const list = await listMocks(user);
  const scheduled = list.filter((m) => m.scheduled);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-ink-900">Mock tests</h1>
      <p className="text-sm text-text-600">Company-pattern practice papers with a real exam timer. Your answers save as you go.</p>
      {list.length === 0 && <EmptyState title="No mocks yet" body="Your college hasn't enabled mocks yet." />}
      {scheduled.length > 0 && (
        <p className="rounded-sm bg-accent-50 px-3 py-2 text-sm text-ink-900">
          <CalendarClock aria-hidden className="mr-1 inline h-4 w-4" /> Your TPO scheduled {scheduled.length} mock{scheduled.length > 1 ? "s" : ""} for your batch.
        </p>
      )}
      <ul className="space-y-3">
        {list.map((m) => (
          <li key={m.id}>
            <Link href={`/mocks/${m.id}`} className="block rounded-md border border-border bg-bg p-4 shadow-sm hover:border-ink-700" data-testid="mock-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-text-600">{companyName(m.company)}</div>
                  <div className="mt-0.5 font-semibold text-ink-900">{m.title}</div>
                </div>
                <ChevronRight aria-hidden className="mt-1 h-5 w-5 text-text-600" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-600">
                <span className="inline-flex items-center gap-1"><ListChecks aria-hidden className="h-4 w-4" />{m.questionCount} Q</span>
                <span className="inline-flex items-center gap-1"><Clock aria-hidden className="h-4 w-4" />{Math.round(m.durationSec / 60)} min</span>
                {m.negativeMark > 0 && <Badge tone="warn">−{m.negativeMark} per wrong</Badge>}
                {m.sectional && <Badge>Sectional timer</Badge>}
                {m.scheduled && <Badge tone="brand">Scheduled</Badge>}
                {m.activeAttemptId && <Badge tone="warn">In progress</Badge>}
                {m.best && <Badge tone="success">Best {m.best.marks}/{m.best.maxMarks}</Badge>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
