import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildDemoLedgerTransactions,
  buildPublicSummary,
  computeExactMpgfAllocation,
  computeCapCents,
  computeRationalCapCents,
  createMpgfPaymentIntent,
  createMpgfPledge,
  createMpgfPledgeOnlyRecord,
  createMpgfPublicGoodsIdentityAttestation,
  createMpgfPublicGoodsPledge,
  createMpgfPublicGoodsSponsorSubscription,
  fallbackAllocate,
  generateMpgfDemoAllocationCertificate,
  aggregateSaeAssessments,
  allocateMpgfAssuranceRound,
  approveInternalPayoutAuthorization,
  carryOverVoidedPayout,
  compareMpgfDryRunToLive,
  createMpgfRecurringContributionCommitment,
  computeMpgfCampaignQfScore,
  computeMpgfVerifiedQfRawScore,
  countMpgfQfContributionCents,
  assignMpgfPublicGoodsExperiment,
  evaluateMpgfPublicGoodsCohortAccess,
  getMpgfPublicGoodsFeatureFlagStatus,
  isLedgerBalanced,
  materializeMpgfRecurringPledgeForCycle,
  mpgfVerificationWeightFromHumanScoreBps,
  pauseMpgfRecurringContributionCommitment,
  preflightMpgfSolverSupport,
  resumeMpgfRecurringContributionCommitment,
  reviewMpgfPublicGoodsCampaign,
  revokeMpgfCompletionProfile,
  runMpgfPublicRuntimeReadinessCheck,
  saveMpgfBallotDraft,
  selectMpgfLiveSolver,
  solveMpgfByCertifiedBranchAndBound,
  solveMpgfByCompleteRegionEnumeration,
  getMpgfCampaignAssuranceStatus,
  reconcileMpgfPublicGoodsExternalHandoff,
  submitMpgfBallot,
  submitMpgfPoolProposalDraft,
  summarizeMpgfAssuranceRound,
  summarizeMpgfPublicGoodsReviewConsole,
  cancelMpgfRecurringContributionCommitment,
  validateMpgfPublicGoodsCampaign,
  verifyExternalPaymentEvidence,
  verifyMpgfOptimalityCertificate,
  voidPayoutAuthorization,
} from "./mpgf/mechanism";
import {
  demoMpgfAssurancePledges,
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
  demoMpgfPublicGoodsPaymentProofs,
  demoMpgfPublicGoodsReviewCases,
  demoMpgfPublicGoodsSubscriptions,
  mpgfPublicRoutes,
} from "./mpgf/data";
import {
  buildMpgfPublicGoodsAllocationResultRows,
  buildMpgfPublicGoodsAllocationSourceProofMap,
  persistMpgfPublicGoodsAllocationResults,
} from "./mpgf/public-goods-allocation-results";
import {
  bucketMpgfPublicGoodsAmountCents,
  buildMpgfPublicGoodsAnalyticsEvent,
  recordMpgfPublicGoodsAnalyticsEvent,
} from "./mpgf/public-goods-analytics";
import { evaluateMpgfPublicGoodsIdentityAdapter } from "./mpgf/public-goods-identity";
import { resolveMpgfPublicGoodsPaymentAdapter } from "./mpgf/public-goods-payment-adapter";
import {
  buildMpgfPublicGoodsReminderEmailRows,
  buildMpgfPublicGoodsReminderPlans,
  selectMpgfPublicGoodsReminderKind,
} from "./mpgf/public-goods-reminders";
import { buildMpgfPublicGoodsReconciliationRows } from "./mpgf/public-goods-reconciliation";
import {
  normalizeMpgfPublicGoodsReasonCode,
  resolveMpgfPublicGoodsRoute,
  summarizeMpgfPublicGoodsProof,
} from "./mpgf/public-goods-proof";
import {
  buildMpgfPublicGoodsKpiSnapshot,
  loadMpgfPublicGoodsKpiSnapshot,
} from "./mpgf/public-goods-kpis";
import { buildMpgfPublicGoodsOperationsDashboard } from "./mpgf/public-goods-operations";
import {
  MPGF_PUBLIC_GOODS_CHALLENGE_POLICY,
  createMpgfPublicGoodsChallenge,
} from "./mpgf/public-goods-challenges";
import {
  MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_FLOW,
  MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_PRIVACY_POLICY,
  authorizeMpgfPublicGoodsPledgeIntentPayment,
  createMpgfPublicGoodsPledgeIntent,
  getMpgfPublicGoodsContributionFlowApi,
  recordMpgfPublicGoodsProviderPaymentEvent,
  verifyMpgfPublicGoodsPledgeIntentIdentity,
} from "./mpgf/public-goods-contribution-intents";
import {
  MPGF_PUBLIC_GOODS_COORDINATION_PRIVACY_POLICY,
  MPGF_PUBLIC_GOODS_FINALIZATION_POLICY,
  buildMpgfPublicGoodsFinalizationReport,
  buildMpgfPublicGoodsRoundReleasePlan,
  detectMpgfPublicGoodsCoordinationFlags,
  getMpgfPublicGoodsFinalizationReportApi,
  getMpgfPublicGoodsRoundReleasePlanApi,
} from "./mpgf/public-goods-finalization";
import {
  MPGF_PUBLIC_GOODS_PROCEDURAL_BADGE_POLICY,
  MPGF_PUBLIC_GOODS_PROCEDURAL_BADGE_PRIVACY_POLICY,
  buildMpgfPublicGoodsProceduralBadgeLedger,
  getMpgfPublicGoodsProceduralBadgesApi,
} from "./mpgf/public-goods-procedural-badges";
import {
  MPGF_PUBLIC_GOODS_SPONSOR_FLYWHEEL_PRIVACY_POLICY,
  buildMpgfPublicGoodsSponsorPoolFlywheel,
  commitMpgfPublicGoodsTradeSurplus,
  getMpgfPublicGoodsSponsorPoolFlywheelApi,
  recordMpgfPublicGoodsSponsorPoolDeposit,
  settleMpgfPublicGoodsTradeSurplus,
} from "./mpgf/public-goods-sponsor-flywheel";
import {
  buildMpgfPublicGoodsRefundReconciliationPlan,
  buildMpgfSubscriptionCancellationUpdate,
  canRecordMpgfSponsorPoolInvoice,
} from "./mpgf/real-money";
import {
  buildMpgfPublicGoodsExperimentAssignmentRow,
  persistMpgfPublicGoodsExperimentAssignment,
} from "./mpgf/public-goods-experiments";
import {
  authorizeMpgfPublicGoodsMilestoneRelease,
  buildDemoMpgfPublicGoodsMilestoneReleaseDecision,
  buildMpgfPublicGoodsMilestoneReleaseRows,
  buildMpgfPublicGoodsMilestoneSchedule,
  persistMpgfPublicGoodsMilestoneRelease,
} from "./mpgf/public-goods-milestones";
import {
  MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
  MPGF_PUBLIC_GOODS_API_HEADERS,
  MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
  getMpgfPublicGoodsAllocationReportApi,
  getMpgfPublicGoodsCampaignApi,
  getMpgfPublicGoodsLedgerApi,
  getMpgfPublicGoodsMatchPreviewApi,
  getMpgfPublicGoodsRoundApi,
  listMpgfPublicGoodsCampaignsApi,
  listMpgfPublicGoodsRoundsApi,
} from "./mpgf/public-goods-api";
import {
  MPGF_PUBLIC_GOODS_GOVERNANCE_PRIVACY_POLICY,
  getMpgfPublicGoodsGovernanceApi,
} from "./mpgf/public-goods-governance";
import {
  MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_POLICY,
  MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_PRIVACY_POLICY,
  createMpgfPublicGoodsGovernanceBallot,
  getMpgfPublicGoodsGovernanceResultsApi,
} from "./mpgf/public-goods-governance-ballots";
import {
  MPGF_EVIDENCE_ACCESS_SCOPE,
  MPGF_EVIDENCE_SIGNED_URL_TTL_SECONDS,
  normalizeMpgfManualEvidenceSecurity,
  verifyMpgfEvidenceAccessSignature,
} from "./mpgf/public-goods-evidence-security";
import {
  evaluateMpgfExactPilotGate,
  evaluateMpgfGovernanceMachineryGate,
  evaluateMpgfPayoutComplianceGate,
  evaluateMpgfProductionVerificationGate,
  evaluateMpgfSolverCertificationGate,
  loadMpgfProductionControlPlaneSummary,
  mpgfGatesForAdminSection,
} from "./mpgf/control-plane";
import { runMpgfProductionHealthCheck } from "./mpgf/production-verification";
import {
  canonicalMpgfHash,
  loadMpgfPublicExperienceProfile,
  runMpgfProductionDirectWorkingLaunch,
  runMpgfDirectWorkingSmokeTest,
  runMpgfWwwDirectWorkingVerification,
  validateFormalMechanismSourceLock,
  validateLedgerTransactionTemplates,
  validateLedgerTemplateRegistry,
  validateMpgfCopyLibrary,
  validateMpgfDataRetentionPolicy,
  validateMpgfProductionAuthSessionProfile,
  validateMpgfDeploymentEnvironment,
  validateMpgfDirectWorkingFixtures,
  validateMpgfPayoutProviderProfile,
  validateMpgfInstructionMechanicalNormalization,
  validateMpgfPhaseA,
  validateMpgfProductionDeploymentTarget,
  validateMpgfPublicExperienceProfile,
  validateMpgfProtocolParameters,
  validateMpgfParticipantOnboardingProfile,
  validateMpgfRateLimits,
  validateMpgfRbacPermissionMatrix,
  validateMpgfReceiptTemplateRegistry,
  validateMpgfSchemaContractCoverage,
  validateMpgfStateMachineCoverage,
  validateMpgfStatusValueRegistry,
  validateMpgfWwwProductionHealthChecks,
  validateMpgfSolverSupportProfile,
  validateMpgfSolverBenchmarkFixtures,
  validateMpgfWwwSmokeTestProfile,
  provisionMpgfWwwSmokeTestIdentity,
  createMpgfWwwSmokeTestSession,
  enforceMpgfRateLimit,
  redactMpgfSecrets,
  rotateMpgfSecret,
  discoverMpgfStatusFields,
  discoverStatusBearingMpgfObjects,
  transitionMpgfState,
} from "./mpgf/validators";

const demoPoolReasoningInput = {
  title: "Shared public-goods evidence reserve",
  summary: "A reviewable reserve for cross-cause public evidence.",
  causeArea: "public evidence",
  problem: "Participants need comparable evidence before they can coordinate.",
  intervention: "Fund shared evaluation work that multiple moral views can inspect.",
  moralPublicGoodRationale: "Better shared evidence is useful across many moral views.",
  requestedMaximumFundingCents: 50_000_00,
  minimumViableFundingCents: 10_000_00,
  outcomeUnitLabel: "reviewed evidence package",
  outcomeUnitDefinition: "One public package with assumptions, sources, and uncertainty notes.",
  measurementMethod: "Count completed packages accepted for MPGF review.",
  expectedEffectVsFunding: "More funding increases the number and depth of packages up to the request cap.",
  timeline: "One pilot cycle.",
  milestones: ["scope package", "publish evidence", "complete review"],
  risks: ["low actionability", "biased evidence selection"],
  misusePathways: "Evidence work could be framed selectively if review is weak.",
  implementingTeam: "MPGF pilot reviewers and independent evaluators.",
};

test("MPGF exact demo allocation balances to the budget", () => {
  const allocation = computeExactMpgfAllocation();

  assert.equal(allocation.allocatedCents + allocation.carryoverCents, allocation.budgetCents);
  assert.equal(allocation.certificate.algorithm, "exact_integer_proportional_v0");
});

test("MPGF non-real-money demo ledger transactions are balanced", () => {
  const transactions = buildDemoLedgerTransactions();

  assert.ok(transactions.length > 0);
  assert.ok(transactions.every(isLedgerBalanced));
});

test("MPGF public summary exposes no live disbursement state in demo mode", () => {
  const summary = buildPublicSummary();

  assert.equal(summary.releasedInternalCents, 0);
  assert.equal(summary.payoutAuthorizedCents, 0);
  assert.equal(summary.externallyPaidCents, 0);
  assert.match(summary.nonRealMoneyStatus, /non-real-money/i);
});

test("MPGF direct-working validators pass with the exact-pilot formal source lock", () => {
  assert.equal(validateMpgfInstructionMechanicalNormalization().status, "passed");
  assert.equal(validateMpgfProtocolParameters().status, "passed");
  assert.equal(validateLedgerTemplateRegistry().status, "passed");
  assert.equal(validateLedgerTransactionTemplates().status, "passed");
  assert.equal(validateMpgfDirectWorkingFixtures().status, "passed");
  assert.equal(validateMpgfStateMachineCoverage().status, "passed");
  assert.equal(validateMpgfStatusValueRegistry().status, "passed");
  assert.equal(validateMpgfSchemaContractCoverage().status, "passed");
  assert.equal(validateMpgfRbacPermissionMatrix().status, "passed");
  assert.equal(validateMpgfCopyLibrary().status, "passed");
  assert.equal(validateMpgfRateLimits().status, "passed");
  assert.equal(validateMpgfPayoutProviderProfile().status, "passed");
  assert.equal(validateMpgfDataRetentionPolicy().status, "passed");
  assert.equal(validateMpgfReceiptTemplateRegistry().status, "passed");
  assert.equal(validateMpgfPublicExperienceProfile().status, "passed");
  assert.equal(validateMpgfParticipantOnboardingProfile().status, "passed");
  assert.equal(validateMpgfProductionAuthSessionProfile().status, "passed");
  assert.equal(validateMpgfWwwSmokeTestProfile().status, "passed");
  assert.equal(validateMpgfWwwProductionHealthChecks().status, "passed");
  assert.equal(validateMpgfProductionDeploymentTarget().status, "passed");
  assert.equal(validateMpgfSolverSupportProfile().status, "passed");
  assert.equal(validateMpgfSolverBenchmarkFixtures().status, "passed");
  assert.equal(validateFormalMechanismSourceLock().status, "passed");
  assert.equal(validateMpgfPhaseA().status, "passed");
});

test("MPGF direct-working smoke test passes without real-money mode", () => {
  const result = runMpgfDirectWorkingSmokeTest();

  assert.equal(result.status, "passed");
  assert.equal(result.passed, true);
  assert.equal(result.featureMode, "pledge_only");
  assert.ok(result.blockers.every((blocker) => typeof blocker === "string"));
  assert.ok(result.checks.every((check) => typeof check.passed === "boolean"));
});

test("MPGF public runtime readiness avoids repository artifact validators", () => {
  const result = runMpgfPublicRuntimeReadinessCheck();

  assert.equal(result.status, "passed");
  assert.equal(result.blockers.length, 0);
  assert.ok(result.checks.every((check) => check.routeOrAction === "/mpgf"));
});

test("MPGF direct-working participant actions create only non-real-money demo state", () => {
  const pledge = createMpgfPledgeOnlyRecord({ amountCents: 1500, cadence: "monthly" });
  const proposal = submitMpgfPoolProposalDraft(demoPoolReasoningInput);
  const draft = saveMpgfBallotDraft({
    userId: "test-participant",
    cycleId: "mpgf-cycle-demo-2026-05",
    weightsByAlternativeId: {
      "global-health-basic-needs": 4000,
      "existential-risk-resilience": 3000,
      "animal-welfare-transition": 2000,
      "public-interest-knowledge": 1000,
    },
  });
  const submitted = submitMpgfBallot(draft);

  assert.equal(pledge.status, "pledged");
  assert.equal(proposal.status, "submitted_for_demo_review");
  assert.equal(proposal.createsLiveAllocation, false);
  assert.equal(proposal.createsPayoutAuthorization, false);
  assert.equal(proposal.createsRealMoneyRecord, false);
  assert.equal(draft.status, "draft");
  assert.equal(draft.curves?.length, 4);
  assert.deepEqual(draft.totalAbsIntegralRationalJson, { num: "10000", den: "10000" });
  assert.equal(submitted.cycleId, "mpgf-cycle-demo-2026-05");
  assert.equal(submitted.status, "submitted");
  assert.equal(submitted.curves?.[0]?.curveJson.representation, "piecewise_linear");
});

test("MPGF recurring pledge-only commitments are distinct from pledge rows", () => {
  const commitment = createMpgfRecurringContributionCommitment({
    userId: "test-participant",
    amountCents: 1200,
    mode: "pledge_only",
  });
  const materializedPledge = materializeMpgfRecurringPledgeForCycle({
    commitmentId: commitment.id,
    cycleId: "mpgf-cycle-demo-2026-05",
    commitment,
  });
  const paused = pauseMpgfRecurringContributionCommitment(commitment.id, commitment);
  const resumed = resumeMpgfRecurringContributionCommitment(commitment.id, paused);
  const cancelled = cancelMpgfRecurringContributionCommitment(commitment.id, resumed);

  assert.equal(commitment.status, "active");
  assert.equal(commitment.mode, "pledge_only");
  assert.equal(materializedPledge.status, "pledged");
  assert.equal(materializedPledge.pledgeMode, "pledge_only");
  assert.equal(materializedPledge.recurringCommitmentId, commitment.id);
  assert.equal(paused.status, "paused");
  assert.equal(resumed.status, "active");
  assert.equal(cancelled.status, "cancelled");
});

test("MPGF canonical hash is stable for nested JSON key order", () => {
  const left = {
    z: [{ b: 2, a: 1 }],
    a: {
      y: true,
      x: ["same", { beta: 2, alpha: 1 }],
    },
  };
  const right = {
    a: {
      x: ["same", { alpha: 1, beta: 2 }],
      y: true,
    },
    z: [{ a: 1, b: 2 }],
  };

  assert.equal(canonicalMpgfHash(left), canonicalMpgfHash(right));
});

test("MPGF canonical hash normalizes optional JSON edge fields", () => {
  assert.equal(canonicalMpgfHash({ present: true, absent: undefined }), canonicalMpgfHash({ present: true }));
  assert.equal(canonicalMpgfHash([undefined, Number.NaN]), canonicalMpgfHash([null, null]));
});

test("MPGF public route evidence includes pool proposal route", () => {
  assert.ok(mpgfPublicRoutes.includes("/mpgf/pools/new"));
  assert.ok(mpgfPublicRoutes.includes("/mpgf/governance"));
});

test("MPGF verified assurance campaigns gate on amount, supporters, and review", () => {
  const [globalHealth, resilience] = demoMpgfPublicGoodsCampaigns;

  assert.ok(globalHealth);
  assert.ok(resilience);

  const globalHealthStatus = getMpgfCampaignAssuranceStatus(globalHealth);
  const resilienceStatus = getMpgfCampaignAssuranceStatus(resilience);

  assert.equal(globalHealthStatus.status, "payable");
  assert.equal(globalHealthStatus.thresholdPassed, true);
  assert.equal(globalHealthStatus.reviewPassed, true);
  assert.equal(globalHealthStatus.verifiedSupporterCount, 3);
  assert.equal(globalHealthStatus.directEligibleCents, 27_500);

  assert.equal(resilienceStatus.status, "threshold_pending");
  assert.equal(resilienceStatus.thresholdPassed, false);
  assert.ok(resilienceStatus.blockers.includes("amount_or_verified_supporter_threshold_not_met"));
});

test("MPGF assurance matching allocates sponsor match and capped identity-aware QF only to payable campaigns", () => {
  const allocation = allocateMpgfAssuranceRound();
  const summary = summarizeMpgfAssuranceRound(allocation);
  const globalHealth = allocation.lines.find((line) => line.campaignId === "campaign-global-health-basic-needs");
  const animalWelfare = allocation.lines.find((line) => line.campaignId === "campaign-animal-welfare-transition");
  const resilience = allocation.lines.find((line) => line.campaignId === "campaign-existential-risk-resilience");

  assert.ok(globalHealth);
  assert.ok(animalWelfare);
  assert.ok(resilience);
  assert.equal(summary.payableCampaignCount, 2);
  assert.equal(summary.proofPageRequired, true);
  assert.equal(globalHealth.status, "payable");
  assert.equal(animalWelfare.status, "payable");
  assert.equal(resilience.baseMatchCents, 0);
  assert.equal(resilience.qfBonusCents, 0);
  assert.ok(globalHealth.baseMatchCents > 0);
  assert.ok(globalHealth.qfBonusCents > 0);
  assert.ok(globalHealth.qfBonusCents <= globalHealth.qfBonusCapCents);
  assert.ok(animalWelfare.qfBonusCents <= animalWelfare.qfBonusCapCents);
  assert.equal(allocation.baseMatchAllocatedCents, globalHealth.baseMatchCents + animalWelfare.baseMatchCents);
  assert.equal(allocation.qfBonusAllocatedCents, globalHealth.qfBonusCents + animalWelfare.qfBonusCents);
});

test("MPGF assurance QF collapses duplicate identities and expires missed thresholds", () => {
  const animalWelfare = demoMpgfPublicGoodsCampaigns.find((campaign) => campaign.id === "campaign-animal-welfare-transition");
  const knowledge = demoMpgfPublicGoodsCampaigns.find((campaign) => campaign.id === "campaign-public-interest-knowledge");
  const globalHealth = demoMpgfPublicGoodsCampaigns.find((campaign) => campaign.id === "campaign-global-health-basic-needs");

  assert.ok(animalWelfare);
  assert.ok(knowledge);
  assert.ok(globalHealth);

  const animalStatus = getMpgfCampaignAssuranceStatus(animalWelfare);
  const knowledgeStatus = getMpgfCampaignAssuranceStatus(knowledge);
  const animalPledges = demoMpgfAssurancePledges.filter((pledge) => pledge.campaignId === animalWelfare.id);
  const splitPaymentIntentPledges = [
    {
      ...demoMpgfAssurancePledges[0]!,
      id: "pledge-split-same-donor-a",
      userId: "same-donor",
      amountCents: 8_000,
      paymentIntentRef: "pi_split_a",
    },
    {
      ...demoMpgfAssurancePledges[0]!,
      id: "pledge-split-same-donor-b",
      userId: "same-donor",
      amountCents: 8_000,
      paymentIntentRef: "pi_split_b",
    },
    {
      ...demoMpgfAssurancePledges[1]!,
      id: "pledge-split-other-donor",
      userId: "other-donor",
      amountCents: 8_000,
      paymentIntentRef: "pi_split_c",
    },
  ];
  const splitStatus = getMpgfCampaignAssuranceStatus(globalHealth, splitPaymentIntentPledges);
  const splitQfScore = computeMpgfCampaignQfScore(globalHealth, splitPaymentIntentPledges, 10_000);
  const mergedDonorScore = computeMpgfVerifiedQfRawScore(
    [
      { donorId: "same-donor", grossCents: 16_000, verificationWeight: 1 },
      { donorId: "other-donor", grossCents: 8_000, verificationWeight: 1 },
    ],
    10_000,
  );
  const rawPaymentObjectScore = computeMpgfVerifiedQfRawScore(
    [
      { donorId: "payment-a", grossCents: 8_000, verificationWeight: 1 },
      { donorId: "payment-b", grossCents: 8_000, verificationWeight: 1 },
      { donorId: "payment-c", grossCents: 8_000, verificationWeight: 1 },
    ],
    10_000,
  );
  const animalQfScore = computeMpgfCampaignQfScore(animalWelfare);
  const exactTwoDonorScore = computeMpgfVerifiedQfRawScore(
    [
      { donorId: "donor-a", grossCents: 10_000, verificationWeight: 1 },
      { donorId: "donor-b", grossCents: 10_000, verificationWeight: 1 },
    ],
    10_000,
  );

  assert.equal(animalPledges.length, 4);
  assert.equal(animalStatus.verifiedSupporterCount, 3);
  assert.equal(animalStatus.excludedPledgeCount, 1);
  assert.equal(splitStatus.verifiedSupporterCount, 2);
  assert.equal(splitQfScore, mergedDonorScore);
  assert.ok(splitQfScore < rawPaymentObjectScore);
  assert.equal(knowledgeStatus.status, "expired");
  assert.ok(animalQfScore > animalStatus.directEligibleCents);
  assert.equal(exactTwoDonorScore, 20_000);
  assert.equal(countMpgfQfContributionCents(25_000, 10_000), 10_000);
  assert.equal(computeMpgfVerifiedQfRawScore([{ donorId: "solo", grossCents: 25_000, verificationWeight: 1 }], 10_000), 0);
  assert.equal(computeMpgfVerifiedQfRawScore([{ donorId: "unverified", grossCents: 10_000, verificationWeight: 0 }], 10_000), 0);
  assert.equal(mpgfVerificationWeightFromHumanScoreBps(8_000), 1);
  assert.equal(mpgfVerificationWeightFromHumanScoreBps(5_000), 0.5);
  assert.equal(mpgfVerificationWeightFromHumanScoreBps(4_999), 0);
});

test("MPGF assurance match budget scales down deterministically when raw base match exceeds sponsor budget", () => {
  const globalHealth = demoMpgfPublicGoodsCampaigns[0];
  const animalWelfare = demoMpgfPublicGoodsCampaigns[2];

  assert.ok(globalHealth);
  assert.ok(animalWelfare);

  const constrained = allocateMpgfAssuranceRound({
    campaigns: [globalHealth, animalWelfare],
    pledges: demoMpgfAssurancePledges,
    round: demoMpgfAssuranceRound,
    matchPool: {
      ...demoMpgfMatchPool,
      budgetCents: 30_000,
      qfBonusCents: 0,
    },
  });

  assert.equal(constrained.baseMatchBudgetCents, 30_000);
  assert.equal(constrained.baseMatchAllocatedCents, 30_000);
  assert.equal(constrained.qfBonusAllocatedCents, 0);
  assert.ok(constrained.lines.every((line) => line.baseMatchCents <= line.directEligibleCents));

  const blocked = allocateMpgfAssuranceRound({
    campaigns: [{ ...globalHealth, reviewStatus: "blocked" }],
    pledges: demoMpgfAssurancePledges,
    round: demoMpgfAssuranceRound,
    matchPool: demoMpgfMatchPool,
  });
  const blockedLine = blocked.lines[0];

  assert.ok(blockedLine);
  assert.equal(blockedLine.status, "blocked");
  assert.equal(blockedLine.baseMatchCents, 0);
  assert.equal(blockedLine.qfBonusCents, 0);
});

test("MPGF assurance output preserves the no-custody external-handoff posture", () => {
  const allocation = allocateMpgfAssuranceRound();
  const payable = allocation.lines.filter((line) => line.status === "payable");

  assert.ok(payable.length > 0);
  assert.ok(payable.every((line) => line.custodyMode === "no_custody_external_handoff"));
  assert.ok(payable.every((line) => line.proofRequired === "external_destination_receipt" || line.proofRequired === "signed_intent_review"));
  assert.ok(allocation.proofPageRequired);
});

test("MPGF public-goods allocation finalization builds persistable no-payout-leak rows", async () => {
  const allocation = allocateMpgfAssuranceRound();
  const rows = buildMpgfPublicGoodsAllocationResultRows({
    allocation,
    finalizedAt: "2026-05-30T12:00:00.000Z",
  });
  const globalHealth = rows.find((row) => row.campaign_id === "campaign-global-health-basic-needs");
  const resilience = rows.find((row) => row.campaign_id === "campaign-existential-risk-resilience");
  const animalWelfare = rows.find((row) => row.campaign_id === "campaign-animal-welfare-transition");
  const sourceProofByCampaignId = buildMpgfPublicGoodsAllocationSourceProofMap({ allocation });
  const dryRun = await persistMpgfPublicGoodsAllocationResults({
    allocation,
    dryRun: true,
    finalizedAt: "2026-05-30T12:00:00.000Z",
  });
  const route = readFileSync("src/app/api/mpgf/public-goods/allocate/route.ts", "utf8");

  assert.equal(rows.length, allocation.lines.length);
  assert.ok(globalHealth);
  assert.ok(resilience);
  assert.ok(animalWelfare);
  assert.equal(globalHealth.status, "payable");
  assert.ok(globalHealth.total_payout_cents > 0);
  assert.ok(globalHealth.qf_bonus_cents <= globalHealth.qf_bonus_cap_cents);
  assert.match(globalHealth.source_contribution_digest, /^sha256:/);
  assert.equal(globalHealth.regenerated_from_contribution_records, true);
  assert.equal(globalHealth.verified_supporter_count, globalHealth.unique_counted_identity_count);
  assert.equal(globalHealth.source_contribution_digest, sourceProofByCampaignId.get(globalHealth.campaign_id)?.sourceContributionDigest);
  assert.ok(globalHealth.unique_counted_identity_count <= globalHealth.raw_payment_object_count);
  assert.ok(globalHealth.unique_counted_identity_count <= globalHealth.eligible_contribution_record_count);
  assert.ok(animalWelfare.raw_payment_object_count > animalWelfare.unique_counted_identity_count);
  assert.equal(animalWelfare.verified_supporter_count, animalWelfare.unique_counted_identity_count);
  assert.equal(JSON.stringify(rows).includes("demo-supporter"), false);
  assert.equal(JSON.stringify(rows).includes("supporterReason"), false);
  assert.notEqual(resilience.status, "payable");
  assert.equal(resilience.total_payout_cents, 0);
  assert.equal(dryRun.status, "dry_run");
  assert.equal(dryRun.persistedCount, 0);
  assert.match(route, /MPGF_ALLOCATION_SECRET/);
  assert.match(route, /persistMpgfPublicGoodsAllocationResults/);
  assert.match(route, /proofPageRequired/);
  assert.match(route, /qfBonusCapCents/);
});

test("MPGF public-goods public API surfaces aggregate rounds, campaigns, matching, and ledger", () => {
  const rounds = listMpgfPublicGoodsRoundsApi();
  const round = getMpgfPublicGoodsRoundApi(demoMpgfAssuranceRound.id);
  const campaigns = listMpgfPublicGoodsCampaignsApi(demoMpgfAssuranceRound.id);
  const detail = getMpgfPublicGoodsCampaignApi(demoMpgfPublicGoodsCampaigns[0]?.slug ?? "");
  const preview = getMpgfPublicGoodsMatchPreviewApi(demoMpgfAssuranceRound.id);
  const frozenCampaignId = demoMpgfPublicGoodsCampaigns[0]?.id ?? "";
  const frozenPreview = getMpgfPublicGoodsMatchPreviewApi(demoMpgfAssuranceRound.id, {
    incidentStatusByCampaignId: { [frozenCampaignId]: "frozen" },
  });
  const frozenDetail = getMpgfPublicGoodsCampaignApi(frozenCampaignId, {
    incidentStatusByCampaignId: { [frozenCampaignId]: "frozen" },
  });
  const allocations = getMpgfPublicGoodsAllocationReportApi(demoMpgfAssuranceRound.id);
  const ledger = getMpgfPublicGoodsLedgerApi();

  assert.equal(rounds.privacyPolicy, MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY);
  assert.equal(rounds.cacheControl, MPGF_PUBLIC_GOODS_API_CACHE_CONTROL);
  assert.deepEqual(MPGF_PUBLIC_GOODS_API_HEADERS, { "Cache-Control": MPGF_PUBLIC_GOODS_API_CACHE_CONTROL });
  assert.equal(rounds.rounds.length, 1);
  assert.ok(round);
  assert.equal(round.cacheControl, MPGF_PUBLIC_GOODS_API_CACHE_CONTROL);
  assert.equal(round.round.contributionFlow?.primaryFlow, MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_FLOW);
  assert.equal(round.round.contributionFlow?.pledgeIntentPath, `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/pledge-intents`);
  assert.equal(round.round.contributionFlow?.manualEvidenceFallbackPath, "/api/mpgf/evidence/manual");
  assert.ok(round.round.contributionFlow?.stateObjects.includes("provider_payment_event"));
  assert.equal(round.round.finalization.policy, MPGF_PUBLIC_GOODS_FINALIZATION_POLICY);
  assert.equal(round.round.finalization.previewPath, `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/finalize-preview`);
  assert.equal(round.round.finalization.proofPath, `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/proof`);
  assert.ok(round.round.proceduralBadges);
  assert.equal(round.round.proceduralBadges.policy, MPGF_PUBLIC_GOODS_PROCEDURAL_BADGE_POLICY);
  assert.equal(round.round.proceduralBadges.hiddenSignals.moralKarmaScore, false);
  assert.ok(round.round.proceduralBadges.counters.verified_supporter > 0);
  assert.equal(round.round.governance.ballotPolicy, MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_POLICY);
  assert.equal(round.round.governance.ballotPath, "/api/mpgf/governance/ballots");
  assert.equal(round.round.governance.challengePath, "/api/mpgf/challenges");
  assert.equal(round.round.governance.noGlobalMoralRanking, true);
  assert.match(round.round.sponsorPool.visibleCommitment, /challenge match/i);
  assert.ok(Number(round.round.sponsorPool.perDonorQfCapCents) > 0);
  assert.equal(round.round.sponsorPool.verificationWeightPolicy, "identity_confidence_only_no_moral_reputation");
  assert.equal(round.round.sponsorPool.flywheelPolicy, "trade_surplus_funded_verified_plural_assurance");
  assert.equal(round.round.sponsorPool.flywheelPath, `/api/mpgf/sponsor-pools/${demoMpgfMatchPool.id}`);
  assert.equal(round.round.sponsorPool.depositPath, `/api/mpgf/sponsor-pools/${demoMpgfMatchPool.id}/deposits`);
  assert.equal(round.round.sponsorPool.tradeSurplusCommitPath, "/api/mpgf/trade-surplus/commit");
  assert.ok(round.round.sponsorPool.flywheelSourceTypes.includes("donation_offset_surplus"));
  assert.ok(round.round.sponsorPool.flywheelSourceTypes.includes("trade_surplus_tithe"));
  assert.ok(campaigns);
  assert.equal(campaigns.campaigns.length, demoMpgfPublicGoodsCampaigns.length);
  assert.ok(campaigns.campaigns.every((campaign) => campaign.milestoneSchedule.length === 3));
  assert.ok(campaigns.campaigns.some((campaign) => campaign.thresholdPassed));
  assert.ok(detail);
  assert.equal(detail.campaign.proofPath, `/mpgf/pools/${detail.campaign.slug}`);
  assert.equal(detail.campaign.campaignPath, `/mpgf/campaigns/${detail.campaign.slug}`);
  assert.equal(detail.campaign.incidentState, "clear");
  assert.equal(detail.campaign.appealState, "none");
  assert.equal(detail.campaign.destinationProof.destinationRef.includes("Demo"), true);
  assert.equal("supporterReason" in detail.campaign, false);
  assert.equal("userId" in detail.campaign, false);
  assert.ok(preview);
  assert.equal(preview.cacheControl, MPGF_PUBLIC_GOODS_API_CACHE_CONTROL);
  assert.equal(preview.final, false);
  assert.equal(preview.incidentFreezePolicy, "hide_mutable_match_preview_until_resolved");
  assert.match(preview.calcHash, /^sha256:/);
  assert.ok(preview.rows.every((row) => typeof row.verifiedDonorCount === "number"));
  assert.ok(frozenPreview);
  const frozenPreviewRow = frozenPreview.rows.find((row) => row.campaignId === frozenCampaignId);
  assert.ok(frozenPreviewRow);
  assert.equal(frozenPreviewRow.incidentState, "frozen");
  assert.equal(frozenPreviewRow.matchPreviewHiddenByIncidentFreeze, true);
  assert.equal(frozenPreviewRow.estimatedMatchCents, null);
  assert.equal(frozenPreviewRow.qfScore, null);
  assert.ok(frozenPreviewRow.blockers.includes("incident_frozen_match_preview_hidden"));
  assert.ok(frozenDetail);
  assert.equal(frozenDetail.campaign.incidentState, "frozen");
  assert.equal(frozenDetail.campaign.matchPreviewHiddenByIncidentFreeze, true);
  assert.equal(frozenDetail.campaign.matchEstimateCents, null);
  assert.ok(allocations);
  assert.equal(allocations.cacheControl, MPGF_PUBLIC_GOODS_API_CACHE_CONTROL);
  assert.equal(allocations.final, true);
  assert.equal(
    allocations.regenerationPolicy,
    "allocation_report_regenerates_from_underlying_contribution_records_collapsed_by_identity",
  );
  assert.ok(allocations.totalPayoutCents > 0);
  assert.ok(allocations.rows.every((row) => row.custodyMode === "no_custody_external_handoff"));
  const allocationReportRow = allocations.rows.find((row) => row.campaignId === "campaign-animal-welfare-transition");
  assert.ok(allocationReportRow);
  assert.match(allocationReportRow.sourceContributionDigest, /^sha256:/);
  assert.equal(allocationReportRow.regeneratedFromContributionRecords, true);
  assert.equal(allocationReportRow.verifiedDonorCount, allocationReportRow.uniqueCountedIdentityCount);
  assert.ok(allocationReportRow.rawPaymentObjectCount > allocationReportRow.uniqueCountedIdentityCount);
  assert.equal(ledger.ledgerPolicy, "public_aggregate_no_donor_rows_no_receipt_urls");
  assert.equal(ledger.cacheControl, MPGF_PUBLIC_GOODS_API_CACHE_CONTROL);
  assert.ok(ledger.rows.every((row) => row.releasedTotalCents === 0));
  assert.equal(getMpgfPublicGoodsRoundApi("unknown-round"), null);
  assert.equal(getMpgfPublicGoodsCampaignApi("unknown-campaign"), null);
  assert.equal(getMpgfPublicGoodsMatchPreviewApi("unknown-round"), null);
  assert.equal(getMpgfPublicGoodsAllocationReportApi("unknown-round"), null);

  const publicApiJson = JSON.stringify({ rounds, round, campaigns, detail, preview, allocations, ledger });

  for (const forbidden of [
    "demo-supporter",
    "supporterReason",
    "charityReceiptRef",
    "externalReceiptRef",
    "private@example",
  ]) {
    assert.equal(publicApiJson.includes(forbidden), false);
  }

  for (const [path, expected] of [
    ["src/app/api/mpgf/rounds/route.ts", /listMpgfPublicGoodsRoundsApi/],
    ["src/app/api/mpgf/rounds/[roundId]/route.ts", /getMpgfPublicGoodsRoundApi/],
    ["src/app/api/mpgf/rounds/[roundId]/campaigns/route.ts", /listMpgfPublicGoodsCampaignsApi/],
    ["src/app/api/mpgf/campaigns/[campaignId]/route.ts", /getMpgfPublicGoodsCampaignApi/],
    ["src/app/api/mpgf/rounds/[roundId]/match-preview/route.ts", /getMpgfPublicGoodsMatchPreviewApi/],
    ["src/app/api/mpgf/rounds/[roundId]/allocations/route.ts", /getMpgfPublicGoodsAllocationReportApi/],
    ["src/app/api/mpgf/rounds/[roundId]/pledge-intents/route.ts", /createMpgfPublicGoodsPledgeIntent/],
    ["src/app/api/mpgf/pledge-intents/[intentId]/verify-identity/route.ts", /verifyMpgfPublicGoodsPledgeIntentIdentity/],
    ["src/app/api/mpgf/pledge-intents/[intentId]/authorize-payment/route.ts", /authorizeMpgfPublicGoodsPledgeIntentPayment/],
    ["src/app/api/mpgf/provider-events/webhook/route.ts", /recordMpgfPublicGoodsProviderPaymentEvent/],
    ["src/app/api/mpgf/evidence/manual/route.ts", /manual-evidence\/route/],
    ["src/app/api/mpgf/rounds/[roundId]/finalize-preview/route.ts", /getMpgfPublicGoodsFinalizationReportApi/],
    ["src/app/api/mpgf/rounds/[roundId]/finalize/route.ts", /MPGF_ALLOCATION_SECRET/],
    ["src/app/api/mpgf/rounds/[roundId]/release/route.ts", /getMpgfPublicGoodsRoundReleasePlanApi/],
    ["src/app/api/mpgf/rounds/[roundId]/proof/route.ts", /getMpgfPublicGoodsFinalizationReportApi/],
    ["src/app/api/mpgf/rounds/[roundId]/hash/route.ts", /calculationHash/],
    ["src/app/api/mpgf/procedural-badges/route.ts", /getMpgfPublicGoodsProceduralBadgesApi/],
    ["src/app/api/mpgf/sponsor-pools/[poolId]/route.ts", /getMpgfPublicGoodsSponsorPoolFlywheelApi/],
    ["src/app/api/mpgf/sponsor-pools/[poolId]/deposits/route.ts", /recordMpgfPublicGoodsSponsorPoolDeposit/],
    ["src/app/api/mpgf/trade-surplus/commit/route.ts", /commitMpgfPublicGoodsTradeSurplus/],
    ["src/app/api/mpgf/trade-surplus/settle/route.ts", /settleMpgfPublicGoodsTradeSurplus/],
    ["src/app/api/mpgf/governance/ballots/route.ts", /createMpgfPublicGoodsGovernanceBallot/],
    ["src/app/api/mpgf/governance/results/route.ts", /getMpgfPublicGoodsGovernanceResultsApi/],
    ["src/app/api/mpgf/challenges/route.ts", /createMpgfPublicGoodsChallenge/],
    ["src/app/api/mpgf/audit/ledger/route.ts", /getMpgfPublicGoodsLedgerApi/],
    ["src/app/api/mpgf/providers/stripe/webhook/route.ts", /webhookCanAuthorizeFinalPayout: false/],
    ["src/app/api/mpgf/contributions/manual-evidence/route.ts", /manualEvidenceFallback: true/],
    ["src/app/api/mpgf/admin/integrity/route.ts", /identity_attestation_flags_only_no_hidden_moral_scores/],
  ] as const) {
    const source = readFileSync(path, "utf8");

    assert.match(source, expected);
    if (path.includes("/rounds") || path.includes("/campaigns/[campaignId]") || path.includes("/audit/ledger")) {
      assert.match(source, /MPGF_PUBLIC_GOODS_API_HEADERS/);
    }
    assert.doesNotMatch(source, /token voting/i);
  }

  const roundPage = readFileSync("src/app/mpgf/rounds/[roundId]/page.tsx", "utf8");
  const campaignPage = readFileSync("src/app/mpgf/campaigns/[campaignId]/page.tsx", "utf8");
  const contributionModal = readFileSync("src/components/mpgf/mpgf-contribution-modal.tsx", "utf8");
  const realMoneyCheckout = readFileSync("src/lib/mpgf/real-money.ts", "utf8");
  const mpgfHubPage = readFileSync("src/app/mpgf/page.tsx", "utf8");

  for (const expected of [
    /Sponsor-pool size/,
    /Round closes/,
    /Verified donors/,
    /Direct contributions/,
    /Threshold status/,
    /Estimated match/,
    /Final match/,
    /Evidence and destination proof/,
    /Campaign page/,
    /Appeal or dissent note/,
    /milestoneSchedule/,
    /getMpgfPublicGoodsMatchPreviewApi/,
    /getMpgfPublicGoodsAllocationReportApi/,
  ]) {
    assert.match(roundPage, expected);
  }

  assert.match(roundPage, /MpgfContributionModal/);
  for (const expected of [
    /Direct total/,
    /Counted total/,
    /Match estimate/,
    /Donor count/,
    /Threshold flags/,
    /Milestone schedule/,
    /Review summary/,
    /Destination proof/,
    /Incident state/,
    /Appeal state/,
    /getMpgfPublicGoodsCampaignApi/,
    /getMpgfPublicGoodsLedgerApi/,
  ]) {
    assert.match(campaignPage, expected);
  }
  for (const expected of [
    /role="dialog"/,
    /aria-modal="true"/,
    /One-time contribution/,
    /Monthly sponsor-pool sustainer/,
    /Optional campaign gift/,
    /Sponsor pool only/,
    /Count my gift for matching up to cap/,
    /Receipts and refunds/,
    /Verification and identity/,
    /\/api\/mpgf\/contributions\/checkout-session/,
    /\/api\/mpgf\/contributions\/subscription-session/,
    /perDonorCapCents/,
    /countForMatching/,
    /campaignId/,
  ]) {
    assert.match(contributionModal, expected);
  }
  for (const expected of [
    /mpgf_public_goods_round_id/,
    /mpgf_public_goods_campaign_id/,
    /mpgf_public_goods_count_for_matching/,
    /mpgf_public_goods_per_donor_cap_cents/,
    /mpgf_public_goods_sponsor_pool/,
  ]) {
    assert.match(realMoneyCheckout, expected);
  }

  assert.match(mpgfHubPage, new RegExp(`/mpgf/rounds/\\$\\{demoMpgfAssuranceRound\\.id\\}`));
  assert.match(mpgfHubPage, /Start conditional contribution/);
  assert.match(mpgfHubPage, /Verify identity, authorize conditionally, then wait for review/);
});

test("MPGF contribution intents verify identity before conditional payment authorization", () => {
  const contributionFlow = getMpgfPublicGoodsContributionFlowApi(demoMpgfAssuranceRound.id);
  const unknownFlow = getMpgfPublicGoodsContributionFlowApi("unknown-round");
  const intent = createMpgfPublicGoodsPledgeIntent({
    campaignId: demoMpgfPublicGoodsCampaigns[0]?.id ?? "",
    userId: "demo-contributor-private-user",
    amountCents: 12_500,
    idempotencyKey: "private-idempotency-key-001",
  });
  const verified = verifyMpgfPublicGoodsPledgeIntentIdentity(intent, {
    userId: "demo-contributor-private-user",
    provider: "external_proof_of_personhood",
    humanScoreBps: 9_200,
    providerPayload: {
      scoreBucket: "high",
      proofRef: "redacted-proof-ref",
    },
  });
  const authorized = authorizeMpgfPublicGoodsPledgeIntentPayment(verified.pledgeIntent, {
    identityVerification: verified.identityVerification,
    providerPaymentRef: "provider-private-payment-intent-001",
  });
  const manualFallback = authorizeMpgfPublicGoodsPledgeIntentPayment(verified.pledgeIntent, {
    identityVerification: verified.identityVerification,
    providerAvailable: false,
  });
  const providerEvent = recordMpgfPublicGoodsProviderPaymentEvent(authorized.paymentAuthorization, {
    providerEventRef: "provider-private-event-001",
    eventType: "authorization_created",
    signatureVerified: true,
  });
  const serialized = JSON.stringify({ contributionFlow, intent, verified, authorized, manualFallback, providerEvent });
  const route = readFileSync("src/app/api/mpgf/rounds/[roundId]/pledge-intents/route.ts", "utf8");
  const verifyRoute = readFileSync("src/app/api/mpgf/pledge-intents/[intentId]/verify-identity/route.ts", "utf8");
  const authorizeRoute = readFileSync("src/app/api/mpgf/pledge-intents/[intentId]/authorize-payment/route.ts", "utf8");
  const providerWebhookRoute = readFileSync("src/app/api/mpgf/provider-events/webhook/route.ts", "utf8");
  const manualAliasRoute = readFileSync("src/app/api/mpgf/evidence/manual/route.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260531_mpgf_contribution_intents.sql", "utf8");
  const contributionPage = readFileSync("src/app/mpgf/contribute/page.tsx", "utf8");
  const consoleSource = readFileSync("src/components/mpgf/mpgf-console.tsx", "utf8");

  assert.ok(contributionFlow);
  assert.equal(unknownFlow, null);
  assert.equal(contributionFlow.primaryFlow, MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_FLOW);
  assert.equal(contributionFlow.privacyPolicy, MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_PRIVACY_POLICY);
  assert.deepEqual(contributionFlow.stateObjects, [
    "pledge_intent",
    "identity_verification",
    "payment_authorization",
    "provider_payment_event",
  ]);
  assert.equal(intent.paymentState, "intent_created");
  assert.equal(intent.countingState, "preview_only");
  assert.match(intent.userRefHash, /^sha256:/);
  assert.match(intent.idempotencyKeyHash, /^sha256:/);
  assert.equal(intent.fallbackRule.manualEvidencePath, "/api/mpgf/evidence/manual");
  assert.equal(verified.identityVerification.status, "verified");
  assert.equal(verified.identityVerification.countsForMatching, true);
  assert.equal(verified.nextAction, "authorize_payment");
  assert.equal(authorized.paymentAuthorization.status, "authorized");
  assert.equal(authorized.paymentAuthorization.requiresProviderWebhook, true);
  assert.equal(authorized.paymentAuthorization.finalPayoutAuthorized, false);
  assert.equal(authorized.paymentAuthorization.capturePolicy, "capture_only_after_threshold_review_and_challenge_window");
  assert.match(authorized.paymentAuthorization.providerRefHash ?? "", /^sha256:/);
  assert.equal(manualFallback.paymentAuthorization.status, "manual_fallback_required");
  assert.equal(manualFallback.paymentAuthorization.manualEvidencePath, "/api/mpgf/evidence/manual");
  assert.equal(providerEvent.status, "recorded");
  assert.equal(providerEvent.finalPayoutAuthorized, false);
  assert.match(providerEvent.providerEventRefHash, /^sha256:/);
  assert.match(providerEvent.appendOnlyHash, /^sha256:/);
  assert.match(route, /reviewRequiredBeforeCounting: true/);
  assert.match(verifyRoute, /finalPayoutAuthorized: false/);
  assert.match(authorizeRoute, /providerWebhookPath: "\/api\/mpgf\/provider-events\/webhook"/);
  assert.match(providerWebhookRoute, /Missing MPGF provider event signature/);
  assert.match(providerWebhookRoute, /finalPayoutAuthorized: false/);
  assert.match(manualAliasRoute, /contributions\/manual-evidence\/route/);
  assert.match(migration, /create table if not exists public\.mpgf_pledge_intents/);
  assert.match(migration, /create table if not exists public\.mpgf_identity_verifications/);
  assert.match(migration, /create table if not exists public\.mpgf_payment_authorizations/);
  assert.match(migration, /create table if not exists public\.mpgf_provider_payment_events/);
  assert.match(migration, /capture_only_after_threshold_review_and_challenge_window/);
  assert.match(migration, /final_payout_authorized boolean not null default false check \(final_payout_authorized = false\)/);
  assert.match(contributionPage, /verified conditional authorization/);
  assert.match(consoleSource, /Contribution intent/);
  assert.match(consoleSource, /Create contribution intent/);

  for (const forbidden of [
    "demo-contributor-private-user",
    "private-idempotency-key-001",
    "provider-private-payment-intent-001",
    "provider-private-event-001",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("MPGF finalization applies deterministic coordination penalties and proof hashes", () => {
  const flags = detectMpgfPublicGoodsCoordinationFlags();
  const preview = buildMpgfPublicGoodsFinalizationReport();
  const finalization = buildMpgfPublicGoodsFinalizationReport({ final: true });
  const apiFinalization = getMpgfPublicGoodsFinalizationReportApi(demoMpgfAssuranceRound.id, true);
  const unknownFinalization = getMpgfPublicGoodsFinalizationReportApi("unknown-round", true);
  const releasePlan = buildMpgfPublicGoodsRoundReleasePlan({ finalization });
  const releaseApi = getMpgfPublicGoodsRoundReleasePlanApi(demoMpgfAssuranceRound.id);
  const serialized = JSON.stringify({ flags, preview, finalization, releasePlan });
  const animalRow = finalization.rows.find((row) => row.campaignId === "campaign-animal-welfare-transition");
  const previewRoute = readFileSync("src/app/api/mpgf/rounds/[roundId]/finalize-preview/route.ts", "utf8");
  const finalizeRoute = readFileSync("src/app/api/mpgf/rounds/[roundId]/finalize/route.ts", "utf8");
  const releaseRoute = readFileSync("src/app/api/mpgf/rounds/[roundId]/release/route.ts", "utf8");
  const proofRoute = readFileSync("src/app/api/mpgf/rounds/[roundId]/proof/route.ts", "utf8");
  const hashRoute = readFileSync("src/app/api/mpgf/rounds/[roundId]/hash/route.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260531_mpgf_coordination_finalization.sql", "utf8");

  assert.ok(apiFinalization);
  assert.equal(unknownFinalization, null);
  assert.equal(preview.final, false);
  assert.equal(preview.status, "preview");
  assert.equal(finalization.final, true);
  assert.equal(finalization.status, "finalized");
  assert.equal(finalization.policy, MPGF_PUBLIC_GOODS_FINALIZATION_POLICY);
  assert.equal(finalization.privacyPolicy, MPGF_PUBLIC_GOODS_COORDINATION_PRIVACY_POLICY);
  assert.match(finalization.calcHash, /^sha256:/);
  assert.ok(flags.length >= 1);
  assert.ok(flags.every((flag) => flag.clusterKeyHash.startsWith("sha256:")));
  assert.ok(flags.every((flag) => flag.appendOnlyHash.startsWith("sha256:")));
  assert.ok(animalRow);
  assert.equal(animalRow.antiCollusionFactorBps, 8_500);
  assert.equal(animalRow.coordinationFlagCount, 1);
  assert.ok(animalRow.qfBonusCents < animalRow.qfRawCents);
  assert.equal(animalRow.withheldQfBonusCents, animalRow.qfRawCents - animalRow.qfBonusCents);
  assert.equal(animalRow.finalTotalCents, animalRow.directEligibleCents + animalRow.baseMatchCents + animalRow.qfBonusCents);
  assert.match(animalRow.sourceContributionDigest, /^sha256:/);
  assert.match(animalRow.calculationHash, /^sha256:/);
  assert.ok(finalization.withheldQfBonusCents > 0);
  assert.equal(finalization.requiresHumanReviewBeforeIrreversibleStateChange, true);
  assert.equal(finalization.finalPayoutAuthorized, false);
  assert.equal(releasePlan.roundId, finalization.roundId);
  assert.equal(releasePlan.finalizationHash, finalization.calcHash);
  assert.equal(releasePlan.partnerReleaseAuthorizationRequired, true);
  assert.equal(releasePlan.dualControlRequired, true);
  assert.equal(releasePlan.finalPayoutAuthorized, false);
  assert.ok(releasePlan.releases.every((release) => release.status === "partner_release_pending"));
  assert.ok(releaseApi);
  assert.match(previewRoute, /finalization preview/);
  assert.match(finalizeRoute, /MPGF_PUBLIC_GOODS_ROUND_CLOSE_SECRET/);
  assert.match(finalizeRoute, /Unauthorized MPGF public-goods finalization request/);
  assert.match(releaseRoute, /MPGF_PUBLIC_GOODS_RELEASE_SECRET/);
  assert.match(releaseRoute, /finalPayoutAuthorized/);
  assert.match(proofRoute, /getMpgfPublicGoodsFinalizationReportApi/);
  assert.match(hashRoute, /calculationHash/);
  assert.match(migration, /create table if not exists public\.mpgf_coordination_flags/);
  assert.match(migration, /create table if not exists public\.mpgf_round_allocations/);
  assert.match(migration, /anti_collusion_factor_bps/);
  assert.match(migration, /withheld_qf_bonus_cents/);
  assert.match(migration, /calculation_hash/);
  assert.match(migration, /MPGF coordination flags are append-only/);

  for (const forbidden of [
    "demo-supporter-harper-shadow",
    "pledge-assurance-animal-duplicate",
    "charityReceiptRef",
    "externalReceiptRef",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("MPGF procedural badges expose record facts without moral karma", () => {
  const ledger = buildMpgfPublicGoodsProceduralBadgeLedger();
  const api = getMpgfPublicGoodsProceduralBadgesApi(demoMpgfAssuranceRound.id);
  const unknown = getMpgfPublicGoodsProceduralBadgesApi("unknown-round");
  const serialized = JSON.stringify(ledger);
  const route = readFileSync("src/app/api/mpgf/procedural-badges/route.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260531_mpgf_procedural_badges.sql", "utf8");
  const peoplePage = readFileSync("src/app/people/page.tsx", "utf8");
  const profileTrust = readFileSync("src/lib/public-profile-trust.ts", "utf8");

  assert.ok(api);
  assert.equal(unknown, null);
  assert.equal(ledger.policy, MPGF_PUBLIC_GOODS_PROCEDURAL_BADGE_POLICY);
  assert.equal(ledger.privacyPolicy, MPGF_PUBLIC_GOODS_PROCEDURAL_BADGE_PRIVACY_POLICY);
  assert.equal(ledger.hiddenSignals.moralKarmaScore, false);
  assert.equal(ledger.hiddenSignals.transferableGovernanceWeight, false);
  assert.equal(ledger.definitions.length, 5);
  assert.ok(ledger.definitions.some((definition) => definition.badgeType === "verified_supporter"));
  assert.ok(ledger.definitions.some((definition) => definition.badgeType === "fulfilled_pledge"));
  assert.ok(ledger.definitions.some((definition) => definition.badgeType === "sponsor_contributor"));
  assert.ok(ledger.definitions.some((definition) => definition.badgeType === "appeal_cleared_contribution"));
  assert.ok(ledger.definitions.some((definition) => definition.badgeType === "early_supporter"));
  assert.ok(ledger.counters.verified_supporter > 0);
  assert.ok(ledger.counters.fulfilled_pledge > 0);
  assert.ok(ledger.counters.sponsor_contributor > 0);
  assert.ok(ledger.counters.early_supporter > 0);
  assert.equal(ledger.counters.appeal_cleared_contribution, 0);
  assert.ok(ledger.badges.every((badge) => badge.noScoreIssued === true));
  assert.ok(ledger.badges.every((badge) => badge.userRefHash.startsWith("sha256:")));
  assert.ok(ledger.badges.every((badge) => badge.sourceRecordHash.startsWith("sha256:")));
  assert.match(ledger.calcHash, /^sha256:/);
  assert.match(route, /MPGF_PUBLIC_GOODS_API_HEADERS/);
  assert.match(route, /getMpgfPublicGoodsProceduralBadgesApi/);
  assert.match(migration, /mpgf_public_goods_procedural_badges/);
  assert.match(migration, /verified_supporter/);
  assert.match(migration, /fulfilled_pledge/);
  assert.match(migration, /sponsor_contributor/);
  assert.match(migration, /appeal_cleared_contribution/);
  assert.match(migration, /early_supporter/);
  assert.match(migration, /no_score_issued boolean not null default true check \(no_score_issued = true\)/);
  assert.match(peoplePage, /not follower,\s+karma, or comment leaderboards/);
  assert.match(profileTrust, /reviewed proof badge/);

  for (const forbidden of [
    "demo-supporter-alix",
    "demo-sponsor-circle-member",
    "payment-proof-global-health-demo",
    "pledge-assurance-global-health-1",
    "moralKarmaScore\":true",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("MPGF sponsor-pool flywheel aggregates trade surplus without private source refs", () => {
  const flywheel = buildMpgfPublicGoodsSponsorPoolFlywheel();
  const api = getMpgfPublicGoodsSponsorPoolFlywheelApi(demoMpgfMatchPool.id);
  const unknown = getMpgfPublicGoodsSponsorPoolFlywheelApi("unknown-pool");
  const serialized = JSON.stringify(flywheel);
  const route = readFileSync("src/app/api/mpgf/sponsor-pools/[poolId]/route.ts", "utf8");
  const governance = getMpgfPublicGoodsGovernanceApi();
  const governancePage = readFileSync("src/app/mpgf/governance/page.tsx", "utf8");
  const migration = readFileSync("supabase/migrations/20260531_mpgf_sponsor_pool_flywheel.sql", "utf8");

  assert.ok(api);
  assert.equal(unknown, null);
  assert.equal(flywheel.privacyPolicy, MPGF_PUBLIC_GOODS_SPONSOR_FLYWHEEL_PRIVACY_POLICY);
  assert.equal(flywheel.flywheelPolicy, "trade_surplus_funded_verified_plural_assurance");
  assert.equal(flywheel.custodyMode, "partner_or_provider_held_not_platform_custody");
  assert.equal(flywheel.availableForRoundCents, demoMpgfMatchPool.budgetCents);
  assert.equal(flywheel.unfundedSponsorPoolCents, 0);
  assert.equal(flywheel.sourceBreakdown.find((source) => source.sourceType === "direct_sponsor_deposit")?.availableCents, 100_000);
  assert.equal(flywheel.sourceBreakdown.find((source) => source.sourceType === "recurring_member_tithe")?.availableCents, 2_500);
  assert.equal(flywheel.sourceBreakdown.find((source) => source.sourceType === "donation_offset_surplus")?.availableCents, 25_000);
  assert.equal(flywheel.sourceBreakdown.find((source) => source.sourceType === "trade_surplus_tithe")?.availableCents, 22_500);
  assert.match(flywheel.calcHash, /^sha256:/);
  assert.ok(flywheel.entries.every((entry) => entry.sourceRefHash.startsWith("sha256:")));
  assert.ok(flywheel.entries.every((entry) => entry.custodyMode === "partner_or_provider_held_not_platform_custody"));
  assert.equal(governance.sponsorPoolFlywheel.apiPath, `/api/mpgf/sponsor-pools/${demoMpgfMatchPool.id}`);
  assert.equal(governance.sponsorPoolFlywheel.availableForRoundCents, demoMpgfMatchPool.budgetCents);
  assert.match(route, /MPGF_PUBLIC_GOODS_API_HEADERS/);
  assert.match(route, /getMpgfPublicGoodsSponsorPoolFlywheelApi/);
  assert.match(governancePage, /Sponsor-pool flywheel/);
  assert.match(governancePage, /Trade surplus refills matching capital/);
  assert.match(governancePage, /Open sponsor-pool flywheel JSON/);
  assert.match(migration, /mpgf_public_goods_sponsor_pool_deposits/);
  assert.match(migration, /donation_offset_surplus/);
  assert.match(migration, /trade_surplus_tithe/);
  assert.match(migration, /partner_or_provider_held_not_platform_custody/);
  assert.match(migration, /raw donor, trade, payment, and offset identifiers are not public/);

  for (const forbidden of [
    "anchor-sponsor-private",
    "donation-offset-surplus-private",
    "successful-moral-trade-tithe-private",
    "demo-sponsor-circle-member",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("MPGF sponsor deposits and trade surplus settle through the shared flywheel", () => {
  const deposit = recordMpgfPublicGoodsSponsorPoolDeposit({
    privateSourceRef: "private-direct-sponsor-deposit-001",
    amountCents: 40_000,
    publicMemo: "Direct sponsor deposit pending review.",
  });
  const commitment = commitMpgfPublicGoodsTradeSurplus({
    privateTradeOrOffsetRef: "private-successful-trade-surplus-001",
    amountCents: 15_000,
    sourceType: "trade_surplus_tithe",
  });
  const settlement = settleMpgfPublicGoodsTradeSurplus({
    commitment,
    providerEventVerified: true,
  });
  const serialized = JSON.stringify({ deposit, commitment, settlement });
  const depositRoute = readFileSync("src/app/api/mpgf/sponsor-pools/[poolId]/deposits/route.ts", "utf8");
  const commitRoute = readFileSync("src/app/api/mpgf/trade-surplus/commit/route.ts", "utf8");
  const settleRoute = readFileSync("src/app/api/mpgf/trade-surplus/settle/route.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260531_mpgf_trade_surplus_commitments.sql", "utf8");

  assert.equal(deposit.reviewRequiredBeforeMatching, true);
  assert.equal(deposit.finalPayoutAuthorized, false);
  assert.equal(deposit.deposit.sourceType, "direct_sponsor_deposit");
  assert.equal(deposit.deposit.status, "pending_review");
  assert.equal(deposit.deposit.countsTowardMatching, false);
  assert.match(deposit.deposit.sourceRefHash, /^sha256:/);
  assert.equal(commitment.status, "committed_pending_settlement");
  assert.equal(commitment.settlementPath, "/api/mpgf/trade-surplus/settle");
  assert.equal(commitment.custodyMode, "partner_or_provider_held_not_platform_custody");
  assert.match(commitment.tradeOrOffsetRefHash, /^sha256:/);
  assert.match(commitment.calcHash, /^sha256:/);
  assert.equal(settlement.commitment.status, "settled_to_sponsor_pool");
  assert.equal(settlement.sponsorPoolDeposit.sourceType, "trade_surplus_tithe");
  assert.equal(settlement.sponsorPoolDeposit.status, "available");
  assert.equal(settlement.sponsorPoolDeposit.countsTowardMatching, true);
  assert.equal(settlement.finalPayoutAuthorized, false);
  assert.match(depositRoute, /Sign in to record an MPGF sponsor-pool deposit/);
  assert.match(depositRoute, /recordMpgfPublicGoodsSponsorPoolDeposit/);
  assert.match(commitRoute, /commitMpgfPublicGoodsTradeSurplus/);
  assert.match(settleRoute, /settleMpgfPublicGoodsTradeSurplus/);
  assert.match(migration, /mpgf_public_goods_trade_surplus_commitments/);
  assert.match(migration, /donation_offset_surplus/);
  assert.match(migration, /trade_surplus_tithe/);
  assert.match(migration, /partner_or_provider_held_not_platform_custody/);
  assert.match(migration, /raw counterparty, payment, and offset records are private by default/);

  for (const forbidden of [
    "private-direct-sponsor-deposit-001",
    "private-successful-trade-surplus-001",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("MPGF governance ballots and challenges are procedural and privacy-safe", () => {
  const ballot = createMpgfPublicGoodsGovernanceBallot({
    voterId: "private-governance-voter-001",
    idempotencyKey: "private-governance-idempotency-001",
    weightsByCategory: {
      global_health: 4_000,
      existential_risk: 2_000,
      animal_welfare: 2_000,
      public_interest_knowledge: 1_000,
      sponsor_reserve: 1_000,
    },
  });
  const results = getMpgfPublicGoodsGovernanceResultsApi(demoMpgfAssuranceRound.id);
  const unknownResults = getMpgfPublicGoodsGovernanceResultsApi("unknown-round");
  const challenge = createMpgfPublicGoodsChallenge({
    campaignId: "campaign-animal-welfare-transition",
    challengerId: "private-challenger-001",
    reason: "coordination_cluster_review",
    publicSummary: "Challenge asks reviewers to inspect a possible coordination cluster.",
  });
  const serialized = JSON.stringify({ ballot, results, challenge });
  const ballotRoute = readFileSync("src/app/api/mpgf/governance/ballots/route.ts", "utf8");
  const resultsRoute = readFileSync("src/app/api/mpgf/governance/results/route.ts", "utf8");
  const challengeRoute = readFileSync("src/app/api/mpgf/challenges/route.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260531_mpgf_governance_challenges.sql", "utf8");

  assert.equal(ballot.policy, MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_POLICY);
  assert.equal(ballot.noMoralRanking, true);
  assert.equal(ballot.noTransferableGovernanceWeight, true);
  assert.ok(ballot.totalWeightBps <= 10_000);
  assert.match(ballot.voterRefHash, /^sha256:/);
  assert.match(ballot.idempotencyKeyHash, /^sha256:/);
  assert.match(ballot.calcHash, /^sha256:/);
  assert.ok(results);
  assert.equal(unknownResults, null);
  assert.equal(results.privacyPolicy, MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_PRIVACY_POLICY);
  assert.equal(results.policy, MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_POLICY);
  assert.equal(results.noMoralRanking, true);
  assert.equal(results.noTransferableGovernanceWeight, true);
  assert.equal(results.suppressedSmallSample, false);
  assert.equal(results.categories.length, 5);
  assert.match(results.calcHash, /^sha256:/);
  assert.equal(challenge.ok, true);
  assert.equal(challenge.reasonCode, "coordination_cluster_review");
  assert.equal(challenge.pausesUnreleasedMilestones, true);
  assert.equal(challenge.finalPayoutAuthorized, false);
  assert.match(challenge.challengerRefHash, /^sha256:/);
  assert.match(challenge.calcHash, /^sha256:/);
  assert.equal(MPGF_PUBLIC_GOODS_CHALLENGE_POLICY, "challenge_windows_pause_unreleased_milestones_without_authorizing_payouts");
  assert.match(ballotRoute, /Sign in to submit an MPGF governance ballot/);
  assert.match(resultsRoute, /MPGF_PUBLIC_GOODS_API_HEADERS/);
  assert.match(challengeRoute, /Sign in to open an MPGF challenge/);
  assert.match(migration, /mpgf_public_goods_governance_ballots/);
  assert.match(migration, /mpgf_public_goods_challenges/);
  assert.match(migration, /no_moral_ranking boolean not null default true/);
  assert.match(migration, /no_transferable_governance_weight boolean not null default true/);
  assert.match(migration, /pauses_unreleased_milestones boolean not null default true/);
  assert.match(migration, /final_payout_authorized boolean not null default false/);

  for (const forbidden of [
    "private-governance-voter-001",
    "private-governance-idempotency-001",
    "private-challenger-001",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("MPGF public-goods governance publication covers roles, rules, disputes, and no-ranking boundaries", () => {
  const governance = getMpgfPublicGoodsGovernanceApi();
  const governanceJson = JSON.stringify(governance);
  const governancePage = readFileSync("src/app/mpgf/governance/page.tsx", "utf8");
  const governanceRoute = readFileSync("src/app/api/mpgf/governance/route.ts", "utf8");
  const mpgfHubPage = readFileSync("src/app/mpgf/page.tsx", "utf8");
  const roundPage = readFileSync("src/app/mpgf/rounds/[roundId]/page.tsx", "utf8");

  assert.equal(governance.privacyPolicy, MPGF_PUBLIC_GOODS_GOVERNANCE_PRIVACY_POLICY);
  assert.equal(governance.operatorRoster.length >= 3, true);
  assert.ok(governance.operatorRoster.every((operator) => operator.publicName.includes("Moral Trade MPGF")));
  assert.equal(governance.reviewerPanel.structurePublished, true);
  assert.ok(governance.reviewerPanel.roles.some((role) => role.role === "payout_release_reviewer" && role.minimumCount >= 2));
  assert.equal(governance.roundRules.parametersLockedBeforeDonationsOpen, true);
  assert.equal(governance.roundRules.perDonorQfCapCents, demoMpgfMatchPool.restrictionsJson.perDonorQfCapCents);
  assert.equal(governance.roundRules.campaignThresholds.length, demoMpgfPublicGoodsCampaigns.length);
  assert.match(governance.roundRules.parameterChangePolicy, /never mid-round/);
  assert.match(governance.conflictAndRecusalRules.recusalEnforcement, /reviewer_recusals/);
  assert.equal(governance.fundsFlowSeparation.phaseOneCustodyPolicy, "fiscal_sponsor_or_partner_held_sponsor_pool_not_platform_custody");
  assert.match(governance.fundsFlowSeparation.legalRecipientPolicy, /does not become the legal donation recipient/i);
  assert.ok(governance.fundsFlowSeparation.roles.some((role) => role.key === "donation_receipt_issuer"));
  assert.ok(governance.fundsFlowSeparation.roles.some((role) => role.key === "sponsor_pool_custodian"));
  assert.ok(governance.fundsFlowSeparation.roles.some((role) => role.key === "payout_executor"));
  assert.ok(governance.fundsFlowSeparation.invariants.some((invariant) => /verified webhook events/i.test(invariant)));
  assert.equal(governance.incidentAndDisputeLane.pausesUnreleasedMilestones, true);
  assert.ok(governance.whatRoundDoesNotDecide.some((note) => /No global moral ranking/i.test(note)));
  assert.ok(governance.prohibitedGovernanceMechanisms.includes("token_voting"));
  assert.ok(governance.prohibitedGovernanceMechanisms.includes("public_reputation_weighted_donor_power"));
  assert.ok(
    governance.deploymentChecklist.beforeProd.some(
      (item) => item.key === "legal_review" && item.status === "pending_external_review",
    ),
  );

  for (const forbidden of ["private@example", "charityReceiptRef", "externalReceiptRef", "supporterReason"]) {
    assert.equal(governanceJson.includes(forbidden), false);
  }

  for (const expected of [
    /Named operator roster/,
    /Reviewer panel structure/,
    /Locked round parameters/,
    /Campaign thresholds/,
    /Funds-flow separation/,
    /Partner-held roles/,
    /Public incident and dispute lane/,
    /What this round does not decide/,
    /No global moral ranking/,
    /Prohibited governance mechanisms/,
    /Deployment checklist/,
  ]) {
    assert.match(governancePage, expected);
  }

  assert.match(governanceRoute, /getMpgfPublicGoodsGovernanceApi/);
  assert.match(mpgfHubPage, /\/mpgf\/governance/);
  assert.match(roundPage, /\/mpgf\/governance/);
});

test("MPGF manual evidence security signs receipt access and stores scan metadata", () => {
  const secured = normalizeMpgfManualEvidenceSecurity({
    evidenceDescription: "Open Collective receipt PDF for reviewer inspection.",
    evidenceUrl: "https://receipts.example.org/path/receipt-123.pdf?download=1",
    externalPaymentReference: "open-collective:receipt-123",
    now: new Date("2026-05-31T12:00:00.000Z"),
    siteUrl: "https://moraltrade.example",
  });
  const signedUrl = new URL(secured.signedEvidenceUrl ?? "");
  const verification = verifyMpgfEvidenceAccessSignature({
    evidenceRef: signedUrl.pathname.split("/").at(-1) ?? "",
    evidenceHash: signedUrl.searchParams.get("evidenceHash"),
    expiresAt: signedUrl.searchParams.get("expires"),
    scope: signedUrl.searchParams.get("scope"),
    signature: signedUrl.searchParams.get("sig"),
    now: new Date("2026-05-31T12:05:00.000Z"),
  });
  const expired = verifyMpgfEvidenceAccessSignature({
    evidenceRef: signedUrl.pathname.split("/").at(-1) ?? "",
    evidenceHash: signedUrl.searchParams.get("evidenceHash"),
    expiresAt: signedUrl.searchParams.get("expires"),
    scope: signedUrl.searchParams.get("scope"),
    signature: signedUrl.searchParams.get("sig"),
    now: new Date("2026-05-31T12:16:00.000Z"),
  });
  const descriptionOnly = normalizeMpgfManualEvidenceSecurity({
    evidenceDescription: "Bank transfer screenshot is available to reviewers on request.",
    externalPaymentReference: "bank-transfer:reference-123",
    now: new Date("2026-05-31T12:00:00.000Z"),
    siteUrl: "https://moraltrade.example",
  });
  const route = readFileSync("src/app/api/mpgf/evidence/[evidenceRef]/route.ts", "utf8");
  const realMoney = readFileSync("src/lib/mpgf/real-money.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260531_mpgf_manual_evidence_security.sql", "utf8");
  const accountControls = readFileSync("src/components/mpgf/mpgf-contribution-controls.tsx", "utf8");
  const securedJson = JSON.stringify(secured);

  assert.equal(secured.accessScope, MPGF_EVIDENCE_ACCESS_SCOPE);
  assert.equal(secured.malwareScanStatus, "metadata_scan_passed");
  assert.equal(secured.signedUrlExpiresAt, "2026-05-31T12:15:00.000Z");
  assert.equal(secured.normalizedEvidenceJson.signedUrlTtlSeconds, MPGF_EVIDENCE_SIGNED_URL_TTL_SECONDS);
  assert.equal(secured.normalizedEvidenceJson.storesRawReceiptUrl, false);
  assert.equal(signedUrl.pathname.startsWith("/api/mpgf/evidence/manual-"), true);
  assert.equal(signedUrl.searchParams.get("scope"), MPGF_EVIDENCE_ACCESS_SCOPE);
  assert.equal(verification.status, "verified");
  assert.equal(expired.status, "expired");
  assert.equal(descriptionOnly.signedEvidenceUrl, null);
  assert.equal(descriptionOnly.malwareScanStatus, "manual_review_required");
  assert.equal(securedJson.includes("receipts.example.org"), false);
  assert.throws(
    () =>
      normalizeMpgfManualEvidenceSecurity({
        evidenceDescription: "Suspicious executable evidence.",
        evidenceUrl: "https://receipts.example.org/download.exe",
        externalPaymentReference: "bad-file",
        siteUrl: "https://moraltrade.example",
      }),
    /malware-scan policy/,
  );
  assert.throws(
    () =>
      normalizeMpgfManualEvidenceSecurity({
        evidenceDescription: "Plain HTTP receipt.",
        evidenceUrl: "http://receipts.example.org/receipt.pdf",
        externalPaymentReference: "plain-http",
        siteUrl: "https://moraltrade.example",
      }),
    /HTTPS/,
  );
  assert.match(route, /verifyMpgfEvidenceAccessSignature/);
  assert.match(route, /privateEvidenceNotReturned/);
  assert.match(realMoney, /normalizeMpgfManualEvidenceSecurity/);
  assert.match(realMoney, /evidence_access_scope/);
  assert.match(realMoney, /evidence_malware_scan_status/);
  assert.match(migration, /evidence_signed_url_expires_at/);
  assert.match(migration, /evidence_normalized_json/);
  assert.match(migration, /raw receipt URLs are hashed/);
  assert.match(accountControls, /href=\{evidence\.evidenceUrl\}/);
});

test("MPGF public-goods campaign service validates schema, deadlines, and prohibited claims", () => {
  const campaign = demoMpgfPublicGoodsCampaigns[0];

  assert.ok(campaign);
  assert.equal(validateMpgfPublicGoodsCampaign(campaign).passed, true);
  assert.equal(
    validateMpgfPublicGoodsCampaign({
      ...campaign,
      thresholdAmountCents: 0,
      publicSummary: "Tradeable token escrow guaranteed.",
    }).passed,
    false,
  );
  assert.equal(
    validateMpgfPublicGoodsCampaign(campaign, {
      requireFutureDeadline: true,
      now: new Date("2026-06-01T00:00:00.000Z"),
    }).errors.some((error) => error.id === "campaign-deadline-not-future"),
    true,
  );
});

test("MPGF public-goods pledge service supports capture modes and identity gating", () => {
  const campaign = demoMpgfPublicGoodsCampaigns[0];

  assert.ok(campaign);

  const identity = createMpgfPublicGoodsIdentityAttestation({
    userId: "test-public-goods-user",
    provider: "demo_self_attestation",
    humanScoreBps: 8_400,
    expiresAt: "2026-12-31T23:59:59.000Z",
    redactedReference: "demo-attestation:test-public-goods-user",
  });
  const pledge = createMpgfPublicGoodsPledge({
    campaign,
    userId: identity.userId,
    amountCents: 2_500,
    identityAttestation: identity,
    captureMode: "external_handoff",
  });
  const duplicate = createMpgfPublicGoodsPledge({
    campaign,
    userId: identity.userId,
    amountCents: 2_500,
    identityAttestation: identity,
    duplicateUserRefs: [identity.userId],
  });

  assert.equal(pledge.eligibilityState, "eligible");
  assert.equal(pledge.visibilityMode, "private_amount");
  assert.equal(pledge.isRecurring, false);
  assert.equal(pledge.captureMode, "external_handoff");
  assert.equal(duplicate.eligibilityState, "duplicate_identity");
  assert.throws(
    () =>
      createMpgfPublicGoodsPledge({
        campaign,
        userId: identity.userId,
        amountCents: 2_500,
        captureMode: "stored_payment_method",
        identityAttestation: identity,
      }),
    /payment intent reference/,
  );
});

test("MPGF public-goods identity adapter supports external proof scores without raw provider data", () => {
  const external = evaluateMpgfPublicGoodsIdentityAdapter({
    userId: "external-proof-user",
    provider: "external_proof_of_personhood",
    externalHumanScore: 0.84,
    externalHumanScoreScale: "unit_interval",
    providerPayload: {
      providerRef: "human-passport:redacted-score-0-84",
      scoreBand: "high",
    },
  });
  const duplicate = evaluateMpgfPublicGoodsIdentityAdapter({
    userId: "duplicate-user",
    provider: "repository_profile",
    humanScoreBps: 8_000,
    duplicateUserRefs: ["duplicate-user"],
  });
  const persistence = readFileSync("src/lib/mpgf/persistence.ts", "utf8");

  assert.equal(external.attestation.provider, "external_proof_of_personhood");
  assert.equal(external.attestation.humanScoreBps, 8_400);
  assert.equal(external.eligibilityHint, "eligible");
  assert.match(external.attestation.redactedReference, /external_proof_of_personhood:redacted:/);
  assert.equal(duplicate.eligibilityHint, "duplicate_identity");
  assert.equal(duplicate.attestation.status, "revoked");
  assert.throws(
    () =>
      evaluateMpgfPublicGoodsIdentityAdapter({
        userId: "raw-provider-user",
        provider: "external_proof_of_personhood",
        providerPayload: { email: "private@example.com" },
      }),
    /cannot store raw provider field/,
  );
  assert.throws(
    () =>
      evaluateMpgfPublicGoodsIdentityAdapter({
        userId: "raw-reference-user",
        provider: "repository_profile",
        redactedReference: "repository-profile:private@example.com",
      }),
    /must be redacted/,
  );
  assert.match(persistence, /evaluateMpgfPublicGoodsIdentityAdapter/);
  assert.match(persistence, /identityAdapter\.duplicateUserRefs/);
});

test("MPGF public-goods payment adapter keeps handoff, fiscal-host, and signed-intent paths no-custody", () => {
  const charityCampaign = demoMpgfPublicGoodsCampaigns[0];
  const fiscalCampaign = demoMpgfPublicGoodsCampaigns[1];
  const persistence = readFileSync("src/lib/mpgf/persistence.ts", "utf8");
  const mechanism = readFileSync("src/lib/mpgf/mechanism.ts", "utf8");

  assert.ok(charityCampaign);
  assert.ok(fiscalCampaign);

  const charityHandoff = resolveMpgfPublicGoodsPaymentAdapter({
    campaign: charityCampaign,
    captureMode: "external_handoff",
    externalDestinationUrl: "https://donate.example.org/funds/global-health",
  });
  const fiscalHandoff = resolveMpgfPublicGoodsPaymentAdapter({
    campaign: fiscalCampaign,
    captureMode: "external_handoff",
    fiscalHostUrl: "https://fiscalhost.example.org/funds/resilience",
  });
  const signedIntent = resolveMpgfPublicGoodsPaymentAdapter({
    campaign: charityCampaign,
    captureMode: "signed_intent",
  });
  const storedWithoutIntent = resolveMpgfPublicGoodsPaymentAdapter({
    campaign: charityCampaign,
    captureMode: "stored_payment_method",
  });
  const unsafeDestination = resolveMpgfPublicGoodsPaymentAdapter({
    campaign: charityCampaign,
    captureMode: "external_handoff",
    externalDestinationUrl: "javascript:alert(1)",
  });
  const storedWithIntent = resolveMpgfPublicGoodsPaymentAdapter({
    campaign: fiscalCampaign,
    captureMode: "stored_payment_method",
    paymentIntentRef: "provider-intent:redacted-test",
  });

  assert.equal(charityHandoff.mode, "external_destination_redirect");
  assert.equal(charityHandoff.opensExternalDestination, true);
  assert.equal(charityHandoff.proofRequired, "external_destination_receipt");
  assert.equal(charityHandoff.reconciliationSource, "external_receipt");
  assert.equal(charityHandoff.createsCustody, false);
  assert.equal(fiscalHandoff.reconciliationSource, "fiscal_host_webhook");
  assert.equal(fiscalHandoff.requiresProviderWebhook, true);
  assert.equal(signedIntent.mode, "signed_intent_review_required");
  assert.equal(signedIntent.requiresSignedIntentReview, true);
  assert.equal(signedIntent.reconciliationSource, "sponsor_signed_intent");
  assert.equal(storedWithIntent.mode, "provider_webhook_required");
  assert.equal(storedWithIntent.proofRequired, "provider_webhook_and_review");
  assert.equal(storedWithIntent.createsCustody, false);
  assert.equal(storedWithoutIntent.mode, "blocked");
  assert.match(storedWithoutIntent.blockers.join("\n"), /payment intent reference/);
  assert.equal(unsafeDestination.mode, "blocked");
  assert.match(unsafeDestination.blockers.join("\n"), /HTTPS/);
  assert.match(persistence, /resolveMpgfPublicGoodsPaymentAdapter/);
  assert.match(mechanism, /payment adapter rejected pledge/);
});

test("MPGF real-money subscription cancellation stops future sponsor-pool increments", () => {
  const cancellation = buildMpgfSubscriptionCancellationUpdate({
    id: "sub_mpgf_cancelled",
    status: "canceled",
    canceled_at: Date.parse("2026-06-10T12:00:00.000Z") / 1000,
  });
  const activeCommitment = { status: "active" };
  const cancelledCommitment = { status: "cancelled" };
  const pendingProviderCommitment = { status: "provider_action_required" };
  const realMoney = readFileSync("src/lib/mpgf/real-money.ts", "utf8");
  const sharedStripeWebhookRoute = readFileSync("src/app/api/stripe/webhook/route.ts", "utf8");
  const dedicatedStripeWebhookRoute = readFileSync("src/app/api/mpgf/providers/stripe/webhook/route.ts", "utf8");

  assert.deepEqual(cancellation, {
    providerSubscriptionId: "sub_mpgf_cancelled",
    update: {
      status: "cancelled",
      cancelled_at: "2026-06-10T12:00:00.000Z",
      next_scheduled_at: null,
    },
  });
  assert.equal(canRecordMpgfSponsorPoolInvoice(activeCommitment), true);
  assert.equal(canRecordMpgfSponsorPoolInvoice(cancelledCommitment), false);
  assert.equal(canRecordMpgfSponsorPoolInvoice(pendingProviderCommitment), false);
  assert.equal(buildMpgfSubscriptionCancellationUpdate({ id: "sub_active", status: "active" }), null);
  assert.match(realMoney, /checkout\.session\.expired/);
  assert.match(realMoney, /status === "cancelled" \? "cancelled" : "failed"/);
  assert.match(realMoney, /onConflict: "provider,provider_event_id"/);
  assert.match(realMoney, /already_processed/);
  assert.match(realMoney, /onConflict: "payment_intent_id"/);
  assert.match(realMoney, /customer\.subscription\.deleted/);
  assert.match(realMoney, /customer\.subscription\.updated/);
  assert.match(realMoney, /recordMpgfSubscriptionCancellation/);
  assert.match(realMoney, /canRecordMpgfSponsorPoolInvoice\(commitment\)/);
  assert.match(realMoney, /\.select\("id, user_id, amount_cents, mode, status, provider_customer_id"\)/);
  assert.match(sharedStripeWebhookRoute, /customer\.subscription\.deleted/);
  assert.match(sharedStripeWebhookRoute, /customer\.subscription\.updated/);
  assert.match(dedicatedStripeWebhookRoute, /handleMpgfStripeWebhookEvent/);
});

test("MPGF public-goods refunds back out pre-close pledges and task post-close reconciliation", () => {
  const metadata = {
    mpgf_public_goods_round_id: "round-public-goods-demo-2026-06",
    mpgf_public_goods_campaign_id: "campaign-global-health-basic-needs",
  };
  const preClosePlan = buildMpgfPublicGoodsRefundReconciliationPlan({
    paymentIntentId: "payment-intent-public-goods",
    metadata,
    roundStatus: "open",
    fullyRefunded: true,
    amountRefundedCents: 2_500,
    providerRefundId: "refund-pre-close",
    providerChargeId: "charge-pre-close",
    refundedAt: "2026-06-10T12:00:00.000Z",
  });
  const postClosePlan = buildMpgfPublicGoodsRefundReconciliationPlan({
    paymentIntentId: "payment-intent-public-goods",
    metadata,
    roundStatus: "published",
    fullyRefunded: false,
    amountRefundedCents: 1_000,
    providerRefundId: "refund-post-close",
    providerChargeId: "charge-post-close",
    refundedAt: "2026-07-10T12:00:00.000Z",
  });
  const noPublicGoodsPlan = buildMpgfPublicGoodsRefundReconciliationPlan({
    paymentIntentId: "payment-intent-ordinary",
    metadata: {},
    roundStatus: "open",
    fullyRefunded: true,
    amountRefundedCents: 2_500,
    providerRefundId: "refund-ordinary",
    refundedAt: "2026-06-10T12:00:00.000Z",
  });
  const realMoney = readFileSync("src/lib/mpgf/real-money.ts", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260531_mpgf_public_goods_refund_reconciliation.sql",
    "utf8",
  );

  assert.equal(preClosePlan?.action, "back_out_counted_contribution_before_round_close");
  assert.deepEqual(preClosePlan?.pledgeUpdate, {
    status: "voided",
    eligibilityState: "blocked",
  });
  assert.equal(preClosePlan?.paymentProofRow.status, "superseded");
  assert.equal(preClosePlan?.paymentProofRow.reason_code, "external_handoff_failed");
  assert.equal(preClosePlan?.sourceEventRef, "stripe_refund:refund-pre-close");
  assert.equal(postClosePlan?.action, "create_post_close_reconciliation_task");
  assert.equal(postClosePlan?.reviewCaseRow.state, "needs_evidence");
  assert.match(String(postClosePlan?.reviewCaseRow.public_notes), /after round close requires MPGF reconciliation/);
  assert.equal(noPublicGoodsPlan, null);
  assert.match(realMoney, /back_out_counted_contribution_before_round_close/);
  assert.match(realMoney, /create_post_close_reconciliation_task/);
  assert.match(realMoney, /mpgf_public_goods_pledges/);
  assert.match(realMoney, /mpgf_public_goods_review_cases/);
  assert.match(realMoney, /metadata_json/);
  assert.match(migration, /mpgf_public_goods_pledges_payment_intent_ref_idx/);
  assert.match(migration, /mpgf_public_goods_payment_proofs_source_event_ref_idx/);
});

test("MPGF public-goods review console uses bounded reason codes and appeal states", () => {
  const campaign = demoMpgfPublicGoodsCampaigns[0];

  assert.ok(campaign);

  const reviewed = reviewMpgfPublicGoodsCampaign({
    campaign,
    action: "challenge",
    reasonCode: "challenge_opened",
    reviewerId: "reviewer-test",
    publicNotes: "Open challenge window for destination proof review.",
  });
  const appealRequested = reviewMpgfPublicGoodsCampaign({
    campaign,
    action: "challenge",
    reasonCode: "appeal_requested",
    reviewerId: "reviewer-test",
    publicNotes: "Participant requested appeal of public-goods destination review.",
  });
  const appealUpheld = reviewMpgfPublicGoodsCampaign({
    campaign: appealRequested.campaign,
    action: "approve",
    reasonCode: "appeal_upheld",
    reviewerId: "reviewer-test",
    publicNotes: "Appeal was upheld after public-goods review.",
  });
  const appealDenied = reviewMpgfPublicGoodsCampaign({
    campaign: appealRequested.campaign,
    action: "block",
    reasonCode: "appeal_denied",
    reviewerId: "reviewer-test",
    publicNotes: "Appeal was denied after public-goods review.",
  });
  const consoleSummary = summarizeMpgfPublicGoodsReviewConsole();
  const adminPage = readFileSync("src/app/mpgf/admin/[section]/page.tsx", "utf8");

  assert.equal(reviewed.campaign.reviewStatus, "challenge_window");
  assert.equal(reviewed.reviewCase.allowedNextActions.includes("finalize"), true);
  assert.equal(reviewed.createsPayoutAuthorization, false);
  assert.equal(appealRequested.reviewCase.appealStatus, "appeal_requested");
  assert.equal(appealRequested.campaign.reviewStatus, "challenge_window");
  assert.equal(appealUpheld.reviewCase.appealStatus, "appeal_upheld");
  assert.equal(appealUpheld.campaign.reviewStatus, "approved");
  assert.equal(appealDenied.reviewCase.appealStatus, "appeal_denied");
  assert.equal(appealDenied.campaign.reviewStatus, "blocked");
  assert.ok(consoleSummary.reasonCodes.includes("blocked_threat_baseline"));
  assert.equal(consoleSummary.privacySafeAnalyticsOnly, true);
  assert.equal(consoleSummary.rawPrivateTextStoredInAnalytics, false);
  assert.equal(consoleSummary.conflictCheckBanner.status, "clear");
  assert.ok(consoleSummary.rubric.some((item) => item.key === "milestone_release"));
  assert.ok(consoleSummary.queue.every((item) => item.conflictCheckStatus === "clear"));
  assert.ok(consoleSummary.milestoneReleaseQueue.some((item) => item.webhookCanAuthorizeFinalPayout === false));
  assert.ok(consoleSummary.milestoneReleaseQueue.every((item) => item.dualControlApproverRequired === true));
  assert.ok(consoleSummary.milestoneReleaseQueue.some((item) => item.status === "paused_by_dispute"));
  assert.ok(consoleSummary.disputeQueue.some((item) => item.state === "challenge_window"));
  assert.ok(consoleSummary.auditTrail.every((item) => !item.publicSummary.includes("http")));
  assert.equal(demoMpgfPublicGoodsReviewCases.some((reviewCase) => reviewCase.reasonCode === "needs_destination_evidence"), true);
  assert.match(adminPage, /appeal_upheld/);
  assert.match(adminPage, /appeal_denied/);
  assert.match(adminPage, /Conflict check banner/);
  assert.match(adminPage, /Milestone release queue/);
  assert.match(adminPage, /Dual-control confirmation/);
  assert.match(adminPage, /Dispute queue/);
  assert.match(adminPage, /Audit trail viewer/);
  assert.throws(
    () =>
      reviewMpgfPublicGoodsCampaign({
        campaign,
        action: "approve",
        reasonCode: "blocked_destination_risk",
        reviewerId: "reviewer-test",
        publicNotes: "Mismatched reason code.",
      }),
    /not allowed/,
  );
});

test("MPGF public-goods reconciliation writes payment proof records and failed-handoff recovery cases", () => {
  const campaign = demoMpgfPublicGoodsCampaigns[0];
  const pledge = demoMpgfAssurancePledges.find((candidate) => candidate.campaignId === campaign?.id);

  assert.ok(campaign);
  assert.ok(pledge);

  const verified = reconcileMpgfPublicGoodsExternalHandoff({
    campaign,
    pledge,
    amountVerifiedCents: pledge.amountCents,
    externalReceiptRef: "receipt:test",
    charityReceiptRef: "charity:test",
    verified: true,
  });
  const failed = reconcileMpgfPublicGoodsExternalHandoff({
    campaign,
    pledge,
    amountVerifiedCents: 0,
    verified: false,
  });

  assert.equal(verified.paymentProof.status, "verified");
  assert.equal(verified.paymentProof.reasonCode, "external_handoff_verified");
  assert.equal(verified.writesPaymentProofRecord, true);
  assert.equal(verified.createsCustody, false);
  const rows = buildMpgfPublicGoodsReconciliationRows({
    paymentProof: verified.paymentProof,
    reviewCase: verified.reviewCase,
    sourceEventRef: "open-collective:event:test",
  });

  assert.equal(rows.paymentProofRow.reason_code, "external_handoff_verified");
  assert.equal(rows.paymentProofRow.reconciliation_source, "external_receipt");
  assert.equal(rows.paymentProofRow.source_event_ref, "open-collective:event:test");
  assert.equal(rows.pledgeStatus, "captured");
  assert.equal(failed.paymentProof.status, "rejected");
  assert.equal(failed.reviewCase.reasonCode, "external_handoff_failed");
  assert.equal(demoMpgfPublicGoodsPaymentProofs.some((proof) => proof.status === "verified"), true);
});

test("MPGF public-goods milestone releases require review confirmation and pause on disputes", async () => {
  const campaign = demoMpgfPublicGoodsCampaigns[0];
  const allocation = allocateMpgfAssuranceRound();
  const allocationLine = allocation.lines.find((line) => line.campaignId === campaign?.id);

  assert.ok(campaign);
  assert.ok(allocationLine);

  const schedule = buildMpgfPublicGoodsMilestoneSchedule({ campaignId: campaign.id });
  const authorized = authorizeMpgfPublicGoodsMilestoneRelease({
    campaign,
    allocationLine,
    milestone: schedule[0]!,
    reviewCases: demoMpgfPublicGoodsReviewCases.filter((reviewCase) => reviewCase.campaignId === campaign.id),
    reviewerId: "reviewer-test",
    dualControlApproverId: "approver-test",
    evidenceSummary: "Reviewer confirmed partner release evidence for the first tranche.",
    reviewStateConfirmed: true,
    now: "2026-06-05T12:00:00.000Z",
  });
  const paused = authorizeMpgfPublicGoodsMilestoneRelease({
    campaign,
    allocationLine,
    milestone: schedule[1]!,
    reviewCases: [
      {
        ...demoMpgfPublicGoodsReviewCases[0]!,
        id: "review-case-appeal-open",
        action: "challenge",
        state: "challenge_window",
        appealStatus: "appeal_requested",
        closedAt: undefined,
      },
    ],
    reviewerId: "reviewer-test",
    dualControlApproverId: "approver-test",
    evidenceSummary: "Reviewer cannot release while appeal is open.",
    reviewStateConfirmed: true,
    now: "2026-06-05T12:00:00.000Z",
  });
  const missingDualControl = authorizeMpgfPublicGoodsMilestoneRelease({
    campaign,
    allocationLine,
    milestone: schedule[2]!,
    reviewCases: demoMpgfPublicGoodsReviewCases.filter((reviewCase) => reviewCase.campaignId === campaign.id),
    reviewerId: "reviewer-test",
    evidenceSummary: "Reviewer confirmed evidence but a distinct release approver has not signed off.",
    reviewStateConfirmed: true,
    now: "2026-06-05T12:00:00.000Z",
  });
  const rows = buildMpgfPublicGoodsMilestoneReleaseRows(authorized);
  const dryRun = await persistMpgfPublicGoodsMilestoneRelease({ decision: authorized, dryRun: true });
  const demoDecision = buildDemoMpgfPublicGoodsMilestoneReleaseDecision();
  const route = readFileSync("src/app/api/mpgf/milestones/[milestoneId]/release/route.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260531_mpgf_public_goods_milestone_release.sql", "utf8");
  const dualControlMigration = readFileSync(
    "supabase/migrations/20260531_mpgf_public_goods_dual_control_release.sql",
    "utf8",
  );

  assert.equal(schedule.map((milestone) => milestone.releasePct).join(","), "40,30,30");
  assert.equal(authorized.status, "authorized_for_partner_release");
  assert.equal(authorized.dualControlConfirmed, true);
  assert.equal(authorized.webhookCanAuthorizeFinalPayout, false);
  assert.equal(authorized.createsCustody, false);
  assert.equal(authorized.requiresPartnerExecution, true);
  assert.equal(authorized.releaseAmountCents, Math.floor((authorized.approvedMatchCents * 40) / 100));
  assert.equal(rows.disbursementReviewRow.status, "partner_release_pending");
  assert.equal(rows.disbursementReviewRow.reviewer_id, null);
  assert.equal(rows.disbursementReviewRow.approver_id, null);
  assert.equal(rows.disbursementReviewRow.dual_control_confirmed, true);
  assert.equal(rows.auditRow.event_json.dualControlConfirmed, true);
  assert.equal(rows.auditRow.event_type, "milestone_release_authorized");
  assert.equal(dryRun.status, "dry_run");
  assert.equal(demoDecision.status, "authorized_for_partner_release");
  assert.equal(demoDecision.dualControlConfirmed, true);
  assert.equal(paused.status, "paused");
  assert.ok(paused.blockerCodes.includes("appeal_requested"));
  assert.ok(paused.blockerCodes.includes("challenge_window_open"));
  assert.equal(missingDualControl.status, "paused");
  assert.ok(missingDualControl.blockerCodes.includes("dual_control_approver_required"));
  assert.match(route, /MPGF_PUBLIC_GOODS_MILESTONE_SECRET/);
  assert.match(route, /dualControlApproverId/);
  assert.match(route, /dualControlConfirmed/);
  assert.match(route, /webhookCanAuthorizeFinalPayout/);
  assert.match(migration, /mpgf_public_goods_milestones/);
  assert.match(migration, /mpgf_public_goods_disbursements/);
  assert.match(migration, /mpgf_public_goods_release_audit_events/);
  assert.match(migration, /append-only/);
  assert.match(dualControlMigration, /dual_control_confirmed/);
  assert.match(dualControlMigration, /distinct_reviewer_approver/);
  assert.match(dualControlMigration, /payout destinations require dual control/);
  assert.throws(
    () =>
      buildMpgfPublicGoodsMilestoneSchedule({
        campaignId: campaign.id,
        releasePercents: [50, 60],
      }),
    /must sum to 100/,
  );
});

test("MPGF public-goods subscriptions, experiments, and feature flag stay optional and privacy-safe", () => {
  const subscription = createMpgfPublicGoodsSponsorSubscription({
    userId: "test-sponsor",
    amountCents: 1_500,
  });
  const assignment = assignMpgfPublicGoodsExperiment({
    userId: "private-user-id",
    experimentKey: "public_goods_visibility_default_v1",
    variants: ["private_default", "public_reason_prompt"],
  });
  const featureFlag = getMpgfPublicGoodsFeatureFlagStatus();

  assert.equal(subscription.mode, "pledge_only");
  assert.equal(subscription.captureMode, "external_handoff");
  assert.equal(subscription.status, "active");
  assert.equal(assignment.analyticsPolicy, "privacy_safe_no_raw_private_text");
  assert.equal(assignment.userRefHash.includes("private-user-id"), false);
  assert.equal(featureFlag.defaultCaptureMode, "external_handoff");
  assert.equal(featureFlag.widensPublicAccessAutomatically, false);
  assert.ok(demoMpgfPublicGoodsSubscriptions.some((row) => row.poolId === demoMpgfMatchPool.id));
});

test("MPGF public-goods experiment assignments persist hashed variants only", async () => {
  const assignmentRows = buildMpgfPublicGoodsExperimentAssignmentRow({
    userId: "private-user@example.org",
    profileId: "not-a-uuid",
    experimentKey: "public_goods_assurance_framing_v1",
    variants: ["pledge_only_if_threshold_met", "donate_now_control"],
    assignedAt: "2026-05-30T12:00:00.000Z",
  });
  const dryRun = await persistMpgfPublicGoodsExperimentAssignment({
    userId: "private-user@example.org",
    profileId: "not-a-uuid",
    experimentKey: "public_goods_assurance_framing_v1",
    variants: ["pledge_only_if_threshold_met", "donate_now_control"],
    assignedAt: "2026-05-30T12:00:00.000Z",
    dryRun: true,
  });
  const route = readFileSync("src/app/api/mpgf/public-goods/experiments/assign/route.ts", "utf8");
  const experiments = readFileSync("src/lib/mpgf/public-goods-experiments.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260529_mpgf_verified_assurance_matching.sql", "utf8");
  const serialized = JSON.stringify(dryRun);

  assert.equal(assignmentRows.row.profile_id, null);
  assert.equal(assignmentRows.row.analytics_policy, "privacy_safe_no_raw_private_text");
  assert.equal(assignmentRows.row.user_ref_hash.includes("private-user"), false);
  assert.equal(dryRun.status, "dry_run");
  assert.equal(dryRun.assignment.analyticsPolicy, "privacy_safe_no_raw_private_text");
  assert.equal(serialized.includes("private-user@example.org"), false);
  assert.match(route, /MPGF_PUBLIC_GOODS_EXPERIMENT_SECRET/);
  assert.match(route, /persistMpgfPublicGoodsExperimentAssignment/);
  assert.match(experiments, /mpgf_public_goods_experiment_assignments/);
  assert.match(experiments, /onConflict: "experiment_key,user_ref_hash"/);
  assert.match(migration, /unique \(experiment_key, user_ref_hash\)/);
  assert.throws(
    () =>
      buildMpgfPublicGoodsExperimentAssignmentRow({
        userId: "test",
        experimentKey: "private@example.org",
        variants: ["safe_a", "safe_b"],
      }),
    /cannot contain raw private text/,
  );
});

test("MPGF public-goods cohort access stays invited before public widening", () => {
  const previousEnabled = process.env.MPGF_PUBLIC_GOODS_ENABLED;
  const previousCohort = process.env.MPGF_PUBLIC_GOODS_COHORT;
  const previousInvitedUsers = process.env.MPGF_PUBLIC_GOODS_INVITED_USER_REFS;
  const previousInvitedEmails = process.env.MPGF_PUBLIC_GOODS_INVITED_EMAILS;

  try {
    process.env.MPGF_PUBLIC_GOODS_ENABLED = "true";
    process.env.MPGF_PUBLIC_GOODS_COHORT = "invited_demo";
    delete process.env.MPGF_PUBLIC_GOODS_INVITED_USER_REFS;
    delete process.env.MPGF_PUBLIC_GOODS_INVITED_EMAILS;

    const defaultFlag = getMpgfPublicGoodsFeatureFlagStatus();
    const nonInvited = evaluateMpgfPublicGoodsCohortAccess({ userId: "real-user" });
    const demoFixture = evaluateMpgfPublicGoodsCohortAccess({ userId: "demo-supporter-alix" });

    process.env.MPGF_PUBLIC_GOODS_INVITED_USER_REFS = "real-user";
    const invitedByUserRef = evaluateMpgfPublicGoodsCohortAccess({ userId: "real-user" });

    process.env.MPGF_PUBLIC_GOODS_INVITED_USER_REFS = "";
    process.env.MPGF_PUBLIC_GOODS_INVITED_EMAILS = "invited@example.org";
    const invitedByEmail = evaluateMpgfPublicGoodsCohortAccess({
      userId: "another-real-user",
      email: "invited@example.org",
    });

    process.env.MPGF_PUBLIC_GOODS_COHORT = "public_beta";
    delete process.env.MPGF_PUBLIC_GOODS_INVITED_EMAILS;
    const publicBeta = evaluateMpgfPublicGoodsCohortAccess({ userId: "any-real-user" });
    const persistence = readFileSync("src/lib/mpgf/persistence.ts", "utf8");
    const actions = readFileSync("src/app/mpgf/actions.ts", "utf8");

    assert.equal(defaultFlag.invitedCohortRequired, true);
    assert.equal(defaultFlag.widensPublicAccessAutomatically, false);
    assert.equal(nonInvited.allowed, false);
    assert.equal(nonInvited.reason, "public_goods_invite_list_missing");
    assert.equal(demoFixture.allowed, true);
    assert.equal(invitedByUserRef.allowed, true);
    assert.equal(invitedByEmail.allowed, true);
    assert.equal(publicBeta.allowed, true);
    assert.equal(publicBeta.accessMode, "public_beta");
    assert.match(persistence, /assertMpgfPublicGoodsCohortAccess/);
    assert.match(actions, /email: viewer\.email/);
  } finally {
    if (previousEnabled === undefined) {
      delete process.env.MPGF_PUBLIC_GOODS_ENABLED;
    } else {
      process.env.MPGF_PUBLIC_GOODS_ENABLED = previousEnabled;
    }

    if (previousCohort === undefined) {
      delete process.env.MPGF_PUBLIC_GOODS_COHORT;
    } else {
      process.env.MPGF_PUBLIC_GOODS_COHORT = previousCohort;
    }

    if (previousInvitedUsers === undefined) {
      delete process.env.MPGF_PUBLIC_GOODS_INVITED_USER_REFS;
    } else {
      process.env.MPGF_PUBLIC_GOODS_INVITED_USER_REFS = previousInvitedUsers;
    }

    if (previousInvitedEmails === undefined) {
      delete process.env.MPGF_PUBLIC_GOODS_INVITED_EMAILS;
    } else {
      process.env.MPGF_PUBLIC_GOODS_INVITED_EMAILS = previousInvitedEmails;
    }
  }
});

test("MPGF public-goods analytics keeps only privacy-safe buckets and factor codes", async () => {
  const event = buildMpgfPublicGoodsAnalyticsEvent({
    eventType: "pledge_intent_recorded",
    userId: "private-user@example.com",
    campaignId: "campaign-global-health-basic-needs",
    createdAt: "2026-05-30T12:00:00.000Z",
    eventJson: {
      amountBucket: bucketMpgfPublicGoodsAmountCents(12_345),
      visibilityMode: "public_reason",
      captureMode: "external_handoff",
      isRecurring: false,
      eligibilityState: "eligible",
      surface: "mpgf_participant_action",
    },
  });
  const dryRun = await recordMpgfPublicGoodsAnalyticsEvent({
    eventType: "threshold_status_evaluated",
    userId: "demo-user",
    campaignId: "campaign-global-health-basic-needs",
    dryRun: true,
    eventJson: {
      campaignStatus: "payable",
      thresholdPassed: true,
      surface: "protected_job",
    },
  });
  const route = readFileSync("src/app/api/mpgf/public-goods/analytics/route.ts", "utf8");
  const persistence = readFileSync("src/lib/mpgf/persistence.ts", "utf8");

  assert.equal(event.event_json.amountBucket, "50_to_249");
  assert.equal(event.user_ref_hash?.includes("private-user"), false);
  assert.equal("amountCents" in event.event_json, false);
  assert.equal(dryRun.status, "dry_run");
  assert.equal(dryRun.row.event_json.thresholdPassed, true);
  assert.throws(
    () =>
      buildMpgfPublicGoodsAnalyticsEvent({
        eventType: "pledge_intent_recorded",
        eventJson: { email: "private@example.com" } as never,
      }),
    /cannot store raw or sensitive field/,
  );
  assert.throws(
    () =>
      buildMpgfPublicGoodsAnalyticsEvent({
        eventType: "pledge_intent_recorded",
        eventJson: { variant: "private@example.com" },
      }),
    /looks like contact data/,
  );
  assert.match(route, /MPGF_ANALYTICS_SECRET/);
  assert.match(route, /bucketMpgfPublicGoodsAmountCents/);
  assert.match(route, /recordMpgfPublicGoodsAnalyticsEvent/);
  assert.doesNotMatch(route, /supporterReason/);
  assert.match(persistence, /pledge_intent_recorded/);
  assert.match(persistence, /amountBucket/);
  assert.match(persistence, /bucketMpgfPublicGoodsAmountCents/);
});

test("MPGF public-goods reminder planner queues aggregate, non-spammy deadline and threshold emails", () => {
  const campaign = {
    ...demoMpgfPublicGoodsCampaigns[0],
    id: "campaign-reminder-threshold-near",
    thresholdAmountCents: 10_000,
    thresholdSupporters: 3,
    deadlineAt: "2026-06-02T12:00:00.000Z",
  };
  const pledges = [
    {
      ...demoMpgfAssurancePledges[0],
      id: "pledge-reminder-1",
      campaignId: campaign.id,
      userId: "reminder-user-1",
      amountCents: 5_000,
      supporterReason: "Private reason should not appear in email.",
    },
    {
      ...demoMpgfAssurancePledges[1],
      id: "pledge-reminder-2",
      campaignId: campaign.id,
      userId: "reminder-user-2",
      amountCents: 3_500,
    },
  ];
  const now = new Date("2026-05-31T13:00:00.000Z");
  const kind = selectMpgfPublicGoodsReminderKind({ campaign, pledges, now });
  const plans = buildMpgfPublicGoodsReminderPlans({
    campaign,
    pledges,
    contacts: [
      { profileId: "profile-reminder-1", userRef: "reminder-user-1", email: "supporter@example.org" },
      { profileId: "profile-reminder-2", userRef: "reminder-user-2", email: null },
    ],
    now,
  });
  const emailRows = buildMpgfPublicGoodsReminderEmailRows(plans);
  const thresholdMetKind = selectMpgfPublicGoodsReminderKind({
    campaign: {
      ...campaign,
      id: "campaign-reminder-threshold-met",
      thresholdAmountCents: 8_000,
      thresholdSupporters: 2,
    },
    pledges: pledges.map((pledge) => ({ ...pledge, campaignId: "campaign-reminder-threshold-met" })),
    now,
  });
  const route = readFileSync("src/app/api/mpgf/public-goods/reminders/route.ts", "utf8");
  const reminders = readFileSync("src/lib/mpgf/public-goods-reminders.ts", "utf8");
  const analytics = readFileSync("src/lib/mpgf/public-goods-analytics.ts", "utf8");

  assert.equal(kind, "threshold_near");
  assert.equal(plans.length, 2);
  assert.equal(plans.every((plan) => plan.privacyPolicy === "aggregate_progress_no_private_amounts_or_reasons"), true);
  assert.equal(emailRows.length, 1);
  assert.equal(emailRows[0]?.provider, "mpgf_public_goods_reminder_worker");
  assert.match(String(emailRows[0]?.body), /85%/);
  assert.match(String(emailRows[0]?.body), /2\/3 verified supporters/);
  assert.doesNotMatch(String(emailRows[0]?.body), /Private reason should not appear/i);
  assert.doesNotMatch(String(emailRows[0]?.body), /\$|5000|3500|8500/);
  assert.equal(thresholdMetKind, "threshold_met_next_step");
  assert.match(route, /MPGF_PUBLIC_GOODS_REMINDER_SECRET/);
  assert.match(route, /queueMpgfPublicGoodsReminderEmails/);
  assert.match(reminders, /email_outbox/);
  assert.match(reminders, /reminder_queued/);
  assert.match(analytics, /reminder_queued/);
});

test("MPGF public-goods KPI snapshot gathers rollout data without private fields", async () => {
  const previousCohort = process.env.MPGF_PUBLIC_GOODS_COHORT;

  try {
    process.env.MPGF_PUBLIC_GOODS_COHORT = "invited_demo";

    const snapshot = buildMpgfPublicGoodsKpiSnapshot({
      generatedAt: "2026-06-15T12:00:00.000Z",
      analyticsEvents: [
        {
          event_type: "campaign_viewed",
          campaign_id: "campaign-global-health-basic-needs",
          event_json: { surface: "public_campaign_page" },
          created_at: "2026-05-03T12:00:00.000Z",
        },
        {
          event_type: "pledge_intent_recorded",
          campaign_id: "campaign-global-health-basic-needs",
          event_json: {
            eligibilityState: "eligible",
            netNewFundingProxy: "likely_net_new",
            preCommitmentStatus: "not_precommitted",
          },
          created_at: "2026-05-03T14:00:00.000Z",
        },
      ],
    });
    const retentionSnapshot = buildMpgfPublicGoodsKpiSnapshot({
      generatedAt: "2026-06-15T12:00:00.000Z",
      subscriptions: [
        {
          ...demoMpgfPublicGoodsSubscriptions[0],
          id: "subscription-old-active",
          userId: "private-old-active",
          status: "active",
          createdAt: "2025-12-01T00:00:00.000Z",
        },
        {
          ...demoMpgfPublicGoodsSubscriptions[0],
          id: "subscription-old-cancelled",
          userId: "private-old-cancelled",
          status: "cancelled",
          createdAt: "2025-12-01T00:00:00.000Z",
        },
      ],
    });
    const dryRun = await loadMpgfPublicGoodsKpiSnapshot({
      dryRun: true,
      generatedAt: "2026-06-15T12:00:00.000Z",
    });
    const route = readFileSync("src/app/api/mpgf/public-goods/kpis/route.ts", "utf8");
    const kpis = readFileSync("src/lib/mpgf/public-goods-kpis.ts", "utf8");
    const serialized = JSON.stringify(snapshot);

    assert.equal(snapshot.privacyPolicy, "aggregate_only_no_user_or_reason_text");
    assert.equal(snapshot.coordination.thresholdClearedCampaignCount, 2);
    assert.equal(snapshot.coordination.thresholdClearRateBps, 5000);
    assert.equal(snapshot.coordination.medianHoursToThreshold, 154.5);
    assert.equal(snapshot.coordination.pageViewToPledgeIntentBps, 10000);
    assert.equal(snapshot.review.reviewerMedianHoursToClose, 48);
    assert.equal(snapshot.matching.sponsorPoolUtilizationBps !== null && snapshot.matching.sponsorPoolUtilizationBps > 0, true);
    assert.equal(snapshot.donorEconomics.activeContributionCount, 10);
    assert.equal(snapshot.donorEconomics.eligibleContributionCount, 9);
    assert.equal(snapshot.donorEconomics.medianGrossContributionCents, 8750);
    assert.equal(snapshot.donorEconomics.medianCapAdjustedCountedContributionCents, 9000);
    assert.equal(snapshot.donorEconomics.netNewFundingSurveyEventCount, 1);
    assert.equal(snapshot.donorEconomics.likelyNetNewFundingEventCount, 1);
    assert.equal(snapshot.donorEconomics.likelyNetNewFundingShareBps, 10000);
    assert.ok(
      snapshot.donorEconomics.campaignConcentrationTopDirectShareBps !== null &&
        snapshot.donorEconomics.campaignConcentrationTopDirectShareBps > 0,
    );
    assert.equal(snapshot.handoffProof.verifiableCompletionShareBps, 5000);
    assert.equal(snapshot.safety.noCustodyPilot, true);
    assert.equal(snapshot.safety.rawPrivateTextStored, false);
    assert.equal(snapshot.rolloutGate.widensPublicAccessAutomatically, false);
    assert.equal(snapshot.rolloutGate.recommendation, "hold_invited_cohort");
    assert.equal(snapshot.rolloutGate.blockers.includes("invited_cohort_still_required"), true);
    assert.equal(retentionSnapshot.recurring.retainedRecurringDonors3MonthBps, 5000);
    assert.equal(retentionSnapshot.recurring.retainedRecurringDonors6MonthBps, 5000);
    assert.equal(dryRun.status, "dry_run");
    assert.equal(serialized.includes("demo-supporter"), false);
    assert.equal(serialized.includes("private-old"), false);
    assert.equal(serialized.includes("supporterReason"), false);
    assert.match(route, /MPGF_PUBLIC_GOODS_KPI_SECRET/);
    assert.match(route, /loadMpgfPublicGoodsKpiSnapshot/);
    assert.match(kpis, /reviewerMedianHoursToClose/);
    assert.match(kpis, /thresholdClearRateBps/);
    assert.match(kpis, /retainedRecurringDonors3MonthBps/);
    assert.match(kpis, /campaignConcentrationTopDirectShareBps/);
    assert.match(kpis, /medianCapAdjustedCountedContributionCents/);
    assert.match(kpis, /netNewFundingProxy/);
    assert.doesNotMatch(kpis, /user_ref_hash/);
  } finally {
    if (previousCohort === undefined) {
      delete process.env.MPGF_PUBLIC_GOODS_COHORT;
    } else {
      process.env.MPGF_PUBLIC_GOODS_COHORT = previousCohort;
    }
  }
});

test("MPGF public-goods operations dashboard alerts on payment, replay, and dispute freezes", () => {
  const dashboard = buildMpgfPublicGoodsOperationsDashboard({
    generatedAt: "2026-05-29T12:00:00.000Z",
    webhookEvents: [
      {
        provider: "stripe",
        providerEventId: "evt_failed_private_ref",
        eventType: "checkout.session.async_payment_failed",
        status: "failed",
        processed: true,
        processingError: "provider_payment_failed",
        replayAttemptCount: 0,
        createdAt: "2026-05-29T10:00:00.000Z",
      },
      {
        provider: "stripe",
        providerEventId: "evt_replay_private_ref",
        eventType: "checkout.session.completed",
        status: "processed",
        processed: true,
        replayAttemptCount: 1,
        lastReplayedAt: "2026-05-29T11:00:00.000Z",
        createdAt: "2026-05-29T09:00:00.000Z",
      },
    ],
  });
  const alertKinds = new Set(dashboard.incidents.alerts.map((alert) => alert.kind));
  const serialized = JSON.stringify(dashboard);
  const route = readFileSync("src/app/api/mpgf/public-goods/operations/route.ts", "utf8");
  const operations = readFileSync("src/lib/mpgf/public-goods-operations.ts", "utf8");
  const realMoney = readFileSync("src/lib/mpgf/real-money.ts", "utf8");
  const replayMigration = readFileSync(
    "supabase/migrations/20260531_mpgf_payment_webhook_replay_alerts.sql",
    "utf8",
  );

  assert.equal(dashboard.privacyPolicy, "private_admin_operations_no_raw_webhook_payloads");
  assert.equal(dashboard.status, "attention_required");
  assert.equal(dashboard.alerting.configured, true);
  assert.equal(dashboard.alerting.secretPolicy, "secret_values_never_returned");
  assert.equal(alertKinds.has("payment_failure"), true);
  assert.equal(alertKinds.has("webhook_replay_attempt"), true);
  assert.equal(alertKinds.has("dispute_freeze"), true);
  assert.equal(dashboard.dashboardCounters.reviewSlaHours, 48);
  assert.equal(typeof dashboard.dashboardCounters.reviewSlaSampleReady, "boolean");
  assert.equal(typeof dashboard.dashboardCounters.identityFlagRateBps === "number", true);
  assert.equal(dashboard.dashboardCounters.thresholdClearRateBps, 5000);
  assert.equal(dashboard.dashboardCounters.paymentFailureCount, 1);
  assert.equal(dashboard.dashboardCounters.webhookReplayAttemptCount, 1);
  assert.ok(dashboard.dashboardCounters.disputeFreezeCount > 0);
  assert.ok(dashboard.dashboardCounters.payoutHoldCampaignCount > 0);
  assert.equal(dashboard.rolloutGate.widensPublicAccessAutomatically, false);
  assert.equal(serialized.includes("evt_failed_private_ref"), false);
  assert.equal(serialized.includes("evt_replay_private_ref"), false);
  assert.doesNotMatch(serialized, /raw_body|payload_json|privateEvidence|supporterReason|receipt_url|evidenceUrl|whsec|sk_live/i);
  assert.match(route, /MPGF_PUBLIC_GOODS_OPERATIONS_SECRET/);
  assert.match(route, /loadMpgfPublicGoodsOperationsDashboard/);
  assert.match(route, /private_admin_operations_no_raw_webhook_payloads/);
  assert.match(operations, /payment_failure/);
  assert.match(operations, /webhook_replay_attempt/);
  assert.match(operations, /dispute_freeze/);
  assert.match(operations, /reviewSlaHours/);
  assert.match(operations, /identityFlagRateBps/);
  assert.match(operations, /thresholdClearRateBps/);
  assert.match(operations, /payoutHoldCents/);
  assert.match(realMoney, /replay_attempt_count/);
  assert.match(replayMigration, /last_replayed_at/);
});

test("MPGF public-goods migration covers required entities and RLS policies", () => {
  const migration = readFileSync("supabase/migrations/20260529_mpgf_verified_assurance_matching.sql", "utf8");
  const governanceMigration = readFileSync(
    "supabase/migrations/20260531_mpgf_public_goods_governance_enforcement.sql",
    "utf8",
  );
  const allocationSourceProofMigration = readFileSync(
    "supabase/migrations/20260531_mpgf_public_goods_allocation_source_proof.sql",
    "utf8",
  );

  for (const tableName of [
    "mpgf_public_goods_campaigns",
    "mpgf_public_goods_rounds",
    "mpgf_public_goods_pledges",
    "mpgf_public_goods_identity_attestations",
    "mpgf_public_goods_match_pools",
    "mpgf_public_goods_allocation_results",
    "mpgf_public_goods_payment_proofs",
    "mpgf_public_goods_review_cases",
    "mpgf_public_goods_subscriptions",
    "mpgf_public_goods_experiment_assignments",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${tableName}`));
  }

  for (const tableName of [
    "mpgf_public_goods_sponsor_commitments",
    "mpgf_public_goods_appeals",
    "mpgf_public_goods_audit_events",
    "mpgf_public_goods_reviewer_recusals",
  ]) {
    assert.match(governanceMigration, new RegExp(`create table if not exists public\\.${tableName}`));
  }

  assert.match(migration, /is_recurring boolean not null default false/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /mpgf_public_goods_pledges_insert_own/);
  assert.match(migration, /mpgf_public_goods_payment_proofs_insert_own/);
  assert.match(migration, /reason_code text not null default 'needs_destination_evidence'/);
  assert.match(migration, /reconciliation_source text not null default 'external_receipt'/);
  assert.match(migration, /source_event_ref text/);
  assert.match(migration, /mpgf_public_goods_payment_proofs_source_event_idx/);
  assert.match(migration, /mpgf_public_goods_analytics_no_raw_contact/);
  assert.match(migration, /perDonorQfCapCents/);
  assert.match(migration, /identity_confidence_only_no_moral_reputation/);
  assert.match(migration, /public_goods_threshold_amount_cents/);
  assert.match(migration, /public_goods_destination_type/);
  assert.match(migration, /insert into public\.mpgf_public_goods_campaigns/);
  assert.match(migration, /campaign-global-health-basic-needs/);
  assert.match(governanceMigration, /mpgf_public_goods_audit_events_append_only/);
  assert.match(governanceMigration, /round parameters are immutable after status = open/);
  assert.match(governanceMigration, /reviewer recusal blocks this review case/);
  assert.match(governanceMigration, /eligibility_status = approved/);
  assert.match(governanceMigration, /roll_forward_to_next_round_or_default_pool_by_published_rule/);
  assert.match(governanceMigration, /private_evidence_ref is null or private_evidence_ref !~\*/);
  assert.match(governanceMigration, /noTokenVoting/);
  assert.match(allocationSourceProofMigration, /source_contribution_digest text not null/);
  assert.match(allocationSourceProofMigration, /eligible_contribution_record_count integer not null/);
  assert.match(allocationSourceProofMigration, /raw_payment_object_count integer not null/);
  assert.match(allocationSourceProofMigration, /unique_counted_identity_count integer not null/);
  assert.match(allocationSourceProofMigration, /regenerated_from_contribution_records boolean not null/);
  assert.match(allocationSourceProofMigration, /unique_counted_identity_count <= eligible_contribution_record_count/);
  assert.match(allocationSourceProofMigration, /eligible_contribution_record_count <= raw_payment_object_count/);
  assert.match(allocationSourceProofMigration, /no donor ids or raw payment refs are exposed/);
});

test("MPGF public-goods participant paths persist campaign pledges and creation fields", () => {
  const persistence = readFileSync("src/lib/mpgf/persistence.ts", "utf8");
  const actions = readFileSync("src/app/mpgf/actions.ts", "utf8");
  const consoleSource = readFileSync("src/components/mpgf/mpgf-console.tsx", "utf8");
  const accountSource = readFileSync("src/components/mpgf/mpgf-contribution-controls.tsx", "utf8");

  assert.match(persistence, /persistMpgfPublicGoodsPledge/);
  assert.match(persistence, /mpgf_public_goods_pledges/);
  assert.match(persistence, /mpgf_public_goods_subscriptions/);
  assert.match(persistence, /public_goods_threshold_amount_cents/);
  assert.match(actions, /recordMpgfPublicGoodsPledgeAction/);
  assert.match(consoleSource, /Your pledge only happens if enough verified people join/);
  assert.match(consoleSource, /publicGoodsDestinationType/);
  assert.match(accountSource, /Conditional campaign pledges/);
});

test("MPGF public-goods reconciliation route writes payment proofs through a protected job surface", () => {
  const route = readFileSync("src/app/api/mpgf/public-goods/reconcile/route.ts", "utf8");
  const reconciliation = readFileSync("src/lib/mpgf/public-goods-reconciliation.ts", "utf8");

  assert.match(route, /MPGF_RECONCILIATION_SECRET/);
  assert.match(route, /reconcileMpgfPublicGoodsPaymentProof/);
  assert.match(reconciliation, /mpgf_public_goods_payment_proofs/);
  assert.match(reconciliation, /mpgf_public_goods_review_cases/);
  assert.match(reconciliation, /source_event_ref/);
  assert.match(reconciliation, /status: "already_processed"/);
});

test("MPGF public-goods proof pages resolve campaign routes and expose public-safe aggregates", () => {
  const campaign = demoMpgfPublicGoodsCampaigns[0];
  const allocation = allocateMpgfAssuranceRound();
  const line = allocation.lines.find((candidate) => candidate.campaignId === campaign.id);
  const bySlug = resolveMpgfPublicGoodsRoute(campaign.slug);
  const byCampaignId = resolveMpgfPublicGoodsRoute(campaign.id);
  const proof = summarizeMpgfPublicGoodsProof({
    campaign,
    assuranceLine: line,
  });
  const exclusionProof = summarizeMpgfPublicGoodsProof({
    campaign,
    assuranceLine: line,
    paymentProofs: [
      {
        id: "proof-verified",
        campaignId: campaign.id,
        amountVerifiedCents: 1_000,
        status: "verified",
        reasonCode: "external_handoff_verified",
        reconciliationSource: "external_receipt",
        verifiedAt: "2026-05-13T12:00:00.000Z",
        createdAt: "2026-05-13T12:00:00.000Z",
      },
      {
        id: "proof-duplicate",
        campaignId: campaign.id,
        amountVerifiedCents: 0,
        status: "rejected",
        reasonCode: "duplicate_identity_blocked",
        reconciliationSource: "external_receipt",
        createdAt: "2026-05-14T12:00:00.000Z",
      },
    ],
    reviewCases: [
      {
        id: "review-appeal",
        campaignId: campaign.id,
        state: "challenge_window",
        action: "challenge",
        reasonCode: "appeal_requested",
        reviewerId: "redacted-reviewer",
        openedAt: "2026-05-14T13:00:00.000Z",
        appealStatus: "appeal_requested",
        publicNotes: "Appeal requested for duplicate-proof review.",
        allowedNextActions: ["needs_evidence", "block", "finalize"],
      },
    ],
  });
  const page = readFileSync("src/app/mpgf/pools/[poolId]/page.tsx", "utf8");

  assert.equal(bySlug.campaign?.id, campaign.id);
  assert.equal(bySlug.alternative?.id, campaign.poolAlternativeId);
  assert.equal(byCampaignId.campaign?.id, campaign.id);
  assert.equal(proof.verifiedAmountCents, 10_000);
  assert.equal(proof.latestReasonCode, "external_handoff_verified");
  assert.equal(proof.latestReconciliationSource, "external_receipt");
  assert.equal(proof.publicEvidenceSource, "demo_fixture");
  assert.equal(exclusionProof.latestReasonCode, "duplicate_identity_blocked");
  assert.equal(exclusionProof.latestAppealStatus, "appeal_requested");
  assert.equal(normalizeMpgfPublicGoodsReasonCode("challenge_opened"), "challenge_opened");
  assert.equal(normalizeMpgfPublicGoodsReasonCode("appeal_upheld"), "appeal_upheld");
  assert.equal(normalizeMpgfPublicGoodsReasonCode("not-a-reason-code"), "needs_destination_evidence");
  assert.match(page, /loadMpgfPublicGoodsProofSummary/);
  assert.match(page, /Destination reference/);
  assert.match(page, /Deadline/);
  assert.match(page, /Sponsor top-up/);
  assert.match(page, /Sponsor commitment/);
  assert.match(page, /visibleCommitment/);
  assert.match(page, /Public evidence source/);
});

test("MPGF production completion gate fails while production evidence is only pending", () => {
  const result = validateMpgfDeploymentEnvironment("completion_gate");

  assert.equal(result.status, "failed");
  assert.ok(result.errors.some((error) => error.id === "deployment-completion-evidence-not-passed"));
});

test("MPGF production runners distinguish completed public evidence from remaining auth evidence", () => {
  assert.equal(validateMpgfDeploymentEnvironment("pre_launch").status, "passed");
  assert.equal(runMpgfProductionDirectWorkingLaunch().status, "passed");
  assert.equal(runMpgfWwwDirectWorkingVerification().status, "passed");
  assert.equal(validateMpgfDeploymentEnvironment("completion_gate").status, "failed");
});

test("MPGF production health-check harness records profile check IDs and severity", async () => {
  const result = await runMpgfProductionHealthCheck({
    deployedCommitShaOrBuildId: "test-build",
    fetcher: async () => new Response("<html>Moral Public Goods Fund</html>", { status: 200 }),
  });

  assert.equal(result.passed, true);
  assert.equal(result.deployedCommitShaOrBuildId, "test-build");
  assert.ok(result.checks.length >= 3);
  assert.ok(result.checks.every((check) => check.id.startsWith("mpgf-")));
  assert.ok(result.checks.every((check) => check.severity === "critical" || check.severity === "warning"));
});

test("MPGF completion control plane exposes truthful production blockers", async () => {
  const solverGate = evaluateMpgfSolverCertificationGate();
  const exactPilotGate = evaluateMpgfExactPilotGate();
  const payoutGate = await evaluateMpgfPayoutComplianceGate();
  const governanceGate = evaluateMpgfGovernanceMachineryGate();
  const productionGate = await evaluateMpgfProductionVerificationGate();
  const summary = await loadMpgfProductionControlPlaneSummary();

  assert.equal(solverGate.status, "passed");
  assert.equal(exactPilotGate.status, "passed");
  assert.equal(payoutGate.status, "pending_review");
  assert.equal(governanceGate.status, "passed");
  assert.equal(productionGate.status, "blocked");
  assert.equal(summary.status, "blocked");
  assert.equal(summary.completionProfiles.exactPilotComplete, "passed");
  assert.equal(summary.completionProfiles.realMoneyComplete, "blocked");
  assert.ok(summary.gates.some((gate) => gate.key === "real-money-provider-operations"));
  assert.ok(mpgfGatesForAdminSection("payouts", summary.gates).some((gate) => gate.area === "payout_compliance"));
});

test("MPGF named loader and payment/cap helpers match the build instruction surface", () => {
  assert.equal(loadMpgfPublicExperienceProfile().publicEntryRoute, "/mpgf");
  assert.equal(computeCapCents(BigInt(100000), BigInt(5000), BigInt(8000)), BigInt(40000));
  assert.equal(computeRationalCapCents(BigInt(100000), BigInt(5000), { num: "3", den: "2" }), BigInt(75000));
  assert.equal(createMpgfPledge({ amountCents: 1000 }).status, "pledged");
  assert.throws(
    () =>
      createMpgfPaymentIntent({
        userId: "demo",
        cycleId: "cycle",
        amountCents: BigInt(1000),
        mode: "pledge_only",
      }),
    /rejects pledge_only/,
  );
});

test("MPGF SAE assessment aggregation converts marginal curves without live objective use", () => {
  const summary = aggregateSaeAssessments("pool-a", "cycle-a", [
    {
      id: "sae-1",
      poolId: "pool-a",
      cycleId: "cycle-a",
      status: "approved",
      curveType: "marginal_effect",
      curveJson: {
        representation: "piecewise_linear",
        domainStartCents: 0,
        domainEndCents: 100,
        breakpoints: [
          { xCents: 0, valueRational: { num: "1", den: "1" } },
          { xCents: 100, valueRational: { num: "3", den: "1" } },
        ],
      },
    },
  ]);

  assert.equal(summary.status, "passed");
  assert.equal(summary.validApprovedAssessmentCount, 1);
  assert.equal(summary.liveObjectiveInput, false);
  assert.equal(summary.totalEffectCurves[0]?.curve.breakpoints.at(-1)?.valueRational.num, "200");
});

test("MPGF solver certification is live only for the exact pilot while payouts fail closed", () => {
  assert.equal(preflightMpgfSolverSupport().liveOrdinaryAllocationAllowed, true);
  assert.equal(selectMpgfLiveSolver().status, "selected");
  assert.equal(solveMpgfByCompleteRegionEnumeration().status, "verified_optimal");
  assert.equal(solveMpgfByCertifiedBranchAndBound().status, "failed_certification");
  assert.equal(verifyMpgfOptimalityCertificate().status, "failed");
  assert.equal(verifyMpgfOptimalityCertificate(undefined, generateMpgfDemoAllocationCertificate()).status, "passed");

  assert.equal(approveInternalPayoutAuthorization("payout-auth-1").status, "blocked");
  assert.equal(verifyExternalPaymentEvidence("evidence-1").verified, false);
  assert.equal(voidPayoutAuthorization("payout-auth-1", "test").status, "voided");
  assert.equal(carryOverVoidedPayout("payout-auth-1").status, "carried_over");

  assert.equal(compareMpgfDryRunToLive("dry-run-test").status, "passed");
  assert.equal(revokeMpgfCompletionProfile("demo_complete", "test").status, "revoked");
  assert.equal(enforceMpgfRateLimit("public_read", "127.0.0.1").allowed, true);
  assert.deepEqual(redactMpgfSecrets({ STRIPE_SECRET_KEY: "sk_test" }), { STRIPE_SECRET_KEY: "[REDACTED_MPGF_SECRET]" });
  assert.equal(rotateMpgfSecret("MPGF_ADMIN_BOOTSTRAP_SECRET").secretValueExposed, false);
});

test("MPGF fallback and state-machine discovery helpers match required surfaces", () => {
  const fallbackPlan = fallbackAllocate({
    cycleBudgetCents: BigInt(10000),
    stage: "pilot",
    operationalReliabilityBps: BigInt(8000),
    baseEtaFallbackBps: BigInt(5000),
    protocol: {
      protocolVersion: "test",
      protocolParameterVersion: "test",
      thetaVersion: "test",
      stage: "pilot",
      effectiveFrom: "2026-05-01T00:00:00.000Z",
      sourceHash: "test",
      approvalStatus: "approved",
      conformanceRows: [],
      representativeQuorum: {},
      strongNegative: {},
      riskExposure: {},
    },
    safeFallbacks: [
      {
        fallbackId: "fallback-a",
        title: "Fallback A",
        auditConfidenceBps: BigInt(9000),
        consensusBreadthBps: BigInt(8500),
        robustCostEffectivenessBps: BigInt(8000),
        reversibilityBps: BigInt(7000),
        substantiveRiskBps: BigInt(1000),
        threatScoreBps: BigInt(500),
        tailLossBps: BigInt(300),
      },
    ],
  });

  assert.equal(fallbackPlan.status, "fallback_allocated");
  assert.equal(fallbackPlan.fallbackBudgetCapCents, BigInt(4000));
  assert.equal(discoverStatusBearingMpgfObjects().some((object) => object.objectType === "cycle"), true);
  assert.equal(discoverMpgfStatusFields().some((field) => field.field === "cycle.status"), true);
  assert.equal(
    transitionMpgfState({
      objectType: "cycle",
      objectId: "cycle-1",
      fromStatus: "draft",
      toStatus: "scheduled",
      reason: "test",
    }).status,
    "passed",
  );
});

test("MPGF production smoke-test identity is structured and session creation stays gated", () => {
  const identity = provisionMpgfWwwSmokeTestIdentity();
  const session = createMpgfWwwSmokeTestSession();

  assert.equal(identity.status, "passed");
  assert.equal(identity.repositoryAuthMapped, true);
  assert.equal(identity.nonRealMoneyOnly, true);
  assert.equal(identity.demoEligible, true);
  assert.equal(session.status, "failed");
  assert.equal(session.sessionEstablished, false);
  assert.ok(session.errors.some((error) => error.id === "www-smoke-test-session-not-created"));
});
