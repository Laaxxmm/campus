import { requireRole, requireUser } from "@/lib/authz";
import { auditFor } from "@/lib/audit";
import { AdminShell } from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default async function AuditLog() {
  const user = requireRole(await requireUser(), ["superadmin"]);
  const rows = await auditFor(null, 300);
  return (
    <AdminShell title="Audit log" subtitle="Append-only record of every TPO/admin change. Latest 300." role={user.role}>
      <div className="max-h-[70vh] overflow-auto rounded-md border border-border bg-bg" tabIndex={0} role="region" aria-label="Audit entries">
        <table className="w-full text-sm" data-testid="audit-table">
          <thead className="sticky top-0 bg-surface text-left text-xs font-medium uppercase tracking-wide text-text-600"><tr><th scope="col" className="px-4 py-2">When (IST)</th><th scope="col" className="px-4 py-2">Action</th><th scope="col" className="px-4 py-2">Target</th><th scope="col" className="px-4 py-2">Actor</th><th scope="col" className="px-4 py-2">Details</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="whitespace-nowrap px-4 py-2 tabular">{r.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-4 py-2 text-xs">{r.targetType} {r.targetId?.slice(0, 8)}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.actorId?.slice(0, 8)}</td>
                <td className="max-w-md truncate px-4 py-2 font-mono text-xs text-text-600" title={JSON.stringify(r.meta)}>{r.meta ? JSON.stringify(r.meta) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
