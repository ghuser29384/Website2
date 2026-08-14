import assert from "node:assert/strict";
import test from "node:test";

import { classifyPendingMpgfFailureBonusScheduleRow } from "./failure-bonus-operator";
import { buildFailureBonusThresholdEditorQuote, createFailureBonusThresholdDraft } from "./failure-bonus-threshold-editor";

function validRow() {
  const result = buildFailureBonusThresholdEditorQuote({
    drafts: [
      createFailureBonusThresholdDraft({
        thresholdId: "operator-threshold-1",
        cumulativeNetRecipientDollars: "10000.00",
      }),
      createFailureBonusThresholdDraft({
        thresholdId: "operator-threshold-2",
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
  if (!result.ok) assert.fail(result.errors.join(" "));

  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Operator review fixture",
    proposer_id: "22222222-2222-4222-8222-222222222222",
    status: "submitted",
    submitted_at: "2026-07-26T16:00:00.000Z",
    requested_maximum_funding_cents: 3_000_000,
    public_goods_threshold_supporters: 25,
    public_goods_failure_bonus_rate_bps: result.quote.failureBonusRateBps,
    public_goods_failure_bonus_eligibility_json: result.quote.eligibilityPolicy,
    public_goods_failure_bonus_schedule_status: "pending_review",
    public_goods_threshold_schedule_json: result.quote.schedule,
  };
}

test("operator queue accepts an exact server-reproducible pending schedule", () => {
  const classification = classifyPendingMpgfFailureBonusScheduleRow(validRow());

  assert.equal(classification.status, "pending");
  if (classification.status !== "pending") return;
  assert.equal(classification.value.schedule.thresholds.length, 2);
  assert.equal(classification.value.schedule.thresholds[1]?.premiumRateBps, 601);
});

test("operator queue surfaces a tampered schedule as blocked instead of hiding it", () => {
  const row = validRow();
  const schedule = structuredClone(row.public_goods_threshold_schedule_json);
  schedule.thresholds[1]!.successPremiumCents += 1;

  const classification = classifyPendingMpgfFailureBonusScheduleRow({
    ...row,
    public_goods_threshold_schedule_json: schedule,
  });

  assert.equal(classification.status, "blocked");
  if (classification.status !== "blocked") return;
  assert.match(classification.value.reason, /does not match server pricing/);
});
