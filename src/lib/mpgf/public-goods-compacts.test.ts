import assert from "node:assert/strict";
import test from "node:test";

import {
  MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS,
  MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS,
  MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
  MPGF_PUBLIC_GOODS_COMPACT_WEIGHT_UNITS,
  allocateMpgfPublicGoodsObligation,
  applyMpgfPublicGoodsDirectDelegations,
  calculateMpgfPublicGoodsAggregateObligation,
  calculateMpgfPublicGoodsCompactProspectiveExitDate,
  calculateMpgfPublicGoodsCompactReadiness,
  calculateMpgfPublicGoodsVotingWeights,
  getMpgfPublicGoodsPriorUtcMonth,
} from "./public-goods-compacts";
import { parseMpgfPublicGoodsCompactAcknowledgements } from "./public-goods-compacts-input";

test("the prior complete month is frozen on UTC boundaries", () => {
  assert.deepEqual(getMpgfPublicGoodsPriorUtcMonth("2026-08-14T03:15:00-04:00"), {
    cycleKey: "2026-08",
    priorMonthStart: "2026-07-01T00:00:00.000Z",
    priorMonthEndExclusive: "2026-08-01T00:00:00.000Z",
  });
});

test("aggregate obligation is ten percent of eligible net-settled outflow with no cap", () => {
  const snapshot = calculateMpgfPublicGoodsAggregateObligation({
    now: "2026-08-14T12:00:00Z",
    coverage: "complete",
    coverageReason: "synthetic complete test ledger",
    observations: [
      { id: "eligible", occurredAt: "2026-07-10T12:00:00Z", direction: "outgoing", kind: "moral_trade_payment", status: "settled", grossSettledCents: 123_459, refundedCents: 400, reversedCents: 50, chargebackCents: 9 },
      { id: "pending", occurredAt: "2026-07-10T12:00:00Z", direction: "outgoing", kind: "moral_trade_payment", status: "pending", grossSettledCents: 90_000, refundedCents: 0, reversedCents: 0, chargebackCents: 0 },
      { id: "incoming", occurredAt: "2026-07-11T12:00:00Z", direction: "incoming", kind: "moral_trade_payment", status: "settled", grossSettledCents: 90_000, refundedCents: 0, reversedCents: 0, chargebackCents: 0 },
      { id: "compact", occurredAt: "2026-07-12T12:00:00Z", direction: "outgoing", kind: "compact_contribution", status: "settled", grossSettledCents: 90_000, refundedCents: 0, reversedCents: 0, chargebackCents: 0 },
      { id: "outside", occurredAt: "2026-08-01T00:00:00Z", direction: "outgoing", kind: "moral_trade_payment", status: "settled", grossSettledCents: 90_000, refundedCents: 0, reversedCents: 0, chargebackCents: 0 },
    ],
  });
  assert.equal(snapshot.eligibleNetSettledOutflowCents, 123_000);
  assert.equal(snapshot.obligationCents, 12_300);
  assert.equal(snapshot.sourceObservationCount, 1);
});

test("partial or unavailable coverage fails closed without an amount", () => {
  for (const coverage of ["partial", "unavailable"] as const) {
    const snapshot = calculateMpgfPublicGoodsAggregateObligation({ coverage, coverageReason: "coverage gap", observations: [] });
    assert.equal(snapshot.eligibleNetSettledOutflowCents, null);
    assert.equal(snapshot.obligationCents, null);
  }
});

test("single-compact allocation defaults to one hundred percent", () => {
  assert.deepEqual(allocateMpgfPublicGoodsObligation({
    cycleKey: "2026-08",
    obligationCents: 1_001,
    joinedCompactPublicKeys: ["animal-welfare"],
  }), {
    cycleKey: "2026-08",
    instructionValid: true,
    schedulingReady: true,
    reason: null,
    allocations: [{ compactPublicKey: "animal-welfare", allocationBps: 10_000, scheduledContributionCents: 1_001 }],
    scheduledTotalCents: 1_001,
  });
});

test("multi-compact allocation fails closed unless all integer bps sum to 10000", () => {
  const missing = allocateMpgfPublicGoodsObligation({ cycleKey: "2026-08", obligationCents: 1_000, joinedCompactPublicKeys: ["animal-welfare", "global-health"], allocationBps: { "animal-welfare": 10_000 } });
  assert.equal(missing.instructionValid, false);
  const wrongTotal = allocateMpgfPublicGoodsObligation({ cycleKey: "2026-08", obligationCents: 1_000, joinedCompactPublicKeys: ["animal-welfare", "global-health"], allocationBps: { "animal-welfare": 5_000, "global-health": 4_999 } });
  assert.equal(wrongTotal.instructionValid, false);
});

test("largest remainder allocation is deterministic and cent exact", () => {
  const result = allocateMpgfPublicGoodsObligation({
    cycleKey: "2026-08",
    obligationCents: 10,
    joinedCompactPublicKeys: ["global-health", "animal-welfare", "future-flourishing"],
    allocationBps: { "animal-welfare": 3_333, "future-flourishing": 3_333, "global-health": 3_334 },
  });
  assert.equal(result.instructionValid, true);
  assert.equal(
    result.allocations.reduce(
      (sum, row) => sum + (row.scheduledContributionCents ?? 0),
      0,
    ),
    10,
  );
  assert.deepEqual(result.allocations, [
    { compactPublicKey: "animal-welfare", allocationBps: 3_333, scheduledContributionCents: 3 },
    { compactPublicKey: "future-flourishing", allocationBps: 3_333, scheduledContributionCents: 3 },
    { compactPublicKey: "global-health", allocationBps: 3_334, scheduledContributionCents: 4 },
  ]);
});

test("readiness requires the same frozen snapshot to have 100 unique qualified people and $500", () => {
  const qualified = Array.from({ length: 100 }, (_, index) => ({ personId: `person-${index}`, identityQualified: true, allocationValid: true, scheduledContributionCents: 500 }));
  const ready = calculateMpgfPublicGoodsCompactReadiness({ cycleKey: "2026-08", frozenAt: "2026-08-01T00:00:00Z", members: qualified });
  assert.equal(ready.fundingQualifiedUniquePersonCount, 100);
  assert.equal(ready.scheduledContributionCents, 50_000);
  assert.equal(ready.thresholdReady, true);
  assert.equal(ready.activationBlocked, true);
  assert.ok(ready.blockers.length > 0);
  assert.equal(calculateMpgfPublicGoodsCompactReadiness({ cycleKey: "2026-08", members: qualified.slice(0, 99).map((row) => ({ ...row, scheduledContributionCents: 1_100 })) }).thresholdReady, false);
  assert.equal(calculateMpgfPublicGoodsCompactReadiness({ cycleKey: "2026-08", members: qualified.map((row) => ({ ...row, scheduledContributionCents: 499 })) }).thresholdReady, false);
});

test("funding qualification is compact-local and requires at least one dollar", () => {
  const readiness = calculateMpgfPublicGoodsCompactReadiness({ cycleKey: "2026-08", members: [
    { personId: "p1", identityQualified: true, allocationValid: true, scheduledContributionCents: 50 },
    { personId: "p2", identityQualified: true, allocationValid: true, scheduledContributionCents: 350 },
  ] });
  assert.equal(readiness.fundingQualifiedUniquePersonCount, 1);
  assert.equal(readiness.scheduledContributionCents, 350);
});

test("70/30 voting weights match the 1, 4, 9 example and normalize exactly", () => {
  const weights = calculateMpgfPublicGoodsVotingWeights([
    { membershipId: "a", personId: "p1", identityQualified: true, allocationValid: true, netSettledContributionCents: 100 },
    { membershipId: "b", personId: "p2", identityQualified: true, allocationValid: true, netSettledContributionCents: 400 },
    { membershipId: "c", personId: "p3", identityQualified: true, allocationValid: true, netSettledContributionCents: 900 },
  ]);
  assert.equal(
    weights.reduce(
      (sum, row) => sum + BigInt(row.totalWeightUnits),
      BigInt(0),
    ),
    MPGF_PUBLIC_GOODS_COMPACT_WEIGHT_UNITS,
  );
  assert.deepEqual(
    weights.map((row) =>
      Number(
        (BigInt(row.totalWeightUnits) * BigInt(10_000)) /
          MPGF_PUBLIC_GOODS_COMPACT_WEIGHT_UNITS,
      ),
    ),
    [2_833, 3_333, 3_833],
  );
});

test("refunds can remove monthly voting qualification", () => {
  const weights = calculateMpgfPublicGoodsVotingWeights([
    { membershipId: "a", personId: "p1", identityQualified: true, allocationValid: true, netSettledContributionCents: 99 },
    { membershipId: "b", personId: "p2", identityQualified: true, allocationValid: true, netSettledContributionCents: 100 },
  ]);
  assert.deepEqual(weights.map((row) => row.membershipId), ["b"]);
  assert.equal(weights[0].totalWeightUnits, MPGF_PUBLIC_GOODS_COMPACT_WEIGHT_UNITS.toString());
});

test("delegation is direct only, permits two-way delegation, and never retransmits incoming weight", () => {
  const weights = Array.from({ length: 20 }, (_, index) => ({
    membershipId: String.fromCharCode(97 + index), personId: `p${index}`, identityQualified: true, allocationValid: true, netSettledContributionCents: 100,
  }));
  const base = calculateMpgfPublicGoodsVotingWeights(weights);
  const result = applyMpgfPublicGoodsDirectDelegations({ weights: base, delegations: { a: "b", b: "a" } });
  const a = result.find((row) => row.membershipId === "a");
  const b = result.find((row) => row.membershipId === "b");
  assert.equal(a?.directIncomingDelegationCount, 1);
  assert.equal(b?.directIncomingDelegationCount, 1);
  assert.equal(a?.controlledWeightUnits, "50000000000");
  assert.equal(b?.controlledWeightUnits, "50000000000");
});

test("delegation rejects a proxy crossing ten percent of effective weight", () => {
  const base = calculateMpgfPublicGoodsVotingWeights(Array.from({ length: 20 }, (_, index) => ({ membershipId: String.fromCharCode(97 + index), personId: `p${index}`, identityQualified: true, allocationValid: true, netSettledContributionCents: 100 })));
  assert.throws(() => applyMpgfPublicGoodsDirectDelegations({ weights: base, delegations: { a: "c", b: "c" } }), /more than ten percent/);
});

test("active compact exit is the later of the minimum term and notice period", () => {
  assert.equal(calculateMpgfPublicGoodsCompactProspectiveExitDate("2026-01-31T12:00:00.000Z", "2026-12-20T12:00:00.000Z").effectiveAt, "2027-01-31T12:00:00.000Z");
});

test("constitutional acknowledgements and no-money invariants remain explicit", () => {
  assert.deepEqual(parseMpgfPublicGoodsCompactAcknowledgements({ voluntaryChoice: true, exactConstitution: true, activationAndNoProjectOptOut: true, noPaymentMandate: true }), MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS);
  assert.equal(MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.marketplaceCheckoutSurchargeEnabled, false);
  assert.equal(MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.moneyMovesOnJoin, false);
  assert.equal(MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.automaticCollectionEnabled, false);
  assert.equal(new Set(MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.map((row) => row.causeKey)).size, 3);
});
