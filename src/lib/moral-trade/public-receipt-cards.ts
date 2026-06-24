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

export interface PublicReceiptCardDraft {
  claimCopy: string;
  claimKind: PublicReceiptClaimKind;
  correctionStatus: PublicReceiptCorrectionStatus;
  directDonationParityNote: string;
  evidenceLevel: "self_attestation" | "receipt_reviewed" | "witness_attested";
  netAttributionNote: string;
  participantOptIn: boolean;
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
  correctionStatus: PublicReceiptCorrectionStatus;
  directDonationParityNote: string;
  evidenceLevel: PublicReceiptCardDraft["evidenceLevel"];
  netAttributionNote: string;
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
const GAMIFICATION_PATTERN = /(leaderboard|rank #?\d+|points|badge streak|achievement unlocked|scoreboard)/i;

function isSafeVerificationUrl(value: string) {
  return /^https:\/\/[^\s]+$/i.test(value) || /^\/api\/moral-trade\/public-receipts\/[a-z0-9-]+\/verify$/i.test(value);
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
  }

  if (!/direct donation/i.test(draft.directDonationParityNote) || !/not prefer|no preference|parity/i.test(draft.directDonationParityNote)) {
    blockers.push("direct_donation_parity_note_required");
  }

  if (!/net/i.test(draft.netAttributionNote)) {
    blockers.push("net_attribution_note_required");
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
    correctionStatus: draft.correctionStatus,
    directDonationParityNote: draft.directDonationParityNote,
    evidenceLevel: draft.evidenceLevel,
    netAttributionNote: draft.netAttributionNote,
    publicActionSummary: draft.publicActionSummary,
    receiptId: draft.receiptId,
    title: draft.title,
    validation: validatePublicReceiptCardDraft(draft),
    verificationUrl: draft.verificationUrl,
    visibility: draft.visibility,
  };
}
