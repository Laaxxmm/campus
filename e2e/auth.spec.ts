import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("new student: magic link → onboarding (consent) → today", async ({ page }) => {
  await login(page, "newstudent@demo.learncrew.in");
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole("button", { name: /start practising/i }).click();
  await expect(page.getByText(/tick consent/i)).toBeVisible();
  await page.getByLabel(/I agree/i).check();
  await page.getByRole("button", { name: /start practising/i }).click();
  await expect(page).toHaveURL(/\/today/);
});

test("student cannot open /tpo", async ({ page }) => {
  await login(page, "student001@demo.learncrew.in");
  await expect(page).toHaveURL(/\/today/);
  const res = await page.goto("/tpo");
  expect(res?.status()).toBe(403);
  await expect(page.getByText(/not allowed/i)).toBeVisible();
});

test("unknown email is rejected", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/college email/i).fill("stranger@gmail.com");
  await page.getByRole("button", { name: /send login link/i }).click();
  await expect(page.getByText(/isn.t registered/i)).toBeVisible();
});

test("anonymous is redirected to login", async ({ page }) => {
  await page.goto("/today");
  await expect(page).toHaveURL(/\/login/);
});
