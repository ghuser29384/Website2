import { expect, test, type Page } from "@playwright/test";

const readyPayload = {
  authenticated: true,
  generatedAt: "2026-08-13T15:00:00.000Z",
  matchingOpportunityCount: 1,
  ownedOpportunities: [],
  ownedOpportunityCount: 0,
  profile: {
    causes: ["Global health"],
    weightedCauses: [],
    learningEnabled: false,
  },
  recentChanges: [],
  recommendations: [
    {
      id: "fixture-opportunity",
      opportunityType: "offer",
      href: "/offers/1c6b0e57-bfed-3f29-c51f-6f8c23d1960b",
      ctaLabel: "Review proposal",
      ownerAlias: "Fixture participant",
      offeredCause: "Global health",
      requestedCause: "Climate action",
      offerAction: "Fund a reviewed health project.",
      requestAction: "Replace one short car trip.",
      verification: "Review the stated receipt terms.",
      duration: "One month",
      reason: "Matches a saved priority",
      reasonDetails: ["Matches Global health"],
    },
  ],
  routePlanner: {
    status: "ready",
    checkedAt: "2026-08-13T15:00:00.000Z",
    profile: {},
    needsMoreInput: [],
    routes: [],
    comparison: null,
    candidateCount: 1,
  },
  status: "ready",
};

async function openReadyFeed(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.route("**/api/live-now", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(readyPayload) });
  });
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.locator('[data-mt-live-now-state="ready"]')).toBeVisible({ timeout: 30_000 });
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
}

test("labels desktop Feed recommendations as review-only rather than agreements", async ({ page }, testInfo) => {
  await openReadyFeed(page, 1487, 1058);

  await expect(page.locator("#mt-live-document-heading")).toHaveText(
    "Current opportunities and next actions",
  );
  await expect(page.locator("[data-mt-live-now-recommendation]")).toHaveCount(1);
  await expect(page.getByRole("note", { name: "Recommendation status" })).toHaveText(
    "Recommendations to review — not agreements, commitments, payments, or verified outcomes.",
  );
  await expect(page.getByRole("link", { name: /Review proposal/ })).toHaveAttribute(
    "href",
    "/offers/1c6b0e57-bfed-3f29-c51f-6f8c23d1960b",
  );
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("home-now-review-boundary-desktop.png") });
});

test("keeps the Feed review-only boundary readable without mobile overflow", async ({ page }, testInfo) => {
  await openReadyFeed(page, 390, 844);

  await expect(page.getByRole("note", { name: "Recommendation status" })).toBeVisible();
  await expect(page.locator("[data-mt-live-now-recommendation]")).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("home-now-review-boundary-mobile.png") });
});
