import assert from "node:assert/strict";
import test from "node:test";

import {
  auditMoralTradeIncidentReadinessGate,
  getMoralTradeIncidentResponseProfile,
  validateMoralTradeIncidentResponseProfile,
  type MoralTradeIncidentResponseProfile,
} from "@/lib/moral-trade/incident-response";

test("incident response profile publishes intake, severity, disclosure, and readiness controls", () => {
  const profile = getMoralTradeIncidentResponseProfile();
  const validation = validateMoralTradeIncidentResponseProfile(profile);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(profile.intakeChannels.some((channel) => channel.key === "privacy_data_request"));
  assert.ok(profile.incidentCategories.some((category) => category.key === "privacy_leakage"));
  assert.ok(profile.incidentCategories.some((category) => category.key === "copilot_output_violation"));
  assert.ok(profile.severityLevels.some((severity) => severity.key === "sev0_active_sensitive_exposure"));
  assert.ok(profile.responsePhases.some((phase) => phase.key === "affected_participant_notice"));
  assert.ok(profile.responsePhases.some((phase) => phase.key === "public_aggregate_update"));
  assert.ok(profile.disclosureRules.some((rule) => rule.key === "no_private_details_in_public_postmortem"));
  assert.ok(profile.readinessGates.some((gate) => gate.key === "paid_action_incident_lane"));
  assert.ok(profile.publicNonClaims.some((entry) => /24\/7 staffed security operations/i.test(entry)));
  assert.ok(profile.incidentTests.includes("incident_response_profile_validator"));
});

test("incident readiness gates pass only when referenced phases are published", () => {
  const readiness = auditMoralTradeIncidentReadinessGate({
    gateKey: "trust_badge_incident_lane",
  });

  assert.equal(readiness.status, "pass");
  assert.deepEqual(readiness.blockers, []);
  assert.ok(readiness.requiredPhases.includes("public_aggregate_update"));

  const unknownReadiness = auditMoralTradeIncidentReadinessGate({
    gateKey: "missing_gate",
  });

  assert.equal(unknownReadiness.status, "blocked");
  assert.ok(
    unknownReadiness.blockers.includes("unknown_incident_readiness_gate:missing_gate"),
  );
});

test("incident response validation fails when privacy-safe public reporting is weakened", () => {
  const profile = getMoralTradeIncidentResponseProfile();
  const weakenedProfile: MoralTradeIncidentResponseProfile = {
    ...profile,
    disclosureRules: profile.disclosureRules.filter(
      (rule) => rule.key !== "no_private_details_in_public_postmortem",
    ),
    publicNonClaims: profile.publicNonClaims.filter((entry) => !/zero incidents/i.test(entry)),
    readinessGates: profile.readinessGates.map((gate) =>
      gate.key === "trust_badge_incident_lane"
        ? { ...gate, requires: ["missing_phase"] }
        : gate,
    ),
  };
  const validation = validateMoralTradeIncidentResponseProfile(weakenedProfile);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("disclosure-rules")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("public-non-claims")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("readiness-gates")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("sample-readiness-audits")));
});
