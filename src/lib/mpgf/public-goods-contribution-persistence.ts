import { createHash } from "node:crypto";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

import {
  MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_FLOW,
  MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_PRIVACY_POLICY,
  MPGF_PUBLIC_GOODS_CROSS_VIEW_CLEARANCE_POLICY,
  MPGF_PUBLIC_GOODS_DONOR_EXPOSURE_DISCLOSURE_POLICY,
  type MpgfPublicGoodsIdentityVerification,
  type MpgfPublicGoodsPaymentAuthorization,
  type MpgfPublicGoodsPaymentAuthorizationStatus,
  type MpgfPublicGoodsPledgeIntent,
  type MpgfPublicGoodsPledgeIntentPaymentState,
  type MpgfPublicGoodsProviderPaymentEvent,
} from "./public-goods-contribution-intents";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

type MpgfPledgeIntentRow = Database["public"]["Tables"]["mpgf_pledge_intents"]["Row"];
type MpgfPledgeIntentUpdate = Database["public"]["Tables"]["mpgf_pledge_intents"]["Update"];
type MpgfIdentityVerificationInsert =
  Database["public"]["Tables"]["mpgf_identity_verifications"]["Insert"];
type MpgfPaymentAuthorizationRow =
  Database["public"]["Tables"]["mpgf_payment_authorizations"]["Row"];
type MpgfPaymentAuthorizationInsert =
  Database["public"]["Tables"]["mpgf_payment_authorizations"]["Insert"];
type MpgfPaymentAuthorizationUpdate =
  Database["public"]["Tables"]["mpgf_payment_authorizations"]["Update"];
type MpgfProviderPaymentEventInsert =
  Database["public"]["Tables"]["mpgf_provider_payment_events"]["Insert"];
type MpgfConditionalPledgeUpdate =
  Database["public"]["Tables"]["mpgf_conditional_pledges"]["Update"];
type MpgfConditionalPledgeRow =
  Database["public"]["Tables"]["mpgf_conditional_pledges"]["Row"];

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function hasMpgfContributionPersistence() {
  return hasSupabaseEnv() && hasServiceRoleEnv();
}

export function mpgfContributionPersistenceUnavailable() {
  return {
    ok: false,
    status: "not_configured" as const,
    warning:
      "Supabase service-role persistence is required before MPGF contribution-intent state can be confirmed.",
  };
}

function calcHash(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function hashRawPayload(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function fullFallbackRule(): MpgfPublicGoodsPledgeIntent["fallbackRule"] {
  return {
    manualEvidencePath: "/api/mpgf/evidence/manual",
    legacyManualEvidencePath: "/api/mpgf/contributions/manual-evidence",
    providerUnavailableMode: "manual_evidence_after_review",
    roundNotClearedMode: "expire_without_charge",
    recipientVerificationFailedMode: "release_authorization_or_reroute_to_next_eligible_common_ground_project",
    authorizationExpiredMode: "reauthorize_only_after_clearance_reconfirmed",
  };
}

function fallbackRule(value: Json): MpgfPublicGoodsPledgeIntent["fallbackRule"] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;

    if (
      record.manualEvidencePath === "/api/mpgf/evidence/manual" &&
      record.legacyManualEvidencePath === "/api/mpgf/contributions/manual-evidence" &&
      record.providerUnavailableMode === "manual_evidence_after_review"
    ) {
      return fullFallbackRule();
    }
  }

  return fullFallbackRule();
}

function donorExposureDisclosure(row: MpgfPledgeIntentRow): MpgfPublicGoodsPledgeIntent["donorExposureDisclosure"] {
  const existing = row.donor_exposure_disclosure;

  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    const record = existing as Record<string, unknown>;
    const exactClearanceConditions = Array.isArray(record.exactClearanceConditions)
      ? record.exactClearanceConditions.filter((condition): condition is string => typeof condition === "string")
      : [];

    if (
      typeof record.maxExposureCents === "number" &&
      exactClearanceConditions.length > 0 &&
      typeof record.roundFailureBehavior === "string" &&
      typeof record.recipientVerificationFailureBehavior === "string" &&
      typeof record.authorizationTiming === "string" &&
      typeof record.authorizationExpiryBehavior === "string"
    ) {
      return {
        maxExposureCents: record.maxExposureCents,
        exactClearanceConditions,
        roundFailureBehavior: record.roundFailureBehavior,
        recipientVerificationFailureBehavior: record.recipientVerificationFailureBehavior,
        authorizationTiming: record.authorizationTiming,
        authorizationExpiryBehavior: record.authorizationExpiryBehavior,
      };
    }
  }

  const maxExposureCents = Number(row.max_exposure_cents || row.amount_cents);
  const minimumCounterpartyClearedCents = Number(row.minimum_counterparty_cleared_cents || 100);

  return {
    maxExposureCents,
    exactClearanceConditions: [
      "fixed round rulebook is published before the round opens",
      `at least ${minimumCounterpartyClearedCents} cents clears from accepted distinct counterpart buckets`,
      "identity, anti-sybil, anti-threat, baseline, recipient-review, and challenge-window gates pass",
      "authorization or custody happens near clearing instead of as a long-lived round-open hold",
    ],
    roundFailureBehavior: "The pledge expires without charge if round conditions fail.",
    recipientVerificationFailureBehavior:
      "Release the authorization or reroute only under the donor fallback rule after recipient review fails.",
    authorizationTiming:
      "Save the payment method or external route first; authorize or capture only after threshold, review, and challenge gates clear.",
    authorizationExpiryBehavior:
      "If the provider authorization expires before capture, re-confirm clearance and reauthorize instead of silently charging later.",
  };
}

function pledgeIntentFromRow(
  row: MpgfPledgeIntentRow,
  conditionalPledge?: MpgfConditionalPledgeRow | null,
): MpgfPublicGoodsPledgeIntent {
  return {
    id: row.id,
    roundId: row.round_id,
    campaignId: row.campaign_id,
    userRefHash: row.user_ref_hash,
    idempotencyKeyHash: row.idempotency_key_hash,
    amountCents: Number(row.amount_cents),
    acceptableCounterpartBuckets: row.acceptable_counterpart_buckets,
    minimumCounterpartyClearedCents: Number(row.minimum_counterparty_cleared_cents),
    counterpartDistinctBucketRequired: true,
    maxExposureCents: Number(row.max_exposure_cents || row.amount_cents),
    paymentMode: conditionalPledge?.payment_mode ?? "every_org_fast_route",
    visibilityMode: row.visibility_pref,
    paymentState: row.payment_state,
    countingState: row.counting_state,
    fallbackRule: fallbackRule(row.fallback_rule),
    donorExposureDisclosure: donorExposureDisclosure(row),
    crossViewClearancePolicy: MPGF_PUBLIC_GOODS_CROSS_VIEW_CLEARANCE_POLICY,
    donorExposureDisclosurePolicy: MPGF_PUBLIC_GOODS_DONOR_EXPOSURE_DISCLOSURE_POLICY,
    capturePolicy: row.capture_policy,
    primaryFlow: MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_FLOW,
    privacyPolicy: MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_PRIVACY_POLICY,
    createdAt: row.created_at,
    calcHash: calcHash([
      row.id,
      row.round_id,
      row.campaign_id,
      row.user_ref_hash,
      row.idempotency_key_hash,
      row.amount_cents,
      row.acceptable_counterpart_buckets,
      row.minimum_counterparty_cleared_cents,
      row.max_exposure_cents,
      row.payment_state,
      row.counting_state,
    ]),
  };
}

function serviceClient() {
  return createServiceClient() as SupabaseServiceAny;
}

export async function loadMpgfPledgeIntentForProfile(intentId: string, profileId: string) {
  const supabase = serviceClient();
  const read = await supabase
    .from("mpgf_pledge_intents")
    .select("*")
    .eq("id", intentId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (read.error) {
    throw new Error(`Could not load MPGF pledge intent: ${read.error.message}`);
  }

  if (!read.data) {
    throw new Error("MPGF pledge intent was not found for the signed-in participant.");
  }

  const conditionalPledgeRead = await supabase
    .from("mpgf_conditional_pledges")
    .select("*")
    .eq("id", intentId)
    .maybeSingle();

  if (conditionalPledgeRead.error) {
    throw new Error(`Could not load MPGF conditional pledge: ${conditionalPledgeRead.error.message}`);
  }

  return pledgeIntentFromRow(
    read.data as MpgfPledgeIntentRow,
    conditionalPledgeRead.data as MpgfConditionalPledgeRow | null,
  );
}

export async function loadMpgfPaymentAuthorization(paymentAuthorizationId: string) {
  const read = await serviceClient()
    .from("mpgf_payment_authorizations")
    .select("*")
    .eq("id", paymentAuthorizationId)
    .maybeSingle();

  if (read.error) {
    throw new Error(`Could not load MPGF payment authorization: ${read.error.message}`);
  }

  if (!read.data) {
    throw new Error("MPGF payment authorization was not found for the provider event.");
  }

  return read.data as MpgfPaymentAuthorizationRow;
}

function toIdentityVerificationRow(
  identityVerification: MpgfPublicGoodsIdentityVerification,
): MpgfIdentityVerificationInsert {
  return {
    id: identityVerification.id,
    pledge_intent_id: identityVerification.pledgeIntentId,
    provider: identityVerification.provider,
    status: identityVerification.status,
    human_score_bps: identityVerification.humanScoreBps,
    redacted_reference: identityVerification.redactedReference,
    duplicate_proof_hash: identityVerification.duplicateProofHash ?? null,
    counts_for_matching: identityVerification.countsForMatching,
    verified_at: identityVerification.verifiedAt ?? null,
    expires_at: identityVerification.expiresAt,
  };
}

function toPaymentAuthorizationRow(
  paymentAuthorization: MpgfPublicGoodsPaymentAuthorization,
): MpgfPaymentAuthorizationInsert {
  return {
    id: paymentAuthorization.id,
    pledge_intent_id: paymentAuthorization.pledgeIntentId,
    provider: paymentAuthorization.provider,
    provider_ref_hash: paymentAuthorization.providerRefHash ?? null,
    amount_cents: paymentAuthorization.amountCents,
    currency: "usd",
    status: paymentAuthorization.status,
    capture_policy: paymentAuthorization.capturePolicy,
    manual_evidence_path: paymentAuthorization.manualEvidencePath ?? null,
    authorized_at: paymentAuthorization.authorizedAt ?? null,
  };
}

function toProviderPaymentEventRow(
  providerPaymentEvent: MpgfPublicGoodsProviderPaymentEvent,
  rawPayload: string,
): MpgfProviderPaymentEventInsert {
  return {
    id: providerPaymentEvent.id,
    payment_authorization_id: providerPaymentEvent.paymentAuthorizationId,
    pledge_intent_id: providerPaymentEvent.pledgeIntentId,
    provider: providerPaymentEvent.provider,
    provider_event_ref_hash: providerPaymentEvent.providerEventRefHash,
    event_type: providerPaymentEvent.eventType,
    amount_cents: providerPaymentEvent.amountCents,
    status: providerPaymentEvent.status,
    signature_verified: providerPaymentEvent.signatureVerified,
    payload_hash: hashRawPayload(rawPayload),
    final_payout_authorized: false,
    append_only_hash: providerPaymentEvent.appendOnlyHash,
    received_at: providerPaymentEvent.receivedAt,
  };
}

async function updatePledgeIntentState(
  pledgeIntentId: string,
  update: MpgfPledgeIntentUpdate,
) {
  const write = await serviceClient()
    .from("mpgf_pledge_intents")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", pledgeIntentId);

  if (write.error) {
    throw new Error(`Could not update MPGF pledge intent state: ${write.error.message}`);
  }
}

async function updateConditionalPledgeState(
  conditionalPledgeId: string,
  update: MpgfConditionalPledgeUpdate,
) {
  const write = await serviceClient()
    .from("mpgf_conditional_pledges")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", conditionalPledgeId);

  if (write.error) {
    throw new Error(`Could not update MPGF conditional pledge state: ${write.error.message}`);
  }
}

export async function persistMpgfIdentityVerificationState(input: {
  identityVerification: MpgfPublicGoodsIdentityVerification;
  pledgeIntent: MpgfPublicGoodsPledgeIntent;
}) {
  if (!hasMpgfContributionPersistence()) {
    return mpgfContributionPersistenceUnavailable();
  }

  const row = toIdentityVerificationRow(input.identityVerification);
  const write = await serviceClient()
    .from("mpgf_identity_verifications")
    .upsert(row, { onConflict: "id" });

  if (write.error) {
    throw new Error(`Could not persist MPGF identity verification: ${write.error.message}`);
  }

  await updatePledgeIntentState(input.pledgeIntent.id, {
    payment_state: input.pledgeIntent.paymentState,
    counting_state: input.pledgeIntent.countingState,
  });
  await updateConditionalPledgeState(input.pledgeIntent.id, { status: "pending_verification" });

  return {
    ok: true,
    status: "persisted" as const,
    identityVerificationId: row.id,
    pledgeIntentId: row.pledge_intent_id,
  };
}

export async function persistMpgfPaymentAuthorizationState(input: {
  paymentAuthorization: MpgfPublicGoodsPaymentAuthorization;
  pledgeIntent: MpgfPublicGoodsPledgeIntent;
}) {
  if (!hasMpgfContributionPersistence()) {
    return mpgfContributionPersistenceUnavailable();
  }

  const row = toPaymentAuthorizationRow(input.paymentAuthorization);
  const write = await serviceClient()
    .from("mpgf_payment_authorizations")
    .upsert(row, { onConflict: "id" });

  if (write.error) {
    throw new Error(`Could not persist MPGF payment authorization: ${write.error.message}`);
  }

  await updatePledgeIntentState(input.pledgeIntent.id, {
    payment_state: input.pledgeIntent.paymentState,
    counting_state: input.pledgeIntent.countingState,
  });
  await updateConditionalPledgeState(input.pledgeIntent.id, { status: "pending_verification" });

  return {
    ok: true,
    status: "persisted" as const,
    paymentAuthorizationId: row.id,
    pledgeIntentId: row.pledge_intent_id,
  };
}

function paymentAuthorizationStatusForEvent(
  providerPaymentEvent: MpgfPublicGoodsProviderPaymentEvent,
): MpgfPublicGoodsPaymentAuthorizationStatus {
  if (providerPaymentEvent.status === "rejected") {
    return "failed";
  }

  switch (providerPaymentEvent.eventType) {
    case "authorization_failed":
    case "capture_failed":
      return "failed";
    case "capture_succeeded":
      return "captured";
    case "refund_succeeded":
      return "voided";
    case "payment_expired":
      return "expired";
    case "authorization_created":
      return "provider_event_received";
  }
}

function pledgePaymentStateForAuthorizationStatus(
  status: MpgfPublicGoodsPaymentAuthorizationStatus,
): MpgfPublicGoodsPledgeIntentPaymentState {
  switch (status) {
    case "captured":
      return "captured";
    case "voided":
      return "voided";
    case "expired":
      return "expired";
    case "failed":
    case "requires_identity":
    case "manual_fallback_required":
      return "manual_evidence_required";
    case "authorized":
      return "authorized";
    case "provider_event_received":
      return "provider_event_received";
  }
}

export async function persistMpgfProviderPaymentEventState(input: {
  paymentAuthorization: MpgfPaymentAuthorizationRow;
  providerPaymentEvent: MpgfPublicGoodsProviderPaymentEvent;
  rawPayload: string;
}) {
  if (!hasMpgfContributionPersistence()) {
    return mpgfContributionPersistenceUnavailable();
  }

  const row = toProviderPaymentEventRow(input.providerPaymentEvent, input.rawPayload);
  const write = await serviceClient()
    .from("mpgf_provider_payment_events")
    .insert(row);

  if (write.error) {
    if (write.error.code === "23505") {
      return {
        ok: true,
        status: "duplicate" as const,
        providerPaymentEventId: row.id,
        paymentAuthorizationId: row.payment_authorization_id,
        pledgeIntentId: row.pledge_intent_id,
      };
    }

    throw new Error(`Could not persist MPGF provider payment event: ${write.error.message}`);
  }

  const authorizationStatus = paymentAuthorizationStatusForEvent(input.providerPaymentEvent);
  const authorizationUpdate: MpgfPaymentAuthorizationUpdate = {
    status: authorizationStatus,
  };

  if (authorizationStatus === "captured") {
    authorizationUpdate.captured_at = input.providerPaymentEvent.receivedAt;
  }

  const authorizationWrite = await serviceClient()
    .from("mpgf_payment_authorizations")
    .update(authorizationUpdate)
    .eq("id", input.paymentAuthorization.id);

  if (authorizationWrite.error) {
    throw new Error(`Could not update MPGF payment authorization event state: ${authorizationWrite.error.message}`);
  }

  await updatePledgeIntentState(input.paymentAuthorization.pledge_intent_id, {
    payment_state: pledgePaymentStateForAuthorizationStatus(authorizationStatus),
    counting_state: input.providerPaymentEvent.status === "recorded" ? "eligible_pending_thresholds" : "not_counted",
  });

  return {
    ok: true,
    status: "persisted" as const,
    providerPaymentEventId: row.id,
    paymentAuthorizationId: row.payment_authorization_id,
    pledgeIntentId: row.pledge_intent_id,
  };
}
