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
    <AdminShell title="Company profiles" subtitle="Profiles are compiled from public sources. Before a pilot, open each source and confirm rounds and cutoffs; send a profile back to review to hide it from students." role={user.role}>
      <ul className="grid gap-6 xl:grid-cols-2" data-testid="company-review">
        {rows.map((p) => {
          const cut = p.cutoffs as CompanyProfile["cutoffs"];
          return (
            <li key={p.key} className="flex h-full flex-col rounded-md border border-border bg-bg p-6 lg:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-ink-900">{p.name} <span className="text-xs font-normal text-text-600">v{p.version} · updated {p.updatedAt}</span></h2>
                <Badge tone={p.status === "golden" ? "success" : "warn"}>{p.status === "golden" ? "live" : p.status}</Badge>
              </div>
              <p className="mt-4 text-sm text-text-900">Cutoff: {cut.aptitude_percent ?? "not published"} — <span className="text-text-600">{cut.note}</span></p>
              <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-text-600">Sources</h3>
              <ul className="mt-2 text-sm">
                {(p.sources as CompanyProfile["sources"]).map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-ink-900 underline hover:text-info-500">{s.title}</a> <span className="text-text-600">· {s.kind}</span></li>)}
              </ul>
              <form action={setStatus} className="mt-auto flex gap-2 pt-6">
                <input type="hidden" name="key" value={p.key} />
                {p.status !== "golden" ? <Button type="submit" name="status" value="golden" variant="secondary">Publish</Button> : <Button type="submit" name="status" value="review" variant="ghost">Send back to review</Button>}
              </form>
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
