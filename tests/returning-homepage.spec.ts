import { expect, test, type Page } from "@playwright/test";

async function openHome(page: Page) {
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
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

test.describe("Adaptive Feed", () => {
  test.use({ timezoneId: "UTC" });

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-07-16T15:00:00.000Z"));
  });

  test("renders the current signed-out desktop feed without demo recommendations", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1487, height: 1058 });
    await openHome(page);

    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.locator("#mt-live-document-heading")).toHaveText(
      "Current opportunities and next actions",
    );
    await expect(page.getByRole("heading", { level: 1, name: "What needs you now." })).toBeVisible();

    const primary = page.locator("header.topbar nav");
    await expect(primary).toBeVisible();
    await expect(primary.getByRole("button", { name: "Open personalized feed" })).toHaveText(
      "Feed",
    );
    await expect(primary.getByRole("button", { name: "Open Discover" })).toHaveText(
      "Discover",
    );
    await expect(primary.getByRole("button", { name: "Open Trade controls" })).toHaveText(
      "Controls",
    );
    await expect(primary.getByRole("button", { name: "Trade", exact: true })).toBeVisible();
    await expect(primary.getByRole("button", { name: "Commitments", exact: true })).toBeVisible();
    await expect(primary.getByRole("button", { name: "Open Evidence" })).toHaveText("Evidence");

    await expect(page.locator('button[data-action="command"]')).toBeVisible();
    await expect(page.locator('button[data-action="profile"]')).toHaveAccessibleName("Account");
    await expect(page.locator('button[data-action="create"]')).toContainText("Create offer");

    await expect(page.locator('button[data-now="focus"]')).toHaveClass(/active/);
    await expect(page.locator('button[data-now="plan"]')).toHaveText("Plan resources");
    await expect(page.locator('button[data-now="rules"]')).toHaveText("Standing rules");

    const date = page.locator(".head .date");
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
    await expect(
      feed.getByRole("heading", {
        level: 2,
        name: "Sign in to see a feed based on your moral priorities.",
      }),
    ).toBeVisible();
    await expect(feed.getByText("No profile loaded", { exact: true })).toBeVisible();
    await expect(feed.getByText("No recommendations shown", { exact: true })).toBeVisible();
    await expect(
      feed.getByText(
        "This page does not guess your priorities or substitute demo recommendations.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(feed.locator("[data-mt-live-now-recommendation]")).toHaveCount(0);

    await expect(feed.getByRole("link", { name: /Sign in/ })).toHaveAttribute(
      "href",
      "/login?returnTo=%2Ffeed",
    );
    await expect(feed.getByRole("link", { name: "Browse all live proposals →" })).toHaveAttribute(
      "href",
      "/offers?view=live",
    );
    await expect(feed.getByRole("link", { name: "Review profile →" })).toHaveAttribute(
      "href",
      "/complete-profile",
    );

    for (const rule of ["No guessed priorities", "No demo records", "No invented counterparties"]) {
      await expect(feed.getByText(rule, { exact: true })).toBeVisible();
    }

    await expect(page.getByTestId("home-offer-trade")).toHaveCount(0);
    await expect(page.getByRole("slider")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Recommended moral trade" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("routes the current Feed actions to Create and sign-in safely", async ({ page }) => {
    await page.setViewportSize({ width: 1487, height: 1058 });
    await openHome(page);

    await page.locator('button[data-action="create"]').click();
    await expect(page).toHaveURL(/\/trades\/new(?:[?#]|$)/, { timeout: 30_000 });

    await page.goto("/feed", { waitUntil: "domcontentloaded" });
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

    await expect(page.getByRole("heading", { level: 1, name: "What needs you now." })).toBeVisible();
    await expect(page.locator("header.topbar nav")).toBeVisible();
    await expect(page.locator('button[data-action="create"]')).toBeVisible();
    await expect(page.locator('[data-mt-live-now-state="signed_out"]')).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Sign in to see a feed based on your moral priorities.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign in/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Review profile →" })).toBeVisible();

    await expect(page.getByTestId("home-offer-trade")).toHaveCount(0);
    await expect(page.getByRole("slider")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
