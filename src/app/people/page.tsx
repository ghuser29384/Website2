import type { Metadata } from "next";
import Link from "next/link";

import { toggleFollowAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getFormMessage } from "@/lib/form-state";
import { getViewer, listPublicProfiles, type PeopleSort } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "People",
};

const SORT_OPTIONS: Array<{ value: PeopleSort; label: string }> = [
  { value: "rating", label: "User rating" },
  { value: "followers", label: "Followers" },
  { value: "karma", label: "Karma" },
  { value: "comments", label: "Comments" },
];

interface PeoplePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function normalizeSort(value: string | undefined): PeopleSort {
  if (value === "followers" || value === "karma" || value === "comments") {
    return value;
  }

  return "rating";
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
  const profiles = hasSupabaseEnv()
    ? await listPublicProfiles(sort, viewer?.authUser.id)
    : [];

  return (
    <div className="page-shell">
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
            <h1>Public member records and visible reputation signals.</h1>
            <p className="hero-text">
              Profiles are publicly viewable, sortable, and linked to offers, comments, followers,
              ratings, and karma. The goal is public accountability, not social-feed growth.
            </p>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Directory sorting</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>User rating</strong>
                  <p>Average transaction ratings received across past agreements.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Followers, karma, comments</strong>
                  <p>Alternative views for social proof, writing activity, and public responses.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
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
              Sorting emphasizes public record signals rather than trending or activity-ranking
              mechanics.
            </p>
          </div>

          <div className="sort-tabs">
            {SORT_OPTIONS.map((option) => (
              <Link
                key={option.value}
                className={`sort-tab ${sort === option.value ? "is-active" : ""}`}
                href={`/people?sort=${option.value}`}
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
                        {[profile.city, profile.region].filter(Boolean).join(", ") || "Location not listed"}
                      </p>
                    </div>
                    <span className="badge">
                      {profile.rating ? `${profile.rating.toFixed(1)}/10` : "No rating yet"}
                    </span>
                  </div>

                  <p className="profile-bio">
                    {profile.bio || "No public bio has been added yet."}
                  </p>

                  <dl className="profile-stats">
                    <div>
                      <dt>Followers</dt>
                      <dd>{profile.followerCount}</dd>
                    </div>
                    <div>
                      <dt>Karma</dt>
                      <dd>{profile.karma}</dd>
                    </div>
                    <div>
                      <dt>Comments</dt>
                      <dd>{profile.commentCount}</dd>
                    </div>
                    <div>
                      <dt>Open offers</dt>
                      <dd>{profile.offerCount}</dd>
                    </div>
                  </dl>

                  <div className="offer-footer">
                    <div className="tag-row">
                      <span>{profile.ratingCount} rating(s)</span>
                    </div>
                    <div className="offer-actions">
                      <Link className="text-button" href={`/people/${profile.id}`}>
                        View profile
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
                  <strong>No public profiles are available yet.</strong>
                  <p>Profiles will appear here once members sign up and the database is live.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
