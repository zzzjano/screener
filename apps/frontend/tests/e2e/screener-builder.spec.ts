import { test, expect } from "@playwright/test";

test("strona główna przekierowuje do panelu", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/dashboard/);
});
