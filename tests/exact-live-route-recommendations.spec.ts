import { expect, test, type Page } from "@playwright/test";

type RoutePlanner = Record<string, unknown>;

function profile(overrides: Record<string, unknown> = {}) {
  return {
    goal: "Reduce factory-farming harm",
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
    otherwiseBaseline: "I would keep my current meals and make no extra donation.",
    calibrationCount: 0,
    interviewCompleted: false,
    ...overrides,
  };
}

function step({
  sourceId,
  title,
  href,
  sourceType = "offer",
  live = true,
  costCents = 1_000,
  timeMinutes = 10,
}: {
  sourceId: string;
  title: string;
  href: string;
  sourceType?: string;
  live?: boolean;
  costCents?: number;
  timeMinutes?: number;
}) {
  return {
    sourceId,
    sourceType,
    title,
    detail: `Review the current terms for ${title}.`,
    href,
    costCents,
    timeMinutes,
    evidenceLabel: "Public receipt",
    live,
    why: "Fits the stated goal, limits, and evidence preference.",
  };
}

function route({
  id,
  label,
  summary,
  firstStep,
}: {
  id: string;
  label: string;
  summary: string;
  firstStep: ReturnType<typeof step>;
}) {
  return {
    id,
    label,
    summary,
    metrics: { fit: 91, friction: 24, evidence: 88, coordination: 72 },
    steps: [firstStep],
    uncertainties: ["The source may close before you act."],
  };
}

function readyPlanner(overrides: Record<string, unknown> = {}): RoutePlanner {
  return {
    status: "ready",
    checkedAt: "2026-07-22T18:20:00.000Z",
    profile: profile(),
    needsMoreInput: [],
    routes: [
      route({
        id: "best-fit",
        label: "Best fit",
        summary: "Fund a verified animal-welfare review",
        firstStep: step({
          sourceId: "offer-animal",
          title: "Open animal-welfare review offer",
          href: "/offers/offer-animal",
        }),
      }),
      route({
        id: "low-friction",
        label: "Lowest friction",
        summary: "Join a small verified threshold pool",
        firstStep: step({
          sourceId: "pool-animal",
          sourceType: "donation_pool",
          title: "Verified cage-free transition pool",
          href: "/donation-offsets?pool=pool-animal",
          costCents: 500,
          timeMinutes: 2,
        }),
      }),
      route({
        id: "live-coordination",
        label: "Live coordination",
        summary: "Respond to a compatible open offer",
        firstStep: step({
          sourceId: "match-animal",
          sourceType: "live_match",
          title: "Compatible participant offer",
          href: "/offers/match-animal",
          costCents: 0,
          timeMinutes: 15,
        }),
      }),
    ],
    candidateCount: 7,
    ...overrides,
  };
}

function liveNowResponse(routePlanner: RoutePlanner) {
  const status = routePlanner.status === "signed_out" ? "signed_out" : "no_matches";
  return {
    authenticated: status !== "signed_out",
    generatedAt: "2026-07-22T18:20:00.000Z",
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
    status,
    routePlanner,
  };
}

async function mountPlanner(
  page: Page,
  initialPlanner: RoutePlanner,
  afterPost?: (payload: Record<string, unknown>) => RoutePlanner,
) {
  let currentPlanner = initialPlanner;
  const posts: Record<string, unknown>[] = [];

  await page.route("**/api/live-now**", async (routeHandler) => {
    const request = routeHandler.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith("/route-profile")) {
      const payload = (request.postDataJSON() || {}) as Record<string, unknown>;
      posts.push(payload);
      if (afterPost) currentPlanner = afterPost(payload);
      await routeHandler.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ authenticated: true, saved: true, action: payload.action }),
      });
      return;
    }

    await routeHandler.fulfill({
      contentType: "application/json",
      body: JSON.stringify(liveNowResponse(currentPlanner)),
    });
  });

  await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Plan resources" })).toBeVisible();
  await page.addStyleTag({ url: "/moral-trade-live-route-recommendations.css" });
  await page.addScriptTag({ url: "/moral-trade-live-route-recommendations.js" });
  await page.getByRole("button", { name: "Plan resources" }).click();
  await expect(page.locator('[data-mt-live-route-planner="true"]')).toBeVisible();

  return { posts };
}

test.describe("live route recommendation planner", () => {
  test("saves the progressive composer and refreshes the authoritative routePlanner in place", async ({
    page,
  }) => {
    const incomplete = readyPlanner({
      status: "profile_incomplete",
      profile: profile({
        goal: "",
        moneyBudgetCents: 0,
        timeBudgetMinutes: 0,
        routeFormats: ["direct"],
        otherwiseBaseline: "",
      }),
      needsMoreInput: ["goal", "moneyBudgetCents", "timeBudgetMinutes", "otherwiseBaseline"],
      routes: [],
      candidateCount: 0,
    });
    const { posts } = await mountPlanner(page, incomplete, (payload) =>
      payload.action === "save_profile" ? readyPlanner() : incomplete,
    );

    const composer = page.locator("[data-mt-live-route-composer]");
    await composer.getByLabel("Goal", { exact: true }).fill("Reduce preventable animal suffering");
    await composer.getByLabel("Cause area used for matching").fill("Farmed-animal welfare");
    await composer.getByLabel("Money").fill("35");
    await composer.getByLabel("Minutes").fill("45");
    await composer.getByLabel("Actions").fill("2");
    await composer.getByText("Personal action", { exact: true }).click();
    await composer.getByLabel("Without a trade, I would…").fill(
      "I would keep my current meals and make no extra donation.",
    );
    await composer.getByRole("button", { name: "Update routes" }).click();

    await expect(page.locator('[data-mt-live-route-card="best-fit"]')).toBeVisible();
    expect(posts).toHaveLength(1);
    expect(posts[0].action).toBe("save_profile");
    expect(posts[0].profile).toMatchObject({
      goal: "Reduce preventable animal suffering",
      causePriorities: ["Factory farming"],
      moneyBudgetCents: 3_500,
      timeBudgetMinutes: 45,
      actionBudgetCount: 2,
      routeFormats: ["direct", "personal"],
      otherwiseBaseline: "I would keep my current meals and make no extra donation.",
    });
    await expect(page).toHaveURL(/moral-trade-live\.html#now$/);
    await expect(page.getByText("Redirect $20 of political donations", { exact: true })).toHaveCount(0);
    await expect(page.locator(".alloc:visible")).toHaveCount(0);
  });

  test("records a hypothetical comparison as preference-only structured input", async ({ page }) => {
    const withComparison = readyPlanner({
      comparison: {
        key: "route-format:direct:personal",
        left: {
          title: "Fund one evidence review",
          format: "direct",
          detail: "$20 and about 30 minutes",
        },
        right: {
          title: "Try a 30-day personal action",
          format: "personal",
          detail: "$0 and short weekly check-ins",
        },
        answeredCount: 0,
        targetCount: 5,
        hypothetical: true,
      },
    });
    const { posts } = await mountPlanner(page, withComparison, (payload) =>
      payload.action === "answer_comparison"
        ? readyPlanner({ profile: profile({ calibrationCount: 1 }), comparison: undefined })
        : withComparison,
    );

    await page.getByRole("button", { name: "Compare two options" }).click();
    const dialog = page.getByRole("dialog", { name: "Which works better for you?" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Hypothetical — not a live offer");
    await expect(dialog.locator("a")).toHaveCount(0);
    await dialog.getByRole("button", { name: "About equal" }).click();

    await expect(page.getByText("1 comparison saved", { exact: false })).toBeVisible();
    expect(posts[0]).toEqual({
      action: "answer_comparison",
      answer: {
        key: "route-format:direct:personal",
        leftFormat: "direct",
        rightFormat: "personal",
        choice: "equal",
      },
    });
  });

  test("reviews and confirms the guided interview before posting it", async ({ page }) => {
    const { posts } = await mountPlanner(page, readyPlanner(), (payload) =>
      payload.action === "save_interview"
        ? readyPlanner({
            profile: profile({
              goal: "Improve global health",
              interviewCompleted: true,
            }),
          })
        : readyPlanner(),
    );

    await page.getByRole("button", { name: "Guided goal interview" }).click();
    const dialog = page.getByRole("dialog", { name: "Tell us what should change." });
    await dialog.getByLabel("Desired change").fill("Improve global health");
    await dialog.getByLabel("Cause area used for matching").fill("Global health");
    await dialog
      .getByLabel("Without a trade, what happens?")
      .fill("I make no additional health donation this month.");
    const evidence = dialog.getByLabel("Evidence");
    await expect(
      evidence.getByRole("option", { name: "Connected proof — no eligible inventory yet" }),
    ).toHaveAttribute("disabled", "");
    await evidence.selectOption("standard");
    await dialog.getByLabel("Privacy").selectOption("private");
    await dialog.getByRole("button", { name: "Review answers" }).click();

    await expect(dialog.getByText("Check the structured profile")).toBeVisible();
    await expect(dialog.getByText("Improve global health", { exact: true })).toBeVisible();
    expect(posts).toHaveLength(0);
    await dialog.getByRole("button", { name: "Confirm profile" }).click();

    await expect(page.getByText("Interview confirmed. Routes refreshed.", { exact: true })).toBeVisible();
    expect(posts).toHaveLength(1);
    expect(posts[0]).toEqual({
      action: "save_interview",
      interview: {
        goal: "Improve global health",
        causePriorities: ["Global health"],
        otherwiseBaseline: "I make no additional health donation this month.",
        evidencePreference: "standard",
        uncertaintyPreference: "balanced",
        interactionPreference: "open",
        privacyPreference: "private",
      },
    });
  });

  test("renders at most three result cards and links only sanitized live sources", async ({ page }) => {
    const malicious = readyPlanner();
    const routes = malicious.routes as Array<Record<string, unknown>>;
    routes[0] = {
      ...routes[0],
      summary: '<img src=x onerror="window.__routeXss=true"> Verified route',
      steps: [
        ...((routes[0].steps as unknown[]) || []),
        step({
          sourceId: "not-live",
          title: "Unverified placeholder",
          href: "/offers/not-live",
          live: false,
        }),
        step({
          sourceId: "external",
          title: "External injected source",
          href: "https://example.com/phish",
        }),
      ],
    };
    routes.push(
      route({
        id: "fourth-route",
        label: "Fourth route",
        summary: "This route must be pruned by the client contract",
        firstStep: step({
          sourceId: "fourth",
          title: "Fourth source",
          href: "/offers/fourth",
        }),
      }),
    );

    await mountPlanner(page, malicious);

    const cards = page.locator("[data-mt-live-route-card]");
    await expect(cards).toHaveCount(3);
    await expect(page.locator('a[href="/offers/offer-animal"]')).toHaveText("Open source →");
    await expect(page.locator('a[href="/donation-offsets?pool=pool-animal"]')).toHaveText(
      "Open source →",
    );
    await expect(page.getByText("Unverified placeholder", { exact: true })).toHaveCount(0);
    await expect(page.getByText("External injected source", { exact: true })).toHaveCount(0);
    await expect(cards.first()).toContainText('<img src=x onerror="window.__routeXss=true">');
    await expect(page.locator(".mt-lrp-route-card img")).toHaveCount(0);
    expect(await page.evaluate(() => (window as typeof window & { __routeXss?: boolean }).__routeXss)).not.toBe(true);
    await expect(cards.nth(0).getByText("Best fit", { exact: true })).toBeVisible();
    await expect(cards.nth(1).getByText("Lowest friction", { exact: true })).toBeVisible();
    await expect(cards.nth(2).getByText("Live coordination", { exact: true })).toBeVisible();
  });

  test("shows a truthful no-live state without a generic recommendation", async ({
    page,
  }) => {
    await mountPlanner(
      page,
      readyPlanner({ status: "no_live", routes: [], candidateCount: 0 }),
    );
    await expect(page.getByText("No live route right now.", { exact: true })).toBeVisible();
    await expect(page.getByText("These are next actions, not recommendations.")).toBeVisible();
    await expect(page.locator("[data-mt-live-route-card]")).toHaveCount(0);
    await expect(page.getByText("Recommended mixed route", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Create an offer" })).toHaveAttribute(
      "href",
      "/offers/new",
    );
  });

  test("shows a truthful signed-out state without personalized or demo routes", async ({ page }) => {
    await mountPlanner(
      page,
      readyPlanner({ status: "signed_out", routes: [], candidateCount: 0 }),
    );

    await expect(page.getByText("Sign in to see your routes.", { exact: true })).toBeVisible();
    await expect(page.getByText("No personalized or demo route is shown while signed out.")).toBeVisible();
    await expect(page.locator("[data-mt-live-route-card]")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Sign in →" }).first()).toHaveAttribute(
      "href",
      "/login?returnTo=%2Fmoral-trade-live.html%23now",
    );
  });

  test("keeps the planner and comparison dialog within a 390px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const withComparison = readyPlanner({
      comparison: {
        key: "threshold:coalition:v1",
        left: {
          title: "Join a verified threshold pool with a longer descriptive title",
          format: "threshold",
          detail: "Contribute only if the activation terms are met.",
        },
        right: {
          title: "Invite one compatible person to coordinate",
          format: "coalition",
          detail: "Create an invitation; this example itself is not live.",
        },
        answeredCount: 2,
        targetCount: 5,
        hypothetical: true,
      },
    });
    await mountPlanner(page, withComparison);

    let overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Compare two options" }).click();
    await expect(page.getByRole("dialog", { name: "Which works better for you?" })).toBeVisible();
    overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const box = await page.getByRole("dialog").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  });
});
