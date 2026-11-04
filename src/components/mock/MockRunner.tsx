"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Eraser, Flag, LayoutGrid, Send, X } from "lucide-react";
import type { MockAnswerDto, MockAttemptDto } from "@/lib/mock-types";
import { renderStem } from "@/lib/mini-markdown";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OptionButton } from "@/components/OptionButton";
import { PaletteCell } from "@/components/mock/PaletteCell";
import { TimerBar, formatClock } from "@/components/TimerBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Patch = Record<string, { choice?: number | null; flagged?: boolean; visited?: boolean; timeMsDelta?: number }>;
const LETTERS = ["A", "B", "C", "D"];
const SECTION_LABEL: Record<string, string> = { quant: "Quant", logical: "Logical", verbal: "Verbal", coding: "Coding" };
const lsKey = (id: string) => `lc-mock-${id}`;
const blank = (): MockAnswerDto => ({ choice: null, flagged: false, visited: true, timeMs: 0 });


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
  const [drawer, setDrawer] = useState(false);
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

  useEffect(() => {
    window.scrollTo(0, 0); // arriving from the intro page keeps its scroll offset otherwise
  }, [idx]);

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
      if (e.key === "Escape") {
        setDrawer(false);
        setConfirm(false);
        return;
      }
      if (confirm || drawer || submitting || !q || e.metaKey || e.ctrlKey || e.altKey) return;
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
  const answeredCount = data.questions.filter((x) => answers[x.id]?.choice !== null && answers[x.id]?.choice !== undefined).length;
  const unanswered = data.questions.length - answeredCount;
  const flagged = data.questions.filter((x) => answers[x.id]?.flagged).length;
  const sectionLeft = openSection ? sectionDeadline(openSection) - now : null;
  const totalMs = endsAt - new Date(data.startedAt).getTime();
  const saveText = saving === "saving" ? "Saving…" : saving === "error" ? "Offline — answers kept on this device" : saving === "saved" ? "All answers saved" : "Answers save automatically";
  const canPrev = idx > 0 && !locked(data.questions[idx - 1]?.section ?? "");
  const canNext = idx < data.questions.length - 1 && !locked(data.questions[idx + 1]?.section ?? "");

  const palette = (
    <>
      <div className="mb-4 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-ink-900">Questions</span>
        <span className="tabular text-text-600">
          {answeredCount} answered · {flagged} flagged
        </span>
      </div>
      <ol className="grid grid-cols-[repeat(auto-fill,40px)] gap-2">
        {data.questions.map((x, i) => {
          const st = answers[x.id];
          const answered = st?.choice !== null && st?.choice !== undefined;
          return (
            <li key={x.id}>
              <PaletteCell
                n={i + 1}
                state={answered ? "answered" : st?.visited ? "visited" : "new"}
                flagged={Boolean(st?.flagged)}
                current={i === idx}
                locked={locked(x.section)}
                onClick={() => {
                  go(i);
                  setDrawer(false);
                }}
              />
            </li>
          );
        })}
      </ol>
      <ul className="mt-6 grid grid-cols-2 gap-2 text-xs text-text-600">
        <li className="flex items-center gap-2"><span aria-hidden className="h-4 w-4 rounded-[4px] bg-ink-900" />Answered</li>
        <li className="flex items-center gap-2"><span aria-hidden className="h-4 w-4 rounded-[4px] border-2 border-coral-500" />Not answered</li>
        <li className="flex items-center gap-2"><span aria-hidden className="h-4 w-4 rounded-[4px] border border-border bg-bg" />Not visited</li>
        <li className="flex items-center gap-2"><span aria-hidden className="relative h-4 w-4 rounded-[4px] border border-border bg-bg"><span className="absolute -right-1 -top-1 h-2 w-2 rounded-pill bg-accent-500" /></span>Marked for review</li>
      </ul>
    </>
  );

  return (
    <div className="min-h-dvh bg-surface">
      <OfflineBanner />
      {/* Exam chrome: 64px top bar (name · timer · submit), 48px section tabs, 72px bottom action bar. */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-ink-900">{data.title}</div>
            <div className="truncate text-xs text-text-600" aria-live="polite">{saveText}</div>
          </div>
          <TimerBar remainingMs={remaining} totalMs={totalMs} testId="mock-timer" />
          <div className="flex justify-end">
            <Button variant="cta" size="lg" onClick={() => setConfirm(true)} data-testid="mock-submit" data-cta="primary" className="h-11 px-4 sm:h-[52px] sm:px-6">
              <Send aria-hidden className="hidden sm:block" />
              Submit
            </Button>
          </div>
        </div>
      </header>
      <nav aria-label="Sections" className="sticky top-16 z-20 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1440px] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
            {data.sections.map((sec) => {
              const first = data.questions.findIndex((x) => x.section === sec);
              const active = q.section === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => go(first)}
                  disabled={locked(sec)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex h-12 shrink-0 items-center border-b-2 px-4 text-sm",
                    active ? "border-ink-900 font-semibold text-ink-900" : "border-transparent text-text-600 hover:text-ink-900",
                    locked(sec) && "opacity-40",
                  )}
                >
                  {SECTION_LABEL[sec] ?? sec}
                </button>
              );
            })}
          </div>
          {sectionLeft !== null && (
            <span className="shrink-0 rounded-pill bg-ink-50 px-2 py-1 text-xs font-semibold tabular text-ink-900">
              {SECTION_LABEL[openSection!] ?? openSection} {formatClock(sectionLeft)}
            </span>
          )}
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm border border-border bg-bg px-4 text-sm font-semibold text-ink-900 lg:hidden"
            aria-haspopup="dialog"
            data-testid="palette-open"
          >
            <LayoutGrid aria-hidden className="h-4 w-4" />
            <span className="tabular">Questions {answeredCount}/{data.questions.length}</span>
          </button>
        </div>
      </nav>

      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 pb-32 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8 lg:pt-8">
        <main className="mx-auto w-full max-w-[720px]">
          <div className="mb-4 flex items-baseline justify-between text-sm text-text-600">
            <span className="font-semibold tabular text-ink-900" data-testid="mock-qno">
              Question {idx + 1} of {data.questions.length}
            </span>
            {data.negativeMark > 0 && <span className="tabular">+{data.markCorrect} / −{data.negativeMark}</span>}
          </div>
          <article className="rounded-md border border-border bg-bg p-6 text-base leading-relaxed lg:p-8" data-testid="mock-stem">
            {renderStem(q.stem)}
          </article>
          <div className="mt-6 space-y-4" role="radiogroup" aria-label="Options">
            {q.options.map((opt, i) => (
              <OptionButton key={i} radio label={LETTERS[i]} text={opt} state={a?.choice === i ? "selected" : "idle"} onClick={() => update(q.id, { choice: i })} />
            ))}
          </div>
        </main>

        <aside aria-label="Question palette" className="hidden lg:block">
          <div className="sticky top-[136px] max-h-[calc(100dvh-136px-96px)] overflow-y-auto rounded-md border border-border bg-bg p-6">{palette}</div>
        </aside>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Button variant="secondary" onClick={() => go(idx - 1)} disabled={!canPrev} aria-label="Previous question" className="px-4">
            <ChevronLeft aria-hidden />
            <span className="hidden sm:inline">Prev</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => update(q.id, { flagged: !a?.flagged })}
            aria-pressed={Boolean(a?.flagged)}
            aria-label={a?.flagged ? "Marked for review" : "Mark for review"}
            className={cn("px-4", a?.flagged && "border-accent-500 bg-accent-50")}
          >
            <Flag aria-hidden />
            <span className="hidden sm:inline">{a?.flagged ? "Marked for review" : "Mark for review"}</span>
          </Button>
          <Button variant="ghost" onClick={() => update(q.id, { choice: null })} disabled={a?.choice === null || a?.choice === undefined} aria-label="Clear response" className="px-4">
            <Eraser aria-hidden />
            <span className="hidden sm:inline">Clear</span>
          </Button>
          <Button variant="secondary" onClick={() => go(idx + 1)} disabled={!canNext} className="ml-auto border-2 border-ink-900 px-4 sm:px-6">
            Save &amp; Next
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </footer>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Question palette">
          <button type="button" aria-label="Close question palette" className="absolute inset-0 h-full w-full cursor-default bg-ink-900/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto rounded-t-lg bg-bg p-6 pb-8 pt-16 shadow-e2">
            <Button variant="ghost" onClick={() => setDrawer(false)} autoFocus aria-label="Close" className="absolute right-4 top-2 h-11 w-11 px-0">
              <X aria-hidden />
            </Button>
            {palette}
          </div>
        </div>
      )}

      {confirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="submit-title" className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center">
          <div className="w-full max-w-[420px] rounded-md bg-bg p-6 shadow-e2 lg:p-8">
            <h2 id="submit-title" className="text-xl font-semibold text-ink-900">Submit the test?</h2>
            <dl className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div><dt className="text-xs font-medium uppercase tracking-wide text-text-600">Answered</dt><dd className="mt-2 text-2xl font-bold tabular text-ink-900">{answeredCount}</dd></div>
              <div><dt className="text-xs font-medium uppercase tracking-wide text-text-600">Unanswered</dt><dd className="mt-2 text-2xl font-bold tabular text-ink-900">{unanswered}</dd></div>
              <div><dt className="text-xs font-medium uppercase tracking-wide text-text-600">For review</dt><dd className="mt-2 text-2xl font-bold tabular text-ink-900">{flagged}</dd></div>
            </dl>
            <p className="mt-6 text-sm text-text-600" data-testid="unanswered-count">
              {unanswered === 0 ? "You've answered every question." : `${unanswered} question${unanswered > 1 ? "s are" : " is"} unanswered.`} {flagged > 0 && `${flagged} marked for review.`} You can&apos;t change answers after submitting.
            </p>
            <div className="mt-8 flex gap-2">
              <Button variant="secondary" onClick={() => setConfirm(false)} className="flex-1" autoFocus>
                Keep going
              </Button>
              <Button variant="cta" onClick={() => void submit(false)} loading={submitting} className="flex-1" data-testid="confirm-submit" data-cta="primary">
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
      {submitting && !confirm && (
        <div role="status" className="fixed inset-0 z-50 flex items-center justify-center bg-bg/90 text-lg font-semibold text-ink-900">
          Time&apos;s up — submitting your answers…
        </div>
      )}
    </div>
  );
}
