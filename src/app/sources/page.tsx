import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sources",
  description:
    "Conceptual sources and internal reference pages for Moral Trade's pilot framing, safety model, and public-goods thesis.",
  alternates: {
    canonical: "/sources",
  },
  openGraph: {
    title: "Moral Trade sources",
    description:
      "Reference points for the Moral Trade pilot, including moral trade, moral public goods, anti-threat design, and validation standards.",
    url: getAbsoluteUrl("/sources"),
    type: "article",
  },
};

const primarySources = [
  {
    title: "Toby Ord, Moral Trade",
    href: "https://doi.org/10.1086/682187",
    role:
      "Conceptual basis for voluntary exchanges where parties with different moral views each see the world as improved.",
    supports: "Basic product vocabulary, voluntary mutual-gain framing, and the need to avoid coercion.",
  },
  {
    title: "Forethought, Convergence and Compromise",
    href: "https://www.forethought.org/research/convergence-and-compromise",
    role:
      "Research framing for moral convergence, bargaining, compromise, threats, and blockers to mutually beneficial coordination.",
    supports: "Anti-threat rules, baseline integrity, and the emphasis on institutions that make trade reviewable.",
  },
  {
    title: "Forethought, Moral Public Goods",
    href: "https://www.forethought.org/research/moral-public-goods-are-a-big-deal-for-whether-we-get-a-good-future",
    role:
      "Public-goods framing for compromise destinations that many moral views can value, even under disagreement.",
    supports: "Public Goods Fund language, compromise destinations, and donation-offset routing.",
  },
] as const;

const internalReferences = [
  {
    title: "Moral Trade primer",
    href: "/moral-trade",
    detail: "Plain-language definition, examples, limits, and trust problems.",
  },
  {
    title: "Methodology",
    href: "/methodology",
    detail: "How offers, matching, staged disclosure, verification, and portability are structured.",
  },
  {
    title: "Anti-threat baseline",
    href: "/anti-threat-baseline",
    detail: "Threat rejection, no-trade baselines, cooling-off periods, and externality review.",
  },
  {
    title: "Validation",
    href: "/validation",
    detail: "Evidence states, reviewer roles, challenge windows, and quality metrics.",
  },
] as const;

const structuredData = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Moral Trade sources",
  url: getAbsoluteUrl("/sources"),
  description: metadata.description,
  hasPart: primarySources.map((source, index) => ({
    "@type": "CreativeWork",
    position: index + 1,
    name: source.title,
    url: source.href,
    about: source.supports,
  })),
};

export default async function SourcesPage() {
  const viewer = await getViewer();

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(Boolean(viewer))}
        {...getTopbarActions(Boolean(viewer))}
        showLogout={Boolean(viewer)}
      />
      <main className="legal-page" id="main-content" tabIndex={-1}>
        <p className="eyebrow">Sources</p>
        <h1>Reference points for the pilot.</h1>
        <p>
          This page gives “Sources” a direct destination instead of sending visitors to a
          methodology anchor. It separates conceptual references from product claims, legal
          posture, reviewer operations, and product-boundary notes.
        </p>

        <section className="panel data-card data-card-wide">
          <h2>Primary references</h2>
          <div className="data-grid">
            {primarySources.map((source) => (
              <article className="panel data-card" key={source.title}>
                <h3>{source.title}</h3>
                <p className="route-text">{source.role}</p>
                <p className="route-text">
                  <strong>Used for:</strong> {source.supports}
                </p>
                <a href={source.href} rel="noreferrer" target="_blank">
                  Open source
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Internal reference pages</h2>
          <div className="teaser-grid">
            {internalReferences.map((reference) => (
              <Link className="panel teaser-card" href={reference.href} key={reference.title}>
                <h3>{reference.title}</h3>
                <p>{reference.detail}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Boundary</h2>
          <p>
            Source references do not make the site a charity evaluator, legal advisor, escrow
            service, or objective moral ranking system. They explain the pilot&apos;s research lineage
            and the safety problems its product design tries to address.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
