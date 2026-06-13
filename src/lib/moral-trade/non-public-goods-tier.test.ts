import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceNonPublicGoodsTier } from "@/app/api/moral-trade/non-public-goods-tier/enforce/route";

import {
  evaluateMoralTradeNonPublicGoodsTier,
  getMoralTradeNonPublicGoodsTierContract,
  validateMoralTradeNonPublicGoodsTierContract,
  type MoralTradeCounterfactualTrustAssessmentRecord,
  type MoralTradeNonPublicGoodsTierPolicyRecord,
} from "./non-public-goods-tier";

const CHECKED_AT = "2026-06-13T12:00:00.000Z";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function tierPolicy(
  overrides: Partial<MoralTradeNonPublicGoodsTierPolicyRecord> = {},
): MoralTradeNonPublicGoodsTierPolicyRecord {
  return {
    allowedCounterpartyModes: [
      "none_required",
      "closed_counterparty",
      "invite_only",
      "user_supplied",
    ],
    approvedTransition: "matched_trade_lock",
    expiresAt: "2026-07-13T12:00:00.000Z",
    openMarketMatchingAllowed: false,
    payableAllowed: true,
    policyHash: hashFor("non-public-goods-tier-policy"),
    policyId: "tier-policy:tier-1:matched-lock",
    policySnapshotStatus: "resolved_immutable",
    policyVersion: "non-public-goods-tier-policy-v0.1",
    publicMetricAllowed: true,
    releaseStage: "donation_offset_pilot",
    relianceBearingAllowed: true,
    requiresCounterfactualTrustAssessment: true,
    reviewedAt: CHECKED_AT,
    status: "passed",
    supersededBy: null,
    tier: "tier_1_money_only_donation_offset",
    ...overrides,
  };
}

function trustAssessment(
  overrides: Partial<MoralTradeCounterfactualTrustAssessmentRecord> = {},
): MoralTradeCounterfactualTrustAssessmentRecord {
  return {
    assessmentHash: hashFor("counterfactual-trust-assessment"),
    assessmentId: "counterfactual-trust:tier-1",
    assessmentStatus: "passed",
    baselineConfidenceLevel: "medium",
    baselineIntegrityStatus: "passed",
    counterfactualTrustClass: "money_only_verified_destination",
    counterpartyMode: "none_required",
    evidenceBurdenStatus: "least_intrusive_sufficient",
    expiresAt: "2026-07-13T12:00:00.000Z",
    participantConfirmationRef: "participant-confirmation:tier-1",
    participantUncertaintyDisclosed: true,
    reviewedAt: CHECKED_AT,
    reviewerDecisionRef: "review-decision:tier-1",
    subjectRef: "donation-offset:demo",
    subjectType: "donation_offset",
    supersededBy: null,
    tier: "tier_1_money_only_donation_offset",
    ...overrides,
  };
}

test("non-public-goods tier contract validates explicit tiers and trust classes", () => {
  const contract = getMoralTradeNonPublicGoodsTierContract();
  const validation = validateMoralTradeNonPublicGoodsTierContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_non_public_goods_tier_policies",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_counterfactual_trust_assessments",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_non_public_goods_tier_enforcement_records",
    ),
  );
  assert.ok(contract.tiers.includes("tier_1_money_only_donation_offset"));
  assert.ok(
    contract.tiers.includes(
      "tier_4_open_market_pledge_swap_or_compensated_action",
    ),
  );
  assert.ok(
    contract.counterfactualTrustClasses.includes(
      "self_offset_or_personal_bookkeeping",
    ),
  );
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "pass"));
  assert.ok(
    contract.sampleEvaluations.some((sample) => sample.status === "blocked"),
  );
});

test("tier-1 donation-offset policy and counterfactual-trust assessment can pass", () => {
  const result = evaluateMoralTradeNonPublicGoodsTier({
    transition: "matched_trade_lock",
    checkedAt: CHECKED_AT,
    policies: [tierPolicy()],
    assessments: [trustAssessment()],
  });

  assert.equal(result.status, "pass");
  assert.equal(result.requiredPolicyCount, 1);
  assert.equal(result.passingPolicyCount, 1);
  assert.equal(result.requiredAssessmentCount, 1);
  assert.equal(result.passingAssessmentCount, 1);
  assert.deepEqual(result.blockers, []);
});

test("tier-4 and open-market pledge-swap paths fail closed without specific governance", () => {
  const result = evaluateMoralTradeNonPublicGoodsTier({
    transition: "payment_capture",
    checkedAt: CHECKED_AT,
    policies: [
      tierPolicy({
        allowedCounterpartyModes: ["open_market"],
        approvedTransition: "payment_capture",
        openMarketMatchingAllowed: true,
        payableAllowed: true,
        policyId: "tier-policy:tier-4:payment-capture",
        releaseStage: "pledge_swap_manual_pilot",
        tier: "tier_4_open_market_pledge_swap_or_compensated_action",
      }),
    ],
    assessments: [
      trustAssessment({
        assessmentId: "counterfactual-trust:tier-4",
        counterfactualTrustClass: "open_market_behavior_change",
        counterpartyMode: "open_market",
        subjectRef: "pledge-swap:demo",
        subjectType: "pledge_swap",
        tier: "tier_4_open_market_pledge_swap_or_compensated_action",
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "tier_4_disabled_without_specific_governance:tier-policy:tier-4:payment-capture",
    ),
  );
});

test("required counterfactual-trust assessment blocks when missing", () => {
  const result = evaluateMoralTradeNonPublicGoodsTier({
    transition: "matched_trade_lock",
    checkedAt: CHECKED_AT,
    policies: [tierPolicy()],
    assessments: [],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "counterfactual_trust_assessment_missing:tier_1_money_only_donation_offset",
    ),
  );
});

test("self-offset classifications cannot publish public moral-trade metrics", () => {
  const result = evaluateMoralTradeNonPublicGoodsTier({
    transition: "public_metric_publication",
    checkedAt: CHECKED_AT,
    policies: [
      tierPolicy({
        approvedTransition: "public_metric_publication",
        policyId: "tier-policy:tier-1:public-metric",
      }),
    ],
    assessments: [
      trustAssessment({
        assessmentId: "counterfactual-trust:self-offset",
        counterfactualTrustClass: "self_offset_or_personal_bookkeeping",
        subjectRef: "donation-offset:self-bookkeeping-demo",
        subjectType: "donation_offset",
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "self_offset_excluded_from_moral_trade_metrics:counterfactual-trust:self-offset",
    ),
  );
});

test("non-public-goods tier enforce route is fail-closed before persistence on invalid input", async () => {
  const response = await enforceNonPublicGoodsTier(
    new Request("http://localhost/api/moral-trade/non-public-goods-tier/enforce", {
      body: "not-json",
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.nonPublicGoodsTierGateStatus, "blocked");
  assert.equal(body.draftPreviewAllowed, false);
  assert.equal(body.matchCandidatePreviewAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentAuthorizationAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.relianceBearingTransitionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.equal(body.persistence.status, "not_recorded");
  assert.equal(
    body.persistence.table,
    "moral_trade_non_public_goods_tier_enforcement_records",
  );
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("non-public-goods tier route, profiles, gates, schema, and migration are wired", () => {
  const route = readRepoFile(
    "src/app/api/moral-trade/non-public-goods-tier/contract/route.ts",
  );
  const enforceRoute = readRepoFile(
    "src/app/api/moral-trade/non-public-goods-tier/enforce/route.ts",
  );
  const apiContract = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiRateLimit = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operations = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile(
    "config/moral-trade/operations-profile.json",
  );
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_non_public_goods_tier_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const releaseGates = readRepoFile("src/lib/moral-trade/release-gates.ts");
  const hardFalseColumns = [
    "draft_preview_allowed_bool",
    "match_candidate_preview_allowed_bool",
    "matched_trade_lock_allowed_bool",
    "payment_authorization_allowed_bool",
    "payment_capture_allowed_bool",
    "reliance_bearing_transition_allowed_bool",
    "public_metric_publication_allowed_bool",
    "release_gate_promotion_allowed_bool",
  ];

  assert.match(route, /getMoralTradeNonPublicGoodsTierContract/);
  assert.match(route, /validateMoralTradeNonPublicGoodsTierContract/);
  assert.match(route, /sampleEvaluationStatuses/);
  assert.match(enforceRoute, /evaluateMoralTradeNonPublicGoodsTier/);
  assert.match(enforceRoute, /non_public_goods_tier_enforce/);
  assert.match(
    enforceRoute,
    /moral_trade_non_public_goods_tier_enforcement_records/,
  );
  assert.match(enforceRoute, /draftPreviewAllowed: false/);
  assert.match(enforceRoute, /matchCandidatePreviewAllowed: false/);
  assert.match(enforceRoute, /matchedTradeLockAllowed: false/);
  assert.match(enforceRoute, /paymentAuthorizationAllowed: false/);
  assert.match(enforceRoute, /paymentCaptureAllowed: false/);
  assert.match(enforceRoute, /publicMetricPublicationAllowed: false/);
  assert.match(enforceRoute, /releaseGatePromotionAllowed: false/);
  assert.match(enforceRoute, /relianceBearingTransitionAllowed: false/);
  assert.match(apiContract, /moral_trade_non_public_goods_tier_contract/);
  assert.match(apiContract, /moral_trade_non_public_goods_tier_enforce/);
  assert.match(apiRateLimit, /non_public_goods_tier_enforce/);
  assert.match(operations, /non_public_goods_tier_enforce/);
  assert.match(operationsProfile, /non_public_goods_tier_enforce/);
  assert.match(apiProfile, /non_public_goods_tier_contract_response/);
  assert.match(apiProfile, /non_public_goods_tier_enforce_request/);
  assert.match(apiProfile, /non_public_goods_tier_enforce_response/);
  assert.match(apiProfile, /non_public_goods_tier_enforce_route_contract/);
  assert.match(migration, /moral_trade_non_public_goods_tier_policies/);
  assert.match(migration, /moral_trade_counterfactual_trust_assessments/);
  assert.match(
    migration,
    /moral_trade_non_public_goods_tier_enforcement_records/,
  );
  assert.match(migration, /tier_4_open_market_pledge_swap_or_compensated_action/);
  assert.match(migration, /counterparty_mode <> 'autonomous_outreach'/);
  assert.match(schema, /moral_trade_non_public_goods_tier_policies/);
  assert.match(schema, /moral_trade_counterfactual_trust_assessments/);
  assert.match(schema, /moral_trade_non_public_goods_tier_enforcement_records/);
  assert.match(schema, /counterfactual_trust_class = 'self_offset_or_personal_bookkeeping'/);
  assert.match(databaseTypes, /moral_trade_non_public_goods_tier_policies/);
  assert.match(databaseTypes, /moral_trade_counterfactual_trust_assessments/);
  assert.match(
    databaseTypes,
    /moral_trade_non_public_goods_tier_enforcement_records/,
  );
  assert.match(releaseGates, /non_public_goods_tier_scope_test/);
  assert.match(releaseGates, /counterfactual_trust_class_test/);

  for (const column of hardFalseColumns) {
    assert.match(migration, new RegExp(`check \\(${column} = false\\)`));
    assert.match(schema, new RegExp(`check \\(${column} = false\\)`));
  }
});
