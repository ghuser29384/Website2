import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  acceptGuestInterestAction,
  acceptInterestAction,
  addOfferCommentAction,
  addOfferRecommendationAction,
  expressGuestInterestAction,
  expressInterestAction,
  removeOfferRecommendationAction,
  toggleCartAction,
  updateOfferDiscountAction,
} from "@/app/actions";
import { CommentThread } from "@/components/community/comment-thread";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  getInterestForOffer,
  getOfferById,
  getOfferCartState,
  getViewer,
  listOfferComments,
  listOfferResponses,
  listOfferRecommendations,
  listRecommendableOffers,
} from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { formatMode, formatPaymentCadence } from "@/lib/offers";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { formatLocation, getAbsoluteUrl, truncateDescription } from "@/lib/seo";

interface OfferPageProps {
  params: Promise<{ offerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: OfferPageProps): Promise<Metadata> {
  const { offerId } = await params;
  const offer = await getOfferById(offerId);

  if (!offer) {
    return {
      title: "Offer not found",
    };
  }

  return {
    title: `${offer.offered_cause} for ${offer.requested_cause}`,
    description: truncateDescription(
      `${offer.ownerProfile?.resolvedName ?? offer.owner_alias} proposes ${offer.offer_action} in exchange for ${offer.request_action}. Verification: ${offer.verification}.`,
    ),
    alternates: {
      canonical: `/offers/${offer.id}`,
    },
    openGraph: {
      title: `${offer.offered_cause} for ${offer.requested_cause}`,
      description: truncateDescription(
        `${offer.ownerProfile?.resolvedName ?? offer.owner_alias} proposes ${offer.offer_action} in exchange for ${offer.request_action}. Verification: ${offer.verification}.`,
      ),
      url: getAbsoluteUrl(`/offers/${offer.id}`),
      type: "article",
    },
  };
}

export default async function OfferPage({ params, searchParams }: OfferPageProps) {
  const { offerId } = await params;
  const resolvedSearchParams = await searchParams;
  const offer = await getOfferById(offerId);

  if (!offer) {
    notFound();
  }

  const viewer = await getViewer();
  const isOwner = viewer?.authUser.id === offer.owner_id;
  const formMessage = getFormMessage(resolvedSearchParams);
  const [myInterest, incomingResponses, recommendations, comments, cartState, recommendableOffers] =
    await Promise.all([
      viewer ? await getInterestForOffer(offerId, viewer.authUser.id) : null,
      isOwner ? await listOfferResponses(offerId, viewer?.authUser.id) : Promise.resolve([]),
      await listOfferRecommendations(offerId),
      await listOfferComments(offerId, viewer?.authUser.id),
      await getOfferCartState(offerId, viewer?.authUser.id, offer.owner_id),
      isOwner && viewer
        ? await listRecommendableOffers(viewer.authUser.id, offer.id)
        : Promise.resolve([]),
    ]);
  const offerStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${offer.offered_cause} for ${offer.requested_cause}`,
    url: getAbsoluteUrl(`/offers/${offer.id}`),
    description: truncateDescription(
      `${offer.offer_action} Requested in return: ${offer.request_action}. Verification: ${offer.verification}.`,
    ),
    author: {
      "@type": "Person",
      name: offer.ownerProfile?.resolvedName ?? offer.owner_alias,
      url: offer.ownerProfile ? getAbsoluteUrl(`/people/${offer.ownerProfile.id}`) : undefined,
    },
    about: [offer.offered_cause, offer.requested_cause, offer.compromise_cause].filter(Boolean),
  };

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(offerStructuredData),
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
            <p className="eyebrow">{formatMode(offer.mode)}</p>
            <h1>
              {offer.offered_cause} for {offer.requested_cause}.
            </h1>
            <p className="hero-text">
              Posted by{" "}
              {offer.ownerProfile ? (
                <Link className="inline-link" href={`/people/${offer.ownerProfile.id}`}>
                  {offer.ownerProfile.resolvedName}
                </Link>
              ) : (
                <strong>{offer.owner_alias}</strong>
              )}
              . This dossier combines public terms, discussion, recommendations, interest,
              and transaction tracking in one record.
            </p>
            <div className="hero-actions">
              <Link className="button button-secondary" href="/offers">
                Back to public offers
              </Link>
              {viewer && !isOwner ? (
                <form action={toggleCartAction}>
                  <input name="offer_id" type="hidden" value={offer.id} />
                  <input name="return_to" type="hidden" value={`/offers/${offer.id}`} />
                  <button className="button button-primary" type="submit">
                    {cartState.isInCart ? "Remove from cart" : "Add to cart"}
                  </button>
                </form>
              ) : null}
              {!viewer ? (
                <>
                  <a className="button button-primary" href="#respond">
                    Respond without account
                  </a>
                  <Link
                    className="button button-secondary"
                    href={`/login?next=${encodeURIComponent(`/offers/${offerId}`)}`}
                  >
                    Log in
                  </Link>
                </>
              ) : null}
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Public record</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Owner profile</strong>
                  <p>
                    {offer.ownerProfile ? (
                      <>
                        {offer.ownerProfile.resolvedName} | rating{" "}
                        {offer.ownerProfile.rating
                          ? `${offer.ownerProfile.rating.toFixed(1)}/10`
                          : "not yet rated"}
                      </>
                    ) : (
                      <>Public profile pending</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Interest and cart activity</strong>
                  <p>
                    {isOwner
                      ? `${incomingResponses.length} response(s) | ${cartState.cartCount ?? 0} cart addition(s)`
                      : myInterest
                        ? `Your interest status: ${myInterest.status}`
                        : cartState.isInCart
                          ? "Currently in your cart"
                          : "Not yet added to your cart"}
                  </p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Commentary and recommendations</strong>
                  <p>
                    {comments.length} comment(s) | {recommendations.length} recommendation(s)
                  </p>
                </div>
              </div>
            </div>
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

        <section className="section section-white">
          <div className="detail-grid detail-grid-wide">
            <article className="panel detail-block">
              <p className="detail-kicker">Offer dossier</p>
              <h3>
                {offer.ownerProfile ? (
                  <Link className="inline-link" href={`/people/${offer.ownerProfile.id}`}>
                    {offer.ownerProfile.resolvedName}
                  </Link>
                ) : (
                  offer.owner_alias
                )}
              </h3>
              <p>{offer.notes || "No additional notes were provided for this offer."}</p>
              <div className="tag-row">
                <span className="badge">{offer.offered_cause}</span>
                <span className="badge badge-secondary">{offer.requested_cause}</span>
                <span className="impact-pill">{offer.offer_impact}/10 offered</span>
                <span className="impact-pill">{offer.min_counterparty_impact}+/10 needed</span>
              </div>
              <div className="clean-stack">
                <div>
                  <h3>Proposed action</h3>
                  <p>{offer.offer_action}</p>
                </div>
                <div>
                  <h3>Requested reciprocal action</h3>
                  <p>{offer.request_action}</p>
                </div>
                <div>
                  <h3>Compromise destination</h3>
                  <p>{offer.compromise_cause}</p>
                </div>
                <div>
                  <h3>Verification and term</h3>
                  <p>
                    {offer.verification} | {offer.duration} | trust level {offer.trust_level}/5
                  </p>
                  {offer.mode === "payment" ? <p>{formatPaymentCadence(offer)}</p> : null}
                </div>
                <div>
                  <h3>Current status</h3>
                  <p>{offer.status}</p>
                </div>
                <div>
                  <h3>Current discount</h3>
                  <p>{offer.discount_note || "No discount or reduced burden has been published."}</p>
                </div>
              </div>
            </article>

            <article className="panel detail-block" id="respond">
              <p className="detail-kicker">
                {isOwner ? "Owner controls" : "Respond to this offer"}
              </p>

              {isOwner ? (
                <div className="clean-stack">
                  <div className="owner-summary">
                    <span className="badge">{incomingResponses.length} responses</span>
                    <span className="impact-pill">{cartState.cartCount ?? 0} carts</span>
                  </div>

                  <form action={updateOfferDiscountAction} className="stack-form">
                    <input name="offer_id" type="hidden" value={offer.id} />
                    <input name="return_to" type="hidden" value={`/offers/${offer.id}`} />
                    <label className="field">
                      <span>Discount or reduced burden</span>
                      <textarea
                        defaultValue={offer.discount_note}
                        name="discount_note"
                        placeholder="Describe any lower cost, shorter duration, or easier version of the requested commitment."
                        rows={4}
                      />
                    </label>
                    <div className="form-actions">
                      <button className="button button-primary" type="submit">
                        Save discount
                      </button>
                    </div>
                  </form>
                </div>
              ) : viewer ? (
                <form action={expressInterestAction} className="stack-form">
                  <input name="offer_id" type="hidden" value={offer.id} />
                  <label className="field">
                    <span>Message</span>
                    <textarea
                      defaultValue={myInterest?.message ?? ""}
                      name="message"
                      placeholder="Explain why the terms seem prudentially and morally worthwhile to you."
                      rows={5}
                    />
                  </label>

                  <div className="form-actions">
                    <button className="button button-primary" type="submit">
                      {myInterest ? "Update response" : "Express interest"}
                    </button>
                    <Link className="button button-secondary" href="/dashboard">
                      Open dashboard
                    </Link>
                  </div>
                </form>
              ) : (
                <div className="clean-stack">
                  <p className="route-text">
                    You can respond without creating an account. Leave your email and a short
                    note, and the offer owner can follow up directly. Create an account later if
                    you want a public profile, comments, cart, and formal agreement tracking.
                  </p>
                  <form action={expressGuestInterestAction} className="stack-form">
                    <input name="offer_id" type="hidden" value={offer.id} />
                    <input name="return_to" type="hidden" value={`/offers/${offer.id}`} />
                    <label className="field">
                      <span>Your name</span>
                      <input
                        name="display_name"
                        placeholder="Optional. How should the owner identify you?"
                        type="text"
                      />
                    </label>
                    <div className="field-grid">
                      <label className="field compact-field">
                        <span>Email</span>
                        <input
                          name="contact_email"
                          placeholder="you@example.org"
                          required
                          type="email"
                        />
                      </label>
                      <label className="field compact-field">
                        <span>City</span>
                        <input name="city" placeholder="Optional" type="text" />
                      </label>
                    </div>
                    <label className="field">
                      <span>Region</span>
                      <input name="region" placeholder="State, province, or country" type="text" />
                    </label>
                    <label className="field">
                      <span>Message</span>
                      <textarea
                        name="message"
                        placeholder="Explain why the terms seem prudentially and morally worthwhile to you."
                        required
                        rows={5}
                      />
                    </label>

                    <div className="form-actions">
                      <button className="button button-primary" type="submit">
                        Continue without account
                      </button>
                      <Link
                        className="button button-secondary"
                        href={`/login?next=${encodeURIComponent(`/offers/${offer.id}`)}`}
                      >
                        Log in instead
                      </Link>
                    </div>
                  </form>
                </div>
              )}

              {myInterest ? (
                <div className="status-chip-row">
                  <span className="badge">Your response is {myInterest.status}</span>
                </div>
              ) : null}
            </article>
          </div>
        </section>

        {isOwner ? (
          <section className="section section-subtle">
            <div className="section-head">
              <p className="eyebrow">Incoming interest</p>
              <h2>Responses to this offer</h2>
              <p>
                Signed-in members and guest respondents appear together here. Member responses can
                be accepted into formal agreements, while guest responses let owners begin by
                email and invite account creation later.
              </p>
            </div>

            <div className="data-grid">
              {incomingResponses.length ? (
                incomingResponses.map((interest) => (
                  <article key={`${interest.kind}-${interest.id}`} className="panel data-card">
                    <p className="detail-kicker">
                      {interest.kind === "guest" ? "Guest response" : "Member response"}
                    </p>
                    <h3>
                      {interest.participantProfile ? (
                        <Link
                          className="inline-link"
                          href={`/people/${interest.participantProfile.id}`}
                        >
                          {interest.displayName}
                        </Link>
                      ) : (
                        interest.displayName
                      )}
                    </h3>
                    <p className="route-text">{interest.message || "No message provided."}</p>
                    <div className="tag-row">
                      <span className="badge">{interest.status}</span>
                      {interest.contactEmail ? (
                        <span className="source-pill">{interest.contactEmail}</span>
                      ) : null}
                      {interest.location ? <span className="source-pill">{interest.location}</span> : null}
                      {interest.kind === "guest" && interest.participantProfile ? (
                        <span className="source-pill">Account linked</span>
                      ) : null}
                      <span className="source-pill">
                        {new Date(interest.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {interest.kind === "member" && interest.canCreateAgreement && interest.status !== "accepted" ? (
                      <form action={acceptInterestAction} className="stack-form compact-form">
                        <input name="interest_id" type="hidden" value={interest.memberInterestId ?? ""} />
                        <input name="offer_id" type="hidden" value={offer.id} />
                        <input name="return_to" type="hidden" value={`/offers/${offer.id}`} />
                        <label className="field">
                          <span>Agreement notes</span>
                          <textarea
                            name="notes"
                            placeholder="Optional notes for the created agreement."
                            rows={3}
                          />
                        </label>
                        <div className="form-actions">
                          <button className="button button-secondary button-mini" type="submit">
                            Accept and create agreement
                          </button>
                        </div>
                      </form>
                    ) : interest.kind === "guest" && interest.canCreateAgreement && interest.status !== "accepted" ? (
                      <form action={acceptGuestInterestAction} className="stack-form compact-form">
                        <input
                          name="guest_interest_id"
                          type="hidden"
                          value={interest.guestInterestId ?? ""}
                        />
                        <input name="offer_id" type="hidden" value={offer.id} />
                        <input name="return_to" type="hidden" value={`/offers/${offer.id}`} />
                        <label className="field">
                          <span>Agreement notes</span>
                          <textarea
                            name="notes"
                            placeholder="Optional notes for the created agreement."
                            rows={3}
                          />
                        </label>
                        <div className="form-actions">
                          <button className="button button-secondary button-mini" type="submit">
                            Accept linked guest response
                          </button>
                        </div>
                      </form>
                    ) : interest.contactEmail ? (
                      <div className="offer-footer">
                        <div className="offer-actions">
                          <a className="text-button" href={`mailto:${interest.contactEmail}`}>
                            Email respondent
                          </a>
                          {interest.kind === "guest" && !interest.participantProfile ? (
                            <span className="route-text">
                              They can create an account later with this email to formalize the trade.
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <div>
                    <strong>No responses yet.</strong>
                    <p>Member and guest responses will appear here when someone engages with your offer.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Recommendations</p>
            <h2>Related offers endorsed from this page</h2>
            <p>
              Owners can recommend other users&apos; offers from their own offer pages. These public
              links help people trace trust and substantive overlap.
            </p>
          </div>

          {isOwner && recommendableOffers.length ? (
            <form action={addOfferRecommendationAction} className="stack-form recommendation-form">
              <input name="source_offer_id" type="hidden" value={offer.id} />
              <input name="return_to" type="hidden" value={`/offers/${offer.id}`} />
              <label className="field">
                <span>Recommend another member&apos;s offer</span>
                <select defaultValue="" name="recommended_offer_id">
                  <option disabled value="">
                    Select an offer
                  </option>
                  {recommendableOffers.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.ownerProfile?.resolvedName ?? candidate.owner_alias}: {candidate.offered_cause} for{" "}
                      {candidate.requested_cause}
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
            {recommendations.length ? (
              recommendations.map((recommendation) =>
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
                        Recommended by {recommendation.recommender?.resolvedName ?? "Member"}
                      </span>
                      <span className="impact-pill">
                        {recommendation.recommendedOffer.ownerProfile?.resolvedName ??
                          recommendation.recommendedOffer.owner_alias}
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
                        {isOwner && recommendation.recommender_id === viewer?.authUser.id ? (
                          <form action={removeOfferRecommendationAction}>
                            <input name="recommendation_id" type="hidden" value={recommendation.id} />
                            <input name="return_to" type="hidden" value={`/offers/${offer.id}`} />
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
                  <strong>No linked recommendations yet.</strong>
                  <p>Owner-published recommendations will appear here once they are added.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Public comments</p>
            <h2>Structured discussion</h2>
            <p>
              Each offer has a public comment thread. Comments can be nested, voted on once per
              user, and linked back to public member profiles.
            </p>
          </div>

          {viewer ? (
            <form action={addOfferCommentAction} className="stack-form comment-compose-form">
              <input name="offer_id" type="hidden" value={offer.id} />
              <input name="return_to" type="hidden" value={`/offers/${offer.id}`} />
              <label className="field">
                <span>Add a public comment</span>
                <textarea
                  name="body"
                  placeholder="State a clarifying question, objection, or supporting premise."
                  rows={4}
                />
              </label>
              <div className="form-actions">
                <button className="button button-primary" type="submit">
                  Post comment
                </button>
              </div>
            </form>
          ) : (
            <div className="status-banner status-banner-success">
              Log in to comment, reply, or vote on comments.
            </div>
          )}

          <CommentThread
            comments={comments}
            offerId={offer.id}
            returnTo={`/offers/${offer.id}`}
            viewerId={viewer?.authUser.id}
          />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
