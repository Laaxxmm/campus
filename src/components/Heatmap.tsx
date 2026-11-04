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
  days?: number;
  /** Cap the scroll area so both header row and first column stay sticky (full heatmap page). */
  tall?: boolean;
};

const LEGEND: [string, number][] = [["<30", 10], ["30–44", 40], ["45–59", 50], ["60–74", 70], ["75+", 80]];

/**
 * v4 heatmap: legend top-right, cells min 40px, sticky column headers + sticky first column,
 * scrolls inside its card (never the page) on narrow screens.
 */
export function Heatmap({ topics, rows, rowHref, rowLabel, metric = "accuracy", days = 30, tall = false }: Props) {
  const what = metric === "accuracy" ? `Accuracy % (last ${days} days)` : "Mastery 0–100 (Elo)";
  return (
    <div className="rounded-md border border-border bg-bg" data-testid="heatmap">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
        <p className="text-sm font-semibold text-ink-900">{what}</p>
        <ul className="flex flex-wrap items-center gap-4 text-xs text-text-600" aria-label="Legend">
          {LEGEND.map(([l, v]) => (
            <li key={l} className="inline-flex items-center gap-2">
              <span aria-hidden className="inline-block h-4 w-4 rounded-[4px]" style={{ background: heatColor(v) }} />
              {l}
            </li>
          ))}
          <li className="inline-flex items-center gap-2">
            <span aria-hidden className="inline-block h-4 w-4 rounded-[4px] border border-border bg-surface" />
            No data
          </li>
        </ul>
      </div>
      <div className={tall ? "max-h-[70dvh] overflow-auto" : "overflow-x-auto"} tabIndex={0} role="region" aria-label={`${what} by ${rowLabel.toLowerCase()} and topic`}>
        <table className="border-separate border-spacing-1 text-xs">
          <caption className="sr-only">
            {what} by {rowLabel} and topic
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 top-0 z-20 bg-bg px-4 py-2 text-left align-bottom text-sm font-semibold">
                {rowLabel}
              </th>
              {topics.map((t) => (
                <th key={t.id} scope="col" className="sticky top-0 z-10 h-32 min-w-10 bg-bg align-bottom font-medium text-text-600">
                  <div className="mx-auto w-4 rotate-180 whitespace-nowrap [writing-mode:vertical-rl]" title={t.name}>
                    {t.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row" className="sticky left-0 z-10 max-w-48 truncate bg-bg px-4 text-left text-sm font-medium">
                  {rowHref ? (
                    <Link href={rowHref(r.id)} className="flex min-h-11 items-center hover:underline">
                      {r.name}
                    </Link>
                  ) : (
                    r.name
                  )}
                </th>
                {r.cells.map((c, i) => (
                  <td key={topics[i].id} className="p-0">
                    <div
                      className="flex h-10 min-w-10 items-center justify-center rounded-sm text-sm tabular"
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
      </div>
    </div>
  );
}
