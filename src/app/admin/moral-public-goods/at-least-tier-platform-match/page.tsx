import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING,
  buildAtLeastTierDevSeedData,
  computeDampedOddsRewardSchedule,
  evaluateAtLeastTierAdminWorkflow,
  evaluateAtLeastTierJobGate,
} from "@/lib/mpgf/public-goods-at-least-tier-platform-match";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: "/admin/moral-public-goods/at-least-tier-platform-match",
  },
  description: "Route-safe admin console for the non-MVP at-least-tier platform-match branch.",
  openGraph: {
    description: "Inspect disabled labs rounds, reward schedules, resolution, settlement, and audit gates without provider calls.",
    title: "At-Least-Tier Platform Match Admin",
    type: "website",
    url: getAbsoluteUrl("/admin/moral-public-goods/at-least-tier-platform-match"),
  },
  robots: {
    follow: false,
    index: false,
  },
  title: "At-Least-Tier Platform Match Admin",
};

const now = "2026-07-06T00:00:00.000Z";

const adminRoutes = [
  "/admin/moral-public-goods/at-least-tier-platform-match/rounds",
  "/admin/moral-public-goods/at-least-tier-platform-match/reward-schedule",
  "/admin/moral-public-goods/at-least-tier-platform-match/resolution",
  "/admin/moral-public-goods/at-least-tier-platform-match/settlement",
  "/admin/moral-public-goods/at-least-tier-platform-match/audit",
];

const adminActions = [
  "create_draft_labs_round",
  "configure_reviewed_pool",
  "configure_tiers",
  "enter_frozen_forecast_probabilities",
  "compute_reward_schedule",
  "inspect_reward_schedule",
  "freeze_reward_schedule",
  "configure_platform_match_reserve",
  "run_copy_preflight",
  "run_simulated_commitments",
  "run_simulated_authorization_resolution_settlement",
  "view_audit_report",
  "pause_or_kill_switch",
] as const;

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

export default function AtLeastTierPlatformMatchAdminPage() {
  const seed = buildAtLeastTierDevSeedData({ environment: "development", now });
  const schedule = computeDampedOddsRewardSchedule({
    freeze: true,
    now,
    roundId: "admin-at-least-tier-demo",
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 300_000, frozenForecastProbabilityBps: 5_500 },
      { tierIndex: 3, thresholdNetRecipientCents: 500_000, frozenForecastProbabilityBps: 3_500 },
      { tierIndex: 4, thresholdNetRecipientCents: 1_000_000, frozenForecastProbabilityBps: 2_000 },
      { tierIndex: 5, thresholdNetRecipientCents: 2_500_000, frozenForecastProbabilityBps: 1_000 },
    ],
  });
  const allowedAdminActions = adminActions.map((action) => ({
    action,
    gate: evaluateAtLeastTierAdminWorkflow({
      action,
      actorRole: "admin",
      environment: "development",
      featureEnabled: true,
      reserveBacked: true,
      reserveExposureExceeded: false,
      rewardScheduleFrozen: true,
      rewardScheduleValid: schedule.valid,
    }),
  }));
  const realSettlement = evaluateAtLeastTierAdminWorkflow({
    action: "execute_real_payment_authorization_capture",
    actorRole: "admin",
    environment: "production",
    featureEnabled: true,
    liveMoneyEnabled: true,
    promotionRecordApproved: true,
    reserveBacked: true,
    rewardScheduleFrozen: true,
    rewardScheduleValid: schedule.valid,
    copyPreflightPassed: true,
    legalComplianceApproved: true,
    paymentProviderReady: true,
    sybilControlsReady: true,
  });
  const reportJob = evaluateAtLeastTierJobGate({
    job: "public_report_job",
    actorRole: "service",
    environment: "production",
    featureEnabled: true,
    publicReportImpliesLiveProduct: true,
    rewardScheduleFrozen: true,
    rewardScheduleValid: schedule.valid,
    simulationOnly: true,
  });

  return (
    <div className="page-shell page-shell-focused">
      <header className="v72-route-header">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <Breadcrumbs
          items={[
            { href: "/admin", label: "Admin" },
            { href: "/admin/moral-public-goods/at-least-tier-platform-match", label: "At-least-tier platform match" },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="admin-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Non-MVP admin console</p>
            <h1 id="admin-heading">At-least-tier platform-match controls.</h1>
            <p>{AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING}</p>
            <p>
              This admin route is non-mutating. It documents the v137 control surfaces for draft
              labs rounds, reviewed pools, tier thresholds, frozen probabilities, damped reward
              schedules, reserve configuration, simulated resolution, simulated settlement, audit
              reporting, and pause controls. Provider calls are disabled.
            </p>
          </div>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Schedule</dt>
              <dd>{schedule.schedule.state}</dd>
            </div>
            <div>
              <dt>Reserve</dt>
              <dd>{seed.reserve?.status ?? "not configured"}</dd>
            </div>
            <div>
              <dt>Production settlement</dt>
              <dd>{realSettlement.blockerCodes.join(", ")}</dd>
            </div>
            <div>
              <dt>Public report job</dt>
              <dd>{reportJob.blockerCodes.join(", ")}</dd>
            </div>
          </dl>
        </section>

        <section className="section section-subtle" aria-labelledby="actions-heading">
          <SectionHeader eyebrow="Allowed labs actions" id="actions-heading" title="Admins can inspect and simulate, not execute live money.">
            Each listed action is evaluated through the v137 admin workflow gate. The labs path has
            no provider calls and no live-money authority.
          </SectionHeader>
          <div className="data-grid">
            {allowedAdminActions.map(({ action, gate }) => (
              <article className="panel data-card" key={action}>
                <p className="detail-kicker">{gate.allowed ? "allowed in labs" : "blocked"}</p>
                <h3>{action.replaceAll("_", " ")}</h3>
                <p>Provider calls: {gate.providerCallsAllowed ? "enabled" : "disabled"}.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="schedule-heading">
          <SectionHeader eyebrow="Reward schedule" id="schedule-heading" title="Frozen damped odds rates are inspectable.">
            Reward rates increase with tier difficulty and remain frozen before commitments open.
          </SectionHeader>
          <div className="data-grid">
            {schedule.tiers.map((tier) => (
              <article className="panel data-card" key={tier.id}>
                <p className="detail-kicker">{tier.publicLabel}</p>
                <h3>{(tier.rewardRateBps / 100).toFixed(2)}%</h3>
                <p>{formatUsd(tier.thresholdNetRecipientCents)} threshold.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="routes-heading">
          <SectionHeader eyebrow="Admin routes" id="routes-heading" title="Suggested v137 admin URLs resolve.">
            The route aliases are present for rounds, reward schedule, resolution, settlement, and
            audit until dedicated persistence-backed screens are promoted.
          </SectionHeader>
          <div className="data-grid">
            {adminRoutes.map((href) => (
              <article className="panel data-card" key={href}>
                <p className="detail-kicker">Route</p>
                <h3>{href.split("/").at(-1)?.replaceAll("-", " ")}</h3>
                <Link className="button button-secondary" href={href}>
                  Open
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
