import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { staffContext } from "@/server/staff";
import { batchList } from "@/server/services/tpo";
import { createBatch, updateBatch } from "@/server/services/admin";
import { clientIp } from "@/lib/http";
import { COMPANIES } from "@/lib/companies";
import { TpoShell } from "@/components/TpoShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/ui/layout";

export const dynamic = "force-dynamic";

async function save(formData: FormData) {
  "use server";
  const { user, collegeId } = await staffContext(String(formData.get("college") ?? "") || undefined);
  const id = String(formData.get("id") ?? "");
  const data = Object.fromEntries(formData);
  const ip = clientIp({ headers: await headers() });
  try {
    if (id) await updateBatch(user, user.role === "superadmin" ? collegeId : undefined, id, data, ip);
    else await createBatch(user, user.role === "superadmin" ? collegeId : undefined, data, ip);
  } catch (e) {
    redirect(`/admin/batches?error=${encodeURIComponent(e instanceof ZodError ? `${e.issues[0]?.path.join(".")}: ${e.issues[0]?.message}` : (e as Error).message)}`);
  }
  redirect("/admin/batches?saved=1");
}

function BatchFields({ b }: { b?: { name: string; gradYear: number | null; branch: string | null; targetCompany: string | null; targetDriveDate: string | null } }) {
  const sel = "mt-2 block h-11 w-full rounded-sm border border-border bg-bg px-4 text-base font-normal";
  const lbl = "text-sm font-medium";
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      <label className={lbl}>Name<Input name="name" required defaultValue={b?.name} className="mt-2 font-normal" /></label>
      <label className={lbl}>Grad year<Input name="gradYear" type="number" min={2020} max={2040} defaultValue={b?.gradYear ?? ""} className="mt-2 font-normal" /></label>
      <label className={lbl}>Branch<Input name="branch" defaultValue={b?.branch ?? ""} className="mt-2 font-normal" /></label>
      <label className={lbl}>Target company<select name="targetCompany" defaultValue={b?.targetCompany ?? ""} className={sel}><option value="">—</option>{COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className={lbl}>Drive date<Input name="targetDriveDate" type="date" defaultValue={b?.targetDriveDate ?? ""} className="mt-2 font-normal" /></label>
    </div>
  );
}

export default async function Batches({ searchParams }: { searchParams: Promise<{ college?: string; error?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { user, college, collegeId, opts } = await staffContext(sp.college);
  const bl = await batchList(user, opts);
  return (
    <TpoShell title="Batches" subtitle="Set each batch’s target company and drive date. Drive dates are quoted in at-risk nudges." collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/admin/batches", label: "Batches" }]}>
      {sp.error && <p role="alert" className="mb-6 rounded-sm bg-danger-50 p-4 text-sm text-danger-700">{sp.error}</p>}
      {sp.saved && <p role="status" className="mb-6 rounded-sm bg-success-50 p-4 text-sm text-ink-900">Saved.</p>}
      <Section className="mt-0 lg:mt-0" title="Your batches" meta={`${bl.length} ${bl.length === 1 ? "batch" : "batches"}`}>
        <ul className="space-y-4">
          {bl.map((b) => (
            <li key={b.id}>
              <form action={save} className="rounded-md border border-border bg-bg p-6 lg:p-8">
                <input type="hidden" name="id" value={b.id} />
                {user.role === "superadmin" && <input type="hidden" name="college" value={collegeId} />}
                <div className="mb-4 flex items-baseline justify-between gap-4"><span className="text-base font-semibold text-ink-900">{b.name}</span><span className="text-sm text-text-600"><span className="tabular">{b.students}</span> students</span></div>
                <BatchFields b={b} />
                <Button type="submit" variant="secondary" className="mt-4">Save</Button>
              </form>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="New batch">
        <form action={save} className="rounded-md border border-dashed border-border bg-bg p-6 lg:p-8">
          {user.role === "superadmin" && <input type="hidden" name="college" value={collegeId} />}
          <BatchFields />
          <Button type="submit" variant="primary" className="mt-4" data-cta="primary">Create batch</Button>
        </form>
      </Section>
    </TpoShell>
  );
}
