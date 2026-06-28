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
