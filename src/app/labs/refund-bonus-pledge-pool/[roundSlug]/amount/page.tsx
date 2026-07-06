import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  REFUND_BONUS_NON_MVP_WARNING,
  computeRefundBonusCents,
} from "@/lib/mpgf/public-goods-refund-bonus-non-mvp";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: "/labs/refund-bonus-pledge-pool/demo-round/amount",
  },
  description: "Disabled non-MVP labs Amount screen for the backed refund-bonus pledge-pool branch.",
  openGraph: {
    description: "A route-safe amount and viewpoint-tag screen for a disabled refund-bonus labs flow.",
    title: "Refund-Bonus Pledge Pool Amount",
    type: "website",
    url: getAbsoluteUrl("/labs/refund-bonus-pledge-pool/demo-round/amount"),
  },
  title: "Refund-Bonus Pledge Pool Amount",
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

export default async function RefundBonusPledgePoolAmountPage({ params }: PageProps) {
  const { roundSlug } = await params;
  const maxGrossCents = 2_500;
  const bonusCents = computeRefundBonusCents({
    bonusRatioBps: 1_000,
    maxGrossCents,
    mode: "percentage_of_pledge_capped",
    perUserBonusCapCents: 250,
  });

  return (
    <div className="page-shell page-shell-focused">
      <header className="v72-route-header">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <Breadcrumbs
          items={[
            { href: "/mpgf", label: "Public Goods Fund" },
            { href: "/labs/refund-bonus-pledge-pool", label: "Refund-bonus labs" },
            { href: `/labs/refund-bonus-pledge-pool/${roundSlug}`, label: "Pool" },
            { href: `/labs/refund-bonus-pledge-pool/${roundSlug}/amount`, label: "Amount" },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="amount-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Screen 2 of 3</p>
            <h1 id="amount-heading">Maximum pledge.</h1>
            <p>{REFUND_BONUS_NON_MVP_WARNING}</p>
            <p>
              This disabled labs screen shows the v137 amount, viewpoint, visibility, and
              bonus-term copy. It does not create a draft, reserve bonus exposure, or count support.
            </p>
          </div>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Maximum pledge</dt>
              <dd>{formatUsd(maxGrossCents)}</dd>
            </div>
            <div>
              <dt>Failure-participation bonus</dt>
              <dd>10% of pledge, capped at {formatUsd(bonusCents)}</dd>
            </div>
            <div>
              <dt>Visibility</dt>
              <dd>aggregate only</dd>
            </div>
            <div>
              <dt>Decision state</dt>
              <dd>disabled labs preview</dd>
            </div>
          </dl>
        </section>

        <section className="section section-subtle" aria-labelledby="viewpoint-heading">
          <SectionHeader eyebrow="Optional viewpoint tag" id="viewpoint-heading" title="Aggregate-only and not a moral score.">
            The tag does not affect pledge power and is used only to check whether enough different-view support joined.
          </SectionHeader>
          <div className="data-grid">
            {[
              "Humanitarian",
              "Animal-inclusive",
              "Long-run future",
              "Institutional resilience",
              "Public knowledge",
              "Other",
              "Prefer not to say",
            ].map((label) => (
              <article className="panel data-card" key={label}>
                <p className="detail-kicker">Viewpoint option</p>
                <h3>{label}</h3>
                <p>Selection is optional and aggregate-only in this disabled labs flow.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="bonus-heading">
          <SectionHeader eyebrow="Bonus terms" id="bonus-heading" title="Backed, conditional, and separate from impact.">
            The bonus is not interest, not an investment return, not a donation receipt, not a lottery, and not public-good impact.
          </SectionHeader>
          <div className="mpgf-panel">
            <p>
              If the pool clears, the participant may be charged up to the maximum pledge only
              after the round closes and all listed success gates pass.
            </p>
            <p>
              If the pool misses a bonus-eligible support threshold, eligible pledgers are charged
              $0 and may receive the backed failure-participation bonus shown here.
            </p>
            <p>
              Prefer not to say counts as a verified supporter but does not count as a distinct
              different-view cluster under the default rulebook.
            </p>
            <div className="section-actions">
              <a className="button button-secondary" href={`/labs/refund-bonus-pledge-pool/${roundSlug}/review`}>
                View disabled final review
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
