import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import {
  type EveryOrgDonationTarget,
  findEveryOrgTargetForCauseArea,
  getEveryOrgDonationHref,
} from "@/lib/every-org";

import {
  MPGF_DEMO_BASE_URL,
  demoMpgfAssuranceRound,
  demoMpgfPublicGoodsCampaigns,
} from "./data";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsRound,
} from "./types";

export const MPGF_PUBLIC_GOODS_EVERY_ORG_FAST_ROUTE_POLICY =
  "every_org_fast_route_partner_webhook_auto_import_no_platform_custody";

export const MPGF_PUBLIC_GOODS_EVERY_ORG_PRIVACY_POLICY =
  "hash_private_donor_refs_import_public_partner_metadata_only";

export const MPGF_PUBLIC_GOODS_EVERY_ORG_DONATE_LINK_DOCS =
  "https://docs.every.org/docs/donate-link";

export const MPGF_PUBLIC_GOODS_EVERY_ORG_PARTNER_WEBHOOK_DOCS =
  "https://docs.every.org/docs/webhooks/partner-webhook";

type MpgfEveryOrgWebhookStatus = "recorded" | "needs_review" | "rejected";

interface MpgfEveryOrgPartnerMetadata {
  schema: "mpgf_every_org_partner_metadata_v1";
  policy: typeof MPGF_PUBLIC_GOODS_EVERY_ORG_FAST_ROUTE_POLICY;
  roundId: string;
  campaignId: string;
  pledgeIntentId?: string;
  conditionalPledgeId?: string;
  contributorRefHash?: string;
  generatedAt: string;
  redirectState: "pending_webhook_not_counted";
  noPlatformCustody: true;
  noGlobalMoralRanking: true;
}

export interface MpgfEveryOrgDonateLink {
  ok: true;
  policy: typeof MPGF_PUBLIC_GOODS_EVERY_ORG_FAST_ROUTE_POLICY;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_EVERY_ORG_PRIVACY_POLICY;
  roundId: string;
  campaignId: string;
  target: {
    id: string;
    title: string;
    nonprofitSlug: string;
    fundraiserSlug?: string;
  };
  href: string;
  partnerDonationId: string;
  partnerDonationIdHash: string;
  partnerMetadata: MpgfEveryOrgPartnerMetadata;
  partnerMetadataBase64: string;
  amountCents?: number;
  frequency: "ONCE";
  custodyMode: "non_custodial_every_org_or_partner_held";
  redirectState: "pending_webhook_not_counted";
  webhookRequiredBeforeCounting: true;
  reviewRequiredBeforeCounting: true;
  finalPayoutAuthorized: false;
  manualEvidenceFallbackPath: "/api/mpgf/evidence/manual";
  everyOrgDonateLinkDocs: typeof MPGF_PUBLIC_GOODS_EVERY_ORG_DONATE_LINK_DOCS;
  everyOrgPartnerWebhookDocs: typeof MPGF_PUBLIC_GOODS_EVERY_ORG_PARTNER_WEBHOOK_DOCS;
  donateLinkWebhookTokenIncluded: boolean;
  calcHash: string;
}

export interface MpgfEveryOrgPartnerWebhookPayload {
  [key: string]: unknown;
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

export interface MpgfEveryOrgPartnerWebhookEvent {
  ok: true;
  id: string;
  policy: typeof MPGF_PUBLIC_GOODS_EVERY_ORG_FAST_ROUTE_POLICY;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_EVERY_ORG_PRIVACY_POLICY;
  provider: "every_org";
  roundId: string;
  campaignId?: string;
  conditionalPledgeId?: string;
  pledgeIntentId?: string;
  contributorRefHash?: string;
  webhookArrivedBeforeSignIn: boolean;
  partnerDonationIdHash?: string;
  chargeIdHash: string;
  dedupeKey: string;
  dedupeBy: "charge_id_hash";
  nonprofitRefHash?: string;
  nonprofit?: {
    slug?: string;
    ein?: string;
    name?: string;
  };
  amountCents: number;
  netAmountCents?: number;
  currency: string;
  frequency?: string;
  donationDate?: string;
  paymentMethod?: string;
  status: MpgfEveryOrgWebhookStatus;
  structureVerified: boolean;
  webhookVerified: boolean;
  autoCreatesContributionEvidence: boolean;
  evidenceRecord: {
    id: string;
    source: "every_org_partner_webhook";
    reviewState: "pending_review" | "needs_review" | "rejected";
    countingState: "pending_review_not_counted";
  };
  reviewRequiredBeforeCounting: true;
  finalPayoutAuthorized: false;
  payloadHash: string;
  appendOnlyHash: string;
  receivedAt: string;
}

function hashScoped(scope: string, value: unknown) {
  return `sha256:${createHash("sha256")
    .update(`mpgf-every-org:${scope}:${typeof value === "string" ? value : JSON.stringify(value)}`)
    .digest("hex")}`;
}

function calcHash(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function objectField(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function clampCents(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function amountToCents(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function formatAmountCents(cents: number) {
  const clamped = clampCents(cents);

  return clamped > 0 ? (clamped / 100).toFixed(2) : undefined;
}

function slugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function campaignForId(campaignId: string, campaigns: MpgfPublicGoodsCampaign[]) {
  return campaigns.find((campaign) => campaign.id === campaignId || campaign.slug === campaignId) ?? null;
}

function targetForCampaign(campaign: MpgfPublicGoodsCampaign) {
  const candidates = [
    ...campaign.causeTags,
    campaign.title,
    campaign.publicSummary,
    campaign.destinationRef,
  ];

  for (const candidate of candidates) {
    const target = findEveryOrgTargetForCauseArea(candidate);

    if (target) {
      return target;
    }
  }

  return null;
}

function metadataToBase64(metadata: MpgfEveryOrgPartnerMetadata) {
  return Buffer.from(JSON.stringify(metadata), "utf8").toString("base64");
}

function parsePartnerMetadata(value: unknown): Partial<MpgfEveryOrgPartnerMetadata> {
  const object = objectField(value);

  if (object) {
    return object as Partial<MpgfEveryOrgPartnerMetadata>;
  }

  const encoded = stringField(value);

  if (!encoded) {
    return {};
  }

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);

    return objectField(parsed) as Partial<MpgfEveryOrgPartnerMetadata> ?? {};
  } catch {
    return {};
  }
}

function withDonateLinkParams(href: string, params: Record<string, string | undefined>) {
  const hashStart = href.indexOf("#");
  const base = hashStart >= 0 ? href.slice(0, hashStart) : href;
  const hash = hashStart >= 0 ? href.slice(hashStart) : "#donate";
  const url = new URL(base);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return `${url.toString()}${hash}`;
}

export function buildMpgfEveryOrgPartnerDonationId({
  campaignId,
  conditionalPledgeId,
  pledgeIntentId,
  roundId,
  userRef,
}: {
  campaignId: string;
  conditionalPledgeId?: string;
  pledgeIntentId?: string;
  roundId: string;
  userRef?: string;
}) {
  const opaque = hashScoped(
    "partner-donation-id",
    [
      roundId,
      campaignId,
      pledgeIntentId ?? null,
      conditionalPledgeId ?? null,
      userRef ? hashScoped("user-ref", userRef) : null,
    ],
  ).slice(7, 23);

  return `mpgf_${slugPart(campaignId).slice(0, 36)}_${opaque}`;
}

export function buildMpgfEveryOrgDonateLink({
  amountCents,
  campaignId,
  campaigns = demoMpgfPublicGoodsCampaigns,
  conditionalPledgeId,
  exitUrl = `${MPGF_DEMO_BASE_URL}/mpgf/contribute/cancel`,
  now = new Date("2026-06-01T12:00:00.000Z"),
  pledgeIntentId,
  round = demoMpgfAssuranceRound,
  roundId = round.id,
  successUrl,
  target,
  userRef,
  donateLinkWebhookToken,
}: {
  amountCents?: number;
  campaignId: string;
  campaigns?: MpgfPublicGoodsCampaign[];
  conditionalPledgeId?: string;
  exitUrl?: string;
  now?: Date;
  pledgeIntentId?: string;
  round?: MpgfPublicGoodsRound;
  roundId?: string;
  successUrl?: string;
  target?: EveryOrgDonationTarget;
  userRef?: string;
  donateLinkWebhookToken?: string;
}): MpgfEveryOrgDonateLink {
  if (roundId !== round.id) {
    throw new Error("MPGF Every.org Donate Link targets an unknown round.");
  }

  const campaign = campaignForId(campaignId, campaigns);

  if (!campaign) {
    throw new Error("MPGF Every.org Donate Link targets an unknown campaign.");
  }

  const resolvedTarget = target ?? targetForCampaign(campaign);

  if (!resolvedTarget) {
    throw new Error("MPGF Every.org Donate Link requires a curated Every.org target for the campaign.");
  }

  const partnerDonationId = buildMpgfEveryOrgPartnerDonationId({
    campaignId: campaign.id,
    conditionalPledgeId,
    pledgeIntentId,
    roundId,
    userRef,
  });
  const contributorRefHash = userRef?.trim() ? hashScoped("contributor-ref", userRef.trim()) : undefined;
  const partnerMetadata: MpgfEveryOrgPartnerMetadata = {
    schema: "mpgf_every_org_partner_metadata_v1",
    policy: MPGF_PUBLIC_GOODS_EVERY_ORG_FAST_ROUTE_POLICY,
    roundId,
    campaignId: campaign.id,
    pledgeIntentId: pledgeIntentId?.trim() || undefined,
    conditionalPledgeId: conditionalPledgeId?.trim() || pledgeIntentId?.trim() || undefined,
    contributorRefHash,
    generatedAt: now.toISOString(),
    redirectState: "pending_webhook_not_counted",
    noPlatformCustody: true,
    noGlobalMoralRanking: true,
  };
  const partnerMetadataBase64 = metadataToBase64(partnerMetadata);
  const pendingUrl =
    successUrl ??
    `${MPGF_DEMO_BASE_URL}/mpgf/contribute/every-org/pending?partnerDonationId=${encodeURIComponent(partnerDonationId)}`;
  const suggestedAmounts = resolvedTarget.suggestedAmounts?.length
    ? resolvedTarget.suggestedAmounts.join(",")
    : undefined;
  const href = withDonateLinkParams(getEveryOrgDonationHref(resolvedTarget), {
    amount: amountCents ? formatAmountCents(amountCents) : undefined,
    description: `External charity donation selected through Moral Trade MPGF for ${campaign.title}`,
    designation: `External recipient for MPGF campaign: ${campaign.title}`,
    exit_url: exitUrl,
    frequency: "ONCE",
    partner_donation_id: partnerDonationId,
    partner_metadata: partnerMetadataBase64,
    suggestedAmounts,
    success_url: pendingUrl,
    webhook_token: donateLinkWebhookToken?.trim() || undefined,
  });
  const partnerDonationIdHash = hashScoped("partner-donation-id", partnerDonationId);
  const calc = {
    amountCents: amountCents ? clampCents(amountCents) : undefined,
    campaignId: campaign.id,
    partnerDonationIdHash,
    partnerMetadata,
    roundId,
    targetId: resolvedTarget.id,
    donateLinkWebhookTokenIncluded: Boolean(
      donateLinkWebhookToken?.trim(),
    ),
  };

  return {
    ok: true,
    policy: MPGF_PUBLIC_GOODS_EVERY_ORG_FAST_ROUTE_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_EVERY_ORG_PRIVACY_POLICY,
    roundId,
    campaignId: campaign.id,
    target: {
      id: resolvedTarget.id,
      title: resolvedTarget.title,
      nonprofitSlug: resolvedTarget.nonprofitSlug,
      fundraiserSlug: resolvedTarget.fundraiserSlug,
    },
    href,
    partnerDonationId,
    partnerDonationIdHash,
    partnerMetadata,
    partnerMetadataBase64,
    amountCents: amountCents ? clampCents(amountCents) : undefined,
    frequency: "ONCE",
    custodyMode: "non_custodial_every_org_or_partner_held",
    redirectState: "pending_webhook_not_counted",
    webhookRequiredBeforeCounting: true,
    reviewRequiredBeforeCounting: true,
    finalPayoutAuthorized: false,
    manualEvidenceFallbackPath: "/api/mpgf/evidence/manual",
    everyOrgDonateLinkDocs: MPGF_PUBLIC_GOODS_EVERY_ORG_DONATE_LINK_DOCS,
    everyOrgPartnerWebhookDocs: MPGF_PUBLIC_GOODS_EVERY_ORG_PARTNER_WEBHOOK_DOCS,
    donateLinkWebhookTokenIncluded: Boolean(
      donateLinkWebhookToken?.trim(),
    ),
    calcHash: calcHash(calc),
  };
}

export function recordMpgfEveryOrgPartnerWebhook(
  payload: MpgfEveryOrgPartnerWebhookPayload,
  {
    campaigns = demoMpgfPublicGoodsCampaigns,
    receivedAt = new Date("2026-06-01T12:05:00.000Z").toISOString(),
    round = demoMpgfAssuranceRound,
    webhookVerified = false,
  }: {
    campaigns?: MpgfPublicGoodsCampaign[];
    receivedAt?: string;
    round?: MpgfPublicGoodsRound;
    webhookVerified?: boolean;
  } = {},
): MpgfEveryOrgPartnerWebhookEvent {
  const chargeId = stringField(payload.chargeId);

  if (!chargeId) {
    throw new Error("Every.org partner webhook payload requires chargeId for idempotency.");
  }

  const partnerDonationId = stringField(payload.partnerDonationId);
  const metadata = parsePartnerMetadata(payload.partnerMetadata);
  const campaign = metadata.campaignId ? campaignForId(metadata.campaignId, campaigns) : null;
  const amountCents = amountToCents(payload.amount);
  const netAmountCents = amountToCents(payload.netAmount);
  const currency = stringField(payload.currency)?.toUpperCase() ?? "USD";
  const chargeIdHash = hashScoped("charge-id", chargeId);
  const partnerDonationIdHash = partnerDonationId
    ? hashScoped("partner-donation-id", partnerDonationId)
    : undefined;
  const nonprofitRecord = objectField(payload.toNonprofit);
  const nonprofit = nonprofitRecord
    ? {
        slug: stringField(nonprofitRecord.slug),
        ein: stringField(nonprofitRecord.ein),
        name: stringField(nonprofitRecord.name),
      }
    : undefined;
  const nonprofitRefHash = nonprofit
    ? hashScoped("nonprofit", [nonprofit.slug ?? null, nonprofit.ein ?? null, nonprofit.name ?? null])
    : undefined;
  const structureVerified = Boolean(
    partnerDonationId &&
      metadata.policy === MPGF_PUBLIC_GOODS_EVERY_ORG_FAST_ROUTE_POLICY &&
      metadata.roundId === round.id &&
      campaign &&
      amountCents > 0 &&
      currency.length === 3,
  );
  const status: MpgfEveryOrgWebhookStatus = !webhookVerified
    ? "rejected"
    : structureVerified
      ? "recorded"
      : "needs_review";
  const payloadHash = hashScoped("partner-webhook-payload", payload);
  const appendOnlyHash = calcHash([
    chargeIdHash,
    partnerDonationIdHash ?? null,
    metadata.roundId ?? round.id,
    metadata.campaignId ?? null,
    metadata.conditionalPledgeId ?? null,
    metadata.pledgeIntentId ?? null,
    metadata.contributorRefHash ?? null,
    amountCents,
    netAmountCents || null,
    currency,
    stringField(payload.frequency) ?? null,
    stringField(payload.donationDate) ?? null,
    status,
    webhookVerified,
    structureVerified,
    payloadHash,
    receivedAt,
  ]);
  const evidenceReviewState =
    status === "recorded" ? "pending_review" : status === "needs_review" ? "needs_review" : "rejected";

  return {
    ok: true,
    id: `every-org-webhook-event-${chargeIdHash.slice(7, 19)}`,
    policy: MPGF_PUBLIC_GOODS_EVERY_ORG_FAST_ROUTE_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_EVERY_ORG_PRIVACY_POLICY,
    provider: "every_org",
    roundId: metadata.roundId ?? round.id,
    campaignId: campaign?.id,
    conditionalPledgeId: stringField(metadata.conditionalPledgeId),
    pledgeIntentId: stringField(metadata.pledgeIntentId),
    contributorRefHash: stringField(metadata.contributorRefHash),
    webhookArrivedBeforeSignIn: !stringField(metadata.contributorRefHash),
    partnerDonationIdHash,
    chargeIdHash,
    dedupeKey: chargeIdHash,
    dedupeBy: "charge_id_hash",
    nonprofitRefHash,
    nonprofit,
    amountCents,
    netAmountCents: netAmountCents > 0 ? netAmountCents : undefined,
    currency,
    frequency: stringField(payload.frequency),
    donationDate: stringField(payload.donationDate),
    paymentMethod: stringField(payload.paymentMethod),
    status,
    structureVerified,
    webhookVerified,
    autoCreatesContributionEvidence: status === "recorded",
    evidenceRecord: {
      id: `every-org-evidence-${chargeIdHash.slice(7, 19)}`,
      source: "every_org_partner_webhook",
      reviewState: evidenceReviewState,
      countingState: "pending_review_not_counted",
    },
    reviewRequiredBeforeCounting: true,
    finalPayoutAuthorized: false,
    payloadHash,
    appendOnlyHash,
    receivedAt,
  };
}
