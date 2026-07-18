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
  buildRouteModel: (plan: Plan, now?: string) => {
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
  const source = readFileSync("public/moral-trade-live-plan-reset.js", "utf8");
  const window: { __MT_PLAN_RESOURCES_API__?: PlanApi } = {};
  vm.runInNewContext(source, { window });
  assert.ok(window.__MT_PLAN_RESOURCES_API__);
  return window.__MT_PLAN_RESOURCES_API__;
}

test("the live shell loads the complete Plan Resources enhancement", () => {
  const shell = readFileSync("public/moral-trade-live.html", "utf8");
  assert.match(shell, /moral-trade-live-plan-reset\.js/);
  assert.match(shell, /moral-trade-live-plan-resources\.css/);
});

test("Plan Resources defaults produce an actionable, budget-honest route", () => {
  const api = loadPlanApi();
  const model = api.buildRouteModel(api.defaultPlan(), "2026-07-18T12:00:00");

  assert.equal(api.availableBudget, 120);
  assert.equal(model.title, "Reduce factory-farming harm this month.");
  assert.equal(model.horizonHelp, "by Jul 31, 2026");
  assert.match(model.budgetHelp, /planned-donation redirects excluded/);
  assert.equal(model.summary[0], "$80 action budget");
  assert.match(model.cards[0].meta, /Outside action budget/);
  assert.match(model.cards[1].title, /verified animal-welfare evidence review/);
  assert.match(model.itinerary[0].meta, /Outside action budget/);
});

test("every Plan Resources setting changes the generated route model", () => {
  const api = loadPlanApi();
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
  const api = loadPlanApi();
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
