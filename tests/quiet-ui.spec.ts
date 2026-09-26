import { expect, test } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  test(`quiet homepage preserves recovery and controls at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const feed = page.locator('[data-mt-live-now="adaptive"]');
    await expect(feed).toBeVisible();
    const utilityHeader = page.locator(".head");
    await expect(utilityHeader).toBeVisible();
    await expect(utilityHeader.locator("h1")).toHaveCount(0);
    await expect(utilityHeader.locator(".date")).toBeVisible();
    await expect(utilityHeader.locator('button[data-action="create"]')).toBeVisible();
    // Keep the existing screen-reader document heading without restoring a visual introduction.
    await expect(page.locator(".page h1")).toHaveCount(0);
    await expect(page.locator("#mt-live-document-heading")).toHaveCSS("position", "absolute");
    const documentHeading = await page.locator("#mt-live-document-heading").boundingBox();
    expect(documentHeading!.width).toBeLessThanOrEqual(1);
    expect(documentHeading!.height).toBeLessThanOrEqual(1);
    await expect(page.locator("body")).toHaveCSS("background-image", "none");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 248, 250)");
    const state = feed.locator(".mt-feed-empty");
    await expect(state).toBeVisible();
    await expect(state).toHaveCSS("background-color", "rgb(255, 255, 255)");
    expect((await state.boundingBox())!.height).toBeLessThan(width < 600 ? 420 : 280);
    await expect(state.locator("a")).toHaveCount(2);
    const explanation = feed.locator(".mt-feed-explanation");
    await expect(explanation).not.toHaveAttribute("open", "");
    await explanation.locator("summary").click();
    await expect(explanation).toHaveAttribute("open", "");
    await expect(explanation.getByText("No demo records", { exact: true })).toBeVisible();
    await explanation.locator("summary").click();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`quiet-home-${width}.png`), fullPage: false });
    await page.locator('button[data-action="create"]').click();
    await expect(page).toHaveURL(/\/trades\/new/);
    const create = page.frameLocator('iframe[title="Moral Trade Create"]');
    await expect(create.locator("#causeHeading")).toBeVisible();
    const size = await create.locator("#causeHeading").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(28);
    expect(size).toBeLessThanOrEqual(32);
    await expect(create.locator("body")).toHaveCSS("background-image", "none");
    await expect(create.locator("#screenCause .intro")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await page.screenshot({ path: testInfo.outputPath(`quiet-create-${width}.png`), fullPage: false });
    expect(errors).toEqual([]);
  });
}

test("Dashboard priority entry is authenticated and legacy anchors remain accessible", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard$/);
  await expect(page.locator('[data-mt-surface="auth"]')).toBeVisible();
  await page.goto("/dashboard#payment-setup");
  // The legacy page keeps its existing server-side authentication boundary.
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard/);
});

for (const width of [1440, 390, 320]) {
  test(`shared page hierarchy remains quieter than its page title at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/about");
    const sizes = await page.evaluate(() => ({
      title: parseFloat(getComputedStyle(document.querySelector(".hero-copy h1")!).fontSize),
      sections: Array.from(document.querySelectorAll(".section-head h2")).map(el => parseFloat(getComputedStyle(el).fontSize)),
      strongBorder: getComputedStyle(document.documentElement).getPropertyValue("--line-strong").trim(),
    }));
    expect(sizes.title).toBeGreaterThanOrEqual(28);
    expect(sizes.title).toBeLessThanOrEqual(32);
    expect(sizes.sections.length).toBeGreaterThan(0);
    for (const size of sizes.sections) expect(size).toBeLessThan(sizes.title);
    expect(sizes.strongBorder).toBe("#89919e");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`quiet-about-${width}.png`), fullPage: false });
  });
}
