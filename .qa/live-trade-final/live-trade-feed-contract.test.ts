import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

const loader = readFileSync("public/moral-trade-live.html", "utf8");
const tradeBridge = readFileSync("public/moral-trade-live-trade-feed.js", "utf8");
const feedBridge = readFileSync("public/moral-trade-live-now.js", "utf8");
const paretoRoute = readFileSync("src/app/api/live-now-a1/route.ts", "utf8");
const responseBuilder = readFileSync("src/lib/live-now-a1-response.ts", "utf8");
const paretoRuntime = readFileSync("src/lib/pareto-feed-runtime.ts", "utf8");

const legacyChunkNames = [
  "0a",
  "0b",
  "0c",
  "0d",
  "1",
  "2",
  "3",
  "4a",
  "4b",
  "4c",
  "4d",
  "5a",
  "5b",
  "5c",
  "5d",
];
const legacySource = gunzipSync(
  Buffer.from(
    legacyChunkNames
      .map((name) => readFileSync(`public/mt-live-0d0e0f03-${name}.txt`, "utf8"))
      .join(""),
    "base64",
  ),
).toString("utf8");

function stripLegacyTradeSidebar(source: string) {
  const clauseStart = source.indexOf("function clauseBuilder(){");
  const exchangeStart = source.indexOf("\nfunction exchangeBuilder(){", clauseStart);
  const sidebarStartMarker =
    '<aside class="stack"><section class="panel matchcard"><div class="between"><div class="eyebrow">Potential matches</div>';
  const sidebarStart = source.indexOf(sidebarStartMarker, clauseStart);
  const sidebarEndMarker = "</aside></div>`;\n}";
  const sidebarEnd = source.indexOf(sidebarEndMarker, sidebarStart);

  assert.ok(clauseStart >= 0, "legacy clauseBuilder must remain identifiable");
  assert.ok(exchangeStart > clauseStart, "legacy exchangeBuilder boundary must remain identifiable");
  assert.ok(
    sidebarStart > clauseStart && sidebarStart < exchangeStart,
    "legacy demo sidebar must remain inside clauseBuilder",
  );
  assert.ok(
    sidebarEnd > sidebarStart && sidebarEnd < exchangeStart,
    "legacy demo sidebar end must remain identifiable",
  );

  const loadingSidebar = `<aside class="stack" data-mt-live-trade-feed="loading" aria-label="Personalized Trade feed"><section class="panel matchcard"><div class="eyebrow">Personalized matches</div><h3>Loading your Feed…</h3><p style="font-size:10px">No generic or demo records are shown.</p></section></aside></div>\`;\n}`;
  return `${source.slice(0, sidebarStart)}${loadingSidebar}${source.slice(
    sidebarEnd + sidebarEndMarker.length,
  )}`;
}

test("the static Trade builder removes legacy demo records before its first render", () => {
  assert.match(loader, /stripLegacyTradeSidebar/);
  assert.match(loader, /data-mt-live-trade-feed="loading"/);
  assert.match(loader, /stripLegacyTradeSidebar\(\s*stripLegacyNowFocus/);
  assert.match(loader, /moral-trade-live-trade-feed\.css/);
  assert.match(loader, /moral-trade-live-trade-feed\.js/);

  const deliveredSource = stripLegacyTradeSidebar(legacySource);
  for (const demoRecord of [
    "Alex R.",
    "Sam G. → Riley P.",
    "Replaced 10 car trips",
    "1 pending counteroffer",
    "Today, 9:18 AM",
  ]) {
    assert.match(legacySource, new RegExp(demoRecord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(
      deliveredSource,
      new RegExp(demoRecord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
  assert.match(deliveredSource, /data-mt-live-trade-feed="loading"/);
});

test("Trade and Feed share the authenticated A1 response and exposure mechanism", () => {
  assert.match(loader, /fetch\('\/api\/live-now'/);
  assert.match(loader, /window\.__MT_LIVE_NOW_BOOTSTRAP__/);
  assert.match(paretoRoute, /getLiveNowA1Response/);
  assert.match(responseBuilder, /getReciprocalLiveNow/);
  assert.match(responseBuilder, /applyParetoLearningToLiveNowPayload/);
  assert.match(paretoRuntime, /recommendation_exposures/);
  assert.match(paretoRuntime, /opportunity_id:\s*recommendation\.id/);
  assert.match(paretoRuntime, /exposureRequestId:\s*requestId/);
});

test("both rendered surfaces preserve exact Feed item and receipt identity", () => {
  for (const attribute of [
    "data-feed-item-id",
    "data-feed-item-key",
    "data-opportunity-id",
    "data-opportunity-type",
    "data-exposure-request-id",
  ]) {
    assert.match(feedBridge, new RegExp(attribute));
    assert.match(tradeBridge, new RegExp(attribute));
  }
  assert.match(tradeBridge, /feedItemKey: `\$\{opportunityType\}:\$\{id\}`/);
  assert.match(tradeBridge, /exposureRequestId:\s*text\(value\.exposureRequestId, 160\)/);
});

test("the Trade bridge fails closed and contains no screenshot demo records", () => {
  assert.match(tradeBridge, /No generic or demo records are substituted/);
  assert.match(tradeBridge, /No filler suggestions were added/);
  assert.match(tradeBridge, /recommendations\.length === 0/);
  assert.match(tradeBridge, /slice\(0, 3\)/);

  for (const demoRecord of [
    "Alex R.",
    "Sam G.",
    "Riley P.",
    "Replaced 10 car trips",
    "Today, 9:18 AM",
  ]) {
    assert.doesNotMatch(
      tradeBridge,
      new RegExp(demoRecord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    );
  }
});

test("causal assignment occurs before any surface exposure limit", () => {
  const assignmentIndex = paretoRuntime.indexOf("const assignment = assignNonDirectHoldout");
  const limitIndex = paretoRuntime.indexOf("const normalizedExposureLimit");

  assert.ok(assignmentIndex >= 0, "the assignment call must remain present");
  assert.ok(limitIndex > assignmentIndex, "full-feed assignment must precede surface limiting");
  assert.match(paretoRuntime, /availableFeedOpportunityCount:\s*fullyDisplayed\.length/);
  assert.match(paretoRuntime, /recordAssignmentAndExposures\(\{[\s\S]*displayed,[\s\S]*heldOut,/);
});
