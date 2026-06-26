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
export type PublicReceiptReviewState =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "blocked"
  | "stale";
export type PublicReceiptPublicationGateKey =
  | "reconciliation"
  | "challenge_window"
  | "privacy_publication"
  | "recipient_acceptance_adverse_association"
  | "content_moderation"
  | "public_metric_release";
export type PublicReceiptPublicationGateState =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "blocked"
  | "stale";
export type PublicReceiptPersonalContributionState =
  | "verified_new"
  | "verified_already_counted"
  | "ordinary_verified_not_parity"
  | "suppressed_uncertain";
export type PublicReceiptNetPersonalAttributionState =
  | "verified_net_personal"
  | "disclosed_partial_reimbursement"
  | "disclosed_subsidy_or_match"
  | "uncertain_qualified"
  | "disputed_blocked"
  | "suppressed";
export type PublicReceiptSensitiveActionDisplayMode =
  | "generic_action_label"
  | "transfer_only"
  | "exact_action_details";
export type PublicReceiptClaimReviewKey =
  | "verified"
  | "recipient_transfer"
  | "trade_conditioned"
  | "trade_unlocked"
  | "additional"
  | "matched"
  | "completed"
  | "impact"
  | "personal_contribution"
  | "direct_donation_parity";

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

export interface PublicReceiptSensitiveActionDisclosureControls {
  displayMode: PublicReceiptSensitiveActionDisplayMode;
  separatePublicActionDisclosureConsent: boolean;
  privacyReviewState: PublicReceiptPublicationGateState;
  autonomyReviewState: PublicReceiptPublicationGateState;
  contentModerationReviewState: PublicReceiptPublicationGateState;
}

export interface PublicReceiptDirectDonationParityControls {
  modeOffered: boolean;
  participantOptIn: boolean;
  preselected: boolean;
  requiredForReceiptPublication: boolean;
  framedAsMoralUpgrade: boolean;
  affectsMatchingPriority: boolean;
  affectsReviewPriority: boolean;
  affectsEligibility: boolean;
  affectsPublicSearchOrdering: boolean;
  affectsProfileProminence: boolean;
  affectsFutureMarketplaceAccess: boolean;
}

export interface PublicReceiptNetAttributionControls {
  grossPersonalTransfer: string;
  knownReimbursementOrSubsidy: string;
  sideBenefitDisclosure: string;
  netPersonalContribution: string;
  attributionState: PublicReceiptNetPersonalAttributionState;
  tradeConditionedFundsExcluded: boolean;
  tradeUnlockedFundsExcluded: boolean;
  sponsorSubsidiesExcluded: boolean;
  employerMatchesExcluded: boolean;
  donorAdvisedFundCreditsExcluded: boolean;
  refundsExcluded: boolean;
  counterpartyReimbursementsExcluded: boolean;
}

export interface PublicReceiptCardDraft {
  claimReviewStates: Partial<Record<PublicReceiptClaimReviewKey, PublicReceiptReviewState>>;
  claimCopy: string;
  claimKind: PublicReceiptClaimKind;
  contributionSummary: PublicReceiptContributionSummary;
  correctionStatus: PublicReceiptCorrectionStatus;
  directDonationParityControls: PublicReceiptDirectDonationParityControls;
  directDonationParityNote: string;
  evidenceLevel: "self_attestation" | "receipt_reviewed" | "witness_attested";
  netAttributionControls: PublicReceiptNetAttributionControls;
  netAttributionNote: string;
  participantOptIn: boolean;
  publicationGateStates: Record<
    PublicReceiptPublicationGateKey,
    PublicReceiptPublicationGateState
  >;
  publicationControls: PublicReceiptPublicationControls;
  publicActionSummary: string;
  receiptId: string;
  reviewed: boolean;
  sensitiveActionRedacted: boolean;
  sensitiveActionDisclosure: PublicReceiptSensitiveActionDisclosureControls;
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
  claimReviewStates: Partial<Record<PublicReceiptClaimReviewKey, PublicReceiptReviewState>>;
  claimCopy: string;
  claimKind: PublicReceiptClaimKind;
  contributionSummary: PublicReceiptContributionSummary;
  correctionStatus: PublicReceiptCorrectionStatus;
  directDonationParityControls: PublicReceiptDirectDonationParityControls;
  directDonationParityNote: string;
  evidenceLevel: PublicReceiptCardDraft["evidenceLevel"];
  netAttributionControls: PublicReceiptNetAttributionControls;
  netAttributionNote: string;
  publicationGateStates: Record<
    PublicReceiptPublicationGateKey,
    PublicReceiptPublicationGateState
  >;
  publicationControls: PublicReceiptPublicationControls;
  publicActionSummary: string;
  receiptId: string;
  sensitiveActionDisclosure: PublicReceiptSensitiveActionDisclosureControls;
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
  claimReviewKeys: PublicReceiptClaimReviewKey[];
  publicationGateKeys: PublicReceiptPublicationGateKey[];
  publicationGateStates: PublicReceiptPublicationGateState[];
  personalContributionStates: PublicReceiptPersonalContributionState[];
  netPersonalAttributionStates: PublicReceiptNetPersonalAttributionState[];
  sensitiveActionDisplayModes: PublicReceiptSensitiveActionDisplayMode[];
  claimHygieneRules: string[];
  defaultPublicationControls: PublicReceiptPublicationControls;
  defaultDirectDonationParityControls: PublicReceiptDirectDonationParityControls;
  netAttributionExclusionControls: Array<keyof Pick<
    PublicReceiptNetAttributionControls,
    | "tradeConditionedFundsExcluded"
    | "tradeUnlockedFundsExcluded"
    | "sponsorSubsidiesExcluded"
    | "employerMatchesExcluded"
    | "donorAdvisedFundCreditsExcluded"
    | "refundsExcluded"
    | "counterpartyReimbursementsExcluded"
  >>;
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
const EXACT_SENSITIVE_ACTION_PATTERN =
  /\b(no[- ]?meat|meat[- ]?free|vegetarian|vegan|diet|fasting|calorie|weight[- ]?loss|medical diet|religious|political|family|lifestyle)\b/i;

export const PUBLIC_RECEIPT_CLAIM_REVIEW_KEYS: PublicReceiptClaimReviewKey[] = [
  "verified",
  "recipient_transfer",
  "trade_conditioned",
  "trade_unlocked",
  "additional",
  "matched",
  "completed",
  "impact",
  "personal_contribution",
  "direct_donation_parity",
];

export const PUBLIC_RECEIPT_REQUIRED_PUBLICATION_GATES: PublicReceiptPublicationGateKey[] = [
  "reconciliation",
  "challenge_window",
  "privacy_publication",
  "recipient_acceptance_adverse_association",
  "content_moderation",
  "public_metric_release",
];

const PUBLIC_RECEIPT_GATE_STATES: PublicReceiptPublicationGateState[] = [
  "passed",
  "not_required_for_stage",
  "missing",
  "under_review",
  "blocked",
  "stale",
];

const DEFAULT_PUBLICATION_GATE_STATES = Object.fromEntries(
  PUBLIC_RECEIPT_REQUIRED_PUBLICATION_GATES.map((gate) => [gate, "passed"]),
) as Record<PublicReceiptPublicationGateKey, PublicReceiptPublicationGateState>;

const PUBLIC_RECEIPT_SENSITIVE_ACTION_DISPLAY_MODES: PublicReceiptSensitiveActionDisplayMode[] = [
  "generic_action_label",
  "transfer_only",
  "exact_action_details",
];

const PUBLIC_RECEIPT_NET_PERSONAL_ATTRIBUTION_STATES: PublicReceiptNetPersonalAttributionState[] = [
  "verified_net_personal",
  "disclosed_partial_reimbursement",
  "disclosed_subsidy_or_match",
  "uncertain_qualified",
  "disputed_blocked",
  "suppressed",
];

const NET_ATTRIBUTION_EXCLUSION_CONTROLS: PublicReceiptCardContract["netAttributionExclusionControls"] = [
  "tradeConditionedFundsExcluded",
  "tradeUnlockedFundsExcluded",
  "sponsorSubsidiesExcluded",
  "employerMatchesExcluded",
  "donorAdvisedFundCreditsExcluded",
  "refundsExcluded",
  "counterpartyReimbursementsExcluded",
];

const DEFAULT_DIRECT_DONATION_PARITY_CONTROLS: PublicReceiptDirectDonationParityControls = {
  affectsEligibility: false,
  affectsFutureMarketplaceAccess: false,
  affectsMatchingPriority: false,
  affectsProfileProminence: false,
  affectsPublicSearchOrdering: false,
  affectsReviewPriority: false,
  framedAsMoralUpgrade: false,
  modeOffered: true,
  participantOptIn: true,
  preselected: false,
  requiredForReceiptPublication: false,
};

const DEFAULT_NET_ATTRIBUTION_CONTROLS: PublicReceiptNetAttributionControls = {
  attributionState: "verified_net_personal",
  counterpartyReimbursementsExcluded: true,
  donorAdvisedFundCreditsExcluded: true,
  employerMatchesExcluded: true,
  grossPersonalTransfer: "$100 gross personal transfer",
  knownReimbursementOrSubsidy: "$0 known reimbursement, subsidy, refund, match, or credit",
  netPersonalContribution: "$100 verified net personal contribution",
  refundsExcluded: true,
  sideBenefitDisclosure: "No side benefit reported or counted as personal contribution.",
  sponsorSubsidiesExcluded: true,
  tradeConditionedFundsExcluded: true,
  tradeUnlockedFundsExcluded: true,
};

function isSafeVerificationUrl(value: string) {
  return (
    /^https:\/\/[^\s]+$/i.test(value) ||
    /^\/api\/moral-trade\/public-receipts\/[a-z0-9-]+\/verify$/i.test(value)
  );
}

function hasText(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function isPassedReviewState(value: PublicReceiptReviewState) {
  return value === "passed";
}

function isNonBlockingPublicationGate(value: PublicReceiptPublicationGateState | undefined) {
  return value === "passed" || value === "not_required_for_stage";
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

function publicReceiptText(draft: PublicReceiptCardDraft) {
  return [
    draft.title,
    draft.claimCopy,
    draft.publicActionSummary,
    draft.contributionSummary.personalContribution,
    draft.contributionSummary.tradeConditionedContribution,
    draft.contributionSummary.tradeUnlockedContribution ?? "",
    draft.contributionSummary.totalVerifiedRecipientTransfer,
    draft.directDonationParityNote,
    draft.netAttributionControls.grossPersonalTransfer,
    draft.netAttributionControls.knownReimbursementOrSubsidy,
    draft.netAttributionControls.sideBenefitDisclosure,
    draft.netAttributionControls.netPersonalContribution,
    draft.netAttributionNote,
  ].join(" ");
}

function addClaimReviewBlocker(
  blockers: string[],
  draft: PublicReceiptCardDraft,
  claimKey: PublicReceiptClaimReviewKey,
  pattern: RegExp,
  text: string,
) {
  if (draft.visibility !== "opt_in_public" || !pattern.test(text)) {
    return;
  }

  const state = draft.claimReviewStates[claimKey];
  if (!state || !isPassedReviewState(state)) {
    blockers.push(`public_receipt_claim_review_missing:${claimKey}:${state ?? "missing"}`);
  }
}

export function validatePublicReceiptCardDraft(
  draft: PublicReceiptCardDraft,
): PublicReceiptCardValidation {
  const serialized = JSON.stringify(draft);
  const publicText = publicReceiptText(draft);
  const blockers: string[] = [];

  if (draft.visibility === "opt_in_public") {
    if (!draft.participantOptIn) blockers.push("participant_opt_in_required");
    if (!draft.reviewed) blockers.push("review_required_before_publication");
    if (!isSafeVerificationUrl(draft.verificationUrl)) blockers.push("verification_url_required");
    if (!draft.sensitiveActionRedacted) blockers.push("sensitive_action_redaction_required");
    for (const gate of PUBLIC_RECEIPT_REQUIRED_PUBLICATION_GATES) {
      if (!isNonBlockingPublicationGate(draft.publicationGateStates[gate])) {
        blockers.push(
          `publication_gate_not_non_blocking:${gate}:${draft.publicationGateStates[gate] ?? "missing"}`,
        );
      }
    }
    if (draft.correctionStatus === "revoked" || draft.publicationControls.currentStatus === "revoked") {
      blockers.push("revoked_receipt_cannot_publish");
    }
  }

  if (
    draft.claimKind === "pledge_swap" &&
    draft.visibility === "opt_in_public" &&
    (draft.sensitiveActionDisclosure.displayMode === "exact_action_details" ||
      EXACT_SENSITIVE_ACTION_PATTERN.test(publicText))
  ) {
    if (!draft.sensitiveActionDisclosure.separatePublicActionDisclosureConsent) {
      blockers.push("sensitive_action_exact_public_consent_required");
    }
    if (
      !isNonBlockingPublicationGate(
        draft.sensitiveActionDisclosure.privacyReviewState,
      )
    ) {
      blockers.push(
        `sensitive_action_privacy_review_not_non_blocking:${draft.sensitiveActionDisclosure.privacyReviewState}`,
      );
    }
    if (
      !isNonBlockingPublicationGate(
        draft.sensitiveActionDisclosure.autonomyReviewState,
      )
    ) {
      blockers.push(
        `sensitive_action_autonomy_review_not_non_blocking:${draft.sensitiveActionDisclosure.autonomyReviewState}`,
      );
    }
    if (
      !isNonBlockingPublicationGate(
        draft.sensitiveActionDisclosure.contentModerationReviewState,
      )
    ) {
      blockers.push(
        `sensitive_action_content_review_not_non_blocking:${draft.sensitiveActionDisclosure.contentModerationReviewState}`,
      );
    }
  }

  if (!/direct donation/i.test(draft.directDonationParityNote) || !/not prefer|no preference|parity/i.test(draft.directDonationParityNote)) {
    blockers.push("direct_donation_parity_note_required");
  }

  if (
    draft.directDonationParityControls.modeOffered &&
    !draft.directDonationParityControls.participantOptIn
  ) {
    blockers.push("direct_donation_parity_participant_opt_in_required");
  }

  const prohibitedParityControls: Array<[
    keyof PublicReceiptDirectDonationParityControls,
    string,
  ]> = [
    ["preselected", "direct_donation_parity_preselected_blocked"],
    [
      "requiredForReceiptPublication",
      "direct_donation_parity_required_for_publication_blocked",
    ],
    ["framedAsMoralUpgrade", "direct_donation_parity_moral_upgrade_blocked"],
    [
      "affectsMatchingPriority",
      "direct_donation_parity_matching_priority_blocked",
    ],
    ["affectsReviewPriority", "direct_donation_parity_review_priority_blocked"],
    ["affectsEligibility", "direct_donation_parity_eligibility_blocked"],
    [
      "affectsPublicSearchOrdering",
      "direct_donation_parity_public_search_ordering_blocked",
    ],
    [
      "affectsProfileProminence",
      "direct_donation_parity_profile_prominence_blocked",
    ],
    [
      "affectsFutureMarketplaceAccess",
      "direct_donation_parity_future_marketplace_access_blocked",
    ],
  ];

  for (const [control, blocker] of prohibitedParityControls) {
    if (draft.directDonationParityControls[control]) {
      blockers.push(blocker);
    }
  }

  if (!/net/i.test(draft.netAttributionNote)) {
    blockers.push("net_attribution_note_required");
  }

  if (draft.visibility === "opt_in_public") {
    if (!hasText(draft.netAttributionControls.grossPersonalTransfer)) {
      blockers.push("gross_personal_transfer_line_required");
    }
    if (!hasText(draft.netAttributionControls.knownReimbursementOrSubsidy)) {
      blockers.push("reimbursement_or_subsidy_disclosure_required");
    }
    if (!hasText(draft.netAttributionControls.sideBenefitDisclosure)) {
      blockers.push("side_benefit_disclosure_required");
    }
    if (!hasText(draft.netAttributionControls.netPersonalContribution)) {
      blockers.push("net_personal_contribution_line_required");
    }

    for (const control of NET_ATTRIBUTION_EXCLUSION_CONTROLS) {
      if (!draft.netAttributionControls[control]) {
        blockers.push(`net_attribution_exclusion_missing:${control}`);
      }
    }

    if (draft.netAttributionControls.attributionState === "disputed_blocked") {
      blockers.push("disputed_net_personal_contribution_cannot_publish");
    }

    if (
      (
        draft.netAttributionControls.attributionState === "uncertain_qualified" ||
        draft.netAttributionControls.attributionState === "suppressed"
      ) &&
      !/uncertain|qualified|suppressed|omitted/i.test(draft.netAttributionNote)
    ) {
      blockers.push("net_personal_contribution_uncertain_or_suppressed_must_be_qualified");
    }

    if (
      /reimburs|subsid|side benefit|refund|match|donor-advised|counterparty/i.test(
        `${draft.netAttributionControls.knownReimbursementOrSubsidy} ${draft.netAttributionControls.sideBenefitDisclosure}`,
      ) &&
      !/reimburs|subsid|side benefit|refund|match|donor-advised|counterparty/i.test(
        draft.netAttributionNote,
      )
    ) {
      blockers.push("reimbursement_subsidy_or_side_benefit_must_be_disclosed");
    }
  }

  addClaimReviewBlocker(blockers, draft, "verified", /\bverified\b/i, publicText);
  addClaimReviewBlocker(blockers, draft, "recipient_transfer", /\brecipient transfer\b/i, publicText);
  addClaimReviewBlocker(blockers, draft, "trade_conditioned", /\btrade-conditioned\b/i, publicText);
  addClaimReviewBlocker(blockers, draft, "trade_unlocked", /\btrade-unlocked|unlocked\b/i, publicText);
  addClaimReviewBlocker(blockers, draft, "additional", /\badditional|additionality\b/i, publicText);
  addClaimReviewBlocker(blockers, draft, "matched", /\bmatched\b/i, publicText);
  addClaimReviewBlocker(blockers, draft, "completed", /\bcompleted\b/i, publicText);
  addClaimReviewBlocker(blockers, draft, "impact", /\bimpact\b/i, publicText);
  addClaimReviewBlocker(blockers, draft, "personal_contribution", /\bpersonal contribution\b/i, publicText);
  addClaimReviewBlocker(blockers, draft, "direct_donation_parity", /\bdirect donation\b/i, publicText);

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
    claimReviewStates: draft.claimReviewStates,
    claimCopy: draft.claimCopy,
    claimKind: draft.claimKind,
    contributionSummary: draft.contributionSummary,
    correctionStatus: draft.correctionStatus,
    directDonationParityControls: draft.directDonationParityControls,
    directDonationParityNote: draft.directDonationParityNote,
    evidenceLevel: draft.evidenceLevel,
    netAttributionControls: draft.netAttributionControls,
    netAttributionNote: draft.netAttributionNote,
    publicationGateStates: draft.publicationGateStates,
    publicationControls: draft.publicationControls,
    publicActionSummary: draft.publicActionSummary,
    receiptId: draft.receiptId,
    sensitiveActionDisclosure: draft.sensitiveActionDisclosure,
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
    claimReviewStates: {
      direct_donation_parity: "passed",
      personal_contribution: "passed",
      recipient_transfer: "passed",
      trade_conditioned: "passed",
      verified: "passed",
    },
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
    directDonationParityControls: DEFAULT_DIRECT_DONATION_PARITY_CONTROLS,
    directDonationParityNote:
      "Direct donation remains at parity; Moral Trade does not prefer this route over giving directly.",
    evidenceLevel: "receipt_reviewed",
    netAttributionControls: DEFAULT_NET_ATTRIBUTION_CONTROLS,
    netAttributionNote:
      "Net attribution separates personal contribution, trade-conditioned contribution, reimbursements, subsidies, refunds, matches, side benefits, and total verified recipient transfer.",
    participantOptIn: true,
    publicationGateStates: DEFAULT_PUBLICATION_GATE_STATES,
    publicationControls: DEFAULT_PUBLICATION_CONTROLS,
    publicActionSummary: "Reviewed donation-offset receipt",
    receiptId: "public-receipt-contract-sample-offset",
    reviewed: true,
    sensitiveActionRedacted: true,
    sensitiveActionDisclosure: {
      autonomyReviewState: "not_required_for_stage",
      contentModerationReviewState: "not_required_for_stage",
      displayMode: "transfer_only",
      privacyReviewState: "not_required_for_stage",
      separatePublicActionDisclosureConsent: false,
    },
    title: "Reviewed offset receipt",
    verificationUrl:
      "/api/moral-trade/public-receipts/public-receipt-contract-sample-offset/verify",
    visibility: "opt_in_public",
  },
  {
    claimReviewStates: {
      direct_donation_parity: "passed",
      impact: "passed",
      personal_contribution: "passed",
      recipient_transfer: "passed",
      trade_conditioned: "passed",
      trade_unlocked: "passed",
      verified: "passed",
    },
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
    directDonationParityControls: DEFAULT_DIRECT_DONATION_PARITY_CONTROLS,
    directDonationParityNote:
      "Direct donation parity is optional and non-preferential; it does not affect matching, review, or access.",
    evidenceLevel: "receipt_reviewed",
    netAttributionControls: DEFAULT_NET_ATTRIBUTION_CONTROLS,
    netAttributionNote:
      "Net personal contribution excludes reimbursements, subsidies, refunds, and counterparty-funded amounts.",
    participantOptIn: true,
    publicationGateStates: DEFAULT_PUBLICATION_GATE_STATES,
    publicationControls: DEFAULT_PUBLICATION_CONTROLS,
    publicActionSummary:
      "Reviewed stronger causal wording receipt with current verification status",
    receiptId: "public-receipt-contract-sample-unlocked",
    reviewed: true,
    sensitiveActionRedacted: true,
    sensitiveActionDisclosure: {
      autonomyReviewState: "not_required_for_stage",
      contentModerationReviewState: "not_required_for_stage",
      displayMode: "transfer_only",
      privacyReviewState: "not_required_for_stage",
      separatePublicActionDisclosureConsent: false,
    },
    title: "Reviewed causal wording receipt",
    verificationUrl:
      "/api/moral-trade/public-receipts/public-receipt-contract-sample-unlocked/verify",
    visibility: "opt_in_public",
  },
  {
    claimReviewStates: {
      completed: "passed",
      direct_donation_parity: "passed",
      personal_contribution: "passed",
      recipient_transfer: "passed",
      trade_conditioned: "passed",
      verified: "passed",
    },
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
    directDonationParityControls: {
      ...DEFAULT_DIRECT_DONATION_PARITY_CONTROLS,
      modeOffered: false,
      participantOptIn: false,
    },
    directDonationParityNote:
      "Direct donation parity is not required, not preselected, and creates no preference.",
    evidenceLevel: "self_attestation",
    netAttributionControls: {
      ...DEFAULT_NET_ATTRIBUTION_CONTROLS,
      attributionState: "suppressed",
      grossPersonalTransfer: "No public gross personal transfer line is shown.",
      netPersonalContribution: "Personal contribution line is suppressed.",
    },
    netAttributionNote:
      "Net attribution is qualified because personal behavior details are suppressed; reimbursements, subsidies, side benefits, and counterparty-funded amounts are not counted as personal contribution.",
    participantOptIn: true,
    publicationGateStates: DEFAULT_PUBLICATION_GATE_STATES,
    publicationControls: DEFAULT_PUBLICATION_CONTROLS,
    publicActionSummary: "Verified micro-pledge completed",
    receiptId: "public-receipt-contract-sample-pledge",
    reviewed: true,
    sensitiveActionRedacted: true,
    sensitiveActionDisclosure: {
      autonomyReviewState: "not_required_for_stage",
      contentModerationReviewState: "not_required_for_stage",
      displayMode: "generic_action_label",
      privacyReviewState: "not_required_for_stage",
      separatePublicActionDisclosureConsent: false,
    },
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
  "verification_status_metadata_required",
  "correction_revocation_state_required",
  "claim_words_require_passed_claim_reviews",
  "sensitive_action_exact_details_require_separate_consent_and_reviews",
  "direct_donation_parity_opt_in_non_preferential",
  "direct_donation_parity_no_default_recommendation_access_or_priority",
  "net_attribution_gross_reimbursement_side_benefit_and_net_lines_separated",
  "net_personal_contribution_excludes_trade_conditioned_and_third_party_funds",
  "sensitive_action_redaction_required",
  "publication_sidecar_only",
  "publication_gates_non_blocking_required",
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
  "receipt_prominence",
  "matching_priority",
  "review_priority",
  "eligibility_advantage",
  "future_marketplace_access_advantage",
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
    claimReviewKeys: PUBLIC_RECEIPT_CLAIM_REVIEW_KEYS,
    publicationGateKeys: PUBLIC_RECEIPT_REQUIRED_PUBLICATION_GATES,
    publicationGateStates: PUBLIC_RECEIPT_GATE_STATES,
    personalContributionStates: [
      "verified_new",
      "verified_already_counted",
      "ordinary_verified_not_parity",
      "suppressed_uncertain",
    ],
    netPersonalAttributionStates: PUBLIC_RECEIPT_NET_PERSONAL_ATTRIBUTION_STATES,
    sensitiveActionDisplayModes: PUBLIC_RECEIPT_SENSITIVE_ACTION_DISPLAY_MODES,
    claimHygieneRules: CLAIM_HYGIENE_RULES,
    defaultPublicationControls: DEFAULT_PUBLICATION_CONTROLS,
    defaultDirectDonationParityControls: DEFAULT_DIRECT_DONATION_PARITY_CONTROLS,
    netAttributionExclusionControls: NET_ATTRIBUTION_EXCLUSION_CONTROLS,
    requiredPublicFields: [
      "receiptId",
      "title",
      "claimKind",
      "visibility",
      "verificationUrl",
      "correctionStatus",
      "claimReviewStates",
      "directDonationParityControls",
      "directDonationParityControls.participantOptIn",
      "directDonationParityControls.preselected",
      "directDonationParityControls.requiredForReceiptPublication",
      "directDonationParityControls.affectsMatchingPriority",
      "directDonationParityControls.affectsReviewPriority",
      "directDonationParityControls.affectsEligibility",
      "directDonationParityControls.affectsPublicSearchOrdering",
      "directDonationParityControls.affectsProfileProminence",
      "directDonationParityControls.affectsFutureMarketplaceAccess",
      "publicationControls.issuedAt",
      "publicationControls.currentStatus",
      "sensitiveActionDisclosure.displayMode",
      "contributionSummary.personalContribution",
      "contributionSummary.tradeConditionedContribution",
      "contributionSummary.totalVerifiedRecipientTransfer",
      "directDonationParityNote",
      "netAttributionControls.grossPersonalTransfer",
      "netAttributionControls.knownReimbursementOrSubsidy",
      "netAttributionControls.sideBenefitDisclosure",
      "netAttributionControls.netPersonalContribution",
      "netAttributionControls.attributionState",
      "netAttributionNote",
      "publicationGateStates",
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
      "publication-gate-coverage",
      "Contract requires reconciliation, challenge-window, privacy, recipient association, content moderation, and public-metric-release gates before publication",
      PUBLIC_RECEIPT_REQUIRED_PUBLICATION_GATES.every((gate) =>
        contract.publicationGateKeys.includes(gate),
      ) &&
        [
          "passed",
          "not_required_for_stage",
          "missing",
          "under_review",
          "blocked",
          "stale",
        ].every((state) =>
          contract.publicationGateStates.includes(
            state as PublicReceiptPublicationGateState,
          ),
        ),
      `${contract.publicationGateKeys.join(", ")} states=${contract.publicationGateStates.join(", ")}`,
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
      "verification-status-metadata",
      "Public receipt verification exposes issued-at, current-status, and correction/revocation state",
      [
        "verificationUrl",
        "correctionStatus",
        "publicationControls.issuedAt",
        "publicationControls.currentStatus",
      ].every((field) => contract.requiredPublicFields.includes(field)) &&
        contract.claimHygieneRules.includes("verification_status_metadata_required") &&
        contract.claimHygieneRules.includes("correction_revocation_state_required"),
      contract.requiredPublicFields.join(", "),
    ),
    check(
      "claim-review-key-coverage",
      "Public claim words require passed claim-review records before publication",
      PUBLIC_RECEIPT_CLAIM_REVIEW_KEYS.every((key) =>
        contract.claimReviewKeys.includes(key),
      ) &&
        contract.claimHygieneRules.includes("claim_words_require_passed_claim_reviews"),
      `${contract.claimReviewKeys.join(", ")} rules=${contract.claimHygieneRules.join(", ")}`,
    ),
    check(
      "sensitive-action-disclosure-controls",
      "Pledge-swap receipt action details default to generic or transfer-only unless exact details have consent and non-blocking reviews",
      ["generic_action_label", "transfer_only", "exact_action_details"].every(
        (mode) =>
          contract.sensitiveActionDisplayModes.includes(
            mode as PublicReceiptSensitiveActionDisplayMode,
          ),
      ) &&
        contract.claimHygieneRules.includes(
          "sensitive_action_exact_details_require_separate_consent_and_reviews",
        ) &&
        contract.requiredPublicFields.includes(
          "sensitiveActionDisclosure.displayMode",
      ),
      `${contract.sensitiveActionDisplayModes.join(", ")} fields=${contract.requiredPublicFields.join(", ")}`,
    ),
    check(
      "direct-donation-parity-controls",
      "Direct-donation parity is opt-in and cannot affect recommendations, access, search, matching, review, or profile prominence",
      contract.defaultDirectDonationParityControls.modeOffered &&
        contract.defaultDirectDonationParityControls.participantOptIn &&
        !contract.defaultDirectDonationParityControls.preselected &&
        !contract.defaultDirectDonationParityControls.requiredForReceiptPublication &&
        !contract.defaultDirectDonationParityControls.framedAsMoralUpgrade &&
        !contract.defaultDirectDonationParityControls.affectsMatchingPriority &&
        !contract.defaultDirectDonationParityControls.affectsReviewPriority &&
        !contract.defaultDirectDonationParityControls.affectsEligibility &&
        !contract.defaultDirectDonationParityControls.affectsPublicSearchOrdering &&
        !contract.defaultDirectDonationParityControls.affectsProfileProminence &&
        !contract.defaultDirectDonationParityControls.affectsFutureMarketplaceAccess &&
        contract.claimHygieneRules.includes(
          "direct_donation_parity_opt_in_non_preferential",
        ) &&
        contract.claimHygieneRules.includes(
          "direct_donation_parity_no_default_recommendation_access_or_priority",
        ) &&
        contract.requiredPublicFields.includes(
          "directDonationParityControls.participantOptIn",
        ),
      JSON.stringify(contract.defaultDirectDonationParityControls),
    ),
    check(
      "net-attribution-controls",
      "Gross transfer, reimbursements or subsidies, side benefits, and verified net personal contribution are separate required controls",
      PUBLIC_RECEIPT_NET_PERSONAL_ATTRIBUTION_STATES.every((state) =>
        contract.netPersonalAttributionStates.includes(state),
      ) &&
        NET_ATTRIBUTION_EXCLUSION_CONTROLS.every((control) =>
          contract.netAttributionExclusionControls.includes(control),
        ) &&
        contract.claimHygieneRules.includes(
          "net_attribution_gross_reimbursement_side_benefit_and_net_lines_separated",
        ) &&
        contract.claimHygieneRules.includes(
          "net_personal_contribution_excludes_trade_conditioned_and_third_party_funds",
        ) &&
        [
          "netAttributionControls.grossPersonalTransfer",
          "netAttributionControls.knownReimbursementOrSubsidy",
          "netAttributionControls.sideBenefitDisclosure",
          "netAttributionControls.netPersonalContribution",
          "netAttributionControls.attributionState",
        ].every((field) => contract.requiredPublicFields.includes(field)),
      `${contract.netPersonalAttributionStates.join(", ")} exclusions=${contract.netAttributionExclusionControls.join(", ")}`,
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
