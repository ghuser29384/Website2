import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const navigation = readFileSync("public/moral-trade-live-navigation.js", "utf8");
const nowFeed = readFileSync("public/moral-trade-live-now.js", "utf8");
const proxy = readFileSync("src/proxy.ts", "utf8");
const truthBoundary = readFileSync("public/moral-trade-live-local-time.js", "utf8");

test("the returning root stays on the live, fail-closed recommendation surface", () => {
  assert.match(proxy, /return rewriteToLiveHome\(request\)/);
  assert.match(nowFeed, /data-mt-live-now-state/);
  assert.match(nowFeed, /model\.status === "ready"/);
});

test("the live recommendation surface separates review from agreement", () => {
  assert.match(navigation, /mt-live-document-heading/);
  assert.match(truthBoundary, /Current opportunities and next actions/);
  assert.match(truthBoundary, /mt-live-document-heading/);
  assert.match(
    truthBoundary,
    /Recommendations to review — not agreements, commitments, payments, or verified outcomes\./,
  );
  assert.match(truthBoundary, /data-mt-now-review-boundary/);
  assert.match(truthBoundary, /existingBoundary\.remove\(\)/);

  for (const fabricatedClaim of [
    "Mina",
    "Both say yes",
    "11 completed",
    "96% on-time verification",
    "14 more matches",
    "New matches refresh daily",
  ]) {
    assert.equal(
      `${truthBoundary}\n${nowFeed}`.includes(fabricatedClaim),
      false,
      `live root must not contain fabricated claim: ${fabricatedClaim}`,
    );
  }
});
