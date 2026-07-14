import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceReviewerQuality } from "@/app/api/moral-trade/reviewer-quality/enforce/route";
import {
  evaluateMoralTradeReviewerQuality,
  getMoralTradeReviewerQualityContract,
  validateMoralTradeReviewerQualityContract,
  type MoralTradeReviewerQualityDecisionRecord,
  type MoralTradeReviewerQualityPolicyRecord,
  type MoralTradeReviewQualityAuditRecord,
} from "@/lib/moral-trade/reviewer-quality";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function policy(
  overrides: Partial<MoralTradeReviewerQualityPolicyRecord> = {},
): MoralTradeReviewerQualityPolicyRecord {
  return {
    policyId: "policy-evidence-acceptance",
    policyVersion: "moral-trade-reviewer-quality-v0.1-2026-06",
    reviewType: "evidence_acceptance",
    authorizationRequired: true,
    conflictCheckRequired: true,
    calibrationRequired: true,
    secondReviewRequired: true,
    auditSamplingRequired: true,
    defaultApprovalProhibited: true,
    reviewSpeedTargetCreatesDefaultApproval: false,
    maxDecisionAgeDays: 180,
    policySnapshotStatus: "resolved_immutable",
    policyHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function decision(
  policyRecord: MoralTradeReviewerQualityPolicyRecord,
  overrides: Partial<MoralTradeReviewerQualityDecisionRecord> = {},
): MoralTradeReviewerQualityDecisionRecord {
  return {
    decisionId: "decision-evidence-acceptance",
    reviewType: policyRecord.reviewType,
    subjectType: "evidence_record",
    subjectId: "evidence_123",
    reviewerIdHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    reviewerRole: "neutral_reviewer",
    reviewerAuthorizationStatus: "authorized",
    conflictStatus: "none_declared",
    calibrationStatus: "passed",
    secondReviewStatus: "passed",
    auditStatus: "passed",
    decisionState: "approved",
    policyRef: policyRecord.policyId,
    neutralPanelRef: "panel_123",
    reviewQualityAuditRefs: ["audit_123"],
    defaultApprovalDetected: false,
    reviewSpeedOverrideDetected: false,
    decisionHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    decidedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function audit(
  policyRecord: MoralTradeReviewerQualityPolicyRecord,
  overrides: Partial<MoralTradeReviewQualityAuditRecord> = {},
): MoralTradeReviewQualityAuditRecord {
  return {
    auditId: "audit-evidence-acceptance",
    reviewerIdHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    reviewType: policyRecord.reviewType,
    policyRef: policyRecord.policyId,
    auditStatus: "passed",
    sampledDecisionCount: 3,
    overturnCount: 0,
    calibrationFailureCount: 0,
    unresolvedConflictCount: 0,
    outOfScopeDecisionCount: 0,
    defaultApprovalDetected: false,
    auditHash:
      "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    auditedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

test("reviewer-quality contract validates first-class policy, audit, and decision coverage", () => {
  const contract = getMoralTradeReviewerQualityContract();
  const validation = validateMoralTradeReviewerQualityContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_reviewer_quality_policies"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_review_quality_audits"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_review_decisions"));
  assert.ok(contract.policySnapshotSubjects.includes("reviewer_quality"));
  assert.ok(contract.reviewTypes.includes("matching_clearing"));
  assert.ok(contract.reviewTypes.includes("release_gate_approval"));
  assert.ok(contract.reviewTypes.includes("recipient_destination_verification"));
  assert.ok(contract.reviewTypes.includes("privacy_grant_approval"));
  assert.ok(contract.reviewTypes.includes("evidence_acceptance"));
  assert.ok(contract.reviewTypes.includes("impact_claim_publication"));
  assert.ok(contract.reviewTypes.includes("appeal_resolution"));
  assert.ok(contract.reviewTypes.includes("incident_closure"));
  assert.ok(contract.reviewTypes.includes("payout_release"));
  assert.ok(contract.failClosedStatuses.includes("reviewer_out_of_scope"));
  assert.ok(contract.failClosedStatuses.includes("conflict_unresolved"));
  assert.ok(contract.failClosedStatuses.includes("second_review_missing"));
  assert.match(contract.failClosedRule, /Reviewer judgment is not an ungoverned primitive/i);
});

test("missing policy, missing decision, and missing audit fail closed", () => {
  const missing = evaluateMoralTradeReviewerQuality({
    reviewType: "evidence_acceptance",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [],
    decisions: [],
    audits: [],
  });
  const policyRecord = policy();
  const noDecision = evaluateMoralTradeReviewerQuality({
    reviewType: "evidence_acceptance",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policyRecord],
    decisions: [],
    audits: [],
  });

  assert.equal(missing.status, "blocked");
  assert.ok(missing.blockers.includes("policy_missing:evidence_acceptance"));
  assert.ok(missing.blockers.includes("decision_missing:evidence_acceptance"));
  assert.equal(noDecision.status, "blocked");
  assert.ok(noDecision.blockers.includes("decision_missing:evidence_acceptance"));
  assert.ok(noDecision.blockers.includes("audit_missing:evidence_acceptance"));
});

test("conflicts, scope failures, missing calibration, and missing second review block decisions", () => {
  const policyRecord = policy();
  const blocked = evaluateMoralTradeReviewerQuality({
    reviewType: "evidence_acceptance",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policyRecord],
    decisions: [
      decision(policyRecord, {
        reviewerAuthorizationStatus: "out_of_scope",
        conflictStatus: "unresolved",
        calibrationStatus: "failed",
        secondReviewStatus: "missing",
      }),
    ],
    audits: [audit(policyRecord)],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("reviewer_out_of_scope:decision-evidence-acceptance"));
  assert.ok(blocked.blockers.includes("conflict_unresolved:decision-evidence-acceptance"));
  assert.ok(blocked.blockers.includes("calibration_failed:decision-evidence-acceptance"));
  assert.ok(blocked.blockers.includes("second_review_missing:decision-evidence-acceptance"));
});

test("default approvals, speed overrides, stale decisions, and failed audits block", () => {
  const policyRecord = policy({
    reviewType: "payout_release",
    policyId: "policy-payout-release",
  });
  const blocked = evaluateMoralTradeReviewerQuality({
    reviewType: "payout_release",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policyRecord],
    decisions: [
      decision(policyRecord, {
        decisionId: "decision-payout-release",
        defaultApprovalDetected: true,
        reviewSpeedOverrideDetected: true,
        expiresAt: "2026-06-01T00:00:00.000Z",
      }),
    ],
    audits: [
      audit(policyRecord, {
        auditId: "audit-payout-release",
        auditStatus: "failed",
        overturnCount: 1,
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("default_approval_detected:decision-payout-release"));
  assert.ok(blocked.blockers.includes("review_speed_override_detected:decision-payout-release"));
  assert.ok(blocked.blockers.includes("decision_stale:decision-payout-release"));
  assert.ok(blocked.blockers.includes("audit_failed:audit-payout-release"));
});

test("reviewer-quality passes with frozen policy, authorized reviewer, nonblocking conflict, second review, and current audit", () => {
  const policyRecord = policy();
  const passed = evaluateMoralTradeReviewerQuality({
    reviewType: "evidence_acceptance",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policyRecord],
    decisions: [
      decision(policyRecord, {
        conflictStatus: "disclosed_nonblocking",
      }),
    ],
    audits: [audit(policyRecord)],
  });

  assert.equal(passed.status, "pass");
  assert.deepEqual(passed.blockers, []);
});

test("reviewer-quality enforcement rejects invalid JSON without state mutation", async () => {
  const response = await enforceReviewerQuality(
    new Request("http://localhost/api/moral-trade/reviewer-quality/enforce", {
      method: "POST",
      body: "{",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.stateMutation, false);
  assert.equal(body.matchingClearingAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.recipientDestinationVerificationAllowed, false);
  assert.equal(body.privacyDisclosureAllowed, false);
  assert.equal(body.evidenceAcceptanceAllowed, false);
  assert.equal(body.impactClaimPublicationAllowed, false);
  assert.equal(body.appealResolutionAllowed, false);
  assert.equal(body.incidentClosureAllowed, false);
  assert.equal(body.payoutReleaseAllowed, false);
  assert.equal(body.blockerOverrideAllowed, false);
  assert.equal(body.publicMetricReleaseAllowed, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
  assert.deepEqual(body.persistence, {
    requested: true,
    status: "not_recorded",
    recordId: null,
    table: "moral_trade_reviewer_quality_enforcement_records",
  });
  assert.equal(body.contractValidation.status, "pass");
});

test("reviewer-quality route, health, spec, API contract, and schema are wired", () => {
  const reviewerQualitySource = readRepoFile("src/lib/moral-trade/reviewer-quality.ts");
  const reviewerQualityRoute = readRepoFile(
    "src/app/api/moral-trade/reviewer-quality/contract/route.ts",
  );
  const enforceRoute = readRepoFile(
    "src/app/api/moral-trade/reviewer-quality/enforce/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const apiRateLimit = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operations = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzz_moral_trade_reviewer_quality_records.sql",
  );
  const enforcementMigration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_reviewer_quality_enforcement_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(reviewerQualitySource, /getMoralTradeReviewerQualityContract/);
  assert.match(reviewerQualitySource, /evaluateMoralTradeReviewerQuality/);
  assert.match(reviewerQualitySource, /Reviewer judgment is not an ungoverned primitive/);
  assert.match(reviewerQualityRoute, /public_contract_read/);
  assert.match(reviewerQualityRoute, /reviewerQualitySampleEvaluationStatuses/);
  assert.match(enforceRoute, /reviewer_quality_enforce/);
  assert.match(enforceRoute, /moral_trade_reviewer_quality_enforcement_records/);
  assert.match(enforceRoute, /matchingClearingAllowed: false/);
  assert.match(enforceRoute, /releaseGatePromotionAllowed: false/);
  assert.match(enforceRoute, /evidenceAcceptanceAllowed: false/);
  assert.match(enforceRoute, /payoutReleaseAllowed: false/);
  assert.match(enforceRoute, /blockerOverrideAllowed: false/);
  assert.match(enforceRoute, /supabase_unconfigured:reviewer_quality_enforce/);
  assert.match(enforceRoute, /authentication_required:reviewer_quality_enforce/);
  assert.match(healthRoute, /reviewerQualityValidation/);
  assert.match(healthRoute, /reviewerQualityReviewTypes/);
  assert.match(technicalSpec, /Reviewer quality contract/);
  assert.match(technicalSpec, /Open reviewer-quality JSON/);
  assert.match(apiContractSource, /moral_trade_reviewer_quality_contract/);
  assert.match(apiContractSource, /moral_trade_reviewer_quality_enforce/);
  assert.match(apiContractProfile, /reviewer_quality_contract_response/);
  assert.match(apiContractProfile, /reviewer_quality_enforce_request/);
  assert.match(apiContractProfile, /reviewer_quality_enforce_response/);
  assert.match(apiContractProfile, /moral_trade_reviewer_quality_contract/);
  assert.match(apiContractProfile, /moral_trade_reviewer_quality_enforce/);
  assert.match(apiContractProfile, /reviewer_quality_enforce_route_contract/);
  assert.match(apiRateLimit, /reviewer_quality_enforce/);
  assert.match(operations, /reviewer_quality_enforce/);
  assert.match(operationsProfile, /reviewer_quality_enforce/);
  assert.match(migration, /moral_trade_reviewer_quality_policies/);
  assert.match(migration, /moral_trade_review_quality_audits/);
  assert.match(migration, /reviewer_quality_policy_ref/);
  assert.match(enforcementMigration, /moral_trade_reviewer_quality_enforcement_records/);
  assert.match(enforcementMigration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(enforcementMigration, /matching_clearing_allowed_bool = false/);
  assert.match(enforcementMigration, /release_gate_promotion_allowed_bool = false/);
  assert.match(enforcementMigration, /evidence_acceptance_allowed_bool = false/);
  assert.match(enforcementMigration, /payout_release_allowed_bool = false/);
  assert.match(enforcementMigration, /blocker_override_allowed_bool = false/);
  assert.match(schema, /moral_trade_reviewer_quality_enforcement_records/);
  assert.match(schema, /reviewer_quality_policy_ref/);
  assert.match(schema, /conflict_of_interest_state/);
  assert.match(databaseTypes, /moral_trade_reviewer_quality_enforcement_records/);
  assert.match(databaseTypes, /moral_trade_reviewer_quality_policies/);
  assert.match(databaseTypes, /moral_trade_review_quality_audits/);
});
