import type { Metadata } from "next";
import Link from "next/link";

import { rateAgreementAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getDashboardData, requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { formatMode } from "@/lib/offers";
import { getPrimaryNavLinks } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Dashboard",
};

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await requireViewer("/dashboard") : null;
  const dashboardData = viewer ? await getDashboardData(viewer.authUser.id) : null;

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
          primaryAction={{ href: "/offers/new", label: "Create offer" }}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Member dashboard</p>
            <h1>Review your public record and active commitments.</h1>
            <p className="hero-text">
              {viewer ? (
                <>
                  Signed in as <strong>{viewer.displayName}</strong>. This dashboard ties together
                  your public profile, offers, interests, agreements, ratings, and cart items.
                </>
              ) : (
                <>Configure Supabase to enable the live dashboard and authenticated activity.</>
              )}
            </p>
            {viewer ? (
              <div className="hero-actions">
                <Link className="button button-primary" href={`/people/${viewer.authUser.id}`}>
                  View public profile
                </Link>
                <Link className="button button-secondary" href="/cart">
                  Open cart
                </Link>
              </div>
            ) : null}
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Account summary</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Public profile</strong>
                  <p>
                    {[viewer?.profile.city, viewer?.profile.region].filter(Boolean).join(", ") ||
                      "Location not yet listed"}
                  </p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Offers and interest</strong>
                  <p>
                    {dashboardData?.offers.length ?? 0} offer(s) | {dashboardData?.interests.length ?? 0} interest response(s)
                  </p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Agreements and cart</strong>
                  <p>
                    {dashboardData?.agreements.length ?? 0} agreement(s) | {dashboardData?.cartItems.length ?? 0} cart item(s)
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        {!supabaseReady ? (
          <div className="status-banner status-banner-error">
            Supabase is not configured yet. Add environment variables and apply the SQL schema
            before using the live dashboard.
          </div>
        ) : null}

        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        {dashboardData?.errors.relatedOffers ? (
          <div className="status-banner status-banner-error">
            Some linked offer details could not be loaded. The underlying Supabase error was
            logged on the server.
          </div>
        ) : null}

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Your offers</p>
            <h2>Published commitments</h2>
            <p>These offers are tied to your public profile and can be rated once agreements complete.</p>
          </div>

          <div className="data-grid">
            {dashboardData?.errors.offers ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load your offers right now.</strong>
                  <p>The dashboard stayed available, and the detailed Supabase error was logged on the server.</p>
                </div>
              </div>
            ) : dashboardData?.offers.length ? (
              dashboardData.offers.map((offer) => (
                <article key={offer.id} className="panel data-card">
                  <p className="detail-kicker">{formatMode(offer.mode)}</p>
                  <h3>{offer.offered_cause} for {offer.requested_cause}</h3>
                  <p className="route-text">{offer.offer_action}</p>
                  <div className="tag-row">
                    <span className="badge">{offer.status}</span>
                    <span className="impact-pill">{offer.commentCount} comments</span>
                    <span className="impact-pill">{offer.recommendationCount} recommendations</span>
                  </div>
                  <div className="offer-footer">
                    <div className="tag-row">
                      <span>{offer.verification}</span>
                      <span>{offer.duration}</span>
                    </div>
                    <div className="offer-actions">
                      <Link className="text-button" href={`/offers/${offer.id}`}>
                        View offer
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>You have not published any commitments yet.</strong>
                  <p>Create your first offer to see it here.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Your interests</p>
            <h2>Responses you lodged</h2>
            <p>Each response remains tied to a live offer and a public counterparty record.</p>
          </div>

          <div className="data-grid">
            {dashboardData?.errors.interests ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load your interests right now.</strong>
                  <p>The dashboard stayed available, and the detailed Supabase error was logged on the server.</p>
                </div>
              </div>
            ) : dashboardData?.interests.length ? (
              dashboardData.interests.map((interest) => (
                <article key={interest.id} className="panel data-card">
                  <p className="detail-kicker">Interest</p>
                  <h3>
                    {interest.offer
                      ? `${interest.offer.offered_cause} for ${interest.offer.requested_cause}`
                      : "Offer unavailable"}
                  </h3>
                  <p className="route-text">{interest.message || "No message attached."}</p>
                  <div className="tag-row">
                    <span className="badge">{interest.status}</span>
                    {interest.offer?.ownerProfile ? (
                      <Link
                        className="source-pill"
                        href={`/people/${interest.offer.ownerProfile.id}`}
                      >
                        {interest.offer.ownerProfile.resolvedName}
                      </Link>
                    ) : null}
                  </div>
                  <div className="offer-footer">
                    <div className="tag-row">
                      <span>{new Date(interest.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="offer-actions">
                      {interest.offer ? (
                        <Link className="text-button" href={`/offers/${interest.offer.id}`}>
                          View offer
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>You have not responded to any offers yet.</strong>
                  <p>Browse the public directory and register interest in an offer.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Transactions</p>
            <h2>Agreements and ratings</h2>
            <p>Each completed transaction can be rated from 1 to 10 by each party.</p>
          </div>

          <div className="data-grid">
            {dashboardData?.errors.agreements ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load your agreements right now.</strong>
                  <p>The dashboard stayed available, and the detailed Supabase error was logged on the server.</p>
                </div>
              </div>
            ) : dashboardData?.agreements.length ? (
              dashboardData.agreements.map((agreement) => (
                <article key={agreement.id} className="panel data-card">
                  <p className="detail-kicker">Agreement</p>
                  <h3>
                    {agreement.counterparty ? (
                      <Link className="inline-link" href={`/people/${agreement.counterparty.id}`}>
                        {agreement.counterparty.resolvedName}
                      </Link>
                    ) : (
                      "Counterparty"
                    )}
                  </h3>
                  <p className="route-text">
                    {agreement.offer
                      ? `${agreement.offer.offered_cause} for ${agreement.offer.requested_cause}`
                      : "Offer reference unavailable"}
                  </p>
                  <div className="tag-row">
                    <span className="badge">{agreement.status}</span>
                    {agreement.viewerRating ? (
                      <span className="impact-pill">Your rating: {agreement.viewerRating.score}/10</span>
                    ) : null}
                  </div>
                  {agreement.notes ? <p className="route-text">{agreement.notes}</p> : null}
                  {agreement.counterparty ? (
                    <form action={rateAgreementAction} className="stack-form compact-form">
                      <input name="agreement_id" type="hidden" value={agreement.id} />
                      <input name="rated_user_id" type="hidden" value={agreement.counterparty.id} />
                      <input name="return_to" type="hidden" value="/dashboard" />
                      <label className="field">
                        <span>Rate this transaction (1-10)</span>
                        <input
                          defaultValue={agreement.viewerRating?.score ?? 8}
                          max={10}
                          min={1}
                          name="score"
                          type="number"
                        />
                      </label>
                      <div className="form-actions">
                        <button className="button button-secondary button-mini" type="submit">
                          {agreement.viewerRating ? "Update rating" : "Submit rating"}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No agreements yet.</strong>
                  <p>Agreements appear here once one of your offers accepts an interest response.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Cart</p>
            <h2>Offers you are tracking</h2>
            <p>Discounts or reduced burdens published by offer owners will appear here and on the cart page.</p>
          </div>

          <div className="data-grid">
            {dashboardData?.errors.cartItems ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load your cart right now.</strong>
                  <p>The dashboard stayed available, and the detailed Supabase error was logged on the server.</p>
                </div>
              </div>
            ) : dashboardData?.cartItems.length ? (
              dashboardData.cartItems.map((item) =>
                item.offer ? (
                  <article key={item.offer.id} className="panel data-card">
                    <p className="detail-kicker">{formatMode(item.offer.mode)}</p>
                    <h3>{item.offer.offered_cause} for {item.offer.requested_cause}</h3>
                    <p className="route-text">
                      {item.offer.discount_note || "No discount is currently listed for this offer."}
                    </p>
                    <div className="tag-row">
                      <span className="source-pill">
                        {item.offer.ownerProfile?.resolvedName ?? item.offer.owner_alias}
                      </span>
                      <span className="impact-pill">
                        Added {new Date(item.addedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="offer-footer">
                      <div className="offer-actions">
                        <Link className="text-button" href={`/offers/${item.offer.id}`}>
                          View offer
                        </Link>
                        <Link className="text-button" href="/cart">
                          Open cart
                        </Link>
                      </div>
                    </div>
                  </article>
                ) : null,
              )
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No cart items yet.</strong>
                  <p>Add an offer to your cart when you want to track it closely.</p>
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
