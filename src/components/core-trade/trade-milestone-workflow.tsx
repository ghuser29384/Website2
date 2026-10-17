import type { ReactNode } from "react";

import {
  ExternalPaymentResponseForm,
  type ExternalPaymentResponseAction,
} from "@/components/core-trade/external-payment-response-form";
import { FullNavigationActionForm } from "@/components/core-trade/full-navigation-action-form";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { LocalDateTime } from "@/components/ui/local-date-time";

export type TradeMilestoneAction = (
  formData: FormData,
) => void | Promise<void>;

export type TradeMilestoneCompletionKind = "indivisible" | "units";
export type TradeMilestoneConfidenceBand = 0 | 25 | 50 | 75 | 100;

export interface TradeMilestoneParticipantOption {
  id: string;
  label: string;
}

export interface TradeMilestoneReviewerCandidate {
  id: string;
  label: string;
}

export interface TradeMilestoneCategoryOption {
  label: string;
  value: string;
}

export interface TradeEvidenceBundleSummary {
  attempt: 1 | 2;
  fileCount: number;
  id: string;
  linkCount: number;
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "accepted"
    | "invalid"
    | "superseded";
  submittedAt: string;
  submittedByLabel: string;
  summary: string | null;
}

export interface TradeMilestoneReviewSummary {
  appealId: string | null;
  appealDeadline: string | null;
  appealOpenedAt: string | null;
  appealReason: string | null;
  appealReviewerId: string | null;
  appealReviewerLabel: string | null;
  appealStatus:
    | "not_opened"
    | "pending_assignment"
    | "under_review"
    | "reviewer_selection"
    | "assigned"
    | "resolved"
    | "upheld"
    | "revised"
    | null;
  completedUnits: number | null;
  confidenceBand: TradeMilestoneConfidenceBand | null;
  decidedAt: string | null;
  decisionId: string | null;
  rationale: string | null;
  replacementDeadline: string | null;
  replacementTimePaused: boolean;
  reviewerId: string | null;
  reviewerLabel: string | null;
  status:
    | "awaiting_evidence"
    | "pending_assignment"
    | "under_review"
    | "accepted"
    | "rejected"
    | "appealed"
    | "final";
}

export interface TradeMilestoneExternalPaymentSummary {
  appealDeadline: string | null;
  appealId: string | null;
  appealReason: string | null;
  appealReviewerId: string | null;
  appealReviewerLabel: string | null;
  appealStatus: string | null;
  confirmedAt: string | null;
  decisionOutcome: "confirm_paid" | "still_due" | "allow_correction" | null;
  decisionReason: string | null;
  dueAmount: string | null;
  paidAt: string | null;
  paymentCycle: number | null;
  payoutId: string | null;
  providerLabel: string | null;
  receiptUrl: string | null;
  reportedAt: string | null;
  responseDeadline: string | null;
  responseOutcome: "none" | "confirmed" | "disputed" | "unanswered" | null;
  reviewCaseId: string | null;
  reviewerId: string | null;
  reviewerLabel: string | null;
  reviewSelectionDeadline: string | null;
  reviewStatus: string | null;
  status:
    | "provisional"
    | "not_due"
    | "due"
    | "reported_paid"
    | "payment_review_pending"
    | "correction_due"
    | "corrected_reported"
    | "payment_decision_pending"
    | "payment_appeal_pending"
    | "confirmed"
    | "adjudicated_paid"
    | "still_due";
}

export interface TradeMilestoneSummary {
  actionCategory: string;
  canAppeal: boolean;
  canConfirmExternalPayment: boolean;
  canFinalizeReview: boolean;
  canFinalizePaymentReview: boolean;
  canNominateAppealReviewer?: boolean;
  canNominatePaymentAppealReviewer: boolean;
  canNominatePaymentReviewer: boolean;
  canNominateReviewer?: boolean;
  canReportExternalPayment: boolean;
  canRequestPaymentAppeal: boolean;
  canReview: boolean;
  canSubmitEvidence: boolean;
  canSubmitReplacement: boolean;
  completionKind: TradeMilestoneCompletionKind;
  currency: string;
  evidenceBundles: TradeEvidenceBundleSummary[];
  evidenceRule: string;
  externalPayment: TradeMilestoneExternalPaymentSummary;
  id: string;
  maximumAmount: string;
  payerId: string;
  payerLabel: string;
  payoutPercentage: number | null;
  performerId: string;
  performerLabel: string;
  position: number;
  privateDescription: string;
  replacementUsed: boolean;
  review: TradeMilestoneReviewSummary;
  status:
    | "draft"
    | "terms"
    | "awaiting_confirmation"
    | "active"
    | "evidence_due"
    | "under_review"
    | "replacement_due"
    | "appealed"
    | "appeal_pending"
    | "graded"
    | "amount_due"
    | "paid"
    | "completed"
    | "cancelled";
  targetUnits: number;
  unitLabel: string;
  versionId: string;
}

export interface TradeMilestoneWorkflowData {
  actionCategories?: TradeMilestoneCategoryOption[];
  agreementId: string;
  canCreateMilestones: boolean;
  currentParticipantId: string;
  formMessage?: {
    text: string;
    tone: "error" | "success";
  } | null;
  manifestFinalized: boolean;
  milestones: TradeMilestoneSummary[];
  participants: TradeMilestoneParticipantOption[];
  reviewerCandidates?: TradeMilestoneReviewerCandidate[];
  returnTo?: string;
  versionConfirmed: boolean;
  versionId: string;
  versionNumber: number;
}

export interface TradeMilestoneWorkflowActions {
  confirmExternalPaymentAction?: ExternalPaymentResponseAction;
  createMilestoneAction?: TradeMilestoneAction;
  finalizeMilestoneManifestAction?: TradeMilestoneAction;
  finalizeMilestoneReviewAction?: TradeMilestoneAction;
  finalizePaymentReviewAction?: TradeMilestoneAction;
  nominateAppealReviewerAction?: TradeMilestoneAction;
  nominatePaymentAppealReviewerAction?: TradeMilestoneAction;
  nominatePaymentReviewerAction?: TradeMilestoneAction;
  nominateReviewerAction?: TradeMilestoneAction;
  reportExternalPaymentAction?: TradeMilestoneAction;
  requestAppealAction?: TradeMilestoneAction;
  requestPaymentAppealAction?: TradeMilestoneAction;
  submitEvidenceBundleAction?: TradeMilestoneAction;
  submitNeutralReviewAction?: TradeMilestoneAction;
}

export interface TradeMilestoneWorkflowProps
  extends TradeMilestoneWorkflowData {
  actions: TradeMilestoneWorkflowActions;
}

const DEFAULT_ACTION_CATEGORIES: TradeMilestoneCategoryOption[] = [
  { label: "Donation or funding", value: "donation" },
  { label: "Volunteering or service", value: "service" },
  { label: "Advocacy or outreach", value: "advocacy" },
  { label: "Research or information", value: "research" },
  { label: "Consumption or lifestyle", value: "lifestyle" },
  { label: "Other agreed action", value: "other" },
];

const CONFIDENCE_BANDS: TradeMilestoneConfidenceBand[] = [
  100, 75, 50, 25, 0,
];

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function renderDate(
  value: string | null,
  fallback: ReactNode = "Not set",
  dateOnly = false,
) {
  if (!value) return fallback;
  return (
    <LocalDateTime
      dateOnly={dateOnly}
      fallback={fallback}
      value={value}
    />
  );
}

function hiddenWorkflowFields({
  agreementId,
  milestoneId,
  returnTo,
  versionId,
}: {
  agreementId: string;
  milestoneId?: string;
  returnTo?: string;
  versionId: string;
}) {
  return (
    <>
      <input name="agreement_id" type="hidden" value={agreementId} />
      <input name="agreement_version_id" type="hidden" value={versionId} />
      {milestoneId ? (
        <input name="milestone_id" type="hidden" value={milestoneId} />
      ) : null}
      {returnTo ? (
        <input name="return_to" type="hidden" value={returnTo} />
      ) : null}
    </>
  );
}

function MilestoneCreationForm({
  actionCategories,
  action,
  agreementId,
  participants,
  returnTo,
  versionId,
}: {
  action: TradeMilestoneAction;
  actionCategories: TradeMilestoneCategoryOption[];
  agreementId: string;
  participants: TradeMilestoneParticipantOption[];
  returnTo?: string;
  versionId: string;
}) {
  return (
    <form action={action} className="panel stack-form">
      {hiddenWorkflowFields({
        agreementId,
        returnTo,
        versionId,
      })}
      <div className="field-grid">
        <label className="field">
          <span>Action category</span>
          <select name="action_category" required>
            <option value="">Choose a category</option>
            {actionCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Completion structure</span>
          <select defaultValue="indivisible" name="completion_kind" required>
            <option value="indivisible">Indivisible — completed or not completed</option>
            <option value="units">Measured in pre-agreed units</option>
          </select>
        </label>
      </div>

      <label className="field">
        <span>Private milestone description</span>
        <textarea
          name="private_description"
          placeholder="Describe the exact action, scope, and completion boundary that both participants will confirm."
          required
          rows={4}
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Performer</span>
          <select name="performer_id" required>
            <option value="">Choose a participant</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Payer</span>
          <select name="payer_id" required>
            <option value="">Choose a participant</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Unit label</span>
          <input
            defaultValue="outcome"
            name="unit_label"
            placeholder="hours, calls, reports, outcome"
            required
          />
        </label>
        <label className="field">
          <span>Target units</span>
          <input
            defaultValue="1"
            min="1"
            name="target_units"
            required
            step="1"
            type="number"
          />
        </label>
      </div>
      <p className="panel-note">
        For an indivisible action, use one “outcome” as the target. Its completion
        fraction is either 0% or 100%. Unit-based milestones are graded only
        against the target confirmed in this version.
      </p>

      <div className="field-grid">
        <label className="field">
          <span>Maximum amount</span>
          <input
            inputMode="decimal"
            min="0"
            name="maximum_amount"
            placeholder="5.00"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="field">
          <span>Currency</span>
          <input
            autoCapitalize="characters"
            defaultValue="USD"
            maxLength={3}
            minLength={3}
            name="currency"
            pattern="[A-Za-z]{3}"
            required
          />
        </label>
      </div>

      <label className="field">
        <span>Evidence rule</span>
        <textarea
          name="evidence_rule"
          placeholder="State what evidence can establish the action and units, including acceptable sources and any privacy limits."
          required
          rows={4}
        />
      </label>

      <div className="status-banner">
        <strong>The payout rule is fixed before confirmation.</strong>
        <p>
          Amount due equals the maximum amount × the completion fraction × the
          neutral reviewer&apos;s fixed confidence band: 100%, 75%, 50%, 25%, or
          0%. Adding or materially changing a milestone creates a new version
          that both participants must confirm.
        </p>
      </div>

      <PendingSubmitButton pendingLabel="Adding milestone…">
        Add milestone to version
      </PendingSubmitButton>
    </form>
  );
}

function ManifestFinalizationForm({
  action,
  agreementId,
  milestoneCount,
  returnTo,
  versionId,
}: {
  action: TradeMilestoneAction;
  agreementId: string;
  milestoneCount: number;
  returnTo?: string;
  versionId: string;
}) {
  return (
    <form action={action} className="panel stack-form">
      {hiddenWorkflowFields({
        agreementId,
        returnTo,
        versionId,
      })}
      <p className="detail-kicker">Pre-confirmation gate</p>
      <h3>
        Finalize {milestoneCount} milestone
        {milestoneCount === 1 ? "" : "s"} as this version&apos;s manifest
      </h3>
      <p className="route-text">
        Finalization asks the server to hash the current ordered milestone
        terms together with the agreement terms. Participant confirmations stay
        blocked until that complete version is finalized.
      </p>
      <div className="status-banner status-banner-warning">
        <strong>Review every milestone before finalizing.</strong>
        <p>
          Changing an action, participant role, unit target, maximum amount,
          currency, evidence rule, or milestone order after this point requires
          a new immutable agreement version and fresh confirmations.
        </p>
      </div>
      <PendingSubmitButton pendingLabel="Finalizing milestone manifest…">
        Finalize milestone manifest
      </PendingSubmitButton>
    </form>
  );
}

function EvidenceBundleForm({
  action,
  agreementId,
  isReplacement,
  milestone,
  returnTo,
}: {
  action: TradeMilestoneAction;
  agreementId: string;
  isReplacement: boolean;
  milestone: TradeMilestoneSummary;
  returnTo?: string;
}) {
  return (
    <form
      action={action}
      className="panel stack-form"
      encType="multipart/form-data"
    >
      {hiddenWorkflowFields({
        agreementId,
        milestoneId: milestone.id,
        returnTo,
        versionId: milestone.versionId,
      })}
      <input
        name="submission_kind"
        type="hidden"
        value={isReplacement ? "replacement" : "initial"}
      />

      <div className="panel-head">
        <div>
          <p className="detail-kicker">
            {isReplacement ? "Consolidated replacement" : "Private evidence bundle"}
          </p>
          <h4>
            {isReplacement
              ? "Replace the rejected bundle once"
              : "Submit evidence for neutral review"}
          </h4>
        </div>
        <span className="badge">
          {isReplacement ? "Attempt 2 of 2" : "Attempt 1 of 2"}
        </span>
      </div>

      <label className="field">
        <span>Private evidence files (3 MB total)</span>
        <input
          accept="application/pdf,image/png,image/jpeg,image/webp,text/plain"
          multiple
          name="evidence_files"
          type="file"
        />
      </label>
      <label className="field">
        <span>Private external evidence link</span>
        <input name="evidence_url" placeholder="https://…" type="url" />
      </label>
      <label className="field">
        <span>Bundle explanation</span>
        <textarea
          name="attestation"
          placeholder="Explain what was completed, the applicable units, and how this bundle meets the frozen evidence rule."
          required
          rows={4}
        />
      </label>
      <label className="radio-row">
        <input name="bundle_complete" required type="checkbox" value="true" />
        <span>
          I am submitting one complete bundle for this attempt. Original files,
          links, and identifying details remain private to the participants and
          assigned neutral reviewers.
        </span>
      </label>
      {isReplacement ? (
        <p className="panel-note">
          Only one consolidated replacement packet is allowed. An appeal pauses
          the seven-day replacement clock; if a rejection is upheld, the unused
          time resumes.
        </p>
      ) : null}
      <PendingSubmitButton
        pendingLabel={
          isReplacement
            ? "Submitting replacement…"
            : "Submitting evidence…"
        }
      >
        {isReplacement ? "Submit replacement bundle" : "Submit evidence bundle"}
      </PendingSubmitButton>
    </form>
  );
}

function ReviewerNominationForm({
  action,
  agreementId,
  candidates,
  kind,
  milestone,
  returnTo,
}: {
  action: TradeMilestoneAction;
  agreementId: string;
  candidates: TradeMilestoneReviewerCandidate[];
  kind: "initial" | "appeal";
  milestone: TradeMilestoneSummary;
  returnTo?: string;
}) {
  const isAppeal = kind === "appeal";
  const eligibleCandidates = isAppeal
    ? candidates.filter(
        (candidate) => candidate.id !== milestone.review.reviewerId,
      )
    : candidates;

  return (
    <form action={action} className="panel stack-form">
      {hiddenWorkflowFields({
        agreementId,
        milestoneId: milestone.id,
        returnTo,
        versionId: milestone.versionId,
      })}
      <input name="review_kind" type="hidden" value={kind} />
      {isAppeal && milestone.review.appealId ? (
        <input
          name="appeal_id"
          type="hidden"
          value={milestone.review.appealId}
        />
      ) : null}
      <p className="detail-kicker">
        {isAppeal ? "Appeal reviewer selection" : "Neutral reviewer selection"}
      </p>
      <h4>
        {isAppeal
          ? "Nominate a different neutral reviewer"
          : "Nominate the same eligible reviewer"}
      </h4>
      <p className="route-text">
        {isAppeal
          ? "Each participant nominates an eligible reviewer who did not make the original decision. Assignment occurs only when both nominate the same person."
          : "Each participant submits a nomination privately. The reviewer is assigned only when both participants nominate the same eligible person."}
      </p>
      <label className="field">
        <span>{isAppeal ? "Appeal reviewer" : "Neutral reviewer"}</span>
        <select name="reviewer_id" required>
          <option value="">Choose an eligible reviewer</option>
          {eligibleCandidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.label}
            </option>
          ))}
        </select>
      </label>
      <p className="panel-note">
        If the participants do not agree within seven days, an MFA-gated
        administrator may assign an eligible reviewer from the approved panel.
      </p>
      {eligibleCandidates.length ? (
        <PendingSubmitButton
          className="button button-secondary"
          pendingLabel="Recording nomination…"
        >
          Record reviewer nomination
        </PendingSubmitButton>
      ) : (
        <div className="status-banner status-banner-warning">
          <strong>No eligible reviewer is available.</strong>
          <p>
            Reviewer assignment remains open. The seven-day administrator
            fallback stays unavailable until its deadline and MFA gate are
            satisfied.
          </p>
        </div>
      )}
    </form>
  );
}

function NeutralReviewForm({
  action,
  agreementId,
  milestone,
  returnTo,
}: {
  action: TradeMilestoneAction;
  agreementId: string;
  milestone: TradeMilestoneSummary;
  returnTo?: string;
}) {
  const indivisible = milestone.completionKind === "indivisible";

  return (
    <form action={action} className="panel stack-form">
      {hiddenWorkflowFields({
        agreementId,
        milestoneId: milestone.id,
        returnTo,
        versionId: milestone.versionId,
      })}
      <p className="detail-kicker">Assigned neutral reviewer</p>
      <h4>Grade verified performance against the frozen rule</h4>
      <p className="route-text">
        Grade whether the promised action occurred—not how polished the
        submission looks or whether the performer disclosed unnecessary private
        information.
      </p>
      <div className="field-grid">
        <label className="field">
          <span>
            Completed {milestone.unitLabel}
            {indivisible ? " (0 or 1)" : ""}
          </span>
          {indivisible ? (
            <select name="completed_units" required>
              <option value="">Choose completion</option>
              <option value="1">1 — completed</option>
              <option value="0">0 — not completed</option>
            </select>
          ) : (
            <input
              max={milestone.targetUnits}
              min="0"
              name="completed_units"
              required
              step="1"
              type="number"
            />
          )}
        </label>
        <label className="field">
          <span>Evidence confidence</span>
          <select name="confidence_band" required>
            <option value="">Choose a fixed band</option>
            {CONFIDENCE_BANDS.map((band) => (
              <option key={band} value={band}>
                {band}%
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Participant-visible rationale</span>
        <textarea
          name="review_rationale"
          placeholder="Explain the completion finding and why the selected evidence-confidence band applies."
          required
          rows={4}
        />
      </label>
      <p className="panel-note">
        A 0% band rejects this bundle. Future obligations remain paused and the
        performer receives a seven-day replacement window, subject to the single
        appeal.
      </p>
      <PendingSubmitButton pendingLabel="Recording review…">
        Record neutral review
      </PendingSubmitButton>
    </form>
  );
}

function AppealForm({
  action,
  agreementId,
  milestone,
  returnTo,
}: {
  action: TradeMilestoneAction;
  agreementId: string;
  milestone: TradeMilestoneSummary;
  returnTo?: string;
}) {
  return (
    <form action={action} className="panel stack-form">
      {hiddenWorkflowFields({
        agreementId,
        milestoneId: milestone.id,
        returnTo,
        versionId: milestone.versionId,
      })}
      {milestone.review.decisionId ? (
        <input
          name="review_decision_id"
          type="hidden"
          value={milestone.review.decisionId}
        />
      ) : null}
      <p className="detail-kicker">Single appeal</p>
      <h4>Ask a different neutral reviewer to reconsider</h4>
      <p className="route-text">
        Either participant may open the one appeal within seven days. Opening it
        pauses the replacement clock. The original reviewer cannot decide the
        appeal.
      </p>
      <label className="field">
        <span>Reason for appeal</span>
        <textarea
          name="appeal_reason"
          placeholder="Identify the evidence, unit calculation, or frozen rule that should be reconsidered."
          required
          rows={4}
        />
      </label>
      <PendingSubmitButton
        className="button button-secondary"
        pendingLabel="Opening appeal…"
      >
        Open the single appeal
      </PendingSubmitButton>
    </form>
  );
}

function ReviewFinalizationForm({
  action,
  agreementId,
  milestone,
  returnTo,
}: {
  action: TradeMilestoneAction;
  agreementId: string;
  milestone: TradeMilestoneSummary;
  returnTo?: string;
}) {
  return (
    <form action={action} className="panel stack-form">
      {hiddenWorkflowFields({
        agreementId,
        milestoneId: milestone.id,
        returnTo,
        versionId: milestone.versionId,
      })}
      {milestone.review.decisionId ? (
        <input
          name="review_decision_id"
          type="hidden"
          value={milestone.review.decisionId}
        />
      ) : null}
      <p className="detail-kicker">Review finalization</p>
      <h4>The seven-day appeal window has closed.</h4>
      <p className="route-text">
        Finalization locks the review result and makes its calculated external
        payment amount due. If the final calculation is zero, the milestone is
        recorded as not due.
      </p>
      <div className="status-banner status-banner-warning">
        <strong>This does not move money.</strong>
        <p>
          Moral Trade records the final noncustodial amount due—or that no
          amount is due. Any payment still happens directly between the
          participants through an external method.
        </p>
      </div>
      <PendingSubmitButton pendingLabel="Finalizing review…">
        Finalize review and amount due
      </PendingSubmitButton>
    </form>
  );
}

function ExternalPaymentForms({
  actions,
  agreementId,
  milestone,
  reviewerCandidates,
  returnTo,
}: {
  actions: TradeMilestoneWorkflowActions;
  agreementId: string;
  milestone: TradeMilestoneSummary;
  reviewerCandidates: TradeMilestoneReviewerCandidate[];
  returnTo?: string;
}) {
  const payment = milestone.externalPayment;
  const paymentReviewCandidates = reviewerCandidates.filter(
    (candidate) =>
      candidate.id !== milestone.payerId &&
      candidate.id !== milestone.performerId,
  );
  const paymentAppealCandidates = paymentReviewCandidates.filter(
    (candidate) => candidate.id !== payment.reviewerId,
  );

  return (
    <div className="clean-stack">
      <article className="panel data-card">
        <div className="panel-head">
          <div>
            <p className="detail-kicker">External payment</p>
            <h4>{humanize(payment.status)}</h4>
          </div>
          <span className="badge badge-secondary">Noncustodial</span>
        </div>
        <dl className="detail-grid">
          <div>
            <dt>Amount due</dt>
            <dd>
              {payment.dueAmount
                ? `${payment.dueAmount} ${milestone.currency}`
                : "Not final"}
            </dd>
          </div>
          <div>
            <dt>Provider</dt>
            <dd>{payment.providerLabel ?? "Not reported"}</dd>
          </div>
          <div>
            <dt>Payment date</dt>
            <dd>{renderDate(payment.paidAt, "Not reported", true)}</dd>
          </div>
          <div>
            <dt>Reported to Moral Trade</dt>
            <dd>{renderDate(payment.reportedAt)}</dd>
          </div>
          <div>
            <dt>Confirmed</dt>
            <dd>{renderDate(payment.confirmedAt)}</dd>
          </div>
          <div>
            <dt>Payee response deadline</dt>
            <dd>{renderDate(payment.responseDeadline)}</dd>
          </div>
          <div>
            <dt>Neutral payment reviewer</dt>
            <dd>{payment.reviewerLabel ?? "Not assigned"}</dd>
          </div>
          <div>
            <dt>Payment cycle</dt>
            <dd>{payment.paymentCycle ?? "Not started"}</dd>
          </div>
          <div>
            <dt>Private receipt</dt>
            <dd>
              {payment.receiptUrl ? (
                <a
                  className="inline-link"
                  href={payment.receiptUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Review receipt
                </a>
              ) : (
                "Not attached"
              )}
            </dd>
          </div>
        </dl>
        <p className="panel-note">
          Moral Trade records the calculated amount due and an external payment
          receipt. It does not hold, escrow, capture, release, or redistribute
          these funds.
        </p>
        {payment.decisionReason ? (
          <div className="status-banner">
            <strong>
              Reviewer decision: {humanize(payment.decisionOutcome ?? "pending")}
            </strong>
            <p>{payment.decisionReason}</p>
            <p>
              Appeal deadline: {renderDate(payment.appealDeadline)}
            </p>
          </div>
        ) : null}
        {payment.appealStatus ? (
          <div className="status-banner">
            <strong>Payment appeal {humanize(payment.appealStatus)}</strong>
            <p>
              {payment.appealReviewerLabel
                ? `Assigned to ${payment.appealReviewerLabel}, a different neutral reviewer.`
                : "Awaiting a different neutral reviewer."}
            </p>
            {payment.appealReason ? <p>{payment.appealReason}</p> : null}
          </div>
        ) : null}
      </article>

      {milestone.canNominatePaymentReviewer &&
      actions.nominatePaymentReviewerAction &&
      payment.payoutId ? (
        <FullNavigationActionForm
          action={actions.nominatePaymentReviewerAction}
          className="panel stack-form"
        >
          {hiddenWorkflowFields({
            agreementId,
            milestoneId: milestone.id,
            returnTo,
            versionId: milestone.versionId,
          })}
          <input name="payout_id" type="hidden" value={payment.payoutId} />
          <p className="detail-kicker">Neutral payment review</p>
          <h4>Choose a reviewer for the disputed or unanswered receipt</h4>
          <p className="route-text">
            Both participants must privately choose the same eligible reviewer.
            If no agreement is reached within seven days, the MFA-gated
            administrator fallback becomes available.
          </p>
          <label
            className="field"
            htmlFor={`payment-reviewer-${milestone.id}`}
          >
            <span>Eligible reviewer</span>
            <select
              id={`payment-reviewer-${milestone.id}`}
              name="reviewer_id"
              required
            >
              <option value="">Choose a neutral reviewer</option>
              {paymentReviewCandidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>
          <PendingSubmitButton
            disabled={!paymentReviewCandidates.length}
            pendingLabel="Recording nomination…"
          >
            Record payment-reviewer nomination
          </PendingSubmitButton>
        </FullNavigationActionForm>
      ) : null}

      {milestone.canRequestPaymentAppeal &&
      actions.requestPaymentAppealAction &&
      payment.reviewCaseId ? (
        <FullNavigationActionForm
          action={actions.requestPaymentAppealAction}
          className="panel stack-form"
        >
          {hiddenWorkflowFields({
            agreementId,
            milestoneId: milestone.id,
            returnTo,
            versionId: milestone.versionId,
          })}
          <input
            name="payment_case_id"
            type="hidden"
            value={payment.reviewCaseId}
          />
          <p className="detail-kicker">Single payment appeal</p>
          <h4>Ask a different reviewer to reconsider the payment decision</h4>
          <label className="field">
            <span>Reason for appeal</span>
            <textarea
              name="payment_appeal_reason"
              placeholder="Explain which receipt fact or payment finding should be reconsidered."
              required
              rows={4}
            />
          </label>
          <PendingSubmitButton pendingLabel="Opening payment appeal…">
            Open the single payment appeal
          </PendingSubmitButton>
        </FullNavigationActionForm>
      ) : null}

      {milestone.canNominatePaymentAppealReviewer &&
      actions.nominatePaymentAppealReviewerAction &&
      payment.appealId ? (
        <FullNavigationActionForm
          action={actions.nominatePaymentAppealReviewerAction}
          className="panel stack-form"
        >
          {hiddenWorkflowFields({
            agreementId,
            milestoneId: milestone.id,
            returnTo,
            versionId: milestone.versionId,
          })}
          <input
            name="payment_appeal_id"
            type="hidden"
            value={payment.appealId}
          />
          <p className="detail-kicker">Payment-appeal reviewer</p>
          <h4>Choose a different neutral reviewer</h4>
          <label
            className="field"
            htmlFor={`payment-appeal-reviewer-${milestone.id}`}
          >
            <span>Eligible appeal reviewer</span>
            <select
              id={`payment-appeal-reviewer-${milestone.id}`}
              name="reviewer_id"
              required
            >
              <option value="">Choose a different reviewer</option>
              {paymentAppealCandidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>
          <PendingSubmitButton
            disabled={!paymentAppealCandidates.length}
            pendingLabel="Recording nomination…"
          >
            Record payment-appeal nomination
          </PendingSubmitButton>
        </FullNavigationActionForm>
      ) : null}

      {milestone.canFinalizePaymentReview &&
      actions.finalizePaymentReviewAction &&
      payment.reviewCaseId ? (
        <FullNavigationActionForm
          action={actions.finalizePaymentReviewAction}
          className="panel stack-form"
        >
          {hiddenWorkflowFields({
            agreementId,
            milestoneId: milestone.id,
            returnTo,
            versionId: milestone.versionId,
          })}
          <input
            name="payment_case_id"
            type="hidden"
            value={payment.reviewCaseId}
          />
          <p className="detail-kicker">Payment-decision finality</p>
          <h4>The seven-day payment appeal window has closed</h4>
          <p className="route-text">
            Finalization records paid or still due without moving funds and
            recomputes overall agreement completion in the same transaction.
          </p>
          <PendingSubmitButton pendingLabel="Finalizing payment decision…">
            Finalize external-payment decision
          </PendingSubmitButton>
        </FullNavigationActionForm>
      ) : null}

      {milestone.canReportExternalPayment &&
      actions.reportExternalPaymentAction ? (
        <FullNavigationActionForm
          action={actions.reportExternalPaymentAction}
          className="panel stack-form"
          encType="multipart/form-data"
        >
          {hiddenWorkflowFields({
            agreementId,
            milestoneId: milestone.id,
            returnTo,
            versionId: milestone.versionId,
          })}
          <p className="detail-kicker">Payer report</p>
          <h4>
            {payment.status === "correction_due"
              ? "Submit the one permitted corrected receipt"
              : payment.status === "still_due"
                ? "Report a later external payment"
                : "Record payment made outside Moral Trade"}
          </h4>
          <div className="field-grid">
            <label className="field">
              <span>External provider or method</span>
              <input
                name="payment_provider"
                placeholder="Bank transfer, payment app, check…"
                required
              />
            </label>
            <label className="field">
              <span>Payment date</span>
              <input name="paid_at" required type="date" />
            </label>
          </div>
          <label className="field">
            <span>Private external reference</span>
            <input
              name="external_reference"
              placeholder="Transaction or confirmation reference"
              required
            />
          </label>
          <label className="field">
            <span>Private receipt (3 MB maximum)</span>
            <input
              accept="application/pdf,image/png,image/jpeg,image/webp,text/plain"
              name="receipt_file"
              type="file"
            />
          </label>
          <label className="radio-row">
            <input name="payment_attested" required type="checkbox" value="true" />
            <span>
              I attest that I sent the final calculated amount directly through
              the named external method.
            </span>
          </label>
          <PendingSubmitButton pendingLabel="Recording payment…">
            Report external payment
          </PendingSubmitButton>
        </FullNavigationActionForm>
      ) : null}

      {milestone.canConfirmExternalPayment &&
      actions.confirmExternalPaymentAction ? (
        <ExternalPaymentResponseForm
          action={actions.confirmExternalPaymentAction}
          agreementId={agreementId}
          milestoneId={milestone.id}
          responseDeadline={payment.responseDeadline}
          returnTo={returnTo}
          versionId={milestone.versionId}
        />
      ) : null}
    </div>
  );
}

function ReviewStatus({
  milestone,
}: {
  milestone: TradeMilestoneSummary;
}) {
  const { review } = milestone;
  const decidedFraction =
    review.completedUnits === null
      ? null
      : `${review.completedUnits} / ${milestone.targetUnits} ${milestone.unitLabel}`;

  return (
    <article className="panel data-card">
      <div className="panel-head">
        <div>
          <p className="detail-kicker">Neutral review</p>
          <h4>{humanize(review.status)}</h4>
        </div>
        {review.confidenceBand !== null ? (
          <span className="badge">{review.confidenceBand}% confidence</span>
        ) : (
          <span className="badge badge-secondary">Not final</span>
        )}
      </div>
      <dl className="detail-grid">
        <div>
          <dt>Reviewer</dt>
          <dd>{review.reviewerLabel ?? "Awaiting neutral assignment"}</dd>
        </div>
        <div>
          <dt>Completion</dt>
          <dd>{decidedFraction ?? "Awaiting decision"}</dd>
        </div>
        <div>
          <dt>Decision date</dt>
          <dd>{renderDate(review.decidedAt)}</dd>
        </div>
        <div>
          <dt>Payout percentage</dt>
          <dd>
            {milestone.payoutPercentage === null
              ? "Not final"
              : `${milestone.payoutPercentage}%`}
          </dd>
        </div>
      </dl>
      {review.rationale ? (
        <div className="status-banner">
          <strong>Reviewer rationale</strong>
          <p>{review.rationale}</p>
        </div>
      ) : null}

      {review.status === "rejected" ? (
        <div className="status-banner status-banner-warning">
          <strong>Replacement evidence is due</strong>
          <p>
            This bundle is invalid. Future obligations remain paused while the
            performer uses the remaining seven-day replacement window or either
            participant opens the single appeal.
          </p>
        </div>
      ) : null}

      <div className="tag-row">
        <span className="source-pill">
          Replacement deadline: {renderDate(review.replacementDeadline)}
        </span>
        <span className="source-pill">
          Appeal deadline: {renderDate(review.appealDeadline)}
        </span>
        {review.replacementTimePaused ? (
          <span className="source-pill">Replacement clock paused for appeal</span>
        ) : null}
      </div>

      {review.appealStatus && review.appealStatus !== "not_opened" ? (
        <div className="status-banner">
          <strong>Appeal {humanize(review.appealStatus)}</strong>
          <p>
            {review.appealReviewerLabel
              ? `Assigned to ${review.appealReviewerLabel}, a different neutral reviewer.`
              : "Awaiting assignment to a different neutral reviewer."}
          </p>
          {review.appealReason ? <p>{review.appealReason}</p> : null}
          {review.appealOpenedAt ? (
            <p>Opened {renderDate(review.appealOpenedAt)}.</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function EvidenceBundleList({
  bundles,
}: {
  bundles: TradeEvidenceBundleSummary[];
}) {
  if (!bundles.length) {
    return (
      <div className="empty-state">
        <div>
          <strong>No evidence bundle submitted.</strong>
          <p>
            Evidence becomes available after both participants confirm the
            version and the milestone reaches its evidence stage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="data-grid">
      {bundles.map((bundle) => (
        <article className="panel data-card" key={bundle.id}>
          <div className="panel-head">
            <div>
              <p className="detail-kicker">
                {bundle.attempt === 1 ? "Initial bundle" : "Replacement bundle"}
              </p>
              <h4>{humanize(bundle.status)}</h4>
            </div>
            <span className="badge badge-secondary">
              Attempt {bundle.attempt} of 2
            </span>
          </div>
          <p className="route-text">{bundle.summary ?? "No summary provided."}</p>
          <div className="tag-row">
            <span className="source-pill">
              Submitted by {bundle.submittedByLabel}
            </span>
            <span className="source-pill">
              {bundle.fileCount} private file
              {bundle.fileCount === 1 ? "" : "s"}
            </span>
            <span className="source-pill">
              {bundle.linkCount} private link
              {bundle.linkCount === 1 ? "" : "s"}
            </span>
            <span className="source-pill">
              {renderDate(bundle.submittedAt)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function MilestoneCard({
  actions,
  agreementId,
  milestone,
  reviewerCandidates,
  returnTo,
}: {
  actions: TradeMilestoneWorkflowActions;
  agreementId: string;
  milestone: TradeMilestoneSummary;
  reviewerCandidates: TradeMilestoneReviewerCandidate[];
  returnTo?: string;
}) {
  const headingId = `milestone-${milestone.id}-heading`;
  const completionLabel =
    milestone.completionKind === "indivisible"
      ? "Indivisible · 0% or 100%"
      : `${milestone.targetUnits} ${milestone.unitLabel}`;
  const hasInitialBundle = milestone.evidenceBundles.some(
    (bundle) => bundle.attempt === 1,
  );

  return (
    <article
      aria-labelledby={headingId}
      className="panel data-card data-card-wide"
    >
      <div className="panel-head">
        <div>
          <p className="detail-kicker">Milestone {milestone.position}</p>
          <h3 id={headingId}>{milestone.actionCategory}</h3>
        </div>
        <span className="badge">{humanize(milestone.status)}</span>
      </div>

      <p className="route-text">{milestone.privateDescription}</p>
      <dl className="detail-grid">
        <div>
          <dt>Performer</dt>
          <dd>{milestone.performerLabel}</dd>
        </div>
        <div>
          <dt>Payer</dt>
          <dd>{milestone.payerLabel}</dd>
        </div>
        <div>
          <dt>Completion</dt>
          <dd>{completionLabel}</dd>
        </div>
        <div>
          <dt>Maximum</dt>
          <dd>
            {milestone.maximumAmount} {milestone.currency}
          </dd>
        </div>
        <div className="field-wide">
          <dt>Frozen evidence rule</dt>
          <dd>{milestone.evidenceRule}</dd>
        </div>
      </dl>
      <p className="panel-note">
        The performer and payer are frozen participant roles in this agreement
        version. The server re-verifies both account IDs for every action.
      </p>

      <div className="status-banner">
        <strong>Fixed payout formula</strong>
        <p>
          Maximum amount × verified completion fraction × evidence confidence
          (100%, 75%, 50%, 25%, or 0%). Review measures whether the action
          occurred, not presentation quality.
        </p>
      </div>

      <EvidenceBundleList bundles={milestone.evidenceBundles} />

      {milestone.canSubmitEvidence &&
      !hasInitialBundle &&
      actions.submitEvidenceBundleAction ? (
        <EvidenceBundleForm
          action={actions.submitEvidenceBundleAction}
          agreementId={agreementId}
          isReplacement={false}
          milestone={milestone}
          returnTo={returnTo}
        />
      ) : null}

      {milestone.canSubmitReplacement &&
      !milestone.replacementUsed &&
      actions.submitEvidenceBundleAction ? (
        <EvidenceBundleForm
          action={actions.submitEvidenceBundleAction}
          agreementId={agreementId}
          isReplacement
          milestone={milestone}
          returnTo={returnTo}
        />
      ) : null}

      {milestone.canNominateReviewer && actions.nominateReviewerAction ? (
        <ReviewerNominationForm
          action={actions.nominateReviewerAction}
          agreementId={agreementId}
          candidates={reviewerCandidates}
          kind="initial"
          milestone={milestone}
          returnTo={returnTo}
        />
      ) : null}

      <ReviewStatus milestone={milestone} />

      {milestone.canReview && actions.submitNeutralReviewAction ? (
        <NeutralReviewForm
          action={actions.submitNeutralReviewAction}
          agreementId={agreementId}
          milestone={milestone}
          returnTo={returnTo}
        />
      ) : null}

      {milestone.canAppeal && actions.requestAppealAction ? (
        <AppealForm
          action={actions.requestAppealAction}
          agreementId={agreementId}
          milestone={milestone}
          returnTo={returnTo}
        />
      ) : null}

      {milestone.canNominateAppealReviewer &&
      actions.nominateAppealReviewerAction ? (
        <ReviewerNominationForm
          action={actions.nominateAppealReviewerAction}
          agreementId={agreementId}
          candidates={reviewerCandidates}
          kind="appeal"
          milestone={milestone}
          returnTo={returnTo}
        />
      ) : null}

      {milestone.canFinalizeReview &&
      actions.finalizeMilestoneReviewAction ? (
        <ReviewFinalizationForm
          action={actions.finalizeMilestoneReviewAction}
          agreementId={agreementId}
          milestone={milestone}
          returnTo={returnTo}
        />
      ) : null}

      <ExternalPaymentForms
        actions={actions}
        agreementId={agreementId}
        milestone={milestone}
        reviewerCandidates={reviewerCandidates}
        returnTo={returnTo}
      />
    </article>
  );
}

export function TradeMilestoneWorkflow({
  actionCategories = DEFAULT_ACTION_CATEGORIES,
  actions,
  agreementId,
  canCreateMilestones,
  currentParticipantId,
  formMessage,
  manifestFinalized,
  milestones,
  participants,
  reviewerCandidates = [],
  returnTo,
  versionConfirmed,
  versionId,
  versionNumber,
}: TradeMilestoneWorkflowProps) {
  const currentParticipant = participants.find(
    (participant) => participant.id === currentParticipantId,
  );
  const showCreationForm =
    canCreateMilestones &&
    !manifestFinalized &&
    !versionConfirmed &&
    Boolean(actions.createMilestoneAction);
  const canFinalizeManifest =
    !manifestFinalized &&
    !versionConfirmed &&
    milestones.length > 0 &&
    Boolean(actions.finalizeMilestoneManifestAction);
  const versionGateLabel = versionConfirmed
    ? "Confirmed"
    : manifestFinalized
      ? "Awaiting participant confirmations"
      : "Manifest not finalized";

  return (
    <section
      aria-labelledby="trade-milestones-heading"
      className="section section-subtle"
      id="milestones"
    >
      <div className="section-head section-head-compact">
        <p className="eyebrow">Version-bound milestones</p>
        <h2 id="trade-milestones-heading">
          Grade verified performance against terms agreed in advance.
        </h2>
        <p>
          Milestones belong to agreement version {versionNumber}. Material
          changes create a new immutable version and require both participants
          to confirm it again.
        </p>
      </div>

      {formMessage ? (
        <div
          className={
            formMessage.tone === "error"
              ? "status-banner status-banner-error"
              : "status-banner status-banner-success"
          }
          role={formMessage.tone === "error" ? "alert" : "status"}
        >
          <strong>
            {formMessage.tone === "error"
              ? "This change was not saved"
              : "Change recorded"}
          </strong>
          <p>{formMessage.text}</p>
        </div>
      ) : null}

      <article className="panel data-card data-card-wide">
        <div className="panel-head">
          <div>
            <p className="detail-kicker">Current frozen version</p>
            <h3>Agreement version {versionNumber}</h3>
          </div>
          <span className="badge">
            {versionGateLabel}
          </span>
        </div>
        <p className="route-text">
          Signed in as {currentParticipant?.label ?? "a participant"}. Original
          evidence stays private, and the platform records any resulting payment
          without holding or releasing funds.
        </p>
        <div className="tag-row">
          <span className="source-pill">Confidence: 100 / 75 / 50 / 25 / 0%</span>
          <span className="source-pill">One consolidated replacement</span>
          <span className="source-pill">One seven-day appeal</span>
          <span className="source-pill">Seven-day replacement window</span>
        </div>
        <p className="panel-note">Version ID: {versionId}</p>
      </article>

      {showCreationForm && actions.createMilestoneAction ? (
        <details className="panel subtle-panel">
          <summary className="panel-summary">
            Add a milestone before confirmation
          </summary>
          <MilestoneCreationForm
            action={actions.createMilestoneAction}
            actionCategories={actionCategories}
            agreementId={agreementId}
            participants={participants}
            returnTo={returnTo}
            versionId={versionId}
          />
        </details>
      ) : manifestFinalized || versionConfirmed ? (
        <div className="status-banner">
          <strong>Milestone terms are frozen in this version.</strong>
          <p>
            Create a new agreement version to change an action, participant,
            completion unit, maximum amount, evidence rule, or payout term.
          </p>
        </div>
      ) : (
        <div className="status-banner status-banner-warning">
          <strong>Milestone editing is unavailable.</strong>
          <p>
            Participant confirmations remain blocked until at least one
            milestone is saved and its manifest is finalized.
          </p>
        </div>
      )}

      <div className="clean-stack">
        {milestones.length ? (
          milestones.map((milestone) => (
            <MilestoneCard
              actions={actions}
              agreementId={agreementId}
              key={milestone.id}
              milestone={milestone}
              reviewerCandidates={reviewerCandidates}
              returnTo={returnTo}
            />
          ))
        ) : (
          <div className="empty-state">
            <div>
              <strong>No milestones in this version.</strong>
              <p>
                Add independently priced milestones before participants confirm
                the agreement.
              </p>
            </div>
          </div>
        )}
      </div>

      {manifestFinalized || versionConfirmed ? (
        <div className="status-banner status-banner-success">
          <strong>Milestone manifest finalized.</strong>
          <p>
            The complete version can now receive participant confirmations.
            Material changes require a new version and fresh confirmations.
          </p>
        </div>
      ) : canFinalizeManifest && actions.finalizeMilestoneManifestAction ? (
        <ManifestFinalizationForm
          action={actions.finalizeMilestoneManifestAction}
          agreementId={agreementId}
          milestoneCount={milestones.length}
          returnTo={returnTo}
          versionId={versionId}
        />
      ) : (
        <div className="status-banner status-banner-warning">
          <strong>Participant confirmations are blocked.</strong>
          <p>
            Add at least one independently priced milestone, then finalize the
            complete manifest before either participant confirms this agreement
            version.
          </p>
        </div>
      )}

      <article className="panel data-card data-card-wide">
        <p className="detail-kicker">Public metadata boundary</p>
        <h3>Evidence originals and payment details stay private.</h3>
        <p className="route-text">
          A public record may show only the action category, lifecycle status,
          confidence band, completion fraction, payout percentage, and calendar
          date. Participant identities, private descriptions, dollar amounts,
          currency, payment provider, receipt, exact timestamps, files, links,
          and attestations are not public.
        </p>
      </article>
    </section>
  );
}
