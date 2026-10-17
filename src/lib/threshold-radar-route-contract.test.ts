import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("the fictional radar is retired in favor of backed pool browsing", () => {
  const page = readFileSync("src/app/pools/radar/page.tsx", "utf8");
  assert.match(page, /permanentRedirect\("\/pools"\)/);
  assert.doesNotMatch(page, /ThresholdRadar\s*\/|23,640|54 contributors|salary gap/);
  assert.equal(existsSync("src/components/pools/threshold-radar.tsx"), false);
  assert.equal(existsSync("src/components/pools/threshold-radar.module.css"), false);
});

test("learning material no longer routes settlement to a demonstration campaign", () => {
  const source = readFileSync("src/components/trade-controls/trade-controls-workspace.tsx", "utf8");
  assert.doesNotMatch(source, /pools\/radar/);
  assert.match(source, /route: "\/pools"/);
});
