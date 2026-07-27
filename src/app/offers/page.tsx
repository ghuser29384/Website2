import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { TradeTemplateLibrary } from "@/components/trade-templates/trade-template-library";
import { getViewer, OFFERS_PAGE_SIZE } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getNextMarketplaceClearingRound } from "@/lib/marketplace-clearing-round";
import {
  buildParticipantOfferFamilies,
  getMarketplaceFamilyMetrics,
} from "@/lib/marketplace-offer-families";
import {
  getSmartQueryCauseLabel,
  parseSerializedSmartQueryFacets,
  parseSmartQuery,
} from "@/lib/smart-query";
import {
  hasSmartQueryConstraints,
  mergeSmartQueryFacets,
} from "@/lib/smart-query-facets";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import {
  buildLiveHref,
  formatMoneyConstraint,
  listLiveOffers,
  listSavedOfferIds,
  loadPersonalCausePriorities,
  normalizeSearch,
  parseMode,
  parsePage,
  parseSort,
  readParam,
} from "./offers-market-data";
import { OffersMarketDirectory } from "./offers-market-directory";
import { OffersMarketIntro } from "./offers-market-intro";
import { OffersMarketSecondarySections } from "./offers-market-secondary";

const LIVE_METADATA: Metadata = {
  title: "Explore live participant offer menus",
  description:
    "Explore live Moral Trade participants, construct an available pairing, and propose a match or counteroffer with explicit terms and evidence boundaries.",
  alternates: { canonical: "/offers?view=live" },
  openGraph: {
    title: "Explore the live Moral Trade marketplace",
    description:
      "Browse participant-level offer menus, select an actual available pairing, and enter the weekly operator-assisted clearing round.",
    url: getAbsoluteUrl("/offers?view=live"),
    type: "website",
  },
};

interface OffersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: OffersPageProps): Promise<Metadata> {
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

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const resolvedSearchParams = await searchParams;
  const view = readParam(resolvedSearchParams, "view");
  const legacyTab = readParam(resolvedSearchParams, "tab");

  if (view === "templates" || legacyTab === "templates") {
    return <TradeTemplateLibrary />;
  }

  const requestedPage = parsePage(resolvedSearchParams.page);
  const search = normalizeSearch(readParam(resolvedSearchParams, "search"));
  const mode = parseMode(readParam(resolvedSearchParams, "mode"));
  const parsedInterpretation = parseSmartQuery(search, { surface: "offers" });
  const explicitFacets = parseSerializedSmartQueryFacets(resolvedSearchParams);
  const facets = mergeSmartQueryFacets(parsedInterpretation.facets, explicitFacets);
  const hasSmartQuery = Boolean(search || hasSmartQueryConstraints(facets));
  const sort = parseSort(
    readParam(resolvedSearchParams, "sort") || facets.sort || "",
    hasSmartQuery,
  );
  const smartSearch = hasSmartQuery || sort !== "newest";
  const viewer = await getViewer();
  const personalPriorities = await loadPersonalCausePriorities(
    viewer?.authUser.id ?? null,
  );
  const liveResult = await listLiveOffers({
    facets,
    interpretation: parsedInterpretation,
    mode,
    personalPriorities,
    smartSearch,
    sort,
  });
  const isAuthenticated = Boolean(viewer);
  const formMessage = getFormMessage(resolvedSearchParams);
  const createHref = isAuthenticated ? "/create" : "/signup?returnTo=/create";
  const activeConstraintLabels = [
    ...facets.causes.map((cause) => `Cause: ${getSmartQueryCauseLabel(cause)}`),
    facets.verified === true
      ? "Verified only"
      : facets.verified === false
        ? "Unverified only"
        : null,
    formatMoneyConstraint(facets),
    facets.deadlineBefore
      ? `${facets.deadlineBeforeInclusive ? "By" : "Before"} ${facets.deadlineBefore}`
      : null,
    facets.minCredit !== null ? `Credit ≥ ${facets.minCredit}` : null,
  ].filter((label): label is string => Boolean(label));
  const hasFilters = Boolean(
    search || mode !== "all" || activeConstraintLabels.length || sort !== "newest",
  );
  const families = buildParticipantOfferFamilies(liveResult.items, {
    preserveInputOrder: true,
  });
  const metrics = getMarketplaceFamilyMetrics(families);
  const pageCount = Math.max(1, Math.ceil(families.length / OFFERS_PAGE_SIZE));
  const safePage = Math.min(requestedPage, pageCount);
  const pageOffset = (safePage - 1) * OFFERS_PAGE_SIZE;
  const pageFamilies = families.slice(
    pageOffset,
    pageOffset + OFFERS_PAGE_SIZE,
  );
  const returnTo = buildLiveHref({
    facets,
    mode,
    page: safePage,
    search,
    sort,
  });
  const savedOfferIds = await listSavedOfferIds(viewer?.authUser.id);

  return (
    <div className="page-shell marketplace-product-shell">
      <div className="mt-beta-strip">
        <span>Weekly clearinghouse</span>
        <span>Thursday 17:00 UTC cutoff · consent-based Monday introductions</span>
        <Link href="/status">Operational status</Link>
      </div>

      <header>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
        />
      </header>

      <main className="mt-product-main" id="main-content" tabIndex={-1}>
        <OffersMarketIntro
          clearingRound={getNextMarketplaceClearingRound()}
          createHref={createHref}
          error={liveResult.error}
          formMessage={formMessage}
          metrics={metrics}
        />
        <OffersMarketDirectory
          activeConstraintLabels={activeConstraintLabels}
          candidateLimitReached={liveResult.candidateLimitReached}
          createHref={createHref}
          facets={facets}
          hasFilters={hasFilters}
          isAuthenticated={isAuthenticated}
          metrics={metrics}
          mode={mode}
          pageCount={pageCount}
          pageFamilies={pageFamilies}
          returnTo={returnTo}
          safePage={safePage}
          savedOfferIds={savedOfferIds}
          search={search}
          sort={sort}
          viewerId={viewer?.authUser.id}
        />
        <OffersMarketSecondarySections />
      </main>

      <SiteFooter />
    </div>
  );
}
