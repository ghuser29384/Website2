export type MpgfCrecGuidedStance = "strong" | "weak" | "dissent" | "abstain";

export interface MpgfCrecPlainLanguageCopyMapRow {
  defaultUiText: string;
  canonicalMeaning: string;
  implementationRequirement: string;
  canonicalRecord: string;
  canonicalField: string;
  canonicalValue?: string;
  createsAlternateSemantics: boolean;
}

export interface MpgfCrecFinalReviewRequiredDisclosure {
  key: string;
  label: string;
  specRequirement: string;
  canonicalRecords: readonly string[];
  canonicalFields: readonly string[];
  finalReviewRequired: true;
  createsAlternateSemantics: false;
}

export interface MpgfCrecAccountingChannelDisclosure {
  key: string;
  label: string;
  canonicalField: string;
  summary: string;
  accessibleBeforeConsent: true;
  receiptRequired: true;
  mayBeCombinedIntoImpactTotal: false;
}

export const MPGF_CRECM_PLAIN_LANGUAGE_COPY_MAP = [
  {
    defaultUiText: "Maximum this round",
    canonicalMeaning: "CommonGroundBudget.totalBudgetCents",
    implementationRequirement: "cap_not_authorization_or_charge",
    canonicalRecord: "CommonGroundBudget",
    canonicalField: "totalBudgetCents",
    createsAlternateSemantics: false,
  },
  {
    defaultUiText: "Maximum for this project",
    canonicalMeaning: "ConditionalTradeIntent.maxExposureCents plus project and stance caps",
    implementationRequirement: "cannot_exceed_budget_project_stance_or_active_intent_cap",
    canonicalRecord: "ConditionalTradeIntent",
    canonicalField: "maxExposureCents",
    createsAlternateSemantics: false,
  },
  {
    defaultUiText: "Fund this",
    canonicalMeaning: "ProjectSupportStance.stance = strong",
    implementationRequirement: "allocatable_only_after_explicit_cap_and_condition_acceptance",
    canonicalRecord: "ProjectSupportStance",
    canonicalField: "stance",
    canonicalValue: "strong",
    createsAlternateSemantics: false,
  },
  {
    defaultUiText: "Fund if different-view support joins",
    canonicalMeaning: "ProjectSupportStance.stance = weak",
    implementationRequirement: "allocatable_only_after_explicit_cap_and_cross_view_condition_acceptance",
    canonicalRecord: "ProjectSupportStance",
    canonicalField: "stance",
    canonicalValue: "weak",
    createsAlternateSemantics: false,
  },
  {
    defaultUiText: "Needs review",
    canonicalMeaning: "ProjectSupportStance.stance = dissent",
    implementationRequirement: "allocates_zero_may_increase_verified_review_pressure",
    canonicalRecord: "ProjectSupportStance",
    canonicalField: "stance",
    canonicalValue: "dissent",
    createsAlternateSemantics: false,
  },
  {
    defaultUiText: "Skip",
    canonicalMeaning: "ProjectSupportStance.stance = abstain",
    implementationRequirement: "default_allocates_zero",
    canonicalRecord: "ProjectSupportStance",
    canonicalField: "stance",
    canonicalValue: "abstain",
    createsAlternateSemantics: false,
  },
  {
    defaultUiText: "Condition",
    canonicalMeaning: "ConditionalTradeIntent.acceptableCounterBucketIds and minCounterpartyVolumeCents",
    implementationRequirement: "verified_match_eligible_distinct_counterparty_volume_with_self_match_exclusions",
    canonicalRecord: "ConditionalTradeIntent",
    canonicalField: "acceptableCounterBucketIds|minCounterpartyVolumeCents",
    createsAlternateSemantics: false,
  },
  {
    defaultUiText: "Sent to project",
    canonicalMeaning: "netRecipientDisbursedCents",
    implementationRequirement: "fees_excluded_unless_sponsor_paid_fee_support_separately_funds_them",
    canonicalRecord: "MpgfContributionProofLedgerAccounting",
    canonicalField: "netRecipientDisbursedCents",
    createsAlternateSemantics: false,
  },
  {
    defaultUiText: "Counts for matching",
    canonicalMeaning: "matchEligibleCents",
    implementationRequirement: "never_gross_captured_or_rewards_credits_certificates",
    canonicalRecord: "MpgfContributionProofLedgerAccounting",
    canonicalField: "matchEligibleContributionCents",
    createsAlternateSemantics: false,
  },
  {
    defaultUiText: "Sponsor added",
    canonicalMeaning: "base-match and bonus-match cents",
    implementationRequirement: "only_from_backed_sponsor_pools_after_hard_gates",
    canonicalRecord: "MpgfContributionProofLedgerAccounting",
    canonicalField: "sponsorBaseMatchCents|sponsorBonusMatchCents",
    createsAlternateSemantics: false,
  },
  {
    defaultUiText: "Contributor benefit",
    canonicalMeaning: "success reward, coordination credit, or impact certificate",
    implementationRequirement: "never_public_good_dollars_allocation_power_or_counterparty_volume",
    canonicalRecord: "MpgfContributionProofLedgerAccounting",
    canonicalField: "successRewardCents|coordinationCreditCount|impactCertificateCount",
    createsAlternateSemantics: false,
  },
] as const satisfies readonly MpgfCrecPlainLanguageCopyMapRow[];

export const MPGF_CRECM_REQUIRED_PLAIN_LANGUAGE_COPY_LABELS =
  MPGF_CRECM_PLAIN_LANGUAGE_COPY_MAP.map((entry) => entry.defaultUiText);

function labelFor(predicate: (row: MpgfCrecPlainLanguageCopyMapRow) => boolean, fallback: string) {
  return MPGF_CRECM_PLAIN_LANGUAGE_COPY_MAP.find(predicate)?.defaultUiText ?? fallback;
}

export function getMpgfCrecPlainLanguageLabelForStance(stance: MpgfCrecGuidedStance) {
  return labelFor(
    (row) =>
      row.canonicalRecord === "ProjectSupportStance" &&
      row.canonicalField === "stance" &&
      row.canonicalValue === stance,
    stance,
  );
}

export const MPGF_CRECM_PLAIN_LANGUAGE_LABELS = {
  maximumThisRound: labelFor(
    (row) => row.canonicalRecord === "CommonGroundBudget" && row.canonicalField === "totalBudgetCents",
    "Maximum this round",
  ),
  maximumForThisProject: labelFor(
    (row) => row.canonicalRecord === "ConditionalTradeIntent" && row.canonicalField === "maxExposureCents",
    "Maximum for this project",
  ),
  condition: labelFor(
    (row) =>
      row.canonicalRecord === "ConditionalTradeIntent" &&
      row.canonicalField === "acceptableCounterBucketIds|minCounterpartyVolumeCents",
    "Condition",
  ),
  sentToProject: labelFor(
    (row) =>
      row.canonicalRecord === "MpgfContributionProofLedgerAccounting" &&
      row.canonicalField === "netRecipientDisbursedCents",
    "Sent to project",
  ),
  countsForMatching: labelFor(
    (row) =>
      row.canonicalRecord === "MpgfContributionProofLedgerAccounting" &&
      row.canonicalField === "matchEligibleContributionCents",
    "Counts for matching",
  ),
  sponsorAdded: labelFor(
    (row) =>
      row.canonicalRecord === "MpgfContributionProofLedgerAccounting" &&
      row.canonicalField === "sponsorBaseMatchCents|sponsorBonusMatchCents",
    "Sponsor added",
  ),
  contributorBenefit: labelFor(
    (row) =>
      row.canonicalRecord === "MpgfContributionProofLedgerAccounting" &&
      row.canonicalField === "successRewardCents|coordinationCreditCount|impactCertificateCount",
    "Contributor benefit",
  ),
  stance: {
    strong: getMpgfCrecPlainLanguageLabelForStance("strong"),
    weak: getMpgfCrecPlainLanguageLabelForStance("weak"),
    dissent: getMpgfCrecPlainLanguageLabelForStance("dissent"),
    abstain: getMpgfCrecPlainLanguageLabelForStance("abstain"),
  },
} as const;

export const MPGF_CRECM_FINAL_REVIEW_REQUIRED_DISCLOSURES = [
  {
    key: "binding_project_caps",
    label: "Binding caps",
    specRequirement: "binding project caps",
    canonicalRecords: ["CommonGroundBudget", "ProjectSupportStance", "ConditionalTradeIntent"],
    canonicalFields: ["totalBudgetCents", "perProjectCapCents", "maxAllocCents", "maxAllocBps"],
    finalReviewRequired: true,
    createsAlternateSemantics: false,
  },
  {
    key: "cross_view_conditions",
    label: "Cross-view conditions",
    specRequirement: "explicit cross-view conditional pledge constraints",
    canonicalRecords: ["ConditionalTradeIntent", "ProjectSupportStance"],
    canonicalFields: ["conditionAccepted", "minCounterpartyVolumeCents", "acceptableCounterBucketIds"],
    finalReviewRequired: true,
    createsAlternateSemantics: false,
  },
  {
    key: "counterpart_buckets",
    label: "Counterpart buckets",
    specRequirement: "counterparty buckets",
    canonicalRecords: ["ConditionalTradeIntent", "MpgfRoundMoralBucketSnapshot"],
    canonicalFields: ["acceptableCounterBucketIds", "minCounterpartyVolumeCents"],
    finalReviewRequired: true,
    createsAlternateSemantics: false,
  },
  {
    key: "fallback_rule",
    label: "Fallback rule",
    specRequirement: "fallback rules",
    canonicalRecords: ["CommonGroundBudget", "ConditionalTradeIntent"],
    canonicalFields: ["fallbackRule", "unroutableBudgetPolicy"],
    finalReviewRequired: true,
    createsAlternateSemantics: false,
  },
  {
    key: "payment_language",
    label: "Payment language",
    specRequirement: "payment language",
    canonicalRecords: ["PaymentCommitmentSnapshot", "AuthorizationReconciliationEvent"],
    canonicalFields: ["paymentCaptureAllowed", "providerConfirmed", "authorizationState"],
    finalReviewRequired: true,
    createsAlternateSemantics: false,
  },
  {
    key: "fee_treatment",
    label: "Fee treatment",
    specRequirement: "fee treatment",
    canonicalRecords: ["FeeQuote", "MpgfContributionProofLedgerAccounting"],
    canonicalFields: ["grossCapturedCents", "feeCents", "netRecipientDisbursedCents", "matchEligibleCents"],
    finalReviewRequired: true,
    createsAlternateSemantics: false,
  },
  {
    key: "reward_credit_certificate_opt_ins",
    label: "Reward, credit, and certificate opt-ins",
    specRequirement: "reward/credit/certificate opt-ins",
    canonicalRecords: ["SuccessRewardClaim", "CoordinationCreditLedgerEntry", "ImpactCertificateClaim"],
    canonicalFields: ["successRewardOptIn", "coordinationCreditOptIn", "impactCertificateOptIn"],
    finalReviewRequired: true,
    createsAlternateSemantics: false,
  },
  {
    key: "self_matching_exclusions",
    label: "Self-matching exclusions",
    specRequirement: "self-matching exclusions",
    canonicalRecords: ["ConditionalTradeIntent", "IdentityEligibility", "CounterpartyVolumeSatisfaction"],
    canonicalFields: ["participantId", "paymentMethodClusterId", "sameControlEntityId"],
    finalReviewRequired: true,
    createsAlternateSemantics: false,
  },
  {
    key: "sealed_progress_disclosure",
    label: "Sealed-progress behavior",
    specRequirement: "sealed-progress disclosure",
    canonicalRecords: ["MpgfPublicGoodsRound", "RoundClearingInputBundle"],
    canonicalFields: ["sealedPledgeMode", "exactProgressPublicBeforeClose"],
    finalReviewRequired: true,
    createsAlternateSemantics: false,
  },
  {
    key: "failure_bonus_denial_categories",
    label: "Failure-bonus denial categories",
    specRequirement: "failure-bonus denial categories",
    canonicalRecords: ["FailureBonusClaim", "ProjectHardGate", "PaymentCommitmentSnapshot"],
    canonicalFields: ["denialReason", "failureReason", "claimState"],
    finalReviewRequired: true,
    createsAlternateSemantics: false,
  },
] as const satisfies readonly MpgfCrecFinalReviewRequiredDisclosure[];

export type MpgfCrecFinalReviewDisclosureKey =
  (typeof MPGF_CRECM_FINAL_REVIEW_REQUIRED_DISCLOSURES)[number]["key"];

export const MPGF_CRECM_REQUIRED_FINAL_REVIEW_DISCLOSURE_KEYS =
  MPGF_CRECM_FINAL_REVIEW_REQUIRED_DISCLOSURES.map((entry) => entry.key);

export const MPGF_CRECM_ACCOUNTING_CHANNEL_DISCLOSURES = [
  {
    key: "maximum_budget",
    label: "Maximum budget",
    canonicalField: "CommonGroundBudget.totalBudgetCents",
    summary: "The most this Common Ground Budget can spend this round or month.",
    accessibleBeforeConsent: true,
    receiptRequired: true,
    mayBeCombinedIntoImpactTotal: false,
  },
  {
    key: "possible_captured_amount",
    label: "Possible captured amount",
    canonicalField: "ConditionalTradeIntent.maxExposureCents",
    summary: "The maximum amount that could be captured after all gates, consent, and authorization checks pass.",
    accessibleBeforeConsent: true,
    receiptRequired: true,
    mayBeCombinedIntoImpactTotal: false,
  },
  {
    key: "gross_captured_exposure",
    label: "Gross captured exposure",
    canonicalField: "FeeQuote.grossCapturedCents",
    summary: "The full captured amount before any fee treatment.",
    accessibleBeforeConsent: true,
    receiptRequired: true,
    mayBeCombinedIntoImpactTotal: false,
  },
  {
    key: "fees",
    label: "Fees",
    canonicalField: "FeeQuote.feeCents",
    summary: "Fees are displayed separately from project funding and sponsor support.",
    accessibleBeforeConsent: true,
    receiptRequired: true,
    mayBeCombinedIntoImpactTotal: false,
  },
  {
    key: "net_recipient_disbursed",
    label: "Net recipient-disbursed public-good dollars",
    canonicalField: "FeeQuote.netRecipientDisbursedCents",
    summary: "The amount sent to the eligible recipient or fiscal-host route after fee treatment.",
    accessibleBeforeConsent: true,
    receiptRequired: true,
    mayBeCombinedIntoImpactTotal: false,
  },
  {
    key: "counted_dollars",
    label: "Counted dollars",
    canonicalField: "ContributionProofLedger.countedContributionCents",
    summary: "Dollars counted by the CRECM accounting rules, distinct from gross captured exposure.",
    accessibleBeforeConsent: true,
    receiptRequired: true,
    mayBeCombinedIntoImpactTotal: false,
  },
  {
    key: "match_eligible_dollars",
    label: "Match-eligible dollars",
    canonicalField: "ContributionProofLedger.matchEligibleContributionCents",
    summary: "The counted amount eligible for sponsor base match or bonus calculations.",
    accessibleBeforeConsent: true,
    receiptRequired: true,
    mayBeCombinedIntoImpactTotal: false,
  },
  {
    key: "sponsor_base_match",
    label: "Sponsor base match",
    canonicalField: "ContributionProofLedger.sponsorBaseMatchCents",
    summary: "Pool-backed base-match dollars, separate from participant-captured funds.",
    accessibleBeforeConsent: true,
    receiptRequired: true,
    mayBeCombinedIntoImpactTotal: false,
  },
  {
    key: "sponsor_bonus_match",
    label: "Sponsor bonus match",
    canonicalField: "ContributionProofLedger.sponsorBonusMatchCents",
    summary: "Capped diversity-aware bonus-match dollars, separate from base match and participant funds.",
    accessibleBeforeConsent: true,
    receiptRequired: true,
    mayBeCombinedIntoImpactTotal: false,
  },
  {
    key: "success_rewards",
    label: "Success rewards",
    canonicalField: "SuccessRewardClaim.rewardCents",
    summary: "Contributor-only sponsor-backed rewards that never count as public-good dollars.",
    accessibleBeforeConsent: true,
    receiptRequired: true,
    mayBeCombinedIntoImpactTotal: false,
  },
  {
    key: "coordination_credits",
    label: "Coordination credits",
    canonicalField: "CoordinationCreditLedgerEntry.creditKind",
    summary: "Non-transferable coordination benefits with no allocation, vote, or matching power.",
    accessibleBeforeConsent: true,
    receiptRequired: true,
    mayBeCombinedIntoImpactTotal: false,
  },
  {
    key: "impact_certificates",
    label: "Impact certificates",
    canonicalField: "ImpactCertificateClaim.certificateHash",
    summary: "Captured-contribution receipts that must not double-count impact or alter final clearing.",
    accessibleBeforeConsent: true,
    receiptRequired: true,
    mayBeCombinedIntoImpactTotal: false,
  },
] as const satisfies readonly MpgfCrecAccountingChannelDisclosure[];

export const MPGF_CRECM_REQUIRED_ACCOUNTING_CHANNEL_KEYS =
  MPGF_CRECM_ACCOUNTING_CHANNEL_DISCLOSURES.map((entry) => entry.key);

export type MpgfCrecFinalReviewAcknowledgements =
  Record<MpgfCrecFinalReviewDisclosureKey, boolean>;

export function buildMpgfCrecFinalReviewAcknowledgements(
  acknowledgements: Partial<Record<MpgfCrecFinalReviewDisclosureKey, boolean>> = {},
): MpgfCrecFinalReviewAcknowledgements {
  return Object.fromEntries(
    MPGF_CRECM_REQUIRED_FINAL_REVIEW_DISCLOSURE_KEYS.map((key) => [
      key,
      acknowledgements[key] === true,
    ]),
  ) as MpgfCrecFinalReviewAcknowledgements;
}

export function missingMpgfCrecFinalReviewAcknowledgementKeys(
  acknowledgements: Partial<Record<MpgfCrecFinalReviewDisclosureKey, boolean>> = {},
) {
  return MPGF_CRECM_REQUIRED_FINAL_REVIEW_DISCLOSURE_KEYS.filter(
    (key) => acknowledgements[key] !== true,
  );
}

export function allMpgfCrecFinalReviewDisclosuresAcknowledged(
  acknowledgements: Partial<Record<MpgfCrecFinalReviewDisclosureKey, boolean>> = {},
) {
  return missingMpgfCrecFinalReviewAcknowledgementKeys(acknowledgements).length === 0;
}
