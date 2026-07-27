import { expect, test } from "@playwright/test";

interface FeedFixtureOptions {
  id: string;
  ownerAlias: string;
  offeredCause: string;
  requestedCause: string;
  requestAction: string;
  offerAction: string;
  receipt: string;
  confidence: number;
}

function feedFixture(options: FeedFixtureOptions) {
  return {
    authenticated: true,
    generatedAt: "2026-07-27T09:00:00.000Z",
    matchingOfferCount: 1,
    matchingOpportunityCount: 1,
    feedOpportunityCount: 1,
    status: "ready",
    profile: {
      causes: [options.offeredCause],
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
        id: options.id,
        opportunityType: "offer",
        exposureRequestId: options.receipt,
        href: `/offers/${options.id}`,
        ctaLabel: "Review proposal",
        sourceLabel: "Moral trade",
        ownerId: `owner-${options.id}`,
        ownerAlias: options.ownerAlias,
        mode: "payment",
        offeredCause: options.offeredCause,
        requestedCause: options.requestedCause,
        compromiseCause: "Not needed",
        offerAction: options.offerAction,
        requestAction: options.requestAction,
        verification: "Public receipt and counterparty confirmation",
        duration: "Complete within 30 days",
        trustLevel: 3,
        createdAt: "2026-07-26T09:00:00.000Z",
        updatedAt: "2026-07-27T08:00:00.000Z",
        benefitCauses: [options.offeredCause],
        actionCauses: [options.requestedCause],
        actionLabel: "Complete the requested action",
        matchCause: options.offeredCause,
        matchClass: "direct",
        matchConfidence: options.confidence,
        reason: `Direct reciprocal match for your ${options.offeredCause} priority`,
        reasonDetails: [
          `The offered benefit overlaps with your ${options.offeredCause} priority.`,
        ],
        difficulty: 2.5,
        difficultyLabel: "Moderate",
        willingness: 60,
        actionFitLabel: "Strong fit",
        learnedActionSignalCount: 0,
        saved: false,
        score: 100,
      },
    ],
    ownedOpportunities: [],
    ownedOpportunityCount: 0,
    routePlanner: {
      status: "no_live",
      checkedAt: "2026-07-27T09:00:00.000Z",
      profile: {},
      needsMoreInput: [],
      routes: [],
      comparison: null,
      candidateCount: 0,
    },
    learningDiagnostics: {
      requestId: options.receipt,
      exposureWriteStatus: "written",
      mode: "heuristic",
      experiment: {
        enabled: false,
        arm: "not_assigned",
        stoppedByGuardrail: false,
      },
    },
  };
}

const accountFixture = {
  authenticated: true,
  account: {
    displayName: "Feed Tester",
    firstName: "Feed",
    initials: "FT",
    memberSince: null,
    completedCommitments: 0,
    currency: null,
    monthlySafeCap: null,
    paymentAccount: { configured: false, label: "Not configured" },
    notifications: { enabled: false, label: "Off" },
    publicTrustProfile: { enabled: false, label: "Private" },
    defaultPrivacy: "Strict",
    disputeResolution: null,
    standardTerms: { href: "/terms", label: "Current site terms" },
  },
};

const emptyFeed = {
  authenticated: true,
  generatedAt: "2026-07-27T09:00:00.000Z",
  matchingOfferCount: 0,
  matchingOpportunityCount: 0,
  feedOpportunityCount: 0,
  status: "no_matches",
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
  recommendations: [],
  ownedOpportunities: [],
  ownedOpportunityCount: 0,
  routePlanner: {
    status: "no_live",
    checkedAt: "2026-07-27T09:00:00.000Z",
    profile: {},
    needsMoreInput: [],
    routes: [],
    comparison: null,
    candidateCount: 0,
  },
  learningDiagnostics: {
    requestId: "receipt-empty",
    exposureWriteStatus: "skipped",
    mode: "heuristic",
    experiment: {
      enabled: false,
      arm: "not_assigned",
      stoppedByGuardrail: false,
    },
  },
};

test.describe("authenticated Feed-backed Trade builder", () => {
  test("two users receive different cards with the exact Feed IDs and exposure receipts", async ({
    page,
  }) => {
    let payload = feedFixture({
      id: "animal-opportunity",
      ownerAlias: "Avery N.",
      offeredCause: "Animal welfare",
      requestedCause: "Plant-based meals",
      requestAction: "Prepare three plant-based meals",
      offerAction: "Fund a reviewed animal-welfare project",
      receipt: "receipt-user-a",
      confidence: 91,
    });

    await page.route("**/api/live-account", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(accountFixture) }),
    );
    await page.route("**/api/live-now", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) }),
    );

    await page.goto("/moral-trade-live.html#trade", { waitUntil: "domcontentloaded" });

    const sidebar = page.locator('[data-mt-live-trade-feed="ready"]');
    await expect(sidebar).toBeVisible();
    let card = sidebar.locator('[data-feed-item-id="animal-opportunity"]');
    await expect(card).toHaveAttribute("data-feed-item-key", "offer:animal-opportunity");
    await expect(card).toHaveAttribute("data-opportunity-id", "animal-opportunity");
    await expect(card).toHaveAttribute("data-opportunity-type", "offer");
    await expect(card).toHaveAttribute("data-exposure-request-id", "receipt-user-a");
    await expect(card).toContainText("Avery N.");
    await expect(card).toContainText("Prepare three plant-based meals");
    await expect(card.getByRole("link", { name: "Review proposal →" })).toHaveAttribute(
      "href",
      "/offers/animal-opportunity",
    );

    payload = feedFixture({
      id: "ai-opportunity",
      ownerAlias: "Jordan K.",
      offeredCause: "AI safety",
      requestedCause: "Evaluation review",
      requestAction: "Review one bounded evaluation brief",
      offerAction: "Fund technical AI-safety evaluation work",
      receipt: "receipt-user-b",
      confidence: 84,
    });

    await page.reload({ waitUntil: "domcontentloaded" });

    card = page.locator(
      '[data-mt-live-trade-feed="ready"] [data-feed-item-id="ai-opportunity"]',
    );
    await expect(card).toHaveAttribute("data-feed-item-key", "offer:ai-opportunity");
    await expect(card).toHaveAttribute("data-exposure-request-id", "receipt-user-b");
    await expect(card).toContainText("Jordan K.");
    await expect(card).toContainText("Review one bounded evaluation brief");
    await expect(page.locator('[data-feed-item-id="animal-opportunity"]')).toHaveCount(0);
  });

  test("a zero-data user receives no cards and no legacy demo records", async ({ page }) => {
    await page.route("**/api/live-account", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(accountFixture) }),
    );
    await page.route("**/api/live-now", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(emptyFeed) }),
    );

    await page.goto("/moral-trade-live.html#trade", { waitUntil: "domcontentloaded" });

    const sidebar = page.locator('[data-mt-live-trade-feed="no_matches"]');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator("[data-feed-item-id]")).toHaveCount(0);
    await expect(sidebar.getByRole("region", { name: "No personalized Trade feed item" })).toBeVisible();
    await expect(sidebar).toContainText("No filler suggestions were added");

    for (const demoRecord of [
      "Alex R.",
      "Sam G.",
      "Riley P.",
      "Replaced 10 car trips",
      "1 pending counteroffer",
      "Today, 9:18 AM",
    ]) {
      await expect(sidebar.getByText(demoRecord, { exact: false })).toHaveCount(0);
    }
  });

  test("the Trade sidebar remains usable without horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const payload = feedFixture({
      id: "mobile-opportunity",
      ownerAlias: "Morgan P.",
      offeredCause: "Global health",
      requestedCause: "Research feedback",
      requestAction: "Review a short public-health research memo",
      offerAction: "Fund malaria prevention",
      receipt: "receipt-mobile",
      confidence: 79,
    });

    await page.route("**/api/live-account", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(accountFixture) }),
    );
    await page.route("**/api/live-now", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) }),
    );

    await page.goto("/moral-trade-live.html#trade", { waitUntil: "domcontentloaded" });

    const card = page.locator('[data-feed-item-id="mobile-opportunity"]');
    await expect(card).toBeVisible();
    await expect(card.getByRole("link", { name: "Review proposal →" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
