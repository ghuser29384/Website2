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

export interface AgreementEvidenceReviewReadinessInput {
  hasEvidenceItem: boolean;
  reviewerConfidence: number | null;
  artifactLinked?: boolean;
  claimScopeAligned?: boolean;
  proofUniquenessChecked?: boolean;
  freshnessReviewed?: boolean;
  agentLinksRecorded?: boolean;
}

export interface AgreementEvidenceReviewReadiness {
  evidenceReviewed: boolean;
  requiredChecks: string[];
  blockers: string[];
}

const AGREEMENT_EVIDENCE_REVIEW_CHECKS = [
  {
    key: "evidence_item_linked",
    blocker: "evidence_item_required_before:completion_reviewed",
    isReady: (input: AgreementEvidenceReviewReadinessInput) => input.hasEvidenceItem,
  },
  {
    key: "reviewer_confidence_recorded",
    blocker: "reviewer_confidence_required_before:completion_reviewed",
    isReady: (input: AgreementEvidenceReviewReadinessInput) =>
      Number(input.reviewerConfidence ?? 0) > 0,
  },
  {
    key: "evidence_artifact_linked",
    blocker: "evidence_artifact_link_required_before:completion_reviewed",
    isReady: (input: AgreementEvidenceReviewReadinessInput) => input.artifactLinked === true,
  },
  {
    key: "claim_scope_aligned",
    blocker: "evidence_scope_alignment_required_before:completion_reviewed",
    isReady: (input: AgreementEvidenceReviewReadinessInput) => input.claimScopeAligned === true,
  },
  {
    key: "proof_uniqueness_checked",
    blocker: "proof_uniqueness_check_required_before:completion_reviewed",
    isReady: (input: AgreementEvidenceReviewReadinessInput) =>
      input.proofUniquenessChecked === true,
  },
  {
    key: "evidence_freshness_reviewed",
    blocker: "evidence_freshness_review_required_before:completion_reviewed",
    isReady: (input: AgreementEvidenceReviewReadinessInput) => input.freshnessReviewed === true,
  },
  {
    key: "evidence_agent_links_recorded",
    blocker: "evidence_agent_links_required_before:completion_reviewed",
    isReady: (input: AgreementEvidenceReviewReadinessInput) => input.agentLinksRecorded === true,
  },
] as const;

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

export function validateAgreementEvidenceReviewReadiness(
  input: AgreementEvidenceReviewReadinessInput,
): AgreementEvidenceReviewReadiness {
  const blockers = AGREEMENT_EVIDENCE_REVIEW_CHECKS.filter((check) => !check.isReady(input)).map(
    (check) => check.blocker,
  );

  return {
    evidenceReviewed: blockers.length === 0,
    requiredChecks: AGREEMENT_EVIDENCE_REVIEW_CHECKS.map((check) => check.key),
    blockers,
  };
}

export function validateAgreementReviewProtocolTransition({
  currentCompletionState,
  currentReviewCaseStatus,
  nextReviewCaseStatus,
  terms,
  hasEvidenceItem,
  reviewerConfidence,
  evidenceReviewReadiness,
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
  evidenceReviewReadiness?: AgreementEvidenceReviewReadinessInput;
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

  const readiness =
    to === "completion_reviewed"
      ? validateAgreementEvidenceReviewReadiness(
          evidenceReviewReadiness ?? {
            hasEvidenceItem,
            reviewerConfidence,
          },
        )
      : null;

  const transition = validateMoralTradeProposalStateTransition({
    from,
    to,
    proposal: buildAgreementProtocolProposalRecord(terms),
    humanReviewApproved,
    evidenceReviewed: readiness ? readiness.evidenceReviewed : evidenceReviewed,
    disputeRecordCreated,
    provenanceActivityRecorded,
    policyConflictCodes: to === "blocked" ? ["human_review_block"] : [],
  });

  if (!readiness || readiness.blockers.length === 0) {
    return transition;
  }

  return {
    ...transition,
    status: "fail",
    allowed: false,
    requiredChecks: [...new Set([...transition.requiredChecks, ...readiness.requiredChecks])],
    blockers: [...new Set([...transition.blockers, ...readiness.blockers])],
  };
}
