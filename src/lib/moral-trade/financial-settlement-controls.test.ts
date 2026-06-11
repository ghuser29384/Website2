import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateMoralTradeFinancialSettlementControls,
  getMoralTradeFinancialSettlementControlsContract,
  validateMoralTradeFinancialSettlementControlsContract,
  type MoralTradeFinancialSettlementControlKey,
  type MoralTradeFinancialSettlementControlRecord,
} from "./financial-settlement-controls";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
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

function settlementRecord(
  controlKey: MoralTradeFinancialSettlementControlKey,
  overrides: Partial<MoralTradeFinancialSettlementControlRecord> = {},
): MoralTradeFinancialSettlementControlRecord {
  const isPayoutControl = controlKey.startsWith("payout_");

  return {
    controlId: `financial-settlement:test:${controlKey}`,
    controlKey,
    subjectType: isPayoutControl ? "payout_milestone" : "matched_trade_lock_proposal",
    subjectRef: "settlement:test",
    status: "passed",
    policySnapshotStatus: "resolved_immutable",
    policySnapshotSubject: policySubjectFor(controlKey),
    controlHash: hashFor(`control:${controlKey}`),
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
  return controlKeys.map((controlKey) => settlementRecord(controlKey));
}

test("financial settlement controls contract validates first-class records", () => {
  const contract = getMoralTradeFinancialSettlementControlsContract();
  const validation = validateMoralTradeFinancialSettlementControlsContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_platform_fee_policies"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_fx_rate_snapshots"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_material_notice_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_time_authority_policies"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_challenge_window_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_payout_milestone_records"));
  assert.ok(contract.policySnapshotSubjects.includes("platform_fee"));
  assert.ok(contract.policySnapshotSubjects.includes("fx"));
  assert.ok(contract.policySnapshotSubjects.includes("notification"));
  assert.ok(contract.policySnapshotSubjects.includes("time_authority"));
  assert.ok(contract.policySnapshotSubjects.includes("challenge_window"));
  assert.ok(contract.policySnapshotSubjects.includes("payout_milestone"));
  assert.ok(contract.controlKeys.includes("platform_fee_disclosure"));
  assert.ok(contract.controlKeys.includes("fx_rate_snapshot"));
  assert.ok(contract.controlKeys.includes("payout_destination_binding"));
  assert.match(contract.privacyBoundary, /raw FX provider payloads/);
  assert.match(contract.privacyBoundary, /participant-specific fee\/FX\/payment records/);
});

test("draft preview passes without financial settlement records", () => {
  const result = evaluateMoralTradeFinancialSettlementControls({
    transition: "draft_preview",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [],
  });

  assert.equal(result.status, "pass");
  assert.equal(result.requiredControlCount, 0);
  assert.equal(result.passingControlCount, 0);
});

test("matched trade lock requires fee, FX, notice, time, and challenge records", () => {
  const result = evaluateMoralTradeFinancialSettlementControls({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [],
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("financial_settlement_control_required:platform_fee_policy"));
  assert.ok(result.blockers.includes("financial_settlement_control_required:fx_policy"));
  assert.ok(result.blockers.includes("financial_settlement_control_required:material_notice_record"));
  assert.ok(result.blockers.includes("financial_settlement_control_required:server_deadline_record"));
  assert.ok(result.blockers.includes("financial_settlement_control_required:challenge_window_record"));
});

test("complete reviewed settlement bundle passes matched trade lock", () => {
  const contract = getMoralTradeFinancialSettlementControlsContract();
  const lock = contract.transitionDefinitions.find(
    (transition) => transition.key === "matched_trade_lock",
  );
  assert.ok(lock);

  const result = evaluateMoralTradeFinancialSettlementControls({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: recordsFor(lock.requiredControls),
  });

  assert.equal(result.status, "pass");
  assert.equal(result.requiredControlCount, lock.requiredControls.length);
  assert.equal(result.passingControlCount, lock.requiredControls.length);
});

test("payment capture blocks hidden fees, expired FX, missing notice, client clock, and metric inclusion", () => {
  const contract = getMoralTradeFinancialSettlementControlsContract();
  const capture = contract.transitionDefinitions.find(
    (transition) => transition.key === "payment_capture",
  );
  assert.ok(capture);

  const result = evaluateMoralTradeFinancialSettlementControls({
    transition: "payment_capture",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [
      ...recordsFor(
        capture.requiredControls.filter(
          (controlKey) =>
            controlKey !== "platform_fee_disclosure" &&
            controlKey !== "fx_rate_snapshot" &&
            controlKey !== "material_notice_record" &&
            controlKey !== "server_deadline_record",
        ),
      ),
      settlementRecord("platform_fee_disclosure", {
        feeDisclosureStatus: "bundled_into_moral_volume",
        metricExclusionStatus: "included_in_threshold_progress",
      }),
      settlementRecord("fx_rate_snapshot", {
        fxSnapshotStatus: "expired",
        feeDisclosureStatus: "bundled_into_moral_volume",
      }),
      settlementRecord("material_notice_record", {
        noticeDeliveryStatus: "failed",
      }),
      settlementRecord("server_deadline_record", {
        timeAuthorityStatus: "client_clock_used",
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "platform_fee_disclosure_not_separate:platform_fee_disclosure:bundled_into_moral_volume",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "platform_fee_metric_exclusion_not_enforced:platform_fee_disclosure:included_in_threshold_progress",
    ),
  );
  assert.ok(result.blockers.includes("fx_snapshot_not_current:fx_rate_snapshot:expired"));
  assert.ok(
    result.blockers.includes(
      "fx_fee_disclosure_not_separate:fx_rate_snapshot:bundled_into_moral_volume",
    ),
  );
  assert.ok(
    result.blockers.includes("material_notice_not_delivered:material_notice_record:failed"),
  );
  assert.ok(
    result.blockers.includes(
      "server_time_authority_not_resolved:server_deadline_record:client_clock_used",
    ),
  );
});

test("payout milestone release blocks missing evidence, unverified destination, and open challenge windows", () => {
  const contract = getMoralTradeFinancialSettlementControlsContract();
  const payout = contract.transitionDefinitions.find(
    (transition) => transition.key === "payout_milestone_release",
  );
  assert.ok(payout);

  const result = evaluateMoralTradeFinancialSettlementControls({
    transition: "payout_milestone_release",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [
      ...recordsFor(
        payout.requiredControls.filter(
          (controlKey) => controlKey !== "payout_milestone_record",
        ),
      ),
      settlementRecord("payout_milestone_record", {
        payoutMilestoneStatus: "challenge_open",
        evidenceStatus: "missing",
        destinationStatus: "unverified",
        challengeWindowStatus: "open_or_not_required",
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "payout_milestone_not_releasable:payout_milestone_record:challenge_open",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "payout_milestone_evidence_not_passed:payout_milestone_record:missing",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "payout_destination_not_bound:payout_milestone_record:unverified",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "payout_challenge_window_not_closed_or_waived:payout_milestone_record:open_or_not_required",
    ),
  );
});

test("financial settlement controls are wired through API, health, spec, migration, schema, and types", () => {
  const source = readRepoFile("src/lib/moral-trade/financial-settlement-controls.ts");
  const testSource = readRepoFile("src/lib/moral-trade/financial-settlement-controls.test.ts");
  const route = readRepoFile(
    "src/app/api/moral-trade/financial-settlement-controls/contract/route.ts",
  );
  const health = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContract = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260608_moral_trade_financial_settlement_controls.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const evidence = readRepoFile("docs/moral-trade/moraltrade60-pr-evidence.md");

  assert.match(source, /getMoralTradeFinancialSettlementControlsContract/);
  assert.match(source, /evaluateMoralTradeFinancialSettlementControls/);
  assert.match(testSource, /payment capture blocks hidden fees/);
  assert.match(route, /validateMoralTradeFinancialSettlementControlsContract/);
  assert.match(route, /sampleEvaluationStatuses/);
  assert.match(route, /privacyBoundary/);
  assert.match(health, /financialSettlementControlsValidation/);
  assert.match(health, /financialSettlementControlsFirstClassRecordTables/);
  assert.match(technicalSpec, /financialSettlementControlsContract\.controlKeys/);
  assert.match(technicalSpec, /financial-settlement-controls\/contract/);
  assert.match(apiContract, /moral_trade_financial_settlement_controls_contract/);
  assert.match(apiProfile, /moral-trade-api-contract-v0\.56-2026-06/);
  assert.match(apiProfile, /financial_settlement_controls_contract_response/);
  assert.match(apiProfile, /raw FX provider payloads/);

  for (const table of [
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
  ]) {
    assert.match(migration, new RegExp(table));
    assert.match(schema, new RegExp(table));
    assert.match(databaseTypes, new RegExp(table));
  }

  for (const subject of [
    "platform_fee",
    "fx",
    "notification",
    "time_authority",
    "challenge_window",
    "payout_milestone",
  ]) {
    assert.match(migration, new RegExp(subject));
    assert.match(schema, new RegExp(subject));
  }

  assert.match(evidence, /financial settlement controls/i);
});
