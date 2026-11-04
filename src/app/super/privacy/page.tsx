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
  const lbl = "block text-sm font-medium";
  const card = "flex h-full flex-col gap-4 rounded-md border border-border bg-bg p-6 lg:p-8";
  return (
    <AdminShell title="Data requests (DPDP)" subtitle="Export or permanently delete a student's data on request." role={user.role}>
      {!fresh && <ReauthNotice back="/super/privacy" />}
      {sp.error && <p role="alert" className="mb-6 rounded-sm bg-danger-50 p-4 text-sm text-danger-700">{sp.error}</p>}
      {sp.deleted && <p role="status" className="mb-6 rounded-sm bg-success-50 p-4 text-sm text-ink-900">Student and all practice data deleted.</p>}
      <section aria-labelledby="requests-h">
        <div className="mb-6 flex items-baseline justify-between gap-4"><h2 id="requests-h" className="text-lg font-semibold text-ink-900">Deletion requests from students</h2><span className="text-sm text-text-600"><span className="tabular">{reqs.length}</span> pending</span></div>
        <ul className="divide-y divide-border rounded-md border border-border bg-bg text-sm">
          {reqs.map((r, i) => <li key={i} className="flex flex-wrap justify-between gap-2 px-6 py-4"><span className="text-ink-900">{r.name} · {r.email} · {r.college}</span><span className="tabular text-text-600">{r.at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span></li>)}
          {!reqs.length && <li className="px-6 py-4 text-text-600">No pending requests.</li>}
        </ul>
      </section>
      <div className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-2">
        <form method="get" action="/super/privacy/export" className={card}>
          <h2 className="text-base font-semibold text-ink-900">Export a student&apos;s data</h2>
          <p className="text-sm text-text-600">Downloads the student’s profile and practice data as a JSON file.</p>
          <label className={lbl}>Student email<Input name="email" type="email" required className="mt-2 font-normal" /></label>
          <div className="mt-auto pt-2"><Button type="submit" variant="secondary">Download JSON</Button></div>
        </form>
        <form action={erase} className={card}>
          <h2 className="text-base font-semibold text-ink-900">Delete a student</h2>
          <p className="text-sm text-text-600">Removes the account, answers, drills, mocks, streaks and readiness. Analytics events are de-identified. This cannot be undone.</p>
          <label className={lbl}>Student email<Input name="email" type="email" required className="mt-2 font-normal" /></label>
          <label className={lbl}>Type DELETE to confirm<Input name="confirm" required className="mt-2 font-normal" /></label>
          <div className="mt-auto pt-2"><Button type="submit" variant="danger">Delete permanently</Button></div>
        </form>
      </div>
    </AdminShell>
  );
}
