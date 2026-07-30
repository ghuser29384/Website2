#!/usr/bin/env node

import { chromium, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OFFER_ID = "10000000-0000-4000-8000-000000000158";
const OWNER_EMAIL = "qa-market-owner@example.com";
const RESPONDER_EMAIL = "qa-market-responder@example.com";
const OWNER_NAME = "QA Offer Owner";
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
const candidateUrl = required("MORALTRADE_PREVIEW_URL").replace(/\/$/, "");
const duplicateUrl = required("WEBSITE2_PREVIEW_URL").replace(/\/$/, "");
const baselineUrl = required("BASELINE_URL").replace(/\/$/, "");
const qaDatabaseUrl = required("QA_SUPABASE_DB_URL");
const expectedHeadSha = required("EXPECTED_HEAD_SHA");
const viewport = {
  width: Number(required("VIEWPORT_WIDTH")),
  height: Number(required("VIEWPORT_HEIGHT")),
};
const artifactDir = path.resolve(required("BROWSER_QA_ARTIFACT_DIR"));
const runTag = String(process.env.GITHUB_RUN_ID || Date.now());
const questionText = `[marketplace delta ${runTag}] What exact public-safe record counts as sufficient evidence?`;
const responseMessage = `[marketplace delta ${runTag}] I accept the bounded test terms and can complete the requested reciprocal action.`;
const agreementNote = `[marketplace delta ${runTag}] Synthetic QA agreement; no payment, donation, external action, or sensitive evidence.`;

const report = {
  startedAt: new Date().toISOString(),
  outcome: "running",
  expectedHeadSha,
  viewport,
  runTag,
  target: { candidateUrl, duplicateUrl, baselineUrl, offerId: OFFER_ID },
  agreementId: null,
  threadId: null,
  checks: [],
  diagnostics: [],
  knownDiagnostics: [],
  comparison: null,
  completedAt: null,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sanitize(value) {
  return String(value)
    .replaceAll(password, "[REDACTED_PASSWORD]")
    .replaceAll(bypassSecret, "[REDACTED_BYPASS]")
    .replaceAll(qaDatabaseUrl, "[REDACTED_DATABASE_URL]");
}

function cleanError(error) {
  if (error instanceof Error) return sanitize(`${error.name}: ${error.message}`);
  return sanitize(error);
}

function psqlQuery(sql) {
  return execFileSync(
    "psql",
    [
      qaDatabaseUrl,
      "--no-psqlrc",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
      "--command",
      sql,
    ],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  ).trim();
}

async function recordCheck(name, fn) {
  const startedAt = new Date().toISOString();
  try {
    const detail = (await fn()) ?? "passed";
    report.checks.push({
      name,
      outcome: "pass",
      detail,
      startedAt,
      completedAt: new Date().toISOString(),
    });
    console.log(`PASS: ${name}`);
    return detail;
  } catch (error) {
    const detail = cleanError(error);
    report.checks.push({
      name,
      outcome: "fail",
      detail,
      startedAt,
      completedAt: new Date().toISOString(),
    });
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

async function makeSession(browser, { label, baseURL, protectedPreview = true }) {
  const origin = new URL(baseURL).origin;
  const sessionDir = path.join(artifactDir, label);
  await mkdir(sessionDir, { recursive: true });
  const diagnostics = {
    label,
    origin,
    protectedPreview,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
  };
  const context = await browser.newContext({
    baseURL,
    viewport,
    reducedMotion: "reduce",
    extraHTTPHeaders: protectedPreview
      ? {
          "x-vercel-protection-bypass": bypassSecret,
          "x-vercel-set-bypass-cookie": "true",
        }
      : undefined,
    recordVideo: protectedPreview
      ? { dir: path.join(sessionDir, "video"), size: viewport }
      : undefined,
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
  if (protectedPreview) {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  }

  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(sanitize(message.text()));
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
    label,
    page,
    context,
    diagnostics,
    sessionDir,
    async screenshot(name, fullPage = true) {
      await page.screenshot({ path: path.join(sessionDir, `${name}.png`), fullPage });
    },
    async close() {
      if (protectedPreview) {
        await context.tracing.stop({ path: path.join(sessionDir, "trace.zip") });
      }
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
    `${label} has horizontal overflow: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.viewportWidth + 3);
}

async function login(page, email, returnTo) {
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

function participantGroup(page) {
  return page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: OWNER_NAME }) })
    .first();
}

async function assertCandidateDirectory(session) {
  const { page } = session;
  await page.goto("/offers?view=live", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Find a live proposal you can evaluate quickly." }),
  ).toBeVisible();
  await expect(page.getByText("Participant menu").first()).toBeVisible();
  const group = participantGroup(page);
  await expect(group).toBeVisible();
  await expect(group.getByText("Exact published proposal", { exact: true })).toBeVisible();
  await expect(group.getByText(OWNER_ACTION, { exact: true })).toBeVisible();
  await expect(group.getByText(RESPONDER_ACTION, { exact: true })).toBeVisible();
  await expect(group.getByRole("link", { name: "Respond" })).toBeVisible();
  await expect(group.getByRole("link", { name: "Counteroffer" })).toBeVisible();
  await expect(group.getByRole("link", { name: "Ask" })).toBeVisible();
  await expect(group.getByRole("link", { name: /Open full terms/ })).toBeVisible();
  await expect(page.getByText(/1 participant across 1 exact proposal/)).toBeVisible();
  await assertNoHorizontalOverflow(page, `${session.label} directory`);
  return group;
}

async function writeReports() {
  report.completedAt = new Date().toISOString();
  await mkdir(artifactDir, { recursive: true });
  await writeFile(path.join(artifactDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  const markdown = [
    "# Marketplace delta exact-head browser QA",
    "",
    `- Outcome: **${report.outcome}**`,
    `- Expected head: \`${report.expectedHeadSha}\``,
    `- Viewport: \`${viewport.width} × ${viewport.height}\``,
    `- Candidate: \`${candidateUrl}\``,
    `- Duplicate project: \`${duplicateUrl}\``,
    `- Current-main baseline: \`${baselineUrl}\``,
    `- Deterministic offer: \`${OFFER_ID}\``,
    `- Thread: \`${report.threadId ?? "not created"}\``,
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
    `- Classified known diagnostic entries: ${report.knownDiagnostics.length}`,
  ].join("\n");
  await writeFile(path.join(artifactDir, "report.md"), `${markdown}\n`);
}

function classifyDiagnostics() {
  const unexpected = [];
  const known = [];
  const knownPrefetchPaths = new Set(["/", "/discover", "/feed", "/offers"]);

  for (const item of report.diagnostics) {
    if (!item.protectedPreview) continue;
    const hasStripeBypassCors = item.consoleErrors.some(
      (error) => error.includes("m.stripe.com/6") && error.includes("x-vercel-protection-bypass"),
    );
    for (const error of item.consoleErrors) {
      const isKnown =
        error === "Failed to load resource: the server responded with a status of 404 ()" ||
        error.startsWith("Framing 'https://js.stripe.com/' violates the following report-only") ||
        (error.includes("m.stripe.com/6") && error.includes("x-vercel-protection-bypass")) ||
        (error === "Failed to load resource: net::ERR_FAILED" && hasStripeBypassCors);
      (isKnown ? known : unexpected).push(`${item.label} console: ${error}`);
    }
    for (const error of item.pageErrors) {
      unexpected.push(`${item.label} pageerror: ${error}`);
    }
    for (const error of item.failedRequests) {
      let pathname = "";
      try {
        pathname = new URL(error.url).pathname;
      } catch {
        // Invalid URLs remain unexpected.
      }
      const isKnown =
        error.failure === "net::ERR_ABORTED" &&
        (["fetch", "ping"].includes(error.resourceType) ||
          (error.resourceType === "script" && pathname.startsWith("/_next/static/chunks/app/")));
      (isKnown ? known : unexpected).push(`${item.label} request: ${JSON.stringify(error)}`);
    }
    for (const error of item.badResponses) {
      let pathname = "";
      try {
        pathname = new URL(error.url).pathname;
      } catch {
        // Invalid URLs remain unexpected.
      }
      const isKnown =
        error.status === 404 &&
        error.resourceType === "fetch" &&
        knownPrefetchPaths.has(pathname);
      (isKnown ? known : unexpected).push(`${item.label} response: ${JSON.stringify(error)}`);
    }
  }
  report.knownDiagnostics = known;
  expect(unexpected, unexpected.join("\n")).toEqual([]);
}

const browser = await chromium.launch({ headless: true });
const openSessions = [];

try {
  const baseline = await makeSession(browser, {
    label: "current-main-baseline",
    baseURL: baselineUrl,
    protectedPreview: false,
  });
  openSessions.push(baseline);
  await recordCheck("rendered current-main comparison", async () => {
    await baseline.page.goto("/offers?view=live", { waitUntil: "domcontentloaded" });
    await expect(
      baseline.page.getByRole("heading", { name: "Open participant proposals" }),
    ).toBeVisible();
    const baselineGroupCount = await baseline.page.getByText("Participant menu", { exact: true }).count();
    expect(baselineGroupCount).toBe(0);
    await baseline.screenshot("current-main-offer-cards");

    const candidate = await makeSession(browser, {
      label: "candidate-public-comparison",
      baseURL: candidateUrl,
    });
    openSessions.push(candidate);
    await assertCandidateDirectory(candidate);
    const candidateGroupCount = await candidate.page.getByText("Participant menu", { exact: true }).count();
    expect(candidateGroupCount).toBeGreaterThan(0);
    await candidate.screenshot("candidate-participant-grouping");
    report.comparison = { baselineGroupCount, candidateGroupCount };
    await candidate.close();
    openSessions.splice(openSessions.indexOf(candidate), 1);
    return "Current main rendered one-card-per-offer inventory; the candidate rendered exact offers inside participant groups.";
  });
  await baseline.close();
  openSessions.splice(openSessions.indexOf(baseline), 1);

  const duplicate = await makeSession(browser, {
    label: "website2-public",
    baseURL: duplicateUrl,
  });
  openSessions.push(duplicate);
  await recordCheck("duplicate-project exact-head QA binding", async () => {
    await assertCandidateDirectory(duplicate);
    await duplicate.screenshot("qa-participant-directory");
    return "The duplicate project rendered the single MoralTrade QA participant and exact proposal.";
  });
  await duplicate.close();
  openSessions.splice(openSessions.indexOf(duplicate), 1);

  const responder = await makeSession(browser, {
    label: "moraltrade-responder",
    baseURL: candidateUrl,
  });
  openSessions.push(responder);

  await recordCheck("synthetic responder signs into the QA deployment", async () => {
    await login(responder.page, RESPONDER_EMAIL, `/offers/${OFFER_ID}#discussion`);
    await expect(responder.page.getByRole("link", { name: /Log out/i })).toBeVisible();
    return "The branch deployment authenticated the QA-only responder account.";
  });

  await recordCheck("question pending, success, persistence, and reset", async () => {
    const page = responder.page;
    await page.goto(`/offers/${OFFER_ID}#discussion`, { waitUntil: "domcontentloaded" });
    const textarea = page.getByLabel("Ask a public question");
    await textarea.fill(questionText);
    const button = page.getByRole("button", { name: "Post public question" });
    await clickWithObservedPending(page, button, /Posting question/);
    await page.waitForURL((url) => url.searchParams.has("question_posted"), { timeout: 30_000 });
    await expect(page.getByText("Question posted.").first()).toBeVisible();
    await expect(page.getByText(questionText, { exact: true })).toBeVisible();
    await expect(page.getByLabel("Ask a public question")).toHaveValue("");
    await responder.screenshot("question-posted");
    return "Observed the pending label, server confirmation, persisted public question, and reset textarea.";
  });

  await recordCheck("Save and Remove saved persist across reloads", async () => {
    const page = responder.page;
    await page.goto("/offers?view=live", { waitUntil: "domcontentloaded" });
    let group = participantGroup(page);
    await group.getByRole("button", { name: "Save" }).click();
    await expect(group.getByRole("button", { name: "Remove saved" })).toBeVisible({ timeout: 30_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    group = participantGroup(page);
    await expect(group.getByRole("button", { name: "Remove saved" })).toBeVisible();
    await group.getByRole("button", { name: "Remove saved" }).click();
    await expect(group.getByRole("button", { name: "Save" })).toBeVisible({ timeout: 30_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    group = participantGroup(page);
    await expect(group.getByRole("button", { name: "Save" })).toBeVisible();
    return "Saved and unsaved state each survived a full reload; final state is unsaved.";
  });

  await recordCheck("counteroffer preserves source_offer and reverses exact terms", async () => {
    const page = responder.page;
    await page.goto("/offers?view=live", { waitUntil: "domcontentloaded" });
    const group = participantGroup(page);
    await Promise.all([
      page.waitForURL(
        (url) =>
          url.pathname === "/trades/new" && url.searchParams.get("source_offer") === OFFER_ID,
        { timeout: 30_000 },
      ),
      group.getByRole("link", { name: "Counteroffer" }).click(),
    ]);
    await expect(page.getByText(/Counteroffer to QA Offer Owner loaded as an editable starting point/)).toBeVisible();
    await expect(page.getByLabel("Priority you advance")).toHaveValue("Animal welfare");
    await expect(page.getByLabel("Priority you want advanced")).toHaveValue("Global health");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByLabel("Your commitment")).toHaveValue(RESPONDER_ACTION);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByLabel("Counterparty commitment")).toHaveValue(OWNER_ACTION);
    await responder.screenshot("counteroffer-source-and-reversal");
    return "The adapter retained the exact source ID and visibly reversed both priorities and commitments.";
  });

  await recordCheck("responder submits a real pending interest", async () => {
    const page = responder.page;
    await page.goto(`/offers/${OFFER_ID}#respond`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Respond to this offer", { exact: true })).toBeVisible();
    await page.getByLabel("Message").fill(responseMessage);
    await page.getByRole("button", { name: "Express interest" }).click();
    await expect(page.getByText("Your response is pending", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await responder.screenshot("interest-pending");
    return "A signed-in response persisted in pending state without payment or external action.";
  });

  const owner = await makeSession(browser, {
    label: "moraltrade-owner",
    baseURL: candidateUrl,
  });
  openSessions.push(owner);

  await recordCheck("owner atomically accepts the member response", async () => {
    const page = owner.page;
    await login(page, OWNER_EMAIL, `/offers/${OFFER_ID}`);
    await page.goto(`/offers/${OFFER_ID}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Responses to this offer" })).toBeVisible();
    await expect(page.getByText(responseMessage, { exact: true })).toBeVisible();
    await page.getByLabel("Agreement notes").fill(agreementNote);
    await page.getByRole("button", { name: "Accept and create agreement" }).click();
    await expect(page.getByText("Interest accepted and agreement created.")).toBeVisible({
      timeout: 30_000,
    });

    const raw = psqlQuery(`
      select jsonb_build_object(
        'agreementId', a.id,
        'threadId', t.id,
        'lifecycleStatus', a.lifecycle_status,
        'currentVersionId', a.current_version_id,
        'interestStatus', i.status,
        'offerStatus', o.status,
        'workflowStatus', o.workflow_status
      )::text
      from public.agreements a
      join public.trade_threads t on t.agreement_id=a.id and t.offer_id=a.offer_id
      join public.interests i on i.id=a.interest_id
      join public.offers o on o.id=a.offer_id
      where a.offer_id='${OFFER_ID}'::uuid
      order by a.created_at desc
      limit 1;
    `);
    const state = JSON.parse(raw);
    expect(state.lifecycleStatus).toBe("proposed");
    expect(state.currentVersionId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(state.interestStatus).toBe("accepted");
    expect(state.offerStatus).toBe("matched");
    expect(state.workflowStatus).toBe("closed");
    report.agreementId = state.agreementId;
    report.threadId = state.threadId;
    await owner.screenshot("acceptance-created-core-agreement");
    return `Created proposed agreement ${state.agreementId} and linked private thread ${state.threadId}.`;
  });

  await recordCheck("owner reaches the canonical message and trade-agreement routes", async () => {
    const page = owner.page;
    await page.goto(`/messages/${report.threadId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Private counterparty thread", { exact: true })).toBeVisible();
    await expect(page.getByText("Agreement record exists", { exact: true })).toBeVisible();
    const agreementLink = page.getByRole("link", { name: "Open agreement" });
    await expect(agreementLink).toHaveAttribute("href", `/trade-agreements/${report.agreementId}`);
    await agreementLink.click();
    await page.waitForURL(`/trade-agreements/${report.agreementId}`);
    await expect(page.getByText(/Version \d+ is the only version anyone may confirm/)).toBeVisible();
    await expect(page.getByText(OWNER_ACTION, { exact: true })).toBeVisible();
    await expect(page.getByText(RESPONDER_ACTION, { exact: true })).toBeVisible();
    await assertNoHorizontalOverflow(page, "owner trade agreement");
    await owner.screenshot("canonical-trade-agreement");
    return "The accepted response is linked through /messages to the sole /trade-agreements record.";
  });

  await recordCheck("responder accesses the same canonical thread and agreement", async () => {
    const page = responder.page;
    await page.goto(`/messages/${report.threadId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Agreement record exists", { exact: true })).toBeVisible();
    await page.goto(`/trade-agreements/${report.agreementId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Version \d+ is the only version anyone may confirm/)).toBeVisible();
    await expect(page.getByText(OWNER_ACTION, { exact: true })).toBeVisible();
    await expect(page.getByText(RESPONDER_ACTION, { exact: true })).toBeVisible();
    await assertNoHorizontalOverflow(page, "responder trade agreement");
    return "Both QA participants can access the same frozen core agreement record.";
  });

  await responder.close();
  openSessions.splice(openSessions.indexOf(responder), 1);
  await owner.close();
  openSessions.splice(openSessions.indexOf(owner), 1);

  await recordCheck("application-origin browser diagnostics", async () => {
    classifyDiagnostics();
    return `No unexpected application-origin errors; retained ${report.knownDiagnostics.length} known prefetch/navigation or Stripe test-bypass diagnostics.`;
  });

  report.outcome = "pass";
} catch (error) {
  report.outcome = "fail";
  report.failure = cleanError(error);
  throw error;
} finally {
  for (const session of [...openSessions].reverse()) {
    try {
      await session.close();
    } catch (error) {
      console.error(`Session cleanup failed: ${cleanError(error)}`);
    }
  }
  await browser.close();
  await writeReports();
}
