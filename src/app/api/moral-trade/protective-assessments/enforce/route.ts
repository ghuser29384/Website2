import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_PROTECTIVE_ASSESSMENTS_VALIDATOR_VERSION,
  evaluateMoralTradeProtectiveAssessments,
  getMoralTradeProtectiveAssessmentContract,
  validateMoralTradeProtectiveAssessmentContract,
  type MoralTradeProtectiveAppealPathState,
  type MoralTradeProtectiveAssessmentDimension,
  type MoralTradeProtectiveAssessmentEvaluationInput,
  type MoralTradeProtectiveAssessmentPolicySnapshotStatus,
  type MoralTradeProtectiveAssessmentRecord,
  type MoralTradeProtectiveAssessmentRiskTrigger,
  type MoralTradeProtectiveAssessmentState,
  type MoralTradeProtectiveAssessmentSubjectType,
  type MoralTradeProtectiveAssessmentTransition,
  type MoralTradeProtectiveEvidencePlanState,
  type MoralTradeProtectiveNeutralReviewState,
  type MoralTradeProtectiveNoticeState,
  type MoralTradeProtectiveReviewerQualityState,
} from "@/lib/moral-trade/protective-assessments";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1_200;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 64;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeProtectiveAssessmentTransition>([
  "draft_preview",
  "matched_trade_lock",
  "payment_capture",
  "payout_release",
  "public_completion_claim",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradeProtectiveAssessmentSubjectType>([
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "performance_bond",
  "evidence_claim",
  "side_agreement",
  "recipient_choice",
  "common_ground_budget",
  "public_goods_round",
  "cleared_trade_agreement",
]);
const ASSESSMENT_DIMENSIONS = new Set<MoralTradeProtectiveAssessmentDimension>([
  "negative_commitment_substitution",
  "action_reversibility_high_stakes",
  "donor_of_record_tax_receipt",
  "third_party_obligation",
  "representative_authority",
  "reporting_integrity_non_suppression",
  "civil_rights_discrimination",
  "participant_autonomy_undue_influence",
  "confidentiality_privacy_rights",
  "evidence_authenticity_synthetic_media",
  "financial_crime_fraud_source_of_funds",
  "agreement_non_transferability",
  "regulated_goods_hazardous_activity",
  "cyber_abuse_digital_systems_integrity",
  "anti_corruption_process_integrity",
  "least_intrusive_evidence",
  "performance_bond_neutral_review",
]);
const ASSESSMENT_STATES = new Set<MoralTradeProtectiveAssessmentState>([
  "not_triggered",
  "required",
  "under_review",
  "non_blocking",
  "blocked",
  "not_required_for_stage",
  "waived_by_neutral_review",
  "stale",
  "superseded",
  "missing",
]);
const RISK_TRIGGERS = new Set<MoralTradeProtectiveAssessmentRiskTrigger>([
  "none",
  "possible",
  "confirmed",
  "rejected",
  "unknown",
]);
const POLICY_STATUSES =
  new Set<MoralTradeProtectiveAssessmentPolicySnapshotStatus>([
    "resolved_immutable",
    "missing",
    "mutable",
    "stale",
    "superseded",
  ]);
const EVIDENCE_PLAN_STATES = new Set<MoralTradeProtectiveEvidencePlanState>([
  "not_required_for_stage",
  "least_intrusive_approved",
  "high_burden_reviewer_approved",
  "under_review",
  "invasive_without_review",
  "missing",
  "stale",
  "superseded",
]);
const NEUTRAL_REVIEW_STATES = new Set<MoralTradeProtectiveNeutralReviewState>([
  "not_required_for_stage",
  "approved_neutral",
  "under_review",
  "counterparty_benefits",
  "conflicted",
  "missing",
  "stale",
  "superseded",
]);
const REVIEWER_QUALITY_STATES =
  new Set<MoralTradeProtectiveReviewerQualityState>([
    "authorized",
    "not_required_for_stage",
    "missing",
    "out_of_scope",
    "conflicted",
    "stale",
    "superseded",
  ]);
const NOTICE_STATES = new Set<MoralTradeProtectiveNoticeState>([
  "sent",
  "not_required_for_stage",
  "missing",
  "failed",
  "stale",
]);
const APPEAL_PATH_STATES = new Set<MoralTradeProtectiveAppealPathState>([
  "available",
  "not_required_for_stage",
  "missing",
  "emergency_only",
  "stale",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set(["checkedAt", "records", "transition"]);
const RECORD_KEYS = new Set([
  "appealPathState",
  "assessmentDimension",
  "assessmentHash",
  "assessmentId",
  "assessmentState",
  "evidencePlanState",
  "expiresAt",
  "neutralReviewState",
  "participantNoticeState",
  "policySnapshotStatus",
  "reviewedAt",
  "reviewerQualityState",
  "riskTrigger",
  "subjectRef",
  "subjectType",
  "supersededBy",
  "userFacingReasonCategory",
]);

type ProtectiveAssessmentEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_protective_assessment_enforcement_records"]["Insert"];

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

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported protective-assessment enforcement key`);
}

function normalizeRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeProtectiveAssessmentRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.records.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, prefix));
  }

  return {
    appealPathState: enumField(
      record.appealPathState,
      APPEAL_PATH_STATES,
      "missing",
      `${prefix}.appealPathState`,
      blockers,
      true,
    ),
    assessmentDimension: enumField(
      record.assessmentDimension,
      ASSESSMENT_DIMENSIONS,
      "least_intrusive_evidence",
      `${prefix}.assessmentDimension`,
      blockers,
      true,
    ),
    assessmentHash: requiredHashField(
      record.assessmentHash,
      `${prefix}.assessmentHash`,
      blockers,
    ),
    assessmentId: requiredStringField(
      record.assessmentId,
      `${prefix}.assessmentId`,
      blockers,
      `submitted-protective-assessment-${index + 1}`,
    ),
    assessmentState: enumField(
      record.assessmentState,
      ASSESSMENT_STATES,
      "missing",
      `${prefix}.assessmentState`,
      blockers,
      true,
    ),
    evidencePlanState: enumField(
      record.evidencePlanState,
      EVIDENCE_PLAN_STATES,
      "missing",
      `${prefix}.evidencePlanState`,
      blockers,
      true,
    ),
    expiresAt: nullableString(record.expiresAt),
    neutralReviewState: enumField(
      record.neutralReviewState,
      NEUTRAL_REVIEW_STATES,
      "missing",
      `${prefix}.neutralReviewState`,
      blockers,
      true,
    ),
    participantNoticeState: enumField(
      record.participantNoticeState,
      NOTICE_STATES,
      "missing",
      `${prefix}.participantNoticeState`,
      blockers,
      true,
    ),
    policySnapshotStatus: enumField(
      record.policySnapshotStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policySnapshotStatus`,
      blockers,
      true,
    ),
    reviewedAt: requiredStringField(
      record.reviewedAt,
      `${prefix}.reviewedAt`,
      blockers,
    ),
    reviewerQualityState: enumField(
      record.reviewerQualityState,
      REVIEWER_QUALITY_STATES,
      "missing",
      `${prefix}.reviewerQualityState`,
      blockers,
      true,
    ),
    riskTrigger: enumField(
      record.riskTrigger,
      RISK_TRIGGERS,
      "unknown",
      `${prefix}.riskTrigger`,
      blockers,
      true,
    ),
    subjectRef: requiredStringField(
      record.subjectRef,
      `${prefix}.subjectRef`,
      blockers,
      `submitted-protective-assessment-subject-${index + 1}`,
    ),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "pledge_swap",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    supersededBy: nullableString(record.supersededBy),
    userFacingReasonCategory: requiredStringField(
      record.userFacingReasonCategory,
      `${prefix}.userFacingReasonCategory`,
      blockers,
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

  if (Array.isArray(value.records) && value.records.length > MAX_RECORDS) {
    blockers.push(`evaluationInput.records: at most ${MAX_RECORDS} records are supported`);
  }

  const input: MoralTradeProtectiveAssessmentEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    records: Array.isArray(value.records)
      ? value.records
          .slice(0, MAX_RECORDS)
          .map((entry, index) => normalizeRecord(entry, index, blockers))
      : [],
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "matched_trade_lock",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  if (!Array.isArray(value.records)) {
    blockers.push("evaluationInput.records: array is required");
  }

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `protective-assessment-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    draftPreviewAllowed: false,
    matchedTradeLockAllowed: false,
    paymentCaptureAllowed: false,
    payoutReleaseAllowed: false,
    publicCompletionClaimAllowed: false,
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
  const contract = getMoralTradeProtectiveAssessmentContract();
  const contractValidation = validateMoralTradeProtectiveAssessmentContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      protectiveAssessmentGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_protective_assessment_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid protective-assessment enforcement input creates no enforcement record and cannot authorize draft preview, matched-trade lock, payment capture, payout release, public completion, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "protective_assessment_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited protective-assessment enforcement creates no enforcement record and cannot authorize draft preview, matched-trade lock, payment capture, payout release, public completion, or release promotion.",
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

  const contract = getMoralTradeProtectiveAssessmentContract();
  const contractValidation = validateMoralTradeProtectiveAssessmentContract(contract);
  const evaluation = evaluateMoralTradeProtectiveAssessments(normalized.input);
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
    protectiveAssessmentGateStatus:
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
          table: "moral_trade_protective_assessment_enforcement_records",
        },
        fallback:
          "Protective-assessment enforcement was evaluated but not recorded because Supabase is not configured; no draft preview, matched-trade lock, payment capture, payout release, public completion, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:protective_assessment_enforce"],
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
          table: "moral_trade_protective_assessment_enforcement_records",
        },
        fallback:
          "Authentication is required before recording protective-assessment enforcement. No draft preview, matched-trade lock, payment capture, payout release, public completion, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:protective_assessment_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_protective_assessment_enforcement_records")
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
          table: "moral_trade_protective_assessment_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: ProtectiveAssessmentEnforcementInsert = {
    blocker_codes: evaluation.blockers,
    blocker_count: evaluation.blockers.length,
    contract_version: contract.version,
    draft_preview_allowed_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    matched_trade_lock_allowed_bool: false,
    owner_profile_id: user.id,
    passing_assessment_count: evaluation.passingAssessmentCount,
    payment_capture_allowed_bool: false,
    payout_release_allowed_bool: false,
    public_completion_claim_allowed_bool: false,
    record_count: normalized.input.records.length,
    release_gate_promotion_allowed_bool: false,
    required_dimension_count: evaluation.requiredDimensionCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_PROTECTIVE_ASSESSMENTS_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_protective_assessment_enforcement_records")
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
          table: "moral_trade_protective_assessment_enforcement_records",
        },
        fallback:
          "The protective-assessment enforcement result could not be recorded. No draft preview, matched-trade lock, payment capture, payout release, public completion, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:protective_assessment_enforce",
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
        table: "moral_trade_protective_assessment_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
