import type { BackgroundAccountSecuritySummary } from "@/lib/background-account-security";

export const ADMIN_MFA_REQUIRED_MESSAGE =
  "Admin access requires an active authenticator MFA session before operator queues or review actions can be used.";

export type AgreementReviewerConflictState =
  | "not_checked"
  | "no_conflict_declared"
  | "possible_conflict"
  | "conflict_disclosed"
  | "recused";

export type NeutralReviewAssignmentState =
  | "unassigned"
  | "operator_review_only"
  | "neutral_reviewer_assigned"
  | "neutral_panel_assigned"
  | "not_required_for_stage";

export type ReviewerConsoleGateStatus = "pass" | "needs_review" | "blocked";

export interface ReviewerConsoleGate {
  key: string;
  label: string;
  status: ReviewerConsoleGateStatus;
  summary: string;
  nextAction: string;
  blockerCodes: string[];
}

export interface AgreementReviewerConsolePreviewInput {
  appealReason?: string | null;
  assignedReviewerId?: string | null;
  conflictOfInterestNotes?: string | null;
  evidenceItemAttached?: boolean;
  neutralReviewAssignment?: string | null;
  reviewPanelNotes?: string | null;
  reviewScope?: string | null;
  reviewerConflictState?: string | null;
  reviewerRole?: string | null;
  status?: string | null;
}

export interface AgreementReviewerConsolePreview {
  schemaVersion: "agreement-reviewer-console-preview-v1";
  releaseStage: "reviewer_console_extension";
  reviewerConflictState: AgreementReviewerConflictState;
  neutralReviewAssignment: NeutralReviewAssignmentState;
  neutralReviewRequired: boolean;
  hasAssignedReviewer: boolean;
  hasPanelNotes: boolean;
  hasReviewScope: boolean;
  hasEvidenceItem: boolean;
  readyForReviewerAction: boolean;
  canMarkReviewedComplete: boolean;
  statusLabel: string;
  gates: ReviewerConsoleGate[];
}

export type AdminOperatorAccessReason =
  | "allowed"
  | "admin_email_required"
  | "admin_email_not_allowed"
  | "mfa_status_unavailable"
  | "mfa_factor_required"
  | "mfa_step_up_required";

export interface AdminOperatorAccessDecision {
  allowed: boolean;
  message: string;
  reason: AdminOperatorAccessReason;
}

export function normalizeAgreementReviewerConflictState(
  value: string | null | undefined,
): AgreementReviewerConflictState {
  if (
    value === "no_conflict_declared" ||
    value === "possible_conflict" ||
    value === "conflict_disclosed" ||
    value === "recused"
  ) {
    return value;
  }

  return "not_checked";
}

export function normalizeNeutralReviewAssignment(
  value: string | null | undefined,
): NeutralReviewAssignmentState {
  if (
    value === "operator_review_only" ||
    value === "neutral_reviewer_assigned" ||
    value === "neutral_panel_assigned" ||
    value === "not_required_for_stage"
  ) {
    return value;
  }

  return "unassigned";
}

function reviewerConsoleGate({
  blockerCodes = [],
  key,
  label,
  nextAction,
  status,
  summary,
}: ReviewerConsoleGate): ReviewerConsoleGate {
  return {
    blockerCodes,
    key,
    label,
    nextAction,
    status,
    summary,
  };
}

function isNeutralAssignmentPresent(assignment: NeutralReviewAssignmentState) {
  return assignment === "neutral_reviewer_assigned" || assignment === "neutral_panel_assigned";
}

export function buildAgreementReviewerConsolePreview(
  input: AgreementReviewerConsolePreviewInput,
): AgreementReviewerConsolePreview {
  const reviewerConflictState = normalizeAgreementReviewerConflictState(input.reviewerConflictState);
  const neutralReviewAssignment = normalizeNeutralReviewAssignment(input.neutralReviewAssignment);
  const normalizedStatus = input.status?.trim() ?? "";
  const hasAssignedReviewer = Boolean(input.assignedReviewerId?.trim());
  const hasPanelNotes = Boolean(input.reviewPanelNotes?.trim());
  const hasReviewScope = Boolean(input.reviewScope?.trim());
  const hasEvidenceItem = input.evidenceItemAttached === true;
  const hasAppealReason = Boolean(input.appealReason?.trim());
  const conflictNotesPresent = Boolean(input.conflictOfInterestNotes?.trim());
  const neutralReviewRequired =
    hasAppealReason ||
    ["appealed", "challenge_window_open", "disputed_unresolved"].includes(normalizedStatus) ||
    reviewerConflictState === "possible_conflict" ||
    reviewerConflictState === "conflict_disclosed" ||
    reviewerConflictState === "recused";
  const neutralAssignmentPresent = isNeutralAssignmentPresent(neutralReviewAssignment);
  const routineOperatorOnlyAllowed =
    !neutralReviewRequired && neutralReviewAssignment === "operator_review_only";

  const assignmentStatus: ReviewerConsoleGateStatus = !hasAssignedReviewer
    ? "blocked"
    : neutralReviewRequired && !neutralAssignmentPresent
      ? "blocked"
      : neutralReviewAssignment === "neutral_panel_assigned" && !hasPanelNotes
        ? "needs_review"
        : neutralReviewAssignment === "unassigned"
          ? "needs_review"
          : "pass";

  const conflictStatus: ReviewerConsoleGateStatus =
    reviewerConflictState === "no_conflict_declared"
      ? "pass"
      : reviewerConflictState === "not_checked"
        ? "needs_review"
        : neutralAssignmentPresent && conflictNotesPresent
          ? "pass"
          : "blocked";

  const scopeStatus: ReviewerConsoleGateStatus =
    hasReviewScope && hasEvidenceItem ? "pass" : "needs_review";

  const neutralGateStatus: ReviewerConsoleGateStatus = neutralReviewRequired
    ? neutralAssignmentPresent && hasAssignedReviewer
      ? "pass"
      : "blocked"
    : neutralReviewAssignment === "not_required_for_stage" || routineOperatorOnlyAllowed || neutralAssignmentPresent
      ? "pass"
      : "needs_review";

  const gates = [
    reviewerConsoleGate({
      key: "reviewer-assignment",
      label: "Reviewer assignment",
      status: assignmentStatus,
      summary: hasAssignedReviewer
        ? "A reviewer is assigned to the case."
        : "No reviewer is assigned to the case.",
      nextAction: hasAssignedReviewer
        ? "Keep the assigned reviewer visible on the review case."
        : "Assign a reviewer before changing evidence or completion state.",
      blockerCodes: hasAssignedReviewer ? [] : ["reviewer_assignment_missing"],
    }),
    reviewerConsoleGate({
      key: "conflict-of-interest",
      label: "Conflict-of-interest state",
      status: conflictStatus,
      summary:
        reviewerConflictState === "no_conflict_declared"
          ? "The reviewer has declared no known conflict."
          : reviewerConflictState === "not_checked"
            ? "Conflict status has not been checked."
            : "A possible or disclosed conflict requires notes and neutral handling.",
      nextAction:
        conflictStatus === "pass"
          ? "Keep conflict status and notes current before final review."
          : "Record a conflict check, recusal, or neutral-review assignment before final review.",
      blockerCodes:
        conflictStatus === "blocked"
          ? ["reviewer_conflict_unresolved"]
          : conflictStatus === "needs_review"
            ? ["reviewer_conflict_check_required"]
            : [],
    }),
    reviewerConsoleGate({
      key: "neutral-review-assignment",
      label: "Neutral reviewer or panel assignment",
      status: neutralGateStatus,
      summary: neutralReviewRequired
        ? "This case requires neutral reviewer or panel handling."
        : "Neutral review is not required for the current stage unless new conflicts or appeals appear.",
      nextAction:
        neutralGateStatus === "pass"
          ? "Preserve the neutral assignment snapshot with the review case."
          : "Assign a neutral reviewer or panel, or mark neutral review not required for this stage.",
      blockerCodes: neutralGateStatus === "blocked" ? ["neutral_review_assignment_missing"] : [],
    }),
    reviewerConsoleGate({
      key: "review-scope-evidence",
      label: "Review scope and evidence",
      status: scopeStatus,
      summary: hasReviewScope && hasEvidenceItem
        ? "The review case has a scope and linked evidence item."
        : "The review case needs an exact scope and linked evidence before final completion.",
      nextAction:
        scopeStatus === "pass"
          ? "Review only the stated claim scope."
          : "Attach evidence and state the exact claim under review.",
      blockerCodes:
        scopeStatus === "needs_review" ? ["review_scope_or_evidence_incomplete"] : [],
    }),
  ];
  const readyForReviewerAction = gates.every((gate) => gate.status === "pass");

  return {
    schemaVersion: "agreement-reviewer-console-preview-v1",
    releaseStage: "reviewer_console_extension",
    reviewerConflictState,
    neutralReviewAssignment,
    neutralReviewRequired,
    hasAssignedReviewer,
    hasPanelNotes,
    hasReviewScope,
    hasEvidenceItem,
    readyForReviewerAction,
    canMarkReviewedComplete: readyForReviewerAction,
    statusLabel: readyForReviewerAction
      ? "Reviewer console ready"
      : "Reviewer console needs neutralization or scope review",
    gates,
  };
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email.trim().toLowerCase());
}

export function evaluateAdminOperatorAccess({
  adminEmails = getAdminEmails(),
  email,
  mfaSummary,
}: {
  adminEmails?: string[];
  email: string | null | undefined;
  mfaSummary: BackgroundAccountSecuritySummary | null;
}): AdminOperatorAccessDecision {
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedAdminEmails = new Set(
    adminEmails.map((entry) => entry.trim().toLowerCase()).filter(Boolean),
  );

  if (!normalizedEmail) {
    return {
      allowed: false,
      message: "Sign in with an admin email before using operator routes.",
      reason: "admin_email_required",
    };
  }

  if (!normalizedAdminEmails.has(normalizedEmail)) {
    return {
      allowed: false,
      message: "Admin access requires an email listed in ADMIN_EMAILS.",
      reason: "admin_email_not_allowed",
    };
  }

  if (!mfaSummary || mfaSummary.error) {
    return {
      allowed: false,
      message:
        "Admin MFA status could not be verified. Re-authenticate, then verify an authenticator factor before using operator routes.",
      reason: "mfa_status_unavailable",
    };
  }

  if (mfaSummary.verifiedTotpCount < 1) {
    return {
      allowed: false,
      message:
        "Admin access requires at least one verified authenticator app factor. Set it up from the dashboard account-security panel.",
      reason: "mfa_factor_required",
    };
  }

  if (mfaSummary.currentLevel !== "aal2") {
    return {
      allowed: false,
      message: ADMIN_MFA_REQUIRED_MESSAGE,
      reason: "mfa_step_up_required",
    };
  }

  return {
    allowed: true,
    message: "Admin access verified with an active MFA session.",
    reason: "allowed",
  };
}
