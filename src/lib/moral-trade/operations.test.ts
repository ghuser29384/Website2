import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { MORAL_TRADE_API_RATE_LIMITS } from "./api-rate-limit";
import { getMoralTradeApiContractProfile } from "./api-contract";
import {
  decideMoralTradeFallback,
  evaluateMoralTradeFallbackDecision,
  getMoralTradeOperationsProfile,
  validateMoralTradeOperationsProfile,
} from "./operations";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("operations profile publishes security, rate-limit, observability, fallback, and rollout contracts", () => {
  const profile = getMoralTradeOperationsProfile();
  const validation = validateMoralTradeOperationsProfile();
  const apiContractSurfaces = Array.from(
    new Set(getMoralTradeApiContractProfile().routes.map((route) => route.rateLimitSurface)),
  );

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.ok(profile.securityHeaders.some((header) => header.code === "strict_transport_security"));
  assert.ok(profile.securityHeaders.some((header) => header.code === "private_no_store"));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "public_contract_read" && surface.limit === 240));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "offer_create" && surface.limit > 0));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "offer_collection_read" && surface.limit === 120));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "offer_detail_read" && surface.limit === 120));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "offer_facets_read" && surface.limit === 120));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "offer_follow_write" && surface.limit === 30));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "offer_create_similar" && surface.limit === 30));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "saved_search_write" && surface.limit === 30));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "copilot_draft_review" && surface.limit === 30));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "match_signal_evaluate" && surface.limit === 60));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "challenge_appeal_evaluate" && surface.limit === 30));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "disclosure_evaluate" && surface.limit === 30));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "review_workflow_evaluate" && surface.limit === 60));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "profile_portability" && surface.limit === 12));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "wish_registry_search" && surface.limit > 0));
  assert.ok(profile.rateLimitSurfaces.some((surface) => surface.key === "analytics_ingest" && surface.limit === 120));
  assert.deepEqual(
    Object.keys(MORAL_TRADE_API_RATE_LIMITS).filter(
      (surface) => !profile.rateLimitSurfaces.some((entry) => entry.key === surface),
    ),
    [],
  );
  assert.deepEqual(
    apiContractSurfaces.filter((surface) => !(surface in MORAL_TRADE_API_RATE_LIMITS)),
    [],
  );
  for (const [surface, config] of Object.entries(MORAL_TRADE_API_RATE_LIMITS)) {
    assert.equal(
      profile.rateLimitSurfaces.find((entry) => entry.key === surface)?.limit,
      config.limit,
      surface,
    );
  }
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

test("private Moral Trade advisory routes enforce named rate limits before reading drafts", () => {
  const routeSurfaces = [
    {
      path: "src/app/api/moral-trade/copilot/review/route.ts",
      surface: "copilot_draft_review",
    },
    {
      path: "src/app/api/moral-trade/match-signal/evaluate/route.ts",
      surface: "match_signal_evaluate",
    },
    {
      path: "src/app/api/moral-trade/challenge-appeal/evaluate/route.ts",
      surface: "challenge_appeal_evaluate",
    },
    {
      path: "src/app/api/moral-trade/disclosure/evaluate/route.ts",
      surface: "disclosure_evaluate",
    },
    {
      path: "src/app/api/moral-trade/review-workflow/evaluate/route.ts",
      surface: "review_workflow_evaluate",
    },
  ] as const;

  for (const route of routeSurfaces) {
    const source = readRepoFile(route.path);
    const rateLimitIndex = source.indexOf(
      `takeMoralTradeApiRateLimitSlot(request, "${route.surface}")`,
    );
    const bodyParseIndex = source.indexOf("request.json()");

    assert.notEqual(rateLimitIndex, -1, `${route.path} missing named rate limit`);
    assert.notEqual(bodyParseIndex, -1, `${route.path} missing request parsing`);
    assert.ok(rateLimitIndex < bodyParseIndex, `${route.path} should rate-limit before parsing body`);
    assert.match(source, /buildMoralTradeApiRateLimitBlocker\(rateLimit\.surface\)/);
    assert.match(source, /"Retry-After"/);
    assert.match(source, /429/);
    assert.match(source, /private, no-store/);
    assert.match(source, /without changing|without revealing|without exposing|without disclosing/);
  }
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
