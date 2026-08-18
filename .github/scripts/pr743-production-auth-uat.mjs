import fs from "node:fs";
import path from "node:path";

import { chromium, expect } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const FIXED_EXPECTED_SHA = "a3d14af469260a0a17b8d0b38c9e65be7b2c1921";
const FIXED_EXPECTED_SUPABASE_REF = "jnpoxvalyjtdghnperyu";
const FIXED_CANONICAL_ORIGIN = "https://www.moraltrade.org";

const ORIGIN = required("PR743_CANONICAL_ORIGIN", process.env.PR743_CANONICAL_ORIGIN);
const EXPECTED_SHA = required("PR743_EXPECTED_SHA", process.env.PR743_EXPECTED_SHA);
const EXPECTED_DEPLOYMENT_ID = required(
  "PR743_EXPECTED_DEPLOYMENT_ID",
  process.env.PR743_EXPECTED_DEPLOYMENT_ID,
);
const EXPECTED_DEPLOYMENT_URL = required(
  "PR743_EXPECTED_DEPLOYMENT_URL",
  process.env.PR743_EXPECTED_DEPLOYMENT_URL,
);
const EXPECTED_SUPABASE_REF = required(
  "PR743_EXPECTED_SUPABASE_REF",
  process.env.PR743_EXPECTED_SUPABASE_REF,
);
const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);
const SUPABASE_KEY = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const QA_EMAIL = required("PR743_QA_EMAIL", process.env.PR743_QA_EMAIL);
const QA_PASSWORD = required("PR743_QA_PASSWORD", process.env.PR743_QA_PASSWORD);
const QA_USER_ID = required("PR743_QA_USER_ID", process.env.PR743_QA_USER_ID);
const QA_RUN_ID = required("PR743_QA_RUN_ID", process.env.PR743_QA_RUN_ID);
const OUTPUT_DIR = process.env.PR743_OUTPUT_DIR ?? "pr743-production-auth-uat";
const DISPLAY_NAME_PREFIX = "PR743 Auth production UAT";

function required(name, value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required environment value: ${name}`);
  }
  return value;
}

if (ORIGIN !== FIXED_CANONICAL_ORIGIN) {
  throw new Error(`Refusing unexpected canonical origin ${ORIGIN}.`);
}
if (EXPECTED_SHA !== FIXED_EXPECTED_SHA) {
  throw new Error(`Refusing unexpected production SHA ${EXPECTED_SHA}.`);
}
if (!/^dpl_[A-Za-z0-9]+$/.test(EXPECTED_DEPLOYMENT_ID)) {
  throw new Error(`Refusing malformed deployment id ${EXPECTED_DEPLOYMENT_ID}.`);
}
if (!/^https:\/\/[A-Za-z0-9.-]+\.vercel\.app$/.test(EXPECTED_DEPLOYMENT_URL)) {
  throw new Error(`Refusing malformed deployment URL ${EXPECTED_DEPLOYMENT_URL}.`);
}
if (EXPECTED_SUPABASE_REF !== FIXED_EXPECTED_SUPABASE_REF) {
  throw new Error(`Refusing unexpected Supabase ref ${EXPECTED_SUPABASE_REF}.`);
}
if (new URL(SUPABASE_URL).hostname.split(".")[0] !== EXPECTED_SUPABASE_REF) {
  throw new Error("Refusing a Supabase project other than exact Moral Trade production.");
}
if (
  !/^pr743-auth-uat-[0-9]+-[0-9]+-[a-f0-9]{12}@qa\.moraltrade\.invalid$/.test(
    QA_EMAIL,
  )
) {
  throw new Error(`Refusing non-run-owned QA identity ${QA_EMAIL}.`);
}
if (
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    QA_USER_ID,
  )
) {
  throw new Error("Refusing malformed synthetic user id.");
}

fs.mkdirSync(path.join(OUTPUT_DIR, "screenshots"), {
  recursive: true,
  mode: 0o700,
});

function writeJson(name, value) {
  fs.writeFileSync(path.join(OUTPUT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
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
    throw new Error(
      `Production synthetic sign-in failed: ${error?.message ?? "session identity mismatch"}`,
    );
  }
  return data.session;
}

async function sessionCookies(session) {
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
  if (error) throw new Error(`Could not serialize the QA session: ${error.message}`);
  return captured.map(({ name, value, options }) => ({
    name,
    value,
    url: ORIGIN,
    httpOnly: options?.httpOnly ?? true,
    secure: true,
    sameSite: "Lax",
  }));
}

async function createAuthenticatedContext(browser, session, viewport) {
  const context = await browser.newContext({
    baseURL: ORIGIN,
    viewport,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  context.setDefaultTimeout(25_000);
  context.setDefaultNavigationTimeout(60_000);
  await context.addCookies([
    ...(await sessionCookies(session)),
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: ORIGIN,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "mt_analytics_opt_out",
      value: "1",
      url: ORIGIN,
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  return context;
}

async function createSignedOutContext(browser, viewport) {
  const context = await browser.newContext({
    baseURL: ORIGIN,
    viewport,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  context.setDefaultTimeout(25_000);
  context.setDefaultNavigationTimeout(60_000);
  await context.addCookies([
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: ORIGIN,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "mt_analytics_opt_out",
      value: "1",
      url: ORIGIN,
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  return context;
}

function installAuthDomMonitor(page) {
  return page.addInitScript(() => {
    const observedWindow = window;
    observedWindow.__pr743AuthHistory = [];
    let previous = "";
    const record = () => {
      const text = document.body?.innerText ?? "";
      const state = {
        privateContent:
          text.includes("Your profile") ||
          text.includes("PR743 Auth production UAT") ||
          text.includes("What do you want to improve?") ||
          text.includes("Account — saved settings and records.") ||
          Boolean(document.querySelector('[data-mt-live-now="adaptive"]')),
        signedOut:
          text.includes("Profile unavailable") ||
          text.includes("Sign in required") ||
          text.includes("Sign in to build a trade.") ||
          text.includes("Sign in to see a feed based on your moral priorities."),
        url: window.location.href,
      };
      const serialized = JSON.stringify(state);
      if (serialized !== previous) {
        observedWindow.__pr743AuthHistory.push(state);
        previous = serialized;
      }
    };
    new MutationObserver(record).observe(document, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    document.addEventListener("DOMContentLoaded", record, { once: true });
    record();
  });
}

function watchPage(page, label) {
  const origin = new URL(ORIGIN).origin;
  const record = {
    label,
    badResponses: [],
    classifiedRsc404: [],
    classifiedBrowserAborts: [],
    classifiedConsoleResourceErrors: [],
    consoleErrors: [],
    mutationRequests: [],
    pageErrors: [],
    requestFailures: [],
  };

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/Failed to load resource:.*404/i.test(text)) {
      record.classifiedConsoleResourceErrors.push(text);
      return;
    }
    record.consoleErrors.push(text);
  });
  page.on("pageerror", (error) => record.pageErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) return;
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      record.mutationRequests.push({
        method: request.method(),
        path: url.pathname,
        resourceType: request.resourceType(),
      });
    }
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) return;
    const errorText = request.failure()?.errorText ?? "unknown";
    const headers = request.headers();
    const expectedAbort =
      errorText.includes("ERR_ABORTED") &&
      (url.searchParams.has("_rsc") ||
        headers["next-router-prefetch"] === "1" ||
        headers.rsc === "1" ||
        ["/moral-trade-input-assist.js", "/moral-trade-input-standards.json"].includes(
          url.pathname,
        ));
    if (expectedAbort) {
      record.classifiedBrowserAborts.push({
        method: request.method(),
        path: url.pathname,
        errorText,
      });
      return;
    }
    record.requestFailures.push({
      method: request.method(),
      path: url.pathname,
      errorText,
    });
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin !== origin || response.status() < 400) return;
    const headers = response.request().headers();
    const expectedRsc404 =
      response.status() === 404 &&
      (url.searchParams.has("_rsc") || headers.rsc === "1");
    if (expectedRsc404) {
      record.classifiedRsc404.push({ status: response.status(), path: url.pathname });
      return;
    }
    if (url.pathname === "/favicon.ico" && response.status() === 404) return;
    record.badResponses.push({ status: response.status(), path: url.pathname });
  });
  return record;
}

function assertCleanDiagnostics(record) {
  const failures = [
    ...record.consoleErrors.map((value) => `console: ${value}`),
    ...record.pageErrors.map((value) => `page: ${value}`),
    ...record.requestFailures.map(
      (value) => `request: ${value.method} ${value.path} ${value.errorText}`,
    ),
    ...record.badResponses.map((value) => `http: ${value.status} ${value.path}`),
    ...record.mutationRequests.map((value) => `mutation: ${value.method} ${value.path}`),
  ];
  if (failures.length > 0) {
    throw new Error(`${record.label} diagnostics failed:\n${failures.join("\n")}`);
  }
}

async function assertNoHorizontalOverflow(page, label) {
  const state = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    innerWidth: window.innerWidth,
    scrollWidth: Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth ?? 0,
    ),
  }));
  if (state.clientWidth !== state.innerWidth || state.scrollWidth > state.innerWidth + 1) {
    throw new Error(`${label} horizontal overflow: ${JSON.stringify(state)}`);
  }
  return state;
}

async function assertNoSignedOutFlash(page, label) {
  const history = await page.evaluate(() => window.__pr743AuthHistory ?? []);
  if (history.some((entry) => entry.signedOut)) {
    throw new Error(`${label} exposed a signed-out or unauthorized-content flash.`);
  }
  return history;
}

async function fetchPrivateJson(page, pathname) {
  return page.evaluate(async (pathValue) => {
    const started = performance.now();
    const response = await fetch(pathValue, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return {
      body,
      cacheControl: response.headers.get("cache-control"),
      durationMs: performance.now() - started,
      status: response.status,
      vary: response.headers.get("vary"),
    };
  }, pathname);
}

function assertPrivateHeaders(result, label) {
  if (result.status !== 200) {
    throw new Error(`${label} returned HTTP ${result.status}.`);
  }
  if (!/no-store/i.test(result.cacheControl ?? "")) {
    throw new Error(`${label} omitted no-store: ${result.cacheControl}`);
  }
  if (!/(^|,|\s)Cookie(,|$)/i.test(result.vary ?? "")) {
    throw new Error(`${label} omitted Vary: Cookie: ${result.vary}`);
  }
  if (result.durationMs > 15_000) {
    throw new Error(`${label} took ${result.durationMs.toFixed(0)}ms.`);
  }
}

async function verifyAuthenticatedIdentity(page, label) {
  const account = await fetchPrivateJson(page, "/api/live-account");
  assertPrivateHeaders(account, `${label} /api/live-account`);
  if (account.body?.authenticated !== true) {
    throw new Error(`${label} did not resolve an authenticated production account.`);
  }
  if (!String(account.body?.account?.displayName ?? "").startsWith(DISPLAY_NAME_PREFIX)) {
    throw new Error(`${label} authenticated the wrong production identity.`);
  }
  return {
    authenticated: true,
    cacheControl: account.cacheControl,
    durationMs: account.durationMs,
    vary: account.vary,
  };
}

async function gotoExact(page, pathname, label) {
  const started = Date.now();
  const response = await page.goto(pathname, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const durationMs = Date.now() - started;
  if (!response || response.status() !== 200) {
    throw new Error(`${label} returned ${response?.status() ?? "no response"}.`);
  }
  const current = new URL(page.url());
  if (current.origin !== new URL(ORIGIN).origin || current.pathname !== pathname) {
    throw new Error(`${label} left ${pathname}: ${page.url()}`);
  }
  return durationMs;
}

async function verifyRoute(context, viewportLabel, route) {
  const page = await context.newPage();
  await installAuthDomMonitor(page);
  const diagnostics = watchPage(page, `${viewportLabel}:${route}`);
  const navigationMs = await gotoExact(page, route, `${viewportLabel} ${route}`);

  if (route === "/profile") {
    await expect(page.getByRole("heading", { level: 1, name: "Your profile" })).toBeVisible();
    await expect(page.getByText("Signed in", { exact: true })).toBeVisible();
  } else if (route === "/trades/new") {
    const frame = page.frameLocator('iframe[title="Moral Trade Create"]');
    await expect(
      frame.getByRole("heading", { level: 1, name: "What do you want to improve?" }),
    ).toBeVisible();
    const frameOverflow = await frame.locator("html").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    if (frameOverflow.scrollWidth > frameOverflow.clientWidth + 1) {
      throw new Error(`${viewportLabel} Create iframe overflowed horizontally.`);
    }
  } else if (route === "/dashboard") {
    await expect(page.locator("main#main-content")).toBeVisible();
    await expect(page.getByText("Account", { exact: true }).first()).toBeVisible();
  } else if (route === "/feed") {
    await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible();
    await page.waitForFunction(() => {
      const state = document.documentElement.getAttribute("data-mt-live-now-ready");
      return Boolean(state && state !== "loading");
    });
    const liveNow = await fetchPrivateJson(page, "/api/live-now");
    assertPrivateHeaders(liveNow, `${viewportLabel} /api/live-now`);
    if (liveNow.body?.authenticated !== true) {
      throw new Error(`${viewportLabel} Feed did not resolve as authenticated.`);
    }
    if (liveNow.body?.status === "profile_incomplete") {
      if ((liveNow.body?.recommendations ?? []).length !== 0) {
        throw new Error("Profile-incomplete Feed substituted generated or demo recommendations.");
      }
    }
  }

  const identity = await verifyAuthenticatedIdentity(page, `${viewportLabel} ${route}`);
  const overflow = await assertNoHorizontalOverflow(page, `${viewportLabel} ${route}`);
  const history = await assertNoSignedOutFlash(page, `${viewportLabel} ${route}`);
  await page.screenshot({
    path: path.join(
      OUTPUT_DIR,
      "screenshots",
      `${viewportLabel}-${route.replaceAll("/", "-").replace(/^-|-$/g, "") || "home"}.png`,
    ),
    fullPage: true,
  });
  assertCleanDiagnostics(diagnostics);
  await page.close();
  return {
    diagnostics,
    history,
    identity,
    navigationMs,
    overflow,
    route,
  };
}

async function runViewport(browser, session, viewportLabel, viewport) {
  const context = await createAuthenticatedContext(browser, session, viewport);
  const results = [];
  for (const route of ["/profile", "/trades/new", "/dashboard", "/feed"]) {
    results.push(await verifyRoute(context, viewportLabel, route));
  }
  await context.close();
  return { results, viewport };
}

async function verifySignedOut(browser) {
  const context = await createSignedOutContext(browser, { width: 390, height: 844 });
  const page = await context.newPage();
  const diagnostics = watchPage(page, "signed-out-profile");
  const response = await page.goto("/profile", { waitUntil: "domcontentloaded" });
  if (!response || response.status() !== 200) {
    throw new Error(`Signed-out profile returned ${response?.status() ?? "no response"}.`);
  }
  await expect(
    page.getByRole("heading", { level: 1, name: "Profile unavailable" }),
  ).toBeVisible();
  const account = await fetchPrivateJson(page, "/api/live-account");
  assertPrivateHeaders(account, "signed-out /api/live-account");
  if (account.body?.authenticated !== false) {
    throw new Error("Signed-out account endpoint did not fail closed.");
  }
  const text = await page.locator("body").innerText();
  if (text.includes(DISPLAY_NAME_PREFIX)) {
    throw new Error("Signed-out surface leaked the synthetic private display name.");
  }
  const overflow = await assertNoHorizontalOverflow(page, "signed-out profile");
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "screenshots", "signed-out-profile-mobile.png"),
    fullPage: true,
  });
  assertCleanDiagnostics(diagnostics);
  await context.close();
  return {
    cacheControl: account.cacheControl,
    diagnostics,
    overflow,
    vary: account.vary,
  };
}

const browser = await chromium.launch();
try {
  const session = await signIn();
  const startedAt = new Date().toISOString();
  const desktop = await runViewport(browser, session, "desktop", {
    width: 1440,
    height: 1000,
  });
  const mobile = await runViewport(browser, session, "mobile", {
    width: 390,
    height: 844,
  });
  const signedOut = await verifySignedOut(browser);
  const completedAt = new Date().toISOString();
  writeJson("result.json", {
    canonicalOrigin: ORIGIN,
    completedAt,
    desktop,
    expectedDeploymentId: EXPECTED_DEPLOYMENT_ID,
    expectedDeploymentUrl: EXPECTED_DEPLOYMENT_URL,
    expectedSha: EXPECTED_SHA,
    mobile,
    qaRunId: QA_RUN_ID,
    signedOut,
    startedAt,
    status: "passed",
  });
  console.log(
    JSON.stringify({
      desktopRoutes: desktop.results.length,
      mobileRoutes: mobile.results.length,
      status: "passed",
    }),
  );
} catch (error) {
  writeJson("failure.json", {
    error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
    expectedDeploymentId: EXPECTED_DEPLOYMENT_ID,
    expectedSha: EXPECTED_SHA,
    failedAt: new Date().toISOString(),
    qaRunId: QA_RUN_ID,
    status: "failed",
  });
  throw error;
} finally {
  await browser.close();
}
