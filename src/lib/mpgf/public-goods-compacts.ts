export const MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION =
  "mpgf-public-goods-compact/founding-v1";

export const MPGF_PUBLIC_GOODS_COMPACT_TERMS = {
  contributionRateBps: 100,
  monthlyContributionCapCents: 1_000,
  activationThresholdMembers: 5_000,
  minimumTermMonths: 12,
  exitNoticeDays: 30,
  projectSelectionRule:
    "One member, one voting credit, with revocable delegation under published rules.",
  auditRule:
    "Independent review and audit, additionality checks, conflict and recusal rules, minority protections, and public post-round reporting are required.",
  noProjectOptOutRule:
    "After activation, members may not refuse individual selected projects.",
} as const;

export const MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS = {
  optInOnly: true,
  randomAssignmentAllowed: false,
  coreMarketplaceTaxed: false,
  bindingOnlyAfterActivation: true,
  perProjectRefusalAllowedAfterActivation: false,
  exitProspectiveOnlyAfterActivation: true,
  moneyMovesOnJoin: false,
  automaticCollectionEnabled: false,
} as const;

export const MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE =
  "disabled_pending_legal_fiscal_sponsor_provider_donor_of_record_receipt_custody_sanctions_and_production_release_gates" as const;

export const MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS = {
  voluntaryChoice: true,
  exactConstitution: true,
  activationAndNoProjectOptOut: true,
  noPaymentMandate: true,
} as const;

export const MPGF_PUBLIC_GOODS_COMPACT_MAX_DECLARED_SPENDING_CENTS =
  100_000_000_000;

export type MpgfPublicGoodsCompactCauseKey =
  | "future_flourishing"
  | "animal_welfare"
  | "global_health";

export type MpgfPublicGoodsCompactStatus = "recruiting" | "active";

export type MpgfPublicGoodsCompactMembershipStatus =
  | "pending_activation"
  | "active"
  | "exit_notice"
  | "revoked"
  | "exited";

export type MpgfPublicGoodsCompactActivationState =
  | "recruiting"
  | "threshold_reached_constitution_frozen";

export type MpgfPublicGoodsCompactDelegationState =
  | "unavailable"
  | "available"
  | "active"
  | "revoked";

export type MpgfPublicGoodsCompactCollectionState =
  typeof MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE;

export type MpgfPublicGoodsCompactAcknowledgements =
  typeof MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS;

export interface MpgfPublicGoodsCompactCharter {
  publicKey: string;
  causeKey: MpgfPublicGoodsCompactCauseKey;
  title: string;
  summary: string;
  constitutionVersion: typeof MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION;
  terms: typeof MPGF_PUBLIC_GOODS_COMPACT_TERMS;
  invariants: typeof MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS;
  collectionState: MpgfPublicGoodsCompactCollectionState;
}

export interface MpgfPublicGoodsCompactActivation {
  state: MpgfPublicGoodsCompactActivationState;
  activatedAt: string | null;
  constitutionFrozenAt: string | null;
  frozenConstitutionVersion: string | null;
  minimumTermEndsAt: string | null;
}

export interface MpgfPublicGoodsCompactMembership {
  id: string;
  compactId: string;
  compactPublicKey: string;
  constitutionVersionAccepted: string;
  acknowledgements: MpgfPublicGoodsCompactAcknowledgements;
  declaredEligibleMonthlySpendingCents: number;
  scheduledMonthlyContributionCents: number;
  status: MpgfPublicGoodsCompactMembershipStatus;
  acceptedAt: string;
  activatedAt: string | null;
  revokedAt: string | null;
  exitRequestedAt: string | null;
  exitEffectiveAt: string | null;
}

export interface MpgfPublicGoodsCompactDelegation {
  id: string;
  compactId: string;
  electorateKey: string;
  delegatorMembershipId: string;
  delegateeMembershipId: string;
  state: Extract<MpgfPublicGoodsCompactDelegationState, "active" | "revoked">;
  createdAt: string;
  revokedAt: string | null;
}

export interface MpgfPublicGoodsCompactState extends MpgfPublicGoodsCompactCharter {
  id: string | null;
  status: MpgfPublicGoodsCompactStatus;
  acceptedMemberCount: number | null;
  memberCountAvailable: boolean;
  activation: MpgfPublicGoodsCompactActivation;
  allocationElectorate: {
    active: boolean;
    key: string | null;
  };
  membership: MpgfPublicGoodsCompactMembership | null;
  delegation: MpgfPublicGoodsCompactDelegation | null;
}

export interface MpgfPublicGoodsCompactsState {
  available: boolean;
  source: "database" | "published_charter_examples";
  unavailableReason: string | null;
  compacts: MpgfPublicGoodsCompactState[];
  moneyMovesOnPageAction: false;
  automaticCollectionEnabled: false;
}

export const MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS = [
  {
    publicKey: "future-flourishing",
    causeKey: "future_flourishing",
    title: "Future Flourishing",
    summary:
      "Long-horizon public goods that protect the conditions for future people to flourish.",
    constitutionVersion: MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION,
    terms: MPGF_PUBLIC_GOODS_COMPACT_TERMS,
    invariants: MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS,
    collectionState: MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE,
  },
  {
    publicKey: "animal-welfare",
    causeKey: "animal_welfare",
    title: "Animal Welfare",
    summary:
      "Evidence-led public goods that reduce severe animal suffering and improve welfare systems.",
    constitutionVersion: MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION,
    terms: MPGF_PUBLIC_GOODS_COMPACT_TERMS,
    invariants: MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS,
    collectionState: MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE,
  },
  {
    publicKey: "global-health",
    causeKey: "global_health",
    title: "Global Health",
    summary:
      "Shared health interventions and institutional capacity with independently reviewed evidence.",
    constitutionVersion: MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION,
    terms: MPGF_PUBLIC_GOODS_COMPACT_TERMS,
    invariants: MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS,
    collectionState: MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE,
  },
] as const satisfies readonly MpgfPublicGoodsCompactCharter[];

function assertSafeNonNegativeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

function asValidDate(value: Date | string, label: string) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return date;
}

function addUtcCalendarMonths(value: Date, months: number) {
  const result = new Date(value.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function calculateMpgfPublicGoodsCompactContributionCents(
  declaredEligibleMonthlySpendingCents: number,
) {
  assertSafeNonNegativeInteger(
    declaredEligibleMonthlySpendingCents,
    "Declared eligible monthly spending cents",
  );

  if (
    declaredEligibleMonthlySpendingCents >
    MPGF_PUBLIC_GOODS_COMPACT_MAX_DECLARED_SPENDING_CENTS
  ) {
    throw new Error("Declared eligible monthly spending exceeds the supported maximum.");
  }

  const onePercentRoundedDown = Math.floor(
    declaredEligibleMonthlySpendingCents / 100,
  );

  return Math.min(
    onePercentRoundedDown,
    MPGF_PUBLIC_GOODS_COMPACT_TERMS.monthlyContributionCapCents,
  );
}

export function parseMpgfPublicGoodsCompactSpendingToCents(value: string) {
  const trimmed = value.trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) {
    throw new Error("Enter a non-negative dollar amount with at most two decimals.");
  }

  const [dollars, fraction = ""] = trimmed.split(".");
  const cents =
    Number.parseInt(dollars, 10) * 100 +
    Number.parseInt(fraction.padEnd(2, "0") || "0", 10);

  assertSafeNonNegativeInteger(cents, "Declared eligible monthly spending cents");

  if (cents > MPGF_PUBLIC_GOODS_COMPACT_MAX_DECLARED_SPENDING_CENTS) {
    throw new Error("Declared eligible monthly spending exceeds the supported maximum.");
  }

  return cents;
}

export function calculateMpgfPublicGoodsCompactActivationProgress(
  acceptedMemberCount: number,
  activationThreshold = MPGF_PUBLIC_GOODS_COMPACT_TERMS.activationThresholdMembers,
) {
  assertSafeNonNegativeInteger(acceptedMemberCount, "Accepted member count");

  if (!Number.isSafeInteger(activationThreshold) || activationThreshold <= 0) {
    throw new Error("Activation threshold must be a positive integer.");
  }

  const progressBps = Math.min(
    10_000,
    Math.floor((acceptedMemberCount * 10_000) / activationThreshold),
  );

  return {
    acceptedMemberCount,
    activationThreshold,
    remainingMemberCount: Math.max(0, activationThreshold - acceptedMemberCount),
    progressBps,
    thresholdReached: acceptedMemberCount >= activationThreshold,
  } as const;
}

export function calculateMpgfPublicGoodsCompactProspectiveExitDate(
  activationAt: Date | string,
  exitRequestedAt: Date | string,
) {
  const activation = asValidDate(activationAt, "Activation time");
  const requested = asValidDate(exitRequestedAt, "Exit request time");

  if (requested.getTime() < activation.getTime()) {
    throw new Error("Exit request time cannot precede compact activation.");
  }

  const minimumTermEndsAt = addUtcCalendarMonths(
    activation,
    MPGF_PUBLIC_GOODS_COMPACT_TERMS.minimumTermMonths,
  );
  const noticeEndsAt = new Date(requested.getTime());
  noticeEndsAt.setUTCDate(
    noticeEndsAt.getUTCDate() + MPGF_PUBLIC_GOODS_COMPACT_TERMS.exitNoticeDays,
  );
  const effectiveAt = new Date(
    Math.max(minimumTermEndsAt.getTime(), noticeEndsAt.getTime()),
  );

  return {
    minimumTermEndsAt: minimumTermEndsAt.toISOString(),
    noticeEndsAt: noticeEndsAt.toISOString(),
    effectiveAt: effectiveAt.toISOString(),
  } as const;
}

export function buildMpgfPublicGoodsCompactPublishedExamplesState(): MpgfPublicGoodsCompactsState {
  return {
    available: false,
    source: "published_charter_examples",
    unavailableReason:
      "Durable compact membership state is unavailable. Published charter examples are shown without member counts or participant activity.",
    compacts: MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.map((charter) => ({
      ...charter,
      id: null,
      status: "recruiting",
      acceptedMemberCount: null,
      memberCountAvailable: false,
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
    })),
    moneyMovesOnPageAction: false,
    automaticCollectionEnabled: false,
  };
}
