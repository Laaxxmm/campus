import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ExternalLink, ListChecks } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { topicName } from "@/lib/question-schema";
import { getProfile, hrCardsFor, readinessFor, roundGaps, studentSignals, techTopicsFor } from "@/server/services/companies";
import { practisedHr } from "@/app/actions/companies";
import { startFocusDrill } from "@/app/actions/focus";
import { ScoreBar } from "@/components/companies/ScoreBar";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
const STATUS = { on_track: { tone: "success", label: "On track" }, close: { tone: "warn", label: "Close" }, gap: { tone: "danger", label: "Gap" } } as const;
const BRANCH = { cse_it: "CSE / IT", ece_eee: "ECE / EEE", mech_civil: "Mech / Civil", all: "All branches" } as const;

export default async function CompanyPath({ params }: { params: Promise<{ key: string }> }) {
  const user = requireRole(await requireUser(), ["student"]);
  const { key } = await params;
  const p = await getProfile(key);
  if (!p) notFound();
  const s = await studentSignals(user.id);
  const r = await readinessFor(p, s);
  const gaps = roundGaps(p, r, s);
  const tech = techTopicsFor(p, s.branch);
  const be = p.branch_expectations[s.branch] ?? p.branch_expectations.all;
  const hr = (await hrCardsFor(p.key)).slice(0, 8);
  return (
    <div className="space-y-6">
      <Link href="/companies" className="inline-flex min-h-11 items-center gap-1 text-sm text-ink-900"><ArrowLeft aria-hidden className="h-4 w-4" />Companies</Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{p.name}</h1>
          <p className="text-xs text-text-600">{p.roles.map((x) => x.name).join(" · ")}</p>
        </div>
        <div className="text-right"><div className="text-3xl font-bold tabular" data-testid="readiness-score">{r.score}</div><div className="text-xs text-text-600">readiness</div></div>
      </div>

      <section className="space-y-4 rounded-md border border-border bg-bg p-4" data-testid="readiness-breakdown">
        <h2 className="font-semibold text-ink-900">Why this score</h2>
        <ScoreBar label="Aptitude vs cutoff · 40%" score={r.aptitude.score} why={r.aptitude.why} bar={80} />
        <ScoreBar label="Tech concepts · 30%" score={r.tech.score} why={r.tech.why} bar={60} />
        <ScoreBar label="Consistency · 15%" score={r.consistency.score} why={r.consistency.why} />
        <ScoreBar label="Profile (resume + LinkedIn) · 15%" score={r.profile.score} why={r.profile.why} bar={80} />
        <p className="text-xs text-text-600">{r.interviewReady ? "You meet every interview-ready gate for this company." : "Interview-ready = aptitude ≥ 80, tech ≥ 60, profile ≥ 80 and one mock or 5 HR questions practised."}</p>
      </section>

      <section className="rounded-md border border-border bg-bg p-4">
        <h2 className="font-semibold text-ink-900">Round by round</h2>
        <ol className="mt-4 space-y-4" data-testid="rounds">
          {p.rounds.map((round, i) => {
            const g = gaps[i];
            return (
              <li key={round.key} className="rounded-sm border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{i + 1}. {round.name}</span>
                  <Badge tone={STATUS[g.status].tone}>{STATUS[g.status].label}</Badge>
                </div>
                <p className="mt-2 text-xs text-text-600">{round.what_they_check}{round.duration_min ? ` · ~${round.duration_min} min` : ""}{round.negative_marking ? " · negative marking" : ""}</p>
                <p className="mt-2 text-sm">{g.line}</p>
                <ul className="mt-2 list-disc pl-6 text-xs text-text-600">{round.prep.map((x) => <li key={x}>{x}</li>)}</ul>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-xs text-text-600">Bar: {p.cutoffs.aptitude_percent ? `~${p.cutoffs.aptitude_percent}% (approx.)` : "not published"} — {p.cutoffs.note}</p>
      </section>

      <section className="rounded-md border border-border bg-bg p-4">
        <h2 className="font-semibold text-ink-900">Technical prep for {BRANCH[s.branch]}</h2>
        {be && <p className="mt-2 text-sm text-text-600">{be.note} Coding round: {be.coding.replace("_", " ")}.</p>}
        <ul className="mt-4 grid gap-2 sm:grid-cols-2" data-testid="tech-topics">
          {tech.map((t) => (
            <li key={t} className="flex items-center justify-between gap-2 rounded-sm border border-border px-4 py-2 text-sm">
              <Link href={`/learn/${t}`} className="inline-flex items-center gap-2 font-medium hover:underline"><BookOpen aria-hidden className="h-4 w-4" />{topicName(t)}</Link>
              <form action={startFocusDrill}><input type="hidden" name="topics" value={t} /><button type="submit" className="min-h-9 rounded-sm bg-ink-900 px-4 text-xs font-semibold text-white">Drill</button></form>
            </li>
          ))}
        </ul>
        <Link href={`/companies/${p.key}/skills`} className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-info-500 underline" data-testid="skills-link"><ListChecks aria-hidden className="h-4 w-4" />Missing-skills checklist</Link>
      </section>

      <section id="hr" className="rounded-md border border-border bg-bg p-4">
        <h2 className="font-semibold text-ink-900">HR &amp; interview questions</h2>
        <p className="text-xs text-text-600">They often probe: {p.hr_focus.join("; ")}. Practise aloud using the structure; mark done when you have.</p>
        <ul className="mt-4 space-y-2">
          {hr.map((q) => (
            <li key={q.id}>
              <details className="rounded-sm border border-border p-4">
                <summary className="cursor-pointer text-sm font-medium">{q.question}</summary>
                <p className="mt-2 text-xs text-text-600">Why they ask: {q.whyTheyAsk}</p>
                <p className="mt-2 text-xs font-semibold">Structure: {q.structure.join(" → ")}</p>
                <p className="mt-2 whitespace-pre-line text-sm">{q.outline}</p>
                <p className="mt-2 text-xs text-text-600">Avoid: {q.avoid.join("; ")}</p>
                <form action={practisedHr} className="mt-2"><input type="hidden" name="id" value={q.id} /><input type="hidden" name="back" value={`/companies/${p.key}`} /><button type="submit" className="min-h-9 rounded-sm border border-border px-4 text-xs">I practised this</button></form>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <footer className="rounded-md bg-surface p-4 text-xs text-text-600" data-testid="sources">
        <p>{p.disclaimer}</p>
        <p className="mt-2 font-semibold">Sources (updated {p.updated_at}):</p>
        <ul className="mt-2 space-y-2">{p.sources.map((src) => <li key={src.url}><a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">{src.title}<ExternalLink aria-hidden className="h-3 w-3" /></a> · {src.kind}, accessed {src.accessed}</li>)}</ul>
      </footer>
    </div>
  );
}
