import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ExternalLink, ListChecks } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { topicName } from "@/lib/question-schema";
import { getProfile, hrCardsFor, readinessFor, roundGaps, studentSignals, techTopicsFor } from "@/server/services/companies";
import { practisedHr } from "@/app/actions/companies";
import { startFocusDrill } from "@/app/actions/focus";
import { cn } from "@/lib/utils";
import { ScoreBar } from "@/components/companies/ScoreBar";
import { StudentPage } from "@/components/StudentPage";
import { Stat } from "@/components/ui/layout";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";

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
    <StudentPage
      width="app"
      eyebrow={
        <Link href="/companies" className="inline-flex min-h-11 items-center gap-1 text-ink-900 hover:underline">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Companies
        </Link>
      }
      title={p.name}
      subtitle={p.roles.map((x) => x.name).join(" · ")}
      actions={
        <div className="text-right">
          <Stat label="Readiness" value={<span data-testid="readiness-score">{r.score}</span>} size="lg" />
        </div>
      }
    >
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card className="space-y-4" data-testid="readiness-breakdown">
            <h2 className="text-base font-semibold text-text-900">Why this score</h2>
            <ScoreBar label="Aptitude vs cutoff · 40%" score={r.aptitude.score} why={r.aptitude.why} bar={80} />
            <ScoreBar label="Tech concepts · 30%" score={r.tech.score} why={r.tech.why} bar={60} />
            <ScoreBar label="Consistency · 15%" score={r.consistency.score} why={r.consistency.why} />
            <ScoreBar label="Profile (resume + LinkedIn) · 15%" score={r.profile.score} why={r.profile.why} bar={80} />
            <p className={cn("rounded-sm p-4 text-sm", r.interviewReady ? "bg-success-50 text-success-700" : "bg-surface text-text-900")}>
              {r.interviewReady ? "You meet every interview-ready gate for this company." : "Interview-ready = aptitude ≥ 80, tech ≥ 60, profile ≥ 80 and one mock or 5 HR questions practised."}
            </p>
          </Card>

          <Card>
            <CardHeader title="Round by round" />
            <ol className="space-y-4" data-testid="rounds">
              {p.rounds.map((round, i) => {
                const g = gaps[i];
                return (
                  <li key={round.key} className="rounded-sm border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-text-900">
                        {i + 1}. {round.name}
                      </span>
                      <Badge tone={STATUS[g.status].tone}>{STATUS[g.status].label}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-text-600">
                      {round.what_they_check}
                      {round.duration_min ? ` · ~${round.duration_min} min` : ""}
                      {round.negative_marking ? " · negative marking" : ""}
                    </p>
                    <p className="mt-2 text-base text-text-900">{g.line}</p>
                    <ul className="mt-2 list-disc space-y-2 pl-6 text-sm text-text-600">
                      {round.prep.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 text-sm text-text-600">
              Bar: {p.cutoffs.aptitude_percent ? `~${p.cutoffs.aptitude_percent}% (approx.)` : "not published"} — {p.cutoffs.note}
            </p>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Card>
            <CardHeader title={`Technical prep for ${BRANCH[s.branch]}`} />
            {be && (
              <p className="text-sm text-text-600">
                {be.note} Coding round: {be.coding.replace("_", " ")}.
              </p>
            )}
            <ul className="mt-4 space-y-2" data-testid="tech-topics">
              {tech.map((t) => (
                <li key={t} className="flex items-center justify-between gap-2 rounded-sm border border-border py-2 pl-4 pr-2">
                  <Link href={`/learn/${t}`} className="inline-flex min-h-11 min-w-0 items-center gap-2 text-sm font-medium text-text-900 hover:underline">
                    <BookOpen aria-hidden className="h-4 w-4 shrink-0" />
                    {topicName(t)}
                  </Link>
                  <form action={startFocusDrill}>
                    <input type="hidden" name="topics" value={t} />
                    <Button type="submit" variant="secondary">
                      Drill
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
            <Link href={`/companies/${p.key}/skills`} className={cn(buttonVariants({ variant: "primary" }), "mt-6 w-full")} data-testid="skills-link" data-cta="primary">
              <ListChecks aria-hidden />
              Missing-skills checklist
            </Link>
          </Card>

          <Card id="hr">
            <h2 className="text-base font-semibold text-text-900">HR &amp; interview questions</h2>
            <p className="mt-2 text-sm text-text-600">They often probe: {p.hr_focus.join("; ")}. Practise aloud using the structure; mark done when you have.</p>
            <ul className="mt-4 space-y-2">
              {hr.map((q) => (
                <li key={q.id}>
                  <details className="rounded-sm border border-border">
                    <summary className="cursor-pointer p-4 text-sm font-medium text-text-900">{q.question}</summary>
                    <div className="space-y-2 px-4 pb-4">
                      <p className="text-sm text-text-600">Why they ask: {q.whyTheyAsk}</p>
                      <p className="text-sm font-semibold text-text-900">Structure: {q.structure.join(" → ")}</p>
                      <p className="whitespace-pre-line text-sm text-text-900">{q.outline}</p>
                      <p className="text-sm text-text-600">Avoid: {q.avoid.join("; ")}</p>
                      <form action={practisedHr} className="pt-2">
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="back" value={`/companies/${p.key}`} />
                        <Button type="submit" variant="secondary">
                          I practised this
                        </Button>
                      </form>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <footer className="mt-12 border-t border-border pt-6 text-sm text-text-600 lg:mt-16" data-testid="sources">
        <p>{p.disclaimer}</p>
        <p className="mt-4 font-semibold text-text-900">Sources (updated {p.updated_at}):</p>
        <ul className="mt-2 space-y-2">
          {p.sources.map((src) => (
            <li key={src.url}>
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-ink-900 underline">
                {src.title}
                <ExternalLink aria-hidden className="h-3 w-3" />
              </a>{" "}
              · {src.kind}, accessed {src.accessed}
            </li>
          ))}
        </ul>
      </footer>
    </StudentPage>
  );
}
