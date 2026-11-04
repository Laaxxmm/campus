import Link from "next/link";
import { staffContext } from "@/server/staff";
import { batchList, branchList, heatmap, HEAT_WINDOWS } from "@/server/services/tpo";
import { COMPANIES } from "@/lib/companies";
import { TpoShell } from "@/components/TpoShell";
import { Heatmap } from "@/components/Heatmap";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const selectCls = "h-11 w-full rounded-sm border border-border bg-bg px-4 text-sm text-text-900";

export default async function HeatmapPage({ searchParams }: { searchParams: Promise<{ college?: string; company?: string; batch?: string; metric?: string; branch?: string; days?: string }> }) {
  const sp = await searchParams;
  const { user, college, opts } = await staffContext(sp.college);
  const [bl, branches] = await Promise.all([batchList(user, opts), branchList(user, opts)]);
  const batch = bl.find((b) => b.id === sp.batch) ?? null; // ignore ids from other colleges
  const h = await heatmap(user, { ...opts, company: sp.company, batchId: batch?.id, metric: sp.metric === "mastery" ? "mastery" : "accuracy", branch: sp.branch, days: Number(sp.days) || undefined });
  const keep = (extra: Record<string, string>) => {
    const q = new URLSearchParams({ metric: h.metric, days: String(h.days), ...(h.company ? { company: h.company } : {}), ...(h.branch ? { branch: h.branch } : {}), ...(sp.college ? { college: sp.college } : {}), ...extra });
    return `/tpo/heatmap?${q}`;
  };
  return (
    <TpoShell
      title={batch ? `Heatmap — ${batch.name}` : "Heatmap"}
      subtitle={h.company ? `Topics ordered by ${h.companyName} weight; sections it doesn't test are hidden.` : "Where each batch is strong and weak, topic by topic."}
      collegeName={college.name}
      crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/tpo/heatmap", label: "Heatmap" }]}
    >
      {/* Filter bar: sticky under the page header */}
      <form method="get" className="no-print sticky top-0 z-30 -mx-4 mb-6 border-b border-border bg-surface/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" data-testid="heatmap-filters">
        {sp.college && <input type="hidden" name="college" value={sp.college} />}
        <div className="grid grid-cols-2 items-end gap-4 md:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Rows
            <select name="batch" defaultValue={batch?.id ?? ""} className={selectCls}>
              <option value="">All batches</option>
              {bl.map((b) => (
                <option key={b.id} value={b.id}>
                  Students in {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Branch
            <select name="branch" defaultValue={h.branch ?? ""} className={selectCls}>
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Company pattern
            <select name="company" defaultValue={h.company ?? ""} className={selectCls}>
              <option value="">All topics</option>
              {COMPANIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Dates
            <select name="days" defaultValue={String(h.days)} className={selectCls} disabled={h.metric === "mastery"} aria-describedby={h.metric === "mastery" ? "days-note" : undefined}>
              {HEAT_WINDOWS.map((d) => (
                <option key={d} value={d}>
                  Last {d} days
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Measure
            <select name="metric" defaultValue={h.metric} className={selectCls}>
              <option value="accuracy">Accuracy</option>
              <option value="mastery">Mastery (long-term)</option>
            </select>
          </label>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="secondary">
              Apply
            </Button>
            {(h.company || batch || h.branch || h.days !== 30) && (
              <Link href="/tpo/heatmap" className="inline-flex h-11 items-center px-4 text-sm font-semibold text-info-500 hover:underline">
                Reset
              </Link>
            )}
          </div>
        </div>
        {h.metric === "mastery" && (
          <p id="days-note" className="mt-2 text-xs text-text-600">
            Mastery is long-term, so the date window doesn&apos;t apply.
          </p>
        )}
      </form>
      <Heatmap
        tall
        topics={h.topics}
        rows={h.rows}
        metric={h.metric}
        days={h.days}
        rowLabel={h.byStudent ? "Student" : "Batch"}
        rowHref={(id) => (h.byStudent ? `/tpo/students/${id}` : keep({ batch: id }))}
      />
    </TpoShell>
  );
}
