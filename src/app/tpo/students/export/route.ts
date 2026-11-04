import { requireUser, UnauthorizedError, ForbiddenError, requireRole } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { track } from "@/lib/events";
import { clientIp } from "@/lib/http";
import { studentRows } from "@/server/services/tpo";
import { studentsCsv } from "@/server/services/tpo-export";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let user;
  try {
    user = requireRole(await requireUser({ redirect: false }), ["tpo", "admin"]);
  } catch (e) {
    if (e instanceof UnauthorizedError) return new Response("Unauthorized", { status: 401 });
    if (e instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw e;
  }
  const url = new URL(req.url);
  const collegeId = user.role === "superadmin" ? url.searchParams.get("college") ?? undefined : undefined;
  if (user.role === "superadmin" && !collegeId) return new Response("college required", { status: 400 });
  const batchId = url.searchParams.get("batch") ?? undefined;
  const rows = await studentRows(user, { collegeId, batchId });
  await audit(user, "export.students_csv", { type: "college", id: collegeId ?? user.collegeId ?? undefined, collegeId: collegeId ?? user.collegeId, meta: { rows: rows.length, batchId: batchId ?? null }, ip: clientIp(req) });
  await track("tpo_export", { userId: user.id, collegeId: collegeId ?? user.collegeId, props: { rows: rows.length } });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(studentsCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="learncrew-students-${date}.csv"`,
      "cache-control": "no-store",
    },
  });
}
