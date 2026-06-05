import { createHash } from "node:crypto";

import {
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
} from "./data";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsMatchPool,
  MpgfPublicGoodsRound,
} from "./types";

export const MPGF_PUBLIC_GOODS_ECM_CORE_RULEBOOK_POLICY =
  "ecm_core_supervised_custody_cross_view_batch_rulebook_v1";

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

  return {
    ok: true,
    roundId: round.id,
    policy: MPGF_PUBLIC_GOODS_ECM_CORE_RULEBOOK_POLICY,
    ecmPlusHybridPolicy: MPGF_PUBLIC_GOODS_ECM_PLUS_HYBRID_POLICY,
    batchCadencePolicy: MPGF_PUBLIC_GOODS_BATCH_CADENCE_POLICY,
    custodyPolicy: MPGF_PUBLIC_GOODS_CUSTODY_POLICY,
    recipientRegistryPolicy: MPGF_PUBLIC_GOODS_RECIPIENT_REGISTRY_POLICY,
    refundReroutePolicy: MPGF_PUBLIC_GOODS_REFUND_REROUTE_POLICY,
    crossViewSubsidyPolicy: MPGF_PUBLIC_GOODS_CROSS_VIEW_SUBSIDY_POLICY,
    roundRulebook: rulebook,
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
    },
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
