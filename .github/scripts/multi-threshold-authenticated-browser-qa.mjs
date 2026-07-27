#!/usr/bin/env node

import { chromium, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const REQUIRED_QA_REF = "hvmxfjjbdcgjjudmthdz";
const OWNER_EMAIL = "qa-market-owner@example.com";
const TITLE_PREFIX = "[QA multi-threshold ";
const EXPECTED_PRODUCT_HEAD = "94d76c8bdc835a1aec7d61663d105e1f193a0b9d";

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
const artifactDir = path.resolve(
  process.env.BROWSER_QA_ARTIFACT_DIR || "multi-threshold-browser-qa-artifacts",
);
const runTag = String(process.env.GITHUB_RUN_ID || Date.now());
const proposalTitle = `${TITLE_PREFIX}${runTag}] Three-tranche reserve pool`;
const destinationRef = `qa://multi-threshold/${runTag}`;
const operatorEmail = `qa-mt-operator-${runTag}@example.test`;
const contributorEmail = `qa-mt-contributor-${runTag}@example.test`;
const approvalRationale = `QA operator approval for all three threshold quotes in workflow ${runTag}.`;
const startedAt = new Date().toISOString();

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
  startedAt,
  productHead: EXPECTED_PRODUCT_HEAD,
  target: {
    qaProjectRef: REQUIRED_QA_REF,
    baseURL,
    ownerEmail: OWNER_EMAIL,
    proposalTitle,
    destinationRef,
    operatorEmail,
    contributorEmail,
  },
  checks: [],
  sessions: [],
  identities: {},
  browserOperations: {},
  database: null,
  approval: null,
  acceptance: null,
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
  const checkStartedAt = new Date().toISOString();
  try {
    const detail = (await fn()) ?? "passed";
    audit.checks.push({
      name,
      outcome: "pass",
      detail,
      startedAt: checkStartedAt,
      completedAt: new Date().toISOString(),
    });
    console.log(`PASS: ${name}`);
    return detail;
  } catch (error) {
    const detail = cleanError(error);
    audit.checks.push({
      name,
      outcome: "fail",
      detail,
      startedAt: checkStartedAt,
      completedAt: new Date().toISOString(),
    });
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

async function createSyntheticIdentity({ email, displayName }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error(`Refusing to reuse synthetic identity from another run: ${email}`);
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { qa_fixture: "multi-threshold-browser-qa", qa_run: runTag },
    user_metadata: { display_name: displayName },
  });
  if (error) throw error;
  if (!data.user) throw new Error(`Supabase did not return the created identity for ${email}.`);

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    email,
    display_name: displayName,
    bio: "Synthetic isolated-QA identity.",
    affiliation: `MoralTrade QA workflow ${runTag}`,
  });
  if (profileError) throw profileError;

  return { id: data.user.id, email, displayName };
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

function textbox(page, name) {
  return page.getByRole("textbox", { name, exact: true });
}

function spinbutton(page, name) {
  return page.getByRole("spinbutton", { name, exact: true });
}

function combobox(page, name) {
  return page.getByRole("combobox", { name, exact: true });
}

function thresholdCards(page) {
  return page.locator(".mpgf-threshold-card");
}

async function fillThresholdCard(page, index, { amount, successProbability, failureFill }) {
  const card = thresholdCards(page).nth(index - 1);
  await card
    .getByRole("textbox", {
      name: `Threshold ${index} cumulative net recipient amount`,
      exact: true,
    })
    .fill(amount);
  await card
    .getByRole("textbox", {
      name: `Threshold ${index} estimated success probability`,
      exact: true,
    })
    .fill(successProbability);
  await card
    .getByRole("textbox", {
      name: `Threshold ${index} expected eligible balance at failure`,
      exact: true,
    })
    .fill(failureFill);
}

async function readStableThresholdIds(page) {
  const cards = thresholdCards(page);
  const count = await cards.count();
  const ids = [];
  for (let index = 0; index < count; index += 1) {
    const text = await cards.nth(index).getByText(/^Stable ID:/).textContent();
    if (!text?.startsWith("Stable ID: ")) throw new Error(`Threshold ${index + 1} stable ID is missing.`);
    ids.push(text.slice("Stable ID: ".length));
  }
  return ids;
}

async function fillProposalAndExerciseEditor(page) {
  await textbox(page, "Proposal title").fill(proposalTitle);
  await textbox(page, "Cause area").fill("QA multi-threshold public-goods coordination");
  await spinbutton(page, "Requested maximum funding").fill("40000");
  await spinbutton(page, "Minimum viable funding").fill("5000");
  await textbox(page, "Summary").fill(
    "Synthetic authenticated QA proposal for a three-tranche failure-bonus schedule.",
  );
  await textbox(page, "Problem statement").fill(
    "Contributors may delay participation unless cumulative thresholds and reserve terms are exact.",
  );
  await textbox(page, "Proposed intervention").fill(
    "Exercise the one-to-ten-threshold editor without moving real money or naming a real beneficiary.",
  );
  await textbox(page, "Moral public-good rationale").fill(
    "The test verifies voluntary coordination infrastructure and tranche pricing under isolated QA.",
  );
  await textbox(page, "Output unit label").fill("verified multi-threshold QA outcome");
  await textbox(page, "Reference alternative").fill("No synthetic schedule");
  await textbox(page, "Output unit definition").fill(
    "One exact three-threshold proposal, quote set, approval, and immutable accepted-pledge latch.",
  );
  await textbox(page, "Measurement method").fill(
    "Rendered controls, persisted database JSON, quote rows, approval RPC, pledge latch, and exact cleanup.",
  );
  await textbox(page, "Uncertainty description").fill(
    "No causal impact claim; this is isolated systems QA.",
  );
  await textbox(page, "Expected effect vs funding").fill(
    "No real funding; verifies exact-cent cumulative accounting and disclosures.",
  );
  await textbox(page, "Timeline").fill(
    "Create, reorder, remove, persist, approve, latch, verify, and remove the synthetic records in this run.",
  );
  await textbox(page, "Milestones").fill(
    "Editor operations completed\nSchedule persisted\nQuotes approved atomically\nImmutability verified\nSynthetic records removed",
  );
  await textbox(page, "Risks").fill("Accidental persistence outside the isolated QA project");
  await textbox(page, "Misuse pathways").fill(
    "None; the script refuses non-QA database and non-local application targets.",
  );
  await textbox(page, "Proposed recipient").fill("Synthetic QA recipient");
  await textbox(page, "Implementing team").fill("MoralTrade QA automation");
  await combobox(page, "Destination type").selectOption("external_charity");
  await textbox(page, "Destination reference").fill(destinationRef);
  await spinbutton(page, "Verified supporter minimum").fill("25");

  const failureBonusToggle = page.getByRole("checkbox", {
    name: "Offer a backed failure bonus and price success premiums for the common reserve",
    exact: true,
  });
  if (!(await failureBonusToggle.isChecked())) await failureBonusToggle.check();

  await textbox(page, "Failure bonus rate percent").fill("10.00");
  await spinbutton(page, "Maximum eligible participants").fill("100");
  await textbox(page, "Maximum failure bonus per participant dollars").fill("50.00");

  const add = page.getByRole("button", { name: "Add cumulative threshold", exact: true });
  await add.click();
  await add.click();
  await add.click();
  await expect(thresholdCards(page)).toHaveCount(4);

  await fillThresholdCard(page, 1, {
    amount: "10000.00",
    successProbability: "75.00",
    failureFill: "40.00",
  });
  await fillThresholdCard(page, 2, {
    amount: "20000.00",
    successProbability: "65.00",
    failureFill: "60.00",
  });
  await fillThresholdCard(page, 3, {
    amount: "25000.00",
    successProbability: "60.00",
    failureFill: "70.00",
  });
  await fillThresholdCard(page, 4, {
    amount: "30000.00",
    successProbability: "55.00",
    failureFill: "90.00",
  });

  const fourIds = await readStableThresholdIds(page);
  await page.getByRole("button", { name: "Remove threshold 3", exact: true }).click();
  await expect(thresholdCards(page)).toHaveCount(3);
  const afterRemovalIds = await readStableThresholdIds(page);
  expect(afterRemovalIds).toEqual([fourIds[0], fourIds[1], fourIds[3]]);

  await page.getByRole("button", { name: "Move threshold 3 up", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Net recipient thresholds must increase strictly.");
  await page.getByRole("button", { name: "Move threshold 2 down", exact: true }).click();
  await expect(page.getByText(/Provisional schedule: 3 thresholds/)).toBeVisible();
  const finalIds = await readStableThresholdIds(page);
  expect(finalIds).toEqual(afterRemovalIds);

  await expect(thresholdCards(page).nth(0)).toContainText("2.01%");
  await expect(thresholdCards(page).nth(1)).toContainText("3.91%");
  await expect(thresholdCards(page).nth(2)).toContainText("8.04%");
  await expect(page.getByText(/final gross requirement \$31,396/)).toBeVisible();
  await expect(page.getByText(/Cumulative success premium: \$1,396/)).toBeVisible();
  await expect(page.getByText(/Cumulative maximum failure-bonus exposure: \$3,000/)).toBeVisible();

  await textbox(page, "Verification method").fill(
    "Exact database schedule, quote, approval, browser, and cleanup evidence from isolated QA.",
  );
  await textbox(page, "Anti-threat baseline rule").fill(
    "No contributor receives value for creating or threatening the underlying problem.",
  );
  await textbox(page, "Exit rule").fill(
    "The synthetic proposal is removed after the QA evidence is preserved; no live obligation exists.",
  );
  await spinbutton(page, "Base match ratio").fill("1");
  await spinbutton(page, "QF cap multiple").fill("1.5");
  await combobox(page, "Payout method").selectOption("external_handoff");

  audit.browserOperations = {
    addedThresholdCount: 3,
    peakThresholdCount: 4,
    removedThresholdStableId: fourIds[2],
    reorderRoundTrip: true,
    finalThresholdIds: finalIds,
  };

  return finalIds;
}

async function fetchProposal(ownerId) {
  const { data, error } = await admin
    .from("mpgf_pool_proposals")
    .select(
      "id,proposer_id,status,first_accepted_pledge_at,public_goods_threshold_amount_cents,public_goods_threshold_supporters,public_goods_failure_bonus_enabled,public_goods_failure_bonus_rate_bps,public_goods_failure_bonus_eligibility_json,public_goods_failure_bonus_max_participants,public_goods_failure_bonus_max_per_participant_cents,public_goods_threshold_schedule_json,public_goods_failure_bonus_schedule_status,public_goods_success_premium_rate_bps,public_goods_success_premium_cents,public_goods_success_premium_payer,public_goods_success_premium_policy_version,public_goods_success_premium_included_in_net_threshold,public_goods_success_premium_provisional,public_goods_gross_success_requirement_cents,public_goods_success_premium_pricing_json",
    )
    .eq("proposer_id", ownerId)
    .eq("title", proposalTitle)
    .single();
  if (error) throw error;
  return data;
}

async function fetchQuotes(proposalId) {
  const { data, error } = await admin
    .from("mpgf_failure_bonus_premium_quotes")
    .select(
      "id,pool_proposal_id,threshold_id,threshold_index,cumulative_net_recipient_threshold_cents,incremental_net_recipient_cents,premium_rate_bps,success_premium_cents,cumulative_success_premium_cents,gross_success_requirement_cents,premium_payer,premium_included_in_net_recipient_threshold,pricing_json,policy_version,provisional,rationale,status,approved_by,approved_at,failure_bonus_rate_bps,incremental_failure_bonus_exposure_cents,maximum_failure_bonus_exposure_cents,eligibility_json,max_participants,max_bonus_per_participant_cents",
    )
    .eq("pool_proposal_id", proposalId)
    .order("threshold_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function assertPendingSchedule(proposal, quotes, stableIds) {
  expect(proposal.status).toBe("submitted");
  expect(proposal.public_goods_failure_bonus_enabled).toBe(true);
  expect(Number(proposal.public_goods_failure_bonus_rate_bps)).toBe(1_000);
  expect(Number(proposal.public_goods_failure_bonus_max_participants)).toBe(100);
  expect(Number(proposal.public_goods_failure_bonus_max_per_participant_cents)).toBe(5_000);
  expect(proposal.public_goods_failure_bonus_schedule_status).toBe("pending_review");
  expect(proposal.public_goods_success_premium_provisional).toBe(true);
  expect(Number(proposal.public_goods_threshold_amount_cents)).toBe(1_000_000);
  expect(Number(proposal.public_goods_success_premium_rate_bps)).toBe(201);
  expect(Number(proposal.public_goods_success_premium_cents)).toBe(20_100);
  expect(Number(proposal.public_goods_gross_success_requirement_cents)).toBe(1_020_100);
  expect(proposal.public_goods_success_premium_payer).toBe("pool_creator_or_sponsor");
  expect(proposal.public_goods_success_premium_included_in_net_threshold).toBe(false);

  const thresholds = proposal.public_goods_threshold_schedule_json?.thresholds;
  expect(Array.isArray(thresholds)).toBe(true);
  expect(thresholds).toHaveLength(3);
  expect(thresholds.map((entry) => entry.thresholdId)).toEqual(stableIds);

  const expected = [
    {
      index: 1,
      cumulative: 1_000_000,
      incremental: 1_000_000,
      rate: 201,
      tranchePremium: 20_100,
      cumulativePremium: 20_100,
      gross: 1_020_100,
      successProbability: 7_500,
      failureFill: 4_000,
      incrementalExposure: 100_000,
      cumulativeExposure: 100_000,
    },
    {
      index: 2,
      cumulative: 2_000_000,
      incremental: 1_000_000,
      rate: 391,
      tranchePremium: 39_100,
      cumulativePremium: 59_200,
      gross: 2_059_200,
      successProbability: 6_500,
      failureFill: 6_000,
      incrementalExposure: 100_000,
      cumulativeExposure: 200_000,
    },
    {
      index: 3,
      cumulative: 3_000_000,
      incremental: 1_000_000,
      rate: 804,
      tranchePremium: 80_400,
      cumulativePremium: 139_600,
      gross: 3_139_600,
      successProbability: 5_500,
      failureFill: 9_000,
      incrementalExposure: 100_000,
      cumulativeExposure: 300_000,
    },
  ];

  expect(quotes).toHaveLength(3);
  for (let index = 0; index < expected.length; index += 1) {
    const scheduleItem = thresholds[index];
    const quote = quotes[index];
    const target = expected[index];
    expect(scheduleItem.thresholdIndex).toBe(target.index);
    expect(scheduleItem.thresholdId).toBe(stableIds[index]);
    expect(scheduleItem.cumulativeNetRecipientThresholdCents).toBe(target.cumulative);
    expect(scheduleItem.incrementalNetRecipientCents).toBe(target.incremental);
    expect(scheduleItem.premiumRateBps).toBe(target.rate);
    expect(scheduleItem.successPremiumCents).toBe(target.tranchePremium);
    expect(scheduleItem.cumulativeSuccessPremiumCents).toBe(target.cumulativePremium);
    expect(scheduleItem.grossSuccessRequirementCents).toBe(target.gross);
    expect(scheduleItem.assumptions.successProbabilityBps).toBe(target.successProbability);
    expect(scheduleItem.assumptions.expectedEligibleFailureFillBps).toBe(target.failureFill);
    expect(scheduleItem.incrementalFailureBonusExposureCents).toBe(target.incrementalExposure);
    expect(scheduleItem.maximumFailureBonusExposureCents).toBe(target.cumulativeExposure);
    expect(scheduleItem.provisional).toBe(true);

    expect(quote.threshold_index).toBe(target.index);
    expect(quote.threshold_id).toBe(stableIds[index]);
    expect(Number(quote.cumulative_net_recipient_threshold_cents)).toBe(target.cumulative);
    expect(Number(quote.incremental_net_recipient_cents)).toBe(target.incremental);
    expect(Number(quote.premium_rate_bps)).toBe(target.rate);
    expect(Number(quote.success_premium_cents)).toBe(target.tranchePremium);
    expect(Number(quote.cumulative_success_premium_cents)).toBe(target.cumulativePremium);
    expect(Number(quote.gross_success_requirement_cents)).toBe(target.gross);
    expect(Number(quote.incremental_failure_bonus_exposure_cents)).toBe(target.incrementalExposure);
    expect(Number(quote.maximum_failure_bonus_exposure_cents)).toBe(target.cumulativeExposure);
    expect(quote.status).toBe("pending_review");
    expect(quote.provisional).toBe(true);
  }
}

async function findExactAuditRows({ ownerId, proposalId }) {
  const result = {
    idempotencyIds: [],
    transitionIds: [],
    operationalEventIds: [],
    adminAuditIds: [],
  };

  const idempotency = await admin
    .from("mpgf_idempotency_keys")
    .select("id,actor_user_id,action,response_reference_json,created_at")
    .eq("actor_user_id", ownerId)
    .gte("created_at", startedAt);
  if (idempotency.error) throw idempotency.error;
  result.idempotencyIds = (idempotency.data ?? [])
    .filter((row) => row.action === "mpgf.pool_proposal.save_submitted")
    .filter((row) => row.response_reference_json?.result?.id === proposalId)
    .map((row) => row.id);

  const transitions = await admin
    .from("mpgf_state_transition_logs")
    .select("id,actor_user_id,object_id,created_at")
    .eq("actor_user_id", ownerId)
    .eq("object_id", proposalId)
    .gte("created_at", startedAt);
  if (transitions.error) throw transitions.error;
  result.transitionIds = (transitions.data ?? []).map((row) => row.id);

  const events = await admin
    .from("mpgf_operational_events")
    .select("id,event_json,created_at")
    .gte("created_at", startedAt);
  if (events.error) throw events.error;
  result.operationalEventIds = (events.data ?? [])
    .filter((row) => row.event_json?.objectId === proposalId)
    .map((row) => row.id);

  const adminAudit = await admin
    .from("mpgf_admin_audit_logs")
    .select("id,target_id,action,created_at")
    .eq("target_id", proposalId)
    .gte("created_at", startedAt);
  if (!adminAudit.error) {
    result.adminAuditIds = (adminAudit.data ?? []).map((row) => row.id);
  }

  return result;
}

await mkdir(artifactDir, { recursive: true });
const owner = await findUserByEmail(OWNER_EMAIL);
if (!owner) throw new Error(`Missing seeded QA account: ${OWNER_EMAIL}`);

const duplicate = await admin
  .from("mpgf_pool_proposals")
  .select("id", { count: "exact", head: true })
  .eq("proposer_id", owner.id)
  .eq("title", proposalTitle);
if (duplicate.error) throw duplicate.error;
if ((duplicate.count ?? 0) !== 0) throw new Error(`Synthetic proposal already exists for run ${runTag}.`);

let proposalId = null;
let pledgeId = null;
let operator = null;
let contributor = null;
const browser = await chromium.launch();
const sessions = [];

try {
  operator = await createSyntheticIdentity({
    email: operatorEmail,
    displayName: `QA multi-threshold operator ${runTag}`,
  });
  contributor = await createSyntheticIdentity({
    email: contributorEmail,
    displayName: `QA multi-threshold contributor ${runTag}`,
  });
  audit.identities = { ownerId: owner.id, operator, contributor };

  await recordCheck("desktop authenticated creator editor flow", async () => {
    const session = await createSession(browser, {
      label: "desktop-1440x900",
      viewport: { width: 1440, height: 900 },
    });
    sessions.push(session);
    const { page } = session;

    await login(page, "/mpgf/pools/new?template=threshold-coalition");
    await expect(page.getByRole("heading", { name: "Propose a moral public good." })).toBeVisible();
    const stableIds = await fillProposalAndExerciseEditor(page);

    const submit = page.getByRole("button", { name: "Submit proposal", exact: true });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByRole("heading", { name: proposalTitle })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/3 cumulative assurance thresholds/)).toBeVisible();
    await expect(page.getByText(/Schedule status: provisional—operator approval required/)).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: proposalTitle })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Threshold 3: \$30,000 net; 8\.04% tranche rate; \$1,396 cumulative premium; \$31,396 gross/)).toBeVisible();
    await assertNoHorizontalOverflow(page, "desktop creator route before approval");
    await session.screenshot("creator-saved-reloaded-pending-schedule");

    const proposal = await fetchProposal(owner.id);
    proposalId = proposal.id;
    const quotes = await fetchQuotes(proposalId);
    assertPendingSchedule(proposal, quotes, stableIds);
    audit.database = { pendingProposal: proposal, pendingQuotes: quotes };
    return `persisted and reloaded proposal ${proposalId} with three exact quote rows`;
  });

  await recordCheck("atomic operator approval", async () => {
    const { data, error } = await admin.rpc("mpgf_approve_failure_bonus_premium_schedule", {
      proposal_id_input: proposalId,
      reviewer_id_input: operator.id,
      rationale_input: approvalRationale,
    });
    if (error) throw error;

    const approvedProposal = await fetchProposal(owner.id);
    const approvedQuotes = await fetchQuotes(proposalId);
    expect(approvedProposal.public_goods_failure_bonus_schedule_status).toBe("approved");
    expect(approvedProposal.public_goods_success_premium_provisional).toBe(false);
    expect(approvedQuotes).toHaveLength(3);
    for (const quote of approvedQuotes) {
      expect(quote.status).toBe("approved");
      expect(quote.provisional).toBe(false);
      expect(quote.approved_by).toBe(operator.id);
      expect(quote.rationale).toBe(approvalRationale);
      expect(quote.approved_at).toBeTruthy();
    }
    for (const threshold of approvedProposal.public_goods_threshold_schedule_json.thresholds) {
      expect(threshold.provisional).toBe(false);
      expect(threshold.rationale).toBe(approvalRationale);
    }

    audit.approval = { rpcResult: data, approvedProposal, approvedQuotes };
    return `approved all ${approvedQuotes.length} threshold quotes atomically`;
  });

  await recordCheck("desktop approved schedule reload", async () => {
    const session = sessions[0];
    const { page } = session;
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: proposalTitle })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Schedule status: approved.", { exact: true })).toBeVisible();
    await assertNoHorizontalOverflow(page, "desktop creator route after approval");
    await session.screenshot("creator-approved-schedule");
    return "approved schedule reloaded in the authenticated desktop creator session";
  });

  await recordCheck("mobile authenticated creator reload", async () => {
    const session = await createSession(browser, {
      label: "mobile-390x844",
      viewport: { width: 390, height: 844 },
    });
    sessions.push(session);
    const { page } = session;

    await login(page, "/mpgf/pools/new?template=threshold-coalition");
    await expect(page.getByRole("heading", { name: proposalTitle })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/3 cumulative assurance thresholds/)).toBeVisible();
    await expect(page.getByText("Schedule status: approved.", { exact: true })).toBeVisible();
    await expect(page.getByText(/Threshold 3: \$30,000 net; 8\.04% tranche rate/)).toBeVisible();
    await assertNoHorizontalOverflow(page, "mobile creator route");
    await session.screenshot("creator-approved-schedule-mobile");
    return "approved three-threshold schedule visible in a fresh authenticated mobile session";
  });

  await recordCheck("accepted pledge latches immutable terms", async () => {
    pledgeId = randomUUID();
    const { error: pledgeError } = await admin.from("mpgf_pledges").insert({
      id: pledgeId,
      pool_proposal_id: proposalId,
      profile_id: contributor.id,
      user_id: contributor.id,
      contributor_label: contributor.displayName,
      amount_cents: 10_000,
      currency: "usd",
      cadence: "one_time",
      status: "pledged",
      pledge_mode: "pledge_only",
      real_money: false,
    });
    if (pledgeError) throw pledgeError;

    const latched = await fetchProposal(owner.id);
    expect(latched.first_accepted_pledge_at).toBeTruthy();

    const mutation = await admin
      .from("mpgf_pool_proposals")
      .update({ public_goods_failure_bonus_max_participants: 101 })
      .eq("id", proposalId);
    expect(mutation.error).toBeTruthy();
    expect(mutation.error?.code).toBe("23514");

    const unchanged = await fetchProposal(owner.id);
    expect(Number(unchanged.public_goods_failure_bonus_max_participants)).toBe(100);
    expect(unchanged.public_goods_threshold_schedule_json).toEqual(
      audit.approval.approvedProposal.public_goods_threshold_schedule_json,
    );

    audit.acceptance = {
      pledgeId,
      contributorId: contributor.id,
      firstAcceptedPledgeAt: latched.first_accepted_pledge_at,
      rejectedMutation: {
        code: mutation.error?.code,
        message: mutation.error?.message,
      },
    };
    return `accepted pledge ${pledgeId} latched the contract and a term mutation was rejected`;
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

  const exactAuditRows = proposalId
    ? await findExactAuditRows({ ownerId: owner.id, proposalId }).catch((error) => ({
        lookupError: cleanError(error),
        idempotencyIds: [],
        transitionIds: [],
        operationalEventIds: [],
        adminAuditIds: [],
      }))
    : null;

  audit.cleanup = {
    proposalId,
    quoteIds: audit.approval?.approvedQuotes?.map((quote) => quote.id) ?? [],
    pledgeId,
    ownerId: owner.id,
    operatorId: operator?.id ?? null,
    contributorId: contributor?.id ?? null,
    exactAuditRows,
    status: "awaiting exact privileged cleanup of approved synthetic records",
  };
  audit.completedAt = new Date().toISOString();
  await writeFile(path.join(artifactDir, "audit.json"), JSON.stringify(audit, null, 2), "utf8");
}
