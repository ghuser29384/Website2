import { createClient as createSupabaseClient, type Session } from "@supabase/supabase-js";
import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
  type Request,
} from "@playwright/test";

import { resolveAuthenticatedUser } from "../src/lib/auth-resolution";

const MOCK_URL = process.env.AUTH_RESOLUTION_FIXTURE_URL ?? "http://127.0.0.1:3231";
const APP_URL = process.env.AUTH_RESOLUTION_BASE_URL ?? "http://127.0.0.1:3211";
const APP_ORIGIN = new URL(APP_URL).origin;
const APP_HOSTNAME = new URL(APP_URL).hostname;
const FIXTURE_CONTROL_SECRET =
  process.env.AUTH_RESOLUTION_FIXTURE_CONTROL_SECRET ??
  (process.env.AUTH_RESOLUTION_BASE_URL
    ? ""
    : "auth-resolution-local-control-fixture");

if (process.env.AUTH_RESOLUTION_BASE_URL && !process.env.AUTH_RESOLUTION_FIXTURE_URL) {
  throw new Error("Hosted auth-resolution tests require AUTH_RESOLUTION_FIXTURE_URL.");
}
if (!FIXTURE_CONTROL_SECRET) {
  throw new Error("Hosted auth-resolution tests require AUTH_RESOLUTION_FIXTURE_CONTROL_SECRET.");
}
const USER_ID = "fa100000-0000-4000-8000-000000000630";
const OTHER_USER_ID = "fa100000-0000-4000-8000-000000000631";

type FixtureMode = "delayed" | "expired" | "fast" | "invalid" | "mismatch";

interface FixtureSession {
  accessToken: string;
  cookieName: string;
  cookieValue: string;
  issuer: string;
  session: Session;
}

async function getFixtureSession(request: APIRequestContext, mode: FixtureMode) {
  const response = await request.get(`${MOCK_URL}/__fixture/session?mode=${mode}`, {
    headers: { "x-auth-resolution-fixture-control": FIXTURE_CONTROL_SECRET },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as FixtureSession;
}

async function setSession(context: BrowserContext, fixture: FixtureSession) {
  await context.addCookies([
    {
      domain: APP_HOSTNAME,
      httpOnly: true,
      name: fixture.cookieName,
      path: "/",
      sameSite: "Lax",
      secure: APP_ORIGIN.startsWith("https://"),
      value: fixture.cookieValue,
    },
    {
      domain: APP_HOSTNAME,
      httpOnly: false,
      name: "mt_analytics_opt_out",
      path: "/",
      sameSite: "Lax",
      secure: APP_ORIGIN.startsWith("https://"),
      value: "1",
    },
  ]);
}

async function resetFixture(request: APIRequestContext) {
  const response = await request.post(`${MOCK_URL}/__fixture/reset`, {
    headers: { "x-auth-resolution-fixture-control": FIXTURE_CONTROL_SECRET },
  });
  expect(response.ok()).toBeTruthy();
}

async function getFixtureJson(request: APIRequestContext, path: string) {
  const response = await request.get(`${MOCK_URL}${path}`, {
    headers: { "x-auth-resolution-fixture-control": FIXTURE_CONTROL_SECRET },
  });
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

async function installPreviewBypass(context: BrowserContext) {
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!bypassSecret) return;

  await context.route(`${APP_ORIGIN}/**`, async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        "x-vercel-protection-bypass": bypassSecret,
        "x-vercel-set-bypass-cookie": "true",
      },
    });
  });
}

function latencySummary(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const percentile = (fraction: number) =>
    sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
  return {
    count: sorted.length,
    maxMs: sorted.at(-1),
    medianMs: percentile(0.5),
    minMs: sorted[0],
    p95Ms: percentile(0.95),
    valuesMs: values,
  };
}

interface AuthDomState {
  authenticatedSurface: boolean;
  observedAtMs: number;
  privateContent: boolean;
  signedIn: boolean;
  signedOut: boolean;
  url: string;
}

async function installAuthDomObserver(page: Page) {
  const history: AuthDomState[] = [];
  await page.exposeBinding(
    "__recordAuthResolutionDomState",
    (_source, state: AuthDomState) => {
      history.push(state);
    },
  );
  await page.addInitScript(() => {
    const observedWindow = window as typeof window & {
      __recordAuthResolutionDomState?: (state: AuthDomState) => Promise<void>;
    };
    let previous = "";
    const record = () => {
      const text = document.body?.innerText ?? "";
      const feedState = document
        .querySelector('[data-mt-live-now="adaptive"]')
        ?.getAttribute("data-mt-live-now-state");
      const state = {
        authenticatedSurface:
          text.includes("Your profile") ||
          text.includes("What priorities are being exchanged?") ||
          text.includes("Account — saved settings and records.") ||
          feedState === "ready" ||
          feedState === "no_matches" ||
          feedState === "profile_incomplete",
        privateContent:
          text.includes("Auth Resolution QA") ||
          text.includes("History limited") ||
          text.includes("Your profile") ||
          text.includes("What priorities are being exchanged?") ||
          text.includes("Account — saved settings and records.") ||
          feedState === "ready" ||
          feedState === "no_matches" ||
          feedState === "profile_incomplete" ||
          Boolean(document.querySelector("[data-mt-live-now-recommendation]")),
        signedIn:
          text.includes("Signed in") ||
          text.includes("Your profile") ||
          text.includes("What priorities are being exchanged?"),
        signedOut:
          text.includes("Profile unavailable") ||
          text.includes("Sign in required") ||
          text.includes("Sign in to build a trade.") ||
          text.includes("Sign in to see a feed based on your moral priorities."),
      };
      const serialized = JSON.stringify(state);
      if (serialized !== previous) {
        void observedWindow.__recordAuthResolutionDomState?.({
          ...state,
          observedAtMs: Date.now(),
          url: window.location.href,
        });
        previous = serialized;
      }
    };
    new MutationObserver(record).observe(document, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    document.addEventListener("DOMContentLoaded", record, { once: true });
  });
  return history;
}

function expectNoSignedOutFlash(history: AuthDomState[]) {
  expect(history.some((state) => state.signedOut)).toBe(false);
}

interface VerificationEvent {
  atMs: number;
  mode: string;
  nextAttempt: number;
  result: string;
}

async function expectOrderedDelayedRecoveryBeforeAuthenticatedRender(
  request: APIRequestContext,
  history: AuthDomState[],
  historyStart: number,
  expectedAttempts = 2,
) {
  const fixtureEvents = (await getFixtureJson(request, "/__fixture/events")) as {
    attempts: Record<string, number>;
    verificationEvents: VerificationEvent[];
  };
  expect(fixtureEvents.attempts).toEqual({ delayed: expectedAttempts });
  const expectedVerificationEvents = Array.from(
    { length: expectedAttempts },
    (_, index) => ({
      mode: "delayed",
      nextAttempt: index + 1,
      result: index === 0 ? "retryable_503" : "verified_user",
    }),
  );
  expect(
    fixtureEvents.verificationEvents.map(({ mode, nextAttempt, result }) => ({
      mode,
      nextAttempt,
      result,
    })),
  ).toEqual(expectedVerificationEvents);

  await expect
    .poll(() => history.slice(historyStart).some((state) => state.authenticatedSurface))
    .toBe(true);
  const firstAuthenticatedRender = history
    .slice(historyStart)
    .find((state) => state.authenticatedSurface);
  const verifiedAtMs = fixtureEvents.verificationEvents[1]?.atMs;
  expect(verifiedAtMs).toEqual(expect.any(Number));
  expect(firstAuthenticatedRender?.observedAtMs).toBeGreaterThanOrEqual(verifiedAtMs);
}

function isExpectedNextPrefetchAbort(request: Request) {
  const failure = request.failure();
  if (failure?.errorText !== "net::ERR_ABORTED" || request.isNavigationRequest()) {
    return false;
  }

  const url = new URL(request.url());
  const headers = request.headers();
  if (url.origin !== APP_ORIGIN) return false;

  const isNextRoutePrefetch =
    request.method() === "GET" &&
    request.resourceType() === "fetch" &&
    (url.searchParams.has("_rsc") ||
      headers["next-router-prefetch"] === "1" ||
      headers.rsc === "1" ||
      Object.hasOwn(headers, "next-url"));
  const isDiscoverLinkPrefetch =
    request.method() === "GET" &&
    url.pathname === "/discover" &&
    url.searchParams.get("domain") === "offers" &&
    url.searchParams.get("view") === "list";
  const isBestEffortFunnelEvent =
    request.method() === "POST" && url.pathname === "/api/funnel-events";
  const isSupersededInputAssistLoad =
    request.method() === "GET" &&
    ["/moral-trade-input-assist.js", "/moral-trade-input-standards.json"].includes(
      url.pathname,
    );

  return (
    isNextRoutePrefetch ||
    isDiscoverLinkPrefetch ||
    isBestEffortFunnelEvent ||
    isSupersededInputAssistLoad
  );
}

function watchPage(page: Page) {
  const consoleErrors: string[] = [];
  const expectedAbortedRequests: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location();
      consoleErrors.push(
        `${message.text()}${location.url ? ` (${location.url}:${location.lineNumber})` : ""}`,
      );
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (isExpectedNextPrefetchAbort(request)) {
      expectedAbortedRequests.push(
        `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`,
      );
      return;
    }
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`);
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === APP_ORIGIN && response.status() >= 400) {
      badResponses.push(`${response.status()} ${url.pathname}`);
    }
  });

  return {
    badResponses,
    consoleErrors,
    expectedAbortedRequests,
    failedRequests,
    pageErrors,
  };
}

async function attachExpectedBrowserAborts(
  name: string,
  failures: ReturnType<typeof watchPage>,
) {
  await test.info().attach(`${name}-expected-browser-aborts.json`, {
    body: Buffer.from(
      JSON.stringify({ requests: failures.expectedAbortedRequests }, null, 2),
    ),
    contentType: "application/json",
  });
}

async function expectNoBrowserFailures(
  page: Page,
  failures: ReturnType<typeof watchPage>,
) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  expect({
    badResponses: failures.badResponses,
    consoleErrors: failures.consoleErrors,
    failedRequests: failures.failedRequests,
    pageErrors: failures.pageErrors,
  }).toEqual({
    badResponses: [],
    consoleErrors: [],
    failedRequests: [],
    pageErrors: [],
  });
}

const viewports = [
  { height: 900, label: "desktop", width: 1440 },
  { height: 844, label: "mobile", width: 390 },
] as const;

for (const viewport of viewports) {
  test(`valid delayed auth stays signed in for 10 ${viewport.label} journeys`, async ({
    context,
    page,
    request,
  }) => {
    test.setTimeout(240_000);
    await installPreviewBypass(context);
    await page.setViewportSize(viewport);
    const authHistory = await installAuthDomObserver(page);
    const fixture = await getFixtureSession(request, "delayed");
    await setSession(context, fixture);
    const failures = watchPage(page);
    const profileLatenciesMs: number[] = [];

    for (let iteration = 0; iteration < 10; iteration += 1) {
      await resetFixture(request);
      const profileHistoryStart = authHistory.length;
      const profileStartedAt = Date.now();
      const profileResponse = await page.goto(`/profile?auth_iteration=${iteration}`);
      profileLatenciesMs.push(Date.now() - profileStartedAt);
      expect(profileResponse?.ok()).toBeTruthy();
      await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText("Signed in", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Profile unavailable" })).toHaveCount(0);
      await expectOrderedDelayedRecoveryBeforeAuthenticatedRender(
        request,
        authHistory,
        profileHistoryStart,
      );
      expectNoSignedOutFlash(authHistory);

      await resetFixture(request);
      const composerHistoryStart = authHistory.length;
      const composerResponse = await page.goto(
        `/trades/new?example=seed-victoria&auth_iteration=${iteration}`,
      );
      expect(composerResponse?.ok()).toBeTruthy();
      await expect(
        page.getByRole("heading", { name: "What priorities are being exchanged?" }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: "Sign in to build a trade." })).toHaveCount(0);
      await expectOrderedDelayedRecoveryBeforeAuthenticatedRender(
        request,
        authHistory,
        composerHistoryStart,
      );
      expectNoSignedOutFlash(authHistory);

      await resetFixture(request);
      const dashboardHistoryStart = authHistory.length;
      const dashboardResponse = await page.goto(`/dashboard?auth_iteration=${iteration}`);
      expect(dashboardResponse?.ok()).toBeTruthy();
      await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
      await expectOrderedDelayedRecoveryBeforeAuthenticatedRender(
        request,
        authHistory,
        dashboardHistoryStart,
      );
      expectNoSignedOutFlash(authHistory);

      await resetFixture(request);
      const feedHistoryStart = authHistory.length;
      const feedResponse = await page.goto(`/feed?auth_iteration=${iteration}`, {
        waitUntil: "domcontentloaded",
      });
      expect(feedResponse?.ok()).toBeTruthy();
      const liveFeed = page.locator('[data-mt-live-now="adaptive"]');
      await expect(liveFeed).toBeVisible({ timeout: 20_000 });
      await expect(liveFeed).not.toHaveAttribute("data-mt-live-now-state", "signed_out");
      await expect(
        page.getByRole("heading", {
          name: "Sign in to see a feed based on your moral priorities.",
        }),
      ).toHaveCount(0);
      await expectOrderedDelayedRecoveryBeforeAuthenticatedRender(
        request,
        authHistory,
        feedHistoryStart,
        // Feed loads its server-rendered shell and then two distinct private
        // API resources. The first resolver consumes the single bounded retry;
        // both later request-scoped resolvers succeed on their first attempt.
        4,
      );
      expectNoSignedOutFlash(authHistory);

      await expectNoBrowserFailures(page, failures);
    }

    await test.info().attach(`auth-resolution-delayed-${viewport.label}-latency.json`, {
      body: Buffer.from(JSON.stringify(latencySummary(profileLatenciesMs), null, 2)),
      contentType: "application/json",
    });
    await attachExpectedBrowserAborts(
      `auth-resolution-delayed-${viewport.label}`,
      failures,
    );
  });
}

test("normal remote verification does not enter retry backoff", async ({ context, page, request }) => {
  await installPreviewBypass(context);
  await installAuthDomObserver(page);
  await resetFixture(request);
  const fixture = await getFixtureSession(request, "fast");
  await setSession(context, fixture);

  // Compile and hydrate the route before measuring auth behavior. Cold Next.js
  // compilation is not verifier latency and can dominate a local dev navigation.
  await page.goto("/profile?fast_path_warmup=1");
  await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();
  await resetFixture(request);

  const latenciesMs: number[] = [];
  for (let iteration = 0; iteration < 20; iteration += 1) {
    await resetFixture(request);
    const startedAt = Date.now();
    await page.goto(`/profile?fast_path_measured=${iteration}`);
    latenciesMs.push(Date.now() - startedAt);
    await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();

    const stats = await getFixtureJson(request, "/__fixture/stats");
    expect(stats.fast).toBe(1);
    expect(stats.delayed).toBeUndefined();
  }
  expect(Math.max(...latenciesMs)).toBeLessThan(5_000);
  await test.info().attach("auth-resolution-fast-latency.json", {
    body: Buffer.from(JSON.stringify(latencySummary(latenciesMs), null, 2)),
    contentType: "application/json",
  });
});

test("expired and invalid identities fail closed without private content", async ({
  browser,
  request,
}) => {
  const negativeRoutes = [
    {
      privateHeading: "Your profile",
      route: "/profile",
      signedOutHeading: "Profile unavailable",
      type: "profile",
    },
    {
      privateHeading: "What priorities are being exchanged?",
      route: "/trades/new?example=seed-victoria",
      signedOutHeading: "Sign in to build a trade.",
      type: "composer",
    },
    {
      privateHeading: "Account",
      route: "/dashboard",
      signedOutHeading: "Sign in",
      type: "dashboard",
    },
    {
      privateHeading: "",
      route: "/feed",
      signedOutHeading: "Sign in to see a feed based on your moral priorities.",
      type: "feed",
    },
  ] as const;

  for (const mode of ["expired", "invalid"] as const) {
    const fixture = await getFixtureSession(request, mode);
    for (const negativeRoute of negativeRoutes) {
      const context = await browser.newContext();
      await installPreviewBypass(context);
      await setSession(context, fixture);
      const page = await context.newPage();
      const authHistory = await installAuthDomObserver(page);
      const failures = watchPage(page);

      const separator = negativeRoute.route.includes("?") ? "&" : "?";
      const response = await page.goto(
        `${negativeRoute.route}${separator}fixture=${mode}`,
        { waitUntil: "domcontentloaded" },
      );
      expect(response?.ok()).toBeTruthy();
      if (negativeRoute.type === "dashboard") {
        await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard/u);
      } else {
        await expect(
          page.getByRole("heading", { name: negativeRoute.signedOutHeading }),
        ).toBeVisible({ timeout: 20_000 });
      }
      if (negativeRoute.privateHeading) {
        await expect(
          page.getByRole("heading", { name: negativeRoute.privateHeading }),
        ).toHaveCount(0);
      }
      await expect(page.getByText("Auth Resolution QA", { exact: true })).toHaveCount(0);
      await expect(page.locator("[data-mt-live-now-recommendation]")).toHaveCount(0);
      expect(
        authHistory.some(
          (state) => state.privateContent || state.authenticatedSurface || state.signedIn,
        ),
      ).toBe(false);
      await expectNoBrowserFailures(page, failures);
      await attachExpectedBrowserAborts(
        `auth-resolution-${mode}-${negativeRoute.type}`,
        failures,
      );
      await context.close();
    }
  }
});

test("fixture controls reject missing and incorrect credentials", async ({ request }) => {
  const missing = await request.get(`${MOCK_URL}/__fixture/session?mode=fast`);
  expect(missing.status()).toBe(404);
  const incorrect = await request.get(`${MOCK_URL}/__fixture/session?mode=fast`, {
    headers: { "x-auth-resolution-fixture-control": "incorrect-fixture-secret" },
  });
  expect(incorrect.status()).toBe(404);
});

test("cryptographically verified claims/session mismatch fails closed", async ({ request }) => {
  const fixture = await getFixtureSession(request, "mismatch");
  const client = createSupabaseClient(MOCK_URL, "auth-resolution-public-fixture", {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  let remoteCalls = 0;

  const result = await resolveAuthenticatedUser(
    {
      getClaims: () => client.auth.getClaims(fixture.accessToken),
      getSession: async () => ({ data: { session: fixture.session }, error: null }),
      getUser: async () => {
        remoteCalls += 1;
        return { data: { user: null }, error: null };
      },
    },
    {
      claimsPolicy: {
        audience: "authenticated",
        issuer: fixture.issuer,
        mode: "enabled",
        activeAsymmetricSignerProven: true,
      },
      reporter: () => {},
    },
  );

  expect(result.ok).toBe(false);
  expect(result.outcome).toBe("claims_session_mismatch");
  expect(result.claimsDisposition).toBe("mismatch");
  expect(remoteCalls).toBe(0);
  expect(JSON.stringify(result)).not.toContain(USER_ID);
  expect(JSON.stringify(result)).not.toContain(OTHER_USER_ID);
});

test("private JSON endpoints retain no-store and Vary Cookie headers", async ({
  context,
  page,
  request,
}) => {
  await installPreviewBypass(context);
  const fixture = await getFixtureSession(request, "fast");
  await setSession(context, fixture);

  // The first browser request sets Vercel's scoped bypass cookie for the
  // APIRequestContext used below. Local runs simply render the page.
  const bootstrapResponse = await page.goto("/profile?cache_header_bootstrap=1");
  expect(bootstrapResponse?.ok()).toBeTruthy();

  const liveNowResponse = await page.request.get("/api/live-now");
  expect(liveNowResponse.ok()).toBeTruthy();
  expect(liveNowResponse.headers()["cache-control"]).toContain("private");
  expect(liveNowResponse.headers()["cache-control"]).toContain("no-store");
  expect(liveNowResponse.headers().vary).toContain("Cookie");
  const accountResponse = await page.request.get("/api/live-account");
  expect(accountResponse.ok()).toBeTruthy();
  expect(accountResponse.headers()["cache-control"]).toContain("private");
  expect(accountResponse.headers()["cache-control"]).toContain("no-store");
  expect(accountResponse.headers().vary).toContain("Cookie");
});
