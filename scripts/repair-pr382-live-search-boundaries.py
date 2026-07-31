from pathlib import Path


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    file = Path(path)
    source = file.read_text()
    count = source.count(old)
    if count != expected:
        raise RuntimeError(f"{path}: expected {expected} occurrence(s), found {count}")
    file.write_text(source.replace(old, new))


def replace_between(path: str, start: str, end: str, replacement: str) -> None:
    file = Path(path)
    source = file.read_text()
    start_index = source.find(start)
    if start_index < 0:
        raise RuntimeError(f"{path}: start marker not found")
    end_index = source.find(end, start_index)
    if end_index < 0:
        raise RuntimeError(f"{path}: end marker not found")
    file.write_text(source[:start_index] + replacement + source[end_index:])


# Keep Co-Funds as an Offer subtype, and keep standalone assurance contracts under Pools.
path = "src/lib/discover-search.ts"
replace_exact(
    path,
    'export type DiscoverSearchDomain = "offers" | "pools" | "people";\n',
    'export type DiscoverSearchDomain = "offers" | "pools" | "people";\n'
    'export type DiscoverSearchOfferKind = "all" | "individual" | "co-fund";\n',
)
replace_exact(
    path,
    '  domain?: DiscoverSearchDomain;\n  sort?: DiscoverSearchSort;\n',
    '  domain?: DiscoverSearchDomain;\n  offerKind?: DiscoverSearchOfferKind;\n  sort?: DiscoverSearchSort;\n',
)
replace_exact(
    path,
    '  domain: DiscoverSearchDomain;\n  sort: DiscoverSearchSort;\n',
    '  domain: DiscoverSearchDomain;\n  offerKind: DiscoverSearchOfferKind;\n  sort: DiscoverSearchSort;\n',
)
replace_exact(
    path,
    '''export interface DiscoverOfferSearchItem {
  kind: "offer";
  id: string;
  title: string;
  cause: string;
  status: string;
  youOffer: string[];
  youGet: string[];
  offerFlexibility: "Fixed";
  returnFlexibility: "Fixed";
  providerName: string;
  providerRole: string;
  evidenceLabel: string;
  completionLabel: string;
  href: string;
  exactMatchLabel: "Request exact match";
  counteroffersAllowed: true;
  createdAt: string;
  score: number;
}
''',
    '''export interface DiscoverOfferSearchItem {
  kind: "offer";
  offerKind: Exclude<DiscoverSearchOfferKind, "all">;
  id: string;
  title: string;
  cause: string;
  status: string;
  youOffer: string[];
  youGet: string[];
  offerFlexibility: string;
  returnFlexibility: string;
  providerName: string;
  providerRole: string;
  evidenceLabel: string;
  completionLabel: string;
  href: string;
  exactMatchLabel: string;
  counteroffersAllowed: boolean;
  createdAt: string;
  score: number;
}
''',
)
replace_exact(
    path,
    '''function residualTerms(query: string, interpretation: SmartQueryInterpretation) {
  const recognized = new Set(
    interpretation.recognizedPhrases.flatMap((phrase) => smartQueryTokens(phrase)),
  );
  return unique(
    smartQueryTokens(query).filter((token) => !recognized.has(token) && !DOMAIN_WORDS.has(token) && !INTENT_WORDS.has(token)),
  );
}
''',
    '''function isCoFundQuery(value: string) {
  const normalized = normalize(value);
  return /\\bco[- ]?funds?\\b|\\bgroup[- ]buy(?:ing)?\\b|\\bcollective(?:ly)? fund(?:ing)? (?:an? )?(?:offer|trade)\\b/.test(
    normalized,
  );
}

function isStandalonePoolQuery(value: string) {
  const normalized = normalize(value);
  return /\\b(?:pools?|threshold pools?|standalone threshold|dominant[- ]assurance contracts?|assurance contracts?|near[- ]activation|near[- ]threshold)\\b/.test(
    normalized,
  );
}

function residualTerms(query: string, interpretation: SmartQueryInterpretation) {
  const recognized = new Set(
    interpretation.recognizedPhrases.flatMap((phrase) => smartQueryTokens(phrase)),
  );
  const mechanismTerms = new Set<string>();
  if (isCoFundQuery(query)) {
    ["co", "fund", "funds", "group", "buy", "buying", "collective", "collectively", "moral", "trade", "offer"].forEach(
      (term) => mechanismTerms.add(term),
    );
  } else if (isStandalonePoolQuery(query)) {
    ["pool", "pools", "threshold", "standalone", "dominant", "assurance", "contract", "contracts", "near", "activation"].forEach(
      (term) => mechanismTerms.add(term),
    );
  }
  return unique(
    smartQueryTokens(query).filter(
      (token) =>
        !recognized.has(token) &&
        !DOMAIN_WORDS.has(token) &&
        !INTENT_WORDS.has(token) &&
        !mechanismTerms.has(token),
    ),
  );
}
''',
)
replace_exact(
    path,
    '''function safeDomain(value: unknown): DiscoverSearchDomain | null {
  return value === "offers" || value === "pools" || value === "people" ? value : null;
}

function inferDomain(
  query: string,
  requested: DiscoverSearchDomain | undefined,
  interpretation: SmartQueryInterpretation,
  excluded: ReadonlySet<string>,
) {
  if (excluded.has("domain")) return requested ?? "offers";
  if (interpretation.intent === "people") return "people";
  if (interpretation.intent === "pools" || interpretation.intent === "mpgf_pools") return "pools";
  const normalized = normalize(query);
  if (/\\b(people|person|members?|who|counterpart(?:y|ies))\\b/.test(normalized)) return "people";
  if (/\\b(pools?|threshold|near[- ]threshold|conditional funding|group[- ]buy)\\b/.test(normalized)) {
    return "pools";
  }
  return requested ?? "offers";
}
''',
    '''function safeDomain(value: unknown): DiscoverSearchDomain | null {
  return value === "offers" || value === "pools" || value === "people" ? value : null;
}

function safeOfferKind(value: unknown): DiscoverSearchOfferKind | null {
  return value === "all" || value === "individual" || value === "co-fund"
    ? value
    : null;
}

function inferDomain(
  query: string,
  requested: DiscoverSearchDomain | undefined,
  interpretation: SmartQueryInterpretation,
  excluded: ReadonlySet<string>,
) {
  if (excluded.has("domain")) return requested ?? "offers";
  if (interpretation.intent === "people") return "people";
  if (interpretation.intent === "pools" || interpretation.intent === "mpgf_pools") return "pools";
  if (interpretation.intent === "offers") return "offers";
  const normalized = normalize(query);
  if (/\\b(people|person|members?|who|counterpart(?:y|ies))\\b/.test(normalized)) return "people";
  if (isCoFundQuery(normalized)) return "offers";
  if (isStandalonePoolQuery(normalized)) return "pools";
  return requested ?? "offers";
}

function inferOfferKind(
  query: string,
  domain: DiscoverSearchDomain,
  requested: DiscoverSearchOfferKind | undefined,
  excluded: ReadonlySet<string>,
): DiscoverSearchOfferKind {
  if (domain !== "offers" || excluded.has("offer-kind")) return "all";
  if (isCoFundQuery(query)) return "co-fund";
  if (/\\b(?:individual|one[- ]to[- ]one) offers?\\b/.test(normalize(query))) {
    return "individual";
  }
  return requested ?? "all";
}
''',
)
replace_exact(
    path,
    '''function queryConstraints(
  domain: DiscoverSearchDomain,
  facets: SmartQueryFacets,
  exchange: DiscoverExchangeIntent,
  excluded: ReadonlySet<string>,
): DiscoverSearchConstraint[] {
''',
    '''function queryConstraints(
  domain: DiscoverSearchDomain,
  offerKind: DiscoverSearchOfferKind,
  facets: SmartQueryFacets,
  exchange: DiscoverExchangeIntent,
  excluded: ReadonlySet<string>,
): DiscoverSearchConstraint[] {
''',
)
replace_exact(
    path,
    '''  if (!excluded.has("domain")) {
    result.push({ key: "domain", label: `Domain: ${domain[0].toUpperCase()}${domain.slice(1)}`, source: "query" });
  }
  for (const cause of facets.causes) {
''',
    '''  if (!excluded.has("domain")) {
    result.push({ key: "domain", label: `Domain: ${domain[0].toUpperCase()}${domain.slice(1)}`, source: "query" });
  }
  if (domain === "offers" && offerKind !== "all" && !excluded.has("offer-kind")) {
    result.push({
      key: "offer-kind",
      label: offerKind === "co-fund" ? "Offer type: Co-Fund" : "Offer type: Individual",
      source: "query",
    });
  }
  for (const cause of facets.causes) {
''',
)
replace_exact(
    path,
    '''  const requestedDomain = safeDomain(input.domain) ?? undefined;
  const domain = inferDomain(normalizedQuery, requestedDomain, interpretation, excluded);
  const exchange = parseDiscoverExchangeIntent(normalizedQuery, interpretation);
''',
    '''  const requestedDomain = safeDomain(input.domain) ?? undefined;
  const domain = inferDomain(normalizedQuery, requestedDomain, interpretation, excluded);
  const requestedOfferKind = safeOfferKind(input.offerKind) ?? undefined;
  const offerKind = inferOfferKind(
    normalizedQuery,
    domain,
    requestedOfferKind,
    excluded,
  );
  const exchange = parseDiscoverExchangeIntent(normalizedQuery, interpretation);
''',
)
replace_exact(
    path,
    '''    normalizedQuery,
    domain,
    sort,
''',
    '''    normalizedQuery,
    domain,
    offerKind,
    sort,
''',
)
replace_exact(
    path,
    '''      ...queryConstraints(domain, facets, exchange, excluded),
''',
    '''      ...queryConstraints(domain, offerKind, facets, exchange, excluded),
''',
)
replace_exact(
    path,
    '''export function filterAndRankDiscoverOffers(
  listings: readonly PublicOfferListing[],
  plan: DiscoverSearchPlan,
): DiscoverOfferSearchItem[] {
  const queryOfferMaximum = plan.exchange.offerMaximumCents;
''',
    '''export function filterAndRankDiscoverOffers(
  listings: readonly PublicOfferListing[],
  plan: DiscoverSearchPlan,
): DiscoverOfferSearchItem[] {
  if (plan.domain !== "offers" || plan.offerKind === "co-fund") return [];
  const queryOfferMaximum = plan.exchange.offerMaximumCents;
''',
)
replace_exact(
    path,
    '''    return [{
      kind: "offer",
      id: listing.id,
''',
    '''    return [{
      kind: "offer",
      offerKind: "individual",
      id: listing.id,
''',
)
replace_exact(
    path,
    '''function poolScore(route: LiveGroupBuyingRoute, plan: DiscoverSearchPlan, text: string) {
''',
    '''export function filterAndRankDiscoverCoFunds(
  routes: readonly LiveGroupBuyingRoute[],
  plan: DiscoverSearchPlan,
): DiscoverOfferSearchItem[] {
  if (plan.domain !== "offers" || plan.offerKind === "individual") return [];
  const maximumOffer = [
    plan.exchange.offerMaximumCents,
    plan.facets.maxAmountCents,
    plan.manual.maximumOfferAmountCents,
  ]
    .filter((value): value is number => value !== null)
    .reduce<number | null>(
      (current, value) => (current === null ? value : Math.min(current, value)),
      null,
    );
  const minimumOffer = [plan.exchange.offerMinimumCents, plan.facets.minAmountCents]
    .filter((value): value is number => value !== null)
    .reduce<number | null>(
      (current, value) => (current === null ? value : Math.max(current, value)),
      null,
    );
  if (
    plan.exchange.returnMinimumCents !== null ||
    plan.exchange.returnMaximumCents !== null ||
    plan.manual.minimumReturnAmountCents !== null
  ) {
    return [];
  }

  return routes
    .flatMap((route): DiscoverOfferSearchItem[] => {
      const offerText = [
        `Contribute from ${formatMoney(route.minimumFundingCents, route.currency)}`,
        `Published target: ${formatMoney(route.targetFundingCents, route.currency)}`,
        route.failureBehavior,
      ];
      const returnText = [route.intervention, route.expectedEffect, route.statusSentence];
      const text = [
        route.title,
        route.summary,
        route.causeArea,
        route.recipientName,
        ...offerText,
        ...returnText,
        route.verificationSummary,
        route.timeline,
        route.statusLabel,
      ].join(" ");
      const actualCauses = causeIdsForText(`${route.causeArea} ${route.title} ${route.summary}`);
      if (!causeGroupMatches(plan.facets.causes, actualCauses, text)) return [];
      if (!causeGroupMatches(plan.manual.causes, actualCauses, text)) return [];
      if (!textMatchesResidualTerms(plan.exchange.residualTerms, text)) return [];
      const actualOfferTypes: DiscoverExchangeType[] = ["fund", "pool"];
      const actualReturnTypes = actionTypes(returnText.join(" "));
      if (!matchesTypeGroup(plan.exchange.offerTypes, actualOfferTypes)) return [];
      if (!matchesTypeGroup(plan.exchange.returnTypes, actualReturnTypes)) return [];
      if (!matchesTypeGroup(plan.manual.offerTypes, actualOfferTypes)) return [];
      if (!matchesTypeGroup(plan.manual.returnTypes, actualReturnTypes)) return [];
      if (
        !amountSatisfies(
          [route.minimumFundingCents],
          minimumOffer,
          maximumOffer,
          false,
        )
      ) {
        return [];
      }
      const verified = Boolean(
        route.verificationSummary &&
          !/unavailable|not verified/i.test(route.verificationSummary),
      );
      if ((plan.facets.verified === true || plan.manual.verifiedOnly) && !verified) return [];
      if (plan.facets.verified === false && verified) return [];
      const evidenceText = normalize(route.verificationSummary);
      if (plan.exchange.evidenceTerms.some((term) => !evidenceText.includes(normalize(term)))) return [];
      if (plan.manual.evidence && !evidenceText.includes(normalize(plan.manual.evidence))) return [];
      if (plan.manual.recipient && !normalize(route.recipientName).includes(normalize(plan.manual.recipient))) return [];
      const deadline = route.deadlineAt?.slice(0, 10) ?? null;
      if (plan.facets.deadlineBefore && (!deadline || deadline > plan.facets.deadlineBefore)) return [];
      if (plan.manual.deadlineBefore && (!deadline || deadline > plan.manual.deadlineBefore)) return [];
      const flexibility = [...plan.exchange.flexibilities, ...plan.manual.flexibilities];
      if (flexibility.some((value) => value !== "fixed")) return [];
      const score = poolScore(route, plan, text);
      return [{
        kind: "offer",
        offerKind: "co-fund",
        id: route.id,
        title: route.title,
        cause: route.causeArea,
        status: route.statusLabel,
        youOffer: offerText,
        youGet: returnText,
        offerFlexibility: "Threshold terms",
        returnFlexibility: "Fixed",
        providerName: route.recipientName,
        providerRole: "Co-Fund counterparty",
        evidenceLabel: route.verificationSummary,
        completionLabel: route.deadlineAt
          ? `Funding closes ${route.deadlineAt.slice(0, 10)}`
          : route.timeline,
        href: route.href,
        exactMatchLabel: "Join Co-Fund",
        counteroffersAllowed: false,
        createdAt: route.deadlineAt ?? "1970-01-01T00:00:00.000Z",
        score,
      }];
    })
    .sort((left, right) => {
      if (plan.sort === "newest") return Date.parse(right.createdAt) - Date.parse(left.createdAt);
      if (plan.sort === "lowest-cost") {
        return (
          extractDollarAmounts(left.youOffer[0])[0] -
            extractDollarAmounts(right.youOffer[0])[0] ||
          right.score - left.score
        );
      }
      if (plan.sort === "strongest-evidence") {
        return right.evidenceLabel.length - left.evidenceLabel.length || right.score - left.score;
      }
      return right.score - left.score || left.title.localeCompare(right.title);
    });
}

function poolScore(route: LiveGroupBuyingRoute, plan: DiscoverSearchPlan, text: string) {
''',
)

# Rewrite the API boundary so live group-buying records are Co-Fund Offers, never standalone Pools.
Path("src/app/api/discover/search/route.ts").write_text('''import { NextResponse } from "next/server";

import {
  listOpenOffersPreview,
  listPublicProfilesPage,
} from "@/lib/app-data";
import {
  filterAndRankDiscoverCoFunds,
  filterAndRankDiscoverPeople,
  type DiscoverOfferSearchItem,
  type DiscoverPersonSearchItem,
  type DiscoverPoolSearchItem,
  type DiscoverSearchInput,
  type DiscoverSearchItem,
  type DiscoverSearchOfferKind,
} from "@/lib/discover-search";
import {
  buildDiscoverSearchPlan,
  filterAndRankDiscoverOffers,
} from "@/lib/discover-search-plan";
import { loadLiveGroupBuyingSnapshot } from "@/lib/moral-trade/group-buying-live";
import {
  buildPublicOffersCollectionPayload,
  getPublicOffersLiveModeFromSearchParams,
  type PublicOfferListing,
} from "@/lib/public-offers";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32_000;
const MAX_RESULT_ITEMS = 50;
const MAX_PUBLIC_PROFILES = 1_000;

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRequestBody(value: unknown): DiscoverSearchInput | null {
  if (!isRecord(value) || typeof value.query !== "string") return null;
  const domain =
    value.domain === "offers" || value.domain === "pools" || value.domain === "people"
      ? value.domain
      : undefined;
  const offerKind =
    value.offerKind === "all" ||
    value.offerKind === "individual" ||
    value.offerKind === "co-fund"
      ? value.offerKind
      : undefined;
  const sort =
    value.sort === "best-fit" ||
    value.sort === "newest" ||
    value.sort === "deadline" ||
    value.sort === "lowest-cost" ||
    value.sort === "strongest-evidence"
      ? value.sort
      : undefined;
  return {
    query: value.query,
    normalizedQuery:
      typeof value.normalizedQuery === "string" ? value.normalizedQuery : undefined,
    domain,
    offerKind,
    sort,
    manual: isRecord(value.manual)
      ? (value.manual as DiscoverSearchInput["manual"])
      : undefined,
    excludedConstraints: Array.isArray(value.excludedConstraints)
      ? value.excludedConstraints.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : undefined,
  };
}

async function readJsonBody(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { error: "Search request is too large." } as const;
  }
  try {
    return { value: await request.json() } as const;
  } catch {
    return { error: "Search request must be valid JSON." } as const;
  }
}

async function listAllLiveOfferListings(): Promise<PublicOfferListing[]> {
  if (!hasSupabaseEnv()) return [];
  const baseParams = new URLSearchParams({
    tab: "live",
    pageSize: "100",
    sort: "newest",
  });
  const liveMode = getPublicOffersLiveModeFromSearchParams(baseParams);
  const liveOffers = await listOpenOffersPreview(500, liveMode);
  const first = buildPublicOffersCollectionPayload({
    liveOffers,
    searchParams: new URLSearchParams(baseParams),
  });
  const listings = [...first.items];
  const pageCount = Math.max(1, Math.ceil(first.meta.total / first.meta.pageSize));

  for (let page = 2; page <= pageCount; page += 1) {
    const params = new URLSearchParams(baseParams);
    params.set("page", String(page));
    const payload = buildPublicOffersCollectionPayload({
      liveOffers,
      searchParams: params,
    });
    listings.push(...payload.items);
  }

  return [...new Map(listings.map((listing) => [listing.id, listing])).values()].filter(
    (listing) =>
      listing.status === "live" &&
      listing.source === "live" &&
      !listing.isWorkedExample,
  );
}

export function selectDiscoverOfferItems(
  individualOffers: readonly DiscoverOfferSearchItem[],
  coFunds: readonly DiscoverOfferSearchItem[],
  offerKind: DiscoverSearchOfferKind,
) {
  const selected =
    offerKind === "co-fund"
      ? [...coFunds]
      : offerKind === "individual"
        ? [...individualOffers]
        : [...individualOffers, ...coFunds];
  return selected.sort(
    (left, right) =>
      right.score - left.score ||
      Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

function activeItems(
  domain: "offers" | "pools" | "people",
  offers: readonly DiscoverOfferSearchItem[],
  pools: readonly DiscoverPoolSearchItem[],
  people: readonly DiscoverPersonSearchItem[],
): DiscoverSearchItem[] {
  if (domain === "pools") return pools.slice(0, MAX_RESULT_ITEMS);
  if (domain === "people") return people.slice(0, MAX_RESULT_ITEMS);
  return offers.slice(0, MAX_RESULT_ITEMS);
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if ("error" in body) {
    return noStoreJson(
      { ok: false, error: { kind: "invalid_request", message: body.error } },
      400,
    );
  }
  const input = parseRequestBody(body.value);
  if (!input) {
    return noStoreJson(
      {
        ok: false,
        error: {
          kind: "invalid_request",
          message: "A query string and supported Discover state are required.",
        },
      },
      400,
    );
  }

  const plan = buildDiscoverSearchPlan(input);
  const requiresSharedInterpretation = Boolean(
    plan.interpretation.needsClarification ||
      plan.interpretation.confidence < 0.9 ||
      (plan.interpretation.residualTerms.length > 4 &&
        plan.interpretation.parsedConstraintCount < 2),
  );

  if (plan.interpretation.needsClarification && !input.normalizedQuery) {
    return noStoreJson({
      ok: true,
      checkedAt: new Date().toISOString(),
      query: plan.query,
      normalizedQuery: plan.normalizedQuery,
      domain: plan.domain,
      offerKind: plan.offerKind,
      sort: plan.sort,
      requiresSharedInterpretation: true,
      clarification: plan.interpretation.clarification,
      constraints: plan.constraints,
      counts: { offers: 0, pools: 0, people: 0 },
      total: 0,
      items: [],
      sourceStatus: {
        offers: "not_loaded",
        pools: "not_loaded",
        people: "not_loaded",
      },
    });
  }

  try {
    const [offerListings, coFundSnapshot, profilesPage] = await Promise.all([
      listAllLiveOfferListings(),
      loadLiveGroupBuyingSnapshot(),
      hasSupabaseEnv()
        ? listPublicProfilesPage("reviewed", 1, MAX_PUBLIC_PROFILES, null)
        : Promise.resolve({
            items: [],
            page: 1,
            pageSize: MAX_PUBLIC_PROFILES,
            hasNextPage: false,
            hasPreviousPage: false,
          }),
    ]);
    const individualOffers = filterAndRankDiscoverOffers(offerListings, plan);
    const coFunds =
      coFundSnapshot.sourceStatus === "live"
        ? filterAndRankDiscoverCoFunds(coFundSnapshot.routes, plan)
        : [];
    const offers = selectDiscoverOfferItems(
      individualOffers,
      coFunds,
      plan.offerKind,
    );
    // Standalone threshold moral-public-good Pools are intentionally not
    // synthesized from Co-Fund routes or demonstration records. Until a
    // production Pool directory is connected, a Pool query returns an honest
    // zero-result state with the source marked unavailable.
    const pools: DiscoverPoolSearchItem[] = [];
    const people = filterAndRankDiscoverPeople(profilesPage.items, plan);
    const counts = {
      offers: offers.length,
      pools: pools.length,
      people: people.length,
    };
    const items = activeItems(plan.domain, offers, pools, people);
    const offersLive =
      hasSupabaseEnv() || coFundSnapshot.sourceStatus === "live";

    return noStoreJson({
      ok: true,
      checkedAt: new Date().toISOString(),
      query: plan.query,
      normalizedQuery: plan.normalizedQuery,
      domain: plan.domain,
      offerKind: plan.offerKind,
      sort: plan.sort,
      requiresSharedInterpretation,
      clarification: null,
      constraints: plan.constraints,
      counts,
      total: counts[plan.domain],
      items,
      truncated: counts[plan.domain] > items.length,
      sourceStatus: {
        offers: offersLive ? "live" : "unavailable",
        pools: "unavailable",
        people: hasSupabaseEnv() ? "live" : "unavailable",
      },
    });
  } catch (error) {
    console.error("Discover live search failed", error);
    return noStoreJson(
      {
        ok: false,
        error: {
          kind: "marketplace_retrieval_failed",
          message:
            "Current marketplace records could not be retrieved. Your query and previous results were preserved.",
        },
      },
      503,
    );
  }
}
''')

# The browser controller owns live results even when the native source has no list surface.
path = "public/moral-trade-discover-search.js"
replace_exact(
    path,
    '  const SUPPORTED_DOMAINS = new Set(["offers", "pools", "people"]);\n',
    '  const SUPPORTED_DOMAINS = new Set(["offers", "pools", "people"]);\n'
    '  const SUPPORTED_OFFER_KINDS = new Set(["all", "individual", "co-fund"]);\n',
)
replace_exact(path, '    domain: "offers",\n    sort: "best-fit",\n', '    domain: "offers",\n    offerKind: "all",\n    sort: "best-fit",\n')
replace_exact(
    path,
    '      domain: SUPPORTED_DOMAINS.has(rawDomain) ? rawDomain : "offers",\n      sort,\n',
    '      domain: SUPPORTED_DOMAINS.has(rawDomain) ? rawDomain : "offers",\n'
    '      offerKind: SUPPORTED_OFFER_KINDS.has(read("offerKind"))\n'
    '        ? read("offerKind")\n'
    '        : "all",\n'
    '      sort,\n',
)
replace_exact(
    path,
    '      domain: state.domain,\n      sort: state.sort,\n',
    '      domain: state.domain,\n      offerKind: state.offerKind,\n      sort: state.sort,\n',
)
replace_exact(
    path,
    '    params.set("domain", state.domain);\n    params.set("view", "list");\n',
    '    params.set("domain", state.domain);\n'
    '    params.set("view", "list");\n'
    '    if (state.domain === "offers" && state.offerKind !== "all") {\n'
    '      params.set("offerKind", state.offerKind);\n'
    '    }\n',
)
replace_exact(
    path,
    '''  function renderOfferRow(item) {
    return `<article class="transaction-row offer-transaction-row discover-live-result" data-row-id="${escapeHtml(item.id)}" data-live-record="true">
''',
    '''  function renderOfferRow(item) {
    const offerKind = item.offerKind === "co-fund" ? "co-fund" : "individual";
    const intent = offerKind === "co-fund" ? "join-cofund" : "exact-match";
    const counteroffer = item.counteroffersAllowed
      ? `<a class="outline-btn" href="${escapeHtml(appendIntent(item.href, "counteroffer"))}" data-discover-result-link="true">Counteroffer</a>`
      : "";
    return `<article class="transaction-row offer-transaction-row discover-live-result" data-row-id="${escapeHtml(item.id)}" data-offer-kind="${offerKind}" data-live-record="true">
''',
)
replace_exact(
    path,
    '''        <a class="primary-btn" href="${escapeHtml(appendIntent(item.href, "exact-match"))}" data-discover-result-link="true">${escapeHtml(item.exactMatchLabel)} →</a>
        <a class="outline-btn" href="${escapeHtml(appendIntent(item.href, "counteroffer"))}" data-discover-result-link="true">Counteroffer</a>
''',
    '''        <a class="primary-btn" href="${escapeHtml(appendIntent(item.href, intent))}" data-discover-result-link="true">${escapeHtml(item.exactMatchLabel)} →</a>
        ${counteroffer}
''',
)
replace_exact(
    path,
    '''    const titleText =
      state.domain === "people"
        ? "People you can reach"
        : state.domain === "pools"
          ? "Conditional pools"
          : "Current opportunities";
    const descriptionText =
      state.domain === "offers"
        ? "Compare what you offer and what you get from live, publishable offers."
        : state.domain === "pools"
          ? "Live conditional pools matching the active query and hard constraints."
          : "Reviewed public members matching the active query and hard constraints.";
''',
    '''    const titleText =
      state.domain === "people"
        ? "People you can reach"
        : state.domain === "pools"
          ? "Standalone threshold pools"
          : state.offerKind === "co-fund"
            ? "Live Co-Funds"
            : "Current opportunities";
    const descriptionText =
      state.domain === "offers" && state.offerKind === "co-fund"
        ? "Live reciprocal trades whose contribution side is fulfilled by a contributor group."
        : state.domain === "offers"
          ? "Compare what you offer and what you get from live, publishable offers."
          : state.domain === "pools"
            ? "Live standalone threshold-funded moral public goods matching the active hard constraints."
            : "Reviewed public members matching the active query and hard constraints.";
''',
)
replace_exact(
    path,
    '''  async function waitForListSurface(sequence, controller, attempts = 30) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (!currentRequest(sequence, controller)) return null;
      const list = document.querySelector(".transaction-list");
      if (list) return list;
      await nextFrame();
    }
    return null;
  }

  function sourceClick(element) {
''',
    '''  async function waitForListSurface(sequence, controller, attempts = 30) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (!currentRequest(sequence, controller)) return null;
      const list = document.querySelector(".transaction-list");
      if (list) return list;
      await nextFrame();
    }
    return null;
  }

  function ensureLiveListSurface(response) {
    const existing = document.querySelector(".transaction-list");
    if (existing) return existing;
    const scroll = document.getElementById("view-scroll");
    if (!scroll) return null;
    const section = document.createElement("section");
    section.className = "view-stage list-stage";
    section.id = "discover-view";
    section.setAttribute("role", "tabpanel");
    section.innerHTML = `<div class="view-head"><div class="view-title"><h2></h2><p></p></div></div><div class="transaction-list"></div>`;
    scroll.replaceChildren(section);
    return section.querySelector(".transaction-list");
  }

  function sourceClick(element) {
''',
)
replace_exact(
    path,
    '''  async function prepareListSurface(domain, sequence, controller) {
    let sourceNavigated = false;
''',
    '''  async function prepareListSurface(response, sequence, controller) {
    const domain = response.domain;
    let sourceNavigated = false;
''',
)
replace_exact(
    path,
    '''    if (!currentRequest(sequence, controller)) {
      return { list: null, sourceNavigated };
    }
    const selectedList = visibleElement(
''',
    '''    if (!currentRequest(sequence, controller)) {
      return { list: null, sourceNavigated };
    }
    if (domain === "offers") {
      const selectedOfferKind = visibleElement(
        `[data-action="set-offer-kind"][data-offer-kind="${state.offerKind}"][aria-selected="true"]`,
      );
      if (!selectedOfferKind) {
        const offerKindControl = visibleElement(
          `[data-action="set-offer-kind"][data-offer-kind="${state.offerKind}"]`,
        );
        sourceNavigated = sourceClick(offerKindControl) || sourceNavigated;
        await nextFrame();
      }
    }
    if (!currentRequest(sequence, controller)) {
      return { list: null, sourceNavigated };
    }
    const selectedList = visibleElement(
''',
)
replace_exact(
    path,
    '''    const list = await waitForListSurface(sequence, controller);
    return { list, sourceNavigated };
''',
    '''    let list = await waitForListSurface(sequence, controller);
    if (!list && currentRequest(sequence, controller)) {
      list = ensureLiveListSurface(response);
    }
    return { list, sourceNavigated };
''',
)
replace_exact(
    path,
    '''    const { list, sourceNavigated } = await prepareListSurface(
      response.domain,
      sequence,
      controller,
    );
''',
    '''    const { list, sourceNavigated } = await prepareListSurface(
      response,
      sequence,
      controller,
    );
''',
)
replace_exact(
    path,
    '''        domain: state.domain,
        sort: state.sort,
''',
    '''        domain: state.domain,
        offerKind: state.offerKind,
        sort: state.sort,
''',
)
replace_exact(
    path,
    '''      state.response = payload;
      state.domain = payload.domain;
      state.sort = payload.sort;
''',
    '''      state.response = payload;
      state.domain = payload.domain;
      state.offerKind =
        payload.domain === "offers" && SUPPORTED_OFFER_KINDS.has(payload.offerKind)
          ? payload.offerKind
          : "all";
      state.sort = payload.sort;
''',
)
replace_exact(
    path,
    '''  function setDomain(domain) {
    if (!SUPPORTED_DOMAINS.has(domain)) return;
    state.domain = domain;
    executeSearch({ historyMode: "push" });
  }

  function toggleArray(values, value, checked) {
''',
    '''  function setDomain(domain) {
    if (!SUPPORTED_DOMAINS.has(domain)) return;
    state.domain = domain;
    if (domain !== "offers") state.offerKind = "all";
    executeSearch({ historyMode: "push" });
  }

  function setOfferKind(offerKind) {
    if (!SUPPORTED_OFFER_KINDS.has(offerKind)) return;
    state.domain = "offers";
    state.offerKind = offerKind;
    executeSearch({ historyMode: "push" });
  }

  function toggleArray(values, value, checked) {
''',
)
replace_exact(
    path,
    '''    if (filter === "cause") {
''',
    '''    if (filter === "offer-kind") {
      setOfferKind(target.value);
      return true;
    }
    if (filter === "cause") {
''',
)
replace_exact(
    path,
    '''    state.domain = "offers";
    state.sort = "best-fit";
''',
    '''    state.domain = "offers";
    state.offerKind = "all";
    state.sort = "best-fit";
''',
)
replace_exact(
    path,
    '''      const domainTab = target.closest(
        '[data-action="set-domain"][data-domain]',
      );
''',
    '''      const offerKindControl = target.closest(
        '[data-action="set-offer-kind"][data-offer-kind]',
      );
      if (offerKindControl && !state.sourcePassThrough && activeSearch()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOfferKind(offerKindControl.dataset.offerKind);
        return;
      }

      const domainTab = target.closest(
        '[data-action="set-domain"][data-domain]',
      );
''',
)

# Make rendered regressions use the live API boundary and verify the canonical classification.
path = "tests/discover-cofund.spec.ts"
first_start = 'test("natural-language group-buying searches route to Offers → Co-Funds", async ({ page }) => {'
second_start = 'test("dominant-assurance searches route to standalone Pools even without a server routing hint", async ({'
first_replacement = '''test("natural-language group-buying searches route to Offers → Co-Funds", async ({ page }) => {
  await page.route("**/api/discover/search", async (route) => {
    const request = route.request().postDataJSON() as { query: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        checkedAt: "2026-07-31T16:30:00.000Z",
        query: request.query,
        normalizedQuery: request.query,
        domain: "offers",
        offerKind: "co-fund",
        sort: "best-fit",
        requiresSharedInterpretation: false,
        clarification: null,
        constraints: [
          { key: "domain", label: "Domain: Offers", source: "query" },
          { key: "offer-kind", label: "Offer type: Co-Fund", source: "query" },
        ],
        counts: { offers: 1, pools: 0, people: 0 },
        total: 1,
        truncated: false,
        sourceStatus: { offers: "live", pools: "unavailable", people: "live" },
        items: [
          {
            kind: "offer",
            offerKind: "co-fund",
            id: "live-cofund-1",
            title: "Co-Fund a verified biosecurity salary guarantee",
            cause: "Biosecurity",
            status: "Open for contributors",
            youOffer: ["Contribute from $25", "No charge if the threshold is missed"],
            youGet: ["Fund one verified salary-guarantee trade"],
            offerFlexibility: "Threshold terms",
            returnFlexibility: "Fixed",
            providerName: "Biosecurity project",
            providerRole: "Co-Fund counterparty",
            evidenceLabel: "Reviewed milestone plan",
            completionLabel: "Funding closes 2026-08-20",
            href: "/moral-goods-group-buying?pool=live-cofund-1",
            exactMatchLabel: "Join Co-Fund",
            counteroffersAllowed: false,
            createdAt: "2026-07-31T16:00:00.000Z",
            score: 100,
          },
        ],
      }),
    });
  });

  await page.goto("/discover", { waitUntil: "networkidle" });
  await waitForDiscover(page);
  const form = page.locator("#command-form");
  await form.locator("#command-input").fill("group buying a moral trade");
  await form.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/domain=offers/);
  await expect(page).toHaveURL(/offerKind=co-fund/);
  await expect(page).toHaveURL(/view=list/);
  const row = page.locator('.offer-transaction-row[data-offer-kind="co-fund"]');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Co-Fund a verified biosecurity salary guarantee");
  await expect(row.getByRole("link", { name: /Join Co-Fund/ })).toBeVisible();
  await expect(row.getByRole("link", { name: "Counteroffer" })).toHaveCount(0);
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
});


'''
replace_between(path, first_start, second_start, first_replacement)
source = Path(path).read_text()
second_index = source.find(second_start)
if second_index < 0:
    raise RuntimeError(f"{path}: second Co-Fund test marker not found")
second_replacement = '''test("dominant-assurance searches route to standalone Pools even without a server routing hint", async ({
  page,
}) => {
  await page.route("**/api/discover/search", async (route) => {
    const request = route.request().postDataJSON() as { query: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        checkedAt: "2026-07-31T16:30:00.000Z",
        query: request.query,
        normalizedQuery: request.query,
        domain: "pools",
        offerKind: "all",
        sort: "best-fit",
        requiresSharedInterpretation: false,
        clarification: null,
        constraints: [{ key: "domain", label: "Domain: Pools", source: "query" }],
        counts: { offers: 0, pools: 1, people: 0 },
        total: 1,
        truncated: false,
        sourceStatus: { offers: "live", pools: "live", people: "live" },
        items: [
          {
            kind: "pool",
            id: "standalone-pool-1",
            title: "Wild-animal welfare dominant-assurance pool",
            cause: "Wild animal suffering",
            status: "Near threshold",
            youOffer: ["Make a conditional pledge from $10"],
            youGet: ["Fund one standalone research tranche"],
            providerName: "Wild Animal Initiative",
            evidenceLabel: "Reviewed milestone plan",
            completionLabel: "Deadline 2026-08-15",
            href: "/pools/standalone-pool-1",
            targetFundingCents: 100000,
            score: 100,
          },
        ],
      }),
    });
  });

  await page.goto("/discover", { waitUntil: "networkidle" });
  await waitForDiscover(page);
  const form = page.locator("#command-form");
  await form.locator("#command-input").fill("dominant assurance contracts");
  await form.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/domain=pools/);
  await expect(page).toHaveURL(/view=list/);
  expect(page.url()).not.toContain("offerKind=co-fund");
  await expect(page.getByRole("heading", { name: "Standalone threshold pools" })).toBeVisible();
  await expect(page.locator(".transaction-list")).toContainText(
    "Wild-animal welfare dominant-assurance pool",
  );
  await expect(page.locator('.offer-transaction-row[data-offer-kind="co-fund"]')).toHaveCount(0);
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
});
'''
Path(path).write_text(source[:second_index] + second_replacement)

# Add explicit subtype data to the general live-search browser fixtures.
replace_exact(
    "tests/discover-live-search.spec.ts",
    '    kind: "offer",\n    id,\n',
    '    kind: "offer",\n    offerKind: "individual",\n    id,\n',
)
replace_exact(
    "tests/discover-live-search.spec.ts",
    '    domain,\n    sort: "best-fit",\n',
    '    domain,\n    offerKind: "all",\n    sort: "best-fit",\n',
)

# Replace unit coverage with the current domain boundary and live Co-Fund mapping.
Path("src/lib/discover-search.test.ts").write_text('''import assert from "node:assert/strict";
import test from "node:test";

import type { PublicProfileSummary } from "@/lib/app-data";
import {
  filterAndRankDiscoverCoFunds,
  filterAndRankDiscoverPeople,
  parseDiscoverExchangeIntent,
} from "@/lib/discover-search";
import {
  buildDiscoverSearchPlan,
  filterAndRankDiscoverOffers,
} from "@/lib/discover-search-plan";
import type { LiveGroupBuyingRoute } from "@/lib/moral-trade/group-buying-live";
import type { PublicOfferListing } from "@/lib/public-offers";

function offer(overrides: Partial<PublicOfferListing>): PublicOfferListing {
  return {
    id: "offer-1",
    slug: "offer-1",
    title: "Read a paper for wild-animal welfare",
    summary: "A live reviewed moral trade.",
    format: "pledge-swap",
    status: "live",
    source: "live",
    isWorkedExample: false,
    reviewState: "manual-review-required",
    primaryCause: "Counterparty-selected learning or attention",
    secondaryCause: "wild-animal welfare and reducing wild-animal suffering",
    offeredAction: "O4 — Read one paper and produce a summary.",
    requestedAction: "R5 — Donate $100 to Wild Animal Initiative.",
    baselineBondBadge: null,
    verificationMethod: "Receipt or public link",
    verificationSummary: "Receipt or public link | Low",
    duration: { value: 30, unit: "days", label: "Complete within 30 days" },
    offeredImpactScore: 8,
    requestedImpactThreshold: 8,
    displayName: "Ellen",
    canonicalUrl: "https://www.moraltrade.org/offers/offer-1",
    createdAt: "2026-07-21T15:21:07.175Z",
    updatedAt: "2026-07-21T16:45:17.920Z",
    manualReviewRequired: true,
    evidenceGated: true,
    noEscrow: true,
    ...overrides,
  } as PublicOfferListing;
}

const wildOffer = offer({ id: "wild", slug: "wild" });
const aiOffer = offer({
  id: "ai",
  slug: "ai",
  title: "Build an alignment evaluation harness",
  secondaryCause: "AI safety",
  offeredAction: "O2 — Donate $50 to an AI-safety charity.",
  requestedAction: "R2 — Complete two hours of software engineering.",
});
const exampleOffer = offer({
  id: "example",
  slug: "example",
  status: "example",
  source: "worked_example",
  isWorkedExample: true,
});

const coFundRoute = {
  id: "cofund-1",
  publicKey: "cofund-1",
  title: "Co-Fund a wild-animal welfare research trade",
  summary: "A live reciprocal trade fulfilled by a contributor group.",
  causeArea: "Wild animal suffering",
  recipientName: "Wild Animal Initiative",
  intervention: "Fund one verified research tranche",
  verificationSummary: "Reviewed milestone plan",
  expectedEffect: "Research begins after the threshold activates",
  timeline: "30 days",
  statusLabel: "Near threshold",
  statusSentence: "The Co-Fund is near threshold.",
  fundingMode: "pledge_only",
  currency: "USD",
  minimumFundingCents: 500,
  targetFundingCents: 100_000,
  deadlineAt: "2026-08-15T23:59:59Z",
  failureBehavior: "No charge if the threshold is missed.",
  href: "/moral-goods-group-buying?pool=cofund-1",
} satisfies LiveGroupBuyingRoute;

test("a recognized cause is a hard filter rather than a ranking hint", () => {
  const plan = buildDiscoverSearchPlan({ query: "Wild animal suffering", domain: "offers" });
  const results = filterAndRankDiscoverOffers([wildOffer, aiOffer, exampleOffer], plan);
  assert.deepEqual(results.map((result) => result.id), ["wild"]);
  assert.equal(results[0].offerKind, "individual");
  assert.equal(results[0].youOffer[0], "Donate $100 to Wild Animal Initiative.");
  assert.equal(results[0].youGet[0], "Read one paper and produce a summary.");
});

test("high-confidence typo resolution still enforces the canonical cause", () => {
  const plan = buildDiscoverSearchPlan({ query: "wild animl sufferng", domain: "offers" });
  assert.deepEqual(plan.facets.causes, ["wild-animal-suffering"]);
  assert.deepEqual(
    filterAndRankDiscoverOffers([wildOffer, aiOffer], plan).map((result) => result.id),
    ["wild"],
  );
});

test("mixed exchange language parses You offer and You get separately", () => {
  const intent = parseDiscoverExchangeIntent(
    "Software engineering for donations to AI safety under $100",
  );
  assert.ok(intent.offerTypes.includes("skill"));
  assert.ok(intent.returnTypes.includes("donation"));
  assert.equal(intent.returnMaximumCents, 10_000);
  const plan = buildDiscoverSearchPlan({
    query: "Software engineering for donations to AI safety under $100",
  });
  assert.deepEqual(
    filterAndRankDiscoverOffers([wildOffer, aiOffer], plan).map((result) => result.id),
    ["ai"],
  );
});

test("domain and Offer-subtype language follow the canonical boundary", () => {
  const coFundPlan = buildDiscoverSearchPlan({ query: "group buying a moral trade" });
  assert.equal(coFundPlan.domain, "offers");
  assert.equal(coFundPlan.offerKind, "co-fund");
  assert.deepEqual(coFundPlan.exchange.residualTerms, []);

  const poolPlan = buildDiscoverSearchPlan({ query: "dominant assurance contracts" });
  assert.equal(poolPlan.domain, "pools");
  assert.equal(poolPlan.offerKind, "all");
  assert.deepEqual(poolPlan.exchange.residualTerms, []);

  assert.equal(
    buildDiscoverSearchPlan({ query: "People who can review biosecurity protocols" }).domain,
    "people",
  );
});

test("live group-buying routes render as Co-Fund Offers", () => {
  const plan = buildDiscoverSearchPlan({
    query: "group buying a moral trade for wild animal suffering",
  });
  const results = filterAndRankDiscoverCoFunds([coFundRoute], plan);
  assert.deepEqual(results.map((result) => result.id), ["cofund-1"]);
  assert.equal(results[0].kind, "offer");
  assert.equal(results[0].offerKind, "co-fund");
  assert.equal(results[0].exactMatchLabel, "Join Co-Fund");
  assert.equal(results[0].counteroffersAllowed, false);
});

test("standalone amounts surface one material clarification", () => {
  const plan = buildDiscoverSearchPlan({ query: "Animal welfare for $50" });
  assert.equal(plan.interpretation.needsClarification, true);
  assert.equal(plan.interpretation.clarification?.field, "amount");
});

test("people search never substitutes hard-coded examples", () => {
  const person = {
    id: "person-1",
    resolvedName: "Sasha",
    bio: "Biosecurity engineer who reviews laboratory protocols",
    wishPreview: "Open to protocol review",
    wishCauses: ["Biosecurity"],
    wishLocation: "Boston",
    wishParticipantKind: "individual",
    wishCollectiveName: null,
    wishOpenToPayment: true,
    wishOpenToPledges: true,
    verificationBadges: [{ id: "badge-1" }],
    offerCount: 2,
  } as unknown as PublicProfileSummary;
  const peoplePlan = buildDiscoverSearchPlan({
    query: "People who can review biosecurity protocols",
  });
  assert.deepEqual(
    filterAndRankDiscoverPeople([person], peoplePlan).map((result) => result.id),
    ["person-1"],
  );
});
''')

# Extend the static contract to guard single ownership and the Co-Fund/Pool data boundary.
Path("scripts/discover-live-search-loader-contract.test.mjs").write_text('''import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const loader = await readFile(
  new URL("../public/moral-trade-discover.html", import.meta.url),
  "utf8",
);
const preflight = await readFile(
  new URL("../public/moral-trade-discover-search-preflight.js", import.meta.url),
  "utf8",
);
const controller = await readFile(
  new URL("../public/moral-trade-discover-search.js", import.meta.url),
  "utf8",
);
const route = await readFile(
  new URL("../src/app/api/discover/search/route.ts", import.meta.url),
  "utf8",
);

test("Discover loads the filter snapshot preflight before the live search controller", () => {
  const preflightIndex = loader.indexOf(
    "/moral-trade-discover-search-preflight.js",
  );
  const controllerIndex = loader.indexOf("/moral-trade-discover-search.js");
  assert.notEqual(preflightIndex, -1);
  assert.notEqual(controllerIndex, -1);
  assert.ok(
    preflightIndex < controllerIndex,
    "preflight must wrap fetch and history before an initial URL query can run",
  );
  assert.equal(
    loader.includes("/moral-trade-smart-query.js"),
    false,
    "Discover must have one submission owner",
  );
});

test("the preflight snapshots filters into both the request and browser history", () => {
  assert.match(preflight, /manualFiltersFromDom\\(payload\\.manual\\)/);
  assert.match(preflight, /augmentHistoryState/);
  assert.match(preflight, /augmentHistoryUrl/);
  assert.match(preflight, /maximumOfferAmountCents/);
  assert.match(preflight, /minimumReturnAmountCents/);
  assert.match(preflight, /causeFilter/);
  assert.match(preflight, /history\\.pushState/);
  assert.match(preflight, /history\\.replaceState/);
});

test("the controller performs live in-place search without navigation assignment", () => {
  assert.match(controller, /fetch\\("\\/api\\/discover\\/search"/);
  assert.match(controller, /AbortController/);
  assert.match(controller, /history\\.pushState/);
  assert.match(controller, /ensureLiveListSurface/);
  assert.match(controller, /offerKind/);
  assert.equal(controller.includes("location.assign("), false);
});

test("live group-buying inventory is searched as Co-Fund Offers, not standalone Pools", () => {
  assert.match(route, /filterAndRankDiscoverCoFunds\\(coFundSnapshot\\.routes, plan\\)/);
  assert.match(route, /const pools: DiscoverPoolSearchItem\\[\\] = \\[\\]/);
  assert.doesNotMatch(route, /filterAndRankDiscoverPools\\([^)]*Snapshot\\.routes/);
  assert.match(route, /offerKind: plan\\.offerKind/);
});
''')

print("PR #382 live-search boundary repair applied")
