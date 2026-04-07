import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getDashboardData, requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { formatMode } from "@/lib/offers";
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
  const { offers, interests } = viewer
    ? await getDashboardData(viewer.authUser.id)
    : { offers: [], interests: [] };

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={[
            { href: "/", label: "Home" },
            { href: "/offers", label: "Offers" },
            { href: "/offers/new", label: "New offer" },
          ]}
          primaryAction={{ href: "/offers/new", label: "Create offer" }}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Member dashboard</p>
            <h1>Manage your offers and interests.</h1>
            <p className="hero-text">
              {viewer ? (
                <>
                  Signed in as <strong>{viewer.displayName}</strong>. This dashboard shows your
                  own live offers and the interest you expressed in other offers across all
                  three trade types.
                </>
              ) : (
                <>Configure Supabase to enable the live dashboard and authenticated data.</>
              )}
            </p>
            {viewer ? (
              <div className="hero-actions">
                <Link className="button button-primary" href="/offers/new">
                  Create another offer
                </Link>
                <form action={signOutAction}>
                  <button className="button button-secondary" type="submit">
                    Sign out
                  </button>
                </form>
              </div>
            ) : null}
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Dashboard scope</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Your offers</strong>
                  <p>See every offer you published and jump to its public detail page.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Your interests</strong>
                  <p>Track which offers you expressed interest in and review the messages you sent.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Future agreements</strong>
                  <p>The data model is ready for a later agreement-management workflow.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        {!supabaseReady ? (
          <div className="status-banner status-banner-error">
            Supabase is not configured yet. Add environment variables and apply the SQL
            schema before using the live dashboard.
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

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Your offers</p>
            <h2>Published by you</h2>
            <p>These offers are stored in Supabase and visible on the live board.</p>
          </div>

          <div className="data-grid">
            {offers.length ? (
              offers.map((offer) => (
                <article key={offer.id} className="panel data-card">
                  <p className="detail-kicker">{formatMode(offer.mode)}</p>
                  <h3>{offer.offered_cause} for {offer.requested_cause}</h3>
                  <p className="route-text">{offer.offer_action}</p>
                  <p className="route-text">Requests: {offer.request_action}</p>
                  <div className="tag-row">
                    <span className="badge">{offer.status}</span>
                    <span className="impact-pill">{offer.offer_impact}/10 offered</span>
                    <span className="impact-pill">{offer.min_counterparty_impact}+/10 needed</span>
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
                  <strong>You have not published any offers yet.</strong>
                  <p>Create your first offer to see it here.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-cream">
          <div className="section-head">
            <p className="eyebrow">Your interests</p>
            <h2>Offers you engaged with</h2>
            <p>Each interest is tied to a live offer and stored under your account.</p>
          </div>

          <div className="data-grid">
            {interests.length ? (
              interests.map((interest) => (
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
                    {interest.offer ? <span className="source-pill">{interest.offer.owner_alias}</span> : null}
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
                  <strong>You have not expressed interest yet.</strong>
                  <p>Browse the live board and register interest in an offer.</p>
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
