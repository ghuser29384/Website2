export const MORAL_TRADE_FINANCIAL_SETTLEMENT_CONTROLS_CONTRACT_VERSION =
  "moral-trade-financial-settlement-controls-v0.1-2026-06";
export const MORAL_TRADE_FINANCIAL_SETTLEMENT_CONTROLS_VALIDATOR_VERSION =
  "moral-trade-financial-settlement-controls-validator-v0.1";

export type MoralTradeFinancialSettlementTransition =
  | "draft_preview"
  | "public_preview"
  | "matched_trade_lock"
  | "payment_authorization"
  | "payment_capture"
  | "challenge_window_default"
  | "payout_milestone_release"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeFinancialSettlementControlKey =
  | "platform_fee_policy"
  | "platform_fee_disclosure"
  | "fx_policy"
  | "fx_rate_snapshot"
  | "notification_policy"
  | "material_notice_record"
  | "time_authority_policy"
  | "server_deadline_record"
  | "challenge_window_record"
  | "payout_milestone_record"
  | "payout_milestone_evidence"
  | "payout_destination_binding";

export type MoralTradeFinancialSettlementSubjectType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action"
  | "common_ground_budget"
  | "public_goods_round"
  | "matched_trade_lock_proposal"
  | "payment_event"
  | "payout_milestone"
  | "challenge_window"
  | "release_gate";

export type MoralTradeFinancialSettlementControlStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "blocked"
  | "stale"
  | "superseded";

export type MoralTradeSettlementPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeCurrencyStatus =
  | "explicit_currency"
  | "inherits_settlement_currency"
  | "not_required_for_stage"
  | "missing"
  | "currency_mismatch"
  | "stale";

export type MoralTradeFeeDisclosureStatus =
  | "displayed_separately"
  | "not_required_for_stage"
  | "missing"
  | "bundled_into_moral_volume"
  | "stale";

export type MoralTradeFxSnapshotStatus =
  | "snapshot_current"
  | "not_required_for_stage"
  | "missing"
  | "expired"
  | "spread_hidden"
  | "fee_not_separated"
  | "stale";

export type MoralTradeMetricExclusionStatus =
  | "excluded"
  | "not_required_for_stage"
  | "missing"
  | "included_in_moral_volume"
  | "included_in_qf_signal"
  | "included_in_threshold_progress"
  | "included_in_impact_claim"
  | "stale";

export type MoralTradeNoticeDeliveryStatus =
  | "delivered_confirmed"
  | "not_required_for_stage"
  | "missing"
  | "failed"
  | "unconfirmed_channel"
  | "stale";

export type MoralTradeTimeAuthorityStatus =
  | "server_authoritative"
  | "not_required_for_stage"
  | "missing"
  | "client_clock_used"
  | "unsynchronized_job"
  | "mutable_display_time"
  | "stale";

export type MoralTradeChallengeWindowStatus =
  | "open_or_not_required"
  | "closed_after_notice"
  | "not_required_for_stage"
  | "missing"
  | "expired_without_notice"
  | "defaulted_against_participant"
  | "stale";

export type MoralTradePayoutMilestoneStatus =
  | "releasable"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "blocked"
  | "destination_mismatch"
  | "evidence_missing"
  | "challenge_open"
  | "stale"
  | "superseded";

export type MoralTradeSettlementEvidenceStatus =
  | "claim_typed_evidence_passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "stale";

export type MoralTradePayoutDestinationStatus =
  | "verified_destination_bound"
  | "not_required_for_stage"
  | "missing"
  | "unverified"
  | "changed_after_lock"
  | "stale";

export interface MoralTradeFinancialSettlementControlRecord {
  controlId: string;
  controlKey: MoralTradeFinancialSettlementControlKey;
  subjectType: MoralTradeFinancialSettlementSubjectType;
  subjectRef: string;
  status: MoralTradeFinancialSettlementControlStatus;
  policySnapshotStatus: MoralTradeSettlementPolicySnapshotStatus;
  policySnapshotSubject:
    | "platform_fee"
    | "fx"
    | "notification"
    | "time_authority"
    | "challenge_window"
    | "payout_milestone";
  controlHash: string;
  currencyStatus: MoralTradeCurrencyStatus;
  feeDisclosureStatus: MoralTradeFeeDisclosureStatus;
  fxSnapshotStatus: MoralTradeFxSnapshotStatus;
  metricExclusionStatus: MoralTradeMetricExclusionStatus;
  noticeDeliveryStatus: MoralTradeNoticeDeliveryStatus;
  timeAuthorityStatus: MoralTradeTimeAuthorityStatus;
  challengeWindowStatus: MoralTradeChallengeWindowStatus;
  payoutMilestoneStatus: MoralTradePayoutMilestoneStatus;
  evidenceStatus: MoralTradeSettlementEvidenceStatus;
  destinationStatus: MoralTradePayoutDestinationStatus;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeFinancialSettlementTransitionDefinition {
  key: MoralTradeFinancialSettlementTransition;
  label: string;
  requiredControls: MoralTradeFinancialSettlementControlKey[];
  userFacingBlockerCategory: string;
}

export interface MoralTradeFinancialSettlementEvaluationInput {
  transition: MoralTradeFinancialSettlementTransition;
  checkedAt?: string;
  records: MoralTradeFinancialSettlementControlRecord[];
}

export interface MoralTradeFinancialSettlementEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeFinancialSettlementTransition;
  checkedAt: string;
  requiredControlCount: number;
  passingControlCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeFinancialSettlementCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeFinancialSettlementValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-financial-settlement-controls-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeFinancialSettlementCheck[];
  blockers: string[];
}

export interface MoralTradeFinancialSettlementControlsContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  transitionDefinitions: MoralTradeFinancialSettlementTransitionDefinition[];
  controlKeys: MoralTradeFinancialSettlementControlKey[];
  failClosedStatuses: Array<
    | MoralTradeFinancialSettlementControlStatus
    | MoralTradeSettlementPolicySnapshotStatus
    | MoralTradeCurrencyStatus
    | MoralTradeFeeDisclosureStatus
    | MoralTradeFxSnapshotStatus
    | MoralTradeMetricExclusionStatus
    | MoralTradeNoticeDeliveryStatus
    | MoralTradeTimeAuthorityStatus
    | MoralTradeChallengeWindowStatus
    | MoralTradePayoutMilestoneStatus
    | MoralTradeSettlementEvidenceStatus
    | MoralTradePayoutDestinationStatus
  >;
  contractNonClaims: string[];
  sampleEvaluations: MoralTradeFinancialSettlementEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_REVIEW_AGE_DAYS = 90;

const CONTROL_KEYS: MoralTradeFinancialSettlementControlKey[] = [
  "platform_fee_policy",
  "platform_fee_disclosure",
  "fx_policy",
  "fx_rate_snapshot",
  "notification_policy",
  "material_notice_record",
  "time_authority_policy",
  "server_deadline_record",
  "challenge_window_record",
  "payout_milestone_record",
  "payout_milestone_evidence",
  "payout_destination_binding",
];

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_platform_fee_policies",
  "moral_trade_platform_fee_disclosures",
  "moral_trade_fx_policies",
  "moral_trade_fx_rate_snapshots",
  "moral_trade_notification_policies",
  "moral_trade_material_notice_records",
  "moral_trade_time_authority_policies",
  "moral_trade_deadline_records",
  "moral_trade_challenge_window_records",
  "moral_trade_payout_milestone_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "platform_fee",
  "fx",
  "notification",
  "time_authority",
  "challenge_window",
  "payout_milestone",
] as const;

const PASS_STATUSES: MoralTradeFinancialSettlementControlStatus[] = [
  "passed",
  "not_required_for_stage",
];

const FAIL_CLOSED_STATUSES = [
  "missing",
  "under_review",
  "blocked",
  "stale",
  "superseded",
  "mutable",
  "currency_mismatch",
  "bundled_into_moral_volume",
  "expired",
  "spread_hidden",
  "fee_not_separated",
  "included_in_moral_volume",
  "included_in_qf_signal",
  "included_in_threshold_progress",
  "included_in_impact_claim",
  "failed",
  "unconfirmed_channel",
  "client_clock_used",
  "unsynchronized_job",
  "mutable_display_time",
  "expired_without_notice",
  "defaulted_against_participant",
  "destination_mismatch",
  "evidence_missing",
  "challenge_open",
  "unverified",
  "changed_after_lock",
] as const;

const PREVIEW_CONTROLS: MoralTradeFinancialSettlementControlKey[] = [
  "platform_fee_policy",
  "fx_policy",
  "notification_policy",
  "time_authority_policy",
];

const LOCK_CONTROLS: MoralTradeFinancialSettlementControlKey[] = [
  ...PREVIEW_CONTROLS,
  "platform_fee_disclosure",
  "fx_rate_snapshot",
  "material_notice_record",
  "server_deadline_record",
  "challenge_window_record",
];

const PAYOUT_CONTROLS: MoralTradeFinancialSettlementControlKey[] = [
  ...LOCK_CONTROLS,
  "payout_milestone_record",
  "payout_milestone_evidence",
  "payout_destination_binding",
];

const TRANSITION_DEFINITIONS: MoralTradeFinancialSettlementTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiredControls: [],
    userFacingBlockerCategory: "Draft-only preview can proceed without settlement controls",
  },
  {
    key: "public_preview",
    label: "Public real-money preview",
    requiredControls: PREVIEW_CONTROLS,
    userFacingBlockerCategory: "Real-money preview needs frozen fee, FX, notice, and time policies",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiredControls: LOCK_CONTROLS,
    userFacingBlockerCategory: "Lock needs fee/FX disclosure, notices, deadlines, and challenge window",
  },
  {
    key: "payment_authorization",
    label: "Payment authorization",
    requiredControls: LOCK_CONTROLS,
    userFacingBlockerCategory: "Authorization needs frozen fee, FX, notice, and server-time evidence",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiredControls: LOCK_CONTROLS,
    userFacingBlockerCategory: "Capture needs current fee/FX disclosure, notices, and challenge evidence",
  },
  {
    key: "challenge_window_default",
    label: "Challenge-window default",
    requiredControls: [
      "notification_policy",
      "material_notice_record",
      "time_authority_policy",
      "server_deadline_record",
      "challenge_window_record",
    ],
    userFacingBlockerCategory: "Challenge defaults need delivered notice and server-side deadlines",
  },
  {
    key: "payout_milestone_release",
    label: "Payout milestone release",
    requiredControls: PAYOUT_CONTROLS,
    userFacingBlockerCategory: "Payout release needs releasable milestone, evidence, notice, and destination",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiredControls: [
      "platform_fee_policy",
      "platform_fee_disclosure",
      "fx_policy",
      "fx_rate_snapshot",
    ],
    userFacingBlockerCategory: "Public metrics need fee and FX exclusions",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiredControls: PAYOUT_CONTROLS,
    userFacingBlockerCategory: "Release promotion needs all settlement controls resolved",
  },
];

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeFinancialSettlementCheck {
  return { id, label, status: passed ? "pass" : "fail", evidence };
}

function findTransition(transition: MoralTradeFinancialSettlementTransition) {
  return TRANSITION_DEFINITIONS.find((entry) => entry.key === transition);
}

function isStaleReview(
  reviewedAt: string,
  expiresAt: string | null,
  checkedAt: string,
) {
  const reviewedAtMs = Date.parse(reviewedAt);
  const checkedAtMs = Date.parse(checkedAt);
  if (!Number.isFinite(reviewedAtMs) || !Number.isFinite(checkedAtMs)) {
    return true;
  }
  if (expiresAt && Date.parse(expiresAt) <= checkedAtMs) {
    return true;
  }
  return checkedAtMs - reviewedAtMs > MAX_REVIEW_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function latestRecord(
  records: MoralTradeFinancialSettlementControlRecord[],
  controlKey: MoralTradeFinancialSettlementControlKey,
) {
  return records.find((record) => record.controlKey === controlKey);
}

function requireOneOf<T extends string>(
  blockers: string[],
  controlKey: MoralTradeFinancialSettlementControlKey,
  code: string,
  value: T,
  allowed: T[],
) {
  if (!allowed.includes(value)) {
    blockers.push(`${code}:${controlKey}:${value}`);
  }
}

function evaluateRecord(
  record: MoralTradeFinancialSettlementControlRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];
  const controlKey = record.controlKey;

  if (!PASS_STATUSES.includes(record.status)) {
    blockers.push(
      `financial_settlement_control_not_passed:${controlKey}:${record.status}`,
    );
  }
  if (record.policySnapshotStatus !== "resolved_immutable") {
    blockers.push(
      `financial_settlement_policy_not_immutable:${controlKey}:${record.policySnapshotStatus}`,
    );
  }
  if (!HASH_PATTERN.test(record.controlHash)) {
    blockers.push(
      `financial_settlement_control_hash_invalid:${controlKey}:${record.controlId}`,
    );
  }
  if (isStaleReview(record.reviewedAt, record.expiresAt, checkedAt)) {
    blockers.push(
      `financial_settlement_control_review_stale:${controlKey}:${record.controlId}`,
    );
  }
  if (record.supersededBy) {
    blockers.push(
      `financial_settlement_control_superseded:${controlKey}:${record.controlId}`,
    );
  }

  if (
    [
      "platform_fee_policy",
      "platform_fee_disclosure",
      "fx_policy",
      "fx_rate_snapshot",
      "payout_milestone_record",
    ].includes(controlKey)
  ) {
    requireOneOf(blockers, controlKey, "settlement_currency_not_resolved", record.currencyStatus, [
      "explicit_currency",
      "inherits_settlement_currency",
      "not_required_for_stage",
    ]);
  }

  if (controlKey === "platform_fee_policy" || controlKey === "platform_fee_disclosure") {
    requireOneOf(
      blockers,
      controlKey,
      "platform_fee_disclosure_not_separate",
      record.feeDisclosureStatus,
      ["displayed_separately", "not_required_for_stage"],
    );
    requireOneOf(
      blockers,
      controlKey,
      "platform_fee_metric_exclusion_not_enforced",
      record.metricExclusionStatus,
      ["excluded", "not_required_for_stage"],
    );
  }

  if (controlKey === "fx_policy" || controlKey === "fx_rate_snapshot") {
    requireOneOf(blockers, controlKey, "fx_snapshot_not_current", record.fxSnapshotStatus, [
      "snapshot_current",
      "not_required_for_stage",
    ]);
    requireOneOf(
      blockers,
      controlKey,
      "fx_fee_metric_exclusion_not_enforced",
      record.metricExclusionStatus,
      ["excluded", "not_required_for_stage"],
    );
    requireOneOf(
      blockers,
      controlKey,
      "fx_fee_disclosure_not_separate",
      record.feeDisclosureStatus,
      ["displayed_separately", "not_required_for_stage"],
    );
  }

  if (controlKey === "notification_policy" || controlKey === "material_notice_record") {
    requireOneOf(
      blockers,
      controlKey,
      "material_notice_not_delivered",
      record.noticeDeliveryStatus,
      ["delivered_confirmed", "not_required_for_stage"],
    );
  }

  if (controlKey === "time_authority_policy" || controlKey === "server_deadline_record") {
    requireOneOf(
      blockers,
      controlKey,
      "server_time_authority_not_resolved",
      record.timeAuthorityStatus,
      ["server_authoritative", "not_required_for_stage"],
    );
  }

  if (controlKey === "challenge_window_record") {
    requireOneOf(
      blockers,
      controlKey,
      "challenge_window_not_resolved",
      record.challengeWindowStatus,
      ["open_or_not_required", "closed_after_notice", "not_required_for_stage"],
    );
    requireOneOf(
      blockers,
      controlKey,
      "challenge_window_notice_not_delivered",
      record.noticeDeliveryStatus,
      ["delivered_confirmed", "not_required_for_stage"],
    );
    requireOneOf(
      blockers,
      controlKey,
      "challenge_window_time_authority_not_server",
      record.timeAuthorityStatus,
      ["server_authoritative", "not_required_for_stage"],
    );
  }

  if (
    controlKey === "payout_milestone_record" ||
    controlKey === "payout_milestone_evidence" ||
    controlKey === "payout_destination_binding"
  ) {
    requireOneOf(
      blockers,
      controlKey,
      "payout_milestone_not_releasable",
      record.payoutMilestoneStatus,
      ["releasable", "not_required_for_stage"],
    );
    requireOneOf(
      blockers,
      controlKey,
      "payout_milestone_evidence_not_passed",
      record.evidenceStatus,
      ["claim_typed_evidence_passed", "not_required_for_stage"],
    );
    requireOneOf(
      blockers,
      controlKey,
      "payout_destination_not_bound",
      record.destinationStatus,
      ["verified_destination_bound", "not_required_for_stage"],
    );
    requireOneOf(
      blockers,
      controlKey,
      "payout_challenge_window_not_closed_or_waived",
      record.challengeWindowStatus,
      ["closed_after_notice", "not_required_for_stage"],
    );
  }

  return blockers;
}

export function evaluateMoralTradeFinancialSettlementControls(
  input: MoralTradeFinancialSettlementEvaluationInput,
): MoralTradeFinancialSettlementEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const definition = findTransition(input.transition);
  const blockers: string[] = [];
  const userFacingBlockerCategories = new Set<string>();
  let passingControlCount = 0;

  if (!definition) {
    return {
      status: "blocked",
      transition: input.transition,
      checkedAt,
      requiredControlCount: 0,
      passingControlCount: 0,
      blockers: [`unknown_financial_settlement_transition:${input.transition}`],
      userFacingBlockerCategories: ["Unknown settlement transition"],
    };
  }

  for (const controlKey of definition.requiredControls) {
    const record = latestRecord(input.records, controlKey);
    if (!record) {
      blockers.push(`financial_settlement_control_required:${controlKey}`);
      userFacingBlockerCategories.add(definition.userFacingBlockerCategory);
      continue;
    }

    const recordBlockers = evaluateRecord(record, checkedAt);
    if (recordBlockers.length) {
      blockers.push(...recordBlockers);
      userFacingBlockerCategories.add(definition.userFacingBlockerCategory);
    } else {
      passingControlCount += 1;
    }
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt,
    requiredControlCount: definition.requiredControls.length,
    passingControlCount,
    blockers,
    userFacingBlockerCategories: Array.from(userFacingBlockerCategories),
  };
}

function policySubjectFor(
  controlKey: MoralTradeFinancialSettlementControlKey,
): MoralTradeFinancialSettlementControlRecord["policySnapshotSubject"] {
  if (controlKey.startsWith("platform_fee")) {
    return "platform_fee";
  }
  if (controlKey.startsWith("fx")) {
    return "fx";
  }
  if (controlKey === "notification_policy" || controlKey === "material_notice_record") {
    return "notification";
  }
  if (controlKey === "time_authority_policy" || controlKey === "server_deadline_record") {
    return "time_authority";
  }
  if (controlKey === "challenge_window_record") {
    return "challenge_window";
  }
  return "payout_milestone";
}

function settlementControlRecord(
  controlKey: MoralTradeFinancialSettlementControlKey,
  overrides: Partial<MoralTradeFinancialSettlementControlRecord> = {},
): MoralTradeFinancialSettlementControlRecord {
  const isPayoutControl = controlKey.startsWith("payout_");
  return {
    controlId: `financial-settlement:test:${controlKey}`,
    controlKey,
    subjectType: isPayoutControl ? "payout_milestone" : "matched_trade_lock_proposal",
    subjectRef: "settlement-subject:test",
    status: "passed",
    policySnapshotStatus: "resolved_immutable",
    policySnapshotSubject: policySubjectFor(controlKey),
    controlHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    currencyStatus: "explicit_currency",
    feeDisclosureStatus: "displayed_separately",
    fxSnapshotStatus: "snapshot_current",
    metricExclusionStatus: "excluded",
    noticeDeliveryStatus: "delivered_confirmed",
    timeAuthorityStatus: "server_authoritative",
    challengeWindowStatus: isPayoutControl ? "closed_after_notice" : "open_or_not_required",
    payoutMilestoneStatus: isPayoutControl ? "releasable" : "not_required_for_stage",
    evidenceStatus: isPayoutControl
      ? "claim_typed_evidence_passed"
      : "not_required_for_stage",
    destinationStatus: isPayoutControl
      ? "verified_destination_bound"
      : "not_required_for_stage",
    reviewedAt: "2026-06-08T12:00:00.000Z",
    expiresAt: "2026-09-08T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function recordsFor(controlKeys: MoralTradeFinancialSettlementControlKey[]) {
  return controlKeys.map((controlKey) => settlementControlRecord(controlKey));
}

function buildSampleEvaluations() {
  const lockDefinition = findTransition("matched_trade_lock");
  const payoutDefinition = findTransition("payout_milestone_release");

  return [
    evaluateMoralTradeFinancialSettlementControls({
      transition: "draft_preview",
      checkedAt: "2026-06-08T12:00:00.000Z",
      records: [],
    }),
    evaluateMoralTradeFinancialSettlementControls({
      transition: "matched_trade_lock",
      checkedAt: "2026-06-08T12:00:00.000Z",
      records: recordsFor(lockDefinition?.requiredControls ?? []),
    }),
    evaluateMoralTradeFinancialSettlementControls({
      transition: "payout_milestone_release",
      checkedAt: "2026-06-08T12:00:00.000Z",
      records: [
        ...recordsFor(
          (payoutDefinition?.requiredControls ?? []).filter(
            (controlKey) =>
              controlKey !== "platform_fee_disclosure" &&
              controlKey !== "fx_rate_snapshot" &&
              controlKey !== "payout_milestone_record" &&
              controlKey !== "material_notice_record" &&
              controlKey !== "server_deadline_record",
          ),
        ),
        settlementControlRecord("platform_fee_disclosure", {
          feeDisclosureStatus: "bundled_into_moral_volume",
          metricExclusionStatus: "included_in_moral_volume",
        }),
        settlementControlRecord("fx_rate_snapshot", {
          fxSnapshotStatus: "expired",
          feeDisclosureStatus: "bundled_into_moral_volume",
        }),
        settlementControlRecord("material_notice_record", {
          noticeDeliveryStatus: "failed",
        }),
        settlementControlRecord("server_deadline_record", {
          timeAuthorityStatus: "client_clock_used",
        }),
        settlementControlRecord("payout_milestone_record", {
          payoutMilestoneStatus: "challenge_open",
          evidenceStatus: "missing",
          destinationStatus: "changed_after_lock",
          challengeWindowStatus: "defaulted_against_participant",
        }),
      ],
    }),
  ];
}

export function getMoralTradeFinancialSettlementControlsContract():
  MoralTradeFinancialSettlementControlsContract {
  return {
    version: MORAL_TRADE_FINANCIAL_SETTLEMENT_CONTROLS_CONTRACT_VERSION,
    purpose:
      "Public validator-backed contract for first-class platform-fee, FX, notification, time-authority, challenge-window, and payout-milestone controls before Moral Trade real-money previews, locks, captures, releases, default outcomes, public metrics, or release-gate promotions.",
    failClosedRule:
      "Missing, mutable, stale, under-review, blocked, superseded, hidden-fee, stale-FX, metric-inclusion, failed-notice, client-clock, unresolved-challenge, missing-evidence, changed-destination, or unreleasable milestone states block the affected transition.",
    privacyBoundary:
      "Public contract output never exposes payment credentials, raw provider settlement reports, raw FX provider payloads, private notice payloads, participant identities, exact bank or wallet details, reviewer notes, raw evidence, internal fee ledgers, participant-specific fee/FX/payment records, or participant-specific deadline records.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    transitionDefinitions: TRANSITION_DEFINITIONS,
    controlKeys: CONTROL_KEYS,
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    contractNonClaims: [
      "Platform fees, FX spreads, and conversion fees are not moral-trade volume, QF signal, threshold progress, or recipient impact.",
      "A client clock, browser-local timezone, mutable display string, or unsynchronized job cannot decide rights expiry or money movement.",
      "A captured payment is not releasable until the payout milestone, evidence, notice, challenge window, and destination controls pass.",
    ],
    sampleEvaluations: buildSampleEvaluations(),
    contractTests: [
      "financial_settlement_controls_first_class_records",
      "draft_preview_passes_without_settlement_controls",
      "lock_requires_fee_fx_notice_time_and_challenge_controls",
      "payment_capture_blocks_hidden_fee_fx_notice_and_client_clock_failures",
      "payout_milestone_release_blocks_missing_evidence_destination_and_open_challenge",
      "api_health_spec_migration_schema_and_types_publish_settlement_controls_contract",
    ],
  };
}

export function validateMoralTradeFinancialSettlementControlsContract(
  contract = getMoralTradeFinancialSettlementControlsContract(),
): MoralTradeFinancialSettlementValidation {
  const sampleStatuses = contract.sampleEvaluations.map(
    (evaluation) => evaluation.status,
  );
  const checks = [
    check(
      "first_class_tables",
      "Financial settlement controls use first-class record tables",
      [
        "moral_trade_platform_fee_policies",
        "moral_trade_platform_fee_disclosures",
        "moral_trade_fx_policies",
        "moral_trade_fx_rate_snapshots",
        "moral_trade_notification_policies",
        "moral_trade_material_notice_records",
        "moral_trade_time_authority_policies",
        "moral_trade_deadline_records",
        "moral_trade_challenge_window_records",
        "moral_trade_payout_milestone_records",
      ].every((table) => contract.firstClassRecordTables.includes(table)),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy_snapshot_subjects",
      "Fee, FX, notice, time, challenge, and milestone policies are immutable snapshot subjects",
      [
        "platform_fee",
        "fx",
        "notification",
        "time_authority",
        "challenge_window",
        "payout_milestone",
      ].every((subject) => contract.policySnapshotSubjects.includes(subject)),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "control_coverage",
      "Control keys cover fee/FX disclosure, notices, server deadlines, challenges, and milestones",
      [
        "platform_fee_disclosure",
        "fx_rate_snapshot",
        "material_notice_record",
        "server_deadline_record",
        "challenge_window_record",
        "payout_milestone_record",
        "payout_milestone_evidence",
        "payout_destination_binding",
      ].every((controlKey) =>
        contract.controlKeys.includes(
          controlKey as MoralTradeFinancialSettlementControlKey,
        ),
      ),
      contract.controlKeys.join(", "),
    ),
    check(
      "high_risk_transitions",
      "Capture, default, payout release, public metrics, and release promotion are gated",
      [
        "payment_capture",
        "challenge_window_default",
        "payout_milestone_release",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (entry) => entry.key === transition && entry.requiredControls.length > 0,
        ),
      ),
      contract.transitionDefinitions
        .map((entry) => `${entry.key}:${entry.requiredControls.length}`)
        .join(", "),
    ),
    check(
      "non_claims",
      "Contract states fees and FX cannot inflate moral metrics",
      contract.contractNonClaims.some((claim) => /not moral-trade volume/i.test(claim)) &&
        contract.contractNonClaims.some((claim) => /client clock/i.test(claim)),
      contract.contractNonClaims.join(" | "),
    ),
    check(
      "sample_evaluations",
      "Synthetic samples include draft pass, lock pass, and payout block",
      sampleStatuses[0] === "pass" &&
        sampleStatuses[1] === "pass" &&
        sampleStatuses[2] === "blocked",
      sampleStatuses.join(", "),
    ),
    check(
      "privacy_boundary",
      "Public contract does not expose private settlement artifacts",
      /never exposes/i.test(contract.privacyBoundary) &&
        /payment credentials/i.test(contract.privacyBoundary) &&
        /private notice payloads/i.test(contract.privacyBoundary) &&
        /raw FX provider payloads/i.test(contract.privacyBoundary) &&
        /participant-specific fee\/FX\/payment records/i.test(contract.privacyBoundary) &&
        /participant-specific deadline records/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-financial-settlement-controls-contract",
    validatorVersion:
      MORAL_TRADE_FINANCIAL_SETTLEMENT_CONTROLS_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
