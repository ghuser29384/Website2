import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GET as getSubsidyContract } from "@/app/api/moral-trade/non-public-goods-subsidies/contract/route";
import { POST as enforceSubsidy } from "@/app/api/moral-trade/non-public-goods-subsidies/enforce/route";
import {
  evaluateMoralTradeNonPublicGoodsSubsidy,
  getMoralTradeNonPublicGoodsSubsidyContract,
  validateMoralTradeNonPublicGoodsSubsidyContract,
  type MoralTradeNonPublicGoodsSubsidyPoolRecord,
  type MoralTradeNonPublicGoodsSubsidyScheduleRecord,
} from "@/lib/moral-trade/non-public-goods-subsidies";

const HASH_A = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HASH_B = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const HASH_C = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const HASH_D = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const HASH_E = "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

function pool(
  overrides: Partial<MoralTradeNonPublicGoodsSubsidyPoolRecord> = {},
): MoralTradeNonPublicGoodsSubsidyPoolRecord {
  return {
    poolId: "subsidy-pool:test",
    sponsorIdHash: HASH_A,
    policySnapshotRef: "policy-snapshot:subsidy",
    policyStatus: "resolved_immutable",
    poolHash: HASH_B,
    appliesToTradeType: "donation_offset",
    appliesToTiers: ["tier_1_money_only_donation_offset"],
    totalBudgetCents: 200_000,
    settlementCurrency: "USD",
    sourceOfFundsReviewState: "non_blocking",
    sponsorConflictOfInterestState: "disclosed_nonblocking",
    allowedCauseBucketTaxonomyRefs: ["cause-taxonomy:v1"],
    allowedRecipientOrDestinationClasses: ["verified_public_charity"],
    eligibilityRuleHash: HASH_C,
    allocationScheduleHash: HASH_D,
    maxSubsidyPerParticipantCents: 5_000,
    maxSubsidyPerTradeCents: 10_000,
    maxSubsidyRatioBps: 2_500,
    publicDisclosureLevel: "source_bucket",
    refundOrCarryForwardPolicy: "carry_forward",
    poolState: "active",
    reviewerDecisionRef: "review-decision:subsidy-pool",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-09-01T00:00:00.000Z",
    supersededBy: null,
    sponsorIdentityPublic: false,
    privateSourceDetailsPublic: false,
    reviewerNotesPublic: false,
    ...overrides,
  };
}

function schedule(
  overrides: Partial<MoralTradeNonPublicGoodsSubsidyScheduleRecord> = {},
): MoralTradeNonPublicGoodsSubsidyScheduleRecord {
  return {
    scheduleId: "subsidy-schedule:test",
    poolRef: "subsidy-pool:test",
    matchingClearingRunRef: "matching-clearing-run:test",
    matchedTradeLockProposalRef: "matched-trade-lock:test",
    clearedTradeAgreementRef: null,
    subsidyType: "fee_offset",
    eligibilityInputHash: HASH_E,
    scheduleHash: HASH_D,
    subsidyAmountCents: 2_000,
    subsidyRatioBps: 1_000,
    capBinding: true,
    participantMoralTradeVolumeExclusion: true,
    directContributionExclusion: true,
    impactClaimExclusion: true,
    counterpartyDistinctnessExclusion: true,
    subsidyState: "reserved",
    reviewerDecisionRef: "review-decision:subsidy-schedule",
    createdAt: "2026-06-01T01:00:00.000Z",
    updatedAt: "2026-06-01T01:00:00.000Z",
    rawEligibilityInputPublic: false,
    participantSpecificSubsidyPublic: false,
    privateSponsorTermsPublic: false,
    ...overrides,
  };
}

test("non-public-goods subsidy contract validates first-class governed subsidy records", () => {
  const contract = getMoralTradeNonPublicGoodsSubsidyContract();
  const validation = validateMoralTradeNonPublicGoodsSubsidyContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_non_public_goods_subsidy_pools"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_subsidy_schedule_records"));
  assert.ok(contract.policySnapshotSubjects.includes("non_public_goods_subsidy"));
  assert.ok(contract.policySnapshotSubjects.includes("subsidy_schedule"));
  assert.deepEqual(contract.allowedLaunchTiers, ["tier_1_money_only_donation_offset"]);
  assert.ok(contract.tradeTypes.includes("donation_offset"));
  assert.ok(contract.tradeTypes.includes("pledge_swap"));
  assert.ok(contract.transitionDefinitions.some((transition) => transition.key === "matched_trade_lock"));
  assert.ok(contract.transitionDefinitions.some((transition) => transition.key === "public_metric_publication"));
  assert.ok(
    contract.sampleEvaluations.some(
      (evaluation) => evaluation.subsidyRequired && evaluation.status === "pass",
    ),
  );
  assert.match(contract.failClosedRule, /not participant moral-trade volume/i);
  assert.match(contract.metricExclusionRule, /direct counted contribution/i);
  assert.match(contract.privacyBoundary, /raw eligibility inputs/i);
});

test("governed tier-1 donation-offset subsidy can pass lock, payment, metric, and release gates", () => {
  const evaluation = evaluateMoralTradeNonPublicGoodsSubsidy({
    transition: "matched_trade_lock",
    subsidyRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    pools: [pool()],
    schedules: [schedule()],
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.activePoolCount, 1);
  assert.equal(evaluation.eligibleScheduleCount, 1);
  assert.equal(evaluation.frozenPolicyCount, 1);
  assert.equal(evaluation.capCheckedScheduleCount, 1);
  assert.equal(evaluation.metricExcludedScheduleCount, 1);
  assert.deepEqual(evaluation.blockers, []);
});

test("missing subsidy records fail closed when a subsidy is required", () => {
  const evaluation = evaluateMoralTradeNonPublicGoodsSubsidy({
    transition: "payment_capture",
    subsidyRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    pools: [],
    schedules: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("subsidy_pool_missing"));
  assert.ok(evaluation.blockers.includes("active_frozen_subsidy_pool_missing"));
  assert.ok(evaluation.blockers.includes("subsidy_schedule_record_missing"));
});

test("subsidy pool scope, source, conflict, disclosure, and caps fail closed", () => {
  const evaluation = evaluateMoralTradeNonPublicGoodsSubsidy({
    transition: "matched_trade_lock",
    subsidyRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    pools: [
      pool({
        policyStatus: "mutable",
        poolState: "paused",
        sourceOfFundsReviewState: "under_review",
        sponsorConflictOfInterestState: "blocked",
        appliesToTradeType: "pledge_swap",
        appliesToTiers: ["tier_3_closed_counterparty_pledge_swap"],
        maxSubsidyRatioBps: 12_000,
        publicDisclosureLevel: "undisclosed",
        refundOrCarryForwardPolicy: "manual_review",
      }),
    ],
    schedules: [schedule()],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("subsidy_policy_not_immutable:subsidy-pool:test:mutable"));
  assert.ok(evaluation.blockers.includes("subsidy_pool_not_active:subsidy-pool:test:paused"));
  assert.ok(
    evaluation.blockers.includes(
      "subsidy_source_of_funds_not_non_blocking:subsidy-pool:test:under_review",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "subsidy_conflict_review_not_non_blocking:subsidy-pool:test:blocked",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "subsidy_trade_type_not_low_risk_donation_offset:subsidy-pool:test:pledge_swap",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "subsidy_tier_scope_not_low_risk:subsidy-pool:test:tier_3_closed_counterparty_pledge_swap",
    ),
  );
  assert.ok(evaluation.blockers.includes("subsidy_caps_invalid:subsidy-pool:test"));
  assert.ok(
    evaluation.blockers.includes(
      "subsidy_public_disclosure_not_frozen:subsidy-pool:test:undisclosed",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "subsidy_refund_carry_forward_policy_manual_review:subsidy-pool:test",
    ),
  );
});

test("subsidy schedules fail closed on cap breach, missing metric exclusions, and private leakage", () => {
  const evaluation = evaluateMoralTradeNonPublicGoodsSubsidy({
    transition: "public_metric_publication",
    subsidyRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    pools: [pool()],
    schedules: [
      schedule({
        subsidyAmountCents: 20_000,
        subsidyRatioBps: 4_000,
        capBinding: false,
        participantMoralTradeVolumeExclusion: false,
        directContributionExclusion: false,
        impactClaimExclusion: false,
        counterpartyDistinctnessExclusion: false,
        rawEligibilityInputPublic: true,
        participantSpecificSubsidyPublic: true,
        privateSponsorTermsPublic: true,
      }),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("subsidy_amount_exceeds_cap:subsidy-schedule:test"));
  assert.ok(evaluation.blockers.includes("subsidy_ratio_exceeds_cap:subsidy-schedule:test"));
  assert.ok(evaluation.blockers.includes("subsidy_cap_check_missing:subsidy-schedule:test"));
  assert.ok(
    evaluation.blockers.includes(
      "subsidy_moral_trade_volume_exclusion_missing:subsidy-schedule:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "subsidy_direct_contribution_exclusion_missing:subsidy-schedule:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "subsidy_impact_claim_exclusion_missing:subsidy-schedule:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "subsidy_counterparty_distinctness_exclusion_missing:subsidy-schedule:test",
    ),
  );
  assert.ok(evaluation.blockers.includes("subsidy_raw_eligibility_input_public:subsidy-schedule:test"));
  assert.ok(
    evaluation.blockers.includes(
      "subsidy_participant_specific_subsidy_public:subsidy-schedule:test",
    ),
  );
  assert.ok(evaluation.blockers.includes("subsidy_private_sponsor_terms_public:subsidy-schedule:test"));
});

test("inactive subsidy stage passes only when no private subsidy details leak", () => {
  const clean = evaluateMoralTradeNonPublicGoodsSubsidy({
    transition: "subsidy_schedule_preview",
    subsidyRequired: false,
    checkedAt: "2026-06-12T00:00:00.000Z",
    pools: [],
    schedules: [],
  });
  const leaking = evaluateMoralTradeNonPublicGoodsSubsidy({
    transition: "subsidy_schedule_preview",
    subsidyRequired: false,
    checkedAt: "2026-06-12T00:00:00.000Z",
    pools: [pool({ privateSourceDetailsPublic: true })],
    schedules: [schedule({ privateSponsorTermsPublic: true })],
  });

  assert.equal(clean.status, "pass");
  assert.equal(leaking.status, "blocked");
  assert.ok(leaking.blockers.includes("subsidy_private_source_details_public:subsidy-pool:test"));
  assert.ok(leaking.blockers.includes("subsidy_private_sponsor_terms_public:subsidy-schedule:test"));
});

test("non-public-goods subsidy route exposes only public contract metadata", async () => {
  const response = await getSubsidyContract(
    new Request("http://localhost/api/moral-trade/non-public-goods-subsidies/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(body.publicContract.firstClassRecordTables.includes("moral_trade_subsidy_schedule_records"));
  assert.ok(body.publicContract.allowedLaunchTiers.includes("tier_1_money_only_donation_offset"));
  assert.match(body.publicContract.metricExclusionRule, /impact claims/i);
});

test("non-public-goods subsidy enforce route is fail-closed before persistence on invalid input", async () => {
  const response = await enforceSubsidy(
    new Request("http://localhost/api/moral-trade/non-public-goods-subsidies/enforce", {
      body: "not-json",
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.nonPublicGoodsSubsidyGateStatus, "blocked");
  assert.equal(body.subsidyPoolActivationAllowed, false);
  assert.equal(body.subsidySchedulePreviewAllowed, false);
  assert.equal(body.subsidyScheduleReservationAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentAuthorizationAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.subsidyRefundOrCarryForwardAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.equal(body.persistence.status, "not_recorded");
  assert.equal(
    body.persistence.table,
    "moral_trade_non_public_goods_subsidy_enforcement_records",
  );
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("non-public-goods subsidy contract is wired through route, health, spec, API profile, and schema", () => {
  const route = readFileSync(
    "src/app/api/moral-trade/non-public-goods-subsidies/contract/route.ts",
    "utf8",
  );
  const enforceRoute = readFileSync(
    "src/app/api/moral-trade/non-public-goods-subsidies/enforce/route.ts",
    "utf8",
  );
  const health = readFileSync("src/app/api/moral-trade/health/route.ts", "utf8");
  const spec = readFileSync("src/app/moral-trade/technical-spec/page.tsx", "utf8");
  const apiContract = readFileSync("src/lib/moral-trade/api-contract.ts", "utf8");
  const apiRateLimit = readFileSync("src/lib/moral-trade/api-rate-limit.ts", "utf8");
  const operations = readFileSync("src/lib/moral-trade/operations.ts", "utf8");
  const operationsProfile = readFileSync(
    "config/moral-trade/operations-profile.json",
    "utf8",
  );
  const apiProfile = readFileSync("config/moral-trade/api-contract-profile.json", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260612_moral_trade_non_public_goods_subsidy_records.sql",
    "utf8",
  );
  const schema = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");
  const forbiddenAllowColumns = [
    "subsidy_pool_activation_allowed_bool",
    "subsidy_schedule_preview_allowed_bool",
    "subsidy_schedule_reservation_allowed_bool",
    "matched_trade_lock_allowed_bool",
    "payment_authorization_allowed_bool",
    "payment_capture_allowed_bool",
    "public_metric_publication_allowed_bool",
    "release_gate_promotion_allowed_bool",
    "subsidy_refund_or_carry_forward_allowed_bool",
  ];

  assert.match(route, /getMoralTradeNonPublicGoodsSubsidyContract/);
  assert.match(enforceRoute, /non_public_goods_subsidy_enforce/);
  assert.match(
    enforceRoute,
    /moral_trade_non_public_goods_subsidy_enforcement_records/,
  );
  assert.match(
    enforceRoute,
    /authentication_required:non_public_goods_subsidy_enforce/,
  );
  assert.match(
    enforceRoute,
    /database_insert_failed:non_public_goods_subsidy_enforce/,
  );
  assert.match(enforceRoute, /subsidyPoolActivationAllowed: false/);
  assert.match(enforceRoute, /subsidySchedulePreviewAllowed: false/);
  assert.match(enforceRoute, /subsidyScheduleReservationAllowed: false/);
  assert.match(enforceRoute, /matchedTradeLockAllowed: false/);
  assert.match(enforceRoute, /paymentAuthorizationAllowed: false/);
  assert.match(enforceRoute, /paymentCaptureAllowed: false/);
  assert.match(enforceRoute, /publicMetricPublicationAllowed: false/);
  assert.match(enforceRoute, /releaseGatePromotionAllowed: false/);
  assert.match(enforceRoute, /subsidyRefundOrCarryForwardAllowed: false/);
  assert.match(health, /nonPublicGoodsSubsidyValidation/);
  assert.match(spec, /\/api\/moral-trade\/non-public-goods-subsidies\/contract/);
  assert.match(apiContract, /moral_trade_non_public_goods_subsidy_enforce/);
  assert.match(apiRateLimit, /non_public_goods_subsidy_enforce/);
  assert.match(operations, /non_public_goods_subsidy_enforce/);
  assert.match(operationsProfile, /non_public_goods_subsidy_enforce/);
  assert.match(apiProfile, /non_public_goods_subsidy_contract_response/);
  assert.match(apiProfile, /non_public_goods_subsidy_enforce_request/);
  assert.match(apiProfile, /non_public_goods_subsidy_enforce_response/);
  assert.match(apiProfile, /non_public_goods_subsidy_enforce_route_contract/);
  assert.match(apiProfile, /moral_trade_non_public_goods_subsidy_contract/);
  assert.match(apiProfile, /moral_trade_non_public_goods_subsidy_enforce/);
  assert.match(migration, /moral_trade_non_public_goods_subsidy_pools/);
  assert.match(migration, /moral_trade_subsidy_schedule_records/);
  assert.match(
    migration,
    /moral_trade_non_public_goods_subsidy_enforcement_records/,
  );
  assert.match(migration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(migration, /non_public_goods_subsidy/);
  assert.match(schema, /moral_trade_non_public_goods_subsidy_pools/);
  assert.match(schema, /moral_trade_subsidy_schedule_records/);
  assert.match(schema, /moral_trade_non_public_goods_subsidy_enforcement_records/);
  assert.match(databaseTypes, /moral_trade_non_public_goods_subsidy_pools/);
  assert.match(databaseTypes, /moral_trade_subsidy_schedule_records/);
  assert.match(
    databaseTypes,
    /moral_trade_non_public_goods_subsidy_enforcement_records/,
  );

  for (const column of forbiddenAllowColumns) {
    assert.match(migration, new RegExp(`check \\(${column} = false\\)`));
    assert.match(schema, new RegExp(`check \\(${column} = false\\)`));
  }
});
