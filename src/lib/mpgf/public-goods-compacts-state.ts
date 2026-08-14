import {
  MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE,
  MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION,
  MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS,
  MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS,
  MPGF_PUBLIC_GOODS_COMPACT_MAX_DECLARED_SPENDING_CENTS,
  MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
  MPGF_PUBLIC_GOODS_COMPACT_TERMS,
  calculateMpgfPublicGoodsCompactContributionCents,
  calculateMpgfPublicGoodsCompactProspectiveExitDate,
  type MpgfPublicGoodsCompactMembership,
  type MpgfPublicGoodsCompactState,
  type MpgfPublicGoodsCompactsState,
} from "./public-goods-compacts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ELECTORATE_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,159}$/;

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

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isNullOrValidDate(value: unknown): value is string | null {
  return value === null || isValidDate(value);
}

function hasExactAcknowledgements(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  const requiredKeys = Object.keys(
    MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
  );

  return (
    Object.keys(value).length === requiredKeys.length &&
    requiredKeys.every((key) => value[key] === true)
  );
}

function hasExactTerms(value: unknown) {
  return (
    isRecord(value) &&
    value.contributionRateBps ===
      MPGF_PUBLIC_GOODS_COMPACT_TERMS.contributionRateBps &&
    value.monthlyContributionCapCents ===
      MPGF_PUBLIC_GOODS_COMPACT_TERMS.monthlyContributionCapCents &&
    value.activationThresholdMembers ===
      MPGF_PUBLIC_GOODS_COMPACT_TERMS.activationThresholdMembers &&
    value.minimumTermMonths ===
      MPGF_PUBLIC_GOODS_COMPACT_TERMS.minimumTermMonths &&
    value.exitNoticeDays === MPGF_PUBLIC_GOODS_COMPACT_TERMS.exitNoticeDays &&
    value.projectSelectionRule ===
      MPGF_PUBLIC_GOODS_COMPACT_TERMS.projectSelectionRule &&
    value.auditRule === MPGF_PUBLIC_GOODS_COMPACT_TERMS.auditRule &&
    value.noProjectOptOutRule ===
      MPGF_PUBLIC_GOODS_COMPACT_TERMS.noProjectOptOutRule
  );
}

function hasExactInvariants(value: unknown) {
  return (
    isRecord(value) &&
    value.optInOnly === MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.optInOnly &&
    value.randomAssignmentAllowed ===
      MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.randomAssignmentAllowed &&
    value.coreMarketplaceTaxed ===
      MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.coreMarketplaceTaxed &&
    value.bindingOnlyAfterActivation ===
      MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.bindingOnlyAfterActivation &&
    value.perProjectRefusalAllowedAfterActivation ===
      MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS
        .perProjectRefusalAllowedAfterActivation &&
    value.exitProspectiveOnlyAfterActivation ===
      MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS
        .exitProspectiveOnlyAfterActivation &&
    value.moneyMovesOnJoin ===
      MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.moneyMovesOnJoin &&
    value.automaticCollectionEnabled ===
      MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.automaticCollectionEnabled
  );
}

function hasSafeActivation(
  value: unknown,
  compactStatus: "recruiting" | "active",
  acceptedMemberCount: number,
) {
  if (!isRecord(value)) {
    return false;
  }

  if (compactStatus === "recruiting") {
    return (
      acceptedMemberCount <
        MPGF_PUBLIC_GOODS_COMPACT_TERMS.activationThresholdMembers &&
      value.state === "recruiting" &&
      value.activatedAt === null &&
      value.constitutionFrozenAt === null &&
      value.frozenConstitutionVersion === null &&
      value.minimumTermEndsAt === null
    );
  }

  if (
    acceptedMemberCount <
      MPGF_PUBLIC_GOODS_COMPACT_TERMS.activationThresholdMembers ||
    value.state !== "threshold_reached_constitution_frozen" ||
    !isValidDate(value.activatedAt) ||
    !isValidDate(value.constitutionFrozenAt) ||
    value.frozenConstitutionVersion !==
      MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION ||
    !isValidDate(value.minimumTermEndsAt) ||
    Date.parse(value.constitutionFrozenAt) !== Date.parse(value.activatedAt)
  ) {
    return false;
  }

  try {
    const expectedMinimumTermEnd =
      calculateMpgfPublicGoodsCompactProspectiveExitDate(
        value.activatedAt,
        value.activatedAt,
      ).minimumTermEndsAt;

    return (
      Date.parse(value.minimumTermEndsAt) === Date.parse(expectedMinimumTermEnd)
    );
  } catch {
    return false;
  }
}

function hasSafeElectorate(
  value: unknown,
  compactStatus: "recruiting" | "active",
) {
  if (!isRecord(value) || typeof value.active !== "boolean") {
    return false;
  }

  if (!value.active) {
    return value.key === null;
  }

  return (
    compactStatus === "active" &&
    typeof value.key === "string" &&
    ELECTORATE_KEY_PATTERN.test(value.key)
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
  nowMs: number,
): value is MpgfPublicGoodsCompactMembership | null {
  if (value === null) {
    return true;
  }

  if (
    !isRecord(value) ||
    !isUuid(value.id) ||
    value.compactId !== compact.id ||
    value.compactPublicKey !== compact.publicKey ||
    value.constitutionVersionAccepted !==
      MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION ||
    !hasExactAcknowledgements(value.acknowledgements) ||
    !Number.isSafeInteger(value.declaredEligibleMonthlySpendingCents) ||
    (value.declaredEligibleMonthlySpendingCents as number) < 0 ||
    (value.declaredEligibleMonthlySpendingCents as number) >
      MPGF_PUBLIC_GOODS_COMPACT_MAX_DECLARED_SPENDING_CENTS ||
    !Number.isSafeInteger(value.scheduledMonthlyContributionCents) ||
    typeof value.status !== "string" ||
    !membershipStatuses.has(value.status) ||
    !isValidDate(value.acceptedAt) ||
    !isNullOrValidDate(value.activatedAt) ||
    !isNullOrValidDate(value.revokedAt) ||
    !isNullOrValidDate(value.exitRequestedAt) ||
    !isNullOrValidDate(value.exitEffectiveAt)
  ) {
    return false;
  }

  try {
    if (
      value.scheduledMonthlyContributionCents !==
      calculateMpgfPublicGoodsCompactContributionCents(
        value.declaredEligibleMonthlySpendingCents as number,
      )
    ) {
      return false;
    }
  } catch {
    return false;
  }

  if (value.status === "pending_activation") {
    return (
      compact.status === "recruiting" &&
      value.activatedAt === null &&
      value.revokedAt === null &&
      value.exitRequestedAt === null &&
      value.exitEffectiveAt === null
    );
  }

  if (value.status === "revoked") {
    return (
      value.activatedAt === null &&
      isValidDate(value.revokedAt) &&
      value.exitRequestedAt === null &&
      value.exitEffectiveAt === null
    );
  }

  if (
    compact.status !== "active" ||
    !isValidDate(compact.activatedAt) ||
    !isValidDate(value.activatedAt) ||
    Date.parse(value.activatedAt) < Date.parse(compact.activatedAt) ||
    value.revokedAt !== null
  ) {
    return false;
  }

  if (value.status === "active") {
    return value.exitRequestedAt === null && value.exitEffectiveAt === null;
  }

  if (
    !isValidDate(value.exitRequestedAt) ||
    !isValidDate(value.exitEffectiveAt)
  ) {
    return false;
  }

  try {
    const expectedExit = calculateMpgfPublicGoodsCompactProspectiveExitDate(
      compact.activatedAt,
      value.exitRequestedAt,
    ).effectiveAt;

    if (Date.parse(value.exitEffectiveAt) !== Date.parse(expectedExit)) {
      return false;
    }
  } catch {
    return false;
  }

  return value.status === "exit_notice"
    ? true
    : value.status === "exited" && Date.parse(value.exitEffectiveAt) <= nowMs;
}

function hasSafeDelegation(
  value: unknown,
  compact: {
    id: string;
    status: "recruiting" | "active";
    electorateActive: boolean;
    electorateKey: string | null;
    membership: MpgfPublicGoodsCompactMembership | null;
  },
) {
  if (value === null) {
    return true;
  }

  return Boolean(
    compact.status === "active" &&
      compact.electorateActive &&
      compact.electorateKey &&
      compact.membership?.status === "active" &&
      isRecord(value) &&
      isUuid(value.id) &&
      value.compactId === compact.id &&
      value.electorateKey === compact.electorateKey &&
      value.delegatorMembershipId === compact.membership.id &&
      isUuid(value.delegateeMembershipId) &&
      value.delegateeMembershipId !== compact.membership.id &&
      value.state === "active" &&
      isValidDate(value.createdAt) &&
      value.revokedAt === null,
  );
}

function hasSafeCompactState(value: unknown, nowMs: number) {
  if (!isRecord(value) || !isUuid(value.id)) {
    return false;
  }

  const foundingCharter = MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.find(
    (charter) => charter.publicKey === value.publicKey,
  );
  const status =
    value.status === "recruiting" || value.status === "active"
      ? value.status
      : null;
  const acceptedMemberCount = Number.isSafeInteger(value.acceptedMemberCount)
    ? (value.acceptedMemberCount as number)
    : null;

  if (
    !foundingCharter ||
    !status ||
    acceptedMemberCount === null ||
    acceptedMemberCount < 0 ||
    value.causeKey !== foundingCharter.causeKey ||
    value.title !== foundingCharter.title ||
    value.summary !== foundingCharter.summary ||
    value.constitutionVersion !==
      MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION ||
    value.collectionState !== MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE ||
    value.memberCountAvailable !== true ||
    !hasExactTerms(value.terms) ||
    !hasExactInvariants(value.invariants) ||
    !hasSafeActivation(value.activation, status, acceptedMemberCount) ||
    !hasSafeElectorate(value.allocationElectorate, status)
  ) {
    return false;
  }

  const activation = value.activation as Record<string, unknown>;
  const electorate = value.allocationElectorate as Record<string, unknown>;
  const compactContext = {
    id: value.id,
    publicKey: foundingCharter.publicKey,
    status,
    activatedAt:
      typeof activation.activatedAt === "string"
        ? activation.activatedAt
        : null,
  } as const;

  if (!hasSafeMembership(value.membership, compactContext, nowMs)) {
    return false;
  }

  return hasSafeDelegation(value.delegation, {
    id: value.id,
    status,
    electorateActive: electorate.active === true,
    electorateKey:
      typeof electorate.key === "string" ? electorate.key : null,
    membership: value.membership,
  });
}

function normalizeEffectiveExits(
  state: MpgfPublicGoodsCompactsState,
  nowMs: number,
): MpgfPublicGoodsCompactsState {
  return {
    ...state,
    compacts: state.compacts.map((compact) => {
      const membership = compact.membership;

      if (
        membership?.status !== "exit_notice" ||
        !membership.exitEffectiveAt ||
        Date.parse(membership.exitEffectiveAt) > nowMs
      ) {
        return compact;
      }

      return {
        ...compact,
        membership: {
          ...membership,
          status: "exited",
        },
      };
    }),
  };
}

export function validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(
  value: unknown,
  now: Date = new Date(),
): MpgfPublicGoodsCompactsState | null {
  const nowMs = now.getTime();

  if (
    !Number.isFinite(nowMs) ||
    !isRecord(value) ||
    value.available !== true ||
    value.source !== "database" ||
    value.unavailableReason !== null ||
    !Array.isArray(value.compacts) ||
    value.compacts.length !== MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.length ||
    value.moneyMovesOnPageAction !== false ||
    value.automaticCollectionEnabled !== false ||
    !value.compacts.every((compact) => hasSafeCompactState(compact, nowMs))
  ) {
    return null;
  }

  const compactKeys = value.compacts.map(
    (compact) => (compact as Record<string, unknown>).publicKey,
  );
  const expectedKeys = new Set<string>(
    MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.map(
      (charter) => charter.publicKey,
    ),
  );

  if (
    new Set(compactKeys).size !== expectedKeys.size ||
    compactKeys.some((key) => !expectedKeys.has(key as string))
  ) {
    return null;
  }

  return normalizeEffectiveExits(
    value as unknown as MpgfPublicGoodsCompactsState,
    nowMs,
  );
}

export function assertMpgfPublicGoodsCompactMutationSafety(value: unknown) {
  if (!isRecord(value) || value.ok !== true) {
    throw new Error("The public-goods compact mutation returned an invalid response.");
  }

  for (const flag of unsafeMutationFlags) {
    if (value[flag] === true) {
      throw new Error(
        "The public-goods compact mutation violated the no-money safety boundary.",
      );
    }
  }

  return value;
}
