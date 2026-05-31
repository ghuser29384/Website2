import assert from "node:assert/strict";
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
  fallbackAllocate,
  generateMpgfDemoAllocationCertificate,
  aggregateSaeAssessments,
  approveInternalPayoutAuthorization,
  carryOverVoidedPayout,
  compareMpgfDryRunToLive,
  createMpgfRecurringContributionCommitment,
  isLedgerBalanced,
  materializeMpgfRecurringPledgeForCycle,
  pauseMpgfRecurringContributionCommitment,
  preflightMpgfSolverSupport,
  resumeMpgfRecurringContributionCommitment,
  revokeMpgfCompletionProfile,
  runMpgfPublicRuntimeReadinessCheck,
  saveMpgfBallotDraft,
  selectMpgfLiveSolver,
  solveMpgfByCertifiedBranchAndBound,
  solveMpgfByCompleteRegionEnumeration,
  submitMpgfBallot,
  submitMpgfPoolProposalDraft,
  cancelMpgfRecurringContributionCommitment,
  verifyExternalPaymentEvidence,
  verifyMpgfOptimalityCertificate,
  voidPayoutAuthorization,
} from "./mpgf/mechanism";
import { mpgfPublicRoutes } from "./mpgf/data";
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
