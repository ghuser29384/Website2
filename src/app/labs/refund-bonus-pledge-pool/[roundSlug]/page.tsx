import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  REFUND_BONUS_NON_MVP_WARNING,
  computeRefundBonusCents,
  evaluateRefundBonusCapability,
  validateRefundBonusCopy,
} from "@/lib/mpgf/public-goods-refund-bonus-non-mvp";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: "/labs/refund-bonus-pledge-pool/demo-round",
  },
  description: "Read-only non-MVP labs pool screen for the backed refund-bonus pledge-pool branch.",
  openGraph: {
    description: "A disabled labs Pool screen for backed refund-bonus public-goods pledging.",
    title: "Refund-Bonus Pledge Pool Round",
    type: "website",
    url: getAbsoluteUrl("/labs/refund-bonus-pledge-pool/demo-round"),
  },
  title: "Refund-Bonus Pledge Pool Round",
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

export default async function RefundBonusPledgePoolRoundPage({ params }: PageProps) {
  const { roundSlug } = await params;
  const saferPilotBonus = computeRefundBonusCents({
    bonusRatioBps: 1_000,
    maxGrossCents: 2_500,
    mode: "percentage_of_pledge_capped",
    perUserBonusCapCents: 250,
  });
  const productionMoney = evaluateRefundBonusCapability({
    action: "execute_bonus_payout",
    actorRole: "service",
    environment: "production",
    featureEnabled: true,
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
            { href: `/labs/refund-bonus-pledge-pool/${roundSlug}`, label: "Pool" },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="pool-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Screen 1 of 3</p>
            <h1 id="pool-heading">Refund-bonus pool: {formatRoundLabel(roundSlug) || "Demo Round"}.</h1>
            <p>{REFUND_BONUS_NON_MVP_WARNING}</p>
            <p>
              This route is a read-only labs Pool screen. It does not create drafts, save hard
              pledges, save payment methods, authorize charges, capture funds, reserve bonus
              exposure, or pay bonuses.
            </p>
          </div>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Production money</dt>
              <dd>{productionMoney.reasons.join(", ")}</dd>
            </div>
            <div>
              <dt>Progress disclosure</dt>
              <dd>sealed qualitative status only before close</dd>
            </div>
            <div>
              <dt>Failure bonus rule</dt>
              <dd>10% of pledge, capped at {formatUsd(saferPilotBonus)}</dd>
            </div>
            <div>
              <dt>Copy preflight</dt>
              <dd>{copyPreflight.passed ? "passed" : copyPreflight.blockedTerms.join(", ")}</dd>
            </div>
          </dl>
        </section>

        <section className="section section-subtle" aria-labelledby="projects-heading">
          <SectionHeader eyebrow="Reviewed pool" id="projects-heading" title="Fund reviewed public goods only if enough support joins.">
            The labs example uses reviewed project cards, verified recipient-route status, and aggregate-only progress language.
          </SectionHeader>
          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Project A</p>
              <h3>Reviewed public-good route</h3>
              <p>Recipient route verified. Review state clear. One-line summary would come from the reviewed registry.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Project B</p>
              <h3>Reviewed public-good route</h3>
              <p>Recipient route verified. Anti-threat, externality, conflict, baseline, and challenge gates are nonblocking.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Reserve</p>
              <h3>Backed or labs simulation only</h3>
              <p>A separate backed reserve funds eligible failure-participation bonuses. It is not project funding or impact.</p>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="outcomes-heading">
          <SectionHeader eyebrow="Outcomes" id="outcomes-heading" title="Qualifying support failure is distinct from blocked failure.">
            Exact live threshold gaps, supporter gaps, different-view gaps, success-without-me status, and pivotality claims stay hidden before close.
          </SectionHeader>
          <div className="mpgf-panel">
            <p>
              If this pool clears, the participant&apos;s exact pledge may be charged only after the
              round closes, review and challenge gates pass, exact authorization succeeds, and the
              pool still clears after failed authorizations are removed.
            </p>
            <p>
              If this pool misses a support threshold, eligible pledgers are charged $0 and may
              receive the backed failure-participation bonus under the frozen rules.
            </p>
            <p>
              No bonus is paid for blocked, unsafe, ineligible, duplicate, payment-failed,
              review-blocked, legal-blocked, safety-paused, or abuse-flagged pledges.
            </p>
            <div className="section-actions">
              <a className="button button-secondary" href={`/labs/refund-bonus-pledge-pool/${roundSlug}/amount`}>
                View disabled amount screen
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
