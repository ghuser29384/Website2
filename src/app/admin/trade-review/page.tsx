import type { Metadata } from "next";
import Link from "next/link";

import {
  resolveTradeReportAction,
  reviewCoreOfferAction,
} from "@/app/core-trade-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { evaluateAdminOperatorAccess } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { listTradeReviewQueue } from "@/lib/core-trade";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Core trade review",
  robots: { index: false, follow: false },
};

interface TradeReviewPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : new Date(timestamp).toLocaleString();
}

export default async function TradeReviewPage({ searchParams }: TradeReviewPageProps) {
  const [viewer, resolvedSearchParams, security] = await Promise.all([
    requireViewer("/admin/trade-review"),
    searchParams,
    loadBackgroundAccountSecuritySummary(),
  ]);
  const access = evaluateAdminOperatorAccess({
    email: viewer.authUser.email,
    mfaSummary: security,
  });
  const formMessage = getFormMessage(resolvedSearchParams);
  const queue = access.allowed ? await listTradeReviewQueue() : { offers: [], reports: [] };

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
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="section section-white" aria-labelledby="trade-review-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Minimal operator queue</p>
            <h1 id="trade-review-heading">Review what can block the core trade loop.</h1>
            <p>
              New submissions, requested changes, rejections, paused records, duplicate signals,
              and private safety reports are handled here. Advanced mechanism queues remain outside
              this sprint surface.
            </p>
          </div>

          {!access.allowed ? (
            <article className="panel data-card data-card-wide">
              <div className="status-banner status-banner-error">
                <strong>Operator access blocked</strong>
                <p>{access.message}</p>
              </div>
              <div className="form-actions">
                <Link className="button button-primary" href="/dashboard">
                  Open account security
                </Link>
                <Link className="button button-secondary" href="/admin">
                  Back to admin
                </Link>
              </div>
            </article>
          ) : (
            <>
              <div className="pilot-metric-grid">
                <article className="panel data-card">
                  <p className="detail-kicker">Proposal queue</p>
                  <h2>{queue.offers.length}</h2>
                  <p className="route-text">Records needing publication or revision decisions.</p>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Safety reports</p>
                  <h2>{queue.reports.length}</h2>
                  <p className="route-text">Private thread reports awaiting operator handling.</p>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Admin gate</p>
                  <h2>Verified</h2>
                  <p className="route-text">Allowed email with active authenticator MFA.</p>
                </article>
              </div>

              <div className="section-head section-head-compact">
                <p className="eyebrow">Proposal review</p>
                <h2>Approve, request changes, reject, pause, or close.</h2>
                <p>
                  Every non-approval decision requires a participant-visible reason. Approval changes
                  the offer from private review state to a live public proposal.
                </p>
              </div>

              <div className="data-grid">
                {queue.offers.length ? (
                  queue.offers.map(({ offer, owner }) => (
                    <article className="panel data-card data-card-wide" key={offer.id}>
                      <div className="profile-card-head">
                        <div>
                          <p className="detail-kicker">{offer.workflow_status.replaceAll("_", " ")}</p>
                          <h3>
                            {offer.offered_cause} ↔ {offer.requested_cause}
                          </h3>
                        </div>
                        <span className="badge">v{offer.terms_version}</span>
                      </div>
                      <p className="route-text">
                        By {owner?.display_name ?? offer.owner_alias} · submitted {formatDate(offer.submitted_at)}
                      </p>
                      <dl className="detail-grid">
                        <div>
                          <dt>Offer-maker action</dt>
                          <dd>{offer.offer_action}</dd>
                        </div>
                        <div>
                          <dt>Counterparty action</dt>
                          <dd>{offer.request_action}</dd>
                        </div>
                        <div>
                          <dt>No-trade baseline</dt>
                          <dd>{offer.no_trade_baseline}</dd>
                        </div>
                        <div>
                          <dt>Maximum burden</dt>
                          <dd>{offer.maximum_burden}</dd>
                        </div>
                        <div>
                          <dt>Evidence</dt>
                          <dd>{offer.verification}</dd>
                        </div>
                        <div>
                          <dt>Exit</dt>
                          <dd>{offer.exit_conditions}</dd>
                        </div>
                      </dl>
                      {offer.moderation_reason ? (
                        <div className="status-banner status-banner-error">
                          <strong>Current participant-visible reason</strong>
                          <p>{offer.moderation_reason}</p>
                        </div>
                      ) : null}

                      <form action={reviewCoreOfferAction} className="stack-form">
                        <input name="offer_id" type="hidden" value={offer.id} />
                        <input name="return_to" type="hidden" value="/admin/trade-review" />
                        <label className="field">
                          <span>Specific reason or required revision</span>
                          <textarea
                            name="reason"
                            placeholder="Required for changes requested, rejection, pause, or closure"
                            rows={3}
                          />
                        </label>
                        <div className="form-actions">
                          <PendingSubmitButton
                            className="button button-primary button-mini"
                            name="decision"
                            pendingLabel="Publishing..."
                            value="approve"
                          >
                            Approve and publish
                          </PendingSubmitButton>
                          <PendingSubmitButton
                            className="button button-secondary button-mini"
                            name="decision"
                            pendingLabel="Requesting changes..."
                            value="changes_requested"
                          >
                            Request changes
                          </PendingSubmitButton>
                          <PendingSubmitButton
                            className="button button-secondary button-mini"
                            name="decision"
                            pendingLabel="Rejecting..."
                            value="reject"
                          >
                            Reject
                          </PendingSubmitButton>
                          <PendingSubmitButton
                            className="button button-secondary button-mini"
                            name="decision"
                            pendingLabel="Pausing..."
                            value="pause"
                          >
                            Pause
                          </PendingSubmitButton>
                          <PendingSubmitButton
                            className="button button-secondary button-mini"
                            name="decision"
                            pendingLabel="Closing..."
                            value="close"
                          >
                            Close
                          </PendingSubmitButton>
                        </div>
                      </form>

                      <div className="offer-actions">
                        <Link className="text-button" href={`/trades/${offer.id}/manage`}>
                          Open participant lifecycle view
                        </Link>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No proposals require review.</strong>
                      <p>New submissions and revision requests will appear here.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="section-head section-head-compact">
                <p className="eyebrow">Private safety reports</p>
                <h2>Review without exposing the thread publicly.</h2>
              </div>

              <div className="data-grid">
                {queue.reports.length ? (
                  queue.reports.map((report: any) => (
                    <article className="panel data-card" key={report.id}>
                      <p className="detail-kicker">{String(report.status).replaceAll("_", " ")}</p>
                      <h3>Thread report</h3>
                      <p className="route-text">{report.reason}</p>
                      <div className="tag-row">
                        <span className="source-pill">{formatDate(String(report.created_at))}</span>
                      </div>
                      <div className="form-actions">
                        <Link className="button button-primary button-mini" href={`/messages/${report.thread_id}`}>
                          Open private thread
                        </Link>
                        <form action={resolveTradeReportAction}>
                          <input name="report_id" type="hidden" value={report.id} />
                          <button
                            className="button button-secondary button-mini"
                            name="decision"
                            type="submit"
                            value="reviewing"
                          >
                            Mark reviewing
                          </button>
                        </form>
                        <form action={resolveTradeReportAction}>
                          <input name="report_id" type="hidden" value={report.id} />
                          <button
                            className="button button-secondary button-mini"
                            name="decision"
                            type="submit"
                            value="resolved"
                          >
                            Resolve
                          </button>
                        </form>
                        <form action={resolveTradeReportAction}>
                          <input name="report_id" type="hidden" value={report.id} />
                          <button
                            className="button button-secondary button-mini"
                            name="decision"
                            type="submit"
                            value="dismissed"
                          >
                            Dismiss
                          </button>
                        </form>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No open safety reports.</strong>
                      <p>Participant reports from private threads appear here.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <Link className="button button-secondary" href="/admin/core-loop">
                  Open core-loop analytics
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
