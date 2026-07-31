import {
  buildDiscoverSearchPlan as buildBaseDiscoverSearchPlan,
  filterAndRankDiscoverOffers as filterBaseDiscoverOffers,
  type DiscoverOfferSearchItem,
  type DiscoverSearchInput,
  type DiscoverSearchPlan,
} from "@/lib/discover-search";
import type { PublicOfferListing } from "@/lib/public-offers";
import {
  getSmartQueryCauseLabel,
  smartQueryTokens,
} from "@/lib/smart-query";

const CAPABILITY_FILLER_TERMS = new Set([
  "able",
  "can",
  "capable",
  "could",
]);
const NON_MONETARY_RETURN_SENTINEL = " · $0 non-monetary return";

function normalizedQuery(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9$%+.'/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeOverlappingCauses(plan: DiscoverSearchPlan) {
  const query = normalizedQuery(plan.normalizedQuery);
  const hasWildAnimalSuffering = plan.facets.causes.includes(
    "wild-animal-suffering",
  );
  const hasFactoryFarming = plan.facets.causes.includes("factory-farming");
  const explicitlyMentionsFarmedAnimals =
    /\b(factory farming|farm(?:ed)? animal welfare|meat reduction|vegetarian|vegan)\b/.test(
      query,
    );

  if (
    hasWildAnimalSuffering &&
    hasFactoryFarming &&
    !explicitlyMentionsFarmedAnimals
  ) {
    plan.facets.causes = plan.facets.causes.filter(
      (cause) => cause !== "factory-farming",
    );
    plan.constraints = plan.constraints.filter(
      (constraint) => constraint.key !== "cause:factory-farming",
    );
  }
}

function removeRedundantResidualTerms(plan: DiscoverSearchPlan) {
  const causeTerms = new Set(
    plan.facets.causes.flatMap((cause) =>
      smartQueryTokens(getSmartQueryCauseLabel(cause)),
    ),
  );
  plan.exchange.residualTerms = plan.exchange.residualTerms.filter(
    (term) =>
      !CAPABILITY_FILLER_TERMS.has(term) &&
      !causeTerms.has(term),
  );
}

function normalizeCauseField(value: string | null) {
  return value?.replace(/[-_/]+/g, " ").replace(/\s+/g, " ").trim() ?? null;
}

function stripCatalogPrefix(value: string) {
  return value.replace(/^\s*[A-Z]\d+\s*[—:-]\s*/u, "").trim();
}

function hasReturnAmountConstraint(plan: DiscoverSearchPlan) {
  return (
    plan.exchange.returnMinimumCents !== null ||
    plan.exchange.returnMaximumCents !== null ||
    plan.manual.minimumReturnAmountCents !== null
  );
}

export function buildDiscoverSearchPlan(
  input: DiscoverSearchInput,
): DiscoverSearchPlan {
  const plan = buildBaseDiscoverSearchPlan(input);
  canonicalizeOverlappingCauses(plan);
  removeRedundantResidualTerms(plan);
  return plan;
}

export function filterAndRankDiscoverOffers(
  listings: readonly PublicOfferListing[],
  plan: DiscoverSearchPlan,
): DiscoverOfferSearchItem[] {
  const originalById = new Map(listings.map((listing) => [listing.id, listing]));
  const shouldRepresentNonMonetaryReturnsAsZero = !hasReturnAmountConstraint(plan);
  const searchableListings = listings.map((listing) => {
    const offeredAction = stripCatalogPrefix(listing.offeredAction);
    const needsSentinel =
      shouldRepresentNonMonetaryReturnsAsZero &&
      !/\$\s*\d/.test(offeredAction);
    return {
      ...listing,
      primaryCause: normalizeCauseField(listing.primaryCause) ?? listing.primaryCause,
      secondaryCause: normalizeCauseField(listing.secondaryCause),
      offeredAction: needsSentinel
        ? `${listing.offeredAction}${NON_MONETARY_RETURN_SENTINEL}`
        : listing.offeredAction,
    };
  });

  return filterBaseDiscoverOffers(searchableListings, plan).map((result) => {
    const original = originalById.get(result.id);
    if (!original || /\$\s*\d/.test(stripCatalogPrefix(original.offeredAction))) {
      return result;
    }
    return {
      ...result,
      youGet: [stripCatalogPrefix(original.offeredAction), ...result.youGet.slice(1)],
    };
  });
}
