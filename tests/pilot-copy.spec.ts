import { expect, test } from "@playwright/test";

test.describe("Legacy pilot route", () => {
  test("redirects to the action-first start page", async ({ page }) => {
    await page.goto("/pilot");

    await expect(page).toHaveURL(/\/start(?:\?.*)?$/);
    await expect(
      page.getByRole("heading", { name: "Choose a real first action." }),
    ).toBeVisible();
    await expect(page.getByText(/founding-user pilot/i)).toHaveCount(0);
    await expect(page.getByText(/prototype/i)).toHaveCount(0);
  });
});
