/**
 * Smoke suite — runs locally (default) or against a deployment:
 *   BASE_URL=https://staging.example.in SMOKE_STUDENT=... SMOKE_TPO=... npx playwright test e2e/smoke.spec.ts --project=desktop
 * Login needs ALLOW_DEV_LOGIN_LINKS=true on that (staging) deployment.
 */
import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const STUDENT = process.env.SMOKE_STUDENT ?? "smoke.student@demo.learncrew.in";
const TPO = process.env.SMOKE_TPO ?? "tpo@demo.learncrew.in";

test("smoke: health, landing, login page", async ({ request, page }) => {
  const h = await request.get("/api/health");
  expect(h.status()).toBe(200);
  expect(await h.json()).toEqual({ ok: true, db: true });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ready");
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /send login link/i })).toBeVisible();
});

test("smoke: student completes a drill end to end", async ({ page }) => {
  await login(page, STUDENT);
  await page.goto("/today");
  const card = page.getByTestId("drill-card");
  await expect(card).toBeVisible();
  if (await page.getByTestId("start-drill").count()) {
    await page.getByTestId("start-drill").click();
    for (let i = 0; i < 10; i++) {
      if (await page.getByTestId("score").count()) break;
      await page.locator('footer button[data-state="idle"]').first().click();
      await page.getByRole("button", { name: /check answer/i }).click();
      await page.getByRole("button", { name: /^(next|finish)$/i }).click();
    }
    await expect(page).toHaveURL(/\/done$/);
  }
  await expect(page.getByTestId("score").or(page.getByText(/Done for today/))).toBeVisible();
});

test("smoke: TPO dashboard, CSV export, cross-college 404", async ({ page }) => {
  await login(page, TPO);
  await page.goto("/tpo");
  await expect(page.getByTestId("kpis")).toBeVisible();
  const csv = await page.request.get("/tpo/students/export");
  expect(csv.status()).toBe(200);
  expect((await csv.text()).split("\r\n")[0]).toContain("Name,Email");
  const r = await page.goto("/tpo/students/00000000-0000-4000-8000-000000000000");
  expect(r?.status()).toBe(404);
});
