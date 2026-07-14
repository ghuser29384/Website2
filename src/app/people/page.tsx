import type { Metadata } from "next";
import Link from "next/link";

import { toggleFollowAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getFormMessage } from "@/lib/form-state";
import {
  formatPublicProfileLocation,
  getViewer,
  listPublicProfilesPage,
  PEOPLE_PAGE_SIZE,
  type PeopleSort,
} from "@/lib/app-data";
import { listPublicCredibilitySummaries } from "@/lib/credibility-data";
import { getPublicProfileMetaSummary } from "@/lib/public-profile-trust";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "People",
  description:
    "Browse opt-in Moral Trade member records with contextual credibility, reviewed evidence, open offers, and explicit uncertainty.",
  alternates: {
    canonical: "/people",
  },
  openGraph: {
    title: "People directory",
    description:
      "Browse opt-in Moral Trade member profiles, contextual reliability, reviewed proof, and public offers.",
    url: getAbsoluteUrl("/people"),
    type: "website",
  },
};

const SORT_OPTIONS: Array<{ value: PeopleSort; label: string }> = [
  { value: "reviewed", label: "Reviewed records" },
  { value: "offers", label: "Open offers" },
  { value: "newest", label: "Newest opt-ins" },
];

interface PeoplePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function normalizeSort(value: string | undefined): PeopleSort {
  if (value === "offers" || value === "newest") {
    return value;
  }

  return "reviewed";
}

function parsePage(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(rawValue ?? "1", 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function buildPeopleHref(sort: PeopleSort, page: number) {
  if (sort === "reviewed" && page === 1) {
    return "/people";
  }

  return page === 1 ? `/people?sort=${sort}` : `/people?sort=${sort}&page=${page}`;
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
  const sort = normalizeSort(
    Array.isArray(resolvedSearchParams.sort)
      ? resolvedSearchParams.sort[0]
      : resolvedSearchParams.sort,
  );
  const page = parsePage(resolvedSearchParams.page);
  const profilesPage = hasSupabaseEnv()
    ? await listPublicProfilesPage(sort, page, PEOPLE_PAGE_SIZE, viewer?.authUser.id)
    : { items: [], page, pageSize: PEOPLE_PAGE_SIZE, hasNextPage: false, hasPreviousPage: page > 1 };
  const profiles = profilesPage.items;
  const credibilityByProfile = await listPublicCredibilitySummaries(
    profiles.map((profile) => profile.id),
  );
  const peopleStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Moral Trade people directory",
    url: getAbsoluteUrl(
      `/people${
        sort === "reviewed" && page === 1
          ? ""
          : `?sort=${sort}${page === 1 ? "" : `&page=${page}`}`
      }`,
    ),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: profiles.slice(0, 24).map((profile, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: getAbsoluteUrl(`/people/${profile.id}`),
        name: profile.resolvedName,
        description: truncateDescription(
          getPublicProfileMetaSummary(profile, {
            publicLocation: formatPublicProfileLocation(profile),
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
            <h1>Public records with contextual reliability and explicit uncertainty.</h1>
            <p className="hero-text">
              Public profiles appear after participants publish offers or explicitly opt into
              visibility. Credibility estimates predict transaction performance by role and trade
              class; they do not rank moral views, popularity, wealth, or perceived virtue.
            </p>
            <div className="hero-actions">
              <Link className="button button-secondary" href="/credibility">
                How credibility is calculated
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">How to read a record</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Context first</strong>
                  <p>Donation, payment, verification, and behavioural commitments remain distinct.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Uncertainty stays visible</strong>
                  <p>New participants are labelled Unproven rather than assigned a misleading number.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Ratings are secondary</strong>
                  <p>Objective reviewed events drive credibility; free-form ratings provide context only.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {!hasSupabaseEnv() ? (
          <div className="status-banner status-banner-error">
            The public data service is unavailable. Credibility fails closed to Unproven until the
            connection is restored.
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
            <h2>Browse visible members</h2>
            <p>
              Sorting still prioritizes reviewed public records, open offers, and recent opt-ins.
              Credibility is used to choose safeguards, not to create a follower-driven social rank.
            </p>
          </div>

          <div className="sort-tabs">
            {SORT_OPTIONS.map((option) => (
              <Link
                key={option.value}
                className={`sort-tab ${sort === option.value ? "is-active" : ""}`}
                href={buildPeopleHref(option.value, 1)}
              >
                {option.label}
              </Link>
            ))}
          </div>

          <div className="directory-grid">
            {profiles.length ? (
              profiles.map((profile) => {
                const credibility = credibilityByProfile.get(profile.id);

                return (
                  <article key={profile.id} className="panel profile-card">
                    <div className="profile-card-head">
                      <div>
                        <p className="detail-kicker">Public profile</p>
                        <h3>{profile.resolvedName}</h3>
                        <p className="route-text">
                          {formatPublicProfileLocation(profile) || "Location not listed"}
                        </p>
                      </div>
                      <span className="badge">
                        {credibility?.score !== null && credibility?.score !== undefined
                          ? `${credibility.score}/100 · ${credibility.level}`
                          : credibility?.level ?? "Unproven"}
                      </span>
                    </div>

                    {profile.bio ? <p className="profile-bio">{profile.bio}</p> : null}

                    {credibility ? (
                      <div className="profile-preview-block">
                        <p className="detail-kicker">Contextual credibility</p>
                        <p className="route-text">{credibility.explanation}</p>
                        <div className="tag-row">
                          <span className="source-pill">{credibility.confidence} confidence</span>
                          <span className="source-pill">
                            {credibility.effectiveObservations.toFixed(1)} effective observation(s)
                          </span>
                          {credibility.estimatedProbability !== null ? (
                            <span className="impact-pill">
                              {Math.round(credibility.estimatedProbability * 100)}% estimated completion
                            </span>
                          ) : null}
                        </div>
                        <Link className="text-button" href={`/people/${profile.id}/credibility`}>
                          Open credibility passport
                        </Link>
                      </div>
                    ) : null}

                    {profile.wishPreview || profile.wishCauses.length ? (
                      <div className="profile-preview-block">
                        <p className="detail-kicker">Wish preview</p>
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
                        <span>{credibility?.level ?? "Unproven"}</span>
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
                            <input name="return_to" type="hidden" value={`/people?sort=${sort}`} />
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
                    Public member records will appear after participants publish offers or opt into
                    public profiles.
                  </strong>
                  <p>
                    New participants begin as Unproven and can build a record through small,
                    reviewable commitments with independent evidence.
                  </p>
                  <div className="hero-actions">
                    <Link className="button button-secondary" href="/worked-examples">
                      View worked examples
                    </Link>
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
                  href={buildPeopleHref(sort, profilesPage.page - 1)}
                >
                  Previous page
                </Link>
              ) : (
                <span />
              )}

              {profilesPage.hasNextPage ? (
                <Link
                  className="button button-secondary"
                  href={buildPeopleHref(sort, profilesPage.page + 1)}
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
