import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_DIRECT_PAIR_CLEARING_VALIDATOR_VERSION,
  evaluateMoralTradeDirectPairClearing,
  getMoralTradeDirectPairClearingContract,
  validateMoralTradeDirectPairClearingContract,
  type MoralTradeDirectPairClearingRecord,
  type MoralTradeDirectPairEvaluationInput,
  type MoralTradeDirectPairPolicyStatus,
  type MoralTradeDirectPairReviewState,
  type MoralTradeDirectPairState,
  type MoralTradeDirectPairTradeType,
  type MoralTradeDirectPairTransition,
} from "@/lib/moral-trade/direct-pair-clearing";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 12;
const MAX_ARRAY_ITEMS = 24;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeDirectPairTransition>([
  "direct_pair_preview",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "public_metric_publication",
  "release_gate_promotion",
]);
const TRADE_TYPES = new Set<MoralTradeDirectPairTradeType>([
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "manual_review",
]);
const DIRECT_PAIR_STATES = new Set<MoralTradeDirectPairState>([
  "draft",
  "invited",
  "previewed",
  "both_confirmed",
  "locked",
  "expired",
  "withdrawn",
  "superseded",
  "blocked",
]);
const REVIEW_STATES = new Set<MoralTradeDirectPairReviewState>([
  "not_started",
  "under_review",
  "non_blocking",
  "blocked",
  "manual_review",
  "superseded",
]);
const POLICY_STATUSES = new Set<MoralTradeDirectPairPolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const ORDINARY_GATE_STATUSES = new Set<
  MoralTradeDirectPairClearingRecord["ordinaryLockReviewPaymentPrivacyGatesStatus"]
>([
  "passed",
  "not_required_for_stage",
  "missing",
  "under_review",
  "blocked",
  "stale",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "checkedAt",
  "directPairRequired",
  "records",
  "transition",
]);
const RECORD_KEYS = new Set([
  "autonomousOutreachAttempted",
  "createdAt",
  "directPairClearingPolicyRef",
  "directPairState",
  "finalConfirmationRecordRefs",
  "initiatorParticipantIdHash",
  "invitedOrKnownCounterpartyIdHash",
  "inviteOrKnownCounterpartyRef",
  "matchedTradeLockProposalRef",
  "matchingClearingRunRef",
  "noBackgroundNetworking",
  "ordinaryLockReviewPaymentPrivacyGatesStatus",
  "policyStatus",
  "privacyGrantRefs",
  "publicCounterpartyIdentity",
  "publicDirectContactDetails",
  "publicExactCaps",
  "publicPrivateNotes",
  "publicPrivateSurplus",
  "recordId",
  "reviewerDecisionRef",
  "sourceOfferIds",
  "tradeType",
  "twoPartyTermsSnapshotHash",
  "updatedAt",
  "userSafetyReviewState",
]);

type DirectPairClearingEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_direct_pair_clearing_enforcement_records"]["Insert"];

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
    .map((key) => `${prefix}.${key}: unsupported direct-pair clearing enforcement key`);
}

function normalizeRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeDirectPairClearingRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.records.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, prefix));
  }

  return {
    autonomousOutreachAttempted: booleanField(record.autonomousOutreachAttempted),
    createdAt: stringField(record.createdAt),
    directPairClearingPolicyRef: requiredStringField(
      record.directPairClearingPolicyRef,
      `${prefix}.directPairClearingPolicyRef`,
      blockers,
      `submitted-direct-pair-policy-${index + 1}`,
    ),
    directPairState: enumField(
      record.directPairState,
      DIRECT_PAIR_STATES,
      "draft",
      `${prefix}.directPairState`,
      blockers,
      true,
    ),
    finalConfirmationRecordRefs: stringArrayField(
      record.finalConfirmationRecordRefs,
      `${prefix}.finalConfirmationRecordRefs`,
      blockers,
    ),
    initiatorParticipantIdHash: requiredHashField(
      record.initiatorParticipantIdHash,
      `${prefix}.initiatorParticipantIdHash`,
      blockers,
    ),
    invitedOrKnownCounterpartyIdHash: requiredHashField(
      record.invitedOrKnownCounterpartyIdHash,
      `${prefix}.invitedOrKnownCounterpartyIdHash`,
      blockers,
    ),
    inviteOrKnownCounterpartyRef: requiredStringField(
      record.inviteOrKnownCounterpartyRef,
      `${prefix}.inviteOrKnownCounterpartyRef`,
      blockers,
      `submitted-direct-pair-counterparty-${index + 1}`,
    ),
    matchedTradeLockProposalRef: nullableString(record.matchedTradeLockProposalRef),
    matchingClearingRunRef: nullableString(record.matchingClearingRunRef),
    noBackgroundNetworking: booleanField(record.noBackgroundNetworking),
    ordinaryLockReviewPaymentPrivacyGatesStatus: enumField(
      record.ordinaryLockReviewPaymentPrivacyGatesStatus,
      ORDINARY_GATE_STATUSES,
      "missing",
      `${prefix}.ordinaryLockReviewPaymentPrivacyGatesStatus`,
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
    privacyGrantRefs: stringArrayField(
      record.privacyGrantRefs,
      `${prefix}.privacyGrantRefs`,
      blockers,
    ),
    publicCounterpartyIdentity: booleanField(record.publicCounterpartyIdentity),
    publicDirectContactDetails: booleanField(record.publicDirectContactDetails),
    publicExactCaps: booleanField(record.publicExactCaps),
    publicPrivateNotes: booleanField(record.publicPrivateNotes),
    publicPrivateSurplus: booleanField(record.publicPrivateSurplus),
    recordId: requiredStringField(
      record.recordId,
      `${prefix}.recordId`,
      blockers,
      `submitted-direct-pair-record-${index + 1}`,
    ),
    reviewerDecisionRef: nullableString(record.reviewerDecisionRef),
    sourceOfferIds: stringArrayField(
      record.sourceOfferIds,
      `${prefix}.sourceOfferIds`,
      blockers,
    ),
    tradeType: enumField(
      record.tradeType,
      TRADE_TYPES,
      "manual_review",
      `${prefix}.tradeType`,
      blockers,
      true,
    ),
    twoPartyTermsSnapshotHash: requiredHashField(
      record.twoPartyTermsSnapshotHash,
      `${prefix}.twoPartyTermsSnapshotHash`,
      blockers,
    ),
    updatedAt: stringField(record.updatedAt),
    userSafetyReviewState: enumField(
      record.userSafetyReviewState,
      REVIEW_STATES,
      "not_started",
      `${prefix}.userSafetyReviewState`,
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

  const input: MoralTradeDirectPairEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    directPairRequired: booleanField(value.directPairRequired),
    records: Array.isArray(value.records)
      ? value.records
          .slice(0, MAX_RECORDS)
          .map((entry, index) => normalizeRecord(entry, index, blockers))
      : [],
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "direct_pair_preview",
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

  return normalized || `direct-pair-clearing-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    directPairPreviewAllowed: false,
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
  const contract = getMoralTradeDirectPairClearingContract();
  const contractValidation =
    validateMoralTradeDirectPairClearingContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      directPairClearingGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_direct_pair_clearing_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid direct-pair clearing enforcement input creates no enforcement record and cannot authorize direct-pair preview, lock, payment, capture, public metrics, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "direct_pair_clearing_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited direct-pair clearing enforcement creates no enforcement record and cannot authorize direct-pair preview, lock, payment, capture, public metrics, or release promotion.",
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

  const contract = getMoralTradeDirectPairClearingContract();
  const contractValidation =
    validateMoralTradeDirectPairClearingContract(contract);
  const evaluation = evaluateMoralTradeDirectPairClearing(normalized.input);
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
    directPairClearingGateStatus:
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
          table: "moral_trade_direct_pair_clearing_enforcement_records",
        },
        fallback:
          "Direct-pair clearing enforcement was evaluated but not recorded because Supabase is not configured; no direct-pair preview, lock, payment, capture, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:direct_pair_clearing_enforce",
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
          table: "moral_trade_direct_pair_clearing_enforcement_records",
        },
        fallback:
          "Authentication is required before recording direct-pair clearing enforcement. No direct-pair preview, lock, payment, capture, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:direct_pair_clearing_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_direct_pair_clearing_enforcement_records")
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
          table: "moral_trade_direct_pair_clearing_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: DirectPairClearingEnforcementInsert = {
    blocker_codes: evaluation.blockers,
    confirmed_record_count: evaluation.confirmedRecordCount,
    contract_version: contract.version,
    direct_pair_preview_allowed_bool: false,
    direct_pair_required_bool: evaluation.directPairRequired,
    eligible_record_count: evaluation.eligibleRecordCount,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    matched_trade_lock_allowed_bool: false,
    no_background_networking_count: evaluation.noBackgroundNetworkingCount,
    owner_profile_id: user.id,
    payment_authorization_allowed_bool: false,
    payment_capture_allowed_bool: false,
    privacy_safe_record_count: evaluation.privacySafeRecordCount,
    public_metric_publication_allowed_bool: false,
    record_count: normalized.input.records.length,
    release_gate_promotion_allowed_bool: false,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_DIRECT_PAIR_CLEARING_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_direct_pair_clearing_enforcement_records")
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
          table: "moral_trade_direct_pair_clearing_enforcement_records",
        },
        fallback:
          "The direct-pair clearing enforcement result could not be recorded. No direct-pair preview, lock, payment, capture, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:direct_pair_clearing_enforce",
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
        table: "moral_trade_direct_pair_clearing_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
