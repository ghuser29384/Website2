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
export type DonationOffsetDonorOfRecordGateStatus =
  | "pass"
  | "needs_input"
  | "human_review"
  | "blocked";
export type DonationOffsetPaymentDestinationGateStatus =
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
