import { expect, test } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  test(`selected native header and footer at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/About/);
    // The About removal was explicitly excluded from this release.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("A service for cooperation across moral disagreement.");
    const header = page.locator(".mt-refined-header").first();
    await expect(header.locator("[data-mt-primary-links] > a")).toHaveText(["Feed", "Discover", "Messages", "Commitments"]);
    await expect(header.locator('form[role="search"]')).toHaveAttribute("action", "/offers");
    await expect(header.locator('form[role="search"]')).toHaveAttribute("method", "get");
    await expect(header.getByRole("searchbox", { name: "Search offers" })).toBeVisible();
    const more = header.locator("summary").filter({ hasText: "More" });
    await more.focus();
    await page.keyboard.press("Enter");
    await expect(header.getByRole("link", { name: "Evidence", exact: true })).toBeVisible();
    await expect(header.getByRole("link", { name: "Tour", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(more).toBeFocused();
    await expect(header.getByRole("link", { name: "Evidence", exact: true })).not.toBeVisible();
    const footer = page.locator(".mt-site-footer");
    await expect(footer.locator(".mt-footer-links li a")).toHaveCount(15);
    await expect(footer).toContainText("Offer an action in exchange for an action you value.");
    await expect(footer).toContainText("Moral Trade does not provide legal, tax, investment, or blanket impact certification.");
    await expect(footer.locator('a[href="/bottleneck-atlas"]')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await header.screenshot({ path: testInfo.outputPath(`selected-header-${width}.png`) });
    await footer.screenshot({ path: testInfo.outputPath(`selected-footer-${width}.png`) });
    expect(errors).toEqual([]);
    await testInfo.attach("browser-errors", { body: JSON.stringify(errors), contentType: "application/json" });
  });
}

test("native offer search reaches the existing directory without an interpretation request", async ({ page }) => {
  const interpretationRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/query/interpret")) interpretationRequests.push(request.url());
  });
  await page.goto("/contact");
  const header = page.locator(".mt-refined-header").first();
  await header.getByRole("searchbox", { name: "Search offers" }).fill("animal welfare");
  await header.getByRole("button", { name: "Search", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/offers");
  await expect.poll(() => new URL(page.url()).searchParams.get("search")).toBe("animal welfare");
  expect(interpretationRequests).toEqual([]);
});
