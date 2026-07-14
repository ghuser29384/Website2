import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_AI_PREFERENCE_ELICITATION_VALIDATOR_VERSION,
  evaluateMoralTradeAiPreferenceElicitation,
  getMoralTradeAiPreferenceElicitationContract,
  validateMoralTradeAiPreferenceElicitationContract,
  type MoralTradeAiPreferenceElicitationEvaluationInput,
  type MoralTradeAiPreferenceElicitationPolicyRecord,
  type MoralTradeAiPreferenceElicitationPolicyStatus,
  type MoralTradeAiPreferenceElicitationRecord,
  type MoralTradeAiPreferenceElicitationScope,
  type MoralTradeAiPreferenceElicitationState,
  type MoralTradeAiPreferenceElicitationSubjectType,
  type MoralTradeAiPreferenceElicitationTransition,
} from "@/lib/moral-trade/ai-preference-elicitation";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_POLICIES = 12;
const MAX_RECORDS = 24;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeAiPreferenceElicitationTransition>([
  "draft_preference_elicitation",
  "structured_input_conversion",
  "match_candidate_preview",
  "matched_trade_lock",
  "clearing_run_input",
  "counterparty_disclosure",
  "payment_authorization",
  "payment_capture",
  "public_metric_publication",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradeAiPreferenceElicitationSubjectType>([
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "common_ground_budget",
  "participant_confirmation_record",
]);
const SCOPES = new Set<MoralTradeAiPreferenceElicitationScope>([
  "baseline",
  "caps",
  "side_constraints",
  "empirical_assumptions",
  "cause_buckets",
  "evidence_preferences",
  "fallback_rules",
  "manual_review",
]);
const POLICY_STATUSES = new Set<MoralTradeAiPreferenceElicitationPolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const ELICITATION_STATES = new Set<MoralTradeAiPreferenceElicitationState>([
  "sandbox",
  "user_reviewed",
  "converted_to_structured_input",
  "discarded",
  "blocked",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "aiPreferenceElicitationUsed",
  "checkedAt",
  "policies",
  "records",
  "transition",
]);
const POLICY_KEYS = new Set([
  "allowedScopes",
  "allowedSubjectTypes",
  "allowsPreferenceStructuring",
  "expiresAt",
  "policyHash",
  "policyId",
  "policyStatus",
  "prohibitsAutonomousCounteroffers",
  "prohibitsHiddenWillingnessToPayInference",
  "prohibitsStateChangeFromAiOutput",
  "releaseStage",
  "requiresUserEditedStructuredInputForStateChange",
  "reviewedAt",
  "supersededBy",
]);
const RECORD_KEYS = new Set([
  "aiOutputHash",
  "autonomousCounterofferOrAcceptance",
  "createdAt",
  "elicitationState",
  "hiddenNegotiationMovesPublic",
  "hiddenWillingnessToPayEstimatePublic",
  "hiddenWillingnessToPayInferenceProhibited",
  "participantConfirmationRecordRef",
  "participantIdHash",
  "policyRef",
  "privateParticipantNotesPublic",
  "rawAiOutputPublic",
  "rawPromptPublic",
  "recordId",
  "reviewerDecisionRef",
  "reviewerNotesPublic",
  "scope",
  "stateChangeAllowed",
  "subjectRef",
  "subjectType",
  "updatedAt",
  "userEditedStructuredInputHash",
]);

type AiPreferenceElicitationEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_ai_preference_elicitation_enforcement_records"]["Insert"];

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

function nullableHashField(value: unknown, key: string, blockers: string[]) {
  const normalized = stringField(value);

  if (!normalized) {
    return null;
  }

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

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map(
      (key) =>
        `${prefix}.${key}: unsupported AI preference-elicitation enforcement key`,
    );
}

function normalizePolicy(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeAiPreferenceElicitationPolicyRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.policies.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, POLICY_KEYS, prefix));
  }

  return {
    allowedScopes: enumArrayField(
      record.allowedScopes,
      SCOPES,
      "baseline",
      `${prefix}.allowedScopes`,
      blockers,
    ),
    allowedSubjectTypes: enumArrayField(
      record.allowedSubjectTypes,
      SUBJECT_TYPES,
      "offset_offer",
      `${prefix}.allowedSubjectTypes`,
      blockers,
    ),
    allowsPreferenceStructuring: booleanField(
      record.allowsPreferenceStructuring,
      true,
    ),
    expiresAt: nullableString(record.expiresAt),
    policyHash: requiredHashField(record.policyHash, `${prefix}.policyHash`, blockers),
    policyId: requiredStringField(
      record.policyId,
      `${prefix}.policyId`,
      blockers,
      `submitted-ai-preference-policy-${index + 1}`,
    ),
    policyStatus: enumField(
      record.policyStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policyStatus`,
      blockers,
      true,
    ),
    prohibitsAutonomousCounteroffers: booleanField(
      record.prohibitsAutonomousCounteroffers,
      true,
    ),
    prohibitsHiddenWillingnessToPayInference: booleanField(
      record.prohibitsHiddenWillingnessToPayInference,
      true,
    ),
    prohibitsStateChangeFromAiOutput: booleanField(
      record.prohibitsStateChangeFromAiOutput,
      true,
    ),
    releaseStage: requiredStringField(
      record.releaseStage,
      `${prefix}.releaseStage`,
      blockers,
      "submitted-release-stage",
    ),
    requiresUserEditedStructuredInputForStateChange: booleanField(
      record.requiresUserEditedStructuredInputForStateChange,
      true,
    ),
    reviewedAt: stringField(record.reviewedAt),
    supersededBy: nullableString(record.supersededBy),
  };
}

function normalizeElicitationRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeAiPreferenceElicitationRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.records.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, prefix));
  }

  return {
    aiOutputHash: requiredHashField(
      record.aiOutputHash,
      `${prefix}.aiOutputHash`,
      blockers,
    ),
    autonomousCounterofferOrAcceptance: booleanField(
      record.autonomousCounterofferOrAcceptance,
    ),
    createdAt: stringField(record.createdAt),
    elicitationState: enumField(
      record.elicitationState,
      ELICITATION_STATES,
      "sandbox",
      `${prefix}.elicitationState`,
      blockers,
      true,
    ),
    hiddenNegotiationMovesPublic: booleanField(record.hiddenNegotiationMovesPublic),
    hiddenWillingnessToPayEstimatePublic: booleanField(
      record.hiddenWillingnessToPayEstimatePublic,
    ),
    hiddenWillingnessToPayInferenceProhibited: booleanField(
      record.hiddenWillingnessToPayInferenceProhibited,
      true,
    ),
    participantConfirmationRecordRef: nullableString(
      record.participantConfirmationRecordRef,
    ),
    participantIdHash: requiredHashField(
      record.participantIdHash,
      `${prefix}.participantIdHash`,
      blockers,
    ),
    policyRef: requiredStringField(
      record.policyRef,
      `${prefix}.policyRef`,
      blockers,
      `submitted-ai-preference-policy-${index + 1}`,
    ),
    privateParticipantNotesPublic: booleanField(
      record.privateParticipantNotesPublic,
    ),
    rawAiOutputPublic: booleanField(record.rawAiOutputPublic),
    rawPromptPublic: booleanField(record.rawPromptPublic),
    recordId: requiredStringField(
      record.recordId,
      `${prefix}.recordId`,
      blockers,
      `submitted-ai-preference-elicitation-${index + 1}`,
    ),
    reviewerDecisionRef: nullableString(record.reviewerDecisionRef),
    reviewerNotesPublic: booleanField(record.reviewerNotesPublic),
    scope: enumField(
      record.scope,
      SCOPES,
      "baseline",
      `${prefix}.scope`,
      blockers,
      true,
    ),
    stateChangeAllowed: booleanField(record.stateChangeAllowed),
    subjectRef: requiredStringField(
      record.subjectRef,
      `${prefix}.subjectRef`,
      blockers,
      `submitted-subject-${index + 1}`,
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
    userEditedStructuredInputHash: nullableHashField(
      record.userEditedStructuredInputHash,
      `${prefix}.userEditedStructuredInputHash`,
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

  const input: MoralTradeAiPreferenceElicitationEvaluationInput = {
    aiPreferenceElicitationUsed: booleanField(value.aiPreferenceElicitationUsed),
    checkedAt: stringField(value.checkedAt) || undefined,
    policies: Array.isArray(value.policies)
      ? value.policies
          .slice(0, MAX_POLICIES)
          .map((entry, index) => normalizePolicy(entry, index, blockers))
      : [],
    records: Array.isArray(value.records)
      ? value.records
          .slice(0, MAX_RECORDS)
          .map((entry, index) => normalizeElicitationRecord(entry, index, blockers))
      : [],
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "match_candidate_preview",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `ai-preference-elicitation-enforce:${fallbackHash}`;
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
  const contract = getMoralTradeAiPreferenceElicitationContract();
  const contractValidation =
    validateMoralTradeAiPreferenceElicitationContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      aiPreferenceElicitationGateStatus: "blocked",
      structuredInputConversionAllowed: false,
      matchCandidatePreviewAllowed: false,
      lockTransitionAllowed: false,
      clearingRunInputAllowed: false,
      counterpartyDisclosureAllowed: false,
      paymentAuthorizationAllowed: false,
      paymentCaptureAllowed: false,
      publicMetricPublicationAllowed: false,
      releaseGatePromotionAllowed: false,
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_ai_preference_elicitation_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid AI preference-elicitation enforcement input creates no enforcement record and cannot authorize structured input conversion, matching, clearing, counterparty disclosure, payment, public metrics, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "ai_preference_elicitation_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited AI preference-elicitation enforcement creates no enforcement record and cannot authorize structured input conversion, matching, clearing, counterparty disclosure, payment, public metrics, or release promotion.",
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

  const contract = getMoralTradeAiPreferenceElicitationContract();
  const contractValidation =
    validateMoralTradeAiPreferenceElicitationContract(contract);
  const evaluation = evaluateMoralTradeAiPreferenceElicitation(normalized.input);
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
    aiPreferenceElicitationGateStatus:
      evaluation.status === "pass" ? "non_blocking" : "blocked",
    structuredInputConversionAllowed: false,
    matchCandidatePreviewAllowed: false,
    lockTransitionAllowed: false,
    clearingRunInputAllowed: false,
    counterpartyDisclosureAllowed: false,
    paymentAuthorizationAllowed: false,
    paymentCaptureAllowed: false,
    publicMetricPublicationAllowed: false,
    releaseGatePromotionAllowed: false,
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
          table: "moral_trade_ai_preference_elicitation_enforcement_records",
        },
        fallback:
          "AI preference-elicitation enforcement was evaluated but not recorded because Supabase is not configured; no structured input conversion, matching, clearing, counterparty disclosure, payment, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:ai_preference_elicitation_enforce",
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
          table: "moral_trade_ai_preference_elicitation_enforcement_records",
        },
        fallback:
          "Authentication is required before recording AI preference-elicitation enforcement. No structured input conversion, matching, clearing, counterparty disclosure, payment, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:ai_preference_elicitation_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_ai_preference_elicitation_enforcement_records")
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
          table: "moral_trade_ai_preference_elicitation_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: AiPreferenceElicitationEnforcementInsert = {
    ai_preference_elicitation_used_bool: evaluation.aiPreferenceElicitationUsed,
    blocker_codes: evaluation.blockers,
    clearing_run_input_allowed_bool: false,
    confirmation_or_reviewer_decision_count:
      evaluation.confirmationOrReviewerDecisionCount,
    contract_version: contract.version,
    converted_structured_input_count: evaluation.convertedStructuredInputCount,
    counterparty_disclosure_allowed_bool: false,
    elicitation_record_count: normalized.input.records.length,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    immutable_policy_count: evaluation.immutablePolicyCount,
    lock_transition_allowed_bool: false,
    match_candidate_preview_allowed_bool: false,
    owner_profile_id: user.id,
    payment_authorization_allowed_bool: false,
    payment_capture_allowed_bool: false,
    policy_record_count: normalized.input.policies.length,
    public_metric_publication_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    required_policy_count: evaluation.requiredPolicyCount,
    required_record_count: evaluation.requiredRecordCount,
    structured_input_conversion_allowed_bool: false,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_AI_PREFERENCE_ELICITATION_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_ai_preference_elicitation_enforcement_records")
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
          table: "moral_trade_ai_preference_elicitation_enforcement_records",
        },
        fallback:
          "The AI preference-elicitation enforcement result could not be recorded. No structured input conversion, matching, clearing, counterparty disclosure, payment, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:ai_preference_elicitation_enforce",
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
        table: "moral_trade_ai_preference_elicitation_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
