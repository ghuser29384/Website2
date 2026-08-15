import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getSiteUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_CONTRACT_STATUS,
  getEveryOrgCredentialConfiguration,
  type EveryOrgRuntimeEnvironment,
} from "@/lib/every-org-partner-webhook-auth";

export const MIN_TRADE_DONATION_CENTS = 100;
export const MAX_TRADE_DONATION_CENTS = 50_000;
export const TRADE_DONATION_PROVIDER = "every_org" as const;
export const TRADE_DONATION_METADATA_SCHEMA = "moral-trade-pledge-donation-v1";

export type TradeDonationPayerRole = "proposer" | "responder";
export type EveryOrgEnvironment = "staging" | "live";

export interface TradeDonationTarget {
  id: string;
  name: string;
  shortName: string;
  causeArea: string;
  everyOrgSlug: string;
  nonprofitEin: string | null;
  evidenceSourceLabel: string;
  evidenceSourceUrl: string;
  evidenceCheckedAt: string;
  description: string;
}

export const TRADE_DONATION_TARGETS = [
  {
    id: "against-malaria-foundation",
    name: "The Against Malaria Foundation",
    shortName: "Against Malaria Foundation",
    causeArea: "Global health and poverty",
    everyOrgSlug: "againstmalaria",
    nonprofitEin: "203069841",
    evidenceSourceLabel: "GiveWell research",
    evidenceSourceUrl: "https://www.givewell.org/charities/amf",
    evidenceCheckedAt: "2026-07-22",
    description: "Funds long-lasting insecticide-treated nets to prevent malaria.",
  },
  {
    id: "givewell-top-charities-fund",
    name: "GiveWell Top Charities Fund",
    shortName: "GiveWell Top Charities Fund",
    causeArea: "Global health and poverty",
    everyOrgSlug: "givewell-top-charities-fund",
    nonprofitEin: null,
    evidenceSourceLabel: "GiveWell fund methodology",
    evidenceSourceUrl: "https://www.givewell.org/top-charities-fund",
    evidenceCheckedAt: "2026-07-22",
    description: "Supports the highest-priority funding needs among GiveWell's Top Charities.",
  },
  {
    id: "forethought",
    name: "Forethought",
    shortName: "Forethought",
    causeArea: "Long-term future research",
    everyOrgSlug: "forethought",
    nonprofitEin: null,
    evidenceSourceLabel: "Forethought research",
    evidenceSourceUrl: "https://www.forethought.org/research",
    evidenceCheckedAt: "2026-07-22",
    description: "Research on navigating the transition to a world with superintelligent AI systems.",
  },
] as const satisfies readonly TradeDonationTarget[];

export interface TradeDonationProviderConfig {
  requestedEnabled: boolean;
  ready: boolean;
  environment: EveryOrgEnvironment;
  donateLinkWebhookToken: string;
  partnerWebhookAuthorizationTokenConfigured: boolean;
  partnerWebhookAuthorizationContract:
    typeof EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_CONTRACT_STATUS;
  webhookPathSecret: string;
  metadataSecret: string;
  blockers: string[];
}

export interface TradeDonationTermRow {
  id: string;
  agreement_id: string;
  agreement_version_id: string;
  payer_role: TradeDonationPayerRole;
  provider: typeof TRADE_DONATION_PROVIDER;
  target_id: string;
  target_name: string;
  nonprofit_slug: string;
  nonprofit_ein: string;
  amount_cents: number;
  currency: "USD";
  frequency: "ONCE";
  connector_terms_hash: string;
  source_label: string;
  source_url: string;
  source_checked_at: string;
  created_by: string;
  created_at: string;
}

export interface TradeDonationIntentRow {
  id: string;
  donation_term_id: string;
  agreement_id: string;
  agreement_version_id: string;
  payer_user_id: string;
  provider: typeof TRADE_DONATION_PROVIDER;
  partner_donation_id: string;
  status: "created" | "checkout_started" | "completed" | "needs_review" | "cancelled";
  expected_target_id: string;
  expected_target_name: string;
  expected_nonprofit_slug: string;
  expected_nonprofit_ein: string;
  expected_amount_cents: number;
  expected_currency: "USD";
  expected_frequency: "ONCE";
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
  checkout_started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeDonationAgreementContext {
  agreement: Record<string, unknown>;
  eligible: boolean;
  term: TradeDonationTermRow | null;
  intent: TradeDonationIntentRow | null;
  target: TradeDonationTarget | null;
  payerUserId: string | null;
  provider: Pick<TradeDonationProviderConfig, "requestedEnabled" | "ready" | "environment" | "blockers">;
}

export interface TradeDonationPartnerMetadata {
  schema: typeof TRADE_DONATION_METADATA_SCHEMA;
  agreementId: string;
  agreementVersionId: string;
  donationTermId: string;
  donationIntentId: string;
  partnerDonationId: string;
  signature: string;
}

export interface EveryOrgPartnerWebhookPayload {
  chargeId?: unknown;
  partnerDonationId?: unknown;
  partnerMetadata?: unknown;
  toNonprofit?: unknown;
  amount?: unknown;
  netAmount?: unknown;
  currency?: unknown;
  frequency?: unknown;
  donationDate?: unknown;
  paymentMethod?: unknown;
}

export interface EvaluatedEveryOrgWebhook {
  valid: boolean;
  failureCode: string;
  failureMessage: string;
  chargeIdHash: string;
  payloadHash: string;
  amountCents: number | null;
  currency: string;
  nonprofitSlug: string;
  nonprofitEin: string;
  donationDate: string | null;
  paymentMethod: string;
}

function envText(environment: EveryOrgRuntimeEnvironment, name: string) {
  return String(environment[name] ?? "").trim();
}

export function getTradeDonationProviderConfig(
  runtimeEnvironment: EveryOrgRuntimeEnvironment = process.env,
): TradeDonationProviderConfig {
  const requestedEnabled =
    envText(runtimeEnvironment, "EVERY_ORG_PLEDGE_DONATIONS_ENABLED").toLowerCase() ===
    "true";
  const environment: EveryOrgEnvironment =
    envText(runtimeEnvironment, "EVERY_ORG_ENVIRONMENT").toLowerCase() === "live"
      ? "live"
      : "staging";
  const credentialConfiguration = getEveryOrgCredentialConfiguration(
    runtimeEnvironment,
  );
  const webhookPathSecret = envText(
    runtimeEnvironment,
    "EVERY_ORG_WEBHOOK_PATH_SECRET",
  );
  const metadataSecret = envText(
    runtimeEnvironment,
    "EVERY_ORG_PARTNER_METADATA_SECRET",
  );
  const blockers: string[] = [];

  const configuredHostname = (() => {
    try {
      return new URL(envText(runtimeEnvironment, "NEXT_PUBLIC_SITE_URL")).hostname;
    } catch {
      return "";
    }
  })();
  const vercelEnvironment = envText(runtimeEnvironment, "VERCEL_ENV");
  const canonicalProduction = vercelEnvironment
    ? vercelEnvironment === "production"
    : /(^|\.)moraltrade\.org$/i.test(configuredHostname);

  if (!requestedEnabled) blockers.push("The pledge-donation connector is disabled.");
  if (environment === "staging" && canonicalProduction) {
    blockers.push("The Every.org staging connector cannot activate agreements on the production site.");
  }
  if (environment === "live" && !canonicalProduction) {
    blockers.push("Live Every.org donations are restricted to the canonical production site.");
  }
  blockers.push(...credentialConfiguration.blockers);
  if (webhookPathSecret.length < 32) blockers.push("Every.org webhook path secret must be at least 32 characters.");
  if (metadataSecret.length < 32) blockers.push("Every.org metadata signing secret must be at least 32 characters.");

  return {
    requestedEnabled,
    ready: requestedEnabled && blockers.length === 0,
    environment,
    donateLinkWebhookToken:
      credentialConfiguration.donateLinkWebhookToken,
    partnerWebhookAuthorizationTokenConfigured:
      credentialConfiguration.partnerWebhookAuthorizationTokenConfigured,
    partnerWebhookAuthorizationContract:
      credentialConfiguration.partnerWebhookAuthorizationContract,
    webhookPathSecret,
    metadataSecret,
    blockers,
  };
}

export function getTradeDonationTarget(targetId: string) {
  return TRADE_DONATION_TARGETS.find((target) => target.id === targetId) ?? null;
}

export function normalizeEin(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function formatUsdFromCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function parseUsdToCents(value: string) {
  const normalized = value.trim();
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const dollars = Number(match[1]);
  const fractional = String(match[2] ?? "").padEnd(2, "0");
  if (!Number.isSafeInteger(dollars)) return null;
  const cents = dollars * 100 + Number(fractional || "0");
  return Number.isSafeInteger(cents) ? cents : null;
}

export function parseEveryOrgAmountToCents(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  return parseUsdToCents(String(value));
}

export function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function metadataSigningInput(metadata: Omit<TradeDonationPartnerMetadata, "signature">) {
  return [
    metadata.schema,
    metadata.agreementId,
    metadata.agreementVersionId,
    metadata.donationTermId,
    metadata.donationIntentId,
    metadata.partnerDonationId,
  ].join("\u241f");
}

export function createTradeDonationPartnerMetadata(input: {
  agreementId: string;
  agreementVersionId: string;
  donationTermId: string;
  donationIntentId: string;
  partnerDonationId: string;
  metadataSecret: string;
}): TradeDonationPartnerMetadata {
  const unsigned = {
    schema: TRADE_DONATION_METADATA_SCHEMA,
    agreementId: input.agreementId,
    agreementVersionId: input.agreementVersionId,
    donationTermId: input.donationTermId,
    donationIntentId: input.donationIntentId,
    partnerDonationId: input.partnerDonationId,
  } satisfies Omit<TradeDonationPartnerMetadata, "signature">;
  return {
    ...unsigned,
    signature: createHmac("sha256", input.metadataSecret)
      .update(metadataSigningInput(unsigned))
      .digest("hex"),
  };
}

function constantTimeTextEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyTradeDonationPartnerMetadata(
  value: unknown,
  expected: {
    agreementId: string;
    agreementVersionId: string;
    donationTermId: string;
    donationIntentId: string;
    partnerDonationId: string;
  },
  metadataSecret: string,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const metadata = {
    schema: String(record.schema ?? ""),
    agreementId: String(record.agreementId ?? ""),
    agreementVersionId: String(record.agreementVersionId ?? ""),
    donationTermId: String(record.donationTermId ?? ""),
    donationIntentId: String(record.donationIntentId ?? ""),
    partnerDonationId: String(record.partnerDonationId ?? ""),
    signature: String(record.signature ?? ""),
  };
  if (
    metadata.schema !== TRADE_DONATION_METADATA_SCHEMA ||
    metadata.agreementId !== expected.agreementId ||
    metadata.agreementVersionId !== expected.agreementVersionId ||
    metadata.donationTermId !== expected.donationTermId ||
    metadata.donationIntentId !== expected.donationIntentId ||
    metadata.partnerDonationId !== expected.partnerDonationId ||
    !/^[0-9a-f]{64}$/i.test(metadata.signature)
  ) {
    return false;
  }
  const expectedMetadata = createTradeDonationPartnerMetadata({
    ...expected,
    metadataSecret,
  });
  return constantTimeTextEqual(metadata.signature, expectedMetadata.signature);
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function evaluateEveryOrgTradeDonationWebhook(input: {
  payload: EveryOrgPartnerWebhookPayload;
  rawBody: string;
  intent: TradeDonationIntentRow;
  term: TradeDonationTermRow;
  metadataSecret: string;
}): EvaluatedEveryOrgWebhook {
  const { payload, rawBody, intent, term } = input;
  const chargeId = String(payload.chargeId ?? "").trim();
  const partnerDonationId = String(payload.partnerDonationId ?? "").trim();
  const nonprofit = asObject(payload.toNonprofit);
  const amountCents = parseEveryOrgAmountToCents(payload.amount);
  const currency = String(payload.currency ?? "").trim().toUpperCase();
  const frequency = String(payload.frequency ?? "").trim().toLowerCase();
  const nonprofitSlug = String(nonprofit.slug ?? "").trim().toLowerCase();
  const nonprofitEin = normalizeEin(nonprofit.ein);
  const donationDateValue = String(payload.donationDate ?? "").trim();
  const donationDate = donationDateValue && !Number.isNaN(Date.parse(donationDateValue))
    ? new Date(donationDateValue).toISOString()
    : null;
  const paymentMethod = String(payload.paymentMethod ?? "").trim().slice(0, 120);
  const failures: Array<[string, string]> = [];

  if (!chargeId) failures.push(["missing_charge_id", "Every.org did not provide a charge ID."]);
  if (partnerDonationId !== intent.partner_donation_id) {
    failures.push(["partner_id_mismatch", "The partner donation ID does not match the pending intent."]);
  }
  if (
    !verifyTradeDonationPartnerMetadata(
      payload.partnerMetadata,
      {
        agreementId: intent.agreement_id,
        agreementVersionId: intent.agreement_version_id,
        donationTermId: intent.donation_term_id,
        donationIntentId: intent.id,
        partnerDonationId: intent.partner_donation_id,
      },
      input.metadataSecret,
    )
  ) {
    failures.push(["metadata_signature_invalid", "Partner metadata is missing, altered, or unsigned."]);
  }
  if (amountCents !== intent.expected_amount_cents || amountCents !== term.amount_cents) {
    failures.push(["amount_mismatch", "The completed donation amount does not match the frozen agreement."]);
  }
  if (currency !== intent.expected_currency || currency !== term.currency) {
    failures.push(["currency_mismatch", "The donation currency does not match the frozen agreement."]);
  }
  if (frequency !== "one-time") {
    failures.push(["frequency_mismatch", "Only one-time donations can activate this pledge swap."]);
  }
  if (
    nonprofitSlug !== intent.expected_nonprofit_slug.toLowerCase() ||
    nonprofitSlug !== term.nonprofit_slug.toLowerCase()
  ) {
    failures.push(["recipient_mismatch", "The completed donation went to a different Every.org recipient."]);
  }
  const expectedEin = normalizeEin(intent.expected_nonprofit_ein || term.nonprofit_ein);
  if (expectedEin && nonprofitEin !== expectedEin) {
    failures.push(["ein_mismatch", "The recipient EIN does not match the frozen agreement."]);
  }
  if (!donationDate) failures.push(["donation_date_invalid", "The donation date is missing or invalid."]);

  const firstFailure = failures[0];
  return {
    valid: failures.length === 0,
    failureCode: firstFailure?.[0] ?? "",
    failureMessage: firstFailure?.[1] ?? "",
    chargeIdHash: chargeId ? hashText(`every_org:${chargeId}`) : "",
    payloadHash: hashText(rawBody),
    amountCents,
    currency,
    nonprofitSlug,
    nonprofitEin,
    donationDate,
    paymentMethod,
  };
}

export function secureWebhookPathMatches(candidate: string, configured: string) {
  return configured.length >= 32 && constantTimeTextEqual(candidate, configured);
}

export function payerUserIdForRole(
  agreement: Pick<Record<string, unknown>, "proposer_id" | "responder_id">,
  payerRole: TradeDonationPayerRole,
) {
  return String(payerRole === "proposer" ? agreement.proposer_id ?? "" : agreement.responder_id ?? "");
}

export function buildEveryOrgTradeDonationUrl(input: {
  term: TradeDonationTermRow;
  intent: TradeDonationIntentRow;
  config: TradeDonationProviderConfig;
  siteUrl?: string;
}) {
  if (!input.config.ready) {
    throw new Error(input.config.blockers[0] ?? "The Every.org connector is not ready.");
  }
  const baseHost = input.config.environment === "live" ? "https://www.every.org" : "https://staging.every.org";
  const url = new URL(`/${encodeURIComponent(input.term.nonprofit_slug)}`, baseHost);
  const siteUrl = input.siteUrl ?? getSiteUrl();
  const returnPath = `/trade-agreements/${input.term.agreement_id}`;
  const metadata = createTradeDonationPartnerMetadata({
    agreementId: input.term.agreement_id,
    agreementVersionId: input.term.agreement_version_id,
    donationTermId: input.term.id,
    donationIntentId: input.intent.id,
    partnerDonationId: input.intent.partner_donation_id,
    metadataSecret: input.config.metadataSecret,
  });

  url.searchParams.set("amount", (input.term.amount_cents / 100).toFixed(2));
  url.searchParams.set("frequency", "ONCE");
  url.searchParams.set(
    "description",
    "Complete the donation leg of a Moral Trade pledge swap. The reciprocal action starts only after provider confirmation.",
  );
  url.searchParams.set(
    "success_url",
    new URL(`${returnPath}?message=${encodeURIComponent("Donation submitted. Moral Trade is waiting for the Every.org webhook before activating the reciprocal action.")}`, siteUrl).toString(),
  );
  url.searchParams.set(
    "exit_url",
    new URL(`${returnPath}?message=${encodeURIComponent("Donation checkout was closed. No reciprocal action has started.")}`, siteUrl).toString(),
  );
  url.searchParams.set("partner_donation_id", input.intent.partner_donation_id);
  url.searchParams.set("partner_metadata", Buffer.from(JSON.stringify(metadata), "utf8").toString("base64"));
  url.searchParams.set(
    "webhook_token",
    input.config.donateLinkWebhookToken,
  );
  url.searchParams.set("share_info", "false");
  url.hash = "donate";
  return url.toString();
}

function firstRow<T>(data: T | T[] | null | undefined): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

export async function loadTradeDonationAgreementContext(
  agreementId: string,
): Promise<TradeDonationAgreementContext | null> {
  const supabase = (await createClient()) as any;
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();
  if (agreementError || !agreement) return null;

  let term: TradeDonationTermRow | null = null;
  if (agreement.current_version_id) {
    const result = await supabase
      .from("trade_donation_terms")
      .select("*")
      .eq("agreement_version_id", agreement.current_version_id)
      .maybeSingle();
    if (!result.error) term = result.data as TradeDonationTermRow | null;
  }

  let intent: TradeDonationIntentRow | null = null;
  if (term) {
    const result = await supabase
      .from("trade_donation_intents")
      .select("*")
      .eq("donation_term_id", term.id)
      .maybeSingle();
    if (!result.error) intent = result.data as TradeDonationIntentRow | null;
  }

  let eligible = false;
  if (agreement.offer_id) {
    const offerResult = await supabase
      .from("offers")
      .select("mode")
      .eq("id", agreement.offer_id)
      .maybeSingle();
    eligible = !offerResult.error && String(offerResult.data?.mode ?? "") === "pledge";
  }

  const providerConfig = getTradeDonationProviderConfig();
  return {
    agreement,
    eligible: Boolean(term) || eligible,
    term,
    intent,
    target: term ? getTradeDonationTarget(term.target_id) : null,
    payerUserId: term ? payerUserIdForRole(agreement, term.payer_role) : null,
    provider: {
      requestedEnabled: providerConfig.requestedEnabled,
      ready: providerConfig.ready,
      environment: providerConfig.environment,
      blockers: providerConfig.blockers,
    },
  };
}

export function rpcRow<T>(data: T | T[] | null | undefined) {
  return firstRow(data);
}
