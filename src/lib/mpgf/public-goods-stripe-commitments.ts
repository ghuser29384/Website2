import { createHash } from "node:crypto";

import {
  demoMpgfAssuranceRound,
  demoMpgfPublicGoodsCampaigns,
} from "./data";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsRound,
} from "./types";

export const MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY =
  "stripe_setup_intent_first_saved_commitment_no_long_lived_card_hold";

export const MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_PRIVACY_POLICY =
  "hash_stripe_customer_setup_payment_method_and_event_refs";

export const MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_DOCS =
  "https://docs.stripe.com/payments/setup-intents";

export const MPGF_PUBLIC_GOODS_STRIPE_PAYMENT_INTENT_LIFECYCLE_DOCS =
  "https://docs.stripe.com/payments/paymentintents/lifecycle";

export const MPGF_PUBLIC_GOODS_STRIPE_CAPTURE_DOCS =
  "https://docs.stripe.com/api/payment_intents/capture";

type StripeSetupStatus =
  | "setup_intent_created"
  | "setup_succeeded"
  | "setup_failed"
  | "revoked";

type StripeCommitmentWebhookStatus =
  | "recorded"
  | "needs_review"
  | "rejected";

const MPGF_STRIPE_SAVED_COMMITMENT_EVENT_TYPES = [
  "setup_intent.created",
  "setup_intent.succeeded",
  "setup_intent.setup_failed",
  "setup_intent.canceled",
  "payment_intent.created",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "payment_intent.requires_action",
] as const;

export type MpgfStripeSavedCommitmentEventType =
  (typeof MPGF_STRIPE_SAVED_COMMITMENT_EVENT_TYPES)[number];

type StripeCommitmentEventState =
  | "setup_succeeded_token_ready"
  | "setup_failed"
  | "payment_intent_created_after_gates"
  | "payment_intent_succeeded_pending_review"
  | "payment_intent_failed"
  | "payment_intent_requires_action"
  | "ignored";

interface MpgfStripeGateState {
  roundParametersLocked: boolean;
  thresholdAmountCleared: boolean;
  supporterCountCleared: boolean;
  reviewApproved: boolean;
  challengeWindowClosed: boolean;
}

interface MpgfStripeMetadata {
  purpose: "mpgf_public_goods_saved_commitment";
  policy: typeof MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY;
  roundId: string;
  campaignId: string;
  pledgeIntentId: string;
  conditionalPledgeId: string;
  amountCents: string;
  noGlobalMoralRanking: "true";
  finalPayoutAuthorized: "false";
}

export interface MpgfStripeSavedCommitmentSetup {
  ok: true;
  policy: typeof MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_PRIVACY_POLICY;
  roundId: string;
  campaignId: string;
  pledgeIntentId: string;
  conditionalPledgeId: string;
  userRefHash: string;
  amountCents: number;
  currency: "usd";
  provider: "stripe";
  setupStatus: StripeSetupStatus;
  setupIntentUsage: "off_session";
  setupIntentCreateParams: {
    usage: "off_session";
    automaticPaymentMethods: true;
    metadata: MpgfStripeMetadata;
  };
  futureUseAgreement: {
    explicitConsentRequired: true;
    chargeTiming: "only_after_threshold_review_and_challenge_gates_clear";
    frequency: "one_time_campaign_commitment";
    amountDetermination: "fixed_pledge_amount_cents_plus_published_round_rules";
  };
  providerCustomerIdHash?: string;
  providerSetupIntentIdHash?: string;
  providerPaymentMethodIdHash?: string;
  rawCardDataStored: false;
  createsChargeImmediately: false;
  longLivedManualCardHold: false;
  paymentIntentCreatedBeforeGates: false;
  requiresStripeSignatureWebhook: true;
  reviewRequiredBeforeCounting: true;
  finalPayoutAuthorized: false;
  docs: {
    setupIntents: typeof MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_DOCS;
    lifecycle: typeof MPGF_PUBLIC_GOODS_STRIPE_PAYMENT_INTENT_LIFECYCLE_DOCS;
    capture: typeof MPGF_PUBLIC_GOODS_STRIPE_CAPTURE_DOCS;
  };
  calcHash: string;
}

export interface MpgfStripeSavedCommitmentWebhookPayload {
  [key: string]: unknown;
  id?: unknown;
  type?: unknown;
  data?: {
    object?: Record<string, unknown>;
  };
}

export interface MpgfStripeSavedCommitmentWebhookEvent {
  ok: true;
  id: string;
  policy: typeof MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_PRIVACY_POLICY;
  provider: "stripe";
  providerEventIdHash: string;
  providerObjectIdHash?: string;
  providerCustomerIdHash?: string;
  providerPaymentMethodIdHash?: string;
  roundId?: string;
  campaignId?: string;
  pledgeIntentId?: string;
  conditionalPledgeId?: string;
  amountCents?: number;
  eventType: MpgfStripeSavedCommitmentEventType;
  eventState: StripeCommitmentEventState;
  status: StripeCommitmentWebhookStatus;
  signatureVerified: boolean;
  structureVerified: boolean;
  stateChangeAllowed: boolean;
  paymentMethodToken?: {
    id: string;
    provider: "stripe";
    setupStatus: "setup_succeeded";
    providerCustomerIdHash: string;
    providerPaymentMethodIdHash: string;
    rawCardDataStored: false;
  };
  reviewRequiredBeforeCounting: true;
  finalPayoutAuthorized: false;
  payloadHash: string;
  appendOnlyHash: string;
  receivedAt: string;
}

export interface MpgfStripeConditionalPaymentIntentPlan {
  ok: true;
  policy: typeof MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_PRIVACY_POLICY;
  roundId: string;
  campaignId: string;
  pledgeIntentId: string;
  conditionalPledgeId: string;
  amountCents: number;
  currency: "usd";
  provider: "stripe";
  gateState: MpgfStripeGateState;
  blockedBy: string[];
  paymentIntentCreationAllowed: boolean;
  creationPolicy: "create_payment_intent_only_after_threshold_review_and_challenge";
  setupIntentFirst: true;
  longLivedManualCardHold: false;
  confirmOffSession: true;
  captureMethod: "automatic";
  providerCustomerIdHash: string;
  providerPaymentMethodIdHash: string;
  providerSetupIntentIdHash: string;
  metadata: MpgfStripeMetadata;
  idempotencyKeyHash: string;
  requiresStripeSignatureWebhookBeforeCounting: true;
  reviewRequiredBeforeCounting: true;
  finalPayoutAuthorized: false;
  calcHash: string;
}

function hashScoped(scope: string, value: unknown) {
  return `sha256:${createHash("sha256")
    .update(`mpgf-stripe-commitment:${scope}:${typeof value === "string" ? value : JSON.stringify(value)}`)
    .digest("hex")}`;
}

function calcHash(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function objectField(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
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

function metadataFor(input: {
  amountCents: number;
  campaignId: string;
  conditionalPledgeId: string;
  pledgeIntentId: string;
  roundId: string;
}): MpgfStripeMetadata {
  return {
    purpose: "mpgf_public_goods_saved_commitment",
    policy: MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY,
    roundId: input.roundId,
    campaignId: input.campaignId,
    pledgeIntentId: input.pledgeIntentId,
    conditionalPledgeId: input.conditionalPledgeId,
    amountCents: String(input.amountCents),
    noGlobalMoralRanking: "true",
    finalPayoutAuthorized: "false",
  };
}

function readMetadata(object: Record<string, unknown>) {
  return objectField(object.metadata) ?? {};
}

function isMpgfStripeSavedCommitmentEventType(
  eventType: string,
): eventType is MpgfStripeSavedCommitmentEventType {
  return (MPGF_STRIPE_SAVED_COMMITMENT_EVENT_TYPES as readonly string[]).includes(eventType);
}

function eventStateFor(
  eventType: MpgfStripeSavedCommitmentEventType,
  objectStatus?: string,
): StripeCommitmentEventState {
  if (eventType === "setup_intent.succeeded" || (eventType.startsWith("setup_intent.") && objectStatus === "succeeded")) {
    return "setup_succeeded_token_ready";
  }

  if (eventType === "setup_intent.setup_failed" || eventType === "setup_intent.canceled") {
    return "setup_failed";
  }

  if (eventType === "payment_intent.created") {
    return "payment_intent_created_after_gates";
  }

  if (eventType === "payment_intent.succeeded") {
    return "payment_intent_succeeded_pending_review";
  }

  if (eventType === "payment_intent.payment_failed" || eventType === "payment_intent.canceled") {
    return "payment_intent_failed";
  }

  if (eventType === "payment_intent.requires_action" || objectStatus === "requires_action") {
    return "payment_intent_requires_action";
  }

  return "ignored";
}

function gateBlockers(gateState: MpgfStripeGateState) {
  const blockers: string[] = [];

  if (!gateState.roundParametersLocked) {
    blockers.push("round_parameters_not_locked");
  }

  if (!gateState.thresholdAmountCleared) {
    blockers.push("amount_threshold_not_cleared");
  }

  if (!gateState.supporterCountCleared) {
    blockers.push("supporter_count_not_cleared");
  }

  if (!gateState.reviewApproved) {
    blockers.push("review_not_approved");
  }

  if (!gateState.challengeWindowClosed) {
    blockers.push("challenge_window_open");
  }

  return blockers;
}

export function createMpgfStripeSavedCommitmentSetup({
  amountCents,
  campaignId,
  campaigns = demoMpgfPublicGoodsCampaigns,
  conditionalPledgeId,
  now = new Date("2026-06-01T12:00:00.000Z"),
  pledgeIntentId,
  providerCustomerRef,
  providerPaymentMethodRef,
  providerSetupIntentRef,
  round = demoMpgfAssuranceRound,
  roundId = round.id,
  userRef,
}: {
  amountCents: number;
  campaignId: string;
  campaigns?: MpgfPublicGoodsCampaign[];
  conditionalPledgeId?: string;
  now?: Date;
  pledgeIntentId?: string;
  providerCustomerRef?: string;
  providerPaymentMethodRef?: string;
  providerSetupIntentRef?: string;
  round?: MpgfPublicGoodsRound;
  roundId?: string;
  userRef: string;
}): MpgfStripeSavedCommitmentSetup {
  if (roundId !== round.id) {
    throw new Error("MPGF Stripe saved commitment targets an unknown round.");
  }

  const campaign = campaignForId(campaignId, campaigns);

  if (!campaign) {
    throw new Error("MPGF Stripe saved commitment targets an unknown campaign.");
  }

  if (!userRef.trim()) {
    throw new Error("MPGF Stripe saved commitment requires a private user reference.");
  }

  const normalizedAmountCents = clampCents(amountCents);

  if (normalizedAmountCents <= 0) {
    throw new Error("MPGF Stripe saved commitment amount must be positive cents.");
  }

  const stablePledgeIntentId =
    pledgeIntentId?.trim() ||
    `pledge-intent-${slugPart(campaign.id)}-${hashScoped("pledge-intent", [roundId, campaign.id, userRef, normalizedAmountCents]).slice(7, 19)}`;
  const stableConditionalPledgeId = conditionalPledgeId?.trim() || stablePledgeIntentId;
  const metadata = metadataFor({
    amountCents: normalizedAmountCents,
    campaignId: campaign.id,
    conditionalPledgeId: stableConditionalPledgeId,
    pledgeIntentId: stablePledgeIntentId,
    roundId,
  });
  const providerSetupIntentIdHash = providerSetupIntentRef?.trim()
    ? hashScoped("setup-intent", providerSetupIntentRef.trim())
    : undefined;
  const providerPaymentMethodIdHash = providerPaymentMethodRef?.trim()
    ? hashScoped("payment-method", providerPaymentMethodRef.trim())
    : undefined;
  const providerCustomerIdHash = providerCustomerRef?.trim()
    ? hashScoped("customer", providerCustomerRef.trim())
    : undefined;

  return {
    ok: true,
    policy: MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_PRIVACY_POLICY,
    roundId,
    campaignId: campaign.id,
    pledgeIntentId: stablePledgeIntentId,
    conditionalPledgeId: stableConditionalPledgeId,
    userRefHash: hashScoped("user-ref", userRef.trim()),
    amountCents: normalizedAmountCents,
    currency: "usd",
    provider: "stripe",
    setupStatus: providerSetupIntentIdHash ? "setup_intent_created" : "setup_intent_created",
    setupIntentUsage: "off_session",
    setupIntentCreateParams: {
      usage: "off_session",
      automaticPaymentMethods: true,
      metadata,
    },
    futureUseAgreement: {
      explicitConsentRequired: true,
      chargeTiming: "only_after_threshold_review_and_challenge_gates_clear",
      frequency: "one_time_campaign_commitment",
      amountDetermination: "fixed_pledge_amount_cents_plus_published_round_rules",
    },
    providerCustomerIdHash,
    providerSetupIntentIdHash,
    providerPaymentMethodIdHash,
    rawCardDataStored: false,
    createsChargeImmediately: false,
    longLivedManualCardHold: false,
    paymentIntentCreatedBeforeGates: false,
    requiresStripeSignatureWebhook: true,
    reviewRequiredBeforeCounting: true,
    finalPayoutAuthorized: false,
    docs: {
      setupIntents: MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_DOCS,
      lifecycle: MPGF_PUBLIC_GOODS_STRIPE_PAYMENT_INTENT_LIFECYCLE_DOCS,
      capture: MPGF_PUBLIC_GOODS_STRIPE_CAPTURE_DOCS,
    },
    calcHash: calcHash([
      MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY,
      roundId,
      campaign.id,
      stablePledgeIntentId,
      stableConditionalPledgeId,
      hashScoped("user-ref", userRef.trim()),
      normalizedAmountCents,
      providerCustomerIdHash ?? null,
      providerSetupIntentIdHash ?? null,
      providerPaymentMethodIdHash ?? null,
      now.toISOString(),
    ]),
  };
}

export function isMpgfStripeSavedCommitmentEvent(
  eventType: string,
  metadata: Record<string, unknown> = {},
): eventType is MpgfStripeSavedCommitmentEventType {
  if (!isMpgfStripeSavedCommitmentEventType(eventType)) {
    return false;
  }

  return (
    stringField(metadata.purpose) === "mpgf_public_goods_saved_commitment" ||
    eventType.startsWith("setup_intent.") ||
    (
      eventType.startsWith("payment_intent.") &&
      stringField(metadata.policy) === MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY
    )
  );
}

export function recordMpgfStripeSavedCommitmentWebhook(
  payload: MpgfStripeSavedCommitmentWebhookPayload,
  {
    receivedAt = new Date("2026-06-01T12:05:00.000Z").toISOString(),
    signatureVerified = false,
  }: {
    receivedAt?: string;
    signatureVerified?: boolean;
  } = {},
): MpgfStripeSavedCommitmentWebhookEvent {
  const eventId = stringField(payload.id);
  const rawEventType = stringField(payload.type);
  const object = objectField(payload.data)?.object ? objectField(objectField(payload.data)?.object) ?? {} : {};
  const metadata = readMetadata(object);
  const objectId = stringField(object.id);
  const customerId = stringField(object.customer);
  const paymentMethodId = stringField(object.payment_method);
  const amountCents = Number(stringField(metadata.amountCents) ?? object.amount);

  if (!eventId) {
    throw new Error("MPGF Stripe saved commitment webhook requires a Stripe event id.");
  }

  if (!rawEventType || !isMpgfStripeSavedCommitmentEvent(rawEventType, metadata)) {
    throw new Error("MPGF Stripe saved commitment webhook requires a supported Stripe event type.");
  }

  const eventType = rawEventType;
  const eventState = eventStateFor(eventType, stringField(object.status));
  const structureVerified = Boolean(
    objectId &&
      isMpgfStripeSavedCommitmentEvent(eventType, metadata) &&
      stringField(metadata.policy) === MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY,
  );
  const status: StripeCommitmentWebhookStatus = !signatureVerified
    ? "rejected"
    : structureVerified
      ? "recorded"
      : "needs_review";
  const providerEventIdHash = hashScoped("event", eventId);
  const providerObjectIdHash = objectId ? hashScoped("object", objectId) : undefined;
  const providerCustomerIdHash = customerId ? hashScoped("customer", customerId) : undefined;
  const providerPaymentMethodIdHash = paymentMethodId ? hashScoped("payment-method", paymentMethodId) : undefined;
  const payloadHash = hashScoped("payload", payload);
  const appendOnlyHash = calcHash([
    providerEventIdHash,
    providerObjectIdHash ?? null,
    providerCustomerIdHash ?? null,
    providerPaymentMethodIdHash ?? null,
    eventType,
    eventState,
    status,
    signatureVerified,
    structureVerified,
    metadata.roundId ?? null,
    metadata.campaignId ?? null,
    metadata.pledgeIntentId ?? null,
    metadata.conditionalPledgeId ?? null,
    payloadHash,
    receivedAt,
  ]);
  const tokenReady = eventState === "setup_succeeded_token_ready" && providerCustomerIdHash && providerPaymentMethodIdHash;

  return {
    ok: true,
    id: `stripe-saved-commitment-event-${providerEventIdHash.slice(7, 19)}`,
    policy: MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_PRIVACY_POLICY,
    provider: "stripe",
    providerEventIdHash,
    providerObjectIdHash,
    providerCustomerIdHash,
    providerPaymentMethodIdHash,
    roundId: stringField(metadata.roundId),
    campaignId: stringField(metadata.campaignId),
    pledgeIntentId: stringField(metadata.pledgeIntentId),
    conditionalPledgeId: stringField(metadata.conditionalPledgeId),
    amountCents: Number.isInteger(amountCents) && amountCents >= 0 ? amountCents : undefined,
    eventType,
    eventState,
    status,
    signatureVerified,
    structureVerified,
    stateChangeAllowed: status === "recorded",
    paymentMethodToken: tokenReady
      ? {
          id: `stripe-payment-method-token-${providerPaymentMethodIdHash.slice(7, 19)}`,
          provider: "stripe",
          setupStatus: "setup_succeeded",
          providerCustomerIdHash,
          providerPaymentMethodIdHash,
          rawCardDataStored: false,
        }
      : undefined,
    reviewRequiredBeforeCounting: true,
    finalPayoutAuthorized: false,
    payloadHash,
    appendOnlyHash,
    receivedAt,
  };
}

export function buildMpgfStripeConditionalPaymentIntentPlan({
  amountCents,
  campaignId,
  campaigns = demoMpgfPublicGoodsCampaigns,
  conditionalPledgeId,
  gateState,
  pledgeIntentId,
  providerCustomerRef,
  providerPaymentMethodRef,
  providerSetupIntentRef,
  round = demoMpgfAssuranceRound,
  roundId = round.id,
}: {
  amountCents: number;
  campaignId: string;
  campaigns?: MpgfPublicGoodsCampaign[];
  conditionalPledgeId: string;
  gateState: MpgfStripeGateState;
  pledgeIntentId: string;
  providerCustomerRef: string;
  providerPaymentMethodRef: string;
  providerSetupIntentRef: string;
  round?: MpgfPublicGoodsRound;
  roundId?: string;
}): MpgfStripeConditionalPaymentIntentPlan {
  if (roundId !== round.id) {
    throw new Error("MPGF Stripe conditional PaymentIntent targets an unknown round.");
  }

  const campaign = campaignForId(campaignId, campaigns);

  if (!campaign) {
    throw new Error("MPGF Stripe conditional PaymentIntent targets an unknown campaign.");
  }

  const normalizedAmountCents = clampCents(amountCents);

  if (normalizedAmountCents <= 0) {
    throw new Error("MPGF Stripe conditional PaymentIntent amount must be positive cents.");
  }

  for (const [field, value] of Object.entries({ providerCustomerRef, providerPaymentMethodRef, providerSetupIntentRef })) {
    if (!value.trim()) {
      throw new Error(`MPGF Stripe conditional PaymentIntent requires ${field}.`);
    }
  }

  const providerCustomerIdHash = hashScoped("customer", providerCustomerRef.trim());
  const providerPaymentMethodIdHash = hashScoped("payment-method", providerPaymentMethodRef.trim());
  const providerSetupIntentIdHash = hashScoped("setup-intent", providerSetupIntentRef.trim());
  const metadata = metadataFor({
    amountCents: normalizedAmountCents,
    campaignId: campaign.id,
    conditionalPledgeId,
    pledgeIntentId,
    roundId,
  });
  const blockedBy = gateBlockers(gateState);
  const paymentIntentCreationAllowed = blockedBy.length === 0;
  const idempotencyKeyHash = hashScoped("payment-intent-idempotency", [
    roundId,
    campaign.id,
    pledgeIntentId,
    conditionalPledgeId,
    normalizedAmountCents,
    providerSetupIntentIdHash,
  ]);
  const calc = [
    MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY,
    metadata,
    gateState,
    blockedBy,
    providerCustomerIdHash,
    providerPaymentMethodIdHash,
    providerSetupIntentIdHash,
    idempotencyKeyHash,
  ];

  return {
    ok: true,
    policy: MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_PRIVACY_POLICY,
    roundId,
    campaignId: campaign.id,
    pledgeIntentId,
    conditionalPledgeId,
    amountCents: normalizedAmountCents,
    currency: "usd",
    provider: "stripe",
    gateState,
    blockedBy,
    paymentIntentCreationAllowed,
    creationPolicy: "create_payment_intent_only_after_threshold_review_and_challenge",
    setupIntentFirst: true,
    longLivedManualCardHold: false,
    confirmOffSession: true,
    captureMethod: "automatic",
    providerCustomerIdHash,
    providerPaymentMethodIdHash,
    providerSetupIntentIdHash,
    metadata,
    idempotencyKeyHash,
    requiresStripeSignatureWebhookBeforeCounting: true,
    reviewRequiredBeforeCounting: true,
    finalPayoutAuthorized: false,
    calcHash: calcHash(calc),
  };
}
