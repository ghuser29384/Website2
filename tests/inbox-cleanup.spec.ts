import { expect, test } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  test(`Messages has one workspace and usable navigation at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/messages");
    await expect(page).toHaveTitle(/Messages/);
    await expect(page.getByRole("heading", { level: 1, name: "Messages", exact: true })).toBeVisible();
    await expect(page.locator("[data-marketplace-left-nav]")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/Supabase|database records|lifecycle/);
    await expect(page.locator("nextjs-portal")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`messages-${width}.png`) });
    const navigation = page.waitForRequest(request => request.isNavigationRequest()
      && new URL(request.url()).pathname === "/discover");
    await page.locator("[data-mt-primary-links]").getByRole("link", { name: "Discover", exact: true }).click();
    expect((await navigation).resourceType()).toBe("document");
    await expect(page).toHaveTitle(/Browse trades/);
    await expect(page.getByRole("heading", { level: 1, name: "Browse trades" })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("footer avoids duplicate Contact links and keeps FAQ accessible", async ({ page }) => {
  await page.goto("/contact");
  const footer = page.locator(".mt-site-footer");
  await expect(footer.getByRole("link", { name: "Contact", exact: true })).toHaveCount(1);
  await footer.getByRole("link", { name: "FAQ", exact: true }).click();
  await expect(page).toHaveTitle(/FAQ/);
});
