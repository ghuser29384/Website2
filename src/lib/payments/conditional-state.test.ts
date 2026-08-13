import assert from "node:assert/strict";
import test from "node:test";

import { calculateDonationOffsetImpactSnapshot } from "@/lib/donation-offset-impact";
import {
  canonicalJson,
  donationOffsetSnapshotIsInternallyConsistent,
  getConditionalPaymentsEnvironment,
  hashConditionSnapshot,
  makeConditionalIdempotencyKey,
  participantAmountForDonationOffset,
  type DonationOffsetConditionSnapshot,
} from "@/lib/payments/conditional-state";

function testEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", ...overrides };
}

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

test("v2 snapshots bind both redirect plans and frozen impacts to the correct participant", () => {
  const base = makeSnapshot({
    schemaVersion: "donation-offset-payment-condition-v2",
    compromiseCharityId: "against-malaria-foundation",
    compromiseCharityName: "Against Malaria Foundation",
  });
  const ownerImpact = calculateDonationOffsetImpactSnapshot({
    amountCents: base.matchedBaselineCents,
    destinationId: "against-malaria-foundation",
    partyId: base.ownerProfileId,
    partyRole: "owner",
  });
  const counterpartyImpact = calculateDonationOffsetImpactSnapshot({
    amountCents: base.matchedCounterpartyCents,
    destinationId: "helen-keller-intl-vitamin-a",
    partyId: base.counterpartyProfileId,
    partyRole: "counterparty",
  });
  const snapshot: DonationOffsetConditionSnapshot = {
    ...base,
    redirects: {
      owner: {
        amountCents: base.matchedBaselineCents,
        causeArea: "Global health",
        charityId: "against-malaria-foundation",
        charityName: "Against Malaria Foundation",
        destinationConnectedAccountId: base.destinationConnectedAccountId,
        destinationDisplayName: base.destinationDisplayName,
        destinationId: base.destinationId,
        destinationLivemode: base.destinationLivemode,
        impact: ownerImpact as unknown as Record<string, unknown>,
        participantRole: "owner",
        planVersion: 2,
        profileId: base.ownerProfileId,
      },
      counterparty: {
        amountCents: base.matchedCounterpartyCents,
        causeArea: "Global health",
        charityId: "helen-keller-intl-vitamin-a",
        charityName: "Helen Keller Intl — Vitamin A Supplementation",
        destinationConnectedAccountId: "acct_counterparty",
        destinationDisplayName: "Helen Keller Intl",
        destinationId: "20000000-0000-4000-8000-000000000005",
        destinationLivemode: base.destinationLivemode,
        impact: counterpartyImpact as unknown as Record<string, unknown>,
        participantRole: "counterparty",
        planVersion: 3,
        profileId: base.counterpartyProfileId,
      },
    },
  };

  assert.equal(donationOffsetSnapshotIsInternallyConsistent(snapshot), true);
  assert.equal(
    donationOffsetSnapshotIsInternallyConsistent({
      ...snapshot,
      redirects: {
        ...snapshot.redirects!,
        counterparty: {
          ...snapshot.redirects!.counterparty,
          profileId: snapshot.ownerProfileId,
        },
      },
    }),
    false,
  );
});

test("participant amounts are derived from the frozen role", () => {
  const snapshot = makeSnapshot();
  assert.equal(participantAmountForDonationOffset(snapshot, "owner"), 500);
  assert.equal(participantAmountForDonationOffset(snapshot, "counterparty"), 750);
});

test("Stripe test mode is available in preview and blocked on the production site", () => {
  const previewSandbox = getConditionalPaymentsEnvironment(
    testEnv({
      VERCEL_ENV: "preview",
      STRIPE_SECRET_KEY: "sk_test_example",
    }),
  );
  assert.equal(previewSandbox.enabled, true);
  assert.equal(previewSandbox.mode, "test");
  assert.equal(previewSandbox.livemode, false);

  const productionSandbox = getConditionalPaymentsEnvironment(
    testEnv({
      CONDITIONAL_PAYMENTS_MODE: "test",
      VERCEL_ENV: "production",
      STRIPE_SECRET_KEY: "sk_test_example",
    }),
  );
  assert.equal(productionSandbox.enabled, false);
  assert.equal(productionSandbox.mode, "disabled");
  assert.equal(productionSandbox.livemode, false);
  assert.match(productionSandbox.reason, /blocked on the production site/);
});

test("explicit disable wins and live mode requires a live key", () => {
  const disabled = getConditionalPaymentsEnvironment(
    testEnv({
      CONDITIONAL_PAYMENTS_MODE: "disabled",
      STRIPE_SECRET_KEY: "sk_test_example",
    }),
  );
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.mode, "disabled");

  const invalidLive = getConditionalPaymentsEnvironment(
    testEnv({
      CONDITIONAL_PAYMENTS_MODE: "live",
      STRIPE_SECRET_KEY: "sk_test_example",
    }),
  );
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
