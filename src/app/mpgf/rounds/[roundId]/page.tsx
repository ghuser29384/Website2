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
import { getViewer } from "@/lib/app-data";
import { formatUsd } from "@/lib/mpgf/mechanism";
import { getMpgfPublicGoodsCgVqafReportApi } from "@/lib/mpgf/public-goods-cg-vqaf";
import {
  buildMpgfCommonGroundBudgetPreview,
  type MpgfCommonGroundBudgetBaselineConfidence,
  type MpgfCommonGroundBudgetFallbackRule,
  type MpgfCommonGroundBudgetPeriod,
  type MpgfCommonGroundBudgetStance,
  type MpgfCommonGroundBudgetUnroutablePolicy,
} from "@/lib/mpgf/public-goods-common-ground-budget";
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
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

function stanceFromParams(
  params: Record<string, string | string[] | undefined>,
  campaignId: string,
  index: number,
): MpgfCommonGroundBudgetStance {
  const value = searchParamValue(params, `stance_${campaignId}`, index === 0 ? "weak" : "abstain");

  if (value === "strong" || value === "dissent" || value === "abstain") {
    return value;
  }

  return "weak";
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
  const payableCampaigns = allocation.rows.filter((row) => row.status === "payable");
  const sponsorPoolCents = round.sponsorPool.baseMatchBudgetCents + round.sponsorPool.qfBonusBudgetCents;
  const perDonorCapCents = Number(round.sponsorPool.perDonorQfCapCents);
  const budgetPeriod = budgetPeriodFromParams(resolvedSearchParams);
  const monthlyBudgetCents = searchParamNumber(resolvedSearchParams, "monthlyBudgetCents", 2_500);
  const roundBudgetCents = searchParamNumber(resolvedSearchParams, "roundBudgetCents", 2_500);
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
      stance: stanceFromParams(resolvedSearchParams, campaign.campaignId, index),
      maxAllocCents: searchParamNumber(resolvedSearchParams, `maxAllocCents_${campaign.campaignId}`, index === 0 ? 2_500 : 0),
      maxAllocPctBps: searchParamNumber(resolvedSearchParams, `maxAllocPctBps_${campaign.campaignId}`, index === 0 ? 10_000 : 0),
      rankOrder: index + 1,
      redactedNote: searchParamValue(resolvedSearchParams, `redactedNote_${campaign.campaignId}`),
    })),
  });
  const commonGroundBudgetReleaseGate = commonGroundBudgetPreview.releaseGateRequirementBundle;
  const commonGroundBudgetSavePayload = {
    baselineConfidenceLevel: commonGroundBudgetPreview.baselineConfidenceLevel,
    baselineConfidenceRationale: commonGroundBudgetPreview.baselineConfidenceRationale,
    budgetPeriod: commonGroundBudgetPreview.budgetPeriod,
    defaultAllocationBaseline: commonGroundBudgetPreview.defaultAllocationBaseline,
    fallbackRule: commonGroundBudgetPreview.fallbackRule,
    monthlyBudgetCents,
    participantSurplusConfirmed: commonGroundBudgetPreview.participantSurplusConfirmed,
    roundBudgetCents,
    savePreview: true,
    settlementCurrency: commonGroundBudgetPreview.settlementCurrency,
    stances: commonGroundBudgetPreview.rows.map((row) => ({
      campaignId: row.campaignId,
      stance: row.stance,
      maxAllocCents: row.maxAllocCents,
      maxAllocPctBps: row.maxAllocPctBps,
      rankOrder: row.rankOrder,
      redactedNote: searchParamValue(resolvedSearchParams, `redactedNote_${row.campaignId}`),
    })),
    unroutableBudgetPolicy: commonGroundBudgetPreview.unroutableBudgetPolicy,
  } satisfies CommonGroundBudgetSavePayload;
  const contributionModalCampaigns = campaignResult.campaigns.map((campaign) => ({
    campaignId: campaign.campaignId,
    countedForMatchCents: campaign.countedForMatchCents,
    directEligibleCents: campaign.directEligibleCents,
    matchEstimateCents: campaign.matchEstimateCents ?? 0,
    thresholdAmountCents: campaign.thresholdAmountCents,
    thresholdDonors: campaign.thresholdDonors,
    thresholdPassed: campaign.thresholdPassed,
    title: campaign.title,
    verifiedDonorCount: campaign.verifiedDonorCount,
  }));
  const campaignUnlockMetrics = campaignResult.campaigns.map((campaign) => {
    const previewRow = preview.rows.find((row) => row.campaignId === campaign.campaignId);
    const cgRow = cgVqaf.rows.find((row) => row.campaignId === campaign.campaignId);

    return {
      campaignId: campaign.campaignId,
      directEligibleCents: campaign.directEligibleCents,
      estimatedBaseMatchCents: previewRow?.estimatedBaseMatchCents ?? campaign.baseMatchCents,
      estimatedBonusCapCents: cgRow?.bonusCapCents ?? previewRow?.estimatedQfBonusCents,
      status: campaign.campaignStatus,
      thresholdDonors: campaign.thresholdDonors,
      title: campaign.title,
      verifiedDonorCount: campaign.verifiedDonorCount,
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
              <p className="eyebrow">{statusLabel(campaign.status)}</p>
              <h3>{campaign.title}</h3>
              <dl className="mpgf-headline-metrics" aria-label={`${campaign.title} top campaign funding metrics`}>
                <div>
                  <dt>Verified direct</dt>
                  <dd>{formatUsd(campaign.directEligibleCents)}</dd>
                </div>
                <div>
                  <dt>Verified supporters</dt>
                  <dd>
                    {campaign.verifiedDonorCount}/{campaign.thresholdDonors}
                  </dd>
                </div>
                <div>
                  <dt>Guaranteed base match</dt>
                  <dd>{formatMaybeUsd(campaign.estimatedBaseMatchCents)}</dd>
                </div>
                <div>
                  <dt>Estimated bonus range</dt>
                  <dd>{formatBonusRange(campaign.estimatedBonusCapCents)}</dd>
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
          <strong>{round.verifiedDonorCount}</strong>
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
              <dd>{coalitionRouting.feasibleCandidateCount}</dd>
            </div>
            <div>
              <dt>ECM batch candidates</dt>
              <dd>{coalitionRouting.ecmBatchCandidateCount}</dd>
            </div>
            <div>
              <dt>Weak-support budget</dt>
              <dd>{formatUsd(coalitionRouting.weakSupportBudgetCents)}</dd>
            </div>
            <div>
              <dt>Routed weak support</dt>
              <dd>{formatUsd(coalitionRouting.routedWeakSupportBudgetCents)}</dd>
            </div>
            <div>
              <dt>Minimum cluster breadth</dt>
              <dd>{coalitionRouting.thresholdClusterMin}</dd>
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
          <p className="eyebrow">Common Ground Budget preview</p>
          <h2>Set a no-capture budget for this round</h2>
          <p>
            Preview a monthly or round-limited budget, freeze the eligible project set, and confirm
            that the routing is acceptable relative to your stated default allocation. This preview
            does not authorize payment capture or create a reliance-bearing agreement.
          </p>
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
              <form className="stacked-form" method="get" aria-label="Common Ground Budget setup">
                <div className="form-grid">
                  <label className="field">
                    <span>Budget period</span>
                    <select name="budgetPeriod" defaultValue={commonGroundBudgetPreview.budgetPeriod}>
                      <option value="monthly">Monthly</option>
                      <option value="round_limited">Round-limited</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Monthly budget, cents</span>
                    <input
                      min="0"
                      name="monthlyBudgetCents"
                      type="number"
                      defaultValue={monthlyBudgetCents}
                    />
                  </label>
                  <label className="field">
                    <span>Round budget, cents</span>
                    <input
                      min="0"
                      name="roundBudgetCents"
                      type="number"
                      defaultValue={roundBudgetCents}
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
                    <span>Fallback rule</span>
                    <select name="fallbackRule" defaultValue={commonGroundBudgetPreview.fallbackRule}>
                      <option value="carry_forward">Carry forward</option>
                      <option value="reroute">Reroute inside eligible set</option>
                      <option value="release_hold">Release hold</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Unroutable budget</span>
                    <select
                      name="unroutableBudgetPolicy"
                      defaultValue={commonGroundBudgetPreview.unroutableBudgetPolicy}
                    >
                      <option value="carry_forward">Carry forward</option>
                      <option value="release_hold">Release hold</option>
                      <option value="manual_review">Manual review</option>
                    </select>
                  </label>
                </div>
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
                <div className="mpgf-table-wrap">
                  <table className="mpgf-table">
                    <thead>
                      <tr>
                        <th scope="col">Project</th>
                        <th scope="col">Stance</th>
                        <th scope="col">Cap, cents</th>
                        <th scope="col">Cap, pct bps</th>
                        <th scope="col">Optional note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commonGroundBudgetPreview.rows.map((row) => (
                        <tr key={`budget-input-${row.campaignId}`}>
                          <th scope="row">{row.title}</th>
                          <td>
                            <select name={`stance_${row.campaignId}`} defaultValue={row.stance}>
                              <option value="strong">Strong support</option>
                              <option value="weak">Weak common-ground</option>
                              <option value="dissent">Dissent</option>
                              <option value="abstain">Abstain</option>
                            </select>
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
                              name={`maxAllocPctBps_${row.campaignId}`}
                              type="number"
                              defaultValue={row.maxAllocPctBps}
                            />
                          </td>
                          <td>
                            <input
                              maxLength={160}
                              name={`redactedNote_${row.campaignId}`}
                              placeholder="Private review note"
                              type="text"
                              defaultValue={searchParamValue(resolvedSearchParams, `redactedNote_${row.campaignId}`)}
                            />
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

              <dl className="mpgf-summary-grid" aria-label="Common Ground Budget preview summary">
                <div>
                  <dt>Release stage</dt>
                  <dd>{commonGroundBudgetPreview.releaseStage.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Maximum budget</dt>
                  <dd>{formatUsd(commonGroundBudgetPreview.maximumBudgetCents)}</dd>
                </div>
                <div>
                  <dt>Projected routed</dt>
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
                  <dt>Payment capture</dt>
                  <dd>{commonGroundBudgetPreview.paymentCaptureAllowed ? "enabled" : "disabled"}</dd>
                </div>
                <div>
                  <dt>Confirmation state</dt>
                  <dd>{commonGroundBudgetPreview.activationState.replaceAll("_", " ")}</dd>
                </div>
              </dl>
              <div className="notice-card" aria-label="Common Ground Budget preview release gate">
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
                <div className="notice-card" aria-label="Common Ground Budget blockers">
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
                releaseGateRequirementBundleHash={commonGroundBudgetPreview.releaseGateRequirementBundleHash}
                termsSnapshotHash={commonGroundBudgetPreview.termsSnapshotHash}
              />
              <div className="mpgf-pool-directory">
                {commonGroundBudgetPreview.rows.map((row) => (
                  <article className="mpgf-panel" key={`budget-preview-${row.campaignId}`}>
                    <p className="eyebrow">{row.allocationState.replaceAll("_", " ")}</p>
                    <h3>{row.title}</h3>
                    <dl className="mpgf-headline-metrics">
                      <div>
                        <dt>Your stance</dt>
                        <dd>{row.stance.replaceAll("_", " ")}</dd>
                      </div>
                      <div>
                        <dt>Projected allocation</dt>
                        <dd>{formatUsd(row.projectedAllocationCents)}</dd>
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
          <p className="eyebrow">Fixed ECM rulebook</p>
          <h2>ECM-core plus Moral Trade safeguards stays public before clearing</h2>
          <p>
            Donors see maximum exposure, counterpart-bucket conditions, refund or reroute
            outcomes, sponsor-match rules, a one-to-two-week batch cadence, and just-in-time
            authorization timing before a pledge can be authorized. Cleared funds require partner
            or fiscal-host custody confirmation before release.
          </p>
          <dl className="mpgf-summary-grid">
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
                <Link href={round.ecmRulebook.reportPath}>ECM rulebook report</Link>
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
              <dd>{payableCampaigns.length}</dd>
            </div>
            <div>
              <dt>Base match allocated</dt>
              <dd>{formatUsd(allocation.baseMatchAllocatedCents)}</dd>
            </div>
            <div>
              <dt>QF bonus allocated</dt>
              <dd>{formatUsd(allocation.qfBonusAllocatedCents)}</dd>
            </div>
            <div>
              <dt>Total payout plan</dt>
              <dd>{formatUsd(allocation.totalPayoutCents)}</dd>
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
              directEligibleCents: campaign.directEligibleCents,
              ledgerReleasedCents: ledgerRow?.releasedTotalCents ?? 0,
              payable: allocationRow?.status === "payable",
              thresholdPassed: campaign.thresholdPassed,
            });

            return (
              <article className="mpgf-panel" key={campaign.campaignId}>
                <p className="eyebrow">{statusLabel(campaign.campaignStatus)}</p>
                <h3>{campaign.title}</h3>
                <div className="tag-row">
                  <span className="badge badge-secondary">{campaign.destinationType.replaceAll("_", " ")}</span>
                  <span className="badge badge-secondary">
                    Threshold {campaign.thresholdPassed ? "passed" : "pending"}
                  </span>
                  <span className="badge badge-secondary">
                    Review {statusLabel(campaign.reviewStatus)}
                  </span>
                </div>
                <dl className="mpgf-headline-metrics" aria-label={`${campaign.title} headline funding metrics`}>
                  <div>
                    <dt>Verified direct contributions</dt>
                    <dd>{formatUsd(campaign.directEligibleCents)}</dd>
                  </div>
                  <div>
                    <dt>Verified supporters</dt>
                    <dd>
                      {campaign.verifiedDonorCount}/{campaign.thresholdDonors}
                    </dd>
                  </div>
                  <div>
                    <dt>Base match if cleared</dt>
                    <dd>{formatMaybeUsd(previewRow?.estimatedBaseMatchCents ?? campaign.baseMatchCents)}</dd>
                  </div>
                  <div>
                    <dt>Estimated bonus range</dt>
                    <dd>{formatBonusRange(cgRow?.bonusCapCents ?? previewRow?.estimatedQfBonusCents)}</dd>
                  </div>
                </dl>
                <dl className="mpgf-summary-grid">
                  <div>
                    <dt>Direct contributions</dt>
                    <dd>{formatUsd(campaign.directEligibleCents)}</dd>
                  </div>
                  <div>
                    <dt>Counted for match</dt>
                    <dd>{formatUsd(campaign.countedForMatchCents)}</dd>
                  </div>
                  <div>
                    <dt>Verified donor count</dt>
                    <dd>
                      {campaign.verifiedDonorCount}/{campaign.thresholdDonors}
                    </dd>
                  </div>
                  <div>
                    <dt>Threshold amount</dt>
                    <dd>{formatUsd(campaign.thresholdAmountCents)}</dd>
                  </div>
                  <div>
                    <dt>Estimated match</dt>
                    <dd>{formatMaybeUsd(previewRow?.estimatedMatchCents ?? campaign.matchEstimateCents)}</dd>
                  </div>
                  <div>
                    <dt>Final match</dt>
                    <dd>{formatUsd((allocationRow?.baseMatchCents ?? 0) + (allocationRow?.qfBonusCents ?? 0))}</dd>
                  </div>
                  <div>
                    <dt>Released total</dt>
                    <dd>{formatUsd(ledgerRow?.releasedTotalCents ?? 0)}</dd>
                  </div>
                  <div>
                    <dt>Common-ground signals</dt>
                    <dd>{cgRow?.commonGroundSignalCount ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Common-ground score</dt>
                    <dd>{Math.round((cgRow?.commonGroundScoreBps ?? 0) / 100)}%</dd>
                  </div>
                  <div>
                    <dt>Latest review reason</dt>
                    <dd>{statusLabel(campaign.reviewSummary.latestReasonCode)}</dd>
                  </div>
                </dl>
                <div className="mpgf-allocation-row">
                  <div>
                    <span>Threshold status</span>
                    <strong>{campaign.thresholdPassed ? "Passed" : "Pending"}</strong>
                  </div>
                  <meter max={campaign.thresholdAmountCents} value={Math.min(campaign.directEligibleCents, campaign.thresholdAmountCents)} />
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
                {round.cgVqaf ? (
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
