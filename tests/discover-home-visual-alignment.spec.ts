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
    await expect(page.locator(".top-nav > a, .top-nav > details > summary")).toHaveText(["Discover", "Feed", "Activity", "Profile", "Help", "Create trade"]);
    await expect(page.locator('.top-nav a[aria-current="page"]')).toHaveText("Discover");
    const profileMenu = page.locator(".mt-nav-group").filter({ has: page.locator("summary", { hasText: "Profile" }) });
    await profileMenu.locator("summary").focus();
    await page.keyboard.press("Enter");
    const priorities = profileMenu.locator('a[href="/profile/priorities"]');
    await expect(priorities).toBeVisible();
    await expect(priorities).toHaveAttribute("href", "/profile/priorities");
    const panelBounds = await profileMenu.locator(".mt-nav-panel").boundingBox();
    expect(panelBounds!.x).toBeGreaterThanOrEqual(0);
    expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(width + 1);
    await page.keyboard.press("Escape");
    await expect(priorities).toBeHidden();
    await expect(profileMenu.locator("summary")).toBeFocused();
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


test("native Profile uses the same task groups and keeps priorities directly reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/profile");
  const navigation = page.locator("nav.mt-site-topbar");
  await expect(navigation.locator(".topbar-links > a, .topbar-links > details > summary > span:first-child"))
    .toHaveText(["Discover", "Feed", "Activity", "Profile", "Help"]);
  const profileMenu = navigation.locator(".topbar-links > details").filter({ has: page.locator("summary", { hasText: "Profile" }) });
  await profileMenu.locator("summary").focus();
  await page.keyboard.press("Enter");
  const priorities = profileMenu.locator('a[href="/profile/priorities"]');
  await expect(priorities).toBeVisible();
  await expect(priorities).toHaveAttribute("href", "/profile/priorities");
  await expect(profileMenu.locator('a[href="/profile"]')).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(priorities).toBeHidden();
  await expect(profileMenu.locator("summary")).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
