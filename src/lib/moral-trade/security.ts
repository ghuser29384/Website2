import securityProfileJson from "../../../config/moral-trade/security-profile.json";

export const MORAL_TRADE_SECURITY_VALIDATOR_VERSION =
  "moral-trade-security-validator-v0.3";

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

export interface MoralTradeSecurityImplementationValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-security-implementation";
  validatorVersion: string;
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
  "background_field_encryption_keyring",
  "server_only_secret_management",
  "two_factor_admin_gate",
  "participant_session_review_revocation",
  "contact_disclosure_mfa_step_up",
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
  "security_implementation_source_smoke",
  "no_overclaim_nonclaim_smoke",
  "private_cache_header_smoke",
  "security_profile_incident_lane_smoke",
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

export function validateMoralTradeSecurityImplementation({
  actionsSource,
  adminSource,
  backgroundDisclosureSource,
  backgroundAccountSecuritySource,
  backgroundAccountSecurityPanelSource,
  backgroundActionsSource,
  backgroundFieldEncryptionSource,
  mpgfAdminActionsSource,
  nextConfigSource,
  supabaseProxySource,
  supabaseServerSource,
}: {
  actionsSource: string;
  adminSource: string;
  backgroundDisclosureSource: string;
  backgroundAccountSecuritySource: string;
  backgroundAccountSecurityPanelSource: string;
  backgroundActionsSource: string;
  backgroundFieldEncryptionSource: string;
  mpgfAdminActionsSource: string;
  nextConfigSource: string;
  supabaseProxySource: string;
  supabaseServerSource: string;
}): MoralTradeSecurityImplementationValidation {
  const checks = [
    check(
      "security-headers-source",
      "Security headers are implemented in Next config",
      /Strict-Transport-Security/.test(nextConfigSource) &&
        /max-age=63072000;\s*includeSubDomains;\s*preload/.test(nextConfigSource) &&
        /X-Content-Type-Options/.test(nextConfigSource) &&
        /nosniff/.test(nextConfigSource) &&
        /X-Frame-Options/.test(nextConfigSource) &&
        /DENY/.test(nextConfigSource) &&
        /Referrer-Policy/.test(nextConfigSource) &&
        /Permissions-Policy/.test(nextConfigSource) &&
        /Content-Security-Policy-Report-Only/.test(nextConfigSource) &&
        /frame-ancestors 'none'/.test(nextConfigSource),
      "next.config.ts should publish HSTS, nosniff, frame denial, referrer, permissions, and CSP report-only headers.",
    ),
    check(
      "private-no-store-source",
      "Private route cache headers are implemented",
      /Cache-Control/.test(nextConfigSource) &&
        /private,\s*no-store,\s*max-age=0/.test(nextConfigSource) &&
        /source:\s*"\/dashboard\/:path\*"/.test(nextConfigSource) &&
        /source:\s*"\/admin\/:path\*"/.test(nextConfigSource) &&
        /source:\s*"\/agreements\/:path\*"/.test(nextConfigSource) &&
        /source:\s*"\/saved-offers\/:path\*"/.test(nextConfigSource) &&
        /source:\s*"\/mpgf\/admin\/:path\*"/.test(nextConfigSource) &&
        /source:\s*"\/mpgf\/account\/:path\*"/.test(nextConfigSource) &&
        /source:\s*"\/api\/profile\/:path\*"/.test(nextConfigSource) &&
        /source:\s*"\/api\/background\/:path\*"/.test(nextConfigSource) &&
        /source:\s*"\/api\/jobs\/:path\*"/.test(nextConfigSource) &&
        /source:\s*"\/api\/saved-searches"/.test(nextConfigSource) &&
        /source:\s*"\/api\/wish-registry\/search"/.test(nextConfigSource),
      "dashboard, admin, agreement, saved-offer, MPGF account/admin, profile API, background API, job API, saved-search, and wish-registry search routes should be private no-store.",
    ),
    check(
      "supabase-session-refresh-source",
      "Supabase session refresh stays server-side",
      /createServerClient<Database>/.test(supabaseProxySource) &&
        /request\.cookies\.getAll/.test(supabaseProxySource) &&
        /response\.cookies\.set/.test(supabaseProxySource) &&
        /supabase\.auth\.getClaims/.test(supabaseProxySource) &&
        /SESSION_REFRESH_TIMEOUT_MS/.test(supabaseProxySource),
      "proxy session refresh should use server-side cookies, getClaims, and a timeout.",
    ),
    check(
      "service-role-no-session-source",
      "Service-role Supabase client does not persist sessions",
      /getSupabaseServiceEnv/.test(supabaseServerSource) &&
        /createSupabaseClient<Database>/.test(supabaseServerSource) &&
        /persistSession:\s*false/.test(supabaseServerSource),
      "service-role clients must not persist browser sessions.",
    ),
    check(
      "operator-mfa-gate-source",
      "Admin and operator mutations require active authenticator MFA",
      /evaluateAdminOperatorAccess/.test(adminSource) &&
        /verifiedTotpCount < 1/.test(adminSource) &&
        /currentLevel !== "aal2"/.test(adminSource) &&
        /loadBackgroundAccountSecuritySummary/.test(actionsSource) &&
        /evaluateAdminOperatorAccess/.test(actionsSource) &&
        /loadBackgroundAccountSecuritySummary/.test(backgroundActionsSource) &&
        /evaluateAdminOperatorAccess/.test(backgroundActionsSource) &&
        /loadBackgroundAccountSecuritySummary/.test(mpgfAdminActionsSource) &&
        /evaluateAdminOperatorAccess/.test(mpgfAdminActionsSource),
      "admin routes and review actions should require allowlisted email plus an active Supabase AAL2 MFA session.",
    ),
    check(
      "background-field-encryption-keyring-source",
      "Background field encryption uses a versioned keyring and fail-closed saves",
      /BACKGROUND_FIELD_ENCRYPTION_KEYS/.test(backgroundFieldEncryptionSource) &&
        /BACKGROUND_FIELD_ENCRYPTION_ACTIVE_KEY_ID/.test(backgroundFieldEncryptionSource) &&
        /bgenc:v2/.test(backgroundFieldEncryptionSource) &&
        /legacy/i.test(backgroundFieldEncryptionSource) &&
        /rotationReady/.test(backgroundFieldEncryptionSource) &&
        /BACKGROUND_FIELD_ENCRYPTION_KEYS or BACKGROUND_FIELD_ENCRYPTION_KEY/.test(
          backgroundFieldEncryptionSource,
      ),
      "background sensitive text should encrypt with versioned key ids, support legacy decrypt, and fail closed without configured key material.",
    ),
    check(
      "participant-session-review-source",
      "Participant session review and other-session revocation are implemented",
      /BACKGROUND_SESSION_REVIEW_CONTROL_VERSION/.test(backgroundAccountSecuritySource) &&
        /getClaims/.test(backgroundAccountSecuritySource) &&
        /session_id/.test(backgroundAccountSecuritySource) &&
        /accessTokenWindowStatus/.test(backgroundAccountSecuritySource) &&
        /signOut\(\{\s*scope:\s*"others"\s*\}\)/.test(backgroundActionsSource) &&
        /Revoke other sessions/.test(backgroundAccountSecurityPanelSource) &&
        /sessionIdSuffix/.test(backgroundAccountSecurityPanelSource),
      "participants should see current-session JWT review data and be able to revoke other Supabase sessions from the dashboard.",
    ),
    check(
      "contact-disclosure-step-up-source",
      "Contact disclosure requires MFA step-up before contact details can be released",
      /requiresContactDisclosureStepUp/.test(backgroundDisclosureSource) &&
        /accessLevel === "contact"/.test(backgroundDisclosureSource) &&
        /contact_email/.test(backgroundDisclosureSource) &&
        /introduced/.test(backgroundDisclosureSource),
      "contact-level grants or contact_email disclosure should require step-up and introduced-stage disclosure.",
    ),
    check(
      "attribution-cookie-boundary-source",
      "Attribution cookie keeps narrow security boundary",
      /sameSite:\s*"lax"/.test(supabaseProxySource) &&
        /secure:\s*request\.nextUrl\.protocol === "https:"/.test(supabaseProxySource) &&
        /httpOnly:\s*false/.test(supabaseProxySource) &&
        /ATTRIBUTION_COOKIE_NAME/.test(supabaseProxySource),
      "analytics attribution cookies should be SameSite=Lax, secure on HTTPS, and separate from auth cookies.",
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-security-implementation",
    validatorVersion: MORAL_TRADE_SECURITY_VALIDATOR_VERSION,
    checks,
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
        controlMap.get("background_field_encryption_keyring")?.status === "implemented" &&
        REQUIRED_PUBLIC_NON_CLAIMS.every((pattern) =>
          profile.publicNonClaims.some((entry) => pattern.test(entry)),
        ),
      profile.publicNonClaims.join(" | "),
    ),
    check(
      "admin-and-key-scale-gates",
      "MFA is enforced while device/session review and key rotation still gate sensitive scale",
        controlMap.get("two_factor_admin_gate")?.status === "implemented" &&
        controlMap.get("participant_session_review_revocation")?.status === "implemented" &&
        controlMap.get("contact_disclosure_mfa_step_up")?.status === "implemented" &&
        controlMap.get("device_session_review_gate")?.status === "required_before_scale" &&
        controlMap.get("key_rotation_gate")?.status === "required_before_scale",
      [
        "two_factor_admin_gate",
        "participant_session_review_revocation",
        "contact_disclosure_mfa_step_up",
        "device_session_review_gate",
        "key_rotation_gate",
      ]
        .map((key) => `${key}:${controlMap.get(key)?.status ?? "missing"}`)
        .join(", "),
    ),
    check(
      "incident-response-lane",
      "Incident response is published without overclaiming security completion",
      controlMap.get("incident_response_reporting")?.status === "implemented" &&
        /incident-response-profile\.json|incident-response\/health/i.test(
          controlMap.get("incident_response_reporting")?.evidence ?? "",
        ) &&
        profile.publicNonClaims.some((entry) => /24\/7 staffed security operations|zero incidents/i.test(entry)),
      `${controlMap.get("incident_response_reporting")?.status ?? "missing"}; ${profile.publicNonClaims.join(" | ")}`,
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
