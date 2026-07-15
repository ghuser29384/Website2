import type { CredibilitySummary } from "@/lib/credibility";

export const CREDIT_FILTER_OPTIONS = [
  { value: "any", label: "Any credit record" },
  { value: "proven", label: "Proven score only" },
  { value: "60", label: "Credit score 60+" },
  { value: "70", label: "Credit score 70+" },
  { value: "80", label: "Credit score 80+" },
  { value: "90", label: "Credit score 90+" },
  { value: "unproven", label: "Unproven only" },
] as const;

export const OFFER_DISCOVERY_SORT_OPTIONS = [
  { value: "match", label: "Best match" },
  { value: "credit", label: "Highest credit" },
  { value: "recent", label: "Newest" },
] as const;

export const OFFER_PAYMENT_FILTER_OPTIONS = [
  { value: "any", label: "Any payment status" },
  { value: "money", label: "Payment or donation involved" },
  { value: "none", label: "No money involved" },
] as const;

export const OFFER_ACTION_FILTER_OPTIONS = [
  { value: "all", label: "Any action type" },
  { value: "pledge", label: "Pledge swap" },
  { value: "offset", label: "Donation offset" },
  { value: "payment", label: "Paid action" },
] as const;

export const PEOPLE_DISCOVERY_SORT_OPTIONS = [
  { value: "match", label: "Best match" },
  { value: "credit", label: "Highest credit" },
  { value: "offers", label: "Most open offers" },
  { value: "newest", label: "Newest" },
] as const;

export const PEOPLE_PAYMENT_FILTER_OPTIONS = [
  { value: "any", label: "Any payment preference" },
  { value: "open", label: "Open to payment" },
  { value: "not_open", label: "Not marked open to payment" },
] as const;

export const PEOPLE_PARTICIPATION_FILTER_OPTIONS = [
  { value: "any", label: "Any participation" },
  { value: "pledges", label: "Open to pledges" },
  { value: "offers", label: "Has open offers" },
  { value: "reviewed", label: "Has reviewed evidence" },
] as const;

export const PEOPLE_KIND_FILTER_OPTIONS = [
  { value: "any", label: "Any participant type" },
  { value: "individual", label: "Individual" },
  { value: "collective", label: "Collective" },
  { value: "institution", label: "Institution" },
] as const;

export type CreditFilter = (typeof CREDIT_FILTER_OPTIONS)[number]["value"];
export type OfferDiscoverySort = (typeof OFFER_DISCOVERY_SORT_OPTIONS)[number]["value"];
export type OfferPaymentFilter = (typeof OFFER_PAYMENT_FILTER_OPTIONS)[number]["value"];
export type OfferActionFilter = (typeof OFFER_ACTION_FILTER_OPTIONS)[number]["value"];
export type PeopleDiscoverySort = (typeof PEOPLE_DISCOVERY_SORT_OPTIONS)[number]["value"];
export type PeoplePaymentFilter = (typeof PEOPLE_PAYMENT_FILTER_OPTIONS)[number]["value"];
export type PeopleParticipationFilter =
  (typeof PEOPLE_PARTICIPATION_FILTER_OPTIONS)[number]["value"];
export type PeopleKindFilter = (typeof PEOPLE_KIND_FILTER_OPTIONS)[number]["value"];

export interface OfferDiscoveryLike {
  id: string;
  mode: string;
  offered_cause: string;
  requested_cause: string;
  compromise_cause?: string | null;
  offer_action: string;
  request_action: string;
  notes?: string | null;
  verification?: string | null;
  duration?: string | null;
  owner_alias?: string | null;
  payment_interval_value?: number | null;
  created_at: string;
  donationOffset?: {
    baseline_opposed_cause?: string | null;
    requested_opposed_cause?: string | null;
    baseline_amount_cents?: number | null;
    requested_matching_amount_cents?: number | null;
    compromiseCharity?: { name?: string | null } | null;
  } | null;
}

export interface ProfileDiscoveryLike {
  id: string;
  resolvedName: string;
  display_name?: string | null;
  bio?: string | null;
  publicLocation?: string | null;
  wishPreview?: string | null;
  wishCollectiveName?: string | null;
  wishCauses: string[];
  wishOpenToPayment: boolean;
  wishOpenToPledges: boolean;
  wishParticipantKind: "individual" | "collective" | "institution" | null;
  offerCount: number;
  ratingCount: number;
  verificationBadges: unknown[];
  created_at: string;
}

export interface OfferDiscoveryFilters {
  action: OfferActionFilter;
  cause: string;
  credit: CreditFilter;
  payment: OfferPaymentFilter;
  search: string;
}

export interface PeopleDiscoveryFilters {
  cause: string;
  credit: CreditFilter;
  kind: PeopleKindFilter;
  participation: PeopleParticipationFilter;
  payment: PeoplePaymentFilter;
  search: string;
}

const DAY_MS = 86_400_000;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function tokenize(value: string) {
  return normalize(value).split(/\s+/).filter(Boolean);
}

function dateSignal(value: string, now: Date, halfLifeDays = 120) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  const elapsedDays = Math.max(0, (now.getTime() - timestamp) / DAY_MS);
  return Math.pow(0.5, elapsedDays / halfLifeDays);
}

function confidenceWeight(summary: CredibilitySummary) {
  if (summary.confidence === "high") {
    return 1;
  }
  if (summary.confidence === "medium") {
    return 0.75;
  }
  if (summary.confidence === "low") {
    return 0.45;
  }
  return 0.2;
}

/**
 * Converts the public conservative score into a ranking signal. The score is deliberately
 * shrunk toward neutral when evidence is sparse, and its contribution is capped by the
 * weighted ranking formulas below. This prevents a small early record from dominating
 * relevance while still rewarding demonstrated fulfilment.
 */
export function creditRankingSignal(summary?: CredibilitySummary) {
  if (!summary) {
    return 0.45;
  }
  if (summary.eligibility === "restricted") {
    return 0;
  }
  if (summary.eligibility === "review_required") {
    return 0.15;
  }
  if (summary.score === null) {
    return 0.45;
  }

  const evidenceWeight = clamp(
    Math.log1p(Math.max(0, summary.effectiveObservations)) / Math.log1p(30),
  );
  const shrinkage = 0.3 + 0.7 * confidenceWeight(summary) * evidenceWeight;
  return clamp(0.5 + (summary.score / 100 - 0.5) * shrinkage);
}

export function matchesCreditFilter(
  summary: CredibilitySummary | undefined,
  filter: CreditFilter,
) {
  if (filter === "any") {
    return true;
  }

  const isUnproven = !summary || summary.level === "Unproven";
  if (filter === "unproven") {
    return isUnproven;
  }

  if (
    !summary ||
    summary.eligibility !== "eligible" ||
    summary.score === null
  ) {
    return false;
  }

  if (filter === "proven") {
    return true;
  }

  return summary.score >= Number.parseInt(filter, 10);
}

function weightedTextRelevance(
  query: string,
  fields: Array<{ value: string | null | undefined; weight: number }>,
) {
  const normalizedQuery = normalize(query);
  const tokens = tokenize(query);
  if (!tokens.length) {
    return 0.5;
  }

  const normalizedFields = fields
    .map((field) => ({ value: normalize(field.value), weight: field.weight }))
    .filter((field) => field.value);
  let tokenTotal = 0;

  for (const token of tokens) {
    let best = 0;
    for (const field of normalizedFields) {
      if (field.value.includes(token)) {
        best = Math.max(best, field.weight);
      }
    }
    tokenTotal += best;
  }

  const tokenScore = tokenTotal / tokens.length;
  const phraseBonus = normalizedFields.some((field) => field.value.includes(normalizedQuery))
    ? 0.12
    : 0;
  return clamp(tokenScore + phraseBonus);
}

export function offerTextRelevance(offer: OfferDiscoveryLike, query: string) {
  return weightedTextRelevance(query, [
    { value: offer.offered_cause, weight: 1 },
    { value: offer.requested_cause, weight: 1 },
    { value: offer.compromise_cause, weight: 0.9 },
    { value: offer.offer_action, weight: 0.86 },
    { value: offer.request_action, weight: 0.86 },
    { value: offer.owner_alias, weight: 0.7 },
    { value: offer.donationOffset?.baseline_opposed_cause, weight: 0.82 },
    { value: offer.donationOffset?.requested_opposed_cause, weight: 0.82 },
    { value: offer.donationOffset?.compromiseCharity?.name, weight: 0.78 },
    { value: offer.verification, weight: 0.48 },
    { value: offer.duration, weight: 0.35 },
    { value: offer.notes, weight: 0.3 },
  ]);
}

export function offerMatchesText(offer: OfferDiscoveryLike, query: string) {
  const tokens = tokenize(query);
  if (!tokens.length) {
    return true;
  }

  const haystack = [
    offer.offered_cause,
    offer.requested_cause,
    offer.compromise_cause,
    offer.offer_action,
    offer.request_action,
    offer.owner_alias,
    offer.verification,
    offer.duration,
    offer.notes,
    offer.donationOffset?.baseline_opposed_cause,
    offer.donationOffset?.requested_opposed_cause,
    offer.donationOffset?.compromiseCharity?.name,
  ]
    .map(normalize)
    .join(" ");

  return tokens.every((token) => haystack.includes(token));
}

export function offerHasMoney(offer: OfferDiscoveryLike) {
  return (
    offer.mode === "payment" ||
    offer.mode === "offset" ||
    (offer.payment_interval_value ?? 0) > 0 ||
    (offer.donationOffset?.baseline_amount_cents ?? 0) > 0 ||
    (offer.donationOffset?.requested_matching_amount_cents ?? 0) > 0
  );
}

function offerMatchesCause(offer: OfferDiscoveryLike, cause: string) {
  if (!cause) {
    return true;
  }

  const target = normalize(cause);
  return [
    offer.offered_cause,
    offer.requested_cause,
    offer.compromise_cause,
    offer.donationOffset?.baseline_opposed_cause,
    offer.donationOffset?.requested_opposed_cause,
    offer.donationOffset?.compromiseCharity?.name,
  ].some((value) => normalize(value) === target);
}

export function offerMatchesFilters(
  offer: OfferDiscoveryLike,
  credibility: CredibilitySummary | undefined,
  filters: OfferDiscoveryFilters,
) {
  if (!offerMatchesText(offer, filters.search)) {
    return false;
  }
  if (!offerMatchesCause(offer, filters.cause)) {
    return false;
  }
  if (filters.action !== "all" && offer.mode !== filters.action) {
    return false;
  }
  if (filters.payment === "money" && !offerHasMoney(offer)) {
    return false;
  }
  if (filters.payment === "none" && offerHasMoney(offer)) {
    return false;
  }
  return matchesCreditFilter(credibility, filters.credit);
}

export function collectOfferCauseOptions(offers: OfferDiscoveryLike[]) {
  const values = new Map<string, string>();

  offers.forEach((offer) => {
    [
      offer.offered_cause,
      offer.requested_cause,
      offer.compromise_cause,
      offer.donationOffset?.baseline_opposed_cause,
      offer.donationOffset?.requested_opposed_cause,
      offer.donationOffset?.compromiseCharity?.name,
    ].forEach((value) => {
      const trimmed = value?.trim();
      if (trimmed) {
        values.set(normalize(trimmed), trimmed);
      }
    });
  });

  return [...values.values()].sort((left, right) => left.localeCompare(right));
}

function offerQualitySignal(offer: OfferDiscoveryLike) {
  const checks = [
    offer.offer_action,
    offer.request_action,
    offer.verification,
    offer.duration,
  ];
  return checks.filter((value) => normalize(value).length >= 8).length / checks.length;
}

export function rankOffers<T extends OfferDiscoveryLike>(
  offers: T[],
  credibilityByOffer: Map<string, CredibilitySummary>,
  query: string,
  sort: OfferDiscoverySort,
  now = new Date(),
) {
  const hasQuery = tokenize(query).length > 0;

  return offers
    .map((offer, index) => {
      const relevance = offerTextRelevance(offer, query);
      const credit = creditRankingSignal(credibilityByOffer.get(offer.id));
      const recency = dateSignal(offer.created_at, now);
      const quality = offerQualitySignal(offer);
      let rankingScore: number;

      if (sort === "credit") {
        rankingScore = 0.72 * credit + 0.14 * relevance + 0.08 * quality + 0.06 * recency;
      } else if (sort === "recent") {
        rankingScore = 0.78 * recency + 0.1 * relevance + 0.08 * credit + 0.04 * quality;
      } else if (hasQuery) {
        rankingScore = 0.7 * relevance + 0.15 * credit + 0.1 * recency + 0.05 * quality;
      } else {
        rankingScore = 0.55 * recency + 0.2 * credit + 0.25 * quality;
      }

      return { offer, index, rankingScore };
    })
    .sort((left, right) => {
      const difference = right.rankingScore - left.rankingScore;
      if (Math.abs(difference) > 1e-9) {
        return difference;
      }

      const recencyDifference =
        Date.parse(right.offer.created_at) - Date.parse(left.offer.created_at);
      if (Number.isFinite(recencyDifference) && recencyDifference !== 0) {
        return recencyDifference;
      }

      return left.offer.id.localeCompare(right.offer.id) || left.index - right.index;
    })
    .map((entry) => entry.offer);
}

export function profileTextRelevance(profile: ProfileDiscoveryLike, query: string) {
  return weightedTextRelevance(query, [
    { value: profile.resolvedName, weight: 1 },
    { value: profile.display_name, weight: 1 },
    { value: profile.wishCollectiveName, weight: 0.9 },
    { value: profile.wishCauses.join(" "), weight: 0.86 },
    { value: profile.bio, weight: 0.76 },
    { value: profile.wishPreview, weight: 0.72 },
    { value: profile.publicLocation, weight: 0.68 },
  ]);
}

export function profileMatchesText(profile: ProfileDiscoveryLike, query: string) {
  const tokens = tokenize(query);
  if (!tokens.length) {
    return true;
  }

  const haystack = [
    profile.resolvedName,
    profile.display_name,
    profile.bio,
    profile.publicLocation,
    profile.wishPreview,
    profile.wishCollectiveName,
    ...profile.wishCauses,
  ]
    .map(normalize)
    .join(" ");

  return tokens.every((token) => haystack.includes(token));
}

function profileMatchesCause(profile: ProfileDiscoveryLike, cause: string) {
  if (!cause) {
    return true;
  }

  const target = normalize(cause);
  return (
    profile.wishCauses.some((value) => normalize(value) === target) ||
    normalize(profile.wishPreview).includes(target) ||
    normalize(profile.bio).includes(target)
  );
}

export function profileMatchesFilters(
  profile: ProfileDiscoveryLike,
  credibility: CredibilitySummary | undefined,
  filters: PeopleDiscoveryFilters,
) {
  if (!profileMatchesText(profile, filters.search)) {
    return false;
  }
  if (!profileMatchesCause(profile, filters.cause)) {
    return false;
  }
  if (filters.payment === "open" && !profile.wishOpenToPayment) {
    return false;
  }
  if (filters.payment === "not_open" && profile.wishOpenToPayment) {
    return false;
  }
  if (filters.kind !== "any" && profile.wishParticipantKind !== filters.kind) {
    return false;
  }
  if (filters.participation === "pledges" && !profile.wishOpenToPledges) {
    return false;
  }
  if (filters.participation === "offers" && profile.offerCount === 0) {
    return false;
  }
  if (
    filters.participation === "reviewed" &&
    profile.ratingCount === 0 &&
    profile.verificationBadges.length === 0 &&
    (credibility?.eventCount ?? 0) === 0
  ) {
    return false;
  }
  return matchesCreditFilter(credibility, filters.credit);
}

export function collectPeopleCauseOptions(profiles: ProfileDiscoveryLike[]) {
  const values = new Map<string, string>();

  profiles.forEach((profile) => {
    profile.wishCauses.forEach((cause) => {
      const trimmed = cause.trim();
      if (trimmed) {
        values.set(normalize(trimmed), trimmed);
      }
    });
  });

  return [...values.values()].sort((left, right) => left.localeCompare(right));
}

function profileActivitySignal(profile: ProfileDiscoveryLike) {
  const weightedActivity =
    profile.offerCount * 2 +
    profile.ratingCount +
    profile.verificationBadges.length * 2;
  return clamp(Math.log1p(weightedActivity) / Math.log1p(24));
}

export function rankProfiles<T extends ProfileDiscoveryLike>(
  profiles: T[],
  credibilityByProfile: Map<string, CredibilitySummary>,
  query: string,
  sort: PeopleDiscoverySort,
  now = new Date(),
) {
  const hasQuery = tokenize(query).length > 0;
  const maxOffers = Math.max(1, ...profiles.map((profile) => profile.offerCount));

  return profiles
    .map((profile, index) => {
      const relevance = profileTextRelevance(profile, query);
      const credit = creditRankingSignal(credibilityByProfile.get(profile.id));
      const recency = dateSignal(profile.created_at, now, 180);
      const activity = profileActivitySignal(profile);
      const offers = clamp(Math.log1p(profile.offerCount) / Math.log1p(maxOffers));
      let rankingScore: number;

      if (sort === "credit") {
        rankingScore = 0.74 * credit + 0.12 * activity + 0.08 * relevance + 0.06 * recency;
      } else if (sort === "offers") {
        rankingScore = 0.68 * offers + 0.12 * credit + 0.1 * relevance + 0.1 * recency;
      } else if (sort === "newest") {
        rankingScore = 0.78 * recency + 0.1 * credit + 0.07 * relevance + 0.05 * activity;
      } else if (hasQuery) {
        rankingScore = 0.68 * relevance + 0.15 * credit + 0.1 * activity + 0.07 * recency;
      } else {
        rankingScore = 0.42 * activity + 0.2 * credit + 0.3 * recency + 0.08 * relevance;
      }

      return { profile, index, rankingScore };
    })
    .sort((left, right) => {
      const difference = right.rankingScore - left.rankingScore;
      if (Math.abs(difference) > 1e-9) {
        return difference;
      }

      const recencyDifference =
        Date.parse(right.profile.created_at) - Date.parse(left.profile.created_at);
      if (Number.isFinite(recencyDifference) && recencyDifference !== 0) {
        return recencyDifference;
      }

      return left.profile.id.localeCompare(right.profile.id) || left.index - right.index;
    })
    .map((entry) => entry.profile);
}
