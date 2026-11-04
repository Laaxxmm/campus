import { expect, test } from "@playwright/test";
import { login } from "./helpers";
import { e2eSql } from "./db";

test("profile coach: consent → resume upload → checklist (text not stored); LinkedIn checklist; no AI without key", async ({ page }) => {
  await login(page, "student032@demo.learncrew.in");
  await page.goto("/profile-coach");
  const f = page.getByTestId("resume-upload");
  await f.locator('input[type="file"]').setInputFiles("tests/fixtures/resume-good.pdf");
  await f.getByLabel(/I consent to LearnCrew reading this file/).check();
  await f.getByRole("button", { name: /check resume/i }).click();
  await expect(page.getByText("Resume checked.")).toBeVisible();
  await expect(page.getByTestId("resume-checklist-score")).toHaveText(/\d+%/);
  await expect(page.getByText(/Text not saved/)).toBeVisible();
  const sql = e2eSql();
  const [r] = await sql`select input, score from profile_reviews pr join users u on u.id = pr.user_id where u.email = 'student032@demo.learncrew.in' and kind = 'resume' order by pr.created_at desc limit 1`;
  const [c] = await sql`select count(*)::int n from consents c join users u on u.id = c.user_id where u.email = 'student032@demo.learncrew.in' and kind = 'resume_processing'`;
  await sql.end();
  expect(r.input).toBeNull();
  expect(c.n).toBe(1);
  await expect(page.getByText(/AI drafts aren.t switched on/)).toBeVisible();

  await page.goto("/profile-coach?tab=linkedin");
  const li = page.getByTestId("linkedin-form");
  await li.getByLabel("Headline").fill("Final-year CSE · Java, SQL, Python · Seeking software engineer roles");
  await li.getByLabel(/Skills/).fill("Java, SQL, Python, Git, OOP, DBMS, HTML, CSS");
  await li.getByLabel("Profile photo").check();
  await li.getByRole("button", { name: /check linkedin/i }).click();
  await expect(page.getByTestId("linkedin-checklist-score")).toHaveText(/\d+%/);
});

test("profile coach: upload without consent is blocked by the form", async ({ page }) => {
  await login(page, "student033@demo.learncrew.in");
  await page.goto("/profile-coach");
  const f = page.getByTestId("resume-upload");
  await f.locator('input[type="file"]').setInputFiles("tests/fixtures/resume-good.pdf");
  await f.getByRole("button", { name: /check resume/i }).click();
  await expect(page.getByText("Resume checked.")).toHaveCount(0);
});
