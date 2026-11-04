import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/authz";
import { GradeError, gradeAttempt } from "@/lib/drill";
import { csrfGuard } from "@/lib/http";
import { hit, tooMany } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const Body = z.object({
  attempts: z
    .array(
      z.object({
        clientId: z.string().min(1).max(80),
        drillId: z.string().uuid(),
        questionId: z.string().min(1).max(40),
        displayedIndex: z.number().int().min(0).max(3).nullable(),
        timeMs: z.number().int().min(0).max(24 * 3600_000),
      }),
    )
    .max(50),
});

/** Offline attempt sync. Idempotent per (user, clientId); safe to retry. */
export async function POST(req: Request) {
  const bad = csrfGuard(req);
  if (bad) return bad;
  let user;
  try {
    user = await requireUser({ redirect: false });
  } catch (e) {
    if (e instanceof UnauthorizedError) return Response.json({ error: "unauthorized" }, { status: 401 });
    throw e;
  }
  if (user.role !== "student") return Response.json({ error: "forbidden" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });

  const rl = await hit("submit", user.id, Math.max(1, parsed.data.attempts.length));
  if (!rl.ok) return tooMany(rl);

  const results = [];
  for (const a of parsed.data.attempts) {
    try {
      results.push({ clientId: a.clientId, ok: true, result: await gradeAttempt(user.id, a) });
    } catch (e) {
      if (e instanceof GradeError) results.push({ clientId: a.clientId, ok: false, status: e.status, error: e.message });
      else {
        console.error("[sync]", e);
        results.push({ clientId: a.clientId, ok: false, status: 500 });
      }
    }
  }
  return Response.json({ results });
}
