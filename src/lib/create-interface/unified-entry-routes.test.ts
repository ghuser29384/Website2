import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const proxySource = readFileSync("src/proxy.ts", "utf8");
const liveLoader = readFileSync("public/moral-trade-live.html", "utf8");
const createRouter = readFileSync("public/moral-trade-live-create-router.js", "utf8");

test("the root route remains the Moral Trade Feed and home page", () => {
  assert.match(
    proxySource,
    /function rewriteToLiveHome[\s\S]*liveUrl\.pathname = "\/moral-trade-live\.html"/,
  );
  assert.match(proxySource, /if \(pathname === "\/"\)[\s\S]*return rewriteToLiveHome\(request\)/);
});

test("the live Trade entry opens the durable Create adapter without replacing Home", () => {
  assert.match(liveLoader, /window\.location\.hash === '#trade'/);
  assert.match(liveLoader, /window\.location\.replace\('\/trades\/new'\)/);
  assert.match(liveLoader, /moral-trade-live-create-router\.js/);
  assert.match(liveLoader, /moral-trade-live-trade-feed\.js/);
  assert.match(createRouter, /const CREATE_HREF = "\/trades\/new"/);
  assert.match(createRouter, /\[data-page="trade"\]/);
  assert.match(createRouter, /\[data-action="create"\]/);
  assert.match(createRouter, /window\.location\.assign\(CREATE_HREF\)/);
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
  assert.match(proxySource, /matcher: \["\/", "\/walkthrough", "\/create", "\/offers"\]/);
});
