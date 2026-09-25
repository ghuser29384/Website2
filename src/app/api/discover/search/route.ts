import { NextResponse } from "next/server";

import {
  listOpenOffersDirectory,
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
import {
  discoverOffersAvailability,
  discoverResultPage,
  type DiscoverSourceStatus,
} from "@/lib/discover-live-directory";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32_000;
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
    value.sort === "lowest-cost"
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
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      return { error: "Search request is too large." } as const;
    }
    return { value: JSON.parse(text) as unknown } as const;
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
  const liveOffers = await listOpenOffersDirectory(liveMode);
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

function selectDiscoverOfferItems(
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
): readonly DiscoverSearchItem[] {
  if (domain === "pools") return pools;
  if (domain === "people") return people;
  return offers;
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
    const needsIndividuals = plan.domain === "offers" && plan.offerKind !== "co-fund";
    const needsCoFunds = plan.domain === "offers" && plan.offerKind !== "individual";
    const needsPeople = plan.domain === "people";
    let individualStatus: DiscoverSourceStatus = needsIndividuals ? "unavailable" : "not_requested";
    let peopleStatus: DiscoverSourceStatus = needsPeople ? "unavailable" : "not_requested";
    const [offerListings, coFundSnapshot, profilesPage] = await Promise.all([
      needsIndividuals && hasSupabaseEnv()
        ? listAllLiveOfferListings().then((items) => {
            individualStatus = "live";
            return items;
          }).catch(() => {
            console.warn("Discover individual-offer source unavailable");
            return [];
          })
        : Promise.resolve([]),
      needsCoFunds
        ? loadLiveGroupBuyingSnapshot().catch(() => ({ sourceStatus: "unavailable" as const, routes: [] }))
        : Promise.resolve({ sourceStatus: "unavailable" as const, routes: [] }),
      needsPeople && hasSupabaseEnv()
        ? listPublicProfilesPage("reviewed", 1, MAX_PUBLIC_PROFILES, null).then((result) => {
            peopleStatus = "live";
            return result;
          }).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] }),
    ]);
    const coFundStatus: DiscoverSourceStatus = needsCoFunds ? coFundSnapshot.sourceStatus : "not_requested";
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
    const resultPage = discoverResultPage(
      activeItems(plan.domain, offers, pools, people),
      isRecord(body.value) ? body.value.page : undefined,
    );

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
      ...resultPage,
      sources: { individualOffers: individualStatus, coFunds: coFundStatus },
      sourceStatus: {
        offers: discoverOffersAvailability(individualStatus, coFundStatus, plan.offerKind),
        pools: "unavailable",
        people: peopleStatus,
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
            "Current marketplace records could not be retrieved. Your query was preserved; retry to check current availability.",
        },
      },
      503,
    );
  }
}
