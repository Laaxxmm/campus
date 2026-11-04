/** Security headers (pure, unit-tested). CSP uses a per-request nonce set by middleware. */
export function buildCsp(nonce: string, opts: { dev: boolean }) {
  const script = [`'self'`, `'nonce-${nonce}'`, `'strict-dynamic'`, ...(opts.dev ? [`'unsafe-eval'`] : [])];
  return [
    `default-src 'self'`,
    `script-src ${script.join(" ")}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self'${opts.dev ? " ws:" : ""}`,
    `manifest-src 'self'`,
    `worker-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ].join("; ");
}

export function staticSecurityHeaders(opts: { https: boolean }): Record<string, string> {
  return {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    ...(opts.https ? { "Strict-Transport-Security": "max-age=63072000; includeSubDomains" } : {}),
  };
}

export function makeNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
