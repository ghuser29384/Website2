import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_NON_PUBLIC_GOODS_TIER_VALIDATOR_VERSION,
  evaluateMoralTradeNonPublicGoodsTier,
  getMoralTradeNonPublicGoodsTierContract,
  validateMoralTradeNonPublicGoodsTierContract,
  type MoralTradeCounterfactualTrustAssessmentRecord,
  type MoralTradeCounterfactualTrustClass,
  type MoralTradeCounterpartyMode,
  type MoralTradeEvidenceBurdenStatus,
  type MoralTradeNonPublicGoodsPolicySnapshotStatus,
  type MoralTradeNonPublicGoodsPolicyStatus,
  type MoralTradeNonPublicGoodsSubjectType,
  type MoralTradeNonPublicGoodsTier,
  type MoralTradeNonPublicGoodsTierEvaluationInput,
  type MoralTradeNonPublicGoodsTierPolicyRecord,
  type MoralTradeNonPublicGoodsTransition,
} from "@/lib/moral-trade/non-public-goods-tier";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1_200;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_POLICIES = 24;
const MAX_ASSESSMENTS = 64;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeNonPublicGoodsTransition>([
  "draft_preview",
  "match_candidate_preview",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "reliance_bearing_transition",
  "public_metric_publication",
  "release_gate_promotion",
]);
const TIERS = new Set<MoralTradeNonPublicGoodsTier>([
  "tier_1_money_only_donation_offset",
  "tier_2_donation_offset_with_abstention_or_additionality_proof",
  "tier_3_closed_counterparty_pledge_swap",
  "tier_4_open_market_pledge_swap_or_compensated_action",
]);
const SUBJECT_TYPES = new Set<MoralTradeNonPublicGoodsSubjectType>([
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "matched_trade_lock_proposal",
  "template_instance_record",
  "worked_example",
]);
const POLICY_STATUSES = new Set<MoralTradeNonPublicGoodsPolicyStatus>([
  "passed",
  "not_required_for_stage",
  "missing",
  "under_review",
  "failed",
  "stale",
  "superseded",
]);
const POLICY_SNAPSHOT_STATUSES = new Set<MoralTradeNonPublicGoodsPolicySnapshotStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const COUNTERFACTUAL_TRUST_CLASSES = new Set<MoralTradeCounterfactualTrustClass>([
  "money_only_verified_destination",
  "abstention_or_additionality_claim",
  "closed_counterparty_known_baseline",
  "open_market_behavior_change",
  "compensated_personal_action",
  "self_offset_or_personal_bookkeeping",
]);
const COUNTERPARTY_MODES = new Set<MoralTradeCounterpartyMode>([
  "none_required",
  "closed_counterparty",
  "invite_only",
  "user_supplied",
  "open_market",
  "autonomous_outreach",
]);
const EVIDENCE_BURDEN_STATUSES = new Set<MoralTradeEvidenceBurdenStatus>([
  "least_intrusive_sufficient",
  "not_required_for_stage",
  "missing",
  "too_intrusive",
  "under_review",
  "failed",
  "stale",
]);
const BASELINE_CONFIDENCE_LEVELS = new Set<"low" | "medium" | "high" | "not_required_for_stage">([
  "low",
  "medium",
  "high",
  "not_required_for_stage",
]);
const RELEASE_STAGES = new Set<MoralTradeNonPublicGoodsTierPolicyRecord["releaseStage"]>([
  "donation_offset_pilot",
  "pledge_swap_preview_only",
  "pledge_swap_manual_pilot",
  "sandbox_calculation",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set(["assessments", "checkedAt", "policies", "transition"]);
const POLICY_KEYS = new Set([
  "allowedCounterpartyModes",
  "approvedTransition",
  "expiresAt",
  "openMarketMatchingAllowed",
  "payableAllowed",
  "policyHash",
  "policyId",
  "policySnapshotStatus",
  "policyVersion",
  "publicMetricAllowed",
  "releaseStage",
  "relianceBearingAllowed",
  "requiresCounterfactualTrustAssessment",
  "reviewedAt",
  "status",
  "supersededBy",
  "tier",
]);
const ASSESSMENT_KEYS = new Set([
  "assessmentHash",
  "assessmentId",
  "assessmentStatus",
  "baselineConfidenceLevel",
  "baselineIntegrityStatus",
  "counterfactualTrustClass",
  "counterpartyMode",
  "evidenceBurdenStatus",
  "expiresAt",
  "participantConfirmationRef",
  "participantUncertaintyDisclosed",
  "reviewedAt",
  "reviewerDecisionRef",
  "subjectRef",
  "subjectType",
  "supersededBy",
  "tier",
]);

type NonPublicGoodsTierEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_non_public_goods_tier_enforcement_records"]["Insert"];

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

function booleanField(value: unknown, key: string, blockers: string[]) {
  if (typeof value === "boolean") {
    return value;
  }

  blockers.push(`${key}: boolean is required`);

  return false;
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
  allowed: Iterable<T>,
  fallback: T,
  key: string,
  blockers: string[],
  required = false,
) {
  const normalized = stringField(value);
  const allowedSet = allowed instanceof Set ? allowed : new Set(allowed);

  if (allowedSet.has(normalized as T)) {
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
  allowed: Iterable<T>,
  key: string,
  blockers: string[],
) {
  const allowedSet = allowed instanceof Set ? allowed : new Set(allowed);

  if (!Array.isArray(value)) {
    blockers.push(`${key}: array is required`);

    return [];
  }

  return value.map((entry, index) => {
    const normalized = stringField(entry);

    if (!allowedSet.has(normalized as T)) {
      blockers.push(`${key}.${index}: unsupported value`);

      return null;
    }

    return normalized as T;
  }).filter((entry): entry is T => Boolean(entry));
}

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported non-public-goods tier enforcement key`);
}

function normalizePolicy(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeNonPublicGoodsTierPolicyRecord {
  const policy = isRecord(value) ? value : {};
  const prefix = `evaluationInput.policies.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(policy, POLICY_KEYS, prefix));
  }

  return {
    allowedCounterpartyModes: enumArrayField<MoralTradeCounterpartyMode>(
      policy.allowedCounterpartyModes,
      COUNTERPARTY_MODES,
      `${prefix}.allowedCounterpartyModes`,
      blockers,
    ),
    approvedTransition: enumField<MoralTradeNonPublicGoodsTransition>(
      policy.approvedTransition,
      TRANSITIONS,
      "draft_preview",
      `${prefix}.approvedTransition`,
      blockers,
      true,
    ),
    expiresAt: nullableString(policy.expiresAt),
    openMarketMatchingAllowed: booleanField(
      policy.openMarketMatchingAllowed,
      `${prefix}.openMarketMatchingAllowed`,
      blockers,
    ),
    payableAllowed: booleanField(policy.payableAllowed, `${prefix}.payableAllowed`, blockers),
    policyHash: requiredHashField(policy.policyHash, `${prefix}.policyHash`, blockers),
    policyId: requiredStringField(
      policy.policyId,
      `${prefix}.policyId`,
      blockers,
      `submitted-non-public-tier-policy-${index + 1}`,
    ),
    policySnapshotStatus: enumField<MoralTradeNonPublicGoodsPolicySnapshotStatus>(
      policy.policySnapshotStatus,
      POLICY_SNAPSHOT_STATUSES,
      "missing",
      `${prefix}.policySnapshotStatus`,
      blockers,
      true,
    ),
    policyVersion: requiredStringField(
      policy.policyVersion,
      `${prefix}.policyVersion`,
      blockers,
    ),
    publicMetricAllowed: booleanField(
      policy.publicMetricAllowed,
      `${prefix}.publicMetricAllowed`,
      blockers,
    ),
    releaseStage: enumField<MoralTradeNonPublicGoodsTierPolicyRecord["releaseStage"]>(
      policy.releaseStage,
      RELEASE_STAGES,
      "sandbox_calculation",
      `${prefix}.releaseStage`,
      blockers,
      true,
    ),
    relianceBearingAllowed: booleanField(
      policy.relianceBearingAllowed,
      `${prefix}.relianceBearingAllowed`,
      blockers,
    ),
    requiresCounterfactualTrustAssessment: booleanField(
      policy.requiresCounterfactualTrustAssessment,
      `${prefix}.requiresCounterfactualTrustAssessment`,
      blockers,
    ),
    reviewedAt: requiredStringField(policy.reviewedAt, `${prefix}.reviewedAt`, blockers),
    status: enumField<MoralTradeNonPublicGoodsPolicyStatus>(
      policy.status,
      POLICY_STATUSES,
      "missing",
      `${prefix}.status`,
      blockers,
      true,
    ),
    supersededBy: nullableString(policy.supersededBy),
    tier: enumField<MoralTradeNonPublicGoodsTier>(
      policy.tier,
      TIERS,
      "tier_1_money_only_donation_offset",
      `${prefix}.tier`,
      blockers,
      true,
    ),
  };
}

function normalizeAssessment(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeCounterfactualTrustAssessmentRecord {
  const assessment = isRecord(value) ? value : {};
  const prefix = `evaluationInput.assessments.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(assessment, ASSESSMENT_KEYS, prefix));
  }

  return {
    assessmentHash: requiredHashField(
      assessment.assessmentHash,
      `${prefix}.assessmentHash`,
      blockers,
    ),
    assessmentId: requiredStringField(
      assessment.assessmentId,
      `${prefix}.assessmentId`,
      blockers,
      `submitted-counterfactual-trust-assessment-${index + 1}`,
    ),
    assessmentStatus: enumField<MoralTradeNonPublicGoodsPolicyStatus>(
      assessment.assessmentStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.assessmentStatus`,
      blockers,
      true,
    ),
    baselineConfidenceLevel: enumField<
      "low" | "medium" | "high" | "not_required_for_stage"
    >(
      assessment.baselineConfidenceLevel,
      BASELINE_CONFIDENCE_LEVELS,
      "low",
      `${prefix}.baselineConfidenceLevel`,
      blockers,
      true,
    ),
    baselineIntegrityStatus: enumField<MoralTradeNonPublicGoodsPolicyStatus>(
      assessment.baselineIntegrityStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.baselineIntegrityStatus`,
      blockers,
      true,
    ),
    counterfactualTrustClass: enumField<MoralTradeCounterfactualTrustClass>(
      assessment.counterfactualTrustClass,
      COUNTERFACTUAL_TRUST_CLASSES,
      "money_only_verified_destination",
      `${prefix}.counterfactualTrustClass`,
      blockers,
      true,
    ),
    counterpartyMode: enumField<MoralTradeCounterpartyMode>(
      assessment.counterpartyMode,
      COUNTERPARTY_MODES,
      "none_required",
      `${prefix}.counterpartyMode`,
      blockers,
      true,
    ),
    evidenceBurdenStatus: enumField<MoralTradeEvidenceBurdenStatus>(
      assessment.evidenceBurdenStatus,
      EVIDENCE_BURDEN_STATUSES,
      "missing",
      `${prefix}.evidenceBurdenStatus`,
      blockers,
      true,
    ),
    expiresAt: nullableString(assessment.expiresAt),
    participantConfirmationRef: nullableString(assessment.participantConfirmationRef),
    participantUncertaintyDisclosed: booleanField(
      assessment.participantUncertaintyDisclosed,
      `${prefix}.participantUncertaintyDisclosed`,
      blockers,
    ),
    reviewedAt: requiredStringField(
      assessment.reviewedAt,
      `${prefix}.reviewedAt`,
      blockers,
    ),
    reviewerDecisionRef: nullableString(assessment.reviewerDecisionRef),
    subjectRef: requiredStringField(assessment.subjectRef, `${prefix}.subjectRef`, blockers),
    subjectType: enumField<MoralTradeNonPublicGoodsSubjectType>(
      assessment.subjectType,
      SUBJECT_TYPES,
      "donation_offset",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    supersededBy: nullableString(assessment.supersededBy),
    tier: enumField<MoralTradeNonPublicGoodsTier>(
      assessment.tier,
      TIERS,
      "tier_1_money_only_donation_offset",
      `${prefix}.tier`,
      blockers,
      true,
    ),
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

  if (Array.isArray(value.policies) && value.policies.length > MAX_POLICIES) {
    blockers.push(`evaluationInput.policies: at most ${MAX_POLICIES} policies are supported`);
  }

  if (Array.isArray(value.assessments) && value.assessments.length > MAX_ASSESSMENTS) {
    blockers.push(`evaluationInput.assessments: at most ${MAX_ASSESSMENTS} assessments are supported`);
  }

  const input: MoralTradeNonPublicGoodsTierEvaluationInput = {
    assessments: Array.isArray(value.assessments)
      ? value.assessments
          .slice(0, MAX_ASSESSMENTS)
          .map((entry, index) => normalizeAssessment(entry, index, blockers))
      : [],
    checkedAt: stringField(value.checkedAt) || undefined,
    policies: Array.isArray(value.policies)
      ? value.policies
          .slice(0, MAX_POLICIES)
          .map((entry, index) => normalizePolicy(entry, index, blockers))
      : [],
    transition: enumField<MoralTradeNonPublicGoodsTransition>(
      value.transition,
      TRANSITIONS,
      "draft_preview",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  if (!Array.isArray(value.policies)) {
    blockers.push("evaluationInput.policies: array is required");
  }

  if (!Array.isArray(value.assessments)) {
    blockers.push("evaluationInput.assessments: array is required");
  }

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value).slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `non-public-goods-tier-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    draftPreviewAllowed: false,
    matchCandidatePreviewAllowed: false,
    matchedTradeLockAllowed: false,
    paymentAuthorizationAllowed: false,
    paymentCaptureAllowed: false,
    publicMetricPublicationAllowed: false,
    releaseGatePromotionAllowed: false,
    relianceBearingTransitionAllowed: false,
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
  const contract = getMoralTradeNonPublicGoodsTierContract();
  const contractValidation = validateMoralTradeNonPublicGoodsTierContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      nonPublicGoodsTierGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_non_public_goods_tier_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid non-public-goods tier enforcement input creates no enforcement record and cannot authorize preview, lock, payment, reliance, public metric publication, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "non_public_goods_tier_enforce");
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited non-public-goods tier enforcement creates no enforcement record and cannot authorize preview, lock, payment, reliance, public metric publication, or release promotion.",
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

  const contract = getMoralTradeNonPublicGoodsTierContract();
  const contractValidation = validateMoralTradeNonPublicGoodsTierContract(contract);
  const evaluation = evaluateMoralTradeNonPublicGoodsTier(normalized.input);
  const evaluationHash = hashJson({
    contractVersion: contract.version,
    evaluation,
    normalizedInput: normalized.input,
  });
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey, evaluationHash);
  const blockers = [...contractValidation.blockers, ...evaluation.blockers];
  const basePayload = {
    checkedAt,
    contractVersion: contract.version,
    nonPublicGoodsTierGateStatus: evaluation.status === "pass" ? "non_blocking" : "blocked",
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
          table: "moral_trade_non_public_goods_tier_enforcement_records",
        },
        fallback:
          "Non-public-goods tier enforcement was evaluated but not recorded because Supabase is not configured; no preview, lock, payment, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:non_public_goods_tier_enforce"],
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
          table: "moral_trade_non_public_goods_tier_enforcement_records",
        },
        fallback:
          "Authentication is required before recording non-public-goods tier enforcement. No preview, lock, payment, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "authentication_required:non_public_goods_tier_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_non_public_goods_tier_enforcement_records")
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
          table: "moral_trade_non_public_goods_tier_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: NonPublicGoodsTierEnforcementInsert = {
    assessment_count: normalized.input.assessments.length,
    blocker_codes: blockers,
    blocker_count: blockers.length,
    contract_version: contract.version,
    draft_preview_allowed_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    match_candidate_preview_allowed_bool: false,
    matched_trade_lock_allowed_bool: false,
    owner_profile_id: user.id,
    passing_assessment_count: evaluation.passingAssessmentCount,
    passing_policy_count: evaluation.passingPolicyCount,
    payment_authorization_allowed_bool: false,
    payment_capture_allowed_bool: false,
    policy_count: normalized.input.policies.length,
    public_metric_publication_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    reliance_bearing_transition_allowed_bool: false,
    required_assessment_count: evaluation.requiredAssessmentCount,
    required_policy_count: evaluation.requiredPolicyCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_NON_PUBLIC_GOODS_TIER_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_non_public_goods_tier_enforcement_records")
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
          table: "moral_trade_non_public_goods_tier_enforcement_records",
        },
        fallback:
          "The non-public-goods tier enforcement result could not be recorded. No preview, lock, payment, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "database_insert_failed:non_public_goods_tier_enforce"],
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
        table: "moral_trade_non_public_goods_tier_enforcement_records",
      },
    },
    "private_no_store",
  );
}
