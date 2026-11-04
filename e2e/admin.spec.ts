import { expect, test } from "@playwright/test";
import { login } from "./helpers";
import { e2eSql } from "./db";

test("roster import: seat limit blocks 200 rows; malformed file reports errors, imports valid rows; re-import adds 0", async ({ page }) => {
  await login(page, "admin@demo.learncrew.in");
  await page.goto("/admin/import");
  await page.getByTestId("csv-input").setInputFiles("fixtures/roster-200.csv");
  await expect(page.getByTestId("import-preview")).toContainText("200 new");
  await expect(page.getByText(/exceed your seat limit/)).toBeVisible();
  await expect(page.getByTestId("confirm-import")).toBeDisabled();

  await page.getByTestId("csv-input").setInputFiles("fixtures/roster-bad.csv");
  await expect(page.getByTestId("error-count")).toHaveText("7 with errors");
  await expect(page.getByTestId("import-preview")).toContainText('unknown batch "2030 MECH"');
  await expect(page.getByTestId("import-preview")).toContainText("email is registered with another college");
  await page.getByTestId("confirm-import").click();
  await expect(page.getByTestId("import-result")).toContainText("2 new");
  await expect(page.getByTestId("import-preview")).toContainText("2 unchanged");
  await expect(page.getByTestId("confirm-import")).toBeDisabled();

  const sql = e2eSql();
  const [{ n }] = await sql`select count(*)::int n from users where email in ('asha.varma@demo.learncrew.in','comma.name@demo.learncrew.in')`;
  const [{ a }] = await sql`select count(*)::int a from audit_logs where action = 'roster.import'`;
  await sql.end();
  expect(n).toBe(2);
  expect(a).toBeGreaterThanOrEqual(1);
});

test("batches + seats pages render for college admin", async ({ page }) => {
  await login(page, "admin@demo.learncrew.in");
  await page.goto("/admin/college");
  await expect(page.getByTestId("seats")).toContainText("Seats used");
  await page.goto("/admin/batches");
  await expect(page.getByText("2027 CSE-A")).toBeVisible();
});

test("content reviewer approves a draft; it becomes golden", async ({ page }) => {
  const sql = e2eSql();
  await sql`update questions set status = 'draft' where id = 'Q-QNT-PCT-0002'`;
  await login(page, "content@learncrew.in");
  await page.goto("/content/review?status=draft");
  const item = page.getByTestId("review-item").filter({ hasText: "Q-QNT-PCT-0002" });
  await item.getByTestId("approve").click();
  await expect(page.getByText("Done: approve.")).toBeVisible();
  const [q] = await sql`select status from questions where id = 'Q-QNT-PCT-0002'`;
  await sql.end();
  expect(q.status).toBe("golden");
});

test("superadmin creates a college + TPO invite (fresh login), sees it in audit log; TPO cannot open /super", async ({ page, browser }) => {
  await login(page, process.env.SUPERADMIN_EMAIL ?? "founder@learncrew.in");
  await expect(page).toHaveURL(/\/super$/);
  await expect(page.getByTestId("reauth")).toHaveCount(0); // just signed in
  const name = `E2E College ${Date.now()}`;
  const f = page.getByTestId("create-college");
  await f.locator('input[name="name"]').fill(name);
  await f.locator('input[name="tpoName"]').fill("Tara Iyer");
  await f.locator('input[name="tpoEmail"]').fill(`tara.${Date.now()}@e2e-college.in`);
  await f.getByRole("button", { name: /create college/i }).click();
  await expect(page.getByText("College created and TPO invited.")).toBeVisible();
  await expect(page.getByTestId("colleges")).toContainText(name);
  await page.goto("/super/audit");
  await expect(page.getByTestId("audit-table")).toContainText("college.create");

  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await login(p2, "tpo@demo.learncrew.in");
  expect((await p2.goto("/super"))?.status()).toBe(403);
  expect((await p2.goto("/content/review"))?.status()).toBe(403);
  await ctx.close();
});
