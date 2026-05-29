import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  acceptGuestInterestAction,
  acceptInterestAction,
  addOfferCommentAction,
  addOfferRecommendationAction,
  expressInterestAction,
  removeOfferRecommendationAction,
  toggleCartAction,
  updateOfferDiscountAction,
} from "@/app/actions";
import { CommentThread } from "@/components/community/comment-thread";
import { EveryOrgDonateButton } from "@/components/donate/every-org-donate-button";
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
import { findEveryOrgTargetForCauseArea } from "@/lib/every-org";
import { getFormMessage } from "@/lib/form-state";
import { formatMode, formatOffsetSummary, formatPaymentCadence } from "@/lib/offers";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import {
  THIRD_PARTY_EXTERNALITY_PROMPTS,
  getActionEvidenceSummary,
  getBaselineConfidence,
  getBaselineEvidenceSummary,
  getExternalityReviewSummary,
  getOfferReviewWorkflowCards,
  getScoreConfidence,
} from "@/lib/proposal-review";
import { formatLocation, getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { getDonationOffsetEvidenceState } from "@/lib/validation";

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
  const relatedDonationTarget =
    findEveryOrgTargetForCauseArea(offer.compromise_cause) ??
    findEveryOrgTargetForCauseArea(offer.offered_cause) ??
    findEveryOrgTargetForCauseArea(offer.requested_cause);
  const offsetSummary =
    offer.mode === "offset" && offer.donationOffset
      ? formatOffsetSummary({
          id: offer.id,
          alias: offer.owner_alias,
          mode: "offset",
          offeredCause: offer.offered_cause,
          requestedCause: offer.requested_cause,
          offerAction: offer.offer_action,
          requestAction: offer.request_action,
          compromiseCause: offer.compromise_cause,
          offerImpact: offer.offer_impact,
          minCounterpartyImpact: offer.min_counterparty_impact,
          verification: offer.verification,
          duration: offer.duration,
          paymentIntervalValue: offer.payment_interval_value,
          paymentIntervalUnit:
            offer.payment_interval_unit === "day" ||
            offer.payment_interval_unit === "month" ||
            offer.payment_interval_unit === "year"
              ? offer.payment_interval_unit
              : "none",
          trustLevel: offer.trust_level,
          notes: offer.notes,
          baselineAmountUsd: offer.donationOffset.baseline_amount_cents / 100,
          baselineOpposedCause: offer.donationOffset.baseline_opposed_cause,
          requestedMatchingAmountUsd:
            offer.donationOffset.requested_matching_amount_cents / 100,
          requestedOpposedCause: offer.donationOffset.requested_opposed_cause,
          compromiseDestinationId: offer.donationOffset.compromise_charity_id,
          offsetRatio: offer.donationOffset.offset_ratio,
          offsetTimeHorizon: offer.donationOffset.time_horizon,
          offsetVerificationMethod: offer.donationOffset.verification_method,
          unmatchedSurplusRule: offer.donationOffset.unmatched_surplus_rule,
          offsetParticipationMode: offer.donationOffset.participation_mode,
          offsetPoolId: offer.donationOffset.pool_id ?? "",
          offsetPoolName: offer.donationOffset.pool?.name ?? "",
          offsetPoolSide: offer.donationOffset.pool_side ?? "",
          assuranceMinimumUsd: offer.donationOffset.assurance_minimum_cents / 100,
          poolMaximumCapUsd: offer.donationOffset.pool
            ? offer.donationOffset.pool.maximum_cap_cents / 100
            : null,
          assuranceDeadline: offer.donationOffset.assurance_deadline_at ?? "",
          evidenceUrl: offer.donationOffset.evidence_url,
          moderationStatus: offer.donationOffset.moderation_status,
          source: "Live offer",
          createdAt: Date.parse(offer.created_at),
        })
      : null;
  const offsetEvidenceState =
    offer.mode === "offset" && offer.donationOffset
      ? getDonationOffsetEvidenceState({
          moderationStatus: offer.donationOffset.moderation_status,
          evidenceUrl: offer.donationOffset.evidence_url,
          moderationReviewedAt: offer.donationOffset.moderation_reviewed_at,
          createdAt: offer.donationOffset.created_at,
        })
      : null;
  const poolJoinHref =
    offer.mode === "offset" &&
    offer.donationOffset?.participation_mode === "pool" &&
    offer.donationOffset.pool_id
      ? `/offers/new?mode=offset&offset_participation_mode=pool&offset_pool_id=${
          offer.donationOffset.pool_id
        }&offset_pool_side=${offer.donationOffset.pool_side === "side_a" ? "side_b" : "side_a"}`
      : null;
  const offerReturnTo = `/offers/${offer.id}`;
  const respondReturnTo = `${offerReturnTo}#respond`;
  const createSimilarHref = `/offers/new?mode=${offer.mode}&source_offer=${offer.id}`;
  const authCreateSimilarHref = viewer
    ? createSimilarHref
    : `/signup?returnTo=${encodeURIComponent(createSimilarHref)}`;
  const signInToOfferHref = `/login?returnTo=${encodeURIComponent(offerReturnTo)}`;
  const signInToRespondHref = `/login?returnTo=${encodeURIComponent(respondReturnTo)}`;
  const signUpToRespondHref = `/signup?returnTo=${encodeURIComponent(respondReturnTo)}`;
  const reviewInput = {
    mode: offer.mode,
    verification: offer.verification,
    trustLevel: offer.trust_level,
    baselineAmountUsd: offer.donationOffset ? offer.donationOffset.baseline_amount_cents / 100 : null,
    baselineOpposedCause: offer.donationOffset?.baseline_opposed_cause ?? "",
    requestedMatchingAmountUsd: offer.donationOffset
      ? offer.donationOffset.requested_matching_amount_cents / 100
      : null,
    requestedOpposedCause: offer.donationOffset?.requested_opposed_cause ?? "",
    evidenceUrl: offer.donationOffset?.evidence_url ?? "",
    moderationStatus: offer.donationOffset?.moderation_status ?? null,
    offeredCause: offer.offered_cause,
    requestedCause: offer.requested_cause,
  };
  const actionEvidence = getActionEvidenceSummary(reviewInput);
  const baselineConfidence = getBaselineConfidence(reviewInput);
  const baselineEvidence = getBaselineEvidenceSummary(reviewInput);
  const externalityReview = getExternalityReviewSummary(reviewInput);
  const scoreConfidence = getScoreConfidence(reviewInput);
  const reviewWorkflowCards = getOfferReviewWorkflowCards({
    ...reviewInput,
    currentStatus: offer.status,
    offerImpact: offer.offer_impact,
    minCounterpartyImpact: offer.min_counterparty_impact,
  });
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
                Back to offer marketplace
              </Link>
              {viewer && !isOwner ? (
                <form action={toggleCartAction}>
                  <input name="offer_id" type="hidden" value={offer.id} />
                  <input name="return_to" type="hidden" value={offerReturnTo} />
                  <button className="button button-primary" type="submit">
                    {cartState.isInCart ? "Remove saved offer" : "Save offer"}
                  </button>
                </form>
              ) : null}
              {!isOwner ? (
                <Link className="button button-secondary" href={authCreateSimilarHref}>
                  Create similar
                </Link>
              ) : null}
              {!viewer ? (
                <>
                  {offer.mode === "offset" && offer.donationOffset?.participation_mode === "pool" ? (
                    <>
                      <Link
                        className="button button-primary"
                        href={`/signup?returnTo=${encodeURIComponent(poolJoinHref ?? offerReturnTo)}`}
                      >
                        Create account to join pool
                      </Link>
                      <Link
                        className="button button-secondary"
                        href={`/login?returnTo=${encodeURIComponent(poolJoinHref ?? offerReturnTo)}`}
                      >
                        Log in
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link className="button button-primary" href={signInToRespondHref}>
                        Contact after sign-in
                      </Link>
                      <Link className="button button-secondary" href={signInToOfferHref}>
                        Sign in
                      </Link>
                    </>
                  )}
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

        {offer.mode === "offset" && offer.donationOffset?.moderation_status === "flagged" ? (
          <div className="status-banner status-banner-error">
            This donation offset is publicly visible but flagged because the baseline donation is not
            yet well verified. Ask for receipts, third-party payment confirmation, or a third-party
            audit before relying on it.
          </div>
        ) : null}

        {offer.mode === "offset" && offer.donationOffset && offsetEvidenceState ? (
          <section className="section section-subtle" aria-labelledby="offset-evidence-heading">
            <div className="section-head">
              <p className="eyebrow">Validation state</p>
              <h2 id="offset-evidence-heading">Evidence review for this offset</h2>
              <p>
                MoralTrade treats each receipt, audit, or payment record as one proof for one
                displayed claim, with a challenge window before durable trust badges.
              </p>
            </div>
            <div className="data-grid">
              <article className="panel data-card data-card-wide">
                <p className="detail-kicker">{offsetEvidenceState.label}</p>
                <h3>One proof, one claim</h3>
                <p className="route-text">{offsetEvidenceState.summary}</p>
                {offsetEvidenceState.challengeWindowEndsAt ? (
                  <p className="route-text">
                    Challenge window ends{" "}
                    {new Date(offsetEvidenceState.challengeWindowEndsAt).toLocaleDateString()}.
                  </p>
                ) : null}
                <p className="route-text">
                  Duplicate proof, coercive baseline claims, and factual gaps should be challenged
                  before this offset is treated as review-cleared.
                </p>
                <div className="tag-row">
                  <span className="badge badge-secondary">
                    Badge eligible: {offsetEvidenceState.badgeEligible ? "yes" : "not yet"}
                  </span>
                  <Link className="text-button" href="/validation">
                    See validation rules
                  </Link>
                </div>
              </article>
            </div>
          </section>
        ) : null}

        <section className="section section-white" aria-labelledby="review-workflow-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Review workflow</p>
            <h2 id="review-workflow-heading">Why this record can or cannot be relied on yet</h2>
            <p>
              Each card exposes the current review state, factor codes, and the next human-controlled
              step before matching, disclosure, or completion trust.
            </p>
          </div>
          <div className="review-workflow-grid">
            {reviewWorkflowCards.map((card) => (
              <article
                className={`panel review-workflow-card review-workflow-card-${card.status}`}
                key={card.key}
              >
                <div className="review-workflow-card-head">
                  <p className="detail-kicker">{card.key.replaceAll("_", " ")}</p>
                  <span className="review-workflow-status">{card.status.replaceAll("_", " ")}</span>
                </div>
                <h3>{card.label}</h3>
                <p className="route-text">{card.summary}</p>
                <div className="review-factor-list" aria-label={`${card.label} factor codes`}>
                  {card.factorCodes.map((factorCode) => (
                    <span key={factorCode}>{factorCode}</span>
                  ))}
                </div>
                <p className="review-next-step">
                  <strong>Next step:</strong> {card.nextStep}
                </p>
              </article>
            ))}
          </div>
        </section>

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
                <span className="impact-pill">Participant-stated importance {offer.offer_impact}/10</span>
                <span className="impact-pill">
                  Counterparty minimum acceptable importance {offer.min_counterparty_impact}+/10
                </span>
                <span className="impact-pill">Confidence: {scoreConfidence}</span>
              </div>
              <p className="route-text">
                Not a platform moral ranking. These scores reflect participant-stated views, not
                Moral Trade&apos;s assessment of moral value.
              </p>
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
                  <p>
                    {offer.mode === "offset" && offer.donationOffset?.compromiseCharity
                      ? offer.donationOffset.compromiseCharity.name
                      : offer.compromise_cause}
                  </p>
                </div>
                {offer.mode === "offset" && offer.donationOffset ? (
                  <div>
                    <h3>Donation offset terms</h3>
                    <p>
                      Baseline: ${(offer.donationOffset.baseline_amount_cents / 100).toFixed(2)} from{" "}
                      {offer.donationOffset.baseline_opposed_cause}
                    </p>
                    <p>
                      Requested matching donation: $
                      {(offer.donationOffset.requested_matching_amount_cents / 100).toFixed(2)} from{" "}
                      {offer.donationOffset.requested_opposed_cause}
                    </p>
                    <p>
                      {offsetSummary?.ratio ?? "1:1"} | {offsetSummary?.timeHorizon ?? "One-off"} |{" "}
                      {offsetSummary?.verification ?? "Receipts uploaded"}
                    </p>
                    <p>{offsetSummary?.unmatchedRule}</p>
                    {offer.donationOffset.participation_mode === "pool" && offer.donationOffset.pool ? (
                      <>
                        <p>
                          Pool: <strong>{offer.donationOffset.pool.name}</strong> |{" "}
                          {offsetSummary?.participationMode ?? "Offset pool"}
                        </p>
                        <p>
                          Side: <strong>{offsetSummary?.poolSide ?? "Not assigned"}</strong> | Matched so
                          far ${(offer.donationOffset.pool.matchedCompromiseCents / 100).toFixed(2)}
                        </p>
                        {offer.donationOffset.pool.assurance_deadline_at ? (
                          <p>
                            Assurance target $
                            {(offer.donationOffset.pool.assurance_minimum_cents / 100).toFixed(2)} by{" "}
                            {new Date(
                              offer.donationOffset.pool.assurance_deadline_at,
                            ).toLocaleDateString()}
                            .
                          </p>
                        ) : null}
                      </>
                    ) : null}
                    {offer.donationOffset.evidence_url ? (
                      <p>
                        Evidence link:{" "}
                        <a className="inline-link" href={offer.donationOffset.evidence_url}>
                          open verification record
                        </a>
                      </p>
                    ) : (
                      <p>Evidence link not yet provided. This offer may remain flagged.</p>
                    )}
                  </div>
                ) : null}
                {relatedDonationTarget ? (
                  <div className="related-donation-card">
                    <h3>Direct donation route</h3>
                    <p>
                      This offer touches a cause area that currently has a verified Every.org
                      route: {relatedDonationTarget.title}.
                    </p>
                    <div className="offer-actions">
                      <EveryOrgDonateButton
                        className="button button-secondary button-mini"
                        label="Donate on Every.org"
                        target={relatedDonationTarget}
                      />
                      <Link className="text-button" href="/donate">
                        See all donation routes
                      </Link>
                    </div>
                  </div>
                ) : null}
                <div>
                  <h3>Verification and term</h3>
                  <p>
                    {offer.verification} | {offer.duration} | trust level {offer.trust_level}/5
                  </p>
                  {offer.mode === "payment" ? <p>{formatPaymentCadence(offer)}</p> : null}
                </div>
                <div>
                  <h3>Action evidence</h3>
                  <p>{actionEvidence}</p>
                </div>
                <div>
                  <h3>Baseline confidence</h3>
                  <p>
                    <strong>{baselineConfidence}</strong>: {baselineEvidence}
                  </p>
                </div>
                <div>
                  <h3>Third-party externality review</h3>
                  <p>{externalityReview}</p>
                  <ul className="trust-check-list">
                    {THIRD_PARTY_EXTERNALITY_PROMPTS.map((prompt) => (
                      <li key={prompt}>{prompt}</li>
                    ))}
                  </ul>
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
                    <input name="return_to" type="hidden" value={offerReturnTo} />
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
              ) : viewer && offer.mode === "offset" && offer.donationOffset?.participation_mode === "pool" ? (
                <div className="clean-stack">
                  <p className="route-text">
                    This listing is part of an offset pool, so it is not accepted one-to-one. To
                    participate, publish a matching commitment on the opposite side of the same pool.
                  </p>
                  {offer.donationOffset.pool ? (
                    <div className="tag-row">
                      <span className="badge">{offer.donationOffset.pool.name}</span>
                      <span className="badge badge-secondary">
                        Your side would be{" "}
                        {offer.donationOffset.pool_side === "side_a"
                          ? offer.donationOffset.pool.side_b_label
                          : offer.donationOffset.pool.side_a_label}
                      </span>
                    </div>
                  ) : null}
                  <div className="form-actions">
                    {poolJoinHref ? (
                      <Link className="button button-primary" href={poolJoinHref}>
                        Create matching pool commitment
                      </Link>
                    ) : null}
                    <Link className="button button-secondary" href="/donation-offsets">
                      Review pool safeguards
                    </Link>
                  </div>
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
                      {myInterest
                        ? offer.mode === "offset"
                          ? offer.donationOffset?.participation_mode === "pool"
                            ? "Update pool commitment"
                            : "Update offset commitment"
                          : "Update response"
                        : offer.mode === "offset"
                          ? offer.donationOffset?.participation_mode === "pool"
                            ? "Join offset pool"
                            : "Accept offset"
                          : "Express interest"}
                    </button>
                    <Link className="button button-secondary" href="/dashboard">
                      Open dashboard
                    </Link>
                  </div>
                </form>
              ) : offer.mode === "offset" && offer.donationOffset?.participation_mode === "pool" ? (
                <div className="clean-stack">
                  <p className="route-text">
                    Pooled offsets require a public matching commitment rather than an anonymous
                    one-to-one response. Create an account to join the opposite side of this pool,
                    publish your baseline evidence, and let the platform aggregate the match.
                  </p>
                  <div className="form-actions">
                    <Link
                      className="button button-primary"
                      href={`/signup?returnTo=${encodeURIComponent(poolJoinHref ?? offerReturnTo)}`}
                    >
                      Create account to join pool
                    </Link>
                    <Link
                      className="button button-secondary"
                      href={`/login?returnTo=${encodeURIComponent(poolJoinHref ?? offerReturnTo)}`}
                    >
                      Log in
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="clean-stack">
                  <p className="route-text">
                    Contact and response paths stay sign-in and consent gated. Create an account
                    or sign in before sending a message so private wishes, contact details, and
                    agreement history remain tied to a member-controlled record.
                  </p>
                  <div className="form-actions">
                    <Link className="button button-primary" href={signInToRespondHref}>
                      Sign in to contact
                    </Link>
                    <Link className="button button-secondary" href={signUpToRespondHref}>
                      Create account
                    </Link>
                    <Link className="button button-secondary" href={authCreateSimilarHref}>
                      Create similar
                    </Link>
                  </div>
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
                Signed-in member responses appear here. Any previously captured guest records
                stay owner-visible for continuity, but new public contact paths now require
                sign-in before private messages or contact details are shared.
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
                    {offer.mode === "offset" && offer.donationOffset?.participation_mode === "pool" ? (
                      <div className="status-banner status-banner-error">
                        Pool commitments are not accepted one-to-one. Ask respondents to publish a
                        matching pool commitment instead.
                      </div>
                    ) : interest.kind === "member" && interest.canCreateAgreement && interest.status !== "accepted" ? (
                      <form action={acceptInterestAction} className="stack-form compact-form">
                        <input name="interest_id" type="hidden" value={interest.memberInterestId ?? ""} />
                        <input name="offer_id" type="hidden" value={offer.id} />
                        <input name="return_to" type="hidden" value={offerReturnTo} />
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
                            {offer.mode === "offset"
                              ? offer.donationOffset?.participation_mode === "pool"
                                ? "Pool commitments are not accepted one-to-one"
                                : "Accept offset and record redirect"
                              : "Accept and create agreement"}
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
                        <input name="return_to" type="hidden" value={offerReturnTo} />
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
                            {offer.mode === "offset"
                              ? offer.donationOffset?.participation_mode === "pool"
                                ? "Pool commitments are not accepted one-to-one"
                                : "Accept guest offset and record redirect"
                              : "Accept linked guest response"}
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
