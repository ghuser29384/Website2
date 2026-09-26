import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, MetricCard, PageHero, SectionHeader, StepCard } from "@/components/ui/page-primitives";
import { getDonationOffsetOverview, getViewer, type DonationOffsetOverview } from "@/lib/app-data";
import {
  buildDemoDonationOffsetDonorOfRecordPreview,
  buildDemoDonationOffsetAuthorityFairnessPreview,
  buildDemoDonationOffsetExternalityEvidencePreview,
  buildDemoDonationOffsetParticipantConfirmationPreview,
  buildDemoDonationOffsetPaymentDestinationPreview,
  buildDemoDonationOffsetSafetyAuthenticityPreview,
  buildDemoDonationOffsetBatchClearingDryRun,
  buildDonationOffsetBatchClearingDryRun,
  getConsensusCharities,
  type DonationOffsetBatchClearingDryRun,
  type DonationOffsetDonorOfRecordGateStatus,
  type DonationOffsetVerificationMethod,
} from "@/lib/donation-offsets";
import { DONATION_OFFSET_PLAIN_LABELS } from "@/lib/marketplace-seed-templates";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

const moralTradePaperUrl = "https://www.amirrorclear.net/files/moral-trade.pdf";
const forethoughtCompromiseUrl =
  "https://www.forethought.org/research/convergence-and-compromise";
const forethoughtPublicGoodsUrl =
  "https://www.forethought.org/research/moral-public-goods-are-a-big-deal-for-whether-we-get-a-good-future";

export const metadata: Metadata = {
  title: "Donation offsets",
  description:
    "Redirect opposed donations into a shared good with explicit baseline, destination, evidence, surplus, and expiry rules.",
  alternates: {
    canonical: "/donation-offsets",
  },
  openGraph: {
    title: "Donation offsets",
    description:
      "Redirect opposed donations into a shared good with explicit baseline, destination, evidence, surplus, and expiry rules.",
    url: getAbsoluteUrl("/donation-offsets"),
    type: "website",
  },
};

function formatUsdFromCents(amountCents: number | null | undefined) {
  if (amountCents === null || amountCents === undefined) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function formatUsdFromUsd(amountUsd: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amountUsd % 1 === 0 ? 0 : 2,
  }).format(amountUsd);
}

function buildDonationOffsetDryRun(overview: DonationOffsetOverview | null): DonationOffsetBatchClearingDryRun {
  const pool = overview?.pools[0];

  if (!pool) {
    return buildDemoDonationOffsetBatchClearingDryRun();
  }

  const offsetRatio = Number(pool.offset_ratio);
  const sideALabel = pool.side_a_label || "Side A";
  const sideBLabel = pool.side_b_label || "Side B";

  return buildDonationOffsetBatchClearingDryRun({
    poolId: pool.id,
    poolName: pool.name,
    offsetRatio,
    assuranceMinimumUsd: pool.assurance_minimum_cents / 100,
    assuranceDeadline: pool.assurance_deadline_at,
    destinationLabel: pool.compromiseCharity?.name ?? "Selected compromise destination",
    verificationMethod: pool.verification_method as DonationOffsetVerificationMethod,
    commitments: [
      {
        id: `${pool.id}:side-a-aggregate`,
        participantLabel: `${pool.sideACommitmentCount} ${sideALabel} commitments`,
        side: "side_a",
        amountUsd: pool.sideATotalCents / 100,
        ratioMinimum: offsetRatio,
        ratioMaximum: offsetRatio,
        status: pool.sideATotalCents > 0 ? "active" : "blocked",
      },
      {
        id: `${pool.id}:side-b-aggregate`,
        participantLabel: `${pool.sideBCommitmentCount} ${sideBLabel} commitments`,
        side: "side_b",
        amountUsd: pool.sideBTotalCents / 100,
        ratioMinimum: offsetRatio,
        ratioMaximum: offsetRatio,
        status: pool.sideBTotalCents > 0 ? "active" : "blocked",
      },
    ],
  });
}

function formatDryRunStatus(value: DonationOffsetBatchClearingDryRun["atomicSettlementGroup"]["status"]) {
  return value === "ready_for_final_lock_confirmation"
    ? "Ready for final confirmations"
    : "Blocked preview only";
}

function formatDonorGateStatus(status: DonationOffsetDonorOfRecordGateStatus) {
  return status.replaceAll("_", " ");
}

function donorGateStatusClass(status: DonationOffsetDonorOfRecordGateStatus) {
  if (status === "blocked") {
    return "blocked";
  }

  if (status === "needs_input" || status === "human_review") {
    return "human_review";
  }

  return "pass";
}

export default async function DonationOffsetsPage() {
  const viewer = await getViewer();
  const overview = hasSupabaseEnv() ? await getDonationOffsetOverview() : null;
  const consensusCharities = getConsensusCharities();
  const clearingDryRun = buildDonationOffsetDryRun(overview);
  const donorOfRecordPreview = buildDemoDonationOffsetDonorOfRecordPreview();
  const paymentDestinationPreview = buildDemoDonationOffsetPaymentDestinationPreview();
  const externalityEvidencePreview = buildDemoDonationOffsetExternalityEvidencePreview();
  const participantConfirmationPreview = buildDemoDonationOffsetParticipantConfirmationPreview();
  const safetyAuthenticityPreview = buildDemoDonationOffsetSafetyAuthenticityPreview();
  const authorityFairnessPreview = buildDemoDonationOffsetAuthorityFairnessPreview();
  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <Breadcrumbs items={[{ href: "/donation-offsets", label: "Donation offsets" }]} />

        <PageHero
          eyebrow="Donation offsets"
          title="Redirect opposed donations into shared good."
          description="When two donors would otherwise fund opposing efforts, they can redirect matched funds to a mutually acceptable destination."
          actions={
            <>
              <Link
                className="button button-primary"
                href="/offers/new?entry=draft&template=pure-opposed-cause&mode=offset"
              >
                Start an offset draft
              </Link>
              <Link className="button button-secondary" href="/offers?mode=offset">
                View offset examples
              </Link>
              <Link
                className="button button-secondary"
                href="/trades/new?structure=conditional-donation"
              >
                Create a conditional donation
              </Link>
            </>
          }
        >
          <aside className="hero-panel panel">
            <p className="eyebrow">Legal posture</p>
            <h2>No custody / no escrow / no tax advice</h2>
            <p>
              Offset records use external-payment evidence and reviewer notes. The platform does
              not hold money or certify tax treatment.
            </p>
          </aside>
        </PageHero>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="offset-example-heading">
          <SectionHeader
            eyebrow="One-screen example"
            id="offset-example-heading"
            title="A small redirect before any money moves."
          >
            Without the trade, A would give $50 to Cause X and B would give $50 to opposed
            Cause Y. If it clears, both redirect $50 to GiveWell Top Charities Fund. Reviewers
            check prior intent, payment proof, destination, and externality blockers.
          </SectionHeader>
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>If nobody trades</h3>
              <p>A gives $50 to Cause X. B gives $50 to opposed Cause Y.</p>
            </article>
            <article className="panel concept-card">
              <h3>If this clears</h3>
              <p>Both redirect $50 to GiveWell Top Charities Fund after review.</p>
            </article>
            <article className="panel concept-card">
              <h3>What reviewers check</h3>
              <p>Prior intent, payment proof, destination verification, and safety blockers.</p>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="offset-steps-heading">
          <SectionHeader eyebrow="Offset flow" id="offset-steps-heading" title="Three steps make an offset reviewable." />
          <div className="step-card-grid">
            <StepCard index={1} title="State the baseline donations.">
              Say what each side would otherwise fund, and why that baseline is credible.
            </StepCard>
            <StepCard index={2} title="Choose a compromise destination.">
              Pick one named charity or fund both sides can regard as a shared good.
            </StepCard>
            <StepCard index={3} title="Set rules before reliance.">
              Record match, surplus, evidence, expiry, and anti-threat certification.
            </StepCard>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="valid-offset-heading">
          <SectionHeader
            eyebrow="Offset questions"
            id="valid-offset-heading"
            title="Answer ordinary questions before showing mechanism detail."
          />
          <div className="checklist-card-grid">
            {DONATION_OFFSET_PLAIN_LABELS.map((label) => (
              <article className="panel checklist-card" key={label}>
                <span aria-hidden="true">OK</span>
                <h3>{label}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="offset-trust-heading">
          <SectionHeader eyebrow="Trust block" id="offset-trust-heading" title="Offsets fail if the baseline is fake or coercive." />
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Factual trust</h3>
              <p>Receipts, prior giving records, or third-party attestations can support review.</p>
            </article>
            <article className="panel concept-card">
              <h3>Counterfactual trust</h3>
              <p>The donor must credibly show they would have made the opposed donation anyway.</p>
            </article>
            <article className="panel concept-card">
              <h3>Perverse-incentive screening</h3>
              <p>Threat-like baselines, coercive copy, and prohibited destinations are blocked.</p>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="destination-heading">
          <SectionHeader eyebrow="Destinations" id="destination-heading" title="Available compromise destinations." />
          <div className="data-grid">
            {consensusCharities.map((charity) => (
              <article className="panel data-card" key={charity.id}>
                <p className="detail-kicker">{charity.consensusLabel}</p>
                <h3>{charity.name}</h3>
                <p>{charity.summary}</p>
                <a className="inline-link" href={charity.websiteUrl}>
                  Open destination
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="offset-snapshot-heading">
          <SectionHeader eyebrow="Marketplace snapshot" id="offset-snapshot-heading" title="Current offset activity." />
          {!hasSupabaseEnv() ? (
            <div className="status-banner status-banner-error">
              Live offset statistics appear after the database is configured.
            </div>
          ) : null}
          <div className="pilot-metric-grid">
            <MetricCard
              label="Redirected so far"
              value={formatUsdFromCents(overview?.totalRedirectedCents)}
              detail="Reviewed direct offset records only."
            />
            <MetricCard
              label="Public-good routed amount"
              value={formatUsdFromCents(overview?.moralPublicGoodsRedirectedCents)}
              detail="Completed offsets routed to broad public goods."
            />
            <MetricCard
              label="Active pooled commitments"
              value={formatUsdFromCents(overview?.pooledCommitmentCents)}
              detail="Committed pool amount, not verified redirection."
            />
            <MetricCard
              label="Active pools"
              value={overview ? String(overview.pools.length) : "Unavailable"}
              detail="Pools gathering commitments before verification."
            />
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="offset-clearing-heading">
          <SectionHeader
            eyebrow="Batch clearing dry run"
            id="offset-clearing-heading"
            title="Preview atomic offset lock before reliance."
          >
            This dry run reserves commitment inventory, checks ratio bounds, previews all-or-none
            settlement, and drafts final-lock terms without capture, custody, or reliance.
          </SectionHeader>
          <div className="pilot-metric-grid">
            <MetricCard
              label="Matched side A"
              value={formatUsdFromUsd(clearingDryRun.matchedSideAUsd)}
              detail="Reserved only inside this preview bundle."
            />
            <MetricCard
              label="Matched side B"
              value={formatUsdFromUsd(clearingDryRun.matchedSideBUsd)}
              detail={`Clearing ratio ${clearingDryRun.finalLockProposal.clearingRatio}.`}
            />
            <MetricCard
              label="Compromise destination"
              value={formatUsdFromUsd(clearingDryRun.compromiseTotalUsd)}
              detail={clearingDryRun.finalLockProposal.destinationLabel}
            />
            <MetricCard
              label="Atomic status"
              value={formatDryRunStatus(clearingDryRun.atomicSettlementGroup.status)}
              detail="All required participants must freshly confirm before lock."
            />
          </div>
          <div className="mpgf-table" aria-label="Donation offset commitment inventory reservation">
            <div className="mpgf-table-row mpgf-table-head">
              <span>Commitment inventory</span>
              <span>Committed</span>
              <span>Reserved</span>
              <span>Status</span>
            </div>
            {clearingDryRun.commitmentInventory.map((reservation) => (
              <div className="mpgf-table-row" key={reservation.commitmentId}>
                <span>{reservation.participantLabel}</span>
                <span>{formatUsdFromUsd(reservation.committedUsd)}</span>
                <span>{formatUsdFromUsd(reservation.reservedUsd)}</span>
                <span>
                  {reservation.reservationStatus.replaceAll("_", " ")}
                  {reservation.blockerCodes.length ? `: ${reservation.blockerCodes.join(", ")}` : ""}
                </span>
              </div>
            ))}
          </div>
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Final lock proposal</h3>
              <p>
                Exact matched volume: {formatUsdFromUsd(clearingDryRun.finalLockProposal.exactCompromiseDestinationUsd)} to{" "}
                {clearingDryRun.finalLockProposal.destinationLabel}. Evidence standard:{" "}
                {clearingDryRun.finalLockProposal.evidenceStandard}.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>No capture in preview</h3>
              <p>
                Capture allowed: no. Reliance-bearing: no. Required fresh confirmations:{" "}
                {clearingDryRun.finalLockProposal.requiredFreshConfirmations}.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Fail-closed blockers</h3>
              <p>
                {clearingDryRun.userFacingBlockers.length
                  ? clearingDryRun.userFacingBlockers.join(" ")
                  : "No preview blockers. Final lock still requires fresh confirmations and review."}
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="offset-participant-confirmation-heading">
          <SectionHeader
            eyebrow="Participant confirmation and lock boundary"
            id="offset-participant-confirmation-heading"
            title="Cleared trades need fresh participant confirmation records."
          >
            The platform does not infer moral surplus. Participants must explicitly confirm that
            the frozen agreement is preferable or acceptable relative to their own no-trade
            baseline before any clearing, capture, release, or reliance.
          </SectionHeader>
          <div className="protocol-review-panel protocol-review-panel-needs_human_review">
            <div className="protocol-review-head">
              <div>
                <p className="eyebrow">Preview-only confirmation bundle</p>
                <h3>Checkboxes and batch results do not authorize capture.</h3>
                <p>
                  Clearing allowed: {String(participantConfirmationPreview.clearingAllowed)}.
                  Reliance-bearing: {String(participantConfirmationPreview.relianceBearing)}.
                  Platform infers moral surplus:{" "}
                  {String(participantConfirmationPreview.platformInfersMoralSurplus)}. Checkbox
                  authorizes capture:{" "}
                  {String(participantConfirmationPreview.checkboxAuthorizesCapture)}.
                </p>
              </div>
              <span className="protocol-review-status">
                {participantConfirmationPreview.releaseStage.replaceAll("_", " ")}
              </span>
            </div>

            <div className="protocol-review-grid">
              <div>
                <strong>Frozen snapshot bundle</strong>
                <ul className="clean-list">
                  <li>Baseline: {participantConfirmationPreview.baselineSnapshotId}</li>
                  <li>Terms: {participantConfirmationPreview.termsSnapshotId}</li>
                  <li>Policy: {participantConfirmationPreview.policySnapshotId}</li>
                  <li>Exposure: {formatUsdFromUsd(participantConfirmationPreview.maximumExposureUsd)}</li>
                </ul>
              </div>
              <div>
                <strong>Confirmation records</strong>
                <ul className="clean-list">
                  <li>
                    Proposal:{" "}
                    {participantConfirmationPreview.matchedTradeLockProposalStatus.replaceAll(
                      "_",
                      " ",
                    )}
                  </li>
                  <li>
                    Record:{" "}
                    {participantConfirmationPreview.confirmationRecordStatus.replaceAll("_", " ")}
                  </li>
                  <li>
                    Fresh confirmations: {participantConfirmationPreview.freshConfirmationCount} /{" "}
                    {participantConfirmationPreview.affectedParticipantCount}
                  </li>
                </ul>
              </div>
              <div>
                <strong>Consent quality</strong>
                <p>
                  Consent quality:{" "}
                  {participantConfirmationPreview.consentQualityStatus.replaceAll("_", " ")}.
                  Notice record:{" "}
                  {participantConfirmationPreview.noticeRecordStatus.replaceAll("_", " ")}.
                  Scope: {participantConfirmationPreview.confirmationScope.replaceAll("_", " ")}.
                </p>
              </div>
            </div>

            <ol className="protocol-provenance-list">
              {participantConfirmationPreview.gates.map((gate) => (
                <li
                  className={`protocol-provenance-item protocol-provenance-item-${donorGateStatusClass(
                    gate.status,
                  )}`}
                  key={gate.key}
                >
                  <span className="protocol-step-status">
                    {formatDonorGateStatus(gate.status)}
                  </span>
                  <div>
                    <strong>{gate.label}</strong>
                    <p>{gate.detail}</p>
                    <small>{gate.nextAction}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="offset-payment-destination-heading">
          <SectionHeader
            eyebrow="Recipient and destination verification"
            id="offset-payment-destination-heading"
            title="Payment locators are evidence until reviewed."
          >
            Recipient names, donation URLs, bank details, wallet addresses, and fiscal-host notes
            do not become reusable payment destinations until they resolve to reviewed recipient
            registry and payment-destination records.
          </SectionHeader>
          <div className="protocol-review-panel protocol-review-panel-needs_human_review">
            <div className="protocol-review-head">
              <div>
                <p className="eyebrow">Destination verification status</p>
                <h3>No capture or release before verified routing.</h3>
                <p>
                  Capture allowed: {String(paymentDestinationPreview.captureAllowed)}. Release
                  allowed: {String(paymentDestinationPreview.releaseAllowed)}. Raw locator is
                  payment destination:{" "}
                  {String(paymentDestinationPreview.evidenceLocatorIsPaymentDestination)}.
                </p>
              </div>
              <span className="protocol-review-status">
                {paymentDestinationPreview.releaseStage.replaceAll("_", " ")}
              </span>
            </div>

            <div className="protocol-review-grid">
              <div>
                <strong>Recipient registry</strong>
                <ul className="clean-list">
                  <li>Recipient: {paymentDestinationPreview.recipientLabel}</li>
                  <li>
                    Identity:{" "}
                    {paymentDestinationPreview.recipientIdentityStatus.replaceAll("_", " ")}
                  </li>
                  <li>
                    Registry entry required:{" "}
                    {String(paymentDestinationPreview.requiresRecipientRegistryEntry)}
                  </li>
                </ul>
              </div>
              <div>
                <strong>Payment destination</strong>
                <ul className="clean-list">
                  <li>
                    Kind: {paymentDestinationPreview.paymentDestinationKind.replaceAll("_", " ")}
                  </li>
                  <li>
                    Review:{" "}
                    {paymentDestinationPreview.paymentDestinationReviewStatus.replaceAll("_", " ")}
                  </li>
                  <li>
                    Verified before capture:{" "}
                    {String(
                      paymentDestinationPreview.requiresVerifiedPaymentDestinationBeforeCapture,
                    )}
                  </li>
                </ul>
              </div>
              <div>
                <strong>Reuse boundary</strong>
                <p>
                  Free-text destination reusable:{" "}
                  {String(paymentDestinationPreview.freeTextDestinationReusable)}. Reviewers must
                  keep copied links and payment identifiers out of reusable routing until verified.
                </p>
              </div>
            </div>

            <ol className="protocol-provenance-list">
              {paymentDestinationPreview.gates.map((gate) => (
                <li
                  className={`protocol-provenance-item protocol-provenance-item-${donorGateStatusClass(
                    gate.status,
                  )}`}
                  key={gate.key}
                >
                  <span className="protocol-step-status">
                    {formatDonorGateStatus(gate.status)}
                  </span>
                  <div>
                    <strong>{gate.label}</strong>
                    <p>{gate.detail}</p>
                    <small>{gate.nextAction}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="offset-externality-evidence-heading">
          <SectionHeader
            eyebrow="Externality and evidence burden"
            id="offset-externality-evidence-heading"
            title="Direct consent is not enough to clear third-party harms."
          >
            Donation-offset previews must show nonparticipant-externality status, evidence burden,
            least-intrusive alternatives, impact-claim separation, and fallback behavior before any
            final lock or reliance.
          </SectionHeader>
          <div className="protocol-review-panel protocol-review-panel-needs_human_review">
            <div className="protocol-review-head">
              <div>
                <p className="eyebrow">Preview-only review bundle</p>
                <h3>No clearing, capture, or reliance before externality review.</h3>
                <p>
                  Clearing allowed: {String(externalityEvidencePreview.clearingAllowed)}.
                  Participant consent waives nonparticipant harms:{" "}
                  {String(externalityEvidencePreview.participantConsentWaivesNonparticipantHarms)}.
                  Receipt creates impact claim:{" "}
                  {String(externalityEvidencePreview.receiptCreatesImpactClaim)}.
                </p>
              </div>
              <span className="protocol-review-status">
                {externalityEvidencePreview.releaseStage.replaceAll("_", " ")}
              </span>
            </div>

            <div className="protocol-review-grid">
              <div>
                <strong>Externality status</strong>
                <ul className="clean-list">
                  <li>Recipient: {externalityEvidencePreview.recipientLabel}</li>
                  <li>
                    Review:{" "}
                    {externalityEvidencePreview.nonparticipantExternalityStatus.replaceAll("_", " ")}
                  </li>
                  <li>
                    Required before clearing:{" "}
                    {String(
                      externalityEvidencePreview.requiresNonparticipantExternalityReviewBeforeClearing,
                    )}
                  </li>
                </ul>
              </div>
              <div>
                <strong>Evidence burden</strong>
                <ul className="clean-list">
                  <li>{externalityEvidencePreview.evidenceBurden.replaceAll("_", " ")}</li>
                  <li>
                    Least-intrusive rule:{" "}
                    {String(externalityEvidencePreview.requiresLeastIntrusiveEvidenceBeforeLock)}
                  </li>
                </ul>
              </div>
              <div>
                <strong>Fallback</strong>
                <p>
                  Policy: {externalityEvidencePreview.fallbackPolicy.replaceAll("_", " ")}.
                  Fallback must be frozen before lock and cannot silently reroute funds or
                  obligations.
                </p>
              </div>
            </div>

            <ol className="protocol-provenance-list">
              {externalityEvidencePreview.gates.map((gate) => (
                <li
                  className={`protocol-provenance-item protocol-provenance-item-${donorGateStatusClass(
                    gate.status,
                  )}`}
                  key={gate.key}
                >
                  <span className="protocol-step-status">
                    {formatDonorGateStatus(gate.status)}
                  </span>
                  <div>
                    <strong>{gate.label}</strong>
                    <p>{gate.detail}</p>
                    <small>{gate.nextAction}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="offset-safety-authenticity-heading">
          <SectionHeader
            eyebrow="Safety and evidence authenticity"
            id="offset-safety-authenticity-heading"
            title="Evidence uploads do not create obligations."
          >
            Donation-offset evidence must remain claim-typed, source-authenticated, privacy-safe,
            non-transferable, and screened for financial crime, hazardous activity, cyber abuse,
            and process-integrity risks before any lock, release, or public completion claim.
          </SectionHeader>
          <div className="protocol-review-panel protocol-review-panel-needs_human_review">
            <div className="protocol-review-head">
              <div>
                <p className="eyebrow">Preview-only safety bundle</p>
                <h3>Hash storage is not authenticity review.</h3>
                <p>
                  Clearing allowed: {String(safetyAuthenticityPreview.clearingAllowed)}.
                  Evidence upload creates reliance:{" "}
                  {String(safetyAuthenticityPreview.evidenceUploadCreatesReliance)}. Hash storage
                  proves authenticity:{" "}
                  {String(safetyAuthenticityPreview.hashStorageProvesAuthenticity)}.
                </p>
              </div>
              <span className="protocol-review-status">
                {safetyAuthenticityPreview.releaseStage.replaceAll("_", " ")}
              </span>
            </div>

            <div className="protocol-review-grid">
              <div>
                <strong>Evidence and privacy</strong>
                <ul className="clean-list">
                  <li>
                    Privacy grant: {safetyAuthenticityPreview.privacyGrantStatus.replaceAll("_", " ")}
                  </li>
                  <li>
                    Confidentiality/privacy:{" "}
                    {safetyAuthenticityPreview.confidentialityPrivacy.replaceAll("_", " ")}
                  </li>
                  <li>
                    Evidence authenticity:{" "}
                    {safetyAuthenticityPreview.evidenceAuthenticity.replaceAll("_", " ")}
                  </li>
                </ul>
              </div>
              <div>
                <strong>Payment and transfer</strong>
                <ul className="clean-list">
                  <li>
                    Financial crime:{" "}
                    {safetyAuthenticityPreview.financialCrime.replaceAll("_", " ")}
                  </li>
                  <li>
                    Non-transferable by default:{" "}
                    {String(safetyAuthenticityPreview.nonTransferableByDefault)}
                  </li>
                  <li>
                    Transferability:{" "}
                    {safetyAuthenticityPreview.nonTransferability.replaceAll("_", " ")}
                  </li>
                </ul>
              </div>
              <div>
                <strong>Prohibited channels</strong>
                <p>
                  Regulated goods:{" "}
                  {safetyAuthenticityPreview.regulatedGoodsHazardousActivity.replaceAll("_", " ")}.
                  Cyber abuse:{" "}
                  {safetyAuthenticityPreview.cyberAbuseDigitalIntegrity.replaceAll("_", " ")}.
                  Anti-corruption:{" "}
                  {safetyAuthenticityPreview.antiCorruptionProcessIntegrity.replaceAll("_", " ")}.
                </p>
              </div>
            </div>

            <ol className="protocol-provenance-list">
              {safetyAuthenticityPreview.gates.map((gate) => (
                <li
                  className={`protocol-provenance-item protocol-provenance-item-${donorGateStatusClass(
                    gate.status,
                  )}`}
                  key={gate.key}
                >
                  <span className="protocol-step-status">
                    {formatDonorGateStatus(gate.status)}
                  </span>
                  <div>
                    <strong>{gate.label}</strong>
                    <p>{gate.detail}</p>
                    <small>{gate.nextAction}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="offset-authority-fairness-heading">
          <SectionHeader
            eyebrow="Authority and fairness"
            id="offset-authority-fairness-heading"
            title="Participants may bind only themselves by default."
          >
            Donation offsets must keep baseline integrity, third-party obligations,
            representative authority, reporting integrity, civil rights, and autonomy/coercion
            review non-blocking before any lock, release, reliance, or completed-trade claim.
          </SectionHeader>
          <div className="protocol-review-panel protocol-review-panel-needs_human_review">
            <div className="protocol-review-head">
              <div>
                <p className="eyebrow">Preview-only authority bundle</p>
                <h3>Coerced consent is not participant surplus.</h3>
                <p>
                  Clearing allowed: {String(authorityFairnessPreview.clearingAllowed)}.
                  Participant may bind only self by default:{" "}
                  {String(authorityFairnessPreview.participantMayBindOnlySelfByDefault)}.
                  Reporting suppression blocked:{" "}
                  {String(authorityFairnessPreview.reportingSuppressionBlocked)}.
                </p>
              </div>
              <span className="protocol-review-status">
                {authorityFairnessPreview.releaseStage.replaceAll("_", " ")}
              </span>
            </div>

            <div className="protocol-review-grid">
              <div>
                <strong>Baseline and authority</strong>
                <ul className="clean-list">
                  <li>
                    Baseline integrity:{" "}
                    {authorityFairnessPreview.baselineIntegrityStatus.replaceAll("_", " ")}
                  </li>
                  <li>
                    Representative authority:{" "}
                    {authorityFairnessPreview.representativeAuthorityStatus.replaceAll("_", " ")}
                  </li>
                  <li>
                    Third-party obligation:{" "}
                    {authorityFairnessPreview.thirdPartyObligationStatus.replaceAll("_", " ")}
                  </li>
                </ul>
              </div>
              <div>
                <strong>Rights and autonomy</strong>
                <ul className="clean-list">
                  <li>
                    Reporting integrity:{" "}
                    {authorityFairnessPreview.reportingIntegrity.replaceAll("_", " ")}
                  </li>
                  <li>
                    Civil rights: {authorityFairnessPreview.civilRights.replaceAll("_", " ")}
                  </li>
                  <li>
                    Participant autonomy:{" "}
                    {authorityFairnessPreview.participantAutonomy.replaceAll("_", " ")}
                  </li>
                </ul>
              </div>
              <div>
                <strong>Legal posture</strong>
                <p>
                  Jurisdiction review:{" "}
                  {authorityFairnessPreview.jurisdictionReviewStatus.replaceAll("_", " ")}.
                  Baseline manufacturing blocked:{" "}
                  {String(authorityFairnessPreview.baselineManufacturingBlocked)}. Civil-rights
                  review required: {String(authorityFairnessPreview.civilRightsReviewRequired)}.
                </p>
              </div>
            </div>

            <ol className="protocol-provenance-list">
              {authorityFairnessPreview.gates.map((gate) => (
                <li
                  className={`protocol-provenance-item protocol-provenance-item-${donorGateStatusClass(
                    gate.status,
                  )}`}
                  key={gate.key}
                >
                  <span className="protocol-step-status">
                    {formatDonorGateStatus(gate.status)}
                  </span>
                  <div>
                    <strong>{gate.label}</strong>
                    <p>{gate.detail}</p>
                    <small>{gate.nextAction}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="offset-donor-record-heading">
          <SectionHeader
            eyebrow="Donor-of-record and receipt preview"
            id="offset-donor-record-heading"
            title="Receipts are legal facts, not impact claims."
          >
            Donation offsets must freeze donor-of-record, receipt, charitable-solicitation, and
            destination treatment before lock. Moral Trade does not provide tax advice or claim
            tax deductibility from a preview.
          </SectionHeader>
          <div className="protocol-review-panel protocol-review-panel-needs_human_review">
            <div className="protocol-review-head">
              <div>
                <p className="eyebrow">No capture preview</p>
                <h3>Tax and receipt handling is explicit before final confirmation.</h3>
                <p>
                  Tax advice provided: {String(donorOfRecordPreview.taxAdviceProvided)}. Tax
                  deductibility claim allowed:{" "}
                  {String(donorOfRecordPreview.taxDeductibilityClaimAllowed)}. Receipt creates
                  impact claim: {String(donorOfRecordPreview.receiptCreatesImpactClaim)}.
                </p>
              </div>
              <span className="protocol-review-status">
                {donorOfRecordPreview.releaseStage.replaceAll("_", " ")}
              </span>
            </div>

            <div className="protocol-review-grid">
              <div>
                <strong>Frozen terms</strong>
                <ul className="clean-list">
                  <li>Destination: {donorOfRecordPreview.destinationLabel}</li>
                  <li>Donation platform: {donorOfRecordPreview.donationPlatform}</li>
                  <li>
                    Donor of record:{" "}
                    {donorOfRecordPreview.donorOfRecordRole.replaceAll("_", " ")}
                  </li>
                  <li>
                    Tax receipt:{" "}
                    {donorOfRecordPreview.taxReceiptTreatment.replaceAll("_", " ")}
                  </li>
                </ul>
              </div>
              <div>
                <strong>Before lock</strong>
                <ul className="clean-list">
                  <li>Destination verification before capture/release.</li>
                  <li>No receipt benefit is double-claimed or silently reassigned.</li>
                  <li>Any DAF, employer match, or co-venture issue needs jurisdiction review.</li>
                </ul>
              </div>
              <div>
                <strong>Public metric boundary</strong>
                <p>
                  Payment evidence can support gross transfer records. It cannot, by itself, prove
                  causal impact, tax treatment, or moral value.
                </p>
              </div>
            </div>

            <ol className="protocol-provenance-list">
              {donorOfRecordPreview.gates.map((gate) => (
                <li
                  className={`protocol-provenance-item protocol-provenance-item-${donorGateStatusClass(
                    gate.status,
                  )}`}
                  key={gate.key}
                >
                  <span className="protocol-step-status">
                    {formatDonorGateStatus(gate.status)}
                  </span>
                  <div>
                    <strong>{gate.label}</strong>
                    <p>{gate.detail}</p>
                    <small>{gate.nextAction}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="legal-offset-heading">
          <SectionHeader eyebrow="Safeguards" id="legal-offset-heading" title="Political campaign contribution offsets are prohibited." />
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>No campaign offsets</h3>
              <p>Offsets are not for campaign finance workarounds or candidate contributions.</p>
            </article>
            <article className="panel concept-card">
              <h3>External evidence only</h3>
              <p>Receipts are evidence for review, not platform custody or legal escrow.</p>
            </article>
            <article className="panel concept-card">
              <h3>Manual review for risk</h3>
              <p>Unverifiable baselines and coercive proposals remain paused or blocked.</p>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="offset-reading-heading">
          <SectionHeader eyebrow="Further reading" id="offset-reading-heading" title="Research sources for the offset structure." />
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Toby Ord, &quot;Moral Trade&quot;</h3>
              <p>Ord&apos;s examples motivate opposed-donation redirection and reciprocal moral trade.</p>
              <a className="inline-link" href={moralTradePaperUrl}>
                Open the paper
              </a>
            </article>
            <article className="panel concept-card">
              <h3>Forethought on convergence</h3>
              <p>Compromise can work when different views value overlapping outcomes.</p>
              <a className="inline-link" href={forethoughtCompromiseUrl}>
                Open the article
              </a>
            </article>
            <article className="panel concept-card">
              <h3>Forethought on public goods</h3>
              <p>Shared goods can make compromise more robust than thin bilateral settlements.</p>
              <a className="inline-link" href={forethoughtPublicGoodsUrl}>
                Open the article
              </a>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
