import type { Metadata } from "next";
import Link from "next/link";

import { toggleCartAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getFormMessage } from "@/lib/form-state";
import { listCartItems, requireViewer } from "@/lib/app-data";
import { formatMode } from "@/lib/offers";
import { getPrimaryNavLinks } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Cart",
};

interface CartPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CartPage({ searchParams }: CartPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const viewer = hasSupabaseEnv() ? await requireViewer("/cart") : null;
  const cartItems = viewer ? await listCartItems(viewer.authUser.id) : [];

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          authLink={
            viewer
              ? { href: "/dashboard", label: "Dashboard" }
              : { href: "/login", label: "Log in" }
          }
          primaryAction={{
            href: viewer ? "/offers" : "/signup",
            label: viewer ? "Browse offers" : "Sign up",
          }}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Shopping cart</p>
            <h1>Offers you are actively tracking.</h1>
            <p className="hero-text">
              The cart is a lightweight way to keep candidate offers in view. If an owner reduces
              the cost or commitment, the updated discount note appears here.
            </p>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">What belongs here</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Offers under consideration</strong>
                  <p>Use the cart for public commitments you may want to evaluate more carefully.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Visible discounts</strong>
                  <p>Offer owners can publish reduced burdens or costs, and those updates appear here.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Tracked offers</p>
            <h2>Your cart</h2>
            <p>
              These entries are private to you. Each one links back to the live offer dossier and
              carries any current discount note from the owner.
            </p>
          </div>

          <div className="cart-grid">
            {cartItems.length ? (
              cartItems.map((item) =>
                item.offer ? (
                  <article key={item.offer.id} className="panel cart-card">
                    <div className="profile-card-head">
                      <div>
                        <p className="detail-kicker">{formatMode(item.offer.mode)}</p>
                        <h3>{item.offer.offered_cause} for {item.offer.requested_cause}</h3>
                      </div>
                      <span className="badge">{item.offer.ownerProfile?.resolvedName ?? item.offer.owner_alias}</span>
                    </div>

                    <p className="route-text">{item.offer.offer_action}</p>
                    <p className="route-text">Requests in return: {item.offer.request_action}</p>

                    <div className="tag-row">
                      <span className="impact-pill">{item.offer.commentCount} comments</span>
                      <span className="impact-pill">{item.offer.recommendationCount} recommendations</span>
                    </div>

                    <div className="discount-banner">
                      <strong>Current discount</strong>
                      <p>{item.offer.discount_note || "No discount or reduced burden is currently listed."}</p>
                    </div>

                    <div className="offer-footer">
                      <div className="tag-row">
                        <span>Added {new Date(item.addedAt).toLocaleDateString()}</span>
                        <span>{item.offer.verification}</span>
                      </div>
                      <div className="offer-actions">
                        <Link className="text-button" href={`/offers/${item.offer.id}`}>
                          View offer
                        </Link>
                        <form action={toggleCartAction}>
                          <input name="offer_id" type="hidden" value={item.offer.id} />
                          <input name="return_to" type="hidden" value="/cart" />
                          <button className="button button-secondary button-mini" type="submit">
                            Remove
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
                  <strong>Your cart is empty.</strong>
                  <p>Add offers from the public directory when you want to track them closely.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
