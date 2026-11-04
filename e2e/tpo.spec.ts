import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("TPO lands on /tpo", async ({ page }) => {
  await login(page, "tpo@demo.learncrew.in");
  await expect(page).toHaveURL(/\/tpo/);
});
