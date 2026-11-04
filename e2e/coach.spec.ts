import { expect, test } from "@playwright/test";
import { login } from "./helpers";
import { e2eSql } from "./db";

test("drill result ends with an insight card; 'Start focus drill' opens a focus drill; events stored", async ({ page }) => {
  await login(page, "student030@demo.learncrew.in"); // seeded with 3 weeks of history → real insights
  await page.goto("/today");
  await page.getByTestId("start-drill").click();
  for (let i = 0; i < 10; i++) {
    const opts = page.locator('footer button[data-state="idle"]');
    await opts.nth(0).click();
    await opts.nth(1).click(); // change answer once → answer_changes event
    await page.getByRole("button", { name: /check answer/i }).click();
    await page.getByRole("button", { name: i === 9 ? /finish/i : /^next$/i }).click();
  }
  await expect(page).toHaveURL(/\/done$/);
  const card = page.getByTestId("insight-card");
  await expect(card).toBeVisible();
  const sql = e2eSql();
  const [ev] = await sql`select count(*)::int n, sum(answer_changes)::int c from attempts a join users u on u.id = a.user_id join drills d on d.id = a.drill_id where u.email = 'student030@demo.learncrew.in' and d.kind = 'daily' and d.date = (select max(date) from drills where user_id = u.id and kind = 'daily')`;
  expect(ev.n).toBe(10);
  expect(ev.c).toBeGreaterThanOrEqual(10);
  if (await page.getByTestId("start-focus").count()) {
    await page.getByTestId("start-focus").click();
    await expect(page).toHaveURL(/\/drill\/[0-9a-f-]+$/);
    const [d] = await sql`select kind from drills where id = ${page.url().split("/").pop()!}`;
    expect(d.kind).toBe("focus");
  }
  await sql.end();
  await page.goto("/insights");
  await expect(page.getByTestId("insight-card")).toBeVisible();
});

test("new student: insights say 'not enough data' instead of guessing", async ({ page }) => {
  await login(page, "smoke.student@demo.learncrew.in");
  await page.goto("/insights");
  await expect(page.getByText(/first insight arrives after a drill/i)).toBeVisible();
});

test("crack-path: pick companies → readiness breakdown + round gaps → tech drill → checklist", async ({ page }) => {
  await login(page, "student031@demo.learncrew.in");
  await page.goto("/companies");
  const picker = page.getByTestId("target-picker");
  for (const name of ["TCS", "Infosys"]) await picker.getByLabel(new RegExp(name)).check();
  await picker.getByPlaceholder(/Zoho/).fill("Zoho");
  await picker.getByRole("button", { name: /save targets/i }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByTestId("company-cards").locator("li")).toHaveCount(2);
  await page.getByTestId("company-cards").locator("a").first().click();
  await expect(page.getByTestId("readiness-breakdown")).toContainText("Aptitude vs cutoff · 40%");
  await expect(page.getByTestId("rounds").locator("li").first()).toContainText(/On track|Close|Gap/);
  await expect(page.getByTestId("sources")).toContainText(/accessed 2026-11-04/);
  await page.getByTestId("tech-topics").getByRole("button", { name: "Drill" }).first().click();
  await expect(page).toHaveURL(/\/drill\/[0-9a-f-]+$/);
  await page.goBack();
  await page.getByTestId("skills-link").click();
  const comm = page.getByTestId("skill-item").filter({ hasText: "Communication" });
  if (await comm.count()) {
    await comm.locator("select").selectOption("have");
    await comm.getByPlaceholder(/evidence/).fill("Anchored college fest");
    await comm.getByRole("button", { name: "Update" }).click();
    await expect(page.getByTestId("skill-item").filter({ hasText: "Communication" })).toHaveAttribute("data-status", "have");
  }
  await expect(page.getByTestId("skill-item").first()).toBeVisible();
});

test("concept cards page renders for a tech topic", async ({ page }) => {
  await login(page, "student031@demo.learncrew.in");
  await page.goto("/learn/dbms");
  await expect(page.getByTestId("concept-cards").locator("li")).toHaveCount(5);
});
