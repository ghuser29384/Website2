import { expect, test } from "@playwright/test";

function recommendationFixture({
  cause,
  id,
  opportunityType = "offer",
  offeredCause,
  offerAction,
  requestedCause,
  requestAction,
  verification = "Public receipt and counterparty confirmation",
  duration = "Complete within 30 days",
  metadata,
}: {
  cause: string;
  id: string;
  opportunityType?: "offer" | "donation_redirect" | "donation_pool";
  offeredCause: string;
  offerAction?: string;
  requestedCause: string;
  requestAction?: string;
  verification?: string;
  duration?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const mode = opportunityType === "offer" ? "payment" : "offset";
  return {
    authenticated: true,
    generatedAt: "2026-07-20T12:00:00.000Z",
    matchingOfferCount: 1,
    matchingOpportunityCount: 1,
    profile: {
      causes: [cause],
      weightedCauses: [
        { cause, weight: 96, source: "explicit_priority", rank: 1 },
      ],
      openToPayment: true,
      openToPledges: true,
      signalSources: ["Weighted profile priorities"],
      learningEnabled: true,
      explorationPercent: 12,
      browsingSignalCount: 2,
      actionFeedbackCount: 1,
    },
    recentChanges: [
      {
        cause,
        count: 1,
        label: `${cause} · 1 opportunity new or updated`,
      },
    ],
    recommendations: [
      {
        id,
        opportunityType,
        href:
          opportunityType === "donation_pool"
            ? `/donation-offsets?pool=${id}`
            : `/offers/${id}`,
        ctaLabel:
          opportunityType === "donation_pool"
            ? "Review redirect pool"
            : opportunityType === "donation_redirect"
              ? "Review donation redirect"
              : "Review proposal",
        sourceLabel:
          opportunityType === "donation_pool"
            ? "Donation redirect pool"
            : opportunityType === "donation_redirect"
              ? "Donation redirect"
              : "Paid moral trade",
        ownerId: `owner-${id}`,
        ownerAlias: "Live participant",
        mode,
        offeredCause,
        requestedCause,
        compromiseCause: "Not needed",
        offerAction: offerAction ?? `Deliver a reviewed ${offeredCause.toLowerCase()} project`,
        requestAction: requestAction ?? `Support ${requestedCause.toLowerCase()}`,
        verification,
        duration,
        trustLevel: 3,
        createdAt: "2026-07-19T12:00:00.000Z",
        updatedAt: "2026-07-20T10:00:00.000Z",
        matchCause: cause,
        reason: `Matches your ${cause} priority`,
        reasonDetails: [
          `The offered benefit overlaps with your ${cause} priority.`,
          "The initial burden estimate is moderate; you can correct it.",
        ],
        actionLabel: "Complete the requested action",
        difficulty: 2.8,
        difficultyLabel: "Moderate",
        willingness: 50,
        actionFitLabel: "Possible fit",
        learnedActionSignalCount: 0,
        saved: false,
        score: 100,
        metadata,
      },
    ],
    status: "ready",
  };
}

test.describe("adaptive moral-opportunity Now feed", () => {
  test("renders different live opportunities for disjoint profiles and survives a tab rerender", async ({
    page,
  }) => {
    let fixture = recommendationFixture({
      cause: "Animal welfare",
      id: "animal-offer",
      offeredCause: "Animal welfare",
      requestedCause: "Plant-based meal evidence",
      requestAction: "Do not eat meat for one month",
    });

    await page.route("**/api/live-now", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(fixture) }),
    );
    await page.route("**/api/live-now/feedback", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify({ acceptedEventCount: 1 }) }),
    );
    await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });

    const personalized = page.locator('[data-mt-live-now="adaptive"]');
    await expect(personalized).toHaveAttribute("data-mt-live-now-state", "ready");
    await expect(personalized.getByRole("heading", { name: "Animal welfare" })).toBeVisible();
    await expect(personalized).toContainText("Do not eat meat for one month");
    await expect(personalized).toContainText("Matches your Animal welfare priority");
    await expect(personalized).toContainText("Why this match");
    await expect(personalized.locator('a[href="/offers/animal-offer"]')).toHaveCount(1);
    const tuneRecommendation = personalized.locator(
      'summary[aria-label="Tune this recommendation"]',
    );
    await expect(tuneRecommendation).toHaveCount(1);
    await tuneRecommendation.click();
    await expect(personalized.getByRole("button", { name: "Easy for me" })).toBeVisible();
    await expect(personalized.getByRole("button", { name: "Hard for me" })).toBeVisible();
    await expect(page.getByText("Counteroffer from Mina.", { exact: true })).toHaveCount(0);
    await expect(page.getByText("AI-safety research under $100.", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Plan resources" }).click();
    await page.getByRole("button", { name: "Focus" }).click();
    await expect(personalized.getByRole("heading", { name: "Animal welfare" })).toBeVisible();

    fixture = recommendationFixture({
      cause: "AI safety",
      id: "ai-offer",
      offeredCause: "AI safety",
      requestedCause: "Evaluation tooling",
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(personalized.getByRole("heading", { name: "AI safety" })).toBeVisible();
    await expect(personalized).toContainText("Support evaluation tooling");
    await expect(personalized).toContainText("Matches your AI safety priority");
    await expect(personalized).not.toContainText("Do not eat meat for one month");
  });

  test("interleaves Action, Redirect, and Public Goods as compact visual cards", async ({
    page,
  }) => {
    const actionPayload = recommendationFixture({
      cause: "Existential risk",
      id: "action-card",
      offeredCause: "Existential risk reduction",
      requestedCause: "Research feedback",
      requestAction: "Review one bounded research brief",
    });
    const redirect = recommendationFixture({
      cause: "Existential risk",
      id: "redirect-card",
      opportunityType: "donation_redirect",
      offeredCause: "Existential risk research",
      offerAction: "Redirect a planned donation toward existential-risk research",
      requestedCause: "Animal welfare",
      requestAction: "Avoid meat for exactly three meals",
    }).recommendations[0];
    const publicGoods = recommendationFixture({
      cause: "Existential risk",
      id: "public-goods-card",
      opportunityType: "donation_pool",
      offeredCause: "Shared safety research",
      offerAction: "Matched planned donations support the shared project",
      requestedCause: "Either side of the pool",
      requestAction: "Join with a planned donation",
      verification: "Pool evidence terms",
      duration: "Closes in 9 days",
      metadata: { assuranceMinimumCents: 100000, offsetRatio: 1 },
    }).recommendations[0];
    const payload = {
      ...actionPayload,
      matchingOfferCount: 3,
      matchingOpportunityCount: 3,
      recommendations: [actionPayload.recommendations[0], redirect, publicGoods],
    };

    await page.route("**/api/live-now", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) }),
    );
    await page.route("**/api/live-now/feedback", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ acceptedEventCount: 1 }),
      }),
    );
    await page.goto("/feed", { waitUntil: "domcontentloaded" });

    const stream = page.locator(".mt-social-feed");
    await expect(stream).toHaveCount(1);
    await expect(stream.locator(".mt-feed-card")).toHaveCount(3);
    await expect(stream.locator('[data-opportunity-type="offer"]')).toContainText("Action");
    const redirectCard = stream.locator('[data-opportunity-type="donation_redirect"]');
    await expect(redirectCard).toContainText("Redirect");
    await expect(redirectCard).toContainText("Avoid meat for exactly three meals");
    const publicGoodsCard = stream.locator('[data-opportunity-type="donation_pool"]');
    await expect(publicGoodsCard).toContainText("Public Goods");
    await expect(publicGoodsCard).toContainText(
      "Your contribution helps the group reach the $1,000 threshold.",
    );
    await expect(publicGoodsCard).not.toContainText("You unlock the shared threshold");
    await expect(stream.locator(".mt-feed-summary, .mt-feed-exchange-block")).toHaveCount(0);

    const actionCard = stream.locator('[data-opportunity-id="action-card"]');
    await expect
      .poll(() =>
        actionCard.evaluate((element) => ({
          height: element.getBoundingClientRect().height,
          minHeight: getComputedStyle(element).minHeight,
        })),
      )
      .toMatchObject({ minHeight: "0px" });
    const compactCardBox = await actionCard.boundingBox();
    expect(compactCardBox).not.toBeNull();
    expect(compactCardBox!.height).toBeLessThan(315);
    await expect(
      actionCard.getByText("Public receipt and counterparty confirmation"),
    ).toBeHidden();
    await actionCard.locator("details.mt-feed-details > summary").click();
    await expect(
      actionCard.getByText("Public receipt and counterparty confirmation"),
    ).toBeVisible();
    await expect(actionCard.locator("a.btn.primary")).toHaveCount(1);
    await expect(redirectCard.locator("a.btn.primary")).toHaveCount(1);
    await expect(publicGoodsCard.locator("a.btn.primary")).toHaveCount(1);
  });

  test("keeps the compact ready-state cards usable on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const payload = recommendationFixture({
      cause: "Animal welfare",
      id: "mobile-redirect",
      opportunityType: "donation_redirect",
      offeredCause: "Existential risk research",
      offerAction: "Redirect a planned donation toward existential-risk research",
      requestedCause: "Animal welfare",
      requestAction:
        "Avoid meat for exactly three meals and submit the agreed counterparty confirmation",
    });
    await page.route("**/api/live-now", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) }),
    );
    await page.route("**/api/live-now/feedback", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ acceptedEventCount: 1 }),
      }),
    );
    await page.goto("/feed", { waitUntil: "domcontentloaded" });

    const card = page.locator('[data-opportunity-id="mobile-redirect"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText("Avoid meat for exactly three meals");
    await expect(card.locator("a.btn.primary")).toBeVisible();
    const bottomNav = page.locator(".topbar nav");
    await expect(bottomNav).toBeVisible();
    await expect
      .poll(() =>
        bottomNav.evaluate((element) => ({
          position: getComputedStyle(element).position,
          zIndex: Number(getComputedStyle(element).zIndex),
        })),
      )
      .toMatchObject({ position: "fixed", zIndex: 50 });
    const settingsSummary = page.locator('summary[aria-label="Open feed settings"]');
    await expect(settingsSummary).toBeVisible();
    await settingsSummary.click();
    const settingsPanel = page.locator(".mt-feed-settings-popover");
    await expect(settingsPanel).toBeVisible();
    const [settingsBox, bottomNavBox] = await Promise.all([
      settingsPanel.boundingBox(),
      bottomNav.boundingBox(),
    ]);
    expect(settingsBox).not.toBeNull();
    expect(bottomNavBox).not.toBeNull();
    expect(settingsBox!.y + settingsBox!.height).toBeLessThanOrEqual(bottomNavBox!.y);
    await settingsSummary.click();

    await card.locator('summary[aria-label="Tune this recommendation"]').click();
    const feedbackPanel = card.locator(".mt-feed-overflow > div");
    await expect(feedbackPanel).toBeVisible();
    const [feedbackBox, currentBottomNavBox] = await Promise.all([
      feedbackPanel.boundingBox(),
      bottomNav.boundingBox(),
    ]);
    expect(feedbackBox).not.toBeNull();
    expect(currentBottomNavBox).not.toBeNull();
    expect(feedbackBox!.y + feedbackBox!.height).toBeLessThanOrEqual(
      currentBottomNavBox!.y,
    );
    await card.getByRole("button", { name: "Hard for me" }).click();
    await expect(card.getByRole("button", { name: "Hard for me" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("records direct action-difficulty feedback and removes unwanted cards locally", async ({ page }) => {
    const payloads: string[] = [];
    await page.route("**/api/live-now", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          recommendationFixture({
            cause: "Animal welfare",
            id: "animal-offer",
            offeredCause: "Existential risk",
            requestedCause: "Animal welfare",
            requestAction: "Do not eat meat for one month",
          }),
        ),
      }),
    );
    await page.route("**/api/live-now/feedback", async (route) => {
      if (route.request().method() === "POST") payloads.push(route.request().postData() ?? "");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ acceptedEventCount: 1 }),
      });
    });

    await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });
    const card = page.locator('[data-opportunity-id="animal-offer"]');
    await card.locator('summary[aria-label="Tune this recommendation"]').click();
    await card.getByRole("button", { name: "Hard for me" }).click();
    await expect(card.getByRole("button", { name: "Hard for me" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await card.getByRole("button", { name: "Less like this" }).click();
    await expect(card).toBeHidden();
    await expect.poll(() => payloads.join("\n")).toContain('"eventType":"hard"');
    await expect.poll(() => payloads.join("\n")).toContain('"eventType":"not_for_me"');
  });

  test("rolls back Save, difficulty, and Show less when the API accepts zero events", async ({
    page,
  }) => {
    await page.route("**/api/live-now", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          recommendationFixture({
            cause: "Animal welfare",
            id: "rollback-offer",
            offeredCause: "Existential risk",
            requestedCause: "Animal welfare",
            requestAction: "Avoid meat for one week",
          }),
        ),
      }),
    );
    await page.route("**/api/live-now/feedback", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ authenticated: true, acceptedEventCount: 0 }),
      }),
    );

    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    const feed = page.locator('[data-mt-live-now="adaptive"]');
    await expect(feed).toHaveAttribute("data-bound", "true");
    const card = feed.locator('[data-opportunity-id="rollback-offer"]');
    const save = card.getByRole("button", { name: "Save opportunity" });

    await save.click();
    await expect(card.getByRole("button", { name: "Save opportunity" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(feed.getByRole("status")).toContainText(
      "Could not save that change. Your feed was not updated.",
    );

    await card.locator('summary[aria-label="Tune this recommendation"]').click();
    const hard = card.getByRole("button", { name: "Hard for me" });
    await hard.click();
    await expect(hard).toHaveAttribute("aria-pressed", "false");
    await expect(feed.getByRole("status")).toContainText(
      "Could not save that rating. Your feed was not updated.",
    );

    await card.getByRole("button", { name: "Less like this" }).click();
    await expect(card).toBeVisible();
    await expect(feed.locator(".mt-feed-empty-inline")).toHaveCount(0);
    await expect(feed.getByRole("status")).toContainText(
      "Could not hide that opportunity. Your feed was not updated.",
    );
  });

  test("shows a truthful signed-out state with no demo recommendations", async ({ page }) => {
    await page.route("**/api/live-now", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: false,
          generatedAt: "2026-07-20T12:00:00.000Z",
          matchingOpportunityCount: 0,
          profile: {
            causes: [],
            weightedCauses: [],
            openToPayment: null,
            openToPledges: null,
            signalSources: [],
            learningEnabled: true,
          },
          recentChanges: [],
          recommendations: [],
          status: "signed_out",
        }),
      }),
    );
    await page.goto("/feed", { waitUntil: "domcontentloaded" });

    const personalized = page.locator('[data-mt-live-now="adaptive"]');
    await expect(page).toHaveURL(/\/feed$/);
    await expect(personalized).toHaveAttribute("data-mt-live-now-state", "signed_out");
    await expect(personalized).toContainText(
      "Sign in to see a feed based on your moral priorities.",
    );
    await expect(personalized).toContainText("No recommendations shown");
    await expect(personalized.getByRole("link", { name: "Sign in →" })).toHaveAttribute(
      "href",
      "/login?returnTo=%2Ffeed",
    );
    await expect(page.getByText("Counteroffer from Mina.", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Your $10 could activate $9,990.", { exact: true })).toHaveCount(0);
  });

  test("keeps the mobile fallback within the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/live-now", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: true,
          generatedAt: "2026-07-20T12:00:00.000Z",
          matchingOpportunityCount: 0,
          profile: {
            causes: ["Global health"],
            weightedCauses: [
              { cause: "Global health", weight: 92, source: "explicit_priority", rank: 1 },
            ],
            openToPayment: true,
            openToPledges: true,
            signalSources: ["Weighted profile priorities"],
            learningEnabled: true,
          },
          recentChanges: [],
          recommendations: [],
          status: "no_matches",
        }),
      }),
    );
    await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });

    const personalized = page.locator('[data-mt-live-now="adaptive"]');
    await expect(personalized).toHaveAttribute("data-mt-live-now-state", "no_matches");
    await expect(personalized).toContainText("No open opportunity currently matches your profile.");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("exposes a real Feed route and keeps owned listings useful without calling them matches", async ({
    page,
  }) => {
    await page.route("**/api/live-now", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: true,
          generatedAt: "2026-07-21T16:00:00.000Z",
          matchingOpportunityCount: 0,
          profile: {
            causes: ["Cause prioritization"],
            weightedCauses: [
              {
                cause: "Cause prioritization",
                weight: 98,
                source: "explicit_priority",
                rank: 1,
              },
            ],
            openToPayment: true,
            openToPledges: true,
            signalSources: ["Weighted profile priorities"],
            learningEnabled: true,
          },
          recentChanges: [],
          recommendations: [],
          ownedOpportunityCount: 1,
          ownedOpportunities: [
            {
              id: "owned-offer",
              opportunityType: "offer",
              href: "/trades/owned-offer/manage",
              ctaLabel: "Manage & invite",
              sourceLabel: "Your live offer",
              ownerAlias: "Ellen",
              offeredCause: "Cause prioritization",
              requestedCause: "Research feedback",
              offerAction: "Share a reviewed prioritization brief",
              requestAction: "Provide bounded research feedback",
              verification: "Public link and counterparty confirmation",
              duration: "Complete within 30 days",
              summary: "Without an agreement, neither action is assumed to occur.",
              updatedAt: "2026-07-21T15:00:00.000Z",
            },
          ],
          status: "no_matches",
        }),
      }),
    );

    await page.goto("/feed", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByRole("button", { name: "Open personalized feed" })).toHaveText(
      "Feed",
    );
    const feed = page.locator('[data-mt-live-now="adaptive"]');
    await expect(feed).toHaveAttribute("data-mt-live-now-state", "no_matches");
    const owned = feed.getByRole("region", { name: "Your live listings" });
    await expect(owned.getByRole("heading", { name: "Cause prioritization" })).toBeVisible();
    await expect(owned).toContainText("Provide bounded research feedback");
    await expect(feed.getByRole("link", { name: "Manage & invite →" })).toHaveAttribute(
      "href",
      "/trades/owned-offer/manage",
    );
    await expect(feed.getByText("Shown here as your own listing, not as a match")).toBeVisible();
    await expect(feed.getByRole("button", { name: "Easy for me" })).toHaveCount(0);
    await expect(feed.getByRole("button", { name: "Hard for me" })).toHaveCount(0);
  });

  test("exposes Evidence as a first-class destination after Commitments", async ({ page }) => {
    await page.setViewportSize({ width: 1230, height: 900 });
    await page.route("**/api/live-now", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: false,
          generatedAt: "2026-07-22T12:00:00.000Z",
          matchingOpportunityCount: 0,
          profile: {
            causes: [],
            weightedCauses: [],
            openToPayment: null,
            openToPledges: null,
            signalSources: [],
            learningEnabled: true,
          },
          recentChanges: [],
          recommendations: [],
          status: "signed_out",
        }),
      }),
    );

    await page.goto("/feed", { waitUntil: "domcontentloaded" });

    const navigation = page.locator(".topbar nav").first();
    await expect(navigation.locator("button, a")).toHaveText([
      "Feed",
      "Discover",
      "Controls",
      "Trade",
      "Commitments",
      "Evidence",
    ]);

    const evidence = navigation.getByRole("button", { name: "Open Evidence" });
    await expect(evidence).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await evidence.click();
    await expect(page).toHaveURL(/\/evidence$/);
    await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Verified outcomes, without public evidence dossiers.",
      exact: true,
    }),
  ).toBeVisible();
  });
});
