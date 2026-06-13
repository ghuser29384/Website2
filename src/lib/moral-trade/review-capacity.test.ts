import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateMoralTradeReviewCapacity,
  getMoralTradeReviewCapacityContract,
  validateMoralTradeReviewCapacityContract,
  type MoralTradeReviewCapacityPolicyRecord,
  type MoralTradeReviewerPanelAssignmentRecord,
  type MoralTradeReviewQueueRecord,
} from "./review-capacity";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function policyRecord(
  overrides: Partial<MoralTradeReviewCapacityPolicyRecord> = {},
): MoralTradeReviewCapacityPolicyRecord {
  return {
    policyId: "review-capacity-policy:tier-1-donation-offset",
    releaseStage: "tier_1_money_only_donation_offset",
    subjectType: "donation_offset",
    policyStatus: "resolved_immutable",
    policyHash: hashFor("review-capacity-policy"),
    maxOpenQueueDepth: 20,
    maxEstimatedWaitDays: 7,
    minEligibleReviewerCount: 2,
    neutralPanelRequired: true,
    maxBaselineAgeDays: 14,
    maxPaymentAuthorizationAgeDays: 3,
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-09-11T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function queueRecord(
  overrides: Partial<MoralTradeReviewQueueRecord> = {},
): MoralTradeReviewQueueRecord {
  return {
    queueId: "review-queue:offset-offer-demo",
    policyRef: "review-capacity-policy:tier-1-donation-offset",
    subjectType: "donation_offset",
    subjectRef: "offset-offer:demo",
    queueState: "admitted",
    queuePosition: 2,
    openQueueDepth: 6,
    eligibleReviewerCount: 3,
    neutralPanelAvailable: true,
    visibleUserQueueStatus: "in_review_queue",
    userStatusCopyHash: hashFor("public-review-queue-status"),
    estimatedReviewBy: "2026-06-14T12:00:00.000Z",
    baselineExpiresAt: "2026-06-20T12:00:00.000Z",
    paymentAuthorizationExpiresAt: "2026-06-16T12:00:00.000Z",
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-06-18T12:00:00.000Z",
    supersededBy: null,
    privateQueueReasonPublic: false,
    reviewerIdentityPublic: false,
    ...overrides,
  };
}

function panelAssignment(
  overrides: Partial<MoralTradeReviewerPanelAssignmentRecord> = {},
): MoralTradeReviewerPanelAssignmentRecord {
  return {
    assignmentId: "reviewer-panel:offset-offer-demo",
    queueRef: "review-queue:offset-offer-demo",
    assignmentState: "eligible",
    reviewerCount: 3,
    neutralReviewerCount: 1,
    conflictScreeningState: "passed",
    reviewerQualityState: "current",
    assignmentHash: hashFor("reviewer-panel-assignment"),
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-06-18T12:00:00.000Z",
    supersededBy: null,
    reviewerIdentityPublic: false,
    conflictFactsPublic: false,
    ...overrides,
  };
}

test("review-capacity contract validates first-class queue-admission governance", () => {
  const contract = getMoralTradeReviewCapacityContract();
  const validation = validateMoralTradeReviewCapacityContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_review_capacity_policies"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_review_queue_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_reviewer_panel_assignments"));
  assert.ok(contract.policySnapshotSubjects.includes("review_capacity"));
  assert.ok(contract.policySnapshotSubjects.includes("review_queue_admission"));
  assert.ok(contract.queueStates.includes("waitlisted"));
  assert.ok(contract.visibleQueueStatuses.includes("waitlisted_capacity"));
  assert.ok(contract.panelStates.includes("conflicted"));
  assert.match(contract.failClosedRule, /visible user-facing queue status/i);
  assert.match(contract.failClosedRule, /stale payment authorizations/i);
  assert.match(contract.privacyBoundary, /participant-specific queue records/i);
});

test("draft preview can pass without review capacity, but live offers cannot", () => {
  const preview = evaluateMoralTradeReviewCapacity({
    transition: "draft_preview",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [],
    queueRecords: [],
    panelAssignments: [],
  });

  assert.equal(preview.status, "pass");
  assert.equal(preview.requiredPolicyCount, 0);

  const live = evaluateMoralTradeReviewCapacity({
    transition: "live_offer_publication",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [],
    queueRecords: [],
    panelAssignments: [],
  });

  assert.equal(live.status, "blocked");
  assert.ok(live.blockers.includes("review_capacity_policy_required"));
  assert.ok(live.blockers.includes("review_queue_record_required"));
  assert.ok(live.blockers.includes("reviewer_panel_assignment_required"));
  assert.deepEqual(live.userFacingBlockerCategories, [
    "Offer needs review-capacity admission before it can go live",
  ]);
});

test("admitted queue with eligible neutral panel can pass matchable publication", () => {
  const result = evaluateMoralTradeReviewCapacity({
    transition: "matchable_publication",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    queueRecords: [queueRecord()],
    panelAssignments: [panelAssignment()],
  });

  assert.equal(result.status, "pass");
  assert.equal(result.admittedQueueCount, 1);
  assert.equal(result.eligiblePanelCount, 1);
});

test("queue overflow and waitlisted status keep offers out of live matching", () => {
  const result = evaluateMoralTradeReviewCapacity({
    transition: "live_offer_publication",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord({ maxOpenQueueDepth: 5 })],
    queueRecords: [
      queueRecord({
        queueState: "waitlisted",
        queuePosition: 9,
        openQueueDepth: 9,
        visibleUserQueueStatus: "waitlisted_capacity",
      }),
    ],
    panelAssignments: [panelAssignment()],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "review_queue_not_admitted:review-queue:offset-offer-demo:waitlisted",
    ),
  );
  assert.ok(result.blockers.includes("review_queue_over_policy_depth:review-queue:offset-offer-demo"));
  assert.ok(
    result.blockers.includes(
      "review_queue_visible_status_not_live:review-queue:offset-offer-demo:waitlisted_capacity",
    ),
  );
});

test("neutral panel and reviewer-quality requirements fail closed", () => {
  const result = evaluateMoralTradeReviewCapacity({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    queueRecords: [
      queueRecord({
        neutralPanelAvailable: false,
      }),
    ],
    panelAssignments: [
      panelAssignment({
        neutralReviewerCount: 0,
        conflictScreeningState: "conflicted",
        reviewerQualityState: "failed",
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("review_queue_neutral_panel_unavailable:review-queue:offset-offer-demo"));
  assert.ok(result.blockers.includes("neutral_reviewer_panel_missing:reviewer-panel:offset-offer-demo"));
  assert.ok(
    result.blockers.includes(
      "reviewer_panel_conflict_screening_blocked:reviewer-panel:offset-offer-demo:conflicted",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "reviewer_panel_quality_not_current:reviewer-panel:offset-offer-demo:failed",
    ),
  );
});

test("estimated review delay cannot outlive baselines or payment authorizations", () => {
  const result = evaluateMoralTradeReviewCapacity({
    transition: "payment_capture",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord({ maxEstimatedWaitDays: 4 })],
    queueRecords: [
      queueRecord({
        estimatedReviewBy: "2026-06-18T12:00:00.000Z",
        baselineExpiresAt: "2026-06-13T12:00:00.000Z",
        paymentAuthorizationExpiresAt: "2026-06-14T12:00:00.000Z",
      }),
    ],
    panelAssignments: [panelAssignment()],
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("estimated_review_delay_exceeds_policy:review-queue:offset-offer-demo"));
  assert.ok(result.blockers.includes("estimated_review_after_baseline_expiry:review-queue:offset-offer-demo"));
  assert.ok(
    result.blockers.includes(
      "estimated_review_after_payment_authorization_expiry:review-queue:offset-offer-demo",
    ),
  );
});

test("public queue status cannot expose internal status, reviewer identity, or conflict facts", () => {
  const result = evaluateMoralTradeReviewCapacity({
    transition: "release_gate_promotion",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    queueRecords: [
      queueRecord({
        visibleUserQueueStatus: "internal_reviewer_conflict_private_reason",
        privateQueueReasonPublic: true,
        reviewerIdentityPublic: true,
      }),
    ],
    panelAssignments: [
      panelAssignment({
        reviewerIdentityPublic: true,
        conflictFactsPublic: true,
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("review_queue_visible_status_unknown:review-queue:offset-offer-demo"));
  assert.ok(result.blockers.includes("unsafe_review_queue_user_status_copy:review-queue:offset-offer-demo"));
  assert.ok(result.blockers.includes("private_review_queue_reason_public:review-queue:offset-offer-demo"));
  assert.ok(result.blockers.includes("reviewer_identity_public_in_queue_status:review-queue:offset-offer-demo"));
  assert.ok(
    result.blockers.includes(
      "reviewer_identity_public_in_panel_assignment:reviewer-panel:offset-offer-demo",
    ),
  );
  assert.ok(result.blockers.includes("reviewer_conflict_facts_public:reviewer-panel:offset-offer-demo"));
});

test("review-capacity route, health, spec, API contract, and schema are wired", () => {
  const source = readRepoFile("src/lib/moral-trade/review-capacity.ts");
  const contractRoute = readRepoFile(
    "src/app/api/moral-trade/review-capacity/contract/route.ts",
  );
  const enforceRoute = readRepoFile(
    "src/app/api/moral-trade/review-capacity/enforce/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiRateLimitSource = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const operationsSource = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260611_moral_trade_review_capacity_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(source, /getMoralTradeReviewCapacityContract/);
  assert.match(source, /evaluateMoralTradeReviewCapacity/);
  assert.match(source, /moral_trade_review_capacity_policies/);
  assert.match(source, /moral_trade_review_queue_records/);
  assert.match(source, /moral_trade_reviewer_panel_assignments/);
  assert.match(source, /waitlisted_capacity/);
  assert.match(source, /estimated_review_after_payment_authorization_expiry/);
  assert.match(contractRoute, /reviewCapacitySampleEvaluationStatuses/);
  assert.match(enforceRoute, /review_capacity_enforce/);
  assert.match(enforceRoute, /moral_trade_review_capacity_enforcement_records/);
  assert.match(enforceRoute, /livePublicationAllowed: false/);
  assert.match(enforceRoute, /matchablePublicationAllowed: false/);
  assert.match(enforceRoute, /lockTransitionAllowed: false/);
  assert.match(enforceRoute, /paymentAuthorizationAllowed: false/);
  assert.match(enforceRoute, /paymentCaptureAllowed: false/);
  assert.match(enforceRoute, /relianceBearingTransitionAllowed: false/);
  assert.match(enforceRoute, /publicMetricPublicationAllowed: false/);
  assert.match(enforceRoute, /releaseGatePromotionAllowed: false/);
  assert.match(enforceRoute, /authentication_required:review_capacity_enforce/);
  assert.match(enforceRoute, /database_insert_failed:review_capacity_enforce/);
  assert.match(apiRateLimitSource, /review_capacity_enforce/);
  assert.match(healthRoute, /reviewCapacityValidation/);
  assert.match(healthRoute, /reviewCapacityFirstClassRecordTables/);
  assert.match(technicalSpec, /reviewCapacityContract\.firstClassRecordTables/);
  assert.match(apiContractSource, /moral_trade_review_capacity_contract/);
  assert.match(apiContractSource, /moral_trade_review_capacity_enforce/);
  assert.match(apiContractProfile, /review_capacity_contract_response/);
  assert.match(apiContractProfile, /review_capacity_enforce_request/);
  assert.match(apiContractProfile, /review_capacity_enforce_response/);
  assert.match(apiContractProfile, /review_capacity_enforce_route_contract/);
  assert.match(operationsSource, /review_capacity_enforce/);
  assert.match(operationsProfile, /review_capacity_enforce/);
  for (const tableSource of [migration, schema]) {
    assert.match(tableSource, /moral_trade_review_capacity_policies/);
    assert.match(tableSource, /moral_trade_review_queue_records/);
    assert.match(tableSource, /moral_trade_reviewer_panel_assignments/);
    assert.match(tableSource, /moral_trade_review_capacity_enforcement_records/);
    assert.match(tableSource, /review_capacity/);
    assert.match(tableSource, /review_queue_admission/);
    assert.match(tableSource, /visible_user_queue_status/);
    assert.match(tableSource, /payment_authorization_expires_at/);
    assert.match(tableSource, /live_publication_allowed_bool boolean not null default false/);
    assert.match(tableSource, /matchable_publication_allowed_bool boolean not null default false/);
    assert.match(tableSource, /check \(live_publication_allowed_bool = false\)/);
    assert.match(tableSource, /check \(matchable_publication_allowed_bool = false\)/);
    assert.match(tableSource, /check \(lock_transition_allowed_bool = false\)/);
    assert.match(tableSource, /check \(payment_authorization_allowed_bool = false\)/);
    assert.match(tableSource, /check \(payment_capture_allowed_bool = false\)/);
    assert.match(tableSource, /check \(reliance_bearing_transition_allowed_bool = false\)/);
    assert.match(tableSource, /check \(public_metric_publication_allowed_bool = false\)/);
    assert.match(tableSource, /check \(release_gate_promotion_allowed_bool = false\)/);
    assert.match(tableSource, /owner_profile_id = auth\.uid\(\)/);
  }
  assert.match(databaseTypes, /moral_trade_review_capacity_policies/);
  assert.match(databaseTypes, /moral_trade_review_queue_records/);
  assert.match(databaseTypes, /moral_trade_reviewer_panel_assignments/);
  assert.match(databaseTypes, /moral_trade_review_capacity_enforcement_records/);
});
