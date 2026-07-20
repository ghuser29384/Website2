import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  MpgfCommonGroundBudgetSavePanel,
  type CommonGroundBudgetSavePayload,
} from "@/components/mpgf/mpgf-common-ground-budget-save-panel";
import { MpgfContributionModal } from "@/components/mpgf/mpgf-contribution-modal";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { MpgfSupportSignalPanel } from "@/components/mpgf/mpgf-support-signal-panel";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { getViewer } from "@/lib/app-data";
import { formatUsd } from "@/lib/mpgf/mechanism";
import { getMpgfPublicGoodsCgVqafReportApi } from "@/lib/mpgf/public-goods-cg-vqaf";
import {
  buildMpgfCommonGroundBudgetPreview,
  type MpgfCommonGroundBudgetBaselineConfidence,
  type MpgfCommonGroundBudgetFallbackRule,
  type MpgfCommonGroundBudgetNextCaptureRule,
  type MpgfCommonGroundBudgetPeriod,
  type MpgfCommonGroundBudgetReviewSignalVisibility,
  type MpgfCommonGroundBudgetStance,
  type MpgfCommonGroundBudgetUnroutablePolicy,
} from "@/lib/mpgf/public-goods-common-ground-budget";
import {
  MPGF_CRECM_PLAIN_LANGUAGE_LABELS,
  buildMpgfCrecFinalReviewAcknowledgements,
  getMpgfCrecPlainLanguageLabelForStance,
} from "@/lib/mpgf/public-goods-crecm-labels";
import { getMpgfPublicGoodsCoalitionRoutingReportApi } from "@/lib/mpgf/public-goods-coalition-routing";
import { getMpgfPublicGoodsEcmRulebookReportApi } from "@/lib/mpgf/public-goods-ecm-rulebook";
import { getMpgfPublicGoodsIdentityIntegrityReportApi } from "@/lib/mpgf/public-goods-identity-integrity";
import {
  getMpgfPublicGoodsAllocationReportApi,
  getMpgfPublicGoodsLedgerApi,
  getMpgfPublicGoodsMatchPreviewApi,
  getMpgfPublicGoodsRoundApi,
  listMpgfPublicGoodsCampaignsApi,
} from "@/lib/mpgf/public-goods-api";
import { loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

interface MpgfRoundPageProps {
  params: Promise<{ roundId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function formatDate(value: string) {
  return (
    <LocalDateTime
      value={value}
      fallback="Date unavailable"
      dateOnly
      locale="en-US"
      options={{ day: "numeric", month: "short", year: "numeric" }}
    />
  );
}

function formatCountdown(seconds: number) {
  const days = Math.floor(seconds / 86_400);

  if (days > 0) {
    return `${days} days`;
  }

  const hours = Math.floor(seconds / 3_600);

  return hours > 0 ? `${hours} hours` : "closing window";
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatMaybeUsd(cents: number | null | undefined) {
  return typeof cents === "number" ? formatUsd(cents) : "hidden while incident is frozen";
}

function formatBonusRange(cents: number | null | undefined) {
  return typeof cents === "number" ? `$0 - ${formatUsd(cents)}` : "hidden while incident is frozen";
}

function publicNumber(value: number | null | undefined) {
  return typeof value === "number" ? value : 0;
}

function publicBoolean(value: boolean | null | undefined) {
  return value === true;
}

function sealedProgressText(sealed: boolean, value: string) {
  return sealed ? "sealed until close" : value;
}

function sealedThresholdStatus(sealed: boolean, passed: boolean) {
  return sealed ? "sealed until close" : passed ? "passed" : "pending";
}

function qualitativeSealedProgressLabel({
  reviewStatus,
  sealed,
  status,
  thresholdPassed,
}: {
  reviewStatus: string;
  sealed: boolean;
  status: string;
  thresholdPassed: boolean;
}) {
  if (!sealed && (status === "payable" || status === "finalized")) {
    return "Closed; final audit available";
  }

  if (reviewStatus !== "approved" && reviewStatus !== "finalized") {
    return "Review pending";
  }

  if (thresholdPassed) {
    return "Review pending";
  }

  if (status === "threshold_pending") {
    return "Needs more support";
  }

  return "Likely near threshold";
}

function commonGroundStanceLabel(stance: MpgfCommonGroundBudgetStance) {
  return getMpgfCrecPlainLanguageLabelForStance(stance);
}

const COMMON_GROUND_STANCE_OPTIONS = [
  {
    value: "strong",
    label: MPGF_CRECM_PLAIN_LANGUAGE_LABELS.stance.strong,
    canonicalEffect: "Allocatable only after explicit caps, conditions, gates, and final review.",
  },
  {
    value: "weak",
    label: MPGF_CRECM_PLAIN_LANGUAGE_LABELS.stance.weak,
    canonicalEffect: "Allocatable only if different-view support joins and the cross-view condition clears.",
  },
  {
    value: "dissent",
    label: MPGF_CRECM_PLAIN_LANGUAGE_LABELS.stance.dissent,
    canonicalEffect: "Allocates $0 and can send a review signal with your selected visibility.",
  },
  {
    value: "abstain",
    label: MPGF_CRECM_PLAIN_LANGUAGE_LABELS.stance.abstain,
    canonicalEffect: "Allocates $0 and does not imply support or opposition.",
  },
] satisfies Array<{
  value: MpgfCommonGroundBudgetStance;
  label: string;
  canonicalEffect: string;
}>;

function searchParamValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
  fallback = "",
) {
  const value = params[key];

  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function searchParamNumber(
  params: Record<string, string | string[] | undefined>,
  key: string,
  fallback: number,
) {
  const parsed = Number(searchParamValue(params, key));

  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function budgetPeriodFromParams(
  params: Record<string, string | string[] | undefined>,
): MpgfCommonGroundBudgetPeriod {
  return searchParamValue(params, "budgetPeriod") === "round_limited" ? "round_limited" : "monthly";
}

function baselineConfidenceFromParams(
  params: Record<string, string | string[] | undefined>,
): MpgfCommonGroundBudgetBaselineConfidence {
  const value = searchParamValue(params, "baselineConfidenceLevel");

  return value === "low" || value === "high" ? value : "medium";
}

function fallbackRuleFromParams(
  params: Record<string, string | string[] | undefined>,
): MpgfCommonGroundBudgetFallbackRule {
  const value = searchParamValue(params, "fallbackRule");

  return value === "reroute" || value === "release_hold" ? value : "carry_forward";
}

function unroutablePolicyFromParams(
  params: Record<string, string | string[] | undefined>,
): MpgfCommonGroundBudgetUnroutablePolicy {
  const value = searchParamValue(params, "unroutableBudgetPolicy");

  return value === "release_hold" || value === "manual_review" ? value : "carry_forward";
}

function nextCaptureRuleFromParams(
  params: Record<string, string | string[] | undefined>,
): MpgfCommonGroundBudgetNextCaptureRule | null {
  const value = searchParamValue(params, "nextCaptureRule");

  if (
    value === "none_before_final_review" ||
    value === "monthly_after_final_review" ||
    value === "manual_review_required"
  ) {
    return value;
  }

  return null;
}

function stanceFromParams(
  params: Record<string, string | string[] | undefined>,
  campaignId: string,
): MpgfCommonGroundBudgetStance {
  const value = searchParamValue(params, `stance_${campaignId}`, "abstain");

  if (value === "strong" || value === "dissent" || value === "abstain") {
    return value;
  }

  return value === "weak" ? "weak" : "abstain";
}

function reviewSignalVisibilityFromParams(
  params: Record<string, string | string[] | undefined>,
  campaignId: string,
): MpgfCommonGroundBudgetReviewSignalVisibility {
  const value = searchParamValue(params, `reviewSignalVisibility_${campaignId}`);

  return value === "public" || value === "pseudonymous" ? value : "aggregate_only";
}

function reviewSignalVisibilityLabel(value: MpgfCommonGroundBudgetReviewSignalVisibility) {
  switch (value) {
    case "public":
      return "Public";
    case "pseudonymous":
      return "Pseudonymous";
    case "aggregate_only":
      return "Aggregate only";
  }
}

function workflowState({
  directEligibleCents,
  ledgerReleasedCents,
  payable,
  thresholdPassed,
}: {
  directEligibleCents: number;
  ledgerReleasedCents: number;
  payable: boolean;
  thresholdPassed: boolean;
}) {
  if (ledgerReleasedCents > 0) {
    return "payout_in_milestones";
  }

  if (payable) {
    return "counted";
  }

  if (thresholdPassed) {
    return "threshold_cleared";
  }

  if (directEligibleCents > 0) {
    return "pending_verification";
  }

  return "signal_only";
}

export async function generateMetadata({ params }: MpgfRoundPageProps): Promise<Metadata> {
  const { roundId } = await params;
  const result = getMpgfPublicGoodsRoundApi(roundId);

  if (!result) {
    return {
      title: "MPGF Round",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${result.round.name} | MPGF Round`,
    description: "Public round landing page for MPGF verified quadratic assurance funding.",
    alternates: {
      canonical: `/mpgf/rounds/${roundId}`,
    },
    openGraph: {
      title: `${result.round.name} | MPGF Round`,
      description: "Sponsor pool, campaign thresholds, match preview, final allocation, milestones, and appeal paths.",
      url: getAbsoluteUrl(`/mpgf/rounds/${roundId}`),
      type: "website",
    },
  };
}

export const dynamic = "force-dynamic";

export default async function MpgfRoundPage({ params, searchParams }: MpgfRoundPageProps) {
  const [{ roundId }, resolvedSearchParams, viewer, realMoneyReadiness] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
    getViewer(),
    loadMpgfRealMoneyReadiness(),
  ]);
  const roundResult = getMpgfPublicGoodsRoundApi(roundId);
  const campaignResult = listMpgfPublicGoodsCampaignsApi(roundId);
  const preview = getMpgfPublicGoodsMatchPreviewApi(roundId);
  const allocation = getMpgfPublicGoodsAllocationReportApi(roundId);
  const ledger = getMpgfPublicGoodsLedgerApi();
  const cgVqaf = getMpgfPublicGoodsCgVqafReportApi(roundId);
  const coalitionRouting = getMpgfPublicGoodsCoalitionRoutingReportApi(roundId);
  const ecmRulebook = getMpgfPublicGoodsEcmRulebookReportApi(roundId);
  const identityIntegrity = getMpgfPublicGoodsIdentityIntegrityReportApi(roundId);

  if (!roundResult || !campaignResult || !preview || !allocation || !cgVqaf || !coalitionRouting || !ecmRulebook || !identityIntegrity) {
    notFound();
  }

  const { round } = roundResult;
  const sealedProgressActive =
    ecmRulebook.donorDisclosure.sealedProgressDisclosureRequired && round.countdownSeconds > 0;
  const payableCampaigns = allocation.rows.filter((row) => row.status === "payable");
  const sponsorPoolCents = round.sponsorPool.baseMatchBudgetCents + round.sponsorPool.qfBonusBudgetCents;
  const perDonorCapCents = Number(round.sponsorPool.perDonorQfCapCents);
  const budgetPeriod = budgetPeriodFromParams(resolvedSearchParams);
  const monthlyBudgetCents = searchParamNumber(resolvedSearchParams, "monthlyBudgetCents", 2_500);
  const roundBudgetCents = searchParamNumber(resolvedSearchParams, "roundBudgetCents", 2_500);
  const perProjectCapCents = searchParamNumber(
    resolvedSearchParams,
    "perProjectCapCents",
    budgetPeriod === "monthly" ? monthlyBudgetCents : roundBudgetCents,
  );
  const participantSurplusConfirmed =
    searchParamValue(resolvedSearchParams, "participantSurplusConfirmed") === "on";
  const commonGroundBudgetPreview = buildMpgfCommonGroundBudgetPreview({
    roundId: round.id,
    roundLockTime: round.closesAt,
    projects: campaignResult.campaigns.map((campaign) => ({
      id: campaign.campaignId,
      title: campaign.title,
      thresholdAmountCents: campaign.thresholdAmountCents,
      thresholdSupporters: campaign.thresholdDonors,
    })),
    coalitionRouting,
    budgetPeriod,
    monthlyBudgetCents,
    roundBudgetCents,
    perProjectCapCents,
    nextCaptureAt: searchParamValue(resolvedSearchParams, "nextCaptureAt"),
    nextCaptureRule: nextCaptureRuleFromParams(resolvedSearchParams),
    defaultAllocationBaseline: searchParamValue(
      resolvedSearchParams,
      "defaultAllocationBaseline",
      "I would otherwise hold this budget or donate through my usual default allocation.",
    ),
    baselineConfidenceLevel: baselineConfidenceFromParams(resolvedSearchParams),
    baselineConfidenceRationale: searchParamValue(
      resolvedSearchParams,
      "baselineConfidenceRationale",
      "Self-attested preview only; review is required before reliance.",
    ),
    participantSurplusConfirmed,
    fallbackRule: fallbackRuleFromParams(resolvedSearchParams),
    unroutableBudgetPolicy: unroutablePolicyFromParams(resolvedSearchParams),
    stances: campaignResult.campaigns.map((campaign, index) => ({
      campaignId: campaign.campaignId,
      stance: stanceFromParams(resolvedSearchParams, campaign.campaignId),
      maxAllocCents: searchParamNumber(resolvedSearchParams, `maxAllocCents_${campaign.campaignId}`, 0),
      maxAllocBps: searchParamNumber(resolvedSearchParams, `maxAllocBps_${campaign.campaignId}`, 0),
      conditionAccepted: searchParamValue(resolvedSearchParams, `conditionAccepted_${campaign.campaignId}`) === "on",
      acceptableCounterBucketIds: searchParamValue(
        resolvedSearchParams,
        `acceptableCounterBucketIds_${campaign.campaignId}`,
        "bucket-animal-welfare,bucket-long-run-future,bucket-public-interest-knowledge",
      ),
      minCounterpartyVolumeCents: searchParamNumber(
        resolvedSearchParams,
        `minCounterpartyVolumeCents_${campaign.campaignId}`,
        20_000,
      ),
      rankOrder: index + 1,
      redactedNote: searchParamValue(resolvedSearchParams, `redactedNote_${campaign.campaignId}`),
      reviewSignalVisibility: reviewSignalVisibilityFromParams(resolvedSearchParams, campaign.campaignId),
    })),
  });
  const commonGroundBudgetReleaseGate = commonGroundBudgetPreview.releaseGateRequirementBundle;
  const selectedCommonGroundProjectCount = commonGroundBudgetPreview.rows.filter(
    (row) => row.stance !== "abstain",
  ).length;
  const chooseBudgetReady = commonGroundBudgetPreview.maximumBudgetCents > 0;
  const reviewReady =
    commonGroundBudgetPreview.activationState === "ready_for_confirmation" &&
    Boolean(commonGroundBudgetPreview.participantConfirmationHash);
  const commonGroundBudgetSavePayload = {
    baselineConfidenceLevel: commonGroundBudgetPreview.baselineConfidenceLevel,
    baselineConfidenceRationale: commonGroundBudgetPreview.baselineConfidenceRationale,
    budgetPeriod: commonGroundBudgetPreview.budgetPeriod,
    defaultAllocationBaseline: commonGroundBudgetPreview.defaultAllocationBaseline,
    fallbackRule: commonGroundBudgetPreview.fallbackRule,
    finalReviewAcknowledgements: buildMpgfCrecFinalReviewAcknowledgements(),
    monthlyBudgetCents,
    nextCaptureAt: commonGroundBudgetPreview.nextCaptureAt,
    nextCaptureRule: commonGroundBudgetPreview.nextCaptureRule,
    participantSurplusConfirmed: commonGroundBudgetPreview.participantSurplusConfirmed,
    perProjectCapCents: commonGroundBudgetPreview.perProjectCapCents,
    rulebookHashAtConsent: ecmRulebook.calcHash,
    roundBudgetCents,
    savePreview: true,
    settlementCurrency: commonGroundBudgetPreview.settlementCurrency,
    stances: commonGroundBudgetPreview.rows.map((row) => ({
      acceptableCounterBucketIds: row.acceptableCounterBucketIds,
      campaignId: row.campaignId,
      conditionAccepted: row.conditionAccepted,
      stance: row.stance,
      maxAllocCents: row.maxAllocCents,
      maxAllocBps: row.maxAllocBps,
      minCounterpartyVolumeCents: row.minCounterpartyVolumeCents,
      rankOrder: row.rankOrder,
      redactedNote: searchParamValue(resolvedSearchParams, `redactedNote_${row.campaignId}`),
      reviewSignalVisibility: row.reviewSignalVisibility,
    })),
    unroutableBudgetPolicy: commonGroundBudgetPreview.unroutableBudgetPolicy,
  } satisfies CommonGroundBudgetSavePayload;
  const contributionModalCampaigns = campaignResult.campaigns.map((campaign) => ({
    campaignId: campaign.campaignId,
    countedForMatchCents: publicNumber(campaign.countedForMatchCents),
    directEligibleCents: publicNumber(campaign.directEligibleCents),
    matchEstimateCents: publicNumber(campaign.matchEstimateCents),
    thresholdAmountCents: campaign.thresholdAmountCents,
    thresholdDonors: campaign.thresholdDonors,
    thresholdPassed: publicBoolean(campaign.thresholdPassed),
    title: campaign.title,
    verifiedDonorCount: publicNumber(campaign.verifiedDonorCount),
  }));
  const campaignUnlockMetrics = campaignResult.campaigns.map((campaign) => {
    const previewRow = preview.rows.find((row) => row.campaignId === campaign.campaignId);
    const cgRow = cgVqaf.rows.find((row) => row.campaignId === campaign.campaignId);

    return {
      campaignId: campaign.campaignId,
      directEligibleCents: publicNumber(campaign.directEligibleCents),
      estimatedBaseMatchCents: previewRow?.estimatedBaseMatchCents ?? campaign.baseMatchCents,
      estimatedBonusCapCents: cgRow?.bonusCapCents ?? previewRow?.estimatedQfBonusCents,
      qualitativeProgressLabel: qualitativeSealedProgressLabel({
        reviewStatus: campaign.reviewStatus,
        sealed: sealedProgressActive,
        status: campaign.campaignStatus,
        thresholdPassed: publicBoolean(campaign.thresholdPassed),
      }),
      status: campaign.campaignStatus,
      thresholdDonors: campaign.thresholdDonors,
      title: campaign.title,
      verifiedDonorCount: publicNumber(campaign.verifiedDonorCount),
    };
  });

  return (
    <MpgfPageFrame
      actions={
        <>
          <MpgfContributionModal
            campaigns={contributionModalCampaigns}
            perDonorCapCents={perDonorCapCents}
            realMoneyReady={realMoneyReadiness.ready}
            roundId={round.id}
            sponsorPoolCents={sponsorPoolCents}
            viewerPresent={Boolean(viewer)}
          />
          <Link className="button button-secondary" href="/mpgf/contribute">
            Contribute or submit evidence
          </Link>
          <Link className="button button-secondary" href="/mpgf/pools">
            Review campaign proof paths
          </Link>
          <Link className="button button-secondary" href="/mpgf/governance">
            Governance and rules
          </Link>
        </>
      }
      description="A public round landing page for verified quadratic assurance funding: sponsor-pool size, close time, donor breadth, thresholds, match preview, final allocation, milestones, dissent status, and appeal paths."
      eyebrow="Verified Quadratic Assurance Funding"
      realMoneyReadiness={realMoneyReadiness}
      title={round.name}
      viewerPresent={Boolean(viewer)}
    >
      <section className="section section-white" aria-label="Above-the-fold campaign unlock metrics">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Campaign unlock board</p>
          <h2>Direct support, supporter breadth, base match, and bonus range</h2>
        </div>
        <div className="mpgf-pool-directory">
          {campaignUnlockMetrics.map((campaign) => (
            <article className="mpgf-panel" key={`unlock-${campaign.campaignId}`}>
              <p className="eyebrow">{campaign.qualitativeProgressLabel}</p>
              <h3>{campaign.title}</h3>
              <dl className="mpgf-headline-metrics" aria-label={`${campaign.title} top campaign funding metrics`}>
                <div>
                  <dt>Qualitative progress</dt>
                  <dd>{campaign.qualitativeProgressLabel}</dd>
                </div>
                <div>
                  <dt>Verified direct</dt>
                  <dd>{sealedProgressText(sealedProgressActive, formatUsd(publicNumber(campaign.directEligibleCents)))}</dd>
                </div>
                <div>
                  <dt>Verified supporters</dt>
                  <dd>
                    {sealedProgressText(
                      sealedProgressActive,
                      `${publicNumber(campaign.verifiedDonorCount)}/${campaign.thresholdDonors}`,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Base match if backed and gates pass</dt>
                  <dd>{sealedProgressText(sealedProgressActive, formatMaybeUsd(campaign.estimatedBaseMatchCents))}</dd>
                </div>
                <div>
                  <dt>Estimated bonus range</dt>
                  <dd>{sealedProgressText(sealedProgressActive, formatBonusRange(campaign.estimatedBonusCapCents))}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="mpgf-kpi-grid" aria-label="Round status">
        <div className="mpgf-kpi">
          <span>Sponsor-pool size</span>
          <strong>{formatUsd(sponsorPoolCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Round closes</span>
          <strong>{formatDate(round.closesAt)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Time remaining</span>
          <strong>{formatCountdown(round.countdownSeconds)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Verified donors</span>
          <strong>{sealedProgressText(sealedProgressActive, String(publicNumber(round.verifiedDonorCount)))}</strong>
        </div>
      </section>

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Round parameters</p>
          <h2>Public sponsor pool and QF constraints</h2>
          <p>{round.sponsorPool.visibleCommitment}</p>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Base match budget</dt>
              <dd>{formatUsd(round.sponsorPool.baseMatchBudgetCents)}</dd>
            </div>
            <div>
              <dt>QF bonus budget</dt>
              <dd>{formatUsd(round.sponsorPool.qfBonusBudgetCents)}</dd>
            </div>
            <div>
              <dt>Per-donor counted cap</dt>
              <dd>{formatUsd(Number(round.sponsorPool.perDonorQfCapCents))}</dd>
            </div>
            <div>
              <dt>Verification weight policy</dt>
              <dd>{String(round.sponsorPool.verificationWeightPolicy).replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Round status</dt>
              <dd>{round.status}</dd>
            </div>
            <div>
              <dt>Calculation hash</dt>
              <dd>{round.calcHash}</dd>
            </div>
          </dl>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Identity and sybil integrity</p>
          <h2>Moral reputation never affects allocation power</h2>
          <p>
            Identity confidence can affect eligibility or QF weight, but cause preference,
            support-signal strength, and moral reputation do not change donor allocation
            power. Public reporting stays aggregate-only.
          </p>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Distinct counted identities</dt>
              <dd>{identityIntegrity.counters.eligibleDistinctIdentityCount}</dd>
            </div>
            <div>
              <dt>Duplicate identity flags</dt>
              <dd>{identityIntegrity.counters.duplicateIdentityCount}</dd>
            </div>
            <div>
              <dt>Pending or below minimum</dt>
              <dd>
                {identityIntegrity.counters.pendingReviewCount + identityIntegrity.counters.belowMinimumCount}
              </dd>
            </div>
            <div>
              <dt>Average eligible human score</dt>
              <dd>{Math.round(identityIntegrity.counters.averageEligibleHumanScoreBps / 100)}%</dd>
            </div>
            <div>
              <dt>QF weight policy</dt>
              <dd>{identityIntegrity.qfWeightPolicy.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Public report</dt>
              <dd>
                <Link href={round.identityIntegrity?.reportPath ?? `/api/mpgf/rounds/${round.id}/identity-integrity`}>
                  aggregate identity-integrity report
                </Link>
              </dd>
            </div>
          </dl>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Coalition-routed common-ground budget</p>
          <h2>Weak support becomes threshold feasibility before ECM clearing</h2>
          <p>
            The round estimates aggregate weak-support budget, cluster breadth, and hard review gates
            before any routed dollars can enter batch clearing or bonus allocation.
          </p>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Coalition candidates</dt>
              <dd>{coalitionRouting.candidateCount}</dd>
            </div>
            <div>
              <dt>Threshold feasible</dt>
              <dd>{sealedProgressText(sealedProgressActive, String(coalitionRouting.feasibleCandidateCount))}</dd>
            </div>
            <div>
              <dt>ECM batch candidates</dt>
              <dd>{sealedProgressText(sealedProgressActive, String(coalitionRouting.ecmBatchCandidateCount))}</dd>
            </div>
            <div>
              <dt>Weak-support budget</dt>
              <dd>{sealedProgressText(sealedProgressActive, formatUsd(coalitionRouting.weakSupportBudgetCents))}</dd>
            </div>
            <div>
              <dt>Routed weak support</dt>
              <dd>
                {sealedProgressText(sealedProgressActive, formatUsd(coalitionRouting.routedWeakSupportBudgetCents))}
              </dd>
            </div>
            <div>
              <dt>Minimum cluster breadth</dt>
              <dd>{sealedProgressText(sealedProgressActive, String(coalitionRouting.thresholdClusterMin))}</dd>
            </div>
            <div>
              <dt>Failure fallback candidates</dt>
              <dd>{coalitionRouting.failureBonusOrCarryForwardCandidateCount}</dd>
            </div>
            <div>
              <dt>Public report</dt>
              <dd>
                <Link href={round.coalitionRouting.reportPath}>coalition-routing report</Link>
              </dd>
            </div>
          </dl>
        </article>

        <article className="mpgf-panel" id="common-ground-budget-preview">
          <p className="eyebrow">moral public goods preview</p>
          <h2>Choose your maximum</h2>
          <p>
            Preview a monthly or round-limited budget, freeze the eligible project set, and confirm
            that the routing is acceptable relative to your stated default allocation. This preview
            does not authorize payment capture or create a reliance-bearing agreement.
          </p>
          <div className="notice-card" aria-label="moral public goods guided setup checklist">
            <strong>moral public goods</strong>
            <dl className="mpgf-summary-grid">
              <div>
                <dt>1. Choose budget</dt>
                <dd>
                  <span className={chooseBudgetReady ? "badge badge-success" : "badge badge-warning"}>
                    {chooseBudgetReady ? "Ready" : "Needs amount"}
                  </span>
                </dd>
              </div>
              <div>
                <dt>2. Pick projects</dt>
                <dd>
                  <span className={selectedCommonGroundProjectCount > 0 ? "badge badge-success" : "badge badge-secondary"}>
                    {selectedCommonGroundProjectCount} selected
                  </span>
                </dd>
              </div>
              <div>
                <dt>3. Review and save</dt>
                <dd>
                  <span className={reviewReady ? "badge badge-success" : "badge badge-warning"}>
                    {reviewReady ? "Ready" : "Not ready"}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Preview status</dt>
                <dd>
                  <span className="badge badge-secondary">Non-binding preview</span>
                </dd>
              </div>
            </dl>
            <p>
              You are not charged now. A payment attempt can happen only after the round closes
              and selected projects pass threshold, review, challenge, payment, and authorization
              checks.
            </p>
            <p className="mpgf-small">
              Status chips summarize whether fields appear complete; the final review screen
              remains the consent boundary.
            </p>
          </div>
          {!viewer ? (
            <div className="notice-card">
              <strong>Sign in required.</strong>
              <p>Budget previews are participant-specific because they include baseline and confirmation terms.</p>
              <Link className="button button-primary" href={`/login?next=/mpgf/rounds/${round.id}`}>
                Sign in to preview a budget
              </Link>
            </div>
          ) : (
            <>
              <form className="stacked-form" method="get" aria-label="moral public goods setup">
                <div className="form-grid">
                  <label className="field">
                    <span>Budget type</span>
                    <select name="budgetPeriod" defaultValue={commonGroundBudgetPreview.budgetPeriod}>
                      <option value="round_limited">One-time</option>
                      <option disabled value="every_round">Every round (requires final review)</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Maximum this round, cents</span>
                    <input
                      min="0"
                      name="roundBudgetCents"
                      type="number"
                      defaultValue={roundBudgetCents}
                    />
                  </label>
                  <label className="field">
                    <span>Maximum monthly, cents</span>
                    <input
                      min="0"
                      name="monthlyBudgetCents"
                      type="number"
                      defaultValue={monthlyBudgetCents}
                    />
                  </label>
                  <label className="field">
                    <span>Per-project cap, cents</span>
                    <input
                      min="0"
                      name="perProjectCapCents"
                      type="number"
                      defaultValue={commonGroundBudgetPreview.perProjectCapCents}
                    />
                  </label>
                  <label className="field">
                    <span>Next capture rule</span>
                    <select name="nextCaptureRule" defaultValue={commonGroundBudgetPreview.nextCaptureRule}>
                      <option value="none_before_final_review">None before final review</option>
                      <option value="monthly_after_final_review">Monthly after final review</option>
                      <option value="manual_review_required">Manual review required</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Next capture at</span>
                    <input
                      name="nextCaptureAt"
                      placeholder="2026-07-26T00:00:00.000Z"
                      type="text"
                      defaultValue={commonGroundBudgetPreview.nextCaptureAt ?? ""}
                    />
                  </label>
                  <label className="field">
                    <span>Baseline confidence</span>
                    <select
                      name="baselineConfidenceLevel"
                      defaultValue={commonGroundBudgetPreview.baselineConfidenceLevel}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>If something does not clear</span>
                    <select name="fallbackRule" defaultValue={commonGroundBudgetPreview.fallbackRule}>
                      <option value="carry_forward">Carry forward</option>
                      <option value="reroute">Try another approved project</option>
                      <option value="release_hold">Cancel authorization or release hold if applicable</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>If budget cannot be routed</span>
                    <select
                      name="unroutableBudgetPolicy"
                      defaultValue={commonGroundBudgetPreview.unroutableBudgetPolicy}
                    >
                      <option value="carry_forward">Carry forward</option>
                      <option value="release_hold">Release hold</option>
                      <option value="manual_review">Manual review</option>
                    </select>
                  </label>
                  <div className="field" aria-label="Privacy">
                    <span>Privacy</span>
                    <strong>Aggregate only</strong>
                    <p className="mpgf-small">No project-level identity disclosure is added by this preview.</p>
                  </div>
                  <div className="field" aria-label="Payment method">
                    <span>Payment method</span>
                    <button className="button button-secondary" disabled type="button">
                      Save payment method
                    </button>
                    <p className="mpgf-small">
                      A saved card is not a charge, hold, authorization, escrow, custody event,
                      or guarantee that a later authorization will succeed.
                    </p>
                  </div>
                </div>
                <details className="notice-card">
                  <summary>
                    <strong>Details you are agreeing to</strong>
                  </summary>
                  <dl className="mpgf-summary-grid">
                    <div>
                      <dt>Per-project maximum</dt>
                      <dd>
                        Budget-level cap {formatUsd(commonGroundBudgetPreview.perProjectCapCents)}; project
                        rows below cannot exceed this cap and final review repeats it.
                      </dd>
                    </div>
                    <div>
                      <dt>Next capture rule and cancellation deadline</dt>
                      <dd>
                        {commonGroundBudgetPreview.nextCaptureRule.replaceAll("_", " ")}
                        {commonGroundBudgetPreview.nextCaptureAt
                          ? ` at ${commonGroundBudgetPreview.nextCaptureAt}`
                          : ""}. No capture in preview; later capture can occur only after hard gates
                        and exact authorization reconciliation. Cancellation deadline:{" "}
                        {formatDate(commonGroundBudgetPreview.cancelUntil)}.
                      </dd>
                    </div>
                    <div>
                      <dt>Fee acknowledgement and fee-policy hash</dt>
                      <dd>Fee policy stays tied to rulebook hash {ecmRulebook.calcHash.slice(0, 19)}...</dd>
                    </div>
                    <div>
                      <dt>Sponsor-paid fee support disclosure</dt>
                      <dd>Sponsor-paid fee support, if any, is disclosed separately from public-good dollars.</dd>
                    </div>
                    <div>
                      <dt>Contributor benefits</dt>
                      <dd>Success reward, coordination credit, and impact certificate opt-ins default off.</dd>
                    </div>
                    <div>
                      <dt>Recognition preference</dt>
                      <dd>Aggregate only.</dd>
                    </div>
                    <div>
                      <dt>Rulebook hash at consent</dt>
                      <dd>{ecmRulebook.calcHash.slice(0, 19)}...</dd>
                    </div>
                    <div>
                      <dt>Sealed-progress acknowledgement</dt>
                      <dd>Exact live threshold and counterparty gaps can stay hidden until close.</dd>
                    </div>
                  </dl>
                  <p className="mpgf-small">
                    Safe defaults become binding only after the final review screen shows them and
                    you explicitly save.
                  </p>
                </details>
                <label className="field">
                  <span>Your default allocation baseline</span>
                  <textarea
                    name="defaultAllocationBaseline"
                    defaultValue={commonGroundBudgetPreview.defaultAllocationBaseline}
                    rows={3}
                  />
                </label>
                <label className="field">
                  <span>Baseline confidence rationale</span>
                  <textarea
                    name="baselineConfidenceRationale"
                    defaultValue={commonGroundBudgetPreview.baselineConfidenceRationale}
                    rows={3}
                  />
                </label>
                <p className="mpgf-small">
                  Pick projects with the plain-language choices below. A project can route budget
                  only after you explicitly choose a non-skip stance, accept a maximum for this
                  project, and save the condition on the final review screen.
                </p>
                <p className="sr-only" id="common-ground-stance-copy-map">
                  {MPGF_CRECM_PLAIN_LANGUAGE_LABELS.stance.strong} maps to canonical
                  ProjectSupportStance.stance strong and can allocate only after explicit caps,
                  conditions, and final review. {MPGF_CRECM_PLAIN_LANGUAGE_LABELS.stance.weak} maps
                  to canonical ProjectSupportStance.stance weak and requires different-view support.
                  {MPGF_CRECM_PLAIN_LANGUAGE_LABELS.stance.dissent} maps to canonical
                  ProjectSupportStance.stance dissent, allocates zero, and may increase review
                  pressure. {MPGF_CRECM_PLAIN_LANGUAGE_LABELS.stance.abstain} maps to canonical
                  ProjectSupportStance.stance abstain and allocates zero by default.
                </p>
                <div className="notice-card" aria-label="Edit condition drawer">
                  <strong>Edit condition</strong>
                  <p>
                    I may contribute up to the selected project maximum only if at least{" "}
                    {formatUsd(20_000)} of verified match-eligible support clears from morally
                    distinct buckets.
                  </p>
                  <dl className="mpgf-summary-grid">
                    <div>
                      <dt>Morally distinct buckets</dt>
                      <dd>Animal welfare, Long-run future, Public-interest knowledge.</dd>
                    </div>
                    <div>
                      <dt>Does not count</dt>
                      <dd>
                        Your own dollars, linked accounts, same-payment-method or same-payment-cluster
                        accounts, same-control entities, sponsor dollars, platform dollars, fees,
                        same-bucket dollars, rewards, credits, or certificates.
                      </dd>
                    </div>
                    <div>
                      <dt>Priority order</dt>
                      <dd>Recorded per project from the current project order.</dd>
                    </div>
                    <div>
                      <dt>Fallback rule</dt>
                      <dd>Same as budget unless a compatible custom fallback is approved on final review.</dd>
                    </div>
                    <div>
                      <dt>Base match if cleared</dt>
                      <dd>Project-specific sponsor match on match-eligible dollars.</dd>
                    </div>
                    <div>
                      <dt>Bonus</dt>
                      <dd>Capped diversity-aware post-clear sponsor bonus.</dd>
                    </div>
                    <div>
                      <dt>Contributor benefit</dt>
                      <dd>Success reward only if backed; otherwise $0 or an up-to cap with proration disclosure.</dd>
                    </div>
                    <div>
                      <dt>Coordination credits / impact certificate</dt>
                      <dd>Optional contributor-only receipt; no allocation power.</dd>
                    </div>
                    <div>
                      <dt>Fees</dt>
                      <dd>Gross captured, fee, and sent-to-project amounts shown separately.</dd>
                    </div>
                    <div>
                      <dt>Self-matching exclusions</dt>
                      <dd>Self, linked accounts, same payment method, same payment cluster, and same-control entity.</dd>
                    </div>
                    <div>
                      <dt>Capture rule</dt>
                      <dd>After hard gates and exact authorization reconciliation only.</dd>
                    </div>
                  </dl>
                  <details>
                    <summary>Canonical fields</summary>
                    <ul>
                      <li>ProjectSupportStance.stance</li>
                      <li>ProjectSupportStance.maxAllocCents / maxAllocBps</li>
                      <li>ConditionalTradeIntent.amountCents</li>
                      <li>ConditionalTradeIntent.maxExposureCents</li>
                      <li>ConditionalTradeIntent.acceptableCounterBucketIds</li>
                      <li>ConditionalTradeIntent.minCounterpartyVolumeCents</li>
                      <li>ConditionalTradeIntent.fallbackRule</li>
                      <li>rulebookHashAtConsent</li>
                    </ul>
                  </details>
                </div>
                <div className="mpgf-table-wrap">
                  <table className="mpgf-table">
                    <thead>
                      <tr>
                        <th scope="col">Project</th>
                        <th scope="col">Your choice</th>
                        <th scope="col">Maximum for this project, cents</th>
                        <th scope="col">Maximum for this project, bps</th>
                        <th scope="col">Condition</th>
                        <th scope="col">Review note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commonGroundBudgetPreview.rows.map((row) => (
                        <tr key={`budget-input-${row.campaignId}`}>
                          <th scope="row">{row.title}</th>
                          <td>
                            <fieldset className="field">
                              <legend className="sr-only">Your choice for {row.title}</legend>
                              <div className="radio-stack" aria-describedby="common-ground-stance-copy-map">
                                {COMMON_GROUND_STANCE_OPTIONS.map((option) => {
                                  const canonicalEffectId =
                                    `stance-canonical-effect-${row.campaignId}-${option.value}`;

                                  return (
                                    <label className="radio-row" key={`${row.campaignId}-${option.value}`}>
                                      <input
                                        aria-describedby={`${canonicalEffectId} common-ground-stance-copy-map`}
                                        name={`stance_${row.campaignId}`}
                                        type="radio"
                                        value={option.value}
                                        defaultChecked={row.stance === option.value}
                                      />
                                      <span>{option.label}</span>
                                      <small id={canonicalEffectId}>{option.canonicalEffect}</small>
                                    </label>
                                  );
                                })}
                              </div>
                            </fieldset>
                            <div
                              className="mpgf-small"
                              aria-label={`${row.title} selected choice summary`}
                            >
                              <p>
                                <strong>You chose:</strong> {commonGroundStanceLabel(row.stance)}
                              </p>
                              <p>Canonical stance: {row.canonicalStance}</p>
                              {row.stance === "strong" ? (
                                <p>
                                  Money allocation: up to {formatUsd(row.projectedAllocationCents)} if caps,
                                  condition, review, threshold, and authorization gates pass. Use suggested
                                  condition or Edit condition before final review.
                                </p>
                              ) : null}
                              {row.stance === "weak" ? (
                                <p>
                                  Money allocation: up to {formatUsd(row.projectedAllocationCents)} only if
                                  different-view support joins; this does not count as unconditional support.
                                  Use suggested condition or Edit condition before final review.
                                </p>
                              ) : null}
                              {row.stance === "dissent" ? (
                                <p>
                                  Money allocation: $0. Review note: use the project review-note field below.
                                  Visibility of review signal: {reviewSignalVisibilityLabel(row.reviewSignalVisibility)}.
                                </p>
                              ) : null}
                              {row.stance === "abstain" ? (
                                <p>
                                  Money allocation: $0. No support, opposition, or allocatable intent is
                                  inferred from skipping.
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <input
                              min="0"
                              name={`maxAllocCents_${row.campaignId}`}
                              type="number"
                              defaultValue={row.maxAllocCents}
                            />
                          </td>
                          <td>
                            <input
                              max="10000"
                              min="0"
                              name={`maxAllocBps_${row.campaignId}`}
                              type="number"
                              defaultValue={row.maxAllocBps}
                            />
                          </td>
                          <td>
                            <label className="checkbox-row">
                              <input
                                name={`conditionAccepted_${row.campaignId}`}
                                type="checkbox"
                                defaultChecked={row.conditionAccepted}
                              />
                              <span>Condition accepted</span>
                            </label>
                            <input
                              name={`acceptableCounterBucketIds_${row.campaignId}`}
                              type="hidden"
                              value={row.acceptableCounterBucketIds.join(",")}
                            />
                            <input
                              min="1"
                              name={`minCounterpartyVolumeCents_${row.campaignId}`}
                              type="number"
                              defaultValue={row.minCounterpartyVolumeCents}
                              aria-label={`${row.title} minimum counterparty volume cents`}
                            />
                            <p className="mpgf-small">
                              At least {formatUsd(row.minCounterpartyVolumeCents)} from{" "}
                              {row.acceptableCounterBucketIds.join(", ")}.
                            </p>
                          </td>
                          <td>
                            <input
                              maxLength={160}
                              name={`redactedNote_${row.campaignId}`}
                              placeholder="Private review note"
                              type="text"
                              defaultValue={searchParamValue(resolvedSearchParams, `redactedNote_${row.campaignId}`)}
                            />
                            <label className="field">
                              <span>Visibility of review signal</span>
                              <select
                                name={`reviewSignalVisibility_${row.campaignId}`}
                                defaultValue={row.reviewSignalVisibility}
                              >
                                <option value="aggregate_only">Aggregate only</option>
                                <option value="pseudonymous">Pseudonymous</option>
                                <option value="public">Public</option>
                              </select>
                            </label>
                            <p className="mpgf-small">
                              Defaults to aggregate-only and does not create allocation power.
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <label className="checkbox-row">
                  <input
                    name="participantSurplusConfirmed"
                    type="checkbox"
                    defaultChecked={commonGroundBudgetPreview.participantSurplusConfirmed}
                  />
                  <span>This routing is acceptable to me relative to my stated default.</span>
                </label>
                <button className="button button-primary" type="submit">
                  Preview budget routing
                </button>
              </form>

              <dl className="mpgf-summary-grid" aria-label="moral public goods preview summary">
                <div>
                  <dt>Release stage</dt>
                  <dd>{commonGroundBudgetPreview.releaseStage.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Maximum this round</dt>
                  <dd>{formatUsd(commonGroundBudgetPreview.maximumBudgetCents)}</dd>
                </div>
                <div>
                  <dt>Possible routed if gates pass</dt>
                  <dd>{formatUsd(commonGroundBudgetPreview.routedAllocationCents)}</dd>
                </div>
                <div>
                  <dt>Pending threshold</dt>
                  <dd>{formatUsd(commonGroundBudgetPreview.pendingThresholdAllocationCents)}</dd>
                </div>
                <div>
                  <dt>Unroutable policy</dt>
                  <dd>{commonGroundBudgetPreview.unroutableBudgetPolicy.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Eligible set hash</dt>
                  <dd>{commonGroundBudgetPreview.eligibleProjectSetHash.slice(0, 19)}...</dd>
                </div>
                <div>
                  <dt>No charge in this preview</dt>
                  <dd>{commonGroundBudgetPreview.paymentCaptureAllowed ? "enabled" : "disabled"}</dd>
                </div>
                <div>
                  <dt>Confirmation state</dt>
                  <dd>{commonGroundBudgetPreview.activationState.replaceAll("_", " ")}</dd>
                </div>
              </dl>
              <div className="notice-card" aria-label="moral public goods preview release gate">
                <strong>Preview release gate</strong>
                <p>{commonGroundBudgetReleaseGate.userFacingSummary}</p>
                <dl className="mpgf-summary-grid">
                  <div>
                    <dt>Preview controls passed</dt>
                    <dd>{commonGroundBudgetReleaseGate.passedRequirementCodes.length}</dd>
                  </div>
                  <div>
                    <dt>Later-stage controls held back</dt>
                    <dd>{commonGroundBudgetReleaseGate.notRequiredRequirementCodes.length}</dd>
                  </div>
                  <div>
                    <dt>Reliance-bearing agreement</dt>
                    <dd>{commonGroundBudgetReleaseGate.relianceBearingAgreementAllowed ? "available" : "unavailable"}</dd>
                  </div>
                  <div>
                    <dt>Gate bundle</dt>
                    <dd>{commonGroundBudgetPreview.releaseGateRequirementBundleHash.slice(0, 19)}...</dd>
                  </div>
                </dl>
                {commonGroundBudgetReleaseGate.inactiveTrackBlockers.map((blocker) => (
                  <p key={blocker.track}>{blocker.nextAction}</p>
                ))}
              </div>
              {commonGroundBudgetPreview.userFacingBlockers.length ? (
                <div className="notice-card" aria-label="moral public goods blockers">
                  <strong>Next action</strong>
                  {commonGroundBudgetPreview.userFacingBlockers.map((blocker) => (
                    <p key={`${blocker.reasonCategory}-${blocker.nextAction}`}>
                      {blocker.nextAction}
                    </p>
                  ))}
                </div>
              ) : null}
              <MpgfCommonGroundBudgetSavePanel
                activationState={commonGroundBudgetPreview.activationState}
                apiPath={`/api/mpgf/rounds/${round.id}/common-ground-budget-preview`}
                blockedReasonCount={commonGroundBudgetPreview.userFacingBlockers.length}
                participantConfirmationHash={commonGroundBudgetPreview.participantConfirmationHash}
                payload={commonGroundBudgetSavePayload}
                paymentCaptureAllowed={commonGroundBudgetPreview.paymentCaptureAllowed}
                projectReviewRows={commonGroundBudgetPreview.rows.map((row) => ({
                  acceptableCounterBucketIds: row.acceptableCounterBucketIds,
                  campaignId: row.campaignId,
                  conditionAccepted: row.conditionAccepted,
                  maxAllocCents: row.maxAllocCents,
                  minCounterpartyVolumeCents: row.minCounterpartyVolumeCents,
                  rankOrder: row.rankOrder,
                  redactedNote: searchParamValue(resolvedSearchParams, `redactedNote_${row.campaignId}`),
                  reviewSignalVisibility: row.reviewSignalVisibility,
                  stance: row.stance,
                  title: row.title,
                }))}
                releaseGateRequirementBundleHash={commonGroundBudgetPreview.releaseGateRequirementBundleHash}
                rulebookHash={ecmRulebook.calcHash}
                sourceSpec={ecmRulebook.mechanism.sourceSpec}
                technicalLabel={ecmRulebook.mechanism.technicalLabel}
                termsSnapshotHash={commonGroundBudgetPreview.termsSnapshotHash}
              />
              <div className="mpgf-pool-directory">
                {commonGroundBudgetPreview.rows.map((row) => (
                  <article className="mpgf-panel" key={`budget-preview-${row.campaignId}`}>
                    <p className="eyebrow">{row.allocationState.replaceAll("_", " ")}</p>
                    <h3>{row.title}</h3>
                    <dl className="mpgf-headline-metrics">
                      <div>
                        <dt>Your choice</dt>
                        <dd>{commonGroundStanceLabel(row.stance)}</dd>
                      </div>
                      <div>
                        <dt>Possible allocation if gates pass</dt>
                        <dd>{formatUsd(row.projectedAllocationCents)}</dd>
                      </div>
                      <div>
                        <dt>Condition</dt>
                        <dd>
                          {row.conditionalTradeIntent
                            ? `accepted; at least ${formatUsd(row.minCounterpartyVolumeCents)} different-view support`
                            : "not binding"}
                        </dd>
                      </div>
                      <div>
                        <dt>Supporters</dt>
                        <dd>{row.activeSupporterCount}</dd>
                      </div>
                      <div>
                        <dt>Clusters</dt>
                        <dd>{row.activeClusterCount}</dd>
                      </div>
                    </dl>
                    <p>{row.pivotalAction}</p>
                  </article>
                ))}
              </div>
            </>
          )}
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">{ecmRulebook.mechanism.technicalLabel}</p>
          <h2>moral public goods safeguards stay public before clearing</h2>
          <p>
            Donors see maximum exposure, counterpart-bucket conditions, refund or reroute
            outcomes, separated accounting channels, sponsor-match rules, a one-to-two-week batch
            cadence, and just-in-time authorization timing before a pledge can be authorized.
            Cleared funds require partner or fiscal-host custody confirmation before release.
          </p>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>User label</dt>
              <dd>{ecmRulebook.mechanism.userFacingLabel}</dd>
            </div>
            <div>
              <dt>Batch cadence</dt>
              <dd>
                {ecmRulebook.roundRulebook.batchWindowMinDays}-{ecmRulebook.roundRulebook.batchWindowMaxDays} days
              </dd>
            </div>
            <div>
              <dt>Clearing time</dt>
              <dd>{formatDate(ecmRulebook.roundRulebook.clearingAt)}</dd>
            </div>
            <div>
              <dt>Base match ratio</dt>
              <dd>{ecmRulebook.roundRulebook.baseMatchRatio}:1</dd>
            </div>
            <div>
              <dt>Donor cap</dt>
              <dd>{formatUsd(ecmRulebook.roundRulebook.perDonorCapCents)}</dd>
            </div>
            <div>
              <dt>Cross-view premium</dt>
              <dd>
                up to {Math.round(ecmRulebook.crossViewSubsidySchedule.maxPremiumBps / 100)}%; QF preserved
              </dd>
            </div>
            <div>
              <dt>Payment snapshot</dt>
              <dd>
                {ecmRulebook.clearingInputIntegrity.roundClosePaymentCommitmentSnapshotsRequired
                  ? "provider-confirmed before final clearing"
                  : "not required"}
              </dd>
            </div>
            <div>
              <dt>Clearing contract</dt>
              <dd>
                {ecmRulebook.clearingContract.roundClearingInputBundle.bundleHashBindsSelectedBundleId
                  ? "bundle id, cutoff, and component hashes bound"
                  : "bundle binding unavailable"}
              </dd>
            </div>
            <div>
              <dt>Audit trace</dt>
              <dd>
                {ecmRulebook.clearingContract.optimizationRunTrace.selectedAllocationRowsHashRequired
                  ? "fee quotes and selected allocation rows are hash-bound"
                  : "optimizer trace unavailable"}
              </dd>
            </div>
            <div>
              <dt>Contributor benefits</dt>
              <dd>
                {ecmRulebook.clearingContract.contributorBenefits.neverCountAsPublicGoodDollarsOrAllocationPower
                  ? "reward, credit, and certificate lanes stay separate"
                  : "benefit gates unavailable"}
              </dd>
            </div>
            <div>
              <dt>Accounting</dt>
              <dd>
                {ecmRulebook.separatedAccounting.actualCountedMatchEligibleSeparated
                  ? "actual, counted, and match-eligible dollars separated"
                  : "not separated"}
              </dd>
            </div>
            <div>
              <dt>Copy validation</dt>
              <dd>
                {ecmRulebook.publicCopyValidation.ok
                  ? `${ecmRulebook.publicCopyValidation.surfaceCount} surfaces checked against recorded CRECM state`
                  : `${ecmRulebook.publicCopyValidation.blockedSurfaceCount} copy surfaces blocked`}
              </dd>
            </div>
            <div>
              <dt>Sponsor backing</dt>
              <dd>
                {ecmRulebook.sponsorPoolBacking.poolSpecificBackingRequired
                  ? "pool-specific and precommitted"
                  : "not pool-specific"}
              </dd>
            </div>
            <div>
              <dt>Fallback outcome</dt>
              <dd>{ecmRulebook.refundAndReroute.unmatchedBatchMode.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Round-open holds</dt>
              <dd>{ecmRulebook.batchEngine.longLivedRoundOpenHoldsAllowed ? "allowed" : "not allowed"}</dd>
            </div>
            <div>
              <dt>Custody state</dt>
              <dd>{ecmRulebook.custodyAndRelease.postClearCustodialState.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Escrow claim</dt>
              <dd>{ecmRulebook.custodyAndRelease.escrowClaimAllowed ? "approved" : "not claimed without legal approval"}</dd>
            </div>
            <div>
              <dt>Recipient registry</dt>
              <dd>
                {ecmRulebook.recipientRegistry.length} destinations;{" "}
                {ecmRulebook.recipientRegistry.filter((recipient) =>
                  recipient.registryStatus === "eligible_after_review_and_challenge",
                ).length}{" "}
                payable after review
              </dd>
            </div>
            <div>
              <dt>Recipient standard</dt>
              <dd>{ecmRulebook.recipientEligibilityRules.launchBias.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Public report</dt>
              <dd>
                <Link href={round.ecmRulebook.reportPath}>CRECM rulebook report</Link>
              </dd>
            </div>
          </dl>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Final allocation report</p>
          <h2>Final match report remains separate from release</h2>
          <p>
            Final allocation rows can be published before partner release. Webhooks cannot authorize
            final payout; release still requires review-state confirmation and milestone evidence.
          </p>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Final report</dt>
              <dd>{allocation.final ? "published" : "preview only"}</dd>
            </div>
            <div>
              <dt>Payable campaigns</dt>
              <dd>{sealedProgressText(sealedProgressActive, String(payableCampaigns.length))}</dd>
            </div>
            <div>
              <dt>Base match allocated</dt>
              <dd>{sealedProgressText(sealedProgressActive, formatUsd(publicNumber(allocation.baseMatchAllocatedCents)))}</dd>
            </div>
            <div>
              <dt>QF bonus allocated</dt>
              <dd>{sealedProgressText(sealedProgressActive, formatUsd(publicNumber(allocation.qfBonusAllocatedCents)))}</dd>
            </div>
            <div>
              <dt>Total payout plan</dt>
              <dd>{sealedProgressText(sealedProgressActive, formatUsd(publicNumber(allocation.totalPayoutCents)))}</dd>
            </div>
            <div>
              <dt>Released in ledger</dt>
              <dd>{formatUsd(ledger.rows.reduce((sum, row) => sum + row.releasedTotalCents, 0))}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="section section-white">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Campaign progress</p>
          <h2>Collective-action state, common-ground support, and match preview</h2>
          <p>
            Public rows show aggregate donor counts and counted totals only. Donor identities,
            private reasons, private evidence URLs, and receipt references stay out of this page.
          </p>
        </div>
        <div className="mpgf-pool-directory">
          {campaignResult.campaigns.map((campaign) => {
            const previewRow = preview.rows.find((row) => row.campaignId === campaign.campaignId);
            const allocationRow = allocation.rows.find((row) => row.campaignId === campaign.campaignId);
            const ledgerRow = ledger.rows.find((row) => row.campaignId === campaign.campaignId);
            const cgRow = cgVqaf.rows.find((row) => row.campaignId === campaign.campaignId);
            const currentWorkflowState = workflowState({
              directEligibleCents: publicNumber(campaign.directEligibleCents),
              ledgerReleasedCents: ledgerRow?.releasedTotalCents ?? 0,
              payable: allocationRow?.status === "payable",
              thresholdPassed: publicBoolean(campaign.thresholdPassed),
            });
            const qualitativeProgressLabel = qualitativeSealedProgressLabel({
              reviewStatus: campaign.reviewStatus,
              sealed: sealedProgressActive,
              status: campaign.campaignStatus,
              thresholdPassed: publicBoolean(campaign.thresholdPassed),
            });

            return (
              <article className="mpgf-panel" key={campaign.campaignId}>
                <p className="eyebrow">{qualitativeProgressLabel}</p>
                <h3>{campaign.title}</h3>
                <div className="tag-row">
                  <span className="badge badge-secondary">Qualitative progress: {qualitativeProgressLabel}</span>
                  <span className="badge badge-secondary">{campaign.destinationType.replaceAll("_", " ")}</span>
                  <span className="badge badge-secondary">
                    Threshold {sealedThresholdStatus(sealedProgressActive, publicBoolean(campaign.thresholdPassed))}
                  </span>
                  <span className="badge badge-secondary">
                    Review {statusLabel(campaign.reviewStatus)}
                  </span>
                </div>
                <dl className="mpgf-headline-metrics" aria-label={`${campaign.title} headline funding metrics`}>
                  <div>
                    <dt>Qualitative progress</dt>
                    <dd>{qualitativeProgressLabel}</dd>
                  </div>
                  <div>
                    <dt>Verified direct contributions</dt>
                    <dd>{sealedProgressText(sealedProgressActive, formatUsd(publicNumber(campaign.directEligibleCents)))}</dd>
                  </div>
                  <div>
                    <dt>Verified supporters</dt>
                    <dd>
                      {sealedProgressText(
                        sealedProgressActive,
                        `${publicNumber(campaign.verifiedDonorCount)}/${campaign.thresholdDonors}`,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Base match if cleared</dt>
                    <dd>
                      {sealedProgressText(
                        sealedProgressActive,
                        formatMaybeUsd(previewRow?.estimatedBaseMatchCents ?? campaign.baseMatchCents),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Estimated bonus range</dt>
                    <dd>
                      {sealedProgressText(
                        sealedProgressActive,
                        formatBonusRange(cgRow?.bonusCapCents ?? previewRow?.estimatedQfBonusCents),
                      )}
                    </dd>
                  </div>
                </dl>
                <dl className="mpgf-summary-grid">
                  <div>
                    <dt>Direct contributions</dt>
                    <dd>{sealedProgressText(sealedProgressActive, formatUsd(publicNumber(campaign.directEligibleCents)))}</dd>
                  </div>
                  <div>
                    <dt>Counted for match</dt>
                    <dd>{sealedProgressText(sealedProgressActive, formatUsd(publicNumber(campaign.countedForMatchCents)))}</dd>
                  </div>
                  <div>
                    <dt>Verified donor count</dt>
                    <dd>
                      {sealedProgressText(
                        sealedProgressActive,
                        `${publicNumber(campaign.verifiedDonorCount)}/${campaign.thresholdDonors}`,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Threshold amount</dt>
                    <dd>{formatUsd(campaign.thresholdAmountCents)}</dd>
                  </div>
                  <div>
                    <dt>Estimated match</dt>
                    <dd>
                      {sealedProgressText(
                        sealedProgressActive,
                        formatMaybeUsd(previewRow?.estimatedMatchCents ?? campaign.matchEstimateCents),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Final match</dt>
                    <dd>
                      {sealedProgressText(
                        sealedProgressActive,
                        formatUsd(publicNumber(allocationRow?.baseMatchCents) + publicNumber(allocationRow?.qfBonusCents)),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Released total</dt>
                    <dd>{formatUsd(ledgerRow?.releasedTotalCents ?? 0)}</dd>
                  </div>
                  <div>
                    <dt>Common-ground signals</dt>
                    <dd>{sealedProgressText(sealedProgressActive, String(cgRow?.commonGroundSignalCount ?? 0))}</dd>
                  </div>
                  <div>
                    <dt>Common-ground score</dt>
                    <dd>
                      {sealedProgressText(
                        sealedProgressActive,
                        `${Math.round((cgRow?.commonGroundScoreBps ?? 0) / 100)}%`,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Latest review reason</dt>
                    <dd>{statusLabel(campaign.reviewSummary.latestReasonCode)}</dd>
                  </div>
                </dl>
                <div className="mpgf-allocation-row">
                  <div>
                    <span>Threshold status</span>
                    <strong>
                      {sealedProgressActive ? "Sealed until close" : publicBoolean(campaign.thresholdPassed) ? "Passed" : "Pending"}
                    </strong>
                  </div>
                  <meter
                    max={campaign.thresholdAmountCents}
                    value={sealedProgressActive ? 0 : Math.min(publicNumber(campaign.directEligibleCents), campaign.thresholdAmountCents)}
                  />
                </div>
                <div className="mpgf-table" aria-label={`${campaign.title} milestone release schedule`}>
                  <div className="mpgf-table-row mpgf-table-head">
                    <span>Milestone</span>
                    <span>Release</span>
                    <span>Status</span>
                  </div>
                  {campaign.milestoneSchedule.map((milestone) => (
                    <div className="mpgf-table-row" key={milestone.id}>
                      <span>{milestone.ordinal}</span>
                      <span>{milestone.releasePct}%</span>
                      <span>{statusLabel(milestone.status)}</span>
                    </div>
                  ))}
                </div>
                {round.cgVqaf && !sealedProgressActive ? (
                  <MpgfSupportSignalPanel
                    campaignId={campaign.campaignId}
                    campaignTitle={campaign.title}
                    cgVqafReportPath={round.cgVqaf.reportPath}
                    commonGroundScoreBps={cgRow?.commonGroundScoreBps ?? 0}
                    dissentSignalCount={cgRow?.dissentSignalCount ?? 0}
                    initialState={currentWorkflowState}
                    moralClusterCount={cgRow?.moralClusterCount ?? 0}
                    moralClusterOptions={round.cgVqaf.moralClusterOptions}
                    roundId={round.id}
                    signalOptions={round.cgVqaf.signalOptions}
                    stateSteps={round.cgVqaf.collectiveActionStates}
                    supportSignalPath={round.cgVqaf.supportSignalPath}
                    viewerPresent={Boolean(viewer)}
                    weakCommonGroundSignalCount={cgRow?.weakCommonGroundSignalCount ?? 0}
                  />
                ) : round.cgVqaf ? (
                  <div className="pilot-note" aria-label={`${campaign.title} sealed support signals`}>
                    Exact live threshold, counterparty-volume, common-ground signal, and success-without-me
                    progress stays sealed until the round closes. Public exact aggregates appear only
                    after close in final reports or audit bundles.
                  </div>
                ) : null}
                <div className="mpgf-admin-action-grid">
                  <Link className="button button-secondary" href={campaign.campaignPath}>
                    Campaign page
                  </Link>
                  <Link className="button button-secondary" href={campaign.proofPath}>
                    Evidence and destination proof
                  </Link>
                  <Link
                    className="button button-secondary"
                    href={`mailto:support@moraltrade.org?subject=MPGF%20appeal%20${encodeURIComponent(campaign.campaignId)}`}
                  >
                    Appeal or dissent note
                  </Link>
                </div>
                <p className="mpgf-small">
                  Review cases: {campaign.reviewSummary.reviewCaseCount}. Challenge open:{" "}
                  {campaign.reviewSummary.challengeOpen ? "yes" : "no"}. Appeal open:{" "}
                  {campaign.reviewSummary.appealOpen ? "yes" : "no"}. Blockers:{" "}
                  {previewRow?.blockers.length ? previewRow.blockers.join(", ") : "none on preview row"}.
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mpgf-panel">
        <p className="eyebrow">Public audit trail</p>
        <h2>Aggregate ledger and reproducible calculation hashes</h2>
        <p>
          The round exposes a preview hash, final allocation hash, and aggregate ledger hash so
          reviewers can regenerate public totals without publishing donor rows or private evidence.
        </p>
        <dl className="mpgf-summary-grid">
          <div>
            <dt>Preview hash</dt>
            <dd>{preview.calcHash}</dd>
          </div>
          <div>
            <dt>Final allocation hash</dt>
            <dd>{allocation.calcHash}</dd>
          </div>
          <div>
            <dt>Ledger hash</dt>
            <dd>{ledger.calcHash}</dd>
          </div>
          <div>
            <dt>Ledger policy</dt>
            <dd>{ledger.ledgerPolicy.replaceAll("_", " ")}</dd>
          </div>
        </dl>
      </section>
    </MpgfPageFrame>
  );
}
