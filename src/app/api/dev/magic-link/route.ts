import { devLinks, devLinksExposed } from "@/lib/mail";

export const dynamic = "force-dynamic";

/** Test/dev only: returns the last magic link logged for an email. 404 in production with Resend on. */
export async function GET(req: Request) {
  if (!devLinksExposed()) return new Response("Not found", { status: 404 });
  const email = new URL(req.url).searchParams.get("email")?.toLowerCase() ?? "";
  const hit = devLinks.get(email);
  if (!hit) return Response.json({ url: null }, { status: 404 });
  return Response.json({ url: hit.url, at: hit.at });
}
