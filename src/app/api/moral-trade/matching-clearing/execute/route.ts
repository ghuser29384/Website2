import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_MATCHING_CLEARING_VALIDATOR_VERSION,
  evaluateMoralTradeMatchingClearing,
  getMoralTradeMatchingClearingContract,
  validateMoralTradeMatchingClearingContract,
  type MoralTradeMatchedTradeConfirmationState,
  type MoralTradeMatchedTradeLockProposalRecord,
  type MoralTradeMatchedTradeLockProposalStatus,
  type MoralTradeMatchedTradeLockProposalSubject,
  type MoralTradeMatchingClearingEvaluationInput,
  type MoralTradeMatchingClearingFlowType,
  type MoralTradeMatchingClearingRatioBoundsStatus,
  type MoralTradeMatchingClearingReviewStatus,
  type MoralTradeMatchingClearingRunRecord,
  type MoralTradeMatchingClearingRunStatus,
} from "@/lib/moral-trade/matching-clearing";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 600;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 12;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const EXECUTION_KINDS = new Set(["evaluation", "replay_check"] as const);
const FLOW_TYPES = new Set<MoralTradeMatchingClearingFlowType>([
  "donation_offset_batch",
  "pledge_swap_preview",
  "broad_match_candidate",
  "public_goods_round",
]);
const RUN_STATUSES = new Set<MoralTradeMatchingClearingRunStatus>([
  "draft",
  "dry_run",
  "reviewed",
  "blocked",
  "locked",
  "superseded",
  "expired",
]);
const REVIEW_STATUSES = new Set<MoralTradeMatchingClearingReviewStatus>([
  "passed",
  "not_required_for_stage",
  "missing",
  "under_review",
  "failed",
  "stale",
  "superseded",
]);
const PROPOSAL_STATUSES = new Set<MoralTradeMatchedTradeLockProposalStatus>([
  "draft",
  "participant_review",
  "confirmed",
  "locked",
  "declined",
  "expired",
  "superseded",
  "blocked",
]);
const PROPOSAL_SUBJECTS = new Set<MoralTradeMatchedTradeLockProposalSubject>([
  "donation_offset_batch",
  "pledge_swap_match",
  "broad_match_candidate",
  "public_goods_round",
]);
const RATIO_STATUSES = new Set<MoralTradeMatchingClearingRatioBoundsStatus>([
  "passed",
  "missing",
  "under_review",
  "failed",
  "out_of_bounds",
  "stale",
  "superseded",
]);
const CONFIRMATION_STATES = new Set<MoralTradeMatchedTradeConfirmationState>([
  "missing",
  "stale",
  "scope_mismatch",
  "passed",
  "not_required_for_stage",
]);
const REQUEST_KEYS = new Set([
  "evaluationInput",
  "executionKind",
  "idempotencyKey",
]);
const EVALUATION_INPUT_KEYS = new Set([
  "checkedAt",
  "flowType",
  "lockProposals",
  "requiresLockProposal",
  "requiresPayableTransition",
  "requiresRelianceBearingTransition",
  "runs",
]);
const RUN_KEYS = new Set([
  "algorithmVersion",
  "databaseOrderMatching",
  "deterministicAlgorithm",
  "excludedRecordsHash",
  "expiresAt",
  "flowType",
  "hiddenMatchReasoning",
  "inputBundleHash",
  "manualOverrideApproved",
  "manualOverrideUsed",
  "payableTransition",
  "privacyPolicySnapshotRef",
  "privateCounterpartyDataPublic",
  "relianceBearingTransition",
  "reproducibilityCheckStatus",
  "resultHash",
  "reviewedAt",
  "runHash",
  "runId",
  "runStatus",
  "stateInterpretationPolicyRef",
  "supersededBy",
]);
const PROPOSAL_KEYS = new Set([
  "atomicSettlementGroupRef",
  "baselineSnapshotHash",
  "clearingRatioBps",
  "commitmentReservationRef",
  "confirmationState",
  "counterpartyBucketHash",
  "destinationVerificationRef",
  "evidenceStandardHash",
  "exactTermsHash",
  "expiresAt",
  "fallbackTermsHash",
  "finalConfirmationRefs",
  "matchedVolumeHash",
  "matchingClearingRunRef",
  "privateCounterpartyDataPublic",
  "proposalHash",
  "proposalId",
  "proposalStatus",
  "proposalSubjectKind",
  "ratioBoundsStatus",
  "reviewedAt",
  "supersededBy",
]);

type ExecutionKind = "evaluation" | "replay_check";
type MatchingClearingExecutionInsert =
  Database["public"]["Tables"]["moral_trade_matching_clearing_execution_records"]["Insert"];

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

function nullableHash(value: unknown) {
  const normalized = stringField(value);

  return HASH_PATTERN.test(normalized) ? normalized : null;
}

function numberField(value: unknown, fallback: number, max = 1_000_000) {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(0, Math.round(numeric)));
}

function booleanField(value: unknown) {
  return value === true;
}

function enumField<T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T,
  key: string,
  blockers: string[],
) {
  const normalized = stringField(value);

  if (allowed.has(normalized as T)) {
    return normalized as T;
  }

  if (normalized) {
    blockers.push(`${key}: unsupported value`);
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
    .map((key) => `${prefix}.${key}: unsupported matching-clearing execution key`);
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => stringField(entry))
    .filter(Boolean)
    .slice(0, MAX_RECORDS);
}

function normalizeRun(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeMatchingClearingRunRecord {
  const record = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    blockers.push(`evaluationInput.runs.${index}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RUN_KEYS, `evaluationInput.runs.${index}`));
  }

  return {
    algorithmVersion: stringField(record.algorithmVersion),
    databaseOrderMatching: booleanField(record.databaseOrderMatching),
    deterministicAlgorithm: record.deterministicAlgorithm !== false,
    excludedRecordsHash: nullableHash(record.excludedRecordsHash),
    expiresAt: stringField(record.expiresAt) || null,
    flowType: enumField(
      record.flowType,
      FLOW_TYPES,
      "donation_offset_batch",
      `evaluationInput.runs.${index}.flowType`,
      blockers,
    ),
    hiddenMatchReasoning: booleanField(record.hiddenMatchReasoning),
    inputBundleHash: nullableHash(record.inputBundleHash),
    manualOverrideApproved: booleanField(record.manualOverrideApproved),
    manualOverrideUsed: booleanField(record.manualOverrideUsed),
    payableTransition: booleanField(record.payableTransition),
    privacyPolicySnapshotRef: stringField(record.privacyPolicySnapshotRef) || null,
    privateCounterpartyDataPublic: booleanField(record.privateCounterpartyDataPublic),
    relianceBearingTransition: booleanField(record.relianceBearingTransition),
    reproducibilityCheckStatus: enumField(
      record.reproducibilityCheckStatus,
      REVIEW_STATUSES,
      "missing",
      `evaluationInput.runs.${index}.reproducibilityCheckStatus`,
      blockers,
    ),
    resultHash: nullableHash(record.resultHash),
    reviewedAt: stringField(record.reviewedAt) || null,
    runHash: nullableHash(record.runHash) ?? "",
    runId: stringField(record.runId, `submitted-run-${index + 1}`),
    runStatus: enumField(
      record.runStatus,
      RUN_STATUSES,
      "draft",
      `evaluationInput.runs.${index}.runStatus`,
      blockers,
    ),
    stateInterpretationPolicyRef: stringField(record.stateInterpretationPolicyRef) || null,
    supersededBy: stringField(record.supersededBy) || null,
  };
}

function normalizeProposal(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeMatchedTradeLockProposalRecord {
  const record = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    blockers.push(`evaluationInput.lockProposals.${index}: object is required`);
  } else {
    blockers.push(
      ...unsupportedKeys(record, PROPOSAL_KEYS, `evaluationInput.lockProposals.${index}`),
    );
  }

  return {
    atomicSettlementGroupRef: stringField(record.atomicSettlementGroupRef),
    baselineSnapshotHash: nullableHash(record.baselineSnapshotHash),
    clearingRatioBps: numberField(record.clearingRatioBps, 0),
    commitmentReservationRef: stringField(record.commitmentReservationRef),
    confirmationState: enumField(
      record.confirmationState,
      CONFIRMATION_STATES,
      "missing",
      `evaluationInput.lockProposals.${index}.confirmationState`,
      blockers,
    ),
    counterpartyBucketHash: nullableHash(record.counterpartyBucketHash),
    destinationVerificationRef: stringField(record.destinationVerificationRef) || null,
    evidenceStandardHash: nullableHash(record.evidenceStandardHash),
    exactTermsHash: nullableHash(record.exactTermsHash),
    expiresAt: stringField(record.expiresAt) || null,
    fallbackTermsHash: nullableHash(record.fallbackTermsHash),
    finalConfirmationRefs: stringArray(record.finalConfirmationRefs),
    matchedVolumeHash: nullableHash(record.matchedVolumeHash),
    matchingClearingRunRef: stringField(record.matchingClearingRunRef),
    privateCounterpartyDataPublic: booleanField(record.privateCounterpartyDataPublic),
    proposalHash: nullableHash(record.proposalHash) ?? "",
    proposalId: stringField(record.proposalId, `submitted-proposal-${index + 1}`),
    proposalStatus: enumField(
      record.proposalStatus,
      PROPOSAL_STATUSES,
      "draft",
      `evaluationInput.lockProposals.${index}.proposalStatus`,
      blockers,
    ),
    proposalSubjectKind: enumField(
      record.proposalSubjectKind,
      PROPOSAL_SUBJECTS,
      "donation_offset_batch",
      `evaluationInput.lockProposals.${index}.proposalSubjectKind`,
      blockers,
    ),
    ratioBoundsStatus: enumField(
      record.ratioBoundsStatus,
      RATIO_STATUSES,
      "missing",
      `evaluationInput.lockProposals.${index}.ratioBoundsStatus`,
      blockers,
    ),
    reviewedAt: stringField(record.reviewedAt) || null,
    supersededBy: stringField(record.supersededBy) || null,
  };
}

function normalizeExecutionKind(value: unknown, blockers: string[]): ExecutionKind {
  return enumField(
    value,
    EXECUTION_KINDS,
    "evaluation",
    "executionKind",
    blockers,
  );
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

  const runs = Array.isArray(value.runs)
    ? value.runs.slice(0, MAX_RECORDS).map((entry, index) => normalizeRun(entry, index, blockers))
    : [];
  const lockProposals = Array.isArray(value.lockProposals)
    ? value.lockProposals
        .slice(0, MAX_RECORDS)
        .map((entry, index) => normalizeProposal(entry, index, blockers))
    : [];
  const input: MoralTradeMatchingClearingEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    flowType: enumField(
      value.flowType,
      FLOW_TYPES,
      "donation_offset_batch",
      "evaluationInput.flowType",
      blockers,
    ),
    lockProposals,
    requiresLockProposal: booleanField(value.requiresLockProposal),
    requiresPayableTransition: booleanField(value.requiresPayableTransition),
    requiresRelianceBearingTransition: booleanField(
      value.requiresRelianceBearingTransition,
    ),
    runs,
  };

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `matching-clearing-execute:${fallbackHash}`;
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
  const contract = getMoralTradeMatchingClearingContract();
  const contractValidation = validateMoralTradeMatchingClearingContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      createsLockProposal: false,
      payableTransitionAllowed: false,
      relianceBearingTransitionAllowed: false,
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_matching_clearing_execution_records",
      },
      contractValidation,
      fallback:
        "Invalid matching-clearing execution input creates no execution record and cannot create locks, authorize payment, authorize reliance, or publish metrics.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "matching_clearing_execute");
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited matching-clearing execution creates no execution record and cannot create locks, authorize payment, authorize reliance, or publish metrics.",
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
  const kindBlockers: string[] = [];
  const executionKind = normalizeExecutionKind(body.executionKind, kindBlockers);
  const normalized = normalizeEvaluationInput(body.evaluationInput);

  if (!normalized.input || requestBlockers.length || normalized.blockers.length || kindBlockers.length) {
    return invalidRequestResponse({
      checkedAt,
      blockers: [...requestBlockers, ...kindBlockers, ...normalized.blockers],
    });
  }

  const contract = getMoralTradeMatchingClearingContract();
  const contractValidation = validateMoralTradeMatchingClearingContract(contract);
  const evaluation = evaluateMoralTradeMatchingClearing(normalized.input);
  const evaluationHash = hashJson({
    contractVersion: contract.version,
    evaluation,
    executionKind,
    normalizedInput: normalized.input,
  });
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey, evaluationHash);
  const deterministicReplay =
    executionKind === "replay_check" &&
    normalized.input.runs.length > 0 &&
    normalized.input.runs.every(
      (run) =>
        run.deterministicAlgorithm &&
        run.reproducibilityCheckStatus === "passed" &&
        run.inputBundleHash &&
        run.resultHash,
    );
  const replayInputHash = normalized.input.runs.find((run) => run.inputBundleHash)?.inputBundleHash ?? null;
  const replayResultHash = normalized.input.runs.find((run) => run.resultHash)?.resultHash ?? null;
  const blockers = [...contractValidation.blockers];
  const basePayload = {
    checkedAt,
    contractVersion: contract.version,
    createsLockProposal: false,
    payableTransitionAllowed: false,
    relianceBearingTransitionAllowed: false,
    executionKind,
    evaluation,
    evaluationHash,
    deterministicReplay,
    replayInputHash,
    replayResultHash,
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
          table: "moral_trade_matching_clearing_execution_records",
        },
        fallback:
          "Matching-clearing was evaluated but not recorded because Supabase is not configured; no lock, payment, reliance, or public metric state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:matching_clearing_execute",
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
          table: "moral_trade_matching_clearing_execution_records",
        },
        fallback:
          "Authentication is required before recording a matching-clearing execution. No lock, payment, reliance, or public metric state changed.",
        blockers: [
          ...blockers,
          "authentication_required:matching_clearing_execute",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_matching_clearing_execution_records")
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
          table: "moral_trade_matching_clearing_execution_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: MatchingClearingExecutionInsert = {
    blocker_codes: evaluation.blockers,
    contract_version: contract.version,
    creates_lock_proposal_bool: false,
    deterministic_replay_bool: deterministicReplay,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    execution_input_json: normalized.input as unknown as Json,
    execution_kind: executionKind,
    execution_status: evaluation.status,
    flow_type: evaluation.flowType,
    idempotency_key: idempotencyKey,
    lock_proposal_count: evaluation.lockProposalCount,
    owner_profile_id: user.id,
    payable_transition_allowed_bool: false,
    reliance_bearing_transition_allowed_bool: false,
    replay_input_hash: replayInputHash,
    replay_result_hash: replayResultHash,
    requires_lock_proposal_bool: normalized.input.requiresLockProposal,
    requires_payable_transition_bool: normalized.input.requiresPayableTransition,
    requires_reliance_bearing_transition_bool:
      normalized.input.requiresRelianceBearingTransition,
    run_count: evaluation.runCount,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_MATCHING_CLEARING_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_matching_clearing_execution_records")
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
          table: "moral_trade_matching_clearing_execution_records",
        },
        fallback:
          "The matching-clearing execution could not be recorded. No lock, payment, reliance, or public metric state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:matching_clearing_execute",
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
        table: "moral_trade_matching_clearing_execution_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
