import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";
import { e2eSql } from "./db";

const PROTECTED = ["/today", "/drill/00000000-0000-4000-8000-000000000000", "/mocks", "/mocks/attempt/00000000-0000-4000-8000-000000000000", "/progress", "/profile", "/leaderboard", "/onboarding", "/tpo", "/tpo/heatmap", "/tpo/students", "/tpo/at-risk", "/tpo/mocks", "/tpo/reports", "/admin/import", "/admin/batches", "/admin/college", "/content/review", "/super", "/super/audit", "/super/privacy"];

test("anon: every protected route redirects to /login; public routes are open", async ({ page }) => {
  for (const p of PROTECTED) {
    await page.goto(p);
    expect(page.url(), p).toMatch(/\/login\?next=/);
  }
  for (const p of ["/", "/login", "/privacy"]) expect((await page.goto(p))?.status(), p).toBe(200);
  for (const p of ["/tpo/students/export", "/super/privacy/export?email=x@y.in"]) {
    const r = await page.request.get(p, { maxRedirects: 0 });
    expect([302, 303, 307, 401], p).toContain(r.status());
    if (r.status() !== 401) expect(r.headers()["location"]).toMatch(/\/login/);
  }
});

test("JSON APIs: 401 when anonymous, 403 cross-origin (CSRF) for every POST route", async ({ request, baseURL }) => {
  const id = "00000000-0000-4000-8000-000000000000";
  const routes = ["/api/sync", "/api/explain", `/api/mocks/attempt/${id}/save`, `/api/mocks/attempt/${id}/submit`];
  for (const r of routes) {
    const same = await request.post(r, { data: {}, headers: { origin: new URL(baseURL!).origin } });
    expect(same.status(), `${r} anon`).toBe(401);
    const evil = await request.post(r, { data: {}, headers: { origin: "https://evil.example" } });
    expect(evil.status(), `${r} cross-origin`).toBe(403);
  }
  expect((await request.post("/api/cron/build-drills")).status()).toBe(401);
  expect((await request.post("/api/cron/weekly", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
});

test("IDOR: a student cannot open another student's drill or result", async ({ page }) => {
  const sql = e2eSql();
  const [d] = await sql`select d.id from drills d join users u on u.id = d.user_id where u.email = 'student020@demo.learncrew.in' limit 1`;
  await sql.end();
  await login(page, "student021@demo.learncrew.in");
  expect((await page.goto(`/drill/${d.id}`))?.status()).toBe(404);
  expect((await page.goto(`/drill/${d.id}/done`))?.status()).toBe(404);
});

async function noSerious(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${label}: ${v.id} — ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target}`)).toEqual([]);
}

test("axe: TPO, admin, content and superadmin screens have zero serious/critical violations", async ({ page, browser }) => {
  await page.goto("/");
  await noSerious(page, "/");
  await login(page, "tpo@demo.learncrew.in");
  for (const p of ["/tpo", "/tpo/heatmap", "/tpo/students", "/tpo/at-risk", "/tpo/mocks", "/tpo/reports", "/admin/import", "/admin/batches", "/admin/college"]) {
    await page.goto(p);
    await noSerious(page, p);
  }
  const c = await browser.newContext();
  const p2 = await c.newPage();
  await login(p2, "content@learncrew.in");
  await p2.goto("/content/review?status=golden");
  await noSerious(p2, "/content/review");
  await c.close();
  const s = await browser.newContext();
  const p3 = await s.newPage();
  await login(p3, process.env.SUPERADMIN_EMAIL ?? "founder@learncrew.in");
  for (const p of ["/super", "/super/audit", "/super/privacy"]) {
    await p3.goto(p);
    await noSerious(p3, p);
  }
  await s.close();
});

test("axe: mock intro, exam runner and result/review screens", async ({ page }) => {
  await login(page, "student015@demo.learncrew.in");
  await page.goto("/mocks");
  await page.getByTestId("mock-card").filter({ hasText: "Cognizant" }).click();
  await noSerious(page, "/mocks/[id]");
  await page.getByTestId("start-mock").click();
  await expect(page.getByTestId("mock-stem")).toBeVisible();
  await noSerious(page, "/mocks/attempt/[id]");
  await page.getByRole("radiogroup").locator("button").first().click();
  await page.getByTestId("mock-submit").click();
  await page.getByTestId("confirm-submit").click();
  await expect(page.getByTestId("mock-score")).toBeVisible();
  await noSerious(page, "/mocks/attempt/[id]/result");
});
