import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireRole, requireUser } from "@/lib/authz";
import { clientIp } from "@/lib/http";
import { createCollege, listColleges, ReauthRequired, recentlyAuthenticated } from "@/server/services/super";
import { AdminShell } from "@/components/AdminShell";
import { ReauthNotice } from "@/components/admin/Reauth";
import { Button, buttonVariants } from "@/components/ui/button";
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

const lbl = "block text-sm font-medium";

export default async function Super({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const user = requireRole(await requireUser(), ["superadmin"]);
  const sp = await searchParams;
  const [list, fresh] = await Promise.all([listColleges(user), recentlyAuthenticated(user.id)]);
  return (
    <AdminShell title="Colleges" subtitle={`${list.length} ${list.length === 1 ? "college" : "colleges"} on LearnCrew`} role={user.role}>
      {!fresh && <ReauthNotice back="/super" />}
      {sp.error && <p role="alert" className="mb-6 rounded-sm bg-danger-50 p-4 text-sm text-danger-700">{sp.error}</p>}
      {sp.created && <p role="status" className="mb-6 rounded-sm bg-success-50 p-4 text-sm text-ink-900">College created and TPO invited.</p>}
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="h-full overflow-x-auto rounded-md border border-border bg-bg xl:col-span-8" tabIndex={0} role="region" aria-label="Colleges">
          <table className="w-full min-w-[640px] text-sm" data-testid="colleges">
            <thead className="sticky top-0 bg-surface text-left text-xs font-medium uppercase tracking-wide text-text-600"><tr><th scope="col" className="px-4 py-2">College</th><th scope="col" className="px-4 py-2">Plan</th><th scope="col" className="px-4 py-2 text-right">Students / seats</th><th scope="col" className="px-4 py-2 text-right">Active 7d</th><th scope="col" className="px-4 py-2 text-right">Drills 7d</th><th scope="col" className="px-4 py-2"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-2"><div className="font-medium text-ink-900">{c.name}</div><div className="text-xs text-text-600">{c.city}</div></td>
                  <td className="px-4 py-2">{c.plan}</td>
                  <td className="px-4 py-2 text-right tabular">{c.students}/{c.seats}</td>
                  <td className="px-4 py-2 text-right tabular">{c.active7}</td>
                  <td className="px-4 py-2 text-right tabular">{c.drills7}</td>
                  <td className="px-4 py-2 text-right"><Link href={`/tpo?college=${c.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>Open dashboard</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={create} className="space-y-4 rounded-md border border-border bg-bg p-6 lg:p-8 xl:col-span-4" data-testid="create-college">
          <h2 className="text-base font-semibold text-ink-900">New college</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <label className={lbl}>Name<Input name="name" required className="mt-2 font-normal" /></label>
            <label className={lbl}>City<Input name="city" className="mt-2 font-normal" /></label>
            <label className={lbl}>Seats<Input name="seats" type="number" min={10} defaultValue={200} className="mt-2 font-normal" /></label>
            <label className={lbl}>Plan<select name="plan" defaultValue="pilot" className="mt-2 block h-11 w-full rounded-sm border border-border bg-bg px-4 text-base font-normal"><option>pilot</option><option>starter</option><option>placement</option><option>premium</option></select></label>
            <label className={lbl}>First TPO name<Input name="tpoName" required className="mt-2 font-normal" /></label>
            <label className={lbl}>First TPO email<Input name="tpoEmail" type="email" required className="mt-2 font-normal" /></label>
          </div>
          <Button type="submit" variant="cta" className="w-full" data-cta="primary">Create college + invite TPO</Button>
        </form>
      </div>
    </AdminShell>
  );
}
