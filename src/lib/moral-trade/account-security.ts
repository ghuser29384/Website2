export const MORAL_TRADE_ACCOUNT_SECURITY_CONTRACT_VERSION =
  "moral-trade-account-security-v0.1-2026-06";
export const MORAL_TRADE_ACCOUNT_SECURITY_VALIDATOR_VERSION =
  "moral-trade-account-security-validator-v0.1";

export type MoralTradeAccountSecurityAction =
  | "login"
  | "payment_method_change"
  | "participant_confirmation"
  | "payment_authorization"
  | "payment_capture"
  | "payout_release"
  | "privacy_grant"
  | "identity_artifact_change"
  | "contact_introduction"
  | "account_recovery"
  | "email_change"
  | "mfa_change"
  | "exposure_increase"
  | "reliance_bearing_agreement";

export type MoralTradeAccountSecurityEventType =
  | "login"
  | "password_change"
  | "new_device"
  | "session_anomaly"
  | "payment_method_change"
  | "email_change"
  | "mfa_change"
  | "account_recovery"
  | "identity_artifact_change"
  | "participant_identity_change"
  | "step_up_passed"
  | "step_up_failed"
  | "manual_review";

export type MoralTradeAccountSecurityRiskState =
  | "low"
  | "medium"
  | "high"
  | "blocked"
  | "manual_review"
  | "stale";

export type MoralTradeAccountSecurityHighRiskBehavior =
  | "block"
  | "step_up"
  | "cooldown"
  | "manual_review";

export type MoralTradeAccountRecoveryBehavior =
  | "block_real_money"
  | "manual_review"
  | "limited_access";

export type MoralTradeAccountSecurityPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeAccountSecurityRemediationStatus =
  | "passed"
  | "delivered"
  | "approved"
  | "not_required_for_stage"
  | "missing"
  | "failed"
  | "stale"
  | "under_review";

export type MoralTradeAccountSecurityReviewerDecisionStatus =
  | "approved"
  | "not_required_for_stage"
  | "missing"
  | "blocked"
  | "expired"
  | "superseded";

export type MoralTradeAccountSecurityFailClosedStatus =
  | "policy_missing"
  | "policy_mutable"
  | "policy_stale"
  | "policy_superseded"
  | "event_missing"
  | "event_stale"
  | "high_risk_event_open"
  | "blocked_risk_state"
  | "step_up_required"
  | "step_up_failed"
  | "notice_missing"
  | "cooldown_active"
  | "manual_review_required"
  | "trusted_device_required"
  | "invalid_event_hash"
  | "invalid_participant_hash"
  | "account_recovery_block";

export type MoralTradeAccountSecuritySubjectType =
  | "common_ground_budget"
  | "offset_offer"
  | "pledge_swap_offer"
  | "cleared_trade_agreement"
  | "privacy_grant"
  | "payment_event"
  | "payout_milestone"
  | "contact_interaction_record"
  | "participant_confirmation_record"
  | "participant_eligibility_record";

export interface MoralTradeAccountSecurityPolicyRecord {
  policyId: string;
  policyVersion: string;
  appliesToAction: MoralTradeAccountSecurityAction;
  stepUpRequired: boolean;
  trustedDeviceRequired: boolean;
  cooldownHours: number;
  riskSignals: string[];
  highRiskBehavior: MoralTradeAccountSecurityHighRiskBehavior;
  noticeRequired: boolean;
  accountRecoveryBehavior: MoralTradeAccountRecoveryBehavior;
  policySnapshotStatus: MoralTradeAccountSecurityPolicySnapshotStatus;
  reviewerDecisionStatus: MoralTradeAccountSecurityReviewerDecisionStatus;
  evidenceHash: string;
  reviewedAt: string;
  supersededBy: string | null;
}

export interface MoralTradeAccountSecurityEventRecord {
  eventId: string;
  participantIdHash: string;
  eventType: MoralTradeAccountSecurityEventType;
  policyRef: string;
  riskState: MoralTradeAccountSecurityRiskState;
  actionSubjectType: MoralTradeAccountSecuritySubjectType;
  actionSubjectId: string;
  noticeStatus: MoralTradeAccountSecurityRemediationStatus;
  stepUpStatus: MoralTradeAccountSecurityRemediationStatus;
  trustedDeviceStatus: MoralTradeAccountSecurityRemediationStatus;
  cooldownUntil: string | null;
  reviewerDecisionStatus: MoralTradeAccountSecurityReviewerDecisionStatus;
  eventHash: string;
  recordedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeAccountSecurityActionDefinition {
  key: MoralTradeAccountSecurityAction;
  label: string;
  blocksRiskClasses: string[];
  userFacingBlockerCategory: string;
}

export interface MoralTradeAccountSecurityEvaluationInput {
  action: MoralTradeAccountSecurityAction;
  checkedAt?: string;
  policies: MoralTradeAccountSecurityPolicyRecord[];
  events: MoralTradeAccountSecurityEventRecord[];
}

export interface MoralTradeAccountSecurityEvaluation {
  status: "pass" | "blocked";
  action: MoralTradeAccountSecurityAction;
  checkedAt: string;
  requiredPolicyCount: number;
  highRiskEventCount: number;
  remediatedHighRiskEventCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeAccountSecurityCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeAccountSecurityValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-account-security-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeAccountSecurityCheck[];
  blockers: string[];
}

export interface MoralTradeAccountSecurityContract {
  version: string;
  purpose: string;
  privacyRule: string;
  failClosedRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  highRiskActions: MoralTradeAccountSecurityAction[];
  eventTypes: MoralTradeAccountSecurityEventType[];
  failClosedStatuses: MoralTradeAccountSecurityFailClosedStatus[];
  actionDefinitions: MoralTradeAccountSecurityActionDefinition[];
  sampleEvaluations: MoralTradeAccountSecurityEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_EVENT_AGE_HOURS = 72;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_account_security_policies",
  "moral_trade_account_security_events",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["account_security"] as const;

const HIGH_RISK_ACTIONS: MoralTradeAccountSecurityAction[] = [
  "payment_method_change",
  "participant_confirmation",
  "payment_authorization",
  "payment_capture",
  "payout_release",
  "privacy_grant",
  "identity_artifact_change",
  "contact_introduction",
  "account_recovery",
  "email_change",
  "mfa_change",
  "exposure_increase",
  "reliance_bearing_agreement",
];

const EVENT_TYPES: MoralTradeAccountSecurityEventType[] = [
  "login",
  "password_change",
  "new_device",
  "session_anomaly",
  "payment_method_change",
  "email_change",
  "mfa_change",
  "account_recovery",
  "identity_artifact_change",
  "participant_identity_change",
  "step_up_passed",
  "step_up_failed",
  "manual_review",
];

const FAIL_CLOSED_STATUSES: MoralTradeAccountSecurityFailClosedStatus[] = [
  "policy_missing",
  "policy_mutable",
  "policy_stale",
  "policy_superseded",
  "event_missing",
  "event_stale",
  "high_risk_event_open",
  "blocked_risk_state",
  "step_up_required",
  "step_up_failed",
  "notice_missing",
  "cooldown_active",
  "manual_review_required",
  "trusted_device_required",
  "invalid_event_hash",
  "invalid_participant_hash",
  "account_recovery_block",
];

const ACTION_DEFINITIONS: MoralTradeAccountSecurityActionDefinition[] = [
  {
    key: "login",
    label: "Login",
    blocksRiskClasses: ["blocked", "manual_review"],
    userFacingBlockerCategory: "Account access needs a security check",
  },
  {
    key: "payment_method_change",
    label: "Payment-method change",
    blocksRiskClasses: ["high", "blocked", "manual_review", "stale"],
    userFacingBlockerCategory: "Payment settings need a security check",
  },
  {
    key: "participant_confirmation",
    label: "Participant confirmation",
    blocksRiskClasses: ["high", "blocked", "manual_review", "stale"],
    userFacingBlockerCategory: "Confirmation needs account-security review",
  },
  {
    key: "payment_authorization",
    label: "Payment authorization",
    blocksRiskClasses: ["high", "blocked", "manual_review", "stale"],
    userFacingBlockerCategory: "Payment authorization needs account-security review",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    blocksRiskClasses: ["high", "blocked", "manual_review", "stale"],
    userFacingBlockerCategory: "Payment capture needs account-security review",
  },
  {
    key: "payout_release",
    label: "Payout release",
    blocksRiskClasses: ["high", "blocked", "manual_review", "stale"],
    userFacingBlockerCategory: "Payout release needs account-security review",
  },
  {
    key: "privacy_grant",
    label: "Privacy grant",
    blocksRiskClasses: ["high", "blocked", "manual_review", "stale"],
    userFacingBlockerCategory: "Private-data disclosure needs account-security review",
  },
  {
    key: "identity_artifact_change",
    label: "Identity-artifact change",
    blocksRiskClasses: ["high", "blocked", "manual_review", "stale"],
    userFacingBlockerCategory: "Identity changes need account-security review",
  },
  {
    key: "contact_introduction",
    label: "Contact introduction",
    blocksRiskClasses: ["high", "blocked", "manual_review", "stale"],
    userFacingBlockerCategory: "Contact introduction needs account-security review",
  },
  {
    key: "account_recovery",
    label: "Account recovery",
    blocksRiskClasses: ["high", "blocked", "manual_review", "stale"],
    userFacingBlockerCategory: "Account recovery needs review before high-risk actions",
  },
  {
    key: "email_change",
    label: "Email change",
    blocksRiskClasses: ["high", "blocked", "manual_review", "stale"],
    userFacingBlockerCategory: "Email changes need account-security review",
  },
  {
    key: "mfa_change",
    label: "MFA change",
    blocksRiskClasses: ["high", "blocked", "manual_review", "stale"],
    userFacingBlockerCategory: "MFA changes need account-security review",
  },
  {
    key: "exposure_increase",
    label: "Exposure increase",
    blocksRiskClasses: ["high", "blocked", "manual_review", "stale"],
    userFacingBlockerCategory: "Exposure increases need account-security review",
  },
  {
    key: "reliance_bearing_agreement",
    label: "Reliance-bearing agreement",
    blocksRiskClasses: ["high", "blocked", "manual_review", "stale"],
    userFacingBlockerCategory: "Reliance-bearing agreements need account-security review",
  },
];

const CONTRACT_TESTS = [
  "account_security_contract_validator",
  "account_security_missing_or_mutable_policy_fails_closed",
  "account_security_high_risk_events_require_step_up_notice_cooldown_or_review",
  "account_security_browser_session_only_never_authorizes_high_risk_actions",
  "account_security_route_health_spec_and_schema_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeAccountSecurityCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function isHash(value: string) {
  return HASH_PATTERN.test(value);
}

function hoursBetween(earlier: string, later: string) {
  const earlierTimestamp = Date.parse(earlier);
  const laterTimestamp = Date.parse(later);

  if (!Number.isFinite(earlierTimestamp) || !Number.isFinite(laterTimestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return (laterTimestamp - earlierTimestamp) / (1000 * 60 * 60);
}

function isExpired(value: string | null, checkedAt: string) {
  if (value === null) {
    return false;
  }

  const expiresAt = Date.parse(value);
  const checkedAtTimestamp = Date.parse(checkedAt);

  if (!Number.isFinite(expiresAt) || !Number.isFinite(checkedAtTimestamp)) {
    return true;
  }

  return expiresAt <= checkedAtTimestamp;
}

function cooldownComplete(value: string | null, checkedAt: string) {
  if (value === null) {
    return false;
  }

  const cooldownTimestamp = Date.parse(value);
  const checkedAtTimestamp = Date.parse(checkedAt);

  if (!Number.isFinite(cooldownTimestamp) || !Number.isFinite(checkedAtTimestamp)) {
    return false;
  }

  return cooldownTimestamp <= checkedAtTimestamp;
}

function remediationPassed(status: MoralTradeAccountSecurityRemediationStatus) {
  return status === "passed" ||
    status === "delivered" ||
    status === "approved" ||
    status === "not_required_for_stage";
}

function reviewPassed(status: MoralTradeAccountSecurityReviewerDecisionStatus) {
  return status === "approved" || status === "not_required_for_stage";
}

function relevantPolicyForAction(
  action: MoralTradeAccountSecurityAction,
  policies: MoralTradeAccountSecurityPolicyRecord[],
) {
  return policies.find(
    (policy) => policy.appliesToAction === action && policy.supersededBy === null,
  );
}

function eventBlocksForPolicy(
  event: MoralTradeAccountSecurityEventRecord,
  policy: MoralTradeAccountSecurityPolicyRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (!isHash(event.eventHash)) {
    blockers.push(`invalid_event_hash:${event.eventId}`);
  }

  if (!isHash(event.participantIdHash)) {
    blockers.push(`invalid_participant_hash:${event.eventId}`);
  }

  if (event.supersededBy !== null || event.riskState === "stale") {
    blockers.push(`event_stale:${event.eventId}`);
  }

  if (isExpired(event.expiresAt, checkedAt)) {
    blockers.push(`event_stale:${event.eventId}`);
  }

  if (hoursBetween(event.recordedAt, checkedAt) > MAX_EVENT_AGE_HOURS &&
      event.riskState !== "low") {
    blockers.push(`event_stale:${event.eventId}`);
  }

  if (event.eventType === "step_up_failed") {
    blockers.push(`step_up_failed:${event.eventId}`);
  }

  if (event.eventType === "account_recovery" &&
      policy.accountRecoveryBehavior === "block_real_money") {
    blockers.push(`account_recovery_block:${event.eventId}`);
  }

  if ((event.riskState === "low" || event.riskState === "medium") &&
      blockers.length === 0) {
    return blockers;
  }

  if (event.riskState === "blocked") {
    blockers.push(`blocked_risk_state:${event.eventId}`);
  }

  if (policy.highRiskBehavior === "block") {
    blockers.push(`high_risk_event_open:${event.eventId}`);
  }

  if ((policy.stepUpRequired || policy.highRiskBehavior === "step_up") &&
      !remediationPassed(event.stepUpStatus)) {
    blockers.push(`step_up_required:${event.eventId}`);
  }

  if (policy.trustedDeviceRequired && !remediationPassed(event.trustedDeviceStatus)) {
    blockers.push(`trusted_device_required:${event.eventId}`);
  }

  if (policy.noticeRequired && !remediationPassed(event.noticeStatus)) {
    blockers.push(`notice_missing:${event.eventId}`);
  }

  if (policy.highRiskBehavior === "cooldown") {
    if (!cooldownComplete(event.cooldownUntil, checkedAt)) {
      blockers.push(`cooldown_active:${event.eventId}`);
    }
  }

  if ((policy.highRiskBehavior === "manual_review" ||
      event.riskState === "manual_review") &&
      !reviewPassed(event.reviewerDecisionStatus)) {
    blockers.push(`manual_review_required:${event.eventId}`);
  }

  return blockers;
}

export function evaluateMoralTradeAccountSecurity(
  input: MoralTradeAccountSecurityEvaluationInput,
): MoralTradeAccountSecurityEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const blockers: string[] = [];
  const userFacingBlockerCategories = new Set<string>();
  const actionDefinition = ACTION_DEFINITIONS.find(
    (definition) => definition.key === input.action,
  );
  const policy = relevantPolicyForAction(input.action, input.policies);

  if (!policy) {
    blockers.push(`policy_missing:${input.action}`);
  } else {
    if (!isHash(policy.evidenceHash)) {
      blockers.push(`invalid_policy_hash:${policy.policyId}`);
    }

    if (policy.supersededBy !== null) {
      blockers.push(`policy_superseded:${policy.policyId}`);
    }

    if (policy.policySnapshotStatus === "missing") {
      blockers.push(`policy_missing:${policy.policyId}`);
    }

    if (policy.policySnapshotStatus === "mutable") {
      blockers.push(`policy_mutable:${policy.policyId}`);
    }

    if (policy.policySnapshotStatus === "stale") {
      blockers.push(`policy_stale:${policy.policyId}`);
    }

    if (policy.policySnapshotStatus === "superseded") {
      blockers.push(`policy_superseded:${policy.policyId}`);
    }

    if (!reviewPassed(policy.reviewerDecisionStatus)) {
      blockers.push(`manual_review_required:${policy.policyId}`);
    }
  }

  const relevantEvents = input.events.filter(
    (event) => policy === undefined || event.policyRef === policy.policyId,
  );
  const highRiskEvents = relevantEvents.filter(
    (event) => event.riskState === "high" ||
      event.riskState === "blocked" ||
      event.riskState === "manual_review" ||
      event.riskState === "stale" ||
      event.eventType === "step_up_failed" ||
      event.eventType === "account_recovery",
  );
  let remediatedHighRiskEventCount = 0;

  if (policy) {
    for (const event of relevantEvents) {
      const eventBlockers = eventBlocksForPolicy(event, policy, checkedAt);

      if (eventBlockers.length === 0 &&
          (event.riskState === "high" ||
            event.riskState === "manual_review" ||
            event.eventType === "account_recovery")) {
        remediatedHighRiskEventCount += 1;
      }

      blockers.push(...eventBlockers);
    }
  }

  if (blockers.length > 0) {
    userFacingBlockerCategories.add(
      actionDefinition?.userFacingBlockerCategory ??
        "Account security needs review before this action",
    );
  }

  return {
    status: blockers.length === 0 ? "pass" : "blocked",
    action: input.action,
    checkedAt,
    requiredPolicyCount: 1,
    highRiskEventCount: highRiskEvents.length,
    remediatedHighRiskEventCount,
    blockers: Array.from(new Set(blockers)),
    userFacingBlockerCategories: Array.from(userFacingBlockerCategories),
  };
}

function samplePolicy(
  appliesToAction: MoralTradeAccountSecurityAction,
  overrides: Partial<MoralTradeAccountSecurityPolicyRecord> = {},
): MoralTradeAccountSecurityPolicyRecord {
  return {
    policyId: `policy-${appliesToAction}`,
    policyVersion: MORAL_TRADE_ACCOUNT_SECURITY_CONTRACT_VERSION,
    appliesToAction,
    stepUpRequired: true,
    trustedDeviceRequired: false,
    cooldownHours: 0,
    riskSignals: [
      "new_device",
      "session_anomaly",
      "payment_method_change",
      "identity_artifact_change",
    ],
    highRiskBehavior: "step_up",
    noticeRequired: true,
    accountRecoveryBehavior: "manual_review",
    policySnapshotStatus: "resolved_immutable",
    reviewerDecisionStatus: "approved",
    evidenceHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function sampleEvent(
  policy: MoralTradeAccountSecurityPolicyRecord,
  overrides: Partial<MoralTradeAccountSecurityEventRecord> = {},
): MoralTradeAccountSecurityEventRecord {
  return {
    eventId: `event-${policy.appliesToAction}`,
    participantIdHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    eventType: "new_device",
    policyRef: policy.policyId,
    riskState: "low",
    actionSubjectType: "participant_confirmation_record",
    actionSubjectId: "subject_123",
    noticeStatus: "not_required_for_stage",
    stepUpStatus: "not_required_for_stage",
    trustedDeviceStatus: "not_required_for_stage",
    cooldownUntil: null,
    reviewerDecisionStatus: "not_required_for_stage",
    eventHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    recordedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-06-10T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

export function getMoralTradeAccountSecurityContract(): MoralTradeAccountSecurityContract {
  const participantConfirmationPolicy = samplePolicy("participant_confirmation");
  const paymentCapturePolicy = samplePolicy("payment_capture", {
    highRiskBehavior: "cooldown",
    cooldownHours: 24,
  });
  const privacyGrantPolicy = samplePolicy("privacy_grant", {
    highRiskBehavior: "manual_review",
    trustedDeviceRequired: true,
  });
  const checkedAt = "2026-06-02T00:00:00.000Z";

  const sampleEvaluations = [
    evaluateMoralTradeAccountSecurity({
      action: "participant_confirmation",
      checkedAt,
      policies: [participantConfirmationPolicy],
      events: [sampleEvent(participantConfirmationPolicy)],
    }),
    evaluateMoralTradeAccountSecurity({
      action: "payment_capture",
      checkedAt,
      policies: [paymentCapturePolicy],
      events: [
        sampleEvent(paymentCapturePolicy, {
          eventId: "event-payment-capture-high-risk",
          riskState: "high",
          noticeStatus: "missing",
          stepUpStatus: "missing",
          cooldownUntil: "2026-06-03T00:00:00.000Z",
        }),
      ],
    }),
    evaluateMoralTradeAccountSecurity({
      action: "privacy_grant",
      checkedAt,
      policies: [privacyGrantPolicy],
      events: [
        sampleEvent(privacyGrantPolicy, {
          eventId: "event-privacy-grant-reviewed",
          riskState: "high",
          noticeStatus: "delivered",
          stepUpStatus: "passed",
          trustedDeviceStatus: "passed",
          reviewerDecisionStatus: "approved",
        }),
      ],
    }),
  ];

  return {
    version: MORAL_TRADE_ACCOUNT_SECURITY_CONTRACT_VERSION,
    purpose:
      "Require frozen account-security policies and non-blocking account-security events before real-money, reliance-bearing, privacy-disclosing, or exposure-increasing actions.",
    privacyRule:
      "Account-security events are private, participant-scoped records. Public contract responses expose only policy/action keys and validation summaries, never device fingerprints, session anomalies, recovery details, provider payloads, or raw security signals.",
    failClosedRule:
      "A browser session alone is not trusted for confirmations, captures, payout releases, privacy grants, contact introductions, identity changes, or exposure increases. Missing, stale, mutable, high-risk, unresolved, or silently waived account-security evidence fails closed until step-up, notice, cooldown, or manual review satisfies the frozen account-security policy.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    highRiskActions: HIGH_RISK_ACTIONS,
    eventTypes: EVENT_TYPES,
    failClosedStatuses: FAIL_CLOSED_STATUSES,
    actionDefinitions: ACTION_DEFINITIONS,
    sampleEvaluations,
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeAccountSecurityContract(
  contract = getMoralTradeAccountSecurityContract(),
): MoralTradeAccountSecurityValidation {
  const checks = [
    check(
      "first-class-record-tables",
      "Account-security policy and event tables are first-class records.",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subject",
      "Account security resolves through an immutable policy snapshot subject.",
      contract.policySnapshotSubjects.includes("account_security"),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "high-risk-actions",
      "The contract covers confirmations, payment methods, capture, payout, privacy grants, identity changes, contact introductions, account recovery, MFA/email changes, exposure increases, and reliance-bearing agreements.",
      [
        "payment_method_change",
        "participant_confirmation",
        "payment_capture",
        "payout_release",
        "privacy_grant",
        "identity_artifact_change",
        "contact_introduction",
        "account_recovery",
        "email_change",
        "mfa_change",
        "exposure_increase",
        "reliance_bearing_agreement",
      ].every((action) =>
        contract.highRiskActions.includes(action as MoralTradeAccountSecurityAction),
      ),
      contract.highRiskActions.join(", "),
    ),
    check(
      "event-types",
      "The event taxonomy includes new devices, session anomalies, payment-method changes, email/MFA changes, recovery, identity artifacts, and step-up outcomes.",
      [
        "new_device",
        "session_anomaly",
        "payment_method_change",
        "email_change",
        "mfa_change",
        "account_recovery",
        "identity_artifact_change",
        "step_up_passed",
        "step_up_failed",
      ].every((eventType) =>
        contract.eventTypes.includes(eventType as MoralTradeAccountSecurityEventType),
      ),
      contract.eventTypes.join(", "),
    ),
    check(
      "fail-closed-statuses",
      "High-risk, stale, missing, step-up, notice, cooldown, trusted-device, manual-review, and account-recovery blockers are explicit.",
      [
        "policy_missing",
        "policy_mutable",
        "event_stale",
        "high_risk_event_open",
        "step_up_required",
        "notice_missing",
        "cooldown_active",
        "manual_review_required",
        "trusted_device_required",
        "account_recovery_block",
      ].every((status) =>
        contract.failClosedStatuses.includes(
          status as MoralTradeAccountSecurityFailClosedStatus,
        ),
      ),
      contract.failClosedStatuses.join(", "),
    ),
    check(
      "browser-session-not-sufficient",
      "The contract explicitly rejects browser-session-only trust for high-risk actions.",
      /browser session alone is not trusted/i.test(contract.failClosedRule) &&
        /step-up/i.test(contract.failClosedRule) &&
        /manual review/i.test(contract.failClosedRule),
      contract.failClosedRule,
    ),
    check(
      "privacy-boundary",
      "The public contract excludes raw device, session, recovery, provider, and security-signal details.",
      /never device fingerprints/i.test(contract.privacyRule) &&
        /raw security signals/i.test(contract.privacyRule),
      contract.privacyRule,
    ),
    check(
      "sample-evaluations",
      "The public contract exposes passing confirmation and privacy-grant samples plus a blocked payment-capture sample.",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.action === "participant_confirmation" &&
          evaluation.status === "pass",
      ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.action === "payment_capture" &&
            evaluation.status === "blocked",
        ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.action === "privacy_grant" &&
            evaluation.status === "pass",
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.action}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "contract-tests",
      "Account-security contract test hooks are published.",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length === 0 ? "pass" : "fail",
    validatorName: "moral-trade-account-security-contract",
    validatorVersion: MORAL_TRADE_ACCOUNT_SECURITY_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeAccountSecurity = {
  evaluateMoralTradeAccountSecurity,
  getMoralTradeAccountSecurityContract,
  validateMoralTradeAccountSecurityContract,
};

export default moralTradeAccountSecurity;
