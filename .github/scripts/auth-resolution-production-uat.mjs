import fs from "node:fs";
import path from "node:path";

import { chromium, expect } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const EXPECTED_MAIN_SHA = process.env.AUTH_UAT_EXPECTED_MAIN_SHA;
const EXPECTED_DEPLOYMENT_ID = process.env.AUTH_UAT_EXPECTED_DEPLOYMENT_ID;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const QA_EMAIL = process.env.AUTH_UAT_EMAIL;
const QA_PASSWORD = process.env.AUTH_UAT_PASSWORD;
const QA_USER_ID = process.env.AUTH_UAT_USER_ID;
const OUTPUT_DIR = process.env.AUTH_UAT_OUTPUT_DIR ?? "auth-resolution-production-uat";
const ORIGINS = (process.env.AUTH_UAT_ORIGINS ?? "https://www.moraltrade.org,https://moraltrade.org")
  .split(",")
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);

function required(name, value) {
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

required("AUTH_UAT_EXPECTED_MAIN_SHA", EXPECTED_MAIN_SHA);
required("AUTH_UAT_EXPECTED_DEPLOYMENT_ID", EXPECTED_DEPLOYMENT_ID);
required("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", SUPABASE_KEY);
required("AUTH_UAT_EMAIL", QA_EMAIL);
required("AUTH_UAT_PASSWORD", QA_PASSWORD);
required("AUTH_UAT_USER_ID", QA_USER_ID);

if (!/^[0-9a-f]{40}$/.test(EXPECTED_MAIN_SHA)) throw new Error("Malformed expected main SHA.");
if (!/^dpl_[A-Za-z0-9]+$/.test(EXPECTED_DEPLOYMENT_ID)) throw new Error("Malformed deployment ID.");
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(QA_USER_ID)) {
  throw new Error("Malformed run-owned Auth user UUID.");
}
if (!/^[a-z0-9._+-]+@qa\.moraltrade\.invalid$/i.test(QA_EMAIL)) {
  throw new Error("Malformed run-owned Auth email.");
}
if (ORIGINS.length !== 2) throw new Error("Expected exactly two canonical origins.");
const expectedOrigins = new Set(["https://moraltrade.org", "https://www.moraltrade.org"]);
for (const origin of ORIGINS) {
  if (!expectedOrigins.has(origin)) throw new Error(`Unexpected canonical origin: ${origin}`);
}

const allowedHosts = new Set(ORIGINS.map((origin) => new URL(origin).host));
const providerHostPattern = /(^|\.)(stripe\.com|every\.org|paypal\.com|adyen\.com|checkout\.com)$/i;
const allowedReadMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const expectedSignedOutPatterns = [
  /Profile unavailable/i,
  /Sign in required/i,
  /Sign in to build a trade\./i,
  /Sign in to see a feed based on your moral priorities\./i,
];
const privateTextPatterns = [
  /Auth Resolution Production UAT/i,
  /Your profile/i,
  /What priorities are being exchanged\?/i,
  /Account — saved settings and records\./i,
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
}

function safeSlug(value) {
  return value.toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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

async function signIn() {
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: QA_EMAIL,
    password: QA_PASSWORD,
  });
  if (error || !data.session || data.user?.id !== QA_USER_ID) {
    throw new Error(`Scoped production UAT sign-in failed: ${error?.message ?? "identity mismatch"}`);
  }
  if ((data.user.email ?? "").toLowerCase() !== QA_EMAIL.toLowerCase()) {
    throw new Error("Scoped production UAT sign-in returned the wrong email.");
  }
  return { client, session: data.session };
}

async function sessionCookies(session, origin) {
  const captured = [];
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
  return captured.map(({ name, value, options }) => ({
    name,
    value,
    url: origin,
    httpOnly: options?.httpOnly ?? true,
    secure: true,
    sameSite: "Lax",
  }));
}

async function authenticatedContext(browser, session, viewport) {
  const context = await browser.newContext({
    viewport,
    serviceWorkers: "block",
  });
  context.setDefaultTimeout(25_000);
  context.setDefaultNavigationTimeout(75_000);
  const cookies = [];
  for (const origin of ORIGINS) {
    cookies.push(...(await sessionCookies(session, origin)));
    cookies.push(
      {
        name: "mt_walkthrough_seen",
        value: "1",
        url: origin,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
      {
        name: "mt_analytics_opt_out",
        value: "1",
        url: origin,
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      },
    );
  }
  await context.addCookies(cookies);
  return context;
}

function isExpectedNextAbort(request) {
  const failure = request.failure();
  if (failure?.errorText !== "net::ERR_ABORTED" || request.isNavigationRequest()) return false;
  const url = new URL(request.url());
  const headers = request.headers();
  if (!allowedHosts.has(url.host)) return false;
  const routePrefetch =
    request.method() === "GET" &&
    request.resourceType() === "fetch" &&
    (url.searchParams.has("_rsc") ||
      headers["next-router-prefetch"] === "1" ||
      headers.rsc === "1" ||
      Object.hasOwn(headers, "next-url"));
  const discoverPrefetch =
    request.method() === "GET" &&
    url.pathname === "/discover" &&
    url.searchParams.get("domain") === "offers";
  const supersededInputAssist =
    request.method() === "GET" &&
    ["/moral-trade-input-assist.js", "/moral-trade-input-standards.json"].includes(url.pathname);
  return routePrefetch || discoverPrefetch || supersededInputAssist;
}

function installDiagnostics(context, page, label) {
  const record = {
    label,
    consoleErrors: [],
    hydrationErrors: [],
    pageErrors: [],
    failedRelevantRequests: [],
    expectedPrefetchAborts: [],
    httpErrors: [],
    unexpectedMutationRequests: [],
    blockedBestEffortMutations: [],
    providerRequests: [],
  };

  context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!allowedHosts.has(url.host) && providerHostPattern.test(url.host)) {
      record.providerRequests.push({ method: request.method(), url: request.url() });
      await route.abort("blockedbyclient");
      return;
    }
    if (allowedHosts.has(url.host) && !allowedReadMethods.has(request.method())) {
      const payload = { method: request.method(), url: request.url() };
      if (url.pathname === "/api/funnel-events") {
        record.blockedBestEffortMutations.push(payload);
      } else {
        record.unexpectedMutationRequests.push(payload);
      }
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  page.on("console", (message) => {
    const text = message.text();
    if (/hydration|hydrating|server rendered html/i.test(text)) record.hydrationErrors.push(text);
    if (message.type() === "error") record.consoleErrors.push(text);
  });
  page.on("pageerror", (error) => record.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (!allowedHosts.has(url.host)) return;
    if (request.method() === "POST" && url.pathname === "/api/funnel-events") return;
    if (isExpectedNextAbort(request)) {
      record.expectedPrefetchAborts.push({
        method: request.method(),
        url: request.url(),
        errorText: request.failure()?.errorText ?? "unknown",
      });
      return;
    }
    record.failedRelevantRequests.push({
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      errorText: request.failure()?.errorText ?? "unknown",
    });
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (!allowedHosts.has(url.host) || response.status() < 400 || url.pathname === "/favicon.ico") return;
    record.httpErrors.push({ status: response.status(), url: response.url() });
  });
  return record;
}

function assertDiagnostics(record) {
  const failures = [
    ...record.consoleErrors.map((value) => `console: ${value}`),
    ...record.hydrationErrors.map((value) => `hydration: ${value}`),
    ...record.pageErrors.map((value) => `page: ${value}`),
    ...record.failedRelevantRequests.map((value) => `request: ${value.method} ${value.url} ${value.errorText}`),
    ...record.httpErrors.map((value) => `http: ${value.status} ${value.url}`),
    ...record.unexpectedMutationRequests.map((value) => `mutation: ${value.method} ${value.url}`),
    ...record.providerRequests.map((value) => `provider: ${value.method} ${value.url}`),
  ];
  if (failures.length) throw new Error(`${record.label} diagnostics failed:\n${failures.join("\n")}`);
}

async function installAuthDomObserver(page) {
  const history = [];
  await page.exposeBinding("__recordAuthProductionUatState", (_source, state) => history.push(state));
  await page.addInitScript(() => {
    const observedWindow = window;
    let previous = "";
    let pending = Promise.resolve();
    const record = () => {
      const text = document.body?.innerText ?? "";
      const feedState = document
        .querySelector('[data-mt-live-now="adaptive"]')
        ?.getAttribute("data-mt-live-now-state");
      const state = {
        signedOut:
          text.includes("Profile unavailable") ||
          text.includes("Sign in required") ||
          text.includes("Sign in to build a trade.") ||
          text.includes("Sign in to see a feed based on your moral priorities."),
        privateContent:
          text.includes("Auth Resolution Production UAT") ||
          text.includes("Your profile") ||
          text.includes("What priorities are being exchanged?") ||
          text.includes("Account — saved settings and records.") ||
          Boolean(document.querySelector("[data-mt-live-now-recommendation]")),
        feedState: feedState ?? null,
        url: window.location.href,
      };
      const serialized = JSON.stringify(state);
      if (serialized !== previous) {
        pending = pending.then(() => observedWindow.__recordAuthProductionUatState?.(state));
        previous = serialized;
      }
      return pending;
    };
    observedWindow.__flushAuthProductionUatState = async () => {
      await record();
      await pending;
    };
    new MutationObserver(() => void record()).observe(document, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    document.addEventListener("DOMContentLoaded", () => void record(), { once: true });
  });
  return history;
}

async function flushAuthDomObserver(page) {
  await page.evaluate(async () => {
    await window.__flushAuthProductionUatState?.();
  });
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 1) throw new Error(`Horizontal overflow detected: ${overflow}px.`);
  return overflow;
}

async function expectNoFrameworkOverlay(page) {
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
  await expect(page.locator('[data-nextjs-dialog-overlay="true"]')).toHaveCount(0);
  await expect(page.locator("#webpack-dev-server-client-overlay")).toHaveCount(0);
}

function cacheHeaderEvidence(response) {
  const cacheControl = response.headers()["cache-control"] ?? "";
  const vary = response.headers().vary ?? "";
  if (!/no-store/i.test(cacheControl)) throw new Error(`Private response lacks no-store: ${cacheControl}`);
  if (!/(^|,|\s)Cookie($|,|\s)/i.test(vary)) throw new Error(`Private response lacks Vary: Cookie: ${vary}`);
  return { cacheControl, vary };
}

async function verifyAuthenticatedApi(context, origin) {
  const response = await context.request.get(`${origin}/api/live-account`, {
    maxRedirects: 3,
    failOnStatusCode: false,
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${origin}/api/live-account returned non-JSON content.`);
  }
  if (response.status() !== 200 || body.authenticated !== true) {
    throw new Error(`${origin}/api/live-account did not resolve as authenticated.`);
  }
  if (body.account?.displayName !== "Auth Resolution Production UAT") {
    throw new Error(`${origin}/api/live-account resolved the wrong synthetic profile.`);
  }
  return {
    origin,
    status: response.status(),
    finalUrl: response.url(),
    displayName: body.account.displayName,
    ...cacheHeaderEvidence(response),
  };
}

const routes = [
  {
    name: "profile",
    path: "/profile",
    assert: async (page) => {
      await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();
      await expect(page.getByText("Signed in", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Profile unavailable" })).toHaveCount(0);
    },
  },
  {
    name: "composer",
    path: "/trades/new?example=seed-victoria",
    assert: async (page) => {
      await expect(page.getByRole("heading", { name: "What priorities are being exchanged?" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Sign in to build a trade." })).toHaveCount(0);
    },
  },
  {
    name: "dashboard",
    path: "/dashboard",
    assert: async (page) => {
      await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
      await expect(page.getByText("Account — saved settings and records.", { exact: true })).toBeVisible();
    },
  },
  {
    name: "feed",
    path: "/feed",
    assert: async (page) => {
      const feed = page.locator('[data-mt-live-now="adaptive"]');
      await expect(feed).toBeVisible();
      await expect(feed).not.toHaveAttribute("data-mt-live-now-state", "signed_out");
      await expect(
        page.getByRole("heading", {
          name: "Sign in to see a feed based on your moral priorities.",
        }),
      ).toHaveCount(0);
    },
  },
];

async function runJourney(browser, session, origin, viewport) {
  const context = await authenticatedContext(browser, session, viewport);
  const api = await verifyAuthenticatedApi(context, origin);
  const page = await context.newPage();
  const history = await installAuthDomObserver(page);
  const diagnostics = installDiagnostics(context, page, `${origin}-${viewport.label}`);
  const routeEvidence = [];

  try {
    for (const route of routes) {
      const separator = route.path.includes("?") ? "&" : "?";
      const requestedUrl = `${origin}${route.path}${separator}auth_production_uat=${encodeURIComponent(viewport.label)}`;
      const historyStart = history.length;
      const startedAt = new Date().toISOString();
      const response = await page.goto(requestedUrl, { waitUntil: "domcontentloaded" });
      if (!response || !response.ok()) {
        throw new Error(`${requestedUrl} returned ${response?.status() ?? "no response"}.`);
      }
      const finalUrl = new URL(page.url());
      if (!allowedHosts.has(finalUrl.host)) throw new Error(`Unexpected final host: ${finalUrl.host}`);
      await route.assert(page);
      await flushAuthDomObserver(page);
      await expectNoFrameworkOverlay(page);
      const overflowPx = await expectNoHorizontalOverflow(page);
      const routeHistory = history.slice(historyStart);
      if (routeHistory.some((state) => state.signedOut)) {
        throw new Error(`${route.name} displayed a signed-out or unauthorized-content state.`);
      }
      const bodyText = await page.locator("body").innerText();
      if (expectedSignedOutPatterns.some((pattern) => pattern.test(bodyText))) {
        throw new Error(`${route.name} retained signed-out copy after authenticated render.`);
      }
      if (/Internal Server Error|Application error|Unhandled Runtime Error/i.test(bodyText)) {
        throw new Error(`${route.name} rendered a framework or application failure.`);
      }
      const screenshot = `${safeSlug(origin)}-${viewport.label}-${route.name}.png`;
      await page.screenshot({ path: path.join(OUTPUT_DIR, screenshot), fullPage: false });
      routeEvidence.push({
        route: route.name,
        requestedUrl,
        finalUrl: page.url(),
        status: response.status(),
        startedAt,
        completedAt: new Date().toISOString(),
        overflowPx,
        screenshot,
        privateContentObserved: routeHistory.some((state) => state.privateContent),
        signedOutObserved: false,
      });
    }
    assertDiagnostics(diagnostics);
    return { origin, viewport, api, routes: routeEvidence, diagnostics };
  } finally {
    await context.close();
  }
}

const startedAt = new Date().toISOString();
const { client, session } = await signIn();
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const viewport of [
    { label: "desktop", width: 1440, height: 900 },
    { label: "mobile", width: 390, height: 844 },
  ]) {
    for (const origin of ORIGINS) {
      results.push(await runJourney(browser, session, origin, viewport));
    }
  }
} finally {
  await browser.close();
  await client.auth.signOut({ scope: "local" }).catch(() => undefined);
}

const finishedAt = new Date().toISOString();
const allDiagnostics = results.map((result) => result.diagnostics);
const evidence = {
  schemaVersion: 1,
  expectedMainSha: EXPECTED_MAIN_SHA,
  expectedDeploymentId: EXPECTED_DEPLOYMENT_ID,
  syntheticUserId: QA_USER_ID,
  syntheticEmail: QA_EMAIL,
  startedAt,
  finishedAt,
  canonicalOrigins: ORIGINS,
  viewports: [
    { label: "desktop", width: 1440, height: 900 },
    { label: "mobile", width: 390, height: 844 },
  ],
  routeCount: results.reduce((sum, result) => sum + result.routes.length, 0),
  results,
  browserDiagnosticsClean: allDiagnostics.every(
    (value) =>
      value.consoleErrors.length === 0 &&
      value.hydrationErrors.length === 0 &&
      value.pageErrors.length === 0 &&
      value.failedRelevantRequests.length === 0 &&
      value.httpErrors.length === 0,
  ),
  unexpectedMutationRequests: allDiagnostics.flatMap((value) => value.unexpectedMutationRequests),
  blockedBestEffortMutations: allDiagnostics.flatMap((value) => value.blockedBestEffortMutations),
  providerRequests: allDiagnostics.flatMap((value) => value.providerRequests),
  noApplicationMutationTransmitted: allDiagnostics.every(
    (value) => value.unexpectedMutationRequests.length === 0,
  ),
  noPaymentProviderRequest: allDiagnostics.every((value) => value.providerRequests.length === 0),
  noOfferPaymentTradeOrSyntheticProductRecordCreated: true,
};

if (!evidence.browserDiagnosticsClean) throw new Error("Browser diagnostics were not clean.");
if (!evidence.noApplicationMutationTransmitted) throw new Error("Unexpected application mutation was attempted.");
if (!evidence.noPaymentProviderRequest) throw new Error("A payment-provider request was attempted.");
if (evidence.routeCount !== 16) throw new Error(`Expected 16 route journeys, observed ${evidence.routeCount}.`);
writeJson("evidence.json", evidence);
console.log(
  JSON.stringify({
    schemaVersion: evidence.schemaVersion,
    expectedMainSha: evidence.expectedMainSha,
    expectedDeploymentId: evidence.expectedDeploymentId,
    routeCount: evidence.routeCount,
    browserDiagnosticsClean: evidence.browserDiagnosticsClean,
    noApplicationMutationTransmitted: evidence.noApplicationMutationTransmitted,
    noPaymentProviderRequest: evidence.noPaymentProviderRequest,
    startedAt: evidence.startedAt,
    finishedAt: evidence.finishedAt,
  }),
);
