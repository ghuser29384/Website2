import { expect, test } from "@playwright/test";

test.describe("exact live Plan Resources reset", () => {
  test("restores allocation defaults after changes and remains reusable", async ({ page }) => {
    await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Plan resources" }).click();

    const biosecurityRow = page.locator("tr").filter({
      hasText: "Verified biosecurity salary-gap pool",
    });
    const conditionalMoney = biosecurityRow.locator('.drop[data-row="bio"]').nth(2);
    const moneyChip = page.locator('.dragchip[data-resource="m"]');
    const resetButton = page.locator('button[data-mt-plan-reset="true"]');

    await expect(conditionalMoney).toHaveText("$70");
    await expect(resetButton).toHaveAttribute(
      "aria-label",
      "Reset plan resources to defaults",
    );

    await moneyChip.dragTo(conditionalMoney);
    await expect(conditionalMoney).toHaveText("$80");

    await resetButton.click();
    await expect(conditionalMoney).toHaveText("$70");
    await expect(page.locator("#toast")).toHaveText("Plan resources reset to defaults.");

    await moneyChip.dragTo(conditionalMoney);
    await expect(conditionalMoney).toHaveText("$80");
    await resetButton.click();
    await expect(conditionalMoney).toHaveText("$70");

    await resetButton.click();
    await expect(conditionalMoney).toHaveText("$70");
  });
});
