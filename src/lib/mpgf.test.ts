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
  aggregateSaeAssessments,
  approveInternalPayoutAuthorization,
  carryOverVoidedPayout,
  compareMpgfDryRunToLive,
  isLedgerBalanced,
  preflightMpgfSolverSupport,
  revokeMpgfCompletionProfile,
  selectMpgfLiveSolver,
  solveMpgfByCertifiedBranchAndBound,
  solveMpgfByCompleteRegionEnumeration,
  verifyExternalPaymentEvidence,
  verifyMpgfOptimalityCertificate,
  voidPayoutAuthorization,
} from "./mpgf/mechanism";
import { mpgfPublicRoutes } from "./mpgf/data";
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
  validateMpgfWwwSmokeTestProfile,
  enforceMpgfRateLimit,
  redactMpgfSecrets,
  rotateMpgfSecret,
} from "./mpgf/validators";

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

test("MPGF direct-working validators pass while full Phase A source lock fails closed", () => {
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
  assert.equal(validateFormalMechanismSourceLock().status, "failed");
  assert.equal(validateMpgfPhaseA().status, "failed");
});

test("MPGF direct-working smoke test passes without real-money mode", () => {
  const result = runMpgfDirectWorkingSmokeTest();

  assert.equal(result.status, "passed");
  assert.equal(result.passed, true);
  assert.equal(result.featureMode, "pledge_only");
  assert.ok(result.checks.every((check) => typeof check.passed === "boolean"));
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

test("MPGF production runners are present and fail closed before production evidence exists", () => {
  assert.equal(validateMpgfDeploymentEnvironment("pre_launch").status, "passed");
  assert.equal(runMpgfProductionDirectWorkingLaunch().status, "failed");
  assert.equal(runMpgfWwwDirectWorkingVerification().status, "failed");
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

test("MPGF required fail-closed service surface is present", () => {
  assert.equal(preflightMpgfSolverSupport().liveOrdinaryAllocationAllowed, false);
  assert.equal(selectMpgfLiveSolver().status, "failed_closed");
  assert.equal(solveMpgfByCompleteRegionEnumeration().status, "failed_certification");
  assert.equal(solveMpgfByCertifiedBranchAndBound().status, "failed_certification");
  assert.equal(verifyMpgfOptimalityCertificate().status, "failed");

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
