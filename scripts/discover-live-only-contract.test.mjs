import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const shell = read("public/moral-trade-discover.html");
const runtime = read("public/moral-trade-discover-search.js");
const route = read("src/app/api/discover/search/route.ts");

test("Discover is a single readable document, not a compressed prototype", () => {
  assert.match(shell, /<h1>Browse trades<\/h1>/);
  assert.match(shell, /moral-trade-discover-search\.js/);
  assert.match(shell, /moral-trade-discover\.css/);
  assert.doesNotMatch(shell, /document\.write|payload\/manifest|DecompressionStream|role="tab"/);
  for (const path of [
    "src/discover/moral-trade-discover.source.html", "public/discover/payload/manifest.json",
    "public/discover/payload/0.txt", "public/moral-trade-discover-local-time.js",
    "public/moral-trade-discover-navigation.js", "public/moral-trade-discover-value-hover.js",
    "public/moral-trade-discover-search-preflight.js", "public/moral-trade-discover-home-alignment.css",
    "scripts/pack-discover-payload.mjs",
  ]) assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), false, `${path} must remain retired`);
});

test("initial browsing and every change use one live endpoint and no seeded records", () => {
  assert.equal((runtime.match(/fetch\("\/api\/discover\/search"/g) || []).length, 1);
  assert.match(runtime, /executeSearch\("replace"\);\s*\}\)\(\);/);
  assert.match(runtime, /clearSearch[\s\S]*executeSearch\("replace"\)/);
  assert.doesNotMatch(runtime, /const (offers|pools|people|userPreferences|savedSearches)\s*=/);
  assert.doesNotMatch(runtime, /Mina Park|Alex Johnson|on.time verification|million|\$2\.1M|showToast|document\.write|\.innerHTML\s*=/);
  assert.doesNotMatch(runtime, /window\.fetch\s*=|history\.pushState\s*=|MutationObserver/);
});

test("production discovery never uses worked examples as available records", () => {
  assert.match(route, /listing\.status === "live"/);
  assert.match(route, /listing\.source === "live"/);
  assert.match(route, /!listing\.isWorkedExample/);
  assert.match(route, /coFundSnapshot\.sourceStatus === "live"/);
  assert.match(shell, /href="\/worked-examples"/);
  assert.match(shell, /illustrations, not available listings/);
});

test("Co-Funds remain trades; pools and fake financial operations are absent", () => {
  assert.match(shell, /<option value="co-fund">Co-Funds/);
  assert.doesNotMatch(shell, /role="tab"|threshold-canvas|constellation|trust-network|value-field|pledge/);
  assert.match(runtime, /data\.domain !== "offers"/);
  assert.match(runtime, /Counterparty provides/);
  assert.match(runtime, /You provide/);
  assert.match(runtime, /Review trade/);
  assert.doesNotMatch(runtime, /Accept & match|Conditional pledge reserved|Message composer opened/);
});

test("unavailable sources, stale requests and unsafe links fail closed", () => {
  assert.match(route, /discoverOffersAvailability/);
  assert.match(route, /needsPeople = plan\.domain === "people"/);
  assert.match(runtime, /availability === "partial"/);
  assert.match(runtime, /This is not a zero-result search/);
  assert.match(runtime, /requestNumber !== sequence/);
  assert.match(runtime, /controller\?\.abort/);
  assert.match(runtime, /cache: "no-store"/);
  assert.match(runtime, /credentials: "same-origin"/);
  assert.match(runtime, /trustedOrigins\.has\(url\.origin\)/);
  assert.match(runtime, /url\.username \|\| url\.password/);
  assert.match(runtime, /safeHref\(item\.href\)/);
  assert.match(runtime, /textContent = text/);
});
