import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BACKGROUND_CURRENT_PHASE,
  buildBackgroundDisabledLaneResponse,
  evaluateBackgroundPolicyDecision,
  getBackgroundPhaseGateBundle,
  getBackgroundPhaseStatusForDocs,
  validateBackgroundPhaseGateBundle,
  type BackgroundPhaseLaneKey,
  type BackgroundPolicyActionKind,
} from "@/lib/background-phase-gates";

const DISABLED_LANES = [
  ["source_summary_import", "background.source_summary.import"],
  ["llm_wish_interview", "background.llm_wish_interview.propose"],
  ["partner_matchmaker", "background.partner_matchmaker.run"],
  ["federation_bridge", "background.federation_bridge.export"],
  ["public_broad_preview_delegate", "background.public_broad_preview_delegate.run"],
  ["high_sensitivity_signal", "background.high_sensitivity_signal.confirm"],
  ["high_impact_claim", "background.high_impact_claim.assert"],
  ["aggregate_release", "background.aggregate_release.publish"],
  ["vault_reveal", "background.vault_reveal.read"],
  ["exact_disclosure", "background.exact_disclosure.grant"],
  ["private_overlap_crypto", "background.private_overlap.check"],
] as const satisfies readonly [BackgroundPhaseLaneKey, BackgroundPolicyActionKind][];

test("background networking has a governed Phase 2 source of truth", () => {
  const bundle = getBackgroundPhaseGateBundle();
  const validation = validateBackgroundPhaseGateBundle(bundle);
  const status = getBackgroundPhaseStatusForDocs();

  assert.equal(BACKGROUND_CURRENT_PHASE, "phase_2_source_summary_intro_skeleton");
  assert.equal(bundle.backgroundNetworkingPhase, BACKGROUND_CURRENT_PHASE);
  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.equal(status.currentPhase, BACKGROUND_CURRENT_PHASE);
  assert.equal(status.phaseGateBundleHash, bundle.bundleHash);
  assert.ok(status.enabledLanes.includes("manual_source_summaries"));
  assert.ok(status.enabledLanes.includes("intro_requests"));
});

test("future background-networking lanes fail closed without side effects", () => {
  for (const [laneKey, actionKind] of DISABLED_LANES) {
    const decision = evaluateBackgroundPolicyDecision({
      actionKind,
      actorRole: "participant",
      idempotencyKey: `test:${laneKey}`,
      laneKey,
      outputSchemaVersion: "background-disabled-lane-response-v1",
    });
    const response = buildBackgroundDisabledLaneResponse(decision);

    assert.equal(decision.verdict, "deny", laneKey);
    assert.equal(decision.sideEffectsAllowed, false, laneKey);
    assert.ok(decision.reasonClasses.includes("disabled_phase_lane"), laneKey);
    assert.equal(response.queueMutation, false, laneKey);
    assert.equal(response.opportunityBriefCreated, false, laneKey);
    assert.equal(response.notificationSent, false, laneKey);
    assert.equal(response.introRequestCreated, false, laneKey);
    assert.equal(response.disclosureGrantCreated, false, laneKey);
    assert.equal(response.exportCreated, false, laneKey);
    assert.equal(response.telemetryEmitted, false, laneKey);
    assert.equal(response.partnerOrFederationCalled, false, laneKey);
  }
});

test("private-overlap route is governed by the disabled crypto lane before receipts or tag queries", () => {
  const source = readFileSync(
    "src/app/api/background/private-overlap/check/route.ts",
    "utf8",
  );
  const policyIndex = source.indexOf("background.private_overlap.check");
  const receiptIndex = source.indexOf("appendOverlapReceipt({", policyIndex);
  const tagQueryIndex = source.indexOf('from("background_private_overlap_tags")');

  assert.ok(policyIndex > 0);
  assert.ok(receiptIndex > policyIndex);
  assert.ok(tagQueryIndex > policyIndex);
});
