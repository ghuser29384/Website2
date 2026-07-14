import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_OFFER_VALIDITY_VALIDATOR_VERSION,
  evaluateMoralTradeOfferValidity,
  getMoralTradeOfferValidityContract,
  validateMoralTradeOfferValidityContract,
  type MoralTradeOfferValidityEvaluationInput,
  type MoralTradeOfferValidityPolicyStatus,
  type MoralTradeOfferValidityRecord,
  type MoralTradeOfferValidityStaleReasonCode,
  type MoralTradeOfferValidityState,
  type MoralTradeOfferValiditySubjectType,
  type MoralTradeOfferValidityTransition,
} from "@/lib/moral-trade/offer-validity";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 48;
const MAX_ARRAY_ITEMS = 48;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeOfferValidityTransition>([
  "draft_preview",
  "live_offer_publication",
  "match_candidate_generation",
  "matched_trade_lock",
  "payment_capture",
  "reliance",
  "public_completion_count",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradeOfferValiditySubjectType>([
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "seed_template",
  "worked_example",
]);
const VALIDITY_STATES = new Set<MoralTradeOfferValidityState>([
  "draft",
  "valid",
  "stale",
  "expired",
  "renewed",
  "withdrawn",
  "superseded",
  "blocked",
]);
const POLICY_STATUSES = new Set<MoralTradeOfferValidityPolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const STALE_REASON_CODES = new Set<MoralTradeOfferValidityStaleReasonCode>([
  "baseline_snapshot_stale",
  "terms_snapshot_stale",
  "empirical_assumption_stale",
  "evidence_standard_stale",
  "payment_method_stale",
  "jurisdiction_stale",
  "recipient_destination_stale",
  "counterparty_bucket_stale",
  "validity_window_expired",
  "renewal_confirmation_missing",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "checkedAt",
  "records",
  "transition",
  "validityRequired",
]);
const RECORD_KEYS = new Set([
  "baselineSnapshotHash",
  "createdAt",
  "empiricalAssumptionSnapshotRefs",
  "evidenceStandardRefs",
  "jurisdictionPolicyVersion",
  "offerExpiresAt",
  "offerValidityPolicyRef",
  "policyStatus",
  "recipientOrDestinationRefs",
  "recordId",
  "renewalConfirmationRecordRefs",
  "reviewerDecisionRef",
  "staleAt",
  "staleReasonCodes",
  "subjectId",
  "subjectType",
  "termsSnapshotHash",
  "updatedAt",
  "validFrom",
  "validityState",
]);

type OfferValidityEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_offer_validity_enforcement_records"]["Insert"];

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

function enumArrayField<T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T,
  key: string,
  blockers: string[],
) {
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
      enumField(entry, allowed, fallback, `${key}.${index}`, blockers, true),
    );
}

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported offer-validity enforcement key`);
}

function normalizeRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeOfferValidityRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.records.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, prefix));
  }

  return {
    baselineSnapshotHash: requiredHashField(
      record.baselineSnapshotHash,
      `${prefix}.baselineSnapshotHash`,
      blockers,
    ),
    createdAt: stringField(record.createdAt),
    empiricalAssumptionSnapshotRefs: stringArrayField(
      record.empiricalAssumptionSnapshotRefs,
      `${prefix}.empiricalAssumptionSnapshotRefs`,
      blockers,
    ),
    evidenceStandardRefs: stringArrayField(
      record.evidenceStandardRefs,
      `${prefix}.evidenceStandardRefs`,
      blockers,
    ),
    jurisdictionPolicyVersion: requiredStringField(
      record.jurisdictionPolicyVersion,
      `${prefix}.jurisdictionPolicyVersion`,
      blockers,
      `submitted-jurisdiction-policy-${index + 1}`,
    ),
    offerExpiresAt: stringField(record.offerExpiresAt),
    offerValidityPolicyRef: requiredStringField(
      record.offerValidityPolicyRef,
      `${prefix}.offerValidityPolicyRef`,
      blockers,
      `submitted-offer-validity-policy-${index + 1}`,
    ),
    policyStatus: enumField(
      record.policyStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policyStatus`,
      blockers,
      true,
    ),
    recipientOrDestinationRefs: stringArrayField(
      record.recipientOrDestinationRefs,
      `${prefix}.recipientOrDestinationRefs`,
      blockers,
    ),
    recordId: requiredStringField(
      record.recordId,
      `${prefix}.recordId`,
      blockers,
      `submitted-offer-validity-record-${index + 1}`,
    ),
    renewalConfirmationRecordRefs: stringArrayField(
      record.renewalConfirmationRecordRefs,
      `${prefix}.renewalConfirmationRecordRefs`,
      blockers,
    ),
    reviewerDecisionRef: nullableString(record.reviewerDecisionRef),
    staleAt: stringField(record.staleAt),
    staleReasonCodes: enumArrayField(
      record.staleReasonCodes,
      STALE_REASON_CODES,
      "renewal_confirmation_missing",
      `${prefix}.staleReasonCodes`,
      blockers,
    ),
    subjectId: requiredStringField(
      record.subjectId,
      `${prefix}.subjectId`,
      blockers,
      `submitted-offer-validity-subject-${index + 1}`,
    ),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "offset_offer",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    termsSnapshotHash: requiredHashField(
      record.termsSnapshotHash,
      `${prefix}.termsSnapshotHash`,
      blockers,
    ),
    updatedAt: stringField(record.updatedAt),
    validFrom: stringField(record.validFrom),
    validityState: enumField(
      record.validityState,
      VALIDITY_STATES,
      "draft",
      `${prefix}.validityState`,
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

  const input: MoralTradeOfferValidityEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    records: Array.isArray(value.records)
      ? value.records
          .slice(0, MAX_RECORDS)
          .map((entry, index) => normalizeRecord(entry, index, blockers))
      : [],
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "draft_preview",
      "evaluationInput.transition",
      blockers,
      true,
    ),
    validityRequired: booleanField(value.validityRequired),
  };

  if (!Array.isArray(value.records)) {
    blockers.push("evaluationInput.records: array is required");
  }

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `offer-validity-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    draftPreviewAllowed: false,
    liveOfferPublicationAllowed: false,
    matchCandidateGenerationAllowed: false,
    matchedTradeLockAllowed: false,
    paymentCaptureAllowed: false,
    publicCompletionCountAllowed: false,
    relianceAllowed: false,
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
  const contract = getMoralTradeOfferValidityContract();
  const contractValidation = validateMoralTradeOfferValidityContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      offerValidityGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_offer_validity_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid offer-validity enforcement input creates no enforcement record and cannot authorize draft preview, live publication, matching, lock, payment capture, reliance, public completion, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "offer_validity_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited offer-validity enforcement creates no enforcement record and cannot authorize draft preview, live publication, matching, lock, payment capture, reliance, public completion, or release promotion.",
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

  const contract = getMoralTradeOfferValidityContract();
  const contractValidation = validateMoralTradeOfferValidityContract(contract);
  const evaluation = evaluateMoralTradeOfferValidity(normalized.input);
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
    offerValidityGateStatus:
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
          table: "moral_trade_offer_validity_enforcement_records",
        },
        fallback:
          "Offer-validity enforcement was evaluated but not recorded because Supabase is not configured; no draft preview, live publication, matching, lock, payment capture, reliance, public completion, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:offer_validity_enforce",
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
          table: "moral_trade_offer_validity_enforcement_records",
        },
        fallback:
          "Authentication is required before recording offer-validity enforcement. No draft preview, live publication, matching, lock, payment capture, reliance, public completion, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:offer_validity_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_offer_validity_enforcement_records")
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
          table: "moral_trade_offer_validity_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: OfferValidityEnforcementInsert = {
    active_validity_record_count: evaluation.activeValidityRecordCount,
    blocker_codes: evaluation.blockers,
    contract_version: contract.version,
    draft_preview_allowed_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    live_offer_publication_allowed_bool: false,
    match_candidate_generation_allowed_bool: false,
    matched_trade_lock_allowed_bool: false,
    owner_profile_id: user.id,
    payment_capture_allowed_bool: false,
    public_completion_count_allowed_bool: false,
    record_count: normalized.input.records.length,
    release_gate_promotion_allowed_bool: false,
    reliance_allowed_bool: false,
    reviewed_record_count: evaluation.reviewedRecordCount,
    stale_or_expired_record_count: evaluation.staleOrExpiredRecordCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validity_required_bool: evaluation.validityRequired,
    validator_version: MORAL_TRADE_OFFER_VALIDITY_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_offer_validity_enforcement_records")
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
          table: "moral_trade_offer_validity_enforcement_records",
        },
        fallback:
          "The offer-validity enforcement result could not be recorded. No draft preview, live publication, matching, lock, payment capture, reliance, public completion, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:offer_validity_enforce",
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
        table: "moral_trade_offer_validity_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
