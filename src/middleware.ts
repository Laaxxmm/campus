import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { homeFor, rolesFor } from "@/lib/routes";
import { buildCsp, makeNonce, staticSecurityHeaders } from "@/lib/security-headers";

const dev = process.env.NODE_ENV !== "production";
const https = (process.env.AUTH_URL ?? process.env.APP_BASE_URL ?? "").startsWith("https://");

function withSecurity(res: NextResponse, csp: string) {
  res.headers.set("Content-Security-Policy", csp);
  for (const [k, v] of Object.entries(staticSecurityHeaders({ https }))) res.headers.set(k, v);
  return res;
}

const guard = (requestHeaders: Headers) => auth((req) => {
  const { pathname, search } = req.nextUrl;
  const roles = rolesFor(pathname)!;
  const user = req.auth?.user;
  if (!user?.id) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (!roles.includes(user.role)) return NextResponse.rewrite(new URL("/403", req.nextUrl), { status: 403, request: { headers: requestHeaders } });
  if (user.role === "student" && !user.consentAt && !pathname.startsWith("/onboarding")) return NextResponse.redirect(new URL("/onboarding", req.nextUrl));
  if (user.role === "student" && user.consentAt && pathname.startsWith("/onboarding")) return NextResponse.redirect(new URL(homeFor("student", true), req.nextUrl));
  return undefined;
});

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const nonce = makeNonce();
  const csp = buildCsp(nonce, { dev });
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp); // Next reads this to nonce its own scripts

  if (rolesFor(req.nextUrl.pathname)) {
    const r = (await (guard(requestHeaders) as unknown as (r: NextRequest, e: NextFetchEvent) => Promise<Response | undefined>)(req, ev)) as NextResponse | undefined;
    if (r && (r.status >= 300 || r.headers.get("x-middleware-rewrite"))) return withSecurity(r, csp);
  }
  return withSecurity(NextResponse.next({ request: { headers: requestHeaders } }), csp);
}

export const config = {
  runtime: "nodejs",
  matcher: [{ source: "/((?!_next/static|_next/image|icons/|sw.js|offline.html|manifest.webmanifest|favicon.ico|api/).*)" }],
};
