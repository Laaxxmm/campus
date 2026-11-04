import { z } from "zod";
import { studentApi } from "@/server/api";
import { MockError, submitMock } from "@/server/services/mocks";

export const dynamic = "force-dynamic";
const Body = z.object({ auto: z.boolean().default(false) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await studentApi(req);
  if ("res" in g) return g.res;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  try {
    const { id } = await params;
    return Response.json(await submitMock(g.user, id, { auto: parsed.data.auto }));
  } catch (e) {
    if (e instanceof MockError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
