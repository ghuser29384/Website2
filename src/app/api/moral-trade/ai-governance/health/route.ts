import { NextResponse } from "next/server";

import {
  getMoralTradeAiGovernanceProfile,
  validateMoralTradeAiGovernanceProfile,
} from "@/lib/moral-trade/ai-governance";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = getMoralTradeAiGovernanceProfile();
  const validation = validateMoralTradeAiGovernanceProfile(profile);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    decisioningMode: profile.decisioningMode,
    mlEnabledForMatching: profile.mlEnabledForMatching,
    mlEnabledForStateChanges: profile.mlEnabledForStateChanges,
    validation,
    publicContract: {
      requiredDocumentationBeforeMl: profile.requiredDocumentationBeforeMl.map(
        (entry) => entry.key,
      ),
      permittedAutomation: profile.permittedAutomation.map((entry) => entry.key),
      prohibitedUses: profile.prohibitedUses.map((entry) => entry.key),
      fairnessDocumentation: profile.fairnessDocumentation,
      explanationControls: profile.explanationControls.map((entry) => entry.key),
      externalStandards: profile.externalStandards.map((entry) => entry.key),
      humanControlledDecisions: profile.humanControlledDecisions,
      governanceTests: profile.governanceTests,
    },
    blockers: validation.blockers,
  });
}
