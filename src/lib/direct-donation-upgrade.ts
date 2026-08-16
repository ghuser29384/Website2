import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getSiteUrl } from "@/lib/supabase/config";
import {
  formatDirectDonationUpgradeUsdValue,
  parseDirectDonationUpgradeUsdValue,
} from "@/lib/direct-donation-upgrade-split";
import {
  EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_CONTRACT_STATUS,
  getEveryOrgCredentialConfiguration,
} from "@/lib/every-org-partner-webhook-auth";

export const DIRECT_DONATION_UPGRADE_PROVIDER = "every_org" as const;
export const DIRECT_DONATION_UPGRADE_METADATA_SCHEMA =
  "moral-trade-direct-donation-upgrade-v1" as const;
export const DIRECT_DONATION_UPGRADE_IDENTITY_SCHEMA =
  "moral-trade-every-org-nonprofit-identity-v1" as const;
export const DIRECT_DONATION_UPGRADE_BASELINE_VERSION =
  "direct-donation-upgrade-baseline-v1-2026-08-01" as const;
export const DIRECT_DONATION_UPGRADE_MATCHER_COMMITMENT_VERSION =
  "direct-donation-upgrade-matcher-v1-2026-08-01" as const;
export const DIRECT_DONATION_UPGRADE_FULFILLMENT_DAYS = 7;
export const DIRECT_DONATION_UPGRADE_WEBHOOK_GRACE_HOURS = 24;
export const DIRECT_DONATION_UPGRADE_MIN_CENTS = 100;
export const DIRECT_DONATION_UPGRADE_MAX_CENTS = 5_000_000;
export const DIRECT_DONATION_UPGRADE_MAX_MATCH_DAYS = 30;
export const DIRECT_DONATION_UPGRADE_DEFAULT_MATCH_DAYS = 7;
export const DIRECT_DONATION_UPGRADE_CANONICAL_VERCEL_PROJECT_ID =
  "prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7" as const;
export const DIRECT_DONATION_UPGRADE_CANONICAL_ORIGIN =
  "https://www.moraltrade.org" as const;

export type DirectDonationUpgradeMode = "disabled" | "staging" | "live";
export type DirectDonationUpgradeEnvironment = Exclude<
  DirectDonationUpgradeMode,
  "disabled"
>;
export type DirectDonationUpgradeBranch = "fallback" | "matched";
export type DirectDonationUpgradeParticipantRole = "creator" | "matcher";
export type DirectDonationUpgradePrivacyMode = "public" | "private_until_completed";
export type DirectDonationUpgradeRuntimeEnvironment = Readonly<
  Record<string, string | undefined>
>;

export interface DirectDonationUpgradeConfig {
  requestedEnabled: boolean;
  mode: DirectDonationUpgradeMode;
  environment: DirectDonationUpgradeEnvironment | null;
  publicApiKey: string;
  donateLinkWebhookToken: string;
  partnerWebhookAuthorizationTokenConfigured: boolean;
  partnerWebhookAuthorizationContract:
    typeof EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_CONTRACT_STATUS;
  webhookPathSecret: string;
  metadataSecret: string;
  qaFixturesEnabled: boolean;
  readyForSearch: boolean;
  readyForCommitments: boolean;
  readyForCheckout: boolean;
  blockers: string[];
}

export interface EveryOrgNonprofitIdentity {
  schemaVersion: typeof DIRECT_DONATION_UPGRADE_IDENTITY_SCHEMA;
  provider: typeof DIRECT_DONATION_UPGRADE_PROVIDER;
  providerNonprofitId: string;
  name: string;
  primarySlug: string;
  ein: string;
  isDisbursable: boolean;
  profileUrl: string;
  websiteUrl: string;
  locationAddress: string;
  description: string;
  logoUrl: string;
  identityHash: string;
}

export interface EveryOrgNonprofitSearchResult {
  name: string;
  identifier: string;
  primarySlug: string;
  ein: string;
  profileUrl: string;
  websiteUrl: string;
  description: string;
  logoUrl: string;
}

export interface DirectDonationUpgradeOfferRow {
  id: string;
  creator_profile_id: string;
  environment: DirectDonationUpgradeEnvironment;
  status:
    | "open"
    | "matched"
    | "fallback_selected"
    | "completed"
    | "defaulted"
    | "expired"
    | "cancelled"
    | "needs_review";
  selected_branch: DirectDonationUpgradeBranch | null;
  privacy_mode: DirectDonationUpgradePrivacyMode;
  creator_amount_cents: number;
  matcher_amount_cents: number;
  currency: "USD";
  match_deadline_at: string;
  fulfillment_deadline_at: string | null;
  webhook_grace_ends_at: string | null;
  original_recipient: EveryOrgNonprofitIdentity;
  upgraded_recipient: EveryOrgNonprofitIdentity;
  original_recipient_hash: string;
  upgraded_recipient_hash: string;
  baseline_version: string;
  baseline_attestation: string;
  baseline_attested_at: string;
  terms_hash: string;
  winning_candidate_id: string | null;
  match_locked_at: string | null;
  completed_at: string | null;
  defaulted_at: string | null;
  cancellation_reason: string;
  failure_code: string;
  failure_message: string;
  created_at: string;
  updated_at: string;
}

export interface DirectDonationUpgradeCandidateRow {
  id: string;
  offer_id: string;
  profile_id: string;
  rank: number;
  status:
    | "primary"
    | "backup"
    | "promoted"
    | "fulfilled"
    | "defaulted"
    | "withdrawn"
    | "closed";
  commitment_version: string;
  commitment_accepted_at: string;
  promoted_at: string | null;
  fulfilled_at: string | null;
  defaulted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectDonationUpgradeObligationRow {
  id: string;
  offer_id: string;
  candidate_id: string | null;
  participant_profile_id: string;
  participant_role: DirectDonationUpgradeParticipantRole;
  branch: DirectDonationUpgradeBranch;
  environment: DirectDonationUpgradeEnvironment;
  provider: typeof DIRECT_DONATION_UPGRADE_PROVIDER;
  expected_recipient: EveryOrgNonprofitIdentity;
  expected_recipient_hash: string;
  expected_amount_cents: number;
  expected_currency: "USD";
  expected_frequency: "ONCE";
  terms_hash: string;
  partner_donation_id: string;
  status:
    | "pending"
    | "checkout_started"
    | "verified"
    | "defaulted"
    | "cancelled"
    | "needs_review";
  due_at: string;
  webhook_grace_ends_at: string;
  checkout_started_at: string | null;
  provider_charge_id_hash: string;
  provider_payload_hash: string;
  provider_gross_amount_cents: number | null;
  provider_net_amount_cents: number | null;
  provider_currency: string;
  provider_nonprofit_slug: string;
  provider_nonprofit_ein: string;
  provider_donation_date: string | null;
  provider_payment_method: string;
  failure_code: string;
  failure_message: string;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectDonationUpgradePartnerMetadata {
  schema: typeof DIRECT_DONATION_UPGRADE_METADATA_SCHEMA;
  obligationId: string;
  offerId: string;
  participantProfileId: string;
  participantRole: DirectDonationUpgradeParticipantRole;
  branch: DirectDonationUpgradeBranch;
  termsHash: string;
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

export interface EvaluatedDirectDonationUpgradeWebhook {
  valid: boolean;
  failureCode: string;
  failureMessage: string;
  chargeIdHash: string;
  payloadHash: string;
  grossAmountCents: number | null;
  netAmountCents: number | null;
  currency: string;
  nonprofitSlug: string;
  nonprofitEin: string;
  donationDate: string | null;
  paymentMethod: string;
}

const EVERY_ORG_LIVE_API_BASE = "https://partners.every.org/v0.2";
const EVERY_ORG_STAGING_API_BASE =
  "https://partners-staging.every.org/v0.2";

export function getEveryOrgApiBase(mode: DirectDonationUpgradeMode) {
  if (mode === "staging") return EVERY_ORG_STAGING_API_BASE;
  if (mode === "live") return EVERY_ORG_LIVE_API_BASE;
  throw new Error(
    "Every.org API is unavailable while Direct Donation Upgrades are disabled.",
  );
}
const FETCH_TIMEOUT_MS = 10_000;

function envText(
  environment: DirectDonationUpgradeRuntimeEnvironment,
  name: string,
) {
  return String(environment[name] ?? "").trim();
}

function hasExactCanonicalSiteUrl(
  environment: DirectDonationUpgradeRuntimeEnvironment,
) {
  try {
    const siteUrl = new URL(envText(environment, "NEXT_PUBLIC_SITE_URL"));
    return (
      siteUrl.origin === DIRECT_DONATION_UPGRADE_CANONICAL_ORIGIN &&
      siteUrl.username === "" &&
      siteUrl.password === "" &&
      siteUrl.pathname === "/" &&
      siteUrl.search === "" &&
      siteUrl.hash === ""
    );
  } catch {
    return false;
  }
}

function isExactVercelProductionTarget(
  environment: DirectDonationUpgradeRuntimeEnvironment,
) {
  const vercelEnvironment = envText(environment, "VERCEL_ENV");
  const targetEnvironment = envText(environment, "VERCEL_TARGET_ENV");
  return (
    envText(environment, "VERCEL") === "1" &&
    vercelEnvironment === "production" &&
    targetEnvironment === "production"
  );
}

function hasVercelProductionSignal(
  environment: DirectDonationUpgradeRuntimeEnvironment,
) {
  return (
    envText(environment, "VERCEL_ENV") === "production" ||
    envText(environment, "VERCEL_TARGET_ENV") === "production"
  );
}

function isCanonicalProduction(
  environment: DirectDonationUpgradeRuntimeEnvironment,
) {
  return (
    envText(environment, "VERCEL_PROJECT_ID") ===
      DIRECT_DONATION_UPGRADE_CANONICAL_VERCEL_PROJECT_ID &&
    isExactVercelProductionTarget(environment) &&
    hasExactCanonicalSiteUrl(environment)
  );
}

export function getDirectDonationUpgradeConfig(
  runtimeEnvironment: DirectDonationUpgradeRuntimeEnvironment = process.env,
): DirectDonationUpgradeConfig {
  const requestedEnabled =
    envText(runtimeEnvironment, "DIRECT_DONATION_UPGRADES_ENABLED").toLowerCase() ===
    "true";
  const configuredMode = envText(
    runtimeEnvironment,
    "DIRECT_DONATION_UPGRADE_MODE",
  ).toLowerCase();
  const mode: DirectDonationUpgradeMode =
    configuredMode === "staging" || configuredMode === "live"
      ? configuredMode
      : "disabled";
  const environment = mode === "disabled" ? null : mode;
  const publicApiKey = envText(runtimeEnvironment, "EVERY_ORG_PUBLIC_API_KEY");
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
  const qaFixturesEnabled =
    envText(runtimeEnvironment, "DIRECT_DONATION_UPGRADE_QA_FIXTURES").toLowerCase() ===
    "true";
  const renderedQaInspectionEnabled =
    envText(
      runtimeEnvironment,
      "DIRECT_DONATION_UPGRADE_RENDERED_QA_NO_SERVICE_ROLE",
    ).toLowerCase() === "true" &&
    qaFixturesEnabled &&
    envText(runtimeEnvironment, "VERCEL") === "1" &&
    envText(runtimeEnvironment, "VERCEL_ENV") === "preview" &&
    envText(runtimeEnvironment, "VERCEL_TARGET_ENV") !== "production" &&
    mode === "staging";
  const canonicalProduction = isCanonicalProduction(runtimeEnvironment);
  const vercelProduction = hasVercelProductionSignal(runtimeEnvironment);
  const blockers: string[] = [];

  if (!requestedEnabled) blockers.push("Direct Donation Upgrades are disabled.");
  if (mode === "disabled") blockers.push("DIRECT_DONATION_UPGRADE_MODE is disabled.");
  if (mode === "staging" && vercelProduction) {
    blockers.push("Every.org staging is blocked on Vercel production deployments.");
  }
  if (
    mode === "live" &&
    envText(runtimeEnvironment, "VERCEL_PROJECT_ID") !==
      DIRECT_DONATION_UPGRADE_CANONICAL_VERCEL_PROJECT_ID
  ) {
    blockers.push(
      "Live Direct Donation Upgrades require the canonical Moral Trade Vercel project.",
    );
  }
  if (mode === "live" && !isExactVercelProductionTarget(runtimeEnvironment)) {
    blockers.push(
      "Live Direct Donation Upgrades require the Vercel production environment.",
    );
  }
  if (mode === "live" && !hasExactCanonicalSiteUrl(runtimeEnvironment)) {
    blockers.push(
      `Live Direct Donation Upgrades require ${DIRECT_DONATION_UPGRADE_CANONICAL_ORIGIN}.`,
    );
  }
  if (!publicApiKey && !(mode === "staging" && qaFixturesEnabled)) {
    blockers.push("EVERY_ORG_PUBLIC_API_KEY is missing.");
  }
  blockers.push(...credentialConfiguration.blockers);
  if (webhookPathSecret.length < 32) {
    blockers.push("EVERY_ORG_WEBHOOK_PATH_SECRET must be at least 32 characters.");
  }
  if (metadataSecret.length < 32) {
    blockers.push("EVERY_ORG_PARTNER_METADATA_SECRET must be at least 32 characters.");
  }

  const environmentBoundaryReady =
    mode === "staging"
      ? !vercelProduction
      : mode === "live" && canonicalProduction;
  const readyForSearch =
    requestedEnabled &&
    mode !== "disabled" &&
    environmentBoundaryReady &&
    Boolean(publicApiKey || (mode === "staging" && qaFixturesEnabled));
  const providerIndependentConnectorReady =
    readyForSearch &&
    credentialConfiguration.donateLinkWebhookTokenConfigured &&
    credentialConfiguration.unsupportedCredentialEnvironmentNames.length === 0 &&
    !credentialConfiguration.publicAndPrivateTokensEqual &&
    webhookPathSecret.length >= 32 &&
    metadataSecret.length >= 32;
  const readyForCommitments =
    providerIndependentConnectorReady &&
    (credentialConfiguration.partnerWebhookAuthorizationReady ||
      renderedQaInspectionEnabled);
  const readyForCheckout =
    providerIndependentConnectorReady &&
    credentialConfiguration.partnerWebhookAuthorizationReady;

  return {
    requestedEnabled,
    mode,
    environment,
    publicApiKey,
    donateLinkWebhookToken:
      credentialConfiguration.donateLinkWebhookToken,
    partnerWebhookAuthorizationTokenConfigured:
      credentialConfiguration.partnerWebhookAuthorizationTokenConfigured,
    partnerWebhookAuthorizationContract:
      credentialConfiguration.partnerWebhookAuthorizationContract,
    webhookPathSecret,
    metadataSecret,
    qaFixturesEnabled,
    readyForSearch,
    readyForCommitments,
    readyForCheckout,
    blockers: [...new Set(blockers)],
  };
}

function normalizeText(value: unknown, maximum = 500) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

export function normalizeEveryOrgSlug(value: unknown) {
  return normalizeText(value, 160).toLowerCase().replace(/^\/+|\/+$/g, "");
}

export function normalizeEveryOrgEin(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 16);
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

export function canonicalDirectDonationUpgradeJson(value: unknown) {
  return JSON.stringify(normalizedJson(value));
}

export function hashDirectDonationUpgradeValue(value: unknown) {
  return createHash("sha256")
    .update(canonicalDirectDonationUpgradeJson(value))
    .digest("hex");
}

export function hashDirectDonationUpgradeText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function nonprofitSlugFromProfileUrl(value: unknown) {
  const profileUrl = normalizeText(value, 400);
  if (!profileUrl) return "";
  try {
    const url = new URL(profileUrl);
    if (!/(^|\.)every\.org$/i.test(url.hostname)) return "";
    return normalizeEveryOrgSlug(url.pathname.split("/").filter(Boolean)[0]);
  } catch {
    return "";
  }
}

function identityWithoutHash(input: {
  providerNonprofitId: unknown;
  name: unknown;
  primarySlug: unknown;
  ein: unknown;
  isDisbursable: unknown;
  profileUrl: unknown;
  websiteUrl: unknown;
  locationAddress: unknown;
  description: unknown;
  logoUrl: unknown;
}) {
  const primarySlug =
    normalizeEveryOrgSlug(input.primarySlug) ||
    nonprofitSlugFromProfileUrl(input.profileUrl);
  const profileUrl = normalizeText(input.profileUrl, 500);
  const providerNonprofitId = normalizeText(input.providerNonprofitId, 160).toLowerCase();
  const name = normalizeText(input.name, 220);
  const ein = normalizeEveryOrgEin(input.ein);
  const isDisbursable = input.isDisbursable === true;

  if (!providerNonprofitId) throw new Error("Every.org nonprofit ID is missing.");
  if (!name) throw new Error("Every.org nonprofit name is missing.");
  if (!primarySlug) throw new Error("Every.org nonprofit slug is missing.");
  if (!profileUrl.startsWith("https://www.every.org/") && !profileUrl.startsWith("https://every.org/")) {
    throw new Error("Every.org nonprofit profile URL is invalid.");
  }
  if (!isDisbursable) {
    throw new Error("This Every.org nonprofit is not currently disbursable.");
  }

  return {
    schemaVersion: DIRECT_DONATION_UPGRADE_IDENTITY_SCHEMA,
    provider: DIRECT_DONATION_UPGRADE_PROVIDER,
    providerNonprofitId,
    name,
    primarySlug,
    ein,
    isDisbursable,
    profileUrl,
    websiteUrl: normalizeText(input.websiteUrl, 500),
    locationAddress: normalizeText(input.locationAddress, 220),
    description: normalizeText(input.description, 1_000),
    logoUrl: normalizeText(input.logoUrl, 500),
  } as const;
}

export function normalizeEveryOrgNonprofitIdentity(input: {
  providerNonprofitId: unknown;
  name: unknown;
  primarySlug: unknown;
  ein: unknown;
  isDisbursable: unknown;
  profileUrl: unknown;
  websiteUrl: unknown;
  locationAddress: unknown;
  description: unknown;
  logoUrl: unknown;
}): EveryOrgNonprofitIdentity {
  const identity = identityWithoutHash(input);
  return {
    ...identity,
    identityHash: hashDirectDonationUpgradeValue(identity),
  };
}

export function sameEveryOrgNonprofit(
  left: Pick<
    EveryOrgNonprofitIdentity,
    "providerNonprofitId" | "primarySlug" | "ein" | "identityHash"
  >,
  right: Pick<
    EveryOrgNonprofitIdentity,
    "providerNonprofitId" | "primarySlug" | "ein" | "identityHash"
  >,
) {
  const leftProviderId = left.providerNonprofitId.trim().toLowerCase();
  const rightProviderId = right.providerNonprofitId.trim().toLowerCase();
  const leftSlug = left.primarySlug.trim().toLowerCase();
  const rightSlug = right.primarySlug.trim().toLowerCase();
  const leftEin = normalizeEveryOrgEin(left.ein);
  const rightEin = normalizeEveryOrgEin(right.ein);

  return (
    leftProviderId === rightProviderId ||
    leftSlug === rightSlug ||
    (Boolean(leftEin) && leftEin === rightEin) ||
    left.identityHash.toLowerCase() === right.identityHash.toLowerCase()
  );
}

export function qaFixtureIdentities(): EveryOrgNonprofitIdentity[] {
  return [
    normalizeEveryOrgNonprofitIdentity({
      providerNonprofitId: "75924760-cd27-4ecc-a9d4-c0660c08961a",
      name: "Homeward Pet Adoption Center",
      primarySlug: "homewardpet",
      ein: "911526803",
      isDisbursable: true,
      profileUrl: "https://www.every.org/homewardpet",
      websiteUrl: "https://www.homewardpet.org",
      locationAddress: "WOODINVILLE, WA",
      description:
        "Transforms the lives of cats and dogs through medical care, training, and adoption.",
      logoUrl:
        "https://res.cloudinary.com/everydotorg/image/upload/c_lfill,w_48,h_48/faja_profile/yx2bf7ajag59igzhv7uk",
    }),
    normalizeEveryOrgNonprofitIdentity({
      providerNonprofitId: "qa-givewell-top-charities-fund",
      name: "GiveWell Top Charities Fund",
      primarySlug: "givewell-top-charities-fund",
      ein: "",
      isDisbursable: true,
      profileUrl: "https://www.every.org/givewell-top-charities-fund",
      websiteUrl: "https://www.givewell.org/top-charities-fund",
      locationAddress: "United States",
      description:
        "Supports the highest-priority funding needs among GiveWell's top charities.",
      logoUrl: "",
    }),
  ];
}

function fixtureForIdentifier(identifier: string) {
  const normalized = normalizeText(identifier, 180).toLowerCase();
  return (
    qaFixtureIdentities().find(
      (identity) =>
        identity.providerNonprofitId.toLowerCase() === normalized ||
        identity.primarySlug === normalized ||
        identity.ein === normalizeEveryOrgEin(normalized),
    ) ?? null
  );
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Every.org returned HTTP ${response.status}.`);
    }
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function fetchEveryOrgNonprofitIdentity(
  identifier: string,
  config = getDirectDonationUpgradeConfig(),
) {
  const normalizedIdentifier = normalizeText(identifier, 180);
  if (!normalizedIdentifier) throw new Error("Choose an Every.org nonprofit.");

  if (config.mode === "staging" && config.qaFixturesEnabled) {
    const fixture = fixtureForIdentifier(normalizedIdentifier);
    if (fixture) return fixture;
  }
  if (!config.publicApiKey) {
    throw new Error("Every.org nonprofit lookup is not configured.");
  }

  const url = new URL(
    `${getEveryOrgApiBase(config.mode)}/nonprofit/${encodeURIComponent(normalizedIdentifier)}`,
  );
  url.searchParams.set("apiKey", config.publicApiKey);
  const payload = objectValue(await fetchJson(url.toString()));
  const data = objectValue(payload.data);
  const nonprofit = objectValue(data.nonprofit);
  return normalizeEveryOrgNonprofitIdentity({
    providerNonprofitId: nonprofit.id,
    name: nonprofit.name,
    primarySlug: nonprofit.primarySlug,
    ein: nonprofit.ein,
    isDisbursable: nonprofit.isDisbursable,
    profileUrl: nonprofit.profileUrl,
    websiteUrl: nonprofit.websiteUrl,
    locationAddress: nonprofit.locationAddress,
    description: nonprofit.descriptionLong || nonprofit.description,
    logoUrl: nonprofit.logoUrl,
  });
}

export async function searchEveryOrgNonprofits(
  query: string,
  config = getDirectDonationUpgradeConfig(),
  maximumResults = 12,
): Promise<EveryOrgNonprofitSearchResult[]> {
  const normalizedQuery = normalizeText(query, 120);
  if (normalizedQuery.length < 2) return [];
  const take = Math.max(1, Math.min(maximumResults, 20));

  if (config.mode === "staging" && config.qaFixturesEnabled) {
    const queryKey = normalizedQuery.toLowerCase();
    return qaFixtureIdentities()
      .filter((identity) =>
        [identity.name, identity.primarySlug, identity.ein]
          .join(" ")
          .toLowerCase()
          .includes(queryKey),
      )
      .slice(0, take)
      .map((identity) => ({
        name: identity.name,
        identifier: identity.primarySlug,
        primarySlug: identity.primarySlug,
        ein: identity.ein,
        profileUrl: identity.profileUrl,
        websiteUrl: identity.websiteUrl,
        description: identity.description,
        logoUrl: identity.logoUrl,
      }));
  }
  if (!config.publicApiKey) return [];

  const url = new URL(
    `${getEveryOrgApiBase(config.mode)}/search/${encodeURIComponent(normalizedQuery)}`,
  );
  url.searchParams.set("apiKey", config.publicApiKey);
  url.searchParams.set("take", String(take));
  const payload = objectValue(await fetchJson(url.toString()));
  const nonprofits = Array.isArray(payload.nonprofits) ? payload.nonprofits : [];

  const seen = new Set<string>();
  const results: EveryOrgNonprofitSearchResult[] = [];
  for (const value of nonprofits) {
    const row = objectValue(value);
    const profileUrl = normalizeText(row.profileUrl, 500);
    const primarySlug = nonprofitSlugFromProfileUrl(profileUrl);
    const ein = normalizeEveryOrgEin(row.ein);
    const name = normalizeText(row.name, 220);
    if (!name || !primarySlug || !profileUrl) continue;
    const key = `${primarySlug}|${ein}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      name,
      identifier: primarySlug,
      primarySlug,
      ein,
      profileUrl,
      websiteUrl: normalizeText(row.websiteUrl, 500),
      description: normalizeText(row.description, 600),
      logoUrl: normalizeText(row.logoUrl, 500),
    });
    if (results.length >= take) break;
  }
  return results;
}

export function parseDirectDonationUpgradeUsd(value: string) {
  return parseDirectDonationUpgradeUsdValue(value);
}

export function formatDirectDonationUpgradeUsd(cents: number) {
  return formatDirectDonationUpgradeUsdValue(cents);
}

function constantTimeTextEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function metadataSigningInput(
  metadata: Omit<DirectDonationUpgradePartnerMetadata, "signature">,
) {
  return [
    metadata.schema,
    metadata.obligationId,
    metadata.offerId,
    metadata.participantProfileId,
    metadata.participantRole,
    metadata.branch,
    metadata.termsHash,
    metadata.partnerDonationId,
  ].join("\u241f");
}

export function createDirectDonationUpgradePartnerMetadata(input: {
  obligationId: string;
  offerId: string;
  participantProfileId: string;
  participantRole: DirectDonationUpgradeParticipantRole;
  branch: DirectDonationUpgradeBranch;
  termsHash: string;
  partnerDonationId: string;
  metadataSecret: string;
}): DirectDonationUpgradePartnerMetadata {
  const unsigned = {
    schema: DIRECT_DONATION_UPGRADE_METADATA_SCHEMA,
    obligationId: input.obligationId,
    offerId: input.offerId,
    participantProfileId: input.participantProfileId,
    participantRole: input.participantRole,
    branch: input.branch,
    termsHash: input.termsHash,
    partnerDonationId: input.partnerDonationId,
  } satisfies Omit<DirectDonationUpgradePartnerMetadata, "signature">;
  return {
    ...unsigned,
    signature: createHmac("sha256", input.metadataSecret)
      .update(metadataSigningInput(unsigned))
      .digest("hex"),
  };
}

export function decodeDirectDonationUpgradePartnerMetadata(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string" || !value.trim()) return {};
  const candidates = [value.trim(), value.trim().replace(/-/g, "+").replace(/_/g, "/")];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(Buffer.from(candidate, "base64").toString("utf8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Try the next representation.
    }
  }
  return {};
}

export function verifyDirectDonationUpgradePartnerMetadata(
  value: unknown,
  obligation: Pick<
    DirectDonationUpgradeObligationRow,
    | "id"
    | "offer_id"
    | "participant_profile_id"
    | "participant_role"
    | "branch"
    | "terms_hash"
    | "partner_donation_id"
  >,
  metadataSecret: string,
) {
  const record = decodeDirectDonationUpgradePartnerMetadata(value);
  const metadata = {
    schema: String(record.schema ?? ""),
    obligationId: String(record.obligationId ?? ""),
    offerId: String(record.offerId ?? ""),
    participantProfileId: String(record.participantProfileId ?? ""),
    participantRole: String(record.participantRole ?? ""),
    branch: String(record.branch ?? ""),
    termsHash: String(record.termsHash ?? ""),
    partnerDonationId: String(record.partnerDonationId ?? ""),
    signature: String(record.signature ?? ""),
  };
  if (
    metadata.schema !== DIRECT_DONATION_UPGRADE_METADATA_SCHEMA ||
    metadata.obligationId !== obligation.id ||
    metadata.offerId !== obligation.offer_id ||
    metadata.participantProfileId !== obligation.participant_profile_id ||
    metadata.participantRole !== obligation.participant_role ||
    metadata.branch !== obligation.branch ||
    metadata.termsHash !== obligation.terms_hash ||
    metadata.partnerDonationId !== obligation.partner_donation_id ||
    !/^[0-9a-f]{64}$/i.test(metadata.signature)
  ) {
    return false;
  }
  const expected = createDirectDonationUpgradePartnerMetadata({
    obligationId: obligation.id,
    offerId: obligation.offer_id,
    participantProfileId: obligation.participant_profile_id,
    participantRole: obligation.participant_role,
    branch: obligation.branch,
    termsHash: obligation.terms_hash,
    partnerDonationId: obligation.partner_donation_id,
    metadataSecret,
  });
  return constantTimeTextEqual(metadata.signature, expected.signature);
}

function parseAmountToCents(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  return parseDirectDonationUpgradeUsd(String(value));
}

export function evaluateDirectDonationUpgradeWebhook(input: {
  payload: EveryOrgPartnerWebhookPayload;
  rawBody: string;
  obligation: DirectDonationUpgradeObligationRow;
  metadataSecret: string;
  expectedEnvironment: DirectDonationUpgradeEnvironment;
}): EvaluatedDirectDonationUpgradeWebhook {
  const { payload, rawBody, obligation } = input;
  const chargeId = normalizeText(payload.chargeId, 220);
  const partnerDonationId = normalizeText(payload.partnerDonationId, 220);
  const nonprofit = objectValue(payload.toNonprofit);
  const grossAmountCents = parseAmountToCents(payload.amount);
  const netAmountCents = parseAmountToCents(payload.netAmount);
  const currency = normalizeText(payload.currency, 12).toUpperCase();
  const frequency = normalizeText(payload.frequency, 40).toLowerCase();
  const nonprofitSlug = normalizeEveryOrgSlug(nonprofit.slug);
  const nonprofitEin = normalizeEveryOrgEin(nonprofit.ein);
  const donationDateValue = normalizeText(payload.donationDate, 120);
  const donationDate =
    donationDateValue && !Number.isNaN(Date.parse(donationDateValue))
      ? new Date(donationDateValue).toISOString()
      : null;
  const paymentMethod = normalizeText(payload.paymentMethod, 120);
  const failures: Array<[string, string]> = [];

  if (!chargeId) failures.push(["missing_charge_id", "Every.org did not provide a charge ID."]);
  if (obligation.environment !== input.expectedEnvironment) {
    failures.push(["environment_mismatch", "The webhook environment does not match the obligation."]);
  }
  if (partnerDonationId !== obligation.partner_donation_id) {
    failures.push(["partner_id_mismatch", "The partner donation ID does not match the obligation."]);
  }
  if (
    !verifyDirectDonationUpgradePartnerMetadata(
      payload.partnerMetadata,
      obligation,
      input.metadataSecret,
    )
  ) {
    failures.push(["metadata_signature_invalid", "Partner metadata is missing, altered, or unsigned."]);
  }
  if (grossAmountCents !== obligation.expected_amount_cents) {
    failures.push(["amount_mismatch", "The gross donation amount does not match the frozen obligation."]);
  }
  if (
    netAmountCents === null ||
    netAmountCents < 0 ||
    (grossAmountCents !== null && netAmountCents > grossAmountCents)
  ) {
    failures.push(["net_amount_invalid", "The provider net amount is missing or invalid."]);
  }
  if (currency !== obligation.expected_currency) {
    failures.push(["currency_mismatch", "The donation currency does not match the frozen obligation."]);
  }
  if (frequency !== "one-time") {
    failures.push(["frequency_mismatch", "Only one-time donations fulfill Donation Upgrades."]);
  }
  const expectedRecipient = obligation.expected_recipient;
  if (nonprofitSlug !== expectedRecipient.primarySlug) {
    failures.push(["recipient_mismatch", "The donation went to a different Every.org recipient."]);
  }
  if (expectedRecipient.ein && nonprofitEin !== expectedRecipient.ein) {
    failures.push(["ein_mismatch", "The recipient EIN does not match the frozen obligation."]);
  }
  if (!donationDate) {
    failures.push(["donation_date_invalid", "The provider donation date is missing or invalid."]);
  } else if (Date.parse(donationDate) > Date.parse(obligation.due_at) + 5 * 60 * 1000) {
    failures.push(["donation_late", "The donation was initiated after the fulfillment deadline."]);
  }

  const firstFailure = failures[0];
  return {
    valid: failures.length === 0,
    failureCode: firstFailure?.[0] ?? "",
    failureMessage: firstFailure?.[1] ?? "",
    chargeIdHash: chargeId
      ? hashDirectDonationUpgradeText(`every_org:${chargeId}`)
      : "",
    payloadHash: hashDirectDonationUpgradeText(rawBody),
    grossAmountCents,
    netAmountCents,
    currency,
    nonprofitSlug,
    nonprofitEin,
    donationDate,
    paymentMethod,
  };
}

export function secureDirectDonationUpgradeWebhookPathMatches(
  candidate: string,
  configured: string,
) {
  return configured.length >= 32 && constantTimeTextEqual(candidate, configured);
}

export function buildDirectDonationUpgradeCheckoutUrl(input: {
  obligation: DirectDonationUpgradeObligationRow;
  config: DirectDonationUpgradeConfig;
  siteUrl?: string;
}) {
  if (!input.config.readyForCheckout || !input.config.environment) {
    throw new Error(input.config.blockers[0] ?? "Direct Donation Upgrade checkout is unavailable.");
  }
  if (input.obligation.environment !== input.config.environment) {
    throw new Error("The obligation belongs to another Every.org environment.");
  }
  const host =
    input.config.environment === "live"
      ? "https://www.every.org"
      : "https://staging.every.org";
  const url = new URL(
    `/${encodeURIComponent(input.obligation.expected_recipient.primarySlug)}`,
    host,
  );
  const siteUrl = input.siteUrl ?? getSiteUrl();
  const returnPath = `/donation-upgrades/${input.obligation.offer_id}`;
  const metadata = createDirectDonationUpgradePartnerMetadata({
    obligationId: input.obligation.id,
    offerId: input.obligation.offer_id,
    participantProfileId: input.obligation.participant_profile_id,
    participantRole: input.obligation.participant_role,
    branch: input.obligation.branch,
    termsHash: input.obligation.terms_hash,
    partnerDonationId: input.obligation.partner_donation_id,
    metadataSecret: input.config.metadataSecret,
  });
  const amount = (input.obligation.expected_amount_cents / 100).toFixed(2);

  url.searchParams.set("amount", amount);
  url.searchParams.set("min_value", amount);
  url.searchParams.set("frequency", "ONCE");
  url.searchParams.set(
    "description",
    "Complete this direct Donation Upgrade obligation. Moral Trade records completion only after the exact Every.org partner webhook.",
  );
  url.searchParams.set(
    "success_url",
    new URL(
      `${returnPath}?message=${encodeURIComponent(
        "Donation submitted. Moral Trade is waiting for exact Every.org confirmation before recording fulfillment.",
      )}`,
      siteUrl,
    ).toString(),
  );
  url.searchParams.set(
    "exit_url",
    new URL(
      `${returnPath}?message=${encodeURIComponent(
        "Donation checkout was closed. No donation has been recorded.",
      )}`,
      siteUrl,
    ).toString(),
  );
  url.searchParams.set("partner_donation_id", input.obligation.partner_donation_id);
  url.searchParams.set(
    "partner_metadata",
    Buffer.from(JSON.stringify(metadata), "utf8").toString("base64"),
  );
  url.searchParams.set(
    "webhook_token",
    input.config.donateLinkWebhookToken,
  );
  url.searchParams.set("share_info", "false");
  url.searchParams.set("method", "card,bank,paypal,venmo,pay");
  url.hash = "donate";
  return url.toString();
}

export function buildDirectDonationUpgradeTermsHash(input: {
  creatorProfileId: string;
  creatorAmountCents: number;
  matcherAmountCents: number;
  originalRecipient: EveryOrgNonprofitIdentity;
  upgradedRecipient: EveryOrgNonprofitIdentity;
  matchDeadlineAt: string;
  privacyMode: DirectDonationUpgradePrivacyMode;
  environment: DirectDonationUpgradeEnvironment;
  baselineAttestation: string;
}) {
  return hashDirectDonationUpgradeValue({
    schemaVersion: "direct-donation-upgrade-terms-v1",
    creatorProfileId: input.creatorProfileId,
    creatorAmountCents: input.creatorAmountCents,
    matcherAmountCents: input.matcherAmountCents,
    currency: "USD",
    originalRecipientHash: input.originalRecipient.identityHash,
    upgradedRecipientHash: input.upgradedRecipient.identityHash,
    matchDeadlineAt: new Date(input.matchDeadlineAt).toISOString(),
    privacyMode: input.privacyMode,
    environment: input.environment,
    baselineVersion: DIRECT_DONATION_UPGRADE_BASELINE_VERSION,
    baselineAttestationHash: hashDirectDonationUpgradeText(input.baselineAttestation.trim()),
    matcherCommitmentVersion: DIRECT_DONATION_UPGRADE_MATCHER_COMMITMENT_VERSION,
    fulfillmentDays: DIRECT_DONATION_UPGRADE_FULFILLMENT_DAYS,
    webhookGraceHours: DIRECT_DONATION_UPGRADE_WEBHOOK_GRACE_HOURS,
  });
}
