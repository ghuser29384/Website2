import { expect, test } from "@playwright/test";

function recommendationFixture({
  cause,
  id,
  offeredCause,
  requestedCause,
}: {
  cause: string;
  id: string;
  offeredCause: string;
  requestedCause: string;
}) {
  return {
    authenticated: true,
    generatedAt: "2026-07-20T12:00:00.000Z",
    matchingOfferCount: 1,
    profile: {
      causes: [cause],
      openToPayment: true,
      openToPledges: true,
      signalSources: ["Profile priorities"],
    },
    recentChanges: [
      {
        cause,
        count: 1,
        label: `${cause} · 1 proposal new or updated`,
      },
    ],
    recommendations: [
      {
        id,
        ownerId: `owner-${id}`,
        ownerAlias: "Live participant",
        mode: "payment",
        offeredCause,
        requestedCause,
        compromiseCause: "Not needed",
        offerAction: `Deliver a reviewed ${offeredCause.toLowerCase()} project`,
        requestAction: `Support ${requestedCause.toLowerCase()}`,
        verification: "Public receipt and counterparty confirmation",
        duration: "Complete within 30 days",
        trustLevel: 3,
        createdAt: "2026-07-19T12:00:00.000Z",
        updatedAt: "2026-07-20T10:00:00.000Z",
        matchCause: cause,
        reason: `Matches your ${cause} priority`,
        score: 134,
      },
    ],
    status: "ready",
  };
}

test.describe("profile-driven live Now suggestions", () => {
  test("renders different live proposals for disjoint profiles and survives a tab rerender", async ({
    page,
  }) => {
    let fixture = recommendationFixture({
      cause: "Animal welfare",
      id: "animal-offer",
      offeredCause: "Animal welfare",
      requestedCause: "Plant-based meal evidence",
    });

    await page.route("**/api/live-now", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(fixture) }),
    );
    await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });

    const personalized = page.locator('[data-mt-live-now="profile-driven"]');
    await expect(personalized).toHaveAttribute("data-mt-live-now-state", "ready");
    await expect(personalized).toContainText("Animal welfare ↔ Plant-based meal evidence");
    await expect(personalized).toContainText("Matches your Animal welfare priority");
    await expect(personalized.locator('a[href="/offers/animal-offer"]')).toHaveCount(3);
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

  test("shows a truthful signed-out state with no demo recommendations", async ({ page }) => {
    await page.route("**/api/live-now", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: false,
          generatedAt: "2026-07-20T12:00:00.000Z",
          matchingOfferCount: 0,
          profile: {
            causes: [],
            openToPayment: null,
            openToPledges: null,
            signalSources: [],
          },
          recentChanges: [],
          recommendations: [],
          status: "signed_out",
        }),
      }),
    );
    await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });

    const personalized = page.locator('[data-mt-live-now="profile-driven"]');
    await expect(personalized).toHaveAttribute("data-mt-live-now-state", "signed_out");
    await expect(personalized).toContainText(
      "Sign in to see suggestions based on your profile.",
    );
    await expect(personalized).toContainText("No recommendations shown");
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
          matchingOfferCount: 0,
          profile: {
            causes: ["Global health"],
            openToPayment: true,
            openToPledges: true,
            signalSources: ["Profile priorities"],
          },
          recentChanges: [],
          recommendations: [],
          status: "no_matches",
        }),
      }),
    );
    await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });

    const personalized = page.locator('[data-mt-live-now="profile-driven"]');
    await expect(personalized).toHaveAttribute("data-mt-live-now-state", "no_matches");
    await expect(personalized).toContainText("No open proposal currently matches your profile.");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
