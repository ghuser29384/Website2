import { expect, test } from "@playwright/test";

test.use({ timezoneId: "UTC" });

for (const width of [1440, 320, 360, 390]) {
  test(`fresh homepage keeps date and navigation usable within ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.clock.setFixedTime(new Date("2026-09-23T12:00:00.000Z"));
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible({ timeout: 30_000 });
    const date = page.locator(".page .date");
    const create = page.locator('.page button[data-action="create"]');
    const tour = page.locator(".header-more").getByRole("link", { name: "How it works", exact: true, includeHidden: true });
    await expect(date.locator("time")).toHaveText("Wednesday, September 23, 2026");
    await expect(create).toContainText("Create offer");
    await expect(create).toBeVisible();
    await expect(tour).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready);

    const navigation = page.locator("header.topbar nav > button, header.topbar nav > a");
    await expect(navigation).toHaveCount(4);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    for (const control of [date, create, ...await navigation.all()]) {
      const bounds = await control.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      expect(bounds!.width).toBeGreaterThan(0);
      expect(await control.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    }

    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);

    await page.locator(".header-more > summary").click();
    await expect(tour).toBeVisible();
    await expect(tour).toHaveCSS("font-size", "14px");
    await tour.click();
    await expect(page).toHaveURL(/\/walkthrough$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "What do you value?" })).toBeVisible();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible({ timeout: 30_000 });
    await create.click();
    await expect(page).toHaveURL(/\/trades\/new(?:[?#]|$)/, { timeout: 30_000 });
    expect(errors).toEqual([]);
  });
}
