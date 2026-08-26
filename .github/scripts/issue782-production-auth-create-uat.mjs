import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { chromium, expect } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const origins = required("ISSUE782_ORIGINS", process.env.ISSUE782_ORIGINS)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const outputDir = required("ISSUE782_OUTPUT_DIR", process.env.ISSUE782_OUTPUT_DIR);
const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseKey = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
const password = required("ISSUE782_PASSWORD", process.env.ISSUE782_PASSWORD);
const emails = {
  creator: required("ISSUE782_CREATOR_EMAIL", process.env.ISSUE782_CREATOR_EMAIL),
  reviewer: required("ISSUE782_REVIEWER_EMAIL", process.env.ISSUE782_REVIEWER_EMAIL),
  pledger: required("ISSUE782_PLEDGER_EMAIL", process.env.ISSUE782_PLEDGER_EMAIL),
  outsider: required("ISSUE782_OUTSIDER_EMAIL", process.env.ISSUE782_OUTSIDER_EMAIL),
};
const openSlug = required("ISSUE782_OPEN_SLUG", process.env.ISSUE782_OPEN_SLUG);
const openProposalId = required("ISSUE782_OPEN_PROPOSAL_ID", process.env.ISSUE782_OPEN_PROPOSAL_ID);
const namespace = required("ISSUE782_NAMESPACE", process.env.ISSUE782_NAMESPACE);

function required(name, value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required environment value: ${name}`);
  }
  return value;
}

if (origins.length !== 2 || !origins.every((value) => /^https:\/\/(?:www\.)?moraltrade\.org$/.test(value))) {
  throw new Error(`Refusing unexpected canonical origins: ${origins.join(",")}`);
}
for (const value of Object.values(emails)) {
  if (!/^[a-z0-9][a-z0-9._+-]{0,63}@qa\.moraltrade\.invalid$/.test(value)) {
    throw new Error(`Refusing unsafe synthetic identity: ${value}`);
  }
}
if (!/^[0-9a-f-]{36}$/i.test(openProposalId) || !/^[a-z0-9-]{8,80}$/.test(openSlug)) {
  throw new Error("Refusing malformed run-owned DAC route identifiers.");
}

fs.mkdirSync(path.join(outputDir, "screenshots"), { recursive: true, mode: 0o700 });

function writeJson(name, value) {
  fs.writeFileSync(path.join(outputDir, name), `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function decodeBase32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Unexpected TOTP secret encoding.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpCode(secret, offset = 0) {
  const counter = BigInt(Math.floor(Date.now() / 30_000) + offset);
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBytes).digest();
  const position = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[position] & 0x7f) << 24) |
    ((digest[position + 1] & 0xff) << 16) |
    ((digest[position + 2] & 0xff) << 8) |
    (digest[position + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

function authClient() {
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

async function signIn(email) {
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Synthetic sign-in failed: ${error?.message ?? "missing session"}`);
  }
  return { client, session: data.session };
}

async function elevateWithTotp(client) {
  const { data: enrollment, error: enrollmentError } = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `issue782-${Date.now()}`,
  });
  if (enrollmentError || !enrollment?.totp?.secret) {
    throw new Error(`TOTP enrollment failed: ${enrollmentError?.message ?? "missing secret"}`);
  }
  let lastError = "";
  for (const offset of [0, -1, 1]) {
    const { data, error } = await client.auth.mfa.challengeAndVerify({
      factorId: enrollment.id,
      code: totpCode(enrollment.totp.secret, offset),
    });
    if (data && !error) {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (!sessionError && sessionData.session) {
        return { factorId: enrollment.id, session: sessionData.session };
      }
    }
    lastError = error?.message ?? "missing AAL2 session";
  }
  throw new Error(`TOTP verification failed: ${lastError}`);
}

async function serializeSession(session, origin) {
  const captured = [];
  const client = createServerClient(supabaseUrl, supabaseKey, {
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
  if (error) throw new Error(`Could not serialize Auth session: ${error.message}`);
  return captured.map(({ name, value, options }) => ({
    name,
    value,
    url: origin,
    httpOnly: options?.httpOnly ?? true,
    secure: true,
    sameSite: "Lax",
  }));
}

async function contextFor(browser, session, viewport) {
  const context = await browser.newContext({ viewport, colorScheme: "light", reducedMotion: "reduce" });
  context.setDefaultTimeout(25_000);
  context.setDefaultNavigationTimeout(60_000);
  const cookies = [];
  for (const origin of origins) {
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
    if (session) cookies.push(...(await serializeSession(session, origin)));
  }
  await context.addCookies(cookies);
  return context;
}

function installFlashMonitor(page) {
  return page.addInitScript(() => {
    window.__issue782History = [];
    let previous = "";
    const record = () => {
      const text = document.body?.innerText ?? "";
      const state = {
        privateContent:
          text.includes("Your profile") ||
          text.includes("DAC lifecycle review.") ||
          text.includes("What do you want to improve?") ||
          Boolean(document.querySelector('[data-mt-live-now="adaptive"]')),
        signedOut:
          text.includes("Profile unavailable") ||
          text.includes("Sign in required") ||
          text.includes("Sign in to build a trade.") ||
          text.includes("Sign in to see a feed based on your moral priorities."),
        href: window.location.href,
      };
      const serialized = JSON.stringify(state);
      if (serialized !== previous) {
        window.__issue782History.push(state);
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

function diagnosticsFor(page, label) {
  const allowedOrigins = new Set(origins.map((value) => new URL(value).origin));
  const record = {
    label,
    badResponses: [],
    classifiedRsc404: [],
    classifiedAborts: [],
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    mutationRequests: [],
  };
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/Failed to load resource:.*404/i.test(text)) return;
    record.consoleErrors.push(text);
  });
  page.on("pageerror", (error) => record.pageErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!allowedOrigins.has(url.origin)) return;
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      const allowedTelemetry = ["/api/feed-create/events"].includes(url.pathname);
      if (!allowedTelemetry) {
        record.mutationRequests.push({ method: request.method(), path: url.pathname });
      }
    }
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (!allowedOrigins.has(url.origin)) return;
    const errorText = request.failure()?.errorText ?? "unknown";
    const headers = request.headers();
    if (
      errorText.includes("ERR_ABORTED") &&
      (url.searchParams.has("_rsc") || headers.rsc === "1" || headers["next-router-prefetch"] === "1")
    ) {
      record.classifiedAborts.push({ method: request.method(), path: url.pathname, errorText });
      return;
    }
    record.requestFailures.push({ method: request.method(), path: url.pathname, errorText });
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (!allowedOrigins.has(url.origin) || response.status() < 400) return;
    const headers = response.request().headers();
    if (response.status() === 404 && (url.searchParams.has("_rsc") || headers.rsc === "1")) {
      record.classifiedRsc404.push({ status: 404, path: url.pathname });
      return;
    }
    if (url.pathname === "/favicon.ico" && response.status() === 404) return;
    record.badResponses.push({ status: response.status(), path: url.pathname });
  });
  return record;
}

function assertClean(record) {
  const failures = [
    ...record.consoleErrors.map((value) => `console: ${value}`),
    ...record.pageErrors.map((value) => `page: ${value}`),
    ...record.requestFailures.map((value) => `request: ${value.method} ${value.path} ${value.errorText}`),
    ...record.badResponses.map((value) => `http: ${value.status} ${value.path}`),
    ...record.mutationRequests.map((value) => `mutation: ${value.method} ${value.path}`),
  ];
  if (failures.length > 0) throw new Error(`${record.label} diagnostics failed:\n${failures.join("\n")}`);
}

async function assertNoOverflow(page, label) {
  const state = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0),
    overlay: Boolean(document.querySelector("nextjs-portal, [data-nextjs-dialog-overlay]")),
  }));
  if (state.clientWidth !== state.innerWidth || state.scrollWidth > state.innerWidth + 1 || state.overlay) {
    throw new Error(`${label} viewport or overlay failure: ${JSON.stringify(state)}`);
  }
  return state;
}

async function privateJson(page, pathname) {
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
      status: response.status,
      body,
      cacheControl: response.headers.get("cache-control"),
      vary: response.headers.get("vary"),
      durationMs: performance.now() - started,
    };
  }, pathname);
}

function assertPrivateHeaders(result, label, expectedAuthenticated) {
  if (result.status !== 200) throw new Error(`${label} returned ${result.status}.`);
  if (!/no-store/i.test(result.cacheControl ?? "")) throw new Error(`${label} omitted no-store.`);
  if (!/(^|,|\s)Cookie(,|$)/i.test(result.vary ?? "")) throw new Error(`${label} omitted Vary: Cookie.`);
  if (result.body?.authenticated !== expectedAuthenticated) {
    throw new Error(`${label} authentication mismatch.`);
  }
  if (result.durationMs > 15_000) throw new Error(`${label} exceeded the bounded auth latency.`);
}

async function gotoPath(page, origin, pathname) {
  const response = await page.goto(`${origin}${pathname}`, { waitUntil: "domcontentloaded" });
  if (!response || response.status() !== 200) {
    throw new Error(`${origin}${pathname} returned ${response?.status() ?? "no response"}.`);
  }
  if (new URL(page.url()).pathname !== pathname) {
    throw new Error(`${pathname} redirected to an unexpected path: ${page.url()}`);
  }
}

async function screenshot(page, name) {
  await page.screenshot({
    path: path.join(outputDir, "screenshots", `${name}.png`),
    fullPage: true,
    animations: "disabled",
  });
}

async function verifyAuthRoute(browser, session, origin, viewportName, viewport, pathname) {
  const context = await contextFor(browser, session, viewport);
  const page = await context.newPage();
  await installFlashMonitor(page);
  const diagnostics = diagnosticsFor(page, `${origin}:${viewportName}:${pathname}`);
  await gotoPath(page, origin, pathname);
  if (pathname === "/profile") {
    await expect(page.getByRole("heading", { level: 1, name: "Your profile" })).toBeVisible();
    await expect(page.getByText("Signed in", { exact: true })).toBeVisible();
  } else if (pathname === "/trades/new") {
    await expect(
      page.frameLocator('iframe[title="Moral Trade Create"]').getByRole("heading", {
        level: 1,
        name: "What do you want to improve?",
      }),
    ).toBeVisible();
  } else if (pathname === "/dashboard") {
    await expect(page.locator("main#main-content")).toBeVisible();
    await expect(page.getByText("Account", { exact: true }).first()).toBeVisible();
  } else if (pathname === "/feed") {
    await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible();
  }
  const account = await privateJson(page, "/api/live-account");
  assertPrivateHeaders(account, `${origin} ${pathname} /api/live-account`, true);
  const history = await page.evaluate(() => window.__issue782History ?? []);
  if (history.some((entry) => entry.signedOut)) {
    throw new Error(`${origin} ${pathname} exposed a false signed-out flash.`);
  }
  const overflow = await assertNoOverflow(page, `${origin} ${pathname}`);
  await screenshot(page, `${new URL(origin).hostname}-${viewportName}-${pathname.replaceAll("/", "-") || "home"}`);
  assertClean(diagnostics);
  await context.close();
  return { pathname, viewportName, overflow, diagnostics, authDurationMs: account.durationMs };
}

async function openCreate(page, origin) {
  await gotoPath(page, origin, "/trades/new");
  const create = page.frameLocator('iframe[title="Moral Trade Create"]');
  await expect(create.getByRole("heading", { level: 1, name: "What do you want to improve?" })).toBeVisible();
  return create;
}

async function transitionClear(create, expectedCause) {
  await expect(create.locator("#screenRequest")).toBeVisible();
  await expect(create.locator("#requestCause")).toHaveText(expectedCause);
  await expect
    .poll(() =>
      create.locator("body").evaluate(() => {
        const rect = (selector) => {
          const element = document.querySelector(selector);
          if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
          return element.getBoundingClientRect();
        };
        const header = rect(".topbar");
        const heading = rect("#requestHeading");
        const chosen = rect(".chosen-strip");
        return window.scrollY === 0 && heading.top >= header.bottom + 16 && chosen.top >= header.bottom + 16;
      }),
    )
    .toBe(true);
}

async function verifyCreate(browser, session, origin, viewportName, viewport, custom) {
  const context = await contextFor(browser, session, viewport);
  const page = await context.newPage();
  await installFlashMonitor(page);
  const diagnostics = diagnosticsFor(page, `${origin}:${viewportName}:create`);
  const create = await openCreate(page, origin);
  if (custom) {
    const input = create.locator("#otherCauseInput");
    const button = create.locator(".other-cause-submit");
    await input.scrollIntoViewIfNeeded();
    await input.fill("Moral uncertainty");
    await expect(button).toBeEnabled();
    await button.click();
    await transitionClear(create, "Moral uncertainty");
  } else {
    const cause = create.locator('.cause-choice[data-cause="Existential risk"]');
    await cause.scrollIntoViewIfNeeded();
    await cause.click();
    await transitionClear(create, "Existential risk");
    await expect(cause).toHaveAttribute("aria-pressed", "true");
    await create.locator('[data-request-kind="skill"]').click();
    await expect(create.locator("#requestActionInput")).toBeFocused();
    await expect(create.locator("#actionSuggestions")).toBeVisible();
  }
  const frameState = await create.locator("html").evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    progress: Array.from(document.querySelectorAll("#progress span")).map((item) => ({
      label: item instanceof HTMLElement ? item.dataset.stepLabel : null,
      current: item.getAttribute("aria-current"),
    })),
  }));
  if (frameState.scrollWidth > frameState.clientWidth + 1) throw new Error("Create iframe overflowed.");
  if (frameState.progress.map((item) => item.label).join(",") !== "Cause,Request,Offer,Review") {
    throw new Error("Create progress semantics drifted.");
  }
  if (frameState.progress[1]?.current !== "step") throw new Error("Create Request step was not current.");
  const history = await page.evaluate(() => window.__issue782History ?? []);
  if (history.some((entry) => entry.signedOut)) throw new Error("Create exposed a false signed-out flash.");
  const overflow = await assertNoOverflow(page, `${origin} Create`);
  await screenshot(page, `${new URL(origin).hostname}-${viewportName}-create-${custom ? "custom" : "listed"}`);
  assertClean(diagnostics);
  await context.close();
  return { viewportName, custom, frameState, overflow, diagnostics };
}

async function verifyReviewerAndDac(browser, reviewerSession, creatorSession, outsiderSession, origin) {
  const results = [];
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "tablet", width: 1024, height: 768 },
    { name: "mobile", width: 390, height: 844 },
    { name: "compact", width: 320, height: 568 },
  ]) {
    const context = await contextFor(browser, reviewerSession, {
      width: viewport.width,
      height: viewport.height,
    });
    const page = await context.newPage();
    const diagnostics = diagnosticsFor(page, `${origin}:${viewport.name}:reviewer`);
    await gotoPath(page, origin, "/mpgf/admin/dac-lifecycle");
    await expect(page.getByRole("heading", { name: "DAC lifecycle review." })).toBeVisible();
    await expect(page.getByText("active", { exact: true }).first()).toBeVisible();
    const reviewerOverflow = await assertNoOverflow(page, `${origin} reviewer ${viewport.name}`);
    await gotoPath(page, origin, `/mpgf/campaigns/${openSlug}`);
    await expect(page.getByRole("heading", { name: "QA DAC open for conditional pledges" })).toBeVisible();
    const publicOverflow = await assertNoOverflow(page, `${origin} campaign ${viewport.name}`);
    await screenshot(page, `${new URL(origin).hostname}-${viewport.name}-dac-public`);
    assertClean(diagnostics);
    await context.close();
    results.push({ viewport: viewport.name, reviewerOverflow, publicOverflow, diagnostics });
  }

  let context = await contextFor(browser, creatorSession, { width: 1440, height: 1000 });
  let page = await context.newPage();
  await gotoPath(page, origin, `/mpgf/pools/proposals/${openProposalId}`);
  await expect(page.getByText("Creator lifecycle receipt", { exact: true }).first()).toBeVisible();
  await context.close();

  context = await contextFor(browser, outsiderSession, { width: 1440, height: 1000 });
  page = await context.newPage();
  const response = await page.goto(`${origin}/mpgf/pools/proposals/${openProposalId}`, {
    waitUntil: "domcontentloaded",
  });
  if (![200, 404].includes(response?.status() ?? 0)) throw new Error("Outsider denial returned an unexpected status.");
  await expect(page.getByText("Creator lifecycle receipt", { exact: true })).toHaveCount(0);
  await context.close();
  return results;
}

async function verifyFailClosed(browser, validSession, origin) {
  const context = await contextFor(browser, null, { width: 390, height: 844 });
  const page = await context.newPage();
  const diagnostics = diagnosticsFor(page, `${origin}:signed-out`);
  await gotoPath(page, origin, "/profile");
  await expect(page.getByRole("heading", { level: 1, name: "Profile unavailable" })).toBeVisible();
  const signedOut = await privateJson(page, "/api/live-account");
  assertPrivateHeaders(signedOut, `${origin} signed-out /api/live-account`, false);
  assertClean(diagnostics);
  await context.close();

  const invalidContext = await contextFor(browser, null, { width: 390, height: 844 });
  const validCookies = [];
  for (const canonical of origins) validCookies.push(...(await serializeSession(validSession, canonical)));
  if (validCookies.length === 0) throw new Error("Could not construct a synthetic invalid session cookie.");
  validCookies[0] = {
    ...validCookies[0],
    value: `${validCookies[0].value.slice(0, -2)}xx`,
  };
  await invalidContext.addCookies(validCookies);
  const invalidPage = await invalidContext.newPage();
  await gotoPath(invalidPage, origin, "/profile");
  await expect(invalidPage.getByRole("heading", { level: 1, name: "Profile unavailable" })).toBeVisible();
  const invalid = await privateJson(invalidPage, "/api/live-account");
  assertPrivateHeaders(invalid, `${origin} invalid /api/live-account`, false);
  await invalidContext.close();
  return { signedOutDurationMs: signedOut.durationMs, invalidDurationMs: invalid.durationMs };
}

const browser = await chromium.launch();
const startedAt = new Date().toISOString();
try {
  const creator = await signIn(emails.creator);
  const reviewer = await signIn(emails.reviewer);
  const outsider = await signIn(emails.outsider);
  const elevation = await elevateWithTotp(reviewer.client);

  const authResults = [];
  const createResults = [];
  const failClosedResults = [];
  const dacDiagnostics = [];
  for (const origin of origins) {
    for (const [viewportName, viewport] of [
      ["desktop", { width: 1440, height: 1000 }],
      ["mobile", { width: 390, height: 844 }],
    ]) {
      for (const route of ["/profile", "/trades/new", "/dashboard", "/feed"]) {
        authResults.push(
          await verifyAuthRoute(browser, creator.session, origin, viewportName, viewport, route),
        );
      }
    }
    failClosedResults.push(await verifyFailClosed(browser, creator.session, origin));
    dacDiagnostics.push(
      ...(await verifyReviewerAndDac(
        browser,
        elevation.session,
        creator.session,
        outsider.session,
        origin,
      )),
    );
  }

  createResults.push(
    await verifyCreate(browser, creator.session, origins[0], "desktop", { width: 1644, height: 900 }, false),
    await verifyCreate(browser, creator.session, origins[0], "mobile-listed", { width: 390, height: 844 }, false),
    await verifyCreate(browser, creator.session, origins[0], "mobile-custom", { width: 390, height: 844 }, true),
  );
  const apexCreate = await contextFor(browser, creator.session, { width: 390, height: 844 });
  const apexPage = await apexCreate.newPage();
  await openCreate(apexPage, origins[1]);
  await assertNoOverflow(apexPage, "apex Create smoke");
  await apexCreate.close();

  const { error: unenrollError } = await reviewer.client.auth.mfa.unenroll({ factorId: elevation.factorId });
  if (unenrollError) throw new Error(`Could not remove temporary diagnostic TOTP factor: ${unenrollError.message}`);
  await Promise.all([
    creator.client.auth.signOut({ scope: "local" }),
    reviewer.client.auth.signOut({ scope: "local" }),
    outsider.client.auth.signOut({ scope: "local" }),
  ]);

  const result = {
    schemaVersion: 1,
    status: "passed",
    namespace,
    origins,
    authRouteChecks: authResults.length,
    createTransitionChecks: createResults.length + 1,
    dacViewportChecks: dacDiagnostics.length,
    failClosedChecks: failClosedResults.length * 2,
    reviewerAal2Verified: true,
    diagnosticTotpRemoved: true,
    consequentialCreateSubmission: false,
    paymentOrProviderAction: false,
    startedAt,
    completedAt: new Date().toISOString(),
    authResults,
    createResults,
    dacDiagnostics,
    failClosedResults,
  };
  writeJson("auth-create-dac-diagnostics.json", result);
  console.log(
    JSON.stringify({
      status: result.status,
      authRouteChecks: result.authRouteChecks,
      createTransitionChecks: result.createTransitionChecks,
      dacViewportChecks: result.dacViewportChecks,
      failClosedChecks: result.failClosedChecks,
    }),
  );
} catch (error) {
  writeJson("auth-create-dac-diagnostics-failure.json", {
    schemaVersion: 1,
    status: "failed",
    namespace,
    startedAt,
    failedAt: new Date().toISOString(),
    error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
  });
  throw error;
} finally {
  await browser.close();
}
