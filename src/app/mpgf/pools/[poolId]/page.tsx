import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { MpgfDacCampaignView } from "@/components/mpgf/mpgf-dac-campaign-view";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { getViewer } from "@/lib/app-data";
import {
  demoAlternatives,
  demoMpgfMatchPool,
} from "@/lib/mpgf/data";
import { loadMpgfDacPublicCampaign } from "@/lib/mpgf/dac-lifecycle";
import {
  allocateMpgfAssuranceRound,
  formatUsd,
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
  try {
    const liveCampaign = await loadMpgfDacPublicCampaign({ campaignIdOrSlug: poolId });
    if (liveCampaign) {
      const canonical = `/mpgf/pools/${liveCampaign.slug || liveCampaign.id}`;
      return {
        title: `${liveCampaign.title} | Dominant Assurance Contract`,
        description: liveCampaign.publicSummary,
        alternates: { canonical },
        openGraph: {
          title: `${liveCampaign.title} | Dominant Assurance Contract`,
          description: liveCampaign.publicSummary,
          url: getAbsoluteUrl(canonical),
          type: "website",
        },
      };
    }
  } catch {
    // Keep the established fixture-backed metadata path available during schema rollout.
  }
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
  let liveCampaign: Awaited<ReturnType<typeof loadMpgfDacPublicCampaign>> = null;
  let liveCampaignUnavailable = false;
  try {
    liveCampaign = await loadMpgfDacPublicCampaign({
      campaignIdOrSlug: poolId,
      viewerId: viewer?.authUser.id,
    });
  } catch {
    liveCampaignUnavailable = true;
  }

  if (liveCampaign) {
    return <MpgfDacCampaignView campaign={liveCampaign} viewerPresent={Boolean(viewer)} />;
  }

  const { alternative, campaign } = resolveMpgfPublicGoodsRoute(poolId);
  const assuranceAllocation = allocateMpgfAssuranceRound();
  const assuranceLine = campaign
    ? assuranceAllocation.lines.find((candidate) => candidate.campaignId === campaign.id)
    : null;
  const proofSummary = campaign
    ? await loadMpgfPublicGoodsProofSummary({
        campaign,
        assuranceLine,
      })
    : null;

  if (!alternative) {
    if (liveCampaignUnavailable) {
      return (
        <MpgfPageFrame
          description="The exact-version pool audit view failed closed instead of showing stale or partial pledge data."
          eyebrow="Temporary data boundary"
          title="DAC pool unavailable."
          viewerPresent={Boolean(viewer)}
        >
          <section className="mpgf-panel">
            <p>Refresh after the isolated campaign data service is available. No pledge or payment state changed.</p>
          </section>
        </MpgfPageFrame>
      );
    }
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
      {campaign && assuranceLine && proofSummary ? (
        <section className="section section-subtle">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Verified assurance route</p>
            <h2>{campaign.title}</h2>
            <p>{campaign.publicSummary}</p>
          </div>
          <section className="mpgf-detail-grid">
            <article className="mpgf-panel">
              <p className="eyebrow">Sealed public preview</p>
              <h3>Threshold, match, and QF bonus</h3>
              <dl className="mpgf-summary-grid">
                <div>
                  <dt>Threshold rules</dt>
                  <dd>Published in round rules; exact live progress sealed before close</dd>
                </div>
                <div>
                  <dt>Eligible pledged</dt>
                  <dd>Sealed before close</dd>
                </div>
                <div>
                  <dt>Supporter breadth</dt>
                  <dd>Sealed before close</dd>
                </div>
                <div>
                  <dt>Deadline</dt>
                  <dd>
                    <LocalDateTime
                      value={campaign.deadlineAt}
                      fallback="Date unavailable"
                      dateOnly
                      locale="en-US"
                      options={{ day: "numeric", month: "short", year: "numeric" }}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Base match</dt>
                  <dd>Shown after close in final reports</dd>
                </div>
                <div>
                  <dt>Capped QF bonus</dt>
                  <dd>Shown after close in final reports</dd>
                </div>
                <div>
                  <dt>Total payable after gates</dt>
                  <dd>Shown after close in final reports</dd>
                </div>
              </dl>
              <div className="mpgf-allocation-row">
                <div>
                  <span>Amount progress</span>
                  <strong>Sealed before close</strong>
                </div>
              </div>
              <div className="mpgf-allocation-row">
                <div>
                  <span>Supporter progress</span>
                  <strong>Sealed before close</strong>
                </div>
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
                  <dt>Destination reference</dt>
                  <dd>{campaign.destinationRef}</dd>
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
                  <dt>Sponsor commitment</dt>
                  <dd>{demoMpgfMatchPool.visibleCommitment}</dd>
                </div>
                <div>
                  <dt>Monthly pool refill</dt>
                  <dd>{formatUsd(proofSummary.activeSponsorSubscriptionCents)}</dd>
                </div>
                <div>
                  <dt>Challenge window</dt>
                  <dd>
                    {proofSummary.challengeWindowEndsAt
                      ? <LocalDateTime
                          value={proofSummary.challengeWindowEndsAt}
                          fallback="Date unavailable"
                          dateOnly
                          locale="en-US"
                          options={{ day: "numeric", month: "short" }}
                        />
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
                  <dd>Sealed before close</dd>
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
                      ? <LocalDateTime
                          value={proofSummary.latestVerifiedAt}
                          fallback="Date unavailable"
                          dateOnly
                          locale="en-US"
                          options={{ day: "numeric", month: "short" }}
                        />
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
