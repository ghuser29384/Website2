import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

type Plan = {
  goal?: string;
  horizon?: string;
  budget?: number | string;
  time?: string;
  verification?: string;
};

type PlanApi = {
  availableBudget: number;
  buildRouteModel: (plan: Plan, now?: string, routeResources?: unknown) => {
    budgetHelp: string;
    cards: Array<{ meta: string; title: string }>;
    horizonHelp: string;
    itinerary: Array<{ meta: string; title: string }>;
    plan: Required<Plan>;
    summary: string[];
    title: string;
  };
  defaultPlan: () => Required<Plan>;
  normalizePlan: (plan: Plan) => Required<Plan>;
};

function loadPlanApi() {
  const resourceSource = readFileSync("public/moral-trade-live-route-resources.js", "utf8");
  const source = readFileSync("public/moral-trade-live-plan-reset.js", "utf8");
  const window: {
    __MT_PLAN_RESOURCES_API__?: PlanApi;
    __MT_ROUTE_RESOURCES_API__?: {
      defaultState: (now?: string) => Record<string, unknown>;
    };
  } = {};
  const context = { window };
  vm.runInNewContext(resourceSource, context);
  vm.runInNewContext(source, context);
  assert.ok(window.__MT_PLAN_RESOURCES_API__);
  assert.ok(window.__MT_ROUTE_RESOURCES_API__);
  return {
    plan: window.__MT_PLAN_RESOURCES_API__,
    resources: window.__MT_ROUTE_RESOURCES_API__,
  };
}

test("the live shell loads the complete Plan Resources enhancement", () => {
  const shell = readFileSync("public/moral-trade-live.html", "utf8");
  assert.match(shell, /moral-trade-live-plan-reset\.js/);
  assert.match(shell, /moral-trade-live-plan-resources\.css/);
});

test("Plan Resources defaults produce an actionable, budget-honest route", () => {
  const { plan: api } = loadPlanApi();
  const model = api.buildRouteModel(api.defaultPlan(), "2026-07-18T12:00:00");

  assert.equal(api.availableBudget, 120);
  assert.equal(model.title, "Reduce factory-farming harm this month.");
  assert.equal(model.horizonHelp, "by Jul 31, 2026");
  assert.match(model.budgetHelp, /counts until same-period baseline confirmation/);
  assert.equal(model.summary[0], "$80 action budget");
  assert.match(model.cards[0].meta, /\$20 counted until baseline confirmed/);
  assert.match(model.cards[1].title, /verified animal-welfare evidence review/);
  assert.match(model.itinerary[0].meta, /counted until baseline confirmed/);
});

test("every Plan Resources setting changes the generated route model", () => {
  const { plan: api } = loadPlanApi();
  const model = api.buildRouteModel(
    {
      goal: "bio",
      horizon: "week",
      budget: 30,
      time: "30m",
      verification: "maximum",
    },
    "2026-07-18T12:00:00",
  );

  assert.equal(model.title, "Strengthen biosecurity this week.");
  assert.equal(model.horizonHelp, "by Jul 24, 2026");
  assert.deepEqual(Array.from(model.summary), [
    "$30 action budget",
    "~30 minutes available",
    "Maximum verification",
  ]);
  assert.match(
    model.cards[1].title,
    /an independently reviewed biosecurity evidence review/,
  );
  assert.match(model.cards[1].meta, /\$30 · 15–20 min/);
  assert.match(model.itinerary[2].title, /biosecurity counterparty/);
});

test("invalid or excessive Plan Resources values normalize safely", () => {
  const { plan: api } = loadPlanApi();
  const normalized = JSON.parse(JSON.stringify(api.normalizePlan({
    goal: "unknown",
    horizon: "forever",
    budget: 900,
    time: "none",
    verification: "trust-me",
  })));
  assert.deepEqual(normalized, {
    goal: "factory",
    horizon: "month",
    budget: 120,
    time: "2h",
    verification: "high",
  });
});

test("a confirmed monthly baseline updates the shared Plan Resources route card", () => {
  const { plan, resources } = loadPlanApi();
  const resourceState = resources.defaultState("2026-07-18T12:00:00");
  const monthly = resourceState.periods as Record<string, {
    declaration: { status: string; amount: number };
  }>;
  monthly.month.declaration = { status: "all", amount: 20 };
  const model = plan.buildRouteModel(
    plan.defaultPlan(),
    "2026-07-18T12:00:00",
    resourceState,
  );

  assert.match(model.budgetHelp, /confirmed same-period donation principal excluded/);
  assert.match(model.cards[0].meta, /\$20 redirected · \$0 added money/);
  assert.match(model.itinerary[0].meta, /\$20 redirected · \$0 added money/);
});
