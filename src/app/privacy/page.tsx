import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Privacy practices for Moral Trade profiles, wish previews, source connections, and consent-gated background networking.",
  alternates: {
    canonical: "/privacy",
  },
};

export default async function PrivacyPage() {
  const viewer = await getViewer();

  return (
    <div className="page-shell">
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(Boolean(viewer))}
        {...getTopbarActions(Boolean(viewer))}
        showLogout={Boolean(viewer)}
      />
      <main className="legal-page" id="main-content" tabIndex={-1}>
        <p className="eyebrow">Privacy</p>
        <h1>Privacy for semi-private moral matching</h1>
        <p>
          Moral Trade separates public profile data from private wish-profile data. Exact wishes,
          asks, constraints, and verification preferences should stay private unless a user chooses
          to share more.
        </p>
        <section className="panel data-card data-card-wide">
          <h2>Public and private fields</h2>
          <p>
            Public pages may show profile names, broad cause areas, public offers, comments,
            recommendations, ratings, and follower counts. Private wish profiles are used for match
            suggestions and consent-gated introductions.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Surveillance and total secrecy are both bad defaults</h2>
          <p>
            Background networking creates a real trade-off. If exact wishes are broadly visible,
            they can be used for surveillance, harassment, or exploitation. If everything is hidden
            absolutely, harmful collusion can become harder to detect. The current design aims for
            a middle layer: broad previews, field-level grants, manual review, and narrow
            disclosure tied to specific counterparties or stages.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Source connections and manual imports</h2>
          <p>
            The dashboard can record possible links to blogs, email, calendar records, chatbot
            history, search profiles, and other sources. For now, these records store consent
            scope, import mode, and manual summaries only. The app does not automatically ingest,
            scrape, or search raw external data.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Field-level grants and portability</h2>
          <p>
            Privacy grants let a participant decide whether a fact stays hidden, becomes broad,
            becomes specific, or becomes contact-level for a particular introduction workflow. The
            app also exposes portable profile export and import endpoints so wish data can move
            later if a more decentralized registry becomes preferable.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Payment data</h2>
          <p>
            Stripe handles card and payout details. Moral Trade stores payment status, Stripe object
            identifiers, amount, currency, cadence, and agreement references so participants can
            reconcile commitments.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Notifications</h2>
          <p>
            The app can queue notification records for email delivery through an external provider.
            Operators may see queued, failed, or suppressed email records in order to diagnose
            delivery problems and prevent unsafe notifications.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Administrative access</h2>
          <p>
            Admin review should be limited to safety, abuse, payment, and delivery operations.
            Private wish details should not be disclosed to other participants unless the product
            has a consent gate for that disclosure.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
