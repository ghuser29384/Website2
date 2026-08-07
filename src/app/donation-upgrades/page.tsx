import type { Metadata } from "next";
import Link from "next/link";

import { DirectUpgradeLocalDateTime } from "@/components/donation-upgrades/direct-upgrade-deadline-field";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, PageHero, SectionHeader, StepCard } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  formatDirectDonationUpgradeUsd,
  getDirectDonationUpgradeConfig,
} from "@/lib/direct-donation-upgrade";
import { loadPublicDirectDonationUpgrades } from "@/lib/direct-donation-upgrade-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Donation Upgrades",
  description:
    "Match and redirect planned donations through direct, webhook-verified charity checkouts.",
  alternates: { canonical: "/donation-upgrades" },
  openGraph: {
    title: "Donation Upgrades",
    description:
      "Match and redirect planned donations through direct, webhook-verified charity checkouts.",
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
    ? await loadPublicDirectDonationUpgrades({ environment: config.environment, limit: 100 })
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
        <Breadcrumbs items={[{ href: "/donation-upgrades", label: "Donation Upgrades" }]} />
        <PageHero
          eyebrow="Donation Upgrades"
          title="Add to a planned donation and redirect both gifts to a stronger opportunity."
          description="Creators publish an existing donation plan. When someone adds the stated amount, both participants donate directly to the upgraded recipient. Moral Trade holds no funds and records completion only after exact Every.org confirmation."
          actions={
            <>
              <Link
                className="button button-primary"
                href="/trades/new?structure=conditional-donation"
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
          <div className="status-banner status-banner-error" role="status">
            <strong>The direct Donation Upgrade rail is fail-closed.</strong>{" "}
            {config.blockers[0] ?? "The Every.org integration is not configured."}
          </div>
        ) : null}

        <section className="section section-white" aria-labelledby="available-upgrades-heading">
          <SectionHeader
            eyebrow="Available commitments"
            id="available-upgrades-heading"
            title="Every offer preserves the no-match baseline."
          >
            “Open” offers need a primary matcher. “Matched” offers can still accept backup
            matchers. Fulfillment, default, and verified net amounts remain visible as the offer
            progresses.
          </SectionHeader>
          <div className="data-grid">
            {offers.map((offer) => (
              <article className="panel data-card" key={offer.id}>
                <div className="profile-card-head">
                  <div>
                    <p className="detail-kicker">{statusLabel(offer.status)}</p>
                    <h3>
                      {formatDirectDonationUpgradeUsd(
                        offer.creator_amount_cents + offer.matcher_amount_cents,
                      )}{" "}
                      for {offer.upgraded_recipient.name}
                    </h3>
                  </div>
                  <span className="badge">{offer.matcher_count} matcher{offer.matcher_count === 1 ? "" : "s"}</span>
                </div>
                <p>
                  No match: {formatDirectDonationUpgradeUsd(offer.creator_amount_cents)} to{" "}
                  {offer.original_recipient.name}.
                </p>
                <p>
                  Match: {formatDirectDonationUpgradeUsd(offer.creator_amount_cents)} +{" "}
                  {formatDirectDonationUpgradeUsd(offer.matcher_amount_cents)} as separate direct
                  donations to {offer.upgraded_recipient.name}.
                </p>
                <dl className="detail-grid">
                  <div>
                    <dt>Creator</dt>
                    <dd>{offer.creator_display_name ?? "Hidden until completion"}</dd>
                  </div>
                  <div>
                    <dt>Current matcher</dt>
                    <dd>{offer.matcher_display_name ?? "None or hidden"}</dd>
                  </div>
                  <div>
                    <dt>Match deadline</dt>
                    <dd><DirectUpgradeLocalDateTime value={offer.match_deadline_at} /></dd>
                  </div>
                  <div>
                    <dt>Verified net</dt>
                    <dd>{formatDirectDonationUpgradeUsd(offer.verified_net_amount_cents)}</dd>
                  </div>
                </dl>
                <Link className="button button-primary" href={`/donation-upgrades/${offer.id}`}>
                  View exact terms
                </Link>
              </article>
            ))}
            {!offers.length ? (
              <article className="panel data-card">
                <h3>No Donation Upgrades are currently listed</h3>
                <p>
                  Create the first commitment after the direct Every.org rail is configured.
                </p>
              </article>
            ) : null}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="upgrade-flow-heading">
          <SectionHeader
            eyebrow="Mechanism"
            id="upgrade-flow-heading"
            title="Commit, match, then verify the correct branch."
          />
          <div className="step-card-grid">
            <StepCard index={1} title="Freeze the original donation plan.">
              The creator records the original recipient, amount, matching threshold, and evidence
              for the pre-existing intention.
            </StepCard>
            <StepCard index={2} title="Select a primary and retain backups.">
              The first eligible matcher is selected; additional matchers can be promoted after a
              default.
            </StepCard>
            <StepCard index={3} title="Count only exact provider verification.">
              Browser returns and screenshots do not create impact credit. The exact provider
              recipient, amount, date, and metadata must match.
            </StepCard>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
