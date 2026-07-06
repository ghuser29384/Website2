import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING,
  buildAtLeastTierPlatformMatchCommitmentPreview,
  computeDampedOddsRewardSchedule,
  evaluateAtLeastTierCommitmentOpenGate,
  type PlatformMatchReserve,
} from "@/lib/mpgf/public-goods-at-least-tier-platform-match";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: "/labs/at-least-tier-platform-match/demo-round/commit",
  },
  description: "Disabled non-MVP labs commitment review for the at-least-tier platform-match branch.",
  openGraph: {
    description: "A route-safe final-review copy surface for a disabled labs platform-match commitment.",
    title: "At-Least-Tier Platform Match Commitment Review",
    type: "website",
    url: getAbsoluteUrl("/labs/at-least-tier-platform-match/demo-round/commit"),
  },
  title: "At-Least-Tier Platform Match Commitment Review",
};

type PageProps = {
  params: Promise<{ roundSlug: string }>;
};

const now = "2026-07-06T00:00:00.000Z";

function buildSimulatedReserve(roundId: string): PlatformMatchReserve {
  return {
    id: "platform-match-reserve-demo",
    roundId,
    poolId: "reviewed-public-goods-pool",
    reserveType: "at_least_tier_platform_match",
    backedCents: 1_000_000,
    committedCents: 0,
    paidCents: 0,
    releasedUnusedCents: 0,
    maxExposureCents: 1_000_000,
    backingState: "dev_simulated",
    legalComplianceState: "approved",
    paymentProviderReady: true,
    recipientRouteReady: true,
    sourceHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    platformMatchPolicyHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    status: "backed",
    createdAt: now,
    updatedAt: now,
  };
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

export default async function AtLeastTierPlatformMatchCommitPage({ params }: PageProps) {
  const { roundSlug } = await params;
  const roundId = `labs-at-least-tier-${roundSlug}`;
  const poolId = "reviewed-public-goods-pool";
  const simulatedReserve = buildSimulatedReserve(roundId);
  const schedule = computeDampedOddsRewardSchedule({
    freeze: true,
    now,
    roundId,
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 300_000, frozenForecastProbabilityBps: 5_500 },
      { tierIndex: 3, thresholdNetRecipientCents: 500_000, frozenForecastProbabilityBps: 3_500 },
      { tierIndex: 4, thresholdNetRecipientCents: 1_000_000, frozenForecastProbabilityBps: 2_000 },
      { tierIndex: 5, thresholdNetRecipientCents: 2_500_000, frozenForecastProbabilityBps: 1_000 },
    ],
  });
  const selectedTier = schedule.tiers[1] ?? schedule.tiers[0]!;
  const preview = buildAtLeastTierPlatformMatchCommitmentPreview({
    id: "disabled-preview-commitment",
    roundId,
    poolId,
    participantId: "labs-preview-participant",
    selectedTierIndex: selectedTier.tierIndex,
    statedGrossCents: 2_500,
    estimatedFeeCents: 95,
    rewardRateBps: selectedTier.rewardRateBps,
    platformMatchReserveId: simulatedReserve.id,
    now,
  });
  const openGate = evaluateAtLeastTierCommitmentOpenGate({
    actorRole: "labs_participant",
    environment: "development",
    roundId,
    poolId,
    roundStatus: "preflight",
    featureEnabled: true,
    rewardScheduleFrozen: true,
    rewardScheduleValid: schedule.valid,
    reserve: simulatedReserve,
    currentReservedExposureCents: 0,
    requestedExposureCents: preview.platformMatchExposureReservedCents,
    copyPreflightPassed: true,
    paymentMethodProviderConfirmed: false,
    finalReviewConfirmed: false,
    ownCommitmentExclusionAcknowledged: false,
    lossChargeAcknowledged: false,
    noDirectPayoutAcknowledged: false,
    nonMvpAcknowledged: true,
  });

  return (
    <div className="page-shell page-shell-focused">
      <header className="v72-route-header">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <Breadcrumbs
          items={[
            { href: "/mpgf", label: "Public Goods Fund" },
            { href: "/labs/at-least-tier-platform-match", label: "At-least-tier labs" },
            { href: `/labs/at-least-tier-platform-match/${roundSlug}`, label: "Labs round" },
            { href: `/labs/at-least-tier-platform-match/${roundSlug}/commit`, label: "Commitment review" },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="commit-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Disabled labs review</p>
            <h1 id="commit-heading">At-least-tier commitment review.</h1>
            <p>{AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING}</p>
            <p>
              This page shows the required v137 commitment copy in an off state. It does not save
              a hard commitment, save a payment method, reserve exposure, authorize a card, capture
              funds, or route platform-match contributions.
            </p>
          </div>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Selected forecast</dt>
              <dd>at least Tier {preview.selectedTierIndex}</dd>
            </div>
            <div>
              <dt>Stated contribution if not met</dt>
              <dd>{formatUsd(preview.statedGrossCents)}</dd>
            </div>
            <div>
              <dt>Platform-match rate if met</dt>
              <dd>{(preview.platformMatchRewardRateBps / 100).toFixed(2)}%</dd>
            </div>
            <div>
              <dt>Commitment gate</dt>
              <dd>{openGate.blockerCodes.join(", ")}</dd>
            </div>
          </dl>
        </section>

        <section className="section section-subtle" aria-labelledby="amount-heading">
          <SectionHeader eyebrow="Screen 2" id="amount-heading" title="Amount and selected tier.">
            The participant chooses an at-least tier, stated intended contribution, aggregate-only visibility, and optional viewpoint tag before final review.
          </SectionHeader>
          <div className="mpgf-panel">
            <p>
              Higher tiers have higher platform-match rates because they are harder to reach. The
              rates are frozen before the round opens using a reviewed schedule.
            </p>
            <p>
              If the forecast is met, Moral Trade contributes approximately{" "}
              {formatUsd(preview.platformMatchNetCents)} net to reviewed projects and the
              participant is charged $0. If the forecast is not met, the participant may be charged{" "}
              {formatUsd(preview.statedGrossCents)}, with approximately{" "}
              {formatUsd(preview.statedNetRecipientCents)} going to the projects after fees.
            </p>
            <p>
              The participant&apos;s own commitment and same-control accounts do not count toward
              the forecast result. Platform-match payments do not count toward forecast results.
            </p>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="review-heading">
          <SectionHeader eyebrow="Screen 3" id="review-heading" title="Final review and payment setup.">
            A real hard commitment would require provider-confirmed payment readiness and all acknowledgements; this route intentionally leaves those gates closed.
          </SectionHeader>
          <div className="mpgf-panel">
            <p>You are saving a hard, payment-backed platform-match commitment.</p>
            <p>
              Selected forecast: at least Tier {preview.selectedTierIndex}. Your stated intended
              contribution if your forecast is not met: {formatUsd(preview.statedGrossCents)}.
              Estimated net to projects if you pay: {formatUsd(preview.statedNetRecipientCents)}.
              Platform-match rate if your forecast is met:{" "}
              {(preview.platformMatchRewardRateBps / 100).toFixed(2)}%. Estimated platform
              contribution if your forecast is met: {formatUsd(preview.platformMatchNetCents)}{" "}
              net to projects.
            </p>
            <p>
              If other eligible users&apos; effective support reaches at least Tier{" "}
              {preview.selectedTierIndex}, Moral Trade contributes the platform-match amount to
              the projects from a backed reserve, and you are charged $0.
            </p>
            <p>
              If other eligible users&apos; effective support does not reach Tier{" "}
              {preview.selectedTierIndex}, you are charged {formatUsd(preview.statedGrossCents)},
              and approximately {formatUsd(preview.statedNetRecipientCents)} goes to the projects
              after fees.
            </p>
            <p>
              Your own commitment and same-control accounts do not count toward your forecast
              result. Platform-match payments, sponsor match, fees, drafts, and failed payments do
              not count toward forecast results.
            </p>
            <p>
              Saving your payment method is not a charge, not a hold, not escrow, not custody, not
              an authorization, and not a guarantee that authorization will later succeed.
            </p>
            <ul>
              <li>I understand my own commitment does not count toward my forecast result.</li>
              <li>I understand that if I lose, I may be charged my stated contribution.</li>
              <li>I understand that if I win, the platform contributes the tier-specific match amount to the projects and I receive no direct payment.</li>
              <li>I understand this is non-MVP and may be simulation-only.</li>
            </ul>
            <button className="button button-secondary" type="button" disabled>
              Hard commitment disabled
            </button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
