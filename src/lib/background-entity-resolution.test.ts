import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { evaluateBackgroundEntityResolutionClaim } from "@/lib/background-identity-boundaries";

const BASE_CLAIM = {
  allowed_purpose_bindings: [
    {
      purposeCode: "moral_trade_offer",
      purposePolicyVersion: "background-purpose-policy-v1",
    },
  ],
  allowed_surface_keys: ["opportunity_briefs", "intro_requests"],
  expires_at: "2099-01-01T00:00:00.000Z",
  resolution_kind: "self_claimed" as const,
  resolution_state: "confirmed" as const,
};

test("only self-claimed, independently verified, or operator-confirmed entity resolution can be used", () => {
  const allowedKinds = [
    "self_claimed",
    "verified_domain",
    "verified_document",
    "operator_confirmed",
  ] as const;

  for (const resolutionKind of allowedKinds) {
    const decision = evaluateBackgroundEntityResolutionClaim({
      claim: { ...BASE_CLAIM, resolution_kind: resolutionKind },
      purposeCode: "moral_trade_offer",
      surface: "opportunity_briefs",
    });

    assert.equal(decision.allowed, true, `${resolutionKind} should be match-eligible`);
  }

  for (const resolutionKind of [
    "partner_attested",
    "imported_alias",
    "model_suggested_duplicate",
  ] as const) {
    const decision = evaluateBackgroundEntityResolutionClaim({
      claim: { ...BASE_CLAIM, resolution_kind: resolutionKind },
      purposeCode: "moral_trade_offer",
      surface: "opportunity_briefs",
    });

    assert.equal(decision.allowed, false);
    assert.ok(decision.blockerCodes.includes("entity_resolution_kind_not_trusted"));
  }
});

test("ambiguous, disputed, stale, expired, wrong-purpose, or wrong-scope entity claims block use", () => {
  for (const resolutionState of [
    "pending_review",
    "disputed",
    "rejected",
    "stale",
    "expired",
  ] as const) {
    const decision = evaluateBackgroundEntityResolutionClaim({
      claim: { ...BASE_CLAIM, resolution_state: resolutionState },
      purposeCode: "moral_trade_offer",
      surface: "opportunity_briefs",
    });

    assert.equal(decision.allowed, false);
    assert.ok(decision.blockerCodes.includes("entity_resolution_not_confirmed"));
  }

  const expired = evaluateBackgroundEntityResolutionClaim({
    claim: { ...BASE_CLAIM, expires_at: "2026-01-01T00:00:00.000Z" },
    now: new Date("2026-06-15T00:00:00.000Z"),
    purposeCode: "moral_trade_offer",
    surface: "opportunity_briefs",
  });
  const wrongPurpose = evaluateBackgroundEntityResolutionClaim({
    claim: BASE_CLAIM,
    purposeCode: "community_intro",
    surface: "opportunity_briefs",
  });
  const wrongSurface = evaluateBackgroundEntityResolutionClaim({
    claim: BASE_CLAIM,
    purposeCode: "moral_trade_offer",
    surface: "counterparty_prompt",
  });

  assert.ok(expired.blockerCodes.includes("entity_resolution_expired"));
  assert.ok(wrongPurpose.blockerCodes.includes("entity_resolution_purpose_out_of_scope"));
  assert.ok(wrongSurface.blockerCodes.includes("entity_resolution_surface_out_of_scope"));
});

test("entity-resolution storage is internal and not a requester-visible identity graph", () => {
  const migrationSource = readFileSync(
    "supabase/migrations/20260615_background_identity_boundary_controls.sql",
    "utf8",
  );
  const typesSource = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.match(migrationSource, /background_entity_resolution_claims/);
  assert.match(migrationSource, /enable row level security/);
  assert.match(migrationSource, /grant all on public\.background_entity_resolution_claims to service_role/);
  assert.doesNotMatch(
    migrationSource,
    /background_entity_resolution_claims[\s\S]{0,600}to authenticated/,
  );
  assert.match(typesSource, /background_entity_resolution_claims/);
  assert.match(typesSource, /model_suggested_duplicate/);
});
