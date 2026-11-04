import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("pages send CSP (nonce) + hardening headers", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-powered-by"]).toBeUndefined();
  const html = await res.text();
  const nonce = h["content-security-policy"].match(/'nonce-([^']+)'/)![1];
  expect(html).toContain(`nonce="${nonce}"`);
});

test("session cookie is httpOnly + SameSite=Lax", async ({ page, context }) => {
  await login(page, "student002@demo.learncrew.in");
  const c = (await context.cookies()).find((x) => /session-token/.test(x.name));
  expect(c).toBeTruthy();
  expect(c!.httpOnly).toBe(true);
  expect(c!.sameSite).toBe("Lax");
});

test("custom JSON API rejects cross-origin / missing Origin (CSRF)", async ({ request, baseURL }) => {
  const r1 = await request.post("/api/sync", { data: { attempts: [] }, headers: { origin: "https://evil.example" } });
  expect(r1.status()).toBe(403);
  const r2 = await request.post("/api/sync", { data: { attempts: [] }, headers: { "content-type": "text/plain", origin: new URL(baseURL!).origin } });
  expect(r2.status()).toBe(403);
});
