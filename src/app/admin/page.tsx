import type { Metadata } from "next";
import Link from "next/link";

import {
  adjudicatePerformanceBondChallengeAction,
  reviewBaselineBondEvidenceAction,
  reviewDonationOffsetOfferAction,
  suppressEmailOutboxAction,
  updateAgreementReviewCaseAction,
  updateMatchConciergeRequestAction,
  updateMatchReportStatusAction,
  updatePaymentReviewStatusAction,
  updateProfileVerificationBadgeAction,
  updateRiskSignalStatusAction,
} from "@/app/actions";
import { updateProfileDataRightRequestAction } from "@/app/background-networking/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { formatBaselineBondAmount, normalizeBaselineBondStatus } from "@/lib/baseline-bonds";
import {
  buildAgreementReviewerConsolePreview,
  evaluateAdminOperatorAccess,
  isAdminEmail,
} from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { REVIEWED_MARKETPLACE_SEED_TEMPLATES } from "@/lib/marketplace-seed-templates";
import {
  evidenceSchemaFromJson,
  formatPerformanceBondAmount,
  splitConfigFromJson,
} from "@/lib/performance-bonds";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { isMissingOptionalLegacyAgreementRelation } from "@/lib/optional-legacy-agreement-relations";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
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
type ProfileDataRightRequestRow =
  Database["public"]["Tables"]["profile_data_right_requests"]["Row"];
type ProfileVerificationBadgeRow =
  Database["public"]["Tables"]["profile_verification_badges"]["Row"];
type DonationOffsetOfferRow = Database["public"]["Tables"]["donation_offset_offers"]["Row"];
type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
type RegisteredCharityRow = Database["public"]["Tables"]["registered_charities"]["Row"];
type PerformanceBondRow = Database["public"]["Tables"]["performance_bonds"]["Row"];
type BondEvidenceRow = Database["public"]["Tables"]["bond_evidence"]["Row"];
type BondChallengeRow = Database["public"]["Tables"]["bond_challenges"]["Row"];
type BondLedgerEntryRow = Database["public"]["Tables"]["bond_ledger_entries"]["Row"];
type PerformanceBondAuditEventRow =
  Database["public"]["Tables"]["performance_bond_audit_events"]["Row"];
type BaselineWitnessInviteRow =
  Database["public"]["Tables"]["baseline_witness_invites"]["Row"];
type BaselineWitnessTestimonialRow =
  Database["public"]["Tables"]["baseline_witness_testimonials"]["Row"];
type BaselineWitnessQualityAssessmentRow =
  Database["public"]["Tables"]["baseline_witness_quality_assessments"]["Row"];
type ExternalWitnessAccountRow =
  Database["public"]["Tables"]["external_witness_accounts"]["Row"];
type BaselineWitnessRiskReportRow =
  Database["public"]["Tables"]["baseline_witness_risk_reports"]["Row"];

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

interface PerformanceBondReviewRecord {
  bond: PerformanceBondRow;
  evidence: BondEvidenceRow[];
  challenges: BondChallengeRow[];
  ledgerEntries: BondLedgerEntryRow[];
  auditEvents: PerformanceBondAuditEventRow[];
  offer: OfferRow | null;
  agreement: AgreementRow | null;
}

interface BaselineWitnessReviewRecord {
  testimonial: BaselineWitnessTestimonialRow;
  invite: BaselineWitnessInviteRow | null;
  assessment: BaselineWitnessQualityAssessmentRow | null;
  externalAccount: ExternalWitnessAccountRow | null;
  riskReports: BaselineWitnessRiskReportRow[];
}

function formatPaymentAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatAdminState(value: string) {
  return value.replaceAll("_", " ");
}

function formatPerformanceBondDestination(bond: PerformanceBondRow) {
  if (bond.forfeiture_destination === "mpgf") {
    return "Moral Public Goods Fund";
  }

  if (bond.forfeiture_destination === "counterparty") {
    return "Counterparty after platform review";
  }

  if (bond.forfeiture_destination === "split") {
    const split = splitConfigFromJson(bond.split_config);
    return `Split: ${split.counterpartyPercent}% counterparty, ${split.neutralCausePercent}% neutral cause, ${split.mpgfPercent}% MPGF`;
  }

  return "Compromise charity / neutral cause, or MPGF if no neutral cause is available";
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

function getMetadataValue(metadata: Record<string, unknown>, key: string) {
  return metadata[key];
}

function getMetadataBoolean(metadata: Record<string, unknown>, key: string) {
  return getMetadataValue(metadata, key) === true;
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = getMetadataValue(metadata, key);
  return typeof value === "string" ? value : "";
}

function getJsonString(value: Json, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const field = value[key];
  return typeof field === "string" ? field : "";
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
    profileDataRightRequests,
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
      .or(
        "status.in.(open,triaged,waiting_on_requester,waiting_on_counterparty),appeal_status.in.(requested,under_review)",
      )
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
      .from("profile_data_right_requests")
      .select("*")
      .in("status", ["open", "in_review"])
      .order("due_at", { ascending: true })
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
  const baselineBondReviewsResult = await supabase
    .from("donation_offset_offers")
    .select("*")
    .in("baseline_bond_status", ["evidence_due", "evidence_submitted"])
    .order("baseline_bond_evidence_due_at", { ascending: true, nullsFirst: false })
    .limit(50);
  const performanceBondReviewsResult = await supabase
    .from("performance_bonds")
    .select("*")
    .eq("enabled", true)
    .in("status", ["challenged", "under_review", "rejected_after_review", "evidence_due"])
    .order("updated_at", { ascending: false })
    .limit(50);
  const baselineWitnessReviewsResult = await supabase
    .from("baseline_witness_testimonials")
    .select("*")
    .in("testimonial_status", ["submitted", "under_review", "disputed"])
    .order("submitted_at", { ascending: false })
    .limit(50);
  const baselineWitnessRiskReportsResult = await supabase
    .from("baseline_witness_risk_reports")
    .select("*")
    .in("review_status", ["open", "under_review", "escalated"])
    .order("created_at", { ascending: false })
    .limit(50);
  const agreementReviewCasesUnavailable =
    isMissingOptionalLegacyAgreementRelation(
      agreementReviewCases.error,
      "agreement_review_cases",
    );

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
    profileDataRightRequests.error,
    agreementReviewCasesUnavailable ? null : agreementReviewCases.error,
    verificationBadges.error,
    flaggedOffsetsResult.error,
    baselineBondReviewsResult.error,
    performanceBondReviewsResult.error,
    baselineWitnessReviewsResult.error,
    baselineWitnessRiskReportsResult.error,
  ]
    .filter(Boolean)
    .map((error) => error?.message)
    .join(" ");

  if (errors) {
    throw new Error(errors);
  }

  const flaggedOffsets = (flaggedOffsetsResult.data ?? []) as DonationOffsetOfferRow[];
  const baselineBondReviewOffsets = (baselineBondReviewsResult.data ?? []) as DonationOffsetOfferRow[];
  const performanceBondRows = (performanceBondReviewsResult.data ?? []) as PerformanceBondRow[];
  const baselineWitnessRows =
    (baselineWitnessReviewsResult.data ?? []) as BaselineWitnessTestimonialRow[];
  const baselineWitnessRiskRows =
    (baselineWitnessRiskReportsResult.data ?? []) as BaselineWitnessRiskReportRow[];
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
  const reviewEvidenceItemsUnavailable =
    isMissingOptionalLegacyAgreementRelation(
      reviewEvidenceItemsResult.error,
      "agreement_evidence_items",
    );

  if (conciergeEventsResult.error) {
    throw new Error(conciergeEventsResult.error.message);
  }
  if (
    reviewAgreementsResult.error ||
    (reviewEvidenceItemsResult.error && !reviewEvidenceItemsUnavailable)
  ) {
    throw new Error(
      reviewAgreementsResult.error?.message ??
        reviewEvidenceItemsResult.error?.message ??
        "Unable to load agreement evidence review records.",
    );
  }

  const flaggedOfferIds = [...new Set([
    ...flaggedOffsets.map((row) => row.offer_id),
    ...baselineBondReviewOffsets.map((row) => row.offer_id),
  ])];
  const charityIds = [
    ...new Set([
      ...flaggedOffsets.map((row) => row.compromise_charity_id),
      ...baselineBondReviewOffsets
        .map((row) => row.baseline_bond_forfeit_destination_id ?? row.compromise_charity_id)
        .filter(Boolean),
    ]),
  ];
  const [flaggedOffersResult, flaggedCharitiesResult] = await Promise.all([
    flaggedOfferIds.length
      ? supabase.from("offers").select("*").in("id", flaggedOfferIds)
      : Promise.resolve({ data: [] as OfferRow[], error: null }),
    charityIds.length
      ? supabase.from("registered_charities").select("*").in("id", charityIds)
      : Promise.resolve({ data: [] as RegisteredCharityRow[], error: null }),
  ]);

  const performanceBondIds = performanceBondRows.map((bond) => bond.id);
  const performanceBondOfferIds = [...new Set(performanceBondRows.map((bond) => bond.offer_id))];
  const performanceBondAgreementIds = [
    ...new Set(performanceBondRows.map((bond) => bond.swap_id).filter((id): id is string => Boolean(id))),
  ];
  const [
    performanceBondEvidenceResult,
    performanceBondChallengesResult,
    performanceBondLedgerResult,
    performanceBondAuditResult,
    performanceBondOffersResult,
    performanceBondAgreementsResult,
  ] = await Promise.all([
    performanceBondIds.length
      ? supabase
          .from("bond_evidence")
          .select("*")
          .in("bond_id", performanceBondIds)
          .order("submitted_at", { ascending: false })
      : Promise.resolve({ data: [] as BondEvidenceRow[], error: null }),
    performanceBondIds.length
      ? supabase
          .from("bond_challenges")
          .select("*")
          .in("bond_id", performanceBondIds)
          .order("challenged_at", { ascending: false })
      : Promise.resolve({ data: [] as BondChallengeRow[], error: null }),
    performanceBondIds.length
      ? supabase
          .from("bond_ledger_entries")
          .select("*")
          .in("bond_id", performanceBondIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as BondLedgerEntryRow[], error: null }),
    performanceBondIds.length
      ? supabase
          .from("performance_bond_audit_events")
          .select("*")
          .in("bond_id", performanceBondIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as PerformanceBondAuditEventRow[], error: null }),
    performanceBondOfferIds.length
      ? supabase.from("offers").select("*").in("id", performanceBondOfferIds)
      : Promise.resolve({ data: [] as OfferRow[], error: null }),
    performanceBondAgreementIds.length
      ? supabase.from("agreements").select("*").in("id", performanceBondAgreementIds)
      : Promise.resolve({ data: [] as AgreementRow[], error: null }),
  ]);

  if (flaggedOffersResult.error || flaggedCharitiesResult.error) {
    throw new Error(
      flaggedOffersResult.error?.message ??
        flaggedCharitiesResult.error?.message ??
        "Unable to load donation offset review records.",
    );
  }

  const performanceBondRelatedError =
    performanceBondEvidenceResult.error ??
    performanceBondChallengesResult.error ??
    performanceBondLedgerResult.error ??
    performanceBondAuditResult.error ??
    performanceBondOffersResult.error ??
    performanceBondAgreementsResult.error;

  if (performanceBondRelatedError) {
    throw new Error(performanceBondRelatedError.message);
  }

  const baselineWitnessIds = baselineWitnessRows.map((row) => row.id);
  const baselineWitnessInviteIds = [
    ...new Set([
      ...baselineWitnessRows.map((row) => row.invite_id),
      ...baselineWitnessRiskRows.map((row) => row.invite_id).filter((id): id is string => Boolean(id)),
    ]),
  ];
  const baselineWitnessExternalAccountIds = [
    ...new Set(
      baselineWitnessRows
        .map((row) => row.external_witness_account_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const [
    baselineWitnessAssessmentsResult,
    baselineWitnessInvitesResult,
    baselineWitnessExternalAccountsResult,
  ] = await Promise.all([
    baselineWitnessIds.length
      ? supabase
          .from("baseline_witness_quality_assessments")
          .select("*")
          .in("baseline_witness_testimonial_id", baselineWitnessIds)
      : Promise.resolve({ data: [] as BaselineWitnessQualityAssessmentRow[], error: null }),
    baselineWitnessInviteIds.length
      ? supabase.from("baseline_witness_invites").select("*").in("id", baselineWitnessInviteIds)
      : Promise.resolve({ data: [] as BaselineWitnessInviteRow[], error: null }),
    baselineWitnessExternalAccountIds.length
      ? supabase
          .from("external_witness_accounts")
          .select("*")
          .in("id", baselineWitnessExternalAccountIds)
      : Promise.resolve({ data: [] as ExternalWitnessAccountRow[], error: null }),
  ]);

  const baselineWitnessRelatedError =
    baselineWitnessAssessmentsResult.error ??
    baselineWitnessInvitesResult.error ??
    baselineWitnessExternalAccountsResult.error;

  if (baselineWitnessRelatedError) {
    throw new Error(baselineWitnessRelatedError.message);
  }

  const offerMap = new Map(
    ((flaggedOffersResult.data ?? []) as OfferRow[]).map((row) => [row.id, row] as const),
  );
  const charityMap = new Map(
    ((flaggedCharitiesResult.data ?? []) as RegisteredCharityRow[]).map((row) => [row.id, row] as const),
  );
  const performanceBondOffersById = new Map(
    ((performanceBondOffersResult.data ?? []) as OfferRow[]).map((row) => [row.id, row] as const),
  );
  const performanceBondAgreementsById = new Map(
    ((performanceBondAgreementsResult.data ?? []) as AgreementRow[]).map((row) => [row.id, row] as const),
  );
  const performanceBondEvidenceByBond = new Map<string, BondEvidenceRow[]>();
  for (const row of (performanceBondEvidenceResult.data ?? []) as BondEvidenceRow[]) {
    const bucket = performanceBondEvidenceByBond.get(row.bond_id) ?? [];
    bucket.push(row);
    performanceBondEvidenceByBond.set(row.bond_id, bucket);
  }
  const performanceBondChallengesByBond = new Map<string, BondChallengeRow[]>();
  for (const row of (performanceBondChallengesResult.data ?? []) as BondChallengeRow[]) {
    const bucket = performanceBondChallengesByBond.get(row.bond_id) ?? [];
    bucket.push(row);
    performanceBondChallengesByBond.set(row.bond_id, bucket);
  }
  const performanceBondLedgerByBond = new Map<string, BondLedgerEntryRow[]>();
  for (const row of (performanceBondLedgerResult.data ?? []) as BondLedgerEntryRow[]) {
    const bucket = performanceBondLedgerByBond.get(row.bond_id) ?? [];
    bucket.push(row);
    performanceBondLedgerByBond.set(row.bond_id, bucket);
  }
  const performanceBondAuditByBond = new Map<string, PerformanceBondAuditEventRow[]>();
  for (const row of (performanceBondAuditResult.data ?? []) as PerformanceBondAuditEventRow[]) {
    const bucket = performanceBondAuditByBond.get(row.bond_id) ?? [];
    bucket.push(row);
    performanceBondAuditByBond.set(row.bond_id, bucket);
  }
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
  const baselineWitnessAssessmentByTestimonial = new Map(
    ((baselineWitnessAssessmentsResult.data ?? []) as BaselineWitnessQualityAssessmentRow[]).map(
      (row) => [row.baseline_witness_testimonial_id, row] as const,
    ),
  );
  const baselineWitnessInviteById = new Map(
    ((baselineWitnessInvitesResult.data ?? []) as BaselineWitnessInviteRow[]).map(
      (row) => [row.id, row] as const,
    ),
  );
  const baselineWitnessExternalAccountById = new Map(
    ((baselineWitnessExternalAccountsResult.data ?? []) as ExternalWitnessAccountRow[]).map(
      (row) => [row.id, row] as const,
    ),
  );
  const baselineWitnessRiskReportsBySubject = new Map<string, BaselineWitnessRiskReportRow[]>();
  for (const row of baselineWitnessRiskRows) {
    for (const key of [row.baseline_witness_testimonial_id, row.invite_id]) {
      if (!key) continue;
      const bucket = baselineWitnessRiskReportsBySubject.get(key) ?? [];
      bucket.push(row);
      baselineWitnessRiskReportsBySubject.set(key, bucket);
    }
  }

  const loadedAtIso = new Date().toISOString();

  return {
    loadedAtIso,
    legacyAgreementReviewAvailable:
      !agreementReviewCasesUnavailable && !reviewEvidenceItemsUnavailable,
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
    profileDataRightRequests: (profileDataRightRequests.data ?? []) as ProfileDataRightRequestRow[],
    donationOffsetReviews: flaggedOffsets.map((offset) => ({
      offset,
      offer: offerMap.get(offset.offer_id) ?? null,
      charity: charityMap.get(offset.compromise_charity_id) ?? null,
    })),
    baselineBondReviews: baselineBondReviewOffsets.map((offset) => ({
      offset,
      offer: offerMap.get(offset.offer_id) ?? null,
      charity: charityMap.get(
        offset.baseline_bond_forfeit_destination_id ?? offset.compromise_charity_id,
      ) ?? null,
    })),
    performanceBondReviews: performanceBondRows.map((bond) => ({
      bond,
      evidence: performanceBondEvidenceByBond.get(bond.id) ?? [],
      challenges: performanceBondChallengesByBond.get(bond.id) ?? [],
      ledgerEntries: performanceBondLedgerByBond.get(bond.id) ?? [],
      auditEvents: performanceBondAuditByBond.get(bond.id) ?? [],
      offer: performanceBondOffersById.get(bond.offer_id) ?? null,
      agreement: bond.swap_id ? performanceBondAgreementsById.get(bond.swap_id) ?? null : null,
    })) satisfies PerformanceBondReviewRecord[],
    baselineWitnessReviews: baselineWitnessRows.map((testimonial) => ({
      assessment: baselineWitnessAssessmentByTestimonial.get(testimonial.id) ?? null,
      externalAccount: testimonial.external_witness_account_id
        ? baselineWitnessExternalAccountById.get(testimonial.external_witness_account_id) ?? null
        : null,
      invite: baselineWitnessInviteById.get(testimonial.invite_id) ?? null,
      riskReports: [
        ...(baselineWitnessRiskReportsBySubject.get(testimonial.id) ?? []),
        ...(baselineWitnessRiskReportsBySubject.get(testimonial.invite_id) ?? []),
      ],
      testimonial,
    })) satisfies BaselineWitnessReviewRecord[],
    baselineWitnessRiskReports: baselineWitnessRiskRows,
  };
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const viewer = hasSupabaseEnv() ? await requireViewer("/admin") : null;
  const isAdmin = isAdminEmail(viewer?.authUser.email);
  const adminMfaSummary = isAdmin ? await loadBackgroundAccountSecuritySummary() : null;
  const adminAccess = evaluateAdminOperatorAccess({
    email: viewer?.authUser.email,
    mfaSummary: adminMfaSummary,
  });
  let queues:
    | Awaited<ReturnType<typeof loadAdminQueues>>
    | null = null;
  let loadError: string | null = null;

  if (adminAccess.allowed) {
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
  const sparseFloorHitEvents =
    queues?.backgroundQueryEvents.filter((event) =>
      getMetadataBoolean(event.metadata, "floorApplied"),
    ).length ?? 0;
  const anomalyReviewEvents =
    queues?.backgroundQueryEvents.filter((event) =>
      ["medium", "high"].includes(getMetadataString(event.metadata, "anomalyLevel")),
    ).length ?? 0;
  const queryBudgetRiskSignals =
    queues?.riskSignals.filter((signal) =>
      [
        "background_query_budget_pressure",
        "narrow_registry_search_pattern",
        "sparse_registry_search",
      ].includes(signal.signal_type),
    ).length ?? 0;
  const openConciergeAppeals =
    queues?.matchConciergeRequests.filter((entry) =>
      ["requested", "under_review"].includes(entry.request.appeal_status),
    ).length ?? 0;

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
              This page is gated by the `ADMIN_EMAILS` environment variable and an active
              authenticator MFA session.
            </p>
            <div className="hero-actions">
              <Link className="button button-secondary" href="/admin/growth">
                View growth dashboard
              </Link>
              <Link className="button button-secondary" href="/admin/institutional-deal-desk">
                Open Institutional Deal Desk
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
                  <p>
                    Pending private-match triage and SLA review; {openConciergeAppeals} appeal(s).
                  </p>
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
                  <strong>{queues?.profileDataRightRequests.length ?? 0} data-right item(s)</strong>
                  <p>Export, correction, deletion, and restriction requests.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">07</span>
                <div>
                  <strong>{queues?.agreementEvidenceReviews.length ?? 0} evidence review item(s)</strong>
                  <p>Agreement evidence, challenge windows, and appeals.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">08</span>
                <div>
                  <strong>{queues?.performanceBondReviews.length ?? 0} pledge bond review item(s)</strong>
                  <p>Performance bond evidence, challenges, and release decisions.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">09</span>
                <div>
                  <strong>
                    {(queues?.baselineWitnessReviews.length ?? 0) +
                      (queues?.baselineWitnessRiskReports.length ?? 0)}{" "}
                    witness review item(s)
                  </strong>
                  <p>Private baseline testimony, identity assurance, and risk reports.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">10</span>
                <div>
                  <strong>{queues?.donationOffsetReviews.length ?? 0} offset review item(s)</strong>
                  <p>Paused donation offsets needing baseline or legality review.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">11</span>
                <div>
                  <strong>{queues?.payments.length ?? 0} payment issue(s)</strong>
                  <p>Refund requests, disputes, and failures.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">12</span>
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
        ) : !adminAccess.allowed ? (
          <section className="section section-white">
            <div className="empty-state">
              <div>
                <strong>Authenticator MFA required.</strong>
                <p>{adminAccess.message}</p>
                <p>
                  Current session level: {adminMfaSummary?.currentLevel ?? "unknown"} · verified
                  factors: {adminMfaSummary?.verifiedTotpCount ?? 0}
                </p>
              </div>
              <Link className="button button-secondary" href="/dashboard#account-security">
                Open account security
              </Link>
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
                <p className="eyebrow">Marketplace bootstrap</p>
                <h2>Reviewed seed template promotion controls</h2>
                <p>
                  Seed templates are operator-reviewed bootstrap records. They remain excluded from
                  live offer, agreement, payment, and moral-trade volume metrics unless promoted by
                  a separate reviewed live-template approval.
                </p>
              </div>
              <div className="data-grid">
                {REVIEWED_MARKETPLACE_SEED_TEMPLATES.map((template) => (
                  <article className="panel data-card" key={template.id}>
                    <p className="detail-kicker">
                      {template.formatLabel} | {template.reviewStatusLabel}
                    </p>
                    <h3>{template.prefill.title}</h3>
                    <p className="route-text">{template.reviewSummary}</p>
                    <ul className="trust-check-list">
                      <li>{template.environmentLabel}</li>
                      <li>{template.promotionControlLabel}</li>
                      <li>Live metric eligible: {template.liveMetricEligible ? "yes" : "no"}</li>
                      <li>Review decision: {template.reviewDecisionId}</li>
                    </ul>
                    <div className="hero-actions">
                      <Link className="button button-secondary button-mini" href={template.templateHref}>
                        Open template
                      </Link>
                      <button className="button button-secondary button-mini" type="button" disabled>
                        Promotion requires reviewed live-template approval
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="section section-white">
              <div className="section-head">
                <p className="eyebrow">Privacy operations</p>
                <h2>Data-right requests and disclosure controls</h2>
                <p>
                  Track export, correction, deletion, and restriction requests alongside the
                  background-networking operator queues.
                </p>
              </div>
              <div className="data-grid">
                {queues?.profileDataRightRequests.length ? (
                  queues.profileDataRightRequests.map((request) => (
                    <article className="panel data-card" key={request.id}>
                      <p className="detail-kicker">
                        {request.request_type.replaceAll("_", " ")} |{" "}
                        {request.status.replaceAll("_", " ")}
                      </p>
                      <h3>{request.scope.replaceAll("_", " ")}</h3>
                      <p className="route-text">
                        Profile {request.profile_id} · due{" "}
                        <LocalDateTime value={request.due_at} fallback="Date unavailable" dateOnly />
                      </p>
                      {request.request_details ? (
                        <p className="route-text">{request.request_details}</p>
                      ) : null}
                      {request.operator_note ? (
                        <p className="route-text">
                          <strong>Operator note:</strong> {request.operator_note}
                        </p>
                      ) : null}
                      <form action={updateProfileDataRightRequestAction} className="compact-form">
                        <input name="request_id" type="hidden" value={request.id} />
                        <input name="return_to" type="hidden" value="/admin" />
                        <label className="field">
                          <span>Status</span>
                          <select name="status" defaultValue={request.status}>
                            <option value="open">Open</option>
                            <option value="in_review">In review</option>
                            <option value="fulfilled">Fulfilled</option>
                            <option value="denied">Denied</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </label>
                        <label className="field">
                          <span>Operator note</span>
                          <textarea
                            defaultValue={request.operator_note}
                            name="operator_note"
                            placeholder="Resolution, exception, hold, or next action."
                            rows={3}
                          />
                        </label>
                        <button className="button button-secondary button-mini" type="submit">
                          Update request
                        </button>
                      </form>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No open data-right requests.</strong>
                      <p>Participant privacy requests will appear here with due dates.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

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
                {queues && !queues.legacyAgreementReviewAvailable ? (
                  <div className="empty-state">
                    <div>
                      <strong>The legacy agreement review queue is retired.</strong>
                      <p>
                        Current evidence-weighted payment cases are available in the trade review
                        console.
                      </p>
                      <Link className="inline-link" href="/admin/trade-review">
                        Open trade review
                      </Link>
                    </div>
                  </div>
                ) : queues?.agreementEvidenceReviews.length ? (
                  queues.agreementEvidenceReviews.map(({ reviewCase, evidenceItem, agreement }) => {
                    const reviewerConsolePreview = buildAgreementReviewerConsolePreview({
                      appealReason: reviewCase.appeal_reason,
                      assignedReviewerId: reviewCase.assigned_reviewer_id,
                      conflictOfInterestNotes: reviewCase.conflict_of_interest_notes,
                      evidenceItemAttached: Boolean(evidenceItem),
                      neutralReviewAssignment: reviewCase.neutral_review_assignment,
                      reviewPanelNotes: reviewCase.review_panel_notes,
                      reviewScope: reviewCase.review_scope,
                      reviewerConflictState: reviewCase.reviewer_conflict_state,
                      reviewerRole: reviewCase.reviewer_role,
                      status: reviewCase.status,
                    });

                    return (
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
                      <div className="status-banner">
                        <strong>{reviewerConsolePreview.statusLabel}</strong>
                        <p>
                          Conflict:{" "}
                          {reviewerConsolePreview.reviewerConflictState.replaceAll("_", " ")}.
                          Neutral assignment:{" "}
                          {reviewerConsolePreview.neutralReviewAssignment.replaceAll("_", " ")}.
                        </p>
                        <div className="mini-list" aria-label="Reviewer console gates">
                          {reviewerConsolePreview.gates.map((gate) => (
                            <span className="source-pill" key={gate.key}>
                              {gate.label}: {gate.status.replaceAll("_", " ")}
                            </span>
                          ))}
                        </div>
                      </div>
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
                        <fieldset className="review-readiness-fieldset">
                          <legend>Reviewer conflict and neutral assignment</legend>
                          <div className="field-grid">
                            <label className="field">
                              <span>Conflict state</span>
                              <select
                                name="reviewer_conflict_state"
                                defaultValue={reviewCase.reviewer_conflict_state}
                              >
                                <option value="not_checked">Not checked</option>
                                <option value="no_conflict_declared">No conflict declared</option>
                                <option value="possible_conflict">Possible conflict</option>
                                <option value="conflict_disclosed">Conflict disclosed</option>
                                <option value="recused">Recused</option>
                              </select>
                            </label>
                            <label className="field">
                              <span>Neutral review assignment</span>
                              <select
                                name="neutral_review_assignment"
                                defaultValue={reviewCase.neutral_review_assignment}
                              >
                                <option value="unassigned">Unassigned</option>
                                <option value="operator_review_only">Operator review only</option>
                                <option value="neutral_reviewer_assigned">Neutral reviewer assigned</option>
                                <option value="neutral_panel_assigned">Neutral panel assigned</option>
                                <option value="not_required_for_stage">Not required for stage</option>
                              </select>
                            </label>
                          </div>
                          <label className="field">
                            <span>Panel / neutral assignment notes</span>
                            <textarea
                              defaultValue={reviewCase.review_panel_notes}
                              name="review_panel_notes"
                              placeholder="Neutral reviewer, panel composition, recusal handling, or why neutral review is not required."
                              rows={3}
                            />
                          </label>
                        </fieldset>
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
                        <fieldset className="review-readiness-fieldset">
                          <legend>Completion evidence readiness</legend>
                          <label className="checkbox-label">
                            <input name="evidence_artifact_linked" type="checkbox" />
                            <span>Evidence artifact is linked to this review case.</span>
                          </label>
                          <label className="checkbox-label">
                            <input name="claim_scope_aligned" type="checkbox" />
                            <span>Artifact scope matches the exact claim under review.</span>
                          </label>
                          <label className="checkbox-label">
                            <input name="proof_uniqueness_checked" type="checkbox" />
                            <span>Duplicate-proof reuse was checked or explicitly justified.</span>
                          </label>
                          <label className="checkbox-label">
                            <input name="evidence_freshness_reviewed" type="checkbox" />
                            <span>Evidence timestamp or freshness window was reviewed.</span>
                          </label>
                          <label className="checkbox-label">
                            <input name="evidence_agent_links_recorded" type="checkbox" />
                            <span>Participant, reviewer, and provider/attestation agents are recorded.</span>
                          </label>
                        </fieldset>
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
                    );
                  })
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

            <section className="section section-white">
              <div className="section-head">
                <p className="eyebrow">Baseline witness review</p>
                <h2>Guest witness testimony queue</h2>
                <p>
                  Review baseline-only witness statements before they affect additionality or
                  credibility. Social-account verification is identity assurance only; claim
                  credibility depends on relationship, direct knowledge, specificity, consistency,
                  and risk review.
                </p>
              </div>
              <div className="data-grid">
                {queues?.baselineWitnessRiskReports
                  .filter((report) => !report.baseline_witness_testimonial_id)
                  .map((report) => (
                    <article className="panel data-card" key={report.id}>
                      <p className="detail-kicker">
                        {report.report_kind.replaceAll("_", " ")} |{" "}
                        {report.review_status.replaceAll("_", " ")}
                      </p>
                      <h3>Witness risk report</h3>
                      <p className="route-text">{report.redacted_summary}</p>
                      <p className="panel-note">
                        Invite {report.invite_id ?? "not attached"}; participant{" "}
                        {report.participant_user_id ?? "not attached"}. Private report text is
                        stored only by reference hash.
                      </p>
                    </article>
                  ))}
                {queues?.baselineWitnessReviews.length ? (
                  queues.baselineWitnessReviews.map(({ testimonial, invite, assessment, externalAccount, riskReports }) => {
                    const basisText = getJsonString(testimonial.basis_json, "basisText");

                    return (
                      <article className="panel data-card data-card-wide" key={testimonial.id}>
                        <p className="detail-kicker">
                          {testimonial.testimonial_status.replaceAll("_", " ")} |{" "}
                          {testimonial.relationship_type.replaceAll("_", " ")}
                        </p>
                        <h3>
                          Baseline credence{" "}
                          {Math.round(testimonial.baseline_counterfactual_credence_decimal * 100)}%
                        </h3>
                        <div className="tag-row">
                          <span className="badge">
                            Identity{" "}
                            {assessment?.identity_assurance_level.replaceAll("_", " ") ?? "pending"}
                          </span>
                          <span className="source-pill">
                            Provider {externalAccount?.provider ?? "not recorded"}
                          </span>
                          <span className="source-pill">
                            Knowledge {testimonial.baseline_knowledge_level}
                          </span>
                          <span className="source-pill">
                            Observed {testimonial.recent_meal_observation_frequency.replaceAll("_", " ")}
                          </span>
                        </div>
                        {invite ? (
                          <p className="route-text">
                            Invite status {invite.invite_status.replaceAll("_", " ")}; action
                            window{" "}
                            <LocalDateTime
                              value={invite.action_window_start_at}
                              fallback="Date unavailable"
                              dateOnly
                            />{" "}
                            to{" "}
                            <LocalDateTime
                              value={invite.action_window_end_at}
                              fallback="Date unavailable"
                              dateOnly
                            />.
                          </p>
                        ) : null}
                        <div className="field-grid">
                          <div>
                            <h4>Private testimony basis</h4>
                            <p className="route-text">{basisText || "No basis text recorded."}</p>
                            {testimonial.uncertainty_notes_private ? (
                              <p className="route-text">
                                <strong>Uncertainty:</strong> {testimonial.uncertainty_notes_private}
                              </p>
                            ) : null}
                            {testimonial.concern_notes_private ? (
                              <p className="route-text">
                                <strong>Concern notes:</strong> {testimonial.concern_notes_private}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <h4>Quality assessment</h4>
                            {assessment ? (
                              <div className="mini-list">
                                <span className="source-pill">
                                  Probative {assessment.baseline_probative_value_score_decimal.toFixed(2)}
                                </span>
                                <span className="source-pill">
                                  Relationship {assessment.relationship_weight_decimal.toFixed(2)}
                                </span>
                                <span className="source-pill">
                                  Knowledge {assessment.knowledge_basis_score_decimal.toFixed(2)}
                                </span>
                                <span className="source-pill">
                                  Specificity {assessment.specificity_score_decimal.toFixed(2)}
                                </span>
                                <span className="source-pill">
                                  Independence {assessment.independence_score_decimal.toFixed(2)}
                                </span>
                                <span className="source-pill">
                                  Consistency {assessment.consistency_score_decimal.toFixed(2)}
                                </span>
                                <span className="source-pill">
                                  Collusion risk {assessment.collusion_risk_score_decimal.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <p className="route-text">No quality assessment is attached.</p>
                            )}
                          </div>
                        </div>
                        {riskReports.length ? (
                          <div className="status-banner status-banner-error">
                            <strong>Private risk report</strong>
                            <div className="mini-list">
                              {riskReports.map((report) => (
                                <span className="source-pill" key={report.id}>
                                  {report.report_kind.replaceAll("_", " ")} |{" "}
                                  {report.review_status.replaceAll("_", " ")}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <p className="panel-note">
                          Participant-visible state remains status-only. Do not copy private notes,
                          social handles, provider ids, refusal reasons, or scores into participant
                          summaries.
                        </p>
                        <form action="/api/moral-trade/guest-witness/review" className="compact-form" method="post">
                          <input name="testimonial_id" type="hidden" value={testimonial.id} />
                          <input name="assessment_id" type="hidden" value={assessment?.id ?? ""} />
                          <input name="return_to" type="hidden" value="/admin" />
                          <div className="field-grid">
                            <label className="field">
                              <span>Decision</span>
                              <select defaultValue="needs_more_info" name="decision">
                                <option value="accept">Accept for additionality and credibility</option>
                                <option value="partial">Accept for additionality only</option>
                                <option value="reject">Reject</option>
                                <option value="needs_more_info">Needs more information</option>
                                <option value="dispute">Disputed</option>
                              </select>
                            </label>
                            <label className="field">
                              <span>Participant-safe summary</span>
                              <input
                                name="participant_visible_summary"
                                placeholder="Optional coarse status summary only"
                              />
                            </label>
                          </div>
                          <label className="field">
                            <span>Private reviewer notes</span>
                            <textarea
                              name="private_reviewer_notes"
                              placeholder="Policy trace, uncertainty, and risk rationale."
                              rows={4}
                            />
                          </label>
                          <button
                            className="button button-primary button-mini"
                            disabled={!assessment}
                            type="submit"
                          >
                            Save witness decision
                          </button>
                        </form>
                      </article>
                    );
                  })
                ) : queues?.baselineWitnessRiskReports.some(
                    (report) => !report.baseline_witness_testimonial_id,
                  ) ? null : (
                  <div className="empty-state">
                    <div>
                      <strong>No guest witness reviews.</strong>
                      <p>Submitted baseline testimony and witness pressure reports will appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section section-white">
              <div className="section-head">
                <p className="eyebrow">Pledge bond review</p>
                <h2>Performance bond challenge queue</h2>
                <p>
                  Review challenged or overdue pledge performance bonds with their evidence schema,
                  challenge reason, ledger status, and audit trail. Reviewer decisions require a
                  written reason.
                </p>
              </div>
              <div className="data-grid">
                {queues?.performanceBondReviews.length ? (
                  queues.performanceBondReviews.map(
                    ({ bond, evidence, challenges, ledgerEntries, auditEvents, offer, agreement }) => {
                      const evidenceSchema = evidenceSchemaFromJson(bond.evidence_schema);
                      const latestEvidence = evidence[0] ?? null;
                      const latestChallenge = challenges[0] ?? null;

                      return (
                        <article className="panel data-card data-card-wide" key={bond.id}>
                          <p className="detail-kicker">
                            {bond.side === "offerer" ? "Offer-maker bond" : "Taker bond"} |{" "}
                            {formatAdminState(bond.status)}
                          </p>
                          <h3>{formatPerformanceBondAmount(bond.amount_cents, bond.currency)}</h3>
                          <div className="tag-row">
                            <span className="badge">Funding {formatAdminState(bond.funding_status)}</span>
                            <span className="source-pill">Party {bond.party_id}</span>
                            <span className="source-pill">
                              Counterparty {bond.counterparty_id ?? "not locked"}
                            </span>
                            {agreement ? (
                              <span className="source-pill">
                                Agreement {agreement.id.slice(0, 8)}
                              </span>
                            ) : null}
                          </div>
                          {offer ? (
                            <p className="route-text">
                              Offer context: {offer.offered_cause} for {offer.requested_cause}.{" "}
                              {offer.offer_action}
                            </p>
                          ) : null}
                          <div className="field-grid">
                            <div>
                              <h4>Evidence schema</h4>
                              <p className="route-text">
                                <strong>Action:</strong> {evidenceSchema.actionToProve}
                              </p>
                              <p className="route-text">
                                <strong>Evidence types:</strong> {evidenceSchema.acceptedEvidenceTypes}
                              </p>
                              <p className="route-text">
                                <strong>Minimum detail:</strong> {evidenceSchema.minimumDetail}
                              </p>
                              <p className="route-text">
                                <strong>Review standard:</strong> {evidenceSchema.reviewStandard}
                              </p>
                              <p className="route-text">
                                <strong>Visibility:</strong>{" "}
                                {formatAdminState(evidenceSchema.visibility)}
                              </p>
                            </div>
                            <div>
                              <h4>Bond terms</h4>
                              <p className="route-text">
                                Evidence due{" "}
                                {bond.evidence_due_at
                                  ? <LocalDateTime
                                      value={bond.evidence_due_at}
                                      fallback="Date unavailable"
                                      dateOnly
                                    />
                                  : "not set"}
                                ; challenge window {bond.challenge_window_days} days.
                              </p>
                              <p className="route-text">
                                <strong>Forfeiture rule:</strong>{" "}
                                {formatPerformanceBondDestination(bond)}
                              </p>
                              <p className="route-text">
                                <strong>No-trade baseline:</strong> {bond.no_trade_baseline}
                              </p>
                              <p className="route-text">
                                <strong>Additionality:</strong> {bond.additionality_statement}
                              </p>
                            </div>
                          </div>
                          {latestEvidence ? (
                            <div className="status-banner">
                              <strong>Submitted evidence</strong>
                              <p>{latestEvidence.evidence_text}</p>
                              {latestEvidence.evidence_urls.length ? (
                                <div className="mini-list">
                                  {latestEvidence.evidence_urls.map((url) => (
                                    <a className="inline-link" href={url} key={url}>
                                      Open evidence link
                                    </a>
                                  ))}
                                </div>
                              ) : null}
                              {latestEvidence.redaction_notes ? (
                                <p className="panel-note">
                                  Redaction notes: {latestEvidence.redaction_notes}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="route-text">No evidence has been submitted yet.</p>
                          )}
                          {latestChallenge ? (
                            <div className="status-banner status-banner-error">
                              <strong>Challenge reason</strong>
                              <p>{latestChallenge.reason}</p>
                              <p>{latestChallenge.specific_objection}</p>
                              <p className="panel-note">
                                Requested outcome: {latestChallenge.requested_outcome}
                              </p>
                            </div>
                          ) : null}
                          <form action={adjudicatePerformanceBondChallengeAction} className="compact-form">
                            <input name="bond_id" type="hidden" value={bond.id} />
                            <input name="challenge_id" type="hidden" value={latestChallenge?.id ?? ""} />
                            <input name="return_to" type="hidden" value="/admin" />
                            <div className="field-grid">
                              <label className="field">
                                <span>Decision</span>
                                <select defaultValue="request_more_evidence" name="decision">
                                  <option value="accept">Accept evidence and refund</option>
                                  <option value="reject">Reject evidence and release</option>
                                  <option value="request_more_evidence">Request more evidence</option>
                                </select>
                              </label>
                              <label className="field">
                                <span>Appeal deadline</span>
                                <input name="appeal_deadline" type="date" />
                              </label>
                            </div>
                            <label className="radio-row">
                              <input name="appeal_allowed" type="checkbox" />
                              <span>Appeal allowed under this review decision.</span>
                            </label>
                            <label className="field">
                              <span>Decision reason</span>
                              <textarea
                                name="decision_reason"
                                placeholder="Explain the exact evidence-schema match, mismatch, or missing information."
                                required
                                rows={4}
                              />
                            </label>
                            <button className="button button-primary button-mini" type="submit">
                              Save bond decision
                            </button>
                          </form>
                          {ledgerEntries.length ? (
                            <div className="mini-list">
                              {ledgerEntries.slice(0, 5).map((entry) => (
                                <div className="mini-list-item" key={entry.id}>
                                  <strong>
                                    {formatAdminState(entry.type)} |{" "}
                                    {formatPaymentAmount(entry.amount_cents, entry.currency)}
                                  </strong>
                                  <span>
                                    {formatAdminState(entry.status)} to {entry.destination_type}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {auditEvents.length ? (
                            <details className="subtle-panel">
                              <summary className="panel-summary">Audit log</summary>
                              <div className="mini-list">
                                {auditEvents.slice(0, 8).map((event) => (
                                  <div className="mini-list-item" key={event.id}>
                                    <strong>
                                      {formatAdminState(event.event_type)} |{" "}
                                      {formatAdminState(event.from_status)} to{" "}
                                      {formatAdminState(event.to_status)}
                                    </strong>
                                    <span>{event.reason}</span>
                                    <span>
                                      <LocalDateTime value={event.created_at} fallback="Date unavailable" />
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </article>
                      );
                    },
                  )
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No pledge performance bond reviews.</strong>
                      <p>Challenges and overdue bonded pledges will appear here.</p>
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
                      {request.appeal_status !== "none" ? (
                        <div className="status-banner">
                          <strong>Appeal {request.appeal_status.replaceAll("_", " ")}</strong>
                          {request.appeal_reason ? <p>{request.appeal_reason}</p> : null}
                          {request.appeal_resolution_note ? (
                            <p>{request.appeal_resolution_note}</p>
                          ) : null}
                        </div>
                      ) : null}
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
                      {request.no_trade_baseline ? (
                        <p className="route-text">
                          <strong>No-trade baseline:</strong> {request.no_trade_baseline}
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
                              <span>
                                <LocalDateTime value={event.created_at} fallback="Date unavailable" />
                              </span>
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
                        <div className="field-grid">
                          <label className="field">
                            <span>Appeal status</span>
                            <select name="appeal_status" defaultValue={request.appeal_status}>
                              <option value="none">None</option>
                              <option value="requested">Requested</option>
                              <option value="under_review">Under review</option>
                              <option value="resolved">Resolved</option>
                              <option value="dismissed">Dismissed</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>Appeal resolution</span>
                            <input
                              defaultValue={request.appeal_resolution_note}
                              name="appeal_resolution_note"
                              placeholder="What changed, or why the decision stands?"
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
                <p className="detail-kicker">Privacy and safety dashboard</p>
                <h3>Enumeration pressure and weekly review cues</h3>
                <dl className="values-summary compact-summary">
                  <div>
                    <dt>Sparse floor hits</dt>
                    <dd>{sparseFloorHitEvents}</dd>
                  </div>
                  <div>
                    <dt>Budget limited</dt>
                    <dd>{limitedQueryEvents}</dd>
                  </div>
                  <div>
                    <dt>Anomaly reviews</dt>
                    <dd>{anomalyReviewEvents}</dd>
                  </div>
                  <div>
                    <dt>Query risk signals</dt>
                    <dd>{queryBudgetRiskSignals}</dd>
                  </div>
                </dl>
                <p className="route-text">
                  Review sparse-floor hits and medium/high anomaly events weekly; exact queries and
                  wish text stay out of this console.
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
                <p className="eyebrow">Baseline credibility bonds</p>
                <h2>Bond evidence awaiting review</h2>
                <p>
                  Review unmatched baseline evidence and record privacy-safe decisions. Private
                  payment details stay out of this queue and the public audit trail.
                </p>
              </div>
              <div className="data-grid">
                {queues?.baselineBondReviews.length ? (
                  queues.baselineBondReviews.map((review) => {
                    const status = normalizeBaselineBondStatus(review.offset.baseline_bond_status);
                    const amountLabel = review.offset.baseline_bond_amount_cents
                      ? formatBaselineBondAmount(
                          review.offset.baseline_bond_amount_cents,
                          review.offset.baseline_bond_currency ?? "USD",
                        )
                      : "No amount recorded";
                    const appealWindowEndsAt = review.offset.baseline_bond_appeal_window_ends_at;
                    const appealWindowOpen = appealWindowEndsAt
                      ? appealWindowEndsAt > queues.loadedAtIso
                      : false;

                    return (
                      <article className="panel data-card" key={`baseline-bond-${review.offset.offer_id}`}>
                        <p className="detail-kicker">
                          {status.replaceAll("_", " ")} | {amountLabel}
                        </p>
                        <h3>
                          {review.offer?.offered_cause ?? "Offset"} for{" "}
                          {review.offer?.requested_cause ?? "counterparty"}
                        </h3>
                        <p className="route-text">
                          Forfeit destination: {review.charity?.name ?? "Public-good destination missing"}
                        </p>
                        <p className="route-text">
                          Baseline: {formatBaselineBondAmount(review.offset.baseline_amount_cents)} from{" "}
                          {review.offset.baseline_opposed_cause}
                        </p>
                        <p className="route-text">
                          Offer expiry:{" "}
                          {review.offset.offer_expires_at
                            ? <LocalDateTime
                                value={review.offset.offer_expires_at}
                                fallback="Date unavailable"
                              />
                            : "Not recorded"}
                          {" | "}evidence due:{" "}
                          {review.offset.baseline_bond_evidence_due_at
                            ? <LocalDateTime
                                value={review.offset.baseline_bond_evidence_due_at}
                                fallback="Date unavailable"
                              />
                            : "Not recorded"}
                        </p>
                        <p className="route-text">
                          Evidence standard:{" "}
                          {review.offset.baseline_bond_evidence_standard ?? "No standard recorded."}
                        </p>
                        {review.offset.baseline_bond_evidence_url ? (
                          <p className="route-text">
                            Evidence:{" "}
                            <a className="inline-link" href={review.offset.baseline_bond_evidence_url}>
                              open submitted packet
                            </a>
                          </p>
                        ) : (
                          <p className="route-text">Evidence: not submitted yet.</p>
                        )}
                        {appealWindowEndsAt ? (
                          <p className="route-text">
                            Appeal window:{" "}
                            {appealWindowOpen ? "open until " : "closed at "}
                            <LocalDateTime value={appealWindowEndsAt} fallback="Date unavailable" />
                          </p>
                        ) : null}
                        {review.offset.baseline_bond_review_notes ? (
                          <p className="route-text">
                            Review notes: {review.offset.baseline_bond_review_notes}
                          </p>
                        ) : null}
                        <form action={reviewBaselineBondEvidenceAction} className="compact-form">
                          <input name="offer_id" type="hidden" value={review.offset.offer_id} />
                          <input name="return_to" type="hidden" value="/admin" />
                          <label className="field">
                            <span>Reviewer notes</span>
                            <textarea
                              defaultValue={review.offset.baseline_bond_review_notes ?? ""}
                              name="baseline_bond_review_notes"
                              placeholder="Evidence reviewed, appeal state, and decision rationale."
                              rows={3}
                            />
                          </label>
                          <div className="form-actions">
                            <button
                              className="button button-secondary button-mini"
                              name="baseline_bond_decision"
                              type="submit"
                              value="approve"
                            >
                              Approve evidence and mark refund
                            </button>
                            <button
                              className="button button-secondary button-mini"
                              name="baseline_bond_decision"
                              type="submit"
                              value="forfeit"
                            >
                              Forfeit after appeal window
                            </button>
                            <button
                              className="button button-secondary button-mini"
                              name="baseline_bond_decision"
                              type="submit"
                              value="cancel"
                            >
                              Cancel by review
                            </button>
                          </div>
                        </form>
                      </article>
                    );
                  })
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No baseline credibility bond evidence is awaiting review.</strong>
                      <p>Expired unmatched bonded baselines will appear here when evidence opens.</p>
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
