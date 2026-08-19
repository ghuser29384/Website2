import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
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
  solveMpgfCapitalConstrainedQfLambda,
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
import type { MpgfPublicGoodsPledge } from "./mpgf/types";
import {
  buildMpgfPublicGoodsAllocationContextFromRows,
  buildMpgfPublicGoodsPledgesFromContributionRows,
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
import {
  MPGF_PUBLIC_GOODS_IDENTITY_INTEGRITY_POLICY,
  buildMpgfPublicGoodsIdentityIntegrityReport,
  getMpgfPublicGoodsIdentityIntegrityReportApi,
} from "./mpgf/public-goods-identity-integrity";
import {
  MPGF_PUBLIC_GOODS_THRESHOLD_CALIBRATION_POLICY,
  buildMpgfPublicGoodsThresholdCalibrationReport,
  getMpgfPublicGoodsThresholdCalibrationReportApi,
} from "./mpgf/public-goods-threshold-calibration";
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
  MPGF_PUBLIC_GOODS_PUBLIC_METRIC_LABELS,
  buildMpgfPublicGoodsContributionKpiRecordsFromPersistedContributionRows,
  buildMpgfPublicGoodsKpiSnapshot,
  loadMpgfPublicGoodsKpiSnapshot,
  validateMpgfPublicGoodsPublicMetricCatalog,
} from "./mpgf/public-goods-kpis";
import {
  MPGF_PUBLIC_GOODS_POSTMORTEM_POLICY,
  buildMpgfPublicGoodsPostmortemReport,
  getMpgfPublicGoodsPostmortemReportApi,
} from "./mpgf/public-goods-postmortem";
import { buildMpgfPublicGoodsOperationsDashboard } from "./mpgf/public-goods-operations";
import {
  MPGF_PUBLIC_GOODS_CHALLENGE_POLICY,
  createMpgfPublicGoodsChallenge,
} from "./mpgf/public-goods-challenges";
import {
  MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_FLOW,
  MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_PRIVACY_POLICY,
  MPGF_PUBLIC_GOODS_CROSS_VIEW_CLEARANCE_POLICY,
  MPGF_PUBLIC_GOODS_DONOR_EXPOSURE_DISCLOSURE_POLICY,
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
  MPGF_PUBLIC_GOODS_SPONSOR_POOL_REFILL_AUTOMATION_POLICY,
  buildMpgfPublicGoodsSponsorPoolFlywheel,
  buildMpgfPublicGoodsSponsorPoolRefillAutomationPlan,
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
  MPGF_PUBLIC_GOODS_SEALED_PROGRESS_POLICY,
  buildMpgfPublicGoodsAllocationReportApi,
  buildMpgfPublicGoodsCampaignsApi,
  buildMpgfPublicGoodsMatchPreviewApi,
  buildMpgfPublicGoodsRoundApi,
  getMpgfPublicGoodsAllocationReportApi,
  getMpgfPublicGoodsCampaignApi,
  getMpgfPublicGoodsCampaignProofPathApi,
  getMpgfPublicGoodsLedgerApi,
  getMpgfPublicGoodsMatchPreviewApi,
  getMpgfPublicGoodsRoundApi,
  listMpgfPublicGoodsCampaignsApi,
  listMpgfPublicGoodsRoundsApi,
} from "./mpgf/public-goods-api";
import {
  MPGF_PUBLIC_GOODS_CG_VQAF_POLICY,
  MPGF_PUBLIC_GOODS_CG_VQAF_PRIVACY_POLICY,
  MPGF_PUBLIC_GOODS_COMMON_GROUND_DISCOVERY_POLICY,
  buildMpgfPublicGoodsCommonGroundDiscovery,
  buildMpgfPublicGoodsSupportSignalContractApi,
  createMpgfPublicGoodsSupportSignal,
  getMpgfPublicGoodsCommonGroundDiscoveryApi,
  getMpgfPublicGoodsCgVqafReportApi,
  getMpgfPublicGoodsSupportSignalContractApi,
  hashMpgfPublicGoodsMoralCluster,
  supportSignalFromMpgfPublicGoodsStorageRow,
} from "./mpgf/public-goods-cg-vqaf";
import {
  MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CHOICE_POLICY,
  MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CONDITIONAL_INTENT_POLICY,
  MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_FALLBACK_POLICY,
  MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY,
  MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_POLICY,
  MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_REQUIREMENT_CODES,
  buildMpgfCommonGroundBudgetPreview,
} from "./mpgf/public-goods-common-ground-budget";
import {
  MPGF_PUBLIC_GOODS_COALITION_ROUTING_FAILURE_POLICY,
  MPGF_PUBLIC_GOODS_COALITION_ROUTING_POLICY,
  MPGF_PUBLIC_GOODS_COALITION_ROUTING_PRIVACY_POLICY,
  buildMpgfPublicGoodsCoalitionRoutingReport,
  getMpgfPublicGoodsCoalitionRoutingReportApi,
} from "./mpgf/public-goods-coalition-routing";
import {
  MPGF_PUBLIC_GOODS_BATCH_CADENCE_POLICY,
  MPGF_PUBLIC_GOODS_CROSS_VIEW_SUBSIDY_POLICY,
  MPGF_PUBLIC_GOODS_CUSTODY_POLICY,
  MPGF_PUBLIC_GOODS_ECM_CORE_RULEBOOK_POLICY,
  MPGF_PUBLIC_GOODS_ECM_PLUS_HYBRID_POLICY,
  MPGF_PUBLIC_GOODS_RECIPIENT_REGISTRY_POLICY,
  MPGF_PUBLIC_GOODS_REFUND_REROUTE_POLICY,
  buildMpgfPublicGoodsEcmRulebookReport,
  getMpgfMechanismVersionFeatureFlag,
  getMpgfPublicGoodsEcmRulebookReportApi,
} from "./mpgf/public-goods-ecm-rulebook";
import {
  MPGF_CRECM_COPY_VALIDATION_POLICY,
  MPGF_CRECM_REQUIRED_COPY_VALIDATION_SURFACE_KINDS,
} from "./mpgf/public-goods-crecm-copy";
import {
  MPGF_PUBLIC_GOODS_EVERY_ORG_FAST_ROUTE_POLICY,
  MPGF_PUBLIC_GOODS_EVERY_ORG_PRIVACY_POLICY,
  type MpgfEveryOrgPartnerWebhookPayload,
  buildMpgfEveryOrgDonateLink,
  recordMpgfEveryOrgPartnerWebhook,
} from "./mpgf/public-goods-every-org";
import {
  MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY,
  MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_PRIVACY_POLICY,
  buildMpgfStripeConditionalPaymentIntentPlan,
  createMpgfStripeSavedCommitmentSetup,
  recordMpgfStripeSavedCommitmentWebhook,
} from "./mpgf/public-goods-stripe-commitments";
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
  validateMpgfLegalReadinessArtifacts,
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

test("MPGF direct-working validators fail closed when formal source artifacts are absent", () => {
  const mechanicalNormalization = validateMpgfInstructionMechanicalNormalization();
  const stateMachineCoverage = validateMpgfStateMachineCoverage();
  const formalSourceLock = validateFormalMechanismSourceLock();
  const phaseA = validateMpgfPhaseA();

  assert.equal(mechanicalNormalization.status, "failed");
  assert.ok(mechanicalNormalization.blockers.some((blocker) => /source artifact is missing/i.test(blocker)));
  assert.equal(stateMachineCoverage.status, "failed");
  assert.ok(stateMachineCoverage.blockers.some((blocker) => /planned-state-machine-table\.md/.test(blocker)));
  assert.equal(formalSourceLock.status, "failed");
  assert.ok(formalSourceLock.blockers.some((blocker) => /formal-mechanism\.md/.test(blocker)));
  assert.equal(phaseA.status, "failed");
  assert.ok(phaseA.blockers.some((blocker) => /repository-capability-inventory\.md/.test(blocker)));

  assert.equal(validateMpgfProtocolParameters().status, "passed");
  assert.equal(validateLedgerTemplateRegistry().status, "passed");
  assert.equal(validateLedgerTransactionTemplates().status, "passed");
  assert.equal(validateMpgfDirectWorkingFixtures().status, "passed");
  assert.equal(validateMpgfStatusValueRegistry().status, "passed");
  assert.equal(validateMpgfSchemaContractCoverage().status, "passed");
  assert.equal(validateMpgfRbacPermissionMatrix().status, "passed");
  assert.equal(validateMpgfCopyLibrary().status, "passed");
  assert.equal(validateMpgfRateLimits().status, "passed");
  assert.equal(validateMpgfPayoutProviderProfile().status, "passed");
  assert.equal(validateMpgfLegalReadinessArtifacts().status, "passed");
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
});

test("MPGF direct-working smoke test reports missing repository evidence without enabling real money", () => {
  const result = runMpgfDirectWorkingSmokeTest();

  assert.equal(result.status, "failed");
  assert.equal(result.passed, false);
  assert.equal(result.featureMode, "pledge_only");
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("validateMpgfInstructionMechanicalNormalization:")));
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("validateRepositoryCapabilityInventory:")));
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("validateMpgfStateMachineCoverage:")));
  assert.ok(result.checks.every((check) => typeof check.passed === "boolean"));
  assert.equal(result.checks.find((check) => check.id === "real-money-gated")?.passed, true);
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
  assert.ok(mpgfPublicRoutes.includes("/mpgf/metrics"));
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
  assert.equal(allocation.formulaVersion, "cg_vqaf_capital_constrained_qf_v1");
  assert.equal(allocation.qfAllocationPolicy, "capital_constrained_lambda_bisection_with_per_campaign_cap");
  assert.ok(allocation.qfLambda > 0);
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

test("MPGF assurance QF solves lambda before applying campaign bonus caps", () => {
  const campaignA = {
    ...demoMpgfPublicGoodsCampaigns[0]!,
    id: "campaign-qf-cap-high-signal",
    slug: "qf-cap-high-signal",
    thresholdAmountCents: 1,
    thresholdSupporters: 1,
    reviewStatus: "approved" as const,
  };
  const campaignB = {
    ...demoMpgfPublicGoodsCampaigns[1]!,
    id: "campaign-qf-cap-remainder",
    slug: "qf-cap-remainder",
    thresholdAmountCents: 1,
    thresholdSupporters: 1,
    reviewStatus: "approved" as const,
  };
  const pledge = (campaignId: string, userId: string): MpgfPublicGoodsPledge => ({
    id: `pledge-${campaignId}-${userId}`,
    campaignId,
    userId,
    amountCents: 1_000,
    visibilityMode: "private_amount",
    isRecurring: false,
    captureMode: "external_handoff",
    eligibilityState: "eligible",
    humanScoreBps: 10_000,
    status: "pledged",
    createdAt: "2026-05-15T12:00:00.000Z",
  });
  const pledges = [
    pledge(campaignA.id, "a-1"),
    pledge(campaignA.id, "a-2"),
    pledge(campaignA.id, "a-3"),
    pledge(campaignA.id, "a-4"),
    pledge(campaignA.id, "a-5"),
    pledge(campaignB.id, "b-1"),
    pledge(campaignB.id, "b-2"),
  ];
  const qfLambda = solveMpgfCapitalConstrainedQfLambda(
    [
      { qfScore: 20_000, qfBonusCapCents: 500 },
      { qfScore: 2_000, qfBonusCapCents: 200 },
    ],
    600,
  );
  const allocation = allocateMpgfAssuranceRound({
    campaigns: [campaignA, campaignB],
    pledges,
    round: {
      ...demoMpgfAssuranceRound,
      qfCapMultiple: 0.1,
    },
    matchPool: {
      ...demoMpgfMatchPool,
      budgetCents: 600,
      baseMatchRatio: 0,
      qfBonusCents: 600,
    },
  });
  const lineA = allocation.lines.find((line) => line.campaignId === campaignA.id);
  const lineB = allocation.lines.find((line) => line.campaignId === campaignB.id);

  assert.ok(qfLambda > 0.049 && qfLambda < 0.051);
  assert.ok(lineA);
  assert.ok(lineB);
  assert.equal(allocation.qfBonusBudgetCents, 600);
  assert.equal(allocation.qfBonusAllocatedCents, 600);
  assert.equal(lineA.qfBonusCents, lineA.qfBonusCapCents);
  assert.equal(lineB.qfBonusCents, 100);
  assert.equal(lineA.qfBonusCents + lineB.qfBonusCents, allocation.qfBonusAllocatedCents);
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
  const now = "2026-05-30T12:00:00.000Z";
  const countedPledgeRows = {
    conditionalPledges: [
      {
        id: "conditional-pledge-db-global-health-001",
        round_id: demoMpgfAssuranceRound.id,
        campaign_id: "campaign-global-health-basic-needs",
        profile_id: "profile-global-health-001",
        amount_cents: 10_000,
        counted_cap_cents: 10_000,
        visibility: "private_amount" as const,
        payment_mode: "every_org_fast_route" as const,
        status: "counted" as const,
        created_at: now,
      },
    ],
    pledgeIntents: [
      {
        id: "conditional-pledge-db-global-health-001",
        round_id: demoMpgfAssuranceRound.id,
        campaign_id: "campaign-global-health-basic-needs",
        profile_id: "profile-global-health-001",
        user_ref_hash: `sha256:${"1".repeat(64)}`,
        amount_cents: 10_000,
        visibility_pref: "private_amount" as const,
        payment_state: "provider_event_received" as const,
        counting_state: "counted_after_review" as const,
        created_at: now,
      },
    ],
    identityVerifications: [
      {
        id: "identity-global-health-001",
        pledge_intent_id: "conditional-pledge-db-global-health-001",
        status: "verified" as const,
        human_score_bps: 9_200,
        counts_for_matching: true,
        verified_at: now,
        created_at: now,
      },
    ],
    paymentEvents: [
      {
        id: "payment-event-global-health-001",
        conditional_pledge_id: "conditional-pledge-db-global-health-001",
        provider: "every_org" as const,
        provider_event_id_hash: `sha256:${"2".repeat(64)}`,
        provider_status: "recorded",
        amount_cents: 10_000,
        signature_verified: true,
        verified_at: now,
        append_only_hash: `sha256:${"3".repeat(64)}`,
        created_at: now,
      },
    ],
    providerPaymentEvents: [],
  };
  const persistedPledges = buildMpgfPublicGoodsPledgesFromContributionRows(countedPledgeRows);
  const paymentOnlyPledges = buildMpgfPublicGoodsPledgesFromContributionRows({
    ...countedPledgeRows,
    conditionalPledges: [{ ...countedPledgeRows.conditionalPledges[0], status: "pending_verification" as const }],
    pledgeIntents: [{ ...countedPledgeRows.pledgeIntents[0], counting_state: "not_counted" as const }],
  });
  const setupOnlyPledges = buildMpgfPublicGoodsPledgesFromContributionRows({
    ...countedPledgeRows,
    conditionalPledges: [
      {
        ...countedPledgeRows.conditionalPledges[0],
        id: "conditional-pledge-db-global-health-setup-only",
        payment_mode: "stripe_setup_intent_saved_commitment" as const,
      },
    ],
    pledgeIntents: [
      {
        ...countedPledgeRows.pledgeIntents[0],
        id: "conditional-pledge-db-global-health-setup-only",
        user_ref_hash: `sha256:${"4".repeat(64)}`,
      },
    ],
    identityVerifications: [
      {
        ...countedPledgeRows.identityVerifications[0],
        id: "identity-global-health-setup-only",
        pledge_intent_id: "conditional-pledge-db-global-health-setup-only",
      },
    ],
    paymentEvents: [
      {
        ...countedPledgeRows.paymentEvents[0],
        id: "payment-event-global-health-setup-only",
        conditional_pledge_id: "conditional-pledge-db-global-health-setup-only",
        provider: "stripe" as const,
        provider_status: "setup_succeeded_token_ready",
        provider_event_id_hash: `sha256:${"5".repeat(64)}`,
      },
    ],
  });
  const dbRoundContext = buildMpgfPublicGoodsAllocationContextFromRows({
    roundRow: {
      id: "mpgf-assurance-round-db-2026-06",
      name: "June 2026 persisted assurance round",
      starts_at: "2026-06-01T00:00:00.000Z",
      ends_at: "2026-06-30T23:59:59.000Z",
      match_pool_id: "mpgf-match-pool-db-2026-06",
      qf_enabled: true,
      qf_cap_multiple: 1.25,
      supporter_gate: "verified_human",
    },
    campaignRows: [
      {
        id: "campaign-db-common-ground-health",
        slug: "db-common-ground-health",
        pool_alternative_id: null,
        title: "Persisted common-ground health campaign",
        destination_type: "external_charity",
        destination_ref: "Persisted external destination",
        cause_tags: ["global health", "common ground"],
        public_summary: "A persisted campaign loaded for allocation finalization.",
        threshold_amount_cents: 5_000,
        threshold_supporters: 1,
        deadline_at: "2026-06-30T23:59:59.000Z",
        verification_method: "Provider webhook plus reviewer acceptance.",
        baseline_rule: "No threat baseline.",
        exit_rule: "Void if threshold fails.",
        review_status: "approved",
        challenge_window_ends_at: "2026-06-02T00:00:00.000Z",
      },
    ],
    matchPoolRow: {
      id: "mpgf-match-pool-db-2026-06",
      funder_type: "sponsor",
      budget_cents: 12_000,
      base_match_ratio: 1,
      qf_bonus_cents: 2_000,
      visible_commitment: "Persisted sponsor pool for the June round.",
      restrictions_json: { perDonorQfCapCents: 10_000 },
    },
    sponsorPoolDepositRows: [
      {
        id: "sponsor-deposit-db-available",
        sponsor_pool_id: "mpgf-match-pool-db-2026-06",
        round_id: "mpgf-assurance-round-db-2026-06",
        scheduled_for_round_id: null,
        source_type: "direct_sponsor_deposit",
        amount_cents: 8_000,
        status: "available",
        counts_toward_matching: true,
        received_at: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "sponsor-deposit-db-pending",
        sponsor_pool_id: "mpgf-match-pool-db-2026-06",
        round_id: "mpgf-assurance-round-db-2026-06",
        scheduled_for_round_id: null,
        source_type: "trade_surplus_tithe",
        amount_cents: 20_000,
        status: "pending_review",
        counts_toward_matching: false,
        received_at: "2026-06-01T00:00:00.000Z",
      },
    ],
  });
  const dbContextPledges = persistedPledges.map((pledge) => ({
    ...pledge,
    campaignId: "campaign-db-common-ground-health",
  }));
  const dbContextAllocation = allocateMpgfAssuranceRound({
    campaigns: dbRoundContext.campaigns,
    pledges: dbContextPledges,
    round: dbRoundContext.round,
    matchPool: dbRoundContext.matchPool,
    now: new Date("2026-06-03T00:00:00.000Z"),
  });
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
  const closeRoute = readFileSync("src/app/api/mpgf/rounds/[roundId]/close/route.ts", "utf8");
  const allocationResultsSource = readFileSync("src/lib/mpgf/public-goods-allocation-results.ts", "utf8");
  const formulaProofMigration = readFileSync(
    "supabase/migrations/20260602_mpgf_public_goods_allocation_formula_proof.sql",
    "utf8",
  );

  assert.equal(persistedPledges.length, 1);
  assert.equal(persistedPledges[0]?.eligibilityState, "eligible");
  assert.equal(persistedPledges[0]?.captureMode, "external_handoff");
  assert.equal(persistedPledges[0]?.status, "captured");
  assert.equal(persistedPledges[0]?.amountCents, 10_000);
  assert.match(persistedPledges[0]?.paymentIntentRef ?? "", /^payment-event:sha256:/);
  assert.equal(paymentOnlyPledges[0]?.eligibilityState, "pending_review");
  assert.equal(setupOnlyPledges[0]?.captureMode, "stored_payment_method");
  assert.equal(setupOnlyPledges[0]?.eligibilityState, "pending_review");
  assert.equal(setupOnlyPledges[0]?.paymentIntentRef, undefined);
  assert.equal(dbRoundContext.source, "database_round_context");
  assert.equal(dbRoundContext.round.id, "mpgf-assurance-round-db-2026-06");
  assert.equal(dbRoundContext.matchPool.id, "mpgf-match-pool-db-2026-06");
  assert.equal(dbRoundContext.sponsorPoolTargetCents, 12_000);
  assert.equal(dbRoundContext.sponsorPoolAvailableCents, 8_000);
  assert.equal(dbRoundContext.matchPool.budgetCents, 8_000);
  assert.equal(dbRoundContext.matchPool.qfBonusCents, 2_000);
  assert.equal(dbRoundContext.campaignCount, 1);
  assert.ok(dbRoundContext.warnings.some((warning) => warning.includes("allocation is capped")));
  assert.equal(dbContextAllocation.roundId, dbRoundContext.round.id);
  assert.equal(dbContextAllocation.matchPoolId, dbRoundContext.matchPool.id);
  assert.equal(dbContextAllocation.lines[0]?.campaignId, "campaign-db-common-ground-health");
  assert.equal(dbContextAllocation.lines[0]?.status, "payable");
  assert.ok(dbContextAllocation.baseMatchAllocatedCents <= dbRoundContext.matchPool.budgetCents);
  assert.equal(rows.length, allocation.lines.length);
  assert.ok(globalHealth);
  assert.ok(resilience);
  assert.ok(animalWelfare);
  assert.equal(globalHealth.status, "payable");
  assert.equal(globalHealth.formula_version, allocation.formulaVersion);
  assert.equal(globalHealth.qf_allocation_policy, allocation.qfAllocationPolicy);
  assert.equal(globalHealth.qf_lambda, allocation.qfLambda);
  assert.ok(globalHealth.total_payout_cents > 0);
  assert.ok(globalHealth.qf_bonus_cents <= globalHealth.qf_bonus_cap_cents);
  assert.match(globalHealth.source_contribution_digest, /^sha256:/);
  assert.match(globalHealth.locked_parameter_digest, /^sha256:/);
  assert.match(globalHealth.allocation_calculation_hash, /^sha256:/);
  assert.equal(globalHealth.parameters_locked_before_round_open, true);
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
  assert.match(allocationResultsSource, /mpgf_conditional_pledges/);
  assert.match(allocationResultsSource, /mpgf_payment_events/);
  assert.match(allocationResultsSource, /mpgf_provider_payment_events/);
  assert.match(allocationResultsSource, /mpgf_public_goods_rounds/);
  assert.match(allocationResultsSource, /mpgf_public_goods_campaigns/);
  assert.match(allocationResultsSource, /mpgf_public_goods_match_pools/);
  assert.match(allocationResultsSource, /mpgf_public_goods_sponsor_pool_deposits/);
  assert.match(allocationResultsSource, /counts_toward_matching/);
  assert.match(allocationResultsSource, /counted_after_review/);
  assert.match(allocationResultsSource, /locked_parameter_digest/);
  assert.match(allocationResultsSource, /allocation_calculation_hash/);
  assert.match(formulaProofMigration, /formula_version/);
  assert.match(formulaProofMigration, /qf_allocation_policy/);
  assert.match(formulaProofMigration, /allocation_calculation_hash/);
  assert.match(formulaProofMigration, /parameters_locked_before_round_open/);
  assert.match(route, /MPGF_ALLOCATION_SECRET/);
  assert.match(route, /persistMpgfPublicGoodsAllocationResults/);
  assert.match(route, /roundId/);
  assert.match(route, /formulaVersion/);
  assert.match(route, /contributionSource/);
  assert.match(route, /allocationContextSource/);
  assert.match(route, /sponsorPoolAvailableCents/);
  assert.match(route, /allocationCalculationHash/);
  assert.match(route, /eligibleContributionRecordCount/);
  assert.match(closeRoute, /roundId/);
  assert.match(closeRoute, /contributionSource/);
  assert.match(closeRoute, /allocationContextSource/);
  assert.match(closeRoute, /sponsorPoolAvailableCents/);
  assert.match(closeRoute, /lockedParameterDigest/);
  assert.match(route, /proofPageRequired/);
  assert.match(route, /qfBonusCapCents/);
});

test("MPGF public-goods public API surfaces aggregate rounds, campaigns, matching, and ledger", () => {
  const rounds = listMpgfPublicGoodsRoundsApi();
  const round = getMpgfPublicGoodsRoundApi(demoMpgfAssuranceRound.id);
  const campaigns = listMpgfPublicGoodsCampaignsApi(demoMpgfAssuranceRound.id);
  const detail = getMpgfPublicGoodsCampaignApi(demoMpgfPublicGoodsCampaigns[0]?.slug ?? "");
  const proofPath = getMpgfPublicGoodsCampaignProofPathApi(demoMpgfPublicGoodsCampaigns[0]?.slug ?? "");
  const preview = getMpgfPublicGoodsMatchPreviewApi(demoMpgfAssuranceRound.id);
  const frozenCampaignId = demoMpgfPublicGoodsCampaigns[0]?.id ?? "";
  const frozenPreview = getMpgfPublicGoodsMatchPreviewApi(demoMpgfAssuranceRound.id, {
    incidentStatusByCampaignId: { [frozenCampaignId]: "frozen" },
  });
  const frozenDetail = getMpgfPublicGoodsCampaignApi(frozenCampaignId, {
    incidentStatusByCampaignId: { [frozenCampaignId]: "frozen" },
  });
  const allocations = getMpgfPublicGoodsAllocationReportApi(demoMpgfAssuranceRound.id);
  const identityIntegrity = getMpgfPublicGoodsIdentityIntegrityReportApi(demoMpgfAssuranceRound.id);
  const thresholdCalibration = getMpgfPublicGoodsThresholdCalibrationReportApi(demoMpgfAssuranceRound.id);
  const postmortem = getMpgfPublicGoodsPostmortemReportApi(demoMpgfAssuranceRound.id);
  const ledger = getMpgfPublicGoodsLedgerApi();
  const persistedCampaign = {
    ...demoMpgfPublicGoodsCampaigns[0]!,
    id: "persisted-public-api-campaign",
    slug: "persisted-public-api-campaign",
    title: "Persisted public API campaign",
    thresholdAmountCents: 10_000,
    thresholdSupporters: 1,
  };
  const persistedRound = {
    ...demoMpgfAssuranceRound,
    endsAt: "2026-05-30T23:59:59.000Z",
    id: "persisted-public-api-round",
    matchPoolId: demoMpgfMatchPool.id,
  };
  const persistedIdentity = createMpgfPublicGoodsIdentityAttestation({
    userId: "persisted-public-api-supporter",
    provider: "external_proof_of_personhood",
    humanScoreBps: 9_200,
    expiresAt: "2026-12-31T00:00:00.000Z",
    redactedReference: "external_proof_of_personhood:redacted:persisted-public-api",
  });
  const persistedPledges = [
    createMpgfPublicGoodsPledge({
      campaign: persistedCampaign,
      userId: persistedIdentity.userId,
      amountCents: 12_500,
      identityAttestation: persistedIdentity,
    }),
  ] satisfies MpgfPublicGoodsPledge[];
  const persistedAllocation = allocateMpgfAssuranceRound({
    campaigns: [persistedCampaign],
    pledges: persistedPledges,
    round: persistedRound,
    matchPool: demoMpgfMatchPool,
  });
  const persistedPreview = buildMpgfPublicGoodsMatchPreviewApi({
    allocation: persistedAllocation,
    campaigns: [persistedCampaign],
    round: persistedRound,
    roundId: persistedRound.id,
  });
  const persistedAllocationReport = buildMpgfPublicGoodsAllocationReportApi({
    allocation: persistedAllocation,
    pledges: persistedPledges,
    round: persistedRound,
    roundId: persistedRound.id,
  });
  const persistedCampaigns = buildMpgfPublicGoodsCampaignsApi({
    roundId: persistedRound.id,
    campaigns: [persistedCampaign],
    pledges: persistedPledges,
    allocation: persistedAllocation,
    round: persistedRound,
  });
  const persistedRoundDetail = buildMpgfPublicGoodsRoundApi({
    round: persistedRound,
    campaigns: [persistedCampaign],
    matchPool: demoMpgfMatchPool,
    allocation: persistedAllocation,
    pledges: persistedPledges,
    dataSource: "database",
  });

  assert.equal(rounds.privacyPolicy, MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY);
  assert.equal(rounds.cacheControl, MPGF_PUBLIC_GOODS_API_CACHE_CONTROL);
  assert.deepEqual(MPGF_PUBLIC_GOODS_API_HEADERS, { "Cache-Control": MPGF_PUBLIC_GOODS_API_CACHE_CONTROL });
  assert.equal(rounds.rounds.length, 1);
  assert.equal(rounds.rounds[0]?.sealedProgress.active, true);
  assert.equal(rounds.rounds[0]?.verifiedDonorCount, null);
  assert.ok(round);
  assert.equal(round.cacheControl, MPGF_PUBLIC_GOODS_API_CACHE_CONTROL);
  assert.equal(round.round.sealedProgress.active, true);
  assert.equal(round.round.sealedProgress.policy, MPGF_PUBLIC_GOODS_SEALED_PROGRESS_POLICY);
  assert.equal(round.round.sealedProgress.exactPublicProgressVisible, false);
  assert.ok(round.round.sealedProgress.redactedFields.includes("thresholdPassed"));
  assert.equal(round.round.verifiedDonorCount, null);
  assert.equal(round.round.contributionFlow?.primaryFlow, MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_FLOW);
  assert.equal(round.round.contributionFlow?.pledgeIntentPath, `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/pledge-intents`);
  assert.equal(round.round.contributionFlow?.manualEvidenceFallbackPath, "/api/mpgf/evidence/manual");
  assert.equal(round.round.contributionFlow?.defaultContributionMode, "every_org_fast_route");
  assert.equal(round.round.contributionFlow?.crossViewClearancePolicy, MPGF_PUBLIC_GOODS_CROSS_VIEW_CLEARANCE_POLICY);
  assert.equal(round.round.contributionFlow?.donorExposureDisclosurePolicy, MPGF_PUBLIC_GOODS_DONOR_EXPOSURE_DISCLOSURE_POLICY);
  assert.match(round.round.contributionFlow?.savedCommitmentPolicy ?? "", /setup_intent_first/);
  assert.ok(round.round.contributionFlow?.stateObjects.includes("provider_payment_event"));
  assert.ok(round.round.contributionFlow?.stateObjects.includes("cross_view_intent_terms"));
  assert.equal(round.round.ecmRulebook.policy, MPGF_PUBLIC_GOODS_ECM_CORE_RULEBOOK_POLICY);
  assert.equal(round.round.ecmRulebook.ecmPlusHybridPolicy, MPGF_PUBLIC_GOODS_ECM_PLUS_HYBRID_POLICY);
  assert.equal(round.round.ecmRulebook.reportPath, `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/rulebook`);
  assert.equal(round.round.ecmRulebook.custodyPolicy, MPGF_PUBLIC_GOODS_CUSTODY_POLICY);
  assert.equal(round.round.ecmRulebook.batchCadencePolicy, MPGF_PUBLIC_GOODS_BATCH_CADENCE_POLICY);
  assert.equal(round.round.ecmRulebook.refundReroutePolicy, MPGF_PUBLIC_GOODS_REFUND_REROUTE_POLICY);
  assert.equal(round.round.ecmRulebook.crossViewSubsidyPolicy, MPGF_PUBLIC_GOODS_CROSS_VIEW_SUBSIDY_POLICY);
  assert.equal(round.round.ecmRulebook.recipientRegistryPolicy, MPGF_PUBLIC_GOODS_RECIPIENT_REGISTRY_POLICY);
  assert.equal(round.round.ecmRulebook.batchWindowMinDays, 7);
  assert.equal(round.round.ecmRulebook.batchWindowMaxDays, 14);
  assert.equal(round.round.ecmRulebook.preserveCappedQfBreadthBonus, true);
  assert.equal(round.round.ecmRulebook.longLivedRoundOpenHoldsAllowed, false);
  assert.equal(round.round.ecmRulebook.escrowClaimAllowed, false);
  assert.equal(round.round.ecmRulebook.donorDisclosure.maxExposureRequiredBeforeAuthorization, true);
  assert.equal(round.round.ecmRulebook.refundAndReroute.silentFailureAllowed, false);
  assert.equal(round.round.ecmRulebook.crossViewSubsidySchedule.maxPremiumBps, 1500);
  assert.equal(round.round.ecmRulebook.crossViewSubsidySchedule.preservesCappedQfBreadthBonus, true);
  assert.equal(round.round.ecmRulebook.crossViewSubsidySchedule.moralReputationCanIncreasePremium, false);
  assert.equal(round.round.ecmRulebook.recipientEligibilityRules.payableOnlyIfRegistryStatusEligible, true);
  assert.equal(round.round.ecmRulebook.donorDisclosure.counterpartBucketsRequired, true);
  assert.equal(round.round.ecmRulebook.publicCopyValidation.ok, true);
  assert.equal(round.round.ecmRulebook.publicCopyValidation.policy, MPGF_CRECM_COPY_VALIDATION_POLICY);
  assert.equal(round.round.ecmRulebook.moralReputationCanIncreaseAllocationPower, false);
  assert.equal(round.round.ecmRulebook.noGlobalMoralRanking, true);
  assert.equal(round.round.cgVqaf?.policy, MPGF_PUBLIC_GOODS_CG_VQAF_POLICY);
  assert.equal(round.round.cgVqaf?.reportPath, `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/cg-vqaf`);
  assert.equal(
    round.round.cgVqaf?.commonGroundDiscoveryPath,
    `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/common-ground-discovery`,
  );
  assert.equal(round.round.cgVqaf?.commonGroundDiscoveryPolicy, MPGF_PUBLIC_GOODS_COMMON_GROUND_DISCOVERY_POLICY);
  assert.equal(
    round.round.cgVqaf?.commonGroundOrderingExperimentKey,
    "mpgf_static_ordering_vs_common_ground_personalization_v1",
  );
  assert.equal(round.round.cgVqaf?.learnsOverlappingReasons, true);
  assert.equal(round.round.cgVqaf?.supportSignalPath, `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/support-signals`);
  assert.equal(round.round.cgVqaf?.supportSignalPrivateByDefault, true);
  assert.equal(round.round.cgVqaf?.publicAggregationOnly, true);
  assert.equal(round.round.cgVqaf?.noGlobalMoralRanking, true);
  assert.equal(round.round.cgVqaf?.ranksCoordinatabilityOnly, true);
  assert.ok(round.round.cgVqaf?.signalOptions.some((option) => option.value === "weak_common_ground_support"));
  assert.ok(round.round.cgVqaf?.moralClusterOptions.some((option) => option.value === "animal_inclusive"));
  assert.ok(round.round.cgVqaf?.collectiveActionStates.some((state) => state.value === "payout_in_milestones"));
  assert.equal(round.round.coalitionRouting.policy, MPGF_PUBLIC_GOODS_COALITION_ROUTING_POLICY);
  assert.equal(
    round.round.coalitionRouting.reportPath,
    `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/coalition-routing`,
  );
  assert.equal(round.round.coalitionRouting.noGlobalMoralRanking, true);
  assert.equal(round.round.coalitionRouting.moralReputationAffectsAllocationPower, false);
  assert.equal(round.round.coalitionRouting.publicAggregationOnly, true);
  assert.equal(round.round.coalitionRouting.weakSupportBudgetCents, null);
  assert.equal(round.round.coalitionRouting.routedWeakSupportBudgetCents, null);
  assert.equal(round.round.commonGroundBudget.policy, MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY);
  assert.equal(round.round.commonGroundBudget.choiceArchitecturePolicy, MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CHOICE_POLICY);
  assert.equal(round.round.commonGroundBudget.fallbackPolicy, MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_FALLBACK_POLICY);
  assert.equal(
    round.round.commonGroundBudget.previewPath,
    `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/common-ground-budget-preview`,
  );
  assert.equal(round.round.commonGroundBudget.releaseStage, "sandbox_calculation");
  assert.equal(round.round.commonGroundBudget.paymentCaptureAllowed, false);
  assert.equal(round.round.commonGroundBudget.stateMutation, "none_preview_only");
  assert.equal(round.round.commonGroundBudget.savePreviewField, "savePreview");
  assert.equal(round.round.commonGroundBudget.savePreviewStateMutation, "common_ground_budget_preview_saved");
  assert.equal(round.round.commonGroundBudget.savePreviewRequiresParticipantSurplusConfirmation, true);
  assert.equal(round.round.commonGroundBudget.savePreviewPaymentCaptureAllowed, false);
  assert.deepEqual(round.round.commonGroundBudget.savedRecords, [
    "mpgf_user_budgets",
    "mpgf_support_stances",
    "mpgf_conditional_trade_intents",
  ]);
  assert.equal(round.round.commonGroundBudget.releaseGatePolicy, MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_POLICY);
  assert.equal(
    round.round.commonGroundBudget.releaseGateRequirementCount,
    MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_REQUIREMENT_CODES.length,
  );
  assert.equal(round.round.commonGroundBudget.participantSurplusConfirmationRequired, true);
  assert.equal(round.round.commonGroundBudget.eligibleProjectSetHashRequired, true);
  assert.equal(round.round.commonGroundBudget.fallbackRerouteLimitedToFrozenEligibleSet, true);
  assert.deepEqual(round.round.commonGroundBudget.laterStageTracksFailClosed, [
    "real_money_capture",
    "donation_offsets",
    "pledge_swaps",
  ]);
  assert.equal(round.round.commonGroundBudget.noGlobalMoralRanking, true);
  assert.equal(round.round.identityIntegrity?.policy, MPGF_PUBLIC_GOODS_IDENTITY_INTEGRITY_POLICY);
  assert.equal(
    round.round.identityIntegrity?.reportPath,
    `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/identity-integrity`,
  );
  assert.equal(round.round.identityIntegrity?.qfWeightPolicy, "identity_confidence_only_no_moral_reputation");
  assert.equal(round.round.identityIntegrity?.noMoralReputationWeighting, true);
  assert.equal(round.round.identityIntegrity?.identityCanAffectEligibilityOrWeight, true);
  assert.equal(round.round.identityIntegrity?.commonGroundSignalsExcludedFromAllocationPower, true);
  assert.equal(round.round.identityIntegrity?.supportSignalStrengthExcludedFromAllocationPower, true);
  assert.equal(round.round.identityIntegrity?.rawProviderPayloadsExcluded, true);
  assert.ok(round.round.identityIntegrity?.counters.eligibleDistinctIdentityCount);
  assert.ok((round.round.identityIntegrity?.counters.duplicateIdentityCount ?? 0) > 0);
  assert.equal(round.round.thresholdCalibration?.policy, MPGF_PUBLIC_GOODS_THRESHOLD_CALIBRATION_POLICY);
  assert.equal(
    round.round.thresholdCalibration?.reportPath,
    `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/threshold-calibration`,
  );
  assert.equal(round.round.thresholdCalibration?.currentRoundMutationAllowed, false);
  assert.equal(round.round.thresholdCalibration?.parametersLockedBeforeDonationsOpen, true);
  assert.equal(round.round.thresholdCalibration?.noGlobalMoralRanking, true);
  assert.equal(round.round.thresholdCalibration?.ranksOperationalCalibrationOnly, true);
  assert.equal(round.round.postmortem?.policy, MPGF_PUBLIC_GOODS_POSTMORTEM_POLICY);
  assert.equal(round.round.postmortem?.reportPath, `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/postmortem`);
  assert.equal(round.round.postmortem?.publicPostmortemTemplatePublished, true);
  assert.equal(round.round.postmortem?.currentRoundMutationAllowed, false);
  assert.equal(
    round.round.postmortem?.parameterResetPolicy,
    "next_round_only_after_public_postmortem_and_before_donations_open",
  );
  assert.equal(round.round.postmortem?.noGlobalMoralRanking, true);
  assert.ok((round.round.postmortem?.requiredArtifactCount ?? 0) >= 5);
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
  assert.equal(round.round.sponsorPool.formulaVersion, "cg_vqaf_capital_constrained_qf_v1");
  assert.equal(round.round.sponsorPool.qfAllocationPolicy, "capital_constrained_lambda_bisection_with_per_campaign_cap");
  assert.ok(round.round.sponsorPool.qfLambda > 0);
  assert.equal(round.round.sponsorPool.flywheelPolicy, "trade_surplus_funded_verified_plural_assurance");
  assert.equal(round.round.sponsorPool.flywheelPath, `/api/mpgf/sponsor-pools/${demoMpgfMatchPool.id}`);
  assert.equal(round.round.sponsorPool.depositPath, `/api/mpgf/sponsor-pools/${demoMpgfMatchPool.id}/deposits`);
  assert.equal(round.round.sponsorPool.tradeSurplusCommitPath, "/api/mpgf/trade-surplus/commit");
  assert.equal(round.round.sponsorPool.refillAutomationPolicy, MPGF_PUBLIC_GOODS_SPONSOR_POOL_REFILL_AUTOMATION_POLICY);
  assert.equal(round.round.sponsorPool.refillScheduledForRoundId, `${demoMpgfAssuranceRound.id}:next`);
  assert.equal(round.round.sponsorPool.refillAvailableForNextRoundCents, 50_000);
  assert.equal(round.round.sponsorPool.refillNoSponsorCampaignSteering, true);
  assert.ok(round.round.sponsorPool.flywheelSourceTypes.includes("donation_offset_surplus"));
  assert.ok(round.round.sponsorPool.flywheelSourceTypes.includes("trade_surplus_tithe"));
  assert.equal(persistedRoundDetail.round.id, persistedRound.id);
  assert.equal(persistedRoundDetail.round.sealedProgress.active, false);
  assert.equal(persistedRoundDetail.round.campaignCount, 1);
  assert.equal(persistedRoundDetail.round.verifiedDonorCount, 1);
  assert.equal(persistedRoundDetail.round.sponsorPool.id, demoMpgfMatchPool.id);
  assert.equal(persistedRoundDetail.round.sponsorPool.flywheelAvailableForRoundCents, 0);
  assert.equal(persistedRoundDetail.round.sponsorPool.refillAvailableForNextRoundCents, 0);
  assert.equal(persistedRoundDetail.round.contributionFlow?.pledgeIntentPath, `/api/mpgf/rounds/${persistedRound.id}/pledge-intents`);
  assert.equal(persistedRoundDetail.round.ecmRulebook.reportPath, `/api/mpgf/rounds/${persistedRound.id}/rulebook`);
  assert.equal(persistedRoundDetail.round.ecmRulebook.escrowClaimAllowed, false);
  assert.equal(persistedRoundDetail.round.cgVqaf?.reportPath, `/api/mpgf/rounds/${persistedRound.id}/cg-vqaf`);
  assert.equal(
    persistedRoundDetail.round.cgVqaf?.commonGroundDiscoveryPath,
    `/api/mpgf/rounds/${persistedRound.id}/common-ground-discovery`,
  );
  assert.equal(persistedRoundDetail.round.cgVqaf?.noGlobalMoralRanking, true);
  assert.equal(
    persistedRoundDetail.round.coalitionRouting.reportPath,
    `/api/mpgf/rounds/${persistedRound.id}/coalition-routing`,
  );
  assert.equal(persistedRoundDetail.round.coalitionRouting.candidateCount, 1);
  assert.equal(persistedRoundDetail.round.coalitionRouting.weakSupportBudgetCents, 0);
  assert.equal(persistedRoundDetail.round.coalitionRouting.publicAggregationOnly, true);
  assert.equal(
    persistedRoundDetail.round.identityIntegrity?.reportPath,
    `/api/mpgf/rounds/${persistedRound.id}/identity-integrity`,
  );
  assert.equal(
    persistedRoundDetail.round.thresholdCalibration?.reportPath,
    `/api/mpgf/rounds/${persistedRound.id}/threshold-calibration`,
  );
  assert.equal(persistedRoundDetail.round.postmortem?.reportPath, `/api/mpgf/rounds/${persistedRound.id}/postmortem`);
  assert.equal(persistedRoundDetail.round.finalization.proofPath, `/api/mpgf/rounds/${persistedRound.id}/proof`);
  assert.ok(campaigns);
  assert.equal(campaigns.sealedProgress.active, true);
  assert.equal(campaigns.campaigns.length, demoMpgfPublicGoodsCampaigns.length);
  assert.ok(campaigns.campaigns.every((campaign) => campaign.milestoneSchedule.length === 3));
  assert.ok(campaigns.campaigns.every((campaign) => campaign.thresholdPassed === null));
  assert.ok(campaigns.campaigns.every((campaign) => campaign.verifiedDonorCount === null));
  assert.ok(campaigns.campaigns.every((campaign) => campaign.directEligibleCents === null));
  assert.equal(persistedCampaigns.roundId, persistedRound.id);
  assert.equal(persistedCampaigns.sealedProgress.active, false);
  assert.equal(persistedCampaigns.campaigns.length, 1);
  assert.equal(persistedCampaigns.campaigns[0]?.campaignId, persistedCampaign.id);
  assert.equal(persistedCampaigns.campaigns[0]?.verifiedDonorCount, 1);
  assert.equal(persistedCampaigns.campaigns[0]?.thresholdPassed, true);
  assert.equal(persistedCampaigns.campaigns[0]?.matchEstimateCents != null, true);
  assert.ok(detail);
  assert.equal(detail.campaign.proofPath, `/mpgf/pools/${detail.campaign.slug}`);
  assert.equal(detail.campaign.proofPathApiPath, `/api/mpgf/campaigns/${detail.campaign.slug}/proof-path`);
  assert.equal(detail.campaign.campaignPath, `/mpgf/campaigns/${detail.campaign.slug}`);
  assert.equal(detail.campaign.incidentState, "clear");
  assert.equal(detail.campaign.appealState, "none");
  assert.equal(detail.campaign.destinationProof.destinationRef.includes("Demo"), true);
  assert.equal("supporterReason" in detail.campaign, false);
  assert.equal("userId" in detail.campaign, false);
  assert.ok(proofPath);
  assert.equal(proofPath.privacyPolicy, MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY);
  assert.equal(proofPath.proofPathPolicy, "aggregate_campaign_proof_no_private_donor_rows_or_receipt_urls");
  assert.equal(proofPath.proofPath, detail.campaign.proofPath);
  assert.equal(proofPath.roundProofPath, `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/proof`);
  assert.equal(proofPath.roundHashPath, `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/hash`);
  assert.equal(proofPath.privateRowsExcluded, true);
  assert.match(proofPath.aggregateProof.sourceContributionDigest, /^sha256:/);
  assert.match(proofPath.calcHash, /^sha256:/);
  assert.ok(preview);
  assert.equal(preview.cacheControl, MPGF_PUBLIC_GOODS_API_CACHE_CONTROL);
  assert.equal(preview.final, false);
  assert.equal(preview.incidentFreezePolicy, "hide_mutable_match_preview_until_resolved");
  assert.equal(preview.formulaVersion, "cg_vqaf_capital_constrained_qf_v1");
  assert.equal(preview.qfAllocationPolicy, "capital_constrained_lambda_bisection_with_per_campaign_cap");
  assert.ok(preview.qfLambda > 0);
  assert.match(preview.calcHash, /^sha256:/);
  assert.equal(preview.sealedProgress.active, true);
  assert.ok(preview.rows.every((row) => row.verifiedDonorCount === null));
  assert.ok(preview.rows.every((row) => row.directEligibleCents === null));
  assert.ok(preview.rows.every((row) => row.estimatedMatchCents === null));
  assert.ok(preview.rows.every((row) => row.blockers.includes("sealed_progress_match_preview_hidden_until_close")));
  assert.equal(persistedPreview.roundId, persistedRound.id);
  assert.equal(persistedPreview.sealedProgress.active, false);
  assert.equal(persistedPreview.rows.length, 1);
  assert.equal(persistedPreview.rows[0]?.campaignId, persistedCampaign.id);
  assert.equal(persistedPreview.rows[0]?.verifiedDonorCount, 1);
  assert.equal(persistedPreview.rows[0]?.estimatedMatchCents != null, true);
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
  assert.equal(allocations.final, false);
  assert.equal(allocations.sealedProgress.active, true);
  assert.equal(
    allocations.regenerationPolicy,
    "allocation_report_regenerates_from_underlying_contribution_records_collapsed_by_identity",
  );
  assert.equal(allocations.formulaVersion, "cg_vqaf_capital_constrained_qf_v1");
  assert.equal(allocations.qfAllocationPolicy, "capital_constrained_lambda_bisection_with_per_campaign_cap");
  assert.ok(allocations.qfLambda > 0);
  assert.equal(allocations.qfBonusAllocatedCents, null);
  assert.equal(allocations.totalPayoutCents, null);
  assert.ok(allocations.rows.every((row) => row.custodyMode === "no_custody_external_handoff"));
  const allocationReportRow = allocations.rows.find((row) => row.campaignId === "campaign-animal-welfare-transition");
  assert.ok(allocationReportRow);
  assert.match(allocationReportRow.sourceContributionDigest, /^sha256:/);
  assert.equal(allocationReportRow.regeneratedFromContributionRecords, true);
  assert.equal(allocationReportRow.verifiedDonorCount, null);
  assert.equal(allocationReportRow.uniqueCountedIdentityCount, null);
  assert.equal(allocationReportRow.rawPaymentObjectCount, null);
  assert.equal(persistedAllocationReport.roundId, persistedRound.id);
  assert.equal(persistedAllocationReport.final, true);
  assert.equal(persistedAllocationReport.sealedProgress.active, false);
  assert.equal(persistedAllocationReport.rows.length, 1);
  assert.equal(persistedAllocationReport.rows[0]?.campaignId, persistedCampaign.id);
  assert.equal(persistedAllocationReport.rows[0]?.verifiedDonorCount, 1);
  assert.equal(persistedAllocationReport.rows[0]?.regeneratedFromContributionRecords, true);
  assert.match(persistedAllocationReport.rows[0]?.sourceContributionDigest ?? "", /^sha256:/);
  assert.ok(identityIntegrity);
  assert.equal(identityIntegrity.policy, MPGF_PUBLIC_GOODS_IDENTITY_INTEGRITY_POLICY);
  assert.equal(identityIntegrity.noMoralReputationWeighting, true);
  assert.equal(getMpgfPublicGoodsIdentityIntegrityReportApi("unknown-round"), null);
  assert.ok(thresholdCalibration);
  assert.equal(thresholdCalibration.policy, MPGF_PUBLIC_GOODS_THRESHOLD_CALIBRATION_POLICY);
  assert.equal(thresholdCalibration.currentRoundMutationAllowed, false);
  assert.equal(getMpgfPublicGoodsThresholdCalibrationReportApi("unknown-round"), null);
  assert.ok(postmortem);
  assert.equal(postmortem.policy, MPGF_PUBLIC_GOODS_POSTMORTEM_POLICY);
  assert.equal(postmortem.currentRoundMutationAllowed, false);
  assert.equal(getMpgfPublicGoodsPostmortemReportApi("unknown-round"), null);
  assert.equal(ledger.ledgerPolicy, "public_aggregate_no_donor_rows_no_receipt_urls");
  assert.equal(ledger.cacheControl, MPGF_PUBLIC_GOODS_API_CACHE_CONTROL);
  assert.ok(ledger.rows.every((row) => row.releasedTotalCents === 0));
  assert.equal(getMpgfPublicGoodsRoundApi("unknown-round"), null);
  assert.equal(getMpgfPublicGoodsCampaignApi("unknown-campaign"), null);
  assert.equal(getMpgfPublicGoodsCampaignProofPathApi("unknown-campaign"), null);
  assert.equal(getMpgfPublicGoodsMatchPreviewApi("unknown-round"), null);
  assert.equal(getMpgfPublicGoodsAllocationReportApi("unknown-round"), null);

  const publicApiJson = JSON.stringify({
    rounds,
    round,
    campaigns,
    detail,
    proofPath,
    preview,
    allocations,
    identityIntegrity,
    thresholdCalibration,
    postmortem,
    ledger,
  });

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
    ["src/app/api/mpgf/rounds/[roundId]/rulebook/route.ts", /getMpgfPublicGoodsEcmRulebookReportApi/],
    ["src/app/api/mpgf/rounds/[roundId]/cg-vqaf/route.ts", /getMpgfPublicGoodsCgVqafReportApi/],
    ["src/app/api/mpgf/rounds/[roundId]/coalition-routing/route.ts", /getMpgfPublicGoodsCoalitionRoutingReportApi/],
    ["src/app/api/mpgf/rounds/[roundId]/common-ground-budget-preview/route.ts", /buildMpgfCommonGroundBudgetPreview/],
    ["src/app/api/mpgf/rounds/[roundId]/identity-integrity/route.ts", /getMpgfPublicGoodsIdentityIntegrityReportApi/],
    ["src/app/api/mpgf/rounds/[roundId]/threshold-calibration/route.ts", /getMpgfPublicGoodsThresholdCalibrationReportApi/],
    ["src/app/api/mpgf/rounds/[roundId]/postmortem/route.ts", /getMpgfPublicGoodsPostmortemReportApi/],
    ["src/app/api/mpgf/rounds/[roundId]/support-signals/route.ts", /createMpgfPublicGoodsSupportSignal/],
    ["src/app/api/mpgf/campaigns/[campaignId]/route.ts", /getMpgfPublicGoodsCampaignApi/],
    ["src/app/api/mpgf/campaigns/[campaignId]/proof-path/route.ts", /getMpgfPublicGoodsCampaignProofPathApi/],
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
    ["src/app/api/mpgf/governance/ballots/route.ts", /submitMpgfPhaseOneBallot/],
    ["src/app/api/mpgf/governance/results/route.ts", /loadMpgfPhaseOneGovernanceState/],
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

  const matchPreviewRoute = readFileSync("src/app/api/mpgf/rounds/[roundId]/match-preview/route.ts", "utf8");
  const allocationsRoute = readFileSync("src/app/api/mpgf/rounds/[roundId]/allocations/route.ts", "utf8");
  const roundCampaignsRoute = readFileSync("src/app/api/mpgf/rounds/[roundId]/campaigns/route.ts", "utf8");
  const roundRoute = readFileSync("src/app/api/mpgf/rounds/[roundId]/route.ts", "utf8");
  const coalitionRoute = readFileSync("src/app/api/mpgf/rounds/[roundId]/coalition-routing/route.ts", "utf8");

  assert.match(roundRoute, /buildMpgfPublicGoodsRoundApi/);
  assert.match(roundRoute, /loadMpgfPublicGoodsAllocationContext/);
  assert.match(roundRoute, /loadMpgfPublicGoodsAllocationContributionRecords/);
  assert.match(roundRoute, /loadMpgfPublicGoodsSupportSignalsForRound/);
  assert.match(roundRoute, /contextLoad\.source === "database_round_context"/);
  assert.match(roundRoute, /allocationContextSource/);
  assert.match(roundRoute, /contributionSource/);
  assert.match(roundRoute, /supportSignalSource/);
  assert.match(roundRoute, /Could not load persisted MPGF round state/);
  assert.match(coalitionRoute, /buildMpgfPublicGoodsCoalitionRoutingReport/);
  assert.match(coalitionRoute, /loadMpgfPublicGoodsAllocationContext/);
  assert.match(coalitionRoute, /loadMpgfPublicGoodsAllocationContributionRecords/);
  assert.match(coalitionRoute, /loadMpgfPublicGoodsSupportSignalsForRound/);
  assert.match(coalitionRoute, /contextLoad\.source === "database_round_context"/);
  assert.match(coalitionRoute, /allocationContextSource/);
  assert.match(coalitionRoute, /contributionSource/);
  assert.match(coalitionRoute, /supportSignalSource/);
  assert.match(coalitionRoute, /Could not load persisted MPGF coalition-routing state/);
  assert.match(roundCampaignsRoute, /buildMpgfPublicGoodsCampaignsApi/);
  assert.match(roundCampaignsRoute, /loadMpgfPublicGoodsAllocationContext/);
  assert.match(roundCampaignsRoute, /loadMpgfPublicGoodsAllocationContributionRecords/);
  assert.match(roundCampaignsRoute, /contextLoad\.source === "database_round_context"/);
  assert.match(roundCampaignsRoute, /allocationContextSource/);
  assert.match(roundCampaignsRoute, /contributionSource/);
  assert.match(roundCampaignsRoute, /Could not load persisted MPGF round campaigns state/);
  assert.match(matchPreviewRoute, /buildMpgfPublicGoodsMatchPreviewApi/);
  assert.match(matchPreviewRoute, /loadMpgfPublicGoodsAllocationContext/);
  assert.match(matchPreviewRoute, /loadMpgfPublicGoodsAllocationContributionRecords/);
  assert.match(matchPreviewRoute, /contextLoad\.source === "database_round_context"/);
  assert.match(matchPreviewRoute, /allocationContextSource/);
  assert.match(matchPreviewRoute, /contributionSource/);
  assert.match(matchPreviewRoute, /Could not load persisted MPGF match preview state/);
  assert.match(allocationsRoute, /buildMpgfPublicGoodsAllocationReportApi/);
  assert.match(allocationsRoute, /loadMpgfPublicGoodsAllocationContext/);
  assert.match(allocationsRoute, /loadMpgfPublicGoodsAllocationContributionRecords/);
  assert.match(allocationsRoute, /contextLoad\.source === "database_round_context"/);
  assert.match(allocationsRoute, /allocationContextSource/);
  assert.match(allocationsRoute, /contributionSource/);
  assert.match(allocationsRoute, /Could not load persisted MPGF allocation report state/);

  const roundPage = readFileSync("src/app/mpgf/rounds/[roundId]/page.tsx", "utf8");
  const campaignPage = readFileSync("src/app/mpgf/campaigns/[campaignId]/page.tsx", "utf8");
  const contributionModal = readFileSync("src/components/mpgf/mpgf-contribution-modal.tsx", "utf8");
  const realMoneyCheckout = readFileSync("src/lib/mpgf/real-money.ts", "utf8");
  const mpgfHubPage = readFileSync("src/app/mpgf/page.tsx", "utf8");
  const roundBoardComponent = readFileSync("src/components/mpgf/mpgf-round-board.tsx", "utf8");

  for (const expected of [
    /Sponsor-pool size/,
    /Round closes/,
    /Verified donors/,
    /Direct contributions/,
    /Verified direct contributions/,
    /Verified supporters/,
    /Campaign unlock board/,
    /Above-the-fold campaign unlock metrics/,
    /top campaign funding metrics/,
    /Base match if backed and gates pass/,
    /Base match if cleared/,
    /Estimated bonus range/,
    /MpgfSupportSignalPanel/,
    /getMpgfPublicGoodsCgVqafReportApi/,
    /getMpgfPublicGoodsIdentityIntegrityReportApi/,
    /Identity and sybil integrity/,
    /Moral reputation never affects allocation power/,
    /aggregate identity-integrity report/,
    /Threshold status/,
    /Estimated match/,
    /Final match/,
    /sealedProgressActive/,
    /sealedProgressText/,
    /round\.countdownSeconds > 0/,
    /Threshold \{sealedThresholdStatus\(sealedProgressActive, publicBoolean\(campaign\.thresholdPassed\)\)\}/,
    /value=\{sealedProgressActive \? 0 : Math\.min\(publicNumber\(campaign\.directEligibleCents\), campaign\.thresholdAmountCents\)\}/,
    /Exact live threshold, counterparty-volume, common-ground signal, and success-without-me/,
    /Public exact aggregates appear only\s+after close in final reports or audit bundles/,
    /Evidence and destination proof/,
    /Campaign page/,
    /Appeal or dissent note/,
    /milestoneSchedule/,
    /getMpgfPublicGoodsMatchPreviewApi/,
    /getMpgfPublicGoodsAllocationReportApi/,
  ]) {
    assert.match(roundPage, expected);
  }
  const unlockBoardIndex = roundPage.indexOf('aria-label="Above-the-fold campaign unlock metrics"');
  const roundStatusIndex = roundPage.indexOf('aria-label="Round status"');

  assert.ok(unlockBoardIndex >= 0);
  assert.ok(roundStatusIndex > unlockBoardIndex);

  assert.match(roundPage, /MpgfContributionModal/);
  for (const expected of [
    /Direct total/,
    /Counted total/,
    /Match estimate/,
    /Donor count/,
    /Threshold flags/,
    /sealedProgressActive/,
    /sealed until close/,
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
    /1\. Fast route/,
    /2\. Saved commitment/,
    /3\. Manual proof fallback/,
    /Every\.org Donate Link/,
    /pending webhook import/,
    /Stripe SetupIntent first/,
    /saved, not charged/,
    /reviewed manual evidence/,
    /Contribution amount/,
    /Campaign/,
    /Count my gift for matching up to cap/,
    /Fast route first/,
    /Saved commitment/,
    /\/api\/mpgf\/every-org\/donate-link/,
    /\/api\/mpgf\/stripe\/setup-intent/,
    /\/api\/funnel-events/,
    /donation_route_clicked/,
    /evidence_submission_started/,
    /mpgf_contribution_route/,
    /Open manual proof fallback/,
    /If verified/,
    /Sealed threshold impact/,
    /Exact gaps and success-without-me status stay sealed before close/,
    /Published rules; exact live status sealed before close/,
    /perDonorCapCents/,
    /countForMatching/,
    /campaignId/,
  ]) {
    assert.match(contributionModal, expected);
  }
  assert.doesNotMatch(contributionModal, /\/api\/mpgf\/contributions\/checkout-session/);
  assert.doesNotMatch(contributionModal, /\/api\/mpgf\/contributions\/subscription-session/);
  assert.ok(contributionModal.indexOf("1. Fast route") < contributionModal.indexOf("2. Saved commitment"));
  assert.ok(contributionModal.indexOf("2. Saved commitment") < contributionModal.indexOf("3. Manual proof fallback"));
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
  assert.match(mpgfHubPage, /title="Common Ground Budget"/);
  assert.match(mpgfHubPage, /Build a Common Ground Budget/);
  assert.match(mpgfHubPage, /One budget, explicit stances, gate-cleared funding/);
  assert.match(mpgfHubPage, /Choose a maximum budget/);
  assert.match(mpgfHubPage, /State project preferences/);
  assert.match(mpgfHubPage, /Review the frozen terms/);
  assert.match(mpgfHubPage, /Clear only after gates pass/);
  assert.match(mpgfHubPage, /A preview is not a contribution, charge, match, payout, or certificate/);
  assert.match(mpgfHubPage, /Moral Trade does not hold participant funds or provide legal escrow/);
  assert.match(mpgfHubPage, /Project support requires an active fiscal sponsor/);
  assert.match(mpgfHubPage, /External payment evidence shows that a transaction occurred/);
  assert.match(mpgfHubPage, /Projects do not clear while threshold, review, challenge, destination, authorization, or settlement blockers remain/);
  assert.match(mpgfHubPage, /Public progress may remain sealed before close/);
  assert.equal(mpgfHubPage.includes("Start conditional contribution"), false);
  assert.match(roundBoardComponent, /Your choice/);
  assert.match(roundBoardComponent, /Your maximum/);
  assert.match(roundBoardComponent, /Deployment mode: capped pilot/);
  assert.equal(mpgfHubPage.includes("status.verifiedSupporterCount"), false);
  assert.equal(mpgfHubPage.includes("status.amountProgressBps"), false);
  assert.match(mpgfHubPage, /Threshold, identity, review, challenge, destination, external-payment, and evidence checks must pass/);
});

test("MPGF contribution intents verify identity before conditional payment authorization", () => {
  const contributionFlow = getMpgfPublicGoodsContributionFlowApi(demoMpgfAssuranceRound.id);
  const unknownFlow = getMpgfPublicGoodsContributionFlowApi("unknown-round");
  const intent = createMpgfPublicGoodsPledgeIntent({
    campaignId: demoMpgfPublicGoodsCampaigns[0]?.id ?? "",
    userId: "demo-contributor-private-user",
    amountCents: 12_500,
    acceptableCounterpartBuckets: ["animal-welfare", "existential-risk"],
    minimumCounterpartyClearedCents: 7_500,
    paymentMode: "stripe_setup_intent_saved_commitment",
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
  const contributionPersistence = readFileSync("src/lib/mpgf/public-goods-contribution-persistence.ts", "utf8");
  const manualAliasRoute = readFileSync("src/app/api/mpgf/evidence/manual/route.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260531_mpgf_contribution_intents.sql", "utf8");
  const schemaSql = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");
  const contributionPage = readFileSync("src/app/mpgf/contribute/page.tsx", "utf8");
  const consoleSource = readFileSync("src/components/mpgf/mpgf-console.tsx", "utf8");
  const contributionModal = readFileSync("src/components/mpgf/mpgf-contribution-modal.tsx", "utf8");
  const fastRouteIndex = consoleSource.indexOf("1. Every.org fast route");
  const savedCommitmentIndex = consoleSource.indexOf("2. Saved commitment");
  const manualProofIndex = consoleSource.indexOf("3. Manual proof fallback");
  const modalFastRouteIndex = contributionModal.indexOf("1. Fast route");
  const modalSavedCommitmentIndex = contributionModal.indexOf("2. Saved commitment");
  const modalManualProofIndex = contributionModal.indexOf("3. Manual proof fallback");

  assert.ok(contributionFlow);
  assert.equal(unknownFlow, null);
  assert.equal(contributionFlow.primaryFlow, MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_FLOW);
  assert.equal(contributionFlow.privacyPolicy, MPGF_PUBLIC_GOODS_CONTRIBUTION_INTENT_PRIVACY_POLICY);
  assert.equal(contributionFlow.defaultContributionMode, "every_org_fast_route");
  assert.equal(contributionFlow.crossViewClearancePolicy, MPGF_PUBLIC_GOODS_CROSS_VIEW_CLEARANCE_POLICY);
  assert.equal(contributionFlow.donorExposureDisclosurePolicy, MPGF_PUBLIC_GOODS_DONOR_EXPOSURE_DISCLOSURE_POLICY);
  assert.deepEqual(
    contributionFlow.modeOrder.map((mode) => mode.mode),
    ["every_org_fast_route", "stripe_setup_intent_saved_commitment", "manual_proof_fallback"],
  );
  assert.match(contributionFlow.savedCommitmentPolicy, /setup_intent_first/);
  assert.ok(contributionFlow.guarantees.some((guarantee) => /Every\.org fast-route/.test(guarantee)));
  assert.ok(contributionFlow.guarantees.some((guarantee) => /SetupIntent-first/.test(guarantee)));
  assert.deepEqual(contributionFlow.stateObjects, [
    "pledge_intent",
    "conditional_pledge",
    "cross_view_intent_terms",
    "identity_verification",
    "payment_authorization",
    "provider_payment_event",
    "every_org_partner_webhook_event",
    "stripe_setup_intent_saved_commitment",
    "stripe_conditional_payment_intent_after_gates",
  ]);
  assert.equal(contributionFlow.everyOrgDonateLinkPath, "/api/mpgf/every-org/donate-link");
  assert.equal(contributionFlow.everyOrgPartnerWebhookPath, "/api/mpgf/every-org/webhook");
  assert.equal(contributionFlow.everyOrgPendingReturnPath, "/mpgf/contribute/every-org/pending");
  assert.equal(contributionFlow.stripeSetupIntentPath, "/api/mpgf/stripe/setup-intent");
  assert.equal(contributionFlow.stripeConditionalPaymentIntentPath, "/api/mpgf/stripe/conditional-payment-intents");
  assert.equal(intent.paymentState, "intent_created");
  assert.equal(intent.paymentMode, "stripe_setup_intent_saved_commitment");
  assert.equal(intent.countingState, "preview_only");
  assert.deepEqual(intent.acceptableCounterpartBuckets, ["animal-welfare", "existential-risk"]);
  assert.equal(intent.minimumCounterpartyClearedCents, 7_500);
  assert.equal(intent.counterpartDistinctBucketRequired, true);
  assert.equal(intent.maxExposureCents, 12_500);
  assert.equal(intent.crossViewClearancePolicy, MPGF_PUBLIC_GOODS_CROSS_VIEW_CLEARANCE_POLICY);
  assert.equal(intent.donorExposureDisclosurePolicy, MPGF_PUBLIC_GOODS_DONOR_EXPOSURE_DISCLOSURE_POLICY);
  assert.equal(intent.fallbackRule.roundNotClearedMode, "expire_without_charge");
  assert.equal(intent.fallbackRule.authorizationExpiredMode, "reauthorize_only_after_clearance_reconfirmed");
  assert.equal(intent.donorExposureDisclosure.maxExposureCents, 12_500);
  assert.ok(intent.donorExposureDisclosure.exactClearanceConditions.some((condition) => /distinct counterpart buckets/.test(condition)));
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
  assert.match(route, /everyOrgDonateLinkPath: "\/api\/mpgf\/every-org\/donate-link"/);
  assert.match(verifyRoute, /loadMpgfPledgeIntentForProfile/);
  assert.match(verifyRoute, /persistMpgfIdentityVerificationState/);
  assert.match(verifyRoute, /pledgeIntentSource/);
  assert.match(verifyRoute, /finalPayoutAuthorized: false/);
  assert.match(authorizeRoute, /loadMpgfPledgeIntentForProfile/);
  assert.match(authorizeRoute, /persistMpgfPaymentAuthorizationState/);
  assert.match(authorizeRoute, /providerWebhookPath: "\/api\/mpgf\/provider-events\/webhook"/);
  assert.match(providerWebhookRoute, /Missing MPGF provider event signature/);
  assert.match(providerWebhookRoute, /signatureMatches/);
  assert.match(providerWebhookRoute, /request\.text\(\)/);
  assert.match(providerWebhookRoute, /loadMpgfPaymentAuthorization/);
  assert.match(providerWebhookRoute, /persistMpgfProviderPaymentEventState/);
  assert.match(providerWebhookRoute, /finalPayoutAuthorized: false/);
  assert.match(manualAliasRoute, /contributions\/manual-evidence\/route/);
  assert.match(route, /mpgf_pledge_intents/);
  assert.match(route, /mpgf_conditional_pledges/);
  assert.match(route, /conditionalPledgeId: pledgeIntent\.id/);
  assert.match(route, /counted_cap_cents/);
  assert.match(route, /acceptableCounterpartBuckets/);
  assert.match(route, /minimumCounterpartyClearedCents/);
  assert.match(route, /donor_exposure_disclosure/);
  assert.match(route, /capture_policy: pledgeIntent\.capturePolicy/);
  assert.match(route, /status: "pledge_saved"/);
  assert.match(route, /persistence/);
  assert.match(contributionPersistence, /mpgf_identity_verifications/);
  assert.match(contributionPersistence, /mpgf_payment_authorizations/);
  assert.match(contributionPersistence, /mpgf_provider_payment_events/);
  assert.match(contributionPersistence, /payload_hash: hashRawPayload/);
  assert.match(contributionPersistence, /counting_state: input\.providerPaymentEvent\.status === "recorded" \? "eligible_pending_thresholds" : "not_counted"/);
  assert.match(migration, /create table if not exists public\.mpgf_pledge_intents/);
  assert.match(migration, /create table if not exists public\.mpgf_identity_verifications/);
  assert.match(migration, /create table if not exists public\.mpgf_payment_authorizations/);
  assert.match(migration, /create table if not exists public\.mpgf_provider_payment_events/);
  assert.match(migration, /capture_only_after_threshold_review_and_challenge_window/);
  assert.match(migration, /final_payout_authorized boolean not null default false check \(final_payout_authorized = false\)/);
  assert.match(schemaSql, /create table if not exists public\.mpgf_pledge_intents/);
  assert.match(schemaSql, /create table if not exists public\.mpgf_identity_verifications/);
  assert.match(schemaSql, /create table if not exists public\.mpgf_payment_authorizations/);
  assert.match(schemaSql, /create table if not exists public\.mpgf_provider_payment_events/);
  assert.match(schemaSql, /create table if not exists public\.mpgf_conditional_pledges/);
  assert.match(schemaSql, /acceptable_counterpart_buckets/);
  assert.match(schemaSql, /minimum_counterparty_cleared_cents/);
  assert.match(schemaSql, /donor_exposure_disclosure/);
  assert.match(schemaSql, /constraint mpgf_payment_authorizations_provider_or_manual/);
  assert.match(schemaSql, /create policy "mpgf_provider_payment_events_service_only"/);
  assert.match(schemaSql, /comment on table public\.mpgf_provider_payment_events/);
  assert.match(databaseTypes, /mpgf_pledge_intents: \{/);
  assert.match(databaseTypes, /mpgf_conditional_pledges: \{/);
  assert.match(databaseTypes, /acceptable_counterpart_buckets: string\[\]/);
  assert.match(databaseTypes, /minimum_counterparty_cleared_cents: number/);
  assert.match(databaseTypes, /mpgf_identity_verifications: \{/);
  assert.match(databaseTypes, /mpgf_payment_authorizations: \{/);
  assert.match(databaseTypes, /mpgf_provider_payment_events: \{/);
  assert.match(contributionPage, /direct-to-charity Every\.org route/);
  assert.ok(fastRouteIndex >= 0);
  assert.ok(savedCommitmentIndex > fastRouteIndex);
  assert.ok(manualProofIndex > savedCommitmentIndex);
  assert.ok(modalFastRouteIndex >= 0);
  assert.ok(modalSavedCommitmentIndex > modalFastRouteIndex);
  assert.ok(modalManualProofIndex > modalSavedCommitmentIndex);
  assert.match(consoleSource, /Open Every\.org fast route/);
  assert.match(consoleSource, /Save provider commitment/);
  assert.match(consoleSource, /Save pledge intent/);
  assert.match(consoleSource, /Acceptable counterpart buckets/);
  assert.match(consoleSource, /Minimum counterpart-cleared volume/);
  assert.match(consoleSource, /Max exposure/);
  assert.match(consoleSource, /Authorization timing/);
  assert.match(consoleSource, /Manual proof fallback/);
  assert.match(consoleSource, /id="manual-proof-fallback"/);
  assert.match(contributionModal, /\/api\/mpgf\/every-org\/donate-link/);
  assert.match(contributionModal, /\/api\/mpgf\/stripe\/setup-intent/);
  assert.match(contributionModal, /\/api\/funnel-events/);
  assert.match(contributionModal, /donation_route_clicked/);
  assert.match(contributionModal, /evidence_submission_started/);
  assert.match(contributionModal, /mpgf_contribution_route/);
  assert.match(contributionModal, /Open manual proof fallback/);
  assert.match(contributionModal, /Acceptable counterpart buckets/);
  assert.match(contributionModal, /Minimum counterpart-cleared volume/);
  assert.match(contributionModal, /Max exposure/);
  assert.match(contributionModal, /Authorization timing/);
  assert.match(contributionModal, /If verified/);
  assert.match(contributionModal, /Sealed threshold impact/);
  assert.match(contributionModal, /Exact gaps and success-without-me status stay sealed before close/);
  assert.doesNotMatch(contributionModal, /projectedDirectCents/);
  assert.doesNotMatch(contributionModal, /projectedVerifiedSupporters/);
  assert.doesNotMatch(contributionModal, /threshold would clear after provider import or evidence review/);
  assert.match(contributionModal, /#manual-proof-fallback/);
  assert.doesNotMatch(contributionModal, /checkout-session/);

  for (const forbidden of [
    "demo-contributor-private-user",
    "private-idempotency-key-001",
    "provider-private-payment-intent-001",
    "provider-private-event-001",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("MPGF CRECM v1.125 rulebook publishes custody, batch, accounting, sponsor, and consent terms", () => {
  const report = buildMpgfPublicGoodsEcmRulebookReport();
  const apiReport = getMpgfPublicGoodsEcmRulebookReportApi(demoMpgfAssuranceRound.id);
  const unknownReport = getMpgfPublicGoodsEcmRulebookReportApi("unknown-round");
  const route = readFileSync("src/app/api/mpgf/rounds/[roundId]/rulebook/route.ts", "utf8");
  const roundApi = readFileSync("src/lib/mpgf/public-goods-api.ts", "utf8");
  const roundPage = readFileSync("src/app/mpgf/rounds/[roundId]/page.tsx", "utf8");
  const rulebookSource = readFileSync("src/lib/mpgf/public-goods-ecm-rulebook.ts", "utf8");
  const schemaSql = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260604_mpgf_ecm_rulebook.sql", "utf8");
  const ecmPlusMigration = readFileSync("supabase/migrations/20260605_mpgf_ecm_plus_subsidy.sql", "utf8");

  assert.equal(report.policy, MPGF_PUBLIC_GOODS_ECM_CORE_RULEBOOK_POLICY);
  assert.equal(report.mechanism.abbreviation, "CRECM");
  assert.equal(report.mechanism.fullTechnicalLabel, "Coalition-Routed Escrowed Conditional Matching v1.125");
  assert.equal(report.mechanism.technicalLabel, "CRECM v1.125");
  assert.equal(report.mechanism.legacyMechanismLabel, "Verified Assurance Matching pilot");
  assert.equal(report.mechanism.legacyMechanismLabelContext, "legacy_demo_details_only");
  assert.equal(report.mechanism.legacyMechanismLabelBadge, "Legacy/demo label");
  assert.equal(report.mechanism.userFacingLabel, "Common Ground Budget");
  assert.equal(report.mechanism.publicFacingProductLabel, "Public Goods Fund");
  assert.deepEqual(report.mechanism.currentUserFacingHeaders, [
    "Common Ground Budget",
    "Public Goods Fund",
  ]);
  assert.deepEqual(report.mechanism.forbiddenCurrentProductLabels, [
    "external CRECM module",
    "Verified Assurance Matching",
    "moralpublicgoods102.md",
    "CRECM v1.96",
  ]);
  assert.equal(report.mechanism.sourceSpec, "moralpublicgoods131.md");
  assert.equal(report.mechanism.deploymentFlag, "crecm_v1_125");
  assert.equal(report.mechanism.featureFlag.envName, "MPGF_MECHANISM_VERSION");
  assert.equal(report.mechanism.featureFlag.enabledValue, "crecm_v1_125");
  assert.equal(report.mechanism.featureFlag.legacyPagesRemainReadable, true);
  assert.equal(report.mechanism.featureFlag.currentMpgfPagesDeleted, false);
  assert.deepEqual(getMpgfMechanismVersionFeatureFlag("crecm_v1_125"), {
    envName: "MPGF_MECHANISM_VERSION",
    enabledValue: "crecm_v1_125",
    configuredValue: "crecm_v1_125",
    crecmV1125Active: true,
    legacyPagesRemainReadable: true,
    currentMpgfPagesDeleted: false,
  });
  assert.equal(getMpgfMechanismVersionFeatureFlag("verified_assurance_matching_pilot").crecmV1125Active, false);
  assert.equal(getMpgfMechanismVersionFeatureFlag(undefined).configuredValue, "unset");
  assert.equal(getMpgfMechanismVersionFeatureFlag("crecm_v1_96").configuredValue, "unsupported");
  assert.ok(report.mechanism.notPureMechanism.includes("not_pure_ecm_without_common_ground_budget"));
  assert.equal(report.ecmPlusHybridPolicy, MPGF_PUBLIC_GOODS_ECM_PLUS_HYBRID_POLICY);
  assert.equal(report.batchCadencePolicy, MPGF_PUBLIC_GOODS_BATCH_CADENCE_POLICY);
  assert.equal(report.custodyPolicy, MPGF_PUBLIC_GOODS_CUSTODY_POLICY);
  assert.equal(report.recipientRegistryPolicy, MPGF_PUBLIC_GOODS_RECIPIENT_REGISTRY_POLICY);
  assert.equal(report.refundReroutePolicy, MPGF_PUBLIC_GOODS_REFUND_REROUTE_POLICY);
  assert.equal(report.crossViewSubsidyPolicy, MPGF_PUBLIC_GOODS_CROSS_VIEW_SUBSIDY_POLICY);
  assert.equal(report.roundRulebook.batchWindowMinDays, 7);
  assert.equal(report.roundRulebook.batchWindowMaxDays, 14);
  assert.equal(report.roundRulebook.preserveCappedQfBreadthBonus, true);
  assert.equal(report.separatedAccounting.grossFeeNetRecipientSeparated, true);
  assert.equal(report.separatedAccounting.actualCountedMatchEligibleSeparated, true);
  assert.equal(report.separatedAccounting.matchEligibleDollarsOnlyUnlockSponsorMatch, true);
  assert.equal(report.separatedAccounting.rewardsCreditsCertificatesExcludedFromPublicGoodDollars, true);
  assert.deepEqual(report.separatedAccounting.plainSettlementSummaryGroups, [
    "charged",
    "sent_to_projects",
    "counted_for_matching",
    "sponsor_added",
    "rewards_credits_certificates",
    "failed_carry_forward",
  ]);
  assert.equal(report.separatedAccounting.plainSettlementSummaryDetailsDrawerRequired, true);
  assert.equal(report.separatedAccounting.plainSettlementSummaryFinalReceiptRequired, true);
  assert.equal(report.separatedAccounting.plainSummaryCannotCombineAccountingChannels, true);
  assert.equal(report.clearingInputIntegrity.roundClosePaymentCommitmentSnapshotsRequired, true);
  assert.equal(report.clearingInputIntegrity.clearingBundleHashAndComponentHashesRequired, true);
  assert.equal(report.clearingInputIntegrity.frozenReciprocalMoralBucketSnapshotRequired, true);
  assert.equal(report.clearingInputIntegrity.bundleDerivedRowCountGuardsRequired, true);
  assert.equal(report.clearingContract.policy, "crecm_v1_125_fail_closed_round_close_clearing_contract");
  assert.equal(report.clearingContract.roundMetadataGate.canonicalUtcTimestampsRequired, true);
  assert.equal(report.clearingContract.roundMetadataGate.parameterFreezeNoLaterThanOpen, true);
  assert.equal(
    report.clearingContract.roundMetadataGate.orderedLifecycleRequired,
    "parametersFrozenAt<=opensAt<=earlyFailureBonusCutoff<=reviewFreezeAt<closesAt<challengeDeadline",
  );
  assert.equal(report.clearingContract.roundMetadataGate.locksClearingMatchingAuthorizationAndFailureBonusWhenInvalid, true);
  assert.equal(report.clearingContract.paymentCommitmentSnapshots.exactCutoffBindingRequired, true);
  assert.equal(report.clearingContract.roundClearingInputBundle.bundleHashBindsSelectedBundleId, true);
  assert.equal(report.clearingContract.deploymentAudits.shadowBindingExposureCentsAlwaysZero, true);
  assert.equal(report.clearingContract.deploymentAudits.shadowPreviewExposureCentsCanSimulateRequestedGross, true);
  assert.equal(report.clearingContract.feeQuotes.feePolicyHashBoundQuoteHashRequired, true);
  assert.equal(report.clearingContract.feeQuotes.sponsorPaidFeeSupportRequiresEligibleRoundCloseBundle, true);
  assert.deepEqual(report.clearingContract.plainLanguageGuidedMode.canonicalStanceByPlainLabel, {
    "Fund this": "strong",
    "Fund if different-view support joins": "weak",
    "Needs review": "dissent",
    Skip: "abstain",
  });
  assert.equal(report.clearingContract.plainLanguageGuidedMode.exactLabelsRequiredNoTrimOrAlias, true);
  assert.equal(report.clearingContract.plainLanguageGuidedMode.explicitSaveRequiredBeforeAllocation, true);
  assert.equal(report.clearingContract.plainLanguageGuidedMode.finalReviewMustExposeCanonicalMeaning, true);
  assert.equal(
    report.clearingContract.plainLanguageGuidedMode.advancedAndPlainModesShareCanonicalProjectSupportStanceRecords,
    true,
  );
  assert.equal(report.clearingContract.plainLanguageGuidedMode.uiBrowsingCalculatorOrSuggestionCannotInferAllocatableStance, true);
  assert.equal(report.clearingContract.projectRoundEligibilitySnapshots.sourceCutoffEqualsRoundOpen, true);
  assert.equal(report.clearingContract.projectHardGates.bindingModesRequireClearBaselineIntegrity, true);
  assert.equal(report.clearingContract.projectHardGates.bindingModesRequireHighOrMediumBaselineConfidence, true);
  assert.equal(report.clearingContract.projectHardGates.bindingModesRequireAdequateActionEvidence, true);
  assert.equal(report.clearingContract.projectHardGates.failureBonusEligibilityRequiresProjectHardGateHash, true);
  assert.deepEqual(report.clearingContract.projectIdentityRouteGate.validGoodTypes, ["consensus", "hybrid"]);
  assert.equal(report.clearingContract.projectIdentityRouteGate.usesFullMoralBucketSnapshotPredicate, true);
  assert.equal(report.clearingContract.projectIdentityRouteGate.looseBucketMembershipCannotClear, true);
  assert.equal(
    report.clearingContract.projectIdentityRouteGate.invalidFieldsBlockClearingMatchingAuthorizationPayoutAndFailureBonus,
    true,
  );
  assert.equal(report.clearingContract.moralBucketSnapshot.liveBucketDistinctnessReadsAllowed, false);
  assert.equal(report.clearingContract.sponsorBacking.filteredByRoundAndPoolType, true);
  assert.equal(report.clearingContract.authorizationReconciliation.shortExpiringAuthorizationRowsRemovedBeforeCapture, true);
  assert.equal(report.clearingContract.optimizationRunTrace.bindingStage, "stage_3_coalition_clearing");
  assert.equal(report.clearingContract.optimizationRunTrace.singleSelectedTracePerBundleVersionStageRequired, true);
  assert.equal(report.clearingContract.optimizationRunTrace.selectedAllocationRowsHashRequired, true);
  assert.equal(report.clearingContract.optimizationRunTrace.rewardCreditCertificateInputHashesRequired, true);
  assert.equal(report.clearingContract.roundAuditBundles.auditBundleHashBindsComponentHashesAndTrace, true);
  assert.equal(report.clearingContract.roundAuditBundles.optimizationTraceIdRequired, true);
  assert.equal(report.clearingContract.bonusScoreUnits.canonicalNonNegativeIntegerStringsRequired, true);
  assert.equal(report.clearingContract.bonusScoreUnits.floatingQfAdjustedMayNotDeterminePayoutCents, true);
  assert.equal(report.clearingContract.roundCloseBundleRowUniqueness.formulaLevelGuardsRequired, true);
  assert.equal(report.clearingContract.roundCloseBundleRowUniqueness.failureBonusEligibilityRequiresRowUniquenessHash, true);
  assert.equal(report.clearingContract.commonGroundBudgetInputGating.missingRowsFailClosedWithoutDereference, true);
  assert.equal(report.clearingContract.commonGroundBudgetInputGating.paymentSnapshotLookupRequiresEligibleBudget, true);
  assert.equal(report.clearingContract.supportStanceInputGating.missingOrInvalidDefaultsToAbstain, true);
  assert.equal(report.clearingContract.supportStanceInputGating.wrongRowsExposeZeroCapsAndNoCounterpartyBuckets, true);
  assert.equal(report.clearingContract.conditionalIntentInputGating.missingInactiveOrWrongRowsAllocateZero, true);
  assert.equal(report.clearingContract.conditionalIntentInputGating.fallbackRuleMustBeValidAndMatchBudget, true);
  assert.equal(report.clearingContract.stage7FallbackExecution.projectBudgetAndIntentRowsMustBeUniqueAndEligible, true);
  assert.equal(report.clearingContract.stage7FallbackExecution.executableFallbackRequiresRequestedBudgetAndIntentRuleMatch, true);
  assert.equal(report.clearingContract.stage7FallbackExecution.ineligibleFallbackFallsBackToReleaseCancelNoCaptureAndFreshConsent, true);
  assert.equal(
    report.clearingContract.counterpartyVolumeSatisfaction.thresholdSource,
    "ConditionalTradeIntent.minCounterpartyVolumeCents",
  );
  assert.equal(
    report.clearingContract.counterpartyVolumeSatisfaction.excludesSelfLinkedAccountSamePaymentClusterAndSameControlRows,
    true,
  );
  assert.equal(
    report.clearingContract.counterpartyVolumeSatisfaction.excludesSponsorPlatformFeeRewardCreditCertificateRows,
    true,
  );
  assert.equal(report.clearingContract.allocatorStateInputGating.participantRemainingBudgetKey, "(roundId,participantId)");
  assert.equal(report.clearingContract.allocatorStateInputGating.wrongRoundRowsResolveToZero, true);
  assert.equal(report.clearingContract.identityEligibilityInputGating.missingRowsResolveToZeroWeight, true);
  assert.equal(report.clearingContract.identityEligibilityInputGating.malformedWeightResolvesToZero, true);
  assert.equal(report.clearingContract.economicInputGating.roundSponsorBudgetsInvalidFieldsResolveToZero, true);
  assert.equal(report.clearingContract.economicInputGating.projectEconomicTermsMalformedBlockClearing, true);
  assert.equal(report.clearingContract.economicInputGating.projectMatchBpsRange, "[0,100000]");
  assert.equal(report.clearingContract.failClosedHelpers.minReturnsZeroOnMalformedInputs, true);
  assert.equal(report.clearingContract.failClosedHelpers.sumBigIntReturnsZeroOnMalformedInputs, true);
  assert.equal(report.clearingContract.netPublicGoodSupporterBreadth.defaultSupporterCountMinNetPublicGoodCents, 100);
  assert.equal(report.clearingContract.netPublicGoodSupporterBreadth.usesNetRecipientDisbursedPublicGoodCreditOnly, true);
  assert.equal(report.clearingContract.contributorBenefits.requireCapturedSuccessfulContributionRow, true);
  assert.equal(report.clearingContract.contributorBenefits.neverCountAsPublicGoodDollarsOrAllocationPower, true);
  assert.equal(report.clearingContract.contributorBenefits.successRewardsUseOnlyBackedSuccessRewardPool, true);
  assert.equal(
    report.clearingContract.contributorBenefits.successRewardsRejectRecipientOrDonorCapturedFundingSources,
    true,
  );
  assert.equal(report.clearingContract.contributorBenefits.platformCreditRewardTermsHashBound, true);
  assert.equal(
    report.clearingContract.contributorBenefits.platformCreditRewardsRequireLiabilityExpiryRedemptionLimitsAndSponsorBacking,
    true,
  );
  assert.equal(report.clearingContract.contributorBenefits.coordinationCreditsNonTransferable, true);
  assert.equal(report.clearingContract.contributorBenefits.impactCertificatesBindContributionBundlePaymentAndFeeContext, true);
  assert.ok(report.clearingContract.failureBonus.thresholdFamilyFailureReasonsOnly.includes("counterparty_volume_shortfall"));
  assert.equal(report.clearingContract.failureBonus.claimantConflictSnapshotBindsExactPayoutContext, true);
  assert.equal(report.clearingContract.failureBonus.claimantConflictSnapshotIdStoredOnClaims, true);
  assert.equal(report.hardGatesV1125.projectScopeState, "valid_moral_public_good");
  assert.equal(report.hardGatesV1125.excludedTradeTypeRequired, null);
  assert.equal(report.hardGatesV1125.externalityStateRequired, "clear");
  assert.equal(report.hardGatesV1125.baselineIntegrityStateRequired, "clear");
  assert.deepEqual(report.hardGatesV1125.baselineConfidenceStatesAllowed, ["high", "medium"]);
  assert.equal(report.hardGatesV1125.actionEvidenceStateRequired, "adequate");
  assert.deepEqual(report.hardGatesV1125.challengeStateAllowed, ["clear", "non_blocking"]);
  assert.equal(report.hardGatesV1125.fiscalHostConflictReviewRequired, true);
  assert.equal(report.sponsorPoolBacking.poolSpecificBackingRequired, true);
  assert.ok(report.sponsorPoolBacking.sponsorCommitmentStatesAllowed.includes("contractually_committed"));
  assert.ok(report.sponsorPoolBacking.poolTypes.includes("failure_bonus"));
  assert.equal(report.sponsorPoolBacking.phantomMatchingBlocked, true);
  assert.equal(report.batchEngine.recurringCadence, "one_to_two_week_batch_rounds");
  assert.equal(report.batchEngine.fixedCadencePublishedBeforeRoundOpen, true);
  assert.equal(report.batchEngine.longLivedRoundOpenHoldsAllowed, false);
  assert.deepEqual(report.batchEngine.stages, [
    "round_open",
    "round_close",
    "batch_clear_cross_view_conditions",
    "just_in_time_authorization_or_partner_custody",
    "recipient_verification_and_challenge_window",
    "capture_release_cancel_or_reroute",
    "audit_publication",
  ]);
  assert.equal(report.custodyAndRelease.postClearCustodialState, "awaiting_partner_or_fiscal_host_custody_confirmation");
  assert.equal(report.custodyAndRelease.escrowClaimAllowed, false);
  assert.equal(report.custodyAndRelease.releaseOnlyAfterRecipientVerification, true);
  assert.equal(report.custodyAndRelease.releaseOnlyAfterChallengeWindowCompletion, true);
  assert.ok(report.custodyAndRelease.donorFailureHandling.includes("release_authorization_if_recipient_verification_fails"));
  assert.equal(report.refundAndReroute.unmatchedBatchMode, "expire_without_charge_or_release_authorization");
  assert.equal(report.refundAndReroute.silentFailureAllowed, false);
  assert.ok(report.refundAndReroute.donorChoices.includes("refund_captured_funds_when_provider_supports"));
  assert.ok(report.refundAndReroute.donorChoices.includes("reroute_to_next_eligible_common_ground_project"));
  assert.equal(report.crossViewSubsidySchedule.appliesAfterBaseMatch, true);
  assert.equal(report.crossViewSubsidySchedule.preservesCappedQfBreadthBonus, true);
  assert.equal(report.crossViewSubsidySchedule.maxPremiumBps, 1500);
  assert.equal(report.crossViewSubsidySchedule.moralReputationCanIncreasePremium, false);
  assert.ok(report.crossViewSubsidySchedule.rows.some((row) => row.tier === "three_or_more_distinct_moral_buckets"));
  assert.equal(report.donorDisclosure.maxExposureRequiredBeforeAuthorization, true);
  assert.equal(report.donorDisclosure.counterpartBucketsRequired, true);
  assert.equal(report.donorDisclosure.minimumCounterpartyVolumeRequired, true);
  assert.equal(report.donorDisclosure.savedPaymentMethodIsNotHoldAuthorizationCustodyOrEscrow, true);
  assert.equal(report.donorDisclosure.finalReviewConsentBoundaryRequired, true);
  assert.equal(report.donorDisclosure.sealedProgressDisclosureRequired, true);
  assert.deepEqual(report.simplifiedUserFlow.steps, ["budget", "projects", "review"]);
  assert.equal(report.simplifiedUserFlow.suggestedDefaultsBindingOnlyAfterFinalReviewSave, true);
  assert.equal(report.participantIncentives.successRewardsFromBackedSponsorPoolOnly, true);
  assert.equal(report.participantIncentives.coordinationCreditsNonTransferableAndNoAllocationPower, true);
  assert.equal(report.participantIncentives.impactCertificatesForCapturedSuccessfulContributionRowsOnly, true);
  assert.equal(report.publicCopyValidation.ok, true);
  assert.equal(report.publicCopyValidation.policy, MPGF_CRECM_COPY_VALIDATION_POLICY);
  assert.deepEqual(
    report.publicCopyValidation.requiredSurfaceKinds,
    MPGF_CRECM_REQUIRED_COPY_VALIDATION_SURFACE_KINDS,
  );
  assert.deepEqual(report.publicCopyValidation.missingRequiredSurfaceKinds, []);
  assert.deepEqual(report.publicCopyValidation.surfaceKinds, [
    "primary_ui",
    "receipt",
    "public_page",
    "email",
    "audit_adjacent_summary",
  ]);
  assert.ok(report.publicCopyValidation.surfaceCount >= 6);
  assert.ok(report.failureBonusControls.thresholdFamilyFailureReasonsOnly.includes("counterparty_volume_shortfall"));
  assert.equal(report.failureBonusControls.participantRoundCapRequired, true);
  assert.equal(report.failureBonusControls.claimantConflictSnapshotMustBeNoConflict, true);
  assert.equal(report.identityAndAntiSybil.moralReputationCanIncreaseAllocationPower, false);
  assert.equal(report.identityAndAntiSybil.noGlobalMoralRanking, true);
  assert.equal(report.preservedInvariants.antiThreatAndBaselineIntegrityAreBlockingGates, true);
  assert.equal(report.preservedInvariants.immutableProvenanceForRelianceBearingChanges, true);
  assert.equal(report.recipientEligibilityRules.payableOnlyIfRegistryStatusEligible, true);
  assert.equal(report.recipientEligibilityRules.objectiveReceiptOrMilestoneEvidenceRequired, true);
  assert.equal(report.recipientEligibilityRules.taxAndDonationReceiptClaimsMustMatchPayoutRail, true);
  assert.equal(report.recipientRegistry.length, demoMpgfPublicGoodsCampaigns.length);
  assert.ok(report.recipientRegistry.every((recipient) => recipient.legalEntityOrFiscalHost));
  assert.match(report.calcHash, /^sha256:/);
  assert.ok(apiReport);
  assert.equal(apiReport.policy, report.policy);
  assert.equal(unknownReport, null);
  assert.match(route, /loadMpgfPublicGoodsAllocationContext/);
  assert.match(route, /buildMpgfPublicGoodsEcmRulebookReport/);
  assert.match(route, /MPGF CRECM rulebook report not found/);
  assert.match(route, /allocationContextSource/);
  assert.match(roundApi, /ecmRulebook/);
  assert.match(roundApi, /mechanism: ecmRulebook\.mechanism/);
  assert.match(roundApi, /separatedAccounting: ecmRulebook\.separatedAccounting/);
  assert.match(roundApi, /clearingInputIntegrity: ecmRulebook\.clearingInputIntegrity/);
  assert.match(roundApi, /clearingContract: ecmRulebook\.clearingContract/);
  assert.match(roundApi, /hardGatesV1125: ecmRulebook\.hardGatesV1125/);
  assert.match(roundApi, /sponsorPoolBacking: ecmRulebook\.sponsorPoolBacking/);
  assert.match(roundApi, /publicCopyValidation: ecmRulebook\.publicCopyValidation/);
  assert.match(roundApi, /failureBonusControls: ecmRulebook\.failureBonusControls/);
  assert.match(roundApi, /recipientRegistryCount/);
  assert.match(roundPage, /ecmRulebook\.mechanism\.technicalLabel/);
  assert.match(roundPage, /moral public goods safeguards/);
  assert.match(roundPage, /Batch cadence/);
  assert.match(roundPage, /Payment snapshot/);
  assert.match(roundPage, /Clearing contract/);
  assert.match(roundPage, /bundle id, cutoff, and component hashes bound/);
  assert.match(roundPage, /Audit trace/);
  assert.match(roundPage, /fee quotes and selected allocation rows are hash-bound/);
  assert.match(roundPage, /Contributor benefits/);
  assert.match(roundPage, /reward, credit, and certificate lanes stay separate/);
  assert.match(roundPage, /actual, counted, and match-eligible dollars separated/);
  assert.match(roundPage, /Copy validation/);
  assert.match(roundPage, /pool-specific and precommitted/);
  assert.match(roundPage, /Cross-view premium/);
  assert.match(roundPage, /Fallback outcome/);
  assert.match(roundPage, /counterpart-bucket conditions/);
  assert.match(roundPage, /CRECM rulebook report/);
  assert.match(rulebookSource, /validateMpgfCrecPublishedCopyBundle/);
  assert.match(schemaSql, /create table if not exists public\.mpgf_round_rulebooks/);
  assert.match(schemaSql, /ecm_plus_hybrid_policy/);
  assert.match(schemaSql, /batch_interval_min_days integer not null default 7/);
  assert.match(schemaSql, /cross_view_subsidy_schedule jsonb not null/);
  assert.match(schemaSql, /create table if not exists public\.mpgf_recipient_registry/);
  assert.match(schemaSql, /create table if not exists public\.mpgf_custody_holds/);
  assert.match(schemaSql, /moral_reputation_can_increase_allocation_power boolean not null default false/);
  assert.match(databaseTypes, /mpgf_round_rulebooks/);
  assert.match(databaseTypes, /mpgf_recipient_registry/);
  assert.match(databaseTypes, /mpgf_custody_holds/);
  assert.match(migration, /alter table public\.mpgf_pledge_intents/);
  assert.match(migration, /acceptable_counterpart_buckets/);
  assert.match(migration, /public\.mpgf_custody_holds/);
  assert.match(migration, /escrow_claim_allowed boolean not null default false/);
  assert.match(ecmPlusMigration, /ecm_plus_hybrid_policy/);
  assert.match(ecmPlusMigration, /refund_reroute_policy/);
  assert.match(ecmPlusMigration, /cross_view_subsidy_schedule/);
});

test("MPGF Every.org fast route creates Donate Links and imports partner webhooks without custody", () => {
  const donateLink = buildMpgfEveryOrgDonateLink({
    campaignId: "campaign-global-health-basic-needs",
    userRef: "private-every-org-user-001",
    pledgeIntentId: "pledge-intent-private-every-org-001",
    amountCents: 12_500,
    webhookToken: "public-webhook-token-demo",
  });
  const unclaimedDonateLink = buildMpgfEveryOrgDonateLink({
    campaignId: "campaign-animal-welfare-transition",
    amountCents: 5_000,
  });
  const donateUrl = new URL(donateLink.href.split("#")[0] ?? donateLink.href);
  const encodedMetadata = donateUrl.searchParams.get("partner_metadata") ?? "";
  const decodedMetadata = JSON.parse(Buffer.from(encodedMetadata, "base64").toString("utf8")) as Record<string, unknown>;
  const importedWebhook = recordMpgfEveryOrgPartnerWebhook(
    {
      chargeId: "every-org-private-charge-001",
      partnerDonationId: donateLink.partnerDonationId,
      partnerMetadata: donateLink.partnerMetadata,
      toNonprofit: {
        slug: "givewell-top-charities-fund",
        ein: "000000001",
        name: "GiveWell Top Charities Fund",
      },
      amount: "125.00",
      netAmount: "121.25",
      currency: "USD",
      frequency: "One-time",
      donationDate: "2026-06-01T12:03:00.000Z",
      paymentMethod: "card",
      firstName: "Jane",
      email: "jane@example.org",
      privateNote: "private donor note",
    },
    {
      webhookVerified: true,
      receivedAt: "2026-06-01T12:04:00.000Z",
    },
  );
  const unverifiedWebhook = recordMpgfEveryOrgPartnerWebhook(
    {
      chargeId: "every-org-private-charge-002",
      partnerDonationId: unclaimedDonateLink.partnerDonationId,
      partnerMetadata: unclaimedDonateLink.partnerMetadata,
      toNonprofit: {
        slug: "animalcharityevaluators",
        name: "Animal Charity Evaluators",
      },
      amount: "50.00",
      currency: "USD",
    },
    {
      webhookVerified: false,
    },
  );
  const fixtureRecordedPayload = JSON.parse(
    readFileSync("tests/fixtures/mpgf/every-org/partner-webhook-recorded.json", "utf8"),
  ) as MpgfEveryOrgPartnerWebhookPayload;
  const fixtureNeedsReviewPayload = JSON.parse(
    readFileSync("tests/fixtures/mpgf/every-org/partner-webhook-needs-review.json", "utf8"),
  ) as MpgfEveryOrgPartnerWebhookPayload;
  const fixtureRecordedWebhook = recordMpgfEveryOrgPartnerWebhook(fixtureRecordedPayload, {
    webhookVerified: true,
    receivedAt: "2026-06-01T12:07:00.000Z",
  });
  const fixtureNeedsReviewWebhook = recordMpgfEveryOrgPartnerWebhook(fixtureNeedsReviewPayload, {
    webhookVerified: true,
    receivedAt: "2026-06-01T12:08:00.000Z",
  });
  const serialized = JSON.stringify({
    donateLink,
    fixtureNeedsReviewWebhook,
    fixtureRecordedWebhook,
    importedWebhook,
    unclaimedDonateLink,
    unverifiedWebhook,
  });
  const donateLinkRoute = readFileSync("src/app/api/mpgf/every-org/donate-link/route.ts", "utf8");
  const webhookRoute = readFileSync("src/app/api/mpgf/every-org/webhook/route.ts", "utf8");
  const pendingPage = readFileSync("src/app/mpgf/contribute/every-org/pending/page.tsx", "utf8");
  const pageFrame = readFileSync("src/components/mpgf/mpgf-page-frame.tsx", "utf8");
  const migration = readFileSync("supabase/migrations/20260601_mpgf_every_org_fast_route.sql", "utf8");
  const evidenceMigration = readFileSync("supabase/migrations/20260601_mpgf_every_org_evidence_records.sql", "utf8");
  const schemaSql = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");
  const proofSource = readFileSync("src/lib/mpgf/public-goods-proof.ts", "utf8");
  const kpiSource = readFileSync("src/lib/mpgf/public-goods-kpis.ts", "utf8");
  const donatePageSource = readFileSync("src/app/donate/page.tsx", "utf8");
  const donateConfirmPageSource = readFileSync("src/app/donate/confirm/page.tsx", "utf8");
  const howItWorksSource = readFileSync("src/app/how-it-works/page.tsx", "utf8");
  const siteSearchSource = readFileSync("src/lib/site-search.ts", "utf8");
  const visitorPathsSource = readFileSync("src/lib/visitor-paths.ts", "utf8");

  assert.equal(donateLink.policy, MPGF_PUBLIC_GOODS_EVERY_ORG_FAST_ROUTE_POLICY);
  assert.equal(donateLink.privacyPolicy, MPGF_PUBLIC_GOODS_EVERY_ORG_PRIVACY_POLICY);
  assert.equal(donateLink.custodyMode, "non_custodial_every_org_or_partner_held");
  assert.equal(donateLink.redirectState, "pending_webhook_not_counted");
  assert.equal(donateLink.webhookRequiredBeforeCounting, true);
  assert.equal(donateLink.reviewRequiredBeforeCounting, true);
  assert.equal(donateLink.finalPayoutAuthorized, false);
  assert.equal(donateLink.webhookTokenIncluded, true);
  assert.match(donateLink.partnerDonationId, /^mpgf_/);
  assert.match(donateLink.partnerDonationIdHash, /^sha256:/);
  assert.match(donateLink.calcHash, /^sha256:/);
  assert.equal(donateUrl.searchParams.get("partner_donation_id"), donateLink.partnerDonationId);
  assert.equal(donateUrl.searchParams.get("frequency"), "ONCE");
  assert.equal(donateUrl.searchParams.get("amount"), "125.00");
  assert.ok(donateUrl.searchParams.get("success_url")?.includes("/mpgf/contribute/every-org/pending"));
  assert.equal(decodedMetadata.schema, "mpgf_every_org_partner_metadata_v1");
  assert.equal(decodedMetadata.policy, MPGF_PUBLIC_GOODS_EVERY_ORG_FAST_ROUTE_POLICY);
  assert.equal(decodedMetadata.roundId, demoMpgfAssuranceRound.id);
  assert.equal(decodedMetadata.campaignId, "campaign-global-health-basic-needs");
  assert.equal(decodedMetadata.redirectState, "pending_webhook_not_counted");
  assert.equal(decodedMetadata.noPlatformCustody, true);
  assert.equal(decodedMetadata.noGlobalMoralRanking, true);
  assert.match(String(decodedMetadata.contributorRefHash), /^sha256:/);
  assert.equal(unclaimedDonateLink.partnerMetadata.contributorRefHash, undefined);
  assert.equal(importedWebhook.provider, "every_org");
  assert.equal(importedWebhook.status, "recorded");
  assert.equal(importedWebhook.structureVerified, true);
  assert.equal(importedWebhook.webhookVerified, true);
  assert.equal(importedWebhook.autoCreatesContributionEvidence, true);
  assert.equal(importedWebhook.reviewRequiredBeforeCounting, true);
  assert.equal(importedWebhook.finalPayoutAuthorized, false);
  assert.equal(importedWebhook.evidenceRecord.reviewState, "pending_review");
  assert.equal(importedWebhook.evidenceRecord.countingState, "pending_review_not_counted");
  assert.equal(importedWebhook.webhookArrivedBeforeSignIn, false);
  assert.equal(importedWebhook.amountCents, 12_500);
  assert.equal(importedWebhook.netAmountCents, 12_125);
  assert.match(importedWebhook.chargeIdHash, /^sha256:/);
  assert.match(importedWebhook.partnerDonationIdHash ?? "", /^sha256:/);
  assert.match(importedWebhook.dedupeKey, /^sha256:/);
  assert.equal(importedWebhook.dedupeBy, "charge_id_hash");
  assert.match(importedWebhook.payloadHash, /^sha256:/);
  assert.match(importedWebhook.appendOnlyHash, /^sha256:/);
  assert.equal(unverifiedWebhook.status, "rejected");
  assert.equal(unverifiedWebhook.webhookArrivedBeforeSignIn, true);
  assert.equal(unverifiedWebhook.autoCreatesContributionEvidence, false);
  assert.equal(fixtureRecordedWebhook.status, "recorded");
  assert.equal(fixtureRecordedWebhook.campaignId, "campaign-global-health-basic-needs");
  assert.equal(fixtureRecordedWebhook.pledgeIntentId, "fixture-pledge-intent-001");
  assert.equal(fixtureRecordedWebhook.webhookArrivedBeforeSignIn, false);
  assert.equal(fixtureRecordedWebhook.autoCreatesContributionEvidence, true);
  assert.equal(fixtureRecordedWebhook.evidenceRecord.reviewState, "pending_review");
  assert.match(fixtureRecordedWebhook.chargeIdHash, /^sha256:/);
  assert.match(fixtureRecordedWebhook.partnerDonationIdHash ?? "", /^sha256:/);
  assert.equal(fixtureNeedsReviewWebhook.status, "needs_review");
  assert.equal(fixtureNeedsReviewWebhook.campaignId, undefined);
  assert.equal(fixtureNeedsReviewWebhook.webhookArrivedBeforeSignIn, true);
  assert.equal(fixtureNeedsReviewWebhook.autoCreatesContributionEvidence, false);
  assert.match(donateLinkRoute, /getViewer/);
  assert.match(donateLinkRoute, /recordMpgfPublicGoodsAnalyticsEvent/);
  assert.match(donateLinkRoute, /contribution_route_selected/);
  assert.match(donateLinkRoute, /every_org_fast_route/);
  assert.match(donateLinkRoute, /provider_link_created/);
  assert.match(donateLinkRoute, /MPGF_EVERY_ORG_PUBLIC_WEBHOOK_TOKEN/);
  assert.match(donateLinkRoute, /pending_webhook_not_counted/);
  assert.match(webhookRoute, /MPGF_EVERY_ORG_WEBHOOK_SHARED_SECRET/);
  assert.match(webhookRoute, /recordMpgfEveryOrgPartnerWebhook/);
  assert.match(webhookRoute, /createServiceClient/);
  assert.match(webhookRoute, /MpgfEveryOrgPartnerEventInsert/);
  assert.match(webhookRoute, /MpgfPublicGoodsPaymentProofInsert/);
  assert.match(webhookRoute, /MpgfPaymentEventInsert/);
  assert.match(webhookRoute, /mpgf_every_org_partner_events/);
  assert.match(webhookRoute, /mpgf_public_goods_payment_proofs/);
  assert.match(webhookRoute, /mpgf_payment_events/);
  assert.match(webhookRoute, /every_org_partner_webhook/);
  assert.match(webhookRoute, /external_handoff_verified/);
  assert.match(webhookRoute, /persistence/);
  assert.match(webhookRoute, /finalPayoutAuthorized: false/);
  assert.match(pendingPage, /not counted, matched, or treated as verified from redirect alone/);
  assert.match(pendingPage, /Every\.org review-state progression/);
  assert.match(pendingPage, /pending_webhook_not_counted/);
  assert.match(pendingPage, /provider_event_received/);
  assert.match(pendingPage, /pending_review/);
  assert.match(pendingPage, /counted_after_review/);
  assert.match(pageFrame, /Every\.org fast route/);
  assert.match(pageFrame, /Webhook before counting/);
  assert.match(migration, /create table if not exists public\.mpgf_every_org_partner_events/);
  assert.match(migration, /charge_id_hash text not null unique/);
  assert.match(migration, /auto_creates_contribution_evidence boolean not null default false/);
  assert.match(migration, /final_payout_authorized boolean not null default false check \(final_payout_authorized = false\)/);
  assert.match(migration, /Raw charge IDs, donor names, donor emails, private notes, and public testimony are not stored/);
  assert.match(databaseTypes, /mpgf_every_org_partner_events: \{/);
  assert.match(databaseTypes, /mpgf_public_goods_payment_proofs: \{/);
  assert.match(databaseTypes, /charge_id_hash: string/);
  assert.match(databaseTypes, /every_org_partner_webhook/);
  assert.match(evidenceMigration, /every_org_partner_webhook/);
  assert.match(evidenceMigration, /create unique index if not exists mpgf_public_goods_payment_proofs_source_event_idx/);
  assert.match(schemaSql, /create table if not exists public\.mpgf_pledge_intents/);
  assert.match(schemaSql, /create table if not exists public\.mpgf_every_org_partner_events/);
  assert.match(schemaSql, /every_org_partner_webhook/);
  assert.match(schemaSql, /create policy "mpgf_every_org_partner_events_service_only"/);
  assert.match(schemaSql, /grant all on[\s\S]*public\.mpgf_every_org_partner_events[\s\S]*to service_role/);
  assert.match(schemaSql, /comment on table public\.mpgf_every_org_partner_events/);
  assert.match(proofSource, /every_org_partner_webhook/);
  assert.match(kpiSource, /every_org_partner_webhook/);
  assert.match(donatePageSource, /Webhook import handles MPGF-linked gifts/);
  assert.match(donatePageSource, /if webhook import cannot match this gift/);
  assert.match(donateConfirmPageSource, /webhook-first MPGF reconciliation state/);
  assert.match(donateConfirmPageSource, /Manual recording is not the default path/);
  assert.match(howItWorksSource, /permanentRedirect\("\/#process-heading"\)/);
  assert.match(siteSearchSource, /Donation offsets/);
  assert.match(visitorPathsSource, /complete a real donation through Every\.org/);
  assert.doesNotMatch(
    `${donatePageSource}\n${donateConfirmPageSource}\n${howItWorksSource}\n${siteSearchSource}\n${visitorPathsSource}`,
    /optionally record|Optional record/,
  );

  for (const forbidden of [
    "private-every-org-user-001",
    "every-org-private-charge-001",
    "every-org-private-charge-002",
    "fixture-every-org-charge-recorded-001",
    "fixture-every-org-charge-review-001",
    "fixture-donor@example.org",
    "Fixture",
    "fixture private note must not appear in normalized event output",
    "jane@example.org",
    "Jane",
    "private donor note",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("MPGF Stripe saved commitments use SetupIntent-first before conditional PaymentIntent creation", () => {
  const setup = createMpgfStripeSavedCommitmentSetup({
    amountCents: 22_500,
    campaignId: "campaign-existential-risk-resilience",
    pledgeIntentId: "pledge-intent-private-stripe-001",
    providerCustomerRef: "cus_private_001",
    providerPaymentMethodRef: "pm_private_001",
    providerSetupIntentRef: "seti_private_001",
    userRef: "private-stripe-user-001",
  });
  const setupWebhook = recordMpgfStripeSavedCommitmentWebhook(
    {
      id: "evt_private_setup_001",
      type: "setup_intent.succeeded",
      data: {
        object: {
          id: "seti_private_001",
          object: "setup_intent",
          customer: "cus_private_001",
          payment_method: "pm_private_001",
          status: "succeeded",
          metadata: setup.setupIntentCreateParams.metadata,
        },
      },
    },
    {
      signatureVerified: true,
      receivedAt: "2026-06-01T12:06:00.000Z",
    },
  );
  const blockedPlan = buildMpgfStripeConditionalPaymentIntentPlan({
    amountCents: setup.amountCents,
    campaignId: setup.campaignId,
    conditionalPledgeId: setup.conditionalPledgeId,
    gateState: {
      roundParametersLocked: true,
      thresholdAmountCleared: true,
      supporterCountCleared: true,
      reviewApproved: true,
      challengeWindowClosed: false,
    },
    pledgeIntentId: setup.pledgeIntentId,
    providerCustomerRef: "cus_private_001",
    providerPaymentMethodRef: "pm_private_001",
    providerSetupIntentRef: "seti_private_001",
  });
  const payablePlan = buildMpgfStripeConditionalPaymentIntentPlan({
    amountCents: setup.amountCents,
    campaignId: setup.campaignId,
    conditionalPledgeId: setup.conditionalPledgeId,
    gateState: {
      roundParametersLocked: true,
      thresholdAmountCleared: true,
      supporterCountCleared: true,
      reviewApproved: true,
      challengeWindowClosed: true,
    },
    pledgeIntentId: setup.pledgeIntentId,
    providerCustomerRef: "cus_private_001",
    providerPaymentMethodRef: "pm_private_001",
    providerSetupIntentRef: "seti_private_001",
  });
  const paymentWebhook = recordMpgfStripeSavedCommitmentWebhook(
    {
      id: "evt_private_payment_001",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_private_001",
          object: "payment_intent",
          customer: "cus_private_001",
          payment_method: "pm_private_001",
          status: "succeeded",
          metadata: payablePlan.metadata,
        },
      },
    },
    {
      signatureVerified: true,
      receivedAt: "2026-06-01T12:07:00.000Z",
    },
  );
  const rejectedWebhook = recordMpgfStripeSavedCommitmentWebhook(
    {
      id: "evt_private_setup_002",
      type: "setup_intent.succeeded",
      data: {
        object: {
          id: "seti_private_002",
          customer: "cus_private_002",
          payment_method: "pm_private_002",
          status: "succeeded",
          metadata: setup.setupIntentCreateParams.metadata,
        },
      },
    },
    {
      signatureVerified: false,
    },
  );
  const serialized = JSON.stringify({ setup, setupWebhook, blockedPlan, payablePlan, paymentWebhook, rejectedWebhook });
  const setupRoute = readFileSync("src/app/api/mpgf/stripe/setup-intent/route.ts", "utf8");
  const workerRoute = readFileSync("src/app/api/mpgf/stripe/conditional-payment-intents/route.ts", "utf8");
  const stripeWebhookRoute = readFileSync("src/app/api/mpgf/providers/stripe/webhook/route.ts", "utf8");
  const realMoney = readFileSync("src/lib/mpgf/real-money.ts", "utf8");
  const contributionModal = readFileSync("src/components/mpgf/mpgf-contribution-modal.tsx", "utf8");
  const contributionConsole = readFileSync("src/components/mpgf/mpgf-console.tsx", "utf8");
  const migration = readFileSync("supabase/migrations/20260601_mpgf_stripe_setup_intent_commitments.sql", "utf8");
  const schemaSql = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.equal(setup.policy, MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_POLICY);
  assert.equal(setup.privacyPolicy, MPGF_PUBLIC_GOODS_STRIPE_SETUP_INTENT_PRIVACY_POLICY);
  assert.equal(setup.setupIntentUsage, "off_session");
  assert.equal(setup.setupIntentCreateParams.usage, "off_session");
  assert.equal(setup.setupIntentCreateParams.automaticPaymentMethods, true);
  assert.equal(setup.setupIntentCreateParams.metadata.purpose, "mpgf_public_goods_saved_commitment");
  assert.equal(setup.setupIntentCreateParams.metadata.finalPayoutAuthorized, "false");
  assert.equal(setup.createsChargeImmediately, false);
  assert.equal(setup.longLivedManualCardHold, false);
  assert.equal(setup.paymentIntentCreatedBeforeGates, false);
  assert.equal(setup.rawCardDataStored, false);
  assert.equal(setup.requiresStripeSignatureWebhook, true);
  assert.equal(setup.futureUseAgreement.explicitConsentRequired, true);
  assert.equal(setup.futureUseAgreement.chargeTiming, "only_after_threshold_review_and_challenge_gates_clear");
  assert.equal(setup.finalPayoutAuthorized, false);
  assert.match(setup.userRefHash, /^sha256:/);
  assert.match(setup.providerCustomerIdHash ?? "", /^sha256:/);
  assert.match(setup.providerSetupIntentIdHash ?? "", /^sha256:/);
  assert.match(setup.providerPaymentMethodIdHash ?? "", /^sha256:/);
  assert.match(setup.calcHash, /^sha256:/);
  assert.equal(setupWebhook.status, "recorded");
  assert.equal(setupWebhook.eventState, "setup_succeeded_token_ready");
  assert.equal(setupWebhook.signatureVerified, true);
  assert.equal(setupWebhook.stateChangeAllowed, true);
  assert.equal(setupWebhook.amountCents, 22_500);
  assert.equal(setupWebhook.paymentMethodToken?.rawCardDataStored, false);
  assert.match(setupWebhook.paymentMethodToken?.providerCustomerIdHash ?? "", /^sha256:/);
  assert.match(setupWebhook.providerEventIdHash, /^sha256:/);
  assert.equal(setupWebhook.finalPayoutAuthorized, false);
  assert.equal(blockedPlan.paymentIntentCreationAllowed, false);
  assert.deepEqual(blockedPlan.blockedBy, ["challenge_window_open"]);
  assert.equal(payablePlan.paymentIntentCreationAllowed, true);
  assert.equal(payablePlan.setupIntentFirst, true);
  assert.equal(payablePlan.confirmOffSession, true);
  assert.equal(payablePlan.captureMethod, "automatic");
  assert.equal(payablePlan.longLivedManualCardHold, false);
  assert.equal(payablePlan.requiresStripeSignatureWebhookBeforeCounting, true);
  assert.equal(payablePlan.finalPayoutAuthorized, false);
  assert.match(payablePlan.idempotencyKeyHash, /^sha256:/);
  assert.match(payablePlan.calcHash, /^sha256:/);
  assert.equal(paymentWebhook.status, "recorded");
  assert.equal(paymentWebhook.eventState, "payment_intent_succeeded_pending_review");
  assert.equal(paymentWebhook.amountCents, 22_500);
  assert.equal(paymentWebhook.reviewRequiredBeforeCounting, true);
  assert.equal(paymentWebhook.finalPayoutAuthorized, false);
  assert.equal(rejectedWebhook.status, "rejected");
  assert.equal(rejectedWebhook.stateChangeAllowed, false);
  assert.match(setupRoute, /setupIntents\.create/);
  assert.match(setupRoute, /recordMpgfPublicGoodsAnalyticsEvent/);
  assert.match(setupRoute, /contribution_route_selected/);
  assert.match(setupRoute, /stripe_setup_intent_saved_commitment/);
  assert.match(setupRoute, /setup_intent_started/);
  assert.match(setupRoute, /usage: "off_session"/);
  assert.match(setupRoute, /explicitFutureUseConsent/);
  assert.match(setupRoute, /future_use_consent_at/);
  assert.match(setupRoute, /mpgf_stripe_saved_commitments/);
  assert.match(setupRoute, /provider_setup_intent_id_hash/);
  assert.match(setupRoute, /createServiceClient/);
  assert.match(setupRoute, /persistence/);
  assert.match(setupRoute, /createsChargeImmediately: false/);
  assert.match(workerRoute, /MPGF_STRIPE_CONDITIONAL_WORKER_SECRET/);
  assert.match(workerRoute, /mpgf_stripe_conditional_payment_intent_runs/);
  assert.match(workerRoute, /gate_state/);
  assert.match(workerRoute, /payment_intent_creation_allowed/);
  assert.match(workerRoute, /idempotency_key_hash/);
  assert.match(workerRoute, /persistMpgfStripeConditionalPaymentIntentRun/);
  assert.match(workerRoute, /persistence/);
  assert.match(workerRoute, /paymentIntents\.create/);
  assert.match(workerRoute, /off_session: true/);
  assert.match(workerRoute, /finalPayoutAuthorized: false/);
  assert.match(stripeWebhookRoute, /Stripe webhook signature/);
  assert.match(realMoney, /isMpgfStripeSavedCommitmentEvent/);
  assert.match(realMoney, /recordMpgfStripeSavedCommitmentWebhook/);
  assert.match(realMoney, /persistMpgfStripeSavedCommitmentWebhookEvent/);
  assert.match(realMoney, /mpgf_stripe_saved_commitment_events/);
  assert.match(realMoney, /mpgf_payment_method_tokens/);
  assert.match(realMoney, /mpgf_payment_events/);
  assert.match(realMoney, /onConflict: "provider_event_id_hash"/);
  assert.match(realMoney, /final_payout_authorized: false/);
  assert.match(contributionModal, /futureUseConsentAccepted/);
  assert.match(contributionModal, /explicitFutureUseConsent/);
  assert.match(contributionConsole, /futureUseConsentAccepted/);
  assert.match(contributionConsole, /explicitFutureUseConsent/);
  assert.match(migration, /mpgf_stripe_saved_commitments/);
  assert.match(migration, /mpgf_stripe_saved_commitment_events/);
  assert.match(migration, /mpgf_stripe_conditional_payment_intent_runs/);
  assert.match(migration, /creates_charge_immediately boolean not null default false/);
  assert.match(migration, /long_lived_manual_card_hold boolean not null default false/);
  assert.match(migration, /payment_intent_created_before_gates boolean not null default false/);
  assert.match(migration, /payment_intent_creation_allowed = false/);
  assert.match(migration, /thresholdAmountCleared/);
  assert.match(migration, /challengeWindowClosed/);
  assert.match(schemaSql, /create table if not exists public\.mpgf_stripe_saved_commitments/);
  assert.match(schemaSql, /create table if not exists public\.mpgf_stripe_saved_commitment_events/);
  assert.match(schemaSql, /create table if not exists public\.mpgf_stripe_conditional_payment_intent_runs/);
  assert.match(schemaSql, /mpgf_stripe_payment_intent_run_requires_clear_gates/);
  assert.match(schemaSql, /create policy "mpgf_stripe_saved_commitment_events_service_only"/);
  assert.match(schemaSql, /grant all on[\s\S]*public\.mpgf_stripe_saved_commitment_events[\s\S]*to service_role/);
  assert.match(schemaSql, /comment on table public\.mpgf_stripe_conditional_payment_intent_runs/);
  assert.match(databaseTypes, /mpgf_stripe_saved_commitments: \{/);
  assert.match(databaseTypes, /mpgf_stripe_saved_commitment_events: \{/);
  assert.match(databaseTypes, /mpgf_stripe_conditional_payment_intent_runs: \{/);
  assert.match(databaseTypes, /creates_charge_immediately: false/);
  assert.match(databaseTypes, /requires_stripe_signature_webhook_before_counting: true/);

  for (const forbidden of [
    "private-stripe-user-001",
    "cus_private_001",
    "pm_private_001",
    "seti_private_001",
    "pi_private_001",
    "evt_private_setup_001",
    "evt_private_payment_001",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("MPGF CG-VQAF publishes common-ground and capital-constrained allocation without moral ranking", () => {
  const report = getMpgfPublicGoodsCgVqafReportApi(demoMpgfAssuranceRound.id);
  const unknownReport = getMpgfPublicGoodsCgVqafReportApi("unknown-round");
  const discovery = buildMpgfPublicGoodsCommonGroundDiscovery({ moralCluster: "humanitarian" });
  const discoveryApi = getMpgfPublicGoodsCommonGroundDiscoveryApi(demoMpgfAssuranceRound.id, "humanitarian");
  const unknownDiscoveryApi = getMpgfPublicGoodsCommonGroundDiscoveryApi("unknown-round", "humanitarian");
  const supportSignalContract = getMpgfPublicGoodsSupportSignalContractApi(demoMpgfAssuranceRound.id);
  const unknownSupportSignalContract = getMpgfPublicGoodsSupportSignalContractApi("unknown-round");
  const supportSignal = createMpgfPublicGoodsSupportSignal({
    campaignId: "campaign-global-health-basic-needs",
    userRef: "private-cg-vqaf-user-001",
    moralCluster: "humanitarian",
    signalType: "weak_common_ground_support",
    strengthBps: 6_200,
  });
  const dissentSignal = createMpgfPublicGoodsSupportSignal({
    campaignId: "campaign-animal-welfare-transition",
    userRef: "private-cg-vqaf-dissent-user-001",
    moralCluster: "institutional_pluralist",
    signalType: "dissent_review_requested",
    strengthBps: 2_500,
  });
  const storedCommonGroundSignal = createMpgfPublicGoodsSupportSignal({
    campaignId: "campaign-animal-welfare-transition",
    userRef: "private-cg-vqaf-stored-user-001",
    moralCluster: "animal_inclusive",
    signalType: "weak_common_ground_support",
    strengthBps: 7_800,
  });
  const storedCommonGroundMoralClusterHash = hashMpgfPublicGoodsMoralCluster("animal_inclusive");
  const persistedSupportSignal = supportSignalFromMpgfPublicGoodsStorageRow({
    id: storedCommonGroundSignal.id,
    roundId: storedCommonGroundSignal.roundId,
    campaignId: storedCommonGroundSignal.campaignId,
    userRefHash: storedCommonGroundSignal.userRefHash,
    moralClusterHash: storedCommonGroundMoralClusterHash,
    signalType: storedCommonGroundSignal.signalType,
    strengthBps: storedCommonGroundSignal.strengthBps,
    countsForCommonGround: storedCommonGroundSignal.countsForCommonGround,
    calcHash: storedCommonGroundSignal.calcHash,
    createdAt: storedCommonGroundSignal.createdAt,
  });

  if (!persistedSupportSignal) {
    throw new Error("Expected stored MPGF support signal row to hydrate from its moral-cluster hash.");
  }

  const persistedCampaignTemplate = demoMpgfPublicGoodsCampaigns[0];

  if (!persistedCampaignTemplate) {
    throw new Error("Expected MPGF public-goods campaign fixture.");
  }

  const persistedRound = {
    ...demoMpgfAssuranceRound,
    id: "persisted-cg-vqaf-round-001",
  };
  const persistedRoundCampaign = {
    ...persistedCampaignTemplate,
    id: "persisted-cg-vqaf-campaign-001",
    slug: "persisted-cg-vqaf-campaign",
  };
  const persistedRoundSupportSignal = createMpgfPublicGoodsSupportSignal({
    round: persistedRound,
    campaigns: [persistedRoundCampaign],
    campaignId: "persisted-cg-vqaf-campaign",
    userRef: "private-persisted-cg-vqaf-user-001",
    moralCluster: "institutional_pluralist",
    signalType: "weak_common_ground_support",
    strengthBps: 6_600,
  });
  const persistedRoundContract = buildMpgfPublicGoodsSupportSignalContractApi(persistedRound.id);
  const persistedDiscovery = buildMpgfPublicGoodsCommonGroundDiscovery({
    moralCluster: "animal_inclusive",
    supportSignals: [persistedSupportSignal],
  });
  const persistedAnimalDiscoveryRow = persistedDiscovery.rows.find(
    (row) => row.campaignId === "campaign-animal-welfare-transition",
  );
  const route = readFileSync("src/app/api/mpgf/rounds/[roundId]/cg-vqaf/route.ts", "utf8");
  const discoveryRoute = readFileSync(
    "src/app/api/mpgf/rounds/[roundId]/common-ground-discovery/route.ts",
    "utf8",
  );
  const supportSignalRoute = readFileSync("src/app/api/mpgf/rounds/[roundId]/support-signals/route.ts", "utf8");
  const supportSignalPersistence = readFileSync("src/lib/mpgf/public-goods-support-signal-persistence.ts", "utf8");
  const supportSignalPanel = readFileSync("src/components/mpgf/mpgf-support-signal-panel.tsx", "utf8");
  const roundPage = readFileSync("src/app/mpgf/rounds/[roundId]/page.tsx", "utf8");
  const poolsPage = readFileSync("src/app/mpgf/pools/page.tsx", "utf8");
  const mechanism = readFileSync("src/lib/mpgf/public-goods-cg-vqaf.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260601_mpgf_cg_vqaf_core.sql", "utf8");
  const schemaSql = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");
  const serialized = JSON.stringify({ report, discovery, discoveryApi, supportSignal, supportSignalContract });

  assert.ok(report);
  assert.equal(unknownReport, null);
  assert.equal(discovery.policy, MPGF_PUBLIC_GOODS_COMMON_GROUND_DISCOVERY_POLICY);
  assert.equal(discovery.selectedMoralCluster, "humanitarian");
  assert.equal(discovery.orderingExperimentKey, "mpgf_static_ordering_vs_common_ground_personalization_v1");
  assert.equal(discovery.noGlobalMoralRanking, true);
  assert.equal(discovery.ranksCoordinatabilityOnly, true);
  assert.equal(discovery.ranksMoralTruth, false);
  assert.equal(discovery.supportSignalsSuppressed, true);
  assert.equal(discovery.learnsOverlappingReasons, true);
  assert.ok(discoveryApi);
  assert.equal(unknownDiscoveryApi, null);
  assert.deepEqual(discovery.rows.map((row) => row.campaignId), discoveryApi.rows.map((row) => row.campaignId));
  assert.ok(
    discovery.rows.every((row, index, rows) =>
      index === 0 || rows[index - 1].coordinatabilityScoreBps >= row.coordinatabilityScoreBps,
    ),
  );
  assert.ok(discovery.rows.every((row) => row.noGlobalMoralRanking));
  assert.ok(discovery.rows.some((row) => row.reasonCodes.includes("cross_cluster_support")));
  assert.ok(discovery.rows.some((row) => row.reasonCodes.includes("selected_cluster_affinity")));
  assert.match(discovery.calcHash, /^sha256:/);
  assert.ok(supportSignalContract);
  assert.equal(unknownSupportSignalContract, null);
  assert.equal(
    supportSignalContract.supportSignalPath,
    `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/support-signals`,
  );
  assert.equal(
    supportSignalContract.commonGroundDiscoveryPath,
    `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/common-ground-discovery`,
  );
  assert.equal(supportSignalContract.privateByDefault, true);
  assert.equal(supportSignalContract.publicAggregationOnly, true);
  assert.equal(supportSignalContract.noGlobalMoralRanking, true);
  assert.ok(supportSignalContract.signalOptions.some((option) => option.value === "strong_support"));
  assert.ok(supportSignalContract.signalOptions.some((option) => option.value === "weak_common_ground_support"));
  assert.ok(supportSignalContract.signalOptions.some((option) => option.value === "dissent_review_requested"));
  assert.ok(supportSignalContract.collectiveActionStates.some((state) => state.value === "signal_only"));
  assert.ok(supportSignalContract.collectiveActionStates.some((state) => state.value === "pledge_saved"));
  assert.ok(supportSignalContract.collectiveActionStates.some((state) => state.value === "pending_verification"));
  assert.ok(supportSignalContract.collectiveActionStates.some((state) => state.value === "threshold_cleared"));
  assert.ok(supportSignalContract.collectiveActionStates.some((state) => state.value === "counted"));
  assert.ok(supportSignalContract.collectiveActionStates.some((state) => state.value === "payout_in_milestones"));
  assert.equal(report.policy, MPGF_PUBLIC_GOODS_CG_VQAF_POLICY);
  assert.equal(report.privacyPolicy, MPGF_PUBLIC_GOODS_CG_VQAF_PRIVACY_POLICY);
  assert.equal(report.formulaVersion, "cg_vqaf_capital_constrained_qf_v1");
  assert.equal(report.noGlobalMoralRanking, true);
  assert.equal(report.ranksCoordinatabilityOnly, true);
  assert.equal(report.parametersLockedBeforeRoundOpen, true);
  assert.equal(report.supportSignalsSuppressed, true);
  assert.ok(report.qfBonusAllocatedCents <= report.qfBonusBudgetCents);
  assert.ok(report.rows.some((row) => row.commonGroundSignalCount >= 2 && row.moralClusterCount >= 2));
  assert.ok(report.rows.every((row) => row.bonusCents <= row.bonusCapCents));
  assert.ok(report.rows.every((row) => /^sha256:/.test(row.calculationHash)));
  assert.match(report.calcHash, /^sha256:/);
  assert.equal(supportSignal.privateByDefault, true);
  assert.equal(supportSignal.countsForCommonGround, true);
  assert.equal(supportSignal.noGlobalMoralRanking, true);
  assert.match(supportSignal.userRefHash, /^sha256:/);
  assert.match(supportSignal.calcHash, /^sha256:/);
  assert.equal(dissentSignal.privateByDefault, true);
  assert.equal(dissentSignal.countsForCommonGround, false);
  assert.equal(dissentSignal.noGlobalMoralRanking, true);
  assert.match(storedCommonGroundMoralClusterHash, /^sha256:/);
  assert.equal(persistedSupportSignal.moralCluster, "animal_inclusive");
  assert.equal(persistedSupportSignal.countsForCommonGround, true);
  assert.equal(persistedRoundSupportSignal.roundId, persistedRound.id);
  assert.equal(persistedRoundSupportSignal.campaignId, persistedRoundCampaign.id);
  assert.equal(persistedRoundSupportSignal.privateByDefault, true);
  assert.equal(persistedRoundContract.supportSignalPath, `/api/mpgf/rounds/${persistedRound.id}/support-signals`);
  assert.equal(persistedRoundContract.noGlobalMoralRanking, true);
  assert.ok(persistedAnimalDiscoveryRow);
  assert.equal(persistedAnimalDiscoveryRow.selectedClusterSupportBps, 7_800);
  assert.equal(persistedAnimalDiscoveryRow.reasonCodes.includes("selected_cluster_affinity"), true);
  assert.equal(persistedDiscovery.supportSignalsSuppressed, true);
  assert.match(route, /MPGF_PUBLIC_GOODS_API_HEADERS/);
  assert.match(route, /getMpgfPublicGoodsCgVqafReportApi/);
  assert.match(route, /loadMpgfPublicGoodsAllocationContext/);
  assert.match(route, /loadMpgfPublicGoodsAllocationContributionRecords/);
  assert.match(route, /contextLoad\.source === "database_round_context"/);
  assert.match(route, /allocationContextSource/);
  assert.match(route, /contributionSource/);
  assert.match(route, /loadedCampaignCount/);
  assert.match(route, /loadMpgfPublicGoodsSupportSignalsForRound/);
  assert.match(route, /supportSignalSource/);
  assert.match(route, /if \(fallbackResult\)/);
  assert.match(route, /Could not load persisted MPGF CG-VQAF state/);
  assert.match(discoveryRoute, /getMpgfPublicGoodsCommonGroundDiscoveryApi/);
  assert.match(discoveryRoute, /buildMpgfPublicGoodsCommonGroundDiscovery/);
  assert.match(discoveryRoute, /loadMpgfPublicGoodsAllocationContext/);
  assert.match(discoveryRoute, /loadMpgfPublicGoodsAllocationContributionRecords/);
  assert.match(discoveryRoute, /contextLoad\.source === "database_round_context"/);
  assert.match(discoveryRoute, /allocationContextSource/);
  assert.match(discoveryRoute, /contributionSource/);
  assert.match(discoveryRoute, /loadedCampaignCount/);
  assert.match(discoveryRoute, /loadMpgfPublicGoodsSupportSignalsForRound/);
  assert.match(discoveryRoute, /supportSignalSource/);
  assert.match(discoveryRoute, /isMpgfPublicGoodsMoralCluster/);
  assert.match(discoveryRoute, /if \(fallbackResult\)/);
  assert.match(discoveryRoute, /Could not load persisted MPGF common-ground discovery state/);
  assert.match(discoveryRoute, /MPGF_PUBLIC_GOODS_API_HEADERS/);
  assert.match(supportSignalRoute, /loadSupportSignalRoundState/);
  assert.match(supportSignalRoute, /loadMpgfPublicGoodsAllocationContext/);
  assert.match(supportSignalRoute, /buildMpgfPublicGoodsSupportSignalContractApi/);
  assert.match(supportSignalRoute, /campaigns: roundState\.campaigns/);
  assert.match(supportSignalRoute, /roundSource/);
  assert.match(supportSignalRoute, /Sign in to record an MPGF support signal/);
  assert.match(supportSignalRoute, /private_by_default: true/);
  assert.match(supportSignalRoute, /publicAggregationOnly: true/);
  assert.match(supportSignalRoute, /support_signal_recorded/);
  assert.match(supportSignalRoute, /supportSignalMode/);
  const analyticsEventJsonBlock = supportSignalRoute.slice(
    supportSignalRoute.indexOf("eventJson: {"),
    supportSignalRoute.indexOf("});", supportSignalRoute.indexOf("eventJson: {")),
  );
  assert.equal(analyticsEventJsonBlock.includes("moralCluster"), false);
  assert.match(supportSignalRoute, /noGlobalMoralRanking: true/);
  assert.match(supportSignalRoute, /moral_cluster_hash/);
  assert.match(supportSignalRoute, /hashMpgfPublicGoodsMoralCluster/);
  assert.match(supportSignalRoute, /mpgf_support_signals/);
  assert.match(supportSignalRoute, /MpgfSupportSignalInsert/);
  assert.match(supportSignalRoute, /mpgf_dissent_notes/);
  assert.match(supportSignalRoute, /MpgfDissentNoteInsert/);
  assert.match(supportSignalRoute, /persistDissentNote/);
  assert.match(supportSignalRoute, /dissentReasonCode/);
  assert.match(supportSignalRoute, /public_summary/);
  assert.match(supportSignalRoute, /pauses_unreleased_milestones: true/);
  assert.doesNotMatch(supportSignalRoute, /SupabaseAny/);
  assert.match(supportSignalRoute, /MPGF_PUBLIC_GOODS_API_HEADERS/);
  assert.match(supportSignalPersistence, /createServiceClient/);
  assert.match(supportSignalPersistence, /mpgf_support_signals/);
  assert.match(supportSignalPersistence, /supportSignalFromMpgfPublicGoodsStorageRow/);
  assert.match(supportSignalPersistence, /persistedSupportSignalCount/);
  assert.match(mechanism, /Strongly support/);
  assert.match(mechanism, /Weak common-ground support/);
  assert.match(mechanism, /Dissent \/ want review/);
  assert.match(mechanism, /hashMpgfPublicGoodsMoralCluster/);
  assert.match(mechanism, /supportSignalFromMpgfPublicGoodsStorageRow/);
  assert.match(supportSignalPanel, /signalOptions\.map/);
  assert.match(supportSignalPanel, /Private by default; public output is aggregate only/);
  assert.match(supportSignalPanel, /signal_only/);
  assert.match(supportSignalPanel, /Common-ground discovery/);
  assert.match(supportSignalPanel, /dissentReasonCode/);
  assert.match(supportSignalPanel, /Public summary/);
  assert.match(supportSignalPanel, /Dissent note opened/);
  assert.match(roundPage, /commonGroundScoreBps/);
  assert.match(poolsPage, /buildMpgfPublicGoodsCommonGroundDiscovery/);
  assert.match(poolsPage, /name="cluster"/);
  assert.match(poolsPage, /Common-ground ordering/);
  assert.match(poolsPage, /Campaign order ranks coordinatability, not moral truth/);
  assert.match(poolsPage, /coordinatabilityScoreBps/);
  assert.match(mechanism, /solveCapitalConstrainedLambda/);
  assert.match(mechanism, /private_common_ground_campaign_ordering_no_global_moral_ranking_v1/);
  assert.match(mechanism, /ranksMoralTruth: false/);
  assert.match(mechanism, /bonus_j = min|cg_vqaf_capital_constrained_qf_v1/);
  assert.match(mechanism, /getMpgfPublicGoodsSupportSignalContractApi/);
  assert.match(migration, /mpgf_moral_profiles/);
  assert.match(migration, /mpgf_support_signals/);
  assert.match(migration, /mpgf_conditional_pledges/);
  assert.match(migration, /mpgf_payment_method_tokens/);
  assert.match(migration, /mpgf_payment_events/);
  assert.match(migration, /mpgf_sponsor_pool_entries/);
  assert.match(migration, /mpgf_allocation_results/);
  assert.match(migration, /mpgf_dissent_notes/);
  assert.match(migration, /mpgf_milestones/);
  assert.match(migration, /stripe_setup_intent_saved_commitment/);
  assert.match(migration, /every_org_fast_route/);
  assert.match(migration, /no_global_moral_ranking boolean not null default true/);
  for (const baseTable of [
    "mpgf_cycles",
    "mpgf_candidate_alternatives",
    "mpgf_public_goods_match_pools",
    "mpgf_public_goods_rounds",
    "mpgf_public_goods_campaigns",
    "mpgf_public_goods_pledges",
    "mpgf_public_goods_analytics_events",
  ]) {
    assert.match(schemaSql, new RegExp(`create table if not exists public\\.${baseTable}`));
  }
  for (const table of [
    "mpgf_moral_profiles",
    "mpgf_support_signals",
    "mpgf_conditional_pledges",
    "mpgf_payment_method_tokens",
    "mpgf_payment_events",
    "mpgf_sponsor_pool_entries",
    "mpgf_allocation_results",
    "mpgf_dissent_notes",
    "mpgf_milestones",
  ]) {
    assert.match(databaseTypes, new RegExp(`${table}: \\{`));
    assert.match(schemaSql, new RegExp(`create table if not exists public\\.${table}`));
  }
  assert.match(schemaSql, /references public\.mpgf_public_goods_rounds \(id\) on delete cascade/);
  assert.match(schemaSql, /references public\.mpgf_public_goods_campaigns \(id\) on delete cascade/);
  assert.match(schemaSql, /comment on table public\.mpgf_support_signals/);
  assert.match(databaseTypes, /signal_type: "strong_support" \| "weak_common_ground_support" \| "dissent_review_requested"/);
  assert.match(databaseTypes, /payment_mode: "every_org_fast_route" \| "stripe_setup_intent_saved_commitment" \| "manual_proof_fallback"/);
  assert.match(databaseTypes, /formula_version: "cg_vqaf_capital_constrained_qf_v1"/);

  for (const forbidden of [
    "private-cg-vqaf-user-001",
    "private-cg-humanitarian-alix",
    "private-cg-pluralist-briar",
    "private-cg-longtermist-cy",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("MPGF coalition routing converts weak common-ground support into threshold-feasible ECM candidates", () => {
  const report = getMpgfPublicGoodsCoalitionRoutingReportApi(demoMpgfAssuranceRound.id);
  const unknownReport = getMpgfPublicGoodsCoalitionRoutingReportApi("unknown-round");
  const directReport = buildMpgfPublicGoodsCoalitionRoutingReport();
  const campaignTemplate = demoMpgfPublicGoodsCampaigns[0];

  if (!campaignTemplate) {
    throw new Error("Expected MPGF public-goods campaign fixture.");
  }

  const persistedCampaign = {
    ...campaignTemplate,
    id: "persisted-coalition-routing-campaign",
    slug: "persisted-coalition-routing-campaign",
    title: "Persisted coalition-routing campaign",
    thresholdAmountCents: 10_000,
    thresholdSupporters: 2,
    reviewStatus: "approved" as const,
  };
  const persistedRound = {
    ...demoMpgfAssuranceRound,
    id: "persisted-coalition-routing-round",
    matchPoolId: demoMpgfMatchPool.id,
  };
  const persistedIdentity = createMpgfPublicGoodsIdentityAttestation({
    userId: "persisted-coalition-routing-supporter",
    provider: "external_proof_of_personhood",
    humanScoreBps: 9_000,
    expiresAt: "2026-12-31T00:00:00.000Z",
    redactedReference: "external_proof_of_personhood:redacted:persisted-coalition-routing",
  });
  const persistedPledges = [
    createMpgfPublicGoodsPledge({
      campaign: persistedCampaign,
      userId: persistedIdentity.userId,
      amountCents: 5_000,
      identityAttestation: persistedIdentity,
    }),
  ] satisfies MpgfPublicGoodsPledge[];
  const persistedSupportSignals = [
    createMpgfPublicGoodsSupportSignal({
      round: persistedRound,
      campaigns: [persistedCampaign],
      campaignId: persistedCampaign.id,
      userRef: "private-persisted-coalition-strong",
      moralCluster: "humanitarian",
      signalType: "strong_support",
      strengthBps: 9_000,
    }),
    createMpgfPublicGoodsSupportSignal({
      round: persistedRound,
      campaigns: [persistedCampaign],
      campaignId: persistedCampaign.id,
      userRef: "private-persisted-coalition-weak-a",
      moralCluster: "longtermist",
      signalType: "weak_common_ground_support",
      strengthBps: 6_500,
    }),
    createMpgfPublicGoodsSupportSignal({
      round: persistedRound,
      campaigns: [persistedCampaign],
      campaignId: persistedCampaign.id,
      userRef: "private-persisted-coalition-weak-b",
      moralCluster: "institutional_pluralist",
      signalType: "weak_common_ground_support",
      strengthBps: 6_000,
    }),
  ];
  const persistedReport = buildMpgfPublicGoodsCoalitionRoutingReport({
    campaigns: [persistedCampaign],
    pledges: persistedPledges,
    round: persistedRound,
    matchPool: demoMpgfMatchPool,
    supportSignals: persistedSupportSignals,
  });
  const persistedRow = persistedReport.rows[0];
  const budgetPreview = buildMpgfCommonGroundBudgetPreview({
    roundId: persistedRound.id,
    roundLockTime: persistedRound.endsAt,
    projects: [{
      id: persistedCampaign.id,
      title: persistedCampaign.title,
      thresholdAmountCents: persistedCampaign.thresholdAmountCents,
      thresholdSupporters: persistedCampaign.thresholdSupporters,
    }],
    coalitionRouting: persistedReport,
    budgetPeriod: "round_limited",
    roundBudgetCents: 7_500,
    perProjectCapCents: 3_000,
    nextCaptureAt: "2026-07-15T00:00:00.000Z",
    nextCaptureRule: "monthly_after_final_review",
    defaultAllocationBaseline: "I would otherwise donate this to my usual preferred charity.",
    baselineConfidenceLevel: "medium",
    baselineConfidenceRationale: "Self-attested default for sandbox calculation.",
    participantSurplusConfirmed: true,
    fallbackRule: "reroute",
    unroutableBudgetPolicy: "manual_review",
    stances: [{
      campaignId: persistedCampaign.id,
      stance: "weak",
      maxAllocCents: 7_500,
      maxAllocBps: 10_000,
      conditionAccepted: true,
      acceptableCounterBucketIds: [
        "bucket-animal-welfare",
        "bucket-long-run-future",
        "bucket-public-interest-knowledge",
      ],
      minCounterpartyVolumeCents: 20_000,
      rankOrder: 1,
      reviewSignalVisibility: "pseudonymous",
    }],
  });
  const missingConditionPreview = buildMpgfCommonGroundBudgetPreview({
    roundId: persistedRound.id,
    roundLockTime: persistedRound.endsAt,
    projects: [{
      id: persistedCampaign.id,
      title: persistedCampaign.title,
      thresholdAmountCents: persistedCampaign.thresholdAmountCents,
      thresholdSupporters: persistedCampaign.thresholdSupporters,
    }],
    coalitionRouting: persistedReport,
    budgetPeriod: "round_limited",
    roundBudgetCents: 7_500,
    perProjectCapCents: 3_000,
    participantSurplusConfirmed: true,
    stances: [{
      campaignId: persistedCampaign.id,
      stance: "weak",
      maxAllocCents: 3_000,
      maxAllocBps: 10_000,
      rankOrder: 1,
    }],
  });
  const defaultSkipPreview = buildMpgfCommonGroundBudgetPreview({
    roundId: persistedRound.id,
    roundLockTime: persistedRound.endsAt,
    projects: [{
      id: persistedCampaign.id,
      title: persistedCampaign.title,
      thresholdAmountCents: persistedCampaign.thresholdAmountCents,
      thresholdSupporters: persistedCampaign.thresholdSupporters,
    }],
    coalitionRouting: persistedReport,
    budgetPeriod: "round_limited",
    roundBudgetCents: 7_500,
    participantSurplusConfirmed: true,
  });
  const route = readFileSync("src/app/api/mpgf/rounds/[roundId]/coalition-routing/route.ts", "utf8");
  const budgetPreviewRoute = readFileSync("src/app/api/mpgf/rounds/[roundId]/common-ground-budget-preview/route.ts", "utf8");
  const budgetSavePanel = readFileSync("src/components/mpgf/mpgf-common-ground-budget-save-panel.tsx", "utf8");
  const plainLanguageLabels = readFileSync("src/lib/mpgf/public-goods-crecm-labels.ts", "utf8");
  const roundRoute = readFileSync("src/app/api/mpgf/rounds/[roundId]/route.ts", "utf8");
  const publicApi = readFileSync("src/lib/mpgf/public-goods-api.ts", "utf8");
  const supportSignalContract = buildMpgfPublicGoodsSupportSignalContractApi(persistedRound.id);
  const roundPage = readFileSync("src/app/mpgf/rounds/[roundId]/page.tsx", "utf8");
  const schemaSql = readFileSync("supabase/schema.sql", "utf8");
  const migration = readFileSync("supabase/migrations/20260604_mpgf_coalition_routing.sql", "utf8");
  const conditionalIntentMigration = readFileSync(
    "supabase/migrations/20260628_mpgf_common_ground_conditional_trade_intents.sql",
    "utf8",
  );
  const capsCaptureMigration = readFileSync(
    "supabase/migrations/20260626_mpgf_common_ground_budget_caps_capture.sql",
    "utf8",
  );
  const reviewSignalVisibilityMigration = readFileSync(
    "supabase/migrations/20260703_mpgf_support_stance_review_signal_visibility.sql",
    "utf8",
  );
  const serialized = JSON.stringify({ report, persistedReport, supportSignalContract });

  assert.ok(report);
  assert.equal(unknownReport, null);
  assert.equal(report.policy, MPGF_PUBLIC_GOODS_COALITION_ROUTING_POLICY);
  assert.equal(directReport.policy, report.policy);
  assert.equal(report.privacyPolicy, MPGF_PUBLIC_GOODS_COALITION_ROUTING_PRIVACY_POLICY);
  assert.equal(report.failureHandlingPolicy, MPGF_PUBLIC_GOODS_COALITION_ROUTING_FAILURE_POLICY);
  assert.deepEqual(report.stageOrder, [
    "hard_gating",
    "coalition_feasibility",
    "ecm_batch_clearing",
    "base_match_then_capped_diversity_bonus",
    "failure_fallback_or_carry_forward",
  ]);
  assert.equal(report.noGlobalMoralRanking, true);
  assert.equal(report.moralReputationAffectsAllocationPower, false);
  assert.equal(report.publicAggregationOnly, true);
  assert.ok(report.weakSupportBudgetCents > 0);
  assert.equal(report.rows.every((row) => row.noGlobalMoralRanking), true);
  assert.equal(report.rows.every((row) => /^sha256:/.test(row.calculationHash)), true);
  assert.match(report.calcHash, /^sha256:/);
  assert.ok(persistedRow);
  assert.equal(persistedReport.roundId, persistedRound.id);
  assert.equal(persistedReport.candidateCount, 1);
  assert.equal(persistedReport.feasibleCandidateCount, 1);
  assert.equal(persistedReport.ecmBatchCandidateCount, 1);
  assert.equal(persistedRow.campaignId, persistedCampaign.id);
  assert.equal(persistedRow.hardGateStatus, "passed");
  assert.equal(persistedRow.candidateStatus, "threshold_feasible");
  assert.equal(persistedRow.thresholdFeasibleFlag, true);
  assert.equal(persistedRow.ecmBatchClearingEligible, true);
  assert.equal(persistedRow.activeClusterCount, 3);
  assert.equal(persistedRow.weakCommonGroundSignalCount, 2);
  assert.equal(persistedRow.routedWeakBudgetCents, 5_000);
  assert.equal(budgetPreview.policy, MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY);
  assert.equal(budgetPreview.releaseStage, "sandbox_calculation");
  assert.equal(budgetPreview.paymentCaptureAllowed, false);
  assert.equal(budgetPreview.stateMutation, "none_preview_only");
  assert.equal(budgetPreview.participantSurplusConfirmationRequired, true);
  assert.equal(budgetPreview.participantSurplusConfirmed, true);
  assert.equal(budgetPreview.activationState, "ready_for_confirmation");
  assert.equal(
    budgetPreview.rows[0]?.conditionalTradeIntent?.policy,
    MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CONDITIONAL_INTENT_POLICY,
  );
  assert.equal(budgetPreview.rows[0]?.conditionAccepted, true);
  assert.deepEqual(budgetPreview.rows[0]?.acceptableCounterBucketIds, [
    "bucket-animal-welfare",
    "bucket-long-run-future",
    "bucket-public-interest-knowledge",
  ]);
  assert.equal(budgetPreview.rows[0]?.minCounterpartyVolumeCents, 20_000);
  assert.equal(budgetPreview.rows[0]?.conditionalTradeIntent?.canonicalRecordType, "ConditionalTradeIntent");
  assert.equal(budgetPreview.rows[0]?.conditionalTradeIntent?.authorizationState, "not_authorized_no_capture_preview");
  assert.equal(budgetPreview.rows[0]?.conditionalTradeIntent?.maxExposureCents, 3_000);
  assert.equal(budgetPreview.rows[0]?.conditionalTradeIntent?.paymentCaptureAllowed, false);
  assert.equal(
    budgetPreview.releaseGateRequirementBundle.policy,
    MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_POLICY,
  );
  assert.equal(
    budgetPreview.releaseGateRequirementBundle.requirementResults.length,
    MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_REQUIREMENT_CODES.length,
  );
  assert.deepEqual(
    budgetPreview.releaseGateRequirementBundle.requirementResults
      .map((result) => result.requirementCode)
      .sort(),
    [...MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_REQUIREMENT_CODES].sort(),
  );
  assert.deepEqual(budgetPreview.releaseGateRequirementBundle.blockedRequirementCodes, []);
  assert.deepEqual(budgetPreview.releaseGateRequirementBundle.waivedRequirementCodes, []);
  assert.deepEqual(
    budgetPreview.releaseGateRequirementBundle.requiredRequirementCodes.sort(),
    [
      "anti_threat_review",
      "dry_run_calculation_bundle",
      "environment_data_isolation_check",
      "privacy_review",
      "route_health_baseline",
    ].sort(),
  );
  assert.ok(
    budgetPreview.releaseGateRequirementBundle.notRequiredRequirementCodes.includes(
      "donation_offset_lock_confirmation_test",
    ),
  );
  assert.ok(
    budgetPreview.releaseGateRequirementBundle.notRequiredRequirementCodes.includes(
      "pledge_swap_performance_terms_test",
    ),
  );
  assert.equal(budgetPreview.releaseGateRequirementBundle.paymentCaptureAllowed, false);
  assert.equal(budgetPreview.releaseGateRequirementBundle.relianceBearingAgreementAllowed, false);
  assert.match(budgetPreview.releaseGateRequirementBundle.bundleHash, /^sha256:/);
  assert.equal(
    budgetPreview.releaseGateRequirementBundleHash,
    budgetPreview.releaseGateRequirementBundle.bundleHash,
  );
  assert.match(budgetPreview.policySnapshotBundleHash, /^sha256:/);
  assert.equal(budgetPreview.tradeClassification, "moral_public_good_coalition");
  assert.equal(budgetPreview.noGlobalMoralRanking, true);
  assert.equal(budgetPreview.moralReputationAffectsAllocationPower, false);
  assert.equal(budgetPreview.eligibleProjectCount, 1);
  assert.equal(budgetPreview.perProjectCapCents, 3_000);
  assert.equal(budgetPreview.nextCaptureAt, null);
  assert.equal(budgetPreview.nextCaptureRule, "none_before_final_review");
  assert.equal(budgetPreview.routedAllocationCents, 3_000);
  assert.equal(budgetPreview.unroutableBudgetPolicy, "manual_review");
  assert.match(budgetPreview.eligibleProjectSetHash, /^sha256:/);
  assert.match(budgetPreview.termsSnapshotHash, /^sha256:/);
  assert.match(budgetPreview.participantConfirmationHash ?? "", /^sha256:/);
  assert.equal(budgetPreview.rows[0]?.stance, "weak");
  assert.equal(budgetPreview.rows[0]?.reviewSignalVisibility, "pseudonymous");
  assert.equal(budgetPreview.rows[0]?.maxAllocCents, 3_000);
  assert.equal(budgetPreview.rows[0]?.maxAllocBps, 10_000);
  assert.equal("maxAllocPctBps" in (budgetPreview.rows[0] ?? {}), false);
  assert.equal(budgetPreview.rows[0]?.projectedAllocationCents, 3_000);
  assert.equal(budgetPreview.rows[0]?.allocationState, "currently_routed");
  assert.equal(defaultSkipPreview.perProjectCapCents, 7_500);
  assert.equal(defaultSkipPreview.nextCaptureAt, null);
  assert.equal(defaultSkipPreview.nextCaptureRule, "none_before_final_review");
  assert.equal(defaultSkipPreview.rows[0]?.stance, "abstain");
  assert.equal(defaultSkipPreview.rows[0]?.reviewSignalVisibility, "aggregate_only");
  assert.equal(defaultSkipPreview.routedAllocationCents, 0);
  assert.equal(defaultSkipPreview.activationState, "preview_only_confirmation_required");
  assert.equal(missingConditionPreview.rows[0]?.stance, "weak");
  assert.equal(missingConditionPreview.rows[0]?.conditionAccepted, false);
  assert.equal(missingConditionPreview.rows[0]?.conditionalTradeIntent, null);
  assert.equal(missingConditionPreview.activationState, "preview_only_confirmation_required");
  assert.ok(
    missingConditionPreview.userFacingBlockers.some((blocker) =>
      blocker.nextAction.includes("Accept a positive project cap and explicit cross-view condition"),
    ),
  );
  assert.ok(
    defaultSkipPreview.userFacingBlockers.some((blocker) =>
      blocker.nextAction.includes("Choose Fund this or Fund if different-view support joins"),
    ),
  );
  assert.equal(supportSignalContract.coalitionRoutingPath, `/api/mpgf/rounds/${persistedRound.id}/coalition-routing`);
  assert.match(route, /MPGF_PUBLIC_GOODS_API_HEADERS/);
  assert.match(route, /getMpgfPublicGoodsCoalitionRoutingReportApi/);
  assert.match(route, /buildMpgfPublicGoodsCoalitionRoutingReport/);
  assert.match(route, /loadMpgfPublicGoodsAllocationContext/);
  assert.match(route, /loadMpgfPublicGoodsAllocationContributionRecords/);
  assert.match(route, /loadMpgfPublicGoodsSupportSignalsForRound/);
  assert.match(route, /contextLoad\.source === "database_round_context"/);
  assert.match(route, /allocationContextSource/);
  assert.match(route, /contributionSource/);
  assert.match(route, /supportSignalSource/);
  assert.match(route, /Could not load persisted MPGF coalition-routing state/);
  assert.match(roundRoute, /supportSignalSource/);
  assert.match(budgetPreviewRoute, /Sign in to preview moral public goods/);
  assert.match(budgetPreviewRoute, /savePreview/);
  assert.match(budgetPreviewRoute, /persistCommonGroundBudgetPreview/);
  assert.match(budgetPreviewRoute, /preview\.activationState !== "ready_for_confirmation"/);
  assert.match(budgetPreviewRoute, /not_saved_confirmation_required/);
  assert.match(budgetPreviewRoute, /missingMpgfCrecFinalReviewAcknowledgementKeys/);
  assert.match(budgetPreviewRoute, /not_saved_final_review_required/);
  assert.match(budgetPreviewRoute, /rulebook_hash_at_consent: rulebookHashAtConsent/);
  assert.match(budgetPreviewRoute, /finalReviewAcknowledgementHash/);
  assert.match(budgetPreviewRoute, /\.from\("mpgf_user_budgets"\)/);
  assert.match(budgetPreviewRoute, /\.from\("mpgf_support_stances"\)/);
  assert.match(budgetPreviewRoute, /\.from\("mpgf_conditional_trade_intents"\)/);
  assert.match(budgetPreviewRoute, /onConflict: "round_id,user_ref_hash"/);
  assert.match(budgetPreviewRoute, /onConflict: "id"/);
  assert.match(budgetPreviewRoute, /common_ground_budget_preview_saved/);
  assert.match(budgetPreviewRoute, /savedConditionalIntentCount/);
  assert.match(budgetPreviewRoute, /paymentCaptureAllowed: false/);
  assert.match(budgetPreviewRoute, /conditionAccepted/);
  assert.match(budgetPreviewRoute, /acceptableCounterBucketIds/);
  assert.match(budgetPreviewRoute, /minCounterpartyVolumeCents/);
  assert.match(budgetPreviewRoute, /reviewSignalVisibilityField/);
  assert.match(budgetPreviewRoute, /reviewSignalVisibility: reviewSignalVisibilityField\(record\.reviewSignalVisibility\)/);
  assert.match(budgetPreviewRoute, /review_signal_visibility: row\.reviewSignalVisibility/);
  assert.match(budgetPreviewRoute, /counts_for_common_ground: row\.stance === "strong" \|\| row\.stance === "weak"/);
  assert.match(budgetPreviewRoute, /stateMutation/);
  assert.match(budgetPreviewRoute, /paymentCaptureAllowed/);
  assert.match(budgetPreviewRoute, /releaseGateRequirementBundle/);
  assert.match(budgetPreviewRoute, /loadMpgfPublicGoodsAllocationContext/);
  assert.match(budgetPreviewRoute, /perProjectCapCents/);
  assert.match(budgetPreviewRoute, /nextCaptureAt/);
  assert.match(budgetPreviewRoute, /nextCaptureRule/);
  assert.match(budgetPreviewRoute, /per_project_cap_cents: preview\.perProjectCapCents/);
  assert.match(budgetPreviewRoute, /next_capture_at: preview\.nextCaptureAt/);
  assert.match(budgetPreviewRoute, /next_capture_rule: preview\.nextCaptureRule/);
  assert.match(publicApi, /coalitionRouting/);
  assert.match(publicApi, /commonGroundBudget/);
  assert.match(publicApi, /releaseGateRequirementCount/);
  assert.match(publicApi, /savePreviewStateMutation/);
  assert.match(publicApi, /savePreviewRequiresParticipantSurplusConfirmation/);
  assert.match(publicApi, /savePreviewPaymentCaptureAllowed/);
  assert.match(
    publicApi,
    /savedRecords: \["mpgf_user_budgets", "mpgf_support_stances", "mpgf_conditional_trade_intents"\]/,
  );
  assert.match(publicApi, /laterStageTracksFailClosed/);
  assert.match(publicApi, /common-ground-budget-preview/);
  assert.match(publicApi, /routedWeakSupportBudgetCents/);
  assert.match(roundPage, /Coalition-routed common-ground budget/);
  assert.match(roundPage, /moral public goods preview/);
  assert.match(roundPage, /moral public goods guided setup checklist/);
  assert.match(roundPage, /1\. Choose budget/);
  assert.match(roundPage, /2\. Pick projects/);
  assert.match(roundPage, /3\. Review and save/);
  assert.match(roundPage, /Non-binding preview/);
  assert.match(roundPage, /You are not charged now/);
  assert.match(roundPage, /final review screen\s+remains the consent boundary/);
  assert.match(roundPage, /Preview release gate/);
  assert.match(roundPage, /Later-stage controls held back/);
  assert.match(roundPage, /Choose your maximum/);
  assert.match(roundPage, /Budget type/);
  assert.match(roundPage, /One-time/);
  assert.match(roundPage, /Every round \(requires final review\)/);
  assert.match(roundPage, /Maximum this round, cents/);
  assert.match(roundPage, /Maximum monthly, cents/);
  assert.match(roundPage, /Per-project cap, cents/);
  assert.match(roundPage, /Next capture rule/);
  assert.match(roundPage, /Next capture at/);
  assert.match(roundPage, /perProjectCapCents/);
  assert.match(roundPage, /nextCaptureRule/);
  assert.match(roundPage, /nextCaptureAt/);
  assert.match(roundPage, /Maximum this round/);
  assert.doesNotMatch(roundPage, /Maximum budget/);
  assert.match(roundPage, /No charge in this preview/);
  assert.match(roundPage, /Possible allocation if gates pass/);
  assert.match(roundPage, /Possible routed if gates pass/);
  assert.doesNotMatch(roundPage, /Guaranteed base match/);
  assert.doesNotMatch(roundPage, /Projected allocation/);
  assert.doesNotMatch(roundPage, /Projected routed/);
  assert.doesNotMatch(roundPage, /Budget period/);
  assert.doesNotMatch(roundPage, /Monthly budget, cents/);
  assert.doesNotMatch(roundPage, /Round budget, cents/);
  assert.match(roundPage, /If something does not clear/);
  assert.match(roundPage, /Try another approved project/);
  assert.match(roundPage, /Cancel authorization or release hold if applicable/);
  assert.match(roundPage, /If budget cannot be routed/);
  assert.doesNotMatch(roundPage, /Unroutable budget/);
  assert.match(roundPage, /Privacy/);
  assert.match(roundPage, /Aggregate only/);
  assert.match(roundPage, /Payment method/);
  assert.match(roundPage, /Save payment method/);
  assert.match(roundPage, /A saved card is not a charge, hold, authorization, escrow, custody event/);
  assert.match(roundPage, /or guarantee that a later authorization will succeed/);
  assert.match(roundPage, /Details you are agreeing to/);
  assert.match(roundPage, /Safe defaults become binding only after the final review screen shows them/);
  assert.match(roundPage, /Pick projects with the plain-language choices below/);
  assert.match(roundPage, /MPGF_CRECM_PLAIN_LANGUAGE_LABELS/);
  assert.match(roundPage, /COMMON_GROUND_STANCE_OPTIONS/);
  assert.match(roundPage, /id="common-ground-stance-copy-map"/);
  assert.match(roundPage, /aria-describedby="common-ground-stance-copy-map"/);
  assert.match(roundPage, /type="radio"/);
  assert.match(roundPage, /stance-canonical-effect-\$\{row\.campaignId\}-\$\{option\.value\}/);
  assert.match(roundPage, /aria-describedby=\{`\$\{canonicalEffectId\} common-ground-stance-copy-map`\}/);
  assert.match(roundPage, /<small id=\{canonicalEffectId\}>\{option\.canonicalEffect\}<\/small>/);
  assert.match(roundPage, /defaultChecked=\{row\.stance === option\.value\}/);
  assert.match(roundPage, /option\.canonicalEffect/);
  assert.match(roundPage, /ProjectSupportStance\.stance strong/);
  assert.match(roundPage, /ProjectSupportStance\.stance weak/);
  assert.match(roundPage, /ProjectSupportStance\.stance dissent/);
  assert.match(roundPage, /ProjectSupportStance\.stance abstain/);
  assert.match(roundPage, /allocates zero by default/);
  assert.match(roundPage, /reviewSignalVisibilityFromParams/);
  assert.match(roundPage, /reviewSignalVisibility: reviewSignalVisibilityFromParams/);
  assert.match(roundPage, /reviewSignalVisibility: row\.reviewSignalVisibility/);
  assert.match(roundPage, /You chose:/);
  assert.match(roundPage, /Canonical stance:/);
  assert.match(roundPage, /Money allocation: \$0/);
  assert.match(roundPage, /Review note: use the project review-note field below/);
  assert.match(roundPage, /Visibility of review signal/);
  assert.match(roundPage, /reviewSignalVisibility_\$\{row\.campaignId\}/);
  assert.match(roundPage, /Defaults to aggregate-only and does not create allocation power/);
  assert.match(roundPage, /No support, opposition, or allocatable intent is\s+inferred from skipping/);
  assert.match(roundPage, /Edit condition/);
  assert.match(roundPage, /verified match-eligible support clears from morally/);
  assert.match(roundPage, /Morally distinct buckets/);
  assert.match(roundPage, /Animal welfare, Long-run future, Public-interest knowledge/);
  assert.match(roundPage, /Does not count/);
  assert.match(roundPage, /same-payment-method or same-payment-cluster/);
  assert.match(roundPage, /same-control entities/);
  assert.match(roundPage, /Base match if cleared/);
  assert.match(roundPage, /Capped diversity-aware post-clear sponsor bonus/);
  assert.match(roundPage, /Contributor benefit/);
  assert.match(roundPage, /Coordination credits \/ impact certificate/);
  assert.match(roundPage, /Self-matching exclusions/);
  assert.match(roundPage, /After hard gates and exact authorization reconciliation only/);
  assert.match(roundPage, /Canonical fields/);
  assert.match(roundPage, /ProjectSupportStance\.stance/);
  assert.match(roundPage, /ConditionalTradeIntent\.acceptableCounterBucketIds/);
  assert.match(roundPage, /rulebookHashAtConsent/);
  assert.match(roundPage, /MPGF_CRECM_PLAIN_LANGUAGE_LABELS\.stance\.strong/);
  assert.match(roundPage, /MPGF_CRECM_PLAIN_LANGUAGE_LABELS\.stance\.weak/);
  assert.match(roundPage, /MPGF_CRECM_PLAIN_LANGUAGE_LABELS\.stance\.dissent/);
  assert.match(roundPage, /MPGF_CRECM_PLAIN_LANGUAGE_LABELS\.stance\.abstain/);
  assert.match(roundPage, /Maximum for this project, cents/);
  assert.match(roundPage, /Condition accepted/);
  assert.match(roundPage, /minCounterpartyVolumeCents_/);
  assert.match(roundPage, /acceptableCounterBucketIds_/);
  assert.match(roundPage, /conditionAccepted_/);
  assert.match(roundPage, /conditionalTradeIntent/);
  assert.match(roundPage, /commonGroundStanceLabel/);
  assert.doesNotMatch(roundPage, /Strong support/);
  assert.doesNotMatch(roundPage, /Weak common-ground/);
  assert.match(roundPage, /Your default allocation baseline/);
  assert.match(roundPage, /This routing is acceptable to me relative to my stated default/);
  assert.match(roundPage, /MpgfCommonGroundBudgetSavePanel/);
  assert.match(roundPage, /commonGroundBudgetSavePayload/);
  assert.match(roundPage, /buildMpgfCrecFinalReviewAcknowledgements/);
  assert.match(roundPage, /rulebookHashAtConsent: ecmRulebook\.calcHash/);
  assert.match(roundPage, /projectReviewRows=\{commonGroundBudgetPreview\.rows\.map/);
  assert.match(roundPage, /rulebookHash=\{ecmRulebook\.calcHash\}/);
  assert.match(roundPage, /sourceSpec=\{ecmRulebook\.mechanism\.sourceSpec\}/);
  assert.match(roundPage, /technicalLabel=\{ecmRulebook\.mechanism\.technicalLabel\}/);
  assert.match(roundPage, /redactedNote: searchParamValue\(resolvedSearchParams, `redactedNote_\$\{row\.campaignId\}`\)/);
  assert.match(roundPage, /redactedNote_/);
  assert.match(roundPage, /Review note/);
  assert.match(roundPage, /paymentCaptureAllowed/);
  assert.match(roundPage, /coalition-routing report/);
  assert.match(budgetSavePanel, /"use client"/);
  assert.match(budgetSavePanel, /Save no-capture budget preview/);
  assert.match(budgetSavePanel, /Final review consent boundary/);
  assert.match(budgetSavePanel, /Review your Common Ground Budget/);
  assert.match(budgetSavePanel, /This review screen is the consent boundary/);
  assert.match(budgetSavePanel, /Hidden defaults, suggestions, project-card/);
  assert.match(budgetSavePanel, /status chips, emails, or calculator outputs/);
  assert.match(budgetSavePanel, /MPGF_CRECM_PLAIN_LANGUAGE_LABELS/);
  assert.match(budgetSavePanel, /MPGF_CRECM_ACCOUNTING_CHANNEL_DISCLOSURES/);
  assert.match(budgetSavePanel, /MPGF_CRECM_FINAL_REVIEW_REQUIRED_DISCLOSURES/);
  assert.match(budgetSavePanel, /buildMpgfCrecFinalReviewAcknowledgements/);
  assert.match(budgetSavePanel, /missingMpgfCrecFinalReviewAcknowledgementKeys/);
  assert.match(budgetSavePanel, /finalReviewAcknowledgementsComplete/);
  assert.match(budgetSavePanel, /finalReviewDisclosureDescription/);
  assert.match(budgetSavePanel, /getMpgfCrecPlainLanguageLabelForStance/);
  assert.match(budgetSavePanel, /MpgfCrecGuidedStance/);
  assert.match(budgetSavePanel, /MpgfCommonGroundBudgetReviewSignalVisibility/);
  assert.match(budgetSavePanel, /@\/lib\/mpgf\/public-goods-crecm-labels/);
  assert.match(budgetSavePanel, /reviewSignalVisibilityLabel/);
  assert.match(budgetSavePanel, /selected\s+review-signal visibility shown per project/);
  assert.match(budgetSavePanel, /maximumThisRound/);
  assert.match(plainLanguageLabels, /defaultUiText: "Maximum this round"/);
  assert.match(plainLanguageLabels, /defaultUiText: "Maximum for this project"/);
  assert.match(plainLanguageLabels, /defaultUiText: "Fund this"/);
  assert.match(plainLanguageLabels, /defaultUiText: "Fund if different-view support joins"/);
  assert.match(plainLanguageLabels, /defaultUiText: "Needs review"/);
  assert.match(plainLanguageLabels, /defaultUiText: "Skip"/);
  assert.match(plainLanguageLabels, /defaultUiText: "Condition"/);
  assert.match(plainLanguageLabels, /defaultUiText: "Sent to project"/);
  assert.match(plainLanguageLabels, /defaultUiText: "Counts for matching"/);
  assert.match(plainLanguageLabels, /defaultUiText: "Sponsor added"/);
  assert.match(plainLanguageLabels, /defaultUiText: "Contributor benefit"/);
  assert.match(plainLanguageLabels, /createsAlternateSemantics: false/);
  assert.match(budgetSavePanel, /Per-project cap/);
  assert.match(budgetSavePanel, /Next capture rule/);
  assert.match(budgetSavePanel, /Next capture/);
  assert.match(budgetSavePanel, /no capture happens\s+before final review/);
  assert.match(budgetSavePanel, /Payment/);
  assert.match(budgetSavePanel, /Saved method required for final clearing; no charge or hold now/);
  assert.match(budgetSavePanel, /If something does not clear/);
  assert.match(budgetSavePanel, /Privacy/);
  assert.match(budgetSavePanel, /Project stances and review notes stay participant\/reviewer-only/);
  assert.match(budgetSavePanel, /public output is aggregate only/);
  assert.match(budgetSavePanel, /Sealed progress/);
  assert.match(budgetSavePanel, /Exact live threshold and counterparty gaps hidden until close/);
  assert.match(budgetSavePanel, /Projects/);
  assert.match(budgetSavePanel, /canonical \{project\.stance\}/);
  assert.match(budgetSavePanel, /condition accepted/);
  assert.match(budgetSavePanel, /condition still missing/);
  assert.match(budgetSavePanel, /Private review note:/);
  assert.match(budgetSavePanel, /Review signal visibility:/);
  assert.match(budgetSavePanel, /project\.reviewSignalVisibility/);
  assert.match(budgetSavePanel, /reviewer-only/);
  assert.match(plainLanguageLabels, /label: "Failure-bonus denial categories"/);
  assert.match(budgetSavePanel, /review-not-approved, challenge-blocked, anti-threat, destination/);
  assert.match(budgetSavePanel, /project-identity\/destination-route, externality, conflict, sponsor/);
  assert.match(budgetSavePanel, /legal\/custody, identity, sybil, collusion, authorization, and user-consent/);
  assert.match(budgetSavePanel, /canonical ConditionalTradeIntent records/);
  assert.match(budgetSavePanel, /Minimum verified counterparty volume/);
  assert.match(budgetSavePanel, /explicit conditional-intent setup record/);
  assert.match(budgetSavePanel, /What you may see after settlement/);
  assert.match(budgetSavePanel, /Charged from you: gross captured amount, if any/);
  assert.match(budgetSavePanel, /sentToProject/);
  assert.match(budgetSavePanel, /net recipient-disbursed public-good dollars/);
  assert.match(budgetSavePanel, /countsForMatching/);
  assert.match(budgetSavePanel, /counted and match-eligible dollars/);
  assert.match(budgetSavePanel, /sponsorAdded/);
  assert.match(budgetSavePanel, /base match and capped bonus, if backed and eligible/);
  assert.match(budgetSavePanel, /contributorBenefit/);
  assert.match(budgetSavePanel, /success reward \/ coordination credit \/ impact/);
  assert.match(budgetSavePanel, /Failed projects: refund, reroute, carry-forward, or cancellation according to your fallback/);
  assert.match(budgetSavePanel, /Required details/);
  assert.match(budgetSavePanel, /Detailed accounting channels/);
  assert.match(budgetSavePanel, /Detailed accounting channel disclosure/);
  assert.match(budgetSavePanel, /channel\.canonicalField/);
  assert.match(budgetSavePanel, /These channels stay separated before consent and on receipts/);
  assert.match(budgetSavePanel, /combined into one impact or matched total/);
  assert.match(budgetSavePanel, /Suggested defaults are not binding unless shown on this review screen and explicitly/);
  assert.match(budgetSavePanel, /I reviewed this detail before save/);
  assert.match(budgetSavePanel, /Required acknowledgements remaining/);
  assert.match(budgetSavePanel, /rulebookHashAtConsent: rulebookHash/);
  assert.match(plainLanguageLabels, /label: "Binding caps"/);
  assert.match(plainLanguageLabels, /label: "Cross-view conditions"/);
  assert.match(plainLanguageLabels, /label: "Counterpart buckets"/);
  assert.match(plainLanguageLabels, /label: "Fallback rule"/);
  assert.match(plainLanguageLabels, /label: "Payment language"/);
  assert.match(plainLanguageLabels, /label: "Fee treatment"/);
  assert.match(plainLanguageLabels, /label: "Reward, credit, and certificate opt-ins"/);
  assert.match(budgetSavePanel, /Success-reward, coordination-credit, and impact-certificate opt-ins are off unless/);
  assert.match(budgetSavePanel, /require captured successful contribution rows/);
  assert.match(budgetSavePanel, /cannot be\s+retroactively obtained by non-signers or late signers/);
  assert.match(budgetSavePanel, /never count as\s+public-good dollars or allocation power/);
  assert.match(plainLanguageLabels, /label: "Self-matching exclusions"/);
  assert.match(budgetSavePanel, /same payment cluster/);
  assert.match(budgetSavePanel, /same-control entity support/);
  assert.match(plainLanguageLabels, /label: "Sealed-progress behavior"/);
  assert.match(plainLanguageLabels, /label: "Failure-bonus denial categories"/);
  assert.match(budgetSavePanel, /Rulebook hash/);
  assert.match(budgetSavePanel, /not legal escrow, are not custody-backed, and are not payment protection/);
  assert.match(budgetSavePanel, /Gross, fee, net recipient, actual, counted, and match-eligible/);
  assert.match(plainLanguageLabels, /key: "possible_captured_amount"/);
  assert.match(plainLanguageLabels, /label: "Possible captured amount"/);
  assert.match(plainLanguageLabels, /label: "Gross captured exposure"/);
  assert.match(plainLanguageLabels, /label: "Sponsor base match"/);
  assert.match(plainLanguageLabels, /label: "Sponsor bonus match"/);
  assert.match(plainLanguageLabels, /label: "Success rewards"/);
  assert.match(plainLanguageLabels, /label: "Coordination credits"/);
  assert.match(plainLanguageLabels, /label: "Impact certificates"/);
  assert.match(plainLanguageLabels, /mayBeCombinedIntoImpactTotal: false/);
  assert.match(budgetSavePanel, /fetch\(apiPath/);
  assert.match(budgetSavePanel, /JSON\.stringify\(\{/);
  assert.match(budgetSavePanel, /\.\.\.payload/);
  assert.match(budgetSavePanel, /finalReviewAcknowledgements,/);
  assert.match(budgetSavePanel, /rulebookHashAtConsent: rulebookHash/);
  assert.match(budgetSavePanel, /activationState === "ready_for_confirmation"/);
  assert.match(budgetSavePanel, /blockedReasonCount === 0/);
  assert.match(budgetSavePanel, /participantConfirmationHash/);
  assert.match(budgetSavePanel, /paymentCaptureAllowed: false/);
  assert.match(budgetSavePanel, /saved_no_capture/);
  assert.match(budgetSavePanel, /No payment capture was authorized/);
  assert.match(budgetSavePanel, /Save Common Ground Budget/);

  for (const table of [
    "mpgf_user_budgets",
    "mpgf_support_stances",
    "mpgf_coalition_candidates",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(schemaSql, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`comment on table public\\.${table}`));
    assert.match(schemaSql, new RegExp(`comment on table public\\.${table}`));
  }
  assert.match(
    conditionalIntentMigration,
    /create table if not exists public\.mpgf_conditional_trade_intents/,
  );
  assert.match(
    schemaSql,
    /create table if not exists public\.mpgf_conditional_trade_intents/,
  );
  assert.match(conditionalIntentMigration, /condition_accepted boolean not null default false/);
  assert.match(conditionalIntentMigration, /payment_capture_allowed boolean not null default false/);
  assert.match(conditionalIntentMigration, /final_review_disclosure_required boolean not null default true/);
  assert.match(conditionalIntentMigration, /grant select, insert, update on public\.mpgf_conditional_trade_intents/);
  assert.match(conditionalIntentMigration, /comment on table public\.mpgf_conditional_trade_intents/);

  assert.match(migration, /stance in \('strong', 'weak', 'dissent', 'abstain'\)/);
  assert.match(migration, /budget_period text not null default 'monthly'/);
  assert.match(migration, /default_allocation_baseline text not null/);
  assert.match(migration, /participant_surplus_confirmation_required boolean not null default true/);
  assert.match(migration, /eligible_project_set_hash text not null/);
  assert.match(migration, /fallback_eligible_project_set_hash text not null/);
  assert.match(migration, /unroutable_budget_policy text not null default 'carry_forward'/);
  assert.match(migration, /round_lock_confirmation_required boolean not null default true/);
  assert.match(migration, /participant_confirmation_hash text/);
  assert.match(migration, /rank_order integer/);
  assert.match(migration, /redacted_note_hash text/);
  assert.match(reviewSignalVisibilityMigration, /add column if not exists review_signal_visibility text not null default 'aggregate_only'/);
  assert.match(reviewSignalVisibilityMigration, /review_signal_visibility in \('aggregate_only', 'pseudonymous', 'public'\)/);
  assert.match(reviewSignalVisibilityMigration, /does not create allocation power/);
  assert.match(migration, /threshold_feasible_flag boolean not null default false/);
  assert.match(migration, /failure_bonus_or_carry_forward_eligible boolean not null default false/);
  assert.match(migration, /mpgf_user_budgets_write_own/);
  assert.match(migration, /mpgf_support_stances_write_own/);
  assert.match(schemaSql, /budget_period text not null default 'monthly'/);
  assert.match(schemaSql, /per_project_cap_cents bigint not null default 0/);
  assert.match(schemaSql, /next_capture_at timestamptz/);
  assert.match(schemaSql, /next_capture_rule text not null default 'none_before_final_review'/);
  assert.match(schemaSql, /default_allocation_baseline text not null/);
  assert.match(schemaSql, /participant_surplus_confirmation_required boolean not null default true/);
  assert.match(schemaSql, /eligible_project_set_hash text not null/);
  assert.match(schemaSql, /fallback_eligible_project_set_hash text not null/);
  assert.match(schemaSql, /unroutable_budget_policy text not null default 'carry_forward'/);
  assert.match(schemaSql, /round_lock_confirmation_required boolean not null default true/);
  assert.match(schemaSql, /participant_confirmation_hash text/);
  assert.match(schemaSql, /rank_order integer/);
  assert.match(schemaSql, /redacted_note_hash text/);
  assert.match(schemaSql, /review_signal_visibility text not null default 'aggregate_only'/);
  assert.match(schemaSql, /review-signal visibility/);
  assert.match(schemaSql, /mpgf_coalition_candidates_public_select/);
  assert.match(schemaSql, /mpgf_user_budgets_write_own/);
  assert.match(schemaSql, /mpgf_support_stances_write_own/);
  assert.match(schemaSql, /grant select on[\s\S]*public\.mpgf_coalition_candidates[\s\S]*to anon, authenticated/);
  assert.match(capsCaptureMigration, /add column if not exists per_project_cap_cents bigint not null default 0/);
  assert.match(capsCaptureMigration, /add column if not exists next_capture_at timestamptz/);
  assert.match(capsCaptureMigration, /add column if not exists next_capture_rule text not null default 'none_before_final_review'/);
  assert.match(capsCaptureMigration, /moral public goods candidate allocation/);
  assert.match(capsCaptureMigration, /no preview capture authority/);

  for (const forbidden of [
    "private-persisted-coalition-strong",
    "private-persisted-coalition-weak-a",
    "private-persisted-coalition-weak-b",
    "redactedReference",
    "supporterReason",
    "moralReputationScore",
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
  const refillPlan = buildMpgfPublicGoodsSponsorPoolRefillAutomationPlan();
  const api = getMpgfPublicGoodsSponsorPoolFlywheelApi(demoMpgfMatchPool.id);
  const unknown = getMpgfPublicGoodsSponsorPoolFlywheelApi("unknown-pool");
  const serialized = JSON.stringify({ flywheel, refillPlan });
  const route = readFileSync("src/app/api/mpgf/sponsor-pools/[poolId]/route.ts", "utf8");
  const governance = getMpgfPublicGoodsGovernanceApi();
  const governancePage = readFileSync("src/app/mpgf/governance/page.tsx", "utf8");
  const migration = readFileSync("supabase/migrations/20260531_mpgf_sponsor_pool_flywheel.sql", "utf8");
  const automationMigration = readFileSync("supabase/migrations/20260601_mpgf_sponsor_pool_refill_automation.sql", "utf8");

  assert.ok(api);
  assert.equal(unknown, null);
  assert.equal(flywheel.privacyPolicy, MPGF_PUBLIC_GOODS_SPONSOR_FLYWHEEL_PRIVACY_POLICY);
  assert.equal(flywheel.flywheelPolicy, "trade_surplus_funded_verified_plural_assurance");
  assert.equal(flywheel.custodyMode, "partner_or_provider_held_not_platform_custody");
  assert.equal(flywheel.refillAutomation.policy, MPGF_PUBLIC_GOODS_SPONSOR_POOL_REFILL_AUTOMATION_POLICY);
  assert.equal(flywheel.refillAutomation.routesToFutureRoundsOnly, true);
  assert.equal(flywheel.refillAutomation.noSponsorCampaignSteering, true);
  assert.equal(flywheel.refillAutomation.availableForNextRoundCents, 50_000);
  assert.equal(refillPlan.policy, flywheel.refillAutomation.policy);
  assert.equal(refillPlan.entries.length, 3);
  assert.equal(refillPlan.entries.every((entry) => entry.scheduledForRoundId.endsWith(":next")), true);
  assert.equal(refillPlan.entries.every((entry) => entry.sourceRefHash.startsWith("sha256:")), true);
  assert.equal(refillPlan.entries.every((entry) => entry.countsTowardMatching), true);
  assert.ok(refillPlan.publishedShareRules.some((rule) => rule.sourceType === "recurring_member_tithe" && rule.routeShareBps === 10_000));
  assert.ok(refillPlan.publishedShareRules.some((rule) => rule.sourceType === "donation_offset_surplus" && rule.routeShareBps === 5_000));
  assert.ok(refillPlan.publishedShareRules.some((rule) => rule.sourceType === "trade_surplus_tithe" && rule.routeShareBps === 5_000));
  assert.match(refillPlan.calcHash, /^sha256:/);
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
  assert.equal(governance.sponsorPoolFlywheel.refillAutomationPolicy, MPGF_PUBLIC_GOODS_SPONSOR_POOL_REFILL_AUTOMATION_POLICY);
  assert.equal(governance.sponsorPoolFlywheel.nextRoundRefillCents, 50_000);
  assert.equal(governance.sponsorPoolFlywheel.noSponsorCampaignSteering, true);
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
  assert.match(automationMigration, /route_share_bps/);
  assert.match(automationMigration, /scheduled_for_round_id/);
  assert.match(automationMigration, /provider_event_verified/);
  assert.match(automationMigration, /reviewer_approved/);
  assert.match(automationMigration, /sponsors cannot steer a specific campaign/);

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
  const realMoneyTermsPage = readFileSync("src/app/mpgf/real-money-terms/page.tsx", "utf8");

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
  assert.equal(governance.legalComplianceReadiness.productionMoneyMovementAllowed, false);
  assert.equal(governance.legalComplianceReadiness.externalCounselApprovalRequired, true);
  assert.equal(governance.legalComplianceReadiness.partnerHeldCustodyRequired, true);
  assert.ok(
    governance.legalComplianceReadiness.requiredBeforeRealMoney.some((gate) => gate.key === "aml_kyc_screening"),
  );
  assert.ok(
    governance.legalComplianceReadiness.requiredBeforeRealMoney.some((gate) => gate.key === "sanctions_screening"),
  );
  assert.ok(governance.legalComplianceReadiness.publicArtifacts.length >= 7);
  assert.equal(governance.incidentAndDisputeLane.pausesUnreleasedMilestones, true);
  assert.ok(governance.whatRoundDoesNotDecide.some((note) => /No global moral ranking/i.test(note)));
  assert.ok(governance.prohibitedGovernanceMechanisms.includes("token_voting"));
  assert.ok(governance.prohibitedGovernanceMechanisms.includes("public_reputation_weighted_donor_power"));
  assert.ok(
    governance.deploymentChecklist.beforeProd.some(
      (item) => item.key === "legal_review" && item.status === "pending_external_review",
    ),
  );
  assert.ok(governance.postmortem);
  assert.equal(governance.postmortem.publicPostmortemTemplatePublished, true);
  assert.equal(governance.postmortem.currentRoundMutationAllowed, false);
  assert.ok(
    governance.deploymentChecklist.beforeProd.some(
      (item) => item.key === "public_postmortem_template" && item.status === "published",
    ),
  );
  assert.ok(
    governance.deploymentChecklist.beforeProd.some(
      (item) => item.key === "aml_kyc_sanctions_framework" && item.status === "published_framework_pending_external_review",
    ),
  );
  assert.equal(validateMpgfLegalReadinessArtifacts().status, "passed");

  for (const forbidden of ["private@example", "charityReceiptRef", "externalReceiptRef", "supporterReason"]) {
    assert.equal(governanceJson.includes(forbidden), false);
  }

  for (const expected of [
    /Named operator roster/,
    /Reviewer panel structure/,
    /Locked round parameters/,
    /Public postmortem/,
    /Campaign thresholds/,
    /Funds-flow separation/,
    /Partner-held roles/,
    /Legal and compliance readiness/,
    /Compliance gates/,
    /Public incident and dispute lane/,
    /What this round does not decide/,
    /No global moral ranking/,
    /Prohibited governance mechanisms/,
    /Deployment checklist/,
  ]) {
    assert.match(governancePage, expected);
  }

  assert.match(governanceRoute, /loadMpgfPhaseOneGovernanceState/);
  assert.match(mpgfHubPage, /\/mpgf\/governance/);
  assert.match(roundPage, /\/mpgf\/governance/);
  assert.match(realMoneyTermsPage, /AML, KYC, KYB, sanctions, and charity-law checks remain external gates/);
  assert.match(realMoneyTermsPage, /must pass before a payment is represented as complete/);
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

test("MPGF identity integrity report aggregates sybil controls without moral reputation", () => {
  const report = getMpgfPublicGoodsIdentityIntegrityReportApi(demoMpgfAssuranceRound.id);
  const unknownReport = getMpgfPublicGoodsIdentityIntegrityReportApi("unknown-round");
  const directReport = buildMpgfPublicGoodsIdentityIntegrityReport();
  const persistedCampaign = {
    ...demoMpgfPublicGoodsCampaigns[0]!,
    id: "persisted-identity-integrity-campaign",
    slug: "persisted-identity-integrity-campaign",
    title: "Persisted identity integrity campaign",
  };
  const persistedRound = {
    ...demoMpgfAssuranceRound,
    id: "persisted-identity-integrity-round",
    matchPoolId: demoMpgfMatchPool.id,
  };
  const eligibleIdentity = createMpgfPublicGoodsIdentityAttestation({
    userId: "persisted-identity-eligible",
    provider: "external_proof_of_personhood",
    humanScoreBps: 9_200,
    expiresAt: "2026-12-31T00:00:00.000Z",
    redactedReference: "external_proof_of_personhood:redacted:persisted-eligible",
  });
  const duplicateIdentity = createMpgfPublicGoodsIdentityAttestation({
    userId: "persisted-identity-duplicate",
    provider: "repository_profile",
    humanScoreBps: 8_000,
    expiresAt: "2026-12-31T00:00:00.000Z",
    redactedReference: "repository_profile:redacted:persisted-duplicate",
  });
  const persistedPledges = [
    {
      ...createMpgfPublicGoodsPledge({
        campaign: persistedCampaign,
        userId: eligibleIdentity.userId,
        amountCents: 10_000,
        identityAttestation: eligibleIdentity,
      }),
      status: "captured" as const,
    },
    createMpgfPublicGoodsPledge({
      campaign: persistedCampaign,
      userId: duplicateIdentity.userId,
      amountCents: 8_000,
      identityAttestation: duplicateIdentity,
      duplicateUserRefs: [duplicateIdentity.userId],
    }),
    createMpgfPublicGoodsPledge({
      campaign: persistedCampaign,
      userId: "persisted-identity-pending-review",
      amountCents: 7_500,
    }),
  ] satisfies MpgfPublicGoodsPledge[];
  const persistedReport = buildMpgfPublicGoodsIdentityIntegrityReport({
    campaigns: [persistedCampaign],
    pledges: persistedPledges,
    round: persistedRound,
    matchPool: demoMpgfMatchPool,
    attestations: [],
  });
  const route = readFileSync("src/app/api/mpgf/rounds/[roundId]/identity-integrity/route.ts", "utf8");
  const publicApi = readFileSync("src/lib/mpgf/public-goods-api.ts", "utf8");
  const roundPage = readFileSync("src/app/mpgf/rounds/[roundId]/page.tsx", "utf8");

  assert.ok(report);
  assert.equal(unknownReport, null);
  assert.equal(report.policy, MPGF_PUBLIC_GOODS_IDENTITY_INTEGRITY_POLICY);
  assert.equal(directReport.policy, report.policy);
  assert.equal(report.privacyPolicy, "aggregate_only_no_raw_identity_evidence_or_contact_data");
  assert.equal(report.qfWeightPolicy, "identity_confidence_only_no_moral_reputation");
  assert.equal(report.uniqueHumanityPolicy, "duplicate_identity_review_and_non_moral_human_score_thresholds");
  assert.equal(report.noGlobalMoralRanking, true);
  assert.equal(report.noMoralReputationWeighting, true);
  assert.equal(report.identityCanAffectEligibilityOrWeight, true);
  assert.equal(report.commonGroundSignalsExcludedFromAllocationPower, true);
  assert.equal(report.supportSignalStrengthExcludedFromAllocationPower, true);
  assert.equal(report.rawProviderPayloadsExcluded, true);
  assert.equal(report.publicIndividualScoresExcluded, true);
  assert.equal(persistedReport.roundId, persistedRound.id);
  assert.equal(persistedReport.counters.eligiblePledgeCount, 1);
  assert.equal(persistedReport.counters.eligibleDistinctIdentityCount, 1);
  assert.equal(persistedReport.counters.duplicateIdentityCount, 1);
  assert.equal(persistedReport.counters.pendingReviewCount, 1);
  assert.equal(persistedReport.providerCounts.unlinked_identity_score, 1);
  assert.equal(persistedReport.noMoralReputationWeighting, true);
  assert.equal(persistedReport.supportSignalStrengthExcludedFromAllocationPower, true);
  assert.ok(report.providerModes.some((mode) => mode.provider === "external_proof_of_personhood"));
  assert.ok(report.providerModes.every((mode) => mode.rawProviderPayloadStored === false));
  assert.ok(report.providerModes.every((mode) => mode.contactDataStored === false));
  assert.equal(
    report.counters.activePledgeCount,
    demoMpgfAssurancePledges.filter((pledge) => pledge.status === "pledged" || pledge.status === "captured").length,
  );
  assert.equal(
    report.counters.eligibleDistinctIdentityCount,
    new Set(demoMpgfAssurancePledges.filter((pledge) => pledge.eligibilityState === "eligible").map((pledge) => pledge.userId)).size,
  );
  assert.ok(report.counters.duplicateIdentityCount > 0);
  assert.ok(report.counters.nonCountedPledgeCount >= report.counters.duplicateIdentityCount);
  assert.ok(report.counters.qfWeightedDirectCents <= report.counters.rawEligibleDirectCents);
  assert.equal(report.counters.externalProofEligibleCount, report.providerCounts.external_proof_of_personhood);
  assert.equal(report.counters.repositoryProfileEligibleCount, report.providerCounts.repository_profile);
  assert.equal(report.counters.demoSelfAttestationEligibleCount, report.providerCounts.demo_self_attestation);
  assert.equal(report.counters.unlinkedIdentityScoreEligibleCount, report.providerCounts.unlinked_identity_score);
  const animalRow = report.rows.find((row) => row.campaignId === "campaign-animal-welfare-transition");
  assert.ok(animalRow);
  assert.equal(animalRow.duplicateIdentityCount, 1);
  assert.equal(animalRow.sybilReviewRequired, true);
  assert.match(animalRow.calculationHash, /^sha256:/);
  assert.ok(report.rows.every((row) => row.qfWeightedDirectCents <= row.rawEligibleDirectCents));
  assert.match(report.calcHash, /^sha256:/);
  assert.match(route, /MPGF_PUBLIC_GOODS_API_HEADERS/);
  assert.match(route, /getMpgfPublicGoodsIdentityIntegrityReportApi/);
  assert.match(route, /buildMpgfPublicGoodsIdentityIntegrityReport/);
  assert.match(route, /loadMpgfPublicGoodsAllocationContext/);
  assert.match(route, /loadMpgfPublicGoodsAllocationContributionRecords/);
  assert.match(route, /contextLoad\.source === "database_round_context"/);
  assert.match(route, /attestations: \[\]/);
  assert.match(route, /allocationContextSource/);
  assert.match(route, /contributionSource/);
  assert.match(route, /identityAttestationSource/);
  assert.match(publicApi, /identityIntegrity/);
  assert.match(publicApi, /noMoralReputationWeighting/);
  assert.match(publicApi, /supportSignalStrengthExcludedFromAllocationPower/);
  assert.match(roundPage, /Identity and sybil integrity/);
  assert.match(roundPage, /Moral reputation never affects allocation power/);
  assert.match(roundPage, /aggregate identity-integrity report/);

  const serialized = JSON.stringify(report);

  for (const forbidden of [
    "demo-supporter",
    "supporterReason",
    "redactedReference",
    "providerPayload",
    "private@example",
    "repo-profile:alix",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("MPGF threshold calibration recommends next-round gates without mid-round retuning", () => {
  const report = getMpgfPublicGoodsThresholdCalibrationReportApi(demoMpgfAssuranceRound.id);
  const unknownReport = getMpgfPublicGoodsThresholdCalibrationReportApi("unknown-round");
  const directReport = buildMpgfPublicGoodsThresholdCalibrationReport();
  const persistedCampaign = {
    ...demoMpgfPublicGoodsCampaigns[0]!,
    id: "persisted-threshold-calibration-campaign",
    slug: "persisted-threshold-calibration-campaign",
    title: "Persisted threshold calibration campaign",
    thresholdAmountCents: 10_000,
    thresholdSupporters: 2,
  };
  const persistedRound = {
    ...demoMpgfAssuranceRound,
    id: "persisted-threshold-calibration-round",
    matchPoolId: demoMpgfMatchPool.id,
  };
  const persistedIdentity = createMpgfPublicGoodsIdentityAttestation({
    userId: "persisted-threshold-supporter",
    provider: "external_proof_of_personhood",
    humanScoreBps: 9_100,
    expiresAt: "2026-12-31T00:00:00.000Z",
    redactedReference: "external_proof_of_personhood:redacted:persisted-threshold",
  });
  const persistedReport = buildMpgfPublicGoodsThresholdCalibrationReport({
    campaigns: [persistedCampaign],
    pledges: [
      createMpgfPublicGoodsPledge({
        campaign: persistedCampaign,
        userId: persistedIdentity.userId,
        amountCents: 11_000,
        identityAttestation: persistedIdentity,
      }),
      createMpgfPublicGoodsPledge({
        campaign: persistedCampaign,
        userId: "persisted-threshold-pending-review",
        amountCents: 4_000,
      }),
    ],
    round: persistedRound,
    matchPool: demoMpgfMatchPool,
  });
  const route = readFileSync("src/app/api/mpgf/rounds/[roundId]/threshold-calibration/route.ts", "utf8");
  const publicApi = readFileSync("src/lib/mpgf/public-goods-api.ts", "utf8");
  const governance = getMpgfPublicGoodsGovernanceApi();
  const governancePage = readFileSync("src/app/mpgf/governance/page.tsx", "utf8");

  assert.ok(report);
  assert.equal(unknownReport, null);
  assert.equal(report.policy, MPGF_PUBLIC_GOODS_THRESHOLD_CALIBRATION_POLICY);
  assert.equal(directReport.policy, report.policy);
  assert.equal(report.privacyPolicy, "aggregate_only_no_private_support_reasons_or_donor_rows");
  assert.equal(report.appliesTo, "next_round_only_after_public_postmortem");
  assert.equal(report.currentRoundMutationAllowed, false);
  assert.equal(report.parametersLockedBeforeDonationsOpen, true);
  assert.equal(report.noGlobalMoralRanking, true);
  assert.equal(report.ranksOperationalCalibrationOnly, true);
  assert.equal(persistedReport.roundId, persistedRound.id);
  assert.equal(persistedReport.currentRoundMutationAllowed, false);
  assert.equal(persistedReport.parametersLockedBeforeDonationsOpen, true);
  assert.equal(persistedReport.rowCount, 1);
  assert.equal(persistedReport.rows[0]?.campaignId, persistedCampaign.id);
  assert.equal(persistedReport.rows[0]?.currentVerifiedSupporters, 1);
  assert.equal(report.rowCount, demoMpgfPublicGoodsCampaigns.length);
  assert.equal(report.rows.every((row) => row.recommendedNextRoundThresholdAmountCents > 0), true);
  assert.equal(report.rows.every((row) => row.recommendedNextRoundThresholdSupporters >= 2), true);
  assert.equal(report.rows.every((row) => /^sha256:/.test(row.calculationHash)), true);
  assert.ok(report.rows.some((row) => row.reasonCodes.includes("current_threshold_cleared")));
  assert.ok(report.rows.some((row) => row.reasonCodes.some((reason) => reason.startsWith("review_status_"))));
  assert.match(report.calcHash, /^sha256:/);
  assert.ok(governance.thresholdCalibration);
  assert.equal(governance.thresholdCalibration.currentRoundMutationAllowed, false);
  assert.equal(governance.thresholdCalibration.rows.length, demoMpgfPublicGoodsCampaigns.length);
  assert.match(route, /MPGF_PUBLIC_GOODS_API_HEADERS/);
  assert.match(route, /getMpgfPublicGoodsThresholdCalibrationReportApi/);
  assert.match(route, /buildMpgfPublicGoodsThresholdCalibrationReport/);
  assert.match(route, /loadMpgfPublicGoodsAllocationContext/);
  assert.match(route, /loadMpgfPublicGoodsAllocationContributionRecords/);
  assert.match(route, /contextLoad\.source === "database_round_context"/);
  assert.match(route, /allocationContextSource/);
  assert.match(route, /contributionSource/);
  assert.match(publicApi, /thresholdCalibration/);
  assert.match(publicApi, /currentRoundMutationAllowed/);
  assert.match(governancePage, /Next-round threshold calibration/);
  assert.match(governancePage, /Learn from uptake without retuning this round/);
  assert.match(governancePage, /Open threshold-calibration JSON/);

  const serialized = JSON.stringify({ report, governance: governance.thresholdCalibration });

  for (const forbidden of [
    "demo-supporter",
    "supporterReason",
    "private-cg",
    "redactedReference",
    "providerPayload",
    "private@example",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("MPGF public postmortem publishes aggregate outcomes and next-round parameter reset evidence", () => {
  const report = getMpgfPublicGoodsPostmortemReportApi(demoMpgfAssuranceRound.id);
  const unknownReport = getMpgfPublicGoodsPostmortemReportApi("unknown-round");
  const directReport = buildMpgfPublicGoodsPostmortemReport();
  const persistedCampaign = {
    ...demoMpgfPublicGoodsCampaigns[0]!,
    id: "persisted-postmortem-campaign",
    slug: "persisted-postmortem-campaign",
    title: "Persisted postmortem campaign",
    thresholdAmountCents: 10_000,
    thresholdSupporters: 1,
  };
  const persistedRound = {
    ...demoMpgfAssuranceRound,
    id: "persisted-postmortem-round",
    matchPoolId: demoMpgfMatchPool.id,
  };
  const persistedIdentity = createMpgfPublicGoodsIdentityAttestation({
    userId: "persisted-postmortem-supporter",
    provider: "external_proof_of_personhood",
    humanScoreBps: 9_000,
    expiresAt: "2026-12-31T00:00:00.000Z",
    redactedReference: "external_proof_of_personhood:redacted:persisted-postmortem",
  });
  const persistedPledges = [
    createMpgfPublicGoodsPledge({
      campaign: persistedCampaign,
      userId: persistedIdentity.userId,
      amountCents: 12_000,
      identityAttestation: persistedIdentity,
    }),
  ] satisfies MpgfPublicGoodsPledge[];
  const persistedThresholdCalibration = buildMpgfPublicGoodsThresholdCalibrationReport({
    campaigns: [persistedCampaign],
    pledges: persistedPledges,
    round: persistedRound,
    matchPool: demoMpgfMatchPool,
  });
  const persistedPostmortem = buildMpgfPublicGoodsPostmortemReport({
    round: persistedRound,
    kpiSnapshot: buildMpgfPublicGoodsKpiSnapshot({
      campaigns: [persistedCampaign],
      pledges: persistedPledges,
      round: persistedRound,
      matchPool: demoMpgfMatchPool,
      dataSource: "database",
    }),
    thresholdCalibration: persistedThresholdCalibration,
  });
  const route = readFileSync("src/app/api/mpgf/rounds/[roundId]/postmortem/route.ts", "utf8");
  const publicApi = readFileSync("src/lib/mpgf/public-goods-api.ts", "utf8");
  const governance = getMpgfPublicGoodsGovernanceApi();
  const governancePage = readFileSync("src/app/mpgf/governance/page.tsx", "utf8");

  assert.ok(report);
  assert.equal(unknownReport, null);
  assert.equal(report.policy, MPGF_PUBLIC_GOODS_POSTMORTEM_POLICY);
  assert.equal(directReport.policy, report.policy);
  assert.equal(report.privacyPolicy, "aggregate_only_no_private_donor_reasons_receipts_or_reviewer_notes");
  assert.equal(report.publicPostmortemTemplatePublished, true);
  assert.equal(report.currentRoundMutationAllowed, false);
  assert.equal(report.parameterResetPolicy, "next_round_only_after_public_postmortem_and_before_donations_open");
  assert.equal(report.noGlobalMoralRanking, true);
  assert.equal(report.noDonorMoralReputationWeighting, true);
  assert.equal(persistedPostmortem.roundId, persistedRound.id);
  assert.equal(persistedPostmortem.currentRoundMutationAllowed, false);
  assert.equal(persistedPostmortem.noGlobalMoralRanking, true);
  assert.equal(persistedPostmortem.noDonorMoralReputationWeighting, true);
  assert.equal(persistedPostmortem.nextRoundParameterReset.rows.length, 1);
  assert.equal(
    persistedPostmortem.nextRoundParameterReset.thresholdCalibrationPath,
    `/api/mpgf/rounds/${persistedRound.id}/threshold-calibration`,
  );
  assert.ok(report.requiredPublicArtifacts.some((artifact) => artifact.key === "allocation_report"));
  assert.ok(report.requiredPublicArtifacts.some((artifact) => artifact.key === "funding_kpis"));
  assert.ok(report.requiredPublicArtifacts.some((artifact) => artifact.key === "threshold_calibration"));
  assert.equal(report.fundingOutcomes.thresholdClearRateBps, 5000);
  assert.ok((report.fundingOutcomes.sponsorLeverageRatioBps ?? 0) > 0);
  assert.equal(report.experimentSummary.recommendedCount, 4);
  assert.ok(report.experimentSummary.experimentKeys.includes("mpgf_donate_now_vs_unlock_round_framing_v1"));
  assert.ok(report.nextRoundParameterReset.rows.length >= demoMpgfPublicGoodsCampaigns.length);
  assert.equal(report.nextRoundParameterReset.thresholdCalibrationPath, `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/threshold-calibration`);
  assert.match(report.calcHash, /^sha256:/);
  assert.ok(governance.postmortem);
  assert.equal(governance.postmortem.currentRoundMutationAllowed, false);
  assert.equal(governance.postmortem.requiredPublicArtifacts.length, report.requiredPublicArtifacts.length);
  assert.match(route, /MPGF_PUBLIC_GOODS_API_HEADERS/);
  assert.match(route, /getMpgfPublicGoodsPostmortemReportApi/);
  assert.match(route, /buildMpgfPublicGoodsPostmortemReport/);
  assert.match(route, /buildMpgfPublicGoodsKpiSnapshot/);
  assert.match(route, /buildMpgfPublicGoodsThresholdCalibrationReport/);
  assert.match(route, /loadMpgfPublicGoodsAllocationContext/);
  assert.match(route, /loadMpgfPublicGoodsAllocationContributionRecords/);
  assert.match(route, /contextLoad\.source === "database_round_context"/);
  assert.match(route, /allocationContextSource/);
  assert.match(route, /contributionSource/);
  assert.match(publicApi, /postmortem/);
  assert.match(publicApi, /parameterResetPolicy/);
  assert.match(governancePage, /Public postmortem/);
  assert.match(governancePage, /Parameter resets happen only between rounds/);
  assert.match(governancePage, /Open public postmortem JSON/);

  const serialized = JSON.stringify({ report, governance: governance.postmortem });

  for (const forbidden of [
    "demo-supporter",
    "supporterReason",
    "charityReceiptRef",
    "externalReceiptRef",
    "private@example",
    "redactedReference",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
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
  const supportSignalEvent = buildMpgfPublicGoodsAnalyticsEvent({
    eventType: "support_signal_recorded",
    userId: "private-signal-user",
    campaignId: "campaign-global-health-basic-needs",
    eventJson: {
      surface: "mpgf_participant_action",
      supportSignalMode: "common_ground_support",
      supportSignalState: "signal_only",
      privateByDefault: true,
      publicAggregationOnly: true,
    },
  });
  const contributionRouteEvent = buildMpgfPublicGoodsAnalyticsEvent({
    eventType: "contribution_route_selected",
    userId: "private-route-user",
    campaignId: "campaign-global-health-basic-needs",
    eventJson: {
      amountBucket: bucketMpgfPublicGoodsAmountCents(2_500),
      captureMode: "external_handoff",
      surface: "public_campaign_page",
      contributionRoute: "every_org_fast_route",
      contributionFunnelStep: "provider_link_created",
      supportSignalState: "pending_verification",
      privateByDefault: true,
      publicAggregationOnly: true,
      netNewFundingProxy: "uncertain",
    },
  });
  const publicExperienceEvent = buildMpgfPublicGoodsAnalyticsEvent({
    eventType: "public_goods_ordinary_offer_drawer_opened",
    eventJson: {
      surface: "public_campaign_page",
      privateByDefault: true,
      publicAggregationOnly: true,
    },
  });
  const route = readFileSync("src/app/api/mpgf/public-goods/analytics/route.ts", "utf8");
  const persistence = readFileSync("src/lib/mpgf/persistence.ts", "utf8");

  assert.equal(event.event_json.amountBucket, "50_to_249");
  assert.equal(event.user_ref_hash?.includes("private-user"), false);
  assert.equal("amountCents" in event.event_json, false);
  assert.equal(dryRun.status, "dry_run");
  assert.equal(dryRun.row.event_json.thresholdPassed, true);
  assert.equal(supportSignalEvent.event_json.supportSignalMode, "common_ground_support");
  assert.equal(supportSignalEvent.event_json.privateByDefault, true);
  assert.equal("moralCluster" in supportSignalEvent.event_json, false);
  assert.equal(contributionRouteEvent.event_type, "contribution_route_selected");
  assert.equal(contributionRouteEvent.event_json.contributionRoute, "every_org_fast_route");
  assert.equal(contributionRouteEvent.event_json.contributionFunnelStep, "provider_link_created");
  assert.equal(contributionRouteEvent.event_json.amountBucket, "10_to_49");
  assert.equal(contributionRouteEvent.user_ref_hash?.includes("private-route-user"), false);
  assert.equal(publicExperienceEvent.event_type, "public_goods_ordinary_offer_drawer_opened");
  assert.equal(publicExperienceEvent.user_ref_hash, null);
  assert.equal(publicExperienceEvent.event_json.publicAggregationOnly, true);
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
  assert.throws(
    () =>
      buildMpgfPublicGoodsAnalyticsEvent({
        eventType: "support_signal_recorded",
        eventJson: { moralCluster: "humanitarian" } as never,
      }),
    /cannot store raw or sensitive field/,
  );
  assert.match(route, /MPGF_ANALYTICS_SECRET/);
  assert.match(route, /bucketMpgfPublicGoodsAmountCents/);
  assert.match(route, /contributionRoute/);
  assert.match(route, /contributionFunnelStep/);
  assert.match(route, /supportSignalMode/);
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
          event_type: "support_signal_recorded",
          campaign_id: "campaign-global-health-basic-needs",
          event_json: {
            surface: "mpgf_participant_action",
            supportSignalMode: "common_ground_support",
            supportSignalState: "signal_only",
            privateByDefault: true,
            publicAggregationOnly: true,
          },
          created_at: "2026-05-03T12:30:00.000Z",
        },
        {
          event_type: "support_signal_recorded",
          campaign_id: "campaign-animal-welfare-transition",
          event_json: {
            surface: "mpgf_participant_action",
            supportSignalMode: "dissent_review_requested",
            supportSignalState: "signal_only",
            privateByDefault: true,
            publicAggregationOnly: true,
          },
          created_at: "2026-05-03T13:00:00.000Z",
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
        {
          event_type: "experiment_assignment_recorded",
          campaign_id: null,
          event_json: {
            experimentKey: "mpgf_manual_evidence_vs_webhook_auto_import_v1",
            variant: "provider_webhook_auto_import",
          },
          created_at: "2026-05-03T14:05:00.000Z",
        },
        {
          event_type: "moral_public_goods_search_routed_to_cgb_card",
          campaign_id: null,
          event_json: { surface: "public_campaign_page", publicAggregationOnly: true },
          created_at: "2026-05-03T14:10:00.000Z",
        },
        {
          event_type: "moral_public_goods_zero_state_suppressed",
          campaign_id: null,
          event_json: { surface: "public_campaign_page", publicAggregationOnly: true },
          created_at: "2026-05-03T14:11:00.000Z",
        },
        {
          event_type: "public_goods_primary_cta_clicked",
          campaign_id: "campaign-global-health-basic-needs",
          event_json: { surface: "public_campaign_page", publicAggregationOnly: true },
          created_at: "2026-05-03T14:12:00.000Z",
        },
        {
          event_type: "public_goods_ordinary_offer_drawer_opened",
          campaign_id: null,
          event_json: { surface: "public_campaign_page", publicAggregationOnly: true },
          created_at: "2026-05-03T14:13:00.000Z",
        },
        {
          event_type: "public_goods_empty_filter_default_prevented",
          campaign_id: null,
          event_json: { surface: "public_campaign_page", publicAggregationOnly: true },
          created_at: "2026-05-03T14:14:00.000Z",
        },
        {
          event_type: "stale_current_product_label_exposed",
          campaign_id: null,
          event_json: { surface: "public_campaign_page", publicAggregationOnly: true },
          created_at: "2026-05-03T14:15:00.000Z",
        },
        {
          event_type: "legacy_demo_label_correctness_recorded",
          campaign_id: null,
          event_json: { surface: "public_campaign_page", publicAggregationOnly: true },
          created_at: "2026-05-03T14:16:00.000Z",
        },
        {
          event_type: "public_goods_lane_count_separation_mismatch",
          campaign_id: null,
          event_json: { surface: "public_campaign_page", publicAggregationOnly: true },
          created_at: "2026-05-03T14:17:00.000Z",
        },
        {
          event_type: "public_goods_mobile_primary_cta_visibility_failed",
          campaign_id: null,
          event_json: { surface: "public_campaign_page", publicAggregationOnly: true },
          created_at: "2026-05-03T14:18:00.000Z",
        },
        {
          event_type: "public_goods_search_accessibility_announcement_failed",
          campaign_id: null,
          event_json: { surface: "public_campaign_page", publicAggregationOnly: true },
          created_at: "2026-05-03T14:19:00.000Z",
        },
        {
          event_type: "success_reward_dominance_mode_disabled_by_underbacking",
          campaign_id: null,
          event_json: { roundId: "mpgf-assurance-round-demo-2026-05", publicAggregationOnly: true },
          created_at: "2026-05-03T14:20:00.000Z",
        },
        {
          event_type: "sealed_pledge_exact_progress_exposure_incident",
          campaign_id: null,
          event_json: { surface: "public_round_page", publicAggregationOnly: true },
          created_at: "2026-05-03T14:21:00.000Z",
        },
        {
          event_type: "pivotality_calculator_no_side_effect_invariant_violation",
          campaign_id: null,
          event_json: { surface: "advanced_calculator", publicAggregationOnly: true },
          created_at: "2026-05-03T14:22:00.000Z",
        },
        {
          event_type: "success_reward_pool_backing_snapshot",
          campaign_id: null,
          event_json: {
            advertisedCents: 1_000,
            backedCents: 800,
            publicAggregationOnly: true,
          },
          created_at: "2026-05-03T14:22:30.000Z",
        },
        {
          event_type: "success_reward_claim_issued",
          campaign_id: null,
          event_json: {
            rewardCents: 200,
            publicAggregationOnly: true,
          },
          created_at: "2026-05-03T14:22:45.000Z",
        },
        {
          event_type: "success_reward_claim_denied_by_reason",
          campaign_id: null,
          event_json: { reasonCategory: "authorization_failed", publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:00.000Z",
        },
        {
          event_type: "fee_quote_zero_allocation_due_to_binding_failure",
          campaign_id: null,
          event_json: { validationCategory: "duplicate_allocation_key", publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:05.000Z",
        },
        {
          event_type: "selected_sponsor_paid_fee_support_aggregate_rejected",
          campaign_id: null,
          event_json: { rejectionCategory: "duplicate_allocation_key", publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:06.000Z",
        },
        {
          event_type: "sponsor_paid_fee_quote_backing_hash_mismatch",
          campaign_id: null,
          event_json: { validationCategory: "wrong_sponsor_pool_source_hash", publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:07.000Z",
        },
        {
          event_type: "sponsor_paid_fee_support_aggregate_overcommit_rejected",
          campaign_id: null,
          event_json: { rejectionCategory: "fee_support_pool_underbacked", publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:08.000Z",
        },
        {
          event_type: "failure_bonus_pool_backing_snapshot",
          campaign_id: null,
          event_json: {
            advertisedCents: 1_000,
            backedCents: 900,
            publicAggregationOnly: true,
          },
          created_at: "2026-05-03T14:23:15.000Z",
        },
        {
          event_type: "failure_bonus_claim_proration_snapshot",
          campaign_id: null,
          event_json: {
            provisionalCents: 700,
            participantCappedCents: 500,
            publicAggregationOnly: true,
          },
          created_at: "2026-05-03T14:23:30.000Z",
        },
        {
          event_type: "failure_bonus_participant_proration_stable_order_key_validation_failed",
          campaign_id: null,
          event_json: { validationCategory: "stable_order_key_invalid", publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:31.000Z",
        },
        {
          event_type: "failure_bonus_participant_proration_undefined_helper_prevented",
          campaign_id: null,
          event_json: { helperFamily: "participant_round_proration", publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:32.000Z",
        },
        {
          event_type: "failure_bonus_round_level_proration_undefined_helper_prevented",
          campaign_id: null,
          event_json: { helperFamily: "round_level_proration", publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:33.000Z",
        },
        {
          event_type: "failure_bonus_exact_target_proration_underallocation_prevented",
          campaign_id: null,
          event_json: { arithmetic: "target_denominator_remainder", publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:34.000Z",
        },
        {
          event_type: "failure_bonus_paid",
          campaign_id: null,
          event_json: {
            bonusCents: 450,
            publicAggregationOnly: true,
          },
          created_at: "2026-05-03T14:23:45.000Z",
        },
        {
          event_type: "failure_bonus_claim_denied_by_reason",
          campaign_id: null,
          event_json: { reasonCategory: "review_not_approved", publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:50.000Z",
        },
        {
          event_type: "counterparty_self_linked_same_payment_or_control_excluded",
          campaign_id: null,
          event_json: { exclusionCategory: "same_payment_cluster", publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:55.000Z",
        },
        {
          event_type: "authorization_failure_reclearing_completed",
          campaign_id: null,
          event_json: { reclearingIterationCount: 1, publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:56.000Z",
        },
        {
          event_type: "authorization_wrong_amount_or_short_expiry_removed",
          campaign_id: null,
          event_json: { removalCategory: "short_expiry", publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:57.000Z",
        },
        {
          event_type: "authorization_failed_dollars_removed_from_clearing",
          campaign_id: null,
          event_json: { removedCents: 1_234, publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:58.000Z",
        },
        {
          event_type: "payment_commitment_snapshot_recorded",
          campaign_id: null,
          event_json: { snapshotKind: "round_close", publicAggregationOnly: true },
          created_at: "2026-05-03T14:23:59.000Z",
        },
        {
          event_type: "payment_commitment_snapshot_invalidated",
          campaign_id: null,
          event_json: { invalidationCategory: "provider_evidence_stale", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:00.000Z",
        },
        {
          event_type: "payment_commitment_provider_evidence_hash_invalid",
          campaign_id: null,
          event_json: { validationCategory: "malformed_hash", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:01.000Z",
        },
        {
          event_type: "clearing_input_bundle_validation_failed",
          campaign_id: null,
          event_json: { validationCategory: "binding_hash_invalid", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:02.000Z",
        },
        {
          event_type: "clearing_input_bundle_component_hash_mismatch",
          campaign_id: null,
          event_json: { componentKind: "payment_snapshot", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:03.000Z",
        },
        {
          event_type: "clearing_input_bundle_uniqueness_violation",
          campaign_id: null,
          event_json: { rowKind: "common_ground_budget", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:04.000Z",
        },
        {
          event_type: "project_eligibility_snapshot_uniqueness_violation",
          campaign_id: null,
          event_json: { snapshotKind: "round_open_project_eligibility", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:05.000Z",
        },
        {
          event_type: "common_ground_budget_row_count_uniqueness_violation",
          campaign_id: null,
          event_json: { keyKind: "round_participant", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:06.000Z",
        },
        {
          event_type: "identity_eligibility_row_count_uniqueness_violation",
          campaign_id: null,
          event_json: { keyKind: "round_participant", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:07.000Z",
        },
        {
          event_type: "round_keyed_payment_snapshot_row_count_uniqueness_violation",
          campaign_id: null,
          event_json: { keyKind: "round_budget_snapshot_kind", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:08.000Z",
        },
        {
          event_type: "stage7_claim_creation_denied_by_section10_qualified_predicate",
          campaign_id: null,
          event_json: { denialCategory: "section10_not_qualified", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:09.000Z",
        },
        {
          event_type: "stage7_duplicate_failure_bonus_claim_noop_or_same_key_mismatch_rejected",
          campaign_id: null,
          event_json: { resolutionCategory: "same_key_mismatch_rejected", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:10.000Z",
        },
        {
          event_type: "sponsor_frozen_vs_live_backing_mismatch",
          campaign_id: null,
          event_json: { poolType: "failure_bonus", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:11.000Z",
        },
        {
          event_type: "sponsor_commitment_source_hash_or_integer_cent_validation_failed",
          campaign_id: null,
          event_json: { validationCategory: "source_hash_invalid", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:12.000Z",
        },
        {
          event_type: "bonus_fixed_point_score_unit_quantization_mismatch",
          campaign_id: null,
          event_json: { calculationStage: "stage5_bonus_score", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:13.000Z",
        },
        {
          event_type: "invalid_monetary_or_basis_point_cap_allocation_rejected",
          campaign_id: null,
          event_json: { capKind: "project_cap_bps", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:14.000Z",
        },
        {
          event_type: "unsafe_integer_cent_count_or_basis_point_validation_failed",
          campaign_id: null,
          event_json: { fieldFamily: "cent", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:15.000Z",
        },
        {
          event_type: "unverified_or_nonclear_identity_counted_dollar_excluded",
          campaign_id: null,
          event_json: { identityState: "sybil_review", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:16.000Z",
        },
        {
          event_type: "project_eligibility_snapshot_hash_validation_failed",
          campaign_id: null,
          event_json: { validationCategory: "snapshot_hash_invalid", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:17.000Z",
        },
        {
          event_type: "project_eligibility_snapshot_baseline_or_action_evidence_boolean_invalid",
          campaign_id: null,
          event_json: { validationCategory: "baseline_boolean_invalid", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:18.000Z",
        },
        {
          event_type: "project_eligibility_snapshot_cutoff_or_kind_mismatch",
          campaign_id: null,
          event_json: { validationCategory: "cutoff_mismatch", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:19.000Z",
        },
        {
          event_type: "conditional_intent_counterparty_volume_or_bucket_array_validation_failed",
          campaign_id: null,
          event_json: { validationCategory: "bucket_array_invalid", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:20.000Z",
        },
        {
          event_type: "round_donor_counted_cap_or_identity_threshold_validation_failed",
          campaign_id: null,
          event_json: { validationCategory: "identity_threshold_invalid", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:21.000Z",
        },
        {
          event_type: "project_match_bps_validation_failed",
          campaign_id: null,
          event_json: { validationCategory: "base_match_bps_invalid", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:22.000Z",
        },
        {
          event_type: "round_sponsor_budget_validation_failed",
          campaign_id: null,
          event_json: { validationCategory: "failure_bonus_budget_invalid", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:23.000Z",
        },
        {
          event_type: "identity_weight_bps_validation_failed",
          campaign_id: null,
          event_json: { validationCategory: "out_of_range_bps", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:24.000Z",
        },
        {
          event_type: "payment_commitment_missing_payment_method_ref",
          campaign_id: null,
          event_json: { snapshotKind: "round_close", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:25.000Z",
        },
        {
          event_type: "stage7_local_helper_definition_validation_failed",
          campaign_id: null,
          event_json: { helperFamily: "stage7_failure_handling", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:26.000Z",
        },
        {
          event_type: "stage7_replay_review_non_side_effect_output_undefined_helper_prevented",
          campaign_id: null,
          event_json: { outputMode: "replay_report_audit_only", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:27.000Z",
        },
        {
          event_type: "stage4_base_match_default_ratio_local_definition_validation_failed",
          campaign_id: null,
          event_json: { stage: "stage4_base_match", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:28.000Z",
        },
        {
          event_type: "coordination_credit_unit_issued",
          campaign_id: null,
          event_json: { benefitKind: "coordination_credit", publicAggregationOnly: true },
          created_at: "2026-05-03T14:24:00.000Z",
        },
        {
          event_type: "coordination_credit_no_allocation_power_invariant_violation",
          campaign_id: null,
          event_json: { surface: "credit_ledger_review", publicAggregationOnly: true },
          created_at: "2026-05-03T14:25:00.000Z",
        },
        {
          event_type: "impact_certificate_unit_issued",
          campaign_id: null,
          event_json: { benefitKind: "impact_certificate", publicAggregationOnly: true },
          created_at: "2026-05-03T14:26:00.000Z",
        },
        {
          event_type: "impact_certificate_late_access_rejected",
          campaign_id: null,
          event_json: { reasonCategory: "late_access", publicAggregationOnly: true },
          created_at: "2026-05-03T14:27:00.000Z",
        },
      ],
      paymentProofs: [
        ...demoMpgfPublicGoodsPaymentProofs,
        {
          ...demoMpgfPublicGoodsPaymentProofs[0],
          id: "payment-proof-global-health-webhook-demo",
          pledgeId: "pledge-assurance-global-health-2",
          externalReceiptRef: "provider-event:redacted-global-health-002",
          charityReceiptRef: "charity-receipt:redacted-global-health-002",
          amountVerifiedCents: 9_000,
          reconciliationSource: "fiscal_host_webhook",
          verifiedAt: "2026-05-05T16:30:00.000Z",
          createdAt: "2026-05-05T16:00:00.000Z",
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
    const metricsPage = readFileSync("src/app/mpgf/metrics/page.tsx", "utf8");
    const hubPage = readFileSync("src/app/mpgf/page.tsx", "utf8");
    const dryRunGateIndex = route.indexOf("if (dryRun)");
    const secretGateIndex = route.indexOf("if (!kpiSecret())");
    const kpis = readFileSync("src/lib/mpgf/public-goods-kpis.ts", "utf8");
    const serialized = JSON.stringify(snapshot);
    const publicMetricValidation = validateMpgfPublicGoodsPublicMetricCatalog(snapshot.publicMetrics);
    const publicMetricValue = (label: (typeof MPGF_PUBLIC_GOODS_PUBLIC_METRIC_LABELS)[number]) =>
      snapshot.publicMetrics.metrics.find((metric) => metric.label === label)?.currentValue;
    const publicMetricStatus = (label: (typeof MPGF_PUBLIC_GOODS_PUBLIC_METRIC_LABELS)[number]) =>
      snapshot.publicMetrics.metrics.find((metric) => metric.label === label)?.instrumentationStatus;

    assert.equal(snapshot.privacyPolicy, "aggregate_only_no_user_or_reason_text");
    assert.equal(publicMetricValidation.passed, true);
    assert.equal(publicMetricValidation.missingLabels.length, 0);
    assert.equal(publicMetricValidation.requiredMetricCount, MPGF_PUBLIC_GOODS_PUBLIC_METRIC_LABELS.length);
    assert.equal(publicMetricValidation.publishedMetricCount, MPGF_PUBLIC_GOODS_PUBLIC_METRIC_LABELS.length);
    assert.equal(publicMetricValidation.rawPrivateFieldsExposed, false);
    assert.equal(publicMetricValidation.doesNotOptimizeGrossDonationVolumeAlone, true);
    assert.equal(snapshot.publicMetrics.optimizationTarget, "incremental_verified_cross_view_review_cleared_funding");
    assert.equal(snapshot.publicMetrics.privacyPolicy, "aggregate_only_no_user_or_reason_text");
    assert.ok(snapshot.publicMetrics.requiredMetricCount > 100);
    assert.ok(snapshot.publicMetrics.computedMetricCount > 10);
    assert.equal(
      snapshot.publicMetrics.computedMetricCount + snapshot.publicMetrics.pendingMetricCount,
      snapshot.publicMetrics.requiredMetricCount,
    );
    assert.ok(
      snapshot.publicMetrics.metrics.some(
        (metric) => metric.label === "gross-captured dollars" && metric.currentValue === snapshot.funding.verifiedDollarsRoutedCents,
      ),
    );
    assert.ok(
      snapshot.publicMetrics.metrics.some(
        (metric) => metric.label === "fee dollars excluded from public-good credit" && metric.currentValue === 0,
      ),
    );
    assert.equal(publicMetricValue("failure-bonus funded-vs-advertised ratio"), 9000);
    assert.equal(
      publicMetricValue(
        "missing, duplicate-id, duplicate-allocation-key, fee-policy-hash-mismatched, or waived-fee-inconsistent FeeQuote row zero-allocation count",
      ),
      1,
    );
    assert.equal(publicMetricValue("failure-bonus utilization"), 5000);
    assert.equal(publicMetricValue("failure-bonus denied-by-reason counts"), 1);
    assert.equal(publicMetricValue("failure-bonus raw-vs-participant-capped ratio"), 7143);
    assert.equal(publicMetricValue("failure-bonus participant-proration stable-order-key validation failure count"), 1);
    assert.equal(publicMetricValue("failure-bonus participant-proration undefined-helper prevention count"), 1);
    assert.equal(publicMetricValue("failure-bonus round-level proration undefined-helper prevention count"), 1);
    assert.equal(publicMetricValue("failure-bonus provisional-vs-paid ratio"), 6429);
    assert.equal(publicMetricValue("failure-bonus exact target-proration underallocation prevention count"), 1);
    assert.equal(publicMetricValue("failure-bonus proration factor bps"), 9000);
    assert.equal(publicMetricValue("failure-bonus backed-available-pool utilization"), 5000);
    assert.ok(
      snapshot.publicMetrics.metrics.every(
        (metric) => metric.privacyScope === "aggregate_only_no_user_or_reason_text",
      ),
    );
    assert.equal(publicMetricValue("success-reward funded-vs-advertised ratio"), 8000);
    assert.equal(publicMetricValue("success-reward utilization"), 2500);
    assert.equal(publicMetricValue("success-reward denied-by-reason counts"), 1);
    assert.equal(publicMetricValue("success-reward dominance-mode disabled-by-underbacking count"), 1);
    assert.equal(publicMetricValue("coordination-credit units issued"), 1);
    assert.equal(publicMetricValue("coordination-credit no-allocation-power invariant violation count"), 1);
    assert.equal(publicMetricValue("impact-certificate units issued"), 1);
    assert.equal(publicMetricValue("impact-certificate late-access rejection count"), 1);
    assert.equal(publicMetricValue("sealed-pledge exact-progress exposure incident count"), 1);
    assert.equal(publicMetricValue("self-match / linked-account / same-payment-method / same-control exclusions"), 1);
    assert.equal(publicMetricValue("authorization failure reclearing count"), 1);
    assert.equal(publicMetricValue("authorization wrong-amount / short-expiry removals"), 1);
    assert.equal(publicMetricValue("authorization-failed dollars removed from clearing"), 1_234);
    assert.equal(publicMetricValue("payment-commitment snapshot count and invalidation count"), 2);
    assert.equal(publicMetricValue("payment-commitment provider-evidence-hash malformed/invalid count"), 1);
    assert.equal(publicMetricValue("clearing input bundle validation failure count"), 1);
    assert.equal(publicMetricValue("clearing input bundle component-hash mismatch count"), 1);
    assert.equal(publicMetricValue("clearing input bundle uniqueness violation count"), 1);
    assert.equal(publicMetricValue("snapshot / project-eligibility-snapshot uniqueness violation count"), 1);
    assert.equal(publicMetricValue("Common Ground Budget row-count uniqueness violation count"), 1);
    assert.equal(publicMetricValue("identity-eligibility row-count uniqueness violation count"), 1);
    assert.equal(publicMetricValue("round-keyed payment-snapshot row-count uniqueness violation count"), 1);
    assert.equal(publicMetricValue("Stage 7 claim-creation attempts denied by full Section 10 qualified predicate"), 1);
    assert.equal(
      publicMetricValue("Stage 7 duplicate failure-bonus claim create no-op / same-key mismatch rejection count"),
      1,
    );
    assert.equal(publicMetricValue("sponsor frozen-vs-live backing mismatch count"), 1);
    assert.equal(publicMetricValue("sponsor commitment source-hash / integer-cent validation failure count"), 1);
    assert.equal(publicMetricValue("bonus fixed-point score-unit quantization mismatch count"), 1);
    assert.equal(publicMetricValue("invalid monetary-cap / basis-point-cap allocation rejection count"), 1);
    assert.equal(publicMetricValue("unsafe integer cent/count/basis-point validation failure count"), 1);
    assert.equal(publicMetricValue("unverified-or-nonclear-identity counted-dollar exclusion count"), 1);
    assert.equal(publicMetricValue("project-eligibility-snapshot hash validation failure count"), 1);
    assert.equal(
      publicMetricValue("project-eligibility-snapshot baseline/action-evidence boolean validation failure count"),
      1,
    );
    assert.equal(publicMetricValue("project-eligibility-snapshot cutoff/kind mismatch count"), 1);
    assert.equal(
      publicMetricValue("conditional-intent counterparty-volume / bucket-array validation failure count"),
      1,
    );
    assert.equal(publicMetricValue("round donor-counted-cap / identity-threshold validation failure count"), 1);
    assert.equal(publicMetricValue("project match-bps validation failure count"), 1);
    assert.equal(publicMetricValue("round sponsor-budget validation failure count"), 1);
    assert.equal(publicMetricValue("identity-weight bps validation failure count"), 1);
    assert.equal(publicMetricValue("payment-commitment missing-payment-method-ref count"), 1);
    assert.equal(publicMetricValue("Stage 7 local helper-definition validation failure count"), 1);
    assert.equal(
      publicMetricValue("Stage 7 replay/review non-side-effect output undefined-helper prevention count"),
      1,
    );
    assert.equal(publicMetricValue("Stage 4 base-match default-ratio local-definition validation failure count"), 1);
    assert.equal(publicMetricValue("selected sponsor-paid fee-support aggregate rejection count"), 1);
    assert.equal(publicMetricValue("sponsor-paid fee quote backing-hash mismatch count"), 1);
    assert.equal(publicMetricValue("sponsor-paid fee support aggregate overcommit rejection count"), 1);
    assert.equal(publicMetricValue("moral-public-goods search-intent routed-to-CGB-card count"), 1);
    assert.equal(publicMetricValue("moral-public-goods search zero-state suppression count"), 1);
    assert.equal(publicMetricValue("public-goods primary CTA click-through count"), 1);
    assert.equal(publicMetricValue("public-goods ordinary-offer drawer open count"), 1);
    assert.equal(publicMetricValue("empty-filter default-render prevention count"), 1);
    assert.equal(publicMetricValue("stale-current-product-label exposure count"), 1);
    assert.equal(publicMetricValue("legacy-demo-label correctness count"), 1);
    assert.equal(publicMetricValue("public-goods lane-count separation mismatch count"), 1);
    assert.equal(publicMetricValue("public-goods mobile primary-CTA visibility failure count"), 1);
    assert.equal(publicMetricValue("public-goods search accessibility announcement failure count"), 1);
    assert.equal(publicMetricStatus("public-goods ordinary-offer drawer open count"), "computed");
    assert.equal(publicMetricStatus("stale-current-product-label exposure count"), "computed");
    assert.equal(publicMetricStatus("failure-bonus funded-vs-advertised ratio"), "computed");
    assert.equal(
      publicMetricStatus(
        "missing, duplicate-id, duplicate-allocation-key, fee-policy-hash-mismatched, or waived-fee-inconsistent FeeQuote row zero-allocation count",
      ),
      "computed",
    );
    assert.equal(publicMetricStatus("failure-bonus utilization"), "computed");
    assert.equal(publicMetricStatus("failure-bonus denied-by-reason counts"), "computed");
    assert.equal(
      publicMetricStatus("failure-bonus participant-proration stable-order-key validation failure count"),
      "computed",
    );
    assert.equal(
      publicMetricStatus("failure-bonus participant-proration undefined-helper prevention count"),
      "computed",
    );
    assert.equal(
      publicMetricStatus("failure-bonus round-level proration undefined-helper prevention count"),
      "computed",
    );
    assert.equal(
      publicMetricStatus("failure-bonus exact target-proration underallocation prevention count"),
      "computed",
    );
    assert.equal(publicMetricStatus("failure-bonus proration factor bps"), "computed");
    assert.equal(publicMetricStatus("success-reward funded-vs-advertised ratio"), "computed");
    assert.equal(publicMetricStatus("success-reward utilization"), "computed");
    assert.equal(publicMetricStatus("success-reward denied-by-reason counts"), "computed");
    assert.equal(publicMetricStatus("coordination-credit units issued"), "computed");
    assert.equal(publicMetricStatus("impact-certificate units issued"), "computed");
    assert.equal(
      publicMetricStatus("self-match / linked-account / same-payment-method / same-control exclusions"),
      "computed",
    );
    assert.equal(publicMetricStatus("authorization failure reclearing count"), "computed");
    assert.equal(publicMetricStatus("authorization wrong-amount / short-expiry removals"), "computed");
    assert.equal(publicMetricStatus("authorization-failed dollars removed from clearing"), "computed");
    assert.equal(publicMetricStatus("payment-commitment snapshot count and invalidation count"), "computed");
    assert.equal(
      publicMetricStatus("payment-commitment provider-evidence-hash malformed/invalid count"),
      "computed",
    );
    assert.equal(publicMetricStatus("clearing input bundle validation failure count"), "computed");
    assert.equal(publicMetricStatus("clearing input bundle component-hash mismatch count"), "computed");
    assert.equal(publicMetricStatus("clearing input bundle uniqueness violation count"), "computed");
    assert.equal(publicMetricStatus("snapshot / project-eligibility-snapshot uniqueness violation count"), "computed");
    assert.equal(publicMetricStatus("Common Ground Budget row-count uniqueness violation count"), "computed");
    assert.equal(publicMetricStatus("identity-eligibility row-count uniqueness violation count"), "computed");
    assert.equal(publicMetricStatus("round-keyed payment-snapshot row-count uniqueness violation count"), "computed");
    assert.equal(
      publicMetricStatus("Stage 7 claim-creation attempts denied by full Section 10 qualified predicate"),
      "computed",
    );
    assert.equal(
      publicMetricStatus("Stage 7 duplicate failure-bonus claim create no-op / same-key mismatch rejection count"),
      "computed",
    );
    assert.equal(publicMetricStatus("sponsor frozen-vs-live backing mismatch count"), "computed");
    assert.equal(
      publicMetricStatus("sponsor commitment source-hash / integer-cent validation failure count"),
      "computed",
    );
    assert.equal(publicMetricStatus("bonus fixed-point score-unit quantization mismatch count"), "computed");
    assert.equal(publicMetricStatus("invalid monetary-cap / basis-point-cap allocation rejection count"), "computed");
    assert.equal(publicMetricStatus("unsafe integer cent/count/basis-point validation failure count"), "computed");
    assert.equal(publicMetricStatus("unverified-or-nonclear-identity counted-dollar exclusion count"), "computed");
    assert.equal(publicMetricStatus("project-eligibility-snapshot hash validation failure count"), "computed");
    assert.equal(
      publicMetricStatus("project-eligibility-snapshot baseline/action-evidence boolean validation failure count"),
      "computed",
    );
    assert.equal(publicMetricStatus("project-eligibility-snapshot cutoff/kind mismatch count"), "computed");
    assert.equal(
      publicMetricStatus("conditional-intent counterparty-volume / bucket-array validation failure count"),
      "computed",
    );
    assert.equal(
      publicMetricStatus("round donor-counted-cap / identity-threshold validation failure count"),
      "computed",
    );
    assert.equal(publicMetricStatus("project match-bps validation failure count"), "computed");
    assert.equal(publicMetricStatus("round sponsor-budget validation failure count"), "computed");
    assert.equal(publicMetricStatus("identity-weight bps validation failure count"), "computed");
    assert.equal(publicMetricStatus("payment-commitment missing-payment-method-ref count"), "computed");
    assert.equal(publicMetricStatus("Stage 7 local helper-definition validation failure count"), "computed");
    assert.equal(
      publicMetricStatus("Stage 7 replay/review non-side-effect output undefined-helper prevention count"),
      "computed",
    );
    assert.equal(
      publicMetricStatus("Stage 4 base-match default-ratio local-definition validation failure count"),
      "computed",
    );
    assert.equal(publicMetricStatus("selected sponsor-paid fee-support aggregate rejection count"), "computed");
    assert.equal(publicMetricStatus("sponsor-paid fee quote backing-hash mismatch count"), "computed");
    assert.equal(publicMetricStatus("sponsor-paid fee support aggregate overcommit rejection count"), "computed");
    assert.equal(publicMetricValue("pivotality calculator no-side-effect invariant violation count"), 1);
    assert.equal(publicMetricStatus("pivotality calculator no-side-effect invariant violation count"), "computed");
    assert.equal(
      snapshot.publicMetrics.metrics.some(
        (metric) => String(metric.label) === "moral public goods row-count uniqueness violation count",
      ),
      false,
    );
    assert.equal(snapshot.coordination.supportSignalEventCount, 2);
    assert.equal(snapshot.coordination.commonGroundSupportSignalEventCount, 1);
    assert.equal(snapshot.coordination.dissentReviewSignalEventCount, 1);
    assert.equal(snapshot.coordination.supportSignalToPledgeIntentBps, 5000);
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
    assert.equal(snapshot.funding.verifiedDollarsRoutedCents, 19_000);
    assert.equal(snapshot.funding.verifiedSupporterCountPerWinningCampaign, 3);
    assert.equal(snapshot.funding.thresholdClearRateBps, 5000);
    assert.ok(snapshot.funding.sponsorLeverageRatioBps !== null && snapshot.funding.sponsorLeverageRatioBps > 0);
    assert.equal(snapshot.funding.autoVerifiedContributionShareBps, 5000);
    assert.equal(snapshot.funding.autoVerifiedContributionCount, 1);
    assert.equal(snapshot.funding.manualVerifiedContributionCount, 1);
    assert.equal(snapshot.funding.medianHoursFromPledgeToCounted, 131);
    assert.equal(snapshot.funding.sponsorPoolMonthlyRefillCents, 2_500);
    assert.equal(snapshot.funding.sponsorPoolRefillRateBps, 167);
    assert.equal(snapshot.funding.reviewSlaAttainmentBps, 10000);
    assert.equal(snapshot.funding.disputeRateBps, snapshot.review.disputeRateBps);
    assert.equal(snapshot.funding.donorRetentionIntoNextRoundBps, snapshot.recurring.retainedRecurringDonors3MonthBps);
    assert.equal(snapshot.experimentBacklog.recommendedCount, 4);
    assert.equal(snapshot.experimentBacklog.activeAssignmentEventCount, 1);
    assert.ok(
      snapshot.experimentBacklog.experiments.some(
        (experiment) => experiment.comparison === "manual_evidence_against_webhook_auto_import",
      ),
    );
    assert.ok(snapshot.experimentBacklog.experiments.every((experiment) => experiment.noGlobalMoralRanking));
    assert.ok(
      snapshot.experimentBacklog.experiments.every(
        (experiment) => experiment.privacyPolicy === "aggregate_assignment_no_raw_private_text",
      ),
    );
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
    assert.ok(dryRunGateIndex >= 0);
    assert.ok(secretGateIndex > dryRunGateIndex);
    assert.match(route, /publicScope: "dry_run_aggregate"/);
    assert.equal(serialized.includes("demo-supporter"), false);
    assert.equal(serialized.includes("private-old"), false);
    assert.equal(serialized.includes("supporterReason"), false);
    assert.match(route, /MPGF_PUBLIC_GOODS_KPI_SECRET/);
    assert.match(route, /loadMpgfPublicGoodsKpiSnapshot/);
    assert.match(metricsPage, /loadMpgfPublicGoodsKpiSnapshot\(\{ dryRun: true \}\)/);
    assert.match(metricsPage, /Verified dollars routed to moral public goods/);
    assert.match(metricsPage, /Verified-supporter count per winning campaign/);
    assert.match(metricsPage, /Threshold-clear rate/);
    assert.match(metricsPage, /Sponsor leverage ratio/);
    assert.match(metricsPage, /Auto-verified share of contributions/);
    assert.match(metricsPage, /Time from pledge to counted contribution/);
    assert.match(metricsPage, /Sponsor-pool refill rate/);
    assert.match(metricsPage, /Review SLA attainment/);
    assert.match(metricsPage, /Dispute rate and overturn rate/);
    assert.match(metricsPage, /Donor retention into next round/);
    assert.match(metricsPage, /Aggregate only/);
    assert.match(metricsPage, /Public metric catalog/);
    assert.match(metricsPage, /snapshot\.publicMetrics\.requiredMetricCount/);
    assert.match(metricsPage, /incremental, verified, cross-view, review-cleared funding/);
    assert.match(metricsPage, /A\/B tests without moral ranking/);
    assert.match(metricsPage, /widensPublicAccessAutomatically/);
    assert.match(hubPage, /\/mpgf\/metrics/);
    assert.match(hubPage, /Funding metrics/);
    assert.match(kpis, /reviewerMedianHoursToClose/);
    assert.match(kpis, /thresholdClearRateBps/);
    assert.match(kpis, /supportSignalToPledgeIntentBps/);
    assert.match(kpis, /retainedRecurringDonors3MonthBps/);
    assert.match(kpis, /campaignConcentrationTopDirectShareBps/);
    assert.match(kpis, /medianCapAdjustedCountedContributionCents/);
    assert.match(kpis, /netNewFundingProxy/);
    assert.match(kpis, /verifiedDollarsRoutedCents/);
    assert.match(kpis, /autoVerifiedContributionShareBps/);
    assert.match(kpis, /medianHoursFromPledgeToCounted/);
    assert.match(kpis, /sponsorPoolRefillRateBps/);
    assert.match(kpis, /donorRetentionIntoNextRoundBps/);
    assert.match(kpis, /loadMpgfPublicGoodsAllocationContributionRecords/);
    assert.match(kpis, /buildMpgfPublicGoodsContributionKpiRecordsFromPersistedContributionRows/);
    assert.match(kpis, /mpgf_manual_evidence_vs_webhook_auto_import_v1/);
    assert.match(kpis, /mpgf_static_ordering_vs_common_ground_personalization_v1/);
    assert.match(kpis, /mpgf_donate_now_vs_unlock_round_framing_v1/);
    assert.match(kpis, /mpgf_default_off_vs_suggested_sponsor_refill_v1/);
    assert.doesNotMatch(kpis, /user_ref_hash/);
  } finally {
    if (previousCohort === undefined) {
      delete process.env.MPGF_PUBLIC_GOODS_COHORT;
    } else {
      process.env.MPGF_PUBLIC_GOODS_COHORT = previousCohort;
    }
  }
});

test("MPGF public-goods KPI records use counted persisted contribution rows", () => {
  const rows = {
    conditionalPledges: [
      {
        id: "kpi-counted-webhook-pledge",
        round_id: demoMpgfAssuranceRound.id,
        campaign_id: "campaign-global-health-basic-needs",
        profile_id: "profile-kpi-webhook",
        amount_cents: 10_000,
        counted_cap_cents: 10_000,
        visibility: "private_amount" as const,
        payment_mode: "every_org_fast_route" as const,
        status: "counted" as const,
        created_at: "2026-06-01T09:00:00.000Z",
      },
      {
        id: "kpi-payment-only-pledge",
        round_id: demoMpgfAssuranceRound.id,
        campaign_id: "campaign-global-health-basic-needs",
        profile_id: "profile-kpi-payment-only",
        amount_cents: 8_000,
        counted_cap_cents: 8_000,
        visibility: "private_amount" as const,
        payment_mode: "every_org_fast_route" as const,
        status: "pending_verification" as const,
        created_at: "2026-06-01T10:00:00.000Z",
      },
      {
        id: "kpi-setup-only-pledge",
        round_id: demoMpgfAssuranceRound.id,
        campaign_id: "campaign-global-health-basic-needs",
        profile_id: "profile-kpi-setup-only",
        amount_cents: 9_000,
        counted_cap_cents: 9_000,
        visibility: "private_amount" as const,
        payment_mode: "stripe_setup_intent_saved_commitment" as const,
        status: "counted" as const,
        created_at: "2026-06-01T11:00:00.000Z",
      },
      {
        id: "kpi-counted-manual-pledge",
        round_id: demoMpgfAssuranceRound.id,
        campaign_id: "campaign-animal-welfare-transition",
        profile_id: "profile-kpi-manual",
        amount_cents: 7_000,
        counted_cap_cents: 7_000,
        visibility: "private_amount" as const,
        payment_mode: "manual_proof_fallback" as const,
        status: "counted" as const,
        created_at: "2026-06-01T12:00:00.000Z",
      },
    ],
    pledgeIntents: [
      {
        id: "kpi-counted-webhook-pledge",
        round_id: demoMpgfAssuranceRound.id,
        campaign_id: "campaign-global-health-basic-needs",
        profile_id: "profile-kpi-webhook",
        user_ref_hash: `sha256:${"a".repeat(64)}`,
        amount_cents: 10_000,
        visibility_pref: "private_amount" as const,
        payment_state: "provider_event_received" as const,
        counting_state: "counted_after_review" as const,
        created_at: "2026-06-01T09:00:00.000Z",
      },
      {
        id: "kpi-payment-only-pledge",
        round_id: demoMpgfAssuranceRound.id,
        campaign_id: "campaign-global-health-basic-needs",
        profile_id: "profile-kpi-payment-only",
        user_ref_hash: `sha256:${"b".repeat(64)}`,
        amount_cents: 8_000,
        visibility_pref: "private_amount" as const,
        payment_state: "provider_event_received" as const,
        counting_state: "not_counted" as const,
        created_at: "2026-06-01T10:00:00.000Z",
      },
      {
        id: "kpi-setup-only-pledge",
        round_id: demoMpgfAssuranceRound.id,
        campaign_id: "campaign-global-health-basic-needs",
        profile_id: "profile-kpi-setup-only",
        user_ref_hash: `sha256:${"c".repeat(64)}`,
        amount_cents: 9_000,
        visibility_pref: "private_amount" as const,
        payment_state: "provider_event_received" as const,
        counting_state: "counted_after_review" as const,
        created_at: "2026-06-01T11:00:00.000Z",
      },
      {
        id: "kpi-counted-manual-pledge",
        round_id: demoMpgfAssuranceRound.id,
        campaign_id: "campaign-animal-welfare-transition",
        profile_id: "profile-kpi-manual",
        user_ref_hash: `sha256:${"d".repeat(64)}`,
        amount_cents: 7_000,
        visibility_pref: "private_amount" as const,
        payment_state: "provider_event_received" as const,
        counting_state: "counted_after_review" as const,
        created_at: "2026-06-01T12:00:00.000Z",
      },
    ],
    identityVerifications: [
      {
        id: "kpi-identity-webhook",
        pledge_intent_id: "kpi-counted-webhook-pledge",
        status: "verified" as const,
        human_score_bps: 9_000,
        counts_for_matching: true,
        verified_at: "2026-06-01T09:05:00.000Z",
        created_at: "2026-06-01T09:05:00.000Z",
      },
      {
        id: "kpi-identity-payment-only",
        pledge_intent_id: "kpi-payment-only-pledge",
        status: "verified" as const,
        human_score_bps: 9_000,
        counts_for_matching: true,
        verified_at: "2026-06-01T10:05:00.000Z",
        created_at: "2026-06-01T10:05:00.000Z",
      },
      {
        id: "kpi-identity-setup-only",
        pledge_intent_id: "kpi-setup-only-pledge",
        status: "verified" as const,
        human_score_bps: 9_000,
        counts_for_matching: true,
        verified_at: "2026-06-01T11:05:00.000Z",
        created_at: "2026-06-01T11:05:00.000Z",
      },
      {
        id: "kpi-identity-manual",
        pledge_intent_id: "kpi-counted-manual-pledge",
        status: "verified" as const,
        human_score_bps: 9_000,
        counts_for_matching: true,
        verified_at: "2026-06-01T12:05:00.000Z",
        created_at: "2026-06-01T12:05:00.000Z",
      },
    ],
    paymentEvents: [
      {
        id: "kpi-payment-webhook-event",
        conditional_pledge_id: "kpi-counted-webhook-pledge",
        provider: "every_org" as const,
        provider_event_id_hash: `sha256:${"e".repeat(64)}`,
        provider_status: "recorded",
        amount_cents: 10_000,
        signature_verified: true,
        verified_at: "2026-06-02T09:00:00.000Z",
        append_only_hash: `sha256:${"f".repeat(64)}`,
        created_at: "2026-06-02T09:00:00.000Z",
      },
      {
        id: "kpi-payment-only-event",
        conditional_pledge_id: "kpi-payment-only-pledge",
        provider: "every_org" as const,
        provider_event_id_hash: `sha256:${"1".repeat(64)}`,
        provider_status: "recorded",
        amount_cents: 8_000,
        signature_verified: true,
        verified_at: "2026-06-01T13:00:00.000Z",
        append_only_hash: `sha256:${"2".repeat(64)}`,
        created_at: "2026-06-01T13:00:00.000Z",
      },
      {
        id: "kpi-setup-only-event",
        conditional_pledge_id: "kpi-setup-only-pledge",
        provider: "stripe" as const,
        provider_event_id_hash: `sha256:${"3".repeat(64)}`,
        provider_status: "setup_succeeded_token_ready",
        amount_cents: 9_000,
        signature_verified: true,
        verified_at: "2026-06-01T14:00:00.000Z",
        append_only_hash: `sha256:${"4".repeat(64)}`,
        created_at: "2026-06-01T14:00:00.000Z",
      },
      {
        id: "kpi-manual-proof-event",
        conditional_pledge_id: "kpi-counted-manual-pledge",
        provider: "manual_evidence" as const,
        provider_event_id_hash: `sha256:${"5".repeat(64)}`,
        provider_status: "external_handoff_verified",
        amount_cents: 7_000,
        signature_verified: true,
        verified_at: "2026-06-01T18:00:00.000Z",
        append_only_hash: `sha256:${"6".repeat(64)}`,
        created_at: "2026-06-01T18:00:00.000Z",
      },
    ],
    providerPaymentEvents: [],
  };
  const pledges = buildMpgfPublicGoodsPledgesFromContributionRows(rows);
  const records = buildMpgfPublicGoodsContributionKpiRecordsFromPersistedContributionRows({
    pledges,
    paymentEvents: rows.paymentEvents,
    providerPaymentEvents: rows.providerPaymentEvents,
  });
  const snapshot = buildMpgfPublicGoodsKpiSnapshot({
    generatedAt: "2026-06-15T12:00:00.000Z",
    pledges,
    paymentProofs: [],
    contributionKpiRecords: records,
  });

  assert.deepEqual(
    records.map((record) => record.pledgeId).sort(),
    ["kpi-counted-manual-pledge", "kpi-counted-webhook-pledge"],
  );
  assert.equal(records.every((record) => record.reviewRequiredBeforeCounting), true);
  assert.equal(records.filter((record) => record.autoVerified).length, 1);
  assert.equal(snapshot.funding.verifiedDollarsRoutedCents, 17_000);
  assert.equal(snapshot.funding.autoVerifiedContributionShareBps, 5000);
  assert.equal(snapshot.funding.autoVerifiedContributionCount, 1);
  assert.equal(snapshot.funding.manualVerifiedContributionCount, 1);
  assert.equal(snapshot.funding.medianHoursFromPledgeToCounted, 15);
  assert.equal(snapshot.safety.eligibleDirectCents, 17_000);
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
  assert.match(page, /Sealed public preview/);
  assert.match(page, /Threshold rules/);
  assert.equal(page.includes("assuranceStatus.verifiedSupporterCount"), false);
  assert.equal(page.includes("assuranceStatus.amountProgressBps"), false);
});

test("MPGF production completion gate fails while required production evidence is absent", () => {
  const result = validateMpgfDeploymentEnvironment("completion_gate");

  assert.equal(result.status, "failed");
  assert.ok(result.errors.some((error) => error.id === "production-prerequisites-missing"));
  assert.ok(result.errors.some((error) => error.id === "deployment-completion-evidence"));
  assert.ok(result.blockers.some((blocker) => /www-auth-session-verification\.md/.test(blocker)));
});

test("MPGF production runners distinguish pre-launch configuration from unrun production evidence", () => {
  const launch = runMpgfProductionDirectWorkingLaunch();
  const browserVerification = runMpgfWwwDirectWorkingVerification();

  assert.equal(validateMpgfDeploymentEnvironment("pre_launch").status, "passed");
  assert.equal(launch.status, "failed");
  assert.ok(launch.blockers.some((blocker) => /has not been executed/.test(blocker)));
  assert.equal(browserVerification.status, "failed");
  assert.ok(browserVerification.blockers.some((blocker) => /has not recorded a passed production-domain run/.test(blocker)));
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

  assert.equal(solverGate.status, "blocked");
  assert.ok(solverGate.blockers.some((blocker) => /benchmark report/i.test(blocker)));
  assert.equal(exactPilotGate.status, "blocked");
  assert.ok(exactPilotGate.blockers.some((blocker) => /exact-pilot dry-run/i.test(blocker)));
  assert.equal(payoutGate.status, "pending_review");
  assert.equal(governanceGate.status, "blocked");
  assert.ok(governanceGate.blockers.some((blocker) => /state-machine coverage artifact/i.test(blocker)));
  assert.equal(productionGate.status, "blocked");
  assert.equal(summary.status, "blocked");
  assert.equal(summary.completionProfiles.demoComplete, "blocked");
  assert.equal(summary.completionProfiles.exactPilotComplete, "blocked");
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
