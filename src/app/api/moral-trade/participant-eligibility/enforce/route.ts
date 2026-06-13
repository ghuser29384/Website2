import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_PARTICIPANT_ELIGIBILITY_VALIDATOR_VERSION,
  evaluateMoralTradeParticipantEligibility,
  getMoralTradeParticipantEligibilityContract,
  validateMoralTradeParticipantEligibilityContract,
  type MoralTradeParticipantEligibilityEvaluationInput,
  type MoralTradeParticipantEligibilityPolicySnapshotStatus,
  type MoralTradeParticipantEligibilityRecord,
  type MoralTradeParticipantEligibilityStatus,
  type MoralTradeParticipantEligibilityTransition,
} from "@/lib/moral-trade/participant-eligibility";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1_200;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 64;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeParticipantEligibilityTransition>([
  "non_money_preview",
  "counted_support",
  "matching_clearing",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "payout_release",
  "reliance_bearing_agreement",
  "public_support_metric_release",
  "release_gate_promotion",
]);
const ELIGIBILITY_STATUSES = new Set<MoralTradeParticipantEligibilityStatus>([
  "eligible",
  "not_required_for_stage",
  "missing",
  "under_review",
  "failed",
  "stale",
  "identity_unverified",
  "sybil_risk",
  "legal_capacity_blocked",
  "sanctions_potential_match",
  "sanctions_blocked",
  "payment_rail_blocked",
  "jurisdiction_blocked",
  "source_unauthenticated",
  "artifact_handling_unverified",
  "superseded",
]);
const POLICY_STATUSES = new Set<MoralTradeParticipantEligibilityPolicySnapshotStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set(["checkedAt", "records", "transition"]);
const RECORD_KEYS = new Set([
  "eligibilityRecordId",
  "evidenceHash",
  "expiresAt",
  "humanUniquenessSybilStatus",
  "identityArtifactRefHash",
  "identityArtifactsPubliclyExposed",
  "identityVerificationStatus",
  "jurisdictionalEligibilityStatus",
  "legalCapacityStatus",
  "moralWorthScorePublished",
  "participantId",
  "paymentRailEligibilityStatus",
  "policySnapshotStatus",
  "rawIdentityArtifactHandlingStatus",
  "reviewedAt",
  "sanctionsScreeningStatus",
  "sourceAuthenticationStatus",
]);

type ParticipantEligibilityEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_participant_eligibility_enforcement_records"]["Insert"];

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
    .map((key) => `${prefix}.${key}: unsupported participant-eligibility enforcement key`);
}

function normalizeRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeParticipantEligibilityRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.records.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, prefix));
  }

  return {
    eligibilityRecordId: requiredStringField(
      record.eligibilityRecordId,
      `${prefix}.eligibilityRecordId`,
      blockers,
      `submitted-participant-eligibility-${index + 1}`,
    ),
    evidenceHash: requiredHashField(record.evidenceHash, `${prefix}.evidenceHash`, blockers),
    expiresAt: nullableString(record.expiresAt),
    humanUniquenessSybilStatus: enumField(
      record.humanUniquenessSybilStatus,
      ELIGIBILITY_STATUSES,
      "missing",
      `${prefix}.humanUniquenessSybilStatus`,
      blockers,
      true,
    ),
    identityArtifactRefHash: requiredHashField(
      record.identityArtifactRefHash,
      `${prefix}.identityArtifactRefHash`,
      blockers,
    ),
    identityArtifactsPubliclyExposed: booleanField(
      record.identityArtifactsPubliclyExposed,
      `${prefix}.identityArtifactsPubliclyExposed`,
      blockers,
    ),
    identityVerificationStatus: enumField(
      record.identityVerificationStatus,
      ELIGIBILITY_STATUSES,
      "missing",
      `${prefix}.identityVerificationStatus`,
      blockers,
      true,
    ),
    jurisdictionalEligibilityStatus: enumField(
      record.jurisdictionalEligibilityStatus,
      ELIGIBILITY_STATUSES,
      "missing",
      `${prefix}.jurisdictionalEligibilityStatus`,
      blockers,
      true,
    ),
    legalCapacityStatus: enumField(
      record.legalCapacityStatus,
      ELIGIBILITY_STATUSES,
      "missing",
      `${prefix}.legalCapacityStatus`,
      blockers,
      true,
    ),
    moralWorthScorePublished: booleanField(
      record.moralWorthScorePublished,
      `${prefix}.moralWorthScorePublished`,
      blockers,
    ),
    participantId: requiredStringField(
      record.participantId,
      `${prefix}.participantId`,
      blockers,
      `submitted-participant-${index + 1}`,
    ),
    paymentRailEligibilityStatus: enumField(
      record.paymentRailEligibilityStatus,
      ELIGIBILITY_STATUSES,
      "missing",
      `${prefix}.paymentRailEligibilityStatus`,
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
    rawIdentityArtifactHandlingStatus: enumField(
      record.rawIdentityArtifactHandlingStatus,
      ELIGIBILITY_STATUSES,
      "missing",
      `${prefix}.rawIdentityArtifactHandlingStatus`,
      blockers,
      true,
    ),
    reviewedAt: requiredStringField(record.reviewedAt, `${prefix}.reviewedAt`, blockers),
    sanctionsScreeningStatus: enumField(
      record.sanctionsScreeningStatus,
      ELIGIBILITY_STATUSES,
      "missing",
      `${prefix}.sanctionsScreeningStatus`,
      blockers,
      true,
    ),
    sourceAuthenticationStatus: enumField(
      record.sourceAuthenticationStatus,
      ELIGIBILITY_STATUSES,
      "missing",
      `${prefix}.sourceAuthenticationStatus`,
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

  if (Array.isArray(value.records) && value.records.length > MAX_RECORDS) {
    blockers.push(`evaluationInput.records: at most ${MAX_RECORDS} records are supported`);
  }

  const input: MoralTradeParticipantEligibilityEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    records: Array.isArray(value.records)
      ? value.records
          .slice(0, MAX_RECORDS)
          .map((entry, index) => normalizeRecord(entry, index, blockers))
      : [],
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "non_money_preview",
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
  const normalized = stringField(value).slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `participant-eligibility-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    countedSupportAllowed: false,
    matchedTradeLockAllowed: false,
    matchingClearingAllowed: false,
    paymentAuthorizationAllowed: false,
    paymentCaptureAllowed: false,
    payoutReleaseAllowed: false,
    publicSupportMetricReleaseAllowed: false,
    releaseGatePromotionAllowed: false,
    relianceBearingAgreementAllowed: false,
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
  const contract = getMoralTradeParticipantEligibilityContract();
  const contractValidation = validateMoralTradeParticipantEligibilityContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      participantEligibilityGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_participant_eligibility_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid participant-eligibility enforcement input creates no enforcement record and cannot authorize counted support, matching, lock, payment, payout, reliance, public metrics, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "participant_eligibility_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited participant-eligibility enforcement creates no enforcement record and cannot authorize counted support, matching, lock, payment, payout, reliance, public metrics, or release promotion.",
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

  const contract = getMoralTradeParticipantEligibilityContract();
  const contractValidation = validateMoralTradeParticipantEligibilityContract(contract);
  const evaluation = evaluateMoralTradeParticipantEligibility(normalized.input);
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
    participantEligibilityGateStatus:
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
          table: "moral_trade_participant_eligibility_enforcement_records",
        },
        fallback:
          "Participant-eligibility enforcement was evaluated but not recorded because Supabase is not configured; no counted support, matching, lock, payment, payout, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:participant_eligibility_enforce"],
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
          table: "moral_trade_participant_eligibility_enforcement_records",
        },
        fallback:
          "Authentication is required before recording participant-eligibility enforcement. No counted support, matching, lock, payment, payout, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "authentication_required:participant_eligibility_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_participant_eligibility_enforcement_records")
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
          table: "moral_trade_participant_eligibility_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: ParticipantEligibilityEnforcementInsert = {
    blocker_codes: blockers,
    blocker_count: blockers.length,
    contract_version: contract.version,
    counted_support_allowed_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    matched_trade_lock_allowed_bool: false,
    matching_clearing_allowed_bool: false,
    owner_profile_id: user.id,
    passing_record_count: evaluation.passingRecordCount,
    payment_authorization_allowed_bool: false,
    payment_capture_allowed_bool: false,
    payout_release_allowed_bool: false,
    public_support_metric_release_allowed_bool: false,
    record_count: normalized.input.records.length,
    release_gate_promotion_allowed_bool: false,
    reliance_bearing_agreement_allowed_bool: false,
    required_record_count: evaluation.requiredRecordCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_PARTICIPANT_ELIGIBILITY_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_participant_eligibility_enforcement_records")
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
          table: "moral_trade_participant_eligibility_enforcement_records",
        },
        fallback:
          "The participant-eligibility enforcement result could not be recorded. No counted support, matching, lock, payment, payout, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "database_insert_failed:participant_eligibility_enforce"],
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
        table: "moral_trade_participant_eligibility_enforcement_records",
      },
    },
    "private_no_store",
  );
}
