import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type Session,
} from "@supabase/supabase-js";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const BASE_URL = process.env.FEED_CREATE_BASE_URL ?? "http://127.0.0.1:3210";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hvmxfjjbdcgjjudmthdz.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_Sai3NlSapbvkmXa3EQrx9A_W9oNEYE8";
const QA_PASSWORD = process.env.FEED_CREATE_QA_PASSWORD ?? "";

const IDS = {
  incompleteOffer: "fa300000-0000-4000-8000-000000000006",
  incompleteRequest: "fa500000-0000-4000-8000-000000000006",
  offerA: "fa300000-0000-4000-8000-000000000001",
  offerB: "fa300000-0000-4000-8000-000000000002",
  ownOffer: "fa300000-0000-4000-8000-000000000003",
  ownRequest: "fa500000-0000-4000-8000-000000000003",
  ownerA: "fa200000-0000-4000-8000-000000000001",
  ownerB: "fa200000-0000-4000-8000-000000000002",
  paymentOffer: "fa300000-0000-4000-8000-000000000004",
  paymentRequest: "fa500000-0000-4000-8000-000000000004",
  redirectOffer: "fa300000-0000-4000-8000-000000000005",
  redirectRequest: "fa500000-0000-4000-8000-000000000005",
  requestA: "fa500000-0000-4000-8000-000000000001",
  requestB: "fa500000-0000-4000-8000-000000000002",
  viewerA: "fa100000-0000-4000-8000-000000000001",
  viewerB: "fa100000-0000-4000-8000-000000000002",
  zero: "fa100000-0000-4000-8000-000000000003",
} as const;

const EMAILS = {
  viewerA: "feed-create-viewer-a@qa.invalid",
  viewerB: "feed-create-viewer-b@qa.invalid",
  zero: "feed-create-zero@qa.invalid",
} as const;

interface RecommendationFixture {
  actionFitLabel?: string;
  duration: string;
  exposureRequestId: string;
  id: string;
  mode: "offset" | "payment" | "pledge";
  offerAction: string;
  offeredCause: string;
  opportunityType: "donation_pool" | "donation_redirect" | "offer";
  ownerAlias: string;
  ownerId: string;
  reason?: string;
  reasonDetails?: string[];
  requestAction: string;
  requestedCause: string;
  sourceRevision: number;
  verification: string;
}

function recommendationA(): RecommendationFixture {
  return {
    actionFitLabel: "Strong fit",
    duration: "Through August 31, 2026",
    exposureRequestId: IDS.requestA,
    id: IDS.offerA,
    mode: "pledge",
    offerAction: "Donate $100 to an agreed evidence-backed charity.",
    offeredCause: "Global poverty reduction",
    opportunityType: "offer",
    ownerAlias: "QA Feed Owner A",
    ownerId: IDS.ownerA,
    reason: "Matches your lower-carbon transport capacity",
    reasonDetails: [
      "The requested action fits your stated transport preferences.",
      "The offered benefit overlaps with your global-poverty priority.",
    ],
    requestAction: "Replace ten car trips with public transit.",
    requestedCause: "Lower-carbon transport",
    sourceRevision: 3,
    verification: "Dated transit receipts or a contemporaneous travel log.",
  };
}

function recommendationB(): RecommendationFixture {
  return {
    actionFitLabel: "Possible fit",
    duration: "Within 30 days",
    exposureRequestId: IDS.requestB,
    id: IDS.offerB,
    mode: "pledge",
    offerAction: "Fund one independently reviewed animal-welfare intervention.",
    offeredCause: "Animal welfare",
    opportunityType: "offer",
    ownerAlias: "QA Feed Owner B",
    ownerId: IDS.ownerB,
    reason: "Matches your AI safety research priority",
    reasonDetails: ["The requested review advances your stated AI-governance interest."],
    requestAction: "Review an AI-governance draft for two hours.",
    requestedCause: "AI safety research",
    sourceRevision: 7,
    verification: "A dated review document and donation receipt.",
  };
}

function livePayload(recommendations: RecommendationFixture[]) {
  return {
    authenticated: true,
    feedOpportunityCount: recommendations.length,
    generatedAt: new Date().toISOString(),
    learningDiagnostics: {
      activeModelKey: "feed-create-browser-v1",
      candidateModelKey: null,
      coldStart: true,
      directMatchesRandomized: false,
      exposureWriteStatus: "written",
      experiment: {
        affectedCandidateKey: null,
        arm: "not_assigned",
        assignmentProbability: 1,
        enabled: false,
        jointPropensity: 1,
        stableBucket: 0,
        stoppedByGuardrail: false,
      },
      guardrailReasons: [],
      mode: "heuristic",
      objective: "pareto_safe_additionality",
      privateProfileProseProcessed: false,
      requestId: recommendations[0]?.exposureRequestId ?? "",
      sensitiveAttributesUsed: false,
    },
    matchingOfferCount: recommendations.length,
    matchingOpportunityCount: recommendations.length,
    ownedOpportunities: [],
    ownedOpportunityCount: 0,
    profile: {
      causes: ["Global poverty reduction", "AI safety research"],
      weightedCauses: [],
      openToPayment: true,
      openToPledges: true,
      signalSources: ["Profile priorities"],
      learningEnabled: true,
      explorationPercent: 0,
      browsingSignalCount: 0,
      actionFeedbackCount: 0,
    },
    recentChanges: [],
    recommendations: recommendations.map((item, index) => ({
      ...item,
      actionCauseMatch: item.requestedCause,
      actionCauses: [item.requestedCause],
      actionKey: `fixture-${item.id}`,
      actionLabel: "Requested action",
      benefitCauses: [item.offeredCause],
      ctaLabel: "Review proposal",
      difficulty: 2.5,
      difficultyLabel: "Moderate",
      href:
        item.opportunityType === "donation_pool"
          ? `/donation-offsets?pool=${item.id}`
          : `/offers/${item.id}`,
      learnedActionSignalCount: 0,
      matchCause: item.offeredCause,
      matchClass: "direct",
      paretoPrediction: { paretoSuccess: item.id === IDS.offerA ? 0.92 : 0.81 },
      reason: item.reason ?? "Matches your stated priorities",
      reasonDetails: item.reasonDetails ?? [],
      reciprocalScore: 0.8,
      saved: false,
      score: 90 - index,
      semanticScore: 0.9,
      sourceLabel: "Moral trade",
      summary: `${item.requestedCause} ↔ ${item.offeredCause}`,
      trustLevel: 3,
      updatedAt: new Date().toISOString(),
      willingness: 70,
    })),
    routePlanner: {
      status: recommendations.length ? "ready" : "no_live",
      checkedAt: new Date().toISOString(),
      profile: {},
      needsMoreInput: [],
      routes: [],
      comparison: null,
      candidateCount: recommendations.length,
    },
    status: recommendations.length ? "ready" : "no_matches",
  };
}

function ownOnlyPayload() {
  return {
    ...livePayload([]),
    ownedOpportunityCount: 1,
    ownedOpportunities: [
      {
        id: IDS.ownOffer,
        opportunityType: "offer",
        href: `/trades/${IDS.ownOffer}/manage`,
        ctaLabel: "Manage & invite",
        sourceLabel: "Your live offer",
        ownerAlias: "You",
        offeredCause: "Own cause",
        requestedCause: "Own request",
        offerAction: "Do my own action.",
        requestAction: "Request my own action.",
        verification: "Own evidence.",
        duration: "One month",
        summary: "Own listing",
        updatedAt: new Date().toISOString(),
      },
    ],
  };
}

function ineligiblePayload() {
  const payment: RecommendationFixture = {
    ...recommendationA(),
    id: IDS.paymentOffer,
    exposureRequestId: IDS.paymentRequest,
    mode: "payment",
    offeredCause: "Paid benefit",
    requestedCause: "Paid request",
    offerAction: "Pay $25.",
    requestAction: "Complete a task.",
    sourceRevision: 1,
    verification: "Payment evidence.",
  };
  const redirect: RecommendationFixture = {
    ...recommendationA(),
    id: IDS.redirectOffer,
    exposureRequestId: IDS.redirectRequest,
    mode: "offset",
    offeredCause: "Redirect benefit",
    opportunityType: "donation_redirect",
    requestedCause: "Redirect request",
    offerAction: "Redirect a donation.",
    requestAction: "Match a donation.",
    sourceRevision: 1,
    verification: "Donation receipt.",
  };
  const pool: RecommendationFixture = {
    ...redirect,
    id: "fa300000-0000-4000-8000-000000000099",
    exposureRequestId: "fa500000-0000-4000-8000-000000000099",
    opportunityType: "donation_pool",
    ownerAlias: "QA Pool",
  };
  return livePayload([payment, redirect, pool]);
}

function authClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function signIn(email: string) {
  if (!QA_PASSWORD) throw new Error("FEED_CREATE_QA_PASSWORD is required.");
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: QA_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Isolated-QA sign-in failed for ${email}: ${error?.message ?? "no session"}`);
  }
  return data.session;
}

async function sessionCookies(session: Session) {
  const captured: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }> = [];
  const client = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(values) {
        captured.splice(0, captured.length, ...values);
      },
    },
  });
  const { error } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;
  return captured.map(({ name, value }) => ({
    name,
    value,
    url: BASE_URL,
    httpOnly: true,
    secure: BASE_URL.startsWith("https://"),
    sameSite: "Lax" as const,
  }));
}

async function authenticatedContext(
  browser: Browser,
  session: Session,
  viewport: { height: number; width: number },
) {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport });
  context.setDefaultTimeout(12_000);
  context.setDefaultNavigationTimeout(25_000);
  await context.addCookies(await sessionCookies(session));
  return context;
}

function attachDiagnostics(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const httpErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === new URL(BASE_URL).origin && response.status() >= 500) {
      httpErrors.push(`${response.status()} ${url.pathname}`);
    }
  });
  return () => {
    expect(consoleErrors, `console errors: ${consoleErrors.join("\n")}`).toEqual([]);
    expect(pageErrors, `page errors: ${pageErrors.join("\n")}`).toEqual([]);
    expect(httpErrors, `HTTP errors: ${httpErrors.join("\n")}`).toEqual([]);
  };
}

async function installFlashMonitor(page: Page) {
  await page.addInitScript(() => {
    const record = () => {
      const root = document.documentElement;
      if (!root) return;
      const text = root.textContent ?? "";
      const actionCount = document.querySelectorAll("[data-action='create-from-feed']").length;
      const state = { actionCount, text: text.slice(0, 10_000), time: performance.now() };
      const history = (window as unknown as { __feedCreateDomHistory?: typeof state[] })
        .__feedCreateDomHistory ?? [];
      history.push(state);
      (window as unknown as { __feedCreateDomHistory: typeof state[] }).__feedCreateDomHistory =
        history.slice(-500);
    };
    const observer = new MutationObserver(record);
    observer.observe(document, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", record, { once: true });
    record();
  });
}

async function interceptLiveNow(page: Page, payload: Record<string, unknown>) {
  await page.route("**/api/live-now", async (route) => {
    await route.fulfill({
      body: JSON.stringify(payload),
      contentType: "application/json",
      status: 200,
    });
  });
}

async function waitForFeedTerminalState(
  page: Page,
  expectedStatus?: "no_matches" | "profile_incomplete" | "ready" | "signed_out" | "unavailable",
) {
  const root = page.locator("html");
  if (expectedStatus) {
    await expect(root).toHaveAttribute("data-mt-live-now-ready", expectedStatus, {
      timeout: 25_000,
    });
  } else {
    await expect(root).toHaveAttribute(
      "data-mt-live-now-ready",
      /^(?:no_matches|profile_incomplete|ready|signed_out|unavailable)$/,
      { timeout: 25_000 },
    );
  }
  await page.waitForFunction(
    () =>
      (window as unknown as { __MT_FEED_CREATE_PHASE1_ACTIVE__?: boolean })
        .__MT_FEED_CREATE_PHASE1_ACTIVE__ === true,
    undefined,
    { timeout: 25_000 },
  );
}

async function noHorizontalOverflow(page: Page) {

  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

function sourceUrl(input: {
  exposureRequestId: string;
  opportunityId: string;
  sourceRevision: number;
  sourceType?: string;
}) {
  const query = new URLSearchParams({
    fromFeed: "1",
    sourceType: input.sourceType ?? "offer",
    sourceId: input.opportunityId,
    exposureRequestId: input.exposureRequestId,
    sourceRevision: String(input.sourceRevision),
  });
  return `/trades/new?${query.toString()}`;
}

async function advancePrefilledDraft(page: Page, options: { submit: boolean }) {
  await expect(page.getByRole("heading", { name: /Based on .* open offer/ })).toBeVisible();
  await expect(page.getByText("From source", { exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What will you do?" })).toBeVisible();
  await expect(page.getByText("From source", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "What will the other participant do?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("No-trade baseline").fill(
    "Without this trade, both people continue the plans recorded in the original opportunity.",
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByLabel("Duration")).not.toHaveValue("");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: /^Evidence From source/ }),
  ).not.toHaveValue("");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Exit conditions").fill(
    "Either participant may end future obligations by notice; completed periods remain recorded.",
  );
  const review = page.getByRole("region", {
    name: "Confirm each material field separately.",
  });
  await expect(
    review.getByText(
      "Editing an imported field clears its confirmation. These confirmations are stored; the Feed match score and reasons are not.",
      { exact: true },
    ),
  ).toBeVisible();
  for (const label of [
    "Counterparty",
    "Priority you advance",
    "Priority you want advanced",
    "Your commitment",
    "Counterparty commitment",
    "Duration",
    "Evidence requirements",
  ]) {
    const checkboxName =
      label === "Counterparty"
        ? /^Counterparty(?! commitment(?:$|\s))/
        : new RegExp(`^${label}`);
    await review.getByRole("checkbox", { name: checkboxName }).check();
  }
  if (options.submit) {
    await page.getByText(/This proposal is voluntary/).click();
  }
}

async function finishSourceFlow(input: {
  browser: Browser;
  email: string;
  payload: Record<string, unknown>;
  screenshotPrefix: string;
  submit: boolean;
  viewport: { height: number; width: number };
}) {
  const session = await signIn(input.email);
  const context = await authenticatedContext(input.browser, session, input.viewport);
  const page = await context.newPage();
  const assertDiagnostics = attachDiagnostics(page);
  await installFlashMonitor(page);
  await interceptLiveNow(page, input.payload);
  const eventBodies: Array<Record<string, unknown>> = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/feed-create/events") && request.method() === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      eventBodies.push(body);
    }
  });

  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  await waitForFeedTerminalState(page, "ready");
  const action = page.getByRole("link", { name: "Create a trade from this", exact: true });
  await expect(action).toBeVisible({ timeout: 25_000 });
  await expect(action).toHaveCount(1);
  const actionBox = await action.boundingBox();
  expect(actionBox).not.toBeNull();
  expect(actionBox!.x + actionBox!.width).toBeLessThanOrEqual(input.viewport.width + 1);
  await noHorizontalOverflow(page);
  await action.click();
  await expect(page).toHaveURL(/\/trades\/new\?fromFeed=1/);
  await expect(page.getByText(/match ·/)).toBeVisible();
  await advancePrefilledDraft(page, { submit: input.submit });
  await noHorizontalOverflow(page);
  await page.screenshot({
    fullPage: true,
    path: `test-results/${input.screenshotPrefix}-review.png`,
  });

  const buttonName = input.submit ? "Submit for review" : "Save private draft";
  const saveButton = page.getByRole("button", { name: buttonName, exact: true });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await expect(page).toHaveURL(/\/trades\/[0-9a-f-]+\/manage/);
  await expect(page.getByText("Source-bound counteroffer", { exact: true })).toBeVisible();
  await expect(page.getByText(/has not received this draft/i)).toBeVisible();
  await expect(page.getByText(/cannot be published/i)).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({
    fullPage: true,
    path: `test-results/${input.screenshotPrefix}-manage.png`,
  });

  expect(eventBodies.some((body) => body.eventType === "action_shown")).toBe(true);
  expect(eventBodies.some((body) => body.eventType === "action_clicked")).toBe(true);
  for (const body of eventBodies) {
    expect(Object.keys(body).sort()).toEqual(
      [
        "eventType",
        "exposureRequestId",
        "opportunityId",
        "opportunityType",
        "sourceRevision",
      ].sort(),
    );
    expect(JSON.stringify(body)).not.toMatch(/reason|match|cause|evidence|payment|ownerAlias|form/i);
  }
  assertDiagnostics();
  await context.close();
}

test.describe.serial("authenticated Feed-to-Create Phase 1", () => {
  test("two users receive distinct receipt-bound source drafts on desktop and 390px mobile", async ({
    browser,
  }) => {
    await finishSourceFlow({
      browser,
      email: EMAILS.viewerA,
      payload: livePayload([recommendationA()]),
      screenshotPrefix: "feed-create-viewer-a-desktop",
      submit: false,
      viewport: { height: 1000, width: 1440 },
    });
    await finishSourceFlow({
      browser,
      email: EMAILS.viewerB,
      payload: livePayload([recommendationB()]),
      screenshotPrefix: "feed-create-viewer-b-mobile",
      submit: true,
      viewport: { height: 844, width: 390 },
    });
  });

  test("zero-data, own-item, pool, redirect, and payment feeds never flash or show the action", async ({
    browser,
  }) => {
    const session = await signIn(EMAILS.viewerA);
    for (const [label, payload] of [
      ["own", ownOnlyPayload()],
      ["ineligible", ineligiblePayload()],
    ] as const) {
      const context = await authenticatedContext(browser, session, { height: 844, width: 390 });
      const page = await context.newPage();
      const assertDiagnostics = attachDiagnostics(page);
      await installFlashMonitor(page);
      await interceptLiveNow(page, payload);
      await page.goto("/feed", { waitUntil: "domcontentloaded" });
      await waitForFeedTerminalState(page);
      await expect(page.getByRole("link", { name: "Create a trade from this" })).toHaveCount(0);
      const history = await page.evaluate(
        () =>
          (window as unknown as {
            __feedCreateDomHistory?: Array<{ actionCount: number }>;
          }).__feedCreateDomHistory ?? [],
      );
      expect(history.some((entry) => entry.actionCount > 0), `${label} action flash`).toBe(false);
      await noHorizontalOverflow(page);
      assertDiagnostics();
      await context.close();
    }

    const zeroSession = await signIn(EMAILS.zero);
    const zeroContext = await authenticatedContext(browser, zeroSession, {
      height: 844,
      width: 390,
    });
    const zeroPage = await zeroContext.newPage();
    await installFlashMonitor(zeroPage);
    await interceptLiveNow(zeroPage, livePayload([]));
    await zeroPage.goto("/feed", { waitUntil: "domcontentloaded" });
    await waitForFeedTerminalState(zeroPage, "no_matches");
    await expect(zeroPage.getByText(/No open opportunity currently matches your profile/)).toBeVisible();
    await expect(zeroPage.getByRole("link", { name: "Create a trade from this" })).toHaveCount(0);
    const zeroHistory = await zeroPage.evaluate(
      () =>
        (window as unknown as {
          __feedCreateDomHistory?: Array<{ actionCount: number; text: string }>;
        }).__feedCreateDomHistory ?? [],
    );
    expect(zeroHistory.some((entry) => entry.actionCount > 0)).toBe(false);
    expect(zeroHistory.some((entry) => /Alex R\.|Sam G\.|Riley P\.|92%/.test(entry.text))).toBe(false);
    await zeroContext.close();
  });

  test("spoofed, zero-data, own, payment, redirect, pool, incomplete, and stale source URLs fail closed", async ({
    browser,
  }) => {
    const sessions = {
      viewerA: await signIn(EMAILS.viewerA),
      zero: await signIn(EMAILS.zero),
    };
    const cases = [
      {
        label: "spoofed receipt",
        session: sessions.viewerA,
        url: sourceUrl({
          exposureRequestId: IDS.requestB,
          opportunityId: IDS.offerB,
          sourceRevision: 7,
        }),
      },
      {
        label: "zero data",
        session: sessions.zero,
        url: sourceUrl({
          exposureRequestId: IDS.requestA,
          opportunityId: IDS.offerA,
          sourceRevision: 3,
        }),
      },
      {
        label: "own item",
        session: sessions.viewerA,
        url: sourceUrl({
          exposureRequestId: IDS.ownRequest,
          opportunityId: IDS.ownOffer,
          sourceRevision: 1,
        }),
      },
      {
        label: "payment",
        session: sessions.viewerA,
        url: sourceUrl({
          exposureRequestId: IDS.paymentRequest,
          opportunityId: IDS.paymentOffer,
          sourceRevision: 1,
        }),
      },
      {
        label: "redirect",
        session: sessions.viewerA,
        url: sourceUrl({
          exposureRequestId: IDS.redirectRequest,
          opportunityId: IDS.redirectOffer,
          sourceRevision: 1,
        }),
      },
      {
        label: "pool",
        session: sessions.viewerA,
        url: sourceUrl({
          exposureRequestId: IDS.redirectRequest,
          opportunityId: IDS.redirectOffer,
          sourceRevision: 1,
          sourceType: "donation_pool",
        }),
      },
      {
        label: "incomplete",
        session: sessions.viewerA,
        url: sourceUrl({
          exposureRequestId: IDS.incompleteRequest,
          opportunityId: IDS.incompleteOffer,
          sourceRevision: 1,
        }),
      },
      {
        label: "stale",
        session: sessions.viewerA,
        url: sourceUrl({
          exposureRequestId: IDS.requestA,
          opportunityId: IDS.offerA,
          sourceRevision: 2,
        }),
      },
    ];

    for (const entry of cases) {
      const context = await authenticatedContext(browser, entry.session, {
        height: 844,
        width: 390,
      });
      const page = await context.newPage();
      const assertDiagnostics = attachDiagnostics(page);
      await installFlashMonitor(page);
      await page.goto(entry.url);
      await expect(page.getByRole("heading", { name: "No draft was created." })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Based on .* open offer/ })).toHaveCount(0);
      await expect(page.getByText("From source", { exact: true })).toHaveCount(0);
      const history = await page.evaluate(
        () =>
          (window as unknown as {
            __feedCreateDomHistory?: Array<{ text: string }>;
          }).__feedCreateDomHistory ?? [],
      );
      expect(
        history.some((item) => item.text.includes("Based on QA Feed Owner")),
        `${entry.label} source-context flash`,
      ).toBe(false);
      await noHorizontalOverflow(page);
      assertDiagnostics();
      await context.close();
    }
  });

  test("an existing active draft produces an explicit duplicate acknowledgement gate", async ({
    browser,
  }) => {
    const session = await signIn(EMAILS.viewerA);
    const context = await authenticatedContext(browser, session, { height: 900, width: 1280 });
    const page = await context.newPage();
    await page.goto(
      sourceUrl({
        exposureRequestId: IDS.requestA,
        opportunityId: IDS.offerA,
        sourceRevision: 3,
      }),
    );
    await expect(page.getByText(/You already have 1 active draft/)).toBeVisible();
    await advancePrefilledDraft(page, { submit: false });
    const save = page.getByRole("button", { name: "Save private draft", exact: true });
    await expect(save).toBeDisabled();
    await page.getByText(/I understand that 1 active draft already exists/).click();
    await expect(save).toBeEnabled();
    await context.close();
  });
});
