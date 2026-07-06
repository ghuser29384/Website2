import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING,
  buildAtLeastTierDevSeedData,
  evaluateAtLeastTierPlatformMatchCapability,
} from "@/lib/mpgf/public-goods-at-least-tier-platform-match";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: "/account/labs/at-least-tier-platform-match",
  },
  description: "Route-safe account view for the disabled at-least-tier platform-match labs branch.",
  openGraph: {
    description: "No account commitments, payment setup, authorization, capture, or platform-match routing occur on this route.",
    title: "At-Least-Tier Platform Match Account Labs",
    type: "website",
    url: getAbsoluteUrl("/account/labs/at-least-tier-platform-match"),
  },
  robots: {
    follow: false,
    index: false,
  },
  title: "At-Least-Tier Platform Match Account Labs",
};

const now = "2026-07-06T00:00:00.000Z";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

export default function AtLeastTierPlatformMatchAccountLabsPage() {
  const seed = buildAtLeastTierDevSeedData({ environment: "development", now });
  const accountCapability = evaluateAtLeastTierPlatformMatchCapability({
    action: "view_labs_landing",
    actorRole: "labs_participant",
    environment: "development",
    featureEnabled: true,
  });
  const productionMoney = evaluateAtLeastTierPlatformMatchCapability({
    action: "capture_loss_payment",
    actorRole: "service",
    environment: "production",
    featureEnabled: true,
  });

  return (
    <div className="page-shell page-shell-focused">
      <header className="v72-route-header">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <Breadcrumbs
          items={[
            { href: "/mpgf", label: "Public Goods Fund" },
            { href: "/labs/at-least-tier-platform-match", label: "At-least-tier labs" },
            { href: "/account/labs/at-least-tier-platform-match", label: "Account labs" },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="account-labs-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Account labs route</p>
            <h1 id="account-labs-heading">At-least-tier account commitment status.</h1>
            <p>{AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING}</p>
            <p>
              This account route is present for v137 route coverage only. It does not create,
              display, or persist personal account commitments, save payment methods, authorize
              loss payments, capture user funds, execute platform-match contributions, or publish
              live settlement status.
            </p>
          </div>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Account route</dt>
              <dd>{accountCapability.allowed ? "route-safe read-only labs view" : accountCapability.reasons.join(", ")}</dd>
            </div>
            <div>
              <dt>Production money</dt>
              <dd>{productionMoney.reasons.join(", ")}</dd>
            </div>
            <div>
              <dt>Saved commitments</dt>
              <dd>none in this disabled account surface</dd>
            </div>
            <div>
              <dt>Provider calls</dt>
              <dd>disabled</dd>
            </div>
          </dl>
        </section>

        <section className="section section-subtle" aria-labelledby="account-simulation-heading">
          <SectionHeader eyebrow="Simulation reference" id="account-simulation-heading" title="Demo rows remain aggregate-only.">
            The route can summarize the mechanism using dev seed data, but it does not expose donor
            identities, payment state, bonus eligibility, or live account records.
          </SectionHeader>
          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Reviewed pool</p>
              <h3>{seed.reviewedPool?.projectReviewState.replaceAll("_", " ")}</h3>
              <p>Recipient route: {seed.reviewedPool?.recipientRouteState.replaceAll("_", " ")}.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Frozen tiers</p>
              <h3>{seed.tiers.length}</h3>
              <p>{seed.tiers.map((tier) => `${tier.publicLabel}: ${formatUsd(tier.thresholdNetRecipientCents)}`).join("; ")}</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Resolution outcomes</p>
              <h3>{seed.resolution?.snapshot.eligibleCommitmentCount ?? 0} eligible</h3>
              <p>
                Winners and losers are simulated only; no winner receives a direct user payout.
              </p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Public MVP placement</p>
              <h3>absent</h3>
              <p>This route is not linked from the primary CGPP pledge flow.</p>
            </article>
          </div>
          <div className="section-actions">
            <Link className="button button-secondary" href="/labs/at-least-tier-platform-match/demo-round/commit">
              View disabled commitment review
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
