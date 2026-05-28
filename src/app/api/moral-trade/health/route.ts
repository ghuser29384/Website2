import { NextResponse } from "next/server";

import {
  getMoralTradeProtocolProfile,
  validateMoralTradeProtocolProfile,
} from "@/lib/moral-trade/protocol";
import {
  getMoralTradeOperationsProfile,
  validateMoralTradeOperationsProfile,
} from "@/lib/moral-trade/operations";
import {
  getMoralTradeSecurityProfile,
  validateMoralTradeSecurityProfile,
} from "@/lib/moral-trade/security";
import {
  getMoralTradeEvaluationProfile,
  validateMoralTradeEvaluationProfile,
} from "@/lib/moral-trade/evaluation";
import {
  getMoralTradePerformanceProfile,
  validateMoralTradePerformanceProfile,
} from "@/lib/moral-trade/performance";
import {
  getMoralTradeExternalityProfile,
  validateMoralTradeExternalityProfile,
} from "@/lib/moral-trade/externality";
import {
  getMoralTradeApiContractProfile,
  validateMoralTradeApiContractProfile,
} from "@/lib/moral-trade/api-contract";
import {
  getMoralTradeAiGovernanceProfile,
  validateMoralTradeAiGovernanceProfile,
} from "@/lib/moral-trade/ai-governance";
import {
  getMoralTradeCopilotContract,
  validateMoralTradeCopilotContract,
} from "@/lib/moral-trade/copilot";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = getMoralTradeProtocolProfile();
  const validation = validateMoralTradeProtocolProfile();
  const copilotContract = getMoralTradeCopilotContract();
  const copilotValidation = validateMoralTradeCopilotContract(copilotContract);
  const operationsProfile = getMoralTradeOperationsProfile();
  const operationsValidation = validateMoralTradeOperationsProfile(operationsProfile);
  const securityProfile = getMoralTradeSecurityProfile();
  const securityValidation = validateMoralTradeSecurityProfile(securityProfile);
  const evaluationProfile = getMoralTradeEvaluationProfile();
  const evaluationValidation = validateMoralTradeEvaluationProfile(evaluationProfile);
  const performanceProfile = getMoralTradePerformanceProfile();
  const performanceValidation = validateMoralTradePerformanceProfile(performanceProfile);
  const externalityProfile = getMoralTradeExternalityProfile();
  const externalityValidation = validateMoralTradeExternalityProfile(externalityProfile);
  const apiContractProfile = getMoralTradeApiContractProfile();
  const apiContractValidation = validateMoralTradeApiContractProfile(apiContractProfile);
  const aiGovernanceProfile = getMoralTradeAiGovernanceProfile();
  const aiGovernanceValidation = validateMoralTradeAiGovernanceProfile(aiGovernanceProfile);

  return NextResponse.json({
    ok:
      validation.status === "pass" &&
      copilotValidation.status === "pass" &&
      operationsValidation.status === "pass" &&
      securityValidation.status === "pass" &&
      evaluationValidation.status === "pass" &&
      performanceValidation.status === "pass" &&
      externalityValidation.status === "pass" &&
      apiContractValidation.status === "pass" &&
      aiGovernanceValidation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    validation,
    copilotValidation,
    operationsValidation,
    securityValidation,
    evaluationValidation,
    performanceValidation,
    externalityValidation,
    apiContractValidation,
    aiGovernanceValidation,
    publicContract: {
      requiredProposalFields: profile.requiredProposalFields,
      statusValues: profile.statusValues,
      stateTransitionRules: profile.stateTransitionRules.map((rule) => ({
        key: rule.key,
        from: rule.from,
        allowedTo: rule.allowedTo,
        requires: rule.requires,
        provenanceActivity: rule.provenanceActivity,
      })),
      guardrailCodes: profile.guardrails.map((guardrail) => guardrail.code),
      factorCodes: profile.factorCodes.map((factor) => factor.code),
      evidenceSchemas: profile.evidenceSchemas.map((schema) => schema.key),
      provenanceObjectSchemas: profile.provenanceObjectSchemas.map((schema) => schema.key),
      copilotContractVersion: copilotContract.version,
      copilotInputBundle: copilotContract.strictInputBundle,
      copilotOutputSections: copilotContract.approvedOutputSections,
      copilotVerificationSteps: copilotContract.verificationLoop.map((step) => step.key),
      operationsProfileVersion: operationsProfile.version,
      securityHeaderCodes: operationsProfile.securityHeaders.map((header) => header.code),
      rateLimitSurfaces: operationsProfile.rateLimitSurfaces.map((surface) => surface.key),
      observabilityMetrics: operationsProfile.observabilityMetrics,
      securityProfileVersion: securityProfile.version,
      securityControls: securityProfile.controls.map((control) => control.key),
      securityScaleGates: securityProfile.scaleGates.map((gate) => gate.key),
      securityPublicNonClaims: securityProfile.publicNonClaims,
      evaluationProfileVersion: evaluationProfile.version,
      evaluationMetrics: evaluationProfile.metrics.map((metric) => metric.key),
      evaluationCohortSlices: evaluationProfile.cohortSlices,
      evaluationPromotionGates: evaluationProfile.promotionGates.map((gate) => gate.stage),
      performanceProfileVersion: performanceProfile.version,
      performanceMetricTargets: performanceProfile.metricTargets.map((metric) => metric.key),
      performanceInstrumentationControls: performanceProfile.instrumentationControls.map(
        (control) => control.key,
      ),
      performanceRouteFamilies: performanceProfile.routeFamilies.map((family) => family.key),
      performancePublicNonClaims: performanceProfile.publicNonClaims,
      externalityProfileVersion: externalityProfile.version,
      externalityDueDiligenceSteps: externalityProfile.dueDiligenceSteps.map(
        (step) => step.key,
      ),
      externalityTriggerCodes: externalityProfile.triggerCodes.map((trigger) => trigger.key),
      externalityReviewStandards: externalityProfile.reviewStandards.map(
        (standard) => standard.key,
      ),
      externalityRemedyControls: externalityProfile.remedyControls.map((control) => control.key),
      apiContractProfileVersion: apiContractProfile.version,
      apiRoutes: apiContractProfile.routes.map((route) => route.key),
      apiPrivacyClasses: apiContractProfile.privacyClasses.map((entry) => entry.key),
      apiSchemaDefinitions: apiContractProfile.schemaDefinitions.map((schema) => schema.key),
      apiSchemaFieldCounts: Object.fromEntries(
        apiContractProfile.schemaDefinitions.map((schema) => [
          schema.key,
          schema.fields.length,
        ]),
      ),
      aiGovernanceProfileVersion: aiGovernanceProfile.version,
      aiGovernanceDecisioningMode: aiGovernanceProfile.decisioningMode,
      aiGovernanceDocumentationBeforeMl: aiGovernanceProfile.requiredDocumentationBeforeMl.map(
        (entry) => entry.key,
      ),
      aiGovernanceProhibitedUses: aiGovernanceProfile.prohibitedUses.map((entry) => entry.key),
      aiGovernanceExplanationControls: aiGovernanceProfile.explanationControls.map((entry) => entry.key),
      aiGovernanceExternalStandards: aiGovernanceProfile.externalStandards.map(
        (entry) => entry.key,
      ),
      qualityMetrics: profile.qualityMetrics,
    },
    blockers: [
      ...validation.blockers,
      ...copilotValidation.blockers,
      ...operationsValidation.blockers,
      ...securityValidation.blockers,
      ...evaluationValidation.blockers,
      ...performanceValidation.blockers,
      ...externalityValidation.blockers,
      ...apiContractValidation.blockers,
      ...aiGovernanceValidation.blockers,
    ],
  });
}
