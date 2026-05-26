import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getMarketplaceOverview, getViewer } from "@/lib/app-data";
import { CANONICAL_WORKED_CASE_COUNT } from "@/lib/seed-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pilot Status",
  description:
    "Current Moral Trade pilot status: what is live, what is reviewed, what is not guaranteed, and what comes next.",
  alternates: {
    canonical: "/status",
  },
  openGraph: {
    title: "Moral Trade pilot status",
    description:
      "See what the Moral Trade pilot currently supports, what remains prototype-stage, and where to start.",
    url: getAbsoluteUrl("/status"),
    type: "website",
  },
};

function formatStatusCount(value: number | null) {
  return value === null ? "Pending" : new Intl.NumberFormat("en-US").format(value);
}

export default async function StatusPage() {
  const [viewer, overview] = await Promise.all([getViewer(), getMarketplaceOverview()]);

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Pilot status</p>
            <h1>What is real on Moral Trade today.</h1>
            <p className="hero-text">
              The public site is a reviewed pilot, not a liquid exchange. Its strongest current
              use is understanding the mechanism, cloning worked examples, joining a small cohort,
              and submitting reviewable proof artifacts.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/offers?view=examples">
                Browse worked examples
              </Link>
              <Link className="button button-secondary" href="/trust">
                Read what you can rely on
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Public snapshot</p>
            <dl className="profile-stats profile-stats-hero">
              <div>
                <dt>Live proposals</dt>
                <dd>{formatStatusCount(overview.openOfferCount)}</dd>
              </div>
              <div>
                <dt>Worked examples</dt>
                <dd>{CANONICAL_WORKED_CASE_COUNT}</dd>
              </div>
              <div>
                <dt>Public profiles</dt>
                <dd>{formatStatusCount(overview.publicProfileCount)}</dd>
              </div>
              <div>
                <dt>Completed agreements</dt>
                <dd>{formatStatusCount(overview.completedAgreementCount)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Now</p>
            <h2>Supported pilot surfaces</h2>
            <p>
              These are the parts visitors can use without assuming hidden liquidity or automated
              matching.
            </p>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <h3>Primer and worked examples</h3>
              <p className="route-text">
                Public examples show terms, evidence, baseline confidence, and externality review
                without pretending they are live offers.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Founding cohort</h3>
              <p className="route-text">
                Early users are routed toward one low-risk action, one serious invite, and one
                proof artifact before broader marketplace activity.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Non-custodial donation routes</h3>
              <p className="route-text">
                Curated Every.org links and manual evidence records support donation workflows
                without escrow, custody, tax advice, or platform-held funds.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Not yet</p>
            <h2>Prototype boundaries</h2>
            <p>
              These are intentionally not marketed as complete until the site has more verified
              activity and governance operations.
            </p>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <h3>No liquidity claim</h3>
              <p className="route-text">
                Public live proposals may be sparse or absent. Browse examples before treating the
                site as a market.
              </p>
            </article>
            <article className="panel data-card">
              <h3>No automated outreach</h3>
              <p className="route-text">
                Broad previews and consent gates come before identity-specific disclosure or
                introductions.
              </p>
            </article>
            <article className="panel data-card">
              <h3>No guaranteed legal enforceability</h3>
              <p className="route-text">
                The site records terms, evidence, and review states; it does not provide legal,
                tax, escrow, custody, or investment services.
              </p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
