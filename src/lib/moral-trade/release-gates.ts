export const MORAL_TRADE_RELEASE_GATE_CONTRACT_VERSION =
  "moral-trade-release-gates-v0.1-2026-06";
export const MORAL_TRADE_RELEASE_GATE_VALIDATOR_VERSION =
  "moral-trade-release-gate-validator-v0.1";

export type MoralTradeReleaseStage =
  | "public_goods_preview"
  | "donation_offset_payable"
  | "pledge_swap_reliance_manual_pilot"
  | "capped_real_money_release"
  | "public_metric_release";

export type MoralTradeReleaseGateRequirementStatus =
  | "passed"
  | "not_required_for_stage"
  | "waived_by_neutral_review"
  | "failed"
  | "missing"
  | "stale"
  | "unknown"
  | "under_review";

export type MoralTradePolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradePrivilegedActionStatus =
  | "not_required"
  | "dual_control_approved"
  | "neutral_review_approved"
  | "missing"
  | "rejected"
  | "stale";

export type MoralTradeReleaseGateEvaluationStatus = "pass" | "blocked";

export interface MoralTradeReleaseStageContract {
  key: MoralTradeReleaseStage;
  label: string;
  featureFlagKey: string;
  payable: boolean;
  relianceBearing: boolean;
  publicMetricsMayPublish: boolean;
  requiredRequirementKeys: string[];
  inactiveRequirementKeys: string[];
  hardBlockerSummary: string;
}

export interface MoralTradeReleaseGateRequirementDefinition {
  key: string;
  label: string;
  category:
    | "calculation"
    | "health"
    | "privacy"
    | "safety"
    | "payment"
    | "evidence"
    | "review"
    | "operations"
    | "policy"
    | "participant"
    | "recipient"
    | "audit"
    | "metrics";
  policySnapshotRequired: boolean;
  privilegedActionRequired: boolean;
  description: string;
}

export interface MoralTradeReleaseGateRequirementResult {
  key: string;
  status: MoralTradeReleaseGateRequirementStatus;
  evidenceRef: string;
  policySnapshotStatus: MoralTradePolicySnapshotStatus;
  privilegedActionStatus: MoralTradePrivilegedActionStatus;
  recordedAt: string;
}

export interface MoralTradeReleaseGateEvaluationInput {
  stage: MoralTradeReleaseStage;
  gateId: string;
  policySnapshotBundleStatus: MoralTradePolicySnapshotStatus;
  stateInterpretationPolicyStatus: MoralTradePolicySnapshotStatus;
  featureFlagEnabled: boolean;
  emergencyPaused: boolean;
  results: MoralTradeReleaseGateRequirementResult[];
}

export interface MoralTradeReleaseGateEvaluation {
  status: MoralTradeReleaseGateEvaluationStatus;
  stage: MoralTradeReleaseStage;
  gateId: string;
  payable: boolean;
  relianceBearing: boolean;
  publicMetricsMayPublish: boolean;
  requiredRequirementCount: number;
  inactiveRequirementCount: number;
  passedRequirementCount: number;
  notRequiredRequirementCount: number;
  waivedRequirementCount: number;
  blockers: string[];
  checkedAt: string;
}

export interface MoralTradeReleaseGateCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeReleaseGateValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-release-gate-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeReleaseGateCheck[];
  blockers: string[];
}

export interface MoralTradeReleaseGateContract {
  version: string;
  purpose: string;
  stateInterpretationRule: string;
  policySnapshotRule: string;
  firstClassRecordTables: string[];
  immutablePolicySnapshotSubjects: string[];
  privilegedActionKeys: string[];
  stages: MoralTradeReleaseStageContract[];
  requirementDefinitions: MoralTradeReleaseGateRequirementDefinition[];
  sampleEvaluations: MoralTradeReleaseGateEvaluation[];
  contractTests: string[];
}

const CONTRACT_TESTS = [
  "release_gate_contract_validator",
  "release_gate_missing_results_fail_closed",
  "release_gate_stale_unknown_states_block",
  "release_gate_waivers_require_neutral_review",
  "release_gate_inactive_controls_require_not_required_policy_snapshot",
  "release_gate_api_route_contract",
] as const;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_policy_snapshots",
  "moral_trade_state_interpretation_policies",
  "moral_trade_release_gates",
  "moral_trade_release_gate_requirement_results",
  "moral_trade_privileged_action_records",
  "moral_trade_participant_confirmation_records",
  "moral_trade_consent_quality_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "release_gate",
  "state_interpretation",
  "payment_capture",
  "payout_release",
  "refund_cancellation",
  "provider_source_authentication",
  "time_authority",
  "notification",
  "fx",
  "platform_fee",
  "public_metrics",
  "data_retention",
  "participant_eligibility",
  "recipient_destination_verification",
  "account_security",
  "backup_recovery",
  "deployment_release",
  "configuration_snapshot",
  "schema_migration",
  "environment_data_isolation",
  "financial_reconciliation",
  "audit_integrity",
  "data_security",
] as const;

const PRIVILEGED_ACTION_KEYS = [
  "release_gate_approval",
  "policy_snapshot_approval",
  "recipient_destination_verification",
  "private_data_access_grant",
  "impact_claim_publication",
  "blocker_override",
  "manual_capture",
  "manual_payout_release",
  "emergency_unpause",
  "nonroutine_refund_cancellation",
] as const;

export const MORAL_TRADE_RELEASE_GATE_REQUIREMENTS: MoralTradeReleaseGateRequirementDefinition[] = [
  {
    key: "dry_run_calculation",
    label: "Dry-run calculation",
    category: "calculation",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "A deterministic dry-run calculation, input bundle hash, and excluded-record list exist before payable or reliance-bearing launch.",
  },
  {
    key: "route_health_output",
    label: "Route health output",
    category: "health",
    policySnapshotRequired: false,
    privilegedActionRequired: false,
    description:
      "Route baseline and public contract health output are current for the target release stage.",
  },
  {
    key: "privacy_review",
    label: "Privacy review",
    category: "privacy",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Public and counterparty surfaces have reviewed redaction, grant, small-cell, and access-log boundaries.",
  },
  {
    key: "anti_threat_review",
    label: "Anti-threat review",
    category: "safety",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Threat, extortion, coercion, anti-corruption, hazardous-activity, and prohibited-use checks are non-blocking.",
  },
  {
    key: "provider_event_replay_tests",
    label: "Provider-event replay tests",
    category: "payment",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Provider source authentication, idempotency, replay, stale snapshot, endpoint, account, and server-time tests pass.",
  },
  {
    key: "evidence_challenge_tests",
    label: "Evidence challenge tests",
    category: "evidence",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Claim-typed evidence, challenge-window, default-outcome, dispute-case, and payout-milestone blocking tests pass.",
  },
  {
    key: "reviewer_conflict_tests",
    label: "Reviewer conflict tests",
    category: "review",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Reviewer conflict-of-interest, recusal, neutral reviewer, and panel-assignment tests pass.",
  },
  {
    key: "emergency_pause_tests",
    label: "Emergency-pause tests",
    category: "operations",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Emergency pause blocks new authorizations and captures without deleting audit records or blocking required refunds.",
  },
  {
    key: "participant_confirmation_records",
    label: "Participant confirmation records",
    category: "participant",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Non-stale first-class confirmations bind baseline, terms, policy bundle, exposure, notice, and confirmation scope.",
  },
  {
    key: "participant_eligibility_records",
    label: "Participant eligibility records",
    category: "participant",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Identity, human uniqueness, legal capacity, sanctions, payment-rail, and jurisdiction eligibility are non-blocking.",
  },
  {
    key: "recipient_destination_verification",
    label: "Recipient and destination verification",
    category: "recipient",
    policySnapshotRequired: true,
    privilegedActionRequired: true,
    description:
      "Recipient registry entries and payment destinations are verified records, not free-text names, links, wallets, or bank details.",
  },
  {
    key: "financial_reconciliation",
    label: "Financial reconciliation",
    category: "payment",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Ledger, settlement report, provider event, fee, and refund/cancellation reconciliation is non-blocking before release.",
  },
  {
    key: "audit_integrity_checkpoint",
    label: "Audit integrity checkpoint",
    category: "audit",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Append-only records have a fresh tamper-evident checkpoint before money, public impact, or gate promotion claims.",
  },
  {
    key: "public_metric_suppression",
    label: "Public metric suppression",
    category: "metrics",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Public metrics enforce small-cell suppression, live/demo separation, rare-slice protection, and non-live exclusions.",
  },
  {
    key: "cause_bucket_taxonomy_review_test",
    label: "Cause-bucket taxonomy review test",
    category: "review",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Versioned, plural-reviewed, privacy-safe, non-ranking cause-bucket taxonomy and assignment records pass before bucket labels affect distinctness, classification, clearing, public metrics, or release promotion.",
  },
  {
    key: "resource_compatibility_assessment_test",
    label: "Resource-compatibility assessment test",
    category: "review",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "First-class joint-feasibility assessments pass before non-public-goods trades with actions, donations, abstentions, destinations, timing, duties, or control claims can lock, clear, capture, count publicly, or promote release gates.",
  },
  {
    key: "net_offset_accounting_test",
    label: "Net-offset accounting test",
    category: "metrics",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Net-of-offset accounting records baseline opposed action, matched canceled amount, compromise transfer, sponsor or match amount, residual opposed action, substitution-channel state, and evidence standard before donation-offset volume or completion can be counted.",
  },
  {
    key: "offer_validity_record_test",
    label: "Offer-validity record test",
    category: "review",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Offer-validity records prove baselines, empirical assumptions, evidence standards, payment methods, jurisdictions, destinations, and counterparty buckets are current or renewed before matching, lock, capture, reliance, public completion, or release promotion.",
  },
] as const satisfies MoralTradeReleaseGateRequirementDefinition[];

const RELEASE_STAGES: MoralTradeReleaseStageContract[] = [
  {
    key: "public_goods_preview",
    label: "Public-goods preview",
    featureFlagKey: "moral_trade_public_goods_preview",
    payable: false,
    relianceBearing: false,
    publicMetricsMayPublish: false,
    requiredRequirementKeys: ["route_health_output", "privacy_review", "anti_threat_review"],
    inactiveRequirementKeys: [
      "provider_event_replay_tests",
      "evidence_challenge_tests",
      "reviewer_conflict_tests",
      "emergency_pause_tests",
      "participant_confirmation_records",
      "participant_eligibility_records",
      "recipient_destination_verification",
      "financial_reconciliation",
      "audit_integrity_checkpoint",
      "public_metric_suppression",
      "cause_bucket_taxonomy_review_test",
      "resource_compatibility_assessment_test",
      "net_offset_accounting_test",
      "offer_validity_record_test",
    ],
    hardBlockerSummary:
      "Preview can render only when route, privacy, and anti-threat evidence pass; later controls must be explicit not-required decisions.",
  },
  {
    key: "donation_offset_payable",
    label: "Donation-offset payable mode",
    featureFlagKey: "moral_trade_donation_offset_payable",
    payable: true,
    relianceBearing: true,
    publicMetricsMayPublish: false,
    requiredRequirementKeys: [
      "dry_run_calculation",
      "route_health_output",
      "privacy_review",
      "anti_threat_review",
      "provider_event_replay_tests",
      "evidence_challenge_tests",
      "reviewer_conflict_tests",
      "emergency_pause_tests",
      "participant_confirmation_records",
      "participant_eligibility_records",
      "recipient_destination_verification",
      "financial_reconciliation",
      "audit_integrity_checkpoint",
      "cause_bucket_taxonomy_review_test",
      "resource_compatibility_assessment_test",
      "net_offset_accounting_test",
      "offer_validity_record_test",
    ],
    inactiveRequirementKeys: ["public_metric_suppression"],
    hardBlockerSummary:
      "Payable mode requires every payment, evidence, review, confirmation, eligibility, destination, reconciliation, and audit gate to pass.",
  },
  {
    key: "pledge_swap_reliance_manual_pilot",
    label: "Pledge-swap reliance manual pilot",
    featureFlagKey: "moral_trade_pledge_swap_reliance_manual_pilot",
    payable: false,
    relianceBearing: true,
    publicMetricsMayPublish: false,
    requiredRequirementKeys: [
      "dry_run_calculation",
      "route_health_output",
      "privacy_review",
      "anti_threat_review",
      "evidence_challenge_tests",
      "reviewer_conflict_tests",
      "emergency_pause_tests",
      "participant_confirmation_records",
      "participant_eligibility_records",
      "audit_integrity_checkpoint",
      "cause_bucket_taxonomy_review_test",
      "resource_compatibility_assessment_test",
    ],
    inactiveRequirementKeys: [
      "provider_event_replay_tests",
      "recipient_destination_verification",
      "financial_reconciliation",
      "public_metric_suppression",
      "net_offset_accounting_test",
      "offer_validity_record_test",
    ],
    hardBlockerSummary:
      "Reliance-bearing swaps require deterministic lock evidence, participant eligibility, challenge evidence, neutral review, and audit gates.",
  },
  {
    key: "capped_real_money_release",
    label: "Capped real-money release",
    featureFlagKey: "moral_trade_capped_real_money_release",
    payable: true,
    relianceBearing: true,
    publicMetricsMayPublish: false,
    requiredRequirementKeys: [
      "dry_run_calculation",
      "route_health_output",
      "privacy_review",
      "anti_threat_review",
      "provider_event_replay_tests",
      "evidence_challenge_tests",
      "reviewer_conflict_tests",
      "emergency_pause_tests",
      "participant_confirmation_records",
      "participant_eligibility_records",
      "recipient_destination_verification",
      "financial_reconciliation",
      "audit_integrity_checkpoint",
      "cause_bucket_taxonomy_review_test",
      "resource_compatibility_assessment_test",
      "net_offset_accounting_test",
      "offer_validity_record_test",
    ],
    inactiveRequirementKeys: ["public_metric_suppression"],
    hardBlockerSummary:
      "Capped real-money release requires all operational, policy, payment, eligibility, destination, and audit gates before capture or payout release.",
  },
  {
    key: "public_metric_release",
    label: "Public metric release",
    featureFlagKey: "moral_trade_public_metric_release",
    payable: false,
    relianceBearing: false,
    publicMetricsMayPublish: true,
    requiredRequirementKeys: [
      "route_health_output",
      "privacy_review",
      "audit_integrity_checkpoint",
      "public_metric_suppression",
      "cause_bucket_taxonomy_review_test",
      "resource_compatibility_assessment_test",
      "net_offset_accounting_test",
      "offer_validity_record_test",
    ],
    inactiveRequirementKeys: [
      "dry_run_calculation",
      "provider_event_replay_tests",
      "evidence_challenge_tests",
      "reviewer_conflict_tests",
      "emergency_pause_tests",
      "participant_confirmation_records",
      "participant_eligibility_records",
      "recipient_destination_verification",
      "financial_reconciliation",
    ],
    hardBlockerSummary:
      "Public metric release is allowed only for aggregate, suppressed, live/demo-separated metrics backed by audit checkpoints.",
  },
];

const requirementByKey = new Map(
  MORAL_TRADE_RELEASE_GATE_REQUIREMENTS.map((requirement) => [
    requirement.key,
    requirement,
  ]),
);

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeReleaseGateCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function getStage(stage: MoralTradeReleaseStage) {
  return RELEASE_STAGES.find((entry) => entry.key === stage) ?? null;
}

function resultKeySet(results: readonly MoralTradeReleaseGateRequirementResult[]) {
  return new Set(results.map((result) => result.key));
}

function isFreshIsoTimestamp(value: string) {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return false;
  }

  const maxAgeMs = 1000 * 60 * 60 * 24 * 90;

  return Date.now() - parsed <= maxAgeMs;
}

function makeResult(
  key: string,
  status: MoralTradeReleaseGateRequirementStatus,
  overrides: Partial<MoralTradeReleaseGateRequirementResult> = {},
): MoralTradeReleaseGateRequirementResult {
  return {
    key,
    status,
    evidenceRef: `synthetic://${key}`,
    policySnapshotStatus: "resolved_immutable",
    privilegedActionStatus: "not_required",
    recordedAt: new Date().toISOString(),
    ...overrides,
  };
}

function samplePreviewEvaluation() {
  return evaluateMoralTradeReleaseGate({
    stage: "public_goods_preview",
    gateId: "sample-preview-gate",
    policySnapshotBundleStatus: "resolved_immutable",
    stateInterpretationPolicyStatus: "resolved_immutable",
    featureFlagEnabled: true,
    emergencyPaused: false,
    results: [
      makeResult("route_health_output", "passed", {
        policySnapshotStatus: "resolved_immutable",
      }),
      makeResult("privacy_review", "passed"),
      makeResult("anti_threat_review", "passed"),
      ...RELEASE_STAGES.find((stage) => stage.key === "public_goods_preview")!.inactiveRequirementKeys.map(
        (key) => makeResult(key, "not_required_for_stage"),
      ),
    ],
  });
}

function samplePayableEvaluation() {
  return evaluateMoralTradeReleaseGate({
    stage: "donation_offset_payable",
    gateId: "sample-payable-gate",
    policySnapshotBundleStatus: "resolved_immutable",
    stateInterpretationPolicyStatus: "resolved_immutable",
    featureFlagEnabled: true,
    emergencyPaused: false,
    results: [
      makeResult("dry_run_calculation", "passed"),
      makeResult("route_health_output", "passed"),
      makeResult("privacy_review", "passed"),
      makeResult("anti_threat_review", "passed"),
      makeResult("provider_event_replay_tests", "missing", {
        evidenceRef: "",
      }),
      makeResult("evidence_challenge_tests", "under_review"),
      makeResult("reviewer_conflict_tests", "passed"),
      makeResult("emergency_pause_tests", "passed"),
      makeResult("participant_confirmation_records", "passed"),
      makeResult("participant_eligibility_records", "stale"),
      makeResult("recipient_destination_verification", "passed", {
        privilegedActionStatus: "missing",
      }),
      makeResult("financial_reconciliation", "passed"),
      makeResult("audit_integrity_checkpoint", "passed"),
      makeResult("cause_bucket_taxonomy_review_test", "passed"),
      makeResult("resource_compatibility_assessment_test", "passed"),
      makeResult("net_offset_accounting_test", "passed"),
      makeResult("offer_validity_record_test", "passed"),
      makeResult("public_metric_suppression", "not_required_for_stage"),
    ],
  });
}

export function evaluateMoralTradeReleaseGate(
  input: MoralTradeReleaseGateEvaluationInput,
): MoralTradeReleaseGateEvaluation {
  const stage = getStage(input.stage);
  const blockers: string[] = [];
  const resultsByKey = new Map(input.results.map((result) => [result.key, result]));

  if (!stage) {
    blockers.push(`unknown_stage:${input.stage}`);
  }

  if (input.policySnapshotBundleStatus !== "resolved_immutable") {
    blockers.push(`policy_snapshot_bundle_not_immutable:${input.policySnapshotBundleStatus}`);
  }

  if (input.stateInterpretationPolicyStatus !== "resolved_immutable") {
    blockers.push(
      `state_interpretation_policy_not_immutable:${input.stateInterpretationPolicyStatus}`,
    );
  }

  if (input.emergencyPaused) {
    blockers.push("emergency_pause_active");
  }

  if (stage && (stage.payable || stage.relianceBearing || stage.publicMetricsMayPublish) && !input.featureFlagEnabled) {
    blockers.push(`feature_flag_disabled:${stage.featureFlagKey}`);
  }

  const requiredRequirementKeys = stage?.requiredRequirementKeys ?? [];
  const inactiveRequirementKeys = stage?.inactiveRequirementKeys ?? [];

  for (const key of [...requiredRequirementKeys, ...inactiveRequirementKeys]) {
    if (!requirementByKey.has(key)) {
      blockers.push(`unknown_requirement_definition:${key}`);
    }
  }

  for (const key of requiredRequirementKeys) {
    const result = resultsByKey.get(key);
    const definition = requirementByKey.get(key);

    if (!result) {
      blockers.push(`missing_required_result:${key}`);
      continue;
    }

    if (!result.evidenceRef.trim()) {
      blockers.push(`missing_evidence_ref:${key}`);
    }

    if (!isFreshIsoTimestamp(result.recordedAt)) {
      blockers.push(`stale_or_invalid_result_timestamp:${key}`);
    }

    if (definition?.policySnapshotRequired && result.policySnapshotStatus !== "resolved_immutable") {
      blockers.push(`requirement_policy_snapshot_not_immutable:${key}:${result.policySnapshotStatus}`);
    }

    if (
      definition?.privilegedActionRequired &&
      !["dual_control_approved", "neutral_review_approved"].includes(result.privilegedActionStatus)
    ) {
      blockers.push(`privileged_action_not_approved:${key}:${result.privilegedActionStatus}`);
    }

    if (result.status === "passed") {
      continue;
    }

    if (result.status === "waived_by_neutral_review") {
      if (result.privilegedActionStatus !== "neutral_review_approved") {
        blockers.push(`waiver_without_neutral_review:${key}`);
      }

      continue;
    }

    blockers.push(`required_result_not_passed:${key}:${result.status}`);
  }

  for (const key of inactiveRequirementKeys) {
    const result = resultsByKey.get(key);

    if (!result) {
      blockers.push(`missing_inactive_control_representation:${key}`);
      continue;
    }

    if (result.status !== "not_required_for_stage") {
      blockers.push(`inactive_control_not_explicitly_not_required:${key}:${result.status}`);
    }

    if (result.policySnapshotStatus !== "resolved_immutable") {
      blockers.push(`inactive_control_policy_snapshot_not_immutable:${key}:${result.policySnapshotStatus}`);
    }
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    stage: input.stage,
    gateId: input.gateId,
    payable: stage?.payable ?? false,
    relianceBearing: stage?.relianceBearing ?? false,
    publicMetricsMayPublish: stage?.publicMetricsMayPublish ?? false,
    requiredRequirementCount: requiredRequirementKeys.length,
    inactiveRequirementCount: inactiveRequirementKeys.length,
    passedRequirementCount: input.results.filter((result) => result.status === "passed").length,
    notRequiredRequirementCount: input.results.filter(
      (result) => result.status === "not_required_for_stage",
    ).length,
    waivedRequirementCount: input.results.filter(
      (result) => result.status === "waived_by_neutral_review",
    ).length,
    blockers,
    checkedAt: new Date().toISOString(),
  };
}

export function getMoralTradeReleaseGateContract(): MoralTradeReleaseGateContract {
  return {
    version: MORAL_TRADE_RELEASE_GATE_CONTRACT_VERSION,
    purpose:
      "Public contract for fail-closed Moral Trade release gates: immutable policy snapshots, frozen state interpretation, first-class requirement results, privileged-action approval, explicit inactive-control decisions, and staged feature flags before payable, reliance-bearing, or public-metric behavior.",
    stateInterpretationRule:
      "Missing, unknown, stale, under-review, superseded, unmapped, or mutable states block payable, releasable, reliance-bearing, privacy-disclosing, public-metric, and release-gate transitions unless a frozen policy snapshot explicitly marks the requirement not required for that release stage.",
    policySnapshotRule:
      "Every policy reference affecting locked agreements, clearing, allocation, evidence, fees, FX, notifications, legal availability, metrics, payout release, refund/cancellation, data retention, or state interpretation resolves to an immutable policy snapshot before the gate can pass.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    immutablePolicySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    privilegedActionKeys: [...PRIVILEGED_ACTION_KEYS],
    stages: RELEASE_STAGES.map((stage) => ({ ...stage })),
    requirementDefinitions: MORAL_TRADE_RELEASE_GATE_REQUIREMENTS.map((requirement) => ({
      ...requirement,
    })),
    sampleEvaluations: [samplePreviewEvaluation(), samplePayableEvaluation()],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeReleaseGateContract(
  contract: MoralTradeReleaseGateContract = getMoralTradeReleaseGateContract(),
): MoralTradeReleaseGateValidation {
  const requirementKeys = contract.requirementDefinitions.map((requirement) => requirement.key);
  const stageKeys = contract.stages.map((stage) => stage.key);
  const allStageRequirementKeys = contract.stages.flatMap((stage) => [
    ...stage.requiredRequirementKeys,
    ...stage.inactiveRequirementKeys,
  ]);
  const samplePreview = contract.sampleEvaluations.find(
    (evaluation) => evaluation.stage === "public_goods_preview",
  );
  const samplePayable = contract.sampleEvaluations.find(
    (evaluation) => evaluation.stage === "donation_offset_payable",
  );
  const checks = [
    check(
      "stage-coverage",
      "Release stages cover preview, payable, reliance, capped real-money, and public metrics",
      [
        "public_goods_preview",
        "donation_offset_payable",
        "pledge_swap_reliance_manual_pilot",
        "capped_real_money_release",
        "public_metric_release",
      ].every((stage) => stageKeys.includes(stage as MoralTradeReleaseStage)) &&
        contract.stages.every(
          (stage) =>
            stage.featureFlagKey.startsWith("moral_trade_") &&
            stage.requiredRequirementKeys.length > 0,
        ),
      stageKeys.join(", "),
    ),
    check(
      "requirement-definition-coverage",
      "Every stage requirement resolves to a typed definition",
      allStageRequirementKeys.every((key) => requirementKeys.includes(key)) &&
        requirementKeys.includes("provider_event_replay_tests") &&
        requirementKeys.includes("emergency_pause_tests") &&
        requirementKeys.includes("participant_confirmation_records") &&
        requirementKeys.includes("recipient_destination_verification") &&
        requirementKeys.includes("audit_integrity_checkpoint") &&
        requirementKeys.includes("cause_bucket_taxonomy_review_test") &&
        requirementKeys.includes("resource_compatibility_assessment_test") &&
        requirementKeys.includes("net_offset_accounting_test") &&
        requirementKeys.includes("offer_validity_record_test"),
      requirementKeys.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Immutable policy snapshot subjects cover state, payment, FX, notification, metrics, and retention",
      [
        "state_interpretation",
        "payment_capture",
        "payout_release",
        "refund_cancellation",
        "provider_source_authentication",
        "time_authority",
        "notification",
        "fx",
        "platform_fee",
        "public_metrics",
        "data_retention",
      ].every((subject) => contract.immutablePolicySnapshotSubjects.includes(subject)),
      contract.immutablePolicySnapshotSubjects.join(", "),
    ),
    check(
      "first-class-record-tables",
      "Release gates, policy snapshots, requirement results, state interpretation, and privileged actions are first-class records",
      [...FIRST_CLASS_RECORD_TABLES].every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "privileged-action-coverage",
      "Privileged actions include gate approval, manual money movement, private grants, and emergency unpause",
      [
        "release_gate_approval",
        "manual_capture",
        "manual_payout_release",
        "private_data_access_grant",
        "emergency_unpause",
        "nonroutine_refund_cancellation",
      ].every((key) => contract.privilegedActionKeys.includes(key)),
      contract.privilegedActionKeys.join(", "),
    ),
    check(
      "fail-closed-state-rule",
      "State interpretation rule blocks unknown, stale, unmapped, and mutable states",
      /Missing, unknown, stale, under-review, superseded, unmapped, or mutable states block/.test(
        contract.stateInterpretationRule,
      ),
      contract.stateInterpretationRule,
    ),
    check(
      "sample-preview-passes-with-inactive-controls",
      "Preview sample passes only with explicit not-required inactive controls",
      samplePreview?.status === "pass" &&
        samplePreview.inactiveRequirementCount > 0 &&
        samplePreview.notRequiredRequirementCount === samplePreview.inactiveRequirementCount,
      samplePreview
        ? `${samplePreview.status}:${samplePreview.notRequiredRequirementCount}/${samplePreview.inactiveRequirementCount}`
        : "missing",
    ),
    check(
      "sample-payable-fails-closed",
      "Payable sample fails closed when provider, eligibility, or privileged destination evidence is missing",
      samplePayable?.status === "blocked" &&
        samplePayable.blockers.some((blocker) =>
          blocker.includes("provider_event_replay_tests"),
        ) &&
        samplePayable.blockers.some((blocker) =>
          blocker.includes("participant_eligibility_records"),
        ) &&
        samplePayable.blockers.some((blocker) =>
          blocker.includes("recipient_destination_verification"),
        ),
      samplePayable ? samplePayable.blockers.join(", ") : "missing",
    ),
    check(
      "contract-tests",
      "Contract test hooks are named",
      [...CONTRACT_TESTS].every((key) => contract.contractTests.includes(key)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-release-gate-contract",
    validatorVersion: MORAL_TRADE_RELEASE_GATE_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeReleaseGates = {
  evaluateMoralTradeReleaseGate,
  getMoralTradeReleaseGateContract,
  validateMoralTradeReleaseGateContract,
};

export default moralTradeReleaseGates;
