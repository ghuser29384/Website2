#!/usr/bin/env node

import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OFFER_ID = "10000000-0000-4000-8000-000000000158";
const OWNER_EMAIL = "qa-market-owner@example.com";
const RESPONDER_EMAIL = "qa-market-responder@example.com";
const OWNER_NAME = "QA Offer Owner";
const RESPONDER_NAME = "QA Counterparty";
const OWNER_ACTION =
  "Review a two-page public report and provide a five-bullet, public-safe summary.";
const RESPONDER_ACTION =
  "Complete one documented animal-welfare action from an agreed bounded list.";

function required(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const password = required("QA_TEST_PASSWORD");
const bypassSecret = required("TEMP_VERCEL_BYPASS_SECRET");
const moralTradeUrl = required("MORALTRADE_PREVIEW_URL").replace(/\/$/, "");
const website2Url = required("WEBSITE2_PREVIEW_URL").replace(/\/$/, "");
const artifactDir = path.resolve(process.env.BROWSER_QA_ARTIFACT_DIR || "browser-qa-artifacts");
const runTag = String(process.env.GITHUB_RUN_ID || Date.now());
const questionText = `[QA browser ${runTag}] What exact public-safe record will count as sufficient evidence?`;
const responseMessage = `[QA browser ${runTag}] I accept the bounded test terms and can complete the requested animal-welfare action.`;
const agreementNote = `[QA browser ${runTag}] Synthetic two-account agreement; no payment, donation, sensitive evidence, or external action.`;
const revisionMarker = `[QA revision ${runTag}]`;
const counterofferSummary = `[QA counteroffer ${runTag}] Keep the completion window bounded to fourteen days.`;
const counterofferDetail =
  "Replace any open-ended timing language with a fourteen-day window; evidence requirements and burdens remain unchanged.";

const report = {
  startedAt: new Date().toISOString(),
  target: {
    moralTradeUrl,
    website2Url,
    offerId: OFFER_ID,
  },
  runTag,
  checks: [],
  diagnostics: [],
  agreementId: null,
  completedAt: null,
  outcome: "running",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanError(error) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`.replaceAll(password, "[REDACTED]").replaceAll(
      bypassSecret,
      "[REDACTED]",
    );
  }
  return String(error).replaceAll(password, "[REDACTED]").replaceAll(
    bypassSecret,
    "[REDACTED]",
  );
}

async function recordCheck(name, fn) {
  const startedAt = new Date().toISOString();
  try {
    const detail = (await fn()) ?? "passed";
    report.checks.push({ name, outcome: "pass", detail, startedAt, completedAt: new Date().toISOString() });
    console.log(`PASS: ${name}`);
    return detail;
  } catch (error) {
    const detail = cleanError(error);
    report.checks.push({ name, outcome: "fail", detail, startedAt, completedAt: new Date().toISOString() });
    console.error(`FAIL: ${name}: ${detail}`);
    throw error;
  }
}

function isApplicationOrigin(url, origin) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

async function makeSession(browser, { label, baseURL, viewport }) {
  const origin = new URL(baseURL).origin;
  const sessionDir = path.join(artifactDir, label);
  await mkdir(sessionDir, { recursive: true });

  const diagnostics = {
    label,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
  };

  const context = await browser.newContext({
    baseURL,
    viewport,
    reducedMotion: "reduce",
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": bypassSecret,
      "x-vercel-set-bypass-cookie": "true",
    },
    recordVideo: {
      dir: path.join(sessionDir, "video"),
      size: viewport,
    },
  });

  await context.addCookies([
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
      secure: true,
    },
  ]);
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });

  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.pageErrors.push(cleanError(error)));
  page.on("requestfailed", (request) => {
    if (isApplicationOrigin(request.url(), origin)) {
      diagnostics.failedRequests.push({
        method: request.method(),
        resourceType: request.resourceType(),
        url: request.url(),
        failure: request.failure()?.errorText ?? "unknown request failure",
      });
    }
  });
  page.on("response", (response) => {
    const request = response.request();
    if (
      isApplicationOrigin(response.url(), origin) &&
      response.status() >= 400 &&
      ["document", "fetch", "xhr"].includes(request.resourceType())
    ) {
      diagnostics.badResponses.push({
        method: request.method(),
        resourceType: request.resourceType(),
        status: response.status(),
        url: response.url(),
      });
    }
  });

  return {
    context,
    page,
    diagnostics,
    sessionDir,
    async screenshot(name, fullPage = true) {
      await page.screenshot({
        path: path.join(sessionDir, `${name}.png`),
        fullPage,
      });
    },
    async close() {
      await context.tracing.stop({ path: path.join(sessionDir, "trace.zip") });
      await context.close();
      report.diagnostics.push(diagnostics);
    },
  };
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(
    dimensions.documentWidth,
    `${label} has horizontal document overflow: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.viewportWidth + 3);
}

async function login(page, email, returnTo = "/offers?view=live") {
  const loginPath = `/login?method=email&returnTo=${encodeURIComponent(returnTo)}`;
  await page.goto(loginPath, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 }),
    page.getByRole("button", { name: "Log in" }).click(),
  ]);
}

async function clickWithObservedPending(page, button, pendingPattern) {
  let delayed = false;
  const handler = async (route) => {
    if (!delayed && route.request().method() === "POST") {
      delayed = true;
      await sleep(900);
    }
    await route.continue();
  };
  await page.route("**/*", handler);
  try {
    await button.click({ noWaitAfter: true });
    await expect(button).toHaveText(pendingPattern, { timeout: 5_000 });
  } finally {
    await page.unroute("**/*", handler);
  }
}

async function publicMarketplaceChecks(session, { exerciseFilters = true } = {}) {
  const { page } = session;
  await page.goto("/offers?view=live", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Choose an available route" })).toBeVisible();
  await expect(page.getByText("Participant offer menu").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: OWNER_NAME }).first()).toBeVisible();
  await expect(page.getByText(/Thursday 17:00 UTC cutoff/)).toBeVisible();
  await expect(page.getByText(/consent-based Monday introductions/)).toBeVisible();
  await expect(page.getByText(/1 participant\(s\).*1 offer family\/families.*1 pairing\(s\)/)).toBeVisible();
  await expect(page.getByLabel("I can offer").first()).toBeVisible();
  await expect(page.getByLabel("I am seeking").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Propose match" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Counteroffer" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Ask a question" }).first()).toBeVisible();

  const directory = page.locator('section[aria-labelledby="directory-heading"]');
  await expect(directory.getByText(/worked example/i)).toHaveCount(0);
  await expect(directory.getByText(/Victoria/i)).toHaveCount(0);
  await expect(page.getByText(/guaranteed match/i)).toHaveCount(0);

  if (exerciseFilters) {
    await page.getByLabel("Search the market").fill("animal welfare");
    await page.getByLabel("Sort").selectOption({ label: "Best match" });
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("search") === "animal welfare"),
      page.getByRole("button", { name: "Apply smart search" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: OWNER_NAME }).first()).toBeVisible();
    await expect(page.getByText("Query: animal welfare")).toBeVisible();

    await page.getByLabel("Proposal type").selectOption({ label: "Donation offset" });
    await page.getByRole("button", { name: "Apply smart search" }).click();
    await expect(
      page.getByRole("heading", { name: "No participant menus satisfy every hard constraint" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Clear all" }).click();
    await expect(page.getByRole("heading", { name: OWNER_NAME }).first()).toBeVisible();

    await page.goto("/offers?view=live&page=99", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: OWNER_NAME }).first()).toBeVisible();
    await expect(page.locator('nav[aria-label="Participant menu pages"]')).toHaveCount(0);
  }

  await assertNoHorizontalOverflow(page, `${session.diagnostics.label} marketplace`);
}

async function writeReport() {
  report.completedAt = new Date().toISOString();
  await mkdir(artifactDir, { recursive: true });
  await writeFile(path.join(artifactDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  const markdown = [
    "# PR #158 browser QA",
    "",
    `- Outcome: **${report.outcome}**`,
    `- Exact marketplace deployment: \`${moralTradeUrl}\``,
    `- Exact duplicate-project deployment: \`${website2Url}\``,
    `- Deterministic offer: \`${OFFER_ID}\``,
    `- Agreement: \`${report.agreementId ?? "not created"}\``,
    "",
    "## Checks",
    "",
    ...report.checks.map(
      (check) => `- ${check.outcome === "pass" ? "PASS" : "FAIL"}: ${check.name} — ${check.detail}`,
    ),
    "",
    "## Diagnostics",
    "",
    ...report.diagnostics.flatMap((item) => [
      `### ${item.label}`,
      `- Console errors: ${item.consoleErrors.length}`,
      `- Page errors: ${item.pageErrors.length}`,
      `- Failed application requests: ${item.failedRequests.length}`,
      `- Application 4xx/5xx responses: ${item.badResponses.length}`,
      "",
    ]),
  ].join("\n");
  await writeFile(path.join(artifactDir, "report.md"), `${markdown}\n`);
}

const browser = await chromium.launch({ headless: true });
const sessions = [];
let activePage = null;

try {
  const website2Desktop = await makeSession(browser, {
    label: "website2-desktop-public",
    baseURL: website2Url,
    viewport: { width: 1440, height: 900 },
  });
  sessions.push(website2Desktop);
  activePage = website2Desktop.page;
  await recordCheck("website2 exact deployment public marketplace smoke", async () => {
    await publicMarketplaceChecks(website2Desktop, { exerciseFilters: false });
    await website2Desktop.screenshot("marketplace");
    return "Synthetic participant menu rendered on the duplicate project with no document overflow.";
  });
  await website2Desktop.close();
  sessions.splice(sessions.indexOf(website2Desktop), 1);

  const publicDesktop = await makeSession(browser, {
    label: "moraltrade-desktop-public",
    baseURL: moralTradeUrl,
    viewport: { width: 1440, height: 900 },
  });
  sessions.push(publicDesktop);
  activePage = publicDesktop.page;
  await recordCheck("desktop public marketplace, search, constraints, selectors, and single-page bounds", async () => {
    await publicMarketplaceChecks(publicDesktop, { exerciseFilters: true });
    await publicDesktop.screenshot("marketplace-filtered-and-reset");
    return "Live synthetic menu, truthful clearing copy, smart search, hard filtering, selectors, and page-bound handling passed.";
  });
  await publicDesktop.close();
  sessions.splice(sessions.indexOf(publicDesktop), 1);

  const responder = await makeSession(browser, {
    label: "moraltrade-desktop-responder",
    baseURL: moralTradeUrl,
    viewport: { width: 1440, height: 900 },
  });
  sessions.push(responder);
  activePage = responder.page;

  await recordCheck("responder email/password sign-in", async () => {
    await login(responder.page, RESPONDER_EMAIL, `/offers/${OFFER_ID}/question`);
    await expect(responder.page.getByRole("link", { name: /Log out/i })).toBeVisible();
    return "Signed in as the synthetic responder.";
  });

  await recordCheck("question pending, success, reset, persistence, and empty-thread removal", async () => {
    const page = responder.page;
    await page.goto(`/offers/${OFFER_ID}/question`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/The thread will appear after a real participant posts/)).toBeVisible();
    const textarea = page.getByLabel("Your question");
    await textarea.fill(questionText);
    const button = page.getByRole("button", { name: "Post public question" });
    await clickWithObservedPending(page, button, /Posting question/);
    await expect(page.getByText(questionText, { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel("Your question")).toHaveValue("");
    await expect(page.getByText(/The thread will appear after a real participant posts/)).toHaveCount(0);
    await expect(page).toHaveURL(/posted=/);
    await responder.screenshot("question-posted");
    return "Observed pending state; question persisted; form reset; empty-thread copy disappeared.";
  });

  await recordCheck("save and remove-saved pending plus persisted state", async () => {
    const page = responder.page;
    await page.goto("/offers?view=live", { waitUntil: "domcontentloaded" });
    const card = page.locator("article").filter({ has: page.getByRole("heading", { name: OWNER_NAME }) }).first();
    const save = card.getByRole("button", { name: "Save" });
    await clickWithObservedPending(page, save, /Saving/);
    await expect(card.getByRole("button", { name: "Remove saved" })).toBeVisible({ timeout: 30_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    const reloadedCard = page.locator("article").filter({ has: page.getByRole("heading", { name: OWNER_NAME }) }).first();
    await expect(reloadedCard.getByRole("button", { name: "Remove saved" })).toBeVisible();
    const remove = reloadedCard.getByRole("button", { name: "Remove saved" });
    await clickWithObservedPending(page, remove, /Removing/);
    await expect(reloadedCard.getByRole("button", { name: "Save" })).toBeVisible({ timeout: 30_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.locator("article").filter({ has: page.getByRole("heading", { name: OWNER_NAME }) }).first().getByRole("button", { name: "Save" }),
    ).toBeVisible();
    return "Save and removal each showed pending feedback and survived a reload.";
  });

  await recordCheck("pledge counteroffer preserves source context and reverses roles", async () => {
    const page = responder.page;
    await page.goto("/offers?view=live", { waitUntil: "domcontentloaded" });
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/trades/new" && url.searchParams.get("source_offer") === OFFER_ID),
      page.getByRole("link", { name: "Counteroffer" }).first().click(),
    ]);
    await expect(page.getByText(/Counteroffer to QA Offer Owner loaded as an editable starting point/)).toBeVisible();
    await expect(page.getByLabel("Priority you advance")).toHaveValue("Animal welfare");
    await expect(page.getByLabel("Priority you want advanced")).toHaveValue("Global health");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByLabel("Your commitment")).toHaveValue(RESPONDER_ACTION);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByLabel("Counterparty commitment")).toHaveValue(OWNER_ACTION);
    await responder.screenshot("counteroffer-reversed-terms");
    return "Source offer remained identified; cause and action roles were visibly reversed.";
  });

  await recordCheck("responder submits interest without application 4xx/5xx", async () => {
    const page = responder.page;
    await page.goto(`/offers/${OFFER_ID}#respond`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Respond to this offer")).toBeVisible();
    await page.getByLabel("Message").fill(responseMessage);
    const responsePromise = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url().includes(`/offers/${OFFER_ID}`),
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: "Express interest" }).click({ noWaitAfter: true });
    const response = await responsePromise;
    expect(response.status()).toBeLessThan(400);
    await expect(page.getByText("Your response is pending")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel("Message")).toHaveValue(responseMessage);
    await responder.screenshot("response-submitted");
    return `Interest POST returned HTTP ${response.status()} and the persisted response is pending.`;
  });

  const owner = await makeSession(browser, {
    label: "moraltrade-desktop-owner",
    baseURL: moralTradeUrl,
    viewport: { width: 1440, height: 900 },
  });
  sessions.push(owner);
  activePage = owner.page;

  await recordCheck("owner sign-in and pending-response visibility", async () => {
    await login(owner.page, OWNER_EMAIL, `/offers/${OFFER_ID}`);
    await owner.page.goto(`/offers/${OFFER_ID}`, { waitUntil: "domcontentloaded" });
    await expect(owner.page.getByRole("heading", { name: "Responses to this offer" })).toBeVisible();
    await expect(owner.page.getByText(responseMessage, { exact: true })).toBeVisible();
    await expect(owner.page.getByText("pending", { exact: true }).first()).toBeVisible();
    return "Owner can see the real responder record and pending state.";
  });

  let dealroomPath = null;
  await recordCheck("owner acceptance creates agreement and commitments link", async () => {
    const page = owner.page;
    await page.getByLabel("Agreement notes").fill(agreementNote);
    const acceptButton = page.getByRole("button", { name: "Accept and create agreement" });
    const responsePromise = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url().includes(`/offers/${OFFER_ID}`),
      { timeout: 30_000 },
    );
    await acceptButton.click({ noWaitAfter: true });
    const response = await responsePromise;
    expect(response.status()).toBeLessThan(400);
    await page.goto("/commitments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Deals" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Global health for Animal welfare" })).toBeVisible();
    const dealroomLink = page.getByRole("link", { name: "Open dealroom" }).first();
    const href = await dealroomLink.getAttribute("href");
    expect(href).toMatch(/^\/deals\/[0-9a-f-]{36}$/i);
    dealroomPath = href;
    report.agreementId = href.split("/").pop();
    await owner.screenshot("commitments-agreement-created");
    return `Acceptance POST returned HTTP ${response.status()}; agreement ${report.agreementId} appears in commitments.`;
  });

  await recordCheck("dealroom structure, lifecycle, side-by-side terms, and absent empty modules", async () => {
    const page = owner.page;
    await page.goto(dealroomPath, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Negotiate, revise, and confirm one shared record." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Visible state, not decorative motion" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Commitments side by side" })).toBeVisible();
    await expect(page.getByText(OWNER_ACTION, { exact: true })).toBeVisible();
    await expect(page.getByText(RESPONDER_ACTION, { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Edit with a visible before-and-after diff" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Counteroffer or confirm the current terms" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evidence and review activity" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open evidence dossier" })).toHaveCount(0);
    await assertNoHorizontalOverflow(page, "desktop dealroom");
    await owner.screenshot("dealroom-initial");
    return "Lifecycle, commitments, term editor, diff surface, counteroffer, and status controls render; empty evidence/review modules do not.";
  });

  await recordCheck("dealroom term diff and persisted revision", async () => {
    const page = owner.page;
    const structuredTerms = page.getByLabel("Structured terms");
    const original = await structuredTerms.inputValue();
    const revised = `${original}\n\n${revisionMarker}`;
    await structuredTerms.fill(revised);
    await expect(page.getByText("1 unpublished change")).toBeVisible();
    await expect(page.getByText("Proposed revision")).toBeVisible();
    await expect(page.getByText(revisionMarker, { exact: false })).toBeVisible();
    await owner.screenshot("dealroom-term-diff");
    await page.getByRole("button", { name: "Save revised terms" }).click();
    await expect(page.getByLabel("Structured terms")).toHaveValue(revised, { timeout: 30_000 });
    await expect(page.getByText("No unpublished changes")).toBeVisible();
    return "Before/after diff appeared and the revised structured terms persisted after save.";
  });

  await recordCheck("dealroom counteroffer history", async () => {
    const page = owner.page;
    await page.getByLabel("Change requested").fill(counterofferSummary);
    await page.getByLabel("Reason and exact replacement term").fill(counterofferDetail);
    await page.getByRole("button", { name: "Record counteroffer" }).click();
    await expect(page.getByText(counterofferSummary, { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(counterofferDetail, { exact: true })).toBeVisible();
    return "Counteroffer event is visible in the real agreement history.";
  });

  await recordCheck("dealroom status control", async () => {
    const page = owner.page;
    const activate = page.getByRole("button", { name: "Record confirmation and activate" });
    if (await activate.count()) {
      await activate.click();
      await expect(page.getByText("Agreement is active.")).toBeVisible({ timeout: 30_000 });
      return "Proposed agreement was activated through the recorded status control.";
    }
    await expect(page.getByText("Agreement is active.")).toBeVisible();
    return "Agreement was already active and the active status control state rendered.";
  });

  await owner.screenshot("dealroom-final");

  await recordCheck("responder can access the same agreement and history", async () => {
    const page = responder.page;
    await page.goto("/commitments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Global health for Animal welfare" })).toBeVisible();
    await page.getByRole("link", { name: "Open dealroom" }).first().click();
    await expect(page.getByText(revisionMarker, { exact: false })).toBeVisible();
    await expect(page.getByText(counterofferSummary, { exact: true })).toBeVisible();
    await expect(page.getByText("Agreement is active.")).toBeVisible();
    return "Both synthetic accounts can access the same persisted dealroom record.";
  });

  const mobilePublic = await makeSession(browser, {
    label: "moraltrade-mobile-public",
    baseURL: moralTradeUrl,
    viewport: { width: 390, height: 844 },
  });
  sessions.push(mobilePublic);
  activePage = mobilePublic.page;
  await recordCheck("mobile public marketplace layout and controls", async () => {
    await publicMarketplaceChecks(mobilePublic, { exerciseFilters: false });
    await assertNoHorizontalOverflow(mobilePublic.page, "mobile marketplace");
    await mobilePublic.screenshot("marketplace-mobile");
    return "Participant menu and primary actions render at 390×844 without document overflow.";
  });
  await mobilePublic.close();
  sessions.splice(sessions.indexOf(mobilePublic), 1);

  const mobileResponder = await makeSession(browser, {
    label: "moraltrade-mobile-responder",
    baseURL: moralTradeUrl,
    viewport: { width: 390, height: 844 },
  });
  sessions.push(mobileResponder);
  activePage = mobileResponder.page;
  await recordCheck("mobile authenticated commitments and dealroom", async () => {
    const page = mobileResponder.page;
    await login(page, RESPONDER_EMAIL, "/commitments");
    await page.goto("/commitments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Deals" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open dealroom" }).first()).toBeVisible();
    await assertNoHorizontalOverflow(page, "mobile commitments");
    await page.getByRole("link", { name: "Open dealroom" }).first().click();
    await expect(page.getByRole("heading", { name: "Commitments side by side" })).toBeVisible();
    await expect(page.getByText(counterofferSummary, { exact: true })).toBeVisible();
    await expect(page.getByText("Agreement is active.")).toBeVisible();
    await assertNoHorizontalOverflow(page, "mobile dealroom");
    await mobileResponder.screenshot("dealroom-mobile");
    return "Authenticated commitments and the shared dealroom render at 390×844 without document overflow.";
  });
  await mobileResponder.close();
  sessions.splice(sessions.indexOf(mobileResponder), 1);

  const allDiagnostics = report.diagnostics;
  await recordCheck("application-origin browser diagnostics", async () => {
    const failures = allDiagnostics.flatMap((item) => [
      ...item.consoleErrors.map((error) => `${item.label} console: ${error}`),
      ...item.pageErrors.map((error) => `${item.label} pageerror: ${error}`),
      ...item.failedRequests.map((error) => `${item.label} request: ${JSON.stringify(error)}`),
      ...item.badResponses.map((error) => `${item.label} response: ${JSON.stringify(error)}`),
    ]);
    expect(failures, failures.join("\n")).toEqual([]);
    return "No application-origin console errors, page errors, failed requests, or HTTP 4xx/5xx responses were observed.";
  });

  report.outcome = "pass";
} catch (error) {
  report.outcome = "fail";
  report.failure = cleanError(error);
  if (activePage && !activePage.isClosed()) {
    try {
      await activePage.screenshot({
        path: path.join(artifactDir, "failure-last-page.png"),
        fullPage: true,
      });
    } catch {
      // Preserve the original failure.
    }
  }
  throw error;
} finally {
  for (const session of [...sessions].reverse()) {
    try {
      await session.close();
    } catch (error) {
      report.diagnostics.push({ label: session.diagnostics.label, closeError: cleanError(error) });
    }
  }
  await browser.close();
  await writeReport();
}
