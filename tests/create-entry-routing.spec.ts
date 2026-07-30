import { expect, test } from "@playwright/test";

const CANONICAL_FAVICON = "/brand/moral-trade-mark.png?v=20260730";

async function expectCanonicalFavicon(page: import("@playwright/test").Page) {
  await expect
    .poll(
      async () =>
        page.locator('head link[rel*="icon" i]').evaluateAll((links) =>
          links.map((link) => {
            const url = new URL((link as HTMLLinkElement).href);
            return `${url.pathname}${url.search}`;
          }),
        ),
      { timeout: 15_000 },
    )
    .toEqual(expect.arrayContaining([CANONICAL_FAVICON]));

  await expect
    .poll(
      async () =>
        page.locator('head link[rel*="icon" i]').evaluateAll((links, canonicalFavicon) =>
          links.length > 0 &&
          links.every((link) => {
            const url = new URL((link as HTMLLinkElement).href);
            return `${url.pathname}${url.search}` === canonicalFavicon;
          }),
        , CANONICAL_FAVICON),
      { timeout: 15_000 },
    )
    .toBe(true);
}

async function completeMandatoryWalkthrough(page: import("@playwright/test").Page) {
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/walkthrough(?:\?|$)/);
  await expectCanonicalFavicon(page);
}

async function expectUnifiedCreate(page: import("@playwright/test").Page) {
  const frameElement = page.locator('[data-create-interface-frame="true"]');

  await expect(frameElement).toBeVisible();
  await expect(
    page
      .frameLocator('iframe[data-create-interface-frame="true"]')
      .getByRole("heading", { level: 1, name: "What do you want to improve?" }),
  ).toBeVisible();
  await expectCanonicalFavicon(page);
}

test.describe("Home, Trade, and Create entry routing", () => {
  test("keeps the root route on the live Feed and opens Create from Trade", async ({ page }) => {
    await completeMandatoryWalkthrough(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/$/);
    await expectCanonicalFavicon(page);
    await expect(page.locator('[data-create-interface-frame="true"]')).toHaveCount(0);
    const tradeEntry = page.locator('[data-page="trade"]');
    await expect(tradeEntry).toBeVisible();

    await tradeEntry.click();

    await expect(page).toHaveURL(/\/trades\/new(?:\?|$)/);
    await expectUnifiedCreate(page);
  });

  test("replaces a direct legacy Trade hash without replacing Home", async ({ page }) => {
    await completeMandatoryWalkthrough(page);
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

  test("uses the canonical favicon on document-replacement routes", async ({ page }) => {
    for (const route of ["/feed", "/walkthrough", "/discover"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expectCanonicalFavicon(page);
    }
  });
});
