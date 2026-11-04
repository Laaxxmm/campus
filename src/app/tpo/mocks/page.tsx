import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { staffContext } from "@/server/staff";
import { batchList } from "@/server/services/tpo";
import { collegeMocks, createMock, scheduleMock } from "@/server/services/tpo-mocks";
import { clientIp } from "@/lib/http";
import { COMPANIES, companyName } from "@/lib/companies";
import { TpoShell } from "@/components/TpoShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

async function create(formData: FormData) {
  "use server";
  const { user, collegeId } = await staffContext(String(formData.get("college") ?? "") || undefined);
  try {
    await createMock(user, collegeId, Object.fromEntries(formData), clientIp({ headers: await headers() }));
  } catch (e) {
    if (e instanceof ZodError) redirect(`/tpo/mocks?error=${encodeURIComponent(e.issues[0]?.message ?? "invalid")}`);
    throw e;
  }
  redirect("/tpo/mocks?created=1");
}
async function schedule(formData: FormData) {
  "use server";
  const { user, collegeId } = await staffContext(String(formData.get("college") ?? "") || undefined);
  try {
    const tz = (v: FormDataEntryValue | null) => (v ? `${v}:00+05:30` : ""); // datetime-local is IST
    await scheduleMock(user, collegeId, { mockId: formData.get("mockId"), batchId: formData.get("batchId"), opensAt: tz(formData.get("opensAt")), closesAt: tz(formData.get("closesAt")) }, clientIp({ headers: await headers() }));
  } catch (e) {
    redirect(`/tpo/mocks?error=${encodeURIComponent(e instanceof ZodError ? (e.issues[0]?.message ?? "invalid") : (e as Error).message)}`);
  }
  redirect("/tpo/mocks?scheduled=1");
}

export default async function TpoMocks({ searchParams }: { searchParams: Promise<{ college?: string; error?: string; created?: string; scheduled?: string }> }) {
  const sp = await searchParams;
  const { user, college, collegeId, opts } = await staffContext(sp.college);
  const [{ mocks, scheduled }, bl] = await Promise.all([collegeMocks(user, collegeId), batchList(user, opts)]);
  const sel = "mt-2 block h-11 w-full rounded-sm border border-border bg-bg px-4 text-base font-normal";
  const lbl = "block text-sm font-medium";
  const card = "h-full space-y-4 rounded-md border border-border bg-bg p-6 lg:p-8";
  return (
    <TpoShell title="Mocks" subtitle="Schedule a timed mock for a batch, or build your own from the question bank." collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/tpo/mocks", label: "Mocks" }]}>
      {sp.error && <p role="alert" className="mb-6 rounded-sm bg-danger-50 p-4 text-sm text-danger-700">{sp.error}</p>}
      {(sp.created || sp.scheduled) && <p role="status" className="mb-6 rounded-sm bg-success-50 p-4 text-sm text-ink-900">{sp.created ? "Mock created." : "Mock scheduled for the batch."}</p>}
      <div className="grid gap-6 xl:grid-cols-12">
        <form action={schedule} className={`${card} xl:col-span-5`} data-testid="schedule-form">
          <h2 className="text-base font-semibold text-ink-900">Schedule a mock for a batch</h2>
          {user.role === "superadmin" && <input type="hidden" name="college" value={collegeId} />}
          <label className={lbl}>Mock<select name="mockId" required className={sel}>{mocks.map((m) => <option key={m.id} value={m.id}>{m.title}{m.collegeId ? " (yours)" : ""}</option>)}</select></label>
          <label className={lbl}>Batch<select name="batchId" required className={sel}>{bl.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={lbl}>Opens (IST)<Input type="datetime-local" name="opensAt" required className="mt-2" /></label>
            <label className={lbl}>Closes (IST)<Input type="datetime-local" name="closesAt" required className="mt-2" /></label>
          </div>
          <Button type="submit" variant="primary" data-cta="primary">Schedule</Button>
        </form>
        <form action={create} className={`${card} xl:col-span-7`} data-testid="create-mock-form">
          <h2 className="text-base font-semibold text-ink-900">Create a custom mock</h2>
          {user.role === "superadmin" && <input type="hidden" name="college" value={collegeId} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={lbl}>Title<Input name="title" required minLength={3} maxLength={80} placeholder="Pre-drive practice — Infosys" className="mt-2" /></label>
            <label className={lbl}>Pattern<select name="company" className={sel}>{COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(["quant", "logical", "verbal", "coding"] as const).map((s) => <label key={s} className={`${lbl} capitalize`}>{s}<Input type="number" name={s} min={0} max={40} defaultValue={s === "coding" ? 0 : 5} className="mt-2" /></label>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={lbl}>Minutes<Input type="number" name="minutes" min={5} max={180} defaultValue={20} className="mt-2" /></label>
            <label className={lbl}>Negative mark<select name="negativeMark" className={sel}><option value="0">None</option><option value="0.25">−0.25</option><option value="0.33">−0.33</option><option value="0.5">−0.5</option></select></label>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="sectional" value="true" className="h-5 w-5 accent-ink-900" />Sectional timers</label>
          <Button type="submit" variant="secondary">Create mock</Button>
        </form>
      </div>
      <div className="mt-12 grid gap-12 lg:mt-16 xl:grid-cols-12 xl:gap-6">
        <section className="xl:col-span-7" aria-labelledby="scheduled-h">
          <div className="mb-6 flex items-baseline justify-between gap-4"><h2 id="scheduled-h" className="text-lg font-semibold text-ink-900">Scheduled</h2><span className="text-sm text-text-600">times in IST</span></div>
          <ul className="divide-y divide-border rounded-md border border-border bg-bg text-sm" data-testid="scheduled-list">
            {scheduled.map((s) => <li key={s.id} className="flex flex-wrap justify-between gap-2 px-6 py-4"><span className="font-medium text-ink-900">{s.mock} → {s.batch}</span><span className="tabular text-text-600">{s.opensAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} – {s.closesAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span></li>)}
            {!scheduled.length && <li className="px-6 py-4 text-text-600">Nothing scheduled.</li>}
          </ul>
        </section>
        <section className="xl:col-span-5" aria-labelledby="available-h">
          <div className="mb-6 flex items-baseline justify-between gap-4"><h2 id="available-h" className="text-lg font-semibold text-ink-900">Available mocks</h2><span className="text-sm text-text-600">{mocks.length} mocks</span></div>
          <ul className="divide-y divide-border rounded-md border border-border bg-bg text-sm">
            {mocks.map((m) => <li key={m.id} className="px-6 py-4"><div className="font-medium text-ink-900">{m.title}</div><div className="mt-2 text-text-600">{companyName(m.company)} · {Math.round(m.durationSec / 60)} min{m.negativeMark ? ` · −${m.negativeMark}` : ""}{m.collegeId ? " · custom" : ""}</div></li>)}
          </ul>
        </section>
      </div>
    </TpoShell>
  );
}
