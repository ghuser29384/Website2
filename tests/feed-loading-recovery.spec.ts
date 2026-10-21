import { expect, test } from "@playwright/test";

const ready = {
  authenticated: true,
  status: "ready",
  generatedAt: "2026-10-04T20:00:00.000Z",
  profile: { causes: ["Animal welfare"] },
  recommendations: [{
    id: "slow-feed-fixture",
    offeredCause: "Animal welfare",
    requestedCause: "Volunteer time",
    offerAction: "Support a shelter",
    requestAction: "Volunteer for one hour",
    metadata: { mechanism: "published_offer" },
  }],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/live-account", (route) => route.fulfill({
    json: { authenticated: false },
  }));
});

test("a response arriving after eight seconds still renders without reloading", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let release: () => void = () => {};
  const responseReady = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/live-now", async (route) => {
    await responseReady;
    await route.fulfill({ json: ready });
  });
  await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#app")).toBeVisible();
  const feed = page.locator('[data-mt-live-now="adaptive"]');
  await page.waitForTimeout(8500);
  await expect(feed).not.toHaveAttribute("data-mt-live-now-state", "unavailable");
  release();
  await expect(feed).toHaveAttribute("data-mt-live-now-state", "ready");
  await expect(feed.getByRole("heading", { name: "Animal welfare", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Plan resources", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Focus", exact: true })).toHaveCount(0);
  await expect(feed).toHaveAttribute("data-mt-live-now-state", "ready");
  expect(errors).toEqual([]);
});

for (const failure of ["http", "auth-unavailable"] as const) {
  test(`automatically recovers from a temporary ${failure} failure`, async ({ page }) => {
    let calls = 0;
    // A quick API failure used to schedule its retry before document.open(),
    // which clears timers when the slightly slower shell replaces the document.
    await page.route("**/moral-trade-live-core.txt", async (route) => {
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fulfill({ response });
    });
    await page.route("**/api/live-now", (route) => {
      calls += 1;
      return route.fulfill(calls === 1
        ? failure === "http"
          ? { status: 503, json: { error: "temporary" } }
          : { json: { authenticated: false, status: "unavailable", recommendations: [] } }
        : { json: ready });
    });
    await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-mt-live-now="adaptive"]'))
      .toHaveAttribute("data-mt-live-now-state", "ready");
    expect(calls).toBe(2);
  });
}

test("persistent errors stop retrying and Try again starts a fresh request", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let calls = 0;
  let recovered = false;
  await page.route("**/api/live-now", (route) => {
    calls += 1;
    return route.fulfill(recovered ? { json: ready } : { status: 503, json: {} });
  });
  await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-mt-live-now="adaptive"]'))
    .toHaveAttribute("data-mt-live-now-state", "unavailable");
  expect(calls).toBe(2);
  recovered = true;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator('[data-mt-live-now="adaptive"]'))
    .toHaveAttribute("data-mt-live-now-state", "ready");
  expect(calls).toBe(3);
});
