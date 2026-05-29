import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const methodologyDescription =
  "How Moral Trade structures offers, wish profiling, registry search, matching, verification, and validator-backed review without AI-first automation.";

export const metadata: Metadata = {
  title: "Methodology",
  description: methodologyDescription,
  alternates: {
    canonical: "/methodology",
  },
  openGraph: {
    title: "Methodology | Moral Trade",
    description: methodologyDescription,
    url: getAbsoluteUrl("/methodology"),
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Methodology | Moral Trade",
    description: methodologyDescription,
  },
};

export default async function MethodologyPage() {
  const viewer = await getViewer();
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/methodology", label: "Methodology" },
  ]);

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData),
        }}
        type="application/ld+json"
      />
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(Boolean(viewer))}
        {...getTopbarActions(Boolean(viewer))}
        showLogout={Boolean(viewer)}
      />
      <Breadcrumbs items={[{ href: "/methodology", label: "Methodology" }]} />
      <main className="legal-page" id="main-content" tabIndex={-1}>
        <p className="eyebrow">Methodology</p>
        <h1>How Moral Trade structures reasoning</h1>
        <p>
          The interface asks participants to state the cause area, action, requested counterpart,
          expected impact, verification method, duration, payment cadence if relevant, and exit
          conditions.
        </p>
        <section className="panel data-card data-card-wide">
          <h2>Offer structure</h2>
          <p>
            Each offer separates what one side will do from what it asks another person to do. This
            keeps pledge swaps, donation offsets, and payment-mediated action offers legible.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Participation modes</h2>
          <p>
            A participant can join as an individual, a collective, or an institution. The app also
            distinguishes between a passive mode, where you record delegate rules and possible
            source connections, and a proactive mode, where you state explicit wishes, offers,
            asks, constraints, and verification preferences directly.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Wish profiling without AI</h2>
          <p>
            The current synthesis layer is deterministic. It summarizes user-entered fields,
            captured excerpts, manual source notes, and structured constraints into a private
            profile of hopes, intent, capabilities, and uncertainty. Clarification questions are
            generated from missing or underspecified fields rather than from an LLM interviewer.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Matching</h2>
          <p>
            Current match suggestions are rule-based. They use stated cause areas, compatibility
            with payment or pledges, shared terms, and consent-gated previews rather than AI
            inference.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Wish registry and staged disclosure</h2>
          <p>
            The wish registry indexes broad previews only. Searches surface just enough
            information to decide whether a counterparty seems worth exploring further. Exact
            wishes, constraints, identity details, and contact data remain behind consent and
            privacy-grant stages.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Moral public goods and distributed coordination</h2>
          <p>
            Some compromise destinations matter because many different moral views can value them
            at once. Global health, anti-poverty work, climate resilience, and other broadly shared
            public goods can make donation offsets more credible by giving opposed donors a named
            destination that is not merely a thin bilateral settlement. The platform therefore
            highlights moral-public-goods compromise destinations and treats coordination power as
            something that should be distributed, reviewable, and hard to weaponize through
            coercive threats.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Follow-through after a promising match</h2>
          <p>
            Background scans can open notifications, saved-search results, match reports, network
            invite drafts, brokerage bounties, and introduction plans. The goal is to take the
            first bounded steps toward a real conversation without auto-sending messages or
            pretending the system already has trustworthy autonomy.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Verification</h2>
          <p>
            Agreement events let participants record evidence, counterproposals, disputes, and
            payment updates. The goal is disciplined review rather than engagement-maximizing
            discourse.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Public validator evidence</h2>
          <p>
            The core proposal contract, review workflow, factor-code vocabulary, API route
            catalog, and provenance schema are published as validator-backed technical evidence.
            These contracts are the inspectable version of the methodology: they show which fields,
            privacy classes, fallbacks, and review states the product is allowed to rely on.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/moral-trade/technical-spec">
              Inspect technical spec
            </Link>
            <Link className="button button-secondary" href="/api/moral-trade/api-contract">
              View API contract
            </Link>
            <Link className="button button-secondary" href="/api/moral-trade/review-workflow/contract">
              View review workflow
            </Link>
          </div>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Centralized first, portable later</h2>
          <p>
            The present implementation is centralized for simplicity, but the data model includes
            export, import, and schema endpoints so wish profiles and source summaries can move if
            a more interoperable or decentralized registry becomes preferable later.
          </p>
        </section>
        <section className="panel data-card data-card-wide" id="faq">
          <h2>FAQ</h2>
          <p>
            Moral Trade records structured proposals; it does not hold money, provide legal or tax
            advice, or claim escrow. Public examples are worked examples unless a signed-in
            participant publishes a live offer, and evidence must be reviewed before anyone relies
            on a trade record as fulfilled.
          </p>
        </section>
        <section className="panel data-card data-card-wide" id="sources">
          <h2>Sources</h2>
          <p>
            The public product language draws on Toby Ord&apos;s “Moral Trade” and Forethought&apos;s
            essays on convergence, compromise, and moral public goods. The site summarizes these
            ideas without claiming legal enforceability, custody, or evaluator status.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
