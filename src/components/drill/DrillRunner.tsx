"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudUpload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AttemptResultDto, DrillQuestionDto } from "@/lib/drill-types";
import { renderStem } from "@/lib/mini-markdown";
import { enqueue, flush, type SyncResult } from "@/lib/offline-queue";
import { OptionButton, type OptionState } from "@/components/OptionButton";
import { ProgressDots, type DotState } from "@/components/ProgressDots";
import { TimerBar } from "@/components/TimerBar";
import { OfflineBanner, useOnline } from "@/components/OfflineBanner";
import { ExplanationSheet } from "./ExplanationSheet";

type Props = { drillId: string; items: DrillQuestionDto[]; initialResults: AttemptResultDto[]; explainEnabled: boolean };
type Local = { answers: Record<string, { displayed: number | null; clientId: string }>; current: number };

const LETTERS = ["A", "B", "C", "D"];
const storeKey = (id: string) => `lc-drill-${id}`;

export function DrillRunner({ drillId, items, initialResults, explainEnabled }: Props) {
  const router = useRouter();
  const online = useOnline();
  const [results, setResults] = useState<Record<string, AttemptResultDto>>(() => Object.fromEntries(initialResults.map((r) => [r.questionId, r])));
  const [local, setLocal] = useState<Local>(() => ({ answers: {}, current: firstUnanswered(items, initialResults) }));
  const [selected, setSelected] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const changes = useRef(0); // v3 event: how often the student switched options before checking
  const hydrated = useRef(false);

  // Restore local progress (offline answers) and cache drill JSON for offline reloads.
  useEffect(() => {
    try {
      localStorage.setItem(`${storeKey(drillId)}-data`, JSON.stringify({ items, at: Date.now() }));
      const saved = JSON.parse(localStorage.getItem(storeKey(drillId)) ?? "null") as Local | null;
      if (saved) setLocal((l) => ({ answers: { ...saved.answers, ...l.answers }, current: Math.max(l.current, saved.current) }));
    } catch {}
    hydrated.current = true;
    // Warm the service-worker cache with the full drill document so a reload works offline even when
    // the student arrived via client-side navigation (which only fetches an RSC payload).
    if (navigator.serviceWorker?.controller) void fetch(window.location.pathname, { credentials: "same-origin" }).catch(() => {});
  }, [drillId, items]);
  useEffect(() => {
    if (hydrated.current) localStorage.setItem(storeKey(drillId), JSON.stringify(local));
  }, [drillId, local]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const applySync = useCallback((rs: SyncResult[]) => {
    const ok = rs.filter((r) => r.ok && r.result) as { result: AttemptResultDto }[];
    if (ok.length) setResults((prev) => ({ ...prev, ...Object.fromEntries(ok.map((r) => [r.result.questionId, r.result])) }));
  }, []);
  useEffect(() => {
    if (online) void flush().then(applySync);
  }, [online, applySync]);

  const q = items[local.current];
  const done = local.current >= items.length;
  const myAnswer = q ? local.answers[q.id] : undefined;
  const result = q ? results[q.id] : undefined;
  const answered = Boolean(myAnswer || result);

  const dots: DotState[] = useMemo(
    () =>
      items.map((it, i) => {
        const r = results[it.id];
        if (r) return r.correct ? "correct" : "wrong";
        if (local.answers[it.id]) return "pending";
        return i === local.current ? "current" : "todo";
      }),
    [items, results, local],
  );

  async function submit(displayed: number | null) {
    if (!q || answered || busy) return;
    setBusy(true);
    const clientId = `${drillId}:${q.id}:${crypto.randomUUID().slice(0, 8)}`;
    const timeMs = Date.now() - startedAt;
    setLocal((l) => ({ ...l, answers: { ...l.answers, [q.id]: { displayed, clientId } } }));
    await enqueue({ clientId, drillId, questionId: q.id, displayedIndex: displayed, timeMs, answerChanges: changes.current, at: Date.now() });
    changes.current = 0;
    if (navigator.onLine) applySync(await flush());
    setBusy(false);
  }

  function next() {
    window.scrollTo(0, 0);
    setSelected(null);
    setStartedAt(Date.now());
    setLocal((l) => ({ ...l, current: l.current + 1 }));
  }

  useEffect(() => {
    if (!done) return;
    const allSynced = items.every((it) => results[it.id]);
    if (allSynced) {
      localStorage.removeItem(storeKey(drillId));
      router.replace(`/drill/${drillId}/done`);
    }
  }, [done, items, results, drillId, router]);

  if (done) {
    const synced = items.filter((it) => results[it.id]).length;
    return (
      <div className="flex min-h-dvh flex-col">
        <OfflineBanner />
        <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 text-center">
          <CloudUpload aria-hidden className="h-12 w-12 text-ink-900" />
          <h1 className="mt-4 text-xl font-bold">All 10 answered!</h1>
          <p className="mt-2 text-text-600" data-testid="sync-status">
            {synced}/{items.length} synced. {online ? "Syncing…" : "We'll grade the rest as soon as you're online."}
          </p>
        </main>
      </div>
    );
  }

  const optionState = (i: number): OptionState => {
    if (result) {
      if (i === result.correctDisplayed) return "correct";
      if (i === result.chosenDisplayed) return "wrong";
      return "disabled";
    }
    if (myAnswer) return i === myAnswer.displayed ? "selected" : "disabled";
    return selected === i ? "selected" : "idle";
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <OfflineBanner />
      <header className="sticky top-0 z-10 space-y-2 bg-surface px-4 pb-2 pt-4">
        <div className="flex items-center justify-between text-xs text-text-600">
          <a href="/today" className="flex min-h-11 min-w-11 items-center" aria-label="Exit drill"><X className="h-5 w-5" /></a>
          <span className="tabular">Q {local.current + 1} / {items.length}</span>
          <span className="w-6" />
        </div>
        <ProgressDots states={dots} />
        <TimerBar elapsedMs={answered ? 0 : now - startedAt} limitSec={q.timeSec} />
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-72">
        <article className="rounded-lg border border-border bg-bg p-4 text-base leading-relaxed" data-testid="stem">
          {renderStem(q.stem)}
        </article>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 px-4 pb-4 pt-4 backdrop-blur">
        <div className="mx-auto max-w-md space-y-2">
          {q.options.map((opt, i) => (
            <OptionButton key={i} label={LETTERS[i]} text={opt} state={optionState(i)} onClick={() => {
                if (answered) return;
                if (selected === i) return void submit(i);
                if (selected !== null) changes.current += 1;
                setSelected(i);
              }} />
          ))}
          {!answered && (
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => submit(null)} className="min-h-11 px-4 text-sm text-text-600">Skip</button>
              <button type="button" disabled={selected === null || busy} onClick={() => submit(selected)} className="min-h-12 flex-1 rounded-md bg-ink-900 font-semibold text-white disabled:opacity-40">
                Check answer
              </button>
            </div>
          )}
          {answered && !result && (
            <div className="flex items-center gap-2 pt-2">
              <p className="flex-1 text-sm text-text-600" data-testid="pending-note">Saved offline · will be graded when you reconnect</p>
              <button type="button" onClick={next} className="min-h-12 rounded-md bg-ink-900 px-6 font-semibold text-white">Next</button>
            </div>
          )}
        </div>
      </footer>

      {result && <ExplanationSheet result={result} onNext={next} last={local.current === items.length - 1} explainEnabled={explainEnabled} correctText={q.options[result.correctDisplayed]} />}
    </div>
  );
}

function firstUnanswered(items: DrillQuestionDto[], results: AttemptResultDto[]) {
  const done = new Set(results.map((r) => r.questionId));
  const i = items.findIndex((it) => !done.has(it.id));
  return i < 0 ? items.length : i;
}
