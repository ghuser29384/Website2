import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalJson,
  donationOffsetSnapshotIsInternallyConsistent,
  getConditionalPaymentsEnvironment,
  hashConditionSnapshot,
  makeConditionalIdempotencyKey,
  participantAmountForDonationOffset,
  type DonationOffsetConditionSnapshot,
} from "@/lib/payments/conditional-state";

function makeSnapshot(
  overrides: Partial<DonationOffsetConditionSnapshot> = {},
): DonationOffsetConditionSnapshot {
  return {
    schemaVersion: "donation-offset-payment-condition-v1",
    matchId: "10000000-0000-4000-8000-000000000001",
    offerId: "10000000-0000-4000-8000-000000000002",
    ownerProfileId: "10000000-0000-4000-8000-000000000003",
    counterpartyProfileId: "10000000-0000-4000-8000-000000000004",
    matchedBaselineCents: 500,
    matchedCounterpartyCents: 750,
    compromiseTotalCents: 1250,
    unmatchedBaselineCents: 0,
    unmatchedCounterpartyCents: 0,
    currency: "usd",
    compromiseCharityId: "givewell-top-charities-fund",
    compromiseCharityName: "GiveWell Top Charities Fund",
    destinationId: "10000000-0000-4000-8000-000000000005",
    destinationDisplayName: "GiveWell Top Charities Fund",
    destinationConnectedAccountId: "acct_test_destination",
    destinationLivemode: false,
    baselineAmountCents: 500,
    requestedMatchingAmountCents: 750,
    baselineOpposedCause: "Cause A",
    requestedOpposedCause: "Cause B",
    offsetRatio: "1.5",
    timeHorizon: "one_off",
    participationMode: "direct",
    poolId: null,
    poolSide: null,
    verificationMethod: "receipts_uploaded",
    moderationStatus: "clear",
    unmatchedSurplusRule: "return_to_donors",
    assuranceMinimumCents: 0,
    assuranceDeadlineAt: null,
    matchStatus: "matched",
    offerStatus: "matched",
    ...overrides,
  };
}

test("condition hashing is stable across object key order", () => {
  const left = { z: 3, a: { y: 2, x: 1 }, items: [{ b: 2, a: 1 }] };
  const right = { items: [{ a: 1, b: 2 }], a: { x: 1, y: 2 }, z: 3 };

  assert.equal(canonicalJson(left), canonicalJson(right));
  assert.equal(hashConditionSnapshot(left), hashConditionSnapshot(right));
});

test("every material settlement mutation changes the condition hash", () => {
  const original = makeSnapshot();
  const originalHash = hashConditionSnapshot(original);

  assert.notEqual(
    hashConditionSnapshot(makeSnapshot({ matchedBaselineCents: 501, compromiseTotalCents: 1251 })),
    originalHash,
  );
  assert.notEqual(
    hashConditionSnapshot(makeSnapshot({ destinationConnectedAccountId: "acct_other" })),
    originalHash,
  );
  assert.notEqual(
    hashConditionSnapshot(makeSnapshot({ moderationStatus: "flagged" })),
    originalHash,
  );
  assert.notEqual(
    hashConditionSnapshot(makeSnapshot({ assuranceDeadlineAt: "2026-08-01T00:00:00.000Z" })),
    originalHash,
  );
});

test("donation-offset snapshots reject self-trades and inconsistent totals", () => {
  const valid = makeSnapshot();
  assert.equal(donationOffsetSnapshotIsInternallyConsistent(valid), true);
  assert.equal(
    donationOffsetSnapshotIsInternallyConsistent(
      makeSnapshot({ counterpartyProfileId: valid.ownerProfileId }),
    ),
    false,
  );
  assert.equal(
    donationOffsetSnapshotIsInternallyConsistent(makeSnapshot({ compromiseTotalCents: 1249 })),
    false,
  );
  assert.equal(
    donationOffsetSnapshotIsInternallyConsistent(makeSnapshot({ matchedBaselineCents: 49 })),
    false,
  );
  assert.equal(
    donationOffsetSnapshotIsInternallyConsistent(makeSnapshot({ moderationStatus: "flagged" })),
    false,
  );
  assert.equal(
    donationOffsetSnapshotIsInternallyConsistent(makeSnapshot({ matchStatus: "completed" })),
    false,
  );
  assert.equal(
    donationOffsetSnapshotIsInternallyConsistent(makeSnapshot({ offerStatus: "paused" })),
    false,
  );
});

test("participant amounts are derived from the frozen role", () => {
  const snapshot = makeSnapshot();
  assert.equal(participantAmountForDonationOffset(snapshot, "owner"), 500);
  assert.equal(participantAmountForDonationOffset(snapshot, "counterparty"), 750);
});

test("a test key safely enables sandbox mode in every deployment environment", () => {
  const productionSandbox = getConditionalPaymentsEnvironment({
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    STRIPE_SECRET_KEY: "sk_test_example",
  } as NodeJS.ProcessEnv);

  assert.equal(productionSandbox.enabled, true);
  assert.equal(productionSandbox.mode, "test");
  assert.equal(productionSandbox.livemode, false);
});

test("explicit disable wins and live mode requires a live key", () => {
  const disabled = getConditionalPaymentsEnvironment({
    CONDITIONAL_PAYMENTS_MODE: "disabled",
    STRIPE_SECRET_KEY: "sk_test_example",
  } as NodeJS.ProcessEnv);
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.mode, "disabled");

  const invalidLive = getConditionalPaymentsEnvironment({
    CONDITIONAL_PAYMENTS_MODE: "live",
    STRIPE_SECRET_KEY: "sk_test_example",
  } as NodeJS.ProcessEnv);
  assert.equal(invalidLive.enabled, false);
  assert.equal(invalidLive.livemode, true);
});

test("idempotency keys are stable, bounded, and input-sensitive", () => {
  const first = makeConditionalIdempotencyKey(["offset-charge", "batch", "mandate", "pm_1"]);
  const second = makeConditionalIdempotencyKey(["offset-charge", "batch", "mandate", "pm_1"]);
  const changed = makeConditionalIdempotencyKey(["offset-charge", "batch", "mandate", "pm_2"]);

  assert.equal(first, second);
  assert.notEqual(first, changed);
  assert.match(first, /^mtcp:[0-9a-f]{64}$/);
  assert.equal(first.length < 255, true);
});
