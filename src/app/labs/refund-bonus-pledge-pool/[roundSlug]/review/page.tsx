import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  REFUND_BONUS_CALCULATION_VERSION,
  REFUND_BONUS_COMPREHENSION_QUESTIONS,
  REFUND_BONUS_NON_MVP_WARNING,
  computeRefundBonusCents,
  evaluateRefundBonusComprehensionMetrics,
  evaluateRefundBonusHardPledgeGate,
  evaluateRefundBonusOpenGate,
  prepareRefundBonusHardPledgeSubmission,
  type RefundBonusBonusEligibilitySnapshot,
  type RefundBonusIdentityEligibilitySnapshot,
  type RefundBonusPaymentCommitmentSnapshot,
  type RefundBonusPledge,
  type RefundBonusPledgePool,
  type RefundBonusReserve,
  type RefundBonusRound,
} from "@/lib/mpgf/public-goods-refund-bonus-non-mvp";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { saveRefundBonusLabsHardPledgeAction } from "./actions";

export const metadata: Metadata = {
  alternates: {
    canonical: "/labs/refund-bonus-pledge-pool/demo-round/review",
  },
  description: "Non-MVP labs final review and simulated hard-save screen for the backed refund-bonus pledge-pool branch.",
  openGraph: {
    description: "A route-safe final-review screen with a provider-simulated refund-bonus labs hard-save.",
    title: "Refund-Bonus Pledge Pool Final Review",
    type: "website",
    url: getAbsoluteUrl("/labs/refund-bonus-pledge-pool/demo-round/review"),
  },
  title: "Refund-Bonus Pledge Pool Final Review",
};

type PageProps = {
  params: Promise<{ roundSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const now = "2026-07-06T00:00:00.000Z";
const rulebookHash = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const feePolicyHash = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const bonusPolicyHash = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const identitySnapshotHash = "sha256:abababababababababababababababababababababababababababababababab";
const bonusSnapshotHash = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const paymentProviderEvidenceHash = "sha256:cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd";
const paymentSnapshotHash = "sha256:dededededededededededededededededededededededededededededededede";

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
    sponsorNamePublic: "Labs bonus sponsor",
    backedCents: 25_000,
    maxExposureCents: 25_000,
    committedCents: 0,
    committedExposureCents: 0,
    paidCents: 0,
    heldCents: 0,
    releasedUnusedCents: 0,
    backingState: "dev_simulated",
    legalComplianceState: "approved",
    payoutProviderReady: true,
    jurisdictionSet: ["labs"],
    sourceHash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    bonusPolicyHash,
    publishedAt: now,
    backingConfirmedAt: now,
    status: "backed",
    createdAt: now,
    updatedAt: now,
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

function buildLabsOpenGate(round: RefundBonusRound, pool: RefundBonusPledgePool) {
  return evaluateRefundBonusOpenGate({
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
    promotionRecordReady: true,
    staleActiveLabelsAbsent: true,
  });
}

function buildSimulatedIdentitySnapshot(pledge: RefundBonusPledge): RefundBonusIdentityEligibilitySnapshot {
  return {
    id: `${pledge.id}:identity-snapshot`,
    roundId: pledge.roundId,
    participantId: pledge.participantId,
    humanVerified: true,
    identityVerified: true,
    sybilState: "clear",
    collusionState: "clear",
    sameControlClusterId: pledge.sameControlClusterId,
    paymentClusterId: pledge.paymentClusterId,
    countingWeightBps: 10_000,
    bonusEligibilityWeightBps: 10_000,
    snapshotHash: identitySnapshotHash,
    asOf: now,
  };
}

function snapshotReserveBackingState(
  reserve: RefundBonusReserve,
): RefundBonusBonusEligibilitySnapshot["reserveBackingStateAtSave"] {
  switch (reserve.backingState) {
    case "funded":
    case "escrowed":
    case "contractually_committed":
    case "dev_simulated":
      return reserve.backingState;
    case "unbacked":
      return "dev_simulated";
  }
}

function buildSimulatedBonusSnapshot(
  pledge: RefundBonusPledge,
  pool: RefundBonusPledgePool,
  reserve: RefundBonusReserve,
  bonusCents: number,
): RefundBonusBonusEligibilitySnapshot {
  return {
    id: `${pledge.id}:bonus-snapshot`,
    roundId: pledge.roundId,
    poolId: pledge.poolId,
    pledgeId: pledge.id,
    participantId: pledge.participantId,
    eligibleAtPledgeSave: true,
    eligibilityReasonCodes: [],
    humanVerified: true,
    identityVerified: true,
    sybilState: "clear",
    collusionState: "clear",
    sameControlClusterId: pledge.sameControlClusterId,
    paymentClusterId: pledge.paymentClusterId,
    priorBonusAbuseState: "clear",
    jurisdictionEligibilityState: "clear",
    bonusCalculationMode: pool.bonusCalculationMode,
    computedBonusCents: bonusCents,
    perUserBonusCapCents: pool.perUserBonusCapCents,
    reserveId: reserve.id,
    reserveBackingStateAtSave: snapshotReserveBackingState(reserve),
    snapshotHash: bonusSnapshotHash,
    asOf: now,
  };
}

function buildSimulatedPaymentSnapshot(pledge: RefundBonusPledge): RefundBonusPaymentCommitmentSnapshot {
  return {
    id: `${pledge.id}:payment-snapshot`,
    roundId: pledge.roundId,
    poolId: pledge.poolId,
    pledgeId: pledge.id,
    participantId: pledge.participantId,
    paymentMethodRef: `pm_simulated_provider_confirmed_${pledge.id}`,
    commitmentState: "provider_confirmed",
    savedAt: now,
    confirmedAt: now,
    asOf: now,
    supportsFutureAuthorization: true,
    supportsBonusPayoutMethod: true,
    bonusPayoutMethodRef: `bonus_payout_simulated_${pledge.id}`,
    providerEvidenceHash: paymentProviderEvidenceHash,
    snapshotHash: paymentSnapshotHash,
  };
}

export default async function RefundBonusPledgePoolReviewPage({ params, searchParams }: PageProps) {
  const { roundSlug } = await params;
  const query = await searchParams;
  const simulatedSaved = query.saved === "simulated";
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
  const labsOpenRound = { ...round, status: "labs_open" as const };
  const labsOpenPool = { ...pool, status: "labs_open" as const };
  const labsOpenGate = buildLabsOpenGate(labsOpenRound, labsOpenPool);
  const simulatedDraftPledge: RefundBonusPledge = {
    ...buildPledge(labsOpenRound.id, bonusCents),
    id: "simulated-hard-pledge",
    participantId: "signed-in-labs-simulated-user",
    expectedBonusCents: 0,
    finalReviewConfirmedAt: now,
    feeAcknowledged: true,
    sealedProgressAcknowledged: true,
    bonusTermsAcknowledged: true,
    sameControlClusterId: "labs-simulated-control-cluster",
    paymentClusterId: "labs-simulated-payment-cluster",
  };
  const simulatedSubmission = prepareRefundBonusHardPledgeSubmission({
    environment: "development",
    featureEnabled: true,
    round: labsOpenRound,
    pool: labsOpenPool,
    gate: labsOpenGate,
    reserve,
    draftPledge: simulatedDraftPledge,
    identitySnapshot: buildSimulatedIdentitySnapshot(simulatedDraftPledge),
    bonusEligibilitySnapshot: buildSimulatedBonusSnapshot(simulatedDraftPledge, labsOpenPool, reserve, bonusCents),
    paymentCommitmentSnapshot: buildSimulatedPaymentSnapshot(simulatedDraftPledge),
    currentGrossExposureCents: 0,
    currentBonusExposureCents: 0,
  });
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
  const comprehensionMetrics = evaluateRefundBonusComprehensionMetrics({
    chargeTimingAnswered: 0,
    chargeTimingIncorrect: 0,
    bonusEligibilityAnswered: 0,
    bonusEligibilityIncorrect: 0,
    bonusCharacterizationAnswered: 0,
    bonusCharacterizationIncorrect: 0,
    realMoneyPilot: false,
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
              This labs page shows the mandatory v137 final-review and payment setup copy. The
              Screen 3 action below runs a provider-simulated hard-pledge save through the same
              gate helper used by the mechanism model. It does not save a real payment method,
              call a provider, authorize a card, capture funds, pay bonuses, or create production
              rows.
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
              <dt>Counts toward pool threshold if all gates pass</dt>
              <dd>{formatUsd(pledge.estimatedNetRecipientCents)}</dd>
            </div>
            <div>
              <dt>Bonus reserve</dt>
              <dd>{reserve.backingState === "dev_simulated" ? "labs simulation only" : "backed"}</dd>
            </div>
            <div>
              <dt>Sponsor match</dt>
              <dd>{pool.sponsorMatchBacked ? "backed if shown" : "not active"}</dd>
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
            <p style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
              Rulebook hash: <code style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>{rulebookHash}</code>.
              Fee policy hash:{" "}
              <code style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>{feePolicyHash}</code>. Bonus
              policy hash: <code style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>{bonusPolicyHash}</code>.
            </p>
            <form action={saveRefundBonusLabsHardPledgeAction} className="compact-form">
              <input name="roundSlug" type="hidden" value={roundSlug} />
              <button className="button button-secondary" type="submit">
                Run simulated hard pledge save
              </button>
              <p>
                Uses a synthetic signed-in labs participant fixture, a provider-confirmed payment
                commitment snapshot, identity and bonus snapshots, and the dev-simulated backed
                reserve. Production public exposure and real-money movement remain disabled.
              </p>
            </form>
          </div>
          {simulatedSaved ? (
            <div className="mpgf-panel" id="simulated-hard-pledge-result">
              <p>
                <strong>
                  {simulatedSubmission.allowed ? "Simulated hard pledge saved." : "Simulated hard pledge blocked."}
                </strong>
              </p>
              <dl className="mpgf-summary-grid">
                <div>
                  <dt>Pledge state</dt>
                  <dd>{simulatedSubmission.pledge.pledgeState}</dd>
                </div>
                <div>
                  <dt>Payment snapshot</dt>
                  <dd>{simulatedSubmission.pledge.paymentCommitmentSnapshotId ?? "missing"}</dd>
                </div>
                <div>
                  <dt>Identity snapshot</dt>
                  <dd>{simulatedSubmission.pledge.identityEligibilitySnapshotId ?? "missing"}</dd>
                </div>
                <div>
                  <dt>Bonus snapshot</dt>
                  <dd>{simulatedSubmission.pledge.bonusEligibilitySnapshotId ?? "missing"}</dd>
                </div>
                <div>
                  <dt>Provider method</dt>
                  <dd>
                    {simulatedSubmission.pledge.providerPaymentMethodConfirmed
                      ? "provider-confirmed simulation"
                      : "not confirmed"}
                  </dd>
                </div>
                <div>
                  <dt>Reserved exposure</dt>
                  <dd>{formatUsd(simulatedSubmission.pledge.bonusExposureReservedCents)}</dd>
                </div>
                <div>
                  <dt>Reserve committed</dt>
                  <dd>{formatUsd(simulatedSubmission.reserve.committedExposureCents)}</dd>
                </div>
                <div>
                  <dt>Blockers</dt>
                  <dd>{simulatedSubmission.blockerCodes.join(", ") || "none"}</dd>
                </div>
              </dl>
              <p>
                This is a route-local labs simulation only: no authorization, capture, provider
                payout, public donor disclosure, or production persistence occurred.
              </p>
            </div>
          ) : null}
        </section>

        <section className="section section-subtle" aria-labelledby="comprehension-heading">
          <SectionHeader eyebrow="Comprehension checks" id="comprehension-heading" title="Charge timing and bonus eligibility must be understood.">
            These questions are required before hard pledge or immediately after save in any later promoted flow; this labs route records no answers.
          </SectionHeader>
          <div className="data-grid">
            {REFUND_BONUS_COMPREHENSION_QUESTIONS.map((question) => (
              <article className="panel data-card" key={question.id}>
                <p className="detail-kicker">Correct answer: {question.correctChoiceId}</p>
                <h3>{question.prompt}</h3>
                <ol>
                  {question.choices.map((choice) => (
                    <li key={choice.id}>
                      {choice.id}. {choice.label}
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
          <div className="mpgf-panel">
            <p>
              Real-money pilots pause if more than 5% answer charge timing incorrectly or more than
              10% answer bonus eligibility incorrectly.
            </p>
            <p>
              Current labs measurement state: {comprehensionMetrics.pauseReasonCodes.join(", ")}.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
