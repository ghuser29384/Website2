import assert from "node:assert/strict";
import test from "node:test";

import {
  PLEDGE_FUNDING_BACKEND_REQUIREMENTS,
  PLEDGE_FUNDING_PREVIEW_ROUNDS,
  applyPledgeFundingContribution,
  getPledgeFundingMechanismState,
  getPledgeFundingReceiptAtom,
  getPreferredCharityBonusCopy,
  settleExpiredPledgeFundingRound,
  shouldShowPreferredCharityBonus,
  type PledgeFundingRound,
} from "@/lib/moral-trade/pledge-funding-rounds";

const LIVE_BACKING: PledgeFundingRound["backing"] = {
  charityPayout: true,
  contributionRows: true,
  ledgerRows: true,
  paymentAuthorization: true,
  publicProgressCounts: true,
  refundOrRelease: true,
  sponsorBonusPool: true,
  transactionalFinalSlot: true,
};

function backedRound(overrides: Partial<PledgeFundingRound> = {}): PledgeFundingRound {
  return {
    ...PLEDGE_FUNDING_PREVIEW_ROUNDS[1],
    backing: LIVE_BACKING,
    chargePolicy: "authorize_then_capture",
    deadlineAt: "2099-01-01T00:00:00.000Z",
    filledSlots: 3,
    raisedAmountCents: 1_500,
    state: "open",
    ...overrides,
  };
}

test("micro-assurance preview renders v72 receipt facts without fake live funding", () => {
  const round = PLEDGE_FUNDING_PREVIEW_ROUNDS[0];
  const receipt = getPledgeFundingReceiptAtom(round);
  const mechanism = getPledgeFundingMechanismState(round);

  assert.equal(receipt.state, "Preview");
  assert.equal(receipt.exposure, "Max $0.10");
  assert.equal(receipt.conditionOrProtection, "No durable state changed");
  assert.equal(receipt.protection, "Payment not connected");
  assert.equal(receipt.primaryCta, "Preview funding");
  assert.equal(receipt.resultCopy, "No durable state changed.");
  assert.equal(mechanism.canAcceptContribution, false);
  assert.match(mechanism.safeStateReason ?? "", /Payment authorization, refund\/release, ledger/);
});

test("capped pivotal cohort renders backed slot state and final-slot copy only when transactional", () => {
  const round = backedRound();
  const mechanism = getPledgeFundingMechanismState(round);
  const receipt = getPledgeFundingReceiptAtom(round);

  assert.equal(mechanism.progressLabel, "3 of 4 slots filled");
  assert.equal(mechanism.remainingLabel, "1 slot left");
  assert.equal(mechanism.isFinalSlot, true);
  assert.equal(receipt.primaryCta, "Clear this pledge");
  assert.equal(receipt.conditionOrProtection, "No charge unless this cohort clears");
});

test("final slot clears a capped cohort and full cohorts no longer accept funding", () => {
  const filled = applyPledgeFundingContribution(backedRound(), 500);

  assert.equal(filled.ok, true);
  assert.equal(filled.nextRound.state, "cleared");
  assert.equal(filled.nextRound.filledSlots, 4);
  assert.equal(filled.resultCopy, "Cohort cleared. Pledge funding created.");

  const full = backedRound({ filledSlots: 4, raisedAmountCents: 2_000 });
  const rejected = applyPledgeFundingContribution(full, 500);
  const fullReceipt = getPledgeFundingReceiptAtom(full);

  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "This round is full.");
  assert.equal(fullReceipt.primaryCta, "Round full");
});

test("open micro-assurance funding rejects overfunding unless an overflow policy exists", () => {
  const micro = backedRound({
    mode: "micro_assurance",
    defaultContributionCents: 10,
    filledSlots: null,
    maxSlots: null,
    minContributionCents: 10,
    raisedAmountCents: 1_995,
    slotAmountCents: null,
    targetAmountCents: 2_000,
  });

  const rejected = applyPledgeFundingContribution(micro, 10);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "Contribution would overfund this round.");
});

test("expired uncleared rounds trigger refund or authorization-release result copy", () => {
  const released = settleExpiredPledgeFundingRound(
    backedRound({ deadlineAt: "2020-01-01T00:00:00.000Z", filledSlots: 2, raisedAmountCents: 1_000 }),
    new Date("2026-07-03T00:00:00.000Z"),
  );

  assert.equal(released.ok, true);
  assert.equal(released.nextRound.state, "failed");
  assert.equal(released.resultCopy, "Authorization released. Cohort did not clear.");

  const refunded = settleExpiredPledgeFundingRound(
    backedRound({
      chargePolicy: "charge_then_refund",
      deadlineAt: "2020-01-01T00:00:00.000Z",
      filledSlots: 2,
      raisedAmountCents: 1_000,
    }),
    new Date("2026-07-03T00:00:00.000Z"),
  );

  assert.equal(refunded.nextRound.state, "refunding");
  assert.equal(refunded.resultCopy, "Contribution refunded. Cohort did not clear.");
});

test("preferred charity bonus appears only with sponsor pool and charity payout backing", () => {
  const unbacked = {
    ...backedRound({ sponsorBonusPoolId: null }),
    preferredCharityBonusCents: 25,
    preferredCharityBonusPolicy: "on_clear" as const,
  };
  const backed = backedRound({
    preferredCharityBonusCents: 25,
    preferredCharityBonusPolicy: "on_clear",
    sponsorBonusPoolId: "sponsor-pool-preview",
  });

  assert.equal(shouldShowPreferredCharityBonus(unbacked), false);
  assert.equal(getPreferredCharityBonusCopy(unbacked), "Preferred-charity bonus not connected yet");
  assert.equal(shouldShowPreferredCharityBonus(backed), true);
  assert.equal(getPreferredCharityBonusCopy(backed), "Sponsor bonus to your chosen charity: $0.25");
});

test("live backend requirements name RLS, idempotency, ledger, and payout work instead of faking it", () => {
  const joinedRequirements = PLEDGE_FUNDING_BACKEND_REQUIREMENTS.join("\n");

  assert.match(joinedRequirements, /RLS: public can read public round state/);
  assert.match(joinedRequirements, /users can read only their own contribution rows/);
  assert.match(joinedRequirements, /idempotency keys/);
  assert.match(joinedRequirements, /append-only ledger/);
  assert.match(joinedRequirements, /approved charity-recipient registry/);
});

test("pledge-funding receipt copy excludes forbidden fake-success and popularity language", () => {
  const receipts = [
    getPledgeFundingReceiptAtom(PLEDGE_FUNDING_PREVIEW_ROUNDS[0]),
    getPledgeFundingReceiptAtom(PLEDGE_FUNDING_PREVIEW_ROUNDS[1]),
    getPledgeFundingReceiptAtom(backedRound()),
  ];
  const copy = receipts.map((receipt) => Object.values(receipt).join(" ")).join(" ");

  for (const forbidden of ["Success", "Joined", "Order placed", "Hot", "Best", "Popular", "People like you"]) {
    assert.equal(copy.includes(forbidden), false);
  }
});
