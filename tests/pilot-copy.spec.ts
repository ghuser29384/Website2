import { expect, test } from "@playwright/test";

test.describe("Founding-user pilot copy", () => {
  test("shows the available actions without internal qualification language", async ({ page }) => {
    await page.goto("/pilot");

    const actionSection = page.getByRole("region", { name: "Choose one" });

    await expect(actionSection).toBeVisible();
    await expect(actionSection.locator(".mt-market-card")).toHaveCount(3);
    await expect(page.getByText("Finish with a real artifact.", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Saving one of these creates enough evidence/i)).toHaveCount(0);
    await expect(page.getByText(/acquisition metric/i)).toHaveCount(0);
    await expect(page.getByText(/conversion-critical product evidence/i)).toHaveCount(0);
    await expect(page.getByText(/serious first user/i)).toHaveCount(0);
  });
});
