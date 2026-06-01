import { createHash } from "node:crypto";

import {
  demoMpgfAssuranceRound,
  demoMpgfPublicGoodsCampaigns,
} from "./data";
import { evaluateMpgfPublicGoodsIdentityAdapter } from "./public-goods-identity";
import { resolveMpgfPublicGoodsPaymentAdapter } from "./public-goods-payment-adapter";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsIdentityAttestation,
  MpgfPublicGoodsRound,
  MpgfPublicGoodsVisibilityMode,
} from "./types";

export const MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_PRIVACY_POLICY =
  "pledge_intents_use_hashed_user_provider_and_idempotency_refs";

export const MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_FLOW =
  "verify_identity_then_conditionally_authorize_payment_manual_evidence_fallback";

export type MpgfPublicGoodsContributionMode =
  | "every_org_fast_route"
  | "stripe_setup_intent_saved_commitment"
  | "manual_proof_fallback";

export type MpgfPublicGoodsPledgeIntentPaymentState =
  | "intent_created"
  | "identity_verified"
  | "identity_pending_review"
  | "authorization_pending"
  | "authorized"
  | "manual_evidence_required"
  | "provider_event_received"
  | "captured"
  | "voided"
  | "expired";

export type MpgfPublicGoodsPledgeIntentCountingState =
  | "not_counted"
  | "preview_only"
  | "eligible_pending_thresholds"
  | "counted_after_review"
  | "excluded";

export type MpgfPublicGoodsPaymentAuthorizationStatus =
  | "requires_identity"
  | "authorized"
  | "manual_fallback_required"
  | "provider_event_received"
  | "captured"
  | "failed"
  | "voided"
  | "expired";

export type MpgfPublicGoodsProviderPaymentEventType =
  | "authorization_created"
  | "authorization_failed"
  | "capture_succeeded"
  | "capture_failed"
  | "refund_succeeded"
  | "payment_expired";

export interface MpgfPublicGoodsPledgeIntent {
  id: string;
  roundId: string;
  campaignId: string;
  userRefHash: string;
  idempotencyKeyHash: string;
  amountCents: number;
  paymentMode: MpgfPublicGoodsContributionMode;
  visibilityMode: MpgfPublicGoodsVisibilityMode;
  paymentState: MpgfPublicGoodsPledgeIntentPaymentState;
  countingState: MpgfPublicGoodsPledgeIntentCountingState;
  fallbackRule: {
    manualEvidencePath: "/api/mpgf/evidence/manual";
    legacyManualEvidencePath: "/api/mpgf/contributions/manual-evidence";
    providerUnavailableMode: "manual_evidence_after_review";
  };
  capturePolicy: "capture_only_after_threshold_review_and_challenge_window";
  primaryFlow: typeof MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_FLOW;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_PRIVACY_POLICY;
  createdAt: string;
  calcHash: string;
}

export interface MpgfPublicGoodsIdentityVerification {
  id: string;
  pledgeIntentId: string;
  provider: MpgfPublicGoodsIdentityAttestation["provider"];
  status: "verified" | "pending_review" | "duplicate_identity" | "blocked";
  humanScoreBps: number;
  redactedReference: string;
  duplicateProofHash?: string;
  countsForMatching: boolean;
  verifiedAt?: string;
  expiresAt: string;
  warnings: string[];
  calcHash: string;
}

export interface MpgfPublicGoodsPaymentAuthorization {
  id: string;
  pledgeIntentId: string;
  provider: "stripe" | "fiscal_host" | "external_provider" | "manual_evidence";
  providerRefHash?: string;
  amountCents: number;
  status: MpgfPublicGoodsPaymentAuthorizationStatus;
  capturePolicy: "capture_only_after_threshold_review_and_challenge_window";
  manualEvidencePath?: "/api/mpgf/evidence/manual";
  authorizationMode:
    | "provider_managed_conditional_authorization"
    | "manual_evidence_fallback_after_provider_unavailable";
  requiresProviderWebhook: boolean;
  reviewRequiredBeforeCounting: true;
  finalPayoutAuthorized: false;
  authorizedAt?: string;
  calcHash: string;
}

export interface MpgfPublicGoodsProviderPaymentEvent {
  id: string;
  pledgeIntentId: string;
  paymentAuthorizationId: string;
  provider: MpgfPublicGoodsPaymentAuthorization["provider"];
  providerEventRefHash: string;
  eventType: MpgfPublicGoodsProviderPaymentEventType;
  amountCents: number;
  status: "recorded" | "needs_review" | "rejected";
  signatureVerified: boolean;
  reviewRequiredBeforeCounting: true;
  finalPayoutAuthorized: false;
  receivedAt: string;
  appendOnlyHash: string;
}

function hashValue(scope: string, value: string) {
  return `sha256:${createHash("sha256").update(`mpgf-public-goods:${scope}:${value}`).digest("hex")}`;
}

function calcHash(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function clampCents(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
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

export function getMpgfPublicGoodsContributionFlowApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  return {
    ok: true,
    roundId,
    primaryFlow: MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_FLOW,
    privacyPolicy: MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_PRIVACY_POLICY,
    modeOrder: [
      {
        mode: "every_org_fast_route" as const,
        label: "Fast route",
        provider: "every_org",
        verification: "partner_webhook_auto_import_before_counting",
        custodyMode: "non_custodial_every_org_or_partner_held",
        partnerDonationIdRequired: true,
      },
      {
        mode: "stripe_setup_intent_saved_commitment" as const,
        label: "Saved commitment",
        provider: "stripe",
        verification: "setup_intent_first_then_payment_intent_after_threshold_review_challenge",
        custodyMode: "stripe_provider_state_not_platform_custody",
        rawCardDataStored: false,
      },
      {
        mode: "manual_proof_fallback" as const,
        label: "Manual proof fallback",
        provider: "manual_evidence",
        verification: "reviewer_verified_external_or_fiscal_host_evidence",
        custodyMode: "external_handoff_no_platform_custody",
        fallbackOnly: true,
      },
    ],
    defaultContributionMode: "every_org_fast_route" as const,
    savedCommitmentPolicy: "setup_intent_first_payment_intent_only_after_threshold_review_and_challenge",
    pledgeIntentPath: `/api/mpgf/rounds/${roundId}/pledge-intents`,
    identityVerificationPathTemplate: "/api/mpgf/pledge-intents/:id/verify-identity",
    paymentAuthorizationPathTemplate: "/api/mpgf/pledge-intents/:id/authorize-payment",
    providerWebhookPath: "/api/mpgf/provider-events/webhook",
    manualEvidenceFallbackPath: "/api/mpgf/evidence/manual",
    legacyManualEvidenceFallbackPath: "/api/mpgf/contributions/manual-evidence",
    stateObjects: [
      "pledge_intent",
      "identity_verification",
      "payment_authorization",
      "provider_payment_event",
    ],
    guarantees: [
      "identity verification precedes provider authorization",
      "Every.org fast-route donations count only after partner webhook import",
      "Stripe saved commitments use SetupIntent-first instead of long-lived card holds",
      "payments capture only after threshold, review, and challenge gates",
      "manual evidence is fallback, not the primary path",
      "provider webhooks cannot authorize final payout by themselves",
    ],
  };
}

export function createMpgfPublicGoodsPledgeIntent({
  round = demoMpgfAssuranceRound,
  campaigns = demoMpgfPublicGoodsCampaigns,
  roundId = round.id,
  campaignId,
  userId,
  amountCents,
  paymentMode = "stripe_setup_intent_saved_commitment",
  visibilityMode = "private_amount",
  idempotencyKey,
  now = new Date("2026-05-31T12:00:00.000Z"),
}: {
  round?: MpgfPublicGoodsRound;
  campaigns?: MpgfPublicGoodsCampaign[];
  roundId?: string;
  campaignId: string;
  userId: string;
  amountCents: number;
  paymentMode?: MpgfPublicGoodsContributionMode;
  visibilityMode?: MpgfPublicGoodsVisibilityMode;
  idempotencyKey?: string;
  now?: Date;
}): MpgfPublicGoodsPledgeIntent {
  if (roundId !== round.id) {
    throw new Error("MPGF pledge intent targets an unknown round.");
  }

  const campaign = campaignForId(campaignId, campaigns);

  if (!campaign) {
    throw new Error("MPGF pledge intent targets an unknown public-goods campaign.");
  }

  if (!userId.trim()) {
    throw new Error("MPGF pledge intent requires an authenticated user.");
  }

  const normalizedAmountCents = clampCents(amountCents);

  if (normalizedAmountCents <= 0) {
    throw new Error("MPGF pledge intent amount must be a positive number of cents.");
  }

  const stableKey = idempotencyKey?.trim() || `${roundId}:${campaign.id}:${userId}:${normalizedAmountCents}`;
  const id = `pledge-intent-${slugPart(campaign.id)}-${hashValue("intent-id", stableKey).slice(7, 19)}`;
  const idempotencyKeyHash = hashValue("idempotency", stableKey);
  const userRefHash = hashValue("user-ref", userId);

  return {
    id,
    roundId,
    campaignId: campaign.id,
    userRefHash,
    idempotencyKeyHash,
    amountCents: normalizedAmountCents,
    paymentMode,
    visibilityMode,
    paymentState: "intent_created",
    countingState: "preview_only",
    fallbackRule: {
      manualEvidencePath: "/api/mpgf/evidence/manual",
      legacyManualEvidencePath: "/api/mpgf/contributions/manual-evidence",
      providerUnavailableMode: "manual_evidence_after_review",
    },
    capturePolicy: "capture_only_after_threshold_review_and_challenge_window",
    primaryFlow: MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_FLOW,
    privacyPolicy: MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_PRIVACY_POLICY,
    createdAt: now.toISOString(),
    calcHash: calcHash([roundId, campaign.id, userRefHash, idempotencyKeyHash, normalizedAmountCents, paymentMode, visibilityMode]),
  };
}

export function verifyMpgfPublicGoodsPledgeIntentIdentity(
  pledgeIntent: MpgfPublicGoodsPledgeIntent,
  input: {
    userId: string;
    provider?: MpgfPublicGoodsIdentityAttestation["provider"];
    humanScoreBps?: number;
    duplicateUserRefs?: string[];
    providerPayload?: Record<string, unknown>;
    now?: Date;
  },
): {
  pledgeIntent: MpgfPublicGoodsPledgeIntent;
  identityVerification: MpgfPublicGoodsIdentityVerification;
  nextAction: "authorize_payment" | "manual_review_identity";
} {
  const now = input.now ?? new Date("2026-05-31T12:00:00.000Z");
  const adapter = evaluateMpgfPublicGoodsIdentityAdapter({
    userId: input.userId,
    provider: input.provider ?? "repository_profile",
    humanScoreBps: input.humanScoreBps,
    duplicateUserRefs: input.duplicateUserRefs,
    providerPayload: input.providerPayload,
  });
  const status =
    adapter.eligibilityHint === "eligible"
      ? "verified"
      : adapter.eligibilityHint === "duplicate_identity"
        ? "duplicate_identity"
        : adapter.eligibilityHint === "blocked"
          ? "blocked"
          : "pending_review";
  const duplicateProofHash = adapter.duplicateUserRefs.length > 0
    ? hashValue("duplicate-proof", adapter.duplicateUserRefs.sort().join("|"))
    : undefined;
  const identityVerification: MpgfPublicGoodsIdentityVerification = {
    id: `identity-verification-${pledgeIntent.id}`,
    pledgeIntentId: pledgeIntent.id,
    provider: adapter.attestation.provider,
    status,
    humanScoreBps: adapter.attestation.humanScoreBps,
    redactedReference: adapter.attestation.redactedReference,
    duplicateProofHash,
    countsForMatching: status === "verified",
    verifiedAt: status === "verified" ? now.toISOString() : undefined,
    expiresAt: adapter.attestation.expiresAt,
    warnings: adapter.warnings,
    calcHash: calcHash([
      pledgeIntent.id,
      adapter.attestation.provider,
      status,
      adapter.attestation.humanScoreBps,
      adapter.attestation.redactedReference,
      duplicateProofHash ?? null,
    ]),
  };

  return {
    pledgeIntent: {
      ...pledgeIntent,
      paymentState: status === "verified" ? "identity_verified" : "identity_pending_review",
      countingState: status === "verified" ? "eligible_pending_thresholds" : "not_counted",
      calcHash: calcHash([pledgeIntent.calcHash, identityVerification.calcHash]),
    },
    identityVerification,
    nextAction: status === "verified" ? "authorize_payment" : "manual_review_identity",
  };
}

export function authorizeMpgfPublicGoodsPledgeIntentPayment(
  pledgeIntent: MpgfPublicGoodsPledgeIntent,
  input: {
    campaign?: MpgfPublicGoodsCampaign;
    identityVerification?: MpgfPublicGoodsIdentityVerification;
    provider?: MpgfPublicGoodsPaymentAuthorization["provider"];
    providerPaymentRef?: string;
    providerAvailable?: boolean;
    now?: Date;
  } = {},
): {
  pledgeIntent: MpgfPublicGoodsPledgeIntent;
  paymentAuthorization: MpgfPublicGoodsPaymentAuthorization;
} {
  const now = input.now ?? new Date("2026-05-31T12:05:00.000Z");
  const campaign = input.campaign ?? campaignForId(pledgeIntent.campaignId, demoMpgfPublicGoodsCampaigns);

  if (!campaign) {
    throw new Error("MPGF payment authorization targets an unknown public-goods campaign.");
  }

  const identityVerified =
    input.identityVerification?.status === "verified" || pledgeIntent.paymentState === "identity_verified";

  if (!identityVerified || (input.identityVerification?.status && input.identityVerification.status !== "verified")) {
    return manualFallbackAuthorization(pledgeIntent, "requires_identity", now);
  }

  if (input.providerAvailable === false || input.provider === "manual_evidence") {
    return manualFallbackAuthorization(pledgeIntent, "manual_fallback_required", now);
  }

  const providerPaymentRef = input.providerPaymentRef?.trim();

  if (!providerPaymentRef) {
    return manualFallbackAuthorization(pledgeIntent, "manual_fallback_required", now);
  }

  const paymentAdapter = resolveMpgfPublicGoodsPaymentAdapter({
    campaign,
    captureMode: "stored_payment_method",
    paymentIntentRef: providerPaymentRef,
  });

  if (paymentAdapter.blockers.length > 0) {
    return manualFallbackAuthorization(pledgeIntent, "manual_fallback_required", now);
  }

  const provider = input.provider ?? (campaign.destinationType === "fiscal_host" ? "fiscal_host" : "stripe");
  const providerRefHash = hashValue("provider-payment-ref", providerPaymentRef);
  const paymentAuthorization: MpgfPublicGoodsPaymentAuthorization = {
    id: `payment-authorization-${pledgeIntent.id}`,
    pledgeIntentId: pledgeIntent.id,
    provider,
    providerRefHash,
    amountCents: pledgeIntent.amountCents,
    status: "authorized",
    capturePolicy: "capture_only_after_threshold_review_and_challenge_window",
    authorizationMode: "provider_managed_conditional_authorization",
    requiresProviderWebhook: true,
    reviewRequiredBeforeCounting: true,
    finalPayoutAuthorized: false,
    authorizedAt: now.toISOString(),
    calcHash: calcHash([pledgeIntent.id, provider, providerRefHash, pledgeIntent.amountCents, "authorized"]),
  };

  return {
    pledgeIntent: {
      ...pledgeIntent,
      paymentState: "authorized",
      calcHash: calcHash([pledgeIntent.calcHash, paymentAuthorization.calcHash]),
    },
    paymentAuthorization,
  };
}

function manualFallbackAuthorization(
  pledgeIntent: MpgfPublicGoodsPledgeIntent,
  status: "requires_identity" | "manual_fallback_required",
  now: Date,
): {
  pledgeIntent: MpgfPublicGoodsPledgeIntent;
  paymentAuthorization: MpgfPublicGoodsPaymentAuthorization;
} {
  const paymentState: MpgfPublicGoodsPledgeIntentPaymentState =
    status === "requires_identity" ? "identity_pending_review" : "manual_evidence_required";
  const paymentAuthorization: MpgfPublicGoodsPaymentAuthorization = {
    id: `payment-authorization-${pledgeIntent.id}`,
    pledgeIntentId: pledgeIntent.id,
    provider: "manual_evidence",
    amountCents: pledgeIntent.amountCents,
    status,
    capturePolicy: "capture_only_after_threshold_review_and_challenge_window",
    manualEvidencePath: "/api/mpgf/evidence/manual",
    authorizationMode: "manual_evidence_fallback_after_provider_unavailable",
    requiresProviderWebhook: false,
    reviewRequiredBeforeCounting: true,
    finalPayoutAuthorized: false,
    authorizedAt: status === "manual_fallback_required" ? now.toISOString() : undefined,
    calcHash: calcHash([pledgeIntent.id, "manual_evidence", pledgeIntent.amountCents, status]),
  };

  return {
    pledgeIntent: {
      ...pledgeIntent,
      paymentState,
      countingState: "not_counted",
      calcHash: calcHash([pledgeIntent.calcHash, paymentAuthorization.calcHash]),
    },
    paymentAuthorization,
  };
}

export function recordMpgfPublicGoodsProviderPaymentEvent(
  paymentAuthorization: MpgfPublicGoodsPaymentAuthorization,
  input: {
    providerEventRef: string;
    eventType: MpgfPublicGoodsProviderPaymentEventType;
    amountCents?: number;
    signatureVerified: boolean;
    receivedAt?: string;
  },
): MpgfPublicGoodsProviderPaymentEvent {
  if (!input.providerEventRef.trim()) {
    throw new Error("MPGF provider payment events require a provider event reference.");
  }

  const amountCents = clampCents(input.amountCents ?? paymentAuthorization.amountCents);
  const providerEventRefHash = hashValue("provider-event-ref", input.providerEventRef);
  const status = input.signatureVerified && amountCents === paymentAuthorization.amountCents
    ? "recorded"
    : input.signatureVerified
      ? "needs_review"
      : "rejected";
  const receivedAt = input.receivedAt ?? new Date("2026-05-31T12:10:00.000Z").toISOString();
  const appendOnlyHash = calcHash([
    paymentAuthorization.id,
    paymentAuthorization.pledgeIntentId,
    paymentAuthorization.provider,
    providerEventRefHash,
    input.eventType,
    amountCents,
    status,
    input.signatureVerified,
    receivedAt,
  ]);

  return {
    id: `provider-payment-event-${appendOnlyHash.slice(7, 19)}`,
    pledgeIntentId: paymentAuthorization.pledgeIntentId,
    paymentAuthorizationId: paymentAuthorization.id,
    provider: paymentAuthorization.provider,
    providerEventRefHash,
    eventType: input.eventType,
    amountCents,
    status,
    signatureVerified: input.signatureVerified,
    reviewRequiredBeforeCounting: true,
    finalPayoutAuthorized: false,
    receivedAt,
    appendOnlyHash,
  };
}
