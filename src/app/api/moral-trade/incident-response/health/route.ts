import { NextResponse } from "next/server";

import {
  auditMoralTradeIncidentReadinessGate,
  getMoralTradeIncidentResponseProfile,
  validateMoralTradeIncidentResponseProfile,
} from "@/lib/moral-trade/incident-response";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = getMoralTradeIncidentResponseProfile();
  const validation = validateMoralTradeIncidentResponseProfile(profile);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    validation,
    publicContract: {
      intakeChannels: profile.intakeChannels.map((channel) => channel.key),
      incidentCategories: profile.incidentCategories.map((category) => ({
        key: category.key,
        owner: category.owner,
      })),
      severityLevels: profile.severityLevels.map((severity) => ({
        key: severity.key,
        responseSlaHours: severity.responseSlaHours,
        notificationSlaHours: severity.notificationSlaHours,
      })),
      responsePhases: profile.responsePhases.map((phase) => phase.key),
      disclosureRules: profile.disclosureRules.map((rule) => rule.key),
      readinessGates: profile.readinessGates.map((gate) => ({
        key: gate.key,
        requires: gate.requires,
        readiness: auditMoralTradeIncidentReadinessGate({
          gateKey: gate.key,
          profile,
        }),
      })),
      publicNonClaims: profile.publicNonClaims,
      incidentTests: profile.incidentTests,
    },
    blockers: validation.blockers,
  });
}
