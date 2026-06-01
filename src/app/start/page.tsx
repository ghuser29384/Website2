import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { IconMark } from "@/components/ui/page-primitives";
import { getMarketplaceOverview, getViewer } from "@/lib/app-data";
import { CANONICAL_WORKED_CASE_COUNT } from "@/lib/seed-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { VISITOR_PATHS } from "@/lib/visitor-paths";

export const metadata: Metadata = {
  title: "Choose Your Path",
  description:
    "Route yourself through Moral Trade by intent: learn the idea, test a worked example, donate through a vetted route, or join and build the founding cohort.",
  alternates: {
    canonical: "/start",
  },
  openGraph: {
    title: "Choose your Moral Trade path",
    description:
      "A four-path router for new visitors: learn, test an example, donate, or join/build.",
    url: getAbsoluteUrl("/start"),
    type: "website",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Moral Trade visitor paths",
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
  return value === null ? "Pending" : new Intl.NumberFormat("en-US").format(value);
}

export default async function StartPage() {
  const [viewer, marketplaceOverview] = await Promise.all([
    getViewer(),
    getMarketplaceOverview(),
  ]);
  const pilotSnapshot = [
    {
      icon: "marketplace",
      label: "Live offers",
      value: formatOptionalCount(marketplaceOverview.openOfferCount),
    },
    {
      icon: "example",
      label: "Worked examples",
      value: String(CANONICAL_WORKED_CASE_COUNT),
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
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Visitor router</p>
            <h1>Choose the right first path.</h1>
            <p className="hero-text">
              Moral Trade is easier to understand when you start from your intent. Pick whether you
              want to learn, test an example, donate, or join/build.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/worked-examples">
                Test a worked example
              </Link>
              <Link className="button button-secondary" href="/what-is-moral-trade">
                Read the primer
              </Link>
            </div>
          </section>

          <aside className="growth-progress-card panel" aria-label="Pilot inventory">
            <p className="eyebrow">Pilot inventory</p>
            {pilotSnapshot.map((item) => (
              <div className="growth-progress-stat" key={item.label}>
                <IconMark name={item.icon} />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
            <p className="hero-followup">
              No liquidity claim: examples and cohort routes come before broad marketplace
              assumptions.
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="growth-start-section section section-white" aria-labelledby="visitor-paths-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Four paths</p>
            <h2 id="visitor-paths-heading">Learn, test, donate, or join/build</h2>
            <p>
              Each path lands on a concrete next step and keeps the prototype boundary visible
              before asking you to publish or rely on a live trade.
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

        <section className="section section-subtle" aria-labelledby="path-boundaries-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Boundary</p>
            <h2 id="path-boundaries-heading">What this router prevents</h2>
            <p>
              It keeps new visitors from treating an early pilot as a mature marketplace, and it
              separates first-time visitor actions from signed-in member workflows.
            </p>
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <h3>No liquidity assumption</h3>
              <p className="route-text">
                Worked examples explain the mechanism before you infer demand from live offers.
              </p>
            </article>
            <article className="panel data-card">
              <h3>No account pressure</h3>
              <p className="route-text">
                The primer, examples, and donation routes are readable before signup.
              </p>
            </article>
            <article className="panel data-card">
              <h3>No hidden automation</h3>
              <p className="route-text">
                Private matching still depends on broad previews, consent gates, and human review.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="visitor-actions-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Still unsure?</p>
            <h2 id="visitor-actions-heading">Start where the evidence is clearest</h2>
            <p>
              The fastest way to understand Moral Trade is to inspect one complete example and its
              baseline, proof rule, and review boundaries.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href="/worked-examples">
              Browse worked examples
            </Link>
            <Link className="button button-secondary" href="/trust">
              Read what you can rely on
            </Link>
            <Link className="button button-secondary" href="/contact">
              Contact the pilot operators
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
