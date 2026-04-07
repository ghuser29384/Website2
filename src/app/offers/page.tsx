import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getFormMessage } from "@/lib/form-state";
import { getViewer, listOpenOffers } from "@/lib/app-data";
import { formatMode } from "@/lib/offers";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Offers",
};

interface OffersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const resolvedSearchParams = await searchParams;
  const viewer = await getViewer();
  const offers = hasSupabaseEnv() ? await listOpenOffers() : [];
  const formMessage = getFormMessage(resolvedSearchParams);

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={[
            { href: "/", label: "Home" },
            { href: "/offers", label: "Offers" },
          ]}
          authLink={
            viewer
              ? { href: "/dashboard", label: "Dashboard" }
              : { href: "/login", label: "Log in" }
          }
          primaryAction={{
            href: viewer ? "/offers/new" : "/signup",
            label: viewer ? "Create offer" : "Sign up",
          }}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Live board</p>
            <h1>Browse open moral trade offers.</h1>
            <p className="hero-text">
              This is the shared offer directory backed by Supabase. It includes pledge
              swaps, donation offsets, and paid action offers without replacing the
              homepage prototype.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/offers/new" : "/signup"}>
                {viewer ? "Create an offer" : "Create an account"}
              </Link>
              <Link className="button button-secondary" href={viewer ? "/dashboard" : "/login"}>
                {viewer ? "Open dashboard" : "Log in"}
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">How this route differs from the homepage</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Stored offers</strong>
                  <p>These offers come from Postgres rather than browser-only local storage.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Account-backed actions</strong>
                  <p>Users can create any of the three trade types and express interest while signed in.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Dashboard continuity</strong>
                  <p>Your own offers and interests roll into the dashboard automatically.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Open offers</p>
            <h2>Shared listings</h2>
            <p>Each card links to a detail page where signed-in users can express interest.</p>
          </div>

          {!hasSupabaseEnv() ? (
            <div className="status-banner status-banner-error">
              Supabase is not configured yet. Add environment variables and apply the SQL
              schema before using live offers.
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

          <div className="data-grid">
            {offers.length ? (
              offers.map((offer) => (
                <article key={offer.id} className="panel data-card">
                  <p className="detail-kicker">{formatMode(offer.mode)}</p>
                  <h3>{offer.offered_cause} for {offer.requested_cause}</h3>
                  <p className="route-text">
                    <strong>{offer.owner_alias}</strong> offers: {offer.offer_action}
                  </p>
                  <p className="route-text">Requests: {offer.request_action}</p>
                  <div className="tag-row">
                    <span className="badge">{offer.offered_cause}</span>
                    <span className="badge badge-secondary">{offer.requested_cause}</span>
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
                  <strong>No live offers yet.</strong>
                  <p>Create the first offer once auth and the database are configured.</p>
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
