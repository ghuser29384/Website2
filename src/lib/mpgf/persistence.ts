import { createHash } from "node:crypto";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import {
  demoAlternatives,
  demoCycle,
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
} from "./data";
import {
  FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION,
  isCurrentFailureBonusEligibilityPolicy,
  type FailureBonusEligibilityPolicy,
  type FailureBonusSuccessPremiumPayer,
  type FailureBonusSuccessPremiumPricingAssumptions,
  type FailureBonusSuccessPremiumScheduleQuote,
} from "./failure-bonus-success-premium";
import {
  validateStoredFailureBonusSchedule,
  validateSubmittedFailureBonusSchedule,
  type FailureBonusScheduleStatus,
} from "./failure-bonus-threshold-editor";
import { assertMpgfPublicGoodsCohortAccess, createMpgfPublicGoodsPledge } from "./mechanism";
import type { MpgfParticipantState, MpgfPoolProposalRecord } from "./participant-types";
import {
  bucketMpgfPublicGoodsAmountCents,
  recordMpgfPublicGoodsAnalyticsEvent,
} from "./public-goods-analytics";
import { evaluateMpgfPublicGoodsIdentityAdapter } from "./public-goods-identity";
import { resolveMpgfPublicGoodsPaymentAdapter } from "./public-goods-payment-adapter";
import type {
  MpgfBallot,
  MpgfBallotWeight,
  MpgfPledge,
  MpgfPublicGoodsCaptureMode,
  MpgfPublicGoodsDestinationType,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsSubscription,
  MpgfPublicGoodsVisibilityMode,
  MpgfRecurringContributionCommitment,
} from "./types";

type SupabaseAny = Awaited<ReturnType<typeof createClient>> & {
  from: (table: string) => any;
};

interface DbErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

export interface MpgfParticipantIdentity {
  userId?: string;
  displayName?: string;
}

export interface RecordPledgesInput extends Required<MpgfParticipantIdentity> {
  idempotencyKey: string;
  oneTimeAmountCents: number;
  monthlyAmountCents: number;
}

export interface SavePoolProposalInput extends Required<MpgfParticipantIdentity> {
  idempotencyKey: string;
  title: string;
  summary: string;
  causeArea: string;
  problem: string;
  intervention: string;
  moralPublicGoodRationale: string;
  requestedMaximumFundingCents: number;
  minimumViableFundingCents?: number;
  outcomeUnitLabel: string;
  outcomeUnitDefinition: string;
  referenceAlternative?: string;
  measurementMethod: string;
  uncertaintyDescription?: string;
  expectedEffectVsFunding: string;
  timeline: string;
  milestones: string;
  risks: string;
  misusePathways: string;
  proposedRecipientName?: string;
  implementingTeam: string;
  publicGoodsDestinationType?: MpgfPublicGoodsDestinationType;
  publicGoodsDestinationRef?: string;
  publicGoodsThresholdAmountCents?: number;
  publicGoodsThresholdSupporters?: number;
  publicGoodsFailureBonusEnabled?: boolean;
  publicGoodsFailureBonusRateBps?: number;
  publicGoodsFailureBonusEligibilityPolicy?: FailureBonusEligibilityPolicy;
  publicGoodsFailureBonusMaxParticipants?: number;
  publicGoodsFailureBonusMaxPerParticipantCents?: number;
  publicGoodsThresholdSchedule?: FailureBonusSuccessPremiumScheduleQuote;
  publicGoodsSuccessPremiumRateBps?: number;
  publicGoodsSuccessPremiumCents?: number;
  publicGoodsSuccessPremiumPayer?: "pool_creator_or_sponsor";
  publicGoodsSuccessPremiumPolicyVersion?: string;
  publicGoodsSuccessPremiumIncludedInNetThreshold?: false;
  publicGoodsSuccessPremiumProvisional?: true;
  publicGoodsGrossSuccessRequirementCents?: number;
  publicGoodsSuccessPremiumPricingAssumptions?: FailureBonusSuccessPremiumPricingAssumptions;
  publicGoodsDeadlineAt?: string;
  publicGoodsVerificationMethod?: string;
  publicGoodsBaselineRule?: string;
  publicGoodsExitRule?: string;
  publicGoodsBaseMatchRatio?: number;
  publicGoodsQfEnabled?: boolean;
  publicGoodsQfCapMultiple?: number;
  publicGoodsPayoutMethod?: MpgfPublicGoodsCaptureMode;
  intent: "draft" | "submitted";
}

export interface RecordPublicGoodsPledgeInput extends Required<MpgfParticipantIdentity> {
  email?: string | null;
  idempotencyKey: string;
  campaignId: string;
  amountCents: number;
  acceptableCounterpartBuckets?: string[] | string;
  minimumCounterpartyClearedCents?: number;
  visibilityMode: MpgfPublicGoodsVisibilityMode;
  captureMode: MpgfPublicGoodsCaptureMode;
  isRecurring: boolean;
  supporterReason?: string;
}

export interface SaveBallotInput extends Required<MpgfParticipantIdentity> {
  idempotencyKey: string;
  weightsByAlternativeId: Record<string, number>;
  intent: "draft" | "submitted";
}

function summarizeDbError(error: DbErrorLike) {
  return [error.code, error.message || error.details].filter(Boolean).join(": ") || "unknown database error";
}

function isMissingRelationError(error: DbErrorLike) {
  return error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? "");
}

function isMissingColumnError(error: DbErrorLike) {
  return error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");
}

function isForeignKeyError(error: DbErrorLike) {
  return error.code === "23503";
}

function isUniqueViolationError(error: DbErrorLike) {
  return error.code === "23505";
}

function toStringOrUndefined(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function toNumber(value: unknown, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numeric) ? numeric : fallback;
}

function toPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer number of cents.`);
  }

  return value;
}

function toOptionalPositiveInteger(value: number | undefined, label: string) {
  if (value == null || value === 0) {
    return undefined;
  }

  return toPositiveInteger(value, label);
}

function toRequiredTrimmed(value: string, label: string, minLength = 1) {
  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    throw new Error(`${label} is required.`);
  }

  return trimmed;
}

function toLineItems(value: string, label: string) {
  const items = value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    throw new Error(`${label} requires at least one entry.`);
  }

  return items;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function hashMutationRequest(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function normalizeIdempotencyKey(value: string) {
  const trimmed = value.trim();

  if (!/^[A-Za-z0-9._:-]{12,160}$/.test(trimmed)) {
    throw new Error("MPGF mutation requires a scoped idempotency key.");
  }

  return trimmed;
}

async function reserveIdempotency<T>(
  supabase: SupabaseAny,
  input: {
    scope: string;
    idempotencyKey: string;
    actorUserId: string;
    action: string;
    request: unknown;
  },
): Promise<{ replayed: false; id: string } | { replayed: true; result: T }> {
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  const requestHash = hashMutationRequest(input.request);
  const inserted = await supabase
    .from("mpgf_idempotency_keys")
    .insert({
      scope: input.scope,
      idempotency_key: idempotencyKey,
      actor_user_id: input.actorUserId,
      action: input.action,
      request_hash: requestHash,
      cycle_id: demoCycle.id,
      status: "received",
    })
    .select("id")
    .single();

  if (!inserted.error) {
    return { replayed: false, id: String(inserted.data.id) };
  }

  if (isMissingRelationError(inserted.error) || isMissingColumnError(inserted.error)) {
    throw new Error(
      `MPGF idempotency table is unavailable: ${summarizeDbError(inserted.error)}. Apply 20260516_mpgf_participant_mutation_controls.sql.`,
    );
  }

  if (!isUniqueViolationError(inserted.error)) {
    throw new Error(`Could not reserve MPGF idempotency key: ${summarizeDbError(inserted.error)}`);
  }

  const existing = await supabase
    .from("mpgf_idempotency_keys")
    .select("id, request_hash, status, response_reference_json")
    .eq("scope", input.scope)
    .eq("idempotency_key", idempotencyKey)
    .single();

  if (existing.error) {
    throw new Error(`Could not read MPGF idempotency key: ${summarizeDbError(existing.error)}`);
  }

  const row = existing.data as Record<string, unknown>;
  if (row.request_hash !== requestHash) {
    await supabase.from("mpgf_idempotency_keys").update({ status: "conflict" }).eq("id", row.id);
    throw new Error("MPGF idempotency key was reused for a different request.");
  }

  if (row.status === "completed") {
    const response = row.response_reference_json as Record<string, unknown> | null;
    if (response && "result" in response) {
      return { replayed: true, result: response.result as T };
    }
  }

  throw new Error(`MPGF idempotency key is already ${String(row.status)} for this request.`);
}

async function completeIdempotency(
  supabase: SupabaseAny,
  reservation: { replayed: false; id: string },
  result: unknown,
) {
  const completed = await supabase
    .from("mpgf_idempotency_keys")
    .update({ status: "completed", response_reference_json: { result } })
    .eq("id", reservation.id);

  if (completed.error) {
    throw new Error(`Could not complete MPGF idempotency key: ${summarizeDbError(completed.error)}`);
  }
}

async function failIdempotency(supabase: SupabaseAny, reservation: { replayed: false; id: string }) {
  await supabase.from("mpgf_idempotency_keys").update({ status: "failed" }).eq("id", reservation.id);
}

async function recordParticipantMutationEvidence(
  supabase: SupabaseAny,
  input: {
    actorUserId: string;
    action: string;
    objectType: string;
    objectId: string;
    fromStatus?: string | null;
    toStatus: string;
    reason: string;
    eventJson?: Record<string, unknown>;
  },
) {
  const transition = await supabase.from("mpgf_state_transition_logs").insert({
    object_type: input.objectType,
    object_id: input.objectId,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus,
    actor_user_id: input.actorUserId,
    reason: input.reason,
  });

  if (transition.error && (isMissingRelationError(transition.error) || isMissingColumnError(transition.error))) {
    throw new Error(
      `MPGF state-transition log is unavailable: ${summarizeDbError(transition.error)}. Apply 20260516_mpgf_participant_mutation_controls.sql.`,
    );
  }

  if (transition.error) {
    throw new Error(`Could not write MPGF state-transition log: ${summarizeDbError(transition.error)}`);
  }

  const event = await supabase.from("mpgf_operational_events").insert({
    event_type: input.action,
    cycle_id: demoCycle.id,
    status: "recorded",
    event_json: {
      objectType: input.objectType,
      objectId: input.objectId,
      toStatus: input.toStatus,
      actorUserId: input.actorUserId,
      ...input.eventJson,
    },
  });

  if (event.error && (isMissingRelationError(event.error) || isMissingColumnError(event.error))) {
    throw new Error(
      `MPGF operational event log is unavailable: ${summarizeDbError(event.error)}. Apply 20260516_mpgf_participant_mutation_controls.sql.`,
    );
  }

  if (event.error) {
    throw new Error(`Could not write MPGF operational event: ${summarizeDbError(event.error)}`);
  }
}

function stringArrayFromJson(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      const record = item as Record<string, unknown>;
      return toStringOrUndefined(record.label) ?? toStringOrUndefined(record.text) ?? toStringOrUndefined(record.risk);
    })
    .filter((item): item is string => Boolean(item));
}

function implementingTeamFromJson(value: unknown) {
  const record = value as Record<string, unknown> | null;

  return toStringOrUndefined(record?.summary);
}

function coerceSuccessPremiumPayer(value: unknown): FailureBonusSuccessPremiumPayer | undefined {
  return value === "pool_creator_or_sponsor" || value === "contributors_pro_rata" ? value : undefined;
}

function successPremiumAssumptionsFromJson(
  value: unknown,
): FailureBonusSuccessPremiumPricingAssumptions | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const assumptions = {
    successProbabilityBps: toNumber(record.successProbabilityBps, Number.NaN),
    failureBonusRateBps: toNumber(record.failureBonusRateBps, Number.NaN),
    expectedEligibleFailureFillBps: toNumber(record.expectedEligibleFailureFillBps, Number.NaN),
    expenseLoadBps: toNumber(record.expenseLoadBps, Number.NaN),
    reserveRiskMarginBps: toNumber(record.reserveRiskMarginBps, Number.NaN),
  };

  return Object.values(assumptions).every(Number.isSafeInteger) ? assumptions : undefined;
}

function failureBonusEligibilityPolicyFromJson(
  value: unknown,
): FailureBonusEligibilityPolicy | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const policy = value as FailureBonusEligibilityPolicy;
  return isCurrentFailureBonusEligibilityPolicy(policy) ? policy : undefined;
}

function failureBonusScheduleStatusFromRow(
  value: unknown,
): FailureBonusScheduleStatus | undefined {
  return value === "pending_review" || value === "approved" ? value : undefined;
}

function failureBonusScheduleFromRow(
  row: Record<string, unknown>,
  eligibilityPolicy: FailureBonusEligibilityPolicy | undefined,
  scheduleStatus: FailureBonusScheduleStatus | undefined,
): FailureBonusSuccessPremiumScheduleQuote | undefined {
  if (!eligibilityPolicy || !scheduleStatus || !row.public_goods_threshold_schedule_json) {
    return undefined;
  }
  try {
    return validateStoredFailureBonusSchedule({
      submittedSchedule: row.public_goods_threshold_schedule_json as FailureBonusSuccessPremiumScheduleQuote,
      separateEligibilityPolicy: eligibilityPolicy,
      failureBonusRateBps: toNumber(row.public_goods_failure_bonus_rate_bps, Number.NaN),
      requestedMaximumFundingCents: toNumber(row.requested_maximum_funding_cents, Number.NaN),
      verifiedSupporterMinimum: toNumber(row.public_goods_threshold_supporters, 0),
      scheduleStatus,
    });
  } catch {
    return undefined;
  }
}

function coercePledgeStatus(value: unknown): MpgfPledge["status"] {
  if (
    value === "pledged" ||
    value === "cancelled" ||
    value === "converted_to_payment_intent" ||
    value === "expired"
  ) {
    return value;
  }

  return "pledged";
}

function coerceCommitmentStatus(value: unknown): MpgfRecurringContributionCommitment["status"] {
  if (
    value === "active" ||
    value === "paused" ||
    value === "cancelled" ||
    value === "expired" ||
    value === "provider_action_required" ||
    value === "provider_failed"
  ) {
    return value;
  }

  return "active";
}

function coerceProposalStatus(value: unknown): MpgfPoolProposalRecord["status"] {
  if (
    value === "draft" ||
    value === "submitted" ||
    value === "under_review" ||
    value === "changes_requested" ||
    value === "approved_as_candidate" ||
    value === "rejected" ||
    value === "withdrawn" ||
    value === "succeeded" ||
    value === "lapsed"
  ) {
    return value;
  }

  return "draft";
}

function coerceBallotStatus(value: unknown): MpgfBallot["status"] {
  if (value === "draft" || value === "submitted" || value === "invalidated" || value === "voided") {
    return value;
  }

  return "submitted";
}

function coercePublicGoodsVisibilityMode(value: unknown): MpgfPublicGoodsVisibilityMode {
  if (value === "public_supporter" || value === "public_reason") {
    return value;
  }

  return "private_amount";
}

function coercePublicGoodsCaptureMode(value: unknown): MpgfPublicGoodsCaptureMode {
  if (value === "stored_payment_method" || value === "signed_intent") {
    return value;
  }

  return "external_handoff";
}

function coercePublicGoodsDestinationType(value: unknown): MpgfPublicGoodsDestinationType | undefined {
  if (
    value === "external_charity" ||
    value === "fiscal_host" ||
    value === "internal_demo_pool" ||
    value === "signed_sponsor_route"
  ) {
    return value;
  }

  return undefined;
}

function coercePublicGoodsPledgeStatus(value: unknown): MpgfPublicGoodsPledge["status"] {
  if (value === "captured" || value === "voided" || value === "expired") {
    return value;
  }

  return "pledged";
}

function coercePublicGoodsPledgeEligibility(value: unknown): MpgfPublicGoodsPledge["eligibilityState"] {
  if (
    value === "eligible" ||
    value === "duplicate_identity" ||
    value === "below_minimum" ||
    value === "blocked"
  ) {
    return value;
  }

  return "pending_review";
}

function coercePublicGoodsSubscriptionStatus(value: unknown): MpgfPublicGoodsSubscription["status"] {
  if (value === "paused" || value === "cancelled" || value === "past_due" || value === "expired") {
    return value;
  }

  return "active";
}

function normalizeBallotWeights(value: unknown): MpgfBallotWeight[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((weight) => {
      const record = weight as Record<string, unknown>;
      const alternativeId = toStringOrUndefined(record.alternativeId);

      if (!alternativeId) {
        return null;
      }

      return {
        alternativeId,
        valueBps: Math.max(0, Math.min(10_000, Math.round(toNumber(record.valueBps)))),
        strongNegative: Boolean(record.strongNegative),
      } satisfies MpgfBallotWeight;
    })
    .filter((weight): weight is MpgfBallotWeight => Boolean(weight));
}

function rationalJson(value: unknown) {
  const record = value as Record<string, unknown> | null;
  const num = toStringOrUndefined(record?.num);
  const den = toStringOrUndefined(record?.den);

  return num && den ? { num, den } : undefined;
}

function mapPledgeRow(row: Record<string, unknown>): MpgfPledge {
  return {
    id: String(row.id),
    userId: toStringOrUndefined(row.user_id) ?? toStringOrUndefined(row.profile_id),
    contributorLabel: toStringOrUndefined(row.contributor_label) ?? "MPGF participant",
    amountCents: toNumber(row.amount_cents),
    currency: "usd",
    cadence: row.cadence === "monthly" ? "monthly" : "one_time",
    status: coercePledgeStatus(row.status),
    pledgeMode: "pledge_only",
    intendedCycleId: toStringOrUndefined(row.intended_cycle_id) ?? toStringOrUndefined(row.cycle_id),
    budgetEffectiveCycleId: toStringOrUndefined(row.budget_effective_cycle_id) ?? toStringOrUndefined(row.cycle_id),
    recurringCommitmentId: toStringOrUndefined(row.recurring_commitment_id),
    convertedPaymentIntentId: toStringOrUndefined(row.converted_payment_intent_id),
    cancelledAt: toStringOrUndefined(row.cancelled_at),
    expiresAt: toStringOrUndefined(row.expires_at),
  };
}

function mapRecurringCommitmentRow(row: Record<string, unknown>): MpgfRecurringContributionCommitment {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    amountCents: toNumber(row.amount_cents),
    currency: "usd",
    cadence: "monthly",
    mode: row.mode === "test_payment" || row.mode === "real_money" ? row.mode : "pledge_only",
    status: coerceCommitmentStatus(row.status),
    startCycleId: toStringOrUndefined(row.start_cycle_id),
    nextCycleId: toStringOrUndefined(row.next_cycle_id),
    nextScheduledAt: toStringOrUndefined(row.next_scheduled_at),
    providerSubscriptionId: toStringOrUndefined(row.provider_subscription_id),
    createdAt: toStringOrUndefined(row.created_at),
    pausedAt: toStringOrUndefined(row.paused_at),
    cancelledAt: toStringOrUndefined(row.cancelled_at),
  };
}

function mapPoolProposalRow(row: Record<string, unknown>): MpgfPoolProposalRecord {
  const milestones = stringArrayFromJson(row.milestones_json);
  const risks = stringArrayFromJson(row.risks_json);
  const implementingTeam = implementingTeamFromJson(row.implementing_team_json);
  const publicGoodsFailureBonusEligibilityPolicy = failureBonusEligibilityPolicyFromJson(
    row.public_goods_failure_bonus_eligibility_json,
  );
  const publicGoodsFailureBonusScheduleStatus = failureBonusScheduleStatusFromRow(
    row.public_goods_failure_bonus_schedule_status,
  );
  const publicGoodsThresholdSchedule = failureBonusScheduleFromRow(
    row,
    publicGoodsFailureBonusEligibilityPolicy,
    publicGoodsFailureBonusScheduleStatus,
  );

  return {
    id: String(row.id),
    proposerId: toStringOrUndefined(row.proposer_id),
    title: toStringOrUndefined(row.title) ?? "Untitled MPGF pool proposal",
    summary: toStringOrUndefined(row.summary) ?? toStringOrUndefined(row.problem) ?? "",
    causeArea: toStringOrUndefined(row.cause_area) ?? "",
    problem: toStringOrUndefined(row.problem) ?? "",
    intervention: toStringOrUndefined(row.intervention) ?? "",
    moralPublicGoodRationale: toStringOrUndefined(row.moral_public_good_rationale) ?? "",
    requestedMaximumFundingCents: toNumber(row.requested_maximum_funding_cents),
    minimumViableFundingCents:
      row.minimum_viable_funding_cents == null ? undefined : toNumber(row.minimum_viable_funding_cents),
    outcomeUnitsSummary: toStringOrUndefined(row.outcome_units_summary) ?? "",
    expectedEffectVsFunding: toStringOrUndefined(row.expected_effect_vs_funding) ?? "",
    timeline: toStringOrUndefined(row.timeline) ?? "",
    milestones,
    risks,
    misusePathways: toStringOrUndefined(row.misuse_pathways) ?? "",
    proposedRecipientName: toStringOrUndefined(row.proposed_recipient_name),
    implementingTeam,
    publicGoodsDestinationType: coercePublicGoodsDestinationType(row.public_goods_destination_type),
    publicGoodsDestinationRef: toStringOrUndefined(row.public_goods_destination_ref),
    publicGoodsThresholdAmountCents:
      row.public_goods_threshold_amount_cents == null ? undefined : toNumber(row.public_goods_threshold_amount_cents),
    publicGoodsThresholdSupporters:
      row.public_goods_threshold_supporters == null ? undefined : toNumber(row.public_goods_threshold_supporters),
    publicGoodsFailureBonusEnabled:
      row.public_goods_failure_bonus_enabled == null ? undefined : Boolean(row.public_goods_failure_bonus_enabled),
    publicGoodsFailureBonusRateBps:
      row.public_goods_failure_bonus_rate_bps == null ? undefined : toNumber(row.public_goods_failure_bonus_rate_bps),
    publicGoodsFailureBonusEligibilityPolicy,
    publicGoodsFailureBonusMaxParticipants:
      row.public_goods_failure_bonus_max_participants == null
        ? undefined
        : toNumber(row.public_goods_failure_bonus_max_participants),
    publicGoodsFailureBonusMaxPerParticipantCents:
      row.public_goods_failure_bonus_max_per_participant_cents == null
        ? undefined
        : toNumber(row.public_goods_failure_bonus_max_per_participant_cents),
    publicGoodsThresholdSchedule,
    publicGoodsFailureBonusScheduleStatus,
    publicGoodsSuccessPremiumRateBps:
      row.public_goods_success_premium_rate_bps == null ? undefined : toNumber(row.public_goods_success_premium_rate_bps),
    publicGoodsSuccessPremiumCents:
      row.public_goods_success_premium_cents == null ? undefined : toNumber(row.public_goods_success_premium_cents),
    publicGoodsSuccessPremiumPayer: coerceSuccessPremiumPayer(row.public_goods_success_premium_payer),
    publicGoodsSuccessPremiumPolicyVersion: toStringOrUndefined(row.public_goods_success_premium_policy_version),
    publicGoodsSuccessPremiumIncludedInNetThreshold:
      row.public_goods_success_premium_included_in_net_threshold === false ? false : undefined,
    publicGoodsSuccessPremiumProvisional:
      row.public_goods_success_premium_provisional == null
        ? undefined
        : Boolean(row.public_goods_success_premium_provisional),
    publicGoodsGrossSuccessRequirementCents:
      row.public_goods_gross_success_requirement_cents == null
        ? undefined
        : toNumber(row.public_goods_gross_success_requirement_cents),
    publicGoodsSuccessPremiumPricingAssumptions: successPremiumAssumptionsFromJson(
      row.public_goods_success_premium_pricing_json,
    ),
    publicGoodsDeadlineAt: toStringOrUndefined(row.public_goods_deadline_at),
    publicGoodsVerificationMethod: toStringOrUndefined(row.public_goods_verification_method),
    publicGoodsBaselineRule: toStringOrUndefined(row.public_goods_baseline_rule),
    publicGoodsExitRule: toStringOrUndefined(row.public_goods_exit_rule),
    publicGoodsBaseMatchRatio:
      row.public_goods_base_match_ratio == null ? undefined : toNumber(row.public_goods_base_match_ratio),
    publicGoodsQfEnabled: row.public_goods_qf_enabled == null ? undefined : Boolean(row.public_goods_qf_enabled),
    publicGoodsQfCapMultiple:
      row.public_goods_qf_cap_multiple == null ? undefined : toNumber(row.public_goods_qf_cap_multiple),
    publicGoodsPayoutMethod: row.public_goods_payout_method
      ? coercePublicGoodsCaptureMode(row.public_goods_payout_method)
      : undefined,
    status: coerceProposalStatus(row.status),
    termsVersion: row.terms_version == null ? undefined : toNumber(row.terms_version),
    approvedTermsVersion:
      row.approved_terms_version == null ? undefined : toNumber(row.approved_terms_version),
    operativeTermsSha256: toStringOrUndefined(row.operative_terms_sha256),
    termsLockedAt: toStringOrUndefined(row.terms_locked_at),
    reviewedAt: toStringOrUndefined(row.reviewed_at),
    reviewReason: toStringOrUndefined(row.review_reason),
    candidateAlternativeId: toStringOrUndefined(row.candidate_alternative_id),
    createdAt: toStringOrUndefined(row.created_at),
  };
}

function mapPublicGoodsPledgeRow(row: Record<string, unknown>): MpgfPublicGoodsPledge {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    userId: toStringOrUndefined(row.user_ref) ?? toStringOrUndefined(row.profile_id) ?? "mpgf-participant",
    amountCents: toNumber(row.amount_cents),
    acceptableCounterpartBuckets: Array.isArray(row.acceptable_counterpart_buckets)
      ? row.acceptable_counterpart_buckets.map(String)
      : ["any-pre-vetted-distinct-moral-bucket"],
    minimumCounterpartyClearedCents: row.minimum_counterparty_cleared_cents == null
      ? Math.max(100, toNumber(row.amount_cents))
      : toNumber(row.minimum_counterparty_cleared_cents),
    counterpartDistinctBucketRequired: true,
    maxExposureCents: row.max_exposure_cents == null ? toNumber(row.amount_cents) : toNumber(row.max_exposure_cents),
    donorExposureDisclosure: {
      maxExposureCents: row.max_exposure_cents == null ? toNumber(row.amount_cents) : toNumber(row.max_exposure_cents),
      exactClearanceConditions: Array.isArray((row.donor_exposure_disclosure as Record<string, unknown> | undefined)?.exactClearanceConditions)
        ? ((row.donor_exposure_disclosure as Record<string, unknown>).exactClearanceConditions as unknown[]).map(String)
        : [],
      roundFailureBehavior: String((row.donor_exposure_disclosure as Record<string, unknown> | undefined)?.roundFailureBehavior ?? ""),
      recipientVerificationFailureBehavior: String(
        (row.donor_exposure_disclosure as Record<string, unknown> | undefined)?.recipientVerificationFailureBehavior ?? "",
      ),
      authorizationTiming: String((row.donor_exposure_disclosure as Record<string, unknown> | undefined)?.authorizationTiming ?? ""),
      authorizationExpiryBehavior: String(
        (row.donor_exposure_disclosure as Record<string, unknown> | undefined)?.authorizationExpiryBehavior ?? "",
      ),
    },
    visibilityMode: coercePublicGoodsVisibilityMode(row.visibility_mode),
    isRecurring: Boolean(row.is_recurring),
    captureMode: coercePublicGoodsCaptureMode(row.capture_mode),
    paymentIntentRef: toStringOrUndefined(row.payment_intent_ref),
    eligibilityState: coercePublicGoodsPledgeEligibility(row.eligibility_state),
    humanScoreBps: toNumber(row.human_score_bps),
    status: coercePublicGoodsPledgeStatus(row.status),
    supporterReason: toStringOrUndefined(row.supporter_reason),
    createdAt: toStringOrUndefined(row.created_at) ?? new Date(0).toISOString(),
  };
}

function mapPublicGoodsSubscriptionRow(row: Record<string, unknown>): MpgfPublicGoodsSubscription {
  return {
    id: String(row.id),
    userId: toStringOrUndefined(row.user_ref) ?? toStringOrUndefined(row.profile_id) ?? "mpgf-participant",
    poolId: String(row.pool_id),
    amountCents: toNumber(row.amount_cents),
    interval: row.interval === "annual" ? "annual" : "monthly",
    status: coercePublicGoodsSubscriptionStatus(row.status),
    captureMode: coercePublicGoodsCaptureMode(row.capture_mode),
    mode: row.mode === "test_payment" || row.mode === "real_money" ? row.mode : "pledge_only",
    nextChargeAt: toStringOrUndefined(row.next_charge_at) ?? new Date(0).toISOString(),
    createdAt: toStringOrUndefined(row.created_at) ?? new Date(0).toISOString(),
  };
}

function mapBallotRow(row: Record<string, unknown>): MpgfBallot {
  return {
    id: String(row.id),
    voterLabel: toStringOrUndefined(row.voter_label) ?? "MPGF participant",
    cycleId: toStringOrUndefined(row.cycle_id) ?? demoCycle.id,
    weights: normalizeBallotWeights(row.weights_json),
    status: coerceBallotStatus(row.status),
    draftVersion: toNumber(row.draft_version, 1),
    eligibilitySnapshotId: toStringOrUndefined(row.eligibility_snapshot_id),
    candidateSetSnapshotId: toStringOrUndefined(row.candidate_set_snapshot_id),
    totalAbsIntegralRationalJson: rationalJson(row.total_abs_integral_rational_json),
    totalAbsIntegralDecimalCache:
      row.total_abs_integral_decimal_cache == null ? undefined : toNumber(row.total_abs_integral_decimal_cache),
    lockedBudgetCentsAtSubmission:
      row.locked_budget_cents_at_submission == null ? undefined : toNumber(row.locked_budget_cents_at_submission),
    validationTraceId: toStringOrUndefined(row.validation_trace_id),
  };
}

function nextMonthIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0)).toISOString();
}

async function listRows<T>(
  warnings: string[],
  label: string,
  runQuery: () => Promise<{ data: T[] | null; error: DbErrorLike | null }>,
) {
  const { data, error } = await runQuery();

  if (error) {
    warnings.push(`${label}: ${summarizeDbError(error)}`);
    return [];
  }

  return data ?? [];
}

async function ensureMpgfDemoCatalog(supabase: SupabaseAny) {
  const warnings: string[] = [];
  const cycleRow = {
    id: demoCycle.id,
    label: demoCycle.label,
    stage: demoCycle.stage,
    mode: demoCycle.mode,
    currency: demoCycle.currency,
    budget_cents: demoCycle.budgetCents,
    protocol_parameter_version: demoCycle.protocolParameterVersion,
    terms_version: demoCycle.termsVersion,
    privacy_version: demoCycle.privacyVersion,
    status: "active",
    proposal_opens_at: demoCycle.proposalOpensAt,
    ballot_opens_at: demoCycle.ballotOpensAt,
    ballot_closes_at: demoCycle.ballotClosesAt,
    summary_published_at: demoCycle.summaryPublishedAt,
  };
  const cycleResult = await supabase.from("mpgf_cycles").upsert(cycleRow, { onConflict: "id" });

  if (cycleResult.error && !/row-level security/i.test(cycleResult.error.message ?? "")) {
    warnings.push(`Demo cycle seed: ${summarizeDbError(cycleResult.error)}`);
  }

  const alternativeRows = demoAlternatives.map((alternative) => ({
    id: alternative.id,
    cycle_id: demoCycle.id,
    name: alternative.name,
    short_name: alternative.shortName,
    cause_area: alternative.causeArea,
    recipient_name: alternative.recipientName,
    description: alternative.description,
    moral_public_good_rationale: alternative.moralPublicGoodRationale,
    outcome_unit: alternative.outcomeUnit,
    status: alternative.status,
    operational_reliability_bps: alternative.operationalReliabilityBps,
    risk_bps: alternative.riskBps,
    tail_loss_bps: alternative.tailLossBps,
  }));
  const alternativesResult = await supabase
    .from("mpgf_candidate_alternatives")
    .upsert(alternativeRows, { onConflict: "id" });

  if (alternativesResult.error && !/row-level security/i.test(alternativesResult.error.message ?? "")) {
    warnings.push(`Demo alternatives seed: ${summarizeDbError(alternativesResult.error)}`);
  }

  return warnings;
}

export async function loadMpgfParticipantState(identity: MpgfParticipantIdentity): Promise<MpgfParticipantState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "unavailable",
      userId: identity.userId,
      displayName: identity.displayName,
      pledges: [],
      recurringCommitments: [],
      publicGoodsPledges: [],
      publicGoodsSubscriptions: [],
      poolProposals: [],
      ballots: [],
      warnings: ["Supabase is not configured, so MPGF participant state cannot be persisted."],
    };
  }

  if (!identity.userId) {
    return {
      status: "sign_in_required",
      displayName: identity.displayName,
      pledges: [],
      recurringCommitments: [],
      publicGoodsPledges: [],
      publicGoodsSubscriptions: [],
      poolProposals: [],
      ballots: [],
      warnings: ["Sign in to save MPGF participant state across sessions."],
    };
  }

  const supabase = (await createClient()) as SupabaseAny;
  const warnings: string[] = [];
  const [pledgeRows, commitmentRows, publicGoodsPledgeRows, publicGoodsSubscriptionRows, proposalRows, ballotRows] = await Promise.all([
    listRows(warnings, "Pledges", async () =>
      supabase
        .from("mpgf_pledges")
        .select("*")
        .eq("profile_id", identity.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ),
    listRows(warnings, "Recurring commitments", async () =>
      supabase
        .from("mpgf_recurring_contribution_commitments")
        .select("*")
        .eq("user_id", identity.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ),
    listRows(warnings, "Public goods pledges", async () =>
      supabase
        .from("mpgf_public_goods_pledges")
        .select("*")
        .eq("profile_id", identity.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ),
    listRows(warnings, "Public goods subscriptions", async () =>
      supabase
        .from("mpgf_public_goods_subscriptions")
        .select("*")
        .eq("profile_id", identity.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ),
    listRows(warnings, "Pool proposals", async () =>
      supabase
        .from("mpgf_pool_proposals")
        .select("*")
        .eq("proposer_id", identity.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ),
    listRows(warnings, "Ballots", async () =>
      supabase
        .from("mpgf_ballots")
        .select("*")
        .eq("profile_id", identity.userId)
        .order("submitted_at", { ascending: false })
        .limit(50),
    ),
  ]);

  return {
    status: warnings.some((warning) => /mpgf_pledges|mpgf_pool_proposals|mpgf_ballots|relation/i.test(warning))
      ? "error"
      : "authenticated",
    userId: identity.userId,
    displayName: identity.displayName,
    pledges: pledgeRows.map((row) => mapPledgeRow(row as Record<string, unknown>)),
    recurringCommitments: commitmentRows.map((row) => mapRecurringCommitmentRow(row as Record<string, unknown>)),
    publicGoodsPledges: publicGoodsPledgeRows.map((row) => mapPublicGoodsPledgeRow(row as Record<string, unknown>)),
    publicGoodsSubscriptions: publicGoodsSubscriptionRows.map((row) =>
      mapPublicGoodsSubscriptionRow(row as Record<string, unknown>),
    ),
    poolProposals: proposalRows.map((row) => mapPoolProposalRow(row as Record<string, unknown>)),
    ballots: ballotRows.map((row) => mapBallotRow(row as Record<string, unknown>)),
    warnings,
  };
}

async function insertPledge(
  supabase: SupabaseAny,
  input: Required<MpgfParticipantIdentity> & {
    amountCents: number;
    cadence: MpgfPledge["cadence"];
  },
) {
  const { data, error } = await supabase
    .from("mpgf_pledges")
    .insert({
      cycle_id: demoCycle.id,
      profile_id: input.userId,
      contributor_label: input.displayName,
      amount_cents: input.amountCents,
      cadence: input.cadence,
      status: "pledged",
      real_money: false,
      payment_provider_object_id: null,
    })
    .select("*")
    .single();

  if (error && isForeignKeyError(error)) {
    const fallback = await supabase
      .from("mpgf_pledges")
      .insert({
        cycle_id: null,
        profile_id: input.userId,
        contributor_label: input.displayName,
        amount_cents: input.amountCents,
        cadence: input.cadence,
        status: "pledged",
        real_money: false,
        payment_provider_object_id: null,
      })
      .select("*")
      .single();

    return fallback;
  }

  return { data, error };
}

export async function persistMpgfPledgeOnlyRecords(input: RecordPledgesInput) {
  const oneTimeAmountCents = toPositiveInteger(input.oneTimeAmountCents, "One-time MPGF pledge amount");
  const monthlyAmountCents = Math.max(0, input.monthlyAmountCents);

  if (!Number.isInteger(monthlyAmountCents)) {
    throw new Error("Monthly MPGF pledge amount must be an integer number of cents.");
  }

  const supabase = (await createClient()) as SupabaseAny;
  const warnings = await ensureMpgfDemoCatalog(supabase);
  const reservation = await reserveIdempotency<{
    pledges: MpgfPledge[];
    recurringCommitments: MpgfRecurringContributionCommitment[];
    warnings: string[];
  }>(supabase, {
    scope: `mpgf:pledge-only:${input.userId}:${demoCycle.id}`,
    idempotencyKey: input.idempotencyKey,
    actorUserId: input.userId,
    action: "mpgf.pledge_only.create",
    request: {
      oneTimeAmountCents,
      monthlyAmountCents,
    },
  });

  if (reservation.replayed) {
    return reservation.result;
  }

  const insertedPledges: MpgfPledge[] = [];
  const insertedCommitments: MpgfRecurringContributionCommitment[] = [];

  try {
    const oneTime = await insertPledge(supabase, {
      userId: input.userId,
      displayName: input.displayName,
      amountCents: oneTimeAmountCents,
      cadence: "one_time",
    });

    if (oneTime.error) {
      throw new Error(`Could not save MPGF pledge: ${summarizeDbError(oneTime.error)}`);
    }

    const oneTimePledge = mapPledgeRow(oneTime.data as Record<string, unknown>);
    insertedPledges.push(oneTimePledge);
    await recordParticipantMutationEvidence(supabase, {
      actorUserId: input.userId,
      action: "mpgf.pledge_only.create",
      objectType: "pledge",
      objectId: oneTimePledge.id,
      fromStatus: null,
      toStatus: oneTimePledge.status,
      reason: "participant created one-time pledge-only record",
      eventJson: { cadence: "one_time", amountCents: oneTimeAmountCents },
    });

    if (monthlyAmountCents > 0) {
      const commitment = await supabase
        .from("mpgf_recurring_contribution_commitments")
        .insert({
          user_id: input.userId,
          amount_cents: monthlyAmountCents,
          currency: "usd",
          cadence: "monthly",
          mode: "pledge_only",
          status: "active",
          start_cycle_id: demoCycle.id,
          next_cycle_id: demoCycle.id,
          next_scheduled_at: nextMonthIso(),
          provider_subscription_id: null,
        })
        .select("*")
        .single();

      if (commitment.error) {
        if (isMissingRelationError(commitment.error) || isMissingColumnError(commitment.error)) {
          warnings.push(`Recurring commitment table unavailable: ${summarizeDbError(commitment.error)}`);
        } else {
          throw new Error(`Could not save recurring MPGF commitment: ${summarizeDbError(commitment.error)}`);
        }
      } else {
        const commitmentRow = mapRecurringCommitmentRow(commitment.data as Record<string, unknown>);
        insertedCommitments.push(commitmentRow);
        await recordParticipantMutationEvidence(supabase, {
          actorUserId: input.userId,
          action: "mpgf.recurring_commitment.create",
          objectType: "recurring_contribution_commitment",
          objectId: commitmentRow.id,
          fromStatus: null,
          toStatus: commitmentRow.status,
          reason: "participant created monthly pledge-only commitment",
          eventJson: { amountCents: monthlyAmountCents },
        });
      }

      const monthlyPledge = await insertPledge(supabase, {
        userId: input.userId,
        displayName: input.displayName,
        amountCents: monthlyAmountCents,
        cadence: "monthly",
      });

      if (monthlyPledge.error) {
        throw new Error(`Could not materialize monthly MPGF pledge: ${summarizeDbError(monthlyPledge.error)}`);
      }

      const monthlyPledgeRow = mapPledgeRow(monthlyPledge.data as Record<string, unknown>);
      insertedPledges.push(monthlyPledgeRow);
      await recordParticipantMutationEvidence(supabase, {
        actorUserId: input.userId,
        action: "mpgf.pledge_only.materialize_monthly",
        objectType: "pledge",
        objectId: monthlyPledgeRow.id,
        fromStatus: null,
        toStatus: monthlyPledgeRow.status,
        reason: "participant materialized monthly pledge-only record",
        eventJson: { cadence: "monthly", amountCents: monthlyAmountCents },
      });
    }

    const result = {
      pledges: insertedPledges,
      recurringCommitments: insertedCommitments,
      warnings,
    };
    await completeIdempotency(supabase, reservation, result);
    return result;
  } catch (error) {
    await failIdempotency(supabase, reservation);
    throw error;
  }
}

export async function persistMpgfPublicGoodsPledge(input: RecordPublicGoodsPledgeInput) {
  const campaign = demoMpgfPublicGoodsCampaigns.find((candidate) => candidate.id === input.campaignId);

  if (!campaign) {
    throw new Error("MPGF public-goods pledge requires a known assurance campaign.");
  }

  assertMpgfPublicGoodsCohortAccess({ userId: input.userId, email: input.email });

  const amountCents = toPositiveInteger(input.amountCents, "Public-goods pledge amount");
  const identityAdapter = evaluateMpgfPublicGoodsIdentityAdapter({
    userId: input.userId,
    provider: "repository_profile",
    humanScoreBps: 8_000,
    redactedReference: undefined,
  });
  const identityAttestation = identityAdapter.attestation;
  const paymentAdapter = resolveMpgfPublicGoodsPaymentAdapter({
    campaign,
    captureMode: input.captureMode,
  });

  if (paymentAdapter.blockers.length > 0) {
    throw new Error(`MPGF public-goods payment adapter rejected pledge: ${paymentAdapter.blockers[0]}`);
  }

  const pledge = createMpgfPublicGoodsPledge({
    campaign,
    userId: input.userId,
    amountCents,
    visibilityMode: input.visibilityMode,
    captureMode: input.captureMode,
    acceptableCounterpartBuckets: input.acceptableCounterpartBuckets,
    minimumCounterpartyClearedCents: input.minimumCounterpartyClearedCents,
    isRecurring: input.isRecurring,
    supporterReason: input.supporterReason,
    identityAttestation,
    duplicateUserRefs: identityAdapter.duplicateUserRefs,
  });
  const supabase = (await createClient()) as SupabaseAny;
  const reservation = await reserveIdempotency<{
    pledge: MpgfPublicGoodsPledge;
    subscription?: MpgfPublicGoodsSubscription;
    warnings: string[];
  }>(supabase, {
    scope: `mpgf:public-goods-pledge:${input.userId}:${campaign.id}`,
    idempotencyKey: input.idempotencyKey,
    actorUserId: input.userId,
    action: "mpgf.public_goods_pledge.create",
    request: {
      campaignId: campaign.id,
      amountCents,
      visibilityMode: input.visibilityMode,
      captureMode: input.captureMode,
      acceptableCounterpartBuckets: pledge.acceptableCounterpartBuckets,
      minimumCounterpartyClearedCents: pledge.minimumCounterpartyClearedCents,
      isRecurring: input.isRecurring,
      supporterReason: input.supporterReason?.trim() || null,
    },
  });

  if (reservation.replayed) {
    return reservation.result;
  }

  const warnings: string[] = [...identityAdapter.warnings, ...paymentAdapter.warnings];

  try {
    const attestationInsert = await supabase.from("mpgf_public_goods_identity_attestations").insert({
      profile_id: input.userId,
      user_ref: input.userId,
      provider: identityAttestation.provider,
      human_score_bps: identityAttestation.humanScoreBps,
      expires_at: identityAttestation.expiresAt,
      status: identityAttestation.status,
      redacted_reference: identityAttestation.redactedReference,
    });

    if (attestationInsert.error && !isUniqueViolationError(attestationInsert.error)) {
      if (isMissingRelationError(attestationInsert.error) || isMissingColumnError(attestationInsert.error)) {
        warnings.push(`Public-goods identity attestation table unavailable: ${summarizeDbError(attestationInsert.error)}`);
      } else {
        throw new Error(`Could not save public-goods identity attestation: ${summarizeDbError(attestationInsert.error)}`);
      }
    }

    const pledgeInsert = await supabase
      .from("mpgf_public_goods_pledges")
      .insert({
        campaign_id: pledge.campaignId,
        profile_id: input.userId,
        user_ref: input.userId,
        amount_cents: pledge.amountCents,
        currency: "usd",
        visibility_mode: pledge.visibilityMode,
        acceptable_counterpart_buckets: pledge.acceptableCounterpartBuckets,
        minimum_counterparty_cleared_cents: pledge.minimumCounterpartyClearedCents,
        max_exposure_cents: pledge.maxExposureCents,
        donor_exposure_disclosure: pledge.donorExposureDisclosure,
        is_recurring: pledge.isRecurring,
        capture_mode: pledge.captureMode,
        eligibility_state: pledge.eligibilityState,
        human_score_bps: pledge.humanScoreBps,
        status: pledge.status,
        supporter_reason: pledge.supporterReason ?? null,
        payment_intent_ref: pledge.paymentIntentRef ?? null,
      })
      .select("*")
      .single();

    if (pledgeInsert.error) {
      if (isForeignKeyError(pledgeInsert.error)) {
        throw new Error(
          `Public-goods campaign catalog is missing for ${campaign.id}. Apply 20260529_mpgf_verified_assurance_matching.sql.`,
        );
      }

      throw new Error(`Could not save public-goods pledge: ${summarizeDbError(pledgeInsert.error)}`);
    }

    const savedPledge = mapPublicGoodsPledgeRow(pledgeInsert.data as Record<string, unknown>);
    let savedSubscription: MpgfPublicGoodsSubscription | undefined;

    await recordParticipantMutationEvidence(supabase, {
      actorUserId: input.userId,
      action: "mpgf.public_goods_pledge.create",
      objectType: "public_goods_pledge",
      objectId: savedPledge.id,
      fromStatus: null,
      toStatus: savedPledge.status,
      reason: "participant created threshold-conditional public-goods pledge",
      eventJson: {
        campaignId: campaign.id,
        amountCents,
        captureMode: pledge.captureMode,
        visibilityMode: pledge.visibilityMode,
        acceptableCounterpartBuckets: pledge.acceptableCounterpartBuckets,
        minimumCounterpartyClearedCents: pledge.minimumCounterpartyClearedCents,
        maxExposureCents: pledge.maxExposureCents,
        paymentAdapterMode: paymentAdapter.mode,
        proofRequired: paymentAdapter.proofRequired,
      },
    });

    try {
      await recordMpgfPublicGoodsAnalyticsEvent({
        eventType: "pledge_intent_recorded",
        userId: input.userId,
        campaignId: campaign.id,
        eventJson: {
          amountBucket: bucketMpgfPublicGoodsAmountCents(amountCents),
          visibilityMode: pledge.visibilityMode,
          counterpartBucketCount: pledge.acceptableCounterpartBuckets?.length ?? 0,
          minimumCounterpartyClearedCents: pledge.minimumCounterpartyClearedCents,
          maxExposureCents: pledge.maxExposureCents,
          captureMode: pledge.captureMode,
          isRecurring: pledge.isRecurring,
          eligibilityState: savedPledge.eligibilityState,
          surface: "mpgf_participant_action",
        },
      });
    } catch (error) {
      warnings.push(
        `Public-goods analytics event was not recorded: ${
          error instanceof Error ? error.message : "unknown analytics error"
        }`,
      );
    }

    if (input.isRecurring) {
      const subscriptionInsert = await supabase
        .from("mpgf_public_goods_subscriptions")
        .insert({
          profile_id: input.userId,
          user_ref: input.userId,
          pool_id: demoMpgfMatchPool.id,
          amount_cents: amountCents,
          currency: "usd",
          interval: "monthly",
          status: "active",
          capture_mode: "external_handoff",
          mode: "pledge_only",
          provider_subscription_ref: null,
          next_charge_at: nextMonthIso(),
        })
        .select("*")
        .single();

      if (subscriptionInsert.error) {
        warnings.push(`Public-goods sponsor subscription unavailable: ${summarizeDbError(subscriptionInsert.error)}`);
      } else {
        savedSubscription = mapPublicGoodsSubscriptionRow(subscriptionInsert.data as Record<string, unknown>);
        await recordParticipantMutationEvidence(supabase, {
          actorUserId: input.userId,
          action: "mpgf.public_goods_subscription.create",
          objectType: "public_goods_subscription",
          objectId: savedSubscription.id,
          fromStatus: null,
          toStatus: savedSubscription.status,
          reason: "participant created optional recurring sponsor-pool pledge",
          eventJson: {
            poolId: demoMpgfMatchPool.id,
            amountCents,
            mode: savedSubscription.mode,
          },
        });
      }
    }

    const result = {
      pledge: savedPledge,
      subscription: savedSubscription,
      warnings,
    };
    await completeIdempotency(supabase, reservation, result);
    return result;
  } catch (error) {
    await failIdempotency(supabase, reservation);
    throw error;
  }
}

export async function persistMpgfPledgeStatus(input: {
  userId: string;
  pledgeId: string;
  idempotencyKey: string;
  status: Extract<MpgfPledge["status"], "cancelled">;
}) {
  const supabase = (await createClient()) as SupabaseAny;
  const reservation = await reserveIdempotency<Record<string, unknown>>(supabase, {
    scope: `mpgf:pledge-status:${input.userId}:${input.pledgeId}:${input.status}`,
    idempotencyKey: input.idempotencyKey,
    actorUserId: input.userId,
    action: "mpgf.pledge.cancel",
    request: {
      pledgeId: input.pledgeId,
      status: input.status,
    },
  });

  if (reservation.replayed) {
    return { data: reservation.result, error: null };
  }

  try {
    const existing = await supabase
      .from("mpgf_pledges")
      .select("status")
      .eq("id", input.pledgeId)
      .eq("profile_id", input.userId)
      .single();

    if (existing.error) {
      throw new Error(`Could not load MPGF pledge before update: ${summarizeDbError(existing.error)}`);
    }

    const fromStatus = coercePledgeStatus((existing.data as Record<string, unknown>).status);
    if (fromStatus !== "pledged") {
      throw new Error(`Cannot cancel MPGF pledge from ${fromStatus}.`);
    }

    const cancelledAt = new Date().toISOString();
    const updateWithTimestamp = await supabase
      .from("mpgf_pledges")
      .update({ status: input.status, cancelled_at: cancelledAt })
      .eq("id", input.pledgeId)
      .eq("profile_id", input.userId)
      .select("*")
      .single();
    const updated = updateWithTimestamp.error && isMissingColumnError(updateWithTimestamp.error)
      ? await supabase
          .from("mpgf_pledges")
          .update({ status: input.status })
          .eq("id", input.pledgeId)
          .eq("profile_id", input.userId)
          .select("*")
          .single()
      : updateWithTimestamp;

    if (updated.error) {
      throw new Error(`Could not cancel MPGF pledge: ${summarizeDbError(updated.error)}`);
    }

    const row = updated.data as Record<string, unknown>;
    await recordParticipantMutationEvidence(supabase, {
      actorUserId: input.userId,
      action: "mpgf.pledge.cancel",
      objectType: "pledge",
      objectId: String(row.id),
      fromStatus,
      toStatus: input.status,
      reason: "participant cancelled pledge-only record",
    });
    await completeIdempotency(supabase, reservation, row);
    return { data: row, error: null };
  } catch (error) {
    await failIdempotency(supabase, reservation);
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : "Could not cancel MPGF pledge.",
      },
    };
  }
}

export async function persistMpgfRecurringCommitmentStatus(input: {
  userId: string;
  commitmentId: string;
  idempotencyKey: string;
  status: Extract<MpgfRecurringContributionCommitment["status"], "active" | "paused" | "cancelled">;
}) {
  const supabase = (await createClient()) as SupabaseAny;
  const reservation = await reserveIdempotency<Record<string, unknown>>(supabase, {
    scope: `mpgf:recurring-commitment-status:${input.userId}:${input.commitmentId}:${input.status}`,
    idempotencyKey: input.idempotencyKey,
    actorUserId: input.userId,
    action: `mpgf.recurring_commitment.${input.status === "active" ? "resume" : input.status}`,
    request: {
      commitmentId: input.commitmentId,
      status: input.status,
    },
  });

  if (reservation.replayed) {
    return { data: reservation.result, error: null };
  }

  try {
    const existing = await supabase
      .from("mpgf_recurring_contribution_commitments")
      .select("status")
      .eq("id", input.commitmentId)
      .eq("user_id", input.userId)
      .single();

    if (existing.error) {
      throw new Error(`Could not load MPGF recurring commitment before update: ${summarizeDbError(existing.error)}`);
    }

    const fromStatus = coerceCommitmentStatus((existing.data as Record<string, unknown>).status);
    const allowed =
      (fromStatus === "active" && (input.status === "paused" || input.status === "cancelled")) ||
      (fromStatus === "paused" && (input.status === "active" || input.status === "cancelled"));

    if (!allowed) {
      throw new Error(`Cannot update MPGF recurring commitment from ${fromStatus} to ${input.status}.`);
    }

    const timestamp = new Date().toISOString();
    const patch: Record<string, string | null> = { status: input.status };

    if (input.status === "paused") {
      patch.paused_at = timestamp;
    }

    if (input.status === "active") {
      patch.paused_at = null;
    }

    if (input.status === "cancelled") {
      patch.cancelled_at = timestamp;
    }

    const updated = await supabase
      .from("mpgf_recurring_contribution_commitments")
      .update(patch)
      .eq("id", input.commitmentId)
      .eq("user_id", input.userId)
      .select("*")
      .single();

    if (updated.error) {
      throw new Error(`Could not update recurring MPGF commitment: ${summarizeDbError(updated.error)}`);
    }

    const row = updated.data as Record<string, unknown>;
    await recordParticipantMutationEvidence(supabase, {
      actorUserId: input.userId,
      action: `mpgf.recurring_commitment.${input.status === "active" ? "resume" : input.status}`,
      objectType: "recurring_contribution_commitment",
      objectId: String(row.id),
      fromStatus,
      toStatus: input.status,
      reason: "participant updated monthly pledge-only commitment status",
    });
    await completeIdempotency(supabase, reservation, row);
    return { data: row, error: null };
  } catch (error) {
    await failIdempotency(supabase, reservation);
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : "Could not update recurring MPGF commitment.",
      },
    };
  }
}

export async function persistMpgfPoolProposal(input: SavePoolProposalInput) {
  const title = toRequiredTrimmed(input.title, "MPGF pool proposal title", 3);
  const summary = toRequiredTrimmed(input.summary, "MPGF pool proposal summary", 10);
  const causeArea = toRequiredTrimmed(input.causeArea, "Cause area");
  const problem = toRequiredTrimmed(input.problem, "Problem statement", 10);
  const intervention = toRequiredTrimmed(input.intervention, "Intervention");
  const moralPublicGoodRationale = toRequiredTrimmed(input.moralPublicGoodRationale, "Moral public-good rationale", 10);
  const requestedMaximumFundingCents = toPositiveInteger(
    input.requestedMaximumFundingCents,
    "Requested maximum funding",
  );
  const minimumViableFundingCents = toOptionalPositiveInteger(
    input.minimumViableFundingCents,
    "Minimum viable funding",
  );
  const outcomeUnitLabel = toRequiredTrimmed(input.outcomeUnitLabel, "Output unit label");
  const outcomeUnitDefinition = toRequiredTrimmed(input.outcomeUnitDefinition, "Output unit definition", 10);
  const measurementMethod = toRequiredTrimmed(input.measurementMethod, "Measurement method", 10);
  const referenceAlternative = input.referenceAlternative?.trim();
  const uncertaintyDescription = input.uncertaintyDescription?.trim();
  const expectedEffectVsFunding = toRequiredTrimmed(input.expectedEffectVsFunding, "Expected effect vs funding", 10);
  const timeline = toRequiredTrimmed(input.timeline, "Timeline");
  const milestones = toLineItems(input.milestones, "Milestones");
  const risks = toLineItems(input.risks, "Risks");
  const misusePathways = toRequiredTrimmed(input.misusePathways, "Misuse pathways", 10);
  const proposedRecipientName = input.proposedRecipientName?.trim();
  const implementingTeam = input.implementingTeam.trim();
  const publicGoodsDestinationType = input.publicGoodsDestinationType ?? "external_charity";
  const publicGoodsDestinationRef = input.publicGoodsDestinationRef?.trim();
  const submittedPublicGoodsThresholdAmountCents = toOptionalPositiveInteger(
    input.publicGoodsThresholdAmountCents,
    "Public-goods threshold amount",
  );
  let publicGoodsThresholdAmountCents = submittedPublicGoodsThresholdAmountCents;
  const publicGoodsThresholdSupporters =
    input.publicGoodsThresholdSupporters == null || input.publicGoodsThresholdSupporters === 0
      ? undefined
      : toPositiveInteger(input.publicGoodsThresholdSupporters, "Public-goods verified supporter threshold");
  const publicGoodsFailureBonusEnabled = input.publicGoodsFailureBonusEnabled === true;
  const publicGoodsFailureBonusRateBps = publicGoodsFailureBonusEnabled
    ? toPositiveInteger(input.publicGoodsFailureBonusRateBps ?? 0, "Failure-bonus rate")
    : undefined;
  if (publicGoodsFailureBonusRateBps != null && publicGoodsFailureBonusRateBps > 10_000) {
    throw new Error("The automatic percentage failure-bonus quote cannot exceed 100% of contribution.");
  }

  let publicGoodsFailureBonusEligibilityPolicy: FailureBonusEligibilityPolicy | undefined;
  let publicGoodsFailureBonusMaxParticipants: number | undefined;
  let publicGoodsFailureBonusMaxPerParticipantCents: number | undefined;
  let publicGoodsThresholdSchedule: FailureBonusSuccessPremiumScheduleQuote | undefined;
  let publicGoodsSuccessPremiumRateBps: number | undefined;
  let publicGoodsSuccessPremiumCents: number | undefined;
  let publicGoodsGrossSuccessRequirementCents: number | undefined;
  let publicGoodsSuccessPremiumPayer: "pool_creator_or_sponsor" | undefined;
  let publicGoodsSuccessPremiumPricingAssumptions:
    | FailureBonusSuccessPremiumPricingAssumptions
    | undefined;

  if (publicGoodsFailureBonusEnabled) {
    if (!publicGoodsFailureBonusRateBps) {
      throw new Error("A failure-bonus pool requires one positive pool-wide failure-bonus rate.");
    }
    if (!input.publicGoodsThresholdSchedule || !input.publicGoodsFailureBonusEligibilityPolicy) {
      throw new Error("A failure-bonus pool requires a complete threshold schedule and eligibility policy.");
    }

    publicGoodsThresholdSchedule = validateSubmittedFailureBonusSchedule({
      submittedSchedule: input.publicGoodsThresholdSchedule,
      separateEligibilityPolicy: input.publicGoodsFailureBonusEligibilityPolicy,
      failureBonusRateBps: publicGoodsFailureBonusRateBps,
      requestedMaximumFundingCents,
      verifiedSupporterMinimum: publicGoodsThresholdSupporters ?? 0,
    });
    publicGoodsFailureBonusEligibilityPolicy = input.publicGoodsFailureBonusEligibilityPolicy;
    publicGoodsFailureBonusMaxParticipants =
      publicGoodsFailureBonusEligibilityPolicy.maxParticipants;
    publicGoodsFailureBonusMaxPerParticipantCents =
      publicGoodsFailureBonusEligibilityPolicy.maxBonusPerParticipantCents;

    if (
      input.publicGoodsFailureBonusMaxParticipants !== publicGoodsFailureBonusMaxParticipants ||
      input.publicGoodsFailureBonusMaxPerParticipantCents !==
        publicGoodsFailureBonusMaxPerParticipantCents
    ) {
      throw new Error("Submitted failure-bonus caps do not match the immutable eligibility policy.");
    }

    const firstThreshold = publicGoodsThresholdSchedule.thresholds[0]!;
    publicGoodsThresholdAmountCents = firstThreshold.cumulativeNetRecipientThresholdCents;
    publicGoodsSuccessPremiumRateBps = firstThreshold.premiumRateBps;
    publicGoodsSuccessPremiumCents = firstThreshold.successPremiumCents;
    publicGoodsGrossSuccessRequirementCents = firstThreshold.grossSuccessRequirementCents;
    publicGoodsSuccessPremiumPayer = "pool_creator_or_sponsor";
    publicGoodsSuccessPremiumPricingAssumptions = firstThreshold.assumptions;

    if (submittedPublicGoodsThresholdAmountCents !== publicGoodsThresholdAmountCents) {
      throw new Error("The legacy threshold field must mirror threshold 1 of the cumulative schedule.");
    }
    if (input.publicGoodsSuccessPremiumRateBps !== publicGoodsSuccessPremiumRateBps) {
      throw new Error("The submitted threshold-1 premium rate does not match server pricing.");
    }
    if (input.publicGoodsSuccessPremiumCents !== publicGoodsSuccessPremiumCents) {
      throw new Error("The submitted threshold-1 premium amount does not match server pricing.");
    }
    if (
      input.publicGoodsGrossSuccessRequirementCents !==
      publicGoodsGrossSuccessRequirementCents
    ) {
      throw new Error("The threshold-1 gross requirement does not match server pricing.");
    }
    if (input.publicGoodsSuccessPremiumPayer !== publicGoodsSuccessPremiumPayer) {
      throw new Error("The v0.1 automatic quote requires the pool creator or a named sponsor to pay the premium.");
    }
    if (input.publicGoodsSuccessPremiumPolicyVersion !== FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION) {
      throw new Error("The success-premium policy version is missing or stale.");
    }
    if (input.publicGoodsSuccessPremiumIncludedInNetThreshold !== false) {
      throw new Error("Success premiums must remain outside net recipient thresholds.");
    }
    if (input.publicGoodsSuccessPremiumProvisional !== true) {
      throw new Error("Pool creators cannot mark a success-premium schedule final or approved.");
    }
    if (
      JSON.stringify(input.publicGoodsSuccessPremiumPricingAssumptions) !==
      JSON.stringify(publicGoodsSuccessPremiumPricingAssumptions)
    ) {
      throw new Error("The legacy threshold-1 pricing assumptions do not match the schedule.");
    }
  } else if (
    input.publicGoodsThresholdSchedule ||
    input.publicGoodsFailureBonusEligibilityPolicy ||
    input.publicGoodsFailureBonusMaxParticipants != null ||
    input.publicGoodsFailureBonusMaxPerParticipantCents != null
  ) {
    throw new Error("Failure-bonus schedule terms cannot be stored while the mechanism is disabled.");
  }
  const publicGoodsDeadlineAt = input.publicGoodsDeadlineAt?.trim();
  const publicGoodsVerificationMethod = input.publicGoodsVerificationMethod?.trim();
  const publicGoodsBaselineRule = input.publicGoodsBaselineRule?.trim();
  const publicGoodsExitRule = input.publicGoodsExitRule?.trim();
  const publicGoodsBaseMatchRatio = input.publicGoodsBaseMatchRatio ?? demoMpgfMatchPool.baseMatchRatio;
  const publicGoodsQfEnabled = input.publicGoodsQfEnabled ?? demoMpgfAssuranceRound.qfEnabled;
  const publicGoodsQfCapMultiple = input.publicGoodsQfCapMultiple ?? demoMpgfAssuranceRound.qfCapMultiple;
  const publicGoodsPayoutMethod = input.publicGoodsPayoutMethod ?? "external_handoff";
  const status = input.intent;

  if (!proposedRecipientName && !implementingTeam) {
    throw new Error("MPGF pool proposals require a proposed recipient or implementing team.");
  }

  if (minimumViableFundingCents && minimumViableFundingCents > requestedMaximumFundingCents) {
    throw new Error("Minimum viable funding cannot exceed requested maximum funding.");
  }

  if (publicGoodsThresholdAmountCents && publicGoodsThresholdAmountCents > requestedMaximumFundingCents) {
    throw new Error("Public-goods threshold amount cannot exceed requested maximum funding.");
  }

  if (publicGoodsDeadlineAt && !Number.isFinite(Date.parse(publicGoodsDeadlineAt))) {
    throw new Error("Public-goods deadline must be an ISO timestamp.");
  }

  if (!Number.isFinite(publicGoodsBaseMatchRatio) || publicGoodsBaseMatchRatio < 0) {
    throw new Error("Public-goods base match ratio must be a non-negative number.");
  }

  if (!Number.isFinite(publicGoodsQfCapMultiple) || publicGoodsQfCapMultiple < 0) {
    throw new Error("Public-goods QF cap multiple must be a non-negative number.");
  }

  const supabase = (await createClient()) as SupabaseAny;
  const outcomeUnitsSummary = [
    `Unit: ${outcomeUnitLabel}`,
    `Definition: ${outcomeUnitDefinition}`,
    `Measurement method: ${measurementMethod}`,
    referenceAlternative ? `Reference alternative: ${referenceAlternative}` : null,
    uncertaintyDescription ? `Uncertainty: ${uncertaintyDescription}` : null,
  ].filter(Boolean).join("\n");
  const mutationRequest = {
    title,
    summary,
    causeArea,
    problem,
    intervention,
    moralPublicGoodRationale,
    requestedMaximumFundingCents,
    minimumViableFundingCents,
    outcomeUnitsSummary,
    expectedEffectVsFunding,
    timeline,
    milestones,
    risks,
    misusePathways,
    proposedRecipientName: proposedRecipientName || null,
    implementingTeam: implementingTeam || null,
    publicGoodsDestinationType,
    publicGoodsDestinationRef: publicGoodsDestinationRef || null,
    publicGoodsThresholdAmountCents: publicGoodsThresholdAmountCents ?? null,
    publicGoodsThresholdSupporters: publicGoodsThresholdSupporters ?? null,
    publicGoodsFailureBonusEnabled,
    publicGoodsFailureBonusRateBps: publicGoodsFailureBonusRateBps ?? null,
    publicGoodsFailureBonusEligibilityPolicy:
      publicGoodsFailureBonusEligibilityPolicy ?? null,
    publicGoodsFailureBonusMaxParticipants:
      publicGoodsFailureBonusMaxParticipants ?? null,
    publicGoodsFailureBonusMaxPerParticipantCents:
      publicGoodsFailureBonusMaxPerParticipantCents ?? null,
    publicGoodsThresholdSchedule: publicGoodsThresholdSchedule ?? null,
    publicGoodsFailureBonusScheduleStatus: publicGoodsFailureBonusEnabled ? "pending_review" : null,
    publicGoodsSuccessPremiumRateBps: publicGoodsSuccessPremiumRateBps ?? null,
    publicGoodsSuccessPremiumCents: publicGoodsSuccessPremiumCents ?? null,
    publicGoodsSuccessPremiumPayer: publicGoodsSuccessPremiumPayer ?? null,
    publicGoodsSuccessPremiumPolicyVersion: publicGoodsFailureBonusEnabled
      ? FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION
      : null,
    publicGoodsSuccessPremiumIncludedInNetThreshold: false,
    publicGoodsSuccessPremiumProvisional: publicGoodsFailureBonusEnabled ? true : null,
    publicGoodsGrossSuccessRequirementCents: publicGoodsGrossSuccessRequirementCents ?? null,
    publicGoodsSuccessPremiumPricingAssumptions: publicGoodsSuccessPremiumPricingAssumptions ?? null,
    publicGoodsDeadlineAt: publicGoodsDeadlineAt || null,
    publicGoodsVerificationMethod: publicGoodsVerificationMethod || null,
    publicGoodsBaselineRule: publicGoodsBaselineRule || null,
    publicGoodsExitRule: publicGoodsExitRule || null,
    publicGoodsBaseMatchRatio,
    publicGoodsQfEnabled,
    publicGoodsQfCapMultiple,
    publicGoodsPayoutMethod,
    status,
  };
  const reservation = await reserveIdempotency<MpgfPoolProposalRecord>(supabase, {
    scope: `mpgf:pool-proposal:${input.userId}:${demoCycle.id}:${status}`,
    idempotencyKey: input.idempotencyKey,
    actorUserId: input.userId,
    action: status === "submitted" ? "mpgf.pool_proposal.submit" : "mpgf.pool_proposal.save_draft",
    request: mutationRequest,
  });

  if (reservation.replayed) {
    return reservation.result;
  }

  try {
    const richInsert = await supabase
      .from("mpgf_pool_proposals")
      .insert({
        proposer_id: input.userId,
        title,
        summary,
        cause_area: causeArea,
        problem,
        intervention,
        moral_public_good_rationale: moralPublicGoodRationale,
        requested_maximum_funding_cents: requestedMaximumFundingCents,
        minimum_viable_funding_cents: minimumViableFundingCents ?? null,
        outcome_units_summary: outcomeUnitsSummary,
        expected_effect_vs_funding: expectedEffectVsFunding,
        timeline,
        milestones_json: milestones.map((label) => ({ label })),
        risks_json: risks.map((risk) => ({ risk })),
        misuse_pathways: misusePathways,
        proposed_recipient_name: proposedRecipientName || null,
        implementing_team_json: implementingTeam ? { summary: implementingTeam } : null,
        public_goods_destination_type: publicGoodsDestinationType,
        public_goods_destination_ref: publicGoodsDestinationRef || null,
        public_goods_threshold_amount_cents: publicGoodsThresholdAmountCents ?? null,
        public_goods_threshold_supporters: publicGoodsThresholdSupporters ?? null,
        public_goods_failure_bonus_enabled: publicGoodsFailureBonusEnabled,
        public_goods_failure_bonus_rate_bps: publicGoodsFailureBonusRateBps ?? null,
        public_goods_failure_bonus_eligibility_json:
          publicGoodsFailureBonusEligibilityPolicy ?? null,
        public_goods_failure_bonus_max_participants:
          publicGoodsFailureBonusMaxParticipants ?? null,
        public_goods_failure_bonus_max_per_participant_cents:
          publicGoodsFailureBonusMaxPerParticipantCents ?? null,
        public_goods_threshold_schedule_json: publicGoodsThresholdSchedule ?? null,
        public_goods_failure_bonus_schedule_status: publicGoodsFailureBonusEnabled
          ? "pending_review"
          : null,
        public_goods_success_premium_rate_bps: publicGoodsSuccessPremiumRateBps ?? null,
        public_goods_success_premium_cents: publicGoodsSuccessPremiumCents ?? null,
        public_goods_success_premium_payer: publicGoodsSuccessPremiumPayer ?? null,
        public_goods_success_premium_policy_version: publicGoodsFailureBonusEnabled
          ? FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION
          : null,
        public_goods_success_premium_included_in_net_threshold: false,
        public_goods_success_premium_provisional: publicGoodsFailureBonusEnabled ? true : null,
        public_goods_gross_success_requirement_cents: publicGoodsGrossSuccessRequirementCents ?? null,
        public_goods_success_premium_pricing_json: publicGoodsSuccessPremiumPricingAssumptions ?? null,
        public_goods_deadline_at: publicGoodsDeadlineAt || null,
        public_goods_verification_method: publicGoodsVerificationMethod || null,
        public_goods_baseline_rule: publicGoodsBaselineRule || null,
        public_goods_exit_rule: publicGoodsExitRule || null,
        public_goods_base_match_ratio: publicGoodsBaseMatchRatio,
        public_goods_qf_enabled: publicGoodsQfEnabled,
        public_goods_qf_cap_multiple: publicGoodsQfCapMultiple,
        public_goods_payout_method: publicGoodsPayoutMethod,
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
        status,
      })
      .select("*")
      .single();

    if (!richInsert.error) {
      const proposal = mapPoolProposalRow(richInsert.data as Record<string, unknown>);
      await recordParticipantMutationEvidence(supabase, {
        actorUserId: input.userId,
        action: status === "submitted" ? "mpgf.pool_proposal.submit" : "mpgf.pool_proposal.save_draft",
        objectType: "pool",
        objectId: proposal.id,
        fromStatus: null,
        toStatus: proposal.status,
        reason:
          status === "submitted"
            ? "participant submitted candidate pool proposal"
            : "participant saved candidate pool proposal draft",
        eventJson: {
          requestedMaximumFundingCents,
          causeArea,
          publicGoodsDestinationType,
          publicGoodsThresholdAmountCents: publicGoodsThresholdAmountCents ?? null,
          publicGoodsThresholdSupporters: publicGoodsThresholdSupporters ?? null,
          publicGoodsFailureBonusEnabled,
          publicGoodsThresholdCount: publicGoodsThresholdSchedule?.thresholds.length ?? 0,
          publicGoodsFailureBonusMaxParticipants:
            publicGoodsFailureBonusMaxParticipants ?? null,
          publicGoodsFailureBonusMaxPerParticipantCents:
            publicGoodsFailureBonusMaxPerParticipantCents ?? null,
          publicGoodsSuccessPremiumRateBps: publicGoodsSuccessPremiumRateBps ?? null,
          publicGoodsSuccessPremiumCents: publicGoodsSuccessPremiumCents ?? null,
          publicGoodsGrossSuccessRequirementCents: publicGoodsGrossSuccessRequirementCents ?? null,
        },
      });
      await completeIdempotency(supabase, reservation, proposal);
      return proposal;
    }

    if (!isMissingColumnError(richInsert.error)) {
      throw new Error(`Could not save MPGF pool proposal: ${summarizeDbError(richInsert.error)}`);
    }

    const legacyInsert = await supabase
      .from("mpgf_pool_proposals")
      .insert({
        proposer_id: input.userId,
        title,
        problem,
        intervention: [
          intervention,
          "",
          `Summary: ${summary}`,
          `Cause area: ${causeArea}`,
          `Requested maximum funding: ${requestedMaximumFundingCents} cents`,
          minimumViableFundingCents ? `Minimum viable funding: ${minimumViableFundingCents} cents` : null,
          outcomeUnitsSummary,
          `Expected effect vs funding: ${expectedEffectVsFunding}`,
          `Timeline: ${timeline}`,
          `Milestones: ${milestones.join("; ")}`,
          publicGoodsDestinationRef ? `Destination: ${publicGoodsDestinationType} ${publicGoodsDestinationRef}` : null,
          publicGoodsThresholdAmountCents ? `Threshold: ${publicGoodsThresholdAmountCents} cents` : null,
          publicGoodsThresholdSupporters ? `Verified supporters: ${publicGoodsThresholdSupporters}` : null,
          publicGoodsFailureBonusEnabled
            ? `Failure bonus: ${publicGoodsFailureBonusRateBps} bps across ${publicGoodsThresholdSchedule?.thresholds.length ?? 0} cumulative threshold(s); threshold-1 success premium: ${publicGoodsSuccessPremiumRateBps} bps paid by ${publicGoodsSuccessPremiumPayer}; net thresholds exclude premiums; threshold-1 gross success requirement: ${publicGoodsGrossSuccessRequirementCents} cents; maximum participants: ${publicGoodsFailureBonusMaxParticipants}; per-person bonus cap: ${publicGoodsFailureBonusMaxPerParticipantCents} cents`
            : null,
        ].filter(Boolean).join("\n"),
        moral_public_good_rationale: [
          moralPublicGoodRationale,
          `Risks: ${risks.join("; ")}`,
          `Misuse pathways: ${misusePathways}`,
          publicGoodsVerificationMethod ? `Verification: ${publicGoodsVerificationMethod}` : null,
          publicGoodsBaselineRule ? `Baseline: ${publicGoodsBaselineRule}` : null,
          publicGoodsExitRule ? `Exit: ${publicGoodsExitRule}` : null,
          implementingTeam ? `Implementing team: ${implementingTeam}` : null,
        ].filter(Boolean).join("\n"),
        proposed_recipient_name: proposedRecipientName || null,
        status,
      })
      .select("*")
      .single();

    if (legacyInsert.error) {
      throw new Error(`Could not save MPGF pool proposal: ${summarizeDbError(legacyInsert.error)}`);
    }

    const proposal: MpgfPoolProposalRecord = {
      ...mapPoolProposalRow(legacyInsert.data as Record<string, unknown>),
      summary,
      causeArea,
      requestedMaximumFundingCents,
      minimumViableFundingCents,
      outcomeUnitsSummary,
      expectedEffectVsFunding,
      timeline,
      milestones,
      risks,
      misusePathways,
      implementingTeam: implementingTeam || undefined,
      publicGoodsDestinationType,
      publicGoodsDestinationRef: publicGoodsDestinationRef || undefined,
      publicGoodsThresholdAmountCents,
      publicGoodsThresholdSupporters,
      publicGoodsFailureBonusEnabled,
      publicGoodsFailureBonusRateBps,
      publicGoodsFailureBonusEligibilityPolicy,
      publicGoodsFailureBonusMaxParticipants,
      publicGoodsFailureBonusMaxPerParticipantCents,
      publicGoodsThresholdSchedule,
      publicGoodsFailureBonusScheduleStatus: publicGoodsFailureBonusEnabled
        ? "pending_review"
        : undefined,
      publicGoodsSuccessPremiumRateBps,
      publicGoodsSuccessPremiumCents,
      publicGoodsSuccessPremiumPayer,
      publicGoodsSuccessPremiumPolicyVersion: publicGoodsFailureBonusEnabled
        ? FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION
        : undefined,
      publicGoodsSuccessPremiumIncludedInNetThreshold: false as const,
      publicGoodsSuccessPremiumProvisional: publicGoodsFailureBonusEnabled ? true : undefined,
      publicGoodsGrossSuccessRequirementCents,
      publicGoodsSuccessPremiumPricingAssumptions,
      publicGoodsDeadlineAt: publicGoodsDeadlineAt || undefined,
      publicGoodsVerificationMethod: publicGoodsVerificationMethod || undefined,
      publicGoodsBaselineRule: publicGoodsBaselineRule || undefined,
      publicGoodsExitRule: publicGoodsExitRule || undefined,
      publicGoodsBaseMatchRatio,
      publicGoodsQfEnabled,
      publicGoodsQfCapMultiple,
      publicGoodsPayoutMethod,
    };
    await recordParticipantMutationEvidence(supabase, {
      actorUserId: input.userId,
      action: status === "submitted" ? "mpgf.pool_proposal.submit" : "mpgf.pool_proposal.save_draft",
      objectType: "pool",
      objectId: proposal.id,
      fromStatus: null,
      toStatus: proposal.status,
      reason:
        status === "submitted"
          ? "participant submitted candidate pool proposal in compatibility mode"
          : "participant saved candidate pool proposal draft in compatibility mode",
      eventJson: {
        requestedMaximumFundingCents,
        causeArea,
        compatibilityMode: true,
        publicGoodsDestinationType,
        publicGoodsThresholdAmountCents: publicGoodsThresholdAmountCents ?? null,
        publicGoodsThresholdSupporters: publicGoodsThresholdSupporters ?? null,
        publicGoodsFailureBonusEnabled,
        publicGoodsThresholdCount: publicGoodsThresholdSchedule?.thresholds.length ?? 0,
        publicGoodsFailureBonusMaxParticipants:
          publicGoodsFailureBonusMaxParticipants ?? null,
        publicGoodsFailureBonusMaxPerParticipantCents:
          publicGoodsFailureBonusMaxPerParticipantCents ?? null,
        publicGoodsSuccessPremiumRateBps: publicGoodsSuccessPremiumRateBps ?? null,
        publicGoodsSuccessPremiumCents: publicGoodsSuccessPremiumCents ?? null,
        publicGoodsGrossSuccessRequirementCents: publicGoodsGrossSuccessRequirementCents ?? null,
      },
    });
    await completeIdempotency(supabase, reservation, proposal);
    return proposal;
  } catch (error) {
    await failIdempotency(supabase, reservation);
    throw error;
  }
}

export async function persistMpgfBallot(input: SaveBallotInput) {
  const supabase = (await createClient()) as SupabaseAny;
  const warnings = await ensureMpgfDemoCatalog(supabase);
  const weights = normalizeBallotWeights(
    demoAlternatives.map((alternative) => ({
      alternativeId: alternative.id,
      valueBps: input.weightsByAlternativeId[alternative.id] ?? alternative.demoPriorityBps,
      strongNegative: false,
    })),
  );
  const totalAbsIntegralBps = weights.reduce((sum, weight) => sum + Math.abs(weight.valueBps), 0);
  const status = input.intent === "submitted" ? "submitted" : "draft";
  const richRow = {
    cycle_id: demoCycle.id,
    profile_id: input.userId,
    user_id: input.userId,
    voter_label: input.displayName,
    weights_json: weights,
    total_abs_integral_rational_json: { num: String(totalAbsIntegralBps), den: "10000" },
    total_abs_integral_decimal_cache: totalAbsIntegralBps / 10_000,
    locked_budget_cents_at_submission: demoCycle.budgetCents,
    status,
    draft_version: 1,
    real_money: false,
  };
  const reservation = await reserveIdempotency<{ ballot: MpgfBallot; warnings: string[] }>(supabase, {
    scope: `mpgf:ballot:${input.userId}:${demoCycle.id}:${status}`,
    idempotencyKey: input.idempotencyKey,
    actorUserId: input.userId,
    action: status === "submitted" ? "mpgf.ballot.submit_final" : "mpgf.ballot.save_draft",
    request: {
      weights,
      totalAbsIntegralBps,
      status,
    },
  });

  if (reservation.replayed) {
    return reservation.result;
  }

  try {
    const richInsert = await supabase.from("mpgf_ballots").insert(richRow).select("*").single();

    if (richInsert.error && isMissingColumnError(richInsert.error)) {
      const baseInsert = await supabase
        .from("mpgf_ballots")
        .insert({
          cycle_id: demoCycle.id,
          profile_id: input.userId,
          voter_label: input.displayName,
          weights_json: weights,
          total_abs_integral_rational_json: { num: String(totalAbsIntegralBps), den: "10000" },
          real_money: false,
        })
        .select("*")
        .single();

      if (baseInsert.error) {
        throw new Error(`Could not save MPGF ballot: ${summarizeDbError(baseInsert.error)}`);
      }

      warnings.push("Ballot status columns are unavailable; the ballot was saved in base compatibility mode.");
      const result = { ballot: mapBallotRow(baseInsert.data as Record<string, unknown>), warnings };
      await recordParticipantMutationEvidence(supabase, {
        actorUserId: input.userId,
        action: status === "submitted" ? "mpgf.ballot.submit_final" : "mpgf.ballot.save_draft",
        objectType: "ballot",
        objectId: result.ballot.id,
        fromStatus: null,
        toStatus: result.ballot.status ?? status,
        reason:
          status === "submitted"
            ? "participant submitted final ballot in compatibility mode"
            : "participant saved ballot draft in compatibility mode",
        eventJson: { totalAbsIntegralBps, compatibilityMode: true },
      });
      await completeIdempotency(supabase, reservation, result);
      return result;
    }

    if (richInsert.error) {
      throw new Error(`Could not save MPGF ballot: ${summarizeDbError(richInsert.error)}`);
    }

    const result = { ballot: mapBallotRow(richInsert.data as Record<string, unknown>), warnings };
    await recordParticipantMutationEvidence(supabase, {
      actorUserId: input.userId,
      action: status === "submitted" ? "mpgf.ballot.submit_final" : "mpgf.ballot.save_draft",
      objectType: "ballot",
      objectId: result.ballot.id,
      fromStatus: null,
      toStatus: result.ballot.status ?? status,
      reason: status === "submitted" ? "participant submitted final ballot" : "participant saved ballot draft",
      eventJson: { totalAbsIntegralBps },
    });
    await completeIdempotency(supabase, reservation, result);
    return result;
  } catch (error) {
    await failIdempotency(supabase, reservation);
    throw error;
  }
}

export const mpgfPersistenceMappers = {
  mapPledgeRow,
  mapRecurringCommitmentRow,
  mapBallotRow,
};
