import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const proxySource = readFileSync("src/proxy.ts", "utf8");

test("the live home remains at Trade while Create entries share the durable Create adapter", () => {
  assert.match(
    proxySource,
    /function rewriteToLiveHome[\s\S]*liveUrl\.pathname = "\/moral-trade-live\.html"/,
  );
  assert.match(proxySource, /if \(pathname === "\/"\)[\s\S]*return rewriteToLiveHome\(request\)/);
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
