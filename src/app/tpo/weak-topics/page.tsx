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
  const sel = "h-11 rounded-sm border border-border bg-bg px-4 text-sm";
  return (
    <TpoShell title="Weak topics" subtitle="Students counted only with ≥ 5 questions on a topic in the last 30 days, below 50% accuracy." collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/tpo/weak-topics", label: "Weak topics" }]}>
      {sp.assigned && <p role="status" className="mb-6 rounded-sm bg-success-50 p-4 text-sm text-ink-900">Focus pack on {topicName(sp.topic ?? "")} assigned to {sp.assigned} students. They&apos;ll see it on their Today screen.</p>}
      {sp.error && <p role="alert" className="mb-6 rounded-sm bg-danger-50 p-4 text-sm text-danger-700">{sp.error}</p>}
      <form method="get" className="mb-6 flex flex-wrap items-end gap-4">
        <label className="text-sm font-medium">Batch<select name="batch" defaultValue={batch?.id ?? ""} className={`mt-2 block min-w-48 ${sel}`}><option value="">All batches</option>{bl.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <Button type="submit" variant="secondary">Show</Button>
      </form>
      <div className="grid gap-12 xl:grid-cols-12 xl:gap-6">
        <section aria-labelledby="weak-h" className={assignments.length ? "xl:col-span-8" : "xl:col-span-12"}>
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="weak-h" className="text-lg font-semibold text-ink-900">Weakest topics{batch ? ` · ${batch.name}` : ""}</h2>
            {topics.length > 0 && <span className="text-sm text-text-600">top {Math.min(15, topics.length)} of {topics.length}</span>}
          </div>
          {topics.length === 0 ? <EmptyState title="No weak topics with enough data" body="As students practise, weak topics appear here." /> : (
            <ul className="divide-y divide-border rounded-md border border-border bg-bg" data-testid="weak-topics">
              {topics.slice(0, 15).map((t) => (
                <li key={t.topic} className="flex flex-col gap-4 px-6 py-4 lg:px-8 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink-900">{t.name} <span className="text-xs font-normal text-text-600">· {t.section}</span></div>
                    <div className="mt-2 text-sm text-text-600"><b className="tabular text-text-900">{t.weakCount}</b> of {t.measured} measured students below 50% · cohort accuracy {t.avgAccuracy}%</div>
                  </div>
                  <form action={assign} className="flex flex-wrap items-center gap-2 text-sm">
                    <input type="hidden" name="topic" value={t.topic} />
                    {batch && <input type="hidden" name="batch" value={batch.id} />}
                    {user.role === "superadmin" && <input type="hidden" name="college" value={collegeId} />}
                    <label className="sr-only" htmlFor={`qpd-${t.topic}`}>Questions per day</label>
                    <select id={`qpd-${t.topic}`} name="qpd" defaultValue="5" className={sel}><option value="5">5 Q/day</option><option value="10">10 Q/day</option></select>
                    <label className="sr-only" htmlFor={`due-${t.topic}`}>Due date</label>
                    <input id={`due-${t.topic}`} type="date" name="due" className={sel} />
                    <Button type="submit" variant="secondary" data-testid="assign-pack">Assign to {t.weakCount}</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
        {assignments.length > 0 && (
          <section className="xl:col-span-4" aria-labelledby="assigned-h">
            <h2 id="assigned-h" className="mb-6 text-lg font-semibold text-ink-900">Assigned packs</h2>
            <ul className="divide-y divide-border rounded-md border border-border bg-bg text-sm" data-testid="assignments">
              {assignments.map((a) => <li key={a.id} className="flex justify-between gap-4 px-6 py-4"><span>{a.topics.map(topicName).join(", ")}{a.dueOn ? ` · due ${a.dueOn}` : ""}</span><span className="shrink-0 tabular">{a.done}/{a.total} done</span></li>)}
            </ul>
          </section>
        )}
      </div>
    </TpoShell>
  );
}
