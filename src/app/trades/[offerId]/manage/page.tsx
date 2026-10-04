import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  changeCoreOfferStateAction,
  startSuggestedMatchAction,
  updateCoreOfferAction,
} from "@/app/core-trade-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import styles from "@/components/core-trade/offer-workspace.module.css";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { requireViewer } from "@/lib/app-data";
import {
  getCoreOfferForOwner,
  listReciprocalMatches,
} from "@/lib/core-trade";
import { getFeedCreateLinkForDerivedOffer } from "@/lib/feed-create/phase1";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

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
  const sourceLink = await getFeedCreateLinkForDerivedOffer(
    offerId,
    viewer.authUser.id,
  );

  const matches =
    offer.workflow_status === "published" ? await listReciprocalMatches(offer) : [];
  const formMessage = getFormMessage(resolvedSearchParams);
  const editable = ["draft", "changes_requested", "rejected", "paused"].includes(
    offer.workflow_status,
  );

  return (
    <div className={styles.page} data-offer-workspace>
      <header className={styles.header}>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showSearch={false}
          showLogout
        />
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
            role="status"
          >
            {formMessage.text}
          </div>
        ) : null}

        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/dashboard">Profile</Link><span aria-hidden="true">/</span><span>Manage proposal</span>
        </nav>
        <header className={styles.intro}>
          <div className={styles.titleRow}>
            <h1 id="manage-offer-heading">Manage proposal</h1>
            <span className={styles.status}>{offer.workflow_status.replaceAll("_", " ")}</span>
          </div>
          <p className={styles.proposalTitle}>{offer.offered_cause} ↔ {offer.requested_cause}</p>
          <div className={styles.actions}>
            {offer.workflow_status === "published" ? (
              <>
                <Link className="button button-primary" href={`/trades/${offer.id}/invite`}>Invite someone</Link>
                <Link className="button button-secondary" href={`/offers/${offer.id}`}>View public offer</Link>
              </>
            ) : null}
            <Link className={styles.textLink} href="/trades/new">Create another</Link>
          </div>
        </header>

        <div className={styles.overview}>
          <section className={styles.card} aria-labelledby="proposal-summary-heading">
            <h2 id="proposal-summary-heading">Proposal summary</h2>
            <dl className={styles.terms}>
              <div><dt>Your commitment</dt><dd>{offer.offer_action}</dd></div>
              <div><dt>Their commitment</dt><dd>{offer.request_action}</dd></div>
            </dl>
          </section>
          <section className={styles.card} aria-labelledby="proposal-status-heading">
            <h2 id="proposal-status-heading">Status</h2>
            <p className={styles.muted}>{stateCopy(offer.workflow_status)}</p>
            {offer.moderation_reason ? (
              <div className="status-banner status-banner-error"><strong>Review feedback</strong><p>{offer.moderation_reason}</p></div>
            ) : null}
            {offer.workflow_status === "published" ? (
              <form action={changeCoreOfferStateAction}>
                <input name="offer_id" type="hidden" value={offer.id} />
                <input name="return_to" type="hidden" value={`/trades/${offer.id}/manage`} />
                <input name="lifecycle_action" type="hidden" value="pause" />
                <PendingSubmitButton className="button button-secondary" pendingLabel="Pausing...">Pause offer</PendingSubmitButton>
              </form>
            ) : null}
            <details className={styles.inlineDetails}>
              <summary>Version and dates</summary>
              <dl className={styles.metadata}>
                <div><dt>Term version</dt><dd>{offer.terms_version}</dd></div>
                <div><dt>Submitted</dt><dd>{formatDate(offer.submitted_at)}</dd></div>
                <div><dt>Published</dt><dd>{formatDate(offer.published_at)}</dd></div>
                <div><dt>Updated</dt><dd>{formatDate(offer.updated_at)}</dd></div>
              </dl>
            </details>
          </section>
        </div>

        {sourceLink ? (
          <section className={styles.card} aria-labelledby="source-bound-heading">
            <h2 id="source-bound-heading">Based on {sourceLink.sourceOwnerAlias}&apos;s offer</h2>
            <p className={styles.muted}>This counteroffer can be saved privately or submitted for review. It cannot be published or sent, and creates no agreement or obligation.</p>
            {!sourceLink.sourceCurrent ? (
              <div className="status-banner status-banner-error">The original offer changed or closed. You can keep this draft, but cannot resubmit it.</div>
            ) : null}
            <div className={styles.actions}>
              <Link className="button button-secondary" href={sourceLink.sourceUrl}>View original offer</Link>
              <span className={styles.muted}>Revision {sourceLink.source_terms_version} · Not delivered</span>
            </div>
          </section>
        ) : null}

        {editable ? (
          <section className="section section-subtle" aria-labelledby="edit-terms-heading">
            <div className="section-head section-head-compact">
              <h2 id="edit-terms-heading">Edit proposal</h2>

            </div>

            <form action={updateCoreOfferAction} className="stack-form">
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
                  <span>Evidence</span>
                  <textarea defaultValue={offer.verification} name="evidence_rule" required rows={3} />
                </label>
                <label className="field">
                  <span>Commitment limit</span>
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
                <span>Privacy scope</span>
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
                  disabled={Boolean(sourceLink && !sourceLink.sourceCurrent)}
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
            <section className="section section-subtle" aria-labelledby="matches-heading">
              <div className="section-head section-head-compact">
                  <h2 id="matches-heading">Matching proposals</h2>

              </div>

              <div className="data-grid">
                {matches.length ? (
                  matches.map((match) => (
                    <article className="panel data-card" key={match.id}>
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

                    </div>
                  </div>
                )}
              </div>
            </section>
        ) : null}
        {!["closed", "deleted"].includes(offer.workflow_status) ? (
          <details className={styles.disclosure}>
            <summary>Close or delete proposal</summary>
            <div className={styles.disclosureBody}>
              <p className={styles.muted}>Closing is permanent. To temporarily remove a published offer from discovery, use Pause offer.</p>
              <div className={styles.actions}>
                <form action={changeCoreOfferStateAction}>
                  <input name="offer_id" type="hidden" value={offer.id} />
                  <input name="return_to" type="hidden" value={`/trades/${offer.id}/manage`} />
                  <input name="lifecycle_action" type="hidden" value="close" />
                  <PendingSubmitButton className={`button button-secondary ${styles.danger}`} pendingLabel="Closing...">Permanently close</PendingSubmitButton>
                </form>
                {editable ? (
                  <form action={changeCoreOfferStateAction}>
                    <input name="offer_id" type="hidden" value={offer.id} />
                    <input name="return_to" type="hidden" value={`/trades/${offer.id}/manage`} />
                    <input name="lifecycle_action" type="hidden" value="delete" />
                    <PendingSubmitButton className={`button button-secondary ${styles.danger}`} pendingLabel="Deleting...">Delete draft</PendingSubmitButton>
                  </form>
                ) : null}
              </div>
              {editable ? <p className={styles.small}>If an agreement depends on this draft, its audit record is retained.</p> : null}
            </div>
          </details>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
