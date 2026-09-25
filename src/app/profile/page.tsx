import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  MarketplaceBottomNav,
  MarketplaceRouteShell,
} from "@/components/marketplace/marketplace-components";
import { ProfilePrioritiesCard } from "@/components/profile/profile-priorities-card";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Profile",
  robots: {
    follow: false,
    index: false,
  },
};

interface ProfilePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const formMessage = getFormMessage(await searchParams);
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await getViewer() : null;

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
        <MarketplaceRouteShell active="profile">
          <section className="v72-private-surface mt-v75-route-card" aria-labelledby="profile-heading">
            <div className="v72-account-header">
              <p className="detail-kicker">Private profile</p>
              <h1 id="profile-heading">Your profile</h1>
              <p>Manage your account and the priorities used to personalize your feed.</p>
            </div>

            {formMessage ? (
              <div
                className={`status-banner ${formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"}`}
                role={formMessage.tone === "error" ? "alert" : "status"}
              >
                {formMessage.text}
              </div>
            ) : null}

            <ProfilePrioritiesCard returnTo="/profile" />

            <article className="commitment-row panel">
              <div className="commitment-row-main">
                <span className="commitment-status commitment-status-under_review">
                  {viewer ? "History limited" : "Not connected"}
                </span>
                <div>
                  <h3>Your role readiness</h3>
                  <p>
                    {viewer
                      ? "No public score, perks, followers, or moral rank. Backed requirements appear here only when a source owner supplies them."
                      : "Sign in is required before private role readiness can be loaded."}
                  </p>
                </div>
              </div>
              <dl className="deal-economics-grid">
                <div>
                  <dt>Identity/auth</dt>
                  <dd>{viewer ? "Signed in" : supabaseReady ? "Sign in required" : "Not connected"}</dd>
                </div>
                <div>
                  <dt>Creator requirements</dt>
                  <dd>Review when creating</dd>
                </div>
                <div>
                  <dt>Reviewer credential</dt>
                  <dd>Trust data unavailable</dd>
                </div>
                <div>
                  <dt>Public score</dt>
                  <dd>Not used</dd>
                </div>
              </dl>
              <div className="offer-actions">
                <Link className="button button-primary button-mini" href={viewer ? "/dashboard" : "/login?returnTo=/profile"}>
                  {viewer ? "View settings" : "Sign in to continue"}
                </Link>
                <Link className="button button-secondary button-mini" href="/offers" prefetch={false}>
                  Back to offers
                </Link>
              </div>
            </article>
          </section>
        </MarketplaceRouteShell>
      </main>

      <MarketplaceBottomNav active="profile" />
      <SiteFooter />
    </div>
  );
}
