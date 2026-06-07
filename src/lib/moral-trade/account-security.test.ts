import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateMoralTradeAccountSecurity,
  getMoralTradeAccountSecurityContract,
  validateMoralTradeAccountSecurityContract,
  type MoralTradeAccountSecurityEventRecord,
  type MoralTradeAccountSecurityPolicyRecord,
} from "@/lib/moral-trade/account-security";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function policy(
  overrides: Partial<MoralTradeAccountSecurityPolicyRecord> = {},
): MoralTradeAccountSecurityPolicyRecord {
  return {
    policyId: "policy-payment-capture",
    policyVersion: "moral-trade-account-security-v0.1-2026-06",
    appliesToAction: "payment_capture",
    stepUpRequired: true,
    trustedDeviceRequired: false,
    cooldownHours: 24,
    riskSignals: ["new_device", "session_anomaly", "payment_method_change"],
    highRiskBehavior: "cooldown",
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

function event(
  policyRecord: MoralTradeAccountSecurityPolicyRecord,
  overrides: Partial<MoralTradeAccountSecurityEventRecord> = {},
): MoralTradeAccountSecurityEventRecord {
  return {
    eventId: "event-payment-capture",
    participantIdHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    eventType: "new_device",
    policyRef: policyRecord.policyId,
    riskState: "low",
    actionSubjectType: "payment_event",
    actionSubjectId: "payment_event_123",
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

test("account-security contract validates first-class policy/event blockers", () => {
  const contract = getMoralTradeAccountSecurityContract();
  const validation = validateMoralTradeAccountSecurityContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_account_security_policies"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_account_security_events"));
  assert.ok(contract.policySnapshotSubjects.includes("account_security"));
  assert.ok(contract.highRiskActions.includes("participant_confirmation"));
  assert.ok(contract.highRiskActions.includes("payment_capture"));
  assert.ok(contract.highRiskActions.includes("privacy_grant"));
  assert.ok(contract.highRiskActions.includes("contact_introduction"));
  assert.ok(contract.eventTypes.includes("new_device"));
  assert.ok(contract.eventTypes.includes("session_anomaly"));
  assert.ok(contract.eventTypes.includes("step_up_failed"));
  assert.ok(contract.failClosedStatuses.includes("step_up_required"));
  assert.ok(contract.failClosedStatuses.includes("notice_missing"));
  assert.ok(contract.failClosedStatuses.includes("cooldown_active"));
  assert.ok(contract.failClosedStatuses.includes("manual_review_required"));
  assert.match(contract.failClosedRule, /browser session alone is not trusted/i);
});

test("missing, mutable, stale, or unreviewed policies fail closed", () => {
  const checkedAt = "2026-06-02T00:00:00.000Z";
  const missing = evaluateMoralTradeAccountSecurity({
    action: "payment_capture",
    checkedAt,
    policies: [],
    events: [],
  });
  const mutablePolicy = policy({
    policySnapshotStatus: "mutable",
    reviewerDecisionStatus: "missing",
  });
  const mutable = evaluateMoralTradeAccountSecurity({
    action: "payment_capture",
    checkedAt,
    policies: [mutablePolicy],
    events: [],
  });

  assert.equal(missing.status, "blocked");
  assert.ok(missing.blockers.includes("policy_missing:payment_capture"));
  assert.equal(mutable.status, "blocked");
  assert.ok(mutable.blockers.includes("policy_mutable:policy-payment-capture"));
  assert.ok(mutable.blockers.includes("manual_review_required:policy-payment-capture"));
});

test("high-risk account events require step-up, notice, cooldown, or manual review", () => {
  const policyRecord = policy();
  const blocked = evaluateMoralTradeAccountSecurity({
    action: "payment_capture",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policyRecord],
    events: [
      event(policyRecord, {
        riskState: "high",
        noticeStatus: "missing",
        stepUpStatus: "missing",
        cooldownUntil: "2026-06-03T00:00:00.000Z",
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("step_up_required:event-payment-capture"));
  assert.ok(blocked.blockers.includes("notice_missing:event-payment-capture"));
  assert.ok(blocked.blockers.includes("cooldown_active:event-payment-capture"));
  assert.match(blocked.userFacingBlockerCategories.join(" "), /Payment capture/);
});

test("remediated account-security events can pass under a frozen policy", () => {
  const policyRecord = policy({
    policyId: "policy-privacy-grant",
    appliesToAction: "privacy_grant",
    highRiskBehavior: "manual_review",
    trustedDeviceRequired: true,
  });
  const passed = evaluateMoralTradeAccountSecurity({
    action: "privacy_grant",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policyRecord],
    events: [
      event(policyRecord, {
        eventId: "event-privacy-grant",
        riskState: "high",
        actionSubjectType: "privacy_grant",
        noticeStatus: "delivered",
        stepUpStatus: "passed",
        trustedDeviceStatus: "passed",
        reviewerDecisionStatus: "approved",
      }),
    ],
  });

  assert.equal(passed.status, "pass");
  assert.deepEqual(passed.blockers, []);
  assert.equal(passed.remediatedHighRiskEventCount, 1);
});

test("account recovery blocks real-money actions when the frozen policy requires it", () => {
  const policyRecord = policy({
    accountRecoveryBehavior: "block_real_money",
  });
  const blocked = evaluateMoralTradeAccountSecurity({
    action: "payment_capture",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policyRecord],
    events: [
      event(policyRecord, {
        eventId: "event-account-recovery",
        eventType: "account_recovery",
        riskState: "high",
        noticeStatus: "delivered",
        stepUpStatus: "passed",
        cooldownUntil: "2026-06-01T00:00:00.000Z",
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("account_recovery_block:event-account-recovery"));
});

test("step-up failures block even when risk labels are low or stale", () => {
  const policyRecord = policy({
    highRiskBehavior: "step_up",
  });
  const blocked = evaluateMoralTradeAccountSecurity({
    action: "payment_capture",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policyRecord],
    events: [
      event(policyRecord, {
        eventId: "event-step-up-failed",
        eventType: "step_up_failed",
        riskState: "low",
        noticeStatus: "delivered",
        stepUpStatus: "failed",
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("step_up_failed:event-step-up-failed"));
});

test("account-security route, health, spec, API contract, and schema are wired", () => {
  const accountSecuritySource = readRepoFile("src/lib/moral-trade/account-security.ts");
  const accountSecurityRoute = readRepoFile(
    "src/app/api/moral-trade/account-security/contract/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260607_zzzzzz_moral_trade_account_security_policy_events.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(accountSecuritySource, /getMoralTradeAccountSecurityContract/);
  assert.match(accountSecuritySource, /evaluateMoralTradeAccountSecurity/);
  assert.match(accountSecuritySource, /browser session alone is not trusted/);
  assert.match(accountSecurityRoute, /public_contract_read/);
  assert.match(accountSecurityRoute, /accountSecuritySampleEvaluationStatuses/);
  assert.match(healthRoute, /accountSecurityValidation/);
  assert.match(healthRoute, /accountSecurityHighRiskActions/);
  assert.match(technicalSpec, /Account security contract/);
  assert.match(technicalSpec, /Open account-security JSON/);
  assert.match(apiContractSource, /moral_trade_account_security_contract/);
  assert.match(apiContractProfile, /account_security_contract_response/);
  assert.match(apiContractProfile, /moral_trade_account_security_contract/);
  assert.match(migration, /applies_to_action/);
  assert.match(migration, /participant_confirmation/);
  assert.match(migration, /step_up_passed/);
  assert.match(schema, /account_security_policy_ref/);
  assert.match(schema, /risk_state text not null/);
  assert.match(databaseTypes, /applies_to_action/);
  assert.match(databaseTypes, /participant_id_hash/);
});
