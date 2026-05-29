import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const safetyDescription =
  "Safety standards for Moral Trade proposals, background networking, payments, consent-gated introductions, and validator-backed review.";

export const metadata: Metadata = {
  title: "Safety",
  description: safetyDescription,
  alternates: {
    canonical: "/safety",
  },
  openGraph: {
    title: "Safety | Moral Trade",
    description: safetyDescription,
    url: getAbsoluteUrl("/safety"),
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Safety | Moral Trade",
    description: safetyDescription,
  },
};

export default async function SafetyPage() {
  const viewer = await getViewer();
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/safety", label: "Safety" },
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
      <Breadcrumbs items={[{ href: "/safety", label: "Safety" }]} />
      <main className="legal-page" id="main-content" tabIndex={-1}>
        <p className="eyebrow">Safety</p>
        <h1>Safety rules for voluntary moral trade</h1>
        <p>
          Moral Trade should make serious cooperation easier without rewarding coercion, harassment,
          manipulation, or unsafe background networking.
        </p>
        <section className="panel data-card data-card-wide">
          <h2>Anti-threat and baseline integrity</h2>
          <p>
            Safety review starts with the no-trade baseline: what would each participant do absent
            the trade? Proposals involving threat creation, newly escalated harmful behavior, or
            coercive compensation requests should be rejected or sent to challenge review.
          </p>
          <Link className="text-button" href="/anti-threat-baseline">
            Read anti-threat baseline rules
          </Link>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Blocked proposal classes</h2>
          <p>
            The platform should reject or review proposals involving violence, illegal acts, fraud,
            extortion, doxxing, harassment, exploitation, or pressure on vulnerable people.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Validator-backed safety evidence</h2>
          <p>
            Public health endpoints expose whether the security, disclosure, challenge-appeal,
            incident-response, performance, and AI-governance contracts pass their current
            validators. Safety claims should stay tied to these checks rather than implying hidden
            automation, escrow, or unrestricted reviewer authority.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/api/moral-trade/security/health">
              View security health
            </Link>
            <Link className="button button-secondary" href="/api/moral-trade/disclosure/contract">
              View disclosure contract
            </Link>
            <Link className="button button-secondary" href="/api/moral-trade/challenge-appeal/contract">
              View appeal contract
            </Link>
            <Link className="button button-secondary" href="/api/moral-trade/incident-response/health">
              View incident response
            </Link>
          </div>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Background networking boundaries</h2>
          <p>
            The current prototype does not run autonomous AI outreach, mass profile ingestion, or
            private-feed search. Matching is limited to explicit fields, broad previews, saved
            searches, and manual source notes so the first version stays legible enough to audit.
          </p>
          <p>No surprise exposure. No autonomous outreach. No private-feed mining.</p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Collusion, secrecy, and review</h2>
          <p>
            The safety problem is not solved by either full openness or total opacity. Broad
            previews, review queues, match reports, and risk signals try to preserve enough
            oversight to investigate suspicious activity without exposing every participant&apos;s exact
            wishes to the public by default.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Dispute handling</h2>
          <p>
            Participants can record verification evidence, counterproposals, cancellation requests,
            and disputes on agreements. These records make review possible but do not replace
            professional legal or financial advice.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Review queues</h2>
          <p>
            Reports, payment-review requests, failed notifications, and blocked wish profiles are
            routed to an admin console so operators can inspect problems before they become public
            or affect counterparties.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Privacy gates</h2>
          <p>
            Match suggestions should reveal broad reasons first. Exact asks, identities, and contact
            details should be shared only after both sides consent.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
