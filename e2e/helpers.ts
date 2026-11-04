import { expect, type Page } from "@playwright/test";

export async function login(page: Page, email: string) {
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
}
