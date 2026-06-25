import assert from "node:assert/strict";
import test from "node:test";

import { GET as behavioralMicroPledgeContractRoute } from "@/app/api/moral-trade/behavioral-micro-pledges/contract/route";

import {
  evaluateMoralTradeBehavioralMicroPledges,
  getMoralTradeBehavioralMicroPledgeContract,
  validateMoralTradeBehavioralMicroPledgeContract,
  type MoralTradeBehavioralMicroPledgeEvaluationInput,
  type MoralTradeBehavioralMicroPledgeUnitRecord,
} from "./behavioral-micro-pledges";

const CHECKED_AT = "2026-06-25T12:00:00.000Z";

function passingUnit(
  overrides: Partial<MoralTradeBehavioralMicroPledgeUnitRecord> = {},
): MoralTradeBehavioralMicroPledgeUnitRecord {
  return {
    additionalityReviewState: "non_blocking",
    adequateSubstitutePlanRef: "substitute:balanced-meal:v1",
    behaviorKind: "food_abstention",
    coveredFoodDefinition: "One named covered-food category selected before lock.",
    coveredWindowEndAt: "2026-07-02T13:00:00.000Z",
    coveredWindowStartAt: "2026-07-02T12:00:00.000Z",
    createdAt: CHECKED_AT,
    defaultTemplate: true,
    evidenceEscalationTriggers: ["counterparty_challenge", "cap_exception"],
    evidenceLadder: [
      {
        evidenceBurden: "low",
        label: "Self-attestation after the meal window",
        privacyBurden: "low",
        requiredBeforeCompletion: true,
        step: "self_attestation",
      },
      {
        evidenceBurden: "medium",
        label: "Lightweight corroboration only after a challenge",
        privacyBurden: "medium",
        requiredBeforeCompletion: false,
        step: "lightweight_corroboration",
      },
    ],
    healthSafetyBoundary: {
      autonomyPolicyRef: "policy:food-abstention-autonomy:v1",
      bodyImageBlocked: true,
      calorieRestrictionBlocked: true,
      eatingDisorderAdjacentBlocked: true,
      fastingBlocked: true,
      healthSafetyPolicyRef: "policy:food-abstention-health-safety:v1",
      highBurdenVariantBlocked: true,
      medicalDietBlocked: true,
      minorDependencyCoercionBlocked: true,
      reviewState: "non_blocking",
      weightLossBlocked: true,
    },
    leastIntrusiveEvidencePlanRef: "evidence-plan:self-attestation-first:v1",
    lockedAt: "2026-07-02T11:30:00.000Z",
    manualReviewExceptionRef: null,
    matchedTradeLockProposalRef: "matched-lock:micro-pledge-demo",
    noTradeBaselineRef: "baseline:unit-demo",
    perUnitCapCents: 500,
    performanceBondCapCents: null,
    personalCashManualReviewRequired: true,
    pledgeSwapOfferId: "pledge-swap:micro-demo",
    previewDisclosures: [
      "unit_granularity",
      "duration",
      "covered_food_or_action",
      "adequate_substitute",
      "no_trade_baseline",
      "additionality_review",
      "evidence_ladder",
      "per_unit_cap",
      "sequence_cap",
      "settlement_mode",
      "failed_unit_effect",
      "renewed_confirmation",
      "no_auto_rollover",
      "health_safety_boundary",
      "privacy_burden",
    ],
    recordId: "micro-pledge-unit:pass",
    retroactiveClaimRouting: "manual_review_or_personal_bookkeeping",
    reviewerDecisionRef: "review:micro-unit",
    sequenceCaps: {
      capExceedanceRoutesToManualReview: true,
      cumulativeUnitCap: 4,
      evidenceBurdenCap: "medium",
      extensionRequiresRenewedConfirmation: true,
      noAutoRenewal: true,
      privacyBurdenCap: "medium",
      rollingWindowDays: 4,
      sequenceCapCents: 2000,
      sequenceId: "micro-sequence:demo",
    },
    serverTimeAuthorityRef: "time-authority:server:v1",
    settlementDisclosure: {
      disclosedBeforeFinalConfirmation: true,
      evidenceCheckpointRefs: ["checkpoint:self-attestation"],
      failedUnitEffect: "A failed unit cancels that unit and does not auto-extend.",
      releaseCancellationRule:
        "Future units may be cancelled before lock without public blame.",
      renewedConfirmationRequired: true,
      settlementMode: "per_unit",
    },
    unitGranularity: "one_meal",
    unitState: "locked",
    updatedAt: CHECKED_AT,
    ...overrides,
  };
}

function passingInput(
  overrides: Partial<MoralTradeBehavioralMicroPledgeEvaluationInput> = {},
): MoralTradeBehavioralMicroPledgeEvaluationInput {
  return {
    checkedAt: CHECKED_AT,
    microPledgeRequired: true,
    transition: "matched_trade_lock",
    units: [passingUnit()],
    ...overrides,
  };
}

test("moraltrade82 behavioral micro-pledge contract validates release-gate hooks", () => {
  const contract = getMoralTradeBehavioralMicroPledgeContract();
  const validation = validateMoralTradeBehavioralMicroPledgeContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.deepEqual(contract.defaultUnitGranularities, [
    "one_meal",
    "few_meals",
    "one_day",
    "few_days",
  ]);
  assert.ok(contract.manualReviewOnlyGranularities.includes("thirty_days"));
  assert.ok(contract.manualReviewOnlyGranularities.includes("month_long"));
  assert.ok(contract.releaseGateTestHooks.includes("micro_pledge_preperformance_lock_test"));
  assert.ok(
    contract.releaseGateTestHooks.includes(
      "food_abstention_health_safety_boundary_test",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_behavioral_micro_pledge_units",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_food_abstention_health_safety_reviews",
    ),
  );
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "blocked"));
});

test("future locked one-meal micro-pledge passes matched-trade lock", () => {
  const result = evaluateMoralTradeBehavioralMicroPledges(passingInput());

  assert.equal(result.status, "pass");
  assert.equal(result.unitCount, 1);
  assert.equal(result.nonBlockingUnitCount, 1);
  assert.equal(result.prePerformanceLockedUnitCount, 1);
  assert.equal(result.defaultSafeUnitCount, 1);
  assert.deepEqual(result.blockers, []);
});

test("long-duration default, retroactive lock, missing baseline, unsafe health, and cap regressions block completion", () => {
  const result = evaluateMoralTradeBehavioralMicroPledges(
    passingInput({
      transition: "completion_count",
      units: [
        passingUnit({
          additionalityReviewState: "under_review",
          adequateSubstitutePlanRef: null,
          healthSafetyBoundary: {
            ...passingUnit().healthSafetyBoundary!,
            fastingBlocked: false,
            reviewState: "blocking",
          },
          lockedAt: "2026-07-02T12:30:00.000Z",
          noTradeBaselineRef: null,
          perUnitCapCents: 5000,
          previewDisclosures: ["unit_granularity"],
          retroactiveClaimRouting: "completed_moral_trade",
          sequenceCaps: {
            ...passingUnit().sequenceCaps,
            noAutoRenewal: false,
            rollingWindowDays: 30,
            sequenceCapCents: 50000,
          },
          settlementDisclosure: {
            ...passingUnit().settlementDisclosure,
            disclosedBeforeFinalConfirmation: false,
            evidenceCheckpointRefs: [],
            renewedConfirmationRequired: false,
          },
          unitGranularity: "thirty_days",
          unitState: "active",
        }),
      ],
    }),
  );

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("micro_pledge_long_duration_default_template:micro-pledge-unit:pass:thirty_days"));
  assert.ok(result.blockers.includes("micro_pledge_long_duration_manual_review_missing:micro-pledge-unit:pass:thirty_days"));
  assert.ok(result.blockers.includes("micro_pledge_preperformance_lock_late:micro-pledge-unit:pass"));
  assert.ok(result.blockers.includes("micro_pledge_retroactive_claim_can_complete_trade:micro-pledge-unit:pass"));
  assert.ok(result.blockers.includes("micro_pledge_unit_not_completion_ready:micro-pledge-unit:pass:active"));
  assert.ok(result.blockers.includes("micro_pledge_unit_baseline_missing:micro-pledge-unit:pass"));
  assert.ok(result.blockers.includes("micro_pledge_unit_additionality_not_non_blocking:micro-pledge-unit:pass:under_review"));
  assert.ok(result.blockers.includes("micro_pledge_adequate_substitute_plan_missing:micro-pledge-unit:pass"));
  assert.ok(result.blockers.includes("micro_pledge_per_unit_cap_exceeded:micro-pledge-unit:pass"));
  assert.ok(result.blockers.includes("micro_pledge_sequence_cap_exceeded:micro-pledge-unit:pass"));
  assert.ok(result.blockers.includes("micro_pledge_rolling_window_cap_exceeded:micro-pledge-unit:pass"));
  assert.ok(result.blockers.includes("micro_pledge_auto_renewal_allowed:micro-pledge-unit:pass"));
  assert.ok(result.blockers.includes("micro_pledge_health_safety_review_blocking:micro-pledge-unit:pass:blocking"));
  assert.ok(result.blockers.includes("micro_pledge_fasting_variant_not_blocked:micro-pledge-unit:pass"));
  assert.ok(result.blockers.includes("micro_pledge_evidence_checkpoints_missing:micro-pledge-unit:pass"));
  assert.ok(result.blockers.includes("micro_pledge_settlement_renewed_confirmation_missing:micro-pledge-unit:pass"));
  assert.ok(result.blockers.includes("micro_pledge_settlement_not_disclosed_before_confirmation:micro-pledge-unit:pass"));
  assert.ok(result.blockers.includes("micro_pledge_preview_disclosures_missing:micro-pledge-unit:pass"));
});

test("behavioral micro-pledge contract route exposes safe public metadata", async () => {
  const response = await behavioralMicroPledgeContractRoute(
    new Request("http://localhost/api/moral-trade/behavioral-micro-pledges/contract"),
  );
  const body = await response.json();
  const serialized = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(body.publicContract.defaultUnitGranularities.includes("one_meal"));
  assert.ok(body.publicContract.manualReviewOnlyGranularities.includes("thirty_days"));
  assert.ok(
    body.publicContract.releaseGateTestHooks.includes(
      "micro_pledge_preperformance_lock_test",
    ),
  );
  assert.ok(
    body.publicContract.firstClassRecordTables.includes(
      "moral_trade_behavioral_micro_pledge_units",
    ),
  );
  assert.equal(body.publicContract.sampleEvaluationStatuses.matched_trade_lock.status, "pass");
  assert.equal(body.publicContract.sampleEvaluationStatuses.completion_count.status, "blocked");
  assert.equal(serialized.includes("raw_evidence"), false);
  assert.equal(serialized.includes("private_counterparty"), false);
  assert.equal(serialized.includes("reviewer_notes"), false);
});
