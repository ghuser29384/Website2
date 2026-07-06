import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  REFUND_BONUS_CALCULATION_VERSION,
  REFUND_BONUS_NON_MVP_WARNING,
  computeRefundBonusCents,
  evaluateRefundBonusHardPledgeGate,
  evaluateRefundBonusOpenGate,
  type RefundBonusPledge,
  type RefundBonusPledgePool,
  type RefundBonusReserve,
  type RefundBonusRound,
} from "@/lib/mpgf/public-goods-refund-bonus-non-mvp";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: "/labs/refund-bonus-pledge-pool/demo-round/review",
  },
  description: "Disabled non-MVP labs final review for the backed refund-bonus pledge-pool branch.",
  openGraph: {
    description: "A route-safe final-review screen for a disabled refund-bonus labs flow.",
    title: "Refund-Bonus Pledge Pool Final Review",
    type: "website",
    url: getAbsoluteUrl("/labs/refund-bonus-pledge-pool/demo-round/review"),
  },
  title: "Refund-Bonus Pledge Pool Final Review",
};

type PageProps = {
  params: Promise<{ roundSlug: string }>;
};

const now = "2026-07-06T00:00:00.000Z";
const rulebookHash = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const feePolicyHash = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const bonusPolicyHash = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

function buildRound(roundSlug: string): RefundBonusRound {
  return {
    id: `labs-refund-bonus-${roundSlug}`,
    deploymentMode: "refund_bonus_non_mvp_labs",
    featureClassification: "non_mvp",
    status: "preflight",
    activePoolId: "labs-refund-bonus-pool",
    participantMinGrossCents: 500,
    participantMaxGrossCents: 2_500,
    roundGrossCaptureCapCents: 100_000,
    roundBonusExposureCapCents: 25_000,
    opensAt: "2026-07-06T00:00:00.000Z",
    closesAt: "2026-07-13T00:00:00.000Z",
    challengeDeadlineAt: "2026-07-14T00:00:00.000Z",
    parametersFrozenAt: now,
    rulebookHash,
    feePolicyHash,
    bonusPolicyHash,
    calculationVersion: REFUND_BONUS_CALCULATION_VERSION,
    sealedProgressMode: "qualitative_only_before_close",
    refundBonusOpenGateId: "labs-refund-bonus-gate",
    copyPreflightState: "passed",
    productionPublicEnabled: false,
    productionRealMoneyEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
}

function buildPool(roundId: string): RefundBonusPledgePool {
  return {
    id: "labs-refund-bonus-pool",
    roundId,
    title: "Reviewed public-good pool",
    summary: "Disabled labs pool for v137 final-review copy.",
    projectIds: ["project-a", "project-b"],
    allocationWeightsBpsByProjectId: { "project-a": 5_000, "project-b": 5_000 },
    thresholdNetRecipientCents: 5_000,
    minVerifiedSupporters: 2,
    minDistinctViewpointClusters: 2,
    minNetRecipientCentsPerSupporter: 500,
    sponsorMatchEnabled: true,
    sponsorMatchBacked: true,
    refundBonusEnabled: true,
    refundBonusReserveId: "labs-refund-bonus-reserve",
    bonusCalculationMode: "percentage_of_pledge_capped",
    bonusRatioBps: 1_000,
    perUserBonusCapCents: 250,
    roundBonusExposureCapCents: 25_000,
    qualifyingFailureModes: [
      "net_recipient_threshold_shortfall",
      "verified_supporter_threshold_shortfall",
      "different_view_threshold_shortfall",
    ],
    status: "draft",
    reviewGates: {
      projectScope: "clear",
      recipientRoute: "verified",
      baseline: "clear",
      actionEvidence: "adequate",
      antiThreat: "clear",
      externality: "clear",
      conflict: "clear",
      challenge: "clear",
    },
    rulebookHash,
    feePolicyHash,
    bonusPolicyHash,
    createdAt: now,
  };
}

function buildReserve(roundId: string): RefundBonusReserve {
  return {
    id: "labs-refund-bonus-reserve",
    roundId,
    poolId: "labs-refund-bonus-pool",
    reserveType: "failure_participation_bonus",
    backedCents: 25_000,
    maxExposureCents: 25_000,
    committedExposureCents: 0,
    paidCents: 0,
    heldCents: 0,
    releasedUnusedCents: 0,
    backingState: "dev_simulated",
    legalComplianceState: "approved",
    payoutProviderReady: true,
    sourceHash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    bonusPolicyHash,
    publishedAt: now,
    backingConfirmedAt: now,
    status: "backed",
  };
}

function buildPledge(roundId: string, bonusCents: number): RefundBonusPledge {
  return {
    id: "disabled-review-pledge",
    roundId,
    poolId: "labs-refund-bonus-pool",
    participantId: "labs-preview-participant",
    maxGrossCents: 2_500,
    feeCents: 95,
    estimatedFeeCents: 95,
    estimatedNetRecipientCents: 2_405,
    viewpointCluster: "prefer_not_to_say",
    visibility: "aggregate_only",
    pledgeState: "draft",
    expectedBonusCents: bonusCents,
    feeAcknowledged: false,
    sealedProgressAcknowledged: false,
    bonusTermsAcknowledged: false,
    providerPaymentMethodConfirmed: false,
    humanVerified: true,
    identityVerified: true,
    sybilState: "clear",
    collusionState: "clear",
    priorBonusAbuseState: "clear",
    jurisdictionEligibilityState: "clear",
    bonusEligibilityWeightBps: 10_000,
    countingWeightBps: 10_000,
    rulebookHashAtConsent: rulebookHash,
    feePolicyHashAtConsent: feePolicyHash,
    bonusPolicyHashAtConsent: bonusPolicyHash,
    bonusExposureReservedCents: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export default async function RefundBonusPledgePoolReviewPage({ params }: PageProps) {
  const { roundSlug } = await params;
  const round = buildRound(roundSlug);
  const pool = buildPool(round.id);
  const reserve = buildReserve(round.id);
  const bonusCents = computeRefundBonusCents({
    bonusRatioBps: 1_000,
    maxGrossCents: 2_500,
    mode: "percentage_of_pledge_capped",
    perUserBonusCapCents: 250,
  });
  const pledge = buildPledge(round.id, bonusCents);
  const gate = evaluateRefundBonusOpenGate({
    id: "labs-refund-bonus-gate",
    roundId: round.id,
    poolId: pool.id,
    checkedAt: now,
    lastDeployHash: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    routeCopyPreflightPassed: true,
    projectReviewReady: true,
    bonusReserveReady: true,
    bonusPolicyFrozen: true,
    sponsorStateReady: true,
    capsReady: true,
    paymentProviderReady: true,
    bonusPayoutProviderReady: true,
    identitySybilControlsReady: true,
    legalComplianceReady: true,
    rulebookFrozen: true,
    feePolicyFrozen: true,
    sealedProgressConfigured: true,
    emergencyPauseConfigured: true,
    promotionRecordReady: false,
    staleActiveLabelsAbsent: true,
  });
  const hardPledgeGate = evaluateRefundBonusHardPledgeGate({
    environment: "development",
    featureEnabled: true,
    round,
    pool,
    gate,
    reserve,
    pledge,
    currentGrossExposureCents: 0,
    currentBonusExposureCents: 0,
  });

  return (
    <div className="page-shell page-shell-focused">
      <header className="v72-route-header">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <Breadcrumbs
          items={[
            { href: "/mpgf", label: "Public Goods Fund" },
            { href: "/labs/refund-bonus-pledge-pool", label: "Refund-bonus labs" },
            { href: `/labs/refund-bonus-pledge-pool/${roundSlug}`, label: "Pool" },
            { href: `/labs/refund-bonus-pledge-pool/${roundSlug}/review`, label: "Review" },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="review-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Screen 3 of 3</p>
            <h1 id="review-heading">Final review.</h1>
            <p>{REFUND_BONUS_NON_MVP_WARNING}</p>
            <p>
              This disabled labs page shows the mandatory v137 final-review and payment setup
              copy. It does not save a hard pledge, save a payment method, reserve bonus exposure,
              authorize a card, capture funds, or pay bonuses.
            </p>
          </div>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Maximum gross charge if cleared</dt>
              <dd>{formatUsd(pledge.maxGrossCents)}</dd>
            </div>
            <div>
              <dt>Estimated fees if charged</dt>
              <dd>{formatUsd(pledge.estimatedFeeCents)}</dd>
            </div>
            <div>
              <dt>Estimated net to projects</dt>
              <dd>{formatUsd(pledge.estimatedNetRecipientCents)}</dd>
            </div>
            <div>
              <dt>Hard pledge gate</dt>
              <dd>{hardPledgeGate.blockerCodes.join(", ")}</dd>
            </div>
          </dl>
        </section>

        <section className="section section-subtle" aria-labelledby="charge-heading">
          <SectionHeader eyebrow="Charge conditions" id="charge-heading" title="Saving payment readiness is not a charge.">
            A participant is charged only after close if all success gates, review gates, exact authorization, and recomputation still clear.
          </SectionHeader>
          <div className="mpgf-panel">
            <p>You are saving a hard pledge, not making an immediate donation.</p>
            <p>
              You are charged only if the pool reaches its net-recipient threshold, enough verified
              supporters join, enough different-view support joins, review and challenge gates pass,
              sponsor match is backed if shown, exact authorization succeeds, and the pool still
              clears after failed authorizations are removed.
            </p>
            <p>
              Saving your payment method is not a charge, not a hold, not escrow, not custody, not
              an authorization, not a guarantee that authorization will later succeed, and not a
              guarantee of bonus payout outside the listed bonus-eligible failure state.
            </p>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="bonus-review-heading">
          <SectionHeader eyebrow="Bonus conditions" id="bonus-review-heading" title="The failure-participation bonus is conditional.">
            It is not a moral score, not a public reputation reward, not a donation receipt, not investment income, not interest, not a lottery, not guaranteed outside the qualifying failure state, not impact, not sponsor match, and not project funding.
          </SectionHeader>
          <div className="mpgf-panel">
            <p>
              Failure-participation bonus if the pool misses a bonus-eligible support threshold:
              {` ${formatUsd(bonusCents)}`}.
            </p>
            <p>
              A participant may receive this bonus only if they saved an eligible hard pledge before
              close, identity, payment, and Sybil checks pass, the reserve was backed under frozen
              terms, the pool fails for a bonus-eligible support-threshold reason, and the pool is
              not blocked or canceled for safety, legal, review, fraud, or threat-like reasons.
            </p>
            <p>
              Rulebook hash: {rulebookHash}. Fee policy hash: {feePolicyHash}. Bonus policy hash:
              {` ${bonusPolicyHash}`}.
            </p>
            <button className="button button-secondary" type="button" disabled>
              Save hard pledge disabled
            </button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
