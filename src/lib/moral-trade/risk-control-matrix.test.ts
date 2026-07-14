import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceRiskControlMatrix } from "@/app/api/moral-trade/risk-control-matrix/enforce/route";

import {
  evaluateMoralTradeRiskControlMatrix,
  getMoralTradeRiskControlMatrixContract,
  validateMoralTradeRiskControlMatrixContract,
  type MoralTradeControlApplicabilityMatrixRecord,
  type MoralTradeControlRequirementResultRecord,
  type MoralTradeRiskControlCode,
  type MoralTradeRiskControlPackRecord,
} from "./risk-control-matrix";

const CHECKED_AT = "2026-06-13T12:00:00.000Z";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function packRecord(
  overrides: Partial<MoralTradeRiskControlPackRecord> = {},
): MoralTradeRiskControlPackRecord {
  return {
    appliesToReleaseStages: ["matched_trade_lock"],
    appliesToTiers: ["tier_1_money_only_donation_offset"],
    appliesToTradeType: "donation_offset",
    controlPackHash: hashFor("risk-control-pack"),
    createdAt: CHECKED_AT,
    failClosedUnknownControls: true,
    notRequiredControlCodes: ["post_clear_audit"],
    optionalControlCodes: ["direct_pair_clearing"],
    packId: "risk-control-pack:tier-1",
    packName: "Tier 1 donation offset controls",
    policyVersion: "risk-control-pack-v0.1",
    requiredControlCodes: [
      "participant_term_sheet",
      "non_public_goods_tier",
      "counterfactual_trust",
      "offer_validity",
      "net_offset_accounting",
    ],
    reviewerDecisionRef: "review-decision:risk-control-pack",
    supersededBy: null,
    updatedAt: CHECKED_AT,
    ...overrides,
  };
}

function matrixRecord(
  overrides: Partial<MoralTradeControlApplicabilityMatrixRecord> = {},
): MoralTradeControlApplicabilityMatrixRecord {
  return {
    aiPreferenceElicitationUsed: false,
    applicableControlCodes: [
      "participant_term_sheet",
      "non_public_goods_tier",
      "counterfactual_trust",
      "offer_validity",
      "net_offset_accounting",
      "post_clear_audit",
    ],
    applicableRiskControlPackRefs: ["risk-control-pack:tier-1"],
    batchClearingRequired: true,
    causeBucketTaxonomyRef: "cause-taxonomy:v1",
    compensation: false,
    confidentialVerificationRequired: false,
    counterpartyBlindingRequired: true,
    createdAt: CHECKED_AT,
    directPairClearing: false,
    evidenceBurdenLevel: "medium",
    highStakesOrIrreversible: false,
    jurisdictionBucket: "US-general",
    matrixHash: hashFor("control-applicability-matrix"),
    matrixId: "control-matrix:lock",
    moneyMovement: true,
    negativeCommitment: false,
    netOffsetAccountingRequired: true,
    nonPublicGoodsMarketTier: "tier_1_money_only_donation_offset",
    noncompensableBlockerPresent: false,
    openMarketMatching: false,
    participantTermSheetRequired: true,
    postClearAuditRequired: false,
    recipientAcceptanceRequired: true,
    releaseStage: "matched_trade_lock",
    resourceCompatibilityRequired: true,
    reviewerDecisionRef: "review-decision:matrix",
    staleOffer: false,
    subjectId: "matched-lock-proposal:demo",
    subjectType: "matched_trade_lock_proposal",
    supersededBy: null,
    tradeType: "donation_offset",
    updatedAt: CHECKED_AT,
    ...overrides,
  };
}

function resultRecord(
  controlCode: MoralTradeRiskControlCode,
  overrides: Partial<MoralTradeControlRequirementResultRecord> = {},
): MoralTradeControlRequirementResultRecord {
  return {
    checkedAt: CHECKED_AT,
    controlCode,
    evidenceRef: `evidence:${controlCode}`,
    expiresAt: "2026-07-13T12:00:00.000Z",
    matrixRef: "control-matrix:lock",
    neutralReviewRef: null,
    policySnapshotRef: `policy-snapshot:${controlCode}`,
    privilegedActionRef: null,
    resultHash: hashFor(`control-result:${controlCode}`),
    resultId: `control-result:${controlCode}`,
    resultStatus: "passed",
    reviewerDecisionRef: `review-decision:${controlCode}`,
    riskControlPackRef: "risk-control-pack:tier-1",
    subjectId: "matched-lock-proposal:demo",
    subjectType: "matched_trade_lock_proposal",
    supersededBy: null,
    ...overrides,
  };
}

function passingResults(pack = packRecord()) {
  return pack.requiredControlCodes.map((code) => resultRecord(code));
}

test("risk-control matrix contract validates first-class records and fail-closed statuses", () => {
  const contract = getMoralTradeRiskControlMatrixContract();
  const validation = validateMoralTradeRiskControlMatrixContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_risk_control_packs"));
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_control_applicability_matrices",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_control_requirement_results",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_risk_control_matrix_enforcement_records",
    ),
  );
  assert.ok(contract.knownControlCodes.includes("control_applicability_matrix"));
  assert.ok(contract.knownControlCodes.includes("financial_settlement_controls"));
  assert.ok(contract.nonBlockingStatuses.includes("privileged_neutral_review_waiver"));
  assert.ok(contract.failClosedStatuses.includes("unmapped"));
  assert.ok(contract.failClosedStatuses.includes("duplicated"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "blocked"));
});

test("complete reviewed control pack can pass a matched-trade lock transition", () => {
  const pack = packRecord();
  const result = evaluateMoralTradeRiskControlMatrix({
    transition: "matched_trade_lock",
    checkedAt: CHECKED_AT,
    matrices: [matrixRecord()],
    packs: [pack],
    results: passingResults(pack),
  });

  assert.equal(result.status, "pass");
  assert.equal(result.requiredControlCount, pack.requiredControlCodes.length);
  assert.equal(result.nonBlockingControlCount, pack.requiredControlCodes.length);
  assert.equal(result.privilegedWaiverCount, 0);
  assert.deepEqual(result.blockers, []);
});

test("missing and unmapped required controls fail closed", () => {
  const pack = packRecord({
    requiredControlCodes: [
      "participant_term_sheet",
      "offer_validity",
      "financial_settlement_controls",
    ],
  });
  const result = evaluateMoralTradeRiskControlMatrix({
    transition: "matched_trade_lock",
    checkedAt: CHECKED_AT,
    matrices: [
      matrixRecord({
        applicableControlCodes: ["participant_term_sheet", "offer_validity"],
      }),
    ],
    packs: [pack],
    results: [resultRecord("participant_term_sheet")],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "required_control_result_missing:control-matrix:lock:risk-control-pack:tier-1:offer_validity",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "risk_control_pack_required_control_unmapped:control-matrix:lock:risk-control-pack:tier-1:financial_settlement_controls",
    ),
  );
});

test("duplicate or stale control results fail closed", () => {
  const pack = packRecord({ requiredControlCodes: ["participant_term_sheet"] });
  const duplicate = evaluateMoralTradeRiskControlMatrix({
    transition: "matched_trade_lock",
    checkedAt: CHECKED_AT,
    matrices: [matrixRecord({ applicableControlCodes: ["participant_term_sheet"] })],
    packs: [pack],
    results: [
      resultRecord("participant_term_sheet"),
      resultRecord("participant_term_sheet", {
        resultId: "control-result:participant-term-sheet:duplicate",
      }),
    ],
  });

  assert.equal(duplicate.status, "blocked");
  assert.ok(
    duplicate.blockers.includes(
      "required_control_result_duplicated:control-matrix:lock:risk-control-pack:tier-1:participant_term_sheet",
    ),
  );

  const stale = evaluateMoralTradeRiskControlMatrix({
    transition: "matched_trade_lock",
    checkedAt: CHECKED_AT,
    matrices: [matrixRecord({ applicableControlCodes: ["participant_term_sheet"] })],
    packs: [pack],
    results: [
      resultRecord("participant_term_sheet", {
        checkedAt: "2025-01-01T12:00:00.000Z",
        expiresAt: "2025-02-01T12:00:00.000Z",
      }),
    ],
  });

  assert.equal(stale.status, "blocked");
  assert.ok(
    stale.blockers.includes(
      "control_requirement_result_stale:control-result:participant_term_sheet:participant_term_sheet",
    ),
  );
});

test("privileged neutral-review waiver requires neutral review and privileged action refs", () => {
  const pack = packRecord({ requiredControlCodes: ["participant_term_sheet"] });
  const missingRefs = evaluateMoralTradeRiskControlMatrix({
    transition: "matched_trade_lock",
    checkedAt: CHECKED_AT,
    matrices: [matrixRecord({ applicableControlCodes: ["participant_term_sheet"] })],
    packs: [pack],
    results: [
      resultRecord("participant_term_sheet", {
        resultStatus: "privileged_neutral_review_waiver",
        reviewerDecisionRef: null,
      }),
    ],
  });

  assert.equal(missingRefs.status, "blocked");
  assert.ok(
    missingRefs.blockers.includes(
      "control_requirement_waiver_refs_missing:control-result:participant_term_sheet:participant_term_sheet",
    ),
  );

  const withRefs = evaluateMoralTradeRiskControlMatrix({
    transition: "matched_trade_lock",
    checkedAt: CHECKED_AT,
    matrices: [matrixRecord({ applicableControlCodes: ["participant_term_sheet"] })],
    packs: [pack],
    results: [
      resultRecord("participant_term_sheet", {
        neutralReviewRef: "neutral-review:waiver",
        privilegedActionRef: "privileged-action:waiver",
        resultStatus: "privileged_neutral_review_waiver",
        reviewerDecisionRef: null,
      }),
    ],
  });

  assert.equal(withRefs.status, "pass");
  assert.equal(withRefs.privilegedWaiverCount, 1);
});

test("risk-control matrix enforce route is fail-closed before persistence on invalid input", async () => {
  const response = await enforceRiskControlMatrix(
    new Request("http://localhost/api/moral-trade/risk-control-matrix/enforce", {
      body: "not-json",
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.riskControlMatrixGateStatus, "blocked");
  assert.equal(body.runtimeTransitionAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentAuthorizationAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.equal(body.persistence.status, "not_recorded");
  assert.equal(
    body.persistence.table,
    "moral_trade_risk_control_matrix_enforcement_records",
  );
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("risk-control matrix route, profiles, gates, schema, and migration are wired", () => {
  const route = readRepoFile(
    "src/app/api/moral-trade/risk-control-matrix/contract/route.ts",
  );
  const enforceRoute = readRepoFile(
    "src/app/api/moral-trade/risk-control-matrix/enforce/route.ts",
  );
  const apiContract = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiRateLimit = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operations = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile(
    "config/moral-trade/operations-profile.json",
  );
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_risk_control_matrix_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const releaseGates = readRepoFile("src/lib/moral-trade/release-gates.ts");
  const hardFalseColumns = [
    "runtime_transition_allowed_bool",
    "matched_trade_lock_allowed_bool",
    "payment_authorization_allowed_bool",
    "payment_capture_allowed_bool",
    "public_metric_publication_allowed_bool",
    "release_gate_promotion_allowed_bool",
  ];

  assert.match(route, /getMoralTradeRiskControlMatrixContract/);
  assert.match(route, /validateMoralTradeRiskControlMatrixContract/);
  assert.match(route, /sampleEvaluationStatuses/);
  assert.match(enforceRoute, /evaluateMoralTradeRiskControlMatrix/);
  assert.match(enforceRoute, /risk_control_matrix_enforce/);
  assert.match(enforceRoute, /moral_trade_risk_control_matrix_enforcement_records/);
  assert.match(enforceRoute, /runtimeTransitionAllowed: false/);
  assert.match(enforceRoute, /matchedTradeLockAllowed: false/);
  assert.match(enforceRoute, /paymentAuthorizationAllowed: false/);
  assert.match(enforceRoute, /paymentCaptureAllowed: false/);
  assert.match(enforceRoute, /publicMetricPublicationAllowed: false/);
  assert.match(enforceRoute, /releaseGatePromotionAllowed: false/);
  assert.match(apiContract, /moral_trade_risk_control_matrix_contract/);
  assert.match(apiContract, /moral_trade_risk_control_matrix_enforce/);
  assert.match(apiRateLimit, /risk_control_matrix_enforce/);
  assert.match(operations, /risk_control_matrix_enforce/);
  assert.match(operationsProfile, /risk_control_matrix_enforce/);
  assert.match(apiProfile, /risk_control_matrix_contract_response/);
  assert.match(apiProfile, /risk_control_matrix_enforce_request/);
  assert.match(apiProfile, /risk_control_matrix_enforce_response/);
  assert.match(apiProfile, /risk_control_matrix_enforce_route_contract/);
  assert.match(migration, /moral_trade_risk_control_packs/);
  assert.match(migration, /moral_trade_control_applicability_matrices/);
  assert.match(migration, /moral_trade_control_requirement_results/);
  assert.match(migration, /moral_trade_risk_control_matrix_enforcement_records/);
  assert.match(migration, /fail_closed_unknown_controls_bool = true/);
  assert.match(migration, /privileged_neutral_review_waiver/);
  assert.match(schema, /moral_trade_risk_control_packs/);
  assert.match(schema, /moral_trade_control_applicability_matrices/);
  assert.match(schema, /moral_trade_control_requirement_results/);
  assert.match(schema, /moral_trade_risk_control_matrix_enforcement_records/);
  assert.match(databaseTypes, /moral_trade_risk_control_packs/);
  assert.match(databaseTypes, /moral_trade_control_applicability_matrices/);
  assert.match(databaseTypes, /moral_trade_control_requirement_results/);
  assert.match(databaseTypes, /moral_trade_risk_control_matrix_enforcement_records/);
  assert.match(releaseGates, /control_applicability_matrix_test/);

  for (const column of hardFalseColumns) {
    assert.match(migration, new RegExp(`check \\(${column} = false\\)`));
    assert.match(schema, new RegExp(`check \\(${column} = false\\)`));
  }
});
