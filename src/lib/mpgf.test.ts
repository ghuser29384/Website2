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
  assignMpgfPublicGoodsExperiment,
  evaluateMpgfPublicGoodsCohortAccess,
  getMpgfPublicGoodsFeatureFlagStatus,
  isLedgerBalanced,
  materializeMpgfRecurringPledgeForCycle,
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

  assert.ok(animalWelfare);
  assert.ok(knowledge);

  const animalStatus = getMpgfCampaignAssuranceStatus(animalWelfare);
  const knowledgeStatus = getMpgfCampaignAssuranceStatus(knowledge);
  const animalPledges = demoMpgfAssurancePledges.filter((pledge) => pledge.campaignId === animalWelfare.id);

  assert.equal(animalPledges.length, 4);
  assert.equal(animalStatus.verifiedSupporterCount, 3);
  assert.equal(animalStatus.excludedPledgeCount, 1);
  assert.equal(knowledgeStatus.status, "expired");
  assert.ok(computeMpgfCampaignQfScore(animalWelfare) > animalStatus.directEligibleCents);
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
  const dryRun = await persistMpgfPublicGoodsAllocationResults({
    allocation,
    dryRun: true,
    finalizedAt: "2026-05-30T12:00:00.000Z",
  });
  const route = readFileSync("src/app/api/mpgf/public-goods/allocate/route.ts", "utf8");

  assert.equal(rows.length, allocation.lines.length);
  assert.ok(globalHealth);
  assert.ok(resilience);
  assert.equal(globalHealth.status, "payable");
  assert.ok(globalHealth.total_payout_cents > 0);
  assert.ok(globalHealth.qf_bonus_cents <= globalHealth.qf_bonus_cap_cents);
  assert.notEqual(resilience.status, "payable");
  assert.equal(resilience.total_payout_cents, 0);
  assert.equal(dryRun.status, "dry_run");
  assert.equal(dryRun.persistedCount, 0);
  assert.match(route, /MPGF_ALLOCATION_SECRET/);
  assert.match(route, /persistMpgfPublicGoodsAllocationResults/);
  assert.match(route, /proofPageRequired/);
  assert.match(route, /qfBonusCapCents/);
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
  const consoleSummary = summarizeMpgfPublicGoodsReviewConsole();

  assert.equal(reviewed.campaign.reviewStatus, "challenge_window");
  assert.equal(reviewed.reviewCase.allowedNextActions.includes("finalize"), true);
  assert.equal(reviewed.createsPayoutAuthorization, false);
  assert.ok(consoleSummary.reasonCodes.includes("blocked_threat_baseline"));
  assert.equal(consoleSummary.privacySafeAnalyticsOnly, true);
  assert.equal(consoleSummary.rawPrivateTextStoredInAnalytics, false);
  assert.equal(demoMpgfPublicGoodsReviewCases.some((reviewCase) => reviewCase.reasonCode === "needs_destination_evidence"), true);
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

test("MPGF public-goods migration covers required entities and RLS policies", () => {
  const migration = readFileSync("supabase/migrations/20260529_mpgf_verified_assurance_matching.sql", "utf8");

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

  assert.match(migration, /is_recurring boolean not null default false/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /mpgf_public_goods_pledges_insert_own/);
  assert.match(migration, /mpgf_public_goods_payment_proofs_insert_own/);
  assert.match(migration, /reason_code text not null default 'needs_destination_evidence'/);
  assert.match(migration, /reconciliation_source text not null default 'external_receipt'/);
  assert.match(migration, /source_event_ref text/);
  assert.match(migration, /mpgf_public_goods_payment_proofs_source_event_idx/);
  assert.match(migration, /mpgf_public_goods_analytics_no_raw_contact/);
  assert.match(migration, /public_goods_threshold_amount_cents/);
  assert.match(migration, /public_goods_destination_type/);
  assert.match(migration, /insert into public\.mpgf_public_goods_campaigns/);
  assert.match(migration, /campaign-global-health-basic-needs/);
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
  assert.match(page, /Sponsor top-up/);
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
