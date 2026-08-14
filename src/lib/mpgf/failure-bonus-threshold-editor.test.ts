import assert from "node:assert/strict";
import test from "node:test";

import { getSuccessPremiumDueForClearedThreshold } from "./failure-bonus-success-premium";
import {
  addFailureBonusThresholdDraft,
  buildFailureBonusThresholdEditorQuote,
  createFailureBonusThresholdDraft,
  formatCentsForUsdInput,
  moveFailureBonusThresholdDraft,
  parsePercentInputToBasisPoints,
  parseUsdInputToCents,
  removeFailureBonusThresholdDraft,
  validateSubmittedFailureBonusSchedule,
} from "./failure-bonus-threshold-editor";

function twoThresholdQuote() {
  return buildFailureBonusThresholdEditorQuote({
    drafts: [
      createFailureBonusThresholdDraft({
        thresholdId: "threshold-a",
        cumulativeNetRecipientDollars: "10000.00",
      }),
      createFailureBonusThresholdDraft({
        thresholdId: "threshold-b",
        cumulativeNetRecipientDollars: "25000.00",
        successProbabilityPercent: "60.00",
        expectedEligibleFailureFillPercent: "80.00",
      }),
    ],
    failureBonusRatePercent: "10.00",
    maxParticipants: "100",
    maxBonusPerParticipantDollars: "25.00",
    requestedMaximumFundingDollars: "30000.00",
    verifiedSupporterMinimum: 25,
  });
}

test("USD and percentage inputs preserve exact cents and basis points", () => {
  assert.equal(parseUsdInputToCents("0.01"), 1);
  assert.equal(parseUsdInputToCents("10000.99"), 1_000_099);
  assert.equal(parsePercentInputToBasisPoints("2.01"), 201);
  assert.equal(formatCentsForUsdInput(1_000_099), "10000.99");
  assert.throws(() => parseUsdInputToCents("1.001"), /at most 2 decimal places/);
});

test("threshold drafts can be added, removed, and reordered without changing stable ids", () => {
  const first = createFailureBonusThresholdDraft({
    thresholdId: "threshold-a",
    cumulativeNetRecipientDollars: "100.00",
  });
  const added = addFailureBonusThresholdDraft([first], "threshold-b");
  assert.deepEqual(
    added.map((threshold) => [threshold.thresholdId, threshold.cumulativeNetRecipientDollars]),
    [
      ["threshold-a", "100.00"],
      ["threshold-b", "101.00"],
    ],
  );

  const reordered = moveFailureBonusThresholdDraft(added, "threshold-b", "up");
  assert.deepEqual(reordered.map((threshold) => threshold.thresholdId), ["threshold-b", "threshold-a"]);
  assert.match(
    buildFailureBonusThresholdEditorQuote({
      drafts: reordered,
      failureBonusRatePercent: "10.00",
      maxParticipants: "10",
      maxBonusPerParticipantDollars: "10.00",
      requestedMaximumFundingDollars: "200.00",
      verifiedSupporterMinimum: 2,
    }).errors[0] ?? "",
    /increase strictly/,
  );

  assert.deepEqual(
    removeFailureBonusThresholdDraft(added, "threshold-a").map((threshold) => threshold.thresholdId),
    ["threshold-b"],
  );
  assert.throws(() => removeFailureBonusThresholdDraft([first], "threshold-a"), /at least one/);
});

test("different tranche risk estimates produce separate rates and each incremental tranche is priced once", () => {
  const result = twoThresholdQuote();
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const [first, second] = result.quote.schedule.thresholds;
  assert.deepEqual(
    {
      firstRate: first!.premiumRateBps,
      firstIncrement: first!.incrementalNetRecipientCents,
      firstPremium: first!.successPremiumCents,
      firstCumulativePremium: first!.cumulativeSuccessPremiumCents,
      firstGross: first!.grossSuccessRequirementCents,
      secondRate: second!.premiumRateBps,
      secondIncrement: second!.incrementalNetRecipientCents,
      secondPremium: second!.successPremiumCents,
      secondCumulativePremium: second!.cumulativeSuccessPremiumCents,
      secondGross: second!.grossSuccessRequirementCents,
    },
    {
      firstRate: 201,
      firstIncrement: 1_000_000,
      firstPremium: 20_100,
      firstCumulativePremium: 20_100,
      firstGross: 1_020_100,
      secondRate: 601,
      secondIncrement: 1_500_000,
      secondPremium: 90_150,
      secondCumulativePremium: 110_250,
      secondGross: 2_610_250,
    },
  );

  assert.equal(first!.incrementalFailureBonusExposureCents, 100_000);
  assert.equal(first!.maximumFailureBonusExposureCents, 100_000);
  assert.equal(second!.incrementalFailureBonusExposureCents, 150_000);
  assert.equal(second!.maximumFailureBonusExposureCents, 250_000);

  assert.deepEqual(getSuccessPremiumDueForClearedThreshold(result.quote.schedule, 1), {
    clearedThresholdIndex: 1,
    netRecipientThresholdCents: 1_000_000,
    successPremiumCents: 20_100,
    grossSuccessRequirementCents: 1_020_100,
  });
  assert.deepEqual(getSuccessPremiumDueForClearedThreshold(result.quote.schedule, 2), {
    clearedThresholdIndex: 2,
    netRecipientThresholdCents: 2_500_000,
    successPremiumCents: 110_250,
    grossSuccessRequirementCents: 2_610_250,
  });
});

test("an exact-cent threshold still receives a one-cent rounded-up premium", () => {
  const result = buildFailureBonusThresholdEditorQuote({
    drafts: [
      createFailureBonusThresholdDraft({
        thresholdId: "one-cent",
        cumulativeNetRecipientDollars: "0.01",
      }),
    ],
    failureBonusRatePercent: "10.00",
    maxParticipants: "1",
    maxBonusPerParticipantDollars: "0.01",
    requestedMaximumFundingDollars: "0.01",
    verifiedSupporterMinimum: 1,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.quote.schedule.thresholds[0]!.successPremiumCents, 1);
  assert.equal(result.quote.schedule.thresholds[0]!.grossSuccessRequirementCents, 2);
});

test("server validation rejects quote edits and threshold-specific bonus formulas", () => {
  const result = twoThresholdQuote();
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(
    validateSubmittedFailureBonusSchedule({
      submittedSchedule: structuredClone(result.quote.schedule),
      separateEligibilityPolicy: result.quote.eligibilityPolicy,
      failureBonusRateBps: result.quote.failureBonusRateBps,
      requestedMaximumFundingCents: 3_000_000,
      verifiedSupporterMinimum: 25,
    }),
    result.quote.schedule,
  );

  const alteredPremium = structuredClone(result.quote.schedule);
  alteredPremium.thresholds[1]!.successPremiumCents += 1;
  assert.throws(
    () =>
      validateSubmittedFailureBonusSchedule({
        submittedSchedule: alteredPremium,
        separateEligibilityPolicy: result.quote.eligibilityPolicy,
        failureBonusRateBps: result.quote.failureBonusRateBps,
        requestedMaximumFundingCents: 3_000_000,
        verifiedSupporterMinimum: 25,
      }),
    /does not match server pricing/,
  );

  const alteredFormula = structuredClone(result.quote.schedule);
  alteredFormula.thresholds[1]!.assumptions!.failureBonusRateBps = 2_000;
  assert.throws(
    () =>
      validateSubmittedFailureBonusSchedule({
        submittedSchedule: alteredFormula,
        separateEligibilityPolicy: result.quote.eligibilityPolicy,
        failureBonusRateBps: result.quote.failureBonusRateBps,
        requestedMaximumFundingCents: 3_000_000,
        verifiedSupporterMinimum: 25,
      }),
    /one pool-wide failure-bonus formula/,
  );
});

test("editor fails closed on optimistic underwriting, impossible caps, and thresholds above the request", () => {
  const optimistic = buildFailureBonusThresholdEditorQuote({
    drafts: [
      createFailureBonusThresholdDraft({
        thresholdId: "optimistic",
        cumulativeNetRecipientDollars: "1000.00",
        successProbabilityPercent: "75.01",
      }),
    ],
    failureBonusRatePercent: "10.00",
    maxParticipants: "10",
    maxBonusPerParticipantDollars: "25.00",
    requestedMaximumFundingDollars: "1000.00",
    verifiedSupporterMinimum: 1,
  });
  assert.equal(optimistic.ok, false);
  assert.match(optimistic.errors[0] ?? "", /no higher than 75%/);

  const impossibleCap = buildFailureBonusThresholdEditorQuote({
    drafts: [
      createFailureBonusThresholdDraft({
        thresholdId: "cap",
        cumulativeNetRecipientDollars: "1000.00",
      }),
    ],
    failureBonusRatePercent: "10.00",
    maxParticipants: "5",
    maxBonusPerParticipantDollars: "25.00",
    requestedMaximumFundingDollars: "1000.00",
    verifiedSupporterMinimum: 6,
  });
  assert.equal(impossibleCap.ok, false);
  assert.match(impossibleCap.errors[0] ?? "", /below the verified supporter minimum/);

  const aboveRequest = buildFailureBonusThresholdEditorQuote({
    drafts: [
      createFailureBonusThresholdDraft({
        thresholdId: "too-high",
        cumulativeNetRecipientDollars: "1000.01",
      }),
    ],
    failureBonusRatePercent: "10.00",
    maxParticipants: "10",
    maxBonusPerParticipantDollars: "25.00",
    requestedMaximumFundingDollars: "1000.00",
    verifiedSupporterMinimum: 1,
  });
  assert.equal(aboveRequest.ok, false);
  assert.match(aboveRequest.errors[0] ?? "", /cannot exceed requested maximum funding/);
});
