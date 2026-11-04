import { expect, test } from "@playwright/test";
import { login } from "./helpers";
import { e2eSql } from "./db";

test("TPO lands on /tpo with non-empty KPIs, heatmap and nudge list", async ({ page }) => {
  await login(page, "tpo@demo.learncrew.in");
  await expect(page).toHaveURL(/\/tpo$/);
  await expect(page.getByTestId("kpis")).toContainText("Weekly active");
  await expect(page.getByTestId("heatmap").locator("tbody tr")).toHaveCount(2);
  await page.getByRole("link", { name: "Heatmap" }).first().click();
  await page.selectOption('select[name="company"]', "infosys");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(/ordered by Infosys weight/)).toBeVisible();
});

test("students table filters, drill-down works, CSV export has Excel-ready headers", async ({ page }) => {
  await login(page, "tpo@demo.learncrew.in");
  await page.goto("/tpo/students");
  const rows = page.getByTestId("students-table").locator("tbody tr");
  expect(await rows.count()).toBeGreaterThanOrEqual(40);
  await page.getByPlaceholder(/name, email/i).fill("student001");
  await expect(rows).toHaveCount(1);
  await rows.first().getByRole("link").click();
  await expect(page.getByText("Topic mastery (weakest first)")).toBeVisible();
  const res = await page.request.get("/tpo/students/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect(res.headers()["content-disposition"]).toMatch(/attachment; filename="learncrew-students-/);
  const body = await res.text();
  expect(body.charCodeAt(0)).toBe(0xfeff);
  expect(body.split("\r\n")[0]).toContain("Name,Email,Roll no,Batch,Target company");
  expect(body).not.toContain("@sample.learncrew.in"); // other college never exported
});

test("cross-college isolation: TPO A opening a student of college B by URL → 404", async ({ page }) => {
  const sql = e2eSql();
  const [b] = await sql`select id from users where email = 'student001@sample.learncrew.in'`;
  await sql.end();
  await login(page, "tpo@demo.learncrew.in");
  const res = await page.goto(`/tpo/students/${b.id}`);
  expect(res?.status()).toBe(404);
  const csv = await (await page.request.get(`/tpo/students/export?batch=${b.id}`)).text();
  expect(csv.trim().split("\r\n")).toHaveLength(1); // header only
});

test("at-risk page offers copyable WhatsApp nudges; weekly report renders; TPO schedules a mock that students see", async ({ page, browser }) => {
  await login(page, "tpo@demo.learncrew.in");
  await page.goto("/tpo/at-risk");
  await expect(page.getByTestId("at-risk-list").locator("li").first()).toContainText(/Hi \w+,/);
  await page.goto("/tpo/reports");
  await expect(page.getByTestId("narrative")).toContainText(/students practised/);
  await page.goto("/tpo/mocks");
  const form = page.getByTestId("schedule-form");
  await form.locator('select[name="mockId"]').selectOption({ label: "Wipro practice mock" });
  await form.locator('select[name="batchId"]').selectOption({ label: "2027 CSE-A" });
  const fmt = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16);
  await form.locator('input[name="opensAt"]').fill(fmt(new Date(Date.now() - 3600_000)));
  await form.locator('input[name="closesAt"]').fill(fmt(new Date(Date.now() + 2 * 86_400_000)));
  await form.getByRole("button", { name: "Schedule" }).click();
  await expect(page.getByText("Mock scheduled for the batch.")).toBeVisible();
  await expect(page.getByTestId("scheduled-list")).toContainText("Wipro practice mock → 2027 CSE-A");
  const sql = e2eSql();
  const audits = await sql`select action from audit_logs where action = 'mock.schedule'`;
  await sql.end();
  expect(audits.length).toBeGreaterThanOrEqual(1);

  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const p2 = await ctx.newPage();
  await login(p2, "student001@demo.learncrew.in"); // batch 2027 CSE-A
  await p2.goto("/mocks");
  await expect(p2.getByText(/Your TPO scheduled 1 mock/)).toBeVisible();
  await ctx.close();
});

test("TPO of the other college sees only their own students", async ({ page }) => {
  await login(page, "tpo@sample.learncrew.in");
  await page.goto("/tpo/students");
  const text = await page.getByTestId("students-table").innerText();
  expect(text).not.toContain("demo.learncrew.in");
  expect(await page.getByTestId("students-table").locator("tbody tr").count()).toBe(10);
});
