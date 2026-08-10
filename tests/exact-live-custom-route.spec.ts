import { expect, test, type Page } from "@playwright/test";

type PlannerStatus = "ready" | "signed_out";

function routePlanner(status: PlannerStatus) {
  return {
    status,
    checkedAt: "2026-08-08T08:00:00.000Z",
    profile:
      status === "ready"
        ? {
            goal: "Reduce preventable animal suffering",
            causePriorities: ["Animal welfare"],
            moneyBudgetCents: 4_000,
            timeBudgetMinutes: 60,
            actionBudgetCount: 3,
            horizon: "month",
            routeFormats: ["direct", "personal"],
            evidencePreference: "high",
            uncertaintyPreference: "balanced",
            interactionPreference: "open",
            privacyPreference: "private",
            plannedDonationBaseline: false,
            plannedDonationCents: 0,
            otherwiseBaseline: "I would make no additional donation this month.",
            calibrationCount: 0,
            interviewCompleted: false,
          }
        : {},
    needsMoreInput: [],
    routes:
      status === "ready"
        ? [
            {
              id: "best-fit",
              label: "Best fit",
              summary: "Fund a verified animal-welfare review",
              metrics: { fit: 91, friction: 24, evidence: 88, coordination: 72 },
              steps: [
                {
                  sourceId: "offer-animal",
                  sourceType: "offer",
                  title: "Open animal-welfare review offer",
                  detail: "Review the current verified terms.",
                  href: "/offers/offer-animal",
                  costCents: 1_000,
                  timeMinutes: 10,
                  evidenceLabel: "Public receipt",
                  live: true,
                  why: "Fits the stated goal, limits, and evidence preference.",
                },
              ],
              uncertainties: ["The source may close before you act."],
            },
          ]
        : [],
    comparison: null,
    candidateCount: status === "ready" ? 1 : 0,
  };
}

async function mockPlannerState(page: Page, status: PlannerStatus) {
  const authenticated = status === "ready";

  await page.route("**/api/live-account", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authenticated,
        profile: authenticated
          ? { displayName: "Route test user", username: "route-test" }
          : null,
      }),
    });
  });

  await page.route("**/api/live-now**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authenticated,
        generatedAt: "2026-08-08T08:00:00.000Z",
        matchingOpportunityCount: 0,
        profile: {
          causes: authenticated ? ["Animal welfare"] : [],
          weightedCauses: [],
          openToPayment: authenticated ? true : null,
          openToPledges: authenticated ? true : null,
          signalSources: authenticated ? ["profile_priority"] : [],
          learningEnabled: true,
        },
        recentChanges: [],
        recommendations: [],
        ownedOpportunities: [],
        ownedOpportunityCount: 0,
        status: authenticated ? "no_matches" : "signed_out",
        routePlanner: routePlanner(status),
      }),
    });
  });
}

async function openPlan(page: Page) {
  await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main#app")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Plan resources" }).click();
  await expect(page.locator('[data-mt-live-route-planner="true"]')).toBeVisible({
    timeout: 30_000,
  });
}

async function expectLegacyWorkbenchRetired(page: Page) {
  await expect(page.getByRole("button", { name: "Custom route", exact: true })).toHaveCount(0);
  await expect(page.locator("[data-mt-custom-route]")).toHaveCount(0);
  await expect(page.locator('[data-mt-custom-route="resource-mix"]')).toHaveCount(0);

  expect(
    await page.evaluate(() => Reflect.get(window, "__MT_CUSTOM_ROUTE_WORKBENCH__") ?? null),
  ).toBeNull();
}

test.describe("authoritative live route planner", () => {
  test("keeps signed-out Plan fail-closed and ignores legacy workbench storage", async ({
    page,
  }) => {
    await mockPlannerState(page, "signed_out");
    await page.addInitScript(() => {
      localStorage.setItem(
        "moraltrade.plan-resources.v1",
        JSON.stringify({ activePeriod: "month", legacyDiagnostic: true }),
      );
    });

    await openPlan(page);

    await expect(page.getByText("Sign in to see your routes.", { exact: true })).toBeVisible();
    await expect(
      page.getByText("No personalized or demo route is shown while signed out.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator("[data-mt-live-route-card]")).toHaveCount(0);

    expect(
      await page.evaluate(() => {
        const bootstrap = Reflect.get(window, "__MT_LIVE_NOW_BOOTSTRAP__") as
          | { routePlanner?: { status?: string } }
          | undefined;
        return bootstrap?.routePlanner?.status ?? null;
      }),
    ).toBe("signed_out");

    await expectLegacyWorkbenchRetired(page);
  });

  test("renders the ready current planner instead of the retired resource-mix workbench", async ({
    page,
  }) => {
    await mockPlannerState(page, "ready");
    await openPlan(page);

    await expect(page.locator("[data-mt-live-route-composer]")).toBeVisible();
    await expect(page.locator('[data-mt-live-route-card="best-fit"]')).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Routes for Reduce preventable animal suffering",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Fund a verified animal-welfare review", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Open animal-welfare review offer", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open source →" })).toHaveAttribute(
      "href",
      "/offers/offer-animal",
    );

    expect(
      await page.evaluate(() => {
        const bootstrap = Reflect.get(window, "__MT_LIVE_NOW_BOOTSTRAP__") as
          | { routePlanner?: { status?: string } }
          | undefined;
        return bootstrap?.routePlanner?.status ?? null;
      }),
    ).toBe("ready");

    await expectLegacyWorkbenchRetired(page);
  });

  test("keeps the current route composer and result card within the mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockPlannerState(page, "ready");
    await openPlan(page);

    await expect(page.locator("[data-mt-live-route-composer]")).toBeVisible();
    await expect(page.locator('[data-mt-live-route-card="best-fit"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Update routes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Guided goal interview" })).toBeVisible();

    const widths = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(widths.clientWidth).toBe(widths.innerWidth);
    expect(widths.scrollWidth).toBeLessThanOrEqual(widths.innerWidth + 1);

    await expectLegacyWorkbenchRetired(page);
  });
});
