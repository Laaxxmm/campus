"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import type { StudentRow } from "@/server/services/tpo";
import { buttonVariants } from "@/components/ui/button";

type Key = "name" | "batch" | "streak" | "xp" | "drills7" | "accuracy30" | "readiness" | "inactiveDays";
const COLS: { key: Key; label: string; num?: boolean }[] = [
  { key: "name", label: "Student" },
  { key: "batch", label: "Batch" },
  { key: "streak", label: "Streak", num: true },
  { key: "drills7", label: "Drills 7d", num: true },
  { key: "accuracy30", label: "Accuracy 30d", num: true },
  { key: "readiness", label: "Readiness", num: true },
  { key: "xp", label: "XP", num: true },
  { key: "inactiveDays", label: "Last active", num: true },
];

export function StudentsTable({ rows, batches }: { rows: StudentRow[]; batches: { id: string; name: string }[] }) {
  const [q, setQ] = useState("");
  const [batch, setBatch] = useState("");
  const [risk, setRisk] = useState(false);
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => (!batch || r.batchId === batch) && (!risk || r.atRisk) && (!needle || `${r.name} ${r.email} ${r.rollNo ?? ""}`.toLowerCase().includes(needle)))
      .sort((a, b) => {
        const x = a[sort.key], y = b[sort.key];
        if (x === y) return 0;
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        return (x < y ? -1 : 1) * sort.dir;
      });
  }, [rows, q, batch, risk, sort]);
  const exportHref = `/tpo/students/export${batch ? `?batch=${batch}` : ""}`;
  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-end gap-4">
        <label className="text-sm font-medium">Search<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or roll no." className="mt-2 block h-11 w-64 rounded-sm border border-border bg-bg px-4 text-base font-normal" /></label>
        <label className="text-sm font-medium">Batch
          <select value={batch} onChange={(e) => setBatch(e.target.value)} className="mt-2 block h-11 min-w-48 rounded-sm border border-border bg-bg px-4 text-base font-normal">
            <option value="">All batches</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={risk} onChange={(e) => setRisk(e.target.checked)} className="h-5 w-5 accent-ink-900" />At risk only</label>
        <a href={exportHref} className={buttonVariants({ variant: "primary", className: "ml-auto" })} data-testid="export-csv" data-cta="primary">Export CSV</a>
      </div>
      <p className="mb-2 text-sm text-text-600" aria-live="polite"><span className="tabular">{shown.length}</span> of <span className="tabular">{rows.length}</span> students</p>
      <div className="max-h-[70vh] overflow-auto rounded-md border border-border bg-bg" tabIndex={0} role="region" aria-label="Students">
        <table className="w-full min-w-[760px] text-sm" data-testid="students-table">
          <thead className="sticky top-0 z-10 bg-surface text-left text-xs text-text-600">
            <tr>
              {COLS.map((c) => (
                <th key={c.key} scope="col" className={`px-4 py-2 ${c.num ? "text-right" : ""}`} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                  <button type="button" onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (s.dir === 1 ? -1 : 1) : c.num ? -1 : 1 }))} className="inline-flex min-h-9 items-center gap-1 font-semibold uppercase tracking-wide hover:text-ink-900">
                    {c.label}<ArrowDownUp aria-hidden className="h-3 w-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2"><Link href={`/tpo/students/${r.id}`} className="font-medium text-ink-900 hover:underline">{r.name}</Link><div className="text-xs text-text-600">{r.rollNo ?? r.email}</div></td>
                <td className="px-4 py-2">{r.batch ?? "—"}</td>
                <td className="px-4 py-2 text-right tabular">{r.streak}</td>
                <td className="px-4 py-2 text-right tabular">{r.drills7}</td>
                <td className="px-4 py-2 text-right tabular">{r.accuracy30 === null ? "—" : `${r.accuracy30}%`}</td>
                <td className={`px-4 py-2 text-right tabular ${r.readiness !== null && r.readiness < 40 ? "font-semibold text-danger-500" : ""}`}>{r.readiness ?? "—"}</td>
                <td className="px-4 py-2 text-right tabular">{r.xp}</td>
                <td className="px-4 py-2 text-right tabular">{r.inactiveDays === null ? "never" : r.inactiveDays === 0 ? "today" : `${r.inactiveDays}d ago`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
