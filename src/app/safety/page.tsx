import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Safety",
  description: "Safety standards for Moral Trade proposals, matches, payments, and comments.",
  alternates: {
    canonical: "/safety",
  },
};

export default async function SafetyPage() {
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
        <p className="eyebrow">Safety</p>
        <h1>Safety rules for voluntary moral trade</h1>
        <p>
          Moral Trade should make serious cooperation easier without rewarding coercion, harassment,
          manipulation, or unsafe background networking.
        </p>
        <section className="panel data-card data-card-wide">
          <h2>Blocked proposal classes</h2>
          <p>
            The platform should reject or review proposals involving violence, illegal acts, fraud,
            extortion, doxxing, harassment, exploitation, or pressure on vulnerable people.
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
