import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

/** v2 limits. windowMs is a fixed window; counts are per (bucket, key, window). */
export const LIMITS = {
  login: { max: 5, windowMs: 15 * 60_000 },
  submit: { max: 120, windowMs: 60_000 },
  explain: { max: 5, windowMs: 60_000 },
  import: { max: 5, windowMs: 60 * 60_000 },
  aiGen: { max: 20, windowMs: 60 * 60_000 },
  mockSave: { max: 240, windowMs: 60_000 },
  draft: { max: 3, windowMs: 60 * 60_000 },
  upload: { max: 10, windowMs: 60 * 60_000 },
} as const;
export type Bucket = keyof typeof LIMITS;

export type LimitResult = { ok: boolean; remaining: number; resetAt: Date; count: number };

/** Atomically count one hit (or `cost` hits). Returns ok=false once over the limit. */
export async function hit(bucket: Bucket, key: string, cost = 1, now = new Date()): Promise<LimitResult> {
  const { max, windowMs } = LIMITS[bucket];
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const [row] = await db
    .insert(rateLimits)
    .values({ bucket, key, windowStart, count: cost })
    .onConflictDoUpdate({ target: [rateLimits.bucket, rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + ${cost}` } })
    .returning({ count: rateLimits.count });
  return { ok: row.count <= max, remaining: Math.max(0, max - row.count), resetAt: new Date(windowStart.getTime() + windowMs), count: row.count };
}

export function tooMany(r: LimitResult) {
  return Response.json(
    { error: "rate_limited", retryAfterSec: Math.ceil((r.resetAt.getTime() - Date.now()) / 1000) },
    { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((r.resetAt.getTime() - Date.now()) / 1000))) } },
  );
}

/** Housekeeping (weekly cron): drop windows older than a day. */
export async function pruneRateLimits() {
  await db.execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);
}
