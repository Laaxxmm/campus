import { cronAuthorized } from "@/lib/cron-auth";
import { buildDrills } from "@/server/services/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!cronAuthorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await buildDrills());
}
export const GET = POST;
