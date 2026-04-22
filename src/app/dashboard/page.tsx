import type { Metadata } from "next";
import Link from "next/link";

import {
  answerClarificationQuestionAction,
  createNetworkInviteAction,
  consentToMatchSuggestionAction,
  dismissMatchSuggestionAction,
  dismissClarificationQuestionAction,
  markWishNotificationReadAction,
  rateAgreementAction,
  refreshBackgroundMatchesAction,
  reportMatchSuggestionAction,
  saveProfileSourceAction,
} from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getDashboardData, requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { formatMode, formatPaymentCadence } from "@/lib/offers";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await requireViewer("/dashboard") : null;
  const dashboardData = viewer ? await getDashboardData(viewer.authUser.id) : null;

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
            <p className="eyebrow">Member dashboard</p>
            <h1>Review your recent public record and active commitments.</h1>
            <p className="hero-text">
              {viewer ? (
                <>
                  Signed in as <strong>{viewer.displayName}</strong>. This dashboard ties together
                  your public profile, offers, interests, agreements, ratings, and cart items.
                </>
              ) : (
                <>Configure Supabase to enable the live dashboard and authenticated activity.</>
              )}
            </p>
            {viewer ? (
              <div className="hero-actions">
                <Link className="button button-primary" href={`/people/${viewer.authUser.id}`}>
                  View public profile
                </Link>
                <Link className="button button-secondary" href="/cart">
                  Open cart
                </Link>
              </div>
            ) : null}
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Account summary</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Public profile</strong>
                  <p>
                    {[viewer?.profile.city, viewer?.profile.region].filter(Boolean).join(", ") ||
                      "Location not yet listed"}
                  </p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Offers and interest</strong>
                  <p>
                    Showing recent items: {dashboardData?.offers.length ?? 0} offer(s) |{" "}
                    {dashboardData?.incomingInterests.length ?? 0} incoming response(s) |{" "}
                    {dashboardData?.interests.length ?? 0} outgoing response(s)
                  </p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Agreements and cart</strong>
                  <p>
                    Showing recent items: {dashboardData?.agreements.length ?? 0} agreement(s) |{" "}
                    {dashboardData?.cartItems.length ?? 0} cart item(s)
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        {!supabaseReady ? (
          <div className="status-banner status-banner-error">
            Supabase is not configured yet. Add environment variables and apply the SQL schema
            before using the live dashboard.
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

        {dashboardData?.errors.relatedOffers ? (
          <div className="status-banner status-banner-error">
            Some linked offer details could not be loaded. The underlying Supabase error was
            logged on the server.
          </div>
        ) : null}

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Private wish profile</p>
            <h2>Values, wishes, asks, and constraints</h2>
            <p>
              This registry is separate from your public profile. Exact wishes stay private; broad
              previews are used only for safe match suggestions and consent-gated introductions.
            </p>
          </div>

          {dashboardData?.errors.wishProfile ? (
            <div className="empty-state">
              <div>
                <strong>We could not load your private wish profile.</strong>
                <p>The detailed Supabase error was logged on the server.</p>
              </div>
            </div>
          ) : dashboardData?.wishProfile ? (
            <div className="panel data-card data-card-wide">
              <div className="tag-row">
                <span className="badge">
                  {dashboardData.wishProfile.is_discoverable
                    ? "Safe matching enabled"
                    : "Private only"}
                </span>
                <span className="source-pill">
                  Updated {new Date(dashboardData.wishProfile.updated_at).toLocaleDateString()}
                </span>
              </div>
              <dl className="values-summary">
                <div>
                  <dt>Participant</dt>
                  <dd>
                    {dashboardData.wishProfile.participant_kind}
                    {dashboardData.wishProfile.collective_name
                      ? `: ${dashboardData.wishProfile.collective_name}`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt>Causes</dt>
                  <dd>
                    {dashboardData.wishProfile.causes.length
                      ? dashboardData.wishProfile.causes.join(", ")
                      : "No causes listed."}
                  </dd>
                </div>
                <div>
                  <dt>Wishes</dt>
                  <dd>
                    {dashboardData.wishProfile.wishes
                      .map((entry) => entry.body)
                      .join(" / ") || "No wish entered."}
                  </dd>
                </div>
                <div>
                  <dt>Offers</dt>
                  <dd>
                    {dashboardData.wishProfile.offers
                      .map((entry) => entry.body)
                      .join(" / ") || "No offer entered."}
                  </dd>
                </div>
                <div>
                  <dt>Capabilities</dt>
                  <dd>{dashboardData.wishProfile.capabilities || "No capabilities listed."}</dd>
                </div>
                <div>
                  <dt>Asks</dt>
                  <dd>
                    {dashboardData.wishProfile.asks
                      .map((entry) => entry.body)
                      .join(" / ") || "No ask entered."}
                  </dd>
                </div>
                <div>
                  <dt>Constraints</dt>
                  <dd>{dashboardData.wishProfile.constraints || "No constraints listed."}</dd>
                </div>
                <div>
                  <dt>Verification</dt>
                  <dd>
                    {dashboardData.wishProfile.verification_preferences ||
                      "No verification preferences listed."}
                  </dd>
                </div>
                <div>
                  <dt>Uncertainty</dt>
                  <dd>{dashboardData.wishProfile.uncertainty_notes || "No uncertainty notes listed."}</dd>
                </div>
                <div>
                  <dt>Privacy</dt>
                  <dd>
                    {dashboardData.wishProfile.privacy_stage} previews;{" "}
                    {dashboardData.wishProfile.match_frequency} scans;{" "}
                    {dashboardData.wishProfile.notification_dashboard_enabled
                      ? "dashboard alerts"
                      : "no dashboard alerts"}
                    {dashboardData.wishProfile.notification_email_enabled
                      ? "; future email alerts allowed"
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt>Brokerage</dt>
                  <dd>
                    {dashboardData.wishProfile.brokerage_preference ||
                      "No brokerage or payment preference listed."}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="empty-state">
              <div>
                <strong>No private wish profile yet.</strong>
                <p>
                  Use the first-visit interview button to save causes, wishes, offers, asks,
                  constraints, verification preferences, and openness to payment or pledges.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Background networking</p>
            <h2>Possible counterparties</h2>
            <p>
              Suggestions show only enough information to decide whether an introduction is worth
              exploring. Identity details remain gated until both sides opt in.
            </p>
          </div>

          <div className="panel data-card data-card-wide">
            <p className="detail-kicker">Non-AI scan controls</p>
            <h3>Rule-based matching, manual sources, and clarification prompts</h3>
            <p className="route-text">
              This does not connect to social media, email, or chatbot logs. It only uses the
              private registry fields you save, broad public previews, and manual source notes you
              explicitly add.
            </p>
            <div className="offer-footer">
              <div className="tag-row">
                <span className="source-pill">
                  Sources: {dashboardData?.profileSources.length ?? 0}
                </span>
                <span className="source-pill">
                  Open questions:{" "}
                  {dashboardData?.clarificationQuestions.filter(
                    (question) => question.status === "open",
                  ).length ?? 0}
                </span>
                <span className="source-pill">
                  Runs logged: {dashboardData?.backgroundRuns.length ?? 0}
                </span>
              </div>
              <form action={refreshBackgroundMatchesAction}>
                <input name="return_to" type="hidden" value="/dashboard" />
                <button className="button button-primary button-mini" type="submit">
                  Run background scan now
                </button>
              </form>
            </div>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Manual sources</p>
              <h3>Source consent without automatic ingestion</h3>
              <p className="route-text">
                Add a public page, profile summary, or note that could later be reviewed. The app
                stores your note; it does not scrape or analyze the source.
              </p>
              <form action={saveProfileSourceAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <label className="field">
                  <span>Label</span>
                  <input name="source_label" placeholder="Public essay, profile, project page" />
                </label>
                <label className="field">
                  <span>URL</span>
                  <input name="source_url" placeholder="Optional" type="url" />
                </label>
                <label className="field">
                  <span>Notes</span>
                  <textarea
                    name="source_notes"
                    placeholder="Manual summary of why this source is relevant."
                  />
                </label>
                <input name="source_type" type="hidden" value="manual" />
                <input name="source_access_level" type="hidden" value="manual_summary" />
                <button className="button button-secondary button-mini" type="submit">
                  Save source
                </button>
              </form>
              {dashboardData?.errors.profileSources ? (
                <p className="route-text">Could not load source records.</p>
              ) : dashboardData?.profileSources.length ? (
                <ul className="clean-list">
                  {dashboardData.profileSources.slice(0, 4).map((source) => (
                    <li key={source.id}>
                      {source.label}
                      {source.url ? ` (${source.url})` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Clarifying interview</p>
              <h3>Rule-based follow-up questions</h3>
              {dashboardData?.errors.clarificationQuestions ? (
                <p className="route-text">Could not load clarification questions.</p>
              ) : dashboardData?.clarificationQuestions.filter(
                  (question) => question.status === "open",
                ).length ? (
                dashboardData.clarificationQuestions
                  .filter((question) => question.status === "open")
                  .slice(0, 3)
                  .map((question) => (
                    <form action={answerClarificationQuestionAction} className="compact-form" key={question.id}>
                      <input name="question_id" type="hidden" value={question.id} />
                      <input name="return_to" type="hidden" value="/dashboard" />
                      <p className="route-text">
                        <strong>{question.question}</strong>
                      </p>
                      <p className="route-text">{question.reason}</p>
                      <textarea name="answer" placeholder="Answer privately for your own profile." />
                      <div className="offer-actions">
                        <button className="button button-primary button-mini" type="submit">
                          Save answer
                        </button>
                        <button
                          className="button button-secondary button-mini"
                          formAction={dismissClarificationQuestionAction}
                          type="submit"
                        >
                          Dismiss
                        </button>
                      </div>
                    </form>
                  ))
              ) : (
                <p className="route-text">No open clarification questions.</p>
              )}
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Network expansion</p>
              <h3>Draft people or groups to invite</h3>
              <p className="route-text">
                Use this for early-stage adoption: note specific people, collectives, or communities
                that might be valuable counterparties.
              </p>
              <form action={createNetworkInviteAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <label className="field">
                  <span>Person or group</span>
                  <input name="target_label" placeholder="Name or short label" />
                </label>
                <label className="field">
                  <span>Context</span>
                  <input name="target_context" placeholder="Community, cause, or relationship" />
                </label>
                <label className="field">
                  <span>Reason</span>
                  <textarea name="reason" placeholder="Why they might be a useful counterparty." />
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Save draft
                </button>
              </form>
              {dashboardData?.networkInvites.length ? (
                <p className="route-text">
                  Drafts saved: {dashboardData.networkInvites.length}. These are not sent
                  automatically.
                </p>
              ) : null}
            </article>
          </div>

          <div className="data-grid">
            {dashboardData?.errors.matchSuggestions ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load possible counterparties.</strong>
                  <p>The detailed Supabase error was logged on the server.</p>
                </div>
              </div>
            ) : dashboardData?.matchSuggestions.length ? (
              dashboardData.matchSuggestions.map((match) => (
                <article key={match.id} className="panel data-card">
                  <p className="detail-kicker">Possible counterparty</p>
                  <h3>
                    {match.canRevealIdentity && match.counterparty ? (
                      <Link className="inline-link" href={`/people/${match.counterparty.id}`}>
                        {match.counterparty.resolvedName}
                      </Link>
                    ) : (
                      "Identity hidden until mutual consent"
                    )}
                  </h3>
                  <p className="route-text">{match.viewerReason}</p>
                  {match.counterpartyPreview ? (
                    <p className="route-text">
                      Preview: {match.counterpartyPreview.public_preview || "Broad interests only."}
                    </p>
                  ) : null}
                  <div className="tag-row">
                    <span className="badge">{match.status}</span>
                    <span className="impact-pill">Fit score {match.score}/100</span>
                    <span className="source-pill">{match.generatedBy}</span>
                    {match.counterpartyPreview?.causes?.slice(0, 3).map((cause) => (
                      <span className="source-pill" key={`${match.id}-${cause}`}>
                        {cause}
                      </span>
                    ))}
                  </div>
                  {match.matchBasis.length ? (
                    <ul className="clean-list">
                      {match.matchBasis.slice(0, 4).map((basis) => (
                        <li key={`${match.id}-${basis}`}>{basis}</li>
                      ))}
                    </ul>
                  ) : null}
                  {match.suggestedFirstStep ? (
                    <p className="route-text">
                      <strong>Suggested first step:</strong> {match.suggestedFirstStep}
                    </p>
                  ) : null}
                  {match.riskNotes ? <p className="route-text">{match.riskNotes}</p> : null}
                  <div className="offer-footer">
                    <div className="tag-row">
                      <span>{match.viewerConsented ? "You opted in" : "Awaiting your consent"}</span>
                      <span>
                        {match.counterpartyConsented
                          ? "Counterparty opted in"
                          : "Counterparty not yet opted in"}
                      </span>
                    </div>
                    <div className="offer-actions">
                      {!match.viewerConsented ? (
                        <form action={consentToMatchSuggestionAction}>
                          <input name="match_id" type="hidden" value={match.id} />
                          <input name="return_to" type="hidden" value="/dashboard" />
                          <label className="field compact-field">
                            <span>Optional introduction note</span>
                            <textarea
                              name="note"
                              placeholder="Boundaries, preferred first step, or contact constraints."
                            />
                          </label>
                          <button className="button button-primary button-mini" type="submit">
                            Opt in to introduction
                          </button>
                        </form>
                      ) : null}
                      <form action={dismissMatchSuggestionAction}>
                        <input name="match_id" type="hidden" value={match.id} />
                        <input name="return_to" type="hidden" value="/dashboard" />
                        <button className="button button-secondary button-mini" type="submit">
                          Dismiss
                        </button>
                      </form>
                      <form action={reportMatchSuggestionAction} className="compact-form">
                        <input name="match_id" type="hidden" value={match.id} />
                        <input name="return_to" type="hidden" value="/dashboard" />
                        <input name="reason" type="hidden" value="other" />
                        <input
                          name="details"
                          type="hidden"
                          value="Participant asked for review from the dashboard."
                        />
                        <button className="button button-secondary button-mini" type="submit">
                          Report
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No possible counterparties yet.</strong>
                  <p>
                    Save a discoverable private wish profile. Matches are generated only when the
                    safety filter clears the profile and broad previews suggest compatibility.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Notifications</p>
            <h2>Private match alerts</h2>
            <p>Alerts say that a possible moral trade was found without exposing raw wish data.</p>
          </div>

          <div className="data-grid">
            {dashboardData?.errors.wishNotifications ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load match notifications.</strong>
                  <p>The detailed Supabase error was logged on the server.</p>
                </div>
              </div>
            ) : dashboardData?.wishNotifications.length ? (
              dashboardData.wishNotifications.map((notification) => (
                <article key={notification.id} className="panel data-card">
                  <p className="detail-kicker">{notification.kind}</p>
                  <h3>{notification.title}</h3>
                  <p className="route-text">{notification.body}</p>
                  <div className="tag-row">
                    <span className="source-pill">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                    <span className={notification.read_at ? "source-pill" : "badge"}>
                      {notification.read_at ? "Read" : "Unread"}
                    </span>
                  </div>
                  {!notification.read_at ? (
                    <div className="offer-footer">
                      <form action={markWishNotificationReadAction}>
                        <input name="notification_id" type="hidden" value={notification.id} />
                        <input name="return_to" type="hidden" value="/dashboard" />
                        <button className="button button-secondary button-mini" type="submit">
                          Mark read
                        </button>
                      </form>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No private match alerts yet.</strong>
                  <p>When a safe potential moral trade is found, it will appear here first.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Your offers</p>
            <h2>Recent published commitments</h2>
            <p>These recent offers are tied to your public profile and can be rated once agreements complete.</p>
          </div>

          <div className="data-grid">
            {dashboardData?.errors.offers ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load your offers right now.</strong>
                  <p>The dashboard stayed available, and the detailed Supabase error was logged on the server.</p>
                </div>
              </div>
            ) : dashboardData?.offers.length ? (
              dashboardData.offers.map((offer) => (
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
                      {offer.mode === "payment" ? (
                        <span>{formatPaymentCadence(offer)}</span>
                      ) : null}
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
                  <strong>You have not published any commitments yet.</strong>
                  <p>Create your first offer to see it here.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Incoming responses</p>
            <h2>Recent responses to your offers</h2>
            <p>
              These are the responses submitted on your offers, including signed-in members and
              people who chose to participate without creating an account first.
            </p>
          </div>

          <div className="data-grid">
            {dashboardData?.errors.incomingInterests ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load incoming responses right now.</strong>
                  <p>The dashboard stayed available, and the detailed Supabase error was logged on the server.</p>
                </div>
              </div>
            ) : dashboardData?.incomingInterests.length ? (
              dashboardData.incomingInterests.map((interest) => (
                <article key={`${interest.kind}-${interest.id}`} className="panel data-card">
                  <p className="detail-kicker">
                    {interest.kind === "guest" ? "Guest response" : "Incoming response"}
                  </p>
                  <h3>
                    {interest.offer
                      ? `${interest.offer.offered_cause} for ${interest.offer.requested_cause}`
                      : "Offer unavailable"}
                  </h3>
                  <p className="route-text">
                    From{" "}
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
                  </p>
                  <p className="route-text">{interest.message || "No message attached."}</p>
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
                      Submitted {new Date(interest.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="offer-footer">
                    <div className="offer-actions">
                      {interest.offer ? (
                        <Link className="text-button" href={`/offers/${interest.offer.id}`}>
                          View offer
                        </Link>
                      ) : null}
                      {!interest.canCreateAgreement && interest.contactEmail ? (
                        <a className="text-button" href={`mailto:${interest.contactEmail}`}>
                          Email respondent
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No incoming responses yet.</strong>
                  <p>Member and guest responses will appear here when someone responds to one of your offers.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Your interests</p>
            <h2>Recent responses you lodged</h2>
            <p>Each recent response remains tied to a live offer and a public counterparty record.</p>
          </div>

          <div className="data-grid">
            {dashboardData?.errors.interests ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load your interests right now.</strong>
                  <p>The dashboard stayed available, and the detailed Supabase error was logged on the server.</p>
                </div>
              </div>
            ) : dashboardData?.interests.length ? (
              dashboardData.interests.map((interest) => (
                <article key={interest.id} className="panel data-card">
                  <p className="detail-kicker">Interest</p>
                  <h3>
                    {interest.offer
                      ? `${interest.offer.offered_cause} for ${interest.offer.requested_cause}`
                      : "Offer unavailable"}
                  </h3>
                  <p className="route-text">{interest.message || "No message attached."}</p>
                  <div className="tag-row">
                    <span className="badge">{interest.status}</span>
                    {interest.offer?.ownerProfile ? (
                      <Link
                        className="source-pill"
                        href={`/people/${interest.offer.ownerProfile.id}`}
                      >
                        {interest.offer.ownerProfile.resolvedName}
                      </Link>
                    ) : null}
                  </div>
                  <div className="offer-footer">
                    <div className="tag-row">
                      <span>{new Date(interest.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="offer-actions">
                      {interest.offer ? (
                        <Link className="text-button" href={`/offers/${interest.offer.id}`}>
                          View offer
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>You have not responded to any offers yet.</strong>
                  <p>Browse the public directory and register interest in an offer.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Transactions</p>
            <h2>Agreements and ratings</h2>
            <p>Each completed transaction can be rated from 1 to 10 by each party.</p>
          </div>

          <div className="data-grid">
            {dashboardData?.errors.agreements ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load your agreements right now.</strong>
                  <p>The dashboard stayed available, and the detailed Supabase error was logged on the server.</p>
                </div>
              </div>
            ) : dashboardData?.agreements.length ? (
              dashboardData.agreements.map((agreement) => (
                <article key={agreement.id} className="panel data-card">
                  <p className="detail-kicker">Agreement</p>
                  <h3>
                    {agreement.counterparty ? (
                      <Link className="inline-link" href={`/people/${agreement.counterparty.id}`}>
                        {agreement.counterparty.resolvedName}
                      </Link>
                    ) : (
                      "Counterparty"
                    )}
                  </h3>
                  <p className="route-text">
                    {agreement.offer
                      ? `${agreement.offer.offered_cause} for ${agreement.offer.requested_cause}`
                      : "Offer reference unavailable"}
                  </p>
                  <div className="tag-row">
                    <span className="badge">{agreement.status}</span>
                    {agreement.viewerRating ? (
                      <span className="impact-pill">Your rating: {agreement.viewerRating.score}/10</span>
                    ) : null}
                  </div>
                  {agreement.notes ? <p className="route-text">{agreement.notes}</p> : null}
                  {agreement.counterparty ? (
                    <form action={rateAgreementAction} className="stack-form compact-form">
                      <input name="agreement_id" type="hidden" value={agreement.id} />
                      <input name="rated_user_id" type="hidden" value={agreement.counterparty.id} />
                      <input name="return_to" type="hidden" value="/dashboard" />
                      <label className="field">
                        <span>Rate this transaction (1-10)</span>
                        <input
                          defaultValue={agreement.viewerRating?.score ?? 8}
                          max={10}
                          min={1}
                          name="score"
                          type="number"
                        />
                      </label>
                      <div className="form-actions">
                        <button className="button button-secondary button-mini" type="submit">
                          {agreement.viewerRating ? "Update rating" : "Submit rating"}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No agreements yet.</strong>
                  <p>Agreements appear here once one of your offers accepts an interest response.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Cart</p>
            <h2>Offers you are tracking</h2>
            <p>Discounts or reduced burdens published by offer owners will appear here and on the cart page.</p>
          </div>

          <div className="data-grid">
            {dashboardData?.errors.cartItems ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load your cart right now.</strong>
                  <p>The dashboard stayed available, and the detailed Supabase error was logged on the server.</p>
                </div>
              </div>
            ) : dashboardData?.cartItems.length ? (
              dashboardData.cartItems.map((item) =>
                item.offer ? (
                  <article key={item.offer.id} className="panel data-card">
                    <p className="detail-kicker">{formatMode(item.offer.mode)}</p>
                    <h3>{item.offer.offered_cause} for {item.offer.requested_cause}</h3>
                    <p className="route-text">
                      {item.offer.discount_note || "No discount is currently listed for this offer."}
                    </p>
                    <div className="tag-row">
                      <span className="source-pill">
                        {item.offer.ownerProfile?.resolvedName ?? item.offer.owner_alias}
                      </span>
                      <span className="impact-pill">
                        Added {new Date(item.addedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="offer-footer">
                      <div className="offer-actions">
                        <Link className="text-button" href={`/offers/${item.offer.id}`}>
                          View offer
                        </Link>
                        <Link className="text-button" href="/cart">
                          Open cart
                        </Link>
                      </div>
                    </div>
                  </article>
                ) : null,
              )
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No cart items yet.</strong>
                  <p>Add an offer to your cart when you want to track it closely.</p>
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
