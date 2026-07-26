#!/usr/bin/env node

import { chromium, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const REQUIRED_QA_REF = "hvmxfjjbdcgjjudmthdz";
const OWNER_EMAIL = "qa-market-owner@example.com";
const TITLE_PREFIX = "[QA failure bonus ";

function required(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const baseURL = required("BROWSER_QA_BASE_URL").replace(/\/$/, "");
const qaUrl = required("QA_SUPABASE_URL").replace(/\/$/, "");
const publishableKey = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
const password = required("QA_TEST_PASSWORD");
const artifactDir = path.resolve(process.env.BROWSER_QA_ARTIFACT_DIR || "failure-bonus-browser-qa-artifacts");
const runTag = String(process.env.GITHUB_RUN_ID || Date.now());
const proposalTitle = `${TITLE_PREFIX}${runTag}] Common reserve pool`;

if (new URL(qaUrl).hostname !== `${REQUIRED_QA_REF}.supabase.co`) {
  throw new Error(`Refusing non-QA Supabase target: ${qaUrl}`);
}
if (new URL(baseURL).hostname !== "127.0.0.1" && new URL(baseURL).hostname !== "localhost") {
  throw new Error(`Refusing non-local browser target: ${baseURL}`);
}
if (password.length < 14) {
  throw new Error("QA_TEST_PASSWORD must contain at least 14 characters.");
}

const admin = createClient(qaUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const audit = {
  startedAt: new Date().toISOString(),
  target: {
    qaProjectRef: REQUIRED_QA_REF,
    baseURL,
    ownerEmail: OWNER_EMAIL,
    proposalTitle,
  },
  checks: [],
  sessions: [],
  database: null,
  cleanup: null,
  outcome: "running",
  completedAt: null,
};

function cleanError(error) {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return raw
    .replaceAll(password, "[REDACTED]")
    .replaceAll(serviceRoleKey, "[REDACTED]")
    .replaceAll(publishableKey, "[REDACTED]");
}

async function recordCheck(name, fn) {
  const startedAt = new Date().toISOString();
  try {
    const detail = (await fn()) ?? "passed";
    audit.checks.push({ name, outcome: "pass", detail, startedAt, completedAt: new Date().toISOString() });
    console.log(`PASS: ${name}`);
    return detail;
  } catch (error) {
    const detail = cleanError(error);
    audit.checks.push({ name, outcome: "fail", detail, startedAt, completedAt: new Date().toISOString() });
    console.error(`FAIL: ${name}: ${detail}`);
    throw error;
  }
}

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 100) break;
  }
  return null;
}

async function deleteSyntheticProposals(ownerId) {
  const { data, error } = await admin
    .from("mpgf_pool_proposals")
    .select("id,title,proposer_id")
    .eq("proposer_id", ownerId);
  if (error) throw error;

  const ids = (data ?? [])
    .filter((row) => String(row.title ?? "").startsWith(TITLE_PREFIX))
    .map((row) => String(row.id));

  if (ids.length) {
    const { error: deleteError } = await admin.from("mpgf_pool_proposals").delete().in("id", ids);
    if (deleteError) throw deleteError;
  }
  return ids;
}

function isApplicationOrigin(url) {
  try {
    return new URL(url).origin === new URL(baseURL).origin;
  } catch {
    return false;
  }
}

async function createSession(browser, { label, viewport }) {
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
    recordVideo: { dir: path.join(sessionDir, "video"), size: viewport },
  });

  await context.addCookies([
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });

  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.pageErrors.push(cleanError(error)));
  page.on("requestfailed", (request) => {
    if (!isApplicationOrigin(request.url())) return;
    const failure = request.failure()?.errorText ?? "unknown request failure";
    if (failure === "net::ERR_ABORTED" || request.resourceType() === "ping") return;
    diagnostics.failedRequests.push({
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      failure,
    });
  });
  page.on("response", (response) => {
    const request = response.request();
    if (
      isApplicationOrigin(response.url()) &&
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
      await page.screenshot({ path: path.join(sessionDir, `${name}.png`), fullPage });
    },
    async close() {
      await context.tracing.stop({ path: path.join(sessionDir, "trace.zip") });
      await context.close();
      audit.sessions.push(diagnostics);
    },
  };
}

async function login(page, returnTo) {
  await page.goto(`/login?method=email&returnTo=${encodeURIComponent(returnTo)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByLabel("Email").fill(OWNER_EMAIL);
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

async function fillProposal(page) {
  await page.getByLabel("Proposal title").fill(proposalTitle);
  await page.getByLabel("Cause area").fill("QA animal welfare coordination");
  await page.getByLabel("Requested maximum funding").fill("20000");
  await page.getByLabel("Minimum viable funding").fill("5000");
  await page.getByLabel("Summary").fill("Synthetic authenticated QA proposal for failure-bonus reserve pricing.");
  await page.getByLabel("Problem statement").fill("Contributors may wait for others unless the conditional funding terms are credible.");
  await page.getByLabel("Proposed intervention").fill("Run a bounded synthetic threshold pool with no live payment or beneficiary.");
  await page.getByLabel("Moral public-good rationale").fill("The test verifies voluntary coordination infrastructure without moving money.");
  await page.getByLabel("Output unit label").fill("verified QA outcome");
  await page.getByLabel("Reference alternative").fill("No synthetic pool");
  await page.getByLabel("Output unit definition").fill("One exact proposal and premium quote persisted under the reviewed policy.");
  await page.getByLabel("Measurement method").fill("Database fields, generated quote, browser receipt, and rollback-safe cleanup.");
  await page.getByLabel("Uncertainty description").fill("No causal impact claim; this is isolated systems QA.");
  await page.getByLabel("Expected effect vs funding").fill("No real funding; verifies exact-cent accounting and disclosures.");
  await page.getByLabel("Timeline").fill("Create, verify, and remove the synthetic proposal during this QA run.");
  await page.getByLabel("Milestones").fill("Proposal saved\nQuote generated\nSynthetic data removed");
  await page.getByLabel("Risks").fill("Accidental persistence outside the isolated QA project");
  await page.getByLabel("Misuse pathways").fill("None; the script refuses non-QA database and non-local application targets.");
  await page.getByLabel("Proposed recipient").fill("Synthetic QA recipient");
  await page.getByLabel("Implementing team").fill("MoralTrade QA automation");
  await page.getByLabel("Destination type").selectOption("external_charity");
  await page.getByLabel("Destination reference").fill(`qa://failure-bonus/${runTag}`);
  await page.getByLabel("Net recipient amount threshold").fill("10000");
  await page.getByLabel("Verified supporter minimum").fill("25");

  const failureBonusToggle = page.getByLabel(
    "Offer a backed failure bonus and price a success premium for the common reserve",
  );
  if (!(await failureBonusToggle.isChecked())) await failureBonusToggle.check();
  await page.getByLabel("Failure bonus rate percent").fill("10");

  await page.getByLabel("Verification method").fill("Exact database and browser evidence from isolated QA.");
  await page.getByLabel("Anti-threat baseline rule").fill("No contributor receives value for creating or threatening the underlying problem.");
  await page.getByLabel("Exit rule").fill("The draft may be removed before review; no live obligation exists.");
  await page.getByLabel("Base match ratio").fill("1");
  await page.getByLabel("QF cap multiple").fill("1.5");
  await page.getByLabel("Payout method").selectOption("external_handoff");
}

await mkdir(artifactDir, { recursive: true });
const owner = await findUserByEmail(OWNER_EMAIL);
if (!owner) throw new Error(`Missing seeded QA account: ${OWNER_EMAIL}`);
await deleteSyntheticProposals(owner.id);

let proposalId = null;
const browser = await chromium.launch();
const sessions = [];

try {
  await recordCheck("desktop authenticated proposal flow", async () => {
    const session = await createSession(browser, {
      label: "desktop-1440x900",
      viewport: { width: 1440, height: 900 },
    });
    sessions.push(session);
    const { page } = session;

    await login(page, "/mpgf/pools/new?template=threshold-coalition");
    await expect(page.getByRole("heading", { name: "Propose a moral public good." })).toBeVisible();
    await expect(
      page.getByText(
        "Template applied. Every term remains editable; opening this form creates no pledge, authorization, allocation, or payout.",
        { exact: true },
      ),
    ).toBeVisible();

    await fillProposal(page);

    await expect(page.getByText("Provisional success premium: 2.01% — $201")).toBeVisible();
    await expect(page.getByText(/Net recipient threshold: \$10,000\. Gross success requirement: \$10,201/)).toBeVisible();
    await expect(page.getByText(/Maximum percentage-bonus exposure at this threshold: \$1,000/)).toBeVisible();
    await expect(page.getByText(/It is not deducted from the recipient threshold/)).toBeVisible();
    await expect(page.getByText(/Future success premiums never count as collateral/)).toBeVisible();

    const save = page.getByRole("button", { name: "Save draft" });
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByText(/Saved draft [0-9a-f-]+ to your MPGF participant state\./)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: proposalTitle })).toBeVisible();
    await expect(page.getByText(/Failure bonus: 10%\. Success premium: 2\.01% \(\$201\), outside the net threshold; gross success requirement \$10,201\./)).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: proposalTitle })).toBeVisible();
    await assertNoHorizontalOverflow(page, "desktop proposal route");
    await session.screenshot("authenticated-saved-proposal");

    const { data: proposal, error: proposalError } = await admin
      .from("mpgf_pool_proposals")
      .select(
        "id,proposer_id,status,public_goods_threshold_amount_cents,public_goods_failure_bonus_enabled,public_goods_failure_bonus_rate_bps,public_goods_success_premium_rate_bps,public_goods_success_premium_cents,public_goods_success_premium_payer,public_goods_success_premium_policy_version,public_goods_success_premium_included_in_net_threshold,public_goods_success_premium_provisional,public_goods_gross_success_requirement_cents,public_goods_success_premium_pricing_json",
      )
      .eq("proposer_id", owner.id)
      .eq("title", proposalTitle)
      .single();
    if (proposalError) throw proposalError;

    proposalId = proposal.id;
    expect(proposal.status).toBe("draft");
    expect(Number(proposal.public_goods_threshold_amount_cents)).toBe(1_000_000);
    expect(proposal.public_goods_failure_bonus_enabled).toBe(true);
    expect(Number(proposal.public_goods_failure_bonus_rate_bps)).toBe(1_000);
    expect(Number(proposal.public_goods_success_premium_rate_bps)).toBe(201);
    expect(Number(proposal.public_goods_success_premium_cents)).toBe(20_100);
    expect(proposal.public_goods_success_premium_payer).toBe("pool_creator_or_sponsor");
    expect(proposal.public_goods_success_premium_policy_version).toBe(
      "mpgf_failure_bonus_success_premium_v0_1",
    );
    expect(proposal.public_goods_success_premium_included_in_net_threshold).toBe(false);
    expect(proposal.public_goods_success_premium_provisional).toBe(true);
    expect(Number(proposal.public_goods_gross_success_requirement_cents)).toBe(1_020_100);
    expect(proposal.public_goods_success_premium_pricing_json).toEqual({
      successProbabilityBps: 7500,
      failureBonusRateBps: 1000,
      expectedEligibleFailureFillBps: 4000,
      expenseLoadBps: 25,
      reserveRiskMarginBps: 42,
    });

    const { data: quote, error: quoteError } = await admin
      .from("mpgf_failure_bonus_premium_quotes")
      .select(
        "pool_proposal_id,threshold_index,premium_rate_bps,success_premium_cents,gross_success_requirement_cents,premium_payer,premium_included_in_net_recipient_threshold,provisional,status,policy_version",
      )
      .eq("pool_proposal_id", proposalId)
      .single();
    if (quoteError) throw quoteError;
    expect(quote.threshold_index).toBe(1);
    expect(Number(quote.premium_rate_bps)).toBe(201);
    expect(Number(quote.success_premium_cents)).toBe(20_100);
    expect(Number(quote.gross_success_requirement_cents)).toBe(1_020_100);
    expect(quote.premium_payer).toBe("pool_creator_or_sponsor");
    expect(quote.premium_included_in_net_recipient_threshold).toBe(false);
    expect(quote.provisional).toBe(true);
    expect(quote.status).toBe("pending_review");
    expect(quote.policy_version).toBe("mpgf_failure_bonus_success_premium_v0_1");

    const { data: reserve, error: reserveError } = await admin
      .from("mpgf_failure_bonus_reserve_public_summary")
      .select("status,posted_cash_balance_cents,open_bonus_exposure_cents,available_backing_cents,posted_entry_count")
      .eq("reserve_key", "moral-trade-common-failure-bonus-usd")
      .single();
    if (reserveError) throw reserveError;
    expect(reserve.status).toBe("simulation_only");
    expect(Number(reserve.posted_cash_balance_cents)).toBe(0);
    expect(Number(reserve.open_bonus_exposure_cents)).toBe(0);
    expect(Number(reserve.available_backing_cents)).toBe(0);
    expect(Number(reserve.posted_entry_count)).toBe(0);

    audit.database = { proposal, quote, reserve };
    return `saved and reloaded ${proposalId}`;
  });

  await recordCheck("mobile authenticated persisted proposal flow", async () => {
    const session = await createSession(browser, {
      label: "mobile-390x844",
      viewport: { width: 390, height: 844 },
    });
    sessions.push(session);
    const { page } = session;

    await login(page, "/mpgf/pools/new?template=threshold-coalition");
    await expect(page.getByRole("heading", { name: proposalTitle })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Failure bonus: 10%\. Success premium: 2\.01% \(\$201\)/)).toBeVisible();
    await assertNoHorizontalOverflow(page, "mobile proposal route");
    await session.screenshot("authenticated-persisted-proposal");
    return "persisted proposal visible in a fresh authenticated mobile session";
  });

  await recordCheck("browser diagnostics are clean", async () => {
    for (const session of sessions) {
      await session.close();
    }
    sessions.length = 0;

    const errors = audit.sessions.flatMap((diagnostics) => [
      ...diagnostics.consoleErrors.map((value) => `${diagnostics.label} console: ${value}`),
      ...diagnostics.pageErrors.map((value) => `${diagnostics.label} page: ${value}`),
      ...diagnostics.failedRequests.map((value) => `${diagnostics.label} request: ${JSON.stringify(value)}`),
      ...diagnostics.badResponses.map((value) => `${diagnostics.label} response: ${JSON.stringify(value)}`),
    ]);
    expect(errors, errors.join("\n")).toEqual([]);
    return "no application-origin console, page, request, or HTTP errors";
  });

  audit.outcome = "pass";
} catch (error) {
  audit.outcome = "fail";
  audit.error = cleanError(error);
  throw error;
} finally {
  for (const session of sessions) {
    await session.close().catch(() => {});
  }
  await browser.close().catch(() => {});

  const removedIds = await deleteSyntheticProposals(owner.id);
  const { count: remainingCount, error: remainingError } = await admin
    .from("mpgf_pool_proposals")
    .select("id", { count: "exact", head: true })
    .eq("proposer_id", owner.id)
    .eq("title", proposalTitle);
  if (remainingError) throw remainingError;

  audit.cleanup = {
    proposalId,
    removedIds,
    remainingSyntheticProposalCount: remainingCount ?? null,
  };
  audit.completedAt = new Date().toISOString();
  await writeFile(path.join(artifactDir, "audit.json"), JSON.stringify(audit, null, 2), "utf8");
}
