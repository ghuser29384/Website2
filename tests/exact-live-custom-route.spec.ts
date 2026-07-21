import { expect, test } from "@playwright/test";

test.describe("Exact live Custom Route workbench", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem("moraltrade.plan-resources.v1");
    });
    await page.goto("/moral-trade-live.html#now");
    await page.locator('[data-now="plan"]').click();
    await page.getByRole("button", { name: "Custom route", exact: true }).click();
    await expect(page.locator('[data-mt-custom-route="resource-mix"]')).toBeVisible();
  });

  test("separates planned donation flow from added-resource accounting", async ({ page }) => {
    const result = page.locator(".mt-cr-ledger-result");
    const moneyMeter = page.locator('[data-mt-cr-meter="money"] .mt-cr-vessel strong');

    await expect(result).toContainText("$20 redirected · $20 counted until baseline confirmed");
    await expect(moneyMeter).toHaveText("$35");

    await page.locator('[data-mt-cr-action="declaration"][data-status="all"]').click();
    await expect(result).toContainText("$20 redirected · $0 added money");
    await expect(moneyMeter).toHaveText("$15");

    await page.locator('[data-mt-cr-action="declaration"][data-status="part"]').click();
    const partialAmount = page.getByLabel("Amount already planned this month");
    await partialAmount.fill("8");
    await partialAmount.press("Tab");
    await expect(result).toContainText("$20 redirected · $12 added money");
    await expect(moneyMeter).toHaveText("$27");

    await page.locator('[data-mt-cr-action="declaration"][data-status="none"]').click();
    await expect(result).toContainText("$20 redirected · $20 added money");
    await expect(moneyMeter).toHaveText("$35");
  });

  test("keeps top-ups, fees, setup time, and actions inside added resources", async ({ page }) => {
    await expect(page.locator('[data-mt-cr-meter="minutes"] input')).toHaveValue("120");
    await page.locator('[data-mt-cr-action="declaration"][data-status="all"]').click();

    const topUp = page.getByLabel("Additional donation top-up");
    await topUp.fill("5");
    await topUp.press("Tab");
    const fee = page.getByLabel("Incremental fee");
    await fee.fill("0.75");
    await fee.press("Tab");

    await expect(page.locator(".mt-cr-ledger-result")).toContainText(
      "$25 redirected · $5.75 added money",
    );
    await expect(page.locator('[data-mt-cr-meter="money"] .mt-cr-vessel strong')).toHaveText(
      "$20.75",
    );
    await expect(page.locator('[data-mt-cr-meter="minutes"] .mt-cr-vessel strong')).toHaveText(
      "12m",
    );
    await expect(page.locator('[data-mt-cr-meter="actions"] .mt-cr-vessel strong')).toHaveText(
      "3",
    );
  });

  test("keeps weekly and monthly declarations and limits independent", async ({ page }) => {
    await page.locator('[data-mt-cr-action="declaration"][data-status="all"]').click();
    await page.locator('[data-mt-cr-action="period"][data-period="week"]').click();

    await expect(page.locator(".mt-cr-ledger-result")).toContainText(
      "$20 counted until baseline confirmed",
    );
    await expect(page.locator('[data-mt-cr-meter="money"] output')).toHaveText("$30");
    await page.locator('[data-mt-cr-action="declaration"][data-status="none"]').click();

    await page.locator('[data-mt-cr-action="period"][data-period="month"]').click();
    await expect(page.locator(".mt-cr-ledger-result")).toContainText(
      "$20 redirected · $0 added money",
    );
    await expect(page.locator('[data-mt-cr-meter="money"] output')).toHaveText("$80");
  });

  test("itemizes the route before a fail-closed review confirmation", async ({ page }) => {
    await page.locator('[data-mt-cr-action="declaration"][data-status="all"]').click();
    await page.getByRole("button", { name: "Review mix" }).click();

    const review = page.getByRole("dialog", { name: "Review what this route would add." });
    await expect(review).toBeVisible();
    await expect(review).toContainText("Planned donation used");
    await expect(review).toContainText("$20 principal · $0 added principal");
    await expect(review).toContainText(
      "Confirming here does not charge, pledge, invite, or create a durable commitment.",
    );
    const confirm = review.getByRole("button", { name: "Confirm review" });
    await expect(confirm).toBeDisabled();

    const effects = review.locator('[data-mt-cr-input="effect"]');
    for (let index = 0; index < await effects.count(); index += 1) {
      await effects.nth(index).check();
    }
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(review).toBeHidden();
  });

  test("returns to Routes and stays free of horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('[data-mt-custom-route="resource-mix"]')).toBeVisible();
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);

    await page.getByRole("button", { name: "Back to routes" }).click();
    await expect(page.locator(".route")).toBeVisible();
    await expect(page.getByRole("button", { name: "Custom route", exact: true })).toBeVisible();
  });
});
