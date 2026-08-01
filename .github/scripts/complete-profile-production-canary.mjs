import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const expectedSha = process.env.EXPECTED_SHA;
const expectedDeploymentId = process.env.EXPECTED_DEPLOYMENT_ID;
const canonicalOrigin = process.env.CANONICAL_ORIGIN ?? "https://www.moraltrade.org";
const apexOrigin = process.env.APEX_ORIGIN ?? "https://moraltrade.org";
const outputDir = process.env.CANARY_OUTPUT_DIR ?? "complete-profile-production-canary";

assert.ok(expectedSha, "EXPECTED_SHA is required");
assert.ok(expectedDeploymentId, "EXPECTED_DEPLOYMENT_ID is required");

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
    unexpectedHttpErrors: [],
    knownRootPrefetch404s: [],
  };
}

function isKnownRootPrefetch404(response) {
  if (response.status() !== 404) return false;

  const url = new URL(response.url());
  const headers = response.request().headers();
  const isRootRscPrefetch =
    url.pathname === "/" &&
    url.searchParams.has("_rsc") &&
    (headers["next-router-prefetch"] === "1" ||
      Boolean(headers["next-router-segment-prefetch"]));

  return isMoralTradeUrl(response.url()) && isRootRscPrefetch;
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
    state.failedRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      errorText: request.failure()?.errorText ?? "unknown",
    });
  });
  page.on("response", (response) => {
    if (!isMoralTradeUrl(response.url()) || response.status() < 400) return;

    const record = {
      status: response.status(),
      url: response.url(),
      method: response.request().method(),
      resourceType: response.request().resourceType(),
    };

    if (isKnownRootPrefetch404(response)) {
      state.knownRootPrefetch404s.push(record);
    } else {
      state.unexpectedHttpErrors.push(record);
    }
  });
}

function assertNoFatalDiagnostics(state) {
  const knownPrefetchUrls = new Set(state.knownRootPrefetch404s.map((item) => item.url));
  const unexpectedConsoleErrors = state.consoleErrors.filter((item) => {
    const url = item.location?.url ?? "";
    return !(
      knownPrefetchUrls.has(url) &&
      /Failed to load resource: the server responded with a status of 404/i.test(item.text)
    );
  });

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
    unexpectedConsoleErrors,
    [],
    `Unexpected console errors: ${JSON.stringify(unexpectedConsoleErrors)}`,
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
  report.knownRootPrefetch404Count = report.scenarios.reduce(
    (total, scenario) => total + scenario.knownRootPrefetch404s.length,
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
