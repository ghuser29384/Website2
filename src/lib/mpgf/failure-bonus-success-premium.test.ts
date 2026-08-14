import assert from "node:assert/strict";
import test from "node:test";

import {
  PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY,
  buildProvisionalFailureBonusSuccessPremiumAssumptions,
  calculateExperienceRatedSuccessPremiumBps,
  calculateSuccessPremiumCents,
  getHighestClearedThresholdIndex,
  getSuccessPremiumDueForClearedThreshold,
  quoteFailureBonusSuccessPremiumSchedule,
  usesCurrentProvisionalFailureBonusPricingPolicy,
} from "./failure-bonus-success-premium";

test("experience-rated success premium covers expected failure claims plus explicit loads", () => {
  const quote = calculateExperienceRatedSuccessPremiumBps({
    successProbabilityBps: 7_500,
    failureBonusRateBps: 1_000,
    expectedEligibleFailureFillBps: 4_000,
    expenseLoadBps: 25,
    reserveRiskMarginBps: 42,
  });

  assert.deepEqual(quote, {
    expectedClaimsRateBps: 134,
    expenseLoadBps: 25,
    reserveRiskMarginBps: 42,
    recommendedRateBps: 201,
  });
});


test("provisional underwriting assumptions are platform-owned and only the bonus rate varies", () => {
  const assumptions = buildProvisionalFailureBonusSuccessPremiumAssumptions(1_000);

  assert.deepEqual(assumptions, {
    ...PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY,
    failureBonusRateBps: 1_000,
  });
  assert.equal(usesCurrentProvisionalFailureBonusPricingPolicy(assumptions), true);
  assert.equal(
    usesCurrentProvisionalFailureBonusPricingPolicy({
      ...assumptions,
      successProbabilityBps: 9_900,
    }),
    false,
  );
});

test("premium math rounds up in integer cents", () => {
  assert.equal(calculateSuccessPremiumCents(1, 1), 1);
  assert.equal(calculateSuccessPremiumCents(1_000_000, 200), 20_000);
});

test("threshold premiums apply to incremental net-recipient tranches and stay outside the thresholds", () => {
  const schedule = quoteFailureBonusSuccessPremiumSchedule({
    premiumPayer: "pool_creator_or_sponsor",
    defaultPricing: {
      mode: "operator_override",
      premiumRateBps: 200,
      provisional: true,
      rationale: "Illustrative Labs rate pending Moral Trade portfolio data.",
    },
    thresholds: [
      { thresholdId: "threshold-1", thresholdIndex: 1, cumulativeNetRecipientThresholdCents: 1_000_000 },
      { thresholdId: "threshold-2", thresholdIndex: 2, cumulativeNetRecipientThresholdCents: 2_500_000 },
    ],
  });

  assert.deepEqual(
    schedule.thresholds.map((threshold) => ({
      incrementalNetRecipientCents: threshold.incrementalNetRecipientCents,
      successPremiumCents: threshold.successPremiumCents,
      cumulativeSuccessPremiumCents: threshold.cumulativeSuccessPremiumCents,
      grossSuccessRequirementCents: threshold.grossSuccessRequirementCents,
      premiumIncludedInNetRecipientThreshold: threshold.premiumIncludedInNetRecipientThreshold,
    })),
    [
      {
        incrementalNetRecipientCents: 1_000_000,
        successPremiumCents: 20_000,
        cumulativeSuccessPremiumCents: 20_000,
        grossSuccessRequirementCents: 1_020_000,
        premiumIncludedInNetRecipientThreshold: false,
      },
      {
        incrementalNetRecipientCents: 1_500_000,
        successPremiumCents: 30_000,
        cumulativeSuccessPremiumCents: 50_000,
        grossSuccessRequirementCents: 2_550_000,
        premiumIncludedInNetRecipientThreshold: false,
      },
    ],
  );
});

test("only cleared threshold tranches owe a success premium", () => {
  const schedule = quoteFailureBonusSuccessPremiumSchedule({
    premiumPayer: "pool_creator_or_sponsor",
    defaultPricing: {
      mode: "operator_override",
      premiumRateBps: 200,
      provisional: true,
      rationale: "Illustrative Labs rate pending Moral Trade portfolio data.",
    },
    thresholds: [
      { thresholdId: "threshold-1", thresholdIndex: 1, cumulativeNetRecipientThresholdCents: 1_000_000 },
      { thresholdId: "threshold-2", thresholdIndex: 2, cumulativeNetRecipientThresholdCents: 2_500_000 },
    ],
  });

  assert.deepEqual(getSuccessPremiumDueForClearedThreshold(schedule, 0), {
    clearedThresholdIndex: 0,
    netRecipientThresholdCents: 0,
    successPremiumCents: 0,
    grossSuccessRequirementCents: 0,
  });
  assert.deepEqual(getSuccessPremiumDueForClearedThreshold(schedule, 1), {
    clearedThresholdIndex: 1,
    netRecipientThresholdCents: 1_000_000,
    successPremiumCents: 20_000,
    grossSuccessRequirementCents: 1_020_000,
  });
});


test("highest cleared threshold is derived from net recipient funding without double-charging earlier tranches", () => {
  const schedule = quoteFailureBonusSuccessPremiumSchedule({
    premiumPayer: "pool_creator_or_sponsor",
    defaultPricing: {
      mode: "operator_override",
      premiumRateBps: 200,
      provisional: false,
      rationale: "Approved test schedule.",
    },
    thresholds: [
      {
        thresholdId: "threshold-1",
        thresholdIndex: 1,
        cumulativeNetRecipientThresholdCents: 1_500,
      },
      {
        thresholdId: "threshold-2",
        thresholdIndex: 2,
        cumulativeNetRecipientThresholdCents: 1_900,
        pricing: {
          mode: "operator_override",
          premiumRateBps: 500,
          provisional: false,
          rationale: "Approved higher-risk tranche.",
        },
      },
    ],
  });

  assert.equal(getHighestClearedThresholdIndex(schedule, 1_499), 0);
  assert.equal(getHighestClearedThresholdIndex(schedule, 1_500), 1);
  assert.equal(getHighestClearedThresholdIndex(schedule, 1_899), 1);
  assert.equal(getHighestClearedThresholdIndex(schedule, 1_900), 2);
  assert.equal(getHighestClearedThresholdIndex(schedule, 2_100), 2);
  assert.deepEqual(getSuccessPremiumDueForClearedThreshold(schedule, 2), {
    clearedThresholdIndex: 2,
    netRecipientThresholdCents: 1_900,
    successPremiumCents: 50,
    grossSuccessRequirementCents: 1_950,
  });
});

test("premium schedule rejects non-increasing cumulative thresholds", () => {
  assert.throws(
    () =>
      quoteFailureBonusSuccessPremiumSchedule({
        premiumPayer: "pool_creator_or_sponsor",
        defaultPricing: {
          mode: "operator_override",
          premiumRateBps: 200,
          provisional: true,
          rationale: "Illustrative Labs rate pending Moral Trade portfolio data.",
        },
        thresholds: [
          { thresholdId: "threshold-1", thresholdIndex: 1, cumulativeNetRecipientThresholdCents: 1_000_000 },
          { thresholdId: "threshold-2", thresholdIndex: 2, cumulativeNetRecipientThresholdCents: 1_000_000 },
        ],
      }),
    /increase strictly/,
  );
});
