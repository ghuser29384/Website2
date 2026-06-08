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
  getMoralTradeReleaseGateContract,
  validateMoralTradeReleaseGateContract,
} from "@/lib/moral-trade/release-gates";
import {
  getMoralTradeParticipantConfirmationContract,
  validateMoralTradeParticipantConfirmationContract,
} from "@/lib/moral-trade/participant-confirmations";
import {
  getMoralTradeParticipantEligibilityContract,
  validateMoralTradeParticipantEligibilityContract,
} from "@/lib/moral-trade/participant-eligibility";
import {
  getMoralTradeAccountSecurityContract,
  validateMoralTradeAccountSecurityContract,
} from "@/lib/moral-trade/account-security";
import {
  getMoralTradeReviewerQualityContract,
  validateMoralTradeReviewerQualityContract,
} from "@/lib/moral-trade/reviewer-quality";
import {
  getMoralTradeAntiEnumerationContract,
  validateMoralTradeAntiEnumerationContract,
} from "@/lib/moral-trade/anti-enumeration";
import {
  getMoralTradePrivacyGovernanceContract,
  validateMoralTradePrivacyGovernanceContract,
} from "@/lib/moral-trade/privacy-governance";
import {
  getMoralTradeImpactClaimContract,
  validateMoralTradeImpactClaimContract,
} from "@/lib/moral-trade/impact-claims";
import {
  getMoralTradeMatchingClearingContract,
  validateMoralTradeMatchingClearingContract,
} from "@/lib/moral-trade/matching-clearing";
import {
  getMoralTradeBaselineIntegrityContract,
  validateMoralTradeBaselineIntegrityContract,
} from "@/lib/moral-trade/baseline-integrity";
import {
  getMoralTradeAgreementAmendmentContract,
  validateMoralTradeAgreementAmendmentContract,
} from "@/lib/moral-trade/agreement-amendments";
import {
  getMoralTradeProductionReadinessContract,
  validateMoralTradeProductionReadinessContract,
} from "@/lib/moral-trade/production-readiness";
import {
  getMoralTradeRecipientDestinationContract,
  validateMoralTradeRecipientDestinationContract,
} from "@/lib/moral-trade/recipient-destination";
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
  getMoralTradeTransparencyReportContract,
  validateMoralTradeTransparencyReportContract,
} from "@/lib/moral-trade/transparency-report";
import {
  getMarketplaceMeasurementContract,
  validateMarketplaceMeasurementContract,
} from "@/lib/marketplace-measurement";
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
  getMoralTradeDocumentCoverageProfile,
  validateMoralTradeDocumentCoverageProfile,
} from "@/lib/moral-trade/document-coverage";
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
  const releaseGateContract = getMoralTradeReleaseGateContract();
  const releaseGateValidation =
    validateMoralTradeReleaseGateContract(releaseGateContract);
  const participantConfirmationContract =
    getMoralTradeParticipantConfirmationContract();
  const participantConfirmationValidation =
    validateMoralTradeParticipantConfirmationContract(
      participantConfirmationContract,
    );
  const participantEligibilityContract =
    getMoralTradeParticipantEligibilityContract();
  const participantEligibilityValidation =
    validateMoralTradeParticipantEligibilityContract(
      participantEligibilityContract,
    );
  const accountSecurityContract = getMoralTradeAccountSecurityContract();
  const accountSecurityValidation =
    validateMoralTradeAccountSecurityContract(accountSecurityContract);
  const reviewerQualityContract = getMoralTradeReviewerQualityContract();
  const reviewerQualityValidation =
    validateMoralTradeReviewerQualityContract(reviewerQualityContract);
  const antiEnumerationContract = getMoralTradeAntiEnumerationContract();
  const antiEnumerationValidation =
    validateMoralTradeAntiEnumerationContract(antiEnumerationContract);
  const privacyGovernanceContract = getMoralTradePrivacyGovernanceContract();
  const privacyGovernanceValidation =
    validateMoralTradePrivacyGovernanceContract(privacyGovernanceContract);
  const impactClaimContract = getMoralTradeImpactClaimContract();
  const impactClaimValidation =
    validateMoralTradeImpactClaimContract(impactClaimContract);
  const matchingClearingContract = getMoralTradeMatchingClearingContract();
  const matchingClearingValidation =
    validateMoralTradeMatchingClearingContract(matchingClearingContract);
  const baselineIntegrityContract =
    getMoralTradeBaselineIntegrityContract();
  const baselineIntegrityValidation =
    validateMoralTradeBaselineIntegrityContract(
      baselineIntegrityContract,
    );
  const agreementAmendmentContract =
    getMoralTradeAgreementAmendmentContract();
  const agreementAmendmentValidation =
    validateMoralTradeAgreementAmendmentContract(
      agreementAmendmentContract,
    );
  const productionReadinessContract =
    getMoralTradeProductionReadinessContract();
  const productionReadinessValidation =
    validateMoralTradeProductionReadinessContract(
      productionReadinessContract,
    );
  const recipientDestinationContract =
    getMoralTradeRecipientDestinationContract();
  const recipientDestinationValidation =
    validateMoralTradeRecipientDestinationContract(
      recipientDestinationContract,
    );
  const provenanceContract = getMoralTradeProvenanceContract();
  const provenanceValidation = validateMoralTradeProvenanceContract(provenanceContract);
  const schemaRegistry = getMoralTradeSchemaRegistry();
  const schemaRegistryValidation = validateMoralTradeSchemaRegistry(schemaRegistry);
  const schemaRegistrySampleValidationCount = schemaRegistry.schemaDocuments.reduce(
    (total, schema) => total + schema.sampleValidationCount,
    0,
  );
  const schemaRegistrySampleValidationFailureCount = schemaRegistry.schemaDocuments.reduce(
    (total, schema) => total + schema.sampleValidationFailureCount,
    0,
  );
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
  const transparencyReportContract = getMoralTradeTransparencyReportContract();
  const transparencyReportValidation =
    validateMoralTradeTransparencyReportContract(transparencyReportContract);
  const marketplaceMeasurementContract = getMarketplaceMeasurementContract();
  const marketplaceMeasurementValidation =
    validateMarketplaceMeasurementContract();
  const apiContractProfile = getMoralTradeApiContractProfile();
  const apiContractValidation = validateMoralTradeApiContractProfile(apiContractProfile);
  const apiContractImplementationAudit =
    auditMoralTradeApiImplementationContract(apiContractProfile);
  const aiGovernanceProfile = getMoralTradeAiGovernanceProfile();
  const aiGovernanceValidation = validateMoralTradeAiGovernanceProfile(aiGovernanceProfile);
  const documentCoverageProfile = getMoralTradeDocumentCoverageProfile();
  const documentCoverageValidation =
    validateMoralTradeDocumentCoverageProfile(documentCoverageProfile);
  const documentCoverageRequiredEvidencePhraseCount =
    documentCoverageProfile.requirements.reduce(
      (total, requirement) => total + requirement.requiredEvidencePhrases.length,
      0,
    );

  return buildMoralTradeApiJsonResponse({
    ok:
      validation.status === "pass" &&
      dataModelValidation.status === "pass" &&
      policyBundleValidation.status === "pass" &&
      releaseGateValidation.status === "pass" &&
      participantConfirmationValidation.status === "pass" &&
      participantEligibilityValidation.status === "pass" &&
      accountSecurityValidation.status === "pass" &&
      reviewerQualityValidation.status === "pass" &&
      antiEnumerationValidation.status === "pass" &&
      privacyGovernanceValidation.status === "pass" &&
      impactClaimValidation.status === "pass" &&
      matchingClearingValidation.status === "pass" &&
      baselineIntegrityValidation.status === "pass" &&
      agreementAmendmentValidation.status === "pass" &&
      productionReadinessValidation.status === "pass" &&
      recipientDestinationValidation.status === "pass" &&
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
      transparencyReportValidation.status === "pass" &&
      marketplaceMeasurementValidation.status === "pass" &&
      apiContractValidation.status === "pass" &&
      apiContractImplementationAudit.status === "pass" &&
      aiGovernanceValidation.status === "pass" &&
      documentCoverageValidation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    validation,
    dataModelValidation,
    policyBundleValidation,
    releaseGateValidation,
    participantConfirmationValidation,
    participantEligibilityValidation,
    accountSecurityValidation,
    reviewerQualityValidation,
    antiEnumerationValidation,
    privacyGovernanceValidation,
    impactClaimValidation,
    matchingClearingValidation,
    baselineIntegrityValidation,
    agreementAmendmentValidation,
    productionReadinessValidation,
    recipientDestinationValidation,
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
    transparencyReportValidation,
    marketplaceMeasurementValidation,
    apiContractValidation,
    apiContractImplementationAudit,
    aiGovernanceValidation,
    documentCoverageValidation,
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
      releaseGateContractVersion: releaseGateContract.version,
      releaseGateStageKeys: releaseGateContract.stages.map((stage) => stage.key),
      releaseGateRequirementKeys:
        releaseGateContract.requirementDefinitions.map((requirement) => requirement.key),
      releaseGateFirstClassRecordTables: releaseGateContract.firstClassRecordTables,
      releaseGatePolicySnapshotSubjects:
        releaseGateContract.immutablePolicySnapshotSubjects,
      releaseGatePrivilegedActionKeys: releaseGateContract.privilegedActionKeys,
      releaseGateSampleEvaluationStatuses: Object.fromEntries(
        releaseGateContract.sampleEvaluations.map((evaluation) => [
          evaluation.stage,
          evaluation.status,
        ]),
      ),
      releaseGateContractTests: releaseGateContract.contractTests,
      participantConfirmationContractVersion:
        participantConfirmationContract.version,
      participantConfirmationSubjectTypes:
        participantConfirmationContract.subjectTypes,
      participantConfirmationScopes:
        participantConfirmationContract.confirmationScopes,
      participantConfirmationFailClosedStatuses:
        participantConfirmationContract.failClosedStatuses,
      participantConfirmationFirstClassRecordTables:
        participantConfirmationContract.firstClassRecordTables,
      participantConfirmationRequiredHashFields:
        participantConfirmationContract.requiredHashFields,
      participantConfirmationHighRiskConsentQualityScopes:
        participantConfirmationContract.highRiskScopesRequiringConsentQuality,
      participantConfirmationSampleEvaluationStatuses:
        participantConfirmationContract.sampleEvaluations.map((evaluation) => ({
          scope: evaluation.confirmationScope,
          status: evaluation.status,
        })),
      participantConfirmationContractTests:
        participantConfirmationContract.contractTests,
      participantEligibilityContractVersion:
        participantEligibilityContract.version,
      participantEligibilityTransitionKeys:
        participantEligibilityContract.transitionDefinitions.map(
          (transition) => transition.key,
        ),
      participantEligibilityReviewDimensions:
        participantEligibilityContract.reviewDimensions,
      participantEligibilityFailClosedStatuses:
        participantEligibilityContract.failClosedStatuses,
      participantEligibilityFirstClassRecordTables:
        participantEligibilityContract.firstClassRecordTables,
      participantEligibilityPolicySnapshotSubjects:
        participantEligibilityContract.policySnapshotSubjects,
      participantEligibilitySampleEvaluationStatuses: Object.fromEntries(
        participantEligibilityContract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.status,
        ]),
      ),
      participantEligibilityContractTests:
        participantEligibilityContract.contractTests,
      accountSecurityContractVersion:
        accountSecurityContract.version,
      accountSecurityHighRiskActions:
        accountSecurityContract.highRiskActions,
      accountSecurityEventTypes:
        accountSecurityContract.eventTypes,
      accountSecurityFailClosedStatuses:
        accountSecurityContract.failClosedStatuses,
      accountSecurityFirstClassRecordTables:
        accountSecurityContract.firstClassRecordTables,
      accountSecurityPolicySnapshotSubjects:
        accountSecurityContract.policySnapshotSubjects,
      accountSecuritySampleEvaluationStatuses: Object.fromEntries(
        accountSecurityContract.sampleEvaluations.map((evaluation) => [
          evaluation.action,
          evaluation.status,
        ]),
      ),
      accountSecurityContractTests:
        accountSecurityContract.contractTests,
      reviewerQualityContractVersion:
        reviewerQualityContract.version,
      reviewerQualityReviewTypes:
        reviewerQualityContract.reviewTypes,
      reviewerQualityFailClosedStatuses:
        reviewerQualityContract.failClosedStatuses,
      reviewerQualityFirstClassRecordTables:
        reviewerQualityContract.firstClassRecordTables,
      reviewerQualityPolicySnapshotSubjects:
        reviewerQualityContract.policySnapshotSubjects,
      reviewerQualitySampleEvaluationStatuses: Object.fromEntries(
        reviewerQualityContract.sampleEvaluations.map((evaluation) => [
          evaluation.reviewType,
          evaluation.status,
        ]),
      ),
      reviewerQualityContractTests:
        reviewerQualityContract.contractTests,
      antiEnumerationContractVersion:
        antiEnumerationContract.version,
      antiEnumerationSurfaces:
        antiEnumerationContract.surfaces,
      antiEnumerationCountBuckets:
        antiEnumerationContract.countBuckets,
      antiEnumerationFailClosedStatuses:
        antiEnumerationContract.failClosedStatuses,
      antiEnumerationFirstClassRecordTables:
        antiEnumerationContract.firstClassRecordTables,
      antiEnumerationPolicySnapshotSubjects:
        antiEnumerationContract.policySnapshotSubjects,
      antiEnumerationSampleEvaluationStatuses: Object.fromEntries(
        antiEnumerationContract.sampleEvaluations.map((evaluation) => [
          evaluation.surface,
          evaluation.status,
        ]),
      ),
      antiEnumerationContractTests:
        antiEnumerationContract.contractTests,
      privacyGovernanceContractVersion:
        privacyGovernanceContract.version,
      privacyGovernanceSurfaces:
        privacyGovernanceContract.surfaces,
      privacyGovernanceAudienceStages:
        privacyGovernanceContract.audienceStages,
      privacyGovernanceAccessLevels:
        privacyGovernanceContract.accessLevels,
      privacyGovernanceFailClosedStatuses:
        privacyGovernanceContract.failClosedStatuses,
      privacyGovernanceFirstClassRecordTables:
        privacyGovernanceContract.firstClassRecordTables,
      privacyGovernanceExistingRecordTables:
        privacyGovernanceContract.existingRecordTables,
      privacyGovernancePolicySnapshotSubjects:
        privacyGovernanceContract.policySnapshotSubjects,
      privacyGovernanceSampleEvaluationStatuses: Object.fromEntries(
        privacyGovernanceContract.sampleEvaluations.map((evaluation) => [
          evaluation.surface,
          evaluation.status,
        ]),
      ),
      privacyGovernanceContractTests:
        privacyGovernanceContract.contractTests,
      impactClaimContractVersion:
        impactClaimContract.version,
      impactClaimSurfaces:
        impactClaimContract.surfaces,
      impactClaimClaimTypes:
        impactClaimContract.claimTypes,
      impactClaimEvidenceClaimTypes:
        impactClaimContract.evidenceClaimTypes,
      impactClaimFailClosedStatuses:
        impactClaimContract.failClosedStatuses,
      impactClaimFirstClassRecordTables:
        impactClaimContract.firstClassRecordTables,
      impactClaimPolicySnapshotSubjects:
        impactClaimContract.policySnapshotSubjects,
      impactClaimSampleEvaluationStatuses: Object.fromEntries(
        impactClaimContract.sampleEvaluations.map((evaluation) => [
          evaluation.claimType,
          evaluation.status,
        ]),
      ),
      impactClaimContractTests:
        impactClaimContract.contractTests,
      matchingClearingContractVersion:
        matchingClearingContract.version,
      matchingClearingFlowTypes:
        matchingClearingContract.flowTypes,
      matchingClearingRunStatuses:
        matchingClearingContract.runStatuses,
      matchingClearingProposalStatuses:
        matchingClearingContract.lockProposalStatuses,
      matchingClearingFailClosedStatuses:
        matchingClearingContract.failClosedStatuses,
      matchingClearingFirstClassRecordTables:
        matchingClearingContract.firstClassRecordTables,
      matchingClearingPolicySnapshotSubjects:
        matchingClearingContract.policySnapshotSubjects,
      matchingClearingSampleEvaluationStatuses: Object.fromEntries(
        matchingClearingContract.sampleEvaluations.map((evaluation) => [
          evaluation.flowType,
          evaluation.status,
        ]),
      ),
      matchingClearingContractTests:
        matchingClearingContract.contractTests,
      baselineIntegrityContractVersion:
        baselineIntegrityContract.version,
      baselineIntegrityTransitionKeys:
        baselineIntegrityContract.transitionDefinitions.map(
          (transition) => transition.key,
        ),
      baselineIntegritySubjectTypes:
        baselineIntegrityContract.subjectTypes,
      baselineIntegrityAssessmentStates:
        baselineIntegrityContract.assessmentStates,
      baselineIntegrityFailClosedStatuses:
        baselineIntegrityContract.failClosedStatuses,
      baselineIntegrityFirstClassRecordTables:
        baselineIntegrityContract.firstClassRecordTables,
      baselineIntegrityPolicySnapshotSubjects:
        baselineIntegrityContract.policySnapshotSubjects,
      baselineIntegritySampleEvaluationStatuses: Object.fromEntries(
        baselineIntegrityContract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.status,
        ]),
      ),
      baselineIntegrityContractTests:
        baselineIntegrityContract.contractTests,
      agreementAmendmentContractVersion:
        agreementAmendmentContract.version,
      agreementAmendmentTransitionKeys:
        agreementAmendmentContract.transitionDefinitions.map(
          (transition) => transition.key,
        ),
      agreementAmendmentSubjectTypes:
        agreementAmendmentContract.subjectTypes,
      agreementAmendmentTypes:
        agreementAmendmentContract.amendmentTypes,
      agreementAmendmentStates:
        agreementAmendmentContract.amendmentStates,
      agreementAmendmentFailClosedStatuses:
        agreementAmendmentContract.failClosedStatuses,
      agreementAmendmentFirstClassRecordTables:
        agreementAmendmentContract.firstClassRecordTables,
      agreementAmendmentPolicySnapshotSubjects:
        agreementAmendmentContract.policySnapshotSubjects,
      agreementAmendmentSampleEvaluationStatuses: Object.fromEntries(
        agreementAmendmentContract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.status,
        ]),
      ),
      agreementAmendmentContractTests:
        agreementAmendmentContract.contractTests,
      productionReadinessContractVersion:
        productionReadinessContract.version,
      productionReadinessControlKeys:
        productionReadinessContract.controlDefinitions.map((control) => control.key),
      productionReadinessGateKeys:
        productionReadinessContract.gateDefinitions.map((gate) => gate.key),
      productionReadinessFailClosedStatuses:
        productionReadinessContract.failClosedStatuses,
      productionReadinessFirstClassRecordTables:
        productionReadinessContract.firstClassRecordTables,
      productionReadinessPolicySnapshotSubjects:
        productionReadinessContract.policySnapshotSubjects,
      productionReadinessSampleEvaluationStatuses: Object.fromEntries(
        productionReadinessContract.sampleEvaluations.map((evaluation) => [
          evaluation.gate,
          evaluation.status,
        ]),
      ),
      productionReadinessContractTests:
        productionReadinessContract.contractTests,
      recipientDestinationContractVersion:
        recipientDestinationContract.version,
      recipientDestinationTransitionKeys:
        recipientDestinationContract.transitionDefinitions.map(
          (transition) => transition.key,
        ),
      recipientDestinationReviewDimensions:
        recipientDestinationContract.reviewDimensions,
      recipientDestinationFailClosedStatuses:
        recipientDestinationContract.failClosedStatuses,
      recipientDestinationFirstClassRecordTables:
        recipientDestinationContract.firstClassRecordTables,
      recipientDestinationPolicySnapshotSubjects:
        recipientDestinationContract.policySnapshotSubjects,
      recipientDestinationSampleEvaluationStatuses: Object.fromEntries(
        recipientDestinationContract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.status,
        ]),
      ),
      recipientDestinationContractTests:
        recipientDestinationContract.contractTests,
      statusValues: profile.statusValues,
      decisionPipeline: profile.decisionPipeline.map((step) => ({
        key: step.key,
        requiredSignals: step.requiredSignals,
        failureStatus: step.failureStatus,
        blocksMatchable: step.blocksMatchable,
      })),
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
      schemaRegistrySampleValidationCount,
      schemaRegistrySampleValidationFailureCount,
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
      challengeAppealFirstClassRecordTables:
        challengeAppealContract.firstClassRecordTables,
      challengeAppealPolicySnapshotSubjects:
        challengeAppealContract.policySnapshotSubjects,
      challengeAppealCaseStatuses:
        challengeAppealContract.appealCaseStatuses,
      challengeAppealNoticeStates:
        challengeAppealContract.noticeStates,
      challengeAppealFailClosedStatuses:
        challengeAppealContract.failClosedStatuses,
      challengeAppealCaseSampleEvaluationStatuses: Object.fromEntries(
        challengeAppealContract.sampleAppealCaseEvaluations.map((evaluation) => [
          `${evaluation.subject}:${evaluation.trigger}:${evaluation.status}`,
          evaluation.status,
        ]),
      ),
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
      externalityTriggerStandardMatrix:
        externalityProfile.triggerStandardMatrix.map((entry) => ({
          triggerCode: entry.triggerCode,
          requiredStandards: entry.requiredStandards,
        })),
      externalityRemedyControls: externalityProfile.remedyControls.map((control) => control.key),
      transparencyReportContractVersion: transparencyReportContract.version,
      transparencyReportMinimumPublicCount:
        transparencyReportContract.minimumPublicCount,
      transparencyReportMetricKeys: transparencyReportContract.metricDefinitions.map(
        (metric) => metric.key,
      ),
      transparencyReportPrivacyRules: transparencyReportContract.privacyRules,
      transparencyReportContractTests: transparencyReportContract.contractTests,
      marketplaceMeasurementVersion: marketplaceMeasurementContract.version,
      marketplaceMeasurementMinimumPublicCount:
        marketplaceMeasurementContract.minimumPublicCount,
      marketplaceMeasurementEventTypes: marketplaceMeasurementContract.eventSpecs.map(
        (event) => event.eventType,
      ),
      marketplaceMeasurementKpiKeys:
        marketplaceMeasurementContract.kpiDefinitions.map((kpi) => kpi.key),
      marketplaceMeasurementPrivacyRules: marketplaceMeasurementContract.privacyRules,
      marketplaceMeasurementContractTests:
        marketplaceMeasurementContract.contractTests,
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
      aiGovernanceSampleDocumentationPacketCount:
        aiGovernanceProfile.sampleDocumentationPackets.length,
      aiGovernanceProhibitedUses: aiGovernanceProfile.prohibitedUses.map((entry) => entry.key),
      aiGovernanceExplanationControls: aiGovernanceProfile.explanationControls.map((entry) => entry.key),
      aiGovernanceExternalStandards: aiGovernanceProfile.externalStandards.map(
        (entry) => entry.key,
      ),
      documentCoverageProfileVersion: documentCoverageProfile.version,
      documentCoverageSourceDocuments: documentCoverageProfile.sourceDocuments.map(
        (source) => source.key,
      ),
      documentCoverageSourceDocumentArtifacts:
        documentCoverageValidation.sourceDocumentArtifacts,
      documentCoverageSourceStackReferences:
        documentCoverageProfile.sourceStackReferences.map((source) => source.key),
      documentCoverageTestingPlanCoverage:
        documentCoverageProfile.testingPlanCoverage.map((layer) => layer.key),
      documentCoverageRequirementKeys: documentCoverageProfile.requirements.map(
        (requirement) => requirement.key,
      ),
      documentCoverageRequiredEvidencePhraseCount,
      documentCoverageCanonicalInstruction: {
        path: documentCoverageProfile.canonicalInstruction.path,
        verificationCommands:
          documentCoverageProfile.canonicalInstruction.verificationCommands,
        routeEvidence: documentCoverageProfile.canonicalInstruction.routeEvidence,
        artifactHash: documentCoverageValidation.canonicalInstructionHash,
      },
      documentCoverageNonClaims: documentCoverageProfile.nonClaims,
      qualityMetrics: profile.qualityMetrics,
    },
    blockers: [
      ...validation.blockers,
      ...dataModelValidation.blockers,
      ...policyBundleValidation.blockers,
      ...releaseGateValidation.blockers,
      ...participantConfirmationValidation.blockers,
      ...participantEligibilityValidation.blockers,
      ...accountSecurityValidation.blockers,
      ...reviewerQualityValidation.blockers,
      ...antiEnumerationValidation.blockers,
      ...privacyGovernanceValidation.blockers,
      ...impactClaimValidation.blockers,
      ...matchingClearingValidation.blockers,
      ...baselineIntegrityValidation.blockers,
      ...agreementAmendmentValidation.blockers,
      ...productionReadinessValidation.blockers,
      ...recipientDestinationValidation.blockers,
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
      ...transparencyReportValidation.blockers,
      ...marketplaceMeasurementValidation.blockers,
      ...apiContractValidation.blockers,
      ...apiContractImplementationAudit.blockers,
      ...aiGovernanceValidation.blockers,
      ...documentCoverageValidation.blockers,
    ],
  });
}
