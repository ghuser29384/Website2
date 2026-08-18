import assert from "node:assert/strict";
import test from "node:test";

import {
  MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS,
  MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
  calculateMpgfPublicGoodsCompactProspectiveExitDate,
  calculateMpgfPublicGoodsCompactReadiness,
  type MpgfPublicGoodsCompactMembership,
  type MpgfPublicGoodsCompactsState,
} from "./public-goods-compacts";
import {
  assertMpgfPublicGoodsCompactMutationSafety,
  validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState,
} from "./public-goods-compacts-state";

const NOW = new Date("2027-03-15T00:00:00.000Z");
const CYCLE_KEY = "2027-03";
const ACTIVATED_AT = "2026-01-31T12:00:00.000Z";

function buildRecruitingDatabaseState(): MpgfPublicGoodsCompactsState {
  return {
    available: true,
    source: "database",
    unavailableReason: null,
    obligation: {
      cycleKey: CYCLE_KEY,
      priorMonthStart: "2027-02-01T00:00:00.000Z",
      priorMonthEndExclusive: "2027-03-01T00:00:00.000Z",
      coverage: "unavailable",
      coverageReason: "Authoritative complete ledger coverage is unavailable.",
      eligibleNetSettledOutflowCents: null,
      obligationCents: null,
      sourceObservationCount: 0,
    },
    allocation: {
      cycleKey: CYCLE_KEY,
      instructionValid: false,
      schedulingReady: false,
      reason: "Join a Compact before allocating.",
      allocations: [],
      scheduledTotalCents: null,
    },
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
        readiness: calculateMpgfPublicGoodsCompactReadiness({
          cycleKey: CYCLE_KEY,
          members: [],
        }),
        allocationElectorate: { active: false, key: null },
        membership: null,
        delegation: null,
      }),
    ),
    moneyMovesOnPageAction: false,
    automaticCollectionEnabled: false,
  };
}

function activeMembership(
  compact: MpgfPublicGoodsCompactsState["compacts"][number],
): MpgfPublicGoodsCompactMembership {
  return {
    id: "20000000-0000-4000-8000-000000000001",
    compactId: compact.id as string,
    compactPublicKey: compact.publicKey,
    constitutionVersionAccepted: compact.constitutionVersion,
    acknowledgements: MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
    status: "active",
    acceptedAt: ACTIVATED_AT,
    activatedAt: ACTIVATED_AT,
    revokedAt: null,
    exitRequestedAt: null,
    exitEffectiveAt: null,
    allocationBps: 10_000,
    scheduledContributionCents: null,
    netSettledContributionCents: null,
    fundingQualificationState: "unqualified",
    fundingQualified: false,
    identityQualified: false,
  };
}

function activateFutureFlourishing(state: MpgfPublicGoodsCompactsState) {
  const compact = state.compacts[0];
  compact.status = "active";
  compact.acceptedMemberCount = 100;
  compact.activation = {
    state: "active",
    activatedAt: ACTIVATED_AT,
    constitutionFrozenAt: ACTIVATED_AT,
    frozenConstitutionVersion: compact.constitutionVersion,
    minimumTermEndsAt: calculateMpgfPublicGoodsCompactProspectiveExitDate(
      ACTIVATED_AT,
      ACTIVATED_AT,
    ).minimumTermEndsAt,
  };
}

function setSingleAllocation(
  state: MpgfPublicGoodsCompactsState,
  membership: MpgfPublicGoodsCompactMembership,
) {
  state.allocation = {
    cycleKey: CYCLE_KEY,
    instructionValid: true,
    schedulingReady: false,
    reason:
      "Authoritative prior-month coverage and dormant authorization are unavailable.",
    allocations: [
      {
        compactPublicKey: membership.compactPublicKey,
        allocationBps: 10_000,
        scheduledContributionCents: null,
      },
    ],
    scheduledTotalCents: null,
  };
}

test("complete fail-closed recruiting database state is accepted", () => {
  const state = buildRecruitingDatabaseState();
  assert.deepEqual(
    validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(state, NOW),
    state,
  );
});

test("state validation accepts threshold-ready while still activation-blocked", () => {
  const state = buildRecruitingDatabaseState();
  const compact = state.compacts[0];
  compact.readiness = {
    ...compact.readiness,
    fundingQualifiedUniquePersonCount: 100,
    scheduledContributionCents: 50_000,
    memberThresholdMet: true,
    fundingThresholdMet: true,
    thresholdReady: true,
    frozenAt: "2027-03-01T00:00:00.000Z",
  };
  compact.activation.state = "threshold_ready_activation_blocked";
  assert.ok(validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(state, NOW));
  assert.equal(compact.status, "recruiting");
});

test("state validation rejects charter drift and recruiting electorates", () => {
  const summaryDrift = buildRecruitingDatabaseState();
  summaryDrift.compacts[0].summary = "Unaccepted replacement summary.";
  assert.equal(
    validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(summaryDrift, NOW),
    null,
  );

  const recruitingElectorate = buildRecruitingDatabaseState();
  recruitingElectorate.compacts[0].allocationElectorate = {
    active: true,
    key: CYCLE_KEY,
  };
  assert.equal(
    validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(
      recruitingElectorate,
      NOW,
    ),
    null,
  );
});

test("state validation rejects allocation drift and unsafe funding qualification", () => {
  const state = buildRecruitingDatabaseState();
  activateFutureFlourishing(state);
  const compact = state.compacts[0];
  compact.membership = activeMembership(compact);
  setSingleAllocation(state, compact.membership);
  compact.membership.fundingQualified = true;
  assert.equal(
    validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(state, NOW),
    null,
  );

  compact.membership.fundingQualified = false;
  compact.membership.allocationBps = 5_000;
  assert.equal(
    validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(state, NOW),
    null,
  );
});

test("a revoked recruiting membership remains safe after later activation", () => {
  const state = buildRecruitingDatabaseState();
  const compact = state.compacts[0];
  compact.membership = {
    ...activeMembership(compact),
    status: "revoked",
    acceptedAt: "2026-01-01T00:00:00.000Z",
    activatedAt: null,
    revokedAt: "2026-01-15T00:00:00.000Z",
    allocationBps: null,
  };
  activateFutureFlourishing(state);
  const normalized = validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(
    state,
    NOW,
  );
  assert.ok(normalized);
  assert.equal(normalized.compacts[0].membership?.status, "revoked");
});

test("an effective prospective exit is rendered as exited", () => {
  const state = buildRecruitingDatabaseState();
  activateFutureFlourishing(state);
  const compact = state.compacts[0];
  const exitRequestedAt = "2027-02-01T12:00:00.000Z";
  const exitEffectiveAt = calculateMpgfPublicGoodsCompactProspectiveExitDate(
    ACTIVATED_AT,
    exitRequestedAt,
  ).effectiveAt;
  compact.membership = {
    ...activeMembership(compact),
    status: "exit_notice",
    exitRequestedAt,
    exitEffectiveAt,
  };
  setSingleAllocation(state, compact.membership);

  const normalized = validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(
    state,
    NOW,
  );
  assert.ok(normalized);
  assert.equal(normalized.compacts[0].membership?.status, "exited");
  assert.equal(normalized.compacts[0].delegation, null);
});

test("mutation responses fail closed on money, mandate, membership, or reputation movement", () => {
  assert.deepEqual(
    assertMpgfPublicGoodsCompactMutationSafety({
      ok: true,
      moneyMoved: false,
      automaticCollectionEnabled: false,
    }),
    { ok: true, moneyMoved: false, automaticCollectionEnabled: false },
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
      () => assertMpgfPublicGoodsCompactMutationSafety({ ok: true, ...unsafe }),
      /no-money safety boundary/,
    );
  }
});
