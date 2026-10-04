import { expect, test } from "@playwright/test";
import { fulfill, liveOffer, mockInventory, responseFor } from "./helpers/discover";

for (const width of [1440, 390]) {
  test(`public home shows source-backed trades and optional personalization at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/live-now", (route) => fulfill(route, { authenticated: false, status: "signed_out", recommendations: [] }));
    await mockInventory(page, (body) => responseFor(body, { items: [liveOffer("1c6b0e57-bfed-3f29-c51f-6f8c23d1960b")] }));
    await page.goto("/");
    await expect(page.locator(".mt-public-trade")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Sign in for personal suggestions" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Command$/ })).toHaveCount(0);
    await expect(page.locator('[data-mt-live-now="adaptive"]')).not.toContainText("Feed rule");
    await expect(page.locator("[data-mt-live-now-recommendation]")).toHaveCount(0);
    await expect(page.locator(".mt-public-trade").getByRole("link", { name: "Review trade →" })).toHaveAttribute("href", "/offers/1c6b0e57-bfed-3f29-c51f-6f8c23d1960b");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`public-home-${width}.png`) });
    expect(errors).toEqual([]);
  });
}

test("old live browse links preserve query and sort and share Saved offers", async ({ page }) => {
  const requests = await mockInventory(page);
  await page.goto("/offers?view=live&search=animal%20welfare&sort=newest");
  await expect(page).toHaveURL(/\/discover\?/);
  await expect(page.locator("#command-input")).toHaveValue("animal welfare");
  await expect(page.locator("#offer-sort")).toHaveValue("newest");
  await page.getByLabel("Sort", { exact: true }).selectOption("lowest-cost");
  await expect.poll(() => (requests.at(-1) as unknown as { sort: string })?.sort).toBe("lowest-cost");
  await page.getByRole("navigation", { name: "Discover views" }).getByRole("link", { name: "Saved offers" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Saved offers" })).toBeVisible();
  await expect(page.locator("[data-marketplace-left-nav]")).toHaveCount(0);
});

test("unavailable public records never become zero-count or demo listings", async ({ page }) => {
  await page.route("**/api/live-now", (route) => fulfill(route, { authenticated: false, status: "signed_out", recommendations: [] }));
  await mockInventory(page, (body) => responseFor(body, { sourceStatus: { offers: "unavailable" }, items: [], total: 0 }));
  await page.goto("/");
  await expect(page.locator("[data-mt-public-listings]").getByRole("status")).toHaveText("We couldn’t load the trades. Please try again.");
  await expect(page.locator("[data-mt-public-listings]").getByRole("link", { name: "Retry in Discover →" })).toHaveAttribute("href", "/discover");
  await expect(page.locator(".mt-public-trade")).toHaveCount(0);
  await expect(page.locator("[data-mt-public-listings]")).not.toContainText("No current trades");
});

test("partial public inventory does not imply the whole marketplace is empty", async ({ page }) => {
  await page.route("**/api/live-now", (route) => fulfill(route, { authenticated: false, status: "signed_out", recommendations: [] }));
  await mockInventory(page, (body) => responseFor(body, { sourceStatus: { offers: "partial" }, items: [], total: 0 }));
  await page.goto("/");
  await expect(page.locator("[data-mt-public-listings]").getByRole("status")).toHaveText("We haven’t found trades in the listings we could load. Please try again to check the rest.");
  await expect(page.locator("[data-mt-public-listings]").getByRole("link", { name: "Retry in Discover →" })).toHaveAttribute("href", "/discover");
  await expect(page.locator("[data-mt-public-listings]")).not.toContainText("No current trades");
});

test("learning examples are separate from live registry results", async ({ page }) => {
  await page.goto("/wish-registry");
  const examples = page.locator("#registry-examples");
  await expect(examples.getByText("Animal welfare and poverty donor", { exact: true })).toBeHidden();
  await examples.locator("summary").click();
  await expect(examples.getByText("Animal welfare and poverty donor", { exact: true })).toBeVisible();
  await expect(examples).toContainText("not available participants or search results");
});

test("technical safety checks are optional while rules and reporting remain visible", async ({ page }) => {
  await page.goto("/safety");
  await expect(page.getByRole("heading", { name: "What every workflow must preserve" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Report a concern" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inspect the controls behind the claims" })).toBeHidden();
  await page.getByText("Technical controls and health checks", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Inspect the controls behind the claims" })).toBeVisible();
});
