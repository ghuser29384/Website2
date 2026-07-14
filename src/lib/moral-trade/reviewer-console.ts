export const MORAL_TRADE_REVIEWER_CONSOLE_CONTRACT_VERSION =
  "moral-trade-reviewer-console-v0.1-2026-06";
export const MORAL_TRADE_REVIEWER_CONSOLE_VALIDATOR_VERSION =
  "moral-trade-reviewer-console-validator-v0.1";

export type MoralTradeReviewerConsoleSurface =
  | "matched_trade_lock_review"
  | "participant_ui_copy_review"
  | "template_default_review"
  | "public_receipt_publication_review"
  | "appeal_or_dispute_review";

export type MoralTradeReviewerConsoleConflictState =
  | "none_declared"
  | "disclosed_nonblocking"
  | "missing"
  | "unresolved"
  | "conflicted"
  | "superseded";

export type MoralTradeReviewerConsoleAssignmentState =
  | "neutral_reviewer_assigned"
  | "panel_assigned"
  | "not_required_for_stage"
  | "missing"
  | "conflicted"
  | "stale"
  | "superseded";

export type MoralTradeReviewerConsolePolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeReviewerConsoleCheckStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "stale"
  | "superseded";

export type MoralTradeReviewerConsoleCheckKey =
  | "plain_language_copy"
  | "material_omission"
  | "task_card_single_primary_action"
  | "safe_template_default_disclosure"
  | "privacy_publication"
  | "recipient_association"
  | "content_moderation"
  | "verified_claims"
  | "direct_donation_parity_non_preference"
  | "net_personal_contribution"
  | "reimbursement_subsidy_disclosure"
  | "sensitive_action_redaction"
  | "publication_pressure"
  | "no_moral_score_language"
  | "anti_gamification"
  | "no_publicity_as_trade_term"
  | "verification_url_status"
  | "correction_revocation";

export interface MoralTradeReviewerConsoleCaseRecord {
  caseId: string;
  surface: MoralTradeReviewerConsoleSurface;
  subjectType: string;
  subjectRef: string;
  policySnapshotStatus: MoralTradeReviewerConsolePolicySnapshotStatus;
  reviewerConflictState: MoralTradeReviewerConsoleConflictState;
  neutralAssignmentState: MoralTradeReviewerConsoleAssignmentState;
  neutralAssignmentRef: string | null;
  reviewDecisionRef: string | null;
  marketplaceStateEventRef: string | null;
  checkedAt: string;
  expiresAt: string | null;
  reviewerIdentityPublic: boolean;
  reviewerNotesPublic: boolean;
  conflictFactsPublic: boolean;
}

export interface MoralTradeReviewerConsoleCheckResult {
  caseRef: string;
  checkKey: MoralTradeReviewerConsoleCheckKey;
  status: MoralTradeReviewerConsoleCheckStatus;
  policySnapshotStatus: MoralTradeReviewerConsolePolicySnapshotStatus;
  reviewDecisionRef: string | null;
  userFacingCategory: string;
  checkedAt: string;
  expiresAt: string | null;
  reviewerNotesPublic: boolean;
  rawEvidencePublic: boolean;
}

export interface MoralTradeReviewerConsoleEvaluationInput {
  surface: MoralTradeReviewerConsoleSurface;
  checkedAt?: string;
  cases: MoralTradeReviewerConsoleCaseRecord[];
  checkResults: MoralTradeReviewerConsoleCheckResult[];
}

export interface MoralTradeReviewerConsoleEvaluation {
  status: "pass" | "blocked";
  surface: MoralTradeReviewerConsoleSurface;
  checkedAt: string;
  caseCount: number;
  checkedRequirementCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeReviewerConsoleContract {
  version: typeof MORAL_TRADE_REVIEWER_CONSOLE_CONTRACT_VERSION;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  finalDecisionAuditRule: string;
  firstClassRecordTables: string[];
  requiredSurfaces: MoralTradeReviewerConsoleSurface[];
  releaseGateTestHooks: string[];
  conflictStates: MoralTradeReviewerConsoleConflictState[];
  assignmentStates: MoralTradeReviewerConsoleAssignmentState[];
  checkStatuses: MoralTradeReviewerConsoleCheckStatus[];
  requiredUiReviewChecks: MoralTradeReviewerConsoleCheckKey[];
  requiredPublicReceiptPublicationChecks: MoralTradeReviewerConsoleCheckKey[];
  sampleEvaluations: MoralTradeReviewerConsoleEvaluation[];
  contractTests: string[];
}

export interface MoralTradeReviewerConsoleValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-reviewer-console-contract";
  validatorVersion: typeof MORAL_TRADE_REVIEWER_CONSOLE_VALIDATOR_VERSION;
  contractVersion: typeof MORAL_TRADE_REVIEWER_CONSOLE_CONTRACT_VERSION;
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
  blockers: string[];
}

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_reviewer_console_cases",
  "moral_trade_reviewer_console_check_results",
  "moral_trade_reviewer_console_panel_assignments",
  "moral_trade_public_receipt_publication_reviews",
  "moral_trade_review_decisions",
  "moral_trade_marketplace_state_events",
] as const;

const REQUIRED_SURFACES: MoralTradeReviewerConsoleSurface[] = [
  "matched_trade_lock_review",
  "participant_ui_copy_review",
  "template_default_review",
  "public_receipt_publication_review",
  "appeal_or_dispute_review",
];

const RELEASE_GATE_TEST_HOOKS = [
  "reviewer_conflict_tests",
  "neutral_reviewer_approval",
  "plain_language_copy_contract_test",
  "participant_task_card_simplification_test",
  "safe_template_default_disclosure_test",
  "public_receipt_card_publication_test",
  "public_receipt_net_personal_contribution_test",
  "public_receipt_anti_gamification_test",
  "public_receipt_authenticity_revocation_test",
  "public_receipt_social_pressure_sensitive_action_test",
] as const;

const UI_REVIEW_CHECKS: MoralTradeReviewerConsoleCheckKey[] = [
  "plain_language_copy",
  "material_omission",
  "task_card_single_primary_action",
  "safe_template_default_disclosure",
];

const PUBLIC_RECEIPT_PUBLICATION_CHECKS: MoralTradeReviewerConsoleCheckKey[] = [
  "privacy_publication",
  "recipient_association",
  "content_moderation",
  "verified_claims",
  "direct_donation_parity_non_preference",
  "net_personal_contribution",
  "reimbursement_subsidy_disclosure",
  "sensitive_action_redaction",
  "publication_pressure",
  "no_moral_score_language",
  "anti_gamification",
  "no_publicity_as_trade_term",
  "verification_url_status",
  "correction_revocation",
];

const CONFLICT_STATES: MoralTradeReviewerConsoleConflictState[] = [
  "none_declared",
  "disclosed_nonblocking",
  "missing",
  "unresolved",
  "conflicted",
  "superseded",
];

const ASSIGNMENT_STATES: MoralTradeReviewerConsoleAssignmentState[] = [
  "neutral_reviewer_assigned",
  "panel_assigned",
  "not_required_for_stage",
  "missing",
  "conflicted",
  "stale",
  "superseded",
];

const CHECK_STATUSES: MoralTradeReviewerConsoleCheckStatus[] = [
  "passed",
  "not_required_for_stage",
  "missing",
  "under_review",
  "failed",
  "stale",
  "superseded",
];

const CONTRACT_TESTS = [
  "reviewer_console_contract_validator",
  "reviewer_console_conflict_assignment_test",
  "reviewer_console_plain_language_copy_test",
  "reviewer_console_task_card_default_disclosure_test",
  "reviewer_console_public_receipt_publication_test",
  "reviewer_console_private_notes_redaction_test",
  "reviewer_console_route_contract",
] as const;

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return hasText(value) && Number.isFinite(Date.parse(value));
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function isExpired(expiresAt: string | null, checkedAt: string) {
  return isIsoDate(expiresAt) && Date.parse(expiresAt) < Date.parse(checkedAt);
}

function requiredChecksForSurface(surface: MoralTradeReviewerConsoleSurface) {
  if (surface === "public_receipt_publication_review") {
    return [...UI_REVIEW_CHECKS, ...PUBLIC_RECEIPT_PUBLICATION_CHECKS];
  }

  if (
    surface === "participant_ui_copy_review" ||
    surface === "template_default_review" ||
    surface === "matched_trade_lock_review"
  ) {
    return [...UI_REVIEW_CHECKS];
  }

  return ["material_omission"] satisfies MoralTradeReviewerConsoleCheckKey[];
}

function blockerCategory(blocker: string) {
  if (blocker.includes("conflict")) return "Reviewer conflict state is not non-blocking";
  if (blocker.includes("neutral_assignment")) return "Neutral reviewer or panel assignment is missing";
  if (blocker.includes("plain_language") || blocker.includes("material_omission")) {
    return "Participant copy needs reviewer checklist approval";
  }
  if (blocker.includes("task_card") || blocker.includes("safe_template")) {
    return "Participant task-card and template-default checks are incomplete";
  }
  if (blocker.includes("receipt") || blocker.includes("publication") || blocker.includes("verified_claims")) {
    return "Public receipt publication checks are incomplete";
  }
  if (blocker.includes("private") || blocker.includes("public")) {
    return "Reviewer-private facts must remain private";
  }
  if (blocker.includes("marketplace_state_event") || blocker.includes("review_decision")) {
    return "Reviewer outcome needs an append-only decision audit trail";
  }

  return "Reviewer console evidence is incomplete";
}

function validateCase(
  record: MoralTradeReviewerConsoleCaseRecord,
  surface: MoralTradeReviewerConsoleSurface,
  checkedAt: string,
) {
  const blockers: string[] = [];
  const caseId = hasText(record.caseId) ? record.caseId : "unknown-case";

  if (record.surface !== surface) {
    blockers.push(`reviewer_console_surface_mismatch:${caseId}:${record.surface}`);
  }
  if (!hasText(record.subjectType) || !hasText(record.subjectRef)) {
    blockers.push(`reviewer_console_subject_missing:${caseId}`);
  }
  if (record.policySnapshotStatus !== "resolved_immutable") {
    blockers.push(`reviewer_console_policy_not_immutable:${caseId}:${record.policySnapshotStatus}`);
  }
  if (record.reviewerConflictState === "missing") {
    blockers.push(`reviewer_console_conflict_missing:${caseId}`);
  }
  if (record.reviewerConflictState === "unresolved" || record.reviewerConflictState === "conflicted") {
    blockers.push(`reviewer_console_conflict_blocking:${caseId}:${record.reviewerConflictState}`);
  }
  if (record.reviewerConflictState === "superseded") {
    blockers.push(`reviewer_console_conflict_superseded:${caseId}`);
  }
  if (
    record.neutralAssignmentState !== "neutral_reviewer_assigned" &&
    record.neutralAssignmentState !== "panel_assigned"
  ) {
    blockers.push(`reviewer_console_neutral_assignment_missing:${caseId}:${record.neutralAssignmentState}`);
  }
  if (!hasText(record.neutralAssignmentRef)) {
    blockers.push(`reviewer_console_neutral_assignment_ref_missing:${caseId}`);
  }
  if (!isIsoDate(record.checkedAt)) {
    blockers.push(`reviewer_console_checked_at_invalid:${caseId}`);
  }
  if (isExpired(record.expiresAt, checkedAt)) {
    blockers.push(`reviewer_console_case_expired:${caseId}`);
  }
  if (record.reviewerIdentityPublic) {
    blockers.push(`reviewer_console_reviewer_identity_public:${caseId}`);
  }
  if (record.reviewerNotesPublic) {
    blockers.push(`reviewer_console_reviewer_notes_public:${caseId}`);
  }
  if (record.conflictFactsPublic) {
    blockers.push(`reviewer_console_conflict_facts_public:${caseId}`);
  }
  if (!hasText(record.reviewDecisionRef)) {
    blockers.push(`reviewer_console_review_decision_missing:${caseId}`);
  }
  if (!hasText(record.marketplaceStateEventRef)) {
    blockers.push(`reviewer_console_marketplace_state_event_missing:${caseId}`);
  }

  return blockers;
}

function validateCheck(
  check: MoralTradeReviewerConsoleCheckResult,
  checkedAt: string,
) {
  const blockers: string[] = [];
  const checkId = `${check.caseRef}:${check.checkKey}`;

  if (!hasText(check.caseRef)) blockers.push(`reviewer_console_check_case_missing:${check.checkKey}`);
  if (check.status !== "passed" && check.status !== "not_required_for_stage") {
    blockers.push(`reviewer_console_check_not_passed:${checkId}:${check.status}`);
  }
  if (check.policySnapshotStatus !== "resolved_immutable") {
    blockers.push(`reviewer_console_check_policy_not_immutable:${checkId}:${check.policySnapshotStatus}`);
  }
  if (check.status === "not_required_for_stage" && !/not required/i.test(check.userFacingCategory)) {
    blockers.push(`reviewer_console_not_required_reason_missing:${checkId}`);
  }
  if (!hasText(check.reviewDecisionRef)) {
    blockers.push(`reviewer_console_check_decision_ref_missing:${checkId}`);
  }
  if (!hasText(check.userFacingCategory)) {
    blockers.push(`reviewer_console_check_user_category_missing:${checkId}`);
  }
  if (!isIsoDate(check.checkedAt)) {
    blockers.push(`reviewer_console_check_checked_at_invalid:${checkId}`);
  }
  if (isExpired(check.expiresAt, checkedAt)) {
    blockers.push(`reviewer_console_check_expired:${checkId}`);
  }
  if (check.reviewerNotesPublic) {
    blockers.push(`reviewer_console_check_reviewer_notes_public:${checkId}`);
  }
  if (check.rawEvidencePublic) {
    blockers.push(`reviewer_console_check_raw_evidence_public:${checkId}`);
  }

  return blockers;
}

export function evaluateMoralTradeReviewerConsole(
  input: MoralTradeReviewerConsoleEvaluationInput,
): MoralTradeReviewerConsoleEvaluation {
  const checkedAt = input.checkedAt || new Date().toISOString();
  const blockers: string[] = [];
  const surfaceCases = input.cases.filter((entry) => entry.surface === input.surface);
  const caseRecord = surfaceCases[0] ?? null;

  if (!caseRecord) {
    blockers.push(`reviewer_console_case_missing:${input.surface}`);
  } else {
    blockers.push(...validateCase(caseRecord, input.surface, checkedAt));
  }

  const requiredChecks = requiredChecksForSurface(input.surface);
  const checkResultsByKey = new Map<MoralTradeReviewerConsoleCheckKey, MoralTradeReviewerConsoleCheckResult>();
  for (const result of input.checkResults) {
    if (!caseRecord || result.caseRef === caseRecord.caseId) {
      checkResultsByKey.set(result.checkKey, result);
    }
  }

  for (const checkKey of requiredChecks) {
    const result = checkResultsByKey.get(checkKey);
    if (!result) {
      blockers.push(`reviewer_console_check_missing:${input.surface}:${checkKey}`);
    } else {
      blockers.push(...validateCheck(result, checkedAt));
    }
  }

  const uniqueBlockers = unique(blockers);

  return {
    blockers: uniqueBlockers,
    caseCount: surfaceCases.length,
    checkedAt,
    checkedRequirementCount: requiredChecks.length,
    status: uniqueBlockers.length ? "blocked" : "pass",
    surface: input.surface,
    userFacingBlockerCategories: unique(uniqueBlockers.map(blockerCategory)),
  };
}

function sampleCase(
  overrides: Partial<MoralTradeReviewerConsoleCaseRecord> = {},
): MoralTradeReviewerConsoleCaseRecord {
  return {
    caseId: "reviewer-console-case:sample",
    checkedAt: "2026-06-25T12:00:00.000Z",
    conflictFactsPublic: false,
    expiresAt: "2026-07-25T12:00:00.000Z",
    marketplaceStateEventRef: "marketplace-state-event:reviewer-console-sample",
    neutralAssignmentRef: "neutral-panel:sample",
    neutralAssignmentState: "panel_assigned",
    policySnapshotStatus: "resolved_immutable",
    reviewDecisionRef: "review-decision:sample",
    reviewerConflictState: "none_declared",
    reviewerIdentityPublic: false,
    reviewerNotesPublic: false,
    subjectRef: "public-receipt:sample",
    subjectType: "public_receipt_card",
    surface: "public_receipt_publication_review",
    ...overrides,
  };
}

function sampleCheck(
  checkKey: MoralTradeReviewerConsoleCheckKey,
  overrides: Partial<MoralTradeReviewerConsoleCheckResult> = {},
): MoralTradeReviewerConsoleCheckResult {
  return {
    caseRef: "reviewer-console-case:sample",
    checkedAt: "2026-06-25T12:00:00.000Z",
    checkKey,
    expiresAt: "2026-07-25T12:00:00.000Z",
    policySnapshotStatus: "resolved_immutable",
    rawEvidencePublic: false,
    reviewDecisionRef: "review-decision:sample",
    reviewerNotesPublic: false,
    status: "passed",
    userFacingCategory: `Reviewed ${checkKey.replace(/_/g, " ")}`,
    ...overrides,
  };
}

function sampleInput(
  overrides: Partial<MoralTradeReviewerConsoleEvaluationInput> = {},
): MoralTradeReviewerConsoleEvaluationInput {
  return {
    cases: [sampleCase()],
    checkedAt: "2026-06-25T12:05:00.000Z",
    checkResults: requiredChecksForSurface("public_receipt_publication_review").map((checkKey) =>
      sampleCheck(checkKey),
    ),
    surface: "public_receipt_publication_review",
    ...overrides,
  };
}

export function getMoralTradeReviewerConsoleContract(): MoralTradeReviewerConsoleContract {
  const passingSample = evaluateMoralTradeReviewerConsole(sampleInput());
  const blockedSample = evaluateMoralTradeReviewerConsole(
    sampleInput({
      cases: [
        sampleCase({
          conflictFactsPublic: true,
          marketplaceStateEventRef: null,
          neutralAssignmentRef: null,
          neutralAssignmentState: "missing",
          reviewDecisionRef: null,
          reviewerConflictState: "conflicted",
          reviewerIdentityPublic: true,
          reviewerNotesPublic: true,
        }),
      ],
      checkResults: [
        sampleCheck("plain_language_copy", {
          rawEvidencePublic: true,
          reviewerNotesPublic: true,
          status: "failed",
        }),
      ],
    }),
  );

  return {
    assignmentStates: [...ASSIGNMENT_STATES],
    checkStatuses: [...CHECK_STATUSES],
    conflictStates: [...CONFLICT_STATES],
    contractTests: [...CONTRACT_TESTS],
    failClosedRule:
      "Reviewer-console decisions fail closed unless conflict state, neutral reviewer or panel assignment, immutable policy snapshots, required checklist results, review_decision reference, and marketplace_state_event audit reference are present and non-blocking.",
    finalDecisionAuditRule:
      "Reviewers cannot silently edit clearing results, payment states, evidence states, agreement statuses, public receipt publication, or participant-facing copy; changes require an append-only review_decision or marketplace_state_event record.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    privacyBoundary:
      "Public contract output exposes only status categories and checklist keys; reviewer identities, conflict facts, private reviewer notes, raw evidence, participant identity hashes, and participant-specific rows stay private.",
    purpose:
      "Fail-closed reviewer-console extension contract for moraltrade82 conflict, neutral-review, participant-copy, task-card, safe-default, and public-receipt publication checks.",
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    requiredPublicReceiptPublicationChecks: [...PUBLIC_RECEIPT_PUBLICATION_CHECKS],
    requiredSurfaces: [...REQUIRED_SURFACES],
    requiredUiReviewChecks: [...UI_REVIEW_CHECKS],
    sampleEvaluations: [passingSample, blockedSample],
    version: MORAL_TRADE_REVIEWER_CONSOLE_CONTRACT_VERSION,
  };
}

function check(
  id: string,
  label: string,
  pass: boolean,
  evidence: string,
): MoralTradeReviewerConsoleValidation["checks"][number] {
  return { id, label, status: pass ? "pass" : "fail", evidence };
}

export function validateMoralTradeReviewerConsoleContract(
  contract = getMoralTradeReviewerConsoleContract(),
): MoralTradeReviewerConsoleValidation {
  const checks = [
    check(
      "first-class-records",
      "Contract names reviewer-console cases, checklist results, panel assignments, receipt reviews, decisions, and state events",
      FIRST_CLASS_RECORD_TABLES.every((table) => contract.firstClassRecordTables.includes(table)),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "release-gate-hooks",
      "Contract maps reviewer-console work to moraltrade82 release-gate hooks",
      RELEASE_GATE_TEST_HOOKS.every((hook) => contract.releaseGateTestHooks.includes(hook)),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "conflict-neutral-assignment",
      "Contract requires conflict screening and neutral reviewer or panel assignment",
      /conflict state/i.test(contract.failClosedRule) &&
        /neutral reviewer or panel assignment/i.test(contract.failClosedRule),
      contract.failClosedRule,
    ),
    check(
      "ui-copy-checks",
      "Contract covers plain-language, material-omission, task-card, and safe-template-default checks",
      UI_REVIEW_CHECKS.every((checkKey) => contract.requiredUiReviewChecks.includes(checkKey)),
      contract.requiredUiReviewChecks.join(", "),
    ),
    check(
      "public-receipt-publication-checks",
      "Contract covers public receipt privacy, claim, parity, net attribution, pressure, anti-gamification, verification, and revocation checks",
      PUBLIC_RECEIPT_PUBLICATION_CHECKS.every((checkKey) =>
        contract.requiredPublicReceiptPublicationChecks.includes(checkKey),
      ),
      contract.requiredPublicReceiptPublicationChecks.join(", "),
    ),
    check(
      "audit-rule",
      "Contract prevents silent reviewer edits by requiring review decisions or marketplace state events",
      /silently edit/i.test(contract.finalDecisionAuditRule) &&
        /review_decision/i.test(contract.finalDecisionAuditRule) &&
        /marketplace_state_event/i.test(contract.finalDecisionAuditRule),
      contract.finalDecisionAuditRule,
    ),
    check(
      "privacy-boundary",
      "Contract keeps reviewer identities, conflict facts, notes, raw evidence, and participant-specific rows private",
      /reviewer identities/i.test(contract.privacyBoundary) &&
        /conflict facts/i.test(contract.privacyBoundary) &&
        /private reviewer notes/i.test(contract.privacyBoundary) &&
        /raw evidence/i.test(contract.privacyBoundary) &&
        /participant-specific rows/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
    check(
      "sample-evaluations",
      "Samples include passing and blocked reviewer-console evaluations",
      contract.sampleEvaluations.some((entry) => entry.status === "pass") &&
        contract.sampleEvaluations.some((entry) => entry.status === "blocked"),
      contract.sampleEvaluations
        .map((entry) => `${entry.surface}:${entry.status}:${entry.blockers.length}`)
        .join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    blockers,
    checks,
    contractVersion: contract.version,
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-reviewer-console-contract",
    validatorVersion: MORAL_TRADE_REVIEWER_CONSOLE_VALIDATOR_VERSION,
  };
}
