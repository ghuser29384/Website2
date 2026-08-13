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
  const offers = config.environment
    ? await loadPublicDirectDonationUpgrades({
        environment: config.environment,
        limit: 100,
      })
    : [];

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
          title="Move part or all of a planned donation, then add to it."
          description="Creators choose the exact percentage that moves from the original recipient. A counterparty can accept that split or propose a different percentage and matcher amount. After agreement, each donation leg goes directly through Every.org; Moral Trade holds no funds and records completion only after exact provider confirmation."
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
                <h3>No Donation Upgrades are currently listed</h3>
                <p>
                  Create the first commitment after the direct Every.org rail
                  is configured.
                </p>
              </article>
            ) : null}
          </div>
        </section>

        <section
          className="section section-subtle"
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
