export const MORAL_TRADE_PARTICIPANT_TERM_SHEET_CONTRACT_VERSION =
  "moral-trade-participant-term-sheet-v0.1-2026-06";
export const MORAL_TRADE_PARTICIPANT_TERM_SHEET_VALIDATOR_VERSION =
  "moral-trade-participant-term-sheet-validator-v0.1";

export type MoralTradeParticipantTermSheetTransition =
  | "draft_preview"
  | "counterparty_preview"
  | "live_offer_publication"
  | "matchable_publication"
  | "matched_trade_lock"
  | "payment_authorization"
  | "payment_capture"
  | "reliance_bearing_transition"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeParticipantTermSheetSubjectType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement";

export type MoralTradeCounterpartyBlindingPolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeParticipantTermSheetState =
  | "draft"
  | "participant_confirmed"
  | "counterparty_confirmed"
  | "mutually_confirmed"
  | "mismatch"
  | "expired"
  | "superseded"
  | "blocked";

export type MoralTradeStagedCounterpartyDisclosureState =
  | "not_disclosed"
  | "stage_eligible"
  | "redacted_disclosed"
  | "mutually_consented"
  | "over_disclosed"
  | "expired"
  | "superseded"
  | "blocked";

export type MoralTradeVisibleCounterpartyDisclosureStatus =
  | "not_disclosed"
  | "volume_bucket_only"
  | "redacted_counterparty"
  | "mutual_consent_ready"
  | "mutually_disclosed"
  | "expired_stale"
  | "blocked_needs_review";

export type MoralTradeCounterpartyDisclosureStage =
  | "none"
  | "cohort_count"
  | "redacted_counterparty"
  | "mutual_consent"
  | "post_lock_public_summary";

export interface MoralTradeCounterpartyBlindingPolicyRecord {
  policyId: string;
  releaseStage: string;
  subjectType: MoralTradeParticipantTermSheetSubjectType;
  policyStatus: MoralTradeCounterpartyBlindingPolicyStatus;
  policyHash: string;
  allowedDisclosureStages: MoralTradeCounterpartyDisclosureStage[];
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
  rawCounterpartyIdentityPublic: boolean;
  rawContactPublic: boolean;
  privateWishPublic: boolean;
  exactPrivateConstraintPublic: boolean;
  hiddenMatchReasoningPublic: boolean;
}

export interface MoralTradeParticipantTermSheetRecord {
  termSheetId: string;
  blindingPolicyRef: string;
  subjectType: MoralTradeParticipantTermSheetSubjectType;
  subjectRef: string;
  termSheetState: MoralTradeParticipantTermSheetState;
  participantTermHash: string;
  counterpartyTermHash: string | null;
  normalizedTermHash: string;
  participantConfirmationRef: string | null;
  counterpartyConfirmationRef: string | null;
  mutualConfirmationHash: string | null;
  freeTextCreatesNewObligations: boolean;
  freeTextCreatesSidePayments: boolean;
  freeTextCreatesNewCounterparties: boolean;
  rawPrivateTermsPublic: boolean;
  reviewerNotesPublic: boolean;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeStagedCounterpartyDisclosureRecord {
  disclosureId: string;
  participantTermSheetRef: string;
  blindingPolicyRef: string;
  disclosureState: MoralTradeStagedCounterpartyDisclosureState;
  visibleUserDisclosureStatus: MoralTradeVisibleCounterpartyDisclosureStatus;
  disclosureStage: MoralTradeCounterpartyDisclosureStage;
  counterpartyVolumeBucket: string;
  redactionHash: string;
  mutualConsentHash: string | null;
  rawCounterpartyIdentityPublic: boolean;
  rawContactPublic: boolean;
  privateWishPublic: boolean;
  exactPrivateConstraintPublic: boolean;
  hiddenMatchReasoningPublic: boolean;
  reviewerNotesPublic: boolean;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeParticipantTermSheetTransitionDefinition {
  key: MoralTradeParticipantTermSheetTransition;
  label: string;
  requiresBlindingPolicy: boolean;
  requiresParticipantTermSheet: boolean;
  requiresStagedDisclosure: boolean;
  requiresMutualConfirmation: boolean;
  requiresMutualDisclosureConsent: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeParticipantTermSheetEvaluationInput {
  transition: MoralTradeParticipantTermSheetTransition;
  checkedAt?: string;
  policies: MoralTradeCounterpartyBlindingPolicyRecord[];
  termSheets: MoralTradeParticipantTermSheetRecord[];
  disclosures: MoralTradeStagedCounterpartyDisclosureRecord[];
}

export interface MoralTradeParticipantTermSheetEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeParticipantTermSheetTransition;
  checkedAt: string;
  requiredPolicyCount: number;
  requiredTermSheetCount: number;
  requiredDisclosureCount: number;
  immutablePolicyCount: number;
  passingTermSheetCount: number;
  stagedDisclosureCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeParticipantTermSheetCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeParticipantTermSheetValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-participant-term-sheet-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeParticipantTermSheetCheck[];
  blockers: string[];
}

export interface MoralTradeParticipantTermSheetContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradeParticipantTermSheetSubjectType[];
  termSheetStates: MoralTradeParticipantTermSheetState[];
  disclosureStates: MoralTradeStagedCounterpartyDisclosureState[];
  visibleDisclosureStatuses: MoralTradeVisibleCounterpartyDisclosureStatus[];
  disclosureStages: MoralTradeCounterpartyDisclosureStage[];
  policyStatuses: MoralTradeCounterpartyBlindingPolicyStatus[];
  failClosedStatuses: Array<
    | MoralTradeCounterpartyBlindingPolicyStatus
    | MoralTradeParticipantTermSheetState
    | MoralTradeStagedCounterpartyDisclosureState
    | MoralTradeVisibleCounterpartyDisclosureStatus
  >;
  transitionDefinitions: MoralTradeParticipantTermSheetTransitionDefinition[];
  sampleEvaluations: MoralTradeParticipantTermSheetEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_POLICY_AGE_DAYS = 90;
const MAX_TERM_SHEET_AGE_DAYS = 30;
const MAX_DISCLOSURE_AGE_DAYS = 30;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_participant_term_sheet_records",
  "moral_trade_counterparty_blinding_policies",
  "moral_trade_staged_counterparty_disclosure_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "participant_term_sheet",
  "counterparty_blinding",
  "staged_counterparty_disclosure",
] as const;

const SUBJECT_TYPES: MoralTradeParticipantTermSheetSubjectType[] = [
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
];

const TERM_SHEET_STATES: MoralTradeParticipantTermSheetState[] = [
  "draft",
  "participant_confirmed",
  "counterparty_confirmed",
  "mutually_confirmed",
  "mismatch",
  "expired",
  "superseded",
  "blocked",
];

const DISCLOSURE_STATES: MoralTradeStagedCounterpartyDisclosureState[] = [
  "not_disclosed",
  "stage_eligible",
  "redacted_disclosed",
  "mutually_consented",
  "over_disclosed",
  "expired",
  "superseded",
  "blocked",
];

const VISIBLE_DISCLOSURE_STATUSES: MoralTradeVisibleCounterpartyDisclosureStatus[] = [
  "not_disclosed",
  "volume_bucket_only",
  "redacted_counterparty",
  "mutual_consent_ready",
  "mutually_disclosed",
  "expired_stale",
  "blocked_needs_review",
];

const DISCLOSURE_STAGES: MoralTradeCounterpartyDisclosureStage[] = [
  "none",
  "cohort_count",
  "redacted_counterparty",
  "mutual_consent",
  "post_lock_public_summary",
];

const PASSING_DISCLOSURE_STATES = new Set<MoralTradeStagedCounterpartyDisclosureState>([
  "stage_eligible",
  "redacted_disclosed",
  "mutually_consented",
]);

const PASSING_VISIBLE_DISCLOSURE_STATUSES = new Set<string>([
  "volume_bucket_only",
  "redacted_counterparty",
  "mutual_consent_ready",
  "mutually_disclosed",
]);

const POLICY_STATUSES: MoralTradeCounterpartyBlindingPolicyStatus[] = [
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
];

const FAIL_CLOSED_STATUSES = [
  "missing",
  "mutable",
  "stale",
  "superseded",
  "draft",
  "mismatch",
  "expired",
  "blocked",
  "not_disclosed",
  "over_disclosed",
  "expired_stale",
  "blocked_needs_review",
] as const;

const TRANSITION_DEFINITIONS: MoralTradeParticipantTermSheetTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresBlindingPolicy: false,
    requiresParticipantTermSheet: false,
    requiresStagedDisclosure: false,
    requiresMutualConfirmation: false,
    requiresMutualDisclosureConsent: false,
    userFacingBlockerCategory: "Participant term sheet is preview-only",
  },
  {
    key: "counterparty_preview",
    label: "Counterparty preview",
    requiresBlindingPolicy: true,
    requiresParticipantTermSheet: false,
    requiresStagedDisclosure: false,
    requiresMutualConfirmation: false,
    requiresMutualDisclosureConsent: false,
    userFacingBlockerCategory: "Counterparty preview needs immutable blinding policy",
  },
  {
    key: "live_offer_publication",
    label: "Live offer publication",
    requiresBlindingPolicy: true,
    requiresParticipantTermSheet: true,
    requiresStagedDisclosure: true,
    requiresMutualConfirmation: false,
    requiresMutualDisclosureConsent: false,
    userFacingBlockerCategory:
      "Offer needs a participant-confirmed term sheet and staged counterparty disclosure policy before it can go live",
  },
  {
    key: "matchable_publication",
    label: "Matchable publication",
    requiresBlindingPolicy: true,
    requiresParticipantTermSheet: true,
    requiresStagedDisclosure: true,
    requiresMutualConfirmation: false,
    requiresMutualDisclosureConsent: false,
    userFacingBlockerCategory:
      "Matching waits for term-sheet hash alignment and counterparty blinding controls",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresBlindingPolicy: true,
    requiresParticipantTermSheet: true,
    requiresStagedDisclosure: true,
    requiresMutualConfirmation: true,
    requiresMutualDisclosureConsent: true,
    userFacingBlockerCategory:
      "Lock waits for mutual confirmation and consented staged disclosure",
  },
  {
    key: "payment_authorization",
    label: "Payment authorization",
    requiresBlindingPolicy: true,
    requiresParticipantTermSheet: true,
    requiresStagedDisclosure: true,
    requiresMutualConfirmation: true,
    requiresMutualDisclosureConsent: true,
    userFacingBlockerCategory:
      "Payment authorization waits for mutually confirmed term-sheet and disclosure consent",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresBlindingPolicy: true,
    requiresParticipantTermSheet: true,
    requiresStagedDisclosure: true,
    requiresMutualConfirmation: true,
    requiresMutualDisclosureConsent: true,
    userFacingBlockerCategory:
      "Payment capture waits for mutually confirmed and privacy-safe term-sheet evidence",
  },
  {
    key: "reliance_bearing_transition",
    label: "Reliance-bearing transition",
    requiresBlindingPolicy: true,
    requiresParticipantTermSheet: true,
    requiresStagedDisclosure: true,
    requiresMutualConfirmation: true,
    requiresMutualDisclosureConsent: true,
    userFacingBlockerCategory:
      "Reliance waits for mutual term-sheet confirmation and staged disclosure consent",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresBlindingPolicy: true,
    requiresParticipantTermSheet: true,
    requiresStagedDisclosure: true,
    requiresMutualConfirmation: true,
    requiresMutualDisclosureConsent: true,
    userFacingBlockerCategory:
      "Public metrics wait for completed privacy-safe term-sheet evidence",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresBlindingPolicy: true,
    requiresParticipantTermSheet: true,
    requiresStagedDisclosure: true,
    requiresMutualConfirmation: true,
    requiresMutualDisclosureConsent: true,
    userFacingBlockerCategory:
      "Release promotion waits for term-sheet mismatch and disclosure-policy controls",
  },
];

const CONTRACT_TESTS = [
  "participant_term_sheet_contract_validator",
  "term_sheet_mismatch_blocking_test",
  "counterparty_blinding_policy_test",
  "staged_counterparty_disclosure_privacy_test",
  "mutual_confirmation_before_lock_test",
  "participant_term_sheet_route_health_spec_and_migration_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeParticipantTermSheetCheck {
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
  overrides: Partial<MoralTradeCounterpartyBlindingPolicyRecord> = {},
): MoralTradeCounterpartyBlindingPolicyRecord {
  return {
    policyId: "counterparty-blinding-policy:tier-1-donation-offset",
    releaseStage: "tier_1_money_only_donation_offset",
    subjectType: "donation_offset",
    policyStatus: "resolved_immutable",
    policyHash: makeHash("counterparty-blinding-policy"),
    allowedDisclosureStages: ["cohort_count", "redacted_counterparty", "mutual_consent"],
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-09-11T12:00:00.000Z",
    supersededBy: null,
    rawCounterpartyIdentityPublic: false,
    rawContactPublic: false,
    privateWishPublic: false,
    exactPrivateConstraintPublic: false,
    hiddenMatchReasoningPublic: false,
    ...overrides,
  };
}

function makeSampleTermSheet(
  overrides: Partial<MoralTradeParticipantTermSheetRecord> = {},
): MoralTradeParticipantTermSheetRecord {
  return {
    termSheetId: "participant-term-sheet:offset-offer-demo",
    blindingPolicyRef: "counterparty-blinding-policy:tier-1-donation-offset",
    subjectType: "donation_offset",
    subjectRef: "offset-offer:demo",
    termSheetState: "mutually_confirmed",
    participantTermHash: makeHash("participant-term-sheet"),
    counterpartyTermHash: makeHash("participant-term-sheet"),
    normalizedTermHash: makeHash("participant-term-sheet"),
    participantConfirmationRef: "participant-confirmation:offset-offer-demo",
    counterpartyConfirmationRef: "participant-confirmation:counterparty-demo",
    mutualConfirmationHash: makeHash("mutual-confirmation"),
    freeTextCreatesNewObligations: false,
    freeTextCreatesSidePayments: false,
    freeTextCreatesNewCounterparties: false,
    rawPrivateTermsPublic: false,
    reviewerNotesPublic: false,
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-07-11T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function makeSampleDisclosure(
  overrides: Partial<MoralTradeStagedCounterpartyDisclosureRecord> = {},
): MoralTradeStagedCounterpartyDisclosureRecord {
  return {
    disclosureId: "staged-counterparty-disclosure:offset-offer-demo",
    participantTermSheetRef: "participant-term-sheet:offset-offer-demo",
    blindingPolicyRef: "counterparty-blinding-policy:tier-1-donation-offset",
    disclosureState: "mutually_consented",
    visibleUserDisclosureStatus: "mutually_disclosed",
    disclosureStage: "mutual_consent",
    counterpartyVolumeBucket: "5_to_9",
    redactionHash: makeHash("counterparty-redaction"),
    mutualConsentHash: makeHash("mutual-disclosure-consent"),
    rawCounterpartyIdentityPublic: false,
    rawContactPublic: false,
    privateWishPublic: false,
    exactPrivateConstraintPublic: false,
    hiddenMatchReasoningPublic: false,
    reviewerNotesPublic: false,
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-07-11T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function getTransitionDefinition(
  transition: MoralTradeParticipantTermSheetTransition,
) {
  return TRANSITION_DEFINITIONS.find((definition) => definition.key === transition);
}

function policyBlocks(
  policy: MoralTradeCounterpartyBlindingPolicyRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (policy.policyStatus !== "resolved_immutable") {
    blockers.push(
      `counterparty_blinding_policy_not_immutable:${policy.policyId}:${policy.policyStatus}`,
    );
  }

  if (!isHash(policy.policyHash)) {
    blockers.push(`counterparty_blinding_policy_hash_invalid:${policy.policyId}`);
  }

  if (!policy.allowedDisclosureStages.length) {
    blockers.push(`counterparty_blinding_disclosure_stages_missing:${policy.policyId}`);
  }

  if (policy.supersededBy) {
    blockers.push(`counterparty_blinding_policy_superseded:${policy.policyId}`);
  }

  if (daysBetween(policy.reviewedAt, checkedAt) > MAX_POLICY_AGE_DAYS) {
    blockers.push(`counterparty_blinding_policy_stale:${policy.policyId}`);
  }

  if (isExpired(policy.expiresAt, checkedAt)) {
    blockers.push(`counterparty_blinding_policy_expired:${policy.policyId}`);
  }

  if (policy.rawCounterpartyIdentityPublic) {
    blockers.push(`raw_counterparty_identity_public:${policy.policyId}`);
  }

  if (policy.rawContactPublic) {
    blockers.push(`raw_contact_public:${policy.policyId}`);
  }

  if (policy.privateWishPublic) {
    blockers.push(`private_wish_public:${policy.policyId}`);
  }

  if (policy.exactPrivateConstraintPublic) {
    blockers.push(`exact_private_constraint_public:${policy.policyId}`);
  }

  if (policy.hiddenMatchReasoningPublic) {
    blockers.push(`hidden_match_reasoning_public:${policy.policyId}`);
  }

  return blockers;
}

function termSheetBlocks({
  checkedAt,
  definition,
  policy,
  termSheet,
}: {
  checkedAt: string;
  definition: MoralTradeParticipantTermSheetTransitionDefinition;
  policy: MoralTradeCounterpartyBlindingPolicyRecord | undefined;
  termSheet: MoralTradeParticipantTermSheetRecord;
}) {
  const blockers: string[] = [];

  if (!policy) {
    blockers.push(`counterparty_blinding_policy_missing:${termSheet.blindingPolicyRef}`);
  }

  if (termSheet.supersededBy) {
    blockers.push(`participant_term_sheet_superseded:${termSheet.termSheetId}`);
  }

  if (!isHash(termSheet.participantTermHash)) {
    blockers.push(`participant_term_sheet_hash_invalid:${termSheet.termSheetId}`);
  }

  if (!isHash(termSheet.normalizedTermHash)) {
    blockers.push(`participant_term_sheet_normalized_hash_invalid:${termSheet.termSheetId}`);
  }

  if (
    termSheet.counterpartyTermHash !== null &&
    !isHash(termSheet.counterpartyTermHash)
  ) {
    blockers.push(`counterparty_term_sheet_hash_invalid:${termSheet.termSheetId}`);
  }

  if (
    termSheet.counterpartyTermHash !== null &&
    termSheet.counterpartyTermHash !== termSheet.normalizedTermHash
  ) {
    blockers.push(`term_sheet_mismatch:${termSheet.termSheetId}`);
  }

  if (termSheet.participantTermHash !== termSheet.normalizedTermHash) {
    blockers.push(`participant_term_sheet_mismatch:${termSheet.termSheetId}`);
  }

  if (termSheet.termSheetState === "mismatch") {
    blockers.push(`term_sheet_mismatch:${termSheet.termSheetId}`);
  }

  if (termSheet.termSheetState === "draft") {
    blockers.push(`participant_term_sheet_still_draft:${termSheet.termSheetId}`);
  }

  if (termSheet.termSheetState === "blocked") {
    blockers.push(`participant_term_sheet_blocked:${termSheet.termSheetId}`);
  }

  if (termSheet.termSheetState === "expired") {
    blockers.push(`participant_term_sheet_state_expired:${termSheet.termSheetId}`);
  }

  if (termSheet.termSheetState === "superseded") {
    blockers.push(`participant_term_sheet_state_superseded:${termSheet.termSheetId}`);
  }

  if (!termSheet.participantConfirmationRef) {
    blockers.push(`participant_confirmation_missing:${termSheet.termSheetId}`);
  }

  if (
    definition.requiresMutualConfirmation &&
    (termSheet.termSheetState !== "mutually_confirmed" ||
      !termSheet.counterpartyConfirmationRef ||
      !isHash(termSheet.mutualConfirmationHash))
  ) {
    blockers.push(`mutual_confirmation_missing:${termSheet.termSheetId}`);
  }

  if (termSheet.freeTextCreatesNewObligations) {
    blockers.push(`term_sheet_free_text_creates_new_obligation:${termSheet.termSheetId}`);
  }

  if (termSheet.freeTextCreatesSidePayments) {
    blockers.push(`term_sheet_free_text_creates_side_payment:${termSheet.termSheetId}`);
  }

  if (termSheet.freeTextCreatesNewCounterparties) {
    blockers.push(`term_sheet_free_text_creates_new_counterparty:${termSheet.termSheetId}`);
  }

  if (termSheet.rawPrivateTermsPublic) {
    blockers.push(`raw_private_terms_public:${termSheet.termSheetId}`);
  }

  if (termSheet.reviewerNotesPublic) {
    blockers.push(`term_sheet_reviewer_notes_public:${termSheet.termSheetId}`);
  }

  if (daysBetween(termSheet.reviewedAt, checkedAt) > MAX_TERM_SHEET_AGE_DAYS) {
    blockers.push(`participant_term_sheet_stale:${termSheet.termSheetId}`);
  }

  if (isExpired(termSheet.expiresAt, checkedAt)) {
    blockers.push(`participant_term_sheet_expired:${termSheet.termSheetId}`);
  }

  return blockers;
}

function disclosureBlocks({
  checkedAt,
  definition,
  disclosure,
  policy,
  termSheet,
}: {
  checkedAt: string;
  definition: MoralTradeParticipantTermSheetTransitionDefinition;
  disclosure: MoralTradeStagedCounterpartyDisclosureRecord;
  policy: MoralTradeCounterpartyBlindingPolicyRecord | undefined;
  termSheet: MoralTradeParticipantTermSheetRecord | undefined;
}) {
  const blockers: string[] = [];

  if (!termSheet) {
    blockers.push(
      `staged_counterparty_disclosure_term_sheet_missing:${disclosure.disclosureId}`,
    );
  }

  if (!policy) {
    blockers.push(
      `staged_counterparty_disclosure_blinding_policy_missing:${disclosure.disclosureId}`,
    );
  } else if (!policy.allowedDisclosureStages.includes(disclosure.disclosureStage)) {
    blockers.push(
      `staged_counterparty_disclosure_stage_not_allowed:${disclosure.disclosureId}:${disclosure.disclosureStage}`,
    );
  }

  if (disclosure.participantTermSheetRef !== termSheet?.termSheetId) {
    blockers.push(
      `staged_counterparty_disclosure_term_sheet_ref_mismatch:${disclosure.disclosureId}`,
    );
  }

  if (disclosure.blindingPolicyRef !== policy?.policyId) {
    blockers.push(
      `staged_counterparty_disclosure_policy_ref_mismatch:${disclosure.disclosureId}`,
    );
  }

  if (disclosure.supersededBy) {
    blockers.push(`staged_counterparty_disclosure_superseded:${disclosure.disclosureId}`);
  }

  if (!isHash(disclosure.redactionHash)) {
    blockers.push(`staged_counterparty_disclosure_redaction_hash_invalid:${disclosure.disclosureId}`);
  }

  if (!PASSING_DISCLOSURE_STATES.has(disclosure.disclosureState)) {
    blockers.push(
      `counterparty_disclosure_policy_blocking:${disclosure.disclosureId}:${disclosure.disclosureState}`,
    );
  }

  if (disclosure.disclosureState === "over_disclosed") {
    blockers.push(`counterparty_disclosure_over_disclosed:${disclosure.disclosureId}`);
  }

  if (!PASSING_VISIBLE_DISCLOSURE_STATUSES.has(disclosure.visibleUserDisclosureStatus)) {
    blockers.push(
      `staged_counterparty_disclosure_visible_status_blocking:${disclosure.disclosureId}:${disclosure.visibleUserDisclosureStatus}`,
    );
  }

  if (
    definition.requiresMutualDisclosureConsent &&
    (disclosure.disclosureState !== "mutually_consented" ||
      !isHash(disclosure.mutualConsentHash))
  ) {
    blockers.push(`staged_disclosure_consent_missing:${disclosure.disclosureId}`);
  }

  if (disclosure.rawCounterpartyIdentityPublic) {
    blockers.push(`raw_counterparty_identity_public:${disclosure.disclosureId}`);
  }

  if (disclosure.rawContactPublic) {
    blockers.push(`raw_contact_public:${disclosure.disclosureId}`);
  }

  if (disclosure.privateWishPublic) {
    blockers.push(`private_wish_public:${disclosure.disclosureId}`);
  }

  if (disclosure.exactPrivateConstraintPublic) {
    blockers.push(`exact_private_constraint_public:${disclosure.disclosureId}`);
  }

  if (disclosure.hiddenMatchReasoningPublic) {
    blockers.push(`hidden_match_reasoning_public:${disclosure.disclosureId}`);
  }

  if (disclosure.reviewerNotesPublic) {
    blockers.push(`staged_counterparty_disclosure_reviewer_notes_public:${disclosure.disclosureId}`);
  }

  if (!disclosure.counterpartyVolumeBucket) {
    blockers.push(`counterparty_volume_bucket_missing:${disclosure.disclosureId}`);
  }

  if (daysBetween(disclosure.reviewedAt, checkedAt) > MAX_DISCLOSURE_AGE_DAYS) {
    blockers.push(`staged_counterparty_disclosure_stale:${disclosure.disclosureId}`);
  }

  if (isExpired(disclosure.expiresAt, checkedAt)) {
    blockers.push(`staged_counterparty_disclosure_expired:${disclosure.disclosureId}`);
  }

  return blockers;
}

export function evaluateMoralTradeParticipantTermSheet(
  input: MoralTradeParticipantTermSheetEvaluationInput,
): MoralTradeParticipantTermSheetEvaluation {
  const definition = getTransitionDefinition(input.transition);
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const blockers: string[] = [];
  const userFacingBlockerCategories = new Set<string>();

  if (!definition) {
    blockers.push(`unknown_participant_term_sheet_transition:${input.transition}`);

    return {
      status: "blocked",
      transition: input.transition,
      checkedAt,
      requiredPolicyCount: 0,
      requiredTermSheetCount: 0,
      requiredDisclosureCount: 0,
      immutablePolicyCount: 0,
      passingTermSheetCount: 0,
      stagedDisclosureCount: 0,
      blockers,
      userFacingBlockerCategories: ["Unknown participant term-sheet transition"],
    };
  }

  if (definition.requiresBlindingPolicy && input.policies.length === 0) {
    blockers.push("counterparty_blinding_policy_required");
  }

  if (definition.requiresParticipantTermSheet && input.termSheets.length === 0) {
    blockers.push("participant_term_sheet_record_required");
  }

  if (definition.requiresStagedDisclosure && input.disclosures.length === 0) {
    blockers.push("staged_counterparty_disclosure_record_required");
  }

  for (const policy of input.policies) {
    blockers.push(...policyBlocks(policy, checkedAt));
  }

  for (const termSheet of input.termSheets) {
    const policy = input.policies.find(
      (candidate) => candidate.policyId === termSheet.blindingPolicyRef,
    );
    blockers.push(
      ...termSheetBlocks({
        checkedAt,
        definition,
        policy,
        termSheet,
      }),
    );
  }

  for (const disclosure of input.disclosures) {
    const policy = input.policies.find(
      (candidate) => candidate.policyId === disclosure.blindingPolicyRef,
    );
    const termSheet = input.termSheets.find(
      (candidate) => candidate.termSheetId === disclosure.participantTermSheetRef,
    );
    blockers.push(
      ...disclosureBlocks({
        checkedAt,
        definition,
        disclosure,
        policy,
        termSheet,
      }),
    );
  }

  if (blockers.length) {
    userFacingBlockerCategories.add(definition.userFacingBlockerCategory);
  }

  const immutablePolicyCount = input.policies.filter(
    (policy) => policy.policyStatus === "resolved_immutable",
  ).length;
  const passingTermSheetCount = input.termSheets.filter(
    (termSheet) =>
      termSheet.termSheetState === "participant_confirmed" ||
      termSheet.termSheetState === "mutually_confirmed",
  ).length;
  const stagedDisclosureCount = input.disclosures.filter((disclosure) =>
    PASSING_DISCLOSURE_STATES.has(disclosure.disclosureState),
  ).length;

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: definition.key,
    checkedAt,
    requiredPolicyCount: definition.requiresBlindingPolicy ? 1 : 0,
    requiredTermSheetCount: definition.requiresParticipantTermSheet ? 1 : 0,
    requiredDisclosureCount: definition.requiresStagedDisclosure ? 1 : 0,
    immutablePolicyCount,
    passingTermSheetCount,
    stagedDisclosureCount,
    blockers: Array.from(new Set(blockers)),
    userFacingBlockerCategories: Array.from(userFacingBlockerCategories),
  };
}

export function getMoralTradeParticipantTermSheetContract(): MoralTradeParticipantTermSheetContract {
  const samplePolicy = makeSamplePolicy();
  const sampleTermSheet = makeSampleTermSheet();
  const sampleDisclosure = makeSampleDisclosure();

  return {
    version: MORAL_TRADE_PARTICIPANT_TERM_SHEET_CONTRACT_VERSION,
    purpose:
      "Fail-closed participant term sheet, counterparty blinding, and staged disclosure contract for donation-offset, pledge-swap, compensated-action, lock, payment, reliance, public metric, and release-gate transitions.",
    failClosedRule:
      "Draft previews can run without records, but live, matchable, payable, reliance-bearing, public-metric, and release-gate transitions require immutable counterparty blinding policy, reviewed participant term sheet hashes, safe staged disclosure records, and mutual confirmation before lock, payment, reliance, or public metrics; mismatches, free-text side terms, stale records, over-disclosure, or public raw counterparty data block.",
    privacyBoundary:
      "Public surfaces may expose table names, status categories, transition rules, counterparty volume buckets, and sample statuses only. They must not expose participant-specific term sheets, raw counterparty identities, contact details, private wishes, exact constraints, hidden match reasoning, source evidence, reviewer notes, payment details, or participant-specific disclosure records.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: SUBJECT_TYPES,
    termSheetStates: TERM_SHEET_STATES,
    disclosureStates: DISCLOSURE_STATES,
    visibleDisclosureStatuses: VISIBLE_DISCLOSURE_STATUSES,
    disclosureStages: DISCLOSURE_STAGES,
    policyStatuses: POLICY_STATUSES,
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    transitionDefinitions: TRANSITION_DEFINITIONS,
    sampleEvaluations: [
      evaluateMoralTradeParticipantTermSheet({
        transition: "draft_preview",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [],
        termSheets: [],
        disclosures: [],
      }),
      evaluateMoralTradeParticipantTermSheet({
        transition: "live_offer_publication",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [samplePolicy],
        termSheets: [
          makeSampleTermSheet({
            termSheetState: "participant_confirmed",
            counterpartyConfirmationRef: null,
            mutualConfirmationHash: null,
          }),
        ],
        disclosures: [
          makeSampleDisclosure({
            disclosureState: "redacted_disclosed",
            visibleUserDisclosureStatus: "redacted_counterparty",
            disclosureStage: "redacted_counterparty",
            mutualConsentHash: null,
          }),
        ],
      }),
      evaluateMoralTradeParticipantTermSheet({
        transition: "matched_trade_lock",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [samplePolicy],
        termSheets: [sampleTermSheet],
        disclosures: [sampleDisclosure],
      }),
      evaluateMoralTradeParticipantTermSheet({
        transition: "matched_trade_lock",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [samplePolicy],
        termSheets: [
          makeSampleTermSheet({
            termSheetId: "participant-term-sheet:mismatch-demo",
            participantTermHash: makeHash("participant-terms-a"),
            counterpartyTermHash: makeHash("counterparty-terms-b"),
            normalizedTermHash: makeHash("participant-terms-a"),
            termSheetState: "mismatch",
          }),
        ],
        disclosures: [
          makeSampleDisclosure({
            participantTermSheetRef: "participant-term-sheet:mismatch-demo",
          }),
        ],
      }),
      evaluateMoralTradeParticipantTermSheet({
        transition: "payment_authorization",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [
          makeSamplePolicy({
            policyStatus: "mutable",
          }),
        ],
        termSheets: [sampleTermSheet],
        disclosures: [
          makeSampleDisclosure({
            rawCounterpartyIdentityPublic: true,
          }),
        ],
      }),
    ],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeParticipantTermSheetContract(
  contract: MoralTradeParticipantTermSheetContract = getMoralTradeParticipantTermSheetContract(),
): MoralTradeParticipantTermSheetValidation {
  const checks = [
    check(
      "versioned-contract",
      "Contract version is pinned",
      contract.version === MORAL_TRADE_PARTICIPANT_TERM_SHEET_CONTRACT_VERSION,
      contract.version,
    ),
    check(
      "first-class-records",
      "First-class record tables are declared",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Policy snapshot subjects include term sheet, blinding, and staged disclosure",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "state-coverage",
      "Fail-closed state coverage includes mismatches and over-disclosure",
      contract.termSheetStates.includes("mismatch") &&
        contract.disclosureStates.includes("over_disclosed") &&
        contract.visibleDisclosureStatuses.includes("blocked_needs_review"),
      [
        contract.termSheetStates.join("|"),
        contract.disclosureStates.join("|"),
        contract.visibleDisclosureStatuses.join("|"),
      ].join(", "),
    ),
    check(
      "transition-coverage",
      "Payment, reliance, public metric, and release transitions require mutual confirmation",
      contract.transitionDefinitions.some(
        (transition) =>
          transition.key === "payment_capture" &&
          transition.requiresMutualConfirmation &&
          transition.requiresMutualDisclosureConsent,
      ) &&
        contract.transitionDefinitions.some(
          (transition) =>
            transition.key === "public_metric_publication" &&
            transition.requiresMutualConfirmation &&
            transition.requiresMutualDisclosureConsent,
        ) &&
        contract.transitionDefinitions.some(
          (transition) =>
            transition.key === "release_gate_promotion" &&
            transition.requiresParticipantTermSheet,
        ),
      contract.transitionDefinitions
        .map((transition) => `${transition.key}:${transition.requiresMutualConfirmation}`)
        .join(", "),
    ),
    check(
      "sample-evaluations",
      "Sample evaluations cover pass and fail-closed states",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.transition === "matched_trade_lock" &&
          evaluation.status === "pass",
      ) &&
        contract.sampleEvaluations.some((evaluation) =>
          evaluation.blockers.some((blocker) => /term_sheet_mismatch/i.test(blocker)),
        ) &&
        contract.sampleEvaluations.some((evaluation) =>
          evaluation.blockers.some((blocker) =>
            /counterparty_blinding_policy_not_immutable|raw_counterparty_identity_public/i.test(
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
      "Public boundary excludes term sheets, raw counterparty data, and private constraints",
      /participant-specific term sheets/i.test(contract.privacyBoundary) &&
        /raw counterparty identities/i.test(contract.privacyBoundary) &&
        /private wishes/i.test(contract.privacyBoundary) &&
        /exact constraints/i.test(contract.privacyBoundary) &&
        /reviewer notes/i.test(contract.privacyBoundary),
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
    validatorName: "moral-trade-participant-term-sheet-contract",
    validatorVersion: MORAL_TRADE_PARTICIPANT_TERM_SHEET_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
