import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_PARTICIPANT_TERM_SHEET_VALIDATOR_VERSION,
  evaluateMoralTradeParticipantTermSheet,
  getMoralTradeParticipantTermSheetContract,
  validateMoralTradeParticipantTermSheetContract,
  type MoralTradeCounterpartyBlindingPolicyRecord,
  type MoralTradeCounterpartyBlindingPolicyStatus,
  type MoralTradeCounterpartyDisclosureStage,
  type MoralTradeParticipantTermSheetEvaluationInput,
  type MoralTradeParticipantTermSheetRecord,
  type MoralTradeParticipantTermSheetState,
  type MoralTradeParticipantTermSheetSubjectType,
  type MoralTradeParticipantTermSheetTransition,
  type MoralTradeStagedCounterpartyDisclosureRecord,
  type MoralTradeStagedCounterpartyDisclosureState,
  type MoralTradeVisibleCounterpartyDisclosureStatus,
} from "@/lib/moral-trade/participant-term-sheet";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_POLICIES = 12;
const MAX_TERM_SHEETS = 12;
const MAX_DISCLOSURES = 12;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeParticipantTermSheetTransition>([
  "draft_preview",
  "counterparty_preview",
  "live_offer_publication",
  "matchable_publication",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "reliance_bearing_transition",
  "public_metric_publication",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradeParticipantTermSheetSubjectType>([
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
]);
const POLICY_STATUSES = new Set<MoralTradeCounterpartyBlindingPolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const TERM_SHEET_STATES = new Set<MoralTradeParticipantTermSheetState>([
  "draft",
  "participant_confirmed",
  "counterparty_confirmed",
  "mutually_confirmed",
  "mismatch",
  "expired",
  "superseded",
  "blocked",
]);
const DISCLOSURE_STATES = new Set<MoralTradeStagedCounterpartyDisclosureState>([
  "not_disclosed",
  "stage_eligible",
  "redacted_disclosed",
  "mutually_consented",
  "over_disclosed",
  "expired",
  "superseded",
  "blocked",
]);
const VISIBLE_DISCLOSURE_STATUSES =
  new Set<MoralTradeVisibleCounterpartyDisclosureStatus>([
    "not_disclosed",
    "volume_bucket_only",
    "redacted_counterparty",
    "mutual_consent_ready",
    "mutually_disclosed",
    "expired_stale",
    "blocked_needs_review",
  ]);
const DISCLOSURE_STAGES = new Set<MoralTradeCounterpartyDisclosureStage>([
  "none",
  "cohort_count",
  "redacted_counterparty",
  "mutual_consent",
  "post_lock_public_summary",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "checkedAt",
  "disclosures",
  "policies",
  "termSheets",
  "transition",
]);
const POLICY_KEYS = new Set([
  "allowedDisclosureStages",
  "exactPrivateConstraintPublic",
  "expiresAt",
  "hiddenMatchReasoningPublic",
  "policyHash",
  "policyId",
  "policyStatus",
  "privateWishPublic",
  "rawContactPublic",
  "rawCounterpartyIdentityPublic",
  "releaseStage",
  "reviewedAt",
  "subjectType",
  "supersededBy",
]);
const TERM_SHEET_KEYS = new Set([
  "blindingPolicyRef",
  "counterpartyConfirmationRef",
  "counterpartyTermHash",
  "expiresAt",
  "freeTextCreatesNewCounterparties",
  "freeTextCreatesNewObligations",
  "freeTextCreatesSidePayments",
  "mutualConfirmationHash",
  "normalizedTermHash",
  "participantConfirmationRef",
  "participantTermHash",
  "rawPrivateTermsPublic",
  "reviewedAt",
  "reviewerNotesPublic",
  "subjectRef",
  "subjectType",
  "supersededBy",
  "termSheetId",
  "termSheetState",
]);
const DISCLOSURE_KEYS = new Set([
  "blindingPolicyRef",
  "counterpartyVolumeBucket",
  "disclosureId",
  "disclosureStage",
  "disclosureState",
  "exactPrivateConstraintPublic",
  "expiresAt",
  "hiddenMatchReasoningPublic",
  "mutualConsentHash",
  "participantTermSheetRef",
  "privateWishPublic",
  "rawContactPublic",
  "rawCounterpartyIdentityPublic",
  "redactionHash",
  "reviewedAt",
  "reviewerNotesPublic",
  "supersededBy",
  "visibleUserDisclosureStatus",
]);

type ParticipantTermSheetEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_participant_term_sheet_enforcement_records"]["Insert"];

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
      enumField(
        entry,
        allowed,
        fallback,
        `${key}.${index}`,
        blockers,
        true,
      ),
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
      (key) => `${prefix}.${key}: unsupported participant-term-sheet enforcement key`,
    );
}

function normalizePolicy(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeCounterpartyBlindingPolicyRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.policies.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, POLICY_KEYS, prefix));
  }

  return {
    allowedDisclosureStages: enumArrayField(
      record.allowedDisclosureStages,
      DISCLOSURE_STAGES,
      "none",
      `${prefix}.allowedDisclosureStages`,
      blockers,
    ),
    exactPrivateConstraintPublic: booleanField(record.exactPrivateConstraintPublic),
    expiresAt: nullableString(record.expiresAt),
    hiddenMatchReasoningPublic: booleanField(record.hiddenMatchReasoningPublic),
    policyHash: requiredHashField(record.policyHash, `${prefix}.policyHash`, blockers),
    policyId: requiredStringField(
      record.policyId,
      `${prefix}.policyId`,
      blockers,
      `submitted-counterparty-blinding-policy-${index + 1}`,
    ),
    policyStatus: enumField(
      record.policyStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policyStatus`,
      blockers,
      true,
    ),
    privateWishPublic: booleanField(record.privateWishPublic),
    rawContactPublic: booleanField(record.rawContactPublic),
    rawCounterpartyIdentityPublic: booleanField(record.rawCounterpartyIdentityPublic),
    releaseStage: requiredStringField(
      record.releaseStage,
      `${prefix}.releaseStage`,
      blockers,
      "submitted-release-stage",
    ),
    reviewedAt: stringField(record.reviewedAt),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "donation_offset",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    supersededBy: nullableString(record.supersededBy),
  };
}

function normalizeTermSheet(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeParticipantTermSheetRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.termSheets.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, TERM_SHEET_KEYS, prefix));
  }

  return {
    blindingPolicyRef: requiredStringField(
      record.blindingPolicyRef,
      `${prefix}.blindingPolicyRef`,
      blockers,
      `submitted-counterparty-blinding-policy-${index + 1}`,
    ),
    counterpartyConfirmationRef: nullableString(record.counterpartyConfirmationRef),
    counterpartyTermHash: nullableHashField(
      record.counterpartyTermHash,
      `${prefix}.counterpartyTermHash`,
      blockers,
    ),
    expiresAt: nullableString(record.expiresAt),
    freeTextCreatesNewCounterparties: booleanField(
      record.freeTextCreatesNewCounterparties,
    ),
    freeTextCreatesNewObligations: booleanField(record.freeTextCreatesNewObligations),
    freeTextCreatesSidePayments: booleanField(record.freeTextCreatesSidePayments),
    mutualConfirmationHash: nullableHashField(
      record.mutualConfirmationHash,
      `${prefix}.mutualConfirmationHash`,
      blockers,
    ),
    normalizedTermHash: requiredHashField(
      record.normalizedTermHash,
      `${prefix}.normalizedTermHash`,
      blockers,
    ),
    participantConfirmationRef: nullableString(record.participantConfirmationRef),
    participantTermHash: requiredHashField(
      record.participantTermHash,
      `${prefix}.participantTermHash`,
      blockers,
    ),
    rawPrivateTermsPublic: booleanField(record.rawPrivateTermsPublic),
    reviewedAt: stringField(record.reviewedAt),
    reviewerNotesPublic: booleanField(record.reviewerNotesPublic),
    subjectRef: requiredStringField(
      record.subjectRef,
      `${prefix}.subjectRef`,
      blockers,
      `submitted-subject-${index + 1}`,
    ),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "donation_offset",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    supersededBy: nullableString(record.supersededBy),
    termSheetId: requiredStringField(
      record.termSheetId,
      `${prefix}.termSheetId`,
      blockers,
      `submitted-participant-term-sheet-${index + 1}`,
    ),
    termSheetState: enumField(
      record.termSheetState,
      TERM_SHEET_STATES,
      "draft",
      `${prefix}.termSheetState`,
      blockers,
      true,
    ),
  };
}

function normalizeDisclosure(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeStagedCounterpartyDisclosureRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.disclosures.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, DISCLOSURE_KEYS, prefix));
  }

  return {
    blindingPolicyRef: requiredStringField(
      record.blindingPolicyRef,
      `${prefix}.blindingPolicyRef`,
      blockers,
      `submitted-counterparty-blinding-policy-${index + 1}`,
    ),
    counterpartyVolumeBucket: requiredStringField(
      record.counterpartyVolumeBucket,
      `${prefix}.counterpartyVolumeBucket`,
      blockers,
      "unknown",
    ),
    disclosureId: requiredStringField(
      record.disclosureId,
      `${prefix}.disclosureId`,
      blockers,
      `submitted-staged-counterparty-disclosure-${index + 1}`,
    ),
    disclosureStage: enumField(
      record.disclosureStage,
      DISCLOSURE_STAGES,
      "none",
      `${prefix}.disclosureStage`,
      blockers,
      true,
    ),
    disclosureState: enumField(
      record.disclosureState,
      DISCLOSURE_STATES,
      "not_disclosed",
      `${prefix}.disclosureState`,
      blockers,
      true,
    ),
    exactPrivateConstraintPublic: booleanField(record.exactPrivateConstraintPublic),
    expiresAt: nullableString(record.expiresAt),
    hiddenMatchReasoningPublic: booleanField(record.hiddenMatchReasoningPublic),
    mutualConsentHash: nullableHashField(
      record.mutualConsentHash,
      `${prefix}.mutualConsentHash`,
      blockers,
    ),
    participantTermSheetRef: requiredStringField(
      record.participantTermSheetRef,
      `${prefix}.participantTermSheetRef`,
      blockers,
      `submitted-participant-term-sheet-${index + 1}`,
    ),
    privateWishPublic: booleanField(record.privateWishPublic),
    rawContactPublic: booleanField(record.rawContactPublic),
    rawCounterpartyIdentityPublic: booleanField(record.rawCounterpartyIdentityPublic),
    redactionHash: requiredHashField(
      record.redactionHash,
      `${prefix}.redactionHash`,
      blockers,
    ),
    reviewedAt: stringField(record.reviewedAt),
    reviewerNotesPublic: booleanField(record.reviewerNotesPublic),
    supersededBy: nullableString(record.supersededBy),
    visibleUserDisclosureStatus: enumField(
      record.visibleUserDisclosureStatus,
      VISIBLE_DISCLOSURE_STATUSES,
      "not_disclosed",
      `${prefix}.visibleUserDisclosureStatus`,
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

  const input: MoralTradeParticipantTermSheetEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    disclosures: Array.isArray(value.disclosures)
      ? value.disclosures
          .slice(0, MAX_DISCLOSURES)
          .map((entry, index) => normalizeDisclosure(entry, index, blockers))
      : [],
    policies: Array.isArray(value.policies)
      ? value.policies
          .slice(0, MAX_POLICIES)
          .map((entry, index) => normalizePolicy(entry, index, blockers))
      : [],
    termSheets: Array.isArray(value.termSheets)
      ? value.termSheets
          .slice(0, MAX_TERM_SHEETS)
          .map((entry, index) => normalizeTermSheet(entry, index, blockers))
      : [],
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "live_offer_publication",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `participant-term-sheet-enforce:${fallbackHash}`;
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
  const contract = getMoralTradeParticipantTermSheetContract();
  const contractValidation = validateMoralTradeParticipantTermSheetContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      participantTermSheetGateStatus: "blocked",
      counterpartyDisclosureAllowed: false,
      livePublicationAllowed: false,
      matchablePublicationAllowed: false,
      lockTransitionAllowed: false,
      paymentAuthorizationAllowed: false,
      paymentCaptureAllowed: false,
      relianceBearingTransitionAllowed: false,
      publicMetricPublicationAllowed: false,
      releaseGatePromotionAllowed: false,
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_participant_term_sheet_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid participant-term-sheet enforcement input creates no enforcement record and cannot authorize counterparty disclosure, live publication, matching, lock, payment, reliance, public metrics, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "participant_term_sheet_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited participant-term-sheet enforcement creates no enforcement record and cannot authorize counterparty disclosure, live publication, matching, lock, payment, reliance, public metrics, or release promotion.",
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

  const contract = getMoralTradeParticipantTermSheetContract();
  const contractValidation = validateMoralTradeParticipantTermSheetContract(contract);
  const evaluation = evaluateMoralTradeParticipantTermSheet(normalized.input);
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
    participantTermSheetGateStatus:
      evaluation.status === "pass" ? "non_blocking" : "blocked",
    counterpartyDisclosureAllowed: false,
    livePublicationAllowed: false,
    matchablePublicationAllowed: false,
    lockTransitionAllowed: false,
    paymentAuthorizationAllowed: false,
    paymentCaptureAllowed: false,
    relianceBearingTransitionAllowed: false,
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
          table: "moral_trade_participant_term_sheet_enforcement_records",
        },
        fallback:
          "Participant-term-sheet enforcement was evaluated but not recorded because Supabase is not configured; no counterparty disclosure, live publication, matching, lock, payment, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:participant_term_sheet_enforce"],
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
          table: "moral_trade_participant_term_sheet_enforcement_records",
        },
        fallback:
          "Authentication is required before recording participant-term-sheet enforcement. No counterparty disclosure, live publication, matching, lock, payment, reliance, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:participant_term_sheet_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_participant_term_sheet_enforcement_records")
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
          table: "moral_trade_participant_term_sheet_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: ParticipantTermSheetEnforcementInsert = {
    blocker_codes: evaluation.blockers,
    contract_version: contract.version,
    counterparty_disclosure_allowed_bool: false,
    disclosure_record_count: normalized.input.disclosures.length,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    immutable_policy_count: evaluation.immutablePolicyCount,
    live_publication_allowed_bool: false,
    lock_transition_allowed_bool: false,
    matchable_publication_allowed_bool: false,
    owner_profile_id: user.id,
    passing_term_sheet_count: evaluation.passingTermSheetCount,
    payment_authorization_allowed_bool: false,
    payment_capture_allowed_bool: false,
    policy_record_count: normalized.input.policies.length,
    public_metric_publication_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    reliance_bearing_transition_allowed_bool: false,
    required_disclosure_count: evaluation.requiredDisclosureCount,
    required_policy_count: evaluation.requiredPolicyCount,
    required_term_sheet_count: evaluation.requiredTermSheetCount,
    staged_disclosure_count: evaluation.stagedDisclosureCount,
    term_sheet_record_count: normalized.input.termSheets.length,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_PARTICIPANT_TERM_SHEET_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_participant_term_sheet_enforcement_records")
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
          table: "moral_trade_participant_term_sheet_enforcement_records",
        },
        fallback:
          "The participant-term-sheet enforcement result could not be recorded. No counterparty disclosure, live publication, matching, lock, payment, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "database_insert_failed:participant_term_sheet_enforce"],
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
        table: "moral_trade_participant_term_sheet_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
