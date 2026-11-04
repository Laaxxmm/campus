import { z } from "zod";
import { GradeError, gradeAttempt } from "@/lib/drill";
import { studentApi } from "@/server/api";
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
  const g = await studentApi(req);
  if ("res" in g) return g.res;
  const user = g.user;
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
