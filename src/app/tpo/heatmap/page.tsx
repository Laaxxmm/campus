import Link from "next/link";
import { staffContext } from "@/server/staff";
import { batchList, heatmap } from "@/server/services/tpo";
import { COMPANIES } from "@/lib/companies";
import { TpoShell } from "@/components/TpoShell";
import { Heatmap } from "@/components/Heatmap";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function HeatmapPage({ searchParams }: { searchParams: Promise<{ college?: string; company?: string; batch?: string; metric?: string }> }) {
  const sp = await searchParams;
  const { user, college, opts } = await staffContext(sp.college);
  const bl = await batchList(user, opts);
  const batch = bl.find((b) => b.id === sp.batch) ?? null; // ignore ids from other colleges
  const h = await heatmap(user, { ...opts, company: sp.company, batchId: batch?.id, metric: sp.metric === "mastery" ? "mastery" : "accuracy" });
  return (
    <TpoShell title={batch ? `Heatmap — ${batch.name}` : "Heatmap"} collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/tpo/heatmap", label: "Heatmap" }]}>
      <form className="no-print mb-4 flex flex-wrap items-end gap-4" method="get">
        <label className="text-sm">Company pattern
          <select name="company" defaultValue={h.company ?? ""} className="mt-2 block h-11 rounded-sm border border-border bg-bg px-4">
            <option value="">All topics</option>
            {COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-sm">Rows
          <select name="batch" defaultValue={batch?.id ?? ""} className="mt-2 block h-11 rounded-sm border border-border bg-bg px-4">
            <option value="">Batches</option>
            {bl.map((b) => <option key={b.id} value={b.id}>Students in {b.name}</option>)}
          </select>
        </label>
        <label className="text-sm">Measure
          <select name="metric" defaultValue={h.metric} className="mt-2 block h-11 rounded-sm border border-border bg-bg px-4">
            <option value="accuracy">Accuracy (30 days)</option>
            <option value="mastery">Mastery (long-term)</option>
          </select>
        </label>
        <Button type="submit" variant="secondary">Apply</Button>
        {(h.company || batch) && <Link href="/tpo/heatmap" className="pb-4 text-sm text-info-500 underline">Reset</Link>}
      </form>
      {h.company && <p className="mb-4 text-sm text-text-600">Topics ordered by {h.companyName} weight; sections it doesn&apos;t test are hidden.</p>}
      <Heatmap topics={h.topics} rows={h.rows} metric={h.metric} rowLabel={h.byStudent ? "Student" : "Batch"} rowHref={(id) => (h.byStudent ? `/tpo/students/${id}` : `/tpo/heatmap?batch=${id}&metric=${h.metric}${h.company ? `&company=${h.company}` : ""}`)} />
    </TpoShell>
  );
}
