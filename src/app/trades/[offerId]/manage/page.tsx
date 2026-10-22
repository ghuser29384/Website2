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
import { LocalDateTime } from "@/components/ui/local-date-time";
import { requireViewer } from "@/lib/app-data";
import {
  getCoreOfferForOwner,
  listReciprocalMatches,
} from "@/lib/core-trade";
import { getFeedCreateLinkForDerivedOffer } from "@/lib/feed-create/phase1";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import styles from "./manage-offer.module.css";

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
    <div className={`page-shell marketplace-app-shell trade-workflow-shell ${styles.shell}`}>
      <header className="v72-route-header">
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
            role={formMessage.tone === "error" ? "alert" : "status"}
          >
            {formMessage.text}
          </div>
        ) : null}

        <header className={styles.heading}>
          <div>
            <p className="eyebrow">Proposal lifecycle</p>
            <h1 id="manage-offer-heading">
              {offer.offered_cause} ↔ {offer.requested_cause}
            </h1>
            <p className={styles.description}>{stateCopy(offer.workflow_status)}</p>
          </div>
          <div className={styles.actions}>
            {offer.workflow_status === "published" ? (
              <Link className="button button-secondary" href={`/offers/${offer.id}`}>
                View public offer
              </Link>
            ) : null}
            <Link className={styles.createLink} href="/trades/new">
              Create another <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </header>

        <section className={styles.overview} aria-label="Proposal status">
          <dl className={styles.statusFacts}>
            <div>
              <dt>Current state</dt>
              <dd>
                <span className={styles.state} data-workflow-status={offer.workflow_status}>
                  {offer.workflow_status.replaceAll("_", " ")}
                </span>
              </dd>
            </div>
            <div>
              <dt>Term version</dt>
              <dd>{offer.terms_version}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDate(offer.updated_at)}</dd>
            </div>
          </dl>
          <details className={styles.history}>
            <summary>Proposal history</summary>
            <dl className={styles.facts}>
              <div>
                <dt>Submitted</dt>
                <dd>{formatDate(offer.submitted_at)}</dd>
              </div>
              <div>
                <dt>Published</dt>
                <dd>{formatDate(offer.published_at)}</dd>
              </div>
            </dl>
          </details>
        </section>

        {offer.moderation_reason ? (
          <div className="status-banner status-banner-error">
            <strong>Operator reason</strong>
            <p>{offer.moderation_reason}</p>
          </div>
        ) : null}

        {sourceLink ? (
          <section className={styles.source} aria-labelledby="source-bound-heading">
            <div className={styles.sectionHeading}>
              <p className="eyebrow">Source-bound counteroffer</p>
              <h2 id="source-bound-heading">
                Based on {sourceLink.sourceOwnerAlias}&apos;s original offer
              </h2>
              <p>
                This draft keeps its exact source relationship. Phase 1 permits private saving and
                operator review only; it cannot be published, invited, messaged, or converted into
                an agreement.
              </p>
            </div>
            <div className={styles.sourceGrid}>
              <article>
                <p className="detail-kicker">Original source</p>
                <h3>Offer revision {sourceLink.source_terms_version}</h3>
                <dl className={styles.facts}>
                  <div><dt>Counterparty</dt><dd>{sourceLink.sourceOwnerAlias}</dd></div>
                  <div><dt>Derivation</dt><dd>Counteroffer</dd></div>
                  <div>
                    <dt>Current source</dt>
                    <dd>{sourceLink.sourceCurrent ? "Open at the linked revision" : "Changed or closed"}</dd>
                  </div>
                  <div><dt>Delivered</dt><dd>No</dd></div>
                </dl>
                <Link className="button button-secondary" href={sourceLink.sourceUrl}>
                  View original offer
                </Link>
              </article>
              <article>
                <p className="detail-kicker">Phase-1 boundary</p>
                <h3>No reliance or contact</h3>
                <p className={styles.description}>
                  The original participant has not received this draft. No invitation, thread,
                  agreement, payment authorization, or obligation exists. The source relationship
                  cannot be removed from a true counteroffer.
                </p>
                {!sourceLink.sourceCurrent ? (
                  <div className="status-banner status-banner-error">
                    The source changed or closed. You may keep this private draft for reference, but
                    it cannot be resubmitted from the stale source revision.
                  </div>
                ) : null}
              </article>
            </div>
          </section>
        ) : null}

        {editable ? (
          <section className={styles.editor} aria-labelledby="edit-terms-heading">
            <div className={styles.sectionHeading}>
              <p className="eyebrow">Revise</p>
              <h2 id="edit-terms-heading">Edit the bounded terms, then save or resubmit.</h2>
              <p>
                Resubmission uses the same offer record, increments the term version, and returns it
                to pending review. It does not create a duplicate.
              </p>
            </div>

            <form action={updateCoreOfferAction} className={styles.form}>
              <input name="offer_id" type="hidden" value={offer.id} />
              <input name="return_to" type="hidden" value={`/trades/${offer.id}/manage`} />

              <fieldset className={styles.fieldset}>
                <legend>Commitments</legend>
                <div className={styles.twoColumns}>
                  <div className={styles.commitment}>
                    <label className="field">
                      <span>Priority you are advancing</span>
                      <input defaultValue={offer.offered_cause} name="offered_cause" required />
                    </label>
                    <label className="field">
                      <span>Your commitment</span>
                      <textarea defaultValue={offer.offer_action} name="proposed_action" required rows={4} />
                    </label>
                  </div>
                  <div className={styles.commitment}>
                    <label className="field">
                      <span>Priority you want advanced</span>
                      <input defaultValue={offer.requested_cause} name="requested_cause" required />
                    </label>
                    <label className="field">
                      <span>Counterparty commitment</span>
                      <textarea defaultValue={offer.request_action} name="requested_action" required rows={4} />
                    </label>
                  </div>
                </div>
                <label className="field">
                  <span>No-trade baseline</span>
                  <textarea defaultValue={offer.no_trade_baseline} name="no_trade_baseline" required rows={3} />
                </label>
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend>Timing and evidence</legend>
                <div className={styles.dates}>
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
                    <input defaultValue={offer.evidence_due_date ?? ""} name="evidence_due_date" type="date" />
                  </label>
                </div>
                <label className="field">
                  <span>Evidence</span>
                  <textarea defaultValue={offer.verification} name="evidence_rule" required rows={3} />
                </label>
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend>Limits and privacy</legend>
                <div className={styles.twoColumns}>
                  <label className="field">
                    <span>Commitment limit</span>
                    <textarea defaultValue={offer.maximum_burden} name="maximum_burden" required rows={3} />
                  </label>
                  <label className="field">
                    <span>Exit conditions</span>
                    <textarea defaultValue={offer.exit_conditions} name="exit_conditions" required rows={3} />
                  </label>
                </div>
                <label className="field">
                  <span>Privacy scope</span>
                  <textarea defaultValue={offer.privacy_scope} name="privacy_scope" required rows={3} />
                </label>
                <label className="field">
                  <span>Context</span>
                  <textarea defaultValue={offer.notes} name="notes" rows={3} />
                </label>
              </fieldset>

              <div className={styles.formFooter}>
                <label className="radio-row">
                  <input name="voluntary_certification" type="checkbox" />
                  <span>This revision remains voluntary and contains no threat or retaliation.</span>
                </label>
                <div className={styles.actions}>
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
              </div>
            </form>
          </section>
        ) : null}

        {offer.workflow_status === "published" ? (
          <>
            <section className={styles.invitation} aria-labelledby="invite-heading">
              <div className={styles.sectionHeading}>
                <p className="eyebrow">Invitation-first trade</p>
                <h2 id="invite-heading">Bring a specific person into this proposal.</h2>
                <p>
                  They can inspect every term before joining, then accept, counter, or decline.
                  Email invitations are account-bound; share links bind to their first claimant.
                </p>
              </div>
              <Link className="button button-primary" href={`/trades/${offer.id}/invite`}>
                Invite someone
              </Link>
            </section>

            <section className={styles.matches} aria-labelledby="matches-heading">
              <div className={styles.sectionHeading}>
                <p className="eyebrow">Deterministic matching</p>
                <h2 id="matches-heading">Reciprocal published proposals.</h2>
                <p>
                  Matching is deliberately simple: same action category, with offered and requested
                  priorities reversed. No AI inference or hidden profile scoring is used.
                </p>
              </div>
              <div className={styles.matchGrid}>
                {matches.length ? (
                  matches.map((match) => (
                    <article className={styles.match} key={match.id}>
                      <p className="detail-kicker">Reciprocal match</p>
                      <h3>{match.offered_cause} ↔ {match.requested_cause}</h3>
                      <p className={styles.description}>{match.offer_action}</p>
                      <div className={styles.actions}>
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
                  <div className={styles.empty}>
                    <strong>No exact reciprocal match yet.</strong>
                    <p>Use a direct invitation while the marketplace is still small.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}

        <details className={styles.lifecycle}>
          <summary>
            <span>Lifecycle controls</span>
            <span className={styles.summaryHint}>Pause, close, or delete deliberately</span>
          </summary>
          <div className={styles.lifecycleBody}>
            <p className={styles.description}>
              Pausing removes a published offer from discovery. Closing is permanent. A draft can
              be deleted if no agreement depends on it; otherwise it is retained as a deleted audit
              record.
            </p>
            <div className={styles.actions}>
              {offer.workflow_status === "published" ? (
                <form action={changeCoreOfferStateAction}>
                  <input name="offer_id" type="hidden" value={offer.id} />
                  <input name="return_to" type="hidden" value={`/trades/${offer.id}/manage`} />
                  <input name="lifecycle_action" type="hidden" value="pause" />
                  <PendingSubmitButton className="button button-secondary" pendingLabel="Pausing...">
                    Pause offer
                  </PendingSubmitButton>
                </form>
              ) : null}
              {!['closed', 'deleted'].includes(offer.workflow_status) ? (
                <form action={changeCoreOfferStateAction}>
                  <input name="offer_id" type="hidden" value={offer.id} />
                  <input name="return_to" type="hidden" value={`/trades/${offer.id}/manage`} />
                  <input name="lifecycle_action" type="hidden" value="close" />
                  <PendingSubmitButton className="button button-secondary" pendingLabel="Closing...">
                    Permanently close
                  </PendingSubmitButton>
                </form>
              ) : null}
              {editable ? (
                <form action={changeCoreOfferStateAction}>
                  <input name="offer_id" type="hidden" value={offer.id} />
                  <input name="return_to" type="hidden" value={`/trades/${offer.id}/manage`} />
                  <input name="lifecycle_action" type="hidden" value="delete" />
                  <PendingSubmitButton className="button button-secondary" pendingLabel="Deleting...">
                    Delete draft
                  </PendingSubmitButton>
                </form>
              ) : null}
            </div>
          </div>
        </details>
      </main>

      <SiteFooter />
    </div>
  );
}
