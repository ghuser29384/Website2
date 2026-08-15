import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import {
  FEATURE_HEAD,
  POOLED_TABLES,
  QA_PROJECT_REF,
  REQUIRED_MIGRATIONS,
  SCENARIOS,
  SERVICE_ONLY_RPCS,
  canonicalJson,
  classifyEnvironment,
  createPartnerMetadata,
  databaseUrlTargetsProject,
  emptyScenarioResults,
  redactEvidence,
  sha256,
} from "./pooled-settlement-qa-contract.mjs";

const preflightOnly = process.argv.includes("--preflight-only");
const classification = classifyEnvironment(process.env);
const outputDir = process.env.POOLED_SETTLEMENT_QA_OUTPUT_DIR || "pooled-settlement-qa-evidence";
const baseUrl = process.env.POOLED_SETTLEMENT_QA_BASE_URL || "http://127.0.0.1:3215";
const runId = String(process.env.GITHUB_RUN_ID || `local-${Date.now()}`);
const commitSha = process.env.GITHUB_SHA || FEATURE_HEAD;
const startedAt = new Date().toISOString();

await mkdir(outputDir, { recursive: true });

function artifactPath(name) {
  return path.join(outputDir, name);
}

async function writeJson(name, value) {
  await writeFile(artifactPath(name), `${JSON.stringify(redactEvidence(value), null, 2)}\n`, "utf8");
}

const preflight = {
  schemaVersion: "moral-trade-pooled-settlement-qa-preflight-v1",
  runId,
  commitSha,
  expectedFeatureParent: FEATURE_HEAD,
  checkedAt: new Date().toISOString(),
  ...classification,
  unsafeCredentialDetected: classification.unsafe.length > 0,
  disposition: classification.unsafe.length
    ? "unsafe"
    : classification.authenticatedE2EReady
      ? "ready"
      : "blocked_missing_qa_provider_secrets",
};
await writeJson("preflight.json", preflight);

if (process.env.GITHUB_OUTPUT) {
  await writeFile(
    process.env.GITHUB_OUTPUT,
    [
      `ready=${classification.authenticatedE2EReady}`,
      `unsafe=${classification.unsafe.length > 0}`,
      `core_ready=${classification.coreReady}`,
      `stripe_ready=${classification.stripeReady}`,
      `every_org_ready=${classification.everyOrgReady}`,
      "",
    ].join("\n"),
    { encoding: "utf8", flag: "a" },
  );
}

if (classification.unsafe.length) {
  throw new Error(`Unsafe QA configuration: ${classification.unsafe.join(" ")}`);
}

if (preflightOnly || !classification.authenticatedE2EReady) {
  if (!classification.authenticatedE2EReady) {
    await writeJson("scenario-matrix.json", {
      schemaVersion: "moral-trade-pooled-settlement-qa-matrix-v1",
      runId,
      commitSha,
      environment: "isolated QA",
      status: "blocked",
      scenarios: emptyScenarioResults(),
    });
    console.log("BLOCKED: authenticated pooled-settlement QA requires all six QA-only provider secrets.");
  } else {
    console.log("READY: isolated QA core, Stripe test, and Every.org staging configuration passed classification.");
  }
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.QA_TEST_PASSWORD;
const everyPathSecret = process.env.QA_EVERY_ORG_WEBHOOK_PATH_SECRET;
const everyMetadataSecret = process.env.QA_EVERY_ORG_PARTNER_METADATA_SECRET;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const stripe = new Stripe(process.env.QA_STRIPE_SECRET_KEY, { maxNetworkRetries: 2 });

const createdUserIds = [];
const createdOfferIds = [];
const createdAgreementIds = [];
const createdVersionIds = [];
const createdTermIds = [];
const createdObligationIds = [];
const createdBundleIds = [];
const stripeSessionIds = [];
const stripePaymentIntentIds = [];
const stripeRefundedPaymentIntentIds = new Set();
const audit = [];
const screenshots = [];
const scenarioResults = SCENARIOS.map((scenario) => ({
  ...scenario,
  status: "pending",
  expected: scenario.title,
  actual: "",
  fixtureIds: [],
  eventIds: [],
  transitions: [],
  ledger: null,
  evidence: [],
}));
let initialGateRows = [];
let baselinePoolCounts = null;
let browser;
let databaseContract = null;

function scenario(id) {
  const entry = scenarioResults.find((candidate) => candidate.id === id);
  assert.ok(entry, `Unknown scenario ${id}.`);
  return {
    pass(actual, details = {}) {
      Object.assign(entry, details, { status: "passed", actual });
    },
    fail(actual, details = {}) {
      Object.assign(entry, details, { status: "failed", actual });
    },
  };
}

function record(name, status, details = {}) {
  audit.push({ name, status, at: new Date().toISOString(), ...details });
  console.log(`${status.toUpperCase()}: ${name}`);
}

function unwrap(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

function firstRow(value) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function decodeBase32(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of input.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "")) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error("Invalid base32 TOTP secret.");
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function totp(secret, at = Date.now()) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

async function freshTotp(secret) {
  const second = Math.floor(Date.now() / 1000) % 30;
  if (second >= 26) await new Promise((resolve) => setTimeout(resolve, (31 - second) * 1000));
  return totp(secret);
}

function qaEmail(role) {
  return `pooled-qa-${runId}-${role}@example.test`.toLowerCase();
}

async function createUser(role, displayName) {
  const email = qaEmail(role);
  const result = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, qa_fixture: true, pooled_qa_run_id: runId },
  });
  if (result.error || !result.data.user) throw result.error || new Error(`Could not create ${role}.`);
  const user = { id: result.data.user.id, email, displayName, role, mfa: null };
  createdUserIds.push(user.id);
  unwrap(
    await admin.from("profiles").upsert({
      id: user.id,
      email,
      display_name: displayName,
      bio: `Synthetic pooled-settlement QA profile for run ${runId}.`,
    }),
    `profile ${role}`,
  );
  return user;
}

async function establishAal2(user) {
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  unwrap(await client.auth.signInWithPassword({ email: user.email, password }), `${user.role} sign-in`);
  const enrollment = unwrap(
    await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Pooled settlement QA ${runId}`,
      issuer: "Moral Trade QA",
    }),
    "operator TOTP enrollment",
  );
  const challenge = unwrap(await client.auth.mfa.challenge({ factorId: enrollment.id }), "operator TOTP challenge");
  unwrap(
    await client.auth.mfa.verify({
      factorId: enrollment.id,
      challengeId: challenge.id,
      code: await freshTotp(enrollment.totp.secret),
    }),
    "operator TOTP verification",
  );
  const assurance = unwrap(await client.auth.mfa.getAuthenticatorAssuranceLevel(), "operator AAL check");
  assert.equal(assurance.currentLevel, "aal2");
  user.mfa = { factorId: enrollment.id, secret: enrollment.totp.secret };
  record("Operator established actual TOTP-backed AAL2", "passed", { factorId: enrollment.id });
  return client;
}

async function insertOne(table, values) {
  return unwrap(await admin.from(table).insert(values).select("*").single(), `insert ${table}`);
}

async function loadOne(table, id) {
  return unwrap(await admin.from(table).select("*").eq("id", id).single(), `load ${table} ${id}`);
}

async function createAgreementFixture({ payer, counterparty, amountCents = 250, slug, label }) {
  const offer = await insertOne("offers", {
    owner_id: counterparty.id,
    owner_alias: counterparty.displayName,
    mode: "pledge",
    offered_cause: "Synthetic QA reciprocal action",
    requested_cause: "Synthetic QA pooled donation",
    offer_action: `Synthetic reciprocal action for ${label}`,
    request_action: `Fund the ${label} pooled obligation`,
    compromise_cause: "Not needed",
    offer_impact: 5,
    min_counterparty_impact: 1,
    verification: "Synthetic QA evidence only",
    duration: "One day",
    no_trade_baseline: "No reciprocal action without verified settlement.",
    exit_conditions: "Only before verified funding.",
    maximum_burden: "Synthetic QA only; no production effect.",
    privacy_scope: "Participants and operator only",
    trust_level: 1,
    notes: `pooled-settlement-qa:${runId}:${label}`,
    status: "open",
    workflow_status: "published",
    published_at: new Date().toISOString(),
  });
  createdOfferIds.push(offer.id);

  const agreement = await insertOne("agreements", {
    offer_id: offer.id,
    source: "offer",
    proposer_id: counterparty.id,
    responder_id: payer.id,
    status: "proposed",
    lifecycle_status: "proposed",
    notes: `pooled-settlement-qa:${runId}:${label}`,
    structured_terms: `Synthetic immutable pooled-settlement terms for ${label}.`,
    no_trade_baseline: "No reciprocal action without verified settlement.",
    duration_terms: "One day",
    exit_conditions: "Only before verified funding.",
    evidence_rule: "Provider-confirmed allocation only.",
    privacy_scope: "Participants and operator only",
    disclosure_scope: "Public-safe provider evidence only",
  });
  createdAgreementIds.push(agreement.id);

  const termsHash = sha256(`terms:${runId}:${agreement.id}:1`);
  const version = await insertOne("trade_agreement_versions", {
    agreement_id: agreement.id,
    version: 1,
    proposed_by: counterparty.id,
    proposed_action: `Synthetic reciprocal action for ${label}`,
    requested_action: `Fund the ${label} pooled obligation`,
    duration: "One day",
    evidence_rule: "Provider-confirmed allocation only.",
    exit_conditions: "Only before verified funding.",
    maximum_burden: "Synthetic QA only; no production effect.",
    privacy_scope: "Participants and operator only",
    no_trade_baseline: "No reciprocal action without verified settlement.",
    terms_hash: termsHash,
    requires_milestone_manifest: false,
  });
  createdVersionIds.push(version.id);
  unwrap(
    await admin.from("agreements").update({ current_version_id: version.id }).eq("id", agreement.id),
    `bind agreement version ${agreement.id}`,
  );

  const term = await insertOne("trade_donation_terms", {
    agreement_id: agreement.id,
    agreement_version_id: version.id,
    payer_role: "responder",
    provider: "every_org",
    target_id: `every_org:${slug}`,
    target_name: `QA recipient ${slug}`,
    nonprofit_slug: slug,
    nonprofit_ein: "",
    amount_cents: amountCents,
    currency: "USD",
    frequency: "ONCE",
    connector_terms_hash: sha256(`connector:${runId}:${agreement.id}:${amountCents}:${slug}`),
    source_label: "Synthetic isolated-QA fixture",
    source_url: "https://www.every.org/",
    source_checked_at: new Date().toISOString().slice(0, 10),
    created_by: counterparty.id,
  });
  createdTermIds.push(term.id);

  for (const actor of [counterparty, payer]) {
    unwrap(
      await admin.rpc("confirm_trade_donation_version_v2", {
        p_actor_id: actor.id,
        p_agreement_id: agreement.id,
        p_agreement_version_id: version.id,
      }),
      `confirm ${label} as ${actor.role}`,
    );
  }
  const readyAgreement = await loadOne("agreements", agreement.id);
  assert.equal(readyAgreement.lifecycle_status, "awaiting_donation");
  return { offer, agreement: readyAgreement, version, term, payer, counterparty, label };
}

async function createObligationDirect(fixture) {
  const conditionHash = sha256(
    canonicalJson({
      schemaVersion: "moral-trade-pooled-obligation-condition-v1",
      agreementId: fixture.agreement.id,
      agreementVersionId: fixture.version.id,
      donationTermId: fixture.term.id,
      payerUserId: fixture.payer.id,
      environment: "test",
      provider: "every_org",
      targetId: fixture.term.target_id,
      targetName: fixture.term.target_name,
      nonprofitSlug: fixture.term.nonprofit_slug.toLowerCase(),
      nonprofitEin: "",
      amountCents: fixture.term.amount_cents,
      currency: "USD",
      frequency: "ONCE",
      connectorTermsHash: fixture.term.connector_terms_hash,
    }),
  );
  const result = firstRow(
    unwrap(
      await admin.rpc("create_trade_donation_pool_obligation", {
        p_actor_id: fixture.payer.id,
        p_agreement_id: fixture.agreement.id,
        p_agreement_version_id: fixture.version.id,
        p_environment: "test",
        p_condition_hash: conditionHash,
        p_disclosure_version: "pooled-settlement-participant-disclosures-v1-2026-07-25",
        p_disclosures_accepted: true,
      }),
      `create obligation ${fixture.label}`,
    ),
  );
  assert.ok(result?.id);
  if (!createdObligationIds.includes(result.id)) createdObligationIds.push(result.id);
  return result;
}

async function login(page, user, returnTo) {
  await page.goto(`${baseUrl}/login?method=email&returnTo=${encodeURIComponent(returnTo)}`);
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 }),
    page.getByRole("button", { name: "Log in", exact: true }).click(),
  ]);
}

async function stepUpBrowserMfa(page, operator) {
  await page.goto(`${baseUrl}/dashboard#account-security`);
  const panel = page.locator("article#account-security");
  await panel.waitFor({ state: "visible", timeout: 30_000 });
  const text = await panel.innerText();
  if (/Session level\s*aal2|AAL:\s*aal2/i.test(text)) return;
  const form = panel.locator("form").filter({ has: page.getByRole("button", { name: "Verify session" }) });
  await form.locator('select[name="factor_id"]').selectOption(operator.mfa.factorId);
  await form.locator('input[name="code"]').fill(await freshTotp(operator.mfa.secret));
  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    form.getByRole("button", { name: "Verify session" }).click(),
  ]);
  await page.reload();
  await expectText(page.locator("article#account-security"), /Session level\s*aal2|AAL:\s*aal2/i);
}

async function expectText(locator, pattern) {
  await locator.waitFor({ state: "visible", timeout: 30_000 });
  assert.match(await locator.innerText(), pattern);
}

async function screenshot(page, name) {
  const file = artifactPath(name);
  await page.screenshot({ path: file, fullPage: true });
  screenshots.push(name);
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `Horizontal overflow was ${overflow}px.`);
}

async function inspectParticipantUi(fixture, viewport, suffix) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await login(page, fixture.payer, `/trade-agreements/${fixture.agreement.id}`);
  const stage = page.locator("main");
  await expectText(stage, /The pooled donation is the activation gate/i);
  await expectText(stage, /presumptive provider-facing donor of record/i);
  await assertNoHorizontalOverflow(page);
  await screenshot(page, `participant-${suffix}.png`);
  await context.close();
}

async function startFundingThroughUi(fixture) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await login(page, fixture.payer, `/trade-agreements/${fixture.agreement.id}`);
  await page.locator('input[name="pooled_disclosures"]').check();
  await Promise.all([
    page.waitForURL((url) => url.hostname.endsWith("stripe.com"), { timeout: 45_000 }),
    page.getByRole("button", { name: new RegExp(`Fund \\$${(fixture.term.amount_cents / 100).toFixed(2)} obligation`) }).click(),
  ]);
  const obligation = unwrap(
    await admin.from("trade_donation_pool_obligations").select("*").eq("agreement_id", fixture.agreement.id).single(),
    `load UI obligation ${fixture.label}`,
  );
  assert.equal(obligation.status, "checkout_started");
  assert.ok(obligation.stripe_checkout_session_id?.startsWith("cs_test_"));
  if (!createdObligationIds.includes(obligation.id)) createdObligationIds.push(obligation.id);
  stripeSessionIds.push(obligation.stripe_checkout_session_id);
  await context.close();
  return obligation;
}

function stripeMetadata(fixture, obligation) {
  return {
    purpose: "trade_donation_pool_contribution",
    pooled_obligation_id: obligation.id,
    agreement_id: fixture.agreement.id,
    agreement_version_id: fixture.version.id,
    donation_term_id: fixture.term.id,
    condition_hash: obligation.condition_hash,
    disclosure_version: obligation.disclosure_version,
    environment: "test",
  };
}

function stripeEvent(type, object, id = `evt_qa_${randomUUID().replaceAll("-", "")}`) {
  return {
    id,
    object: "event",
    api_version: "2026-07-29.basil",
    created: Math.floor(Date.now() / 1000),
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
  };
}

async function postStripeEvent(event) {
  const rawBody = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: rawBody,
    secret: process.env.QA_STRIPE_WEBHOOK_SECRET,
  });
  const response = await fetch(`${baseUrl}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body: rawBody,
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body;
}

async function attachActualCheckout(fixture, obligation) {
  const metadata = stripeMetadata(fixture, obligation);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: obligation.amount_cents,
          product_data: { name: `Moral Trade pooled QA ${fixture.label}` },
        },
      },
    ],
    metadata,
    payment_intent_data: { metadata },
    success_url: `${baseUrl}/trade-agreements/${fixture.agreement.id}?message=qa-success`,
    cancel_url: `${baseUrl}/trade-agreements/${fixture.agreement.id}?message=qa-cancel`,
  });
  assert.ok(session.id.startsWith("cs_test_"));
  stripeSessionIds.push(session.id);
  unwrap(
    await admin.rpc("attach_trade_donation_pool_checkout", {
      p_actor_id: fixture.payer.id,
      p_obligation_id: obligation.id,
      p_checkout_session_id: session.id,
    }),
    `attach checkout ${fixture.label}`,
  );
  return { ...obligation, status: "checkout_started", stripe_checkout_session_id: session.id };
}

async function fundWithActualStripeTestObject(fixture, obligation, { eventId } = {}) {
  const metadata = stripeMetadata(fixture, obligation);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: obligation.amount_cents,
    currency: "usd",
    payment_method: "pm_card_visa",
    payment_method_types: ["card"],
    confirm: true,
    metadata,
    description: `Isolated pooled-settlement QA ${runId}; refundable test-mode object`,
  });
  assert.equal(paymentIntent.livemode, false);
  assert.equal(paymentIntent.status, "succeeded");
  stripePaymentIntentIds.push(paymentIntent.id);
  const sessionObject = {
    id: obligation.stripe_checkout_session_id,
    object: "checkout.session",
    amount_total: obligation.amount_cents,
    currency: "usd",
    livemode: false,
    metadata,
    mode: "payment",
    payment_intent: paymentIntent.id,
    payment_status: "paid",
    status: "complete",
  };
  const event = stripeEvent("checkout.session.completed", sessionObject, eventId);
  const response = await postStripeEvent(event);
  return { paymentIntent, event, response };
}

async function buildFundedBundle({ fixtures, concurrent = false }) {
  const obligations = [];
  for (const fixture of fixtures) {
    const created = await createObligationDirect(fixture);
    obligations.push(await attachActualCheckout(fixture, created));
  }
  const fund = (obligation, index) =>
    fundWithActualStripeTestObject(fixtures[index], obligation, {
      eventId: `evt_qa_${runId.replaceAll("-", "")}_${randomUUID().replaceAll("-", "")}`,
    });
  const funded = concurrent
    ? await Promise.all(obligations.map(fund))
    : await obligations.reduce(async (promise, obligation, index) => {
        const values = await promise;
        values.push(await fund(obligation, index));
        return values;
      }, Promise.resolve([]));
  const rows = unwrap(
    await admin.from("trade_donation_pool_obligations").select("*").in("id", obligations.map(({ id }) => id)),
    "load funded obligations",
  );
  const bundleIds = [...new Set(rows.map(({ bundle_id: bundleId }) => bundleId).filter(Boolean))];
  assert.equal(bundleIds.length, 1, "Compatible funding did not produce exactly one bundle.");
  if (!createdBundleIds.includes(bundleIds[0])) createdBundleIds.push(bundleIds[0]);
  const bundle = await loadOne("trade_donation_pool_bundles", bundleIds[0]);
  const items = unwrap(
    await admin.from("trade_donation_pool_bundle_items").select("*").eq("bundle_id", bundle.id).order("position"),
    "load bundle items",
  );
  return { fixtures, obligations: rows, funded, bundle, items };
}

function everyPayload(bundle, overrides = {}) {
  const metadata = createPartnerMetadata({
    bundleId: bundle.id,
    manifestHash: bundle.manifest_hash,
    partnerDonationId: bundle.partner_donation_id,
    metadataSecret: everyMetadataSecret,
  });
  return {
    chargeId: `ch_every_qa_${randomUUID().replaceAll("-", "")}`,
    partnerDonationId: bundle.partner_donation_id,
    partnerMetadata: Buffer.from(JSON.stringify(metadata), "utf8").toString("base64"),
    amount: (bundle.amount_cents / 100).toFixed(2),
    currency: bundle.currency,
    frequency: "one-time",
    toNonprofit: { slug: bundle.nonprofit_slug, ein: bundle.nonprofit_ein },
    donationDate: new Date().toISOString(),
    paymentMethod: "Every.org staging QA fixture; no provider donation submitted",
    ...overrides,
  };
}

async function postEveryPayload(payload) {
  const response = await fetch(`${baseUrl}/api/connectors/every-org/${encodeURIComponent(everyPathSecret)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body;
}

async function startBundleCheckoutDirect(bundle, operator) {
  const partnerDonationId = randomUUID();
  const started = firstRow(
    unwrap(
      await admin.rpc("start_trade_donation_pool_bundle_checkout", {
        p_actor_id: operator.id,
        p_bundle_id: bundle.id,
        p_partner_donation_id: partnerDonationId,
      }),
      `start Every.org checkout ${bundle.id}`,
    ),
  );
  assert.equal(started.status, "checkout_started");
  assert.equal(started.partner_donation_id, partnerDonationId);
  return started;
}

async function ledgerSummary({ obligationIds = [], bundleIds = [] }) {
  let query = admin.from("trade_donation_pool_ledger_journals").select("*");
  const filters = [];
  if (obligationIds.length) filters.push(`obligation_id.in.(${obligationIds.join(",")})`);
  if (bundleIds.length) filters.push(`bundle_id.in.(${bundleIds.join(",")})`);
  assert.ok(filters.length, "A ledger summary requires scoped obligation or bundle IDs.");
  query = query.or(filters.join(","));
  const journals = unwrap(await query, "load ledger journals");
  const lines = journals.length
    ? unwrap(
        await admin.from("trade_donation_pool_ledger_lines").select("*").in("journal_id", journals.map(({ id }) => id)),
        "load ledger lines",
      )
    : [];
  const debits = lines.filter(({ entry_side }) => entry_side === "debit").reduce((sum, row) => sum + row.amount_cents, 0);
  const credits = lines.filter(({ entry_side }) => entry_side === "credit").reduce((sum, row) => sum + row.amount_cents, 0);
  return { journalCount: journals.length, lineCount: lines.length, debits, credits, balanced: debits === credits, journals };
}

async function driftAgreementVersion(fixture) {
  const version = await insertOne("trade_agreement_versions", {
    agreement_id: fixture.agreement.id,
    version: 2,
    proposed_by: fixture.counterparty.id,
    proposed_action: `Drifted synthetic reciprocal action for ${fixture.label}`,
    requested_action: `Drifted funding request for ${fixture.label}`,
    duration: "Two days",
    evidence_rule: "Synthetic drift fixture",
    exit_conditions: "Synthetic drift fixture",
    maximum_burden: "Synthetic QA only",
    privacy_scope: "Participants and operator only",
    no_trade_baseline: "No reciprocal action without exact settlement.",
    terms_hash: sha256(`terms:${runId}:${fixture.agreement.id}:2`),
    requires_milestone_manifest: false,
  });
  createdVersionIds.push(version.id);
  unwrap(
    await admin.from("agreements").update({ current_version_id: version.id }).eq("id", fixture.agreement.id),
    `drift agreement ${fixture.label}`,
  );
  return version;
}

async function inspectFrozenParticipantUi(fixture) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await login(page, fixture.payer, `/trade-agreements/${fixture.agreement.id}`);
  await expectText(page.locator("main"), /immutable provider bundle|frozen bundle/i);
  assert.equal(await page.getByRole("button", { name: "Refund before bundle freeze" }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Cancel before verified funding" }).count(), 0);
  await assertNoHorizontalOverflow(page);
  await screenshot(page, "participant-mobile-frozen.png");
  await context.close();
}

async function openEveryOrgThroughOperatorUi(operator, expectedBundleId) {
  assert.ok(
    String(process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map((value) => value.trim()).includes(operator.email),
    "ADMIN_EMAILS must contain only the deterministic synthetic operator email for this run.",
  );
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await login(page, operator, "/admin/trade-donation-pools");
  await stepUpBrowserMfa(page, operator);
  await page.goto(`${baseUrl}/admin/trade-donation-pools`);
  await expectText(page.locator("main"), /Reconcile exact sub-\$10 obligations/i);
  await assertNoHorizontalOverflow(page);
  await screenshot(page, "operator-desktop-before-handoff.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expectText(page.locator("main"), /One Every\.org payment, exact component allocation/i);
  await assertNoHorizontalOverflow(page);
  await screenshot(page, "operator-mobile-before-handoff.png");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  const card = page.locator("article").filter({ has: page.locator(`input[value="${expectedBundleId}"]`) });
  await Promise.all([
    page.waitForURL((url) => url.hostname === "staging.every.org", { timeout: 45_000 }),
    card.getByRole("button", { name: "Pay consolidated bundle through Every.org" }).click(),
  ]);
  const firstUrl = page.url();
  assert.equal(new URL(firstUrl).hostname, "staging.every.org");
  assert.equal(new URL(firstUrl).searchParams.get("amount"), "10.00");
  const started = await loadOne("trade_donation_pool_bundles", expectedBundleId);
  assert.equal(started.status, "checkout_started");
  assert.ok(started.partner_donation_id);

  await page.goto(`${baseUrl}/admin/trade-donation-pools`);
  const resumedCard = page.locator("article").filter({ has: page.locator(`input[value="${expectedBundleId}"]`) });
  await Promise.all([
    page.waitForURL((url) => url.hostname === "staging.every.org", { timeout: 45_000 }),
    resumedCard.getByRole("button", { name: "Resume Every.org checkout" }).click(),
  ]);
  const resumedUrl = page.url();
  assert.equal(
    new URL(resumedUrl).searchParams.get("partner_donation_id"),
    started.partner_donation_id,
    "Resumed provider handoff changed its immutable identity.",
  );
  await context.close();
  return { bundle: started, firstUrl, resumedUrl };
}

async function requestRefundThroughParticipantUi(fixture, obligation, paymentIntent) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await login(page, fixture.payer, `/trade-agreements/${fixture.agreement.id}`);
  await expectText(page.getByRole("button", { name: "Refund before bundle freeze" }), /Refund before bundle freeze/i);
  await Promise.all([
    page.waitForURL((url) => url.pathname === `/trade-agreements/${fixture.agreement.id}`, { timeout: 45_000 }),
    page.getByRole("button", { name: "Refund before bundle freeze" }).click(),
  ]);
  await context.close();
  const refunds = await stripe.refunds.list({ payment_intent: paymentIntent.id, limit: 5 });
  const refund = refunds.data.find((candidate) => candidate.amount === obligation.amount_cents);
  assert.ok(refund, "Participant refund action did not create an exact Stripe test refund.");
  stripeRefundedPaymentIntentIds.add(paymentIntent.id);
  const event = stripeEvent("charge.refunded", {
    id: typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : `ch_qa_${randomUUID()}`,
    object: "charge",
    amount_refunded: obligation.amount_cents,
    livemode: false,
    payment_intent: paymentIntent.id,
  });
  const response = await postStripeEvent(event);
  return { refund, event, response };
}

async function dynamicPoolCounts() {
  const tables = [
    "trade_donation_pool_obligations",
    "trade_donation_pool_bundles",
    "trade_donation_pool_bundle_items",
    "trade_donation_pool_ledger_journals",
    "trade_donation_pool_ledger_lines",
    "trade_donation_pool_stripe_events",
    "trade_donation_pool_audit_events",
  ];
  const counts = {};
  for (const table of tables) {
    const result = await admin.from(table).select("*", { count: "exact", head: true });
    if (result.error) throw new Error(`${table} count: ${result.error.message}`);
    counts[table] = result.count;
  }
  return counts;
}

function mutableRuntimeCounts(counts) {
  const { trade_donation_pool_audit_events: _persistentAuditHistory, ...runtime } = counts;
  return runtime;
}

function poolCountsEqual(left, right) {
  if (!left || !right) return false;
  const keys = Object.keys(left).sort();
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => right[key] === left[key])
  );
}

function sqlUuidArray(values) {
  for (const value of values) assert.match(value, /^[0-9a-f-]{36}$/i);
  return values.length ? `array[${values.map((value) => `'${value}'::uuid`).join(",")}]` : "array[]::uuid[]";
}

function postgresEnvironment() {
  const databaseUrl = new URL(process.env.QA_SUPABASE_DB_URL);
  assert.ok(
    databaseUrlTargetsProject(process.env.QA_SUPABASE_DB_URL, QA_PROJECT_REF),
    "QA_SUPABASE_DB_URL must target the canonical QA project through its direct host or Supavisor username.",
  );
  return {
    ...process.env,
    PGHOST: databaseUrl.hostname,
    PGPORT: databaseUrl.port || "5432",
    PGUSER: decodeURIComponent(databaseUrl.username),
    PGPASSWORD: decodeURIComponent(databaseUrl.password),
    PGDATABASE: databaseUrl.pathname.replace(/^\//, ""),
    PGSSLMODE: databaseUrl.searchParams.get("sslmode") || "require",
  };
}

function queryPostgres(sql) {
  return execFileSync("psql", ["-X", "--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--field-separator", "\t", "--command", sql], {
    env: postgresEnvironment(),
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  }).trim();
}

function verifyDatabaseContract() {
  const versions = queryPostgres(
    `select version from supabase_migrations.schema_migrations where version = any(array[${REQUIRED_MIGRATIONS.map((value) => `'${value}'`).join(",")}]) order by version;`,
  ).split("\n").filter(Boolean);
  assert.deepEqual(versions, REQUIRED_MIGRATIONS);

  const tables = queryPostgres(`
select c.relname, c.relrowsecurity,
       has_table_privilege('anon', c.oid, 'INSERT'),
       has_table_privilege('anon', c.oid, 'UPDATE'),
       has_table_privilege('anon', c.oid, 'DELETE'),
       has_table_privilege('authenticated', c.oid, 'INSERT'),
       has_table_privilege('authenticated', c.oid, 'UPDATE'),
       has_table_privilege('authenticated', c.oid, 'DELETE')
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = any(array[${POOLED_TABLES.map((value) => `'${value}'`).join(",")}])
order by c.relname;
`).split("\n").filter(Boolean).map((line) => line.split("\t"));
  assert.equal(tables.length, POOLED_TABLES.length);
  assert.ok(tables.every((row) => row[1] === "t" && row.slice(2).every((value) => value === "f")));

  const functions = SERVICE_ONLY_RPCS.map((signature) => {
    const row = queryPostgres(`
select p.prosecdef,
       coalesce(array_to_string(p.proconfig, ','), ''),
       has_function_privilege('anon', p.oid, 'EXECUTE'),
       has_function_privilege('authenticated', p.oid, 'EXECUTE'),
       has_function_privilege('service_role', p.oid, 'EXECUTE')
from pg_proc p where p.oid = to_regprocedure('public.${signature}');
`).split("\t");
    assert.deepEqual(row, ["t", "search_path=pg_catalog", "f", "f", "t"], signature);
    return { signature, securityDefiner: true, searchPath: "pg_catalog", browserExecute: false, serviceRoleExecute: true };
  });
  return { migrations: versions, tables: tables.map(([name]) => name), functions };
}

function runCleanupSql() {
  const obligationIds = sqlUuidArray(createdObligationIds);
  const bundleIds = sqlUuidArray(createdBundleIds);
  const agreementIds = sqlUuidArray(createdAgreementIds);
  const offerIds = sqlUuidArray(createdOfferIds);
  const userIds = sqlUuidArray(createdUserIds);
  const sql = `
begin;
set local session_replication_role = replica;
delete from public.trade_donation_pool_ledger_lines where journal_id in (
  select id from public.trade_donation_pool_ledger_journals
  where obligation_id = any(${obligationIds}) or bundle_id = any(${bundleIds})
);
delete from public.trade_donation_pool_ledger_journals
  where obligation_id = any(${obligationIds}) or bundle_id = any(${bundleIds});
delete from public.trade_donation_pool_stripe_events where obligation_id = any(${obligationIds});
delete from public.trade_donation_pool_audit_events
  where object_id = any(${obligationIds}) or object_id = any(${bundleIds});
delete from public.trade_donation_pool_bundle_items
  where obligation_id = any(${obligationIds}) or bundle_id = any(${bundleIds});
delete from public.trade_donation_pool_obligations where id = any(${obligationIds});
delete from public.trade_donation_pool_bundles where id = any(${bundleIds});
delete from public.trade_messages where thread_id in (
  select id from public.trade_threads where agreement_id = any(${agreementIds})
);
delete from public.trade_notifications where user_id = any(${userIds});
delete from public.trade_evidence_items where agreement_id = any(${agreementIds});
delete from public.trade_agreement_confirmations where agreement_version_id in (
  select id from public.trade_agreement_versions where agreement_id = any(${agreementIds})
);
delete from public.trade_donation_terms where agreement_id = any(${agreementIds});
delete from public.trade_threads where agreement_id = any(${agreementIds});
update public.agreements set current_version_id = null where id = any(${agreementIds});
delete from public.trade_agreement_versions where agreement_id = any(${agreementIds});
delete from public.agreements where id = any(${agreementIds});
delete from public.offers where id = any(${offerIds});
delete from moral_trade_private.person_accounts where profile_id = any(${userIds});
commit;
`;
  execFileSync("psql", ["-X", "--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--quiet", "--command", sql], {
    env: postgresEnvironment(),
    stdio: ["ignore", "ignore", "pipe"],
  });
}

async function cleanupProviderObjects() {
  const failures = [];
  for (const sessionId of [...new Set(stripeSessionIds)]) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.status === "open") await stripe.checkout.sessions.expire(sessionId);
    } catch (error) {
      failures.push({ objectType: "checkout_session", message: error.message });
      record("Stripe Checkout cleanup", "failed", { objectType: "checkout_session", message: error.message });
    }
  }
  for (const paymentIntentId of [...new Set(stripePaymentIntentIds)]) {
    if (stripeRefundedPaymentIntentIds.has(paymentIntentId)) continue;
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status === "succeeded") {
        await stripe.refunds.create(
          { payment_intent: paymentIntentId },
          { idempotencyKey: `pooled-qa-cleanup-${runId}-${paymentIntentId}` },
        );
        stripeRefundedPaymentIntentIds.add(paymentIntentId);
      }
    } catch (error) {
      failures.push({ objectType: "payment_intent", message: error.message });
      record("Stripe PaymentIntent cleanup", "failed", { objectType: "payment_intent", message: error.message });
    }
  }
  if (failures.length) throw new Error(`Stripe test-object cleanup failed for ${failures.length} object(s).`);
}

async function cleanup() {
  if (browser) await browser.close().catch(() => undefined);
  let cleanupFailure = null;
  try {
    await cleanupProviderObjects();
  } catch (error) {
    cleanupFailure = error;
  }
  if (createdAgreementIds.length || createdObligationIds.length || createdUserIds.length) runCleanupSql();
  if (initialGateRows.length) {
    unwrap(
      await admin.from("trade_donation_pool_gate_status").upsert(initialGateRows, { onConflict: "environment,gate_key" }),
      "restore pooled gate status",
    );
  }
  const authFailures = [];
  for (const userId of [...createdUserIds].reverse()) {
    const result = await admin.auth.admin.deleteUser(userId);
    if (result.error) {
      authFailures.push(userId);
      record("Synthetic auth-user cleanup", "failed", { userId, message: result.error.message });
    }
  }
  if (authFailures.length) cleanupFailure ||= new Error(`Synthetic auth-user cleanup failed for ${authFailures.length} user(s).`);
  if (cleanupFailure) throw cleanupFailure;
}

async function createFixtureSet({ payers, counterparties, slug, label, count = 4 }) {
  const fixtures = [];
  for (let index = 0; index < count; index += 1) {
    fixtures.push(
      await createAgreementFixture({
        payer: payers[index % payers.length],
        counterparty: counterparties[index % counterparties.length],
        amountCents: 250,
        slug,
        label: `${label}-${index + 1}`,
      }),
    );
  }
  return fixtures;
}

async function runMismatchScenario({ id, label, payers, counterparties, override }) {
  const fixtures = await createFixtureSet({
    payers,
    counterparties,
    slug: `qa-${label}-${runId}`.slice(0, 80),
    label,
  });
  const group = await buildFundedBundle({ fixtures, concurrent: true });
  const bundle = await startBundleCheckoutDirect(group.bundle, globalThis.__pooledQaOperator);
  const payload = everyPayload(bundle, override(bundle));
  const response = await postEveryPayload(payload);
  assert.equal(response.outcome, "needs_review");
  const agreements = unwrap(
    await admin.from("agreements").select("id,lifecycle_status").in("id", fixtures.map(({ agreement }) => agreement.id)),
    `load ${label} mismatch agreements`,
  );
  assert.ok(agreements.every(({ lifecycle_status: status }) => status === "awaiting_donation"));
  const reviewedBundle = await loadOne("trade_donation_pool_bundles", bundle.id);
  assert.equal(reviewedBundle.status, "needs_review");
  scenario(id).pass(`${label} mismatch entered review and activated zero of four agreements.`, {
    fixtureIds: [bundle.id, ...fixtures.map(({ agreement }) => agreement.id)],
    transitions: ["frozen", "checkout_started", "needs_review"],
    evidence: [{ outcome: response.outcome, failureCode: reviewedBundle.failure_code, activatedAgreementCount: 0 }],
  });
  return { fixtures, group, bundle: reviewedBundle, payload };
}

async function run() {
  assert.ok(supabaseUrl.includes(QA_PROJECT_REF));
  assert.equal(process.env.TRADE_DONATION_POOL_MODE, "test");
  assert.equal(process.env.EVERY_ORG_ENVIRONMENT, "staging");
  assert.notEqual(commitSha, "", "The tested commit SHA must be recorded.");

  const health = await fetch(baseUrl, { redirect: "manual" });
  assert.ok(health.status >= 200 && health.status < 400, `QA app returned ${health.status}.`);
  databaseContract = verifyDatabaseContract();
  record("Canonical QA migrations, RLS, DML denial, and service-only RPC privileges verified", "passed", databaseContract);
  const baselineCounts = await dynamicPoolCounts();
  baselinePoolCounts = baselineCounts;
  const baselineRuntimeCounts = mutableRuntimeCounts(baselineCounts);
  assert.ok(
    Object.values(baselineRuntimeCounts).every((count) => count === 0),
    `QA pooled-settlement mutable runtime tables were not empty: ${JSON.stringify(baselineRuntimeCounts)}`,
  );
  initialGateRows = unwrap(
    await admin.from("trade_donation_pool_gate_status").select("*").eq("environment", "test"),
    "snapshot test gate rows",
  );
  record("Isolated QA baseline contains zero mutable pooled runtime records", "passed", {
    counts: baselineRuntimeCounts,
    persistentAuditEventCount: baselineCounts.trade_donation_pool_audit_events,
  });

  const operator = await createUser("operator", "QA Pooled Settlement Operator");
  const payers = [];
  const counterparties = [];
  for (let index = 0; index < 4; index += 1) {
    payers.push(await createUser(`payer-${index + 1}`, `QA Payer ${index + 1}`));
    counterparties.push(await createUser(`counterparty-${index + 1}`, `QA Counterparty ${index + 1}`));
  }
  await establishAal2(operator);
  globalThis.__pooledQaOperator = operator;
  browser = await chromium.launch({ headless: true });

  const primaryFixtures = await createFixtureSet({
    payers,
    counterparties,
    slug: `qa-primary-${runId}`.slice(0, 80),
    label: "primary",
  });
  await inspectParticipantUi(primaryFixtures[0], { width: 1440, height: 1000 }, "desktop-awaiting-funding");
  await inspectParticipantUi(primaryFixtures[0], { width: 390, height: 844 }, "mobile-awaiting-funding");
  const primaryObligations = [];
  for (const fixture of primaryFixtures) primaryObligations.push(await startFundingThroughUi(fixture));
  const primaryFunding = await Promise.all(
    primaryObligations.map((obligation, index) =>
      fundWithActualStripeTestObject(primaryFixtures[index], obligation, {
        eventId: `evt_qa_primary_${runId.replaceAll("-", "")}_${index + 1}`,
      }),
    ),
  );
  const primaryRows = unwrap(
    await admin.from("trade_donation_pool_obligations").select("*").in("id", primaryObligations.map(({ id }) => id)),
    "load primary obligations",
  );
  const primaryBundleIds = [...new Set(primaryRows.map(({ bundle_id: id }) => id).filter(Boolean))];
  assert.deepEqual(primaryBundleIds.length, 1);
  const primaryBundle = await loadOne("trade_donation_pool_bundles", primaryBundleIds[0]);
  if (!createdBundleIds.includes(primaryBundle.id)) createdBundleIds.push(primaryBundle.id);
  const primaryItems = unwrap(
    await admin.from("trade_donation_pool_bundle_items").select("*").eq("bundle_id", primaryBundle.id).order("position"),
    "load primary bundle items",
  );
  assert.equal(primaryBundle.amount_cents, 1000);
  assert.equal(primaryItems.length, 4);
  assert.equal(primaryItems.reduce((sum, item) => sum + item.allocation_cents, 0), 1000);
  assert.deepEqual(primaryItems.map(({ position }) => position), [1, 2, 3, 4]);
  assert.equal(primaryBundle.manifest.items.length, 4);
  assert.equal(primaryBundle.manifest.aggregateAmountCents, 1000);
  scenario(1).pass("Four independent $2.50 participant obligations produced one $10.00 test bundle.", {
    fixtureIds: [primaryBundle.id, ...primaryObligations.map(({ id }) => id)],
    eventIds: primaryFunding.map(({ event }) => event.id),
    transitions: ["awaiting_funding", "checkout_started", "funded", "bundled"],
  });
  scenario(2).pass("The immutable manifest and bundle-item rows contain four exact 250-cent allocations.", {
    fixtureIds: [primaryBundle.id],
    evidence: [{ manifestHash: primaryBundle.manifest_hash, allocationCents: primaryItems.map((item) => item.allocation_cents) }],
  });
  scenario(16).pass("Four concurrent signed funding handlers serialized into one deterministic bundle.", {
    fixtureIds: [primaryBundle.id],
    eventIds: primaryFunding.map(({ event }) => event.id),
    evidence: [{ distinctBundleCount: primaryBundleIds.length }],
  });

  const duplicateStripeResponse = await postStripeEvent(primaryFunding[0].event);
  assert.equal(duplicateStripeResponse.duplicate, true);
  const duplicateEventRows = unwrap(
    await admin.from("trade_donation_pool_stripe_events").select("stripe_event_id").eq("stripe_event_id", primaryFunding[0].event.id),
    "load duplicate Stripe event",
  );
  assert.equal(duplicateEventRows.length, 1);
  scenario(10).pass("Replaying the same signed Stripe event returned duplicate and preserved one event row.", {
    eventIds: [primaryFunding[0].event.id],
    evidence: [{ storedEventRows: duplicateEventRows.length }],
  });

  await inspectFrozenParticipantUi(primaryFixtures[0]);
  scenario(7).pass("Mobile participant UI exposed neither refund nor cancellation after freeze.", {
    fixtureIds: [primaryBundle.id, primaryFixtures[0].agreement.id],
    evidence: [{ screenshot: "participant-mobile-frozen.png" }],
  });

  const handoff = await openEveryOrgThroughOperatorUi(operator, primaryBundle.id);
  const exactEveryPayload = everyPayload(handoff.bundle);
  const exactCompletion = await postEveryPayload(exactEveryPayload);
  assert.equal(exactCompletion.outcome, "activated");
  assert.equal(exactCompletion.pooledSettlement, true);
  const completedBundle = await loadOne("trade_donation_pool_bundles", primaryBundle.id);
  const activatedAgreements = unwrap(
    await admin.from("agreements").select("id,lifecycle_status,activated_at").in("id", primaryFixtures.map(({ agreement }) => agreement.id)),
    "load activated primary agreements",
  );
  const settledObligations = unwrap(
    await admin.from("trade_donation_pool_obligations").select("id,status").in("id", primaryObligations.map(({ id }) => id)),
    "load settled primary obligations",
  );
  const providerEvidence = unwrap(
    await admin.from("trade_evidence_items").select("id,agreement_id,provider,provider_metadata").in("agreement_id", primaryFixtures.map(({ agreement }) => agreement.id)),
    "load primary provider evidence",
  );
  assert.equal(completedBundle.status, "completed");
  assert.ok(activatedAgreements.every(({ lifecycle_status: status, activated_at: at }) => status === "active" && at));
  assert.ok(settledObligations.every(({ status }) => status === "settled"));
  assert.equal(providerEvidence.length, 4);
  assert.ok(providerEvidence.every(({ provider }) => provider === "every_org"));
  scenario(18).pass("One exact signed staging fixture activated all four components in the completion transaction.", {
    fixtureIds: [primaryBundle.id, ...activatedAgreements.map(({ id }) => id)],
    transitions: ["frozen", "checkout_started", "completed"],
    evidence: [{ activatedAgreementCount: 4, providerEvidenceCount: 4, directEveryOrgDonationSubmitted: false }],
  });

  const duplicateEvery = await postEveryPayload(exactEveryPayload);
  assert.equal(duplicateEvery.outcome, "already_completed");
  const evidenceAfterReplay = unwrap(
    await admin.from("trade_evidence_items").select("id").in("agreement_id", primaryFixtures.map(({ agreement }) => agreement.id)),
    "load replayed provider evidence",
  );
  assert.equal(evidenceAfterReplay.length, 4);
  scenario(11).pass("Replaying the exact Every.org fixture returned already_completed and added no evidence.", {
    fixtureIds: [primaryBundle.id],
    evidence: [{ providerEvidenceRows: evidenceAfterReplay.length }],
  });

  const primaryLedger = await ledgerSummary({
    obligationIds: primaryObligations.map(({ id }) => id),
    bundleIds: [primaryBundle.id],
  });
  assert.equal(primaryLedger.balanced, true);
  assert.equal(primaryLedger.debits, primaryLedger.credits);
  scenario(3).pass("Funding and settlement journals balanced exactly in whole cents.", {
    fixtureIds: [primaryBundle.id],
    ledger: {
      journalCount: primaryLedger.journalCount,
      lineCount: primaryLedger.lineCount,
      debits: primaryLedger.debits,
      credits: primaryLedger.credits,
      balanced: primaryLedger.balanced,
    },
  });

  const disputeEvent = stripeEvent("charge.dispute.created", {
    id: `dp_qa_${randomUUID().replaceAll("-", "")}`,
    object: "dispute",
    amount: 250,
    livemode: false,
    payment_intent: primaryFunding[0].paymentIntent.id,
    reason: "fraudulent",
  });
  const disputeResponse = await postStripeEvent(disputeEvent);
  assert.equal(disputeResponse.pooledSettlement, "needs_review");
  const lossLedger = await ledgerSummary({
    obligationIds: primaryObligations.map(({ id }) => id),
    bundleIds: [primaryBundle.id],
  });
  const lossJournal = lossLedger.journals.find(({ journal_type: type }) => type === "post_settlement_chargeback");
  assert.ok(lossJournal);
  assert.equal(lossLedger.balanced, true);
  scenario(17).pass("A signed post-settlement test dispute moved the bundle to review and posted a balanced loss journal.", {
    fixtureIds: [primaryBundle.id, primaryObligations[0].id],
    eventIds: [disputeEvent.id],
    ledger: { journalType: lossJournal.journal_type, debits: lossLedger.debits, credits: lossLedger.credits, balanced: true },
  });

  const failureFixture = await createAgreementFixture({
    payer: payers[0], counterparty: counterparties[0], slug: `qa-failure-${runId}`, label: "payment-failure",
  });
  let failureObligation = await createObligationDirect(failureFixture);
  failureObligation = await attachActualCheckout(failureFixture, failureObligation);
  const failureEvent = stripeEvent("payment_intent.payment_failed", {
    id: `pi_qa_failed_${randomUUID().replaceAll("-", "")}`,
    object: "payment_intent",
    livemode: false,
    metadata: stripeMetadata(failureFixture, failureObligation),
    last_payment_error: { code: "card_declined", message: "Synthetic Stripe test decline." },
  });
  const failureResponse = await postStripeEvent(failureEvent);
  const failedRow = await loadOne("trade_donation_pool_obligations", failureObligation.id);
  assert.equal(failureResponse.pooledSettlement, "payment_failed");
  assert.equal(failedRow.status, "payment_failed");
  scenario(4).pass("A signed test-mode payment failure remained non-funded and non-activating.", {
    fixtureIds: [failureObligation.id, failureFixture.agreement.id], eventIds: [failureEvent.id],
    transitions: ["checkout_started", "payment_failed"],
  });

  const expiryFixture = await createAgreementFixture({
    payer: payers[1], counterparty: counterparties[1], slug: `qa-expiry-${runId}`, label: "checkout-expiry",
  });
  let expiryObligation = await createObligationDirect(expiryFixture);
  expiryObligation = await attachActualCheckout(expiryFixture, expiryObligation);
  await stripe.checkout.sessions.expire(expiryObligation.stripe_checkout_session_id);
  const expiryEvent = stripeEvent("checkout.session.expired", {
    id: expiryObligation.stripe_checkout_session_id,
    object: "checkout.session",
    livemode: false,
    metadata: stripeMetadata(expiryFixture, expiryObligation),
  });
  const expiryResponse = await postStripeEvent(expiryEvent);
  const expiredRow = await loadOne("trade_donation_pool_obligations", expiryObligation.id);
  assert.equal(expiryResponse.pooledSettlement, "checkout_abandoned");
  assert.equal(expiredRow.status, "checkout_abandoned");
  scenario(5).pass("An actually expired Stripe test Checkout Session remained non-funded.", {
    fixtureIds: [expiryObligation.id], eventIds: [expiryEvent.id],
    transitions: ["checkout_started", "checkout_abandoned"],
  });

  const refundFixture = await createAgreementFixture({
    payer: payers[2], counterparty: counterparties[2], slug: `qa-refund-${runId}`, label: "pre-freeze-refund",
  });
  let refundObligation = await createObligationDirect(refundFixture);
  refundObligation = await attachActualCheckout(refundFixture, refundObligation);
  const refundFunding = await fundWithActualStripeTestObject(refundFixture, refundObligation);
  const refundResult = await requestRefundThroughParticipantUi(refundFixture, refundObligation, refundFunding.paymentIntent);
  const refundedRow = await loadOne("trade_donation_pool_obligations", refundObligation.id);
  const refundLedger = await ledgerSummary({ obligationIds: [refundObligation.id] });
  assert.equal(refundedRow.status, "refunded");
  assert.equal(refundLedger.balanced, true);
  scenario(6).pass("The participant UI created an exact Stripe test refund before freeze and reversed the liability.", {
    fixtureIds: [refundObligation.id], eventIds: [refundFunding.event.id, refundResult.event.id],
    transitions: ["funded", "refund_pending", "refunded"],
    ledger: { debits: refundLedger.debits, credits: refundLedger.credits, balanced: true },
  });

  const driftFixture = await createAgreementFixture({
    payer: payers[3], counterparty: counterparties[3], slug: `qa-drift-${runId}`, label: "pre-bundle-version-drift",
  });
  let driftObligation = await createObligationDirect(driftFixture);
  driftObligation = await attachActualCheckout(driftFixture, driftObligation);
  const driftFunding = await fundWithActualStripeTestObject(driftFixture, driftObligation);
  await driftAgreementVersion(driftFixture);
  const driftedRow = await loadOne("trade_donation_pool_obligations", driftObligation.id);
  assert.equal(driftedRow.status, "needs_review");
  scenario(8).pass("Changing the agreement version after verified funding forced the obligation to review before bundling.", {
    fixtureIds: [driftFixture.agreement.id, driftObligation.id], eventIds: [driftFunding.event.id],
    transitions: ["funded", "needs_review"], evidence: [{ failureCode: driftedRow.failure_code }],
  });

  const staleFixtures = await createFixtureSet({
    payers, counterparties, slug: `qa-stale-${runId}`, label: "stale-component",
  });
  const staleGroup = await buildFundedBundle({ fixtures: staleFixtures, concurrent: true });
  await driftAgreementVersion(staleFixtures[0]);
  const staleBundle = await loadOne("trade_donation_pool_bundles", staleGroup.bundle.id);
  assert.equal(staleBundle.status, "needs_review");
  const staleStart = await admin.rpc("start_trade_donation_pool_bundle_checkout", {
    p_actor_id: operator.id, p_bundle_id: staleBundle.id, p_partner_donation_id: randomUUID(),
  });
  assert.ok(staleStart.error);
  scenario(9).pass("Provider checkout rejected a bundle made stale by exact-version drift.", {
    fixtureIds: [staleBundle.id, staleFixtures[0].agreement.id], transitions: ["frozen", "needs_review"],
    evidence: [{ failureCode: staleBundle.failure_code }],
  });
  scenario(15).pass("The stale component trigger forced the invalid component and bundle into review.", {
    fixtureIds: [staleBundle.id, staleGroup.obligations[0].id], evidence: [{ failureCode: staleBundle.failure_code }],
  });

  const amountMismatch = await runMismatchScenario({
    id: 12, label: "amount", payers, counterparties,
    override: (bundle) => ({ amount: ((bundle.amount_cents + 1) / 100).toFixed(2) }),
  });
  const recipientMismatch = await runMismatchScenario({
    id: 13, label: "recipient", payers, counterparties,
    override: () => ({ toNonprofit: { slug: "wrong-qa-recipient", ein: "" } }),
  });
  const metadataMismatch = await runMismatchScenario({
    id: 14, label: "metadata", payers, counterparties,
    override: () => ({ partnerMetadata: Buffer.from(JSON.stringify({ schema: "tampered" }), "utf8").toString("base64") }),
  });

  const reuseFixtures = await createFixtureSet({
    payers, counterparties, slug: `qa-reuse-${runId}`, label: "provider-charge-reuse",
  });
  const reuseGroup = await buildFundedBundle({ fixtures: reuseFixtures, concurrent: true });
  const reuseBundle = await startBundleCheckoutDirect(reuseGroup.bundle, operator);
  const reusedPayload = everyPayload(reuseBundle, { chargeId: exactEveryPayload.chargeId });
  const reuseResponse = await postEveryPayload(reusedPayload);
  assert.equal(reuseResponse.outcome, "needs_review");
  const reuseAgreements = unwrap(
    await admin.from("agreements").select("lifecycle_status").in("id", reuseFixtures.map(({ agreement }) => agreement.id)),
    "load provider-charge reuse agreements",
  );
  assert.ok(reuseAgreements.every(({ lifecycle_status: status }) => status === "awaiting_donation"));
  const mismatchGroups = [amountMismatch, recipientMismatch, metadataMismatch];
  assert.ok(
    mismatchGroups.flatMap(({ fixtures }) => fixtures).every(Boolean),
    "Mismatch fixture inventory was incomplete.",
  );
  scenario(19).pass("All amount, recipient, metadata, and provider-charge-reuse mismatches activated zero components.", {
    fixtureIds: [amountMismatch.bundle.id, recipientMismatch.bundle.id, metadataMismatch.bundle.id, reuseBundle.id],
    evidence: [{ mismatchBundleCount: 4, activatedAgreementCount: 0, reusedProviderChargeRejected: true }],
  });

  assert.ok(scenarioResults.every(({ status }) => status === "passed"));
  record("All 19 pooled-settlement scenarios passed", "passed", { count: scenarioResults.length });
}

let runError = null;
let cleanupCounts = null;
try {
  await run();
} catch (error) {
  runError = error;
  for (const entry of scenarioResults) {
    if (entry.status === "pending") {
      entry.status = "blocked";
      entry.actual = `Not reached after harness failure: ${error.message}`;
    }
  }
  record("Authenticated pooled-settlement QA run", "failed", { message: error.message });
} finally {
  try {
    await cleanup();
    cleanupCounts = await dynamicPoolCounts();
    assert.ok(
      poolCountsEqual(cleanupCounts, baselinePoolCounts),
      `Post-cleanup pooled counts did not return to the exact baseline: ${JSON.stringify({ baselinePoolCounts, cleanupCounts })}`,
    );
    record("Current-run QA database fixtures removed and exact pooled baseline restored", "passed", {
      baselineCounts: baselinePoolCounts,
      cleanupCounts,
    });
  } catch (cleanupError) {
    runError ||= cleanupError;
    record("Current-run cleanup", "failed", { message: cleanupError.message });
  }
}

const completedAt = new Date().toISOString();
const report = {
  schemaVersion: "moral-trade-pooled-settlement-authenticated-qa-v1",
  runId,
  commitSha,
  expectedFeatureParent: FEATURE_HEAD,
  environment: { supabaseProjectRef: QA_PROJECT_REF, stripeMode: "test", everyOrgMode: "staging" },
  providerBoundary: {
    stripe: "Actual test-mode Checkout Sessions, PaymentIntents, and refunds; locally generated events signed with the QA webhook secret and processed by the application route.",
    everyOrg: "Staging handoff URL inspected; no provider donation submitted. Reconciliation used HMAC-signed staging fixtures through the application route.",
  },
  databaseContract,
  startedAt,
  completedAt,
  status: runError ? "failed" : "passed",
  scenarios: scenarioResults,
  screenshots,
  cleanup: {
    status: poolCountsEqual(cleanupCounts, baselinePoolCounts) ? "passed" : "failed",
    baselineCounts: baselinePoolCounts,
    counts: cleanupCounts,
  },
  audit,
};
await writeJson("scenario-matrix.json", report);
await writeJson("run-summary.json", {
  runId,
  commitSha,
  status: report.status,
  passedScenarios: scenarioResults.filter(({ status }) => status === "passed").length,
  totalScenarios: scenarioResults.length,
  cleanup: report.cleanup,
  providerBoundary: report.providerBoundary,
  evidenceFiles: ["preflight.json", "scenario-matrix.json", "run-summary.json", ...screenshots],
});

if (runError) throw runError;
console.log("PASS: authenticated pooled-settlement QA completed all 19 scenarios and restored the exact QA baseline.");
