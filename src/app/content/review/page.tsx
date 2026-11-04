import Link from "next/link";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireRole, requireUser } from "@/lib/authz";
import { TOPICS, topicName } from "@/lib/question-schema";
import { approve, approveAllQaPassed, edit, listForReview, retire } from "@/server/services/content";
import { AdminShell } from "@/components/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  const sel = "block h-11 w-full rounded-sm border border-border bg-bg px-4 text-base font-normal";
  const lbl = "flex min-w-0 flex-col gap-2 text-sm font-medium";
  const hidden = (op: string, id?: string) => (<><input type="hidden" name="op" value={op} />{id && <input type="hidden" name="id" value={id} />}<input type="hidden" name="back" value={back} /></>);
  return (
    <AdminShell
      title={sp.status === "golden" ? "Question bank" : "Review queue"}
      subtitle={`${r.total} questions · page ${r.page}`}
      role={user.role}
      actions={<form action={act}>{hidden("approve-all")}<Button type="submit" variant="secondary">Approve all QA-passed drafts</Button></form>}
    >
      <nav aria-label="Question status" className="mb-6 flex flex-wrap gap-2 text-sm">
        {(["draft", "review", "golden", "retired"] as const).map((s) => <Link key={s} href={`/content/review?status=${s}`} className={`inline-flex min-h-11 items-center rounded-pill border bg-bg px-4 hover:border-ink-700 ${sp.status === s ? "border-ink-900 font-semibold text-ink-900" : "border-border"}`}>{s}: <span className="tabular">{r.counts[s] ?? 0}</span></Link>)}
      </nav>
      {sp.error && <p role="alert" className="mb-6 rounded-sm bg-danger-50 p-4 text-sm text-danger-700">{sp.error}</p>}
      {sp.done && <p role="status" className="mb-6 rounded-sm bg-success-50 p-4 text-sm text-ink-900">Done: {sp.done}.</p>}
      <form method="get" className="mb-8 grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <label className={lbl}>Status<select name="status" defaultValue={sp.status ?? ""} className={sel}><option value="">Needs review (draft + review)</option><option value="draft">draft</option><option value="review">review</option><option value="golden">golden</option><option value="retired">retired</option></select></label>
        <label className={lbl}>Topic<select name="topic" defaultValue={sp.topic ?? ""} className={sel}><option value="">All</option>{TOPICS.map((t) => <option key={t.id} value={t.id}>{t.section} · {t.name}</option>)}</select></label>
        <label className={lbl}>QA flag<select name="flag" defaultValue={sp.flag ?? ""} className={sel}><option value="">Any</option><option value="qa_failed">QA failed / ambiguous</option><option value="qa_passed">QA passed</option><option value="unchecked">Not QA-checked</option></select></label>
        <label className={lbl}>Search<Input name="q" defaultValue={sp.q ?? ""} placeholder="stem text" className="font-normal" /></label>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>
      <ul className="space-y-6" data-testid="review-list">
        {r.rows.map((q) => {
          const qa = q.qaFlags as null | { passed?: boolean; matches?: boolean; ambiguous?: boolean; my_answer_index?: number; issues?: string[]; model?: string };
          const editing = sp.edit === q.id;
          return (
            <li key={q.id} className="rounded-md border border-border bg-bg p-6 lg:p-8" data-testid="review-item">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono font-semibold text-ink-900">{q.id}</span>
                <Badge>{q.status}</Badge>
                <Badge tone="brand">{topicName(q.topic)} · L{q.difficulty}</Badge>
                <Badge>{q.source}</Badge>
                {qa && <Badge tone={qa.passed ? "success" : "warn"}>{qa.passed ? "QA passed" : qa.ambiguous ? "QA: ambiguous" : "QA: key mismatch"}</Badge>}
                <span className="ml-auto text-text-600">v{q.version}</span>
              </div>
              {editing ? (
                <form action={act} className="max-w-[720px] space-y-4">
                  {hidden("edit", q.id)}
                  <label className={`block ${lbl}`}>Stem<textarea name="stem" defaultValue={q.stem} rows={4} className="mt-2 w-full rounded-sm border border-border bg-bg px-4 py-2 text-base font-normal" /></label>
                  <div className="grid gap-4 md:grid-cols-2">{q.options.map((o, i) => <label key={i} className={lbl}>Option {LETTERS[i]}<Input name={`o${i}`} defaultValue={o} className="mt-2 font-normal" /></label>)}</div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <label className={lbl}>Correct<select name="answerIndex" defaultValue={q.answerIndex} className={`${sel} w-full`}>{LETTERS.map((l, i) => <option key={l} value={i}>{l}</option>)}</select></label>
                    <label className={lbl}>Difficulty<select name="difficulty" defaultValue={q.difficulty} className={`${sel} w-full`}>{[1, 2, 3, 4, 5].map((d) => <option key={d}>{d}</option>)}</select></label>
                  </div>
                  <label className={`block ${lbl}`}>Explanation (≤ 80 words)<textarea name="explanation" defaultValue={q.explanation} rows={3} className="mt-2 w-full rounded-sm border border-border bg-bg px-4 py-2 text-base font-normal" /></label>
                  <label className={`block ${lbl}`}>Shortcut<Input name="shortcut" defaultValue={q.shortcut ?? ""} className="mt-2 font-normal" /></label>
                  <div className="flex flex-wrap gap-2 pt-2"><Button type="submit" variant="primary" data-cta="primary">Save (bumps version)</Button><Link href={back} className={buttonVariants({ variant: "ghost" })}>Cancel</Link></div>
                </form>
              ) : (
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-7">
                    <p className="whitespace-pre-line text-base text-ink-900">{q.stem}</p>
                    <ol className="mt-4 space-y-2 text-sm">{q.options.map((o, i) => <li key={i} className={i === q.answerIndex ? "font-semibold text-success-700" : ""}>{LETTERS[i]}. {o}{i === q.answerIndex && " ✓ key"}</li>)}</ol>
                    <p className="mt-4 text-sm text-text-600">{q.explanation}</p>
                  </div>
                  <div className="h-full rounded-sm border border-border p-4 text-sm lg:col-span-5">
                    <p className="font-semibold text-ink-900">Blind QA</p>
                    {qa ? (
                      <>
                        <p className="mt-2">QA model answered <b>{LETTERS[qa.my_answer_index ?? 0]}</b> ({qa.matches ? "matches key" : "differs from key"}){qa.ambiguous ? " · flagged ambiguous" : ""}</p>
                        {qa.issues?.length ? <ul className="mt-2 list-disc pl-6 text-text-600">{qa.issues.map((x, i) => <li key={i}>{x}</li>)}</ul> : null}
                        <p className="mt-2 text-xs text-text-600">{qa.model}</p>
                      </>
                    ) : <p className="mt-2 text-text-600">Not QA-checked (hand-authored seed or QA not run).</p>}
                  </div>
                </div>
              )}
              {!editing && (
                <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
                  {q.status !== "golden" && q.status !== "retired" && <form action={act}>{hidden("approve", q.id)}<Button type="submit" variant="secondary" data-testid="approve">Approve → golden</Button></form>}
                  <Link href={`${back}${back.includes("?") ? "&" : "?"}edit=${q.id}`} className={buttonVariants({ variant: "secondary" })}>Edit</Link>
                  {q.status !== "retired" && <form action={act}>{hidden("retire", q.id)}<Button type="submit" variant="ghost">Retire</Button></form>}
                </div>
              )}
            </li>
          );
        })}
        {!r.rows.length && <li className="rounded-md border border-dashed border-border p-6 text-center text-sm text-text-600 lg:p-8">Nothing to review. Run <code>scripts/generate.ts</code> → <code>qa.ts</code> → <code>import-drafts.ts</code> to fill the queue.</li>}
      </ul>
      {r.total > r.page * 50 && <Link href={`${back}${back.includes("?") ? "&" : "?"}page=${r.page + 1}`} className={buttonVariants({ variant: "secondary", className: "mt-6" })}>Next page</Link>}
    </AdminShell>
  );
}
