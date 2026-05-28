import assert from "node:assert/strict";
import test from "node:test";

import {
  auditMoralTradeSecurityScaleReadiness,
  getMoralTradeSecurityProfile,
  validateMoralTradeSecurityProfile,
  type MoralTradeSecurityProfile,
} from "@/lib/moral-trade/security";

test("security profile publishes headers, sessions, provider boundaries, non-claims, and scale gates", () => {
  const profile = getMoralTradeSecurityProfile();
  const validation = validateMoralTradeSecurityProfile(profile);

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.ok(profile.controls.some((control) => control.key === "hsts_csp_headers"));
  assert.ok(profile.controls.some((control) => control.key === "supabase_auth_cookies"));
  assert.equal(
    profile.controls.find((control) => control.key === "provider_encryption_at_rest")?.status,
    "provider_boundary",
  );
  assert.equal(
    profile.controls.find((control) => control.key === "field_level_encryption_not_claimed")?.status,
    "not_claimed",
  );
  assert.ok(profile.publicNonClaims.some((entry) => /MFA|2FA/i.test(entry)));
  assert.ok(profile.scaleGates.some((gate) => gate.key === "sensitive_admin_scale"));
});

test("security validation fails if provider boundaries are overclaimed or scale gates disappear", () => {
  const profile = getMoralTradeSecurityProfile();
  const weakenedProfile: MoralTradeSecurityProfile = {
    ...profile,
    controls: profile.controls.map((control) =>
      control.key === "field_level_encryption_not_claimed"
        ? { ...control, status: "implemented" }
        : control,
    ),
    publicNonClaims: profile.publicNonClaims.filter((entry) => !/field-level encryption/i.test(entry)),
    scaleGates: profile.scaleGates.filter((gate) => gate.key !== "sensitive_admin_scale"),
  };
  const validation = validateMoralTradeSecurityProfile(weakenedProfile);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("provider-boundary-and-nonclaims")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("scale-gates")));
});

test("security scale readiness blocks sensitive admin expansion until 2FA, sessions, keys, and incidents are ready", () => {
  const readiness = auditMoralTradeSecurityScaleReadiness({
    gateKey: "sensitive_admin_scale",
  });

  assert.equal(readiness.status, "blocked");
  assert.ok(readiness.blockers.includes("scale_control_not_ready:two_factor_admin_gate"));
  assert.ok(readiness.blockers.includes("scale_control_not_ready:device_session_review_gate"));
  assert.ok(readiness.blockers.includes("scale_control_not_ready:key_rotation_gate"));
  assert.ok(readiness.blockers.includes("scale_control_not_ready:incident_response_reporting"));
});

test("security scale readiness passes when a gate's required controls are implemented or provider-boundary controls", () => {
  const profile = getMoralTradeSecurityProfile();
  const readyProfile: MoralTradeSecurityProfile = {
    ...profile,
    controls: profile.controls.map((control) =>
      ["two_factor_admin_gate", "device_session_review_gate", "key_rotation_gate", "incident_response_reporting"].includes(
        control.key,
      )
        ? { ...control, status: "implemented" }
        : control,
    ),
  };
  const readiness = auditMoralTradeSecurityScaleReadiness({
    gateKey: "sensitive_admin_scale",
    profile: readyProfile,
  });

  assert.equal(readiness.status, "pass");
  assert.deepEqual(readiness.blockers, []);
});
