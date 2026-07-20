import type { Metadata } from "next";
import Link from "next/link";

import { markTradeNotificationReadAction } from "@/app/core-trade-actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import {
  MarketplaceBottomNav,
  MarketplaceRouteShell,
} from "@/components/marketplace/marketplace-components";
import { getViewer } from "@/lib/app-data";
import { listThreadsForUser, listTradeNotifications } from "@/lib/core-trade";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Messages",
  robots: {
    follow: false,
    index: false,
  },
};

function formatDate(value: string) {
  return <LocalDateTime value={value} fallback={value} />;
}

export default async function MessagesPage() {
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await getViewer() : null;
  const [threads, notifications] = viewer
    ? await Promise.all([
        listThreadsForUser(viewer.authUser.id),
        listTradeNotifications(viewer.authUser.id),
      ])
    : [[], []];

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
              <p>Private counterparty threads and lifecycle notifications backed by database records.</p>
            </div>

            {viewer ? (
              <>
                <div className="section-head section-head-compact">
                  <p className="eyebrow">Private threads</p>
                  <h2>{threads.length} conversation{threads.length === 1 ? "" : "s"}</h2>
                  <p>
                    Messages, counterproposals, status changes, and agreement links remain visible
                    only to the two participants and authorized operators.
                  </p>
                </div>

                <div className="commitment-list">
                  {threads.length ? (
                    threads.map((thread) => (
                      <article className="commitment-row panel" key={thread.id}>
                        <div className="commitment-row-main">
                          <span
                            className={`commitment-status ${
                              thread.unreadCount ? "commitment-status-active" : ""
                            }`}
                          >
                            {thread.unreadCount ? `${thread.unreadCount} unread` : thread.status}
                          </span>
                          <div>
                            <h3>{thread.offerTitle}</h3>
                            <p>
                              With {thread.counterpart?.display_name ?? "counterparty"} · {thread.lastMessage}
                            </p>
                            <p className="route-text">{formatDate(thread.lastMessageAt)}</p>
                          </div>
                        </div>
                        <div className="offer-actions">
                          <Link className="button button-primary button-mini" href={`/messages/${thread.id}`}>
                            Open thread
                          </Link>
                          {thread.agreementId ? (
                            <Link
                              className="button button-secondary button-mini"
                              href={`/trade-agreements/${thread.agreementId}`}
                            >
                              Open agreement
                            </Link>
                          ) : null}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state marketplace-empty-state">
                      <div>
                        <strong>No private threads yet.</strong>
                        <p>
                          Publish a proposal and send a direct invitation, or respond to an invitation
                          you received.
                        </p>
                        <Link className="button button-primary" href="/trades/new">
                          Create a proposal
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <div className="section-head section-head-compact">
                  <p className="eyebrow">Lifecycle notifications</p>
                  <h2>Actions that require attention</h2>
                </div>
                <div className="data-grid">
                  {notifications.length ? (
                    notifications.map((notification: any) => (
                      <article className="panel data-card" key={notification.id}>
                        <p className="detail-kicker">
                          {String(notification.notification_type).replaceAll("_", " ")}
                        </p>
                        <h3>{notification.title}</h3>
                        <p className="route-text">{notification.body}</p>
                        <div className="tag-row">
                          <span className="source-pill">{formatDate(String(notification.created_at))}</span>
                          <span className="source-pill">
                            {notification.read_at ? "Read" : "Unread"}
                          </span>
                        </div>
                        <div className="offer-actions">
                          <Link className="button button-primary button-mini" href={notification.href}>
                            Review action
                          </Link>
                          {!notification.read_at ? (
                            <form action={markTradeNotificationReadAction}>
                              <input name="notification_id" type="hidden" value={notification.id} />
                              <input name="return_to" type="hidden" value="/messages" />
                              <button className="button button-secondary button-mini" type="submit">
                                Mark read
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state">
                      <div>
                        <strong>No lifecycle notifications.</strong>
                        <p>Direct links for invitations, responses, confirmations, evidence, and exits appear here.</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state marketplace-empty-state">
                <div>
                  <strong>{supabaseReady ? "Sign in required." : "Messages unavailable."}</strong>
                  <p>
                    {supabaseReady
                      ? "Sign in to view private counterparty threads and lifecycle notifications."
                      : "Supabase is not configured in this environment, so no backed inbox rows can be loaded."}
                  </p>
                  <Link
                    className="button button-primary"
                    href={supabaseReady ? "/login?returnTo=/messages" : "/offers"}
                  >
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
