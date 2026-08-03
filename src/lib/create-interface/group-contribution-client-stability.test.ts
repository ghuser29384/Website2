import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const instrumentation = readFileSync("src/instrumentation-client.ts", "utf8");
const client = readFileSync(
  "src/lib/create-interface/group-contribution-client.ts",
  "utf8",
);

function functionBody(name: string): string {
  const start = client.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const next = client.indexOf("\nfunction ", start + 1);
  return client.slice(start, next < 0 ? client.length : next);
}

test("the client mounts one stable Shadow DOM shell and replaces only the panel slot", () => {
  assert.match(client, /data-mt-group-shell/);
  assert.match(client, /data-mt-group-panel-slot/);
  assert.match(client, /installShadowDelegatedListeners/);

  const render = functionBody("renderMountedOption");
  assert.doesNotMatch(render, /shadow\.innerHTML\s*=/);
  assert.match(render, /slot\.innerHTML\s*=/);
});

test("state-replacing controls defer their panel rerender until the browser event is complete", () => {
  const listeners = functionBody("installShadowDelegatedListeners");
  assert.match(listeners, /entry\.state\.mode = mode/);
  assert.match(listeners, /scheduleMountedOptionRender\(entry\)/);
  assert.doesNotMatch(listeners, /renderMountedOption\(entry\)/);

  const scheduled = functionBody("scheduleMountedOptionRender");
  assert.match(scheduled, /setTimeout/);
  assert.match(scheduled, /renderMountedOption\(entry\)/);
});

test("the iframe event target guards are cross-realm safe", () => {
  const targetGuard = functionBody("elementTarget");
  assert.match(targetGuard, /"closest" in target/);
  assert.match(targetGuard, /"matches" in target/);
  assert.doesNotMatch(targetGuard, /instanceof Element/);
});

test("instrumentation starts only the structurally stable enhancement", () => {
  assert.match(instrumentation, /startGroupContributionEnhancement\(\)/);
  assert.doesNotMatch(instrumentation, /InteractionStability|installGroupContributionInteractionStability/);
});
