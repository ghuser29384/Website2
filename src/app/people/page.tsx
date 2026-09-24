import type { Metadata } from "next";
import Link from "next/link";

import { toggleFollowAction } from "@/app/actions";
import filterStyles from "@/components/discovery/discovery-filters.module.css";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getFormMessage } from "@/lib/form-state";
import {
  formatPublicProfileLocation,
  getViewer,
  listPublicProfilesPage,
  PEOPLE_PAGE_SIZE,
  type PublicProfileSummary,
} from "@/lib/app-data";
import { listPublicCredibilitySummaries } from "@/lib/credibility-data";
import {
  collectPeopleCauseOptions,
  PEOPLE_DISCOVERY_SORT_OPTIONS,
  PEOPLE_KIND_FILTER_OPTIONS,
  PEOPLE_PARTICIPATION_FILTER_OPTIONS,
  PEOPLE_PAYMENT_FILTER_OPTIONS,
  type PeopleDiscoveryFilters,
  type PeopleDiscoverySort,
  type PeopleKindFilter,
  type PeopleParticipationFilter,
  type PeoplePaymentFilter,
} from "@/lib/discovery-ranking";
import { filterAndRankSmartProfiles } from "@/lib/smart-people-ranking";
import {
  getSmartQueryCauseLabel,
  parseSerializedSmartQueryFacets,
  parseSmartQuery,
} from "@/lib/smart-query";
import { hasSmartQueryConstraints, mergeSmartQueryFacets } from "@/lib/smart-query-facets";
import { loadSmartQueryCausePriorities } from "@/lib/smart-query-personalization";
import { getPublicProfileMetaSummary } from "@/lib/public-profile-trust";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "People",
  description:
    "Find opt-in Moral Trade participants by public work, open offers, stated participation preferences, and reviewed evidence.",
  alternates: {
    canonical: "/people",
  },
  openGraph: {
    title: "People directory",
    description:
      "Find opt-in Moral Trade participants by public work, open offers, stated participation preferences, and reviewed evidence.",
    url: getAbsoluteUrl("/people"),
    type: "website",
  },
};

interface PeoplePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface PeopleFilterState {
  cause: string;
  kind: PeopleKindFilter;
  participation: PeopleParticipationFilter;
  payment: PeoplePaymentFilter;
  sort: PeopleDiscoverySort;
}

const PEOPLE_DISCOVERY_LIMIT = 1_000;

function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeOption<T extends string>(
  value: string,
  options: ReadonlyArray<{ value: T }>,
  fallback: T,
) {
  if (value === "reviewed" && fallback === "match") {
    return "match" as T;
  }
  return options.some((option) => option.value === value) ? (value as T) : fallback;
}

function parsePage(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(rawValue ?? "1", 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    page,
    pageSize,
    hasNextPage: items.length > offset + pageSize,
    hasPreviousPage: page > 1,
  };
}

function buildPeopleHref({
  filters,
  page,
  search,
}: {
  filters: PeopleFilterState;
  page?: number;
  search?: string;
}) {
  const params = new URLSearchParams();

  if (filters.sort !== "match") {
    params.set("sort", filters.sort);
  }
  if (search) {
    params.set("search", search);
  }
  if (filters.cause) {
    params.set("cause", filters.cause);
  }
  if (filters.payment !== "any") {
    params.set("payment", filters.payment);
  }
  if (filters.participation !== "any") {
    params.set("participation", filters.participation);
  }
  if (filters.kind !== "any") {
    params.set("kind", filters.kind);
  }
  if (page && page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/people?${query}` : "/people";
}

function optionLabel<T extends string>(
  value: T,
  options: ReadonlyArray<{ value: T; label: string }>,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function rankingDescription(sort: PeopleDiscoverySort, hasSearch: boolean) {
  if (sort === "offers") {
    return "Most open offers prioritizes currently available proposals, with relevance and recency breaking close results.";
  }
  if (sort === "newest") {
    return "Newest is chronological; relevance and reviewed public activity break close results.";
  }
  if (hasSearch) {
    return "Hard constraints run first. Remaining members are ranked by semantic relevance, reviewed public evidence, stated cause fit, and current offer availability.";
  }
  return "Without a query, Best match uses reviewed public activity, recency, and current offer availability. It does not rank people by a general credibility score.";
}

function formatBadgeType(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
  const resolvedSearchParams = await searchParams;
  const viewer = await getViewer();
  const formMessage = getFormMessage(resolvedSearchParams);
  const page = parsePage(resolvedSearchParams.page);
  const search = readParam(resolvedSearchParams, "search").trim().slice(0, 500);
  const parsedInterpretation = parseSmartQuery(search, { surface: "people" });
  const smartFacets = mergeSmartQueryFacets(
    parsedInterpretation.facets,
    parseSerializedSmartQueryFacets(resolvedSearchParams),
  );
  const requestedGeneralCreditRanking = Boolean(
    readParam(resolvedSearchParams, "credit") ||
      readParam(resolvedSearchParams, "sort") === "credit" ||
      smartFacets.minCredit !== null,
  );
  const peopleFacets = { ...smartFacets, minCredit: null };
  const interpretation = { ...parsedInterpretation, facets: peopleFacets };
  const filters: PeopleFilterState = {
    cause: readParam(resolvedSearchParams, "cause").trim().slice(0, 120),
    payment: normalizeOption(
      readParam(resolvedSearchParams, "payment"),
      PEOPLE_PAYMENT_FILTER_OPTIONS,
      "any",
    ),
    participation: normalizeOption(
      readParam(resolvedSearchParams, "participation"),
      PEOPLE_PARTICIPATION_FILTER_OPTIONS,
      "any",
    ),
    kind: normalizeOption(
      readParam(resolvedSearchParams, "kind"),
      PEOPLE_KIND_FILTER_OPTIONS,
      "any",
    ),
    sort: normalizeOption(
      readParam(resolvedSearchParams, "sort"),
      PEOPLE_DISCOVERY_SORT_OPTIONS,
      "match",
    ),
  };
  const candidatePage = hasSupabaseEnv()
    ? await listPublicProfilesPage(
        "reviewed",
        1,
        PEOPLE_DISCOVERY_LIMIT,
        viewer?.authUser.id,
      )
    : {
        items: [] as PublicProfileSummary[],
        page: 1,
        pageSize: PEOPLE_DISCOVERY_LIMIT,
        hasNextPage: false,
        hasPreviousPage: false,
      };
  const candidates = candidatePage.items.map((profile) => ({
    ...profile,
    publicLocation: formatPublicProfileLocation(profile),
  }));
  const credibilityByProfile = await listPublicCredibilitySummaries(
    candidates.map((profile) => profile.id),
  );
  const discoveryFilters: PeopleDiscoveryFilters = {
    cause: filters.cause,
    credit: "any",
    kind: filters.kind,
    participation: filters.participation,
    payment: filters.payment,
    search,
  };
  const personalPriorities = await loadSmartQueryCausePriorities(viewer?.authUser.id);
  const rankedProfiles = filterAndRankSmartProfiles({
    credibilityByProfile,
    explicitFilters: discoveryFilters,
    interpretation,
    personalPriorities,
    profiles: candidates,
    sort: filters.sort,
  });
  const profilesPage = paginate(rankedProfiles, page, PEOPLE_PAGE_SIZE);
  const profiles = profilesPage.items;
  const causeOptions = collectPeopleCauseOptions(candidates);
  const activeFilterLabels = [
    filters.cause ? `Cause: ${filters.cause}` : null,
    ...smartFacets.causes.map((cause) => `Cause: ${getSmartQueryCauseLabel(cause)}`),
    filters.payment !== "any"
      ? optionLabel(filters.payment, PEOPLE_PAYMENT_FILTER_OPTIONS)
      : null,
    filters.participation !== "any"
      ? optionLabel(filters.participation, PEOPLE_PARTICIPATION_FILTER_OPTIONS)
      : null,
    filters.kind !== "any" ? optionLabel(filters.kind, PEOPLE_KIND_FILTER_OPTIONS) : null,
    peopleFacets.verified === true ? "Reviewed evidence required" : null,
    peopleFacets.verified === false ? "No reviewed evidence" : null,
    peopleFacets.location ? `Location: ${peopleFacets.location}` : null,
  ].filter((label, index, labels): label is string => Boolean(label) && labels.indexOf(label) === index);
  const hasFilters = Boolean(search || activeFilterLabels.length || hasSmartQueryConstraints(peopleFacets));
  const currentHref = buildPeopleHref({ filters, page, search });
  const peopleStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Moral Trade people directory",
    url: getAbsoluteUrl(currentHref),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: profiles.slice(0, 24).map((profile, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: getAbsoluteUrl(`/people/${profile.id}`),
        name: profile.resolvedName,
        description: truncateDescription(
          getPublicProfileMetaSummary(profile, {
            publicLocation: profile.publicLocation,
          }),
          140,
        ),
      })),
    },
  };

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(peopleStructuredData),
        }}
        type="application/ld+json"
      />
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">People directory</p>
            <h1>Find people by what they can offer and what they are open to.</h1>
            <p className="hero-text">
              Search public work, causes, locations, open offers, and explicit participation preferences.
              Reviewed evidence can help you inspect a potential counterparty, but the directory does not
              turn context-specific transaction history into a general ranking of people.
            </p>
            <div className="hero-actions">
              <Link className="button button-secondary" href="/credibility">
                How contextual credibility works
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">How to read a record</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Task constraints first</strong>
                  <p>Cause, location, participation, participant type, and reviewed-evidence requirements are enforced before ranking.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Evidence stays contextual</strong>
                  <p>A general directory does not turn sparse or unrelated transaction history into a universal score.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Availability is explicit</strong>
                  <p>Filter by causes, payment openness, pledge openness, public evidence, and participant type.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {!hasSupabaseEnv() ? (
          <div className="status-banner status-banner-error">
            The public data service is unavailable. Participant search is paused until the
            connection is restored; no fallback ranking is shown.
          </div>
        ) : null}

        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Public directory</p>
            <h2>{hasFilters ? "Matching public members" : "Browse visible members"}</h2>
            <p>
              Search public names, biographies, locations, collective names, broad opt-in causes,
              current offers, and stated participation preferences. Contextual credibility remains
              available on individual profiles for transaction-specific review.
            </p>
          </div>

          <div className="sort-tabs" aria-label="People result ordering">
            {PEOPLE_DISCOVERY_SORT_OPTIONS.map((option) => (
              <Link
                key={option.value}
                className={`sort-tab ${filters.sort === option.value ? "is-active" : ""}`}
                href={buildPeopleHref({
                  filters: { ...filters, sort: option.value },
                  search,
                })}
              >
                {option.label}
              </Link>
            ))}
          </div>

          <form action="/people" className={filterStyles.filterPanel} method="get" role="search">
            {filters.sort !== "match" ? <input name="sort" type="hidden" value={filters.sort} /> : null}
            <div className={`${filterStyles.filterGrid} ${filterStyles.peopleGrid}`}>
              <label className={filterStyles.field}>
                <span>Search members</span>
                <input
                  className={filterStyles.control}
                  defaultValue={search}
                  name="search"
                  placeholder="e.g. verified civic participants in Chicago open to pledges"
                  type="search"
                />
              </label>
              <label className={filterStyles.field}>
                <span>Cause area</span>
                <select className={filterStyles.control} defaultValue={filters.cause} name="cause">
                  <option value="">Any cause area</option>
                  {causeOptions.map((cause) => (
                    <option key={cause} value={cause}>{cause}</option>
                  ))}
                </select>
              </label>
              <label className={filterStyles.field}>
                <span>Payment preference</span>
                <select className={filterStyles.control} defaultValue={filters.payment} name="payment">
                  {PEOPLE_PAYMENT_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className={filterStyles.field}>
                <span>Action and participation</span>
                <select
                  className={filterStyles.control}
                  defaultValue={filters.participation}
                  name="participation"
                >
                  {PEOPLE_PARTICIPATION_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className={filterStyles.field}>
                <span>Participant type</span>
                <select className={filterStyles.control} defaultValue={filters.kind} name="kind">
                  {PEOPLE_KIND_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className={filterStyles.actions}>
              <button className="button button-primary" type="submit">Apply filters</button>
              {hasFilters ? (
                <Link
                  className="button button-secondary"
                  href={buildPeopleHref({
                    filters: {
                      cause: "",
                      kind: "any",
                      participation: "any",
                      payment: "any",
                      sort: filters.sort,
                    },
                  })}
                >
                  Clear filters
                </Link>
              ) : null}
            </div>
            {requestedGeneralCreditRanking ? (
              <p className={filterStyles.rankingNote}>
                General credit sorting and thresholds are not used in the People directory. Open a
                participant&apos;s contextual credibility record when you have a specific transaction role
                and category to evaluate.
              </p>
            ) : null}
            <div className={filterStyles.filterMeta}>
              <div className={filterStyles.activeFilters} aria-live="polite">
                <strong>{rankedProfiles.length} matching member(s)</strong>
                {activeFilterLabels.map((label) => (
                  <span className={filterStyles.activeChip} key={label}>{label}</span>
                ))}
              </div>
              <p className={filterStyles.rankingNote}>
                {rankingDescription(filters.sort, Boolean(search))}
              </p>
            </div>
          </form>

          <div className="directory-grid">
            {profiles.length ? (
              profiles.map((profile) => {
                const credibility = credibilityByProfile.get(profile.id);
                const reviewedEventCount = credibility?.eventCount ?? 0;

                return (
                  <article key={profile.id} className="panel profile-card">
                    <div className="profile-card-head">
                      <div>
                        <p className="detail-kicker">Public profile</p>
                        <h3>{profile.resolvedName}</h3>
                        <p className="route-text">
                          {profile.publicLocation || "Location not listed"}
                        </p>
                      </div>
                      <span className="badge">
                        {profile.wishParticipantKind
                          ? formatBadgeType(profile.wishParticipantKind)
                          : "Public member"}
                      </span>
                    </div>

                    {profile.bio ? <p className="profile-bio">{profile.bio}</p> : null}

                    <div className="profile-preview-block">
                      <p className="detail-kicker">Reviewed transaction evidence</p>
                      <p className="route-text">
                        {reviewedEventCount > 0
                          ? `${reviewedEventCount} reviewed transaction event(s) are available. Their relevance depends on the role and activity you are evaluating.`
                          : "No reviewed transaction history yet. This is an absence of evidence, not a negative score."}
                      </p>
                      {credibility && reviewedEventCount > 0 ? (
                        <div className="tag-row">
                          <span className="source-pill">{credibility.confidence} evidence confidence</span>
                          <span className="source-pill">
                            {credibility.effectiveObservations.toFixed(1)} effective observation(s)
                          </span>
                        </div>
                      ) : null}
                      <Link className="text-button" href={`/people/${profile.id}/credibility`}>
                        View contextual credibility details
                      </Link>
                    </div>

                    {profile.wishPreview || profile.wishCauses.length ? (
                      <div className="profile-preview-block">
                        <p className="detail-kicker">Published interests and availability</p>
                        <p className="route-text">
                          {profile.wishPreview || "Broad interests shared; exact wishes remain private."}
                        </p>
                        <div className="tag-row">
                          {profile.wishCauses.slice(0, 3).map((cause) => (
                            <span className="source-pill" key={`${profile.id}-${cause}`}>
                              {cause}
                            </span>
                          ))}
                          {profile.wishOpenToPayment ? (
                            <span className="impact-pill">Open to payment</span>
                          ) : null}
                          {profile.wishOpenToPledges ? (
                            <span className="impact-pill">Open to pledges</span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="tag-row" aria-label="Visible trust signals">
                      {profile.verificationBadges.slice(0, 3).map((badge) => (
                        <span className="impact-pill" key={badge.id}>
                          {formatBadgeType(badge.badge_type)}
                        </span>
                      ))}
                      {profile.offerCount > 0 ? (
                        <span className="source-pill">{profile.offerCount} open offer(s)</span>
                      ) : null}
                      {profile.ratingCount > 0 ? (
                        <span className="source-pill">
                          {profile.ratingCount} secondary reviewed rating(s)
                        </span>
                      ) : null}
                      {!profile.verificationBadges.length &&
                      profile.offerCount === 0 &&
                      profile.ratingCount === 0 &&
                      !profile.wishPreview &&
                      !profile.wishCauses.length ? (
                        <span className="badge badge-secondary">No reviewed public record yet</span>
                      ) : null}
                    </div>

                    <div className="offer-footer">
                      <div className="tag-row">
                        {profile.offerCount > 0 ? (
                          <span>{profile.offerCount} current offer(s)</span>
                        ) : (
                          <span>No current public offer</span>
                        )}
                        {profile.verificationBadges.length ? (
                          <span>{profile.verificationBadges.length} reviewed badge(s)</span>
                        ) : null}
                      </div>
                      <div className="offer-actions">
                        <Link className="text-button" href={`/people/${profile.id}`}>
                          View public profile
                        </Link>
                        {viewer && viewer.authUser.id !== profile.id ? (
                          <form action={toggleFollowAction}>
                            <input name="profile_id" type="hidden" value={profile.id} />
                            <input name="return_to" type="hidden" value={currentHref} />
                            <button className="button button-secondary button-mini" type="submit">
                              {profile.isFollowedByViewer ? "Following" : "Follow"}
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty-state">
                <div>
                  <strong>
                    {hasFilters
                      ? "No public member records match the current search and filters."
                      : "Public member records will appear after participants publish offers or opt into public profiles."}
                  </strong>
                  <p>
                    {hasFilters
                      ? "Broaden the cause, participation, payment, or participant-type filters. Only opt-in public profile fields are searchable."
                      : "New participants can publish offers or opt into broad public availability without receiving a context-free score."}
                  </p>
                  <div className="hero-actions">
                    {hasFilters ? (
                      <Link
                        className="button button-secondary"
                        href={buildPeopleHref({
                          filters: {
                            cause: "",
                                  kind: "any",
                            participation: "any",
                            payment: "any",
                            sort: filters.sort,
                          },
                        })}
                      >
                        Clear filters
                      </Link>
                    ) : (
                      <Link className="button button-secondary" href="/worked-examples">
                        View worked examples
                      </Link>
                    )}
                    <Link className="button button-primary" href={viewer ? "/dashboard" : "/signup"}>
                      {viewer ? "Open dashboard" : "Create account"}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {profilesPage.hasPreviousPage || profilesPage.hasNextPage ? (
            <div className="offer-actions">
              {profilesPage.hasPreviousPage ? (
                <Link
                  className="button button-secondary"
                  href={buildPeopleHref({ filters, page: profilesPage.page - 1, search })}
                >
                  Previous page
                </Link>
              ) : (
                <span />
              )}

              {profilesPage.hasNextPage ? (
                <Link
                  className="button button-secondary"
                  href={buildPeopleHref({ filters, page: profilesPage.page + 1, search })}
                >
                  Next page
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
