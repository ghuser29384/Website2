import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.max(
          document.documentElement.scrollWidth,
          document.body?.scrollWidth ?? 0,
        ) <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
}

const feedFixture = {
  authenticated: true,
  generatedAt: "2026-08-11T18:00:00.000Z",
  matchingOfferCount: 1,
  matchingOpportunityCount: 1,
  feedOpportunityCount: 2,
  synthesizedOpportunityCount: 1,
  status: "ready",
  profile: {
    causes: ["AI governance"],
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
      id: "published-opportunity-1",
      opportunityType: "offer",
      exposureRequestId: "published-exposure-1",
      href: "/offers/published-opportunity-1",
      ctaLabel: "Review proposal",
      sourceLabel: "Moral trade",
      ownerAlias: "Verified participant",
      mode: "pledge",
      offeredCause: "AI governance",
      requestedCause: "Research communication",
      offerAction: "Fund a bounded policy brief",
      requestAction: "Review the brief",
      verification: "Receipt and counterparty confirmation",
      duration: "30 days",
      benefitCauses: ["AI governance"],
      actionCauses: ["Research communication"],
      actionLabel: "Review a bounded brief",
      matchCause: "AI governance",
      reason: "Matches your AI governance priority",
      difficulty: 2,
      difficultyLabel: "Moderate",
      willingness: 70,
      actionFitLabel: "Strong fit",
      saved: false,
      updatedAt: "2026-08-11T17:59:00.000Z",
      metadata: { origin: "published" },
    },
    {
      id: "synth:ai-governance-advocacy-operations:ai-governance",
      opportunityType: "offer",
      exposureRequestId: "synth-exposure-1",
      href: "/suggested-opportunities/ai-governance-advocacy-operations",
      ctaLabel: "Review possibility",
      sourceLabel: "Potential mixed moral trade · Unconfirmed",
      ownerAlias: "No counterparty confirmed",
      mode: "pledge",
      offeredCause: "Stronger AI-governance execution",
      requestedCause: "Mature advocacy, coalition, and policy operations",
      offerAction: "Training, coalition playbooks, policy campaign planning, and bounded operational support",
      requestAction: "Review what you could offer and what evidence would confirm the bottleneck",
      verification: "Organization confirmation, authority, consent, additionality, and completion evidence",
      duration: "Potential opportunity · Terms not negotiated",
      benefitCauses: ["AI governance"],
      actionCauses: ["policy operations"],
      actionLabel: "Review a generated possibility",
      matchCause: "AI governance",
      reason: "The atlas identifies a plausible resource complementarity",
      difficulty: 3,
      difficultyLabel: "High",
      willingness: 62,
      actionFitLabel: "Investigate",
      saved: false,
      updatedAt: "2026-08-11T18:00:00.000Z",
      metadata: {
        origin: "platform_generated",
        moralTradeStatus: "unconfirmed",
        verifiedCounterparty: false,
        liveOffer: false,
      },
    },
  ],
  ownedOpportunities: [],
  ownedOpportunityCount: 0,
  routePlanner: {
    status: "no_live",
    checkedAt: "2026-08-11T18:00:00.000Z",
    profile: {},
    needsMoreInput: [],
    routes: [],
    comparison: null,
    candidateCount: 0,
  },
};

test.describe("Bottleneck Atlas and generated feed", () => {
  test("works as a compact match finder with evidence available on demand", async ({ page }) => {
    await page.goto("/bottleneck-atlas", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1, name: "Find a trade." })).toBeVisible();
    await expect(page.locator("[data-atlas-mvp]")).toBeVisible();
    await expect(page.locator("[data-atlas-empty-state]")).toBeVisible();
    await expect(page.locator("[data-atlas-match]")).toHaveCount(0);

    await page.locator("[data-atlas-offer-select]").selectOption("funding");
    await page.locator("[data-atlas-need-select]").selectOption("operations");
    await page.locator("[data-atlas-find-matches]").click();

    const match = page.locator("[data-atlas-match]");
    await expect(match).toHaveCount(1);
    await expect(match).toHaveAttribute(
      "data-synthesis-template",
      "ai-governance-advocacy-operations",
    );
    await expect
      .poll(() =>
        match.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return rect.top >= 0 && rect.top < window.innerHeight;
        }),
      )
      .toBe(true);
    await expect(match).toContainText("You offer");
    await expect(match).toContainText("You receive");
    await expect(match).toContainText("No counterparty is confirmed");
    await expect(match.getByRole("link", { name: "Review possibility" })).toHaveAttribute(
      "href",
      "/suggested-opportunities/ai-governance-advocacy-operations",
    );

    await page.getByRole("tab", { name: "Browse evidence" }).click();
    await expect(page.locator("[data-atlas-field]")).toHaveCount(18);
    await page.getByLabel("Search fields").fill("AI governance");
    await expect(page.locator("[data-atlas-field]")).toHaveCount(1);
    await page.getByRole("button", { name: /AI governance and policy/ }).click();
    await expect(page.locator("[data-atlas-field-detail]")).toHaveAttribute(
      "data-atlas-field-detail",
      "ai-governance",
    );
    await expect(page.getByRole("heading", { name: "Bottlenecks" })).toBeVisible();
    await expect(page.locator("[data-atlas-field-detail] a[href^='http']")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-atlas-mvp]")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("keeps an Atlas candidate unconfirmed and hands off to a private role-specific draft", async ({
    page,
  }) => {
    await page.goto(
      "/suggested-opportunities/ai-governance-advocacy-operations",
      { waitUntil: "domcontentloaded" },
    );

    await expect(page.locator("[data-suggested-opportunity]")).toHaveAttribute(
      "data-suggested-opportunity",
      "ai-governance-advocacy-operations",
    );
    await expect(page.getByText("This is not an offer and not yet a moral trade.")).toBeVisible();
    await expect(page.getByText("No counterparty confirmed").first()).toBeVisible();
    const firstParty = page.getByRole("link", { name: "Draft first-party terms" }).first();
    const counterparty = page.getByRole("link", { name: "Draft counterparty terms" }).first();
    await expect(firstParty).toHaveAttribute("href", /role=first_party/);
    await expect(counterparty).toHaveAttribute("href", /role=counterparty/);
    await expectNoHorizontalOverflow(page);

    await firstParty.click();
    await expect(page).toHaveURL(/\/trades\/new\?.*source=bottleneck_atlas_synthesis/);
    await expect(page.getByText("Sign in to build a trade").first()).toBeVisible();
  });

  test("visually and semantically separates generated possibilities from live inventory", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.route("**/api/live-account**", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ authenticated: true, account: { displayName: "Feed user" } }),
      }),
    );
    await page.route("**/api/live-now**", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(feedFixture) }),
    );

    await page.goto("/feed", { waitUntil: "domcontentloaded" });

    const generated = page.locator('.mt-feed-card[data-generated="true"]');
    const published = page.locator('.mt-feed-card[data-generated="false"]');
    await expect(generated).toHaveCount(1);
    await expect(published).toHaveCount(1);
    await expect(generated).toContainText("Potential trade");
    await expect(generated).toContainText("No counterparty confirmed");
    const generatedLink = generated.getByRole("link", { name: "Review possibility" });
    await expect(generatedLink).toBeVisible();
    await expect(generatedLink).not.toHaveAttribute("href", /[?&]cause=/);
    await expect(page.getByText(/1 live opportunity · 1 generated possibility/)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator('.mt-feed-card[data-generated="true"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(pageErrors).toEqual([]);
  });
});
