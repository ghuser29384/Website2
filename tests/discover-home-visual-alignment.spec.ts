import { expect, test } from "@playwright/test";
import { mockInventory } from "./helpers/discover";

for (const [width, height] of [[1440, 1000], [390, 844], [320, 568]]) {
  test(`live-only Discover preserves the canonical design and readable terms at ${width}x${height}`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    const requests = await mockInventory(page);
    await page.setViewportSize({ width, height });
    await page.goto("/discover");
    await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
    await expect(page).toHaveTitle("Browse trades · Moral Trade");
    await expect(page.locator(".app-header")).toHaveCSS("background-color", "rgb(5, 5, 5)");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(245, 242, 233)");
    await expect(page.locator(".top-nav a")).toHaveText(["Feed", "Discover", "Controls", "Trade", "Commitments", "Evidence"]);
    await expect(page.locator('.top-nav a[aria-current="page"]')).toHaveText("Discover");
    const geometry = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth }));
    expect(geometry.document).toBeLessThanOrEqual(geometry.width + 1);
    const provided = await page.locator('[data-exchange-side="offer"]').boundingBox();
    const received = await page.locator('[data-exchange-side="return"]').boundingBox();
    expect(provided).not.toBeNull();
    expect(received).not.toBeNull();
    if (width < 600) expect(provided!.y + provided!.height).toBeLessThanOrEqual(received!.y + 1);
    else expect(provided!.x + provided!.width).toBeLessThanOrEqual(received!.x + 1);
    await page.locator("#command-input").fill("research");
    await page.locator("#command-input").press("Enter");
    await expect.poll(() => requests.at(-1)?.query).toBe("research");
    await expect(page.locator("#command-input")).toHaveValue("research");
    await expect(page.locator("#results")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator('nextjs-portal')).toHaveCount(0);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`discover-${width}.png`), fullPage: true });
  });
}

test("a visitor without JavaScript has a direct live-directory fallback", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/discover");
  await expect(page.locator('noscript a[href="/offers?view=live"]')).toBeVisible();
  await expect(page.locator(".trade-row")).toHaveCount(0);
  await context.close();
});
