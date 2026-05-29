import { NextResponse } from "next/server";

import {
  getMoralTradeCopilotContract,
  getMoralTradeCopilotRolloutReadinessAudits,
  validateMoralTradeCopilotContract,
} from "@/lib/moral-trade/copilot";

export const dynamic = "force-dynamic";

export async function GET() {
  const contract = getMoralTradeCopilotContract();
  const validation = validateMoralTradeCopilotContract(contract);
  const rolloutReadiness = getMoralTradeCopilotRolloutReadinessAudits(contract);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      permittedRoles: contract.permittedRoles.map((role) => role.key),
      promptTemplates: contract.promptTemplates.map((template) => ({
        key: template.key,
        safetyCodes: template.safetyCodes,
        outputRequirements: template.outputRequirements,
      })),
      strictInputBundle: contract.strictInputBundle,
      approvedOutputSections: contract.approvedOutputSections,
      guardrailCodes: contract.guardrails.map((guardrail) => guardrail.code),
      verificationSteps: contract.verificationLoop.map((step) => step.key),
      rolloutStages: contract.rolloutStages.map((stage) => stage.key),
      rolloutReadinessSignals: contract.rolloutReadinessSignals.map((signal) => signal.key),
      rolloutReadiness: rolloutReadiness.map((audit) => ({
        targetStage: audit.targetStage,
        status: audit.status,
        requiredSignals: audit.requiredSignals,
        allowedTasks: audit.allowedTasks,
        blockers: audit.blockers,
      })),
      humanControlledDecisions: contract.humanControlledDecisions,
      fallbackRule: contract.fallbackRule,
    },
    blockers: validation.blockers,
  });
}
