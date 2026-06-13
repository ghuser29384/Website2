import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_PARTICIPANT_CONFIRMATION_VALIDATOR_VERSION,
  evaluateMoralTradeParticipantConfirmation,
  getMoralTradeParticipantConfirmationContract,
  validateMoralTradeParticipantConfirmationContract,
  type MoralTradeConsentQualityStatus,
  type MoralTradeNoticeRecordStatus,
  type MoralTradeParticipantConfirmationRecord,
  type MoralTradeParticipantConfirmationScope,
  type MoralTradeParticipantConfirmationStatus,
  type MoralTradeParticipantConfirmationSubjectType,
} from "@/lib/moral-trade/participant-confirmations";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1_200;
const MAX_IDEMPOTENCY_LENGTH = 160;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const REQUEST_KEYS = new Set(["confirmationRecord", "idempotencyKey"]);
const RECORD_KEYS = new Set([
  "baselineHash",
  "confirmationHash",
  "confirmationScope",
  "confirmationStatus",
  "consentQualityRequired",
  "consentQualityStatus",
  "currency",
  "eligibleSetHash",
  "expiresAt",
  "fallbackPolicyHash",
  "materialTermsChangedAfterConfirmation",
  "maximumExposureCents",
  "noticeRecordStatus",
  "participantId",
  "policySnapshotBundleHash",
  "recordedAt",
  "subjectId",
  "subjectType",
  "supersedesConfirmationHash",
  "termsSnapshotHash",
]);

type ParticipantConfirmationEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_participant_confirmation_enforcement_records"]["Insert"];

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

function nonNegativeIntegerField(value: unknown, key: string, blockers: string[]) {
  if (Number.isInteger(value) && Number(value) >= 0) {
    return Number(value);
  }

  blockers.push(`${key}: non-negative integer is required`);

  return 0;
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
  allowed: readonly T[],
  fallback: T,
  key: string,
  blockers: string[],
  required = false,
) {
  const normalized = stringField(value);

  if ((allowed as readonly string[]).includes(normalized)) {
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
    .map((key) => `${prefix}.${key}: unsupported participant-confirmation enforcement key`);
}

function normalizeConfirmationRecord(value: unknown) {
  const contract = getMoralTradeParticipantConfirmationContract();
  const blockers: string[] = [];

  if (!isRecord(value)) {
    return {
      input: null,
      blockers: ["confirmationRecord: object is required"],
    };
  }

  blockers.push(...unsupportedKeys(value, RECORD_KEYS, "confirmationRecord"));

  const input: MoralTradeParticipantConfirmationRecord = {
    baselineHash: requiredHashField(
      value.baselineHash,
      "confirmationRecord.baselineHash",
      blockers,
    ),
    confirmationHash: requiredHashField(
      value.confirmationHash,
      "confirmationRecord.confirmationHash",
      blockers,
    ),
    confirmationScope: enumField<MoralTradeParticipantConfirmationScope>(
      value.confirmationScope,
      contract.confirmationScopes,
      "final_lock",
      "confirmationRecord.confirmationScope",
      blockers,
      true,
    ),
    confirmationStatus: enumField<MoralTradeParticipantConfirmationStatus>(
      value.confirmationStatus,
      ["recorded", ...contract.failClosedStatuses],
      "missing",
      "confirmationRecord.confirmationStatus",
      blockers,
      true,
    ),
    consentQualityRequired: booleanField(
      value.consentQualityRequired,
      "confirmationRecord.consentQualityRequired",
      blockers,
    ),
    consentQualityStatus: enumField<MoralTradeConsentQualityStatus>(
      value.consentQualityStatus,
      contract.consentQualityStatuses,
      "missing",
      "confirmationRecord.consentQualityStatus",
      blockers,
      true,
    ),
    currency: requiredStringField(value.currency, "confirmationRecord.currency", blockers, "usd"),
    eligibleSetHash: nullableString(value.eligibleSetHash),
    expiresAt: nullableString(value.expiresAt),
    fallbackPolicyHash: nullableString(value.fallbackPolicyHash),
    materialTermsChangedAfterConfirmation: booleanField(
      value.materialTermsChangedAfterConfirmation,
      "confirmationRecord.materialTermsChangedAfterConfirmation",
      blockers,
    ),
    maximumExposureCents: nonNegativeIntegerField(
      value.maximumExposureCents,
      "confirmationRecord.maximumExposureCents",
      blockers,
    ),
    noticeRecordStatus: enumField<MoralTradeNoticeRecordStatus>(
      value.noticeRecordStatus,
      contract.noticeRecordStatuses,
      "missing",
      "confirmationRecord.noticeRecordStatus",
      blockers,
      true,
    ),
    participantId: requiredStringField(
      value.participantId,
      "confirmationRecord.participantId",
      blockers,
      "submitted-participant-confirmation",
    ),
    policySnapshotBundleHash: requiredHashField(
      value.policySnapshotBundleHash,
      "confirmationRecord.policySnapshotBundleHash",
      blockers,
    ),
    recordedAt: requiredStringField(
      value.recordedAt,
      "confirmationRecord.recordedAt",
      blockers,
    ),
    subjectId: requiredStringField(
      value.subjectId,
      "confirmationRecord.subjectId",
      blockers,
      "submitted-confirmation-subject",
    ),
    subjectType: enumField<MoralTradeParticipantConfirmationSubjectType>(
      value.subjectType,
      contract.subjectTypes,
      "matched_trade_lock_proposal",
      "confirmationRecord.subjectType",
      blockers,
      true,
    ),
    supersedesConfirmationHash: nullableString(value.supersedesConfirmationHash),
    termsSnapshotHash: requiredHashField(
      value.termsSnapshotHash,
      "confirmationRecord.termsSnapshotHash",
      blockers,
    ),
  };

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value).slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `participant-confirmation-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    captureAllowed: false,
    clearingAllowed: false,
    materialChangeAllowed: false,
    payoutReleaseAllowed: false,
    privacyDisclosureAllowed: false,
    publicMetricReleaseAllowed: false,
    releaseGatePromotionAllowed: false,
    routingAllowed: false,
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
  const contract = getMoralTradeParticipantConfirmationContract();
  const contractValidation = validateMoralTradeParticipantConfirmationContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      participantConfirmationGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_participant_confirmation_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid participant-confirmation enforcement input creates no enforcement record and cannot authorize routing, clearing, capture, payout release, privacy disclosure, public metrics, material-term changes, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "participant_confirmation_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited participant-confirmation enforcement creates no enforcement record and cannot authorize routing, clearing, capture, payout release, privacy disclosure, public metrics, material-term changes, or release promotion.",
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
  const normalized = normalizeConfirmationRecord(body.confirmationRecord);

  if (!normalized.input || requestBlockers.length || normalized.blockers.length) {
    return invalidRequestResponse({
      checkedAt,
      blockers: [...requestBlockers, ...normalized.blockers],
    });
  }

  const contract = getMoralTradeParticipantConfirmationContract();
  const contractValidation = validateMoralTradeParticipantConfirmationContract(contract);
  const evaluation = evaluateMoralTradeParticipantConfirmation(normalized.input);
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
    participantConfirmationGateStatus:
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
          table: "moral_trade_participant_confirmation_enforcement_records",
        },
        fallback:
          "Participant-confirmation enforcement was evaluated but not recorded because Supabase is not configured; no routing, clearing, capture, payout release, privacy disclosure, public metric, material-change, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:participant_confirmation_enforce"],
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
          table: "moral_trade_participant_confirmation_enforcement_records",
        },
        fallback:
          "Authentication is required before recording participant-confirmation enforcement. No routing, clearing, capture, payout release, privacy disclosure, public metric, material-change, or release-promotion state changed.",
        blockers: [...blockers, "authentication_required:participant_confirmation_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_participant_confirmation_enforcement_records")
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
          table: "moral_trade_participant_confirmation_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: ParticipantConfirmationEnforcementInsert = {
    blocker_codes: blockers,
    blocker_count: blockers.length,
    capture_allowed_bool: false,
    clearing_allowed_bool: false,
    confirmation_scope: evaluation.confirmationScope,
    contract_version: contract.version,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    material_change_allowed_bool: false,
    owner_profile_id: user.id,
    participant_id_ref: normalized.input.participantId,
    payout_release_allowed_bool: false,
    privacy_disclosure_allowed_bool: false,
    public_metric_release_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    routing_allowed_bool: false,
    subject_id_ref: normalized.input.subjectId,
    subject_type: evaluation.subjectType,
    validator_version: MORAL_TRADE_PARTICIPANT_CONFIRMATION_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_participant_confirmation_enforcement_records")
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
          table: "moral_trade_participant_confirmation_enforcement_records",
        },
        fallback:
          "The participant-confirmation enforcement result could not be recorded. No routing, clearing, capture, payout release, privacy disclosure, public metric, material-change, or release-promotion state changed.",
        blockers: [...blockers, "database_insert_failed:participant_confirmation_enforce"],
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
        table: "moral_trade_participant_confirmation_enforcement_records",
      },
    },
    "private_no_store",
  );
}
