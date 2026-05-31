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
  sourceBreakdown: Array<{
    sourceType: MpgfPublicGoodsSponsorPoolSourceType;
    availableCents: number;
    pendingReviewCents: number;
    entryCount: number;
  }>;
  entries: MpgfPublicGoodsSponsorPoolLedgerEntry[];
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

function hashSourceRef(value: string) {
  return `sha256:${createHash("sha256").update(`mpgf-sponsor-pool-source:${value}`).digest("hex")}`;
}

function calcHash(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function clampCents(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
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

export function buildMpgfPublicGoodsSponsorPoolFlywheel({
  pool = demoMpgfMatchPool,
  round = demoMpgfAssuranceRound,
  subscriptions = demoMpgfPublicGoodsSubscriptions,
  extraEntries = [],
}: {
  pool?: MpgfPublicGoodsMatchPool;
  round?: MpgfPublicGoodsRound;
  subscriptions?: MpgfPublicGoodsSubscription[];
  extraEntries?: MpgfPublicGoodsSponsorPoolLedgerEntry[];
} = {}): MpgfPublicGoodsSponsorPoolFlywheel {
  const entries = [
    ...demoLedgerEntries({ pool, round }),
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

export function getMpgfPublicGoodsSponsorPoolFlywheelApi(poolId: string = demoMpgfMatchPool.id) {
  if (poolId !== demoMpgfMatchPool.id) {
    return null;
  }

  return buildMpgfPublicGoodsSponsorPoolFlywheel();
}
