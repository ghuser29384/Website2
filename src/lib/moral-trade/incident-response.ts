import incidentResponseProfileJson from "../../../config/moral-trade/incident-response-profile.json";

export const MORAL_TRADE_INCIDENT_RESPONSE_VALIDATOR_VERSION =
  "moral-trade-incident-response-validator-v0.1";

export type MoralTradeIncidentSeverityKey =
  | "sev0_active_sensitive_exposure"
  | "sev1_control_or_payment_failure"
  | "sev2_review_integrity_issue"
  | "sev3_service_degradation";

type MoralTradeIncidentIntakeChannel = {
  key: string;
  label: string;
  audience: string;
  rule: string;
};

type MoralTradeIncidentCategory = {
  key: string;
  label: string;
  owner: string;
  examples: string[];
};

type MoralTradeIncidentSeverity = {
  key: MoralTradeIncidentSeverityKey;
  label: string;
  responseSlaHours: number;
  notificationSlaHours: number;
  publicSummary: string;
};

type MoralTradeIncidentResponsePhase = {
  key: string;
  label: string;
  requiredForSeverity: MoralTradeIncidentSeverityKey[];
  rule: string;
};

type MoralTradeIncidentDisclosureRule = {
  key: string;
  label: string;
  rule: string;
};

type MoralTradeIncidentReadinessGate = {
  key: string;
  label: string;
  requires: string[];
  rule: string;
};

export type MoralTradeIncidentResponseProfile = {
  version: string;
  purpose: string;
  intakeChannels: MoralTradeIncidentIntakeChannel[];
  incidentCategories: MoralTradeIncidentCategory[];
  severityLevels: MoralTradeIncidentSeverity[];
  responsePhases: MoralTradeIncidentResponsePhase[];
  disclosureRules: MoralTradeIncidentDisclosureRule[];
  readinessGates: MoralTradeIncidentReadinessGate[];
  publicNonClaims: string[];
  incidentTests: string[];
};

export interface MoralTradeIncidentResponseCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeIncidentResponseValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-incident-response-profile";
  validatorVersion: string;
  profileVersion: string;
  checks: MoralTradeIncidentResponseCheck[];
  blockers: string[];
}

export interface MoralTradeIncidentReadinessAudit {
  status: "pass" | "blocked";
  gateKey: string;
  requiredPhases: string[];
  blockers: string[];
}

const incidentResponseProfile =
  incidentResponseProfileJson as MoralTradeIncidentResponseProfile;

const REQUIRED_INTAKE_CHANNELS = [
  "safety_page_report",
  "privacy_data_request",
  "admin_console_report",
  "provider_alert",
  "validator_health_blocker",
] as const;

const REQUIRED_CATEGORIES = [
  "privacy_leakage",
  "security_control_failure",
  "payment_provider_error",
  "evidence_integrity_issue",
  "unsafe_matching_or_disclosure",
  "availability_route_failure",
  "copilot_output_violation",
] as const;

const REQUIRED_SEVERITIES = [
  "sev0_active_sensitive_exposure",
  "sev1_control_or_payment_failure",
  "sev2_review_integrity_issue",
  "sev3_service_degradation",
] as const;

const REQUIRED_PHASES = [
  "triage_and_severity",
  "containment_and_pause",
  "affected_participant_notice",
  "provider_escalation",
  "root_cause_and_correction",
  "public_aggregate_update",
  "validator_and_backlog_update",
] as const;

const REQUIRED_DISCLOSURE_RULES = [
  "affected_participant_notice_required",
  "public_aggregate_only",
  "no_private_details_in_public_postmortem",
  "validator_blockers_linked",
  "human_review_before_reopening",
] as const;

const REQUIRED_READINESS_GATES = [
  "trust_badge_incident_lane",
  "paid_action_incident_lane",
  "copilot_assist_incident_lane",
] as const;

const REQUIRED_PUBLIC_NON_CLAIMS = [
  /24\/7 staffed security operations/i,
  /zero incidents|zero residual security risk/i,
  /raw private wishes|source notes|contact details|payment secrets|provider payloads/i,
  /MFA|device\/session review|key rotation|field-level encryption/i,
] as const;

const REQUIRED_TESTS = [
  "incident_response_profile_validator",
  "incident_readiness_gate_audit",
  "incident_privacy_boundary_smoke",
  "incident_health_route_contract_smoke",
  "security_profile_incident_lane_smoke",
  "technical_spec_incident_response_smoke",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeIncidentResponseCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function phasesByKey(profile: MoralTradeIncidentResponseProfile) {
  return new Map(profile.responsePhases.map((phase) => [phase.key, phase]));
}

function severityKeys(profile: MoralTradeIncidentResponseProfile) {
  return profile.severityLevels.map((severity) => severity.key);
}

export function getMoralTradeIncidentResponseProfile() {
  return incidentResponseProfile;
}

export function auditMoralTradeIncidentReadinessGate({
  gateKey,
  profile = incidentResponseProfile,
}: {
  gateKey: string;
  profile?: MoralTradeIncidentResponseProfile;
}): MoralTradeIncidentReadinessAudit {
  const gate = profile.readinessGates.find((entry) => entry.key === gateKey);
  const phases = phasesByKey(profile);

  if (!gate) {
    return {
      status: "blocked",
      gateKey,
      requiredPhases: [],
      blockers: [`unknown_incident_readiness_gate:${gateKey}`],
    };
  }

  const blockers = gate.requires.flatMap((phaseKey) => {
    const phase = phases.get(phaseKey);

    if (!phase) {
      return [`incident_phase_missing:${phaseKey}`];
    }

    if (!phase.rule || phase.requiredForSeverity.length === 0) {
      return [`incident_phase_incomplete:${phaseKey}`];
    }

    return [];
  });

  return {
    status: blockers.length ? "blocked" : "pass",
    gateKey,
    requiredPhases: gate.requires,
    blockers,
  };
}

export function validateMoralTradeIncidentResponseProfile(
  profile: MoralTradeIncidentResponseProfile = incidentResponseProfile,
): MoralTradeIncidentResponseValidation {
  const intakeKeys = profile.intakeChannels.map((channel) => channel.key);
  const categoryKeys = profile.incidentCategories.map((category) => category.key);
  const phaseKeys = profile.responsePhases.map((phase) => phase.key);
  const severityKeyList = severityKeys(profile);
  const disclosureRuleKeys = profile.disclosureRules.map((rule) => rule.key);
  const readinessGateKeys = profile.readinessGates.map((gate) => gate.key);
  const readinessPhaseReferences = profile.readinessGates.flatMap((gate) => gate.requires);
  const severityReferences = profile.responsePhases.flatMap(
    (phase) => phase.requiredForSeverity,
  );
  const phaseMap = phasesByKey(profile);
  const checks = [
    check(
      "intake-channels",
      "Incident intake channels",
      hasAll(intakeKeys, REQUIRED_INTAKE_CHANNELS) &&
        profile.intakeChannels.every((channel) => channel.label && channel.audience && channel.rule),
      intakeKeys.join(", "),
    ),
    check(
      "incident-categories",
      "Incident categories and owners",
      hasAll(categoryKeys, REQUIRED_CATEGORIES) &&
        profile.incidentCategories.every(
          (category) => category.owner && category.examples.length > 0,
        ),
      categoryKeys.join(", "),
    ),
    check(
      "severity-levels",
      "Severity levels and response SLAs",
      hasAll(severityKeyList, REQUIRED_SEVERITIES) &&
        profile.severityLevels.every(
          (severity) =>
            severity.responseSlaHours > 0 &&
            severity.notificationSlaHours >= severity.responseSlaHours &&
            severity.publicSummary,
        ),
      profile.severityLevels
        .map((severity) => `${severity.key}:${severity.responseSlaHours}h`)
        .join(", "),
    ),
    check(
      "response-phases",
      "Response phases cover containment, notice, public aggregates, and validator updates",
      hasAll(phaseKeys, REQUIRED_PHASES) &&
        severityReferences.every((severity) => severityKeyList.includes(severity)) &&
        Boolean(phaseMap.get("containment_and_pause")) &&
        Boolean(phaseMap.get("public_aggregate_update")) &&
        Boolean(phaseMap.get("validator_and_backlog_update")),
      phaseKeys.join(", "),
    ),
    check(
      "disclosure-rules",
      "Disclosure rules stay participant-scoped and privacy-safe",
      hasAll(disclosureRuleKeys, REQUIRED_DISCLOSURE_RULES) &&
        profile.disclosureRules.some((rule) => /raw private records stay redacted/i.test(rule.rule)) &&
        profile.disclosureRules.some((rule) => /Human review before reopening/i.test(rule.label)),
      profile.disclosureRules.map((rule) => rule.key).join(", "),
    ),
    check(
      "readiness-gates",
      "Incident readiness gates reference known response phases",
      hasAll(readinessGateKeys, REQUIRED_READINESS_GATES) &&
        readinessPhaseReferences.every((phaseKey) => phaseMap.has(phaseKey)),
      profile.readinessGates.map((gate) => `${gate.key}->${gate.requires.join("+")}`).join(", "),
    ),
    check(
      "public-non-claims",
      "Public non-claims prevent incident-response overclaiming",
      REQUIRED_PUBLIC_NON_CLAIMS.every((pattern) =>
        profile.publicNonClaims.some((entry) => pattern.test(entry)),
      ),
      profile.publicNonClaims.join(" | "),
    ),
    check(
      "incident-tests",
      "Incident-response test hooks",
      hasAll(profile.incidentTests, REQUIRED_TESTS),
      profile.incidentTests.join(", "),
    ),
  ];
  const readinessAudits = profile.readinessGates.map((gate) =>
    auditMoralTradeIncidentReadinessGate({ gateKey: gate.key, profile }),
  );

  checks.push(
    check(
      "sample-readiness-audits",
      "Sample readiness gates execute",
      readinessAudits.every((audit) => audit.status === "pass"),
      readinessAudits.map((audit) => `${audit.gateKey}:${audit.status}`).join(", "),
    ),
  );

  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-incident-response-profile",
    validatorVersion: MORAL_TRADE_INCIDENT_RESPONSE_VALIDATOR_VERSION,
    profileVersion: profile.version,
    checks,
    blockers,
  };
}
