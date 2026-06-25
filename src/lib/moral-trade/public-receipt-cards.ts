export const PUBLIC_RECEIPT_CARD_POLICY_VERSION =
  "public-receipt-card-policy-v0.1-2026-06";
export const PUBLIC_RECEIPT_CARD_VALIDATOR_VERSION =
  "public-receipt-card-validator-v0.1";

export type PublicReceiptClaimKind = "donation_offset" | "pledge_swap";
export type PublicReceiptVisibility = "private_preview" | "opt_in_public" | "revoked";
export type PublicReceiptCorrectionStatus =
  | "none"
  | "correction_requested"
  | "corrected"
  | "revoked";
export type PublicReceiptCausalWording = "trade_conditioned" | "trade_unlocked";
export type PublicReceiptReviewState = "passed" | "not_required_for_stage" | "missing" | "blocked" | "stale";
export type PublicReceiptPersonalContributionState =
  | "verified_new"
  | "verified_already_counted"
  | "ordinary_verified_not_parity"
  | "suppressed_uncertain";

export interface PublicReceiptContributionSummary {
  causalWording: PublicReceiptCausalWording;
  counterfactualTrustReview: PublicReceiptReviewState;
  impactClaimReview: PublicReceiptReviewState;
  baselineAdditionalityReview: PublicReceiptReviewState;
  personalContribution: string;
  personalContributionState: PublicReceiptPersonalContributionState;
  totalVerifiedRecipientTransfer: string;
  tradeConditionedContribution: string;
  tradeUnlockedContribution?: string;
}

export interface PublicReceiptPublicationControls {
  currentStatus: "current" | "corrected" | "revoked" | "superseded";
  issuedAt: string;
  publicationRequiredAsTradeTerm: boolean;
  affectsMatchingOrReview: boolean;
  publicEngagementCounters: boolean;
  profileOrSearchBoost: boolean;
  recommendationOrPriorityBoost: boolean;
  sidecarOnly: boolean;
}

export interface PublicReceiptCardDraft {
  claimCopy: string;
  claimKind: PublicReceiptClaimKind;
  contributionSummary: PublicReceiptContributionSummary;
  correctionStatus: PublicReceiptCorrectionStatus;
  directDonationParityNote: string;
  evidenceLevel: "self_attestation" | "receipt_reviewed" | "witness_attested";
  netAttributionNote: string;
  participantOptIn: boolean;
  publicationControls: PublicReceiptPublicationControls;
  publicActionSummary: string;
  receiptId: string;
  reviewed: boolean;
  sensitiveActionRedacted: boolean;
  title: string;
  verificationUrl: string;
  visibility: PublicReceiptVisibility;
}

export interface PublicReceiptCardValidation {
  blockers: string[];
  policyVersion: typeof PUBLIC_RECEIPT_CARD_POLICY_VERSION;
  status: "pass" | "fail";
  validatorVersion: typeof PUBLIC_RECEIPT_CARD_VALIDATOR_VERSION;
}

export interface PublicReceiptCardPreview {
  claimCopy: string;
  claimKind: PublicReceiptClaimKind;
  contributionSummary: PublicReceiptContributionSummary;
  correctionStatus: PublicReceiptCorrectionStatus;
  directDonationParityNote: string;
  evidenceLevel: PublicReceiptCardDraft["evidenceLevel"];
  netAttributionNote: string;
  publicationControls: PublicReceiptPublicationControls;
  publicActionSummary: string;
  receiptId: string;
  title: string;
  validation: PublicReceiptCardValidation;
  verificationUrl: string;
  visibility: PublicReceiptVisibility;
}

const PRIVATE_TOKEN_PATTERN =
  /(email|phone|contact|private note|raw evidence|source note|exact wish|counterparty message|receipt url)/i;
const ENDORSEMENT_PATTERN =
  /(objective moral value|morally superior|platform endorses|official endorsement|proves this cause is better)/i;
const GAMIFICATION_PATTERN =
  /(leaderboard|rank #?\d+|points|badge streak|achievement unlocked|scoreboard|like count|reaction count|share count|public streak|profile boost|search boost|matching priority|review priority|recommendation ranking)/i;
const STRONG_CAUSAL_WORDING_PATTERN = /\b(trade-unlocked|unlocked|additional|additionality)\b/i;

function isSafeVerificationUrl(value: string) {
  return /^https:\/\/[^\s]+$/i.test(value) || /^\/api\/moral-trade\/public-receipts\/[a-z0-9-]+\/verify$/i.test(value);
}

function hasText(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function isPassedReviewState(value: PublicReceiptReviewState) {
  return value === "passed";
}

export function validatePublicReceiptCardDraft(
  draft: PublicReceiptCardDraft,
): PublicReceiptCardValidation {
  const serialized = JSON.stringify(draft);
  const blockers: string[] = [];

  if (draft.visibility === "opt_in_public") {
    if (!draft.participantOptIn) blockers.push("participant_opt_in_required");
    if (!draft.reviewed) blockers.push("review_required_before_publication");
    if (!isSafeVerificationUrl(draft.verificationUrl)) blockers.push("verification_url_required");
    if (!draft.sensitiveActionRedacted) blockers.push("sensitive_action_redaction_required");
    if (draft.correctionStatus === "revoked" || draft.publicationControls.currentStatus === "revoked") {
      blockers.push("revoked_receipt_cannot_publish");
    }
  }

  if (!/direct donation/i.test(draft.directDonationParityNote) || !/not prefer|no preference|parity/i.test(draft.directDonationParityNote)) {
    blockers.push("direct_donation_parity_note_required");
  }

  if (!/net/i.test(draft.netAttributionNote)) {
    blockers.push("net_attribution_note_required");
  }

  if (!hasText(draft.contributionSummary.personalContribution)) blockers.push("personal_contribution_line_required");
  if (!hasText(draft.contributionSummary.tradeConditionedContribution)) {
    blockers.push("trade_conditioned_contribution_line_required");
  }
  if (!hasText(draft.contributionSummary.totalVerifiedRecipientTransfer)) {
    blockers.push("total_verified_recipient_transfer_line_required");
  }

  if (draft.contributionSummary.causalWording === "trade_unlocked") {
    if (
      !isPassedReviewState(draft.contributionSummary.baselineAdditionalityReview) ||
      !isPassedReviewState(draft.contributionSummary.counterfactualTrustReview) ||
      !isPassedReviewState(draft.contributionSummary.impactClaimReview) ||
      !hasText(draft.contributionSummary.tradeUnlockedContribution)
    ) {
      blockers.push("trade_unlocked_requires_reviewed_causal_support");
    }
  } else if (
    STRONG_CAUSAL_WORDING_PATTERN.test(draft.claimCopy) ||
    STRONG_CAUSAL_WORDING_PATTERN.test(draft.publicActionSummary) ||
    STRONG_CAUSAL_WORDING_PATTERN.test(draft.contributionSummary.tradeConditionedContribution)
  ) {
    blockers.push("unsupported_causal_wording");
  }

  if (
    draft.contributionSummary.personalContributionState === "verified_already_counted" &&
    !/already counted|excluded from parity|independently made/i.test(draft.directDonationParityNote)
  ) {
    blockers.push("personal_contribution_reuse_disclosure_required");
  }

  if (
    draft.contributionSummary.personalContributionState === "suppressed_uncertain" &&
    !/uncertain|qualified|suppressed|omitted/i.test(draft.netAttributionNote)
  ) {
    blockers.push("uncertain_personal_contribution_must_be_qualified");
  }

  if (!draft.publicationControls.sidecarOnly) blockers.push("publication_must_be_sidecar_only");
  if (draft.publicationControls.publicationRequiredAsTradeTerm) {
    blockers.push("publication_as_trade_term_blocked");
  }
  if (draft.publicationControls.affectsMatchingOrReview) {
    blockers.push("receipt_publication_marketplace_priority_blocked");
  }
  if (draft.publicationControls.publicEngagementCounters) {
    blockers.push("public_engagement_counters_blocked");
  }
  if (draft.publicationControls.profileOrSearchBoost) {
    blockers.push("profile_or_search_boost_blocked");
  }
  if (draft.publicationControls.recommendationOrPriorityBoost) {
    blockers.push("recommendation_or_priority_boost_blocked");
  }
  if (Number.isNaN(Date.parse(draft.publicationControls.issuedAt))) {
    blockers.push("issued_at_required");
  }

  if (PRIVATE_TOKEN_PATTERN.test(serialized)) blockers.push("private_field_leakage");
  if (ENDORSEMENT_PATTERN.test(draft.claimCopy)) blockers.push("objective_moral_endorsement_claim");
  if (GAMIFICATION_PATTERN.test(draft.claimCopy) || GAMIFICATION_PATTERN.test(draft.title)) {
    blockers.push("gamification_or_ranking_claim");
  }

  return {
    blockers,
    policyVersion: PUBLIC_RECEIPT_CARD_POLICY_VERSION,
    status: blockers.length ? "fail" : "pass",
    validatorVersion: PUBLIC_RECEIPT_CARD_VALIDATOR_VERSION,
  };
}

export function buildPublicReceiptCardPreview(
  draft: PublicReceiptCardDraft,
): PublicReceiptCardPreview {
  return {
    claimCopy: draft.claimCopy,
    claimKind: draft.claimKind,
    contributionSummary: draft.contributionSummary,
    correctionStatus: draft.correctionStatus,
    directDonationParityNote: draft.directDonationParityNote,
    evidenceLevel: draft.evidenceLevel,
    netAttributionNote: draft.netAttributionNote,
    publicationControls: draft.publicationControls,
    publicActionSummary: draft.publicActionSummary,
    receiptId: draft.receiptId,
    title: draft.title,
    validation: validatePublicReceiptCardDraft(draft),
    verificationUrl: draft.verificationUrl,
    visibility: draft.visibility,
  };
}
