import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { requireViewer } from "@/lib/app-data";
import { listCoreOffersForOwner } from "@/lib/core-trade";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Invite someone to trade",
  robots: { index: false, follow: false },
};

export default async function InviteIndexPage() {
  const viewer = await requireViewer("/invite");
  const offers = await listCoreOffersForOwner(viewer.authUser.id);
  const published = offers.filter(
    (offer) => offer.workflow_status === "published" && offer.status === "open",
  );

  return (
    <div className="page-shell marketplace-app-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showSearch={false}
          showLogout
        />
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="invite-index-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Invitation-first trade</p>
            <h1 id="invite-index-heading">Invite someone who is not on Moral Trade yet.</h1>
            <p>
              Choose a published proposal. The recipient will see the full terms before sign-up and
              can accept, counter, or decline.
            </p>
            <Link className="button button-secondary" href="/trades/new">
              Create a proposal
            </Link>
          </div>
          <div className="data-grid">
            {published.length ? (
              published.map((offer) => (
                <article className="panel data-card" key={offer.id}>
                  <p className="detail-kicker">Published proposal</p>
                  <h2>
                    {offer.offered_cause} ↔ {offer.requested_cause}
                  </h2>
                  <p className="route-text">{offer.offer_action}</p>
                  <Link className="button button-primary" href={`/trades/${offer.id}/invite`}>
                    Invite someone
                  </Link>
                </article>
              ))
            ) : (
              <article className="panel data-card">
                <h2>No published proposal is ready to invite.</h2>
                <p className="route-text">
                  Create and submit a bounded proposal. Invitations become available after operator
                  review publishes it.
                </p>
                <Link className="button button-primary" href="/trades/new">
                  Create a trade
                </Link>
              </article>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
