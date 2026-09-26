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
  formatPublicProfileLocation,
  getPublicProfilePageData,
  getPublicProfileSummary,
  getViewer,
  listRecommendableOffers,
} from "@/lib/app-data";
import { formatMode, formatPaymentCadence } from "@/lib/offers";
import {
  getPublicProfileMetaSummary,
  getPublicProfileTrustSignals,
} from "@/lib/public-profile-trust";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { parsePublicProfileOfferPage } from "@/lib/public-profile-offers";

interface ProfilePageProps {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { profileId } = await params;

  const profile = await getPublicProfileSummary(profileId);

  return {
    title: profile ? profile.resolvedName : "Profile",
    description: profile
      ? truncateDescription(
          getPublicProfileMetaSummary(profile, {
            publicLocation: formatPublicProfileLocation(profile),
          }),
        )
      : "Public Moral Trade member profile.",
    alternates: {
      canonical: `/people/${profileId}`,
    },
    openGraph: {
      title: profile ? profile.resolvedName : "Profile",
      description: profile
        ? truncateDescription(
            getPublicProfileMetaSummary(profile, {
              publicLocation: formatPublicProfileLocation(profile),
            }),
          )
        : "Public Moral Trade member profile.",
      url: getAbsoluteUrl(`/people/${profileId}`),
      type: "profile",
    },
  };
}

function formatBadgeType(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { profileId } = await params;
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const offerPage = parsePublicProfileOfferPage(resolvedSearchParams.offersPage);
  const viewer = await getViewer();
  const data = await getPublicProfilePageData(profileId, viewer?.authUser.id, offerPage);

  if (!data.profile) {
    notFound();
  }

  const profile = data.profile;
  const visibleOfferStart = data.offers.length
    ? (data.offersPage.page - 1) * data.offersPage.pageSize + 1
    : 0;
  const visibleOfferEnd = visibleOfferStart + data.offers.length - 1;
  const isOwnProfile = viewer?.authUser.id === profile.id;
  const publicLocation = formatPublicProfileLocation(profile);
  const visibleTrustSignals = getPublicProfileTrustSignals(profile, {
    authoredCommentCount: data.authoredCommentCount,
    publicLocation,
  });
  const recommendableOffers =
    viewer && isOwnProfile ? await listRecommendableOffers(viewer.authUser.id) : [];
  const profileStructuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.resolvedName,
    url: getAbsoluteUrl(`/people/${profile.id}`),
    description: profile.bio || undefined,
    homeLocation: publicLocation || undefined,
  };

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(profileStructuredData),
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
            <p className="eyebrow">Public member record</p>
            <h1>{profile.resolvedName}</h1>
            <p className="hero-text">
              {publicLocation || "Location not listed"}.
              {" "}
              This public profile aggregates only opt-in trust signals: open offers, reviewed proof
              badges, broad wish previews, and public recommendations.
            </p>
            {!isOwnProfile && viewer ? (
              <div className="hero-actions">
                <form action={toggleFollowAction}>
                  <input name="profile_id" type="hidden" value={profile.id} />
                  <input name="return_to" type="hidden" value={`/people/${profile.id}`} />
                  <button className="button button-primary" type="submit">
                    {profile.isFollowedByViewer ? "Following" : "Follow member"}
                  </button>
                </form>
              </div>
            ) : null}
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Visible trust summary</p>
            <div className="tag-row" aria-label="Visible trust signals">
              {profile.verificationBadges.slice(0, 4).map((badge) => (
                <span className="impact-pill" key={badge.id}>
                  {formatBadgeType(badge.badge_type)}
                </span>
              ))}
              {profile.offerCount > 0 ? (
                <span className="source-pill">{profile.offerCount} open offer(s)</span>
              ) : null}
              {profile.ratingCount > 0 ? (
                <span className="source-pill">
                  {(profile.rating ?? 0).toFixed(1)}/10 from {profile.ratingCount} reviewed rating(s)
                </span>
              ) : null}
              {data.authoredCommentCount > 0 ? (
                <span className="source-pill">{data.authoredCommentCount} public comment(s)</span>
              ) : null}
              {profile.wishPreview || profile.wishCauses.length ? (
                <span className="source-pill">Broad wish preview visible</span>
              ) : null}
              {!profile.verificationBadges.length &&
              profile.offerCount === 0 &&
              profile.ratingCount === 0 &&
              data.authoredCommentCount === 0 &&
              !profile.wishPreview &&
              !profile.wishCauses.length ? (
                <span className="badge badge-secondary">No reviewed public record yet</span>
              ) : null}
            </div>
            {profile.bio ? <p className="route-text">{profile.bio}</p> : null}
            <p className="route-text">
              {visibleTrustSignals.length
                ? `${visibleTrustSignals.join(". ")}. Exact wishes and contact details remain private until consent.`
                : "Trust signals appear here only after this member publishes reviewable records. Exact wishes and contact details remain private until consent."}
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
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
                Display name, bio, and any location granularity you select are shown publicly in the
                member directory and on offer pages.
              </p>
            </div>

            <form action={updateProfileAction} className="stack-form profile-edit-form">
              <input name="return_to" type="hidden" value={`/people/${profile.id}`} />
              <div className="field-grid">
                <label className="field">
                  <span>Display name</span>
                  <input
                    defaultValue={profile.display_name ?? ""}
                    name="display_name"
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>City</span>
                  <input defaultValue={profile.city ?? ""} name="city" type="text" />
                </label>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Region</span>
                  <input defaultValue={profile.region ?? ""} name="region" type="text" />
                </label>
                <label className="field">
                  <span>Country</span>
                  <input defaultValue={profile.country ?? ""} name="country" type="text" />
                </label>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Public location visibility</span>
                  <select
                    defaultValue={profile.public_location_granularity}
                    name="public_location_granularity"
                  >
                    <option value="hidden">Hidden</option>
                    <option value="country">Country only</option>
                    <option value="region">Region and country</option>
                    <option value="city">City, region, and country</option>
                  </select>
                </label>
                <label className="field">
                  <span>Email</span>
                  <input defaultValue={profile.email} disabled type="email" />
                </label>
              </div>
              <label className="field">
                <span>Bio</span>
                <textarea
                  defaultValue={profile.bio}
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

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Semi-private preview</p>
            <h2>Broad interests this member has chosen to show</h2>
            <p>
              Exact wishes, asks, constraints, and contact details are not shown here. Any
              introduction requires consent from both sides.
            </p>
          </div>

          {profile.wishPreview || profile.wishCauses.length ? (
            <article className="panel data-card data-card-wide">
              <p className="route-text">
                {profile.wishPreview || "This member has shared broad interests only."}
              </p>
              <div className="tag-row">
                {profile.wishCauses.map((cause) => (
                  <span className="source-pill" key={`${profile.id}-${cause}`}>
                    {cause}
                  </span>
                ))}
                {profile.wishLocation ? (
                  <span className="source-pill">{profile.wishLocation}</span>
                ) : null}
                {profile.wishOpenToPayment ? (
                  <span className="impact-pill">Open to payment-mediated trades</span>
                ) : null}
                {profile.wishOpenToPledges ? (
                  <span className="impact-pill">Open to pledge-based trades</span>
                ) : null}
              </div>
            </article>
          ) : (
            <div className="empty-state">
              <div>
                <strong>No wish preview is public.</strong>
                <p>This member has not shared a broad wish profile preview.</p>
              </div>
            </div>
          )}
        </section>

        <section className="section section-subtle" id="open-offers">
          <div className="section-head">
            <p className="eyebrow">Open offers</p>
            <h2>Public commitments from this member</h2>
            <p>
              {data.offers.length
                ? `Showing ${visibleOfferStart}–${visibleOfferEnd} of ${profile.offerCount} open offers.`
                : "No open offers are visible on this page."}
            </p>
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
                    {offer.commentCount > 0 ? (
                      <span className="impact-pill">{offer.commentCount} comments</span>
                    ) : null}
                    {offer.recommendationCount > 0 ? (
                      <span className="impact-pill">
                        {offer.recommendationCount} recommendations
                      </span>
                    ) : null}
                  </div>
                  <div className="offer-footer">
                    <div className="tag-row">
                      <span>{offer.verification}</span>
                      <span>{offer.duration}</span>
                      {offer.mode === "payment" ? (
                        <span>{formatPaymentCadence(offer)}</span>
                      ) : null}
                    </div>
                    <div className="offer-actions">
                      <Link className="text-button" href={`/offers/${offer.id}`}>
                        View member offer
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

          {data.offersPage.hasPreviousPage || data.offersPage.hasNextPage ? (
            <nav aria-label="Open-offer pages" className="offer-actions">
              {data.offersPage.hasPreviousPage ? (
                <Link
                  className="button button-secondary"
                  href={`/people/${profile.id}?offersPage=${data.offersPage.page - 1}#open-offers`}
                >
                  Previous page
                </Link>
              ) : (
                <span />
              )}
              <span className="source-pill">Page {data.offersPage.page}</span>
              {data.offersPage.hasNextPage ? (
                <Link
                  className="button button-secondary"
                  href={`/people/${profile.id}?offersPage=${data.offersPage.page + 1}#open-offers`}
                >
                  Next page
                </Link>
              ) : null}
            </nav>
          ) : null}
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
              <input name="profile_page_id" type="hidden" value={profile.id} />
              <input name="return_to" type="hidden" value={`/people/${profile.id}`} />
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
                          View recommended offer
                        </Link>
                        {isOwnProfile ? (
                          <form action={removeOfferRecommendationAction}>
                            <input name="recommendation_id" type="hidden" value={recommendation.id} />
                            <input
                              name="return_to"
                              type="hidden"
                              value={`/people/${profile.id}`}
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
