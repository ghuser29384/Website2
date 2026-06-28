import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_CURRENT_PHASE,
  BACKGROUND_POLICY_ENGINE_VERSION,
  evaluateBackgroundPolicyDecision,
  getActiveBackgroundReleaseManifest,
  getBackgroundArtifactTransitionPolicyBundle,
  getBackgroundClaimAssuranceTaxonomyBundle,
  getBackgroundOutputSchemaBundle,
  getBackgroundPhaseGateBundle,
  getBackgroundPolicyCompositionBundle,
  getBackgroundRetentionPolicyBundle,
  getBackgroundSignalTaxonomyBundle,
  getBackgroundToolCapabilityBundle,
  validateBackgroundPhaseGateBundle,
} from "@/lib/background-phase-gates";
import { BACKGROUND_PURPOSE_POLICY_VERSION } from "@/lib/background-purpose-registry";
import {
  BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_HASH,
  BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_VERSION,
} from "@/lib/background-public-pages";

test("active background release manifest binds governed artifact versions and hashes", () => {
  const manifest = getActiveBackgroundReleaseManifest();
  const bundle = getBackgroundPhaseGateBundle();
  const validation = validateBackgroundPhaseGateBundle(bundle, manifest);

  assert.equal(manifest.status, "active");
  assert.equal(manifest.backgroundNetworkingPhase, BACKGROUND_CURRENT_PHASE);
  assert.equal(manifest.policyEngineVersion, BACKGROUND_POLICY_ENGINE_VERSION);
  assert.equal(manifest.phaseGateBundleHash, bundle.bundleHash);
  assert.equal(manifest.phaseGateBundleVersion, bundle.bundleVersion);
  assert.equal(manifest.purposeRegistryVersion, BACKGROUND_PURPOSE_POLICY_VERSION);
  assert.ok(manifest.policyActionKindRegistryHash.length >= 32);
  assert.ok(manifest.outputSchemaBundleHash.length >= 32);
  assert.ok(manifest.toolCapabilityBundleHash.length >= 32);
  assert.ok(manifest.retentionPolicyBundleHash.length >= 32);
  assert.ok(manifest.policyCompositionBundleHash.length >= 32);
  assert.ok(manifest.artifactTransitionPolicyBundleHash.length >= 32);
  assert.ok(manifest.signalTaxonomyHash.length >= 32);
  assert.ok(manifest.claimAssuranceTaxonomyHash.length >= 32);
  assert.ok(manifest.uiCopyBundleHash.length >= 32);
  assert.equal(
    manifest.publicPageSimplificationSpecVersion,
    BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_VERSION,
  );
  assert.equal(
    manifest.publicPageSimplificationSpecHash,
    BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_HASH,
  );
  assert.equal(validation.status, "pass");
});

test("manifest-bound governed bundles expose concrete append-only rows", () => {
  const schemas = getBackgroundOutputSchemaBundle();
  const tools = getBackgroundToolCapabilityBundle();
  const retention = getBackgroundRetentionPolicyBundle();
  const signals = getBackgroundSignalTaxonomyBundle();
  const claims = getBackgroundClaimAssuranceTaxonomyBundle();
  const composition = getBackgroundPolicyCompositionBundle();
  const transitions = getBackgroundArtifactTransitionPolicyBundle();

  assert.ok(
    schemas.some(
      (row) =>
        row.schemaKey === "background-participant-export-response-v1" &&
        row.extraKeyPolicy === "reject" &&
        row.forbiddenKeyPatterns.includes("candidate"),
    ),
  );
  assert.ok(tools.every((row) => !row.allowArbitraryNetwork && !row.allowRawSourceRead));
  assert.ok(retention.some((row) => row.artifactKind === "privacy_freeze"));
  assert.ok(retention.some((row) => row.artifactKind === "participant_export"));
  assert.ok(
    signals.some(
      (row) =>
        row.signalKey === "confirmed_source_summary_tag" &&
        row.status === "active" &&
        row.prohibitedUses.includes("source_summary_approval_as_implicit_confirmation"),
    ),
  );
  assert.ok(
    signals.some(
      (row) =>
        row.signalKey === "private_third_party_data" &&
        row.status === "disabled" &&
        row.sensitivityTier === "prohibited",
    ),
  );
  assert.ok(
    claims.every(
      (row) =>
        row.status === "disabled" &&
        row.requiresOperatorReview &&
        row.allowedSurfaceKeys.length === 0 &&
        row.prohibitedUses.includes("ranking_boost"),
    ),
  );
  assert.ok(
    composition.some(
      (row) =>
        row.controlFamilies.includes("privacy_freeze") &&
        row.compositionMode === "deny_overrides" &&
        row.conflictBehavior === "fail_closed",
    ),
  );
  assert.ok(
    transitions.some(
      (row) =>
        row.artifactKind === "privacy_freeze" &&
        row.requiredActionKind === "background.privacy_freeze.release" &&
        row.nonActionabilityGuarantee.includes("recompute"),
    ),
  );
});

test("policy decisions snapshot release-manifest provenance", () => {
  const manifest = getActiveBackgroundReleaseManifest();
  const decision = evaluateBackgroundPolicyDecision({
    actionKind: "background.opportunity_brief.list",
    actorRole: "participant",
    laneKey: "opportunity_briefs",
    outputSchemaVersion: "background-opportunity-brief-list-response-v2",
  });

  assert.equal(decision.verdict, "allow");
  assert.equal(decision.manifestId, manifest.id);
  assert.equal(decision.phase, manifest.backgroundNetworkingPhase);
  assert.equal(decision.phaseGateBundleHash, manifest.phaseGateBundleHash);
  assert.equal(decision.policyEngineVersion, manifest.policyEngineVersion);
  assert.equal(
    decision.publicPageSimplificationSpecHash,
    manifest.publicPageSimplificationSpecHash,
  );
  assert.equal(decision.uiCopyBundleHash, manifest.uiCopyBundleHash);
  assert.ok(decision.policyDecisionId.startsWith("bgpd_"));
});

test("privacy freezes deny side effects and participant exports until release", () => {
  const exportDecision = evaluateBackgroundPolicyDecision({
    actionKind: "background.participant_export.generate",
    actorRole: "participant",
    controlStates: { privacyFreezeActive: true },
    idempotencyKey: "profile-1:background-export:2026-06-14",
    laneKey: "participant_exports",
    outputSchemaVersion: "background-participant-export-response-v1",
  });
  const releaseDecision = evaluateBackgroundPolicyDecision({
    actionKind: "background.privacy_freeze.release",
    actorRole: "participant",
    idempotencyKey: "profile-1:privacy-freeze:release",
    laneKey: "privacy_freeze",
    outputSchemaVersion: "background-privacy-freeze-response-v1",
  });

  assert.equal(exportDecision.verdict, "stale");
  assert.equal(exportDecision.sideEffectsAllowed, false);
  assert.ok(exportDecision.reasonClasses.includes("privacy_freeze_active"));
  assert.equal(releaseDecision.verdict, "allow");
});

test("manifest and phase bundle validation fails closed on hash drift", () => {
  const manifest = {
    ...getActiveBackgroundReleaseManifest(),
    phaseGateBundleHash: "stale-hash",
  };
  const validation = validateBackgroundPhaseGateBundle(
    getBackgroundPhaseGateBundle(),
    manifest,
  );

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("manifest-phase-bound")));
});
