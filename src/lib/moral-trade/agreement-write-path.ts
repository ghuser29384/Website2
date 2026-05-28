import {
  validateMoralTradeProposalStateTransition,
  type MoralTradeProposalStateTransitionValidation,
} from "@/lib/moral-trade/protocol";

export type AgreementCompletionState =
  | "pending_evidence"
  | "under_review"
  | "challenge_window_open"
  | "reviewed_complete"
  | "disputed_unresolved";

export type AgreementReviewCaseStatus =
  | "open"
  | "under_review"
  | "challenge_window_open"
  | "reviewed_complete"
  | "disputed_unresolved"
  | "appealed"
  | "closed";

export interface AgreementProtocolTerms {
  source: string | null;
  notes: string | null;
  structuredTerms: string | null;
  noTradeBaseline: string | null;
  counterfactualDeclaration: string | null;
  durationTerms: string | null;
  exitConditions: string | null;
  evidenceRule: string | null;
  privacyScope: string | null;
  disclosureScope: string | null;
}

export function mapAgreementReviewStatusToProtocolStatus(
  status: AgreementReviewCaseStatus,
): string {
  if (status === "challenge_window_open") {
    return "challenge_window";
  }

  if (status === "reviewed_complete") {
    return "completion_reviewed";
  }

  if (status === "disputed_unresolved" || status === "appealed") {
    return "disputed_unresolved";
  }

  if (status === "closed") {
    return "blocked";
  }

  return "needs_human_review";
}

export function mapAgreementCompletionStateToProtocolStatus(
  completionState: AgreementCompletionState,
) {
  if (completionState === "pending_evidence") {
    return "needs_evidence";
  }

  if (completionState === "challenge_window_open") {
    return "challenge_window";
  }

  if (completionState === "reviewed_complete") {
    return "completion_reviewed";
  }

  if (completionState === "disputed_unresolved") {
    return "disputed_unresolved";
  }

  return "needs_human_review";
}

export function buildAgreementProtocolProposalRecord(
  terms: AgreementProtocolTerms,
): Record<string, unknown> {
  return {
    format: terms.source,
    cause_areas: [terms.privacyScope, terms.disclosureScope]
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean),
    offered_action: terms.structuredTerms,
    requested_action: terms.counterfactualDeclaration || terms.notes,
    baseline_statement: terms.noTradeBaseline,
    duration: terms.durationTerms,
    exit_conditions: terms.exitConditions,
    verification_method: terms.evidenceRule,
    public_description: terms.disclosureScope || terms.privacyScope || terms.notes,
  };
}

export function validateAgreementReviewProtocolTransition({
  currentCompletionState,
  currentReviewCaseStatus,
  nextReviewCaseStatus,
  terms,
  hasEvidenceItem,
  reviewerConfidence,
  disputeRecordCreated = false,
  humanReviewApproved = true,
  provenanceActivityRecorded = true,
}: {
  currentCompletionState: AgreementCompletionState;
  currentReviewCaseStatus: AgreementReviewCaseStatus;
  nextReviewCaseStatus: AgreementReviewCaseStatus;
  terms: AgreementProtocolTerms;
  hasEvidenceItem: boolean;
  reviewerConfidence: number | null;
  disputeRecordCreated?: boolean;
  humanReviewApproved?: boolean;
  provenanceActivityRecorded?: boolean;
}): MoralTradeProposalStateTransitionValidation {
  const from =
    currentReviewCaseStatus === "open" || currentReviewCaseStatus === "under_review"
      ? mapAgreementCompletionStateToProtocolStatus(currentCompletionState)
      : mapAgreementReviewStatusToProtocolStatus(currentReviewCaseStatus);
  const to = mapAgreementReviewStatusToProtocolStatus(nextReviewCaseStatus);
  const evidenceReviewed =
    to === "completion_reviewed" && hasEvidenceItem && Number(reviewerConfidence ?? 0) > 0;

  if (from === to) {
    return {
      status: "pass",
      from,
      to,
      allowed: true,
      missingRequiredFields: [],
      appliedRule: null,
      requiredChecks: ["no_state_change"],
      blockers: [],
    };
  }

  return validateMoralTradeProposalStateTransition({
    from,
    to,
    proposal: buildAgreementProtocolProposalRecord(terms),
    humanReviewApproved,
    evidenceReviewed,
    disputeRecordCreated,
    provenanceActivityRecorded,
    policyConflictCodes: to === "blocked" ? ["human_review_block"] : [],
  });
}
