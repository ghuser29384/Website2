import type { Metadata } from "next";
import Link from "next/link";

import { toggleCartAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import {
  MarketplaceBottomNav,
  MarketplaceRouteShell,
} from "@/components/marketplace/marketplace-components";
import { getFormMessage } from "@/lib/form-state";
import { getViewer, listCartItems } from "@/lib/app-data";
import { formatMode, formatPaymentCadence } from "@/lib/offers";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Saved offers",
  robots: {
    index: false,
    follow: false,
  },
};

interface SavedOffersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SavedOffersPage({ searchParams }: SavedOffersPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const viewer = hasSupabaseEnv() ? await getViewer() : null;
  const cartItems = viewer ? await listCartItems(viewer.authUser.id) : [];

  return (
    <div className="page-shell marketplace-app-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showSearch={false}
          showLogout={Boolean(viewer)}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        <MarketplaceRouteShell active="plan">
          <section className="v72-private-surface mt-v75-route-card" aria-labelledby="plan-heading">
            <div className="v72-owner-strip">
              <h1 id="plan-heading">Planner</h1>
              <p>Plan — private selected items. No commitment created.</p>
            </div>

            <div className="cart-grid">
              {cartItems.length ? (
                cartItems.map((item) =>
                  item.offer ? (
                    <article key={item.offer.id} className="panel cart-card">
                    <div className="profile-card-head">
                      <div>
                        <p className="detail-kicker">Planner · {formatMode(item.offer.mode)}</p>
                        <h3>{item.offer.offered_cause} for {item.offer.requested_cause}</h3>
                      </div>
                      <span className="badge">Preview</span>
                    </div>

                    <p className="route-text">
                      Preview only · Private planning only · No commitment created.
                    </p>

                    <div className="offer-footer">
                      <div className="tag-row">
                        <span>
                          Added <LocalDateTime value={item.addedAt} fallback="Date unavailable" dateOnly />
                        </span>
                        <span>{item.offer.verification}</span>
                        <span>{item.offer.duration}</span>
                        {item.offer.mode === "payment" ? (
                          <span>{formatPaymentCadence(item.offer)}</span>
                        ) : null}
                      </div>
                      <div className="offer-actions">
                        <Link className="text-button" href={`/offers/${item.offer.id}`}>
                          View details
                        </Link>
                        <form action={toggleCartAction}>
                          <input name="offer_id" type="hidden" value={item.offer.id} />
                          <input name="return_to" type="hidden" value="/saved-offers" />
                          <button className="button button-secondary button-mini" type="submit">
                            Remove saved offer
                          </button>
                        </form>
                      </div>
                    </div>
                    </article>
                  ) : null,
                )
              ) : (
                <div className="empty-state">
                  <div>
                    <strong>{viewer ? "You have no saved offers yet." : "Sign in to view your planner."}</strong>
                    <p>
                      {viewer
                        ? "Browse examples, templates, and pledge-funding previews. Nothing here creates a commitment. Pledge-funding contribution rows are not connected yet."
                        : "Saved offers are private. This preview shell does not create demo planner rows, commitments, or pledge-funding contribution state."}
                    </p>
                    <Link className="button button-primary" href={viewer ? "/offers" : "/login?returnTo=/saved-offers"}>
                      {viewer ? "Browse offers" : "Sign in to continue"}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>
        </MarketplaceRouteShell>
      </main>

      <MarketplaceBottomNav active="plan" />
      <SiteFooter />
    </div>
  );
}
