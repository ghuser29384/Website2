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

test("only panel-shape controls defer a rerender until the browser event is complete", () => {
  const shapeFieldsStart = client.indexOf("const PANEL_SHAPE_FIELDS");
  const shapeFieldsEnd = client.indexOf("const PROPOSAL_FLAGS", shapeFieldsStart);
  assert.ok(shapeFieldsStart >= 0 && shapeFieldsEnd > shapeFieldsStart);
  const shapeFields = client.slice(shapeFieldsStart, shapeFieldsEnd);
  assert.match(shapeFields, /creatorParticipation/);
  assert.match(shapeFields, /activationMode/);
  assert.match(shapeFields, /recurringMode/);
  assert.doesNotMatch(shapeFields, /targetMinor|maximumBudgetMinor|noPoolDefault/);

  const listeners = functionBody("installShadowDelegatedListeners");
  assert.match(listeners, /entry\.state\.mode = mode/);
  assert.match(listeners, /const field = control\.dataset\.field \?\? ""/);
  assert.match(listeners, /panelShapeChanged = PANEL_SHAPE_FIELDS\.has\(field\)/);
  assert.match(listeners, /if \(panelShapeChanged\) scheduleMountedOptionRender\(entry\)/);
  assert.match(listeners, /else updateValidationStatus\(entry\)/);
  assert.doesNotMatch(listeners, /renderMountedOption\(entry\)/);

  const scheduled = functionBody("scheduleMountedOptionRender");
  assert.match(scheduled, /setTimeout/);
  assert.match(scheduled, /renderMountedOption\(entry\)/);
});

test("group drafts persist in stable application storage across srcDoc remounts", () => {
  const storage = functionBody("groupDraftStorage");
  assert.match(storage, /window\.localStorage/);
  assert.match(storage, /createWindow\(\)\.localStorage/);

  const persist = functionBody("persistDrafts");
  const readStored = functionBody("readStoredDrafts");
  assert.match(persist, /groupDraftStorage\(\)/);
  assert.match(readStored, /groupDraftStorage\(\)/);
  assert.doesNotMatch(persist, /createWindow\(\)\.localStorage\.setItem/);
  assert.doesNotMatch(readStored, /createWindow\(\)\.localStorage\.getItem/);
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

test("review summaries are idempotent so their observer cannot self-trigger forever", () => {
  const review = functionBody("renderReviewSummaries");
  assert.match(review, /mtGroupContributionReviewFingerprint/);
  assert.match(review, /=== fingerprint/);
  assert.match(review, /existing\?\.remove\(\)/);
});
