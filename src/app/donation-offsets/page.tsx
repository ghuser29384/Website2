import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, MetricCard, PageHero, SectionHeader, StepCard } from "@/components/ui/page-primitives";
import { getDonationOffsetOverview, getViewer, type DonationOffsetOverview } from "@/lib/app-data";
import {
  buildDemoDonationOffsetBatchClearingDryRun,
  buildDonationOffsetBatchClearingDryRun,
  getConsensusCharities,
  type DonationOffsetBatchClearingDryRun,
  type DonationOffsetVerificationMethod,
} from "@/lib/donation-offsets";
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

const checklistItems = [
  "Baseline intention",
  "Match ratio",
  "Destination",
  "Surplus rule",
  "Evidence method",
  "Expiry",
  "Anti-threat certification",
] as const;

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

export default async function DonationOffsetsPage() {
  const viewer = await getViewer();
  const overview = hasSupabaseEnv() ? await getDonationOffsetOverview() : null;
  const consensusCharities = getConsensusCharities();
  const clearingDryRun = buildDonationOffsetDryRun(overview);
  const createOffsetHref = viewer
    ? "/offers/new?mode=offset"
    : "/signup?returnTo=/offers/new%3Fmode%3Doffset";

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
              <Link className="button button-primary" href="/offers?mode=offset">
                Browse offset offers
              </Link>
              <Link className="button button-secondary" href={createOffsetHref}>
                Create offset
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
          <SectionHeader eyebrow="Valid offset checklist" id="valid-offset-heading" title="A public offset should expose every core term." />
          <div className="checklist-card-grid">
            {checklistItems.map((item) => (
              <article className="panel checklist-card" key={item}>
                <span aria-hidden="true">OK</span>
                <h3>{item}</h3>
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
