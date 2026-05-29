import assert from "node:assert/strict";
import test from "node:test";

import {
  decideMoralTradeFallback,
  evaluateMoralTradeFallbackDecision,
  getMoralTradeOperationsProfile,
  validateMoralTradeOperationsProfile,
} from "./operations";

test("operations profile publishes security, rate-limit, observability, fallback, and rollout contracts", () => {
  const profile = getMoralTradeOperationsProfile();
  const validation = validateMoralTradeOperationsProfile();

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.ok(profile.securityHeaders.some((header) => header.code === "strict_transport_security"));
  assert.ok(profile.securityHeaders.some((header) => header.code === "private_no_store"));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "offer_create" && surface.limit > 0));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "offer_collection_read" && surface.limit === 120));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "offer_detail_read" && surface.limit === 120));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "offer_facets_read" && surface.limit === 120));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "offer_follow_write" && surface.limit === 30));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "offer_create_similar" && surface.limit === 30));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "saved_search_write" && surface.limit === 30));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "wish_registry_search" && surface.limit > 0));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "analytics_ingest" && surface.limit === 120));
  assert.ok(profile.privacyAndSessionControls.some((control) => control.key === "data_right_requests"));
  assert.ok(profile.observabilityMetrics.includes("copilot_fallback_rate"));
  assert.ok(profile.fallbackControls.some((control) => control.key === "invalid_copilot_output_no_state_change"));
  assert.ok(profile.operationalTests.includes("resilience_fallback_audit"));
  assert.ok(profile.rolloutGates.some((gate) => gate.key === "human_controlled_safety"));
});

test("operations profile validation fails if core abuse controls are missing", () => {
  const profile = {
    ...getMoralTradeOperationsProfile(),
    rateLimitSurfaces: getMoralTradeOperationsProfile().rateLimitSurfaces.filter(
      (surface) => surface.key !== "offer_create",
    ),
  };
  const validation = validateMoralTradeOperationsProfile(profile);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("rate-limit-surfaces")));
});

test("invalid copilot output falls back to manual review without live state changes", () => {
  for (const proposedStateChange of ["publish", "match", "disclose", "complete"] as const) {
    const decision = decideMoralTradeFallback({
      trigger: "copilot_invalid_output",
      proposedStateChange,
    });

    assert.equal(decision.status, "pass");
    assert.equal(decision.decision, "manual_review");
    assert.equal(decision.fallbackMode, "deterministic_manual_review");
    assert.equal(decision.liveStateChangeAllowed, false);
    assert.deepEqual(decision.blockers, []);
    assert.ok(decision.auditCodes.includes("deterministic_manual_fallback"));
    assert.ok(decision.auditCodes.includes("no_live_state_change"));
    assert.ok(decision.auditCodes.includes(`${proposedStateChange}_state_change_blocked`));
  }
});

test("provider outages block completion if deterministic/manual fallback is unavailable", () => {
  const decision = decideMoralTradeFallback({
    trigger: "provider_timeout",
    proposedStateChange: "complete",
    deterministicValidationAvailable: false,
    manualReviewAvailable: false,
  });

  assert.equal(decision.status, "fail");
  assert.equal(decision.decision, "block_state_change");
  assert.equal(decision.fallbackMode, "deterministic_manual_review");
  assert.equal(decision.liveStateChangeAllowed, false);
  assert.ok(decision.auditCodes.includes("complete_state_change_blocked"));
  assert.ok(decision.blockers.includes("fallback_path_unavailable"));
  assert.ok(decision.blockers.includes("deterministic_validation_unavailable"));
  assert.ok(decision.blockers.includes("manual_review_unavailable"));
});

test("state transition replays reuse the prior outcome only with matching idempotency evidence", () => {
  const decision = decideMoralTradeFallback({
    trigger: "state_transition_replay",
    proposedStateChange: "status_change",
    replay: {
      idempotencyKey: "mt-state-01",
      requestHash: "sha256:abc",
      previousRequestHash: "sha256:abc",
      previousOutcome: "accepted",
    },
  });

  assert.equal(decision.status, "pass");
  assert.equal(decision.decision, "reuse_prior_outcome");
  assert.equal(decision.fallbackMode, "idempotent_replay");
  assert.equal(decision.liveStateChangeAllowed, false);
  assert.deepEqual(decision.blockers, []);
  assert.ok(decision.auditCodes.includes("replay_safe_state_transitions"));
});

test("state transition replays with missing or mismatched identity cannot mutate live state", () => {
  const missingIdentityDecision = decideMoralTradeFallback({
    trigger: "state_transition_replay",
    proposedStateChange: "status_change",
    replay: {
      requestHash: "sha256:abc",
      previousRequestHash: "sha256:abc",
      previousOutcome: "blocked",
    },
  });
  const mismatchedHashDecision = evaluateMoralTradeFallbackDecision({
    trigger: "state_transition_replay",
    proposedStateChange: "status_change",
    replay: {
      idempotencyKey: "mt-state-01",
      requestHash: "sha256:abc",
      previousRequestHash: "sha256:def",
      previousOutcome: "accepted",
    },
  });

  assert.equal(missingIdentityDecision.status, "fail");
  assert.equal(missingIdentityDecision.decision, "block_state_change");
  assert.equal(missingIdentityDecision.liveStateChangeAllowed, false);
  assert.ok(missingIdentityDecision.blockers.includes("replay_identity_missing"));
  assert.ok(missingIdentityDecision.blockers.includes("missing_idempotency_key"));

  assert.equal(mismatchedHashDecision.status, "fail");
  assert.equal(mismatchedHashDecision.decision, "block_state_change");
  assert.equal(mismatchedHashDecision.liveStateChangeAllowed, false);
  assert.ok(mismatchedHashDecision.blockers.includes("replay_hash_mismatch"));
  assert.ok(mismatchedHashDecision.blockers.includes("idempotency_key_reused_for_different_request"));
});
