import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const instrumentation = readFileSync("src/instrumentation-client.ts", "utf8");
const client = readFileSync(
  "src/lib/create-interface/group-contribution-client.ts",
  "utf8",
);

test("group controls use one authoritative event path and defer only rendering", () => {
  assert.equal(
    existsSync("src/lib/create-interface/group-contribution-interaction-stability.ts"),
    false,
  );
  assert.doesNotMatch(instrumentation, /InteractionStability|interaction-stability/);
  assert.match(client, /const pendingRenders = new WeakMap<MountedOption, number>\(\);/);

  const modeListener = client.indexOf('button.addEventListener("click"');
  const normalized = client.indexOf(
    "entry.state = normalizeDraft(entry.state);",
    modeListener,
  );
  const persisted = client.indexOf("writeProposalPayload();", normalized);
  const scheduled = client.indexOf("scheduleMountedOptionRender(entry);", persisted);

  assert.ok(modeListener >= 0);
  assert.ok(normalized > modeListener);
  assert.ok(persisted > normalized);
  assert.ok(scheduled > persisted);
  assert.match(client, /if \(rerender\) scheduleMountedOptionRender\(entry\);/);
  assert.match(
    client,
    /function scheduleMountedOptionRender[\s\S]*targetWindow\.setTimeout[\s\S]*renderMountedOption\(entry\);[\s\S]*\}, 0\);/,
  );
});
