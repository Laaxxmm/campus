import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { getProfile, skillsChecklist, studentSignals } from "@/server/services/companies";
import { saveSelfSkill } from "@/app/actions/companies";
import { startFocusDrill } from "@/app/actions/focus";
import { Badge } from "@/components/ui/badge";

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
    <div className="space-y-4">
      <Link href={`/companies/${p.key}`} className="inline-flex min-h-11 items-center gap-1 text-sm text-ink-900"><ArrowLeft aria-hidden className="h-4 w-4" />{p.name}</Link>
      <h1 className="text-xl font-bold text-ink-900">Skills checklist — {p.name}</h1>
      <p className="text-sm text-text-600">{have}/{req.length} required skills in place. Compared with typical {p.name} fresher job descriptions; &ldquo;nice-to-have&rdquo; won&apos;t block you.</p>
      {sp.saved && <p role="status" className="text-sm text-success-700">Saved.</p>}
      {(["required", "nice_to_have"] as const).map((lvl) => (
        <section key={lvl}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-600">{lvl === "required" ? "Required" : "Nice to have"}</h2>
          <ul className="space-y-2" data-testid={`skills-${lvl}`}>
            {items.filter((i) => i.level === lvl).map((i) => (
              <li key={i.key} className="rounded-md border border-border bg-bg p-4" data-testid="skill-item" data-status={i.status}>
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{i.name}</span><Badge tone={TONE[i.status]}>{i.status}</Badge></div>
                <p className="mt-2 text-xs text-text-600">{i.source === "auto" ? "Measured from your practice" : "Self-declared"} · {i.note}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  {i.action.focusTopics?.length ? (
                    <form action={startFocusDrill}><input type="hidden" name="topics" value={i.action.focusTopics.join(",")} /><button type="submit" className="min-h-10 rounded-sm bg-ink-900 px-4 text-xs font-semibold text-white">{i.action.label}</button></form>
                  ) : (
                    <span className="text-text-900">{i.action.label}</span>
                  )}
                  {i.resource && <a href={i.resource.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-info-500 underline">{i.resource.label}<ExternalLink aria-hidden className="h-3 w-3" /></a>}
                </div>
                {i.source === "self" && (
                  <form action={saveSelfSkill} className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <input type="hidden" name="skill" value={i.key} /><input type="hidden" name="back" value={back} />
                    <select name="status" defaultValue={i.status} aria-label={`${i.name} status`} className="h-10 rounded-sm border border-border bg-bg px-2"><option value="have">have</option><option value="weak">weak</option><option value="missing">missing</option></select>
                    <input name="evidence" placeholder="evidence (project, course…)" maxLength={200} aria-label={`${i.name} evidence`} className="h-10 min-w-0 flex-1 rounded-sm border border-border px-2" />
                    <button type="submit" className="min-h-10 rounded-sm border border-border px-4">Update</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
