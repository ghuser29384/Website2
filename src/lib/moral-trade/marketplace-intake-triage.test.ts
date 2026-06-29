import assert from "node:assert/strict";
import test from "node:test";

import { GET as marketplaceIntakeTriageContractRoute } from "@/app/api/moral-trade/marketplace-intake-triage/contract/route";

import {
  evaluateMarketplaceIntakeTriageRecord,
  getMarketplaceIntakeTriageContract,
  MARKETPLACE_INTAKE_ROUTE_AWAY_KEYS,
  MARKETPLACE_INTAKE_TRIAGE_ROUTES,
  MARKETPLACE_LOCK_PATH_KEYS,
  validateMarketplaceIntakeTriageContract,
  validateMarketplaceIntakeTriageRoutes,
  type MarketplaceIntakeTriageRecord,
} from "./marketplace-intake-triage";

test("marketplace intake triage validates the full route family", () => {
  const validation = validateMarketplaceIntakeTriageRoutes();

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.equal(MARKETPLACE_INTAKE_TRIAGE_ROUTES.length, 9);
});

test("marketplace intake triage only admits non-public-goods lock-path templates", () => {
  const routesByKey = new Map(MARKETPLACE_INTAKE_TRIAGE_ROUTES.map((route) => [route.key, route]));

  for (const key of MARKETPLACE_LOCK_PATH_KEYS) {
    const route = routesByKey.get(key);

    assert.ok(route, key);
    assert.equal(route.routeEligible, true, key);
    assert.equal(route.routeKind, "non_public_goods_marketplace_preview", key);
    assert.match(route.href, /^\/offers\/new/, key);
  }

  for (const key of MARKETPLACE_INTAKE_ROUTE_AWAY_KEYS) {
    const route = routesByKey.get(key);

    assert.ok(route, key);
    assert.equal(route.routeEligible, false, key);
    assert.notEqual(route.href.startsWith("/offers/new"), true, key);
    assert.match(route.nextAction, /\S/, key);
    assert.match(route.correctionPath, /review|Return|Request|appeal|correction/i, key);
  }
});

test("marketplace intake triage covers all required safe route-away categories", () => {
  assert.deepEqual([...MARKETPLACE_INTAKE_ROUTE_AWAY_KEYS], [
    "ordinary_donation",
    "ordinary_matching_or_cofunding",
    "ordinary_procurement_or_service",
    "self_offset_bookkeeping",
    "public_goods_module",
    "background_networking_request",
    "prohibited_or_unsupported",
  ]);
});

test("marketplace intake triage routes public-goods intent to the current product label", () => {
  const publicGoodsRoute = MARKETPLACE_INTAKE_TRIAGE_ROUTES.find(
    (route) => route.key === "public_goods_module",
  );

  assert.ok(publicGoodsRoute);
  assert.equal(publicGoodsRoute.label, "Common Ground Budget public-goods module");
  assert.equal(publicGoodsRoute.href, "/mpgf");
  assert.match(publicGoodsRoute.summary, /moralpublicgoods131\.md/);
  assert.match(publicGoodsRoute.summary, /CRECM v1\.125/);
  assert.match(publicGoodsRoute.summary, /Public Goods Fund module/);
  assert.equal(publicGoodsRoute.summary.includes("Verified Assurance Matching"), false);
  assert.equal(publicGoodsRoute.summary.includes("external CRECM module"), false);
});

test("marketplace intake triage blocks missing, eligible, and profile-inference regressions", () => {
  const invalid = validateMarketplaceIntakeTriageRoutes(
    MARKETPLACE_INTAKE_TRIAGE_ROUTES.map((route) =>
      route.key === "ordinary_donation"
        ? {
            ...route,
            correctionPath: "",
            href: "/offers/new?mode=offset",
            routeEligible: true,
            summary: "Infer willingness to pay from ideology before showing templates.",
          }
        : route,
    ).filter((route) => route.key !== "background_networking_request"),
  );

  assert.equal(invalid.status, "fail");
  assert.ok(invalid.blockers.includes("missing_route:background_networking_request"));
  assert.ok(invalid.blockers.includes("correction_path_missing:ordinary_donation"));
  assert.ok(invalid.blockers.includes("route_away_marked_eligible:ordinary_donation"));
  assert.ok(invalid.blockers.includes("route_away_points_to_lock_path:ordinary_donation"));
  assert.ok(invalid.blockers.includes("triage_infers_private_moral_profile:ordinary_donation"));
});

test("marketplace intake triage contract validates first-class record coverage", () => {
  const contract = getMarketplaceIntakeTriageContract();
  const validation = validateMarketplaceIntakeTriageContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_marketplace_intake_triage_records",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_marketplace_intake_triage_correction_records",
    ),
  );
  assert.ok(contract.initialRoutes.includes("ordinary_donation_or_matching"));
  assert.ok(contract.initialRoutes.includes("public_goods_candidate"));
  assert.ok(contract.initialRoutes.includes("unclear_manual_review"));
  assert.ok(contract.routeAwayInitialRoutes.includes("background_networking_request"));
  assert.ok(contract.inferenceProhibitions.includes("ideology_inference_prohibited"));
  assert.ok(
    contract.inferenceProhibitions.includes("willingness_to_pay_inference_prohibited"),
  );
  assert.ok(
    contract.inferenceProhibitions.includes("private_moral_theory_inference_prohibited"),
  );
  assert.ok(contract.sampleEvaluations.every((evaluation) => evaluation.status === "pass"));
});

test("marketplace intake triage records fail closed on private inference and route mismatches", () => {
  const sample = getMarketplaceIntakeTriageContract().sampleRecords[0] as
    | MarketplaceIntakeTriageRecord
    | undefined;

  assert.ok(sample);
  assert.equal(evaluateMarketplaceIntakeTriageRecord(sample).status, "pass");

  const invalid: MarketplaceIntakeTriageRecord = {
    ...sample,
    participantIdHash: "participant-123",
    userStatedGoalHash: "",
    routeReasonCodes: [],
    initialRoute: "ordinary_donation_or_matching",
    moralTradeCandidate: true,
    publicGoodsOrCrecMBoundary: true,
    willingnessToPayInferenceProhibited: false,
    createdAt: "not-a-date",
  };
  const result = evaluateMarketplaceIntakeTriageRecord(invalid);

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("participant_id_hash_required"));
  assert.ok(result.blockers.includes("user_stated_goal_hash_required"));
  assert.ok(result.blockers.includes("route_reason_codes_required"));
  assert.ok(result.blockers.includes("triage_record_timestamp_invalid"));
  assert.ok(result.blockers.includes("willingness_to_pay_inference_not_prohibited"));
  assert.ok(
    result.blockers.includes(
      "moral_trade_candidate_mismatch:ordinary_donation_or_matching",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "public_goods_boundary_mismatch:ordinary_donation_or_matching",
    ),
  );
});

test("marketplace intake triage contract route exposes safe public contract", async () => {
  const response = await marketplaceIntakeTriageContractRoute(
    new Request("http://localhost/api/moral-trade/marketplace-intake-triage/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(
    body.publicContract.firstClassRecordTables.includes(
      "moral_trade_marketplace_intake_triage_records",
    ),
  );
  assert.ok(body.publicContract.initialRoutes.includes("prohibited_or_unsupported"));
  assert.ok(
    body.publicContract.inferenceProhibitions.includes(
      "private_moral_theory_inference_prohibited",
    ),
  );
  assert.equal(
    body.publicContract.sampleEvaluationStatuses[
      "marketplace-intake-triage:sample:donation-offset"
    ].status,
    "pass",
  );
});
