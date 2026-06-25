import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKETPLACE_INTAKE_ROUTE_AWAY_KEYS,
  MARKETPLACE_INTAKE_TRIAGE_ROUTES,
  MARKETPLACE_LOCK_PATH_KEYS,
  validateMarketplaceIntakeTriageRoutes,
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
    "external_crecm_public_goods",
    "background_networking_request",
    "prohibited_or_unsupported",
  ]);
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
