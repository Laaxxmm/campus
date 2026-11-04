import { signIn } from "@/auth";
import { sameOrigin } from "@/lib/http";
import { devLinks, devLinksExposed } from "@/lib/mail";

export const dynamic = "force-dynamic";

/**
 * Dev/demo only: one-click login for seeded accounts (404 in production unless ALLOW_DEV_LOGIN_LINKS=true).
 * Must be a route handler, not a server action: a server-action redirect to the Auth.js callback is followed
 * server-side, which consumes the token without the browser ever receiving the session cookie.
 */
export async function POST(req: Request) {
  if (!devLinksExposed()) return new Response("Not found", { status: 404 });
  if (!sameOrigin(req)) return new Response("Forbidden", { status: 403 });
  const email = String((await req.formData()).get("email") ?? "").trim().toLowerCase();
  const base = new URL(req.url);
  devLinks.delete(email);
  try {
    await signIn("resend", { email, redirect: false, redirectTo: "/home" });
  } catch {
    // invite-only signIn callback rejects unknown emails; fall through to the error redirect
  }
  const link = devLinks.get(email);
  const to = link ? new URL(link.url) : new URL("/login?error=not_invited", base);
  return Response.redirect(new URL(to.pathname + to.search, base), 303);
}
