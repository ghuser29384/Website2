import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_SENSITIVE_EVIDENCE_ATTESTATION_VALIDATOR_VERSION,
  evaluateMoralTradeSensitiveEvidenceAttestation,
  getMoralTradeSensitiveEvidenceAttestationContract,
  validateMoralTradeSensitiveEvidenceAttestationContract,
  type MoralTradeSensitiveEvidenceAttestationClaimType,
  type MoralTradeSensitiveEvidenceAttestationEvaluationInput,
  type MoralTradeSensitiveEvidenceAttestationPolicyStatus,
  type MoralTradeSensitiveEvidenceAttestationRecord,
  type MoralTradeSensitiveEvidenceAttestationResultState,
  type MoralTradeSensitiveEvidenceAttestationSubjectType,
  type MoralTradeSensitiveEvidenceAttestationTransition,
  type MoralTradeSensitiveEvidenceConfidentialityReviewStatus,
  type MoralTradeSensitiveEvidenceDisclosureMode,
  type MoralTradeSensitiveEvidencePathType,
  type MoralTradeSensitiveEvidencePrivacyGrantStatus,
} from "@/lib/moral-trade/sensitive-evidence-attestations";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1_200;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 48;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeSensitiveEvidenceAttestationTransition>([
  "evidence_review",
  "counterparty_preview",
  "matched_trade_lock",
  "payment_capture",
  "payout_release",
  "reliance",
  "public_metric_publication",
  "challenge_response",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradeSensitiveEvidenceAttestationSubjectType>([
  "evidence_record",
  "impact_claim",
  "matched_trade_lock_proposal",
  "payout_milestone",
  "recipient_destination",
  "noncompensable_blocker_assessment",
  "appeal_case",
  "disclosure_decision",
]);
const EVIDENCE_PATH_TYPES = new Set<MoralTradeSensitiveEvidencePathType>([
  "private_receipt",
  "identity_artifact",
  "legal_capacity_artifact",
  "payment_destination_artifact",
  "source_note",
  "private_message",
  "protected_trait_evidence",
  "safety_report",
  "reviewer_note",
  "provider_record",
  "raw_private_artifact",
]);
const CLAIM_TYPES = new Set<MoralTradeSensitiveEvidenceAttestationClaimType>([
  "payment_receipt_verified",
  "destination_verified",
  "eligibility_verified",
  "baseline_scope_verified",
  "completion_evidence_verified",
  "impact_evidence_verified",
  "safety_review_non_blocking",
  "confidentiality_review_non_blocking",
  "uncertainty_present",
  "manual_review",
]);
const DISCLOSURE_MODES = new Set<MoralTradeSensitiveEvidenceDisclosureMode>([
  "attestation_only",
  "counterparty_claim_typed_summary",
  "reviewer_raw_artifact",
  "privacy_grant_broader_disclosure",
  "public_suppressed",
]);
const PRIVACY_GRANT_STATUSES = new Set<MoralTradeSensitiveEvidencePrivacyGrantStatus>([
  "not_required",
  "granted_current",
  "missing",
  "expired",
  "revoked",
  "scope_mismatch",
]);
const CONFIDENTIALITY_REVIEW_STATUSES =
  new Set<MoralTradeSensitiveEvidenceConfidentialityReviewStatus>([
    "passed",
    "not_required_for_stage",
    "missing",
    "under_review",
    "failed",
    "stale",
    "superseded",
  ]);
const RESULT_STATES = new Set<MoralTradeSensitiveEvidenceAttestationResultState>([
  "draft",
  "attested",
  "insufficient",
  "challenged",
  "under_review",
  "blocked",
  "superseded",
]);
const POLICY_STATUSES = new Set<MoralTradeSensitiveEvidenceAttestationPolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "attestationRequired",
  "checkedAt",
  "records",
  "transition",
]);
const RECORD_KEYS = new Set([
  "attestationPolicyRef",
  "attestationResultHash",
  "challengeRoute",
  "claimType",
  "confidentialityReviewStatus",
  "counterpartyReceivesRawArtifact",
  "createdAt",
  "disclosureMode",
  "evidencePathType",
  "policyStatus",
  "privacyGrantStatus",
  "publicRawArtifact",
  "rawPrivateArtifactRefHash",
  "recordId",
  "resultState",
  "reviewerDecisionRef",
  "scopeStatement",
  "subjectId",
  "subjectType",
  "uncertaintyStatement",
  "updatedAt",
]);

type SensitiveEvidenceAttestationEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_sensitive_evidence_attestation_enforcement_records"]["Insert"];

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
    .map((key) => `${prefix}.${key}: unsupported sensitive-evidence attestation enforcement key`);
}

function normalizeRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeSensitiveEvidenceAttestationRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.records.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, prefix));
  }

  return {
    attestationPolicyRef: requiredStringField(
      record.attestationPolicyRef,
      `${prefix}.attestationPolicyRef`,
      blockers,
      `submitted-sensitive-evidence-attestation-policy-${index + 1}`,
    ),
    attestationResultHash: nullableHashField(
      record.attestationResultHash,
      `${prefix}.attestationResultHash`,
      blockers,
    ),
    challengeRoute: requiredStringField(
      record.challengeRoute,
      `${prefix}.challengeRoute`,
      blockers,
    ),
    claimType: enumField(
      record.claimType,
      CLAIM_TYPES,
      "manual_review",
      `${prefix}.claimType`,
      blockers,
      true,
    ),
    confidentialityReviewStatus: enumField(
      record.confidentialityReviewStatus,
      CONFIDENTIALITY_REVIEW_STATUSES,
      "missing",
      `${prefix}.confidentialityReviewStatus`,
      blockers,
      true,
    ),
    counterpartyReceivesRawArtifact: booleanField(
      record.counterpartyReceivesRawArtifact,
    ),
    createdAt: stringField(record.createdAt),
    disclosureMode: enumField(
      record.disclosureMode,
      DISCLOSURE_MODES,
      "public_suppressed",
      `${prefix}.disclosureMode`,
      blockers,
      true,
    ),
    evidencePathType: enumField(
      record.evidencePathType,
      EVIDENCE_PATH_TYPES,
      "raw_private_artifact",
      `${prefix}.evidencePathType`,
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
    privacyGrantStatus: enumField(
      record.privacyGrantStatus,
      PRIVACY_GRANT_STATUSES,
      "missing",
      `${prefix}.privacyGrantStatus`,
      blockers,
      true,
    ),
    publicRawArtifact: booleanField(record.publicRawArtifact),
    rawPrivateArtifactRefHash: nullableHashField(
      record.rawPrivateArtifactRefHash,
      `${prefix}.rawPrivateArtifactRefHash`,
      blockers,
    ),
    recordId: requiredStringField(
      record.recordId,
      `${prefix}.recordId`,
      blockers,
      `submitted-sensitive-evidence-attestation-record-${index + 1}`,
    ),
    resultState: enumField(
      record.resultState,
      RESULT_STATES,
      "draft",
      `${prefix}.resultState`,
      blockers,
      true,
    ),
    reviewerDecisionRef: nullableString(record.reviewerDecisionRef),
    scopeStatement: requiredStringField(
      record.scopeStatement,
      `${prefix}.scopeStatement`,
      blockers,
    ),
    subjectId: requiredStringField(
      record.subjectId,
      `${prefix}.subjectId`,
      blockers,
      `submitted-sensitive-evidence-subject-${index + 1}`,
    ),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "evidence_record",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    uncertaintyStatement: requiredStringField(
      record.uncertaintyStatement,
      `${prefix}.uncertaintyStatement`,
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

  const input: MoralTradeSensitiveEvidenceAttestationEvaluationInput = {
    attestationRequired: booleanField(value.attestationRequired),
    checkedAt: stringField(value.checkedAt) || undefined,
    records: Array.isArray(value.records)
      ? value.records
          .slice(0, MAX_RECORDS)
          .map((entry, index) => normalizeRecord(entry, index, blockers))
      : [],
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "evidence_review",
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

  return normalized || `sensitive-evidence-attestation-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    challengeResponseAllowed: false,
    counterpartyPreviewAllowed: false,
    evidenceReviewAllowed: false,
    matchedTradeLockAllowed: false,
    paymentCaptureAllowed: false,
    payoutReleaseAllowed: false,
    publicMetricPublicationAllowed: false,
    rawArtifactDisclosureAllowed: false,
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
  const contract = getMoralTradeSensitiveEvidenceAttestationContract();
  const contractValidation =
    validateMoralTradeSensitiveEvidenceAttestationContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      sensitiveEvidenceAttestationGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_sensitive_evidence_attestation_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid sensitive-evidence attestation enforcement input creates no enforcement record and cannot authorize evidence review, counterparty preview, lock, payment capture, payout release, reliance, public metric publication, challenge response, raw-artifact disclosure, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "sensitive_evidence_attestation_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited sensitive-evidence attestation enforcement creates no enforcement record and cannot authorize evidence review, counterparty preview, lock, payment capture, payout release, reliance, public metric publication, challenge response, raw-artifact disclosure, or release promotion.",
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

  const contract = getMoralTradeSensitiveEvidenceAttestationContract();
  const contractValidation =
    validateMoralTradeSensitiveEvidenceAttestationContract(contract);
  const evaluation =
    evaluateMoralTradeSensitiveEvidenceAttestation(normalized.input);
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
    sensitiveEvidenceAttestationGateStatus:
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
          table: "moral_trade_sensitive_evidence_attestation_enforcement_records",
        },
        fallback:
          "Sensitive-evidence attestation enforcement was evaluated but not recorded because Supabase is not configured; no evidence review, counterparty preview, lock, payment capture, payout release, reliance, public metric publication, challenge response, raw-artifact disclosure, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:sensitive_evidence_attestation_enforce",
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
          table: "moral_trade_sensitive_evidence_attestation_enforcement_records",
        },
        fallback:
          "Authentication is required before recording sensitive-evidence attestation enforcement. No evidence review, counterparty preview, lock, payment capture, payout release, reliance, public metric publication, challenge response, raw-artifact disclosure, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:sensitive_evidence_attestation_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_sensitive_evidence_attestation_enforcement_records")
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
          table: "moral_trade_sensitive_evidence_attestation_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: SensitiveEvidenceAttestationEnforcementInsert = {
    attestation_required_bool: evaluation.attestationRequired,
    attested_record_count: evaluation.attestedRecordCount,
    blocker_codes: evaluation.blockers,
    challenge_response_allowed_bool: false,
    contract_version: contract.version,
    counterparty_preview_allowed_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    evidence_review_allowed_bool: false,
    idempotency_key: idempotencyKey,
    matched_trade_lock_allowed_bool: false,
    owner_profile_id: user.id,
    payment_capture_allowed_bool: false,
    payout_release_allowed_bool: false,
    privacy_preserving_disclosure_count:
      evaluation.privacyPreservingDisclosureCount,
    public_metric_publication_allowed_bool: false,
    raw_artifact_disclosure_allowed_bool: false,
    raw_artifact_disclosure_blocker_count:
      evaluation.rawArtifactDisclosureBlockerCount,
    record_count: normalized.input.records.length,
    release_gate_promotion_allowed_bool: false,
    reliance_allowed_bool: false,
    reviewed_record_count: evaluation.reviewedRecordCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_SENSITIVE_EVIDENCE_ATTESTATION_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_sensitive_evidence_attestation_enforcement_records")
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
          table: "moral_trade_sensitive_evidence_attestation_enforcement_records",
        },
        fallback:
          "The sensitive-evidence attestation enforcement result could not be recorded. No evidence review, counterparty preview, lock, payment capture, payout release, reliance, public metric publication, challenge response, raw-artifact disclosure, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:sensitive_evidence_attestation_enforce",
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
        table: "moral_trade_sensitive_evidence_attestation_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
