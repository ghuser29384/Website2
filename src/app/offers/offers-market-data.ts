import "server-only";

import { normalizeCreditSignal, smartDiscoveryScore } from "@/lib/smart-discovery-ranking";
import {
  extractMoneyAmountsCents,
  getSmartDeadlineUrgency,
  matchesSmartAmountConstraint,
  matchesSmartDeadlineConstraint,
  matchesSmartVerificationConstraint,
  serializeSmartQueryFacets,
  type SmartQueryFacets,
  type SmartQueryInterpretation,
  type SmartQuerySort,
} from "@/lib/smart-query";
import { hasSmartQueryConstraints } from "@/lib/smart-query-facets";
import {
  evidenceTextQuality,
  extractSmartRecordDeadline,
  isVerifiedEvidenceText,
} from "@/lib/smart-query-records";
import {
  smartCauseMatchScore,
  smartInterpretationScore,
  smartPersonalPriorityScore,
} from "@/lib/smart-query-scoring";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
export type OfferMode = OfferRow["mode"];
export type ModeFilter = "all" | OfferMode;
export type OfferSort = Extract<
  SmartQuerySort,
  | "best_match"
  | "newest"
  | "lowest_cost"
  | "most_verified"
  | "soonest_deadline"
  | "highest_credit"
>;

interface RankedOffer {
  amountCents: number[];
  causeIds: string[];
  deadline: string | null;
  evidenceQuality: number;
  offer: OfferRow;
  score: number;
  semanticRelevance: number;
  verified: boolean;
}

export interface LiveOffersResult {
  items: OfferRow[];
  total: number;
  error: string | null;
  candidateLimitReached: boolean;
}

export const MODE_OPTIONS: ReadonlyArray<{ value: ModeFilter; label: string }> = [
  { value: "all", label: "Any proposal type" },
  { value: "pledge", label: "Pledge or reciprocal action" },
  { value: "payment", label: "Payment-supported action" },
  { value: "offset", label: "Donation offset" },
];

export const SORT_OPTIONS: ReadonlyArray<{ value: OfferSort; label: string }> = [
  { value: "best_match", label: "Best match" },
  { value: "most_verified", label: "Strongest evidence" },
  { value: "soonest_deadline", label: "Soonest deadline" },
  { value: "lowest_cost", label: "Lowest stated cost" },
  { value: "highest_credit", label: "Highest transaction credit" },
  { value: "newest", label: "Newest" },
];

export const SMART_OFFER_CANDIDATE_LIMIT = 2_000;
const LIVE_OFFERS_CHUNK_SIZE = 1_000;

export const WORKED_EXAMPLE =
  CANONICAL_WORKED_CASE_OFFERS.find((offer) => offer.id === "seed-victoria") ??
  CANONICAL_WORKED_CASE_OFFERS[0];

export function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function parseMode(value: string): ModeFilter {
  return MODE_OPTIONS.some((option) => option.value === value)
    ? (value as ModeFilter)
    : "all";
}

export function parseSort(value: string, hasSmartSearch: boolean): OfferSort {
  if (SORT_OPTIONS.some((option) => option.value === value)) {
    return value as OfferSort;
  }

  return hasSmartSearch ? "best_match" : "newest";
}

export function normalizeSearch(value: string) {
  return value.trim().slice(0, 500).replace(/\s+/g, " ");
}

function offerTextFields(offer: OfferRow) {
  return [
    {
      value: `${offer.offered_cause} ${offer.requested_cause} ${offer.compromise_cause}`,
      weight: 1,
    },
    { value: `${offer.offer_action} ${offer.request_action}`, weight: 0.94 },
    { value: offer.verification, weight: 0.82 },
    { value: `${offer.discount_note} ${offer.notes}`, weight: 0.74 },
    { value: `${offer.owner_alias} ${offer.duration}`, weight: 0.58 },
  ] as const;
}

function offerAmounts(offer: OfferRow) {
  return extractMoneyAmountsCents(
    offer.request_action,
    offer.offer_action,
    offer.discount_note,
    offer.notes,
    offer.duration,
  );
}

function offerCauseIds(offer: OfferRow) {
  return smartCauseMatchScore
    ? []
    : [];
}

function parsedOfferCauseIds(offer: OfferRow, interpretation: SmartQueryInterpretation) {
  const normalizedTerms = `${offer.offered_cause} ${offer.requested_cause} ${offer.compromise_cause}`
    .toLocaleLowerCase("en-US")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  return interpretation.facets.causes.filter((cause) => {
    const causeTerms = cause
      .toLocaleLowerCase("en-US")
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    return causeTerms.some((term) => normalizedTerms.includes(term));
  });
}

function strictAmountMatch(facets: SmartQueryFacets, amounts: readonly number[]) {
  if (facets.minAmountCents === null && facets.maxAmountCents === null) return true;
  if (!amounts.length) return false;
  return amounts.every((amount) => matchesSmartAmountConstraint(facets, [amount]));
}

function offerMatchesHardConstraints(
  offer: OfferRow,
  facets: SmartQueryFacets,
  causeIds: readonly string[],
  amountCents: readonly number[],
  deadline: string | null,
  verified: boolean,
) {
  if (facets.actionTypes.length) {
    const modeMatches = facets.actionTypes.some((actionType) => actionType === offer.mode);
    if (!modeMatches) return false;
  }
  if (facets.causes.length) {
    const causeScore = smartCauseMatchScore(facets.causes, offerTextFields(offer));
    if (causeScore < 0.42 && !facets.causes.some((cause) => causeIds.includes(cause))) {
      return false;
    }
  }
  if (!matchesSmartVerificationConstraint(facets, verified)) return false;
  if (!strictAmountMatch(facets, amountCents)) return false;
  if (!matchesSmartDeadlineConstraint(facets, deadline)) return false;
  if (
    facets.minCredit !== null &&
    normalizeCreditSignal(offer.trust_level) * 100 < facets.minCredit
  ) {
    return false;
  }
  if (facets.location || facets.participantKinds.length) return false;
  return true;
}

function rankOffer(
  offer: OfferRow,
  interpretation: SmartQueryInterpretation,
  personalPriorities: readonly string[],
  now: Date,
): RankedOffer | null {
  const fields = offerTextFields(offer);
  const amountCents = offerAmounts(offer);
  const causeIds = parsedOfferCauseIds(offer, interpretation);
  const deadline = extractSmartRecordDeadline(
    [offer.duration, offer.discount_note, offer.notes, offer.request_action, offer.offer_action],
    now,
  );
  const verified = isVerifiedEvidenceText(offer.verification);
  const evidenceQuality = evidenceTextQuality(offer.verification);
  const semanticRelevance = smartInterpretationScore(interpretation, fields);

  if (
    !offerMatchesHardConstraints(
      offer,
      interpretation.facets,
      causeIds,
      amountCents,
      deadline,
      verified,
    )
  ) {
    return null;
  }

  const hasSemanticRequirement = Boolean(
    interpretation.residualTerms.length || interpretation.facets.causes.length,
  );
  if (hasSemanticRequirement && semanticRelevance < 0.16) return null;

  const score = smartDiscoveryScore({
    semanticRelevance,
    evidenceQuality,
    personalMoralFit: smartPersonalPriorityScore(causeIds, personalPriorities),
    deadlineUrgency: getSmartDeadlineUrgency(deadline, now),
    credit: normalizeCreditSignal(offer.trust_level),
  });

  return {
    amountCents,
    causeIds,
    deadline,
    evidenceQuality,
    offer,
    score,
    semanticRelevance,
    verified,
  };
}

function sortRankedOffers(items: RankedOffer[], sort: OfferSort) {
  return items.sort((left, right) => {
    if (sort === "newest") {
      return (
        Date.parse(right.offer.created_at) - Date.parse(left.offer.created_at) ||
        left.offer.id.localeCompare(right.offer.id)
      );
    }
    if (sort === "lowest_cost") {
      const leftAmount = left.amountCents.length
        ? Math.max(...left.amountCents)
        : Number.POSITIVE_INFINITY;
      const rightAmount = right.amountCents.length
        ? Math.max(...right.amountCents)
        : Number.POSITIVE_INFINITY;
      return (
        leftAmount - rightAmount ||
        right.score - left.score ||
        left.offer.id.localeCompare(right.offer.id)
      );
    }
    if (sort === "most_verified") {
      return (
        right.evidenceQuality - left.evidenceQuality ||
        right.score - left.score ||
        left.offer.id.localeCompare(right.offer.id)
      );
    }
    if (sort === "soonest_deadline") {
      const leftDeadline = left.deadline
        ? Date.parse(left.deadline)
        : Number.POSITIVE_INFINITY;
      const rightDeadline = right.deadline
        ? Date.parse(right.deadline)
        : Number.POSITIVE_INFINITY;
      return (
        leftDeadline - rightDeadline ||
        right.score - left.score ||
        left.offer.id.localeCompare(right.offer.id)
      );
    }
    if (sort === "highest_credit") {
      return (
        normalizeCreditSignal(right.offer.trust_level) -
          normalizeCreditSignal(left.offer.trust_level) ||
        right.score - left.score ||
        left.offer.id.localeCompare(right.offer.id)
      );
    }
    return (
      right.score - left.score ||
      Date.parse(right.offer.created_at) - Date.parse(left.offer.created_at) ||
      left.offer.id.localeCompare(right.offer.id)
    );
  });
}

export function buildLiveHref({
  facets,
  mode,
  page,
  search,
  sort,
}: {
  facets?: SmartQueryFacets;
  mode?: ModeFilter;
  page?: number;
  search?: string;
  sort?: OfferSort;
}) {
  const params = new URLSearchParams({ view: "live" });
  if (search) {
    params.set("search", search);
    params.set("smart", "1");
  }
  if (facets) serializeSmartQueryFacets(params, facets);
  if (mode && mode !== "all") params.set("mode", mode);
  if (
    sort &&
    sort !==
      (search || (facets && hasSmartQueryConstraints(facets)) ? "best_match" : "newest")
  ) {
    params.set("sort", sort);
  }
  if (page && page > 1) params.set("page", String(page));
  return `/offers?${params.toString()}`;
}

export async function loadPersonalCausePriorities(viewerId: string | null) {
  if (!viewerId || !hasSupabaseEnv()) return [] as string[];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("route_recommendation_profiles")
    .select("cause_priorities")
    .eq("profile_id", viewerId)
    .maybeSingle();

  if (error) {
    console.error("[offers] Failed to load private route priorities for local ranking", {
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return data?.cause_priorities ?? [];
}

async function loadOfferCandidates(mode: ModeFilter, smartSearch: boolean) {
  const supabase = await createClient();

  if (smartSearch) {
    let query = supabase.from("offers").select("*").eq("status", "open");
    if (mode !== "all") query = query.eq("mode", mode);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(SMART_OFFER_CANDIDATE_LIMIT);

    return {
      data: (data ?? []) as OfferRow[],
      error,
      candidateLimitReached: (data ?? []).length === SMART_OFFER_CANDIDATE_LIMIT,
    };
  }

  const items: OfferRow[] = [];
  let offset = 0;
  let expectedTotal: number | null = null;

  while (expectedTotal === null || offset < expectedTotal) {
    let query = supabase
      .from("offers")
      .select("*", { count: "exact" })
      .eq("status", "open");
    if (mode !== "all") query = query.eq("mode", mode);
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + LIVE_OFFERS_CHUNK_SIZE - 1);

    if (error) {
      return { data: [] as OfferRow[], error, candidateLimitReached: false };
    }

    const rows = (data ?? []) as OfferRow[];
    items.push(...rows);
    expectedTotal = count ?? items.length;
    offset += rows.length;
    if (rows.length < LIVE_OFFERS_CHUNK_SIZE) break;
  }

  return { data: items, error: null, candidateLimitReached: false };
}

export async function listLiveOffers({
  facets,
  interpretation,
  mode,
  personalPriorities,
  smartSearch,
  sort,
}: {
  facets: SmartQueryFacets;
  interpretation: SmartQueryInterpretation;
  mode: ModeFilter;
  personalPriorities: readonly string[];
  smartSearch: boolean;
  sort: OfferSort;
}): Promise<LiveOffersResult> {
  if (!hasSupabaseEnv()) {
    return { items: [], total: 0, error: null, candidateLimitReached: false };
  }

  const candidates = await loadOfferCandidates(mode, smartSearch);
  if (candidates.error) {
    console.error("[offers] Failed to load participant offer menus", {
      code: candidates.error.code,
      details: candidates.error.details,
      hint: candidates.error.hint,
      message: candidates.error.message,
      mode,
      smartSearch,
    });
    return {
      items: [],
      total: 0,
      error: "The live marketplace could not be loaded. Please refresh or try again shortly.",
      candidateLimitReached: false,
    };
  }

  if (!smartSearch) {
    const items = [...candidates.data].sort(
      (left, right) =>
        Date.parse(right.created_at) - Date.parse(left.created_at) ||
        left.id.localeCompare(right.id),
    );
    return {
      items,
      total: items.length,
      error: null,
      candidateLimitReached: false,
    };
  }

  const ranked = candidates.data
    .map((offer) =>
      rankOffer(
        offer,
        { ...interpretation, facets },
        personalPriorities,
        new Date(),
      ),
    )
    .filter((entry): entry is RankedOffer => Boolean(entry));
  const sorted = sortRankedOffers(ranked, sort).map((entry) => entry.offer);

  return {
    items: sorted,
    total: sorted.length,
    error: null,
    candidateLimitReached: candidates.candidateLimitReached,
  };
}

export function formatMoneyConstraint(facets: SmartQueryFacets) {
  if (facets.maxAmountCents !== null) {
    const operator = facets.maxAmountInclusive ? "At most" : "Under";
    return `${operator} $${(facets.maxAmountCents / 100).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`;
  }
  if (facets.minAmountCents !== null) {
    const operator = facets.minAmountInclusive ? "At least" : "Over";
    return `${operator} $${(facets.minAmountCents / 100).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`;
  }
  return null;
}

export async function listSavedOfferIds(userId: string | undefined) {
  if (!userId || !hasSupabaseEnv()) return [] as string[];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offer_carts")
    .select("offer_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(2_000);

  if (error) {
    console.error("[offers] Failed to load saved offers", {
      code: error.code,
      message: error.message,
      userId,
    });
    return [] as string[];
  }

  return (data ?? []).map((row) => row.offer_id);
}
