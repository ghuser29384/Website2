import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { demoAlternatives, demoMpgfMatchPool, demoMpgfPublicGoodsCampaigns } from "@/lib/mpgf/data";
import {
  allocateMpgfAssuranceRound,
  formatUsd,
  getMpgfCampaignAssuranceStatus,
} from "@/lib/mpgf/mechanism";
import { getAbsoluteUrl } from "@/lib/seo";

interface MpgfPoolPageProps {
  params: Promise<{ poolId: string }>;
}

function formatBasisPoints(value: number) {
  return `${(value / 100).toFixed(0)}%`;
}

function getGoodTypeLabel(alternative: (typeof demoAlternatives)[number]) {
  if (alternative.isConsensus && alternative.isHybrid) {
    return "Consensus + hybrid";
  }

  return alternative.isConsensus ? "Consensus" : "Hybrid";
}

export async function generateMetadata({ params }: MpgfPoolPageProps): Promise<Metadata> {
  const { poolId } = await params;
  const alternative = demoAlternatives.find((candidate) => candidate.id === poolId);

  if (!alternative) {
    return {
      title: "MPGF Pool",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${alternative.shortName} MPGF Pool`,
    description: alternative.moralPublicGoodRationale,
    alternates: {
      canonical: `/mpgf/pools/${alternative.id}`,
    },
    openGraph: {
      title: `${alternative.shortName} MPGF Pool`,
      description: alternative.moralPublicGoodRationale,
      url: getAbsoluteUrl(`/mpgf/pools/${alternative.id}`),
      type: "website",
    },
  };
}

export default async function MpgfPoolPage({ params }: MpgfPoolPageProps) {
  const { poolId } = await params;
  const viewer = await getViewer();
  const alternative = demoAlternatives.find((candidate) => candidate.id === poolId);
  const campaign = demoMpgfPublicGoodsCampaigns.find((candidate) => candidate.poolAlternativeId === poolId);
  const assuranceAllocation = allocateMpgfAssuranceRound();
  const assuranceLine = campaign
    ? assuranceAllocation.lines.find((candidate) => candidate.campaignId === campaign.id)
    : null;
  const assuranceStatus = campaign ? getMpgfCampaignAssuranceStatus(campaign) : null;

  if (!alternative) {
    notFound();
  }

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf/contribute">Pledge to assurance campaign</Link>}
      description={alternative.moralPublicGoodRationale}
      title={alternative.name}
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Recipient</p>
          <h2>{alternative.recipientName}</h2>
          <div className="tag-row">
            <span className="badge" title={alternative.expectedMoralImpactTooltip}>
              {getGoodTypeLabel(alternative)} good
            </span>
            <span className="badge badge-secondary" title={alternative.preferenceIntensityHint}>
              Default intensity {formatBasisPoints(alternative.demoPriorityBps)}
            </span>
          </div>
          <p>{alternative.description}</p>
          <p>{alternative.moralPublicGoodRationale}</p>
        </article>
        <article className="mpgf-panel">
          <p className="eyebrow">Risk and reliability</p>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Reliability</dt>
              <dd>{alternative.operationalReliabilityBps} bps</dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd>{alternative.riskBps} bps</dd>
            </div>
            <div>
              <dt>Tail loss</dt>
              <dd>{alternative.tailLossBps} bps</dd>
            </div>
            <div>
              <dt>Outcome unit</dt>
              <dd>{alternative.outcomeUnit}</dd>
            </div>
            <div>
              <dt>Good type</dt>
              <dd>{getGoodTypeLabel(alternative)}</dd>
            </div>
          </dl>
        </article>
      </section>
      {campaign && assuranceStatus && assuranceLine ? (
        <section className="section section-subtle">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Verified assurance route</p>
            <h2>{campaign.title}</h2>
            <p>{campaign.publicSummary}</p>
          </div>
          <section className="mpgf-detail-grid">
            <article className="mpgf-panel">
              <p className="eyebrow">{assuranceStatus.status.replaceAll("_", " ")}</p>
              <h3>Threshold, match, and QF bonus</h3>
              <dl className="mpgf-summary-grid">
                <div>
                  <dt>Amount threshold</dt>
                  <dd>{formatUsd(campaign.thresholdAmountCents)}</dd>
                </div>
                <div>
                  <dt>Eligible pledged</dt>
                  <dd>{formatUsd(assuranceStatus.directEligibleCents)}</dd>
                </div>
                <div>
                  <dt>Verified supporters</dt>
                  <dd>
                    {assuranceStatus.verifiedSupporterCount}/{campaign.thresholdSupporters}
                  </dd>
                </div>
                <div>
                  <dt>Base match</dt>
                  <dd>{formatUsd(assuranceLine.baseMatchCents)}</dd>
                </div>
                <div>
                  <dt>Capped QF bonus</dt>
                  <dd>{formatUsd(assuranceLine.qfBonusCents)}</dd>
                </div>
                <div>
                  <dt>Total payable after gates</dt>
                  <dd>{formatUsd(assuranceLine.status === "payable" ? assuranceLine.totalPayoutCents : 0)}</dd>
                </div>
              </dl>
              <div className="mpgf-allocation-row">
                <div>
                  <span>Amount progress</span>
                  <strong>{Math.round(assuranceStatus.amountProgressBps / 100)}%</strong>
                </div>
                <meter max={10_000} value={assuranceStatus.amountProgressBps} />
              </div>
              <div className="mpgf-allocation-row">
                <div>
                  <span>Supporter progress</span>
                  <strong>{Math.round(assuranceStatus.supporterProgressBps / 100)}%</strong>
                </div>
                <meter max={10_000} value={assuranceStatus.supporterProgressBps} />
              </div>
            </article>
            <article className="mpgf-panel">
              <p className="eyebrow">No-custody proof path</p>
              <h3>Evidence before counting</h3>
              <p>{campaign.verificationMethod}</p>
              <dl className="mpgf-summary-grid">
                <div>
                  <dt>Destination</dt>
                  <dd>{campaign.destinationType.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Proof required</dt>
                  <dd>{assuranceLine.proofRequired.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Custody posture</dt>
                  <dd>{assuranceLine.custodyMode.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Sponsor pool</dt>
                  <dd>{formatUsd(demoMpgfMatchPool.budgetCents)}</dd>
                </div>
              </dl>
              <p>{campaign.baselineRule}</p>
              <p>{campaign.exitRule}</p>
            </article>
          </section>
        </section>
      ) : null}
    </MpgfPageFrame>
  );
}
