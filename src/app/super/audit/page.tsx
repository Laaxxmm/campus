import { requireRole, requireUser } from "@/lib/authz";
import { auditFor } from "@/lib/audit";
import { AdminShell } from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default async function AuditLog() {
  const user = requireRole(await requireUser(), ["superadmin"]);
  const rows = await auditFor(null, 300);
  return (
    <AdminShell title="Audit log" role={user.role}>
      <p className="mb-3 text-sm text-text-600">Append-only record of every TPO/admin change. Latest 300.</p>
      <div className="overflow-x-auto rounded-md border border-border bg-bg">
        <table className="w-full text-sm" data-testid="audit-table">
          <thead className="bg-surface text-left text-xs text-text-600"><tr><th className="px-3 py-2">When (IST)</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Target</th><th className="px-3 py-2">Actor</th><th className="px-3 py-2">Details</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="whitespace-nowrap px-3 py-2">{r.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-3 py-2 text-xs">{r.targetType} {r.targetId?.slice(0, 8)}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.actorId?.slice(0, 8)}</td>
                <td className="max-w-md truncate px-3 py-2 font-mono text-xs text-text-600" title={JSON.stringify(r.meta)}>{r.meta ? JSON.stringify(r.meta) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
