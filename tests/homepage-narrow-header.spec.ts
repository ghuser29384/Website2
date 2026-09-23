import { expect, test } from "@playwright/test";

test.use({ timezoneId: "UTC" });

for (const width of [320, 360, 390]) {
  test(`fresh homepage keeps date and create action within ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.clock.setFixedTime(new Date("2026-09-23T12:00:00.000Z"));
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible({ timeout: 30_000 });
    const date = page.locator(".head .date");
    const create = page.locator('.head button[data-action="create"]');
    await expect(date.locator("time")).toHaveText("Wednesday, September 23, 2026");
    await expect(create).toContainText("Create offer");
    await expect(create).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    for (const control of [date, create]) {
      const bounds = await control.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      expect(bounds!.width).toBeGreaterThan(0);
      expect(await control.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    }
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);

    await create.click();
    await expect(page).toHaveURL(/\/trades\/new(?:[?#]|$)/, { timeout: 30_000 });
  });
}
