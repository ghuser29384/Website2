import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

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

const BASE_URL = "http://127.0.0.1:3210";
const WALKTHROUGH_COOKIE = {
  domain: "127.0.0.1",
  expires: -1,
  httpOnly: true,
  name: "mt_walkthrough_seen",
  path: "/",
  sameSite: "Lax" as const,
  secure: false,
  value: "1",
};
const TRANSIENT_DEMO_RECORDS = [
  "Alex R.",
  "Sam G. → Riley P.",
  "Replaced 10 car trips",
  "1 pending counteroffer",
  "Today, 9:18 AM",
];
const VISIBLE_DEMO_RECORDS = [
  ...TRANSIENT_DEMO_RECORDS,
  "Sam G.",
  "Riley P.",
  "Completed Jun 29, 2026",
  "$75",
  "92%",
];
const DEMO_FLASH_KEY = "mt-live-trade-demo-flash";

function accountFixture(displayName: string, initials: string) {
  return {
    authenticated: true,
    account: {
      displayName,
      firstName: displayName.split(/\s+/)[0],
      initials,
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

async function installNoDemoFlashDetector(page: Page) {
  await page.addInitScript(
    ({ key, phrases }) => {
      sessionStorage.removeItem(key);
      const originalWrite = document.write.bind(document);
      document.write = (...parts: string[]) => {
        const markup = parts.join("");
        if (phrases.some((phrase) => markup.includes(phrase))) {
          sessionStorage.setItem(key, "1");
        }
        originalWrite(...parts);
      };
    },
    { key: DEMO_FLASH_KEY, phrases: TRANSIENT_DEMO_RECORDS },
  );
}

async function createUserPage({
  account,
  browser,
  payload,
  viewport,
}: {
  account: ReturnType<typeof accountFixture>;
  browser: Browser;
  payload: unknown;
  viewport: { width: number; height: number };
}): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport,
    storageState: { cookies: [WALKTHROUGH_COOKIE], origins: [] },
  });
  const page = await context.newPage();
  await installNoDemoFlashDetector(page);
  await page.route("**/api/live-account", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(account) }),
  );
  await page.route("**/api/live-now", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) }),
  );
  await page.goto("/#trade", { waitUntil: "domcontentloaded" });
  return { context, page };
}

async function expectNoDemoRecords(page: Page) {
  const tradeFeed = page.locator("[data-mt-live-trade-feed]");
  for (const record of VISIBLE_DEMO_RECORDS) {
    await expect(tradeFeed).not.toContainText(record);
  }
  expect(await page.evaluate((key) => sessionStorage.getItem(key), DEMO_FLASH_KEY)).toBeNull();
}

for (const viewport of [
  { label: "desktop", size: { width: 1440, height: 1000 } },
  { label: "narrow mobile", size: { width: 390, height: 844 } },
] as const) {
  test(`${viewport.label}: two users receive different exact Feed cards and receipts`, async ({
    browser,
  }) => {
    const userA = await createUserPage({
      account: accountFixture("User Alpha", "UA"),
      browser,
      viewport: viewport.size,
      payload: feedFixture({
        id: "animal-opportunity",
        ownerAlias: "Avery N.",
        offeredCause: "Animal welfare",
        requestedCause: "Plant-based meals",
        requestAction: "Prepare three plant-based meals",
        offerAction: "Fund a reviewed animal-welfare project",
        receipt: "receipt-user-a",
        confidence: 91,
      }),
    });
    const userB = await createUserPage({
      account: accountFixture("User Beta", "UB"),
      browser,
      viewport: viewport.size,
      payload: feedFixture({
        id: "ai-opportunity",
        ownerAlias: "Jordan K.",
        offeredCause: "AI safety",
        requestedCause: "Evaluation review",
        requestAction: "Review one bounded evaluation brief",
        offerAction: "Fund technical AI-safety evaluation work",
        receipt: "receipt-user-b",
        confidence: 84,
      }),
    });

    try {
      await expect(userA.page).toHaveURL(/\/#trade$/);
      await expect(userB.page).toHaveURL(/\/#trade$/);

      const cardA = userA.page.locator(
        '[data-mt-live-trade-feed="ready"] [data-feed-item-id="animal-opportunity"]',
      );
      const cardB = userB.page.locator(
        '[data-mt-live-trade-feed="ready"] [data-feed-item-id="ai-opportunity"]',
      );
      await expect(cardA).toBeVisible();
      await expect(cardB).toBeVisible();
      await expect(cardA).toHaveAttribute("data-feed-item-key", "offer:animal-opportunity");
      await expect(cardA).toHaveAttribute("data-opportunity-id", "animal-opportunity");
      await expect(cardA).toHaveAttribute("data-opportunity-type", "offer");
      await expect(cardA).toHaveAttribute("data-exposure-request-id", "receipt-user-a");
      await expect(cardB).toHaveAttribute("data-feed-item-key", "offer:ai-opportunity");
      await expect(cardB).toHaveAttribute("data-opportunity-id", "ai-opportunity");
      await expect(cardB).toHaveAttribute("data-opportunity-type", "offer");
      await expect(cardB).toHaveAttribute("data-exposure-request-id", "receipt-user-b");
      await expect(cardA).toContainText("Avery N.");
      await expect(cardA).toContainText("Prepare three plant-based meals");
      await expect(cardB).toContainText("Jordan K.");
      await expect(cardB).toContainText("Review one bounded evaluation brief");
      await expect(userA.page.locator('[data-feed-item-id="ai-opportunity"]')).toHaveCount(0);
      await expect(userB.page.locator('[data-feed-item-id="animal-opportunity"]')).toHaveCount(0);
      await expectNoDemoRecords(userA.page);
      await expectNoDemoRecords(userB.page);

      if (viewport.label === "narrow mobile") {
        for (const page of [userA.page, userB.page]) {
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          expect(overflow).toBeLessThanOrEqual(1);
        }
      }
    } finally {
      await userA.context.close();
      await userB.context.close();
    }
  });

  test(`${viewport.label}: a zero-data user receives an explicit empty state and no demo records`, async ({
    browser,
  }) => {
    const user = await createUserPage({
      account: accountFixture("Zero Data", "ZD"),
      browser,
      payload: emptyFeed,
      viewport: viewport.size,
    });

    try {
      const sidebar = user.page.locator('[data-mt-live-trade-feed="no_matches"]');
      await expect(sidebar).toBeVisible();
      await expect(sidebar.locator("[data-feed-item-id]")).toHaveCount(0);
      await expect(
        sidebar.getByRole("region", { name: "No personalized Trade feed item" }),
      ).toBeVisible();
      await expect(sidebar).toContainText("No filler suggestions were added");
      await expectNoDemoRecords(user.page);

      if (viewport.label === "narrow mobile") {
        const overflow = await user.page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      }
    } finally {
      await user.context.close();
    }
  });
}

test("signed-out, incomplete-profile, unavailable, and malformed snapshots all fail closed", async ({
  browser,
}) => {
  const cases = [
    {
      expected: "signed_out",
      payload: { ...emptyFeed, authenticated: false, status: "signed_out" },
      text: "Sign in to load your Feed.",
    },
    {
      expected: "profile_incomplete",
      payload: { ...emptyFeed, status: "profile_incomplete" },
      text: "Set priorities before matching.",
    },
    {
      expected: "unavailable",
      payload: { ...emptyFeed, status: "unavailable" },
      text: "Your Feed could not load.",
    },
    {
      expected: "unavailable",
      payload: {
        ...feedFixture({
          id: "malformed-opportunity",
          ownerAlias: "Malformed",
          offeredCause: "Global health",
          requestedCause: "Review",
          requestAction: "Review a memo",
          offerAction: "Fund malaria prevention",
          receipt: "receipt-removed-below",
          confidence: 80,
        }),
        recommendations: [
          {
            id: "malformed-opportunity",
            opportunityType: "offer",
            offeredCause: "Global health",
            requestedCause: "Review",
          },
        ],
      },
      text: "Your Feed could not load.",
    },
  ] as const;

  for (const state of cases) {
    const user = await createUserPage({
      account: accountFixture("Fail Closed", "FC"),
      browser,
      payload: state.payload,
      viewport: { width: 1440, height: 1000 },
    });
    try {
      const sidebar = user.page.locator(`[data-mt-live-trade-feed="${state.expected}"]`);
      await expect(sidebar).toBeVisible();
      await expect(sidebar.locator("[data-feed-item-id]")).toHaveCount(0);
      await expect(sidebar).toContainText(state.text);
      await expectNoDemoRecords(user.page);
    } finally {
      await user.context.close();
    }
  }
});
