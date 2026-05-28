import securityProfileJson from "../../../config/moral-trade/security-profile.json";

export const MORAL_TRADE_SECURITY_VALIDATOR_VERSION =
  "moral-trade-security-validator-v0.1";

export type MoralTradeSecurityControlStatus =
  | "implemented"
  | "provider_boundary"
  | "required_before_scale"
  | "not_claimed";

export type MoralTradeSecurityControl = {
  key: string;
  label: string;
  status: MoralTradeSecurityControlStatus;
  evidence: string;
  publicClaim: string;
};

export type MoralTradeSecurityScaleGate = {
  key: string;
  label: string;
  requires: string[];
  rule: string;
};

export type MoralTradeSecurityProfile = {
  version: string;
  purpose: string;
  controls: MoralTradeSecurityControl[];
  scaleGates: MoralTradeSecurityScaleGate[];
  publicNonClaims: string[];
  securityTests: string[];
};

export interface MoralTradeSecurityCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeSecurityValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-security-profile";
  validatorVersion: string;
  profileVersion: string;
  checks: MoralTradeSecurityCheck[];
  blockers: string[];
}

export interface MoralTradeSecurityScaleReadiness {
  status: "pass" | "blocked";
  gateKey: string;
  requiredControls: string[];
  blockers: string[];
}

const securityProfile = securityProfileJson as MoralTradeSecurityProfile;

const REQUIRED_CONTROLS = [
  "hsts_csp_headers",
  "private_no_store_cache",
  "supabase_auth_cookies",
  "provider_encryption_at_rest",
  "field_level_encryption_not_claimed",
  "server_only_secret_management",
  "two_factor_admin_gate",
  "device_session_review_gate",
  "key_rotation_gate",
  "platform_abuse_throttling",
  "incident_response_reporting",
] as const;

const REQUIRED_SCALE_GATES = [
  "sensitive_admin_scale",
  "paid_action_volume_scale",
  "trust_badge_scale",
] as const;

const REQUIRED_PUBLIC_NON_CLAIMS = [
  /field-level encryption/i,
  /MFA|2FA/i,
  /key-rotation|key rotation/i,
  /zero security risk/i,
] as const;

const REQUIRED_SECURITY_TESTS = [
  "security_profile_validator",
  "security_scale_gate_audit",
  "no_overclaim_nonclaim_smoke",
  "private_cache_header_smoke",
  "security_health_route_contract_smoke",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeSecurityCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function controlsByKey(profile: MoralTradeSecurityProfile) {
  return new Map(profile.controls.map((control) => [control.key, control]));
}

export function getMoralTradeSecurityProfile() {
  return securityProfile;
}

export function auditMoralTradeSecurityScaleReadiness({
  gateKey,
  profile = securityProfile,
}: {
  gateKey: string;
  profile?: MoralTradeSecurityProfile;
}): MoralTradeSecurityScaleReadiness {
  const gate = profile.scaleGates.find((entry) => entry.key === gateKey);
  const controls = controlsByKey(profile);

  if (!gate) {
    return {
      status: "blocked",
      gateKey,
      requiredControls: [],
      blockers: [`unknown_security_scale_gate:${gateKey}`],
    };
  }

  const blockers = gate.requires.flatMap((controlKey) => {
    const control = controls.get(controlKey);

    if (!control) {
      return [`scale_control_missing:${controlKey}`];
    }

    if (control.status === "required_before_scale" || control.status === "not_claimed") {
      return [`scale_control_not_ready:${controlKey}`];
    }

    return [];
  });

  return {
    status: blockers.length ? "blocked" : "pass",
    gateKey,
    requiredControls: gate.requires,
    blockers,
  };
}

export function validateMoralTradeSecurityProfile(
  profile: MoralTradeSecurityProfile = securityProfile,
): MoralTradeSecurityValidation {
  const controlKeys = profile.controls.map((control) => control.key);
  const scaleGateKeys = profile.scaleGates.map((gate) => gate.key);
  const controlMap = controlsByKey(profile);
  const gateReferences = profile.scaleGates.flatMap((gate) => gate.requires);
  const checks = [
    check(
      "required-security-controls",
      "Security controls and honest status labels",
      hasAll(controlKeys, REQUIRED_CONTROLS) &&
        profile.controls.every((control) => control.evidence && control.publicClaim),
      controlKeys.join(", "),
    ),
    check(
      "browser-and-session-controls",
      "Browser headers, private cache, and Supabase session controls",
      controlMap.get("hsts_csp_headers")?.status === "implemented" &&
        controlMap.get("private_no_store_cache")?.status === "implemented" &&
        controlMap.get("supabase_auth_cookies")?.status === "implemented",
      ["hsts_csp_headers", "private_no_store_cache", "supabase_auth_cookies"]
        .map((key) => `${key}:${controlMap.get(key)?.status ?? "missing"}`)
        .join(", "),
    ),
    check(
      "provider-boundary-and-nonclaims",
      "Provider encryption boundary and non-claims are explicit",
      controlMap.get("provider_encryption_at_rest")?.status === "provider_boundary" &&
        controlMap.get("field_level_encryption_not_claimed")?.status === "not_claimed" &&
        REQUIRED_PUBLIC_NON_CLAIMS.every((pattern) =>
          profile.publicNonClaims.some((entry) => pattern.test(entry)),
        ),
      profile.publicNonClaims.join(" | "),
    ),
    check(
      "admin-and-key-scale-gates",
      "2FA, device/session review, key rotation, and incident response gate sensitive scale",
      controlMap.get("two_factor_admin_gate")?.status === "required_before_scale" &&
        controlMap.get("device_session_review_gate")?.status === "required_before_scale" &&
        controlMap.get("key_rotation_gate")?.status === "required_before_scale" &&
        controlMap.get("incident_response_reporting")?.status === "required_before_scale",
      ["two_factor_admin_gate", "device_session_review_gate", "key_rotation_gate", "incident_response_reporting"]
        .map((key) => `${key}:${controlMap.get(key)?.status ?? "missing"}`)
        .join(", "),
    ),
    check(
      "scale-gates",
      "Scale gates reference known controls",
      hasAll(scaleGateKeys, REQUIRED_SCALE_GATES) &&
        gateReferences.every((controlKey) => controlMap.has(controlKey)),
      profile.scaleGates.map((gate) => `${gate.key}->${gate.requires.join("+")}`).join(", "),
    ),
    check(
      "security-tests",
      "Security test hooks",
      hasAll(profile.securityTests, REQUIRED_SECURITY_TESTS),
      profile.securityTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-security-profile",
    validatorVersion: MORAL_TRADE_SECURITY_VALIDATOR_VERSION,
    profileVersion: profile.version,
    checks,
    blockers,
  };
}
