import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_NONCOMPENSABLE_BLOCKER_VALIDATOR_VERSION,
  evaluateMoralTradeNoncompensableBlocker,
  getMoralTradeNoncompensableBlockerContract,
  validateMoralTradeNoncompensableBlockerContract,
  type MoralTradeAttemptedCompensationOrWaiverState,
  type MoralTradeNoncompensableBlockerAssessment,
  type MoralTradeNoncompensableBlockerEvaluationInput,
  type MoralTradeNoncompensableBlockerSubjectType,
  type MoralTradeNoncompensableBlockerTransition,
  type MoralTradeNoncompensablePolicyStatus,
  type MoralTradeNoncompensableReviewState,
  type MoralTradePersonalWaiverAllowedState,
  type MoralTradeProtectedInterestType,
} from "@/lib/moral-trade/noncompensable-blockers";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 48;
const MAX_ARRAY_ITEMS = 48;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeNoncompensableBlockerTransition>([
  "draft_preview",
  "match_candidate_generation",
  "matched_trade_lock",
  "payment_capture",
  "payout_release",
  "reliance",
  "public_completion_count",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradeNoncompensableBlockerSubjectType>([
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "compensated_action_terms",
  "pledge_performance_bond_record",
  "side_agreement_disclosure",
  "payment_event",
  "evidence_record",
  "dispute_case",
]);
const PROTECTED_INTEREST_TYPES = new Set<MoralTradeProtectedInterestType>([
  "participant_waivable_interest",
  "nonparticipant_interest",
  "legal_or_regulatory",
  "public_safety",
  "truthful_reporting",
  "civil_rights",
  "confidentiality_or_privacy",
  "institutional_process",
  "digital_system_integrity",
  "anti_threat",
  "other",
]);
const ATTEMPTED_COMPENSATION_OR_WAIVER_STATES =
  new Set<MoralTradeAttemptedCompensationOrWaiverState>([
    "none",
    "possible",
    "under_review",
    "blocking",
    "superseded",
  ]);
const PERSONAL_WAIVER_ALLOWED_STATES =
  new Set<MoralTradePersonalWaiverAllowedState>([
    "not_applicable",
    "allowed_with_renewed_confirmation",
    "disallowed",
    "disputed",
    "manual_review",
  ]);
const REVIEW_STATES = new Set<MoralTradeNoncompensableReviewState>([
  "not_required",
  "under_review",
  "non_blocking",
  "blocked",
  "manual_review",
  "superseded",
]);
const POLICY_STATUSES = new Set<MoralTradeNoncompensablePolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "assessmentRequired",
  "checkedAt",
  "records",
  "requiredAffectedParticipantCount",
  "transition",
]);
const RECORD_KEYS = new Set([
  "attemptedCompensationOrWaiverState",
  "blockingControlCodes",
  "createdAt",
  "noncompensableBlockerPolicyRef",
  "participantIdHash",
  "personalWaiverAllowedState",
  "policyStatus",
  "protectedInterestType",
  "recordId",
  "renewedConfirmationRecordRefs",
  "reviewState",
  "reviewerDecisionRef",
  "subjectId",
  "subjectType",
  "updatedAt",
]);

type NoncompensableBlockerEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_noncompensable_blocker_enforcement_records"]["Insert"];

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

function nonNegativeIntegerField(
  value: unknown,
  key: string,
  blockers: string[],
  fallback = 0,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    blockers.push(`${key}: finite number is required`);

    return fallback;
  }

  if (value < 0) {
    blockers.push(`${key}: non-negative number is required`);
  }

  return Math.max(0, Math.floor(value));
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
    .map((key) => `${prefix}.${key}: unsupported noncompensable-blocker enforcement key`);
}

function normalizeRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeNoncompensableBlockerAssessment {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.records.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, prefix));
  }

  return {
    attemptedCompensationOrWaiverState: enumField(
      record.attemptedCompensationOrWaiverState,
      ATTEMPTED_COMPENSATION_OR_WAIVER_STATES,
      "none",
      `${prefix}.attemptedCompensationOrWaiverState`,
      blockers,
      true,
    ),
    blockingControlCodes: stringArrayField(
      record.blockingControlCodes,
      `${prefix}.blockingControlCodes`,
      blockers,
    ),
    createdAt: stringField(record.createdAt),
    noncompensableBlockerPolicyRef: requiredStringField(
      record.noncompensableBlockerPolicyRef,
      `${prefix}.noncompensableBlockerPolicyRef`,
      blockers,
      `submitted-noncompensable-blocker-policy-${index + 1}`,
    ),
    participantIdHash: requiredHashField(
      record.participantIdHash,
      `${prefix}.participantIdHash`,
      blockers,
    ),
    personalWaiverAllowedState: enumField(
      record.personalWaiverAllowedState,
      PERSONAL_WAIVER_ALLOWED_STATES,
      "not_applicable",
      `${prefix}.personalWaiverAllowedState`,
      blockers,
      true,
    ),
    policyStatus: enumField(
      record.policyStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policyStatus`,
      blockers,
      true,
    ),
    protectedInterestType: enumField(
      record.protectedInterestType,
      PROTECTED_INTEREST_TYPES,
      "other",
      `${prefix}.protectedInterestType`,
      blockers,
      true,
    ),
    recordId: requiredStringField(
      record.recordId,
      `${prefix}.recordId`,
      blockers,
      `submitted-noncompensable-blocker-record-${index + 1}`,
    ),
    renewedConfirmationRecordRefs: stringArrayField(
      record.renewedConfirmationRecordRefs,
      `${prefix}.renewedConfirmationRecordRefs`,
      blockers,
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
      `submitted-noncompensable-blocker-subject-${index + 1}`,
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

  if (Array.isArray(value.records) && value.records.length > MAX_RECORDS) {
    blockers.push(`evaluationInput.records: at most ${MAX_RECORDS} records are supported`);
  }

  const input: MoralTradeNoncompensableBlockerEvaluationInput = {
    assessmentRequired: booleanField(value.assessmentRequired),
    checkedAt: stringField(value.checkedAt) || undefined,
    records: Array.isArray(value.records)
      ? value.records
          .slice(0, MAX_RECORDS)
          .map((entry, index) => normalizeRecord(entry, index, blockers))
      : [],
    requiredAffectedParticipantCount: nonNegativeIntegerField(
      value.requiredAffectedParticipantCount,
      "evaluationInput.requiredAffectedParticipantCount",
      blockers,
    ),
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "draft_preview",
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

  return normalized || `noncompensable-blocker-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    draftPreviewAllowed: false,
    matchCandidateGenerationAllowed: false,
    matchedTradeLockAllowed: false,
    paymentCaptureAllowed: false,
    payoutReleaseAllowed: false,
    publicCompletionCountAllowed: false,
    releaseGatePromotionAllowed: false,
    relianceAllowed: false,
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
  const contract = getMoralTradeNoncompensableBlockerContract();
  const contractValidation =
    validateMoralTradeNoncompensableBlockerContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      noncompensableBlockerGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_noncompensable_blocker_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid noncompensable-blocker enforcement input creates no enforcement record and cannot authorize draft preview, matching, lock, payment capture, payout release, reliance, public completion, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "noncompensable_blocker_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited noncompensable-blocker enforcement creates no enforcement record and cannot authorize draft preview, matching, lock, payment capture, payout release, reliance, public completion, or release promotion.",
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

  const contract = getMoralTradeNoncompensableBlockerContract();
  const contractValidation =
    validateMoralTradeNoncompensableBlockerContract(contract);
  const evaluation = evaluateMoralTradeNoncompensableBlocker(normalized.input);
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
    noncompensableBlockerGateStatus:
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
          table: "moral_trade_noncompensable_blocker_enforcement_records",
        },
        fallback:
          "Noncompensable-blocker enforcement was evaluated but not recorded because Supabase is not configured; no draft preview, matching, lock, payment capture, payout release, reliance, public completion, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:noncompensable_blocker_enforce",
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
          table: "moral_trade_noncompensable_blocker_enforcement_records",
        },
        fallback:
          "Authentication is required before recording noncompensable-blocker enforcement. No draft preview, matching, lock, payment capture, payout release, reliance, public completion, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:noncompensable_blocker_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_noncompensable_blocker_enforcement_records")
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
          table: "moral_trade_noncompensable_blocker_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: NoncompensableBlockerEnforcementInsert = {
    affected_participant_assessment_count:
      evaluation.affectedParticipantAssessmentCount,
    assessment_required_bool: evaluation.assessmentRequired,
    blocker_codes: evaluation.blockers,
    compensation_attempt_blocker_count:
      evaluation.compensationAttemptBlockerCount,
    contract_version: contract.version,
    draft_preview_allowed_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    match_candidate_generation_allowed_bool: false,
    matched_trade_lock_allowed_bool: false,
    non_blocking_assessment_count: evaluation.nonBlockingAssessmentCount,
    owner_profile_id: user.id,
    payment_capture_allowed_bool: false,
    payout_release_allowed_bool: false,
    personally_waivable_pass_count: evaluation.personallyWaivablePassCount,
    public_completion_count_allowed_bool: false,
    record_count: normalized.input.records.length,
    release_gate_promotion_allowed_bool: false,
    reliance_allowed_bool: false,
    required_affected_participant_count: evaluation.requiredAffectedParticipantCount,
    reviewed_record_count: evaluation.reviewedRecordCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_NONCOMPENSABLE_BLOCKER_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_noncompensable_blocker_enforcement_records")
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
          table: "moral_trade_noncompensable_blocker_enforcement_records",
        },
        fallback:
          "The noncompensable-blocker enforcement result could not be recorded. No draft preview, matching, lock, payment capture, payout release, reliance, public completion, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:noncompensable_blocker_enforce",
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
        table: "moral_trade_noncompensable_blocker_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
