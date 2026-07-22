import Link from "next/link";

import filterStyles from "@/components/discovery/discovery-filters.module.css";
import { ParticipantOfferMenu } from "@/components/marketplace/participant-offer-menu";
import type {
  MarketplaceFamilyMetrics,
  ParticipantOfferFamily,
} from "@/lib/marketplace-offer-families";

import {
  buildLiveHref,
  MODE_OPTIONS,
  type ModeFilter,
} from "./offers-market-data";
import styles from "./offers-market.module.css";

interface OffersMarketDirectoryProps {
  createHref: string;
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
  viewerId?: string;
}

export function OffersMarketDirectory({
  createHref,
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

      <form action="/offers" className={filterStyles.filterPanel} method="get" role="search">
        <input name="view" type="hidden" value="live" />
        <div className={filterStyles.filterGrid}>
          <label className={filterStyles.field}>
            <span>Search the market</span>
            <input
              className={filterStyles.control}
              defaultValue={search}
              name="search"
              placeholder="Cause, action, evidence, or participant"
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
        </div>
        <div className={filterStyles.actions}>
          <button className="button button-primary" type="submit">
            Apply filters
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
              {metrics.participantCount.toLocaleString()} participant(s) · {metrics.offerFamilyCount.toLocaleString()} offer family/families · {metrics.pairingCount.toLocaleString()} pairing(s)
            </strong>
            {search ? <span className={filterStyles.activeChip}>Search: {search}</span> : null}
            {mode !== "all" ? (
              <span className={filterStyles.activeChip}>
                {MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode}
              </span>
            ) : null}
          </div>
          <p className={filterStyles.rankingNote}>
            Participants are ordered by their most recently updated live pairing.
            Pagination applies to people, not generated combinations.
          </p>
        </div>
      </form>

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
                ? "No participant menus match these filters"
                : "No live participant menus are open"}
            </h3>
            <p>
              The marketplace does not substitute examples or demo records when
              participant inventory is empty.
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
                href={buildLiveHref({ mode, page: safePage - 1, search })}
              >
                Previous
              </Link>
            ) : null}
            <span>Page {safePage} of {pageCount}</span>
            {safePage < pageCount ? (
              <Link
                className="button button-secondary button-mini"
                href={buildLiveHref({ mode, page: safePage + 1, search })}
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
