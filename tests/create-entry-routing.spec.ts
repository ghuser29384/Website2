import { expect, test } from "@playwright/test";

const CANONICAL_FAVICON = "/brand/moral-trade-mark.png?v=20260730";

async function expectCanonicalFavicon(page: import("@playwright/test").Page) {
  await expect
    .poll(
      async () =>
        page.locator('head link[rel*="icon" i]').evaluateAll((links) =>
          links.map((link) => {
            const url = new URL((link as HTMLLinkElement).href);
            return `${url.pathname}${url.search}`;
          }),
        ),
      { timeout: 15_000 },
    )
    .toEqual(expect.arrayContaining([CANONICAL_FAVICON]));

  await expect
    .poll(
      async () =>
        page.locator('head link[rel*="icon" i]').evaluateAll(
          (links, canonicalFavicon) =>
            links.length > 0 &&
            links.every((link) => {
              const url = new URL((link as HTMLLinkElement).href);
              return `${url.pathname}${url.search}` === canonicalFavicon;
            }),
          CANONICAL_FAVICON,
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
}

async function completeMandatoryWalkthrough(page: import("@playwright/test").Page) {
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/walkthrough(?:\?|$)/);
  await expectCanonicalFavicon(page);
}

async function expectUnifiedCreate(page: import("@playwright/test").Page) {
  const frameElement = page.locator('[data-create-interface-frame="true"]');

  await expect(frameElement).toBeVisible();
  await expect(
    page
      .frameLocator('iframe[data-create-interface-frame="true"]')
      .getByRole("heading", { level: 1, name: "What do you want to improve?" }),
  ).toBeVisible();
  await expectCanonicalFavicon(page);
}

const feedFixture = {
  authenticated: true,
  generatedAt: "2026-07-29T17:00:00.000Z",
  matchingOfferCount: 1,
  matchingOpportunityCount: 1,
  feedOpportunityCount: 1,
  status: "ready",
  profile: {
    causes: ["Animal welfare"],
    weightedCauses: [],
    openToPayment: true,
    openToPledges: true,
    signalSources: ["Profile priorities"],
    learningEnabled: true,
    explorationPercent: 12,
    browsingSignalCount: 0,
    actionFeedbackCount: 0,
  },
  recommendations: [
    {
      id: "feed-identity-opportunity",
      opportunityType: "offer",
      exposureRequestId: "feed-identity-receipt",
      href: "/offers/feed-identity-opportunity",
      ctaLabel: "Review proposal",
      sourceLabel: "Moral trade",
      ownerAlias: "Feed participant",
      mode: "pledge",
      offeredCause: "Animal welfare",
      requestedCause: "Research communication",
      offerAction: "Fund reviewed animal-welfare work",
      requestAction: "Review one bounded public-safe brief",
      verification: "Public receipt and counterparty confirmation",
      duration: "Complete within 30 days",
      benefitCauses: ["Animal welfare"],
      actionCauses: ["Research communication"],
      actionLabel: "Review a bounded brief",
      matchCause: "Animal welfare",
      reason: "Matches your Animal welfare priority",
      difficulty: 2,
      difficultyLabel: "Moderate",
      willingness: 70,
      actionFitLabel: "Strong fit",
      saved: false,
      updatedAt: "2026-07-29T16:59:00.000Z",
    },
  ],
  ownedOpportunities: [],
  ownedOpportunityCount: 0,
  routePlanner: {
    status: "no_live",
    checkedAt: "2026-07-29T17:00:00.000Z",
    profile: {},
    needsMoreInput: [],
    routes: [],
    comparison: null,
    candidateCount: 0,
  },
};

test.describe("Home, Trade, and Create entry routing", () => {
  test("keeps the root route on the live Feed and opens Create from Trade", async ({ page }) => {
    await completeMandatoryWalkthrough(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/$/);
    await expectCanonicalFavicon(page);
    await expect(page.locator('[data-create-interface-frame="true"]')).toHaveCount(0);
    const tradeEntry = page.locator('[data-page="trade"]');
    await expect(tradeEntry).toBeVisible();

    await tradeEntry.click();

    await expect(page).toHaveURL(/\/trades\/new(?:\?|$)/);
    await expectUnifiedCreate(page);
  });

  test("replaces a direct legacy Trade hash without replacing Home", async ({ page }) => {
    await completeMandatoryWalkthrough(page);
    await page.goto("/#trade", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/trades\/new(?:\?|$)/);
    await expectUnifiedCreate(page);
  });

  test("keeps Create and Create Offer entries on the unified wizard", async ({ page }) => {
    await page.goto("/create?source=route-test", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/create\?source=route-test$/);
    await expectUnifiedCreate(page);

    await page.goto("/offers?view=templates", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/offers\?view=templates$/);
    await expectUnifiedCreate(page);
  });

  test("keeps Feed item and exposure identity on /feed without loading the obsolete Trade sidebar", async ({
    page,
  }) => {
    let liveNowRequests = 0;
    const obsoleteAssetRequests: string[] = [];

    page.on("request", (request) => {
      if (/moral-trade-live-trade-feed\.(?:js|css)/.test(request.url())) {
        obsoleteAssetRequests.push(request.url());
      }
    });
    await page.route("**/api/live-account", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ authenticated: true, account: { displayName: "Feed user" } }),
      }),
    );
    await page.route("**/api/live-now", (route) => {
      liveNowRequests += 1;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(feedFixture),
      });
    });

    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await expectCanonicalFavicon(page);

    const card = page.locator(
      '.mt-feed-card[data-feed-item-id="feed-identity-opportunity"]',
    );
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-opportunity-id", "feed-identity-opportunity");
    await expect(card).toHaveAttribute("data-opportunity-type", "offer");
    await expect(card).toHaveAttribute(
      "data-feed-item-key",
      "offer:feed-identity-opportunity",
    );
    await expect(card).toHaveAttribute(
      "data-exposure-request-id",
      "feed-identity-receipt",
    );
    await expect(page.locator("[data-mt-live-trade-feed]")).toHaveCount(0);
    expect(liveNowRequests).toBe(1);
    expect(obsoleteAssetRequests).toEqual([]);
  });

  test("fails malformed offer record routes closed before database rendering", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto("/offers/null?source=route-test", {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status()).toBe(404);
    await expect(page).toHaveURL(/\/offers\/null\?source=route-test$/);
    await expect(page.getByRole("heading", { level: 1, name: "Unavailable" })).toBeVisible();
    await expect(page.locator('a[href="/offers/null/credibility"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i,
    );
    expect(pageErrors).toEqual([]);
  });

  test("uses the canonical favicon on document-replacement routes", async ({ page }) => {
    for (const route of ["/feed", "/walkthrough", "/discover"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expectCanonicalFavicon(page);
    }
  });
});
