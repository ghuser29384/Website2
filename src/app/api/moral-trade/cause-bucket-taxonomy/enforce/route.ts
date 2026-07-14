import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_CAUSE_BUCKET_TAXONOMY_VALIDATOR_VERSION,
  evaluateMoralTradeCauseBucketTaxonomy,
  getMoralTradeCauseBucketTaxonomyContract,
  validateMoralTradeCauseBucketTaxonomyContract,
  type MoralTradeCauseBucketAssignmentConfidenceState,
  type MoralTradeCauseBucketAssignmentRecord,
  type MoralTradeCauseBucketAssignmentState,
  type MoralTradeCauseBucketAssignmentVisibility,
  type MoralTradeCauseBucketEvaluationInput,
  type MoralTradeCauseBucketReviewState,
  type MoralTradeCauseBucketSubjectType,
  type MoralTradeCauseBucketTaxonomyRecord,
  type MoralTradeCauseBucketTaxonomyState,
  type MoralTradeCauseBucketTaxonomyType,
  type MoralTradeCauseBucketTransition,
} from "@/lib/moral-trade/cause-bucket-taxonomy";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_TAXONOMIES = 12;
const MAX_ASSIGNMENTS = 48;
const MAX_ARRAY_ITEMS = 64;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeCauseBucketTransition>([
  "draft_preview",
  "match_candidate_generation",
  "matched_trade_lock",
  "clearing_run",
  "public_metric_publication",
  "release_gate_promotion",
]);
const TAXONOMY_TYPES = new Set<MoralTradeCauseBucketTaxonomyType>([
  "offered_cause",
  "opposed_cause",
  "compromise_destination",
  "action_bucket",
  "counterparty_bucket",
  "manual_review",
]);
const SUBJECT_TYPES = new Set<MoralTradeCauseBucketSubjectType>([
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "seed_template",
  "worked_example",
]);
const REVIEW_STATES = new Set<MoralTradeCauseBucketReviewState>([
  "not_required",
  "under_review",
  "non_blocking",
  "blocked",
  "manual_review",
  "superseded",
]);
const TAXONOMY_STATES = new Set<MoralTradeCauseBucketTaxonomyState>([
  "draft",
  "active",
  "deprecated",
  "superseded",
  "blocked",
]);
const ASSIGNMENT_CONFIDENCE_STATES =
  new Set<MoralTradeCauseBucketAssignmentConfidenceState>([
    "self_attested",
    "reviewer_normalized",
    "disputed",
    "blocked",
    "manual_review",
    "superseded",
  ]);
const ASSIGNMENT_VISIBILITY_STATES =
  new Set<MoralTradeCauseBucketAssignmentVisibility>([
    "participant_only",
    "reviewer_only",
    "counterparty_band_only",
    "public_coarse",
  ]);
const ASSIGNMENT_STATES = new Set<MoralTradeCauseBucketAssignmentState>([
  "draft",
  "previewed",
  "locked",
  "disputed",
  "superseded",
  "blocked",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "assignmentRequired",
  "assignments",
  "checkedAt",
  "taxonomies",
  "taxonomyRequired",
  "transition",
]);
const TAXONOMY_KEYS = new Set([
  "allowedBucketCodes",
  "bucketDefinitionHashes",
  "createdAt",
  "ideologyOrPsychologyInferenceProhibited",
  "inferredPsychologyAllowed",
  "pluralReviewerPanelRef",
  "policyVersion",
  "protectedTraitProxyAllowed",
  "protectedTraitProxyReviewState",
  "publicIdeologyLabel",
  "publicMoralRanking",
  "publicSummaryHash",
  "reviewerDecisionRef",
  "taxonomyId",
  "taxonomyState",
  "taxonomyType",
  "taxonomyVersionHash",
  "updatedAt",
]);
const ASSIGNMENT_KEYS = new Set([
  "affectsClearingEligibility",
  "affectsCounterpartyDistinctness",
  "affectsTradeClassification",
  "assignmentConfidenceState",
  "assignmentId",
  "assignmentState",
  "assignmentVisibility",
  "causeBucketTaxonomyRef",
  "createdAt",
  "participantIdHash",
  "participantSelectedBucketCodes",
  "participantVisibleDependencyNotice",
  "previewRenewalConfirmationRef",
  "publicDetailedBucketNarrative",
  "publicInferredIdeologyOrPsychology",
  "publicParticipantIdentity",
  "publicProtectedTraitFacts",
  "reviewerDecisionRef",
  "reviewerNormalizedBucketCodes",
  "subjectId",
  "subjectType",
  "taxonomyChangeMaterial",
  "taxonomyVersionHash",
  "updatedAt",
]);

type CauseBucketTaxonomyEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_cause_bucket_taxonomy_enforcement_records"]["Insert"];

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

function hashArrayField(value: unknown, key: string, blockers: string[]) {
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
      requiredHashField(entry, `${key}.${index}`, blockers),
    );
}

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported cause-bucket taxonomy enforcement key`);
}

function normalizeTaxonomy(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeCauseBucketTaxonomyRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.taxonomies.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, TAXONOMY_KEYS, prefix));
  }

  return {
    allowedBucketCodes: stringArrayField(
      record.allowedBucketCodes,
      `${prefix}.allowedBucketCodes`,
      blockers,
    ),
    bucketDefinitionHashes: hashArrayField(
      record.bucketDefinitionHashes,
      `${prefix}.bucketDefinitionHashes`,
      blockers,
    ),
    createdAt: stringField(record.createdAt),
    ideologyOrPsychologyInferenceProhibited: booleanField(
      record.ideologyOrPsychologyInferenceProhibited,
    ),
    inferredPsychologyAllowed: booleanField(record.inferredPsychologyAllowed),
    pluralReviewerPanelRef: requiredStringField(
      record.pluralReviewerPanelRef,
      `${prefix}.pluralReviewerPanelRef`,
      blockers,
      `submitted-cause-bucket-review-panel-${index + 1}`,
    ),
    policyVersion: requiredStringField(
      record.policyVersion,
      `${prefix}.policyVersion`,
      blockers,
      `submitted-cause-bucket-policy-${index + 1}`,
    ),
    protectedTraitProxyAllowed: booleanField(record.protectedTraitProxyAllowed),
    protectedTraitProxyReviewState: enumField(
      record.protectedTraitProxyReviewState,
      REVIEW_STATES,
      "under_review",
      `${prefix}.protectedTraitProxyReviewState`,
      blockers,
      true,
    ),
    publicIdeologyLabel: booleanField(record.publicIdeologyLabel),
    publicMoralRanking: booleanField(record.publicMoralRanking),
    publicSummaryHash: requiredHashField(
      record.publicSummaryHash,
      `${prefix}.publicSummaryHash`,
      blockers,
    ),
    reviewerDecisionRef: nullableString(record.reviewerDecisionRef),
    taxonomyId: requiredStringField(
      record.taxonomyId,
      `${prefix}.taxonomyId`,
      blockers,
      `submitted-cause-bucket-taxonomy-${index + 1}`,
    ),
    taxonomyState: enumField(
      record.taxonomyState,
      TAXONOMY_STATES,
      "draft",
      `${prefix}.taxonomyState`,
      blockers,
      true,
    ),
    taxonomyType: enumField(
      record.taxonomyType,
      TAXONOMY_TYPES,
      "manual_review",
      `${prefix}.taxonomyType`,
      blockers,
      true,
    ),
    taxonomyVersionHash: requiredHashField(
      record.taxonomyVersionHash,
      `${prefix}.taxonomyVersionHash`,
      blockers,
    ),
    updatedAt: stringField(record.updatedAt),
  };
}

function normalizeAssignment(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeCauseBucketAssignmentRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.assignments.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, ASSIGNMENT_KEYS, prefix));
  }

  return {
    affectsClearingEligibility: booleanField(record.affectsClearingEligibility),
    affectsCounterpartyDistinctness: booleanField(
      record.affectsCounterpartyDistinctness,
    ),
    affectsTradeClassification: booleanField(record.affectsTradeClassification),
    assignmentConfidenceState: enumField(
      record.assignmentConfidenceState,
      ASSIGNMENT_CONFIDENCE_STATES,
      "self_attested",
      `${prefix}.assignmentConfidenceState`,
      blockers,
      true,
    ),
    assignmentId: requiredStringField(
      record.assignmentId,
      `${prefix}.assignmentId`,
      blockers,
      `submitted-cause-bucket-assignment-${index + 1}`,
    ),
    assignmentState: enumField(
      record.assignmentState,
      ASSIGNMENT_STATES,
      "draft",
      `${prefix}.assignmentState`,
      blockers,
      true,
    ),
    assignmentVisibility: enumField(
      record.assignmentVisibility,
      ASSIGNMENT_VISIBILITY_STATES,
      "participant_only",
      `${prefix}.assignmentVisibility`,
      blockers,
      true,
    ),
    causeBucketTaxonomyRef: requiredStringField(
      record.causeBucketTaxonomyRef,
      `${prefix}.causeBucketTaxonomyRef`,
      blockers,
      `submitted-cause-bucket-taxonomy-${index + 1}`,
    ),
    createdAt: stringField(record.createdAt),
    participantIdHash: requiredHashField(
      record.participantIdHash,
      `${prefix}.participantIdHash`,
      blockers,
    ),
    participantSelectedBucketCodes: stringArrayField(
      record.participantSelectedBucketCodes,
      `${prefix}.participantSelectedBucketCodes`,
      blockers,
    ),
    participantVisibleDependencyNotice: booleanField(
      record.participantVisibleDependencyNotice,
    ),
    previewRenewalConfirmationRef: nullableString(
      record.previewRenewalConfirmationRef,
    ),
    publicDetailedBucketNarrative: booleanField(
      record.publicDetailedBucketNarrative,
    ),
    publicInferredIdeologyOrPsychology: booleanField(
      record.publicInferredIdeologyOrPsychology,
    ),
    publicParticipantIdentity: booleanField(record.publicParticipantIdentity),
    publicProtectedTraitFacts: booleanField(record.publicProtectedTraitFacts),
    reviewerDecisionRef: nullableString(record.reviewerDecisionRef),
    reviewerNormalizedBucketCodes: stringArrayField(
      record.reviewerNormalizedBucketCodes,
      `${prefix}.reviewerNormalizedBucketCodes`,
      blockers,
    ),
    subjectId: requiredStringField(
      record.subjectId,
      `${prefix}.subjectId`,
      blockers,
      `submitted-cause-bucket-subject-${index + 1}`,
    ),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "offset_offer",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    taxonomyChangeMaterial: booleanField(record.taxonomyChangeMaterial),
    taxonomyVersionHash: requiredHashField(
      record.taxonomyVersionHash,
      `${prefix}.taxonomyVersionHash`,
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

  if (Array.isArray(value.taxonomies) && value.taxonomies.length > MAX_TAXONOMIES) {
    blockers.push(
      `evaluationInput.taxonomies: at most ${MAX_TAXONOMIES} records are supported`,
    );
  }

  if (Array.isArray(value.assignments) && value.assignments.length > MAX_ASSIGNMENTS) {
    blockers.push(
      `evaluationInput.assignments: at most ${MAX_ASSIGNMENTS} records are supported`,
    );
  }

  const input: MoralTradeCauseBucketEvaluationInput = {
    assignmentRequired: booleanField(value.assignmentRequired),
    assignments: Array.isArray(value.assignments)
      ? value.assignments
          .slice(0, MAX_ASSIGNMENTS)
          .map((entry, index) => normalizeAssignment(entry, index, blockers))
      : [],
    checkedAt: stringField(value.checkedAt) || undefined,
    taxonomies: Array.isArray(value.taxonomies)
      ? value.taxonomies
          .slice(0, MAX_TAXONOMIES)
          .map((entry, index) => normalizeTaxonomy(entry, index, blockers))
      : [],
    taxonomyRequired: booleanField(value.taxonomyRequired),
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "draft_preview",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  if (!Array.isArray(value.taxonomies)) {
    blockers.push("evaluationInput.taxonomies: array is required");
  }

  if (!Array.isArray(value.assignments)) {
    blockers.push("evaluationInput.assignments: array is required");
  }

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `cause-bucket-taxonomy-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    clearingRunAllowed: false,
    draftPreviewAllowed: false,
    matchCandidateGenerationAllowed: false,
    matchedTradeLockAllowed: false,
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
  const contract = getMoralTradeCauseBucketTaxonomyContract();
  const contractValidation =
    validateMoralTradeCauseBucketTaxonomyContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      causeBucketTaxonomyGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_cause_bucket_taxonomy_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid cause-bucket taxonomy enforcement input creates no enforcement record and cannot authorize draft preview, match-candidate generation, matched-trade lock, clearing, public metrics, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "cause_bucket_taxonomy_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited cause-bucket taxonomy enforcement creates no enforcement record and cannot authorize draft preview, match-candidate generation, matched-trade lock, clearing, public metrics, or release promotion.",
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

  const contract = getMoralTradeCauseBucketTaxonomyContract();
  const contractValidation =
    validateMoralTradeCauseBucketTaxonomyContract(contract);
  const evaluation = evaluateMoralTradeCauseBucketTaxonomy(normalized.input);
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
    causeBucketTaxonomyGateStatus:
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
          table: "moral_trade_cause_bucket_taxonomy_enforcement_records",
        },
        fallback:
          "Cause-bucket taxonomy enforcement was evaluated but not recorded because Supabase is not configured; no draft preview, match-candidate generation, matched-trade lock, clearing, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:cause_bucket_taxonomy_enforce",
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
          table: "moral_trade_cause_bucket_taxonomy_enforcement_records",
        },
        fallback:
          "Authentication is required before recording cause-bucket taxonomy enforcement. No draft preview, match-candidate generation, matched-trade lock, clearing, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:cause_bucket_taxonomy_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_cause_bucket_taxonomy_enforcement_records")
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
          table: "moral_trade_cause_bucket_taxonomy_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: CauseBucketTaxonomyEnforcementInsert = {
    active_taxonomy_count: evaluation.activeTaxonomyCount,
    assignment_record_count: normalized.input.assignments.length,
    assignment_required_bool: evaluation.assignmentRequired,
    blocker_codes: evaluation.blockers,
    clearing_run_allowed_bool: false,
    contract_version: contract.version,
    draft_preview_allowed_bool: false,
    effect_safe_assignment_count: evaluation.effectSafeAssignmentCount,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    match_candidate_generation_allowed_bool: false,
    matched_trade_lock_allowed_bool: false,
    non_ranking_taxonomy_count: evaluation.nonRankingTaxonomyCount,
    owner_profile_id: user.id,
    privacy_safe_assignment_count: evaluation.privacySafeAssignmentCount,
    public_metric_publication_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    taxonomy_record_count: normalized.input.taxonomies.length,
    taxonomy_required_bool: evaluation.taxonomyRequired,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_CAUSE_BUCKET_TAXONOMY_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_cause_bucket_taxonomy_enforcement_records")
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
          table: "moral_trade_cause_bucket_taxonomy_enforcement_records",
        },
        fallback:
          "The cause-bucket taxonomy enforcement result could not be recorded. No draft preview, match-candidate generation, matched-trade lock, clearing, public metric, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:cause_bucket_taxonomy_enforce",
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
        table: "moral_trade_cause_bucket_taxonomy_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
