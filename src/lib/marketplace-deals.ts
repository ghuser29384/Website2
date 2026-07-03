import type { AgreementRecord, OfferRecord } from "@/lib/app-data";
import { formatMode, type Offer } from "@/lib/offers";
import {
  getActionEvidenceSummary,
  getBaselineConfidence,
  getExternalityReviewSummary,
} from "@/lib/proposal-review";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsMatchPool,
  MpgfPublicGoodsRound,
} from "@/lib/mpgf/types";

export const MIN_PUBLIC_GROUP_COUNT = 5;

export type MarketplaceDealMechanismType =
  | "public_goods_round"
  | "cross_view_donation_swap"
  | "action_for_donation"
  | "offset_trade"
  | "local_pledge"
  | "unknown";

export type MarketplaceDealStatus =
  | "draft"
  | "pending_match"
  | "threshold_close"
  | "active"
  | "under_review"
  | "completed"
  | "refunded"
  | "disputed";

export type MarketplaceBaselineConfidence = "low" | "medium" | "high" | "unavailable";

export type MarketplaceReviewStatus =
  | "unreviewed"
  | "review_pending"
  | "reviewer_approved"
  | "verified_recipient"
  | "unavailable";

export type MarketplaceCategoryKey =
  | "recommended"
  | "public_goods_rounds"
  | "cross_view_swaps"
  | "offset_trades"
  | "pledge_swaps"
  | "local_community_trades"
  | "campus_workplace_trades"
  | "high_match_deals"
  | "nearly_cleared_rounds"
  | "low_friction_pledges"
  | "recently_pledged"
  | "verified_completions"
  | "repeat_contributors";

export type MarketplaceFilterKey =
  | "clears_soon"
  | "highest_match"
  | "lowest_effort"
  | "most_verified"
  | "near_my_community"
  | "beginner_friendly"
  | "same_moral_cluster"
  | "cross_cluster_trade"
  | "public_goods_round"
  | "action_for_donation"
  | "donation_cancellation"
  | "recurring_pledge"
  | "no_personal_exposure"
  | "requires_evidence"
  | "reviewer_approved_only";

export type CommitmentCenterStatus =
  | "draft"
  | "authorized"
  | "pending_match"
  | "threshold_close"
  | "active"
  | "evidence_due"
  | "under_review"
  | "challenge_window"
  | "charged"
  | "released"
  | "completed"
  | "refunded_or_released"
  | "disputed";

export interface MarketplaceDeal {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  mechanismType: MarketplaceDealMechanismType;
  causeTags: string[];
  status?: MarketplaceDealStatus;
  userMaxExposureCents?: number;
  pledgeAmountCents?: number;
  counterpartyVolumeCents?: number;
  sponsorMatchCents?: number;
  totalMovedIfClearedCents?: number;
  effectiveMultiplier?: number;
  thresholdCurrentCents?: number;
  thresholdTargetCents?: number;
  deadline?: string;
  verificationSummary?: string;
  baselineConfidence?: MarketplaceBaselineConfidence;
  reviewStatus?: MarketplaceReviewStatus;
  proximityLabels?: string[];
  privacyNotes?: string[];
  ctaLabel: string;
  actionDescription?: string;
  chargeTiming?: string;
  executionCondition?: string;
  failureRule?: string;
  sourceLabel?: string;
  searchText?: string;
  filterTags?: MarketplaceFilterKey[];
  categoryKeys?: MarketplaceCategoryKey[];
}

export interface MarketplaceCategory {
  key: MarketplaceCategoryKey;
  label: string;
  description: string;
  href: string;
  availabilityLabel: string;
  exactCountSuppressed: boolean;
}

export interface MarketplaceFilterChip {
  key: MarketplaceFilterKey;
  label: string;
  href: string;
  active: boolean;
}

export interface MarketplaceQuery {
  category: MarketplaceCategoryKey;
  filters: MarketplaceFilterKey[];
  query: string;
  scoutCause?: string;
  scoutBudgetCents?: number;
  scoutVerification?: "low" | "medium" | "high";
  scoutRisk?: "low" | "medium" | "high";
  reviewerApprovedOnly: boolean;
}

export interface MarketplaceSurface {
  activeCategory: MarketplaceCategoryKey;
  categories: MarketplaceCategory[];
  deals: MarketplaceDeal[];
  emptyState: string | null;
  filterChips: MarketplaceFilterChip[];
  query: string;
  scoutRecommendations: Array<{ deal: MarketplaceDeal; reasons: string[] }>;
}

export interface DealEconomics {
  userMaxExposureLabel: string;
  pledgeAmountLabel: string;
  counterpartyVolumeLabel: string;
  sponsorMatchLabel: string;
  totalMovedIfClearedLabel: string;
  effectiveMultiplierLabel: string;
  thresholdLabel: string;
  executionCondition: string;
  chargeTiming: string;
  failureRule: string;
}

const CATEGORY_DEFINITIONS = [
  {
    key: "recommended",
    label: "Recommended",
    description: "Reviewable routes from current public data.",
  },
  {
    key: "public_goods_rounds",
    label: "Public-goods rounds",
    description: "Thresholded public-good funding routes.",
  },
  {
    key: "cross_view_swaps",
    label: "Cross-view swaps",
    description: "Trades across different moral priorities.",
  },
  {
    key: "offset_trades",
    label: "Offset trades",
    description: "Donation-offset and cancellation routes.",
  },
  {
    key: "pledge_swaps",
    label: "Pledge swaps",
    description: "Bounded reciprocal action commitments.",
  },
  {
    key: "local_community_trades",
    label: "Local community trades",
    description: "Community-context offers when safely available.",
  },
  {
    key: "campus_workplace_trades",
    label: "Campus/workplace trades",
    description: "Shared-context verification opportunities.",
  },
  {
    key: "high_match_deals",
    label: "High-match deals",
    description: "Deals with reliable sponsor or counterparty leverage.",
  },
  {
    key: "nearly_cleared_rounds",
    label: "Nearly-cleared rounds",
    description: "Threshold routes close to clearing.",
  },
  {
    key: "low_friction_pledges",
    label: "Low-friction pledges",
    description: "Lower evidence burden or small exposure.",
  },
  {
    key: "recently_pledged",
    label: "Recently pledged",
    description: "Recent public pledge-like records.",
  },
  {
    key: "verified_completions",
    label: "Verified completions",
    description: "Completed records only when verification is public.",
  },
  {
    key: "repeat_contributors",
    label: "Repeat contributors",
    description: "Repeat contributor signals when privacy-safe.",
  },
] as const satisfies ReadonlyArray<{
  key: MarketplaceCategoryKey;
  label: string;
  description: string;
}>;

const FILTER_DEFINITIONS = [
  ["clears_soon", "Clears soon"],
  ["highest_match", "Highest match"],
  ["lowest_effort", "Lowest effort"],
  ["most_verified", "Most verified"],
  ["near_my_community", "Near my community"],
  ["beginner_friendly", "Beginner-friendly"],
  ["same_moral_cluster", "Same moral cluster"],
  ["cross_cluster_trade", "Cross-cluster trade"],
  ["public_goods_round", "Public-goods round"],
  ["action_for_donation", "Action-for-donation"],
  ["donation_cancellation", "Donation cancellation"],
  ["recurring_pledge", "Recurring pledge"],
  ["no_personal_exposure", "No personal exposure"],
  ["requires_evidence", "Requires evidence"],
  ["reviewer_approved_only", "Reviewer-approved only"],
] as const satisfies ReadonlyArray<readonly [MarketplaceFilterKey, string]>;

const DEFAULT_SAFE_PROXIMITY = [
  "Compatible moral cluster",
  "Low verification cost",
] as const;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

function centsToUsd(cents: number | undefined) {
  if (typeof cents !== "number" || !Number.isFinite(cents)) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

function parseSearchValues(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value ? [value] : [];
}

function parseSearchValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  return parseSearchValues(searchParams, key)[0] ?? "";
}

function isMarketplaceCategory(value: string): value is MarketplaceCategoryKey {
  return CATEGORY_DEFINITIONS.some((category) => category.key === value);
}

function isMarketplaceFilter(value: string): value is MarketplaceFilterKey {
  return FILTER_DEFINITIONS.some(([key]) => key === value);
}

function addIfDefined(values: string[], value: string | null | undefined) {
  if (value && value.trim() && value !== "Not needed") {
    values.push(value.trim());
  }
}

function uniqueStrings(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeBaselineConfidence(value: string): MarketplaceBaselineConfidence {
  const normalized = normalizeText(value);
  if (normalized.includes("high")) return "high";
  if (normalized.includes("medium")) return "medium";
  if (normalized.includes("low")) return "low";
  return "unavailable";
}

function mapOfferModeToMechanismType(offer: {
  mode: string;
  donationOffset?: unknown;
}): MarketplaceDealMechanismType {
  if (offer.mode === "offset") {
    return offer.donationOffset ? "cross_view_donation_swap" : "offset_trade";
  }

  if (offer.mode === "payment") {
    return "action_for_donation";
  }

  if (offer.mode === "pledge") {
    return "local_pledge";
  }

  return "unknown";
}

function mapOfferStatus(value: string): MarketplaceDealStatus {
  if (value === "completed") return "completed";
  if (value === "cancelled" || value === "archived") return "refunded";
  if (value === "draft") return "draft";
  return "pending_match";
}

function getOfferCtaLabel(offer: { mode: string; donationOffset?: { participation_mode?: string } | null }) {
  void offer;
  return "View details";
}

function buildOfferCategoryKeys(deal: MarketplaceDeal): MarketplaceCategoryKey[] {
  const categories: MarketplaceCategoryKey[] = ["recommended"];

  if (deal.mechanismType === "cross_view_donation_swap") {
    categories.push("cross_view_swaps", "offset_trades");
  }
  if (deal.mechanismType === "offset_trade") {
    categories.push("offset_trades");
  }
  if (deal.mechanismType === "local_pledge") {
    categories.push("pledge_swaps");
  }
  if (deal.mechanismType === "action_for_donation") {
    categories.push("pledge_swaps");
  }
  if (deal.effectiveMultiplier && deal.effectiveMultiplier > 1) {
    categories.push("high_match_deals");
  }
  if ((deal.userMaxExposureCents ?? 0) <= 1_000 || !deal.userMaxExposureCents) {
    categories.push("low_friction_pledges");
  }
  if (deal.status === "completed") {
    categories.push("verified_completions");
  }

  return uniqueStrings(categories) as MarketplaceCategoryKey[];
}

function buildFilterTags(deal: MarketplaceDeal): MarketplaceFilterKey[] {
  const filters: MarketplaceFilterKey[] = [];
  const text = normalizeText(
    [
      deal.title,
      deal.subtitle,
      deal.verificationSummary,
      deal.executionCondition,
      deal.chargeTiming,
      deal.failureRule,
      deal.causeTags.join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (deal.deadline && Date.parse(deal.deadline) > Date.now() && Date.parse(deal.deadline) - Date.now() <= 1000 * 60 * 60 * 24 * 30) {
    filters.push("clears_soon");
  }
  if ((deal.effectiveMultiplier ?? 0) > 1 || (deal.sponsorMatchCents ?? 0) > 0) {
    filters.push("highest_match");
  }
  if (text.includes("public pledge") || text.includes("light verification") || (deal.userMaxExposureCents ?? 0) <= 1_000) {
    filters.push("lowest_effort", "beginner_friendly");
  }
  if (deal.reviewStatus === "reviewer_approved" || deal.reviewStatus === "verified_recipient") {
    filters.push("most_verified", "reviewer_approved_only");
  }
  if (deal.proximityLabels?.some((label) => /community|campus|workplace|organization/i.test(label))) {
    filters.push("near_my_community");
  }
  if (deal.proximityLabels?.some((label) => /cluster/i.test(label))) {
    filters.push("same_moral_cluster");
  }
  if (deal.causeTags.length > 1 || deal.mechanismType === "cross_view_donation_swap") {
    filters.push("cross_cluster_trade");
  }
  if (deal.mechanismType === "public_goods_round") {
    filters.push("public_goods_round", "requires_evidence");
  }
  if (deal.mechanismType === "action_for_donation") {
    filters.push("action_for_donation");
  }
  if (deal.mechanismType === "offset_trade" || deal.mechanismType === "cross_view_donation_swap") {
    filters.push("donation_cancellation");
  }
  if (/month|recurring|open-ended/i.test(text)) {
    filters.push("recurring_pledge");
  }
  if (!deal.userMaxExposureCents || deal.userMaxExposureCents === 0) {
    filters.push("no_personal_exposure");
  }
  if (deal.verificationSummary) {
    filters.push("requires_evidence");
  }

  return uniqueStrings(filters) as MarketplaceFilterKey[];
}

function withDerivedDealFields(deal: MarketplaceDeal): MarketplaceDeal {
  const totalMovedIfClearedCents =
    typeof deal.totalMovedIfClearedCents === "number"
      ? deal.totalMovedIfClearedCents
      : [deal.pledgeAmountCents, deal.counterpartyVolumeCents, deal.sponsorMatchCents]
          .filter((value): value is number => typeof value === "number")
          .reduce((sum, value) => sum + value, 0);
  const reliableTotal =
    typeof deal.totalMovedIfClearedCents === "number" ||
    [deal.pledgeAmountCents, deal.counterpartyVolumeCents, deal.sponsorMatchCents].some(
      (value) => typeof value === "number",
    );
  const effectiveMultiplier =
    typeof deal.effectiveMultiplier === "number"
      ? deal.effectiveMultiplier
      : reliableTotal && deal.pledgeAmountCents && deal.pledgeAmountCents > 0
        ? Number((totalMovedIfClearedCents / deal.pledgeAmountCents).toFixed(2))
        : undefined;
  const baseDeal = {
    ...deal,
    totalMovedIfClearedCents: reliableTotal ? totalMovedIfClearedCents : undefined,
    effectiveMultiplier,
    proximityLabels: deal.proximityLabels?.length ? deal.proximityLabels : [...DEFAULT_SAFE_PROXIMITY],
  };
  const categoryKeys = deal.categoryKeys ?? buildOfferCategoryKeys(baseDeal);
  const filterTags = deal.filterTags ?? buildFilterTags({ ...baseDeal, categoryKeys });
  const searchText = [
    baseDeal.title,
    baseDeal.subtitle,
    baseDeal.mechanismType,
    baseDeal.causeTags.join(" "),
    baseDeal.verificationSummary,
    baseDeal.reviewStatus,
    baseDeal.baselineConfidence,
    baseDeal.proximityLabels?.join(" "),
    baseDeal.actionDescription,
    baseDeal.executionCondition,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ...baseDeal,
    categoryKeys,
    filterTags,
    searchText,
  };
}

export function marketplaceDealFromOfferRecord(offer: OfferRecord): MarketplaceDeal {
  const reviewInput = {
    mode: offer.mode,
    verification: offer.verification,
    trustLevel: offer.trust_level,
    baselineAmountUsd: offer.donationOffset ? offer.donationOffset.baseline_amount_cents / 100 : null,
    baselineOpposedCause: offer.donationOffset?.baseline_opposed_cause ?? "",
    requestedMatchingAmountUsd: offer.donationOffset
      ? offer.donationOffset.requested_matching_amount_cents / 100
      : null,
    requestedOpposedCause: offer.donationOffset?.requested_opposed_cause ?? "",
    evidenceUrl: offer.donationOffset?.evidence_url ?? "",
    moderationStatus: offer.donationOffset?.moderation_status ?? null,
    offeredCause: offer.offered_cause,
    requestedCause: offer.requested_cause,
  };
  const causeTags: string[] = [];
  addIfDefined(causeTags, offer.offered_cause);
  addIfDefined(causeTags, offer.requested_cause);
  addIfDefined(causeTags, offer.compromise_cause);
  addIfDefined(causeTags, offer.donationOffset?.compromiseCharity?.cause_area);
  const userMaxExposureCents =
    offer.mode === "offset" && offer.donationOffset
      ? offer.donationOffset.requested_matching_amount_cents
      : undefined;
  const counterpartyVolumeCents =
    offer.mode === "offset" && offer.donationOffset
      ? offer.donationOffset.baseline_amount_cents
      : undefined;
  const thresholdTargetCents =
    offer.donationOffset?.participation_mode === "pool"
      ? offer.donationOffset.pool?.assurance_minimum_cents || offer.donationOffset.assurance_minimum_cents || undefined
      : offer.donationOffset?.assurance_minimum_cents || undefined;
  const thresholdCurrentCents =
    offer.donationOffset?.participation_mode === "pool"
      ? offer.donationOffset.pool?.matchedCompromiseCents
      : undefined;

  return withDerivedDealFields({
    actionDescription: offer.offer_action,
    baselineConfidence: normalizeBaselineConfidence(getBaselineConfidence(reviewInput)),
    causeTags: uniqueStrings(causeTags),
    chargeTiming:
      offer.mode === "offset"
        ? "Charged or redirected only through the existing matched-offset or pool flow after review gates pass."
        : "No payment is authorized from this card. Any future charge requires the existing agreement payment path.",
    counterpartyVolumeCents,
    ctaLabel: getOfferCtaLabel(offer),
    deadline: offer.donationOffset?.assurance_deadline_at ?? offer.donationOffset?.offer_expires_at ?? undefined,
    executionCondition:
      offer.mode === "offset"
        ? "Executes only if matching, review, evidence, and participant confirmation conditions pass."
        : "Executes only after both sides accept frozen terms and evidence requirements.",
    failureRule:
      offer.mode === "offset"
        ? "If matching or review fails, no new donation is implied by this marketplace card."
        : "If terms are not accepted or evidence fails, the agreement path records release, cancellation, or dispute state.",
    href: `/offers/${offer.id}`,
    id: offer.id,
    mechanismType: mapOfferModeToMechanismType(offer),
    pledgeAmountCents: userMaxExposureCents,
    privacyNotes: [
      "Private messages, exact wishes, raw evidence, and contact details stay sign-in or reviewer gated.",
      "Saved-offer and interest state is not public by default.",
    ],
    proximityLabels: [
      "Compatible moral cluster",
      offer.ownerProfile?.public_location_granularity === "city"
        ? "Near your community"
        : "Private until mutual opt-in",
      offer.verification.toLowerCase().includes("peer") ? "Shared-context verification" : "Low verification cost",
    ],
    reviewStatus:
      offer.mode === "offset" && offer.donationOffset?.moderation_status === "clear"
        ? "review_pending"
        : "unreviewed",
    sourceLabel: "Live offer",
    status: mapOfferStatus(offer.status),
    subtitle: offer.notes || `${formatMode(offer.mode)} with ${offer.verification.toLowerCase()} evidence.`,
    thresholdCurrentCents,
    thresholdTargetCents,
    title: `${offer.offered_cause} for ${offer.requested_cause}`,
    userMaxExposureCents,
    verificationSummary: getActionEvidenceSummary(reviewInput),
  });
}

export function marketplaceDealFromWorkedOffer(offer: Offer): MarketplaceDeal {
  const reviewInput = {
    mode: offer.mode,
    verification: offer.verification,
    trustLevel: offer.trustLevel,
    baselineAmountUsd: offer.baselineAmountUsd,
    baselineOpposedCause: offer.baselineOpposedCause,
    requestedMatchingAmountUsd: offer.requestedMatchingAmountUsd,
    requestedOpposedCause: offer.requestedOpposedCause,
    evidenceUrl: offer.evidenceUrl,
    moderationStatus: offer.moderationStatus,
    offeredCause: offer.offeredCause,
    requestedCause: offer.requestedCause,
  };
  const userMaxExposureCents =
    offer.mode === "offset" && typeof offer.requestedMatchingAmountUsd === "number"
      ? Math.round(offer.requestedMatchingAmountUsd * 100)
      : undefined;
  const counterpartyVolumeCents =
    offer.mode === "offset" && typeof offer.baselineAmountUsd === "number"
      ? Math.round(offer.baselineAmountUsd * 100)
      : undefined;

  return withDerivedDealFields({
    actionDescription: offer.offerAction,
    baselineConfidence: normalizeBaselineConfidence(getBaselineConfidence(reviewInput)),
    causeTags: uniqueStrings([offer.offeredCause, offer.requestedCause, offer.compromiseCause]),
    chargeTiming: "Worked examples do not charge or authorize money.",
    counterpartyVolumeCents,
    ctaLabel: "View details",
    executionCondition: "Example only. Create a reviewed draft before anyone can rely on it.",
    failureRule: "No live obligation exists in the worked-example lane.",
    href: `/offers/examples/${offer.id}`,
    id: offer.id,
    mechanismType: offer.mode === "offset" ? "cross_view_donation_swap" : mapOfferModeToMechanismType(offer),
    pledgeAmountCents: userMaxExposureCents,
    privacyNotes: [
      "Worked examples are illustrative and do not expose private participants.",
      "Counts and outcomes are not live marketplace liquidity.",
    ],
    reviewStatus: "review_pending",
    sourceLabel: "Worked example",
    status: "draft",
    subtitle: offer.notes || `${offer.duration} example with ${offer.verification.toLowerCase()} evidence.`,
    title: `${offer.alias}: ${offer.offeredCause} for ${offer.requestedCause}`,
    userMaxExposureCents,
    verificationSummary: getActionEvidenceSummary(reviewInput),
  });
}

export function marketplaceDealsFromPublicGoodsCampaigns({
  campaigns,
  matchPool,
  round,
}: {
  campaigns: readonly MpgfPublicGoodsCampaign[];
  matchPool: MpgfPublicGoodsMatchPool;
  round: MpgfPublicGoodsRound;
}): MarketplaceDeal[] {
  const sponsorPoolNote =
    matchPool.budgetCents > 0
      ? "Sponsor pool exists, but campaign-level match allocation is unavailable until round accounting clears."
      : "Sponsor match is unavailable for this campaign preview.";

  return campaigns.map((campaign) =>
    withDerivedDealFields({
      actionDescription: campaign.publicSummary,
      baselineConfidence: "unavailable",
      categoryKeys: ["recommended", "public_goods_rounds"],
      causeTags: campaign.causeTags,
      chargeTiming:
        "No charge in this preview. Payment authorization uses the existing MPGF gates only after thresholds and review pass.",
      ctaLabel: "Preview budget",
      deadline: campaign.deadlineAt || round.endsAt,
      executionCondition: "Pledge moves only if threshold, review, identity, payment, and authorization gates pass.",
      failureRule: campaign.exitRule,
      href: `/mpgf/rounds/${round.id}#${campaign.slug}`,
      id: campaign.id,
      mechanismType: "public_goods_round",
      privacyNotes: [
        "Exact supporter counts may stay sealed before close.",
        "Private payment identifiers and private evidence are not public by default.",
        sponsorPoolNote,
      ],
      reviewStatus:
        campaign.reviewStatus === "approved" || campaign.reviewStatus === "challenge_window"
          ? "verified_recipient"
          : "review_pending",
      sourceLabel: "Public Goods Fund",
      status:
        campaign.reviewStatus === "challenge_window"
          ? "under_review"
          : "pending_match",
      subtitle: campaign.publicSummary,
      thresholdTargetCents: campaign.thresholdAmountCents,
      title: campaign.title,
      userMaxExposureCents: undefined,
      verificationSummary: campaign.verificationMethod,
    }),
  );
}

export function buildMarketplaceDeals({
  liveOffers,
  publicGoodsCampaigns,
  publicGoodsMatchPool,
  publicGoodsRound,
  workedOffers,
}: {
  liveOffers: readonly OfferRecord[];
  publicGoodsCampaigns: readonly MpgfPublicGoodsCampaign[];
  publicGoodsMatchPool: MpgfPublicGoodsMatchPool;
  publicGoodsRound: MpgfPublicGoodsRound;
  workedOffers: readonly Offer[];
}) {
  return [
    ...liveOffers.map(marketplaceDealFromOfferRecord),
    ...marketplaceDealsFromPublicGoodsCampaigns({
      campaigns: publicGoodsCampaigns,
      matchPool: publicGoodsMatchPool,
      round: publicGoodsRound,
    }),
    ...workedOffers.map(marketplaceDealFromWorkedOffer),
  ];
}

export function parseMarketplaceQuery(
  searchParams: Record<string, string | string[] | undefined>,
): MarketplaceQuery {
  const rawCategory = parseSearchValue(searchParams, "marketplace_category");
  const filters = uniqueStrings([
    ...parseSearchValues(searchParams, "marketplace_filter"),
    ...parseSearchValue(searchParams, "marketplace_filters").split(","),
  ]).filter(isMarketplaceFilter);
  const budgetDollars = Number.parseFloat(parseSearchValue(searchParams, "scout_budget"));
  const category = isMarketplaceCategory(rawCategory) ? rawCategory : "recommended";
  const verification = parseSearchValue(searchParams, "scout_verification");
  const risk = parseSearchValue(searchParams, "scout_risk");

  return {
    category,
    filters,
    query: parseSearchValue(searchParams, "search").trim().slice(0, 120),
    reviewerApprovedOnly: parseSearchValue(searchParams, "scout_reviewer_approved") === "1",
    scoutBudgetCents:
      Number.isFinite(budgetDollars) && budgetDollars > 0
        ? Math.round(Math.min(budgetDollars, 100_000) * 100)
        : undefined,
    scoutCause: parseSearchValue(searchParams, "scout_cause").trim().slice(0, 80) || undefined,
    scoutRisk: risk === "low" || risk === "medium" || risk === "high" ? risk : undefined,
    scoutVerification:
      verification === "low" || verification === "medium" || verification === "high"
        ? verification
        : undefined,
  };
}

export function buildMarketplaceHref({
  category,
  filters = [],
  query,
}: {
  category?: MarketplaceCategoryKey;
  filters?: readonly MarketplaceFilterKey[];
  query?: string;
}) {
  const params = new URLSearchParams();
  if (query) params.set("search", query);
  if (category && category !== "recommended") params.set("marketplace_category", category);
  filters.forEach((filter) => params.append("marketplace_filter", filter));
  const serialized = params.toString();
  return serialized ? `/offers?${serialized}` : "/offers";
}

function privacySafeAvailability(count: number) {
  if (count >= MIN_PUBLIC_GROUP_COUNT) {
    return {
      availabilityLabel: `${compactNumber(count)} available`,
      exactCountSuppressed: false,
    };
  }

  if (count > 0) {
    return {
      availabilityLabel: "Available",
      exactCountSuppressed: true,
    };
  }

  return {
    availabilityLabel: "Unavailable",
    exactCountSuppressed: false,
  };
}

function dealMatchesSearch(deal: MarketplaceDeal, query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return true;
  }

  const haystack = normalizeText(
    deal.searchText ??
      [
        deal.title,
        deal.subtitle,
        deal.mechanismType,
        deal.causeTags.join(" "),
        deal.verificationSummary,
        deal.reviewStatus,
        deal.baselineConfidence,
        deal.proximityLabels?.join(" "),
        deal.actionDescription,
        deal.executionCondition,
      ]
        .filter(Boolean)
        .join(" "),
  );
  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function dealMatchesCategory(deal: MarketplaceDeal, category: MarketplaceCategoryKey) {
  return category === "recommended" || (deal.categoryKeys ?? []).includes(category);
}

function dealMatchesFilters(deal: MarketplaceDeal, filters: readonly MarketplaceFilterKey[]) {
  return filters.every((filter) => (deal.filterTags ?? []).includes(filter));
}

function sortMarketplaceDeals(deals: readonly MarketplaceDeal[]) {
  return [...deals].sort((left, right) => {
    const leftRank =
      Number(left.status === "threshold_close") * 4 +
      Number(left.reviewStatus === "verified_recipient") * 3 +
      Number((left.effectiveMultiplier ?? 0) > 1) * 2 +
      Number(left.sourceLabel === "Live offer");
    const rightRank =
      Number(right.status === "threshold_close") * 4 +
      Number(right.reviewStatus === "verified_recipient") * 3 +
      Number((right.effectiveMultiplier ?? 0) > 1) * 2 +
      Number(right.sourceLabel === "Live offer");

    return rightRank - leftRank || left.title.localeCompare(right.title);
  });
}

export function buildMarketplaceSurface(
  deals: readonly MarketplaceDeal[],
  query: MarketplaceQuery,
): MarketplaceSurface {
  const matchingSearchDeals = deals.filter((deal) => dealMatchesSearch(deal, query.query));
  const visibleDeals = sortMarketplaceDeals(
    matchingSearchDeals.filter(
      (deal) =>
        dealMatchesCategory(deal, query.category) &&
        dealMatchesFilters(deal, query.filters),
    ),
  );
  const categories = CATEGORY_DEFINITIONS.map((category) => {
    const count = matchingSearchDeals.filter((deal) => dealMatchesCategory(deal, category.key)).length;
    const availability = privacySafeAvailability(count);

    return {
      ...category,
      href: buildMarketplaceHref({
        category: category.key,
        filters: query.filters,
        query: query.query,
      }),
      ...availability,
    };
  });
  const filterChips = FILTER_DEFINITIONS.map(([key, label]) => {
    const active = query.filters.includes(key);
    const nextFilters = active
      ? query.filters.filter((filter) => filter !== key)
      : [...query.filters, key];

    return {
      active,
      href: buildMarketplaceHref({
        category: query.category,
        filters: nextFilters,
        query: query.query,
      }),
      key,
      label,
    };
  });
  const scoutRecommendations = recommendMarketplaceDeals(deals, query);

  return {
    activeCategory: query.category,
    categories,
    deals: visibleDeals,
    emptyState: visibleDeals.length
      ? null
      : "No reliable public deal data matches these filters. Private fields, exact small-group counts, and unsupported payment states are intentionally not searched.",
    filterChips,
    query: query.query,
    scoutRecommendations,
  };
}

export function buildDealEconomics(deal: MarketplaceDeal): DealEconomics {
  const totalMoved =
    typeof deal.totalMovedIfClearedCents === "number"
      ? deal.totalMovedIfClearedCents
      : undefined;
  const thresholdLabel =
    typeof deal.thresholdTargetCents === "number"
      ? `${centsToUsd(deal.thresholdCurrentCents ?? 0)} of ${centsToUsd(deal.thresholdTargetCents)}`
      : "Unavailable";

  return {
    chargeTiming: deal.chargeTiming ?? "Charged only if conditions pass.",
    counterpartyVolumeLabel: centsToUsd(deal.counterpartyVolumeCents),
    effectiveMultiplierLabel:
      typeof deal.effectiveMultiplier === "number"
        ? `${deal.effectiveMultiplier.toFixed(2)}x if cleared`
        : "Unavailable",
    executionCondition: deal.executionCondition ?? "Requires frozen terms and review gates first.",
    failureRule: deal.failureRule ?? "Authorization released or no obligation created if conditions fail.",
    pledgeAmountLabel: centsToUsd(deal.pledgeAmountCents),
    sponsorMatchLabel: centsToUsd(deal.sponsorMatchCents),
    thresholdLabel,
    totalMovedIfClearedLabel: centsToUsd(totalMoved),
    userMaxExposureLabel: centsToUsd(deal.userMaxExposureCents),
  };
}

export function mapAgreementToCommitmentStatus(
  agreement: Pick<
    AgreementRecord,
    "status" | "payments" | "paymentSchedules" | "evidenceItems" | "reviewCases" | "performanceBonds" | "bondEvidence" | "bondChallenges"
  >,
): CommitmentCenterStatus {
  if (agreement.reviewCases.some((reviewCase) => reviewCase.status === "open")) {
    return "under_review";
  }

  if (agreement.bondChallenges.length || agreement.payments.some((payment) => payment.status === "disputed")) {
    return "disputed";
  }

  if (agreement.payments.some((payment) => payment.status === "refunded")) {
    return "refunded_or_released";
  }

  if (agreement.payments.some((payment) => payment.status === "paid")) {
    return "charged";
  }

  if (agreement.payments.some((payment) => payment.authorization_status === "authorized")) {
    return "authorized";
  }

  if (agreement.performanceBonds.some((bond) => bond.status === "challenge_window_open")) {
    return "challenge_window";
  }

  if (agreement.performanceBonds.some((bond) => bond.status === "evidence_due")) {
    return "evidence_due";
  }

  if (agreement.status === "completed") {
    return "completed";
  }

  if (agreement.status === "cancelled") {
    return "refunded_or_released";
  }

  if (agreement.status === "proposed") {
    return "pending_match";
  }

  if (agreement.paymentSchedules.some((schedule) => schedule.status === "active")) {
    return "active";
  }

  if (!agreement.evidenceItems.length && agreement.performanceBonds.some((bond) => bond.enabled)) {
    return "evidence_due";
  }

  return "active";
}

export function getCommitmentStatusLabel(status: CommitmentCenterStatus) {
  const labels: Record<CommitmentCenterStatus, string> = {
    active: "Active",
    authorized: "Authorized",
    challenge_window: "Challenge window",
    charged: "Charged",
    completed: "Completed",
    disputed: "Disputed",
    draft: "Draft",
    evidence_due: "Evidence due",
    pending_match: "Pending match",
    refunded_or_released: "Refunded / authorization released",
    released: "Released",
    threshold_close: "Threshold close",
    under_review: "Under review",
  };

  return labels[status];
}

export function recommendMarketplaceDeals(deals: readonly MarketplaceDeal[], query: MarketplaceQuery) {
  if (!query.scoutCause && !query.scoutBudgetCents && !query.scoutVerification && !query.reviewerApprovedOnly) {
    return [];
  }

  return sortMarketplaceDeals(deals)
    .map((deal) => {
      const reasons: string[] = [];
      const cause = query.scoutCause ? normalizeText(query.scoutCause) : "";

      if (cause && deal.causeTags.some((tag) => normalizeText(tag).includes(cause))) {
        reasons.push("Matches your cause preference");
      }

      if (
        typeof query.scoutBudgetCents === "number" &&
        (!deal.userMaxExposureCents || deal.userMaxExposureCents <= query.scoutBudgetCents)
      ) {
        reasons.push("Within your monthly cap");
      }

      if (query.scoutVerification === "low" && (deal.filterTags ?? []).includes("lowest_effort")) {
        reasons.push("Low verification burden");
      }

      if (
        query.reviewerApprovedOnly &&
        (deal.reviewStatus === "reviewer_approved" || deal.reviewStatus === "verified_recipient")
      ) {
        reasons.push("Reviewer-approved");
      }

      if (deal.status === "threshold_close") {
        reasons.push("Threshold close");
      }

      if ((deal.filterTags ?? []).includes("no_personal_exposure")) {
        reasons.push("No personal exposure");
      }

      return { deal, reasons };
    })
    .filter((entry) => entry.reasons.length)
    .slice(0, 3);
}

export function buildCompatibleAdditions(
  currentDeal: MarketplaceDeal,
  candidateDeals: readonly MarketplaceDeal[],
) {
  const currentExposure = currentDeal.userMaxExposureCents ?? 0;

  return candidateDeals
    .filter((deal) => deal.id !== currentDeal.id)
    .map((deal) => {
      const changedExposure = currentExposure + (deal.userMaxExposureCents ?? 0);
      const sharedCause = deal.causeTags.find((tag) => currentDeal.causeTags.includes(tag));
      const reasons: string[] = [];

      if (sharedCause) {
        reasons.push(`Shares ${sharedCause}`);
      }
      if ((deal.filterTags ?? []).includes("lowest_effort")) {
        reasons.push("Low verification burden");
      }
      if ((deal.filterTags ?? []).includes("no_personal_exposure")) {
        reasons.push("No personal exposure");
      }

      return {
        deal,
        changedExposureCents: changedExposure,
        changedExposureLabel: centsToUsd(changedExposure),
        changedVerificationDuties:
          deal.verificationSummary ?? "Verification requirement unavailable until review.",
        reasons,
      };
    })
    .filter((addition) => addition.reasons.length)
    .slice(0, 2);
}
