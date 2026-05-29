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
import { getPublicProfileMetaSummary } from "@/lib/public-profile-trust";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "People",
  description:
    "Browse opt-in public Moral Trade member records once participants publish offers or choose public profile visibility.",
  alternates: {
    canonical: "/people",
  },
  openGraph: {
    title: "People directory",
    description:
      "Browse opt-in Moral Trade member profiles, reviewed proof badges, public offers, and broad wish previews.",
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
            <h1>Public member records with reviewable signals.</h1>
            <p className="hero-text">
              Public profiles appear after participants publish offers or explicitly opt into
              visibility. The goal is accountability around reviewable trades, not follower,
              karma, or comment leaderboards.
            </p>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Record sorting</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Reviewed records</strong>
                  <p>Ratings and proof badges matter only after there is a reviewable record.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Visible signals only</strong>
                  <p>Empty social counters are hidden until they carry real trust value.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {!hasSupabaseEnv() ? (
          <div className="status-banner status-banner-error">
            Supabase is not configured yet. Add environment variables and apply the SQL schema
            before using the people directory.
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
            <h2>Browse all visible members</h2>
            <p>
              Sorting emphasizes reviewed records, open offers, and recent opt-ins rather than
              social counters. Empty follower, karma, and comment metrics stay hidden until they
              carry real trust value.
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
              profiles.map((profile) => (
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
                      {profile.ratingCount
                        ? `${(profile.rating ?? 0).toFixed(1)}/10 reviewed`
                        : profile.verificationBadges.length
                          ? "Reviewed proof"
                          : "Pilot profile"}
                    </span>
                  </div>

                  {profile.bio ? <p className="profile-bio">{profile.bio}</p> : null}

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
                      <span className="source-pill">{profile.ratingCount} reviewed rating(s)</span>
                    ) : null}
                    {profile.wishPreview || profile.wishCauses.length ? (
                      <span className="source-pill">Broad wish preview visible</span>
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
                      {profile.verificationBadges.length ? (
                        <span>{profile.verificationBadges.length} reviewed badge(s)</span>
                      ) : profile.ratingCount ? (
                        <span>{profile.ratingCount} rating(s)</span>
                      ) : (
                        <span>Opt-in profile</span>
                      )}
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
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>Public member records will appear after participants publish offers or opt into public profiles.</strong>
                  <p>
                    Until then, browse worked examples in the proposal registry or create an account to
                    control your profile privacy before publishing.
                  </p>
                  <div className="hero-actions">
                    <Link className="button button-secondary" href="/offers?view=examples">
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
                <Link className="button button-secondary" href={buildPeopleHref(sort, profilesPage.page - 1)}>
                  Previous page
                </Link>
              ) : (
                <span />
              )}

              {profilesPage.hasNextPage ? (
                <Link className="button button-secondary" href={buildPeopleHref(sort, profilesPage.page + 1)}>
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
