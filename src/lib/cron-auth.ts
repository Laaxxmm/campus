import { timingSafeEqual } from "node:crypto";

/** Bearer CRON_SECRET check (constant-time). */
export function cronAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !got) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}
