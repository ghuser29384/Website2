import assert from "node:assert/strict";
import test from "node:test";

import {
  MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS,
  MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
  calculateMpgfPublicGoodsCompactProspectiveExitDate,
  type MpgfPublicGoodsCompactsState,
} from "./public-goods-compacts";
import {
  assertMpgfPublicGoodsCompactMutationSafety,
  validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState,
} from "./public-goods-compacts-state";

const NOW = new Date("2027-03-15T00:00:00.000Z");
const ACTIVATED_AT = "2026-01-31T12:00:00.000Z";

function buildRecruitingDatabaseState(): MpgfPublicGoodsCompactsState {
  return {
    available: true,
    source: "database",
    unavailableReason: null,
    compacts: MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.map(
      (charter, index) => ({
        ...charter,
        id: `10000000-0000-4000-8000-00000000000${index + 1}`,
        status: "recruiting",
        acceptedMemberCount: 0,
        memberCountAvailable: true,
        activation: {
          state: "recruiting",
          activatedAt: null,
          constitutionFrozenAt: null,
          frozenConstitutionVersion: null,
          minimumTermEndsAt: null,
        },
        allocationElectorate: {
          active: false,
          key: null,
        },
        membership: null,
        delegation: null,
      }),
    ),
    moneyMovesOnPageAction: false,
    automaticCollectionEnabled: false,
  };
}

function activateFutureFlourishing(state: MpgfPublicGoodsCompactsState) {
  const compact = state.compacts[0];
  const minimumTermEndsAt =
    calculateMpgfPublicGoodsCompactProspectiveExitDate(
      ACTIVATED_AT,
      ACTIVATED_AT,
    ).minimumTermEndsAt;

  compact.status = "active";
  compact.acceptedMemberCount = 5_000;
  compact.activation = {
    state: "threshold_reached_constitution_frozen",
    activatedAt: ACTIVATED_AT,
    constitutionFrozenAt: ACTIVATED_AT,
    frozenConstitutionVersion: compact.constitutionVersion,
    minimumTermEndsAt,
  };
}

test("complete recruiting database state is accepted", () => {
  const state = buildRecruitingDatabaseState();

  assert.deepEqual(
    validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(state, NOW),
    state,
  );
});

test("state validation rejects charter drift, impossible activation, and recruiting electorates", () => {
  const summaryDrift = buildRecruitingDatabaseState();
  summaryDrift.compacts[0].summary = "Unaccepted replacement summary.";
  assert.equal(
    validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(
      summaryDrift,
      NOW,
    ),
    null,
  );

  const activeBelowThreshold = buildRecruitingDatabaseState();
  activateFutureFlourishing(activeBelowThreshold);
  activeBelowThreshold.compacts[0].acceptedMemberCount = 4_999;
  assert.equal(
    validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(
      activeBelowThreshold,
      NOW,
    ),
    null,
  );

  const recruitingElectorate = buildRecruitingDatabaseState();
  recruitingElectorate.compacts[0].allocationElectorate = {
    active: true,
    key: "round:compact-qa",
  };
  assert.equal(
    validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(
      recruitingElectorate,
      NOW,
    ),
    null,
  );
});

test("state validation rejects stale delegation and unsafe membership arithmetic", () => {
  const state = buildRecruitingDatabaseState();
  activateFutureFlourishing(state);
  const compact = state.compacts[0];

  compact.allocationElectorate = {
    active: true,
    key: "round:compact-qa",
  };
  compact.membership = {
    id: "20000000-0000-4000-8000-000000000001",
    compactId: compact.id as string,
    compactPublicKey: compact.publicKey,
    constitutionVersionAccepted: compact.constitutionVersion,
    acknowledgements: MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
    declaredEligibleMonthlySpendingCents: 12_345,
    scheduledMonthlyContributionCents: 124,
    status: "active",
    acceptedAt: ACTIVATED_AT,
    activatedAt: ACTIVATED_AT,
    revokedAt: null,
    exitRequestedAt: null,
    exitEffectiveAt: null,
  };
  assert.equal(
    validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(state, NOW),
    null,
  );

  compact.membership.scheduledMonthlyContributionCents = 123;
  compact.delegation = {
    id: "30000000-0000-4000-8000-000000000001",
    compactId: compact.id as string,
    electorateKey: "round:stale-qa",
    delegatorMembershipId: compact.membership.id,
    delegateeMembershipId: "20000000-0000-4000-8000-000000000002",
    state: "active",
    createdAt: "2026-02-01T00:00:00.000Z",
    revokedAt: null,
  };
  assert.equal(
    validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(state, NOW),
    null,
  );
});

test("an effective prospective exit is rendered as exited rather than still binding", () => {
  const state = buildRecruitingDatabaseState();
  activateFutureFlourishing(state);
  const compact = state.compacts[0];
  const exitRequestedAt = "2027-02-01T12:00:00.000Z";
  const exitEffectiveAt =
    calculateMpgfPublicGoodsCompactProspectiveExitDate(
      ACTIVATED_AT,
      exitRequestedAt,
    ).effectiveAt;

  compact.membership = {
    id: "20000000-0000-4000-8000-000000000001",
    compactId: compact.id as string,
    compactPublicKey: compact.publicKey,
    constitutionVersionAccepted: compact.constitutionVersion,
    acknowledgements: MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
    declaredEligibleMonthlySpendingCents: 12_345,
    scheduledMonthlyContributionCents: 123,
    status: "exit_notice",
    acceptedAt: ACTIVATED_AT,
    activatedAt: ACTIVATED_AT,
    revokedAt: null,
    exitRequestedAt,
    exitEffectiveAt,
  };

  const normalized =
    validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(state, NOW);

  assert.ok(normalized);
  assert.equal(normalized.compacts[0].membership?.status, "exited");
  assert.equal(normalized.compacts[0].delegation, null);
});

test("mutation responses fail closed on any money, mandate, membership, or reputation movement", () => {
  assert.deepEqual(
    assertMpgfPublicGoodsCompactMutationSafety({
      ok: true,
      moneyMoved: false,
      automaticCollectionEnabled: false,
    }),
    {
      ok: true,
      moneyMoved: false,
      automaticCollectionEnabled: false,
    },
  );

  for (const unsafe of [
    { moneyMoved: true },
    { automaticCollectionEnabled: true },
    { paymentMandateCreated: true },
    { moneyTransferred: true },
    { membershipTransferred: true },
    { reputationTransferred: true },
  ]) {
    assert.throws(
      () =>
        assertMpgfPublicGoodsCompactMutationSafety({ ok: true, ...unsafe }),
      /no-money safety boundary/,
    );
  }
});
