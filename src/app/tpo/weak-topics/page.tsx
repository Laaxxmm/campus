import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { staffContext } from "@/server/staff";
import { assignFocusPack, assignmentsForCollege, cohortWeakTopics } from "@/server/services/tpo-coach";
import { batchList } from "@/server/services/tpo";
import { clientIp } from "@/lib/http";
import { topicName } from "@/lib/question-schema";
import { TpoShell } from "@/components/TpoShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function assign(formData: FormData) {
  "use server";
  const { user, collegeId } = await staffContext(String(formData.get("college") ?? "") || undefined);
  const topic = String(formData.get("topic"));
  const batch = String(formData.get("batch") ?? "") || undefined;
  const weak = (await cohortWeakTopics(user, { collegeId, batchId: batch })).find((t) => t.topic === topic);
  let assigned = 0;
  try {
    assigned = (await assignFocusPack(user, { topics: [topic], studentIds: weak?.weakStudents ?? [], questionsPerDay: formData.get("qpd"), dueOn: String(formData.get("due") ?? "") }, { collegeId, ip: clientIp({ headers: await headers() }) })).assigned;
  } catch (e) {
    redirect(`/tpo/weak-topics?error=${encodeURIComponent(e instanceof ZodError ? e.issues[0]?.message ?? "invalid" : (e as Error).message)}`);
  }
  redirect(`/tpo/weak-topics?assigned=${assigned}&topic=${topic}${batch ? `&batch=${batch}` : ""}`);
}

export default async function WeakTopics({ searchParams }: { searchParams: Promise<{ college?: string; batch?: string; assigned?: string; topic?: string; error?: string }> }) {
  const sp = await searchParams;
  const { user, college, collegeId, opts } = await staffContext(sp.college);
  const bl = await batchList(user, opts);
  const batch = bl.find((b) => b.id === sp.batch);
  const [topics, assignments] = await Promise.all([cohortWeakTopics(user, { ...opts, batchId: batch?.id }), assignmentsForCollege(user, opts)]);
  return (
    <TpoShell title="Weak topics" collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/tpo/weak-topics", label: "Weak topics" }]}>
      {sp.assigned && <p role="status" className="mb-4 rounded-sm bg-success-50 p-3 text-sm">Focus pack on {topicName(sp.topic ?? "")} assigned to {sp.assigned} students. They&apos;ll see it on their Today screen.</p>}
      {sp.error && <p role="alert" className="mb-4 rounded-sm bg-danger-50 p-3 text-sm text-danger-700">{sp.error}</p>}
      <form method="get" className="mb-4 flex items-end gap-3">
        <label className="text-sm">Batch<select name="batch" defaultValue={batch?.id ?? ""} className="mt-1 block h-11 rounded-sm border border-border bg-bg px-3"><option value="">All batches</option>{bl.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <Button type="submit" variant="secondary">Show</Button>
      </form>
      <p className="mb-3 text-sm text-text-600">Students counted only with ≥ 5 questions on a topic in the last 30 days, below 50% accuracy.</p>
      {topics.length === 0 ? <EmptyState title="No weak topics with enough data" body="As students practise, weak topics appear here." /> : (
        <ul className="space-y-2" data-testid="weak-topics">
          {topics.slice(0, 15).map((t) => (
            <li key={t.topic} className="flex flex-col gap-3 rounded-md border border-border bg-bg p-3 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink-900">{t.name} <span className="text-xs font-normal text-text-600">· {t.section}</span></div>
                <div className="text-sm text-text-600"><b className="tabular text-text-900">{t.weakCount}</b> of {t.measured} measured students below 50% · cohort accuracy {t.avgAccuracy}%</div>
              </div>
              <form action={assign} className="flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="topic" value={t.topic} />
                {batch && <input type="hidden" name="batch" value={batch.id} />}
                {user.role === "superadmin" && <input type="hidden" name="college" value={collegeId} />}
                <label className="sr-only" htmlFor={`qpd-${t.topic}`}>Questions per day</label>
                <select id={`qpd-${t.topic}`} name="qpd" defaultValue="5" className="h-11 rounded-sm border border-border bg-bg px-2"><option value="5">5 Q/day</option><option value="10">10 Q/day</option></select>
                <label className="sr-only" htmlFor={`due-${t.topic}`}>Due date</label>
                <input id={`due-${t.topic}`} type="date" name="due" className="h-11 rounded-sm border border-border bg-bg px-2" />
                <Button type="submit" variant="cta" data-testid="assign-pack">Assign to {t.weakCount}</Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {assignments.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-semibold text-ink-900">Assigned packs</h2>
          <ul className="divide-y divide-border rounded-md border border-border bg-bg text-sm" data-testid="assignments">
            {assignments.map((a) => <li key={a.id} className="flex justify-between px-4 py-2"><span>{a.topics.map(topicName).join(", ")}{a.dueOn ? ` · due ${a.dueOn}` : ""}</span><span className="tabular">{a.done}/{a.total} done</span></li>)}
          </ul>
        </section>
      )}
    </TpoShell>
  );
}
