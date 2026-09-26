import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`only live Feed and Plan are reachable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "What needs you now." })).toHaveCount(0);
    await expect(page.locator('[data-now="rules"]')).toHaveCount(0);
    await expect(page.getByText("Recent commands", { exact: true })).toHaveCount(0);
    await page.locator('[data-now="plan"]').click();
    await expect(page.locator('[data-mt-live-route-planner="true"]')).toBeVisible();
    await expect(page.getByText("Sign in to see your routes.", { exact: true })).toBeVisible();
    await expect(page.locator("[data-mt-custom-route]")).toHaveCount(0);
    await page.locator('[data-now="focus"]').click();
    await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible();
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`clean-home-${width}.png`), fullPage: true });
    const commitments = page.locator('[data-mt-primary-links] a[href="/commitments"]');
    await expect(commitments).toHaveAccessibleName("Commitments");
    await commitments.click();
    await expect(page).toHaveURL(/\/commitments$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("$18,760 total", { exact: true })).toHaveCount(0);
  });
}

test("legacy activity hash opens real commitments before loading any simulated view", async ({ page }) => {
  const fetchedCore: string[] = [];
  page.on("request", request => { if (/mt-live-|live-core/.test(request.url())) fetchedCore.push(request.url()); });
  await page.goto("/moral-trade-live.html#activity");
  await expect(page).toHaveURL(/\/commitments$/);
  expect(fetchedCore).toEqual([]);
  await expect(page.locator('[data-activity="ledger"]')).toHaveCount(0);
});

test("command center starts empty, with one user-authored draft action and no pretend history", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible();
  await page.getByRole("button", { name: /Command$/ }).click();
  const drawer = page.locator("#drawer");
  await expect(drawer.getByLabel("Describe the proposed exchange")).toHaveValue("");
  await expect(drawer.locator('[data-action="from-command"]')).toHaveCount(1);
  await expect(drawer.getByRole("button", { name: "Run", exact: true })).toHaveCount(0);
  await expect(drawer).not.toContainText("Counter Mina");
  await expect(drawer).not.toContainText("Recent commands");
  await drawer.getByRole("button", { name: "Build this offer" }).click();
  await expect(drawer.getByRole("alert")).toContainText("Describe both sides");
  await expect(page).toHaveURL(/\/$/);
  await page.screenshot({ path: testInfo.outputPath("empty-command.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(page.locator("#overlay")).not.toHaveClass(/open/);
});

test("retired source bundles are unavailable over HTTP", async ({ request }) => {
  for (const path of ["/mt-live-0d0e0f03-0a.txt", "/mt-verify-f01a8b07-a.txt", "/moral-trade-live-verification.js", "/moral-trade-live-plan-reset.js"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});
