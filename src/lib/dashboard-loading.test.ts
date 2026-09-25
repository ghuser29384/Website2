import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setImmediate } from "node:timers/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

import { DASHBOARD_LOAD_CONCURRENCY, runDashboardLoaders } from "./dashboard-loading";

test("dashboard workers overlap independent loads without exceeding their budget", async () => {
  let active = 0;
  let peak = 0;
  const visited: number[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const pending = runDashboardLoaders(Array.from({ length: 20 }, (_, index) => async () => {
    active += 1;
    peak = Math.max(peak, active);
    visited.push(index);
    await gate;
    active -= 1;
  }));
  await setImmediate();
  assert.equal(active, DASHBOARD_LOAD_CONCURRENCY);
  assert.equal(visited.length, DASHBOARD_LOAD_CONCURRENCY);
  release();
  await pending;
  assert.equal(peak, DASHBOARD_LOAD_CONCURRENCY);
  assert.equal(new Set(visited).size, 20);
  assert.equal(active, 0);
});

test("empty queues complete and a single worker preserves order", async () => {
  await runDashboardLoaders([]);
  const order: number[] = [];
  await runDashboardLoaders([1, 2, 3].map((value) => async () => {
    await setImmediate();
    order.push(value);
  }), 1);
  assert.deepEqual(order, [1, 2, 3]);
});

test("invalid concurrency is rejected instead of silently skipping work", async () => {
  for (const value of [0, -1, 1.5, NaN, Infinity]) {
    await assert.rejects(runDashboardLoaders([], value), RangeError);
  }
});

test("unexpected rejections drain the queue and remain visible to the caller", async () => {
  const failure = new Error("unexpected loader error");
  const completed: number[] = [];
  await assert.rejects(runDashboardLoaders([
    async () => { throw failure; },
    async () => { await setImmediate(); completed.push(1); },
    async () => { completed.push(2); },
  ], 1), (error) => error === failure);
  assert.deepEqual(completed, [1, 2]);
});

// Execute the actual getDashboardData function with isolated I/O mocks, rather
// than importing Next's server runtime or connecting tests to private records.
const dataSource = readFileSync("src/lib/app-data.ts", "utf8");
const parsed = ts.createSourceFile("app-data.ts", dataSource, ts.ScriptTarget.Latest, true);
const declaration = parsed.statements.find((node) =>
  ts.isFunctionDeclaration(node) && node.name?.text === "getDashboardData",
);
assert.ok(declaration, "getDashboardData must remain available");
const functionSource = declaration.getText(parsed);
const executable = ts.transpileModule(functionSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const sectionNames = [...functionSource.matchAll(/\bawait ((?:list|get)\w+ForUser|listCartItems)\(/g)]
  .map((match) => match[1]);

interface DashboardResult {
  cartItems: Array<{ id: string }>;
  wishProfile: unknown;
  wishNotifications: unknown[];
  collectivePolicies: Array<{ id: string }>;
  errors: Record<string, string | null>;
}

function harness(options: {
  configured?: boolean;
  load?: (name: string, args: unknown[]) => Promise<unknown>;
} = {}) {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  let clients = 0;
  const query = {
    select() { return this; },
    eq() { return this; },
    order() { return this; },
    limit() { return Promise.resolve({ data: [], error: null }); },
  };
  const exports: { getDashboardData?: (id: string) => Promise<DashboardResult> } = {};
  const context: Record<string, unknown> = {
    exports,
    Error,
    console: { error() {} },
    DASHBOARD_PAGE_SIZE: 50,
    hasSupabaseEnv: () => options.configured !== false,
    createClient: async () => { clients += 1; return { from: () => query }; },
    runDashboardLoaders,
    logSupabaseError() {},
  };
  for (const name of sectionNames) {
    context[name] = async (...args: unknown[]) => {
      calls.push({ name, args });
      if (options.load) return options.load(name, args);
      return name.startsWith("get") ? null : [];
    };
  }
  vm.runInNewContext(executable, context, { timeout: 1000 });
  assert.ok(exports.getDashboardData);
  return { load: exports.getDashboardData, calls, clientCount: () => clients };
}

test("unconfigured dashboard starts no queries", async () => {
  const fixture = harness({ configured: false });
  const result = await fixture.load("user-a");
  assert.equal(fixture.clientCount(), 0);
  assert.equal(fixture.calls.length, 0);
  assert.equal(result.cartItems.length, 0);
  assert.equal(result.errors.cartItems, null);
});

test("the real dashboard loader schedules all 42 sections with bounded overlap", async () => {
  assert.equal(sectionNames.length, 42);
  let active = 0;
  let peak = 0;
  const fixture = harness({ load: async (name) => {
    active += 1;
    peak = Math.max(peak, active);
    await setImmediate();
    active -= 1;
    return name.startsWith("get") ? null : [];
  } });
  await fixture.load("user-a");
  assert.equal(fixture.calls.length, 42);
  assert.equal(new Set(fixture.calls.map(({ name }) => name)).size, 42);
  assert.equal(peak, DASHBOARD_LOAD_CONCURRENCY);
  assert.equal(active, 0);
});

test("notifications and collective policies wait for their actual dependencies", async () => {
  const finished = new Set<string>();
  const fixture = harness({ load: async (name, args) => {
    await setImmediate();
    if (name === "listMatchSuggestionsForUser") {
      finished.add(name);
      return [{ id: "match-a" }];
    }
    if (name === "listCollectivesForUser") {
      finished.add(name);
      return [{ id: "owned" }];
    }
    if (name === "listCollectiveMembershipsForUser") {
      finished.add(name);
      return [{ collective_id: "member" }, { collective_id: "owned" }];
    }
    if (name === "listWishNotificationsForUser") {
      assert.ok(finished.has("listMatchSuggestionsForUser"));
      assert.equal(JSON.stringify(args), JSON.stringify(["user-a", [{ id: "match-a" }]]));
    }
    if (name === "listBackgroundCollectivePoliciesForUser") {
      assert.ok(finished.has("listCollectivesForUser"));
      assert.ok(finished.has("listCollectiveMembershipsForUser"));
      assert.equal(JSON.stringify(args), JSON.stringify([["owned", "member"]]));
    }
    return name.startsWith("get") ? null : [];
  } });
  const result = await fixture.load("user-a");
  assert.ok(Object.values(result.errors).every((error) => error === null), JSON.stringify(result.errors));
});

test("one unavailable section keeps its error without discarding other sections", async () => {
  const fixture = harness({ load: async (name) => {
    if (name === "getWishProfileForUser") throw new Error("wish profile unavailable");
    if (name === "listCartItems") return [{ id: "saved-a" }];
    return name.startsWith("get") ? null : [];
  } });
  const result = await fixture.load("user-a");
  assert.equal(result.wishProfile, null);
  assert.equal(result.errors.wishProfile, "wish profile unavailable");
  assert.equal(result.cartItems[0].id, "saved-a");
  assert.equal(result.errors.cartItems, null);
  assert.equal(fixture.calls.length, 42);
});

test("failed dependency reads still allow notifications and membership-owned policies", async () => {
  const fixture = harness({ load: async (name, args) => {
    if (name === "listMatchSuggestionsForUser" || name === "listCollectivesForUser") {
      throw new Error("dependency unavailable");
    }
    if (name === "listCollectiveMembershipsForUser") return [{ collective_id: "member" }];
    if (name === "listWishNotificationsForUser") {
      assert.equal(JSON.stringify(args[1]), "[]");
      return [{ id: "notification-a", match: null }];
    }
    if (name === "listBackgroundCollectivePoliciesForUser") {
      assert.equal(JSON.stringify(args[0]), '["member"]');
      return [{ id: "policy-a" }];
    }
    return name.startsWith("get") ? null : [];
  } });
  const result = await fixture.load("user-a");
  assert.equal(result.errors.matchSuggestions, "dependency unavailable");
  assert.equal(result.errors.collectives, "dependency unavailable");
  assert.equal(result.wishNotifications.length, 1);
  assert.equal(result.collectivePolicies[0].id, "policy-a");
});

test("concurrent requests do not share private results or queues", async () => {
  const fixture = harness({ load: async (name, args) => {
    await setImmediate();
    if (name === "listCartItems") return [{ id: `saved-${args[0]}` }];
    return name.startsWith("get") ? null : [];
  } });
  const [first, second] = await Promise.all([fixture.load("user-a"), fixture.load("user-b")]);
  assert.equal(first.cartItems[0].id, "saved-user-a");
  assert.equal(second.cartItems[0].id, "saved-user-b");
  assert.notEqual(first.errors, second.errors);
  assert.equal(fixture.calls.length, 84);
});

test("page data loads stay after authentication and no longer form a waterfall", () => {
  const source = readFileSync("src/app/dashboard/page.tsx", "utf8");
  const authentication = source.indexOf('await requireViewer("/dashboard")');
  const parallel = source.indexOf("const [dashboardData, accountSecuritySummary, priorityFundSummary] = await Promise.all([");
  assert.ok(authentication >= 0 && parallel > authentication);
  assert.match(source.slice(parallel, parallel + 550), /viewer \? getDashboardData\(viewer\.authUser\.id\) : null/);
  assert.match(source.slice(parallel, parallel + 550), /viewer \? loadBackgroundAccountSecuritySummary\(\) : null/);
  assert.match(source.slice(parallel, parallel + 550), /viewer && supabaseReady && process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
});

test("route loading state is static, accessible, and contains no private placeholders", () => {
  const source = readFileSync("src/app/dashboard/loading.tsx", "utf8");
  assert.match(source, /role="status"/);
  assert.match(source, /aria-busy="true"/);
  assert.doesNotMatch(source, /getDashboardData|requireViewer|createClient|useEffect/);
});
