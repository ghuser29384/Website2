import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  auditMoralTradeIncidentReadinessGate,
  getMoralTradeIncidentResponseProfile,
  validateMoralTradeIncidentResponseProfile,
} from "@/lib/moral-trade/incident-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const profile = getMoralTradeIncidentResponseProfile();
  const validation = validateMoralTradeIncidentResponseProfile(profile);

  return buildMoralTradeApiJsonResponse({
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
