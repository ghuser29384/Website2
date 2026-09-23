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
    const date = page.locator(".head .date");
    const create = page.locator('.head button[data-action="create"]');
    const tour = page.getByRole("link", { name: "Open optional walkthrough" });
    await expect(date.locator("time")).toHaveText("Wednesday, September 23, 2026");
    await expect(create).toContainText("Create offer");
    await expect(create).toBeVisible();
    await expect(tour).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    const navigation = page.locator("header.topbar nav > button, header.topbar nav > a");
    await expect(navigation).toHaveCount(6);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    for (const control of [date, create, ...await navigation.all()]) {
      const bounds = await control.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      expect(bounds!.width).toBeGreaterThan(0);
      expect(await control.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    }
    expect(await tour.evaluate((element) => getComputedStyle(element).fontSize)).toBe(width <= 820 ? "11px" : "15px");
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);

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
