import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const loader = await readFile(
  new URL("../public/moral-trade-discover.html", import.meta.url),
  "utf8",
);
const preflight = await readFile(
  new URL("../public/moral-trade-discover-search-preflight.js", import.meta.url),
  "utf8",
);
const controller = await readFile(
  new URL("../public/moral-trade-discover-search.js", import.meta.url),
  "utf8",
);
const route = await readFile(
  new URL("../src/app/api/discover/search/route.ts", import.meta.url),
  "utf8",
);

test("Discover loads the filter snapshot preflight before the live search controller", () => {
  const preflightIndex = loader.indexOf(
    "/moral-trade-discover-search-preflight.js",
  );
  const controllerIndex = loader.indexOf("/moral-trade-discover-search.js");
  assert.notEqual(preflightIndex, -1);
  assert.notEqual(controllerIndex, -1);
  assert.ok(
    preflightIndex < controllerIndex,
    "preflight must wrap fetch and history before an initial URL query can run",
  );
  assert.equal(
    loader.includes("/moral-trade-smart-query.js"),
    false,
    "Discover must have one submission owner",
  );
});

test("the preflight snapshots filters into both the request and browser history", () => {
  assert.match(preflight, /manualFiltersFromDom\(payload\.manual\)/);
  assert.match(preflight, /augmentHistoryState/);
  assert.match(preflight, /augmentHistoryUrl/);
  assert.match(preflight, /maximumOfferAmountCents/);
  assert.match(preflight, /minimumReturnAmountCents/);
  assert.match(preflight, /causeFilter/);
  assert.match(preflight, /history\.pushState/);
  assert.match(preflight, /history\.replaceState/);
});

test("the controller performs live in-place search without navigation assignment", () => {
  assert.match(controller, /fetch\("\/api\/discover\/search"/);
  assert.match(controller, /AbortController/);
  assert.match(controller, /history\.pushState/);
  assert.match(controller, /ensureLiveListSurface/);
  assert.match(controller, /offerKind/);
  assert.equal(controller.includes("location.assign("), false);
});

test("live group-buying inventory is searched as Co-Fund Offers, not standalone Pools", () => {
  assert.match(route, /filterAndRankDiscoverCoFunds\(coFundSnapshot\.routes, plan\)/);
  assert.match(route, /const pools: DiscoverPoolSearchItem\[\] = \[\]/);
  assert.doesNotMatch(route, /filterAndRankDiscoverPools\([^)]*Snapshot\.routes/);
  assert.match(route, /offerKind: plan\.offerKind/);
});
