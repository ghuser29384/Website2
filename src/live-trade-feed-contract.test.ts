import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

const loader = readFileSync("public/moral-trade-live.html", "utf8");
const tradeBridge = readFileSync("public/moral-trade-live-trade-feed.js", "utf8");
const tradeStyles = readFileSync("public/moral-trade-live-trade-feed.css", "utf8");
const requesterIdentity = readFileSync("public/moral-trade-requester-identity.js", "utf8");
const paretoRoute = readFileSync("src/app/api/live-now-a1/route.ts", "utf8");
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

  const loadingSidebar =
    '<aside class="stack" data-mt-live-trade-feed="loading" aria-label="Personalized Trade feed"><section class="panel matchcard"><div class="eyebrow">Personalized matches</div><h3>Loading your Feed…</h3><p style="font-size:10px">No generic or demo records are shown.</p></section></aside></div>`;\n}';
  return `${source.slice(0, sidebarStart)}${loadingSidebar}${source.slice(
    sidebarEnd + sidebarEndMarker.length,
  )}`;
}

const demoRecords = [
  "Alex R.",
  "Sam G. → Riley P.",
  "Replaced 10 car trips",
  "1 pending counteroffer",
  "Today, 9:18 AM",
];

function escaped(value: string) {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

test("the delivered Trade builder removes the screenshot demo sidebar before first render", () => {
  assert.match(loader, /stripLegacyTradeSidebar/);
  assert.match(loader, /data-mt-live-trade-feed="loading"/);
  assert.match(loader, /stripLegacyTradeSidebar\(\s*stripLegacyNowFocus/);
  assert.match(loader, /moral-trade-live-trade-feed\.css/);
  assert.match(loader, /moral-trade-live-trade-feed\.js/);

  const deliveredSource = stripLegacyTradeSidebar(legacySource);
  for (const demoRecord of demoRecords) {
    assert.match(legacySource, escaped(demoRecord));
    assert.doesNotMatch(deliveredSource, escaped(demoRecord));
  }
  assert.match(deliveredSource, /data-mt-live-trade-feed="loading"/);
});

test("Trade reads the one authenticated Feed snapshot and never creates a second exposure", () => {
  assert.equal(
    loader.match(/fetch\('\/api\/live-now'/g)?.length,
    1,
    "the static shell must fetch the authoritative Feed snapshot exactly once",
  );
  assert.match(loader, /window\.__MT_LIVE_NOW_BOOTSTRAP__/);
  assert.match(tradeBridge, /window\.__MT_LIVE_NOW_BOOTSTRAP__/);
  assert.doesNotMatch(tradeBridge, /\bfetch\s*\(/);
  assert.match(paretoRoute, /applyParetoLearningToLiveNowPayload/);
  assert.match(paretoRuntime, /recommendation_exposures/);
  assert.match(paretoRuntime, /opportunity_id:\s*recommendation\.id/);
  assert.match(paretoRuntime, /exposureRequestId:\s*requestId/);
});

test("Trade and Feed DOM nodes preserve exact Feed item and receipt identity", () => {
  for (const attribute of [
    "data-feed-item-id",
    "data-feed-item-key",
    "data-opportunity-id",
    "data-opportunity-type",
    "data-exposure-request-id",
  ]) {
    assert.match(tradeBridge, new RegExp(attribute));
  }
  assert.match(tradeBridge, /feedItemKey: `\$\{opportunityType\}:\$\{id\}`/);
  assert.match(tradeBridge, /exposureRequestId\s*=\s*text\(value\.exposureRequestId, 160\)/);
  assert.match(tradeBridge, /!ALLOWED_TYPES\.has\(opportunityType\)/);
  assert.match(tradeBridge, /\.mt-feed-card\[data-opportunity-id\]\[data-opportunity-type\]/);
  assert.match(tradeBridge, /card\.setAttribute\("data-exposure-request-id"/);
  assert.match(requesterIdentity, /function isBackedFeedIdentityNode/);
  assert.match(
    requesterIdentity,
    /\[data-mt-live-trade-feed\], \[data-feed-item-id\], \.mt-feed-card\[data-opportunity-id\]/,
  );
  assert.match(requesterIdentity, /!isBackedFeedIdentityNode\(node\)/);
});

test("malformed, signed-out, incomplete, unavailable, and zero-data states fail closed", () => {
  assert.match(tradeBridge, /rawRecommendations\.length > 0 && recommendations\.length === 0/);
  assert.match(tradeBridge, /status = "unavailable"/);
  assert.match(tradeBridge, /status = "no_matches"/);
  assert.match(tradeBridge, /No generic or demo records are substituted/);
  assert.match(tradeBridge, /No filler suggestions were added/);
  assert.match(tradeBridge, /No generic or fabricated match, completed trade, or counteroffer is shown/);
  assert.match(tradeBridge, /model\.recommendations\.slice\(0, 3\)/);

  for (const demoRecord of [...demoRecords, "Completed Jun 29, 2026"]) {
    assert.doesNotMatch(tradeBridge, new RegExp(escaped(demoRecord).source, "i"));
  }
});

test("the responsive Trade surface stays within narrow mobile bounds", () => {
  assert.match(tradeStyles, /grid-template-columns:\s*repeat\(auto-fit, minmax\(220px, 1fr\)\)/);
  assert.match(tradeStyles, /grid-template-columns:\s*repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(tradeStyles, /\.compose-grid[\s\S]*overflow-x:\s*clip/);
  assert.match(tradeStyles, /\.sentence \.token[\s\S]*white-space:\s*normal/);
  assert.match(tradeStyles, /overflow-wrap:\s*anywhere/);
});
