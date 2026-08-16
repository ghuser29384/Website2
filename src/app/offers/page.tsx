import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { ParticipantOfferGroup } from "@/components/marketplace/participant-offer-group";
import { SmartQueryForm } from "@/components/search/smart-query-form";
import { TradeTemplateLibrary } from "@/components/trade-templates/trade-template-library";
import { getViewer, OFFERS_PAGE_SIZE } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { groupOffersByParticipant } from "@/lib/marketplace-participant-groups";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import {
  normalizeCreditSignal,
  smartDiscoveryScore,
} from "@/lib/smart-discovery-ranking";
import {
  extractMoneyAmountsCents,
  getSmartDeadlineUrgency,
  getSmartQueryCauseLabel,
  matchesSmartAmountConstraint,
  matchesSmartDeadlineConstraint,
  matchesSmartVerificationConstraint,
  parseSerializedSmartQueryFacets,
  parseSmartQuery,
  serializeSmartQueryFacets,
  type SmartQueryFacets,
  type SmartQueryInterpretation,
  type SmartQuerySort,
} from "@/lib/smart-query";
import {
  hasSmartQueryConstraints,
  mergeSmartQueryFacets,
} from "@/lib/smart-query-facets";
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
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import densityStyles from "./offers-density.module.css";

const LIVE_METADATA: Metadata = {
  title: "Explore live proposals",
  description:
    "Explore live Moral Trade proposals with explicit baselines, terms, evidence, payment boundaries, and current review states.",
  alternates: { canonical: "/offers?view=live" },
  openGraph: {
    title: "Explore live Moral Trade proposals",
    description:
      "Browse participant proposals and open their complete terms without mixing examples or explanatory records into marketplace inventory.",
    url: getAbsoluteUrl("/offers?view=live"),
    type: "website",
  },
};

interface OffersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: OffersPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const view = readParam(resolvedSearchParams, "view");
  const legacyTab = readParam(resolvedSearchParams, "tab");

  if (view === "templates" || legacyTab === "templates") {
    return {
      title: "Trade templates",
      description:
        "Choose a Moral Trade template and open its real editable draft in one click, or use a three-question guide to find the right starting point.",
      alternates: { canonical: "/offers?view=templates" },
      openGraph: {
        title: "Trade templates | Moral Trade",
        description:
          "Open a prefilled pledge, donation-offset, skill, favor, or threshold-pool draft and edit every term before saving.",
        url: getAbsoluteUrl("/offers?view=templates"),
        type: "website",
      },
    };
  }

  return LIVE_METADATA;
}

type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
type OfferMode = OfferRow["mode"];
type ModeFilter = "all" | OfferMode;
type OfferSort = Extract<
  SmartQuerySort,
  "best_match" | "newest" | "lowest_cost" | "most_verified" | "soonest_deadline" | "highest_credit"
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

interface LiveOffersResult {
  items: OfferRow[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  error: string | null;
  candidateLimitReached: boolean;
}

const MODE_OPTIONS: ReadonlyArray<{ value: ModeFilter; label: string }> = [
  { value: "all", label: "Any proposal type" },
  { value: "pledge", label: "Pledge or reciprocal action" },
  { value: "payment", label: "Payment-supported action" },
  { value: "offset", label: "Donation offset" },
];

const SORT_OPTIONS: ReadonlyArray<{ value: OfferSort; label: string }> = [
  { value: "best_match", label: "Best match" },
  { value: "most_verified", label: "Strongest evidence" },
  { value: "soonest_deadline", label: "Soonest deadline" },
  { value: "lowest_cost", label: "Lowest stated cost" },
  { value: "highest_credit", label: "Highest transaction credit" },
  { value: "newest", label: "Newest" },
];

const SMART_OFFER_CANDIDATE_LIMIT = 2_000;
const WORKED_EXAMPLE_VIEWS = new Set(["examples", "worked_examples", "worked-examples"]);

function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function parseMode(value: string): ModeFilter {
  return MODE_OPTIONS.some((option) => option.value === value)
    ? (value as ModeFilter)
    : "all";
}

function parseSort(value: string, hasSmartSearch: boolean): OfferSort {
  if (SORT_OPTIONS.some((option) => option.value === value)) return value as OfferSort;
  return hasSmartSearch ? "best_match" : "newest";
}

function normalizeSearch(value: string) {
  return value.trim().slice(0, 500).replace(/\s+/g, " ");
}

function offerTextFields(offer: OfferRow) {
  return [
    { value: `${offer.offered_cause} ${offer.requested_cause} ${offer.compromise_cause}`, weight: 1 },
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
  return parseSmartQuery(
    `${offer.offered_cause} ${offer.requested_cause} ${offer.compromise_cause}`,
    { surface: "offers" },
  ).facets.causes;
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
    if (causeScore < 0.42 && !facets.causes.some((cause) => causeIds.includes(cause))) return false;
  }
  if (!matchesSmartVerificationConstraint(facets, verified)) return false;
  if (!strictAmountMatch(facets, amountCents)) return false;
  if (!matchesSmartDeadlineConstraint(facets, deadline)) return false;
  if (facets.minCredit !== null && normalizeCreditSignal(offer.trust_level) * 100 < facets.minCredit) {
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
  const causeIds = offerCauseIds(offer);
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
      return Date.parse(right.offer.created_at) - Date.parse(left.offer.created_at) ||
        left.offer.id.localeCompare(right.offer.id);
    }
    if (sort === "lowest_cost") {
      const leftAmount = left.amountCents.length ? Math.max(...left.amountCents) : Number.POSITIVE_INFINITY;
      const rightAmount = right.amountCents.length ? Math.max(...right.amountCents) : Number.POSITIVE_INFINITY;
      return leftAmount - rightAmount || right.score - left.score || left.offer.id.localeCompare(right.offer.id);
    }
    if (sort === "most_verified") {
      return right.evidenceQuality - left.evidenceQuality || right.score - left.score ||
        left.offer.id.localeCompare(right.offer.id);
    }
    if (sort === "soonest_deadline") {
      const leftDeadline = left.deadline ? Date.parse(left.deadline) : Number.POSITIVE_INFINITY;
      const rightDeadline = right.deadline ? Date.parse(right.deadline) : Number.POSITIVE_INFINITY;
      return leftDeadline - rightDeadline || right.score - left.score ||
        left.offer.id.localeCompare(right.offer.id);
    }
    if (sort === "highest_credit") {
      return normalizeCreditSignal(right.offer.trust_level) - normalizeCreditSignal(left.offer.trust_level) ||
        right.score - left.score || left.offer.id.localeCompare(right.offer.id);
    }
    return right.score - left.score ||
      Date.parse(right.offer.created_at) - Date.parse(left.offer.created_at) ||
      left.offer.id.localeCompare(right.offer.id);
  });
}

function buildLiveHref({
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
  if (sort && sort !== (search || (facets && hasSmartQueryConstraints(facets)) ? "best_match" : "newest")) {
    params.set("sort", sort);
  }
  if (page && page > 1) params.set("page", String(page));
  return `/offers?${params.toString()}`;
}

async function loadPersonalCausePriorities(viewerId: string | null) {
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

async function listSavedOfferIds(viewerId: string | null, offerIds: readonly string[]) {
  if (!viewerId || !offerIds.length || !hasSupabaseEnv()) return new Set<string>();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offer_carts")
    .select("offer_id")
    .eq("user_id", viewerId)
    .in("offer_id", [...offerIds]);

  if (error) {
    console.error("[offers] Failed to load saved-offer state for participant groups", {
      code: error.code,
      message: error.message,
      viewerId,
    });
    return new Set<string>();
  }

  return new Set((data ?? []).map((row) => row.offer_id));
}

async function listLiveOffers({
  facets,
  interpretation,
  mode,
  page,
  personalPriorities,
  smartSearch,
  sort,
}: {
  facets: SmartQueryFacets;
  interpretation: SmartQueryInterpretation;
  mode: ModeFilter;
  page: number;
  personalPriorities: readonly string[];
  smartSearch: boolean;
  sort: OfferSort;
}): Promise<LiveOffersResult> {
  if (!hasSupabaseEnv()) {
    return {
      items: [],
      total: 0,
      page,
      pageSize: OFFERS_PAGE_SIZE,
      hasNextPage: false,
      hasPreviousPage: page > 1,
      error: null,
      candidateLimitReached: false,
    };
  }

  const supabase = await createClient();
  const offset = (page - 1) * OFFERS_PAGE_SIZE;
  let query = supabase.from("offers").select("*", { count: smartSearch ? undefined : "exact" }).eq("status", "open");
  if (mode !== "all") query = query.eq("mode", mode);

  if (smartSearch) {
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(SMART_OFFER_CANDIDATE_LIMIT);
    if (error) {
      console.error("[offers] Failed to load smart-search candidates", {
        code: error.code,
        message: error.message,
        mode,
      });
      return {
        items: [],
        total: 0,
        page,
        pageSize: OFFERS_PAGE_SIZE,
        hasNextPage: false,
        hasPreviousPage: page > 1,
        error: "The live directory could not be loaded. Please refresh or try again shortly.",
        candidateLimitReached: false,
      };
    }

    const ranked = (data ?? [])
      .map((offer) => rankOffer(offer as OfferRow, { ...interpretation, facets }, personalPriorities, new Date()))
      .filter((entry): entry is RankedOffer => Boolean(entry));
    const sorted = sortRankedOffers(ranked, sort);
    return {
      items: sorted.slice(offset, offset + OFFERS_PAGE_SIZE).map((entry) => entry.offer),
      total: sorted.length,
      page,
      pageSize: OFFERS_PAGE_SIZE,
      hasNextPage: offset + OFFERS_PAGE_SIZE < sorted.length,
      hasPreviousPage: page > 1,
      error: null,
      candidateLimitReached: (data ?? []).length === SMART_OFFER_CANDIDATE_LIMIT,
    };
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + OFFERS_PAGE_SIZE - 1);

  if (error) {
    console.error("[offers] Failed to load the live proposal directory", {
      code: error.code,
      message: error.message,
      mode,
      page,
    });
    return {
      items: [],
      total: 0,
      page,
      pageSize: OFFERS_PAGE_SIZE,
      hasNextPage: false,
      hasPreviousPage: page > 1,
      error: "The live directory could not be loaded. Please refresh or try again shortly.",
      candidateLimitReached: false,
    };
  }

  const total = count ?? (data ?? []).length;
  return {
    items: (data ?? []) as OfferRow[],
    total,
    page,
    pageSize: OFFERS_PAGE_SIZE,
    hasNextPage: offset + OFFERS_PAGE_SIZE < total,
    hasPreviousPage: page > 1,
    error: null,
    candidateLimitReached: false,
  };
}

function formatMoneyConstraint(facets: SmartQueryFacets) {
  if (facets.maxAmountCents !== null) {
    const operator = facets.maxAmountInclusive ? "At most" : "Under";
    return `${operator} $${(facets.maxAmountCents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  if (facets.minAmountCents !== null) {
    const operator = facets.minAmountInclusive ? "At least" : "Over";
    return `${operator} $${(facets.minAmountCents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  return null;
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const resolvedSearchParams = await searchParams;
  const view = readParam(resolvedSearchParams, "view");
  const legacyTab = readParam(resolvedSearchParams, "tab");
  if (
    WORKED_EXAMPLE_VIEWS.has(view.toLowerCase()) ||
    WORKED_EXAMPLE_VIEWS.has(legacyTab.toLowerCase())
  ) {
    redirect("/worked-examples");
  }
  if (view === "templates" || legacyTab === "templates") return <TradeTemplateLibrary />;

  const page = parsePage(resolvedSearchParams.page);
  const search = normalizeSearch(readParam(resolvedSearchParams, "search"));
  const mode = parseMode(readParam(resolvedSearchParams, "mode"));
  const parsedInterpretation = parseSmartQuery(search, { surface: "offers" });
  const explicitFacets = parseSerializedSmartQueryFacets(resolvedSearchParams);
  const facets = mergeSmartQueryFacets(parsedInterpretation.facets, explicitFacets);
  const smartSearch = Boolean(search || hasSmartQueryConstraints(facets));
  const sort = parseSort(readParam(resolvedSearchParams, "sort") || facets.sort || "", smartSearch);
  const viewer = await getViewer();
  const personalPriorities = await loadPersonalCausePriorities(viewer?.authUser.id ?? null);
  const livePage = await listLiveOffers({
    facets,
    interpretation: parsedInterpretation,
    mode,
    page,
    personalPriorities,
    smartSearch,
    sort,
  });
  const isAuthenticated = Boolean(viewer);
  const participantGroups = groupOffersByParticipant(livePage.items);
  const savedOfferIds = await listSavedOfferIds(
    viewer?.authUser.id ?? null,
    livePage.items.map((offer) => offer.id),
  );
  const formMessage = getFormMessage(resolvedSearchParams);
  const createHref = isAuthenticated ? "/create" : "/signup?returnTo=/create";
  const activeConstraintLabels = [
    ...facets.causes.map((cause) => `Cause: ${getSmartQueryCauseLabel(cause)}`),
    facets.verified === true ? "Verified only" : facets.verified === false ? "Unverified only" : null,
    formatMoneyConstraint(facets),
    facets.deadlineBefore ? `${facets.deadlineBeforeInclusive ? "By" : "Before"} ${facets.deadlineBefore}` : null,
    facets.minCredit !== null ? `Credit ≥ ${facets.minCredit}` : null,
  ].filter((label): label is string => Boolean(label));
  const hasFilters = Boolean(search || mode !== "all" || activeConstraintLabels.length || sort !== "newest");
  const pageCount = Math.max(1, Math.ceil(livePage.total / livePage.pageSize));
  const currentReturnTo = buildLiveHref({ facets, mode, page, search, sort });
  const modeLabel = MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode;
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? sort;
  const activeFilterLabels = [
    search ? `Query: ${search}` : null,
    mode !== "all" ? modeLabel : null,
    ...activeConstraintLabels,
  ].filter((label): label is string => Boolean(label));
  const topbarActions = getTopbarActions(isAuthenticated);
  const routeNavigation = getPrimaryNavLinks(isAuthenticated).flatMap((link) =>
    link.href
      ? [{ href: link.href, label: link.label, description: link.summary }]
      : link.items ?? [],
  );

  return (
    <div className={densityStyles.shell}>
      <header className={densityStyles.routeHeader}>
        <div className={densityStyles.routeTopbar}>
          <SiteTopbar
            authLink={topbarActions.authLink}
            brandHref="/"
            links={[
              {
                items: routeNavigation,
                label: "Navigate",
                summary: "Global navigation for the Moral Trade marketplace.",
              },
            ]}
            primaryAction={{ href: createHref, label: "Create a proposal" }}
            showLogout={isAuthenticated}
          />
          <p className={densityStyles.routeContext}>Offers · Live directory</p>
        </div>
      </header>

      <main className={densityStyles.main} id="main-content" tabIndex={-1}>
        {formMessage || livePage.error || livePage.candidateLimitReached ? (
          <div className={densityStyles.statusStack}>
            {formMessage ? (
              <div className={`status-banner ${formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"}`}>
                {formMessage.text}
              </div>
            ) : null}
            {livePage.error ? (
              <div className="status-banner status-banner-error" role="alert">{livePage.error}</div>
            ) : null}
            {livePage.candidateLimitReached ? (
              <div className="status-banner" role="status">
                This semantic result set was ranked from the newest {SMART_OFFER_CANDIDATE_LIMIT.toLocaleString()} live candidates.
                Tighten the cause, budget, or deadline to narrow a larger registry.
              </div>
            ) : null}
          </div>
        ) : null}

        <section className={densityStyles.workspace} aria-labelledby="directory-heading">
          <aside className={densityStyles.introRail}>
            <p className={densityStyles.sectionLabel}>Live offers</p>
            <h1 id="directory-heading">Find a live proposal you can evaluate quickly.</h1>
            <p className={densityStyles.introCopy}>
              Search by outcome, evidence, budget, or deadline, then open only the exact terms
              worth considering.
            </p>

            <details className={densityStyles.infoDisclosure}>
              <summary>Directory rule</summary>
              <div>
                <strong>Live participant records only.</strong>
                <p>
                  Search never substitutes examples for live demand. A result with an unknown
                  amount, deadline, or verification state does not pass a hard constraint on that
                  field.
                </p>
              </div>
            </details>

            <nav aria-label="Offers supporting routes" className={densityStyles.introLinks}>
              <Link href="/donate">Make a financial contribution</Link>
              <Link href="/offers?view=templates">Browse trade templates</Link>
            </nav>
          </aside>

          <SmartQueryForm
            action="/offers"
            className={densityStyles.directoryForm}
            method="get"
            queryName="search"
            surface="offers"
          >
            <input name="view" type="hidden" value="live" />

            <div className={densityStyles.searchStage} data-testid="directory-controls">
              <div className={densityStyles.resultsHeading}>
                <div>
                  <p className={densityStyles.sectionLabel}>Live directory</p>
                  <h2>Open participant proposals</h2>
                </div>
                <p aria-live="polite" className={densityStyles.resultCount}>
                  {livePage.error ? (
                    <strong>Results unavailable</strong>
                  ) : (
                    <>
                      <strong>{livePage.total.toLocaleString()}</strong> matching proposal{livePage.total === 1 ? "" : "s"}
                      <span aria-hidden="true"> · </span>
                      {livePage.items.length.toLocaleString()} on this page from {participantGroups.length.toLocaleString()} participant{participantGroups.length === 1 ? "" : "s"}
                    </>
                  )}
                </p>
              </div>

              <div aria-label="Search live proposals" className={densityStyles.searchControl} role="search">
                <label htmlFor="offers-search">Search proposals</label>
                <div>
                  <input
                    defaultValue={search}
                    id="offers-search"
                    name="search"
                    placeholder="e.g. verified civic work under $50 before August 1"
                    type="search"
                  />
                  <button type="submit">Search</button>
                </div>
              </div>

              <div className={densityStyles.activeState}>
                <span>{activeFilterLabels.length ? activeFilterLabels.join(" · ") : "All proposal types"}</span>
                {hasFilters ? <a href={buildLiveHref({})}>Clear all</a> : null}
              </div>
            </div>

            <details className={densityStyles.filterDisclosure}>
              <summary>
                <span>Filter &amp; sort</span>
                <small>{modeLabel} · {sortLabel}</small>
              </summary>
              <div className={densityStyles.filterContent}>
                <label>
                  <span>Proposal type</span>
                  <select defaultValue={mode} name="mode">
                    {MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Sort</span>
                  <select defaultValue={sort} name="sort">
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <button className={densityStyles.filterSubmit} type="submit">Apply filters</button>

                <details className={densityStyles.rankingDisclosure}>
                  <summary>How ranking works</summary>
                  <p>
                    Hard constraints are applied before semantic and trust-aware ranking. Hard
                    constraints → semantic relevance (46%) → evidence quality (20%) → personal
                    cause fit (16%) → deadline urgency (10%) → transaction credit (8%). Explicit
                    sort choices may reorder the surviving set.
                  </p>
                </details>
              </div>
            </details>
          </SmartQueryForm>

          <div
            className={`${densityStyles.resultsStage} mt-directory-view`}
            data-authoritative-directory="true"
            id="directory-results"
          >
            {livePage.error ? (
              <div className={densityStyles.emptyState} data-directory-state="unavailable">
                <h3>Live proposals are temporarily unavailable</h3>
                <p>The directory could not be loaded. No result or open-state conclusion is shown until the live records are available.</p>
                <div><Link className={densityStyles.emptyPrimary} href={currentReturnTo}>Try again</Link></div>
              </div>
            ) : livePage.items.length ? (
              <div className={densityStyles.groupList}>
                {participantGroups.map((group) => (
                  <ParticipantOfferGroup
                    currentReturnTo={currentReturnTo}
                    isAuthenticated={isAuthenticated}
                    key={group.ownerId}
                    offers={group.offers}
                    participantName={group.participantName}
                    savedOfferIds={savedOfferIds}
                    viewerId={viewer?.authUser.id ?? null}
                  />
                ))}
              </div>
            ) : (
              <div className={densityStyles.emptyState} data-directory-state="empty">
                <h3>{hasFilters ? "No live proposals satisfy every hard constraint" : "No live proposals are open"}</h3>
                <p>
                  Unknown budget, deadline, or verification data is not treated as a match. Remove
                  one hard constraint or create a proposal with structured terms.
                </p>
                <div>
                  {hasFilters ? (
                    <Link className={densityStyles.emptyPrimary} href={buildLiveHref({})}>Clear filters</Link>
                  ) : (
                    <Link className={densityStyles.emptyPrimary} href={createHref}>Create the first proposal</Link>
                  )}
                  <Link href="/donate">Fund a public good</Link>
                </div>
              </div>
            )}

            {!livePage.error && (livePage.hasPreviousPage || livePage.hasNextPage) ? (
              <nav className={densityStyles.pagination} aria-label="Live proposal pages">
                {livePage.hasPreviousPage ? (
                  <a href={buildLiveHref({ facets, mode, page: page - 1, search, sort })}>
                    Previous
                  </a>
                ) : <span />}
                <span>Page {page} of {pageCount}</span>
                {livePage.hasNextPage ? (
                  <a href={buildLiveHref({ facets, mode, page: page + 1, search, sort })}>
                    Next
                  </a>
                ) : <span />}
              </nav>
            ) : null}
          </div>

          <section className={densityStyles.otherRoutes} aria-labelledby="other-routes-heading">
            <div>
              <p className={densityStyles.sectionLabel}>Other live routes</p>
              <h2 id="other-routes-heading">Related coordination routes</h2>
            </div>
            <nav aria-label="Related live routes">
              <Link href="/offsets">
                <strong>Donation offsets</strong>
                <span>Opposed donations</span>
              </Link>
              <Link href="/pools">
                <strong>Funding pools</strong>
                <span>Conditional funding</span>
              </Link>
              <Link href="/background-networking">
                <strong>Consent-gated introductions</strong>
                <span>Private matching</span>
              </Link>
            </nav>
          </section>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
