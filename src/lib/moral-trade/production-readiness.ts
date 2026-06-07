export const MORAL_TRADE_PRODUCTION_READINESS_CONTRACT_VERSION =
  "moral-trade-production-readiness-v0.1-2026-06";
export const MORAL_TRADE_PRODUCTION_READINESS_VALIDATOR_VERSION =
  "moral-trade-production-readiness-validator-v0.1";

export type MoralTradeProductionReadinessGate =
  | "sandbox_calculation_preview"
  | "real_money_capture"
  | "payout_release"
  | "round_close"
  | "public_money_metric_release"
  | "privacy_disclosure"
  | "release_gate_promotion"
  | "non_emergency_privileged_change";

export type MoralTradeProductionControlKey =
  | "account_security"
  | "backup_recovery"
  | "deployment_configuration"
  | "schema_migration"
  | "environment_data_isolation"
  | "financial_reconciliation"
  | "audit_integrity"
  | "data_security_key_management";

export type MoralTradeProductionControlStatus =
  | "ready"
  | "not_required_for_stage"
  | "missing"
  | "failed"
  | "stale"
  | "under_review"
  | "drift_detected"
  | "unverified"
  | "restore_failed"
  | "variance_unresolved"
  | "high_risk_event_open";

export type MoralTradeProductionPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradeProductionControlDefinition {
  key: MoralTradeProductionControlKey;
  label: string;
  firstClassRecordTables: string[];
  policySnapshotSubject: string;
  blocks: MoralTradeProductionReadinessGate[];
  description: string;
}

export interface MoralTradeProductionGateDefinition {
  key: MoralTradeProductionReadinessGate;
  label: string;
  requiredControls: MoralTradeProductionControlKey[];
  userFacingBlockerCategory: string;
}

export interface MoralTradeProductionControlRecord {
  controlKey: MoralTradeProductionControlKey;
  status: MoralTradeProductionControlStatus;
  policySnapshotStatus: MoralTradeProductionPolicySnapshotStatus;
  evidenceHash: string;
  recordTable: string;
  lastVerifiedAt: string;
  subjectRef?: string;
}

export interface MoralTradeProductionReadinessEvaluationInput {
  gate: MoralTradeProductionReadinessGate;
  checkedAt?: string;
  records: MoralTradeProductionControlRecord[];
}

export interface MoralTradeProductionReadinessEvaluation {
  status: "pass" | "blocked";
  gate: MoralTradeProductionReadinessGate;
  requiredControlCount: number;
  passingControlCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
  checkedAt: string;
}

export interface MoralTradeProductionReadinessCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeProductionReadinessValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-production-readiness-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeProductionReadinessCheck[];
  blockers: string[];
}

export interface MoralTradeProductionReadinessContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  failClosedStatuses: MoralTradeProductionControlStatus[];
  controlDefinitions: MoralTradeProductionControlDefinition[];
  gateDefinitions: MoralTradeProductionGateDefinition[];
  sampleEvaluations: MoralTradeProductionReadinessEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_CONTROL_AGE_DAYS = 30;

const CONTRACT_TESTS = [
  "production_readiness_contract_validator",
  "production_readiness_missing_controls_fail_closed",
  "production_readiness_stale_or_drifted_controls_block",
  "production_readiness_policy_snapshots_must_be_immutable",
  "production_readiness_route_health_spec_and_migration_wiring",
];

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_account_security_policies",
  "moral_trade_account_security_events",
  "moral_trade_backup_recovery_policies",
  "moral_trade_backup_recovery_checkpoints",
  "moral_trade_deployment_release_records",
  "moral_trade_configuration_snapshots",
  "moral_trade_configuration_change_records",
  "moral_trade_schema_migration_policies",
  "moral_trade_schema_migration_runs",
  "moral_trade_environment_data_isolation_policies",
  "moral_trade_environment_data_isolation_records",
  "moral_trade_financial_reconciliation_policies",
  "moral_trade_financial_reconciliation_runs",
  "moral_trade_audit_integrity_policies",
  "moral_trade_audit_integrity_checkpoints",
  "moral_trade_data_security_policies",
  "moral_trade_key_version_records",
];

const POLICY_SNAPSHOT_SUBJECTS = [
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

const FAIL_CLOSED_STATUSES: MoralTradeProductionControlStatus[] = [
  "missing",
  "failed",
  "stale",
  "under_review",
  "drift_detected",
  "unverified",
  "restore_failed",
  "variance_unresolved",
  "high_risk_event_open",
];

const CONTROL_DEFINITIONS: MoralTradeProductionControlDefinition[] = [
  {
    key: "account_security",
    label: "Account security and step-up blockers",
    firstClassRecordTables: [
      "moral_trade_account_security_policies",
      "moral_trade_account_security_events",
    ],
    policySnapshotSubject: "account_security",
    blocks: [
      "real_money_capture",
      "payout_release",
      "privacy_disclosure",
      "non_emergency_privileged_change",
    ],
    description:
      "Password, email, MFA, session, payment-method, identity, and recovery risk events must be non-blocking before confirmations, capture, release, privacy disclosure, or exposure increases.",
  },
  {
    key: "backup_recovery",
    label: "Backup and restore-test checkpoint",
    firstClassRecordTables: [
      "moral_trade_backup_recovery_policies",
      "moral_trade_backup_recovery_checkpoints",
    ],
    policySnapshotSubject: "backup_recovery",
    blocks: [
      "payout_release",
      "round_close",
      "public_money_metric_release",
      "release_gate_promotion",
      "non_emergency_privileged_change",
    ],
    description:
      "Recoverability must preserve audit chains, key-version references, legal holds, redactions, and append-only state before release promotion or public money claims.",
  },
  {
    key: "deployment_configuration",
    label: "Deployment, dependency, environment, provider, and feature-flag provenance",
    firstClassRecordTables: [
      "moral_trade_deployment_release_records",
      "moral_trade_configuration_snapshots",
      "moral_trade_configuration_change_records",
    ],
    policySnapshotSubject: "deployment_release",
    blocks: [
      "real_money_capture",
      "payout_release",
      "round_close",
      "public_money_metric_release",
      "privacy_disclosure",
      "release_gate_promotion",
      "non_emergency_privileged_change",
    ],
    description:
      "Code artifact, lockfile, environment configuration, provider account, payment mode, feature flags, and policy bundle must match the reviewed release record.",
  },
  {
    key: "schema_migration",
    label: "Schema migration dry-run and rollback safety",
    firstClassRecordTables: [
      "moral_trade_schema_migration_policies",
      "moral_trade_schema_migration_runs",
    ],
    policySnapshotSubject: "schema_migration",
    blocks: [
      "real_money_capture",
      "round_close",
      "release_gate_promotion",
    ],
    description:
      "Migrations and backfills that can alter baselines, confirmations, evidence, ledgers, privacy grants, policy snapshots, reviewer decisions, payment state, or audit chains need dry-run hashes, count checks, and rollback or forward-fix evidence.",
  },
  {
    key: "environment_data_isolation",
    label: "Demo, sandbox, test, staging, and live data isolation",
    firstClassRecordTables: [
      "moral_trade_environment_data_isolation_policies",
      "moral_trade_environment_data_isolation_records",
    ],
    policySnapshotSubject: "environment_data_isolation",
    blocks: [
      "sandbox_calculation_preview",
      "real_money_capture",
      "round_close",
      "public_money_metric_release",
      "release_gate_promotion",
    ],
    description:
      "Demo records, worked examples, sandbox provider events, synthetic identities, and dry-run allocation outputs must not count toward live thresholds, supporter counts, QF signal, payout totals, sponsor leverage, moral-trade volume, or completed agreements.",
  },
  {
    key: "financial_reconciliation",
    label: "Financial reconciliation and settlement matching",
    firstClassRecordTables: [
      "moral_trade_financial_reconciliation_policies",
      "moral_trade_financial_reconciliation_runs",
    ],
    policySnapshotSubject: "financial_reconciliation",
    blocks: [
      "payout_release",
      "round_close",
      "public_money_metric_release",
    ],
    description:
      "Authorizations, captures, refunds, fees, sponsor funds, payout releases, provider settlement records, and internal ledger entries must reconcile before payout release, round close, or public money claims.",
  },
  {
    key: "audit_integrity",
    label: "Tamper-evident audit integrity checkpoint",
    firstClassRecordTables: [
      "moral_trade_audit_integrity_policies",
      "moral_trade_audit_integrity_checkpoints",
    ],
    policySnapshotSubject: "audit_integrity",
    blocks: [
      "real_money_capture",
      "payout_release",
      "round_close",
      "public_money_metric_release",
      "privacy_disclosure",
      "release_gate_promotion",
      "non_emergency_privileged_change",
    ],
    description:
      "Review decisions, evidence records, payment events, marketplace state events, privacy access logs, reconciliation runs, incident records, privileged actions, and policy snapshots must be covered by hash-linked checkpoints or equivalent immutable storage.",
  },
  {
    key: "data_security_key_management",
    label: "Data security and key-management state",
    firstClassRecordTables: [
      "moral_trade_data_security_policies",
      "moral_trade_key_version_records",
    ],
    policySnapshotSubject: "data_security",
    blocks: [
      "real_money_capture",
      "payout_release",
      "privacy_disclosure",
      "release_gate_promotion",
      "non_emergency_privileged_change",
    ],
    description:
      "Sensitive private data, provider secrets, webhook secrets, payout credentials, private evidence, identity artifacts, source notes, and audit exports need data-class, encryption/tokenization, key-version, and private-access logging controls.",
  },
] as const;

const GATE_DEFINITIONS: MoralTradeProductionGateDefinition[] = [
  {
    key: "sandbox_calculation_preview",
    label: "Sandbox calculation preview",
    requiredControls: ["environment_data_isolation"],
    userFacingBlockerCategory: "Preview data separation needs review",
  },
  {
    key: "real_money_capture",
    label: "Real-money capture",
    requiredControls: [
      "account_security",
      "deployment_configuration",
      "schema_migration",
      "environment_data_isolation",
      "audit_integrity",
      "data_security_key_management",
    ],
    userFacingBlockerCategory: "Money movement is paused for operational review",
  },
  {
    key: "payout_release",
    label: "Payout release",
    requiredControls: [
      "account_security",
      "backup_recovery",
      "deployment_configuration",
      "financial_reconciliation",
      "audit_integrity",
      "data_security_key_management",
    ],
    userFacingBlockerCategory: "Payout release is paused for operational review",
  },
  {
    key: "round_close",
    label: "Round close",
    requiredControls: [
      "backup_recovery",
      "deployment_configuration",
      "schema_migration",
      "environment_data_isolation",
      "financial_reconciliation",
      "audit_integrity",
    ],
    userFacingBlockerCategory: "Round close needs operational verification",
  },
  {
    key: "public_money_metric_release",
    label: "Public money metric release",
    requiredControls: [
      "backup_recovery",
      "deployment_configuration",
      "environment_data_isolation",
      "financial_reconciliation",
      "audit_integrity",
    ],
    userFacingBlockerCategory: "Public money totals need verification",
  },
  {
    key: "privacy_disclosure",
    label: "Privacy-disclosing action",
    requiredControls: [
      "account_security",
      "deployment_configuration",
      "audit_integrity",
      "data_security_key_management",
    ],
    userFacingBlockerCategory: "Private disclosure needs account and data-security review",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiredControls: [
      "backup_recovery",
      "deployment_configuration",
      "schema_migration",
      "environment_data_isolation",
      "audit_integrity",
      "data_security_key_management",
    ],
    userFacingBlockerCategory: "Release promotion needs operational verification",
  },
  {
    key: "non_emergency_privileged_change",
    label: "Non-emergency privileged change",
    requiredControls: [
      "account_security",
      "backup_recovery",
      "deployment_configuration",
      "audit_integrity",
      "data_security_key_management",
    ],
    userFacingBlockerCategory: "Privileged change needs dual-control readiness",
  },
] as const;

function isFresh(checkedAt: Date, lastVerifiedAt: string) {
  const verifiedAt = new Date(lastVerifiedAt);

  if (Number.isNaN(verifiedAt.valueOf())) {
    return false;
  }

  const ageMs = checkedAt.valueOf() - verifiedAt.valueOf();
  return ageMs >= 0 && ageMs <= MAX_CONTROL_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeProductionReadinessCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}

function findGate(gate: MoralTradeProductionReadinessGate) {
  return GATE_DEFINITIONS.find((entry) => entry.key === gate);
}

function sampleHash(seed: string) {
  return `sha256:${seed.repeat(64).slice(0, 64)}`;
}

const sampleCheckedAt = "2026-06-07T12:00:00.000Z";

function readyRecord(
  controlKey: MoralTradeProductionControlKey,
): MoralTradeProductionControlRecord {
  const definition = CONTROL_DEFINITIONS.find((entry) => entry.key === controlKey);

  return {
    controlKey,
    status: "ready",
    policySnapshotStatus: "resolved_immutable",
    evidenceHash: sampleHash(controlKey.slice(0, 1)),
    recordTable: definition?.firstClassRecordTables[0] ?? "",
    lastVerifiedAt: sampleCheckedAt,
    subjectRef: `${controlKey}:sample`,
  };
}

export function evaluateMoralTradeProductionReadiness(
  input: MoralTradeProductionReadinessEvaluationInput,
): MoralTradeProductionReadinessEvaluation {
  const checkedAt = new Date(input.checkedAt ?? new Date().toISOString());
  const checkedAtIso = Number.isNaN(checkedAt.valueOf())
    ? new Date().toISOString()
    : checkedAt.toISOString();
  const gate = findGate(input.gate);
  const recordsByControl = new Map(input.records.map((record) => [record.controlKey, record]));

  if (!gate) {
    return {
      status: "blocked",
      gate: input.gate,
      requiredControlCount: 0,
      passingControlCount: 0,
      blockers: [`unknown_gate:${input.gate}`],
      userFacingBlockerCategories: ["Operational review required"],
      checkedAt: checkedAtIso,
    };
  }

  const blockers: string[] = [];
  const passingControls: MoralTradeProductionControlKey[] = [];

  for (const controlKey of gate.requiredControls) {
    const record = recordsByControl.get(controlKey);
    const definition = CONTROL_DEFINITIONS.find((entry) => entry.key === controlKey);

    if (!record) {
      blockers.push(`missing_control:${controlKey}`);
      continue;
    }

    if (!definition?.firstClassRecordTables.includes(record.recordTable)) {
      blockers.push(`wrong_record_table:${controlKey}`);
    }

    if (FAIL_CLOSED_STATUSES.includes(record.status)) {
      blockers.push(`control_not_ready:${controlKey}:${record.status}`);
    }

    if (
      record.status === "not_required_for_stage" &&
      record.policySnapshotStatus !== "resolved_immutable"
    ) {
      blockers.push(`not_required_policy_snapshot_unresolved:${controlKey}`);
    }

    if (record.status === "ready" && record.policySnapshotStatus !== "resolved_immutable") {
      blockers.push(`policy_snapshot_not_immutable:${controlKey}`);
    }

    if (!HASH_PATTERN.test(record.evidenceHash)) {
      blockers.push(`invalid_evidence_hash:${controlKey}`);
    }

    if (!isFresh(new Date(checkedAtIso), record.lastVerifiedAt)) {
      blockers.push(`stale_control_evidence:${controlKey}`);
    }

    if (
      !blockers.some(
        (blocker) => blocker.includes(`:${controlKey}`) || blocker.endsWith(`:${controlKey}`),
      )
    ) {
      passingControls.push(controlKey);
    }
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    gate: input.gate,
    requiredControlCount: gate.requiredControls.length,
    passingControlCount: passingControls.length,
    blockers: unique(blockers),
    userFacingBlockerCategories: blockers.length ? [gate.userFacingBlockerCategory] : [],
    checkedAt: checkedAtIso,
  };
}

export function getMoralTradeProductionReadinessContract(): MoralTradeProductionReadinessContract {
  const sandboxSample = evaluateMoralTradeProductionReadiness({
    gate: "sandbox_calculation_preview",
    checkedAt: sampleCheckedAt,
    records: [readyRecord("environment_data_isolation")],
  });
  const payoutSample = evaluateMoralTradeProductionReadiness({
    gate: "payout_release",
    checkedAt: sampleCheckedAt,
    records: [
      readyRecord("account_security"),
      {
        ...readyRecord("backup_recovery"),
        status: "restore_failed",
      },
      readyRecord("deployment_configuration"),
      {
        ...readyRecord("financial_reconciliation"),
        status: "variance_unresolved",
      },
      {
        ...readyRecord("audit_integrity"),
        evidenceHash: "sha256:broken",
      },
      readyRecord("data_security_key_management"),
    ],
  });

  return {
    version: MORAL_TRADE_PRODUCTION_READINESS_CONTRACT_VERSION,
    purpose:
      "Fail-closed production-control contract for account security, backup recovery, deployment/configuration provenance, schema migrations, environment isolation, financial reconciliation, audit integrity, and data-security readiness before real-money, payout, public-metric, privacy-disclosing, release-promotion, or privileged-change paths.",
    failClosedRule:
      "Missing, stale, failed, drifted, unverified, restore-failed, variance-unresolved, high-risk-account, mutable-policy, invalid-hash, or wrong-table operational records block the affected transition until superseded by reviewed immutable evidence.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    failClosedStatuses: FAIL_CLOSED_STATUSES,
    controlDefinitions: [...CONTROL_DEFINITIONS],
    gateDefinitions: [...GATE_DEFINITIONS],
    sampleEvaluations: [sandboxSample, payoutSample],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeProductionReadinessContract(
  contract: MoralTradeProductionReadinessContract = getMoralTradeProductionReadinessContract(),
): MoralTradeProductionReadinessValidation {
  const tableNames = contract.firstClassRecordTables;
  const controlKeys = contract.controlDefinitions.map((control) => control.key);
  const gateKeys = contract.gateDefinitions.map((gate) => gate.key);
  const policySubjects = contract.policySnapshotSubjects;
  const sampleStatuses = contract.sampleEvaluations.map((sample) => sample.status);
  const checks = [
    check(
      "first-class-record-tables",
      "Production controls publish first-class records",
      FIRST_CLASS_RECORD_TABLES.every((table) => tableNames.includes(table)),
      tableNames.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Production-control policies resolve to immutable policy snapshots",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) => policySubjects.includes(subject)),
      policySubjects.join(", "),
    ),
    check(
      "control-definitions",
      "Required production controls are defined",
      CONTROL_DEFINITIONS.every((control) => controlKeys.includes(control.key)) &&
        contract.controlDefinitions.every(
          (control) =>
            control.firstClassRecordTables.length > 0 &&
            control.firstClassRecordTables.every((table) => tableNames.includes(table)) &&
            policySubjects.includes(control.policySnapshotSubject),
        ),
      controlKeys.join(", "),
    ),
    check(
      "gate-definitions",
      "High-risk gates bind to required controls",
      GATE_DEFINITIONS.every((gate) => gateKeys.includes(gate.key)) &&
        contract.gateDefinitions.every(
          (gate) =>
            gate.requiredControls.length > 0 &&
            gate.requiredControls.every((control) => controlKeys.includes(control)),
        ),
      gateKeys.join(", "),
    ),
    check(
      "fail-closed-statuses",
      "Non-ready states fail closed",
      FAIL_CLOSED_STATUSES.every((status) => contract.failClosedStatuses.includes(status)),
      contract.failClosedStatuses.join(", "),
    ),
    check(
      "sample-evaluations",
      "Sample evaluations show preview pass and payout block",
      sampleStatuses.includes("pass") &&
        sampleStatuses.includes("blocked") &&
        contract.sampleEvaluations.some(
          (sample) =>
            sample.gate === "payout_release" &&
            sample.blockers.some((blocker) => /financial_reconciliation|audit_integrity|backup_recovery/.test(blocker)),
        ),
      sampleStatuses.join(", "),
    ),
    check(
      "contract-tests",
      "Contract test hooks cover fail-closed readiness",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-production-readiness-contract",
    validatorVersion: MORAL_TRADE_PRODUCTION_READINESS_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeProductionReadiness = {
  evaluateMoralTradeProductionReadiness,
  getMoralTradeProductionReadinessContract,
  validateMoralTradeProductionReadinessContract,
};

export default moralTradeProductionReadiness;
