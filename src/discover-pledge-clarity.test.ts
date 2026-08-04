import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/discover/moral-trade-discover.source.html", "utf8");

test("Discover presents exact mechanical pledge arithmetic without calling it pivotality", () => {
  for (const required of [
    "PREVIEW YOUR PLEDGE",
    "Preview your conditional pledge",
    "Share of the current gap",
    "This is arithmetic, not a forecast of other contributors.",
    "Moving the slider does not save a pledge or authorize payment.",
    "formatGapShare",
  ]) {
    assert.ok(source.includes(required), `missing pledge-clarity contract: ${required}`);
  }

  for (const forbidden of [
    "TEST YOUR PLEDGE",
    "Low pivotality",
    "Moderate pivotality",
    "High pivotality",
    "How likely am I to be pivotal?",
    "inspect pivotality",
    "<h3>Pivotality</h3>",
  ]) {
    assert.equal(source.includes(forbidden), false, `misleading pledge copy remained: ${forbidden}`);
  }
});

test("sub-one-percent gap shares retain meaningful precision", () => {
  assert.match(source, /percent < 1[\s\S]*toFixed\(2\)/);
  assert.match(source, /pledge \/ metrics\.gap/);
  assert.match(source, /pledge \/ activeMetrics\.gap/);
});

test("the mobile inspector sheet overrides the hidden desktop inspector rule", () => {
  assert.match(source, /\.mobile-sheet \{\s*display: block;/);
});
