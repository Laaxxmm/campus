import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireRole, requireUser } from "@/lib/authz";
import { clientIp } from "@/lib/http";
import { createCollege, listColleges, ReauthRequired, recentlyAuthenticated } from "@/server/services/super";
import { AdminShell } from "@/components/AdminShell";
import { ReauthNotice } from "@/components/admin/Reauth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

async function create(formData: FormData) {
  "use server";
  const user = requireRole(await requireUser(), ["superadmin"]);
  try {
    await createCollege(user, Object.fromEntries(formData), clientIp({ headers: await headers() }));
  } catch (e) {
    const msg = e instanceof ZodError ? `${e.issues[0]?.path.join(".")}: ${e.issues[0]?.message}` : e instanceof ReauthRequired ? e.message : (e as Error).message;
    redirect(`/super?error=${encodeURIComponent(msg)}`);
  }
  redirect("/super?created=1");
}

export default async function Super({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const user = requireRole(await requireUser(), ["superadmin"]);
  const sp = await searchParams;
  const [list, fresh] = await Promise.all([listColleges(user), recentlyAuthenticated(user.id)]);
  return (
    <AdminShell title="Colleges" role={user.role}>
      {!fresh && <ReauthNotice back="/super" />}
      {sp.error && <p role="alert" className="mb-3 rounded-sm bg-danger-50 p-3 text-sm text-danger-500">{sp.error}</p>}
      {sp.created && <p role="status" className="mb-3 rounded-sm bg-success-50 p-3 text-sm">College created and TPO invited.</p>}
      <div className="overflow-x-auto rounded-md border border-border bg-bg">
        <table className="w-full text-sm" data-testid="colleges">
          <thead className="bg-surface text-left text-xs text-text-600"><tr><th className="px-3 py-2">College</th><th className="px-3 py-2">Plan</th><th className="px-3 py-2 text-right">Students / seats</th><th className="px-3 py-2 text-right">Active 7d</th><th className="px-3 py-2 text-right">Drills 7d</th><th className="px-3 py-2" /></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2"><div className="font-medium">{c.name}</div><div className="text-xs text-text-600">{c.city}</div></td>
                <td className="px-3 py-2">{c.plan}</td>
                <td className="px-3 py-2 text-right tabular">{c.students}/{c.seats}</td>
                <td className="px-3 py-2 text-right tabular">{c.active7}</td>
                <td className="px-3 py-2 text-right tabular">{c.drills7}</td>
                <td className="px-3 py-2 text-right"><Link href={`/tpo?college=${c.id}`} className="text-info-500 underline">Open dashboard</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={create} className="mt-6 max-w-2xl space-y-3 rounded-md border border-border bg-bg p-4" data-testid="create-college">
        <h2 className="font-semibold text-ink-900">New college</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-sm">Name<Input name="name" required className="mt-1" /></label>
          <label className="text-sm">City<Input name="city" className="mt-1" /></label>
          <label className="text-sm">Seats<Input name="seats" type="number" min={10} defaultValue={200} className="mt-1" /></label>
          <label className="text-sm">Plan<select name="plan" defaultValue="pilot" className="mt-1 block h-11 w-full rounded-sm border border-border bg-bg px-3"><option>pilot</option><option>starter</option><option>placement</option><option>premium</option></select></label>
          <label className="text-sm">First TPO name<Input name="tpoName" required className="mt-1" /></label>
          <label className="text-sm">First TPO email<Input name="tpoEmail" type="email" required className="mt-1" /></label>
        </div>
        <Button type="submit" variant="cta">Create college + invite TPO</Button>
      </form>
    </AdminShell>
  );
}
