import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { Script, runInNewContext } from "node:vm";

const core = readFileSync("public/moral-trade-live-core.txt", "utf8");
const loader = readFileSync("public/moral-trade-live.html", "utf8");
const script = core.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, "the readable core must contain its navigation renderer");

const retiredAssets = [
  "moral-trade-live-route-resources.js", "moral-trade-live-plan-reset.js",
  "moral-trade-live-plan-resources.css", "moral-trade-live-custom-route.js",
  "moral-trade-live-custom-route.css", "moral-trade-live-itinerary-editor.js",
  "moral-trade-live-itinerary-editor.css", "moral-trade-live-verification.js",
  "moral-trade-live-offer-structure.js", "moral-trade-live-offer-structure.css",
  "moral-trade-live-token-autocomplete.js",
];

test("the live payload is readable, integrity-checked, and has no hidden simulated operational views", () => {
  new Script(script);
  const digest = createHash("sha256").update(core).digest("hex");
  assert.ok(loader.includes(`digest !== '${digest}'`));
  assert.match(loader, /crypto\.subtle\.digest\('SHA-256', raw\)/);
  assert.match(loader, /throw new Error\('integrity'\)/);
  assert.doesNotMatch(loader, /DecompressionStream|stripLegacyNowFocus|retireLegacyTradeBuilder/);
  assert.doesNotMatch(core, /function (nowRules|activityPage|portfolioView|ledgerView|calendarView|outcomesView|dealroomView|exportCSV|allocationPlanner)\(/);
  assert.doesNotMatch(core, /Standing rules|Upcoming matches|Recent commands|All systems operational|Approval queue/);
  assert.doesNotMatch(core, /18,760|12,450|Mina Park|Priya Shah|Alex Johnson|Counter Mina/);
  assert.doesNotMatch(core, /Verification recorded|Counteroffer sent|Allocations confirmed|conditional pledge reserved/);
  assert.doesNotMatch(core, /96% on time|Connected and verified|Frontier Bio Ethics Council/);
});

test("obsolete executable bundles and planner/editor assets are deleted, not merely hidden", () => {
  assert.equal(readdirSync("public").some(name => /^mt-(live-0d0e0f03|verify-f01a8b07)-/.test(name)), false);
  for (const asset of retiredAssets) {
    assert.equal(existsSync(`public/${asset}`), false, asset);
    assert.equal(loader.includes(asset), false, asset);
  }
});

test("real feed, route planning, privacy, identity, and command handoffs stay wired", () => {
  for (const asset of ["moral-trade-live-now.js", "moral-trade-live-route-recommendations.js", "moral-trade-live-feed-identity.js", "moral-trade-live-feed-create.js", "moral-trade-live-account.js", "moral-trade-live-command-center.js", "moral-trade-input-assist.js"]) {
    assert.ok(existsSync(`public/${asset}`), asset);
    assert.ok(loader.includes(asset), asset);
  }
  assert.match(core, /data-mt-live-account-panel="true"/);
  assert.match(core, /data-mt-live-account-detail="true"/);
  assert.match(core, /href="\/dashboard">Manage account/);
  assert.doesNotMatch(core, />Sign out<|value="Offer \$80/);
  assert.match(core, /Nothing is published, agreed, or paid here/);
});

test("invalid retired tab state cannot invoke a simulator and legacy page state routes to real records", () => {
  const app = { innerHTML: "" };
  const overlay = { addEventListener() {}, classList: { add() {}, remove() {} } };
  const destinations: string[] = [];
  const location = { hash: "#now", replace: (url: string) => destinations.push(url), assign: (url: string) => destinations.push(url) };
  const context = {
    document: {
      querySelector: (selector: string) => selector === "#app" ? app : overlay,
      querySelectorAll: () => [], addEventListener() {},
    },
    window: { location }, location, addEventListener() {},
  };
  runInNewContext(script, context);
  runInNewContext("state.now = 'rules'; render();", context);
  assert.match(app.innerHTML, /data-mt-live-now-state="loading"/);
  assert.doesNotMatch(app.innerHTML, /Standing rules|approve|All systems operational/);
  runInNewContext("state.page = 'activity'; render();", context);
  runInNewContext("state.page = 'trade'; render();", context);
  assert.deepEqual(destinations, ["/commitments", "/trades/new"]);
});

test("verification retirement neither imports local signatures nor promotes invented record identifiers", () => {
  const retirement = readFileSync("public/complete-verification.html", "utf8");
  assert.match(retirement, /window\.location\.replace\('\/evidence'\)/);
  assert.match(retirement, /Its local results are not evidence/);
  assert.match(retirement, /href="\/commitments"/);
  assert.doesNotMatch(retirement, /localStorage|sessionStorage|fetch\(|URLSearchParams|signatures\s*:/);
  assert.ok(loader.indexOf("window.location.hash === '#activity'") < loader.indexOf("fetch('/moral-trade-live-core.txt')"));
  const router = readFileSync("public/moral-trade-live-create-router.js", "utf8");
  assert.doesNotMatch(router, /allowDealroomHashOnce/);
  assert.match(router, /window\.location\.assign\("\/commitments"\)/);
});
