import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING,
  computeDampedOddsRewardSchedule,
  evaluateAtLeastTierPlatformMatchCapability,
  validateAtLeastTierOrdinaryCopy,
} from "@/lib/mpgf/public-goods-at-least-tier-platform-match";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: "/labs/at-least-tier-platform-match",
  },
  description: "Read-only non-MVP labs brief for the at-least-tier platform-match branch.",
  openGraph: {
    description: "A disabled-by-default labs mechanism for tiered platform contributions to reviewed projects.",
    title: "At-Least-Tier Platform Match Labs",
    type: "website",
    url: getAbsoluteUrl("/labs/at-least-tier-platform-match"),
  },
  title: "At-Least-Tier Platform Match Labs",
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

export default function AtLeastTierPlatformMatchLabsPage() {
  const schedule = computeDampedOddsRewardSchedule({
    freeze: true,
    roundId: "labs-at-least-tier-demo",
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 300_000, frozenForecastProbabilityBps: 5_500 },
      { tierIndex: 3, thresholdNetRecipientCents: 500_000, frozenForecastProbabilityBps: 3_500 },
      { tierIndex: 4, thresholdNetRecipientCents: 1_000_000, frozenForecastProbabilityBps: 2_000 },
      { tierIndex: 5, thresholdNetRecipientCents: 2_500_000, frozenForecastProbabilityBps: 1_000 },
    ],
  });
  const labsCapability = evaluateAtLeastTierPlatformMatchCapability({
    action: "view_labs_landing",
    actorRole: "labs_participant",
    environment: "development",
    featureEnabled: true,
  });
  const productionCapability = evaluateAtLeastTierPlatformMatchCapability({
    action: "execute_platform_match_contribution",
    actorRole: "service",
    environment: "production",
    featureEnabled: true,
  });
  const copyPreflight = validateAtLeastTierOrdinaryCopy(`
    Non-MVP labs mechanism.
    There is no direct user payout.
    If the user wins, the platform contributes the tier-specific match to reviewed projects.
    If the user loses, the user contributes the stated amount to reviewed projects.
    The user's own commitment does not count toward the forecast result.
    Same-control accounts do not count toward the forecast result.
    Platform-match payments do not count toward forecast results.
    Production real-money use is disabled unless this mechanism is explicitly promoted.
  `);

  return (
    <div className="page-shell page-shell-focused">
      <header className="v72-route-header">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <Breadcrumbs
          items={[
            { href: "/mpgf", label: "Public Goods Fund" },
            { href: "/labs/at-least-tier-platform-match", label: "At-least-tier labs" },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="at-least-tier-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Non-MVP labs</p>
            <h1 id="at-least-tier-heading">At-Least-Tier Platform Match.</h1>
            <p>{AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING}</p>
            <p>
              State an amount you would contribute if this reviewed public-good pool does not
              reach your selected tier from other eligible users&apos; effective support. If other
              eligible support reaches at least your selected tier, the platform contributes the
              tier-specific match to reviewed projects and you are charged $0. If other eligible
              support does not reach your selected tier, you contribute the stated amount to
              reviewed projects. There is no direct user payout.
            </p>
          </div>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Labs view</dt>
              <dd>{labsCapability.allowed ? "route-safe read-only brief" : labsCapability.reasons.join(", ")}</dd>
            </div>
            <div>
              <dt>Production money</dt>
              <dd>{productionCapability.reasons.join(", ")}</dd>
            </div>
            <div>
              <dt>Copy preflight</dt>
              <dd>{copyPreflight.passed ? "passed" : copyPreflight.blockedTerms.join(", ")}</dd>
            </div>
            <div>
              <dt>Schedule</dt>
              <dd>{schedule.schedule.state}</dd>
            </div>
          </dl>
        </section>

        <section className="section section-subtle" aria-labelledby="tiers-heading">
          <SectionHeader eyebrow="Frozen tiers" id="tiers-heading" title="Reward rates increase with tier difficulty.">
            Reward rates are based on frozen pre-round estimates of how hard each tier is to reach.
          </SectionHeader>
          <div className="data-grid">
            {schedule.tiers.map((tier) => (
              <article className="panel data-card" key={tier.id}>
                <p className="detail-kicker">{tier.publicLabel}</p>
                <h3>{formatUsd(tier.thresholdNetRecipientCents)}</h3>
                <p>{(tier.rewardRateBps / 100).toFixed(2)}% platform match to reviewed projects if the forecast is met.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="resolution-heading">
          <SectionHeader eyebrow="Resolution" id="resolution-heading" title="Own and same-control support is excluded.">
            Outcomes use other eligible users&apos; effective support, not raw stated contribution.
          </SectionHeader>
          <div className="mpgf-panel">
            <p>
              Own commitments, same-control accounts, fees, sponsor match, platform-match payments,
              refund-bonus reserves, drafts, payment-failed rows, blocked rows, stale authorizations,
              and final project disbursement after settlement do not count toward a participant&apos;s
              forecast result.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
