import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { formatUsd } from "@/lib/mpgf/mechanism";
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

  if (!roundResult || !campaignResult || !preview || !allocation) {
    notFound();
  }

  const { round } = roundResult;
  const payableCampaigns = allocation.rows.filter((row) => row.status === "payable");

  return (
    <MpgfPageFrame
      actions={
        <>
          <Link className="button button-primary" href="/mpgf/contribute">
            Contribute or submit evidence
          </Link>
          <Link className="button button-secondary" href="/mpgf/pools">
            Review campaign proof paths
          </Link>
        </>
      }
      description="A public round landing page for verified quadratic assurance funding: sponsor-pool size, close time, donor breadth, thresholds, match preview, final allocation, milestones, dissent status, and appeal paths."
      eyebrow="Verified Quadratic Assurance Funding"
      realMoneyReadiness={realMoneyReadiness}
      title={round.name}
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-kpi-grid" aria-label="Round status">
        <div className="mpgf-kpi">
          <span>Sponsor-pool size</span>
          <strong>{formatUsd(round.sponsorPool.baseMatchBudgetCents + round.sponsorPool.qfBonusBudgetCents)}</strong>
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
          <h2>Direct contributions, threshold status, and estimated match</h2>
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
                    <dd>{formatUsd(previewRow?.estimatedMatchCents ?? campaign.matchEstimateCents)}</dd>
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
                <div className="mpgf-admin-action-grid">
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
