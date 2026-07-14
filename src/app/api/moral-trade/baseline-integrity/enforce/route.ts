import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_BASELINE_INTEGRITY_VALIDATOR_VERSION,
  evaluateMoralTradeBaselineIntegrity,
  getMoralTradeBaselineIntegrityContract,
  validateMoralTradeBaselineIntegrityContract,
  type MoralTradeBaselineIntegrityAssessmentRecord,
  type MoralTradeBaselineIntegrityAssessmentState,
  type MoralTradeBaselineIntegrityEvaluationInput,
  type MoralTradeBaselineIntegrityLaunchClassification,
  type MoralTradeBaselineIntegrityPolicyRecord,
  type MoralTradeBaselineIntegrityReviewStatus,
  type MoralTradeBaselineIntegritySourceKind,
  type MoralTradeBaselineIntegritySubjectType,
  type MoralTradeBaselineIntegrityTransition,
} from "@/lib/moral-trade/baseline-integrity";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 600;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 12;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeBaselineIntegrityTransition>([
  "donation_offset_lock",
  "pledge_swap_lock",
  "broad_match_candidate",
  "public_goods_round",
  "post_lock_amendment",
]);
const SUBJECT_TYPES = new Set<MoralTradeBaselineIntegritySubjectType>([
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
]);
const REVIEW_STATUSES = new Set<MoralTradeBaselineIntegrityReviewStatus>([
  "passed",
  "not_required_for_stage",
  "missing",
  "under_review",
  "failed",
  "stale",
  "superseded",
]);
const ASSESSMENT_STATES = new Set<MoralTradeBaselineIntegrityAssessmentState>([
  "not_required",
  "under_review",
  "non_blocking",
  "blocked",
  "superseded",
  "stale",
]);
const SOURCE_KINDS = new Set<MoralTradeBaselineIntegritySourceKind>([
  "pre_existing_behavior",
  "independent_obligation",
  "historical_pattern",
  "marketplace_created",
  "marketplace_escalated",
  "counterparty_triggered",
  "unknown",
]);
const LAUNCH_CLASSIFICATIONS = new Set<MoralTradeBaselineIntegrityLaunchClassification>([
  "clearable_moral_trade",
  "preview_only",
  "rejected_threat_externality",
  "manual_review_required",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "assessments",
  "checkedAt",
  "policies",
  "requiresAssessment",
  "requiresClearableTransition",
  "requiresRelianceBearingTransition",
  "subjectType",
  "transition",
]);
const POLICY_KEYS = new Set([
  "additionalityReviewRequired",
  "externalityReviewRequired",
  "goodFaithConfidenceSeparationRequired",
  "historyEvidenceRequired",
  "independentReasonRequired",
  "maxAssessmentAgeDays",
  "participantConfirmationRequired",
  "policyHash",
  "policyId",
  "predatesOfferRequired",
  "privateEvidencePublicationProhibited",
  "reviewerQualityRequired",
  "reviewedAt",
  "status",
  "subjectType",
  "supersededBy",
]);
const ASSESSMENT_KEYS = new Set([
  "additionalityReviewStatus",
  "assessmentHash",
  "assessmentId",
  "assessmentState",
  "baselineSnapshotHash",
  "baselineSourceKind",
  "counterpartyTriggeredEscalation",
  "expiresAt",
  "externalityReviewStatus",
  "goodFaithConfidenceSeparated",
  "harmfulBaselineEscalated",
  "historyEvidencePresent",
  "independentReasonPresent",
  "launchClassification",
  "marketplaceCreated",
  "marketplaceEscalated",
  "participantConfirmationStatus",
  "policyRef",
  "predatesOffer",
  "privateEvidencePublic",
  "reviewedAt",
  "reviewerQualityStatus",
  "subjectRef",
  "subjectType",
  "supersededBy",
]);

type BaselineIntegrityEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_baseline_integrity_enforcement_records"]["Insert"];

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

function hashField(value: unknown) {
  const normalized = stringField(value);

  return HASH_PATTERN.test(normalized) ? normalized : normalized;
}

function numberField(value: unknown, fallback: number, max = 1_000_000) {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(0, Math.round(numeric)));
}

function booleanField(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
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

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported baseline-integrity enforcement key`);
}

function normalizePolicy(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeBaselineIntegrityPolicyRecord {
  const record = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    blockers.push(`evaluationInput.policies.${index}: object is required`);
  } else {
    blockers.push(
      ...unsupportedKeys(record, POLICY_KEYS, `evaluationInput.policies.${index}`),
    );
  }

  return {
    additionalityReviewRequired: booleanField(record.additionalityReviewRequired, true),
    externalityReviewRequired: booleanField(record.externalityReviewRequired, true),
    goodFaithConfidenceSeparationRequired: booleanField(
      record.goodFaithConfidenceSeparationRequired,
      true,
    ),
    historyEvidenceRequired: booleanField(record.historyEvidenceRequired, true),
    independentReasonRequired: booleanField(record.independentReasonRequired, true),
    maxAssessmentAgeDays: numberField(record.maxAssessmentAgeDays, 90, 3650) || 90,
    participantConfirmationRequired: booleanField(
      record.participantConfirmationRequired,
      true,
    ),
    policyHash: hashField(record.policyHash),
    policyId: stringField(record.policyId, `submitted-policy-${index + 1}`),
    predatesOfferRequired: booleanField(record.predatesOfferRequired, true),
    privateEvidencePublicationProhibited: booleanField(
      record.privateEvidencePublicationProhibited,
      true,
    ),
    reviewerQualityRequired: booleanField(record.reviewerQualityRequired, true),
    reviewedAt: stringField(record.reviewedAt) || null,
    status: enumField(
      record.status,
      REVIEW_STATUSES,
      "missing",
      `evaluationInput.policies.${index}.status`,
      blockers,
    ),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "offset_offer",
      `evaluationInput.policies.${index}.subjectType`,
      blockers,
    ),
    supersededBy: stringField(record.supersededBy) || null,
  };
}

function normalizeAssessment(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeBaselineIntegrityAssessmentRecord {
  const record = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    blockers.push(`evaluationInput.assessments.${index}: object is required`);
  } else {
    blockers.push(
      ...unsupportedKeys(
        record,
        ASSESSMENT_KEYS,
        `evaluationInput.assessments.${index}`,
      ),
    );
  }

  return {
    additionalityReviewStatus: enumField(
      record.additionalityReviewStatus,
      REVIEW_STATUSES,
      "missing",
      `evaluationInput.assessments.${index}.additionalityReviewStatus`,
      blockers,
    ),
    assessmentHash: hashField(record.assessmentHash),
    assessmentId: stringField(record.assessmentId, `submitted-assessment-${index + 1}`),
    assessmentState: enumField(
      record.assessmentState,
      ASSESSMENT_STATES,
      "under_review",
      `evaluationInput.assessments.${index}.assessmentState`,
      blockers,
    ),
    baselineSnapshotHash: stringField(record.baselineSnapshotHash) || null,
    baselineSourceKind: enumField(
      record.baselineSourceKind,
      SOURCE_KINDS,
      "unknown",
      `evaluationInput.assessments.${index}.baselineSourceKind`,
      blockers,
    ),
    counterpartyTriggeredEscalation: booleanField(
      record.counterpartyTriggeredEscalation,
    ),
    expiresAt: stringField(record.expiresAt) || null,
    externalityReviewStatus: enumField(
      record.externalityReviewStatus,
      REVIEW_STATUSES,
      "missing",
      `evaluationInput.assessments.${index}.externalityReviewStatus`,
      blockers,
    ),
    goodFaithConfidenceSeparated: booleanField(record.goodFaithConfidenceSeparated),
    harmfulBaselineEscalated: booleanField(record.harmfulBaselineEscalated),
    historyEvidencePresent: booleanField(record.historyEvidencePresent),
    independentReasonPresent: booleanField(record.independentReasonPresent),
    launchClassification: enumField(
      record.launchClassification,
      LAUNCH_CLASSIFICATIONS,
      "manual_review_required",
      `evaluationInput.assessments.${index}.launchClassification`,
      blockers,
    ),
    marketplaceCreated: booleanField(record.marketplaceCreated),
    marketplaceEscalated: booleanField(record.marketplaceEscalated),
    participantConfirmationStatus: enumField(
      record.participantConfirmationStatus,
      REVIEW_STATUSES,
      "missing",
      `evaluationInput.assessments.${index}.participantConfirmationStatus`,
      blockers,
    ),
    policyRef: stringField(record.policyRef),
    predatesOffer: booleanField(record.predatesOffer),
    privateEvidencePublic: booleanField(record.privateEvidencePublic),
    reviewedAt: stringField(record.reviewedAt) || null,
    reviewerQualityStatus: enumField(
      record.reviewerQualityStatus,
      REVIEW_STATUSES,
      "missing",
      `evaluationInput.assessments.${index}.reviewerQualityStatus`,
      blockers,
    ),
    subjectRef: stringField(record.subjectRef, `submitted-subject-${index + 1}`),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "offset_offer",
      `evaluationInput.assessments.${index}.subjectType`,
      blockers,
    ),
    supersededBy: stringField(record.supersededBy) || null,
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

  const policies = Array.isArray(value.policies)
    ? value.policies.slice(0, MAX_RECORDS).map((entry, index) => normalizePolicy(entry, index, blockers))
    : [];
  const assessments = Array.isArray(value.assessments)
    ? value.assessments
        .slice(0, MAX_RECORDS)
        .map((entry, index) => normalizeAssessment(entry, index, blockers))
    : [];
  const input: MoralTradeBaselineIntegrityEvaluationInput = {
    assessments,
    checkedAt: stringField(value.checkedAt) || undefined,
    policies,
    requiresAssessment: booleanField(value.requiresAssessment, true),
    requiresClearableTransition: booleanField(value.requiresClearableTransition),
    requiresRelianceBearingTransition: booleanField(
      value.requiresRelianceBearingTransition,
    ),
    subjectType: enumField(
      value.subjectType,
      SUBJECT_TYPES,
      "offset_offer",
      "evaluationInput.subjectType",
      blockers,
      true,
    ),
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "donation_offset_lock",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `baseline-integrity-enforce:${fallbackHash}`;
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
  const contract = getMoralTradeBaselineIntegrityContract();
  const contractValidation = validateMoralTradeBaselineIntegrityContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      baselineIntegrityGateStatus: "blocked",
      createsClearableTransition: false,
      payableTransitionAllowed: false,
      relianceBearingTransitionAllowed: false,
      publicMetricAllowed: false,
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_baseline_integrity_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid baseline-integrity enforcement input creates no enforcement record and cannot create clearable transitions, authorize payment, authorize reliance, or publish metrics.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "baseline_integrity_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited baseline-integrity enforcement creates no enforcement record and cannot create clearable transitions, authorize payment, authorize reliance, or publish metrics.",
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

  const contract = getMoralTradeBaselineIntegrityContract();
  const contractValidation = validateMoralTradeBaselineIntegrityContract(contract);
  const evaluation = evaluateMoralTradeBaselineIntegrity(normalized.input);
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
    baselineIntegrityGateStatus:
      evaluation.status === "pass" ? "non_blocking" : "blocked",
    createsClearableTransition: false,
    payableTransitionAllowed: false,
    relianceBearingTransitionAllowed: false,
    publicMetricAllowed: false,
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
          table: "moral_trade_baseline_integrity_enforcement_records",
        },
        fallback:
          "Baseline-integrity enforcement was evaluated but not recorded because Supabase is not configured; no clearable transition, payment, reliance, or public metric state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:baseline_integrity_enforce",
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
          table: "moral_trade_baseline_integrity_enforcement_records",
        },
        fallback:
          "Authentication is required before recording baseline-integrity enforcement. No clearable transition, payment, reliance, or public metric state changed.",
        blockers: [
          ...blockers,
          "authentication_required:baseline_integrity_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_baseline_integrity_enforcement_records")
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
          table: "moral_trade_baseline_integrity_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: BaselineIntegrityEnforcementInsert = {
    assessment_count: evaluation.assessmentCount,
    blocker_codes: evaluation.blockers,
    contract_version: contract.version,
    creates_clearable_transition_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    launch_classification: evaluation.launchClassification,
    owner_profile_id: user.id,
    payable_transition_allowed_bool: false,
    policy_count: evaluation.policyCount,
    public_metric_allowed_bool: false,
    reliance_bearing_transition_allowed_bool: false,
    requires_assessment_bool: normalized.input.requiresAssessment,
    requires_clearable_transition_bool:
      normalized.input.requiresClearableTransition,
    requires_reliance_bearing_transition_bool:
      normalized.input.requiresRelianceBearingTransition,
    subject_type: evaluation.subjectType,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_BASELINE_INTEGRITY_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_baseline_integrity_enforcement_records")
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
          table: "moral_trade_baseline_integrity_enforcement_records",
        },
        fallback:
          "The baseline-integrity enforcement result could not be recorded. No clearable transition, payment, reliance, or public metric state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:baseline_integrity_enforce",
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
        table: "moral_trade_baseline_integrity_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
