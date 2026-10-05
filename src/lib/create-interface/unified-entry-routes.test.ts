import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const proxySource = readFileSync("src/proxy.ts", "utf8");
const liveLoader = readFileSync("public/moral-trade-live.html", "utf8");
const createRouter = readFileSync("public/moral-trade-live-create-router.js", "utf8");
const feedIdentity = readFileSync("public/moral-trade-live-feed-identity.js", "utf8");
const liveCore = readFileSync("public/moral-trade-live-core.txt", "utf8");

test("the root route remains the Moral Trade Feed and home page", () => {
  assert.match(
    proxySource,
    /function rewriteToLiveHome[\s\S]*liveUrl\.pathname = "\/moral-trade-live\.html"/,
  );
  assert.match(proxySource, /if \(pathname === "\/"\)[\s\S]*return rewriteToLiveHome\(request\)/);
});

test("the live Trade entry opens the durable Create adapter without retaining a second builder", () => {
  assert.match(liveLoader, /window\.location\.hash === '#trade'/);
  assert.match(liveLoader, /window\.location\.replace\('\/trades\/new'\)/);
  assert.match(liveLoader, /moral-trade-live-core\.txt/);
  assert.doesNotMatch(liveCore, /function clauseBuilder|function exchangeBuilder/);
  assert.match(liveLoader, /moral-trade-live-create-router\.js/);
  assert.match(createRouter, /const CREATE_HREF = "\/trades\/new"/);
  assert.match(createRouter, /\[data-page="trade"\]/);
  assert.match(createRouter, /\[data-action="create"\]/);
  assert.match(createRouter, /window\.location\.assign\(CREATE_HREF\)/);

  assert.doesNotMatch(liveLoader, /moral-trade-live-trade-feed\.(?:js|css)/);
  assert.doesNotMatch(liveLoader, /stripLegacyTradeSidebar|data-mt-live-trade-feed/);
});

test("the delivered executable has no retired Trade builder or fabricated transactions", () => {
  assert.doesNotMatch(liveCore, /Alex R\.|Sam G\.|Riley P\.|Mina Park/);
  assert.doesNotMatch(liveCore, /Replaced 10 car trips|1 pending counteroffer|Today, 9:18 AM/);
  assert.doesNotMatch(liveCore, /function clauseBuilder|function dealroomView|function matchView/);
  assert.match(liveCore, /window\.location\.assign\('\/trades\/new'\)/);
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
    /matcher: \["\/", "\/walkthrough", "\/create", "\/offers", "\/offers\/:path\*"\]/,
  );
});
