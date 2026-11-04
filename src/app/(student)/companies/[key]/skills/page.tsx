import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { getProfile, skillsChecklist, studentSignals } from "@/server/services/companies";
import { saveSelfSkill } from "@/app/actions/companies";
import { startFocusDrill } from "@/app/actions/focus";
import { StudentPage } from "@/components/StudentPage";
import { Section } from "@/components/ui/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
const TONE = { have: "success", weak: "warn", missing: "danger" } as const;

export default async function Skills({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = requireRole(await requireUser(), ["student"]);
  const { key } = await params;
  const sp = await searchParams;
  const p = await getProfile(key);
  if (!p) notFound();
  const items = await skillsChecklist(user.id, p, await studentSignals(user.id));
  const req = items.filter((i) => i.level === "required");
  const have = req.filter((i) => i.status === "have").length;
  const back = `/companies/${p.key}/skills`;
  return (
    <StudentPage
      eyebrow={
        <Link href={`/companies/${p.key}`} className="inline-flex min-h-11 items-center gap-1 text-ink-900 hover:underline">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {p.name}
        </Link>
      }
      title={`Skills checklist — ${p.name}`}
      subtitle={
        <>
          <span className="font-semibold text-ink-900 tabular">
            {have}/{req.length}
          </span>{" "}
          required skills in place. Compared with typical {p.name} fresher job descriptions; &ldquo;nice-to-have&rdquo; won&apos;t block you.
        </>
      }
    >
      {sp.saved && (
        <p role="status" className="rounded-sm bg-success-50 p-4 text-sm text-success-700">
          Saved.
        </p>
      )}
      {(["required", "nice_to_have"] as const).map((lvl) => (
        <Section key={lvl} title={lvl === "required" ? "Required" : "Nice to have"}>
          <ul className="space-y-4" data-testid={`skills-${lvl}`}>
            {items
              .filter((i) => i.level === lvl)
              .map((i) => (
                <li key={i.key} className="rounded-md border border-border bg-bg p-6 lg:p-8" data-testid="skill-item" data-status={i.status}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold text-text-900">{i.name}</span>
                    <Badge tone={TONE[i.status]}>{i.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-text-600">
                    {i.source === "auto" ? "Measured from your practice" : "Self-declared"} · {i.note}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                    {i.action.focusTopics?.length ? (
                      <form action={startFocusDrill}>
                        <input type="hidden" name="topics" value={i.action.focusTopics.join(",")} />
                        <Button type="submit" variant="secondary">
                          {i.action.label}
                        </Button>
                      </form>
                    ) : (
                      <span className="text-text-900">{i.action.label}</span>
                    )}
                    {i.resource && (
                      <a href={i.resource.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm text-ink-900 underline">
                        {i.resource.label}
                        <ExternalLink aria-hidden className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {i.source === "self" && (
                    <form action={saveSelfSkill} className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-sm">
                      <input type="hidden" name="skill" value={i.key} />
                      <input type="hidden" name="back" value={back} />
                      <select name="status" defaultValue={i.status} aria-label={`${i.name} status`} className="h-11 rounded-sm border border-border bg-bg px-4 text-base">
                        <option value="have">have</option>
                        <option value="weak">weak</option>
                        <option value="missing">missing</option>
                      </select>
                      <Input name="evidence" placeholder="evidence (project, course…)" maxLength={200} aria-label={`${i.name} evidence`} className="w-auto min-w-0 flex-1" />
                      <Button type="submit" variant="secondary">
                        Update
                      </Button>
                    </form>
                  )}
                </li>
              ))}
          </ul>
        </Section>
      ))}
    </StudentPage>
  );
}
