export const MORAL_TRADE_MATCHING_CLEARING_CONTRACT_VERSION =
  "moral-trade-matching-clearing-v0.1-2026-06";
export const MORAL_TRADE_MATCHING_CLEARING_VALIDATOR_VERSION =
  "moral-trade-matching-clearing-validator-v0.1";

export type MoralTradeMatchingClearingFlowType =
  | "donation_offset_batch"
  | "pledge_swap_preview"
  | "broad_match_candidate"
  | "public_goods_round";

export type MoralTradeMatchingClearingRunStatus =
  | "draft"
  | "dry_run"
  | "reviewed"
  | "blocked"
  | "locked"
  | "superseded"
  | "expired";

export type MoralTradeMatchedTradeLockProposalStatus =
  | "draft"
  | "participant_review"
  | "confirmed"
  | "locked"
  | "declined"
  | "expired"
  | "superseded"
  | "blocked";

export type MoralTradeMatchedTradeLockProposalSubject =
  | "donation_offset_batch"
  | "pledge_swap_match"
  | "broad_match_candidate"
  | "public_goods_round";

export type MoralTradeMatchingClearingReviewStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "stale"
  | "superseded";

export type MoralTradeMatchingClearingRatioBoundsStatus =
  | "passed"
  | "missing"
  | "under_review"
  | "failed"
  | "out_of_bounds"
  | "stale"
  | "superseded";

export type MoralTradeMatchedTradeConfirmationState =
  | "missing"
  | "stale"
  | "scope_mismatch"
  | "passed"
  | "not_required_for_stage";

export type MoralTradeMatchingClearingFailClosedStatus =
  | "run_missing"
  | "algorithm_version_missing"
  | "deterministic_algorithm_missing"
  | "input_bundle_hash_missing"
  | "input_bundle_hash_invalid"
  | "privacy_policy_missing"
  | "state_interpretation_policy_missing"
  | "excluded_records_missing"
  | "excluded_records_hash_invalid"
  | "result_hash_missing"
  | "result_hash_invalid"
  | "run_not_reviewed"
  | "run_blocked"
  | "run_stale"
  | "run_superseded"
  | "manual_override_unapproved"
  | "database_order_matching"
  | "hidden_match_reasoning"
  | "payable_without_run"
  | "reliance_without_run"
  | "reproducibility_check_missing"
  | "reproducibility_check_failed"
  | "lock_proposal_missing"
  | "lock_proposal_not_current"
  | "lock_proposal_stale"
  | "lock_proposal_superseded"
  | "lock_terms_hash_missing"
  | "lock_terms_hash_invalid"
  | "counterparty_bucket_hash_missing"
  | "matched_volume_hash_missing"
  | "participant_confirmation_missing"
  | "participant_confirmation_stale"
  | "participant_confirmation_scope_mismatch"
  | "ratio_bounds_failed"
  | "baseline_snapshot_missing"
  | "destination_verification_missing"
  | "commitment_reservation_missing"
  | "atomic_settlement_missing"
  | "fallback_terms_hash_missing"
  | "evidence_standard_hash_missing"
  | "private_counterparty_data_public"
  | "invalid_run_hash"
  | "invalid_proposal_hash";

export interface MoralTradeMatchingClearingRunRecord {
  runId: string;
  flowType: MoralTradeMatchingClearingFlowType;
  runStatus: MoralTradeMatchingClearingRunStatus;
  algorithmVersion: string;
  deterministicAlgorithm: boolean;
  inputBundleHash: string | null;
  excludedRecordsHash: string | null;
  privacyPolicySnapshotRef: string | null;
  stateInterpretationPolicyRef: string | null;
  resultHash: string | null;
  reproducibilityCheckStatus: MoralTradeMatchingClearingReviewStatus;
  manualOverrideUsed: boolean;
  manualOverrideApproved: boolean;
  databaseOrderMatching: boolean;
  hiddenMatchReasoning: boolean;
  payableTransition: boolean;
  relianceBearingTransition: boolean;
  privateCounterpartyDataPublic: boolean;
  runHash: string;
  reviewedAt: string | null;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeMatchedTradeLockProposalRecord {
  proposalId: string;
  matchingClearingRunRef: string;
  proposalSubjectKind: MoralTradeMatchedTradeLockProposalSubject;
  proposalStatus: MoralTradeMatchedTradeLockProposalStatus;
  exactTermsHash: string | null;
  counterpartyBucketHash: string | null;
  matchedVolumeHash: string | null;
  clearingRatioBps: number;
  ratioBoundsStatus: MoralTradeMatchingClearingRatioBoundsStatus;
  baselineSnapshotHash: string | null;
  destinationVerificationRef: string | null;
  commitmentReservationRef: string | null;
  atomicSettlementGroupRef: string | null;
  finalConfirmationRefs: string[];
  confirmationState: MoralTradeMatchedTradeConfirmationState;
  fallbackTermsHash: string | null;
  evidenceStandardHash: string | null;
  privateCounterpartyDataPublic: boolean;
  proposalHash: string;
  reviewedAt: string | null;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeMatchingClearingEvaluationInput {
  flowType: MoralTradeMatchingClearingFlowType;
  requiresPayableTransition: boolean;
  requiresRelianceBearingTransition: boolean;
  requiresLockProposal: boolean;
  checkedAt?: string;
  runs: MoralTradeMatchingClearingRunRecord[];
  lockProposals: MoralTradeMatchedTradeLockProposalRecord[];
}

export interface MoralTradeMatchingClearingEvaluation {
  status: "pass" | "blocked";
  flowType: MoralTradeMatchingClearingFlowType;
  checkedAt: string;
  runCount: number;
  lockProposalCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeMatchingClearingFlowDefinition {
  key: MoralTradeMatchingClearingFlowType;
  label: string;
  protectedBoundary: string;
  requiredRecords: string[];
  blocksTransitions: string[];
}

export interface MoralTradeMatchingClearingCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeMatchingClearingValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-matching-clearing-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeMatchingClearingCheck[];
  blockers: string[];
}

export interface MoralTradeMatchingClearingContract {
  version: string;
  purpose: string;
  privacyRule: string;
  failClosedRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  flowTypes: MoralTradeMatchingClearingFlowType[];
  runStatuses: MoralTradeMatchingClearingRunStatus[];
  lockProposalStatuses: MoralTradeMatchedTradeLockProposalStatus[];
  lockProposalSubjects: MoralTradeMatchedTradeLockProposalSubject[];
  failClosedStatuses: MoralTradeMatchingClearingFailClosedStatus[];
  flowDefinitions: MoralTradeMatchingClearingFlowDefinition[];
  sampleEvaluations: MoralTradeMatchingClearingEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_RUN_AGE_DAYS = 30;
const MAX_PROPOSAL_AGE_DAYS = 14;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_matching_clearing_runs",
  "moral_trade_matched_trade_lock_proposals",
  "moral_trade_matching_clearing_reproducibility_checks",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "matching_clearing",
  "matched_trade_lock",
] as const;

const FLOW_TYPES: MoralTradeMatchingClearingFlowType[] = [
  "donation_offset_batch",
  "pledge_swap_preview",
  "broad_match_candidate",
  "public_goods_round",
];

const RUN_STATUSES: MoralTradeMatchingClearingRunStatus[] = [
  "draft",
  "dry_run",
  "reviewed",
  "blocked",
  "locked",
  "superseded",
  "expired",
];

const LOCK_PROPOSAL_STATUSES: MoralTradeMatchedTradeLockProposalStatus[] = [
  "draft",
  "participant_review",
  "confirmed",
  "locked",
  "declined",
  "expired",
  "superseded",
  "blocked",
];

const LOCK_PROPOSAL_SUBJECTS: MoralTradeMatchedTradeLockProposalSubject[] = [
  "donation_offset_batch",
  "pledge_swap_match",
  "broad_match_candidate",
  "public_goods_round",
];

const FAIL_CLOSED_STATUSES: MoralTradeMatchingClearingFailClosedStatus[] = [
  "run_missing",
  "algorithm_version_missing",
  "deterministic_algorithm_missing",
  "input_bundle_hash_missing",
  "input_bundle_hash_invalid",
  "privacy_policy_missing",
  "state_interpretation_policy_missing",
  "excluded_records_missing",
  "excluded_records_hash_invalid",
  "result_hash_missing",
  "result_hash_invalid",
  "run_not_reviewed",
  "run_blocked",
  "run_stale",
  "run_superseded",
  "manual_override_unapproved",
  "database_order_matching",
  "hidden_match_reasoning",
  "payable_without_run",
  "reliance_without_run",
  "reproducibility_check_missing",
  "reproducibility_check_failed",
  "lock_proposal_missing",
  "lock_proposal_not_current",
  "lock_proposal_stale",
  "lock_proposal_superseded",
  "lock_terms_hash_missing",
  "lock_terms_hash_invalid",
  "counterparty_bucket_hash_missing",
  "matched_volume_hash_missing",
  "participant_confirmation_missing",
  "participant_confirmation_stale",
  "participant_confirmation_scope_mismatch",
  "ratio_bounds_failed",
  "baseline_snapshot_missing",
  "destination_verification_missing",
  "commitment_reservation_missing",
  "atomic_settlement_missing",
  "fallback_terms_hash_missing",
  "evidence_standard_hash_missing",
  "private_counterparty_data_public",
  "invalid_run_hash",
  "invalid_proposal_hash",
];

const FLOW_DEFINITIONS: MoralTradeMatchingClearingFlowDefinition[] = [
  {
    key: "donation_offset_batch",
    label: "Donation offset batch",
    protectedBoundary:
      "batch clearing cannot become payable until a deterministic run and matched-trade lock proposal are frozen and confirmed",
    requiredRecords: [...FIRST_CLASS_RECORD_TABLES],
    blocksTransitions: ["payment_capture", "cleared_trade_lock", "public_completed_claim"],
  },
  {
    key: "pledge_swap_preview",
    label: "Pledge swap preview",
    protectedBoundary:
      "reliance-bearing pledge swaps cannot use hidden reasoning, operator judgment, or database-order matching",
    requiredRecords: [...FIRST_CLASS_RECORD_TABLES],
    blocksTransitions: ["reliance_bearing_preview", "matched_trade_lock", "performance_start"],
  },
  {
    key: "broad_match_candidate",
    label: "Broad match candidate",
    protectedBoundary:
      "broad candidates are generated from frozen privacy-safe input bundles without exposing private counterparties",
    requiredRecords: ["moral_trade_matching_clearing_runs"],
    blocksTransitions: ["candidate_publication", "counterparty_preview", "matched_trade_lock_candidate"],
  },
  {
    key: "public_goods_round",
    label: "Public goods round",
    protectedBoundary:
      "round-level clearing previews bind to deterministic algorithm and frozen result hashes before public metrics",
    requiredRecords: ["moral_trade_matching_clearing_runs", "moral_trade_matching_clearing_reproducibility_checks"],
    blocksTransitions: ["round_close_publication", "bonus_allocation", "public_money_metric"],
  },
];

const CONTRACT_TESTS = [
  "matching_clearing_contract_validator",
  "matching_clearing_evaluator_fail_closed",
  "matching_clearing_route_contract",
  "matching_clearing_schema_contract",
  "matching_clearing_health_contract",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeMatchingClearingCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function daysBetween(startIso: string, endIso: string) {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, (end - start) / 86_400_000);
}

function isExpired(expiresAt: string | null, checkedAt: string) {
  return Boolean(expiresAt && Date.parse(expiresAt) <= Date.parse(checkedAt));
}

function hasHash(value: string | null) {
  return Boolean(value && value.trim());
}

function hasValidHash(value: string | null) {
  return Boolean(value && HASH_PATTERN.test(value));
}

function isRunCurrent(run: MoralTradeMatchingClearingRunRecord, checkedAt: string) {
  if (
    run.runStatus === "superseded" ||
    run.runStatus === "expired" ||
    run.supersededBy ||
    isExpired(run.expiresAt, checkedAt) ||
    !run.reviewedAt
  ) {
    return false;
  }

  return daysBetween(run.reviewedAt, checkedAt) <= MAX_RUN_AGE_DAYS;
}

function isRunNonBlocking(run: MoralTradeMatchingClearingRunRecord) {
  return run.runStatus === "reviewed" || run.runStatus === "locked";
}

function isProposalCurrent(
  proposal: MoralTradeMatchedTradeLockProposalRecord,
  checkedAt: string,
) {
  if (
    proposal.proposalStatus === "superseded" ||
    proposal.proposalStatus === "expired" ||
    proposal.supersededBy ||
    isExpired(proposal.expiresAt, checkedAt) ||
    !proposal.reviewedAt
  ) {
    return false;
  }

  return daysBetween(proposal.reviewedAt, checkedAt) <= MAX_PROPOSAL_AGE_DAYS;
}

function isProposalNonBlocking(proposal: MoralTradeMatchedTradeLockProposalRecord) {
  return proposal.proposalStatus === "confirmed" || proposal.proposalStatus === "locked";
}

function proposalSubjectForFlow(
  flowType: MoralTradeMatchingClearingFlowType,
): MoralTradeMatchedTradeLockProposalSubject {
  if (flowType === "pledge_swap_preview") {
    return "pledge_swap_match";
  }

  return flowType;
}

function runBlockers(
  run: MoralTradeMatchingClearingRunRecord,
  input: MoralTradeMatchingClearingEvaluationInput,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (!run.algorithmVersion.trim()) {
    blockers.push(`algorithm_version_missing:${run.runId}`);
  }

  if (!run.deterministicAlgorithm) {
    blockers.push(`deterministic_algorithm_missing:${run.runId}`);
  }

  if (!hasHash(run.inputBundleHash)) {
    blockers.push(`input_bundle_hash_missing:${run.runId}`);
  } else if (!hasValidHash(run.inputBundleHash)) {
    blockers.push(`input_bundle_hash_invalid:${run.runId}`);
  }

  if (!hasHash(run.excludedRecordsHash)) {
    blockers.push(`excluded_records_missing:${run.runId}`);
  } else if (!hasValidHash(run.excludedRecordsHash)) {
    blockers.push(`excluded_records_hash_invalid:${run.runId}`);
  }

  if (!run.privacyPolicySnapshotRef) {
    blockers.push(`privacy_policy_missing:${run.runId}`);
  }

  if (!run.stateInterpretationPolicyRef) {
    blockers.push(`state_interpretation_policy_missing:${run.runId}`);
  }

  if (!hasHash(run.resultHash)) {
    blockers.push(`result_hash_missing:${run.runId}`);
  } else if (!hasValidHash(run.resultHash)) {
    blockers.push(`result_hash_invalid:${run.runId}`);
  }

  if (run.runStatus === "blocked") {
    blockers.push(`run_blocked:${run.runId}`);
  }

  if (!isRunNonBlocking(run)) {
    blockers.push(`run_not_reviewed:${run.runId}`);
  }

  if (!isRunCurrent(run, checkedAt)) {
    blockers.push(`run_stale:${run.runId}`);
  }

  if (run.runStatus === "superseded" || run.supersededBy) {
    blockers.push(`run_superseded:${run.runId}`);
  }

  if (run.manualOverrideUsed && !run.manualOverrideApproved) {
    blockers.push(`manual_override_unapproved:${run.runId}`);
  }

  if (run.databaseOrderMatching) {
    blockers.push(`database_order_matching:${run.runId}`);
  }

  if (run.hiddenMatchReasoning) {
    blockers.push(`hidden_match_reasoning:${run.runId}`);
  }

  if (input.requiresPayableTransition && !run.payableTransition) {
    blockers.push(`payable_without_run:${run.runId}`);
  }

  if (input.requiresRelianceBearingTransition && !run.relianceBearingTransition) {
    blockers.push(`reliance_without_run:${run.runId}`);
  }

  if (run.reproducibilityCheckStatus === "missing") {
    blockers.push(`reproducibility_check_missing:${run.runId}`);
  }

  if (
    run.reproducibilityCheckStatus !== "passed" &&
    run.reproducibilityCheckStatus !== "not_required_for_stage" &&
    run.reproducibilityCheckStatus !== "missing"
  ) {
    blockers.push(`reproducibility_check_failed:${run.runId}`);
  }

  if (run.privateCounterpartyDataPublic) {
    blockers.push(`private_counterparty_data_public:${run.runId}`);
  }

  if (!hasValidHash(run.runHash)) {
    blockers.push(`invalid_run_hash:${run.runId}`);
  }

  return blockers;
}

function proposalBlockers(
  proposal: MoralTradeMatchedTradeLockProposalRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (!isProposalNonBlocking(proposal)) {
    blockers.push(`lock_proposal_not_current:${proposal.proposalId}`);
  }

  if (!isProposalCurrent(proposal, checkedAt)) {
    blockers.push(`lock_proposal_stale:${proposal.proposalId}`);
  }

  if (proposal.proposalStatus === "superseded" || proposal.supersededBy) {
    blockers.push(`lock_proposal_superseded:${proposal.proposalId}`);
  }

  if (!hasHash(proposal.exactTermsHash)) {
    blockers.push(`lock_terms_hash_missing:${proposal.proposalId}`);
  } else if (!hasValidHash(proposal.exactTermsHash)) {
    blockers.push(`lock_terms_hash_invalid:${proposal.proposalId}`);
  }

  if (!hasValidHash(proposal.counterpartyBucketHash)) {
    blockers.push(`counterparty_bucket_hash_missing:${proposal.proposalId}`);
  }

  if (!hasValidHash(proposal.matchedVolumeHash)) {
    blockers.push(`matched_volume_hash_missing:${proposal.proposalId}`);
  }

  if (proposal.finalConfirmationRefs.length === 0 || proposal.confirmationState === "missing") {
    blockers.push(`participant_confirmation_missing:${proposal.proposalId}`);
  }

  if (proposal.confirmationState === "stale") {
    blockers.push(`participant_confirmation_stale:${proposal.proposalId}`);
  }

  if (proposal.confirmationState === "scope_mismatch") {
    blockers.push(`participant_confirmation_scope_mismatch:${proposal.proposalId}`);
  }

  if (proposal.ratioBoundsStatus !== "passed") {
    blockers.push(`ratio_bounds_failed:${proposal.proposalId}`);
  }

  if (!hasValidHash(proposal.baselineSnapshotHash)) {
    blockers.push(`baseline_snapshot_missing:${proposal.proposalId}`);
  }

  if (!proposal.destinationVerificationRef) {
    blockers.push(`destination_verification_missing:${proposal.proposalId}`);
  }

  if (!proposal.commitmentReservationRef) {
    blockers.push(`commitment_reservation_missing:${proposal.proposalId}`);
  }

  if (!proposal.atomicSettlementGroupRef) {
    blockers.push(`atomic_settlement_missing:${proposal.proposalId}`);
  }

  if (!hasValidHash(proposal.fallbackTermsHash)) {
    blockers.push(`fallback_terms_hash_missing:${proposal.proposalId}`);
  }

  if (!hasValidHash(proposal.evidenceStandardHash)) {
    blockers.push(`evidence_standard_hash_missing:${proposal.proposalId}`);
  }

  if (proposal.privateCounterpartyDataPublic) {
    blockers.push(`private_counterparty_data_public:${proposal.proposalId}`);
  }

  if (!hasValidHash(proposal.proposalHash)) {
    blockers.push(`invalid_proposal_hash:${proposal.proposalId}`);
  }

  return blockers;
}

function userFacingCategories(blockers: string[]) {
  const categories = new Set<string>();

  for (const blocker of blockers) {
    if (
      blocker.includes("run_") ||
      blocker.includes("algorithm") ||
      blocker.includes("bundle") ||
      blocker.includes("result_hash") ||
      blocker.includes("reproducibility")
    ) {
      categories.add("Matching-clearing run is not reproducible");
    } else if (
      blocker.includes("lock_proposal") ||
      blocker.includes("participant_confirmation") ||
      blocker.includes("terms_hash")
    ) {
      categories.add("Final matched terms are not locked and confirmed");
    } else if (
      blocker.includes("baseline") ||
      blocker.includes("ratio") ||
      blocker.includes("destination") ||
      blocker.includes("reservation") ||
      blocker.includes("settlement")
    ) {
      categories.add("Clearing economics and settlement controls are incomplete");
    } else if (blocker.includes("private") || blocker.includes("hidden")) {
      categories.add("Private matching data cannot be exposed or hidden from review");
    } else {
      categories.add("Matching-clearing transition is not ready");
    }
  }

  return Array.from(categories);
}

export function evaluateMoralTradeMatchingClearing(
  input: MoralTradeMatchingClearingEvaluationInput,
): MoralTradeMatchingClearingEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const matchingRuns = input.runs.filter((run) => run.flowType === input.flowType);
  const activeRun =
    matchingRuns.find((run) => isRunNonBlocking(run) && isRunCurrent(run, checkedAt)) ??
    matchingRuns[0];
  const expectedSubject = proposalSubjectForFlow(input.flowType);
  const matchingProposals = activeRun
    ? input.lockProposals.filter(
        (proposal) =>
          proposal.matchingClearingRunRef === activeRun.runId &&
          proposal.proposalSubjectKind === expectedSubject,
      )
    : [];
  const activeProposal =
    matchingProposals.find((proposal) =>
      isProposalNonBlocking(proposal) && isProposalCurrent(proposal, checkedAt),
    ) ?? matchingProposals[0];
  const blockers: string[] = [];

  if (!activeRun) {
    blockers.push(`run_missing:${input.flowType}`);

    if (input.requiresPayableTransition) {
      blockers.push(`payable_without_run:${input.flowType}`);
    }

    if (input.requiresRelianceBearingTransition) {
      blockers.push(`reliance_without_run:${input.flowType}`);
    }
  } else {
    blockers.push(...runBlockers(activeRun, input, checkedAt));
  }

  if (input.requiresLockProposal) {
    if (!activeProposal) {
      blockers.push(`lock_proposal_missing:${input.flowType}`);
    } else {
      blockers.push(...proposalBlockers(activeProposal, checkedAt));
    }
  }

  const uniqueBlockers = Array.from(new Set(blockers));

  return {
    status: uniqueBlockers.length ? "blocked" : "pass",
    flowType: input.flowType,
    checkedAt,
    runCount: matchingRuns.length,
    lockProposalCount: matchingProposals.length,
    blockers: uniqueBlockers,
    userFacingBlockerCategories: userFacingCategories(uniqueBlockers),
  };
}

function sampleRun(
  flowType: MoralTradeMatchingClearingFlowType,
  overrides: Partial<MoralTradeMatchingClearingRunRecord> = {},
): MoralTradeMatchingClearingRunRecord {
  return {
    runId: `matching-clearing-run-${flowType}`,
    flowType,
    runStatus: "reviewed",
    algorithmVersion: `${MORAL_TRADE_MATCHING_CLEARING_CONTRACT_VERSION}:deterministic-v1`,
    deterministicAlgorithm: true,
    inputBundleHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    excludedRecordsHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    privacyPolicySnapshotRef: "policy-snapshot:privacy-matching-v1",
    stateInterpretationPolicyRef: "state-policy:matching-clearing-v1",
    resultHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    reproducibilityCheckStatus: "passed",
    manualOverrideUsed: false,
    manualOverrideApproved: false,
    databaseOrderMatching: false,
    hiddenMatchReasoning: false,
    payableTransition: flowType === "donation_offset_batch" || flowType === "public_goods_round",
    relianceBearingTransition:
      flowType === "pledge_swap_preview" || flowType === "donation_offset_batch",
    privateCounterpartyDataPublic: false,
    runHash:
      "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-06-25T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function sampleLockProposal(
  flowType: MoralTradeMatchingClearingFlowType,
  runRef: string,
  overrides: Partial<MoralTradeMatchedTradeLockProposalRecord> = {},
): MoralTradeMatchedTradeLockProposalRecord {
  return {
    proposalId: `matched-trade-lock-proposal-${flowType}`,
    matchingClearingRunRef: runRef,
    proposalSubjectKind: proposalSubjectForFlow(flowType),
    proposalStatus: "confirmed",
    exactTermsHash:
      "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    counterpartyBucketHash:
      "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    matchedVolumeHash:
      "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    clearingRatioBps: 5000,
    ratioBoundsStatus: "passed",
    baselineSnapshotHash:
      "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    destinationVerificationRef: "recipient-destination-review:verified",
    commitmentReservationRef: "commitment-reservation:reserved",
    atomicSettlementGroupRef: "atomic-settlement-group:all-or-none",
    finalConfirmationRefs: ["participant-confirmation:final-lock-a", "participant-confirmation:final-lock-b"],
    confirmationState: "passed",
    fallbackTermsHash:
      "sha256:3333333333333333333333333333333333333333333333333333333333333333",
    evidenceStandardHash:
      "sha256:4444444444444444444444444444444444444444444444444444444444444444",
    privateCounterpartyDataPublic: false,
    proposalHash:
      "sha256:5555555555555555555555555555555555555555555555555555555555555555",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-06-15T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function buildSampleEvaluations() {
  const donationRun = sampleRun("donation_offset_batch");
  const donationProposal = sampleLockProposal(
    "donation_offset_batch",
    donationRun.runId,
  );
  const blockedPledgeRun = sampleRun("pledge_swap_preview", {
    runStatus: "dry_run",
    algorithmVersion: "",
    resultHash: "invalid-hash",
    reproducibilityCheckStatus: "failed",
    hiddenMatchReasoning: true,
    payableTransition: false,
    relianceBearingTransition: false,
  });

  return [
    evaluateMoralTradeMatchingClearing({
      flowType: "donation_offset_batch",
      requiresPayableTransition: true,
      requiresRelianceBearingTransition: true,
      requiresLockProposal: true,
      checkedAt: "2026-06-02T00:00:00.000Z",
      runs: [donationRun],
      lockProposals: [donationProposal],
    }),
    evaluateMoralTradeMatchingClearing({
      flowType: "pledge_swap_preview",
      requiresPayableTransition: false,
      requiresRelianceBearingTransition: true,
      requiresLockProposal: true,
      checkedAt: "2026-06-02T00:00:00.000Z",
      runs: [blockedPledgeRun],
      lockProposals: [],
    }),
  ];
}

export function getMoralTradeMatchingClearingContract(): MoralTradeMatchingClearingContract {
  return {
    version: MORAL_TRADE_MATCHING_CLEARING_CONTRACT_VERSION,
    purpose:
      "Fail-closed matching-clearing governance for deterministic frozen input bundles, reproducibility checks, privacy-safe result hashes, and fresh matched-trade lock proposals before donation-offset batches, pledge-swap previews, broad match candidates, or public-goods clearing can become payable, reliance-bearing, or publicly counted.",
    privacyRule:
      "Public matching-clearing contract responses expose only static flow names, table names, statuses, validation blockers, and sample pass/block states; they never expose raw input bundles, private counterparty data, exact private constraints, hidden match reasoning, reviewer notes, or participant-specific final confirmations.",
    failClosedRule:
      "Ad hoc matching is not clearing: missing matching_clearing_run, mutable or unreproducible inputs, database-order matching, hidden match reasoning, missing privacy or state policy, missing reproducibility check, missing matched_trade_lock_proposal, stale final confirmations, failed ratio bounds, missing baseline snapshots, unverified destination, missing commitment reservation, or missing atomic settlement blocks payable and reliance-bearing clearing.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    flowTypes: [...FLOW_TYPES],
    runStatuses: [...RUN_STATUSES],
    lockProposalStatuses: [...LOCK_PROPOSAL_STATUSES],
    lockProposalSubjects: [...LOCK_PROPOSAL_SUBJECTS],
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    flowDefinitions: [...FLOW_DEFINITIONS],
    sampleEvaluations: buildSampleEvaluations(),
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeMatchingClearingContract(
  contract = getMoralTradeMatchingClearingContract(),
): MoralTradeMatchingClearingValidation {
  const checks = [
    check(
      "record-table-coverage",
      "Matching-clearing has first-class run, lock proposal, and reproducibility check tables",
      hasAll(contract.firstClassRecordTables, FIRST_CLASS_RECORD_TABLES),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-subject-coverage",
      "Matching-clearing and matched-trade locks are frozen policy-snapshot subjects",
      hasAll(contract.policySnapshotSubjects, POLICY_SNAPSHOT_SUBJECTS),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "flow-coverage",
      "Donation offsets, pledge swaps, broad candidates, and public-goods rounds are covered",
      hasAll(contract.flowTypes, FLOW_TYPES),
      contract.flowTypes.join(", "),
    ),
    check(
      "status-coverage",
      "Run and lock-proposal lifecycles include draft, review, lock, stale, and superseded states",
      hasAll(contract.runStatuses, RUN_STATUSES) &&
        hasAll(contract.lockProposalStatuses, LOCK_PROPOSAL_STATUSES),
      `${contract.runStatuses.join(", ")}; ${contract.lockProposalStatuses.join(", ")}`,
    ),
    check(
      "fail-closed-coverage",
      "Fail-closed statuses cover reproducibility, privacy, final confirmation, ratio, baseline, destination, reservation, and atomic settlement blockers",
      hasAll(contract.failClosedStatuses, FAIL_CLOSED_STATUSES),
      contract.failClosedStatuses.join(", "),
    ),
    check(
      "flow-definition-coverage",
      "Every matching-clearing flow lists required records and blocked transitions",
      contract.flowDefinitions.every(
        (definition) =>
          contract.flowTypes.includes(definition.key) &&
          definition.requiredRecords.length > 0 &&
          definition.blocksTransitions.length > 0,
      ),
      contract.flowDefinitions
        .map((definition) => `${definition.key}:${definition.requiredRecords.length}`)
        .join(", "),
    ),
    check(
      "sample-evaluation-coverage",
      "Sample evaluations prove donation-offset clearing can pass and pledge-swap reliance blocks without reproducible run and lock proposal",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.flowType === "donation_offset_batch" &&
          evaluation.status === "pass",
      ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.flowType === "pledge_swap_preview" &&
            evaluation.status === "blocked",
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.flowType}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "contract-test-coverage",
      "Contract lists route, schema, health, and fail-closed tests",
      hasAll(contract.contractTests, CONTRACT_TESTS),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}:${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-matching-clearing-contract",
    validatorVersion: MORAL_TRADE_MATCHING_CLEARING_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeMatchingClearing = {
  evaluateMoralTradeMatchingClearing,
  getMoralTradeMatchingClearingContract,
  validateMoralTradeMatchingClearingContract,
};

export default moralTradeMatchingClearing;
