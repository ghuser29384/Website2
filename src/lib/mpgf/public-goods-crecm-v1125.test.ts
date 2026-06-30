import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MPGF_PUBLIC_GOODS_CRECM_V1125_CANONICAL_STANCE_TO_PLAIN_LABEL,
  MPGF_PUBLIC_GOODS_CRECM_V1125_PLAIN_STANCE_LABELS,
  MPGF_PUBLIC_GOODS_CRECM_V1125_PLAIN_STANCE_TO_CANONICAL_STANCE,
  allocateMpgfCrecBonusMatchByScoreUnits,
  buildMpgfCrecBonusScoreHash,
  buildMpgfCrecContributorBenefitContextHash,
  buildMpgfCrecCoordinationCreditLedgerEntryHash,
  buildMpgfCrecDeploymentAuditHash,
  buildMpgfCrecFailureBonusClaimAuditContextHash,
  buildMpgfCrecFailureBonusClaimantConflictSnapshotHash,
  buildMpgfCrecFailureBonusEligibilityInputsHash,
  buildMpgfCrecAuthorizationReconciliationEventHash,
  buildMpgfCrecFeeQuoteHash,
  buildMpgfCrecImpactCertificateClaimHash,
  buildMpgfCrecOptimizationRunTraceHash,
  buildMpgfCrecPaymentCommitmentSnapshotHash,
  buildMpgfCrecProjectHardGateHash,
  buildMpgfCrecProjectRoundEligibilitySnapshotHash,
  buildMpgfCrecRoundAuditBundleHash,
  buildMpgfCrecRoundClearingInputBundleHash,
  buildMpgfCrecRoundCloseBundleRowUniquenessHash,
  buildMpgfCrecRoundMoralBucketSnapshotHash,
  buildMpgfCrecSuccessRewardClaimHash,
  buildMpgfCrecV1125ClearingContractSummary,
  capMpgfCrecDeploymentGrossExposure,
  createMpgfCrecFailureBonusClaim,
  evaluateMpgfCrecContributorBenefitEligibility,
  evaluateMpgfCrecCounterpartyVolumeSatisfaction,
  evaluateMpgfCrecFailureBonusEligibility,
  evaluateMpgfCrecNetPublicGoodSupporterBreadth,
  evaluateMpgfCrecProjectHardGate,
  evaluateMpgfCrecRoundStatusGate,
  evaluateMpgfCrecSuccessRewardClaim,
  hashMpgfCrecV1125Value,
  intersectMpgfCrecTrimStableStringArrays,
  minMpgfCrecNonNegativeSafeInteger,
  resolveMpgfCrecAllocatorStateInputs,
  resolveMpgfCrecCommonGroundBudgetAllocationInputs,
  resolveMpgfCrecConditionalIntentAllocationInputs,
  resolveMpgfCrecEconomicInputSanitization,
  resolveMpgfCrecIdentityEligibilityAllocationInputs,
  resolveMpgfCrecPlainStanceLabel,
  resolveMpgfCrecSupportStanceAllocationInputs,
  selectMpgfCrecFinalFailureBonusPayoutClaims,
  selectMpgfCrecPreliminaryFailureBonusMutationClaims,
  settleMpgfCrecFailureBonusClaim,
  sumMpgfCrecNonNegativeBigInt,
  sumMpgfCrecSponsorBackedCentsForFinalClearing,
  sumSelectedMpgfCrecSponsorPaidFeeSupportDemand,
  validateMpgfCrecAuthorizationReconciliationEvent,
  validateMpgfCrecCoordinationCreditLedgerEntry,
  validateMpgfCrecDeploymentAudit,
  validateMpgfCrecFeeQuote,
  validateMpgfCrecFailureBonusClaimantConflictSnapshot,
  validateMpgfCrecImpactCertificateClaim,
  validateMpgfCrecOptimizationRunTrace,
  validateMpgfCrecPaymentCommitmentSnapshot,
  validateMpgfCrecProjectIdentityRouteGate,
  validateMpgfCrecProjectRoundEligibilitySnapshot,
  validateMpgfCrecRoundAuditBundle,
  validateMpgfCrecRoundClearingInputBundle,
  validateMpgfCrecRoundCloseBundleRowUniqueness,
  validateMpgfCrecRoundMetadataGate,
  validateMpgfCrecRoundMoralBucketSnapshot,
  normalizeMpgfCrecSupporterCountMinNetPublicGoodCents,
  type MpgfCrecAuthorizationReconciliationEvent,
  type MpgfCrecContributorBenefitEligibilityInput,
  type MpgfCrecCoordinationCreditLedgerEntry,
  type MpgfCrecDeploymentAudit,
  type MpgfCrecFailureBonusClaimRecord,
  type MpgfCrecFailureBonusClaimantConflictSnapshot,
  type MpgfCrecFailureBonusEligibilityInput,
  type MpgfCrecFeeQuote,
  type MpgfCrecImpactCertificateClaim,
  type MpgfCrecOptimizationRunTrace,
  type MpgfCrecPaymentCommitmentSnapshot,
  type MpgfCrecProjectHardGateInput,
  type MpgfCrecProjectRoundEligibilitySnapshot,
  type MpgfCrecRoundAuditBundle,
  type MpgfCrecRoundClearingInputBundle,
  type MpgfCrecRoundMoralBucketSnapshot,
  type MpgfCrecSponsorCommitment,
  type MpgfCrecSuccessRewardClaimInput,
} from "./public-goods-crecm-v1125";
import {
  MPGF_PUBLIC_GOODS_CRECM_V1125_ROUTE_POLICY,
  buildMpgfCrecV1125NoSideEffectPostApi,
  buildMpgfCrecV1125RouteContractApi,
  getMpgfCrecV1125AuditBundleApi,
  getMpgfCrecV1125FailureBonusClaimsApi,
  getMpgfCrecV1125PaymentCommitmentSnapshotsApi,
  getMpgfCrecV1125ProjectReviewStateApi,
  getMpgfCrecV1125RecipientRegistryApi,
  getMpgfCrecV1125SettlementPreviewApi,
  getMpgfCrecV1125SponsorCommitmentsApi,
} from "./public-goods-crecm-route-contract";

const roundId = "round-crecm-2026-05";
const participantId = "participant-alix";
const commonGroundBudgetId = "budget-alix";
const projectId = "project-clean-air";
const conditionalTradeIntentId = "intent-alix-clean-air";
const rulebookHash = hashMpgfCrecV1125Value({ rulebook: "crecm-v1.125" });
const sourceHash = hashMpgfCrecV1125Value({ sponsorPool: "round-crecm-2026-05" });
const opensAt = "2026-05-01T00:00:00.000Z";
const parametersFrozenAt = "2026-04-30T20:00:00.000Z";
const closesAt = "2026-05-14T00:00:00.000Z";
const earlyFailureBonusCutoff = "2026-05-07T00:00:00.000Z";
const reviewFreezeAt = "2026-05-10T00:00:00.000Z";
const challengeDeadline = "2026-05-21T00:00:00.000Z";
const roundCloseSourceCutoff = closesAt;
const createdAt = "2026-04-30T19:00:00.000Z";

test("CRECM v1.125 exposes the Section 14 route surface as fail-closed route contracts", () => {
  const routeContract = buildMpgfCrecV1125RouteContractApi();

  assert.equal(routeContract.policy, MPGF_PUBLIC_GOODS_CRECM_V1125_ROUTE_POLICY);
  assert.equal(routeContract.userFacingLabel, "Common Ground Budget");
  assert.equal(routeContract.exactRouteSurface, true);
  assert.equal(routeContract.stateChangingRoutesFailClosedUntilPrerequisitesPass, true);

  for (const route of [
    "POST /api/mpgf/rounds/:roundId/common-ground-budget",
    "POST /api/mpgf/rounds/:roundId/common-ground-budget/cancel",
    "POST /api/mpgf/rounds/:roundId/support-stance",
    "POST /api/mpgf/rounds/:roundId/conditional-intent",
    "GET /api/mpgf/rounds/:roundId/settlement-preview",
    "POST /api/mpgf/pivotality-calculator",
    "GET /api/mpgf/rounds/:roundId/payment-commitment-snapshots",
    "POST /api/mpgf/rounds/:roundId/payment-commitment-snapshots",
    "POST /api/mpgf/rounds/:roundId/lock",
    "POST /api/mpgf/rounds/:roundId/clear",
    "POST /api/mpgf/rounds/:roundId/authorize",
    "POST /api/mpgf/rounds/:roundId/reconcile-authorizations",
    "GET /api/mpgf/rounds/:roundId/authorization-reconciliation-events",
    "POST /api/mpgf/rounds/:roundId/capture",
    "POST /api/mpgf/rounds/:roundId/freeze",
    "GET /api/mpgf/rounds/:roundId/sponsor-commitments",
    "POST /api/mpgf/rounds/:roundId/sponsor-commitments",
    "POST /api/mpgf/rounds/:roundId/release-failed",
    "GET /api/mpgf/rounds/:roundId/failure-bonus-claims",
    "POST /api/mpgf/rounds/:roundId/failure-bonus-claims/:claimId/resolve",
    "GET /api/mpgf/rounds/:roundId/success-reward-claims",
    "POST /api/mpgf/rounds/:roundId/success-reward-claims/:claimId/resolve",
    "GET /api/mpgf/rounds/:roundId/coordination-credits",
    "GET /api/mpgf/rounds/:roundId/impact-certificates",
    "GET /api/mpgf/rounds/:roundId/audit-bundle",
    "GET /api/mpgf/projects/:projectId/review-state",
    "POST /api/mpgf/projects/:projectId/challenge",
    "POST /api/mpgf/projects/:projectId/conflict-review",
    "GET /api/mpgf/recipient-registry",
    "POST /api/mpgf/recipient-registry",
  ] as const) {
    assert.ok(routeContract.routes.includes(route));
  }

  for (const [path, expected] of [
    ["src/app/api/mpgf/rounds/[roundId]/common-ground-budget/route.ts", /common-ground-budget-preview/],
    ["src/app/api/mpgf/rounds/[roundId]/common-ground-budget/cancel/route.ts", /common_ground_budget_cancel/],
    ["src/app/api/mpgf/rounds/[roundId]/support-stance/route.ts", /support_stance_intake/],
    ["src/app/api/mpgf/rounds/[roundId]/conditional-intent/route.ts", /conditional_intent_intake/],
    ["src/app/api/mpgf/rounds/[roundId]/settlement-preview/route.ts", /getMpgfCrecV1125SettlementPreviewApi/],
    ["src/app/api/mpgf/pivotality-calculator/route.ts", /evaluateMpgfPivotalityCalculator/],
    ["src/app/api/mpgf/rounds/[roundId]/payment-commitment-snapshots/route.ts", /getMpgfCrecV1125PaymentCommitmentSnapshotsApi/],
    ["src/app/api/mpgf/rounds/[roundId]/lock/route.ts", /round_lock/],
    ["src/app/api/mpgf/rounds/[roundId]/clear/route.ts", /round_clear/],
    ["src/app/api/mpgf/rounds/[roundId]/authorize/route.ts", /post_clear_authorize/],
    ["src/app/api/mpgf/rounds/[roundId]/reconcile-authorizations/route.ts", /authorization_reconciliation/],
    ["src/app/api/mpgf/rounds/[roundId]/authorization-reconciliation-events/route.ts", /getMpgfCrecV1125AuthorizationReconciliationEventsApi/],
    ["src/app/api/mpgf/rounds/[roundId]/capture/route.ts", /post_reconciliation_capture/],
    ["src/app/api/mpgf/rounds/[roundId]/freeze/route.ts", /safety_freeze/],
    ["src/app/api/mpgf/rounds/[roundId]/sponsor-commitments/route.ts", /getMpgfCrecV1125SponsorCommitmentsApi/],
    ["src/app/api/mpgf/rounds/[roundId]/release-failed/route.ts", /release_failed_rows/],
    ["src/app/api/mpgf/rounds/[roundId]/failure-bonus-claims/route.ts", /getMpgfCrecV1125FailureBonusClaimsApi/],
    ["src/app/api/mpgf/rounds/[roundId]/failure-bonus-claims/[claimId]/resolve/route.ts", /failure_bonus_claim_resolve/],
    ["src/app/api/mpgf/rounds/[roundId]/success-reward-claims/route.ts", /success_reward_claims/],
    ["src/app/api/mpgf/rounds/[roundId]/success-reward-claims/[claimId]/resolve/route.ts", /success_reward_claim_resolve/],
    ["src/app/api/mpgf/rounds/[roundId]/coordination-credits/route.ts", /coordination_credits/],
    ["src/app/api/mpgf/rounds/[roundId]/impact-certificates/route.ts", /impact_certificates/],
    ["src/app/api/mpgf/rounds/[roundId]/audit-bundle/route.ts", /getMpgfCrecV1125AuditBundleApi/],
    ["src/app/api/mpgf/projects/[projectId]/review-state/route.ts", /getMpgfCrecV1125ProjectReviewStateApi/],
    ["src/app/api/mpgf/projects/[projectId]/challenge/route.ts", /project_challenge_intake/],
    ["src/app/api/mpgf/projects/[projectId]/conflict-review/route.ts", /project_conflict_review_intake/],
    ["src/app/api/mpgf/recipient-registry/route.ts", /getMpgfCrecV1125RecipientRegistryApi/],
  ] as const) {
    assert.match(readFileSync(path, "utf8"), expected);
  }

  assert.equal(
    buildMpgfCrecV1125NoSideEffectPostApi({
      operation: "support_stance_intake",
      route: "/api/mpgf/rounds/:roundId/support-stance",
      roundId: "mpgf-assurance-round-demo-2026-05",
    }).userFacingLabel,
    "Common Ground Budget",
  );

  const settlementPreview = getMpgfCrecV1125SettlementPreviewApi("mpgf-assurance-round-demo-2026-05");
  assert.ok(settlementPreview);
  assert.equal(settlementPreview.nonBindingSettlementPreview, true);
  assert.equal(settlementPreview.bindingChannels.grossCapturedCents, 0);
  assert.equal(settlementPreview.requiredSnapshotKindForBinding, "round_close");

  const paymentSnapshots = getMpgfCrecV1125PaymentCommitmentSnapshotsApi("mpgf-assurance-round-demo-2026-05");
  assert.ok(paymentSnapshots);
  assert.ok(paymentSnapshots.supportedSnapshotKinds.includes("round_close"));
  assert.equal(paymentSnapshots.providerConfirmedStateRequiredForBinding, true);

  const sponsorCommitments = getMpgfCrecV1125SponsorCommitmentsApi("mpgf-assurance-round-demo-2026-05");
  assert.ok(sponsorCommitments);
  assert.deepEqual(sponsorCommitments.positiveBackingStates, ["contractually_committed", "funded", "escrowed"]);

  const failureBonusClaims = getMpgfCrecV1125FailureBonusClaimsApi("mpgf-assurance-round-demo-2026-05");
  assert.ok(failureBonusClaims);
  assert.equal(failureBonusClaims.claimCreationRequiresFullQualifiedPredicate, true);

  const auditBundle = getMpgfCrecV1125AuditBundleApi("mpgf-assurance-round-demo-2026-05");
  assert.ok(auditBundle);
  assert.equal(auditBundle.publicAuditBundleRequiresFinalRoundCloseBundle, true);
  assert.equal(auditBundle.roundAuditBundleContract.optimizationTraceIdRequired, true);
  assert.ok(
    auditBundle.roundAuditBundleContract.requiredDirectComponentHashes.includes(
      "deploymentExposureInputHash",
    ),
  );

  const projectReview = getMpgfCrecV1125ProjectReviewStateApi("campaign-animal-welfare-transition");
  assert.equal(projectReview.ok, true);
  if (!projectReview.ok) {
    throw new Error("Expected demo CRECM project review state to exist.");
  }
  assert.equal(projectReview.fiscalHostConflictCovered, true);

  const recipientRegistry = getMpgfCrecV1125RecipientRegistryApi();
  assert.ok(recipientRegistry.recipients.length > 0);
  assert.equal(recipientRegistry.privateBenefitProjectsAllowed, false);

  const intake = buildMpgfCrecV1125NoSideEffectPostApi({
    operation: "support_stance_intake",
    route: "/api/mpgf/rounds/:roundId/support-stance",
    roundId: "mpgf-assurance-round-demo-2026-05",
  });
  assert.equal(intake.stateMutation, "none_fail_closed_contract_only");
  assert.equal(intake.paymentCaptureAllowed, false);
  assert.equal(intake.finalReviewRequiredBeforeBindingSave, true);
});

test("CRECM v1.125 migration persists rewards, credits, certificates, and sealed pledge defaults", () => {
  const migration = readFileSync(
    "supabase/migrations/20260630_mpgf_crecm_v1125_success_rewards_credits_certificates.sql",
    "utf8",
  );

  assert.match(migration, /alter table public\.mpgf_public_goods_rounds/);
  assert.match(migration, /mechanism_version text not null default 'verified_assurance_matching_pilot'/);
  assert.match(migration, /'crecm_v1_125'/);
  assert.match(migration, /success_reward_policy_version text not null default 'success_reward_v1'/);
  assert.match(migration, /success_reward_budget_cents bigint not null default 0/);
  assert.match(migration, /success_reward_rate_bps integer not null default 0/);
  assert.match(migration, /success_reward_max_rate_bps integer not null default 0/);
  assert.match(migration, /success_reward_dominance_mode text not null default 'off'/);
  assert.match(migration, /sealed_pledge_mode text not null default 'blind_until_close'/);
  assert.match(migration, /sealed_pledge_mode in \('blind_until_close', 'delayed_rounded_public', 'public_exact'\)/);
  assert.match(migration, /impact_certificate_policy_hash text not null default 'sha256:pending-impact-certificate-policy'/);
  assert.match(migration, /MPGF_MECHANISM_VERSION feature flag/);
  assert.match(migration, /alter table public\.mpgf_public_goods_sponsor_commitments/);
  assert.match(
    migration,
    /sponsor_pool_type in \('base_match', 'bonus_match', 'failure_bonus', 'fee_support', 'success_reward'\)/,
  );
  assert.match(migration, /create table if not exists public\.mpgf_public_goods_success_reward_claims/);
  assert.match(migration, /create table if not exists public\.mpgf_public_goods_coordination_credit_ledger_entries/);
  assert.match(migration, /create table if not exists public\.mpgf_public_goods_impact_certificate_claims/);
  assert.match(migration, /non_transferable boolean not null default true check \(non_transferable = true\)/);
  assert.match(migration, /affects_allocation_power boolean not null default false check \(affects_allocation_power = false\)/);
  assert.match(migration, /retroactive_access_allowed boolean not null default false check \(retroactive_access_allowed = false\)/);
  assert.match(migration, /alter table public\.mpgf_public_goods_success_reward_claims enable row level security/);
  assert.match(migration, /grant all on public\.mpgf_public_goods_success_reward_claims to service_role/);
  assert.doesNotMatch(migration, /grant select on public\.mpgf_public_goods_success_reward_claims to authenticated/);
});

function h(label: string) {
  return hashMpgfCrecV1125Value({ label });
}

function paymentSnapshot(
  overrides: Partial<MpgfCrecPaymentCommitmentSnapshot> = {},
): MpgfCrecPaymentCommitmentSnapshot {
  const base: Omit<MpgfCrecPaymentCommitmentSnapshot, "snapshotHash"> = {
    snapshotKind: "round_close",
    roundId,
    participantId,
    commonGroundBudgetId,
    paymentMethodRef: "pm_confirmed_123",
    paymentMethodSavedAt: "2026-05-05T00:00:00.000Z",
    paymentMethodCommitmentState: "provider_confirmed",
    paymentMethodConfirmedAt: "2026-05-05T00:01:00.000Z",
    asOf: closesAt,
    providerEvidenceHash: h("provider-evidence"),
    rulebookHash,
    createdAt: closesAt,
    ...overrides,
  };

  return {
    ...base,
    snapshotHash: overrides.snapshotHash ?? buildMpgfCrecPaymentCommitmentSnapshotHash(base),
  };
}

function moralBucketSnapshot(
  overrides: Partial<MpgfCrecRoundMoralBucketSnapshot> = {},
): MpgfCrecRoundMoralBucketSnapshot {
  const base: Omit<MpgfCrecRoundMoralBucketSnapshot, "snapshotHash"> = {
    id: "bucket-snapshot-1",
    roundId,
    rulebookHash,
    distinctnessPolicyVersion: "reciprocal-distinct-v1",
    bucketIds: ["humanitarian", "pluralist"],
    reciprocalDistinctFromBucketIdsByBucketId: {
      humanitarian: ["pluralist"],
      pluralist: ["humanitarian"],
    },
    asymmetricPairCount: 0,
    blockedAsymmetricPairs: [],
    createdAt,
    ...overrides,
  };

  return {
    ...base,
    snapshotHash: overrides.snapshotHash ?? buildMpgfCrecRoundMoralBucketSnapshotHash(base),
  };
}

function clearingBundle(
  overrides: Partial<MpgfCrecRoundClearingInputBundle> = {},
): MpgfCrecRoundClearingInputBundle {
  const bucketSnapshot = moralBucketSnapshot();
  const base: Omit<MpgfCrecRoundClearingInputBundle, "bundleHash"> = {
    id: "clearing-bundle-1",
    roundId,
    rulebookHash,
    feePolicyVersion: "fee-policy-v1",
    feePolicyHash: h("fee-policy"),
    deploymentMode: "capped_pilot",
    pilotMaxRoundGrossExposureCents: 100_000,
    pilotMaxParticipantGrossExposureCents: 10_000,
    deploymentAuditState: "not_required",
    deploymentAuditId: null,
    deploymentAuditHash: null,
    paymentReconciliationPathHash: h("payment-reconciliation-path"),
    optimizationPolicyHash: h("optimization-policy"),
    calculationVersion: "crecm-v1.125-calc",
    bundleSchemaVersion: "bundle-schema-v1",
    snapshotKind: "round_close",
    sourceCutoffAt: closesAt,
    commonGroundBudgetInputHash: h("common-ground-budget-input"),
    supportStanceInputHash: h("support-stance-input"),
    conditionalTradeIntentInputHash: h("conditional-intent-input"),
    identityEligibilityInputHash: h("identity-eligibility-input"),
    paymentCommitmentSnapshotHash: paymentSnapshot().snapshotHash,
    feeInputHash: h("fee-input"),
    deploymentExposureInputHash: h("deployment-exposure-input"),
    projectInputHash: h("project-input"),
    projectEligibilitySnapshotHash: h("project-eligibility-snapshot"),
    sponsorCommitmentInputHash: sourceHash,
    successRewardInputHash: h("success-reward-input"),
    coordinationCreditInputHash: h("coordination-credit-input"),
    impactCertificateInputHash: h("impact-certificate-input"),
    moralBucketSnapshotId: bucketSnapshot.id,
    moralBucketSnapshotHash: bucketSnapshot.snapshotHash,
    canonicalInputJsonRef: "s3://audit/round-crecm-2026-05/input.json",
    canonicalInputJsonHash: h("canonical-input-json"),
    createdAt: closesAt,
    ...overrides,
  };

  return {
    ...base,
    bundleHash: overrides.bundleHash ?? buildMpgfCrecRoundClearingInputBundleHash(base),
  };
}

function deploymentAudit(
  overrides: Partial<MpgfCrecDeploymentAudit> = {},
): MpgfCrecDeploymentAudit {
  const bundle = clearingBundle();
  const base: Omit<MpgfCrecDeploymentAudit, "auditHash"> = {
    id: "deployment-audit-1",
    roundId,
    auditKind: "pilot_to_full",
    targetDeploymentMode: "full",
    calculationVersion: bundle.calculationVersion,
    rulebookHash,
    feePolicyHash: bundle.feePolicyHash,
    sponsorPoolSourceHash: sourceHash,
    paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
    solverVersion: "glpk-5.0-fixed",
    priorRoundIds: ["prior-capped-pilot-1"],
    priorAuditBundleHashes: [h("prior-capped-pilot-audit-bundle")],
    priorRoundDeploymentModes: ["capped_pilot"],
    priorPaymentReconciliationPathHashes: [bundle.paymentReconciliationPathHash],
    priorRoundOutcomeStates: ["passed"],
    auditState: "passed",
    auditorId: "deployment-auditor-1",
    createdAt: parametersFrozenAt,
    ...overrides,
  };

  return {
    ...base,
    auditHash: overrides.auditHash ?? buildMpgfCrecDeploymentAuditHash(base),
  };
}

function sponsorCommitment(
  overrides: Partial<MpgfCrecSponsorCommitment> = {},
): MpgfCrecSponsorCommitment {
  return {
    id: "sponsor-commitment-1",
    roundId,
    poolType: "failure_bonus",
    commitmentState: "funded",
    committedCents: 5_000,
    fundedCents: 5_000,
    sourceHash,
    publishedAt: parametersFrozenAt,
    backingConfirmedAt: parametersFrozenAt,
    ...overrides,
  };
}

function projectEligibilitySnapshot(
  overrides: Partial<MpgfCrecProjectRoundEligibilitySnapshot> = {},
): MpgfCrecProjectRoundEligibilitySnapshot {
  const base: Omit<MpgfCrecProjectRoundEligibilitySnapshot, "snapshotHash"> = {
    snapshotKind: "round_open",
    sourceCutoffAt: opensAt,
    roundId,
    projectId,
    rulebookHash,
    eligibility: {
      scopeValidMoralPublicGood: true,
      destinationRouteValid: true,
      externalityClear: true,
      baselineIntegrityApproved: true,
      baselineConfidenceApproved: true,
      actionEvidenceApproved: true,
      reviewApproved: true,
      challengeClearOrNonBlocking: true,
      conflictReviewClear: true,
      sponsorCompatible: true,
      legalCustodyClear: true,
    },
    createdAt: opensAt,
    ...overrides,
  };

  return {
    ...base,
    snapshotHash: overrides.snapshotHash ?? buildMpgfCrecProjectRoundEligibilitySnapshotHash(base),
  };
}

function authorizationReconciliationEvent(
  overrides: Partial<MpgfCrecAuthorizationReconciliationEvent> = {},
): MpgfCrecAuthorizationReconciliationEvent {
  const base: Omit<MpgfCrecAuthorizationReconciliationEvent, "eventHash"> = {
    id: "auth-reconciliation-1",
    roundId,
    clearingIteration: 1,
    participantId,
    projectId,
    conditionalTradeIntentId,
    custodyAuthorizationId: "auth-row-1",
    requiredAmountCents: 1_000,
    authorizedAmountCents: 1_000,
    removedAmountCents: 0,
    authExpiresAt: "2026-05-20T00:00:00.000Z",
    expectedCaptureBy: "2026-05-19T00:00:00.000Z",
    reconciliationState: "kept_authorized",
    reasonCode: "exact_amount_authorized",
    createdAt: closesAt,
    ...overrides,
  };

  return {
    ...base,
    eventHash: overrides.eventHash ?? buildMpgfCrecAuthorizationReconciliationEventHash(base),
  };
}

function feeQuote(overrides: Partial<MpgfCrecFeeQuote> = {}): MpgfCrecFeeQuote {
  const bundle = clearingBundle();
  const base: Omit<MpgfCrecFeeQuote, "quoteHash"> = {
    id: "fee-quote-1",
    roundId,
    commonGroundBudgetId,
    projectId,
    conditionalTradeIntentId,
    feePolicyVersion: bundle.feePolicyVersion,
    feePolicyHash: bundle.feePolicyHash,
    feePayer: "donor_deducted",
    grossCapturedCents: 1_000,
    feeCents: 30,
    netRecipientDisbursedCents: 970,
    sponsorFeeBackingHash: null,
    createdAt: closesAt,
    ...overrides,
  };

  return {
    ...base,
    quoteHash: overrides.quoteHash ?? buildMpgfCrecFeeQuoteHash(base),
  };
}

function optimizationRunTrace(
  overrides: Partial<MpgfCrecOptimizationRunTrace> = {},
): MpgfCrecOptimizationRunTrace {
  const bundle = clearingBundle();
  const base: Omit<MpgfCrecOptimizationRunTrace, "optimizationTraceHash"> = {
    id: "optimization-trace-1",
    roundId,
    clearingInputBundleId: bundle.id,
    clearingInputBundleHash: bundle.bundleHash,
    calculationVersion: bundle.calculationVersion,
    optimizationStage: "stage_3_binding_allocation",
    traceSchemaVersion: "optimization-trace-v1",
    optimizationPolicyHash: bundle.optimizationPolicyHash,
    solverMode: "ilp",
    solverVersion: "glpk-5.0-fixed",
    optimalityStatus: "optimal",
    optimizationInputHash: h("optimization-input"),
    objectiveVectorHash: h("objective-vector"),
    stableTieBreakTupleHash: h("stable-tie-break-tuple"),
    selectedCoalitionHash: h("selected-coalition"),
    selectedAllocationRowsHash: h("selected-allocation-rows"),
    constraintSatisfactionHash: h("constraint-satisfaction"),
    createdAt: closesAt,
    ...overrides,
  };

  return {
    ...base,
    optimizationTraceHash: overrides.optimizationTraceHash ?? buildMpgfCrecOptimizationRunTraceHash(base),
  };
}

function roundAuditBundle(
  overrides: Partial<MpgfCrecRoundAuditBundle> = {},
): MpgfCrecRoundAuditBundle {
  const bundle = clearingBundle();
  const trace = optimizationRunTrace();
  const base: Omit<MpgfCrecRoundAuditBundle, "auditBundleHash"> = {
    id: "audit-bundle-1",
    roundId,
    rulebookHash,
    calculationVersion: bundle.calculationVersion,
    clearingInputBundleId: bundle.id,
    clearingInputBundleHash: bundle.bundleHash,
    canonicalInputJsonHash: bundle.canonicalInputJsonHash,
    feeInputHash: bundle.feeInputHash,
    feePolicyHash: bundle.feePolicyHash,
    deploymentExposureInputHash: bundle.deploymentExposureInputHash,
    paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
    deploymentAuditHash: bundle.deploymentAuditHash,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
    optimizationTraceId: trace.id,
    optimizationTraceHash: trace.optimizationTraceHash,
    projectInputHash: bundle.projectInputHash,
    sponsorCommitmentInputHash: bundle.sponsorCommitmentInputHash,
    moralBucketSnapshotHash: bundle.moralBucketSnapshotHash,
    bonusScoreHash: h("bonus-score"),
    createdAt: closesAt,
    ...overrides,
  };

  return {
    ...base,
    auditBundleHash: overrides.auditBundleHash ?? buildMpgfCrecRoundAuditBundleHash(base),
  };
}

function roundAuditBundleExpectedContext(
  bundle: MpgfCrecRoundClearingInputBundle = clearingBundle(),
  trace: MpgfCrecOptimizationRunTrace = optimizationRunTrace(),
) {
  return {
    roundId,
    rulebookHash,
    calculationVersion: bundle.calculationVersion,
    clearingInputBundleId: bundle.id,
    clearingInputBundleHash: bundle.bundleHash,
    canonicalInputJsonHash: bundle.canonicalInputJsonHash,
    feeInputHash: bundle.feeInputHash,
    feePolicyHash: bundle.feePolicyHash,
    deploymentExposureInputHash: bundle.deploymentExposureInputHash,
    paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
    deploymentAuditHash: bundle.deploymentAuditHash,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
    optimizationTraceId: trace.id,
    optimizationTraceHash: trace.optimizationTraceHash,
    projectInputHash: bundle.projectInputHash,
    sponsorCommitmentInputHash: bundle.sponsorCommitmentInputHash,
    moralBucketSnapshotHash: bundle.moralBucketSnapshotHash,
    bonusScoreHash: h("bonus-score"),
  };
}

function bonusScoreHash(rows: Array<{ projectId: string; bonusScoreUnits: string }>) {
  return buildMpgfCrecBonusScoreHash({
    calculationVersion: "crecm-v1.125-fixed-point-bonus",
    fixedPointPrecision: 12,
    roundingMode: "half_even",
    rows,
  });
}

function rowUniquenessInput(
  overrides: Partial<Parameters<typeof validateMpgfCrecRoundCloseBundleRowUniqueness>[0]> = {},
): Parameters<typeof validateMpgfCrecRoundCloseBundleRowUniqueness>[0] {
  const payment = paymentSnapshot({
    snapshotKind: "early_failure_bonus_cutoff",
    asOf: earlyFailureBonusCutoff,
    createdAt: earlyFailureBonusCutoff,
  });

  return {
    roundId,
    projectId,
    participantId,
    commonGroundBudgetId,
    paymentSnapshotKind: "early_failure_bonus_cutoff",
    publicGoodProjects: [
      {
        roundId,
        id: projectId,
        bucketId: "bucket-clean-air",
      },
    ],
    commonGroundBudgets: [
      {
        roundId,
        id: commonGroundBudgetId,
        participantId,
      },
    ],
    supportStances: [
      {
        id: "stance-alix-clean-air",
        roundId,
        commonGroundBudgetId,
        projectId,
        participantId,
      },
    ],
    conditionalTradeIntents: [
      {
        id: conditionalTradeIntentId,
        roundId,
        commonGroundBudgetId,
        projectId,
        participantId,
      },
    ],
    identityEligibilityRows: [
      {
        roundId,
        participantId,
      },
    ],
    paymentCommitmentSnapshots: [payment],
    projectRoundEligibilitySnapshots: [projectEligibilitySnapshot()],
    ...overrides,
  };
}

function supporterCreditRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    roundId,
    projectId,
    participantId: "supporter-1",
    activeClusterId: "cluster-1",
    netRecipientDisbursedCents: 100,
    humanVerified: true,
    sybilRiskState: "clear",
    collusionRiskState: "clear",
    linkedAccountExcluded: true,
    samePaymentMethodExcluded: true,
    sameControlExcluded: true,
    ...overrides,
  };
}

function counterpartyVolumeRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    roundId,
    projectId,
    participantId,
    counterpartyParticipantId: "participant-bo",
    counterpartyBucketId: "bucket-animal-welfare",
    counterpartyVolumeSource: "net_recipient_public_good_credit",
    netRecipientDisbursedCents: 1_000,
    matchEligibleCents: 800,
    counterpartyHumanVerified: true,
    counterpartySybilRiskState: "clear",
    counterpartyCollusionRiskState: "clear",
    participantLinkedAccountClusterId: "linked-alix",
    counterpartyLinkedAccountClusterId: "linked-bo",
    participantSamePaymentMethodClusterId: "payment-alix",
    counterpartySamePaymentMethodClusterId: "payment-bo",
    participantSameControlEntityId: "control-alix",
    counterpartySameControlEntityId: "control-bo",
    ...overrides,
  };
}

function projectHardGateInput(
  overrides: Partial<MpgfCrecProjectHardGateInput> = {},
): MpgfCrecProjectHardGateInput {
  return {
    deploymentMode: "capped_pilot",
    projectScopeState: "valid_moral_public_good",
    destinationRouteState: "valid",
    externalityState: "clear",
    reviewState: "approved",
    challengeState: "clear",
    conflictReviewState: "clear",
    sponsorCompatibilityState: "compatible",
    legalCustodyState: "clear",
    baselineIntegrityState: "approved",
    baselineConfidenceState: "approved",
    actionEvidenceState: "approved",
    ...overrides,
  };
}

function failureBonusInput(
  overrides: Partial<MpgfCrecFailureBonusEligibilityInput> = {},
): MpgfCrecFailureBonusEligibilityInput {
  const hardGate = evaluateMpgfCrecProjectHardGate(projectHardGateInput());
  const rowUniqueness = validateMpgfCrecRoundCloseBundleRowUniqueness(rowUniquenessInput());
  const conflictSnapshot = failureBonusClaimantConflictSnapshot();

  return {
    roundId,
    projectId,
    participantId,
    commonGroundBudgetId,
    conditionalTradeIntentId,
    failureBonusPolicyVersion: "failure-bonus-v1",
    roundStatus: "payable",
    projectFailed: true,
    failureReason: "counterparty_volume_shortfall",
    clearingBundleEligible: true,
    clearingInputBundleHash: clearingBundle().bundleHash,
    projectHardGateEligible: hardGate.eligible,
    projectHardGateHash: hardGate.hardGateHash ?? buildMpgfCrecProjectHardGateHash(projectHardGateInput()),
    rowUniquenessEligible: rowUniqueness.eligible,
    rowUniquenessHash:
      rowUniqueness.rowUniquenessHash ??
      buildMpgfCrecRoundCloseBundleRowUniquenessHash(rowUniquenessInput()),
    paymentSnapshotEligible: true,
    paymentCommitmentSnapshotHash: paymentSnapshot({ snapshotKind: "early_failure_bonus_cutoff", asOf: earlyFailureBonusCutoff }).snapshotHash,
    failedQualifiedMatchEligibleCents: 1_000,
    participantRoundFailureBonusCapCents: 75,
    roundFailureBonusBudgetCents: 500,
    backedFailureBonusPoolCents: 500,
    totalSponsorBudgetCents: 10_000,
    claimantConflictSnapshotEligible: true,
    claimantConflictSnapshotId: conflictSnapshot.id,
    claimantConflictSnapshotHash: conflictSnapshot.snapshotHash,
    claimantConflictSourceCutoff: conflictSnapshot.sourceCutoffAt,
    claimantConflictState: "no_conflict",
    ...overrides,
  };
}

function failureBonusClaimantConflictSnapshot(
  overrides: Partial<MpgfCrecFailureBonusClaimantConflictSnapshot> = {},
): MpgfCrecFailureBonusClaimantConflictSnapshot {
  const base: Omit<MpgfCrecFailureBonusClaimantConflictSnapshot, "snapshotHash"> = {
    id: "claimant-conflict-snapshot-1",
    snapshotKind: "failure_bonus_claimant_conflict",
    roundId,
    projectId,
    participantId,
    commonGroundBudgetId,
    conditionalTradeIntentId,
    rulebookHash,
    failureBonusPolicyVersion: "failure-bonus-v1",
    sourceCutoffAt: roundCloseSourceCutoff,
    conflictState: "no_conflict",
    createdAt: roundCloseSourceCutoff,
    ...overrides,
  };

  return {
    ...base,
    snapshotHash:
      overrides.snapshotHash ?? buildMpgfCrecFailureBonusClaimantConflictSnapshotHash(base),
  };
}

function failureBonusClaim(
  overrides: Partial<MpgfCrecFailureBonusClaimRecord> = {},
): MpgfCrecFailureBonusClaimRecord {
  const earlyPaymentSnapshot = paymentSnapshot({
    snapshotKind: "early_failure_bonus_cutoff",
    asOf: earlyFailureBonusCutoff,
    createdAt: earlyFailureBonusCutoff,
  });
  const conflictSnapshot = failureBonusClaimantConflictSnapshot();
  const claim: MpgfCrecFailureBonusClaimRecord = {
    id: "failure-claim-1",
    roundId,
    projectId,
    participantId,
    commonGroundBudgetId,
    conditionalTradeIntentId,
    failureBonusPolicyVersion: "failure-bonus-v1",
    claimState: "approved",
    denialReason: null,
    payoutRef: null,
    resolvedAt: null,
    createdAt: closesAt,
    failureReason: "counterparty_volume_shortfall",
    clearingInputBundleHash: clearingBundle().bundleHash,
    paymentCommitmentSnapshotHash: earlyPaymentSnapshot.snapshotHash,
    projectRoundEligibilitySnapshotHash: projectEligibilitySnapshot().snapshotHash,
    claimantConflictSnapshotId: conflictSnapshot.id,
    claimantConflictSnapshotHash: conflictSnapshot.snapshotHash,
    claimantConflictState: conflictSnapshot.conflictState,
    claimantConflictSourceCutoff: conflictSnapshot.sourceCutoffAt,
    earlyFailureBonusCutoff,
    paymentMethodSavedAt: "2026-05-05T00:00:00.000Z",
    paymentMethodConfirmedAt: "2026-05-05T00:01:00.000Z",
    failedQualifiedMatchEligibleCents: 1_000,
    rawBonusCents: 100,
    participantRoundCapCents: 75,
    participantCappedProvisionalBonusCents: 75,
    bonusCents: 75,
    finalFailureBonusCents: 75,
    prorationFactorBps: 10_000,
    eligibilityInputsHash: "",
    ...overrides,
  };

  return {
    ...claim,
    eligibilityInputsHash:
      overrides.eligibilityInputsHash ?? buildMpgfCrecFailureBonusClaimAuditContextHash(claim),
  };
}

function failureBonusClaimCreationInput(
  overrides: Partial<Parameters<typeof createMpgfCrecFailureBonusClaim>[0]> = {},
): Parameters<typeof createMpgfCrecFailureBonusClaim>[0] {
  const earlyPaymentSnapshot = paymentSnapshot({
    snapshotKind: "early_failure_bonus_cutoff",
    asOf: earlyFailureBonusCutoff,
    createdAt: earlyFailureBonusCutoff,
  });
  const conflictSnapshot = failureBonusClaimantConflictSnapshot();

  return {
    existingClaims: [],
    creationMode: "qualified_payout_path",
    roundStatus: "payable",
    backedFailureBonusPoolCents: 500,
    failureBonusEligibilityQualified: true,
    projectFailed: true,
    id: "failure-claim-1",
    roundId,
    projectId,
    participantId,
    commonGroundBudgetId,
    conditionalTradeIntentId,
    failureBonusPolicyVersion: "failure-bonus-v1",
    failureReason: "counterparty_volume_shortfall",
    clearingInputBundleHash: clearingBundle().bundleHash,
    paymentCommitmentSnapshotHash: earlyPaymentSnapshot.snapshotHash,
    projectRoundEligibilitySnapshotHash: projectEligibilitySnapshot().snapshotHash,
    claimantConflictSnapshotId: conflictSnapshot.id,
    claimantConflictSnapshotHash: conflictSnapshot.snapshotHash,
    claimantConflictState: conflictSnapshot.conflictState,
    claimantConflictSourceCutoff: conflictSnapshot.sourceCutoffAt,
    earlyFailureBonusCutoff,
    paymentMethodSavedAt: "2026-05-05T00:00:00.000Z",
    paymentMethodConfirmedAt: "2026-05-05T00:01:00.000Z",
    failedQualifiedMatchEligibleCents: 1_000,
    createdAt: closesAt,
    ...overrides,
  };
}

function contributorBenefitInput(
  overrides: Partial<MpgfCrecContributorBenefitEligibilityInput> = {},
): MpgfCrecContributorBenefitEligibilityInput {
  const bundle = clearingBundle();
  const payment = paymentSnapshot();
  const quote = feeQuote();

  return {
    benefitKind: "success_reward",
    roundId,
    projectId,
    participantId,
    commonGroundBudgetId,
    conditionalTradeIntentId,
    rulebookHash,
    clearingInputBundleEligible: true,
    clearingInputBundleHash: bundle.bundleHash,
    paymentSnapshotEligible: true,
    paymentCommitmentSnapshotHash: payment.snapshotHash,
    feeQuoteHash: quote.quoteHash,
    contributionRowHash: h("captured-contribution-row"),
    roundStatus: "payable",
    capturedContributionState: "captured",
    authorizationReconciled: true,
    participantSignedBeforeClose: true,
    lockedPreCloseIntent: true,
    consentValid: true,
    humanVerified: true,
    sybilRiskState: "clear",
    collusionRiskState: "clear",
    linkedAccountExcluded: true,
    samePaymentMethodExcluded: true,
    sameControlExcluded: true,
    claimantConflictState: "no_conflict",
    projectScopeState: "valid_moral_public_good",
    externalityState: "clear",
    reviewState: "approved",
    challengeState: "clear",
    grossCapturedCents: quote.grossCapturedCents,
    feeCents: quote.feeCents,
    netRecipientDisbursedCents: quote.netRecipientDisbursedCents,
    capturedAt: closesAt,
    ...overrides,
  };
}

function successRewardClaimInput(
  overrides: Partial<MpgfCrecSuccessRewardClaimInput> = {},
): MpgfCrecSuccessRewardClaimInput {
  return {
    eligibility: contributorBenefitInput({ benefitKind: "success_reward" }),
    successRewardPolicyVersion: "success-reward-v1",
    rewardCents: 25,
    roundSuccessRewardBudgetCents: 500,
    backedSuccessRewardPoolCents: 500,
    dominanceClaimShown: false,
    maximumPromisedRewardLiabilityCents: 0,
    ...overrides,
  };
}

function coordinationCreditEntry(
  overrides: Partial<MpgfCrecCoordinationCreditLedgerEntry> = {},
): MpgfCrecCoordinationCreditLedgerEntry {
  const benefitContextHash =
    overrides.benefitContextHash ?? buildMpgfCrecContributorBenefitContextHash(
      contributorBenefitInput({ benefitKind: "coordination_credit" }),
    );
  const base: Omit<MpgfCrecCoordinationCreditLedgerEntry, "ledgerEntryHash"> = {
    id: "coordination-credit-1",
    roundId,
    projectId,
    participantId,
    commonGroundBudgetId,
    conditionalTradeIntentId,
    creditKind: "audit_receipt",
    nonTransferable: true,
    affectsCountedDollars: false,
    affectsMatchEligibility: false,
    affectsCounterpartyVolume: false,
    affectsSupporterCounts: false,
    affectsClusterCounts: false,
    affectsIdentityWeight: false,
    affectsVotingPower: false,
    affectsAllocationPower: false,
    benefitContextHash,
    createdAt: closesAt,
    ...overrides,
  };

  return {
    ...base,
    ledgerEntryHash: overrides.ledgerEntryHash ?? buildMpgfCrecCoordinationCreditLedgerEntryHash(base),
  };
}

function impactCertificateClaim(
  overrides: Partial<MpgfCrecImpactCertificateClaim> = {},
): MpgfCrecImpactCertificateClaim {
  const eligibility = contributorBenefitInput({ benefitKind: "impact_certificate" });
  const base: Omit<MpgfCrecImpactCertificateClaim, "certificateHash"> = {
    id: "impact-certificate-1",
    roundId,
    projectId,
    participantId,
    commonGroundBudgetId,
    conditionalTradeIntentId,
    rulebookHash,
    clearingInputBundleHash: eligibility.clearingInputBundleHash,
    paymentCommitmentSnapshotHash: eligibility.paymentCommitmentSnapshotHash,
    feeQuoteHash: eligibility.feeQuoteHash,
    contributionRowHash: eligibility.contributionRowHash,
    netRecipientDisbursedCents: eligibility.netRecipientDisbursedCents,
    capturedAt: eligibility.capturedAt,
    retroactiveAccessAllowed: false,
    doubleCountPreventionHash: h("impact-certificate-double-count"),
    createdAt: closesAt,
    ...overrides,
  };

  return {
    ...base,
    certificateHash: overrides.certificateHash ?? buildMpgfCrecImpactCertificateClaimHash(base),
  };
}

test("CRECM v1.125 payment snapshots bind provider-confirmed payment evidence to the exact cutoff", () => {
  const snapshot = paymentSnapshot();
  const result = validateMpgfCrecPaymentCommitmentSnapshot(snapshot, {
    snapshotKind: "round_close",
    roundId,
    participantId,
    commonGroundBudgetId,
    rulebookHash,
    asOf: closesAt,
  });

  assert.equal(result.eligible, true);
  assert.deepEqual(result.blockers, []);

  const staleSnapshot = { ...snapshot, asOf: "2026-05-13T23:59:00.000Z" };
  const staleResult = validateMpgfCrecPaymentCommitmentSnapshot(staleSnapshot, {
    snapshotKind: "round_close",
    roundId,
    participantId,
    commonGroundBudgetId,
    rulebookHash,
    asOf: closesAt,
  });

  assert.equal(staleResult.eligible, false);
  assert.ok(staleResult.blockers.includes("payment_snapshot_cutoff_mismatch"));
  assert.ok(staleResult.blockers.includes("payment_snapshot_hash_mismatch"));

  const blankPaymentMethod = paymentSnapshot({ paymentMethodRef: " pm_not_trim_stable " });
  const blankResult = validateMpgfCrecPaymentCommitmentSnapshot(blankPaymentMethod, {
    snapshotKind: "round_close",
    roundId,
    participantId,
    commonGroundBudgetId,
    rulebookHash,
    asOf: closesAt,
  });

  assert.equal(blankResult.eligible, false);
  assert.ok(blankResult.blockers.includes("payment_snapshot_payment_method_ref_invalid"));
});

test("CRECM v1.125 moral-bucket snapshots require a frozen reciprocal graph", () => {
  const snapshot = moralBucketSnapshot();
  const result = validateMpgfCrecRoundMoralBucketSnapshot(snapshot, {
    id: snapshot.id,
    roundId,
    rulebookHash,
    parametersFrozenAt,
  });

  assert.equal(result.eligible, true);

  const asymmetric = moralBucketSnapshot({
    reciprocalDistinctFromBucketIdsByBucketId: {
      humanitarian: ["pluralist"],
      pluralist: [],
    },
  });
  const asymmetricResult = validateMpgfCrecRoundMoralBucketSnapshot(asymmetric, {
    id: asymmetric.id,
    roundId,
    rulebookHash,
    parametersFrozenAt,
  });

  assert.equal(asymmetricResult.eligible, false);
  assert.ok(asymmetricResult.blockers.includes("moral_bucket_snapshot_asymmetric_edge"));
});

test("CRECM v1.125 project identity and destination route require frozen bucket membership", () => {
  const snapshot = moralBucketSnapshot();
  const valid = validateMpgfCrecProjectIdentityRouteGate({
    roundId,
    projectId,
    rulebookHash,
    parametersFrozenAt,
    selectedPublicGoodProjectRowCount: 1,
    roundMoralBucketSnapshot: snapshot,
    publicGoodProject: {
      id: projectId,
      roundId,
      bucketId: "humanitarian",
      goodType: "consensus",
      destinationType: "registered_nonprofit",
      destinationRef: "ein:12-3456789",
    },
  });

  assert.equal(valid.eligible, true);
  assert.equal(valid.projectIdentityAndRouteValid, true);
  assert.equal(valid.moralBucketSnapshotEligible, true);
  assert.equal(valid.bucketPresentInFrozenSnapshot, true);
  assert.equal(valid.projectGoodType, "consensus");
  assert.equal(valid.projectDestinationType, "registered_nonprofit");
  assert.equal(valid.bindingOutputAllowed, true);
  assert.equal(valid.matchingAllowed, true);
  assert.equal(valid.authorizationAllowed, true);
  assert.equal(valid.payoutAllowed, true);
  assert.equal(valid.failureBonusQualificationAllowed, true);
  assert.deepEqual(valid.blockers, []);

  const malformedProject = validateMpgfCrecProjectIdentityRouteGate({
    roundId,
    projectId,
    rulebookHash,
    parametersFrozenAt,
    selectedPublicGoodProjectRowCount: 1,
    roundMoralBucketSnapshot: snapshot,
    publicGoodProject: {
      id: projectId,
      roundId,
      bucketId: "long-run-future",
      goodType: "private_benefit",
      destinationType: "external_charity",
      destinationRef: " recipient-1",
    },
  });

  assert.equal(malformedProject.eligible, false);
  assert.equal(malformedProject.projectIdentityAndRouteValid, false);
  assert.equal(malformedProject.bucketPresentInFrozenSnapshot, false);
  assert.equal(malformedProject.projectGoodType, null);
  assert.equal(malformedProject.projectDestinationType, null);
  assert.equal(malformedProject.destinationRef, null);
  assert.equal(malformedProject.bindingOutputAllowed, false);
  assert.equal(malformedProject.failureBonusQualificationAllowed, false);
  assert.ok(malformedProject.blockers.includes("project_identity_route_good_type_invalid"));
  assert.ok(malformedProject.blockers.includes("project_identity_route_destination_type_invalid"));
  assert.ok(malformedProject.blockers.includes("project_identity_route_destination_ref_invalid"));
  assert.ok(malformedProject.blockers.includes("project_identity_route_bucket_absent_from_frozen_snapshot"));

  const wrongRoundProject = validateMpgfCrecProjectIdentityRouteGate({
    roundId,
    projectId,
    rulebookHash,
    parametersFrozenAt,
    selectedPublicGoodProjectRowCount: 1,
    roundMoralBucketSnapshot: snapshot,
    publicGoodProject: {
      id: projectId,
      roundId: "round-other",
      bucketId: "humanitarian",
      get goodType() {
        throw new Error("goodType should not be read before project row binding");
      },
      get destinationType() {
        throw new Error("destinationType should not be read before project row binding");
      },
      get destinationRef() {
        throw new Error("destinationRef should not be read before project row binding");
      },
    },
  });

  assert.equal(wrongRoundProject.eligible, false);
  assert.equal(wrongRoundProject.projectRowEligible, false);
  assert.equal(wrongRoundProject.projectIdentityAndRouteValid, false);
  assert.ok(wrongRoundProject.blockers.includes("project_identity_route_project_row_not_bound"));

  const malformedSnapshot = validateMpgfCrecProjectIdentityRouteGate({
    roundId,
    projectId,
    rulebookHash,
    parametersFrozenAt,
    selectedPublicGoodProjectRowCount: 1,
    roundMoralBucketSnapshot: moralBucketSnapshot({
      reciprocalDistinctFromBucketIdsByBucketId: {
        humanitarian: ["pluralist"],
        pluralist: [],
      },
    }),
    publicGoodProject: {
      id: projectId,
      roundId,
      bucketId: "humanitarian",
      goodType: "hybrid",
      destinationType: "fiscal_host",
      destinationRef: "fiscal-host:clean-air-fund",
    },
  });

  assert.equal(malformedSnapshot.eligible, false);
  assert.equal(malformedSnapshot.moralBucketSnapshotEligible, false);
  assert.equal(malformedSnapshot.bucketPresentInFrozenSnapshot, false);
  assert.ok(malformedSnapshot.blockers.includes("project_identity_route_moral_bucket_snapshot_ineligible"));
  assert.ok(malformedSnapshot.blockers.includes("project_identity_route_moral_bucket_snapshot_asymmetric_edge"));
});

test("CRECM v1.125 clearing bundles bind selected bundle id, cutoff, versions, and component hashes", () => {
  const bundle = clearingBundle();
  const result = validateMpgfCrecRoundClearingInputBundle(bundle, {
    id: bundle.id,
    roundId,
    rulebookHash,
    feePolicyVersion: bundle.feePolicyVersion,
    feePolicyHash: bundle.feePolicyHash,
    deploymentMode: bundle.deploymentMode,
    pilotMaxRoundGrossExposureCents: bundle.pilotMaxRoundGrossExposureCents,
    pilotMaxParticipantGrossExposureCents: bundle.pilotMaxParticipantGrossExposureCents,
    deploymentAuditState: bundle.deploymentAuditState,
    deploymentAuditId: bundle.deploymentAuditId,
    deploymentAuditHash: bundle.deploymentAuditHash,
    paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
    calculationVersion: bundle.calculationVersion,
    sourceCutoffAt: closesAt,
    clearingInputBundleHash: bundle.bundleHash,
    sponsorPoolSourceHash: sourceHash,
    moralBucketSnapshotId: bundle.moralBucketSnapshotId,
    moralBucketSnapshotHash: bundle.moralBucketSnapshotHash,
  });

  assert.equal(result.eligible, true);

  const changedIdSameHash = { ...bundle, id: "clearing-bundle-2" };
  const changedIdResult = validateMpgfCrecRoundClearingInputBundle(changedIdSameHash, {
    id: "clearing-bundle-2",
    roundId,
    rulebookHash,
    feePolicyVersion: bundle.feePolicyVersion,
    feePolicyHash: bundle.feePolicyHash,
    deploymentMode: bundle.deploymentMode,
    pilotMaxRoundGrossExposureCents: bundle.pilotMaxRoundGrossExposureCents,
    pilotMaxParticipantGrossExposureCents: bundle.pilotMaxParticipantGrossExposureCents,
    deploymentAuditState: bundle.deploymentAuditState,
    deploymentAuditId: bundle.deploymentAuditId,
    deploymentAuditHash: bundle.deploymentAuditHash,
    paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
    calculationVersion: bundle.calculationVersion,
    sourceCutoffAt: closesAt,
    sponsorPoolSourceHash: sourceHash,
  });

  assert.equal(changedIdResult.eligible, false);
  assert.ok(changedIdResult.blockers.includes("clearing_input_bundle_hash_mismatch"));

  const malformedComponent = clearingBundle({ commonGroundBudgetInputHash: "not-a-hash" });
  const malformedResult = validateMpgfCrecRoundClearingInputBundle(malformedComponent, {
    roundId,
    rulebookHash,
    feePolicyVersion: bundle.feePolicyVersion,
    feePolicyHash: bundle.feePolicyHash,
    deploymentMode: bundle.deploymentMode,
    pilotMaxRoundGrossExposureCents: bundle.pilotMaxRoundGrossExposureCents,
    pilotMaxParticipantGrossExposureCents: bundle.pilotMaxParticipantGrossExposureCents,
    deploymentAuditState: bundle.deploymentAuditState,
    deploymentAuditId: bundle.deploymentAuditId,
    deploymentAuditHash: bundle.deploymentAuditHash,
    paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
    calculationVersion: bundle.calculationVersion,
    sourceCutoffAt: closesAt,
    sponsorPoolSourceHash: sourceHash,
  });

  assert.equal(malformedResult.eligible, false);
  assert.ok(malformedResult.blockers.includes("clearing_input_bundle_hashes_invalid"));
});

test("CRECM v1.125 deployment audits bind passed prior evidence and pilot caps are mode-compatible", () => {
  const bundle = clearingBundle();
  const expectedAudit = {
    roundId,
    targetDeploymentMode: "full" as const,
    calculationVersion: bundle.calculationVersion,
    rulebookHash,
    feePolicyHash: bundle.feePolicyHash,
    sponsorPoolSourceHash: sourceHash,
    paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
    parametersFrozenAt,
  };
  const audit = deploymentAudit();
  const result = validateMpgfCrecDeploymentAudit(audit, expectedAudit);

  assert.equal(result.eligible, true);

  const shadowToPilot = deploymentAudit({
    id: "deployment-audit-shadow-to-pilot",
    auditKind: "shadow_to_pilot",
    targetDeploymentMode: "capped_pilot",
    priorRoundIds: ["prior-shadow-1"],
    priorAuditBundleHashes: [h("prior-shadow-audit-bundle")],
    priorRoundDeploymentModes: ["shadow"],
    priorPaymentReconciliationPathHashes: [bundle.paymentReconciliationPathHash],
    priorRoundOutcomeStates: ["passed"],
  });
  const shadowToPilotResult = validateMpgfCrecDeploymentAudit(shadowToPilot, {
    ...expectedAudit,
    targetDeploymentMode: "capped_pilot",
  });

  assert.equal(shadowToPilotResult.eligible, true);

  const failedPrior = validateMpgfCrecDeploymentAudit(
    deploymentAudit({ priorRoundOutcomeStates: ["failed"] }),
    expectedAudit,
  );
  assert.equal(failedPrior.eligible, false);
  assert.ok(failedPrior.blockers.includes("deployment_audit_prior_outcomes_not_all_passed"));

  const postFreeze = validateMpgfCrecDeploymentAudit(
    deploymentAudit({ createdAt: opensAt }),
    expectedAudit,
  );
  assert.equal(postFreeze.eligible, false);
  assert.ok(postFreeze.blockers.includes("deployment_audit_created_after_parameter_freeze"));

  const shadowOnlyFull = validateMpgfCrecDeploymentAudit(
    deploymentAudit({
      auditKind: "shadow_or_pilot_to_full",
      priorRoundIds: ["prior-shadow-1"],
      priorAuditBundleHashes: [h("prior-shadow-audit-bundle")],
      priorRoundDeploymentModes: ["shadow"],
      priorPaymentReconciliationPathHashes: [bundle.paymentReconciliationPathHash],
      priorRoundOutcomeStates: ["passed"],
    }),
    expectedAudit,
  );
  assert.equal(shadowOnlyFull.eligible, false);
  assert.ok(shadowOnlyFull.blockers.includes("deployment_audit_full_missing_same_path_capped_pilot_prior"));

  const pilotToFullWithShadowEvidence = validateMpgfCrecDeploymentAudit(
    deploymentAudit({
      auditKind: "pilot_to_full",
      priorRoundIds: ["prior-shadow-1"],
      priorAuditBundleHashes: [h("prior-shadow-audit-bundle")],
      priorRoundDeploymentModes: ["shadow"],
      priorPaymentReconciliationPathHashes: [bundle.paymentReconciliationPathHash],
      priorRoundOutcomeStates: ["passed"],
    }),
    expectedAudit,
  );
  assert.equal(pilotToFullWithShadowEvidence.eligible, false);
  assert.ok(pilotToFullWithShadowEvidence.blockers.includes("deployment_audit_kind_prior_modes_mismatch"));

  const selfReference = validateMpgfCrecDeploymentAudit(
    deploymentAudit({ priorRoundIds: [roundId] }),
    expectedAudit,
  );
  assert.equal(selfReference.eligible, false);
  assert.ok(selfReference.blockers.includes("deployment_audit_prior_round_self_reference"));

  const lengthMismatch = validateMpgfCrecDeploymentAudit(
    deploymentAudit({ priorRoundIds: ["prior-capped-pilot-1", "prior-capped-pilot-2"] }),
    expectedAudit,
  );
  assert.equal(lengthMismatch.eligible, false);
  assert.ok(lengthMismatch.blockers.includes("deployment_audit_prior_evidence_lengths_invalid"));

  const shadowWithCaps = validateMpgfCrecRoundClearingInputBundle(
    clearingBundle({ deploymentMode: "shadow" }),
    {
      roundId,
      rulebookHash,
      feePolicyVersion: bundle.feePolicyVersion,
      feePolicyHash: bundle.feePolicyHash,
      deploymentMode: "shadow",
      pilotMaxRoundGrossExposureCents: null,
      pilotMaxParticipantGrossExposureCents: null,
      deploymentAuditState: "not_required",
      deploymentAuditId: null,
      deploymentAuditHash: null,
      paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
      optimizationPolicyHash: bundle.optimizationPolicyHash,
      calculationVersion: bundle.calculationVersion,
      sourceCutoffAt: closesAt,
    },
  );
  assert.equal(shadowWithCaps.eligible, false);
  assert.ok(shadowWithCaps.blockers.includes("clearing_input_bundle_pilot_caps_invalid"));

  const cappedPilotWithoutCaps = validateMpgfCrecRoundClearingInputBundle(
    clearingBundle({
      pilotMaxRoundGrossExposureCents: null,
      pilotMaxParticipantGrossExposureCents: null,
    }),
    {
      roundId,
      rulebookHash,
      feePolicyVersion: bundle.feePolicyVersion,
      feePolicyHash: bundle.feePolicyHash,
      deploymentMode: "capped_pilot",
      pilotMaxRoundGrossExposureCents: null,
      pilotMaxParticipantGrossExposureCents: null,
      deploymentAuditState: "not_required",
      deploymentAuditId: null,
      deploymentAuditHash: null,
      paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
      optimizationPolicyHash: bundle.optimizationPolicyHash,
      calculationVersion: bundle.calculationVersion,
      sourceCutoffAt: closesAt,
    },
  );
  assert.equal(cappedPilotWithoutCaps.eligible, false);
  assert.ok(cappedPilotWithoutCaps.blockers.includes("clearing_input_bundle_pilot_caps_invalid"));

  const cappedExposure = capMpgfCrecDeploymentGrossExposure({
    deploymentMode: "capped_pilot",
    requestedGrossExposureCents: 50_000,
    pilotMaxRoundGrossExposureCents: 100_000,
    pilotMaxParticipantGrossExposureCents: 10_000,
    remainingRoundDeploymentExposureCents: 75_000,
    remainingParticipantDeploymentExposureCents: 8_000,
  });
  assert.equal(cappedExposure.eligible, true);
  assert.equal(cappedExposure.cappedGrossExposureCents, 8_000);
  assert.equal(cappedExposure.bindingGrossExposureCents, 8_000);
  assert.equal(cappedExposure.shadowPreviewGrossExposureCents, 0);
  assert.equal(cappedExposure.bindingOutputAllowed, true);

  const highRemainingMapsStillRespectFrozenCaps = capMpgfCrecDeploymentGrossExposure({
    deploymentMode: "capped_pilot",
    requestedGrossExposureCents: 50_000,
    pilotMaxRoundGrossExposureCents: 9_000,
    pilotMaxParticipantGrossExposureCents: 7_000,
    remainingRoundDeploymentExposureCents: 500_000,
    remainingParticipantDeploymentExposureCents: 500_000,
  });
  assert.equal(highRemainingMapsStillRespectFrozenCaps.eligible, true);
  assert.equal(highRemainingMapsStillRespectFrozenCaps.cappedGrossExposureCents, 7_000);
  assert.equal(highRemainingMapsStillRespectFrozenCaps.bindingGrossExposureCents, 7_000);

  const malformedRemainingExposure = capMpgfCrecDeploymentGrossExposure({
    deploymentMode: "capped_pilot",
    requestedGrossExposureCents: 50_000,
    pilotMaxRoundGrossExposureCents: 100_000,
    pilotMaxParticipantGrossExposureCents: 10_000,
    remainingRoundDeploymentExposureCents: -1,
    remainingParticipantDeploymentExposureCents: 8_000,
  });
  assert.equal(malformedRemainingExposure.eligible, false);
  assert.equal(malformedRemainingExposure.cappedGrossExposureCents, 0);
  assert.equal(malformedRemainingExposure.bindingGrossExposureCents, 0);
  assert.equal(malformedRemainingExposure.shadowPreviewGrossExposureCents, 0);
  assert.ok(malformedRemainingExposure.blockers.includes("deployment_exposure_remaining_round_invalid"));

  const shadowExposure = capMpgfCrecDeploymentGrossExposure({
    deploymentMode: "shadow",
    requestedGrossExposureCents: 50_000,
    pilotMaxRoundGrossExposureCents: null,
    pilotMaxParticipantGrossExposureCents: null,
    remainingRoundDeploymentExposureCents: null,
    remainingParticipantDeploymentExposureCents: null,
  });
  assert.equal(shadowExposure.eligible, true);
  assert.equal(shadowExposure.cappedGrossExposureCents, 0);
  assert.equal(shadowExposure.bindingGrossExposureCents, 0);
  assert.equal(shadowExposure.shadowPreviewGrossExposureCents, 50_000);
  assert.equal(shadowExposure.bindingOutputAllowed, false);
  assert.equal(shadowExposure.shadowOnly, true);

  const fullWithPilotCaps = capMpgfCrecDeploymentGrossExposure({
    deploymentMode: "full",
    requestedGrossExposureCents: 50_000,
    pilotMaxRoundGrossExposureCents: 100_000,
    pilotMaxParticipantGrossExposureCents: 10_000,
    remainingRoundDeploymentExposureCents: null,
    remainingParticipantDeploymentExposureCents: null,
  });
  assert.equal(fullWithPilotCaps.eligible, false);
  assert.equal(fullWithPilotCaps.cappedGrossExposureCents, 0);
  assert.equal(fullWithPilotCaps.bindingGrossExposureCents, 0);
  assert.equal(fullWithPilotCaps.shadowPreviewGrossExposureCents, 0);
  assert.ok(fullWithPilotCaps.blockers.includes("deployment_exposure_full_pilot_caps_not_null"));
});

test("CRECM v1.125 project eligibility snapshots bind exact round-open booleans", () => {
  const snapshot = projectEligibilitySnapshot();
  const result = validateMpgfCrecProjectRoundEligibilitySnapshot(snapshot, {
    roundId,
    projectId,
    rulebookHash,
    sourceCutoffAt: opensAt,
  });

  assert.equal(result.eligible, true);

  const reviewBlocked = projectEligibilitySnapshot({
    eligibility: {
      ...snapshot.eligibility,
      reviewApproved: false,
    },
  });
  const reviewBlockedResult = validateMpgfCrecProjectRoundEligibilitySnapshot(reviewBlocked, {
    roundId,
    projectId,
    rulebookHash,
    sourceCutoffAt: opensAt,
  });

  assert.equal(reviewBlockedResult.eligible, false);
  assert.ok(reviewBlockedResult.blockers.includes("project_eligibility_snapshot_not_fully_eligible"));

  const staleSnapshot = { ...snapshot, sourceCutoffAt: "2026-05-01T00:01:00.000Z" };
  const staleResult = validateMpgfCrecProjectRoundEligibilitySnapshot(staleSnapshot, {
    roundId,
    projectId,
    rulebookHash,
    sourceCutoffAt: opensAt,
  });

  assert.equal(staleResult.eligible, false);
  assert.ok(staleResult.blockers.includes("project_eligibility_snapshot_wrong_cutoff"));
  assert.ok(staleResult.blockers.includes("project_eligibility_snapshot_hash_mismatch"));
});

test("CRECM v1.125 project hard gates separate binding baseline approval from shadow learning", () => {
  const bindingGate = evaluateMpgfCrecProjectHardGate(projectHardGateInput());

  assert.equal(bindingGate.eligible, true);
  assert.equal(bindingGate.bindingOutputAllowed, true);
  assert.equal(bindingGate.shadowOnlyProvisionalLearningAllowed, false);
  assert.equal(bindingGate.hardGateHash, buildMpgfCrecProjectHardGateHash(projectHardGateInput()));

  const provisionalBaseline = evaluateMpgfCrecProjectHardGate(
    projectHardGateInput({ baselineIntegrityState: "provisional" }),
  );

  assert.equal(provisionalBaseline.eligible, false);
  assert.equal(provisionalBaseline.bindingOutputAllowed, false);
  assert.ok(
    provisionalBaseline.blockers.includes("project_hard_gate_baseline_integrity_not_approved"),
  );

  const actionEvidenceReview = evaluateMpgfCrecProjectHardGate(
    projectHardGateInput({ actionEvidenceState: "review" }),
  );

  assert.equal(actionEvidenceReview.eligible, false);
  assert.ok(actionEvidenceReview.blockers.includes("project_hard_gate_action_evidence_not_approved"));

  const openChallenge = evaluateMpgfCrecProjectHardGate(
    projectHardGateInput({ challengeState: "open" }),
  );

  assert.equal(openChallenge.eligible, false);
  assert.ok(openChallenge.blockers.includes("project_hard_gate_challenge_not_clear_or_non_blocking"));

  const shadowLearning = evaluateMpgfCrecProjectHardGate(
    projectHardGateInput({
      deploymentMode: "shadow",
      baselineIntegrityState: "provisional",
      baselineConfidenceState: "provisional",
      actionEvidenceState: "provisional",
    }),
  );

  assert.equal(shadowLearning.eligible, true);
  assert.equal(shadowLearning.bindingOutputAllowed, false);
  assert.equal(shadowLearning.shadowOnlyProvisionalLearningAllowed, true);
  assert.equal(
    shadowLearning.hardGateHash,
    buildMpgfCrecProjectHardGateHash(
      projectHardGateInput({
        deploymentMode: "shadow",
        baselineIntegrityState: "provisional",
        baselineConfidenceState: "provisional",
        actionEvidenceState: "provisional",
      }),
    ),
  );

  const blockedShadow = evaluateMpgfCrecProjectHardGate(
    projectHardGateInput({
      deploymentMode: "shadow",
      externalityState: "blocked",
      baselineIntegrityState: "provisional",
      baselineConfidenceState: "provisional",
      actionEvidenceState: "provisional",
    }),
  );

  assert.equal(blockedShadow.eligible, false);
  assert.equal(blockedShadow.shadowOnlyProvisionalLearningAllowed, false);
  assert.ok(blockedShadow.blockers.includes("project_hard_gate_externality_not_clear"));
});

test("CRECM v1.125 fail-closed helpers reject malformed payout and counterparty inputs", () => {
  assert.equal(minMpgfCrecNonNegativeSafeInteger(5, 3, 7), 3);
  assert.equal(minMpgfCrecNonNegativeSafeInteger(5, -1, 7), 0);
  assert.equal(minMpgfCrecNonNegativeSafeInteger(5, 1.5, 7), 0);
  assert.equal(minMpgfCrecNonNegativeSafeInteger(5, Number.MAX_SAFE_INTEGER + 1), 0);
  assert.equal(minMpgfCrecNonNegativeSafeInteger(5, "3"), 0);
  assert.equal(minMpgfCrecNonNegativeSafeInteger(), 0);

  assert.deepEqual(
    intersectMpgfCrecTrimStableStringArrays(
      ["bucket-c", "bucket-a", "bucket-b"],
      ["bucket-b", "bucket-a"],
      ["bucket-a", "bucket-b", "bucket-d"],
    ),
    ["bucket-a", "bucket-b"],
  );
  assert.deepEqual(
    intersectMpgfCrecTrimStableStringArrays(["bucket-a", "bucket-a"], ["bucket-a"]),
    [],
  );
  assert.deepEqual(
    intersectMpgfCrecTrimStableStringArrays([" bucket-a"], ["bucket-a"]),
    [],
  );
  assert.deepEqual(intersectMpgfCrecTrimStableStringArrays(["bucket-a"], "bucket-a"), []);

  assert.equal(sumMpgfCrecNonNegativeBigInt([1, BigInt(2), 3]), BigInt(6));
  assert.equal(sumMpgfCrecNonNegativeBigInt([1, -1]), BigInt(0));
  assert.equal(sumMpgfCrecNonNegativeBigInt([1, 1.5]), BigInt(0));
  assert.equal(sumMpgfCrecNonNegativeBigInt([1, "2"]), BigInt(0));
  assert.equal(sumMpgfCrecNonNegativeBigInt("not-array"), BigInt(0));
});

test("CRECM v1.125 moral public goods allocation inputs fail closed before payment lookup", () => {
  const missing = resolveMpgfCrecCommonGroundBudgetAllocationInputs({
    roundId,
    participantId,
    rulebookHash,
    selectedCommonGroundBudgetByIdRowCount: 0,
    selectedCommonGroundBudgetByParticipantRowCount: 0,
    commonGroundBudget: null,
  });

  assert.equal(missing.commonGroundBudgetRowEligible, false);
  assert.equal(missing.budgetEligible, false);
  assert.equal(missing.allocatableCents, 0);
  assert.equal(missing.safeCommonGroundBudgetTotalCents, 0);
  assert.equal(missing.safeCommonGroundBudgetPerProjectCapCents, 0);
  assert.equal(missing.paymentSnapshotLookupAllowed, false);
  assert.equal(missing.paymentSnapshotLookupKey, null);
  assert.equal(missing.exposesPaymentAuthority, false);
  assert.ok(missing.rowFailureCodes.includes("common_ground_budget_row_missing"));
  assert.ok(missing.rowFailureCodes.includes("common_ground_budget_row_count_not_unique"));

  const wrongRound = resolveMpgfCrecCommonGroundBudgetAllocationInputs({
    roundId,
    participantId,
    rulebookHash,
    selectedCommonGroundBudgetByIdRowCount: 1,
    selectedCommonGroundBudgetByParticipantRowCount: 1,
    commonGroundBudget: {
      id: commonGroundBudgetId,
      roundId: "round-other",
      participantId,
      get totalBudgetCents() {
        throw new Error("totalBudgetCents should not be read before row binding");
      },
      get perProjectCapCents() {
        throw new Error("perProjectCapCents should not be read before row binding");
      },
      get paymentMethodRef() {
        throw new Error("payment fields should not be read by budget gating");
      },
    },
  });

  assert.equal(wrongRound.commonGroundBudgetRowEligible, false);
  assert.equal(wrongRound.allocatableCents, 0);
  assert.equal(wrongRound.paymentSnapshotLookupAllowed, false);
  assert.equal(wrongRound.exposesPaymentAuthority, false);
  assert.ok(wrongRound.rowFailureCodes.includes("common_ground_budget_row_not_bound"));

  const invalidMetadata = resolveMpgfCrecCommonGroundBudgetAllocationInputs({
    roundId,
    participantId,
    rulebookHash,
    selectedCommonGroundBudgetByIdRowCount: 1,
    selectedCommonGroundBudgetByParticipantRowCount: 1,
    commonGroundBudget: {
      id: commonGroundBudgetId,
      roundId,
      participantId,
      totalBudgetCents: -1,
      perProjectCapCents: 1.5,
      budgetPeriod: "weekly",
      fallbackRule: "donate_elsewhere",
      rulebookHashAtConsent: rulebookHash,
      state: "active",
      canceledAt: null,
    },
  });

  assert.equal(invalidMetadata.commonGroundBudgetRowEligible, true);
  assert.equal(invalidMetadata.commonGroundBudgetCapsValid, false);
  assert.equal(invalidMetadata.budgetPeriodEligible, false);
  assert.equal(invalidMetadata.budgetFallbackRuleEligible, false);
  assert.equal(invalidMetadata.budgetEligible, false);
  assert.equal(invalidMetadata.allocatableCents, 0);
  assert.ok(invalidMetadata.rowFailureCodes.includes("common_ground_budget_total_cents_invalid_zeroed"));
  assert.ok(invalidMetadata.rowFailureCodes.includes("common_ground_budget_per_project_cap_cents_invalid_zeroed"));
  assert.ok(invalidMetadata.rowFailureCodes.includes("common_ground_budget_period_invalid"));
  assert.ok(invalidMetadata.rowFailureCodes.includes("common_ground_budget_fallback_rule_invalid"));

  const invalidRecurring = resolveMpgfCrecCommonGroundBudgetAllocationInputs({
    roundId,
    participantId,
    rulebookHash,
    selectedCommonGroundBudgetByIdRowCount: 1,
    selectedCommonGroundBudgetByParticipantRowCount: 1,
    commonGroundBudget: {
      id: commonGroundBudgetId,
      roundId,
      participantId,
      totalBudgetCents: 10_000,
      perProjectCapCents: 2_500,
      budgetPeriod: "monthly",
      recurringConsentVersion: "",
      nextCaptureAt: "2026-05-01",
      nextCaptureRule: " monthly",
      fallbackRule: "refund",
      rulebookHashAtConsent: rulebookHash,
      state: "active",
      canceledAt: null,
    },
  });

  assert.equal(invalidRecurring.budgetPeriodEligible, true);
  assert.equal(invalidRecurring.recurringBudgetConsentEligible, false);
  assert.equal(invalidRecurring.budgetEligible, false);
  assert.equal(invalidRecurring.allocatableCents, 0);
  assert.ok(invalidRecurring.rowFailureCodes.includes("common_ground_budget_recurring_consent_invalid"));
});

test("CRECM v1.125 valid moral public goods exposes only sanitized cap and lookup inputs", () => {
  const resolved = resolveMpgfCrecCommonGroundBudgetAllocationInputs({
    roundId,
    participantId,
    rulebookHash,
    selectedCommonGroundBudgetByIdRowCount: 1,
    selectedCommonGroundBudgetByParticipantRowCount: 1,
    commonGroundBudget: {
      id: commonGroundBudgetId,
      roundId,
      participantId,
      totalBudgetCents: 10_000,
      perProjectCapCents: 2_500,
      budgetPeriod: "one_time",
      recurringConsentVersion: null,
      nextCaptureAt: null,
      nextCaptureRule: null,
      fallbackRule: "refund",
      rulebookHashAtConsent: rulebookHash,
      state: "active",
      canceledAt: null,
    },
  });

  assert.equal(resolved.commonGroundBudgetRowEligible, true);
  assert.equal(resolved.commonGroundBudgetId, commonGroundBudgetId);
  assert.equal(resolved.commonGroundBudgetParticipantId, participantId);
  assert.equal(resolved.commonGroundBudgetCapsValid, true);
  assert.equal(resolved.budgetPeriod, "one_time");
  assert.equal(resolved.budgetFallbackRule, "refund");
  assert.equal(resolved.recurringBudgetConsentEligible, true);
  assert.equal(resolved.rulebookConsentEligible, true);
  assert.equal(resolved.stateAllowsAllocation, true);
  assert.equal(resolved.budgetEligible, true);
  assert.equal(resolved.allocatableCents, 2_500);
  assert.equal(resolved.paymentSnapshotLookupAllowed, true);
  assert.deepEqual(resolved.paymentSnapshotLookupKey, {
    roundId,
    commonGroundBudgetId,
    snapshotKind: "round_close",
  });
  assert.equal(resolved.exposesPaymentAuthority, false);
  assert.deepEqual(resolved.rowFailureCodes, []);
});

test("CRECM v1.125 support-stance allocation inputs default missing and malformed rows to abstain", () => {
  const missing = resolveMpgfCrecSupportStanceAllocationInputs({
    roundId,
    commonGroundBudgetId,
    participantId,
    projectId,
    commonGroundBudgetTotalCents: 10_000,
    supportStance: null,
  });

  assert.equal(missing.supportStanceInputEligible, false);
  assert.equal(missing.effectiveStance, "abstain");
  assert.equal(missing.defaultedToAbstain, true);
  assert.equal(missing.allocatableCents, 0);
  assert.equal(missing.stanceCapCents, 0);
  assert.equal(missing.supportStanceMaxAllocCents, 0);
  assert.equal(missing.supportStanceMaxAllocBps, null);
  assert.deepEqual(missing.acceptableCounterBucketIds, []);
  assert.equal(missing.exposesCounterpartyBuckets, false);
  assert.equal(missing.exposesPaymentAuthority, false);
  assert.ok(missing.rowFailureCodes.includes("support_stance_row_missing"));

  const wrongBudget = resolveMpgfCrecSupportStanceAllocationInputs({
    roundId,
    commonGroundBudgetId,
    participantId,
    projectId,
    commonGroundBudgetTotalCents: 10_000,
    supportStance: {
      id: "stance-cross-budget",
      roundId,
      commonGroundBudgetId: "budget-other",
      participantId,
      projectId,
      stance: "weak",
      maxAllocCents: 5_000,
      maxAllocBps: 7_500,
      rankOrder: 1,
      unrestrictedRoutingOptIn: true,
      acceptableCounterBucketIds: ["bucket-animal-welfare"],
    },
  });

  assert.equal(wrongBudget.supportStanceInputEligible, false);
  assert.equal(wrongBudget.effectiveStance, "abstain");
  assert.equal(wrongBudget.allocatableCents, 0);
  assert.deepEqual(wrongBudget.acceptableCounterBucketIds, []);
  assert.equal(wrongBudget.rankOrder, null);
  assert.equal(wrongBudget.unrestrictedRoutingOptIn, false);
  assert.ok(wrongBudget.rowFailureCodes.includes("support_stance_row_not_bound"));

  const invalidStanceAndBuckets = resolveMpgfCrecSupportStanceAllocationInputs({
    roundId,
    commonGroundBudgetId,
    participantId,
    projectId,
    commonGroundBudgetTotalCents: 10_000,
    supportStance: {
      id: "stance-invalid",
      roundId,
      commonGroundBudgetId,
      participantId,
      projectId,
      stance: "maybe",
      maxAllocCents: 5_000,
      maxAllocBps: null,
      rankOrder: 2,
      unrestrictedRoutingOptIn: false,
      acceptableCounterBucketIds: ["bucket-animal-welfare", "bucket-animal-welfare"],
    },
  });

  assert.equal(invalidStanceAndBuckets.supportStanceInputEligible, true);
  assert.equal(invalidStanceAndBuckets.effectiveStance, "abstain");
  assert.equal(invalidStanceAndBuckets.defaultedToAbstain, true);
  assert.equal(invalidStanceAndBuckets.allocatableCents, 0);
  assert.deepEqual(invalidStanceAndBuckets.acceptableCounterBucketIds, []);
  assert.ok(
    invalidStanceAndBuckets.rowFailureCodes.includes("support_stance_invalid_stance_defaulted_to_abstain"),
  );
  assert.ok(
    invalidStanceAndBuckets.rowFailureCodes.includes("support_stance_counterparty_buckets_malformed_empty"),
  );

  const invalidBps = resolveMpgfCrecSupportStanceAllocationInputs({
    roundId,
    commonGroundBudgetId,
    participantId,
    projectId,
    commonGroundBudgetTotalCents: 10_000,
    supportStance: {
      id: "stance-invalid-bps",
      roundId,
      commonGroundBudgetId,
      participantId,
      projectId,
      stance: "strong",
      maxAllocCents: 5_000,
      maxAllocBps: 10_001,
      rankOrder: 1,
      unrestrictedRoutingOptIn: false,
      acceptableCounterBucketIds: ["bucket-animal-welfare"],
    },
  });

  assert.equal(invalidBps.supportStanceInputEligible, true);
  assert.equal(invalidBps.effectiveStance, "strong");
  assert.equal(invalidBps.supportStanceCapsValid, false);
  assert.equal(invalidBps.allocatableCents, 0);
  assert.equal(invalidBps.stanceCapCents, 0);
  assert.ok(invalidBps.rowFailureCodes.includes("support_stance_max_alloc_bps_invalid_zeroed"));
});

test("CRECM v1.125 valid weak support stance exposes only sanitized allocation inputs", () => {
  const resolved = resolveMpgfCrecSupportStanceAllocationInputs({
    roundId,
    commonGroundBudgetId,
    participantId,
    projectId,
    commonGroundBudgetTotalCents: 10_000,
    supportStance: {
      id: "stance-valid-weak",
      roundId,
      commonGroundBudgetId,
      participantId,
      projectId,
      stance: "weak",
      maxAllocCents: 8_000,
      maxAllocBps: 2_500,
      rankOrder: 3,
      unrestrictedRoutingOptIn: true,
      acceptableCounterBucketIds: ["bucket-global-health", "bucket-animal-welfare"],
      minCounterpartyVolumeCents: 1,
    },
  });

  assert.equal(resolved.supportStanceInputEligible, true);
  assert.equal(resolved.effectiveStance, "weak");
  assert.equal(resolved.defaultedToAbstain, false);
  assert.equal(resolved.supportStanceCapsValid, true);
  assert.equal(resolved.supportStanceMaxAllocCents, 8_000);
  assert.equal(resolved.supportStanceMaxAllocBps, 2_500);
  assert.equal(resolved.stanceCapCents, 2_500);
  assert.equal(resolved.allocatableCents, 2_500);
  assert.deepEqual(resolved.acceptableCounterBucketIds, [
    "bucket-animal-welfare",
    "bucket-global-health",
  ]);
  assert.equal(resolved.exposesCounterpartyBuckets, true);
  assert.equal(resolved.exposesPaymentAuthority, false);
  assert.equal(resolved.rankOrder, 3);
  assert.equal(resolved.unrestrictedRoutingOptIn, true);
  assert.deepEqual(resolved.rowFailureCodes, []);
});

test("CRECM v1.125 plain-language guided stance labels map exactly to canonical CRECM stance records", () => {
  assert.deepEqual(MPGF_PUBLIC_GOODS_CRECM_V1125_PLAIN_STANCE_LABELS, [
    "Fund this",
    "Fund if different-view support joins",
    "Needs review",
    "Skip",
  ]);
  assert.deepEqual(MPGF_PUBLIC_GOODS_CRECM_V1125_PLAIN_STANCE_TO_CANONICAL_STANCE, {
    "Fund this": "strong",
    "Fund if different-view support joins": "weak",
    "Needs review": "dissent",
    Skip: "abstain",
  });
  assert.deepEqual(MPGF_PUBLIC_GOODS_CRECM_V1125_CANONICAL_STANCE_TO_PLAIN_LABEL, {
    strong: "Fund this",
    weak: "Fund if different-view support joins",
    dissent: "Needs review",
    abstain: "Skip",
  });

  const fundThis = resolveMpgfCrecPlainStanceLabel("Fund this");
  assert.equal(fundThis.labelEligible, true);
  assert.equal(fundThis.canonicalStance, "strong");
  assert.equal(fundThis.allocatableAfterExplicitSave, true);
  assert.equal(fundThis.counterpartyConditionRequired, false);
  assert.equal(fundThis.finalReviewCanonicalDisclosureRequired, true);
  assert.equal(fundThis.explicitSaveRequiredBeforeAllocation, true);
  assert.match(fundThis.canonicalEffectDescription ?? "", /ProjectSupportStance\.stance = strong/);

  const weak = resolveMpgfCrecPlainStanceLabel("Fund if different-view support joins");
  assert.equal(weak.labelEligible, true);
  assert.equal(weak.canonicalStance, "weak");
  assert.equal(weak.allocatableAfterExplicitSave, true);
  assert.equal(weak.counterpartyConditionRequired, true);
  assert.equal(weak.zeroAllocationRequired, false);

  const dissent = resolveMpgfCrecPlainStanceLabel("Needs review");
  assert.equal(dissent.labelEligible, true);
  assert.equal(dissent.canonicalStance, "dissent");
  assert.equal(dissent.allocatableAfterExplicitSave, false);
  assert.equal(dissent.reviewPressureOnly, true);
  assert.equal(dissent.zeroAllocationRequired, true);

  const skip = resolveMpgfCrecPlainStanceLabel("Skip");
  assert.equal(skip.labelEligible, true);
  assert.equal(skip.canonicalStance, "abstain");
  assert.equal(skip.defaultSkip, true);
  assert.equal(skip.allocatableAfterExplicitSave, false);
  assert.equal(skip.zeroAllocationRequired, true);
});

test("CRECM v1.125 plain-language guided stance labels reject aliases and whitespace", () => {
  const lowercase = resolveMpgfCrecPlainStanceLabel("fund this");
  assert.equal(lowercase.labelEligible, false);
  assert.equal(lowercase.canonicalStance, null);
  assert.equal(lowercase.allocatableAfterExplicitSave, false);
  assert.ok(lowercase.rowFailureCodes.includes("plain_stance_label_not_recognized"));

  const padded = resolveMpgfCrecPlainStanceLabel("Fund this ");
  assert.equal(padded.labelEligible, false);
  assert.equal(padded.canonicalStance, null);
  assert.equal(padded.zeroAllocationRequired, true);
  assert.ok(padded.rowFailureCodes.includes("plain_stance_label_not_trim_stable"));
  assert.ok(padded.rowFailureCodes.includes("plain_stance_label_not_recognized"));

  const nonString = resolveMpgfCrecPlainStanceLabel({ label: "Fund this" });
  assert.equal(nonString.labelEligible, false);
  assert.equal(nonString.canonicalStance, null);
  assert.equal(nonString.explicitSaveRequiredBeforeAllocation, true);
  assert.ok(nonString.rowFailureCodes.includes("plain_stance_label_not_string"));
});

test("CRECM v1.125 conditional-intent allocation inputs fail closed on wrong rows and invalid consent", () => {
  const missing = resolveMpgfCrecConditionalIntentAllocationInputs({
    roundId,
    commonGroundBudgetId,
    participantId,
    projectId,
    rulebookHash,
    budgetFallbackRule: "refund",
    selectedConditionalTradeIntentRowCount: 0,
    conditionalTradeIntent: null,
  });

  assert.equal(missing.conditionalIntentRowEligible, false);
  assert.equal(missing.conditionalIntentEligible, false);
  assert.equal(missing.intentCapCents, 0);
  assert.deepEqual(missing.acceptableCounterBucketIds, []);
  assert.equal(missing.exposesFallbackAuthority, false);
  assert.equal(missing.exposesAuthorizationAuthority, false);
  assert.equal(missing.exposesCounterpartyBuckets, false);
  assert.equal(missing.failureBonusEligibilityInputsAllowed, false);
  assert.ok(missing.rowFailureCodes.includes("conditional_intent_row_missing"));
  assert.ok(missing.rowFailureCodes.includes("conditional_intent_row_count_not_unique"));

  const wrongBudget = resolveMpgfCrecConditionalIntentAllocationInputs({
    roundId,
    commonGroundBudgetId,
    participantId,
    projectId,
    rulebookHash,
    budgetFallbackRule: "refund",
    selectedConditionalTradeIntentRowCount: 1,
    conditionalTradeIntent: {
      id: conditionalTradeIntentId,
      roundId,
      commonGroundBudgetId: "budget-other",
      participantId,
      projectId,
      get amountCents() {
        throw new Error("amountCents should not be read before intent binding");
      },
      get acceptableCounterBucketIds() {
        throw new Error("counterparty buckets should not be read before intent binding");
      },
    },
  });

  assert.equal(wrongBudget.conditionalIntentRowEligible, false);
  assert.equal(wrongBudget.conditionalIntentEligible, false);
  assert.equal(wrongBudget.intentCapCents, 0);
  assert.deepEqual(wrongBudget.acceptableCounterBucketIds, []);
  assert.equal(wrongBudget.exposesFallbackAuthority, false);
  assert.ok(wrongBudget.rowFailureCodes.includes("conditional_intent_row_not_bound"));

  const capturedIntent = resolveMpgfCrecConditionalIntentAllocationInputs({
    roundId,
    commonGroundBudgetId,
    participantId,
    projectId,
    rulebookHash,
    budgetFallbackRule: "refund",
    selectedConditionalTradeIntentRowCount: 1,
    conditionalTradeIntent: {
      id: conditionalTradeIntentId,
      roundId,
      commonGroundBudgetId,
      participantId,
      projectId,
      state: "active",
      authorizationState: "captured",
      fallbackRule: "reroute",
      rulebookHashAtConsent: rulebookHash,
      amountCents: 5_000,
      maxExposureCents: 2_000,
      minCounterpartyVolumeCents: 1_000,
      acceptableCounterBucketIds: ["bucket-global-health"],
    },
  });

  assert.equal(capturedIntent.conditionalIntentRowEligible, true);
  assert.equal(capturedIntent.authorizationState, "captured");
  assert.equal(capturedIntent.authorizationStateEligible, false);
  assert.equal(capturedIntent.budgetAndIntentFallbackRuleConsistent, false);
  assert.equal(capturedIntent.conditionalIntentEligible, false);
  assert.equal(capturedIntent.intentCapCents, 0);
  assert.equal(capturedIntent.exposesAuthorizationAuthority, false);
  assert.equal(capturedIntent.exposesFallbackAuthority, false);
  assert.equal(capturedIntent.failureBonusEligibilityInputsAllowed, false);
  assert.ok(
    capturedIntent.rowFailureCodes.includes("conditional_intent_authorization_state_not_precapture"),
  );
  assert.ok(
    capturedIntent.rowFailureCodes.includes("conditional_intent_budget_fallback_rule_mismatch"),
  );

  const malformedInputs = resolveMpgfCrecConditionalIntentAllocationInputs({
    roundId,
    commonGroundBudgetId,
    participantId,
    projectId,
    rulebookHash,
    budgetFallbackRule: "refund",
    selectedConditionalTradeIntentRowCount: 1,
    conditionalTradeIntent: {
      id: conditionalTradeIntentId,
      roundId,
      commonGroundBudgetId,
      participantId,
      projectId,
      state: "active",
      authorizationState: "authorized",
      fallbackRule: "refund",
      rulebookHashAtConsent: rulebookHash,
      amountCents: 0,
      maxExposureCents: Number.NaN,
      minCounterpartyVolumeCents: "100",
      acceptableCounterBucketIds: ["bucket-global-health", "bucket-global-health"],
    },
  });

  assert.equal(malformedInputs.conditionalIntentEligible, false);
  assert.equal(malformedInputs.conditionalIntentAmountCents, 0);
  assert.equal(malformedInputs.conditionalIntentMaxExposureCents, 0);
  assert.equal(malformedInputs.conditionalIntentMinCounterpartyVolumeCents, 0);
  assert.deepEqual(malformedInputs.acceptableCounterBucketIds, []);
  assert.ok(malformedInputs.rowFailureCodes.includes("conditional_intent_amount_cents_invalid_zeroed"));
  assert.ok(malformedInputs.rowFailureCodes.includes("conditional_intent_max_exposure_cents_invalid_zeroed"));
  assert.ok(malformedInputs.rowFailureCodes.includes("conditional_intent_min_counterparty_volume_invalid_zeroed"));
  assert.ok(malformedInputs.rowFailureCodes.includes("conditional_intent_counterparty_buckets_malformed_empty"));
});

test("CRECM v1.125 valid conditional intent exposes sanitized caps and counterparty inputs", () => {
  const resolved = resolveMpgfCrecConditionalIntentAllocationInputs({
    roundId,
    commonGroundBudgetId,
    participantId,
    projectId,
    rulebookHash,
    budgetFallbackRule: "refund",
    selectedConditionalTradeIntentRowCount: 1,
    conditionalTradeIntent: {
      id: conditionalTradeIntentId,
      roundId,
      commonGroundBudgetId,
      participantId,
      projectId,
      state: "active",
      authorizationState: "authorized",
      fallbackRule: "refund",
      rulebookHashAtConsent: rulebookHash,
      amountCents: 5_000,
      maxExposureCents: 2_000,
      minCounterpartyVolumeCents: 1_000,
      acceptableCounterBucketIds: ["bucket-global-health", "bucket-animal-welfare"],
    },
  });

  assert.equal(resolved.conditionalIntentRowEligible, true);
  assert.equal(resolved.conditionalTradeIntentId, conditionalTradeIntentId);
  assert.equal(resolved.conditionalIntentState, "active");
  assert.equal(resolved.authorizationState, "authorized");
  assert.equal(resolved.authorizationStateEligible, true);
  assert.equal(resolved.fallbackRule, "refund");
  assert.equal(resolved.fallbackRuleEligible, true);
  assert.equal(resolved.budgetAndIntentFallbackRuleConsistent, true);
  assert.equal(resolved.rulebookConsentEligible, true);
  assert.equal(resolved.conditionalIntentAmountCents, 5_000);
  assert.equal(resolved.conditionalIntentMaxExposureCents, 2_000);
  assert.equal(resolved.conditionalIntentMinCounterpartyVolumeCents, 1_000);
  assert.equal(resolved.intentCapCents, 2_000);
  assert.deepEqual(resolved.acceptableCounterBucketIds, [
    "bucket-animal-welfare",
    "bucket-global-health",
  ]);
  assert.equal(resolved.conditionalIntentEligible, true);
  assert.equal(resolved.crossViewIntentEligible, true);
  assert.equal(resolved.exposesFallbackAuthority, true);
  assert.equal(resolved.exposesAuthorizationAuthority, true);
  assert.equal(resolved.exposesCounterpartyBuckets, true);
  assert.equal(resolved.failureBonusEligibilityInputsAllowed, true);
  assert.deepEqual(resolved.rowFailureCodes, []);
});

test("CRECM v1.125 counterparty-volume satisfaction counts only frozen reciprocal net public-good credit", () => {
  const satisfied = evaluateMpgfCrecCounterpartyVolumeSatisfaction({
    roundId,
    projectId,
    participantId,
    projectBucketId: "bucket-global-health",
    conditionalIntentMinCounterpartyVolumeCents: 1_300,
    acceptableCounterBucketIds: ["bucket-animal-welfare", "bucket-future"],
    frozenReciprocalCounterBucketIds: [
      "bucket-animal-welfare",
      "bucket-future",
      "bucket-global-health",
    ],
    rows: [
      counterpartyVolumeRow({
        counterpartyParticipantId: "participant-bo",
        counterpartyBucketId: "bucket-animal-welfare",
        netRecipientDisbursedCents: 1_000,
        matchEligibleCents: 800,
      }),
      counterpartyVolumeRow({
        counterpartyParticipantId: "participant-cy",
        counterpartyBucketId: "bucket-future",
        netRecipientDisbursedCents: 600,
        matchEligibleCents: 1_000,
        counterpartyLinkedAccountClusterId: "linked-cy",
        counterpartySamePaymentMethodClusterId: "payment-cy",
        counterpartySameControlEntityId: "control-cy",
      }),
    ],
  });

  assert.equal(satisfied.eligible, true);
  assert.equal(satisfied.conditionalIntentMinCounterpartyVolumeCents, 1_300);
  assert.deepEqual(satisfied.validatedCounterBucketIds, ["bucket-animal-welfare", "bucket-future"]);
  assert.equal(satisfied.countedCounterpartyVolumeCents, 1_400);
  assert.equal(satisfied.counterpartyVolumeSatisfied, true);
  assert.deepEqual(satisfied.countedCounterpartyParticipantIds, ["participant-bo", "participant-cy"]);
  assert.deepEqual(satisfied.excludedRowCodes, []);
});

test("CRECM v1.125 counterparty-volume satisfaction excludes self, cluster, source, bucket, and malformed rows", () => {
  const blocked = evaluateMpgfCrecCounterpartyVolumeSatisfaction({
    roundId,
    projectId,
    participantId,
    projectBucketId: "bucket-global-health",
    conditionalIntentMinCounterpartyVolumeCents: 900,
    acceptableCounterBucketIds: ["bucket-animal-welfare"],
    frozenReciprocalCounterBucketIds: ["bucket-animal-welfare"],
    rows: [
      counterpartyVolumeRow(),
      counterpartyVolumeRow({ counterpartyParticipantId: participantId }),
      counterpartyVolumeRow({ counterpartyLinkedAccountClusterId: "linked-alix" }),
      counterpartyVolumeRow({ counterpartySamePaymentMethodClusterId: "payment-alix" }),
      counterpartyVolumeRow({ counterpartySameControlEntityId: "control-alix" }),
      counterpartyVolumeRow({ counterpartyBucketId: "bucket-global-health" }),
      counterpartyVolumeRow({ counterpartyBucketId: "bucket-nonreciprocal" }),
      counterpartyVolumeRow({ counterpartyVolumeSource: "sponsor_funds" }),
      counterpartyVolumeRow({ counterpartyVolumeSource: "platform_funds" }),
      counterpartyVolumeRow({ counterpartyVolumeSource: "fee" }),
      counterpartyVolumeRow({ counterpartyVolumeSource: "success_reward" }),
      counterpartyVolumeRow({ counterpartyVolumeSource: "coordination_credit" }),
      counterpartyVolumeRow({ counterpartyVolumeSource: "impact_certificate" }),
      counterpartyVolumeRow({ counterpartyHumanVerified: false }),
      counterpartyVolumeRow({ counterpartySybilRiskState: "review" }),
      counterpartyVolumeRow({ counterpartyCollusionRiskState: "blocked" }),
      counterpartyVolumeRow({ participantSamePaymentMethodClusterId: " payment-alix" }),
    ],
  });

  assert.equal(blocked.eligible, true);
  assert.equal(blocked.countedCounterpartyVolumeCents, 800);
  assert.equal(blocked.counterpartyVolumeSatisfied, false);
  assert.deepEqual(blocked.countedCounterpartyParticipantIds, ["participant-bo"]);
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_1_self_match"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_2_linked_account_cluster"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_3_same_payment_method_cluster"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_4_same_control_entity"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_5_same_bucket"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_6_bucket_not_frozen_reciprocal"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_7_non_public_good_credit_source"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_8_non_public_good_credit_source"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_9_non_public_good_credit_source"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_10_non_public_good_credit_source"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_11_non_public_good_credit_source"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_12_non_public_good_credit_source"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_13_counterparty_identity_not_verified"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_14_counterparty_sybil_not_clear"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_15_counterparty_collusion_not_clear"));
  assert.ok(blocked.excludedRowCodes.includes("counterparty_volume_row_16_malformed"));

  const malformedInputs = evaluateMpgfCrecCounterpartyVolumeSatisfaction({
    roundId,
    projectId,
    participantId,
    projectBucketId: "bucket-global-health",
    conditionalIntentMinCounterpartyVolumeCents: "900",
    acceptableCounterBucketIds: ["bucket-animal-welfare", "bucket-animal-welfare"],
    frozenReciprocalCounterBucketIds: ["bucket-animal-welfare"],
    rows: "not-rows",
  });

  assert.equal(malformedInputs.eligible, false);
  assert.equal(malformedInputs.counterpartyVolumeSatisfied, false);
  assert.equal(malformedInputs.countedCounterpartyVolumeCents, 0);
  assert.ok(malformedInputs.blockers.includes("counterparty_volume_threshold_invalid"));
  assert.ok(malformedInputs.blockers.includes("counterparty_volume_acceptable_buckets_invalid"));
  assert.ok(malformedInputs.blockers.includes("counterparty_volume_rows_not_array"));
});

test("CRECM v1.125 allocator-state lookups are round-keyed and fail closed", () => {
  const wrongRoundOnly = resolveMpgfCrecAllocatorStateInputs({
    roundId,
    participantId,
    projectId,
    participantRemainingBudgetCentsByRoundAndParticipantId: {
      "round-other": {
        [participantId]: 10_000,
      },
    },
    projectRemainingRequestedCapCentsByRoundAndProjectId: {
      "round-other": {
        [projectId]: 5_000,
      },
    },
  });

  assert.equal(wrongRoundOnly.participantRemainingRoundBudgetCents, 0);
  assert.equal(wrongRoundOnly.projectRemainingRequestedCapCents, 0);
  assert.equal(wrongRoundOnly.allocatorStateEligible, false);
  assert.equal(wrongRoundOnly.actualAllocationCapCents, 0);
  assert.equal(wrongRoundOnly.wrongRoundRowsIgnored, true);
  assert.deepEqual(wrongRoundOnly.participantRemainingLookupKey, { roundId, participantId });
  assert.deepEqual(wrongRoundOnly.projectRemainingLookupKey, { roundId, projectId });
  assert.ok(
    wrongRoundOnly.rowFailureCodes.includes("allocator_state_participant_remaining_budget_round_missing"),
  );
  assert.ok(wrongRoundOnly.rowFailureCodes.includes("allocator_state_project_remaining_cap_round_missing"));

  const malformed = resolveMpgfCrecAllocatorStateInputs({
    roundId,
    participantId,
    projectId,
    participantRemainingBudgetCentsByRoundAndParticipantId: {
      [roundId]: {
        [participantId]: "10000",
      },
    },
    projectRemainingRequestedCapCentsByRoundAndProjectId: {
      [roundId]: {
        [projectId]: -1,
      },
    },
  });

  assert.equal(malformed.participantRemainingRoundBudgetCents, 0);
  assert.equal(malformed.projectRemainingRequestedCapCents, 0);
  assert.equal(malformed.actualAllocationCapCents, 0);
  assert.ok(
    malformed.rowFailureCodes.includes("allocator_state_participant_remaining_budget_cents_invalid_zeroed"),
  );
  assert.ok(malformed.rowFailureCodes.includes("allocator_state_project_remaining_cap_cents_invalid_zeroed"));
});

test("CRECM v1.125 valid allocator-state lookups expose only round-keyed caps", () => {
  const resolved = resolveMpgfCrecAllocatorStateInputs({
    roundId,
    participantId,
    projectId,
    participantRemainingBudgetCentsByRoundAndParticipantId: {
      [roundId]: {
        [participantId]: 3_000,
      },
      "round-other": {
        [participantId]: 9_000,
      },
    },
    projectRemainingRequestedCapCentsByRoundAndProjectId: {
      [roundId]: {
        [projectId]: 2_000,
      },
      "round-other": {
        [projectId]: 8_000,
      },
    },
  });

  assert.equal(resolved.participantRemainingRoundBudgetCents, 3_000);
  assert.equal(resolved.projectRemainingRequestedCapCents, 2_000);
  assert.equal(resolved.allocatorStateEligible, true);
  assert.equal(resolved.actualAllocationCapCents, 2_000);
  assert.deepEqual(resolved.participantRemainingLookupKey, { roundId, participantId });
  assert.deepEqual(resolved.projectRemainingLookupKey, { roundId, projectId });
  assert.equal(resolved.wrongRoundRowsIgnored, true);
  assert.deepEqual(resolved.rowFailureCodes, []);
});

test("CRECM v1.125 identity eligibility inputs fail closed to zero weight", () => {
  const missing = resolveMpgfCrecIdentityEligibilityAllocationInputs({
    roundId,
    participantId,
    selectedIdentityEligibilityRowCount: 0,
    identityEligibility: null,
    identityWeightMinForCountingBps: 5_000,
    identityWeightMinForBonusBps: 8_000,
  });

  assert.equal(missing.identityEligibilityRowEligible, false);
  assert.equal(missing.identityWeightBps, 0);
  assert.equal(missing.identityCountingClear, false);
  assert.equal(missing.countedContributionAllowed, false);
  assert.equal(missing.verifiedSupporterCountAllowed, false);
  assert.equal(missing.activeClusterCountAllowed, false);
  assert.equal(missing.counterpartyVolumeAllowed, false);
  assert.equal(missing.sponsorMatchEligible, false);
  assert.equal(missing.failureBonusEligible, false);
  assert.ok(missing.rowFailureCodes.includes("identity_eligibility_row_missing"));
  assert.ok(missing.rowFailureCodes.includes("identity_eligibility_row_count_not_unique"));

  const malformedWeight = resolveMpgfCrecIdentityEligibilityAllocationInputs({
    roundId,
    participantId,
    selectedIdentityEligibilityRowCount: 1,
    identityEligibility: {
      roundId,
      participantId,
      countedWeightBps: "10000",
      humanVerified: true,
      sybilRiskState: "clear",
      collusionRiskState: "clear",
    },
    identityWeightMinForCountingBps: 5_000,
    identityWeightMinForBonusBps: 8_000,
  });

  assert.equal(malformedWeight.identityEligibilityRowEligible, true);
  assert.equal(malformedWeight.identityWeightBps, 0);
  assert.equal(malformedWeight.identityCountingClear, true);
  assert.equal(malformedWeight.countedContributionAllowed, false);
  assert.equal(malformedWeight.counterpartyVolumeAllowed, false);
  assert.equal(malformedWeight.sponsorMatchEligible, false);
  assert.equal(malformedWeight.failureBonusEligible, false);
  assert.ok(malformedWeight.rowFailureCodes.includes("identity_eligibility_weight_invalid_zeroed"));

  const sybilReview = resolveMpgfCrecIdentityEligibilityAllocationInputs({
    roundId,
    participantId,
    selectedIdentityEligibilityRowCount: 1,
    identityEligibility: {
      roundId,
      participantId,
      countedWeightBps: 10_000,
      humanVerified: true,
      sybilRiskState: "review",
      collusionRiskState: "clear",
    },
    identityWeightMinForCountingBps: 5_000,
    identityWeightMinForBonusBps: 8_000,
  });

  assert.equal(sybilReview.identityWeightBps, 10_000);
  assert.equal(sybilReview.identityCountingClear, false);
  assert.equal(sybilReview.countedContributionAllowed, false);
  assert.equal(sybilReview.verifiedSupporterCountAllowed, false);
  assert.equal(sybilReview.activeClusterCountAllowed, false);
  assert.equal(sybilReview.counterpartyVolumeAllowed, false);
  assert.equal(sybilReview.sponsorMatchEligible, false);
  assert.equal(sybilReview.failureBonusEligible, false);
});

test("CRECM v1.125 verified-clear identity eligibility can unlock counted and match paths", () => {
  const resolved = resolveMpgfCrecIdentityEligibilityAllocationInputs({
    roundId,
    participantId,
    selectedIdentityEligibilityRowCount: 1,
    identityEligibility: {
      roundId,
      participantId,
      countedWeightBps: 9_000,
      humanVerified: true,
      sybilRiskState: "clear",
      collusionRiskState: "clear",
    },
    identityWeightMinForCountingBps: 5_000,
    identityWeightMinForBonusBps: 8_000,
  });

  assert.equal(resolved.identityEligibilityRowEligible, true);
  assert.equal(resolved.identityWeightBps, 9_000);
  assert.equal(resolved.identityWeightMinForCountingBps, 5_000);
  assert.equal(resolved.identityWeightMinForBonusBps, 8_000);
  assert.equal(resolved.humanVerified, true);
  assert.equal(resolved.sybilRiskState, "clear");
  assert.equal(resolved.collusionRiskState, "clear");
  assert.equal(resolved.identityCountingClear, true);
  assert.equal(resolved.countedContributionAllowed, true);
  assert.equal(resolved.verifiedSupporterCountAllowed, true);
  assert.equal(resolved.activeClusterCountAllowed, true);
  assert.equal(resolved.counterpartyVolumeAllowed, true);
  assert.equal(resolved.sponsorMatchEligible, true);
  assert.equal(resolved.failureBonusEligible, true);
  assert.deepEqual(resolved.rowFailureCodes, []);
});

test("CRECM v1.125 economic inputs sanitize sponsor budgets and block malformed project terms", () => {
  const wrongRound = resolveMpgfCrecEconomicInputSanitization({
    roundId,
    projectId,
    selectedPublicGoodProjectRowCount: 1,
    roundBaseMatchBudgetCents: 1_000,
    roundBonusMatchBudgetCents: 2_000,
    roundFailureBonusBudgetCents: 300,
    publicGoodProject: {
      id: projectId,
      roundId: "round-other",
      bucketId: "bucket-global-health",
      get requestedMaxCents() {
        throw new Error("requestedMaxCents should not be read before project row binding");
      },
      get thresholdAmountCents() {
        throw new Error("thresholdAmountCents should not be read before project row binding");
      },
    },
  });

  assert.equal(wrongRound.projectEconomicTermsRowEligible, false);
  assert.equal(wrongRound.projectEconomicTermsValid, false);
  assert.equal(wrongRound.projectClearingAllowed, false);
  assert.equal(wrongRound.safeRequestedMaxCents, 0);
  assert.equal(wrongRound.safeThresholdSupporterMin, Number.MAX_SAFE_INTEGER);
  assert.ok(wrongRound.rowFailureCodes.includes("project_economic_terms_row_not_bound"));

  const malformed = resolveMpgfCrecEconomicInputSanitization({
    roundId,
    projectId,
    selectedPublicGoodProjectRowCount: 1,
    roundBaseMatchBudgetCents: -1,
    roundBonusMatchBudgetCents: 10.5,
    roundFailureBonusBudgetCents: Number.NaN,
    publicGoodProject: {
      id: projectId,
      roundId,
      bucketId: "bucket-global-health",
      requestedMaxCents: "10000",
      minimumViableCents: -1,
      thresholdAmountCents: 1.5,
      thresholdSupporterMin: Number.NaN,
      thresholdClusterMin: null,
      baseMatchRatioBps: 100_001,
      bonusCapMultipleBps: "10000",
    },
  });

  assert.equal(malformed.safeRoundBaseMatchBudgetCents, 0);
  assert.equal(malformed.safeRoundBonusMatchBudgetCents, 0);
  assert.equal(malformed.safeRoundFailureBonusBudgetCents, 0);
  assert.equal(malformed.baseMatchAvailabilityCents, 0);
  assert.equal(malformed.bonusMatchAvailabilityCents, 0);
  assert.equal(malformed.failureBonusAvailabilityCents, 0);
  assert.equal(malformed.totalSponsorPayoutAvailabilityCents, 0);
  assert.equal(malformed.roundSponsorBudgetInputsValid, false);
  assert.equal(malformed.projectEconomicTermsRowEligible, true);
  assert.equal(malformed.projectEconomicTermsValid, false);
  assert.equal(malformed.projectClearingAllowed, false);
  assert.equal(malformed.safeRequestedMaxCents, 0);
  assert.equal(malformed.safeMinimumViableCents, 0);
  assert.equal(malformed.safeThresholdAmountCents, 0);
  assert.equal(malformed.safeThresholdSupporterMin, Number.MAX_SAFE_INTEGER);
  assert.equal(malformed.safeThresholdClusterMin, Number.MAX_SAFE_INTEGER);
  assert.equal(malformed.safeBaseMatchRatioBps, 0);
  assert.equal(malformed.safeBonusCapMultipleBps, 0);
  assert.ok(malformed.rowFailureCodes.includes("round_base_match_budget_cents_invalid_zeroed"));
  assert.ok(malformed.rowFailureCodes.includes("round_bonus_match_budget_cents_invalid_zeroed"));
  assert.ok(malformed.rowFailureCodes.includes("round_failure_bonus_budget_cents_invalid_zeroed"));
  assert.ok(malformed.rowFailureCodes.includes("project_requested_max_cents_invalid_blocks_clearing"));
  assert.ok(malformed.rowFailureCodes.includes("project_minimum_viable_cents_invalid_blocks_clearing"));
  assert.ok(malformed.rowFailureCodes.includes("project_threshold_amount_cents_invalid_blocks_clearing"));
  assert.ok(malformed.rowFailureCodes.includes("project_threshold_supporter_min_invalid_blocks_clearing"));
  assert.ok(malformed.rowFailureCodes.includes("project_threshold_cluster_min_invalid_blocks_clearing"));
  assert.ok(malformed.rowFailureCodes.includes("project_base_match_ratio_bps_invalid_zeroed"));
  assert.ok(malformed.rowFailureCodes.includes("project_bonus_cap_multiple_bps_invalid_zeroed"));

  const unsafeTotal = resolveMpgfCrecEconomicInputSanitization({
    roundId,
    projectId,
    selectedPublicGoodProjectRowCount: 1,
    roundBaseMatchBudgetCents: Number.MAX_SAFE_INTEGER,
    roundBonusMatchBudgetCents: 1,
    roundFailureBonusBudgetCents: 0,
    publicGoodProject: {
      id: projectId,
      roundId,
      bucketId: "bucket-global-health",
      requestedMaxCents: 10_000,
      minimumViableCents: 0,
      thresholdAmountCents: 1_000,
      thresholdSupporterMin: 0,
      thresholdClusterMin: 0,
      baseMatchRatioBps: null,
      bonusCapMultipleBps: null,
    },
  });

  assert.equal(unsafeTotal.totalSponsorPayoutAvailabilityCents, 0);
  assert.equal(unsafeTotal.roundSponsorBudgetInputsValid, false);
  assert.ok(
    unsafeTotal.rowFailureCodes.includes("round_sponsor_budget_total_availability_unsafe_zeroed"),
  );
});

test("CRECM v1.125 valid economic inputs expose sanitized sponsor availability and project terms", () => {
  const resolved = resolveMpgfCrecEconomicInputSanitization({
    roundId,
    projectId,
    selectedPublicGoodProjectRowCount: 1,
    roundBaseMatchBudgetCents: 1_000,
    roundBonusMatchBudgetCents: 2_000,
    roundFailureBonusBudgetCents: 300,
    publicGoodProject: {
      id: projectId,
      roundId,
      bucketId: "bucket-global-health",
      requestedMaxCents: 10_000,
      minimumViableCents: 0,
      thresholdAmountCents: 1_000,
      thresholdSupporterMin: 0,
      thresholdClusterMin: 0,
      baseMatchRatioBps: null,
      bonusCapMultipleBps: 25_000,
    },
  });

  assert.equal(resolved.safeRoundBaseMatchBudgetCents, 1_000);
  assert.equal(resolved.safeRoundBonusMatchBudgetCents, 2_000);
  assert.equal(resolved.safeRoundFailureBonusBudgetCents, 300);
  assert.equal(resolved.totalSponsorPayoutAvailabilityCents, 3_300);
  assert.equal(resolved.roundSponsorBudgetInputsValid, true);
  assert.equal(resolved.projectEconomicTermsRowEligible, true);
  assert.equal(resolved.projectEconomicTermsValid, true);
  assert.equal(resolved.projectClearingAllowed, true);
  assert.equal(resolved.projectId, projectId);
  assert.equal(resolved.projectBucketId, "bucket-global-health");
  assert.equal(resolved.safeRequestedMaxCents, 10_000);
  assert.equal(resolved.safeMinimumViableCents, 0);
  assert.equal(resolved.safeThresholdAmountCents, 1_000);
  assert.equal(resolved.safeThresholdSupporterMin, 0);
  assert.equal(resolved.safeThresholdClusterMin, 0);
  assert.equal(resolved.safeBaseMatchRatioBps, 10_000);
  assert.equal(resolved.safeBonusCapMultipleBps, 25_000);
  assert.equal(resolved.baseMatchRatioDefaulted, true);
  assert.equal(resolved.bonusCapMultipleDefaulted, false);
  assert.deepEqual(resolved.rowFailureCodes, []);
});

test("CRECM v1.125 round-close row-count guards reject duplicate and wrong-key bundle rows", () => {
  const input = rowUniquenessInput();
  const result = validateMpgfCrecRoundCloseBundleRowUniqueness(input);

  assert.equal(result.eligible, true);
  assert.equal(result.selectedProjectRowCount, 1);
  assert.equal(result.selectedCommonGroundBudgetByIdCount, 1);
  assert.equal(result.selectedCommonGroundBudgetByParticipantCount, 1);
  assert.equal(result.selectedSupportStanceRowCount, 1);
  assert.equal(result.selectedConditionalTradeIntentRowCount, 1);
  assert.equal(result.selectedIdentityEligibilityRowCount, 1);
  assert.equal(result.selectedPaymentCommitmentSnapshotRowCount, 1);
  assert.equal(result.selectedProjectRoundEligibilitySnapshotRowCount, 1);
  assert.equal(result.rowUniquenessHash, buildMpgfCrecRoundCloseBundleRowUniquenessHash(input));

  const duplicateStance = validateMpgfCrecRoundCloseBundleRowUniqueness(
    rowUniquenessInput({
      supportStances: [
        {
          id: "stance-1",
          roundId,
          commonGroundBudgetId,
          projectId,
          participantId,
        },
        {
          id: "stance-2",
          roundId,
          commonGroundBudgetId,
          projectId,
          participantId,
        },
      ],
    }),
  );

  assert.equal(duplicateStance.eligible, false);
  assert.ok(duplicateStance.blockers.includes("row_uniqueness_support_stance_duplicate_key"));
  assert.ok(duplicateStance.blockers.includes("row_uniqueness_selected_support_stance_not_exactly_one"));

  const duplicateBudgetParticipant = validateMpgfCrecRoundCloseBundleRowUniqueness(
    rowUniquenessInput({
      commonGroundBudgets: [
        {
          roundId,
          id: commonGroundBudgetId,
          participantId,
        },
        {
          roundId,
          id: "budget-alix-second",
          participantId,
        },
      ],
    }),
  );

  assert.equal(duplicateBudgetParticipant.eligible, false);
  assert.ok(
    duplicateBudgetParticipant.blockers.includes("row_uniqueness_budget_participant_duplicate_key"),
  );

  const wrongRoundPayment = validateMpgfCrecRoundCloseBundleRowUniqueness(
    rowUniquenessInput({
      paymentCommitmentSnapshots: [
        paymentSnapshot({
          roundId: "round-other",
          snapshotKind: "early_failure_bonus_cutoff",
          asOf: earlyFailureBonusCutoff,
          createdAt: earlyFailureBonusCutoff,
        }),
      ],
    }),
  );

  assert.equal(wrongRoundPayment.eligible, false);
  assert.equal(wrongRoundPayment.selectedPaymentCommitmentSnapshotRowCount, 0);
  assert.ok(
    wrongRoundPayment.blockers.includes("row_uniqueness_selected_payment_snapshot_not_exactly_one"),
  );

  const crossBudgetIntent = validateMpgfCrecRoundCloseBundleRowUniqueness(
    rowUniquenessInput({
      conditionalTradeIntents: [
        {
          id: conditionalTradeIntentId,
          roundId,
          commonGroundBudgetId: "budget-other",
          projectId,
          participantId,
        },
      ],
    }),
  );

  assert.equal(crossBudgetIntent.eligible, false);
  assert.equal(crossBudgetIntent.selectedConditionalTradeIntentRowCount, 0);
  assert.ok(
    crossBudgetIntent.blockers.includes("row_uniqueness_selected_conditional_intent_not_exactly_one"),
  );
});

test("CRECM v1.125 supporter breadth uses net-public-good credit floor and verified-clear identity", () => {
  assert.equal(normalizeMpgfCrecSupporterCountMinNetPublicGoodCents(undefined), 100);
  assert.equal(normalizeMpgfCrecSupporterCountMinNetPublicGoodCents(1), 100);
  assert.equal(normalizeMpgfCrecSupporterCountMinNetPublicGoodCents(250), 250);

  const breadth = evaluateMpgfCrecNetPublicGoodSupporterBreadth({
    roundId,
    projectId,
    supporterCountMinNetPublicGoodCents: "100",
    rows: [
      supporterCreditRow({
        participantId: "supporter-dust",
        activeClusterId: "cluster-dust",
        netRecipientDisbursedCents: 99,
      }),
      supporterCreditRow({
        participantId: "supporter-a",
        activeClusterId: "cluster-a",
        netRecipientDisbursedCents: 100,
      }),
      supporterCreditRow({
        participantId: "supporter-b",
        activeClusterId: "cluster-b",
        netRecipientDisbursedCents: 250,
      }),
      supporterCreditRow({
        participantId: "supporter-c",
        activeClusterId: "cluster-b",
        netRecipientDisbursedCents: 300,
      }),
      supporterCreditRow({
        participantId: "supporter-sybil-review",
        activeClusterId: "cluster-sybil-review",
        netRecipientDisbursedCents: 500,
        sybilRiskState: "review",
      }),
      supporterCreditRow({
        participantId: "supporter-same-payment",
        activeClusterId: "cluster-same-payment",
        netRecipientDisbursedCents: 500,
        samePaymentMethodExcluded: false,
      }),
    ],
  });

  assert.equal(breadth.eligible, true);
  assert.equal(breadth.supporterCountMinNetPublicGoodCents, 100);
  assert.equal(breadth.verifiedSupporterCount, 3);
  assert.equal(breadth.activeClusterCount, 2);
  assert.deepEqual(breadth.countedParticipantIds, ["supporter-a", "supporter-b", "supporter-c"]);
  assert.deepEqual(breadth.countedActiveClusterIds, ["cluster-a", "cluster-b"]);
  assert.ok(breadth.excludedRowCodes.includes("supporter_row_0_below_net_public_good_floor"));
  assert.ok(breadth.excludedRowCodes.includes("supporter_row_4_sybil_not_clear"));
  assert.ok(
    breadth.excludedRowCodes.includes("supporter_row_5_counterparty_identity_exclusion_not_clear"),
  );

  const raisedFloor = evaluateMpgfCrecNetPublicGoodSupporterBreadth({
    roundId,
    projectId,
    supporterCountMinNetPublicGoodCents: 250,
    rows: [
      supporterCreditRow({
        participantId: "supporter-a",
        activeClusterId: "cluster-a",
        netRecipientDisbursedCents: 249,
      }),
      supporterCreditRow({
        participantId: "supporter-b",
        activeClusterId: "cluster-b",
        netRecipientDisbursedCents: 250,
      }),
    ],
  });

  assert.equal(raisedFloor.supporterCountMinNetPublicGoodCents, 250);
  assert.equal(raisedFloor.verifiedSupporterCount, 1);
  assert.equal(raisedFloor.activeClusterCount, 1);
  assert.ok(raisedFloor.excludedRowCodes.includes("supporter_row_0_below_net_public_good_floor"));
});

test("CRECM v1.125 authorization reconciliation events bind row identity, amounts, and expiry", () => {
  const event = authorizationReconciliationEvent();
  const result = validateMpgfCrecAuthorizationReconciliationEvent(event, {
    roundId,
    participantId,
    projectId,
    conditionalTradeIntentId,
  });

  assert.equal(result.eligible, true);

  const shortExpiry = authorizationReconciliationEvent({
    authExpiresAt: "2026-05-18T00:00:00.000Z",
  });
  const shortExpiryResult = validateMpgfCrecAuthorizationReconciliationEvent(shortExpiry, {
    roundId,
    participantId,
    projectId,
    conditionalTradeIntentId,
  });

  assert.equal(shortExpiryResult.eligible, false);
  assert.ok(shortExpiryResult.blockers.includes("authorization_reconciliation_short_expiry"));

  const staleHash = { ...event, authorizedAmountCents: 900 };
  const staleHashResult = validateMpgfCrecAuthorizationReconciliationEvent(staleHash, {
    roundId,
    participantId,
    projectId,
    conditionalTradeIntentId,
  });

  assert.equal(staleHashResult.eligible, false);
  assert.ok(staleHashResult.blockers.includes("authorization_reconciliation_state_amounts_invalid"));
  assert.ok(staleHashResult.blockers.includes("authorization_reconciliation_event_hash_mismatch"));
});

test("CRECM v1.125 fee quotes bind fee policy hash and net-recipient accounting", () => {
  const bundle = clearingBundle();
  const quote = feeQuote();
  const result = validateMpgfCrecFeeQuote(quote, {
    roundId,
    commonGroundBudgetId,
    projectId,
    conditionalTradeIntentId,
    feePolicyVersion: bundle.feePolicyVersion,
    feePolicyHash: bundle.feePolicyHash,
    sponsorPoolSourceHash: sourceHash,
    positiveAllocationRequired: true,
  });

  assert.equal(result.eligible, true);

  const waivedWithFee = feeQuote({
    feePayer: "waived",
    feeCents: 25,
    netRecipientDisbursedCents: 1_000,
  });
  const waivedResult = validateMpgfCrecFeeQuote(waivedWithFee, {
    roundId,
    commonGroundBudgetId,
    projectId,
    conditionalTradeIntentId,
    feePolicyVersion: bundle.feePolicyVersion,
    feePolicyHash: bundle.feePolicyHash,
  });

  assert.equal(waivedResult.eligible, false);
  assert.ok(waivedResult.blockers.includes("fee_quote_waived_fee_invalid"));

  const stalePolicy = { ...quote, feePolicyHash: h("stale-fee-policy") };
  const stalePolicyResult = validateMpgfCrecFeeQuote(stalePolicy, {
    roundId,
    commonGroundBudgetId,
    projectId,
    conditionalTradeIntentId,
    feePolicyVersion: bundle.feePolicyVersion,
    feePolicyHash: bundle.feePolicyHash,
  });

  assert.equal(stalePolicyResult.eligible, false);
  assert.ok(stalePolicyResult.blockers.includes("fee_quote_wrong_fee_policy_hash"));
  assert.ok(stalePolicyResult.blockers.includes("fee_quote_hash_mismatch"));
});

test("CRECM v1.125 selected sponsor-paid fee support uses unique binding fee quotes", () => {
  const bundle = clearingBundle();
  const selectedSponsorPaid = feeQuote({
    id: "fee-quote-sponsor-paid",
    feePayer: "sponsor_paid",
    grossCapturedCents: 1_000,
    feeCents: 45,
    netRecipientDisbursedCents: 1_000,
    sponsorFeeBackingHash: sourceHash,
  });
  const donorDeducted = feeQuote({ id: "fee-quote-donor-deducted" });
  const result = sumSelectedMpgfCrecSponsorPaidFeeSupportDemand(
    [selectedSponsorPaid, donorDeducted],
    [selectedSponsorPaid.id, donorDeducted.id],
    {
      roundId,
      feePolicyVersion: bundle.feePolicyVersion,
      feePolicyHash: bundle.feePolicyHash,
      sponsorPoolSourceHash: sourceHash,
      backedFeeSupportPoolCents: 45,
      roundCloseBundleEligible: true,
    },
  );

  assert.equal(result.eligible, true);
  assert.equal(result.demandCents, 45);
  assert.equal(result.selectedFeeQuoteCount, 2);

  const duplicateResult = sumSelectedMpgfCrecSponsorPaidFeeSupportDemand(
    [selectedSponsorPaid, selectedSponsorPaid],
    [selectedSponsorPaid.id],
    {
      roundId,
      feePolicyVersion: bundle.feePolicyVersion,
      feePolicyHash: bundle.feePolicyHash,
      sponsorPoolSourceHash: sourceHash,
      backedFeeSupportPoolCents: 45,
      roundCloseBundleEligible: true,
    },
  );

  assert.equal(duplicateResult.eligible, false);
  assert.ok(duplicateResult.blockers.some((blocker) => blocker.includes("not_unique")));

  const underBacked = sumSelectedMpgfCrecSponsorPaidFeeSupportDemand(
    [selectedSponsorPaid],
    [selectedSponsorPaid.id],
    {
      roundId,
      feePolicyVersion: bundle.feePolicyVersion,
      feePolicyHash: bundle.feePolicyHash,
      sponsorPoolSourceHash: sourceHash,
      backedFeeSupportPoolCents: 44,
      roundCloseBundleEligible: true,
    },
  );

  assert.equal(underBacked.eligible, false);
  assert.ok(underBacked.blockers.includes("fee_support_pool_underbacked"));

  const bundleBlocked = sumSelectedMpgfCrecSponsorPaidFeeSupportDemand(
    [selectedSponsorPaid],
    [selectedSponsorPaid.id],
    {
      roundId,
      feePolicyVersion: bundle.feePolicyVersion,
      feePolicyHash: bundle.feePolicyHash,
      sponsorPoolSourceHash: sourceHash,
      backedFeeSupportPoolCents: 45,
      roundCloseBundleEligible: false,
    },
  );

  assert.equal(bundleBlocked.eligible, false);
  assert.equal(bundleBlocked.demandCents, 0);
  assert.ok(bundleBlocked.blockers.includes("fee_support_round_close_bundle_not_eligible"));
});

test("CRECM v1.125 optimization traces bind Stage 3 allocation evidence", () => {
  const bundle = clearingBundle();
  const trace = optimizationRunTrace();
  const result = validateMpgfCrecOptimizationRunTrace(trace, {
    roundId,
    clearingInputBundleId: bundle.id,
    clearingInputBundleHash: bundle.bundleHash,
    calculationVersion: bundle.calculationVersion,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
  });

  assert.equal(result.eligible, true);

  const timeout = optimizationRunTrace({
    optimalityStatus: "timeout",
  });
  const timeoutResult = validateMpgfCrecOptimizationRunTrace(timeout, {
    roundId,
    clearingInputBundleId: bundle.id,
    clearingInputBundleHash: bundle.bundleHash,
    calculationVersion: bundle.calculationVersion,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
  });

  assert.equal(timeoutResult.eligible, false);
  assert.ok(timeoutResult.blockers.includes("optimization_trace_optimality_status_invalid"));

  const staleAllocationRows = { ...trace, selectedAllocationRowsHash: h("changed-allocation-rows") };
  const staleAllocationResult = validateMpgfCrecOptimizationRunTrace(staleAllocationRows, {
    roundId,
    clearingInputBundleId: bundle.id,
    clearingInputBundleHash: bundle.bundleHash,
    calculationVersion: bundle.calculationVersion,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
  });

  assert.equal(staleAllocationResult.eligible, false);
  assert.ok(staleAllocationResult.blockers.includes("optimization_trace_hash_mismatch"));
});

test("CRECM v1.125 bonus match allocates from canonical integer score units with exact caps", () => {
  const rows = [
    {
      projectId: "project-a",
      bonusScoreUnits: "2",
      bonusCapCents: 10,
      stableOrderKey: h("bonus-order-project-a"),
    },
    {
      projectId: "project-b",
      bonusScoreUnits: "1",
      bonusCapCents: 10,
      stableOrderKey: h("bonus-order-project-b"),
    },
  ];
  const allocation = allocateMpgfCrecBonusMatchByScoreUnits({
    roundId,
    clearingInputBundleHash: clearingBundle().bundleHash,
    bonusScoreHash: bonusScoreHash(rows),
    calculationVersion: "crecm-v1.125-fixed-point-bonus",
    backedBonusMatchPoolCents: 5,
    rows,
  });

  assert.equal(allocation.eligible, true);
  assert.deepEqual(allocation.allocatedBonusCentsByProjectId, {
    "project-a": 3,
    "project-b": 2,
  });
  assert.equal(allocation.totalAllocatedCents, 5);
  assert.equal(allocation.totalBonusScoreUnitsExact, "3");

  const capped = allocateMpgfCrecBonusMatchByScoreUnits({
    roundId,
    clearingInputBundleHash: clearingBundle().bundleHash,
    bonusScoreHash: bonusScoreHash([
      { projectId: "project-a", bonusScoreUnits: "100" },
      { projectId: "project-b", bonusScoreUnits: "1" },
    ]),
    calculationVersion: "crecm-v1.125-fixed-point-bonus",
    backedBonusMatchPoolCents: 10,
    rows: [
      {
        projectId: "project-a",
        bonusScoreUnits: "100",
        bonusCapCents: 2,
        stableOrderKey: h("bonus-order-project-a"),
      },
      {
        projectId: "project-b",
        bonusScoreUnits: "1",
        bonusCapCents: 10,
        stableOrderKey: h("bonus-order-project-b"),
      },
    ],
  });

  assert.equal(capped.eligible, true);
  assert.deepEqual(capped.allocatedBonusCentsByProjectId, {
    "project-a": 2,
    "project-b": 8,
  });
  assert.equal(capped.unallocatedBonusPoolCents, 0);
});

test("CRECM v1.125 bonus score-unit allocation zeroes malformed row values fail-closed", () => {
  const rows = [
    {
      projectId: "project-malformed",
      bonusScoreUnits: "01",
      bonusCapCents: -1,
      stableOrderKey: h("bonus-order-project-malformed"),
    },
    {
      projectId: "project-valid",
      bonusScoreUnits: "5",
      bonusCapCents: 5,
      stableOrderKey: h("bonus-order-project-valid"),
    },
  ];
  const allocation = allocateMpgfCrecBonusMatchByScoreUnits({
    roundId,
    clearingInputBundleHash: clearingBundle().bundleHash,
    bonusScoreHash: bonusScoreHash(rows),
    calculationVersion: "crecm-v1.125-fixed-point-bonus",
    backedBonusMatchPoolCents: 5,
    rows,
  });

  assert.equal(allocation.eligible, true);
  assert.deepEqual(allocation.allocatedBonusCentsByProjectId, {
    "project-malformed": 0,
    "project-valid": 5,
  });
  assert.equal(allocation.sanitizedBonusScoreUnitsByProjectId["project-malformed"], "0");
  assert.equal(allocation.sanitizedBonusCapCentsByProjectId["project-malformed"], 0);
  assert.ok(allocation.sanitizedRowCodes.includes("bonus_score_units_0_sanitized_to_zero"));
  assert.ok(allocation.sanitizedRowCodes.includes("bonus_cap_cents_0_sanitized_to_zero"));

  const invalidOrder = allocateMpgfCrecBonusMatchByScoreUnits({
    roundId,
    clearingInputBundleHash: clearingBundle().bundleHash,
    bonusScoreHash: bonusScoreHash(rows),
    calculationVersion: "crecm-v1.125-fixed-point-bonus",
    backedBonusMatchPoolCents: 5,
    rows: [
      {
        projectId: "project-valid",
        bonusScoreUnits: "5",
        bonusCapCents: 5,
        stableOrderKey: "not-a-hash",
      },
    ],
  });

  assert.equal(invalidOrder.eligible, false);
  assert.ok(invalidOrder.blockers.includes("bonus_score_allocation_stable_order_keys_invalid"));
  assert.equal(invalidOrder.totalAllocatedCents, 0);
});

test("CRECM v1.125 audit bundles bind final bundle component hashes and optimization trace ids", () => {
  const bundle = clearingBundle();
  const trace = optimizationRunTrace();
  const auditBundle = roundAuditBundle();
  const result = validateMpgfCrecRoundAuditBundle(
    auditBundle,
    roundAuditBundleExpectedContext(bundle, trace),
  );

  assert.equal(result.eligible, true);

  const staleFeeInput = {
    ...auditBundle,
    feeInputHash: h("changed-fee-input"),
  };
  const staleFeeInputResult = validateMpgfCrecRoundAuditBundle(
    staleFeeInput,
    roundAuditBundleExpectedContext(bundle, trace),
  );

  assert.equal(staleFeeInputResult.eligible, false);
  assert.ok(staleFeeInputResult.blockers.includes("round_audit_bundle_wrong_fee_input_hash"));
  assert.ok(staleFeeInputResult.blockers.includes("round_audit_bundle_hash_mismatch"));

  const wrongTrace = {
    ...auditBundle,
    optimizationTraceId: "optimization-trace-2",
    optimizationTraceHash: h("other-optimization-trace"),
  };
  const wrongTraceResult = validateMpgfCrecRoundAuditBundle(
    wrongTrace,
    roundAuditBundleExpectedContext(bundle, trace),
  );

  assert.equal(wrongTraceResult.eligible, false);
  assert.ok(
    wrongTraceResult.blockers.includes("round_audit_bundle_wrong_optimization_trace_id"),
  );
  assert.ok(
    wrongTraceResult.blockers.includes("round_audit_bundle_wrong_optimization_trace_hash"),
  );

  const staleBonusScore = roundAuditBundle({
    bonusScoreHash: h("different-bonus-score"),
  });
  const staleBonusScoreResult = validateMpgfCrecRoundAuditBundle(
    staleBonusScore,
    roundAuditBundleExpectedContext(bundle, trace),
  );

  assert.equal(staleBonusScoreResult.eligible, false);
  assert.ok(staleBonusScoreResult.blockers.includes("round_audit_bundle_wrong_bonus_score_hash"));
});

test("CRECM v1.125 contributor benefits require captured successful no-late-access rows", () => {
  const input = contributorBenefitInput();
  const result = evaluateMpgfCrecContributorBenefitEligibility(input);

  assert.equal(result.eligible, true);
  assert.equal(result.benefitContextHash, buildMpgfCrecContributorBenefitContextHash(input));

  const unpaid = evaluateMpgfCrecContributorBenefitEligibility(
    contributorBenefitInput({
      capturedContributionState: "authorized",
      participantSignedBeforeClose: false,
      paymentSnapshotEligible: false,
    }),
  );

  assert.equal(unpaid.eligible, false);
  assert.ok(unpaid.blockers.includes("contributor_benefit_not_captured"));
  assert.ok(unpaid.blockers.includes("contributor_benefit_late_or_unsigned_participant"));
  assert.ok(unpaid.blockers.includes("contributor_benefit_payment_snapshot_ineligible"));
});

test("CRECM v1.125 success rewards use only fully backed success reward pools", () => {
  const input = successRewardClaimInput();
  const result = evaluateMpgfCrecSuccessRewardClaim(input);

  assert.equal(result.eligible, true);
  assert.equal(result.rewardCents, 25);
  assert.equal(result.claimHash, buildMpgfCrecSuccessRewardClaimHash(input));

  const underBacked = evaluateMpgfCrecSuccessRewardClaim(
    successRewardClaimInput({ backedSuccessRewardPoolCents: 499 }),
  );

  assert.equal(underBacked.eligible, false);
  assert.ok(underBacked.blockers.includes("success_reward_pool_not_fully_backed"));

  const dominanceUnderBacked = evaluateMpgfCrecSuccessRewardClaim(
    successRewardClaimInput({
      dominanceClaimShown: true,
      maximumPromisedRewardLiabilityCents: 600,
    }),
  );

  assert.equal(dominanceUnderBacked.eligible, false);
  assert.ok(
    dominanceUnderBacked.blockers.includes("success_reward_dominance_liability_not_fully_backed"),
  );
});

test("CRECM v1.125 coordination credits are non-transferable and do not affect allocation power", () => {
  const benefitContextHash = buildMpgfCrecContributorBenefitContextHash(
    contributorBenefitInput({ benefitKind: "coordination_credit" }),
  );
  const entry = coordinationCreditEntry({ benefitContextHash });
  const result = validateMpgfCrecCoordinationCreditLedgerEntry(entry, {
    roundId,
    projectId,
    participantId,
    commonGroundBudgetId,
    conditionalTradeIntentId,
    benefitContextHash,
  });

  assert.equal(result.eligible, true);

  const transferable = coordinationCreditEntry({
    benefitContextHash,
    nonTransferable: false,
    affectsAllocationPower: true,
  });
  const transferableResult = validateMpgfCrecCoordinationCreditLedgerEntry(transferable, {
    roundId,
    projectId,
    participantId,
    commonGroundBudgetId,
    conditionalTradeIntentId,
    benefitContextHash,
  });

  assert.equal(transferableResult.eligible, false);
  assert.ok(transferableResult.blockers.includes("coordination_credit_transferable"));
  assert.ok(transferableResult.blockers.includes("coordination_credit_affects_allocation_power"));
});

test("CRECM v1.125 impact certificates bind contribution context and deny retroactive access", () => {
  const claim = impactCertificateClaim();
  const result = validateMpgfCrecImpactCertificateClaim(claim, {
    roundId,
    projectId,
    participantId,
    commonGroundBudgetId,
    conditionalTradeIntentId,
    rulebookHash,
    clearingInputBundleHash: claim.clearingInputBundleHash,
    paymentCommitmentSnapshotHash: claim.paymentCommitmentSnapshotHash,
    feeQuoteHash: claim.feeQuoteHash,
    contributionRowHash: claim.contributionRowHash,
  });

  assert.equal(result.eligible, true);

  const retroactive = impactCertificateClaim({ retroactiveAccessAllowed: true });
  const retroactiveResult = validateMpgfCrecImpactCertificateClaim(retroactive, {
    roundId,
    projectId,
    participantId,
    commonGroundBudgetId,
    conditionalTradeIntentId,
    rulebookHash,
    clearingInputBundleHash: retroactive.clearingInputBundleHash,
    paymentCommitmentSnapshotHash: retroactive.paymentCommitmentSnapshotHash,
    feeQuoteHash: retroactive.feeQuoteHash,
    contributionRowHash: retroactive.contributionRowHash,
  });

  assert.equal(retroactiveResult.eligible, false);
  assert.ok(retroactiveResult.blockers.includes("impact_certificate_retroactive_access_enabled"));

  const staleContribution = { ...claim, contributionRowHash: h("changed-contribution-row") };
  const staleResult = validateMpgfCrecImpactCertificateClaim(staleContribution, {
    roundId,
    projectId,
    participantId,
    commonGroundBudgetId,
    conditionalTradeIntentId,
    rulebookHash,
    clearingInputBundleHash: claim.clearingInputBundleHash,
    paymentCommitmentSnapshotHash: claim.paymentCommitmentSnapshotHash,
    feeQuoteHash: claim.feeQuoteHash,
    contributionRowHash: claim.contributionRowHash,
  });

  assert.equal(staleResult.eligible, false);
  assert.ok(staleResult.blockers.includes("impact_certificate_wrong_contribution_row_hash"));
  assert.ok(staleResult.blockers.includes("impact_certificate_hash_mismatch"));
});

test("CRECM v1.125 sponsor backing filters frozen commitments by round, pool, source hash, and timing", () => {
  const result = sumMpgfCrecSponsorBackedCentsForFinalClearing(
    [
      sponsorCommitment({ id: "sponsor-failure-1", fundedCents: 5_000 }),
      sponsorCommitment({ id: "sponsor-base-wrong-pool", poolType: "base_match", fundedCents: 25_000 }),
      sponsorCommitment({ id: "sponsor-other-round", roundId: "other-round", fundedCents: 99_000 }),
    ],
    {
      roundId,
      poolType: "failure_bonus",
      sponsorPoolSourceHash: sourceHash,
      parametersFrozenAt,
      opensAt,
      clearingBundleEligible: true,
    },
  );

  assert.equal(result.backedCents, 5_000);
  assert.equal(result.includedCommitmentCount, 1);
  assert.equal(result.excludedCommitmentCount, 2);
  assert.deepEqual(result.blockers, []);

  const lateResult = sumMpgfCrecSponsorBackedCentsForFinalClearing(
    [sponsorCommitment({ backingConfirmedAt: "2026-05-02T00:00:00.000Z" })],
    {
      roundId,
      poolType: "failure_bonus",
      sponsorPoolSourceHash: sourceHash,
      parametersFrozenAt,
      opensAt,
      clearingBundleEligible: true,
    },
  );

  assert.equal(lateResult.backedCents, 0);
  assert.ok(lateResult.blockers.includes("sponsor_commitment_0_invalid"));
});

test("CRECM v1.125 failure-bonus claimant conflict snapshots bind the exact payout context", () => {
  const validSnapshot = failureBonusClaimantConflictSnapshot();
  const expected = {
    roundId,
    projectId,
    participantId,
    commonGroundBudgetId,
    conditionalTradeIntentId,
    rulebookHash,
    failureBonusPolicyVersion: "failure-bonus-v1",
    sourceCutoffAt: roundCloseSourceCutoff,
  };
  const valid = validateMpgfCrecFailureBonusClaimantConflictSnapshot(validSnapshot, expected);

  assert.equal(valid.eligible, true);

  const wrongBudget = validateMpgfCrecFailureBonusClaimantConflictSnapshot(
    failureBonusClaimantConflictSnapshot({ commonGroundBudgetId: "budget-other" }),
    expected,
  );
  assert.equal(wrongBudget.eligible, false);
  assert.ok(
    wrongBudget.blockers.includes("failure_bonus_claimant_conflict_snapshot_wrong_budget"),
  );

  const staleCutoff = validateMpgfCrecFailureBonusClaimantConflictSnapshot(
    failureBonusClaimantConflictSnapshot({ sourceCutoffAt: earlyFailureBonusCutoff }),
    expected,
  );
  assert.equal(staleCutoff.eligible, false);
  assert.ok(
    staleCutoff.blockers.includes("failure_bonus_claimant_conflict_snapshot_source_cutoff_mismatch"),
  );

  const conflicted = validateMpgfCrecFailureBonusClaimantConflictSnapshot(
    failureBonusClaimantConflictSnapshot({ conflictState: "recipient_affiliate" }),
    expected,
  );
  assert.equal(conflicted.eligible, false);
  assert.ok(
    conflicted.blockers.includes("failure_bonus_claimant_conflict_snapshot_not_clear"),
  );
});

test("CRECM v1.125 failure bonuses require payable threshold-family failures and fully backed sponsor budget", () => {
  const input = failureBonusInput();
  const result = evaluateMpgfCrecFailureBonusEligibility(input);

  assert.equal(result.qualified, true);
  assert.equal(result.claimKey, `${roundId}:${projectId}:${participantId}:${conditionalTradeIntentId}`);
  assert.equal(result.rawBonusCents, 100);
  assert.equal(result.participantCappedProvisionalBonusCents, 75);
  assert.equal(result.backedAvailableFailureBonusPoolCents, 500);
  assert.equal(result.eligibilityInputsHash, buildMpgfCrecFailureBonusEligibilityInputsHash(input));

  const deniedReason = evaluateMpgfCrecFailureBonusEligibility(
    failureBonusInput({ failureReason: "review_not_approved" }),
  );

  assert.equal(deniedReason.qualified, false);
  assert.ok(deniedReason.blockers.includes("failure_bonus_reason_not_threshold_family"));

  const hardGateBlocked = evaluateMpgfCrecFailureBonusEligibility(
    failureBonusInput({ projectHardGateEligible: false }),
  );

  assert.equal(hardGateBlocked.qualified, false);
  assert.ok(hardGateBlocked.blockers.includes("failure_bonus_project_hard_gate_ineligible"));

  const rowUniquenessBlocked = evaluateMpgfCrecFailureBonusEligibility(
    failureBonusInput({ rowUniquenessEligible: false }),
  );

  assert.equal(rowUniquenessBlocked.qualified, false);
  assert.ok(rowUniquenessBlocked.blockers.includes("failure_bonus_row_uniqueness_ineligible"));

  const conflictSnapshotBlocked = evaluateMpgfCrecFailureBonusEligibility(
    failureBonusInput({
      claimantConflictSnapshotEligible: false,
      claimantConflictState: "recipient_affiliate",
    }),
  );

  assert.equal(conflictSnapshotBlocked.qualified, false);
  assert.ok(
    conflictSnapshotBlocked.blockers.includes("failure_bonus_claimant_conflict_snapshot_ineligible"),
  );
  assert.ok(
    conflictSnapshotBlocked.blockers.includes("failure_bonus_claimant_conflict_not_clear"),
  );

  const underBacked = evaluateMpgfCrecFailureBonusEligibility(
    failureBonusInput({ backedFailureBonusPoolCents: 499 }),
  );

  assert.equal(underBacked.qualified, false);
  assert.ok(underBacked.blockers.includes("failure_bonus_pool_not_fully_backed"));
});

test("CRECM v1.125 round metadata gate requires canonical ordered lifecycle and policy fields", () => {
  const valid = validateMpgfCrecRoundMetadataGate({
    roundId,
    rulebookHash,
    sponsorPoolSourceHash: sourceHash,
    paymentReconciliationPathHash: h("payment-reconciliation-path"),
    calculationVersion: "crecm-v1.125-calc",
    failureBonusPolicyVersion: "failure-bonus-v1",
    parametersFrozenAt,
    opensAt,
    earlyFailureBonusCutoff,
    reviewFreezeAt,
    closesAt,
    challengeDeadline,
  });

  assert.equal(valid.eligible, true);
  assert.deepEqual(valid.blockers, []);
  assert.equal(valid.roundId, roundId);
  assert.equal(valid.parametersFrozenAt, parametersFrozenAt);
  assert.equal(valid.opensAt, opensAt);
  assert.equal(valid.earlyFailureBonusCutoff, earlyFailureBonusCutoff);
  assert.equal(valid.reviewFreezeAt, reviewFreezeAt);
  assert.equal(valid.closesAt, closesAt);
  assert.equal(valid.challengeDeadline, challengeDeadline);
  assert.equal(valid.lockAllowed, true);
  assert.equal(valid.clearingAllowed, true);
  assert.equal(valid.matchingAllowed, true);
  assert.equal(valid.authorizationAllowed, true);
  assert.equal(valid.failureBonusQualificationAllowed, true);

  const invalid = validateMpgfCrecRoundMetadataGate({
    roundId: " round-crecm-2026-05",
    rulebookHash: "not-a-hash",
    sponsorPoolSourceHash: sourceHash,
    paymentReconciliationPathHash: "",
    calculationVersion: "crecm-v1.125-calc ",
    failureBonusPolicyVersion: "",
    parametersFrozenAt: "2026-05-01T00:00:00.001Z",
    opensAt: "2026-05-01T00:00:00.000Z",
    earlyFailureBonusCutoff: "2026-05-11T00:00:00.000Z",
    reviewFreezeAt: "2026-05-10T00:00:00.000Z",
    closesAt: "2026-05-10T00:00:00.000Z",
    challengeDeadline: "2026-05-09T00:00:00.000Z",
  });

  assert.equal(invalid.eligible, false);
  assert.equal(invalid.roundId, null);
  assert.equal(invalid.rulebookHash, null);
  assert.equal(invalid.paymentReconciliationPathHash, null);
  assert.equal(invalid.calculationVersion, null);
  assert.equal(invalid.failureBonusPolicyVersion, null);
  assert.equal(invalid.lockAllowed, false);
  assert.equal(invalid.clearingAllowed, false);
  assert.equal(invalid.matchingAllowed, false);
  assert.equal(invalid.authorizationAllowed, false);
  assert.equal(invalid.failureBonusQualificationAllowed, false);
  assert.ok(invalid.blockers.includes("round_metadata_round_id_invalid"));
  assert.ok(invalid.blockers.includes("round_metadata_rulebook_hash_invalid"));
  assert.ok(invalid.blockers.includes("round_metadata_payment_reconciliation_path_hash_invalid"));
  assert.ok(invalid.blockers.includes("round_metadata_calculation_version_invalid"));
  assert.ok(invalid.blockers.includes("round_metadata_failure_bonus_policy_version_invalid"));
  assert.ok(invalid.blockers.includes("round_metadata_parameters_frozen_after_open"));
  assert.ok(invalid.blockers.includes("round_metadata_early_failure_bonus_cutoff_after_review_freeze"));
  assert.ok(invalid.blockers.includes("round_metadata_review_freeze_not_before_close"));
  assert.ok(invalid.blockers.includes("round_metadata_close_not_before_challenge_deadline"));
});

test("CRECM v1.125 round status gate separates replay, authorization, payable side effects, and previews", () => {
  const payableCapture = evaluateMpgfCrecRoundStatusGate({
    roundStatus: "payable",
    operation: "capture",
  });
  assert.equal(payableCapture.allowed, true);
  assert.equal(payableCapture.stateMutationAllowed, true);

  const releasedCapture = evaluateMpgfCrecRoundStatusGate({
    roundStatus: "released",
    operation: "capture",
  });
  assert.equal(releasedCapture.allowed, false);
  assert.ok(releasedCapture.blockers.includes("round_status_not_payable_for_side_effect"));

  const closedAudit = evaluateMpgfCrecRoundStatusGate({
    roundStatus: "closed",
    operation: "audit_output",
  });
  assert.equal(closedAudit.allowed, true);
  assert.equal(closedAudit.replayOnly, true);

  const openPreview = evaluateMpgfCrecRoundStatusGate({
    roundStatus: "open",
    operation: "non_binding_preview",
  });
  assert.equal(openPreview.allowed, true);
  assert.equal(openPreview.nonBindingPreviewOnly, true);

  const openFinal = evaluateMpgfCrecRoundStatusGate({
    roundStatus: "open",
    operation: "final_binding_result",
  });
  assert.equal(openFinal.allowed, false);
  assert.ok(openFinal.blockers.includes("round_status_not_result_replay_allowed"));

  const clearedAuthorization = evaluateMpgfCrecRoundStatusGate({
    roundStatus: "cleared",
    operation: "new_authorization_attempt",
  });
  assert.equal(clearedAuthorization.allowed, true);
  assert.equal(clearedAuthorization.stateMutationAllowed, true);

  const payableAuthorization = evaluateMpgfCrecRoundStatusGate({
    roundStatus: "payable",
    operation: "new_authorization_attempt",
  });
  assert.equal(payableAuthorization.allowed, false);
  assert.ok(payableAuthorization.blockers.includes("round_status_not_cleared_for_authorization"));

  const unbackedFailureBonusPayment = evaluateMpgfCrecRoundStatusGate({
    roundStatus: "payable",
    operation: "failure_bonus_payment",
    backedFailureBonusPoolCents: 0,
  });
  assert.equal(unbackedFailureBonusPayment.allowed, false);
  assert.ok(unbackedFailureBonusPayment.blockers.includes("failure_bonus_backed_pool_not_positive_for_mutation"));

  const malformed = evaluateMpgfCrecRoundStatusGate({
    roundStatus: "missing",
    operation: "audit_output",
  });
  assert.equal(malformed.allowed, false);
  assert.ok(malformed.blockers.includes("round_status_malformed"));
});

test("CRECM v1.125 failure-bonus mutation lists are unsettled, backed, audited, and payable-only", () => {
  const context = {
    roundId,
    failureBonusPolicyVersion: "failure-bonus-v1",
    roundStatus: "payable",
    backedFailureBonusPoolCents: 500,
    earlyFailureBonusCutoff,
    claimantConflictSourceCutoff: roundCloseSourceCutoff,
  };
  const claim = failureBonusClaim();

  const preliminary = selectMpgfCrecPreliminaryFailureBonusMutationClaims([claim], context);
  assert.equal(preliminary.eligible, true);
  assert.deepEqual(preliminary.claimIds, ["failure-claim-1"]);

  const final = selectMpgfCrecFinalFailureBonusPayoutClaims([claim], context);
  assert.equal(final.eligible, true);
  assert.deepEqual(final.claimIds, ["failure-claim-1"]);

  const pendingFinal = selectMpgfCrecFinalFailureBonusPayoutClaims(
    [failureBonusClaim({ claimState: "pending" })],
    context,
  );
  assert.equal(pendingFinal.eligible, false);
  assert.ok(pendingFinal.blockers.includes("failure_bonus_claim_0_not_unsettled_approved"));

  const paidPreliminary = selectMpgfCrecPreliminaryFailureBonusMutationClaims(
    [failureBonusClaim({ claimState: "paid" })],
    context,
  );
  assert.equal(paidPreliminary.eligible, false);
  assert.ok(paidPreliminary.blockers.includes("failure_bonus_claim_0_not_unsettled_non_terminal"));

  const settled = selectMpgfCrecFinalFailureBonusPayoutClaims(
    [failureBonusClaim({ payoutRef: "payout-1" })],
    context,
  );
  assert.equal(settled.eligible, false);
  assert.ok(settled.blockers.includes("failure_bonus_claim_0_payout_ref_present"));

  const malformedCreatedAt = selectMpgfCrecFinalFailureBonusPayoutClaims(
    [failureBonusClaim({ createdAt: "2026-05-14" })],
    context,
  );
  assert.equal(malformedCreatedAt.eligible, false);
  assert.ok(malformedCreatedAt.blockers.includes("failure_bonus_claim_0_created_at_invalid"));

  const latePaymentConfirmation = selectMpgfCrecFinalFailureBonusPayoutClaims(
    [failureBonusClaim({ paymentMethodConfirmedAt: "2026-05-08T00:01:00.000Z" })],
    context,
  );
  assert.equal(latePaymentConfirmation.eligible, false);
  assert.ok(latePaymentConfirmation.blockers.includes("failure_bonus_claim_0_payment_method_confirmed_after_cutoff"));

  const staleHash = selectMpgfCrecFinalFailureBonusPayoutClaims(
    [failureBonusClaim({ eligibilityInputsHash: h("stale-claim-context") })],
    context,
  );
  assert.equal(staleHash.eligible, false);
  assert.ok(staleHash.blockers.includes("failure_bonus_claim_0_eligibility_inputs_hash_mismatch"));

  const externalMismatch = selectMpgfCrecFinalFailureBonusPayoutClaims([claim], {
    ...context,
    externalFailedQualifiedMatchEligibleCentsByClaimId: {
      "failure-claim-1": 999,
    },
  });
  assert.equal(externalMismatch.eligible, false);
  assert.ok(externalMismatch.blockers.includes("failure_bonus_claim_0_external_failed_qualified_cents_mismatch"));

  const closedRound = selectMpgfCrecFinalFailureBonusPayoutClaims([claim], {
    ...context,
    roundStatus: "closed",
  });
  assert.equal(closedRound.eligible, false);
  assert.ok(closedRound.blockers.includes("round_status_not_payable_for_side_effect"));

  const unbacked = selectMpgfCrecFinalFailureBonusPayoutClaims([claim], {
    ...context,
    backedFailureBonusPoolCents: 0,
  });
  assert.equal(unbacked.eligible, false);
  assert.ok(unbacked.blockers.includes("failure_bonus_backed_pool_not_positive_for_mutation"));
});

test("CRECM v1.125 failure-bonus claim creation initializes defaults and is idempotent by claim key", () => {
  const created = createMpgfCrecFailureBonusClaim(failureBonusClaimCreationInput());

  assert.equal(created.eligible, true);
  assert.equal(created.action, "create");
  assert.equal(created.idempotencyKey, `${roundId}:${projectId}:${participantId}:${conditionalTradeIntentId}`);
  if (!created.claim) {
    throw new Error("Expected a created failure-bonus claim.");
  }

  assert.equal(created.claim.claimState, "approved");
  assert.equal(created.claim.denialReason, null);
  assert.equal(created.claim.payoutRef, null);
  assert.equal(created.claim.resolvedAt, null);
  assert.equal(created.claim.rawBonusCents, 0);
  assert.equal(created.claim.participantRoundCapCents, 0);
  assert.equal(created.claim.participantCappedProvisionalBonusCents, 0);
  assert.equal(created.claim.bonusCents, 0);
  assert.equal(created.claim.finalFailureBonusCents, 0);
  assert.equal(created.claim.prorationFactorBps, 10_000);
  assert.equal(
    created.claim.eligibilityInputsHash,
    buildMpgfCrecFailureBonusClaimAuditContextHash(created.claim),
  );

  const replay = createMpgfCrecFailureBonusClaim(
    failureBonusClaimCreationInput({ existingClaims: [created.claim] }),
  );
  assert.equal(replay.eligible, true);
  assert.equal(replay.action, "noop_replay");
  assert.equal(replay.claim, created.claim);

  const mismatch = createMpgfCrecFailureBonusClaim(
    failureBonusClaimCreationInput({
      existingClaims: [created.claim],
      clearingInputBundleHash: h("different-clearing-bundle"),
    }),
  );
  assert.equal(mismatch.eligible, false);
  assert.equal(mismatch.action, "manual_review");
  assert.ok(mismatch.blockers.includes("failure_bonus_claim_idempotency_context_mismatch"));

  const intakeOnly = createMpgfCrecFailureBonusClaim(
    failureBonusClaimCreationInput({
      id: "failure-claim-intake-1",
      creationMode: "intake_only_review",
      failureBonusEligibilityQualified: false,
    }),
  );
  assert.equal(intakeOnly.eligible, true);
  assert.equal(intakeOnly.action, "create");
  assert.equal(intakeOnly.claim?.claimState, "pending");

  const unqualifiedPayoutPath = createMpgfCrecFailureBonusClaim(
    failureBonusClaimCreationInput({ failureBonusEligibilityQualified: false }),
  );
  assert.equal(unqualifiedPayoutPath.eligible, false);
  assert.ok(unqualifiedPayoutPath.blockers.includes("failure_bonus_claim_creation_not_fully_qualified"));

  const nonPayable = createMpgfCrecFailureBonusClaim(
    failureBonusClaimCreationInput({ roundStatus: "closed" }),
  );
  assert.equal(nonPayable.eligible, false);
  assert.ok(nonPayable.blockers.includes("round_status_not_payable_for_side_effect"));

  const duplicate = createMpgfCrecFailureBonusClaim(
    failureBonusClaimCreationInput({ existingClaims: [created.claim, created.claim] }),
  );
  assert.equal(duplicate.eligible, false);
  assert.ok(duplicate.blockers.includes("failure_bonus_claim_duplicate_same_key"));
});

test("CRECM v1.125 failure-bonus settlement advances only approved unsettled payable claims", () => {
  const context = {
    roundId,
    failureBonusPolicyVersion: "failure-bonus-v1",
    roundStatus: "payable",
    backedFailureBonusPoolCents: 500,
    earlyFailureBonusCutoff,
    claimantConflictSourceCutoff: roundCloseSourceCutoff,
  };
  const claim = failureBonusClaim();

  const paid = settleMpgfCrecFailureBonusClaim({
    claim,
    context,
    settlementState: "paid",
    payoutRef: "stripe-payout-1",
    resolvedAt: "2026-05-15T00:00:00.000Z",
  });
  assert.equal(paid.eligible, true);
  assert.equal(paid.claim?.claimState, "paid");
  assert.equal(paid.claim?.payoutRef, "stripe-payout-1");
  assert.equal(paid.claim?.resolvedAt, "2026-05-15T00:00:00.000Z");

  const credited = settleMpgfCrecFailureBonusClaim({
    claim,
    context,
    settlementState: "credited",
    payoutRef: "platform-credit-1",
    resolvedAt: "2026-05-15T00:00:00.000Z",
  });
  assert.equal(credited.eligible, true);
  assert.equal(credited.claim?.claimState, "credited");

  const paidAgain = settleMpgfCrecFailureBonusClaim({
    claim: failureBonusClaim({
      claimState: "paid",
      payoutRef: "stripe-payout-1",
      resolvedAt: "2026-05-15T00:00:00.000Z",
    }),
    context,
    settlementState: "paid",
    payoutRef: "stripe-payout-2",
    resolvedAt: "2026-05-16T00:00:00.000Z",
  });
  assert.equal(paidAgain.eligible, false);
  assert.ok(paidAgain.blockers.includes("failure_bonus_claim_0_not_unsettled_approved"));
  assert.ok(paidAgain.blockers.includes("failure_bonus_claim_0_payout_ref_present"));

  const invalidSettlementEvidence = settleMpgfCrecFailureBonusClaim({
    claim,
    context,
    settlementState: "paid",
    payoutRef: " payout-1 ",
    resolvedAt: "2026-05-15",
  });
  assert.equal(invalidSettlementEvidence.eligible, false);
  assert.ok(invalidSettlementEvidence.blockers.includes("failure_bonus_claim_settlement_payout_ref_invalid"));
  assert.ok(invalidSettlementEvidence.blockers.includes("failure_bonus_claim_settlement_resolved_at_invalid"));

  const closedRound = settleMpgfCrecFailureBonusClaim({
    claim,
    context: {
      ...context,
      roundStatus: "closed",
    },
    settlementState: "paid",
    payoutRef: "stripe-payout-1",
    resolvedAt: "2026-05-15T00:00:00.000Z",
  });
  assert.equal(closedRound.eligible, false);
  assert.ok(closedRound.blockers.includes("round_status_not_payable_for_side_effect"));
});

test("CRECM v1.125 rulebook summary names the executable contract predicates", () => {
  const summary = buildMpgfCrecV1125ClearingContractSummary();

  assert.equal(summary.policy, "crecm_v1_125_fail_closed_round_close_clearing_contract");
  assert.equal(summary.roundMetadataGate.canonicalUtcTimestampsRequired, true);
  assert.equal(summary.roundMetadataGate.parameterFreezeNoLaterThanOpen, true);
  assert.equal(
    summary.roundMetadataGate.orderedLifecycleRequired,
    "parametersFrozenAt<=opensAt<=earlyFailureBonusCutoff<=reviewFreezeAt<closesAt<challengeDeadline",
  );
  assert.equal(summary.roundMetadataGate.rulebookHashMustBeCanonical, true);
  assert.equal(summary.roundMetadataGate.sponsorPoolSourceHashMustBeCanonical, true);
  assert.equal(summary.roundMetadataGate.paymentReconciliationPathHashMustBeCanonical, true);
  assert.equal(summary.roundMetadataGate.locksClearingMatchingAuthorizationAndFailureBonusWhenInvalid, true);
  assert.equal(summary.paymentCommitmentSnapshots.exactCutoffBindingRequired, true);
  assert.equal(summary.roundClearingInputBundle.bundleHashBindsSelectedBundleId, true);
  assert.equal(summary.deploymentAudits.priorOutcomeMustBePassed, true);
  assert.equal(summary.deploymentAudits.priorEvidenceArraysMustBeEqualLength, true);
  assert.equal(summary.deploymentAudits.selectedAuditCreatedNoLaterThanParameterFreeze, true);
  assert.equal(summary.deploymentAudits.fullDeploymentRequiresSamePathCappedPilotPrior, true);
  assert.equal(summary.deploymentAudits.auditHashBindsCurrentPaymentReconciliationPath, true);
  assert.equal(summary.deploymentAudits.cappedPilotExposureUsesFrozenCapsAndRemainingMaps, true);
  assert.equal(summary.deploymentAudits.remainingExposureMapsCannotRaiseFrozenPilotCaps, true);
  assert.equal(summary.deploymentAudits.shadowBindingExposureCentsAlwaysZero, true);
  assert.equal(summary.deploymentAudits.shadowPreviewExposureCentsCanSimulateRequestedGross, true);
  assert.equal(summary.feeQuotes.feePolicyHashBoundQuoteHashRequired, true);
  assert.equal(summary.feeQuotes.sponsorPaidFeeSupportRequiresEligibleRoundCloseBundle, true);
  assert.equal(summary.projectRoundEligibilitySnapshots.sourceCutoffEqualsRoundOpen, true);
  assert.equal(summary.projectHardGates.bindingModesRequireApprovedBaselineIntegrity, true);
  assert.equal(summary.projectHardGates.bindingModesRequireApprovedBaselineConfidence, true);
  assert.equal(summary.projectHardGates.bindingModesRequireApprovedActionEvidence, true);
  assert.equal(
    summary.projectHardGates.shadowModeAllowsProvisionalBaselineAndActionEvidenceOnlyAsNonBindingLearning,
    true,
  );
  assert.equal(summary.projectHardGates.failureBonusEligibilityRequiresProjectHardGateHash, true);
  assert.deepEqual(summary.projectIdentityRouteGate.validGoodTypes, ["consensus", "hybrid"]);
  assert.deepEqual(summary.projectIdentityRouteGate.validDestinationTypes, [
    "registered_nonprofit",
    "fiscal_host",
    "signed_auditable_route",
  ]);
  assert.equal(summary.projectIdentityRouteGate.bundleDerivedProjectRowMustBeRoundBound, true);
  assert.equal(summary.projectIdentityRouteGate.destinationRefMustBeNonEmptyTrimStable, true);
  assert.equal(summary.projectIdentityRouteGate.bucketMustAppearInFrozenMoralBucketSnapshot, true);
  assert.equal(summary.projectIdentityRouteGate.usesFullMoralBucketSnapshotPredicate, true);
  assert.equal(summary.projectIdentityRouteGate.looseBucketMembershipCannotClear, true);
  assert.equal(
    summary.projectIdentityRouteGate.invalidFieldsBlockClearingMatchingAuthorizationPayoutAndFailureBonus,
    true,
  );
  assert.equal(summary.moralBucketSnapshot.liveBucketDistinctnessReadsAllowed, false);
  assert.equal(summary.sponsorBacking.filteredByRoundAndPoolType, true);
  assert.equal(summary.authorizationReconciliation.eventHashBindsRemovedRowIdentityAndAmounts, true);
  assert.equal(summary.optimizationRunTrace.selectedAllocationRowsHashRequired, true);
  assert.equal(summary.roundAuditBundles.auditBundleHashBindsComponentHashesAndTrace, true);
  assert.equal(summary.roundAuditBundles.optimizationTraceIdRequired, true);
  assert.ok(summary.roundAuditBundles.requiredDirectComponentHashes.includes("feePolicyHash"));
  assert.ok(summary.roundAuditBundles.requiredDirectComponentHashes.includes("bonusScoreHash"));
  assert.equal(summary.bonusScoreUnits.fixedPointPrecision, 12);
  assert.equal(summary.bonusScoreUnits.roundingMode, "half_even");
  assert.equal(summary.bonusScoreUnits.canonicalNonNegativeIntegerStringsRequired, true);
  assert.equal(summary.bonusScoreUnits.allocationUsesExactBigIntProration, true);
  assert.equal(summary.bonusScoreUnits.floatingQfAdjustedMayNotDeterminePayoutCents, true);
  assert.equal(summary.roundCloseBundleRowUniqueness.formulaLevelGuardsRequired, true);
  assert.deepEqual(summary.roundCloseBundleRowUniqueness.commonGroundBudgetKeys, [
    "(roundId,id)",
    "(roundId,participantId)",
  ]);
  assert.equal(
    summary.roundCloseBundleRowUniqueness.paymentSnapshotKey,
    "(roundId,commonGroundBudgetId,snapshotKind)",
  );
  assert.equal(summary.roundCloseBundleRowUniqueness.failureBonusEligibilityRequiresRowUniquenessHash, true);
  assert.equal(summary.commonGroundBudgetInputGating.missingRowsFailClosedWithoutDereference, true);
  assert.equal(summary.commonGroundBudgetInputGating.rowCountsRequiredByIdAndParticipant, true);
  assert.equal(summary.commonGroundBudgetInputGating.invalidCapsAllocateZero, true);
  assert.equal(summary.commonGroundBudgetInputGating.invalidBudgetPeriodAllocatesZero, true);
  assert.equal(summary.commonGroundBudgetInputGating.invalidFallbackRuleAllocatesZero, true);
  assert.equal(summary.commonGroundBudgetInputGating.paymentSnapshotLookupRequiresEligibleBudget, true);
  assert.equal(summary.supportStanceInputGating.missingOrInvalidDefaultsToAbstain, true);
  assert.equal(summary.supportStanceInputGating.wrongRowsExposeZeroCapsAndNoCounterpartyBuckets, true);
  assert.equal(summary.supportStanceInputGating.malformedCounterpartyBucketsTreatedAsEmpty, true);
  assert.equal(summary.supportStanceInputGating.invalidCapsAllocateZero, true);
  assert.equal(summary.supportStanceInputGating.minCounterpartyVolumeMirrorAuthoritative, false);
  assert.equal(summary.plainLanguageGuidedMode.presentationLayerOnly, true);
  assert.deepEqual(summary.plainLanguageGuidedMode.allowedPlainLabels, [
    "Fund this",
    "Fund if different-view support joins",
    "Needs review",
    "Skip",
  ]);
  assert.deepEqual(summary.plainLanguageGuidedMode.canonicalStanceByPlainLabel, {
    "Fund this": "strong",
    "Fund if different-view support joins": "weak",
    "Needs review": "dissent",
    Skip: "abstain",
  });
  assert.deepEqual(summary.plainLanguageGuidedMode.plainLabelByCanonicalStance, {
    strong: "Fund this",
    weak: "Fund if different-view support joins",
    dissent: "Needs review",
    abstain: "Skip",
  });
  assert.equal(summary.plainLanguageGuidedMode.plainLabelsCannotIntroduceNewStates, true);
  assert.equal(summary.plainLanguageGuidedMode.exactLabelsRequiredNoTrimOrAlias, true);
  assert.deepEqual(summary.plainLanguageGuidedMode.allocatableCanonicalStances, ["strong", "weak"]);
  assert.deepEqual(summary.plainLanguageGuidedMode.zeroAllocationCanonicalStances, [
    "dissent",
    "abstain",
  ]);
  assert.equal(summary.plainLanguageGuidedMode.explicitSaveRequiredBeforeAllocation, true);
  assert.equal(summary.plainLanguageGuidedMode.finalReviewMustExposeCanonicalMeaning, true);
  assert.equal(summary.plainLanguageGuidedMode.advancedAndPlainModesShareCanonicalProjectSupportStanceRecords, true);
  assert.equal(summary.plainLanguageGuidedMode.uiBrowsingCalculatorOrSuggestionCannotInferAllocatableStance, true);
  assert.equal(summary.conditionalIntentInputGating.missingInactiveOrWrongRowsAllocateZero, true);
  assert.equal(summary.conditionalIntentInputGating.amountAndMaxExposureMustBePositive, true);
  assert.equal(summary.conditionalIntentInputGating.minCounterpartyVolumeMustBePositive, true);
  assert.equal(summary.conditionalIntentInputGating.malformedCounterpartyBucketsTreatedAsEmpty, true);
  assert.equal(
    summary.conditionalIntentInputGating.capturedReleasedFailedOrMalformedAuthorizationStatesAllocateZero,
    true,
  );
  assert.equal(summary.conditionalIntentInputGating.fallbackRuleMustBeValidAndMatchBudget, true);
  assert.equal(
    summary.counterpartyVolumeSatisfaction.thresholdSource,
    "ConditionalTradeIntent.minCounterpartyVolumeCents",
  );
  assert.equal(
    summary.counterpartyVolumeSatisfaction.validatesFrozenReciprocalDistinctBucketIntersection,
    true,
  );
  assert.equal(summary.counterpartyVolumeSatisfaction.sameBucketRowsNeverCount, true);
  assert.equal(
    summary.counterpartyVolumeSatisfaction.countsOnlyNetRecipientDisbursedMatchEligiblePublicGoodCredit,
    true,
  );
  assert.equal(
    summary.counterpartyVolumeSatisfaction.excludesSponsorPlatformFeeRewardCreditCertificateRows,
    true,
  );
  assert.equal(
    summary.counterpartyVolumeSatisfaction.excludesSelfLinkedAccountSamePaymentClusterAndSameControlRows,
    true,
  );
  assert.equal(
    summary.counterpartyVolumeSatisfaction.requiresCounterpartyHumanVerifiedSybilClearCollusionClear,
    true,
  );
  assert.equal(summary.counterpartyVolumeSatisfaction.malformedRowsDoNotCount, true);
  assert.equal(summary.allocatorStateInputGating.participantRemainingBudgetKey, "(roundId,participantId)");
  assert.equal(summary.allocatorStateInputGating.projectRemainingCapKey, "(roundId,projectId)");
  assert.equal(summary.allocatorStateInputGating.wrongRoundRowsResolveToZero, true);
  assert.equal(summary.allocatorStateInputGating.malformedValuesAllocateZero, true);
  assert.equal(summary.allocatorStateInputGating.actualAllocationUsesRoundKeyedState, true);
  assert.equal(summary.identityEligibilityInputGating.missingRowsResolveToZeroWeight, true);
  assert.equal(summary.identityEligibilityInputGating.malformedWeightResolvesToZero, true);
  assert.equal(summary.identityEligibilityInputGating.requiresHumanVerifiedSybilClearCollusionClear, true);
  assert.equal(
    summary.identityEligibilityInputGating.nonClearRowsCannotCountMatchCounterpartyOrQualifyFailureBonus,
    true,
  );
  assert.equal(summary.economicInputGating.roundSponsorBudgetsInvalidFieldsResolveToZero, true);
  assert.equal(summary.economicInputGating.roundSponsorBudgetsNeverProduceNegativeAvailability, true);
  assert.equal(summary.economicInputGating.totalSponsorPayoutAvailabilityUsesExactBigInt, true);
  assert.equal(summary.economicInputGating.projectEconomicTermsRequireRoundBoundUniqueProjectRow, true);
  assert.equal(summary.economicInputGating.projectEconomicTermsMalformedBlockClearing, true);
  assert.equal(summary.economicInputGating.invalidProjectThresholdCountsCannotLowerRequirements, true);
  assert.equal(summary.economicInputGating.projectMatchBpsRange, "[0,100000]");
  assert.equal(summary.economicInputGating.malformedProjectMatchBpsResolveToZeroForAffectedMatch, true);
  assert.equal(summary.failClosedHelpers.minReturnsZeroOnMalformedInputs, true);
  assert.equal(summary.failClosedHelpers.payoutRelevantMinUsesHelper, true);
  assert.equal(summary.failClosedHelpers.intersectionReturnsEmptyOnMalformedInputs, true);
  assert.equal(summary.failClosedHelpers.sumBigIntReturnsZeroOnMalformedInputs, true);
  assert.equal(summary.failClosedHelpers.aggregateSumsUseExactBigIntHelper, true);
  assert.equal(summary.netPublicGoodSupporterBreadth.defaultSupporterCountMinNetPublicGoodCents, 100);
  assert.equal(summary.netPublicGoodSupporterBreadth.malformedOrBelowDefaultFloorResolvesToDefault, true);
  assert.equal(summary.netPublicGoodSupporterBreadth.usesNetRecipientDisbursedPublicGoodCreditOnly, true);
  assert.equal(summary.netPublicGoodSupporterBreadth.rowsBelowFloorCannotCountAsVerifiedSupporters, true);
  assert.equal(summary.netPublicGoodSupporterBreadth.requiresHumanVerifiedSybilClearCollusionClearRows, true);
  assert.ok(summary.contributorBenefits.supportedKinds.includes("success_reward"));
  assert.equal(summary.contributorBenefits.requireCapturedSuccessfulContributionRow, true);
  assert.equal(summary.contributorBenefits.neverCountAsPublicGoodDollarsOrAllocationPower, true);
  assert.equal(summary.contributorBenefits.successRewardsUseOnlyBackedSuccessRewardPool, true);
  assert.equal(summary.contributorBenefits.coordinationCreditsNonTransferable, true);
  assert.equal(summary.contributorBenefits.impactCertificatesBindContributionBundlePaymentAndFeeContext, true);
  assert.ok(summary.failureBonus.thresholdFamilyFailureReasonsOnly.includes("counterparty_volume_shortfall"));
  assert.equal(summary.failureBonus.claimantConflictSnapshotBindsExactPayoutContext, true);
  assert.equal(summary.failureBonus.claimantConflictSnapshotIdStoredOnClaims, true);
  assert.equal(summary.failureBonus.claimCreationInitializesUnsettledDefaults, true);
  assert.equal(summary.failureBonus.claimCreationMismatchesFailClosedToManualReview, true);
  assert.equal(summary.failureBonus.finalPayoutListsRequireApprovedUnsettledClaims, true);
  assert.equal(summary.failureBonus.preliminaryMutationListsRejectTerminalOrSettledClaims, true);
  assert.equal(summary.failureBonus.successfulSettlementAdvancesClaimStateToPaidOrCredited, true);
  assert.match(summary.calcHash, /^sha256:[0-9a-f]{64}$/);
});
