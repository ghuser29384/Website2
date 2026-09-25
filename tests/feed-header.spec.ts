import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`default feed has no introduction at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    // Read-only unavailable fixtures isolate layout from authentication and matching.
    await page.route("**/api/live-account", (route) => route.fulfill({
      json: { authenticated: false },
    }));
    await page.route("**/api/live-now", (route) => route.fulfill({
      json: {
        authenticated: false,
        status: "unavailable",
        recommendations: [],
        routePlanner: {
          status: "unavailable",
          checkedAt: "2026-09-25T00:00:00.000Z",
          profile: {},
          needsMoreInput: [],
          routes: [],
          comparison: null,
          candidateCount: 0,
        },
      },
    }));

    await page.goto("/");
    const feedPage = page.locator("#app > .page");
    const tabs = feedPage.locator(":scope > .tabs");
    await expect(tabs).toBeVisible();
    await expect(feedPage.locator(":scope > .head")).toHaveCount(0);
    await expect(feedPage.locator("h1, .subtitle, .date")).toHaveCount(0);
    await expect(page.getByText("What needs you now.", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Review live opportunities and plan your next action.", { exact: true })).toHaveCount(0);
    expect(await feedPage.evaluate((element) => element.firstElementChild?.classList.contains("tabs"))).toBe(true);
    expect(await tabs.evaluate((element) => {
      const parent = element.parentElement!;
      return element.getBoundingClientRect().top - parent.getBoundingClientRect().top
        - parseFloat(getComputedStyle(parent).paddingTop);
    })).toBeLessThanOrEqual(7);

    await tabs.getByRole("button", { name: "Plan resources", exact: true }).click();
    await expect(tabs.getByRole("button", { name: "Plan resources", exact: true })).toHaveClass("active");
    await expect(feedPage.locator(".plan-grid")).toBeVisible();
    await expect(feedPage.locator(":scope > .head")).toHaveCount(0);
    await tabs.getByRole("button", { name: "Focus", exact: true }).click();
    await expect(tabs.getByRole("button", { name: "Focus", exact: true })).toHaveClass("active");
    await expect(feedPage.locator("[data-mt-live-now]")).toBeVisible();
    await expect(feedPage.locator(":scope > .head")).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
}
