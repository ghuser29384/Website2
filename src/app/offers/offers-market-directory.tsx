import Link from "next/link";

import filterStyles from "@/components/discovery/discovery-filters.module.css";
import { ParticipantOfferMenu } from "@/components/marketplace/participant-offer-menu";
import { SmartQueryForm } from "@/components/search/smart-query-form";
import type {
  MarketplaceFamilyMetrics,
  ParticipantOfferFamily,
} from "@/lib/marketplace-offer-families";
import type { SmartQueryFacets } from "@/lib/smart-query";

import {
  buildLiveHref,
  MODE_OPTIONS,
  SMART_OFFER_CANDIDATE_LIMIT,
  SORT_OPTIONS,
  type ModeFilter,
  type OfferSort,
} from "./offers-market-data";
import styles from "./offers-market.module.css";

interface OffersMarketDirectoryProps {
  activeConstraintLabels: string[];
  candidateLimitReached: boolean;
  createHref: string;
  facets: SmartQueryFacets;
  hasFilters: boolean;
  isAuthenticated: boolean;
  metrics: MarketplaceFamilyMetrics;
  mode: ModeFilter;
  pageCount: number;
  pageFamilies: ParticipantOfferFamily[];
  returnTo: string;
  safePage: number;
  savedOfferIds: string[];
  search: string;
  sort: OfferSort;
  viewerId?: string;
}

export function OffersMarketDirectory({
  activeConstraintLabels,
  candidateLimitReached,
  createHref,
  facets,
  hasFilters,
  isAuthenticated,
  metrics,
  mode,
  pageCount,
  pageFamilies,
  returnTo,
  safePage,
  savedOfferIds,
  search,
  sort,
  viewerId,
}: OffersMarketDirectoryProps) {
  return (
    <section className="mt-product-section is-white" aria-labelledby="directory-heading">
      <div className="mt-product-section-head">
        <div>
          <p className="mt-product-kicker">Participant menus</p>
          <h2 id="directory-heading">Choose an available route</h2>
        </div>
        <p>
          Each card represents one participant. Its controls reveal only pairings that
          are backed by a live proposal record.
        </p>
      </div>

      <SmartQueryForm
        action="/offers"
        className={filterStyles.filterPanel}
        method="get"
        queryName="search"
        surface="offers"
      >
        <input name="view" type="hidden" value="live" />
        <div className={filterStyles.filterGrid}>
          <label className={filterStyles.field}>
            <span>Search the market</span>
            <input
              className={filterStyles.control}
              defaultValue={search}
              name="search"
              placeholder="e.g. verified animal-welfare work under $50 before August 1"
              type="search"
            />
          </label>
          <label className={filterStyles.field}>
            <span>Proposal type</span>
            <select className={filterStyles.control} defaultValue={mode} name="mode">
              {MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={filterStyles.field}>
            <span>Sort</span>
            <select className={filterStyles.control} defaultValue={sort} name="sort">
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={filterStyles.actions}>
          <button className="button button-primary" type="submit">
            Apply smart search
          </button>
          {hasFilters ? (
            <Link className="button button-secondary" href={buildLiveHref({})}>
              Clear all
            </Link>
          ) : null}
        </div>
        <div className={filterStyles.filterMeta}>
          <div className={filterStyles.activeFilters} aria-live="polite">
            <strong>
              {metrics.participantCount.toLocaleString()} participant(s) ·{" "}
              {metrics.offerFamilyCount.toLocaleString()} offer family/families ·{" "}
              {metrics.pairingCount.toLocaleString()} pairing(s)
            </strong>
            {search ? (
              <span className={filterStyles.activeChip}>Query: {search}</span>
            ) : null}
            {mode !== "all" ? (
              <span className={filterStyles.activeChip}>
                {MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode}
              </span>
            ) : null}
            {activeConstraintLabels.map((label) => (
              <span className={filterStyles.activeChip} key={label}>
                {label}
              </span>
            ))}
          </div>
          <p className={filterStyles.rankingNote}>
            Hard constraints are applied before semantic relevance, evidence quality,
            saved cause priorities, deadline urgency, and a bounded transaction-credit signal.
            Pagination applies to participants rather than generated pairings.
          </p>
        </div>
      </SmartQueryForm>

      {candidateLimitReached ? (
        <div className="status-banner" role="status">
          This result set was ranked from the newest{" "}
          {SMART_OFFER_CANDIDATE_LIMIT.toLocaleString()} live proposals. Tighten the
          cause, budget, deadline, or evidence requirement to narrow a larger registry.
        </div>
      ) : null}

      <div className="mt-directory-view">
        {pageFamilies.length ? (
          <div className={styles.familyGrid}>
            {pageFamilies.map((family) => (
              <ParticipantOfferMenu
                family={family}
                isAuthenticated={isAuthenticated}
                key={family.participantKey}
                returnTo={returnTo}
                savedOfferIds={savedOfferIds}
                viewerId={viewerId}
              />
            ))}
          </div>
        ) : (
          <div className="panel empty-state">
            <h3>
              {hasFilters
                ? "No participant menus satisfy every hard constraint"
                : "No live participant menus are open"}
            </h3>
            <p>
              Unknown budget, deadline, or verification data is not treated as a match.
              The marketplace does not substitute examples or demo records for live demand.
            </p>
            <div className="hero-actions">
              {hasFilters ? (
                <Link className="button button-primary" href={buildLiveHref({})}>
                  Clear filters
                </Link>
              ) : (
                <Link className="button button-primary" href={createHref}>
                  Create the first proposal
                </Link>
              )}
              <Link className="button button-secondary" href="/worked-examples">
                View worked examples
              </Link>
            </div>
          </div>
        )}

        {pageCount > 1 ? (
          <nav className="pagination" aria-label="Participant menu pages">
            {safePage > 1 ? (
              <Link
                className="button button-secondary button-mini"
                href={buildLiveHref({
                  facets,
                  mode,
                  page: safePage - 1,
                  search,
                  sort,
                })}
              >
                Previous
              </Link>
            ) : null}
            <span>Page {safePage} of {pageCount}</span>
            {safePage < pageCount ? (
              <Link
                className="button button-secondary button-mini"
                href={buildLiveHref({
                  facets,
                  mode,
                  page: safePage + 1,
                  search,
                  sort,
                })}
              >
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </section>
  );
}
