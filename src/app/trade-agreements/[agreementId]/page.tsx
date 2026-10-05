import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  confirmAgreementVersionAction,
  declineProposedAgreementAction,
  requestAgreementExitAction,
  respondAgreementExitAction,
} from "@/app/core-trade-actions";
import {
  createTradeAgreementMilestoneAction,
  finalizeTradeMilestoneManifestAction,
  finalizeTradeMilestoneReviewAction,
  finalizeTradePaymentReviewAction,
  nominateTradeAppealReviewerAction,
  nominateTradeMilestoneReviewerAction,
  nominateTradePaymentAppealReviewerAction,
  nominateTradePaymentReviewerAction,
  reportTradeExternalPaymentAction,
  requestTradePaymentAppealAction,
  requestTradeMilestoneAppealAction,
  respondTradeExternalPaymentAction,
  startTradeMilestoneAmendmentAction,
  submitNeutralTradeMilestoneReviewAction,
  submitTradeEvidenceBundleAction,
} from "@/app/trade-milestone-actions";
import { TradeAgreementStage } from "@/components/core-trade/trade-agreement-stage";
import { TradeMilestoneWorkflow } from "@/components/core-trade/trade-milestone-workflow";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { requireViewer } from "@/lib/app-data";
import { getCoreAgreementForUser, listTradeReviewerCandidates } from "@/lib/core-trade";
import { getFormMessage } from "@/lib/form-state";
import { buildTradeMilestoneView } from "@/lib/trade-milestone-view";

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
const ACTIVE_STATES = new Set(["active", "evidence_due", "disputed"]);
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

export default async function TradeAgreementPage({
  params,
  searchParams,
}: TradeAgreementPageProps) {
  const [{ agreementId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer(`/trade-agreements/${agreementId}`);
  const [detail, reviewerCandidates] = await Promise.all([
    getCoreAgreementForUser(agreementId, viewer.authUser.id),
    listTradeReviewerCandidates(),
  ]);
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
  const acceptedEvidenceCount = detail.milestoneReviews.filter(
    (review) => review.is_final && review.outcome === "graded",
  ).length;
  const pendingMutualExit = detail.exitRequests.find(
    (request) => request.request_type === "mutual_cancel" && request.status === "pending",
  );
  const milestoneManifestReady =
    !version?.requires_milestone_manifest || Boolean(version?.milestone_manifest_hash);
  const canConfirm =
    Boolean(version) &&
    lifecycleStatus === "proposed" &&
    milestoneManifestReady &&
    !viewerConfirmed;
  const canStartFreshMilestoneVersion =
    lifecycleStatus === "proposed" &&
    (Boolean(version?.milestone_manifest_hash) || detail.confirmations.length > 0);

  if (!version) {
    return (
      <div className="page-shell marketplace-app-shell trade-workflow-shell">
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
  const participantLabels = new Map([
    [String(agreement.proposer_id), proposerLabel],
    [String(agreement.responder_id), responderLabel],
  ]);
  const milestoneViews = buildTradeMilestoneView({
    agreementLifecycleStatus: lifecycleStatus,
    appeals: detail.milestoneAppeals,
    bundles: detail.evidenceBundles,
    bundleItems: detail.evidenceBundleItems,
    currentViewerId: viewer.authUser.id,
    externalPaymentReceipts: detail.externalPaymentReceipts,
    milestones: detail.milestones,
    participantLabels,
    paymentAppeals: detail.paymentAppeals,
    paymentReviewCases: detail.paymentReviewCases,
    paymentReviewDecisions: detail.paymentReviewDecisions,
    payouts: detail.milestonePayouts,
    reviewerCandidates,
    reviews: detail.milestoneReviews,
    versionId: String(version.id),
  });

  return (
    <div className="marketplace-app-shell trade-workflow-shell">
      <div id="main-content" tabIndex={-1}>
        <TradeAgreementStage
          acceptedEvidenceCount={acceptedEvidenceCount}
          activatedAt={agreement.activated_at ? String(agreement.activated_at) : null}
          agreementId={agreementId}
          canConfirm={canConfirm}
          completedAt={agreement.completed_at ? String(agreement.completed_at) : null}
          completionConfirmationCount={detail.milestonePayouts.filter((payout) => payout.is_final).length}
          confirmAction={confirmAgreementVersionAction}
          confirmationCount={detail.confirmations.length}
          counterpartLabel={counterpart?.display_name ?? "the other participant"}
          declineAction={declineProposedAgreementAction}
          evidenceCount={detail.evidenceBundles.length}
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
            evidenceDueDate: String(version.evidence_due_date),
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
              Material changes create a new immutable version and clear prior confirmations. No payment,
              custody, or blanket verification claim is created by this record.
            </p>
          </div>

          <article className="panel data-card data-card-wide">
            <dl className="detail-grid">
              <div>
                <dt>Without this deal</dt>
                <dd>{version.no_trade_baseline}</dd>
              </div>
              <div>
                <dt>Offer-maker commits</dt>
                <dd>{version.proposed_action}</dd>
              </div>
              <div>
                <dt>Counterparty commits</dt>
                <dd>{version.requested_action}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{version.duration}</dd>
              </div>
              <div>
                <dt>Start date</dt>
                <dd>{formatDate(version.start_date)}</dd>
              </div>
              <div>
                <dt>Commitment limit</dt>
                <dd>{version.maximum_burden}</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>{version.evidence_rule}</dd>
              </div>
              <div>
                <dt>Evidence due</dt>
                <dd>{formatDate(version.evidence_due_date)}</dd>
              </div>
              <div>
                <dt>Privacy scope</dt>
                <dd>{version.privacy_scope}</dd>
              </div>
              <div>
                <dt>Exit conditions</dt>
                <dd>{version.exit_conditions}</dd>
              </div>
            </dl>
            <p className="panel-note">
              Terms hash: {String(version.terms_hash).slice(0, 16)}… · proposed by{" "}
              {participantLabel(
                String(version.proposed_by),
                viewer.authUser.id,
                proposer,
                responder,
              )}
              .
            </p>
          </article>

          {canStartFreshMilestoneVersion ? (
            <details className="panel subtle-panel">
              <summary className="panel-summary">Replace these proposed milestone terms</summary>
              <form action={startTradeMilestoneAmendmentAction} className="stack-form">
                <input name="agreement_id" type="hidden" value={agreementId} />
                <p className="route-text">
                  This creates a fresh proposed version with an empty milestone manifest. Earlier
                  confirmations are not copied. The current version remains in history.
                </p>
                <PendingSubmitButton pendingLabel="Creating new version...">
                  Start fresh milestone version
                </PendingSubmitButton>
              </form>
            </details>
          ) : null}

          {ACTIVE_STATES.has(lifecycleStatus) ? (
            <p className="panel-note">
              Active obligations cannot be rewritten in place. End future obligations under the
              exit rules below, then negotiate a new agreement for materially different terms.
            </p>
          ) : null}

          {detail.versions.length > 1 ? (
            <div className="data-grid">
              {detail.versions.map((historicalVersion) => (
                <article className="panel data-card" key={historicalVersion.id}>
                  <p className="detail-kicker">Version history</p>
                  <h3>Version {historicalVersion.version}</h3>
                  <p className="route-text">
                    {historicalVersion.proposed_action} ↔ {historicalVersion.requested_action}
                  </p>
                  <span className="source-pill">{formatDate(historicalVersion.created_at)}</span>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <TradeMilestoneWorkflow
          actions={{
            confirmExternalPaymentAction: respondTradeExternalPaymentAction,
            createMilestoneAction: createTradeAgreementMilestoneAction,
            finalizeMilestoneManifestAction: finalizeTradeMilestoneManifestAction,
            finalizeMilestoneReviewAction: finalizeTradeMilestoneReviewAction,
            finalizePaymentReviewAction: finalizeTradePaymentReviewAction,
            nominateAppealReviewerAction: nominateTradeAppealReviewerAction,
            nominatePaymentAppealReviewerAction:
              nominateTradePaymentAppealReviewerAction,
            nominatePaymentReviewerAction: nominateTradePaymentReviewerAction,
            nominateReviewerAction: nominateTradeMilestoneReviewerAction,
            reportExternalPaymentAction: reportTradeExternalPaymentAction,
            requestAppealAction: requestTradeMilestoneAppealAction,
            requestPaymentAppealAction: requestTradePaymentAppealAction,
            submitEvidenceBundleAction: submitTradeEvidenceBundleAction,
            submitNeutralReviewAction: submitNeutralTradeMilestoneReviewAction,
          }}
          agreementId={agreementId}
          canCreateMilestones={
            lifecycleStatus === "proposed" &&
            detail.confirmations.length === 0 &&
            !version.milestone_manifest_hash
          }
          currentParticipantId={viewer.authUser.id}
          manifestFinalized={Boolean(version.milestone_manifest_hash)}
          milestones={milestoneViews}
          participants={[
            { id: String(agreement.proposer_id), label: proposerLabel },
            { id: String(agreement.responder_id), label: responderLabel },
          ]}
          reviewerCandidates={reviewerCandidates}
          returnTo={`/trade-agreements/${agreementId}`}
          versionConfirmed={viewerConfirmed}
          versionId={String(version.id)}
          versionNumber={Number(version.version)}
        />

        {!FINAL_STATES.has(lifecycleStatus) ? (
          <section className="section section-subtle" id="exit" aria-labelledby="exit-heading">
            <div className="section-head section-head-compact">
              <p className="eyebrow">Exit and cancellation</p>
              <h2 id="exit-heading">End future obligations under visible rules.</h2>
              <p>
                Mutual cancellation waits for both parties. A unilateral exit executes immediately
                under the published exit rule; completed periods remain in the audit record.
              </p>
            </div>

            {pendingMutualExit ? (
              <article className="panel data-card data-card-wide">
                <p className="detail-kicker">Pending mutual cancellation</p>
                <h3>
                  Requested by{" "}
                  {participantLabel(
                    String(pendingMutualExit.requested_by),
                    viewer.authUser.id,
                    proposer,
                    responder,
                  )}
                </h3>
                <p className="route-text">{pendingMutualExit.reason}</p>
                {String(pendingMutualExit.requested_by) !== viewer.authUser.id ? (
                  <div className="form-actions">
                    <form action={respondAgreementExitAction}>
                      <input name="agreement_id" type="hidden" value={agreementId} />
                      <input name="request_id" type="hidden" value={pendingMutualExit.id} />
                      <input name="decision" type="hidden" value="accept" />
                      <PendingSubmitButton
                        className="button button-primary button-mini"
                        pendingLabel="Accepting..."
                      >
                        Accept mutual cancellation
                      </PendingSubmitButton>
                    </form>
                    <form action={respondAgreementExitAction}>
                      <input name="agreement_id" type="hidden" value={agreementId} />
                      <input name="request_id" type="hidden" value={pendingMutualExit.id} />
                      <input name="decision" type="hidden" value="decline" />
                      <PendingSubmitButton
                        className="button button-secondary button-mini"
                        pendingLabel="Declining..."
                      >
                        Decline
                      </PendingSubmitButton>
                    </form>
                  </div>
                ) : (
                  <p className="panel-note">Waiting for the other participant.</p>
                )}
              </article>
            ) : null}

            <div className="data-grid">
              {!pendingMutualExit ? (
                <form action={requestAgreementExitAction} className="panel stack-form">
                  <input name="agreement_id" type="hidden" value={agreementId} />
                  <input name="request_type" type="hidden" value="mutual_cancel" />
                  <h3>Request mutual cancellation</h3>
                  <label className="field">
                    <span>Reason</span>
                    <textarea
                      name="reason"
                      placeholder="Explain why both parties should end future obligations"
                      required
                      rows={3}
                    />
                  </label>
                  <PendingSubmitButton
                    className="button button-secondary"
                    pendingLabel="Sending request..."
                  >
                    Request mutual cancellation
                  </PendingSubmitButton>
                </form>
              ) : null}

              {ACTIVE_STATES.has(lifecycleStatus) ? (
                <form action={requestAgreementExitAction} className="panel stack-form">
                  <input name="agreement_id" type="hidden" value={agreementId} />
                  <input name="request_type" type="hidden" value="unilateral_exit" />
                  <h3>Use unilateral exit rule</h3>
                  <p className="route-text">{String(version.exit_conditions)}</p>
                  <label className="field">
                    <span>Reason and rule relied on</span>
                    <textarea name="reason" required rows={3} />
                  </label>
                  <PendingSubmitButton
                    className="button button-secondary"
                    pendingLabel="Recording exit..."
                  >
                    End future obligations
                  </PendingSubmitButton>
                </form>
              ) : null}
            </div>
          </section>
        ) : null}

        {lifecycleStatus === "cancelled" ? (
          <section className="section section-white">
            <div className="status-banner">
              <strong>Agreement cancelled</strong>
              <p>{agreement.exit_reason || "Future obligations ended. Completed periods remain recorded."}</p>
            </div>
          </section>
        ) : null}
      </div>

      <SiteFooter />
    </div>
  );
}
