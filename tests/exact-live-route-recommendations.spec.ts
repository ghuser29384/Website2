import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`resource limits live in Profile and save only the chosen limits at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    let saved: unknown;
    await page.route("**/api/live-now", route => route.fulfill({ json: {
      authenticated: true, routePlanner: { status: "ready", profile: {
        moneyBudgetCents: 4000, timeBudgetMinutes: 60, actionBudgetCount: 3, horizon: "month",
      } },
    } }));
    await page.route("**/api/live-now/route-profile", async route => {
      saved = route.request().postDataJSON();
      await route.fulfill({ json: { authenticated: true, saved: true } });
    });
    await page.goto("/complete-profile");
    await page.getByText("Optional resource limits", { exact: true }).click();
    await expect(page.getByLabel("Money limit (USD)")).toHaveValue("40");
    await page.getByLabel("Money limit (USD)").fill("25.50");
    await page.getByLabel("Time limit (minutes)").fill("30");
    await page.getByRole("button", { name: "Save limits", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Your resource limits are saved." })).toBeVisible();
    expect(saved).toEqual({ action: "save_profile", profile: { moneyBudgetCents: 2550, timeBudgetMinutes: 30, actionBudgetCount: 3, horizon: "month" } });
    await expect(page.locator("nextjs-portal")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`profile-limits-${width}.png`), fullPage: true });
  });
}

test("unavailable limits cannot be overwritten with invented defaults", async ({ page }) => {
  await page.route("**/api/live-now", route => route.fulfill({ status: 503, json: { authenticated: true, routePlanner: { status: "unavailable" } } }));
  await page.goto("/complete-profile");
  await page.getByText("Optional resource limits", { exact: true }).click();
  await expect(page.getByText("We couldn’t load your limits. Please try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save limits", exact: true })).toHaveCount(0);
});

test("resource limits ask signed-out visitors to sign in", async ({ page }) => {
  await page.route("**/api/live-now", route => route.fulfill({ json: { authenticated: false } }));
  await page.goto("/complete-profile");
  await page.getByText("Optional resource limits", { exact: true }).click();
  await expect(page.getByRole("link", { name: "Sign in to manage your limits" })).toHaveAttribute("href", "/login?returnTo=%2Fcomplete-profile");
  await expect(page.getByRole("button", { name: "Save limits", exact: true })).toHaveCount(0);
});
