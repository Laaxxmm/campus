import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, FileUser, LogOut, ShieldCheck, TrendingUp, Trophy } from "lucide-react";
import { signOut } from "@/auth";
import { requireRole, requireUser } from "@/lib/authz";
import { COMPANIES } from "@/lib/companies";
import { profileFor, requestDeletion, setTargetCompany } from "@/server/services/profile";
import { StudentPage } from "@/components/StudentPage";
import { Section } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <StudentPage title="Profile">
      <Section>
        <div className="space-y-6">
          <Card>
            <p className="text-lg font-semibold text-text-900">{p?.name}</p>
            <p className="mt-2 text-base text-text-600">{p?.email}</p>
            <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-base">
              <dt className="text-text-600">College</dt>
              <dd className="text-text-900">{p?.college ?? "—"}</dd>
              <dt className="text-text-600">Batch</dt>
              <dd className="text-text-900">{p?.batch ?? "—"}</dd>
              <dt className="text-text-600">Roll no.</dt>
              <dd className="text-text-900">{p?.rollNo ?? "—"}</dd>
              <dt className="text-text-600">XP</dt>
              <dd className="font-semibold text-text-900 tabular">{p?.xp ?? 0}</dd>
            </dl>
          </Card>
          <form action={changeTarget} className="rounded-md border border-border bg-bg p-6 lg:p-8">
            <div className="flex flex-col gap-2">
              <label htmlFor="target" className="text-sm font-medium text-text-900">
                Target company
              </label>
              <select id="target" name="target" defaultValue={p?.targetCompany ?? p?.batchTarget ?? "tcs_nqt"} className="h-11 w-full rounded-sm border border-border bg-bg px-4 text-base">
                {COMPANIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="primary" className="mt-4 w-full" data-cta="primary">
              Save
            </Button>
            {sp.saved && (
              <p role="status" className="mt-4 text-sm text-success-700">
                Saved. Tomorrow&apos;s drill will focus on this pattern.
              </p>
            )}
          </form>
        </div>
      </Section>
      <Section>
        <nav aria-label="Profile" className="divide-y divide-border overflow-hidden rounded-md border border-border bg-bg">
          <Link href="/profile-coach" className="flex min-h-14 items-center gap-4 px-6 hover:bg-surface lg:px-8"><FileUser className="h-5 w-5 text-ink-900" aria-hidden /> <span className="flex-1">Profile coach (resume + LinkedIn)</span><ChevronRight className="h-4 w-4 text-text-600" aria-hidden /></Link>
          <Link href="/progress" className="flex min-h-14 items-center gap-4 px-6 hover:bg-surface lg:px-8"><TrendingUp className="h-5 w-5 text-ink-900" aria-hidden /> <span className="flex-1">Progress &amp; topic mastery</span><ChevronRight className="h-4 w-4 text-text-600" aria-hidden /></Link>
          <Link href="/leaderboard" className="flex min-h-14 items-center gap-4 px-6 hover:bg-surface lg:px-8"><Trophy className="h-5 w-5 text-accent-600" aria-hidden /> <span className="flex-1">Batch leaderboard</span><ChevronRight className="h-4 w-4 text-text-600" aria-hidden /></Link>
          <Link href="/privacy" className="flex min-h-14 items-center gap-4 px-6 hover:bg-surface lg:px-8"><ShieldCheck className="h-5 w-5 text-ink-900" aria-hidden /> <span className="flex-1">Privacy &amp; your data</span><ChevronRight className="h-4 w-4 text-text-600" aria-hidden /></Link>
        </nav>
      </Section>
      <Section>
        <div className="space-y-6">
          <form action={askDeletion} className="rounded-md border border-border bg-bg p-6 text-base lg:p-8">
            <p className="text-text-600">You can ask us to delete your account and practice data (DPDP Act, 2023). Your college is informed.</p>
            <Button type="submit" variant="ghost" className="mt-2 px-0 underline hover:bg-transparent">
              Request data deletion
            </Button>
            {sp.deletion && (
              <p role="status" className="mt-2 text-sm text-success-700">
                Request recorded. We&apos;ll confirm by email within 7 days.
              </p>
            )}
          </form>
          <form action={logout}>
            <Button type="submit" variant="secondary" className="w-full">
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </Button>
          </form>
        </div>
      </Section>
    </StudentPage>
  );
}
