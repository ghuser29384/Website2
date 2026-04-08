import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getDashboardData, requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { formatMode } from "@/lib/offers";
import { PRIMARY_NAV_LINKS } from "@/lib/site";
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
  let offers = [] as Awaited<ReturnType<typeof getDashboardData>>["offers"];
  let interests = [] as Awaited<ReturnType<typeof getDashboardData>>["interests"];
  let dashboardErrors: Awaited<ReturnType<typeof getDashboardData>>["errors"] = {
    offers: null,
    interests: null,
    relatedOffers: null,
  };
  let unexpectedDashboardError: string | null = null;

  if (viewer) {
    try {
      const dashboardData = await getDashboardData(viewer.authUser.id);
      offers = dashboardData.offers;
      interests = dashboardData.interests;
      dashboardErrors = dashboardData.errors;
    } catch (error) {
      unexpectedDashboardError = "The dashboard could not finish loading your account data.";
      console.error("[dashboard] Unexpected dashboard route failure", {
        error,
        userId: viewer.authUser.id,
      });
    }
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={PRIMARY_NAV_LINKS.map((link) => ({ ...link }))}
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
            <p className="eyebrow">Member record</p>
            <h1>Review your published commitments and responses.</h1>
            <p className="hero-text">
              {viewer ? (
                <>
                  Signed in as <strong>{viewer.displayName}</strong>. This dashboard shows your
                  own offers and the responses you lodged elsewhere, with the same emphasis on
                  explicit terms and traceable activity.
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
            <p className="eyebrow">What this record contains</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Offers you published</strong>
                  <p>Review the public commitments attached to your account and inspect each dossier.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Responses you sent</strong>
                  <p>Track where you expressed interest and revisit the reasoning you provided.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Future agreement layer</strong>
                  <p>The schema can later support agreement management without changing the public framing.</p>
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

        {viewer?.profileError ? (
          <div className="status-banner status-banner-error">
            We could not load your profile row from Supabase. The dashboard is using fallback
            account details for now, and the underlying error was logged on the server.
          </div>
        ) : null}

        {unexpectedDashboardError ? (
          <div className="status-banner status-banner-error">{unexpectedDashboardError}</div>
        ) : null}

        {dashboardErrors.relatedOffers ? (
          <div className="status-banner status-banner-error">
            Some linked offer details could not be loaded for your interest history. The
            underlying Supabase error was logged on the server.
          </div>
        ) : null}

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Your offers</p>
            <h2>Published commitments</h2>
            <p>These offers are stored in Supabase and visible in the public directory.</p>
          </div>

          <div className="data-grid">
            {dashboardErrors.offers ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load your offers right now.</strong>
                  <p>The dashboard stayed available, and the detailed Supabase error was logged on the server.</p>
                </div>
              </div>
            ) : offers.length ? (
              offers.map((offer) => (
                <article key={offer.id} className="panel data-card">
                  <p className="detail-kicker">{formatMode(offer.mode)}</p>
                  <h3>{offer.offered_cause} for {offer.requested_cause}</h3>
                  <p className="route-text">{offer.offer_action}</p>
                  <p className="route-text">Requests in return: {offer.request_action}</p>
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
                  <strong>You have not published any commitments yet.</strong>
                  <p>Create your first offer to see it here.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-cream">
          <div className="section-head">
            <p className="eyebrow">Your interests</p>
            <h2>Responses you lodged</h2>
            <p>Each response is tied to a live offer and stored under your account.</p>
          </div>

          <div className="data-grid">
            {dashboardErrors.interests ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load your interests right now.</strong>
                  <p>The dashboard stayed available, and the detailed Supabase error was logged on the server.</p>
                </div>
              </div>
            ) : interests.length ? (
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
                  <strong>You have not responded to any offers yet.</strong>
                  <p>Browse the public directory and register interest in an offer.</p>
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
