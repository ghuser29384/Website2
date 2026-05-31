import type { Metadata } from "next";
import Link from "next/link";

import {
  addAgreementEventAction,
  addCollectiveMemberAction,
  answerClarificationQuestionAction,
  createAgreementPaymentCheckoutAction,
  createBrokerageBountyAction,
  createCollectiveAction,
  createCollectiveDecisionAction,
  createAgreementRoomFromIntroductionPlanAction,
  createMatchConciergeRequestAction,
  createNetworkInviteAction,
  createStripeConnectAccountAction,
  consentToMatchSuggestionAction,
  dismissMatchSuggestionAction,
  dismissClarificationQuestionAction,
  createPrivacyAccessRequestAction,
  markWishNotificationReadAction,
  rateAgreementAction,
  refreshBackgroundMatchesAction,
  refreshProfileSynthesisAction,
  refreshStripeConnectAccountAction,
  reportMatchSuggestionAction,
  respondPrivacyAccessRequestAction,
  saveHelperStrategyAction,
  savePersonalDelegateAction,
  savePrivacyGrantAction,
  saveSearchAction,
  saveSourceConnectionAction,
  saveProfileSourceAction,
  respondCollectiveDecisionAction,
  updateIntroductionTaskAction,
  updateAgreementStatusAction,
} from "@/app/actions";
import {
  createProfileDataRightRequestAction,
  deleteBackgroundNetworkingDataAction,
  saveBackgroundNotificationPreferencesAction,
} from "@/app/background-networking/actions";
import { BackgroundAccountSecurityPanel } from "@/components/dashboard/background-account-security-panel";
import { BackgroundLocalDraftsPanel } from "@/components/dashboard/background-local-drafts-panel";
import { ProfilePortabilityPanel } from "@/components/dashboard/profile-portability-panel";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  buildMatchInboxBadges,
  buildMatchExplanation,
  formatGrantExpiry,
} from "@/lib/background-explanations";
import {
  BACKGROUND_DISCLOSURE_FIELDS,
  formatDisclosureFieldLabel,
  getDefaultGrantExpiryDays,
} from "@/lib/background-disclosure";
import {
  BACKGROUND_DATA_INVENTORY,
  BACKGROUND_NOTIFICATION_CHANNEL_OPTIONS,
  BACKGROUND_NOTIFICATION_EVENT_KIND_OPTIONS,
  BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION,
  BACKGROUND_SELF_SERVE_DELETION_SURFACES,
  PROFILE_DATA_RIGHT_REQUEST_TYPE_OPTIONS,
  PROFILE_DATA_RIGHT_SCOPE_OPTIONS,
  createDefaultBackgroundNotificationPreferences,
  formatBackgroundNotificationChannel,
  formatBackgroundNotificationEventKind,
  getBackgroundNotificationPreferenceKey,
} from "@/lib/background-privacy-controls";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { hasBackgroundFieldEncryptionKey } from "@/lib/background-field-encryption";
import { getDashboardData, requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { formatMode, formatPaymentCadence } from "@/lib/offers";
import { getPriorityCorrectionSummary } from "@/lib/priority-correction";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { hasStripeEnv } from "@/lib/stripe";

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

function formatPaymentAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatCadence(value: number, unit: string) {
  if (unit === "one_time") {
    return "one-time";
  }

  if (unit === "custom_days") {
    return `every ${value} day${value === 1 ? "" : "s"}`;
  }

  return value === 1 ? `every ${unit}` : `every ${value} ${unit}s`;
}

function formatConciergeSla(value: string | null) {
  if (!value) {
    return "No SLA set";
  }

  const dueAt = Date.parse(value);
  if (Number.isNaN(dueAt)) {
    return "SLA date unavailable";
  }

  const diffMs = dueAt - Date.now();
  const hours = Math.max(1, Math.ceil(Math.abs(diffMs) / (60 * 60 * 1000)));

  return diffMs < 0 ? `SLA overdue by ${hours}h` : `SLA due in ${hours}h`;
}

function formatDashboardDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not run yet";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "Date unavailable";
  }

  return new Date(timestamp).toLocaleString();
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const supabaseReady = hasSupabaseEnv();
  const stripeReady = hasStripeEnv();
  const backgroundFieldEncryptionReady = hasBackgroundFieldEncryptionKey();
  const viewer = supabaseReady ? await requireViewer("/dashboard") : null;
  const dashboardData = viewer ? await getDashboardData(viewer.authUser.id) : null;
  const accountSecuritySummary = viewer ? await loadBackgroundAccountSecuritySummary() : null;
  const priorityFundSummary =
    viewer && supabaseReady ? await getPriorityCorrectionSummary(viewer.authUser.id) : null;
  const collectiveNameById = new Map(
    (dashboardData?.collectives ?? []).map((collective) => [collective.id, collective.name]),
  );
  const introductionTasksByPlanId = new Map(
    (dashboardData?.introductionPlans ?? []).map((plan) => [
      plan.id,
      (dashboardData?.introductionTasks ?? [])
        .filter((task) => task.plan_id === plan.id)
        .sort((left, right) => left.sort_order - right.sort_order),
    ]),
  );
  const incomingPrivacyAccessRequests = (dashboardData?.privacyAccessRequests ?? []).filter(
    (request) => request.owner_profile_id === viewer?.authUser.id,
  );
  const outgoingPrivacyAccessRequests = (dashboardData?.privacyAccessRequests ?? []).filter(
    (request) => request.requester_profile_id === viewer?.authUser.id,
  );
  const conciergeRequests = dashboardData?.matchConciergeRequests ?? [];
  const activeConciergeRequests = conciergeRequests.filter(
    (request) => !["declined", "closed"].includes(request.status),
  );
  const latestBackgroundRun = dashboardData?.backgroundRuns[0] ?? null;
  const unreadWishNotificationCount =
    dashboardData?.wishNotifications.filter((notification) => !notification.read_at).length ?? 0;
  const suggestedMatchCount =
    dashboardData?.matchSuggestions.filter((match) => match.status === "suggested").length ?? 0;
  const consentedMatchCount =
    dashboardData?.matchSuggestions.filter((match) => match.viewerConsented).length ?? 0;
  const activeSavedSearchCount =
    dashboardData?.savedSearches.filter((search) => search.status === "active").length ?? 0;
  const scheduledSavedSearchCount =
    dashboardData?.savedSearches.filter(
      (search) => search.status === "active" && search.cadence !== "manual",
    ).length ?? 0;
  const pendingDetailRequestMatchIds = new Set(
    (dashboardData?.privacyAccessRequests ?? [])
      .filter((request) => request.status === "pending" && request.match_id)
      .map((request) => request.match_id as string),
  );
  const conciergeReviewMatchIds = new Set(
    activeConciergeRequests
      .filter((request) => request.match_id)
      .map((request) => request.match_id as string),
  );
  const reportedMatchIds = new Set(
    (dashboardData?.matchReports ?? [])
      .filter((report) => report.status === "open")
      .map((report) => report.match_id),
  );
  const latestSnapshotByMatchId = new Map<
    string,
    NonNullable<typeof dashboardData>["matchExplanationSnapshots"][number]
  >();
  for (const snapshot of dashboardData?.matchExplanationSnapshots ?? []) {
    if (!latestSnapshotByMatchId.has(snapshot.match_id)) {
      latestSnapshotByMatchId.set(snapshot.match_id, snapshot);
    }
  }
  const queryBudgetEvents = dashboardData?.backgroundQueryEvents ?? [];
  const limitedQueryEventCount = queryBudgetEvents.filter((event) => event.was_limited).length;
  const queryCostUsed = queryBudgetEvents
    .filter((event) => !event.was_limited)
    .reduce((total, event) => total + event.cost, 0);
  const profileMissingFields = dashboardData?.profileSynthesis?.missing_fields ?? [];
  const profileCompletenessTotal = 9;
  const profileCompletenessDone = Math.max(
    0,
    profileCompletenessTotal - profileMissingFields.length,
  );
  const notificationPreferenceRows =
    dashboardData?.backgroundNotificationPreferences.length || !viewer
      ? (dashboardData?.backgroundNotificationPreferences ?? []).map((preference) => ({
          channel: preference.channel,
          digestCadence: preference.digest_cadence,
          enabled: preference.enabled,
          eventKind: preference.event_kind,
          profileId: preference.profile_id,
        }))
      : createDefaultBackgroundNotificationPreferences(viewer.authUser.id);
  const enabledNotificationPreferenceKeys = new Set(
    notificationPreferenceRows
      .filter((preference) => preference.enabled)
      .map((preference) =>
        getBackgroundNotificationPreferenceKey(preference.eventKind, preference.channel),
      ),
  );
  const activePrivacyGrantCount =
    dashboardData?.privacyGrants.filter((grant) => grant.status === "granted").length ?? 0;
  const openDataRightRequestCount =
    dashboardData?.profileDataRightRequests.filter((request) =>
      ["open", "in_review"].includes(request.status),
    ).length ?? 0;
  const operatorVisibleDisclosureCount =
    (dashboardData?.matchReports.length ?? 0) +
    (dashboardData?.matchConciergeRequests.length ?? 0) +
    (dashboardData?.riskSignals.filter((signal) => signal.status === "open").length ?? 0);

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
                  your public profile, offers, interests, agreements, ratings, and saved offers.
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
                <Link className="button button-secondary" href="/saved-offers">
                  Open saved offers
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
                  <strong>Agreements and saved offers</strong>
                  <p>
                    Showing recent items: {dashboardData?.agreements.length ?? 0} agreement(s) |{" "}
                    {dashboardData?.cartItems.length ?? 0} saved offer(s)
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
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

        {viewer ? <ProfilePortabilityPanel /> : null}

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Priority Correction Fund</p>
            <h2>Monthly correction pool</h2>
            <p>
              This section tracks the current month&apos;s fund, your own share of it, and whether
              you have been assigned an arbiter role.
            </p>
          </div>

          <div className="panel data-card data-card-wide">
            {priorityFundSummary?.currentCycle ? (
              <>
                <div className="tag-row">
                  <span className="badge">
                    {priorityFundSummary.currentCycle.status.replaceAll("_", " ")}
                  </span>
                  <span className="source-pill">
                    Fund {formatPaymentAmount(priorityFundSummary.currentCycle.published_fund_cents, "usd")}
                  </span>
                </div>
                <p className="route-text">
                  Published for {new Date(priorityFundSummary.currentCycle.cycle_month).toLocaleDateString()}.
                  {priorityFundSummary.viewerSnapshot
                    ? ` Your current share this month is ${formatPaymentAmount(priorityFundSummary.viewerSnapshot.fund_share_cents, "usd")}.`
                    : " You do not have a current member snapshot yet."}
                </p>
                <p className="route-text">
                  {priorityFundSummary.viewerAssignments.length
                    ? `You are assigned to ${priorityFundSummary.viewerAssignments.length} arbiter role(s) this cycle.`
                    : "You are not assigned to an arbiter role this cycle."}
                </p>
                <div className="form-actions">
                  <Link className="button button-secondary button-mini" href="/priority-correction-fund">
                    Open fund page
                  </Link>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No Priority Correction Fund cycle has been published yet.</strong>
                  <p>Once the current month is published, your dashboard will summarize it here.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Payments</p>
            <h2>Stripe Connect setup</h2>
            <p>
              Payment-mediated trades use Stripe Checkout and Connect destination charges. This is
              not legal escrow; the platform records payment state and supports refunds/disputes
              through Stripe workflows.
            </p>
          </div>

          <div className="panel data-card data-card-wide">
            {!stripeReady ? (
              <div className="empty-state">
                <div>
                  <strong>Stripe is not configured yet.</strong>
                  <p>Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and SUPABASE_SERVICE_ROLE_KEY in Vercel before live payments.</p>
                </div>
              </div>
            ) : dashboardData?.errors.paymentAccount ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load your payment account.</strong>
                  <p>The detailed Supabase error was logged on the server.</p>
                </div>
              </div>
            ) : dashboardData?.paymentAccount ? (
              <>
                <div className="tag-row">
                  <span className="badge">
                    {dashboardData.paymentAccount.charges_enabled &&
                    dashboardData.paymentAccount.payouts_enabled
                      ? "Ready to receive payments"
                      : "Onboarding incomplete"}
                  </span>
                  <span className="source-pill">
                    {dashboardData.paymentAccount.details_submitted
                      ? "Details submitted"
                      : "Details needed"}
                  </span>
                </div>
                <p className="route-text">
                  Stripe account {dashboardData.paymentAccount.stripe_account_id}. Refresh this
                  status after completing onboarding.
                </p>
                <div className="form-actions">
                  <form action={createStripeConnectAccountAction}>
                    <input name="return_to" type="hidden" value="/dashboard" />
                    <button className="button button-primary button-mini" type="submit">
                      Continue onboarding
                    </button>
                  </form>
                  <form action={refreshStripeConnectAccountAction}>
                    <input name="return_to" type="hidden" value="/dashboard" />
                    <button className="button button-secondary button-mini" type="submit">
                      Refresh status
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <>
                <p className="route-text">
                  Connect a Stripe Express account before another party can route payment to you.
                </p>
                <form action={createStripeConnectAccountAction}>
                  <input name="return_to" type="hidden" value="/dashboard" />
                  <button className="button button-primary" type="submit">
                    Connect Stripe
                  </button>
                </form>
              </>
            )}
          </div>
        </section>

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
            <p className="detail-kicker">Match inbox</p>
            <h3>Background networking status</h3>
            <p className="route-text">
              Scans use only your saved wish profile, broad registry previews, saved searches, and
              manual source summaries. They do not read private feeds, send outreach, or reveal
              exact wishes without consent.
            </p>
            <dl className="values-summary compact-summary">
              <div>
                <dt>Last scan</dt>
                <dd>
                  {formatDashboardDateTime(
                    latestBackgroundRun?.completed_at ?? latestBackgroundRun?.created_at,
                  )}
                </dd>
              </div>
              <div>
                <dt>Last result</dt>
                <dd>
                  {latestBackgroundRun
                    ? `${latestBackgroundRun.status}; ${latestBackgroundRun.matches_created} new, ${latestBackgroundRun.matches_refreshed} refreshed, ${latestBackgroundRun.candidates_scanned} scanned`
                    : "Run a scan after saving a discoverable wish profile."}
                </dd>
              </div>
              <div>
                <dt>Open matches</dt>
                <dd>
                  {suggestedMatchCount} suggested; {consentedMatchCount} with your opt-in
                </dd>
              </div>
              <div>
                <dt>Unread alerts</dt>
                <dd>{unreadWishNotificationCount}</dd>
              </div>
              <div>
                <dt>Saved searches</dt>
                <dd>
                  {activeSavedSearchCount} active; {scheduledSavedSearchCount} scheduled
                </dd>
              </div>
              <div>
                <dt>Query budget</dt>
                <dd>
                  {queryCostUsed} cost unit(s) used; {limitedQueryEventCount} limited event(s)
                </dd>
              </div>
              <div>
                <dt>Provenance</dt>
                <dd>
                  {dashboardData?.matchExplanationSnapshots.length ?? 0} explanation snapshot(s)
                </dd>
              </div>
            </dl>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Privacy dashboard</p>
              <h3>Data map and active controls</h3>
              <dl className="values-summary compact-summary">
                <div>
                  <dt>Inventory</dt>
                  <dd>{BACKGROUND_DATA_INVENTORY.length} surfaces mapped</dd>
                </div>
                <div>
                  <dt>Active grants</dt>
                  <dd>{activePrivacyGrantCount}</dd>
                </div>
                <div>
                  <dt>Data-right requests</dt>
                  <dd>
                    {openDataRightRequestCount} open;{" "}
                    {dashboardData?.profileDataRightRequests.length ?? 0} recent
                  </dd>
                </div>
                <div>
                  <dt>Operator-visible</dt>
                  <dd>{operatorVisibleDisclosureCount} review item(s)</dd>
                </div>
                <div>
                  <dt>Authenticated cache</dt>
                  <dd>Private, no-store</dd>
                </div>
                <div>
                  <dt>Field encryption</dt>
                  <dd>{backgroundFieldEncryptionReady ? "Configured for new private text" : "Configuration required"}</dd>
                </div>
                <div>
                  <dt>Account security</dt>
                  <dd>{accountSecuritySummary?.statusLabel ?? "MFA unavailable"}</dd>
                </div>
              </dl>
              <div className="mini-list">
                {BACKGROUND_DATA_INVENTORY.map((item) => (
                  <div className="mini-list-item" key={item.surface}>
                    <strong>{item.label}</strong>
                    <span>{item.classification}</span>
                    <span>{item.retention}</span>
                    <span>{item.control}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Notification controls</p>
              <h3>Inbox plus digest defaults</h3>
              <form action={saveBackgroundNotificationPreferencesAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <div className="mini-list">
                  {BACKGROUND_NOTIFICATION_EVENT_KIND_OPTIONS.map((eventKind) => (
                    <div className="mini-list-item" key={eventKind.value}>
                      <strong>{eventKind.label}</strong>
                      <span>{eventKind.description}</span>
                      <div className="filter-option-list">
                        {BACKGROUND_NOTIFICATION_CHANNEL_OPTIONS.map((channel) => {
                          const key = getBackgroundNotificationPreferenceKey(
                            eventKind.value,
                            channel.value,
                          );

                          return (
                            <label className="check-row" key={key}>
                              <input
                                defaultChecked={enabledNotificationPreferenceKeys.has(key)}
                                name="enabled_preferences"
                                type="checkbox"
                                value={key}
                              />
                              <span>{channel.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="button button-secondary button-mini" type="submit">
                  Save notification settings
                </button>
              </form>
              {dashboardData?.errors.backgroundNotificationPreferences ? (
                <p className="route-text">Could not load notification preferences.</p>
              ) : notificationPreferenceRows.length ? (
                <p className="route-text">
                  Enabled:{" "}
                  {notificationPreferenceRows
                    .filter((preference) => preference.enabled)
                    .slice(0, 4)
                    .map(
                      (preference) =>
                        `${formatBackgroundNotificationEventKind(preference.eventKind)} via ${formatBackgroundNotificationChannel(preference.channel)}`,
                    )
                    .join("; ") || "none"}
                </p>
              ) : null}
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Data rights</p>
              <h3>Export, correction, deletion, and restriction</h3>
              <div className="offer-actions">
                <Link className="button button-secondary button-mini" href="/api/profile/export">
                  Download export
                </Link>
              </div>
              <form action={createProfileDataRightRequestAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <div className="field-grid">
                  <label className="field">
                    <span>Request</span>
                    <select name="request_type" defaultValue="export">
                      {PROFILE_DATA_RIGHT_REQUEST_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Scope</span>
                    <select name="scope" defaultValue="background_networking">
                      {PROFILE_DATA_RIGHT_SCOPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Details</span>
                  <textarea
                    name="request_details"
                    placeholder="Records to correct, delete, restrict, or include in operator review."
                  />
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Record request
                </button>
              </form>
              <form action={deleteBackgroundNetworkingDataAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <label className="field">
                  <span>Self-serve deletion</span>
                  <input
                    autoComplete="off"
                    name="delete_confirmation"
                    placeholder={BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION}
                  />
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Delete background-networking data
                </button>
              </form>
              <p className="route-text">
                Removes: {BACKGROUND_SELF_SERVE_DELETION_SURFACES.slice(0, 6).join("; ")}.
                Safety and budget audit rows are retained only as redacted or anonymized records.
              </p>
              {dashboardData?.errors.profileDataRightRequests ? (
                <p className="route-text">Could not load data-right requests.</p>
              ) : dashboardData?.profileDataRightRequests.length ? (
                <ul className="clean-list">
                  {dashboardData.profileDataRightRequests.slice(0, 4).map((request) => (
                    <li key={request.id}>
                      {request.request_type} ({request.scope}) · {request.status} · due{" "}
                      {new Date(request.due_at).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>

            <BackgroundAccountSecurityPanel initialSummary={accountSecuritySummary} />
          </div>

          <div className="panel data-card data-card-wide">
            <p className="detail-kicker">State machine</p>
            <h3>Suggestions move through explicit consent stages</h3>
            <p className="route-text">
              A match can move from broad suggestion to opt-in, narrow detail request, operator
              review, introduction plan, and agreement room. Each transition is reversible until
              both parties deliberately continue.
            </p>
            <div className="tag-row">
              {[
                "Suggested",
                "Detail requested",
                "Grant pending",
                "Operator review",
                "Intro ready",
                "Introduced",
                "Archived/reported",
              ].map((stage) => (
                <span className="source-pill" key={stage}>
                  {stage}
                </span>
              ))}
            </div>
          </div>

          <div className="panel data-card data-card-wide">
            <p className="detail-kicker">Profile completeness</p>
            <h3>Structured elicitation for better matches</h3>
            <p className="route-text">
              {profileCompletenessDone}/{profileCompletenessTotal} profile surfaces are filled in.
              Open prompts are generated from missing explicit fields, not private-feed inference.
            </p>
            <div className="tag-row">
              {profileMissingFields.length ? (
                profileMissingFields.slice(0, 8).map((field) => (
                  <span className="source-pill" key={field}>
                    Missing {field.replaceAll("_", " ")}
                  </span>
                ))
              ) : (
                <span className="source-pill">No missing synthesis fields</span>
              )}
            </div>
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
              <a className="button button-secondary button-mini" href="/api/profile/export">
                Export profile
              </a>
              <a className="button button-secondary button-mini" href="/wish-registry">
                Search broad registry
              </a>
            </div>
          </div>

          <div className="panel data-card data-card-wide">
            <p className="detail-kicker">Private match concierge</p>
            <h3>Request operator help turning intent into an introduction path</h3>
            <p className="route-text">
              Use this when a broad preview, saved wish, or private counterparty idea needs human
              triage before a mutual introduction is appropriate.
            </p>
            <form action={createMatchConciergeRequestAction} className="compact-form">
              <input name="return_to" type="hidden" value="/dashboard" />
              <div className="field-grid">
                <label className="field">
                  <span>Route</span>
                  <select name="route" defaultValue="private_match">
                    <option value="private_match">Private counterparty search</option>
                    <option value="pledge_swap">Bounded pledge swap</option>
                    <option value="donation_offset">Donation offset</option>
                    <option value="mpgf">Moral public-good cycle</option>
                    <option value="other">Other reviewed request</option>
                  </select>
                </label>
                <label className="field">
                  <span>Cause areas</span>
                  <input
                    defaultValue={dashboardData?.wishProfile?.causes.join(", ") ?? ""}
                    name="cause_areas_json"
                    placeholder="Animal welfare, global poverty, public health"
                  />
                </label>
              </div>
              <label className="field">
                <span>Structured intent</span>
                <textarea
                  name="intent_summary"
                  placeholder="What real introduction would help you decide whether a bounded moral trade is possible?"
                  required
                  rows={3}
                />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span>Offer</span>
                  <textarea
                    name="offer_summary"
                    placeholder="What you can offer, pledge, donate, verify, or do."
                    rows={3}
                  />
                </label>
                <label className="field">
                  <span>Ask</span>
                  <textarea
                    name="ask_summary"
                    placeholder="The counterparty action, evidence, or conversation you want."
                    rows={3}
                  />
                </label>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Constraints</span>
                  <textarea
                    name="constraints"
                    placeholder="Privacy boundaries, safety concerns, deal breakers, or needed consent steps."
                    rows={3}
                  />
                </label>
                <label className="field">
                  <span>Timeline</span>
                  <input name="desired_timeline" placeholder="e.g. Intro decision within a week" />
                </label>
              </div>
              <button className="button button-primary button-mini" type="submit">
                Request concierge review
              </button>
            </form>
            <div className="mini-list">
              {activeConciergeRequests.length ? (
                activeConciergeRequests.slice(0, 5).map((request) => (
                  <div className="mini-list-item" key={request.id}>
                    <strong>
                      {request.status.replaceAll("_", " ")} | {request.route.replaceAll("_", " ")}
                    </strong>
                    <span>{formatConciergeSla(request.sla_due_at)}</span>
                    <span>{request.intent_summary}</span>
                    {request.target_preview ? <span>Target: {request.target_preview}</span> : null}
                    {request.operator_notes ? <span>Operator: {request.operator_notes}</span> : null}
                    {request.risk_notes ? <span>Risk: {request.risk_notes}</span> : null}
                  </div>
                ))
              ) : (
                <div className="mini-list-item">
                  <strong>No active concierge requests.</strong>
                  <span>Requests from this form and the registry will appear here.</span>
                </div>
              )}
            </div>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Personal delegate</p>
              <h3>Durable instructions for background search</h3>
              <p className="route-text">
                This is not an AI agent yet. It records stable goals and operating limits that
                scheduled non-AI helper runs can obey.
              </p>
              <form action={savePersonalDelegateAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <label className="field">
                  <span>Label</span>
                  <input
                    defaultValue={dashboardData?.personalDelegate?.label ?? "Personal delegate"}
                    name="label"
                  />
                </label>
                <label className="field">
                  <span>Goals</span>
                  <textarea
                    defaultValue={dashboardData?.personalDelegate?.goals.join(", ") ?? ""}
                    name="goals_json"
                    placeholder="Find vegetarianism-for-funding trades; locate animal welfare counterparties"
                  />
                </label>
                <label className="field">
                  <span>Search scope</span>
                  <textarea
                    defaultValue={dashboardData?.personalDelegate?.search_scope ?? ""}
                    name="search_scope"
                    placeholder="Boundaries, communities, locations, or cause areas to search first."
                  />
                </label>
                <div className="field-grid">
                  <label className="field">
                    <span>Mode</span>
                    <select
                      defaultValue={dashboardData?.personalDelegate?.operating_mode ?? "passive"}
                      name="operating_mode"
                    >
                      <option value="passive">Passive</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Risk tolerance</span>
                    <select
                      defaultValue={dashboardData?.personalDelegate?.risk_tolerance ?? "conservative"}
                      name="risk_tolerance"
                    >
                      <option value="conservative">Conservative</option>
                      <option value="moderate">Moderate</option>
                      <option value="exploratory">Exploratory</option>
                    </select>
                  </label>
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>Introductions</span>
                    <select
                      defaultValue={
                        dashboardData?.personalDelegate?.introduction_policy ?? "ask_each_time"
                      }
                      name="introduction_policy"
                    >
                      <option value="ask_each_time">Ask each time</option>
                      <option value="auto_draft_only">Draft only</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Weekly cap</span>
                    <input
                      defaultValue={dashboardData?.personalDelegate?.max_weekly_suggestions ?? 5}
                      max={50}
                      min={0}
                      name="max_weekly_suggestions"
                      type="number"
                    />
                  </label>
                </div>
                <button className="button button-secondary button-mini" type="submit">
                  Save delegate
                </button>
              </form>
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Consent ledger</p>
              <h3>External source connections</h3>
              <p className="route-text">
                Record what could be connected later. This stores consent and scope only; no
                social, email, calendar, or chatbot data is imported.
              </p>
              <form action={saveSourceConnectionAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <label className="field">
                  <span>Provider</span>
                  <select name="provider" defaultValue="manual">
                    <option value="manual">Manual</option>
                    <option value="social">Social media</option>
                    <option value="blog">Blog or website</option>
                    <option value="email">Email</option>
                    <option value="calendar">Calendar</option>
                    <option value="chat_history">Chat history</option>
                    <option value="search_profile">Search profile</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="field">
                  <span>Label</span>
                  <input name="label" placeholder="Public blog, calendar, chatbot archive" />
                </label>
                <label className="field">
                  <span>URL or reference</span>
                  <input name="url" placeholder="Optional" />
                </label>
                <div className="field-grid">
                  <label className="field">
                    <span>Status</span>
                    <select name="access_status" defaultValue="not_connected">
                      <option value="not_connected">Not connected</option>
                      <option value="needs_review">Needs review</option>
                      <option value="connected">Connected</option>
                      <option value="revoked">Revoked</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Scope</span>
                    <input name="access_scope" placeholder="Metadata only, manual summary, etc." />
                  </label>
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>Import mode</span>
                    <select name="import_mode" defaultValue="manual_review">
                      <option value="manual_review">Manual review</option>
                      <option value="manual_paste">Manual paste</option>
                      <option value="rss_pull">RSS or feed pull</option>
                      <option value="forwarded_note">Forwarded note</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Sync frequency</span>
                    <select name="sync_frequency" defaultValue="manual">
                      <option value="manual">Manual</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Consent notes</span>
                  <textarea name="consent_notes" placeholder="What may be used, what must stay private." />
                </label>
                <label className="field">
                  <span>Latest import summary</span>
                  <textarea
                    name="last_sync_summary"
                    placeholder="What would a manual import contain, and what still needs review?"
                  />
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Record connection
                </button>
              </form>
              {dashboardData?.sourceConnections.length ? (
                <ul className="clean-list">
                  {dashboardData.sourceConnections.slice(0, 4).map((connection) => (
                    <li key={connection.id}>
                      {connection.label} ({connection.provider}, {connection.access_status}, {connection.import_mode})
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Synthesis layer</p>
              <h3>Deterministic profile summary</h3>
              <p className="route-text">
                A structured summary of hopes, intent, capabilities, constraints, and uncertainty
                built from fields you entered, not generated by AI.
              </p>
              {dashboardData?.profileSynthesis ? (
                <dl className="values-summary compact-summary">
                  <div>
                    <dt>Hopes</dt>
                    <dd>{dashboardData.profileSynthesis.hopes}</dd>
                  </div>
                  <div>
                    <dt>Intent</dt>
                    <dd>{dashboardData.profileSynthesis.intent}</dd>
                  </div>
                  <div>
                    <dt>Capabilities</dt>
                    <dd>{dashboardData.profileSynthesis.capabilities}</dd>
                  </div>
                  <div>
                    <dt>Confidence</dt>
                    <dd>{dashboardData.profileSynthesis.confidence_score}/100</dd>
                  </div>
                </dl>
              ) : (
                <p className="route-text">No synthesis record yet.</p>
              )}
              <form action={refreshProfileSynthesisAction}>
                <input name="return_to" type="hidden" value="/dashboard" />
                <button className="button button-secondary button-mini" type="submit">
                  Refresh synthesis
                </button>
              </form>
            </article>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Helper marketplace</p>
              <h3>Multiple non-AI search strategies</h3>
              <p className="route-text">
                Strategies let background jobs behave like specialized helpers without using AI:
                cause overlap, payments, geography, outreach, saved searches, and risk filtering.
              </p>
              <form action={saveHelperStrategyAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <label className="field">
                  <span>Strategy</span>
                  <select name="helper_kind" defaultValue="cause_overlap">
                    <option value="cause_overlap">Cause overlap</option>
                    <option value="payment_compatibility">Payment compatibility</option>
                    <option value="geographic">Geographic</option>
                    <option value="network_expansion">Network expansion</option>
                    <option value="saved_search">Saved search</option>
                    <option value="risk_filter">Risk filter</option>
                  </select>
                </label>
                <label className="field">
                  <span>Label</span>
                  <input name="label" placeholder="Find animal welfare payment trades" />
                </label>
                <label className="field">
                  <span>Priority</span>
                  <input defaultValue={3} max={5} min={1} name="priority" type="number" />
                </label>
                <label className="field">
                  <span>Minimum score</span>
                  <input defaultValue={55} max={100} min={0} name="min_score" type="number" />
                </label>
                <label className="field">
                  <span>Focus causes</span>
                  <input name="focus_causes_json" placeholder="Animal welfare, S-risks" />
                </label>
                <label className="field">
                  <span>Required terms</span>
                  <input name="required_terms_json" placeholder="vegetarian, offsets, receipts" />
                </label>
                <label className="field">
                  <span>Preferred regions</span>
                  <input name="preferred_regions_json" placeholder="London, Bay Area, Remote" />
                </label>
                <div className="field-grid">
                  <label className="field">
                    <span>Max missing fields</span>
                    <input
                      defaultValue={9}
                      max={12}
                      min={0}
                      name="max_missing_fields"
                      type="number"
                    />
                  </label>
                </div>
                <label className="field checkbox-field">
                  <input name="require_verification" type="checkbox" />
                  <span>Require both sides to record verification preferences</span>
                </label>
                <label className="field checkbox-field">
                  <input name="prefer_existing_sources" type="checkbox" />
                  <span>Prefer profiles with attached source material or connection records</span>
                </label>
                <label className="field checkbox-field">
                  <input name="respect_strict_privacy" type="checkbox" />
                  <span>Respect strict-privacy profiles and skip early-stage outreach</span>
                </label>
                <label className="field checkbox-field">
                  <input name="require_collective_approval" type="checkbox" />
                  <span>Require collective or institutional counterparts to look governance-ready</span>
                </label>
                <label className="field">
                  <span>Strategy notes</span>
                  <textarea
                    name="strategy_notes"
                    placeholder="What kind of counterparty should this deterministic helper prioritize?"
                  />
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Add strategy
                </button>
              </form>
              {dashboardData?.helperStrategies.length ? (
                <ul className="clean-list">
                  {dashboardData.helperStrategies.slice(0, 5).map((strategy) => (
                    <li key={strategy.id}>
                      {strategy.label} ({strategy.helper_kind}, priority {strategy.priority})
                    </li>
                  ))}
                </ul>
              ) : null}
              {dashboardData?.helperRuns.length ? (
                <p className="route-text">
                  Recent helper runs: {dashboardData.helperRuns.length}. Latest:{" "}
                  {dashboardData.helperRuns[0]?.status ?? "none"}.
                </p>
              ) : null}
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Consent-gated next steps</p>
              <h3>Introduction plans after mutual opt-in</h3>
              <p className="route-text">
                When both sides consent, the app drafts a concrete intro, agenda, verification
                plan, and privacy note. It still does not send introductions automatically.
              </p>
              {dashboardData?.introductionPlans.length ? (
                <div className="mini-list">
                  {dashboardData.introductionPlans.slice(0, 4).map((plan) => (
                    <div className="mini-list-item" key={plan.id}>
                      <strong>{plan.status}: {plan.intro_message}</strong>
                      <span>
                        <strong>Proposal outline:</strong> {plan.proposal_outline}
                      </span>
                      <span>
                        <strong>Agenda:</strong> {plan.agenda}
                      </span>
                      <span>
                        <strong>Terms:</strong> {plan.proposal_terms}
                      </span>
                      <span>
                        <strong>Timeline:</strong> {plan.timeline}
                      </span>
                      <span>
                        <strong>Next actions:</strong> {plan.next_actions}
                      </span>
                      <span>
                        <strong>Verification:</strong> {plan.verification_plan}
                      </span>
                      <span>
                        <strong>Privacy:</strong> {plan.privacy_notes}
                      </span>
                      <form action={createAgreementRoomFromIntroductionPlanAction} className="compact-form">
                        <input name="plan_id" type="hidden" value={plan.id} />
                        <input name="return_to" type="hidden" value="/dashboard" />
                        <button className="button button-primary button-mini" type="submit">
                          Open agreement room
                        </button>
                      </form>
                      {introductionTasksByPlanId.get(plan.id)?.length ? (
                        <div className="mini-list">
                          {introductionTasksByPlanId.get(plan.id)?.map((task) => (
                            <div className="mini-list-item" key={task.id}>
                              <strong>
                                Step {task.sort_order}: {task.title}
                              </strong>
                              <span>{task.detail}</span>
                              <span>Status: {task.status}</span>
                              {task.note ? <span>Note: {task.note}</span> : null}
                              <form action={updateIntroductionTaskAction} className="compact-form">
                                <input name="task_id" type="hidden" value={task.id} />
                                <input name="return_to" type="hidden" value="/dashboard" />
                                <div className="field-grid">
                                  <label className="field">
                                    <span>Task status</span>
                                    <select name="status" defaultValue={task.status}>
                                      <option value="pending">Pending</option>
                                      <option value="in_progress">In progress</option>
                                      <option value="done">Done</option>
                                      <option value="skipped">Skipped</option>
                                    </select>
                                  </label>
                                  <label className="field">
                                    <span>Task note</span>
                                    <input
                                      defaultValue={task.note}
                                      name="note"
                                      placeholder="What changed, or what is still blocked?"
                                    />
                                  </label>
                                </div>
                                <button className="button button-secondary button-mini" type="submit">
                                  Update task
                                </button>
                              </form>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="route-text">No introduction plans yet.</p>
              )}
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Field-level privacy</p>
              <h3>Grant specific facts for a purpose and time box</h3>
              <p className="route-text">
                Use grants to decide which facts can move from hidden to broad, specific, or
                contact-level visibility for a match or counterparty. Prefer intro-specific grants
                that expire, then renew only if both sides still need the detail.
              </p>
              <form action={savePrivacyGrantAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <label className="field">
                  <span>Field</span>
                  <select name="field_key" defaultValue="exact_wish">
                    {BACKGROUND_DISCLOSURE_FIELDS.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="field-grid">
                  <label className="field">
                    <span>Access</span>
                    <select name="access_level" defaultValue="specific">
                      <option value="hidden">Hidden</option>
                      <option value="broad">Broad</option>
                      <option value="specific">Specific</option>
                      <option value="contact">Contact</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select name="status" defaultValue="draft">
                      <option value="draft">Draft</option>
                      <option value="granted">Granted</option>
                      <option value="revoked">Revoked</option>
                    </select>
                  </label>
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>Stage</span>
                    <select name="audience_stage" defaultValue="consent">
                      <option value="registry">Registry</option>
                      <option value="consent">After consent</option>
                      <option value="introduced">After introduction</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Expires in days</span>
                    <input
                      defaultValue={getDefaultGrantExpiryDays("consent")}
                      name="expires_in_days"
                      type="number"
                      min="0"
                      max="3650"
                    />
                  </label>
                </div>
                <label className="field">
                  <span>Purpose</span>
                  <input
                    name="purpose"
                    placeholder="Which bounded intro decision needs this fact?"
                    required
                  />
                </label>
                <label className="field">
                  <span>Match ID</span>
                  <input name="match_id" placeholder="Optional" />
                </label>
                <label className="field">
                  <span>Counterparty ID</span>
                  <input name="counterparty_id" placeholder="Optional" />
                </label>
                <label className="field">
                  <span>Purpose and limits</span>
                  <textarea
                    name="notes"
                    placeholder="Purpose: decide whether this specific intro is safe. Limits: no onward sharing, no contact use outside this request."
                  />
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Save grant
                </button>
              </form>
              {dashboardData?.privacyGrants.length ? (
                <ul className="clean-list">
                  {dashboardData.privacyGrants.slice(0, 5).map((grant) => (
                    <li key={grant.id}>
                      {formatDisclosureFieldLabel(grant.field_key)}: {grant.access_level} at{" "}
                      {grant.audience_stage} ({grant.status}, {formatGrantExpiry(grant.expires_at)})
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="route-text">
                Access requests keep disclosures narrow: ask for specific fields, get an explicit
                answer, and only then create a matching grant.
              </p>
              <form action={createPrivacyAccessRequestAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <label className="field">
                  <span>Owner profile ID</span>
                  <input
                    name="owner_profile_id"
                    placeholder="Which counterparty controls the private fields you want?"
                  />
                </label>
                <div className="field">
                  <span>Requested fields</span>
                  <div className="filter-option-list">
                    {BACKGROUND_DISCLOSURE_FIELDS.map((field) => (
                      <label className="check-row" key={field.key}>
                        <input
                          defaultChecked={field.key === "exact_wish"}
                          name="requested_fields"
                          type="checkbox"
                          value={field.key}
                        />
                        <span>{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <label className="field">
                  <span>Stage</span>
                  <select name="requested_stage" defaultValue="consent">
                    <option value="registry">Registry</option>
                    <option value="consent">After consent</option>
                    <option value="introduced">After introduction</option>
                  </select>
                </label>
                <label className="field">
                  <span>Match ID</span>
                  <input name="match_id" placeholder="Optional, if tied to a specific match" />
                </label>
                <label className="field">
                  <span>Purpose</span>
                  <input
                    name="purpose"
                    placeholder="What bounded decision would this disclosure help you make?"
                    required
                  />
                </label>
                <label className="field">
                  <span>Justification</span>
                  <textarea
                    name="justification"
                    placeholder="Why these fields matter, and why broader disclosure is not needed."
                  />
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Request access
                </button>
              </form>
              {incomingPrivacyAccessRequests.length ? (
                <div className="mini-list">
                  {incomingPrivacyAccessRequests.slice(0, 4).map((request) => (
                    <div className="mini-list-item" key={request.id}>
                      <strong>
                        Incoming request:{" "}
                        {request.requested_fields.map(formatDisclosureFieldLabel).join(", ")}
                      </strong>
                      <span>
                        Stage {request.requested_stage} · {request.status}
                      </span>
                      {request.purpose ? <span>Purpose: {request.purpose}</span> : null}
                      {request.justification ? <span>Why requested: {request.justification}</span> : null}
                      <form action={respondPrivacyAccessRequestAction} className="compact-form">
                        <input name="request_id" type="hidden" value={request.id} />
                        <input name="return_to" type="hidden" value="/dashboard" />
                        <div className="field-grid">
                          <label className="field">
                            <span>Decision</span>
                            <select name="status" defaultValue="approved">
                              <option value="approved">Approve</option>
                              <option value="denied">Deny</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>Grant level</span>
                            <select name="access_level" defaultValue="specific">
                              <option value="broad">Broad</option>
                              <option value="specific">Specific</option>
                              <option value="contact">Contact</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>Expires in days</span>
                            <input
                              defaultValue={getDefaultGrantExpiryDays(request.requested_stage)}
                              min={1}
                              max={3650}
                              name="expires_in_days"
                              type="number"
                            />
                          </label>
                        </div>
                        <label className="field">
                          <span>Purpose limits</span>
                          <input
                            defaultValue={request.owner_note}
                            name="owner_note"
                            placeholder="Conditions, scope, and no-onward-sharing limits for this request."
                          />
                        </label>
                        <button className="button button-secondary button-mini" type="submit">
                          Save response
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              ) : null}
              {outgoingPrivacyAccessRequests.length ? (
                <div className="mini-list">
                  {outgoingPrivacyAccessRequests.slice(0, 4).map((request) => (
                    <div className="mini-list-item" key={request.id}>
                      <strong>
                        Outgoing request:{" "}
                        {request.requested_fields.map(formatDisclosureFieldLabel).join(", ")}
                      </strong>
                      <span>
                        Stage {request.requested_stage} · {request.status}
                      </span>
                      {request.owner_note ? <span>Owner note: {request.owner_note}</span> : null}
                      {request.status === "pending" ? (
                        <form action={respondPrivacyAccessRequestAction} className="compact-form">
                          <input name="request_id" type="hidden" value={request.id} />
                          <input name="return_to" type="hidden" value="/dashboard" />
                          <input name="status" type="hidden" value="withdrawn" />
                          <button className="button button-secondary button-mini" type="submit">
                            Withdraw request
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Brokerage incentives</p>
              <h3>Match bounties and speculative coordination</h3>
              <p className="route-text">
                Record willingness to pay for finding a useful counterparty or group. This is a
                pledge-like signal, not an automatic charge.
              </p>
              <form action={createBrokerageBountyAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <label className="field">
                  <span>Label</span>
                  <input name="label" placeholder="Find a serious digital minds counterparty" />
                </label>
                <div className="field-grid">
                  <label className="field">
                    <span>Target kind</span>
                    <select name="target_kind" defaultValue="counterparty">
                      <option value="counterparty">Counterparty</option>
                      <option value="group">Group</option>
                      <option value="institution">Institution</option>
                      <option value="public_call">Public call</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Reward type</span>
                    <select name="reward_type" defaultValue="introduction">
                      <option value="introduction">Introduction</option>
                      <option value="verified_trade">Verified trade</option>
                      <option value="group_formation">Group formation</option>
                      <option value="research_lead">Research lead</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Cause area</span>
                  <input name="cause_area" placeholder="Digital minds, animal welfare, S-risks" />
                </label>
                <div className="field-grid">
                  <label className="field">
                    <span>Max amount</span>
                    <input name="max_amount" placeholder="100.00" type="number" min="0" step="0.01" />
                  </label>
                  <label className="field">
                    <span>Currency</span>
                    <input defaultValue="usd" name="currency" />
                  </label>
                </div>
                <label className="field">
                  <span>Success condition</span>
                  <textarea name="success_condition" placeholder="What would count as a successful match?" />
                </label>
                <label className="field">
                  <span>Preferred regions</span>
                  <input name="preferred_regions_json" placeholder="Remote, London, Bay Area" />
                </label>
                <label className="field">
                  <span>Target note</span>
                  <textarea name="target_note" placeholder="Any special requirements for the counterparties or groups you want found." />
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Save bounty
                </button>
              </form>
              {dashboardData?.brokerageBounties.length ? (
                <ul className="clean-list">
                  {dashboardData.brokerageBounties.slice(0, 4).map((bounty) => (
                    <li key={bounty.id}>
                      {bounty.label}:{" "}
                      {formatPaymentAmount(bounty.max_amount_cents, bounty.currency)} for{" "}
                      {bounty.reward_type} ({bounty.status})
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Collectives</p>
              <h3>Groups, institutions, and delegated authority</h3>
              <p className="route-text">
                Create a collective record so future workflows can distinguish individual wishes
                from group-level authority and verification.
              </p>
              <form action={createCollectiveAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <label className="field">
                  <span>Name</span>
                  <input name="name" placeholder="Research group, community, institution" />
                </label>
                <label className="field">
                  <span>Description</span>
                  <textarea name="description" placeholder="Purpose, scope, and who can speak for it." />
                </label>
                <label className="field">
                  <span>Homepage</span>
                  <input name="homepage_url" placeholder="https://example.org" type="url" />
                </label>
                <label className="field">
                  <span>Contact policy</span>
                  <textarea name="contact_policy" placeholder="Who may contact the group, through which channel, and with what screening?" />
                </label>
                <label className="field">
                  <span>Decision rule</span>
                  <input name="decision_rule" placeholder="Single owner, 2 approvals, board review, etc." />
                </label>
                <label className="field">
                  <span>Verification notes</span>
                  <textarea name="verification_notes" placeholder="What would make this collective credible to counterparties?" />
                </label>
                <label className="field">
                  <span>Verification</span>
                  <select name="verification_status" defaultValue="unverified">
                    <option value="unverified">Unverified</option>
                    <option value="review_pending">Review pending</option>
                  </select>
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Create collective
                </button>
              </form>
              {dashboardData?.collectives.length ? (
                <ul className="clean-list">
                  {dashboardData.collectives.slice(0, 4).map((collective) => (
                    <li key={collective.id}>
                      {collective.name} ({collective.verification_status}) · ID: {collective.id}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Collective memberships</p>
              <h3>Delegated roles and permissions</h3>
              <p className="route-text">
                Add an existing profile to a collective with scoped authority for matches,
                privacy grants, and bounties. This helps collectives behave like real teams
                before any AI-assisted workflow exists.
              </p>
              <form action={addCollectiveMemberAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <label className="field">
                  <span>Collective ID</span>
                  <input name="collective_id" placeholder="Paste a collective ID from your list above" />
                </label>
                <label className="field">
                  <span>Member profile ID</span>
                  <input name="member_profile_id" placeholder="Profile UUID for the delegated member" />
                </label>
                <div className="field-grid">
                  <label className="field">
                    <span>Role</span>
                    <select name="role" defaultValue="member">
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select name="status" defaultValue="invited">
                      <option value="invited">Invited</option>
                      <option value="active">Active</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Delegation scope</span>
                  <textarea name="delegation_scope" placeholder="What this member is allowed to decide or execute on behalf of the collective." />
                </label>
                <label className="field checkbox-field">
                  <input name="can_approve_matches" type="checkbox" />
                  <span>Can approve introductions and matches</span>
                </label>
                <label className="field checkbox-field">
                  <input name="can_grant_privacy" type="checkbox" />
                  <span>Can grant privacy disclosures</span>
                </label>
                <label className="field checkbox-field">
                  <input name="can_manage_bounties" type="checkbox" />
                  <span>Can manage brokerage bounties</span>
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Save member
                </button>
              </form>
              {dashboardData?.collectiveMemberships.length ? (
                <div className="mini-list">
                  {dashboardData.collectiveMemberships.slice(0, 6).map((membership) => (
                    <div className="mini-list-item" key={`${membership.collective_id}:${membership.profile_id}`}>
                      <strong>
                        {collectiveNameById.get(membership.collective_id) ?? membership.collective_id}
                      </strong>
                      <span>
                        {membership.role} · {membership.status}
                      </span>
                      <span>
                        <strong>Member profile:</strong> {membership.profile_id}
                      </span>
                      <span>
                        <strong>Delegation scope:</strong>{" "}
                        {membership.delegation_scope || "No explicit scope recorded."}
                      </span>
                      <span>
                        Match approvals: {membership.can_approve_matches ? "yes" : "no"} · Privacy:{" "}
                        {membership.can_grant_privacy ? "yes" : "no"} · Bounties:{" "}
                        {membership.can_manage_bounties ? "yes" : "no"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="route-text">No delegated collective memberships yet.</p>
              )}
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Collective decisions</p>
              <h3>Open approvals and delegated responses</h3>
              <p className="route-text">
                Record lightweight group approvals for matches, privacy grants, bounties, and verification requests.
              </p>
              <form action={createCollectiveDecisionAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <label className="field">
                  <span>Collective ID</span>
                  <input name="collective_id" placeholder="Paste a collective ID from your list above" />
                </label>
                <label className="field">
                  <span>Title</span>
                  <input name="title" placeholder="Approve a counterpart introduction" />
                </label>
                <div className="field-grid">
                  <label className="field">
                    <span>Decision type</span>
                    <select name="decision_type" defaultValue="general">
                      <option value="general">General</option>
                      <option value="match_review">Match review</option>
                      <option value="privacy_grant">Privacy grant</option>
                      <option value="bounty_award">Bounty award</option>
                      <option value="verification_request">Verification request</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Target kind</span>
                    <select name="target_kind" defaultValue="internal">
                      <option value="internal">Internal</option>
                      <option value="match">Match</option>
                      <option value="collective">Collective</option>
                      <option value="bounty">Bounty</option>
                      <option value="privacy_grant">Privacy grant</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Summary</span>
                  <textarea name="summary" placeholder="What exactly is being approved, rejected, or reviewed?" />
                </label>
                <label className="field">
                  <span>Required approvals</span>
                  <input defaultValue={1} min={1} max={25} name="required_approvals" type="number" />
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Open decision
                </button>
              </form>
              {dashboardData?.collectiveDecisions.length ? (
                <div className="mini-list">
                  {dashboardData.collectiveDecisions.slice(0, 4).map((decision) => (
                    <div className="mini-list-item" key={decision.id}>
                      <strong>{decision.title}</strong>
                      <span>
                        {decision.decision_type} · {decision.status} · requires {decision.required_approvals}
                      </span>
                      <form action={respondCollectiveDecisionAction} className="compact-form">
                        <input name="decision_id" type="hidden" value={decision.id} />
                        <input name="return_to" type="hidden" value="/dashboard" />
                        <div className="field-grid">
                          <label className="field">
                            <span>Your response</span>
                            <select name="response" defaultValue="approve">
                              <option value="approve">Approve</option>
                              <option value="reject">Reject</option>
                              <option value="abstain">Abstain</option>
                            </select>
                          </label>
                          <button className="button button-secondary button-mini" type="submit">
                            Save
                          </button>
                        </div>
                      </form>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="route-text">No collective decisions yet.</p>
              )}
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Risk and audit</p>
              <h3>Safety signals from non-AI checks</h3>
              <p className="route-text">
                Signals are review prompts for underspecified profiles, suspicious patterns, or
                unsafe matching context. They do not block users automatically.
              </p>
              {dashboardData?.riskSignals.length ? (
                <ul className="clean-list">
                  {dashboardData.riskSignals.slice(0, 5).map((signal) => (
                    <li key={signal.id}>
                      {signal.severity}: {signal.signal_type} ({signal.status})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="route-text">No risk signals recorded for your profile.</p>
              )}
            </article>
          </div>

          <div className="data-grid">
            <BackgroundLocalDraftsPanel />

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
                  <span>Content kind</span>
                  <select name="source_content_kind" defaultValue="manual_summary">
                    <option value="manual_summary">Manual summary</option>
                    <option value="pasted_excerpt">Pasted excerpt</option>
                    <option value="public_post">Public post</option>
                    <option value="email_note">Email note</option>
                    <option value="chat_note">Chat note</option>
                    <option value="calendar_note">Calendar note</option>
                  </select>
                </label>
                <label className="field">
                  <span>Notes</span>
                  <textarea
                    name="source_notes"
                    placeholder="Manual summary of why this source is relevant."
                  />
                </label>
                <label className="field">
                  <span>Snapshot excerpt</span>
                  <textarea
                    name="snapshot_excerpt"
                    placeholder="Optional excerpt or condensed snapshot to feed deterministic synthesis."
                  />
                </label>
                <label className="field">
                  <span>Captured tags</span>
                  <input name="captured_tags" placeholder="animal welfare, receipts, local, vegetarian" />
                </label>
                <label className="field checkbox-field">
                  <input defaultChecked name="needs_review" type="checkbox" />
                  <span>Needs manual review before relying on it</span>
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
                      {source.snapshot_excerpt ? ` — ${source.snapshot_excerpt}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>

            <article className="panel data-card" id="saved-searches">
              <p className="detail-kicker">Saved searches</p>
              <h3>Run durable match searches</h3>
              <p className="route-text">
                Save recurring search intent now; background workers can later use these records
                for scheduled, rate-limited matching.
              </p>
              <form action={saveSearchAction} className="compact-form">
                <input name="return_to" type="hidden" value="/dashboard" />
                <label className="field">
                  <span>Label</span>
                  <input name="label" placeholder="Animal welfare payment trades" />
                </label>
                <label className="field">
                  <span>Causes</span>
                  <input name="causes_json" placeholder="Animal welfare, S-risks" />
                </label>
                <label className="field">
                  <span>Search description</span>
                  <textarea name="query" placeholder="What kind of counterparty or offer should this search look for?" />
                </label>
                <div className="field-grid">
                  <label className="field">
                    <span>Minimum score</span>
                    <input defaultValue={50} max={100} min={0} name="min_score" type="number" />
                  </label>
                  <label className="field">
                    <span>Cadence</span>
                    <select defaultValue="weekly" name="cadence">
                      <option value="manual">Manual</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                </div>
                <button className="button button-secondary button-mini" type="submit">
                  Save search
                </button>
              </form>
              {dashboardData?.errors.savedSearches ? (
                <p className="route-text">Could not load saved searches.</p>
              ) : dashboardData?.savedSearches.length ? (
                <ul className="clean-list">
                  {dashboardData.savedSearches.slice(0, 4).map((search) => (
                    <li key={search.id}>
                      {search.label} ({search.cadence}, score {search.min_score}+)
                      {search.last_scanned_at
                        ? `; last scanned ${new Date(search.last_scanned_at).toLocaleDateString()}`
                        : ""}
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
                  <span>Target kind</span>
                  <select name="target_kind" defaultValue="person">
                    <option value="person">Person</option>
                    <option value="collective">Collective</option>
                    <option value="institution">Institution</option>
                    <option value="community">Community</option>
                    <option value="public_call">Public call</option>
                  </select>
                </label>
                <label className="field">
                  <span>Person or group</span>
                  <input name="target_label" placeholder="Name or short label" />
                </label>
                <label className="field">
                  <span>URL or reference</span>
                  <input name="target_url" placeholder="Optional" type="url" />
                </label>
                <label className="field">
                  <span>Context</span>
                  <input name="target_context" placeholder="Community, cause, or relationship" />
                </label>
                <label className="field">
                  <span>Desired capability</span>
                  <input name="desired_capability" placeholder="Donor, organizer, institution, local coordinator" />
                </label>
                <label className="field">
                  <span>Reason</span>
                  <textarea name="reason" placeholder="Why they might be a useful counterparty." />
                </label>
                <label className="field">
                  <span>Suggested outreach message</span>
                  <textarea name="suggested_message" placeholder="Short message you could send if you decide to reach out." />
                </label>
                <label className="field">
                  <span>Priority</span>
                  <input defaultValue={3} max={5} min={1} name="priority" type="number" />
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
              dashboardData.matchSuggestions.map((match) => {
                const latestSnapshot = latestSnapshotByMatchId.get(match.id) ?? null;
                const explanationInput = {
                  canRevealIdentity: match.canRevealIdentity,
                  counterpartyConsented: match.counterpartyConsented,
                  generatedBy: match.generatedBy,
                  hasConciergeReview: conciergeReviewMatchIds.has(match.id),
                  hasOpenDetailRequest: pendingDetailRequestMatchIds.has(match.id),
                  hasOpenReport: reportedMatchIds.has(match.id),
                  matchBasis: match.matchBasis,
                  riskNotes: match.riskNotes,
                  score: match.score,
                  sharedCauses: match.sharedCauses,
                  status: match.status,
                  suggestedFirstStep: match.suggestedFirstStep,
                  viewerConsented: match.viewerConsented,
                };
                const explanation = buildMatchExplanation(explanationInput);
                const inboxBadges = buildMatchInboxBadges(explanationInput);

                return (
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
                    <span className="source-pill">{explanation.workflowStage.label}</span>
                    <span className="impact-pill">Fit score {match.score}/100</span>
                    <span className="source-pill">{explanation.confidenceBand} confidence</span>
                    <span className="source-pill">Trust: {inboxBadges.trustBadge.label}</span>
                    <span className="source-pill">Risk: {inboxBadges.riskBadge.label}</span>
                    <span className="source-pill">{match.generatedBy}</span>
                    {match.counterpartyPreview?.causes?.slice(0, 3).map((cause) => (
                      <span className="source-pill" key={`${match.id}-${cause}`}>
                        {cause}
                      </span>
                    ))}
                  </div>
                  <div className="mini-list">
                    <div className="mini-list-item">
                      <strong>Why you are seeing this</strong>
                      <span>{explanation.summary}</span>
                      <span>{explanation.workflowStage.description}</span>
                    </div>
                    <div className="mini-list-item">
                      <strong>Reason codes</strong>
                      <span>
                        {explanation.reasonCodes.length
                          ? explanation.reasonCodes.join(", ")
                          : "Broad preview compatibility"}
                      </span>
                    </div>
                    <div className="mini-list-item">
                      <strong>Trust and risk badges</strong>
                      <span>
                        {inboxBadges.trustBadge.label}: {inboxBadges.trustBadge.description}
                      </span>
                      <span>
                        {inboxBadges.riskBadge.label}: {inboxBadges.riskBadge.description}
                      </span>
                    </div>
                    <div className="mini-list-item">
                      <strong>Next safe actions</strong>
                      <span>{inboxBadges.participantActions.join(", ")}</span>
                    </div>
                    <div className="mini-list-item">
                      <strong>What was scanned</strong>
                      <span>{explanation.scannedSurfaces.join(", ")}</span>
                      <span>Redacted here: {explanation.redactedSurfaces.join(", ")}</span>
                    </div>
                    {latestSnapshot ? (
                      <div className="mini-list-item">
                        <strong>Stored provenance snapshot</strong>
                        <span>
                          {latestSnapshot.explanation_version} · {latestSnapshot.workflow_stage} ·{" "}
                          score bucket {latestSnapshot.score_bucket}
                        </span>
                        <span>
                          Source: {latestSnapshot.source_run_kind}
                          {latestSnapshot.source_run_id ? `/${latestSnapshot.source_run_id.slice(0, 8)}` : ""}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  {match.suggestedFirstStep ? (
                    <p className="route-text">
                      <strong>Suggested first step:</strong> {match.suggestedFirstStep}
                    </p>
                  ) : null}
                  {match.riskNotes ? <p className="route-text">{match.riskNotes}</p> : null}
                  {match.viewerConsented && match.counterpartyId ? (
                    <form action={createPrivacyAccessRequestAction} className="compact-form">
                      <input name="owner_profile_id" type="hidden" value={match.counterpartyId} />
                      <input name="match_id" type="hidden" value={match.id} />
                      <input name="return_to" type="hidden" value="/dashboard" />
                      <input name="requested_stage" type="hidden" value="consent" />
                      <div className="field">
                        <span>Ask for specific private fields</span>
                        <div className="filter-option-list">
                          {BACKGROUND_DISCLOSURE_FIELDS.filter(
                            (field) => field.minStage !== "introduced",
                          ).map((field) => (
                            <label className="check-row" key={field.key}>
                              <input
                                defaultChecked={field.key === "exact_wish"}
                                name="requested_fields"
                                type="checkbox"
                                value={field.key}
                              />
                              <span>{field.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <label className="field">
                        <span>Why this helps</span>
                        <input
                          name="purpose"
                          placeholder="What narrow decision would this disclosure enable?"
                          required
                        />
                      </label>
                      <input
                        name="justification"
                        type="hidden"
                        value="Requested from the match card to move the introduction forward without broad disclosure."
                      />
                      <button className="button button-secondary button-mini" type="submit">
                        Request narrower disclosure
                      </button>
                    </form>
                  ) : null}
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
                );
              })
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

        <section className="section section-white" id="my-trades">
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
                  <p>
                    Signed-in member responses will appear here. Legacy guest records remain
                    visible if one exists, but new public contact paths require sign-in first.
                  </p>
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
                      : "Private introduction agreement room"}
                  </p>
                  <div className="tag-row">
                    <span className="badge">{agreement.status}</span>
                    <span className="impact-pill">
                      {agreement.completion_state.replaceAll("_", " ")}
                    </span>
                    <span className="source-pill">
                      Evidence {agreement.evidenceItems.length}
                    </span>
                    <span className="source-pill">
                      Review cases {agreement.reviewCases.length}
                    </span>
                    {agreement.viewerRating ? (
                      <span className="impact-pill">Your rating: {agreement.viewerRating.score}/10</span>
                    ) : null}
                  </div>
                  <div className="offer-actions">
                    <Link className="text-button" href={`/agreements/${agreement.id}`}>
                      Open agreement record
                    </Link>
                  </div>
                  {agreement.notes ? <p className="route-text">{agreement.notes}</p> : null}
                  <div className="stack-form compact-form">
                    <h4>Payment and lifecycle</h4>
                    <form action={createAgreementPaymentCheckoutAction} className="stack-form compact-form">
                      <input name="agreement_id" type="hidden" value={agreement.id} />
                      <input name="return_to" type="hidden" value="/dashboard" />
                      <div className="field-grid">
                        <label className="field">
                          <span>Amount</span>
                          <input name="amount" placeholder="25.00" type="number" min="1" step="0.01" />
                        </label>
                        <label className="field">
                          <span>Currency</span>
                          <input defaultValue="usd" name="currency" />
                        </label>
                      </div>
                      <div className="field-grid">
                        <label className="field">
                          <span>Cadence</span>
                          <select name="cadence_unit" defaultValue="one_time">
                            <option value="one_time">One-time</option>
                            <option value="day">Daily</option>
                            <option value="month">Monthly</option>
                            <option value="year">Yearly</option>
                            <option value="custom_days">Custom day range</option>
                          </select>
                        </label>
                        <label className="field">
                          <span>Every</span>
                          <input defaultValue={1} min={1} name="cadence_value" type="number" />
                        </label>
                      </div>
                      <label className="field">
                        <span>Payment note</span>
                        <input name="notes" placeholder="What this installment covers" />
                      </label>
                      <button className="button button-primary button-mini" type="submit">
                        Pay with Stripe
                      </button>
                    </form>

                    {agreement.payments.length ? (
                      <div className="mini-list">
                        {agreement.payments.slice(0, 3).map((payment) => (
                          <div key={payment.id} className="mini-list-item">
                            <strong>{formatPaymentAmount(payment.amount_cents, payment.currency)}</strong>
                            <span>
                              {payment.status} | {formatCadence(payment.cadence_interval_value, payment.cadence_interval_unit)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="route-text">No payment records yet.</p>
                    )}

                    {agreement.paymentSchedules.length ? (
                      <div className="mini-list">
                        {agreement.paymentSchedules.slice(0, 2).map((schedule) => (
                          <div key={schedule.id} className="mini-list-item">
                            <strong>{formatPaymentAmount(schedule.amount_cents, schedule.currency)}</strong>
                            <span>
                              reminder {formatCadence(schedule.cadence_interval_value, schedule.cadence_interval_unit)} | next due{" "}
                              {new Date(schedule.next_due_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <form action={addAgreementEventAction} className="stack-form compact-form">
                      <input name="agreement_id" type="hidden" value={agreement.id} />
                      <input name="return_to" type="hidden" value="/dashboard" />
                      <label className="field">
                        <span>Agreement update</span>
                        <select name="event_type" defaultValue="verification_submitted">
                          <option value="note">Note</option>
                          <option value="counterproposal">Counterproposal</option>
                          <option value="verification_submitted">Verification evidence</option>
                          <option value="cancellation_requested">Cancellation request</option>
                          <option value="dispute_opened">Dispute opened</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Summary</span>
                        <input name="summary" placeholder="e.g. Uploaded receipt; proposes monthly payment instead" />
                      </label>
                      <label className="field">
                        <span>Details</span>
                        <textarea name="details" placeholder="Evidence, counterproposal terms, or dispute details" />
                      </label>
                      <button className="button button-secondary button-mini" type="submit">
                        Record update
                      </button>
                    </form>

                    <div className="form-actions">
                      <form action={updateAgreementStatusAction}>
                        <input name="agreement_id" type="hidden" value={agreement.id} />
                        <input name="return_to" type="hidden" value="/dashboard" />
                        <input name="status" type="hidden" value="completed" />
                        <input name="summary" type="hidden" value="Agreement marked completed by one party." />
                        <button className="text-button" type="submit">Mark complete</button>
                      </form>
                      <form action={updateAgreementStatusAction}>
                        <input name="agreement_id" type="hidden" value={agreement.id} />
                        <input name="return_to" type="hidden" value="/dashboard" />
                        <input name="status" type="hidden" value="cancelled" />
                        <input name="summary" type="hidden" value="Agreement cancellation recorded by one party." />
                        <button className="text-button" type="submit">Cancel</button>
                      </form>
                    </div>

                    {agreement.events.length ? (
                      <div className="mini-list">
                        {agreement.events.slice(0, 4).map((event) => (
                          <div key={event.id} className="mini-list-item">
                            <strong>{event.summary}</strong>
                            <span>
                              {event.event_type.replaceAll("_", " ")} |{" "}
                              {new Date(event.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
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
            <p className="eyebrow">Saved offers</p>
            <h2>Offers you are tracking</h2>
            <p>Discounts or reduced burdens published by offer owners will appear here and on your saved-offers page.</p>
          </div>

          <div className="data-grid">
            {dashboardData?.errors.cartItems ? (
              <div className="empty-state">
                <div>
                  <strong>We could not load your saved offers right now.</strong>
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
                        <Link className="text-button" href="/saved-offers">
                          Open saved offers
                        </Link>
                      </div>
                    </div>
                  </article>
                ) : null,
              )
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No saved offers yet.</strong>
                  <p>Save an offer when you want to track it closely.</p>
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
