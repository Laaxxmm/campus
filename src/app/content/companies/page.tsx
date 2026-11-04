import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/authz";
import type { CompanyProfile } from "@/lib/content-schema";
import { companyProfilesForReview, setCompanyProfileStatus } from "@/server/services/llm-admin";
import { AdminShell } from "@/components/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function setStatus(formData: FormData) {
  "use server";
  const user = requireRole(await requireUser(), ["content"]);
  const s = String(formData.get("status"));
  await setCompanyProfileStatus(user, String(formData.get("key")), s === "golden" ? "golden" : s === "retired" ? "retired" : "review");
  redirect("/content/companies");
}

export default async function CompanyReview() {
  const user = requireRole(await requireUser(), ["content"]);
  const rows = await companyProfilesForReview(user);
  return (
    <AdminShell title="Company profiles" role={user.role}>
      <p className="mb-4 max-w-3xl text-sm text-text-600">Profiles are compiled from public sources. Before a pilot, open each source and confirm rounds and cutoffs; send a profile back to review to hide it from students.</p>
      <ul className="space-y-4" data-testid="company-review">
        {rows.map((p) => {
          const cut = p.cutoffs as CompanyProfile["cutoffs"];
          return (
            <li key={p.key} className="rounded-md border border-border bg-bg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink-900">{p.name} <span className="text-xs font-normal text-text-600">v{p.version} · updated {p.updatedAt}</span></span>
                <Badge tone={p.status === "golden" ? "success" : "warn"}>{p.status === "golden" ? "live" : p.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-text-600">Cutoff: {cut.aptitude_percent ?? "not published"} — {cut.note}</p>
              <ul className="mt-2 text-xs">
                {(p.sources as CompanyProfile["sources"]).map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.title}</a> · {s.kind}</li>)}
              </ul>
              <form action={setStatus} className="mt-4 flex gap-2">
                <input type="hidden" name="key" value={p.key} />
                {p.status !== "golden" ? <Button type="submit" name="status" value="golden" variant="cta">Publish</Button> : <Button type="submit" name="status" value="review" variant="secondary">Send back to review</Button>}
              </form>
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
