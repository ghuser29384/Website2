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

export interface MpgfPublicGoodsEcmRulebookReport {
  ok: true;
  roundId: string;
  policy: typeof MPGF_PUBLIC_GOODS_ECM_CORE_RULEBOOK_POLICY;
  batchCadencePolicy: typeof MPGF_PUBLIC_GOODS_BATCH_CADENCE_POLICY;
  custodyPolicy: typeof MPGF_PUBLIC_GOODS_CUSTODY_POLICY;
  recipientRegistryPolicy: typeof MPGF_PUBLIC_GOODS_RECIPIENT_REGISTRY_POLICY;
  roundRulebook: {
    openAt: string;
    closeAt: string;
    clearingAt: string;
    authorizationWindowPolicy: "save_method_first_authorize_near_clearing_not_round_open_hold";
    baseMatchRatio: number;
    qfBonusEnabled: boolean;
    qfBonusCapMultiple: number;
    perDonorCapCents: number;
    sponsorPoolCents: number;
    sponsorPoolSegregation: "operating_funds_matching_funds_and_recipient_disbursement_records_are_separate";
    sponsorAuditPolicy: "publish_pool_size_rule_changes_source_types_and_round_allocation_hash";
  };
  batchEngine: {
    recurringCadence: "pilot_weekly_or_operator_configured_short_batches";
    stages: [
      "round_open",
      "round_close",
      "batch_clear_cross_view_conditions",
      "just_in_time_authorization_or_partner_custody",
      "recipient_verification_and_challenge_window",
      "capture_release_cancel_or_reroute",
      "audit_publication",
    ];
    longLivedRoundOpenHoldsAllowed: false;
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
  const rulebook = {
    openAt: round.startsAt,
    closeAt: round.endsAt,
    clearingAt: addHours(round.endsAt, 1),
    authorizationWindowPolicy: "save_method_first_authorize_near_clearing_not_round_open_hold" as const,
    baseMatchRatio: matchPool.baseMatchRatio,
    qfBonusEnabled: round.qfEnabled,
    qfBonusCapMultiple: round.qfCapMultiple,
    perDonorCapCents: Math.floor(numberRestriction(matchPool, "perDonorQfCapCents", 10_000)),
    sponsorPoolCents: matchPool.budgetCents,
    sponsorPoolSegregation:
      "operating_funds_matching_funds_and_recipient_disbursement_records_are_separate" as const,
    sponsorAuditPolicy: "publish_pool_size_rule_changes_source_types_and_round_allocation_hash" as const,
  };
  const batchEngine = {
    recurringCadence: "pilot_weekly_or_operator_configured_short_batches" as const,
    stages: [
      "round_open",
      "round_close",
      "batch_clear_cross_view_conditions",
      "just_in_time_authorization_or_partner_custody",
      "recipient_verification_and_challenge_window",
      "capture_release_cancel_or_reroute",
      "audit_publication",
    ] as MpgfPublicGoodsEcmRulebookReport["batchEngine"]["stages"],
    longLivedRoundOpenHoldsAllowed: false as const,
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
    batchCadencePolicy: MPGF_PUBLIC_GOODS_BATCH_CADENCE_POLICY,
    custodyPolicy: MPGF_PUBLIC_GOODS_CUSTODY_POLICY,
    recipientRegistryPolicy: MPGF_PUBLIC_GOODS_RECIPIENT_REGISTRY_POLICY,
    roundRulebook: rulebook,
    batchEngine,
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
    recipientRegistry,
    calcHash: calcHash([
      round.id,
      rulebook,
      batchEngine,
      custodyAndRelease,
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
