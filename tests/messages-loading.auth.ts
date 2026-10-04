import { expect, test } from "@playwright/test";

const fixtureURL = "http://127.0.0.1:3231";
const headers = { "x-auth-resolution-fixture-control": "auth-resolution-local-control-fixture" };

for (const width of [1440, 390]) {
  test.describe(`Messages loading and recovery at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.beforeEach(async ({ request, context }) => {
      expect((await request.post(`${fixtureURL}/__fixture/reset`, { headers })).ok()).toBeTruthy();
      const response = await request.get(`${fixtureURL}/__fixture/session?mode=fast`, { headers });
      expect(response.ok()).toBeTruthy();
      const fixture = await response.json();
      await context.addCookies([{
        domain: "127.0.0.1", httpOnly: true, name: fixture.cookieName, path: "/",
        sameSite: "Lax", secure: false, value: fixture.cookieValue,
      }]);
    });

    test("verified session loads conversations and updates", async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/messages");
      await expect(page.getByRole("heading", { name: "No conversations yet" })).toBeVisible();
      await expect(page.getByRole("status")).toHaveCount(0);
      await page.getByRole("link", { name: "Updates", exact: true }).click();
      await expect(page.getByRole("heading", { name: "No trade updates yet" })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`loaded-${width}.png`), fullPage: true });
      expect(errors).toEqual([]);
    });

    test("stalled data shows loading, then retry, and recovers", async ({ page, request }, testInfo) => {
      test.setTimeout(45_000);
      expect((await request.post(`${fixtureURL}/__fixture/messages-delay?enabled=true`, { headers })).ok()).toBeTruthy();
      await page.goto("/messages", { waitUntil: "commit" });
      await expect(page.getByRole("status", { name: "" }).filter({ hasText: "Loading your messages" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Messages", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "No conversations yet" })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`loading-${width}.png`), fullPage: true });

      await expect(page.getByRole("heading", { name: "We couldn’t load your messages" })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`retry-${width}.png`), fullPage: true });
      expect((await request.post(`${fixtureURL}/__fixture/messages-delay?enabled=false`, { headers })).ok()).toBeTruthy();
      await page.getByRole("button", { name: "Try again" }).click();
      await expect(page.getByRole("heading", { name: "No conversations yet" })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole("heading", { name: "We couldn’t load your messages" })).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath(`recovered-${width}.png`), fullPage: true });
    });
  });
}
