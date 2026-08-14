import type { Metadata } from "next";
import Link from "next/link";

import {
  resolveTradeReportAction,
  reviewCoreOfferAction,
} from "@/app/core-trade-actions";
import {
  adminAssignTradePaymentAppealReviewerAction,
  adminAssignTradePaymentReviewerAction,
  adminAssignTradeAppealReviewerAction,
  adminAssignTradeMilestoneReviewerAction,
} from "@/app/trade-milestone-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { FullNavigationActionForm } from "@/components/core-trade/full-navigation-action-form";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import {
  listTradeReviewQueue,
  listTradeReviewerCandidates,
  type CoreOffer,
  type CoreProfile,
} from "@/lib/core-trade";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Core trade review",
  robots: { index: false, follow: false },
};

interface TradeReviewPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type ReviewQueueOffer = {
  offer: CoreOffer;
  owner: CoreProfile | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return <LocalDateTime value={value} fallback={value} />;
}

function currentReviewDeadlines() {
  const now = new Date();
  return {
    fallbackCutoff: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    now: now.toISOString(),
  };
}

export default async function TradeReviewPage({ searchParams }: TradeReviewPageProps) {
  const [viewer, resolvedSearchParams, security] = await Promise.all([
    requireViewer("/admin/trade-review"),
    searchParams,
    loadBackgroundAccountSecuritySummary(),
  ]);
  const supabase = await createClient();
  const { data: administratorGrant } = await (supabase as any)
    .from("trade_review_role_grants")
    .select("profile_id")
    .eq("profile_id", viewer.authUser.id)
    .eq("role", "administrator")
    .eq("active", true)
    .is("revoked_at", null)
    .maybeSingle();
  const hasAdministratorRole = Boolean(administratorGrant?.profile_id);
  const access = {
    allowed:
      hasAdministratorRole &&
      security?.verifiedTotpCount >= 1 &&
      security.currentLevel === "aal2",
    message: !hasAdministratorRole
      ? "This profile does not have an active Moral Trade administrator grant."
      : security?.verifiedTotpCount < 1
        ? "Enroll a verified authenticator factor before using administrator assignment."
        : security.currentLevel !== "aal2"
          ? "Verify the authenticator for this session before using administrator assignment."
          : "Profile-bound administrator access verified at AAL2.",
  };
  const formMessage = getFormMessage(resolvedSearchParams);
  const deadlines = currentReviewDeadlines();
  const [
    queue,
    reviewerCandidates,
    milestoneFallbacksResult,
    appealFallbacksResult,
    paymentFallbacksResult,
    paymentAppealFallbacksResult,
  ] =
    access.allowed
      ? await Promise.all([
          listTradeReviewQueue(),
          listTradeReviewerCandidates(),
          (supabase as any)
            .from("trade_agreement_milestones")
            .select("id,action_category,status,reviewer_selection_opened_at")
            .is("assigned_reviewer_id", null)
            .lte("reviewer_selection_opened_at", deadlines.fallbackCutoff)
            .order("reviewer_selection_opened_at", { ascending: true }),
          (supabase as any)
            .from("trade_milestone_appeals")
            .select("id,milestone_id,status,reviewer_selection_deadline_at,created_at")
            .eq("status", "reviewer_selection")
            .is("assigned_reviewer_id", null)
            .lte("reviewer_selection_deadline_at", deadlines.now)
            .order("created_at", { ascending: true }),
          (supabase as any)
            .from("trade_payment_review_cases")
            .select("id,payout_id,payment_cycle,status,reviewer_selection_deadline_at,created_at")
            .eq("status", "reviewer_selection")
            .is("assigned_reviewer_id", null)
            .lte("reviewer_selection_deadline_at", deadlines.now)
            .order("created_at", { ascending: true }),
          (supabase as any)
            .from("trade_payment_appeals")
            .select("id,case_id,status,reviewer_selection_deadline_at,created_at")
            .eq("status", "reviewer_selection")
            .is("assigned_reviewer_id", null)
            .lte("reviewer_selection_deadline_at", deadlines.now)
            .order("created_at", { ascending: true }),
        ])
      : [
          { offers: [], reports: [] },
          [],
          { data: [] },
          { data: [] },
          { data: [] },
          { data: [] },
        ];
  const milestoneFallbacks = milestoneFallbacksResult.data ?? [];
  const appealFallbacks = appealFallbacksResult.data ?? [];
  const paymentFallbacks = paymentFallbacksResult.data ?? [];
  const paymentAppealFallbacks = paymentAppealFallbacksResult.data ?? [];

  return (
    <div className="page-shell marketplace-app-shell trade-workflow-shell">
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
                  <p className="route-text">Profile-bound administrator grant with active AAL2 MFA.</p>
                </article>
              </div>

              <div className="section-head section-head-compact">
                <p className="eyebrow">Seven-day reviewer fallback</p>
                <h2>Assign only after participant selection has expired.</h2>
                <p>
                  Database rules enforce the deadline, active reviewer role, participant conflicts,
                  and a different reviewer for appeals. Assignment does not grant custody or payment
                  authority.
                </p>
              </div>

              <div className="data-grid">
                {milestoneFallbacks.map((milestone: Record<string, any>) => (
                  <form
                    action={adminAssignTradeMilestoneReviewerAction}
                    className="panel stack-form"
                    key={String(milestone.id)}
                  >
                    <input name="milestone_id" type="hidden" value={String(milestone.id)} />
                    <input name="return_to" type="hidden" value="/admin/trade-review" />
                    <p className="detail-kicker">Initial neutral review</p>
                    <h3>{String(milestone.action_category)}</h3>
                    <p className="route-text">
                      Participant selection opened {formatDate(String(milestone.reviewer_selection_opened_at))}.
                    </p>
                    <label className="field">
                      <span>Eligible reviewer</span>
                      <select name="reviewer_id" required>
                        <option value="">Choose an active reviewer</option>
                        {reviewerCandidates.map((reviewer: { id: string; label: string }) => (
                          <option key={reviewer.id} value={reviewer.id}>
                            {reviewer.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <PendingSubmitButton
                      disabled={!reviewerCandidates.length}
                      pendingLabel="Assigning reviewer…"
                    >
                      Assign neutral reviewer
                    </PendingSubmitButton>
                  </form>
                ))}

                {appealFallbacks.map((appeal: Record<string, any>) => (
                  <form
                    action={adminAssignTradeAppealReviewerAction}
                    className="panel stack-form"
                    key={String(appeal.id)}
                  >
                    <input name="appeal_id" type="hidden" value={String(appeal.id)} />
                    <input name="return_to" type="hidden" value="/admin/trade-review" />
                    <p className="detail-kicker">Appeal review</p>
                    <h3>Assign a different neutral reviewer</h3>
                    <p className="route-text">
                      Selection deadline {formatDate(String(appeal.reviewer_selection_deadline_at))}.
                    </p>
                    <label className="field">
                      <span>Eligible appeal reviewer</span>
                      <select name="reviewer_id" required>
                        <option value="">Choose an active reviewer</option>
                        {reviewerCandidates.map((reviewer: { id: string; label: string }) => (
                          <option key={reviewer.id} value={reviewer.id}>
                            {reviewer.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <PendingSubmitButton
                      disabled={!reviewerCandidates.length}
                      pendingLabel="Assigning appeal reviewer…"
                    >
                      Assign appeal reviewer
                    </PendingSubmitButton>
                  </form>
                ))}

                {paymentFallbacks.map((reviewCase: Record<string, any>) => (
                  <FullNavigationActionForm
                    action={adminAssignTradePaymentReviewerAction}
                    className="panel stack-form"
                    key={String(reviewCase.id)}
                  >
                    <input
                      name="payout_id"
                      type="hidden"
                      value={String(reviewCase.payout_id)}
                    />
                    <input name="return_to" type="hidden" value="/admin/trade-review" />
                    <p className="detail-kicker">External-payment review</p>
                    <h3>Assign a neutral payment reviewer</h3>
                    <p className="route-text">
                      Payment cycle {String(reviewCase.payment_cycle)} selection
                      deadline {formatDate(String(reviewCase.reviewer_selection_deadline_at))}.
                    </p>
                    <label className="field">
                      <span>Eligible payment reviewer</span>
                      <select name="reviewer_id" required>
                        <option value="">Choose an active reviewer</option>
                        {reviewerCandidates.map((reviewer: { id: string; label: string }) => (
                          <option key={reviewer.id} value={reviewer.id}>
                            {reviewer.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <PendingSubmitButton
                      disabled={!reviewerCandidates.length}
                      pendingLabel="Assigning payment reviewer…"
                    >
                      Assign payment reviewer
                    </PendingSubmitButton>
                  </FullNavigationActionForm>
                ))}

                {paymentAppealFallbacks.map((appeal: Record<string, any>) => (
                  <FullNavigationActionForm
                    action={adminAssignTradePaymentAppealReviewerAction}
                    className="panel stack-form"
                    key={String(appeal.id)}
                  >
                    <input
                      name="payment_appeal_id"
                      type="hidden"
                      value={String(appeal.id)}
                    />
                    <input name="return_to" type="hidden" value="/admin/trade-review" />
                    <p className="detail-kicker">External-payment appeal</p>
                    <h3>Assign a different payment-appeal reviewer</h3>
                    <p className="route-text">
                      Selection deadline {formatDate(String(appeal.reviewer_selection_deadline_at))}.
                    </p>
                    <label className="field">
                      <span>Eligible appeal reviewer</span>
                      <select name="reviewer_id" required>
                        <option value="">Choose an active reviewer</option>
                        {reviewerCandidates.map((reviewer: { id: string; label: string }) => (
                          <option key={reviewer.id} value={reviewer.id}>
                            {reviewer.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <PendingSubmitButton
                      disabled={!reviewerCandidates.length}
                      pendingLabel="Assigning payment-appeal reviewer…"
                    >
                      Assign payment-appeal reviewer
                    </PendingSubmitButton>
                  </FullNavigationActionForm>
                ))}

                {!milestoneFallbacks.length &&
                !appealFallbacks.length &&
                !paymentFallbacks.length &&
                !paymentAppealFallbacks.length ? (
                  <div className="empty-state">
                    <div>
                      <strong>No reviewer-selection deadline has expired.</strong>
                      <p>Participant nominations remain the primary assignment path.</p>
                    </div>
                  </div>
                ) : null}
              </div>

              {!reviewerCandidates.length &&
              (milestoneFallbacks.length ||
                appealFallbacks.length ||
                paymentFallbacks.length ||
                paymentAppealFallbacks.length) ? (
                <div className="status-banner status-banner-warning">
                  <strong>No eligible reviewer is currently available.</strong>
                  <p>
                    Assignment remains fail-closed until another profile receives an active reviewer
                    grant and meets the conflict rules.
                  </p>
                </div>
              ) : null}

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
                  queue.offers.map(({ offer, owner }: ReviewQueueOffer) => (
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
                          <dt>Commitment limit</dt>
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
