export const PUBLIC_RECEIPT_CARD_POLICY_VERSION =
  "public-receipt-card-policy-v0.1-2026-06";
export const PUBLIC_RECEIPT_CARD_VALIDATOR_VERSION =
  "public-receipt-card-validator-v0.1";
export const PUBLIC_RECEIPT_CARD_CONTRACT_VERSION =
  "public-receipt-card-contract-v0.1-2026-06";
export const PUBLIC_RECEIPT_CARD_CONTRACT_VALIDATOR_VERSION =
  "public-receipt-card-contract-validator-v0.1";

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

export interface PublicReceiptCardContract {
  version: typeof PUBLIC_RECEIPT_CARD_CONTRACT_VERSION;
  policyVersion: typeof PUBLIC_RECEIPT_CARD_POLICY_VERSION;
  purpose: string;
  firstClassRecordTables: string[];
  claimKinds: PublicReceiptClaimKind[];
  visibilityStates: PublicReceiptVisibility[];
  correctionStatuses: PublicReceiptCorrectionStatus[];
  causalWordingStates: PublicReceiptCausalWording[];
  reviewStates: PublicReceiptReviewState[];
  personalContributionStates: PublicReceiptPersonalContributionState[];
  claimHygieneRules: string[];
  defaultPublicationControls: PublicReceiptPublicationControls;
  requiredPublicFields: string[];
  prohibitedPublicSignals: string[];
  samplePreviews: PublicReceiptCardPreview[];
  contractTests: string[];
}

export interface PublicReceiptCardContractValidation {
  status: "pass" | "fail";
  validatorName: "public-receipt-card-contract";
  validatorVersion: typeof PUBLIC_RECEIPT_CARD_CONTRACT_VALIDATOR_VERSION;
  contractVersion: typeof PUBLIC_RECEIPT_CARD_CONTRACT_VERSION;
  blockers: string[];
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
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

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): PublicReceiptCardContractValidation["checks"][number] {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
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

const DEFAULT_PUBLICATION_CONTROLS: PublicReceiptPublicationControls = {
  affectsMatchingOrReview: false,
  currentStatus: "current",
  issuedAt: "2026-06-25T00:00:00.000Z",
  profileOrSearchBoost: false,
  publicEngagementCounters: false,
  publicationRequiredAsTradeTerm: false,
  recommendationOrPriorityBoost: false,
  sidecarOnly: true,
};

const SAMPLE_PUBLIC_RECEIPT_DRAFTS: PublicReceiptCardDraft[] = [
  {
    claimCopy:
      "Participant reports a reviewed donation-offset completion with a trade-conditioned contribution shown below.",
    claimKind: "donation_offset",
    contributionSummary: {
      baselineAdditionalityReview: "missing",
      causalWording: "trade_conditioned",
      counterfactualTrustReview: "missing",
      impactClaimReview: "missing",
      personalContribution: "$100 verified personal direct donation",
      personalContributionState: "verified_new",
      totalVerifiedRecipientTransfer: "$200 total verified recipient transfer",
      tradeConditionedContribution:
        "$100 verified trade-conditioned counterparty donation",
    },
    correctionStatus: "none",
    directDonationParityNote:
      "Direct donation remains at parity; Moral Trade does not prefer this route over giving directly.",
    evidenceLevel: "receipt_reviewed",
    netAttributionNote:
      "Net attribution separates personal contribution, trade-conditioned contribution, and total verified recipient transfer.",
    participantOptIn: true,
    publicationControls: DEFAULT_PUBLICATION_CONTROLS,
    publicActionSummary: "Reviewed donation-offset receipt",
    receiptId: "public-receipt-contract-sample-offset",
    reviewed: true,
    sensitiveActionRedacted: true,
    title: "Reviewed offset receipt",
    verificationUrl:
      "/api/moral-trade/public-receipts/public-receipt-contract-sample-offset/verify",
    visibility: "opt_in_public",
  },
  {
    claimCopy:
      "Participant reports a reviewed trade-unlocked contribution after baseline, counterfactual, and impact-claim review.",
    claimKind: "donation_offset",
    contributionSummary: {
      baselineAdditionalityReview: "passed",
      causalWording: "trade_unlocked",
      counterfactualTrustReview: "passed",
      impactClaimReview: "passed",
      personalContribution: "$25 verified personal direct donation",
      personalContributionState: "verified_new",
      totalVerifiedRecipientTransfer: "$50 total verified recipient transfer",
      tradeConditionedContribution:
        "$25 verified trade-conditioned counterparty donation",
      tradeUnlockedContribution:
        "$25 reviewed trade-unlocked counterparty donation",
    },
    correctionStatus: "none",
    directDonationParityNote:
      "Direct donation parity is optional and non-preferential; it does not affect matching, review, or access.",
    evidenceLevel: "receipt_reviewed",
    netAttributionNote:
      "Net personal contribution excludes reimbursements, subsidies, refunds, and counterparty-funded amounts.",
    participantOptIn: true,
    publicationControls: DEFAULT_PUBLICATION_CONTROLS,
    publicActionSummary:
      "Reviewed stronger causal wording receipt with current verification status",
    receiptId: "public-receipt-contract-sample-unlocked",
    reviewed: true,
    sensitiveActionRedacted: true,
    title: "Reviewed causal wording receipt",
    verificationUrl:
      "/api/moral-trade/public-receipts/public-receipt-contract-sample-unlocked/verify",
    visibility: "opt_in_public",
  },
  {
    claimCopy:
      "Participant reports a verified micro-pledge completed with the public action details kept generic.",
    claimKind: "pledge_swap",
    contributionSummary: {
      baselineAdditionalityReview: "missing",
      causalWording: "trade_conditioned",
      counterfactualTrustReview: "missing",
      impactClaimReview: "missing",
      personalContribution: "Personal action details are redacted in public display.",
      personalContributionState: "suppressed_uncertain",
      totalVerifiedRecipientTransfer: "$20 total verified recipient transfer",
      tradeConditionedContribution: "$20 verified trade-conditioned transfer",
    },
    correctionStatus: "none",
    directDonationParityNote:
      "Direct donation parity is not required, not preselected, and creates no preference.",
    evidenceLevel: "self_attestation",
    netAttributionNote:
      "Net attribution is qualified because personal behavior details are suppressed.",
    participantOptIn: true,
    publicationControls: DEFAULT_PUBLICATION_CONTROLS,
    publicActionSummary: "Verified micro-pledge completed",
    receiptId: "public-receipt-contract-sample-pledge",
    reviewed: true,
    sensitiveActionRedacted: true,
    title: "Reviewed micro-pledge receipt",
    verificationUrl:
      "/api/moral-trade/public-receipts/public-receipt-contract-sample-pledge/verify",
    visibility: "opt_in_public",
  },
];

const CLAIM_HYGIENE_RULES = [
  "trade_conditioned_wording_default",
  "trade_unlocked_requires_reviewed_causal_support",
  "net_personal_contribution_separated",
  "direct_donation_parity_non_preferential",
  "no_public_moral_rank_or_platform_endorsement",
  "no_engagement_counters_or_priority_effects",
  "verification_url_current_status_required",
  "correction_revocation_state_required",
  "sensitive_action_redaction_required",
  "publication_sidecar_only",
];

const PROHIBITED_PUBLIC_SIGNALS = [
  "likes",
  "reactions",
  "share_counts",
  "streaks",
  "leaderboards",
  "moral_scores",
  "public_ranks",
  "profile_boosts",
  "search_boosts",
  "matching_priority",
  "review_priority",
  "recommendation_ranking",
];

export function getPublicReceiptCardContract(): PublicReceiptCardContract {
  const samplePreviews = SAMPLE_PUBLIC_RECEIPT_DRAFTS.map((draft) =>
    buildPublicReceiptCardPreview(draft),
  );

  return {
    version: PUBLIC_RECEIPT_CARD_CONTRACT_VERSION,
    policyVersion: PUBLIC_RECEIPT_CARD_POLICY_VERSION,
    purpose:
      "Public receipt card policy contract for opt-in, sidecar-only, claim-hygienic receipt previews and publication checks after non-public-goods Moral Trade completion.",
    firstClassRecordTables: [
      "moral_trade_public_receipt_cards",
      "moral_trade_public_receipt_claim_reviews",
      "moral_trade_public_receipt_publication_controls",
      "moral_trade_public_receipt_corrections",
      "moral_trade_public_receipt_verification_events",
    ],
    claimKinds: ["donation_offset", "pledge_swap"],
    visibilityStates: ["private_preview", "opt_in_public", "revoked"],
    correctionStatuses: ["none", "correction_requested", "corrected", "revoked"],
    causalWordingStates: ["trade_conditioned", "trade_unlocked"],
    reviewStates: ["passed", "not_required_for_stage", "missing", "blocked", "stale"],
    personalContributionStates: [
      "verified_new",
      "verified_already_counted",
      "ordinary_verified_not_parity",
      "suppressed_uncertain",
    ],
    claimHygieneRules: CLAIM_HYGIENE_RULES,
    defaultPublicationControls: DEFAULT_PUBLICATION_CONTROLS,
    requiredPublicFields: [
      "receiptId",
      "title",
      "claimKind",
      "visibility",
      "verificationUrl",
      "correctionStatus",
      "contributionSummary.personalContribution",
      "contributionSummary.tradeConditionedContribution",
      "contributionSummary.totalVerifiedRecipientTransfer",
      "directDonationParityNote",
      "netAttributionNote",
    ],
    prohibitedPublicSignals: PROHIBITED_PUBLIC_SIGNALS,
    samplePreviews,
    contractTests: [
      "src/lib/moral-trade/public-receipt-cards.test.ts",
      "src/lib/moral-trade/public-receipt-route.test.ts",
      "src/app/api/moral-trade/public-receipts/contract/route.ts",
      "src/app/api/moral-trade/public-receipts/[receiptId]/verify/route.ts",
    ],
  };
}

export function validatePublicReceiptCardContract(
  contract: PublicReceiptCardContract = getPublicReceiptCardContract(),
): PublicReceiptCardContractValidation {
  const checks = [
    check(
      "first-class-records",
      "Receipt cards, claim reviews, publication controls, corrections, and verification events are first-class",
      [
        "moral_trade_public_receipt_cards",
        "moral_trade_public_receipt_claim_reviews",
        "moral_trade_public_receipt_publication_controls",
        "moral_trade_public_receipt_corrections",
        "moral_trade_public_receipt_verification_events",
      ].every((table) => contract.firstClassRecordTables.includes(table)),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "claim-hygiene-rules",
      "Contract covers causal wording, net attribution, parity, sidecar, verification, and anti-gamification rules",
      CLAIM_HYGIENE_RULES.every((rule) => contract.claimHygieneRules.includes(rule)),
      contract.claimHygieneRules.join(", "),
    ),
    check(
      "publication-controls",
      "Default publication controls cannot affect matching, review, engagement, ranking, or trade terms",
      contract.defaultPublicationControls.sidecarOnly &&
        !contract.defaultPublicationControls.affectsMatchingOrReview &&
        !contract.defaultPublicationControls.publicEngagementCounters &&
        !contract.defaultPublicationControls.profileOrSearchBoost &&
        !contract.defaultPublicationControls.publicationRequiredAsTradeTerm &&
        !contract.defaultPublicationControls.recommendationOrPriorityBoost,
      JSON.stringify(contract.defaultPublicationControls),
    ),
    check(
      "sample-previews-pass",
      "Sample public receipt previews satisfy the fail-closed card validator",
      contract.samplePreviews.every((preview) => preview.validation.status === "pass"),
      contract.samplePreviews
        .map((preview) => `${preview.receiptId}:${preview.validation.status}`)
        .join(", "),
    ),
    check(
      "prohibited-public-signals",
      "Receipt publication cannot create engagement or moral-status infrastructure",
      [
        "likes",
        "leaderboards",
        "moral_scores",
        "matching_priority",
        "review_priority",
        "recommendation_ranking",
      ].every((signal) => contract.prohibitedPublicSignals.includes(signal)),
      contract.prohibitedPublicSignals.join(", "),
    ),
    check(
      "contract-tests",
      "Contract and verification route tests are named",
      [
        "src/lib/moral-trade/public-receipt-cards.test.ts",
        "src/lib/moral-trade/public-receipt-route.test.ts",
        "src/app/api/moral-trade/public-receipts/contract/route.ts",
        "src/app/api/moral-trade/public-receipts/[receiptId]/verify/route.ts",
      ].every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "public-receipt-card-contract",
    validatorVersion: PUBLIC_RECEIPT_CARD_CONTRACT_VALIDATOR_VERSION,
    contractVersion: contract.version,
    blockers,
    checks,
  };
}
