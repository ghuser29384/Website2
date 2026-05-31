import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import {
  demoAlternatives,
  demoMpgfMatchPool,
} from "@/lib/mpgf/data";
import {
  allocateMpgfAssuranceRound,
  formatUsd,
  getMpgfCampaignAssuranceStatus,
} from "@/lib/mpgf/mechanism";
import {
  loadMpgfPublicGoodsProofSummary,
  resolveMpgfPublicGoodsRoute,
} from "@/lib/mpgf/public-goods-proof";
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
  const { alternative, campaign, canonicalPoolId } = resolveMpgfPublicGoodsRoute(poolId);

  if (!alternative && !campaign) {
    return {
      title: "MPGF Pool",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = alternative ? `${alternative.shortName} MPGF Pool` : `${campaign?.title ?? "MPGF"} Proof Path`;
  const description = alternative?.moralPublicGoodRationale ?? campaign?.publicSummary ?? "";
  const canonical = canonicalPoolId ? `/mpgf/pools/${canonicalPoolId}` : `/mpgf/pools/${poolId}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: getAbsoluteUrl(canonical),
      type: "website",
    },
  };
}

export default async function MpgfPoolPage({ params }: MpgfPoolPageProps) {
  const { poolId } = await params;
  const viewer = await getViewer();
  const { alternative, campaign } = resolveMpgfPublicGoodsRoute(poolId);
  const assuranceAllocation = allocateMpgfAssuranceRound();
  const assuranceLine = campaign
    ? assuranceAllocation.lines.find((candidate) => candidate.campaignId === campaign.id)
    : null;
  const assuranceStatus = campaign ? getMpgfCampaignAssuranceStatus(campaign) : null;
  const proofSummary = campaign
    ? await loadMpgfPublicGoodsProofSummary({
        campaign,
        assuranceLine,
      })
    : null;

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
      {campaign && assuranceStatus && assuranceLine && proofSummary ? (
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
                <div>
                  <dt>Monthly pool refill</dt>
                  <dd>{formatUsd(proofSummary.activeSponsorSubscriptionCents)}</dd>
                </div>
                <div>
                  <dt>Challenge window</dt>
                  <dd>
                    {proofSummary.challengeWindowEndsAt
                      ? new Date(proofSummary.challengeWindowEndsAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "Not opened"}
                  </dd>
                </div>
                <div>
                  <dt>Verified proof amount</dt>
                  <dd>{formatUsd(proofSummary.verifiedAmountCents)}</dd>
                </div>
                <div>
                  <dt>Sponsor top-up</dt>
                  <dd>{formatUsd(proofSummary.sponsorTopUpCents)}</dd>
                </div>
                <div>
                  <dt>Verified proofs</dt>
                  <dd>{proofSummary.verifiedProofCount}</dd>
                </div>
                <div>
                  <dt>Rejected proofs</dt>
                  <dd>{proofSummary.rejectedProofCount}</dd>
                </div>
                <div>
                  <dt>Excluded pledges</dt>
                  <dd>{assuranceStatus.excludedPledgeCount}</dd>
                </div>
                <div>
                  <dt>Latest reason code</dt>
                  <dd>{proofSummary.latestReasonCode?.replaceAll("_", " ") ?? "pending review"}</dd>
                </div>
                <div>
                  <dt>Latest proof source</dt>
                  <dd>{proofSummary.latestReconciliationSource?.replaceAll("_", " ") ?? "pending proof"}</dd>
                </div>
                <div>
                  <dt>Latest verified at</dt>
                  <dd>
                    {proofSummary.latestVerifiedAt
                      ? new Date(proofSummary.latestVerifiedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "Not verified"}
                  </dd>
                </div>
                <div>
                  <dt>Public evidence source</dt>
                  <dd>{proofSummary.publicEvidenceSource.replaceAll("_", " ")}</dd>
                </div>
              </dl>
              {proofSummary.warnings.length > 0 ? (
                <p className="mpgf-small">
                  Persisted proof aggregate is unavailable; showing fixture-safe public evidence.
                </p>
              ) : null}
              <p>{campaign.baselineRule}</p>
              <p>{campaign.exitRule}</p>
            </article>
            <article className="mpgf-panel">
              <p className="eyebrow">Visibility controls</p>
              <h3>Private by default, opt-in recognition</h3>
              <p>
                Pledges can remain private amount, show supporter name only, or publish a short
                public reason. Duplicate identities and below-minimum pledges are excluded from
                supporter count and QF breadth.
              </p>
              <dl className="mpgf-summary-grid">
                <div>
                  <dt>Default visibility</dt>
                  <dd>private amount</dd>
                </div>
                <div>
                  <dt>Recognition</dt>
                  <dd>opt-in public supporter or reason</dd>
                </div>
                <div>
                  <dt>Analytics</dt>
                  <dd>privacy-safe experiment assignment only</dd>
                </div>
                <div>
                  <dt>Appeal status</dt>
                  <dd>{proofSummary.latestAppealStatus.replaceAll("_", " ")}</dd>
                </div>
              </dl>
            </article>
          </section>
        </section>
      ) : null}
    </MpgfPageFrame>
  );
}
