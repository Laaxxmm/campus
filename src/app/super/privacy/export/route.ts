import { ForbiddenError, requireRole, requireUser, UnauthorizedError } from "@/lib/authz";
import { clientIp } from "@/lib/http";
import { exportStudent, ReauthRequired } from "@/server/services/super";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let user;
  try {
    user = requireRole(await requireUser({ redirect: false }), ["superadmin"]);
  } catch (e) {
    if (e instanceof UnauthorizedError) return new Response("Unauthorized", { status: 401 });
    if (e instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw e;
  }
  const email = new URL(req.url).searchParams.get("email") ?? "";
  try {
    const data = await exportStudent(user, email, clientIp(req));
    if (!data) return new Response("Not found", { status: 404 });
    return new Response(JSON.stringify(data, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="learncrew-export-${data.profile.id}.json"`, "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof ReauthRequired) return new Response(e.message, { status: 403 });
    throw e;
  }
}
