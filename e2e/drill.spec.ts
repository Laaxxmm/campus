import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";
import { e2eSql } from "./db";

async function answerCurrent(page: Page) {
  await page.locator('footer button[data-state="idle"]').first().click();
  await page.getByRole("button", { name: /check answer/i }).click();
}

test("student answers 10 questions → done page shows score and streak 1", async ({ page }) => {
  await login(page, "drill.student@demo.learncrew.in");
  await expect(page).toHaveURL(/\/today/);
  await page.getByTestId("start-drill").click();
  await expect(page).toHaveURL(/\/drill\/[0-9a-f-]+$/);
  for (let i = 0; i < 10; i++) {
    await expect(page.getByText(`Question ${i + 1} of 10`)).toBeVisible();
    await answerCurrent(page);
    await expect(page.getByTestId("verdict")).toBeVisible();
    if (/not quite/i.test(await page.getByTestId("verdict").innerText())) await expect(page.getByTestId("correct-answer")).toContainText(/^Answer: [ABCD]\. /);
    await page.getByRole("button", { name: i === 9 ? /finish/i : /^next$/i }).click();
  }
  await expect(page).toHaveURL(/\/done$/);
  await expect(page.getByTestId("score")).toHaveText(/\d+\/10/);
  await expect(page.getByTestId("streak")).toContainText("1");
});

test("offline: answer 3 offline → back online → synced exactly once", async ({ page, context }) => {
  await login(page, "offline.student@demo.learncrew.in");
  await page.getByTestId("start-drill").click();
  await expect(page.getByText("Question 1 of 10")).toBeVisible();
  await context.setOffline(true);
  for (let i = 0; i < 3; i++) {
    await answerCurrent(page);
    await expect(page.getByTestId("pending-note")).toBeVisible();
    await page.getByRole("button", { name: /^next$/i }).click();
  }
  await expect(page.getByText("Question 4 of 10")).toBeVisible();
  const sql = e2eSql();
  const count = async () => (await sql`select count(*)::int n from attempts a join users u on u.id = a.user_id where u.email = 'offline.student@demo.learncrew.in'`)[0].n as number;
  expect(await count()).toBe(0);
  await context.setOffline(false);
  await expect.poll(count, { timeout: 15_000 }).toBe(3);
  // Replaying the queue (reload triggers another flush) must not duplicate.
  await page.reload();
  await page.waitForTimeout(1500);
  expect(await count()).toBe(3);
  await sql.end();
});
