export type DonationOffsetTimeHorizon = "one_off" | "recurring";
export type DonationOffsetParticipationMode = "direct" | "pool";
export type DonationOffsetPoolSide = "side_a" | "side_b";
export type DonationOffsetVerificationMethod =
  | "proof_of_past_donations"
  | "receipts_uploaded"
  | "funds_in_escrow"
  | "third_party_audit";
export type DonationOffsetUnmatchedSurplusRule =
  | "return_to_donors"
  | "donate_to_compromise_destination"
  | "donate_to_original_cause"
  | "split_evenly";
export type DonationOffsetModerationStatus = "clear" | "flagged" | "blocked";
export type DonationOffsetDonorOfRecordRole =
  | "participant_direct_donor"
  | "counterparty_direct_donor"
  | "sponsor_or_third_party"
  | "platform_not_donor"
  | "unknown";
export type DonationOffsetTaxReceiptTreatment =
  | "no_tax_benefit_claimed"
  | "participant_may_receive_receipt"
  | "counterparty_may_receive_receipt"
  | "third_party_or_daf_receipt"
  | "unknown_or_unreviewed";
export type DonationOffsetCharitableSolicitationTreatment =
  | "external_donation_only_no_platform_solicitation"
  | "platform_facilitated_messaging_needs_review"
  | "commercial_co_venture_or_match_promo"
  | "unknown";
export type DonationOffsetDestinationVerificationStatus =
  | "registered_destination_selected"
  | "external_unverified"
  | "unknown";
export type DonationOffsetRecipientIdentityStatus =
  | "registered_recipient"
  | "fiscal_host_or_intermediary"
  | "free_text_or_unverified"
  | "unknown";
export type DonationOffsetPaymentDestinationKind =
  | "registered_charity_page"
  | "payment_processor_link"
  | "bank_account"
  | "wallet_address"
  | "fiscal_host"
  | "unknown";
export type DonationOffsetPaymentDestinationReviewStatus =
  | "verified"
  | "needs_review"
  | "blocked"
  | "unknown";
export type DonationOffsetNonparticipantExternalityStatus =
  | "non_blocking_review"
  | "needs_review"
  | "serious_unresolved_harm"
  | "unknown";
export type DonationOffsetEvidenceBurden =
  | "ordinary_receipt_or_public_log"
  | "third_party_audit"
  | "privacy_sensitive_or_high_burden"
  | "unknown";
export type DonationOffsetFallbackPolicy =
  | "cancel_or_refund"
  | "carry_forward_with_renewed_confirmation"
  | "manual_review"
  | "return_to_donors"
  | "unknown";
export type DonationOffsetMatchedLockProposalStatus =
  | "drafted"
  | "not_created"
  | "stale"
  | "superseded"
  | "unknown";
export type DonationOffsetParticipantConfirmationRecordStatus =
  | "recorded_non_stale"
  | "draft_only"
  | "missing"
  | "stale"
  | "superseded"
  | "unknown";
export type DonationOffsetConsentQualityStatus =
  | "passed"
  | "needs_review"
  | "failed"
  | "unknown";
export type DonationOffsetNoticeRecordStatus =
  | "recorded"
  | "missing"
  | "failed"
  | "unknown";
export type DonationOffsetConfirmationScope =
  | "preview_only"
  | "final_lock"
  | "renewed_material_change"
  | "unknown";
export type DonationOffsetAmendmentStatus =
  | "none"
  | "drafted_needs_confirmation"
  | "confirmed"
  | "unknown";
export type DonationOffsetBinarySafetyAssertion =
  | "clear"
  | "possible_or_unknown"
  | "triggered";
export type DonationOffsetPrivacyGrantStatus =
  | "not_needed"
  | "drafted"
  | "approved"
  | "missing"
  | "unknown";
export type DonationOffsetBaselineIntegrityStatus =
  | "non_blocking_review"
  | "needs_review"
  | "manufactured_or_escalated"
  | "unknown";
export type DonationOffsetThirdPartyObligationStatus =
  | "none_known"
  | "possible_or_unknown"
  | "conflict_declared";
export type DonationOffsetRepresentativeAuthorityStatus =
  | "self_only"
  | "verified_authority"
  | "claims_representative_authority"
  | "unknown";
export type DonationOffsetJurisdictionReviewStatus =
  | "not_needed"
  | "non_blocking_review"
  | "needs_review"
  | "blocked"
  | "unknown";
export type DonationOffsetDonorOfRecordGateStatus =
  | "pass"
  | "needs_input"
  | "human_review"
  | "blocked";
export type DonationOffsetPaymentDestinationGateStatus =
  DonationOffsetDonorOfRecordGateStatus;
export type DonationOffsetExternalityEvidenceGateStatus =
  DonationOffsetDonorOfRecordGateStatus;
export type DonationOffsetParticipantConfirmationGateStatus =
  DonationOffsetDonorOfRecordGateStatus;
export type DonationOffsetSafetyAuthenticityGateStatus =
  DonationOffsetDonorOfRecordGateStatus;
export type DonationOffsetAuthorityFairnessGateStatus =
  DonationOffsetDonorOfRecordGateStatus;

export interface RegisteredCharity {
  id: string;
  name: string;
  causeArea: string;
  websiteUrl: string;
  summary: string;
  isActive: boolean;
  isPoliticalCampaign: boolean;
  selectable: boolean;
  isMoralPublicGood: boolean;
  consensusLabel: string;
  sortOrder: number;
}

export interface DonationOffsetFields {
  baselineAmountUsd: number | null;
  baselineOpposedCause: string;
  requestedMatchingAmountUsd: number | null;
  requestedOpposedCause: string;
  compromiseDestinationId: string;
  offsetRatio: number | null;
  timeHorizon: DonationOffsetTimeHorizon;
  verificationMethod: DonationOffsetVerificationMethod;
  unmatchedSurplusRule: DonationOffsetUnmatchedSurplusRule;
  participationMode: DonationOffsetParticipationMode;
  poolId: string;
  poolName: string;
  poolSide: DonationOffsetPoolSide | "";
  assuranceMinimumUsd: number | null;
  poolMaximumCapUsd: number | null;
  assuranceDeadline: string;
  description: string;
  evidenceUrl: string;
}

export interface DonationOffsetSubmissionGuards {
  participationMode: DonationOffsetParticipationMode;
  antiThreatCertification: boolean;
  verificationMetadataAcknowledged: boolean;
  evidenceUrl: string;
}

export interface DonationOffsetPreview {
  matchedBaselineUsd: number;
  matchedCounterpartyUsd: number;
  compromiseTotalUsd: number;
  unmatchedBaselineUsd: number;
  unmatchedCounterpartyUsd: number;
  unmatchedRuleLabel: string;
}

export interface DonationOffsetPoolProgress {
  sideATotalUsd: number;
  sideBTotalUsd: number;
  matchedSideAUsd: number;
  matchedSideBUsd: number;
  matchedCompromiseUsd: number;
  unmatchedSideAUsd: number;
  unmatchedSideBUsd: number;
  assuranceMinimumUsd: number;
  assuranceProgressPct: number;
  assuranceReached: boolean;
  status: "open" | "assurance_pending" | "assurance_met" | "closed";
}

export interface DonationOffsetBatchCommitment {
  id: string;
  participantLabel: string;
  side: DonationOffsetPoolSide;
  amountUsd: number;
  ratioMinimum: number;
  ratioMaximum: number;
  status: "active" | "withdrawn" | "blocked";
}

export interface DonationOffsetCommitmentReservation {
  commitmentId: string;
  participantLabel: string;
  side: DonationOffsetPoolSide;
  committedUsd: number;
  reservedUsd: number;
  unreservedUsd: number;
  ratioMinimum: number;
  ratioMaximum: number;
  reservationStatus: "reserved" | "partially_reserved" | "unreserved" | "blocked";
  blockerCodes: string[];
}

export interface DonationOffsetAtomicSettlementPreview {
  id: string;
  status: "ready_for_final_lock_confirmation" | "blocked_preview_only";
  requiredParticipantCount: number;
  finalConfirmationCount: number;
  allOrNone: true;
  captureAllowed: false;
  relianceBearing: false;
  blockerCodes: string[];
}

export interface DonationOffsetFinalLockProposalPreview {
  id: string;
  status: "preview_only_no_capture" | "blocked";
  exactMatchedSideAUsd: number;
  exactMatchedSideBUsd: number;
  exactCompromiseDestinationUsd: number;
  clearingRatio: string;
  destinationLabel: string;
  evidenceStandard: string;
  deadlineLabel: string;
  requiredFreshConfirmations: number;
  noCapture: true;
  createsPaymentCapture: false;
  relianceBearing: false;
  blockerCodes: string[];
}

export interface DonationOffsetBatchClearingDryRun {
  schemaVersion: "donation-offset-batch-clearing-dry-run-v1";
  poolId: string;
  poolName: string;
  releaseStage: "donation_offset_preview_no_capture";
  ratioBoundStatus: "within_bounds" | "out_of_bounds" | "insufficient_sides";
  commitmentInventory: DonationOffsetCommitmentReservation[];
  matchedSideAUsd: number;
  matchedSideBUsd: number;
  compromiseTotalUsd: number;
  unmatchedSideAUsd: number;
  unmatchedSideBUsd: number;
  assuranceMinimumUsd: number;
  assuranceReached: boolean;
  atomicSettlementGroup: DonationOffsetAtomicSettlementPreview;
  finalLockProposal: DonationOffsetFinalLockProposalPreview;
  userFacingBlockers: string[];
}

export interface DonationOffsetDonorOfRecordInput {
  destinationLabel: string;
  donationPlatform: string;
  donorOfRecordRole: DonationOffsetDonorOfRecordRole;
  donorOfRecordExplanation: string;
  taxReceiptTreatment: DonationOffsetTaxReceiptTreatment;
  taxReceiptExplanation: string;
  taxBenefitClaimed: boolean;
  donorAdvisedFundInvolved: boolean;
  employerMatchInvolved: boolean;
  commercialCoVentureInvolved: boolean;
  charitableSolicitationTreatment: DonationOffsetCharitableSolicitationTreatment;
  jurisdictionReviewRequired: boolean;
  participantAcknowledgedNoTaxAdvice: boolean;
  participantAcknowledgedOperationalNotImpact: boolean;
  receiptDoubleClaimPrevented: boolean;
  receiptReassignmentProhibited: boolean;
  lockTermsFrozenBeforeConfirmation: boolean;
  destinationVerificationStatus: DonationOffsetDestinationVerificationStatus;
}

export interface DonationOffsetDonorOfRecordGate {
  key: string;
  label: string;
  status: DonationOffsetDonorOfRecordGateStatus;
  detail: string;
  nextAction: string;
  blockerCodes: string[];
}

export interface DonationOffsetDonorOfRecordPreview {
  schemaVersion: "donation-offset-donor-of-record-preview-v1";
  releaseStage: "donation_offset_preview_no_capture";
  captureAllowed: false;
  relianceBearing: false;
  taxAdviceProvided: false;
  taxDeductibilityClaimAllowed: false;
  receiptCreatesImpactClaim: false;
  requiresFrozenLockTreatment: true;
  requiresJurisdictionReviewBeforeTaxBenefitClaim: true;
  destinationLabel: string;
  donationPlatform: string;
  donorOfRecordRole: DonationOffsetDonorOfRecordRole;
  taxReceiptTreatment: DonationOffsetTaxReceiptTreatment;
  gates: DonationOffsetDonorOfRecordGate[];
  blockedGateCount: number;
  humanReviewGateCount: number;
  readyForLockReview: boolean;
}

export interface DonationOffsetPaymentDestinationInput {
  recipientLabel: string;
  recipientIdentityStatus: DonationOffsetRecipientIdentityStatus;
  paymentDestinationKind: DonationOffsetPaymentDestinationKind;
  paymentDestinationLocator: string;
  paymentDestinationReviewStatus: DonationOffsetPaymentDestinationReviewStatus;
  antiImpersonationReviewed: boolean;
  jurisdictionReviewed: boolean;
  prohibitedUseReviewed: boolean;
  destinationControlledByRecipient: boolean;
  freeTextDestination: boolean;
  reuseAcrossAgreementsRequested: boolean;
  captureOrReleaseRequested: boolean;
  participantAcknowledgedEvidenceNotDestination: boolean;
  participantAcknowledgedNoCaptureBeforeVerification: boolean;
}

export interface DonationOffsetPaymentDestinationGate {
  key: string;
  label: string;
  status: DonationOffsetPaymentDestinationGateStatus;
  detail: string;
  nextAction: string;
  blockerCodes: string[];
}

export interface DonationOffsetPaymentDestinationPreview {
  schemaVersion: "donation-offset-payment-destination-preview-v1";
  releaseStage: "donation_offset_preview_no_capture";
  captureAllowed: false;
  releaseAllowed: false;
  relianceBearing: false;
  freeTextDestinationReusable: false;
  evidenceLocatorIsPaymentDestination: false;
  requiresRecipientRegistryEntry: true;
  requiresVerifiedPaymentDestinationBeforeCapture: true;
  recipientLabel: string;
  recipientIdentityStatus: DonationOffsetRecipientIdentityStatus;
  paymentDestinationKind: DonationOffsetPaymentDestinationKind;
  paymentDestinationLocator: string;
  paymentDestinationReviewStatus: DonationOffsetPaymentDestinationReviewStatus;
  gates: DonationOffsetPaymentDestinationGate[];
  blockedGateCount: number;
  humanReviewGateCount: number;
  readyForRecipientRegistryReview: boolean;
}

export interface DonationOffsetExternalityEvidenceInput {
  recipientLabel: string;
  nonparticipantExternalityStatus: DonationOffsetNonparticipantExternalityStatus;
  nonparticipantHarmSummary: string;
  antiThreatReviewed: boolean;
  evidenceBurden: DonationOffsetEvidenceBurden;
  evidencePlanSummary: string;
  leastIntrusiveAlternative: string;
  privacySensitiveEvidenceRequested: boolean;
  highBurdenEvidenceReviewerApproved: boolean;
  impactClaimReviewRequired: boolean;
  impactClaimMethodologyReviewed: boolean;
  fallbackPolicy: DonationOffsetFallbackPolicy;
  fallbackExplanation: string;
  lockOrRelianceRequested: boolean;
  participantAcknowledgedNonparticipantHarmsNotWaived: boolean;
  participantAcknowledgedLeastIntrusiveEvidence: boolean;
  participantAcknowledgedNoImpactClaimFromReceipt: boolean;
  participantAcknowledgedFallbackNoSilentReroute: boolean;
}

export interface DonationOffsetExternalityEvidenceGate {
  key: string;
  label: string;
  status: DonationOffsetExternalityEvidenceGateStatus;
  detail: string;
  nextAction: string;
  blockerCodes: string[];
}

export interface DonationOffsetExternalityEvidencePreview {
  schemaVersion: "donation-offset-externality-evidence-preview-v1";
  releaseStage: "donation_offset_preview_no_capture";
  captureAllowed: false;
  clearingAllowed: false;
  relianceBearing: false;
  participantConsentWaivesNonparticipantHarms: false;
  receiptCreatesImpactClaim: false;
  requiresNonparticipantExternalityReviewBeforeClearing: true;
  requiresLeastIntrusiveEvidenceBeforeLock: true;
  requiresFallbackPolicyBeforeLock: true;
  recipientLabel: string;
  nonparticipantExternalityStatus: DonationOffsetNonparticipantExternalityStatus;
  evidenceBurden: DonationOffsetEvidenceBurden;
  fallbackPolicy: DonationOffsetFallbackPolicy;
  gates: DonationOffsetExternalityEvidenceGate[];
  blockedGateCount: number;
  humanReviewGateCount: number;
  readyForExternalityReview: boolean;
}

export interface DonationOffsetParticipantConfirmationInput {
  baselineSnapshotId: string;
  termsSnapshotId: string;
  policySnapshotId: string;
  maximumExposureUsd: number | null;
  matchedTradeLockProposalStatus: DonationOffsetMatchedLockProposalStatus;
  confirmationRecordStatus: DonationOffsetParticipantConfirmationRecordStatus;
  consentQualityStatus: DonationOffsetConsentQualityStatus;
  noticeRecordStatus: DonationOffsetNoticeRecordStatus;
  confirmationScope: DonationOffsetConfirmationScope;
  amendmentStatus: DonationOffsetAmendmentStatus;
  affectedParticipantCount: number;
  freshConfirmationCount: number;
  participantSurplusConfirmed: boolean;
  participantSurplusStatement: string;
  materialChangePending: boolean;
  lockOrCaptureRequested: boolean;
  participantAcknowledgedBaselineComparison: boolean;
  participantAcknowledgedFreshConfirmationRequired: boolean;
  participantAcknowledgedNoPreselectedPaidCommitment: boolean;
  participantAcknowledgedNoDarkPattern: boolean;
}

export interface DonationOffsetParticipantConfirmationGate {
  key: string;
  label: string;
  status: DonationOffsetParticipantConfirmationGateStatus;
  detail: string;
  nextAction: string;
  blockerCodes: string[];
}

export interface DonationOffsetParticipantConfirmationPreview {
  schemaVersion: "donation-offset-participant-confirmation-preview-v1";
  releaseStage: "donation_offset_preview_no_capture";
  captureAllowed: false;
  clearingAllowed: false;
  relianceBearing: false;
  platformInfersMoralSurplus: false;
  checkboxAuthorizesCapture: false;
  requiresParticipantConfirmationRecord: true;
  requiresMatchedLockProposal: true;
  requiresConsentQualityRecord: true;
  baselineSnapshotId: string;
  termsSnapshotId: string;
  policySnapshotId: string;
  maximumExposureUsd: number;
  confirmationScope: DonationOffsetConfirmationScope;
  amendmentStatus: DonationOffsetAmendmentStatus;
  affectedParticipantCount: number;
  freshConfirmationCount: number;
  matchedTradeLockProposalStatus: DonationOffsetMatchedLockProposalStatus;
  confirmationRecordStatus: DonationOffsetParticipantConfirmationRecordStatus;
  consentQualityStatus: DonationOffsetConsentQualityStatus;
  noticeRecordStatus: DonationOffsetNoticeRecordStatus;
  gates: DonationOffsetParticipantConfirmationGate[];
  blockedGateCount: number;
  humanReviewGateCount: number;
  readyForFinalLockReview: boolean;
}

export interface DonationOffsetSafetyAuthenticityInput {
  publicDescription: string;
  evidencePlanSummary: string;
  paymentPatternSummary: string;
  sideAgreementSummary: string;
  privacyGrantStatus: DonationOffsetPrivacyGrantStatus;
  confidentialityPrivacy: DonationOffsetBinarySafetyAssertion;
  evidenceAuthenticity: DonationOffsetBinarySafetyAssertion;
  financialCrime: DonationOffsetBinarySafetyAssertion;
  nonTransferability: DonationOffsetBinarySafetyAssertion;
  regulatedGoodsHazardousActivity: DonationOffsetBinarySafetyAssertion;
  cyberAbuseDigitalIntegrity: DonationOffsetBinarySafetyAssertion;
  antiCorruptionProcessIntegrity: DonationOffsetBinarySafetyAssertion;
  privacySensitiveEvidenceRequested: boolean;
  sourceAuthenticationReviewed: boolean;
  lockOrRelianceRequested: boolean;
  participantAcknowledgedNoUnauthorizedPrivateDisclosure: boolean;
  participantAcknowledgedClaimTypedEvidence: boolean;
  participantAcknowledgedNonTransferability: boolean;
}

export interface DonationOffsetSafetyAuthenticityGate {
  key: string;
  label: string;
  status: DonationOffsetSafetyAuthenticityGateStatus;
  detail: string;
  nextAction: string;
  blockerCodes: string[];
}

export interface DonationOffsetSafetyAuthenticityPreview {
  schemaVersion: "donation-offset-safety-authenticity-preview-v1";
  releaseStage: "donation_offset_preview_no_capture";
  captureAllowed: false;
  clearingAllowed: false;
  relianceBearing: false;
  evidenceUploadCreatesReliance: false;
  hashStorageProvesAuthenticity: false;
  privacyGrantRequiredBeforeDisclosure: true;
  evidenceAuthenticityReviewRequired: true;
  financialCrimeReviewRequired: true;
  nonTransferableByDefault: true;
  privacyGrantStatus: DonationOffsetPrivacyGrantStatus;
  confidentialityPrivacy: DonationOffsetBinarySafetyAssertion;
  evidenceAuthenticity: DonationOffsetBinarySafetyAssertion;
  financialCrime: DonationOffsetBinarySafetyAssertion;
  nonTransferability: DonationOffsetBinarySafetyAssertion;
  regulatedGoodsHazardousActivity: DonationOffsetBinarySafetyAssertion;
  cyberAbuseDigitalIntegrity: DonationOffsetBinarySafetyAssertion;
  antiCorruptionProcessIntegrity: DonationOffsetBinarySafetyAssertion;
  privacySensitiveEvidenceRequested: boolean;
  sourceAuthenticationReviewed: boolean;
  gates: DonationOffsetSafetyAuthenticityGate[];
  blockedGateCount: number;
  humanReviewGateCount: number;
  readyForSafetyReview: boolean;
}

export interface DonationOffsetAuthorityFairnessInput {
  publicDescription: string;
  baselineStatement: string;
  authoritySummary: string;
  sideAgreementSummary: string;
  baselineIntegrityStatus: DonationOffsetBaselineIntegrityStatus;
  thirdPartyObligationStatus: DonationOffsetThirdPartyObligationStatus;
  representativeAuthorityStatus: DonationOffsetRepresentativeAuthorityStatus;
  reportingIntegrity: DonationOffsetBinarySafetyAssertion;
  civilRights: DonationOffsetBinarySafetyAssertion;
  participantAutonomy: DonationOffsetBinarySafetyAssertion;
  jurisdictionReviewStatus: DonationOffsetJurisdictionReviewStatus;
  lockOrRelianceRequested: boolean;
  participantAcknowledgedOwnResourcesOnly: boolean;
  participantAcknowledgedNoReportingSuppression: boolean;
  participantAcknowledgedNoDiscrimination: boolean;
  participantAcknowledgedNoCoercion: boolean;
}

export interface DonationOffsetAuthorityFairnessGate {
  key: string;
  label: string;
  status: DonationOffsetAuthorityFairnessGateStatus;
  detail: string;
  nextAction: string;
  blockerCodes: string[];
}

export interface DonationOffsetAuthorityFairnessPreview {
  schemaVersion: "donation-offset-authority-fairness-preview-v1";
  releaseStage: "donation_offset_preview_no_capture";
  captureAllowed: false;
  clearingAllowed: false;
  relianceBearing: false;
  participantMayBindOnlySelfByDefault: true;
  baselineManufacturingBlocked: true;
  reportingSuppressionBlocked: true;
  coerciveConsentNotSufficient: true;
  civilRightsReviewRequired: true;
  baselineIntegrityStatus: DonationOffsetBaselineIntegrityStatus;
  thirdPartyObligationStatus: DonationOffsetThirdPartyObligationStatus;
  representativeAuthorityStatus: DonationOffsetRepresentativeAuthorityStatus;
  jurisdictionReviewStatus: DonationOffsetJurisdictionReviewStatus;
  reportingIntegrity: DonationOffsetBinarySafetyAssertion;
  civilRights: DonationOffsetBinarySafetyAssertion;
  participantAutonomy: DonationOffsetBinarySafetyAssertion;
  gates: DonationOffsetAuthorityFairnessGate[];
  blockedGateCount: number;
  humanReviewGateCount: number;
  readyForAuthorityReview: boolean;
}

export interface DonationOffsetModerationAssessment {
  status: DonationOffsetModerationStatus;
  reasons: string[];
}

const blockedOffsetPatterns: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern:
      /\b(threat|threaten|blackmail|extort|coerce|hostage|unless[\s\S]{0,40}\b(pay|agree|match|redirect)\b|i will donate to|or i will donate to)\b/i,
    label: "The offer reads like a threat or extortion attempt rather than a moral trade.",
  },
  {
    pattern:
      /\b(campaign contribution|super pac|super-pac|pac|candidate committee|election donation|campaign donation)\b/i,
    label: "Political campaign offsets are not allowed on Moral Trade.",
  },
  {
    pattern: /\b(kill|murder|assault|terror|bomb|poison|weaponize)\b/i,
    label: "Offers involving violence or deliberate harm are not allowed.",
  },
];

export const REGISTERED_CHARITIES: readonly RegisteredCharity[] = [
  {
    id: "givewell-top-charities-fund",
    name: "GiveWell Top Charities Fund",
    causeArea: "Global poverty",
    websiteUrl: "https://www.every.org/givewell-top-charities-fund",
    summary:
      "A broadly legible anti-poverty and global-health destination for donors who want a compromise charity many moral views can endorse.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
    isMoralPublicGood: true,
    consensusLabel: "Global health and anti-poverty",
    sortOrder: 10,
  },
  {
    id: "against-malaria-foundation",
    name: "Against Malaria Foundation",
    causeArea: "Global health",
    websiteUrl: "https://www.againstmalaria.com/",
    summary:
      "Funds insecticide-treated nets through an individual GiveWell-recommended malaria prevention program.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
    isMoralPublicGood: true,
    consensusLabel: "Malaria prevention",
    sortOrder: 11,
  },
  {
    id: "malaria-consortium-smc",
    name: "Malaria Consortium — Seasonal Malaria Chemoprevention",
    causeArea: "Global health",
    websiteUrl: "https://www.malariaconsortium.org/",
    summary:
      "Supports seasonal malaria chemoprevention through an individual GiveWell-recommended program.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
    isMoralPublicGood: true,
    consensusLabel: "Malaria prevention",
    sortOrder: 12,
  },
  {
    id: "helen-keller-intl-vitamin-a",
    name: "Helen Keller Intl — Vitamin A Supplementation",
    causeArea: "Global health",
    websiteUrl: "https://helenkellerintl.org/",
    summary:
      "Supports vitamin A supplementation through an individual GiveWell-recommended program.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
    isMoralPublicGood: true,
    consensusLabel: "Child health and nutrition",
    sortOrder: 13,
  },
  {
    id: "new-incentives",
    name: "New Incentives",
    causeArea: "Global health",
    websiteUrl: "https://www.newincentives.org/",
    summary:
      "Supports vaccination uptake through an individual GiveWell-recommended conditional-cash-transfer program.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
    isMoralPublicGood: true,
    consensusLabel: "Childhood vaccination",
    sortOrder: 14,
  },
  {
    id: "direct-relief",
    name: "Direct Relief",
    causeArea: "Public health",
    websiteUrl: "https://www.directrelief.org/",
    summary:
      "A widely recognisable public-health charity for offsets that need a simple, high-trust compromise destination.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
    isMoralPublicGood: true,
    consensusLabel: "Emergency public health",
    sortOrder: 20,
  },
  {
    id: "founders-pledge-climate-fund",
    name: "Founders Pledge Climate Fund",
    causeArea: "Climate",
    websiteUrl: "https://www.every.org/climate.fund",
    summary:
      "A climate compromise destination suitable when both sides value broad reductions in climate risk or pollution harms.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
    isMoralPublicGood: true,
    consensusLabel: "Climate and air quality",
    sortOrder: 30,
  },
  {
    id: "animal-charity-evaluators-fund",
    name: "ACE Recommended Charity Fund",
    causeArea: "Animal welfare",
    websiteUrl: "https://www.every.org/animalcharityevaluators/f/recommended-charity-c87e",
    summary:
      "A fund for neglected-animal interventions when both sides can agree that avoiding zero-sum advocacy is better than opposed spending.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
    isMoralPublicGood: true,
    consensusLabel: "Animal welfare",
    sortOrder: 40,
  },
  {
    id: "ea-long-term-future-fund",
    name: "EA Long-Term Future Fund",
    causeArea: "Future flourishing",
    websiteUrl: "https://www.every.org/ea-long-term-future-fund",
    summary:
      "A long-run future destination covering existential risk and broadly shared future-flourishing concerns.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
    isMoralPublicGood: true,
    consensusLabel: "Future flourishing",
    sortOrder: 50,
  },
  {
    id: "campaign-example-prohibited",
    name: "Illustrative political campaign committee",
    causeArea: "Political campaign",
    websiteUrl: "https://example.invalid/campaign",
    summary:
      "A prohibited example used to ensure the platform rejects campaign-offset attempts.",
    isActive: false,
    isPoliticalCampaign: true,
    selectable: false,
    isMoralPublicGood: false,
    consensusLabel: "Prohibited",
    sortOrder: 999,
  },
] as const;

export const DONATION_OFFSET_TIME_HORIZON_OPTIONS: Array<{
  value: DonationOffsetTimeHorizon;
  label: string;
}> = [
  { value: "one_off", label: "One-off" },
  { value: "recurring", label: "Recurring" },
];

export const DONATION_OFFSET_PARTICIPATION_MODE_OPTIONS: Array<{
  value: DonationOffsetParticipationMode;
  label: string;
  description: string;
}> = [
  {
    value: "direct",
    label: "Direct match",
    description: "Use this for one-to-one offsets where a single counterparty matches the offer.",
  },
  {
    value: "pool",
    label: "Offset pool",
    description:
      "Use this when multiple donors on each side should aggregate into one larger offset with assurance thresholds.",
  },
];

export const DONATION_OFFSET_POOL_SIDE_OPTIONS: Array<{
  value: DonationOffsetPoolSide;
  label: string;
}> = [
  { value: "side_a", label: "Side A" },
  { value: "side_b", label: "Side B" },
];

export const DONATION_OFFSET_VERIFICATION_OPTIONS: Array<{
  value: DonationOffsetVerificationMethod;
  label: string;
}> = [
  { value: "proof_of_past_donations", label: "Proof of past donations" },
  { value: "funds_in_escrow", label: "Third-party payment; not legal escrow" },
  { value: "third_party_audit", label: "Third-party audit" },
];

export const DONATION_OFFSET_UNMATCHED_RULE_OPTIONS: Array<{
  value: DonationOffsetUnmatchedSurplusRule;
  label: string;
}> = [
  { value: "return_to_donors", label: "Return to donor" },
  {
    value: "donate_to_compromise_destination",
    label: "Donate to compromise destination",
  },
  { value: "donate_to_original_cause", label: "Donate to original cause" },
];

export function createDefaultDonationOffsetFields(): DonationOffsetFields {
  return {
    baselineAmountUsd: 1000,
    baselineOpposedCause: "Gun rights",
    requestedMatchingAmountUsd: 1000,
    requestedOpposedCause: "Gun control",
    compromiseDestinationId: "givewell-top-charities-fund",
    offsetRatio: 1,
    timeHorizon: "one_off",
    verificationMethod: "proof_of_past_donations",
    unmatchedSurplusRule: "donate_to_compromise_destination",
    participationMode: "direct",
    poolId: "",
    poolName: "",
    poolSide: "",
    assuranceMinimumUsd: null,
    poolMaximumCapUsd: 10_000,
    assuranceDeadline: "",
    description: "",
    evidenceUrl: "",
  };
}

export function normalizeUsdAmount(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN)) {
    return null;
  }

  const numeric = Number(value);
  return numeric > 0 ? Number(numeric.toFixed(2)) : null;
}

export function normalizeUsdThreshold(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN)) {
    return null;
  }

  const numeric = Number(value);
  return numeric >= 0 ? Number(numeric.toFixed(2)) : null;
}

export function findRegisteredCharityById(id: string | null | undefined) {
  if (!id) {
    return null;
  }

  return REGISTERED_CHARITIES.find((charity) => charity.id === id) ?? null;
}

export function getSelectableRegisteredCharities() {
  return [...REGISTERED_CHARITIES]
    .filter((charity) => charity.selectable && charity.isActive)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}

export function getConsensusCharities() {
  return getSelectableRegisteredCharities().filter((charity) => charity.isMoralPublicGood);
}

export function formatDonationOffsetRatio(value: number | null | undefined) {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return "1:1";
  }

  return `1:${Number(value.toFixed(2)).toString()}`;
}

export function formatDonationOffsetTimeHorizon(value: DonationOffsetTimeHorizon) {
  return value === "recurring" ? "Recurring" : "One-off";
}

export function formatDonationOffsetParticipationMode(value: DonationOffsetParticipationMode) {
  return value === "pool" ? "Offset pool" : "Direct match";
}

export function formatDonationOffsetPoolSide(
  value: DonationOffsetPoolSide | "",
  labels?: { sideALabel?: string | null; sideBLabel?: string | null },
) {
  if (value === "side_a") {
    return labels?.sideALabel || "Side A";
  }

  if (value === "side_b") {
    return labels?.sideBLabel || "Side B";
  }

  return "Not assigned";
}

export function formatDonationOffsetVerificationMethod(value: DonationOffsetVerificationMethod) {
  switch (value) {
    case "funds_in_escrow":
      return "Third-party payment; not legal escrow";
    case "third_party_audit":
      return "Third-party audit";
    case "proof_of_past_donations":
    case "receipts_uploaded":
    default:
      return "Proof of past donations";
  }
}

export function formatDonationOffsetUnmatchedRule(value: DonationOffsetUnmatchedSurplusRule) {
  switch (value) {
    case "donate_to_compromise_destination":
      return "Any unmatched remainder goes to the compromise destination.";
    case "donate_to_original_cause":
      return "Any unmatched remainder returns to its original cause rather than the compromise fund.";
    case "split_evenly":
      return "Any unmatched remainder is split evenly between the donors.";
    default:
      return "Any unmatched remainder returns to the original donors.";
  }
}

export function normalizeDonationOffsetDonorOfRecordRole(
  value: string | null | undefined,
): DonationOffsetDonorOfRecordRole {
  if (
    value === "counterparty_direct_donor" ||
    value === "sponsor_or_third_party" ||
    value === "platform_not_donor" ||
    value === "unknown"
  ) {
    return value;
  }

  return "participant_direct_donor";
}

export function normalizeDonationOffsetTaxReceiptTreatment(
  value: string | null | undefined,
): DonationOffsetTaxReceiptTreatment {
  if (
    value === "participant_may_receive_receipt" ||
    value === "counterparty_may_receive_receipt" ||
    value === "third_party_or_daf_receipt" ||
    value === "unknown_or_unreviewed"
  ) {
    return value;
  }

  return "no_tax_benefit_claimed";
}

export function normalizeDonationOffsetCharitableSolicitationTreatment(
  value: string | null | undefined,
): DonationOffsetCharitableSolicitationTreatment {
  if (
    value === "platform_facilitated_messaging_needs_review" ||
    value === "commercial_co_venture_or_match_promo" ||
    value === "unknown"
  ) {
    return value;
  }

  return "external_donation_only_no_platform_solicitation";
}

export function normalizeDonationOffsetDestinationVerificationStatus(
  value: string | null | undefined,
): DonationOffsetDestinationVerificationStatus {
  if (value === "external_unverified" || value === "unknown") {
    return value;
  }

  return "registered_destination_selected";
}

export function normalizeDonationOffsetRecipientIdentityStatus(
  value: string | null | undefined,
): DonationOffsetRecipientIdentityStatus {
  if (
    value === "registered_recipient" ||
    value === "fiscal_host_or_intermediary" ||
    value === "free_text_or_unverified" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetPaymentDestinationKind(
  value: string | null | undefined,
): DonationOffsetPaymentDestinationKind {
  if (
    value === "registered_charity_page" ||
    value === "payment_processor_link" ||
    value === "bank_account" ||
    value === "wallet_address" ||
    value === "fiscal_host" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetPaymentDestinationReviewStatus(
  value: string | null | undefined,
): DonationOffsetPaymentDestinationReviewStatus {
  if (
    value === "verified" ||
    value === "needs_review" ||
    value === "blocked" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetNonparticipantExternalityStatus(
  value: string | null | undefined,
): DonationOffsetNonparticipantExternalityStatus {
  if (
    value === "non_blocking_review" ||
    value === "needs_review" ||
    value === "serious_unresolved_harm" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetEvidenceBurden(
  value: string | null | undefined,
): DonationOffsetEvidenceBurden {
  if (
    value === "ordinary_receipt_or_public_log" ||
    value === "third_party_audit" ||
    value === "privacy_sensitive_or_high_burden" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetFallbackPolicy(
  value: string | null | undefined,
): DonationOffsetFallbackPolicy {
  if (
    value === "cancel_or_refund" ||
    value === "carry_forward_with_renewed_confirmation" ||
    value === "manual_review" ||
    value === "return_to_donors" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetMatchedLockProposalStatus(
  value: string | null | undefined,
): DonationOffsetMatchedLockProposalStatus {
  if (
    value === "drafted" ||
    value === "not_created" ||
    value === "stale" ||
    value === "superseded" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetParticipantConfirmationRecordStatus(
  value: string | null | undefined,
): DonationOffsetParticipantConfirmationRecordStatus {
  if (
    value === "recorded_non_stale" ||
    value === "draft_only" ||
    value === "missing" ||
    value === "stale" ||
    value === "superseded" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetConsentQualityStatus(
  value: string | null | undefined,
): DonationOffsetConsentQualityStatus {
  if (
    value === "passed" ||
    value === "needs_review" ||
    value === "failed" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetNoticeRecordStatus(
  value: string | null | undefined,
): DonationOffsetNoticeRecordStatus {
  if (
    value === "recorded" ||
    value === "missing" ||
    value === "failed" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetConfirmationScope(
  value: string | null | undefined,
): DonationOffsetConfirmationScope {
  if (
    value === "preview_only" ||
    value === "final_lock" ||
    value === "renewed_material_change" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetAmendmentStatus(
  value: string | null | undefined,
): DonationOffsetAmendmentStatus {
  if (
    value === "none" ||
    value === "drafted_needs_confirmation" ||
    value === "confirmed" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetBinarySafetyAssertion(
  value: string | null | undefined,
): DonationOffsetBinarySafetyAssertion {
  if (value === "clear" || value === "possible_or_unknown" || value === "triggered") {
    return value;
  }

  return "possible_or_unknown";
}

export function normalizeDonationOffsetPrivacyGrantStatus(
  value: string | null | undefined,
): DonationOffsetPrivacyGrantStatus {
  if (
    value === "not_needed" ||
    value === "drafted" ||
    value === "approved" ||
    value === "missing" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetBaselineIntegrityStatus(
  value: string | null | undefined,
): DonationOffsetBaselineIntegrityStatus {
  if (
    value === "non_blocking_review" ||
    value === "needs_review" ||
    value === "manufactured_or_escalated" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetThirdPartyObligationStatus(
  value: string | null | undefined,
): DonationOffsetThirdPartyObligationStatus {
  if (
    value === "none_known" ||
    value === "possible_or_unknown" ||
    value === "conflict_declared"
  ) {
    return value;
  }

  return "possible_or_unknown";
}

export function normalizeDonationOffsetRepresentativeAuthorityStatus(
  value: string | null | undefined,
): DonationOffsetRepresentativeAuthorityStatus {
  if (
    value === "self_only" ||
    value === "verified_authority" ||
    value === "claims_representative_authority" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function normalizeDonationOffsetJurisdictionReviewStatus(
  value: string | null | undefined,
): DonationOffsetJurisdictionReviewStatus {
  if (
    value === "not_needed" ||
    value === "non_blocking_review" ||
    value === "needs_review" ||
    value === "blocked" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function donorGate({
  key,
  label,
  status,
  detail,
  nextAction,
  blockerCodes = [],
}: DonationOffsetDonorOfRecordGate) {
  return {
    key,
    label,
    status,
    detail,
    nextAction,
    blockerCodes,
  };
}

function hasMeaningfulText(value: string) {
  return value.trim().length >= 12;
}

function formatDonationOffsetDonorGateStatus(status: DonationOffsetDonorOfRecordGateStatus) {
  return status.replaceAll("_", " ");
}

const donationOffsetSafetyKeywordGroups = {
  confidentialityPrivacy: [
    "password",
    "access token",
    "private message",
    "dox",
    "doxx",
    "location log",
    "medical record",
    "immigration record",
    "employee record",
    "client record",
    "patient record",
    "student record",
    "trade secret",
    "private key",
  ],
  evidenceAuthenticity: [
    "fake receipt",
    "synthetic receipt",
    "ai-generated receipt",
    "ai generated receipt",
    "edited receipt",
    "replayed receipt",
    "selectively edited",
    "source detached",
    "forged",
    "fabricated",
  ],
  financialCrime: [
    "money laundering",
    "sanctions",
    "stolen funds",
    "stolen card",
    "fake receipt",
    "chargeback",
    "refund abuse",
    "card testing",
    "circular routing",
    "disguised compensation",
  ],
  transferability: [
    "assign this agreement",
    "sell this agreement",
    "resell",
    "tokenize",
    "securitize",
    "secondary market",
    "moral trade credit",
    "transfer rights",
  ],
  regulatedGoods: [
    "weapon",
    "firearm",
    "explosive",
    "controlled substance",
    "hazardous chemical",
    "unsafe medical",
    "biosecurity",
  ],
  cyberAbuse: [
    "hack",
    "malware",
    "phishing",
    "ddos",
    "denial of service",
    "unauthorized access",
    "scrape private",
    "data exfiltration",
    "botting",
  ],
  antiCorruption: [
    "bribe",
    "kickback",
    "improper payment",
    "vote buying",
    "pay for testimony",
    "procurement decision",
    "official favor",
    "undisclosed conflict",
  ],
};

const donationOffsetAuthorityKeywordGroups = {
  baselineManufacturing: [
    "i will donate to",
    "or i will donate to",
    "unless you match",
    "unless someone pays",
    "increase my donation if",
    "threaten",
    "blackmail",
    "extort",
  ],
  thirdPartyObligation: [
    "employment duty",
    "fiduciary duty",
    "contract requires",
    "court order",
    "confidentiality duty",
    "donor restriction",
    "school rule",
    "professional obligation",
  ],
  representativeAuthority: [
    "on behalf of",
    "for my company",
    "for my employer",
    "client funds",
    "family member",
    "donor-advised fund",
    "fiscal host",
    "account holder",
  ],
  reportingIntegrity: [
    "do not report",
    "don't report",
    "not report",
    "withdraw complaint",
    "drop complaint",
    "stay silent",
    "keep silent",
    "hide misconduct",
    "false statement",
    "suppress evidence",
  ],
  civilRights: [
    "discriminate",
    "exclude people based on",
    "protected trait",
    "retaliate",
    "segregate",
    "refuse service",
    "protected activity",
  ],
  participantAutonomy: [
    "must accept",
    "under pressure",
    "dependent on me",
    "immigration status",
    "housing crisis",
    "medical crisis",
    "caregiver",
    "employer power",
    "urgent cash",
  ],
};

function hasDonationOffsetSafetyKeyword(text: string, keywords: readonly string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function donationOffsetSafetyGate({
  key,
  label,
  status,
  detail,
  nextAction,
  blockerCodes = [],
}: DonationOffsetSafetyAuthenticityGate) {
  return {
    key,
    label,
    status,
    detail,
    nextAction,
    blockerCodes,
  };
}

function donationOffsetBinarySafetyStatus(
  assertion: DonationOffsetBinarySafetyAssertion,
  textTriggered: boolean,
) {
  if (assertion === "triggered" || textTriggered) {
    return "blocked" as const;
  }

  if (assertion === "possible_or_unknown") {
    return "human_review" as const;
  }

  return "pass" as const;
}

function blockIfSafetyLockOrRelianceRequested(
  status: DonationOffsetSafetyAuthenticityGateStatus,
  lockOrRelianceRequested: boolean,
) {
  return lockOrRelianceRequested && status !== "pass" ? "blocked" : status;
}

function donationOffsetSafetyDetail(
  status: DonationOffsetSafetyAuthenticityGateStatus,
  passDetail: string,
  reviewDetail: string,
  blockedDetail: string,
) {
  if (status === "blocked") {
    return blockedDetail;
  }

  if (status === "human_review" || status === "needs_input") {
    return reviewDetail;
  }

  return passDetail;
}

function donationOffsetAuthorityGate({
  key,
  label,
  status,
  detail,
  nextAction,
  blockerCodes = [],
}: DonationOffsetAuthorityFairnessGate) {
  return {
    key,
    label,
    status,
    detail,
    nextAction,
    blockerCodes,
  };
}

function blockIfAuthorityLockOrRelianceRequested(
  status: DonationOffsetAuthorityFairnessGateStatus,
  lockOrRelianceRequested: boolean,
) {
  return lockOrRelianceRequested && status !== "pass" ? "blocked" : status;
}

function donationOffsetAuthorityDetail(
  status: DonationOffsetAuthorityFairnessGateStatus,
  passDetail: string,
  reviewDetail: string,
  blockedDetail: string,
) {
  if (status === "blocked") {
    return blockedDetail;
  }

  if (status === "human_review" || status === "needs_input") {
    return reviewDetail;
  }

  return passDetail;
}

function paymentDestinationGate({
  key,
  label,
  status,
  detail,
  nextAction,
  blockerCodes = [],
}: DonationOffsetPaymentDestinationGate) {
  return {
    key,
    label,
    status,
    detail,
    nextAction,
    blockerCodes,
  };
}

function hasPaymentDestinationLocator(value: string) {
  return value.trim().length >= 6;
}

function formatDonationOffsetPaymentDestinationGateStatus(
  status: DonationOffsetPaymentDestinationGateStatus,
) {
  return status.replaceAll("_", " ");
}

function blockIfCaptureOrReleaseRequested(
  status: DonationOffsetPaymentDestinationGateStatus,
  captureOrReleaseRequested: boolean,
) {
  return captureOrReleaseRequested && status !== "pass" ? "blocked" : status;
}

function externalityEvidenceGate({
  key,
  label,
  status,
  detail,
  nextAction,
  blockerCodes = [],
}: DonationOffsetExternalityEvidenceGate) {
  return {
    key,
    label,
    status,
    detail,
    nextAction,
    blockerCodes,
  };
}

function blockIfLockOrRelianceRequested(
  status: DonationOffsetExternalityEvidenceGateStatus,
  lockOrRelianceRequested: boolean,
) {
  return lockOrRelianceRequested && status !== "pass" ? "blocked" : status;
}

function participantConfirmationGate({
  key,
  label,
  status,
  detail,
  nextAction,
  blockerCodes = [],
}: DonationOffsetParticipantConfirmationGate) {
  return {
    key,
    label,
    status,
    detail,
    nextAction,
    blockerCodes,
  };
}

function blockIfLockOrCaptureRequested(
  status: DonationOffsetParticipantConfirmationGateStatus,
  lockOrCaptureRequested: boolean,
) {
  return lockOrCaptureRequested && status !== "pass" ? "blocked" : status;
}

export function buildDonationOffsetPaymentDestinationPreview(
  input: DonationOffsetPaymentDestinationInput,
): DonationOffsetPaymentDestinationPreview {
  const recipientLabelPresent = hasMeaningfulText(input.recipientLabel);
  const locatorPresent = hasPaymentDestinationLocator(input.paymentDestinationLocator);
  const recipientNeedsRegistryReview =
    input.recipientIdentityStatus === "fiscal_host_or_intermediary" ||
    input.recipientIdentityStatus === "free_text_or_unverified";
  const rawFreeTextDestination =
    input.freeTextDestination ||
    input.recipientIdentityStatus === "free_text_or_unverified" ||
    input.paymentDestinationKind === "bank_account" ||
    input.paymentDestinationKind === "wallet_address";
  const paymentDestinationReviewPassed =
    input.paymentDestinationReviewStatus === "verified" &&
    input.paymentDestinationKind !== "unknown" &&
    locatorPresent;
  const antiImpersonationStatus = blockIfCaptureOrReleaseRequested(
    input.antiImpersonationReviewed ? "pass" : "human_review",
    input.captureOrReleaseRequested,
  );
  const jurisdictionStatus = blockIfCaptureOrReleaseRequested(
    input.jurisdictionReviewed ? "pass" : "human_review",
    input.captureOrReleaseRequested,
  );
  const prohibitedUseStatus = blockIfCaptureOrReleaseRequested(
    input.prohibitedUseReviewed ? "pass" : "human_review",
    input.captureOrReleaseRequested,
  );
  const recipientControlStatus = blockIfCaptureOrReleaseRequested(
    input.destinationControlledByRecipient ? "pass" : "human_review",
    input.captureOrReleaseRequested,
  );
  const recipientIdentityStatus = blockIfCaptureOrReleaseRequested(
    !recipientLabelPresent || input.recipientIdentityStatus === "unknown"
      ? "needs_input"
      : recipientNeedsRegistryReview
        ? "human_review"
        : "pass",
    input.captureOrReleaseRequested,
  );
  const paymentDestinationStatus = blockIfCaptureOrReleaseRequested(
    input.paymentDestinationReviewStatus === "blocked"
      ? "blocked"
      : !locatorPresent ||
          input.paymentDestinationKind === "unknown" ||
          input.paymentDestinationReviewStatus === "unknown"
        ? "needs_input"
        : paymentDestinationReviewPassed
          ? "pass"
          : "human_review",
    input.captureOrReleaseRequested,
  );
  const freeTextReuseStatus =
    rawFreeTextDestination || input.reuseAcrossAgreementsRequested
      ? blockIfCaptureOrReleaseRequested(
          input.reuseAcrossAgreementsRequested && !paymentDestinationReviewPassed
            ? "blocked"
            : "human_review",
          input.captureOrReleaseRequested,
        )
      : "pass";
  const evidenceBoundaryStatus = input.participantAcknowledgedEvidenceNotDestination
    ? "pass"
    : "needs_input";
  const captureBoundaryStatus = input.captureOrReleaseRequested
    ? "blocked"
    : input.participantAcknowledgedNoCaptureBeforeVerification
      ? "pass"
      : "needs_input";

  const gates = [
    paymentDestinationGate({
      key: "recipient-identity",
      label: "Recipient identity",
      status: recipientIdentityStatus,
      detail:
        recipientIdentityStatus === "pass"
          ? "The draft points at a registered recipient identity for the preview."
          : recipientIdentityStatus === "human_review"
            ? "Fiscal-host, intermediary, or free-text recipient identity needs registry review before routing."
            : recipientIdentityStatus === "blocked"
              ? "Capture or release is blocked until recipient identity resolves to a reviewed registry entry."
              : "Name the recipient and choose its identity status before publishing the preview.",
      nextAction:
        recipientIdentityStatus === "pass"
          ? "Keep the registry identity frozen for final lock review."
          : "Resolve the recipient to a reviewed recipient registry entry.",
      blockerCodes: recipientIdentityStatus === "pass" ? [] : ["recipient_registry_review_required"],
    }),
    paymentDestinationGate({
      key: "payment-destination-routing",
      label: "Payment destination routing",
      status: paymentDestinationStatus,
      detail:
        paymentDestinationStatus === "pass"
          ? "The destination locator is marked verified for the selected recipient."
          : paymentDestinationStatus === "blocked"
            ? "The payment destination is blocked or capture/release was requested before verification."
            : paymentDestinationStatus === "human_review"
              ? "The destination locator is evidence for manual review, not a reusable payment route."
              : "Provide a destination locator, destination kind, and review status.",
      nextAction:
        paymentDestinationStatus === "pass"
          ? "Verify provider routing at release time before moving money."
          : "Create or review a payment-destination record before any capture or release.",
      blockerCodes:
        paymentDestinationStatus === "pass" ? [] : ["verified_payment_destination_required"],
    }),
    paymentDestinationGate({
      key: "anti-impersonation",
      label: "Anti-impersonation review",
      status: antiImpersonationStatus,
      detail:
        antiImpersonationStatus === "pass"
          ? "Recipient and destination impersonation risk is marked reviewed."
          : "Recipient names, URLs, bank details, wallets, and charity identifiers need anti-impersonation review.",
      nextAction:
        antiImpersonationStatus === "pass"
          ? "Retain anti-impersonation evidence for release review."
          : "Run anti-impersonation review before relying on this destination.",
      blockerCodes: antiImpersonationStatus === "pass" ? [] : ["anti_impersonation_review_required"],
    }),
    paymentDestinationGate({
      key: "jurisdiction-review",
      label: "Jurisdiction review",
      status: jurisdictionStatus,
      detail:
        jurisdictionStatus === "pass"
          ? "Recipient and destination jurisdiction status is marked reviewed."
          : "Recipient jurisdiction, payment-rail eligibility, and fiscal-host routing need review.",
      nextAction:
        jurisdictionStatus === "pass"
          ? "Keep the jurisdiction decision tied to the payment-destination record."
          : "Review jurisdiction and payment-rail eligibility before lock or release.",
      blockerCodes: jurisdictionStatus === "pass" ? [] : ["jurisdiction_review_required"],
    }),
    paymentDestinationGate({
      key: "prohibited-use-review",
      label: "Prohibited-use review",
      status: prohibitedUseStatus,
      detail:
        prohibitedUseStatus === "pass"
          ? "Prohibited-use screening is marked reviewed."
          : "Recipient and destination use need prohibited-use, sanctions, and financial-crime screening.",
      nextAction:
        prohibitedUseStatus === "pass"
          ? "Keep prohibited-use screening attached to the reviewed destination."
          : "Complete prohibited-use review before capture or release.",
      blockerCodes: prohibitedUseStatus === "pass" ? [] : ["prohibited_use_review_required"],
    }),
    paymentDestinationGate({
      key: "recipient-control",
      label: "Recipient control",
      status: recipientControlStatus,
      detail:
        recipientControlStatus === "pass"
          ? "The destination is marked as controlled by the reviewed recipient."
          : "The destination needs proof that it is controlled by the recipient or reviewed fiscal host.",
      nextAction:
        recipientControlStatus === "pass"
          ? "Recheck control before release if the destination changes."
          : "Verify recipient control before any payment destination can be reused.",
      blockerCodes: recipientControlStatus === "pass" ? [] : ["recipient_control_review_required"],
    }),
    paymentDestinationGate({
      key: "free-text-destination-reuse",
      label: "Free-text destination reuse",
      status: freeTextReuseStatus,
      detail:
        freeTextReuseStatus === "pass"
          ? "No free-text, bank, wallet, or reuse request is being treated as a reusable payment route."
          : freeTextReuseStatus === "blocked"
            ? "Free-text or unverified destinations cannot be reused across agreements before verification."
            : "Free-text names, copied links, bank details, wallets, and fiscal-host notes remain one-off evidence inputs.",
      nextAction:
        freeTextReuseStatus === "pass"
          ? "Keep raw locators out of reusable routing records unless reviewed."
          : "Create reviewed recipient registry and payment-destination records before reuse.",
      blockerCodes:
        freeTextReuseStatus === "pass" ? [] : ["free_text_destination_reuse_review_required"],
    }),
    paymentDestinationGate({
      key: "evidence-vs-destination",
      label: "Evidence is not destination",
      status: evidenceBoundaryStatus,
      detail:
        evidenceBoundaryStatus === "pass"
          ? "The participant acknowledged that submitted locators are evidence inputs, not payment destinations."
          : "The participant must acknowledge that names, URLs, wallets, bank details, and receipts are evidence only.",
      nextAction:
        evidenceBoundaryStatus === "pass"
          ? "Store raw locators as review evidence until a destination record is verified."
          : "Require the evidence-vs-destination acknowledgement.",
      blockerCodes: evidenceBoundaryStatus === "pass" ? [] : ["evidence_destination_boundary_missing"],
    }),
    paymentDestinationGate({
      key: "capture-release-boundary",
      label: "Capture and release boundary",
      status: captureBoundaryStatus,
      detail:
        captureBoundaryStatus === "pass"
          ? "The participant acknowledged that this preview cannot capture or release funds before verification."
          : captureBoundaryStatus === "blocked"
            ? "This preview requested capture or release before verified recipient and payment-destination records exist."
            : "The participant must acknowledge no capture or release before verification.",
      nextAction:
        captureBoundaryStatus === "pass"
          ? "Keep capture and release disabled until release-gate review passes."
          : "Remove capture/release requests and acknowledge the no-capture boundary.",
      blockerCodes: captureBoundaryStatus === "pass" ? [] : ["capture_release_boundary_required"],
    }),
  ];
  const blockedGateCount = gates.filter((gate) => gate.status === "blocked").length;
  const humanReviewGateCount = gates.filter(
    (gate) => gate.status === "human_review" || gate.status === "needs_input",
  ).length;

  return {
    schemaVersion: "donation-offset-payment-destination-preview-v1",
    releaseStage: "donation_offset_preview_no_capture",
    captureAllowed: false,
    releaseAllowed: false,
    relianceBearing: false,
    freeTextDestinationReusable: false,
    evidenceLocatorIsPaymentDestination: false,
    requiresRecipientRegistryEntry: true,
    requiresVerifiedPaymentDestinationBeforeCapture: true,
    recipientLabel: input.recipientLabel.trim() || "Selected recipient",
    recipientIdentityStatus: input.recipientIdentityStatus,
    paymentDestinationKind: input.paymentDestinationKind,
    paymentDestinationLocator: input.paymentDestinationLocator.trim() || "Unspecified destination locator",
    paymentDestinationReviewStatus: input.paymentDestinationReviewStatus,
    gates,
    blockedGateCount,
    humanReviewGateCount,
    readyForRecipientRegistryReview:
      blockedGateCount === 0 && gates.every((gate) => gate.status !== "needs_input"),
  };
}

export function validateDonationOffsetPaymentDestinationInput(
  input: DonationOffsetPaymentDestinationInput,
) {
  const errors: string[] = [];
  const preview = buildDonationOffsetPaymentDestinationPreview(input);

  if (!hasMeaningfulText(input.recipientLabel)) {
    errors.push("Name the donation-offset recipient before publishing the preview.");
  }

  if (input.recipientIdentityStatus === "unknown") {
    errors.push("Choose the recipient identity status for this donation offset.");
  }

  if (input.paymentDestinationKind === "unknown") {
    errors.push("Choose the payment destination kind for this donation offset.");
  }

  if (!hasPaymentDestinationLocator(input.paymentDestinationLocator)) {
    errors.push("Add a payment destination locator for recipient review.");
  }

  if (input.paymentDestinationReviewStatus === "unknown") {
    errors.push("Choose the payment destination review status.");
  }

  if (!input.participantAcknowledgedEvidenceNotDestination) {
    errors.push("Acknowledge that submitted recipient names, URLs, wallets, bank details, and receipts are evidence inputs, not payment destinations.");
  }

  if (!input.participantAcknowledgedNoCaptureBeforeVerification) {
    errors.push("Acknowledge that no capture or release can happen before recipient and payment-destination verification.");
  }

  if (input.captureOrReleaseRequested) {
    errors.push("Donation-offset previews cannot request capture or release before verified recipient and payment-destination records exist.");
  }

  for (const gate of preview.gates) {
    if (gate.status === "blocked") {
      errors.push(`${gate.label}: ${gate.nextAction}`);
    }
  }

  return errors;
}

export function summarizeDonationOffsetPaymentDestinationForNotes(
  preview: DonationOffsetPaymentDestinationPreview,
) {
  const gateSummary = preview.gates
    .map((gate) => `${gate.label}: ${formatDonationOffsetPaymentDestinationGateStatus(gate.status)}`)
    .join("; ");

  return [
    "Donation-offset recipient and payment-destination preview:",
    `Schema version: ${preview.schemaVersion}`,
    `Release stage: ${preview.releaseStage}`,
    `Recipient: ${preview.recipientLabel}`,
    `Recipient identity status: ${preview.recipientIdentityStatus.replaceAll("_", " ")}`,
    `Payment destination kind: ${preview.paymentDestinationKind.replaceAll("_", " ")}`,
    `Payment destination locator: ${preview.paymentDestinationLocator}`,
    `Payment destination review status: ${preview.paymentDestinationReviewStatus.replaceAll("_", " ")}`,
    "Capture allowed from this preview: no",
    "Release allowed from this preview: no",
    "Raw recipient/payment locator is payment destination: no",
    "Free-text destination reusable across agreements: no",
    "Requires recipient registry entry before capture/release: yes",
    "Requires verified payment destination before capture/release: yes",
    `Manual-review gates: ${gateSummary}`,
  ].join("\n");
}

export function buildDemoDonationOffsetPaymentDestinationPreview() {
  return buildDonationOffsetPaymentDestinationPreview({
    recipientLabel: "GiveWell Top Charities Fund",
    recipientIdentityStatus: "registered_recipient",
    paymentDestinationKind: "registered_charity_page",
    paymentDestinationLocator: "https://www.every.org/givewell-top-charities-fund",
    paymentDestinationReviewStatus: "needs_review",
    antiImpersonationReviewed: false,
    jurisdictionReviewed: false,
    prohibitedUseReviewed: false,
    destinationControlledByRecipient: false,
    freeTextDestination: false,
    reuseAcrossAgreementsRequested: false,
    captureOrReleaseRequested: false,
    participantAcknowledgedEvidenceNotDestination: true,
    participantAcknowledgedNoCaptureBeforeVerification: true,
  });
}

export function buildDonationOffsetExternalityEvidencePreview(
  input: DonationOffsetExternalityEvidenceInput,
): DonationOffsetExternalityEvidencePreview {
  const harmSummaryPresent = hasMeaningfulText(input.nonparticipantHarmSummary);
  const evidencePlanPresent = hasMeaningfulText(input.evidencePlanSummary);
  const leastIntrusivePresent = hasMeaningfulText(input.leastIntrusiveAlternative);
  const fallbackPresent =
    input.fallbackPolicy !== "unknown" && hasMeaningfulText(input.fallbackExplanation);
  const highBurdenEvidence =
    input.evidenceBurden === "privacy_sensitive_or_high_burden" ||
    input.privacySensitiveEvidenceRequested;
  const externalityStatus = blockIfLockOrRelianceRequested(
    input.nonparticipantExternalityStatus === "serious_unresolved_harm"
      ? "blocked"
      : input.nonparticipantExternalityStatus === "unknown"
        ? "needs_input"
        : input.nonparticipantExternalityStatus === "needs_review"
          ? "human_review"
          : "pass",
    input.lockOrRelianceRequested,
  );
  const antiThreatStatus = blockIfLockOrRelianceRequested(
    input.antiThreatReviewed ? "pass" : "human_review",
    input.lockOrRelianceRequested,
  );
  const evidenceBurdenStatus = blockIfLockOrRelianceRequested(
    input.evidenceBurden === "unknown"
      ? "needs_input"
      : highBurdenEvidence && !input.highBurdenEvidenceReviewerApproved
        ? "human_review"
        : input.evidenceBurden === "third_party_audit"
          ? "human_review"
          : "pass",
    input.lockOrRelianceRequested,
  );
  const leastIntrusiveStatus = blockIfLockOrRelianceRequested(
    !evidencePlanPresent || !leastIntrusivePresent
      ? "needs_input"
      : input.participantAcknowledgedLeastIntrusiveEvidence
        ? "pass"
        : "needs_input",
    input.lockOrRelianceRequested,
  );
  const impactClaimStatus = blockIfLockOrRelianceRequested(
    input.participantAcknowledgedNoImpactClaimFromReceipt &&
      (!input.impactClaimReviewRequired || input.impactClaimMethodologyReviewed)
      ? "pass"
      : input.impactClaimReviewRequired
        ? "human_review"
        : "needs_input",
    input.lockOrRelianceRequested,
  );
  const nonparticipantConsentStatus = blockIfLockOrRelianceRequested(
    input.participantAcknowledgedNonparticipantHarmsNotWaived
      ? "pass"
      : "needs_input",
    input.lockOrRelianceRequested,
  );
  const fallbackStatus = blockIfLockOrRelianceRequested(
    fallbackPresent && input.participantAcknowledgedFallbackNoSilentReroute
      ? "pass"
      : "needs_input",
    input.lockOrRelianceRequested,
  );
  const lockBoundaryStatus = input.lockOrRelianceRequested ? "blocked" : "pass";

  const gates = [
    externalityEvidenceGate({
      key: "nonparticipant-externality",
      label: "Nonparticipant externality",
      status: externalityStatus,
      detail:
        externalityStatus === "pass"
          ? "The nonparticipant-externality assessment is marked non-blocking for this preview."
          : externalityStatus === "blocked"
            ? "Serious unresolved third-party, recipient, or public-good harm blocks clearing even if direct participants agree."
            : externalityStatus === "human_review"
              ? "Potential third-party, recipient, or public-good harms need review before lock."
              : "Choose the nonparticipant-externality status before publishing the preview.",
      nextAction:
        externalityStatus === "pass"
          ? "Keep the externality decision attached to the final lock proposal."
          : "Resolve nonparticipant externality review before clearing or reliance.",
      blockerCodes: externalityStatus === "pass" ? [] : ["nonparticipant_externality_review_required"],
    }),
    externalityEvidenceGate({
      key: "externality-summary",
      label: "Externality summary",
      status: harmSummaryPresent ? "pass" : "needs_input",
      detail: harmSummaryPresent
        ? "The preview records a plain-language summary of third-party, recipient, and public-good effects."
        : "The preview needs a plain-language nonparticipant-harm summary.",
      nextAction: harmSummaryPresent
        ? "Keep private or sensitive facts out of public summaries."
        : "State who outside the direct participants could be affected and how.",
      blockerCodes: harmSummaryPresent ? [] : ["externality_summary_missing"],
    }),
    externalityEvidenceGate({
      key: "anti-threat-externality",
      label: "Anti-threat and manufactured-baseline review",
      status: antiThreatStatus,
      detail:
        antiThreatStatus === "pass"
          ? "Threat-like or marketplace-created harmful baselines are marked reviewed."
          : "Donation-offset baselines need anti-threat review so direct consent cannot convert coercion into moral trade.",
      nextAction:
        antiThreatStatus === "pass"
          ? "Keep anti-threat review separate from participant surplus confirmation."
          : "Complete anti-threat review before any lock or public completed-trade count.",
      blockerCodes: antiThreatStatus === "pass" ? [] : ["anti_threat_externality_review_required"],
    }),
    externalityEvidenceGate({
      key: "evidence-burden",
      label: "Evidence burden",
      status: evidenceBurdenStatus,
      detail:
        evidenceBurdenStatus === "pass"
          ? "The evidence plan is ordinary-burden and compatible with preview-stage review."
          : evidenceBurdenStatus === "blocked"
            ? "High-burden, privacy-sensitive, or unclassified evidence cannot support lock or reliance without review."
            : evidenceBurdenStatus === "human_review"
              ? "Third-party audit or privacy-sensitive evidence needs reviewer approval and user-facing disclosure before lock."
              : "Choose the evidence-burden class before publishing the preview.",
      nextAction:
        evidenceBurdenStatus === "pass"
          ? "Use the least intrusive sufficient proof packet for the claim type."
          : "Approve or replace the evidence plan with a less intrusive alternative before lock.",
      blockerCodes: evidenceBurdenStatus === "pass" ? [] : ["evidence_burden_review_required"],
    }),
    externalityEvidenceGate({
      key: "least-intrusive-alternative",
      label: "Least-intrusive evidence alternative",
      status: leastIntrusiveStatus,
      detail:
        leastIntrusiveStatus === "pass"
          ? "The preview includes a least-intrusive-sufficient evidence alternative."
          : "Donation-offset verification cannot demand invasive proof when less intrusive evidence is enough.",
      nextAction:
        leastIntrusiveStatus === "pass"
          ? "Reviewers should reject later evidence escalation without renewed approval."
          : "Describe the least intrusive proof that could satisfy the claim.",
      blockerCodes: leastIntrusiveStatus === "pass" ? [] : ["least_intrusive_evidence_missing"],
    }),
    externalityEvidenceGate({
      key: "impact-claim-separation",
      label: "Impact claim separation",
      status: impactClaimStatus,
      detail:
        impactClaimStatus === "pass"
          ? "Receipt/payment proof is separated from causal impact, outcome, and moral-value claims."
          : "Impact claims need their own reviewed methodology; receipts and payment evidence cannot prove impact by themselves.",
      nextAction:
        impactClaimStatus === "pass"
          ? "Keep gross transfer, net payout, and impact claims separately labeled."
          : "Review methodology before publishing any impact or moral-value claim.",
      blockerCodes: impactClaimStatus === "pass" ? [] : ["impact_claim_methodology_review_required"],
    }),
    externalityEvidenceGate({
      key: "nonparticipant-consent-boundary",
      label: "Nonparticipant consent boundary",
      status: nonparticipantConsentStatus,
      detail:
        nonparticipantConsentStatus === "pass"
          ? "The participant acknowledged that direct participant consent cannot waive harms to nonparticipants."
          : "The participant must acknowledge that nonparticipant harms remain blockers.",
      nextAction:
        nonparticipantConsentStatus === "pass"
          ? "Keep participant surplus confirmation necessary but not sufficient for clearing."
          : "Require acknowledgement before publishing the offset preview.",
      blockerCodes: nonparticipantConsentStatus === "pass" ? [] : ["nonparticipant_consent_boundary_missing"],
    }),
    externalityEvidenceGate({
      key: "fallback-cancellation-policy",
      label: "Fallback and cancellation policy",
      status: fallbackStatus,
      detail:
        fallbackStatus === "pass"
          ? "The preview states what happens if externality, evidence, destination, or review gates fail."
          : "Blocked-release behavior needs an explicit fallback such as cancel, refund, carry-forward, or manual review.",
      nextAction:
        fallbackStatus === "pass"
          ? "Do not silently reroute funds or obligations outside the frozen fallback."
          : "Choose and explain the fallback before lock.",
      blockerCodes: fallbackStatus === "pass" ? [] : ["fallback_policy_missing"],
    }),
    externalityEvidenceGate({
      key: "lock-reliance-boundary",
      label: "Lock and reliance boundary",
      status: lockBoundaryStatus,
      detail:
        lockBoundaryStatus === "pass"
          ? "This is a preview-only bundle and does not request lock, capture, release, or reliance."
          : "This draft requested lock or reliance before externality, evidence, and fallback gates are non-blocking.",
      nextAction:
        lockBoundaryStatus === "pass"
          ? "Require final lock confirmation against a frozen proposal before reliance."
          : "Remove premature lock or reliance requests.",
      blockerCodes: lockBoundaryStatus === "pass" ? [] : ["lock_reliance_boundary_required"],
    }),
  ];
  const blockedGateCount = gates.filter((gate) => gate.status === "blocked").length;
  const humanReviewGateCount = gates.filter(
    (gate) => gate.status === "human_review" || gate.status === "needs_input",
  ).length;

  return {
    schemaVersion: "donation-offset-externality-evidence-preview-v1",
    releaseStage: "donation_offset_preview_no_capture",
    captureAllowed: false,
    clearingAllowed: false,
    relianceBearing: false,
    participantConsentWaivesNonparticipantHarms: false,
    receiptCreatesImpactClaim: false,
    requiresNonparticipantExternalityReviewBeforeClearing: true,
    requiresLeastIntrusiveEvidenceBeforeLock: true,
    requiresFallbackPolicyBeforeLock: true,
    recipientLabel: input.recipientLabel.trim() || "Selected recipient",
    nonparticipantExternalityStatus: input.nonparticipantExternalityStatus,
    evidenceBurden: input.evidenceBurden,
    fallbackPolicy: input.fallbackPolicy,
    gates,
    blockedGateCount,
    humanReviewGateCount,
    readyForExternalityReview:
      blockedGateCount === 0 && gates.every((gate) => gate.status !== "needs_input"),
  };
}

export function validateDonationOffsetExternalityEvidenceInput(
  input: DonationOffsetExternalityEvidenceInput,
) {
  const errors: string[] = [];
  const preview = buildDonationOffsetExternalityEvidencePreview(input);

  if (input.nonparticipantExternalityStatus === "unknown") {
    errors.push("Choose the nonparticipant-externality review status.");
  }

  if (!hasMeaningfulText(input.nonparticipantHarmSummary)) {
    errors.push("Summarize potential third-party, recipient, or public-good effects.");
  }

  if (input.evidenceBurden === "unknown") {
    errors.push("Choose the evidence-burden class for this donation offset.");
  }

  if (!hasMeaningfulText(input.evidencePlanSummary)) {
    errors.push("Summarize the donation-offset evidence plan.");
  }

  if (!hasMeaningfulText(input.leastIntrusiveAlternative)) {
    errors.push("Describe the least-intrusive sufficient evidence alternative.");
  }

  if (input.fallbackPolicy === "unknown" || !hasMeaningfulText(input.fallbackExplanation)) {
    errors.push("State the fallback or cancellation policy for blocked release.");
  }

  if (!input.participantAcknowledgedNonparticipantHarmsNotWaived) {
    errors.push("Acknowledge that participant consent cannot waive harms to nonparticipants.");
  }

  if (!input.participantAcknowledgedLeastIntrusiveEvidence) {
    errors.push("Acknowledge the least-intrusive-sufficient-evidence rule.");
  }

  if (!input.participantAcknowledgedNoImpactClaimFromReceipt) {
    errors.push("Acknowledge that receipts and payment proof do not create impact claims.");
  }

  if (!input.participantAcknowledgedFallbackNoSilentReroute) {
    errors.push("Acknowledge that failed review cannot silently reroute funds or obligations.");
  }

  if (input.lockOrRelianceRequested) {
    errors.push("Donation-offset previews cannot request lock or reliance before externality, evidence, and fallback gates are non-blocking.");
  }

  for (const gate of preview.gates) {
    if (gate.status === "blocked") {
      errors.push(`${gate.label}: ${gate.nextAction}`);
    }
  }

  return errors;
}

export function summarizeDonationOffsetExternalityEvidenceForNotes(
  preview: DonationOffsetExternalityEvidencePreview,
) {
  const gateSummary = preview.gates
    .map((gate) => `${gate.label}: ${formatDonationOffsetDonorGateStatus(gate.status)}`)
    .join("; ");

  return [
    "Donation-offset nonparticipant-externality and evidence preview:",
    `Schema version: ${preview.schemaVersion}`,
    `Release stage: ${preview.releaseStage}`,
    `Recipient: ${preview.recipientLabel}`,
    `Nonparticipant externality status: ${preview.nonparticipantExternalityStatus.replaceAll("_", " ")}`,
    `Evidence burden: ${preview.evidenceBurden.replaceAll("_", " ")}`,
    `Fallback policy: ${preview.fallbackPolicy.replaceAll("_", " ")}`,
    "Capture allowed from this preview: no",
    "Clearing allowed from this preview: no",
    "Reliance-bearing from this preview: no",
    "Participant consent waives nonparticipant harms: no",
    "Receipt creates impact claim: no",
    "Requires nonparticipant-externality review before clearing: yes",
    "Requires least-intrusive evidence before lock: yes",
    "Requires fallback policy before lock: yes",
    `Manual-review gates: ${gateSummary}`,
  ].join("\n");
}

export function buildDemoDonationOffsetExternalityEvidencePreview() {
  return buildDonationOffsetExternalityEvidencePreview({
    recipientLabel: "GiveWell Top Charities Fund",
    nonparticipantExternalityStatus: "needs_review",
    nonparticipantHarmSummary:
      "Review should check whether redirecting opposed donations creates material third-party, recipient, or public-good harms outside the direct donor pair.",
    antiThreatReviewed: false,
    evidenceBurden: "ordinary_receipt_or_public_log",
    evidencePlanSummary:
      "Use a public donation receipt or narrow payment confirmation sufficient to show the external transfer.",
    leastIntrusiveAlternative:
      "A dated receipt or public charity payment confirmation should be tried before private financial records or third-party exposure.",
    privacySensitiveEvidenceRequested: false,
    highBurdenEvidenceReviewerApproved: false,
    impactClaimReviewRequired: false,
    impactClaimMethodologyReviewed: false,
    fallbackPolicy: "manual_review",
    fallbackExplanation:
      "If externality, evidence, destination, or review gates fail, keep the record in manual review rather than silently rerouting funds.",
    lockOrRelianceRequested: false,
    participantAcknowledgedNonparticipantHarmsNotWaived: true,
    participantAcknowledgedLeastIntrusiveEvidence: true,
    participantAcknowledgedNoImpactClaimFromReceipt: true,
    participantAcknowledgedFallbackNoSilentReroute: true,
  });
}

export function buildDonationOffsetParticipantConfirmationPreview(
  input: DonationOffsetParticipantConfirmationInput,
): DonationOffsetParticipantConfirmationPreview {
  const baselineSnapshotPresent = hasPaymentDestinationLocator(input.baselineSnapshotId);
  const termsSnapshotPresent = hasPaymentDestinationLocator(input.termsSnapshotId);
  const policySnapshotPresent = hasPaymentDestinationLocator(input.policySnapshotId);
  const exposurePresent =
    input.maximumExposureUsd !== null &&
    Number.isFinite(input.maximumExposureUsd) &&
    input.maximumExposureUsd > 0;
  const affectedCount =
    Number.isFinite(input.affectedParticipantCount) && input.affectedParticipantCount > 0
      ? Math.floor(input.affectedParticipantCount)
      : 0;
  const freshCount =
    Number.isFinite(input.freshConfirmationCount) && input.freshConfirmationCount > 0
      ? Math.floor(input.freshConfirmationCount)
      : 0;
  const surplusExplicit =
    input.participantSurplusConfirmed && hasMeaningfulText(input.participantSurplusStatement);
  const allFreshConfirmationsRecorded = affectedCount > 0 && freshCount >= affectedCount;
  const snapshotStatus = blockIfLockOrCaptureRequested(
    baselineSnapshotPresent && termsSnapshotPresent && policySnapshotPresent && exposurePresent
      ? "pass"
      : "needs_input",
    input.lockOrCaptureRequested,
  );
  const surplusStatus = blockIfLockOrCaptureRequested(
    surplusExplicit ? "pass" : "needs_input",
    input.lockOrCaptureRequested,
  );
  const matchedProposalStatus = blockIfLockOrCaptureRequested(
    input.matchedTradeLockProposalStatus === "drafted"
      ? "pass"
      : input.matchedTradeLockProposalStatus === "stale" ||
          input.matchedTradeLockProposalStatus === "superseded"
        ? "blocked"
        : "needs_input",
    input.lockOrCaptureRequested,
  );
  const confirmationRecordStatus = blockIfLockOrCaptureRequested(
    input.confirmationRecordStatus === "recorded_non_stale"
      ? "pass"
      : input.confirmationRecordStatus === "draft_only"
        ? "human_review"
        : input.confirmationRecordStatus === "stale" ||
            input.confirmationRecordStatus === "superseded"
          ? "blocked"
          : "needs_input",
    input.lockOrCaptureRequested,
  );
  const freshConfirmationCountStatus = blockIfLockOrCaptureRequested(
    allFreshConfirmationsRecorded
      ? "pass"
      : affectedCount > 0 && freshCount >= 0
        ? "human_review"
        : "needs_input",
    input.lockOrCaptureRequested,
  );
  const consentChoiceArchitectureAcknowledged =
    input.participantAcknowledgedNoPreselectedPaidCommitment &&
    input.participantAcknowledgedNoDarkPattern;
  const consentQualityStatus = blockIfLockOrCaptureRequested(
    input.consentQualityStatus === "passed" &&
      consentChoiceArchitectureAcknowledged
      ? "pass"
      : input.consentQualityStatus === "failed"
        ? "blocked"
        : input.consentQualityStatus === "needs_review" && consentChoiceArchitectureAcknowledged
          ? "human_review"
          : "needs_input",
    input.lockOrCaptureRequested,
  );
  const noticeStatus = blockIfLockOrCaptureRequested(
    input.noticeRecordStatus === "recorded"
      ? "pass"
      : input.noticeRecordStatus === "failed"
        ? "blocked"
        : "needs_input",
    input.lockOrCaptureRequested,
  );
  const confirmationScopeStatus = blockIfLockOrCaptureRequested(
    input.confirmationScope === "final_lock" ||
      input.confirmationScope === "renewed_material_change"
      ? input.participantAcknowledgedFreshConfirmationRequired
        ? "pass"
        : "needs_input"
      : "needs_input",
    input.lockOrCaptureRequested,
  );
  const baselineAcknowledgementStatus = blockIfLockOrCaptureRequested(
    input.participantAcknowledgedBaselineComparison &&
      input.participantAcknowledgedFreshConfirmationRequired
      ? "pass"
      : "needs_input",
    input.lockOrCaptureRequested,
  );
  const amendmentStatus = blockIfLockOrCaptureRequested(
    !input.materialChangePending && input.amendmentStatus === "none"
      ? "pass"
      : input.materialChangePending && input.amendmentStatus === "confirmed"
        ? "pass"
        : input.amendmentStatus === "drafted_needs_confirmation"
          ? "human_review"
          : "needs_input",
    input.lockOrCaptureRequested,
  );
  const lockBoundaryStatus = input.lockOrCaptureRequested ? "blocked" : "pass";

  const gates = [
    participantConfirmationGate({
      key: "frozen-snapshot-bundle",
      label: "Frozen baseline, terms, and policy snapshots",
      status: snapshotStatus,
      detail:
        snapshotStatus === "pass"
          ? "The confirmation preview references baseline, terms, policy, and maximum-exposure snapshots."
          : "Participant confirmation must bind to frozen baseline, terms, policy, and maximum-exposure records.",
      nextAction:
        snapshotStatus === "pass"
          ? "Keep these snapshot references stable until final lock."
          : "Create or select the frozen snapshot bundle before requesting final confirmation.",
      blockerCodes: snapshotStatus === "pass" ? [] : ["confirmation_snapshot_bundle_missing"],
    }),
    participantConfirmationGate({
      key: "participant-surplus-confirmation",
      label: "Participant surplus confirmation",
      status: surplusStatus,
      detail:
        surplusStatus === "pass"
          ? "The participant explicitly states this agreement is preferable or acceptable relative to their no-trade baseline."
          : "The platform cannot infer moral surplus; the participant must compare the locked agreement to their own no-trade baseline.",
      nextAction:
        surplusStatus === "pass"
          ? "Record this as a first-class participant confirmation before clearing."
          : "Collect an explicit participant surplus statement tied to the baseline snapshot.",
      blockerCodes: surplusStatus === "pass" ? [] : ["participant_surplus_confirmation_missing"],
    }),
    participantConfirmationGate({
      key: "matched-lock-proposal",
      label: "Matched-trade lock proposal",
      status: matchedProposalStatus,
      detail:
        matchedProposalStatus === "pass"
          ? "A matched-trade lock proposal is drafted for the frozen counterparties, volume, ratio, destination, evidence, deadline, residuals, and fallback."
          : matchedProposalStatus === "blocked"
            ? "The matched-lock proposal is stale or superseded and cannot authorize clearing."
            : "A broad preview or batch dry run is not enough; create a frozen matched-lock proposal.",
      nextAction:
        matchedProposalStatus === "pass"
          ? "Use this proposal for fresh final confirmations."
          : "Draft a current matched-trade lock proposal before any reliance-bearing step.",
      blockerCodes: matchedProposalStatus === "pass" ? [] : ["matched_lock_proposal_required"],
    }),
    participantConfirmationGate({
      key: "participant-confirmation-record",
      label: "Participant confirmation record",
      status: confirmationRecordStatus,
      detail:
        confirmationRecordStatus === "pass"
          ? "Fresh, non-stale confirmation records cover all affected participants."
          : confirmationRecordStatus === "human_review"
            ? "Draft confirmation records exist but are not enough to authorize lock, capture, or reliance."
            : confirmationRecordStatus === "blocked"
              ? "Stale or superseded confirmation records block clearing until renewed."
              : "Every affected participant needs a first-class, non-stale confirmation record.",
      nextAction:
        confirmationRecordStatus === "pass"
          ? "Do not mutate material terms after confirmation without renewed confirmations."
          : "Record fresh final confirmations for every affected participant.",
      blockerCodes: confirmationRecordStatus === "pass" ? [] : ["participant_confirmation_record_required"],
    }),
    participantConfirmationGate({
      key: "fresh-confirmation-count",
      label: "Fresh confirmation count",
      status: freshConfirmationCountStatus,
      detail:
        freshConfirmationCountStatus === "pass"
          ? "Fresh, non-stale confirmations cover every affected participant."
          : freshConfirmationCountStatus === "blocked"
            ? "A lock or capture request cannot rely on missing participant confirmations."
            : "All affected participants must have fresh confirmation records before clearing.",
      nextAction:
        freshConfirmationCountStatus === "pass"
          ? "Keep confirmation expiry and supersession checks active until settlement."
          : "Collect fresh participant confirmations for the full affected-participant set.",
      blockerCodes:
        freshConfirmationCountStatus === "pass"
          ? []
          : ["fresh_participant_confirmations_required"],
    }),
    participantConfirmationGate({
      key: "consent-quality",
      label: "Consent quality",
      status: consentQualityStatus,
      detail:
        consentQualityStatus === "pass"
          ? "Consent-quality checks are marked passed with no preselected paid commitment or dark-pattern acknowledgement gaps."
          : consentQualityStatus === "blocked"
            ? "Failed consent-quality checks block routing, clearing, capture, payout release, and private-data disclosure."
            : consentQualityStatus === "human_review"
              ? "Consent-quality review is still needed before any reliance-bearing confirmation."
              : "Consent-quality status and choice-architecture acknowledgements are required.",
      nextAction:
        consentQualityStatus === "pass"
          ? "Keep the consent-quality record tied to the confirmation scope."
          : "Resolve consent-quality review before final lock.",
      blockerCodes: consentQualityStatus === "pass" ? [] : ["consent_quality_record_required"],
    }),
    participantConfirmationGate({
      key: "notice-record",
      label: "Notice record",
      status: noticeStatus,
      detail:
        noticeStatus === "pass"
          ? "A notice record is available for the confirmation scope."
          : noticeStatus === "blocked"
            ? "Failed notice blocks deadlines, challenge rights, confirmations, and payout-release opportunities."
            : "The confirmation needs a recorded notice under the frozen notification policy.",
      nextAction:
        noticeStatus === "pass"
          ? "Use server-side notice timestamps for expiry and challenge windows."
          : "Record notice before relying on any confirmation or deadline.",
      blockerCodes: noticeStatus === "pass" ? [] : ["notice_record_required"],
    }),
    participantConfirmationGate({
      key: "baseline-comparison-acknowledgement",
      label: "Baseline-comparison acknowledgement",
      status: baselineAcknowledgementStatus,
      detail:
        baselineAcknowledgementStatus === "pass"
          ? "The participant acknowledges that confirmation compares the frozen agreement to their own no-trade baseline."
          : "Final lock requires explicit baseline comparison and renewed-confirmation acknowledgement.",
      nextAction:
        baselineAcknowledgementStatus === "pass"
          ? "Keep the acknowledgement tied to this proposal version."
          : "Collect baseline-comparison and fresh-confirmation acknowledgements.",
      blockerCodes:
        baselineAcknowledgementStatus === "pass"
          ? []
          : ["baseline_comparison_acknowledgement_required"],
    }),
    participantConfirmationGate({
      key: "confirmation-scope",
      label: "Confirmation scope",
      status: confirmationScopeStatus,
      detail:
        confirmationScopeStatus === "pass"
          ? "The confirmation scope is final-lock or renewed-material-change, and fresh confirmation is acknowledged."
          : "Preview-only or unknown confirmation scope cannot authorize clearing.",
      nextAction:
        confirmationScopeStatus === "pass"
          ? "Keep the confirmation scope immutable for this proposal version."
          : "Set the scope to final lock or renewed material change before clearing.",
      blockerCodes: confirmationScopeStatus === "pass" ? [] : ["confirmation_scope_incomplete"],
    }),
    participantConfirmationGate({
      key: "amendment-supersession",
      label: "Amendment and supersession",
      status: amendmentStatus,
      detail:
        amendmentStatus === "pass"
          ? "No unconfirmed material change is pending, or the amendment has renewed confirmations."
          : amendmentStatus === "human_review"
            ? "A material change has an amendment draft but still needs affected participant confirmations."
            : "Unknown or pending material changes require amendment review and renewed confirmations.",
      nextAction:
        amendmentStatus === "pass"
          ? "Any later material change requires a superseding proposal and renewed confirmations."
          : "Create an append-only amendment record and renew affected confirmations.",
      blockerCodes: amendmentStatus === "pass" ? [] : ["agreement_amendment_confirmation_required"],
    }),
    participantConfirmationGate({
      key: "lock-capture-boundary",
      label: "Lock and capture boundary",
      status: lockBoundaryStatus,
      detail:
        lockBoundaryStatus === "pass"
          ? "This bundle is preview-only and does not request lock, capture, release, or reliance."
          : "This draft requested lock or capture before confirmation records and lock proposal gates are non-blocking.",
      nextAction:
        lockBoundaryStatus === "pass"
          ? "Keep capture disabled until all final lock and release gates pass."
          : "Remove premature lock or capture requests.",
      blockerCodes: lockBoundaryStatus === "pass" ? [] : ["lock_capture_boundary_required"],
    }),
  ];
  const blockedGateCount = gates.filter((gate) => gate.status === "blocked").length;
  const humanReviewGateCount = gates.filter(
    (gate) => gate.status === "human_review" || gate.status === "needs_input",
  ).length;

  return {
    schemaVersion: "donation-offset-participant-confirmation-preview-v1",
    releaseStage: "donation_offset_preview_no_capture",
    captureAllowed: false,
    clearingAllowed: false,
    relianceBearing: false,
    platformInfersMoralSurplus: false,
    checkboxAuthorizesCapture: false,
    requiresParticipantConfirmationRecord: true,
    requiresMatchedLockProposal: true,
    requiresConsentQualityRecord: true,
    baselineSnapshotId: input.baselineSnapshotId.trim() || "missing-baseline-snapshot",
    termsSnapshotId: input.termsSnapshotId.trim() || "missing-terms-snapshot",
    policySnapshotId: input.policySnapshotId.trim() || "missing-policy-snapshot",
    maximumExposureUsd: normalizeUsdAmount(input.maximumExposureUsd) ?? 0,
    confirmationScope: input.confirmationScope,
    amendmentStatus: input.amendmentStatus,
    affectedParticipantCount: affectedCount,
    freshConfirmationCount: freshCount,
    matchedTradeLockProposalStatus: input.matchedTradeLockProposalStatus,
    confirmationRecordStatus: input.confirmationRecordStatus,
    consentQualityStatus: input.consentQualityStatus,
    noticeRecordStatus: input.noticeRecordStatus,
    gates,
    blockedGateCount,
    humanReviewGateCount,
    readyForFinalLockReview:
      blockedGateCount === 0 && gates.every((gate) => gate.status !== "needs_input"),
  };
}

export function validateDonationOffsetParticipantConfirmationInput(
  input: DonationOffsetParticipantConfirmationInput,
) {
  const errors: string[] = [];
  const preview = buildDonationOffsetParticipantConfirmationPreview(input);

  if (!hasPaymentDestinationLocator(input.baselineSnapshotId)) {
    errors.push("Attach a frozen no-trade baseline snapshot before final confirmation.");
  }

  if (!hasPaymentDestinationLocator(input.termsSnapshotId)) {
    errors.push("Attach a frozen terms snapshot before final confirmation.");
  }

  if (!hasPaymentDestinationLocator(input.policySnapshotId)) {
    errors.push("Attach a frozen policy snapshot before final confirmation.");
  }

  if (!input.maximumExposureUsd || input.maximumExposureUsd <= 0) {
    errors.push("State the maximum exposure covered by the participant confirmation.");
  }

  if (!Number.isFinite(input.affectedParticipantCount) || input.affectedParticipantCount <= 0) {
    errors.push("State the number of affected participants requiring confirmation.");
  }

  if (!Number.isFinite(input.freshConfirmationCount) || input.freshConfirmationCount < 0) {
    errors.push("Fresh confirmation count cannot be negative.");
  }

  if (!input.participantSurplusConfirmed || !hasMeaningfulText(input.participantSurplusStatement)) {
    errors.push("Record the participant's surplus confirmation relative to their no-trade baseline.");
  }

  if (!input.participantAcknowledgedBaselineComparison) {
    errors.push("Acknowledge that Moral Trade cannot infer participant surplus from platform matching.");
  }

  if (!input.participantAcknowledgedFreshConfirmationRequired) {
    errors.push("Acknowledge that final lock requires fresh participant confirmation records.");
  }

  if (!input.participantAcknowledgedNoPreselectedPaidCommitment) {
    errors.push("Acknowledge that paid commitments cannot be preselected.");
  }

  if (!input.participantAcknowledgedNoDarkPattern) {
    errors.push("Acknowledge that confirmations must avoid dark-pattern pressure.");
  }

  if (input.lockOrCaptureRequested) {
    errors.push("Donation-offset previews cannot request lock or capture before confirmation gates are non-blocking.");
  }

  for (const gate of preview.gates) {
    if (gate.status === "blocked") {
      errors.push(`${gate.label}: ${gate.nextAction}`);
    }
  }

  return errors;
}

export function summarizeDonationOffsetParticipantConfirmationForNotes(
  preview: DonationOffsetParticipantConfirmationPreview,
) {
  const gateSummary = preview.gates
    .map((gate) => `${gate.label}: ${formatDonationOffsetDonorGateStatus(gate.status)}`)
    .join("; ");

  return [
    "Donation-offset participant-confirmation preview:",
    `Schema version: ${preview.schemaVersion}`,
    `Release stage: ${preview.releaseStage}`,
    `Baseline snapshot: ${preview.baselineSnapshotId}`,
    `Terms snapshot: ${preview.termsSnapshotId}`,
    `Policy snapshot: ${preview.policySnapshotId}`,
    `Maximum exposure: ${preview.maximumExposureUsd}`,
    `Confirmation scope: ${preview.confirmationScope.replaceAll("_", " ")}`,
    `Amendment status: ${preview.amendmentStatus.replaceAll("_", " ")}`,
    `Affected participant count: ${preview.affectedParticipantCount}`,
    `Fresh confirmation count: ${preview.freshConfirmationCount}`,
    `Matched-lock proposal status: ${preview.matchedTradeLockProposalStatus.replaceAll("_", " ")}`,
    `Confirmation record status: ${preview.confirmationRecordStatus.replaceAll("_", " ")}`,
    `Consent quality status: ${preview.consentQualityStatus.replaceAll("_", " ")}`,
    `Notice record status: ${preview.noticeRecordStatus.replaceAll("_", " ")}`,
    "Capture allowed from this preview: no",
    "Clearing allowed from this preview: no",
    "Reliance-bearing from this preview: no",
    "Platform infers moral surplus: no",
    "Checkbox authorizes capture: no",
    "Requires participant confirmation record: yes",
    "Requires matched-lock proposal: yes",
    "Requires consent-quality record: yes",
    `Manual-review gates: ${gateSummary}`,
  ].join("\n");
}

export function buildDemoDonationOffsetParticipantConfirmationPreview() {
  return buildDonationOffsetParticipantConfirmationPreview({
    baselineSnapshotId: "baseline-snapshot:demo-offset-v1",
    termsSnapshotId: "terms-snapshot:demo-offset-v1",
    policySnapshotId: "policy-snapshot:donation-offset-preview-v1",
    maximumExposureUsd: 1000,
    matchedTradeLockProposalStatus: "drafted",
    confirmationRecordStatus: "draft_only",
    consentQualityStatus: "needs_review",
    noticeRecordStatus: "recorded",
    confirmationScope: "final_lock",
    amendmentStatus: "none",
    affectedParticipantCount: 4,
    freshConfirmationCount: 0,
    participantSurplusConfirmed: true,
    participantSurplusStatement:
      "The participant states that this frozen agreement is preferable or acceptable relative to their no-trade baseline before final lock.",
    materialChangePending: false,
    lockOrCaptureRequested: false,
    participantAcknowledgedBaselineComparison: true,
    participantAcknowledgedFreshConfirmationRequired: true,
    participantAcknowledgedNoPreselectedPaidCommitment: true,
    participantAcknowledgedNoDarkPattern: true,
  });
}

export function buildDonationOffsetSafetyAuthenticityPreview(
  input: DonationOffsetSafetyAuthenticityInput,
): DonationOffsetSafetyAuthenticityPreview {
  const fullText = [
    input.publicDescription,
    input.evidencePlanSummary,
    input.paymentPatternSummary,
    input.sideAgreementSummary,
  ]
    .join(" ")
    .toLowerCase();
  const privacyGrantNeeded =
    input.privacySensitiveEvidenceRequested ||
    input.confidentialityPrivacy !== "clear" ||
    hasDonationOffsetSafetyKeyword(
      fullText,
      donationOffsetSafetyKeywordGroups.confidentialityPrivacy,
    );
  const privacyStatus = blockIfSafetyLockOrRelianceRequested(
    input.confidentialityPrivacy === "triggered" ||
      hasDonationOffsetSafetyKeyword(
        fullText,
        donationOffsetSafetyKeywordGroups.confidentialityPrivacy,
      )
      ? "blocked"
      : !input.participantAcknowledgedNoUnauthorizedPrivateDisclosure
        ? "needs_input"
        : privacyGrantNeeded && input.privacyGrantStatus !== "approved"
          ? input.privacyGrantStatus === "drafted"
            ? "human_review"
            : "needs_input"
          : "pass",
    input.lockOrRelianceRequested,
  );
  const evidenceAuthenticityStatus = blockIfSafetyLockOrRelianceRequested(
    input.evidenceAuthenticity === "triggered" ||
      hasDonationOffsetSafetyKeyword(
        fullText,
        donationOffsetSafetyKeywordGroups.evidenceAuthenticity,
      )
      ? "blocked"
      : !input.sourceAuthenticationReviewed ||
          !input.participantAcknowledgedClaimTypedEvidence
        ? "needs_input"
        : input.evidenceAuthenticity === "possible_or_unknown"
          ? "human_review"
          : "pass",
    input.lockOrRelianceRequested,
  );
  const financialCrimeStatus = blockIfSafetyLockOrRelianceRequested(
    donationOffsetBinarySafetyStatus(
      input.financialCrime,
      hasDonationOffsetSafetyKeyword(fullText, donationOffsetSafetyKeywordGroups.financialCrime),
    ),
    input.lockOrRelianceRequested,
  );
  const transferabilityStatus = blockIfSafetyLockOrRelianceRequested(
    input.nonTransferability === "triggered" ||
      hasDonationOffsetSafetyKeyword(fullText, donationOffsetSafetyKeywordGroups.transferability)
      ? "blocked"
      : !input.participantAcknowledgedNonTransferability
        ? "needs_input"
        : input.nonTransferability === "possible_or_unknown"
          ? "human_review"
          : "pass",
    input.lockOrRelianceRequested,
  );
  const regulatedGoodsStatus = blockIfSafetyLockOrRelianceRequested(
    donationOffsetBinarySafetyStatus(
      input.regulatedGoodsHazardousActivity,
      hasDonationOffsetSafetyKeyword(fullText, donationOffsetSafetyKeywordGroups.regulatedGoods),
    ),
    input.lockOrRelianceRequested,
  );
  const cyberStatus = blockIfSafetyLockOrRelianceRequested(
    donationOffsetBinarySafetyStatus(
      input.cyberAbuseDigitalIntegrity,
      hasDonationOffsetSafetyKeyword(fullText, donationOffsetSafetyKeywordGroups.cyberAbuse),
    ),
    input.lockOrRelianceRequested,
  );
  const antiCorruptionStatus = blockIfSafetyLockOrRelianceRequested(
    donationOffsetBinarySafetyStatus(
      input.antiCorruptionProcessIntegrity,
      hasDonationOffsetSafetyKeyword(fullText, donationOffsetSafetyKeywordGroups.antiCorruption),
    ),
    input.lockOrRelianceRequested,
  );
  const lockBoundaryStatus = input.lockOrRelianceRequested ? "blocked" : "pass";

  const gates = [
    donationOffsetSafetyGate({
      key: "confidentiality-privacy-rights",
      label: "Confidentiality and privacy rights",
      status: privacyStatus,
      detail: donationOffsetSafetyDetail(
        privacyStatus,
        "No unauthorized private-data disclosure is declared or detected.",
        "Private, confidential, or third-party evidence needs a narrow privacy grant and review.",
        "Unauthorized disclosure, doxxing, credentials, private records, or sensitive third-party data are blocked.",
      ),
      nextAction:
        privacyStatus === "blocked"
          ? "Remove private-data disclosure, credential, doxxing, or third-party record terms."
          : privacyGrantNeeded
            ? "Attach a narrow privacy grant and reviewer approval before any disclosure or reliance."
            : "Keep evidence scoped to non-private, claim-relevant proof.",
      blockerCodes:
        privacyStatus === "pass" ? [] : ["confidentiality_privacy_rights_review_required"],
    }),
    donationOffsetSafetyGate({
      key: "evidence-authenticity-synthetic-media",
      label: "Evidence authenticity and synthetic media",
      status: evidenceAuthenticityStatus,
      detail: donationOffsetSafetyDetail(
        evidenceAuthenticityStatus,
        "Evidence authenticity is reviewed separately from the payment or impact claim.",
        "Evidence that could be forged, edited, replayed, AI-generated, or detached from source needs review.",
        "Fabricated, replayed, selectively edited, source-detached, or synthetic evidence cannot create obligations.",
      ),
      nextAction:
        evidenceAuthenticityStatus === "blocked"
          ? "Remove fabricated, replayed, edited, synthetic, or unauthenticated evidence claims."
          : "Keep evidence source-traceable and claim-typed before it satisfies any lock or release gate.",
      blockerCodes:
        evidenceAuthenticityStatus === "pass"
          ? []
          : ["evidence_authenticity_synthetic_media_review_required"],
    }),
    donationOffsetSafetyGate({
      key: "financial-crime-fraud-source-of-funds",
      label: "Financial crime, fraud, and source of funds",
      status: financialCrimeStatus,
      detail: donationOffsetSafetyDetail(
        financialCrimeStatus,
        "No sanctions, stolen-funds, fabricated-receipt, refund-abuse, or circular-routing signal is declared or detected.",
        "Possible financial-crime or payment-fraud indicators need manual review.",
        "Financial crime, sanctions evasion, stolen funds, fabricated receipts, or refund abuse are blocked.",
      ),
      nextAction:
        financialCrimeStatus === "blocked"
          ? "Remove suspicious funds, receipt, refund, sanctions-evasion, or disguised-compensation terms."
          : "Keep source-of-funds and receipt facts reviewable before payment reliance.",
      blockerCodes:
        financialCrimeStatus === "blocked" ? ["financial_crime_fraud_blocked"] : [],
    }),
    donationOffsetSafetyGate({
      key: "agreement-transferability-non-assignment",
      label: "Agreement transferability and non-assignment",
      status: transferabilityStatus,
      detail: donationOffsetSafetyDetail(
        transferabilityStatus,
        "Donation-offset obligations are participant-specific and non-transferable by default.",
        "Possible assignment, resale, tokenization, claims purchase, or moral-trade credit issuance needs review.",
        "Transferable moral-trade credits, secondary markets, assignment, or securitization are blocked.",
      ),
      nextAction:
        transferabilityStatus === "blocked"
          ? "Remove transfer, resale, tokenization, credit, assignment, or third-party-assumption terms."
          : "Keep the proposal tied to the original participants and confirmations.",
      blockerCodes:
        transferabilityStatus === "pass" ? [] : ["agreement_non_transferability_required"],
    }),
    donationOffsetSafetyGate({
      key: "regulated-goods-hazardous-activity",
      label: "Regulated goods and hazardous activity",
      status: regulatedGoodsStatus,
      detail: donationOffsetSafetyDetail(
        regulatedGoodsStatus,
        "No regulated goods or hazardous physical-world activity is declared or detected.",
        "Possible regulated or hazardous activity needs legal, externality, autonomy, and anti-threat review.",
        "Weapons, controlled substances, unsafe medical activity, explosives, and comparable hazards are blocked.",
      ),
      nextAction:
        regulatedGoodsStatus === "blocked"
          ? "Remove regulated goods or hazardous activity terms."
          : "Keep donation-offset terms away from dangerous physical-world activity.",
      blockerCodes:
        regulatedGoodsStatus === "blocked"
          ? ["regulated_goods_hazardous_activity_blocked"]
          : [],
    }),
    donationOffsetSafetyGate({
      key: "cyber-abuse-digital-integrity",
      label: "Cyber abuse and digital integrity",
      status: cyberStatus,
      detail: donationOffsetSafetyDetail(
        cyberStatus,
        "No unauthorized access, malware, botting, spam, phishing, scraping, or platform manipulation is declared or detected.",
        "Possible digital-system integrity issues need legal, privacy, user-safety, content, and anti-threat review.",
        "Unauthorized access, malware, phishing, denial-of-service, botting, or data exfiltration are blocked.",
      ),
      nextAction:
        cyberStatus === "blocked"
          ? "Remove unauthorized digital-system, platform-manipulation, or data-exfiltration terms."
          : "Keep the offset away from unauthorized digital-system activity.",
      blockerCodes: cyberStatus === "blocked" ? ["cyber_abuse_blocked"] : [],
    }),
    donationOffsetSafetyGate({
      key: "anti-corruption-process-integrity",
      label: "Anti-corruption and process integrity",
      status: antiCorruptionStatus,
      detail: donationOffsetSafetyDetail(
        antiCorruptionStatus,
        "No bribe, kickback, vote-buying, improper-inducement, or process-integrity term is declared or detected.",
        "Possible process-integrity issue needs anti-corruption and legal review.",
        "Bribes, kickbacks, vote buying, pay-for-testimony, improper official favors, and process manipulation are blocked.",
      ),
      nextAction:
        antiCorruptionStatus === "blocked"
          ? "Remove bribery, kickback, vote-buying, pay-for-testimony, or improper process terms."
          : "Keep recipient, payment, and evidence terms separate from entrusted decision-making.",
      blockerCodes:
        antiCorruptionStatus === "blocked"
          ? ["anti_corruption_process_integrity_blocked"]
          : [],
    }),
    donationOffsetSafetyGate({
      key: "lock-reliance-boundary",
      label: "Lock and reliance boundary",
      status: lockBoundaryStatus,
      detail:
        lockBoundaryStatus === "pass"
          ? "This safety bundle is preview-only and does not request lock, capture, release, or reliance."
          : "This draft requested lock or reliance before safety and authenticity gates are non-blocking.",
      nextAction:
        lockBoundaryStatus === "pass"
          ? "Keep capture and reliance disabled until final lock, payment, evidence, and safety gates pass."
          : "Remove premature lock, capture, release, or reliance requests.",
      blockerCodes: lockBoundaryStatus === "pass" ? [] : ["lock_reliance_boundary_required"],
    }),
  ];
  const blockedGateCount = gates.filter((gate) => gate.status === "blocked").length;
  const humanReviewGateCount = gates.filter(
    (gate) => gate.status === "human_review" || gate.status === "needs_input",
  ).length;

  return {
    schemaVersion: "donation-offset-safety-authenticity-preview-v1",
    releaseStage: "donation_offset_preview_no_capture",
    captureAllowed: false,
    clearingAllowed: false,
    relianceBearing: false,
    evidenceUploadCreatesReliance: false,
    hashStorageProvesAuthenticity: false,
    privacyGrantRequiredBeforeDisclosure: true,
    evidenceAuthenticityReviewRequired: true,
    financialCrimeReviewRequired: true,
    nonTransferableByDefault: true,
    privacyGrantStatus: input.privacyGrantStatus,
    confidentialityPrivacy: input.confidentialityPrivacy,
    evidenceAuthenticity: input.evidenceAuthenticity,
    financialCrime: input.financialCrime,
    nonTransferability: input.nonTransferability,
    regulatedGoodsHazardousActivity: input.regulatedGoodsHazardousActivity,
    cyberAbuseDigitalIntegrity: input.cyberAbuseDigitalIntegrity,
    antiCorruptionProcessIntegrity: input.antiCorruptionProcessIntegrity,
    privacySensitiveEvidenceRequested: input.privacySensitiveEvidenceRequested,
    sourceAuthenticationReviewed: input.sourceAuthenticationReviewed,
    gates,
    blockedGateCount,
    humanReviewGateCount,
    readyForSafetyReview:
      blockedGateCount === 0 && gates.every((gate) => gate.status !== "needs_input"),
  };
}

export function validateDonationOffsetSafetyAuthenticityInput(
  input: DonationOffsetSafetyAuthenticityInput,
) {
  const errors: string[] = [];
  const preview = buildDonationOffsetSafetyAuthenticityPreview(input);

  if (!hasMeaningfulText(input.publicDescription)) {
    errors.push("Describe the donation-offset safety context before review.");
  }

  if (!hasMeaningfulText(input.evidencePlanSummary)) {
    errors.push("Describe the claim-typed evidence plan before review.");
  }

  if (!hasMeaningfulText(input.paymentPatternSummary)) {
    errors.push("Describe the payment, receipt, refund, and source-of-funds pattern.");
  }

  if (
    input.privacySensitiveEvidenceRequested &&
    input.privacyGrantStatus !== "drafted" &&
    input.privacyGrantStatus !== "approved"
  ) {
    errors.push("Attach a narrow privacy grant before requesting privacy-sensitive evidence.");
  }

  if (!input.sourceAuthenticationReviewed) {
    errors.push("Confirm source-authentication review before evidence can satisfy a claim.");
  }

  if (!input.participantAcknowledgedNoUnauthorizedPrivateDisclosure) {
    errors.push("Acknowledge that private or third-party data cannot be disclosed without authority and review.");
  }

  if (!input.participantAcknowledgedClaimTypedEvidence) {
    errors.push("Acknowledge that evidence must be claim-typed and authenticity-reviewed.");
  }

  if (!input.participantAcknowledgedNonTransferability) {
    errors.push("Acknowledge that donation-offset obligations are non-transferable by default.");
  }

  if (input.lockOrRelianceRequested) {
    errors.push("Donation-offset safety previews cannot request lock, capture, release, or reliance.");
  }

  for (const gate of preview.gates) {
    if (gate.status === "blocked") {
      errors.push(`${gate.label}: ${gate.nextAction}`);
    }
  }

  return errors;
}

export function summarizeDonationOffsetSafetyAuthenticityForNotes(
  preview: DonationOffsetSafetyAuthenticityPreview,
) {
  const gateSummary = preview.gates
    .map((gate) => `${gate.label}: ${formatDonationOffsetDonorGateStatus(gate.status)}`)
    .join("; ");

  return [
    "Donation-offset safety and evidence-authenticity preview:",
    `Schema version: ${preview.schemaVersion}`,
    `Release stage: ${preview.releaseStage}`,
    `Privacy grant status: ${preview.privacyGrantStatus.replaceAll("_", " ")}`,
    `Confidentiality/privacy status: ${preview.confidentialityPrivacy.replaceAll("_", " ")}`,
    `Evidence-authenticity status: ${preview.evidenceAuthenticity.replaceAll("_", " ")}`,
    `Financial-crime status: ${preview.financialCrime.replaceAll("_", " ")}`,
    `Non-transferability status: ${preview.nonTransferability.replaceAll("_", " ")}`,
    `Regulated-goods status: ${preview.regulatedGoodsHazardousActivity.replaceAll("_", " ")}`,
    `Cyber-abuse status: ${preview.cyberAbuseDigitalIntegrity.replaceAll("_", " ")}`,
    `Anti-corruption status: ${preview.antiCorruptionProcessIntegrity.replaceAll("_", " ")}`,
    "Capture allowed from this preview: no",
    "Clearing allowed from this preview: no",
    "Reliance-bearing from this preview: no",
    "Evidence upload creates reliance: no",
    "Hash storage proves authenticity: no",
    "Privacy grant required before disclosure: yes",
    "Evidence authenticity review required: yes",
    "Financial-crime review required: yes",
    "Non-transferable by default: yes",
    `Manual-review gates: ${gateSummary}`,
  ].join("\n");
}

export function buildDemoDonationOffsetSafetyAuthenticityPreview() {
  return buildDonationOffsetSafetyAuthenticityPreview({
    publicDescription:
      "Participants redirect opposed donations to a registered public-good recipient using external payment evidence.",
    evidencePlanSummary:
      "Use a source-traceable receipt or public charity confirmation for the payment claim only.",
    paymentPatternSummary:
      "External donors pay the registered charity directly without refund side channels or private compensation.",
    sideAgreementSummary:
      "No assignment, resale, tokenization, hazardous activity, cyber activity, or process-integrity side agreement is proposed.",
    privacyGrantStatus: "not_needed",
    confidentialityPrivacy: "clear",
    evidenceAuthenticity: "clear",
    financialCrime: "clear",
    nonTransferability: "clear",
    regulatedGoodsHazardousActivity: "clear",
    cyberAbuseDigitalIntegrity: "clear",
    antiCorruptionProcessIntegrity: "clear",
    privacySensitiveEvidenceRequested: false,
    sourceAuthenticationReviewed: true,
    lockOrRelianceRequested: false,
    participantAcknowledgedNoUnauthorizedPrivateDisclosure: true,
    participantAcknowledgedClaimTypedEvidence: true,
    participantAcknowledgedNonTransferability: true,
  });
}

export function buildDonationOffsetAuthorityFairnessPreview(
  input: DonationOffsetAuthorityFairnessInput,
): DonationOffsetAuthorityFairnessPreview {
  const fullText = [
    input.publicDescription,
    input.baselineStatement,
    input.authoritySummary,
    input.sideAgreementSummary,
  ]
    .join(" ")
    .toLowerCase();
  const baselineIntegrityStatus = blockIfAuthorityLockOrRelianceRequested(
    input.baselineIntegrityStatus === "non_blocking_review" &&
      !hasDonationOffsetSafetyKeyword(
        fullText,
        donationOffsetAuthorityKeywordGroups.baselineManufacturing,
      )
      ? "pass"
      : input.baselineIntegrityStatus === "manufactured_or_escalated" ||
          hasDonationOffsetSafetyKeyword(
            fullText,
            donationOffsetAuthorityKeywordGroups.baselineManufacturing,
          )
        ? "blocked"
        : "human_review",
    input.lockOrRelianceRequested,
  );
  const thirdPartyObligationStatus = blockIfAuthorityLockOrRelianceRequested(
    input.thirdPartyObligationStatus === "none_known" &&
      !hasDonationOffsetSafetyKeyword(
        fullText,
        donationOffsetAuthorityKeywordGroups.thirdPartyObligation,
      )
      ? "pass"
      : input.thirdPartyObligationStatus === "conflict_declared" ||
          hasDonationOffsetSafetyKeyword(
            fullText,
            donationOffsetAuthorityKeywordGroups.thirdPartyObligation,
          )
        ? "blocked"
        : "human_review",
    input.lockOrRelianceRequested,
  );
  const representativeAuthorityStatus = blockIfAuthorityLockOrRelianceRequested(
    (input.representativeAuthorityStatus === "self_only" ||
      input.representativeAuthorityStatus === "verified_authority") &&
      input.participantAcknowledgedOwnResourcesOnly &&
      !hasDonationOffsetSafetyKeyword(
        fullText,
        donationOffsetAuthorityKeywordGroups.representativeAuthority,
      )
      ? "pass"
      : input.representativeAuthorityStatus === "claims_representative_authority" ||
          hasDonationOffsetSafetyKeyword(
            fullText,
            donationOffsetAuthorityKeywordGroups.representativeAuthority,
          )
        ? "human_review"
        : "needs_input",
    input.lockOrRelianceRequested,
  );
  const reportingIntegrityStatus = blockIfAuthorityLockOrRelianceRequested(
    donationOffsetBinarySafetyStatus(
      input.reportingIntegrity,
      hasDonationOffsetSafetyKeyword(
        fullText,
        donationOffsetAuthorityKeywordGroups.reportingIntegrity,
      ),
    ) === "pass" && input.participantAcknowledgedNoReportingSuppression
      ? "pass"
      : donationOffsetBinarySafetyStatus(
          input.reportingIntegrity,
          hasDonationOffsetSafetyKeyword(
            fullText,
            donationOffsetAuthorityKeywordGroups.reportingIntegrity,
          ),
        ) === "blocked"
        ? "blocked"
        : "needs_input",
    input.lockOrRelianceRequested,
  );
  const civilRightsStatus = blockIfAuthorityLockOrRelianceRequested(
    donationOffsetBinarySafetyStatus(
      input.civilRights,
      hasDonationOffsetSafetyKeyword(fullText, donationOffsetAuthorityKeywordGroups.civilRights),
    ) === "pass" && input.participantAcknowledgedNoDiscrimination
      ? "pass"
      : donationOffsetBinarySafetyStatus(
          input.civilRights,
          hasDonationOffsetSafetyKeyword(fullText, donationOffsetAuthorityKeywordGroups.civilRights),
        ) === "blocked"
        ? "blocked"
        : "needs_input",
    input.lockOrRelianceRequested,
  );
  const participantAutonomyStatus = blockIfAuthorityLockOrRelianceRequested(
    donationOffsetBinarySafetyStatus(
      input.participantAutonomy,
      hasDonationOffsetSafetyKeyword(
        fullText,
        donationOffsetAuthorityKeywordGroups.participantAutonomy,
      ),
    ) === "pass" && input.participantAcknowledgedNoCoercion
      ? "pass"
      : donationOffsetBinarySafetyStatus(
          input.participantAutonomy,
          hasDonationOffsetSafetyKeyword(
            fullText,
            donationOffsetAuthorityKeywordGroups.participantAutonomy,
          ),
        ) === "blocked"
        ? "blocked"
        : "needs_input",
    input.lockOrRelianceRequested,
  );
  const jurisdictionStatus = blockIfAuthorityLockOrRelianceRequested(
    input.jurisdictionReviewStatus === "not_needed" ||
      input.jurisdictionReviewStatus === "non_blocking_review"
      ? "pass"
      : input.jurisdictionReviewStatus === "blocked"
        ? "blocked"
        : "human_review",
    input.lockOrRelianceRequested,
  );
  const lockBoundaryStatus = input.lockOrRelianceRequested ? "blocked" : "pass";

  const gates = [
    donationOffsetAuthorityGate({
      key: "baseline-integrity",
      label: "Baseline integrity",
      status: baselineIntegrityStatus,
      detail: donationOffsetAuthorityDetail(
        baselineIntegrityStatus,
        "The no-trade baseline has a non-blocking baseline-integrity review.",
        "Baseline timing, credibility, or escalation needs neutral review before lock.",
        "Manufactured, escalated, threat-like, or coercive baselines cannot authorize clearing.",
      ),
      nextAction:
        baselineIntegrityStatus === "blocked"
          ? "Remove manufactured or threat-like baseline terms before the offset can proceed."
          : "Keep baseline-integrity review separate from moral ranking and participant consent.",
      blockerCodes:
        baselineIntegrityStatus === "pass" ? [] : ["baseline_integrity_review_required"],
    }),
    donationOffsetAuthorityGate({
      key: "third-party-obligation",
      label: "Third-party obligation",
      status: thirdPartyObligationStatus,
      detail: donationOffsetAuthorityDetail(
        thirdPartyObligationStatus,
        "No third-party duty, donor restriction, court order, contract, or professional obligation conflict is declared or detected.",
        "Possible third-party obligation conflict needs bounded review.",
        "A participant cannot trade away obligations or rights held by another person or institution.",
      ),
      nextAction:
        thirdPartyObligationStatus === "blocked"
          ? "Remove terms that conflict with third-party obligations or rights."
          : "Document why the participant controls the relevant donation, evidence, and disclosure duties.",
      blockerCodes:
        thirdPartyObligationStatus === "pass" ? [] : ["third_party_obligation_review_required"],
    }),
    donationOffsetAuthorityGate({
      key: "representative-authority",
      label: "Representative authority",
      status: representativeAuthorityStatus,
      detail: donationOffsetAuthorityDetail(
        representativeAuthorityStatus,
        "The participant binds only their own resources, or verified authority covers the exact action.",
        "Claimed authority for another person, fund, account, employer, fiscal host, or organization needs review.",
        "Missing or disputed authority blocks lock, payment, evidence disclosure, and completed status.",
      ),
      nextAction:
        representativeAuthorityStatus === "pass"
          ? "Keep authority scoped to the exact donation, evidence, receipt, and time window."
          : "Verify representative authority or limit the offset to the participant's own resources.",
      blockerCodes:
        representativeAuthorityStatus === "pass"
          ? []
          : ["representative_authority_review_required"],
    }),
    donationOffsetAuthorityGate({
      key: "reporting-integrity",
      label: "Reporting integrity",
      status: reportingIntegrityStatus,
      detail: donationOffsetAuthorityDetail(
        reportingIntegrityStatus,
        "The offset does not suppress truthful reporting, complaints, investigations, or evidence submission.",
        "Reporting-integrity acknowledgements or review are incomplete.",
        "Donation offsets cannot buy silence, false statements, complaint withdrawal, or noncooperation.",
      ),
      nextAction:
        reportingIntegrityStatus === "blocked"
          ? "Remove silence, suppression, false-statement, complaint-withdrawal, or noncooperation terms."
          : "Keep truthful reporting and safety/legal cooperation outside the trade.",
      blockerCodes:
        reportingIntegrityStatus === "pass" ? [] : ["reporting_integrity_review_required"],
    }),
    donationOffsetAuthorityGate({
      key: "civil-rights-discrimination",
      label: "Civil rights and discrimination",
      status: civilRightsStatus,
      detail: donationOffsetAuthorityDetail(
        civilRightsStatus,
        "No protected-trait discrimination, protected-activity retaliation, exclusion, harassment, or segregation term is declared or detected.",
        "Civil-rights acknowledgement or review is incomplete.",
        "Donation offsets cannot require, reward, or route around unlawful discrimination or retaliation.",
      ),
      nextAction:
        civilRightsStatus === "blocked"
          ? "Remove protected-trait discrimination, exclusion, retaliation, or protected-activity terms."
          : "Keep recipient choice and evidence terms separate from civil-rights violations.",
      blockerCodes: civilRightsStatus === "pass" ? [] : ["civil_rights_review_required"],
    }),
    donationOffsetAuthorityGate({
      key: "participant-autonomy-coercion",
      label: "Participant autonomy and coercion",
      status: participantAutonomyStatus,
      detail: donationOffsetAuthorityDetail(
        participantAutonomyStatus,
        "No duress, dependency, acute vulnerability, crisis, or authority-pressure term is declared or detected.",
        "Participant-autonomy acknowledgement or coercion review is incomplete.",
        "Consent extracted through dependency, crisis, authority pressure, or undue inducement is not participant surplus confirmation.",
      ),
      nextAction:
        participantAutonomyStatus === "blocked"
          ? "Remove coercive, exploitative, dependency-based, or vulnerability-targeting terms."
          : "Keep confirmations voluntary and separate from dependency or authority pressure.",
      blockerCodes:
        participantAutonomyStatus === "pass"
          ? []
          : ["participant_autonomy_coercion_review_required"],
    }),
    donationOffsetAuthorityGate({
      key: "jurisdiction-review",
      label: "Jurisdiction and legal review",
      status: jurisdictionStatus,
      detail: donationOffsetAuthorityDetail(
        jurisdictionStatus,
        "Jurisdiction review is either not needed for this preview or is non-blocking.",
        "Legal or jurisdiction review is still needed before lock or reliance.",
        "A blocked jurisdiction/legal review prevents lock, capture, release, or completed status.",
      ),
      nextAction:
        jurisdictionStatus === "blocked"
          ? "Resolve or remove the blocked legal/jurisdiction issue."
          : "Keep jurisdiction/legal review tied to authority, receipt, disclosure, and payment terms.",
      blockerCodes: jurisdictionStatus === "pass" ? [] : ["jurisdiction_review_required"],
    }),
    donationOffsetAuthorityGate({
      key: "lock-reliance-boundary",
      label: "Lock and reliance boundary",
      status: lockBoundaryStatus,
      detail:
        lockBoundaryStatus === "pass"
          ? "This authority bundle is preview-only and does not request lock, capture, release, or reliance."
          : "This draft requested lock or reliance before authority and fairness gates are non-blocking.",
      nextAction:
        lockBoundaryStatus === "pass"
          ? "Keep lock and reliance disabled until authority, baseline, legal, and fairness gates pass."
          : "Remove premature lock, capture, release, or reliance requests.",
      blockerCodes: lockBoundaryStatus === "pass" ? [] : ["lock_reliance_boundary_required"],
    }),
  ];
  const blockedGateCount = gates.filter((gate) => gate.status === "blocked").length;
  const humanReviewGateCount = gates.filter(
    (gate) => gate.status === "human_review" || gate.status === "needs_input",
  ).length;

  return {
    schemaVersion: "donation-offset-authority-fairness-preview-v1",
    releaseStage: "donation_offset_preview_no_capture",
    captureAllowed: false,
    clearingAllowed: false,
    relianceBearing: false,
    participantMayBindOnlySelfByDefault: true,
    baselineManufacturingBlocked: true,
    reportingSuppressionBlocked: true,
    coerciveConsentNotSufficient: true,
    civilRightsReviewRequired: true,
    baselineIntegrityStatus: input.baselineIntegrityStatus,
    thirdPartyObligationStatus: input.thirdPartyObligationStatus,
    representativeAuthorityStatus: input.representativeAuthorityStatus,
    jurisdictionReviewStatus: input.jurisdictionReviewStatus,
    reportingIntegrity: input.reportingIntegrity,
    civilRights: input.civilRights,
    participantAutonomy: input.participantAutonomy,
    gates,
    blockedGateCount,
    humanReviewGateCount,
    readyForAuthorityReview:
      blockedGateCount === 0 && gates.every((gate) => gate.status !== "needs_input"),
  };
}

export function validateDonationOffsetAuthorityFairnessInput(
  input: DonationOffsetAuthorityFairnessInput,
) {
  const errors: string[] = [];
  const preview = buildDonationOffsetAuthorityFairnessPreview(input);

  if (!hasMeaningfulText(input.publicDescription)) {
    errors.push("Describe the donation-offset authority and fairness context before review.");
  }

  if (!hasMeaningfulText(input.baselineStatement)) {
    errors.push("Describe the no-trade baseline before baseline-integrity review.");
  }

  if (!hasMeaningfulText(input.authoritySummary)) {
    errors.push("Describe who controls the donation, evidence, receipt, and disclosure duties.");
  }

  if (!input.participantAcknowledgedOwnResourcesOnly) {
    errors.push("Acknowledge that participants may bind only their own resources by default.");
  }

  if (!input.participantAcknowledgedNoReportingSuppression) {
    errors.push("Acknowledge that donation offsets cannot suppress truthful reporting or evidence.");
  }

  if (!input.participantAcknowledgedNoDiscrimination) {
    errors.push("Acknowledge that donation offsets cannot require or reward unlawful discrimination.");
  }

  if (!input.participantAcknowledgedNoCoercion) {
    errors.push("Acknowledge that coerced or dependency-based consent is not participant surplus confirmation.");
  }

  if (input.lockOrRelianceRequested) {
    errors.push("Donation-offset authority previews cannot request lock, capture, release, or reliance.");
  }

  for (const gate of preview.gates) {
    if (gate.status === "blocked") {
      errors.push(`${gate.label}: ${gate.nextAction}`);
    }
  }

  return errors;
}

export function summarizeDonationOffsetAuthorityFairnessForNotes(
  preview: DonationOffsetAuthorityFairnessPreview,
) {
  const gateSummary = preview.gates
    .map((gate) => `${gate.label}: ${formatDonationOffsetDonorGateStatus(gate.status)}`)
    .join("; ");

  return [
    "Donation-offset authority and fairness preview:",
    `Schema version: ${preview.schemaVersion}`,
    `Release stage: ${preview.releaseStage}`,
    `Baseline integrity: ${preview.baselineIntegrityStatus.replaceAll("_", " ")}`,
    `Third-party obligation: ${preview.thirdPartyObligationStatus.replaceAll("_", " ")}`,
    `Representative authority: ${preview.representativeAuthorityStatus.replaceAll("_", " ")}`,
    `Jurisdiction review: ${preview.jurisdictionReviewStatus.replaceAll("_", " ")}`,
    `Reporting integrity: ${preview.reportingIntegrity.replaceAll("_", " ")}`,
    `Civil rights: ${preview.civilRights.replaceAll("_", " ")}`,
    `Participant autonomy: ${preview.participantAutonomy.replaceAll("_", " ")}`,
    "Capture allowed from this preview: no",
    "Clearing allowed from this preview: no",
    "Reliance-bearing from this preview: no",
    "Participant may bind only self by default: yes",
    "Baseline manufacturing blocked: yes",
    "Reporting suppression blocked: yes",
    "Coercive consent sufficient: no",
    "Civil-rights review required: yes",
    `Manual-review gates: ${gateSummary}`,
  ].join("\n");
}

export function buildDemoDonationOffsetAuthorityFairnessPreview() {
  return buildDonationOffsetAuthorityFairnessPreview({
    publicDescription:
      "Participants redirect their own opposed donations to a registered compromise recipient.",
    baselineStatement:
      "The baseline is a pre-existing planned donation by the participant, not an escalated threat.",
    authoritySummary:
      "Each participant controls only their own donation, evidence, receipt treatment, and disclosures.",
    sideAgreementSummary:
      "No reporting suppression, discrimination, coercion, representative claim, or third-party duty conflict is proposed.",
    baselineIntegrityStatus: "non_blocking_review",
    thirdPartyObligationStatus: "none_known",
    representativeAuthorityStatus: "self_only",
    reportingIntegrity: "clear",
    civilRights: "clear",
    participantAutonomy: "clear",
    jurisdictionReviewStatus: "non_blocking_review",
    lockOrRelianceRequested: false,
    participantAcknowledgedOwnResourcesOnly: true,
    participantAcknowledgedNoReportingSuppression: true,
    participantAcknowledgedNoDiscrimination: true,
    participantAcknowledgedNoCoercion: true,
  });
}

export function buildDonationOffsetDonorOfRecordPreview(
  input: DonationOffsetDonorOfRecordInput,
): DonationOffsetDonorOfRecordPreview {
  const donorExplicit =
    input.donorOfRecordRole !== "unknown" && hasMeaningfulText(input.donorOfRecordExplanation);
  const taxReceiptExplicit =
    input.taxReceiptTreatment !== "unknown_or_unreviewed" && hasMeaningfulText(input.taxReceiptExplanation);
  const taxBenefitNeedsReview =
    input.taxBenefitClaimed ||
    input.taxReceiptTreatment !== "no_tax_benefit_claimed" ||
    input.donorAdvisedFundInvolved ||
    input.employerMatchInvolved;
  const solicitationNeedsReview =
    input.charitableSolicitationTreatment !== "external_donation_only_no_platform_solicitation" ||
    input.commercialCoVentureInvolved;
  const destinationStatus =
    input.destinationVerificationStatus === "registered_destination_selected"
      ? "pass"
      : input.destinationVerificationStatus === "external_unverified"
        ? "human_review"
        : "needs_input";
  const taxStatus =
    !taxReceiptExplicit
      ? "needs_input"
      : taxBenefitNeedsReview
        ? input.jurisdictionReviewRequired
          ? "human_review"
          : "blocked"
        : "pass";
  const solicitationStatus =
    solicitationNeedsReview
      ? input.jurisdictionReviewRequired
        ? "human_review"
        : "blocked"
      : "pass";
  const receiptControlStatus =
    input.receiptDoubleClaimPrevented && input.receiptReassignmentProhibited
      ? "pass"
      : "blocked";
  const acknowledgmentStatus =
    input.participantAcknowledgedNoTaxAdvice &&
    input.participantAcknowledgedOperationalNotImpact
      ? "pass"
      : "needs_input";
  const lockFreezeStatus = input.lockTermsFrozenBeforeConfirmation ? "pass" : "needs_input";

  const gates = [
    donorGate({
      key: "donor-of-record",
      label: "Donor of record",
      status: donorExplicit ? "pass" : "needs_input",
      detail: donorExplicit
        ? "The draft names who is donor of record and states that Moral Trade is not silently reassigned as donor."
        : "The offset needs an explicit donor-of-record treatment before any lock proposal.",
      nextAction: donorExplicit
        ? "Keep this treatment frozen for final lock confirmation."
        : "State who makes the external donation and who is not donor of record.",
      blockerCodes: donorExplicit ? [] : ["donor_of_record_missing"],
    }),
    donorGate({
      key: "tax-receipt-treatment",
      label: "Tax receipt treatment",
      status: taxStatus,
      detail:
        taxStatus === "pass"
          ? "No tax benefit is claimed from Moral Trade, and receipt handling is explicit."
          : taxStatus === "human_review"
            ? "Receipt, donor-advised fund, employer-match, or tax-benefit treatment needs jurisdiction review before lock."
            : taxStatus === "blocked"
              ? "Tax-benefit or receipt claims cannot proceed without jurisdiction review."
              : "Tax receipt treatment must be stated before lock.",
      nextAction:
        taxStatus === "pass"
          ? "Do not represent receipts as moral impact or allocation power."
          : "Freeze receipt handling and require legal/jurisdiction review before any tax-benefit claim.",
      blockerCodes:
        taxStatus === "pass" ? [] : taxStatus === "blocked" ? ["tax_receipt_review_missing"] : ["tax_receipt_review"],
    }),
    donorGate({
      key: "charitable-solicitation",
      label: "Charitable solicitation and co-venture",
      status: solicitationStatus,
      detail:
        solicitationStatus === "pass"
          ? "The draft uses external donation evidence without platform solicitation, match-promo, or co-venture claims."
          : solicitationStatus === "human_review"
            ? "Platform-facilitated solicitation, employer match, sponsor promotion, or commercial co-venture treatment needs review."
            : "Solicitation or co-venture claims cannot proceed without jurisdiction review.",
      nextAction:
        solicitationStatus === "pass"
          ? "Keep the public copy clear that Moral Trade is not soliciting tax-deductible gifts."
          : "Route the solicitation/co-venture treatment to legal review before lock.",
      blockerCodes:
        solicitationStatus === "pass"
          ? []
          : solicitationStatus === "blocked"
            ? ["charitable_solicitation_review_missing"]
            : ["charitable_solicitation_review"],
    }),
    donorGate({
      key: "receipt-double-claim",
      label: "No double-claimed receipt benefits",
      status: receiptControlStatus,
      detail:
        receiptControlStatus === "pass"
          ? "Receipt, donor-advised-fund credit, employer match, and comparable benefits cannot be double-claimed or reassigned."
          : "Receipt benefits need explicit no-double-claim and no-reassignment controls.",
      nextAction:
        receiptControlStatus === "pass"
          ? "Keep receipt benefits outside moral-trade volume and impact claims."
          : "Require no-double-claim and no-reassignment acknowledgements.",
      blockerCodes: receiptControlStatus === "pass" ? [] : ["receipt_double_claim_control_missing"],
    }),
    donorGate({
      key: "destination-verification",
      label: "Destination verification",
      status: destinationStatus,
      detail:
        destinationStatus === "pass"
          ? "A registered compromise destination is selected for the preview."
          : "External or unknown destinations need anti-impersonation, jurisdiction, and prohibited-use review.",
      nextAction:
        destinationStatus === "pass"
          ? "Verify payment destination before capture or release."
          : "Resolve the destination to a verified registry entry before lock.",
      blockerCodes: destinationStatus === "pass" ? [] : ["destination_verification_review"],
    }),
    donorGate({
      key: "tax-advice-and-impact-separation",
      label: "No tax advice or impact claim",
      status: acknowledgmentStatus,
      detail:
        acknowledgmentStatus === "pass"
          ? "The participant acknowledged that Moral Trade gives no tax advice and receipts are operational/legal facts, not impact evidence."
          : "The participant must acknowledge no tax advice and receipt-vs-impact separation.",
      nextAction:
        acknowledgmentStatus === "pass"
          ? "Keep public metrics separate from receipt, deductibility, and impact claims."
          : "Require acknowledgements before publishing the offset preview.",
      blockerCodes: acknowledgmentStatus === "pass" ? [] : ["tax_advice_acknowledgement_missing"],
    }),
    donorGate({
      key: "final-lock-freeze",
      label: "Final lock freeze",
      status: lockFreezeStatus,
      detail:
        lockFreezeStatus === "pass"
          ? "Donor-of-record, receipt, solicitation, and destination terms must be frozen before final confirmations."
          : "Lock proposals must freeze donor-of-record, receipt, solicitation, and destination terms.",
      nextAction:
        lockFreezeStatus === "pass"
          ? "Any later material change requires an amendment and renewed confirmations."
          : "Confirm that final lock freezes these legal/operational terms.",
      blockerCodes: lockFreezeStatus === "pass" ? [] : ["donor_terms_lock_freeze_missing"],
    }),
  ];
  const blockedGateCount = gates.filter((gate) => gate.status === "blocked").length;
  const humanReviewGateCount = gates.filter(
    (gate) => gate.status === "human_review" || gate.status === "needs_input",
  ).length;

  return {
    schemaVersion: "donation-offset-donor-of-record-preview-v1",
    releaseStage: "donation_offset_preview_no_capture",
    captureAllowed: false,
    relianceBearing: false,
    taxAdviceProvided: false,
    taxDeductibilityClaimAllowed: false,
    receiptCreatesImpactClaim: false,
    requiresFrozenLockTreatment: true,
    requiresJurisdictionReviewBeforeTaxBenefitClaim: true,
    destinationLabel: input.destinationLabel.trim() || "Selected compromise destination",
    donationPlatform: input.donationPlatform.trim() || "External donation platform",
    donorOfRecordRole: input.donorOfRecordRole,
    taxReceiptTreatment: input.taxReceiptTreatment,
    gates,
    blockedGateCount,
    humanReviewGateCount,
    readyForLockReview: blockedGateCount === 0 && gates.every((gate) => gate.status !== "needs_input"),
  };
}

export function validateDonationOffsetDonorOfRecordInput(
  input: DonationOffsetDonorOfRecordInput,
) {
  const errors: string[] = [];
  const preview = buildDonationOffsetDonorOfRecordPreview(input);

  if (!hasMeaningfulText(input.donorOfRecordExplanation)) {
    errors.push("State the donor-of-record treatment for this donation offset.");
  }

  if (!hasMeaningfulText(input.taxReceiptExplanation)) {
    errors.push("State the tax-receipt treatment for this donation offset.");
  }

  if (!input.participantAcknowledgedNoTaxAdvice) {
    errors.push("Acknowledge that Moral Trade does not provide tax advice or tax deductibility.");
  }

  if (!input.participantAcknowledgedOperationalNotImpact) {
    errors.push("Acknowledge that receipts and payment evidence are not impact claims.");
  }

  if (!input.receiptDoubleClaimPrevented || !input.receiptReassignmentProhibited) {
    errors.push("Confirm that receipt benefits will not be double-claimed or silently reassigned.");
  }

  if (!input.lockTermsFrozenBeforeConfirmation) {
    errors.push("Confirm that donor-of-record and receipt terms will be frozen before final lock.");
  }

  for (const gate of preview.gates) {
    if (gate.status === "blocked") {
      errors.push(`${gate.label}: ${gate.nextAction}`);
    }
  }

  return errors;
}

export function summarizeDonationOffsetDonorOfRecordForNotes(
  preview: DonationOffsetDonorOfRecordPreview,
) {
  const gateSummary = preview.gates
    .map((gate) => `${gate.label}: ${formatDonationOffsetDonorGateStatus(gate.status)}`)
    .join("; ");

  return [
    "Donation-offset donor-of-record preview:",
    `Schema version: ${preview.schemaVersion}`,
    `Release stage: ${preview.releaseStage}`,
    `Destination: ${preview.destinationLabel}`,
    `Donation platform: ${preview.donationPlatform}`,
    `Donor-of-record role: ${preview.donorOfRecordRole.replaceAll("_", " ")}`,
    `Tax receipt treatment: ${preview.taxReceiptTreatment.replaceAll("_", " ")}`,
    "Moral Trade tax advice provided: no",
    "Tax deductibility claim allowed from this preview: no",
    "Receipt creates impact claim: no",
    "Capture allowed before final lock: no",
    "Requires frozen donor-of-record, receipt, solicitation, and destination treatment before final confirmations: yes",
    `Manual-review gates: ${gateSummary}`,
  ].join("\n");
}

export function buildDemoDonationOffsetDonorOfRecordPreview() {
  return buildDonationOffsetDonorOfRecordPreview({
    destinationLabel: "GiveWell Top Charities Fund",
    donationPlatform: "External charity payment page",
    donorOfRecordRole: "participant_direct_donor",
    donorOfRecordExplanation:
      "The participant who makes the external donation remains donor of record; Moral Trade is not donor of record.",
    taxReceiptTreatment: "no_tax_benefit_claimed",
    taxReceiptExplanation:
      "No participant claims tax deductibility from Moral Trade. Any external receipt remains an operational record subject to legal review.",
    taxBenefitClaimed: false,
    donorAdvisedFundInvolved: false,
    employerMatchInvolved: false,
    commercialCoVentureInvolved: false,
    charitableSolicitationTreatment: "external_donation_only_no_platform_solicitation",
    jurisdictionReviewRequired: true,
    participantAcknowledgedNoTaxAdvice: true,
    participantAcknowledgedOperationalNotImpact: true,
    receiptDoubleClaimPrevented: true,
    receiptReassignmentProhibited: true,
    lockTermsFrozenBeforeConfirmation: true,
    destinationVerificationStatus: "registered_destination_selected",
  });
}

export function getDonationOffsetComplexityWarnings(fields: DonationOffsetFields) {
  const warnings: string[] = [];

  if (fields.offsetRatio && Math.abs(fields.offsetRatio - 1) > 0.001) {
    warnings.push("Non-1:1 ratios are valid, but they are harder to explain and harder to match.");
  }

  if (fields.participationMode === "pool") {
    warnings.push(
      "Pool offsets need especially clear side labels, surplus rules, and verification because multiple donors rely on the same structure.",
    );
  }

  if (fields.timeHorizon === "recurring") {
    warnings.push(
      "Recurring offsets need a stable check-in rhythm and a clear stop rule so donors know how long the arrangement lasts.",
    );
  }

  return warnings;
}

export function calculateDonationOffsetPreview(
  fields: Pick<
    DonationOffsetFields,
    "baselineAmountUsd" | "requestedMatchingAmountUsd" | "offsetRatio" | "unmatchedSurplusRule"
  >,
): DonationOffsetPreview {
  const baselineAmountUsd = normalizeUsdAmount(fields.baselineAmountUsd) ?? 0;
  const requestedMatchingAmountUsd = normalizeUsdAmount(fields.requestedMatchingAmountUsd) ?? 0;
  const offsetRatio =
    fields.offsetRatio && Number.isFinite(fields.offsetRatio) && fields.offsetRatio > 0
      ? Number(fields.offsetRatio)
      : 1;

  const matchedBaselineUsd = Number(
    Math.min(baselineAmountUsd, requestedMatchingAmountUsd / offsetRatio).toFixed(2),
  );
  const matchedCounterpartyUsd = Number((matchedBaselineUsd * offsetRatio).toFixed(2));
  const compromiseTotalUsd = Number((matchedBaselineUsd + matchedCounterpartyUsd).toFixed(2));
  const unmatchedBaselineUsd = Number(
    Math.max(0, baselineAmountUsd - matchedBaselineUsd).toFixed(2),
  );
  const unmatchedCounterpartyUsd = Number(
    Math.max(0, requestedMatchingAmountUsd - matchedCounterpartyUsd).toFixed(2),
  );

  return {
    matchedBaselineUsd,
    matchedCounterpartyUsd,
    compromiseTotalUsd,
    unmatchedBaselineUsd,
    unmatchedCounterpartyUsd,
    unmatchedRuleLabel: formatDonationOffsetUnmatchedRule(fields.unmatchedSurplusRule),
  };
}

export function calculateDonationOffsetPoolProgress({
  sideATotalUsd,
  sideBTotalUsd,
  offsetRatio,
  assuranceMinimumUsd,
  deadlineAt,
  now = new Date(),
}: {
  sideATotalUsd: number;
  sideBTotalUsd: number;
  offsetRatio: number | null | undefined;
  assuranceMinimumUsd: number | null | undefined;
  deadlineAt?: string | null;
  now?: Date;
}): DonationOffsetPoolProgress {
  const preview = calculateDonationOffsetPreview({
    baselineAmountUsd: normalizeUsdThreshold(sideATotalUsd) ?? 0,
    requestedMatchingAmountUsd: normalizeUsdThreshold(sideBTotalUsd) ?? 0,
    offsetRatio: offsetRatio ?? 1,
    unmatchedSurplusRule: "donate_to_compromise_destination",
  });
  const assuranceTarget = normalizeUsdThreshold(assuranceMinimumUsd) ?? 0;
  const assuranceProgressPct =
    assuranceTarget > 0
      ? Math.min(100, Math.round((preview.compromiseTotalUsd / assuranceTarget) * 100))
      : preview.compromiseTotalUsd > 0
        ? 100
        : 0;
  const deadlinePassed = Boolean(deadlineAt && new Date(deadlineAt).getTime() < now.getTime());
  const assuranceReached = assuranceTarget <= 0 || preview.compromiseTotalUsd >= assuranceTarget;
  const status = deadlinePassed
    ? "closed"
    : assuranceReached
      ? "assurance_met"
      : preview.compromiseTotalUsd > 0
        ? "assurance_pending"
        : "open";

  return {
    sideATotalUsd: normalizeUsdThreshold(sideATotalUsd) ?? 0,
    sideBTotalUsd: normalizeUsdThreshold(sideBTotalUsd) ?? 0,
    matchedSideAUsd: preview.matchedBaselineUsd,
    matchedSideBUsd: preview.matchedCounterpartyUsd,
    matchedCompromiseUsd: preview.compromiseTotalUsd,
    unmatchedSideAUsd: preview.unmatchedBaselineUsd,
    unmatchedSideBUsd: preview.unmatchedCounterpartyUsd,
    assuranceMinimumUsd: assuranceTarget,
    assuranceProgressPct,
    assuranceReached,
    status,
  };
}

function usdToCents(value: number | null | undefined) {
  const normalized = normalizeUsdThreshold(value);
  return Math.round((normalized ?? 0) * 100);
}

function centsToUsd(value: number) {
  return Number((Math.max(0, value) / 100).toFixed(2));
}

function distributeReservedCents(commitments: DonationOffsetBatchCommitment[], targetUsd: number) {
  const targetCents = usdToCents(targetUsd);
  const commitmentCents = commitments.map((commitment) => ({
    id: commitment.id,
    amountCents: usdToCents(commitment.amountUsd),
  }));
  const totalCents = commitmentCents.reduce((sum, commitment) => sum + commitment.amountCents, 0);

  if (!commitmentCents.length || targetCents <= 0 || totalCents <= 0) {
    return new Map(commitmentCents.map((commitment) => [commitment.id, 0]));
  }

  const rawReservations = commitmentCents.map((commitment) => {
    const raw = (commitment.amountCents / totalCents) * Math.min(targetCents, totalCents);

    return {
      id: commitment.id,
      floorCents: Math.floor(raw),
      remainder: raw - Math.floor(raw),
    };
  });
  const floorTotal = rawReservations.reduce((sum, reservation) => sum + reservation.floorCents, 0);
  const reservations = new Map(rawReservations.map((reservation) => [reservation.id, reservation.floorCents]));
  let remainder = Math.min(targetCents, totalCents) - floorTotal;

  for (const reservation of [...rawReservations].sort(
    (left, right) => right.remainder - left.remainder || left.id.localeCompare(right.id),
  )) {
    if (remainder <= 0) {
      break;
    }

    reservations.set(reservation.id, (reservations.get(reservation.id) ?? 0) + 1);
    remainder -= 1;
  }

  return reservations;
}

function commitmentBlockers(commitment: DonationOffsetBatchCommitment, offsetRatio: number) {
  const blockers: string[] = [];

  if (commitment.status !== "active") {
    blockers.push(`commitment_${commitment.status}`);
  }

  if (commitment.amountUsd <= 0 || !Number.isFinite(commitment.amountUsd)) {
    blockers.push("commitment_amount_missing");
  }

  if (commitment.ratioMinimum > offsetRatio || commitment.ratioMaximum < offsetRatio) {
    blockers.push("clearing_ratio_outside_participant_bounds");
  }

  return blockers;
}

function reservationStatus({
  reservedCents,
  committedCents,
  blockers,
}: {
  reservedCents: number;
  committedCents: number;
  blockers: string[];
}): DonationOffsetCommitmentReservation["reservationStatus"] {
  if (blockers.length) {
    return "blocked";
  }

  if (reservedCents <= 0) {
    return "unreserved";
  }

  return reservedCents >= committedCents ? "reserved" : "partially_reserved";
}

export function buildDonationOffsetBatchClearingDryRun({
  poolId,
  poolName,
  offsetRatio,
  assuranceMinimumUsd,
  assuranceDeadline,
  destinationLabel,
  verificationMethod,
  commitments,
  now = new Date(),
}: {
  poolId: string;
  poolName: string;
  offsetRatio: number | null | undefined;
  assuranceMinimumUsd: number | null | undefined;
  assuranceDeadline?: string | null;
  destinationLabel: string;
  verificationMethod: DonationOffsetVerificationMethod;
  commitments: DonationOffsetBatchCommitment[];
  now?: Date;
}): DonationOffsetBatchClearingDryRun {
  const normalizedRatio = offsetRatio && Number.isFinite(offsetRatio) && offsetRatio > 0 ? offsetRatio : 1;
  const eligibleCommitments = commitments.filter(
    (commitment) => commitmentBlockers(commitment, normalizedRatio).length === 0,
  );
  const sideACommitments = eligibleCommitments.filter((commitment) => commitment.side === "side_a");
  const sideBCommitments = eligibleCommitments.filter((commitment) => commitment.side === "side_b");
  const sideATotalUsd = centsToUsd(sideACommitments.reduce((sum, commitment) => sum + usdToCents(commitment.amountUsd), 0));
  const sideBTotalUsd = centsToUsd(sideBCommitments.reduce((sum, commitment) => sum + usdToCents(commitment.amountUsd), 0));
  const preview = calculateDonationOffsetPreview({
    baselineAmountUsd: sideATotalUsd,
    requestedMatchingAmountUsd: sideBTotalUsd,
    offsetRatio: normalizedRatio,
    unmatchedSurplusRule: "donate_to_compromise_destination",
  });
  const sideAReservations = distributeReservedCents(sideACommitments, preview.matchedBaselineUsd);
  const sideBReservations = distributeReservedCents(sideBCommitments, preview.matchedCounterpartyUsd);
  const reservationById = new Map([...sideAReservations, ...sideBReservations]);
  const assuranceTarget = normalizeUsdThreshold(assuranceMinimumUsd) ?? 0;
  const assuranceReached = assuranceTarget <= 0 || preview.compromiseTotalUsd >= assuranceTarget;
  const deadlinePassed = Boolean(assuranceDeadline && Date.parse(assuranceDeadline) < now.getTime());
  const ratioOutOfBounds = commitments.some(
    (commitment) => commitmentBlockers(commitment, normalizedRatio).includes("clearing_ratio_outside_participant_bounds"),
  );
  const missingSide = sideATotalUsd <= 0 || sideBTotalUsd <= 0;
  const blockerCodes = [
    ...(missingSide ? ["missing_counterparty_side"] : []),
    ...(ratioOutOfBounds ? ["clearing_ratio_outside_participant_bounds"] : []),
    ...(!assuranceReached ? ["assurance_threshold_not_met"] : []),
    ...(deadlinePassed ? ["assurance_deadline_closed"] : []),
  ];
  const participantCount = commitments.filter((commitment) => commitment.status === "active").length;
  const status = blockerCodes.length
    ? "blocked_preview_only"
    : "ready_for_final_lock_confirmation";
  const proposalStatus = blockerCodes.length ? "blocked" : "preview_only_no_capture";

  return {
    schemaVersion: "donation-offset-batch-clearing-dry-run-v1",
    poolId,
    poolName,
    releaseStage: "donation_offset_preview_no_capture",
    ratioBoundStatus: ratioOutOfBounds ? "out_of_bounds" : missingSide ? "insufficient_sides" : "within_bounds",
    commitmentInventory: commitments.map((commitment) => {
      const blockers = commitmentBlockers(commitment, normalizedRatio);
      const committedCents = usdToCents(commitment.amountUsd);
      const reservedCents = blockers.length ? 0 : reservationById.get(commitment.id) ?? 0;

      return {
        commitmentId: commitment.id,
        participantLabel: commitment.participantLabel,
        side: commitment.side,
        committedUsd: centsToUsd(committedCents),
        reservedUsd: centsToUsd(reservedCents),
        unreservedUsd: centsToUsd(Math.max(0, committedCents - reservedCents)),
        ratioMinimum: commitment.ratioMinimum,
        ratioMaximum: commitment.ratioMaximum,
        reservationStatus: reservationStatus({ reservedCents, committedCents, blockers }),
        blockerCodes: blockers,
      };
    }),
    matchedSideAUsd: preview.matchedBaselineUsd,
    matchedSideBUsd: preview.matchedCounterpartyUsd,
    compromiseTotalUsd: preview.compromiseTotalUsd,
    unmatchedSideAUsd: preview.unmatchedBaselineUsd,
    unmatchedSideBUsd: preview.unmatchedCounterpartyUsd,
    assuranceMinimumUsd: assuranceTarget,
    assuranceReached,
    atomicSettlementGroup: {
      id: `atomic-settlement-preview:${poolId}`,
      status,
      requiredParticipantCount: participantCount,
      finalConfirmationCount: 0,
      allOrNone: true,
      captureAllowed: false,
      relianceBearing: false,
      blockerCodes,
    },
    finalLockProposal: {
      id: `final-lock-proposal-preview:${poolId}`,
      status: proposalStatus,
      exactMatchedSideAUsd: preview.matchedBaselineUsd,
      exactMatchedSideBUsd: preview.matchedCounterpartyUsd,
      exactCompromiseDestinationUsd: preview.compromiseTotalUsd,
      clearingRatio: formatDonationOffsetRatio(normalizedRatio),
      destinationLabel,
      evidenceStandard: formatDonationOffsetVerificationMethod(verificationMethod),
      deadlineLabel: assuranceDeadline
        ? new Date(assuranceDeadline).toLocaleDateString("en-US")
        : "No deadline configured",
      requiredFreshConfirmations: participantCount,
      noCapture: true,
      createsPaymentCapture: false,
      relianceBearing: false,
      blockerCodes,
    },
    userFacingBlockers: blockerCodes.map((code) => {
      switch (code) {
        case "missing_counterparty_side":
          return "The batch needs active commitments on both sides before it can lock.";
        case "clearing_ratio_outside_participant_bounds":
          return "At least one participant's ratio bounds do not accept this clearing ratio.";
        case "assurance_threshold_not_met":
          return "The matched compromise amount has not reached the pool assurance threshold.";
        case "assurance_deadline_closed":
          return "The assurance deadline has closed, so this batch cannot lock without review.";
        default:
          return "This batch remains preview-only until review clears the blocker.";
      }
    }),
  };
}

export function buildDemoDonationOffsetBatchClearingDryRun() {
  return buildDonationOffsetBatchClearingDryRun({
    poolId: "demo-offset-pool-common-ground",
    poolName: "Demo common-ground offset pool",
    offsetRatio: 1,
    assuranceMinimumUsd: 1_000,
    assuranceDeadline: "2026-07-31T23:59:59.000Z",
    destinationLabel: "GiveWell Top Charities Fund",
    verificationMethod: "proof_of_past_donations",
    commitments: [
      {
        id: "demo-side-a-global-health-redirect",
        participantLabel: "2 Side A commitments",
        side: "side_a",
        amountUsd: 600,
        ratioMinimum: 0.8,
        ratioMaximum: 1.25,
        status: "active",
      },
      {
        id: "demo-side-a-climate-redirect",
        participantLabel: "1 Side A commitment",
        side: "side_a",
        amountUsd: 400,
        ratioMinimum: 1,
        ratioMaximum: 1,
        status: "active",
      },
      {
        id: "demo-side-b-animal-welfare-redirect",
        participantLabel: "2 Side B commitments",
        side: "side_b",
        amountUsd: 700,
        ratioMinimum: 0.75,
        ratioMaximum: 1.25,
        status: "active",
      },
      {
        id: "demo-side-b-longtermist-redirect",
        participantLabel: "1 Side B commitment",
        side: "side_b",
        amountUsd: 300,
        ratioMinimum: 1,
        ratioMaximum: 1,
        status: "active",
      },
    ],
    now: new Date("2026-06-07T12:00:00.000Z"),
  });
}

export function formatDonationOffsetPoolStatus(value: DonationOffsetPoolProgress["status"]) {
  switch (value) {
    case "assurance_met":
      return "Assurance threshold reached";
    case "assurance_pending":
      return "Gathering matching commitments";
    case "closed":
      return "Deadline closed";
    default:
      return "Open";
  }
}

export function validateDonationOffsetFields(fields: DonationOffsetFields) {
  const errors: string[] = [];

  if (!(normalizeUsdAmount(fields.baselineAmountUsd) && (fields.baselineAmountUsd ?? 0) > 0)) {
    errors.push("Baseline donation amount must be a positive number.");
  }

  if (!fields.baselineOpposedCause.trim()) {
    errors.push("Baseline opposed cause is required.");
  }

  if (
    !(normalizeUsdAmount(fields.requestedMatchingAmountUsd) &&
      (fields.requestedMatchingAmountUsd ?? 0) > 0)
  ) {
    errors.push("Requested matching donation must be a positive number.");
  }

  if (!fields.requestedOpposedCause.trim()) {
    errors.push("Requested opposing cause is required.");
  }

  if (!findRegisteredCharityById(fields.compromiseDestinationId)) {
    errors.push("Choose a valid compromise destination.");
  }

  if (!fields.offsetRatio || !Number.isFinite(fields.offsetRatio) || fields.offsetRatio <= 0) {
    errors.push("Offset ratio must be a positive number.");
  }

  if (fields.offsetRatio && fields.offsetRatio > 100) {
    errors.push("Offset ratio must be within a rational range.");
  }

  if (fields.participationMode === "pool") {
    if (!fields.poolSide) {
      errors.push("Choose which side of the offset pool you are joining.");
    }

    if (!fields.poolId.trim() && !fields.poolName.trim()) {
      errors.push("Choose an existing pool or name a new offset pool.");
    }

    if (!fields.assuranceDeadline.trim()) {
      errors.push("Pool offsets should include an assurance deadline.");
    } else if (Number.isNaN(Date.parse(fields.assuranceDeadline))) {
      errors.push("Assurance deadline must be a valid date.");
    }

    const assuranceMinimumUsd = normalizeUsdThreshold(fields.assuranceMinimumUsd);
    if (fields.assuranceMinimumUsd === null || assuranceMinimumUsd === null) {
      errors.push("Assurance minimum threshold is required for pooled offsets.");
    }

    const poolMaximumCapUsd = normalizeUsdAmount(fields.poolMaximumCapUsd);
    if (!poolMaximumCapUsd) {
      errors.push("Pool maximum cap must be a positive number.");
    } else if (assuranceMinimumUsd !== null && assuranceMinimumUsd > poolMaximumCapUsd) {
      errors.push("Pool maximum cap must be at least as large as the assurance minimum.");
    }
  }

  if (!fields.description.trim()) {
    errors.push("Add a short description of the offset.");
  }

  return errors;
}

export function validateDonationOffsetSubmissionGuards(
  fields: DonationOffsetSubmissionGuards,
) {
  const errors: string[] = [];

  if (fields.participationMode !== "pool") {
    return errors;
  }

  if (!fields.antiThreatCertification) {
    errors.push(
      "Pooled offsets require anti-threat certification before submission.",
    );
  }

  if (!fields.verificationMetadataAcknowledged || !fields.evidenceUrl.trim()) {
    errors.push(
      "Pooled offsets require verification metadata and a reviewable evidence link before submission.",
    );
  }

  return errors;
}

export function assessDonationOffsetModeration(
  fields: DonationOffsetFields,
  charity = findRegisteredCharityById(fields.compromiseDestinationId),
): DonationOffsetModerationAssessment {
  const reasons: string[] = [];

  if (charity?.isPoliticalCampaign) {
    return {
      status: "blocked",
      reasons: ["Offsets involving political campaign contributions are prohibited."],
    };
  }

  if (!charity || !charity.isActive) {
    return {
      status: "blocked",
      reasons: ["The compromise destination is not an approved registered charity on this platform."],
    };
  }

  for (const blockedPattern of blockedOffsetPatterns) {
    if (
      blockedPattern.pattern.test(
        [
          fields.baselineOpposedCause,
          fields.requestedOpposedCause,
          fields.poolName,
          fields.description,
        ].join("\n"),
      )
    ) {
      return {
        status: "blocked",
        reasons: [blockedPattern.label],
      };
    }
  }

  if (!fields.evidenceUrl.trim()) {
    reasons.push(
      "No proof of past donation, third-party payment confirmation, or third-party audit link was provided, so the baseline intent is not yet credible enough for public publication.",
    );
  }

  if (fields.participationMode === "pool" && !fields.poolSide) {
    reasons.push("Pool participation must name a side before the offset can be reviewed.");
  }

  if (fields.participationMode === "pool" && !fields.poolId.trim() && !fields.poolName.trim()) {
    reasons.push("Pool participation must either choose an existing pool or create a named pool.");
  }

  if (fields.participationMode === "pool" && !fields.assuranceDeadline.trim()) {
    reasons.push("Pool participation should include an assurance deadline.");
  }

  return {
    status: reasons.length ? "flagged" : "clear",
    reasons,
  };
}
