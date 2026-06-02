import { createHash } from "node:crypto";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

import { demoMpgfAssurancePledges, demoMpgfAssuranceRound } from "./data";
import { allocateMpgfAssuranceRound } from "./mechanism";
import type { MpgfPublicGoodsPledge, MpgfPublicGoodsRoundAllocation } from "./types";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

type MpgfConditionalPledgeRow = Pick<
  Database["public"]["Tables"]["mpgf_conditional_pledges"]["Row"],
  | "id"
  | "round_id"
  | "campaign_id"
  | "profile_id"
  | "amount_cents"
  | "counted_cap_cents"
  | "visibility"
  | "payment_mode"
  | "status"
  | "created_at"
>;

type MpgfPledgeIntentRow = Pick<
  Database["public"]["Tables"]["mpgf_pledge_intents"]["Row"],
  | "id"
  | "round_id"
  | "campaign_id"
  | "profile_id"
  | "user_ref_hash"
  | "amount_cents"
  | "visibility_pref"
  | "payment_state"
  | "counting_state"
  | "created_at"
>;

type MpgfIdentityVerificationRow = Pick<
  Database["public"]["Tables"]["mpgf_identity_verifications"]["Row"],
  | "id"
  | "pledge_intent_id"
  | "status"
  | "human_score_bps"
  | "counts_for_matching"
  | "verified_at"
  | "created_at"
>;

type MpgfPaymentEventRow = Pick<
  Database["public"]["Tables"]["mpgf_payment_events"]["Row"],
  | "id"
  | "conditional_pledge_id"
  | "provider"
  | "provider_event_id_hash"
  | "provider_status"
  | "amount_cents"
  | "signature_verified"
  | "verified_at"
  | "append_only_hash"
  | "created_at"
>;

type MpgfProviderPaymentEventRow = Pick<
  Database["public"]["Tables"]["mpgf_provider_payment_events"]["Row"],
  | "id"
  | "pledge_intent_id"
  | "provider"
  | "provider_event_ref_hash"
  | "event_type"
  | "amount_cents"
  | "status"
  | "signature_verified"
  | "append_only_hash"
  | "received_at"
  | "created_at"
>;

export type MpgfPublicGoodsAllocationContributionSource =
  | "database_conditional_pledges"
  | "demo_fixture"
  | "explicit_input";

export interface MpgfPublicGoodsAllocationContributionLoadResult {
  source: MpgfPublicGoodsAllocationContributionSource;
  pledges: MpgfPublicGoodsPledge[];
  rawConditionalPledgeCount: number;
  rawPaymentObjectCount: number;
  eligibleContributionRecordCount: number;
  warnings: string[];
}

export interface MpgfPublicGoodsAllocationResultRow {
  round_id: string;
  campaign_id: string;
  formula_version: MpgfPublicGoodsRoundAllocation["formulaVersion"];
  qf_allocation_policy: MpgfPublicGoodsRoundAllocation["qfAllocationPolicy"];
  qf_lambda: number;
  direct_eligible_cents: number;
  verified_supporter_count: number;
  base_match_cents: number;
  qf_score: number;
  qf_bonus_cents: number;
  qf_bonus_cap_cents: number;
  total_payout_cents: number;
  status: string;
  proof_required: string;
  custody_mode: string;
  source_contribution_digest: string;
  eligible_contribution_record_count: number;
  raw_payment_object_count: number;
  unique_counted_identity_count: number;
  regenerated_from_contribution_records: true;
  locked_parameter_digest: string;
  allocation_calculation_hash: string;
  parameters_locked_before_round_open: true;
  finalized_at: string;
}

export interface MpgfPublicGoodsAllocationSourceProof {
  campaignId: string;
  sourceContributionDigest: string;
  eligibleContributionRecordCount: number;
  rawPaymentObjectCount: number;
  uniqueCountedIdentityCount: number;
  regeneratedFromContributionRecords: true;
}

export interface PersistMpgfPublicGoodsAllocationResultsResult {
  ok: boolean;
  status: "persisted" | "dry_run" | "not_configured";
  allocation: MpgfPublicGoodsRoundAllocation;
  rows: MpgfPublicGoodsAllocationResultRow[];
  persistedCount: number;
  contributionSource: MpgfPublicGoodsAllocationContributionSource;
  loadedContributionRecordCount: number;
  eligibleContributionRecordCount: number;
  rawPaymentObjectCount: number;
  warnings: string[];
}

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function hashPublicSource(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function isActiveContributionRecord(pledge: MpgfPublicGoodsPledge) {
  return pledge.status === "pledged" || pledge.status === "captured";
}

function isEligibleCountedContributionRecord(pledge: MpgfPublicGoodsPledge) {
  return isActiveContributionRecord(pledge) && pledge.eligibilityState === "eligible" && pledge.amountCents > 0;
}

function groupBy<T, K extends string>(rows: T[], keyForRow: (row: T) => K | null | undefined) {
  const grouped = new Map<K, T[]>();

  for (const row of rows) {
    const key = keyForRow(row);

    if (!key) {
      continue;
    }

    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  return grouped;
}

function newestFirst<T extends { created_at: string; id: string }>(rows: T[]) {
  return [...rows].sort((left, right) => right.created_at.localeCompare(left.created_at) || left.id.localeCompare(right.id));
}

function bestIdentityVerification(rows: MpgfIdentityVerificationRow[]) {
  return newestFirst(rows).sort((left, right) => {
    const leftVerified = left.status === "verified" && left.counts_for_matching ? 1 : 0;
    const rightVerified = right.status === "verified" && right.counts_for_matching ? 1 : 0;

    return rightVerified - leftVerified;
  })[0];
}

function isCountableSharedPaymentEvent(event: MpgfPaymentEventRow) {
  const status = event.provider_status.toLowerCase();
  const countableStatuses = new Set([
    "recorded",
    "capture_succeeded",
    "external_handoff_verified",
    "payment_intent_succeeded_pending_review",
  ]);

  return (
    event.signature_verified &&
    event.amount_cents > 0 &&
    countableStatuses.has(status) &&
    (event.verified_at !== null || status === "payment_intent_succeeded_pending_review")
  );
}

function isCountableProviderPaymentEvent(event: MpgfProviderPaymentEventRow) {
  return (
    event.signature_verified &&
    event.amount_cents > 0 &&
    event.status === "recorded" &&
    event.event_type === "capture_succeeded"
  );
}

function paymentIntentRefFrom(
  sharedPaymentEvents: MpgfPaymentEventRow[],
  providerPaymentEvents: MpgfProviderPaymentEventRow[],
) {
  const shared = newestFirst(sharedPaymentEvents)[0];

  if (shared) {
    return `payment-event:${shared.provider_event_id_hash || shared.append_only_hash}`;
  }

  const provider = [...providerPaymentEvents].sort(
    (left, right) => right.received_at.localeCompare(left.received_at) || left.id.localeCompare(right.id),
  )[0];

  if (provider) {
    return `payment-event:${provider.provider_event_ref_hash || provider.append_only_hash}`;
  }

  return undefined;
}

function captureModeForPaymentMode(
  paymentMode: MpgfConditionalPledgeRow["payment_mode"],
): MpgfPublicGoodsPledge["captureMode"] {
  if (paymentMode === "stripe_setup_intent_saved_commitment") {
    return "stored_payment_method";
  }

  if (paymentMode === "manual_proof_fallback") {
    return "signed_intent";
  }

  return "external_handoff";
}

function statusForContribution(input: {
  conditionalPledge: MpgfConditionalPledgeRow;
  pledgeIntent?: MpgfPledgeIntentRow;
  hasCountablePayment: boolean;
}): MpgfPublicGoodsPledge["status"] {
  if (input.conditionalPledge.status === "voided" || input.pledgeIntent?.payment_state === "voided") {
    return "voided";
  }

  if (input.conditionalPledge.status === "expired" || input.pledgeIntent?.payment_state === "expired") {
    return "expired";
  }

  if (input.hasCountablePayment || input.pledgeIntent?.payment_state === "captured") {
    return "captured";
  }

  return "pledged";
}

function eligibilityStateForContribution(input: {
  conditionalPledge: MpgfConditionalPledgeRow;
  pledgeIntent?: MpgfPledgeIntentRow;
  identityVerification?: MpgfIdentityVerificationRow;
  hasCountablePayment: boolean;
}) {
  const countedAfterReview =
    input.conditionalPledge.status === "counted" ||
    input.pledgeIntent?.counting_state === "counted_after_review";
  const identity = input.identityVerification;

  if (input.pledgeIntent?.counting_state === "excluded" || identity?.status === "blocked") {
    return "blocked" satisfies MpgfPublicGoodsPledge["eligibilityState"];
  }

  if (identity?.status === "duplicate_identity") {
    return "duplicate_identity" satisfies MpgfPublicGoodsPledge["eligibilityState"];
  }

  if (input.conditionalPledge.amount_cents <= 0 || input.conditionalPledge.counted_cap_cents <= 0) {
    return "below_minimum" satisfies MpgfPublicGoodsPledge["eligibilityState"];
  }

  if (identity?.status !== "verified" || !identity.counts_for_matching) {
    return "pending_review" satisfies MpgfPublicGoodsPledge["eligibilityState"];
  }

  if (!input.hasCountablePayment || !countedAfterReview) {
    return "pending_review" satisfies MpgfPublicGoodsPledge["eligibilityState"];
  }

  return "eligible" satisfies MpgfPublicGoodsPledge["eligibilityState"];
}

export function buildMpgfPublicGoodsPledgesFromContributionRows({
  conditionalPledges,
  pledgeIntents,
  identityVerifications,
  paymentEvents,
  providerPaymentEvents,
}: {
  conditionalPledges: MpgfConditionalPledgeRow[];
  pledgeIntents: MpgfPledgeIntentRow[];
  identityVerifications: MpgfIdentityVerificationRow[];
  paymentEvents: MpgfPaymentEventRow[];
  providerPaymentEvents: MpgfProviderPaymentEventRow[];
}): MpgfPublicGoodsPledge[] {
  const intentById = new Map(pledgeIntents.map((intent) => [intent.id, intent]));
  const identityByIntentId = groupBy(identityVerifications, (identity) => identity.pledge_intent_id);
  const sharedPaymentsByPledgeId = groupBy(paymentEvents.filter(isCountableSharedPaymentEvent), (event) => event.conditional_pledge_id);
  const providerPaymentsByIntentId = groupBy(
    providerPaymentEvents.filter(isCountableProviderPaymentEvent),
    (event) => event.pledge_intent_id,
  );

  return [...conditionalPledges]
    .sort((left, right) => left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id))
    .map((conditionalPledge) => {
      const pledgeIntent = intentById.get(conditionalPledge.id);
      const identityVerification = bestIdentityVerification(
        pledgeIntent ? identityByIntentId.get(pledgeIntent.id) ?? [] : [],
      );
      const sharedPaymentEvents = sharedPaymentsByPledgeId.get(conditionalPledge.id) ?? [];
      const providerPaymentEventsForIntent = pledgeIntent ? providerPaymentsByIntentId.get(pledgeIntent.id) ?? [] : [];
      const hasCountablePayment = sharedPaymentEvents.length > 0 || providerPaymentEventsForIntent.length > 0;
      const maxPaymentAmountCents = Math.max(
        0,
        ...sharedPaymentEvents.map((event) => event.amount_cents),
        ...providerPaymentEventsForIntent.map((event) => event.amount_cents),
      );
      const amountCents = Math.max(
        0,
        Math.min(
          conditionalPledge.amount_cents,
          conditionalPledge.counted_cap_cents,
          maxPaymentAmountCents > 0 ? maxPaymentAmountCents : conditionalPledge.amount_cents,
        ),
      );
      const paymentIntentRef = paymentIntentRefFrom(sharedPaymentEvents, providerPaymentEventsForIntent);

      return {
        id: conditionalPledge.id,
        campaignId: conditionalPledge.campaign_id,
        userId: pledgeIntent?.user_ref_hash ?? conditionalPledge.profile_id ?? hashPublicSource(["mpgf-anonymous-pledge", conditionalPledge.id]),
        amountCents,
        visibilityMode: conditionalPledge.visibility,
        isRecurring: false,
        captureMode: captureModeForPaymentMode(conditionalPledge.payment_mode),
        ...(paymentIntentRef ? { paymentIntentRef } : {}),
        eligibilityState: eligibilityStateForContribution({
          conditionalPledge,
          pledgeIntent,
          identityVerification,
          hasCountablePayment,
        }),
        humanScoreBps: identityVerification?.human_score_bps ?? 0,
        status: statusForContribution({ conditionalPledge, pledgeIntent, hasCountablePayment }),
        createdAt: conditionalPledge.created_at,
      };
    });
}

function normalizedAllocationSourceRecords(campaignId: string, pledges: MpgfPublicGoodsPledge[]) {
  return pledges
    .filter((pledge) => pledge.campaignId === campaignId && isActiveContributionRecord(pledge))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
    .map((pledge) => ({
      campaignId: pledge.campaignId,
      contributionRefHash: hashPublicSource(["mpgf-public-goods-contribution", pledge.id]),
      donorRefHash: hashPublicSource(["mpgf-public-goods-counted-identity", pledge.userId]),
      amountCents: Math.max(0, Math.floor(pledge.amountCents)),
      captureMode: pledge.captureMode,
      eligibilityState: pledge.eligibilityState,
      status: pledge.status,
      isRecurring: pledge.isRecurring,
      paymentIntentPresent: Boolean(pledge.paymentIntentRef),
    }));
}

function normalizedAllocationParameterProof(allocation: MpgfPublicGoodsRoundAllocation) {
  return {
    roundId: allocation.roundId,
    matchPoolId: allocation.matchPoolId,
    formulaVersion: allocation.formulaVersion,
    qfAllocationPolicy: allocation.qfAllocationPolicy,
    qfLambda: allocation.qfLambda,
    baseMatchBudgetCents: allocation.baseMatchBudgetCents,
    qfBonusBudgetCents: allocation.qfBonusBudgetCents,
    proofPageRequired: allocation.proofPageRequired,
    parametersLockedBeforeRoundOpen: true,
  };
}

function allocationRowCalculationHash(input: {
  allocation: MpgfPublicGoodsRoundAllocation;
  line: MpgfPublicGoodsRoundAllocation["lines"][number];
  sourceProof: MpgfPublicGoodsAllocationSourceProof;
}) {
  return hashPublicSource({
    parameterProof: normalizedAllocationParameterProof(input.allocation),
    sourceProof: input.sourceProof,
    line: input.line,
  });
}

export function buildMpgfPublicGoodsAllocationSourceProofMap({
  allocation = allocateMpgfAssuranceRound(),
  pledges = demoMpgfAssurancePledges,
}: {
  allocation?: MpgfPublicGoodsRoundAllocation;
  pledges?: MpgfPublicGoodsPledge[];
} = {}) {
  return new Map(
    allocation.lines.map((line) => {
      const activeRecords = pledges.filter(
        (pledge) => pledge.campaignId === line.campaignId && isActiveContributionRecord(pledge),
      );
      const eligibleRecords = activeRecords.filter(isEligibleCountedContributionRecord);
      const uniqueCountedIdentities = new Set(eligibleRecords.map((pledge) => pledge.userId));
      const sourceProof: MpgfPublicGoodsAllocationSourceProof = {
        campaignId: line.campaignId,
        sourceContributionDigest: hashPublicSource(normalizedAllocationSourceRecords(line.campaignId, pledges)),
        eligibleContributionRecordCount: eligibleRecords.length,
        rawPaymentObjectCount: activeRecords.length,
        uniqueCountedIdentityCount: uniqueCountedIdentities.size,
        regeneratedFromContributionRecords: true,
      };

      return [line.campaignId, sourceProof] as const;
    }),
  );
}

async function selectSupabaseRows<T>(
  supabase: SupabaseServiceAny,
  table: string,
  select: string,
  filterQuery: (query: any) => any,
) {
  const result = await filterQuery(supabase.from(table).select(select));

  if (result.error) {
    throw new Error(`Could not load MPGF public-goods contribution records from ${table}: ${result.error.message}`);
  }

  return (result.data ?? []) as T[];
}

export async function loadMpgfPublicGoodsAllocationContributionRecords({
  roundId = demoMpgfAssuranceRound.id,
}: {
  roundId?: string;
} = {}): Promise<MpgfPublicGoodsAllocationContributionLoadResult> {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return {
      source: "demo_fixture",
      pledges: demoMpgfAssurancePledges,
      rawConditionalPledgeCount: demoMpgfAssurancePledges.length,
      rawPaymentObjectCount: demoMpgfAssurancePledges.length,
      eligibleContributionRecordCount: demoMpgfAssurancePledges.filter(isEligibleCountedContributionRecord).length,
      warnings: [
        "Supabase service-role contribution loading is not configured; using demo MPGF contribution fixture for local allocation output.",
      ],
    };
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const conditionalPledges = await selectSupabaseRows<MpgfConditionalPledgeRow>(
    supabase,
    "mpgf_conditional_pledges",
    [
      "id",
      "round_id",
      "campaign_id",
      "profile_id",
      "amount_cents",
      "counted_cap_cents",
      "visibility",
      "payment_mode",
      "status",
      "created_at",
    ].join(","),
    (query) => query.eq("round_id", roundId),
  );
  const conditionalPledgeIds = conditionalPledges.map((pledge) => pledge.id);

  if (conditionalPledgeIds.length === 0) {
    return {
      source: "database_conditional_pledges",
      pledges: [],
      rawConditionalPledgeCount: 0,
      rawPaymentObjectCount: 0,
      eligibleContributionRecordCount: 0,
      warnings: [],
    };
  }

  const pledgeIntents = await selectSupabaseRows<MpgfPledgeIntentRow>(
    supabase,
    "mpgf_pledge_intents",
    [
      "id",
      "round_id",
      "campaign_id",
      "profile_id",
      "user_ref_hash",
      "amount_cents",
      "visibility_pref",
      "payment_state",
      "counting_state",
      "created_at",
    ].join(","),
    (query) => query.in("id", conditionalPledgeIds),
  );
  const pledgeIntentIds = pledgeIntents.map((intent) => intent.id);
  const identityVerifications =
    pledgeIntentIds.length > 0
      ? await selectSupabaseRows<MpgfIdentityVerificationRow>(
          supabase,
          "mpgf_identity_verifications",
          ["id", "pledge_intent_id", "status", "human_score_bps", "counts_for_matching", "verified_at", "created_at"].join(","),
          (query) => query.in("pledge_intent_id", pledgeIntentIds),
        )
      : [];
  const paymentEvents = await selectSupabaseRows<MpgfPaymentEventRow>(
    supabase,
    "mpgf_payment_events",
    [
      "id",
      "conditional_pledge_id",
      "provider",
      "provider_event_id_hash",
      "provider_status",
      "amount_cents",
      "signature_verified",
      "verified_at",
      "append_only_hash",
      "created_at",
    ].join(","),
    (query) => query.in("conditional_pledge_id", conditionalPledgeIds),
  );
  const providerPaymentEvents =
    pledgeIntentIds.length > 0
      ? await selectSupabaseRows<MpgfProviderPaymentEventRow>(
          supabase,
          "mpgf_provider_payment_events",
          [
            "id",
            "pledge_intent_id",
            "provider",
            "provider_event_ref_hash",
            "event_type",
            "amount_cents",
            "status",
            "signature_verified",
            "append_only_hash",
            "received_at",
            "created_at",
          ].join(","),
          (query) => query.in("pledge_intent_id", pledgeIntentIds),
        )
      : [];
  const pledges = buildMpgfPublicGoodsPledgesFromContributionRows({
    conditionalPledges,
    pledgeIntents,
    identityVerifications,
    paymentEvents,
    providerPaymentEvents,
  });

  return {
    source: "database_conditional_pledges",
    pledges,
    rawConditionalPledgeCount: conditionalPledges.length,
    rawPaymentObjectCount: paymentEvents.length + providerPaymentEvents.length,
    eligibleContributionRecordCount: pledges.filter(isEligibleCountedContributionRecord).length,
    warnings: [],
  };
}

function assertAllocationRowsAreSafe(input: {
  allocation: MpgfPublicGoodsRoundAllocation;
  rows: MpgfPublicGoodsAllocationResultRow[];
}) {
  const rowCampaignIds = new Set(input.rows.map((row) => row.campaign_id));

  if (rowCampaignIds.size !== input.rows.length) {
    throw new Error("MPGF public-goods allocation rows must have one row per campaign.");
  }

  for (const row of input.rows) {
    if (row.qf_bonus_cents > row.qf_bonus_cap_cents) {
      throw new Error(`MPGF public-goods QF cap violated for ${row.campaign_id}.`);
    }

    if (row.status !== "payable" && row.total_payout_cents !== 0) {
      throw new Error(`MPGF public-goods non-payable campaign ${row.campaign_id} cannot persist payout.`);
    }

    if (!row.source_contribution_digest.startsWith("sha256:")) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} must include a source digest.`);
    }

    if (!row.locked_parameter_digest.startsWith("sha256:")) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} must include a locked parameter digest.`);
    }

    if (!row.allocation_calculation_hash.startsWith("sha256:")) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} must include a calculation hash.`);
    }

    if (row.formula_version !== input.allocation.formulaVersion) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} has the wrong formula version.`);
    }

    if (row.qf_allocation_policy !== input.allocation.qfAllocationPolicy) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} has the wrong QF policy.`);
    }

    if (row.qf_lambda !== input.allocation.qfLambda) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} has the wrong QF lambda.`);
    }

    if (!row.parameters_locked_before_round_open) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} must preserve locked parameters.`);
    }

    if (!row.regenerated_from_contribution_records) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} must regenerate from contribution records.`);
    }

    if (row.unique_counted_identity_count > row.eligible_contribution_record_count) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} over-counts unique identities.`);
    }

    if (row.eligible_contribution_record_count > row.raw_payment_object_count) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} has more eligible records than raw records.`);
    }

    if (row.verified_supporter_count !== row.unique_counted_identity_count) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} must publish unique counted identities.`);
    }

    if (
      row.direct_eligible_cents < 0 ||
      row.verified_supporter_count < 0 ||
      row.base_match_cents < 0 ||
      row.qf_bonus_cents < 0 ||
      row.total_payout_cents < 0 ||
      row.eligible_contribution_record_count < 0 ||
      row.raw_payment_object_count < 0 ||
      row.unique_counted_identity_count < 0
    ) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} has a negative amount.`);
    }
  }

  const baseMatchAllocated = input.rows.reduce((sum, row) => sum + row.base_match_cents, 0);
  const qfAllocated = input.rows.reduce((sum, row) => sum + row.qf_bonus_cents, 0);

  if (baseMatchAllocated > input.allocation.baseMatchBudgetCents) {
    throw new Error("MPGF public-goods base match allocation exceeds the sponsor budget.");
  }

  if (qfAllocated > input.allocation.qfBonusBudgetCents) {
    throw new Error("MPGF public-goods QF allocation exceeds the QF bonus budget.");
  }
}

export function buildMpgfPublicGoodsAllocationResultRows({
  allocation = allocateMpgfAssuranceRound(),
  pledges = demoMpgfAssurancePledges,
  finalizedAt = new Date("2026-05-29T12:00:00.000Z").toISOString(),
}: {
  allocation?: MpgfPublicGoodsRoundAllocation;
  pledges?: MpgfPublicGoodsPledge[];
  finalizedAt?: string;
} = {}) {
  const sourceProofByCampaignId = buildMpgfPublicGoodsAllocationSourceProofMap({ allocation, pledges });
  const lockedParameterDigest = hashPublicSource(normalizedAllocationParameterProof(allocation));
  const rows = allocation.lines.map((line) => {
    const sourceProof = sourceProofByCampaignId.get(line.campaignId);

    if (!sourceProof) {
      throw new Error(`MPGF public-goods allocation source proof missing for ${line.campaignId}.`);
    }

    return {
      round_id: allocation.roundId,
      campaign_id: line.campaignId,
      formula_version: allocation.formulaVersion,
      qf_allocation_policy: allocation.qfAllocationPolicy,
      qf_lambda: allocation.qfLambda,
      direct_eligible_cents: line.directEligibleCents,
      verified_supporter_count: line.verifiedSupporterCount,
      base_match_cents: line.baseMatchCents,
      qf_score: line.qfScore,
      qf_bonus_cents: line.qfBonusCents,
      qf_bonus_cap_cents: line.qfBonusCapCents,
      total_payout_cents: line.status === "payable" ? line.totalPayoutCents : 0,
      status: line.status,
      proof_required: line.proofRequired,
      custody_mode: line.custodyMode,
      source_contribution_digest: sourceProof.sourceContributionDigest,
      eligible_contribution_record_count: sourceProof.eligibleContributionRecordCount,
      raw_payment_object_count: sourceProof.rawPaymentObjectCount,
      unique_counted_identity_count: sourceProof.uniqueCountedIdentityCount,
      regenerated_from_contribution_records: sourceProof.regeneratedFromContributionRecords,
      locked_parameter_digest: lockedParameterDigest,
      allocation_calculation_hash: allocationRowCalculationHash({ allocation, line, sourceProof }),
      parameters_locked_before_round_open: true,
      finalized_at: finalizedAt,
    };
  }) satisfies MpgfPublicGoodsAllocationResultRow[];

  assertAllocationRowsAreSafe({ allocation, rows });

  return rows;
}

export async function persistMpgfPublicGoodsAllocationResults({
  allocation,
  pledges,
  dryRun = false,
  finalizedAt = new Date().toISOString(),
  roundId = demoMpgfAssuranceRound.id,
}: {
  allocation?: MpgfPublicGoodsRoundAllocation;
  pledges?: MpgfPublicGoodsPledge[];
  dryRun?: boolean;
  finalizedAt?: string;
  roundId?: string;
} = {}): Promise<PersistMpgfPublicGoodsAllocationResultsResult> {
  const contributionLoad = pledges
    ? {
        source: "explicit_input" as const,
        pledges,
        rawConditionalPledgeCount: pledges.length,
        rawPaymentObjectCount: pledges.filter(isActiveContributionRecord).length,
        eligibleContributionRecordCount: pledges.filter(isEligibleCountedContributionRecord).length,
        warnings: [],
      }
    : await loadMpgfPublicGoodsAllocationContributionRecords({ roundId });
  const sourcePledges = contributionLoad.pledges;
  const sourceAllocation = allocation ?? allocateMpgfAssuranceRound({ pledges: sourcePledges });
  const rows = buildMpgfPublicGoodsAllocationResultRows({
    allocation: sourceAllocation,
    pledges: sourcePledges,
    finalizedAt,
  });

  if (dryRun) {
    return {
      ok: true,
      status: "dry_run",
      allocation: sourceAllocation,
      rows,
      persistedCount: 0,
      contributionSource: contributionLoad.source,
      loadedContributionRecordCount: contributionLoad.rawConditionalPledgeCount,
      eligibleContributionRecordCount: contributionLoad.eligibleContributionRecordCount,
      rawPaymentObjectCount: contributionLoad.rawPaymentObjectCount,
      warnings: contributionLoad.warnings,
    };
  }

  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return {
      ok: false,
      status: "not_configured",
      allocation: sourceAllocation,
      rows,
      persistedCount: 0,
      contributionSource: contributionLoad.source,
      loadedContributionRecordCount: contributionLoad.rawConditionalPledgeCount,
      eligibleContributionRecordCount: contributionLoad.eligibleContributionRecordCount,
      rawPaymentObjectCount: contributionLoad.rawPaymentObjectCount,
      warnings: [
        ...contributionLoad.warnings,
        "Supabase service-role configuration is required to persist MPGF public-goods allocation results.",
      ],
    };
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const result = await supabase
    .from("mpgf_public_goods_allocation_results")
    .upsert(rows, { onConflict: "round_id,campaign_id" })
    .select("campaign_id");

  if (result.error) {
    throw new Error(`Could not persist MPGF public-goods allocation results: ${result.error.message}`);
  }

  return {
    ok: true,
    status: "persisted",
    allocation: sourceAllocation,
    rows,
    persistedCount: (result.data ?? []).length,
    contributionSource: contributionLoad.source,
    loadedContributionRecordCount: contributionLoad.rawConditionalPledgeCount,
    eligibleContributionRecordCount: contributionLoad.eligibleContributionRecordCount,
    rawPaymentObjectCount: contributionLoad.rawPaymentObjectCount,
    warnings: contributionLoad.warnings,
  };
}
