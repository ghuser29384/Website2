import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addOfferRecommendationAction,
  removeOfferRecommendationAction,
  toggleFollowAction,
  updateProfileAction,
} from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  getFormMessage,
} from "@/lib/form-state";
import {
  getPublicProfilePageData,
  getViewer,
  listRecommendableOffers,
} from "@/lib/app-data";
import { formatMode } from "@/lib/offers";
import { getPrimaryNavLinks } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

interface ProfilePageProps {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { profileId } = await params;

  if (!hasSupabaseEnv()) {
    return {
      title: "Profile",
    };
  }

  const data = await getPublicProfilePageData(profileId);

  return {
    title: data.profile ? data.profile.resolvedName : "Profile",
  };
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { profileId } = await params;
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const viewer = await getViewer();
  const data = hasSupabaseEnv()
    ? await getPublicProfilePageData(profileId, viewer?.authUser.id)
    : {
        profile: null,
        offers: [],
        profileRecommendations: [],
        authoredCommentCount: 0,
      };

  if (!data.profile) {
    notFound();
  }

  const isOwnProfile = viewer?.authUser.id === data.profile.id;
  const recommendableOffers =
    viewer && isOwnProfile ? await listRecommendableOffers(viewer.authUser.id) : [];

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          authLink={
            viewer
              ? { href: "/dashboard", label: "Dashboard" }
              : { href: "/login", label: "Log in" }
          }
          primaryAction={{
            href: viewer ? "/offers/new" : "/signup",
            label: viewer ? "Create offer" : "Sign up",
          }}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Public member record</p>
            <h1>{data.profile.resolvedName}</h1>
            <p className="hero-text">
              {[data.profile.city, data.profile.region].filter(Boolean).join(", ") || "Location not listed"}.
              {" "}
              This public profile aggregates open offers, transaction ratings, followers, karma, and
              public recommendations.
            </p>
            {!isOwnProfile && viewer ? (
              <div className="hero-actions">
                <form action={toggleFollowAction}>
                  <input name="profile_id" type="hidden" value={data.profile.id} />
                  <input name="return_to" type="hidden" value={`/people/${data.profile.id}`} />
                  <button className="button button-primary" type="submit">
                    {data.profile.isFollowedByViewer ? "Following" : "Follow member"}
                  </button>
                </form>
              </div>
            ) : null}
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Public reputation summary</p>
            <dl className="profile-stats profile-stats-hero">
              <div>
                <dt>Rating</dt>
                <dd>{data.profile.rating ? `${data.profile.rating.toFixed(1)}/10` : "None yet"}</dd>
              </div>
              <div>
                <dt>Followers</dt>
                <dd>{data.profile.followerCount}</dd>
              </div>
              <div>
                <dt>Karma</dt>
                <dd>{data.profile.karma}</dd>
              </div>
              <div>
                <dt>Comments</dt>
                <dd>{data.authoredCommentCount}</dd>
              </div>
            </dl>
            <p className="route-text">
              {data.profile.bio || "No public bio has been added yet."}
            </p>
          </aside>
        </div>
      </header>

      <main>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        {isOwnProfile ? (
          <section className="section section-white">
            <div className="section-head">
              <p className="eyebrow">Profile settings</p>
              <h2>Edit your public profile</h2>
              <p>
                City, region, display name, and bio are shown publicly in the member directory and
                on offer pages.
              </p>
            </div>

            <form action={updateProfileAction} className="stack-form profile-edit-form">
              <input name="return_to" type="hidden" value={`/people/${data.profile.id}`} />
              <div className="field-grid">
                <label className="field">
                  <span>Display name</span>
                  <input
                    defaultValue={data.profile.display_name ?? ""}
                    name="display_name"
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>City</span>
                  <input defaultValue={data.profile.city ?? ""} name="city" type="text" />
                </label>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Region</span>
                  <input defaultValue={data.profile.region ?? ""} name="region" type="text" />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input defaultValue={data.profile.email} disabled type="email" />
                </label>
              </div>
              <label className="field">
                <span>Bio</span>
                <textarea
                  defaultValue={data.profile.bio}
                  name="bio"
                  rows={4}
                  placeholder="Describe your priorities, verification norms, or typical offers."
                />
              </label>
              <div className="form-actions">
                <button className="button button-primary" type="submit">
                  Save profile
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Open offers</p>
            <h2>Public commitments from this member</h2>
          </div>

          <div className="data-grid">
            {data.offers.length ? (
              data.offers.map((offer) => (
                <article key={offer.id} className="panel data-card">
                  <p className="detail-kicker">{formatMode(offer.mode)}</p>
                  <h3>{offer.offered_cause} for {offer.requested_cause}</h3>
                  <p className="route-text">{offer.offer_action}</p>
                  <div className="tag-row">
                    <span className="badge">{offer.status}</span>
                    <span className="impact-pill">{offer.commentCount} comments</span>
                    <span className="impact-pill">{offer.recommendationCount} recommendations</span>
                  </div>
                  <div className="offer-footer">
                    <div className="tag-row">
                      <span>{offer.verification}</span>
                      <span>{offer.duration}</span>
                    </div>
                    <div className="offer-actions">
                      <Link className="text-button" href={`/offers/${offer.id}`}>
                        View offer
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No open offers are visible for this member.</strong>
                  <p>Published commitments will appear here once offers are posted publicly.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Profile recommendations</p>
            <h2>Offers this member recommends</h2>
            <p>
              Members can recommend other users&apos; offers from their own profile page as a public
              signal of trust or shared priority.
            </p>
          </div>

          {isOwnProfile ? (
            <form action={addOfferRecommendationAction} className="stack-form recommendation-form">
              <input name="profile_page_id" type="hidden" value={data.profile.id} />
              <input name="return_to" type="hidden" value={`/people/${data.profile.id}`} />
              <label className="field">
                <span>Recommend another user&apos;s offer</span>
                <select defaultValue="" name="recommended_offer_id">
                  <option disabled value="">
                    Select an offer
                  </option>
                  {recommendableOffers.map((offer) => (
                    <option key={offer.id} value={offer.id}>
                      {offer.ownerProfile?.resolvedName ?? offer.owner_alias}: {offer.offered_cause} for{" "}
                      {offer.requested_cause}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-actions">
                <button className="button button-secondary" type="submit">
                  Publish recommendation
                </button>
              </div>
            </form>
          ) : null}

          <div className="data-grid">
            {data.profileRecommendations.length ? (
              data.profileRecommendations.map((recommendation) =>
                recommendation.recommendedOffer ? (
                  <article key={recommendation.id} className="panel data-card">
                    <p className="detail-kicker">Recommended offer</p>
                    <h3>
                      {recommendation.recommendedOffer.offered_cause} for{" "}
                      {recommendation.recommendedOffer.requested_cause}
                    </h3>
                    <p className="route-text">{recommendation.recommendedOffer.offer_action}</p>
                    <div className="tag-row">
                      <span className="source-pill">
                        {recommendation.recommendedOffer.ownerProfile?.resolvedName ??
                          recommendation.recommendedOffer.owner_alias}
                      </span>
                      <span className="impact-pill">
                        {recommendation.recommendedOffer.recommendationCount} recommendations
                      </span>
                    </div>
                    <div className="offer-footer">
                      <div className="offer-actions">
                        <Link
                          className="text-button"
                          href={`/offers/${recommendation.recommendedOffer.id}`}
                        >
                          View offer
                        </Link>
                        {isOwnProfile ? (
                          <form action={removeOfferRecommendationAction}>
                            <input name="recommendation_id" type="hidden" value={recommendation.id} />
                            <input
                              name="return_to"
                              type="hidden"
                              value={`/people/${data.profile.id}`}
                            />
                            <button className="button button-secondary button-mini" type="submit">
                              Remove
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ) : null,
              )
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No profile recommendations have been published yet.</strong>
                  <p>Recommended offers will appear here as public endorsements from this member.</p>
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
