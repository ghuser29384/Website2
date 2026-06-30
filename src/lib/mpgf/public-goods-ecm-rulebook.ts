import { createHash } from "node:crypto";

import {
  MPGF_COPY,
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
} from "./data";
import { validateMpgfCrecPublishedCopyBundle } from "./public-goods-crecm-copy";
import {
  buildMpgfCrecV1125ClearingContractSummary,
} from "./public-goods-crecm-v1125";
import { MPGF_CONTRIBUTION_SETTLEMENT_SUMMARY_GROUP_ORDER } from "./public-goods-contribution-ledger";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsMatchPool,
  MpgfPublicGoodsRound,
} from "./types";

export const MPGF_PUBLIC_GOODS_ECM_CORE_RULEBOOK_POLICY =
  "crecm_v1_125_common_ground_budget_cross_view_batch_rulebook";

export const MPGF_PUBLIC_GOODS_BATCH_CADENCE_POLICY =
  "recurring_batch_rounds_close_clear_jit_authorize_custody_verify_challenge_release_audit";

export const MPGF_PUBLIC_GOODS_CUSTODY_POLICY =
  "partner_or_fiscal_host_supervised_custody_required_for_cleared_funds_no_platform_escrow_claim";

export const MPGF_PUBLIC_GOODS_RECIPIENT_REGISTRY_POLICY =
  "public_payable_recipient_registry_with_legal_status_payout_rail_allowed_uses_milestones_review_and_challenge_state";

export const MPGF_PUBLIC_GOODS_ECM_PLUS_HYBRID_POLICY =
  "ecm_core_plus_moral_trade_safeguards_preserve_capped_qf_and_review_stack_v1";

export const MPGF_PUBLIC_GOODS_REFUND_REROUTE_POLICY =
  "donor_selected_refund_release_or_reroute_after_failed_cross_view_batch";

export const MPGF_PUBLIC_GOODS_CROSS_VIEW_SUBSIDY_POLICY =
  "base_1_to_1_then_capped_qf_plus_simple_cross_view_premium_schedule";

export const MPGF_MECHANISM_VERSION_ENV_KEY = "MPGF_MECHANISM_VERSION";

export type MpgfMechanismVersionFlagValue =
  | "crecm_v1_125"
  | "verified_assurance_matching_pilot"
  | "unset"
  | "unsupported";

export function getMpgfMechanismVersionFeatureFlag(
  rawValue = process.env.MPGF_MECHANISM_VERSION,
) {
  const normalized = rawValue?.trim();
  const configuredValue: MpgfMechanismVersionFlagValue =
    normalized === "crecm_v1_125" || normalized === "verified_assurance_matching_pilot"
      ? normalized
      : normalized
        ? "unsupported"
        : "unset";

  return {
    envName: MPGF_MECHANISM_VERSION_ENV_KEY,
    enabledValue: "crecm_v1_125" as const,
    configuredValue,
    crecmV1125Active: configuredValue === "crecm_v1_125",
    legacyPagesRemainReadable: true as const,
    currentMpgfPagesDeleted: false as const,
  };
}

export interface MpgfPublicGoodsRecipientRegistryRow {
  campaignId: string;
  title: string;
  legalEntityOrFiscalHost: string;
  destinationType: MpgfPublicGoodsCampaign["destinationType"];
  registryStatus:
    | "eligible_after_review_and_challenge"
    | "review_required_before_payable"
    | "demo_only_not_payable"
    | "blocked_not_payable";
  payoutRail: "partner_donation_route" | "fiscal_host_release" | "signed_sponsor_route" | "not_payable_demo_only";
  allowedUses: string[];
  receiptOrMilestoneRules: string;
  reviewState: MpgfPublicGoodsCampaign["reviewStatus"];
  challengeState: "challenge_window_open" | "closed_or_not_open";
  challengeWindowEndsAt: string | null;
}

export interface MpgfPublicGoodsCrossViewSubsidyScheduleRow {
  tier:
    | "same_view_or_single_bucket"
    | "two_distinct_moral_buckets"
    | "three_or_more_distinct_moral_buckets"
    | "weak_common_ground_support_routed";
  premiumBps: number;
  condition: string;
  sponsorBudgetSource:
    | "none"
    | "cross_view_premium_reserve_or_unallocated_qf_bonus"
    | "common_ground_budget_after_hard_gates";
}

export interface MpgfPublicGoodsEcmRulebookReport {
  ok: true;
  roundId: string;
  policy: typeof MPGF_PUBLIC_GOODS_ECM_CORE_RULEBOOK_POLICY;
  mechanism: {
    abbreviation: "CRECM";
    fullTechnicalLabel: "Coalition-Routed Escrowed Conditional Matching v1.125";
    technicalLabel: "CRECM v1.125";
    legacyMechanismLabel: "Verified Assurance Matching pilot";
    userFacingLabel: "Common Ground Budget";
    currentProductLabelPolicy: "common_ground_budget_public_goods_fund_crecm_v1_125";
    sourceSpec: "moralpublicgoods131.md";
    deploymentFlag: "crecm_v1_125";
    featureFlag: ReturnType<typeof getMpgfMechanismVersionFeatureFlag>;
    notPureMechanism: [
      "not_pure_assurance",
      "not_pure_quadratic_funding",
      "not_pure_matching",
      "not_pure_ecm_without_common_ground_budget",
      "not_pure_vcqa",
    ];
  };
  ecmPlusHybridPolicy: typeof MPGF_PUBLIC_GOODS_ECM_PLUS_HYBRID_POLICY;
  batchCadencePolicy: typeof MPGF_PUBLIC_GOODS_BATCH_CADENCE_POLICY;
  custodyPolicy: typeof MPGF_PUBLIC_GOODS_CUSTODY_POLICY;
  recipientRegistryPolicy: typeof MPGF_PUBLIC_GOODS_RECIPIENT_REGISTRY_POLICY;
  refundReroutePolicy: typeof MPGF_PUBLIC_GOODS_REFUND_REROUTE_POLICY;
  crossViewSubsidyPolicy: typeof MPGF_PUBLIC_GOODS_CROSS_VIEW_SUBSIDY_POLICY;
  roundRulebook: {
    openAt: string;
    closeAt: string;
    clearingAt: string;
    authorizationWindowPolicy: "save_method_first_authorize_near_clearing_not_round_open_hold";
    batchWindowMinDays: 7;
    batchWindowMaxDays: 14;
    baseMatchRatio: number;
    qfBonusEnabled: boolean;
    qfBonusCapMultiple: number;
    preserveCappedQfBreadthBonus: true;
    perDonorCapCents: number;
    sponsorPoolCents: number;
    sponsorPoolSegregation: "operating_funds_matching_funds_and_recipient_disbursement_records_are_separate";
    sponsorAuditPolicy: "publish_pool_size_rule_changes_source_types_and_round_allocation_hash";
  };
  separatedAccounting: {
    grossFeeNetRecipientSeparated: true;
    actualCountedMatchEligibleSeparated: true;
    matchEligibleDollarsOnlyUnlockSponsorMatch: true;
    feeQuotesMustBindFeePolicyHash: true;
    rewardsCreditsCertificatesExcludedFromPublicGoodDollars: true;
    plainSettlementSummaryGroups: typeof MPGF_CONTRIBUTION_SETTLEMENT_SUMMARY_GROUP_ORDER;
    plainSettlementSummaryDetailsDrawerRequired: true;
    plainSettlementSummaryFinalReceiptRequired: true;
    plainSummaryCannotCombineAccountingChannels: true;
  };
  clearingInputIntegrity: {
    roundClosePaymentCommitmentSnapshotsRequired: true;
    providerConfirmedPaymentMethodReferenceRequired: true;
    roundCloseClearingInputBundleRequired: true;
    clearingBundleHashAndComponentHashesRequired: true;
    frozenProjectInputsRequired: true;
    frozenSponsorCommitmentInputsRequired: true;
    frozenReciprocalMoralBucketSnapshotRequired: true;
    bundleDerivedRowCountGuardsRequired: true;
  };
  clearingContract: ReturnType<typeof buildMpgfCrecV1125ClearingContractSummary>;
  hardGatesV1125: {
    projectScopeState: "valid_moral_public_good";
    externalityStateRequired: "clear";
    baselineIntegrityStateRequired: "approved";
    baselineConfidenceStateRequired: "approved";
    actionEvidenceStateRequired: "approved";
    challengeStateAllowed: ["clear", "non_blocking"];
    fiscalHostConflictReviewRequired: true;
    finalSponsorBackingGatedByBundle: true;
    projectDestinationRouteValidated: true;
  };
  sponsorPoolBacking: {
    poolSpecificBackingRequired: true;
    sponsorCommitmentStatesAllowed: ["contractually_committed", "funded", "escrowed"];
    poolTypes: ["base_match", "bonus_match", "failure_bonus", "fee_support", "success_reward"];
    wrongRoundOrWrongPoolCommitmentsExcluded: true;
    phantomMatchingBlocked: true;
  };
  batchEngine: {
    recurringCadence: "one_to_two_week_batch_rounds";
    stages: [
      "round_open",
      "round_close",
      "batch_clear_cross_view_conditions",
      "just_in_time_authorization_or_partner_custody",
      "recipient_verification_and_challenge_window",
      "capture_release_cancel_or_reroute",
      "audit_publication",
    ];
    fixedCadencePublishedBeforeRoundOpen: true;
    longLivedRoundOpenHoldsAllowed: false;
  };
  refundAndReroute: {
    policy: typeof MPGF_PUBLIC_GOODS_REFUND_REROUTE_POLICY;
    unmatchedBatchMode: "expire_without_charge_or_release_authorization";
    recipientVerificationFailureMode: "release_authorization_or_refund_if_captured_or_reroute_under_donor_choice";
    donorChoices: [
      "expire_without_charge",
      "release_authorization",
      "refund_captured_funds_when_provider_supports",
      "reroute_to_next_eligible_common_ground_project",
    ];
    donorDecisionDeadlineHours: 72;
    silentFailureAllowed: false;
    publicOutcomeLogRequired: true;
  };
  crossViewSubsidySchedule: {
    policy: typeof MPGF_PUBLIC_GOODS_CROSS_VIEW_SUBSIDY_POLICY;
    appliesAfterBaseMatch: true;
    preservesCappedQfBreadthBonus: true;
    maxPremiumBps: 1_500;
    premiumCapPolicy: "cross_view_premium_never_exceeds_direct_eligible_amount_remaining_sponsor_budget_or_donor_cap";
    moralReputationCanIncreasePremium: false;
    rows: MpgfPublicGoodsCrossViewSubsidyScheduleRow[];
  };
  custodyAndRelease: {
    postClearCustodialState: "awaiting_partner_or_fiscal_host_custody_confirmation";
    escrowClaimAllowed: false;
    legallyApprovedEscrowWordingRequired: true;
    releaseOnlyAfterRecipientVerification: true;
    releaseOnlyAfterChallengeWindowCompletion: true;
    donorFailureHandling: [
      "expire_without_charge_if_round_does_not_clear",
      "release_authorization_if_recipient_verification_fails",
      "reroute_only_under_donor_configured_fallback",
      "reauthorize_only_after_clearance_reconfirmed_if_provider_authorization_expires",
    ];
  };
  donorDisclosure: {
    maxExposureRequiredBeforeAuthorization: true;
    exactClearanceConditionsRequiredBeforeAuthorization: true;
    failureStatesRequiredBeforeAuthorization: true;
    authorizationExpiryRequiredBeforeAuthorization: true;
    counterpartBucketsRequired: true;
    minimumCounterpartyVolumeRequired: true;
    savedPaymentMethodIsNotHoldAuthorizationCustodyOrEscrow: true;
    finalReviewConsentBoundaryRequired: true;
    sealedProgressDisclosureRequired: true;
    separatedAccountingLedgerRequired: true;
  };
  simplifiedUserFlow: {
    steps: ["budget", "projects", "review"];
    suggestedDefaultsBindingOnlyAfterFinalReviewSave: true;
    plainLanguageLabelsMapToCanonicalRecords: true;
    primaryCtaDoesNotCreateBindingIntent: true;
  };
  participantIncentives: {
    successRewardsFromBackedSponsorPoolOnly: true;
    coordinationCreditsNonTransferableAndNoAllocationPower: true;
    impactCertificatesForCapturedSuccessfulContributionRowsOnly: true;
    noLateAccessForNonSignersOrLateSigners: true;
  };
  publicCopyValidation: ReturnType<typeof validateMpgfCrecPublishedCopyBundle>;
  failureBonusControls: {
    thresholdFamilyFailureReasonsOnly: [
      "threshold_amount_shortfall",
      "verified_supporter_shortfall",
      "active_cluster_shortfall",
      "counterparty_volume_shortfall",
    ];
    participantRoundCapRequired: true;
    backedFailureBonusPoolRequired: true;
    claimantConflictSnapshotMustBeNoConflict: true;
    idempotentClaimKey: "(roundId,projectId,participantId,conditionalTradeIntentId)";
  };
  identityAndAntiSybil: {
    publicPolicy: "unique_human_counting_payment_method_checks_and_anomaly_review_affect_subsidy_eligibility_only";
    moralReputationCanIncreaseAllocationPower: false;
    noGlobalMoralRanking: true;
    privateProviderPayloadsPubliclyExposed: false;
  };
  preservedInvariants: {
    noGlobalMoralRanking: true;
    participantRelativeScoresOnly: true;
    antiThreatAndBaselineIntegrityAreBlockingGates: true;
    privacySafePreviewsAndRedactionFirstDefaults: true;
    challengeAndAppealLanesWithHumanReview: true;
    immutableProvenanceForRelianceBearingChanges: true;
    publishedApiAndSchemaContracts: true;
  };
  recipientEligibilityRules: {
    launchBias: "registered_nonprofits_fiscal_hosts_or_auditable_public_goods_projects_first";
    payableOnlyIfRegistryStatusEligible: true;
    objectiveReceiptOrMilestoneEvidenceRequired: true;
    antiThreatAndBaselineReviewRequired: true;
    challengeWindowMustCloseBeforeRelease: true;
    taxAndDonationReceiptClaimsMustMatchPayoutRail: true;
  };
  recipientRegistry: MpgfPublicGoodsRecipientRegistryRow[];
  calcHash: string;
}

function calcHash(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function addHours(value: string, hours: number) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return new Date(0).toISOString();
  }

  return new Date(timestamp + hours * 60 * 60 * 1000).toISOString();
}

function numberRestriction(pool: MpgfPublicGoodsMatchPool, key: string, fallback: number) {
  const value = Number(pool.restrictionsJson[key]);

  return Number.isFinite(value) ? value : fallback;
}

function recipientRegistryStatus(campaign: MpgfPublicGoodsCampaign): MpgfPublicGoodsRecipientRegistryRow["registryStatus"] {
  if (campaign.reviewStatus === "blocked") {
    return "blocked_not_payable";
  }

  if (campaign.destinationType === "internal_demo_pool") {
    return "demo_only_not_payable";
  }

  return campaign.reviewStatus === "approved" || campaign.reviewStatus === "finalized"
    ? "eligible_after_review_and_challenge"
    : "review_required_before_payable";
}

function payoutRail(campaign: MpgfPublicGoodsCampaign): MpgfPublicGoodsRecipientRegistryRow["payoutRail"] {
  if (campaign.destinationType === "fiscal_host") {
    return "fiscal_host_release";
  }

  if (campaign.destinationType === "signed_sponsor_route") {
    return "signed_sponsor_route";
  }

  return campaign.destinationType === "external_charity" ? "partner_donation_route" : "not_payable_demo_only";
}

function buildRecipientRegistry(campaigns: MpgfPublicGoodsCampaign[]): MpgfPublicGoodsRecipientRegistryRow[] {
  return campaigns.map((campaign) => ({
    campaignId: campaign.id,
    title: campaign.title,
    legalEntityOrFiscalHost: campaign.destinationRef,
    destinationType: campaign.destinationType,
    registryStatus: recipientRegistryStatus(campaign),
    payoutRail: payoutRail(campaign),
    allowedUses: campaign.causeTags,
    receiptOrMilestoneRules: campaign.verificationMethod,
    reviewState: campaign.reviewStatus,
    challengeState: campaign.challengeWindowEndsAt ? "challenge_window_open" : "closed_or_not_open",
    challengeWindowEndsAt: campaign.challengeWindowEndsAt ?? null,
  }));
}

function buildCrossViewSubsidySchedule(): MpgfPublicGoodsCrossViewSubsidyScheduleRow[] {
  return [
    {
      tier: "same_view_or_single_bucket",
      premiumBps: 0,
      condition: "ordinary campaign support without distinct counterpart-bucket clearing",
      sponsorBudgetSource: "none",
    },
    {
      tier: "two_distinct_moral_buckets",
      premiumBps: 1_000,
      condition: "at least two distinct moral buckets clear donor-declared counterpart constraints",
      sponsorBudgetSource: "cross_view_premium_reserve_or_unallocated_qf_bonus",
    },
    {
      tier: "three_or_more_distinct_moral_buckets",
      premiumBps: 1_500,
      condition: "three or more distinct moral buckets clear in the same batch without hard-gate failures",
      sponsorBudgetSource: "cross_view_premium_reserve_or_unallocated_qf_bonus",
    },
    {
      tier: "weak_common_ground_support_routed",
      premiumBps: 500,
      condition: "aggregate weak-support budget routes to a threshold-feasible common-ground project",
      sponsorBudgetSource: "common_ground_budget_after_hard_gates",
    },
  ];
}

export function buildMpgfPublicGoodsEcmRulebookReport({
  campaigns = demoMpgfPublicGoodsCampaigns,
  matchPool = demoMpgfMatchPool,
  round = demoMpgfAssuranceRound,
}: {
  campaigns?: MpgfPublicGoodsCampaign[];
  matchPool?: MpgfPublicGoodsMatchPool;
  round?: MpgfPublicGoodsRound;
} = {}): MpgfPublicGoodsEcmRulebookReport {
  const recipientRegistry = buildRecipientRegistry(campaigns);
  const crossViewSubsidyRows = buildCrossViewSubsidySchedule();
  const rulebook = {
    openAt: round.startsAt,
    closeAt: round.endsAt,
    clearingAt: addHours(round.endsAt, 1),
    authorizationWindowPolicy: "save_method_first_authorize_near_clearing_not_round_open_hold" as const,
    batchWindowMinDays: 7 as const,
    batchWindowMaxDays: 14 as const,
    baseMatchRatio: matchPool.baseMatchRatio,
    qfBonusEnabled: round.qfEnabled,
    qfBonusCapMultiple: round.qfCapMultiple,
    preserveCappedQfBreadthBonus: true as const,
    perDonorCapCents: Math.floor(numberRestriction(matchPool, "perDonorQfCapCents", 10_000)),
    sponsorPoolCents: matchPool.budgetCents,
    sponsorPoolSegregation:
      "operating_funds_matching_funds_and_recipient_disbursement_records_are_separate" as const,
    sponsorAuditPolicy: "publish_pool_size_rule_changes_source_types_and_round_allocation_hash" as const,
  };
  const batchEngine = {
    recurringCadence: "one_to_two_week_batch_rounds" as const,
    stages: [
      "round_open",
      "round_close",
      "batch_clear_cross_view_conditions",
      "just_in_time_authorization_or_partner_custody",
      "recipient_verification_and_challenge_window",
      "capture_release_cancel_or_reroute",
      "audit_publication",
    ] as MpgfPublicGoodsEcmRulebookReport["batchEngine"]["stages"],
    fixedCadencePublishedBeforeRoundOpen: true as const,
    longLivedRoundOpenHoldsAllowed: false as const,
  };
  const refundAndReroute = {
    policy: MPGF_PUBLIC_GOODS_REFUND_REROUTE_POLICY as typeof MPGF_PUBLIC_GOODS_REFUND_REROUTE_POLICY,
    unmatchedBatchMode: "expire_without_charge_or_release_authorization" as const,
    recipientVerificationFailureMode: "release_authorization_or_refund_if_captured_or_reroute_under_donor_choice" as const,
    donorChoices: [
      "expire_without_charge",
      "release_authorization",
      "refund_captured_funds_when_provider_supports",
      "reroute_to_next_eligible_common_ground_project",
    ] as MpgfPublicGoodsEcmRulebookReport["refundAndReroute"]["donorChoices"],
    donorDecisionDeadlineHours: 72 as const,
    silentFailureAllowed: false as const,
    publicOutcomeLogRequired: true as const,
  };
  const crossViewSubsidySchedule = {
    policy: MPGF_PUBLIC_GOODS_CROSS_VIEW_SUBSIDY_POLICY as typeof MPGF_PUBLIC_GOODS_CROSS_VIEW_SUBSIDY_POLICY,
    appliesAfterBaseMatch: true as const,
    preservesCappedQfBreadthBonus: true as const,
    maxPremiumBps: 1_500 as const,
    premiumCapPolicy:
      "cross_view_premium_never_exceeds_direct_eligible_amount_remaining_sponsor_budget_or_donor_cap" as const,
    moralReputationCanIncreasePremium: false as const,
    rows: crossViewSubsidyRows,
  };
  const mechanism = {
    abbreviation: "CRECM" as const,
    fullTechnicalLabel: "Coalition-Routed Escrowed Conditional Matching v1.125" as const,
    technicalLabel: "CRECM v1.125" as const,
    legacyMechanismLabel: "Verified Assurance Matching pilot" as const,
    userFacingLabel: "Common Ground Budget" as const,
    currentProductLabelPolicy: "common_ground_budget_public_goods_fund_crecm_v1_125" as const,
    sourceSpec: "moralpublicgoods131.md" as const,
    deploymentFlag: "crecm_v1_125" as const,
    featureFlag: getMpgfMechanismVersionFeatureFlag(),
    notPureMechanism: [
      "not_pure_assurance",
      "not_pure_quadratic_funding",
      "not_pure_matching",
      "not_pure_ecm_without_common_ground_budget",
      "not_pure_vcqa",
    ] as MpgfPublicGoodsEcmRulebookReport["mechanism"]["notPureMechanism"],
  };
  const separatedAccounting = {
    grossFeeNetRecipientSeparated: true as const,
    actualCountedMatchEligibleSeparated: true as const,
    matchEligibleDollarsOnlyUnlockSponsorMatch: true as const,
    feeQuotesMustBindFeePolicyHash: true as const,
    rewardsCreditsCertificatesExcludedFromPublicGoodDollars: true as const,
    plainSettlementSummaryGroups: MPGF_CONTRIBUTION_SETTLEMENT_SUMMARY_GROUP_ORDER,
    plainSettlementSummaryDetailsDrawerRequired: true as const,
    plainSettlementSummaryFinalReceiptRequired: true as const,
    plainSummaryCannotCombineAccountingChannels: true as const,
  };
  const clearingInputIntegrity = {
    roundClosePaymentCommitmentSnapshotsRequired: true as const,
    providerConfirmedPaymentMethodReferenceRequired: true as const,
    roundCloseClearingInputBundleRequired: true as const,
    clearingBundleHashAndComponentHashesRequired: true as const,
    frozenProjectInputsRequired: true as const,
    frozenSponsorCommitmentInputsRequired: true as const,
    frozenReciprocalMoralBucketSnapshotRequired: true as const,
    bundleDerivedRowCountGuardsRequired: true as const,
  };
  const clearingContract = buildMpgfCrecV1125ClearingContractSummary();
  const hardGatesV1125 = {
    projectScopeState: "valid_moral_public_good" as const,
    externalityStateRequired: "clear" as const,
    baselineIntegrityStateRequired: "approved" as const,
    baselineConfidenceStateRequired: "approved" as const,
    actionEvidenceStateRequired: "approved" as const,
    challengeStateAllowed: ["clear", "non_blocking"] as MpgfPublicGoodsEcmRulebookReport["hardGatesV1125"]["challengeStateAllowed"],
    fiscalHostConflictReviewRequired: true as const,
    finalSponsorBackingGatedByBundle: true as const,
    projectDestinationRouteValidated: true as const,
  };
  const sponsorPoolBacking = {
    poolSpecificBackingRequired: true as const,
    sponsorCommitmentStatesAllowed: ["contractually_committed", "funded", "escrowed"] as MpgfPublicGoodsEcmRulebookReport["sponsorPoolBacking"]["sponsorCommitmentStatesAllowed"],
    poolTypes: ["base_match", "bonus_match", "failure_bonus", "fee_support", "success_reward"] as MpgfPublicGoodsEcmRulebookReport["sponsorPoolBacking"]["poolTypes"],
    wrongRoundOrWrongPoolCommitmentsExcluded: true as const,
    phantomMatchingBlocked: true as const,
  };
  const simplifiedUserFlow = {
    steps: ["budget", "projects", "review"] as MpgfPublicGoodsEcmRulebookReport["simplifiedUserFlow"]["steps"],
    suggestedDefaultsBindingOnlyAfterFinalReviewSave: true as const,
    plainLanguageLabelsMapToCanonicalRecords: true as const,
    primaryCtaDoesNotCreateBindingIntent: true as const,
  };
  const participantIncentives = {
    successRewardsFromBackedSponsorPoolOnly: true as const,
    coordinationCreditsNonTransferableAndNoAllocationPower: true as const,
    impactCertificatesForCapturedSuccessfulContributionRowsOnly: true as const,
    noLateAccessForNonSignersOrLateSigners: true as const,
  };
  const failureBonusControls = {
    thresholdFamilyFailureReasonsOnly: [
      "threshold_amount_shortfall",
      "verified_supporter_shortfall",
      "active_cluster_shortfall",
      "counterparty_volume_shortfall",
    ] as MpgfPublicGoodsEcmRulebookReport["failureBonusControls"]["thresholdFamilyFailureReasonsOnly"],
    participantRoundCapRequired: true as const,
    backedFailureBonusPoolRequired: true as const,
    claimantConflictSnapshotMustBeNoConflict: true as const,
    idempotentClaimKey: "(roundId,projectId,participantId,conditionalTradeIntentId)" as const,
  };
  const custodyAndRelease = {
    postClearCustodialState: "awaiting_partner_or_fiscal_host_custody_confirmation" as const,
    escrowClaimAllowed: false as const,
    legallyApprovedEscrowWordingRequired: true as const,
    releaseOnlyAfterRecipientVerification: true as const,
    releaseOnlyAfterChallengeWindowCompletion: true as const,
    donorFailureHandling: [
      "expire_without_charge_if_round_does_not_clear",
      "release_authorization_if_recipient_verification_fails",
      "reroute_only_under_donor_configured_fallback",
      "reauthorize_only_after_clearance_reconfirmed_if_provider_authorization_expires",
    ] as MpgfPublicGoodsEcmRulebookReport["custodyAndRelease"]["donorFailureHandling"],
  };
  const publicCopyValidation = validateMpgfCrecPublishedCopyBundle(
    [
      {
        surface: "mpgf-real-money-terms",
        text: `${MPGF_COPY.realMoneyContribution} ${MPGF_COPY.not_escrow} ${MPGF_COPY.not_guaranteed_effectiveness}`,
      },
      {
        surface: "mpgf-common-ground-budget-review",
        text:
          "No charge now; saved payment methods or JIT authorizations are not escrow, custody, funds held, or payment protection.",
      },
      {
        surface: "mpgf-contributor-benefits",
        text:
          "Contributor-only benefits require captured successful rows and never affect allocation power.",
      },
      {
        surface: "public-goods-entry-page",
        text:
          "Public Goods Fund pages explain matching and impact records without guaranteeing matching, impact, outcomes, effectiveness, escrow, custody, or payment protection.",
      },
    ],
    {
      paymentCaptureAllowed: false,
      postClearPaymentAuthorizationRecorded: false,
      escrowClaimAllowed: custodyAndRelease.escrowClaimAllowed,
      custodyState: custodyAndRelease.postClearCustodialState,
      baseMatchPoolBacked: sponsorPoolBacking.poolSpecificBackingRequired,
      bonusMatchPoolBacked: sponsorPoolBacking.poolSpecificBackingRequired,
      successRewardPoolFullyBacked: false,
      coordinationCreditsEnabledForCapturedRows:
        participantIncentives.coordinationCreditsNonTransferableAndNoAllocationPower,
      impactCertificatesEnabledForCapturedRows:
        participantIncentives.impactCertificatesForCapturedSuccessfulContributionRowsOnly,
      capturedContributionRowsAvailable: false,
      impactOutcomeClaimAllowed: false,
      donationInsuranceClaimAllowed: false,
    },
  );

  return {
    ok: true,
    roundId: round.id,
    policy: MPGF_PUBLIC_GOODS_ECM_CORE_RULEBOOK_POLICY,
    mechanism,
    ecmPlusHybridPolicy: MPGF_PUBLIC_GOODS_ECM_PLUS_HYBRID_POLICY,
    batchCadencePolicy: MPGF_PUBLIC_GOODS_BATCH_CADENCE_POLICY,
    custodyPolicy: MPGF_PUBLIC_GOODS_CUSTODY_POLICY,
    recipientRegistryPolicy: MPGF_PUBLIC_GOODS_RECIPIENT_REGISTRY_POLICY,
    refundReroutePolicy: MPGF_PUBLIC_GOODS_REFUND_REROUTE_POLICY,
    crossViewSubsidyPolicy: MPGF_PUBLIC_GOODS_CROSS_VIEW_SUBSIDY_POLICY,
    roundRulebook: rulebook,
    separatedAccounting,
    clearingInputIntegrity,
    clearingContract,
    hardGatesV1125,
    sponsorPoolBacking,
    batchEngine,
    refundAndReroute,
    crossViewSubsidySchedule,
    custodyAndRelease,
    donorDisclosure: {
      maxExposureRequiredBeforeAuthorization: true,
      exactClearanceConditionsRequiredBeforeAuthorization: true,
      failureStatesRequiredBeforeAuthorization: true,
      authorizationExpiryRequiredBeforeAuthorization: true,
      counterpartBucketsRequired: true,
      minimumCounterpartyVolumeRequired: true,
      savedPaymentMethodIsNotHoldAuthorizationCustodyOrEscrow: true,
      finalReviewConsentBoundaryRequired: true,
      sealedProgressDisclosureRequired: true,
      separatedAccountingLedgerRequired: true,
    },
    simplifiedUserFlow,
    participantIncentives,
    publicCopyValidation,
    failureBonusControls,
    identityAndAntiSybil: {
      publicPolicy: "unique_human_counting_payment_method_checks_and_anomaly_review_affect_subsidy_eligibility_only",
      moralReputationCanIncreaseAllocationPower: false,
      noGlobalMoralRanking: true,
      privateProviderPayloadsPubliclyExposed: false,
    },
    preservedInvariants: {
      noGlobalMoralRanking: true,
      participantRelativeScoresOnly: true,
      antiThreatAndBaselineIntegrityAreBlockingGates: true,
      privacySafePreviewsAndRedactionFirstDefaults: true,
      challengeAndAppealLanesWithHumanReview: true,
      immutableProvenanceForRelianceBearingChanges: true,
      publishedApiAndSchemaContracts: true,
    },
    recipientEligibilityRules: {
      launchBias: "registered_nonprofits_fiscal_hosts_or_auditable_public_goods_projects_first",
      payableOnlyIfRegistryStatusEligible: true,
      objectiveReceiptOrMilestoneEvidenceRequired: true,
      antiThreatAndBaselineReviewRequired: true,
      challengeWindowMustCloseBeforeRelease: true,
      taxAndDonationReceiptClaimsMustMatchPayoutRail: true,
    },
    recipientRegistry,
    calcHash: calcHash([
      round.id,
      rulebook,
      batchEngine,
      refundAndReroute,
      crossViewSubsidySchedule,
      custodyAndRelease,
      mechanism,
      separatedAccounting,
      clearingInputIntegrity,
      clearingContract,
      hardGatesV1125,
      sponsorPoolBacking,
      simplifiedUserFlow,
      participantIncentives,
      publicCopyValidation,
      failureBonusControls,
      MPGF_PUBLIC_GOODS_ECM_PLUS_HYBRID_POLICY,
      recipientRegistry.map((recipient) => [recipient.campaignId, recipient.registryStatus, recipient.payoutRail]),
    ]),
  };
}

export function getMpgfPublicGoodsEcmRulebookReportApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  return buildMpgfPublicGoodsEcmRulebookReport();
}
