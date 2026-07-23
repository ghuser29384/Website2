import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  changeCoreOfferStateAction,
  createTradeInvitationAction,
  revokeTradeInvitationAction,
  startSuggestedMatchAction,
  updateCoreOfferAction,
} from "@/app/core-trade-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { requireViewer } from "@/lib/app-data";
import {
  getCoreOfferForOwner,
  listReciprocalMatches,
  listTradeInvitationsForOffer,
} from "@/lib/core-trade";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getSiteUrl } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Manage proposal",
  robots: { index: false, follow: false },
};

interface ManageOfferPageProps {
  params: Promise<{ offerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return <LocalDateTime value={value} fallback={value} />;
}

function stateCopy(state: string) {
  if (state === "draft") return "Private draft. No obligation and no public listing.";
  if (state === "pending_review") return "Submitted once. Waiting for operator review.";
  if (state === "published") return "Published and eligible for invitations and matching.";
  if (state === "changes_requested") return "Operator requested specific changes before publication.";
  if (state === "rejected") return "Rejected with a reason. You may revise and resubmit.";
  if (state === "paused") return "Paused and removed from live discovery.";
  if (state === "closed") return "Permanently closed.";
  return state.replaceAll("_", " ");
}

export default async function ManageOfferPage({ params, searchParams }: ManageOfferPageProps) {
  const { offerId } = await params;
  const [viewer, resolvedSearchParams] = await Promise.all([
    requireViewer(`/trades/${offerId}/manage`),
    searchParams,
  ]);
  const offer = await getCoreOfferForOwner(offerId, viewer.authUser.id);
  if (!offer) notFound();

  const [invitations, matches] = await Promise.all([
    listTradeInvitationsForOffer(offer.id, viewer.authUser.id),
    offer.workflow_status === "published" ? listReciprocalMatches(offer) : Promise.resolve([]),
  ]);
  const formMessage = getFormMessage(resolvedSearchParams);
  const invitationBase = new URL("/invitations/", getSiteUrl()).toString();
  const editable = ["draft", "changes_requested", "rejected", "paused"].includes(
    offer.workflow_status,
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
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="section section-white" aria-labelledby="manage-offer-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Proposal lifecycle</p>
            <h1 id="manage-offer-heading">
              {offer.offered_cause} ↔ {offer.requested_cause}
            </h1>
            <p>{stateCopy(offer.workflow_status)}</p>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Current state</p>
              <h2>{offer.workflow_status.replaceAll("_", " ")}</h2>
              <dl className="detail-grid">
                <div>
                  <dt>Term version</dt>
                  <dd>{offer.terms_version}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatDate(offer.submitted_at)}</dd>
                </div>
                <div>
                  <dt>Published</dt>
                  <dd>{formatDate(offer.published_at)}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{formatDate(offer.updated_at)}</dd>
                </div>
              </dl>
              {offer.moderation_reason ? (
                <div className="status-banner status-banner-error">
                  <strong>Operator reason</strong>
                  <p>{offer.moderation_reason}</p>
                </div>
              ) : null}
              <div className="form-actions">
                {offer.workflow_status === "published" ? (
                  <Link className="button button-primary" href={`/offers/${offer.id}`}>
                    View public offer
                  </Link>
                ) : null}
                <Link className="button button-secondary" href="/trades/new">
                  Create another
                </Link>
              </div>
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Lifecycle controls</p>
              <h2>Pause, close, or delete deliberately</h2>
              <p className="route-text">
                Pausing removes a published offer from discovery. Closing is permanent. A draft can
                be deleted if no agreement depends on it; otherwise it is retained as a deleted audit
                record.
              </p>
              <div className="form-actions">
                {offer.workflow_status === "published" ? (
                  <form action={changeCoreOfferStateAction}>
                    <input name="offer_id" type="hidden" value={offer.id} />
                    <input name="return_to" type="hidden" value={`/trades/${offer.id}/manage`} />
                    <input name="lifecycle_action" type="hidden" value="pause" />
                    <PendingSubmitButton
                      className="button button-secondary button-mini"
                      pendingLabel="Pausing..."
                    >
                      Pause offer
                    </PendingSubmitButton>
                  </form>
                ) : null}
                {!['closed', 'deleted'].includes(offer.workflow_status) ? (
                  <form action={changeCoreOfferStateAction}>
                    <input name="offer_id" type="hidden" value={offer.id} />
                    <input name="return_to" type="hidden" value={`/trades/${offer.id}/manage`} />
                    <input name="lifecycle_action" type="hidden" value="close" />
                    <PendingSubmitButton
                      className="button button-secondary button-mini"
                      pendingLabel="Closing..."
                    >
                      Permanently close
                    </PendingSubmitButton>
                  </form>
                ) : null}
                {editable ? (
                  <form action={changeCoreOfferStateAction}>
                    <input name="offer_id" type="hidden" value={offer.id} />
                    <input name="return_to" type="hidden" value={`/trades/${offer.id}/manage`} />
                    <input name="lifecycle_action" type="hidden" value="delete" />
                    <PendingSubmitButton
                      className="button button-secondary button-mini"
                      pendingLabel="Deleting..."
                    >
                      Delete draft
                    </PendingSubmitButton>
                  </form>
                ) : null}
              </div>
            </article>
          </div>
        </section>

        {editable ? (
          <section className="section section-subtle" aria-labelledby="edit-terms-heading">
            <div className="section-head section-head-compact">
              <p className="eyebrow">Revise</p>
              <h2 id="edit-terms-heading">Edit the bounded terms, then save or resubmit.</h2>
              <p>
                Resubmission uses the same offer record, increments the term version, and returns it
                to pending review. It does not create a duplicate.
              </p>
            </div>

            <form action={updateCoreOfferAction} className="panel stack-form">
              <input name="offer_id" type="hidden" value={offer.id} />
              <input name="return_to" type="hidden" value={`/trades/${offer.id}/manage`} />
              <div className="field-grid">
                <label className="field">
                  <span>Priority you are advancing</span>
                  <input defaultValue={offer.offered_cause} name="offered_cause" required />
                </label>
                <label className="field">
                  <span>Priority you want advanced</span>
                  <input defaultValue={offer.requested_cause} name="requested_cause" required />
                </label>
              </div>
              <label className="field">
                <span>Your commitment</span>
                <textarea defaultValue={offer.offer_action} name="proposed_action" required rows={4} />
              </label>
              <label className="field">
                <span>Counterparty commitment</span>
                <textarea defaultValue={offer.request_action} name="requested_action" required rows={4} />
              </label>
              <label className="field">
                <span>No-trade baseline</span>
                <textarea
                  defaultValue={offer.no_trade_baseline}
                  name="no_trade_baseline"
                  required
                  rows={3}
                />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span>Duration</span>
                  <input defaultValue={offer.duration} name="duration" required />
                </label>
                <label className="field">
                  <span>Start date</span>
                  <input defaultValue={offer.start_date ?? ""} name="start_date" type="date" />
                </label>
                <label className="field">
                  <span>Evidence due date</span>
                  <input
                    defaultValue={offer.evidence_due_date ?? ""}
                    name="evidence_due_date"
                    type="date"
                  />
                </label>
              </div>
              <label className="field">
                <span>Evidence rule</span>
                <textarea defaultValue={offer.verification} name="evidence_rule" required rows={3} />
              </label>
              <label className="field">
                <span>Most this can cost</span>
                <textarea
                  defaultValue={offer.maximum_burden}
                  name="maximum_burden"
                  required
                  rows={3}
                />
              </label>
              <label className="field">
                <span>Exit conditions</span>
                <textarea
                  defaultValue={offer.exit_conditions}
                  name="exit_conditions"
                  required
                  rows={3}
                />
              </label>
              <label className="field">
                <span>Who can see what</span>
                <textarea defaultValue={offer.privacy_scope} name="privacy_scope" required rows={3} />
              </label>
              <label className="field">
                <span>Context</span>
                <textarea defaultValue={offer.notes} name="notes" rows={3} />
              </label>
              <label className="radio-row">
                <input name="voluntary_certification" type="checkbox" />
                <span>This revision remains voluntary and contains no threat or retaliation.</span>
              </label>
              <div className="form-actions">
                <PendingSubmitButton
                  className="button button-secondary"
                  name="intent"
                  pendingLabel="Saving..."
                  value="draft"
                >
                  Save revision privately
                </PendingSubmitButton>
                <PendingSubmitButton
                  name="intent"
                  pendingLabel="Resubmitting..."
                  value="submit"
                >
                  Resubmit for review
                </PendingSubmitButton>
              </div>
            </form>
          </section>
        ) : null}

        {offer.workflow_status === "published" ? (
          <>
            <section className="section section-white" aria-labelledby="invite-heading">
              <div className="section-head section-head-compact">
                <p className="eyebrow">Direct invitation</p>
                <h2 id="invite-heading">Invite one specific person to review this proposal.</h2>
                <p>
                  The link is private and tied to this offer. Email is optional; a shareable link can
                  be copied into an existing conversation.
                </p>
              </div>

              <div className="detail-grid detail-grid-wide">
                <form action={createTradeInvitationAction} className="panel stack-form">
                  <input name="offer_id" type="hidden" value={offer.id} />
                  <label className="field">
                    <span>Recipient email (optional)</span>
                    <input name="recipient_email" placeholder="person@example.org" type="email" />
                  </label>
                  <label className="field">
                    <span>Private invitation note</span>
                    <textarea
                      name="message"
                      placeholder="Why this particular trade may be worth evaluating"
                      rows={4}
                    />
                  </label>
                  <PendingSubmitButton pendingLabel="Creating invitation...">
                    Create invitation
                  </PendingSubmitButton>
                </form>

                <article className="panel detail-block">
                  <p className="detail-kicker">Invitation status</p>
                  <h3>{invitations.length} invitation{invitations.length === 1 ? "" : "s"}</h3>
                  {invitations.length ? (
                    <div className="mini-list">
                      {invitations.map((invitation) => (
                        <div className="subtle-panel" key={invitation.id}>
                          <strong>{invitation.status}</strong>
                          <p className="route-text">
                            {invitation.recipient_email || "Share-link only"} · created {formatDate(invitation.created_at)}
                          </p>
                          <a
                            className="inline-link"
                            href={`${invitationBase}${invitation.token}`}
                          >
                            {`${invitationBase}${invitation.token}`}
                          </a>
                          {!['responded', 'declined', 'revoked'].includes(invitation.status) ? (
                            <form action={revokeTradeInvitationAction}>
                              <input name="invitation_id" type="hidden" value={invitation.id} />
                              <input name="offer_id" type="hidden" value={offer.id} />
                              <PendingSubmitButton
                                className="button button-secondary button-mini"
                                pendingLabel="Revoking..."
                              >
                                Revoke
                              </PendingSubmitButton>
                            </form>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="route-text">No invitations yet.</p>
                  )}
                </article>
              </div>
            </section>

            <section className="section section-subtle" aria-labelledby="matches-heading">
              <div className="section-head section-head-compact">
                <p className="eyebrow">Deterministic matching</p>
                <h2 id="matches-heading">Reciprocal published proposals.</h2>
                <p>
                  Matching is deliberately simple: same action category, with offered and requested
                  priorities reversed. No AI inference or hidden profile scoring is used.
                </p>
              </div>

              <div className="data-grid">
                {matches.length ? (
                  matches.map((match) => (
                    <article className="panel data-card" key={match.id}>
                      <p className="detail-kicker">Reciprocal match</p>
                      <h3>
                        {match.offered_cause} ↔ {match.requested_cause}
                      </h3>
                      <p className="route-text">{match.offer_action}</p>
                      <div className="form-actions">
                        <Link className="button button-secondary button-mini" href={`/offers/${match.id}`}>
                          Inspect offer
                        </Link>
                        <form action={startSuggestedMatchAction}>
                          <input name="offer_id" type="hidden" value={offer.id} />
                          <input name="candidate_offer_id" type="hidden" value={match.id} />
                          <PendingSubmitButton
                            className="button button-primary button-mini"
                            pendingLabel="Opening thread..."
                          >
                            Start private thread
                          </PendingSubmitButton>
                        </form>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No exact reciprocal match yet.</strong>
                      <p>Use a direct invitation while the marketplace is still small.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
