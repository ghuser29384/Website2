import { expect, test, type Page, type TestInfo } from "@playwright/test";

async function expectBoundedUnavailableSurface(
  page: Page,
  testInfo: TestInfo,
  viewport: { height: number; width: number },
) {
  await page.setViewportSize(viewport);
  const response = await page.goto("/account-state-unavailable", {
    waitUntil: "domcontentloaded",
  });

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/account-state-unavailable$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "We couldn't confirm your setup status." }),
  ).toBeVisible();
  await expect(page.getByText(/did not classify this account as new/i)).toBeVisible();
  await expect(page.getByText("No activation stage was changed.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Retry account check" })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(page.getByRole("link", { name: "Browse Discover" })).toHaveAttribute(
    "href",
    "/discover",
  );
  await expect(page.locator('a[href="/walkthrough"]')).toHaveCount(0);
  await expect(page.locator('a[href="/complete-profile"]')).toHaveCount(0);
  await expect(page.locator('a[href="/feed"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex, nofollow/i,
  );
  expect(response?.headers()["cache-control"]).toContain("private, no-store");

  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);

  await page.screenshot({
    path: testInfo.outputPath(`account-state-unavailable-${viewport.width}.png`),
    fullPage: false,
  });
}

test("account-state failure stays truthful and bounded on desktop", async ({ page }, testInfo) => {
  await expectBoundedUnavailableSurface(page, testInfo, { height: 1000, width: 1440 });
});

test("account-state failure stays truthful and bounded on mobile", async ({ page }, testInfo) => {
  await expectBoundedUnavailableSurface(page, testInfo, { height: 844, width: 390 });
});
