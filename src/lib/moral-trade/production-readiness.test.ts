import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateMoralTradeProductionReadiness,
  getMoralTradeProductionReadinessContract,
  validateMoralTradeProductionReadinessContract,
  type MoralTradeProductionControlKey,
  type MoralTradeProductionControlRecord,
  type MoralTradeProductionControlStatus,
  type MoralTradeProductionPolicySnapshotStatus,
} from "./production-readiness";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function record(
  controlKey: MoralTradeProductionControlKey,
  overrides: Partial<MoralTradeProductionControlRecord> = {},
): MoralTradeProductionControlRecord {
  const contract = getMoralTradeProductionReadinessContract();
  const definition = contract.controlDefinitions.find((entry) => entry.key === controlKey);

  assert.ok(definition, `missing definition for ${controlKey}`);

  return {
    controlKey,
    status: "ready",
    policySnapshotStatus: "resolved_immutable",
    evidenceHash: hashFor(controlKey),
    recordTable: definition.firstClassRecordTables[0],
    lastVerifiedAt: "2026-06-07T12:00:00.000Z",
    subjectRef: `${controlKey}:unit-test`,
    ...overrides,
  };
}

function recordsFor(controls: MoralTradeProductionControlKey[]) {
  return controls.map((control) => record(control));
}

test("production-readiness contract validates first-class operational control coverage", () => {
  const contract = getMoralTradeProductionReadinessContract();
  const validation = validateMoralTradeProductionReadinessContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_account_security_events"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_backup_recovery_checkpoints"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_deployment_release_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_configuration_snapshots"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_schema_migration_runs"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_environment_data_isolation_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_financial_reconciliation_runs"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_audit_integrity_checkpoints"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_data_security_policies"));
  assert.ok(contract.policySnapshotSubjects.includes("account_security"));
  assert.ok(contract.policySnapshotSubjects.includes("backup_recovery"));
  assert.ok(contract.policySnapshotSubjects.includes("deployment_release"));
  assert.ok(contract.policySnapshotSubjects.includes("configuration_snapshot"));
  assert.ok(contract.policySnapshotSubjects.includes("schema_migration"));
  assert.ok(contract.policySnapshotSubjects.includes("environment_data_isolation"));
  assert.ok(contract.policySnapshotSubjects.includes("financial_reconciliation"));
  assert.ok(contract.policySnapshotSubjects.includes("audit_integrity"));
  assert.ok(contract.policySnapshotSubjects.includes("data_security"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.gate === "sandbox_calculation_preview" && sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.gate === "payout_release" && sample.status === "blocked"));
});

test("real-money capture blocks on missing, stale, drifted, or unresolved operational controls", () => {
  const pass = evaluateMoralTradeProductionReadiness({
    gate: "real_money_capture",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: recordsFor([
      "account_security",
      "deployment_configuration",
      "schema_migration",
      "environment_data_isolation",
      "audit_integrity",
      "data_security_key_management",
    ]),
  });

  assert.equal(pass.status, "pass");
  assert.deepEqual(pass.blockers, []);

  const blocked = evaluateMoralTradeProductionReadiness({
    gate: "real_money_capture",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [
      record("account_security", { status: "high_risk_event_open" }),
      record("deployment_configuration", { status: "drift_detected" }),
      record("schema_migration", { status: "under_review" }),
      record("environment_data_isolation", { lastVerifiedAt: "2026-04-01T12:00:00.000Z" }),
      record("audit_integrity", { evidenceHash: "sha256:broken" }),
      record("data_security_key_management", { policySnapshotStatus: "mutable" }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("control_not_ready:account_security:high_risk_event_open"));
  assert.ok(blocked.blockers.includes("control_not_ready:deployment_configuration:drift_detected"));
  assert.ok(blocked.blockers.includes("control_not_ready:schema_migration:under_review"));
  assert.ok(blocked.blockers.includes("stale_control_evidence:environment_data_isolation"));
  assert.ok(blocked.blockers.includes("invalid_evidence_hash:audit_integrity"));
  assert.ok(blocked.blockers.includes("policy_snapshot_not_immutable:data_security_key_management"));
});

test("payout release blocks on restore failure, reconciliation variance, and broken audit checkpoint", () => {
  const evaluation = evaluateMoralTradeProductionReadiness({
    gate: "payout_release",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [
      record("account_security"),
      record("backup_recovery", { status: "restore_failed" }),
      record("deployment_configuration"),
      record("financial_reconciliation", { status: "variance_unresolved" }),
      record("audit_integrity", { status: "unverified" }),
      record("data_security_key_management"),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("control_not_ready:backup_recovery:restore_failed"));
  assert.ok(evaluation.blockers.includes("control_not_ready:financial_reconciliation:variance_unresolved"));
  assert.ok(evaluation.blockers.includes("control_not_ready:audit_integrity:unverified"));
  assert.deepEqual(evaluation.userFacingBlockerCategories, [
    "Payout release is paused for operational review",
  ]);
});

test("not-required operational controls need immutable policy snapshots", () => {
  const evaluate = (policySnapshotStatus: MoralTradeProductionPolicySnapshotStatus) =>
    evaluateMoralTradeProductionReadiness({
      gate: "sandbox_calculation_preview",
      checkedAt: "2026-06-07T12:00:00.000Z",
      records: [
        record("environment_data_isolation", {
          status: "not_required_for_stage",
          policySnapshotStatus,
        }),
      ],
    });

  assert.equal(evaluate("resolved_immutable").status, "pass");

  const blocked = evaluate("mutable");
  assert.equal(blocked.status, "blocked");
  assert.ok(
    blocked.blockers.includes("not_required_policy_snapshot_unresolved:environment_data_isolation"),
  );
});

test("production-readiness route, health, technical spec, API contract, and migration are wired", () => {
  const source = readRepoFile("src/lib/moral-trade/production-readiness.ts");
  const route = readRepoFile("src/app/api/moral-trade/production-readiness/contract/route.ts");
  const health = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const spec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContract = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260607_zzz_moral_trade_production_readiness_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");

  assert.match(source, /moral_trade_backup_recovery_checkpoints/);
  assert.match(source, /moral_trade_financial_reconciliation_runs/);
  assert.match(source, /moral_trade_audit_integrity_checkpoints/);
  assert.match(route, /getMoralTradeProductionReadinessContract/);
  assert.match(route, /productionReadinessSampleEvaluationStatuses/);
  assert.match(health, /productionReadinessValidation/);
  assert.match(health, /productionReadinessFirstClassRecordTables/);
  assert.match(spec, /Production readiness contract/);
  assert.match(spec, /production-readiness\/contract/);
  assert.match(apiContract, /moral_trade_production_readiness_contract/);
  assert.match(apiContract, /production_readiness_contract_response/);
  assert.match(migration, /moral_trade_account_security_events/);
  assert.match(migration, /moral_trade_backup_recovery_checkpoints/);
  assert.match(migration, /moral_trade_financial_reconciliation_runs/);
  assert.match(migration, /moral_trade_audit_integrity_checkpoints/);
  assert.match(migration, /moral_trade_configuration_snapshots/);
  assert.match(schema, /moral_trade_account_security_events/);
  assert.match(schema, /moral_trade_backup_recovery_checkpoints/);
  assert.match(schema, /moral_trade_financial_reconciliation_runs/);
  assert.match(schema, /moral_trade_audit_integrity_checkpoints/);
});
