import type { Metadata } from "next";
import Link from "next/link";

import {
  reviewDonationOffsetOfferAction,
  suppressEmailOutboxAction,
  updateAgreementReviewCaseAction,
  updateMatchConciergeRequestAction,
  updateMatchReportStatusAction,
  updatePaymentReviewStatusAction,
  updateProfileVerificationBadgeAction,
  updateRiskSignalStatusAction,
} from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { isAdminEmail } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";
import { getDonationOffsetEvidenceState } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Admin Review",
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type MatchReportRow = Database["public"]["Tables"]["match_reports"]["Row"];
type AgreementPaymentRow = Database["public"]["Tables"]["agreement_payments"]["Row"];
type AgreementEventRow = Database["public"]["Tables"]["agreement_events"]["Row"];
type AgreementRow = Database["public"]["Tables"]["agreements"]["Row"];
type AgreementEvidenceItemRow = Database["public"]["Tables"]["agreement_evidence_items"]["Row"];
type AgreementReviewCaseRow = Database["public"]["Tables"]["agreement_review_cases"]["Row"];
type EmailOutboxRow = Database["public"]["Tables"]["email_outbox"]["Row"];
type WishProfileRow = Database["public"]["Tables"]["wish_profiles"]["Row"];
type MatchConciergeRequestRow = Database["public"]["Tables"]["match_concierge_requests"]["Row"];
type MatchConciergeEventRow = Database["public"]["Tables"]["match_concierge_events"]["Row"];
type RiskSignalRow = Database["public"]["Tables"]["risk_signals"]["Row"];
type MatchExplanationSnapshotRow =
  Database["public"]["Tables"]["match_explanation_snapshots"]["Row"];
type BackgroundQueryEventRow = Database["public"]["Tables"]["background_query_events"]["Row"];
type ProfileVerificationBadgeRow =
  Database["public"]["Tables"]["profile_verification_badges"]["Row"];
type DonationOffsetOfferRow = Database["public"]["Tables"]["donation_offset_offers"]["Row"];
type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
type RegisteredCharityRow = Database["public"]["Tables"]["registered_charities"]["Row"];

interface MatchConciergeReviewRecord {
  request: MatchConciergeRequestRow;
  events: MatchConciergeEventRow[];
}

interface AgreementEvidenceReviewRecord {
  reviewCase: AgreementReviewCaseRow;
  evidenceItem: AgreementEvidenceItemRow | null;
  agreement: AgreementRow | null;
}

interface DonationOffsetReviewRecord {
  offset: DonationOffsetOfferRow;
  offer: OfferRow | null;
  charity: RegisteredCharityRow | null;
}

function formatPaymentAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatSlaState(value: string | null) {
  if (!value) {
    return "No SLA set";
  }

  const dueAt = Date.parse(value);
  if (Number.isNaN(dueAt)) {
    return "SLA date unavailable";
  }

  const diffMs = dueAt - Date.now();
  const hours = Math.max(1, Math.ceil(Math.abs(diffMs) / (60 * 60 * 1000)));

  return diffMs < 0 ? `Overdue by ${hours}h` : `Due in ${hours}h`;
}

async function loadAdminQueues() {
  const supabase = createServiceClient();
  const [
    reports,
    payments,
    events,
    emails,
    wishProfiles,
    conciergeRequests,
    riskSignals,
    matchExplanationSnapshots,
    backgroundQueryEvents,
    agreementReviewCases,
    verificationBadges,
  ] = await Promise.all([
    supabase
      .from("match_reports")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("agreement_payments")
      .select("*")
      .in("status", ["refund_requested", "disputed", "failed"])
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("agreement_events")
      .select("*")
      .in("event_type", ["dispute_opened", "cancellation_requested"])
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("email_outbox")
      .select("*")
      .in("status", ["queued", "failed"])
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("wish_profiles")
      .select("*")
      .in("safety_status", ["flagged", "blocked"])
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("match_concierge_requests")
      .select("*")
      .in("status", ["open", "triaged", "waiting_on_requester", "waiting_on_counterparty"])
      .order("sla_due_at", { ascending: true, nullsFirst: false })
      .limit(50),
    supabase
      .from("risk_signals")
      .select("*")
      .eq("status", "open")
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("match_explanation_snapshots")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("background_query_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("agreement_review_cases")
      .select("*")
      .in("status", ["open", "under_review", "challenge_window_open", "appealed", "disputed_unresolved"])
      .order("sla_due_at", { ascending: true, nullsFirst: false })
      .limit(50),
    supabase
      .from("profile_verification_badges")
      .select("*")
      .in("status", ["pending", "verified"])
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  const flaggedOffsetsResult = await supabase
    .from("donation_offset_offers")
    .select("*")
    .eq("moderation_status", "flagged")
    .order("created_at", { ascending: false })
    .limit(50);

  const errors = [
    reports.error,
    payments.error,
    events.error,
    emails.error,
    wishProfiles.error,
    conciergeRequests.error,
    riskSignals.error,
    matchExplanationSnapshots.error,
    backgroundQueryEvents.error,
    agreementReviewCases.error,
    verificationBadges.error,
    flaggedOffsetsResult.error,
  ]
    .filter(Boolean)
    .map((error) => error?.message)
    .join(" ");

  if (errors) {
    throw new Error(errors);
  }

  const flaggedOffsets = (flaggedOffsetsResult.data ?? []) as DonationOffsetOfferRow[];
  const conciergeRows = (conciergeRequests.data ?? []) as MatchConciergeRequestRow[];
  const reviewCaseRows = (agreementReviewCases.data ?? []) as AgreementReviewCaseRow[];
  const conciergeRequestIds = conciergeRows.map((request) => request.id);
  const reviewAgreementIds = [...new Set(reviewCaseRows.map((reviewCase) => reviewCase.agreement_id))];
  const reviewEvidenceIds = [
    ...new Set(reviewCaseRows.map((reviewCase) => reviewCase.evidence_item_id).filter(Boolean)),
  ] as string[];
  const conciergeEventsResult = conciergeRequestIds.length
    ? await supabase
        .from("match_concierge_events")
        .select("*")
        .in("request_id", conciergeRequestIds)
        .order("created_at", { ascending: false })
        .limit(150)
    : { data: [] as MatchConciergeEventRow[], error: null };
  const [reviewAgreementsResult, reviewEvidenceItemsResult] = await Promise.all([
    reviewAgreementIds.length
      ? supabase.from("agreements").select("*").in("id", reviewAgreementIds)
      : Promise.resolve({ data: [] as AgreementRow[], error: null }),
    reviewEvidenceIds.length
      ? supabase.from("agreement_evidence_items").select("*").in("id", reviewEvidenceIds)
      : Promise.resolve({ data: [] as AgreementEvidenceItemRow[], error: null }),
  ]);

  if (conciergeEventsResult.error) {
    throw new Error(conciergeEventsResult.error.message);
  }
  if (reviewAgreementsResult.error || reviewEvidenceItemsResult.error) {
    throw new Error(
      reviewAgreementsResult.error?.message ??
        reviewEvidenceItemsResult.error?.message ??
        "Unable to load agreement evidence review records.",
    );
  }

  const flaggedOfferIds = flaggedOffsets.map((row) => row.offer_id);
  const charityIds = [...new Set(flaggedOffsets.map((row) => row.compromise_charity_id))];
  const [flaggedOffersResult, flaggedCharitiesResult] = await Promise.all([
    flaggedOfferIds.length
      ? supabase.from("offers").select("*").in("id", flaggedOfferIds)
      : Promise.resolve({ data: [] as OfferRow[], error: null }),
    charityIds.length
      ? supabase.from("registered_charities").select("*").in("id", charityIds)
      : Promise.resolve({ data: [] as RegisteredCharityRow[], error: null }),
  ]);

  if (flaggedOffersResult.error || flaggedCharitiesResult.error) {
    throw new Error(
      flaggedOffersResult.error?.message ??
        flaggedCharitiesResult.error?.message ??
        "Unable to load donation offset review records.",
    );
  }

  const offerMap = new Map(
    ((flaggedOffersResult.data ?? []) as OfferRow[]).map((row) => [row.id, row] as const),
  );
  const charityMap = new Map(
    ((flaggedCharitiesResult.data ?? []) as RegisteredCharityRow[]).map((row) => [row.id, row] as const),
  );
  const conciergeEventsByRequest = new Map<string, MatchConciergeEventRow[]>();
  for (const event of (conciergeEventsResult.data ?? []) as MatchConciergeEventRow[]) {
    const current = conciergeEventsByRequest.get(event.request_id) ?? [];
    current.push(event);
    conciergeEventsByRequest.set(event.request_id, current);
  }
  const reviewAgreementMap = new Map(
    ((reviewAgreementsResult.data ?? []) as AgreementRow[]).map((row) => [row.id, row] as const),
  );
  const reviewEvidenceMap = new Map(
    ((reviewEvidenceItemsResult.data ?? []) as AgreementEvidenceItemRow[]).map((row) => [row.id, row] as const),
  );

  return {
    reports: (reports.data ?? []) as MatchReportRow[],
    payments: (payments.data ?? []) as AgreementPaymentRow[],
    events: (events.data ?? []) as AgreementEventRow[],
    emails: (emails.data ?? []) as EmailOutboxRow[],
    wishProfiles: (wishProfiles.data ?? []) as WishProfileRow[],
    agreementEvidenceReviews: reviewCaseRows.map((reviewCase) => ({
      reviewCase,
      agreement: reviewAgreementMap.get(reviewCase.agreement_id) ?? null,
      evidenceItem: reviewCase.evidence_item_id
        ? reviewEvidenceMap.get(reviewCase.evidence_item_id) ?? null
        : null,
    })) satisfies AgreementEvidenceReviewRecord[],
    verificationBadges: (verificationBadges.data ?? []) as ProfileVerificationBadgeRow[],
    matchConciergeRequests: conciergeRows.map((request) => ({
      request,
      events: conciergeEventsByRequest.get(request.id) ?? [],
    })) satisfies MatchConciergeReviewRecord[],
    riskSignals: (riskSignals.data ?? []) as RiskSignalRow[],
    matchExplanationSnapshots: (matchExplanationSnapshots.data ?? []) as MatchExplanationSnapshotRow[],
    backgroundQueryEvents: (backgroundQueryEvents.data ?? []) as BackgroundQueryEventRow[],
    donationOffsetReviews: flaggedOffsets.map((offset) => ({
      offset,
      offer: offerMap.get(offset.offer_id) ?? null,
      charity: charityMap.get(offset.compromise_charity_id) ?? null,
    })),
  };
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const viewer = hasSupabaseEnv() ? await requireViewer("/admin") : null;
  const isAdmin = isAdminEmail(viewer?.authUser.email);
  let queues:
    | Awaited<ReturnType<typeof loadAdminQueues>>
    | null = null;
  let loadError: string | null = null;

  if (isAdmin) {
    try {
      queues = await loadAdminQueues();
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Unable to load admin queues.";
    }
  }
  const workflowStageCounts = new Map<string, number>();
  for (const snapshot of queues?.matchExplanationSnapshots ?? []) {
    workflowStageCounts.set(
      snapshot.workflow_stage,
      (workflowStageCounts.get(snapshot.workflow_stage) ?? 0) + 1,
    );
  }
  const limitedQueryEvents =
    queues?.backgroundQueryEvents.filter((event) => event.was_limited).length ?? 0;

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
            <p className="eyebrow">Operations</p>
            <h1>Admin review console.</h1>
            <p className="hero-text">
              Review unsafe matches, payment problems, queued email, and blocked wish profiles.
              This page is gated by the `ADMIN_EMAILS` environment variable.
            </p>
            <div className="hero-actions">
              <Link className="button button-secondary" href="/admin/growth">
                View growth dashboard
              </Link>
            </div>
          </section>
          <aside className="hero-panel panel">
            <p className="eyebrow">Queue counts</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>{queues?.reports.length ?? 0} open report(s)</strong>
                  <p>Reported matches and safety concerns.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>{queues?.riskSignals.length ?? 0} risk signal(s)</strong>
                  <p>Background networking prompts needing operator review.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>{queues?.matchConciergeRequests.length ?? 0} concierge intro item(s)</strong>
                  <p>Pending private-match triage and SLA review.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">04</span>
                <div>
                  <strong>{queues?.matchExplanationSnapshots.length ?? 0} provenance snapshot(s)</strong>
                  <p>Recent privacy-safe match explanation records.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">05</span>
                <div>
                  <strong>{limitedQueryEvents} limited query event(s)</strong>
                  <p>Budget pressure and sparse-search audit records.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">06</span>
                <div>
                  <strong>{queues?.agreementEvidenceReviews.length ?? 0} evidence review item(s)</strong>
                  <p>Agreement evidence, challenge windows, and appeals.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">07</span>
                <div>
                  <strong>{queues?.donationOffsetReviews.length ?? 0} offset review item(s)</strong>
                  <p>Paused donation offsets needing baseline or legality review.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">08</span>
                <div>
                  <strong>{queues?.payments.length ?? 0} payment issue(s)</strong>
                  <p>Refund requests, disputes, and failures.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">09</span>
                <div>
                  <strong>{queues?.emails.length ?? 0} email item(s)</strong>
                  <p>Queued or failed outbound mail.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {!hasSupabaseEnv() ? (
          <div className="status-banner status-banner-error">Supabase is not configured.</div>
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

        {!isAdmin ? (
          <section className="section section-white">
            <div className="empty-state">
              <div>
                <strong>Admin access required.</strong>
                <p>Add your signed-in email to ADMIN_EMAILS in Vercel to use this console.</p>
              </div>
            </div>
          </section>
        ) : loadError ? (
          <section className="section section-white">
            <div className="status-banner status-banner-error">{loadError}</div>
          </section>
        ) : (
          <>
            <section className="section section-white">
              <div className="section-head">
                <p className="eyebrow">Evidence review</p>
                <h2>Agreement completion review queue</h2>
                <p>
                  Review submitted evidence with schema scope, SLA aging, conflict notes, challenge
                  windows, appeal state, and public reasoning summaries.
                </p>
              </div>
              <div className="data-grid">
                {queues?.agreementEvidenceReviews.length ? (
                  queues.agreementEvidenceReviews.map(({ reviewCase, evidenceItem, agreement }) => (
                    <article className="panel data-card" key={reviewCase.id}>
                      <p className="detail-kicker">
                        {reviewCase.reviewer_role.replaceAll("_", " ")} |{" "}
                        {reviewCase.status.replaceAll("_", " ")}
                      </p>
                      <h3>{formatSlaState(reviewCase.sla_due_at)}</h3>
                      <p className="route-text">
                        Agreement {reviewCase.agreement_id}
                        {agreement ? ` | ${agreement.source} | ${agreement.completion_state.replaceAll("_", " ")}` : ""}
                      </p>
                      {evidenceItem ? (
                        <>
                          <p className="route-text">
                            <strong>{evidenceItem.title}</strong> ({evidenceItem.schema_key},{" "}
                            {evidenceItem.evidence_type.replaceAll("_", " ")})
                          </p>
                          <p className="route-text">{evidenceItem.evidence_summary}</p>
                          {evidenceItem.evidence_url ? (
                            <a className="inline-link" href={evidenceItem.evidence_url}>
                              Open evidence
                            </a>
                          ) : null}
                        </>
                      ) : (
                        <p className="route-text">No evidence item attached.</p>
                      )}
                      {reviewCase.appeal_reason ? (
                        <p className="route-text">
                          <strong>Appeal:</strong> {reviewCase.appeal_reason}
                        </p>
                      ) : null}
                      <form action={updateAgreementReviewCaseAction} className="compact-form">
                        <input name="review_case_id" type="hidden" value={reviewCase.id} />
                        <input name="return_to" type="hidden" value="/admin" />
                        <div className="field-grid">
                          <label className="field">
                            <span>Status</span>
                            <select name="status" defaultValue={reviewCase.status}>
                              <option value="open">Open</option>
                              <option value="under_review">Under review</option>
                              <option value="challenge_window_open">Challenge window open</option>
                              <option value="reviewed_complete">Reviewed complete</option>
                              <option value="disputed_unresolved">Disputed / unresolved</option>
                              <option value="appealed">Appealed</option>
                              <option value="closed">Closed</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>Reviewer role</span>
                            <select name="reviewer_role" defaultValue={reviewCase.reviewer_role}>
                              <option value="operator">Operator</option>
                              <option value="validator">Validator</option>
                              <option value="external_reviewer">External reviewer</option>
                              <option value="admin">Admin</option>
                            </select>
                          </label>
                        </div>
                        <div className="field-grid">
                          <label className="field">
                            <span>Reviewer confidence</span>
                            <input
                              defaultValue={evidenceItem?.reviewer_confidence ?? 70}
                              max={100}
                              min={0}
                              name="reviewer_confidence"
                              type="number"
                            />
                          </label>
                          <label className="field">
                            <span>Review scope</span>
                            <input
                              defaultValue={reviewCase.review_scope}
                              name="review_scope"
                              placeholder="Evidence schema and exact claim under review"
                            />
                          </label>
                        </div>
                        <label className="field">
                          <span>Conflict-of-interest notes</span>
                          <textarea
                            defaultValue={reviewCase.conflict_of_interest_notes}
                            name="conflict_of_interest_notes"
                            rows={3}
                          />
                        </label>
                        <label className="field">
                          <span>Reviewer notes</span>
                          <textarea defaultValue={reviewCase.reviewer_notes} name="reviewer_notes" rows={3} />
                        </label>
                        <label className="field">
                          <span>Public reasoning summary</span>
                          <textarea
                            defaultValue={reviewCase.public_reasoning_summary}
                            name="public_reasoning_summary"
                            rows={3}
                          />
                        </label>
                        <button className="button button-primary button-mini" type="submit">
                          Save review
                        </button>
                      </form>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No agreement evidence reviews.</strong>
                      <p>Evidence submitted from agreement rooms will appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section section-subtle">
              <div className="section-head">
                <p className="eyebrow">Verification ladder</p>
                <h2>Profile trust badges tied to review evidence</h2>
                <p>
                  Identity, organization, payment/evidence, completion, and repeat-counterparty
                  badges should be earned through reviewable records rather than generic ratings.
                </p>
              </div>
              <div className="panel data-card data-card-wide">
                <form action={updateProfileVerificationBadgeAction} className="compact-form">
                  <input name="return_to" type="hidden" value="/admin" />
                  <div className="field-grid">
                    <label className="field">
                      <span>Profile ID</span>
                      <input name="profile_id" placeholder="Participant profile UUID" required />
                    </label>
                    <label className="field">
                      <span>Badge</span>
                      <select name="badge_type" defaultValue="identity_verified">
                        <option value="identity_verified">Identity verified</option>
                        <option value="organization_verified">Organization verified</option>
                        <option value="payment_evidence_verified">Payment/evidence verified</option>
                        <option value="completion_reviewed">Completion reviewed</option>
                        <option value="repeat_counterparty">Repeat counterparty</option>
                      </select>
                    </label>
                  </div>
                  <div className="field-grid">
                    <label className="field">
                      <span>Status</span>
                      <select name="status" defaultValue="verified">
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                        <option value="revoked">Revoked</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Source</span>
                      <input name="source" defaultValue="operator_review" />
                    </label>
                  </div>
                  <label className="field">
                    <span>Evidence summary</span>
                    <textarea name="evidence_summary" placeholder="What review record justifies this badge?" />
                  </label>
                  <button className="button button-primary button-mini" type="submit">
                    Save badge
                  </button>
                </form>
                {queues?.verificationBadges.length ? (
                  <div className="mini-list">
                    {queues.verificationBadges.slice(0, 8).map((badge) => (
                      <div className="mini-list-item" key={badge.id}>
                        <strong>{badge.badge_type.replaceAll("_", " ")} | {badge.status}</strong>
                        <span>{badge.profile_id}</span>
                        <span>{badge.evidence_summary || "No summary recorded."}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="section section-white">
              <div className="section-head">
                <p className="eyebrow">Match concierge</p>
                <h2>Private introduction requests awaiting operator review</h2>
                <p>
                  Triage structured intent into a safe next state: more requester detail,
                  counterparty review, introduction, decline, or closure.
                </p>
              </div>
              <div className="data-grid">
                {queues?.matchConciergeRequests.length ? (
                  queues.matchConciergeRequests.map(({ request, events }) => (
                    <article className="panel data-card" key={request.id}>
                      <p className="detail-kicker">
                        {request.route.replaceAll("_", " ")} | {request.status.replaceAll("_", " ")}
                      </p>
                      <h3>{formatSlaState(request.sla_due_at)}</h3>
                      <p className="route-text">{request.intent_summary}</p>
                      {request.offer_summary ? (
                        <p className="route-text">
                          <strong>Offer:</strong> {request.offer_summary}
                        </p>
                      ) : null}
                      {request.ask_summary ? (
                        <p className="route-text">
                          <strong>Ask:</strong> {request.ask_summary}
                        </p>
                      ) : null}
                      {request.constraints ? (
                        <p className="route-text">
                          <strong>Constraints:</strong> {request.constraints}
                        </p>
                      ) : null}
                      {request.target_preview ? (
                        <p className="route-text">
                          <strong>Target preview:</strong> {request.target_preview}
                        </p>
                      ) : null}
                      <div className="tag-row">
                        <span className="source-pill">Requester {request.requester_profile_id}</span>
                        {request.target_profile_id ? (
                          <span className="source-pill">Target {request.target_profile_id}</span>
                        ) : null}
                        {request.match_id ? (
                          <span className="source-pill">Match {request.match_id}</span>
                        ) : null}
                        {request.cause_areas.slice(0, 4).map((cause) => (
                          <span className="badge badge-secondary" key={`${request.id}-${cause}`}>
                            {cause}
                          </span>
                        ))}
                      </div>
                      {events.length ? (
                        <div className="mini-list">
                          {events.slice(0, 3).map((event) => (
                            <div className="mini-list-item" key={event.id}>
                              <strong>{event.event_type.replaceAll("_", " ")}</strong>
                              <span>{event.summary}</span>
                              <span>{new Date(event.created_at).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="route-text">No audit events recorded yet.</p>
                      )}
                      <form action={updateMatchConciergeRequestAction} className="compact-form">
                        <input name="request_id" type="hidden" value={request.id} />
                        <input name="return_to" type="hidden" value="/admin" />
                        <div className="field-grid">
                          <label className="field">
                            <span>Status</span>
                            <select name="status" defaultValue={request.status}>
                              <option value="open">Open</option>
                              <option value="triaged">Triaged</option>
                              <option value="waiting_on_requester">Waiting on requester</option>
                              <option value="waiting_on_counterparty">Waiting on counterparty</option>
                              <option value="introduced">Introduced</option>
                              <option value="declined">Declined</option>
                              <option value="closed">Closed</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>Match ID</span>
                            <input
                              defaultValue={request.match_id ?? ""}
                              name="match_id"
                              placeholder="Optional match_suggestions id"
                            />
                          </label>
                        </div>
                        <label className="field">
                          <span>Operator notes</span>
                          <textarea
                            defaultValue={request.operator_notes ?? ""}
                            name="operator_notes"
                            placeholder="Next action, owner, or why this request is blocked."
                            rows={3}
                          />
                        </label>
                        <label className="field">
                          <span>Risk notes</span>
                          <textarea
                            defaultValue={request.risk_notes ?? ""}
                            name="risk_notes"
                            placeholder="Privacy, coercion, legality, harassment, or mismatch concerns."
                            rows={3}
                          />
                        </label>
                        <button className="button button-primary button-mini" type="submit">
                          Save triage
                        </button>
                      </form>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No concierge introduction requests.</strong>
                      <p>Requests from the dashboard, registry, and background-networking intake appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section section-white">
              <div className="section-head">
                <p className="eyebrow">Trust and safety</p>
                <h2>Open background networking risk signals</h2>
                <p>Review deterministic helper prompts before they become stale operational debt.</p>
              </div>
              <div className="data-grid">
                {queues?.riskSignals.length ? (
                  queues.riskSignals.map((signal) => (
                    <article className="panel data-card" key={signal.id}>
                      <p className="detail-kicker">
                        {signal.severity} | {signal.signal_type.replaceAll("_", " ")}
                      </p>
                      <h3>Risk signal {signal.id.slice(0, 8)}</h3>
                      <p className="route-text">{signal.summary || "No summary recorded."}</p>
                      <div className="tag-row">
                        {signal.profile_id ? (
                          <span className="source-pill">Profile {signal.profile_id}</span>
                        ) : null}
                        {signal.match_id ? (
                          <span className="source-pill">Match {signal.match_id}</span>
                        ) : null}
                        <span className="badge">{signal.status}</span>
                      </div>
                      {Object.keys(signal.metadata ?? {}).length ? (
                        <p className="panel-note">
                          Metadata: {JSON.stringify(signal.metadata).slice(0, 260)}
                        </p>
                      ) : null}
                      <div className="form-actions">
                        <form action={updateRiskSignalStatusAction}>
                          <input name="risk_signal_id" type="hidden" value={signal.id} />
                          <input name="return_to" type="hidden" value="/admin" />
                          <input name="status" type="hidden" value="reviewed" />
                          <button className="button button-secondary button-mini" type="submit">
                            Mark reviewed
                          </button>
                        </form>
                        <form action={updateRiskSignalStatusAction}>
                          <input name="risk_signal_id" type="hidden" value={signal.id} />
                          <input name="return_to" type="hidden" value="/admin" />
                          <input name="status" type="hidden" value="dismissed" />
                          <button className="button button-secondary button-mini" type="submit">
                            Dismiss
                          </button>
                        </form>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No open background networking risk signals.</strong>
                      <p>Delegate scans and profile checks will appear here when review is needed.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section section-white">
              <div className="section-head">
                <p className="eyebrow">Background provenance</p>
                <h2>Explanation snapshots and query budgets</h2>
                <p>
                  Inspect coarse reason codes, workflow stages, and query-budget pressure without
                  opening raw wishes, source notes, or private search text.
                </p>
              </div>
              <div className="panel data-card data-card-wide">
                <p className="detail-kicker">Workflow stage counts</p>
                <div className="tag-row">
                  {[...workflowStageCounts.entries()].length ? (
                    [...workflowStageCounts.entries()].map(([stage, count]) => (
                      <span className="source-pill" key={stage}>
                        {stage.replaceAll("_", " ")}: {count}
                      </span>
                    ))
                  ) : (
                    <span className="source-pill">No snapshots yet</span>
                  )}
                </div>
              </div>
              <div className="data-grid">
                {queues?.matchExplanationSnapshots.slice(0, 6).map((snapshot) => (
                  <article className="panel data-card" key={snapshot.id}>
                    <p className="detail-kicker">
                      {snapshot.workflow_stage.replaceAll("_", " ")} | {snapshot.confidence_band}
                    </p>
                    <h3>Snapshot {snapshot.id.slice(0, 8)}</h3>
                    <p className="route-text">{snapshot.summary}</p>
                    <div className="tag-row">
                      <span className="source-pill">Match {snapshot.match_id.slice(0, 8)}</span>
                      <span className="source-pill">Profile {snapshot.profile_id.slice(0, 8)}</span>
                      <span className="source-pill">Score {snapshot.score_bucket}</span>
                    </div>
                    <p className="panel-note">
                      Factors: {snapshot.factor_codes.join(", ") || "broad preview compatibility"}
                    </p>
                  </article>
                ))}
                {queues?.backgroundQueryEvents.slice(0, 6).map((event) => (
                  <article className="panel data-card" key={event.id}>
                    <p className="detail-kicker">
                      {event.scope.replaceAll("_", " ")} | {event.was_limited ? "limited" : "logged"}
                    </p>
                    <h3>Query event {event.id.slice(0, 8)}</h3>
                    <p className="route-text">
                      Used {event.used_before}/{event.daily_limit} before this event; remaining{" "}
                      {event.remaining_after}.
                    </p>
                    <div className="tag-row">
                      <span className="source-pill">Candidates {event.candidate_count}</span>
                      <span className="source-pill">Results {event.result_count}</span>
                      {event.risk_signal_id ? (
                        <span className="source-pill">Risk {event.risk_signal_id.slice(0, 8)}</span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="section section-white">
              <div className="section-head">
                <p className="eyebrow">Match reports</p>
                <h2>Participant-submitted safety reports</h2>
                <p>Review reports for coercion, spam, privacy risk, illegal asks, or other abuse.</p>
              </div>
              <div className="data-grid">
                {queues?.reports.length ? (
                  queues.reports.map((report) => (
                    <article className="panel data-card" key={report.id}>
                      <p className="detail-kicker">{report.reason}</p>
                      <h3>Report {report.id.slice(0, 8)}</h3>
                      <p className="route-text">{report.details || "No details provided."}</p>
                      <p className="route-text">
                        Match {report.match_id}; reporter {report.reporter_profile_id}
                      </p>
                      <div className="form-actions">
                        <form action={updateMatchReportStatusAction}>
                          <input name="report_id" type="hidden" value={report.id} />
                          <input name="return_to" type="hidden" value="/admin" />
                          <input name="status" type="hidden" value="reviewed" />
                          <button className="button button-secondary button-mini" type="submit">
                            Mark reviewed
                          </button>
                        </form>
                        <form action={updateMatchReportStatusAction}>
                          <input name="report_id" type="hidden" value={report.id} />
                          <input name="return_to" type="hidden" value="/admin" />
                          <input name="status" type="hidden" value="dismissed" />
                          <button className="button button-secondary button-mini" type="submit">
                            Dismiss
                          </button>
                        </form>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No open match reports.</strong>
                      <p>Reports submitted from participant dashboards will appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section section-subtle">
              <div className="section-head">
                <p className="eyebrow">Donation offsets</p>
                <h2>Paused offset offers awaiting review</h2>
                <p>
                  Review baseline evidence, political-destination issues, duplicate proof, and
                  coercion concerns before letting an offset enter the public marketplace.
                </p>
              </div>
              <div className="data-grid">
                {queues?.donationOffsetReviews.length ? (
                  queues.donationOffsetReviews.map((review) => {
                    const evidenceState = getDonationOffsetEvidenceState({
                      moderationStatus: review.offset.moderation_status,
                      evidenceUrl: review.offset.evidence_url,
                      moderationReviewedAt: review.offset.moderation_reviewed_at,
                      createdAt: review.offset.created_at,
                    });

                    return (
                      <article className="panel data-card" key={review.offset.offer_id}>
                        <p className="detail-kicker">
                          {review.charity?.name ?? "Compromise destination"} |{" "}
                          {review.offset.verification_method.replaceAll("_", " ")}
                        </p>
                        <h3>
                          {review.offer?.offered_cause ?? "Offset"} for{" "}
                          {review.offer?.requested_cause ?? "counterparty"}
                        </h3>
                        <p className="route-text">
                          Baseline ${review.offset.baseline_amount_cents / 100} from{" "}
                          {review.offset.baseline_opposed_cause}
                        </p>
                        <p className="route-text">
                          Requests ${review.offset.requested_matching_amount_cents / 100} from{" "}
                          {review.offset.requested_opposed_cause}
                        </p>
                        <p className="route-text">{review.offset.moderation_notes || "No moderation notes yet."}</p>
                        <p className="route-text">
                          Review state: {evidenceState.label}. One proof, one claim: compare this
                          evidence against existing offset proof before approval.
                        </p>
                        {review.offset.evidence_url ? (
                          <p className="route-text">
                            Evidence:{" "}
                            <a className="inline-link" href={review.offset.evidence_url}>
                              open proof packet
                            </a>
                          </p>
                        ) : (
                          <p className="route-text">Evidence: missing proof packet.</p>
                        )}
                        <p className="route-text">
                          Participation: {review.offset.participation_mode}
                          {review.offset.pool_id ? ` | Pool ${review.offset.pool_id.slice(0, 8)}` : ""}
                        </p>
                        <div className="form-actions">
                          <form action={reviewDonationOffsetOfferAction}>
                            <input name="offer_id" type="hidden" value={review.offset.offer_id} />
                            <input name="return_to" type="hidden" value="/admin" />
                            <input name="moderation_status" type="hidden" value="clear" />
                            <button className="button button-secondary button-mini" type="submit">
                              Approve and publish
                            </button>
                          </form>
                          <form action={reviewDonationOffsetOfferAction}>
                            <input name="offer_id" type="hidden" value={review.offset.offer_id} />
                            <input name="return_to" type="hidden" value="/admin" />
                            <input name="moderation_status" type="hidden" value="blocked" />
                            <button className="button button-secondary button-mini" type="submit">
                              Block
                            </button>
                          </form>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No paused donation offsets.</strong>
                      <p>Flagged offset offers will appear here for review.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section section-subtle">
              <div className="section-head">
                <p className="eyebrow">Payments</p>
                <h2>Refund, dispute, and failed payment review</h2>
                <p>These are platform records. Stripe-side refunds and chargebacks still need to be handled in Stripe.</p>
              </div>
              <div className="data-grid">
                {queues?.payments.length ? (
                  queues.payments.map((payment) => (
                    <article className="panel data-card" key={payment.id}>
                      <p className="detail-kicker">{payment.status.replace("_", " ")}</p>
                      <h3>{formatPaymentAmount(payment.amount_cents, payment.currency)}</h3>
                      <p className="route-text">
                        Agreement{" "}
                        <Link className="inline-link" href={`/agreements/${payment.agreement_id}`}>
                          {payment.agreement_id}
                        </Link>
                      </p>
                      <p className="route-text">
                        Payer {payment.payer_id}; payee {payment.payee_id}
                      </p>
                      <div className="form-actions">
                        {["refunded", "disputed", "cancelled", "paid"].map((status) => (
                          <form action={updatePaymentReviewStatusAction} key={status}>
                            <input name="payment_id" type="hidden" value={payment.id} />
                            <input name="return_to" type="hidden" value="/admin" />
                            <input name="status" type="hidden" value={status} />
                            <button className="button button-secondary button-mini" type="submit">
                              Mark {status}
                            </button>
                          </form>
                        ))}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No payment issues in the review queue.</strong>
                      <p>Refund requests, disputes, and failed payments appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section section-white">
              <div className="section-head">
                <p className="eyebrow">Lifecycle events</p>
                <h2>Dispute and cancellation events</h2>
                <p>Events are immutable participant records for later review.</p>
              </div>
              <div className="data-grid">
                {queues?.events.length ? (
                  queues.events.map((event) => (
                    <article className="panel data-card" key={event.id}>
                      <p className="detail-kicker">{event.event_type.replace("_", " ")}</p>
                      <h3>{event.summary}</h3>
                      <p className="route-text">{event.details || "No details provided."}</p>
                      <Link className="text-button" href={`/agreements/${event.agreement_id}`}>
                        Open agreement
                      </Link>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No dispute or cancellation events.</strong>
                      <p>Participant lifecycle problems will appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section section-subtle">
              <div className="section-head">
                <p className="eyebrow">Email</p>
                <h2>Queued and failed email</h2>
                <p>The cron worker sends queued email through Resend when provider env vars are configured.</p>
              </div>
              <div className="data-grid">
                {queues?.emails.length ? (
                  queues.emails.map((email) => (
                    <article className="panel data-card" key={email.id}>
                      <p className="detail-kicker">{email.status}</p>
                      <h3>{email.subject}</h3>
                      <p className="route-text">{email.recipient_email || "No recipient"}</p>
                      {email.last_error ? <p className="route-text">{email.last_error}</p> : null}
                      <form action={suppressEmailOutboxAction}>
                        <input name="email_id" type="hidden" value={email.id} />
                        <input name="return_to" type="hidden" value="/admin" />
                        <button className="button button-secondary button-mini" type="submit">
                          Suppress
                        </button>
                      </form>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No queued or failed email.</strong>
                      <p>Outbound records will appear here before the provider worker sends them.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section section-white">
              <div className="section-head">
                <p className="eyebrow">Wish safety</p>
                <h2>Flagged or blocked wish profiles</h2>
                <p>Profiles caught by the lightweight safety filter should be reviewed before any manual outreach.</p>
              </div>
              <div className="data-grid">
                {queues?.wishProfiles.length ? (
                  queues.wishProfiles.map((profile) => (
                    <article className="panel data-card" key={profile.profile_id}>
                      <p className="detail-kicker">{profile.safety_status}</p>
                      <h3>{profile.profile_id}</h3>
                      <p className="route-text">{profile.safety_notes || "No safety note."}</p>
                      <p className="route-text">{profile.public_preview || "No public preview."}</p>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No flagged wish profiles.</strong>
                      <p>Blocked or flagged registry entries will appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
