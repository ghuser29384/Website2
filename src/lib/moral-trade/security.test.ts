import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  auditMoralTradeSecurityScaleReadiness,
  getMoralTradeSecurityProfile,
  validateMoralTradeSecurityImplementation,
  validateMoralTradeSecurityProfile,
  type MoralTradeSecurityProfile,
} from "@/lib/moral-trade/security";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

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
  assert.equal(
    profile.controls.find((control) => control.key === "background_field_encryption_keyring")?.status,
    "implemented",
  );
  assert.ok(profile.publicNonClaims.some((entry) => /MFA|2FA/i.test(entry)));
  assert.equal(
    profile.controls.find((control) => control.key === "two_factor_admin_gate")?.status,
    "implemented",
  );
  assert.equal(
    profile.controls.find((control) => control.key === "participant_session_review_revocation")?.status,
    "implemented",
  );
  assert.equal(
    profile.controls.find((control) => control.key === "incident_response_reporting")?.status,
    "implemented",
  );
  assert.ok(profile.publicNonClaims.some((entry) => /24\/7 staffed security operations/i.test(entry)));
  assert.ok(profile.scaleGates.some((gate) => gate.key === "sensitive_admin_scale"));
  assert.ok(profile.securityTests.includes("security_implementation_source_smoke"));
});

test("security implementation source keeps headers, cache, and sessions aligned", () => {
  const validation = validateMoralTradeSecurityImplementation({
    actionsSource: readRepoFile("src/app/actions.ts"),
    adminSource: readRepoFile("src/lib/admin.ts"),
    backgroundAccountSecuritySource: readRepoFile("src/lib/background-account-security.ts"),
    backgroundAccountSecurityPanelSource: readRepoFile(
      "src/components/dashboard/background-account-security-panel.tsx",
    ),
    backgroundActionsSource: readRepoFile("src/app/background-networking/actions.ts"),
    backgroundFieldEncryptionSource: readRepoFile("src/lib/background-field-encryption.ts"),
    mpgfAdminActionsSource: readRepoFile("src/app/mpgf/admin/actions.ts"),
    nextConfigSource: readRepoFile("next.config.ts"),
    supabaseProxySource: readRepoFile("src/lib/supabase/proxy.ts"),
    supabaseServerSource: readRepoFile("src/lib/supabase/server.ts"),
  });

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.ok(
    validation.checks.some(
      (check) => check.id === "supabase-session-refresh-source" && check.status === "pass",
    ),
  );
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

test("security scale readiness blocks sensitive admin expansion until sessions and keys are ready", () => {
  const readiness = auditMoralTradeSecurityScaleReadiness({
    gateKey: "sensitive_admin_scale",
  });

  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.blockers.includes("scale_control_not_ready:two_factor_admin_gate"), false);
  assert.ok(readiness.blockers.includes("scale_control_not_ready:device_session_review_gate"));
  assert.ok(readiness.blockers.includes("scale_control_not_ready:key_rotation_gate"));
  assert.equal(readiness.blockers.includes("scale_control_not_ready:incident_response_reporting"), false);
});

test("security scale readiness passes when a gate's required controls are implemented or provider-boundary controls", () => {
  const profile = getMoralTradeSecurityProfile();
  const readyProfile: MoralTradeSecurityProfile = {
    ...profile,
    controls: profile.controls.map((control) =>
      [
        "two_factor_admin_gate",
        "participant_session_review_revocation",
        "device_session_review_gate",
        "key_rotation_gate",
        "incident_response_reporting",
      ].includes(
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
