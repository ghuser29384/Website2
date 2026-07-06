import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  REFUND_BONUS_NON_MVP_WARNING,
  computeRefundBonusCents,
  evaluateRefundBonusCapability,
  evaluateRefundBonusOpenGate,
  validateRefundBonusCopy,
} from "@/lib/mpgf/public-goods-refund-bonus-non-mvp";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: "/labs/refund-bonus-pledge-pool",
  },
  description: "Read-only non-MVP labs brief for the backed refund-bonus pledge-pool branch.",
  openGraph: {
    description: "A disabled-by-default labs mechanism for backed failure-participation bonuses.",
    title: "Refund-Bonus Pledge Pool Labs",
    type: "website",
    url: getAbsoluteUrl("/labs/refund-bonus-pledge-pool"),
  },
  title: "Refund-Bonus Pledge Pool Labs",
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

export default function RefundBonusPledgePoolLabsPage() {
  const fixedDemoBonus = computeRefundBonusCents({
    fixedBonusCents: 100,
    maxGrossCents: 50,
    mode: "fixed_cents",
    perUserBonusCapCents: 100,
  });
  const saferPilotBonus = computeRefundBonusCents({
    bonusRatioBps: 1_000,
    maxGrossCents: 2_500,
    mode: "percentage_of_pledge_capped",
    perUserBonusCapCents: 250,
  });
  const labsCapability = evaluateRefundBonusCapability({
    action: "view_labs_pool",
    actorRole: "labs_participant",
    environment: "development",
    featureEnabled: true,
  });
  const productionCapability = evaluateRefundBonusCapability({
    action: "execute_bonus_payout",
    actorRole: "service",
    environment: "production",
    featureEnabled: true,
  });
  const gate = evaluateRefundBonusOpenGate({
    id: "labs-refund-bonus-gate",
    roundId: "labs-refund-bonus-round",
    poolId: "labs-refund-bonus-pool",
    checkedAt: "2026-07-06T00:00:00.000Z",
    lastDeployHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
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
  const copyPreflight = validateRefundBonusCopy(`
    Non-MVP labs mechanism.
    If the pool misses the support threshold, eligible pledgers may receive a backed failure-participation bonus.
    No bonus is paid for blocked, unsafe, ineligible, duplicate, payment-failed, or abuse-flagged pledges.
    This bonus is not interest, not an investment return, not a lottery, and not public-good impact.
  `);

  return (
    <div className="page-shell page-shell-focused">
      <header className="v72-route-header">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <Breadcrumbs
          items={[
            { href: "/mpgf", label: "Public Goods Fund" },
            { href: "/labs/refund-bonus-pledge-pool", label: "Refund-bonus labs" },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="refund-bonus-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Non-MVP labs</p>
            <h1 id="refund-bonus-heading">Refund-Bonus Pledge Pool.</h1>
            <p>{REFUND_BONUS_NON_MVP_WARNING}</p>
            <p>
              Fund reviewed public goods only if enough different-view support joins. If the pool
              misses the support threshold, eligible pledgers may receive a backed
              failure-participation bonus. No bonus is paid for blocked, unsafe, ineligible,
              duplicate, payment-failed, or abuse-flagged pledges.
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
              <dt>Open gate</dt>
              <dd>{gate.state}: {gate.failedReasonCodes.join(", ") || "all readiness checks passed"}</dd>
            </div>
            <div>
              <dt>Copy preflight</dt>
              <dd>{copyPreflight.passed ? "passed" : copyPreflight.blockedTerms.join(", ")}</dd>
            </div>
          </dl>
        </section>

        <section className="section section-subtle" aria-labelledby="bonus-rules-heading">
          <SectionHeader eyebrow="Bonus rules" id="bonus-rules-heading" title="Backed, conditional, and separate from impact.">
            Bonus reserve, project funding, sponsor match, fees, liability, payout, held, and released-unused channels stay separate.
          </SectionHeader>
          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Simulation example</p>
              <h3>{formatUsd(fixedDemoBonus)}</h3>
              <p>A fixed bonus for a fixed {formatUsd(50)} pledge is simulation/test only unless separately approved.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Safer pilot example</p>
              <h3>{formatUsd(saferPilotBonus)}</h3>
              <p>A 10% bonus capped at {formatUsd(250)} for a {formatUsd(2_500)} pledge.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Qualifying failure</p>
              <h3>Support shortfall only</h3>
              <p>Net-recipient, verified-supporter, and different-view shortfalls are the default bonus-eligible modes.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">No-bonus failures</p>
              <h3>Review and safety blocks</h3>
              <p>Review, anti-threat, legal, payment-provider, copy, safety, fraud, and unbacked-reserve failures fail closed.</p>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="side-effects-heading">
          <SectionHeader eyebrow="Side effects" id="side-effects-heading" title="No charge occurs from this read-only labs page.">
            Saving a payment method is not a charge, hold, escrow, custody, authorization, or guarantee.
          </SectionHeader>
          <div className="mpgf-panel">
            <p>
              Success authorization can occur only after close and gates. Capture can occur only
              from exact authorized rows while the pool remains payable. Bonus payout can occur
              only in bonus-payable states after qualifying failure, reserve, legal, provider, and
              emergency-pause gates pass.
            </p>
            <p>
              A hard pledge can exist only after the open gate passes, final review is confirmed,
              fee and sealed-progress acknowledgements are recorded, bonus terms are acknowledged,
              identity and bonus eligibility checks pass, the payment method is provider-confirmed,
              and backed bonus exposure fits within the round, pool, and reserve caps.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
