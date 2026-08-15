import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { IconMark } from "@/components/ui/page-primitives";
import { getMarketplaceOverview, getViewer } from "@/lib/app-data";
import { resolvePublicMarketplaceOverview } from "@/lib/public-marketplace-overview";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { VISITOR_PATHS } from "@/lib/visitor-paths";

export const metadata: Metadata = {
  title: "Start a Real Action",
  description:
    "Choose a live first step on Moral Trade: make a financial contribution, create a bounded trade, review conditional pools, or explore participant proposals.",
  alternates: {
    canonical: "/start",
  },
  openGraph: {
    title: "Start a real action on Moral Trade",
    description:
      "Fund a public good through a reviewed payment route, create a trade, review conditional pools, or explore current participant proposals.",
    url: getAbsoluteUrl("/start"),
    type: "website",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Moral Trade action paths",
  url: getAbsoluteUrl("/start"),
  itemListElement: VISITOR_PATHS.map((path, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: path.title,
    url: getAbsoluteUrl(path.href),
    description: path.description,
  })),
};

function formatOptionalCount(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("en-US").format(value);
}

export default async function StartPage() {
  const [viewer, marketplaceOverview] = await Promise.all([
    getViewer(),
    resolvePublicMarketplaceOverview(getMarketplaceOverview()),
  ]);
  const isAuthenticated = Boolean(viewer);
  const createHref = isAuthenticated ? "/create" : "/signup?returnTo=/create";
  const serviceSnapshot = [
    {
      icon: "payment",
      label: "Financial contribution",
      value: "Available",
    },
    {
      icon: "marketplace",
      label: "Open proposals",
      value: formatOptionalCount(marketplaceOverview.openOfferCount),
    },
    {
      icon: "profile",
      label: "Public profiles",
      value: formatOptionalCount(marketplaceOverview.publicProfileCount),
    },
  ] as const;

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Start</p>
            <h1>Choose a real first action.</h1>
            <p className="hero-text">
              The shortest financial path is available now: choose a reviewed destination and
              complete payment through Every.org. You can also create a bounded trade, review live
              pools, or respond to a participant proposal.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/donate">
                Make a financial contribution
              </Link>
              <Link className="button button-secondary" href={createHref}>
                Create a proposal
              </Link>
            </div>
            <ul className="hero-signals" aria-label="Current action boundaries">
              <li>Provider-hosted payment</li>
              <li>Reviewed destinations</li>
              <li>No platform custody</li>
              <li>Bounded commitments</li>
            </ul>
          </section>

          <aside className="growth-progress-card panel" aria-label="Current service state">
            <p className="eyebrow">Available now</p>
            {serviceSnapshot.map((item) => (
              <div className="growth-progress-stat" key={item.label}>
                <IconMark name={item.icon} />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
            <p className="hero-followup">
              Donation payment is completed by the external provider. Moral Trade can import or
              review evidence for a linked workflow, but does not hold the donation or claim escrow.
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="growth-start-section section section-white" aria-labelledby="visitor-paths-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Four live paths</p>
            <h2 id="visitor-paths-heading">Fund, create, pool, or explore</h2>
            <p>
              Each route lands on a concrete action. Terms, financial boundaries, evidence, and
              recourse remain visible before anyone relies on a record.
            </p>
          </div>

          <div className="growth-start-grid">
            {VISITOR_PATHS.map((path) => (
              <Link className="growth-path-card panel" href={path.href} key={path.key}>
                <IconMark name={path.icon} />
                <div>
                  <p className="detail-kicker">{path.title}</p>
                  <h3>{path.homeTitle}</h3>
                  <p>{path.description}</p>
                  <p className="route-text">{path.fit}</p>
                </div>
                <span className="inline-link">{path.actionLabel}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="action-boundaries-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Before reliance</p>
            <h2 id="action-boundaries-heading">What every action keeps visible</h2>
            <p>
              A financial or non-financial commitment is useful only when the route, maximum
              exposure, evidence, review state, and exit behavior are explicit.
            </p>
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <h3>Payment boundary</h3>
              <p className="route-text">
                The current donation route sends payment to Every.org. Moral Trade does not hold the
                funds, offer escrow, or decide tax treatment.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Bounded exposure</h3>
              <p className="route-text">
                Money, time, action burden, duration, condition, and cancellation rules stay visible
                before acceptance.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Reviewable evidence</h3>
              <p className="route-text">
                Submitted, imported, reviewed, disputed, and unavailable evidence remain separate
                states rather than a single success claim.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="visitor-actions-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Start now</p>
            <h2 id="visitor-actions-heading">Use the strongest current route</h2>
            <p>
              Make a financial contribution through a reviewed provider route, or create a bounded
              proposal when your use case needs a counterparty.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href="/donate">
              Choose a funding route
            </Link>
            <Link className="button button-secondary" href={createHref}>
              Create a trade
            </Link>
            <Link className="button button-secondary" href="/status">
              Review service boundaries
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
