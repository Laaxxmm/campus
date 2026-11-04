import { describe, expect, it } from "vitest";
import { buildCsp, makeNonce, staticSecurityHeaders } from "@/lib/security-headers";
import { csrfGuard, sameOrigin } from "@/lib/http";
import { parseEnv } from "@/env";

describe("security headers", () => {
  it("CSP has nonce, strict-dynamic, no unsafe-eval in prod, frame-ancestors none", () => {
    const csp = buildCsp("abc", { dev: false });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
  it("static headers incl HSTS only on https", () => {
    expect(staticSecurityHeaders({ https: true })["Strict-Transport-Security"]).toMatch(/max-age=\d+/);
    expect(staticSecurityHeaders({ https: false })["Strict-Transport-Security"]).toBeUndefined();
    expect(staticSecurityHeaders({ https: false })["X-Frame-Options"]).toBe("DENY");
  });
  it("nonces are unique base64", () => {
    const a = makeNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/=]{20,}$/);
    expect(a).not.toBe(makeNonce());
  });
});

describe("CSRF guard", () => {
  const req = (h: Record<string, string>) => new Request("http://app.test/api/sync", { method: "POST", headers: h });
  it("accepts same-origin JSON", () => {
    expect(sameOrigin(req({ origin: "http://app.test", host: "app.test" }))).toBe(true);
    expect(csrfGuard(req({ origin: "http://app.test", host: "app.test", "content-type": "application/json" }))).toBeNull();
  });
  it("rejects cross-origin, missing origin, and non-JSON", () => {
    expect(csrfGuard(req({ origin: "https://evil.example", host: "app.test", "content-type": "application/json" }))?.status).toBe(403);
    expect(csrfGuard(req({ host: "app.test", "content-type": "application/json" }))?.status).toBe(403);
    expect(csrfGuard(req({ origin: "http://app.test", host: "app.test", "content-type": "text/plain" }))?.status).toBe(403);
  });
});

describe("env", () => {
  it("fails fast without DATABASE_URL", () => {
    expect(() => parseEnv({ NODE_ENV: "development" })).toThrow(/DATABASE_URL/);
  });
  it("production requires AUTH_SECRET and CRON_SECRET", () => {
    expect(() => parseEnv({ NODE_ENV: "production", DATABASE_URL: "postgres://x" })).toThrow(/AUTH_SECRET[\s\S]*CRON_SECRET/);
    expect(parseEnv({ NODE_ENV: "production", DATABASE_URL: "postgres://x", AUTH_SECRET: "x".repeat(32), CRON_SECRET: "y".repeat(16) }).NODE_ENV).toBe("production");
  });
});
