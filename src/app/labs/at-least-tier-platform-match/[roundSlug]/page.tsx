import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING,
  computeDampedOddsRewardSchedule,
  evaluateAtLeastTierPlatformMatchCapability,
} from "@/lib/mpgf/public-goods-at-least-tier-platform-match";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: "/labs/at-least-tier-platform-match/demo-round",
  },
  description: "Read-only non-MVP labs round brief for the at-least-tier platform-match branch.",
  openGraph: {
    description: "A route-safe labs round view for tiered platform contributions to reviewed projects.",
    title: "At-Least-Tier Platform Match Round",
    type: "website",
    url: getAbsoluteUrl("/labs/at-least-tier-platform-match/demo-round"),
  },
  title: "At-Least-Tier Platform Match Round",
};

type PageProps = {
  params: Promise<{ roundSlug: string }>;
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

function formatRoundLabel(roundSlug: string) {
  return roundSlug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AtLeastTierPlatformMatchRoundPage({ params }: PageProps) {
  const { roundSlug } = await params;
  const schedule = computeDampedOddsRewardSchedule({
    freeze: true,
    roundId: `labs-at-least-tier-${roundSlug}`,
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 300_000, frozenForecastProbabilityBps: 5_500 },
      { tierIndex: 3, thresholdNetRecipientCents: 500_000, frozenForecastProbabilityBps: 3_500 },
      { tierIndex: 4, thresholdNetRecipientCents: 1_000_000, frozenForecastProbabilityBps: 2_000 },
      { tierIndex: 5, thresholdNetRecipientCents: 2_500_000, frozenForecastProbabilityBps: 1_000 },
    ],
  });
  const productionMoney = evaluateAtLeastTierPlatformMatchCapability({
    action: "authorize_loss_payment",
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
            { href: `/labs/at-least-tier-platform-match/${roundSlug}`, label: "Labs round" },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="round-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Non-MVP labs round</p>
            <h1 id="round-heading">At-least-tier round: {formatRoundLabel(roundSlug) || "Demo Round"}.</h1>
            <p>{AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING}</p>
            <p>
              This route is a read-only labs surface. It does not create hard commitments, save
              payment methods, authorize loss payments, capture user funds, or execute platform
              contributions.
            </p>
          </div>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Round surface</dt>
              <dd>labs-only brief</dd>
            </div>
            <div>
              <dt>Production payment actions</dt>
              <dd>{productionMoney.reasons.join(", ")}</dd>
            </div>
            <div>
              <dt>Progress disclosure</dt>
              <dd>sealed qualitative status only before close</dd>
            </div>
            <div>
              <dt>Direct user payment</dt>
              <dd>none for winning outcomes</dd>
            </div>
          </dl>
        </section>

        <section className="section section-subtle" aria-labelledby="pool-heading">
          <SectionHeader eyebrow="Screen 1" id="pool-heading" title="Pool and tiers.">
            Review the public-good pool, selected at-least tiers, frozen reward rates, and reserve state before any commitment copy.
          </SectionHeader>
          <div className="data-grid">
            {schedule.tiers.map((tier) => (
              <article className="panel data-card" key={tier.id}>
                <p className="detail-kicker">{tier.publicLabel}</p>
                <h3>{formatUsd(tier.thresholdNetRecipientCents)}</h3>
                <p>
                  {(tier.rewardRateBps / 100).toFixed(2)}% platform match to reviewed projects if
                  other eligible users&apos; effective support reaches at least this tier.
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="resolution-heading">
          <SectionHeader eyebrow="Resolution" id="resolution-heading" title="Forecasts use other eligible effective support.">
            Own commitments, same-control accounts, duplicate payment clusters treated as
            same-control, platform-match payments, sponsor match, refund-bonus reserves, fees, soft
            intents, drafts, failed payments, Sybil-failed rows, blocked or review-failed rows,
            stale authorizations, and final project disbursement after settlement do not count
            toward forecast results.
          </SectionHeader>
          <div className="mpgf-panel">
            <p>
              If other eligible users&apos; effective support reaches at least the selected tier,
              Moral Trade contributes the displayed platform-match amount to the reviewed projects
              from a backed reserve, and the participant is charged $0.
            </p>
            <p>
              If other eligible users&apos; effective support does not reach the selected tier, the
              participant contributes the stated amount to the reviewed projects after exact
              authorization and settlement gates.
            </p>
            <p>
              Final project totals may be higher than the forecast-resolution total after losing
              user payments and winning platform matches are settled. That later total does not
              retroactively change forecast outcomes.
            </p>
            <div className="section-actions">
              <a className="button button-secondary" href={`/labs/at-least-tier-platform-match/${roundSlug}/commit`}>
                View disabled commitment review
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
