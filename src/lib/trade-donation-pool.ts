import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getStripe, getStripePlatformAccountId, getStripeWebhookSecret, hasStripeEnv } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getTradeDonationProviderConfig,
  normalizeEin,
  parseEveryOrgAmountToCents,
  type EveryOrgPartnerWebhookPayload,
  type TradeDonationTermRow,
} from "@/lib/trade-donation";

export const EVERY_ORG_DIRECT_MINIMUM_CENTS = 1_000;
export const TRADE_DONATION_POOL_DISCLOSURE_VERSION =
  "pooled-settlement-participant-disclosures-v1-2026-07-25";
export const TRADE_DONATION_POOL_METADATA_SCHEMA =
  "moral-trade-pooled-settlement-v1" as const;
export const TRADE_DONATION_POOL_MANIFEST_SCHEMA =
  "moral-trade-pooled-settlement-manifest-v1" as const;

export type TradeDonationPoolMode = "disabled" | "test" | "live";
export type TradeDonationPoolEnvironment = Exclude<TradeDonationPoolMode, "disabled">;

export interface TradeDonationPoolConfig {
  requestedEnabled: boolean;
  mode: TradeDonationPoolMode;
  environment: TradeDonationPoolEnvironment | null;
  livemode: boolean;
  readyForParticipantFunding: boolean;
  readyForProviderCheckout: boolean;
  blockers: string[];
}

export interface TradeDonationPoolOperationalReadiness {
  config: TradeDonationPoolConfig;
  gates: TradeDonationPoolGateRow[];
  stripeAccount: {
    reachable: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  };
}

export interface TradeDonationPoolGateRow {
  environment: TradeDonationPoolEnvironment;
  gate_key: string;
  status: "passed" | "pending" | "blocked";
  notes: string;
  approved_by: string | null;
  approved_at: string | null;
  updated_at: string;
}

export interface TradeDonationPoolObligationRow {
  id: string;
  donation_term_id: string;
  agreement_id: string;
  agreement_version_id: string;
  payer_user_id: string;
  environment: TradeDonationPoolEnvironment;
  provider: "every_org";
  target_id: string;
  target_name: string;
  nonprofit_slug: string;
  nonprofit_ein: string;
  amount_cents: number;
  currency: "USD";
  frequency: "ONCE";
  condition_hash: string;
  status:
    | "awaiting_funding"
    | "checkout_started"
    | "checkout_abandoned"
    | "payment_failed"
    | "funded"
    | "bundled"
    | "settled"
    | "refund_pending"
    | "refunded"
    | "needs_review"
    | "disputed"
    | "cancelled";
  stripe_livemode: boolean;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id_hash: string;
  stripe_payload_hash: string;
  bundle_id: string | null;
  disclosure_version: string;
  disclosures_accepted_at: string;
  checkout_started_at: string | null;
  funded_at: string | null;
  refund_requested_at: string | null;
  refunded_at: string | null;
  settled_at: string | null;
  failure_code: string;
  failure_message: string;
  created_at: string;
  updated_at: string;
}

export interface TradeDonationPoolBundleRow {
  id: string;
  environment: TradeDonationPoolEnvironment;
  provider: "every_org";
  target_id: string;
  target_name: string;
  nonprofit_slug: string;
  nonprofit_ein: string;
  amount_cents: number;
  currency: "USD";
  frequency: "ONCE";
  manifest: TradeDonationPoolManifest;
  manifest_hash: string;
  partner_donation_id: string | null;
  status: "frozen" | "checkout_started" | "completed" | "needs_review" | "cancelled";
  provider_charge_id_hash: string;
  provider_payload_hash: string;
  provider_amount_cents: number | null;
  provider_currency: string;
  provider_nonprofit_slug: string;
  provider_nonprofit_ein: string;
  provider_donation_date: string | null;
  provider_payment_method: string;
  failure_code: string;
  failure_message: string;
  frozen_at: string;
  checkout_started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeDonationPoolBundleItemRow {
  bundle_id: string;
  obligation_id: string;
  agreement_id: string;
  agreement_version_id: string;
  donation_term_id: string;
  payer_user_id: string;
  allocation_cents: number;
  position: number;
  created_at: string;
}

export interface TradeDonationPoolManifestItem {
  position: number;
  obligationId: string;
  agreementId: string;
  agreementVersionId: string;
  donationTermId: string;
  payerUserId: string;
  allocationCents: number;
  conditionHash: string;
}

export interface TradeDonationPoolManifest {
  schemaVersion: typeof TRADE_DONATION_POOL_MANIFEST_SCHEMA;
  bundleId: string;
  environment: TradeDonationPoolEnvironment;
  provider: "every_org";
  recipientSlug: string;
  recipientEin: string;
  currency: "USD";
  frequency: "ONCE";
  aggregateAmountCents: number;
  items: TradeDonationPoolManifestItem[];
}

export interface TradeDonationPoolPartnerMetadata {
  schema: typeof TRADE_DONATION_POOL_METADATA_SCHEMA;
  bundleId: string;
  manifestHash: string;
  partnerDonationId: string;
  signature: string;
}

export interface EvaluatedEveryOrgPoolWebhook {
  valid: boolean;
  failureCode: string;
  failureMessage: string;
  manifestHash: string;
  chargeIdHash: string;
  payloadHash: string;
  amountCents: number | null;
  currency: string;
  nonprofitSlug: string;
  nonprofitEin: string;
  donationDate: string | null;
  paymentMethod: string;
}

export interface TradeDonationPoolAgreementContext {
  config: TradeDonationPoolConfig;
  obligation: TradeDonationPoolObligationRow | null;
  bundle: TradeDonationPoolBundleRow | null;
  bundleItem: TradeDonationPoolBundleItemRow | null;
  eligibleFundedTotalCents: number;
  remainingToThresholdCents: number;
}

export interface TradeDonationPoolAdminSnapshot {
  config: TradeDonationPoolConfig;
  gates: TradeDonationPoolGateRow[];
  obligations: TradeDonationPoolObligationRow[];
  bundles: Array<
    TradeDonationPoolBundleRow & {
      item_count: number;
      allocation_total_cents: number;
    }
  >;
  stripeAccount: {
    reachable: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  };
}

function envText(name: string) {
  return String(process.env[name] ?? "").trim();
}

function isCanonicalProduction() {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  try {
    return /(^|\.)moraltrade\.org$/i.test(new URL(envText("NEXT_PUBLIC_SITE_URL")).hostname);
  } catch {
    return false;
  }
}

export function getTradeDonationPoolConfig(): TradeDonationPoolConfig {
  const requestedEnabled = envText("TRADE_DONATION_POOL_ENABLED").toLowerCase() === "true";
  const configuredMode = envText("TRADE_DONATION_POOL_MODE").toLowerCase();
  const mode: TradeDonationPoolMode =
    configuredMode === "test" || configuredMode === "live" ? configuredMode : "disabled";
  const environment = mode === "disabled" ? null : mode;
  const livemode = mode === "live";
  const production = isCanonicalProduction();
  const stripeSecretKey = envText("STRIPE_SECRET_KEY");
  const everyOrg = getTradeDonationProviderConfig();
  const blockers: string[] = [];

  if (!requestedEnabled) blockers.push("Cross-user pooled settlement is disabled.");
  if (mode === "disabled") blockers.push("TRADE_DONATION_POOL_MODE is disabled.");
  if (mode === "test" && production) {
    blockers.push("Stripe test funding and Every.org staging settlement are blocked on production.");
  }
  if (mode === "live" && !production) {
    blockers.push("Live pooled settlement is restricted to the canonical production deployment.");
  }
  if (!hasStripeEnv()) blockers.push("STRIPE_SECRET_KEY is missing.");
  if (!getStripeWebhookSecret()) blockers.push("STRIPE_WEBHOOK_SECRET is missing.");
  if (mode === "test" && !stripeSecretKey.startsWith("sk_test_")) {
    blockers.push("Pooled-settlement test mode requires a Stripe test secret key.");
  }
  if (mode === "live" && !stripeSecretKey.startsWith("sk_live_")) {
    blockers.push("Pooled-settlement live mode requires a Stripe live secret key.");
  }
  if (!everyOrg.ready) {
    blockers.push(everyOrg.blockers[0] ?? "The Every.org connector is not ready.");
  }
  if (mode === "test" && everyOrg.environment !== "staging") {
    blockers.push("Pooled-settlement test mode requires Every.org staging.");
  }
  if (mode === "live" && everyOrg.environment !== "live") {
    blockers.push("Pooled-settlement live mode requires Every.org live mode.");
  }

  const readyForParticipantFunding = requestedEnabled && mode !== "disabled" && blockers.length === 0;
  return {
    requestedEnabled,
    mode,
    environment,
    livemode,
    readyForParticipantFunding,
    readyForProviderCheckout: readyForParticipantFunding,
    blockers: [...new Set(blockers)],
  };
}

function normalizedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizedJson);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, normalizedJson(record[key])]),
    );
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  throw new Error(`Unsupported canonical JSON value: ${typeof value}`);
}

export function canonicalPoolJson(value: unknown) {
  return JSON.stringify(normalizedJson(value));
}

export function hashPoolValue(value: unknown) {
  return createHash("sha256").update(canonicalPoolJson(value)).digest("hex");
}

export function hashStripeProviderObjectId(prefix: string, value: string) {
  return createHash("sha256").update(`${prefix}:${value}`).digest("hex");
}

export function buildTradeDonationPoolConditionSnapshot(input: {
  agreementId: string;
  agreementVersionId: string;
  donationTermId: string;
  payerUserId: string;
  environment: TradeDonationPoolEnvironment;
  term: Pick<
    TradeDonationTermRow,
    | "target_id"
    | "target_name"
    | "nonprofit_slug"
    | "nonprofit_ein"
    | "amount_cents"
    | "currency"
    | "frequency"
    | "connector_terms_hash"
  >;
}) {
  return {
    schemaVersion: "moral-trade-pooled-obligation-condition-v1",
    agreementId: input.agreementId,
    agreementVersionId: input.agreementVersionId,
    donationTermId: input.donationTermId,
    payerUserId: input.payerUserId,
    environment: input.environment,
    provider: "every_org",
    targetId: input.term.target_id,
    targetName: input.term.target_name,
    nonprofitSlug: input.term.nonprofit_slug.toLowerCase(),
    nonprofitEin: normalizeEin(input.term.nonprofit_ein),
    amountCents: input.term.amount_cents,
    currency: input.term.currency,
    frequency: input.term.frequency,
    connectorTermsHash: input.term.connector_terms_hash,
  } as const;
}

export function buildTradeDonationPoolConditionHash(
  input: Parameters<typeof buildTradeDonationPoolConditionSnapshot>[0],
) {
  return hashPoolValue(buildTradeDonationPoolConditionSnapshot(input));
}

export function bundleCompatibleKey(input: {
  environment: TradeDonationPoolEnvironment;
  nonprofitSlug: string;
  nonprofitEin?: string | null;
  currency: string;
  frequency: string;
}) {
  return [
    input.environment,
    input.nonprofitSlug.trim().toLowerCase(),
    normalizeEin(input.nonprofitEin),
    input.currency.trim().toUpperCase(),
    input.frequency.trim().toUpperCase(),
  ].join("|");
}

export function selectMinimalThresholdBundle<T extends { amountCents: number }>(
  obligations: readonly T[],
  thresholdCents = EVERY_ORG_DIRECT_MINIMUM_CENTS,
) {
  const selected: T[] = [];
  let totalCents = 0;
  for (const obligation of obligations) {
    if (!Number.isInteger(obligation.amountCents) || obligation.amountCents <= 0) {
      throw new Error("Bundle obligations must use positive whole minor units.");
    }
    if (totalCents >= thresholdCents) break;
    selected.push(obligation);
    totalCents += obligation.amountCents;
  }
  return {
    selected,
    totalCents,
    thresholdReached: totalCents >= thresholdCents,
  };
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function pooledMetadataSigningInput(
  metadata: Omit<TradeDonationPoolPartnerMetadata, "signature">,
) {
  return [
    metadata.schema,
    metadata.bundleId,
    metadata.manifestHash,
    metadata.partnerDonationId,
  ].join("\u241f");
}

export function createTradeDonationPoolPartnerMetadata(input: {
  bundleId: string;
  manifestHash: string;
  partnerDonationId: string;
  metadataSecret: string;
}): TradeDonationPoolPartnerMetadata {
  const unsigned = {
    schema: TRADE_DONATION_POOL_METADATA_SCHEMA,
    bundleId: input.bundleId,
    manifestHash: input.manifestHash,
    partnerDonationId: input.partnerDonationId,
  } satisfies Omit<TradeDonationPoolPartnerMetadata, "signature">;
  return {
    ...unsigned,
    signature: createHmac("sha256", input.metadataSecret)
      .update(pooledMetadataSigningInput(unsigned))
      .digest("hex"),
  };
}

export function decodeEveryOrgPartnerMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string" || !value.trim()) return {};
  const candidates = [value.trim(), value.trim().replace(/-/g, "+").replace(/_/g, "/")];
  for (const candidate of candidates) {
    try {
      const decoded = Buffer.from(candidate, "base64").toString("utf8");
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Try the next representation.
    }
  }
  return {};
}

export function verifyTradeDonationPoolPartnerMetadata(
  value: unknown,
  expected: {
    bundleId: string;
    manifestHash: string;
    partnerDonationId: string;
  },
  metadataSecret: string,
) {
  const record = decodeEveryOrgPartnerMetadata(value);
  const metadata = {
    schema: String(record.schema ?? ""),
    bundleId: String(record.bundleId ?? ""),
    manifestHash: String(record.manifestHash ?? ""),
    partnerDonationId: String(record.partnerDonationId ?? ""),
    signature: String(record.signature ?? ""),
  };
  if (
    metadata.schema !== TRADE_DONATION_POOL_METADATA_SCHEMA ||
    metadata.bundleId !== expected.bundleId ||
    metadata.manifestHash !== expected.manifestHash ||
    metadata.partnerDonationId !== expected.partnerDonationId ||
    !/^[0-9a-f]{64}$/i.test(metadata.signature)
  ) {
    return false;
  }
  const expectedMetadata = createTradeDonationPoolPartnerMetadata({
    ...expected,
    metadataSecret,
  });
  return constantTimeEqual(metadata.signature, expectedMetadata.signature);
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function evaluateEveryOrgTradeDonationPoolWebhook(input: {
  payload: EveryOrgPartnerWebhookPayload;
  rawBody: string;
  bundle: TradeDonationPoolBundleRow;
  metadataSecret: string;
}): EvaluatedEveryOrgPoolWebhook {
  const { payload, rawBody, bundle } = input;
  const chargeId = String(payload.chargeId ?? "").trim();
  const partnerDonationId = String(payload.partnerDonationId ?? "").trim();
  const nonprofit = asObject(payload.toNonprofit);
  const amountCents = parseEveryOrgAmountToCents(payload.amount);
  const currency = String(payload.currency ?? "").trim().toUpperCase();
  const frequency = String(payload.frequency ?? "").trim().toLowerCase();
  const nonprofitSlug = String(nonprofit.slug ?? "").trim().toLowerCase();
  const nonprofitEin = normalizeEin(nonprofit.ein);
  const donationDateValue = String(payload.donationDate ?? "").trim();
  const donationDate =
    donationDateValue && !Number.isNaN(Date.parse(donationDateValue))
      ? new Date(donationDateValue).toISOString()
      : null;
  const paymentMethod = String(payload.paymentMethod ?? "").trim().slice(0, 120);
  const failures: Array<[string, string]> = [];

  if (!chargeId) failures.push(["missing_charge_id", "Every.org did not provide a charge ID."]);
  if (!bundle.partner_donation_id || partnerDonationId !== bundle.partner_donation_id) {
    failures.push(["partner_id_mismatch", "The partner donation ID does not match the frozen bundle."]);
  }
  if (
    !bundle.partner_donation_id ||
    !verifyTradeDonationPoolPartnerMetadata(
      payload.partnerMetadata,
      {
        bundleId: bundle.id,
        manifestHash: bundle.manifest_hash,
        partnerDonationId: bundle.partner_donation_id,
      },
      input.metadataSecret,
    )
  ) {
    failures.push(["metadata_signature_invalid", "Bundle metadata is missing, altered, or unsigned."]);
  }
  if (amountCents !== bundle.amount_cents) {
    failures.push(["amount_mismatch", "The completed donation amount does not match the bundle."]);
  }
  if (currency !== bundle.currency) {
    failures.push(["currency_mismatch", "The donation currency does not match the bundle."]);
  }
  if (frequency !== "one-time") {
    failures.push(["frequency_mismatch", "Only a one-time donation can settle this bundle."]);
  }
  if (nonprofitSlug !== bundle.nonprofit_slug.toLowerCase()) {
    failures.push(["recipient_mismatch", "The completed donation went to another recipient."]);
  }
  if (bundle.nonprofit_ein && nonprofitEin !== normalizeEin(bundle.nonprofit_ein)) {
    failures.push(["ein_mismatch", "The recipient EIN does not match the bundle."]);
  }
  if (!donationDate) failures.push(["donation_date_invalid", "The donation date is invalid."]);

  const firstFailure = failures[0];
  return {
    valid: failures.length === 0,
    failureCode: firstFailure?.[0] ?? "",
    failureMessage: firstFailure?.[1] ?? "",
    manifestHash: bundle.manifest_hash,
    chargeIdHash: chargeId ? createHash("sha256").update(`every_org:${chargeId}`).digest("hex") : "",
    payloadHash: createHash("sha256").update(rawBody).digest("hex"),
    amountCents,
    currency,
    nonprofitSlug,
    nonprofitEin,
    donationDate,
    paymentMethod,
  };
}

export function buildEveryOrgTradeDonationPoolBundleUrl(input: {
  bundle: TradeDonationPoolBundleRow;
  partnerDonationId: string;
  metadataSecret: string;
  webhookToken: string;
  everyOrgEnvironment: "staging" | "live";
  siteUrl?: string;
}) {
  if (input.bundle.amount_cents < EVERY_ORG_DIRECT_MINIMUM_CENTS) {
    throw new Error("Every.org bundle checkout must meet the $10 minimum.");
  }
  const baseHost =
    input.everyOrgEnvironment === "live" ? "https://www.every.org" : "https://staging.every.org";
  const url = new URL(`/${encodeURIComponent(input.bundle.nonprofit_slug)}`, baseHost);
  const siteUrl = input.siteUrl ?? getSiteUrl();
  const returnPath = "/admin/trade-donation-pools";
  const metadata = createTradeDonationPoolPartnerMetadata({
    bundleId: input.bundle.id,
    manifestHash: input.bundle.manifest_hash,
    partnerDonationId: input.partnerDonationId,
    metadataSecret: input.metadataSecret,
  });

  url.searchParams.set("amount", (input.bundle.amount_cents / 100).toFixed(2));
  url.searchParams.set("frequency", "ONCE");
  url.searchParams.set(
    "description",
    "Moral Trade consolidated pooled settlement. Component agreements activate only after exact provider verification.",
  );
  url.searchParams.set(
    "success_url",
    new URL(
      `${returnPath}?message=${encodeURIComponent(
        "Pooled donation submitted. Moral Trade is waiting for the exact Every.org webhook before allocating any component.",
      )}`,
      siteUrl,
    ).toString(),
  );
  url.searchParams.set(
    "exit_url",
    new URL(
      `${returnPath}?message=${encodeURIComponent(
        "Pooled donation checkout was closed. No component agreement was activated.",
      )}`,
      siteUrl,
    ).toString(),
  );
  url.searchParams.set("partner_donation_id", input.partnerDonationId);
  url.searchParams.set(
    "partner_metadata",
    Buffer.from(JSON.stringify(metadata), "utf8").toString("base64"),
  );
  url.searchParams.set("webhook_token", input.webhookToken);
  url.searchParams.set("share_info", "false");
  url.hash = "donate";
  return url.toString();
}

export function isPooledTradeDonationTerm(term: Pick<TradeDonationTermRow, "amount_cents">) {
  return term.amount_cents < EVERY_ORG_DIRECT_MINIMUM_CENTS;
}

export async function loadTradeDonationPoolAgreementContext(
  agreementId: string,
): Promise<TradeDonationPoolAgreementContext> {
  const readiness = await loadTradeDonationPoolOperationalReadiness();
  const config = readiness.config;
  const supabase = createServiceClient() as any;
  const { data: obligationData } = await supabase
    .from("trade_donation_pool_obligations")
    .select("*")
    .eq("agreement_id", agreementId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const obligation = (obligationData ?? null) as TradeDonationPoolObligationRow | null;

  let bundle: TradeDonationPoolBundleRow | null = null;
  let bundleItem: TradeDonationPoolBundleItemRow | null = null;
  if (obligation?.bundle_id) {
    const [bundleResult, itemResult] = await Promise.all([
      supabase.from("trade_donation_pool_bundles").select("*").eq("id", obligation.bundle_id).maybeSingle(),
      supabase
        .from("trade_donation_pool_bundle_items")
        .select("*")
        .eq("bundle_id", obligation.bundle_id)
        .eq("obligation_id", obligation.id)
        .maybeSingle(),
    ]);
    bundle = (bundleResult.data ?? null) as TradeDonationPoolBundleRow | null;
    bundleItem = (itemResult.data ?? null) as TradeDonationPoolBundleItemRow | null;
  }

  let eligibleFundedTotalCents = 0;
  if (obligation) {
    const { data: eligible } = await supabase
      .from("trade_donation_pool_obligations")
      .select("amount_cents")
      .eq("environment", obligation.environment)
      .eq("nonprofit_slug", obligation.nonprofit_slug)
      .eq("nonprofit_ein", obligation.nonprofit_ein)
      .eq("currency", obligation.currency)
      .eq("frequency", obligation.frequency)
      .eq("status", "funded")
      .is("bundle_id", null);
    eligibleFundedTotalCents = (eligible ?? []).reduce(
      (sum: number, row: { amount_cents: number }) => sum + Number(row.amount_cents ?? 0),
      0,
    );
  }

  return {
    config,
    obligation,
    bundle,
    bundleItem,
    eligibleFundedTotalCents,
    remainingToThresholdCents: Math.max(
      0,
      EVERY_ORG_DIRECT_MINIMUM_CENTS - eligibleFundedTotalCents,
    ),
  };
}

export async function loadTradeDonationPoolOperationalReadiness(): Promise<TradeDonationPoolOperationalReadiness> {
  const baseConfig = getTradeDonationPoolConfig();
  const supabase = createServiceClient() as any;
  const environment = baseConfig.environment ?? "test";
  const { data: gateData } = await supabase
    .from("trade_donation_pool_gate_status")
    .select("*")
    .eq("environment", environment)
    .order("gate_key", { ascending: true });
  const gates = (gateData ?? []) as TradeDonationPoolGateRow[];
  const stripeAccount = {
    reachable: false,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
  };
  if (hasStripeEnv()) {
    try {
      const account = await getStripe().accounts.retrieve(getStripePlatformAccountId());
      stripeAccount.reachable = true;
      stripeAccount.chargesEnabled = account.charges_enabled === true;
      stripeAccount.payoutsEnabled = account.payouts_enabled === true;
      stripeAccount.detailsSubmitted = account.details_submitted === true;
    } catch {
      // Readiness remains fail-closed.
    }
  }

  const allCurrentGatesPassed = gates.length > 0 && gates.every((gate) => gate.status === "passed");
  const signedTestWebhookPassed = gates.some(
    (gate) => gate.gate_key === "stripe_signed_webhook" && gate.status === "passed",
  );
  const accountReadyForFunding =
    stripeAccount.reachable &&
    (baseConfig.mode === "test" ||
      (stripeAccount.chargesEnabled &&
        stripeAccount.payoutsEnabled &&
        stripeAccount.detailsSubmitted));
  const institutionalGatesReady =
    baseConfig.mode === "test" ? true : baseConfig.mode === "live" && allCurrentGatesPassed;
  const readyForParticipantFunding =
    baseConfig.readyForParticipantFunding && accountReadyForFunding && institutionalGatesReady;
  const readyForProviderCheckout =
    readyForParticipantFunding &&
    (baseConfig.mode === "test" ? signedTestWebhookPassed : allCurrentGatesPassed);
  const blockers = [...baseConfig.blockers];
  if (baseConfig.mode !== "disabled" && !stripeAccount.reachable) {
    blockers.push("The configured Stripe platform account could not be verified.");
  }
  if (
    baseConfig.mode === "live" &&
    stripeAccount.reachable &&
    (!stripeAccount.chargesEnabled || !stripeAccount.payoutsEnabled || !stripeAccount.detailsSubmitted)
  ) {
    blockers.push("Stripe live charges, payouts, or required account details are incomplete.");
  }
  if (baseConfig.mode === "live" && !allCurrentGatesPassed) {
    const gate = gates.find((candidate) => candidate.status !== "passed");
    blockers.push(
      gate
        ? `Live pooled-settlement gate ${gate.gate_key} is ${gate.status}: ${gate.notes}`
        : "Live pooled-settlement gate records are unavailable.",
    );
  }
  if (baseConfig.mode === "test" && readyForParticipantFunding && !signedTestWebhookPassed) {
    blockers.push("A signed Stripe test webhook must fund the bundle before provider checkout.");
  }

  return {
    config: {
      ...baseConfig,
      readyForParticipantFunding,
      readyForProviderCheckout,
      blockers: [...new Set(blockers)],
    },
    gates,
    stripeAccount,
  };
}

export async function loadTradeDonationPoolAdminSnapshot(): Promise<TradeDonationPoolAdminSnapshot> {
  const readiness = await loadTradeDonationPoolOperationalReadiness();
  const { config, gates, stripeAccount } = readiness;
  const supabase = createServiceClient() as any;
  const environment = config.environment ?? "test";
  const [obligationsResult, bundlesResult] = await Promise.all([
    supabase
      .from("trade_donation_pool_obligations")
      .select("*")
      .eq("environment", environment)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("trade_donation_pool_bundles")
      .select("*")
      .eq("environment", environment)
      .order("frozen_at", { ascending: false })
      .limit(50),
  ]);

  const rawBundles = (bundlesResult.data ?? []) as TradeDonationPoolBundleRow[];
  const bundles = await Promise.all(
    rawBundles.map(async (bundle) => {
      const { data: items } = await supabase
        .from("trade_donation_pool_bundle_items")
        .select("allocation_cents")
        .eq("bundle_id", bundle.id);
      return {
        ...bundle,
        item_count: items?.length ?? 0,
        allocation_total_cents: (items ?? []).reduce(
          (sum: number, item: { allocation_cents: number }) =>
            sum + Number(item.allocation_cents ?? 0),
          0,
        ),
      };
    }),
  );

  return {
    config,
    gates,
    obligations: (obligationsResult.data ?? []) as TradeDonationPoolObligationRow[],
    bundles,
    stripeAccount,
  };
}
