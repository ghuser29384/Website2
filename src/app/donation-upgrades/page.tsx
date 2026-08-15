import type { Metadata } from "next";
import Link from "next/link";

import { DirectUpgradeLocalDateTime } from "@/components/donation-upgrades/direct-upgrade-deadline-field";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  Breadcrumbs,
  PageHero,
  SectionHeader,
  StepCard,
} from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  formatDirectDonationUpgradeUsd,
  getDirectDonationUpgradeConfig,
} from "@/lib/direct-donation-upgrade";
import {
  describeDirectDonationUpgradeRetainedLeg,
  formatDirectDonationUpgradeRedirectPercentage,
} from "@/lib/direct-donation-upgrade-split";
import { loadPublicDirectDonationUpgrades } from "@/lib/direct-donation-upgrade-data";
import { getDirectSpendingUpgradeConfig } from "@/lib/direct-spending-upgrade";
import { loadDirectSpendingUpgradePageData } from "@/lib/direct-spending-upgrade-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Donation Upgrades",
  description:
    "Match, negotiate, and partially redirect planned donations through direct, webhook-verified charity checkouts.",
  alternates: { canonical: "/donation-upgrades" },
  openGraph: {
    title: "Donation Upgrades",
    description:
      "Match, negotiate, and partially redirect planned donations through direct, webhook-verified charity checkouts.",
    url: getAbsoluteUrl("/donation-upgrades"),
    type: "website",
  },
};

function statusLabel(value: unknown) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

export default async function DonationUpgradesPage() {
  const viewer = await getViewer();
  const config = getDirectDonationUpgradeConfig();
  const spendingConfig = getDirectSpendingUpgradeConfig();
  const [offers, spendingData] = await Promise.all([
    config.environment
      ? loadPublicDirectDonationUpgrades({
          environment: config.environment,
          limit: 100,
        })
      : Promise.resolve([]),
    spendingConfig.requestedEnabled && config.environment
      ? loadDirectSpendingUpgradePageData({
          viewerId: viewer?.authUser.id ?? null,
          environment: config.environment,
        })
      : Promise.resolve({
          publicOffers: [],
          creatorOffers: [],
          viewerCandidates: [],
          viewerObligations: [],
          viewerProposals: [],
        }),
  ]);
  const spendingOffers = spendingData.publicOffers;

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <Breadcrumbs
          items={[
            { href: "/donation-upgrades", label: "Donation Upgrades" },
          ]}
        />
        <PageHero
          eyebrow="Donation Upgrades"
          title={
            spendingConfig.requestedEnabled
              ? "Upgrade a planned donation or verified optional spending."
              : "Move part or all of a planned donation, then add to it."
          }
          description={
            spendingConfig.requestedEnabled
              ? "Choose the factual baseline subtype first. Planned donations preserve their original recipient and split. Spending Upgrades use a private prospective optional-expense baseline and, only after review and matching, create two separate direct donations to one nonprofit. Moral Trade holds no funds."
              : "Creators choose the exact percentage that moves from the original recipient. A counterparty can accept that split or propose a different percentage and matcher amount. After agreement, each donation leg goes directly through Every.org; Moral Trade holds no funds and records completion only after exact provider confirmation."
          }
          actions={
            <>
              <Link
                className="button button-primary"
                href="/trades/new?structure=conditional-donation&rail=direct"
              >
                Create a Donation Upgrade
              </Link>
              <Link className="button button-secondary" href="/connectors">
                Inspect verification boundaries
              </Link>
            </>
          }
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        {!config.readyForCommitments ? (
          <div
            className="status-banner status-banner-error"
            role="status"
          >
            <strong>The direct Donation Upgrade rail is fail-closed.</strong>{" "}
            {config.blockers[0] ??
              "The Every.org integration is not configured."}
          </div>
        ) : null}
        {spendingConfig.requestedEnabled &&
        !spendingConfig.readyForCommitments ? (
          <div className="status-banner status-banner-error" role="status">
            <strong>The Spending Upgrade subtype is fail-closed.</strong>{" "}
            {spendingConfig.blockers[0] ??
              "Its private-baseline boundary is not configured."}
          </div>
        ) : null}

        <section
          className="section section-white"
          aria-labelledby="available-upgrades-heading"
        >
          <SectionHeader
            eyebrow="Available commitments"
            id="available-upgrades-heading"
            title="Every offer preserves the full no-match baseline."
          >
            “Open” offers can be accepted or negotiated. “Matched” offers can
            still accept backup matchers under the frozen agreed terms.
            Fulfillment, default, and verified net amounts remain visible as
            the offer progresses.
          </SectionHeader>
          <div className="data-grid">
            {offers.map((offer) => (
              <article className="panel data-card" key={offer.id}>
                <div className="profile-card-head">
                  <div>
                    <p className="detail-kicker">
                      {statusLabel(offer.status)} ·{" "}
                      {formatDirectDonationUpgradeRedirectPercentage(
                        offer.redirect_basis_points,
                      )}{" "}
                      redirect
                    </p>
                    <h3>
                      Redirect{" "}
                      {formatDirectDonationUpgradeUsd(
                        offer.redirected_amount_cents,
                      )}{" "}
                      and add{" "}
                      {formatDirectDonationUpgradeUsd(
                        offer.matcher_amount_cents,
                      )}{" "}
                      for {offer.upgraded_recipient.name}
                    </h3>
                  </div>
                  <span className="badge">
                    {offer.matcher_count} matcher
                    {offer.matcher_count === 1 ? "" : "s"}
                  </span>
                </div>
                <p>
                  No match: {formatDirectDonationUpgradeUsd(
                    offer.creator_amount_cents,
                  )}{" "}
                  to {offer.original_recipient.name}.
                </p>
                <p>
                  Match: {describeDirectDonationUpgradeRetainedLeg(
                    offer.retained_amount_cents,
                    offer.original_recipient.name,
                  )};{" "}
                  {formatDirectDonationUpgradeUsd(
                    offer.redirected_amount_cents,
                  )}{" "}
                  moves to {offer.upgraded_recipient.name}; matcher adds{" "}
                  {formatDirectDonationUpgradeUsd(
                    offer.matcher_amount_cents,
                  )}{" "}
                  there.
                </p>
                <dl className="detail-grid">
                  <div>
                    <dt>Creator</dt>
                    <dd>
                      {offer.creator_display_name ?? "Hidden until completion"}
                    </dd>
                  </div>
                  <div>
                    <dt>Current matcher</dt>
                    <dd>{offer.matcher_display_name ?? "None or hidden"}</dd>
                  </div>
                  <div>
                    <dt>Counteroffers</dt>
                    <dd>Private</dd>
                  </div>
                  <div>
                    <dt>Match deadline</dt>
                    <dd>
                      <DirectUpgradeLocalDateTime
                        value={offer.match_deadline_at}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Verified net</dt>
                    <dd>
                      {formatDirectDonationUpgradeUsd(
                        offer.verified_net_amount_cents,
                      )}
                    </dd>
                  </div>
                </dl>
                <Link
                  className="button button-primary"
                  href={`/donation-upgrades/${offer.id}`}
                >
                  View or negotiate exact terms
                </Link>
              </article>
            ))}
            {!offers.length ? (
              <article className="panel data-card">
                <h3>
                  {spendingConfig.requestedEnabled
                    ? "No planned-donation upgrades are currently listed"
                    : "No Donation Upgrades are currently listed"}
                </h3>
                <p>
                  Create the first commitment after the direct Every.org rail
                  is configured.
                </p>
              </article>
            ) : null}
          </div>
        </section>

        {spendingConfig.requestedEnabled ? (
          <section
            className="section section-subtle"
            aria-labelledby="available-spending-upgrades-heading"
          >
            <SectionHeader
              eyebrow="Spending Upgrade subtype"
              id="available-spending-upgrades-heading"
              title="Optional spending can open only after private baseline review."
            >
              These cards never publish a merchant, order number, bill, or
              cancellation record. No-match terms create no donation or
              purchase obligation. A matched offer creates exactly two direct
              donations to the same nonprofit.
            </SectionHeader>
            <div className="data-grid">
              {spendingOffers.map((offer) => (
                <article className="panel data-card" key={`spending:${offer.id}`}>
                  <div className="profile-card-head">
                    <div>
                      <p className="detail-kicker">
                        Spending subtype · {statusLabel(offer.status)}
                      </p>
                      <h3>
                        Convert {formatDirectDonationUpgradeUsd(
                          offer.creator_diversion_amount_cents,
                        )} and add {formatDirectDonationUpgradeUsd(
                          offer.matcher_amount_cents,
                        )} for {offer.upgraded_recipient.name}
                      </h3>
                    </div>
                    <span className="badge">
                      {offer.matcher_count} matcher
                      {offer.matcher_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p>
                    No match: no donation, checkout, spending, or purchase
                    obligation. Match: creator and matcher donate separately to
                    the same recipient.
                  </p>
                  <dl className="detail-grid">
                    <div>
                      <dt>Allowed category</dt>
                      <dd>{statusLabel(offer.category)}</dd>
                    </div>
                    <div>
                      <dt>Prospective spend</dt>
                      <dd>{formatDirectDonationUpgradeUsd(offer.planned_spend_amount_cents)}</dd>
                    </div>
                    <div>
                      <dt>Baseline review</dt>
                      <dd>{statusLabel(offer.baseline_review_status)}</dd>
                    </div>
                    <div>
                      <dt>Spending-change review</dt>
                      <dd>{statusLabel(offer.spending_change_review_status)}</dd>
                    </div>
                    <div>
                      <dt>Verified matcher increment</dt>
                      <dd>{formatDirectDonationUpgradeUsd(offer.incremental_gross_amount_cents)}</dd>
                    </div>
                    <div>
                      <dt>Verified converted spending</dt>
                      <dd>{formatDirectDonationUpgradeUsd(offer.converted_spending_gross_amount_cents)}</dd>
                    </div>
                  </dl>
                  <Link
                    className="button button-primary"
                    href={`/donation-upgrades/spending/${offer.id}`}
                  >
                    View exact Spending Upgrade terms
                  </Link>
                </article>
              ))}
              {!spendingOffers.length ? (
                <article className="panel data-card">
                  <h3>No reviewed Spending Upgrades are currently listed</h3>
                  <p>
                    New private baselines remain review required and invisible
                    here until accepted by compatible scoped authority.
                  </p>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        <section
          className={
            spendingConfig.requestedEnabled
              ? "section section-white"
              : "section section-subtle"
          }
          aria-labelledby="upgrade-flow-heading"
        >
          <SectionHeader
            eyebrow="Mechanism"
            id="upgrade-flow-heading"
            title="Commit, bargain, fix the branch, then verify every donation leg."
          />
          <div className="step-card-grid">
            <StepCard index={1} title="Freeze the original donation plan.">
              The creator records the full baseline amount, both recipients,
              offered redirect percentage, matcher amount, and evidence for the
              pre-existing intention.
            </StepCard>
            <StepCard index={2} title="Accept or counteroffer.">
              A counterparty may accept the current split or propose a different
              percentage and matcher amount. Creator acceptance creates a new
              immutable matched revision.
            </StepCard>
            <StepCard index={3} title="Fulfill separate direct donations.">
              The creator completes the retained and redirected legs; the
              matcher completes the incremental leg. A 100% redirect simply has
              no retained leg.
            </StepCard>
            <StepCard index={4} title="Count only exact provider verification.">
              Browser returns and screenshots do not create impact credit. The
              provider recipient, amount, date, and metadata must match each
              frozen obligation.
            </StepCard>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
