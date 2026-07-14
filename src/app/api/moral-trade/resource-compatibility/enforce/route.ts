import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_RESOURCE_COMPATIBILITY_VALIDATOR_VERSION,
  evaluateMoralTradeResourceCompatibility,
  getMoralTradeResourceCompatibilityContract,
  validateMoralTradeResourceCompatibilityContract,
  type MoralTradeHybridOrCompromiseGoodState,
  type MoralTradeJointFeasibilityState,
  type MoralTradeResourceCompatibilityAssessmentRecord,
  type MoralTradeResourceCompatibilityEvaluationInput,
  type MoralTradeResourceCompatibilityPolicyStatus,
  type MoralTradeResourceCompatibilityReviewState,
  type MoralTradeResourceCompatibilitySubjectType,
  type MoralTradeResourceCompatibilityTransition,
  type MoralTradeResourceConflictType,
} from "@/lib/moral-trade/resource-compatibility";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_ASSESSMENTS = 48;
const MAX_ARRAY_ITEMS = 48;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeResourceCompatibilityTransition>([
  "draft_preview",
  "match_candidate_generation",
  "matched_trade_lock",
  "clearing_run",
  "payment_capture",
  "public_metric_publication",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradeResourceCompatibilitySubjectType>([
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "compensated_action_terms",
  "negative_commitment_scope",
  "side_agreement_disclosure",
]);
const CONFLICT_TYPES = new Set<MoralTradeResourceConflictType>([
  "none_disclosed",
  "mutually_exclusive_resource",
  "mutually_exclusive_action",
  "incompatible_destination",
  "incompatible_timing",
  "zero_sum_control_claim",
  "third_party_control_conflict",
  "manual_review",
  "unknown",
]);
const JOINT_FEASIBILITY_STATES = new Set<MoralTradeJointFeasibilityState>([
  "feasible",
  "feasible_with_conditions",
  "under_review",
  "infeasible_blocking",
  "disputed",
  "manual_review",
  "superseded",
]);
const HYBRID_OR_COMPROMISE_GOOD_STATES =
  new Set<MoralTradeHybridOrCompromiseGoodState>([
    "not_applicable",
    "identified",
    "unclear",
    "blocked",
    "manual_review",
  ]);
const REVIEW_STATES = new Set<MoralTradeResourceCompatibilityReviewState>([
  "not_required",
  "under_review",
  "non_blocking",
  "blocked",
  "manual_review",
  "superseded",
]);
const POLICY_STATUSES = new Set<MoralTradeResourceCompatibilityPolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "assessmentRequired",
  "assessments",
  "checkedAt",
  "transition",
]);
const ASSESSMENT_KEYS = new Set([
  "assessmentId",
  "createdAt",
  "hybridOrCompromiseGoodState",
  "incompatibleDutyOrControlRefs",
  "jointFeasibilityState",
  "participantIdsHash",
  "policyStatus",
  "publicParticipantIdentity",
  "publicPrivateDutiesOrConstraints",
  "publicPrivateResourceClaims",
  "publicReviewerNotes",
  "publicThirdPartyControlFacts",
  "resourceCompatibilityPolicyRef",
  "resourceOrActionConflictType",
  "reviewState",
  "reviewerDecisionRef",
  "subjectId",
  "subjectType",
  "updatedAt",
]);

type ResourceCompatibilityEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_resource_compatibility_enforcement_records"]["Insert"];

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

function stringArrayField(value: unknown, key: string, blockers: string[]) {
  if (!Array.isArray(value)) {
    blockers.push(`${key}: array is required`);

    return [];
  }

  if (value.length > MAX_ARRAY_ITEMS) {
    blockers.push(`${key}: at most ${MAX_ARRAY_ITEMS} entries are supported`);
  }

  return value
    .slice(0, MAX_ARRAY_ITEMS)
    .map((entry, index) =>
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
    .map((key) => `${prefix}.${key}: unsupported resource-compatibility enforcement key`);
}

function normalizeAssessment(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeResourceCompatibilityAssessmentRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.assessments.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, ASSESSMENT_KEYS, prefix));
  }

  return {
    assessmentId: requiredStringField(
      record.assessmentId,
      `${prefix}.assessmentId`,
      blockers,
      `submitted-resource-compatibility-assessment-${index + 1}`,
    ),
    createdAt: stringField(record.createdAt),
    hybridOrCompromiseGoodState: enumField(
      record.hybridOrCompromiseGoodState,
      HYBRID_OR_COMPROMISE_GOOD_STATES,
      "unclear",
      `${prefix}.hybridOrCompromiseGoodState`,
      blockers,
      true,
    ),
    incompatibleDutyOrControlRefs: stringArrayField(
      record.incompatibleDutyOrControlRefs,
      `${prefix}.incompatibleDutyOrControlRefs`,
      blockers,
    ),
    jointFeasibilityState: enumField(
      record.jointFeasibilityState,
      JOINT_FEASIBILITY_STATES,
      "under_review",
      `${prefix}.jointFeasibilityState`,
      blockers,
      true,
    ),
    participantIdsHash: requiredHashField(
      record.participantIdsHash,
      `${prefix}.participantIdsHash`,
      blockers,
    ),
    policyStatus: enumField(
      record.policyStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policyStatus`,
      blockers,
      true,
    ),
    publicParticipantIdentity: booleanField(record.publicParticipantIdentity),
    publicPrivateDutiesOrConstraints: booleanField(
      record.publicPrivateDutiesOrConstraints,
    ),
    publicPrivateResourceClaims: booleanField(record.publicPrivateResourceClaims),
    publicReviewerNotes: booleanField(record.publicReviewerNotes),
    publicThirdPartyControlFacts: booleanField(record.publicThirdPartyControlFacts),
    resourceCompatibilityPolicyRef: requiredStringField(
      record.resourceCompatibilityPolicyRef,
      `${prefix}.resourceCompatibilityPolicyRef`,
      blockers,
      `submitted-resource-compatibility-policy-${index + 1}`,
    ),
    resourceOrActionConflictType: enumField(
      record.resourceOrActionConflictType,
      CONFLICT_TYPES,
      "unknown",
      `${prefix}.resourceOrActionConflictType`,
      blockers,
      true,
    ),
    reviewState: enumField(
      record.reviewState,
      REVIEW_STATES,
      "under_review",
      `${prefix}.reviewState`,
      blockers,
      true,
    ),
    reviewerDecisionRef: nullableString(record.reviewerDecisionRef),
    subjectId: requiredStringField(
      record.subjectId,
      `${prefix}.subjectId`,
      blockers,
      `submitted-resource-compatibility-subject-${index + 1}`,
    ),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "offset_offer",
      `${prefix}.subjectType`,
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

  if (Array.isArray(value.assessments) && value.assessments.length > MAX_ASSESSMENTS) {
    blockers.push(
      `evaluationInput.assessments: at most ${MAX_ASSESSMENTS} records are supported`,
    );
  }

  const input: MoralTradeResourceCompatibilityEvaluationInput = {
    assessmentRequired: booleanField(value.assessmentRequired),
    assessments: Array.isArray(value.assessments)
      ? value.assessments
          .slice(0, MAX_ASSESSMENTS)
          .map((entry, index) => normalizeAssessment(entry, index, blockers))
      : [],
    checkedAt: stringField(value.checkedAt) || undefined,
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "draft_preview",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  if (!Array.isArray(value.assessments)) {
    blockers.push("evaluationInput.assessments: array is required");
  }

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `resource-compatibility-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    clearingRunAllowed: false,
    draftPreviewAllowed: false,
    matchCandidateGenerationAllowed: false,
    matchedTradeLockAllowed: false,
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
  const contract = getMoralTradeResourceCompatibilityContract();
  const contractValidation =
    validateMoralTradeResourceCompatibilityContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      resourceCompatibilityGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_resource_compatibility_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid resource-compatibility enforcement input creates no enforcement record and cannot authorize draft preview, match-candidate generation, matched-trade lock, clearing, payment capture, public metrics, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "resource_compatibility_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited resource-compatibility enforcement creates no enforcement record and cannot authorize draft preview, match-candidate generation, matched-trade lock, clearing, payment capture, public metrics, or release promotion.",
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

  const contract = getMoralTradeResourceCompatibilityContract();
  const contractValidation =
    validateMoralTradeResourceCompatibilityContract(contract);
  const evaluation = evaluateMoralTradeResourceCompatibility(normalized.input);
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
    resourceCompatibilityGateStatus:
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
          table: "moral_trade_resource_compatibility_enforcement_records",
        },
        fallback:
          "Resource-compatibility enforcement was evaluated but not recorded because Supabase is not configured; no draft preview, match-candidate generation, matched-trade lock, clearing, payment capture, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:resource_compatibility_enforce",
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
          table: "moral_trade_resource_compatibility_enforcement_records",
        },
        fallback:
          "Authentication is required before recording resource-compatibility enforcement. No draft preview, match-candidate generation, matched-trade lock, clearing, payment capture, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:resource_compatibility_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_resource_compatibility_enforcement_records")
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
          table: "moral_trade_resource_compatibility_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: ResourceCompatibilityEnforcementInsert = {
    assessment_record_count: normalized.input.assessments.length,
    assessment_required_bool: evaluation.assessmentRequired,
    blocker_codes: evaluation.blockers,
    clearing_run_allowed_bool: false,
    contract_version: contract.version,
    draft_preview_allowed_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    feasible_assessment_count: evaluation.feasibleAssessmentCount,
    idempotency_key: idempotencyKey,
    match_candidate_generation_allowed_bool: false,
    matched_trade_lock_allowed_bool: false,
    owner_profile_id: user.id,
    payment_capture_allowed_bool: false,
    privacy_safe_assessment_count: evaluation.privacySafeAssessmentCount,
    public_metric_publication_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    reviewed_assessment_count: evaluation.reviewedAssessmentCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_RESOURCE_COMPATIBILITY_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_resource_compatibility_enforcement_records")
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
          table: "moral_trade_resource_compatibility_enforcement_records",
        },
        fallback:
          "The resource-compatibility enforcement result could not be recorded. No draft preview, match-candidate generation, matched-trade lock, clearing, payment capture, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:resource_compatibility_enforce",
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
        table: "moral_trade_resource_compatibility_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
