export const MORAL_TRADE_CLEARING_PREVIEW_CONTRACT_VERSION =
  "moral-trade-clearing-preview-v0.9-2026-06";
export const MORAL_TRADE_CLEARING_PREVIEW_VALIDATOR_VERSION =
  "moral-trade-clearing-preview-validator-v0.1";

export type MoralTradeClearingPreviewTrack =
  | "donation_offset"
  | "pledge_swap";

export type MoralTradeClearingPreviewMode =
  | "match_candidate"
  | "final_lock_proposal";

export type MoralTradeClearingPreviewReleaseStage =
  | "donation_offset_preview_no_capture"
  | "pledge_swap_preview_manual_review_only";

export type MoralTradeClearingPreviewClearingMode =
  | "batch"
  | "direct_pair"
  | "preview_only"
  | "manual_review";

export type MoralTradeClearingPreviewStatus =
  | "preview_ready"
  | "blocked_preview_only";

export type MoralTradeClearingPreviewGateStatus =
  | "passed"
  | "not_required_for_stage"
  | "needs_review"
  | "blocked"
  | "missing"
  | "stale"
  | "superseded"
  | "out_of_bounds"
  | "preview_only";

export interface MoralTradeClearingPreviewPerformanceTerms {
  maxObligationDays: number | null;
  reciprocalReleaseRule: string;
  withdrawalBeforeLockRule: string;
  challengeWindowDays: number | null;
  neutralReviewRequired: boolean;
  evidencePlan: string;
  leastIntrusiveAlternative: string;
  scheduleStatus: MoralTradeClearingPreviewGateStatus;
  performanceTermsStatus: MoralTradeClearingPreviewGateStatus;
  compensationTermsStatus: MoralTradeClearingPreviewGateStatus;
}

export interface MoralTradeClearingPreviewInput {
  track: MoralTradeClearingPreviewTrack;
  mode: MoralTradeClearingPreviewMode;
  releaseStage: MoralTradeClearingPreviewReleaseStage;
  matchingClearingRunRef: string;
  matchingClearingRunStatus: MoralTradeClearingPreviewGateStatus;
  matchingClearingRunHash: string | null;
  inputBundleHash: string | null;
  resultHash: string | null;
  reproducibilityStatus: MoralTradeClearingPreviewGateStatus;
  finalLockProposalRef: string;
  finalLockProposalStatus: MoralTradeClearingPreviewGateStatus;
  clearingMode: MoralTradeClearingPreviewClearingMode;
  directPairClearingStatus: MoralTradeClearingPreviewGateStatus;
  requiredFreshConfirmations: number;
  freshConfirmationCount: number;
  participantConfirmationStatus: MoralTradeClearingPreviewGateStatus;
  noTradeBaseline: string;
  baselineVersion: string;
  baselineSnapshotHash: string | null;
  baselineConfidenceLevel: "low" | "medium" | "high" | "unknown";
  baselineIntegrityStatus: MoralTradeClearingPreviewGateStatus;
  participantSurplusConfirmed: boolean;
  matchedCounterpartyVolumeCents: number;
  clearingRatioBps: number;
  participantRatioMinBps: number;
  participantRatioMaxBps: number;
  ratioBoundsStatus: MoralTradeClearingPreviewGateStatus;
  unmatchedResidualCents: number;
  residualNoTradeAction: string;
  fallbackRule: string;
  commitmentReservationStatus: MoralTradeClearingPreviewGateStatus;
  doubleCountStatus: MoralTradeClearingPreviewGateStatus;
  atomicSettlementStatus: MoralTradeClearingPreviewGateStatus;
  destinationVerificationStatus: MoralTradeClearingPreviewGateStatus;
  verifiedPaymentDestinationStatus: MoralTradeClearingPreviewGateStatus;
  donorOfRecordTaxStatus: MoralTradeClearingPreviewGateStatus;
  nonparticipantExternalityStatus: MoralTradeClearingPreviewGateStatus;
  antiThreatStatus: MoralTradeClearingPreviewGateStatus;
  evidenceAuthenticityStatus: MoralTradeClearingPreviewGateStatus;
  financialCrimeStatus: MoralTradeClearingPreviewGateStatus;
  sideAgreementStatus: MoralTradeClearingPreviewGateStatus;
  tradeClassificationStatus: MoralTradeClearingPreviewGateStatus;
  protectiveAssessmentStatus: MoralTradeClearingPreviewGateStatus;
  userSafetyStatus: MoralTradeClearingPreviewGateStatus;
  recipientAcceptanceStatus: MoralTradeClearingPreviewGateStatus;
  adverseAssociationStatus: MoralTradeClearingPreviewGateStatus;
  aiPreferenceElicitationStatus: MoralTradeClearingPreviewGateStatus;
  postClearAuditSamplingStatus: MoralTradeClearingPreviewGateStatus;
  nonPublicGoodsSubsidyStatus: MoralTradeClearingPreviewGateStatus;
  causeBucketTaxonomyStatus: MoralTradeClearingPreviewGateStatus;
  resourceCompatibilityStatus: MoralTradeClearingPreviewGateStatus;
  netOffsetAccountingStatus: MoralTradeClearingPreviewGateStatus;
  offerValidityStatus: MoralTradeClearingPreviewGateStatus;
  privacyDisclosureStatus: MoralTradeClearingPreviewGateStatus;
  policySnapshotRef: string;
  stateInterpretationPolicyRef: string;
  performanceTerms?: MoralTradeClearingPreviewPerformanceTerms;
}

export interface MoralTradeClearingPreviewSection {
  key: string;
  label: string;
  status: MoralTradeClearingPreviewGateStatus;
  userMessage: string;
  nextAction: string;
  blockerCodes: string[];
}

export interface MoralTradeClearingPreview {
  version: string;
  track: MoralTradeClearingPreviewTrack;
  mode: MoralTradeClearingPreviewMode;
  releaseStage: MoralTradeClearingPreviewReleaseStage;
  status: MoralTradeClearingPreviewStatus;
  matchCandidateCreatesDeal: false;
  captureAllowed: false;
  relianceBearing: false;
  requiresFinalLockProposal: true;
  requiresFreshConfirmations: true;
  requiredFreshConfirmations: number;
  freshConfirmationCount: number;
  baselineComparison: {
    noTradeBaseline: string;
    baselineVersion: string;
    baselineConfidenceLevel: MoralTradeClearingPreviewInput["baselineConfidenceLevel"];
    baselineSnapshotHash: string | null;
    participantSurplusConfirmed: boolean;
  };
  matchedTerms: {
    matchedCounterpartyVolumeCents: number;
    clearingRatioBps: number;
    participantRatioMinBps: number;
    participantRatioMaxBps: number;
    ratioBoundsStatus: MoralTradeClearingPreviewGateStatus;
    unmatchedResidualCents: number;
    residualNoTradeAction: string;
    fallbackRule: string;
    clearingMode: MoralTradeClearingPreviewClearingMode;
  };
  boundaryStatuses: {
    directPairClearingStatus: MoralTradeClearingPreviewGateStatus;
    recipientAcceptanceStatus: MoralTradeClearingPreviewGateStatus;
    adverseAssociationStatus: MoralTradeClearingPreviewGateStatus;
    aiPreferenceElicitationStatus: MoralTradeClearingPreviewGateStatus;
    postClearAuditSamplingStatus: MoralTradeClearingPreviewGateStatus;
    nonPublicGoodsSubsidyStatus: MoralTradeClearingPreviewGateStatus;
    causeBucketTaxonomyStatus: MoralTradeClearingPreviewGateStatus;
    resourceCompatibilityStatus: MoralTradeClearingPreviewGateStatus;
    netOffsetAccountingStatus: MoralTradeClearingPreviewGateStatus;
    offerValidityStatus: MoralTradeClearingPreviewGateStatus;
  };
  sections: MoralTradeClearingPreviewSection[];
  userFacingBlockers: string[];
  blockerCodes: string[];
}

export interface MoralTradeClearingPreviewContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  persistenceRule: string;
  privacyRule: string;
  firstClassRecordTables: string[];
  executionRoute: {
    method: "POST";
    path: string;
    auth: "authenticated";
    stateMutation: "append_only_preview_record";
  };
  tracks: MoralTradeClearingPreviewTrack[];
  modes: MoralTradeClearingPreviewMode[];
  releaseStages: MoralTradeClearingPreviewReleaseStage[];
  requiredSections: string[];
  requiredControlStatuses: string[];
  samplePreviews: MoralTradeClearingPreview[];
  contractTests: string[];
}

export interface MoralTradeClearingPreviewCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeClearingPreviewValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-clearing-preview-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeClearingPreviewCheck[];
  blockers: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const NON_BLOCKING_STATUSES = new Set<MoralTradeClearingPreviewGateStatus>([
  "passed",
  "not_required_for_stage",
]);

const REQUIRED_SECTIONS = [
  "matching-run",
  "baseline-comparison",
  "ratio-and-residual",
  "commitment-reservation",
  "atomic-settlement",
  "direct-pair-or-batch-mode",
  "cause-bucket-taxonomy",
  "resource-compatibility",
  "net-offset-accounting",
  "offer-validity",
  "final-lock",
  "destination-and-tax",
  "externality-and-safety",
  "classification-and-assessments",
  "recipient-ai-boundaries",
  "subsidy-governance",
  "privacy-and-policy",
  "pledge-performance-terms",
] as const;

const REQUIRED_CONTROL_STATUSES = [
  "matching_clearing_run",
  "input_bundle_hash",
  "result_hash",
  "reproducibility_check",
  "final_lock_proposal",
  "participant_confirmation",
  "baseline_snapshot",
  "baseline_integrity",
  "ratio_bounds",
  "commitment_reservation",
  "double_count",
  "atomic_settlement",
  "direct_pair_clearing",
  "cause_bucket_taxonomy",
  "resource_compatibility",
  "net_offset_accounting",
  "offer_validity",
  "destination_verification",
  "donor_of_record_tax",
  "nonparticipant_externality",
  "anti_threat",
  "evidence_authenticity",
  "financial_crime",
  "side_agreement",
  "trade_classification",
  "protective_assessment",
  "user_safety",
  "recipient_acceptance",
  "adverse_association",
  "ai_preference_elicitation",
  "post_clear_audit_sampling",
  "non_public_goods_subsidy",
  "privacy_disclosure",
  "policy_snapshot",
  "state_interpretation_policy",
] as const;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_clearing_preview_records",
] as const;

const CONTRACT_TESTS = [
  "clearing_preview_contract_validator",
  "donation_offset_clearing_preview_fail_closed",
  "pledge_swap_clearing_preview_performance_terms",
  "clearing_preview_execute_route_contract",
  "clearing_preview_record_schema_contract",
  "offer_create_form_clearing_preview_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeClearingPreviewCheck {
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

function hasMeaningfulText(value: string) {
  return value.trim().length >= 12;
}

function statusBlocker(
  status: MoralTradeClearingPreviewGateStatus,
  code: string,
) {
  return NON_BLOCKING_STATUSES.has(status) ? [] : [code];
}

function makeSection({
  blockerCodes,
  key,
  label,
  nextAction,
  passedMessage,
  status,
  blockedMessage,
}: {
  blockerCodes: string[];
  key: string;
  label: string;
  nextAction: string;
  passedMessage: string;
  status: MoralTradeClearingPreviewGateStatus;
  blockedMessage: string;
}): MoralTradeClearingPreviewSection {
  return {
    key,
    label,
    status,
    userMessage: blockerCodes.length ? blockedMessage : passedMessage,
    nextAction,
    blockerCodes,
  };
}

function aggregateStatus(blockerCodes: readonly string[]) {
  return blockerCodes.length ? "blocked_preview_only" : "preview_ready";
}

function cents(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function ratioBoundsBlockers(input: MoralTradeClearingPreviewInput) {
  const blockers = statusBlocker(input.ratioBoundsStatus, "ratio_bounds_not_passed");
  const ratio = input.clearingRatioBps;

  if (
    !Number.isFinite(ratio) ||
    ratio <= 0 ||
    ratio < input.participantRatioMinBps ||
    ratio > input.participantRatioMaxBps
  ) {
    blockers.push("clearing_ratio_outside_participant_bounds");
  }

  return blockers;
}

export function buildMoralTradeClearingPreview(
  input: MoralTradeClearingPreviewInput,
): MoralTradeClearingPreview {
  const matchingRunBlockers = [
    ...statusBlocker(input.matchingClearingRunStatus, "matching_clearing_run_not_reviewed"),
    ...statusBlocker(input.reproducibilityStatus, "reproducibility_check_not_passed"),
    ...(input.matchingClearingRunRef.trim() ? [] : ["matching_clearing_run_missing"]),
    ...(hasValidHash(input.matchingClearingRunHash) ? [] : ["matching_clearing_run_hash_missing"]),
    ...(hasValidHash(input.inputBundleHash) ? [] : ["input_bundle_hash_missing"]),
    ...(hasValidHash(input.resultHash) ? [] : ["result_hash_missing"]),
  ];
  const baselineBlockers = [
    ...(hasMeaningfulText(input.noTradeBaseline) ? [] : ["no_trade_baseline_missing"]),
    ...(input.baselineVersion.trim() ? [] : ["baseline_version_missing"]),
    ...(hasValidHash(input.baselineSnapshotHash) ? [] : ["baseline_snapshot_hash_missing"]),
    ...statusBlocker(input.baselineIntegrityStatus, "baseline_integrity_not_non_blocking"),
    ...(input.baselineConfidenceLevel === "low" ? ["baseline_confidence_low"] : []),
    ...(input.participantSurplusConfirmed ? [] : ["participant_surplus_confirmation_missing"]),
  ];
  const ratioBlockers = [
    ...ratioBoundsBlockers(input),
    ...(hasMeaningfulText(input.residualNoTradeAction) ? [] : ["residual_no_trade_action_missing"]),
    ...(hasMeaningfulText(input.fallbackRule) ? [] : ["fallback_rule_missing"]),
  ];
  const reservationBlockers = [
    ...statusBlocker(input.commitmentReservationStatus, "commitment_reservation_not_passed"),
    ...statusBlocker(input.doubleCountStatus, "double_count_control_not_passed"),
  ];
  const atomicBlockers = statusBlocker(
    input.atomicSettlementStatus,
    "atomic_settlement_not_passed",
  );
  const directPairBlockers =
    input.clearingMode === "direct_pair"
      ? statusBlocker(input.directPairClearingStatus, "direct_pair_clearing_not_passed")
      : input.directPairClearingStatus === "passed"
        ? ["direct_pair_status_passed_for_non_direct_pair_mode"]
        : [];
  const causeBucketBlockers = statusBlocker(
    input.causeBucketTaxonomyStatus,
    "cause_bucket_taxonomy_not_passed",
  );
  const resourceCompatibilityBlockers = statusBlocker(
    input.resourceCompatibilityStatus,
    "resource_compatibility_not_passed",
  );
  const netOffsetAccountingBlockers = statusBlocker(
    input.netOffsetAccountingStatus,
    "net_offset_accounting_not_passed",
  );
  const offerValidityBlockers = statusBlocker(
    input.offerValidityStatus,
    "offer_validity_not_passed",
  );
  const finalLockBlockers = [
    ...statusBlocker(input.finalLockProposalStatus, "final_lock_proposal_not_current"),
    ...(input.finalLockProposalRef.trim() ? [] : ["final_lock_proposal_missing"]),
    ...statusBlocker(input.participantConfirmationStatus, "participant_confirmation_not_passed"),
    ...(input.freshConfirmationCount >= input.requiredFreshConfirmations
      ? []
      : ["fresh_final_confirmations_missing"]),
  ];
  const destinationBlockers = [
    ...statusBlocker(input.destinationVerificationStatus, "destination_verification_not_passed"),
    ...statusBlocker(
      input.verifiedPaymentDestinationStatus,
      "payment_destination_not_verified",
    ),
    ...statusBlocker(input.donorOfRecordTaxStatus, "donor_of_record_tax_not_passed"),
  ];
  const safetyBlockers = [
    ...statusBlocker(input.nonparticipantExternalityStatus, "nonparticipant_externality_not_passed"),
    ...statusBlocker(input.antiThreatStatus, "anti_threat_not_passed"),
    ...statusBlocker(input.evidenceAuthenticityStatus, "evidence_authenticity_not_passed"),
    ...statusBlocker(input.financialCrimeStatus, "financial_crime_not_passed"),
  ];
  const classificationBlockers = [
    ...statusBlocker(input.sideAgreementStatus, "side_agreement_not_passed"),
    ...statusBlocker(input.tradeClassificationStatus, "trade_classification_not_passed"),
    ...statusBlocker(input.protectiveAssessmentStatus, "protective_assessment_not_passed"),
    ...statusBlocker(input.userSafetyStatus, "user_safety_not_passed"),
  ];
  const boundaryBlockers = [
    ...statusBlocker(input.recipientAcceptanceStatus, "recipient_acceptance_not_passed"),
    ...statusBlocker(input.adverseAssociationStatus, "adverse_association_not_passed"),
    ...statusBlocker(
      input.aiPreferenceElicitationStatus,
      "ai_preference_elicitation_not_passed",
    ),
    ...statusBlocker(
      input.postClearAuditSamplingStatus,
      "post_clear_audit_sampling_not_passed",
    ),
  ];
  const subsidyBlockers = [
    ...statusBlocker(
      input.nonPublicGoodsSubsidyStatus,
      "non_public_goods_subsidy_not_passed",
    ),
  ];
  const privacyPolicyBlockers = [
    ...statusBlocker(input.privacyDisclosureStatus, "privacy_disclosure_not_passed"),
    ...(input.policySnapshotRef.trim() ? [] : ["policy_snapshot_missing"]),
    ...(input.stateInterpretationPolicyRef.trim()
      ? []
      : ["state_interpretation_policy_missing"]),
  ];
  const pledgeTerms = input.performanceTerms;
  const pledgeBlockers =
    input.track === "pledge_swap"
      ? [
          ...(pledgeTerms ? [] : ["pledge_performance_terms_missing"]),
          ...(pledgeTerms && pledgeTerms.maxObligationDays && pledgeTerms.maxObligationDays > 0
            ? []
            : ["pledge_max_obligation_missing"]),
          ...(pledgeTerms && hasMeaningfulText(pledgeTerms.reciprocalReleaseRule)
            ? []
            : ["reciprocal_release_rule_missing"]),
          ...(pledgeTerms && hasMeaningfulText(pledgeTerms.withdrawalBeforeLockRule)
            ? []
            : ["withdrawal_before_lock_rule_missing"]),
          ...(pledgeTerms && pledgeTerms.challengeWindowDays && pledgeTerms.challengeWindowDays > 0
            ? []
            : ["challenge_window_missing"]),
          ...(pledgeTerms?.neutralReviewRequired ? [] : ["neutral_review_missing"]),
          ...(pledgeTerms && hasMeaningfulText(pledgeTerms.evidencePlan)
            ? []
            : ["pledge_evidence_plan_missing"]),
          ...(pledgeTerms && hasMeaningfulText(pledgeTerms.leastIntrusiveAlternative)
            ? []
            : ["least_intrusive_evidence_alternative_missing"]),
          ...(pledgeTerms
            ? statusBlocker(pledgeTerms.scheduleStatus, "pledge_schedule_not_passed")
            : []),
          ...(pledgeTerms
            ? statusBlocker(
                pledgeTerms.performanceTermsStatus,
                "pledge_performance_terms_not_passed",
              )
            : []),
          ...(pledgeTerms
            ? statusBlocker(
                pledgeTerms.compensationTermsStatus,
                "compensation_terms_not_passed",
              )
            : []),
        ]
      : [];
  const allBlockers = [
    ...matchingRunBlockers,
    ...baselineBlockers,
    ...ratioBlockers,
    ...reservationBlockers,
    ...atomicBlockers,
    ...directPairBlockers,
    ...causeBucketBlockers,
    ...resourceCompatibilityBlockers,
    ...netOffsetAccountingBlockers,
    ...offerValidityBlockers,
    ...finalLockBlockers,
    ...destinationBlockers,
    ...safetyBlockers,
    ...classificationBlockers,
    ...boundaryBlockers,
    ...subsidyBlockers,
    ...privacyPolicyBlockers,
    ...pledgeBlockers,
  ];

  return {
    version: MORAL_TRADE_CLEARING_PREVIEW_CONTRACT_VERSION,
    track: input.track,
    mode: input.mode,
    releaseStage: input.releaseStage,
    status: aggregateStatus(allBlockers),
    matchCandidateCreatesDeal: false,
    captureAllowed: false,
    relianceBearing: false,
    requiresFinalLockProposal: true,
    requiresFreshConfirmations: true,
    requiredFreshConfirmations: input.requiredFreshConfirmations,
    freshConfirmationCount: input.freshConfirmationCount,
    baselineComparison: {
      noTradeBaseline: input.noTradeBaseline,
      baselineVersion: input.baselineVersion,
      baselineConfidenceLevel: input.baselineConfidenceLevel,
      baselineSnapshotHash: input.baselineSnapshotHash,
      participantSurplusConfirmed: input.participantSurplusConfirmed,
    },
    matchedTerms: {
      matchedCounterpartyVolumeCents: cents(input.matchedCounterpartyVolumeCents),
      clearingRatioBps: input.clearingRatioBps,
      participantRatioMinBps: input.participantRatioMinBps,
      participantRatioMaxBps: input.participantRatioMaxBps,
      ratioBoundsStatus: input.ratioBoundsStatus,
      unmatchedResidualCents: cents(input.unmatchedResidualCents),
      residualNoTradeAction: input.residualNoTradeAction,
      fallbackRule: input.fallbackRule,
      clearingMode: input.clearingMode,
    },
    boundaryStatuses: {
      directPairClearingStatus: input.directPairClearingStatus,
      recipientAcceptanceStatus: input.recipientAcceptanceStatus,
      adverseAssociationStatus: input.adverseAssociationStatus,
      aiPreferenceElicitationStatus: input.aiPreferenceElicitationStatus,
      postClearAuditSamplingStatus: input.postClearAuditSamplingStatus,
      nonPublicGoodsSubsidyStatus: input.nonPublicGoodsSubsidyStatus,
      causeBucketTaxonomyStatus: input.causeBucketTaxonomyStatus,
      resourceCompatibilityStatus: input.resourceCompatibilityStatus,
      netOffsetAccountingStatus: input.netOffsetAccountingStatus,
      offerValidityStatus: input.offerValidityStatus,
    },
    sections: [
      makeSection({
        key: "matching-run",
        label: "Frozen matching run",
        status: matchingRunBlockers.length ? "blocked" : "passed",
        blockerCodes: matchingRunBlockers,
        passedMessage:
          "This preview references a reproducible matching-clearing run and frozen result hashes.",
        blockedMessage:
          "This preview cannot support lock, capture, or reliance until a reviewed matching-clearing run is frozen.",
        nextAction:
          "Run deterministic clearing and record input, exclusion, result, and reproducibility hashes.",
      }),
      makeSection({
        key: "baseline-comparison",
        label: "No-trade comparison",
        status: baselineBlockers.length ? "blocked" : "passed",
        blockerCodes: baselineBlockers,
        passedMessage:
          "The preview has a versioned baseline, confidence level, and participant surplus confirmation.",
        blockedMessage:
          "The participant still needs a versioned no-trade baseline and surplus confirmation before clearing can rely on this preview.",
        nextAction:
          "Freeze the baseline snapshot and collect explicit confirmation against that exact baseline.",
      }),
      makeSection({
        key: "ratio-and-residual",
        label: "Ratio and residual",
        status: ratioBlockers.length ? "blocked" : "passed",
        blockerCodes: ratioBlockers,
        passedMessage:
          "Matched volume, ratio bounds, residual amount, and fallback treatment are visible.",
        blockedMessage:
          "Ratio bounds, residual treatment, or fallback handling are not yet complete.",
        nextAction:
          "Show the matched amount, participant bounds, residual action, and fallback rule before final confirmation.",
      }),
      makeSection({
        key: "commitment-reservation",
        label: "Commitment reservation",
        status: reservationBlockers.length ? "blocked" : "passed",
        blockerCodes: reservationBlockers,
        passedMessage:
          "Commitment reservation and double-count controls are non-blocking.",
        blockedMessage:
          "The same donation, abstention, evidence, or baseline capacity has not been safely reserved for this trade.",
        nextAction:
          "Reserve every planned commitment and block reused or conflicting inventory before lock.",
      }),
      makeSection({
        key: "atomic-settlement",
        label: "Atomic settlement",
        status: atomicBlockers.length ? "blocked" : "passed",
        blockerCodes: atomicBlockers,
        passedMessage:
          "The preview uses all-or-none settlement semantics at the matched-trade boundary.",
        blockedMessage:
          "The batch is not yet protected by all-or-none settlement semantics.",
        nextAction:
          "Require every participant confirmation, eligibility, authorization, and reservation before any side can rely or capture.",
      }),
      makeSection({
        key: "direct-pair-or-batch-mode",
        label: "Direct-pair or batch mode",
        status:
          input.clearingMode === "direct_pair"
            ? directPairBlockers.length
              ? "blocked"
              : "passed"
            : "not_required_for_stage",
        blockerCodes: directPairBlockers,
        passedMessage:
          input.clearingMode === "direct_pair"
            ? "Direct-pair clearing has a frozen two-party record, both-party consent, no background networking, and ordinary gates."
            : "This preview uses batch clearing; direct-pair records are not required for this stage.",
        blockedMessage:
          "Direct-pair clearing still needs a frozen two-party or invite-linked record, both confirmations, no autonomous outreach, and ordinary review, payment, privacy, and lock gates.",
        nextAction:
          "Create or update the direct-pair clearing record and keep the preview non-capture until the direct-pair and ordinary gate statuses are non-blocking.",
      }),
      makeSection({
        key: "cause-bucket-taxonomy",
        label: "Cause-bucket taxonomy",
        status: causeBucketBlockers.length ? "blocked" : "passed",
        blockerCodes: causeBucketBlockers,
        passedMessage:
          "Cause-bucket taxonomy and assignment review are non-blocking for any bucket-dependent distinctness, classification, or clearing effect.",
        blockedMessage:
          "Cause-bucket taxonomy review still blocks bucket-dependent distinctness, classification, clearing, or public metrics.",
        nextAction:
          "Use a versioned plural-reviewed taxonomy and reviewed privacy-safe assignments before bucket labels affect matching, clearing, lock, or metrics.",
      }),
      makeSection({
        key: "resource-compatibility",
        label: "Resource compatibility",
        status: resourceCompatibilityBlockers.length ? "blocked" : "passed",
        blockerCodes: resourceCompatibilityBlockers,
        passedMessage:
          "Joint-feasibility review is non-blocking for actions, donations, abstentions, destinations, timing, duties, and control claims.",
        blockedMessage:
          "Resource-compatibility review still blocks lock, clearing, capture, public metrics, or release promotion for this non-public-goods trade.",
        nextAction:
          "Record a first-class resource-compatibility assessment and block mutually exclusive resources, mutually exclusive actions, incompatible destination or timing, third-party-control conflicts, and zero-sum control claims.",
      }),
      makeSection({
        key: "net-offset-accounting",
        label: "Net-offset accounting",
        status: netOffsetAccountingBlockers.length ? "blocked" : "passed",
        blockerCodes: netOffsetAccountingBlockers,
        passedMessage:
          "Baseline opposed action, matched canceled amount, compromise transfer, sponsor or match amount, residual opposed action, substitution-channel state, and evidence standard are recorded.",
        blockedMessage:
          "Net-offset accounting still blocks lock, clearing, capture, public metrics, or release promotion.",
        nextAction:
          "Record baseline opposed action, matched canceled amount, compromise transfer amount, sponsor/match amount, residual opposed action, substitution-channel review, and evidence standard before counting volume.",
      }),
      makeSection({
        key: "offer-validity",
        label: "Offer validity",
        status: offerValidityBlockers.length ? "blocked" : "passed",
        blockerCodes: offerValidityBlockers,
        passedMessage:
          "The offer has a current validity record for baseline, terms, empirical assumptions, evidence standards, jurisdiction, destination, and counterparty bucket.",
        blockedMessage:
          "The offer is stale, expired, unrenewed, or missing a validity record.",
        nextAction:
          "Renew the preview and confirmation whenever the baseline, terms, evidence standard, payment method, jurisdiction, destination, or counterparty bucket is stale or expired.",
      }),
      makeSection({
        key: "final-lock",
        label: "Final lock confirmation",
        status: finalLockBlockers.length ? "blocked" : "passed",
        blockerCodes: finalLockBlockers,
        passedMessage:
          "The exact lock proposal has fresh confirmations from all required participants.",
        blockedMessage:
          "A match candidate is not a deal; fresh final confirmations are still missing or stale.",
        nextAction:
          "Create the frozen matched-trade lock proposal and collect non-stale confirmations for that exact proposal.",
      }),
      makeSection({
        key: "destination-and-tax",
        label: "Destination and receipt treatment",
        status: destinationBlockers.length ? "blocked" : "passed",
        blockerCodes: destinationBlockers,
        passedMessage:
          "Recipient, payment destination, donor-of-record, and receipt controls are non-blocking.",
        blockedMessage:
          "Destination verification, payment-destination verification, or donor/receipt treatment still blocks lock or capture.",
        nextAction:
          "Use reviewed recipient and payment-destination records; do not rely on free-text destinations or tax assumptions.",
      }),
      makeSection({
        key: "externality-and-safety",
        label: "Externality and safety",
        status: safetyBlockers.length ? "blocked" : "passed",
        blockerCodes: safetyBlockers,
        passedMessage:
          "Externality, anti-threat, evidence-authenticity, and financial-crime controls are non-blocking.",
        blockedMessage:
          "Safety, authenticity, externality, or financial-crime review still blocks reliance.",
        nextAction:
          "Resolve the relevant review records before treating evidence, payment, or completion as reliable.",
      }),
      makeSection({
        key: "classification-and-assessments",
        label: "Classification and protective assessments",
        status: classificationBlockers.length ? "blocked" : "passed",
        blockerCodes: classificationBlockers,
        passedMessage:
          "Side-agreement, classification, protective-assessment, and user-safety controls are non-blocking.",
        blockedMessage:
          "Classification, side-agreement, protective-assessment, or user-safety controls still block reliance.",
        nextAction:
          "Keep the record preview/manual-review only until these review dimensions are non-blocking.",
      }),
      makeSection({
        key: "privacy-and-policy",
        label: "Privacy and frozen policy",
        status: privacyPolicyBlockers.length ? "blocked" : "passed",
        blockerCodes: privacyPolicyBlockers,
        passedMessage:
          "Privacy disclosure and frozen policy references are present.",
        blockedMessage:
          "Privacy, policy-snapshot, or state-interpretation references are missing or blocking.",
        nextAction:
          "Resolve immutable policy snapshots and privacy disclosure records before private details are shown or relied on.",
      }),
      makeSection({
        key: "recipient-ai-boundaries",
        label: "Recipient and AI boundaries",
        status: boundaryBlockers.length ? "blocked" : "passed",
        blockerCodes: boundaryBlockers,
        passedMessage:
          "Recipient acceptance, adverse-association review, AI preference-elicitation, and post-clear audit sampling statuses are non-blocking.",
        blockedMessage:
          "Recipient acceptance, adverse-association review, AI preference-elicitation conversion, or post-clear audit sampling still blocks reliance.",
        nextAction:
          "Resolve recipient acceptance, adverse-association review, any AI-shaped preference input, and post-clear audit sampling before final lock, disclosure, payment, or public metrics.",
      }),
      makeSection({
        key: "subsidy-governance",
        label: "Subsidy governance",
        status: subsidyBlockers.length ? "blocked" : "passed",
        blockerCodes: subsidyBlockers,
        passedMessage:
          "Any non-public-goods subsidy schedule is source-reviewed, conflict-reviewed, cap-checked, and excluded from participant moral-trade and impact metrics.",
        blockedMessage:
          "Sponsor-funded subsidy governance still blocks lock, payment, public metrics, or release promotion.",
        nextAction:
          "Freeze the subsidy pool, source-of-funds review, conflict review, eligibility rule, caps, schedule, disclosure level, and refund or carry-forward policy.",
      }),
      makeSection({
        key: "pledge-performance-terms",
        label: "Pledge performance terms",
        status:
          input.track === "donation_offset"
            ? "not_required_for_stage"
            : pledgeBlockers.length
              ? "blocked"
              : "passed",
        blockerCodes: pledgeBlockers,
        passedMessage:
          input.track === "donation_offset"
            ? "Pledge performance terms are not required for donation-offset previews."
            : "The pledge preview states bounded duration, reciprocal release, evidence, challenge, and neutral-review terms.",
        blockedMessage:
          "Pledge performance terms are not complete enough to support reliance-bearing preview or lock.",
        nextAction:
          "Freeze action unit, schedule, evidence due dates, challenge window, cure rule, and reciprocal release before reliance.",
      }),
    ],
    userFacingBlockers: allBlockers.map((code) => {
      switch (code) {
        case "matching_clearing_run_missing":
        case "matching_clearing_run_not_reviewed":
          return "A reviewed deterministic clearing run is still required.";
        case "final_lock_proposal_missing":
        case "final_lock_proposal_not_current":
          return "This is still a preview; a frozen final lock proposal is required.";
        case "fresh_final_confirmations_missing":
        case "participant_confirmation_not_passed":
          return "Every affected participant must freshly confirm the exact locked terms.";
        case "clearing_ratio_outside_participant_bounds":
        case "ratio_bounds_not_passed":
          return "The clearing ratio is outside accepted bounds or still needs review.";
        case "commitment_reservation_not_passed":
        case "double_count_control_not_passed":
          return "Commitments must be reserved so the same action, donation, baseline, or evidence is not double-counted.";
        case "atomic_settlement_not_passed":
          return "All required participants must be locked together before anyone can rely or pay.";
        case "direct_pair_clearing_not_passed":
          return "Direct-pair mode requires a confirmed two-party record and cannot bypass ordinary review, privacy, payment, or lock gates.";
        case "direct_pair_status_passed_for_non_direct_pair_mode":
          return "Direct-pair status must match the selected clearing mode.";
        case "cause_bucket_taxonomy_not_passed":
          return "Cause-bucket assignments need versioned plural-reviewed taxonomy approval before they affect distinctness, classification, clearing, or public metrics.";
        case "resource_compatibility_not_passed":
          return "Resource-compatibility review must show the proposed actions, destinations, timing, duties, and control claims are jointly feasible rather than a zero-sum or mutually exclusive conflict.";
        case "net_offset_accounting_not_passed":
          return "Donation-offset volume must be net of the opposed action that was actually canceled or redirected, with baseline, residual, substitution-channel, and evidence-standard accounting recorded before it can count.";
        case "offer_validity_not_passed":
          return "This offer needs a current validity record or renewed confirmation because baselines, terms, evidence standards, payment methods, jurisdictions, destinations, or counterparty buckets can go stale.";
        case "destination_verification_not_passed":
        case "payment_destination_not_verified":
          return "Recipient and payment destination verification must be non-blocking.";
        case "recipient_acceptance_not_passed":
          return "Recipient acceptance must be non-blocking before lock, money movement, or public metrics.";
        case "adverse_association_not_passed":
          return "Adverse-association review must be non-blocking before reliance.";
        case "ai_preference_elicitation_not_passed":
          return "AI-shaped preferences must be converted into user-edited structured input and confirmed or reviewed.";
        case "post_clear_audit_sampling_not_passed":
          return "Post-clear audit sampling must be non-blocking before public metrics, release promotion, or completion claims.";
        case "non_public_goods_subsidy_not_passed":
          return "Any sponsor subsidy must be frozen, source-reviewed, conflict-reviewed, cap-checked, and excluded from participant volume, impact, and counterparty-distinctness metrics.";
        case "baseline_integrity_not_non_blocking":
        case "baseline_confidence_low":
          return "The baseline needs stronger review before it can support clearing.";
        default:
          return "This control must be resolved before lock, capture, reliance, or completion claims.";
      }
    }),
    blockerCodes: allBlockers,
  };
}

export function getMoralTradeClearingPreviewContract(): MoralTradeClearingPreviewContract {
  return {
    version: MORAL_TRADE_CLEARING_PREVIEW_CONTRACT_VERSION,
    purpose:
      "Build user-facing donation-offset and pledge-swap clearing previews that remain non-capture, non-reliance-bearing, and fail closed until frozen matching-clearing, final lock, confirmation, reservation, atomic-settlement, direct-pair mode, cause-bucket taxonomy, resource-compatibility, net-offset accounting, offer-validity, destination, recipient-acceptance, adverse-association, AI-preference-elicitation, post-clear audit sampling, sponsor-subsidy governance, safety, and policy controls are non-blocking.",
    failClosedRule:
      "A match candidate is not a deal. Missing, stale, out-of-bounds, under-review, or superseded controls keep the record preview-only and block lock, capture, reliance, public completion, and moral-trade metric eligibility, including direct-pair clearing, cause-bucket taxonomy, resource-compatibility, net-offset accounting, offer-validity, recipient-acceptance, adverse-association, AI-preference-elicitation, post-clear audit sampling, and sponsor-subsidy governance controls.",
    persistenceRule:
      "Authenticated clearing-preview execution writes an append-only moral_trade_clearing_preview_records row with normalized input, preview result, blocker codes, user-facing blockers, and a preview hash; unauthenticated, unconfigured, duplicate, or invalid requests create no state change.",
    privacyRule:
      "Preview sections expose only coarse statuses, user actions, and safe reason categories; exact wishes, private notes, payment credentials, raw evidence, hidden counterparty terms, raw AI outputs, hidden willingness-to-pay estimates, and reviewer notes stay out of the preview.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    executionRoute: {
      method: "POST",
      path: "/api/moral-trade/clearing-previews/execute",
      auth: "authenticated",
      stateMutation: "append_only_preview_record",
    },
    tracks: ["donation_offset", "pledge_swap"],
    modes: ["match_candidate", "final_lock_proposal"],
    releaseStages: [
      "donation_offset_preview_no_capture",
      "pledge_swap_preview_manual_review_only",
    ],
    requiredSections: [...REQUIRED_SECTIONS],
    requiredControlStatuses: [...REQUIRED_CONTROL_STATUSES],
    samplePreviews: [
      buildDemoDonationOffsetClearingPreview(),
      buildDemoPledgeSwapClearingPreview(),
    ],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeClearingPreviewContract(
  contract = getMoralTradeClearingPreviewContract(),
): MoralTradeClearingPreviewValidation {
  const checks = [
    check(
      "first_class_record_tables",
      "Clearing preview executions are first-class records",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "execution_route",
      "Execution route is authenticated and append-only",
      contract.executionRoute.method === "POST" &&
        contract.executionRoute.path === "/api/moral-trade/clearing-previews/execute" &&
        contract.executionRoute.auth === "authenticated" &&
        contract.executionRoute.stateMutation === "append_only_preview_record",
      `${contract.executionRoute.method} ${contract.executionRoute.path} ${contract.executionRoute.auth} ${contract.executionRoute.stateMutation}`,
    ),
    check(
      "tracks",
      "Contract covers donation-offset and pledge-swap tracks",
      contract.tracks.includes("donation_offset") && contract.tracks.includes("pledge_swap"),
      contract.tracks.join(", "),
    ),
    check(
      "required_sections",
      "Contract exposes all moraltrade60 preview sections",
      REQUIRED_SECTIONS.every((section) => contract.requiredSections.includes(section)),
      `${contract.requiredSections.length} section(s)`,
    ),
    check(
      "required_control_statuses",
      "Contract covers lock, reservation, destination, safety, and policy controls",
      REQUIRED_CONTROL_STATUSES.every((status) =>
        contract.requiredControlStatuses.includes(status),
      ),
      `${contract.requiredControlStatuses.length} control status(es)`,
    ),
    check(
      "sample_previews",
      "Sample previews are non-capture and non-reliance-bearing",
      contract.samplePreviews.length >= 2 &&
        contract.samplePreviews.every(
          (preview) =>
            preview.captureAllowed === false &&
            preview.relianceBearing === false &&
            preview.matchCandidateCreatesDeal === false,
        ),
      `${contract.samplePreviews.length} sample preview(s)`,
    ),
    check(
      "fail_closed_copy",
      "Fail-closed rule states that match candidates are not deals",
      /match candidate is not a deal/i.test(contract.failClosedRule),
      contract.failClosedRule,
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-clearing-preview-contract",
    validatorVersion: MORAL_TRADE_CLEARING_PREVIEW_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

export function buildDemoDonationOffsetClearingPreview() {
  return buildMoralTradeClearingPreview({
    track: "donation_offset",
    mode: "final_lock_proposal",
    releaseStage: "donation_offset_preview_no_capture",
    matchingClearingRunRef: "matching-clearing-run:demo-offset-v1",
    matchingClearingRunStatus: "passed",
    matchingClearingRunHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    inputBundleHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    resultHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    reproducibilityStatus: "passed",
    finalLockProposalRef: "matched-trade-lock-proposal:demo-offset-v1",
    finalLockProposalStatus: "passed",
    clearingMode: "batch",
    directPairClearingStatus: "not_required_for_stage",
    requiredFreshConfirmations: 2,
    freshConfirmationCount: 2,
    participantConfirmationStatus: "passed",
    noTradeBaseline: "Each side would otherwise make the named opposed donation.",
    baselineVersion: "baseline-v1",
    baselineSnapshotHash:
      "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    baselineConfidenceLevel: "medium",
    baselineIntegrityStatus: "passed",
    participantSurplusConfirmed: true,
    matchedCounterpartyVolumeCents: 100_000,
    clearingRatioBps: 10_000,
    participantRatioMinBps: 8_000,
    participantRatioMaxBps: 12_500,
    ratioBoundsStatus: "passed",
    unmatchedResidualCents: 0,
    residualNoTradeAction: "No residual amount remains after the matched redirect.",
    fallbackRule: "If any participant fails confirmation, the batch expires with no capture.",
    commitmentReservationStatus: "passed",
    doubleCountStatus: "passed",
    atomicSettlementStatus: "passed",
    destinationVerificationStatus: "passed",
    verifiedPaymentDestinationStatus: "passed",
    donorOfRecordTaxStatus: "passed",
    nonparticipantExternalityStatus: "passed",
    antiThreatStatus: "passed",
    evidenceAuthenticityStatus: "passed",
    financialCrimeStatus: "passed",
    sideAgreementStatus: "passed",
    tradeClassificationStatus: "passed",
    protectiveAssessmentStatus: "passed",
    userSafetyStatus: "passed",
    recipientAcceptanceStatus: "passed",
    adverseAssociationStatus: "passed",
    aiPreferenceElicitationStatus: "not_required_for_stage",
    postClearAuditSamplingStatus: "not_required_for_stage",
    nonPublicGoodsSubsidyStatus: "not_required_for_stage",
    causeBucketTaxonomyStatus: "passed",
    resourceCompatibilityStatus: "passed",
    netOffsetAccountingStatus: "passed",
    offerValidityStatus: "passed",
    privacyDisclosureStatus: "passed",
    policySnapshotRef: "policy-snapshot:donation-offset-preview-v1",
    stateInterpretationPolicyRef: "state-policy:donation-offset-preview-v1",
  });
}

export function buildDemoPledgeSwapClearingPreview() {
  return buildMoralTradeClearingPreview({
    track: "pledge_swap",
    mode: "match_candidate",
    releaseStage: "pledge_swap_preview_manual_review_only",
    matchingClearingRunRef: "matching-clearing-run:demo-pledge-v1",
    matchingClearingRunStatus: "passed",
    matchingClearingRunHash:
      "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    inputBundleHash:
      "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    resultHash:
      "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    reproducibilityStatus: "passed",
    finalLockProposalRef: "",
    finalLockProposalStatus: "preview_only",
    clearingMode: "preview_only",
    directPairClearingStatus: "not_required_for_stage",
    requiredFreshConfirmations: 2,
    freshConfirmationCount: 0,
    participantConfirmationStatus: "missing",
    noTradeBaseline:
      "Without this trade, the participant would not make the bounded pledge during the next 30 days.",
    baselineVersion: "baseline-v1",
    baselineSnapshotHash:
      "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    baselineConfidenceLevel: "medium",
    baselineIntegrityStatus: "passed",
    participantSurplusConfirmed: false,
    matchedCounterpartyVolumeCents: 0,
    clearingRatioBps: 10_000,
    participantRatioMinBps: 10_000,
    participantRatioMaxBps: 10_000,
    ratioBoundsStatus: "not_required_for_stage",
    unmatchedResidualCents: 0,
    residualNoTradeAction:
      "No action starts until a final proposal is frozen and freshly confirmed.",
    fallbackRule: "If either side declines or expires, all future duties are released.",
    commitmentReservationStatus: "needs_review",
    doubleCountStatus: "needs_review",
    atomicSettlementStatus: "needs_review",
    destinationVerificationStatus: "not_required_for_stage",
    verifiedPaymentDestinationStatus: "not_required_for_stage",
    donorOfRecordTaxStatus: "not_required_for_stage",
    nonparticipantExternalityStatus: "passed",
    antiThreatStatus: "passed",
    evidenceAuthenticityStatus: "needs_review",
    financialCrimeStatus: "not_required_for_stage",
    sideAgreementStatus: "passed",
    tradeClassificationStatus: "passed",
    protectiveAssessmentStatus: "passed",
    userSafetyStatus: "passed",
    recipientAcceptanceStatus: "not_required_for_stage",
    adverseAssociationStatus: "not_required_for_stage",
    aiPreferenceElicitationStatus: "not_required_for_stage",
    postClearAuditSamplingStatus: "not_required_for_stage",
    nonPublicGoodsSubsidyStatus: "not_required_for_stage",
    causeBucketTaxonomyStatus: "passed",
    resourceCompatibilityStatus: "passed",
    netOffsetAccountingStatus: "passed",
    offerValidityStatus: "passed",
    privacyDisclosureStatus: "passed",
    policySnapshotRef: "policy-snapshot:pledge-swap-preview-v1",
    stateInterpretationPolicyRef: "state-policy:pledge-swap-preview-v1",
    performanceTerms: {
      maxObligationDays: 30,
      reciprocalReleaseRule:
        "Future obligations are released if either side exits under the frozen rule.",
      withdrawalBeforeLockRule:
        "Either side can withdraw before final lock without penalty.",
      challengeWindowDays: 14,
      neutralReviewRequired: true,
      evidencePlan: "Use a dated self-log or bounded public confirmation.",
      leastIntrusiveAlternative:
        "Use self-report before location, device, private-message, or third-party exposure.",
      scheduleStatus: "passed",
      performanceTermsStatus: "passed",
      compensationTermsStatus: "not_required_for_stage",
    },
  });
}
