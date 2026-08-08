import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { isExpectedFirstTimeStandardsAbort } from "./complete-profile-canary-diagnostics.mjs";

const controlSha = process.env.CONTROL_SHA;
const expectedSha = process.env.EXPECTED_SHA;
const expectedDeploymentId = process.env.EXPECTED_DEPLOYMENT_ID;
const canonicalOrigin = process.env.CANONICAL_ORIGIN ?? "https://www.moraltrade.org";
const apexOrigin = process.env.APEX_ORIGIN ?? "https://moraltrade.org";
const outputDir = process.env.CANARY_OUTPUT_DIR ?? "complete-profile-production-canary";

assert.match(controlSha ?? "", /^[0-9a-f]{40}$/, "CONTROL_SHA is required");
assert.match(expectedSha ?? "", /^[0-9a-f]{40}$/, "EXPECTED_SHA is required");
assert.ok(expectedDeploymentId, "EXPECTED_DEPLOYMENT_ID is required");
assert.notEqual(
  expectedDeploymentId,
  "null",
  "EXPECTED_DEPLOYMENT_ID must be a real deployment ID",
);

const entries = [
  { id: "apex", origin: apexOrigin },
  { id: "www", origin: canonicalOrigin },
];

await mkdir(outputDir, { recursive: true });

function isMoralTradeUrl(rawUrl) {
  try {
    const hostname = new URL(rawUrl).hostname;
    return hostname === "moraltrade.org" || hostname === "www.moraltrade.org";
  } catch {
    return false;
  }
}

function makeState(entry, flow) {
  return {
    entry,
    flow,
    pageErrors: [],
    consoleErrors: [],
    failedRequests: [],
    expectedPrefetchAborts: [],
    expectedNavigationAborts: [],
    unexpectedHttpErrors: [],
  };
}

function isExpectedPrefetchAbort(request) {
  const failure = request.failure();
  if (failure?.errorText !== "net::ERR_ABORTED" || request.isNavigationRequest()) {
    return false;
  }
  if (!isMoralTradeUrl(request.url())) return false;

  const url = new URL(request.url());
  const headers = request.headers();
  return (
    request.method() === "GET" &&
    request.resourceType() === "fetch" &&
    (url.searchParams.has("_rsc") ||
      headers["next-router-prefetch"] === "1" ||
      headers.rsc === "1" ||
      Object.hasOwn(headers, "next-url"))
  );
}

function attachDiagnostics(page, state) {
  page.on("pageerror", (error) => state.pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    state.consoleErrors.push({
      text: message.text(),
      location: message.location(),
    });
  });
  page.on("requestfailed", (request) => {
    if (!isMoralTradeUrl(request.url())) return;

    const record = {
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      isNavigationRequest: request.isNavigationRequest(),
      errorText: request.failure()?.errorText ?? "unknown",
      headers: request.headers(),
    };

    if (isExpectedPrefetchAbort(request)) {
      state.expectedPrefetchAborts.push(record);
    } else if (isExpectedFirstTimeStandardsAbort(record, state.flow)) {
      state.expectedNavigationAborts.push(record);
    } else {
      state.failedRequests.push(record);
    }
  });
  page.on("response", (response) => {
    if (!isMoralTradeUrl(response.url()) || response.status() < 400) return;

    const record = {
      status: response.status(),
      url: response.url(),
      method: response.request().method(),
      resourceType: response.request().resourceType(),
      headers: response.request().headers(),
    };

    state.unexpectedHttpErrors.push(record);
  });
}

function assertNoFatalDiagnostics(state) {
  assert.deepEqual(state.pageErrors, [], `Page errors: ${state.pageErrors.join(" | ")}`);
  assert.deepEqual(
    state.failedRequests,
    [],
    `Same-site failed requests: ${JSON.stringify(state.failedRequests)}`,
  );
  assert.deepEqual(
    state.unexpectedHttpErrors,
    [],
    `Unexpected same-site HTTP errors: ${JSON.stringify(state.unexpectedHttpErrors)}`,
  );
  assert.deepEqual(
    state.consoleErrors,
    [],
    `Unexpected console errors: ${JSON.stringify(state.consoleErrors)}`,
  );
}

async function addReturningCookie(context) {
  await context.addCookies([
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: canonicalOrigin,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
}

function assertCanonicalFinalHost(page) {
  assert.equal(
    new URL(page.url()).origin,
    canonicalOrigin,
    `Expected canonical www origin, received ${page.url()}`,
  );
}

async function settleDiagnostics(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1_000);
}

const browser = await chromium.launch({ headless: true });
const report = {
  controlSha,
  expectedSha,
  expectedDeploymentId,
  canonicalOrigin,
  checkedAt: new Date().toISOString(),
  scenarios: [],
};

async function runFirstTime(entry) {
  const state = makeState(entry.id, "first-time-desktop");
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.clearCookies();
  const page = await context.newPage();
  attachDiagnostics(page, state);

  const response = await page.goto(`${entry.origin}/complete-profile`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  assert.ok(response && response.status() < 500, "First-time route returned no usable response");
  await page.waitForURL((url) => url.pathname === "/walkthrough", { timeout: 60_000 });
  await page
    .getByText("Welcome to Moral Trade", { exact: true })
    .first()
    .waitFor({ state: "visible", timeout: 60_000 });
  assertCanonicalFinalHost(page);
  assert.equal(await page.getByLabel("Profile setup: priorities").count(), 0);

  const cookies = await context.cookies(canonicalOrigin);
  assert.equal(
    cookies.find((cookie) => cookie.name === "mt_walkthrough_seen")?.value,
    "1",
    "First-time flow did not persist the Walkthrough-seen signal",
  );

  await settleDiagnostics(page);
  await page.screenshot({
    path: `${outputDir}/${entry.id}-first-time-desktop.png`,
    fullPage: true,
  });
  assertNoFatalDiagnostics(state);
  state.finalUrl = page.url();
  state.status = "passed";
  report.scenarios.push(state);
  await context.close();
}

async function runReturningDesktop(entry) {
  const state = makeState(entry.id, "returning-desktop");
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await addReturningCookie(context);
  const page = await context.newPage();
  attachDiagnostics(page, state);

  const response = await page.goto(`${entry.origin}/complete-profile`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  assert.ok(response && response.status() < 500, "Returning route returned no usable response");
  await page.waitForURL((url) => url.pathname === "/complete-profile", { timeout: 60_000 });
  await page
    .getByRole("heading", { name: "Spend 100 sparks of attention." })
    .waitFor({ state: "visible", timeout: 60_000 });
  await page
    .getByLabel("Profile setup: priorities")
    .waitFor({ state: "visible", timeout: 60_000 });
  assertCanonicalFinalHost(page);
  assert.equal(await page.getByLabel("Walkthrough progress: final step").count(), 0);

  await page.screenshot({
    path: `${outputDir}/${entry.id}-returning-desktop-page.png`,
    fullPage: true,
  });

  await page.getByRole("button", { name: "Save profile" }).click();
  const dialog = page.getByRole("dialog", { name: "Finish the practical details." });
  await dialog.waitFor({ state: "visible", timeout: 30_000 });
  const dialogText = await dialog.textContent();
  assert.match(dialogText ?? "", /Your 100-spark ranking/);
  assert.match(dialogText ?? "", /Not set here/);
  assert.match(dialogText ?? "", /Saving does not create or publish an offer\./);

  await settleDiagnostics(page);
  await page.screenshot({
    path: `${outputDir}/${entry.id}-returning-desktop-dialog.png`,
    fullPage: true,
  });
  assertNoFatalDiagnostics(state);
  state.finalUrl = page.url();
  state.status = "passed";
  report.scenarios.push(state);
  await context.close();
}

async function runReturningMobile(entry) {
  const state = makeState(entry.id, "returning-mobile");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await addReturningCookie(context);
  const page = await context.newPage();
  attachDiagnostics(page, state);

  const response = await page.goto(`${entry.origin}/complete-profile`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  assert.ok(response && response.status() < 500, "Returning mobile route returned no usable response");
  await page.waitForURL((url) => url.pathname === "/complete-profile", { timeout: 60_000 });
  await page
    .getByLabel("80 of 100 attention points assigned")
    .waitFor({ state: "visible", timeout: 60_000 });
  assertCanonicalFinalHost(page);

  await page.getByRole("button", { name: "Assign one spark to Space governance" }).click();
  await page
    .getByRole("button", { name: "Decrease Space governance" })
    .waitFor({ state: "visible", timeout: 30_000 });

  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(
    dimensions.documentWidth <= dimensions.viewportWidth,
    `Mobile horizontal overflow: ${JSON.stringify(dimensions)}`,
  );

  await settleDiagnostics(page);
  await page.screenshot({
    path: `${outputDir}/${entry.id}-returning-mobile.png`,
    fullPage: true,
  });
  assertNoFatalDiagnostics(state);
  state.finalUrl = page.url();
  state.dimensions = dimensions;
  state.status = "passed";
  report.scenarios.push(state);
  await context.close();
}

try {
  for (const entry of entries) {
    await runFirstTime(entry);
    await runReturningDesktop(entry);
    await runReturningMobile(entry);
  }
  report.status = "passed";
  report.expectedPrefetchAbortCount = report.scenarios.reduce(
    (total, scenario) => total + scenario.expectedPrefetchAborts.length,
    0,
  );
  report.expectedNavigationAbortCount = report.scenarios.reduce(
    (total, scenario) => total + scenario.expectedNavigationAborts.length,
    0,
  );
} catch (error) {
  report.status = "failed";
  report.failure = error instanceof Error ? error.stack : String(error);
  throw error;
} finally {
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
