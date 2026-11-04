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
  const sel = "mt-1 block h-11 w-full rounded-sm border border-border bg-bg px-3";
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      <label className="text-sm">Name<Input name="name" required defaultValue={b?.name} className="mt-1" /></label>
      <label className="text-sm">Grad year<Input name="gradYear" type="number" min={2020} max={2040} defaultValue={b?.gradYear ?? ""} className="mt-1" /></label>
      <label className="text-sm">Branch<Input name="branch" defaultValue={b?.branch ?? ""} className="mt-1" /></label>
      <label className="text-sm">Target company<select name="targetCompany" defaultValue={b?.targetCompany ?? ""} className={sel}><option value="">—</option>{COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="text-sm">Drive date<Input name="targetDriveDate" type="date" defaultValue={b?.targetDriveDate ?? ""} className="mt-1" /></label>
    </div>
  );
}

export default async function Batches({ searchParams }: { searchParams: Promise<{ college?: string; error?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { user, college, collegeId, opts } = await staffContext(sp.college);
  const bl = await batchList(user, opts);
  return (
    <TpoShell title="Batches" collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/admin/batches", label: "Batches" }]}>
      {sp.error && <p role="alert" className="mb-4 rounded-sm bg-danger-50 p-3 text-sm text-danger-700">{sp.error}</p>}
      {sp.saved && <p role="status" className="mb-4 rounded-sm bg-success-50 p-3 text-sm">Saved.</p>}
      <ul className="space-y-3">
        {bl.map((b) => (
          <li key={b.id}>
            <form action={save} className="rounded-md border border-border bg-bg p-4">
              <input type="hidden" name="id" value={b.id} />
              {user.role === "superadmin" && <input type="hidden" name="college" value={collegeId} />}
              <div className="mb-2 flex items-center justify-between"><span className="font-semibold text-ink-900">{b.name}</span><span className="text-sm text-text-600">{b.students} students</span></div>
              <BatchFields b={b} />
              <Button type="submit" variant="secondary" className="mt-3">Save</Button>
            </form>
          </li>
        ))}
      </ul>
      <form action={save} className="mt-6 rounded-md border border-dashed border-border bg-bg p-4">
        <h2 className="mb-2 font-semibold text-ink-900">New batch</h2>
        {user.role === "superadmin" && <input type="hidden" name="college" value={collegeId} />}
        <BatchFields />
        <Button type="submit" className="mt-3">Create batch</Button>
      </form>
    </TpoShell>
  );
}
