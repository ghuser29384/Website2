import { createHmac } from "node:crypto";
import { mkdir } from "node:fs/promises";

import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const BASE_URL = process.env.MPGF_DAC_PRODUCT_BASE_URL ?? "http://127.0.0.1:3210";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hvmxfjjbdcgjjudmthdz.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_Sai3NlSapbvkmXa3EQrx9A_W9oNEYE8";
const QA_PASSWORD = process.env.MPGF_DAC_PRODUCT_QA_PASSWORD ?? "";

const IDS = {
  openProposal: "ce555555-5555-4555-8555-555555555555",
} as const;

const EMAILS = {
  creator: "dac-product-creator@qa.invalid",
  outsider: "dac-product-outsider@qa.invalid",
  pledger: "dac-product-pledger@qa.invalid",
  reviewer: "dac-product-reviewer@qa.invalid",
} as const;

const ROUTES = {
  open: "/mpgf/campaigns/qa-dac-product-open",
  openPoolAlias: "/mpgf/pools/qa-dac-product-open",
  success: "/mpgf/campaigns/qa-dac-product-succeeded",
  lapse: "/mpgf/campaigns/qa-dac-product-lapsed",
  creator: `/mpgf/pools/proposals/${IDS.openProposal}`,
  reviewer: "/mpgf/admin/dac-lifecycle",
  api: "/api/mpgf/dac/campaigns/qa-dac-product-open",
} as const;

const SCREENSHOT_DIR = "test-results/mpgf-dac-product-lifecycle";

function qaCheckpoint(message: string) {
  console.log(`[mpgf-dac-product-qa] ${message}`);
}

function decodeBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";

  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Unexpected TOTP secret encoding.");
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpCode(secret: string, offset = 0) {
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
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function signIn(email: string) {
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password: QA_PASSWORD });
  if (error || !data.session) {
    throw new Error(`Isolated-QA sign-in failed for ${email}: ${error?.message ?? "no session"}`);
  }
  return { client, session: data.session };
}

async function elevateWithTotp(client: SupabaseClient) {
  const { data: enrollment, error: enrollmentError } = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `mpgf-dac-product-${Date.now()}`,
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
      if (!sessionError && sessionData.session) return sessionData.session;
    }
    lastError = error?.message ?? "missing AAL2 session";
  }

  throw new Error(`TOTP verification failed: ${lastError}`);
}

async function sessionCookies(session: Session) {
  const captured: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }> = [];
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
  if (error) throw error;

  return captured.map(({ name, value }) => ({
    name,
    value,
    url: BASE_URL,
    httpOnly: true,
    secure: BASE_URL.startsWith("https://"),
    sameSite: "Lax" as const,
  }));
}

async function browserContext(
  browser: Browser,
  input: {
    session?: Session;
    viewport: { height: number; width: number };
  },
) {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: input.viewport });
  context.setDefaultTimeout(12_000);
  context.setDefaultNavigationTimeout(25_000);
  const cookies = [
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: BASE_URL,
      httpOnly: true,
      secure: BASE_URL.startsWith("https://"),
      sameSite: "Lax" as const,
    },
  ];
  if (input.session) cookies.push(...(await sessionCookies(input.session)));
  await context.addCookies(cookies);
  return context;
}

async function gotoReady(page: Page, path: string) {
  const response = await page.goto(path);
  await page.waitForLoadState("networkidle");
  return response;
}

function recursivelyCollectKeys(value: unknown, keys = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) recursivelyCollectKeys(item, keys);
    return keys;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      keys.add(key);
      recursivelyCollectKeys(nested, keys);
    }
  }
  return keys;
}

async function screenshot(page: Page, name: string) {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}.png`,
    fullPage: true,
  });
}

async function closeContext(context: BrowserContext | null) {
  if (context) await context.close();
}

test.describe.configure({ mode: "serial" });

test("complete creator, reviewer, public pledge, success, lapse, privacy, and mobile DAC lifecycle", async ({ browser }) => {
  test.skip(!QA_PASSWORD, "MPGF_DAC_PRODUCT_QA_PASSWORD is required.");

  const desktop = { width: 1440, height: 1000 };
  const mobile = { width: 390, height: 844 };
  let context: BrowserContext | null = null;

  qaCheckpoint("Proving the signed-out exact-term campaign and public API privacy boundary.");
  context = await browserContext(browser, { viewport: desktop });
  let page = await context.newPage();
  await gotoReady(page, ROUTES.open);
  await expect(page.getByRole("heading", { name: "QA DAC open for conditional pledges" })).toBeVisible();
  await expect(page.getByText("Dominant assurance contract", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "What happens under these exact DAC terms" })).toBeVisible();
  await expect(page.getByText("sealed until finalization", { exact: true })).toBeVisible();
  await expect(page.getByText(/The approved failure-bonus rate is 10%/)).toBeVisible();
  await expect(page.getByText(/The gross success requirement is \$102\.01\./)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in to bind a pledge to these exact terms." })).toBeVisible();
  await expect(page.getByText("Your private receipts", { exact: true })).toHaveCount(0);
  await screenshot(page, "01-open-anonymous-desktop");

  const aliasPage = await context.newPage();
  await gotoReady(aliasPage, ROUTES.openPoolAlias);
  await expect(aliasPage.getByRole("heading", { name: "QA DAC open for conditional pledges" })).toBeVisible();
  await aliasPage.close();

  const apiResponse = await context.request.get(ROUTES.api);
  expect(apiResponse.status()).toBe(200);
  const api = await apiResponse.json();
  expect(api.schemaVersion).toBe("mpgf_dac_campaign_public_v1");
  expect(api.campaign.publishedTerms.mechanism).toBe("dominant_assurance_contract");
  expect(api.campaign.publishedTerms.threshold.netRecipientAmountCents).toBe(10_000);
  expect(api.campaign.publishedTerms.failureBonus.rateBps).toBe(1_000);
  expect(api.campaign.publishedTerms.successPremium.grossSuccessRequirementCents).toBe(10_201);
  expect(api.campaign.publishedTerms.payment).toEqual({
    pledgeMode: "pledge_only",
    paymentMethodCollected: false,
    authorized: false,
    mandateCreated: false,
    charged: false,
    captured: false,
    settled: false,
    failureBonusPaid: false,
  });
  expect(api.disclosure).toEqual({
    pledgeMode: "pledge_only",
    paymentAuthorized: false,
    paymentMethodCollected: false,
    chargeCreated: false,
    privatePledgeEvidenceIncluded: false,
    progressPolicy: "terminal_aggregate_only",
  });
  const publicKeys = recursivelyCollectKeys(api);
  for (const privateKey of [
    "ownPledges",
    "pledgeId",
    "pledgeIntentId",
    "profileId",
    "consentSha256",
    "idempotencyKey",
    "idempotencyKeyHash",
  ]) {
    expect(publicKeys.has(privateKey), `${privateKey} must not appear in public JSON`).toBe(false);
  }
  await closeContext(context);
  context = null;

  qaCheckpoint("Recording one authenticated conditional pledge and proving its owner-only receipt.");
  const pledger = await signIn(EMAILS.pledger);
  context = await browserContext(browser, { session: pledger.session, viewport: desktop });
  page = await context.newPage();
  await gotoReady(page, ROUTES.open);
  await expect(page.getByRole("heading", { name: "Pledge only if this exact campaign reaches both thresholds." })).toBeVisible();
  await page.getByLabel("Pledge amount (USD)").fill("25.00");
  await page.getByLabel("Visibility").selectOption("public_reason");
  await page.getByLabel(/Supporter reason/).fill(
    "I support the exact synthetic public-good terms used for isolated lifecycle QA.",
  );
  await page.getByLabel(/I accept this exact published version and hash/).check();
  await page.getByRole("button", { name: "Record conditional pledge" }).click();
  await expect(page.getByRole("heading", { name: /^\$25(?:\.00)? conditional pledge recorded$/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("No payment method, authorization, charge, or capture was created by this receipt.")).toBeVisible();
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Your private receipts", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^\$25(?:\.00)? · pledged$/ })).toBeVisible();
  await expect(page.getByText(/^Consent: sha256:[0-9a-f]{64}$/)).toBeVisible();
  await expect(page.getByText("No payment created", { exact: true })).toBeVisible();
  await screenshot(page, "02-open-pledger-private-receipt-desktop");
  await closeContext(context);
  context = null;
  await pledger.client.auth.signOut({ scope: "local" });

  qaCheckpoint("Proving the creator-only proposal receipt and cross-user denial.");
  const creator = await signIn(EMAILS.creator);
  context = await browserContext(browser, { session: creator.session, viewport: desktop });
  page = await context.newPage();
  await gotoReady(page, ROUTES.creator);
  await expect(page.getByText("Creator lifecycle receipt", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "QA DAC open for conditional pledges" })).toBeVisible();
  await expect(page.getByText("Exact terms are locked", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View public campaign" })).toBeVisible();
  await expect(page.getByText("approved as candidate", { exact: true }).first()).toBeVisible();
  await screenshot(page, "03-creator-lifecycle-receipt-desktop");
  await closeContext(context);
  context = null;
  await creator.client.auth.signOut({ scope: "local" });

  const outsider = await signIn(EMAILS.outsider);
  context = await browserContext(browser, { session: outsider.session, viewport: desktop });
  page = await context.newPage();
  const outsiderResponse = await gotoReady(page, ROUTES.creator);
  expect(outsiderResponse?.status()).toBe(404);
  await expect(page.getByText("Creator lifecycle receipt", { exact: true })).toHaveCount(0);
  await closeContext(context);
  context = null;
  await outsider.client.auth.signOut({ scope: "local" });

  qaCheckpoint("Proving the MFA-gated authorized reviewer queue with the pending canonical pledge.");
  const reviewer = await signIn(EMAILS.reviewer);
  const aal2Session = await elevateWithTotp(reviewer.client);
  context = await browserContext(browser, { session: aal2Session, viewport: desktop });
  page = await context.newPage();
  await gotoReady(page, ROUTES.reviewer);
  await expect(page.getByRole("heading", { name: "DAC lifecycle review." })).toBeVisible();
  const reviewerAuthorizationKpi = page.locator(".mpgf-kpi").filter({
    has: page.getByText("Reviewer authorization", { exact: true }),
  });
  await expect(reviewerAuthorizationKpi.getByText("active", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This operator can invoke lifecycle decisions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "QA DAC open for conditional pledges" })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "$25.00 · campaign-ce555555555545558555555555555555",
  })).toBeVisible();
  const pendingPledgeRow = page.locator(".mpgf-dac-review-row").filter({
    has: page.getByRole("heading", {
      name: "$25.00 · campaign-ce555555555545558555555555555555",
    }),
  });
  await expect(pendingPledgeRow.getByRole("button", { name: "Record final eligibility" })).toBeEnabled();
  await screenshot(page, "04-reviewer-workspace-desktop");
  await pendingPledgeRow.getByRole("button", { name: "Record final eligibility" }).click();
  await expect(page.getByText("No canonical DAC pledge is awaiting eligibility review.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("heading", {
    name: "$25.00 · campaign-ce555555555545558555555555555555",
  })).toHaveCount(0);
  await screenshot(page, "05-reviewer-eligibility-recorded-desktop");
  await closeContext(context);
  context = null;
  await reviewer.client.auth.signOut({ scope: "local" });

  qaCheckpoint("Proving immutable successful and lapsed terminal outcomes on desktop and mobile.");
  context = await browserContext(browser, { viewport: desktop });
  page = await context.newPage();
  await gotoReady(page, ROUTES.success);
  await expect(page.getByRole("heading", { name: "QA DAC succeeded" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Campaign succeeded" })).toBeVisible();
  await expect(page.getByText("$110.00", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Both frozen thresholds were met by eligible canonical pledges.")).toBeVisible();
  await expect(page.getByText(/does not claim capture or settlement/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "This campaign is not accepting new pledge intents." })).toBeVisible();
  await screenshot(page, "06-success-desktop");

  await gotoReady(page, ROUTES.lapse);
  await expect(page.getByRole("heading", { name: "QA DAC lapsed" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Campaign lapsed" })).toBeVisible();
  await expect(page.getByText("$10.00", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Still-active signed pledge intents were expired/)).toBeVisible();
  await expect(page.getByText(/no refund or bonus payout is claimed/)).toBeVisible();
  await screenshot(page, "07-lapse-desktop");
  await closeContext(context);
  context = null;

  context = await browserContext(browser, { viewport: mobile });
  page = await context.newPage();
  await gotoReady(page, ROUTES.open);
  await expect(page.getByRole("heading", { name: "QA DAC open for conditional pledges" })).toBeVisible();
  await screenshot(page, "08-open-anonymous-mobile");
  await gotoReady(page, ROUTES.success);
  await expect(page.getByRole("heading", { name: "Campaign succeeded" })).toBeVisible();
  await screenshot(page, "09-success-mobile");
  await gotoReady(page, ROUTES.lapse);
  await expect(page.getByRole("heading", { name: "Campaign lapsed" })).toBeVisible();
  await screenshot(page, "10-lapse-mobile");
  await closeContext(context);

  qaCheckpoint("Complete rendered DAC lifecycle proof passed without payment execution.");
});
