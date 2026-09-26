import {
  buildProvisionalFailureBonusSuccessPremiumAssumptions,
  quoteFailureBonusSuccessPremiumSchedule,
  type FailureBonusSuccessPremiumPricing,
  type FailureBonusSuccessPremiumPayer,
} from "./failure-bonus-success-premium";

export const MORAL_PUBLIC_GOODS_LABS_ROUTE = "/labs/moral-public-goods/global-biosecurity-coordination" as const;

export const MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_FEATURE_FLAG =
  "cgpp_refund_bonus_non_mvp_v0_1" as const;
export const MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_FEATURE_FLAG =
  "cgpp_at_least_tier_platform_match_non_mvp_v0_1" as const;
export const MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_LIVE_MONEY_FLAG =
  "refund_bonus_live_money_enabled" as const;
export const MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_LIVE_MONEY_FLAG =
  "at_least_tier_platform_match_live_money_enabled" as const;

export type MoralPublicGoodsLabsMechanism = "refund_bonus" | "at_least_tier";
export type MoralPublicGoodsLabsRuntimeEnvironment = "production" | "preview" | "development" | "test";
export type MoralPublicGoodsLabsActorRole = "public" | "labs_participant" | "admin" | "service";

export interface MoralPublicGoodsLabsProject {
  readonly id: string;
  readonly name: string;
  readonly reviewState: "Reviewed";
  readonly description: string;
}

export interface MoralPublicGoodsLabsPlatformTier {
  readonly tierIndex: 1 | 2 | 3 | 4 | 5;
  readonly thresholdCents: number;
  readonly forecastProbabilityBps: number;
  readonly platformMatchRateBps: number;
}

export interface MoralPublicGoodsLabsPool {
  readonly slug: "global-biosecurity-coordination";
  readonly title: "Global Biosecurity Coordination";
  readonly description: string;
  readonly closesAt: "2026-07-14T23:59:00Z";
  readonly closesLabel: "Closes Jul 14, 2026, 23:59 UTC (6d 12h remaining)";
  readonly qualitativeProgress: "building";
  readonly minVerifiedSupporters: 150;
  readonly reviewState: "reviewed";
  readonly routeState: "verified";
  readonly progressSealed: true;
  readonly reserveBacked: true;
  readonly nonMvp: true;
  readonly projects: readonly MoralPublicGoodsLabsProject[];
  readonly refundBonus: {
    readonly participantMinGrossCents: 1000;
    readonly participantMaxGrossCents: 10000;
    readonly defaultGrossCents: 2500;
    readonly suggestedMinCents: 1000;
    readonly suggestedMaxCents: 10000;
    readonly bonusCopy: "small backed bonus";
    readonly bonusReserveState: "backed";
    readonly successPremiumPayer: FailureBonusSuccessPremiumPayer;
    readonly successPremiumPricing: FailureBonusSuccessPremiumPricing;
    readonly netRecipientThresholds: readonly [{
      readonly thresholdId: "global-biosecurity-threshold-1";
      readonly thresholdIndex: 1;
      readonly cumulativeNetRecipientThresholdCents: 1_000_000;
    }];
  };
  readonly platformTiers: readonly MoralPublicGoodsLabsPlatformTier[];
}

export interface MoralPublicGoodsLabsAccessInput {
  environment: MoralPublicGoodsLabsRuntimeEnvironment;
  actorRole: MoralPublicGoodsLabsActorRole;
  refundBonusFeatureEnabled: boolean;
  atLeastTierFeatureEnabled: boolean;
  refundBonusViewAllowed: boolean;
  atLeastTierViewAllowed: boolean;
}

export interface MoralPublicGoodsLabsAccessResult {
  canRenderInteractiveUi: boolean;
  reasonCodes: string[];
}

export const MORAL_PUBLIC_GOODS_LABS_POOL: MoralPublicGoodsLabsPool = {
  slug: "global-biosecurity-coordination",
  title: "Global Biosecurity Coordination",
  description:
    "Funding independent research and coordination to reduce catastrophic biological risks that no single actor can solve alone.",
  closesAt: "2026-07-14T23:59:00Z",
  closesLabel: "Closes Jul 14, 2026, 23:59 UTC (6d 12h remaining)",
  qualitativeProgress: "building",
  minVerifiedSupporters: 150,
  reviewState: "reviewed",
  routeState: "verified",
  progressSealed: true,
  reserveBacked: true,
  nonMvp: true,
  projects: [
    {
      id: "pathogen-surveillance-data-commons",
      name: "Pathogen Surveillance Data Commons",
      reviewState: "Reviewed",
      description:
        "Shared infrastructure for reviewed pathogen surveillance datasets, documentation, and access norms.",
    },
    {
      id: "open-biosecurity-methods-lab",
      name: "Open Biosecurity Methods Lab",
      reviewState: "Reviewed",
      description:
        "Independent methods work for safer biosecurity measurement, red-teaming, and coordination practice.",
    },
    {
      id: "global-outbreak-coordination-network",
      name: "Global Outbreak Coordination Network",
      reviewState: "Reviewed",
      description:
        "Coordination capacity for outbreak response playbooks, trusted handoffs, and cross-border information flow.",
    },
  ],
  refundBonus: {
    participantMinGrossCents: 1000,
    participantMaxGrossCents: 10000,
    defaultGrossCents: 2500,
    suggestedMinCents: 1000,
    suggestedMaxCents: 10000,
    bonusCopy: "small backed bonus",
    bonusReserveState: "backed",
    successPremiumPayer: "pool_creator_or_sponsor",
    successPremiumPricing: {
      mode: "experience_rated",
      assumptions: buildProvisionalFailureBonusSuccessPremiumAssumptions(1_000),
      provisional: true,
      rationale: "Illustrative Labs quote pending Moral Trade portfolio claims data.",
    },
    netRecipientThresholds: [
      {
        thresholdId: "global-biosecurity-threshold-1",
        thresholdIndex: 1,
        cumulativeNetRecipientThresholdCents: 1_000_000,
      },
    ],
  },
  platformTiers: [
    { tierIndex: 1, thresholdCents: 100_000, forecastProbabilityBps: 7_500, platformMatchRateBps: 500 },
    { tierIndex: 2, thresholdCents: 300_000, forecastProbabilityBps: 5_500, platformMatchRateBps: 900 },
    { tierIndex: 3, thresholdCents: 500_000, forecastProbabilityBps: 3_500, platformMatchRateBps: 1_500 },
    { tierIndex: 4, thresholdCents: 1_000_000, forecastProbabilityBps: 2_000, platformMatchRateBps: 2_300 },
    { tierIndex: 5, thresholdCents: 2_500_000, forecastProbabilityBps: 1_000, platformMatchRateBps: 3_500 },
  ],
};

export const MORAL_PUBLIC_GOODS_LABS_SUCCESS_PREMIUM_SCHEDULE =
  quoteFailureBonusSuccessPremiumSchedule({
    thresholds: MORAL_PUBLIC_GOODS_LABS_POOL.refundBonus.netRecipientThresholds,
    defaultPricing: MORAL_PUBLIC_GOODS_LABS_POOL.refundBonus.successPremiumPricing,
    premiumPayer: MORAL_PUBLIC_GOODS_LABS_POOL.refundBonus.successPremiumPayer,
  });

export const MORAL_PUBLIC_GOODS_LABS_VIEWPOINT_OPTIONS = [
  "Humanitarian",
  "Animal-inclusive",
  "Long-run future",
  "Institutional resilience",
  "Public knowledge",
  "Other",
  "Prefer not to say",
] as const;

export const MORAL_PUBLIC_GOODS_LABS_PROHIBITED_ORDINARY_COPY = [
  "bet",
  "wager",
  "gamble",
  "profit",
  "prize",
  "lottery",
  "investment",
  "return",
  "cashback",
  "free money",
  "paid if right",
  "payout to you",
  "guaranteed bonus",
  "guaranteed match",
  "objective impact",
  "live real-money available",
  "production-ready",
] as const;

export const MORAL_PUBLIC_GOODS_LABS_ORDINARY_COPY = [
  "Back to moral public goods",
  "LABS",
  MORAL_PUBLIC_GOODS_LABS_POOL.title,
  MORAL_PUBLIC_GOODS_LABS_POOL.description,
  "Reviewed",
  "Routes verified",
  "Progress sealed",
  "Reserve backed",
  "Common Failure Bonus Reserve",
  "Successful pools replenish the reserve through a disclosed success premium.",
  "The net recipient threshold excludes the success premium.",
  "Illustrative success premium: 2.01% ($201 on a $10,000 net recipient threshold).",
  "Gross success requirement: $10,201 before separately disclosed payment fees.",
  "Labs mechanism — Non-MVP. Real-money use is disabled unless this feature is explicitly promoted.",
  "Choose your funding rule",
  "Two ways to support this pool. Learn more about how they work.",
  "Refund-Bonus Pledge",
  "If the pool misses the support threshold, eligible pledgers may receive a small backed bonus.",
  "At-Least-Tier Platform Match",
  "If other eligible support reaches your chosen tier, Moral Trade contributes part of your amount. Otherwise, you pay your amount.",
  "Your pledge",
  "You'll only be charged if the pool clears. If it misses the support threshold, you may receive a small backed bonus.",
  "Suggested: $10-$100",
  "Shown in aggregate only.",
  "You may be charged up to $25.00. Net funds go to the reviewed projects.",
  "You are charged $0. Eligible pledgers may receive a small backed bonus.",
  "Your platform-match commitment",
  "Choose a tier and state the amount you would contribute if other eligible support does not reach that tier.",
  "Moral Trade contributes about $3.75 to the projects. You pay $0.",
  "Your own commitment and same-control accounts do not count toward your forecast result.",
  "There is no direct user payout.",
  "About this pool",
  MORAL_PUBLIC_GOODS_LABS_POOL.closesLabel,
  "Minimum supporters at least 150 verified people",
  "Qualitative progress (sealed)",
  "Building support",
  "Non-MVP feature. May be simulation-only.",
  "Failure bonus is conditional and backed.",
  "No bonus for blocked, unsafe, ineligible, duplicate, payment-failed, or abuse-flagged pledges.",
  "Exact progress is hidden until the round closes.",
  "No direct user payout. Platform match goes to projects.",
  "Platform-match payments do not count toward forecast results.",
] as const;

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

export function formatUsdInput(cents: number) {
  return (cents / 100).toFixed(2);
}

export function parseUsdInputToCents(value: string) {
  const trimmed = value.trim();
  if (!/^\d{0,7}(\.\d{0,2})?$/.test(trimmed) || trimmed === "" || trimmed === ".") {
    return 0;
  }
  const [whole = "0", fraction = ""] = trimmed.split(".");
  return Number.parseInt(whole || "0", 10) * 100 + Number.parseInt(fraction.padEnd(2, "0").slice(0, 2) || "0", 10);
}

export function roundHalfUpBasisPoints(cents: number, basisPoints: number) {
  const safeCents = Math.max(0, Math.trunc(cents));
  const safeBasisPoints = Math.max(0, Math.trunc(basisPoints));
  return Math.floor((safeCents * safeBasisPoints + 5_000) / 10_000);
}

export function estimateLabsFeeCents(grossCents: number) {
  if (grossCents <= 0) return 0;
  return Math.max(0, Math.round(grossCents * 0.038));
}

export function getMoralPublicGoodsLabsSidebarNotes(mechanism: MoralPublicGoodsLabsMechanism) {
  if (mechanism === "refund_bonus") {
    return [
      "Non-MVP feature. May be simulation-only.",
      "Failure bonus is conditional and backed.",
      "Successful pools replenish the common reserve through a disclosed success premium.",
      "The premium is separate from the net recipient threshold.",
      "No bonus for blocked, unsafe, ineligible, duplicate, payment-failed, or abuse-flagged pledges.",
      "Exact progress is hidden until the round closes.",
    ] as const;
  }

  return [
    "Non-MVP feature. May be simulation-only.",
    "No direct user payout. Platform match goes to projects.",
    "Your own commitment and same-control accounts do not count.",
    "Platform-match payments do not count toward forecast results.",
  ] as const;
}

export function evaluateMoralPublicGoodsLabsAccess({
  actorRole,
  atLeastTierFeatureEnabled,
  atLeastTierViewAllowed,
  refundBonusFeatureEnabled,
  refundBonusViewAllowed,
}: MoralPublicGoodsLabsAccessInput): MoralPublicGoodsLabsAccessResult {
  const reasonCodes: string[] = [];
  if (actorRole !== "labs_participant" && actorRole !== "admin" && actorRole !== "service") {
    reasonCodes.push("requires_labs_or_admin_role");
  }
  if (!refundBonusFeatureEnabled) {
    reasonCodes.push(`${MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_FEATURE_FLAG}_disabled`);
  }
  if (!atLeastTierFeatureEnabled) {
    reasonCodes.push(`${MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_FEATURE_FLAG}_disabled`);
  }
  if (!refundBonusViewAllowed) {
    reasonCodes.push("refund_bonus_view_gate_blocked");
  }
  if (!atLeastTierViewAllowed) {
    reasonCodes.push("at_least_tier_view_gate_blocked");
  }

  return {
    canRenderInteractiveUi: reasonCodes.length === 0,
    reasonCodes,
  };
}

export function findProhibitedMoralPublicGoodsLabsCopy(copy: readonly string[]) {
  const joined = copy.join("\n").toLowerCase();
  return MORAL_PUBLIC_GOODS_LABS_PROHIBITED_ORDINARY_COPY.filter((term) =>
    joined.includes(term.toLowerCase()),
  );
}
