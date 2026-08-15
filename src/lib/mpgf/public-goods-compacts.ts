export const MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION =
  "mpgf-public-goods-compact/transaction-v2";

export const MPGF_PUBLIC_GOODS_COMPACT_TERMS = {
  obligationDivisor: 10,
  allocationTotalBps: 10_000,
  fundingQualificationMinimumCents: 100,
  readinessThresholdMembers: 100,
  readinessThresholdScheduledCents: 50_000,
  votingEqualShareBps: 7_000,
  votingSqrtContributionShareBps: 3_000,
  delegateControlCapBps: 1_000,
  minimumTermMonths: 12,
  exitNoticeDays: 30,
  projectSelectionRule:
    "Seventy percent equal member weight and thirty percent square-root net-settled contribution weight, with direct-only delegation capped at ten percent.",
  auditRule:
    "Independent review and audit, additionality checks, conflict and recusal rules, minority protections, and public post-round reporting are required.",
  noProjectOptOutRule:
    "After activation, members may not refuse individual selected projects.",
} as const;

export const MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS = {
  optInOnly: true,
  randomAssignmentAllowed: false,
  marketplaceCheckoutSurchargeEnabled: false,
  bindingOnlyAfterActivation: true,
  perProjectRefusalAllowedAfterActivation: false,
  exitProspectiveOnlyAfterActivation: true,
  moneyMovesOnJoin: false,
  automaticCollectionEnabled: false,
  allocationRequiresCompleteCoverage: true,
  votingRequiresNetSettledContribution: true,
} as const;

export const MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE =
  "disabled_pending_identity_legal_payment_provider_and_production_release_gates" as const;

export const MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS = {
  voluntaryChoice: true,
  exactConstitution: true,
  activationAndNoProjectOptOut: true,
  noPaymentMandate: true,
} as const;

export const MPGF_PUBLIC_GOODS_COMPACT_ACTIVATION_BLOCKERS = [
  "authoritative_outflow_coverage_unavailable",
  "verified_unique_person_primitive_unavailable",
  "dormant_payment_authorization_unavailable",
  "collection_provider_unapproved",
  "legal_and_fiscal_sponsor_review_incomplete",
  "donor_of_record_receipt_and_custody_review_incomplete",
  "sanctions_and_jurisdiction_release_gate_incomplete",
  "production_release_not_approved",
] as const;

export const MPGF_PUBLIC_GOODS_COMPACT_WEIGHT_UNITS = BigInt("1000000000000");

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
  | "threshold_ready_activation_blocked"
  | "active";
export type MpgfPublicGoodsCompactDelegationState =
  | "unavailable"
  | "available"
  | "active"
  | "revoked";
export type MpgfPublicGoodsCompactCollectionState =
  typeof MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE;
export type MpgfPublicGoodsCompactAcknowledgements =
  typeof MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS;
export type MpgfPublicGoodsOutflowCoverage = "unavailable" | "partial" | "complete";

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

export interface MpgfPublicGoodsCompactMembership {
  id: string;
  compactId: string;
  compactPublicKey: string;
  constitutionVersionAccepted: string;
  acknowledgements: MpgfPublicGoodsCompactAcknowledgements;
  status: MpgfPublicGoodsCompactMembershipStatus;
  acceptedAt: string;
  activatedAt: string | null;
  revokedAt: string | null;
  exitRequestedAt: string | null;
  exitEffectiveAt: string | null;
  allocationBps: number | null;
  scheduledContributionCents: number | null;
  netSettledContributionCents: number | null;
  fundingQualificationState:
    | "unqualified"
    | "scheduled_qualified"
    | "settled_qualified";
  fundingQualified: boolean;
  identityQualified: boolean;
}

export interface MpgfPublicGoodsCompactDelegation {
  id: string;
  compactId: string;
  cycleKey: string;
  delegatorMembershipId: string;
  delegateeMembershipId: string;
  state: Extract<MpgfPublicGoodsCompactDelegationState, "active" | "revoked">;
  createdAt: string;
  revokedAt: string | null;
}

export interface MpgfPublicGoodsCompactReadiness {
  cycleKey: string;
  frozenAt: string | null;
  fundingQualifiedUniquePersonCount: number;
  scheduledContributionCents: number;
  memberThresholdMet: boolean;
  fundingThresholdMet: boolean;
  thresholdReady: boolean;
  activationBlocked: true;
  blockers: readonly string[];
}

export interface MpgfPublicGoodsCompactState extends MpgfPublicGoodsCompactCharter {
  id: string | null;
  status: MpgfPublicGoodsCompactStatus;
  acceptedMemberCount: number | null;
  memberCountAvailable: boolean;
  activation: {
    state: MpgfPublicGoodsCompactActivationState;
    activatedAt: string | null;
    constitutionFrozenAt: string | null;
    frozenConstitutionVersion: string | null;
    minimumTermEndsAt: string | null;
  };
  readiness: MpgfPublicGoodsCompactReadiness;
  allocationElectorate: { active: boolean; key: string | null };
  membership: MpgfPublicGoodsCompactMembership | null;
  delegation: MpgfPublicGoodsCompactDelegation | null;
}

export interface MpgfPublicGoodsObligationSnapshot {
  cycleKey: string;
  priorMonthStart: string;
  priorMonthEndExclusive: string;
  coverage: MpgfPublicGoodsOutflowCoverage;
  coverageReason: string;
  eligibleNetSettledOutflowCents: number | null;
  obligationCents: number | null;
  sourceObservationCount: number;
}

export interface MpgfPublicGoodsAllocationSnapshot {
  cycleKey: string;
  instructionValid: boolean;
  schedulingReady: boolean;
  reason: string | null;
  allocations: Array<{
    compactPublicKey: string;
    allocationBps: number;
    scheduledContributionCents: number | null;
  }>;
  scheduledTotalCents: number | null;
}

export interface MpgfPublicGoodsCompactsState {
  available: boolean;
  source: "database" | "published_charter_examples";
  unavailableReason: string | null;
  compacts: MpgfPublicGoodsCompactState[];
  obligation: MpgfPublicGoodsObligationSnapshot;
  allocation: MpgfPublicGoodsAllocationSnapshot;
  moneyMovesOnPageAction: false;
  automaticCollectionEnabled: false;
}

export const MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS = [
  {
    publicKey: "future-flourishing",
    causeKey: "future_flourishing",
    title: "Future Flourishing",
    summary: "Long-horizon public goods that protect the conditions for future people to flourish.",
    constitutionVersion: MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION,
    terms: MPGF_PUBLIC_GOODS_COMPACT_TERMS,
    invariants: MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS,
    collectionState: MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE,
  },
  {
    publicKey: "animal-welfare",
    causeKey: "animal_welfare",
    title: "Animal Welfare",
    summary: "Evidence-led public goods that reduce severe animal suffering and improve welfare systems.",
    constitutionVersion: MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION,
    terms: MPGF_PUBLIC_GOODS_COMPACT_TERMS,
    invariants: MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS,
    collectionState: MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE,
  },
  {
    publicKey: "global-health",
    causeKey: "global_health",
    title: "Global Health",
    summary: "Shared health interventions and institutional capacity with independently reviewed evidence.",
    constitutionVersion: MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION,
    terms: MPGF_PUBLIC_GOODS_COMPACT_TERMS,
    invariants: MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS,
    collectionState: MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE,
  },
] as const satisfies readonly MpgfPublicGoodsCompactCharter[];

function assertSafeNonNegativeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
}

function asValidDate(value: Date | string, label: string) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`${label} must be a valid date.`);
  return date;
}

function addUtcCalendarMonths(value: Date, months: number) {
  const result = new Date(value.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function getMpgfPublicGoodsPriorUtcMonth(now: Date | string = new Date()) {
  const current = asValidDate(now, "Current time");
  const end = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1));
  return {
    cycleKey: end.toISOString().slice(0, 7),
    priorMonthStart: start.toISOString(),
    priorMonthEndExclusive: end.toISOString(),
  } as const;
}

export interface MpgfPublicGoodsOutflowObservation {
  id: string;
  occurredAt: string;
  direction: "outgoing" | "incoming" | "internal" | "self";
  kind: "moral_trade_payment" | "compact_contribution" | "wallet_funding" | "deposit" | "escrow";
  status: "settled" | "pending" | "failed";
  grossSettledCents: number;
  refundedCents: number;
  reversedCents: number;
  chargebackCents: number;
}

export function calculateMpgfPublicGoodsAggregateObligation(input: {
  now?: Date | string;
  coverage: MpgfPublicGoodsOutflowCoverage;
  coverageReason: string;
  observations: readonly MpgfPublicGoodsOutflowObservation[];
}): MpgfPublicGoodsObligationSnapshot {
  const month = getMpgfPublicGoodsPriorUtcMonth(input.now);
  if (input.coverage !== "complete") {
    return {
      ...month,
      coverage: input.coverage,
      coverageReason: input.coverageReason,
      eligibleNetSettledOutflowCents: null,
      obligationCents: null,
      sourceObservationCount: 0,
    };
  }

  const startMs = Date.parse(month.priorMonthStart);
  const endMs = Date.parse(month.priorMonthEndExclusive);
  let total = 0;
  let count = 0;
  const seen = new Set<string>();

  for (const observation of input.observations) {
    if (!observation.id || seen.has(observation.id)) throw new Error("Outflow observations require unique non-empty IDs.");
    seen.add(observation.id);
    for (const [label, value] of [
      ["Gross settled cents", observation.grossSettledCents],
      ["Refunded cents", observation.refundedCents],
      ["Reversed cents", observation.reversedCents],
      ["Chargeback cents", observation.chargebackCents],
    ] as const) assertSafeNonNegativeInteger(value, label);
    const occurredAt = Date.parse(observation.occurredAt);
    if (!Number.isFinite(occurredAt)) throw new Error("Outflow observation time must be valid.");
    if (
      observation.direction !== "outgoing" ||
      observation.kind !== "moral_trade_payment" ||
      observation.status !== "settled" ||
      occurredAt < startMs ||
      occurredAt >= endMs
    ) continue;
    const reductions = observation.refundedCents + observation.reversedCents + observation.chargebackCents;
    if (!Number.isSafeInteger(reductions)) throw new Error("Outflow reductions exceed the safe integer range.");
    total += Math.max(0, observation.grossSettledCents - reductions);
    if (!Number.isSafeInteger(total)) throw new Error("Eligible net settled outflow exceeds the safe integer range.");
    count += 1;
  }

  return {
    ...month,
    coverage: "complete",
    coverageReason: input.coverageReason,
    eligibleNetSettledOutflowCents: total,
    obligationCents: Math.floor(total / MPGF_PUBLIC_GOODS_COMPACT_TERMS.obligationDivisor),
    sourceObservationCount: count,
  };
}

export function allocateMpgfPublicGoodsObligation(input: {
  cycleKey: string;
  obligationCents: number | null;
  joinedCompactPublicKeys: readonly string[];
  allocationBps?: Readonly<Record<string, number>> | null;
}): MpgfPublicGoodsAllocationSnapshot {
  const keys = [...new Set(input.joinedCompactPublicKeys)].sort();
  if (keys.length !== input.joinedCompactPublicKeys.length) {
    return { cycleKey: input.cycleKey, instructionValid: false, schedulingReady: false, reason: "Joined compact keys must be unique.", allocations: [], scheduledTotalCents: null };
  }
  if (keys.length === 0) {
    return { cycleKey: input.cycleKey, instructionValid: false, schedulingReady: false, reason: "Join at least one compact before allocating.", allocations: [], scheduledTotalCents: null };
  }

  const supplied = input.allocationBps ?? {};
  const suppliedKeys = Object.keys(supplied).sort();
  const bps = new Map<string, number>();
  if (keys.length === 1 && suppliedKeys.length === 0) {
    bps.set(keys[0], 10_000);
  } else {
    if (suppliedKeys.length !== keys.length || suppliedKeys.some((key, index) => key !== keys[index])) {
      return { cycleKey: input.cycleKey, instructionValid: false, schedulingReady: false, reason: "Allocation must name every joined compact and no others.", allocations: [], scheduledTotalCents: null };
    }
    let totalBps = 0;
    for (const key of keys) {
      const value = supplied[key];
      if (!Number.isInteger(value) || value < 0 || value > 10_000) {
        return { cycleKey: input.cycleKey, instructionValid: false, schedulingReady: false, reason: "Every allocation must be an integer number of basis points from 0 through 10000.", allocations: [], scheduledTotalCents: null };
      }
      bps.set(key, value);
      totalBps += value;
    }
    if (totalBps !== 10_000) {
      return { cycleKey: input.cycleKey, instructionValid: false, schedulingReady: false, reason: "Allocation basis points must total exactly 10000.", allocations: [], scheduledTotalCents: null };
    }
  }

  if (input.obligationCents === null) {
    return {
      cycleKey: input.cycleKey,
      instructionValid: true,
      schedulingReady: false,
      reason: "Authoritative prior-month outflow coverage is unavailable, so planned cents are not calculated.",
      allocations: keys.map((compactPublicKey) => ({ compactPublicKey, allocationBps: bps.get(compactPublicKey) ?? 0, scheduledContributionCents: null })),
      scheduledTotalCents: null,
    };
  }
  const obligationCents = input.obligationCents;
  assertSafeNonNegativeInteger(obligationCents, "Compact obligation cents");

  const rows = keys.map((key) => {
    const allocationBps = bps.get(key) ?? 0;
    const numerator = BigInt(obligationCents) * BigInt(allocationBps);
    return {
      compactPublicKey: key,
      allocationBps,
      scheduledContributionCents: Number(numerator / BigInt(10_000)),
      remainder: numerator % BigInt(10_000),
    };
  });
  let remaining = obligationCents - rows.reduce((sum, row) => sum + row.scheduledContributionCents, 0);
  for (const row of [...rows].sort((a, b) => {
    if (a.remainder === b.remainder) return a.compactPublicKey.localeCompare(b.compactPublicKey);
    return a.remainder > b.remainder ? -1 : 1;
  })) {
    if (remaining <= 0) break;
    row.scheduledContributionCents += 1;
    remaining -= 1;
  }

  return {
    cycleKey: input.cycleKey,
    instructionValid: true,
    schedulingReady: true,
    reason: null,
    allocations: rows.map(({ remainder: _remainder, ...row }) => row),
    scheduledTotalCents: obligationCents,
  };
}

export function calculateMpgfPublicGoodsCompactReadiness(input: {
  cycleKey: string;
  frozenAt?: string | null;
  members: readonly {
    personId: string;
    identityQualified: boolean;
    allocationValid: boolean;
    scheduledContributionCents: number;
  }[];
  blockers?: readonly string[];
}): MpgfPublicGoodsCompactReadiness {
  const people = new Set<string>();
  let scheduledContributionCents = 0;
  for (const member of input.members) {
    assertSafeNonNegativeInteger(member.scheduledContributionCents, "Scheduled contribution cents");
    if (!member.personId || people.has(member.personId)) throw new Error("Readiness snapshot requires unique verified-person IDs.");
    people.add(member.personId);
    if (
      member.identityQualified &&
      member.allocationValid &&
      member.scheduledContributionCents >= MPGF_PUBLIC_GOODS_COMPACT_TERMS.fundingQualificationMinimumCents
    ) {
      scheduledContributionCents += member.scheduledContributionCents;
      if (!Number.isSafeInteger(scheduledContributionCents)) {
        throw new Error("Scheduled contribution total exceeds the safe integer range.");
      }
    }
  }
  const qualifiedCount = input.members.filter((member) =>
    member.identityQualified && member.allocationValid &&
    member.scheduledContributionCents >= MPGF_PUBLIC_GOODS_COMPACT_TERMS.fundingQualificationMinimumCents,
  ).length;
  const memberThresholdMet = qualifiedCount >= MPGF_PUBLIC_GOODS_COMPACT_TERMS.readinessThresholdMembers;
  const fundingThresholdMet = scheduledContributionCents >= MPGF_PUBLIC_GOODS_COMPACT_TERMS.readinessThresholdScheduledCents;
  return {
    cycleKey: input.cycleKey,
    frozenAt: input.frozenAt ?? null,
    fundingQualifiedUniquePersonCount: qualifiedCount,
    scheduledContributionCents,
    memberThresholdMet,
    fundingThresholdMet,
    thresholdReady: memberThresholdMet && fundingThresholdMet,
    activationBlocked: true,
    blockers: input.blockers ?? MPGF_PUBLIC_GOODS_COMPACT_ACTIVATION_BLOCKERS,
  };
}

function integerSqrt(value: bigint) {
  if (value < BigInt(0)) throw new Error("Square root input cannot be negative.");
  if (value < BigInt(2)) return value;
  let x0 = BigInt(1) << (BigInt(value.toString(2).length) + BigInt(1)) / BigInt(2);
  let x1 = (x0 + value / x0) / BigInt(2);
  while (x1 < x0) {
    x0 = x1;
    x1 = (x0 + value / x0) / BigInt(2);
  }
  return x0;
}

function apportionUnits<T extends { id: string; score: bigint }>(rows: readonly T[], totalUnits: bigint) {
  const totalScore = rows.reduce((sum, row) => sum + row.score, BigInt(0));
  if (totalScore <= BigInt(0)) throw new Error("Apportionment score total must be positive.");
  const apportioned = rows.map((row) => {
    const numerator = totalUnits * row.score;
    return { ...row, units: numerator / totalScore, remainder: numerator % totalScore };
  });
  let left = totalUnits - apportioned.reduce((sum, row) => sum + row.units, BigInt(0));
  for (const row of [...apportioned].sort((a, b) => {
    if (a.remainder === b.remainder) return a.id.localeCompare(b.id);
    return a.remainder > b.remainder ? -1 : 1;
  })) {
    if (left === BigInt(0)) break;
    row.units += BigInt(1);
    left -= BigInt(1);
  }
  return apportioned;
}

export interface MpgfPublicGoodsVotingWeight {
  membershipId: string;
  personId: string;
  netSettledContributionCents: number;
  equalWeightUnits: string;
  sqrtContributionWeightUnits: string;
  totalWeightUnits: string;
}

export function calculateMpgfPublicGoodsVotingWeights(members: readonly {
  membershipId: string;
  personId: string;
  identityQualified: boolean;
  allocationValid: boolean;
  netSettledContributionCents: number;
}[]): MpgfPublicGoodsVotingWeight[] {
  const qualified = members.filter((member) => {
    assertSafeNonNegativeInteger(member.netSettledContributionCents, "Net settled contribution cents");
    return member.identityQualified && member.allocationValid &&
      member.netSettledContributionCents >= MPGF_PUBLIC_GOODS_COMPACT_TERMS.fundingQualificationMinimumCents;
  });
  if (qualified.length === 0) return [];
  if (qualified.some((member) => !member.membershipId || !member.personId) ||
      new Set(qualified.map((member) => member.membershipId)).size !== qualified.length ||
      new Set(qualified.map((member) => member.personId)).size !== qualified.length) {
    throw new Error("Voting snapshot requires unique membership and verified-person IDs.");
  }
  const equalPool = MPGF_PUBLIC_GOODS_COMPACT_WEIGHT_UNITS * BigInt(7) / BigInt(10);
  const sqrtPool = MPGF_PUBLIC_GOODS_COMPACT_WEIGHT_UNITS - equalPool;
  const ordered = [...qualified].sort((a, b) => a.membershipId.localeCompare(b.membershipId));
  const equal = apportionUnits(
    ordered.map((member) => ({ id: member.membershipId, score: BigInt(1) })),
    equalPool,
  );
  const sqrtScale = BigInt("1000000000000");
  const sqrt = apportionUnits(ordered.map((member) => ({
    id: member.membershipId,
    score: integerSqrt(BigInt(member.netSettledContributionCents) * sqrtScale * sqrtScale),
  })), sqrtPool);
  return ordered.map((member, index) => ({
    membershipId: member.membershipId,
    personId: member.personId,
    netSettledContributionCents: member.netSettledContributionCents,
    equalWeightUnits: equal[index].units.toString(),
    sqrtContributionWeightUnits: sqrt[index].units.toString(),
    totalWeightUnits: (equal[index].units + sqrt[index].units).toString(),
  }));
}

export function applyMpgfPublicGoodsDirectDelegations(input: {
  weights: readonly MpgfPublicGoodsVotingWeight[];
  delegations: Readonly<Record<string, string>>;
}) {
  const weightByMembership = new Map(input.weights.map((row) => [row.membershipId, BigInt(row.totalWeightUnits)]));
  const holderByMember = new Map<string, string>();
  for (const [delegator, delegatee] of Object.entries(input.delegations)) {
    if (!weightByMembership.has(delegator) || !weightByMembership.has(delegatee)) throw new Error("Delegation participants must be funding-qualified in the same voting snapshot.");
    if (delegator === delegatee) throw new Error("Self-delegation is not allowed.");
    holderByMember.set(delegator, delegatee);
  }
  const controlled = new Map<string, bigint>();
  const incoming = new Map<string, number>();
  for (const row of input.weights) {
    const holder = holderByMember.get(row.membershipId) ?? row.membershipId;
    controlled.set(holder, (controlled.get(holder) ?? BigInt(0)) + BigInt(row.totalWeightUnits));
    if (holder !== row.membershipId) incoming.set(holder, (incoming.get(holder) ?? 0) + 1);
  }
  const cap = MPGF_PUBLIC_GOODS_COMPACT_WEIGHT_UNITS * BigInt(MPGF_PUBLIC_GOODS_COMPACT_TERMS.delegateControlCapBps) / BigInt(10_000);
  for (const [holder, units] of controlled) {
    if ((incoming.get(holder) ?? 0) > 0 && units > cap) throw new Error(`Delegation would make ${holder} control more than ten percent of effective weight.`);
  }
  return [...controlled.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([membershipId, units]) => ({
    membershipId,
    controlledWeightUnits: units.toString(),
    directIncomingDelegationCount: incoming.get(membershipId) ?? 0,
  }));
}

export function calculateMpgfPublicGoodsCompactProspectiveExitDate(activationAt: Date | string, exitRequestedAt: Date | string) {
  const activation = asValidDate(activationAt, "Activation time");
  const requested = asValidDate(exitRequestedAt, "Exit request time");
  if (requested.getTime() < activation.getTime()) throw new Error("Exit request time cannot precede compact activation.");
  const minimumTermEndsAt = addUtcCalendarMonths(activation, MPGF_PUBLIC_GOODS_COMPACT_TERMS.minimumTermMonths);
  const noticeEndsAt = new Date(requested.getTime());
  noticeEndsAt.setUTCDate(noticeEndsAt.getUTCDate() + MPGF_PUBLIC_GOODS_COMPACT_TERMS.exitNoticeDays);
  const effectiveAt = new Date(Math.max(minimumTermEndsAt.getTime(), noticeEndsAt.getTime()));
  return { minimumTermEndsAt: minimumTermEndsAt.toISOString(), noticeEndsAt: noticeEndsAt.toISOString(), effectiveAt: effectiveAt.toISOString() } as const;
}

export function buildMpgfPublicGoodsCompactPublishedExamplesState(now: Date | string = new Date()): MpgfPublicGoodsCompactsState {
  const month = getMpgfPublicGoodsPriorUtcMonth(now);
  const obligation: MpgfPublicGoodsObligationSnapshot = {
    ...month,
    coverage: "unavailable",
    coverageReason: "No repository table proves complete coverage of all eligible Moral Trade outflows, refunds, reversals, and chargebacks.",
    eligibleNetSettledOutflowCents: null,
    obligationCents: null,
    sourceObservationCount: 0,
  };
  return {
    available: false,
    source: "published_charter_examples",
    unavailableReason: "Durable Compact v2 state is unavailable. Published constitution examples are shown without fabricated payment, identity, readiness, or voting facts.",
    compacts: MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.map((charter) => ({
      ...charter,
      id: null,
      status: "recruiting",
      acceptedMemberCount: null,
      memberCountAvailable: false,
      activation: { state: "recruiting", activatedAt: null, constitutionFrozenAt: null, frozenConstitutionVersion: null, minimumTermEndsAt: null },
      readiness: calculateMpgfPublicGoodsCompactReadiness({ cycleKey: month.cycleKey, members: [] }),
      allocationElectorate: { active: false, key: null },
      membership: null,
      delegation: null,
    })),
    obligation,
    allocation: allocateMpgfPublicGoodsObligation({ cycleKey: month.cycleKey, obligationCents: null, joinedCompactPublicKeys: [] }),
    moneyMovesOnPageAction: false,
    automaticCollectionEnabled: false,
  };
}
