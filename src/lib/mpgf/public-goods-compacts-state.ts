import {
  MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE,
  MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION,
  MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS,
  MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS,
  MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
  MPGF_PUBLIC_GOODS_COMPACT_TERMS,
  calculateMpgfPublicGoodsCompactProspectiveExitDate,
  type MpgfPublicGoodsCompactMembership,
  type MpgfPublicGoodsCompactState,
  type MpgfPublicGoodsCompactsState,
} from "./public-goods-compacts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CYCLE_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;
const membershipStatuses = new Set([
  "pending_activation",
  "active",
  "exit_notice",
  "revoked",
  "exited",
]);
const unsafeMutationFlags = [
  "moneyMoved",
  "automaticCollectionEnabled",
  "paymentMandateCreated",
  "paymentMandateChanged",
  "moneyTransferred",
  "membershipTransferred",
  "reputationTransferred",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isNullDate(value: unknown): value is string | null {
  return value === null || isDate(value);
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function hasExactObject(value: unknown, expected: Record<string, unknown>) {
  if (!isRecord(value) || Object.keys(value).length !== Object.keys(expected).length) {
    return false;
  }
  return Object.entries(expected).every(
    ([key, expectedValue]) => value[key] === expectedValue,
  );
}

function hasExactTerms(value: unknown) {
  return hasExactObject(value, MPGF_PUBLIC_GOODS_COMPACT_TERMS);
}

function hasExactInvariants(value: unknown) {
  return hasExactObject(value, MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS);
}

function hasExactAcknowledgements(value: unknown) {
  return hasExactObject(
    value,
    MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
  );
}

function hasSafeObligation(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.cycleKey !== "string" ||
    !CYCLE_PATTERN.test(value.cycleKey) ||
    !isDate(value.priorMonthStart) ||
    !isDate(value.priorMonthEndExclusive) ||
    !["unavailable", "partial", "complete"].includes(String(value.coverage)) ||
    typeof value.coverageReason !== "string" ||
    value.coverageReason.length === 0 ||
    !isSafeNonNegativeInteger(value.sourceObservationCount)
  ) {
    return false;
  }

  const cycleStart = Date.parse(`${value.cycleKey}-01T00:00:00.000Z`);
  const priorStart = new Date(cycleStart);
  priorStart.setUTCMonth(priorStart.getUTCMonth() - 1);
  if (
    Date.parse(value.priorMonthStart) !== priorStart.getTime() ||
    Date.parse(value.priorMonthEndExclusive) !== cycleStart
  ) {
    return false;
  }

  if (value.coverage !== "complete") {
    return (
      value.eligibleNetSettledOutflowCents === null &&
      value.obligationCents === null &&
      value.sourceObservationCount === 0
    );
  }

  return (
    isSafeNonNegativeInteger(value.eligibleNetSettledOutflowCents) &&
    isSafeNonNegativeInteger(value.obligationCents) &&
    value.obligationCents ===
      Math.floor(
        value.eligibleNetSettledOutflowCents /
          MPGF_PUBLIC_GOODS_COMPACT_TERMS.obligationDivisor,
      )
  );
}

function hasSafeAllocation(
  value: unknown,
  obligation: Record<string, unknown>,
) {
  if (
    !isRecord(value) ||
    value.cycleKey !== obligation.cycleKey ||
    typeof value.instructionValid !== "boolean" ||
    typeof value.schedulingReady !== "boolean" ||
    !Array.isArray(value.allocations)
  ) {
    return false;
  }

  if (!value.instructionValid) {
    return (
      value.schedulingReady === false &&
      typeof value.reason === "string" &&
      value.reason.length > 0 &&
      value.scheduledTotalCents === null &&
      value.allocations.length === 0
    );
  }

  if (
    value.allocations.length === 0 ||
    (value.schedulingReady ? value.reason !== null : typeof value.reason !== "string")
  ) {
    return false;
  }

  const keys = new Set<string>();
  let allocationTotalBps = 0;
  let scheduledTotalCents = 0;
  for (const row of value.allocations) {
    if (
      !isRecord(row) ||
      typeof row.compactPublicKey !== "string" ||
      keys.has(row.compactPublicKey) ||
      !isSafeNonNegativeInteger(row.allocationBps) ||
      row.allocationBps > MPGF_PUBLIC_GOODS_COMPACT_TERMS.allocationTotalBps ||
      !(
        row.scheduledContributionCents === null ||
        isSafeNonNegativeInteger(row.scheduledContributionCents)
      )
    ) {
      return false;
    }
    keys.add(row.compactPublicKey);
    allocationTotalBps += row.allocationBps;
    if (row.scheduledContributionCents !== null) {
      scheduledTotalCents += row.scheduledContributionCents;
    }
  }

  if (
    allocationTotalBps !== MPGF_PUBLIC_GOODS_COMPACT_TERMS.allocationTotalBps
  ) {
    return false;
  }
  if (!value.schedulingReady) {
    return (
      value.scheduledTotalCents === null &&
      value.allocations.every(
        (row) =>
          (row as Record<string, unknown>).scheduledContributionCents === null,
      )
    );
  }
  return (
    value.reason === null &&
    isSafeNonNegativeInteger(value.scheduledTotalCents) &&
    value.scheduledTotalCents === obligation.obligationCents &&
    scheduledTotalCents === value.scheduledTotalCents
  );
}

function hasSafeReadiness(value: unknown, cycleKey: string) {
  if (
    !isRecord(value) ||
    value.cycleKey !== cycleKey ||
    !isNullDate(value.frozenAt) ||
    !isSafeNonNegativeInteger(value.fundingQualifiedUniquePersonCount) ||
    !isSafeNonNegativeInteger(value.scheduledContributionCents) ||
    typeof value.memberThresholdMet !== "boolean" ||
    typeof value.fundingThresholdMet !== "boolean" ||
    typeof value.thresholdReady !== "boolean" ||
    value.activationBlocked !== true ||
    !Array.isArray(value.blockers) ||
    value.blockers.length === 0 ||
    !value.blockers.every(
      (blocker) => typeof blocker === "string" && blocker.length > 0,
    )
  ) {
    return false;
  }

  const memberThresholdMet =
    value.fundingQualifiedUniquePersonCount >=
    MPGF_PUBLIC_GOODS_COMPACT_TERMS.readinessThresholdMembers;
  const fundingThresholdMet =
    value.scheduledContributionCents >=
    MPGF_PUBLIC_GOODS_COMPACT_TERMS.readinessThresholdScheduledCents;
  return (
    value.memberThresholdMet === memberThresholdMet &&
    value.fundingThresholdMet === fundingThresholdMet &&
    value.thresholdReady === (memberThresholdMet && fundingThresholdMet)
  );
}

function hasSafeMembership(
  value: unknown,
  compact: {
    id: string;
    publicKey: string;
    status: "recruiting" | "active";
    activatedAt: string | null;
  },
): value is MpgfPublicGoodsCompactMembership | null {
  if (value === null) return true;
  if (
    !isRecord(value) ||
    !isUuid(value.id) ||
    value.compactId !== compact.id ||
    value.compactPublicKey !== compact.publicKey ||
    value.constitutionVersionAccepted !==
      MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION ||
    !hasExactAcknowledgements(value.acknowledgements) ||
    typeof value.status !== "string" ||
    !membershipStatuses.has(value.status) ||
    !isDate(value.acceptedAt) ||
    !isNullDate(value.activatedAt) ||
    !isNullDate(value.revokedAt) ||
    !isNullDate(value.exitRequestedAt) ||
    !isNullDate(value.exitEffectiveAt) ||
    !(
      value.allocationBps === null ||
      (isSafeNonNegativeInteger(value.allocationBps) &&
        value.allocationBps <=
          MPGF_PUBLIC_GOODS_COMPACT_TERMS.allocationTotalBps)
    ) ||
    !(
      value.scheduledContributionCents === null ||
      isSafeNonNegativeInteger(value.scheduledContributionCents)
    ) ||
    !(
      value.netSettledContributionCents === null ||
      isSafeNonNegativeInteger(value.netSettledContributionCents)
    ) ||
    !["unqualified", "scheduled_qualified", "settled_qualified"].includes(
      String(value.fundingQualificationState),
    ) ||
    typeof value.fundingQualified !== "boolean" ||
    typeof value.identityQualified !== "boolean"
  ) {
    return false;
  }

  if (value.fundingQualified !== (value.fundingQualificationState !== "unqualified")) {
    return false;
  }
  if (value.fundingQualificationState === "scheduled_qualified" && (
    compact.status !== "recruiting" ||
    !value.identityQualified ||
    value.scheduledContributionCents === null ||
    value.scheduledContributionCents <
      MPGF_PUBLIC_GOODS_COMPACT_TERMS.fundingQualificationMinimumCents
  )) return false;
  if (value.fundingQualificationState === "settled_qualified" && (
    compact.status !== "active" ||
    !value.identityQualified ||
    value.netSettledContributionCents === null ||
    value.netSettledContributionCents <
      MPGF_PUBLIC_GOODS_COMPACT_TERMS.fundingQualificationMinimumCents
  )) return false;
  if (value.status === "pending_activation" && compact.status !== "recruiting") {
    return false;
  }
  if (
    value.status === "active" &&
    (compact.status !== "active" || value.activatedAt !== compact.activatedAt)
  ) {
    return false;
  }
  if (value.status === "revoked" && (!value.revokedAt || value.activatedAt !== null)) {
    return false;
  }
  if (
    value.status === "exit_notice" &&
    (!value.exitRequestedAt || !value.exitEffectiveAt || !compact.activatedAt)
  ) {
    return false;
  }
  if (value.status === "exit_notice" && compact.activatedAt) {
    try {
      if (
        Date.parse(value.exitEffectiveAt as string) !==
        Date.parse(
          calculateMpgfPublicGoodsCompactProspectiveExitDate(
            compact.activatedAt,
            value.exitRequestedAt as string,
          ).effectiveAt,
        )
      ) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

function hasSafeCompact(
  value: unknown,
  cycleKey: string,
): value is MpgfPublicGoodsCompactState {
  if (!isRecord(value)) return false;
  const charter = MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.find(
    (candidate) => candidate.publicKey === value.publicKey,
  );
  if (
    !charter ||
    !isUuid(value.id) ||
    value.causeKey !== charter.causeKey ||
    value.title !== charter.title ||
    value.summary !== charter.summary ||
    value.constitutionVersion !== MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION ||
    !hasExactTerms(value.terms) ||
    !hasExactInvariants(value.invariants) ||
    value.collectionState !== MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE ||
    !["recruiting", "active"].includes(String(value.status)) ||
    !isSafeNonNegativeInteger(value.acceptedMemberCount) ||
    value.memberCountAvailable !== true ||
    !hasSafeReadiness(value.readiness, cycleKey) ||
    !isRecord(value.activation) ||
    !isRecord(value.allocationElectorate) ||
    typeof value.allocationElectorate.active !== "boolean"
  ) {
    return false;
  }

  const status = value.status as "recruiting" | "active";
  const activation = value.activation;
  if (status === "recruiting") {
    const expectedState = (value.readiness as Record<string, unknown>)
      .thresholdReady
      ? "threshold_ready_activation_blocked"
      : "recruiting";
    if (
      activation.state !== expectedState ||
      activation.activatedAt !== null ||
      activation.constitutionFrozenAt !== null ||
      activation.frozenConstitutionVersion !== null ||
      activation.minimumTermEndsAt !== null ||
      value.allocationElectorate.active !== false ||
      value.allocationElectorate.key !== null
    ) {
      return false;
    }
  } else if (
    activation.state !== "active" ||
    !isDate(activation.activatedAt) ||
    activation.constitutionFrozenAt !== activation.activatedAt ||
    activation.frozenConstitutionVersion !==
      MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION ||
    !isDate(activation.minimumTermEndsAt) ||
    !(
      (value.allocationElectorate.active === false &&
        value.allocationElectorate.key === null) ||
      (value.allocationElectorate.active === true &&
        value.allocationElectorate.key === cycleKey)
    )
  ) {
    return false;
  }

  if (
    !hasSafeMembership(value.membership, {
      id: value.id as string,
      publicKey: value.publicKey as string,
      status,
      activatedAt: activation.activatedAt as string | null,
    })
  ) {
    return false;
  }

  if (value.delegation !== null) {
    const membership = value.membership as MpgfPublicGoodsCompactMembership | null;
    if (
      !isRecord(value.delegation) ||
      !membership?.fundingQualified ||
      membership.fundingQualificationState !== "settled_qualified" ||
      !value.allocationElectorate.active ||
      !isUuid(value.delegation.id) ||
      value.delegation.compactId !== value.id ||
      value.delegation.cycleKey !== cycleKey ||
      value.delegation.delegatorMembershipId !== membership.id ||
      !isUuid(value.delegation.delegateeMembershipId) ||
      value.delegation.delegateeMembershipId === membership.id ||
      !["active", "revoked"].includes(String(value.delegation.state)) ||
      !isDate(value.delegation.createdAt) ||
      !isNullDate(value.delegation.revokedAt)
    ) {
      return false;
    }
  }
  return true;
}

function allocationMatchesMemberships(
  state: MpgfPublicGoodsCompactsState,
) {
  const joined = state.compacts.filter(
    (compact) =>
      compact.membership &&
      !["revoked", "exited"].includes(compact.membership.status),
  );
  if (!state.allocation.instructionValid) return true;

  const allocations = new Map(
    state.allocation.allocations.map((row) => [row.compactPublicKey, row]),
  );
  if (
    allocations.size !== joined.length ||
    joined.some((compact) => !allocations.has(compact.publicKey))
  ) {
    return false;
  }
  return joined.every((compact) => {
    const allocation = allocations.get(compact.publicKey);
    const membership = compact.membership;
    return (
      membership &&
      allocation &&
      membership.allocationBps === allocation.allocationBps &&
      membership.scheduledContributionCents ===
        allocation.scheduledContributionCents
    );
  });
}

export function validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(
  value: unknown,
  now: Date | string = new Date(),
): MpgfPublicGoodsCompactsState | null {
  if (
    !isRecord(value) ||
    value.available !== true ||
    value.source !== "database" ||
    value.unavailableReason !== null ||
    value.moneyMovesOnPageAction !== false ||
    value.automaticCollectionEnabled !== false ||
    !hasSafeObligation(value.obligation) ||
    !isRecord(value.obligation) ||
    !hasSafeAllocation(value.allocation, value.obligation) ||
    !isRecord(value.allocation) ||
    !Array.isArray(value.compacts) ||
    value.compacts.length !== MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.length
  ) {
    return null;
  }

  const obligationCycleKey = value.obligation.cycleKey;
  if (
    typeof obligationCycleKey !== "string" ||
    !value.compacts.every((compact) =>
      hasSafeCompact(compact, obligationCycleKey),
    )
  ) {
    return null;
  }

  const typed = value as unknown as MpgfPublicGoodsCompactsState;
  if (
    new Set(typed.compacts.map((compact) => compact.publicKey)).size !==
      typed.compacts.length ||
    !allocationMatchesMemberships(typed)
  ) {
    return null;
  }

  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(nowMs)) return null;
  return {
    ...typed,
    compacts: typed.compacts.map((compact) => {
      if (
        compact.membership?.status !== "exit_notice" ||
        !compact.membership.exitEffectiveAt ||
        Date.parse(compact.membership.exitEffectiveAt) > nowMs
      ) {
        return compact;
      }
      return {
        ...compact,
        membership: { ...compact.membership, status: "exited" },
        delegation: null,
      };
    }),
  };
}

export function assertMpgfPublicGoodsCompactMutationSafety(value: unknown) {
  if (!isRecord(value) || value.ok !== true) {
    throw new Error("The Compact v2 mutation returned an invalid response.");
  }
  for (const flag of unsafeMutationFlags) {
    if (flag in value && value[flag] !== false) {
      throw new Error(
        `Compact no-money safety boundary failed: ${flag} must be false.`,
      );
    }
  }
  return value;
}
