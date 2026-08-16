import assert from "node:assert/strict";
import test from "node:test";

import {
  compactShadowAmountCents,
  eligibleNetSettledOutflowCents,
  priorCompleteUtcMonthBounds,
  publicCoverageForAuthority,
  type CompactOutflowEventValue,
} from "./compact-authoritative-outflow";

const base: CompactOutflowEventValue = {
  direction: "outgoing",
  paymentKind: "moral_trade_payment",
  settlementStatus: "settled",
  grossSettledCents: 10_009,
  refundedCents: 0,
  reversedCents: 0,
  chargebackCents: 0,
  currency: "USD",
  environment: "qa",
  synthetic: true,
  occurredAt: "2026-07-15T12:00:00.000Z",
  settledAt: "2026-07-16T12:00:00.000Z",
};

test("selects the exact prior complete UTC month", () => {
  assert.deepEqual(priorCompleteUtcMonthBounds("2026-08"), {
    periodStart: "2026-07-01T00:00:00.000Z",
    periodEndExclusive: "2026-08-01T00:00:00.000Z",
  });
  assert.deepEqual(priorCompleteUtcMonthBounds("2026-01"), {
    periodStart: "2025-12-01T00:00:00.000Z",
    periodEndExclusive: "2026-01-01T00:00:00.000Z",
  });
});

test("uses cent-safe floor division for the shadow Compact amount", () => {
  assert.equal(compactShadowAmountCents(0), 0);
  assert.equal(compactShadowAmountCents(9), 0);
  assert.equal(compactShadowAmountCents(10), 1);
  assert.equal(compactShadowAmountCents(10_009), 1_000);
});

test("nets refunds, reversals, and chargebacks", () => {
  const total = eligibleNetSettledOutflowCents(
    [
      { ...base, grossSettledCents: 10_000, refundedCents: 2_000 },
      { ...base, grossSettledCents: 5_000, reversedCents: 1_000 },
      { ...base, grossSettledCents: 7_000, chargebackCents: 3_000 },
    ],
    { cycleKey: "2026-08", environment: "qa" },
  );
  assert.equal(total, 16_000);
  assert.equal(compactShadowAmountCents(total), 1_600);
});

test("excludes non-eligible directions, kinds, states, periods, and environments", () => {
  const excluded: CompactOutflowEventValue[] = [
    { ...base, direction: "incoming" },
    { ...base, direction: "internal" },
    { ...base, paymentKind: "compact_contribution" },
    { ...base, paymentKind: "wallet_funding" },
    { ...base, paymentKind: "deposit" },
    { ...base, paymentKind: "escrow" },
    { ...base, settlementStatus: "pending", settledAt: null },
    { ...base, settlementStatus: "failed", settledAt: null },
    { ...base, occurredAt: "2026-08-01T00:00:00.000Z" },
    { ...base, environment: "preview" },
    { ...base, currency: "EUR" },
  ];
  assert.equal(
    eligibleNetSettledOutflowCents(excluded, {
      cycleKey: "2026-08",
      environment: "qa",
    }),
    0,
  );
});

test("production rejects synthetic facts and authority maps fail closed", () => {
  assert.equal(
    eligibleNetSettledOutflowCents(
      [{ ...base, environment: "production", synthetic: true }],
      { cycleKey: "2026-08", environment: "production" },
    ),
    0,
  );
  assert.equal(publicCoverageForAuthority("complete"), "complete");
  assert.equal(publicCoverageForAuthority("incomplete"), "partial");
  assert.equal(publicCoverageForAuthority("provisional"), "partial");
  assert.equal(publicCoverageForAuthority("invalidated"), "unavailable");
  assert.equal(publicCoverageForAuthority("superseded"), "unavailable");
});

test("invalid adjustment totals fail closed", () => {
  assert.throws(
    () =>
      eligibleNetSettledOutflowCents(
        [{ ...base, grossSettledCents: 100, refundedCents: 101 }],
        { cycleKey: "2026-08", environment: "qa" },
      ),
    /Adjustments cannot exceed/,
  );
});
