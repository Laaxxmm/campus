import Link from "next/link";
import { staffContext } from "@/server/staff";
import { AT_RISK_DAYS, AT_RISK_READINESS, batchList, nudgeText, studentRows } from "@/server/services/tpo";
import { TpoShell } from "@/components/TpoShell";
import { CopyButton } from "@/components/tpo/CopyButton";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function AtRisk({ searchParams }: { searchParams: Promise<{ college?: string }> }) {
  const { user, college, opts } = await staffContext((await searchParams).college);
  const [rows, bl] = await Promise.all([studentRows(user, opts), batchList(user, opts)]);
  const app = process.env.APP_BASE_URL ?? "https://app.learncrew.in";
  const risk = rows.filter((r) => r.atRisk).sort((a, b) => (b.inactiveDays ?? 999) - (a.inactiveDays ?? 999));
  const drive = new Map(bl.map((b) => [b.id, b.targetDriveDate]));
  const all = risk.map((r) => `${r.name}: ${nudgeText(r, app, r.batchId ? drive.get(r.batchId) : null)}`).join("\n\n");
  return (
    <TpoShell title="At-risk students" collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/tpo/at-risk", label: "At risk" }]} actions={risk.length ? <CopyButton text={all} label={`Copy all ${risk.length} nudges`} /> : null}>
      <p className="mb-4 text-sm text-text-600">No drill for {AT_RISK_DAYS}+ days, or readiness below {AT_RISK_READINESS}. Copy a message and send it from your phone — LearnCrew never messages students on its own.</p>
      {risk.length === 0 ? (
        <EmptyState title="Nobody at risk" body="Everyone has practised recently and is above the readiness bar." />
      ) : (
        <ul className="space-y-2" data-testid="at-risk-list">
          {risk.map((r) => {
            const msg = nudgeText(r, app, r.batchId ? drive.get(r.batchId) : null);
            return (
              <li key={r.id} className="flex flex-col gap-2 rounded-md border border-border bg-bg p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <Link href={`/tpo/students/${r.id}`} className="font-medium text-ink-900 hover:underline">{r.name}</Link>
                  <span className="ml-2 text-xs text-text-600">{r.batch} · {r.atRiskReasons.join(" · ")}</span>
                  <p className="mt-2 text-xs text-text-600">{msg}</p>
                </div>
                <CopyButton text={msg} />
              </li>
            );
          })}
        </ul>
      )}
    </TpoShell>
  );
}
