import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_PRIVATE_EXCHANGE_RATE_VALIDATOR_VERSION,
  evaluateMoralTradePrivateExchangeRate,
  getMoralTradePrivateExchangeRateContract,
  validateMoralTradePrivateExchangeRateContract,
  type MoralTradePrivateExchangeRateDisclosureScope,
  type MoralTradePrivateExchangeRateEvaluationInput,
  type MoralTradePrivateExchangeRatePolicyStatus,
  type MoralTradePrivateExchangeRateQuoteRecord,
  type MoralTradePrivateExchangeRateQuoteState,
  type MoralTradePrivateExchangeRateQuoteType,
  type MoralTradePrivateExchangeRateSubjectType,
  type MoralTradePrivateExchangeRateTransition,
} from "@/lib/moral-trade/private-exchange-rate";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 48;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradePrivateExchangeRateTransition>([
  "draft_preview",
  "match_candidate_generation",
  "matched_trade_lock",
  "clearing_run",
  "payment_capture",
  "reliance",
  "public_metric_publication",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradePrivateExchangeRateSubjectType>([
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "bargaining_round_record",
]);
const QUOTE_TYPES = new Set<MoralTradePrivateExchangeRateQuoteType>([
  "clearing_ratio_bound",
  "side_payment_bound",
  "counterpart_volume_bound",
  "action_money_tradeoff",
  "empirical_effectiveness_tradeoff",
  "manual_review",
]);
const DISCLOSURE_SCOPES = new Set<MoralTradePrivateExchangeRateDisclosureScope>([
  "participant_only",
  "reviewer_only",
  "counterparty_band_only",
  "public_suppressed",
]);
const QUOTE_STATES = new Set<MoralTradePrivateExchangeRateQuoteState>([
  "draft",
  "active",
  "locked",
  "expired",
  "superseded",
  "withdrawn",
]);
const POLICY_STATUSES = new Set<MoralTradePrivateExchangeRatePolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "checkedAt",
  "privateExchangeRateRequired",
  "records",
  "requiredAffectedParticipantCount",
  "transition",
]);
const RECORD_KEYS = new Set([
  "acceptableMaxBps",
  "acceptableMinBps",
  "createdAt",
  "disclosureScope",
  "exactCounterpartyQuoteDisclosed",
  "globalExchangeRatePublished",
  "moralValueInferencePublished",
  "participantIdHash",
  "policyStatus",
  "privateExchangeRateQuotePolicyRef",
  "privateQuoteTermsHash",
  "publicCausePricePublished",
  "publicEffectivenessComparisonPublished",
  "publicMoralPriceProhibited",
  "quoteState",
  "quoteType",
  "rawPrivateTermsPublic",
  "recordId",
  "reviewerDecisionRef",
  "settlementCurrency",
  "subjectId",
  "subjectType",
  "updatedAt",
]);

type PrivateExchangeRateEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_private_exchange_rate_enforcement_records"]["Insert"];

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

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported private exchange-rate enforcement key`);
}

function normalizeRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradePrivateExchangeRateQuoteRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.records.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, prefix));
  }

  return {
    acceptableMaxBps: nonNegativeIntegerField(
      record.acceptableMaxBps,
      `${prefix}.acceptableMaxBps`,
      blockers,
    ),
    acceptableMinBps: nonNegativeIntegerField(
      record.acceptableMinBps,
      `${prefix}.acceptableMinBps`,
      blockers,
    ),
    createdAt: stringField(record.createdAt),
    disclosureScope: enumField(
      record.disclosureScope,
      DISCLOSURE_SCOPES,
      "participant_only",
      `${prefix}.disclosureScope`,
      blockers,
      true,
    ),
    exactCounterpartyQuoteDisclosed: booleanField(
      record.exactCounterpartyQuoteDisclosed,
    ),
    globalExchangeRatePublished: booleanField(record.globalExchangeRatePublished),
    moralValueInferencePublished: booleanField(record.moralValueInferencePublished),
    participantIdHash: requiredHashField(
      record.participantIdHash,
      `${prefix}.participantIdHash`,
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
    privateExchangeRateQuotePolicyRef: requiredStringField(
      record.privateExchangeRateQuotePolicyRef,
      `${prefix}.privateExchangeRateQuotePolicyRef`,
      blockers,
      `submitted-private-exchange-rate-policy-${index + 1}`,
    ),
    privateQuoteTermsHash: requiredHashField(
      record.privateQuoteTermsHash,
      `${prefix}.privateQuoteTermsHash`,
      blockers,
    ),
    publicCausePricePublished: booleanField(record.publicCausePricePublished),
    publicEffectivenessComparisonPublished: booleanField(
      record.publicEffectivenessComparisonPublished,
    ),
    publicMoralPriceProhibited: booleanField(
      record.publicMoralPriceProhibited,
      true,
    ),
    quoteState: enumField(
      record.quoteState,
      QUOTE_STATES,
      "draft",
      `${prefix}.quoteState`,
      blockers,
      true,
    ),
    quoteType: enumField(
      record.quoteType,
      QUOTE_TYPES,
      "manual_review",
      `${prefix}.quoteType`,
      blockers,
      true,
    ),
    rawPrivateTermsPublic: booleanField(record.rawPrivateTermsPublic),
    recordId: requiredStringField(
      record.recordId,
      `${prefix}.recordId`,
      blockers,
      `submitted-private-exchange-rate-record-${index + 1}`,
    ),
    reviewerDecisionRef: nullableString(record.reviewerDecisionRef),
    settlementCurrency: nullableString(record.settlementCurrency),
    subjectId: requiredStringField(
      record.subjectId,
      `${prefix}.subjectId`,
      blockers,
      `submitted-private-exchange-rate-subject-${index + 1}`,
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

  const input: MoralTradePrivateExchangeRateEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    privateExchangeRateRequired: booleanField(value.privateExchangeRateRequired),
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

  return normalized || `private-exchange-rate-enforce:${fallbackHash}`;
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
  const contract = getMoralTradePrivateExchangeRateContract();
  const contractValidation = validateMoralTradePrivateExchangeRateContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      privateExchangeRateGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_private_exchange_rate_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid private exchange-rate enforcement input creates no enforcement record and cannot authorize draft preview, matching, lock, clearing, payment capture, reliance, public metric publication, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "private_exchange_rate_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited private exchange-rate enforcement creates no enforcement record and cannot authorize draft preview, matching, lock, clearing, payment capture, reliance, public metric publication, or release promotion.",
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

  const contract = getMoralTradePrivateExchangeRateContract();
  const contractValidation = validateMoralTradePrivateExchangeRateContract(contract);
  const evaluation = evaluateMoralTradePrivateExchangeRate(normalized.input);
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
    privateExchangeRateGateStatus:
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
          table: "moral_trade_private_exchange_rate_enforcement_records",
        },
        fallback:
          "Private exchange-rate enforcement was evaluated but not recorded because Supabase is not configured; no draft preview, matching, lock, clearing, payment capture, reliance, public metric publication, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:private_exchange_rate_enforce",
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
          table: "moral_trade_private_exchange_rate_enforcement_records",
        },
        fallback:
          "Authentication is required before recording private exchange-rate enforcement. No draft preview, matching, lock, clearing, payment capture, reliance, public metric publication, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:private_exchange_rate_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_private_exchange_rate_enforcement_records")
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
          table: "moral_trade_private_exchange_rate_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: PrivateExchangeRateEnforcementInsert = {
    active_quote_record_count: evaluation.activeQuoteRecordCount,
    affected_participant_quote_count: evaluation.affectedParticipantQuoteCount,
    blocker_codes: evaluation.blockers,
    clearing_run_allowed_bool: false,
    contract_version: contract.version,
    draft_preview_allowed_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    match_candidate_generation_allowed_bool: false,
    matched_trade_lock_allowed_bool: false,
    owner_profile_id: user.id,
    payment_capture_allowed_bool: false,
    privacy_safe_record_count: evaluation.privacySafeRecordCount,
    private_exchange_rate_required_bool: evaluation.privateExchangeRateRequired,
    public_metric_publication_allowed_bool: false,
    public_price_blocker_count: evaluation.publicPriceBlockerCount,
    record_count: normalized.input.records.length,
    release_gate_promotion_allowed_bool: false,
    reliance_allowed_bool: false,
    required_affected_participant_count: evaluation.requiredAffectedParticipantCount,
    reviewed_record_count: evaluation.reviewedRecordCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_PRIVATE_EXCHANGE_RATE_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_private_exchange_rate_enforcement_records")
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
          table: "moral_trade_private_exchange_rate_enforcement_records",
        },
        fallback:
          "The private exchange-rate enforcement result could not be recorded. No draft preview, matching, lock, clearing, payment capture, reliance, public metric publication, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:private_exchange_rate_enforce",
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
        table: "moral_trade_private_exchange_rate_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
