import assert from "node:assert/strict";
import test from "node:test";

import {
  MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS,
  MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS,
  MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
  calculateMpgfPublicGoodsCompactActivationProgress,
  calculateMpgfPublicGoodsCompactContributionCents,
  calculateMpgfPublicGoodsCompactProspectiveExitDate,
  parseMpgfPublicGoodsCompactSpendingToCents,
} from "./public-goods-compacts";
import { parseMpgfPublicGoodsCompactAcknowledgements } from "./public-goods-compacts-input";

test("compact contribution arithmetic is whole-cent, one percent, and capped at ten dollars", () => {
  assert.equal(calculateMpgfPublicGoodsCompactContributionCents(0), 0);
  assert.equal(calculateMpgfPublicGoodsCompactContributionCents(99), 0);
  assert.equal(calculateMpgfPublicGoodsCompactContributionCents(100), 1);
  assert.equal(calculateMpgfPublicGoodsCompactContributionCents(12_345), 123);
  assert.equal(calculateMpgfPublicGoodsCompactContributionCents(100_000), 1_000);
  assert.equal(calculateMpgfPublicGoodsCompactContributionCents(9_000_000), 1_000);
  assert.equal(parseMpgfPublicGoodsCompactSpendingToCents("123.45"), 12_345);
  assert.throws(
    () => parseMpgfPublicGoodsCompactSpendingToCents("12.345"),
    /at most two decimals/,
  );
});

test("activation progress never exceeds one hundred percent", () => {
  assert.deepEqual(calculateMpgfPublicGoodsCompactActivationProgress(0), {
    acceptedMemberCount: 0,
    activationThreshold: 5_000,
    remainingMemberCount: 5_000,
    progressBps: 0,
    thresholdReached: false,
  });
  assert.equal(
    calculateMpgfPublicGoodsCompactActivationProgress(4_999).thresholdReached,
    false,
  );
  assert.deepEqual(calculateMpgfPublicGoodsCompactActivationProgress(5_001), {
    acceptedMemberCount: 5_001,
    activationThreshold: 5_000,
    remainingMemberCount: 0,
    progressBps: 10_000,
    thresholdReached: true,
  });
});

test("active compact exit is the later of the minimum term and notice period", () => {
  assert.deepEqual(
    calculateMpgfPublicGoodsCompactProspectiveExitDate(
      "2026-01-31T12:00:00.000Z",
      "2026-12-20T12:00:00.000Z",
    ),
    {
      minimumTermEndsAt: "2027-01-31T12:00:00.000Z",
      noticeEndsAt: "2027-01-19T12:00:00.000Z",
      effectiveAt: "2027-01-31T12:00:00.000Z",
    },
  );
  assert.equal(
    calculateMpgfPublicGoodsCompactProspectiveExitDate(
      "2026-01-31T12:00:00.000Z",
      "2027-02-01T12:00:00.000Z",
    ).effectiveAt,
    "2027-03-03T12:00:00.000Z",
  );
});

test("compact invariants prohibit assignment, marketplace tax, project opt-out, and money movement", () => {
  assert.deepEqual(MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS, {
    optInOnly: true,
    randomAssignmentAllowed: false,
    coreMarketplaceTaxed: false,
    bindingOnlyAfterActivation: true,
    perProjectRefusalAllowedAfterActivation: false,
    exitProspectiveOnlyAfterActivation: true,
    moneyMovesOnJoin: false,
    automaticCollectionEnabled: false,
  });
});

test("compact acceptance requires every explicit acknowledgement", () => {
  assert.deepEqual(
    parseMpgfPublicGoodsCompactAcknowledgements({
      voluntaryChoice: true,
      exactConstitution: true,
      activationAndNoProjectOptOut: true,
      noPaymentMandate: true,
    }),
    MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
  );
  assert.throws(
    () =>
      parseMpgfPublicGoodsCompactAcknowledgements({
        voluntaryChoice: true,
        exactConstitution: true,
        activationAndNoProjectOptOut: false,
        noPaymentMandate: true,
      }),
    /every required compact acknowledgement/i,
  );
});

test("founding charters are unique, cause-specific, and contain no activity", () => {
  assert.deepEqual(
    MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.map((charter) => charter.title),
    ["Future Flourishing", "Animal Welfare", "Global Health"],
  );
  assert.equal(
    new Set(
      MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.map(
        (charter) => charter.publicKey,
      ),
    ).size,
    MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.length,
  );
  assert.equal(
    new Set(
      MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.map(
        (charter) => charter.causeKey,
      ),
    ).size,
    MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.length,
  );
  for (const charter of MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS) {
    assert.equal("acceptedMemberCount" in charter, false);
    assert.equal("membership" in charter, false);
    assert.equal("ballot" in charter, false);
  }
});
