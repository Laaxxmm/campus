import { dbHealthy } from "@/server/services/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await dbHealthy();
  return Response.json({ ok, db: ok }, { status: ok ? 200 : 503 });
}
