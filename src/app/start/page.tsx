import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { IconMark } from "@/components/ui/page-primitives";
import { getMarketplaceOverview, getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { VISITOR_PATHS } from "@/lib/visitor-paths";

export const metadata: Metadata = {
  title: "Start",
  description:
    "Create a bounded agreement, browse active offers, fund a public good, or join a conditional pool on Moral Trade.",
  alternates: {
    canonical: "/start",
  },
  openGraph: {
    title: "Start on Moral Trade",
    description:
      "Create an agreement, browse active offers, fund a public good, or review conditional pools.",
    url: getAbsoluteUrl("/start"),
    type: "website",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Moral Trade actions",
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
    getMarketplaceOverview(),
  ]);
  const isAuthenticated = Boolean(viewer);
  const createHref = isAuthenticated ? "/create" : "/signup?returnTo=/create";
  const serviceSnapshot = [
    {
      icon: "marketplace",
      label: "Open proposals",
      value: formatOptionalCount(marketplaceOverview.openOfferCount),
    },
    {
      icon: "payment",
      label: "External donation route",
      value: "Available",
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
            <h1>Create an agreement or act on one.</h1>
            <p className="hero-text">
              Create bounded terms, browse active offers, fund a public good, or join a conditional
              pool.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={createHref}>
                Create an agreement
              </Link>
              <Link className="button button-secondary" href="/offers">
                Browse active offers
              </Link>
            </div>
            <ul className="hero-signals" aria-label="Core action boundaries">
              <li>No-deal default</li>
              <li>Bounded exposure</li>
              <li>Reviewable evidence</li>
              <li>Provider-hosted payment</li>
            </ul>
          </section>

          <aside className="growth-progress-card panel" aria-label="Current service state">
            {serviceSnapshot.map((item) => (
              <div className="growth-progress-stat" key={item.label}>
                <IconMark name={item.icon} />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="growth-start-section section section-white" aria-label="Available actions">
          <div className="growth-start-grid">
            {VISITOR_PATHS.map((path) => (
              <Link
                className="growth-path-card panel"
                href={path.key === "create" ? createHref : path.href}
                key={path.key}
              >
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
      </main>

      <SiteFooter />
    </div>
  );
}
