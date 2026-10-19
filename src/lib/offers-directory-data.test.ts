import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createElement, type ReactElement, type ReactNode } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { JsxEmit, ModuleKind, ScriptTarget, transpileModule } from "typescript";

import * as directoryData from "./offers-directory-data";
import * as offerLabels from "./offers";
import * as ranking from "./smart-discovery-ranking";
import * as smartQuery from "./smart-query";
import * as facets from "./smart-query-facets";
import * as records from "./smart-query-records";
import * as scoring from "./smart-query-scoring";
import type { Database } from "./supabase/database.types";

type Offer = Database["public"]["Tables"]["offers"]["Row"];
type Row = Record<string, unknown>;
type Sort = "best_match" | "newest" | "lowest_cost" | "most_verified" | "soonest_deadline" | "highest_credit";
type Params = Record<string, string | undefined>;
interface Result {
  items: directoryData.DirectoryOffer[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  error: string | null;
  candidateLimitReached: boolean;
}
interface Input {
  facets: smartQuery.SmartQueryFacets;
  interpretation: smartQuery.SmartQueryInterpretation;
  mode: "all" | Offer["mode"];
  page: number;
  personalPriorities: string[];
  smartSearch: boolean;
  sort: Sort;
}

const NOW = "2026-10-16T12:00:00Z";
class FixedDate extends Date {
  constructor(value: string | number = NOW) { super(value); }
}
const css = { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
const link = { __esModule: true, default: ({ prefetch: _prefetch, ...props }: { prefetch?: boolean }) => createElement("a", props) };

function compile(path: string, dependencies: Record<string, unknown>, suffix = "") {
  const { outputText } = transpileModule(readFileSync(path, "utf8") + suffix, {
    fileName: path,
    compilerOptions: { esModuleInterop: true, jsx: JsxEmit.ReactJSX, module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  });
  const mod = { exports: {} };
  // No live server/auth modules are imported; every runtime dependency is explicit.
  new Function("require", "module", "exports", "Date", "console", outputText)((name: string) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, mod, mod.exports, FixedDate, { error() {} });
  return mod.exports;
}

function fixture(index: number): Offer {
  return {
    id: `offer-${String(index).padStart(4, "0")}`, owner_id: `owner-${index % 4}`,
    owner_alias: index % 8 === 0 ? "" : `Participant ${index % 4}`,
    mode: (["pledge", "offset", "payment"] as const)[index % 3],
    offered_cause: index % 2 ? "Animal welfare" : "Global health",
    requested_cause: "Climate", compromise_cause: "Education",
    offer_action: `O${index % 3} — Volunteer review`, request_action: `Review a proposal for $${10 + index % 20}`,
    verification: index % 2 ? "Provide a dated public receipt and independent review" : "",
    duration: `By 2026-11-${String(1 + index % 20).padStart(2, "0")}`,
    notes: `Exact additional terms ${index}; preserve this unique text.`, discount_note: "Exact bounded terms",
    trust_level: index % 5, created_at: `2026-10-${String(1 + index % 10).padStart(2, "0")}T00:00:00Z`,
    status: "open", updated_at: NOW, offer_impact: 10, min_counterparty_impact: 2,
    payment_interval_value: 1, payment_interval_unit: "month",
  };
}
const offers = [...Array.from({ length: 72 }, (_, i) => fixture(i)), { ...fixture(72), status: "closed" as const }];

function harness(options: { fullRows?: boolean; rows?: Offer[]; fail?: string; configured?: boolean; viewerId?: string; scorer?: typeof scoring } = {}) {
  const requests: Array<{ table: string; params: URLSearchParams; prefer: string }> = [];
  let responseBytes = 0;
  // Exercise the installed Supabase query builder, with all HTTP handled in memory.
  const client = createClient<Database>("https://offline-fixture.invalid", "synthetic-key", {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://offline-fixture.invalid");
      assert.equal(init?.method, "GET", "No remote requests or writes are permitted");
      const table = url.pathname.split("/").at(-1)!;
      const params = url.searchParams;
      const prefer = new Headers(init?.headers).get("prefer") ?? "";
      requests.push({ table, params, prefer });
      if (options.fail === table) return new Response(JSON.stringify({ code: "TEST", message: "Synthetic unavailable" }), { status: 400 });
      let data: Row[];
      if (table === "offers") data = options.rows ?? offers;
      else if (table === "route_recommendation_profiles") data = [{ profile_id: options.viewerId, cause_priorities: ["animal_welfare"] }];
      else throw new Error(`Unexpected read: ${table}`);
      for (const [key, value] of params) {
        if (value.startsWith("eq.")) data = data.filter((row) => String(row[key]) === value.slice(3));
        if (value.startsWith("in.(")) {
          const ids = value.slice(4, -1).split(",");
          data = data.filter((row) => ids.includes(String(row[key])));
        }
      }
      const order = params.get("order");
      if (order) data = [...data].sort((a, b) => {
        for (const term of order.split(",")) {
          const [key, direction] = term.split(".");
          const diff = String(a[key]).localeCompare(String(b[key]));
          if (diff) return direction === "desc" ? -diff : diff;
        }
        return 0;
      });
      const total = data.length;
      const offset = Number(params.get("offset") ?? 0);
      data = data.slice(offset, offset + Number(params.get("limit") ?? total));
      const columns = params.get("select") ?? "*";
      if (columns !== "*" && !(options.fullRows && table === "offers")) data = data.map((row) => Object.fromEntries(columns.split(",").map((key) => {
        assert.ok(Object.hasOwn(row, key), `Unknown selected field: ${key}`);
        return [key, row[key]];
      })));
      const body = JSON.stringify(table === "route_recommendation_profiles" ? data[0] ?? null : data);
      responseBytes += Buffer.byteLength(body);
      return new Response(body, { headers: { "content-type": "application/json", "content-range": `0-${Math.max(0, data.length - 1)}/${total}` } });
    } },
  });
  // An optional separately saved deployed source provides exact-base differential proof.
  const subjectPath = options.fullRows && process.env.LEGACY_BASELINE_PAGE
    ? process.env.LEGACY_BASELINE_PAGE : "src/app/offers/page.tsx";
  const subject = compile(subjectPath, {
    "react/jsx-runtime": jsxRuntime, "next/link": link,
    "next/navigation": { redirect: () => { throw new Error("Unexpected redirect"); } },
    "@/components/layout/site-footer": { SiteFooter: () => null },
    "@/components/layout/site-topbar": { SiteTopbar: () => null },
    "@/components/search/smart-query-form": { SmartQueryForm: ({ children }: { children: ReactNode }) => createElement("form", null, children) },
    "@/components/trade-templates/trade-template-library": { TradeTemplateLibrary: () => null },
    "@/lib/app-data": { OFFERS_PAGE_SIZE: 24, getViewer: async () => options.viewerId ? { authUser: { id: options.viewerId } } : null },
    "@/lib/form-state": { getFormMessage: () => null },
    "@/lib/offers-directory-data": directoryData,
    "@/lib/offers": offerLabels,
    "@/lib/seo": { getAbsoluteUrl: (path: string) => `https://offline-fixture.invalid${path}` },
    "@/lib/site": { getPrimaryNavLinks: () => [], getTopbarActions: () => [] },
    "@/lib/smart-discovery-ranking": ranking, "@/lib/smart-query": smartQuery,
    "@/lib/smart-query-facets": facets, "@/lib/smart-query-records": records, "@/lib/smart-query-scoring": options.scorer ?? scoring,
    "@/lib/supabase/config": { hasSupabaseEnv: () => options.configured !== false },
    "@/lib/supabase/server": { createClient: async () => client }, "@/components/discovery/discovery-filters.module.css": css,
  }, "\nexport { listLiveOffers };\n") as {
    listLiveOffers: (input: Input) => Promise<Result>;
    default: (props: { searchParams: Promise<Params> }) => Promise<ReactElement>;
  };
  return { ...subject, requests, responseBytes: () => responseBytes };
}

function input(overrides: Partial<Input> = {}): Input {
  const interpretation = smartQuery.parseSmartQuery("volunteer", { surface: "offers" });
  return { facets: interpretation.facets, interpretation, mode: "all", page: 1, personalPriorities: [], smartSearch: true, sort: "best_match", ...overrides };
}
function comparable(result: Result) {
  return { ...result, items: result.items.map((row) => Object.fromEntries(directoryData.SMART_OFFER_COLUMNS.split(",").map((key) => [key, row[key as keyof typeof row]]))) };
}

test("smart search projects fields through the real SDK without changing filters, order or the candidate cap", async () => {
  const h = harness();
  const result = await h.listLiveOffers(input({ mode: "pledge" }));
  assert.equal(h.requests.length, 1);
  assert.deepEqual(Object.fromEntries(h.requests[0].params), {
    select: directoryData.SMART_OFFER_COLUMNS, status: "eq.open", mode: "eq.pledge",
    order: "created_at.desc,id.asc", limit: "2000",
  });
  assert.equal(h.requests[0].prefer, "");
  assert.ok(result.items.length > 0);
  assert.ok(result.items.every((row) => row.mode === "pledge" && !("updated_at" in row)));
});

test("all sorts, modes, personal ranking, constraints and pagination match full-row results", async () => {
  const projected = harness();
  const full = harness({ fullRows: true });
  const sorts: Sort[] = ["best_match", "newest", "lowest_cost", "most_verified", "soonest_deadline", "highest_credit"];
  const inputs = sorts.flatMap((sort) => [1, 2, 4].map((page) => input({ sort, page, personalPriorities: ["animal_welfare"] })));
  inputs.push(...(["pledge", "offset", "payment"] as const).map((mode) => input({ mode })));
  for (const constraint of [
    { maxAmountCents: 5000 }, { minAmountCents: 1000 }, { minCredit: 50 },
    { deadlineBefore: "2026-11-10" }, { verified: true }, { location: "Boston" },
    { causes: ["animal_welfare"] }, { actionTypes: ["offset"] as smartQuery.SmartQueryActionType[] },
  ]) inputs.push(input({ facets: { ...input().facets, ...constraint } }));
  for (const params of inputs) {
    assert.deepEqual(comparable(await projected.listLiveOffers(params)), comparable(await full.listLiveOffers(params)));
  }
  assert.ok(projected.responseBytes() < full.responseBytes());
});

test("rendered cards, exact terms, navigation, filters and pagination match the deployed page", async () => {
  const sorts: Sort[] = ["best_match", "newest", "lowest_cost", "most_verified", "soonest_deadline", "highest_credit"];
  for (const viewerId of [undefined, "owner-3"]) {
    const projected = harness({ viewerId });
    const full = harness({ viewerId, fullRows: true });
    const cases: Params[] = sorts.flatMap((sort) => ["1", "2", "4"].map((page) => ({ search: "volunteer", page, sort })));
    cases.push({ view: "templates" }, { tab: "templates" }, { page: "2", mode: "offset" }, { search: "nothing matches xyz" });
    for (const searchParams of cases) {
      const html = renderToStaticMarkup(await projected.default({ searchParams: Promise.resolve(searchParams) }));
      assert.equal(html, renderToStaticMarkup(await full.default({ searchParams: Promise.resolve(searchParams) })));
      if (searchParams.search === "volunteer" && searchParams.page === "1") {
        assert.match(html, /Exact bounded terms/);
        assert.match(html, /Open proposal/);
        assert.match(html, /Live proposal pages/);
        assert.match(html, /href="\/offers\/offer-/);
      }
    }
  }
});

test("ordinary browsing retains its full-row query and exact database count", async () => {
  const h = harness();
  const result = await h.listLiveOffers(input({ smartSearch: false, page: 2, mode: "offset" }));
  assert.deepEqual(Object.fromEntries(h.requests[0].params), {
    select: "*", status: "eq.open", mode: "eq.offset", order: "created_at.desc,id.asc", offset: "24", limit: "24",
  });
  assert.equal(h.requests[0].prefer, "count=exact");
  assert.equal(result.total, 24);
  assert.equal(result.hasPreviousPage, true);
  assert.equal(result.hasNextPage, false);
});

test("candidate-limit, empty, unconfigured and failed reads preserve their distinct states", async () => {
  const bounded = harness({ rows: Array.from({ length: 2001 }, (_, i) => fixture(i)) });
  const result = await bounded.listLiveOffers(input());
  assert.equal(result.candidateLimitReached, true);
  assert.equal(result.total, 2000);
  assert.equal(result.items.length, 24);
  assert.equal(result.hasNextPage, true);
  const empty = await harness({ rows: [] }).listLiveOffers(input());
  assert.equal(empty.error, null);
  assert.equal(empty.total, 0);
  const off = harness({ configured: false });
  assert.deepEqual(await off.listLiveOffers(input()), empty);
  assert.equal(off.requests.length, 0);
  for (const fail of ["offers"]) {
    const params = input({ sort: "lowest_cost" });
    const projected = await harness({ fail }).listLiveOffers(params);
    assert.deepEqual(projected, await harness({ fail, fullRows: true }).listLiveOffers(params));
    assert.ok(projected.error);
    assert.equal(projected.items.length, 0);
  }
});

test("smart search still matches notes and exact action terms that cards do not display", async () => {
  const interpretation = smartQuery.parseSmartQuery("unique additional terms", { surface: "offers" });
  const params = input({ interpretation, facets: interpretation.facets });
  const projected = await harness().listLiveOffers(params);
  const original = await harness({ fullRows: true }).listLiveOffers(params);
  assert.deepEqual(comparable(projected), comparable(original));
  assert.ok(projected.total > 0);
});

test("search scoring preserves exact-base results and rendered HTML for every sort and mode", {
  skip: process.env.SEARCH_SCORER_BASELINE ? false : "Set SEARCH_SCORER_BASELINE to the unmodified deployed scorer for differential validation",
}, async () => {
  const baseline = compile(process.env.SEARCH_SCORER_BASELINE!, { "./smart-query": smartQuery }) as typeof scoring;
  const sorts: Sort[] = ["best_match", "newest", "lowest_cost", "most_verified", "soonest_deadline", "highest_credit"];
  const queries = ["volunter", "volunteering", "verified animal welfare under $50", "unmatchedxyz"];
  let cases = 0;
  for (const viewerId of [undefined, "owner-3"]) {
    const before = harness({ scorer: baseline, viewerId });
    const after = harness({ viewerId });
    for (const sort of sorts) for (const mode of ["all", "pledge", "offset", "payment"] as const) for (const page of [1, 2]) {
      const search = queries[cases % queries.length];
      const interpretation = smartQuery.parseSmartQuery(search, { surface: "offers", now: NOW });
      const params = input({ interpretation, facets: interpretation.facets, sort, mode, page, personalPriorities: viewerId ? ["animal_welfare"] : [] });
      assert.deepEqual(await after.listLiveOffers(params), await before.listLiveOffers(params));
      const searchParams = Promise.resolve({ search, sort, mode, page: String(page) });
      assert.equal(renderToStaticMarkup(await after.default({ searchParams })), renderToStaticMarkup(await before.default({ searchParams })));
      cases++;
    }
    assert.deepEqual(after.requests.map((r) => ({ table: r.table, params: r.params.toString(), prefer: r.prefer })), before.requests.map((r) => ({ table: r.table, params: r.params.toString(), prefer: r.prefer })));
  }
  assert.equal(cases, 96);
});
