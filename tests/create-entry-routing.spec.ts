import { expect, test } from "@playwright/test";

async function expectUnifiedCreate(page: import("@playwright/test").Page) {
  const frameElement = page.locator('[data-create-interface-frame="true"]');

  await expect(frameElement).toBeVisible();
  await expect(
    page
      .frameLocator('iframe[data-create-interface-frame="true"]')
      .getByRole("heading", { level: 1, name: "What do you want to improve?" }),
  ).toBeVisible();
}

test.describe("Home, Trade, and Create entry routing", () => {
  test("keeps the root route on the live Feed and opens Create from Trade", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-create-interface-frame="true"]')).toHaveCount(0);
    const tradeEntry = page.locator('[data-page="trade"]');
    await expect(tradeEntry).toBeVisible();

    await tradeEntry.click();

    await expect(page).toHaveURL(/\/trades\/new(?:\?|$)/);
    await expectUnifiedCreate(page);
  });

  test("replaces a direct legacy Trade hash without replacing Home", async ({ page }) => {
    await page.goto("/#trade", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/trades\/new(?:\?|$)/);
    await expectUnifiedCreate(page);
  });

  test("keeps Create and Create Offer entries on the unified wizard", async ({ page }) => {
    await page.goto("/create?source=route-test", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/create\?source=route-test$/);
    await expectUnifiedCreate(page);

    await page.goto("/offers?view=templates", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/offers\?view=templates$/);
    await expectUnifiedCreate(page);
  });
});
