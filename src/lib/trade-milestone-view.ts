import type {
  TradeMilestoneReviewerCandidate,
  TradeMilestoneSummary,
} from "@/components/core-trade/trade-milestone-workflow";

interface TradeMilestoneViewInput {
  agreementLifecycleStatus: string;
  appeals: Array<Record<string, any>>;
  bundles: Array<Record<string, any>>;
  bundleItems: Array<Record<string, any>>;
  currentViewerId: string;
  externalPaymentReceipts: Array<Record<string, any>>;
  milestones: Array<Record<string, any>>;
  participantLabels: Map<string, string>;
  paymentAppeals: Array<Record<string, any>>;
  paymentReviewCases: Array<Record<string, any>>;
  paymentReviewDecisions: Array<Record<string, any>>;
  payouts: Array<Record<string, any>>;
  reviewerCandidates: TradeMilestoneReviewerCandidate[];
  reviews: Array<Record<string, any>>;
  versionId: string;
}

function timestamp(value: unknown) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function latest(rows: Array<Record<string, any>>) {
  return rows.toSorted(
    (left, right) =>
      (timestamp(right.created_at ?? right.reported_at) ?? 0) -
      (timestamp(left.created_at ?? left.reported_at) ?? 0),
  )[0] ?? null;
}

function moneyAmount(cents: unknown) {
  const value = Number(cents);
  return Number.isSafeInteger(value) && value >= 0 ? (value / 100).toFixed(2) : "0.00";
}

function reviewerLabel(
  reviewerId: unknown,
  candidates: TradeMilestoneReviewerCandidate[],
) {
  const id = String(reviewerId ?? "");
  if (!id) return null;
  return candidates.find((candidate) => candidate.id === id)?.label ?? "Assigned neutral reviewer";
}

function milestoneStatus(value: unknown): TradeMilestoneSummary["status"] {
  const status = String(value ?? "terms");
  if (
    status === "terms" ||
    status === "evidence_due" ||
    status === "under_review" ||
    status === "replacement_due" ||
    status === "appeal_pending" ||
    status === "graded" ||
    status === "paid" ||
    status === "cancelled"
  ) {
    return status;
  }
  return "terms";
}

function reviewStatus({
  appeal,
  bundle,
  review,
}: {
  appeal: Record<string, any> | null;
  bundle: Record<string, any> | null;
  review: Record<string, any> | null;
}): TradeMilestoneSummary["review"]["status"] {
  if (appeal && appeal.status !== "resolved") return "appealed";
  if (review?.is_final) return "final";
  if (review?.outcome === "rejected") return "rejected";
  if (review?.outcome === "graded") return "accepted";
  if (bundle?.status === "submitted") return "under_review";
  return "awaiting_evidence";
}

function appealStatus(
  appeal: Record<string, any> | null,
): TradeMilestoneSummary["review"]["appealStatus"] {
  if (!appeal) return "not_opened";
  if (appeal.status === "reviewer_selection") return "reviewer_selection";
  if (appeal.status === "assigned") return "assigned";
  if (appeal.status === "resolved") return "resolved";
  return null;
}

export function buildTradeMilestoneView({
  agreementLifecycleStatus,
  appeals,
  bundles,
  bundleItems,
  currentViewerId,
  externalPaymentReceipts,
  milestones,
  participantLabels,
  paymentAppeals,
  paymentReviewCases,
  paymentReviewDecisions,
  payouts,
  reviewerCandidates,
  reviews,
  versionId,
}: TradeMilestoneViewInput): TradeMilestoneSummary[] {
  const now = Date.now();

  return milestones.map((milestone) => {
    const milestoneId = String(milestone.id);
    const performerId = String(milestone.performer_id);
    const payerId = String(milestone.payer_id);
    const milestoneBundles = bundles.filter(
      (bundle) => String(bundle.milestone_id) === milestoneId,
    );
    const currentBundle =
      milestoneBundles.find(
        (bundle) => String(bundle.id) === String(milestone.current_bundle_id),
      ) ?? latest(milestoneBundles);
    const milestoneReviews = reviews.filter(
      (review) => String(review.milestone_id) === milestoneId,
    );
    const currentReview =
      milestoneReviews.find(
        (review) => String(review.id) === String(milestone.final_review_id),
      ) ?? latest(milestoneReviews);
    const appeal =
      appeals.find((candidate) => String(candidate.milestone_id) === milestoneId) ?? null;
    const payout =
      payouts.find((candidate) => String(candidate.milestone_id) === milestoneId) ?? null;
    const payoutReceipts = externalPaymentReceipts.filter(
      (candidate) => String(candidate.payout_id) === String(payout?.id),
    );
    const receipt = payoutReceipts.toSorted(
      (left, right) =>
        Number(right.payment_cycle ?? 1) - Number(left.payment_cycle ?? 1) ||
        Number(right.attempt_number ?? 1) - Number(left.attempt_number ?? 1),
    )[0] ?? null;
    const payoutPaymentCases = paymentReviewCases.filter(
      (candidate) => String(candidate.payout_id) === String(payout?.id),
    );
    const paymentCase = payoutPaymentCases.toSorted(
      (left, right) =>
        Number(right.payment_cycle ?? 1) - Number(left.payment_cycle ?? 1),
    )[0] ?? null;
    const caseDecisions = paymentReviewDecisions.filter(
      (candidate) => String(candidate.case_id) === String(paymentCase?.id),
    );
    const paymentDecision =
      caseDecisions.find(
        (candidate) =>
          String(candidate.id) === String(paymentCase?.final_decision_id),
      ) ?? latest(caseDecisions);
    const paymentAppeal =
      paymentAppeals.find(
        (candidate) => String(candidate.case_id) === String(paymentCase?.id),
      ) ?? null;
    const appealDeadline = timestamp(currentReview?.appeal_deadline_at);
    const replacementDeadline = timestamp(milestone.replacement_deadline_at);
    const appealOpen = Boolean(appeal && appeal.status !== "resolved");
    const reviewCanFinalize = Boolean(
      Boolean(currentReview) &&
      !currentReview.is_final &&
      appealDeadline !== null &&
      appealDeadline <= now &&
      !appealOpen &&
      (currentReview.outcome !== "rejected" ||
        milestone.replacement_packet_used ||
        (replacementDeadline !== null && replacementDeadline <= now)),
    );
    const agreementActive = ["active", "evidence_due", "disputed"].includes(
      agreementLifecycleStatus,
    );
    const assignedReviewerId = String(milestone.assigned_reviewer_id ?? "");
    const ownDraftInitial = milestoneBundles.some(
      (bundle) =>
        bundle.bundle_kind === "initial" &&
        bundle.status === "draft" &&
        String(bundle.submitted_by) === currentViewerId,
    );
    const ownDraftReplacement = milestoneBundles.some(
      (bundle) =>
        bundle.bundle_kind === "replacement" &&
        bundle.status === "draft" &&
        String(bundle.submitted_by) === currentViewerId,
    );
    const latestReviewIsAppealable =
      Boolean(currentReview) &&
      !currentReview.is_final &&
      appealDeadline !== null &&
      appealDeadline > now &&
      !appeal;
    const paymentResponseDeadline = timestamp(receipt?.response_deadline_at);
    const paymentAppealDeadline = timestamp(paymentDecision?.appeal_deadline_at);
    const paymentDecisionPending =
      paymentCase?.status === "decision_pending" &&
      paymentDecision?.is_final !== true &&
      ["confirm_paid", "still_due"].includes(String(paymentDecision?.outcome));

    return {
      actionCategory: String(milestone.action_category),
      canAppeal: latestReviewIsAppealable,
      canConfirmExternalPayment:
        currentViewerId === performerId &&
        ["reported_paid", "corrected_reported"].includes(String(payout?.status)) &&
        receipt?.status === "reported" &&
        paymentResponseDeadline !== null &&
        paymentResponseDeadline > now,
      canFinalizePaymentReview:
        paymentDecisionPending &&
        paymentAppealDeadline !== null &&
        paymentAppealDeadline <= now &&
        !paymentAppeal,
      canFinalizeReview: reviewCanFinalize,
      canNominateAppealReviewer:
        Boolean(appeal) &&
        appeal?.status === "reviewer_selection" &&
        !appeal?.assigned_reviewer_id,
      canNominatePaymentAppealReviewer:
        Boolean(paymentAppeal) &&
        paymentAppeal?.status === "reviewer_selection" &&
        !paymentAppeal?.assigned_reviewer_id,
      canNominatePaymentReviewer:
        (Boolean(paymentCase) &&
          paymentCase?.status === "reviewer_selection" &&
          !paymentCase?.assigned_reviewer_id) ||
        (!paymentCase &&
          payout?.status === "reported_paid" &&
          receipt?.status === "reported" &&
          paymentResponseDeadline !== null &&
          paymentResponseDeadline <= now),
      canNominateReviewer:
        agreementActive &&
        Boolean(currentBundle) &&
        currentBundle?.status === "submitted" &&
        !assignedReviewerId,
      canReportExternalPayment:
        currentViewerId === payerId &&
        payout?.is_final === true &&
        ["due", "still_due", "correction_due"].includes(String(payout?.status)),
      canRequestPaymentAppeal:
        paymentDecisionPending &&
        paymentAppealDeadline !== null &&
        paymentAppealDeadline > now &&
        !paymentAppeal,
      canReview:
        currentViewerId === assignedReviewerId &&
        currentBundle?.status === "submitted" &&
        String(milestone.status) === "under_review",
      canSubmitEvidence:
        currentViewerId === performerId &&
        agreementActive &&
        (ownDraftInitial ||
          !milestoneBundles.some((bundle) => bundle.bundle_kind === "initial")),
      canSubmitReplacement:
        currentViewerId === performerId &&
        agreementActive &&
        String(milestone.status) === "replacement_due" &&
        (ownDraftReplacement || !milestone.replacement_packet_used) &&
        !appealOpen,
      completionKind: milestone.indivisible ? "indivisible" : "units",
      currency: String(milestone.currency),
      evidenceBundles: milestoneBundles.map((bundle) => {
        const items = bundleItems.filter(
          (item) => String(item.bundle_id) === String(bundle.id),
        );
        const attestation = items.find((item) => item.evidence_type === "attestation");
        return {
          attempt: Number(bundle.attempt_number) === 2 ? 2 : 1,
          fileCount: items.filter((item) => item.evidence_type === "file").length,
          id: String(bundle.id),
          linkCount: items.filter((item) => item.evidence_type === "link").length,
          status: String(bundle.status) as TradeMilestoneSummary["evidenceBundles"][number]["status"],
          submittedAt: String(bundle.submitted_at ?? bundle.created_at),
          submittedByLabel:
            participantLabels.get(String(bundle.submitted_by)) ?? "Milestone performer",
          summary: attestation?.attestation ? String(attestation.attestation) : null,
        };
      }),
      evidenceRule: String(milestone.evidence_rule),
      externalPayment: {
        appealDeadline: paymentDecision?.appeal_deadline_at
          ? String(paymentDecision.appeal_deadline_at)
          : null,
        appealId: paymentAppeal?.id ? String(paymentAppeal.id) : null,
        appealReason: paymentAppeal?.reason ? String(paymentAppeal.reason) : null,
        appealReviewerId: paymentAppeal?.assigned_reviewer_id
          ? String(paymentAppeal.assigned_reviewer_id)
          : null,
        appealReviewerLabel: reviewerLabel(
          paymentAppeal?.assigned_reviewer_id,
          reviewerCandidates,
        ),
        appealStatus: paymentAppeal?.status
          ? String(paymentAppeal.status)
          : null,
        confirmedAt:
          ["confirmed", "adjudicated_paid"].includes(String(receipt?.status))
            ? String(receipt.responded_at ?? receipt.updated_at ?? "") || null
            : null,
        decisionOutcome: ["confirm_paid", "still_due", "allow_correction"].includes(
          String(paymentDecision?.outcome),
        )
          ? paymentDecision.outcome
          : null,
        decisionReason: paymentDecision?.private_reason
          ? String(paymentDecision.private_reason)
          : null,
        dueAmount: payout?.is_final ? moneyAmount(payout.amount_due_cents) : null,
        paidAt: receipt?.paid_on ? String(receipt.paid_on) : null,
        paymentCycle: receipt?.payment_cycle
          ? Number(receipt.payment_cycle)
          : null,
        payoutId: payout?.id ? String(payout.id) : null,
        providerLabel: receipt?.provider ? String(receipt.provider) : null,
        receiptUrl: receipt?.signedUrl ? String(receipt.signedUrl) : null,
        reportedAt: receipt?.reported_at ? String(receipt.reported_at) : null,
        responseDeadline: receipt?.response_deadline_at
          ? String(receipt.response_deadline_at)
          : null,
        responseOutcome: ["none", "confirmed", "disputed", "unanswered"].includes(
          String(receipt?.response_outcome),
        )
          ? receipt.response_outcome
          : null,
        reviewCaseId: paymentCase?.id ? String(paymentCase.id) : null,
        reviewerId: paymentCase?.assigned_reviewer_id
          ? String(paymentCase.assigned_reviewer_id)
          : null,
        reviewerLabel: reviewerLabel(
          paymentCase?.assigned_reviewer_id,
          reviewerCandidates,
        ),
        reviewSelectionDeadline: paymentCase?.reviewer_selection_deadline_at
          ? String(paymentCase.reviewer_selection_deadline_at)
          : null,
        reviewStatus: paymentCase?.status ? String(paymentCase.status) : null,
        status: String(payout?.status ?? "provisional") as TradeMilestoneSummary["externalPayment"]["status"],
      },
      id: milestoneId,
      maximumAmount: moneyAmount(milestone.maximum_amount_cents),
      payerId,
      payerLabel: participantLabels.get(payerId) ?? "Payer",
      payoutPercentage: payout ? Number(payout.payout_basis_points) / 100 : null,
      performerId,
      performerLabel: participantLabels.get(performerId) ?? "Performer",
      position: Number(milestone.position),
      privateDescription: String(milestone.description),
      replacementUsed: Boolean(milestone.replacement_packet_used),
      review: {
        appealDeadline: currentReview?.appeal_deadline_at
          ? String(currentReview.appeal_deadline_at)
          : null,
        appealId: appeal?.id ? String(appeal.id) : null,
        appealOpenedAt: appeal?.created_at ? String(appeal.created_at) : null,
        appealReason: appeal?.reason ? String(appeal.reason) : null,
        appealReviewerId: appeal?.assigned_reviewer_id
          ? String(appeal.assigned_reviewer_id)
          : null,
        appealReviewerLabel: reviewerLabel(
          appeal?.assigned_reviewer_id,
          reviewerCandidates,
        ),
        appealStatus: appealStatus(appeal),
        completedUnits:
          currentReview?.completion_units === undefined
            ? null
            : Number(currentReview.completion_units),
        confidenceBand:
          currentReview?.confidence_band === undefined
            ? null
            : (Number(currentReview.confidence_band) as TradeMilestoneSummary["review"]["confidenceBand"]),
        decidedAt: currentReview?.created_at ? String(currentReview.created_at) : null,
        decisionId: currentReview?.id ? String(currentReview.id) : null,
        rationale: currentReview?.private_reason ? String(currentReview.private_reason) : null,
        replacementDeadline: milestone.replacement_deadline_at
          ? String(milestone.replacement_deadline_at)
          : null,
        replacementTimePaused: appealOpen,
        reviewerId: assignedReviewerId || null,
        reviewerLabel: reviewerLabel(assignedReviewerId, reviewerCandidates),
        status: reviewStatus({ appeal, bundle: currentBundle, review: currentReview }),
      },
      status: milestoneStatus(milestone.status),
      targetUnits: Number(milestone.units_total),
      unitLabel: String(milestone.unit_label),
      versionId,
    };
  });
}
