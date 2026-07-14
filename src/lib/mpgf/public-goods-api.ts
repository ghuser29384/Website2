import { createHash } from "node:crypto";

import {
  demoMpgfAssurancePledges,
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
  demoMpgfPublicGoodsReviewCases,
} from "./data";
import {
  allocateMpgfAssuranceRound,
  countMpgfQfContributionCents,
  getMpgfCampaignAssuranceStatus,
  mpgfVerificationWeightFromHumanScoreBps,
} from "./mechanism";
import { buildMpgfPublicGoodsAllocationSourceProofMap } from "./public-goods-allocation-results";
import {
  MPGF_PUBLIC_GOODS_CG_VQAF_POLICY,
  MPGF_PUBLIC_GOODS_COMMON_GROUND_DISCOVERY_POLICY,
  buildMpgfPublicGoodsCgVqafReport,
  buildMpgfPublicGoodsCommonGroundDiscovery,
  buildMpgfPublicGoodsSupportSignalContractApi,
  type MpgfPublicGoodsSupportSignal,
} from "./public-goods-cg-vqaf";
import {
  MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CHOICE_POLICY,
  MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_FALLBACK_POLICY,
  MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY,
  MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_POLICY,
  MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_REQUIREMENT_CODES,
} from "./public-goods-common-ground-budget";
import {
  MPGF_PUBLIC_GOODS_COALITION_ROUTING_POLICY,
  buildMpgfPublicGoodsCoalitionRoutingReport,
} from "./public-goods-coalition-routing";
import { buildMpgfPublicGoodsContributionFlowApi } from "./public-goods-contribution-intents";
import {
  MPGF_PUBLIC_GOODS_ECM_CORE_RULEBOOK_POLICY,
  buildMpgfPublicGoodsEcmRulebookReport,
} from "./public-goods-ecm-rulebook";
import { MPGF_PUBLIC_GOODS_FINALIZATION_POLICY } from "./public-goods-finalization";
import { MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_POLICY } from "./public-goods-governance-ballots";
import {
  MPGF_PUBLIC_GOODS_IDENTITY_INTEGRITY_POLICY,
  buildMpgfPublicGoodsIdentityIntegrityReport,
} from "./public-goods-identity-integrity";
import { buildMpgfPublicGoodsKpiSnapshot } from "./public-goods-kpis";
import { buildMpgfPublicGoodsMilestoneSchedule } from "./public-goods-milestones";
import {
  MPGF_PUBLIC_GOODS_POSTMORTEM_POLICY,
  buildMpgfPublicGoodsPostmortemReport,
} from "./public-goods-postmortem";
import { buildMpgfPublicGoodsProceduralBadgeLedger } from "./public-goods-procedural-badges";
import { buildMpgfPublicGoodsSponsorPoolFlywheel } from "./public-goods-sponsor-flywheel";
import {
  MPGF_PUBLIC_GOODS_THRESHOLD_CALIBRATION_POLICY,
  buildMpgfPublicGoodsThresholdCalibrationReport,
} from "./public-goods-threshold-calibration";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsMatchPool,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsReviewCase,
  MpgfPublicGoodsRound,
  MpgfPublicGoodsRoundAllocation,
} from "./types";

export const MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY = "aggregate_only_no_private_evidence_urls_contact_data_or_supporter_reasons";
export const MPGF_PUBLIC_GOODS_API_CACHE_CONTROL = "no-store, max-age=0";
export const MPGF_PUBLIC_GOODS_API_HEADERS = {
  "Cache-Control": MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
} as const;
export const MPGF_PUBLIC_GOODS_SEALED_PROGRESS_POLICY =
  "sealed_progress_no_exact_threshold_counterparty_or_match_before_round_close";

const MPGF_PUBLIC_GOODS_SEALED_PROGRESS_FIELDS = [
  "directEligibleCents",
  "countedForMatchCents",
  "verifiedDonorCount",
  "thresholdPassed",
  "campaignStatus",
  "matchEstimateCents",
  "baseMatchCents",
  "qfBonusCents",
  "qfScore",
  "allocationTotals",
  "coalitionRoutingLiveProgress",
] as const;

export interface MpgfPublicGoodsPublicApiOptions {
  incidentStatusByCampaignId?: Record<string, "clear" | "frozen" | "resolved" | undefined>;
}

function nowMs() {
  return new Date("2026-05-31T12:00:00.000Z").getTime();
}

function secondsUntil(value: string) {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.floor((parsed - nowMs()) / 1000));
}

function sealedProgressForRound(round: Pick<MpgfPublicGoodsRound, "endsAt">) {
  const active = secondsUntil(round.endsAt) > 0;

  return {
    policy: MPGF_PUBLIC_GOODS_SEALED_PROGRESS_POLICY,
    active,
    exactPublicProgressVisible: !active,
    redactedUntil: active ? round.endsAt : null,
    publicExactAggregatesSurface: active ? "post_close_final_reports_or_audit_bundles_only" : "post_close_public_report",
    redactedFields: active ? [...MPGF_PUBLIC_GOODS_SEALED_PROGRESS_FIELDS] : [],
  };
}

function sealNumber(sealed: boolean, value: number) {
  return sealed ? null : value;
}

function sealBoolean(sealed: boolean, value: boolean) {
  return sealed ? null : value;
}

function sealString<T extends string>(sealed: boolean, value: T) {
  return sealed ? "sealed_before_close" : value;
}

function publicCalcHash(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function campaignPledges(campaignId: string, pledges = demoMpgfAssurancePledges) {
  return pledges.filter((pledge) => pledge.campaignId === campaignId);
}

function collapseEligiblePublicDonors(pledges: MpgfPublicGoodsPledge[]) {
  const byDonor = new Map<string, { grossCents: number; humanScoreBps: number }>();

  for (const pledge of pledges) {
    if (pledge.status !== "pledged" && pledge.status !== "captured") {
      continue;
    }

    if (pledge.eligibilityState !== "eligible") {
      continue;
    }

    const existing = byDonor.get(pledge.userId);

    if (!existing) {
      byDonor.set(pledge.userId, {
        grossCents: pledge.amountCents,
        humanScoreBps: pledge.humanScoreBps,
      });
      continue;
    }

    existing.grossCents += pledge.amountCents;
    existing.humanScoreBps = Math.max(existing.humanScoreBps, pledge.humanScoreBps);
  }

  return [...byDonor.values()];
}

function countedForMatchCents(pledges: MpgfPublicGoodsPledge[]) {
  return collapseEligiblePublicDonors(pledges).reduce((sum, donor) => {
    const verificationWeight = mpgfVerificationWeightFromHumanScoreBps(donor.humanScoreBps);

    return sum + Math.floor(countMpgfQfContributionCents(donor.grossCents) * verificationWeight);
  }, 0);
}

function latestReviewSummary(campaignId: string, reviewCases = demoMpgfPublicGoodsReviewCases) {
  const relevant = reviewCases.filter((reviewCase) => reviewCase.campaignId === campaignId);
  const latest = relevant.at(-1);

  return {
    reviewCaseCount: relevant.length,
    latestState: latest?.state ?? "submitted",
    latestReasonCode: latest?.reasonCode ?? "needs_destination_evidence",
    appealOpen: relevant.some((reviewCase) => reviewCase.appealStatus === "appeal_requested"),
    challengeOpen: relevant.some((reviewCase) => reviewCase.action === "challenge" && !reviewCase.closedAt),
  };
}

function incidentStateForCampaign(campaign: MpgfPublicGoodsCampaign, options: MpgfPublicGoodsPublicApiOptions = {}) {
  const configured = options.incidentStatusByCampaignId?.[campaign.id];

  if (configured === "frozen") {
    return "frozen" as const;
  }

  return campaign.reviewStatus === "blocked" ? ("frozen" as const) : ("clear" as const);
}

function publicCampaignProgress(
  campaign: MpgfPublicGoodsCampaign,
  options: MpgfPublicGoodsPublicApiOptions = {},
  input: {
    allocation?: MpgfPublicGoodsRoundAllocation;
    pledges?: MpgfPublicGoodsPledge[];
    reviewCases?: MpgfPublicGoodsReviewCase[];
    round?: MpgfPublicGoodsRound;
  } = {},
) {
  const sourcePledges = input.pledges ?? demoMpgfAssurancePledges;
  const pledges = campaignPledges(campaign.id, sourcePledges);
  const assurance = getMpgfCampaignAssuranceStatus(campaign, sourcePledges, new Date("2026-05-31T12:00:00.000Z"));
  const allocation = input.allocation ?? allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });
  const line = allocation.lines.find((candidate) => candidate.campaignId === campaign.id);
  const approvedMatchCents = (line?.baseMatchCents ?? 0) + (line?.qfBonusCents ?? 0);
  const reviewSummary = latestReviewSummary(campaign.id, input.reviewCases ?? demoMpgfPublicGoodsReviewCases);
  const incidentState = incidentStateForCampaign(campaign, options);
  const sealedProgress = sealedProgressForRound(input.round ?? demoMpgfAssuranceRound);
  const sealedProgressActive = sealedProgress.active;
  const matchPreviewHiddenByIncidentFreeze = incidentState === "frozen";

  return {
    campaignId: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    destinationType: campaign.destinationType,
    causeTags: campaign.causeTags,
    sealedProgress,
    directEligibleCents: sealNumber(sealedProgressActive, assurance.directEligibleCents),
    countedForMatchCents: sealNumber(sealedProgressActive, countedForMatchCents(pledges)),
    verifiedDonorCount: sealNumber(sealedProgressActive, assurance.verifiedSupporterCount),
    thresholdAmountCents: campaign.thresholdAmountCents,
    thresholdDonors: campaign.thresholdSupporters,
    thresholdPassed: sealBoolean(sealedProgressActive, assurance.thresholdPassed),
    reviewStatus: campaign.reviewStatus,
    campaignStatus: sealString(sealedProgressActive, assurance.status),
    matchEstimateCents: sealedProgressActive || matchPreviewHiddenByIncidentFreeze ? null : approvedMatchCents,
    baseMatchCents: sealedProgressActive || matchPreviewHiddenByIncidentFreeze ? null : line?.baseMatchCents ?? 0,
    qfBonusCents: sealedProgressActive || matchPreviewHiddenByIncidentFreeze ? null : line?.qfBonusCents ?? 0,
    matchPreviewHiddenByIncidentFreeze: sealedProgressActive || matchPreviewHiddenByIncidentFreeze,
    milestoneSchedule: buildMpgfPublicGoodsMilestoneSchedule({ campaignId: campaign.id }).map((milestone) => ({
      id: milestone.id,
      ordinal: milestone.ordinal,
      releasePct: milestone.releasePct,
      status: milestone.status,
    })),
    reviewSummary,
    incidentState,
    appealState: reviewSummary.appealOpen ? "appeal_requested" : "none",
    campaignPath: `/mpgf/campaigns/${campaign.slug}`,
    proofPath: `/mpgf/pools/${campaign.slug}`,
    proofPathApiPath: `/api/mpgf/campaigns/${campaign.slug}/proof-path`,
  };
}

export function listMpgfPublicGoodsRoundsApi() {
  const allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });
  const sealedProgress = sealedProgressForRound(demoMpgfAssuranceRound);

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
    rounds: [
      {
        id: demoMpgfAssuranceRound.id,
        name: demoMpgfAssuranceRound.name,
        startsAt: demoMpgfAssuranceRound.startsAt,
        closesAt: demoMpgfAssuranceRound.endsAt,
        status: "open",
        sealedProgress,
        sponsorPoolCents: allocation.baseMatchBudgetCents + allocation.qfBonusBudgetCents,
        campaignCount: demoMpgfPublicGoodsCampaigns.length,
        verifiedDonorCount: sealNumber(
          sealedProgress.active,
          allocation.lines.reduce((sum, line) => sum + line.verifiedSupporterCount, 0),
        ),
        countdownSeconds: secondsUntil(demoMpgfAssuranceRound.endsAt),
      },
    ],
  };
}

export function buildMpgfPublicGoodsRoundApi({
  round,
  campaigns,
  matchPool,
  allocation,
  pledges = demoMpgfAssurancePledges,
  reviewCases = demoMpgfPublicGoodsReviewCases,
  supportSignals,
  dataSource = "demo_fixture",
}: {
  round: MpgfPublicGoodsRound;
  campaigns: MpgfPublicGoodsCampaign[];
  matchPool: MpgfPublicGoodsMatchPool;
  allocation: MpgfPublicGoodsRoundAllocation;
  pledges?: MpgfPublicGoodsPledge[];
  reviewCases?: MpgfPublicGoodsReviewCase[];
  supportSignals?: MpgfPublicGoodsSupportSignal[];
  dataSource?: "demo_fixture" | "database";
}) {
  const usesPersistedState = dataSource === "database";
  const sourceSupportSignals = supportSignals ?? (usesPersistedState ? [] : undefined);
  const paymentProofs = usesPersistedState ? [] : undefined;
  const subscriptions = usesPersistedState ? [] : undefined;
  const sponsorPoolFlywheel = buildMpgfPublicGoodsSponsorPoolFlywheel({
    pool: matchPool,
    round,
    subscriptions,
    includeDemoSeedEntries: !usesPersistedState,
  });
  const contributionFlow = buildMpgfPublicGoodsContributionFlowApi(round.id);
  const proceduralBadges = buildMpgfPublicGoodsProceduralBadgeLedger({
    round,
    pledges,
    reviewCases,
    paymentProofs,
    subscriptions,
  });
  const cgVqaf = buildMpgfPublicGoodsCgVqafReport({
    campaigns,
    pledges,
    round,
    matchPool,
    supportSignals: sourceSupportSignals,
  });
  const supportSignalContract = buildMpgfPublicGoodsSupportSignalContractApi(round.id);
  const commonGroundDiscovery = buildMpgfPublicGoodsCommonGroundDiscovery({
    campaigns,
    pledges,
    round,
    matchPool,
    supportSignals: sourceSupportSignals,
  });
  const coalitionRouting = buildMpgfPublicGoodsCoalitionRoutingReport({
    campaigns,
    pledges,
    round,
    matchPool,
    supportSignals: sourceSupportSignals,
  });
  const ecmRulebook = buildMpgfPublicGoodsEcmRulebookReport({
    campaigns,
    round,
    matchPool,
  });
  const identityIntegrity = buildMpgfPublicGoodsIdentityIntegrityReport({
    campaigns,
    pledges,
    round,
    matchPool,
    attestations: usesPersistedState ? [] : undefined,
  });
  const thresholdCalibration = buildMpgfPublicGoodsThresholdCalibrationReport({
    campaigns,
    pledges,
    round,
    matchPool,
  });
  const kpiSnapshot = buildMpgfPublicGoodsKpiSnapshot({
    campaigns,
    pledges,
    reviewCases,
    paymentProofs,
    subscriptions,
    round,
    matchPool,
    allocation,
    generatedAt: "2026-06-15T12:00:00.000Z",
    dataSource,
  });
  const postmortem = buildMpgfPublicGoodsPostmortemReport({
    round,
    kpiSnapshot,
    thresholdCalibration,
  });
  const sealedProgress = sealedProgressForRound(round);

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
    round: {
      id: round.id,
      name: round.name,
      startsAt: round.startsAt,
      closesAt: round.endsAt,
      status: "open",
      countdownSeconds: secondsUntil(round.endsAt),
      sealedProgress,
      qfEnabled: round.qfEnabled,
      qfCapMultiple: round.qfCapMultiple,
      supporterGate: round.supporterGate,
      sponsorPool: {
        id: matchPool.id,
        visibleCommitment: matchPool.visibleCommitment,
        budgetCents: matchPool.budgetCents,
        baseMatchBudgetCents: allocation.baseMatchBudgetCents,
        qfBonusBudgetCents: allocation.qfBonusBudgetCents,
        formulaVersion: allocation.formulaVersion,
        qfAllocationPolicy: allocation.qfAllocationPolicy,
        qfLambda: allocation.qfLambda,
        perDonorQfCapCents: matchPool.restrictionsJson.perDonorQfCapCents,
        verificationWeightPolicy: matchPool.restrictionsJson.verificationWeightPolicy,
        flywheelPolicy: sponsorPoolFlywheel.flywheelPolicy,
        flywheelPath: `/api/mpgf/sponsor-pools/${sponsorPoolFlywheel.poolId}`,
        depositPath: `/api/mpgf/sponsor-pools/${sponsorPoolFlywheel.poolId}/deposits`,
        tradeSurplusCommitPath: "/api/mpgf/trade-surplus/commit",
        tradeSurplusSettlePath: "/api/mpgf/trade-surplus/settle",
        flywheelAvailableForRoundCents: sponsorPoolFlywheel.availableForRoundCents,
        refillAutomationPolicy: sponsorPoolFlywheel.refillAutomation.policy,
        refillScheduledForRoundId: sponsorPoolFlywheel.refillAutomation.scheduledForRoundId,
        refillAvailableForNextRoundCents: sponsorPoolFlywheel.refillAutomation.availableForNextRoundCents,
        refillNoSponsorCampaignSteering: sponsorPoolFlywheel.refillAutomation.noSponsorCampaignSteering,
        flywheelSourceTypes: sponsorPoolFlywheel.sourceTypes,
      },
      contributionFlow,
      ecmRulebook: {
        policy: MPGF_PUBLIC_GOODS_ECM_CORE_RULEBOOK_POLICY,
        mechanism: ecmRulebook.mechanism,
        ecmPlusHybridPolicy: ecmRulebook.ecmPlusHybridPolicy,
        reportPath: `/api/mpgf/rounds/${round.id}/rulebook`,
        custodyPolicy: ecmRulebook.custodyPolicy,
        batchCadencePolicy: ecmRulebook.batchCadencePolicy,
        refundReroutePolicy: ecmRulebook.refundReroutePolicy,
        crossViewSubsidyPolicy: ecmRulebook.crossViewSubsidyPolicy,
        recipientRegistryPolicy: ecmRulebook.recipientRegistryPolicy,
        clearingAt: ecmRulebook.roundRulebook.clearingAt,
        batchWindowMinDays: ecmRulebook.roundRulebook.batchWindowMinDays,
        batchWindowMaxDays: ecmRulebook.roundRulebook.batchWindowMaxDays,
        baseMatchRatio: ecmRulebook.roundRulebook.baseMatchRatio,
        qfBonusCapMultiple: ecmRulebook.roundRulebook.qfBonusCapMultiple,
        preserveCappedQfBreadthBonus: ecmRulebook.roundRulebook.preserveCappedQfBreadthBonus,
        perDonorCapCents: ecmRulebook.roundRulebook.perDonorCapCents,
        sponsorPoolSegregation: ecmRulebook.roundRulebook.sponsorPoolSegregation,
        longLivedRoundOpenHoldsAllowed: ecmRulebook.batchEngine.longLivedRoundOpenHoldsAllowed,
        fixedCadencePublishedBeforeRoundOpen: ecmRulebook.batchEngine.fixedCadencePublishedBeforeRoundOpen,
        refundAndReroute: ecmRulebook.refundAndReroute,
        crossViewSubsidySchedule: {
          appliesAfterBaseMatch: ecmRulebook.crossViewSubsidySchedule.appliesAfterBaseMatch,
          preservesCappedQfBreadthBonus: ecmRulebook.crossViewSubsidySchedule.preservesCappedQfBreadthBonus,
          maxPremiumBps: ecmRulebook.crossViewSubsidySchedule.maxPremiumBps,
          premiumCapPolicy: ecmRulebook.crossViewSubsidySchedule.premiumCapPolicy,
          moralReputationCanIncreasePremium: ecmRulebook.crossViewSubsidySchedule.moralReputationCanIncreasePremium,
          rowCount: ecmRulebook.crossViewSubsidySchedule.rows.length,
        },
        recipientEligibilityRules: ecmRulebook.recipientEligibilityRules,
        separatedAccounting: ecmRulebook.separatedAccounting,
        clearingInputIntegrity: ecmRulebook.clearingInputIntegrity,
        clearingContract: ecmRulebook.clearingContract,
        hardGatesV1125: ecmRulebook.hardGatesV1125,
        sponsorPoolBacking: ecmRulebook.sponsorPoolBacking,
        simplifiedUserFlow: ecmRulebook.simplifiedUserFlow,
        participantIncentives: ecmRulebook.participantIncentives,
        publicCopyValidation: ecmRulebook.publicCopyValidation,
        failureBonusControls: ecmRulebook.failureBonusControls,
        postClearCustodialState: ecmRulebook.custodyAndRelease.postClearCustodialState,
        escrowClaimAllowed: ecmRulebook.custodyAndRelease.escrowClaimAllowed,
        donorDisclosure: ecmRulebook.donorDisclosure,
        recipientRegistryCount: ecmRulebook.recipientRegistry.length,
        payableRecipientCount: ecmRulebook.recipientRegistry.filter((recipient) =>
          recipient.registryStatus === "eligible_after_review_and_challenge",
        ).length,
        moralReputationCanIncreaseAllocationPower:
          ecmRulebook.identityAndAntiSybil.moralReputationCanIncreaseAllocationPower,
        noGlobalMoralRanking: ecmRulebook.identityAndAntiSybil.noGlobalMoralRanking,
      },
      cgVqaf: cgVqaf
        ? {
            policy: MPGF_PUBLIC_GOODS_CG_VQAF_POLICY,
            formulaVersion: cgVqaf.formulaVersion,
            reportPath: `/api/mpgf/rounds/${round.id}/cg-vqaf`,
            commonGroundDiscoveryPolicy: MPGF_PUBLIC_GOODS_COMMON_GROUND_DISCOVERY_POLICY,
            commonGroundDiscoveryPath:
              supportSignalContract?.commonGroundDiscoveryPath ??
              `/api/mpgf/rounds/${round.id}/common-ground-discovery`,
            commonGroundOrderingExperimentKey: commonGroundDiscovery?.orderingExperimentKey ?? null,
            supportSignalPath: supportSignalContract?.supportSignalPath ?? `/api/mpgf/rounds/${round.id}/support-signals`,
            supportSignalPrivateByDefault: supportSignalContract?.privateByDefault ?? true,
            publicAggregationOnly: supportSignalContract?.publicAggregationOnly ?? true,
            supportSignalsSuppressed: cgVqaf.supportSignalsSuppressed,
            noGlobalMoralRanking: cgVqaf.noGlobalMoralRanking,
            ranksCoordinatabilityOnly: cgVqaf.ranksCoordinatabilityOnly,
            learnsOverlappingReasons: commonGroundDiscovery?.learnsOverlappingReasons ?? true,
            signalOptions: supportSignalContract?.signalOptions ?? [],
            moralClusterOptions: supportSignalContract?.moralClusterOptions ?? [],
            collectiveActionStates: supportSignalContract?.collectiveActionStates ?? [],
            qfBonusBudgetCents: cgVqaf.qfBonusBudgetCents,
            qfBonusAllocatedCents: cgVqaf.qfBonusAllocatedCents,
          }
        : null,
      identityIntegrity: identityIntegrity
        ? {
            policy: MPGF_PUBLIC_GOODS_IDENTITY_INTEGRITY_POLICY,
            reportPath: `/api/mpgf/rounds/${round.id}/identity-integrity`,
            sybilReviewPath: "/api/mpgf/challenges",
            privacyPolicy: identityIntegrity.privacyPolicy,
            qfWeightPolicy: identityIntegrity.qfWeightPolicy,
            uniqueHumanityPolicy: identityIntegrity.uniqueHumanityPolicy,
            noGlobalMoralRanking: identityIntegrity.noGlobalMoralRanking,
            noMoralReputationWeighting: identityIntegrity.noMoralReputationWeighting,
            identityCanAffectEligibilityOrWeight: identityIntegrity.identityCanAffectEligibilityOrWeight,
            commonGroundSignalsExcludedFromAllocationPower:
              identityIntegrity.commonGroundSignalsExcludedFromAllocationPower,
            supportSignalStrengthExcludedFromAllocationPower:
              identityIntegrity.supportSignalStrengthExcludedFromAllocationPower,
            rawProviderPayloadsExcluded: identityIntegrity.rawProviderPayloadsExcluded,
            publicIndividualScoresExcluded: identityIntegrity.publicIndividualScoresExcluded,
            counters: identityIntegrity.counters,
          }
        : null,
      coalitionRouting: {
        policy: MPGF_PUBLIC_GOODS_COALITION_ROUTING_POLICY,
        reportPath: `/api/mpgf/rounds/${round.id}/coalition-routing`,
        weakSupportBudgetPolicy: coalitionRouting.weakSupportBudgetPolicy,
        failureHandlingPolicy: coalitionRouting.failureHandlingPolicy,
        thresholdClusterMin: coalitionRouting.thresholdClusterMin,
        candidateCount: coalitionRouting.candidateCount,
        feasibleCandidateCount: sealNumber(sealedProgress.active, coalitionRouting.feasibleCandidateCount),
        ecmBatchCandidateCount: sealNumber(sealedProgress.active, coalitionRouting.ecmBatchCandidateCount),
        weakSupportBudgetCents: sealNumber(sealedProgress.active, coalitionRouting.weakSupportBudgetCents),
        routedWeakSupportBudgetCents: sealNumber(sealedProgress.active, coalitionRouting.routedWeakSupportBudgetCents),
        noGlobalMoralRanking: coalitionRouting.noGlobalMoralRanking,
        moralReputationAffectsAllocationPower: coalitionRouting.moralReputationAffectsAllocationPower,
        publicAggregationOnly: coalitionRouting.publicAggregationOnly,
      },
      commonGroundBudget: {
        policy: MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY,
        choiceArchitecturePolicy: MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CHOICE_POLICY,
        fallbackPolicy: MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_FALLBACK_POLICY,
        previewPath: `/api/mpgf/rounds/${round.id}/common-ground-budget-preview`,
        releaseStage: "sandbox_calculation",
        releaseGatePolicy: MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_POLICY,
        releaseGateRequirementCount: MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_REQUIREMENT_CODES.length,
        paymentCaptureAllowed: false,
        stateMutation: "none_preview_only",
        savePreviewField: "savePreview",
        savePreviewStateMutation: "common_ground_budget_preview_saved",
        savePreviewRequiresParticipantSurplusConfirmation: true,
        savePreviewPaymentCaptureAllowed: false,
        savedRecords: ["mpgf_user_budgets", "mpgf_support_stances", "mpgf_conditional_trade_intents"],
        budgetPeriodOptions: ["monthly", "round_limited"],
        stanceOptions: ["strong", "weak", "dissent", "abstain"],
        participantSurplusConfirmationRequired: true,
        eligibleProjectSetHashRequired: true,
        fallbackRerouteLimitedToFrozenEligibleSet: true,
        laterStageTracksFailClosed: ["real_money_capture", "donation_offsets", "pledge_swaps"],
        noGlobalMoralRanking: true,
      },
      thresholdCalibration: thresholdCalibration
        ? {
            policy: MPGF_PUBLIC_GOODS_THRESHOLD_CALIBRATION_POLICY,
            reportPath: `/api/mpgf/rounds/${round.id}/threshold-calibration`,
            appliesTo: thresholdCalibration.appliesTo,
            currentRoundMutationAllowed: thresholdCalibration.currentRoundMutationAllowed,
            parametersLockedBeforeDonationsOpen: thresholdCalibration.parametersLockedBeforeDonationsOpen,
            noGlobalMoralRanking: thresholdCalibration.noGlobalMoralRanking,
            ranksOperationalCalibrationOnly: thresholdCalibration.ranksOperationalCalibrationOnly,
            suggestedChangeCount: thresholdCalibration.suggestedChangeCount,
            holdForReviewCount: thresholdCalibration.holdForReviewCount,
          }
        : null,
      postmortem: postmortem
        ? {
            policy: MPGF_PUBLIC_GOODS_POSTMORTEM_POLICY,
            reportPath: `/api/mpgf/rounds/${round.id}/postmortem`,
            publicPostmortemTemplatePublished: postmortem.publicPostmortemTemplatePublished,
            currentRoundMutationAllowed: postmortem.currentRoundMutationAllowed,
            parameterResetPolicy: postmortem.parameterResetPolicy,
            noGlobalMoralRanking: postmortem.noGlobalMoralRanking,
            noDonorMoralReputationWeighting: postmortem.noDonorMoralReputationWeighting,
            requiredArtifactCount: postmortem.requiredPublicArtifacts.length,
            nextRoundSuggestedChangeCount: postmortem.nextRoundParameterReset.suggestedChangeCount,
            experimentCount: postmortem.experimentSummary.recommendedCount,
          }
        : null,
      finalization: {
        policy: MPGF_PUBLIC_GOODS_FINALIZATION_POLICY,
        previewPath: `/api/mpgf/rounds/${round.id}/finalize-preview`,
        finalizePath: `/api/mpgf/rounds/${round.id}/finalize`,
        releasePath: `/api/mpgf/rounds/${round.id}/release`,
        antiCollusionFactorUnit: "basis_points",
        proofPath: `/api/mpgf/rounds/${round.id}/proof`,
      },
      proceduralBadges: proceduralBadges
        ? {
            policy: proceduralBadges.policy,
            path: `/api/mpgf/procedural-badges?roundId=${round.id}`,
            counters: proceduralBadges.counters,
            hiddenSignals: proceduralBadges.hiddenSignals,
          }
        : null,
      governance: {
        ballotPolicy: MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_POLICY,
        ballotPath: "/api/mpgf/governance/ballots",
        resultsPath: `/api/mpgf/governance/results?roundId=${demoMpgfAssuranceRound.id}`,
        challengePath: "/api/mpgf/challenges",
        noGlobalMoralRanking: true,
      },
      campaignCount: campaigns.length,
      verifiedDonorCount: sealNumber(
        sealedProgress.active,
        allocation.lines.reduce((sum, line) => sum + line.verifiedSupporterCount, 0),
      ),
      calcHash: publicCalcHash(allocation.lines.map((line) => [line.campaignId, line.qfScore, line.totalPayoutCents])),
    },
  };
}

export function getMpgfPublicGoodsRoundApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  return buildMpgfPublicGoodsRoundApi({
    round: demoMpgfAssuranceRound,
    campaigns: demoMpgfPublicGoodsCampaigns,
    matchPool: demoMpgfMatchPool,
    allocation: allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") }),
    pledges: demoMpgfAssurancePledges,
    reviewCases: demoMpgfPublicGoodsReviewCases,
    dataSource: "demo_fixture",
  });
}

export function listMpgfPublicGoodsCampaignsApi(
  roundId: string = demoMpgfAssuranceRound.id,
  options: MpgfPublicGoodsPublicApiOptions = {},
) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  return buildMpgfPublicGoodsCampaignsApi({
    roundId,
    campaigns: demoMpgfPublicGoodsCampaigns,
    pledges: demoMpgfAssurancePledges,
    allocation: allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") }),
    options,
    round: demoMpgfAssuranceRound,
  });
}

export function buildMpgfPublicGoodsCampaignsApi({
  roundId,
  campaigns,
  pledges = demoMpgfAssurancePledges,
  allocation,
  options = {},
  reviewCases = demoMpgfPublicGoodsReviewCases,
  round,
}: {
  roundId: string;
  campaigns: MpgfPublicGoodsCampaign[];
  pledges?: MpgfPublicGoodsPledge[];
  allocation?: MpgfPublicGoodsRoundAllocation;
  options?: MpgfPublicGoodsPublicApiOptions;
  reviewCases?: MpgfPublicGoodsReviewCase[];
  round?: MpgfPublicGoodsRound;
}) {
  const sourceAllocation =
    allocation ??
    allocateMpgfAssuranceRound({
      campaigns,
      pledges,
      now: new Date("2026-05-31T12:00:00.000Z"),
    });

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
    roundId,
    sealedProgress: sealedProgressForRound(round ?? demoMpgfAssuranceRound),
    campaigns: campaigns.map((campaign) =>
      publicCampaignProgress(campaign, options, {
        allocation: sourceAllocation,
        pledges,
        reviewCases,
        round: round ?? demoMpgfAssuranceRound,
      })
    ),
  };
}

export function getMpgfPublicGoodsCampaignApi(
  campaignIdOrSlug: string,
  options: MpgfPublicGoodsPublicApiOptions = {},
) {
  const campaign = demoMpgfPublicGoodsCampaigns.find(
    (candidate) => candidate.id === campaignIdOrSlug || candidate.slug === campaignIdOrSlug,
  );

  if (!campaign) {
    return null;
  }

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
    campaign: {
      ...publicCampaignProgress(campaign, options, { round: demoMpgfAssuranceRound }),
      publicSummary: campaign.publicSummary,
      verificationMethod: campaign.verificationMethod,
      baselineRule: campaign.baselineRule,
      exitRule: campaign.exitRule,
      challengeWindowEndsAt: campaign.challengeWindowEndsAt ?? null,
      destinationProof: {
        destinationRef: campaign.destinationRef,
        destinationType: campaign.destinationType,
        verificationMethod: campaign.verificationMethod,
      },
    },
  };
}

export function getMpgfPublicGoodsCampaignProofPathApi(
  campaignIdOrSlug: string,
  options: MpgfPublicGoodsPublicApiOptions = {},
) {
  const campaign = demoMpgfPublicGoodsCampaigns.find(
    (candidate) => candidate.id === campaignIdOrSlug || candidate.slug === campaignIdOrSlug,
  );

  if (!campaign) {
    return null;
  }

  const progress = publicCampaignProgress(campaign, options, { round: demoMpgfAssuranceRound });
  const allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });
  const line = allocation.lines.find((candidate) => candidate.campaignId === campaign.id);
  const sourceProofByCampaignId = buildMpgfPublicGoodsAllocationSourceProofMap({
    allocation,
    pledges: demoMpgfAssurancePledges,
  });
  const sourceProof = sourceProofByCampaignId.get(campaign.id);
  const aggregateProof = {
    directEligibleCents: progress.sealedProgress.active ? null : line?.directEligibleCents ?? progress.directEligibleCents,
    verifiedDonorCount: progress.sealedProgress.active ? null : line?.verifiedSupporterCount ?? progress.verifiedDonorCount,
    baseMatchCents: progress.sealedProgress.active ? null : line?.baseMatchCents ?? 0,
    qfBonusCents: progress.sealedProgress.active ? null : line?.qfBonusCents ?? 0,
    totalPayoutCents: line?.status === "payable" ? line.totalPayoutCents : 0,
    proofRequired: line?.proofRequired ?? true,
    sourceContributionDigest: sourceProof?.sourceContributionDigest ?? publicCalcHash(["missing-source-proof", campaign.id]),
    regeneratedFromContributionRecords: sourceProof?.regeneratedFromContributionRecords ?? false,
  };

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
    proofPathPolicy: "aggregate_campaign_proof_no_private_donor_rows_or_receipt_urls",
    sealedProgress: progress.sealedProgress,
    campaignId: campaign.id,
    slug: campaign.slug,
    roundId: demoMpgfAssuranceRound.id,
    proofPathId: `mpgf-proof-path-${campaign.slug}`,
    proofPath: progress.proofPath,
    campaignPath: progress.campaignPath,
    roundProofPath: `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/proof`,
    roundHashPath: `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/hash`,
    challengePath: "/api/mpgf/challenges",
    publicProofIncludes: [
      "threshold_status",
      "aggregate_counted_contributions",
      "verified_supporter_count",
      "base_match_and_qf_bonus",
      "source_contribution_digest",
      "milestone_release_status",
    ],
    privateRowsExcluded: true,
    aggregateProof,
    calcHash: publicCalcHash([
      campaign.id,
      progress.proofPath,
      aggregateProof,
      progress.milestoneSchedule.map((milestone) => [milestone.id, milestone.status, milestone.releasePct]),
    ]),
  };
}

export function buildMpgfPublicGoodsMatchPreviewApi({
  allocation,
  campaigns = demoMpgfPublicGoodsCampaigns,
  options = {},
  round,
  roundId = allocation.roundId,
}: {
  allocation: MpgfPublicGoodsRoundAllocation;
  campaigns?: MpgfPublicGoodsCampaign[];
  options?: MpgfPublicGoodsPublicApiOptions;
  round?: MpgfPublicGoodsRound;
  roundId?: string;
}) {
  const sealedProgress = sealedProgressForRound(round ?? demoMpgfAssuranceRound);
  const previewRows = allocation.lines.map((line) => {
    const campaign = campaigns.find((candidate) => candidate.id === line.campaignId);
    const incidentState = campaign ? incidentStateForCampaign(campaign, options) : "clear";
    const matchPreviewHiddenByIncidentFreeze = incidentState === "frozen";

    return {
      campaignId: line.campaignId,
      status: line.status,
      incidentState,
      sealedProgress,
      matchPreviewHiddenByIncidentFreeze: sealedProgress.active || matchPreviewHiddenByIncidentFreeze,
      verifiedDonorCount: sealNumber(sealedProgress.active, line.verifiedSupporterCount),
      directEligibleCents: sealNumber(sealedProgress.active, line.directEligibleCents),
      qfScore: sealedProgress.active || matchPreviewHiddenByIncidentFreeze ? null : line.qfScore,
      estimatedBaseMatchCents: sealedProgress.active || matchPreviewHiddenByIncidentFreeze ? null : line.baseMatchCents,
      estimatedQfBonusCents: sealedProgress.active || matchPreviewHiddenByIncidentFreeze ? null : line.qfBonusCents,
      estimatedMatchCents:
        sealedProgress.active || matchPreviewHiddenByIncidentFreeze ? null : line.baseMatchCents + line.qfBonusCents,
      blockers: sealedProgress.active || matchPreviewHiddenByIncidentFreeze
        ? [
            ...new Set([
              ...line.blockers,
              ...(matchPreviewHiddenByIncidentFreeze ? ["incident_frozen_match_preview_hidden"] : []),
              ...(sealedProgress.active ? ["sealed_progress_match_preview_hidden_until_close"] : []),
            ]),
          ]
        : line.blockers,
    };
  });

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
    roundId,
    final: false,
    incidentFreezePolicy: "hide_mutable_match_preview_until_resolved",
    sealedProgress,
    formulaVersion: allocation.formulaVersion,
    qfAllocationPolicy: allocation.qfAllocationPolicy,
    qfLambda: allocation.qfLambda,
    calcHash: publicCalcHash(previewRows),
    rows: previewRows,
  };
}

export function getMpgfPublicGoodsMatchPreviewApi(
  roundId: string = demoMpgfAssuranceRound.id,
  options: MpgfPublicGoodsPublicApiOptions = {},
) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  const allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });

  return buildMpgfPublicGoodsMatchPreviewApi({
    allocation,
    campaigns: demoMpgfPublicGoodsCampaigns,
    options,
    round: demoMpgfAssuranceRound,
    roundId,
  });
}

export function buildMpgfPublicGoodsAllocationReportApi({
  allocation,
  pledges = demoMpgfAssurancePledges,
  round,
  roundId = allocation.roundId,
}: {
  allocation: MpgfPublicGoodsRoundAllocation;
  pledges?: MpgfPublicGoodsPledge[];
  round?: MpgfPublicGoodsRound;
  roundId?: string;
}) {
  const sealedProgress = sealedProgressForRound(round ?? demoMpgfAssuranceRound);
  const sourceProofByCampaignId = buildMpgfPublicGoodsAllocationSourceProofMap({
    allocation,
    pledges,
  });
  const rows = allocation.lines.map((line) => {
    const sourceProof = sourceProofByCampaignId.get(line.campaignId);

    if (!sourceProof) {
      throw new Error(`MPGF public-goods allocation source proof missing for ${line.campaignId}.`);
    }

    return {
      campaignId: line.campaignId,
      status: line.status,
      sealedProgress,
      directEligibleCents: sealNumber(sealedProgress.active, line.directEligibleCents),
      verifiedDonorCount: sealNumber(sealedProgress.active, line.verifiedSupporterCount),
      baseMatchCents: sealNumber(sealedProgress.active, line.baseMatchCents),
      qfBonusCents: sealNumber(sealedProgress.active, line.qfBonusCents),
      totalPayoutCents: sealedProgress.active ? null : line.status === "payable" ? line.totalPayoutCents : 0,
      proofRequired: line.proofRequired,
      custodyMode: line.custodyMode,
      blockers: line.blockers,
      sourceContributionDigest: sourceProof.sourceContributionDigest,
      eligibleContributionRecordCount: sealNumber(sealedProgress.active, sourceProof.eligibleContributionRecordCount),
      rawPaymentObjectCount: sealNumber(sealedProgress.active, sourceProof.rawPaymentObjectCount),
      uniqueCountedIdentityCount: sealNumber(sealedProgress.active, sourceProof.uniqueCountedIdentityCount),
      regeneratedFromContributionRecords: sourceProof.regeneratedFromContributionRecords,
    };
  });

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
    roundId,
    final: !sealedProgress.active,
    sealedProgress,
    regenerationPolicy: "allocation_report_regenerates_from_underlying_contribution_records_collapsed_by_identity",
    formulaVersion: allocation.formulaVersion,
    qfAllocationPolicy: allocation.qfAllocationPolicy,
    qfLambda: allocation.qfLambda,
    calcHash: publicCalcHash(rows),
    sponsorPoolCents: allocation.baseMatchBudgetCents + allocation.qfBonusBudgetCents,
    baseMatchBudgetCents: allocation.baseMatchBudgetCents,
    qfBonusBudgetCents: allocation.qfBonusBudgetCents,
    baseMatchAllocatedCents: sealNumber(sealedProgress.active, allocation.baseMatchAllocatedCents),
    qfBonusAllocatedCents: sealNumber(sealedProgress.active, allocation.qfBonusAllocatedCents),
    totalPayoutCents: sealNumber(sealedProgress.active, allocation.totalPayoutCents),
    rows,
  };
}

export function getMpgfPublicGoodsAllocationReportApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  const allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });

  return buildMpgfPublicGoodsAllocationReportApi({
    allocation,
    pledges: demoMpgfAssurancePledges,
    round: demoMpgfAssuranceRound,
    roundId,
  });
}

export function getMpgfPublicGoodsLedgerApi() {
  const allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });
  const rows = demoMpgfPublicGoodsCampaigns.map((campaign) => {
    const pledges = campaignPledges(campaign.id);
    const line = allocation.lines.find((candidate) => candidate.campaignId === campaign.id);

    return {
      roundId: demoMpgfAssuranceRound.id,
      campaignId: campaign.id,
      donorCount: line?.verifiedSupporterCount ?? 0,
      directTotalCents: line?.directEligibleCents ?? 0,
      countedTotalCents: countedForMatchCents(pledges),
      matchTotalCents: (line?.baseMatchCents ?? 0) + (line?.qfBonusCents ?? 0),
      releasedTotalCents: 0,
      proofPath: `/mpgf/pools/${campaign.slug}`,
    };
  });

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
    ledgerPolicy: "public_aggregate_no_donor_rows_no_receipt_urls",
    calcHash: publicCalcHash(rows),
    rows,
  };
}
