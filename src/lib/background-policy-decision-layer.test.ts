import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  evaluateBackgroundPolicyDecision,
  getActiveBackgroundReleaseManifest,
  getBackgroundActionKindRegistry,
  getBackgroundActionKindRegistryHash,
} from "@/lib/background-phase-gates";
import { BACKGROUND_PURPOSE_POLICY_VERSION } from "@/lib/background-purpose-registry";

test("background policy decisions bind exact action, lane, manifest, and output schema", () => {
  const manifest = getActiveBackgroundReleaseManifest();
  const decision = evaluateBackgroundPolicyDecision({
    actionKind: "background.helper_run.enqueue",
    actorRole: "participant",
    idempotencyKey: "profile-1:manual-scan:2026-06-14",
    laneKey: "helper_runs",
    outputSchemaVersion: "background-helper-run-response-v1",
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  });

  assert.equal(decision.verdict, "allow");
  assert.equal(decision.manifestId, manifest.id);
  assert.equal(decision.phaseGateBundleHash, manifest.phaseGateBundleHash);
  assert.equal(decision.outputSchemaVersion, "background-helper-run-response-v1");
  assert.equal(decision.reasonClasses[0], "all_governed_phase_gates_passed");
});

test("background policy decisions reject catch-all action kinds, wrong lanes, and schema drift", () => {
  const catchAll = evaluateBackgroundPolicyDecision({
    actionKind: "background.admin.anything",
    actorRole: "admin",
    laneKey: "helper_runs",
  });
  const wrongLane = evaluateBackgroundPolicyDecision({
    actionKind: "background.helper_run.enqueue",
    actorRole: "participant",
    idempotencyKey: "profile-1:manual-scan",
    laneKey: "opportunity_briefs",
    outputSchemaVersion: "background-helper-run-response-v1",
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  });
  const wrongSchema = evaluateBackgroundPolicyDecision({
    actionKind: "background.opportunity_brief.list",
    actorRole: "participant",
    laneKey: "opportunity_briefs",
    outputSchemaVersion: "debug-internal-row-v1",
  });

  assert.equal(catchAll.verdict, "deny");
  assert.ok(catchAll.reasonClasses.includes("unregistered_action_kind"));
  assert.equal(wrongLane.verdict, "stale");
  assert.ok(wrongLane.reasonClasses.includes("wrong_lane_for_action"));
  assert.equal(wrongSchema.verdict, "stale");
  assert.ok(wrongSchema.reasonClasses.includes("wrong_output_schema_version"));
});

test("side-effecting background policy actions require idempotency keys", () => {
  const decision = evaluateBackgroundPolicyDecision({
    actionKind: "background.intro_request.create",
    actorRole: "participant",
    laneKey: "intro_requests",
    outputSchemaVersion: "background-intro-request-response-v1",
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  });

  assert.equal(decision.verdict, "stale");
  assert.ok(decision.reasonClasses.includes("idempotency_key_required"));
  assert.equal(decision.sideEffectsAllowed, false);
});

test("side-effecting policy decisions bind the action idempotency key", () => {
  const first = evaluateBackgroundPolicyDecision({
    actionKind: "background.helper_run.enqueue",
    actorRole: "participant",
    idempotencyKey: "profile-1:manual-scan:a",
    laneKey: "helper_runs",
    outputSchemaVersion: "background-helper-run-response-v1",
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  });
  const replayVariant = evaluateBackgroundPolicyDecision({
    actionKind: "background.helper_run.enqueue",
    actorRole: "participant",
    idempotencyKey: "profile-1:manual-scan:b",
    laneKey: "helper_runs",
    outputSchemaVersion: "background-helper-run-response-v1",
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  });
  const manifest = getActiveBackgroundReleaseManifest();

  assert.equal(first.verdict, "allow");
  assert.equal(first.idempotencyKey, "profile-1:manual-scan:a");
  assert.notEqual(first.policyDecisionId, replayVariant.policyDecisionId);
  assert.equal(first.policyActionKindRegistryHash, manifest.policyActionKindRegistryHash);
  assert.equal(first.policyCompositionBundleHash, manifest.policyCompositionBundleHash);
});

test("action-kind registry is content addressed and route wiring uses the evaluator", () => {
  const registry = getBackgroundActionKindRegistry();
  const registryHash = getBackgroundActionKindRegistryHash();
  const helperRoute = readFileSync("src/app/api/background/helper-runs/route.ts", "utf8");
  const sourceRoute = readFileSync("src/app/api/background/source-summaries/route.ts", "utf8");
  const confirmTagsRoute = readFileSync(
    "src/app/api/background/source-summaries/[id]/confirm-tags/route.ts",
    "utf8",
  );
  const introRoute = readFileSync("src/app/api/background/intro-requests/route.ts", "utf8");

  assert.ok(registryHash.length >= 32);
  assert.ok(registry.some((entry) => entry.actionKind === "background.helper_run.enqueue"));
  assert.ok(
    registry.some((entry) => entry.actionKind === "background.source_summary.confirm_tags"),
  );
  assert.ok(
    registry.some(
      (entry) =>
        entry.actionKind === "background.privacy_freeze.release" &&
        entry.stepUpRequired === true,
    ),
  );
  assert.ok(
    registry.some(
      (entry) =>
        entry.actionKind === "background.participant_export.generate" &&
        entry.actionFamily === "export",
    ),
  );
  assert.match(helperRoute, /evaluateBackgroundPolicyDecision/);
  assert.match(sourceRoute, /background\.source_summary\.create/);
  assert.match(confirmTagsRoute, /background\.source_summary\.confirm_tags/);
  assert.match(introRoute, /background\.intro_request\.create/);
});

test("dashboard privacy-freeze actions and export route use governed policy decisions", () => {
  const dashboardActions = readFileSync("src/app/background-networking/actions.ts", "utf8");
  const dashboardPage = readFileSync("src/app/dashboard/page.tsx", "utf8");
  const exportRoute = readFileSync("src/app/api/profile/export/route.ts", "utf8");

  assert.match(dashboardActions, /background\.privacy_freeze\.activate/);
  assert.match(dashboardActions, /background\.privacy_freeze\.release/);
  assert.match(dashboardActions, /currentLevel !== "aal2"/);
  assert.match(dashboardActions, /email_outbox/);
  assert.match(dashboardActions, /activateBackgroundPrivacyFreezeAction/);
  assert.match(dashboardActions, /releaseBackgroundPrivacyFreezeAction/);
  assert.match(dashboardPage, /privacyFreezeActive/);
  assert.match(dashboardPage, /Release controls/);
  assert.match(exportRoute, /background\.participant_export\.generate/);
  assert.match(exportRoute, /privacyFreezeActive/);
  assert.match(exportRoute, /background-participant-export-response-v1/);
  assert.doesNotMatch(exportRoute, /privacyAccessRequests: privacyAccessRequests\.data/);
  assert.doesNotMatch(exportRoute, /introductionTasks: introductionTasks\.data/);
});
