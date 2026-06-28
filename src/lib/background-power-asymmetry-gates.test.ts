import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BACKGROUND_HIGH_DEPENDENCY_CONTEXTS,
  evaluateBackgroundPowerAsymmetryGate,
} from "@/lib/background-identity-boundaries";

const APPROVED_REVIEW = {
  allowed_surface_keys: ["opportunity_briefs", "intro_requests", "counterparty_prompts"],
  boost_policy: "boosts_prohibited" as const,
  expires_at: "2099-01-01T00:00:00.000Z",
  purpose_code: "moral_trade_offer" as const,
  purpose_policy_version: "background-purpose-policy-v1" as const,
  relationship_context: "funder_grantee" as const,
  review_state: "approved" as const,
  safeguard_label: "review/consent safeguard",
};

test("configured high-dependency contexts require power-asymmetry review safeguards", () => {
  for (const context of BACKGROUND_HIGH_DEPENDENCY_CONTEXTS) {
    const missing = evaluateBackgroundPowerAsymmetryGate({
      purposeCode: "moral_trade_offer",
      relationshipContext: context,
      review: null,
      surface: "opportunity_briefs",
    });

    assert.equal(missing.allowed, false, `${context} should require review`);
    assert.ok(missing.blockerCodes.includes("power_asymmetry_review_missing"));
    assert.equal(missing.requesterSafeLabel, "review_consent_safeguard");
    assert.equal(missing.boostsAllowed, false);
  }
});

test("approved power-asymmetry review must match purpose, surface, context, and freshness", () => {
  const approved = evaluateBackgroundPowerAsymmetryGate({
    purposeCode: "moral_trade_offer",
    relationshipContext: "funder_grantee",
    review: APPROVED_REVIEW,
    surface: "opportunity_briefs",
  });
  const pending = evaluateBackgroundPowerAsymmetryGate({
    purposeCode: "moral_trade_offer",
    relationshipContext: "funder_grantee",
    review: { ...APPROVED_REVIEW, review_state: "pending_review" },
    surface: "opportunity_briefs",
  });
  const wrongPurpose = evaluateBackgroundPowerAsymmetryGate({
    purposeCode: "community_intro",
    relationshipContext: "funder_grantee",
    review: APPROVED_REVIEW,
    surface: "opportunity_briefs",
  });
  const wrongSurface = evaluateBackgroundPowerAsymmetryGate({
    purposeCode: "moral_trade_offer",
    relationshipContext: "funder_grantee",
    review: APPROVED_REVIEW,
    surface: "field_disclosure",
  });
  const expired = evaluateBackgroundPowerAsymmetryGate({
    now: new Date("2100-01-01T00:00:00.000Z"),
    purposeCode: "moral_trade_offer",
    relationshipContext: "funder_grantee",
    review: APPROVED_REVIEW,
    surface: "opportunity_briefs",
  });

  assert.equal(approved.allowed, true);
  assert.equal(approved.boostsAllowed, false);
  assert.ok(pending.blockerCodes.includes("power_asymmetry_review_not_approved"));
  assert.ok(wrongPurpose.blockerCodes.includes("power_asymmetry_purpose_out_of_scope"));
  assert.ok(wrongSurface.blockerCodes.includes("power_asymmetry_surface_out_of_scope"));
  assert.ok(expired.blockerCodes.includes("power_asymmetry_review_expired"));
});

test("ordinary contexts still prohibit boost semantics but do not require dependency review", () => {
  const ordinary = evaluateBackgroundPowerAsymmetryGate({
    purposeCode: "moral_trade_offer",
    relationshipContext: "none",
    review: null,
    surface: "opportunity_briefs",
  });

  assert.equal(ordinary.allowed, true);
  assert.equal(ordinary.boostsAllowed, false);
  assert.equal(ordinary.requesterSafeLabel, "standard_review");
});

test("power-asymmetry storage uses generic safeguards and blocks ranking/payment-priority semantics", () => {
  const migrationSource = readFileSync(
    "supabase/migrations/20260615_background_identity_boundary_controls.sql",
    "utf8",
  );
  const typesSource = readFileSync("src/lib/supabase/database.types.ts", "utf8");
  const helperSource = readFileSync("src/lib/background-identity-boundaries.ts", "utf8");

  assert.match(migrationSource, /background_power_asymmetry_reviews/);
  assert.match(migrationSource, /boosts_prohibited/);
  assert.match(migrationSource, /review\/consent safeguard/);
  assert.match(migrationSource, /enable row level security/);
  assert.match(typesSource, /background_power_asymmetry_reviews/);
  assert.doesNotMatch(helperSource, /urgency|scarcity|vulnerability|advertising|payment_priority/);
});
