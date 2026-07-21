import { expect, test } from "@playwright/test";

function recommendationFixture({
  cause,
  id,
  offeredCause,
  requestedCause,
  requestAction,
}: {
  cause: string;
  id: string;
  offeredCause: string;
  requestedCause: string;
  requestAction?: string;
}) {
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
        opportunityType: "offer",
        href: `/offers/${id}`,
        ctaLabel: "Review proposal",
        sourceLabel: "Paid moral trade",
        ownerId: `owner-${id}`,
        ownerAlias: "Live participant",
        mode: "payment",
        offeredCause,
        requestedCause,
        compromiseCause: "Not needed",
        offerAction: `Deliver a reviewed ${offeredCause.toLowerCase()} project`,
        requestAction: requestAction ?? `Support ${requestedCause.toLowerCase()}`,
        verification: "Public receipt and counterparty confirmation",
        duration: "Complete within 30 days",
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
    await expect(personalized).toContainText("Animal welfare ↔ Plant-based meal evidence");
    await expect(personalized).toContainText("Matches your Animal welfare priority");
    await expect(personalized).toContainText("Why this is in your feed");
    await expect(personalized.locator('a[href="/offers/animal-offer"]')).toHaveCount(1);
    await expect(personalized.getByRole("button", { name: "Easy for me" })).toHaveCount(1);
    await expect(personalized.getByRole("button", { name: "Hard for me" })).toHaveCount(1);
    await expect(page.getByText("Counteroffer from Mina.", { exact: true })).toHaveCount(0);
    await expect(page.getByText("AI-safety research under $100.", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Plan resources" }).click();
    await page.getByRole("button", { name: "Focus" }).click();
    await expect(personalized).toContainText("Animal welfare ↔ Plant-based meal evidence");

    fixture = recommendationFixture({
      cause: "AI safety",
      id: "ai-offer",
      offeredCause: "AI safety",
      requestedCause: "Evaluation tooling",
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(personalized).toContainText("AI safety ↔ Evaluation tooling");
    await expect(personalized).toContainText("Matches your AI safety priority");
    await expect(personalized).not.toContainText("Plant-based meal evidence");
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
      await route.fulfill({ contentType: "application/json", body: "{}" });
    });

    await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });
    const card = page.locator('[data-opportunity-id="animal-offer"]');
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
    await expect(feed.getByRole("region", { name: "Your live listings" })).toContainText(
      "Cause prioritization ↔ Research feedback",
    );
    await expect(feed.getByRole("link", { name: "Manage & invite →" })).toHaveAttribute(
      "href",
      "/trades/owned-offer/manage",
    );
    await expect(feed.getByText("Shown here as your own listing, not as a match")).toBeVisible();
    await expect(feed.getByRole("button", { name: "Easy for me" })).toHaveCount(0);
    await expect(feed.getByRole("button", { name: "Hard for me" })).toHaveCount(0);
  });
});
