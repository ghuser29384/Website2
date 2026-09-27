import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

for (const width of [1440, 390, 320]) {
  test(`Commitments uses an uncluttered single workspace at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const response = await page.goto("/commitments", { timeout: 60_000, waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 200).toBeLessThan(400);
    const workspace = page.locator(".mt-v75-route-workspace").first();
    const heading = page.locator("#commitments-heading");
    await expect(workspace).toBeVisible({ timeout: 45_000 });
    await expect(heading).toHaveText("Commitments");
    await expect(page.locator(".mt-v75-side-nav, .mt-v75-side-brand, .mt-v75-side-plan")).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    const bounds = await workspace.boundingBox();
    const title = await heading.boundingBox();
    expect(bounds).not.toBeNull();
    expect(title).not.toBeNull();
    expect(title!.x).toBeGreaterThanOrEqual(bounds!.x);
    expect(title!.x + title!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(page.getByRole("navigation", { name: "Primary", exact: true })).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Commitments sections" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`commitments-workspace-${width}.png`), fullPage: false });
  });
}
