import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { staffContext } from "@/server/staff";
import { collegeSettings, updateCollege } from "@/server/services/admin";
import { clientIp } from "@/lib/http";
import { TpoShell } from "@/components/TpoShell";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/ui/layout";

export const dynamic = "force-dynamic";

async function save(formData: FormData) {
  "use server";
  const { user, collegeId } = await staffContext(String(formData.get("college") ?? "") || undefined);
  await updateCollege(user, user.role === "superadmin" ? collegeId : undefined, Object.fromEntries(formData), clientIp({ headers: await headers() }));
  redirect("/admin/college?saved=1");
}

export default async function CollegeSettings({ searchParams }: { searchParams: Promise<{ college?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { user, collegeId, opts } = await staffContext(sp.college);
  const s = await collegeSettings(user, opts.collegeId);
  const pct = Math.round((100 * s.students) / Math.max(1, s.college.seats));
  return (
    <TpoShell title="Settings" subtitle="Seats, consent and your college's details." collegeName={s.college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/admin/college", label: "Settings" }]}>
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4" data-testid="seats">
        <KpiCard label="Seats used" value={`${s.students}/${s.college.seats}`} hint={`${pct}% of plan`} tone={pct > 95 ? "bad" : "neutral"} />
        <KpiCard label="Consented" value={s.consented} hint="DPDP consent given" />
        <KpiCard label="Staff accounts" value={s.staff} />
        <KpiCard label="Plan" value={s.college.plan} hint="Contact LearnCrew to change seats" />
      </section>
      <Section title="College details" className="max-w-[720px]">
        <form action={save} className="space-y-4 rounded-md border border-border bg-bg p-6 lg:p-8">
          {user.role === "superadmin" && <input type="hidden" name="college" value={collegeId} />}
          <label className="block text-sm font-medium">College name<Input name="name" defaultValue={s.college.name} required className="mt-2 font-normal" /></label>
          <label className="block text-sm font-medium">City<Input name="city" defaultValue={s.college.city ?? ""} className="mt-2 font-normal" /></label>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button type="submit" variant="primary" data-cta="primary">Save</Button>
            {sp.saved && <p role="status" className="text-sm text-success-700">Saved.</p>}
          </div>
        </form>
      </Section>
    </TpoShell>
  );
}
