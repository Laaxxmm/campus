import { expect, test } from "@playwright/test";
import { login } from "./helpers";
import { e2eSql } from "./db";

test("full mock: answer, flag, refresh mid-test resumes, submit, result + review; no answer leak before submit", async ({ page }) => {
  const bodies: string[] = [];
  page.on("response", async (r) => {
    const ct = r.headers()["content-type"] ?? "";
    if (/html|json|x-component|text\/plain/.test(ct)) bodies.push(await r.text().catch(() => ""));
  });
  await login(page, "mock.student@demo.learncrew.in");
  await page.goto("/mocks");
  await page.getByTestId("mock-card").filter({ hasText: "Infosys" }).click();
  await page.getByTestId("start-mock").click();
  await expect(page).toHaveURL(/\/mocks\/attempt\/[0-9a-f-]+$/);
  const attemptId = page.url().split("/").pop()!;
  await expect(page.getByTestId("mock-qno")).toHaveText(/Question 1 of \d+/);

  await page.getByRole("radiogroup").locator("button").first().click();
  await page.getByRole("button", { name: /save & next/i }).click();
  await page.getByRole("button", { name: /mark for review/i }).click();
  await page.keyboard.press("3"); // keyboard answer on Q2
  await expect(page.getByText("All answers saved")).toBeVisible({ timeout: 5000 });

  await page.reload();
  // Palette: right rail on desktop, bottom-sheet drawer on mobile/tablet.
  const opener = page.getByTestId("palette-open");
  if (await opener.isVisible()) await opener.click();
  await expect(page.getByRole("button", { name: /Question 1, answered/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Question 2, answered, flagged/ })).toBeVisible();
  if (await opener.isVisible()) await page.keyboard.press("Escape");

  // Leak check: nothing served during the test contains an explanation or answer key.
  const sql = e2eSql();
  const [att] = await sql`select question_ids from mock_attempts where id = ${attemptId}`;
  const exps = await sql`select explanation from questions where id = any(${att.question_ids})`;
  const all = bodies.join("\n");
  for (const e of exps) expect(all.includes(e.explanation as string), "explanation leaked before submit").toBe(false);
  expect(all).not.toMatch(/answer_?index/i);
  await sql.end();

  await page.getByTestId("mock-submit").click();
  const total = Number((await page.getByTestId("mock-qno").textContent())!.match(/of (\d+)/)![1]);
  await expect(page.getByTestId("unanswered-count")).toContainText(`${total - 2} questions are unanswered`);
  await page.getByTestId("confirm-submit").click();
  await expect(page).toHaveURL(/\/result$/);
  await expect(page.getByTestId("mock-score")).toHaveText(/\d+(\.\d+)?\/\d+/);
  await page.getByRole("tab", { name: "Flagged" }).click();
  await expect(page.getByTestId("review-item")).toHaveCount(1);
  await page.getByRole("tab", { name: "Skipped" }).click();
  await expect(page.getByTestId("review-item")).toHaveCount(total - 2);
});

test("mock auto-submits when the timer hits 0 (fake clock)", async ({ page }) => {
  await page.clock.install();
  await login(page, "mock.student@demo.learncrew.in");
  await page.goto("/mocks");
  await page.getByTestId("mock-card").filter({ hasText: "Accenture" }).click();
  await page.getByTestId("start-mock").click();
  await expect(page.getByTestId("mock-timer")).toHaveText(/2[45]:\d\d/);
  await page.getByRole("radiogroup").locator("button").first().click();
  await page.clock.fastForward("26:00");
  await expect(page).toHaveURL(/\/result$/, { timeout: 15_000 });
  await expect(page.getByText(/submitted automatically/i)).toBeVisible();
});

test("another student cannot open someone else's mock attempt (IDOR → 404)", async ({ page }) => {
  const sql = e2eSql();
  const [row] = await sql`select ma.id from mock_attempts ma join users u on u.id = ma.user_id where u.email = 'mock.student@demo.learncrew.in' limit 1`;
  await sql.end();
  await login(page, "student010@demo.learncrew.in");
  const r1 = await page.goto(`/mocks/attempt/${row.id}`);
  expect(r1?.status()).toBe(404);
  const r2 = await page.goto(`/mocks/attempt/${row.id}/result`);
  expect(r2?.status()).toBe(404);
});
