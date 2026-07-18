import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectFullyInViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

test.describe("Returning-user homepage", () => {
  test.use({ timezoneId: "UTC" });

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-07-16T15:00:00.000Z"));
  });
  test("matches the approved desktop trade-deck contract", async ({ page }) => {
    await page.setViewportSize({ width: 1487, height: 1058 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/$/);

    const primary = page.getByRole("navigation", { name: "Primary" });
    await expect(primary.getByRole("link")).toHaveText([
      "Now",
      "Discover",
      "Offer",
      "Activity",
      "Account",
    ]);
    await expect(primary.getByRole("link", { name: "Now" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const accountMenu = page.getByRole("button", { name: "Open account menu" });
    await expect(accountMenu.getByTestId("account-avatar").locator("svg")).toBeVisible();

    await expect(page.getByText("A trade worth considering.", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText(
        "Your best match right now, based on your commitments and priorities.",
        { exact: true },
      ),
    ).toBeVisible();
    const localGreeting = page.getByTestId("local-date-greeting");
    await expect(localGreeting).toHaveAttribute("data-ready", "true");
    await expect(localGreeting.locator('time[datetime="2026-07-16"]')).toHaveText(
      "Thursday, July 16, 2026",
    );
    await expect(localGreeting.getByText("Good afternoon.", { exact: true })).toBeVisible();

    const recommendation = page.getByRole("region", { name: "Recommended moral trade" });
    const tradeCards = recommendation.locator("article");
    await expect(tradeCards).toHaveCount(2);

    const offeredCommitment = tradeCards.nth(0);
    const requestedCommitment = tradeCards.nth(1);
    await expect(offeredCommitment.getByText("You could offer", { exact: true })).toBeVisible();
    await expect(
      offeredCommitment.getByRole("heading", {
        level: 2,
        name: "Replace eight car trips with transit.",
      }),
    ).toBeVisible();
    await expect(offeredCommitment.getByText("Verifiable behavior change")).toBeVisible();
    await expect(offeredCommitment.getByRole("slider", { name: "Trips per month" })).toHaveValue(
      "8",
    );
    await expect(offeredCommitment.getByText("4 – 12 trips", { exact: true })).toBeVisible();
    await expect(offeredCommitment.getByText("Transit access", { exact: true })).toBeVisible();

    await expect(requestedCommitment.getByText("Mina would offer", { exact: true })).toBeVisible();
    await expect(
      requestedCommitment.getByRole("heading", {
        level: 2,
        name: "Fund $20 of open civic infrastructure.",
      }),
    ).toBeVisible();
    await expect(requestedCommitment.getByText("Verifiable financial contribution")).toBeVisible();
    await expect(requestedCommitment.getByRole("slider", { name: "Funding amount" })).toHaveValue(
      "20",
    );
    await expect(requestedCommitment.getByText("$10 – $30", { exact: true })).toBeVisible();
    await expect(requestedCommitment.getByText("Open governance", { exact: true })).toBeVisible();

    await expect(page.getByRole("button", { name: "Toggle the paired exchange" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const reasons = page.getByRole("region", { name: "Why this match exists" });
    for (const reason of [
      "Complementary priorities",
      "Both terms within rated ranges",
      "Mina’s track record",
      "96% on-time verification",
      "Proof method",
      "Expires",
    ]) {
      await expect(reasons.getByText(reason, { exact: true })).toBeVisible();
    }
    await expect(reasons.getByText("Jul 23, 2026", { exact: true })).toBeVisible();
    await expect(reasons.getByText("7 days left", { exact: true })).toBeVisible();

    const actions = page.getByRole("region", { name: "Trade actions" });
    await expect(actions.getByRole("link", { name: "Offer this trade" })).toHaveAttribute(
      "href",
      "/create?mode=trade",
    );
    await expect(actions.getByRole("link", { name: "Counter this trade" })).toHaveAttribute(
      "href",
      "/create?mode=trade",
    );
    await expect(actions.getByRole("button", { name: "Save" })).toBeVisible();
    await expect(actions.getByRole("button", { name: "Pass" })).toBeVisible();

    const filters = page.getByRole("complementary", { name: "More matches and filters" });
    await expect(filters.getByText("14 more matches", { exact: true })).toBeVisible();
    await expect(filters.getByRole("link", { name: "View all matches →" })).toHaveAttribute(
      "href",
      "/offers",
    );
    for (const filter of [
      "Transit access",
      "Open governance",
      "Climate action",
      "Animal welfare",
      "Economic equity",
      "Behavior change",
      "Financial contribution",
      "Advocacy",
    ]) {
      await expect(filters.getByRole("button", { name: filter, exact: true })).toBeVisible();
    }

    await expectFullyInViewport(page, actions);
    await expectFullyInViewport(page, filters);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight > document.documentElement.clientHeight,
      ),
    ).toBe(false);

    await expect(page.getByText("Do more good without agreeing.", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "Ways to use Moral Trade" }),
    ).toHaveCount(0);
    await expect(page.getByRole("img", { name: /Mutual-gain field/ })).toHaveCount(0);
  });

  test("keeps the approved controls interactive", async ({ page }) => {
    await page.setViewportSize({ width: 1487, height: 1058 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const trips = page.getByRole("slider", { name: "Trips per month" });
    const amount = page.getByRole("slider", { name: "Funding amount" });
    await trips.fill("10");
    await amount.fill("25");
    await expect(trips).toHaveValue("10");
    await expect(amount).toHaveValue("25");

    const pair = page.getByRole("button", { name: "Toggle the paired exchange" });
    await pair.click();
    await expect(pair).toHaveAttribute("aria-pressed", "false");

    const save = page.getByTestId("save-match");
    await save.click();
    await expect(save).toHaveAttribute("aria-pressed", "true");
    await expect(save).toContainText("Saved");

    await page.getByRole("button", { name: "Pass" }).click();
    await expect(page.getByText("13 more matches", { exact: true })).toBeVisible();
    await expect(save).toHaveAttribute("aria-pressed", "false");
    await expect(save).toContainText("Save");

    const transitFilter = page.getByRole("button", { name: "Transit access", exact: true });
    await transitFilter.click();
    await expect(transitFilter).toHaveAttribute("aria-pressed", "true");

    const behaviorFilter = page.getByRole("button", { name: "Behavior change", exact: true });
    await behaviorFilter.click();
    await expect(behaviorFilter).toHaveAttribute("aria-pressed", "true");

    const account = page.getByRole("button", { name: "Open account menu" });
    await account.click();
    await expect(account).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("menuitem", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  });

  test("stacks the trade deck without horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("A trade worth considering.", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
    await expect(page.getByRole("region", { name: "Recommended moral trade" }).locator("article"))
      .toHaveCount(2);
    await expect(page.getByRole("region", { name: "Trade actions" })).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "More matches and filters" }),
    ).toBeVisible();

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });
});
