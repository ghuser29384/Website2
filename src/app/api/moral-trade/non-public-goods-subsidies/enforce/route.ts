import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_NON_PUBLIC_GOODS_SUBSIDY_VALIDATOR_VERSION,
  evaluateMoralTradeNonPublicGoodsSubsidy,
  getMoralTradeNonPublicGoodsSubsidyContract,
  validateMoralTradeNonPublicGoodsSubsidyContract,
  type MoralTradeNonPublicGoodsSubsidyConflictState,
  type MoralTradeNonPublicGoodsSubsidyDisclosureLevel,
  type MoralTradeNonPublicGoodsSubsidyEvaluationInput,
  type MoralTradeNonPublicGoodsSubsidyPolicyStatus,
  type MoralTradeNonPublicGoodsSubsidyPoolRecord,
  type MoralTradeNonPublicGoodsSubsidyPoolState,
  type MoralTradeNonPublicGoodsSubsidyRefundPolicy,
  type MoralTradeNonPublicGoodsSubsidyScheduleRecord,
  type MoralTradeNonPublicGoodsSubsidyScheduleState,
  type MoralTradeNonPublicGoodsSubsidySourceReviewState,
  type MoralTradeNonPublicGoodsSubsidyTier,
  type MoralTradeNonPublicGoodsSubsidyTradeType,
  type MoralTradeNonPublicGoodsSubsidyTransition,
  type MoralTradeNonPublicGoodsSubsidyType,
} from "@/lib/moral-trade/non-public-goods-subsidies";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_POOLS = 12;
const MAX_SCHEDULES = 36;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeNonPublicGoodsSubsidyTransition>([
  "subsidy_pool_activation",
  "subsidy_schedule_preview",
  "subsidy_schedule_reservation",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "public_metric_publication",
  "release_gate_promotion",
  "subsidy_refund_or_carry_forward",
]);
const TRADE_TYPES = new Set<MoralTradeNonPublicGoodsSubsidyTradeType>([
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "manual_review",
]);
const TIERS = new Set<MoralTradeNonPublicGoodsSubsidyTier>([
  "tier_1_money_only_donation_offset",
  "tier_2_donation_offset_with_abstention_or_additionality_proof",
  "tier_3_closed_counterparty_pledge_swap",
  "tier_4_open_market_pledge_swap_or_compensated_action",
]);
const SOURCE_REVIEW_STATES =
  new Set<MoralTradeNonPublicGoodsSubsidySourceReviewState>([
    "not_started",
    "under_review",
    "non_blocking",
    "blocked",
    "manual_review",
    "superseded",
  ]);
const CONFLICT_STATES = new Set<MoralTradeNonPublicGoodsSubsidyConflictState>([
  "not_started",
  "under_review",
  "non_blocking",
  "disclosed_nonblocking",
  "blocked",
  "manual_review",
  "superseded",
]);
const DISCLOSURE_LEVELS =
  new Set<MoralTradeNonPublicGoodsSubsidyDisclosureLevel>([
    "aggregate_only",
    "source_bucket",
    "named_sponsor",
    "manual_review",
    "undisclosed",
  ]);
const REFUND_POLICIES = new Set<MoralTradeNonPublicGoodsSubsidyRefundPolicy>([
  "return_to_sponsor",
  "carry_forward",
  "manual_review",
]);
const POOL_STATES = new Set<MoralTradeNonPublicGoodsSubsidyPoolState>([
  "draft",
  "active",
  "paused",
  "exhausted",
  "closed",
  "superseded",
  "blocked",
]);
const SUBSIDY_TYPES = new Set<MoralTradeNonPublicGoodsSubsidyType>([
  "fixed_bonus",
  "ratio_match",
  "fee_offset",
  "verification_cost_coverage",
  "manual_review",
]);
const SCHEDULE_STATES = new Set<MoralTradeNonPublicGoodsSubsidyScheduleState>([
  "previewed",
  "reserved",
  "applied",
  "released",
  "cancelled",
  "refunded",
  "superseded",
  "blocked",
]);
const POLICY_STATUSES = new Set<MoralTradeNonPublicGoodsSubsidyPolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "checkedAt",
  "pools",
  "schedules",
  "subsidyRequired",
  "transition",
]);
const POOL_KEYS = new Set([
  "allowedCauseBucketTaxonomyRefs",
  "allowedRecipientOrDestinationClasses",
  "allocationScheduleHash",
  "appliesToTiers",
  "appliesToTradeType",
  "eligibilityRuleHash",
  "expiresAt",
  "maxSubsidyPerParticipantCents",
  "maxSubsidyPerTradeCents",
  "maxSubsidyRatioBps",
  "policySnapshotRef",
  "policyStatus",
  "poolHash",
  "poolId",
  "poolState",
  "privateSourceDetailsPublic",
  "publicDisclosureLevel",
  "refundOrCarryForwardPolicy",
  "reviewedAt",
  "reviewerDecisionRef",
  "reviewerNotesPublic",
  "settlementCurrency",
  "sourceOfFundsReviewState",
  "sponsorConflictOfInterestState",
  "sponsorIdHash",
  "sponsorIdentityPublic",
  "supersededBy",
  "totalBudgetCents",
]);
const SCHEDULE_KEYS = new Set([
  "capBinding",
  "clearedTradeAgreementRef",
  "counterpartyDistinctnessExclusion",
  "createdAt",
  "directContributionExclusion",
  "eligibilityInputHash",
  "impactClaimExclusion",
  "matchedTradeLockProposalRef",
  "matchingClearingRunRef",
  "participantMoralTradeVolumeExclusion",
  "participantSpecificSubsidyPublic",
  "poolRef",
  "privateSponsorTermsPublic",
  "rawEligibilityInputPublic",
  "reviewerDecisionRef",
  "scheduleHash",
  "scheduleId",
  "subsidyAmountCents",
  "subsidyRatioBps",
  "subsidyState",
  "subsidyType",
  "updatedAt",
]);

type NonPublicGoodsSubsidyEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_non_public_goods_subsidy_enforcement_records"]["Insert"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashJson(value: unknown) {
  return `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string"
    ? value.trim().slice(0, MAX_TEXT_FIELD_LENGTH)
    : fallback;
}

function requiredStringField(
  value: unknown,
  key: string,
  blockers: string[],
  fallback = "",
) {
  const normalized = stringField(value, fallback);

  if (!normalized) {
    blockers.push(`${key}: missing`);
  }

  return normalized;
}

function nullableString(value: unknown) {
  const normalized = stringField(value);

  return normalized || null;
}

function booleanField(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function integerField(
  value: unknown,
  key: string,
  blockers: string[],
  fallback: number,
  minimum = 0,
) {
  if (typeof value === "number" && Number.isInteger(value) && value >= minimum) {
    return value;
  }

  if (value !== undefined) {
    blockers.push(`${key}: integer >= ${minimum} is required`);
  }

  return fallback;
}

function requiredHashField(value: unknown, key: string, blockers: string[]) {
  const normalized = stringField(value);

  if (!HASH_PATTERN.test(normalized)) {
    blockers.push(`${key}: sha256 hash is required`);
  }

  return normalized;
}

function enumField<T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T,
  key: string,
  blockers: string[],
  required = false,
) {
  const normalized = stringField(value);

  if (allowed.has(normalized as T)) {
    return normalized as T;
  }

  if (normalized) {
    blockers.push(`${key}: unsupported value`);
  } else if (required) {
    blockers.push(`${key}: missing`);
  }

  return fallback;
}

function enumArrayField<T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T,
  key: string,
  blockers: string[],
) {
  if (!Array.isArray(value)) {
    blockers.push(`${key}: array is required`);

    return [] as T[];
  }

  return value
    .map((entry, index) =>
      enumField(entry, allowed, fallback, `${key}.${index}`, blockers, true),
    )
    .filter(Boolean);
}

function stringArrayField(value: unknown, key: string, blockers: string[]) {
  if (!Array.isArray(value)) {
    blockers.push(`${key}: array is required`);

    return [];
  }

  return value.map((entry, index) =>
    requiredStringField(entry, `${key}.${index}`, blockers),
  );
}

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map(
      (key) =>
        `${prefix}.${key}: unsupported non-public-goods subsidy enforcement key`,
    );
}

function normalizePool(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeNonPublicGoodsSubsidyPoolRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.pools.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, POOL_KEYS, prefix));
  }

  return {
    allowedCauseBucketTaxonomyRefs: stringArrayField(
      record.allowedCauseBucketTaxonomyRefs,
      `${prefix}.allowedCauseBucketTaxonomyRefs`,
      blockers,
    ),
    allowedRecipientOrDestinationClasses: stringArrayField(
      record.allowedRecipientOrDestinationClasses,
      `${prefix}.allowedRecipientOrDestinationClasses`,
      blockers,
    ),
    allocationScheduleHash: requiredHashField(
      record.allocationScheduleHash,
      `${prefix}.allocationScheduleHash`,
      blockers,
    ),
    appliesToTiers: enumArrayField(
      record.appliesToTiers,
      TIERS,
      "tier_1_money_only_donation_offset",
      `${prefix}.appliesToTiers`,
      blockers,
    ),
    appliesToTradeType: enumField(
      record.appliesToTradeType,
      TRADE_TYPES,
      "manual_review",
      `${prefix}.appliesToTradeType`,
      blockers,
      true,
    ),
    eligibilityRuleHash: requiredHashField(
      record.eligibilityRuleHash,
      `${prefix}.eligibilityRuleHash`,
      blockers,
    ),
    expiresAt: nullableString(record.expiresAt),
    maxSubsidyPerParticipantCents: integerField(
      record.maxSubsidyPerParticipantCents,
      `${prefix}.maxSubsidyPerParticipantCents`,
      blockers,
      0,
    ),
    maxSubsidyPerTradeCents: integerField(
      record.maxSubsidyPerTradeCents,
      `${prefix}.maxSubsidyPerTradeCents`,
      blockers,
      0,
    ),
    maxSubsidyRatioBps: integerField(
      record.maxSubsidyRatioBps,
      `${prefix}.maxSubsidyRatioBps`,
      blockers,
      0,
    ),
    policySnapshotRef: requiredStringField(
      record.policySnapshotRef,
      `${prefix}.policySnapshotRef`,
      blockers,
      `submitted-non-public-goods-subsidy-policy-${index + 1}`,
    ),
    policyStatus: enumField(
      record.policyStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policyStatus`,
      blockers,
      true,
    ),
    poolHash: requiredHashField(record.poolHash, `${prefix}.poolHash`, blockers),
    poolId: requiredStringField(
      record.poolId,
      `${prefix}.poolId`,
      blockers,
      `submitted-non-public-goods-subsidy-pool-${index + 1}`,
    ),
    poolState: enumField(
      record.poolState,
      POOL_STATES,
      "draft",
      `${prefix}.poolState`,
      blockers,
      true,
    ),
    privateSourceDetailsPublic: booleanField(record.privateSourceDetailsPublic),
    publicDisclosureLevel: enumField(
      record.publicDisclosureLevel,
      DISCLOSURE_LEVELS,
      "manual_review",
      `${prefix}.publicDisclosureLevel`,
      blockers,
      true,
    ),
    refundOrCarryForwardPolicy: enumField(
      record.refundOrCarryForwardPolicy,
      REFUND_POLICIES,
      "manual_review",
      `${prefix}.refundOrCarryForwardPolicy`,
      blockers,
      true,
    ),
    reviewedAt: stringField(record.reviewedAt),
    reviewerDecisionRef: nullableString(record.reviewerDecisionRef),
    reviewerNotesPublic: booleanField(record.reviewerNotesPublic),
    settlementCurrency: requiredStringField(
      record.settlementCurrency,
      `${prefix}.settlementCurrency`,
      blockers,
      "USD",
    ),
    sourceOfFundsReviewState: enumField(
      record.sourceOfFundsReviewState,
      SOURCE_REVIEW_STATES,
      "not_started",
      `${prefix}.sourceOfFundsReviewState`,
      blockers,
      true,
    ),
    sponsorConflictOfInterestState: enumField(
      record.sponsorConflictOfInterestState,
      CONFLICT_STATES,
      "not_started",
      `${prefix}.sponsorConflictOfInterestState`,
      blockers,
      true,
    ),
    sponsorIdHash: requiredHashField(
      record.sponsorIdHash,
      `${prefix}.sponsorIdHash`,
      blockers,
    ),
    sponsorIdentityPublic: booleanField(record.sponsorIdentityPublic),
    supersededBy: nullableString(record.supersededBy),
    totalBudgetCents: integerField(
      record.totalBudgetCents,
      `${prefix}.totalBudgetCents`,
      blockers,
      0,
    ),
  };
}

function normalizeSchedule(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeNonPublicGoodsSubsidyScheduleRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.schedules.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, SCHEDULE_KEYS, prefix));
  }

  return {
    capBinding: booleanField(record.capBinding),
    clearedTradeAgreementRef: nullableString(record.clearedTradeAgreementRef),
    counterpartyDistinctnessExclusion: booleanField(
      record.counterpartyDistinctnessExclusion,
      true,
    ),
    createdAt: stringField(record.createdAt),
    directContributionExclusion: booleanField(
      record.directContributionExclusion,
      true,
    ),
    eligibilityInputHash: requiredHashField(
      record.eligibilityInputHash,
      `${prefix}.eligibilityInputHash`,
      blockers,
    ),
    impactClaimExclusion: booleanField(record.impactClaimExclusion, true),
    matchedTradeLockProposalRef: nullableString(
      record.matchedTradeLockProposalRef,
    ),
    matchingClearingRunRef: requiredStringField(
      record.matchingClearingRunRef,
      `${prefix}.matchingClearingRunRef`,
      blockers,
      `submitted-matching-clearing-run-${index + 1}`,
    ),
    participantMoralTradeVolumeExclusion: booleanField(
      record.participantMoralTradeVolumeExclusion,
      true,
    ),
    participantSpecificSubsidyPublic: booleanField(
      record.participantSpecificSubsidyPublic,
    ),
    poolRef: requiredStringField(
      record.poolRef,
      `${prefix}.poolRef`,
      blockers,
      `submitted-non-public-goods-subsidy-pool-${index + 1}`,
    ),
    privateSponsorTermsPublic: booleanField(record.privateSponsorTermsPublic),
    rawEligibilityInputPublic: booleanField(record.rawEligibilityInputPublic),
    reviewerDecisionRef: nullableString(record.reviewerDecisionRef),
    scheduleHash: requiredHashField(
      record.scheduleHash,
      `${prefix}.scheduleHash`,
      blockers,
    ),
    scheduleId: requiredStringField(
      record.scheduleId,
      `${prefix}.scheduleId`,
      blockers,
      `submitted-subsidy-schedule-${index + 1}`,
    ),
    subsidyAmountCents: integerField(
      record.subsidyAmountCents,
      `${prefix}.subsidyAmountCents`,
      blockers,
      0,
    ),
    subsidyRatioBps: integerField(
      record.subsidyRatioBps,
      `${prefix}.subsidyRatioBps`,
      blockers,
      0,
    ),
    subsidyState: enumField(
      record.subsidyState,
      SCHEDULE_STATES,
      "previewed",
      `${prefix}.subsidyState`,
      blockers,
      true,
    ),
    subsidyType: enumField(
      record.subsidyType,
      SUBSIDY_TYPES,
      "manual_review",
      `${prefix}.subsidyType`,
      blockers,
      true,
    ),
    updatedAt: stringField(record.updatedAt),
  };
}

function normalizeEvaluationInput(value: unknown) {
  const blockers: string[] = [];

  if (!isRecord(value)) {
    return {
      input: null,
      blockers: ["evaluationInput: object is required"],
    };
  }

  blockers.push(...unsupportedKeys(value, EVALUATION_INPUT_KEYS, "evaluationInput"));

  const input: MoralTradeNonPublicGoodsSubsidyEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    pools: Array.isArray(value.pools)
      ? value.pools
          .slice(0, MAX_POOLS)
          .map((entry, index) => normalizePool(entry, index, blockers))
      : [],
    schedules: Array.isArray(value.schedules)
      ? value.schedules
          .slice(0, MAX_SCHEDULES)
          .map((entry, index) => normalizeSchedule(entry, index, blockers))
      : [],
    subsidyRequired: booleanField(value.subsidyRequired),
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "subsidy_schedule_preview",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `non-public-goods-subsidy-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    subsidyPoolActivationAllowed: false,
    subsidySchedulePreviewAllowed: false,
    subsidyScheduleReservationAllowed: false,
    matchedTradeLockAllowed: false,
    paymentAuthorizationAllowed: false,
    paymentCaptureAllowed: false,
    publicMetricPublicationAllowed: false,
    releaseGatePromotionAllowed: false,
    subsidyRefundOrCarryForwardAllowed: false,
  };
}

function invalidRequestResponse({
  blockers,
  checkedAt,
  status = 400,
}: {
  blockers: string[];
  checkedAt: string;
  status?: number;
}) {
  const contract = getMoralTradeNonPublicGoodsSubsidyContract();
  const contractValidation =
    validateMoralTradeNonPublicGoodsSubsidyContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      nonPublicGoodsSubsidyGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_non_public_goods_subsidy_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid non-public-goods subsidy enforcement input creates no enforcement record and cannot authorize subsidy activation, schedule preview, schedule reservation, matched-trade lock, payment, public metrics, release promotion, or refund/carry-forward handling.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "non_public_goods_subsidy_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited non-public-goods subsidy enforcement creates no enforcement record and cannot authorize subsidy activation, schedule preview, schedule reservation, matched-trade lock, payment, public metrics, release promotion, or refund/carry-forward handling.",
      "private, no-store",
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalidRequestResponse({
      checkedAt,
      blockers: ["invalid_json_body"],
    });
  }

  if (!isRecord(body)) {
    return invalidRequestResponse({
      checkedAt,
      blockers: ["request_body: object is required"],
    });
  }

  const requestBlockers = unsupportedKeys(body, REQUEST_KEYS, "request");
  const normalized = normalizeEvaluationInput(body.evaluationInput);

  if (!normalized.input || requestBlockers.length || normalized.blockers.length) {
    return invalidRequestResponse({
      checkedAt,
      blockers: [...requestBlockers, ...normalized.blockers],
    });
  }

  const contract = getMoralTradeNonPublicGoodsSubsidyContract();
  const contractValidation =
    validateMoralTradeNonPublicGoodsSubsidyContract(contract);
  const evaluation = evaluateMoralTradeNonPublicGoodsSubsidy(normalized.input);
  const evaluationHash = hashJson({
    contractVersion: contract.version,
    evaluation,
    normalizedInput: normalized.input,
  });
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey, evaluationHash);
  const blockers = [...contractValidation.blockers];
  const basePayload = {
    checkedAt,
    contractVersion: contract.version,
    nonPublicGoodsSubsidyGateStatus:
      evaluation.status === "pass" ? "non_blocking" : "blocked",
    ...authorizationFields(),
    evaluation,
    evaluationHash,
    contractValidation,
    blockers,
  };

  if (!hasSupabaseEnv()) {
    return buildMoralTradeApiJsonResponse(
      {
        ok: false,
        ...basePayload,
        stateMutation: false,
        persistence: {
          requested: true,
          status: "supabase_unconfigured",
          recordId: null,
          table: "moral_trade_non_public_goods_subsidy_enforcement_records",
        },
        fallback:
          "Non-public-goods subsidy enforcement was evaluated but not recorded because Supabase is not configured; no subsidy activation, schedule preview, schedule reservation, matched-trade lock, payment, public metric, release-promotion, or refund/carry-forward state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:non_public_goods_subsidy_enforce",
        ],
      },
      "private_no_store",
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildMoralTradeApiJsonResponse(
      {
        ok: false,
        ...basePayload,
        stateMutation: false,
        persistence: {
          requested: true,
          status: "auth_required",
          recordId: null,
          table: "moral_trade_non_public_goods_subsidy_enforcement_records",
        },
        fallback:
          "Authentication is required before recording non-public-goods subsidy enforcement. No subsidy activation, schedule preview, schedule reservation, matched-trade lock, payment, public metric, release-promotion, or refund/carry-forward state changed.",
        blockers: [
          ...blockers,
          "authentication_required:non_public_goods_subsidy_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_non_public_goods_subsidy_enforcement_records")
    .select("id, evaluation_hash, created_at")
    .eq("owner_profile_id", user.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing.data) {
    return buildMoralTradeApiJsonResponse(
      {
        ok: contractValidation.status === "pass",
        ...basePayload,
        stateMutation: false,
        persistence: {
          requested: true,
          status: "already_recorded",
          recordId: existing.data.id,
          evaluationHash: existing.data.evaluation_hash,
          recordedAt: existing.data.created_at,
          table: "moral_trade_non_public_goods_subsidy_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: NonPublicGoodsSubsidyEnforcementInsert = {
    active_pool_count: evaluation.activePoolCount,
    blocker_codes: evaluation.blockers,
    cap_checked_schedule_count: evaluation.capCheckedScheduleCount,
    contract_version: contract.version,
    eligible_schedule_count: evaluation.eligibleScheduleCount,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    frozen_policy_count: evaluation.frozenPolicyCount,
    idempotency_key: idempotencyKey,
    matched_trade_lock_allowed_bool: false,
    metric_excluded_schedule_count: evaluation.metricExcludedScheduleCount,
    owner_profile_id: user.id,
    payment_authorization_allowed_bool: false,
    payment_capture_allowed_bool: false,
    pool_record_count: normalized.input.pools.length,
    public_metric_publication_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    schedule_record_count: normalized.input.schedules.length,
    subsidy_pool_activation_allowed_bool: false,
    subsidy_refund_or_carry_forward_allowed_bool: false,
    subsidy_required_bool: evaluation.subsidyRequired,
    subsidy_schedule_preview_allowed_bool: false,
    subsidy_schedule_reservation_allowed_bool: false,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_NON_PUBLIC_GOODS_SUBSIDY_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_non_public_goods_subsidy_enforcement_records")
    .insert(insert)
    .select("id, evaluation_hash, created_at")
    .single();

  if (error) {
    return buildMoralTradeApiJsonResponse(
      {
        ok: false,
        ...basePayload,
        stateMutation: false,
        persistence: {
          requested: true,
          status: "insert_failed",
          recordId: null,
          table: "moral_trade_non_public_goods_subsidy_enforcement_records",
        },
        fallback:
          "The non-public-goods subsidy enforcement result could not be recorded. No subsidy activation, schedule preview, schedule reservation, matched-trade lock, payment, public metric, release-promotion, or refund/carry-forward state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:non_public_goods_subsidy_enforce",
        ],
      },
      "private_no_store",
      { status: 500 },
    );
  }

  return buildMoralTradeApiJsonResponse(
    {
      ok: contractValidation.status === "pass",
      ...basePayload,
      stateMutation: true,
      persistence: {
        requested: true,
        status: "recorded",
        recordId: data.id,
        evaluationHash: data.evaluation_hash,
        recordedAt: data.created_at,
        table: "moral_trade_non_public_goods_subsidy_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
