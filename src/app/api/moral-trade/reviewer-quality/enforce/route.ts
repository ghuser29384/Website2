import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_REVIEWER_QUALITY_VALIDATOR_VERSION,
  evaluateMoralTradeReviewerQuality,
  getMoralTradeReviewerQualityContract,
  validateMoralTradeReviewerQualityContract,
  type MoralTradeReviewQualityAuditRecord,
  type MoralTradeReviewerAuthorizationStatus,
  type MoralTradeReviewerConflictStatus,
  type MoralTradeReviewerDecisionState,
  type MoralTradeReviewerQualityDecisionRecord,
  type MoralTradeReviewerQualityEvaluationInput,
  type MoralTradeReviewerQualityPolicyRecord,
  type MoralTradeReviewerQualityPolicySnapshotStatus,
  type MoralTradeReviewerQualityReviewType,
  type MoralTradeReviewerQualityStatus,
} from "@/lib/moral-trade/reviewer-quality";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1_200;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_POLICIES = 32;
const MAX_DECISIONS = 96;
const MAX_AUDITS = 64;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "audits",
  "checkedAt",
  "decisions",
  "policies",
  "reviewType",
]);
const POLICY_KEYS = new Set([
  "auditSamplingRequired",
  "authorizationRequired",
  "calibrationRequired",
  "conflictCheckRequired",
  "defaultApprovalProhibited",
  "maxDecisionAgeDays",
  "policyHash",
  "policyId",
  "policySnapshotStatus",
  "policyVersion",
  "reviewSpeedTargetCreatesDefaultApproval",
  "reviewType",
  "reviewedAt",
  "secondReviewRequired",
  "supersededBy",
]);
const DECISION_KEYS = new Set([
  "auditStatus",
  "calibrationStatus",
  "conflictStatus",
  "decidedAt",
  "decisionHash",
  "decisionId",
  "decisionState",
  "defaultApprovalDetected",
  "expiresAt",
  "neutralPanelRef",
  "policyRef",
  "reviewQualityAuditRefs",
  "reviewSpeedOverrideDetected",
  "reviewType",
  "reviewerAuthorizationStatus",
  "reviewerIdHash",
  "reviewerRole",
  "secondReviewStatus",
  "subjectId",
  "subjectType",
  "supersededBy",
]);
const AUDIT_KEYS = new Set([
  "auditHash",
  "auditId",
  "auditStatus",
  "auditedAt",
  "calibrationFailureCount",
  "defaultApprovalDetected",
  "expiresAt",
  "outOfScopeDecisionCount",
  "overturnCount",
  "policyRef",
  "reviewType",
  "reviewerIdHash",
  "sampledDecisionCount",
  "supersededBy",
  "unresolvedConflictCount",
]);
const QUALITY_STATUSES = new Set<MoralTradeReviewerQualityStatus>([
  "passed",
  "not_required_for_stage",
  "missing",
  "under_review",
  "failed",
  "stale",
  "superseded",
]);
const AUTHORIZATION_STATUSES = new Set<MoralTradeReviewerAuthorizationStatus>([
  "authorized",
  "not_required_for_stage",
  "missing",
  "stale",
  "out_of_scope",
  "suspended",
  "superseded",
]);
const CONFLICT_STATUSES = new Set<MoralTradeReviewerConflictStatus>([
  "none_declared",
  "disclosed_nonblocking",
  "not_required_for_stage",
  "missing",
  "unresolved",
  "conflicted",
  "superseded",
]);
const DECISION_STATES = new Set<MoralTradeReviewerDecisionState>([
  "approved",
  "blocked",
  "needs_changes",
  "recused",
  "superseded",
]);
const POLICY_STATUSES = new Set<MoralTradeReviewerQualityPolicySnapshotStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);

type ReviewerQualityEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_reviewer_quality_enforcement_records"]["Insert"];

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
  allowed: Iterable<T>,
  fallback: T,
  key: string,
  blockers: string[],
  required = false,
) {
  const normalized = stringField(value);
  const allowedSet = allowed instanceof Set ? allowed : new Set(allowed);

  if (allowedSet.has(normalized as T)) {
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
    blockers.push(`${key}: string array is required`);

    return [];
  }

  return value.map((entry, index) => {
    const normalized = stringField(entry);

    if (!normalized) {
      blockers.push(`${key}.${index}: non-empty string is required`);
    }

    return normalized;
  }).filter(Boolean);
}

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported reviewer-quality enforcement key`);
}

function reviewTypes() {
  return getMoralTradeReviewerQualityContract().reviewTypes;
}

function normalizePolicy(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeReviewerQualityPolicyRecord {
  const policy = isRecord(value) ? value : {};
  const prefix = `evaluationInput.policies.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(policy, POLICY_KEYS, prefix));
  }

  return {
    auditSamplingRequired: booleanField(
      policy.auditSamplingRequired,
      `${prefix}.auditSamplingRequired`,
      blockers,
    ),
    authorizationRequired: booleanField(
      policy.authorizationRequired,
      `${prefix}.authorizationRequired`,
      blockers,
    ),
    calibrationRequired: booleanField(
      policy.calibrationRequired,
      `${prefix}.calibrationRequired`,
      blockers,
    ),
    conflictCheckRequired: booleanField(
      policy.conflictCheckRequired,
      `${prefix}.conflictCheckRequired`,
      blockers,
    ),
    defaultApprovalProhibited: booleanField(
      policy.defaultApprovalProhibited,
      `${prefix}.defaultApprovalProhibited`,
      blockers,
    ),
    maxDecisionAgeDays: nonNegativeIntegerField(
      policy.maxDecisionAgeDays,
      `${prefix}.maxDecisionAgeDays`,
      blockers,
    ),
    policyHash: requiredHashField(policy.policyHash, `${prefix}.policyHash`, blockers),
    policyId: requiredStringField(
      policy.policyId,
      `${prefix}.policyId`,
      blockers,
      `submitted-reviewer-quality-policy-${index + 1}`,
    ),
    policySnapshotStatus: enumField<MoralTradeReviewerQualityPolicySnapshotStatus>(
      policy.policySnapshotStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policySnapshotStatus`,
      blockers,
      true,
    ),
    policyVersion: requiredStringField(
      policy.policyVersion,
      `${prefix}.policyVersion`,
      blockers,
    ),
    reviewSpeedTargetCreatesDefaultApproval: booleanField(
      policy.reviewSpeedTargetCreatesDefaultApproval,
      `${prefix}.reviewSpeedTargetCreatesDefaultApproval`,
      blockers,
    ),
    reviewType: enumField<MoralTradeReviewerQualityReviewType>(
      policy.reviewType,
      reviewTypes(),
      "evidence_acceptance",
      `${prefix}.reviewType`,
      blockers,
      true,
    ),
    reviewedAt: requiredStringField(policy.reviewedAt, `${prefix}.reviewedAt`, blockers),
    secondReviewRequired: booleanField(
      policy.secondReviewRequired,
      `${prefix}.secondReviewRequired`,
      blockers,
    ),
    supersededBy: nullableString(policy.supersededBy),
  };
}

function normalizeDecision(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeReviewerQualityDecisionRecord {
  const decision = isRecord(value) ? value : {};
  const prefix = `evaluationInput.decisions.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(decision, DECISION_KEYS, prefix));
  }

  return {
    auditStatus: enumField<MoralTradeReviewerQualityStatus>(
      decision.auditStatus,
      QUALITY_STATUSES,
      "missing",
      `${prefix}.auditStatus`,
      blockers,
      true,
    ),
    calibrationStatus: enumField<MoralTradeReviewerQualityStatus>(
      decision.calibrationStatus,
      QUALITY_STATUSES,
      "missing",
      `${prefix}.calibrationStatus`,
      blockers,
      true,
    ),
    conflictStatus: enumField<MoralTradeReviewerConflictStatus>(
      decision.conflictStatus,
      CONFLICT_STATUSES,
      "missing",
      `${prefix}.conflictStatus`,
      blockers,
      true,
    ),
    decidedAt: requiredStringField(decision.decidedAt, `${prefix}.decidedAt`, blockers),
    decisionHash: requiredHashField(
      decision.decisionHash,
      `${prefix}.decisionHash`,
      blockers,
    ),
    decisionId: requiredStringField(
      decision.decisionId,
      `${prefix}.decisionId`,
      blockers,
      `submitted-reviewer-quality-decision-${index + 1}`,
    ),
    decisionState: enumField<MoralTradeReviewerDecisionState>(
      decision.decisionState,
      DECISION_STATES,
      "needs_changes",
      `${prefix}.decisionState`,
      blockers,
      true,
    ),
    defaultApprovalDetected: booleanField(
      decision.defaultApprovalDetected,
      `${prefix}.defaultApprovalDetected`,
      blockers,
    ),
    expiresAt: nullableString(decision.expiresAt),
    neutralPanelRef: nullableString(decision.neutralPanelRef),
    policyRef: requiredStringField(decision.policyRef, `${prefix}.policyRef`, blockers),
    reviewQualityAuditRefs: stringArrayField(
      decision.reviewQualityAuditRefs,
      `${prefix}.reviewQualityAuditRefs`,
      blockers,
    ),
    reviewSpeedOverrideDetected: booleanField(
      decision.reviewSpeedOverrideDetected,
      `${prefix}.reviewSpeedOverrideDetected`,
      blockers,
    ),
    reviewType: enumField<MoralTradeReviewerQualityReviewType>(
      decision.reviewType,
      reviewTypes(),
      "evidence_acceptance",
      `${prefix}.reviewType`,
      blockers,
      true,
    ),
    reviewerAuthorizationStatus: enumField<MoralTradeReviewerAuthorizationStatus>(
      decision.reviewerAuthorizationStatus,
      AUTHORIZATION_STATUSES,
      "missing",
      `${prefix}.reviewerAuthorizationStatus`,
      blockers,
      true,
    ),
    reviewerIdHash: requiredHashField(
      decision.reviewerIdHash,
      `${prefix}.reviewerIdHash`,
      blockers,
    ),
    reviewerRole: requiredStringField(
      decision.reviewerRole,
      `${prefix}.reviewerRole`,
      blockers,
    ),
    secondReviewStatus: enumField<MoralTradeReviewerQualityStatus>(
      decision.secondReviewStatus,
      QUALITY_STATUSES,
      "missing",
      `${prefix}.secondReviewStatus`,
      blockers,
      true,
    ),
    subjectId: requiredStringField(
      decision.subjectId,
      `${prefix}.subjectId`,
      blockers,
      `submitted-reviewer-quality-subject-${index + 1}`,
    ),
    subjectType: requiredStringField(
      decision.subjectType,
      `${prefix}.subjectType`,
      blockers,
      "review_subject",
    ),
    supersededBy: nullableString(decision.supersededBy),
  };
}

function normalizeAudit(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeReviewQualityAuditRecord {
  const audit = isRecord(value) ? value : {};
  const prefix = `evaluationInput.audits.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(audit, AUDIT_KEYS, prefix));
  }

  return {
    auditHash: requiredHashField(audit.auditHash, `${prefix}.auditHash`, blockers),
    auditId: requiredStringField(
      audit.auditId,
      `${prefix}.auditId`,
      blockers,
      `submitted-reviewer-quality-audit-${index + 1}`,
    ),
    auditStatus: enumField<MoralTradeReviewerQualityStatus>(
      audit.auditStatus,
      QUALITY_STATUSES,
      "missing",
      `${prefix}.auditStatus`,
      blockers,
      true,
    ),
    auditedAt: requiredStringField(audit.auditedAt, `${prefix}.auditedAt`, blockers),
    calibrationFailureCount: nonNegativeIntegerField(
      audit.calibrationFailureCount,
      `${prefix}.calibrationFailureCount`,
      blockers,
    ),
    defaultApprovalDetected: booleanField(
      audit.defaultApprovalDetected,
      `${prefix}.defaultApprovalDetected`,
      blockers,
    ),
    expiresAt: nullableString(audit.expiresAt),
    outOfScopeDecisionCount: nonNegativeIntegerField(
      audit.outOfScopeDecisionCount,
      `${prefix}.outOfScopeDecisionCount`,
      blockers,
    ),
    overturnCount: nonNegativeIntegerField(
      audit.overturnCount,
      `${prefix}.overturnCount`,
      blockers,
    ),
    policyRef: requiredStringField(audit.policyRef, `${prefix}.policyRef`, blockers),
    reviewType: enumField<MoralTradeReviewerQualityReviewType>(
      audit.reviewType,
      reviewTypes(),
      "evidence_acceptance",
      `${prefix}.reviewType`,
      blockers,
      true,
    ),
    reviewerIdHash: requiredHashField(
      audit.reviewerIdHash,
      `${prefix}.reviewerIdHash`,
      blockers,
    ),
    sampledDecisionCount: nonNegativeIntegerField(
      audit.sampledDecisionCount,
      `${prefix}.sampledDecisionCount`,
      blockers,
    ),
    supersededBy: nullableString(audit.supersededBy),
    unresolvedConflictCount: nonNegativeIntegerField(
      audit.unresolvedConflictCount,
      `${prefix}.unresolvedConflictCount`,
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

  if (Array.isArray(value.policies) && value.policies.length > MAX_POLICIES) {
    blockers.push(`evaluationInput.policies: at most ${MAX_POLICIES} policies are supported`);
  }

  if (Array.isArray(value.decisions) && value.decisions.length > MAX_DECISIONS) {
    blockers.push(`evaluationInput.decisions: at most ${MAX_DECISIONS} decisions are supported`);
  }

  if (Array.isArray(value.audits) && value.audits.length > MAX_AUDITS) {
    blockers.push(`evaluationInput.audits: at most ${MAX_AUDITS} audits are supported`);
  }

  const input: MoralTradeReviewerQualityEvaluationInput = {
    audits: Array.isArray(value.audits)
      ? value.audits
          .slice(0, MAX_AUDITS)
          .map((entry, index) => normalizeAudit(entry, index, blockers))
      : [],
    checkedAt: stringField(value.checkedAt) || undefined,
    decisions: Array.isArray(value.decisions)
      ? value.decisions
          .slice(0, MAX_DECISIONS)
          .map((entry, index) => normalizeDecision(entry, index, blockers))
      : [],
    policies: Array.isArray(value.policies)
      ? value.policies
          .slice(0, MAX_POLICIES)
          .map((entry, index) => normalizePolicy(entry, index, blockers))
      : [],
    reviewType: enumField<MoralTradeReviewerQualityReviewType>(
      value.reviewType,
      reviewTypes(),
      "evidence_acceptance",
      "evaluationInput.reviewType",
      blockers,
      true,
    ),
  };

  if (!Array.isArray(value.audits)) {
    blockers.push("evaluationInput.audits: array is required");
  }

  if (!Array.isArray(value.decisions)) {
    blockers.push("evaluationInput.decisions: array is required");
  }

  if (!Array.isArray(value.policies)) {
    blockers.push("evaluationInput.policies: array is required");
  }

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value).slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `reviewer-quality-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    appealResolutionAllowed: false,
    blockerOverrideAllowed: false,
    evidenceAcceptanceAllowed: false,
    impactClaimPublicationAllowed: false,
    incidentClosureAllowed: false,
    matchingClearingAllowed: false,
    payoutReleaseAllowed: false,
    privacyDisclosureAllowed: false,
    publicMetricReleaseAllowed: false,
    recipientDestinationVerificationAllowed: false,
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
  const contract = getMoralTradeReviewerQualityContract();
  const contractValidation = validateMoralTradeReviewerQualityContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      reviewerQualityGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_reviewer_quality_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid reviewer-quality enforcement input creates no enforcement record and cannot authorize clearing, release gates, recipient verification, privacy disclosure, evidence acceptance, impact publication, appeal resolution, incident closure, payout release, blocker override, public metrics, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "reviewer_quality_enforce");
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited reviewer-quality enforcement creates no enforcement record and cannot authorize clearing, release gates, recipient verification, privacy disclosure, evidence acceptance, impact publication, appeal resolution, incident closure, payout release, blocker override, public metrics, or release promotion.",
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

  const contract = getMoralTradeReviewerQualityContract();
  const contractValidation = validateMoralTradeReviewerQualityContract(contract);
  const evaluation = evaluateMoralTradeReviewerQuality(normalized.input);
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
    reviewerQualityGateStatus: evaluation.status === "pass" ? "non_blocking" : "blocked",
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
          table: "moral_trade_reviewer_quality_enforcement_records",
        },
        fallback:
          "Reviewer-quality enforcement was evaluated but not recorded because Supabase is not configured; no clearing, release gate, recipient verification, privacy disclosure, evidence acceptance, impact publication, appeal resolution, incident closure, payout release, blocker override, public metric, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:reviewer_quality_enforce"],
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
          table: "moral_trade_reviewer_quality_enforcement_records",
        },
        fallback:
          "Authentication is required before recording reviewer-quality enforcement. No clearing, release gate, recipient verification, privacy disclosure, evidence acceptance, impact publication, appeal resolution, incident closure, payout release, blocker override, public metric, or release-promotion state changed.",
        blockers: [...blockers, "authentication_required:reviewer_quality_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_reviewer_quality_enforcement_records")
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
          table: "moral_trade_reviewer_quality_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: ReviewerQualityEnforcementInsert = {
    appeal_resolution_allowed_bool: false,
    audit_count: evaluation.auditCount,
    blocker_codes: blockers,
    blocker_count: blockers.length,
    blocker_override_allowed_bool: false,
    contract_version: contract.version,
    decision_count: normalized.input.decisions.length,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    evidence_acceptance_allowed_bool: false,
    idempotency_key: idempotencyKey,
    impact_claim_publication_allowed_bool: false,
    incident_closure_allowed_bool: false,
    matching_clearing_allowed_bool: false,
    owner_profile_id: user.id,
    payout_release_allowed_bool: false,
    policy_count: normalized.input.policies.length,
    privacy_disclosure_allowed_bool: false,
    public_metric_release_allowed_bool: false,
    recipient_destination_verification_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    required_decision_count: evaluation.requiredDecisionCount,
    required_policy_count: evaluation.requiredPolicyCount,
    review_type: evaluation.reviewType,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_REVIEWER_QUALITY_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_reviewer_quality_enforcement_records")
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
          table: "moral_trade_reviewer_quality_enforcement_records",
        },
        fallback:
          "The reviewer-quality enforcement result could not be recorded. No clearing, release gate, recipient verification, privacy disclosure, evidence acceptance, impact publication, appeal resolution, incident closure, payout release, blocker override, public metric, or release-promotion state changed.",
        blockers: [...blockers, "database_insert_failed:reviewer_quality_enforce"],
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
        table: "moral_trade_reviewer_quality_enforcement_records",
      },
    },
    "private_no_store",
  );
}
