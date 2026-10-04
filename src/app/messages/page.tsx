import type { Metadata } from "next";
import Link from "next/link";

import { markTradeNotificationReadAction } from "@/app/core-trade-actions";
import { MessagesInbox } from "@/components/messages/messages-inbox";
import styles from "@/components/messages/messages-inbox.module.css";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { MarketplaceBottomNav } from "@/components/marketplace/marketplace-components";
import { getViewer } from "@/lib/app-data";
import { listThreadsForUser, listTradeNotifications } from "@/lib/core-trade";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Messages",
  robots: { follow: false, index: false },
};

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabaseReady = hasSupabaseEnv();
  const [viewer, query] = await Promise.all([
    supabaseReady ? getViewer() : null,
    searchParams,
  ]);
  const view = query.view === "updates" ? "updates" : "conversations";
  const returnTo = view === "updates" ? "/messages?view=updates" : "/messages";
  const [threads, notifications] = viewer
    ? await Promise.all([
        listThreadsForUser(viewer.authUser.id),
        listTradeNotifications(viewer.authUser.id),
      ])
    : [[], []];

  return (
    <div className={`page-shell marketplace-app-shell ${styles.page}`}>
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showSearch={false}
          showLogout={Boolean(viewer)}
        />
      </header>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <header className={styles.heading}>
          <h1 id="messages-heading">Messages</h1>
          <p>Conversations and updates about your trades.</p>
        </header>
        {viewer ? (
          <MessagesInbox
            threads={threads}
            notifications={notifications}
            view={view}
            markReadAction={markTradeNotificationReadAction}
          />
        ) : (
          <section className={styles.empty} aria-labelledby="inbox-state-heading">
            <span className={styles.emptyIcon} aria-hidden="true">↔</span>
            <h2 id="inbox-state-heading">
              {supabaseReady ? "Your conversations, in one place" : "Messages unavailable"}
            </h2>
            <p>
              {supabaseReady
                ? "Sign in to view your private conversations and trade updates."
                : "We can’t load messages right now. You can still browse offers."}
            </p>
            <Link
              className={styles.primaryLink}
              href={supabaseReady ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/offers"}
            >
              {supabaseReady ? "Sign in" : "Browse offers"}
            </Link>
          </section>
        )}
      </main>
      <MarketplaceBottomNav active="messages" />
      <SiteFooter />
    </div>
  );
}
