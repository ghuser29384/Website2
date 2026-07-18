import { expect, test } from "@playwright/test";

test.describe("exact live Plan Resources controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("moraltrade.plan-resources.v1");
    });
    await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Plan resources" }).click();
  });

  test("all five controls update the route and remain set after rerender", async ({ page }) => {
    const goal = page.locator('[data-mt-plan-control="goal"]');
    const horizon = page.locator('[data-mt-plan-control="horizon"]');
    const budget = page.locator('[data-mt-plan-control="budget"]');
    const time = page.locator('[data-mt-plan-control="time"]');
    const verification = page.locator('[data-mt-plan-control="verification"]');
    const summary = page.locator("[data-mt-plan-summary]");

    await goal.selectOption("bio");
    await expect(page.locator(".route h2")).toContainText("Strengthen biosecurity");

    await horizon.selectOption("week");
    await expect(page.locator("#mt-plan-horizon-help")).not.toContainText("Jul 31");

    await budget.fill("30");
    await budget.press("Enter");
    await expect(summary).toContainText("$30 action budget");

    await time.selectOption("30m");
    await expect(summary).toContainText("~30 minutes available");

    await verification.selectOption("maximum");
    await expect(summary).toContainText("Maximum verification");
    await expect(page.locator('[data-mt-route-step="2"]')).toContainText(
      "independently reviewed biosecurity evidence review",
    );

    await page.getByRole("button", { name: "Focus" }).click();
    await page.getByRole("button", { name: "Plan resources" }).click();
    await expect(goal).toHaveValue("bio");
    await expect(horizon).toHaveValue("week");
    await expect(budget).toHaveValue("30");
    await expect(time).toHaveValue("30m");
    await expect(verification).toHaveValue("maximum");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Plan resources" }).click();
    await expect(page.locator('[data-mt-plan-control="goal"]')).toHaveValue("bio");
    await expect(page.locator('[data-mt-plan-control="horizon"]')).toHaveValue("week");
    await expect(page.locator('[data-mt-plan-control="budget"]')).toHaveValue("30");
    await expect(page.locator('[data-mt-plan-control="time"]')).toHaveValue("30m");
    await expect(page.locator('[data-mt-plan-control="verification"]')).toHaveValue(
      "maximum",
    );
  });

  test("Reset restores every control and the allocation table", async ({ page }) => {
    const biosecurityRow = page.locator("tr").filter({
      hasText: "Verified biosecurity salary-gap pool",
    });
    const conditionalMoney = biosecurityRow.locator('.drop[data-row="bio"]').nth(2);
    const moneyChip = page.locator('.dragchip[data-resource="m"]');
    const reset = page.locator('button[data-mt-plan-reset="true"]');

    await page.locator('[data-mt-plan-control="goal"]').selectOption("civic");
    await page.locator('[data-mt-plan-control="horizon"]').selectOption("quarter");
    await page.locator('[data-mt-plan-control="budget"]').fill("25");
    await page.locator('[data-mt-plan-control="time"]').selectOption("1h");
    await page.locator('[data-mt-plan-control="verification"]').selectOption("standard");

    await expect(conditionalMoney).toHaveText("$70");
    await moneyChip.dragTo(conditionalMoney);
    await expect(conditionalMoney).toHaveText("$80");

    await reset.click();
    await expect(page.locator('[data-mt-plan-control="goal"]')).toHaveValue("factory");
    await expect(page.locator('[data-mt-plan-control="horizon"]')).toHaveValue("month");
    await expect(page.locator('[data-mt-plan-control="budget"]')).toHaveValue("80");
    await expect(page.locator('[data-mt-plan-control="time"]')).toHaveValue("2h");
    await expect(page.locator('[data-mt-plan-control="verification"]')).toHaveValue("high");
    await expect(conditionalMoney).toHaveText("$70");
    await expect(page.locator("#toast")).toHaveText("Plan resources reset to defaults.");
  });
});
