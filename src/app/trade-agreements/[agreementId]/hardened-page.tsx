import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  confirmAgreementVersionAction,
  confirmTradeCompletionAction,
  declineProposedAgreementAction,
  proposeAgreementAmendmentAction,
  publishTradeEvidenceAction,
  requestAgreementExitAction,
  respondAgreementExitAction,
  reviewTradeEvidenceAction,
  submitTradeEvidenceAction,
  withdrawTradeEvidenceAction,
} from "@/app/core-trade-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { TradeAgreementStage } from "@/components/core-trade/trade-agreement-stage";
import { SiteFooter } from "@/components/layout/site-footer";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { requireViewer } from "@/lib/app-data";
import { getCoreAgreementForUser } from "@/lib/core-trade";
import { getFormMessage } from "@/lib/form-state";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Trade agreement",
  robots: { index: false, follow: false },
};

interface TradeAgreementPageProps {
  params: Promise<{ agreementId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const FINAL_STATES = new Set(["completed", "cancelled", "expired"]);
const EVIDENCE_STATES = new Set(["active", "evidence_due", "disputed"]);

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return <LocalDateTime value={value} fallback={value} />;
}

function participantLabel(
  userId: string,
  viewerId: string,
  proposer: { id: string; display_name: string | null } | null,
  responder: { id: string; display_name: string | null } | null,
) {
  if (userId === viewerId) return "You";
  if (proposer?.id === userId) return proposer.display_name ?? "Proposer";
  if (responder?.id === userId) return responder.display_name ?? "Responder";
  return "Participant";
}

function EvidenceSubmissionForm({
  agreementId,
  replacesEvidenceId,
}: {
  agreementId: string;
  replacesEvidenceId?: string;
}) {
  return (
    <form action={submitTradeEvidenceAction} className="panel stack-form" encType="multipart/form-data">
      <input name="agreement_id" type="hidden" value={agreementId} />
      <input name="submission_key" type="hidden" value={randomUUID()} />
      {replacesEvidenceId ? (
        <input name="replaces_evidence_id" type="hidden" value={replacesEvidenceId} />
      ) : null}
      <label className="field">
        <span>Private evidence file (PDF, image, or text; 10 MB maximum)</span>
        <input
          accept="application/pdf,image/png,image/jpeg,image/webp,text/plain"
          name="evidence_file"
          type="file"
        />
      </label>
      <label className="field">
        <span>Private external evidence link</span>
        <input name="evidence_url" placeholder="https://..." type="url" />
      </label>
      <label className="field">
        <span>Private participant attestation</span>
        <textarea
          name="attestation"
          placeholder="State exactly what action was completed and over what period"
          rows={4}
        />
      </label>
      <p className="panel-note">
        Provide one evidence form. It is visible only to the two participants and the operator.
        Publishing requires a separate redacted copy after submission.
      </p>
      <PendingSubmitButton pendingLabel="Uploading private evidence...">
        {replacesEvidenceId ? "Submit replacement evidence" : "Submit private evidence"}
      </PendingSubmitButton>
    </form>
  );
}

export default async function HardenedTradeAgreementPage({
  params,
  searchParams,
}: TradeAgreementPageProps) {
  const [{ agreementId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer(`/trade-agreements/${agreementId}`);
  const detail = await getCoreAgreementForUser(agreementId, viewer.authUser.id);
  if (!detail) notFound();

  const formMessage = getFormMessage(resolvedSearchParams);
  const { agreement, version, offer, proposer, responder } = detail;
  const lifecycleStatus = String(agreement.lifecycle_status ?? agreement.status ?? "proposed");
  const viewerIsProposer = String(agreement.proposer_id) === viewer.authUser.id;
  const counterpart = viewerIsProposer ? responder : proposer;
  const viewerConfirmed = detail.confirmations.some(
    (confirmation) => String(confirmation.user_id) === viewer.authUser.id,
  );
  const proposerConfirmed = detail.confirmations.some(
    (confirmation) => String(confirmation.user_id) === String(agreement.proposer_id),
  );
  const responderConfirmed = detail.confirmations.some(
    (confirmation) => String(confirmation.user_id) === String(agreement.responder_id),
  );
  const viewerCompleted = detail.completionConfirmations.some(
    (confirmation) => String(confirmation.user_id) === viewer.authUser.id,
  );
  const proposerCompleted = detail.completionConfirmations.some(
    (confirmation) => String(confirmation.user_id) === String(agreement.proposer_id),
  );
  const responderCompleted = detail.completionConfirmations.some(
    (confirmation) => String(confirmation.user_id) === String(agreement.responder_id),
  );
  const acceptedEvidenceCount = detail.evidence.filter((item) => item.status === "accepted").length;
  const pendingMutualExit = detail.exitRequests.find(
    (request) => request.request_type === "mutual_cancel" && request.status === "pending",
  );

  if (!version) {
    return (
      <div className="page-shell marketplace-app-shell">
        <main id="main-content" tabIndex={-1}>
          <section className="section section-white">
            <div className="status-banner status-banner-error">
              <strong>Agreement version unavailable</strong>
              <p>No participant should rely on this record until a frozen term version exists.</p>
            </div>
            {detail.threadId ? (
              <Link className="button button-secondary" href={`/messages/${detail.threadId}`}>
                Open private thread
              </Link>
            ) : null}
          </section>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const proposerLabel = participantLabel(
    String(agreement.proposer_id),
    viewer.authUser.id,
    proposer,
    responder,
  );
  const responderLabel = participantLabel(
    String(agreement.responder_id),
    viewer.authUser.id,
    proposer,
    responder,
  );
  const canConfirm = lifecycleStatus === "proposed" && !viewerConfirmed;
  const canAmend = lifecycleStatus === "proposed";
  const canSubmitEvidence = EVIDENCE_STATES.has(lifecycleStatus);
  const canConfirmCompletion =
    ["active", "evidence_due"].includes(lifecycleStatus) &&
    acceptedEvidenceCount > 0 &&
    !viewerCompleted;

  return (
    <div className="marketplace-app-shell">
      <div id="main-content" tabIndex={-1}>
        <TradeAgreementStage
          acceptedEvidenceCount={acceptedEvidenceCount}
          activatedAt={agreement.activated_at ? String(agreement.activated_at) : null}
          agreementId={agreementId}
          canConfirm={canConfirm}
          completedAt={agreement.completed_at ? String(agreement.completed_at) : null}
          completionConfirmationCount={detail.completionConfirmations.length}
          confirmAction={confirmAgreementVersionAction}
          confirmationCount={detail.confirmations.length}
          counterpartLabel={counterpart?.display_name ?? "the other participant"}
          declineAction={declineProposedAgreementAction}
          evidenceCount={detail.evidence.length}
          evidenceDueAt={agreement.evidence_due_at ? String(agreement.evidence_due_at) : null}
          exitReason={agreement.exit_reason ? String(agreement.exit_reason) : null}
          formMessage={formMessage}
          lifecycleStatus={lifecycleStatus}
          offerHref={offer ? `/offers/${offer.id}` : null}
          proposer={{
            action: String(version.proposed_action),
            cause: offer?.offered_cause ?? "Offer-maker priority",
            confirmed: proposerConfirmed,
            label: proposerLabel,
          }}
          responder={{
            action: String(version.requested_action),
            cause: offer?.requested_cause ?? "Counterparty priority",
            confirmed: responderConfirmed,
            label: responderLabel,
          }}
          threadHref={detail.threadId ? `/messages/${detail.threadId}` : null}
          version={{
            evidenceDueDate: String(version.evidence_due_date ?? ""),
            evidenceRule: String(version.evidence_rule),
            exitConditions: String(version.exit_conditions),
            id: String(version.id),
            maximumBurden: String(version.maximum_burden),
            noTradeBaseline: String(version.no_trade_baseline),
            privacyScope: String(version.privacy_scope),
            version: Number(version.version),
          }}
          viewerConfirmed={viewerConfirmed}
        />

        <section className="section section-white" id="terms" aria-labelledby="terms-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Frozen Deal Receipt</p>
            <h2 id="terms-heading">Version {version.version} is the only version anyone may confirm.</h2>
            <p>
              Material changes create a new immutable version and clear prior confirmations. Once
              active, terms cannot be amended; a participant must exit and form a new agreement.
            </p>
          </div>
          <article className="panel data-card data-card-wide">
            <dl className="detail-grid">
              <div><dt>Without this deal</dt><dd>{version.no_trade_baseline}</dd></div>
              <div><dt>Offer-maker commits</dt><dd>{version.proposed_action}</dd></div>
              <div><dt>Counterparty commits</dt><dd>{version.requested_action}</dd></div>
              <div><dt>Duration</dt><dd>{version.duration}</dd></div>
              <div><dt>Start date</dt><dd>{formatDate(version.start_date)}</dd></div>
              <div><dt>Commitment limit</dt><dd>{version.maximum_burden}</dd></div>
              <div><dt>Evidence</dt><dd>{version.evidence_rule}</dd></div>
              <div><dt>Evidence due</dt><dd>{formatDate(version.evidence_due_date)}</dd></div>
              <div><dt>Privacy scope</dt><dd>{version.privacy_scope}</dd></div>
              <div><dt>Exit conditions</dt><dd>{version.exit_conditions}</dd></div>
            </dl>
            <p className="panel-note">Terms hash: {String(version.terms_hash).slice(0, 16)}…</p>
          </article>

          {canAmend ? (
            <details className="panel subtle-panel">
              <summary className="panel-summary">Propose a new version before activation</summary>
              <form action={proposeAgreementAmendmentAction} className="stack-form">
                <input name="agreement_id" type="hidden" value={agreementId} />
                <input name="submission_key" type="hidden" value={randomUUID()} />
                <label className="field"><span>Offer-maker action</span><textarea defaultValue={String(version.proposed_action)} name="proposed_action" required rows={3} /></label>
                <label className="field"><span>Counterparty action</span><textarea defaultValue={String(version.requested_action)} name="requested_action" required rows={3} /></label>
                <label className="field"><span>No-trade baseline</span><textarea defaultValue={String(version.no_trade_baseline)} name="no_trade_baseline" required rows={3} /></label>
                <div className="field-grid">
                  <label className="field"><span>Duration</span><input defaultValue={String(version.duration)} name="duration" required /></label>
                  <label className="field"><span>Start date</span><input defaultValue={version.start_date ? String(version.start_date) : ""} name="start_date" type="date" /></label>
                  <label className="field"><span>Evidence due date</span><input defaultValue={version.evidence_due_date ? String(version.evidence_due_date) : ""} name="evidence_due_date" type="date" /></label>
                </div>
                <label className="field"><span>Evidence rule</span><textarea defaultValue={String(version.evidence_rule)} name="evidence_rule" required rows={3} /></label>
                <label className="field"><span>Commitment limit</span><textarea defaultValue={String(version.maximum_burden)} name="maximum_burden" required rows={3} /></label>
                <label className="field"><span>Privacy scope</span><textarea defaultValue={String(version.privacy_scope)} name="privacy_scope" required rows={3} /></label>
                <label className="field"><span>Exit conditions</span><textarea defaultValue={String(version.exit_conditions)} name="exit_conditions" required rows={3} /></label>
                <PendingSubmitButton pendingLabel="Creating new version...">Propose amendment</PendingSubmitButton>
              </form>
            </details>
          ) : null}
        </section>

        <section className="section section-subtle" id="evidence" aria-labelledby="evidence-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Evidence</p>
            <h2 id="evidence-heading">Evidence is private by default.</h2>
            <p>
              The two participants can review the private source. Public publication is optional,
              separate, explicit, and requires a redacted public-safe copy.
            </p>
          </div>

          {canSubmitEvidence ? (
            <EvidenceSubmissionForm agreementId={agreementId} />
          ) : (
            <div className="status-banner">
              <strong>Evidence submission unavailable in this state</strong>
              <p>The agreement must be bilaterally active before evidence can be submitted.</p>
            </div>
          )}

          <div className="data-grid">
            {detail.evidence.length ? (
              detail.evidence.map((item) => {
                const submittedByViewer = String(item.submitted_by) === viewer.authUser.id;
                const isOpen = item.status === "submitted" || item.status === "challenged";
                return (
                  <article className="panel data-card" key={item.id}>
                    <p className="detail-kicker">{String(item.evidence_type).replaceAll("_", " ")}</p>
                    <h3>{String(item.status).replaceAll("_", " ")}</h3>
                    <div className="tag-row">
                      <span className="source-pill">Submitted by {participantLabel(String(item.submitted_by), viewer.authUser.id, proposer, responder)}</span>
                      <span className="source-pill">{formatDate(item.created_at)}</span>
                      <span className="source-pill">Visibility: {String(item.public_visibility ?? "private").replaceAll("_", " ")}</span>
                    </div>
                    {item.attestation ? <p className="route-text">{item.attestation}</p> : null}
                    {item.signedUrl ? <a className="inline-link" href={item.signedUrl}>Open private uploaded evidence</a> : null}
                    {item.evidence_url ? <a className="inline-link" href={item.evidence_url}>Open private external evidence</a> : null}
                    {item.challenge_reason ? <div className="status-banner status-banner-error"><strong>Challenge reason</strong><p>{item.challenge_reason}</p></div> : null}

                    {!submittedByViewer && item.status === "submitted" ? (
                      <div className="clean-stack">
                        <form action={reviewTradeEvidenceAction}>
                          <input name="agreement_id" type="hidden" value={agreementId} />
                          <input name="evidence_id" type="hidden" value={item.id} />
                          <input name="decision" type="hidden" value="accept" />
                          <PendingSubmitButton className="button button-primary button-mini" pendingLabel="Accepting...">Accept evidence</PendingSubmitButton>
                        </form>
                        <form action={reviewTradeEvidenceAction} className="stack-form">
                          <input name="agreement_id" type="hidden" value={agreementId} />
                          <input name="evidence_id" type="hidden" value={item.id} />
                          <input name="decision" type="hidden" value="challenge" />
                          <label className="field"><span>Challenge reason</span><textarea name="challenge_reason" required rows={3} /></label>
                          <PendingSubmitButton className="button button-secondary button-mini" pendingLabel="Challenging...">Challenge evidence</PendingSubmitButton>
                        </form>
                      </div>
                    ) : null}

                    {submittedByViewer && isOpen ? (
                      <div className="clean-stack">
                        <form action={withdrawTradeEvidenceAction} className="stack-form">
                          <input name="agreement_id" type="hidden" value={agreementId} />
                          <input name="evidence_id" type="hidden" value={item.id} />
                          <label className="field"><span>Withdrawal reason</span><textarea name="reason" rows={2} /></label>
                          <PendingSubmitButton className="button button-secondary button-mini" pendingLabel="Withdrawing...">Withdraw evidence</PendingSubmitButton>
                        </form>
                        <details>
                          <summary>Replace this evidence</summary>
                          <EvidenceSubmissionForm agreementId={agreementId} replacesEvidenceId={String(item.id)} />
                        </details>
                      </div>
                    ) : null}

                    {submittedByViewer && !["withdrawn", "replaced"].includes(String(item.status)) ? (
                      <details className="subtle-panel">
                        <summary>Publish a separate redacted copy</summary>
                        <form action={publishTradeEvidenceAction} className="stack-form" encType="multipart/form-data">
                          <input name="agreement_id" type="hidden" value={agreementId} />
                          <input name="evidence_id" type="hidden" value={item.id} />
                          <label className="field"><span>Public title</span><input maxLength={300} name="public_title" /></label>
                          <label className="field"><span>Public summary</span><textarea maxLength={5000} name="public_summary" rows={3} /></label>
                          <label className="field"><span>Separate redacted public file</span><input accept="application/pdf,image/png,image/jpeg,image/webp,text/plain" name="public_evidence_file" type="file" /></label>
                          <label className="field"><span>Separate public link</span><input name="public_url" type="url" /></label>
                          <label className="field"><span>What was removed or reviewed?</span><textarea maxLength={2000} name="public_redaction_note" required rows={3} /></label>
                          <label className="radio-row"><input name="publication_certification" required type="checkbox" /><span>I reviewed this separate copy and removed sensitive identifiers and unrelated personal information.</span></label>
                          <PendingSubmitButton pendingLabel="Publishing redacted copy...">Publish redacted copy</PendingSubmitButton>
                        </form>
                      </details>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="empty-state"><div><strong>No evidence submitted.</strong><p>Use a private file, link, or attestation after bilateral activation.</p></div></div>
            )}
          </div>
        </section>

        <section className="section section-white" id="completion" aria-labelledby="completion-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Completion</p>
            <h2 id="completion-heading">Both participants close the loop.</h2>
            <p>At least one evidence item must be accepted. Completion becomes final only after both participants independently confirm it.</p>
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <h3>{acceptedEvidenceCount} accepted evidence item{acceptedEvidenceCount === 1 ? "" : "s"}</h3>
              <p>{proposer?.display_name ?? "Proposer"}: {proposerCompleted ? "confirmed" : "waiting"}</p>
              <p>{responder?.display_name ?? "Responder"}: {responderCompleted ? "confirmed" : "waiting"}</p>
              {canConfirmCompletion ? (
                <form action={confirmTradeCompletionAction}>
                  <input name="agreement_id" type="hidden" value={agreementId} />
                  <PendingSubmitButton pendingLabel="Confirming completion...">Confirm completion</PendingSubmitButton>
                </form>
              ) : viewerCompleted && lifecycleStatus !== "completed" ? <p className="panel-note">Your confirmation is recorded.</p> : null}
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Final Deal Receipt</p>
              <h3>{lifecycleStatus === "completed" ? "Completed by both participants" : "Not final yet"}</h3>
              <p>{version.proposed_action} ↔ {version.requested_action}</p>
              {lifecycleStatus === "completed" ? <p>Completed {formatDate(agreement.completed_at)}.</p> : null}
            </article>
          </div>
        </section>

        {!FINAL_STATES.has(lifecycleStatus) ? (
          <section className="section section-subtle" id="exit" aria-labelledby="exit-heading">
            <div className="section-head section-head-compact">
              <p className="eyebrow">Exit and cancellation</p>
              <h2 id="exit-heading">End future obligations under visible rules.</h2>
              <p>Mutual cancellation waits for both participants. A unilateral exit executes immediately; completed periods remain recorded.</p>
            </div>

            {pendingMutualExit ? (
              <article className="panel data-card data-card-wide">
                <h3>Pending mutual cancellation</h3>
                <p>{pendingMutualExit.reason}</p>
                {String(pendingMutualExit.requested_by) !== viewer.authUser.id ? (
                  <div className="form-actions">
                    <form action={respondAgreementExitAction}><input name="agreement_id" type="hidden" value={agreementId} /><input name="request_id" type="hidden" value={pendingMutualExit.id} /><input name="decision" type="hidden" value="accept" /><PendingSubmitButton pendingLabel="Accepting...">Accept mutual cancellation</PendingSubmitButton></form>
                    <form action={respondAgreementExitAction}><input name="agreement_id" type="hidden" value={agreementId} /><input name="request_id" type="hidden" value={pendingMutualExit.id} /><input name="decision" type="hidden" value="decline" /><PendingSubmitButton pendingLabel="Declining...">Decline</PendingSubmitButton></form>
                  </div>
                ) : <p className="panel-note">Waiting for the other participant.</p>}
              </article>
            ) : null}

            <div className="data-grid">
              {!pendingMutualExit ? (
                <form action={requestAgreementExitAction} className="panel stack-form">
                  <input name="agreement_id" type="hidden" value={agreementId} />
                  <input name="request_type" type="hidden" value="mutual_cancel" />
                  <h3>Request mutual cancellation</h3>
                  <label className="field"><span>Reason</span><textarea name="reason" required rows={3} /></label>
                  <PendingSubmitButton pendingLabel="Sending request...">Request mutual cancellation</PendingSubmitButton>
                </form>
              ) : null}
              <form action={requestAgreementExitAction} className="panel stack-form">
                <input name="agreement_id" type="hidden" value={agreementId} />
                <input name="request_type" type="hidden" value="unilateral_exit" />
                <h3>Use unilateral exit</h3>
                <label className="field"><span>Reason</span><textarea name="reason" required rows={3} /></label>
                <PendingSubmitButton pendingLabel="Ending future obligations...">End future obligations</PendingSubmitButton>
              </form>
            </div>
          </section>
        ) : null}
      </div>
      <SiteFooter />
    </div>
  );
}
