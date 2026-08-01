import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const instrumentation = readFileSync("src/instrumentation-client.ts", "utf8");
const stability = readFileSync(
  "src/lib/create-interface/group-contribution-interaction-stability.ts",
  "utf8",
);

test("interaction stability installs before the group contribution enhancement", () => {
  const stabilityCall = instrumentation.indexOf(
    "installGroupContributionInteractionStability();",
  );
  const enhancementCall = instrumentation.indexOf(
    "startGroupContributionEnhancement();",
  );

  assert.ok(stabilityCall >= 0);
  assert.ok(enhancementCall > stabilityCall);
});

test("only state-replacing controls inside group contribution Shadow roots are deferred", () => {
  assert.match(stability, /data-mt-group-contribution-host/);
  assert.match(stability, /event\.type === "click" && target\.matches\("\[data-mode\]"\)/);
  assert.match(stability, /event\.type === "change" && target\.matches\("\[data-field\]"\)/);
  assert.match(stability, /event\.stopImmediatePropagation\(\)/);
  assert.match(stability, /targetWindow\.setTimeout/);
  assert.match(stability, /replayingTargets\.add\(target\)/);
  assert.doesNotMatch(stability, /fetch|XMLHttpRequest|payment/i);
});
