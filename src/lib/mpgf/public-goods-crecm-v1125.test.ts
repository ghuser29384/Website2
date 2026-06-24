import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMpgfCrecContributorBenefitContextHash,
  buildMpgfCrecCoordinationCreditLedgerEntryHash,
  buildMpgfCrecFailureBonusEligibilityInputsHash,
  buildMpgfCrecAuthorizationReconciliationEventHash,
  buildMpgfCrecFeeQuoteHash,
  buildMpgfCrecImpactCertificateClaimHash,
  buildMpgfCrecOptimizationRunTraceHash,
  buildMpgfCrecPaymentCommitmentSnapshotHash,
  buildMpgfCrecProjectRoundEligibilitySnapshotHash,
  buildMpgfCrecRoundClearingInputBundleHash,
  buildMpgfCrecRoundMoralBucketSnapshotHash,
  buildMpgfCrecSuccessRewardClaimHash,
  buildMpgfCrecV1125ClearingContractSummary,
  evaluateMpgfCrecContributorBenefitEligibility,
  evaluateMpgfCrecFailureBonusEligibility,
  evaluateMpgfCrecSuccessRewardClaim,
  hashMpgfCrecV1125Value,
  sumMpgfCrecSponsorBackedCentsForFinalClearing,
  sumSelectedMpgfCrecSponsorPaidFeeSupportDemand,
  validateMpgfCrecAuthorizationReconciliationEvent,
  validateMpgfCrecCoordinationCreditLedgerEntry,
  validateMpgfCrecFeeQuote,
  validateMpgfCrecImpactCertificateClaim,
  validateMpgfCrecOptimizationRunTrace,
  validateMpgfCrecPaymentCommitmentSnapshot,
  validateMpgfCrecProjectRoundEligibilitySnapshot,
  validateMpgfCrecRoundClearingInputBundle,
  validateMpgfCrecRoundMoralBucketSnapshot,
  type MpgfCrecAuthorizationReconciliationEvent,
  type MpgfCrecContributorBenefitEligibilityInput,
  type MpgfCrecCoordinationCreditLedgerEntry,
  type MpgfCrecFailureBonusEligibilityInput,
  type MpgfCrecFeeQuote,
  type MpgfCrecImpactCertificateClaim,
  type MpgfCrecOptimizationRunTrace,
  type MpgfCrecPaymentCommitmentSnapshot,
  type MpgfCrecProjectRoundEligibilitySnapshot,
  type MpgfCrecRoundClearingInputBundle,
  type MpgfCrecRoundMoralBucketSnapshot,
  type MpgfCrecSponsorCommitment,
  type MpgfCrecSuccessRewardClaimInput,
} from "./public-goods-crecm-v1125";

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
const createdAt = "2026-04-30T19:00:00.000Z";

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

function failureBonusInput(
  overrides: Partial<MpgfCrecFailureBonusEligibilityInput> = {},
): MpgfCrecFailureBonusEligibilityInput {
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
    paymentSnapshotEligible: true,
    paymentCommitmentSnapshotHash: paymentSnapshot({ snapshotKind: "early_failure_bonus_cutoff", asOf: earlyFailureBonusCutoff }).snapshotHash,
    failedQualifiedMatchEligibleCents: 1_000,
    participantRoundFailureBonusCapCents: 75,
    roundFailureBonusBudgetCents: 500,
    backedFailureBonusPoolCents: 500,
    totalSponsorBudgetCents: 10_000,
    claimantConflictState: "no_conflict",
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
    },
  );

  assert.equal(underBacked.eligible, false);
  assert.ok(underBacked.blockers.includes("fee_support_pool_underbacked"));
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

  const underBacked = evaluateMpgfCrecFailureBonusEligibility(
    failureBonusInput({ backedFailureBonusPoolCents: 499 }),
  );

  assert.equal(underBacked.qualified, false);
  assert.ok(underBacked.blockers.includes("failure_bonus_pool_not_fully_backed"));
});

test("CRECM v1.125 rulebook summary names the executable contract predicates", () => {
  const summary = buildMpgfCrecV1125ClearingContractSummary();

  assert.equal(summary.policy, "crecm_v1_125_fail_closed_round_close_clearing_contract");
  assert.equal(summary.paymentCommitmentSnapshots.exactCutoffBindingRequired, true);
  assert.equal(summary.roundClearingInputBundle.bundleHashBindsSelectedBundleId, true);
  assert.equal(summary.feeQuotes.feePolicyHashBoundQuoteHashRequired, true);
  assert.equal(summary.projectRoundEligibilitySnapshots.sourceCutoffEqualsRoundOpen, true);
  assert.equal(summary.moralBucketSnapshot.liveBucketDistinctnessReadsAllowed, false);
  assert.equal(summary.sponsorBacking.filteredByRoundAndPoolType, true);
  assert.equal(summary.authorizationReconciliation.eventHashBindsRemovedRowIdentityAndAmounts, true);
  assert.equal(summary.optimizationRunTrace.selectedAllocationRowsHashRequired, true);
  assert.ok(summary.contributorBenefits.supportedKinds.includes("success_reward"));
  assert.equal(summary.contributorBenefits.requireCapturedSuccessfulContributionRow, true);
  assert.equal(summary.contributorBenefits.neverCountAsPublicGoodDollarsOrAllocationPower, true);
  assert.equal(summary.contributorBenefits.successRewardsUseOnlyBackedSuccessRewardPool, true);
  assert.equal(summary.contributorBenefits.coordinationCreditsNonTransferable, true);
  assert.equal(summary.contributorBenefits.impactCertificatesBindContributionBundlePaymentAndFeeContext, true);
  assert.ok(summary.failureBonus.thresholdFamilyFailureReasonsOnly.includes("counterparty_volume_shortfall"));
  assert.match(summary.calcHash, /^sha256:[0-9a-f]{64}$/);
});
