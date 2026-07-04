import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  MarketplaceBottomNav,
  MarketplaceRouteShell,
} from "@/components/marketplace/marketplace-components";
import { getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Messages",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function MessagesPage() {
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
        <MarketplaceRouteShell active="messages">
          <section className="v72-private-surface mt-v75-route-card" aria-labelledby="messages-heading">
            <div className="v72-owner-strip">
              <h1 id="messages-heading">Messages</h1>
              <p>Lifecycle updates only. No public comment thread or counterparty chat is created here.</p>
            </div>

            {viewer ? (
              <div className="commitment-list">
                <article className="commitment-row panel">
                <div className="commitment-row-main">
                  <span className="commitment-status commitment-status-active">System</span>
                  <div>
                    <h3>No backed inbox rows yet</h3>
                    <p>
                      Commitment, review, support, and evidence updates remain owned by their
                      source routes until a backed inbox adapter is connected.
                    </p>
                  </div>
                </div>
                <div className="offer-actions">
                  <Link className="button button-primary button-mini" href="/commitments">
                    View track rows
                  </Link>
                  <Link className="button button-secondary button-mini" href="/saved-offers">
                    View planner
                  </Link>
                </div>
                </article>
              </div>
            ) : (
              <div className="empty-state marketplace-empty-state">
                <div>
                  <strong>{supabaseReady ? "Sign in required." : "Messages unavailable."}</strong>
                  <p>
                    {supabaseReady
                      ? "Sign in to view lifecycle updates. After sign-in, current terms must be reviewed before continuing."
                      : "Supabase is not configured in this environment, so no backed inbox rows can be loaded."}
                  </p>
                  <Link className="button button-primary" href={supabaseReady ? "/login?returnTo=/messages" : "/offers"}>
                    {supabaseReady ? "Sign in to continue" : "Browse offers"}
                  </Link>
                </div>
              </div>
            )}
          </section>
        </MarketplaceRouteShell>
      </main>

      <MarketplaceBottomNav active="messages" />
      <SiteFooter />
    </div>
  );
}
