#!/usr/bin/env node

import { chromium, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OFFER_ID = "10000000-0000-4000-8000-000000000158";
const GUEST_INTEREST_ID = "10000000-0000-4000-8000-000000000171";
const OWNER_EMAIL = "qa-market-owner@example.com";
const RESPONDER_EMAIL = "qa-market-responder@example.com";
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
const qaDatabaseUrl = required("QA_SUPABASE_DB_URL");
const expectedHeadSha = required("EXPECTED_HEAD_SHA");
const guestMessage = required("CLAIMED_GUEST_MESSAGE");
const viewport = {
  width: Number(required("VIEWPORT_WIDTH")),
  height: Number(required("VIEWPORT_HEIGHT")),
};
const artifactDir = path.resolve(required("BROWSER_QA_ARTIFACT_DIR"));
const runTag = String(process.env.GITHUB_RUN_ID || Date.now());
const agreementNote = `[claimed guest ${runTag}] Synthetic QA agreement; no payment, donation, external action, or sensitive evidence.`;

const report = {
  startedAt: new Date().toISOString(),
  outcome: "running",
  expectedHeadSha,
  viewport,
  runTag,
  target: { candidateUrl, offerId: OFFER_ID, guestInterestId: GUEST_INTEREST_ID },
  agreementId: null,
  threadId: null,
  checks: [],
  diagnostics: [],
  knownDiagnostics: [],
  completedAt: null,
};

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

async function makeSession(browser, label) {
  const origin = new URL(candidateUrl).origin;
  const sessionDir = path.join(artifactDir, label);
  await mkdir(sessionDir, { recursive: true });
  const diagnostics = {
    label,
    origin,
    protectedPreview: true,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
  };
  const context = await browser.newContext({
    baseURL: candidateUrl,
    viewport,
    reducedMotion: "reduce",
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": bypassSecret,
    },
    recordVideo: { dir: path.join(sessionDir, "video"), size: viewport },
  });
  await context.addCookies([
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: candidateUrl,
      httpOnly: true,
      sameSite: "Lax",
      secure: true,
    },
  ]);
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
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
      await context.tracing.stop({ path: path.join(sessionDir, "trace.zip") });
      await context.close();
      report.diagnostics.push(diagnostics);
    },
  };
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

function classifyDiagnostics() {
  const unexpected = [];
  const known = [];
  const knownPrefetchPaths = new Set(["/", "/discover", "/feed", "/offers"]);

  for (const item of report.diagnostics) {
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

async function writeReports() {
  report.completedAt = new Date().toISOString();
  await mkdir(artifactDir, { recursive: true });
  await writeFile(path.join(artifactDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  const markdown = [
    "# Marketplace delta claimed-guest browser QA",
    "",
    `- Outcome: **${report.outcome}**`,
    `- Expected head: \`${report.expectedHeadSha}\``,
    `- Viewport: \`${viewport.width} × ${viewport.height}\``,
    `- Candidate: \`${candidateUrl}\``,
    `- Deterministic offer: \`${OFFER_ID}\``,
    `- Claimed guest response: \`${GUEST_INTEREST_ID}\``,
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

const browser = await chromium.launch({ headless: true });
const openSessions = [];

try {
  const owner = await makeSession(browser, "claimed-guest-owner");
  openSessions.push(owner);

  await recordCheck("owner signs into the exact QA deployment", async () => {
    await login(owner.page, OWNER_EMAIL, `/offers/${OFFER_ID}`);
    await expect(owner.page.getByRole("link", { name: /Log out/i })).toBeVisible();
    return "The exact deployment authenticated the QA-only offer owner.";
  });

  await recordCheck("owner sees the linked claimed-guest response", async () => {
    const page = owner.page;
    await page.goto(`/offers/${OFFER_ID}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Responses to this offer" })).toBeVisible();
    const card = page.locator("article").filter({ hasText: "Guest response" }).filter({ hasText: guestMessage }).first();
    await expect(card).toBeVisible();
    await expect(card.getByText("Account linked", { exact: true })).toBeVisible();
    await expect(card.getByText(RESPONDER_EMAIL, { exact: true })).toBeVisible();
    await expect(card.getByRole("button", { name: "Accept linked guest response" })).toBeVisible();
    await assertNoHorizontalOverflow(page, "claimed-guest owner offer page");
    await owner.screenshot("claimed-guest-response-visible");
    return "The owner-visible response card identifies the legacy guest response as account-linked and eligible for formal acceptance.";
  });

  await recordCheck("owner atomically accepts the claimed-guest response", async () => {
    const page = owner.page;
    const card = page.locator("article").filter({ hasText: "Guest response" }).filter({ hasText: guestMessage }).first();
    await card.getByLabel("Agreement notes").fill(agreementNote);
    await card.getByRole("button", { name: "Accept linked guest response" }).click();
    await expect(
      page.getByText("Guest response accepted. The linked account was used to create a formal agreement."),
    ).toBeVisible({ timeout: 30_000 });

    const raw = psqlQuery(`
      select jsonb_build_object(
        'agreementId', a.id,
        'threadId', t.id,
        'lifecycleStatus', a.lifecycle_status,
        'currentVersionId', a.current_version_id,
        'interestId', a.interest_id,
        'guestStatus', gi.status,
        'responderId', a.responder_id,
        'claimedProfileId', gi.claimed_by_profile_id,
        'offerStatus', o.status,
        'workflowStatus', o.workflow_status
      )::text
      from public.agreements a
      join public.trade_threads t on t.agreement_id=a.id and t.offer_id=a.offer_id
      join public.guest_interests gi on gi.id='${GUEST_INTEREST_ID}'::uuid and gi.offer_id=a.offer_id
      join public.offers o on o.id=a.offer_id
      where a.offer_id='${OFFER_ID}'::uuid
      order by a.created_at desc
      limit 1;
    `);
    const state = JSON.parse(raw);
    expect(state.lifecycleStatus).toBe("proposed");
    expect(state.currentVersionId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(state.interestId).toBeNull();
    expect(state.guestStatus).toBe("accepted");
    expect(state.responderId).toBe(state.claimedProfileId);
    expect(state.offerStatus).toBe("matched");
    expect(state.workflowStatus).toBe("closed");
    report.agreementId = state.agreementId;
    report.threadId = state.threadId;
    await owner.screenshot("claimed-guest-acceptance-created-agreement");
    return `Created proposed agreement ${state.agreementId} and linked private thread ${state.threadId} from the claimed guest record.`;
  });

  await recordCheck("owner reaches the canonical thread and agreement", async () => {
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
    await assertNoHorizontalOverflow(page, "claimed-guest owner agreement");
    await owner.screenshot("claimed-guest-canonical-agreement");
    return "The claimed-guest acceptance uses the canonical private thread and sole trade-agreement record.";
  });

  const responder = await makeSession(browser, "claimed-guest-responder");
  openSessions.push(responder);

  await recordCheck("claimed respondent accesses the same canonical records", async () => {
    await login(responder.page, RESPONDER_EMAIL, `/messages/${report.threadId}`);
    await responder.page.goto(`/messages/${report.threadId}`, { waitUntil: "domcontentloaded" });
    await expect(responder.page.getByText("Agreement record exists", { exact: true })).toBeVisible();
    await responder.page.goto(`/trade-agreements/${report.agreementId}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      responder.page.getByText(/Version \d+ is the only version anyone may confirm/),
    ).toBeVisible();
    await expect(responder.page.getByText(OWNER_ACTION, { exact: true })).toBeVisible();
    await expect(responder.page.getByText(RESPONDER_ACTION, { exact: true })).toBeVisible();
    await assertNoHorizontalOverflow(responder.page, "claimed-guest responder agreement");
    await responder.screenshot("claimed-guest-responder-canonical-agreement");
    return "The account that claimed the guest response is the agreement responder and can access the same frozen record.";
  });

  await responder.close();
  openSessions.splice(openSessions.indexOf(responder), 1);
  await owner.close();
  openSessions.splice(openSessions.indexOf(owner), 1);

  await recordCheck("application-origin browser diagnostics", async () => {
    classifyDiagnostics();
    return `No unexpected application-origin errors; retained ${report.knownDiagnostics.length} enumerated prefetch/navigation or Stripe Preview diagnostics.`;
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
