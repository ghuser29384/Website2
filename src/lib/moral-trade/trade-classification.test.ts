import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceTradeClassification } from "@/app/api/moral-trade/trade-classification/enforce/route";

import {
  evaluateMoralTradeTradeClassification,
  getMoralTradeTradeClassificationContract,
  validateMoralTradeTradeClassificationContract,
  type MoralTradeTradeClassificationRecord,
  type MoralTradeTradeClassificationReviewStatus,
} from "./trade-classification";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function reviewStatuses(
  status: MoralTradeTradeClassificationReviewStatus,
): MoralTradeTradeClassificationRecord["reviewStatuses"] {
  return {
    anti_corruption_process_integrity: status,
    coercion_undue_influence: status,
    externality: status,
    labor_employment: status,
    legal_jurisdiction: status,
    ordinary_service_procurement: status,
    tax_reporting: status,
    vulnerability_undue_inducement: status,
  };
}

function classificationRecord(
  overrides: Partial<MoralTradeTradeClassificationRecord> = {},
): MoralTradeTradeClassificationRecord {
  return {
    classificationId: "trade-classification:test",
    subjectType: "compensated_moral_action",
    subjectRef: "pledge-swap:test",
    tradeClassification: "mixed_moral_trade",
    classificationState: "reviewed",
    metricsEligibility: "eligible_for_moral_trade_metrics",
    policySnapshotStatus: "resolved_immutable",
    payerMoralReasonHash: hashFor("payer-moral-reason"),
    performerCounterfactualAcceptanceState: "says_would_not_without_compensation",
    ordinaryServiceProcurementReviewState: "non_blocking",
    moralTradeClassificationRationaleHash: hashFor("classification-rationale"),
    termsState: "locked",
    exactActionFrozen: true,
    compensationTermsFrozen: true,
    evidenceBurdenFrozen: true,
    reviewPeriodFrozen: true,
    exitRemedyRuleFrozen: true,
    publicBadgeExposed: false,
    reviewStatuses: reviewStatuses("passed"),
    reviewedAt: "2026-06-08T12:00:00.000Z",
    expiresAt: "2026-12-08T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

test("trade-classification contract validates first-class classification governance", () => {
  const contract = getMoralTradeTradeClassificationContract();
  const validation = validateMoralTradeTradeClassificationContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_trade_classification_records"));
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_trade_classification_enforcement_records",
    ),
  );
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_compensated_action_terms"));
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_ordinary_service_procurement_reviews",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("trade_classification"));
  assert.ok(contract.policySnapshotSubjects.includes("compensated_moral_action"));
  assert.ok(contract.policySnapshotSubjects.includes("ordinary_service_procurement"));
  assert.ok(contract.classifications.includes("mixed_moral_trade"));
  assert.ok(contract.classifications.includes("ordinary_service_or_procurement"));
  assert.ok(contract.classifications.includes("rejected_threat_or_externality"));
  assert.ok(contract.reviewDimensions.includes("ordinary_service_procurement"));
  assert.ok(contract.reviewDimensions.includes("coercion_undue_influence"));
  assert.ok(contract.reviewDimensions.includes("anti_corruption_process_integrity"));
  assert.match(contract.publicNonClaim, /not a public moral status badge/i);
});

test("classification record is required before reliance-bearing moral-trade transitions", () => {
  const preview = evaluateMoralTradeTradeClassification({
    transition: "draft_preview",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [],
  });

  assert.equal(preview.status, "pass");
  assert.equal(preview.requiredRecordCount, 0);

  const lock = evaluateMoralTradeTradeClassification({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [],
  });

  assert.equal(lock.status, "blocked");
  assert.ok(lock.blockers.includes("trade_classification_record_required"));
  assert.deepEqual(lock.userFacingBlockerCategories, [
    "Trade classification needs review before lock",
  ]);
});

test("compensated moral action can pass only as frozen reviewed mixed moral trade", () => {
  const pass = evaluateMoralTradeTradeClassification({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [classificationRecord()],
  });

  assert.equal(pass.status, "pass");
  assert.equal(pass.passingRecordCount, 1);
  assert.equal(pass.metricEligibleRecordCount, 1);

  const blocked = evaluateMoralTradeTradeClassification({
    transition: "payment_capture",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [
      classificationRecord({
        payerMoralReasonHash: null,
        performerCounterfactualAcceptanceState: "says_would_anyway",
        ordinaryServiceProcurementReviewState: "ordinary_service_blocking",
        compensationTermsFrozen: false,
        reviewStatuses: {
          ...reviewStatuses("passed"),
          ordinary_service_procurement: "blocked",
          coercion_undue_influence: "under_review",
        },
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(
    blocked.blockers.includes(
      "payer_moral_reason_hash_missing:trade-classification:test",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "performer_counterfactual_not_supporting_mixed_trade:trade-classification:test:says_would_anyway",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "ordinary_service_procurement_not_non_blocking:trade-classification:test:ordinary_service_blocking",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "compensated_action_terms_not_frozen:trade-classification:test",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "trade_classification_review_not_non_blocking:ordinary_service_procurement:blocked",
    ),
  );
});

test("ordinary service and ordinary donation classifications are excluded from moral-trade metrics", () => {
  const ordinaryMetric = evaluateMoralTradeTradeClassification({
    transition: "public_metric_publication",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [
      classificationRecord({
        subjectType: "public_goods_round",
        tradeClassification: "ordinary_donation_or_matching",
        classificationState: "reviewed",
        metricsEligibility: "excluded_ordinary",
        payerMoralReasonHash: null,
        performerCounterfactualAcceptanceState: "not_recorded",
        ordinaryServiceProcurementReviewState: "not_required",
        reviewStatuses: reviewStatuses("not_required_for_stage"),
      }),
    ],
  });

  assert.equal(ordinaryMetric.status, "pass");
  assert.equal(ordinaryMetric.metricEligibleRecordCount, 0);

  const ordinaryLock = evaluateMoralTradeTradeClassification({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [
      classificationRecord({
        tradeClassification: "ordinary_service_or_procurement",
        metricsEligibility: "eligible_for_moral_trade_metrics",
      }),
    ],
  });

  assert.equal(ordinaryLock.status, "blocked");
  assert.ok(
    ordinaryLock.blockers.includes(
      "ordinary_trade_included_in_moral_metrics:trade-classification:test",
    ),
  );
  assert.ok(
    ordinaryLock.blockers.includes(
      "ordinary_trade_cannot_lock_as_moral_trade:trade-classification:test:matched_trade_lock",
    ),
  );
});

test("trade-classification records fail closed for public badges, stale policy, expiry, and invalid hashes", () => {
  const evaluate = (overrides: Partial<MoralTradeTradeClassificationRecord>) =>
    evaluateMoralTradeTradeClassification({
      transition: "public_metric_publication",
      checkedAt: "2026-06-08T12:00:00.000Z",
      records: [classificationRecord(overrides)],
    });

  assert.ok(
    evaluate({ publicBadgeExposed: true }).blockers.includes(
      "trade_classification_public_badge_exposed:trade-classification:test",
    ),
  );
  assert.ok(
    evaluate({ policySnapshotStatus: "mutable" }).blockers.includes(
      "trade_classification_policy_snapshot_not_immutable:mutable",
    ),
  );
  assert.ok(
    evaluate({ reviewedAt: "2025-01-01T12:00:00.000Z" }).blockers.includes(
      "stale_trade_classification:trade-classification:test",
    ),
  );
  assert.ok(
    evaluate({ expiresAt: "2026-01-01T12:00:00.000Z" }).blockers.includes(
      "expired_trade_classification:trade-classification:test",
    ),
  );
  assert.ok(
    evaluate({ moralTradeClassificationRationaleHash: "sha256:broken" }).blockers.includes(
      "invalid_trade_classification_rationale_hash:trade-classification:test",
    ),
  );
});

test("trade-classification enforce route is fail-closed before persistence on invalid input", async () => {
  const response = await enforceTradeClassification(
    new Request("http://localhost/api/moral-trade/trade-classification/enforce", {
      body: "not-json",
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.tradeClassificationGateStatus, "blocked");
  assert.equal(body.lockTransitionAllowed, false);
  assert.equal(body.paymentTransitionAllowed, false);
  assert.equal(body.payoutReleaseAllowed, false);
  assert.equal(body.relianceBearingTransitionAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.equal(body.persistence.status, "not_recorded");
  assert.equal(
    body.persistence.table,
    "moral_trade_trade_classification_enforcement_records",
  );
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("trade-classification route, health, technical spec, API contract, and migration are wired", () => {
  const source = readRepoFile("src/lib/moral-trade/trade-classification.ts");
  const route = readRepoFile(
    "src/app/api/moral-trade/trade-classification/contract/route.ts",
  );
  const enforceRoute = readRepoFile(
    "src/app/api/moral-trade/trade-classification/enforce/route.ts",
  );
  const health = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const spec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContract = readRepoFile("config/moral-trade/api-contract-profile.json");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const operations = readRepoFile("src/lib/moral-trade/operations.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260608_moral_trade_trade_classification_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(source, /moral_trade_trade_classification_records/);
  assert.match(source, /moral_trade_trade_classification_enforcement_records/);
  assert.match(source, /trade_classification_enforce_route_contract/);
  assert.match(source, /moral_trade_compensated_action_terms/);
  assert.match(source, /ordinary_service_procurement/);
  assert.match(source, /not a public moral status badge/);
  assert.match(route, /getMoralTradeTradeClassificationContract/);
  assert.match(route, /tradeClassificationSampleEvaluationStatuses/);
  assert.match(enforceRoute, /trade_classification_enforce/);
  assert.match(enforceRoute, /moral_trade_trade_classification_enforcement_records/);
  assert.match(enforceRoute, /auth\.getUser/);
  assert.match(enforceRoute, /lockTransitionAllowed:\s*false/);
  assert.match(enforceRoute, /paymentTransitionAllowed:\s*false/);
  assert.match(enforceRoute, /payoutReleaseAllowed:\s*false/);
  assert.match(enforceRoute, /relianceBearingTransitionAllowed:\s*false/);
  assert.match(enforceRoute, /publicMetricPublicationAllowed:\s*false/);
  assert.match(enforceRoute, /releaseGatePromotionAllowed:\s*false/);
  assert.match(health, /tradeClassificationValidation/);
  assert.match(health, /tradeClassificationFirstClassRecordTables/);
  assert.match(spec, /Trade-classification contract/);
  assert.match(spec, /trade-classification\/contract/);
  assert.match(apiContractSource, /moral_trade_trade_classification_enforce/);
  assert.match(apiContract, /moral_trade_trade_classification_contract/);
  assert.match(apiContract, /moral_trade_trade_classification_enforce/);
  assert.match(apiContract, /trade_classification_enforce_request/);
  assert.match(apiContract, /trade_classification_enforce_response/);
  assert.match(apiContract, /trade_classification_contract_response/);
  assert.match(operationsProfile, /trade_classification_enforce/);
  assert.match(operations, /trade_classification_enforce/);
  assert.match(migration, /moral_trade_trade_classification_records/);
  assert.match(migration, /moral_trade_trade_classification_enforcement_records/);
  assert.match(migration, /moral_trade_compensated_action_terms/);
  assert.match(migration, /moral_trade_ordinary_service_procurement_reviews/);
  assert.match(migration, /public_metric_publication_allowed_bool = false/);
  assert.match(migration, /release_gate_promotion_allowed_bool = false/);
  assert.match(migration, /ordinary_service_procurement/);
  assert.match(schema, /moral_trade_trade_classification_records/);
  assert.match(schema, /moral_trade_trade_classification_enforcement_records/);
  assert.match(schema, /moral_trade_compensated_action_terms/);
  assert.match(databaseTypes, /moral_trade_trade_classification_records/);
  assert.match(databaseTypes, /moral_trade_trade_classification_enforcement_records/);
  assert.match(databaseTypes, /moral_trade_ordinary_service_procurement_reviews/);
});
