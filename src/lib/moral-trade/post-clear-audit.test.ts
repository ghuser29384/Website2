import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforcePostClearAudit } from "@/app/api/moral-trade/post-clear-audit/enforce/route";

import {
  evaluateMoralTradePostClearAudit,
  getMoralTradePostClearAuditContract,
  validateMoralTradePostClearAuditContract,
  type MoralTradePostClearAuditPolicyRecord,
  type MoralTradePostClearAuditRecord,
} from "./post-clear-audit";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function policyRecord(
  overrides: Partial<MoralTradePostClearAuditPolicyRecord> = {},
): MoralTradePostClearAuditPolicyRecord {
  return {
    policyId: "post-clear-audit-policy:tier-1",
    releaseStage: "tier_1_non_public_goods_completion",
    policyStatus: "resolved_immutable",
    policyHash: hashFor("post-clear-audit-policy"),
    sampledSubjectTypes: [
      "cleared_trade_agreement",
      "matched_trade_lock_proposal",
      "payment_event",
      "evidence_record",
      "payout_milestone",
      "impact_claim_record",
    ],
    auditTypes: [
      "random_sample",
      "risk_triggered",
      "dispute_triggered",
      "payment_triggered",
      "evidence_triggered",
      "recipient_triggered",
      "classification_triggered",
      "manual_review",
    ],
    maxPolicyAgeDays: 120,
    requiresTermSheetMatch: true,
    requiresBaselineEvidenceMatch: true,
    requiresRecipientAcceptanceMatch: true,
    requiresPaymentReconciliationMatch: true,
    requiresPrivacyDisclosureMatch: true,
    requiresClassificationMatch: true,
    prohibitsPublicReputationEffect: true,
    permitsCorrectionOnlyUnderFrozenPolicy: true,
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-10-11T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function auditRecord(
  overrides: Partial<MoralTradePostClearAuditRecord> = {},
): MoralTradePostClearAuditRecord {
  return {
    recordId: "post-clear-audit:cleared-trade-demo",
    subjectType: "cleared_trade_agreement",
    subjectRef: "cleared-trade:demo",
    policyRef: "post-clear-audit-policy:tier-1",
    auditType: "random_sample",
    sampledFieldsHash: hashFor("sampled-fields"),
    termSheetMatchState: "matched",
    baselineAndEvidenceMatchState: "matched",
    recipientAcceptanceMatchState: "matched",
    paymentAndReconciliationMatchState: "matched",
    privacyOrDisclosureMatchState: "matched",
    classificationMatchState: "matched",
    correctiveActionRefs: [],
    publicReputationEffectProhibited: true,
    auditState: "passed",
    reviewerDecisionRef: "review-decision:post-clear-demo",
    createdAt: "2026-06-11T12:00:00.000Z",
    updatedAt: "2026-06-11T12:00:00.000Z",
    rawPaymentEvidencePublic: false,
    privateCounterpartyTermsPublic: false,
    reviewerNotesPublic: false,
    rawReconciliationRowsPublic: false,
    providerPayloadPublic: false,
    participantSpecificRowsPublic: false,
    ...overrides,
  };
}

test("post-clear audit contract validates first-class records and correction boundaries", () => {
  const contract = getMoralTradePostClearAuditContract();
  const validation = validateMoralTradePostClearAuditContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_post_clear_audit_policies",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_post_clear_audit_records",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("post_clear_audit"));
  assert.ok(contract.subjectTypes.includes("cleared_trade_agreement"));
  assert.ok(contract.subjectTypes.includes("payment_event"));
  assert.ok(contract.auditTypes.includes("random_sample"));
  assert.ok(contract.auditTypes.includes("classification_triggered"));
  assert.ok(contract.auditStates.includes("corrective_action_open"));
  assert.ok(
    contract.correctionBoundaries.includes(
      "no_public_moral_reputation_or_retroactive_obligation",
    ),
  );
  assert.match(contract.failClosedRule, /new obligations beyond the locked term sheet/i);
  assert.match(contract.privacyBoundary, /raw payment evidence/i);
});

test("sampling can be absent when not required, but public metrics require policy and record", () => {
  const inactive = evaluateMoralTradePostClearAudit({
    transition: "post_clear_sampling_assignment",
    postClearAuditRequired: false,
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [],
    records: [],
  });

  assert.equal(inactive.status, "pass");
  assert.equal(inactive.requiredRecordCount, 0);

  const publication = evaluateMoralTradePostClearAudit({
    transition: "public_metric_publication",
    postClearAuditRequired: true,
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [],
    records: [],
  });

  assert.equal(publication.status, "blocked");
  assert.ok(publication.blockers.includes("post_clear_audit_policy_required"));
  assert.ok(publication.blockers.includes("post_clear_audit_record_required"));
  assert.ok(
    publication.blockers.includes("post_clear_audit_non_blocking_record_required"),
  );
});

test("passing post-clear audit can unblock public metrics, payout, and release promotion", () => {
  for (const transition of [
    "public_metric_publication",
    "payout_release",
    "release_gate_promotion",
  ] as const) {
    const result = evaluateMoralTradePostClearAudit({
      transition,
      postClearAuditRequired: true,
      checkedAt: "2026-06-11T12:00:00.000Z",
      policies: [policyRecord()],
      records: [auditRecord()],
    });

    assert.equal(result.status, "pass");
    assert.equal(result.immutablePolicyCount, 1);
    assert.equal(result.nonBlockingAuditRecordCount, 1);
    assert.equal(result.reviewerDecisionCount, 1);
  }
});

test("failed, superseded, or unresolved audit blocks public metric publication", () => {
  const result = evaluateMoralTradePostClearAudit({
    transition: "public_metric_publication",
    postClearAuditRequired: true,
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    records: [
      auditRecord({
        auditState: "corrective_action_open",
        paymentAndReconciliationMatchState: "manual_review",
        reviewerDecisionRef: null,
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "post_clear_audit_not_non_blocking:post-clear-audit:cleared-trade-demo:corrective_action_open",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "post_clear_audit_payment_and_reconciliation_not_matched:post-clear-audit:cleared-trade-demo:manual_review",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "post_clear_audit_corrective_action_open:post-clear-audit:cleared-trade-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "post_clear_audit_reviewer_decision_missing:post-clear-audit:cleared-trade-demo",
    ),
  );
});

test("post-clear audit policy drift and public reputation effects fail closed", () => {
  const result = evaluateMoralTradePostClearAudit({
    transition: "release_gate_promotion",
    postClearAuditRequired: true,
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [
      policyRecord({
        policyStatus: "mutable",
        policyHash: "not-a-hash",
        prohibitsPublicReputationEffect: false,
        permitsCorrectionOnlyUnderFrozenPolicy: false,
      }),
    ],
    records: [
      auditRecord({
        publicReputationEffectProhibited: false,
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "post_clear_audit_policy_not_immutable:post-clear-audit-policy:tier-1:mutable",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "post_clear_audit_public_reputation_not_prohibited:post-clear-audit-policy:tier-1",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "post_clear_audit_public_reputation_effect_not_prohibited:post-clear-audit:cleared-trade-demo",
    ),
  );
});

test("post-clear audit privacy fields fail closed", () => {
  const result = evaluateMoralTradePostClearAudit({
    transition: "public_metric_publication",
    postClearAuditRequired: true,
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    records: [
      auditRecord({
        rawPaymentEvidencePublic: true,
        privateCounterpartyTermsPublic: true,
        reviewerNotesPublic: true,
        rawReconciliationRowsPublic: true,
        providerPayloadPublic: true,
        participantSpecificRowsPublic: true,
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "post_clear_audit_raw_payment_evidence_public:post-clear-audit:cleared-trade-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "post_clear_audit_private_counterparty_terms_public:post-clear-audit:cleared-trade-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "post_clear_audit_provider_payload_public:post-clear-audit:cleared-trade-demo",
    ),
  );
});

test("post-clear audit enforce route is fail-closed before persistence on invalid input", async () => {
  const response = await enforcePostClearAudit(
    new Request("http://localhost/api/moral-trade/post-clear-audit/enforce", {
      body: "not-json",
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.postClearAuditGateStatus, "blocked");
  assert.equal(body.postClearSamplingAssignmentAllowed, false);
  assert.equal(body.auditRecordReviewAllowed, false);
  assert.equal(body.correctiveActionResolutionAllowed, false);
  assert.equal(body.paymentReconciliationCloseAllowed, false);
  assert.equal(body.payoutReleaseAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.equal(body.persistence.status, "not_recorded");
  assert.equal(
    body.persistence.table,
    "moral_trade_post_clear_audit_enforcement_records",
  );
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("post-clear audit contract is wired through route, health, spec, API profile, and migrations", () => {
  const route = readRepoFile(
    "src/app/api/moral-trade/post-clear-audit/contract/route.ts",
  );
  const enforceRoute = readRepoFile(
    "src/app/api/moral-trade/post-clear-audit/enforce/route.ts",
  );
  const health = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const spec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContract = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiRateLimit = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operations = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile(
    "config/moral-trade/operations-profile.json",
  );
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const clearingPreview = readRepoFile("src/lib/moral-trade/clearing-previews.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260611_moral_trade_post_clear_audit_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const forbiddenAllowColumns = [
    "post_clear_sampling_assignment_allowed_bool",
    "audit_record_review_allowed_bool",
    "corrective_action_resolution_allowed_bool",
    "payment_reconciliation_close_allowed_bool",
    "payout_release_allowed_bool",
    "public_metric_publication_allowed_bool",
    "release_gate_promotion_allowed_bool",
  ];

  assert.match(route, /getMoralTradePostClearAuditContract/);
  assert.match(route, /postClearAuditSampleEvaluationStatuses/);
  assert.match(enforceRoute, /post_clear_audit_enforce/);
  assert.match(enforceRoute, /moral_trade_post_clear_audit_enforcement_records/);
  assert.match(enforceRoute, /authentication_required:post_clear_audit_enforce/);
  assert.match(enforceRoute, /database_insert_failed:post_clear_audit_enforce/);
  assert.match(enforceRoute, /postClearSamplingAssignmentAllowed: false/);
  assert.match(enforceRoute, /auditRecordReviewAllowed: false/);
  assert.match(enforceRoute, /correctiveActionResolutionAllowed: false/);
  assert.match(enforceRoute, /paymentReconciliationCloseAllowed: false/);
  assert.match(enforceRoute, /payoutReleaseAllowed: false/);
  assert.match(enforceRoute, /publicMetricPublicationAllowed: false/);
  assert.match(enforceRoute, /releaseGatePromotionAllowed: false/);
  assert.match(health, /postClearAuditValidation/);
  assert.match(health, /postClearAuditFirstClassRecordTables/);
  assert.match(spec, /postClearAuditContract\.firstClassRecordTables/);
  assert.match(spec, /\/api\/moral-trade\/post-clear-audit\/contract/);
  assert.match(apiContract, /moral_trade_post_clear_audit_contract/);
  assert.match(apiContract, /moral_trade_post_clear_audit_enforce/);
  assert.match(apiRateLimit, /post_clear_audit_enforce/);
  assert.match(operations, /post_clear_audit_enforce/);
  assert.match(operationsProfile, /post_clear_audit_enforce/);
  assert.match(apiProfile, /post_clear_audit_contract_response/);
  assert.match(apiProfile, /post_clear_audit_enforce_request/);
  assert.match(apiProfile, /post_clear_audit_enforce_response/);
  assert.match(apiProfile, /post_clear_audit_enforce_route_contract/);
  assert.match(apiProfile, /post-clear audit sampling governance/);
  assert.match(clearingPreview, /postClearAuditSamplingStatus/);
  assert.match(migration, /moral_trade_post_clear_audit_policies/);
  assert.match(migration, /moral_trade_post_clear_audit_records/);
  assert.match(migration, /moral_trade_post_clear_audit_enforcement_records/);
  assert.match(migration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(migration, /public_reputation_effect_prohibited_bool/);
  assert.match(migration, /post_clear_audit/);
  assert.match(schema, /moral_trade_post_clear_audit_records/);
  assert.match(schema, /moral_trade_post_clear_audit_enforcement_records/);
  assert.match(schema, /raw_payment_evidence_public_bool/);
  assert.match(databaseTypes, /moral_trade_post_clear_audit_policies/);
  assert.match(databaseTypes, /moral_trade_post_clear_audit_enforcement_records/);
  assert.match(databaseTypes, /post_clear_audit/);

  for (const column of forbiddenAllowColumns) {
    assert.match(migration, new RegExp(`check \\(${column} = false\\)`));
    assert.match(schema, new RegExp(`check \\(${column} = false\\)`));
  }
});
