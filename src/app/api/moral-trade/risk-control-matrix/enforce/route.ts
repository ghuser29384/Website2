import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_RISK_CONTROL_MATRIX_VALIDATOR_VERSION,
  evaluateMoralTradeRiskControlMatrix,
  getMoralTradeRiskControlMatrixContract,
  validateMoralTradeRiskControlMatrixContract,
  type MoralTradeControlApplicabilityMatrixRecord,
  type MoralTradeControlRequirementResultRecord,
  type MoralTradeControlRequirementStatus,
  type MoralTradeRiskControlCode,
  type MoralTradeRiskControlEvidenceBurden,
  type MoralTradeRiskControlMatrixEvaluationInput,
  type MoralTradeRiskControlPackRecord,
  type MoralTradeRiskControlReleaseStage,
  type MoralTradeRiskControlSubjectType,
  type MoralTradeRiskControlTier,
  type MoralTradeRiskControlTradeType,
  type MoralTradeRiskControlTransition,
} from "@/lib/moral-trade/risk-control-matrix";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1_200;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_PACKS = 32;
const MAX_MATRICES = 24;
const MAX_RESULTS = 160;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeRiskControlTransition>([
  "draft_preview",
  "match_candidate_preview",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "reliance_bearing_transition",
  "public_metric_publication",
  "release_gate_promotion",
  "dispute_or_appeal_resolution",
]);
const TRADE_TYPES = new Set<MoralTradeRiskControlTradeType>([
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "performance_bond",
  "side_agreement",
  "evidence_claim",
  "payment_event",
  "manual_review",
  "mixed",
]);
const SUBJECT_TYPES = new Set<MoralTradeRiskControlSubjectType>([
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "compensated_action_terms",
  "pledge_performance_bond_record",
  "payment_event",
  "evidence_record",
  "dispute_case",
  "appeal_case",
]);
const RELEASE_STAGES = new Set<MoralTradeRiskControlReleaseStage>([
  "draft_preview",
  "match_candidate_preview",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "reliance_bearing_transition",
  "public_metric_release",
  "manual_review",
  "release_gate_promotion",
]);
const TIERS = new Set<MoralTradeRiskControlTier>([
  "tier_1_money_only_donation_offset",
  "tier_2_donation_offset_with_abstention_or_additionality_proof",
  "tier_3_closed_counterparty_pledge_swap",
  "tier_4_open_market_pledge_swap_or_compensated_action",
  "not_applicable",
]);
const EVIDENCE_BURDENS = new Set<MoralTradeRiskControlEvidenceBurden>([
  "none_required",
  "low",
  "medium",
  "high",
  "confidential_attestation_required",
]);
const CONTROL_CODES = new Set<MoralTradeRiskControlCode>([
  "participant_term_sheet",
  "counterparty_blinding",
  "staged_counterparty_disclosure",
  "recipient_acceptance",
  "ai_preference_elicitation",
  "post_clear_audit",
  "review_capacity",
  "non_public_goods_subsidy",
  "direct_pair_clearing",
  "cause_bucket_taxonomy",
  "resource_compatibility",
  "net_offset_accounting",
  "approved_trade_template",
  "non_public_goods_tier",
  "counterfactual_trust",
  "private_exchange_rate_quote",
  "noncompensable_blocker",
  "offer_validity",
  "batch_clearing_objective",
  "sensitive_evidence_attestation",
  "pilot_evidence",
  "protective_assessment",
  "user_safety_content_moderation",
  "financial_settlement_controls",
  "release_gate_requirement",
  "control_applicability_matrix",
]);
const RESULT_STATUSES = new Set<MoralTradeControlRequirementStatus>([
  "passed",
  "not_required_for_stage",
  "privileged_neutral_review_waiver",
  "missing",
  "unknown",
  "unmapped",
  "duplicated",
  "under_review",
  "failed",
  "stale",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set(["checkedAt", "matrices", "packs", "results", "transition"]);
const PACK_KEYS = new Set([
  "appliesToReleaseStages",
  "appliesToTiers",
  "appliesToTradeType",
  "controlPackHash",
  "createdAt",
  "failClosedUnknownControls",
  "notRequiredControlCodes",
  "optionalControlCodes",
  "packId",
  "packName",
  "policyVersion",
  "requiredControlCodes",
  "reviewerDecisionRef",
  "supersededBy",
  "updatedAt",
]);
const MATRIX_KEYS = new Set([
  "aiPreferenceElicitationUsed",
  "applicableControlCodes",
  "applicableRiskControlPackRefs",
  "batchClearingRequired",
  "causeBucketTaxonomyRef",
  "compensation",
  "confidentialVerificationRequired",
  "counterpartyBlindingRequired",
  "createdAt",
  "directPairClearing",
  "evidenceBurdenLevel",
  "highStakesOrIrreversible",
  "jurisdictionBucket",
  "matrixHash",
  "matrixId",
  "moneyMovement",
  "negativeCommitment",
  "netOffsetAccountingRequired",
  "nonPublicGoodsMarketTier",
  "noncompensableBlockerPresent",
  "openMarketMatching",
  "participantTermSheetRequired",
  "postClearAuditRequired",
  "recipientAcceptanceRequired",
  "releaseStage",
  "resourceCompatibilityRequired",
  "reviewerDecisionRef",
  "staleOffer",
  "subjectId",
  "subjectType",
  "supersededBy",
  "tradeType",
  "updatedAt",
]);
const RESULT_KEYS = new Set([
  "checkedAt",
  "controlCode",
  "evidenceRef",
  "expiresAt",
  "matrixRef",
  "neutralReviewRef",
  "policySnapshotRef",
  "privilegedActionRef",
  "resultHash",
  "resultId",
  "resultStatus",
  "reviewerDecisionRef",
  "riskControlPackRef",
  "subjectId",
  "subjectType",
  "supersededBy",
]);

type RiskControlMatrixEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_risk_control_matrix_enforcement_records"]["Insert"];

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

function requiredStringField(value: unknown, key: string, blockers: string[], fallback = "") {
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

function stringArrayField(value: unknown, key: string, blockers: string[]) {
  if (!Array.isArray(value)) {
    blockers.push(`${key}: array is required`);

    return [];
  }

  return value.map((entry, index) => {
    const normalized = stringField(entry);

    if (!normalized) {
      blockers.push(`${key}.${index}: string is required`);
    }

    return normalized;
  }).filter(Boolean);
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

function unsupportedKeys(value: Record<string, unknown>, allowed: Set<string>, prefix: string) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported risk-control matrix enforcement key`);
}

function normalizePack(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeRiskControlPackRecord {
  const pack = isRecord(value) ? value : {};
  const prefix = `evaluationInput.packs.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(pack, PACK_KEYS, prefix));
  }

  return {
    appliesToReleaseStages: enumArrayField<MoralTradeRiskControlReleaseStage>(
      pack.appliesToReleaseStages,
      RELEASE_STAGES,
      `${prefix}.appliesToReleaseStages`,
      blockers,
    ),
    appliesToTiers: enumArrayField<MoralTradeRiskControlTier>(
      pack.appliesToTiers,
      TIERS,
      `${prefix}.appliesToTiers`,
      blockers,
    ),
    appliesToTradeType: enumField<MoralTradeRiskControlTradeType>(
      pack.appliesToTradeType,
      TRADE_TYPES,
      "manual_review",
      `${prefix}.appliesToTradeType`,
      blockers,
      true,
    ),
    controlPackHash: requiredHashField(pack.controlPackHash, `${prefix}.controlPackHash`, blockers),
    createdAt: requiredStringField(pack.createdAt, `${prefix}.createdAt`, blockers),
    failClosedUnknownControls: booleanField(
      pack.failClosedUnknownControls,
      `${prefix}.failClosedUnknownControls`,
      blockers,
    ),
    notRequiredControlCodes: enumArrayField<MoralTradeRiskControlCode>(
      pack.notRequiredControlCodes,
      CONTROL_CODES,
      `${prefix}.notRequiredControlCodes`,
      blockers,
    ),
    optionalControlCodes: enumArrayField<MoralTradeRiskControlCode>(
      pack.optionalControlCodes,
      CONTROL_CODES,
      `${prefix}.optionalControlCodes`,
      blockers,
    ),
    packId: requiredStringField(pack.packId, `${prefix}.packId`, blockers, `submitted-pack-${index + 1}`),
    packName: requiredStringField(pack.packName, `${prefix}.packName`, blockers),
    policyVersion: requiredStringField(pack.policyVersion, `${prefix}.policyVersion`, blockers),
    requiredControlCodes: enumArrayField<MoralTradeRiskControlCode>(
      pack.requiredControlCodes,
      CONTROL_CODES,
      `${prefix}.requiredControlCodes`,
      blockers,
    ),
    reviewerDecisionRef: nullableString(pack.reviewerDecisionRef),
    supersededBy: nullableString(pack.supersededBy),
    updatedAt: requiredStringField(pack.updatedAt, `${prefix}.updatedAt`, blockers),
  };
}

function normalizeMatrix(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeControlApplicabilityMatrixRecord {
  const matrix = isRecord(value) ? value : {};
  const prefix = `evaluationInput.matrices.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(matrix, MATRIX_KEYS, prefix));
  }

  return {
    aiPreferenceElicitationUsed: booleanField(matrix.aiPreferenceElicitationUsed, `${prefix}.aiPreferenceElicitationUsed`, blockers),
    applicableControlCodes: enumArrayField<MoralTradeRiskControlCode>(
      matrix.applicableControlCodes,
      CONTROL_CODES,
      `${prefix}.applicableControlCodes`,
      blockers,
    ),
    applicableRiskControlPackRefs: stringArrayField(matrix.applicableRiskControlPackRefs, `${prefix}.applicableRiskControlPackRefs`, blockers),
    batchClearingRequired: booleanField(matrix.batchClearingRequired, `${prefix}.batchClearingRequired`, blockers),
    causeBucketTaxonomyRef: nullableString(matrix.causeBucketTaxonomyRef),
    compensation: booleanField(matrix.compensation, `${prefix}.compensation`, blockers),
    confidentialVerificationRequired: booleanField(matrix.confidentialVerificationRequired, `${prefix}.confidentialVerificationRequired`, blockers),
    counterpartyBlindingRequired: booleanField(matrix.counterpartyBlindingRequired, `${prefix}.counterpartyBlindingRequired`, blockers),
    createdAt: requiredStringField(matrix.createdAt, `${prefix}.createdAt`, blockers),
    directPairClearing: booleanField(matrix.directPairClearing, `${prefix}.directPairClearing`, blockers),
    evidenceBurdenLevel: enumField<MoralTradeRiskControlEvidenceBurden>(
      matrix.evidenceBurdenLevel,
      EVIDENCE_BURDENS,
      "medium",
      `${prefix}.evidenceBurdenLevel`,
      blockers,
      true,
    ),
    highStakesOrIrreversible: booleanField(matrix.highStakesOrIrreversible, `${prefix}.highStakesOrIrreversible`, blockers),
    jurisdictionBucket: requiredStringField(matrix.jurisdictionBucket, `${prefix}.jurisdictionBucket`, blockers),
    matrixHash: requiredHashField(matrix.matrixHash, `${prefix}.matrixHash`, blockers),
    matrixId: requiredStringField(matrix.matrixId, `${prefix}.matrixId`, blockers, `submitted-matrix-${index + 1}`),
    moneyMovement: booleanField(matrix.moneyMovement, `${prefix}.moneyMovement`, blockers),
    negativeCommitment: booleanField(matrix.negativeCommitment, `${prefix}.negativeCommitment`, blockers),
    netOffsetAccountingRequired: booleanField(matrix.netOffsetAccountingRequired, `${prefix}.netOffsetAccountingRequired`, blockers),
    nonPublicGoodsMarketTier: enumField<MoralTradeRiskControlTier>(
      matrix.nonPublicGoodsMarketTier,
      TIERS,
      "not_applicable",
      `${prefix}.nonPublicGoodsMarketTier`,
      blockers,
      true,
    ),
    noncompensableBlockerPresent: booleanField(matrix.noncompensableBlockerPresent, `${prefix}.noncompensableBlockerPresent`, blockers),
    openMarketMatching: booleanField(matrix.openMarketMatching, `${prefix}.openMarketMatching`, blockers),
    participantTermSheetRequired: booleanField(matrix.participantTermSheetRequired, `${prefix}.participantTermSheetRequired`, blockers),
    postClearAuditRequired: booleanField(matrix.postClearAuditRequired, `${prefix}.postClearAuditRequired`, blockers),
    recipientAcceptanceRequired: booleanField(matrix.recipientAcceptanceRequired, `${prefix}.recipientAcceptanceRequired`, blockers),
    releaseStage: enumField<MoralTradeRiskControlReleaseStage>(
      matrix.releaseStage,
      RELEASE_STAGES,
      "manual_review",
      `${prefix}.releaseStage`,
      blockers,
      true,
    ),
    resourceCompatibilityRequired: booleanField(matrix.resourceCompatibilityRequired, `${prefix}.resourceCompatibilityRequired`, blockers),
    reviewerDecisionRef: nullableString(matrix.reviewerDecisionRef),
    staleOffer: booleanField(matrix.staleOffer, `${prefix}.staleOffer`, blockers),
    subjectId: requiredStringField(matrix.subjectId, `${prefix}.subjectId`, blockers),
    subjectType: enumField<MoralTradeRiskControlSubjectType>(
      matrix.subjectType,
      SUBJECT_TYPES,
      "matched_trade_lock_proposal",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    supersededBy: nullableString(matrix.supersededBy),
    tradeType: enumField<MoralTradeRiskControlTradeType>(
      matrix.tradeType,
      TRADE_TYPES,
      "manual_review",
      `${prefix}.tradeType`,
      blockers,
      true,
    ),
    updatedAt: requiredStringField(matrix.updatedAt, `${prefix}.updatedAt`, blockers),
  };
}

function normalizeResult(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeControlRequirementResultRecord {
  const result = isRecord(value) ? value : {};
  const prefix = `evaluationInput.results.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(result, RESULT_KEYS, prefix));
  }

  return {
    checkedAt: requiredStringField(result.checkedAt, `${prefix}.checkedAt`, blockers),
    controlCode: enumField<MoralTradeRiskControlCode>(
      result.controlCode,
      CONTROL_CODES,
      "control_applicability_matrix",
      `${prefix}.controlCode`,
      blockers,
      true,
    ),
    evidenceRef: nullableString(result.evidenceRef),
    expiresAt: nullableString(result.expiresAt),
    matrixRef: requiredStringField(result.matrixRef, `${prefix}.matrixRef`, blockers),
    neutralReviewRef: nullableString(result.neutralReviewRef),
    policySnapshotRef: nullableString(result.policySnapshotRef),
    privilegedActionRef: nullableString(result.privilegedActionRef),
    resultHash: requiredHashField(result.resultHash, `${prefix}.resultHash`, blockers),
    resultId: requiredStringField(result.resultId, `${prefix}.resultId`, blockers, `submitted-control-result-${index + 1}`),
    resultStatus: enumField<MoralTradeControlRequirementStatus>(
      result.resultStatus,
      RESULT_STATUSES,
      "missing",
      `${prefix}.resultStatus`,
      blockers,
      true,
    ),
    reviewerDecisionRef: nullableString(result.reviewerDecisionRef),
    riskControlPackRef: requiredStringField(result.riskControlPackRef, `${prefix}.riskControlPackRef`, blockers),
    subjectId: requiredStringField(result.subjectId, `${prefix}.subjectId`, blockers),
    subjectType: enumField<MoralTradeRiskControlSubjectType>(
      result.subjectType,
      SUBJECT_TYPES,
      "matched_trade_lock_proposal",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    supersededBy: nullableString(result.supersededBy),
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

  if (Array.isArray(value.packs) && value.packs.length > MAX_PACKS) {
    blockers.push(`evaluationInput.packs: at most ${MAX_PACKS} packs are supported`);
  }

  if (Array.isArray(value.matrices) && value.matrices.length > MAX_MATRICES) {
    blockers.push(`evaluationInput.matrices: at most ${MAX_MATRICES} matrices are supported`);
  }

  if (Array.isArray(value.results) && value.results.length > MAX_RESULTS) {
    blockers.push(`evaluationInput.results: at most ${MAX_RESULTS} results are supported`);
  }

  const input: MoralTradeRiskControlMatrixEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    matrices: Array.isArray(value.matrices)
      ? value.matrices
          .slice(0, MAX_MATRICES)
          .map((entry, index) => normalizeMatrix(entry, index, blockers))
      : [],
    packs: Array.isArray(value.packs)
      ? value.packs
          .slice(0, MAX_PACKS)
          .map((entry, index) => normalizePack(entry, index, blockers))
      : [],
    results: Array.isArray(value.results)
      ? value.results
          .slice(0, MAX_RESULTS)
          .map((entry, index) => normalizeResult(entry, index, blockers))
      : [],
    transition: enumField<MoralTradeRiskControlTransition>(
      value.transition,
      TRANSITIONS,
      "draft_preview",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  if (!Array.isArray(value.matrices)) {
    blockers.push("evaluationInput.matrices: array is required");
  }

  if (!Array.isArray(value.packs)) {
    blockers.push("evaluationInput.packs: array is required");
  }

  if (!Array.isArray(value.results)) {
    blockers.push("evaluationInput.results: array is required");
  }

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value).slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `risk-control-matrix-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    runtimeTransitionAllowed: false,
    matchedTradeLockAllowed: false,
    paymentAuthorizationAllowed: false,
    paymentCaptureAllowed: false,
    publicMetricPublicationAllowed: false,
    releaseGatePromotionAllowed: false,
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
  const contract = getMoralTradeRiskControlMatrixContract();
  const contractValidation = validateMoralTradeRiskControlMatrixContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      riskControlMatrixGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_risk_control_matrix_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid risk-control matrix enforcement input creates no enforcement record and cannot authorize transition, lock, payment, public metric publication, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "risk_control_matrix_enforce");
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited risk-control matrix enforcement creates no enforcement record and cannot authorize transition, lock, payment, public metric publication, or release promotion.",
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

  const contract = getMoralTradeRiskControlMatrixContract();
  const contractValidation = validateMoralTradeRiskControlMatrixContract(contract);
  const evaluation = evaluateMoralTradeRiskControlMatrix(normalized.input);
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
    riskControlMatrixGateStatus: evaluation.status === "pass" ? "non_blocking" : "blocked",
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
          table: "moral_trade_risk_control_matrix_enforcement_records",
        },
        fallback:
          "Risk-control matrix enforcement was evaluated but not recorded because Supabase is not configured; no transition, lock, payment, public metric, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:risk_control_matrix_enforce"],
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
          table: "moral_trade_risk_control_matrix_enforcement_records",
        },
        fallback:
          "Authentication is required before recording risk-control matrix enforcement. No transition, lock, payment, public metric, or release-promotion state changed.",
        blockers: [...blockers, "authentication_required:risk_control_matrix_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_risk_control_matrix_enforcement_records")
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
          table: "moral_trade_risk_control_matrix_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: RiskControlMatrixEnforcementInsert = {
    blocker_codes: blockers,
    blocker_count: blockers.length,
    contract_version: contract.version,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    matched_trade_lock_allowed_bool: false,
    matrix_count: evaluation.matrixCount,
    non_blocking_control_count: evaluation.nonBlockingControlCount,
    owner_profile_id: user.id,
    pack_count: evaluation.packCount,
    payment_authorization_allowed_bool: false,
    payment_capture_allowed_bool: false,
    privileged_waiver_count: evaluation.privilegedWaiverCount,
    public_metric_publication_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    required_control_count: evaluation.requiredControlCount,
    result_count: evaluation.resultCount,
    runtime_transition_allowed_bool: false,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_RISK_CONTROL_MATRIX_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_risk_control_matrix_enforcement_records")
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
          table: "moral_trade_risk_control_matrix_enforcement_records",
        },
        fallback:
          "The risk-control matrix enforcement result could not be recorded. No transition, lock, payment, public metric, or release-promotion state changed.",
        blockers: [...blockers, "database_insert_failed:risk_control_matrix_enforce"],
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
        table: "moral_trade_risk_control_matrix_enforcement_records",
      },
    },
    "private_no_store",
  );
}
