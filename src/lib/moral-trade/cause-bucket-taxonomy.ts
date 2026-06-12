export const MORAL_TRADE_CAUSE_BUCKET_TAXONOMY_CONTRACT_VERSION =
  "moral-trade-cause-bucket-taxonomy-v0.1-2026-06";
export const MORAL_TRADE_CAUSE_BUCKET_TAXONOMY_VALIDATOR_VERSION =
  "moral-trade-cause-bucket-taxonomy-validator-v0.1";

export type MoralTradeCauseBucketTransition =
  | "draft_preview"
  | "match_candidate_generation"
  | "matched_trade_lock"
  | "clearing_run"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeCauseBucketTaxonomyType =
  | "offered_cause"
  | "opposed_cause"
  | "compromise_destination"
  | "action_bucket"
  | "counterparty_bucket"
  | "manual_review";

export type MoralTradeCauseBucketSubjectType =
  | "offset_offer"
  | "pledge_swap_offer"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement"
  | "seed_template"
  | "worked_example";

export type MoralTradeCauseBucketReviewState =
  | "not_required"
  | "under_review"
  | "non_blocking"
  | "blocked"
  | "manual_review"
  | "superseded";

export type MoralTradeCauseBucketTaxonomyState =
  | "draft"
  | "active"
  | "deprecated"
  | "superseded"
  | "blocked";

export type MoralTradeCauseBucketAssignmentConfidenceState =
  | "self_attested"
  | "reviewer_normalized"
  | "disputed"
  | "blocked"
  | "manual_review"
  | "superseded";

export type MoralTradeCauseBucketAssignmentVisibility =
  | "participant_only"
  | "reviewer_only"
  | "counterparty_band_only"
  | "public_coarse";

export type MoralTradeCauseBucketAssignmentState =
  | "draft"
  | "previewed"
  | "locked"
  | "disputed"
  | "superseded"
  | "blocked";

export interface MoralTradeCauseBucketTaxonomyRecord {
  taxonomyId: string;
  policyVersion: string;
  taxonomyType: MoralTradeCauseBucketTaxonomyType;
  allowedBucketCodes: string[];
  bucketDefinitionHashes: string[];
  protectedTraitProxyReviewState: MoralTradeCauseBucketReviewState;
  ideologyOrPsychologyInferenceProhibited: boolean;
  pluralReviewerPanelRef: string;
  publicSummaryHash: string;
  taxonomyVersionHash: string;
  taxonomyState: MoralTradeCauseBucketTaxonomyState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
  publicMoralRanking: boolean;
  publicIdeologyLabel: boolean;
  protectedTraitProxyAllowed: boolean;
  inferredPsychologyAllowed: boolean;
}

export interface MoralTradeCauseBucketAssignmentRecord {
  assignmentId: string;
  subjectType: MoralTradeCauseBucketSubjectType;
  subjectId: string;
  participantIdHash: string;
  causeBucketTaxonomyRef: string;
  participantSelectedBucketCodes: string[];
  reviewerNormalizedBucketCodes: string[];
  assignmentConfidenceState: MoralTradeCauseBucketAssignmentConfidenceState;
  assignmentVisibility: MoralTradeCauseBucketAssignmentVisibility;
  affectsCounterpartyDistinctness: boolean;
  affectsTradeClassification: boolean;
  affectsClearingEligibility: boolean;
  assignmentState: MoralTradeCauseBucketAssignmentState;
  reviewerDecisionRef: string | null;
  taxonomyVersionHash: string;
  participantVisibleDependencyNotice: boolean;
  taxonomyChangeMaterial: boolean;
  previewRenewalConfirmationRef: string | null;
  createdAt: string;
  updatedAt: string;
  publicParticipantIdentity: boolean;
  publicDetailedBucketNarrative: boolean;
  publicProtectedTraitFacts: boolean;
  publicInferredIdeologyOrPsychology: boolean;
}

export interface MoralTradeCauseBucketEvaluationInput {
  transition: MoralTradeCauseBucketTransition;
  taxonomyRequired: boolean;
  assignmentRequired: boolean;
  checkedAt?: string;
  taxonomies: MoralTradeCauseBucketTaxonomyRecord[];
  assignments: MoralTradeCauseBucketAssignmentRecord[];
}

export interface MoralTradeCauseBucketEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeCauseBucketTransition;
  checkedAt: string;
  taxonomyRequired: boolean;
  assignmentRequired: boolean;
  activeTaxonomyCount: number;
  nonRankingTaxonomyCount: number;
  privacySafeAssignmentCount: number;
  effectSafeAssignmentCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeCauseBucketTransitionDefinition {
  key: MoralTradeCauseBucketTransition;
  label: string;
  requiresActiveTaxonomy: boolean;
  requiresReviewedAssignmentsWhenEffectBearing: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeCauseBucketCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeCauseBucketValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-cause-bucket-taxonomy-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeCauseBucketCheck[];
  blockers: string[];
}

export interface MoralTradeCauseBucketContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  nonRankingRule: string;
  materialChangeRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  taxonomyTypes: MoralTradeCauseBucketTaxonomyType[];
  subjectTypes: MoralTradeCauseBucketSubjectType[];
  reviewStates: MoralTradeCauseBucketReviewState[];
  taxonomyStates: MoralTradeCauseBucketTaxonomyState[];
  assignmentConfidenceStates: MoralTradeCauseBucketAssignmentConfidenceState[];
  assignmentVisibilityStates: MoralTradeCauseBucketAssignmentVisibility[];
  assignmentStates: MoralTradeCauseBucketAssignmentState[];
  transitionDefinitions: MoralTradeCauseBucketTransitionDefinition[];
  sampleEvaluations: MoralTradeCauseBucketEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const BUCKET_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const MAX_TAXONOMY_AGE_DAYS = 365;
const MAX_ASSIGNMENT_AGE_DAYS = 180;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_cause_bucket_taxonomies",
  "moral_trade_cause_bucket_assignments",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["cause_bucket_taxonomy"] as const;

const TAXONOMY_TYPES: MoralTradeCauseBucketTaxonomyType[] = [
  "offered_cause",
  "opposed_cause",
  "compromise_destination",
  "action_bucket",
  "counterparty_bucket",
  "manual_review",
];

const SUBJECT_TYPES: MoralTradeCauseBucketSubjectType[] = [
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "seed_template",
  "worked_example",
];

const REVIEW_STATES: MoralTradeCauseBucketReviewState[] = [
  "not_required",
  "under_review",
  "non_blocking",
  "blocked",
  "manual_review",
  "superseded",
];

const TAXONOMY_STATES: MoralTradeCauseBucketTaxonomyState[] = [
  "draft",
  "active",
  "deprecated",
  "superseded",
  "blocked",
];

const ASSIGNMENT_CONFIDENCE_STATES: MoralTradeCauseBucketAssignmentConfidenceState[] = [
  "self_attested",
  "reviewer_normalized",
  "disputed",
  "blocked",
  "manual_review",
  "superseded",
];

const ASSIGNMENT_VISIBILITY_STATES: MoralTradeCauseBucketAssignmentVisibility[] = [
  "participant_only",
  "reviewer_only",
  "counterparty_band_only",
  "public_coarse",
];

const ASSIGNMENT_STATES: MoralTradeCauseBucketAssignmentState[] = [
  "draft",
  "previewed",
  "locked",
  "disputed",
  "superseded",
  "blocked",
];

const TRANSITION_DEFINITIONS: MoralTradeCauseBucketTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresActiveTaxonomy: true,
    requiresReviewedAssignmentsWhenEffectBearing: false,
    userFacingBlockerCategory:
      "Cause buckets need a versioned taxonomy before they can shape a preview",
  },
  {
    key: "match_candidate_generation",
    label: "Match-candidate generation",
    requiresActiveTaxonomy: true,
    requiresReviewedAssignmentsWhenEffectBearing: true,
    userFacingBlockerCategory:
      "Cause-bucket assignments need review before they affect candidate distinctness",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresActiveTaxonomy: true,
    requiresReviewedAssignmentsWhenEffectBearing: true,
    userFacingBlockerCategory:
      "Cause-bucket assignments need renewed review before lock if they affect classification or counterparties",
  },
  {
    key: "clearing_run",
    label: "Clearing run",
    requiresActiveTaxonomy: true,
    requiresReviewedAssignmentsWhenEffectBearing: true,
    userFacingBlockerCategory:
      "Cause-bucket assignments cannot drive clearing under stale, disputed, or inferred labels",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresActiveTaxonomy: true,
    requiresReviewedAssignmentsWhenEffectBearing: true,
    userFacingBlockerCategory:
      "Public metrics cannot publish taxonomy-derived rankings or ideology labels",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresActiveTaxonomy: true,
    requiresReviewedAssignmentsWhenEffectBearing: true,
    userFacingBlockerCategory:
      "Release promotion requires cause-bucket taxonomy review evidence",
  },
];

const EFFECT_BEARING_ASSIGNMENT_STATES = new Set<MoralTradeCauseBucketAssignmentState>([
  "previewed",
  "locked",
]);

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeCauseBucketCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function hasValidHash(value: string | null) {
  return Boolean(value && HASH_PATTERN.test(value));
}

function hasMeaningfulText(value: string | null) {
  return Boolean(value && value.trim().length >= 3);
}

function daysBetween(olderIso: string, newerIso: string) {
  const older = Date.parse(olderIso);
  const newer = Date.parse(newerIso);

  if (!Number.isFinite(older) || !Number.isFinite(newer) || newer < older) {
    return Number.POSITIVE_INFINITY;
  }

  return (newer - older) / 86_400_000;
}

function hasValidBucketCode(value: string) {
  return BUCKET_CODE_PATTERN.test(value);
}

function unique(values: readonly string[]) {
  return new Set(values).size === values.length;
}

function isTaxonomyNonRanking(record: MoralTradeCauseBucketTaxonomyRecord) {
  return (
    !record.publicMoralRanking &&
    !record.publicIdeologyLabel &&
    !record.protectedTraitProxyAllowed &&
    !record.inferredPsychologyAllowed &&
    record.ideologyOrPsychologyInferenceProhibited
  );
}

function isAssignmentPrivacySafe(record: MoralTradeCauseBucketAssignmentRecord) {
  return (
    !record.publicParticipantIdentity &&
    !record.publicDetailedBucketNarrative &&
    !record.publicProtectedTraitFacts &&
    !record.publicInferredIdeologyOrPsychology
  );
}

function assignmentHasClearingEffect(record: MoralTradeCauseBucketAssignmentRecord) {
  return (
    record.affectsCounterpartyDistinctness ||
    record.affectsTradeClassification ||
    record.affectsClearingEligibility
  );
}

function pushTaxonomyBlockers(
  blockers: string[],
  record: MoralTradeCauseBucketTaxonomyRecord,
  checkedAt: string,
) {
  if (!hasMeaningfulText(record.taxonomyId)) {
    blockers.push("cause_bucket_taxonomy_id_missing");
  }

  if (!hasMeaningfulText(record.policyVersion)) {
    blockers.push(`cause_bucket_taxonomy_policy_version_missing:${record.taxonomyId}`);
  }

  if (record.taxonomyState !== "active") {
    blockers.push(
      `cause_bucket_taxonomy_not_active:${record.taxonomyId}:${record.taxonomyState}`,
    );
  }

  if (record.allowedBucketCodes.length < 2) {
    blockers.push(`cause_bucket_taxonomy_bucket_codes_insufficient:${record.taxonomyId}`);
  }

  if (!unique(record.allowedBucketCodes)) {
    blockers.push(`cause_bucket_taxonomy_bucket_codes_duplicated:${record.taxonomyId}`);
  }

  if (record.allowedBucketCodes.some((code) => !hasValidBucketCode(code))) {
    blockers.push(`cause_bucket_taxonomy_bucket_code_invalid:${record.taxonomyId}`);
  }

  if (
    record.bucketDefinitionHashes.length !== record.allowedBucketCodes.length ||
    record.bucketDefinitionHashes.some((hash) => !hasValidHash(hash))
  ) {
    blockers.push(`cause_bucket_definition_hashes_invalid:${record.taxonomyId}`);
  }

  if (record.protectedTraitProxyReviewState !== "non_blocking") {
    blockers.push(
      `cause_bucket_protected_trait_proxy_review_not_non_blocking:${record.taxonomyId}:${record.protectedTraitProxyReviewState}`,
    );
  }

  if (!record.ideologyOrPsychologyInferenceProhibited) {
    blockers.push(`cause_bucket_inferred_ideology_or_psychology_not_prohibited:${record.taxonomyId}`);
  }

  if (!hasMeaningfulText(record.pluralReviewerPanelRef)) {
    blockers.push(`cause_bucket_plural_reviewer_panel_missing:${record.taxonomyId}`);
  }

  if (!hasValidHash(record.publicSummaryHash)) {
    blockers.push(`cause_bucket_public_summary_hash_invalid:${record.taxonomyId}`);
  }

  if (!hasValidHash(record.taxonomyVersionHash)) {
    blockers.push(`cause_bucket_taxonomy_version_hash_invalid:${record.taxonomyId}`);
  }

  if (!hasMeaningfulText(record.reviewerDecisionRef)) {
    blockers.push(`cause_bucket_reviewer_decision_missing:${record.taxonomyId}`);
  }

  if (daysBetween(record.updatedAt, checkedAt) > MAX_TAXONOMY_AGE_DAYS) {
    blockers.push(`stale_cause_bucket_taxonomy:${record.taxonomyId}`);
  }

  if (!isTaxonomyNonRanking(record)) {
    blockers.push(`cause_bucket_taxonomy_ranking_or_inference_public:${record.taxonomyId}`);
  }
}

function pushAssignmentBlockers(
  blockers: string[],
  assignment: MoralTradeCauseBucketAssignmentRecord,
  taxonomyById: Map<string, MoralTradeCauseBucketTaxonomyRecord>,
  transition: MoralTradeCauseBucketTransition,
  checkedAt: string,
) {
  const taxonomy = taxonomyById.get(assignment.causeBucketTaxonomyRef);
  const effectBearing = assignmentHasClearingEffect(assignment);
  const selectedBucketCodes =
    assignment.reviewerNormalizedBucketCodes.length > 0
      ? assignment.reviewerNormalizedBucketCodes
      : assignment.participantSelectedBucketCodes;

  if (!hasMeaningfulText(assignment.assignmentId)) {
    blockers.push("cause_bucket_assignment_id_missing");
  }

  if (!hasMeaningfulText(assignment.subjectId)) {
    blockers.push(`cause_bucket_assignment_subject_missing:${assignment.assignmentId}`);
  }

  if (!hasValidHash(assignment.participantIdHash)) {
    blockers.push(`cause_bucket_assignment_participant_hash_invalid:${assignment.assignmentId}`);
  }

  if (!taxonomy) {
    blockers.push(`cause_bucket_assignment_taxonomy_missing:${assignment.assignmentId}`);
  }

  if (!selectedBucketCodes.length) {
    blockers.push(`cause_bucket_assignment_bucket_codes_missing:${assignment.assignmentId}`);
  }

  if (selectedBucketCodes.some((code) => !hasValidBucketCode(code))) {
    blockers.push(`cause_bucket_assignment_bucket_code_invalid:${assignment.assignmentId}`);
  }

  if (
    taxonomy &&
    selectedBucketCodes.some((code) => !taxonomy.allowedBucketCodes.includes(code))
  ) {
    blockers.push(`cause_bucket_assignment_outside_taxonomy:${assignment.assignmentId}`);
  }

  if (!hasValidHash(assignment.taxonomyVersionHash)) {
    blockers.push(`cause_bucket_assignment_taxonomy_hash_invalid:${assignment.assignmentId}`);
  }

  if (taxonomy && assignment.taxonomyVersionHash !== taxonomy.taxonomyVersionHash) {
    blockers.push(`cause_bucket_assignment_taxonomy_hash_mismatch:${assignment.assignmentId}`);
  }

  if (
    effectBearing &&
    assignment.assignmentConfidenceState !== "reviewer_normalized"
  ) {
    blockers.push(
      `cause_bucket_effect_bearing_assignment_not_reviewer_normalized:${assignment.assignmentId}:${assignment.assignmentConfidenceState}`,
    );
  }

  if (
    effectBearing &&
    !EFFECT_BEARING_ASSIGNMENT_STATES.has(assignment.assignmentState)
  ) {
    blockers.push(
      `cause_bucket_effect_bearing_assignment_state_blocking:${assignment.assignmentId}:${assignment.assignmentState}`,
    );
  }

  if (
    ["matched_trade_lock", "clearing_run", "public_metric_publication", "release_gate_promotion"].includes(
      transition,
    ) &&
    effectBearing &&
    assignment.assignmentState !== "locked"
  ) {
    blockers.push(
      `cause_bucket_effect_bearing_assignment_not_locked:${assignment.assignmentId}:${assignment.assignmentState}`,
    );
  }

  if (
    assignment.assignmentConfidenceState === "disputed" ||
    assignment.assignmentConfidenceState === "blocked" ||
    assignment.assignmentConfidenceState === "manual_review" ||
    assignment.assignmentConfidenceState === "superseded"
  ) {
    blockers.push(
      `cause_bucket_assignment_confidence_state_blocking:${assignment.assignmentId}:${assignment.assignmentConfidenceState}`,
    );
  }

  if (
    assignment.assignmentState === "disputed" ||
    assignment.assignmentState === "blocked" ||
    assignment.assignmentState === "superseded"
  ) {
    blockers.push(
      `cause_bucket_assignment_state_blocking:${assignment.assignmentId}:${assignment.assignmentState}`,
    );
  }

  if (effectBearing && !assignment.participantVisibleDependencyNotice) {
    blockers.push(`cause_bucket_dependency_notice_missing:${assignment.assignmentId}`);
  }

  if (
    assignment.taxonomyChangeMaterial &&
    !hasMeaningfulText(assignment.previewRenewalConfirmationRef)
  ) {
    blockers.push(`cause_bucket_material_taxonomy_change_without_renewal:${assignment.assignmentId}`);
  }

  if (effectBearing && !hasMeaningfulText(assignment.reviewerDecisionRef)) {
    blockers.push(`cause_bucket_assignment_reviewer_decision_missing:${assignment.assignmentId}`);
  }

  if (daysBetween(assignment.updatedAt, checkedAt) > MAX_ASSIGNMENT_AGE_DAYS) {
    blockers.push(`stale_cause_bucket_assignment:${assignment.assignmentId}`);
  }

  if (!isAssignmentPrivacySafe(assignment)) {
    blockers.push(`cause_bucket_assignment_privacy_leak:${assignment.assignmentId}`);
  }
}

export function evaluateMoralTradeCauseBucketTaxonomy(
  input: MoralTradeCauseBucketEvaluationInput,
): MoralTradeCauseBucketEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const blockers: string[] = [];
  const taxonomyById = new Map(
    input.taxonomies.map((record) => [record.taxonomyId, record]),
  );

  if (input.taxonomyRequired && input.taxonomies.length === 0) {
    blockers.push("cause_bucket_taxonomy_record_missing");
  }

  if (input.assignmentRequired && input.assignments.length === 0) {
    blockers.push("cause_bucket_assignment_record_missing");
  }

  for (const taxonomy of input.taxonomies) {
    pushTaxonomyBlockers(blockers, taxonomy, checkedAt);
  }

  for (const assignment of input.assignments) {
    pushAssignmentBlockers(
      blockers,
      assignment,
      taxonomyById,
      input.transition,
      checkedAt,
    );
  }

  if (
    input.taxonomyRequired &&
    !input.taxonomies.some(
      (record) =>
        record.taxonomyState === "active" &&
        record.protectedTraitProxyReviewState === "non_blocking" &&
        isTaxonomyNonRanking(record),
    )
  ) {
    blockers.push("active_non_ranking_cause_bucket_taxonomy_missing");
  }

  if (
    input.assignmentRequired &&
    !input.assignments.some(
      (assignment) =>
        !assignmentHasClearingEffect(assignment) ||
        (assignment.assignmentConfidenceState === "reviewer_normalized" &&
          EFFECT_BEARING_ASSIGNMENT_STATES.has(assignment.assignmentState) &&
          assignment.participantVisibleDependencyNotice &&
          isAssignmentPrivacySafe(assignment)),
    )
  ) {
    blockers.push("privacy_safe_reviewed_cause_bucket_assignment_missing");
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt,
    taxonomyRequired: input.taxonomyRequired,
    assignmentRequired: input.assignmentRequired,
    activeTaxonomyCount: input.taxonomies.filter(
      (record) => record.taxonomyState === "active",
    ).length,
    nonRankingTaxonomyCount: input.taxonomies.filter(isTaxonomyNonRanking).length,
    privacySafeAssignmentCount: input.assignments.filter(isAssignmentPrivacySafe).length,
    effectSafeAssignmentCount: input.assignments.filter(
      (assignment) =>
        !assignmentHasClearingEffect(assignment) ||
        (assignment.assignmentConfidenceState === "reviewer_normalized" &&
          EFFECT_BEARING_ASSIGNMENT_STATES.has(assignment.assignmentState) &&
          assignment.participantVisibleDependencyNotice),
    ).length,
    blockers,
    userFacingBlockerCategories: TRANSITION_DEFINITIONS.filter((transition) =>
      transition.key === input.transition && blockers.length,
    ).map((transition) => transition.userFacingBlockerCategory),
  };
}

function demoTaxonomy(
  overrides: Partial<MoralTradeCauseBucketTaxonomyRecord> = {},
): MoralTradeCauseBucketTaxonomyRecord {
  return {
    taxonomyId: "cause-bucket-taxonomy:demo",
    policyVersion: "cause-bucket-taxonomy-policy-v1",
    taxonomyType: "offered_cause",
    allowedBucketCodes: ["animal_welfare", "global_health"],
    bucketDefinitionHashes: [
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    ],
    protectedTraitProxyReviewState: "non_blocking",
    ideologyOrPsychologyInferenceProhibited: true,
    pluralReviewerPanelRef: "reviewer-panel:cause-taxonomy",
    publicSummaryHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    taxonomyVersionHash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    taxonomyState: "active",
    reviewerDecisionRef: "review-decision:cause-taxonomy",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    publicMoralRanking: false,
    publicIdeologyLabel: false,
    protectedTraitProxyAllowed: false,
    inferredPsychologyAllowed: false,
    ...overrides,
  };
}

function demoAssignment(
  overrides: Partial<MoralTradeCauseBucketAssignmentRecord> = {},
): MoralTradeCauseBucketAssignmentRecord {
  return {
    assignmentId: "cause-bucket-assignment:demo",
    subjectType: "offset_offer",
    subjectId: "offset-offer:demo",
    participantIdHash: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    causeBucketTaxonomyRef: "cause-bucket-taxonomy:demo",
    participantSelectedBucketCodes: ["animal_welfare"],
    reviewerNormalizedBucketCodes: ["animal_welfare"],
    assignmentConfidenceState: "reviewer_normalized",
    assignmentVisibility: "counterparty_band_only",
    affectsCounterpartyDistinctness: true,
    affectsTradeClassification: true,
    affectsClearingEligibility: true,
    assignmentState: "locked",
    reviewerDecisionRef: "review-decision:cause-assignment",
    taxonomyVersionHash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    participantVisibleDependencyNotice: true,
    taxonomyChangeMaterial: false,
    previewRenewalConfirmationRef: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    publicParticipantIdentity: false,
    publicDetailedBucketNarrative: false,
    publicProtectedTraitFacts: false,
    publicInferredIdeologyOrPsychology: false,
    ...overrides,
  };
}

export function getMoralTradeCauseBucketTaxonomyContract(): MoralTradeCauseBucketContract {
  return {
    version: MORAL_TRADE_CAUSE_BUCKET_TAXONOMY_CONTRACT_VERSION,
    purpose:
      "Fail-closed cause-bucket taxonomy and assignment contract for non-public-goods Moral Trade previews, candidate generation, locks, clearing, public metrics, and release gates.",
    failClosedRule:
      "Cause-bucket taxonomy and assignment records are required before bucket labels affect counterparty distinctness, trade classification, clearing eligibility, clearing ratios, eligible counterparties, public metrics, or release-gate promotion. Missing, stale, disputed, protected-trait-proxy, inferred-ideology, inferred-psychology, mutable, or unreviewed assignments fail closed to preview/manual review.",
    privacyBoundary:
      "Public surfaces may show only coarse bucket codes, taxonomy version, public summary hash, and status categories. They must not expose participant identity hashes, raw private cause narratives, protected-trait facts, inferred ideology, inferred psychology, reviewer notes, or participant-specific assignment rows.",
    nonRankingRule:
      "Cause buckets are coordination labels, not moral rankings, ideology labels, reputation scores, cause-price tables, or platform-endorsed moral value judgments.",
    materialChangeRule:
      "A taxonomy change after preview is material when it can affect counterparty distinctness, trade classification, clearing ratio, clearing eligibility, or eligible counterparties; the trade then needs a renewed preview and participant confirmation before lock, clearing, payment, public metrics, or release promotion.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    taxonomyTypes: [...TAXONOMY_TYPES],
    subjectTypes: [...SUBJECT_TYPES],
    reviewStates: [...REVIEW_STATES],
    taxonomyStates: [...TAXONOMY_STATES],
    assignmentConfidenceStates: [...ASSIGNMENT_CONFIDENCE_STATES],
    assignmentVisibilityStates: [...ASSIGNMENT_VISIBILITY_STATES],
    assignmentStates: [...ASSIGNMENT_STATES],
    transitionDefinitions: TRANSITION_DEFINITIONS,
    sampleEvaluations: [
      evaluateMoralTradeCauseBucketTaxonomy({
        transition: "clearing_run",
        taxonomyRequired: true,
        assignmentRequired: true,
        checkedAt: "2026-06-12T00:00:00.000Z",
        taxonomies: [demoTaxonomy()],
        assignments: [demoAssignment()],
      }),
      evaluateMoralTradeCauseBucketTaxonomy({
        transition: "clearing_run",
        taxonomyRequired: true,
        assignmentRequired: true,
        checkedAt: "2026-06-12T00:00:00.000Z",
        taxonomies: [
          demoTaxonomy({
            protectedTraitProxyReviewState: "blocked",
            publicMoralRanking: true,
          }),
        ],
        assignments: [
          demoAssignment({
            assignmentConfidenceState: "disputed",
            publicInferredIdeologyOrPsychology: true,
          }),
        ],
      }),
    ],
    contractTests: [
      "cause_bucket_taxonomy_review_test",
      "cause_bucket_taxonomy_contract_validator",
      "cause_bucket_taxonomy_fail_closed_for_protected_trait_proxy",
      "cause_bucket_assignment_effect_bearing_review_gate",
      "cause_bucket_taxonomy_route_contract",
      "cause_bucket_taxonomy_schema_contract",
    ],
  };
}

export function validateMoralTradeCauseBucketTaxonomyContract(
  contract = getMoralTradeCauseBucketTaxonomyContract(),
): MoralTradeCauseBucketValidation {
  const checks = [
    check(
      "first-class-records",
      "Contract names taxonomy and assignment record tables",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subject",
      "Contract names cause_bucket_taxonomy policy snapshots",
      contract.policySnapshotSubjects.includes("cause_bucket_taxonomy"),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "taxonomy-scope",
      "Contract covers offered, opposed, destination, action, and counterparty bucket taxonomies",
      ["offered_cause", "opposed_cause", "compromise_destination", "action_bucket", "counterparty_bucket"].every(
        (type) => contract.taxonomyTypes.includes(type as MoralTradeCauseBucketTaxonomyType),
      ),
      contract.taxonomyTypes.join(", "),
    ),
    check(
      "assignment-effects",
      "Transitions guard counterparty distinctness, classification, clearing, metrics, and release gates",
      ["match_candidate_generation", "matched_trade_lock", "clearing_run", "public_metric_publication", "release_gate_promotion"].every(
        (transition) =>
          contract.transitionDefinitions.some(
            (definition) => definition.key === transition,
          ),
      ),
      contract.transitionDefinitions.map((definition) => definition.key).join(", "),
    ),
    check(
      "privacy-boundary",
      "Privacy boundary excludes private assignment and protected-trait details",
      /protected-trait facts/i.test(contract.privacyBoundary) &&
        /inferred ideology/i.test(contract.privacyBoundary) &&
        /reviewer notes/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
    check(
      "non-ranking-rule",
      "Non-ranking rule rejects ideology labels and public moral rankings",
      /not moral rankings/i.test(contract.nonRankingRule) &&
        /ideology labels/i.test(contract.nonRankingRule),
      contract.nonRankingRule,
    ),
    check(
      "material-change-rule",
      "Material taxonomy changes require renewed preview and confirmation",
      /renewed preview/i.test(contract.materialChangeRule) &&
        /counterparty distinctness/i.test(contract.materialChangeRule),
      contract.materialChangeRule,
    ),
    check(
      "sample-pass-and-block",
      "Sample evaluations include a passing and blocked taxonomy path",
      contract.sampleEvaluations.some((evaluation) => evaluation.status === "pass") &&
        contract.sampleEvaluations.some((evaluation) => evaluation.status === "blocked"),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.transition}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "release-gate-test",
      "Contract advertises cause_bucket_taxonomy_review_test",
      contract.contractTests.includes("cause_bucket_taxonomy_review_test"),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((item) => item.status === "fail")
    .map((item) => item.id);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-cause-bucket-taxonomy-contract",
    validatorVersion: MORAL_TRADE_CAUSE_BUCKET_TAXONOMY_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
