import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

type Period = "week" | "month";
type DeclarationStatus = "unconfirmed" | "all" | "part" | "none";

type RouteResourceState = {
  version: number;
  activePeriod: Period;
  periods: Record<Period, {
    periodKey: string;
    limits: { money: number; minutes: number; actions: number };
    declaration: { status: DeclarationStatus; amount: number };
    topUp: number;
    fee: number;
    selectedIds: string[];
  }>;
};

type RouteItem = {
  id: string;
  redirectPrincipal?: number;
  cost: number;
  minutes: number;
  actions: number;
};

type RouteResourceApi = {
  periodKey: (period: Period, now?: string) => string;
  defaultState: (now?: string) => RouteResourceState;
  normalizeState: (value: unknown, now?: string) => RouteResourceState;
  buildRouteTotals: (items: RouteItem[], state: RouteResourceState, now?: string) => {
    period: Period;
    periodKey: string;
    added: { money: number; minutes: number; actions: number };
    cashOutlay: number;
    plannedDonation: number;
    baselineFlow: { declared: number; excluded: number; unused: number; unmatched: number };
    redirect: {
      confirmed: boolean;
      redirectPrincipal: number;
      confirmedBaseline: number;
      unmatchedPrincipal: number;
      topUp: number;
      fee: number;
      totalRedirected: number;
      addedMoney: number;
      moneyLabel: string;
    };
    over: { money: boolean; minutes: boolean; actions: boolean };
  };
  getSnapshot: () => RouteResourceState;
  updatePeriod: (
    period: Period,
    patch: Partial<RouteResourceState["periods"][Period]>,
  ) => RouteResourceState;
};

const now = "2026-07-21T12:00:00";
const redirect: RouteItem = {
  id: "redirect",
  redirectPrincipal: 20,
  cost: 0,
  minutes: 5,
  actions: 1,
};
const review: RouteItem = { id: "review", cost: 20, minutes: 45, actions: 1 };

function loadApi() {
  const source = readFileSync("public/moral-trade-live-route-resources.js", "utf8");
  const window: { __MT_ROUTE_RESOURCES_API__?: RouteResourceApi } = {};
  vm.runInNewContext(source, { window });
  assert.ok(window.__MT_ROUTE_RESOURCES_API__);
  return window.__MT_ROUTE_RESOURCES_API__;
}

function withDeclaration(
  api: RouteResourceApi,
  period: Period,
  status: DeclarationStatus,
  amount: number,
) {
  const state = api.defaultState(now);
  state.activePeriod = period;
  state.periods[period].declaration = { status, amount };
  return state;
}

test("the live loader installs the Resource Mix workbench after the shared accounting model", () => {
  const loader = readFileSync("public/moral-trade-live.html", "utf8");
  const modelIndex = loader.indexOf("moral-trade-live-route-resources.js");
  const planIndex = loader.indexOf("moral-trade-live-plan-reset.js");
  const workbenchIndex = loader.indexOf("moral-trade-live-custom-route.js");

  assert.ok(modelIndex >= 0);
  assert.ok(planIndex > modelIndex);
  assert.ok(workbenchIndex > planIndex);
  assert.match(loader, /moral-trade-live-custom-route\.css/);
});

test("private baseline drafts do not persist across page or account sessions", () => {
  const source = readFileSync("public/moral-trade-live-route-resources.js", "utf8");
  assert.doesNotMatch(source, /localStorage/);

  const firstSession = loadApi();
  firstSession.updatePeriod("month", {
    declaration: { status: "all", amount: 20 },
    topUp: 5,
  });
  assert.equal(firstSession.getSnapshot().periods.month.declaration.status, "all");

  const nextSession = loadApi().getSnapshot();
  assert.equal(nextSession.periods.month.declaration.status, "unconfirmed");
  assert.equal(nextSession.periods.month.declaration.amount, 0);
  assert.equal(nextSession.periods.month.topUp, 0);
});

test("an unconfirmed redirect counts its full principal conservatively", () => {
  const api = loadApi();
  const state = withDeclaration(api, "month", "unconfirmed", 0);
  const result = api.buildRouteTotals([redirect], state, now);

  assert.equal(result.added.money, 20);
  assert.equal(result.plannedDonation, 0);
  assert.equal(result.redirect.confirmed, false);
  assert.match(result.redirect.moneyLabel, /\$20 counted until baseline confirmed/);
});

test("All, Part, and None declarations exclude only confirmed same-period principal", () => {
  const api = loadApi();
  const all = api.buildRouteTotals([redirect], withDeclaration(api, "month", "all", 20), now);
  const part = api.buildRouteTotals([redirect], withDeclaration(api, "month", "part", 8), now);
  const none = api.buildRouteTotals([redirect], withDeclaration(api, "month", "none", 0), now);

  assert.equal(all.added.money, 0);
  assert.equal(all.plannedDonation, 20);
  assert.equal(all.redirect.moneyLabel, "$20 redirected · $0 added money");
  assert.equal(part.baselineFlow.excluded, 8);
  assert.equal(part.baselineFlow.unmatched, 12);
  assert.equal(part.added.money, 12);
  assert.equal(none.baselineFlow.excluded, 0);
  assert.equal(none.added.money, 20);
});

test("top-ups and fees remain added money after a full baseline declaration", () => {
  const api = loadApi();
  const state = withDeclaration(api, "month", "all", 20);
  state.periods.month.topUp = 5;
  state.periods.month.fee = 0.75;
  const result = api.buildRouteTotals([redirect], state, now);

  assert.equal(result.redirect.totalRedirected, 25);
  assert.equal(result.redirect.addedMoney, 5.75);
  assert.equal(result.added.money, 5.75);
  assert.equal(result.cashOutlay, 25.75);
  assert.equal(result.cashOutlay, result.baselineFlow.excluded + result.added.money);
});

test("redirect setup time and the extra route action always consume added-resource limits", () => {
  const api = loadApi();
  const result = api.buildRouteTotals(
    [redirect],
    withDeclaration(api, "month", "all", 20),
    now,
  );

  assert.equal(result.added.money, 0);
  assert.equal(result.added.minutes, 5);
  assert.equal(result.added.actions, 1);
});

test("week and month declarations and limits stay independent", () => {
  const api = loadApi();
  const state = api.defaultState(now);
  state.periods.week.declaration = { status: "all", amount: 20 };
  state.periods.month.declaration = { status: "none", amount: 0 };
  state.periods.week.limits.money = 10;
  state.periods.month.limits.money = 80;

  state.activePeriod = "week";
  const week = api.buildRouteTotals([redirect], state, now);
  state.activePeriod = "month";
  const month = api.buildRouteTotals([redirect], state, now);

  assert.equal(week.added.money, 0);
  assert.equal(week.over.money, false);
  assert.equal(month.added.money, 20);
  assert.equal(month.over.money, false);
});

test("a declaration never leaks into a later concrete week or month", () => {
  const api = loadApi();
  const state = withDeclaration(api, "month", "all", 20);
  const later = api.normalizeState(state, "2026-08-03T12:00:00");

  assert.equal(api.periodKey("month", now), "month:2026-07");
  assert.equal(api.periodKey("month", "2026-08-03T12:00:00"), "month:2026-08");
  assert.equal(later.periods.month.declaration.status, "unconfirmed");
  assert.equal(later.periods.month.declaration.amount, 0);
});

test("one aggregate baseline cap is applied once across multiple redirects", () => {
  const api = loadApi();
  const state = withDeclaration(api, "month", "part", 25);
  const result = api.buildRouteTotals(
    [
      { ...redirect, id: "redirect-a", redirectPrincipal: 20 },
      { ...redirect, id: "redirect-b", redirectPrincipal: 30 },
    ],
    state,
    now,
  );

  assert.equal(result.redirect.redirectPrincipal, 50);
  assert.equal(result.baselineFlow.excluded, 25);
  assert.equal(result.added.money, 25);
});

test("an All declaration is a numeric snapshot and cannot absorb later principal growth", () => {
  const api = loadApi();
  const state = withDeclaration(api, "month", "all", 20);
  const result = api.buildRouteTotals(
    [{ ...redirect, redirectPrincipal: 30 }],
    state,
    now,
  );

  assert.equal(result.baselineFlow.excluded, 20);
  assert.equal(result.baselineFlow.unmatched, 10);
  assert.equal(result.added.money, 10);
});

test("a donation baseline never reduces non-redirect spending", () => {
  const api = loadApi();
  const result = api.buildRouteTotals(
    [redirect, review],
    withDeclaration(api, "month", "all", 20),
    now,
  );

  assert.equal(result.added.money, 20);
  assert.equal(result.cashOutlay, 40);
  assert.equal(result.added.minutes, 50);
  assert.equal(result.added.actions, 2);
});

test("limits are inclusive and malformed declarations fail closed", () => {
  const api = loadApi();
  const equal = withDeclaration(api, "month", "none", 0);
  equal.periods.month.limits = { money: 20, minutes: 5, actions: 1 };
  const atLimit = api.buildRouteTotals([redirect], equal, now);
  assert.deepEqual({ ...atLimit.over }, { money: false, minutes: false, actions: false });

  equal.periods.month.limits.money = 19;
  const above = api.buildRouteTotals([redirect], equal, now);
  assert.equal(above.over.money, true);

  const malformed = api.defaultState(now);
  malformed.periods.month.declaration = {
    status: "invented" as DeclarationStatus,
    amount: Number.POSITIVE_INFINITY,
  };
  const normalized = api.normalizeState(malformed, now);
  assert.equal(normalized.periods.month.declaration.status, "unconfirmed");
  assert.equal(normalized.periods.month.declaration.amount, 0);
});
