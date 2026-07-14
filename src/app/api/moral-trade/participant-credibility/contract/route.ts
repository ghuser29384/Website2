import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeParticipantCredibilityContract,
  validateMoralTradeParticipantCredibilityContract,
} from "@/lib/moral-trade/participant-credibility";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited participant-credibility contract read returns no contract payload until the window resets.",
    );
  }

  const contract = getMoralTradeParticipantCredibilityContract();
  const validation = validateMoralTradeParticipantCredibilityContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      antiGamingControls: contract.antiGamingControls,
      contractTests: contract.contractTests,
      firstClassRecordTables: contract.firstClassRecordTables,
      friendCredibilityWeightInputs: contract.friendCredibilityWeightInputs,
      friendInviteRules: contract.friendInviteRules,
      funderDisclosureRules: contract.funderDisclosureRules,
      modelNames: contract.modelNames,
      ordinaryUiBannedTerms: contract.ordinaryUiBannedTerms,
      ordinaryUiPreferredTerm: contract.ordinaryUiPreferredTerm,
      privacyBoundary: contract.privacyBoundary,
      publicReportingRules: contract.publicReportingRules,
      renamedFields: contract.renamedFields,
      reviewerGovernanceRules: contract.reviewerGovernanceRules,
      scoringPolicy: {
        highStakesStandaloneTestimonialVerificationAllowed:
          contract.scoringPolicy.highStakesStandaloneTestimonialVerificationAllowed,
        maxSingleTestimonialAdditionalityDeltaDecimal:
          contract.scoringPolicy.maxSingleTestimonialAdditionalityDeltaDecimal,
        maxSingleTestimonialCredibilityDeltaDecimal:
          contract.scoringPolicy.maxSingleTestimonialCredibilityDeltaDecimal,
        maxSingleTestimonialEvidenceQualityDeltaDecimal:
          contract.scoringPolicy.maxSingleTestimonialEvidenceQualityDeltaDecimal,
        maxSingleTestimonialVerificationConfidenceDeltaDecimal:
          contract.scoringPolicy.maxSingleTestimonialVerificationConfidenceDeltaDecimal,
        policyHash: contract.scoringPolicy.policyHash,
        policyVersion: contract.scoringPolicy.policyVersion,
        privacyInvasiveEvidenceOverrewardCapDecimal:
          contract.scoringPolicy.privacyInvasiveEvidenceOverrewardCapDecimal,
      },
      seedDemo: contract.seedDemo,
      testimonialQuestions: contract.testimonialQuestions,
      testimonialStakePolicy: {
        defaultStakeRequired: contract.testimonialStakePolicy.defaultStakeRequired,
        destinationPolicy: contract.testimonialStakePolicy.destinationPolicy,
        legalComplianceReviewRef: contract.testimonialStakePolicy.legalComplianceReviewRef,
        maximumStakeMinor: contract.testimonialStakePolicy.maximumStakeMinor,
        minimumStakeMinor: contract.testimonialStakePolicy.minimumStakeMinor,
        optionalStakeEnabled: contract.testimonialStakePolicy.optionalStakeEnabled,
        percentageOfConsiderationDecimal:
          contract.testimonialStakePolicy.percentageOfConsiderationDecimal,
        policyHash: contract.testimonialStakePolicy.policyHash,
        policyVersion: contract.testimonialStakePolicy.policyVersion,
      },
    },
    purpose: contract.purpose,
    validation,
  });
}
