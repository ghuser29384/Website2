import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_PILOT_EVIDENCE_VALIDATOR_VERSION,
  evaluateMoralTradePilotEvidence,
  getMoralTradePilotEvidenceContract,
  validateMoralTradePilotEvidenceContract,
  type MoralTradePilotEvidenceEvaluationInput,
  type MoralTradePilotEvidencePolicyStatus,
  type MoralTradePilotEvidenceRecord,
  type MoralTradePilotEvidenceResultState,
  type MoralTradePilotEvidenceSuccessMetric,
  type MoralTradePilotEvidenceTrack,
  type MoralTradePilotEvidenceTransition,
  type MoralTradePilotEvidenceType,
} from "@/lib/moral-trade/pilot-evidence";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1_200;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 48;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradePilotEvidenceTransition>([
  "donation_offset_payable_promotion",
  "pledge_swap_reliance_promotion",
  "capped_real_money_release",
  "public_metric_release",
  "release_gate_promotion",
]);
const PILOT_TRACKS = new Set<MoralTradePilotEvidenceTrack>([
  "donation_offset",
  "pledge_swap",
  "combined_market_pilot",
]);
const EVIDENCE_TYPES = new Set<MoralTradePilotEvidenceType>([
  "agent_based_market_simulation",
  "historical_replay_simulation",
  "adversarial_red_team_review",
  "fraud_abuse_red_team_review",
  "participant_comprehension_drill",
  "operational_game_day",
]);
const SUCCESS_METRICS = new Set<MoralTradePilotEvidenceSuccessMetric>([
  "matched_volume",
  "safety_incident_rate",
  "privacy_leak_rate",
  "dispute_rate",
  "false_positive_block_rate",
  "manual_review_sla",
  "participant_comprehension",
  "rollback_recovery_time",
]);
const POLICY_STATUSES = new Set<MoralTradePilotEvidencePolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const RESULT_STATES = new Set<MoralTradePilotEvidenceResultState>([
  "draft",
  "under_review",
  "passed",
  "blocked",
  "paused",
  "rollback_required",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "checkedAt",
  "evidenceRequired",
  "records",
  "transition",
]);
const RECORD_KEYS = new Set([
  "criteriaPublishedAt",
  "evidenceTypes",
  "matchedVolumeOnly",
  "pauseCriteria",
  "pilotTrack",
  "policyRef",
  "policyStatus",
  "preRegisteredCriteriaHash",
  "recordId",
  "redTeamEvidenceHash",
  "redTeamFindingCount",
  "releaseStage",
  "replayRunCount",
  "resultState",
  "reviewerDecisionRef",
  "rollbackCriteria",
  "scaleUpCriteria",
  "simulationEvidenceHash",
  "successMetrics",
  "unresolvedCriticalFindingCount",
  "updatedAt",
]);

type PilotEvidenceEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_pilot_evidence_enforcement_records"]["Insert"];

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

function nullableHashField(value: unknown, key: string, blockers: string[]) {
  const normalized = nullableString(value);

  if (normalized !== null && !HASH_PATTERN.test(normalized)) {
    blockers.push(`${key}: sha256 hash is required when provided`);
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

function enumArrayField<T extends string>(
  value: unknown,
  allowed: Set<T>,
  key: string,
  blockers: string[],
) {
  if (!Array.isArray(value)) {
    blockers.push(`${key}: array is required`);

    return [] as T[];
  }

  const normalized: T[] = [];

  for (const [index, entry] of value.entries()) {
    const candidate = stringField(entry);

    if (allowed.has(candidate as T)) {
      normalized.push(candidate as T);
    } else {
      blockers.push(`${key}.${index}: unsupported value`);
    }
  }

  return normalized;
}

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported pilot-evidence enforcement key`);
}

function normalizeRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradePilotEvidenceRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.records.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, prefix));
  }

  return {
    criteriaPublishedAt: nullableString(record.criteriaPublishedAt),
    evidenceTypes: enumArrayField(
      record.evidenceTypes,
      EVIDENCE_TYPES,
      `${prefix}.evidenceTypes`,
      blockers,
    ),
    matchedVolumeOnly: booleanField(record.matchedVolumeOnly),
    pauseCriteria: requiredStringField(
      record.pauseCriteria,
      `${prefix}.pauseCriteria`,
      blockers,
    ),
    pilotTrack: enumField(
      record.pilotTrack,
      PILOT_TRACKS,
      "donation_offset",
      `${prefix}.pilotTrack`,
      blockers,
      true,
    ),
    policyRef: requiredStringField(
      record.policyRef,
      `${prefix}.policyRef`,
      blockers,
      `submitted-pilot-evidence-policy-${index + 1}`,
    ),
    policyStatus: enumField(
      record.policyStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policyStatus`,
      blockers,
      true,
    ),
    preRegisteredCriteriaHash: nullableHashField(
      record.preRegisteredCriteriaHash,
      `${prefix}.preRegisteredCriteriaHash`,
      blockers,
    ),
    recordId: requiredStringField(
      record.recordId,
      `${prefix}.recordId`,
      blockers,
      `submitted-pilot-evidence-record-${index + 1}`,
    ),
    redTeamEvidenceHash: nullableHashField(
      record.redTeamEvidenceHash,
      `${prefix}.redTeamEvidenceHash`,
      blockers,
    ),
    redTeamFindingCount: nonNegativeIntegerField(
      record.redTeamFindingCount,
      `${prefix}.redTeamFindingCount`,
      blockers,
    ),
    releaseStage: requiredStringField(
      record.releaseStage,
      `${prefix}.releaseStage`,
      blockers,
    ),
    replayRunCount: nonNegativeIntegerField(
      record.replayRunCount,
      `${prefix}.replayRunCount`,
      blockers,
    ),
    resultState: enumField(
      record.resultState,
      RESULT_STATES,
      "under_review",
      `${prefix}.resultState`,
      blockers,
      true,
    ),
    reviewerDecisionRef: nullableString(record.reviewerDecisionRef),
    rollbackCriteria: requiredStringField(
      record.rollbackCriteria,
      `${prefix}.rollbackCriteria`,
      blockers,
    ),
    scaleUpCriteria: requiredStringField(
      record.scaleUpCriteria,
      `${prefix}.scaleUpCriteria`,
      blockers,
    ),
    simulationEvidenceHash: nullableHashField(
      record.simulationEvidenceHash,
      `${prefix}.simulationEvidenceHash`,
      blockers,
    ),
    successMetrics: enumArrayField(
      record.successMetrics,
      SUCCESS_METRICS,
      `${prefix}.successMetrics`,
      blockers,
    ),
    unresolvedCriticalFindingCount: nonNegativeIntegerField(
      record.unresolvedCriticalFindingCount,
      `${prefix}.unresolvedCriticalFindingCount`,
      blockers,
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

  const input: MoralTradePilotEvidenceEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    evidenceRequired: booleanField(value.evidenceRequired),
    records: Array.isArray(value.records)
      ? value.records
          .slice(0, MAX_RECORDS)
          .map((entry, index) => normalizeRecord(entry, index, blockers))
      : [],
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "release_gate_promotion",
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

  return normalized || `pilot-evidence-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    cappedRealMoneyReleaseAllowed: false,
    donationOffsetPayablePromotionAllowed: false,
    pledgeSwapReliancePromotionAllowed: false,
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
  const contract = getMoralTradePilotEvidenceContract();
  const contractValidation = validateMoralTradePilotEvidenceContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      pilotEvidenceGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_pilot_evidence_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid pilot-evidence enforcement input creates no enforcement record and cannot authorize donation-offset payable promotion, pledge-swap reliance promotion, capped real-money release, public metric publication, or release-gate promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "pilot_evidence_enforce");
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited pilot-evidence enforcement creates no enforcement record and cannot authorize donation-offset payable promotion, pledge-swap reliance promotion, capped real-money release, public metric publication, or release-gate promotion.",
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

  const contract = getMoralTradePilotEvidenceContract();
  const contractValidation = validateMoralTradePilotEvidenceContract(contract);
  const evaluation = evaluateMoralTradePilotEvidence(normalized.input);
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
    pilotEvidenceGateStatus:
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
          table: "moral_trade_pilot_evidence_enforcement_records",
        },
        fallback:
          "Pilot-evidence enforcement was evaluated but not recorded because Supabase is not configured; no donation-offset payable promotion, pledge-swap reliance promotion, capped real-money release, public metric publication, or release-gate promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:pilot_evidence_enforce"],
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
          table: "moral_trade_pilot_evidence_enforcement_records",
        },
        fallback:
          "Authentication is required before recording pilot-evidence enforcement. No donation-offset payable promotion, pledge-swap reliance promotion, capped real-money release, public metric publication, or release-gate promotion state changed.",
        blockers: [...blockers, "authentication_required:pilot_evidence_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_pilot_evidence_enforcement_records")
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
          table: "moral_trade_pilot_evidence_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: PilotEvidenceEnforcementInsert = {
    blocker_codes: evaluation.blockers,
    blocker_count: evaluation.blockerCount,
    capped_real_money_release_allowed_bool: false,
    contract_version: contract.version,
    donation_offset_payable_promotion_allowed_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    evidence_required_bool: evaluation.evidenceRequired,
    idempotency_key: idempotencyKey,
    owner_profile_id: user.id,
    passing_record_count: evaluation.passingRecordCount,
    pledge_swap_reliance_promotion_allowed_bool: false,
    public_metric_publication_allowed_bool: false,
    record_count: normalized.input.records.length,
    red_team_evidence_count: evaluation.redTeamEvidenceCount,
    release_gate_promotion_allowed_bool: false,
    reviewed_record_count: evaluation.reviewedRecordCount,
    simulation_evidence_count: evaluation.simulationEvidenceCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_PILOT_EVIDENCE_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_pilot_evidence_enforcement_records")
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
          table: "moral_trade_pilot_evidence_enforcement_records",
        },
        fallback:
          "The pilot-evidence enforcement result could not be recorded. No donation-offset payable promotion, pledge-swap reliance promotion, capped real-money release, public metric publication, or release-gate promotion state changed.",
        blockers: [...blockers, "database_insert_failed:pilot_evidence_enforce"],
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
        table: "moral_trade_pilot_evidence_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
