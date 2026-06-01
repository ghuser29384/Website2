import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { formatUsd } from "@/lib/mpgf/mechanism";
import { loadMpgfPublicGoodsKpiSnapshot, type MpgfPublicGoodsKpiSnapshot } from "@/lib/mpgf/public-goods-kpis";
import { loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "MPGF Funding Metrics",
  description:
    "Aggregate-only Moral Public Goods Fund metrics for verified dollars, supporter breadth, threshold clears, sponsor leverage, review quality, and experiment backlog.",
  alternates: {
    canonical: "/mpgf/metrics",
  },
  openGraph: {
    title: "MPGF Funding Metrics",
    description:
      "Privacy-safe aggregate KPIs and experiment backlog for the Moral Public Goods Fund.",
    url: getAbsoluteUrl("/mpgf/metrics"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

function formatBps(value: number | null) {
  return value == null ? "sample pending" : `${Math.round(value / 100)}%`;
}

function formatCount(value: number | null) {
  return value == null ? "sample pending" : String(value);
}

function formatHours(value: number | null) {
  return value == null ? "sample pending" : `${value} hours`;
}

function titleCaseIdentifier(value: string) {
  return value.replaceAll("_", " ");
}

function fundingKpiRows(snapshot: MpgfPublicGoodsKpiSnapshot) {
  return [
    {
      label: "Verified dollars routed to moral public goods",
      value: formatUsd(snapshot.funding.verifiedDollarsRoutedCents),
      why: "Core outcome metric for verified funding.",
    },
    {
      label: "Verified-supporter count per winning campaign",
      value: formatCount(snapshot.funding.verifiedSupporterCountPerWinningCampaign),
      why: "Measures whether winning campaigns have donor breadth.",
    },
    {
      label: "Threshold-clear rate",
      value: formatBps(snapshot.funding.thresholdClearRateBps),
      why: "Shows whether campaign gates are realistic.",
    },
    {
      label: "Sponsor leverage ratio",
      value: formatBps(snapshot.funding.sponsorLeverageRatioBps),
      why: "Shows how much direct giving is amplified.",
    },
    {
      label: "Auto-verified share of contributions",
      value: formatBps(snapshot.funding.autoVerifiedContributionShareBps),
      why: "Measures reduction in manual proof friction.",
    },
    {
      label: "Time from pledge to counted contribution",
      value: formatHours(snapshot.funding.medianHoursFromPledgeToCounted),
      why: "Measures operational efficiency after intent.",
    },
    {
      label: "Sponsor-pool refill rate",
      value: formatBps(snapshot.funding.sponsorPoolRefillRateBps),
      why: "Measures whether the flywheel funds future rounds.",
    },
    {
      label: "Review SLA attainment",
      value: formatBps(snapshot.funding.reviewSlaAttainmentBps),
      why: "Measures trust-layer responsiveness.",
    },
    {
      label: "Dispute rate and overturn rate",
      value: `${formatBps(snapshot.funding.disputeRateBps)} / ${formatBps(snapshot.funding.appealOverturnRateBps)}`,
      why: "Tracks gaming pressure and review quality.",
    },
    {
      label: "Donor retention into next round",
      value: formatBps(snapshot.funding.donorRetentionIntoNextRoundBps),
      why: "Measures whether the mechanism compounds.",
    },
  ];
}

export default async function MpgfMetricsPage() {
  const [viewer, realMoneyReadiness, kpiResult] = await Promise.all([
    getViewer(),
    loadMpgfRealMoneyReadiness(),
    loadMpgfPublicGoodsKpiSnapshot({ dryRun: true }),
  ]);
  const { snapshot } = kpiResult;
  const kpiRows = fundingKpiRows(snapshot);

  return (
    <MpgfPageFrame
      actions={
        <>
          <Link className="button button-secondary" href="/api/mpgf/public-goods/kpis?dryRun=1">
            Open aggregate KPI JSON
          </Link>
          <Link className="button button-secondary" href="/mpgf/governance">
            Governance and rules
          </Link>
          <Link className="button button-secondary" href="/mpgf/contribute">
            Contribution flow
          </Link>
        </>
      }
      description="Aggregate-only funding metrics for the Public Goods Fund: verified routing, supporter breadth, threshold clears, sponsor leverage, auto-import share, review quality, and next-round retention."
      eyebrow="Aggregate funding metrics"
      realMoneyReadiness={realMoneyReadiness}
      title="Measure MPGF as a funding mechanism."
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-kpi-grid" aria-label="MPGF funding KPI summary">
        <div className="mpgf-kpi">
          <span>Verified routed</span>
          <strong>{formatUsd(snapshot.funding.verifiedDollarsRoutedCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Threshold-clear rate</span>
          <strong>{formatBps(snapshot.funding.thresholdClearRateBps)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Auto-verified share</span>
          <strong>{formatBps(snapshot.funding.autoVerifiedContributionShareBps)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Rollout gate</span>
          <strong>{titleCaseIdentifier(snapshot.rolloutGate.recommendation)}</strong>
        </div>
      </section>

      <section className="mpgf-panel">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Funding-specific KPIs</p>
          <h2>Ten aggregate metrics from the CG-VQAF rollout plan</h2>
          <p>
            These numbers are aggregate-only and use the KPI snapshot privacy policy:
            {" "}
            {snapshot.privacyPolicy.replaceAll("_", " ")}. Dry-run mode never widens access or
            publishes raw donor text, private reasons, contact data, or receipt content.
          </p>
        </div>
        <div className="mpgf-table" aria-label="MPGF funding-specific KPI table">
          <div className="mpgf-table-row mpgf-table-head">
            <span>KPI</span>
            <span>Value</span>
            <span>Why it matters</span>
            <span>Privacy boundary</span>
          </div>
          {kpiRows.map((row) => (
            <div className="mpgf-table-row" key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
              <span>{row.why}</span>
              <span>Aggregate only</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Experiment backlog</p>
          <h2>A/B tests without moral ranking</h2>
          <p>
            Experiments compare product mechanics, not moral truth. Assignments use aggregate
            analytics and preserve the no-global-moral-ranking boundary.
          </p>
          <div className="mpgf-table" aria-label="MPGF funding experiment backlog">
            <div className="mpgf-table-row mpgf-table-head">
              <span>Experiment</span>
              <span>Primary metric</span>
              <span>Control</span>
              <span>Treatment</span>
            </div>
            {snapshot.experimentBacklog.experiments.map((experiment) => (
              <div className="mpgf-table-row" key={experiment.experimentKey}>
                <span>{experiment.comparison.replaceAll("_", " ")}</span>
                <span>{experiment.primaryMetric}</span>
                <span>{titleCaseIdentifier(experiment.control)}</span>
                <span>{titleCaseIdentifier(experiment.treatment)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Rollout gate</p>
          <h2>Metrics do not widen access automatically</h2>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Data source</dt>
              <dd>{snapshot.dataSource.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{kpiResult.status.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Access mode</dt>
              <dd>{snapshot.rolloutGate.accessMode.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Automatic widening</dt>
              <dd>{snapshot.rolloutGate.widensPublicAccessAutomatically ? "allowed" : "blocked"}</dd>
            </div>
            <div>
              <dt>Reviewer sample</dt>
              <dd>{snapshot.rolloutGate.reviewerTimingSampleReady ? "ready" : "sample pending"}</dd>
            </div>
            <div>
              <dt>Threshold sample</dt>
              <dd>{snapshot.rolloutGate.thresholdConversionSampleReady ? "ready" : "sample pending"}</dd>
            </div>
          </dl>
          {snapshot.rolloutGate.blockers.length ? (
            <p className="mpgf-small">Current blockers: {snapshot.rolloutGate.blockers.map(titleCaseIdentifier).join(", ")}.</p>
          ) : null}
          {kpiResult.warnings.length ? (
            <p className="mpgf-small">Warnings: {kpiResult.warnings.join(" ")}</p>
          ) : null}
        </article>
      </section>
    </MpgfPageFrame>
  );
}
