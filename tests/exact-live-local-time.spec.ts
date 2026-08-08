import { expect, test, type Page } from "@playwright/test";

const fixedInstant = new Date("2026-07-17T01:30:00.000Z");

async function installAuthenticatedFixtures(page: Page) {
  await page.route("**/api/live-account", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        account: {
          displayName: "Riley Morgan",
          firstName: "Riley",
          initials: "RM",
          memberSince: "2026-01-01T00:00:00.000Z",
          completedCommitments: 0,
          paymentAccount: { configured: false, label: "Not configured" },
          notifications: { enabled: null, label: "Not configured" },
          publicTrustProfile: { enabled: null, label: "Not configured" },
          defaultPrivacy: "Not configured",
          standardTerms: { href: "/terms", label: "Current site terms" },
        },
      }),
    }),
  );

  await page.route("**/api/live-now**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        generatedAt: "2026-08-08T08:00:00.000Z",
        matchingOpportunityCount: 0,
        profile: {
          causes: ["Animal welfare"],
          weightedCauses: [],
          openToPayment: true,
          openToPledges: true,
          signalSources: ["profile_priority"],
          learningEnabled: true,
        },
        recentChanges: [],
        recommendations: [],
        ownedOpportunities: [],
        ownedOpportunityCount: 0,
        status: "no_matches",
        routePlanner: {
          status: "ready",
          checkedAt: "2026-08-08T08:00:00.000Z",
          profile: {
            goal: "Reduce preventable animal suffering",
            causePriorities: ["Animal welfare"],
            moneyBudgetCents: 0,
            timeBudgetMinutes: 0,
            actionBudgetCount: 0,
            horizon: "month",
            routeFormats: [],
            evidencePreference: "balanced",
            uncertaintyPreference: "balanced",
            interactionPreference: "open",
            privacyPreference: "private",
            plannedDonationBaseline: false,
            plannedDonationCents: 0,
            otherwiseBaseline: "",
            calibrationCount: 0,
            interviewCompleted: false,
          },
          needsMoreInput: [],
          routes: [],
          comparison: null,
          candidateCount: 0,
        },
      }),
    }),
  );
}

async function openLive(page: Page) {
  await page.goto("/moral-trade-live.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main#app")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".head .date")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible({
    timeout: 30_000,
  });
}

async function expectLocalHeader(
  page: Page,
  expected: { dateTime: string; dateLabel: string; greeting: string },
) {
  const localHeader = page.locator(".head .date");
  await expect(localHeader).toHaveAttribute("data-mt-local-date-time", expected.dateTime);
  await expect(localHeader.locator('time[data-mt-local-date="true"]')).toHaveAttribute(
    "datetime",
    expected.dateTime,
  );
  await expect(localHeader.locator('time[data-mt-local-date="true"]')).toHaveText(
    expected.dateLabel,
  );
  await expect(localHeader.locator('[data-mt-local-greeting="true"]')).toHaveText(
    expected.greeting,
  );
}

async function expectHeaderAcrossCurrentWorkspace(
  page: Page,
  expected: { dateTime: string; dateLabel: string; greeting: string },
) {
  for (const [workspace, label] of [
    ["focus", "Focus"],
    ["plan", "Plan resources"],
    ["rules", "Standing rules"],
  ] as const) {
    const control = page.locator(`button[data-now="${workspace}"]`);
    await expect(control).toHaveText(label);
    await control.click();
    await expect(control).toHaveClass(/active/);
    await expectLocalHeader(page, expected);
  }

  await expect(page.locator('button[data-page="trade"]')).toHaveText("Trade");
  await expect(page.locator('button[data-page="activity"]')).toHaveText("Commitments");
}

test.describe("exact live interface local time", () => {
  test.describe("America/Los_Angeles", () => {
    test.use({ timezoneId: "America/Los_Angeles" });

    test("uses the visitor's previous local day across Focus, Plan, and Standing rules", async ({
      page,
    }) => {
      await page.clock.setFixedTime(fixedInstant);
      await installAuthenticatedFixtures(page);
      await openLive(page);

      await expectHeaderAcrossCurrentWorkspace(page, {
        dateTime: "2026-07-16",
        dateLabel: "Thursday, July 16, 2026",
        greeting: "Good evening, Riley.",
      });
    });
  });

  test.describe("Asia/Tokyo", () => {
    test.use({ timezoneId: "Asia/Tokyo" });

    test("uses the visitor's next local day across Focus, Plan, and Standing rules", async ({
      page,
    }) => {
      await page.clock.setFixedTime(fixedInstant);
      await installAuthenticatedFixtures(page);
      await openLive(page);

      await expectHeaderAcrossCurrentWorkspace(page, {
        dateTime: "2026-07-17",
        dateLabel: "Friday, July 17, 2026",
        greeting: "Good morning, Riley.",
      });
    });
  });

  test.describe("refresh", () => {
    test.use({ timezoneId: "UTC" });

    test("refreshes after the local date and greeting period change", async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-07-16T17:59:00.000Z"));
      await installAuthenticatedFixtures(page);
      await openLive(page);
      await expectLocalHeader(page, {
        dateTime: "2026-07-16",
        dateLabel: "Thursday, July 16, 2026",
        greeting: "Good afternoon, Riley.",
      });

      await page.clock.setFixedTime(new Date("2026-07-17T00:01:00.000Z"));
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expectLocalHeader(page, {
        dateTime: "2026-07-17",
        dateLabel: "Friday, July 17, 2026",
        greeting: "Good morning, Riley.",
      });
    });
  });
});
