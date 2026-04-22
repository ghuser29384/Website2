import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy practices for Moral Trade profiles, wishes, offers, and match previews.",
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
      <main className="legal-page">
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
