import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, LogOut, ShieldCheck, Trophy } from "lucide-react";
import { signOut } from "@/auth";
import { requireRole, requireUser } from "@/lib/authz";
import { COMPANIES } from "@/lib/companies";
import { profileFor, requestDeletion, setTargetCompany } from "@/server/services/profile";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function changeTarget(formData: FormData) {
  "use server";
  const user = requireRole(await requireUser(), ["student"]);
  await setTargetCompany(user.id, String(formData.get("target") ?? ""));
  redirect("/profile?saved=1");
}
async function askDeletion() {
  "use server";
  const user = requireRole(await requireUser(), ["student"]);
  await requestDeletion(user);
  redirect("/profile?deletion=1");
}
async function logout() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function Profile({ searchParams }: { searchParams: Promise<{ saved?: string; deletion?: string }> }) {
  const user = requireRole(await requireUser(), ["student"]);
  const p = await profileFor(user.id);
  const sp = await searchParams;
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink-900">Profile</h1>
      <section className="rounded-md border border-border bg-bg p-4">
        <p className="text-lg font-semibold">{p?.name}</p>
        <p className="text-sm text-text-600">{p?.email}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-text-600">College</dt><dd>{p?.college ?? "—"}</dd>
          <dt className="text-text-600">Batch</dt><dd>{p?.batch ?? "—"}</dd>
          <dt className="text-text-600">Roll no.</dt><dd>{p?.rollNo ?? "—"}</dd>
          <dt className="text-text-600">XP</dt><dd className="tabular">{p?.xp ?? 0}</dd>
        </dl>
      </section>
      <form action={changeTarget} className="space-y-2 rounded-md border border-border bg-bg p-4">
        <label htmlFor="target" className="block text-sm font-semibold">Target company</label>
        <select id="target" name="target" defaultValue={p?.targetCompany ?? p?.batchTarget ?? "tcs_nqt"} className="h-11 w-full rounded-sm border border-border bg-bg px-3">
          {COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button type="submit" variant="secondary" className="w-full">Save</Button>
        {sp.saved && <p role="status" className="text-sm text-success-500">Saved. Tomorrow&apos;s drill will focus on this pattern.</p>}
      </form>
      <nav className="divide-y divide-border rounded-md border border-border bg-bg">
        <Link href="/leaderboard" className="flex min-h-12 items-center gap-3 px-4"><Trophy className="h-5 w-5 text-accent-600" aria-hidden /> <span className="flex-1">Batch leaderboard</span><ChevronRight className="h-4 w-4 text-text-400" aria-hidden /></Link>
        <Link href="/privacy" className="flex min-h-12 items-center gap-3 px-4"><ShieldCheck className="h-5 w-5 text-ink-900" aria-hidden /> <span className="flex-1">Privacy &amp; your data</span><ChevronRight className="h-4 w-4 text-text-400" aria-hidden /></Link>
      </nav>
      <form action={askDeletion} className="rounded-md border border-border bg-bg p-4 text-sm">
        <p className="text-text-600">You can ask us to delete your account and practice data (DPDP Act, 2023). Your college is informed.</p>
        <Button type="submit" variant="ghost" className="mt-2 px-0 underline">Request data deletion</Button>
        {sp.deletion && <p role="status" className="text-sm text-success-500">Request recorded. We&apos;ll confirm by email within 7 days.</p>}
      </form>
      <form action={logout}>
        <Button type="submit" variant="secondary" className="w-full"><LogOut className="h-4 w-4" aria-hidden /> Sign out</Button>
      </form>
    </div>
  );
}
