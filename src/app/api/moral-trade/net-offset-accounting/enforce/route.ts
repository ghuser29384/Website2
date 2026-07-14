import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_NET_OFFSET_ACCOUNTING_VALIDATOR_VERSION,
  evaluateMoralTradeNetOffsetAccounting,
  getMoralTradeNetOffsetAccountingContract,
  validateMoralTradeNetOffsetAccountingContract,
  type MoralTradeBaselineOpposedActionType,
  type MoralTradeNetOffsetAccountingEvaluationInput,
  type MoralTradeNetOffsetAccountingRecord,
  type MoralTradeNetOffsetAccountingSubjectType,
  type MoralTradeNetOffsetAccountingTransition,
  type MoralTradeNetOffsetPolicyStatus,
  type MoralTradeNetOffsetState,
  type MoralTradeResidualActionPolicy,
  type MoralTradeSubstitutionChannelReviewState,
} from "@/lib/moral-trade/net-offset-accounting";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 48;
const MAX_ARRAY_ITEMS = 48;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeNetOffsetAccountingTransition>([
  "draft_preview",
  "match_candidate_generation",
  "matched_trade_lock",
  "clearing_run",
  "payment_capture",
  "public_metric_publication",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradeNetOffsetAccountingSubjectType>([
  "offset_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "negative_commitment_scope",
  "evidence_record",
]);
const BASELINE_ACTION_TYPES = new Set<MoralTradeBaselineOpposedActionType>([
  "donation",
  "abstention",
  "advocacy",
  "purchase",
  "service_use",
  "other",
  "unknown",
]);
const RESIDUAL_ACTION_POLICIES = new Set<MoralTradeResidualActionPolicy>([
  "allowed_if_disclosed",
  "blocks_clearance",
  "manual_review",
  "not_applicable",
]);
const SUBSTITUTION_STATES = new Set<MoralTradeSubstitutionChannelReviewState>([
  "not_required",
  "under_review",
  "non_blocking",
  "blocked",
  "manual_review",
  "superseded",
]);
const NET_OFFSET_STATES = new Set<MoralTradeNetOffsetState>([
  "draft",
  "previewed",
  "locked",
  "verified",
  "challenged",
  "blocked",
  "superseded",
]);
const POLICY_STATUSES = new Set<MoralTradeNetOffsetPolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "accountingRequired",
  "checkedAt",
  "records",
  "transition",
]);
const RECORD_KEYS = new Set([
  "baselineOpposedActionType",
  "baselineOpposedActionUnits",
  "baselineOpposedAmountCents",
  "compromiseTransferAmountCents",
  "createdAt",
  "evidenceClaimRefs",
  "evidenceStandardRef",
  "matchedCanceledActionUnits",
  "matchedCanceledAmountCents",
  "netOffsetAccountingPolicyRef",
  "netOffsetState",
  "participantIdHash",
  "policyStatus",
  "publicParticipantIdentity",
  "publicPrivateBaselineDetails",
  "publicReviewerNotes",
  "publicSubstitutionChannelDetails",
  "recordId",
  "residualActionPolicy",
  "residualOpposedActionUnits",
  "residualOpposedAmountCents",
  "reviewerDecisionRef",
  "sponsorOrMatchAmountCents",
  "subjectId",
  "subjectType",
  "substitutionChannelReviewState",
  "updatedAt",
]);

type NetOffsetAccountingEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_net_offset_accounting_enforcement_records"]["Insert"];

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

function integerField(
  value: unknown,
  key: string,
  blockers: string[],
  fallback = 0,
) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (value !== undefined) {
    blockers.push(`${key}: integer >= 0 is required`);
  }

  return fallback;
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
    .map((key) => `${prefix}.${key}: unsupported net-offset accounting enforcement key`);
}

function normalizeRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeNetOffsetAccountingRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.records.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, prefix));
  }

  return {
    baselineOpposedActionType: enumField(
      record.baselineOpposedActionType,
      BASELINE_ACTION_TYPES,
      "unknown",
      `${prefix}.baselineOpposedActionType`,
      blockers,
      true,
    ),
    baselineOpposedActionUnits: integerField(
      record.baselineOpposedActionUnits,
      `${prefix}.baselineOpposedActionUnits`,
      blockers,
    ),
    baselineOpposedAmountCents: integerField(
      record.baselineOpposedAmountCents,
      `${prefix}.baselineOpposedAmountCents`,
      blockers,
    ),
    compromiseTransferAmountCents: integerField(
      record.compromiseTransferAmountCents,
      `${prefix}.compromiseTransferAmountCents`,
      blockers,
    ),
    createdAt: stringField(record.createdAt),
    evidenceClaimRefs: stringArrayField(
      record.evidenceClaimRefs,
      `${prefix}.evidenceClaimRefs`,
      blockers,
    ),
    evidenceStandardRef: nullableString(record.evidenceStandardRef),
    matchedCanceledActionUnits: integerField(
      record.matchedCanceledActionUnits,
      `${prefix}.matchedCanceledActionUnits`,
      blockers,
    ),
    matchedCanceledAmountCents: integerField(
      record.matchedCanceledAmountCents,
      `${prefix}.matchedCanceledAmountCents`,
      blockers,
    ),
    netOffsetAccountingPolicyRef: requiredStringField(
      record.netOffsetAccountingPolicyRef,
      `${prefix}.netOffsetAccountingPolicyRef`,
      blockers,
      `submitted-net-offset-policy-${index + 1}`,
    ),
    netOffsetState: enumField(
      record.netOffsetState,
      NET_OFFSET_STATES,
      "draft",
      `${prefix}.netOffsetState`,
      blockers,
      true,
    ),
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
    publicParticipantIdentity: booleanField(record.publicParticipantIdentity),
    publicPrivateBaselineDetails: booleanField(
      record.publicPrivateBaselineDetails,
    ),
    publicReviewerNotes: booleanField(record.publicReviewerNotes),
    publicSubstitutionChannelDetails: booleanField(
      record.publicSubstitutionChannelDetails,
    ),
    recordId: requiredStringField(
      record.recordId,
      `${prefix}.recordId`,
      blockers,
      `submitted-net-offset-record-${index + 1}`,
    ),
    residualActionPolicy: enumField(
      record.residualActionPolicy,
      RESIDUAL_ACTION_POLICIES,
      "manual_review",
      `${prefix}.residualActionPolicy`,
      blockers,
      true,
    ),
    residualOpposedActionUnits: integerField(
      record.residualOpposedActionUnits,
      `${prefix}.residualOpposedActionUnits`,
      blockers,
    ),
    residualOpposedAmountCents: integerField(
      record.residualOpposedAmountCents,
      `${prefix}.residualOpposedAmountCents`,
      blockers,
    ),
    reviewerDecisionRef: nullableString(record.reviewerDecisionRef),
    sponsorOrMatchAmountCents: integerField(
      record.sponsorOrMatchAmountCents,
      `${prefix}.sponsorOrMatchAmountCents`,
      blockers,
    ),
    subjectId: requiredStringField(
      record.subjectId,
      `${prefix}.subjectId`,
      blockers,
      `submitted-net-offset-subject-${index + 1}`,
    ),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "offset_offer",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    substitutionChannelReviewState: enumField(
      record.substitutionChannelReviewState,
      SUBSTITUTION_STATES,
      "under_review",
      `${prefix}.substitutionChannelReviewState`,
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

  const input: MoralTradeNetOffsetAccountingEvaluationInput = {
    accountingRequired: booleanField(value.accountingRequired),
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
  };

  if (!Array.isArray(value.records)) {
    blockers.push("evaluationInput.records: array is required");
  }

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `net-offset-accounting-enforce:${fallbackHash}`;
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
  const contract = getMoralTradeNetOffsetAccountingContract();
  const contractValidation =
    validateMoralTradeNetOffsetAccountingContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      netOffsetAccountingGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_net_offset_accounting_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid net-offset accounting enforcement input creates no enforcement record and cannot authorize draft preview, match-candidate generation, matched-trade lock, clearing, payment capture, public metrics, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "net_offset_accounting_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited net-offset accounting enforcement creates no enforcement record and cannot authorize draft preview, match-candidate generation, matched-trade lock, clearing, payment capture, public metrics, or release promotion.",
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

  const contract = getMoralTradeNetOffsetAccountingContract();
  const contractValidation =
    validateMoralTradeNetOffsetAccountingContract(contract);
  const evaluation = evaluateMoralTradeNetOffsetAccounting(normalized.input);
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
    netOffsetAccountingGateStatus:
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
          table: "moral_trade_net_offset_accounting_enforcement_records",
        },
        fallback:
          "Net-offset accounting enforcement was evaluated but not recorded because Supabase is not configured; no draft preview, match-candidate generation, matched-trade lock, clearing, payment capture, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:net_offset_accounting_enforce",
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
          table: "moral_trade_net_offset_accounting_enforcement_records",
        },
        fallback:
          "Authentication is required before recording net-offset accounting enforcement. No draft preview, match-candidate generation, matched-trade lock, clearing, payment capture, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:net_offset_accounting_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_net_offset_accounting_enforcement_records")
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
          table: "moral_trade_net_offset_accounting_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: NetOffsetAccountingEnforcementInsert = {
    accounting_required_bool: evaluation.accountingRequired,
    blocker_codes: evaluation.blockers,
    clearing_run_allowed_bool: false,
    contract_version: contract.version,
    draft_preview_allowed_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    gross_transfer_amount_cents: evaluation.grossTransferAmountCents,
    idempotency_key: idempotencyKey,
    match_candidate_generation_allowed_bool: false,
    matched_trade_lock_allowed_bool: false,
    net_canceled_amount_cents: evaluation.netCanceledAmountCents,
    net_metric_eligible_record_count: evaluation.netMetricEligibleRecordCount,
    owner_profile_id: user.id,
    payment_capture_allowed_bool: false,
    privacy_safe_record_count: evaluation.privacySafeRecordCount,
    public_metric_publication_allowed_bool: false,
    record_count: normalized.input.records.length,
    release_gate_promotion_allowed_bool: false,
    residual_opposed_amount_cents: evaluation.residualOpposedAmountCents,
    reviewed_record_count: evaluation.reviewedRecordCount,
    sponsor_or_match_amount_cents: evaluation.sponsorOrMatchAmountCents,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_NET_OFFSET_ACCOUNTING_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_net_offset_accounting_enforcement_records")
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
          table: "moral_trade_net_offset_accounting_enforcement_records",
        },
        fallback:
          "The net-offset accounting enforcement result could not be recorded. No draft preview, match-candidate generation, matched-trade lock, clearing, payment capture, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:net_offset_accounting_enforce",
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
        table: "moral_trade_net_offset_accounting_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
