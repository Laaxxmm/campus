import Link from "next/link";

export function heatColor(m: number) {
  if (m < 30) return "var(--heat-0)";
  if (m < 45) return "var(--heat-1)";
  if (m < 60) return "var(--heat-2)";
  if (m < 75) return "var(--heat-3)";
  return "var(--heat-4)";
}

type Props = {
  topics: { id: string; name: string; section: string }[];
  rows: { id: string; name: string; cells: ({ mastery: number; n: number } | null)[] }[];
  rowHref?: (id: string) => string;
  rowLabel: string;
  metric?: "accuracy" | "mastery";
};

/** Topic × batch (or student) mastery grid. Scrolls horizontally on mobile; first column sticky. */
export function Heatmap({ topics, rows, rowHref, rowLabel, metric = "accuracy" }: Props) {
  const what = metric === "accuracy" ? "Accuracy % (last 30 days)" : "Mastery 0–100 (Elo)";
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-bg" data-testid="heatmap">
      <table className="border-collapse text-xs">
        <caption className="sr-only">{what} by {rowLabel} and topic</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-bg px-3 py-2 text-left font-semibold">{rowLabel}</th>
            {topics.map((t) => (
              <th key={t.id} scope="col" className="h-28 min-w-9 align-bottom font-medium text-text-600">
                <div className="mx-auto w-4 rotate-180 whitespace-nowrap [writing-mode:vertical-rl]" title={t.name}>{t.name}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <th scope="row" className="sticky left-0 z-10 max-w-44 truncate bg-bg px-3 py-1.5 text-left font-medium">
                {rowHref ? <Link href={rowHref(r.id)} className="hover:underline">{r.name}</Link> : r.name}
              </th>
              {r.cells.map((c, i) => (
                <td key={topics[i].id} className="p-0.5">
                  <div
                    className="flex h-8 min-w-8 items-center justify-center rounded-sm tabular"
                    style={{ background: c ? heatColor(c.mastery) : "var(--surface)", color: "var(--text-900)" }}
                    title={c ? `${topics[i].name}: ${c.mastery}${metric === "accuracy" ? "%" : ""} (${c.n} student${c.n === 1 ? "" : "s"})` : `${topics[i].name}: no data`}
                  >
                    {c ? c.mastery : "·"}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-2 text-[11px] text-text-600">
        <span>{what}:</span>
        {[["<30", 10], ["30–44", 40], ["45–59", 50], ["60–74", 70], ["75+", 80]].map(([l, v]) => (
          <span key={l} className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: heatColor(v as number) }} />{l}</span>
        ))}
      </div>
    </div>
  );
}
