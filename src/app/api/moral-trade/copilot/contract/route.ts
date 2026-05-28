import { NextResponse } from "next/server";

import {
  getMoralTradeCopilotContract,
  validateMoralTradeCopilotContract,
} from "@/lib/moral-trade/copilot";

export const dynamic = "force-dynamic";

export async function GET() {
  const contract = getMoralTradeCopilotContract();
  const validation = validateMoralTradeCopilotContract(contract);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      permittedRoles: contract.permittedRoles.map((role) => role.key),
      strictInputBundle: contract.strictInputBundle,
      approvedOutputSections: contract.approvedOutputSections,
      guardrailCodes: contract.guardrails.map((guardrail) => guardrail.code),
      verificationSteps: contract.verificationLoop.map((step) => step.key),
      rolloutStages: contract.rolloutStages.map((stage) => stage.key),
      humanControlledDecisions: contract.humanControlledDecisions,
      fallbackRule: contract.fallbackRule,
    },
    blockers: validation.blockers,
  });
}
