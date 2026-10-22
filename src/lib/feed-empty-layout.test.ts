import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import test from "node:test";

const script = readFileSync("public/moral-trade-live-feed-diagnostics.js", "utf8");
const styles = readFileSync("public/moral-trade-live-feed-diagnostics.css", "utf8");

test("feed diagnostics remain a standalone script without networking or persistence", () => {
  assert.doesNotThrow(() => new Script(script));
  assert.doesNotMatch(script, /\bfetch\s*\(|localStorage|sessionStorage|sendBeacon/);
});

test("layout reuses existing DOM and native disclosure without copying private contents", () => {
  assert.match(script, /function arrangeEmptyLayout\(root\)/);
  assert.match(script, /root\.classList\.contains\("mt-feed-empty-layout"\)/);
  assert.match(script, /document\.createElement\("details"\)/);
  assert.match(script, /body\.appendChild\(facts\)/);
  assert.match(script, /body\.appendChild\(aside\)/);
  assert.match(script, /body\.appendChild\(explanation\)/);
  assert.doesNotMatch(script, /\.remove\(\).*terms|cloneNode/);
});

test("empty-state layout does not depend on diagnostics availability", () => {
  const arrange = script.indexOf("arrangeEmptyLayout(root);", script.indexOf("function enhance()"));
  const dataGate = script.indexOf('if (!data || data.version !== "hybrid-reciprocal-v1")', arrange);
  assert.ok(arrange > 0 && dataGate > arrange);
  assert.match(script, /\["no_matches", "profile_incomplete", "signed_out", "unavailable"\]/);
});

test("moved diagnostics still use the established external-inventory semantics", () => {
  assert.match(script, /external-candidate-funnel-v1/);
  assert.match(script, /root\.querySelectorAll\("\.mt-feed-empty-facts strong"\)/);
  assert.match(script, /root\.querySelector\("\.mt-feed-empty-diagnostics"\)/);
  assert.match(script, /data\.viewerOwnedExcludedCount/);
  assert.match(script, /external > 0 && evaluated === 0/);
});

test("compact styling is scoped to empty Feed and does not truncate critical copy", () => {
  const compact = styles.slice(styles.indexOf("/* Empty Feed:"));
  assert.match(compact, /\[data-mt-live-now="adaptive"\]\.mt-feed-empty-layout/);
  assert.match(compact, /@media \(max-width: 480px\)/);
  assert.match(compact, /overflow-wrap: anywhere/);
  assert.doesNotMatch(compact, /line-clamp|overflow:\s*hidden/);
  assert.match(compact, /focus-visible/);
});

test("the existing static-core integrity gate remains valid", () => {
  const loader = readFileSync("public/moral-trade-live.html", "utf8");
  const core = readFileSync("public/moral-trade-live-core.txt");
  const hash = createHash("sha256").update(core).digest("hex");
  assert.ok(loader.includes(`digest !== '${hash}'`));
});
