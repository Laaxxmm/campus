import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/authz";
import { clientIp } from "@/lib/http";
import { deleteStudent, deletionRequests, ReauthRequired, recentlyAuthenticated } from "@/server/services/super";
import { AdminShell } from "@/components/AdminShell";
import { ReauthNotice } from "@/components/admin/Reauth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

async function erase(formData: FormData) {
  "use server";
  const user = requireRole(await requireUser(), ["superadmin"]);
  const email = String(formData.get("email") ?? "");
  if (String(formData.get("confirm")) !== "DELETE") redirect("/super/privacy?error=Type%20DELETE%20to%20confirm");
  let ok = false;
  try {
    ok = await deleteStudent(user, email, clientIp({ headers: await headers() }));
  } catch (e) {
    redirect(`/super/privacy?error=${encodeURIComponent(e instanceof ReauthRequired ? e.message : (e as Error).message)}`);
  }
  redirect(ok ? "/super/privacy?deleted=1" : "/super/privacy?error=No%20student%20with%20that%20email");
}

export default async function Privacy({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string }> }) {
  const user = requireRole(await requireUser(), ["superadmin"]);
  const sp = await searchParams;
  const [reqs, fresh] = await Promise.all([deletionRequests(user), recentlyAuthenticated(user.id)]);
  return (
    <AdminShell title="Data requests (DPDP)" role={user.role}>
      {!fresh && <ReauthNotice back="/super/privacy" />}
      {sp.error && <p role="alert" className="mb-4 rounded-sm bg-danger-50 p-4 text-sm text-danger-700">{sp.error}</p>}
      {sp.deleted && <p role="status" className="mb-4 rounded-sm bg-success-50 p-4 text-sm">Student and all practice data deleted.</p>}
      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-ink-900">Deletion requests from students</h2>
        <ul className="divide-y divide-border rounded-md border border-border bg-bg text-sm">
          {reqs.map((r, i) => <li key={i} className="flex flex-wrap justify-between gap-2 px-4 py-2"><span>{r.name} · {r.email} · {r.college}</span><span className="text-text-600">{r.at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span></li>)}
          {!reqs.length && <li className="px-4 py-2 text-text-600">No pending requests.</li>}
        </ul>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <form method="get" action="/super/privacy/export" className="space-y-2 rounded-md border border-border bg-bg p-4">
          <h2 className="font-semibold text-ink-900">Export a student&apos;s data</h2>
          <label className="block text-sm">Student email<Input name="email" type="email" required className="mt-2" /></label>
          <Button type="submit" variant="secondary">Download JSON</Button>
        </form>
        <form action={erase} className="space-y-2 rounded-md border border-border bg-bg p-4">
          <h2 className="font-semibold text-ink-900">Delete a student</h2>
          <p className="text-xs text-text-600">Removes the account, answers, drills, mocks, streaks and readiness. Analytics events are de-identified. This cannot be undone.</p>
          <label className="block text-sm">Student email<Input name="email" type="email" required className="mt-2" /></label>
          <label className="block text-sm">Type DELETE to confirm<Input name="confirm" required className="mt-2" /></label>
          <Button type="submit" variant="danger">Delete permanently</Button>
        </form>
      </div>
    </AdminShell>
  );
}
