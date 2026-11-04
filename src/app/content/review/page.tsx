import Link from "next/link";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireRole, requireUser } from "@/lib/authz";
import { TOPICS, topicName } from "@/lib/question-schema";
import { approve, approveAllQaPassed, edit, listForReview, retire } from "@/server/services/content";
import { AdminShell } from "@/components/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
const LETTERS = ["A", "B", "C", "D"];

async function act(formData: FormData) {
  "use server";
  const user = requireRole(await requireUser(), ["content"]);
  const id = String(formData.get("id") ?? "");
  const back = String(formData.get("back") ?? "/content/review");
  const op = String(formData.get("op"));
  try {
    if (op === "approve") await approve(user, [id]);
    else if (op === "retire") await retire(user, id);
    else if (op === "edit") await edit(user, id, Object.fromEntries(formData));
    else if (op === "approve-all") await approveAllQaPassed(user);
  } catch (e) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(e instanceof ZodError ? e.issues[0]?.message ?? "invalid" : (e as Error).message)}`);
  }
  redirect(`${back}${back.includes("?") ? "&" : "?"}done=${op}`);
}

type SP = { status?: string; topic?: string; flag?: string; q?: string; page?: string; error?: string; done?: string; edit?: string };

export default async function Review({ searchParams }: { searchParams: Promise<SP> }) {
  const user = requireRole(await requireUser(), ["content"]);
  const sp = await searchParams;
  const r = await listForReview(user, { ...sp, page: Number(sp.page) || 1 });
  const qs = new URLSearchParams(Object.entries({ status: sp.status, topic: sp.topic, flag: sp.flag, q: sp.q }).filter(([, v]) => v) as [string, string][]).toString();
  const back = `/content/review${qs ? `?${qs}` : ""}`;
  const sel = "mt-1 block h-11 rounded-sm border border-border bg-bg px-3";
  return (
    <AdminShell title={sp.status === "golden" ? "Question bank" : "Review queue"} role={user.role}>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {(["draft", "review", "golden", "retired"] as const).map((s) => <Link key={s} href={`/content/review?status=${s}`} className="rounded-pill border border-border bg-bg px-3 py-1 hover:border-ink-700">{s}: {r.counts[s] ?? 0}</Link>)}
      </div>
      {sp.error && <p role="alert" className="mb-3 rounded-sm bg-danger-50 p-3 text-sm text-danger-500">{sp.error}</p>}
      {sp.done && <p role="status" className="mb-3 rounded-sm bg-success-50 p-3 text-sm">Done: {sp.done}.</p>}
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">Status<select name="status" defaultValue={sp.status ?? ""} className={sel}><option value="">Needs review (draft + review)</option><option value="draft">draft</option><option value="review">review</option><option value="golden">golden</option><option value="retired">retired</option></select></label>
        <label className="text-sm">Topic<select name="topic" defaultValue={sp.topic ?? ""} className={sel}><option value="">All</option>{TOPICS.map((t) => <option key={t.id} value={t.id}>{t.section} · {t.name}</option>)}</select></label>
        <label className="text-sm">QA flag<select name="flag" defaultValue={sp.flag ?? ""} className={sel}><option value="">Any</option><option value="qa_failed">QA failed / ambiguous</option><option value="qa_passed">QA passed</option><option value="unchecked">Not QA-checked</option></select></label>
        <label className="text-sm">Search<Input name="q" defaultValue={sp.q ?? ""} placeholder="stem text" className="mt-1 w-48" /></label>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>
      <form action={act} className="mb-4"><input type="hidden" name="op" value="approve-all" /><input type="hidden" name="back" value={back} /><Button type="submit" variant="ghost" className="px-0 underline">Approve all QA-passed drafts</Button></form>
      <p className="mb-2 text-xs text-text-600">{r.total} questions · page {r.page}</p>
      <ul className="space-y-3" data-testid="review-list">
        {r.rows.map((q) => {
          const qa = q.qaFlags as null | { passed?: boolean; matches?: boolean; ambiguous?: boolean; my_answer_index?: number; issues?: string[]; model?: string };
          const editing = sp.edit === q.id;
          return (
            <li key={q.id} className="rounded-md border border-border bg-bg p-4" data-testid="review-item">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono font-semibold">{q.id}</span>
                <Badge>{q.status}</Badge>
                <Badge tone="brand">{topicName(q.topic)} · L{q.difficulty}</Badge>
                <Badge>{q.source}</Badge>
                {qa && <Badge tone={qa.passed ? "success" : "warn"}>{qa.passed ? "QA passed" : qa.ambiguous ? "QA: ambiguous" : "QA: key mismatch"}</Badge>}
                <span className="ml-auto text-text-600">v{q.version}</span>
              </div>
              {editing ? (
                <form action={act} className="space-y-2">
                  <input type="hidden" name="op" value="edit" /><input type="hidden" name="id" value={q.id} /><input type="hidden" name="back" value={back} />
                  <label className="block text-sm">Stem<textarea name="stem" defaultValue={q.stem} rows={4} className="mt-1 w-full rounded-sm border border-border p-2" /></label>
                  <div className="grid gap-2 md:grid-cols-2">{q.options.map((o, i) => <label key={i} className="text-sm">Option {LETTERS[i]}<Input name={`o${i}`} defaultValue={o} className="mt-1" /></label>)}</div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <label className="text-sm">Correct<select name="answerIndex" defaultValue={q.answerIndex} className={sel}>{LETTERS.map((l, i) => <option key={l} value={i}>{l}</option>)}</select></label>
                    <label className="text-sm">Difficulty<select name="difficulty" defaultValue={q.difficulty} className={sel}>{[1, 2, 3, 4, 5].map((d) => <option key={d}>{d}</option>)}</select></label>
                  </div>
                  <label className="block text-sm">Explanation (≤ 80 words)<textarea name="explanation" defaultValue={q.explanation} rows={3} className="mt-1 w-full rounded-sm border border-border p-2" /></label>
                  <label className="block text-sm">Shortcut<Input name="shortcut" defaultValue={q.shortcut ?? ""} className="mt-1" /></label>
                  <div className="flex gap-2"><Button type="submit">Save (bumps version)</Button><Link href={back} className="inline-flex min-h-11 items-center px-3 text-sm">Cancel</Link></div>
                </form>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="whitespace-pre-line text-sm">{q.stem}</p>
                    <ol className="mt-2 space-y-1 text-sm">{q.options.map((o, i) => <li key={i} className={i === q.answerIndex ? "font-semibold text-success-500" : ""}>{LETTERS[i]}. {o}{i === q.answerIndex && " ✓ key"}</li>)}</ol>
                    <p className="mt-2 text-sm text-text-600">{q.explanation}</p>
                  </div>
                  <div className="rounded-sm bg-surface p-3 text-sm">
                    <p className="font-semibold">Blind QA</p>
                    {qa ? (
                      <>
                        <p className="mt-1">QA model answered <b>{LETTERS[qa.my_answer_index ?? 0]}</b> ({qa.matches ? "matches key" : "differs from key"}){qa.ambiguous ? " · flagged ambiguous" : ""}</p>
                        {qa.issues?.length ? <ul className="mt-1 list-disc pl-5 text-text-600">{qa.issues.map((x, i) => <li key={i}>{x}</li>)}</ul> : null}
                        <p className="mt-1 text-xs text-text-600">{qa.model}</p>
                      </>
                    ) : <p className="mt-1 text-text-600">Not QA-checked (hand-authored seed or QA not run).</p>}
                  </div>
                </div>
              )}
              {!editing && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {q.status !== "golden" && q.status !== "retired" && <form action={act}><input type="hidden" name="op" value="approve" /><input type="hidden" name="id" value={q.id} /><input type="hidden" name="back" value={back} /><Button type="submit" variant="cta" data-testid="approve">Approve → golden</Button></form>}
                  <Link href={`${back}${back.includes("?") ? "&" : "?"}edit=${q.id}`} className="inline-flex min-h-11 items-center rounded-sm border border-border px-4 text-sm font-semibold">Edit</Link>
                  {q.status !== "retired" && <form action={act}><input type="hidden" name="op" value="retire" /><input type="hidden" name="id" value={q.id} /><input type="hidden" name="back" value={back} /><Button type="submit" variant="ghost">Retire</Button></form>}
                </div>
              )}
            </li>
          );
        })}
        {!r.rows.length && <li className="rounded-md border border-dashed border-border p-6 text-center text-sm text-text-600">Nothing to review. Run <code>scripts/generate.ts</code> → <code>qa.ts</code> → <code>import-drafts.ts</code> to fill the queue.</li>}
      </ul>
      {r.total > r.page * 50 && <Link href={`${back}${back.includes("?") ? "&" : "?"}page=${r.page + 1}`} className="mt-4 inline-block text-info-500 underline">Next page</Link>}
    </AdminShell>
  );
}
