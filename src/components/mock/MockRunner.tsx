"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Flag, Eraser, Send } from "lucide-react";
import type { MockAnswerDto, MockAttemptDto } from "@/lib/mock-types";
import { renderStem } from "@/lib/mini-markdown";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OptionButton } from "@/components/OptionButton";
import { cn } from "@/lib/utils";

type Patch = Record<string, { choice?: number | null; flagged?: boolean; visited?: boolean; timeMsDelta?: number }>;
const LETTERS = ["A", "B", "C", "D"];
const SECTION_LABEL: Record<string, string> = { quant: "Quant", logical: "Logical", verbal: "Verbal", coding: "Coding" };
const lsKey = (id: string) => `lc-mock-${id}`;
const blank = (): MockAnswerDto => ({ choice: null, flagged: false, visited: true, timeMs: 0 });

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function MockRunner({ data }: { data: MockAttemptDto }) {
  const router = useRouter();
  const offset = useMemo(() => new Date(data.serverNow).getTime() - Date.now(), [data.serverNow]);
  const [answers, setAnswers] = useState<Record<string, MockAnswerDto>>(data.answers);
  const [idx, setIdx] = useState(() => {
    const first = data.questions.findIndex((q) => !data.answers[q.id]?.visited);
    return first < 0 ? 0 : first;
  });
  const [now, setNow] = useState(() => Date.now() + offset);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef<Patch>({});
  const tabSwitches = useRef(0);
  const enteredAt = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);

  const endsAt = new Date(data.endsAt).getTime();
  const remaining = endsAt - now;
  const sectionDeadline = (section: string) => (data.sectionEndsAt ? new Date(data.sectionEndsAt[section]).getTime() : endsAt);
  const openSection = data.sectionEndsAt ? data.sections.find((s) => now < sectionDeadline(s)) ?? null : null;
  const q = data.questions[idx];
  const locked = (section: string) => Boolean(data.sectionEndsAt) && section !== openSection;

  // --- persistence -------------------------------------------------------
  const merge = (p: Patch) => {
    for (const [k, v] of Object.entries(p)) {
      const cur = pending.current[k] ?? {};
      pending.current[k] = { ...cur, ...v, timeMsDelta: (cur.timeMsDelta ?? 0) + (v.timeMsDelta ?? 0) };
    }
    try {
      localStorage.setItem(lsKey(data.attemptId), JSON.stringify(pending.current));
    } catch {}
  };
  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const patch = pending.current;
    const tabs = tabSwitches.current;
    if (!Object.keys(patch).length && !tabs) return true;
    pending.current = {};
    tabSwitches.current = 0;
    setSaving("saving");
    try {
      const res = await fetch(`/api/mocks/attempt/${data.attemptId}/save`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ patch, tabSwitchesDelta: tabs }) });
      if (res.status === 409) return true; // time up / already submitted — server keeps what it had
      if (!res.ok) throw new Error(String(res.status));
      localStorage.removeItem(lsKey(data.attemptId));
      setSaving("saved");
      return true;
    } catch {
      merge(patch); // put back for retry
      tabSwitches.current += tabs;
      setSaving("error");
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.attemptId]);
  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 800);
  }, [flush]);

  // Resume: re-send any unsynced local patch from a previous page load.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(lsKey(data.attemptId)) ?? "null") as Patch | null;
      if (saved && Object.keys(saved).length) {
        setAnswers((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(saved)) next[k] = { ...blank(), ...prev[k], ...(v.choice !== undefined ? { choice: v.choice } : {}), ...(v.flagged !== undefined ? { flagged: v.flagged } : {}) };
          return next;
        });
        merge(saved);
        void flush();
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useCallback(
    async (auto: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      leave();
      for (let i = 0; i < 3 && !(await flush()); i++) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      try {
        await fetch(`/api/mocks/attempt/${data.attemptId}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ auto }) });
      } catch {}
      router.replace(`/mocks/attempt/${data.attemptId}/result`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.attemptId, flush, router],
  );

  // --- clock + auto-submit -----------------------------------------------
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 250);
    return () => clearInterval(t);
  }, [offset]);
  useEffect(() => {
    if (remaining <= 0 && !data.ended) void submit(true);
  }, [remaining, data.ended, submit]);
  // Sectional: jump into the open section when the previous one closes.
  useEffect(() => {
    if (openSection && q && q.section !== openSection) {
      const first = data.questions.findIndex((x) => x.section === openSection);
      if (first >= 0) go(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSection]);

  // --- visibility / unload ------------------------------------------------
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        tabSwitches.current += 1;
        leave();
        void flush();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flush]);

  // --- interactions -------------------------------------------------------
  function leave() {
    if (!q) return;
    const delta = Date.now() - enteredAt.current;
    enteredAt.current = Date.now();
    if (delta > 0) merge({ [q.id]: { timeMsDelta: delta, visited: true } });
  }
  function update(qid: string, p: Partial<MockAnswerDto>) {
    setAnswers((prev) => ({ ...prev, [qid]: { ...blank(), ...prev[qid], ...p } }));
    merge({ [qid]: { ...p, visited: true } });
    schedule();
  }
  function go(i: number) {
    if (i < 0 || i >= data.questions.length) return;
    if (locked(data.questions[i].section)) return;
    leave();
    setIdx(i);
    const nq = data.questions[i];
    if (!answers[nq.id]?.visited) update(nq.id, { visited: true });
  }
  useEffect(() => {
    if (q && !answers[q.id]?.visited) update(q.id, { visited: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirm || submitting || !q || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (["1", "2", "3", "4"].includes(e.key)) update(q.id, { choice: Number(e.key) - 1 });
      else if (e.key === "n" || e.key === "N" || e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "p" || e.key === "P" || e.key === "ArrowLeft") go(idx - 1);
      else if (e.key === "f" || e.key === "F") update(q.id, { flagged: !answers[q.id]?.flagged });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!q) return null;
  const a = answers[q.id];
  const unanswered = data.questions.filter((x) => answers[x.id]?.choice === null || answers[x.id]?.choice === undefined).length;
  const flagged = data.questions.filter((x) => answers[x.id]?.flagged).length;
  const timerTone = remaining < 60_000 ? "bg-coral-500 text-white" : remaining < 300_000 ? "bg-accent-500 text-ink-900" : "bg-ink-900 text-white";
  const sectionLeft = openSection ? sectionDeadline(openSection) - now : null;

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <OfflineBanner />
      <header className="sticky top-0 z-20 border-b border-border bg-bg">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink-900">{data.title}</div>
            <div className="text-xs text-text-600" aria-live="polite">{saving === "saving" ? "Saving…" : saving === "error" ? "Offline — answers kept on this device" : saving === "saved" ? "All answers saved" : "Answers save automatically"}</div>
          </div>
          {sectionLeft !== null && <div className="rounded-sm bg-ink-50 px-2 py-1 text-xs font-semibold tabular text-ink-900">{SECTION_LABEL[openSection!] ?? openSection} {fmt(sectionLeft)}</div>}
          <div className={cn("rounded-sm px-3 py-1.5 text-lg font-bold tabular transition-colors duration-200", timerTone)} role="timer" aria-label={`Time left ${fmt(remaining)}`} data-testid="mock-timer">
            {fmt(remaining)}
          </div>
        </div>
        <nav aria-label="Sections" className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {data.sections.map((s) => {
            const first = data.questions.findIndex((x) => x.section === s);
            const active = q.section === s;
            return (
              <button key={s} type="button" onClick={() => go(first)} disabled={locked(s)} className={cn("min-h-9 rounded-pill border px-3 text-sm", active ? "border-ink-900 bg-ink-900 text-white" : "border-border bg-bg text-ink-900", locked(s) && "opacity-40")}>
                {SECTION_LABEL[s] ?? s}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-4 md:flex-row">
        <main className="flex-1 space-y-3 pb-40 md:pb-4">
          <div className="flex items-center justify-between text-sm text-text-600">
            <span className="tabular" data-testid="mock-qno">Question {idx + 1} of {data.questions.length}</span>
            {data.negativeMark > 0 && <span>+{data.markCorrect} / −{data.negativeMark}</span>}
          </div>
          <article className="rounded-md border border-border bg-bg p-4 text-base leading-relaxed" data-testid="mock-stem">{renderStem(q.stem)}</article>
          <div className="space-y-2" role="radiogroup" aria-label="Options">
            {q.options.map((opt, i) => (
              <OptionButton key={i} label={LETTERS[i]} text={opt} state={a?.choice === i ? "selected" : "idle"} onClick={() => update(q.id, { choice: i })} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => update(q.id, { flagged: !a?.flagged })} className={cn("inline-flex min-h-11 items-center gap-1 rounded-sm border px-3 text-sm", a?.flagged ? "border-coral-500 bg-coral-50 text-ink-900" : "border-border bg-bg")} aria-pressed={Boolean(a?.flagged)}>
              <Flag aria-hidden className="h-4 w-4" /> {a?.flagged ? "Marked for review" : "Mark for review"}
            </button>
            <button type="button" onClick={() => update(q.id, { choice: null })} disabled={a?.choice === null || a?.choice === undefined} className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-border bg-bg px-3 text-sm disabled:opacity-40">
              <Eraser aria-hidden className="h-4 w-4" /> Clear
            </button>
          </div>
        </main>

        <aside className="md:w-64" aria-label="Question palette">
          <div className="rounded-md border border-border bg-bg p-3">
            <div className="mb-2 flex justify-between text-xs text-text-600"><span>{data.questions.length - unanswered} answered</span><span>{flagged} flagged</span></div>
            <ol className="grid grid-cols-8 gap-1.5 md:grid-cols-5">
              {data.questions.map((x, i) => {
                const s = answers[x.id];
                const answered = s?.choice !== null && s?.choice !== undefined;
                return (
                  <li key={x.id}>
                    <button
                      type="button"
                      onClick={() => go(i)}
                      disabled={locked(x.section)}
                      aria-label={`Question ${i + 1}${answered ? ", answered" : s?.visited ? ", not answered" : ", not visited"}${s?.flagged ? ", flagged" : ""}`}
                      aria-current={i === idx ? "true" : undefined}
                      data-state={answered ? "answered" : s?.visited ? "visited" : "new"}
                      className={cn(
                        "relative h-9 w-full rounded-sm border text-xs font-semibold tabular",
                        answered ? "border-success-500 bg-success-50 text-ink-900" : s?.visited ? "border-ink-700 bg-bg text-ink-900" : "border-border bg-surface text-text-600",
                        i === idx && "ring-2 ring-info-500",
                        locked(x.section) && "opacity-40",
                      )}
                    >
                      {i + 1}
                      {s?.flagged && <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-pill bg-coral-500" />}
                    </button>
                  </li>
                );
              })}
            </ol>
            <ul className="mt-3 grid grid-cols-2 gap-1 text-[11px] text-text-600">
              <li><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-success-500 bg-success-50" />Answered</li>
              <li><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-ink-700" />Not answered</li>
              <li><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-border bg-surface" />Not visited</li>
              <li><span className="mr-1 inline-block h-2.5 w-2.5 rounded-pill bg-coral-500" />Flagged</li>
            </ul>
          </div>
        </aside>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg md:static">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0 || locked(data.questions[idx - 1]?.section ?? "")} className="inline-flex min-h-12 items-center gap-1 rounded-sm border border-border px-4 disabled:opacity-40"><ChevronLeft aria-hidden className="h-4 w-4" />Prev</button>
          <button type="button" onClick={() => go(idx + 1)} disabled={idx === data.questions.length - 1 || locked(data.questions[idx + 1]?.section ?? "")} className="inline-flex min-h-12 flex-1 items-center justify-center gap-1 rounded-sm bg-ink-900 px-4 font-semibold text-white disabled:opacity-40">Next<ChevronRight aria-hidden className="h-4 w-4" /></button>
          <button type="button" onClick={() => setConfirm(true)} className="inline-flex min-h-12 items-center gap-1 rounded-sm bg-accent-500 px-4 font-semibold text-ink-900 hover:bg-accent-600" data-testid="mock-submit"><Send aria-hidden className="h-4 w-4" />Submit</button>
        </div>
      </footer>

      {confirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="submit-title" className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/40 p-4 md:items-center">
          <div className="w-full max-w-sm rounded-md bg-bg p-5 shadow-sm">
            <h2 id="submit-title" className="text-lg font-bold text-ink-900">Submit the test?</h2>
            <p className="mt-2 text-sm text-text-600" data-testid="unanswered-count">
              {unanswered === 0 ? "You've answered every question." : `${unanswered} question${unanswered > 1 ? "s are" : " is"} unanswered.`} {flagged > 0 && `${flagged} marked for review.`} You can&apos;t change answers after submitting.
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirm(false)} className="min-h-12 flex-1 rounded-sm border border-border font-semibold" autoFocus>Keep going</button>
              <button type="button" onClick={() => void submit(false)} disabled={submitting} className="min-h-12 flex-1 rounded-sm bg-ink-900 font-semibold text-white" data-testid="confirm-submit">{submitting ? "Submitting…" : "Submit"}</button>
            </div>
          </div>
        </div>
      )}
      {submitting && !confirm && (
        <div role="status" className="fixed inset-0 z-40 flex items-center justify-center bg-bg/90 text-lg font-semibold text-ink-900">Time&apos;s up — submitting your answers…</div>
      )}
    </div>
  );
}
