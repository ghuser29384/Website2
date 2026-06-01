import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeCopilotContract,
  getMoralTradeCopilotRolloutReadinessAudits,
  validateMoralTradeCopilotContract,
} from "@/lib/moral-trade/copilot";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const contract = getMoralTradeCopilotContract();
  const validation = validateMoralTradeCopilotContract(contract);
  const rolloutReadiness = getMoralTradeCopilotRolloutReadinessAudits(contract);

  return buildMoralTradeApiJsonResponse({
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
      guardrails: contract.guardrails.map((guardrail) => ({
        code: guardrail.code,
        label: guardrail.label,
        rule: guardrail.rule,
      })),
      verificationSteps: contract.verificationLoop.map((step) => step.key),
      verificationLoop: contract.verificationLoop.map((step) => ({
        key: step.key,
        label: step.label,
        blocksMatchable: step.blocksMatchable,
      })),
      verificationMatchabilityGate: {
        guardrailCode: "verification_loop_matchability_gate",
        blockingStepKeys: contract.verificationLoop
          .filter((step) => step.blocksMatchable)
          .map((step) => step.key),
        requiredStatus: "pass",
        enforcedBy: "validateMoralTradeCopilotOutput",
      },
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
