import { z } from "zod";
import { studentApi } from "@/server/api";
import { MockError, saveAnswers } from "@/server/services/mocks";
import { hit, tooMany } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const Body = z.object({
  patch: z.record(
    z.string().max(40),
    z.object({ choice: z.number().int().min(0).max(3).nullable().optional(), flagged: z.boolean().optional(), visited: z.boolean().optional(), timeMsDelta: z.number().int().min(0).max(600_000).optional() }),
  ).refine((p) => Object.keys(p).length <= 200, "too many entries"),
  tabSwitchesDelta: z.number().int().min(0).max(50).default(0),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await studentApi(req);
  if ("res" in g) return g.res;
  const rl = await hit("mockSave", g.user.id);
  if (!rl.ok) return tooMany(rl);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  try {
    const { id } = await params;
    return Response.json(await saveAnswers(g.user, id, parsed.data.patch, parsed.data.tabSwitchesDelta));
  } catch (e) {
    if (e instanceof MockError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
