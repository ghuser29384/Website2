import { expect, test } from "@playwright/test";
import { mockAccount, mockInventory } from "./helpers/discover";

for (const width of [1728, 1440, 1024, 390, 320]) {
  for (const route of ["/feed", "/discover", "/profile"]) {
    test(`approved masthead at ${route} ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 950 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      if (route === "/discover") await mockInventory(page);
      else await mockAccount(page);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const header = page.locator(".mt-refined-header").first();
      const nav = header.locator("[data-mt-primary-links]");
      await expect(nav.locator(":scope > a")).toHaveText(["Home", "Trades", "Commitments", "Profile"]);
      await expect(header).toHaveCSS("background-color", "rgb(17, 18, 20)");
      await expect(nav.getByText("100 Sparks")).toHaveCount(0);
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
      const hrefs = await nav.locator(":scope > a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
      expect(hrefs).toEqual(["/feed", "/discover", "/commitments", "/profile"]);
      const brand = header.locator(".brand");
      await expect(brand).toBeVisible();
      await expect(brand).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(brand.locator('path[fill="#3158ff"]')).toHaveCount(1);
      const start = header.locator(".header-start, .button-nav:not(.button-secondary)");
      await expect(start).toBeVisible();
      await expect(start).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(start).toHaveCSS("color", "rgb(17, 18, 20)");
      expect(await start.evaluate((el) => parseFloat(getComputedStyle(el).borderRadius))).toBeGreaterThan(20);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      for (const link of await nav.locator(":scope > a").all()) {
        const box = await link.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      await page.screenshot({ path: testInfo.outputPath(`header-${route.slice(1)}-${width}.png`), fullPage: false });
      expect(errors).toEqual([]);
      await testInfo.attach("browser-errors", { body: JSON.stringify(errors), contentType: "application/json" });
    });
  }
}

test("Profile owns priorities and a legacy Sparks URL preserves the authenticated editor", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("link", { name: /Adjust priorities/ }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  expect(decodeURIComponent(page.url())).toContain("/profile/priorities");
  await page.goto("/100-sparks");
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  expect(decodeURIComponent(page.url())).toContain("/profile/priorities");
});

test("secondary utilities support keyboard disclosure and native page navigation", async ({ page }) => {
  for (const route of ["/feed", "/profile"]) {
    await page.goto(route);
    const header = page.locator(".mt-refined-header").first();
    const summary = header.locator("summary").filter({ hasText: "More" });
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(header.getByRole("link", { name: "Messages", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(summary).toBeFocused();
    await expect(header.getByRole("link", { name: "Messages", exact: true })).not.toBeVisible();
    const trades = header.locator('[data-mt-primary-links] a[href="/discover"]');
    await trades.click();
    await expect(page).toHaveURL(/\/discover$/);
  }
});

test("the directory masthead and priorities entry link remain usable without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/discover");
  await page.locator('[data-mt-primary-links] a[href="/profile"]').click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("link", { name: /Adjust priorities/ })).toBeVisible();
  await context.close();
});
