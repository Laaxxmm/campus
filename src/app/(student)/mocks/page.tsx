import Link from "next/link";
import { CalendarClock, ChevronRight, Clock, ListChecks } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { companyName } from "@/lib/companies";
import { listMocks } from "@/server/services/mocks";
import { StudentPage } from "@/components/StudentPage";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function Mocks() {
  const user = requireRole(await requireUser(), ["student"]);
  const list = await listMocks(user);
  const scheduled = list.filter((m) => m.scheduled);
  return (
    <StudentPage title="Mock tests" subtitle="Company-pattern practice papers with a real exam timer. Your answers save as you go.">
      {list.length === 0 && <EmptyState title="No mocks yet" body="Your college hasn't enabled mocks yet." />}
      {scheduled.length > 0 && (
        <p className="flex items-start gap-2 rounded-sm border border-accent-500 bg-accent-50 p-4 text-sm text-ink-900">
          <CalendarClock aria-hidden className="h-5 w-5 shrink-0 text-accent-600" />
          <span>
            Your TPO scheduled {scheduled.length} mock{scheduled.length > 1 ? "s" : ""} for your batch.
          </span>
        </p>
      )}
      {list.length > 0 && (
        <ul className="space-y-4">
          {list.map((m) => (
            <li key={m.id}>
              <Link href={`/mocks/${m.id}`} className="block rounded-md border border-border bg-bg p-6 shadow-e1 transition-shadow duration-150 hover:border-ink-700 hover:shadow-e2 lg:p-8" data-testid="mock-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-wide text-text-600">{companyName(m.company)}</div>
                    <div className="mt-2 text-lg font-semibold text-ink-900">{m.title}</div>
                  </div>
                  <ChevronRight aria-hidden className="mt-2 h-5 w-5 shrink-0 text-text-600" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-600">
                  <span className="inline-flex items-center gap-1 tabular">
                    <ListChecks aria-hidden className="h-4 w-4" />
                    {m.questionCount} Q
                  </span>
                  <span className="inline-flex items-center gap-1 tabular">
                    <Clock aria-hidden className="h-4 w-4" />
                    {Math.round(m.durationSec / 60)} min
                  </span>
                  {(m.negativeMark > 0 || m.sectional || m.scheduled || m.activeAttemptId || m.best) && (
                    <span className="flex flex-wrap gap-2">
                      {m.negativeMark > 0 && <Badge tone="warn">−{m.negativeMark} per wrong</Badge>}
                      {m.sectional && <Badge>Sectional timer</Badge>}
                      {m.scheduled && <Badge tone="brand">Scheduled</Badge>}
                      {m.activeAttemptId && <Badge tone="warn">In progress</Badge>}
                      {m.best && <Badge tone="success">Best {m.best.marks}/{m.best.maxMarks}</Badge>}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </StudentPage>
  );
}
