import { expect, test, type Page } from "@playwright/test";

async function openHome(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main#app")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible({ timeout: 30_000 });
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.clientWidth).toBe(dimensions.innerWidth);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
}

test.describe("Adaptive homepage", () => {
  test.use({ timezoneId: "UTC" });

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-07-16T15:00:00.000Z"));
  });

  test("renders the current signed-out desktop feed without demo recommendations", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1487, height: 1058 });
    await openHome(page);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("#mt-live-document-heading")).toHaveText(
      "Current opportunities and next actions",
    );
    await expect(page.getByRole("heading", { level: 1, name: "What needs you now." })).toHaveCount(0);

    const primary = page.locator("header.topbar nav");
    await expect(primary).toBeVisible();
    await expect(primary.getByRole("link")).toHaveText(["Feed", "Discover", "Messages", "Commitments"]);
    await expect(primary.getByRole("link", { name: "Feed", exact: true })).toHaveAttribute("href", "/feed");
    await expect(primary.getByRole("link", { name: "Discover", exact: true })).toHaveAttribute("href", "/discover");
    await expect(primary.getByRole("link", { name: "Messages", exact: true })).toHaveAttribute("href", "/messages");
    await expect(primary.getByText("100 Sparks")).toHaveCount(0);
    await expect(page.locator(".header-start")).toHaveText("Get Started");

    await expect(page.locator('button[data-action="command"]')).toHaveCount(0);
    await expect(page.locator('button[data-action="profile"]')).toHaveAccessibleName("Account");
    await expect(page.locator('button[data-action="create"]')).toContainText("Create a trade");

    await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible();
    await expect(page.locator('button[data-now="plan"]')).toHaveCount(0);
    await expect(page.locator('button[data-now="rules"]')).toHaveCount(0);

    const date = page.locator(".page .date");
    await expect(date).toHaveAttribute("data-mt-local-date-time", "2026-07-16");
    await expect(date.locator('time[data-mt-local-date="true"]')).toHaveAttribute(
      "datetime",
      "2026-07-16",
    );
    await expect(date.locator('time[data-mt-local-date="true"]')).toHaveText(
      "Thursday, July 16, 2026",
    );
    await expect(date.locator('[data-mt-local-greeting="true"]')).toHaveText(
      "Good afternoon.",
    );

    const feed = page.locator('[data-mt-live-now="adaptive"]');
    await expect(feed).toHaveAttribute("data-mt-live-now-state", "signed_out");
    await expect(feed.getByRole("link", { name: "Sign in for personal suggestions" })).toHaveAttribute("href", "/login?returnTo=%2Ffeed");
    await expect(feed.locator("[data-mt-live-now-recommendation]")).toHaveCount(0);
    await expect(feed.getByRole("link", { name: "Search and filter trades" })).toHaveAttribute("href", "/discover");
    await expect(feed).not.toContainText("Profile basis");
    await expect(feed).not.toContainText("Feed rule");
    await expect(feed).not.toContainText("This page does not guess your priorities");
    await expect(page.getByTestId("home-offer-trade")).toHaveCount(0);
    await expect(page.getByRole("slider")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Recommended moral trade" })).toHaveCount(0);

    await expectNoHorizontalOverflow(page);
  });

  test("routes the current homepage actions to Create and sign-in safely", async ({ page }) => {
    await page.setViewportSize({ width: 1487, height: 1058 });
    await openHome(page);

    await page.locator('button[data-action="create"]').click();
    await expect(page).toHaveURL(/\/trades\/new(?:[?#]|$)/, { timeout: 30_000 });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-mt-live-now-state="signed_out"]')).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("link", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(/\/login\?returnTo=%2Ffeed$/, { timeout: 30_000 });
  });

  test("stacks the adaptive signed-out feed without horizontal overflow on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHome(page);

    await expect(page.getByRole("heading", { level: 1, name: "What needs you now." })).toHaveCount(0);
    await expect(page.locator("header.topbar nav")).toBeVisible();
    await expect(page.locator('button[data-action="create"]')).toBeVisible();
    await expect(page.locator('[data-mt-live-now-state="signed_out"]')).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign in for personal suggestions" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign in/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Search and filter trades" })).toBeVisible();

    await expect(page.getByTestId("home-offer-trade")).toHaveCount(0);
    await expect(page.getByRole("slider")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
