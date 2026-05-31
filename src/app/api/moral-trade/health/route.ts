import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeProtocolProfile,
  validateMoralTradeProtocolProfile,
} from "@/lib/moral-trade/protocol";
import {
  getMoralTradeDataModelProfile,
  validateMoralTradeDataModelProfile,
} from "@/lib/moral-trade/data-model";
import {
  getMoralTradePolicyBundleContract,
  validateMoralTradePolicyBundleContract,
} from "@/lib/moral-trade/policy-bundle";
import {
  getMoralTradeProvenanceContract,
  validateMoralTradeProvenanceContract,
} from "@/lib/moral-trade/provenance";
import {
  getMoralTradeSchemaRegistry,
  validateMoralTradeSchemaRegistry,
} from "@/lib/moral-trade/schema-registry";
import {
  getMoralTradeReasoningPacketContract,
  getMoralTradeReasoningPackets,
  validateMoralTradeReasoningPacketContract,
} from "@/lib/moral-trade/reasoning-packets";
import {
  getMoralTradeOperationsProfile,
  validateMoralTradeOperationsProfile,
} from "@/lib/moral-trade/operations";
import {
  getMoralTradeSecurityProfile,
  validateMoralTradeSecurityProfile,
} from "@/lib/moral-trade/security";
import {
  getMoralTradeIncidentResponseProfile,
  validateMoralTradeIncidentResponseProfile,
} from "@/lib/moral-trade/incident-response";
import {
  getMoralTradeEvaluationSampleAudits,
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
  auditMoralTradeApiImplementationContract,
  getMoralTradeApiContractProfile,
  validateMoralTradeApiContractProfile,
} from "@/lib/moral-trade/api-contract";
import {
  getMoralTradeAiGovernanceProfile,
  validateMoralTradeAiGovernanceProfile,
} from "@/lib/moral-trade/ai-governance";
import {
  getMoralTradeMatchSignalContract,
  validateMoralTradeMatchSignalContract,
} from "@/lib/moral-trade/match-signal";
import {
  getMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealContract,
} from "@/lib/moral-trade/challenge-appeal";
import {
  getMoralTradeDisclosureContract,
  validateMoralTradeDisclosureContract,
} from "@/lib/moral-trade/disclosure";
import {
  getMoralTradeCopilotContract,
  getMoralTradeCopilotRolloutReadinessAudits,
  validateMoralTradeCopilotContract,
} from "@/lib/moral-trade/copilot";
import {
  getOfferReviewWorkflowContract,
  validateOfferReviewWorkflowContract,
} from "@/lib/proposal-review";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const profile = getMoralTradeProtocolProfile();
  const validation = validateMoralTradeProtocolProfile();
  const dataModelProfile = getMoralTradeDataModelProfile();
  const dataModelValidation = validateMoralTradeDataModelProfile(dataModelProfile);
  const policyBundleContract = getMoralTradePolicyBundleContract();
  const policyBundleValidation =
    validateMoralTradePolicyBundleContract(policyBundleContract);
  const provenanceContract = getMoralTradeProvenanceContract();
  const provenanceValidation = validateMoralTradeProvenanceContract(provenanceContract);
  const schemaRegistry = getMoralTradeSchemaRegistry();
  const schemaRegistryValidation = validateMoralTradeSchemaRegistry(schemaRegistry);
  const copilotContract = getMoralTradeCopilotContract();
  const copilotValidation = validateMoralTradeCopilotContract(copilotContract);
  const copilotRolloutReadiness =
    getMoralTradeCopilotRolloutReadinessAudits(copilotContract);
  const matchSignalContract = getMoralTradeMatchSignalContract();
  const matchSignalValidation =
    validateMoralTradeMatchSignalContract(matchSignalContract);
  const challengeAppealContract = getMoralTradeChallengeAppealContract();
  const challengeAppealValidation =
    validateMoralTradeChallengeAppealContract(challengeAppealContract);
  const disclosureContract = getMoralTradeDisclosureContract();
  const disclosureValidation =
    validateMoralTradeDisclosureContract(disclosureContract);
  const reviewWorkflowContract = getOfferReviewWorkflowContract();
  const reviewWorkflowValidation =
    validateOfferReviewWorkflowContract(reviewWorkflowContract);
  const reasoningPackets = getMoralTradeReasoningPackets();
  const reasoningPacketContract =
    getMoralTradeReasoningPacketContract(reasoningPackets);
  const reasoningPacketValidation =
    validateMoralTradeReasoningPacketContract(
      reasoningPacketContract,
      reasoningPackets,
    );
  const operationsProfile = getMoralTradeOperationsProfile();
  const operationsValidation = validateMoralTradeOperationsProfile(operationsProfile);
  const securityProfile = getMoralTradeSecurityProfile();
  const securityValidation = validateMoralTradeSecurityProfile(securityProfile);
  const incidentResponseProfile = getMoralTradeIncidentResponseProfile();
  const incidentResponseValidation =
    validateMoralTradeIncidentResponseProfile(incidentResponseProfile);
  const evaluationProfile = getMoralTradeEvaluationProfile();
  const evaluationValidation = validateMoralTradeEvaluationProfile(evaluationProfile);
  const evaluationSampleAudits = getMoralTradeEvaluationSampleAudits();
  const performanceProfile = getMoralTradePerformanceProfile();
  const performanceValidation = validateMoralTradePerformanceProfile(performanceProfile);
  const externalityProfile = getMoralTradeExternalityProfile();
  const externalityValidation = validateMoralTradeExternalityProfile(externalityProfile);
  const apiContractProfile = getMoralTradeApiContractProfile();
  const apiContractValidation = validateMoralTradeApiContractProfile(apiContractProfile);
  const apiContractImplementationAudit =
    auditMoralTradeApiImplementationContract(apiContractProfile);
  const aiGovernanceProfile = getMoralTradeAiGovernanceProfile();
  const aiGovernanceValidation = validateMoralTradeAiGovernanceProfile(aiGovernanceProfile);

  return buildMoralTradeApiJsonResponse({
    ok:
      validation.status === "pass" &&
      dataModelValidation.status === "pass" &&
      policyBundleValidation.status === "pass" &&
      provenanceValidation.status === "pass" &&
      schemaRegistryValidation.status === "pass" &&
      copilotValidation.status === "pass" &&
      matchSignalValidation.status === "pass" &&
      challengeAppealValidation.status === "pass" &&
      disclosureValidation.status === "pass" &&
      reviewWorkflowValidation.status === "pass" &&
      reasoningPacketValidation.status === "pass" &&
      operationsValidation.status === "pass" &&
      securityValidation.status === "pass" &&
      incidentResponseValidation.status === "pass" &&
      evaluationValidation.status === "pass" &&
      performanceValidation.status === "pass" &&
      externalityValidation.status === "pass" &&
      apiContractValidation.status === "pass" &&
      apiContractImplementationAudit.status === "pass" &&
      aiGovernanceValidation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    validation,
    dataModelValidation,
    policyBundleValidation,
    provenanceValidation,
    schemaRegistryValidation,
    copilotValidation,
    matchSignalValidation,
    challengeAppealValidation,
    disclosureValidation,
    reviewWorkflowValidation,
    reasoningPacketValidation,
    operationsValidation,
    securityValidation,
    incidentResponseValidation,
    evaluationValidation,
    performanceValidation,
    externalityValidation,
    apiContractValidation,
    apiContractImplementationAudit,
    aiGovernanceValidation,
    publicContract: {
      requiredProposalFields: profile.requiredProposalFields,
      dataModelProfileVersion: dataModelProfile.version,
      dataModelEntities: dataModelProfile.entities.map((entity) => entity.key),
      dataModelPrivacyClasses: dataModelProfile.privacyClasses.map(
        (privacyClass) => privacyClass.key,
      ),
      dataModelOfferRequiredFields: dataModelProfile.offerRequiredFields,
      dataModelRelationshipBoundaries: dataModelProfile.relationshipBoundaries.map(
        (boundary) => boundary.key,
      ),
      dataModelContractTests: dataModelProfile.contractTests,
      policyBundleContractVersion: policyBundleContract.version,
      policyBundleStrictInputBundle: policyBundleContract.strictInputBundle,
      policyBundlePolicyCodes: policyBundleContract.policyRegistry.map((entry) => entry.key),
      policyBundleProhibitedPatternCodes:
        policyBundleContract.prohibitedPatternRegistry.map((entry) => entry.code),
      policyBundleFactorCodeCount: policyBundleContract.factorCodeDictionary.length,
      policyBundleVerificationMethods:
        policyBundleContract.verificationMethodTaxonomy.map((entry) => entry.key),
      policyBundleRedactions: policyBundleContract.redactionPolicy.map((entry) => entry.key),
      policyBundleContractTests: policyBundleContract.contractTests,
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
      stateTransitionEventRecordSchema:
        profile.provenanceObjectSchemas.find(
          (schema) => schema.key === "state_transition_event_record",
        ) ?? null,
      provenanceSchemaVersion: provenanceContract.schemaVersion,
      provenanceValidationRules: provenanceContract.validationRules.map((rule) => rule.key),
      provenancePersistenceTables: provenanceContract.persistenceTables.map(
        (table) => table.table,
      ),
      provenanceSampleBundleSummary: provenanceContract.sampleBundleSummary,
      provenanceContractTests: provenanceContract.contractTests,
      schemaRegistryVersion: schemaRegistry.version,
      schemaRegistryDocuments: schemaRegistry.schemaDocuments.map((entry) => entry.key),
      schemaRegistryPublicPaths: schemaRegistry.schemaDocuments.map((entry) => entry.publicPath),
      schemaRegistryDataModelSchema:
        schemaRegistry.schemaDocuments.find(
          (entry) => entry.key === "data_model_profile_schema",
        ) ?? null,
      schemaRegistryTests: schemaRegistry.registryTests,
      copilotContractVersion: copilotContract.version,
      copilotPromptTemplates: copilotContract.promptTemplates.map((template) => template.key),
      copilotInputBundle: copilotContract.strictInputBundle,
      copilotOutputSections: copilotContract.approvedOutputSections,
      copilotVerificationSteps: copilotContract.verificationLoop.map((step) => step.key),
      copilotRolloutReadinessStatuses: Object.fromEntries(
        copilotRolloutReadiness.map((audit) => [audit.targetStage, audit.status]),
      ),
      matchSignalContractVersion: matchSignalContract.version,
      matchSignalDecisioningMode: matchSignalContract.decisioningMode,
      matchSignalStateMutation: matchSignalContract.stateMutation,
      matchSignalRequiredInputFields: matchSignalContract.requiredInputFields,
      matchSignalFactorCodes: matchSignalContract.approvedFactorCodes,
      matchSignalRedactedFields: matchSignalContract.redactedFields,
      matchSignalParticipantExplanation:
        matchSignalContract.participantExplanationTemplate.matchableHeadline,
      matchSignalContractTests: matchSignalContract.contractTests,
      challengeAppealContractVersion: challengeAppealContract.version,
      challengeAppealDecisioningMode: challengeAppealContract.decisioningMode,
      challengeAppealStateMutation: challengeAppealContract.stateMutation,
      challengeAppealSubjects: challengeAppealContract.subjects,
      challengeAppealStandingCategories: challengeAppealContract.standingCategories,
      challengeAppealTriggers: challengeAppealContract.appealTriggers,
      challengeAppealAllowedOutcomes: challengeAppealContract.allowedOutcomes,
      challengeAppealFactorCodes: challengeAppealContract.approvedFactorCodes,
      challengeAppealContractTests: challengeAppealContract.contractTests,
      disclosureContractVersion: disclosureContract.version,
      disclosureDecisioningMode: disclosureContract.decisioningMode,
      disclosureStateMutation: disclosureContract.stateMutation,
      disclosureAccessLevels: disclosureContract.accessLevels,
      disclosureAudienceStages: disclosureContract.audienceStages,
      disclosureGrantStatuses: disclosureContract.grantStatuses,
      disclosureFieldKeys: disclosureContract.disclosureFields.map((field) => field.key),
      disclosureRedactedFields: disclosureContract.redactedFields,
      disclosureSearchPrivacyControls: disclosureContract.searchPrivacyControls.map(
        (control) => control.key,
      ),
      disclosureFactorCodes: disclosureContract.approvedFactorCodes,
      disclosureContractTests: disclosureContract.contractTests,
      reviewWorkflowContractVersion: reviewWorkflowContract.version,
      reviewWorkflowCardKeys: reviewWorkflowContract.detailWorkflowCards.map((card) => card.key),
      reviewWorkflowMarketplaceFactorPriority:
        reviewWorkflowContract.marketplaceFactorPriority,
      reviewWorkflowParticipantCopyKeys: Object.keys(
        reviewWorkflowContract.participantCopyTemplates,
      ),
      reviewWorkflowContractTests: reviewWorkflowContract.contractTests,
      reasoningPacketContractVersion: reasoningPacketContract.version,
      reasoningPacketCount: reasoningPacketContract.packetCount,
      reasoningPacketFilters: reasoningPacketContract.supportedFilters.map(
        (filter) => filter.key,
      ),
      reasoningPacketFilterCounts: reasoningPacketContract.filterCounts,
      reasoningPacketRequiredFields:
        reasoningPacketContract.requiredPacketFields,
      reasoningPacketDecisionStepKeys:
        reasoningPacketContract.samplePackets[0]?.decisionSteps.map((step) => step.key) ?? [],
      reasoningPacketLinkedContracts: reasoningPacketContract.linkedContracts,
      reasoningPacketContractTests: reasoningPacketContract.contractTests,
      operationsProfileVersion: operationsProfile.version,
      securityHeaderCodes: operationsProfile.securityHeaders.map((header) => header.code),
      rateLimitSurfaces: operationsProfile.rateLimitSurfaces.map((surface) => surface.key),
      retentionControlKeys: operationsProfile.retentionControls.map((control) => control.key),
      retentionControlScopes: Object.fromEntries(
        operationsProfile.retentionControls.map((control) => [control.key, control.scope]),
      ),
      observabilityMetrics: operationsProfile.observabilityMetrics,
      securityProfileVersion: securityProfile.version,
      securityControls: securityProfile.controls.map((control) => control.key),
      securityScaleGates: securityProfile.scaleGates.map((gate) => gate.key),
      securityPublicNonClaims: securityProfile.publicNonClaims,
      incidentResponseProfileVersion: incidentResponseProfile.version,
      incidentResponseIntakeChannels: incidentResponseProfile.intakeChannels.map(
        (channel) => channel.key,
      ),
      incidentResponseCategories: incidentResponseProfile.incidentCategories.map(
        (category) => category.key,
      ),
      incidentResponseSeverityLevels: incidentResponseProfile.severityLevels.map(
        (severity) => severity.key,
      ),
      incidentResponsePhases: incidentResponseProfile.responsePhases.map(
        (phase) => phase.key,
      ),
      incidentResponseDisclosureRules: incidentResponseProfile.disclosureRules.map(
        (rule) => rule.key,
      ),
      incidentResponseReadinessGates: incidentResponseProfile.readinessGates.map(
        (gate) => gate.key,
      ),
      incidentResponsePublicNonClaims: incidentResponseProfile.publicNonClaims,
      evaluationProfileVersion: evaluationProfile.version,
      evaluationMetrics: evaluationProfile.metrics.map((metric) => metric.key),
      evaluationCohortSlices: evaluationProfile.cohortSlices,
      evaluationPromotionGates: evaluationProfile.promotionGates.map((gate) => gate.stage),
      evaluationSampleAuditStatuses: {
        surfacingParity: evaluationSampleAudits.surfacingParityAudit.status,
        uxReadiness: evaluationSampleAudits.uxReadinessAudit.status,
      },
      evaluationSurfacingDeviationReviews: {
        reviewed: evaluationSampleAudits.surfacingParityAudit.reviewedDeviationCount,
        unreviewed: evaluationSampleAudits.surfacingParityAudit.unreviewedDeviationCount,
      },
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
      apiContractImplementationAuditStatus: apiContractImplementationAudit.status,
      apiRoutes: apiContractProfile.routes.map((route) => route.key),
      apiContractRoute:
        apiContractProfile.routes.find(
          (route) => route.key === "moral_trade_api_contract",
        ) ?? null,
      apiImplementationRouteCount: apiContractImplementationAudit.routeCount,
      apiImplementationRateLimitSurfaces:
        apiContractImplementationAudit.implementedRateLimitSurfaces,
      apiImplementationCacheControls:
        apiContractImplementationAudit.implementedCacheControls,
      apiImplementationBlockers: apiContractImplementationAudit.blockers,
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
      ...dataModelValidation.blockers,
      ...policyBundleValidation.blockers,
      ...provenanceValidation.blockers,
      ...schemaRegistryValidation.blockers,
      ...copilotValidation.blockers,
      ...matchSignalValidation.blockers,
      ...challengeAppealValidation.blockers,
      ...disclosureValidation.blockers,
      ...reviewWorkflowValidation.blockers,
      ...reasoningPacketValidation.blockers,
      ...operationsValidation.blockers,
      ...securityValidation.blockers,
      ...incidentResponseValidation.blockers,
      ...evaluationValidation.blockers,
      ...performanceValidation.blockers,
      ...externalityValidation.blockers,
      ...apiContractValidation.blockers,
      ...apiContractImplementationAudit.blockers,
      ...aiGovernanceValidation.blockers,
    ],
  });
}
