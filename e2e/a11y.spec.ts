import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { login } from "./helpers";

async function noSerious(page: import("@playwright/test").Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${label}: ${v.id} — ${v.help} (${v.nodes.length})`)).toEqual([]);
}

test("axe: login + student screens have zero serious/critical violations", async ({ page }) => {
  await page.goto("/login");
  await noSerious(page, "/login");
  await login(page, "student003@demo.learncrew.in");
  for (const path of ["/today", "/progress", "/profile", "/leaderboard", "/mocks"]) {
    await page.goto(path);
    await noSerious(page, path);
  }
  await page.goto("/today");
  await page.getByTestId("start-drill").click();
  await expect(page.getByTestId("stem")).toBeVisible();
  await noSerious(page, "/drill");
});

test("PWA: manifest is valid + service worker serves offline shell and cached drill", async ({ page, context }) => {
  const m = await (await page.request.get("/manifest.webmanifest")).json();
  expect(m.display).toBe("standalone");
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  await login(page, "student004@demo.learncrew.in");
  await page.goto("/today");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // now controlled by the SW
  await page.getByTestId("start-drill").click();
  await expect(page.getByTestId("stem")).toBeVisible();
  const drillUrl = page.url();
  await page.waitForTimeout(500);
  await context.setOffline(true);
  await page.goto(drillUrl);
  await expect(page.getByTestId("stem")).toBeVisible();
  await page.goto("/leaderboard"); // never visited → offline shell
  await expect(page.getByRole("heading", { name: /you.re offline/i })).toBeVisible();
  await context.setOffline(false);
});
