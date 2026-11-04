import { expect, type Page } from "@playwright/test";

type Cookie = Awaited<ReturnType<ReturnType<Page["context"]>["cookies"]>>[number];
// One real magic-link login per email per run (the app rate-limits logins to 5 / 15 min per ip+email);
// later tests reuse that database session cookie.
const sessions = new Map<string, Cookie[]>();

export async function login(page: Page, email: string, opts: { fresh?: boolean } = {}) {
  const cached = sessions.get(email);
  if (cached && !opts.fresh) {
    await page.context().addCookies(cached);
    await page.goto("/home");
    if (!page.url().includes("/login")) return;
  }
  await page.goto("/login");
  await page.getByLabel(/college email/i).fill(email);
  await page.getByRole("button", { name: /send login link/i }).click();
  await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible();
  const res = await page.request.get(`/api/dev/magic-link?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
  const { url } = (await res.json()) as { url: string };
  // Links are minted for AUTH_URL; keep the test's origin.
  const u = new URL(url);
  await page.goto(u.pathname + u.search);
  const c = (await page.context().cookies()).filter((x) => /session-token/.test(x.name));
  if (c.length) sessions.set(email, c);
}
