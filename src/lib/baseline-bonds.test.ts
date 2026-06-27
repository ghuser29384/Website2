import assert from "node:assert/strict";
import test from "node:test";

import {
  BASELINE_BOND_MIN_CENTS,
  canCollectBaselineBondPayment,
  calculatePilotBaselineBondCapCents,
  formatPostedBaselineBondBadge,
  getBaselineBondStatusAfterAccepted,
  isPaymentBondsEnabled,
  shouldOpenBaselineBondEvidence,
  validateBaselineBondInput,
} from "@/lib/baseline-bonds";
import { findRegisteredCharityById } from "@/lib/donation-offsets";

const baseInput = {
  amountCents: 5_000,
  baselineAmountCents: 50_000,
  baselineStatement:
    "Without this trade I would make the stated baseline donation next month based on my prior giving plan.",
  currency: "USD",
  enabled: true,
  evidenceDueAt: "2026-07-15T00:00:00.000Z",
  evidenceStandard:
    "A dated donation receipt or public payment confirmation showing the baseline donation was carried out.",
  forfeitDestination: findRegisteredCharityById("givewell-top-charities-fund"),
  forfeitDestinationId: "givewell-top-charities-fund",
  notes: "A voluntary donation offset with bounded review and no coercive baseline.",
  offerExpiresAt: "2026-07-01T00:00:00.000Z",
  offeredAction: "Redirect a planned opposed donation into a compromise public-good destination.",
  requestedAction: "Ask a counterparty to redirect a matching opposed donation.",
};

test("baseline credibility bond pilot cap is min of $250 and 20% of baseline", () => {
  assert.equal(calculatePilotBaselineBondCapCents(200_000), 25_000);
  assert.equal(calculatePilotBaselineBondCapCents(50_000), 10_000);
  assert.equal(calculatePilotBaselineBondCapCents(4_000), 800);
  assert.equal(BASELINE_BOND_MIN_CENTS, 1_000);
});

test("baseline credibility bond validation requires expiry, evidence standard, cap, and public-good destination", () => {
  const validation = validateBaselineBondInput({
    ...baseInput,
    amountCents: 30_000,
    evidenceStandard: "Evidence later.",
    forfeitDestination: null,
    forfeitDestinationId: "platform-operating-account",
    offerExpiresAt: null,
  });

  assert.equal(validation.safetyAction, "clear");
  assert.ok(validation.errors.some((error) => /expiry date/i.test(error)));
  assert.ok(validation.errors.some((error) => /concrete evidence standard/i.test(error)));
  assert.ok(validation.errors.some((error) => /no more than/i.test(error)));
  assert.ok(validation.errors.some((error) => /platform operating account/i.test(error)));
});

test("baseline credibility bond safety rejects political, illegal, coercive, self-harm, and harassment baselines", () => {
  for (const baselineStatement of [
    "This political contribution to a candidate committee will happen unless someone pays.",
    "I will falsify a fake receipt for this baseline.",
    "Pay me or I will harass the organization.",
    "Without payment I may hurt myself.",
  ]) {
    const validation = validateBaselineBondInput({
      ...baseInput,
      baselineStatement,
    });

    assert.equal(validation.safetyAction, "reject");
    assert.ok(validation.errors.length > 0);
  }
});

test("baseline credibility bond pauses likely payment-extraction baselines", () => {
  const validation = validateBaselineBondInput({
    ...baseInput,
    baselineStatement:
      "I just increased this baseline mainly to get paid, though I can provide a dated receipt.",
  });

  assert.equal(validation.safetyAction, "pause");
  assert.deepEqual(validation.errors, []);
  assert.ok(validation.pauseReasons.some((reason) => /extract payment/i.test(reason)));
});

test("baseline credibility bond payment collection is gated by feature flag and reviewer approval", () => {
  assert.equal(
    isPaymentBondsEnabled({ PAYMENT_BONDS_ENABLED: "false" } as unknown as NodeJS.ProcessEnv),
    false,
  );
  assert.equal(
    isPaymentBondsEnabled({ PAYMENT_BONDS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv),
    true,
  );
  assert.equal(
    canCollectBaselineBondPayment({
      paymentBondsEnabled: false,
      reviewerApproved: true,
      status: "pending_payment",
    }),
    false,
  );
  assert.equal(
    canCollectBaselineBondPayment({
      paymentBondsEnabled: true,
      reviewerApproved: false,
      status: "pending_payment",
    }),
    false,
  );
  assert.equal(
    canCollectBaselineBondPayment({
      paymentBondsEnabled: true,
      reviewerApproved: true,
      status: "pending_payment",
    }),
    true,
  );
});

test("baseline credibility bond flow refunds posted bonds on pre-expiry acceptance and opens evidence after expiry", () => {
  assert.equal(
    getBaselineBondStatusAfterAccepted({
      offerExpiresAt: "2026-07-01T00:00:00.000Z",
      status: "posted",
      now: new Date("2026-06-30T12:00:00.000Z"),
    }),
    "refunded_after_match",
  );
  assert.equal(
    getBaselineBondStatusAfterAccepted({
      offerExpiresAt: "2026-07-01T00:00:00.000Z",
      status: "posted",
      now: new Date("2026-07-02T12:00:00.000Z"),
    }),
    "posted",
  );
  assert.equal(
    shouldOpenBaselineBondEvidence({
      offerExpiresAt: "2026-07-01T00:00:00.000Z",
      offerStatus: "open",
      status: "posted",
      now: new Date("2026-07-02T12:00:00.000Z"),
    }),
    true,
  );
  assert.equal(
    shouldOpenBaselineBondEvidence({
      offerExpiresAt: "2026-07-01T00:00:00.000Z",
      offerStatus: "matched",
      status: "posted",
      now: new Date("2026-07-02T12:00:00.000Z"),
    }),
    false,
  );
});

test("posted baseline credibility bond badge uses the public product term", () => {
  assert.equal(formatPostedBaselineBondBadge(5_000, "USD"), "Bonded baseline: $50 posted");
});
