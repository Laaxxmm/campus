/** CSRF defence for custom JSON routes: same-origin Origin header + JSON content type (forces CORS preflight cross-site). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    const o = new URL(origin);
    if (host && o.host === host) return true;
    const base = process.env.APP_BASE_URL || process.env.AUTH_URL;
    return Boolean(base && new URL(base).host === o.host);
  } catch {
    return false;
  }
}
export function isJson(req: Request) {
  return (req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json");
}
/** Returns a 403 Response when the request fails CSRF checks, else null. */
export function csrfGuard(req: Request): Response | null {
  if (!sameOrigin(req) || !isJson(req)) return Response.json({ error: "forbidden (origin)" }, { status: 403 });
  return null;
}
export function clientIp(req: Request | { headers: Headers }) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
