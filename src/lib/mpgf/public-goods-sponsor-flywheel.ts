import { createHash } from "node:crypto";

import {
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsSubscriptions,
} from "./data";
import type {
  MpgfPublicGoodsMatchPool,
  MpgfPublicGoodsRound,
  MpgfPublicGoodsSubscription,
} from "./types";

export const MPGF_PUBLIC_GOODS_SPONSOR_FLYWHEEL_PRIVACY_POLICY =
  "aggregate_sponsor_pool_sources_no_private_trade_or_payment_refs";

export const MPGF_PUBLIC_GOODS_SPONSOR_POOL_REFILL_AUTOMATION_POLICY =
  "automatic_recurring_tithe_and_surplus_refill_next_round_v1";

export type MpgfPublicGoodsSponsorPoolSourceType =
  | "direct_sponsor_deposit"
  | "recurring_member_tithe"
  | "donation_offset_surplus"
  | "trade_surplus_tithe";

export interface MpgfPublicGoodsSponsorPoolLedgerEntry {
  id: string;
  poolId: string;
  roundId: string;
  sourceType: MpgfPublicGoodsSponsorPoolSourceType;
  sourceRefHash: string;
  amountCents: number;
  status: "available" | "pending_review" | "voided";
  custodyMode: "partner_or_provider_held_not_platform_custody";
  publicMemo: string;
  receivedAt: string;
  countsTowardMatching: boolean;
}

export interface MpgfPublicGoodsSponsorPoolRefillPlanEntry {
  id: string;
  poolId: string;
  sourceType: Exclude<MpgfPublicGoodsSponsorPoolSourceType, "direct_sponsor_deposit">;
  sourceRefHash: string;
  grossSurplusCents: number;
  routeShareBps: number;
  routedAmountCents: number;
  status: "available" | "pending_review";
  custodyMode: "partner_or_provider_held_not_platform_custody";
  publicMemo: string;
  scheduledForRoundId: string;
  receivedAt: string;
  countsTowardMatching: boolean;
}

export interface MpgfPublicGoodsSponsorPoolRefillAutomationPlan {
  ok: true;
  poolId: string;
  currentRoundId: string;
  scheduledForRoundId: string;
  policy: typeof MPGF_PUBLIC_GOODS_SPONSOR_POOL_REFILL_AUTOMATION_POLICY;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_SPONSOR_FLYWHEEL_PRIVACY_POLICY;
  routesToFutureRoundsOnly: true;
  noSponsorCampaignSteering: true;
  custodyMode: "partner_or_provider_held_not_platform_custody";
  publishedShareRules: Array<{
    sourceType: Exclude<MpgfPublicGoodsSponsorPoolSourceType, "direct_sponsor_deposit">;
    routeShareBps: number;
  }>;
  availableForNextRoundCents: number;
  pendingReviewCents: number;
  withheldCents: number;
  entries: MpgfPublicGoodsSponsorPoolRefillPlanEntry[];
  calcHash: string;
}

export interface MpgfPublicGoodsSponsorPoolFlywheel {
  ok: true;
  poolId: string;
  roundId: string;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_SPONSOR_FLYWHEEL_PRIVACY_POLICY;
  flywheelPolicy: "trade_surplus_funded_verified_plural_assurance";
  custodyMode: "partner_or_provider_held_not_platform_custody";
  sourceTypes: MpgfPublicGoodsSponsorPoolSourceType[];
  targetSponsorPoolCents: number;
  availableForRoundCents: number;
  pendingReviewCents: number;
  voidedCents: number;
  unfundedSponsorPoolCents: number;
  refillAutomation: MpgfPublicGoodsSponsorPoolRefillAutomationPlan;
  sourceBreakdown: Array<{
    sourceType: MpgfPublicGoodsSponsorPoolSourceType;
    availableCents: number;
    pendingReviewCents: number;
    entryCount: number;
  }>;
  entries: MpgfPublicGoodsSponsorPoolLedgerEntry[];
  calcHash: string;
}

export interface MpgfPublicGoodsSponsorPoolDepositReceipt {
  ok: true;
  poolId: string;
  roundId: string;
  deposit: MpgfPublicGoodsSponsorPoolLedgerEntry;
  reviewRequiredBeforeMatching: boolean;
  finalPayoutAuthorized: false;
}

export interface MpgfPublicGoodsTradeSurplusCommitment {
  ok: true;
  id: string;
  poolId: string;
  roundId: string;
  sourceType: "donation_offset_surplus" | "trade_surplus_tithe";
  tradeOrOffsetRefHash: string;
  amountCents: number;
  status: "committed_pending_settlement" | "settled_to_sponsor_pool" | "voided";
  custodyMode: "partner_or_provider_held_not_platform_custody";
  settlementPath: "/api/mpgf/trade-surplus/settle";
  createdAt: string;
  calcHash: string;
}

const demoSponsorPoolRefills = [
  {
    id: "sponsor-flywheel-anchor-demo",
    sourceType: "direct_sponsor_deposit" as const,
    privateSourceRef: "anchor-sponsor-private-demo-2026-05",
    amountCents: 100_000,
    status: "available" as const,
    publicMemo: "Anchor sponsor deposit for the common-ground challenge pool.",
    receivedAt: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "sponsor-flywheel-offset-surplus-demo",
    sourceType: "donation_offset_surplus" as const,
    privateSourceRef: "donation-offset-surplus-private-demo-2026-05",
    amountCents: 25_000,
    status: "available" as const,
    publicMemo: "Donation-offset surplus routed to the public-goods sponsor pool by the published surplus rule.",
    receivedAt: "2026-05-18T00:00:00.000Z",
  },
  {
    id: "sponsor-flywheel-trade-tithe-demo",
    sourceType: "trade_surplus_tithe" as const,
    privateSourceRef: "successful-moral-trade-tithe-private-demo-2026-05",
    amountCents: 22_500,
    status: "available" as const,
    publicMemo: "Optional tithe from successful moral-trade surplus, pooled before any sponsor can direct campaign outcomes.",
    receivedAt: "2026-05-22T00:00:00.000Z",
  },
];

const demoSurplusSources = [
  {
    sourceType: "donation_offset_surplus" as const,
    privateSourceRef: "donation-offset-surplus-private-demo-2026-06",
    grossSurplusCents: 50_000,
    routeShareBps: 5_000,
    providerEventVerified: true,
    reviewerApproved: true,
    occurredAt: "2026-05-25T00:00:00.000Z",
    publicMemo: "Published donation-offset surplus share scheduled for the next public-goods sponsor pool.",
  },
  {
    sourceType: "trade_surplus_tithe" as const,
    privateSourceRef: "successful-moral-trade-tithe-private-demo-2026-06",
    grossSurplusCents: 45_000,
    routeShareBps: 5_000,
    providerEventVerified: true,
    reviewerApproved: true,
    occurredAt: "2026-05-26T00:00:00.000Z",
    publicMemo: "Published moral-trade surplus share scheduled for the next public-goods sponsor pool.",
  },
];

function hashSourceRef(value: string) {
  return `sha256:${createHash("sha256").update(`mpgf-sponsor-pool-source:${value}`).digest("hex")}`;
}

function calcHash(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function clampCents(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function clampBps(value: number, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.min(10_000, Math.floor(value))) : fallback;
}

function nextRoundIdFor(round: MpgfPublicGoodsRound) {
  return `${round.id}:next`;
}

function defaultRouteShareBps(sourceType: MpgfPublicGoodsSponsorPoolSourceType) {
  return sourceType === "recurring_member_tithe" ? 10_000 : 5_000;
}

function subscriptionLedgerEntries({
  pool,
  round,
  subscriptions,
}: {
  pool: MpgfPublicGoodsMatchPool;
  round: MpgfPublicGoodsRound;
  subscriptions: MpgfPublicGoodsSubscription[];
}): MpgfPublicGoodsSponsorPoolLedgerEntry[] {
  return subscriptions
    .filter((subscription) => subscription.poolId === pool.id && subscription.status === "active")
    .map((subscription) => ({
      id: `sponsor-flywheel-${subscription.id}`,
      poolId: pool.id,
      roundId: round.id,
      sourceType: "recurring_member_tithe",
      sourceRefHash: hashSourceRef(subscription.id),
      amountCents:
        subscription.interval === "annual"
          ? Math.floor(clampCents(subscription.amountCents) / 12)
          : clampCents(subscription.amountCents),
      status: "available",
      custodyMode: "partner_or_provider_held_not_platform_custody",
      publicMemo: "Recurring member tithe or sponsor-pool sustainer refill.",
      receivedAt: subscription.createdAt,
      countsTowardMatching: true,
    }));
}

function demoLedgerEntries({
  pool,
  round,
}: {
  pool: MpgfPublicGoodsMatchPool;
  round: MpgfPublicGoodsRound;
}): MpgfPublicGoodsSponsorPoolLedgerEntry[] {
  return demoSponsorPoolRefills.map((entry) => ({
    id: entry.id,
    poolId: pool.id,
    roundId: round.id,
    sourceType: entry.sourceType,
    sourceRefHash: hashSourceRef(entry.privateSourceRef),
    amountCents: clampCents(entry.amountCents),
    status: entry.status,
    custodyMode: "partner_or_provider_held_not_platform_custody",
    publicMemo: entry.publicMemo,
    receivedAt: entry.receivedAt,
    countsTowardMatching: entry.status === "available",
  }));
}

function summarizeSourceBreakdown(entries: MpgfPublicGoodsSponsorPoolLedgerEntry[]) {
  const sourceTypes: MpgfPublicGoodsSponsorPoolSourceType[] = [
    "direct_sponsor_deposit",
    "recurring_member_tithe",
    "donation_offset_surplus",
    "trade_surplus_tithe",
  ];

  return sourceTypes.map((sourceType) => {
    const matchingEntries = entries.filter((entry) => entry.sourceType === sourceType);

    return {
      sourceType,
      availableCents: matchingEntries
        .filter((entry) => entry.status === "available")
        .reduce((sum, entry) => sum + entry.amountCents, 0),
      pendingReviewCents: matchingEntries
        .filter((entry) => entry.status === "pending_review")
        .reduce((sum, entry) => sum + entry.amountCents, 0),
      entryCount: matchingEntries.length,
    };
  });
}

function subscriptionRefillPlanEntries({
  pool,
  scheduledForRoundId,
  subscriptions,
}: {
  pool: MpgfPublicGoodsMatchPool;
  scheduledForRoundId: string;
  subscriptions: MpgfPublicGoodsSubscription[];
}): MpgfPublicGoodsSponsorPoolRefillPlanEntry[] {
  return subscriptions
    .filter((subscription) => subscription.poolId === pool.id && subscription.status === "active")
    .map((subscription): MpgfPublicGoodsSponsorPoolRefillPlanEntry => {
      const sourceRefHash = hashSourceRef(`recurring-member-tithe:${subscription.id}`);
      const grossSurplusCents =
        subscription.interval === "annual"
          ? Math.floor(clampCents(subscription.amountCents) / 12)
          : clampCents(subscription.amountCents);
      const routeShareBps = defaultRouteShareBps("recurring_member_tithe");
      const routedAmountCents = Math.floor((grossSurplusCents * routeShareBps) / 10_000);

      return {
        id: `sponsor-refill-auto-${sourceRefHash.slice(7, 19)}`,
        poolId: pool.id,
        sourceType: "recurring_member_tithe",
        sourceRefHash,
        grossSurplusCents,
        routeShareBps,
        routedAmountCents,
        status: "available",
        custodyMode: "partner_or_provider_held_not_platform_custody",
        publicMemo: "Recurring member tithe scheduled by the published sponsor-pool refill rule.",
        scheduledForRoundId,
        receivedAt: subscription.nextChargeAt,
        countsTowardMatching: routedAmountCents > 0,
      };
    })
    .filter((entry) => entry.routedAmountCents > 0);
}

export function buildMpgfPublicGoodsSponsorPoolRefillAutomationPlan({
  pool = demoMpgfMatchPool,
  round = demoMpgfAssuranceRound,
  subscriptions = demoMpgfPublicGoodsSubscriptions,
  surplusSources = demoSurplusSources,
  scheduledForRoundId = nextRoundIdFor(round),
}: {
  pool?: MpgfPublicGoodsMatchPool;
  round?: MpgfPublicGoodsRound;
  subscriptions?: MpgfPublicGoodsSubscription[];
  surplusSources?: Array<{
    sourceType: "donation_offset_surplus" | "trade_surplus_tithe";
    privateSourceRef: string;
    grossSurplusCents: number;
    routeShareBps?: number;
    providerEventVerified?: boolean;
    reviewerApproved?: boolean;
    occurredAt?: string;
    publicMemo?: string;
  }>;
  scheduledForRoundId?: string;
} = {}): MpgfPublicGoodsSponsorPoolRefillAutomationPlan {
  const subscriptionEntries = subscriptionRefillPlanEntries({
    pool,
    scheduledForRoundId,
    subscriptions,
  });
  const surplusEntries = surplusSources.map((source) => {
    const sourceRefHash = hashSourceRef(source.privateSourceRef);
    const routeShareBps = clampBps(source.routeShareBps ?? defaultRouteShareBps(source.sourceType));
    const grossSurplusCents = clampCents(source.grossSurplusCents);
    const routedAmountCents = Math.floor((grossSurplusCents * routeShareBps) / 10_000);
    const available = source.providerEventVerified === true && source.reviewerApproved === true;

    return {
      id: `sponsor-refill-auto-${sourceRefHash.slice(7, 19)}`,
      poolId: pool.id,
      sourceType: source.sourceType,
      sourceRefHash,
      grossSurplusCents,
      routeShareBps,
      routedAmountCents,
      status: available ? "available" as const : "pending_review" as const,
      custodyMode: "partner_or_provider_held_not_platform_custody" as const,
      publicMemo:
        source.publicMemo?.trim() ||
        "Published trade or donation-offset surplus share scheduled for the next sponsor pool.",
      scheduledForRoundId,
      receivedAt: source.occurredAt ?? new Date("2026-05-31T12:00:00.000Z").toISOString(),
      countsTowardMatching: available && routedAmountCents > 0,
    };
  }).filter((entry) => entry.routedAmountCents > 0);
  const entries = [...subscriptionEntries, ...surplusEntries].sort(
    (left, right) => left.receivedAt.localeCompare(right.receivedAt) || left.id.localeCompare(right.id),
  );
  const publishedShareRules = ([
    "recurring_member_tithe",
    "donation_offset_surplus",
    "trade_surplus_tithe",
  ] as const).map((sourceType) => ({
    sourceType,
    routeShareBps: defaultRouteShareBps(sourceType),
  }));
  const availableForNextRoundCents = entries
    .filter((entry) => entry.status === "available" && entry.countsTowardMatching)
    .reduce((sum, entry) => sum + entry.routedAmountCents, 0);
  const pendingReviewCents = entries
    .filter((entry) => entry.status === "pending_review")
    .reduce((sum, entry) => sum + entry.routedAmountCents, 0);
  const withheldCents = entries.reduce(
    (sum, entry) => sum + Math.max(0, entry.grossSurplusCents - entry.routedAmountCents),
    0,
  );

  return {
    ok: true,
    poolId: pool.id,
    currentRoundId: round.id,
    scheduledForRoundId,
    policy: MPGF_PUBLIC_GOODS_SPONSOR_POOL_REFILL_AUTOMATION_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_SPONSOR_FLYWHEEL_PRIVACY_POLICY,
    routesToFutureRoundsOnly: true,
    noSponsorCampaignSteering: true,
    custodyMode: "partner_or_provider_held_not_platform_custody",
    publishedShareRules,
    availableForNextRoundCents,
    pendingReviewCents,
    withheldCents,
    entries,
    calcHash: calcHash([
      round.id,
      scheduledForRoundId,
      MPGF_PUBLIC_GOODS_SPONSOR_POOL_REFILL_AUTOMATION_POLICY,
      entries.map((entry) => [
        entry.sourceType,
        entry.sourceRefHash,
        entry.grossSurplusCents,
        entry.routeShareBps,
        entry.routedAmountCents,
        entry.status,
        entry.scheduledForRoundId,
      ]),
    ]),
  };
}

export function buildMpgfPublicGoodsSponsorPoolFlywheel({
  pool = demoMpgfMatchPool,
  round = demoMpgfAssuranceRound,
  subscriptions = demoMpgfPublicGoodsSubscriptions,
  extraEntries = [],
  includeDemoSeedEntries = true,
}: {
  pool?: MpgfPublicGoodsMatchPool;
  round?: MpgfPublicGoodsRound;
  subscriptions?: MpgfPublicGoodsSubscription[];
  extraEntries?: MpgfPublicGoodsSponsorPoolLedgerEntry[];
  includeDemoSeedEntries?: boolean;
} = {}): MpgfPublicGoodsSponsorPoolFlywheel {
  const refillAutomation = buildMpgfPublicGoodsSponsorPoolRefillAutomationPlan({
    pool,
    round,
    subscriptions,
    surplusSources: includeDemoSeedEntries ? undefined : [],
  });
  const entries = [
    ...(includeDemoSeedEntries ? demoLedgerEntries({ pool, round }) : []),
    ...subscriptionLedgerEntries({ pool, round, subscriptions }),
    ...extraEntries.filter((entry) => entry.poolId === pool.id && entry.roundId === round.id),
  ].sort((left, right) => left.receivedAt.localeCompare(right.receivedAt) || left.id.localeCompare(right.id));
  const availableForRoundCents = entries
    .filter((entry) => entry.status === "available" && entry.countsTowardMatching)
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const pendingReviewCents = entries
    .filter((entry) => entry.status === "pending_review")
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const voidedCents = entries
    .filter((entry) => entry.status === "voided")
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const sourceBreakdown = summarizeSourceBreakdown(entries);

  return {
    ok: true,
    poolId: pool.id,
    roundId: round.id,
    privacyPolicy: MPGF_PUBLIC_GOODS_SPONSOR_FLYWHEEL_PRIVACY_POLICY,
    flywheelPolicy: "trade_surplus_funded_verified_plural_assurance",
    custodyMode: "partner_or_provider_held_not_platform_custody",
    sourceTypes: sourceBreakdown.map((entry) => entry.sourceType),
    targetSponsorPoolCents: pool.budgetCents,
    availableForRoundCents,
    pendingReviewCents,
    voidedCents,
    unfundedSponsorPoolCents: Math.max(0, pool.budgetCents - availableForRoundCents),
    refillAutomation,
    sourceBreakdown,
    entries,
    calcHash: calcHash(
      entries.map((entry) => [
        entry.id,
        entry.poolId,
        entry.roundId,
        entry.sourceType,
        entry.sourceRefHash,
        entry.amountCents,
        entry.status,
        entry.countsTowardMatching,
      ]),
    ),
  };
}

export function recordMpgfPublicGoodsSponsorPoolDeposit({
  pool = demoMpgfMatchPool,
  round = demoMpgfAssuranceRound,
  sourceType = "direct_sponsor_deposit",
  privateSourceRef,
  amountCents,
  publicMemo,
  receivedAt = new Date("2026-05-31T12:00:00.000Z").toISOString(),
  status = "pending_review",
}: {
  pool?: MpgfPublicGoodsMatchPool;
  round?: MpgfPublicGoodsRound;
  sourceType?: MpgfPublicGoodsSponsorPoolSourceType;
  privateSourceRef: string;
  amountCents: number;
  publicMemo?: string;
  receivedAt?: string;
  status?: MpgfPublicGoodsSponsorPoolLedgerEntry["status"];
}): MpgfPublicGoodsSponsorPoolDepositReceipt {
  if (!privateSourceRef.trim()) {
    throw new Error("MPGF sponsor-pool deposits require a private source reference.");
  }

  const normalizedAmountCents = clampCents(amountCents);

  if (normalizedAmountCents <= 0) {
    throw new Error("MPGF sponsor-pool deposits require a positive amount.");
  }

  const sourceRefHash = hashSourceRef(privateSourceRef);
  const deposit: MpgfPublicGoodsSponsorPoolLedgerEntry = {
    id: `sponsor-flywheel-deposit-${sourceRefHash.slice(7, 19)}`,
    poolId: pool.id,
    roundId: round.id,
    sourceType,
    sourceRefHash,
    amountCents: normalizedAmountCents,
    status,
    custodyMode: "partner_or_provider_held_not_platform_custody",
    publicMemo: publicMemo?.trim() || "Sponsor-pool refill pending review before matching.",
    receivedAt,
    countsTowardMatching: status === "available",
  };

  return {
    ok: true,
    poolId: pool.id,
    roundId: round.id,
    deposit,
    reviewRequiredBeforeMatching: status !== "available",
    finalPayoutAuthorized: false,
  };
}

export function commitMpgfPublicGoodsTradeSurplus({
  pool = demoMpgfMatchPool,
  round = demoMpgfAssuranceRound,
  sourceType = "trade_surplus_tithe",
  privateTradeOrOffsetRef,
  amountCents,
  createdAt = new Date("2026-05-31T12:00:00.000Z").toISOString(),
}: {
  pool?: MpgfPublicGoodsMatchPool;
  round?: MpgfPublicGoodsRound;
  sourceType?: "donation_offset_surplus" | "trade_surplus_tithe";
  privateTradeOrOffsetRef: string;
  amountCents: number;
  createdAt?: string;
}): MpgfPublicGoodsTradeSurplusCommitment {
  if (!privateTradeOrOffsetRef.trim()) {
    throw new Error("MPGF trade-surplus commitments require a private trade or offset reference.");
  }

  const normalizedAmountCents = clampCents(amountCents);

  if (normalizedAmountCents <= 0) {
    throw new Error("MPGF trade-surplus commitments require a positive amount.");
  }

  const tradeOrOffsetRefHash = hashSourceRef(privateTradeOrOffsetRef);
  const id = `trade-surplus-commitment-${tradeOrOffsetRefHash.slice(7, 19)}`;
  const calcHashValue = calcHash([
    id,
    pool.id,
    round.id,
    sourceType,
    tradeOrOffsetRefHash,
    normalizedAmountCents,
    "committed_pending_settlement",
  ]);

  return {
    ok: true,
    id,
    poolId: pool.id,
    roundId: round.id,
    sourceType,
    tradeOrOffsetRefHash,
    amountCents: normalizedAmountCents,
    status: "committed_pending_settlement",
    custodyMode: "partner_or_provider_held_not_platform_custody",
    settlementPath: "/api/mpgf/trade-surplus/settle",
    createdAt,
    calcHash: calcHashValue,
  };
}

export function settleMpgfPublicGoodsTradeSurplus({
  commitment,
  providerEventVerified = false,
  settledAt = new Date("2026-05-31T12:05:00.000Z").toISOString(),
}: {
  commitment: MpgfPublicGoodsTradeSurplusCommitment;
  providerEventVerified?: boolean;
  settledAt?: string;
}) {
  const receipt = recordMpgfPublicGoodsSponsorPoolDeposit({
    sourceType: commitment.sourceType,
    privateSourceRef: commitment.tradeOrOffsetRefHash,
    amountCents: commitment.amountCents,
    publicMemo: "Settled trade-surplus or donation-offset surplus refill for the MPGF sponsor pool.",
    receivedAt: settledAt,
    status: providerEventVerified ? "available" : "pending_review",
  });

  return {
    ok: true,
    commitment: {
      ...commitment,
      status: providerEventVerified ? "settled_to_sponsor_pool" as const : commitment.status,
    },
    sponsorPoolDeposit: receipt.deposit,
    providerEventVerified,
    reviewRequiredBeforeMatching: !providerEventVerified,
    finalPayoutAuthorized: false as const,
  };
}

export function getMpgfPublicGoodsSponsorPoolFlywheelApi(poolId: string = demoMpgfMatchPool.id) {
  if (poolId !== demoMpgfMatchPool.id) {
    return null;
  }

  return buildMpgfPublicGoodsSponsorPoolFlywheel();
}
