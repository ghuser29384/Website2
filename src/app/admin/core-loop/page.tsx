import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { evaluateAdminOperatorAccess } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { getCoreLoopAnalytics } from "@/lib/core-trade";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Core-loop analytics",
  robots: { index: false, follow: false },
};

const FUNNEL_ORDER = [
  "signup_completed",
  "onboarding_completed",
  "offer_draft_saved",
  "offer_submitted",
  "offer_published",
  "invitation_sent",
  "response_sent",
  "counterproposal_sent",
  "agreement_confirmed_by_both",
  "evidence_submitted",
  "agreement_completed",
] as const;

function formatDate(value: string | null | undefined) {
  if (!value) return "Not yet";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : new Date(timestamp).toLocaleString();
}

export default async function CoreLoopAnalyticsPage() {
  const [viewer, security] = await Promise.all([
    requireViewer("/admin/core-loop"),
    loadBackgroundAccountSecuritySummary(),
  ]);
  const access = evaluateAdminOperatorAccess({
    email: viewer.authUser.email,
    mfaSummary: security,
  });
  const analytics = access.allowed ? await getCoreLoopAnalytics() : { summary: [], recent: [] };
  const summaryByType = new Map(
    analytics.summary.map((row: any) => [String(row.event_type), row]),
  );

  return (
    <div className="page-shell marketplace-app-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showSearch={false}
          showLogout
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="core-loop-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Canonical product funnel</p>
            <h1 id="core-loop-heading">Count persisted actions, not page views.</h1>
            <p>
              Each stage is written with a unique idempotency key. Performance metrics, repeated
              page views, email opens, and unfinished onboarding are intentionally excluded from
              this operational conversion view.
            </p>
          </div>

          {!access.allowed ? (
            <article className="panel data-card data-card-wide">
              <div className="status-banner status-banner-error">
                <strong>Operator access blocked</strong>
                <p>{access.message}</p>
              </div>
              <Link className="button button-primary" href="/dashboard">
                Open account security
              </Link>
            </article>
          ) : (
            <>
              <div className="data-grid">
                {FUNNEL_ORDER.map((eventType, index) => {
                  const row = summaryByType.get(eventType) as any;
                  return (
                    <article className="panel data-card" key={eventType}>
                      <p className="detail-kicker">Stage {index + 1}</p>
                      <h2>{eventType.replaceAll("_", " ")}</h2>
                      <dl className="detail-grid">
                        <div>
                          <dt>Unique users</dt>
                          <dd>{Number(row?.unique_users ?? 0)}</dd>
                        </div>
                        <div>
                          <dt>Events</dt>
                          <dd>{Number(row?.event_count ?? 0)}</dd>
                        </div>
                        <div>
                          <dt>First seen</dt>
                          <dd>{formatDate(row?.first_seen_at)}</dd>
                        </div>
                        <div>
                          <dt>Last seen</dt>
                          <dd>{formatDate(row?.last_seen_at)}</dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
              </div>

              <div className="section-head section-head-compact">
                <p className="eyebrow">Recent canonical events</p>
                <h2>Idempotent evidence of product completion.</h2>
              </div>
              <div className="commitment-list">
                {analytics.recent.length ? (
                  analytics.recent.map((event: any, index: number) => (
                    <article
                      className="commitment-row panel"
                      key={`${event.event_type}:${event.profile_id}:${event.entity_id}:${index}`}
                    >
                      <div className="commitment-row-main">
                        <span className="commitment-status commitment-status-active">
                          {String(event.event_type).replaceAll("_", " ")}
                        </span>
                        <div>
                          <h3>{event.entity_type || "profile"}</h3>
                          <p>
                            User {String(event.profile_id ?? "anonymous").slice(0, 8)}… · entity{" "}
                            {String(event.entity_id ?? "none").slice(0, 8)}…
                          </p>
                          <p className="route-text">{formatDate(String(event.created_at))}</p>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No canonical events recorded.</strong>
                      <p>The first signup, draft, invitation, agreement, or completion event will appear here.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <Link className="button button-primary" href="/admin/trade-review">
                  Open proposal review queue
                </Link>
                <Link className="button button-secondary" href="/admin">
                  Open full legacy admin
                </Link>
              </div>
            </>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
