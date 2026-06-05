import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MpgfContributionModal } from "@/components/mpgf/mpgf-contribution-modal";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { MpgfSupportSignalPanel } from "@/components/mpgf/mpgf-support-signal-panel";
import { getViewer } from "@/lib/app-data";
import { formatUsd } from "@/lib/mpgf/mechanism";
import { getMpgfPublicGoodsCgVqafReportApi } from "@/lib/mpgf/public-goods-cg-vqaf";
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

export default async function MpgfRoundPage({ params }: MpgfRoundPageProps) {
  const { roundId } = await params;
  const [viewer, realMoneyReadiness] = await Promise.all([
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

        <article className="mpgf-panel">
          <p className="eyebrow">Fixed ECM rulebook</p>
          <h2>Cross-view terms, custody gates, and recipient registry are public before clearing</h2>
          <p>
            Donors see maximum exposure, counterpart-bucket conditions, failure handling,
            sponsor-match rules, and just-in-time authorization timing before a pledge can be
            authorized. Cleared funds require partner or fiscal-host custody confirmation before release.
          </p>
          <dl className="mpgf-summary-grid">
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
