import { requireUser, UnauthorizedError, type SessionUser } from "@/lib/authz";
import { csrfGuard } from "@/lib/http";

/** Shared guard for student JSON routes: CSRF origin check → session → role. */
export async function studentApi(req: Request): Promise<{ user: SessionUser } | { res: Response }> {
  const bad = csrfGuard(req);
  if (bad) return { res: bad };
  try {
    const user = await requireUser({ redirect: false });
    if (user.role !== "student") return { res: Response.json({ error: "forbidden" }, { status: 403 }) };
    return { user };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { res: Response.json({ error: "unauthorized" }, { status: 401 }) };
    throw e;
  }
}
