export const MORAL_TRADE_USER_FACING_STATUS_CONTRACT_VERSION =
  "moral-trade-user-facing-status-v0.1-2026-06";
export const MORAL_TRADE_USER_FACING_STATUS_VALIDATOR_VERSION =
  "moral-trade-user-facing-status-validator-v0.1";

export type MoralTradeUserFacingStatusSubjectType =
  | "offset_offer"
  | "pledge_swap_offer"
  | "cleared_trade_agreement"
  | "payout_milestone"
  | "evidence_record"
  | "dispute_case"
  | "appeal_case"
  | "payment_event"
  | "privacy_grant"
  | "contact_interaction_record"
  | "abuse_report_record"
  | "public_receipt_card_record";

export type MoralTradeUserFacingStatusValue =
  | "ready_to_preview"
  | "needs_your_confirmation"
  | "waiting_for_review"
  | "blocked_safety_legal_privacy"
  | "payment_not_authorized"
  | "payout_not_releasable_yet"
  | "closed_refunded_cancelled";

export type MoralTradeUserFacingMoneyEffect =
  | "none"
  | "authorization_not_started"
  | "authorization_pending"
  | "authorization_blocked"
  | "captured_not_releasable"
  | "refund_or_cancellation_pending"
  | "closed_no_money_movement";

export type MoralTradeUserFacingObligationEffect =
  | "none"
  | "draft_only"
  | "confirmation_required"
  | "locked_but_not_releasable"
  | "released_from_future_obligations"
  | "closed_no_future_obligations";

export type MoralTradeUserFacingPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradeUserFacingMaterialDisclosureState {
  evidenceBurdenShown: boolean;
  failureRefundBehaviorShown: boolean;
  maximumExposureShown: boolean;
  noTradeComparisonShown: boolean;
  privacyChangeShown: boolean;
  remainingUncertaintyShown: boolean;
}

export interface MoralTradeUserFacingStatusRecord {
  appealPath: string | null;
  correctionPath: string | null;
  detailsDrawerAvailable: boolean;
  forbiddenTermsPresent: string[];
  keyFacts: string[];
  materialDisclosures: MoralTradeUserFacingMaterialDisclosureState;
  moneyEffect: MoralTradeUserFacingMoneyEffect;
  nextAction: string;
  obligationEffect: MoralTradeUserFacingObligationEffect;
  policySnapshotStatus: MoralTradeUserFacingPolicySnapshotStatus;
  privateDetailsRedacted: boolean;
  safeReasonCategory: string;
  sourceControlRefs: string[];
  status: MoralTradeUserFacingStatusValue;
  statusPolicyRef: string;
  statusRecordRef: string;
  subjectRef: string;
  subjectType: MoralTradeUserFacingStatusSubjectType;
  summary: string;
}

export interface MoralTradeUserFacingStatusEvaluationInput {
  checkedAt?: string;
  records: MoralTradeUserFacingStatusRecord[];
  requiredSubjectTypes?: MoralTradeUserFacingStatusSubjectType[];
}

export interface MoralTradeUserFacingStatusEvaluation {
  status: "pass" | "blocked";
  checkedAt: string;
  recordCount: number;
  blockedRecordCount: number;
  coveredSubjectTypes: MoralTradeUserFacingStatusSubjectType[];
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeUserFacingStatusContract {
  version: typeof MORAL_TRADE_USER_FACING_STATUS_CONTRACT_VERSION;
  purpose: string;
  failClosedRule: string;
  plainLanguageRule: string;
  privacyBoundary: string;
  materialDisclosureRule: string;
  appealCorrectionRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  allowedStatuses: MoralTradeUserFacingStatusValue[];
  subjectTypes: MoralTradeUserFacingStatusSubjectType[];
  moneyEffects: MoralTradeUserFacingMoneyEffect[];
  obligationEffects: MoralTradeUserFacingObligationEffect[];
  forbiddenPrimaryCopyTerms: string[];
  releaseGateTestHooks: string[];
  migrationNames: string[];
  contractTests: string[];
  sampleEvaluations: MoralTradeUserFacingStatusEvaluation[];
}

export interface MoralTradeUserFacingStatusValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-user-facing-status-contract";
  validatorVersion: typeof MORAL_TRADE_USER_FACING_STATUS_VALIDATOR_VERSION;
  contractVersion: typeof MORAL_TRADE_USER_FACING_STATUS_CONTRACT_VERSION;
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
  blockers: string[];
}

const SUBJECT_TYPES = [
  "offset_offer",
  "pledge_swap_offer",
  "cleared_trade_agreement",
  "payout_milestone",
  "evidence_record",
  "dispute_case",
  "appeal_case",
  "payment_event",
  "privacy_grant",
  "contact_interaction_record",
  "abuse_report_record",
  "public_receipt_card_record",
] as const satisfies readonly MoralTradeUserFacingStatusSubjectType[];

const REQUIRED_SUBJECT_TYPES = [
  "offset_offer",
  "pledge_swap_offer",
  "cleared_trade_agreement",
  "payout_milestone",
  "evidence_record",
  "dispute_case",
  "payment_event",
  "privacy_grant",
] as const satisfies readonly MoralTradeUserFacingStatusSubjectType[];

const ALLOWED_STATUSES = [
  "ready_to_preview",
  "needs_your_confirmation",
  "waiting_for_review",
  "blocked_safety_legal_privacy",
  "payment_not_authorized",
  "payout_not_releasable_yet",
  "closed_refunded_cancelled",
] as const satisfies readonly MoralTradeUserFacingStatusValue[];

const MONEY_EFFECTS = [
  "none",
  "authorization_not_started",
  "authorization_pending",
  "authorization_blocked",
  "captured_not_releasable",
  "refund_or_cancellation_pending",
  "closed_no_money_movement",
] as const satisfies readonly MoralTradeUserFacingMoneyEffect[];

const OBLIGATION_EFFECTS = [
  "none",
  "draft_only",
  "confirmation_required",
  "locked_but_not_releasable",
  "released_from_future_obligations",
  "closed_no_future_obligations",
] as const satisfies readonly MoralTradeUserFacingObligationEffect[];

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_user_facing_status_policies",
  "moral_trade_user_facing_status_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "user_facing_status",
  "choice_architecture",
  "notification",
  "appeal",
] as const;

const FORBIDDEN_PRIMARY_COPY_TERMS = [
  "reviewer_note",
  "source_hash",
  "provider_payload",
  "policy_snapshot_json",
  "exact_private_cap",
  "private_surplus",
  "security_signal",
  "raw_evidence",
  "counterparty_identity",
] as const;

const RELEASE_GATE_TEST_HOOKS = [
  "plain_language_copy_contract_test",
  "participant_task_card_simplification_test",
  "participant_ui_render_snapshot_accessibility_test",
] as const;

const CONTRACT_TESTS = [
  "user_facing_status_contract_validator",
  "user_facing_status_required_subjects_test",
  "user_facing_status_plain_language_fail_closed_test",
  "user_facing_status_material_disclosures_test",
  "user_facing_status_route_contract",
  "user_facing_status_migration_records_test",
] as const;

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueSorted<T extends string>(values: T[]) {
  return Array.from(new Set(values)).sort() as T[];
}

function isAdverseStatus(status: MoralTradeUserFacingStatusValue) {
  return (
    status === "blocked_safety_legal_privacy" ||
    status === "payment_not_authorized" ||
    status === "payout_not_releasable_yet"
  );
}

function hasAllMaterialDisclosures(disclosures: MoralTradeUserFacingMaterialDisclosureState) {
  return (
    disclosures.evidenceBurdenShown &&
    disclosures.failureRefundBehaviorShown &&
    disclosures.maximumExposureShown &&
    disclosures.noTradeComparisonShown &&
    disclosures.privacyChangeShown &&
    disclosures.remainingUncertaintyShown
  );
}

function usesForbiddenPrimaryCopy(record: MoralTradeUserFacingStatusRecord) {
  const joined = [
    record.summary,
    record.safeReasonCategory,
    record.nextAction,
    record.correctionPath ?? "",
    record.appealPath ?? "",
    ...record.keyFacts,
  ]
    .join(" ")
    .toLowerCase();

  return FORBIDDEN_PRIMARY_COPY_TERMS.filter((term) =>
    joined.includes(term.toLowerCase()),
  );
}

function userFacingCategoryFor(blocker: string) {
  if (blocker.includes("subject_missing")) {
    return "Required participant status surface is missing";
  }

  if (blocker.includes("policy")) {
    return "Status policy is not frozen";
  }

  if (blocker.includes("private") || blocker.includes("forbidden") || blocker.includes("raw")) {
    return "Status explanation would expose private or internal details";
  }

  if (blocker.includes("material_disclosure")) {
    return "Status explanation omits material facts";
  }

  if (blocker.includes("appeal") || blocker.includes("correction")) {
    return "Status explanation needs an appeal or correction path";
  }

  if (blocker.includes("next_action")) {
    return "Status explanation needs a clear next action";
  }

  return "Status explanation is incomplete";
}

function normalizeCategories(blockers: readonly string[]) {
  return Array.from(new Set(blockers.map(userFacingCategoryFor))).sort();
}

function evaluateRecord(record: MoralTradeUserFacingStatusRecord) {
  const recordId = hasText(record.statusRecordRef)
    ? record.statusRecordRef
    : "unknown-status-record";
  const blockers: string[] = [];

  if (!hasText(record.statusRecordRef)) blockers.push("user_facing_status_ref_missing");
  if (!hasText(record.subjectRef)) blockers.push(`user_facing_status_subject_ref_missing:${recordId}`);
  if (!hasText(record.statusPolicyRef)) {
    blockers.push(`user_facing_status_policy_missing:${recordId}`);
  }
  if (record.policySnapshotStatus !== "resolved_immutable") {
    blockers.push(`user_facing_status_policy_not_immutable:${recordId}:${record.policySnapshotStatus}`);
  }
  if (!hasText(record.summary)) blockers.push(`user_facing_status_summary_missing:${recordId}`);
  if (record.summary.length > 180) {
    blockers.push(`user_facing_status_summary_too_long:${recordId}`);
  }
  if (!hasText(record.safeReasonCategory)) {
    blockers.push(`user_facing_status_reason_missing:${recordId}`);
  }
  if (!hasText(record.nextAction)) blockers.push(`user_facing_status_next_action_missing:${recordId}`);
  if (record.keyFacts.length === 0 || record.keyFacts.length > 6) {
    blockers.push(`user_facing_status_key_fact_count_invalid:${recordId}`);
  }
  if (!record.detailsDrawerAvailable) {
    blockers.push(`user_facing_status_details_drawer_missing:${recordId}`);
  }
  if (record.sourceControlRefs.length === 0) {
    blockers.push(`user_facing_status_source_controls_missing:${recordId}`);
  }
  if (!record.privateDetailsRedacted) {
    blockers.push(`user_facing_status_private_details_unredacted:${recordId}`);
  }
  if (record.forbiddenTermsPresent.length > 0) {
    blockers.push(`user_facing_status_forbidden_terms_present:${recordId}`);
  }

  const forbiddenCopyTerms = usesForbiddenPrimaryCopy(record);
  if (forbiddenCopyTerms.length > 0) {
    blockers.push(`user_facing_status_forbidden_primary_copy:${recordId}:${forbiddenCopyTerms.join(",")}`);
  }

  if (isAdverseStatus(record.status)) {
    if (!hasText(record.correctionPath)) {
      blockers.push(`user_facing_status_correction_path_missing:${recordId}`);
    }
    if (!hasText(record.appealPath)) {
      blockers.push(`user_facing_status_appeal_path_missing:${recordId}`);
    }
  }

  if (
    record.status === "needs_your_confirmation" ||
    record.moneyEffect !== "none" ||
    record.obligationEffect !== "none"
  ) {
    if (!hasAllMaterialDisclosures(record.materialDisclosures)) {
      blockers.push(`user_facing_status_material_disclosure_incomplete:${recordId}`);
    }
  }

  return blockers;
}

export function evaluateMoralTradeUserFacingStatus(
  input: MoralTradeUserFacingStatusEvaluationInput,
): MoralTradeUserFacingStatusEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const requiredSubjectTypes = input.requiredSubjectTypes ?? [...REQUIRED_SUBJECT_TYPES];
  const blockers: string[] = [];
  let blockedRecordCount = 0;
  const coveredSubjectTypes = uniqueSorted(input.records.map((record) => record.subjectType));

  for (const subjectType of requiredSubjectTypes) {
    if (!coveredSubjectTypes.includes(subjectType)) {
      blockers.push(`user_facing_status_subject_missing:${subjectType}`);
    }
  }

  for (const record of input.records) {
    const recordBlockers = evaluateRecord(record);

    if (recordBlockers.length > 0) {
      blockedRecordCount += 1;
      blockers.push(...recordBlockers);
    }
  }

  const uniqueBlockers = [...new Set(blockers)];

  return {
    blockedRecordCount,
    blockers: uniqueBlockers,
    checkedAt,
    coveredSubjectTypes,
    recordCount: input.records.length,
    status: uniqueBlockers.length ? "blocked" : "pass",
    userFacingBlockerCategories: normalizeCategories(uniqueBlockers),
  };
}

function fullDisclosures(): MoralTradeUserFacingMaterialDisclosureState {
  return {
    evidenceBurdenShown: true,
    failureRefundBehaviorShown: true,
    maximumExposureShown: true,
    noTradeComparisonShown: true,
    privacyChangeShown: true,
    remainingUncertaintyShown: true,
  };
}

function sampleRecord(
  subjectType: MoralTradeUserFacingStatusSubjectType,
  overrides: Partial<MoralTradeUserFacingStatusRecord> = {},
): MoralTradeUserFacingStatusRecord {
  return {
    appealPath: null,
    correctionPath: null,
    detailsDrawerAvailable: true,
    forbiddenTermsPresent: [],
    keyFacts: [
      "No money can move from this status.",
      "Review details are summarized without private counterparty data.",
    ],
    materialDisclosures: fullDisclosures(),
    moneyEffect: "none",
    nextAction: "Review the preview and choose whether to continue.",
    obligationEffect: "draft_only",
    policySnapshotStatus: "resolved_immutable",
    privateDetailsRedacted: true,
    safeReasonCategory: "Ready for preview",
    sourceControlRefs: [`control:${subjectType}`],
    status: "ready_to_preview",
    statusPolicyRef: "user-facing-status-policy:v0.1",
    statusRecordRef: `user-facing-status:${subjectType}`,
    subjectRef: `${subjectType}:sample`,
    subjectType,
    summary: "This item is ready for a non-binding preview.",
    ...overrides,
  };
}

export function getMoralTradeUserFacingStatusContract(): MoralTradeUserFacingStatusContract {
  const passingSample = evaluateMoralTradeUserFacingStatus({
    checkedAt: "2026-06-30T09:00:00.000Z",
    records: REQUIRED_SUBJECT_TYPES.map((subjectType) => sampleRecord(subjectType)),
  });
  const blockedSample = evaluateMoralTradeUserFacingStatus({
    checkedAt: "2026-06-30T09:00:00.000Z",
    records: [
      sampleRecord("payment_event", {
        appealPath: null,
        correctionPath: null,
        detailsDrawerAvailable: false,
        forbiddenTermsPresent: ["reviewer_note"],
        keyFacts: [],
        materialDisclosures: {
          evidenceBurdenShown: false,
          failureRefundBehaviorShown: false,
          maximumExposureShown: false,
          noTradeComparisonShown: false,
          privacyChangeShown: false,
          remainingUncertaintyShown: false,
        },
        moneyEffect: "authorization_blocked",
        nextAction: "",
        policySnapshotStatus: "mutable",
        privateDetailsRedacted: false,
        sourceControlRefs: [],
        status: "payment_not_authorized",
        summary: "Blocked by reviewer_note and source_hash in policy_snapshot_json.",
      }),
    ],
  });

  return {
    allowedStatuses: [...ALLOWED_STATUSES],
    appealCorrectionRule:
      "Adverse user-facing statuses must show a bounded correction path and, where a correction right exists, an appeal path without reopening settled obligations or exposing private evidence.",
    contractTests: [...CONTRACT_TESTS],
    failClosedRule:
      "A participant-facing block, pause, rejection, manual-review state, payment state, payout state, privacy state, or public-receipt state cannot be shown as actionable unless a user_facing_status record maps it to a plain-language status, safe reason category, next action, money effect, obligation effect, material disclosures, and any bounded appeal or correction path.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    forbiddenPrimaryCopyTerms: [...FORBIDDEN_PRIMARY_COPY_TERMS],
    materialDisclosureRule:
      "Money-affecting, obligation-affecting, privacy-disclosing, evidence-submitting, final-lock, or public-receipt statuses must disclose maximum exposure, no-trade comparison, privacy change, evidence burden, failure/refund behavior, and remaining uncertainty before asking the user to act.",
    migrationNames: ["20260630_moral_trade_user_facing_status_records.sql"],
    moneyEffects: [...MONEY_EFFECTS],
    obligationEffects: [...OBLIGATION_EFFECTS],
    plainLanguageRule:
      "Primary status copy uses a short summary, bounded key facts, one next action, and an optional details drawer; internal control codes, source hashes, reviewer notes, provider payloads, policy internals, security signals, exact private caps, private surplus, raw evidence, and counterparty identity cannot be primary explanatory text.",
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    privacyBoundary:
      "Public status contracts expose allowed status labels, safe reason categories, money/obligation effect classes, redaction rules, and sample statuses only; they never expose raw evidence, reviewer notes, source hashes, provider payloads, exact private caps, private surplus, counterparty identity, security signals, or participant-specific status rows.",
    purpose:
      "Fail-closed user-facing status and blocker explanation contract for moraltrade82 participant-facing marketplace surfaces.",
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    sampleEvaluations: [passingSample, blockedSample],
    subjectTypes: [...SUBJECT_TYPES],
    version: MORAL_TRADE_USER_FACING_STATUS_CONTRACT_VERSION,
  };
}

function check(
  id: string,
  label: string,
  pass: boolean,
  evidence: string,
): MoralTradeUserFacingStatusValidation["checks"][number] {
  return { id, label, status: pass ? "pass" : "fail", evidence };
}

function hasAll<T extends string>(values: readonly T[], required: readonly T[]) {
  return required.every((entry) => values.includes(entry));
}

export function validateMoralTradeUserFacingStatusContract(
  contract = getMoralTradeUserFacingStatusContract(),
): MoralTradeUserFacingStatusValidation {
  const checks = [
    check(
      "first-class-records",
      "Contract names first-class user-facing status policy and record tables",
      hasAll(contract.firstClassRecordTables, FIRST_CLASS_RECORD_TABLES),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "allowed-statuses",
      "Contract exposes the approved participant-facing status vocabulary",
      hasAll(contract.allowedStatuses, ALLOWED_STATUSES),
      contract.allowedStatuses.join(", "),
    ),
    check(
      "required-subjects",
      "Contract covers marketplace, evidence, dispute, payment, payout, and privacy status subjects",
      hasAll(contract.subjectTypes, REQUIRED_SUBJECT_TYPES),
      contract.subjectTypes.join(", "),
    ),
    check(
      "plain-language-rule",
      "Contract prohibits raw control-plane and private details in primary status copy",
      /internal control codes/i.test(contract.plainLanguageRule) &&
        /source hashes/i.test(contract.plainLanguageRule) &&
        /reviewer notes/i.test(contract.plainLanguageRule) &&
        /one next action/i.test(contract.plainLanguageRule),
      contract.plainLanguageRule,
    ),
    check(
      "material-disclosure-rule",
      "Contract requires material facts for money, obligation, privacy, evidence, and receipt statuses",
      /maximum exposure/i.test(contract.materialDisclosureRule) &&
        /no-trade comparison/i.test(contract.materialDisclosureRule) &&
        /failure\/refund behavior/i.test(contract.materialDisclosureRule),
      contract.materialDisclosureRule,
    ),
    check(
      "appeal-correction-rule",
      "Contract requires bounded appeal or correction paths for adverse statuses",
      /correction path/i.test(contract.appealCorrectionRule) &&
        /appeal path/i.test(contract.appealCorrectionRule),
      contract.appealCorrectionRule,
    ),
    check(
      "privacy-boundary",
      "Contract excludes private and internal details from public status metadata",
      /raw evidence/i.test(contract.privacyBoundary) &&
        /provider payloads/i.test(contract.privacyBoundary) &&
        /participant-specific status rows/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
    check(
      "release-gate-hooks",
      "Contract exposes release-gate hooks for plain-language and task-card checks",
      RELEASE_GATE_TEST_HOOKS.every((hook) => contract.releaseGateTestHooks.includes(hook)),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "sample-evaluations",
      "Samples include passing and blocked user-facing status paths",
      contract.sampleEvaluations.some((sample) => sample.status === "pass") &&
        contract.sampleEvaluations.some((sample) => sample.status === "blocked"),
      contract.sampleEvaluations.map((sample) => sample.status).join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    blockers,
    checks,
    contractVersion: contract.version,
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-user-facing-status-contract",
    validatorVersion: MORAL_TRADE_USER_FACING_STATUS_VALIDATOR_VERSION,
  };
}
