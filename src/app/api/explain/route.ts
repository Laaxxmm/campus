import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { studentApi } from "@/server/api";
import { ExplainError, explainMore } from "@/server/services/explain";
import { hit, tooMany } from "@/lib/rate-limit";
import { track } from "@/lib/events";

export const dynamic = "force-dynamic";
const Body = z.object({ questionId: z.string().min(1).max(40), chosenDisplayed: z.number().int().min(0).max(3).nullable().optional() });

export async function POST(req: Request) {
  const g = await studentApi(req);
  if ("res" in g) return g.res;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const rl = await hit("explain", g.user.id);
  if (!rl.ok) return tooMany(rl);
  try {
    const r = await explainMore(g.user.id, parsed.data.questionId);
    await track("explain_more", { userId: g.user.id, collegeId: g.user.collegeId, props: { questionId: parsed.data.questionId, cached: r.cached } });
    return Response.json(r);
  } catch (e) {
    if (e instanceof ExplainError) return Response.json({ error: e.message }, { status: e.status });
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "Busy — try again in a minute" }, { status: 503 });
    if (e instanceof Anthropic.APIError) return Response.json({ error: "Couldn't load right now" }, { status: 502 });
    throw e;
  }
}
