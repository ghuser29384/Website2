import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MpgfDacCampaignView } from "@/components/mpgf/mpgf-dac-campaign-view";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { getViewer } from "@/lib/app-data";
import { loadMpgfDacPublicCampaign } from "@/lib/mpgf/dac-lifecycle";
import { formatUsd } from "@/lib/mpgf/mechanism";
import {
  getMpgfPublicGoodsAllocationReportApi,
  getMpgfPublicGoodsCampaignApi,
  getMpgfPublicGoodsLedgerApi,
  getMpgfPublicGoodsMatchPreviewApi,
  getMpgfPublicGoodsRoundApi,
} from "@/lib/mpgf/public-goods-api";
import { loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

interface MpgfCampaignPageProps {
  params: Promise<{ campaignId: string }>;
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not open";
  }

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

function formatPublicUsd(value: number | null | undefined) {
  return typeof value === "number" ? formatUsd(value) : "sealed until close";
}

function formatPublicCount(value: number | null | undefined) {
  return typeof value === "number" ? value : "sealed until close";
}

export async function generateMetadata({ params }: MpgfCampaignPageProps): Promise<Metadata> {
  const { campaignId } = await params;
  try {
    const liveCampaign = await loadMpgfDacPublicCampaign({ campaignIdOrSlug: campaignId });
    if (liveCampaign) {
      const campaignPath = `/mpgf/campaigns/${liveCampaign.slug || liveCampaign.id}`;
      return {
        title: `${liveCampaign.title} | Dominant Assurance Contract`,
        description: liveCampaign.publicSummary,
        alternates: { canonical: campaignPath },
        openGraph: {
          title: `${liveCampaign.title} | Dominant Assurance Contract`,
          description: liveCampaign.publicSummary,
          type: "website",
          url: getAbsoluteUrl(campaignPath),
        },
      };
    }
  } catch {
    // Preserve the existing fixture-backed metadata path if the stacked DAC schema is unavailable.
  }

  const result = getMpgfPublicGoodsCampaignApi(campaignId);

  if (!result) {
    return {
      title: "MPGF Campaign",
      robots: {
        follow: false,
        index: false,
      },
    };
  }

  return {
    title: `${result.campaign.title} | MPGF Campaign`,
    description: result.campaign.publicSummary,
    alternates: {
      canonical: result.campaign.campaignPath,
    },
    openGraph: {
      title: `${result.campaign.title} | MPGF Campaign`,
      description: result.campaign.publicSummary,
      type: "website",
      url: getAbsoluteUrl(result.campaign.campaignPath),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function MpgfCampaignPage({ params }: MpgfCampaignPageProps) {
  const { campaignId } = await params;
  const [viewer, realMoneyReadiness] = await Promise.all([
    getViewer(),
    loadMpgfRealMoneyReadiness(),
  ]);
  let liveCampaign: Awaited<ReturnType<typeof loadMpgfDacPublicCampaign>> = null;
  let liveCampaignUnavailable = false;
  try {
    liveCampaign = await loadMpgfDacPublicCampaign({
      campaignIdOrSlug: campaignId,
      viewerId: viewer?.authUser.id,
    });
  } catch {
    liveCampaignUnavailable = true;
  }

  if (liveCampaign) {
    return <MpgfDacCampaignView campaign={liveCampaign} viewerPresent={Boolean(viewer)} />;
  }

  const result = getMpgfPublicGoodsCampaignApi(campaignId);
  const round = getMpgfPublicGoodsRoundApi();
  const preview = getMpgfPublicGoodsMatchPreviewApi();
  const allocation = getMpgfPublicGoodsAllocationReportApi();
  const ledger = getMpgfPublicGoodsLedgerApi();

  if (!result || !round || !preview || !allocation) {
    if (liveCampaignUnavailable) {
      return (
        <MpgfPageFrame
          description="The exact-version campaign audit view failed closed instead of showing stale or partial pledge data."
          eyebrow="Temporary data boundary"
          title="DAC campaign unavailable."
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

  const { campaign } = result;
  const previewRow = preview.rows.find((row) => row.campaignId === campaign.campaignId);
  const allocationRow = allocation.rows.find((row) => row.campaignId === campaign.campaignId);
  const ledgerRow = ledger.rows.find((row) => row.campaignId === campaign.campaignId);
  const sealedProgressActive = campaign.sealedProgress.active;
  const finalMatchCents =
    typeof allocationRow?.baseMatchCents === "number" && typeof allocationRow.qfBonusCents === "number"
      ? allocationRow.baseMatchCents + allocationRow.qfBonusCents
      : null;
  const matchEstimateCents = previewRow?.estimatedMatchCents ?? campaign.matchEstimateCents;
  const directProgressValue =
    !sealedProgressActive && typeof campaign.directEligibleCents === "number"
      ? Math.min(campaign.directEligibleCents, campaign.thresholdAmountCents)
      : 0;
  const donorProgressValue =
    !sealedProgressActive && typeof campaign.verifiedDonorCount === "number"
      ? Math.min(campaign.verifiedDonorCount, campaign.thresholdDonors)
      : 0;
  const directProgressLabel =
    sealedProgressActive
      ? "sealed until close"
      : typeof campaign.directEligibleCents === "number"
        ? `${Math.round((directProgressValue / campaign.thresholdAmountCents) * 100)}%`
        : "sealed until close";
  const donorProgressLabel =
    sealedProgressActive
      ? "sealed until close"
      : typeof campaign.verifiedDonorCount === "number"
        ? `${Math.round((donorProgressValue / campaign.thresholdDonors) * 100)}%`
        : "sealed until close";

  return (
    <MpgfPageFrame
      actions={
        <>
          <Link className="button button-primary" href="/mpgf/contribute">
            Contribute or submit evidence
          </Link>
          <Link className="button button-secondary" href={campaign.proofPath}>
            Destination proof
          </Link>
          <Link className="button button-secondary" href={`/mpgf/rounds/${round.round.id}`}>
            Round page
          </Link>
        </>
      }
      description={campaign.publicSummary}
      eyebrow="MPGF campaign"
      realMoneyReadiness={realMoneyReadiness}
      title={campaign.title}
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-kpi-grid" aria-label="Campaign totals">
        <div className="mpgf-kpi">
          <span>Direct total</span>
          <strong>{sealedProgressActive ? "sealed until close" : formatPublicUsd(campaign.directEligibleCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Counted total</span>
          <strong>{sealedProgressActive ? "sealed until close" : formatPublicUsd(campaign.countedForMatchCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Match estimate</span>
          <strong>{sealedProgressActive ? "sealed until close" : formatPublicUsd(matchEstimateCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Donor count</span>
          <strong>{sealedProgressActive ? "sealed until close" : formatPublicCount(campaign.verifiedDonorCount)}</strong>
        </div>
      </section>

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Threshold flags</p>
          <h2>Viability gates before sponsor match</h2>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Amount threshold</dt>
              <dd>{formatUsd(campaign.thresholdAmountCents)}</dd>
            </div>
            <div>
              <dt>Donor threshold</dt>
              <dd>
                {sealedProgressActive
                  ? "sealed until close"
                  : `${formatPublicCount(campaign.verifiedDonorCount)}/${campaign.thresholdDonors}`}
              </dd>
            </div>
            <div>
              <dt>Threshold status</dt>
              <dd>
                {sealedProgressActive || campaign.thresholdPassed === null
                  ? "sealed until close"
                  : campaign.thresholdPassed
                    ? "passed"
                    : "pending"}
              </dd>
            </div>
            <div>
              <dt>Campaign status</dt>
              <dd>{statusLabel(campaign.campaignStatus)}</dd>
            </div>
            <div>
              <dt>Review status</dt>
              <dd>{statusLabel(campaign.reviewStatus)}</dd>
            </div>
            <div>
              <dt>Final match</dt>
              <dd>{formatPublicUsd(finalMatchCents)}</dd>
            </div>
          </dl>
          <div className="mpgf-allocation-row">
            <div>
              <span>Amount progress</span>
              <strong>{directProgressLabel}</strong>
            </div>
            <meter max={campaign.thresholdAmountCents} value={directProgressValue} />
          </div>
          <div className="mpgf-allocation-row">
            <div>
              <span>Donor progress</span>
              <strong>{donorProgressLabel}</strong>
            </div>
            <meter max={campaign.thresholdDonors} value={donorProgressValue} />
          </div>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Review summary</p>
          <h2>Human review before reliance</h2>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Review cases</dt>
              <dd>{campaign.reviewSummary.reviewCaseCount}</dd>
            </div>
            <div>
              <dt>Latest state</dt>
              <dd>{statusLabel(campaign.reviewSummary.latestState)}</dd>
            </div>
            <div>
              <dt>Latest reason</dt>
              <dd>{statusLabel(campaign.reviewSummary.latestReasonCode)}</dd>
            </div>
            <div>
              <dt>Challenge window</dt>
              <dd>{campaign.reviewSummary.challengeOpen ? "open" : "closed"}</dd>
            </div>
            <div>
              <dt>Appeal state</dt>
              <dd>{statusLabel(campaign.appealState)}</dd>
            </div>
            <div>
              <dt>Incident state</dt>
              <dd>{statusLabel(campaign.incidentState)}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Milestone schedule</p>
          <h2>Matched funds release in tranches</h2>
          <div className="mpgf-table" aria-label={`${campaign.title} milestone schedule`}>
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
          <p>
            Webhooks can record payment evidence, but sponsor release still requires reviewer
            confirmation, milestone evidence, and partner execution.
          </p>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Destination proof</p>
          <h2>No-custody proof path</h2>
          <p>{campaign.destinationProof.verificationMethod}</p>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Destination type</dt>
              <dd>{statusLabel(campaign.destinationProof.destinationType)}</dd>
            </div>
            <div>
              <dt>Destination reference</dt>
              <dd>{campaign.destinationProof.destinationRef}</dd>
            </div>
            <div>
              <dt>Proof path</dt>
              <dd>{campaign.proofPath}</dd>
            </div>
            <div>
              <dt>Challenge window ends</dt>
              <dd>{formatDate(campaign.challengeWindowEndsAt)}</dd>
            </div>
            <div>
              <dt>Released total</dt>
              <dd>{formatUsd(ledgerRow?.releasedTotalCents ?? 0)}</dd>
            </div>
            <div>
              <dt>Privacy policy</dt>
              <dd>{result.privacyPolicy.replaceAll("_", " ")}</dd>
            </div>
          </dl>
          <p>{campaign.baselineRule}</p>
          <p>{campaign.exitRule}</p>
        </article>
      </section>
    </MpgfPageFrame>
  );
}
