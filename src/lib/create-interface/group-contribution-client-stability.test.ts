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

test("ordinary value changes do not replace the active form control", () => {
  const listeners = functionBody("installShadowDelegatedListeners");
  assert.match(listeners, /const field = control\.dataset\.field \?\? ""/);
  assert.match(listeners, /panelShapeChanged = PANEL_SHAPE_FIELDS\.has\(field\)/);
  assert.match(listeners, /if \(panelShapeChanged\) scheduleMountedOptionRender\(entry\)/);
  assert.match(listeners, /else updateValidationStatus\(entry\)/);

  const shapeFieldsStart = client.indexOf("const PANEL_SHAPE_FIELDS");
  const shapeFieldsEnd = client.indexOf("const PROPOSAL_FLAGS", shapeFieldsStart);
  assert.ok(shapeFieldsStart >= 0 && shapeFieldsEnd > shapeFieldsStart);
  const shapeFields = client.slice(shapeFieldsStart, shapeFieldsEnd);
  assert.match(shapeFields, /coActStructure/);
  assert.match(shapeFields, /allocationMode/);
  assert.doesNotMatch(shapeFields, /maximumBudgetMinor|targetMinor|noPoolDefault/);
});

test("authentication resume validates and restores the proposal on the summary screen", () => {
  const scan = functionBody("scanForOptions");
  assert.match(scan, /if \(!root\)[\s\S]*resumedProposal[\s\S]*writeProposalPayload\(false\)/);

  const payload = functionBody("readProposalPayload");
  assert.match(payload, /mounted\.size === 0 && resumedProposal/);

  const restore = functionBody("readStoredResumeProposal");
  assert.match(restore, /parseGroupContributionProposalPayload/);
  assert.match(restore, /permitsGroupContributionMode/);
  assert.match(restore, /result\.ok/);
});


test("semantic primary fields never fall through to duration or currency", () => {
  const primary = functionBody("readPrimaryText");
  assert.match(primary, /let hasPreferredControl = false/);
  assert.match(primary, /if \(control\) hasPreferredControl = true/);
  assert.match(primary, /if \(hasPreferredControl\) return ""/);
});

test("authentication resume uses the same top-level request and storage context", () => {
  const request = functionBody("isResumeRequest");
  assert.match(request, /resumeRequestUrl\(\)/);

  const requestUrl = functionBody("resumeRequestUrl");
  assert.match(requestUrl, /typeof window === "undefined"/);
  assert.match(requestUrl, /window\.top/);
  assert.match(requestUrl, /window\.location\.href/);

  const storage = functionBody("resumeStorage");
  assert.match(storage, /typeof window === "undefined"/);
  assert.match(storage, /window\.top\.sessionStorage/);
  assert.match(storage, /window\.sessionStorage/);

  const restoreProposal = functionBody("readStoredResumeProposal");
  assert.match(restoreProposal, /resumeStorage\(\)\?\.getItem/);
});

test("authentication resume restores the exact editable group draft snapshot", () => {
  const persist = functionBody("persistResumeProposal");
  assert.match(persist, /groupDraftStorage\(\)\?\.getItem\(STORAGE_KEY\)/);
  assert.match(persist, /RESUME_DRAFT_STORAGE_KEY/);

  const restore = functionBody("restoreResumeDrafts");
  assert.match(restore, /RESUME_DRAFT_STORAGE_KEY/);
  assert.match(restore, /parsed\.version !== 1/);
  assert.match(restore, /const localStorage = groupDraftStorage\(\)/);
  assert.match(restore, /localStorage\.setItem\(STORAGE_KEY/);

  const activate = functionBody("activateCreateDocument");
  assert.ok(activate.indexOf("restoreResumeDrafts();") < activate.indexOf("readStoredResumeProposal();"));

  const clear = functionBody("clearResumeProposal");
  assert.match(clear, /removeItem\(RESUME_STORAGE_KEY\)/);
  assert.match(clear, /removeItem\(RESUME_DRAFT_STORAGE_KEY\)/);
});

test("summary scans preserve restored group drafts until option cards remount", () => {
  const writer = functionBody("writeProposalPayload");
  assert.match(writer, /const preservingResumedDrafts = mounted\.size === 0 && resumedProposal !== null/);
  assert.match(writer, /persistCurrentDrafts && !preservingResumedDrafts/);

  const scan = functionBody("scanForOptions");
  assert.match(scan, /if \(mounted\.size > 0\) resumedProposal = null/);
  assert.ok(scan.indexOf("mounted.size > 0") < scan.indexOf("writeProposalPayload();"));
});
