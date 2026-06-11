export const MORAL_TRADE_AI_PREFERENCE_ELICITATION_CONTRACT_VERSION =
  "moral-trade-ai-preference-elicitation-v0.1-2026-06";
export const MORAL_TRADE_AI_PREFERENCE_ELICITATION_VALIDATOR_VERSION =
  "moral-trade-ai-preference-elicitation-validator-v0.1";

export type MoralTradeAiPreferenceElicitationTransition =
  | "draft_preference_elicitation"
  | "structured_input_conversion"
  | "match_candidate_preview"
  | "matched_trade_lock"
  | "clearing_run_input"
  | "counterparty_disclosure"
  | "payment_authorization"
  | "payment_capture"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeAiPreferenceElicitationSubjectType =
  | "offset_offer"
  | "pledge_swap_offer"
  | "matched_trade_lock_proposal"
  | "common_ground_budget"
  | "participant_confirmation_record";

export type MoralTradeAiPreferenceElicitationScope =
  | "baseline"
  | "caps"
  | "side_constraints"
  | "empirical_assumptions"
  | "cause_buckets"
  | "evidence_preferences"
  | "fallback_rules"
  | "manual_review";

export type MoralTradeAiPreferenceElicitationPolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeAiPreferenceElicitationState =
  | "sandbox"
  | "user_reviewed"
  | "converted_to_structured_input"
  | "discarded"
  | "blocked"
  | "superseded";

export interface MoralTradeAiPreferenceElicitationPolicyRecord {
  policyId: string;
  releaseStage: string;
  policyStatus: MoralTradeAiPreferenceElicitationPolicyStatus;
  policyHash: string;
  allowedScopes: MoralTradeAiPreferenceElicitationScope[];
  allowedSubjectTypes: MoralTradeAiPreferenceElicitationSubjectType[];
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
  allowsPreferenceStructuring: boolean;
  prohibitsHiddenWillingnessToPayInference: boolean;
  prohibitsAutonomousCounteroffers: boolean;
  prohibitsStateChangeFromAiOutput: boolean;
  requiresUserEditedStructuredInputForStateChange: boolean;
}

export interface MoralTradeAiPreferenceElicitationRecord {
  recordId: string;
  subjectType: MoralTradeAiPreferenceElicitationSubjectType;
  subjectRef: string;
  participantIdHash: string;
  policyRef: string;
  scope: MoralTradeAiPreferenceElicitationScope;
  aiOutputHash: string;
  userEditedStructuredInputHash: string | null;
  hiddenWillingnessToPayInferenceProhibited: boolean;
  autonomousCounterofferOrAcceptance: boolean;
  stateChangeAllowed: boolean;
  participantConfirmationRecordRef: string | null;
  reviewerDecisionRef: string | null;
  elicitationState: MoralTradeAiPreferenceElicitationState;
  createdAt: string;
  updatedAt: string;
  rawPromptPublic: boolean;
  rawAiOutputPublic: boolean;
  hiddenWillingnessToPayEstimatePublic: boolean;
  hiddenNegotiationMovesPublic: boolean;
  privateParticipantNotesPublic: boolean;
  reviewerNotesPublic: boolean;
}

export interface MoralTradeAiPreferenceElicitationTransitionDefinition {
  key: MoralTradeAiPreferenceElicitationTransition;
  label: string;
  allowsAiAssistedDrafting: boolean;
  requiresImmutablePolicyWhenUsed: boolean;
  requiresRecordWhenUsed: boolean;
  requiresConvertedStructuredInput: boolean;
  requiresParticipantConfirmationOrReviewerDecision: boolean;
  prohibitsStateChangeFromAiOutput: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeAiPreferenceElicitationEvaluationInput {
  transition: MoralTradeAiPreferenceElicitationTransition;
  aiPreferenceElicitationUsed: boolean;
  checkedAt?: string;
  policies: MoralTradeAiPreferenceElicitationPolicyRecord[];
  records: MoralTradeAiPreferenceElicitationRecord[];
}

export interface MoralTradeAiPreferenceElicitationEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeAiPreferenceElicitationTransition;
  checkedAt: string;
  aiPreferenceElicitationUsed: boolean;
  requiredPolicyCount: number;
  requiredRecordCount: number;
  immutablePolicyCount: number;
  convertedStructuredInputCount: number;
  confirmationOrReviewerDecisionCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeAiPreferenceElicitationCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeAiPreferenceElicitationValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-ai-preference-elicitation-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeAiPreferenceElicitationCheck[];
  blockers: string[];
}

export interface MoralTradeAiPreferenceElicitationContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradeAiPreferenceElicitationSubjectType[];
  scopes: MoralTradeAiPreferenceElicitationScope[];
  elicitationStates: MoralTradeAiPreferenceElicitationState[];
  policyStatuses: MoralTradeAiPreferenceElicitationPolicyStatus[];
  prohibitedUseBlockers: string[];
  transitionDefinitions: MoralTradeAiPreferenceElicitationTransitionDefinition[];
  sampleEvaluations: MoralTradeAiPreferenceElicitationEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_POLICY_AGE_DAYS = 120;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_ai_preference_elicitation_policies",
  "moral_trade_ai_preference_elicitation_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["ai_preference_elicitation"] as const;

const SUBJECT_TYPES: MoralTradeAiPreferenceElicitationSubjectType[] = [
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "common_ground_budget",
  "participant_confirmation_record",
];

const SCOPES: MoralTradeAiPreferenceElicitationScope[] = [
  "baseline",
  "caps",
  "side_constraints",
  "empirical_assumptions",
  "cause_buckets",
  "evidence_preferences",
  "fallback_rules",
  "manual_review",
];

const ELICITATION_STATES: MoralTradeAiPreferenceElicitationState[] = [
  "sandbox",
  "user_reviewed",
  "converted_to_structured_input",
  "discarded",
  "blocked",
  "superseded",
];

const POLICY_STATUSES: MoralTradeAiPreferenceElicitationPolicyStatus[] = [
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
];

const PROHIBITED_USE_BLOCKERS = [
  "hidden_willingness_to_pay_inference_not_prohibited",
  "autonomous_counteroffer_or_acceptance_attempted",
  "ai_output_state_change_allowed",
  "ai_output_not_converted_to_user_edited_structured_input",
  "ai_preference_confirmation_or_reviewer_decision_missing",
  "raw_ai_preference_elicitation_output_public",
] as const;

const TRANSITION_DEFINITIONS: MoralTradeAiPreferenceElicitationTransitionDefinition[] = [
  {
    key: "draft_preference_elicitation",
    label: "Draft preference elicitation",
    allowsAiAssistedDrafting: true,
    requiresImmutablePolicyWhenUsed: true,
    requiresRecordWhenUsed: true,
    requiresConvertedStructuredInput: false,
    requiresParticipantConfirmationOrReviewerDecision: false,
    prohibitsStateChangeFromAiOutput: true,
    userFacingBlockerCategory:
      "AI preference drafting is sandbox-only and cannot change state",
  },
  {
    key: "structured_input_conversion",
    label: "Structured input conversion",
    allowsAiAssistedDrafting: true,
    requiresImmutablePolicyWhenUsed: true,
    requiresRecordWhenUsed: true,
    requiresConvertedStructuredInput: true,
    requiresParticipantConfirmationOrReviewerDecision: true,
    prohibitsStateChangeFromAiOutput: true,
    userFacingBlockerCategory:
      "AI output must be edited into structured input and confirmed or reviewed",
  },
  {
    key: "match_candidate_preview",
    label: "Match candidate preview",
    allowsAiAssistedDrafting: true,
    requiresImmutablePolicyWhenUsed: true,
    requiresRecordWhenUsed: true,
    requiresConvertedStructuredInput: true,
    requiresParticipantConfirmationOrReviewerDecision: true,
    prohibitsStateChangeFromAiOutput: true,
    userFacingBlockerCategory:
      "Matching previews wait for user-edited preference inputs",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    allowsAiAssistedDrafting: true,
    requiresImmutablePolicyWhenUsed: true,
    requiresRecordWhenUsed: true,
    requiresConvertedStructuredInput: true,
    requiresParticipantConfirmationOrReviewerDecision: true,
    prohibitsStateChangeFromAiOutput: true,
    userFacingBlockerCategory:
      "Final lock cannot rely on unconverted AI preference output",
  },
  {
    key: "clearing_run_input",
    label: "Clearing run input",
    allowsAiAssistedDrafting: true,
    requiresImmutablePolicyWhenUsed: true,
    requiresRecordWhenUsed: true,
    requiresConvertedStructuredInput: true,
    requiresParticipantConfirmationOrReviewerDecision: true,
    prohibitsStateChangeFromAiOutput: true,
    userFacingBlockerCategory:
      "Clearing input cannot be AI-generated without user-edited conversion",
  },
  {
    key: "counterparty_disclosure",
    label: "Counterparty disclosure",
    allowsAiAssistedDrafting: true,
    requiresImmutablePolicyWhenUsed: true,
    requiresRecordWhenUsed: true,
    requiresConvertedStructuredInput: true,
    requiresParticipantConfirmationOrReviewerDecision: true,
    prohibitsStateChangeFromAiOutput: true,
    userFacingBlockerCategory:
      "Disclosure cannot expose AI-inferred private preferences",
  },
  {
    key: "payment_authorization",
    label: "Payment authorization",
    allowsAiAssistedDrafting: true,
    requiresImmutablePolicyWhenUsed: true,
    requiresRecordWhenUsed: true,
    requiresConvertedStructuredInput: true,
    requiresParticipantConfirmationOrReviewerDecision: true,
    prohibitsStateChangeFromAiOutput: true,
    userFacingBlockerCategory:
      "Payment authorization waits for confirmed structured terms",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    allowsAiAssistedDrafting: true,
    requiresImmutablePolicyWhenUsed: true,
    requiresRecordWhenUsed: true,
    requiresConvertedStructuredInput: true,
    requiresParticipantConfirmationOrReviewerDecision: true,
    prohibitsStateChangeFromAiOutput: true,
    userFacingBlockerCategory:
      "Payment capture cannot be authorized by AI-generated preferences",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    allowsAiAssistedDrafting: true,
    requiresImmutablePolicyWhenUsed: true,
    requiresRecordWhenUsed: true,
    requiresConvertedStructuredInput: true,
    requiresParticipantConfirmationOrReviewerDecision: true,
    prohibitsStateChangeFromAiOutput: true,
    userFacingBlockerCategory:
      "Public metrics cannot include hidden AI-inferred preference values",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    allowsAiAssistedDrafting: true,
    requiresImmutablePolicyWhenUsed: true,
    requiresRecordWhenUsed: true,
    requiresConvertedStructuredInput: true,
    requiresParticipantConfirmationOrReviewerDecision: true,
    prohibitsStateChangeFromAiOutput: true,
    userFacingBlockerCategory:
      "Release promotion waits for AI preference-elicitation blockers to clear",
  },
];

const CONTRACT_TESTS = [
  "ai_preference_elicitation_contract_validator",
  "ai_preference_elicitation_boundary_test",
  "ai_preference_elicitation_state_change_blocking_test",
  "ai_preference_elicitation_privacy_boundary_test",
  "ai_preference_elicitation_route_health_spec_and_migration_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeAiPreferenceElicitationCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function isHash(value: string | null) {
  return typeof value === "string" && HASH_PATTERN.test(value);
}

function daysBetween(earlier: string, later: string) {
  const earlierTimestamp = Date.parse(earlier);
  const laterTimestamp = Date.parse(later);

  if (!Number.isFinite(earlierTimestamp) || !Number.isFinite(laterTimestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return (laterTimestamp - earlierTimestamp) / (1000 * 60 * 60 * 24);
}

function isExpired(value: string | null, checkedAt: string) {
  if (value === null) {
    return false;
  }

  const expiresAt = Date.parse(value);
  const checkedAtTimestamp = Date.parse(checkedAt);

  return (
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(checkedAtTimestamp) ||
    expiresAt <= checkedAtTimestamp
  );
}

function makeHash(seed: string) {
  const hexSeed = seed.replace(/[^a-f0-9]/gi, "a") || "a";

  return `sha256:${hexSeed.padEnd(64, "0").slice(0, 64).toLowerCase()}`;
}

function makeSamplePolicy(
  overrides: Partial<MoralTradeAiPreferenceElicitationPolicyRecord> = {},
): MoralTradeAiPreferenceElicitationPolicyRecord {
  return {
    policyId: "ai-preference-elicitation-policy:tier-1",
    releaseStage: "tier_1_money_only_donation_offset",
    policyStatus: "resolved_immutable",
    policyHash: makeHash("ai-preference-elicitation-policy"),
    allowedScopes: [...SCOPES],
    allowedSubjectTypes: [...SUBJECT_TYPES],
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-10-11T12:00:00.000Z",
    supersededBy: null,
    allowsPreferenceStructuring: true,
    prohibitsHiddenWillingnessToPayInference: true,
    prohibitsAutonomousCounteroffers: true,
    prohibitsStateChangeFromAiOutput: true,
    requiresUserEditedStructuredInputForStateChange: true,
    ...overrides,
  };
}

function makeSampleRecord(
  overrides: Partial<MoralTradeAiPreferenceElicitationRecord> = {},
): MoralTradeAiPreferenceElicitationRecord {
  return {
    recordId: "ai-preference-elicitation:offset-offer-demo",
    subjectType: "offset_offer",
    subjectRef: "offset-offer:demo",
    participantIdHash: makeHash("participant"),
    policyRef: "ai-preference-elicitation-policy:tier-1",
    scope: "baseline",
    aiOutputHash: makeHash("ai-output"),
    userEditedStructuredInputHash: makeHash("user-edited-structured-input"),
    hiddenWillingnessToPayInferenceProhibited: true,
    autonomousCounterofferOrAcceptance: false,
    stateChangeAllowed: false,
    participantConfirmationRecordRef: "participant-confirmation:demo",
    reviewerDecisionRef: null,
    elicitationState: "converted_to_structured_input",
    createdAt: "2026-06-11T12:00:00.000Z",
    updatedAt: "2026-06-11T12:00:00.000Z",
    rawPromptPublic: false,
    rawAiOutputPublic: false,
    hiddenWillingnessToPayEstimatePublic: false,
    hiddenNegotiationMovesPublic: false,
    privateParticipantNotesPublic: false,
    reviewerNotesPublic: false,
    ...overrides,
  };
}

function getTransitionDefinition(
  transition: MoralTradeAiPreferenceElicitationTransition,
) {
  return TRANSITION_DEFINITIONS.find((definition) => definition.key === transition);
}

function policyBlocks(
  policy: MoralTradeAiPreferenceElicitationPolicyRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (policy.policyStatus !== "resolved_immutable") {
    blockers.push(
      `ai_preference_elicitation_policy_not_immutable:${policy.policyId}:${policy.policyStatus}`,
    );
  }

  if (!isHash(policy.policyHash)) {
    blockers.push(`ai_preference_elicitation_policy_hash_invalid:${policy.policyId}`);
  }

  if (policy.supersededBy) {
    blockers.push(`ai_preference_elicitation_policy_superseded:${policy.policyId}`);
  }

  if (daysBetween(policy.reviewedAt, checkedAt) > MAX_POLICY_AGE_DAYS) {
    blockers.push(`ai_preference_elicitation_policy_stale:${policy.policyId}`);
  }

  if (isExpired(policy.expiresAt, checkedAt)) {
    blockers.push(`ai_preference_elicitation_policy_expired:${policy.policyId}`);
  }

  if (!policy.allowsPreferenceStructuring) {
    blockers.push(`ai_preference_structuring_not_allowed:${policy.policyId}`);
  }

  if (!policy.prohibitsHiddenWillingnessToPayInference) {
    blockers.push(
      `ai_preference_policy_hidden_willingness_to_pay_not_prohibited:${policy.policyId}`,
    );
  }

  if (!policy.prohibitsAutonomousCounteroffers) {
    blockers.push(
      `ai_preference_policy_autonomous_counteroffers_not_prohibited:${policy.policyId}`,
    );
  }

  if (!policy.prohibitsStateChangeFromAiOutput) {
    blockers.push(
      `ai_preference_policy_state_change_not_prohibited:${policy.policyId}`,
    );
  }

  if (!policy.requiresUserEditedStructuredInputForStateChange) {
    blockers.push(
      `ai_preference_policy_user_edited_structured_input_not_required:${policy.policyId}`,
    );
  }

  return blockers;
}

function recordBlocks({
  definition,
  policy,
  record,
}: {
  definition: MoralTradeAiPreferenceElicitationTransitionDefinition;
  policy: MoralTradeAiPreferenceElicitationPolicyRecord | undefined;
  record: MoralTradeAiPreferenceElicitationRecord;
}) {
  const blockers: string[] = [];

  if (!policy) {
    blockers.push(`ai_preference_elicitation_policy_missing:${record.policyRef}`);
  }

  if (policy && !policy.allowedScopes.includes(record.scope)) {
    blockers.push(
      `ai_preference_elicitation_scope_not_allowed:${record.recordId}:${record.scope}`,
    );
  }

  if (policy && !policy.allowedSubjectTypes.includes(record.subjectType)) {
    blockers.push(
      `ai_preference_elicitation_subject_not_allowed:${record.recordId}:${record.subjectType}`,
    );
  }

  if (!isHash(record.participantIdHash)) {
    blockers.push(`ai_preference_participant_hash_invalid:${record.recordId}`);
  }

  if (!isHash(record.aiOutputHash)) {
    blockers.push(`ai_preference_ai_output_hash_invalid:${record.recordId}`);
  }

  if (!record.hiddenWillingnessToPayInferenceProhibited) {
    blockers.push(
      `hidden_willingness_to_pay_inference_not_prohibited:${record.recordId}`,
    );
  }

  if (record.autonomousCounterofferOrAcceptance) {
    blockers.push(
      `autonomous_counteroffer_or_acceptance_attempted:${record.recordId}`,
    );
  }

  if (record.stateChangeAllowed) {
    blockers.push(`ai_output_state_change_allowed:${record.recordId}`);
  }

  if (
    definition.requiresConvertedStructuredInput &&
    record.elicitationState !== "converted_to_structured_input"
  ) {
    blockers.push(
      `ai_output_not_converted_to_user_edited_structured_input:${record.recordId}:${record.elicitationState}`,
    );
  }

  if (
    definition.requiresConvertedStructuredInput &&
    !isHash(record.userEditedStructuredInputHash)
  ) {
    blockers.push(
      `user_edited_structured_input_hash_missing:${record.recordId}`,
    );
  }

  if (
    definition.requiresParticipantConfirmationOrReviewerDecision &&
    !record.participantConfirmationRecordRef &&
    !record.reviewerDecisionRef
  ) {
    blockers.push(
      `ai_preference_confirmation_or_reviewer_decision_missing:${record.recordId}`,
    );
  }

  if (record.elicitationState === "blocked") {
    blockers.push(`ai_preference_elicitation_record_blocked:${record.recordId}`);
  }

  if (record.elicitationState === "superseded") {
    blockers.push(`ai_preference_elicitation_record_superseded:${record.recordId}`);
  }

  if (record.rawPromptPublic) {
    blockers.push(`raw_ai_preference_elicitation_prompt_public:${record.recordId}`);
  }

  if (record.rawAiOutputPublic) {
    blockers.push(`raw_ai_preference_elicitation_output_public:${record.recordId}`);
  }

  if (record.hiddenWillingnessToPayEstimatePublic) {
    blockers.push(`hidden_willingness_to_pay_estimate_public:${record.recordId}`);
  }

  if (record.hiddenNegotiationMovesPublic) {
    blockers.push(`hidden_negotiation_moves_public:${record.recordId}`);
  }

  if (record.privateParticipantNotesPublic) {
    blockers.push(`ai_preference_private_participant_notes_public:${record.recordId}`);
  }

  if (record.reviewerNotesPublic) {
    blockers.push(`ai_preference_reviewer_notes_public:${record.recordId}`);
  }

  return blockers;
}

export function evaluateMoralTradeAiPreferenceElicitation(
  input: MoralTradeAiPreferenceElicitationEvaluationInput,
): MoralTradeAiPreferenceElicitationEvaluation {
  const definition = getTransitionDefinition(input.transition);
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const aiPreferenceElicitationUsed =
    input.aiPreferenceElicitationUsed || input.records.length > 0;
  const blockers: string[] = [];
  const userFacingBlockerCategories = new Set<string>();

  if (!definition) {
    blockers.push(`unknown_ai_preference_elicitation_transition:${input.transition}`);

    return {
      status: "blocked",
      transition: input.transition,
      checkedAt,
      aiPreferenceElicitationUsed,
      requiredPolicyCount: 0,
      requiredRecordCount: 0,
      immutablePolicyCount: 0,
      convertedStructuredInputCount: 0,
      confirmationOrReviewerDecisionCount: 0,
      blockers,
      userFacingBlockerCategories: [
        "Unknown AI preference-elicitation transition",
      ],
    };
  }

  if (!aiPreferenceElicitationUsed) {
    return {
      status: "pass",
      transition: definition.key,
      checkedAt,
      aiPreferenceElicitationUsed: false,
      requiredPolicyCount: 0,
      requiredRecordCount: 0,
      immutablePolicyCount: 0,
      convertedStructuredInputCount: 0,
      confirmationOrReviewerDecisionCount: 0,
      blockers: [],
      userFacingBlockerCategories: [],
    };
  }

  if (definition.requiresImmutablePolicyWhenUsed && input.policies.length === 0) {
    blockers.push("ai_preference_elicitation_policy_required");
  }

  if (definition.requiresRecordWhenUsed && input.records.length === 0) {
    blockers.push("ai_preference_elicitation_record_required");
  }

  for (const policy of input.policies) {
    blockers.push(...policyBlocks(policy, checkedAt));
  }

  for (const record of input.records) {
    const policy = input.policies.find(
      (candidate) => candidate.policyId === record.policyRef,
    );

    blockers.push(...recordBlocks({ definition, policy, record }));
  }

  if (
    definition.requiresConvertedStructuredInput &&
    input.records.every(
      (record) => record.elicitationState !== "converted_to_structured_input",
    )
  ) {
    blockers.push("ai_preference_elicitation_converted_record_required");
  }

  if (blockers.length) {
    userFacingBlockerCategories.add(definition.userFacingBlockerCategory);
  }

  const immutablePolicyCount = input.policies.filter(
    (policy) => policy.policyStatus === "resolved_immutable",
  ).length;
  const convertedStructuredInputCount = input.records.filter(
    (record) =>
      record.elicitationState === "converted_to_structured_input" &&
      isHash(record.userEditedStructuredInputHash),
  ).length;
  const confirmationOrReviewerDecisionCount = input.records.filter(
    (record) => record.participantConfirmationRecordRef || record.reviewerDecisionRef,
  ).length;

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: definition.key,
    checkedAt,
    aiPreferenceElicitationUsed,
    requiredPolicyCount: definition.requiresImmutablePolicyWhenUsed ? 1 : 0,
    requiredRecordCount: definition.requiresRecordWhenUsed ? 1 : 0,
    immutablePolicyCount,
    convertedStructuredInputCount,
    confirmationOrReviewerDecisionCount,
    blockers: Array.from(new Set(blockers)),
    userFacingBlockerCategories: Array.from(userFacingBlockerCategories),
  };
}

export function getMoralTradeAiPreferenceElicitationContract(): MoralTradeAiPreferenceElicitationContract {
  const samplePolicy = makeSamplePolicy();
  const sampleRecord = makeSampleRecord();

  return {
    version: MORAL_TRADE_AI_PREFERENCE_ELICITATION_CONTRACT_VERSION,
    purpose:
      "Fail-closed AI-assisted preference-elicitation contract for baselines, caps, side constraints, empirical assumptions, cause buckets, evidence preferences, fallback rules, matching, clearing, disclosure, payment, public metrics, and release-gate transitions.",
    failClosedRule:
      "AI may help participants draft preference structure, but AI output cannot infer hidden willingness to pay, create negotiation moves, accept or counteroffer, disclose private facts, authorize matching or clearing, authorize payment, or change state. If AI shaped a baseline, cap, cause bucket, side constraint, evidence preference, fallback rule, or manual-review input, it must be converted into user-edited structured input and backed by participant confirmation or reviewer decision before it affects matching, clearing, disclosure, payment, public metrics, or release promotion.",
    privacyBoundary:
      "Public surfaces may expose table names, scopes, transition rules, blocker categories, and sample statuses only. They must not expose raw prompts, raw AI outputs, hidden willingness-to-pay estimates, hidden negotiation moves, private participant notes, reviewer notes, private disclosure candidates, payment details, or participant-specific elicitation records.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: SUBJECT_TYPES,
    scopes: SCOPES,
    elicitationStates: ELICITATION_STATES,
    policyStatuses: POLICY_STATUSES,
    prohibitedUseBlockers: [...PROHIBITED_USE_BLOCKERS],
    transitionDefinitions: TRANSITION_DEFINITIONS,
    sampleEvaluations: [
      evaluateMoralTradeAiPreferenceElicitation({
        transition: "draft_preference_elicitation",
        aiPreferenceElicitationUsed: false,
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [],
        records: [],
      }),
      evaluateMoralTradeAiPreferenceElicitation({
        transition: "match_candidate_preview",
        aiPreferenceElicitationUsed: true,
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [],
        records: [],
      }),
      evaluateMoralTradeAiPreferenceElicitation({
        transition: "matched_trade_lock",
        aiPreferenceElicitationUsed: true,
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [samplePolicy],
        records: [sampleRecord],
      }),
      evaluateMoralTradeAiPreferenceElicitation({
        transition: "payment_capture",
        aiPreferenceElicitationUsed: true,
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [samplePolicy],
        records: [
          makeSampleRecord({
            hiddenWillingnessToPayInferenceProhibited: false,
            autonomousCounterofferOrAcceptance: true,
            stateChangeAllowed: true,
          }),
        ],
      }),
      evaluateMoralTradeAiPreferenceElicitation({
        transition: "public_metric_publication",
        aiPreferenceElicitationUsed: true,
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [samplePolicy],
        records: [
          makeSampleRecord({
            rawAiOutputPublic: true,
            hiddenWillingnessToPayEstimatePublic: true,
            hiddenNegotiationMovesPublic: true,
          }),
        ],
      }),
    ],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeAiPreferenceElicitationContract(
  contract: MoralTradeAiPreferenceElicitationContract =
    getMoralTradeAiPreferenceElicitationContract(),
): MoralTradeAiPreferenceElicitationValidation {
  const checks = [
    check(
      "versioned-contract",
      "Contract version is pinned",
      contract.version === MORAL_TRADE_AI_PREFERENCE_ELICITATION_CONTRACT_VERSION,
      contract.version,
    ),
    check(
      "first-class-records",
      "First-class AI preference-elicitation tables are declared",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Policy snapshot subject includes AI preference elicitation",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "scope-coverage",
      "Contract covers baselines, caps, cause buckets, evidence preferences, and fallback rules",
      contract.scopes.includes("baseline") &&
        contract.scopes.includes("caps") &&
        contract.scopes.includes("cause_buckets") &&
        contract.scopes.includes("evidence_preferences") &&
        contract.scopes.includes("fallback_rules"),
      contract.scopes.join(", "),
    ),
    check(
      "transition-coverage",
      "Matching, clearing, disclosure, payment, public metric, and release transitions require user-edited structured input",
      [
        "match_candidate_preview",
        "matched_trade_lock",
        "clearing_run_input",
        "counterparty_disclosure",
        "payment_capture",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((key) =>
        contract.transitionDefinitions.some(
          (transition) =>
            transition.key === key &&
            transition.requiresConvertedStructuredInput &&
            transition.requiresParticipantConfirmationOrReviewerDecision &&
            transition.prohibitsStateChangeFromAiOutput,
        ),
      ),
      contract.transitionDefinitions
        .map(
          (transition) =>
            `${transition.key}:${transition.requiresConvertedStructuredInput}`,
        )
        .join(", "),
    ),
    check(
      "prohibited-use-blockers",
      "Prohibited-use blockers cover hidden WTP, autonomous counteroffers, and AI state changes",
      contract.prohibitedUseBlockers.includes(
        "hidden_willingness_to_pay_inference_not_prohibited",
      ) &&
        contract.prohibitedUseBlockers.includes(
          "autonomous_counteroffer_or_acceptance_attempted",
        ) &&
        contract.prohibitedUseBlockers.includes("ai_output_state_change_allowed"),
      contract.prohibitedUseBlockers.join(", "),
    ),
    check(
      "sample-evaluations",
      "Sample evaluations cover pass and fail-closed AI preference states",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.transition === "matched_trade_lock" &&
          evaluation.status === "pass" &&
          evaluation.convertedStructuredInputCount > 0,
      ) &&
        contract.sampleEvaluations.some((evaluation) =>
          evaluation.blockers.includes("ai_preference_elicitation_policy_required"),
        ) &&
        contract.sampleEvaluations.some((evaluation) =>
          evaluation.blockers.some((blocker) =>
            /hidden_willingness_to_pay_inference_not_prohibited|autonomous_counteroffer_or_acceptance_attempted|ai_output_state_change_allowed/i.test(
              blocker,
            ),
          ),
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.transition}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "privacy-boundary",
      "Public boundary excludes raw AI and private participant details",
      /raw prompts/i.test(contract.privacyBoundary) &&
        /raw AI outputs/i.test(contract.privacyBoundary) &&
        /hidden willingness-to-pay estimates/i.test(contract.privacyBoundary) &&
        /hidden negotiation moves/i.test(contract.privacyBoundary) &&
        /private participant notes/i.test(contract.privacyBoundary) &&
        /reviewer notes/i.test(contract.privacyBoundary) &&
        /participant-specific elicitation records/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
    check(
      "contract-tests",
      "Contract test hooks are named",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-ai-preference-elicitation-contract",
    validatorVersion: MORAL_TRADE_AI_PREFERENCE_ELICITATION_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
