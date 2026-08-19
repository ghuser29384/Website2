import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

const proxySource = readFileSync("src/proxy.ts", "utf8");
const rootPageSource = readFileSync("src/app/page.tsx", "utf8");
const liveLoader = readFileSync("public/moral-trade-live.html", "utf8");
const createRouter = readFileSync("public/moral-trade-live-create-router.js", "utf8");
const feedIdentity = readFileSync("public/moral-trade-live-feed-identity.js", "utf8");
const liveBundleNames = [
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
const legacyLiveSource = gunzipSync(
  Buffer.from(
    liveBundleNames
      .map((name) => readFileSync(`public/mt-live-0d0e0f03-${name}.txt`, "utf8"))
      .join(""),
    "base64",
  ),
).toString("utf8");

function tradeBuilderSource(source: string) {
  const startMarker = "function clauseBuilder(){";
  const endMarker = "\nfunction exchangeBuilder(){";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0, "missing legacy Trade builder start marker");
  assert.ok(end > start, "missing legacy Trade builder end marker");
  return { end, source: source.slice(start, end), start };
}

function retireLegacyTradeBuilderForContract(source: string) {
  const builder = tradeBuilderSource(source);
  return `${source.slice(0, builder.start)}function clauseBuilder(){
 return '<div data-mt-legacy-trade-builder="retired">Trade creation has moved.</div>';
}${source.slice(builder.end)}`;
}

function escapePattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("the root route delegates landing decisions to account activation state", () => {
  assert.doesNotMatch(proxySource, /function rewriteToLiveHome/);
  assert.doesNotMatch(proxySource, /if \(pathname === "\/"\)/);
  assert.match(rootPageSource, /getAccountLandingPath/);
  assert.match(rootPageSource, /authenticated: Boolean\(viewer\)/);
  assert.match(rootPageSource, /redirect\([\s\S]*getAccountLandingPath/);
});

test("the live Trade entry opens the durable Create adapter without retaining a second builder", () => {
  assert.match(liveLoader, /window\.location\.hash === '#trade'/);
  assert.match(liveLoader, /window\.location\.replace\('\/trades\/new'\)/);
  assert.match(liveLoader, /retireLegacyTradeBuilder/);
  assert.match(liveLoader, /Trade creation has moved\./);
  assert.match(liveLoader, /moral-trade-live-create-router\.js/);
  assert.match(createRouter, /const CREATE_HREF = "\/trades\/new"/);
  assert.match(createRouter, /\[data-page="trade"\]/);
  assert.match(createRouter, /\[data-action="create"\]/);
  assert.match(createRouter, /window\.location\.assign\(CREATE_HREF\)/);
  assert.doesNotMatch(liveLoader, /moral-trade-live-trade-feed\.(?:js|css)/);
  assert.doesNotMatch(liveLoader, /stripLegacyTradeSidebar|data-mt-live-trade-feed/);
});

test("the delivered executable strips every legacy demo record from the retired Trade builder", () => {
  const originalBuilder = tradeBuilderSource(legacyLiveSource).source;
  const deliveredSource = retireLegacyTradeBuilderForContract(legacyLiveSource);
  const retiredBuilder = tradeBuilderSource(deliveredSource).source;
  const records = [
    "Alex R.",
    "Sam G.",
    "Riley P.",
    "Sam G. → Riley P.",
    "Replaced 10 car trips",
    "1 pending counteroffer",
    "Today, 9:18 AM",
    "$75",
    "92%",
  ];

  assert.match(retiredBuilder, /data-mt-legacy-trade-builder="retired"/);
  for (const record of records) {
    const pattern = new RegExp(escapePattern(record));
    assert.match(originalBuilder, pattern, `fixture no longer contains ${record}`);
    assert.doesNotMatch(retiredBuilder, pattern, `retired builder retained ${record}`);
  }
});

test("the authoritative Feed renderer retains item and exposure identity without another request", () => {
  assert.match(liveLoader, /moral-trade-live-now\.js/);
  assert.match(liveLoader, /moral-trade-live-feed-identity\.js/);
  assert.match(feedIdentity, /window\.__MT_LIVE_NOW_BOOTSTRAP__/);
  assert.match(feedIdentity, /data-feed-item-id/);
  assert.match(feedIdentity, /data-feed-item-key/);
  assert.match(feedIdentity, /data-exposure-request-id/);
  assert.match(feedIdentity, /\.mt-feed-card\[data-opportunity-id\]\[data-opportunity-type\]/);
  assert.doesNotMatch(feedIdentity, /\bfetch\s*\(/);
  assert.doesNotMatch(feedIdentity, /#trade|data-mt-live-trade-feed/);
});

test("Create and Create Offer entries share the durable Create adapter", () => {
  assert.match(
    proxySource,
    /function rewriteToUnifiedCreate[\s\S]*createUrl\.pathname = "\/trades\/new"/,
  );
  assert.match(
    proxySource,
    /if \(pathname === "\/create"\)[\s\S]*mode"\) === "back"[\s\S]*return rewriteToUnifiedCreate\(request\)/,
  );
  assert.match(
    proxySource,
    /searchParams\.get\("view"\) === "templates"[\s\S]*searchParams\.get\("tab"\) === "templates"[\s\S]*return rewriteToUnifiedCreate\(request\)/,
  );
  assert.match(
    proxySource,
    /matcher: \["\/walkthrough", "\/create", "\/offers", "\/offers\/:path\*"\]/,
  );
});
