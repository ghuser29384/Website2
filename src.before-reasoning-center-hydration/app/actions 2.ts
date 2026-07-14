"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getSiteUrl, hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import {
  deriveDisplayName,
  ensureAccountRowsForUser,
  getViewer,
  normalizePublicLocationGranularity,
  requireViewer,
} from "@/lib/app-data";
import {
  buildDeterministicClarificationQuestions,
  buildDeterministicSynthesis,
  evaluateDeterministicMatch,
  getBackgroundTokens,
  getDeterministicSignalsFromSynthesis,
  normalizeBackgroundToken,
} from "@/lib/background-networking";
import { getSafeInternalPath } from "@/lib/paths";
import {
  assessDonationOffsetModeration,
  calculateDonationOffsetPreview,
  findRegisteredCharityById,
  formatDonationOffsetUnmatchedRule,
  validateDonationOffsetFields,
  validateDonationOffsetSubmissionGuards,
  type DonationOffsetFields,
  type DonationOffsetParticipationMode,
  type DonationOffsetPoolSide,
  type DonationOffsetTimeHorizon,
  type DonationOffsetUnmatchedSurplusRule,
  type DonationOffsetVerificationMethod,
} from "@/lib/donation-offsets";
import {
  finalizePriorityCorrectionCycle,
  parseStructuredLines,
  publishPriorityCorrectionCycleForMonth,
} from "@/lib/priority-correction";
import { takeRateLimitSlot } from "@/lib/rate-limit";
import {
  calculatePlatformFeeCents,
  getStripe,
  hasStripeEnv,
} from "@/lib/stripe";
import { evidenceLocatorsConflict } from "@/lib/validation";

type WishEntryRow = Database["public"]["Tables"]["wish_entries"]["Row"];
type WishProfileRow = Database["public"]["Tables"]["wish_profiles"]["Row"];
type WishProfilePreviewRow = Database["public"]["Views"]["wish_profile_previews"]["Row"];
type ProfileSourceRow = Database["public"]["Tables"]["profile_sources"]["Row"];
type SourceConnectionRow = Database["public"]["Tables"]["source_connections"]["Row"];
type ProfileSynthesisRow = Database["public"]["Tables"]["profile_syntheses"]["Row"];
type ProfileSourceInsert = Database["public"]["Tables"]["profile_sources"]["Insert"];
type ClarificationQuestionInsert = Database["public"]["Tables"]["clarification_questions"]["Insert"];
type AgreementRow = Database["public"]["Tables"]["agreements"]["Row"];
type AgreementInsert = Database["public"]["Tables"]["agreements"]["Insert"];
type AgreementUpdate = Database["public"]["Tables"]["agreements"]["Update"];
type AgreementEventInsert = Database["public"]["Tables"]["agreement_events"]["Insert"];
type AgreementEvidenceItemInsert =
  Database["public"]["Tables"]["agreement_evidence_items"]["Insert"];
type AgreementEvidenceItemUpdate =
  Database["public"]["Tables"]["agreement_evidence_items"]["Update"];
type AgreementReviewCaseInsert =
  Database["public"]["Tables"]["agreement_review_cases"]["Insert"];
type AgreementReviewCaseUpdate =
  Database["public"]["Tables"]["agreement_review_cases"]["Update"];
type ProfileVerificationBadgeInsert =
  Database["public"]["Tables"]["profile_verification_badges"]["Insert"];
type DonationOffsetOfferInsert = Database["public"]["Tables"]["donation_offset_offers"]["Insert"];
type DonationOffsetMatchInsert = Database["public"]["Tables"]["donation_offset_matches"]["Insert"];
type DonationOffsetPoolInsert = Database["public"]["Tables"]["donation_offset_pools"]["Insert"];
type AgreementPaymentScheduleInsert = Database["public"]["Tables"]["agreement_payment_schedules"]["Insert"];
type PersonalDelegateInsert = Database["public"]["Tables"]["personal_delegates"]["Insert"];
type SourceConnectionInsert = Database["public"]["Tables"]["source_connections"]["Insert"];
type HelperStrategyInsert = Database["public"]["Tables"]["helper_strategies"]["Insert"];
type MatchConciergeRequestInsert =
  Database["public"]["Tables"]["match_concierge_requests"]["Insert"];
type MatchConciergeRequestUpdate =
  Database["public"]["Tables"]["match_concierge_requests"]["Update"];
type MatchIntroductionPlanInsert =
  Database["public"]["Tables"]["match_introduction_plans"]["Insert"];
type MatchIntroductionPlanRow =
  Database["public"]["Tables"]["match_introduction_plans"]["Row"];
type MatchIntroductionTaskInsert =
  Database["public"]["Tables"]["match_introduction_tasks"]["Insert"];
type PrivacyGrantInsert = Database["public"]["Tables"]["privacy_grants"]["Insert"];
type PrivacyGrantUpdate = Database["public"]["Tables"]["privacy_grants"]["Update"];
type PrivacyAccessRequestInsert =
  Database["public"]["Tables"]["privacy_access_requests"]["Insert"];
type CollectiveMemberInsert = Database["public"]["Tables"]["collective_members"]["Insert"];
type CollectiveDecisionInsert = Database["public"]["Tables"]["collective_decisions"]["Insert"];
type CollectiveDecisionResponseInsert =
  Database["public"]["Tables"]["collective_decision_responses"]["Insert"];
type AgreementPaymentStatus = NonNullable<
  Database["public"]["Tables"]["agreement_payments"]["Update"]["status"]
>;
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function redirectWithMessage(
  path: string,
  key: "error" | "message",
  message: string,
): never {
  const target = new URL(path, "https://www.moraltrade.org");
  target.searchParams.set(key, message);

  redirect(`${target.pathname}${target.search}${target.hash}`);
}

function readRequired(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOptional(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readBoolean(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim().toLowerCase();
  return value === "on" || value === "true" || value === "1" || value === "yes";
}

function readPositiveMoneyAmount(formData: FormData, key: string) {
  const rawValue = readOptional(formData, key);

  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Number(parsed.toFixed(2));
}

function readNonNegativeMoneyAmount(formData: FormData, key: string) {
  const rawValue = readOptional(formData, key);

  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Number(parsed.toFixed(2));
}

function readStringList(formData: FormData, key: string) {
  const rawValue = readOptional(formData, key);

  if (!rawValue) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    return rawValue
      .split(/[,;\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
}

function logSupabaseActionError(
  context: string,
  error: PostgrestError | Error | null | undefined,
  metadata: Record<string, string | number | boolean | null | undefined> = {},
) {
  if (!error) {
    return;
  }

  console.error(`[supabase] ${context}`, {
    code: "code" in error ? error.code ?? null : null,
    details: "details" in error ? error.details ?? null : null,
    hint: "hint" in error ? error.hint ?? null : null,
    message: error.message,
    ...metadata,
  });
}

function enforceActionRateLimit({
  key,
  limit,
  message,
  returnTo,
  windowMs,
}: {
  key: string;
  limit: number;
  message: string;
  returnTo: string;
  windowMs: number;
}) {
  const result = takeRateLimitSlot(key, { limit, windowMs });

  if (result.limited) {
    redirectWithMessage(returnTo, "error", message);
  }
}

async function queueEmailOutbox({
  profileId,
  recipientEmail,
  subject,
  body,
}: {
  profileId: string;
  recipientEmail: string | null | undefined;
  subject: string;
  body: string;
}) {
  if (!recipientEmail) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("email_outbox").insert({
    profile_id: profileId,
    recipient_email: recipientEmail,
    subject,
    body,
  });

  if (error) {
    logSupabaseActionError("Failed to queue email notification", error, {
      profileId,
      recipientEmail,
    });
  }
}

async function requireAdminViewer(returnTo: string) {
  const viewer = await requireViewer(returnTo);

  if (!isAdminEmail(viewer.authUser.email)) {
    redirectWithMessage(returnTo, "error", "Admin access is required.");
  }

  return viewer;
}

function normalizeOfferMode(value: string) {
  if (value === "offset" || value === "payment") {
    return value;
  }

  return "pledge";
}

function readBoundedInt(
  formData: FormData,
  key: string,
  {
    fallback,
    min,
    max,
  }: {
    fallback: number;
    min: number;
    max: number;
  },
) {
  const rawValue = String(formData.get(key) ?? "").trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsedValue)));
}

function convertUsdToCents(amountUsd: number | null | undefined) {
  if (!Number.isFinite(amountUsd ?? NaN) || !amountUsd || amountUsd <= 0) {
    return 0;
  }

  return Math.round(Number(amountUsd) * 100);
}

function normalizeDonationOffsetTimeHorizon(value: string): DonationOffsetTimeHorizon {
  return value === "recurring" ? "recurring" : "one_off";
}

function normalizeDonationOffsetVerificationMethod(value: string): DonationOffsetVerificationMethod {
  if (
    value === "proof_of_past_donations" ||
    value === "receipts_uploaded" ||
    value === "funds_in_escrow" ||
    value === "third_party_audit"
  ) {
    return value;
  }

  return "proof_of_past_donations";
}

function normalizeDonationOffsetUnmatchedRule(value: string): DonationOffsetUnmatchedSurplusRule {
  if (
    value === "donate_to_compromise_destination" ||
    value === "donate_to_original_cause" ||
    value === "split_evenly"
  ) {
    return value;
  }

  return "return_to_donors";
}

function normalizeDonationOffsetParticipationMode(value: string): DonationOffsetParticipationMode {
  return value === "pool" ? "pool" : "direct";
}

function normalizeDonationOffsetPoolSide(value: string): DonationOffsetPoolSide | "" {
  if (value === "side_a" || value === "side_b") {
    return value;
  }

  return "";
}

const blockedWishPatterns: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(kill|murder|assault|poison|bomb|terror|weaponize)\b/i, label: "violence" },
  { pattern: /\b(harass|stalk|dox|doxx|blackmail|extort|threaten)\b/i, label: "coercion or harassment" },
  { pattern: /\b(fraud|scam|bribe|hack|steal|illegal|launder)\b/i, label: "illegal or deceptive action" },
  { pattern: /\b(exploit|traffick|groom|abuse)\b/i, label: "exploitative ask" },
];

function detectBlockedWishText(values: string[]) {
  const combined = values.join("\n");

  for (const { pattern, label } of blockedWishPatterns) {
    if (pattern.test(combined)) {
      return label;
    }
  }

  return null;
}

function truncateText(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

function normalizeMatchToken(value: string) {
  return value.trim().toLowerCase();
}

function formatCauseList(causes: string[]) {
  if (!causes.length) {
    return "open moral priorities";
  }

  if (causes.length === 1) {
    return causes[0];
  }

  return `${causes.slice(0, -1).join(", ")} and ${causes[causes.length - 1]}`;
}

function buildBroadWishPreview({
  causes,
  openToPayment,
  openToPledges,
}: {
  causes: string[];
  openToPayment: boolean;
  openToPledges: boolean;
}) {
  const tradeForms = [
    openToPayment ? "payment-mediated trades" : "",
    openToPledges ? "pledge-based trades" : "",
  ].filter(Boolean);

  return truncateText(
    `Interested in moral trades around ${formatCauseList(causes)}${
      tradeForms.length ? `; open to ${tradeForms.join(" and ")}` : ""
    }.`,
    220,
  );
}

function inferTradeMode({
  openToPayment,
  openToPledges,
  tradeShape,
}: {
  openToPayment: boolean;
  openToPledges: boolean;
  tradeShape: string;
}) {
  const normalizedShape = tradeShape.toLowerCase();

  if (openToPayment || normalizedShape.includes("paid")) {
    return "payment";
  }

  if (openToPledges || normalizedShape.includes("pledge")) {
    return "pledge";
  }

  if (normalizedShape.includes("donation")) {
    return "donation";
  }

  return "open";
}

function normalizeParticipantKind(value: string) {
  if (value === "collective" || value === "institution") {
    return value;
  }

  return "individual";
}

function normalizePrivacyStage(value: string) {
  if (value === "strict" || value === "limited") {
    return value;
  }

  return "broad";
}

function normalizeMatchFrequency(value: string) {
  if (value === "manual" || value === "monthly") {
    return value;
  }

  return "weekly";
}

function normalizeDelegateMode(value: string): PersonalDelegateInsert["operating_mode"] {
  if (value === "active" || value === "paused") {
    return value;
  }

  return "passive";
}

function normalizeDelegateRiskTolerance(value: string): PersonalDelegateInsert["risk_tolerance"] {
  if (value === "moderate" || value === "exploratory") {
    return value;
  }

  return "conservative";
}

function normalizeIntroductionPolicy(value: string): PersonalDelegateInsert["introduction_policy"] {
  if (value === "auto_draft_only") {
    return value;
  }

  return "ask_each_time";
}

function normalizeSourceConnectionProvider(value: string): SourceConnectionInsert["provider"] {
  if (
    value === "social" ||
    value === "blog" ||
    value === "email" ||
    value === "calendar" ||
    value === "chat_history" ||
    value === "search_profile" ||
    value === "other"
  ) {
    return value;
  }

  return "manual";
}

function normalizeSourceImportMode(
  value: string,
): SourceConnectionInsert["import_mode"] {
  if (value === "manual_paste" || value === "rss_pull" || value === "forwarded_note") {
    return value;
  }

  return "manual_review";
}

function normalizeSourceSyncFrequency(
  value: string,
): SourceConnectionInsert["sync_frequency"] {
  if (value === "weekly" || value === "monthly") {
    return value;
  }

  return "manual";
}

function normalizeSourceAccessStatus(value: string): SourceConnectionInsert["access_status"] {
  if (value === "connected" || value === "revoked" || value === "needs_review") {
    return value;
  }

  return "not_connected";
}

function normalizeHelperKind(value: string): HelperStrategyInsert["helper_kind"] {
  if (
    value === "payment_compatibility" ||
    value === "geographic" ||
    value === "network_expansion" ||
    value === "saved_search" ||
    value === "risk_filter"
  ) {
    return value;
  }

  return "cause_overlap";
}

function normalizePrivacyAudienceStage(
  value: string,
): PrivacyGrantInsert["audience_stage"] {
  if (value === "consent" || value === "introduced") {
    return value;
  }

  return "registry";
}

function normalizePrivacyAccessLevel(value: string): PrivacyGrantInsert["access_level"] {
  if (value === "hidden" || value === "specific" || value === "contact") {
    return value;
  }

  return "broad";
}

function normalizePrivacyGrantStatus(value: string): PrivacyGrantInsert["status"] {
  if (value === "granted" || value === "revoked") {
    return value;
  }

  return "draft";
}

function normalizeBrokerageTargetKind(
  value: string,
): Database["public"]["Tables"]["brokerage_bounties"]["Insert"]["target_kind"] {
  if (value === "group" || value === "institution" || value === "public_call") {
    return value;
  }

  return "counterparty";
}

function normalizeBrokerageRewardType(
  value: string,
): Database["public"]["Tables"]["brokerage_bounties"]["Insert"]["reward_type"] {
  if (
    value === "verified_trade" ||
    value === "group_formation" ||
    value === "research_lead"
  ) {
    return value;
  }

  return "introduction";
}

function normalizeCollectiveVerificationStatus(
  value: string,
): Database["public"]["Tables"]["collectives"]["Insert"]["verification_status"] {
  if (value === "review_pending" || value === "verified") {
    return value;
  }

  return "unverified";
}

function normalizeNetworkInviteTargetKind(
  value: string,
): Database["public"]["Tables"]["network_invites"]["Insert"]["target_kind"] {
  if (
    value === "collective" ||
    value === "institution" ||
    value === "community" ||
    value === "public_call"
  ) {
    return value;
  }

  return "person";
}

function normalizeSourceType(value: string) {
  if (
    value === "social" ||
    value === "blog" ||
    value === "chat_history" ||
    value === "email" ||
    value === "calendar" ||
    value === "other"
  ) {
    return value;
  }

  return "manual";
}

function normalizeSourceContentKind(
  value: string,
): ProfileSourceInsert["content_kind"] {
  if (
    value === "pasted_excerpt" ||
    value === "public_post" ||
    value === "email_note" ||
    value === "chat_note" ||
    value === "calendar_note"
  ) {
    return value;
  }

  return "manual_summary";
}

function normalizeCollectiveDecisionType(
  value: string,
): CollectiveDecisionInsert["decision_type"] {
  if (
    value === "match_review" ||
    value === "privacy_grant" ||
    value === "bounty_award" ||
    value === "verification_request"
  ) {
    return value;
  }

  return "general";
}

function normalizeCollectiveDecisionTargetKind(
  value: string,
): CollectiveDecisionInsert["target_kind"] {
  if (value === "collective" || value === "bounty" || value === "privacy_grant" || value === "internal") {
    return value;
  }

  return "match";
}

function normalizeCollectiveDecisionResponse(
  value: string,
): CollectiveDecisionResponseInsert["response"] {
  if (value === "reject" || value === "abstain") {
    return value;
  }

  return "approve";
}

function normalizeCollectiveMemberRole(
  value: string,
): CollectiveMemberInsert["role"] {
  if (value === "owner" || value === "admin" || value === "viewer") {
    return value;
  }

  return "member";
}

function normalizeCollectiveMemberStatus(
  value: string,
): CollectiveMemberInsert["status"] {
  if (value === "active" || value === "removed") {
    return value;
  }

  return "invited";
}

function parseOptionalTimestamp(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildHelperStrategyConfig(formData: FormData) {
  const focusCauses = readStringList(formData, "focus_causes_json");
  const requiredTerms = readStringList(formData, "required_terms_json");
  const preferredRegions = readStringList(formData, "preferred_regions_json");

  return {
    focusCauses,
    maxMissingFields: readBoundedInt(formData, "max_missing_fields", {
      fallback: 9,
      min: 0,
      max: 12,
    }),
    notes: readOptional(formData, "strategy_notes"),
    preferredRegions,
    preferExistingSources: readBoolean(formData, "prefer_existing_sources"),
    requireCollectiveApproval: readBoolean(formData, "require_collective_approval"),
    requiredTerms,
    requireCollective: readBoolean(formData, "require_collective"),
    requirePayment: readBoolean(formData, "require_payment"),
    requirePledges: readBoolean(formData, "require_pledges"),
    requireVerification: readBoolean(formData, "require_verification"),
    respectStrictPrivacy: readBoolean(formData, "respect_strict_privacy"),
  };
}

function normalizeCurrency(value: string) {
  const normalized = value.trim().toLowerCase();

  return /^[a-z]{3}$/.test(normalized) ? normalized : "usd";
}

function normalizePaymentCadenceUnit(value: string) {
  if (
    value === "one_time" ||
    value === "day" ||
    value === "month" ||
    value === "year" ||
    value === "custom_days"
  ) {
    return value;
  }

  return "one_time";
}

function normalizePaymentScheduleUnit(
  value: string,
): AgreementPaymentScheduleInsert["cadence_interval_unit"] {
  if (value === "month" || value === "year" || value === "custom_days") {
    return value;
  }

  return "day";
}

function computeNextDueAt({
  cadenceValue,
  cadenceUnit,
  startDate,
}: {
  cadenceValue: number;
  cadenceUnit: AgreementPaymentScheduleInsert["cadence_interval_unit"];
  startDate?: string;
}) {
  const baseDate = startDate ? new Date(startDate) : new Date();

  if (Number.isNaN(baseDate.getTime())) {
    return new Date().toISOString();
  }

  if (cadenceUnit === "month") {
    baseDate.setMonth(baseDate.getMonth() + cadenceValue);
  } else if (cadenceUnit === "year") {
    baseDate.setFullYear(baseDate.getFullYear() + cadenceValue);
  } else {
    baseDate.setDate(baseDate.getDate() + cadenceValue);
  }

  return baseDate.toISOString();
}

function addHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function addDaysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeAgreementEventType(value: string): AgreementEventInsert["event_type"] {
  if (
    value === "counterproposal" ||
    value === "verification_submitted" ||
    value === "cancellation_requested" ||
    value === "dispute_opened" ||
    value === "status_change" ||
    value === "payment_update" ||
    value === "terms_updated" ||
    value === "evidence_submitted" ||
    value === "review_status_changed" ||
    value === "challenge_opened" ||
    value === "appeal_requested" ||
    value === "verification_badge_updated"
  ) {
    return value;
  }

  return "note";
}

function normalizeAgreementStatus(value: string): Database["public"]["Enums"]["agreement_status"] {
  if (value === "proposed" || value === "completed" || value === "cancelled") {
    return value;
  }

  return "active";
}

function normalizeAgreementCompletionState(value: string): NonNullable<AgreementUpdate["completion_state"]> {
  if (
    value === "under_review" ||
    value === "challenge_window_open" ||
    value === "reviewed_complete" ||
    value === "disputed_unresolved"
  ) {
    return value;
  }

  return "pending_evidence";
}

function normalizeEvidenceTradeType(value: string): NonNullable<AgreementEvidenceItemInsert["trade_type"]> {
  if (
    value === "donation_offset" ||
    value === "mpgf" ||
    value === "paid_action" ||
    value === "other"
  ) {
    return value;
  }

  return "pledge_swap";
}

function normalizeEvidenceType(value: string): NonNullable<AgreementEvidenceItemInsert["evidence_type"]> {
  if (
    value === "receipt" ||
    value === "provider_record" ||
    value === "public_log" ||
    value === "timestamped_commitment" ||
    value === "third_party_review" ||
    value === "other"
  ) {
    return value;
  }

  return "manual_attestation";
}

function normalizeReviewCaseStatus(value: string): NonNullable<AgreementReviewCaseUpdate["status"]> {
  if (
    value === "under_review" ||
    value === "challenge_window_open" ||
    value === "reviewed_complete" ||
    value === "disputed_unresolved" ||
    value === "appealed" ||
    value === "closed"
  ) {
    return value;
  }

  return "open";
}

function normalizeReviewerRole(value: string): NonNullable<AgreementReviewCaseUpdate["reviewer_role"]> {
  if (value === "validator" || value === "external_reviewer" || value === "admin") {
    return value;
  }

  return "operator";
}

function normalizeVerificationBadgeType(value: string): ProfileVerificationBadgeInsert["badge_type"] {
  if (
    value === "organization_verified" ||
    value === "payment_evidence_verified" ||
    value === "completion_reviewed" ||
    value === "repeat_counterparty"
  ) {
    return value;
  }

  return "identity_verified";
}

function normalizeVerificationBadgeStatus(value: string): ProfileVerificationBadgeInsert["status"] {
  if (value === "verified" || value === "rejected" || value === "revoked") {
    return value;
  }

  return "pending";
}

function readMoneyCents(formData: FormData, key: string) {
  const rawValue = readRequired(formData, key).replace(/[$,\s]/g, "");
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.round(parsed * 100);
}

function normalizeAccessLevel(value: string) {
  if (value === "none" || value === "metadata_only") {
    return value;
  }

  return "manual_summary";
}

async function loadParticipantAgreementOrRedirect(
  supabase: SupabaseServerClient,
  agreementId: string,
  userId: string,
  returnTo: string,
): Promise<AgreementRow> {
  const { data: agreement, error } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (error || !agreement) {
    redirectWithMessage(returnTo, "error", error?.message ?? "Agreement not found.");
  }

  if (agreement.proposer_id !== userId && agreement.responder_id !== userId) {
    redirectWithMessage(returnTo, "error", "You can only update your own agreement rooms.");
  }

  return agreement as AgreementRow;
}

function normalizeAudienceStage(
  value: string,
): PrivacyGrantInsert["audience_stage"] | PrivacyAccessRequestInsert["requested_stage"] {
  if (value === "registry" || value === "introduced") {
    return value;
  }

  return "consent";
}

function normalizeReportReason(value: string) {
  if (
    value === "unsafe" ||
    value === "spam" ||
    value === "privacy" ||
    value === "coercion" ||
    value === "illegal"
  ) {
    return value;
  }

  return "other";
}

function normalizeConciergeRoute(value: string): NonNullable<MatchConciergeRequestInsert["route"]> {
  if (
    value === "pledge_swap" ||
    value === "donation_offset" ||
    value === "mpgf" ||
    value === "other"
  ) {
    return value;
  }

  return "private_match";
}

function normalizeConciergeStatus(value: string): NonNullable<MatchConciergeRequestUpdate["status"]> {
  if (
    value === "triaged" ||
    value === "waiting_on_requester" ||
    value === "waiting_on_counterparty" ||
    value === "introduced" ||
    value === "declined" ||
    value === "closed"
  ) {
    return value;
  }

  return "open";
}

function buildSlaDueAt(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function buildIntroductionPlanPayloads({
  matchId,
  profileAId,
  profileBId,
  reasonForA,
  reasonForB,
  suggestedFirstStep,
  riskNotes,
}: {
  matchId: string;
  profileAId: string;
  profileBId: string;
  reasonForA: string;
  reasonForB: string;
  suggestedFirstStep: string;
  riskNotes: string;
}): MatchIntroductionPlanInsert[] {
  const sharedAgenda =
    "1. Restate the proposed trade in plain language.\n2. Name the requested action, burden, and time horizon.\n3. Name any payment or pledge cadence.\n4. List non-negotiable constraints, privacy boundaries, and exit conditions.\n5. Agree on evidence, check-ins, and who can see which facts.";
  const proposalTerms =
    "Requested action; offered consideration; cadence or duration; verification evidence; off-ramp; what remains private unless expressly granted.";
  const timeline =
    "Within 48 hours: confirm interest and missing facts. Within 7 days: exchange a bounded proposal. After agreement: schedule the first verification checkpoint.";
  const nextActions =
    "Decide whether to continue. If yes, convert the proposal into an agreement with verification, payment cadence, and cancellation terms. If no, archive the intro without revealing unnecessary details.";
  const verificationPlan =
    "Use lightweight evidence first: receipts, dated commitments, check-in notes, or mutually acceptable attestations. Escalate to admin review only when both parties think the record is unclear.";
  const privacyNotes =
    "Do not reveal contact details, exact wishes, sensitive constraints, or third-party information beyond fields each side explicitly grants.";

  return [
    {
      match_id: matchId,
      profile_id: profileAId,
      counterparty_id: profileBId,
      status: "draft",
      intro_message: truncateText(`Both sides opted in. Start from this reason: ${reasonForA}`, 520),
      proposal_outline: truncateText(suggestedFirstStep || reasonForA, 520),
      proposal_terms: proposalTerms,
      agenda: sharedAgenda,
      timeline,
      next_actions: nextActions,
      verification_plan: verificationPlan,
      privacy_notes: riskNotes ? `${privacyNotes}\nRisk note: ${riskNotes}` : privacyNotes,
    },
    {
      match_id: matchId,
      profile_id: profileBId,
      counterparty_id: profileAId,
      status: "draft",
      intro_message: truncateText(`Both sides opted in. Start from this reason: ${reasonForB}`, 520),
      proposal_outline: truncateText(suggestedFirstStep || reasonForB, 520),
      proposal_terms: proposalTerms,
      agenda: sharedAgenda,
      timeline,
      next_actions: nextActions,
      verification_plan: verificationPlan,
      privacy_notes: riskNotes ? `${privacyNotes}\nRisk note: ${riskNotes}` : privacyNotes,
    },
  ];
}

function buildIntroductionTaskPayloads({
  planId,
  profileId,
}: {
  planId: string;
  profileId: string;
}): MatchIntroductionTaskInsert[] {
  return [
    {
      plan_id: planId,
      profile_id: profileId,
      step_key: "confirm_scope",
      title: "Confirm the scope of the proposed trade",
      detail:
        "Restate what each side wants, what each side is offering, and what remains outside scope before sharing more detail.",
      sort_order: 1,
      status: "pending",
    },
    {
      plan_id: planId,
      profile_id: profileId,
      step_key: "set_action",
      title: "Name the requested action in bounded terms",
      detail:
        "Specify the action, burden, duration, and any material conditions so the proposal is concrete rather than aspirational.",
      sort_order: 2,
      status: "pending",
    },
    {
      plan_id: planId,
      profile_id: profileId,
      step_key: "set_cadence",
      title: "Set cadence, duration, and off-ramp",
      detail:
        "If money or pledges are involved, state the cadence, total duration, pauses, and what ends the arrangement.",
      sort_order: 3,
      status: "pending",
    },
    {
      plan_id: planId,
      profile_id: profileId,
      step_key: "set_verification",
      title: "Agree on lightweight verification",
      detail:
        "Decide what evidence, receipts, check-ins, or attestations will count, and how often they are expected.",
      sort_order: 4,
      status: "pending",
    },
    {
      plan_id: planId,
      profile_id: profileId,
      step_key: "set_privacy",
      title: "Set privacy boundaries for the introduction",
      detail:
        "Decide what can be shown to the counterparty, what stays hidden, and which disclosures require an explicit privacy grant.",
      sort_order: 5,
      status: "pending",
    },
    {
      plan_id: planId,
      profile_id: profileId,
      step_key: "decide_next_step",
      title: "Choose the next concrete step",
      detail:
        "Either convert the proposal into an agreement, request narrower information, or archive the introduction without oversharing.",
      sort_order: 6,
      status: "pending",
    },
  ];
}

function getOrderedProfilePair(profileId: string, counterpartyId: string) {
  return profileId < counterpartyId
    ? { profileAId: profileId, profileBId: counterpartyId, viewerIsProfileA: true }
    : { profileAId: counterpartyId, profileBId: profileId, viewerIsProfileA: false };
}

function getSharedCause(left: string[], right: string[]) {
  const rightSet = new Set(right.map(normalizeBackgroundToken));
  return left.find((cause) => rightSet.has(normalizeBackgroundToken(cause))) ?? null;
}

async function generateWishMatchSuggestions({
  profileId,
  causes,
  wishText,
  askText,
  offerText,
  openToPayment,
  openToPledges,
  viewerEntry,
  runReason = "profile-save",
}: {
  profileId: string;
  causes: string[];
  wishText: string;
  askText: string;
  offerText: string;
  openToPayment: boolean;
  openToPledges: boolean;
  viewerEntry: WishEntryRow | null;
  runReason?: string;
}) {
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();
  const [{ data: previews, error }, { data: viewerProfile }, { data: viewerSynthesis }] =
    await Promise.all([
      supabase
        .from("wish_profile_previews")
        .select("*")
        .neq("profile_id", profileId)
        .eq("background_search_enabled", true)
        .limit(40),
      supabase.from("wish_profiles").select("*").eq("profile_id", profileId).maybeSingle(),
      serviceSupabase.from("profile_syntheses").select("*").eq("profile_id", profileId).maybeSingle(),
    ]);

  if (error || !viewerProfile) {
    logSupabaseActionError("Failed to load wish previews for match generation", error, {
      profileId,
    });
    return { candidatesScanned: 0, matchesCreated: 0, matchesRefreshed: 0 };
  }

  const previewRows = (previews ?? []) as WishProfilePreviewRow[];
  const previewIds = previewRows.map((preview) => preview.profile_id);
  const { data: counterpartySyntheses, error: synthesisError } = previewIds.length
    ? await serviceSupabase.from("profile_syntheses").select("*").in("profile_id", previewIds)
    : { data: [] as ProfileSynthesisRow[], error: null };

  if (synthesisError) {
    logSupabaseActionError("Failed to load counterparty syntheses for match generation", synthesisError, {
      profileId,
    });
  }

  const synthesisByProfileId = new Map(
    ((counterpartySyntheses ?? []) as ProfileSynthesisRow[]).map((synthesis) => [
      synthesis.profile_id,
      synthesis,
    ]),
  );
  const viewerSignals = getDeterministicSignalsFromSynthesis(
    (viewerSynthesis ?? null) as ProfileSynthesisRow | null,
  );

  let matchesCreated = 0;
  let matchesRefreshed = 0;
  const generatedNotifications: Database["public"]["Tables"]["wish_notifications"]["Insert"][] = [];

  for (const preview of previewRows) {
    const evaluation = evaluateDeterministicMatch({
      counterparty: preview,
      counterpartySignals: getDeterministicSignalsFromSynthesis(
        synthesisByProfileId.get(preview.profile_id) ?? null,
      ),
      runLabel: runReason,
      viewer: {
        askText,
        askTerms: viewerSignals?.askTerms,
        brokeragePreference: viewerProfile.brokerage_preference,
        capabilityTags: viewerSignals?.capabilityTags,
        causes,
        collectiveName: viewerProfile.collective_name,
        locationCity: viewerProfile.location_city,
        locationRegion: viewerProfile.location_region,
        offerTerms: viewerSignals?.offerTerms,
        openToPayment,
        openToPledges,
        participantKind: viewerProfile.participant_kind,
        privacyStage: viewerProfile.privacy_stage,
        publicPreview: viewerProfile.public_preview,
        signals: viewerSignals,
        sourceCount: viewerSignals?.sourceCount,
        wishText,
      },
    });

    if (evaluation.score < 52) {
      continue;
    }

    const sharedCause = getSharedCause(causes, preview.causes ?? []);
    const { profileAId, profileBId, viewerIsProfileA } = getOrderedProfilePair(
      profileId,
      preview.profile_id,
    );
    const dedupeKey = [
      profileAId,
      profileBId,
      normalizeBackgroundToken(
        sharedCause ??
          evaluation.sharedTokens[0] ??
          evaluation.compatibilityTags[0] ??
          "general",
      ),
    ].join(":");
    const matchBasis = [
      ...evaluation.compatibilityTags.map((tag) => `Compatibility tag: ${tag}`),
      ...(evaluation.sharedCauses.length
        ? [`Shared causes: ${evaluation.sharedCauses.join(", ")}`]
        : []),
      ...(evaluation.sharedTokens.length
        ? [`Shared terms: ${evaluation.sharedTokens.join(", ")}`]
        : []),
      `Generated by deterministic scan: ${runReason}`,
    ];
    const { data: matchResult, error: matchError } = await supabase.rpc(
      "upsert_match_suggestion",
      {
        target_profile_a_id: profileAId,
        target_profile_b_id: profileBId,
        target_profile_a_entry_id: viewerIsProfileA ? viewerEntry?.id ?? null : null,
        target_profile_b_entry_id: viewerIsProfileA ? null : viewerEntry?.id ?? null,
        target_reason_for_a: viewerIsProfileA ? evaluation.viewerReason : evaluation.counterpartyReason,
        target_reason_for_b: viewerIsProfileA ? evaluation.counterpartyReason : evaluation.viewerReason,
        target_score: evaluation.score,
        target_dedupe_key: dedupeKey,
        target_match_basis: matchBasis,
        target_shared_causes: evaluation.sharedCauses,
        target_suggested_first_step: evaluation.suggestedFirstStep,
        target_risk_notes: evaluation.riskNotes,
        target_generated_by: "rule-based",
      },
    );
    const match = matchResult?.[0] ?? null;

    if (matchError || !match) {
      logSupabaseActionError("Failed to generate wish match suggestion", matchError, {
        profileId,
        counterpartyId: preview.profile_id,
      });
      continue;
    }

    if (match.was_created) {
      matchesCreated += 1;
      generatedNotifications.push(
        {
          profile_id: profileId,
          match_id: match.match_id,
          kind: "match",
          title: "A potential moral trade was found",
          body: evaluation.viewerReason,
        },
        {
          profile_id: preview.profile_id,
          match_id: match.match_id,
          kind: "match",
          title: "A potential moral trade was found",
          body: evaluation.counterpartyReason,
        },
      );
    } else {
      matchesRefreshed += 1;
    }

    const { error: auditError } = await supabase.from("match_audit_events").insert({
      match_id: match.match_id,
      actor_profile_id: profileId,
      event_type: match.was_created ? "match_created" : "match_refreshed",
      summary: `Deterministic scan found compatibility with score ${evaluation.score}.`,
      metadata: {
        compatibilityTags: evaluation.compatibilityTags,
        runReason,
        sharedCauses: evaluation.sharedCauses,
        sharedTokens: evaluation.sharedTokens,
      },
    });

    if (auditError) {
      logSupabaseActionError("Failed to write match audit event", auditError, {
        profileId,
        matchId: match.match_id,
      });
    }
  }

  if (generatedNotifications.length) {
    const { error: notificationError } = await supabase
      .from("wish_notifications")
      .insert(generatedNotifications);

    if (notificationError) {
      logSupabaseActionError("Failed to create wish match notifications", notificationError, {
        profileId,
      });
    }
  }

  return {
    candidatesScanned: previewRows.length,
    matchesCreated,
    matchesRefreshed,
  };
}

export async function signUpAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/signup", "error", "Supabase is not configured yet.");
  }

  const email = readRequired(formData, "email").toLowerCase();
  const password = readRequired(formData, "password");
  const displayName = readRequired(formData, "display_name");
  const city = readOptional(formData, "city");
  const region = readOptional(formData, "region");
  const country = readOptional(formData, "country");

  if (!email || !password) {
    redirectWithMessage("/signup", "error", "Email and password are required.");
  }

  enforceActionRateLimit({
    key: `signup:${email}`,
    limit: 5,
    message: "Too many signup attempts. Wait a few minutes before trying again.",
    returnTo: "/signup",
    windowMs: 15 * 60 * 1000,
  });

  const supabase = await createClient();
  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? getSiteUrl();
  const confirmUrl = `${origin}/auth/confirm`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: confirmUrl,
      data: {
        display_name: displayName,
        city,
        region,
        country,
        public_location_granularity: "hidden",
      },
    },
  });

  if (error) {
    redirectWithMessage("/signup", "error", error.message);
  }

  if (data.user && data.session) {
    await ensureAccountRowsForUser(data.user, supabase);
  }

  redirectWithMessage(
    "/login",
    "message",
    "Account created. Check your email to confirm your address, then sign in.",
  );
}

export async function signInAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/login", "error", "Supabase is not configured yet.");
  }

  const email = readRequired(formData, "email").toLowerCase();
  const password = readRequired(formData, "password");
  const next = getSafeInternalPath(readRequired(formData, "next"), "/dashboard");

  if (!email || !password) {
    redirectWithMessage("/login", "error", "Email and password are required.");
  }

  enforceActionRateLimit({
    key: `login:${email}`,
    limit: 8,
    message: "Too many login attempts. Wait a few minutes before trying again.",
    returnTo: "/login",
    windowMs: 10 * 60 * 1000,
  });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithMessage("/login", "error", error.message);
  }

  if (data.user) {
    await ensureAccountRowsForUser(data.user, supabase);
  }

  redirect(next);
}

export async function signOutAction() {
  if (!hasSupabaseEnv()) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function createOfferAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers/new", "error", "Supabase is not configured yet.");
  }

  const viewer = await requireViewer("/offers/new");
  const supabase = await createClient();

  enforceActionRateLimit({
    key: `offer-create:${viewer.authUser.id}`,
    limit: 8,
    message: "You are creating offers too quickly. Wait a bit before publishing another one.",
    returnTo: "/offers/new",
    windowMs: 60 * 60 * 1000,
  });

  const mode = readRequired(formData, "mode");
  const normalizedMode = normalizeOfferMode(mode);
  if (normalizedMode === "payment") {
    redirectWithMessage(
      "/offers/new?mode=payment",
      "error",
      "General paid action offers are deferred from the public offer wizard while review, identity, dispute, and compliance workflows mature.",
    );
  }

  const offeredCause = readRequired(formData, "offered_cause");
  const requestedCause = readRequired(formData, "requested_cause");
  const ownerAliasOverride = readOptional(formData, "owner_alias_override");
  const offerAction = readRequired(formData, "offer_action");
  const requestAction = readRequired(formData, "request_action");
  const baselineStatement = readRequired(formData, "baseline_statement");
  const exitCondition = readRequired(formData, "exit_condition");
  const compromiseCause = readRequired(formData, "compromise_cause") || "Not needed";
  const verification = readRequired(formData, "verification");
  const duration = readRequired(formData, "duration");
  const paymentIntervalUnit = null;
  const paymentIntervalValue = null;
  const notes = readRequired(formData, "notes");
  const structuredNotes = [
    notes,
    `No-trade baseline / default: ${baselineStatement}`,
    `Exit, pause, or expiry condition: ${exitCondition}`,
  ].join("\n\n");
  const offerImpact = readBoundedInt(formData, "offer_impact", {
    fallback: 7,
    min: 1,
    max: 10,
  });
  const minCounterpartyImpact = readBoundedInt(formData, "min_counterparty_impact", {
    fallback: 6,
    min: 1,
    max: 10,
  });
  const trustLevel = readBoundedInt(formData, "trust_level", {
    fallback: 3,
    min: 1,
    max: 5,
  });
  const baselineAmountUsd = normalizedMode === "offset"
    ? readPositiveMoneyAmount(formData, "baseline_amount_usd")
    : null;
  const baselineOpposedCause = normalizedMode === "offset"
    ? readRequired(formData, "baseline_opposed_cause")
    : "";
  const requestedMatchingAmountUsd = normalizedMode === "offset"
    ? readPositiveMoneyAmount(formData, "requested_matching_amount_usd")
    : null;
  const requestedOpposedCause = normalizedMode === "offset"
    ? readRequired(formData, "requested_opposed_cause")
    : "";
  const compromiseDestinationId = normalizedMode === "offset"
    ? readRequired(formData, "compromise_destination_id")
    : "";
  const offsetRatioRaw = normalizedMode === "offset" ? Number(readOptional(formData, "offset_ratio")) : 1;
  const offsetRatio = Number.isFinite(offsetRatioRaw) && offsetRatioRaw > 0
    ? Number(offsetRatioRaw.toFixed(4))
    : null;
  const offsetTimeHorizon = normalizedMode === "offset"
    ? normalizeDonationOffsetTimeHorizon(readOptional(formData, "offset_time_horizon"))
    : "one_off";
  const offsetVerificationMethod = normalizedMode === "offset"
    ? normalizeDonationOffsetVerificationMethod(readOptional(formData, "offset_verification_method"))
    : "receipts_uploaded";
  const unmatchedSurplusRule = normalizedMode === "offset"
    ? normalizeDonationOffsetUnmatchedRule(readOptional(formData, "unmatched_surplus_rule"))
    : "return_to_donors";
  const participationMode = normalizedMode === "offset"
    ? normalizeDonationOffsetParticipationMode(readOptional(formData, "offset_participation_mode"))
    : "direct";
  const poolId = normalizedMode === "offset" ? readOptional(formData, "offset_pool_id") : "";
  const poolName = normalizedMode === "offset" ? readOptional(formData, "offset_pool_name") : "";
  const poolSide = normalizedMode === "offset"
    ? normalizeDonationOffsetPoolSide(readOptional(formData, "offset_pool_side"))
    : "";
  const assuranceMinimumUsd = normalizedMode === "offset"
    ? readNonNegativeMoneyAmount(formData, "assurance_minimum_usd")
    : null;
  const poolMaximumCapUsd = normalizedMode === "offset"
    ? readPositiveMoneyAmount(formData, "offset_pool_maximum_cap_usd")
    : null;
  const assuranceDeadline = normalizedMode === "offset"
    ? readOptional(formData, "assurance_deadline")
    : "";
  const evidenceUrl = normalizedMode === "offset" ? readOptional(formData, "offset_evidence_url") : "";
  const antiThreatCertification = normalizedMode === "offset"
    ? readBoolean(formData, "offset_anti_threat_certification")
    : false;
  const verificationMetadataAcknowledged = normalizedMode === "offset"
    ? readBoolean(formData, "offset_verification_metadata_acknowledgement")
    : false;
  const newOfferReturnPath =
    normalizedMode === "offset"
      ? `/offers/new?mode=offset${
          participationMode === "pool" ? "&offset_participation_mode=pool" : ""
        }${poolId ? `&offset_pool_id=${encodeURIComponent(poolId)}` : ""}${
          poolSide ? `&offset_pool_side=${poolSide}` : ""
        }`
      : "/offers/new";

  if (!offerAction || !requestAction || !baselineStatement || !exitCondition || !offeredCause || !requestedCause) {
    redirectWithMessage(newOfferReturnPath, "error", "Complete all required offer fields.");
  }

  let donationOffsetFields: DonationOffsetFields | null = null;

  if (normalizedMode === "offset") {
    donationOffsetFields = {
      baselineAmountUsd,
      baselineOpposedCause,
      requestedMatchingAmountUsd,
      requestedOpposedCause,
      compromiseDestinationId,
      offsetRatio,
      timeHorizon: offsetTimeHorizon,
      verificationMethod: offsetVerificationMethod,
      unmatchedSurplusRule,
      participationMode,
      poolId,
      poolName,
      poolSide,
      assuranceMinimumUsd,
      poolMaximumCapUsd,
      assuranceDeadline,
      description: [offerAction, requestAction, structuredNotes].filter(Boolean).join("\n"),
      evidenceUrl,
    };

    const charity = findRegisteredCharityById(compromiseDestinationId);
    const moderation = assessDonationOffsetModeration(donationOffsetFields, charity);
    const validationErrors = [
      ...(donationOffsetFields ? validateDonationOffsetFields(donationOffsetFields) : []),
      ...validateDonationOffsetSubmissionGuards({
        participationMode,
        antiThreatCertification,
        verificationMetadataAcknowledged,
        evidenceUrl,
      }),
    ];

    if (
      !baselineAmountUsd ||
      !requestedMatchingAmountUsd ||
      !baselineOpposedCause ||
      !requestedOpposedCause ||
      !compromiseDestinationId ||
      !offsetRatio
    ) {
      redirectWithMessage(newOfferReturnPath, "error", "Complete all required donation offset fields.");
    }

    if (!charity?.isActive) {
      redirectWithMessage(newOfferReturnPath, "error", "Choose a valid registered compromise destination.");
    }

    if (validationErrors.length) {
      redirectWithMessage(
        newOfferReturnPath,
        "error",
        validationErrors[0] ?? "Complete the donation offset fields.",
      );
    }

    if (moderation.status === "blocked") {
      redirectWithMessage(
        newOfferReturnPath,
        "error",
        moderation.reasons[0] ??
          "This donation offset could not be published because it violates the platform safeguards.",
      );
    }

    if (donationOffsetFields.evidenceUrl) {
      const { data: existingEvidenceRows, error: existingEvidenceError } = await supabase
        .from("donation_offset_offers")
        .select("offer_id, evidence_url")
        .neq("evidence_url", "")
        .limit(500);

      if (existingEvidenceError) {
        logSupabaseActionError(
          "Failed to verify donation offset proof uniqueness",
          existingEvidenceError,
          {
            ownerId: viewer.authUser.id,
          },
        );
        redirectWithMessage(
          newOfferReturnPath,
          "error",
          "Unable to verify proof uniqueness. Try again or ask an operator to review the offset.",
        );
      }

      const duplicateEvidence = existingEvidenceRows?.find((row) =>
        evidenceLocatorsConflict(row.evidence_url, donationOffsetFields?.evidenceUrl),
      );

      if (duplicateEvidence) {
        redirectWithMessage(
          newOfferReturnPath,
          "error",
          "That evidence link is already attached to another offset offer. Use a unique proof packet or ask an operator to review the duplicate.",
        );
      }
    }
  }

  const ownerAlias = ownerAliasOverride || deriveDisplayName(viewer.authUser, viewer.profile);
  await ensureAccountRowsForUser(viewer.authUser, supabase);
  let poolRecord:
    | Database["public"]["Tables"]["donation_offset_pools"]["Row"]
    | null = null;

  if (normalizedMode === "offset" && donationOffsetFields?.participationMode === "pool") {
    if (donationOffsetFields.poolId) {
      const { data: existingPool, error: existingPoolError } = await supabase
        .from("donation_offset_pools")
        .select("*")
        .eq("id", donationOffsetFields.poolId)
        .maybeSingle();

      if (existingPoolError || !existingPool) {
        logSupabaseActionError("Failed to load donation offset pool during offer creation", existingPoolError, {
          ownerId: viewer.authUser.id,
          poolId: donationOffsetFields.poolId,
        });
        redirectWithMessage(
          newOfferReturnPath,
          "error",
          existingPoolError?.message ?? "That offset pool could not be found.",
        );
      }

      if (
        existingPool.status === "closed" ||
        existingPool.moderation_status !== "clear" ||
        existingPool.compromise_charity_id !== donationOffsetFields.compromiseDestinationId ||
        existingPool.time_horizon !== donationOffsetFields.timeHorizon ||
        existingPool.offset_ratio !== (donationOffsetFields.offsetRatio ?? 1) ||
        existingPool.verification_method !== donationOffsetFields.verificationMethod ||
        existingPool.unmatched_surplus_rule !== donationOffsetFields.unmatchedSurplusRule ||
        existingPool.assurance_minimum_cents !==
          convertUsdToCents(donationOffsetFields.assuranceMinimumUsd) ||
        existingPool.maximum_cap_cents !==
          convertUsdToCents(donationOffsetFields.poolMaximumCapUsd) ||
        (existingPool.assurance_deadline_at?.slice(0, 10) ?? "") !==
          (donationOffsetFields.assuranceDeadline?.slice(0, 10) ?? "") ||
        (donationOffsetFields.poolSide === "side_a" &&
          (donationOffsetFields.baselineOpposedCause !== existingPool.side_a_label ||
            donationOffsetFields.requestedOpposedCause !== existingPool.side_b_label)) ||
        (donationOffsetFields.poolSide === "side_b" &&
          (donationOffsetFields.baselineOpposedCause !== existingPool.side_b_label ||
            donationOffsetFields.requestedOpposedCause !== existingPool.side_a_label))
      ) {
        redirectWithMessage(
          newOfferReturnPath,
          "error",
          "Join-pool commitments must use the pool's shared charity, ratio, horizon, verification, surplus rule, assurance settings, maximum cap, and side labels.",
        );
      }

      poolRecord = existingPool;
    } else {
      const poolInsert: DonationOffsetPoolInsert = {
        created_by: viewer.authUser.id,
        name: donationOffsetFields.poolName,
        description: structuredNotes,
        compromise_charity_id: donationOffsetFields.compromiseDestinationId,
        offset_ratio: donationOffsetFields.offsetRatio ?? 1,
        time_horizon: donationOffsetFields.timeHorizon,
        verification_method: donationOffsetFields.verificationMethod,
        unmatched_surplus_rule: donationOffsetFields.unmatchedSurplusRule,
        assurance_minimum_cents: convertUsdToCents(donationOffsetFields.assuranceMinimumUsd),
        maximum_cap_cents: convertUsdToCents(donationOffsetFields.poolMaximumCapUsd),
        assurance_deadline_at: parseOptionalTimestamp(donationOffsetFields.assuranceDeadline),
        side_a_label: donationOffsetFields.baselineOpposedCause,
        side_b_label: donationOffsetFields.requestedOpposedCause,
        status: "open",
        moderation_status: assessDonationOffsetModeration(donationOffsetFields).status,
        moderation_notes: assessDonationOffsetModeration(donationOffsetFields).reasons.join(" "),
      };

      const { data: createdPool, error: createdPoolError } = await supabase
        .from("donation_offset_pools")
        .insert(poolInsert)
        .select("*")
        .single();

      if (createdPoolError || !createdPool) {
        logSupabaseActionError("Failed to create donation offset pool", createdPoolError, {
          ownerId: viewer.authUser.id,
        });
        redirectWithMessage(
          newOfferReturnPath,
          "error",
          createdPoolError?.message ?? "Unable to create the donation offset pool.",
        );
      }

      poolRecord = createdPool;
    }
  }

  const offsetModeration =
    normalizedMode === "offset" && donationOffsetFields
      ? assessDonationOffsetModeration(donationOffsetFields)
      : null;

  const { data, error } = await supabase
    .from("offers")
    .insert({
      owner_id: viewer.authUser.id,
      owner_alias: ownerAlias,
      mode: normalizedMode,
      offered_cause: offeredCause,
      requested_cause: requestedCause,
      offer_action: offerAction,
      request_action: requestAction,
      compromise_cause: normalizedMode === "offset" ? compromiseCause : "Not needed",
      offer_impact: offerImpact,
      min_counterparty_impact: minCounterpartyImpact,
      verification,
      duration,
      payment_interval_unit: paymentIntervalUnit,
      payment_interval_value: paymentIntervalValue,
      trust_level: trustLevel,
      notes: structuredNotes,
      status:
        normalizedMode === "offset" && offsetModeration?.status === "flagged"
          ? "paused"
          : "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    logSupabaseActionError("Failed to create offer", error, {
      ownerId: viewer.authUser.id,
      mode: normalizedMode,
    });
    redirectWithMessage(newOfferReturnPath, "error", error?.message ?? "Unable to create offer.");
  }

  if (normalizedMode === "offset" && donationOffsetFields) {
    const offsetInsert: DonationOffsetOfferInsert = {
      offer_id: data.id,
      baseline_amount_cents: convertUsdToCents(donationOffsetFields.baselineAmountUsd),
      baseline_opposed_cause: donationOffsetFields.baselineOpposedCause,
      requested_matching_amount_cents: convertUsdToCents(
        donationOffsetFields.requestedMatchingAmountUsd,
      ),
      requested_opposed_cause: donationOffsetFields.requestedOpposedCause,
      compromise_charity_id: donationOffsetFields.compromiseDestinationId,
      offset_ratio: donationOffsetFields.offsetRatio ?? 1,
      time_horizon: donationOffsetFields.timeHorizon,
      verification_method: donationOffsetFields.verificationMethod,
      unmatched_surplus_rule: donationOffsetFields.unmatchedSurplusRule,
      participation_mode: donationOffsetFields.participationMode,
      pool_id: poolRecord?.id ?? null,
      pool_side: donationOffsetFields.poolSide || null,
      assurance_minimum_cents: convertUsdToCents(donationOffsetFields.assuranceMinimumUsd),
      assurance_deadline_at: parseOptionalTimestamp(donationOffsetFields.assuranceDeadline),
      evidence_url: donationOffsetFields.evidenceUrl,
      moderation_status: offsetModeration?.status ?? "clear",
      moderation_notes: offsetModeration?.reasons.join(" ") ?? "",
    };

    const { error: offsetError } = await supabase.from("donation_offset_offers").insert(offsetInsert);

    if (offsetError) {
      logSupabaseActionError("Failed to create donation offset details", offsetError, {
        offerId: data.id,
        ownerId: viewer.authUser.id,
      });
      redirectWithMessage(newOfferReturnPath, "error", offsetError.message);
    }
  }

  revalidatePath("/offers");
  revalidatePath("/donation-offsets");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirectWithMessage(
    `/offers/${data.id}`,
    "message",
    normalizedMode === "offset" && offsetModeration?.status === "flagged"
      ? "Donation offset saved for moderator review. It will remain paused until the baseline evidence is approved."
      : "Offer created successfully.",
  );
}

export async function expressInterestAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const offerId = readRequired(formData, "offer_id");
  const message = readRequired(formData, "message");

  if (!offerId) {
    redirectWithMessage("/offers", "error", "Offer ID is required.");
  }

  const viewer = await requireViewer(`/offers/${offerId}`);
  const supabase = await createClient();

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    redirectWithMessage("/offers", "error", offerError?.message ?? "Offer not found.");
  }

  if (offer.owner_id === viewer.authUser.id) {
    redirectWithMessage(`/offers/${offerId}`, "error", "You cannot express interest in your own offer.");
  }

  const interestedAlias = deriveDisplayName(viewer.authUser, viewer.profile);
  await ensureAccountRowsForUser(viewer.authUser, supabase);

  const { error } = await supabase.from("interests").upsert(
    {
      offer_id: offerId,
      user_id: viewer.authUser.id,
      interested_alias: interestedAlias,
      message,
      status: "pending",
    },
    {
      onConflict: "offer_id,user_id",
    },
  );

  if (error) {
    redirectWithMessage(`/offers/${offerId}`, "error", error.message);
  }

  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("email, display_name")
    .eq("id", offer.owner_id)
    .maybeSingle();

  await queueEmailOutbox({
    profileId: viewer.authUser.id,
    recipientEmail: ownerProfile?.email,
    subject: "New response to your Moral Trade offer",
    body: `${interestedAlias} responded to ${offer.offered_cause} for ${offer.requested_cause}. Sign in to review the message and decide whether to form an agreement.`,
  });

  revalidatePath(`/offers/${offerId}`);
  revalidatePath("/dashboard");
  redirectWithMessage(`/offers/${offerId}`, "message", "Interest recorded.");
}

export async function expressGuestInterestAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const offerId = readRequired(formData, "offer_id");
  const contactEmail = readRequired(formData, "contact_email").toLowerCase();
  const displayName = readOptional(formData, "display_name");
  const city = readOptional(formData, "city");
  const region = readOptional(formData, "region");
  const message = readRequired(formData, "message");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);

  if (!offerId || !contactEmail || !message) {
    redirectWithMessage(returnTo, "error", "Email and message are required.");
  }

  enforceActionRateLimit({
    key: `guest-interest:${offerId}:${contactEmail}`,
    limit: 4,
    message: "Too many guest responses for this offer. Wait a few minutes before trying again.",
    returnTo,
    windowMs: 10 * 60 * 1000,
  });

  const viewer = await getViewer();
  if (viewer) {
    redirectWithMessage(returnTo, "error", "You are already signed in. Use the member response form instead.");
  }

  const supabase = await createClient();
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    redirectWithMessage("/offers", "error", offerError?.message ?? "Offer not found.");
  }

  if (offer.status !== "open") {
    redirectWithMessage(returnTo, "error", "This offer is not currently accepting new responses.");
  }

  const guestAlias = displayName || contactEmail.split("@")[0] || "Guest respondent";
  const { error } = await supabase.from("guest_interests").upsert(
    {
      offer_id: offerId,
      contact_email: contactEmail,
      display_name: guestAlias,
      city: city || null,
      region: region || null,
      message,
      status: "pending",
    },
    {
      onConflict: "offer_id,contact_email",
    },
  );

  if (error) {
    logSupabaseActionError("Failed to record guest interest", error, {
      offerId,
      contactEmail,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath(`/offers/${offerId}`);
  revalidatePath("/dashboard");
  redirectWithMessage(
    returnTo,
    "message",
    "Response recorded without an account. The offer owner can follow up by email, and you can create an account later to manage exchanges publicly.",
  );
}

export async function updateProfileAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const displayName = readOptional(formData, "display_name");
  const city = readOptional(formData, "city");
  const region = readOptional(formData, "region");
  const country = readOptional(formData, "country");
  const publicLocationGranularity = normalizePublicLocationGranularity(
    readOptional(formData, "public_location_granularity"),
  );
  const bio = readOptional(formData, "bio");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      city: city || null,
      region: region || null,
      country: country || null,
      public_location_granularity: publicLocationGranularity,
      bio,
    })
    .eq("id", viewer.authUser.id);

  if (error) {
    logSupabaseActionError("Failed to update profile", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/people");
  revalidatePath(`/people/${viewer.authUser.id}`);
  redirectWithMessage(returnTo, "message", "Profile updated.");
}

export async function saveWishProfileAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  await ensureAccountRowsForUser(viewer.authUser, supabase);

  const causes = readStringList(formData, "causes_json");
  const offers = readStringList(formData, "offers_json");
  const wishText = readOptional(formData, "wish");
  const askText = readOptional(formData, "ask");
  const constraints = readOptional(formData, "constraints");
  const locationCity = readOptional(formData, "location_city");
  const locationRegion = readOptional(formData, "location_region");
  const verificationPreferences = readOptional(formData, "verification_preferences");
  const participantKind = normalizeParticipantKind(readOptional(formData, "participant_kind"));
  const collectiveName = readOptional(formData, "collective_name");
  const capabilities = readOptional(formData, "capabilities");
  const uncertaintyNotes = readOptional(formData, "uncertainty_notes");
  const privacyStage = normalizePrivacyStage(readOptional(formData, "privacy_stage"));
  const brokeragePreference = readOptional(formData, "brokerage_preference");
  const matchFrequency = normalizeMatchFrequency(readOptional(formData, "match_frequency"));
  const tradeShape = readOptional(formData, "trade_shape") || "Open to proposals";
  const openToPayment = readBoolean(formData, "open_to_payment");
  const openToPledges = readBoolean(formData, "open_to_pledges");
  const isDiscoverable = readBoolean(formData, "is_discoverable");
  const shareLocation = readBoolean(formData, "share_location");
  const sharePublicPreview = readBoolean(formData, "share_public_preview");
  const backgroundSearchEnabled = readBoolean(formData, "background_search_enabled");
  const manualSourceReviewEnabled = readBoolean(formData, "manual_source_review_enabled");
  const notificationEmailEnabled = readBoolean(formData, "notification_email_enabled");
  const notificationDashboardEnabled = readBoolean(formData, "notification_dashboard_enabled");
  const sourceLabel = readOptional(formData, "source_label");
  const sourceUrl = readOptional(formData, "source_url");
  const sourceType = normalizeSourceType(readOptional(formData, "source_type"));
  const sourceAccessLevel = normalizeAccessLevel(readOptional(formData, "source_access_level"));
  const sourceNotes = readOptional(formData, "source_notes");

  const safetyBlock = detectBlockedWishText([
    ...causes,
    ...offers,
    wishText,
    askText,
    participantKind,
    collectiveName,
    capabilities,
    constraints,
    uncertaintyNotes,
    verificationPreferences,
    locationCity,
    locationRegion,
    brokeragePreference,
    sourceLabel,
    sourceUrl,
    sourceNotes,
  ]);

  if (safetyBlock) {
    const { error: profileError } = await supabase.from("wish_profiles").upsert(
      {
        profile_id: viewer.authUser.id,
        participant_kind: participantKind,
        collective_name: participantKind === "individual" ? "" : collectiveName,
        causes,
        location_city: locationCity || null,
        location_region: locationRegion || null,
        capabilities: "",
        constraints: "",
        verification_preferences: "",
        uncertainty_notes: "",
        openness_to_payment: false,
        openness_to_pledges: false,
        background_search_enabled: false,
        manual_source_review_enabled: false,
        notification_email_enabled: false,
        notification_dashboard_enabled: true,
        privacy_stage: "strict",
        brokerage_preference: "",
        match_frequency: "manual",
        is_discoverable: false,
        share_public_preview: false,
        share_location: false,
        public_preview: "",
        safety_status: "blocked",
        safety_notes: `Blocked by safety filter: ${safetyBlock}.`,
      },
      {
        onConflict: "profile_id",
      },
    );

    if (profileError) {
      logSupabaseActionError("Failed to record blocked wish profile attempt", profileError, {
        userId: viewer.authUser.id,
      });
    }

    redirectWithMessage(
      returnTo,
      "error",
      `This wish profile was not saved because it appears to involve ${safetyBlock}. Moral Trade does not support coercive, illegal, harassing, or exploitative asks.`,
    );
  }

  const publicPreview = buildBroadWishPreview({ causes, openToPayment, openToPledges });
  const tradeMode = inferTradeMode({ openToPayment, openToPledges, tradeShape });

  const { error: profileError } = await supabase.from("wish_profiles").upsert(
    {
      profile_id: viewer.authUser.id,
      participant_kind: participantKind,
      collective_name: participantKind === "individual" ? "" : collectiveName,
      causes,
      location_city: locationCity || null,
      location_region: locationRegion || null,
      capabilities,
      constraints,
      verification_preferences: verificationPreferences,
      uncertainty_notes: uncertaintyNotes,
      openness_to_payment: openToPayment,
      openness_to_pledges: openToPledges,
      background_search_enabled: backgroundSearchEnabled,
      manual_source_review_enabled: manualSourceReviewEnabled,
      notification_email_enabled: notificationEmailEnabled,
      notification_dashboard_enabled: notificationDashboardEnabled,
      privacy_stage: privacyStage,
      brokerage_preference: brokeragePreference,
      match_frequency: matchFrequency,
      is_discoverable: isDiscoverable,
      share_public_preview: sharePublicPreview,
      share_location: shareLocation,
      public_preview: sharePublicPreview ? publicPreview : "",
      safety_status: "clear",
      safety_notes: "",
    },
    {
      onConflict: "profile_id",
    },
  );

  if (profileError) {
    logSupabaseActionError("Failed to save wish profile", profileError, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", profileError.message);
  }

  const { error: deleteError } = await supabase
    .from("wish_entries")
    .delete()
    .eq("profile_id", viewer.authUser.id);

  if (deleteError) {
    logSupabaseActionError("Failed to replace wish entries", deleteError, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", deleteError.message);
  }

  const entryPayloads: Database["public"]["Tables"]["wish_entries"]["Insert"][] = [];
  const primaryCause = causes[0] ?? "";

  if (wishText) {
    entryPayloads.push({
      profile_id: viewer.authUser.id,
      entry_type: "wish",
      cause_area: primaryCause,
      title: "Concrete wish",
      body: wishText,
      trade_mode: tradeMode,
      visibility: "private",
      safety_status: "clear",
    });
  }

  if (offers.length) {
    entryPayloads.push({
      profile_id: viewer.authUser.id,
      entry_type: "offer",
      cause_area: primaryCause,
      title: "What this person can offer",
      body: offers.join(", "),
      trade_mode: tradeMode,
      visibility: "private",
      safety_status: "clear",
    });
  }

  if (capabilities) {
    entryPayloads.push({
      profile_id: viewer.authUser.id,
      entry_type: "offer",
      cause_area: primaryCause,
      title: "Capabilities and resources",
      body: capabilities,
      trade_mode: tradeMode,
      visibility: "private",
      safety_status: "clear",
    });
  }

  if (askText) {
    entryPayloads.push({
      profile_id: viewer.authUser.id,
      entry_type: "ask",
      cause_area: primaryCause,
      title: "Ask from counterparties",
      body: askText,
      trade_mode: tradeMode,
      visibility: "private",
      safety_status: "clear",
    });
  }

  const { data: insertedEntries, error: entriesError } = entryPayloads.length
    ? await supabase.from("wish_entries").insert(entryPayloads).select("*")
    : { data: [] as WishEntryRow[], error: null };

  if (entriesError) {
    logSupabaseActionError("Failed to save wish registry entries", entriesError, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", entriesError.message);
  }

  if (manualSourceReviewEnabled && sourceLabel) {
    const sourcePayload: ProfileSourceInsert = {
      profile_id: viewer.authUser.id,
      source_type: sourceType,
      label: sourceLabel,
      url: sourceUrl,
      access_level: sourceAccessLevel,
      notes: sourceNotes,
      content_kind: normalizeSourceContentKind(readOptional(formData, "source_content_kind")),
      snapshot_excerpt: truncateText(sourceNotes || sourceLabel, 420),
      captured_tags: getBackgroundTokens(`${sourceLabel} ${sourceNotes}`, 12),
      needs_review: manualSourceReviewEnabled,
      imported_at: new Date().toISOString(),
      is_active: true,
    };
    const { error: sourceError } = await supabase.from("profile_sources").insert(sourcePayload);

    if (sourceError) {
      logSupabaseActionError("Failed to save manual profile source", sourceError, {
        userId: viewer.authUser.id,
      });
    }
  }

  const [
    { data: currentWishProfile, error: currentWishProfileError },
    { data: currentProfileSources, error: currentProfileSourcesError },
    { data: currentSourceConnections, error: currentSourceConnectionsError },
  ] = await Promise.all([
    supabase.from("wish_profiles").select("*").eq("profile_id", viewer.authUser.id).maybeSingle(),
    supabase.from("profile_sources").select("*").eq("profile_id", viewer.authUser.id),
    supabase.from("source_connections").select("*").eq("profile_id", viewer.authUser.id),
  ]);

  if (currentWishProfileError) {
    logSupabaseActionError("Failed to reload wish profile after save", currentWishProfileError, {
      userId: viewer.authUser.id,
    });
  }

  if (currentProfileSourcesError) {
    logSupabaseActionError("Failed to reload profile sources after save", currentProfileSourcesError, {
      userId: viewer.authUser.id,
    });
  }

  if (currentSourceConnectionsError) {
    logSupabaseActionError(
      "Failed to reload source connections after save",
      currentSourceConnectionsError,
      {
        userId: viewer.authUser.id,
      },
    );
  }

  const profileSourcesRows = (currentProfileSources ?? []) as ProfileSourceRow[];
  const sourceConnectionRows = (currentSourceConnections ?? []) as SourceConnectionRow[];

  const { error: clarificationDeleteError } = await supabase
    .from("clarification_questions")
    .delete()
    .eq("profile_id", viewer.authUser.id)
    .eq("status", "open");

  if (clarificationDeleteError) {
    logSupabaseActionError("Failed to replace open clarification questions", clarificationDeleteError, {
      userId: viewer.authUser.id,
    });
  }

  const clarificationQuestions = buildDeterministicClarificationQuestions({
    askText,
    backgroundSearchEnabled,
    capabilities,
    causes,
    collectiveName,
    constraints,
    locationCity,
    locationRegion,
    manualSourceReviewEnabled,
    offers,
    openToPayment,
    openToPledges,
    participantKind,
    profileId: viewer.authUser.id,
    publicPreview: sharePublicPreview ? publicPreview : "",
    sourceCount: profileSourcesRows.length + sourceConnectionRows.length,
    uncertaintyNotes,
    verificationPreferences,
    wishText,
  });

  if (clarificationQuestions.length) {
    const { error: clarificationError } = await supabase
      .from("clarification_questions")
      .insert(clarificationQuestions);

    if (clarificationError) {
      logSupabaseActionError("Failed to insert clarification questions", clarificationError, {
        userId: viewer.authUser.id,
      });
    }
  }

  if (currentWishProfile) {
    const synthesisPayload = buildDeterministicSynthesis({
      connections: sourceConnectionRows,
      entries: (insertedEntries ?? []) as WishEntryRow[],
      profile: currentWishProfile as WishProfileRow,
      profileSources: profileSourcesRows,
    });
    const { error: synthesisError } = await supabase
      .from("profile_syntheses")
      .upsert(
        {
          profile_id: viewer.authUser.id,
          ...synthesisPayload,
        },
        { onConflict: "profile_id" },
      );

    if (synthesisError) {
      logSupabaseActionError("Failed to refresh synthesis during wish profile save", synthesisError, {
        userId: viewer.authUser.id,
      });
    }
  }

  if (isDiscoverable && sharePublicPreview && backgroundSearchEnabled) {
    const viewerEntry =
      ((insertedEntries ?? []) as WishEntryRow[]).find((entry) => entry.entry_type === "ask") ??
      ((insertedEntries ?? []) as WishEntryRow[])[0] ??
      null;

    const runResult = await generateWishMatchSuggestions({
      profileId: viewer.authUser.id,
      causes,
      wishText,
      askText,
      offerText: [offers.join(", "), capabilities].filter(Boolean).join(", "),
      openToPayment,
      openToPledges,
      viewerEntry,
      runReason: "profile-save",
    });

    const { error: runError } = await supabase.from("background_match_runs").insert({
      profile_id: viewer.authUser.id,
      status: "completed",
      run_reason: "profile-save",
      candidates_scanned: runResult.candidatesScanned,
      matches_created: runResult.matchesCreated,
      matches_refreshed: runResult.matchesRefreshed,
      completed_at: new Date().toISOString(),
    });

    if (runError) {
      logSupabaseActionError("Failed to save background match run", runError, {
        userId: viewer.authUser.id,
      });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/people");
  revalidatePath(`/people/${viewer.authUser.id}`);
  redirectWithMessage(returnTo, "message", "Private wish profile saved and safe match suggestions refreshed.");
}

export async function consentToMatchSuggestionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const matchId = readRequired(formData, "match_id");
  const note = readOptional(formData, "note");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!matchId) {
    redirectWithMessage(returnTo, "error", "Match ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: consentResult, error: consentError } = await supabase.rpc(
    "viewer_consent_to_match",
    {
      target_match_id: matchId,
      consent_note: note,
    },
  );

  if (consentError) {
    logSupabaseActionError("Failed to record match consent", consentError, {
      matchId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", consentError.message);
  }

  const consentState = consentResult?.[0] ?? null;
  const bothConsented = Boolean(consentState?.both_consented);

  if (bothConsented && consentState) {
    const { error: notificationError } = await supabase.from("wish_notifications").insert([
      {
        profile_id: viewer.authUser.id,
        match_id: matchId,
        kind: "consent",
        title: "Both sides opted in",
        body: "Identity details can now be shown for this possible moral trade.",
      },
      {
        profile_id: consentState.counterparty_id,
        match_id: matchId,
        kind: "consent",
        title: "Both sides opted in",
        body: "Identity details can now be shown for this possible moral trade.",
      },
    ]);

    if (notificationError) {
      logSupabaseActionError("Failed to create match consent notifications", notificationError, {
        matchId,
      });
    }

    try {
      const serviceClient = createServiceClient();
      const { data: match, error: matchError } = await serviceClient
        .from("match_suggestions")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();

      if (matchError || !match) {
        throw new Error(matchError?.message ?? "Match suggestion not found.");
      }

      const { error: planError } = await serviceClient
        .from("match_introduction_plans")
        .upsert(
          buildIntroductionPlanPayloads({
            matchId,
            profileAId: match.profile_a_id,
            profileBId: match.profile_b_id,
            reasonForA: match.reason_for_a,
            reasonForB: match.reason_for_b,
            suggestedFirstStep: match.suggested_first_step,
            riskNotes: match.risk_notes,
          }),
          { onConflict: "match_id,profile_id" },
        );

      if (planError) {
        throw new Error(planError.message);
      }

      const { data: selectedPlans, error: selectPlansError } = await serviceClient
        .from("match_introduction_plans")
        .select("id, profile_id, counterparty_id")
        .eq("match_id", matchId);

      if (selectPlansError) {
        throw new Error(selectPlansError.message);
      }

      const taskPayloads = (selectedPlans ?? []).flatMap((plan) =>
        buildIntroductionTaskPayloads({
          planId: plan.id,
          profileId: plan.profile_id,
        }),
      );

      if (taskPayloads.length) {
        const { error: taskError } = await serviceClient
          .from("match_introduction_tasks")
          .upsert(taskPayloads, { onConflict: "plan_id,step_key" });

        if (taskError) {
          throw new Error(taskError.message);
        }
      }

      await serviceClient.from("match_audit_events").insert({
        match_id: matchId,
        actor_profile_id: viewer.authUser.id,
        event_type: "introduction_plan_created",
        summary:
          "Both sides consented; non-AI first-step plans and introduction tasks were generated for each participant.",
        metadata: { generatedBy: "deterministic-template-v2", taskCount: taskPayloads.length },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create introduction plans.";
      console.error("[supabase] Failed to create deterministic introduction plans", {
        matchId,
        userId: viewer.authUser.id,
        message,
      });
    }
  }

  revalidatePath("/dashboard");
  redirectWithMessage(
    returnTo,
    "message",
    bothConsented
      ? "Both sides have consented. The counterparty can now be shown."
      : "Consent recorded. The counterparty remains hidden until both sides opt in.",
  );
}

export async function dismissMatchSuggestionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const matchId = readRequired(formData, "match_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!matchId) {
    redirectWithMessage(returnTo, "error", "Match ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase
    .from("match_suggestions")
    .update({
      status: "dismissed",
    })
    .eq("id", matchId)
    .or(`profile_a_id.eq.${viewer.authUser.id},profile_b_id.eq.${viewer.authUser.id}`);

  if (error) {
    logSupabaseActionError("Failed to dismiss match suggestion", error, {
      matchId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Match suggestion dismissed.");
}

export async function markWishNotificationReadAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const notificationId = readRequired(formData, "notification_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!notificationId) {
    redirectWithMessage(returnTo, "error", "Notification ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase
    .from("wish_notifications")
    .update({
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("profile_id", viewer.authUser.id);

  if (error) {
    logSupabaseActionError("Failed to mark wish notification as read", error, {
      notificationId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Notification marked as read.");
}

export async function updateIntroductionTaskAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const taskId = readRequired(formData, "task_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!taskId) {
    redirectWithMessage(returnTo, "error", "Introduction task ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const nextStatus = (() => {
    const value = readOptional(formData, "status");

    if (value === "in_progress" || value === "done" || value === "skipped") {
      return value;
    }

    return "pending";
  })();
  const note = readOptional(formData, "note");
  const completedAt = nextStatus === "done" ? new Date().toISOString() : null;

  const { data: task, error: taskError } = await supabase
    .from("match_introduction_tasks")
    .select("id, plan_id, profile_id")
    .eq("id", taskId)
    .eq("profile_id", viewer.authUser.id)
    .maybeSingle();

  if (taskError || !task) {
    logSupabaseActionError("Failed to load introduction task before update", taskError, {
      taskId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", taskError?.message ?? "Introduction task not found.");
  }

  const { error: updateError } = await supabase
    .from("match_introduction_tasks")
    .update({
      status: nextStatus,
      note,
      completed_at: completedAt,
    })
    .eq("id", taskId)
    .eq("profile_id", viewer.authUser.id);

  if (updateError) {
    logSupabaseActionError("Failed to update introduction task", updateError, {
      taskId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", updateError.message);
  }

  const { data: siblingTasks, error: siblingTasksError } = await supabase
    .from("match_introduction_tasks")
    .select("status")
    .eq("plan_id", task.plan_id)
    .eq("profile_id", viewer.authUser.id);

  if (siblingTasksError) {
    logSupabaseActionError("Failed to load sibling introduction tasks", siblingTasksError, {
      planId: task.plan_id,
      userId: viewer.authUser.id,
    });
  } else {
    const allClosed = (siblingTasks ?? []).every(
      (entry) => entry.status === "done" || entry.status === "skipped",
    );
    const anyProgress = (siblingTasks ?? []).some(
      (entry) => entry.status === "in_progress" || entry.status === "done",
    );
    const nextPlanStatus = allClosed || anyProgress ? "shared" : "draft";

    const { error: planError } = await supabase
      .from("match_introduction_plans")
      .update({ status: nextPlanStatus })
      .eq("id", task.plan_id)
      .eq("profile_id", viewer.authUser.id);

    if (planError) {
      logSupabaseActionError("Failed to update introduction plan after task update", planError, {
        planId: task.plan_id,
        userId: viewer.authUser.id,
      });
    }
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Introduction task updated.");
}

export async function createAgreementRoomFromIntroductionPlanAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const planId = readRequired(formData, "plan_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!planId) {
    redirectWithMessage(returnTo, "error", "Introduction plan ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: plan, error: planError } = await supabase
    .from("match_introduction_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (planError || !plan) {
    redirectWithMessage(returnTo, "error", planError?.message ?? "Introduction plan not found.");
  }

  const introductionPlan = plan as MatchIntroductionPlanRow;
  if (
    introductionPlan.profile_id !== viewer.authUser.id &&
    introductionPlan.counterparty_id !== viewer.authUser.id
  ) {
    redirectWithMessage(returnTo, "error", "You can only open rooms for your own introductions.");
  }

  const counterpartyId =
    introductionPlan.profile_id === viewer.authUser.id
      ? introductionPlan.counterparty_id
      : introductionPlan.profile_id;

  const { data: existingAgreement, error: existingAgreementError } = await supabase
    .from("agreements")
    .select("id")
    .eq("introduction_plan_id", planId)
    .maybeSingle();

  if (existingAgreementError) {
    redirectWithMessage(returnTo, "error", existingAgreementError.message);
  }

  if (existingAgreement?.id) {
    redirect(`/agreements/${existingAgreement.id}`);
  }

  const agreementPayload: AgreementInsert = {
    offer_id: null,
    interest_id: null,
    match_id: introductionPlan.match_id,
    introduction_plan_id: introductionPlan.id,
    source: "introduction",
    proposer_id: viewer.authUser.id,
    responder_id: counterpartyId,
    status: "proposed",
    notes: introductionPlan.next_actions || introductionPlan.intro_message,
    structured_terms:
      introductionPlan.proposal_terms ||
      introductionPlan.proposal_outline ||
      "Draft the bounded moral trade before either side relies on it.",
    duration_terms: introductionPlan.timeline,
    evidence_rule: introductionPlan.verification_plan,
    privacy_scope: introductionPlan.privacy_notes,
    disclosure_scope:
      "Share only the facts both sides need for this agreement room. Keep exact wishes and contact details behind explicit consent.",
    completion_state: "pending_evidence",
  };

  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .insert(agreementPayload)
    .select("id")
    .single();

  if (agreementError || !agreement) {
    logSupabaseActionError("Failed to create agreement room from introduction", agreementError, {
      planId,
      userId: viewer.authUser.id,
      counterpartyId,
    });
    redirectWithMessage(returnTo, "error", agreementError?.message ?? "Unable to create agreement room.");
  }

  await supabase.from("agreement_events").insert({
    agreement_id: agreement.id,
    actor_id: viewer.authUser.id,
    event_type: "terms_updated",
    summary: "Agreement room opened from accepted introduction.",
    details:
      "The room starts with drafted terms from the introduction plan. Both parties should confirm baseline, counterfactual, evidence, exit, and privacy terms before evidence review.",
  });

  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${agreement.id}`);
  redirect(`/agreements/${agreement.id}`);
}

export async function refreshBackgroundMatchesAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const [{ data: profile, error: profileError }, { data: entries, error: entriesError }] =
    await Promise.all([
      supabase.from("wish_profiles").select("*").eq("profile_id", viewer.authUser.id).maybeSingle(),
      supabase
        .from("wish_entries")
        .select("*")
        .eq("profile_id", viewer.authUser.id)
        .eq("safety_status", "clear"),
    ]);

  if (profileError || entriesError || !profile) {
    const message =
      profileError?.message ??
      entriesError?.message ??
      "Save a private wish profile before running background matching.";

    await supabase.from("background_match_runs").insert({
      profile_id: viewer.authUser.id,
      status: "failed",
      run_reason: "manual-refresh",
      error_message: message,
      completed_at: new Date().toISOString(),
    });

    redirectWithMessage(returnTo, "error", message);
  }

  const wishProfile = profile as WishProfileRow;
  const wishEntries = ((entries ?? []) as WishEntryRow[]).filter((entry) => entry.entry_type === "wish");
  const offerEntries = ((entries ?? []) as WishEntryRow[]).filter((entry) => entry.entry_type === "offer");
  const askEntries = ((entries ?? []) as WishEntryRow[]).filter((entry) => entry.entry_type === "ask");
  const viewerEntry = askEntries[0] ?? wishEntries[0] ?? offerEntries[0] ?? null;

  if (!wishProfile.is_discoverable || !wishProfile.share_public_preview) {
    redirectWithMessage(
      returnTo,
      "error",
      "Enable discoverability and public preview before running background matching.",
    );
  }

  const runResult = await generateWishMatchSuggestions({
    profileId: viewer.authUser.id,
    causes: wishProfile.causes,
    wishText: wishEntries.map((entry) => entry.body).join(" "),
    askText: askEntries.map((entry) => entry.body).join(" "),
    offerText: offerEntries.map((entry) => entry.body).join(" "),
    openToPayment: wishProfile.openness_to_payment,
    openToPledges: wishProfile.openness_to_pledges,
    viewerEntry,
    runReason: "manual-refresh",
  });

  const { error: runError } = await supabase.from("background_match_runs").insert({
    profile_id: viewer.authUser.id,
    status: "completed",
    run_reason: "manual-refresh",
    candidates_scanned: runResult.candidatesScanned,
    matches_created: runResult.matchesCreated,
    matches_refreshed: runResult.matchesRefreshed,
    completed_at: new Date().toISOString(),
  });

  if (runError) {
    logSupabaseActionError("Failed to save manual background match run", runError, {
      userId: viewer.authUser.id,
    });
  }

  revalidatePath("/dashboard");
  redirectWithMessage(
    returnTo,
    "message",
    `Background scan finished: ${runResult.matchesCreated} new match(es), ${runResult.matchesRefreshed} refreshed.`,
  );
}

export async function answerClarificationQuestionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const questionId = readRequired(formData, "question_id");
  const answer = readRequired(formData, "answer");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!questionId || !answer) {
    redirectWithMessage(returnTo, "error", "Question and answer are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase
    .from("clarification_questions")
    .update({
      answer,
      status: "answered",
      answered_at: new Date().toISOString(),
    })
    .eq("id", questionId)
    .eq("profile_id", viewer.authUser.id);

  if (error) {
    logSupabaseActionError("Failed to answer clarification question", error, {
      questionId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Clarification saved.");
}

export async function dismissClarificationQuestionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const questionId = readRequired(formData, "question_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!questionId) {
    redirectWithMessage(returnTo, "error", "Question ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase
    .from("clarification_questions")
    .update({
      status: "dismissed",
    })
    .eq("id", questionId)
    .eq("profile_id", viewer.authUser.id);

  if (error) {
    logSupabaseActionError("Failed to dismiss clarification question", error, {
      questionId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Clarification dismissed.");
}

export async function createPrivacyAccessRequestAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const ownerProfileId = readRequired(formData, "owner_profile_id");
  const requestedFields = readStringList(formData, "requested_fields_json");

  if (!ownerProfileId || !requestedFields.length) {
    redirectWithMessage(
      returnTo,
      "error",
      "An owner profile and at least one requested field are required.",
    );
  }

  const viewer = await requireViewer(returnTo);

  enforceActionRateLimit({
    key: `privacy-access-request:${viewer.authUser.id}`,
    limit: 12,
    message: "Too many privacy access requests were sent today. Try again later.",
    returnTo,
    windowMs: 24 * 60 * 60 * 1000,
  });

  if (ownerProfileId === viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You cannot request private access from yourself.");
  }

  const payload: PrivacyAccessRequestInsert = {
    owner_profile_id: ownerProfileId,
    requester_profile_id: viewer.authUser.id,
    match_id: readOptional(formData, "match_id") || null,
    requested_fields: requestedFields,
    requested_stage: normalizeAudienceStage(readOptional(formData, "requested_stage")),
    purpose: readOptional(formData, "purpose"),
    justification: readOptional(formData, "justification"),
    status: "pending",
  };

  const supabase = await createClient();
  const { data: requestRow, error } = await supabase
    .from("privacy_access_requests")
    .insert(payload)
    .select("id, match_id")
    .maybeSingle();

  if (error || !requestRow) {
    logSupabaseActionError("Failed to create privacy access request", error, {
      ownerProfileId,
      requesterProfileId: viewer.authUser.id,
    });
    redirectWithMessage(
      returnTo,
      "error",
      error?.message ?? "Unable to create privacy access request.",
    );
  }

  const serviceClient = createServiceClient();
  const { error: notificationError } = await serviceClient.from("wish_notifications").insert({
    profile_id: ownerProfileId,
    kind: "consent",
    title: "Privacy access request",
    body: `${viewer.displayName} requested access to ${requestedFields.join(", ")} for ${payload.requested_stage}-stage discussion.`,
    match_id: payload.match_id,
  });

  if (notificationError) {
    logSupabaseActionError("Failed to create privacy access request notification", notificationError, {
      ownerProfileId,
      requesterProfileId: viewer.authUser.id,
      requestId: requestRow.id,
    });
  }

  if (payload.match_id) {
    const { error: auditError } = await serviceClient.from("match_audit_events").insert({
      match_id: payload.match_id,
      actor_profile_id: viewer.authUser.id,
      event_type: "privacy_access_requested",
      summary: `Requested access to: ${requestedFields.join(", ")}.`,
      metadata: {
        requestId: requestRow.id,
        requestedStage: payload.requested_stage,
      },
    });

    if (auditError) {
      logSupabaseActionError("Failed to record privacy access audit event", auditError, {
        matchId: payload.match_id,
        requestId: requestRow.id,
      });
    }
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Privacy access request recorded.");
}

export async function createMatchConciergeRequestAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/background-networking", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/background-networking");
  const viewer = await requireViewer(returnTo);

  enforceActionRateLimit({
    key: `match-concierge-request:${viewer.authUser.id}`,
    limit: 10,
    message: "Too many concierge requests were created today. Try again tomorrow.",
    returnTo,
    windowMs: 24 * 60 * 60 * 1000,
  });

  const targetProfileId = readOptional(formData, "target_profile_id") || null;
  if (targetProfileId === viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You cannot request an introduction to yourself.");
  }

  const causeAreas = readStringList(formData, "cause_areas_json");
  const intentSummary = readRequired(formData, "intent_summary");
  const offerSummary = readOptional(formData, "offer_summary");
  const askSummary = readOptional(formData, "ask_summary");
  const constraints = readOptional(formData, "constraints");
  const targetPreview = readOptional(formData, "target_preview");

  if (!intentSummary || (!targetProfileId && !targetPreview && !askSummary)) {
    redirectWithMessage(
      returnTo,
      "error",
      "Describe the introduction you want and either choose a target preview or state the counterparty you need.",
    );
  }

  const safetyBlock = detectBlockedWishText([
    ...causeAreas,
    intentSummary,
    offerSummary,
    askSummary,
    constraints,
    targetPreview,
  ]);

  if (safetyBlock) {
    redirectWithMessage(
      returnTo,
      "error",
      `This concierge request was not saved because it appears to involve ${safetyBlock}.`,
    );
  }

  const payload: MatchConciergeRequestInsert = {
    requester_profile_id: viewer.authUser.id,
    target_profile_id: targetProfileId,
    match_id: readOptional(formData, "match_id") || null,
    route: normalizeConciergeRoute(readOptional(formData, "route")),
    cause_areas: causeAreas,
    target_preview: truncateText(targetPreview, 520),
    intent_summary: truncateText(intentSummary, 900),
    offer_summary: truncateText(offerSummary, 900),
    ask_summary: truncateText(askSummary, 900),
    constraints: truncateText(constraints, 900),
    desired_timeline: truncateText(readOptional(formData, "desired_timeline"), 240),
    risk_notes: "",
    status: "open",
    operator_notes: "",
    sla_due_at: buildSlaDueAt(24),
  };

  const supabase = await createClient();
  const { data: requestRow, error } = await supabase
    .from("match_concierge_requests")
    .insert(payload)
    .select("id, target_profile_id")
    .single();

  if (error || !requestRow) {
    logSupabaseActionError("Failed to create match concierge request", error, {
      userId: viewer.authUser.id,
      targetProfileId,
    });
    redirectWithMessage(returnTo, "error", error?.message ?? "Unable to create concierge request.");
  }

  const serviceClient = createServiceClient();
  const { error: eventError } = await serviceClient.from("match_concierge_events").insert({
    request_id: requestRow.id,
    actor_profile_id: viewer.authUser.id,
    event_type: "request_created",
    summary: "Participant requested concierge help moving from broad preview to introduction.",
    metadata: {
      route: payload.route,
      causeAreas,
      hasTargetProfile: Boolean(targetProfileId),
      slaDueAt: payload.sla_due_at,
    },
  });

  if (eventError) {
    logSupabaseActionError("Failed to record match concierge request event", eventError, {
      requestId: requestRow.id,
    });
  }

  if (requestRow.target_profile_id) {
    const { error: notificationError } = await serviceClient.from("wish_notifications").insert({
      profile_id: requestRow.target_profile_id,
      kind: "consent",
      title: "Concierge introduction request",
      body:
        "A participant asked an operator to review whether an introduction would be appropriate. No private details were disclosed.",
      match_id: payload.match_id,
    });

    if (notificationError) {
      logSupabaseActionError("Failed to notify target of concierge request", notificationError, {
        requestId: requestRow.id,
        targetProfileId: requestRow.target_profile_id,
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/background-networking");
  revalidatePath("/wish-registry");
  redirectWithMessage(
    returnTo,
    "message",
    "Concierge request queued. An operator can triage it before any introduction or private disclosure.",
  );
}

export async function updateMatchConciergeRequestAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const requestId = readRequired(formData, "request_id");

  if (!requestId) {
    redirectWithMessage(returnTo, "error", "Concierge request ID is required.");
  }

  const admin = await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const nextStatus = normalizeConciergeStatus(readRequired(formData, "status"));
  const operatorNotes = readOptional(formData, "operator_notes");
  const riskNotes = readOptional(formData, "risk_notes");
  const matchId = readOptional(formData, "match_id") || null;
  const reviewedAt =
    nextStatus === "open" ? null : new Date().toISOString();
  const updatePayload: MatchConciergeRequestUpdate = {
    status: nextStatus,
    operator_notes: operatorNotes,
    risk_notes: riskNotes,
    match_id: matchId,
    reviewed_by: nextStatus === "open" ? null : admin.authUser.id,
    reviewed_at: reviewedAt,
  };

  const { data: requestRow, error } = await supabase
    .from("match_concierge_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .select("*")
    .single();

  if (error || !requestRow) {
    logSupabaseActionError("Failed to update match concierge request", error, {
      requestId,
      nextStatus,
    });
    redirectWithMessage(returnTo, "error", error?.message ?? "Concierge request not found.");
  }

  const { error: eventError } = await supabase.from("match_concierge_events").insert({
    request_id: requestId,
    actor_profile_id: admin.authUser.id,
    event_type: "request_triaged",
    summary: `Operator moved concierge request to ${nextStatus}.`,
    metadata: {
      operatorNotes,
      riskNotes,
      matchId,
    },
  });

  if (eventError) {
    logSupabaseActionError("Failed to record match concierge triage event", eventError, {
      requestId,
      nextStatus,
    });
  }

  if (nextStatus === "introduced" && matchId) {
    const { error: matchError } = await supabase
      .from("match_suggestions")
      .update({
        status: "introduced",
        identity_revealed: true,
      })
      .eq("id", matchId);

    if (matchError) {
      logSupabaseActionError("Failed to mark match introduced after concierge triage", matchError, {
        requestId,
        matchId,
      });
    }
  }

  const notificationTargets = [
    requestRow.requester_profile_id,
    requestRow.target_profile_id,
  ].filter((profileId): profileId is string => Boolean(profileId));

  if (notificationTargets.length) {
    const { error: notificationError } = await supabase.from("wish_notifications").insert(
      notificationTargets.map((profileId) => ({
        profile_id: profileId,
        kind: "consent" as const,
        title: "Concierge request updated",
        body: `An operator moved the introduction request to ${nextStatus.replaceAll("_", " ")}.`,
        match_id: matchId,
      })),
    );

    if (notificationError) {
      logSupabaseActionError("Failed to notify concierge request participants", notificationError, {
        requestId,
        nextStatus,
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/background-networking");
  redirectWithMessage(returnTo, "message", "Concierge request updated.");
}

export async function reportMatchSuggestionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const matchId = readRequired(formData, "match_id");
  const reason = normalizeReportReason(readOptional(formData, "reason"));
  const details = readOptional(formData, "details");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!matchId) {
    redirectWithMessage(returnTo, "error", "Match ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase.from("match_reports").insert({
    match_id: matchId,
    reporter_profile_id: viewer.authUser.id,
    reason,
    details,
  });

  if (error) {
    logSupabaseActionError("Failed to report match suggestion", error, {
      matchId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  const { error: auditError } = await supabase.from("match_audit_events").insert({
    match_id: matchId,
    actor_profile_id: viewer.authUser.id,
    event_type: "match_reported",
    summary: `Participant reported this suggestion for ${reason}.`,
    metadata: { reason },
  });

  if (auditError) {
    logSupabaseActionError("Failed to write match report audit event", auditError, {
      matchId,
      userId: viewer.authUser.id,
    });
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Report submitted for review.");
}

export async function saveProfileSourceAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const label = readRequired(formData, "source_label");

  if (!label) {
    redirectWithMessage(returnTo, "error", "Source label is required.");
  }

  const viewer = await requireViewer(returnTo);
  const sourceNotes = readOptional(formData, "source_notes");
  const sourceLabel = label;
  const supabase = await createClient();
  const payload: ProfileSourceInsert = {
    profile_id: viewer.authUser.id,
    source_type: normalizeSourceType(readOptional(formData, "source_type")),
    label: sourceLabel,
    url: readOptional(formData, "source_url"),
    access_level: normalizeAccessLevel(readOptional(formData, "source_access_level")),
    content_kind: normalizeSourceContentKind(readOptional(formData, "source_content_kind")),
    notes: sourceNotes,
    snapshot_excerpt: truncateText(
      readOptional(formData, "snapshot_excerpt") || sourceNotes || sourceLabel,
      420,
    ),
    captured_tags: getBackgroundTokens(
      `${sourceLabel} ${sourceNotes} ${readOptional(formData, "captured_tags")}`,
      12,
    ),
    needs_review: readBoolean(formData, "needs_review"),
    imported_at:
      parseOptionalTimestamp(readOptional(formData, "imported_at")) ?? new Date().toISOString(),
    is_active: true,
  };
  const { error } = await supabase.from("profile_sources").insert(payload);

  if (error) {
    logSupabaseActionError("Failed to save profile source", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Source saved. It is not automatically ingested.");
}

export async function createNetworkInviteAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const targetLabel = readRequired(formData, "target_label");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!targetLabel) {
    redirectWithMessage(returnTo, "error", "Invite target is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase.from("network_invites").insert({
    profile_id: viewer.authUser.id,
    target_kind: normalizeNetworkInviteTargetKind(readOptional(formData, "target_kind")),
    target_label: targetLabel,
    target_url: readOptional(formData, "target_url"),
    target_context: readOptional(formData, "target_context"),
    desired_capability: readOptional(formData, "desired_capability"),
    suggested_message: readOptional(formData, "suggested_message"),
    priority: readBoundedInt(formData, "priority", {
      fallback: 3,
      min: 1,
      max: 5,
    }),
    reason: readOptional(formData, "reason"),
  });

  if (error) {
    logSupabaseActionError("Failed to draft network invite", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Network expansion draft saved.");
}

export async function savePersonalDelegateAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const goals = readStringList(formData, "goals_json");
  const label = readOptional(formData, "label") || "Personal delegate";
  const operatingMode = normalizeDelegateMode(readOptional(formData, "operating_mode"));
  const status = operatingMode === "paused" ? "paused" : "active";
  const payload: PersonalDelegateInsert = {
    profile_id: viewer.authUser.id,
    label,
    goals,
    operating_mode: operatingMode,
    search_scope: readOptional(formData, "search_scope"),
    risk_tolerance: normalizeDelegateRiskTolerance(readOptional(formData, "risk_tolerance")),
    introduction_policy: normalizeIntroductionPolicy(readOptional(formData, "introduction_policy")),
    max_weekly_suggestions: readBoundedInt(formData, "max_weekly_suggestions", {
      fallback: 5,
      min: 0,
      max: 50,
    }),
    status,
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("personal_delegates")
    .upsert(payload, { onConflict: "profile_id" });

  if (error) {
    logSupabaseActionError("Failed to save personal delegate", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Personal delegate settings saved.");
}

export async function saveSourceConnectionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const label = readRequired(formData, "label");

  if (!label) {
    redirectWithMessage(returnTo, "error", "Connection label is required.");
  }

  const viewer = await requireViewer(returnTo);
  const payload: SourceConnectionInsert = {
    profile_id: viewer.authUser.id,
    provider: normalizeSourceConnectionProvider(readOptional(formData, "provider")),
    label,
    url: readOptional(formData, "url"),
    access_status: normalizeSourceAccessStatus(readOptional(formData, "access_status")),
    access_scope: readOptional(formData, "access_scope"),
    consent_notes: readOptional(formData, "consent_notes"),
    import_mode: normalizeSourceImportMode(readOptional(formData, "import_mode")),
    sync_frequency: normalizeSourceSyncFrequency(readOptional(formData, "sync_frequency")),
    last_sync_summary: readOptional(formData, "last_sync_summary"),
    last_import_item_count: readBoundedInt(formData, "last_import_item_count", {
      fallback: 0,
      min: 0,
      max: 10000,
    }),
    last_imported_at: parseOptionalTimestamp(readOptional(formData, "last_imported_at")),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("source_connections").insert(payload);

  if (error) {
    logSupabaseActionError("Failed to save source connection", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(
    returnTo,
    "message",
    "Source connection recorded. No external data is imported automatically.",
  );
}

export async function refreshProfileSynthesisAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const [{ data: profile }, { data: entries }, { data: sources }, { data: connections }] =
    await Promise.all([
      supabase.from("wish_profiles").select("*").eq("profile_id", viewer.authUser.id).maybeSingle(),
      supabase
        .from("wish_entries")
        .select("*")
        .eq("profile_id", viewer.authUser.id)
        .eq("safety_status", "clear"),
      supabase.from("profile_sources").select("*").eq("profile_id", viewer.authUser.id),
      supabase.from("source_connections").select("*").eq("profile_id", viewer.authUser.id),
    ]);

  if (!profile) {
    redirectWithMessage(returnTo, "error", "Save a private wish profile before refreshing synthesis.");
  }

  const rows = (entries ?? []) as WishEntryRow[];
  const profileSourceRows = (sources ?? []) as ProfileSourceRow[];
  const sourceConnectionRows = (connections ?? []) as SourceConnectionRow[];
  const synthesisPayload = buildDeterministicSynthesis({
    connections: sourceConnectionRows,
    entries: rows,
    profile: profile as WishProfileRow,
    profileSources: profileSourceRows,
  });

  const { error } = await supabase
    .from("profile_syntheses")
    .upsert(
      {
        profile_id: viewer.authUser.id,
        ...synthesisPayload,
      },
      { onConflict: "profile_id" },
    );

  if (error) {
    logSupabaseActionError("Failed to refresh profile synthesis", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  const { error: clarificationDeleteError } = await supabase
    .from("clarification_questions")
    .delete()
    .eq("profile_id", viewer.authUser.id)
    .eq("status", "open");

  if (clarificationDeleteError) {
    logSupabaseActionError("Failed to refresh open clarification questions", clarificationDeleteError, {
      userId: viewer.authUser.id,
    });
  }

  const clarificationQuestions = buildDeterministicClarificationQuestions({
    askText: rows.filter((entry) => entry.entry_type === "ask").map((entry) => entry.body).join(" "),
    backgroundSearchEnabled: profile.background_search_enabled,
    capabilities: profile.capabilities,
    causes: profile.causes ?? [],
    collectiveName: profile.collective_name,
    constraints: profile.constraints,
    locationCity: profile.location_city,
    locationRegion: profile.location_region,
    manualSourceReviewEnabled: profile.manual_source_review_enabled,
    offers: rows.filter((entry) => entry.entry_type === "offer").map((entry) => entry.body),
    openToPayment: profile.openness_to_payment,
    openToPledges: profile.openness_to_pledges,
    participantKind: profile.participant_kind,
    profileId: viewer.authUser.id,
    publicPreview: profile.public_preview,
    sourceCount: synthesisPayload.source_count,
    uncertaintyNotes: profile.uncertainty_notes,
    verificationPreferences: profile.verification_preferences,
    wishText: rows.filter((entry) => entry.entry_type === "wish").map((entry) => entry.body).join(" "),
  });

  if (clarificationQuestions.length) {
    const { error: clarificationError } = await supabase
      .from("clarification_questions")
      .insert(clarificationQuestions);

    if (clarificationError) {
      logSupabaseActionError("Failed to refresh clarification questions from synthesis", clarificationError, {
        userId: viewer.authUser.id,
      });
    }
  }

  if (synthesisPayload.confidence_score < 70 || synthesisPayload.missing_fields.length >= 3) {
    const { error: riskError } = await supabase.from("risk_signals").insert({
      profile_id: viewer.authUser.id,
      signal_type: "underspecified_profile",
      severity: "low",
      summary:
        "The deterministic synthesis is low confidence; ask follow-up questions before relying on matches.",
      metadata: {
        confidenceBreakdown: synthesisPayload.confidence_breakdown,
        missingFields: synthesisPayload.missing_fields,
        sourceCount: synthesisPayload.source_count,
        synthesisVersion: synthesisPayload.synthesis_version,
      },
    });

    if (riskError) {
      logSupabaseActionError("Failed to record low-confidence synthesis signal", riskError, {
        userId: viewer.authUser.id,
      });
    }
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Profile synthesis refreshed without AI.");
}

export async function saveHelperStrategyAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const label = readRequired(formData, "label");

  if (!label) {
    redirectWithMessage(returnTo, "error", "Helper strategy label is required.");
  }

  const viewer = await requireViewer(returnTo);
  const payload: HelperStrategyInsert = {
    profile_id: viewer.authUser.id,
    helper_kind: normalizeHelperKind(readOptional(formData, "helper_kind")),
    label,
    priority: readBoundedInt(formData, "priority", {
      fallback: 3,
      min: 1,
      max: 5,
    }),
    min_score: readBoundedInt(formData, "min_score", {
      fallback: 55,
      min: 0,
      max: 100,
    }),
    strategy_config: buildHelperStrategyConfig(formData),
    status: readBoolean(formData, "is_paused") ? "paused" : "active",
  };

  const supabase = await createClient();
  const { error } = await supabase.from("helper_strategies").insert(payload);

  if (error) {
    logSupabaseActionError("Failed to save helper strategy", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Helper strategy saved.");
}

export async function savePrivacyGrantAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const fieldKey = readRequired(formData, "field_key");

  if (!fieldKey) {
    redirectWithMessage(returnTo, "error", "Privacy field key is required.");
  }

  const viewer = await requireViewer(returnTo);
  const payload: PrivacyGrantInsert = {
    profile_id: viewer.authUser.id,
    counterparty_id: readOptional(formData, "counterparty_id") || null,
    match_id: readOptional(formData, "match_id") || null,
    field_key: fieldKey,
    access_level: normalizePrivacyAccessLevel(readOptional(formData, "access_level")),
    audience_stage: normalizePrivacyAudienceStage(readOptional(formData, "audience_stage")),
    status: normalizePrivacyGrantStatus(readOptional(formData, "status")),
    notes: readOptional(formData, "notes"),
    expires_at:
      parseOptionalTimestamp(readOptional(formData, "expires_at")) ??
      (() => {
        const expiresInDays = readBoundedInt(formData, "expires_in_days", {
          fallback: 0,
          min: 0,
          max: 3650,
        });

        if (!expiresInDays) {
          return null;
        }

        return new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
      })(),
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("privacy_grants")
    .upsert(payload, { onConflict: "profile_id,counterparty_id,match_id,field_key" });

  if (error) {
    logSupabaseActionError("Failed to save privacy grant", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Privacy grant saved.");
}

export async function respondPrivacyAccessRequestAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const requestId = readRequired(formData, "request_id");

  if (!requestId) {
    redirectWithMessage(returnTo, "error", "Privacy access request ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: requestRow, error: requestError } = await supabase
    .from("privacy_access_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !requestRow) {
    logSupabaseActionError("Failed to load privacy access request", requestError, {
      requestId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(
      returnTo,
      "error",
      requestError?.message ?? "Privacy access request not found.",
    );
  }

  const action = readOptional(formData, "status");
  const ownerNote = readOptional(formData, "owner_note");
  const accessLevel = normalizePrivacyAccessLevel(readOptional(formData, "access_level"));
  const isOwner = requestRow.owner_profile_id === viewer.authUser.id;
  const isRequester = requestRow.requester_profile_id === viewer.authUser.id;

  if (!isOwner && !isRequester) {
    redirectWithMessage(returnTo, "error", "You cannot modify this privacy access request.");
  }

  const nextStatus =
    isRequester && action === "withdrawn"
      ? "withdrawn"
      : isOwner && action === "approved"
        ? "approved"
        : isOwner && action === "denied"
          ? "denied"
          : null;

  if (!nextStatus) {
    redirectWithMessage(returnTo, "error", "Unsupported privacy access request update.");
  }

  const resolvedAt =
    nextStatus === "approved" || nextStatus === "denied" || nextStatus === "withdrawn"
      ? new Date().toISOString()
      : null;

  const { error: updateError } = await supabase
    .from("privacy_access_requests")
    .update({
      owner_note: isOwner ? ownerNote : requestRow.owner_note,
      status: nextStatus,
      resolved_at: resolvedAt,
    })
    .eq("id", requestId);

  if (updateError) {
    logSupabaseActionError("Failed to update privacy access request", updateError, {
      requestId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", updateError.message);
  }

  if (nextStatus === "approved" && isOwner) {
    for (const fieldKey of requestRow.requested_fields ?? []) {
      let grantQuery = supabase
        .from("privacy_grants")
        .select("id")
        .eq("profile_id", requestRow.owner_profile_id)
        .eq("counterparty_id", requestRow.requester_profile_id)
        .eq("field_key", fieldKey)
        .eq("audience_stage", requestRow.requested_stage);

      grantQuery = requestRow.match_id
        ? grantQuery.eq("match_id", requestRow.match_id)
        : grantQuery.is("match_id", null);

      const { data: existingGrant, error: existingGrantError } = await grantQuery.maybeSingle();

      if (existingGrantError) {
        logSupabaseActionError("Failed to check existing privacy grant", existingGrantError, {
          requestId,
          fieldKey,
          userId: viewer.authUser.id,
        });
        continue;
      }

      const grantInsertPayload: PrivacyGrantInsert = {
        profile_id: requestRow.owner_profile_id,
        counterparty_id: requestRow.requester_profile_id,
        match_id: requestRow.match_id,
        field_key: fieldKey,
        access_level: accessLevel,
        audience_stage: requestRow.requested_stage,
        status: "granted" as const,
        notes: ownerNote || requestRow.purpose || requestRow.justification,
      };

      const grantUpdatePayload: PrivacyGrantUpdate = {
        counterparty_id: grantInsertPayload.counterparty_id,
        match_id: grantInsertPayload.match_id,
        field_key: grantInsertPayload.field_key,
        access_level: grantInsertPayload.access_level,
        audience_stage: grantInsertPayload.audience_stage,
        status: grantInsertPayload.status,
        notes: grantInsertPayload.notes,
      };

      const { error: grantError } = existingGrant
        ? await supabase.from("privacy_grants").update(grantUpdatePayload).eq("id", existingGrant.id)
        : await supabase.from("privacy_grants").insert(grantInsertPayload);

      if (grantError) {
        logSupabaseActionError("Failed to upsert approved privacy grant", grantError, {
          requestId,
          fieldKey,
          userId: viewer.authUser.id,
        });
      }
    }
  }

  const serviceClient = createServiceClient();
  const notificationTarget =
    nextStatus === "withdrawn" ? requestRow.owner_profile_id : requestRow.requester_profile_id;
  const actorLabel = isOwner ? "The owner" : viewer.displayName;
  const statusLabel =
    nextStatus === "approved"
      ? "approved"
      : nextStatus === "denied"
        ? "declined"
        : "withdrew";
  const { error: notificationError } = await serviceClient.from("wish_notifications").insert({
    profile_id: notificationTarget,
    kind: "consent",
    title: "Privacy access request updated",
    body: `${actorLabel} ${statusLabel} a request covering ${requestRow.requested_fields.join(", ")}.`,
    match_id: requestRow.match_id,
  });

  if (notificationError) {
    logSupabaseActionError("Failed to notify about privacy access request update", notificationError, {
      requestId,
      userId: viewer.authUser.id,
    });
  }

  if (requestRow.match_id) {
    const { error: auditError } = await serviceClient.from("match_audit_events").insert({
      match_id: requestRow.match_id,
      actor_profile_id: viewer.authUser.id,
      event_type: "privacy_access_updated",
      summary: `Privacy access request ${nextStatus} for ${requestRow.requested_fields.join(", ")}.`,
      metadata: {
        requestId,
        accessLevel: nextStatus === "approved" ? accessLevel : null,
      },
    });

    if (auditError) {
      logSupabaseActionError("Failed to record privacy access request update audit", auditError, {
        requestId,
        matchId: requestRow.match_id,
      });
    }
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Privacy access request updated.");
}

export async function createBrokerageBountyAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const label = readRequired(formData, "label");

  if (!label) {
    redirectWithMessage(returnTo, "error", "Bounty label is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase.from("brokerage_bounties").insert({
    profile_id: viewer.authUser.id,
    label,
    target_kind: normalizeBrokerageTargetKind(readOptional(formData, "target_kind")),
    cause_area: readOptional(formData, "cause_area"),
    max_amount_cents: readMoneyCents(formData, "max_amount"),
    currency: normalizeCurrency(readOptional(formData, "currency") || "usd"),
    reward_type: normalizeBrokerageRewardType(readOptional(formData, "reward_type")),
    preferred_regions: readStringList(formData, "preferred_regions_json"),
    success_condition: readOptional(formData, "success_condition"),
    target_note: readOptional(formData, "target_note"),
    status: "active",
  });

  if (error) {
    logSupabaseActionError("Failed to create brokerage bounty", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Speculative matchmaking bounty saved.");
}

export async function createCollectiveAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const name = readRequired(formData, "name");

  if (!name) {
    redirectWithMessage(returnTo, "error", "Collective name is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: collective, error } = await supabase
    .from("collectives")
    .insert({
      owner_id: viewer.authUser.id,
      name,
      description: readOptional(formData, "description"),
      homepage_url: readOptional(formData, "homepage_url"),
      contact_policy: readOptional(formData, "contact_policy"),
      decision_rule: readOptional(formData, "decision_rule"),
      verification_notes: readOptional(formData, "verification_notes"),
      verification_status: normalizeCollectiveVerificationStatus(
        readOptional(formData, "verification_status"),
      ),
    })
    .select("id")
    .maybeSingle();

  if (error || !collective) {
    logSupabaseActionError("Failed to create collective", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error?.message ?? "Unable to create collective.");
  }

  const { error: memberError } = await supabase.from("collective_members").insert({
    collective_id: collective.id,
    profile_id: viewer.authUser.id,
    role: "owner",
    status: "active",
    delegation_scope: "Full authority for initial setup.",
    can_approve_matches: true,
    can_grant_privacy: true,
    can_manage_bounties: true,
  });

  if (memberError) {
    logSupabaseActionError("Failed to create collective owner membership", memberError, {
      userId: viewer.authUser.id,
      collectiveId: collective.id,
    });
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Collective workspace created.");
}

export async function addCollectiveMemberAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const collectiveId = readRequired(formData, "collective_id");
  const memberProfileId = readRequired(formData, "member_profile_id");

  if (!collectiveId || !memberProfileId) {
    redirectWithMessage(returnTo, "error", "Collective ID and member profile ID are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: viewerMembership, error: membershipError } = await supabase
    .from("collective_members")
    .select("role, can_approve_matches, can_grant_privacy, can_manage_bounties, status")
    .eq("collective_id", collectiveId)
    .eq("profile_id", viewer.authUser.id)
    .maybeSingle();

  if (membershipError) {
    logSupabaseActionError("Failed to check collective membership before adding member", membershipError, {
      collectiveId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", membershipError.message);
  }

  const canManageMembers =
    viewerMembership?.status === "active" &&
    (viewerMembership.role === "owner" || viewerMembership.role === "admin");

  if (!canManageMembers) {
    redirectWithMessage(
      returnTo,
      "error",
      "Only active collective owners or admins can add delegated members.",
    );
  }

  const payload: CollectiveMemberInsert = {
    collective_id: collectiveId,
    profile_id: memberProfileId,
    role: normalizeCollectiveMemberRole(readOptional(formData, "role")),
    status: normalizeCollectiveMemberStatus(readOptional(formData, "status")),
    delegation_scope: readOptional(formData, "delegation_scope"),
    can_approve_matches: readBoolean(formData, "can_approve_matches"),
    can_grant_privacy: readBoolean(formData, "can_grant_privacy"),
    can_manage_bounties: readBoolean(formData, "can_manage_bounties"),
  };

  const { error } = await supabase
    .from("collective_members")
    .upsert(payload, { onConflict: "collective_id,profile_id" });

  if (error) {
    logSupabaseActionError("Failed to add collective member", error, {
      collectiveId,
      memberProfileId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Collective member permissions saved.");
}

export async function createCollectiveDecisionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const collectiveId = readRequired(formData, "collective_id");
  const title = readRequired(formData, "title");

  if (!collectiveId || !title) {
    redirectWithMessage(returnTo, "error", "Collective and title are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const requiredApprovals = readBoundedInt(formData, "required_approvals", {
    fallback: 1,
    min: 1,
    max: 25,
  });
  const payload: CollectiveDecisionInsert = {
    collective_id: collectiveId,
    created_by: viewer.authUser.id,
    title,
    decision_type: normalizeCollectiveDecisionType(readOptional(formData, "decision_type")),
    target_kind: normalizeCollectiveDecisionTargetKind(readOptional(formData, "target_kind")),
    target_id: readOptional(formData, "target_id") || null,
    target_label: readOptional(formData, "target_label"),
    summary: readOptional(formData, "summary"),
    required_approvals: requiredApprovals,
    status: "open",
  };

  const { data: decision, error } = await supabase
    .from("collective_decisions")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error || !decision) {
    logSupabaseActionError("Failed to create collective decision", error, {
      collectiveId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error?.message ?? "Unable to create collective decision.");
  }

  const initialResponse: CollectiveDecisionResponseInsert = {
    decision_id: decision.id,
    profile_id: viewer.authUser.id,
    response: normalizeCollectiveDecisionResponse(readOptional(formData, "initial_response")),
    note: readOptional(formData, "initial_note"),
    responded_at: new Date().toISOString(),
  };

  const { error: responseError } = await supabase
    .from("collective_decision_responses")
    .upsert(initialResponse, { onConflict: "decision_id,profile_id" });

  if (responseError) {
    logSupabaseActionError("Failed to record initial collective decision response", responseError, {
      collectiveId,
      decisionId: decision.id,
      userId: viewer.authUser.id,
    });
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Collective decision opened.");
}

export async function respondCollectiveDecisionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const decisionId = readRequired(formData, "decision_id");

  if (!decisionId) {
    redirectWithMessage(returnTo, "error", "Decision ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const responseValue = normalizeCollectiveDecisionResponse(readOptional(formData, "response"));
  const note = readOptional(formData, "note");

  const { error: responseError } = await supabase
    .from("collective_decision_responses")
    .upsert(
      {
        decision_id: decisionId,
        profile_id: viewer.authUser.id,
        response: responseValue,
        note,
        responded_at: new Date().toISOString(),
      },
      { onConflict: "decision_id,profile_id" },
    );

  if (responseError) {
    logSupabaseActionError("Failed to save collective decision response", responseError, {
      decisionId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", responseError.message);
  }

  const { data: decision, error: decisionError } = await supabase
    .from("collective_decisions")
    .select("required_approvals")
    .eq("id", decisionId)
    .maybeSingle();

  if (!decisionError && decision) {
    const { data: responses, error: responsesError } = await supabase
      .from("collective_decision_responses")
      .select("response")
      .eq("decision_id", decisionId);

    if (!responsesError) {
      const approvals = (responses ?? []).filter((entry) => entry.response === "approve").length;
      const rejections = (responses ?? []).filter((entry) => entry.response === "reject").length;
      const nextStatus =
        approvals >= decision.required_approvals
          ? "approved"
          : rejections >= decision.required_approvals
            ? "rejected"
            : "open";

      const { error: statusError } = await supabase
        .from("collective_decisions")
        .update({ status: nextStatus })
        .eq("id", decisionId);

      if (statusError) {
        logSupabaseActionError("Failed to update collective decision status", statusError, {
          decisionId,
          userId: viewer.authUser.id,
        });
      }
    }
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Collective decision response saved.");
}

export async function createStripeConnectAccountAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  if (!hasStripeEnv()) {
    redirectWithMessage("/dashboard", "error", "Stripe is not configured yet. Add STRIPE_SECRET_KEY.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const stripe = getStripe();
  const siteUrl = getSiteUrl();

  const { data: existingAccount, error: accountReadError } = await supabase
    .from("profile_payment_accounts")
    .select("*")
    .eq("profile_id", viewer.authUser.id)
    .maybeSingle();

  if (accountReadError) {
    logSupabaseActionError("Failed to read Stripe payment account", accountReadError, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", accountReadError.message);
  }

  const stripeAccountId =
    existingAccount?.stripe_account_id ??
    (
      await stripe.accounts.create({
        type: "express",
        email: viewer.authUser.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          profile_id: viewer.authUser.id,
        },
      })
    ).id;

  const stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
  const { error: upsertError } = await supabase.from("profile_payment_accounts").upsert(
    {
      profile_id: viewer.authUser.id,
      stripe_account_id: stripeAccount.id,
      charges_enabled: stripeAccount.charges_enabled,
      payouts_enabled: stripeAccount.payouts_enabled,
      details_submitted: stripeAccount.details_submitted,
      onboarding_completed_at:
        stripeAccount.charges_enabled && stripeAccount.payouts_enabled
          ? new Date().toISOString()
          : existingAccount?.onboarding_completed_at ?? null,
    },
    {
      onConflict: "profile_id",
    },
  );

  if (upsertError) {
    logSupabaseActionError("Failed to save Stripe payment account", upsertError, {
      userId: viewer.authUser.id,
      stripeAccountId: stripeAccount.id,
    });
    redirectWithMessage(returnTo, "error", upsertError.message);
  }

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccount.id,
    refresh_url: `${siteUrl}/dashboard?message=${encodeURIComponent("Stripe onboarding can be resumed.")}`,
    return_url: `${siteUrl}/dashboard?message=${encodeURIComponent("Stripe payment account connected.")}`,
    type: "account_onboarding",
  });

  redirect(accountLink.url);
}

export async function refreshStripeConnectAccountAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  if (!hasStripeEnv()) {
    redirectWithMessage("/dashboard", "error", "Stripe is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: paymentAccount, error: accountError } = await supabase
    .from("profile_payment_accounts")
    .select("*")
    .eq("profile_id", viewer.authUser.id)
    .maybeSingle();

  if (accountError || !paymentAccount) {
    redirectWithMessage(
      returnTo,
      "error",
      accountError?.message ?? "Connect Stripe before refreshing payment status.",
    );
  }

  const stripeAccount = await getStripe().accounts.retrieve(paymentAccount.stripe_account_id);
  const { error } = await supabase
    .from("profile_payment_accounts")
    .update({
      charges_enabled: stripeAccount.charges_enabled,
      payouts_enabled: stripeAccount.payouts_enabled,
      details_submitted: stripeAccount.details_submitted,
      onboarding_completed_at:
        stripeAccount.charges_enabled && stripeAccount.payouts_enabled
          ? new Date().toISOString()
          : paymentAccount.onboarding_completed_at,
    })
    .eq("profile_id", viewer.authUser.id);

  if (error) {
    logSupabaseActionError("Failed to refresh Stripe payment account", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Stripe payment account status refreshed.");
}

export async function createAgreementPaymentCheckoutAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  if (!hasStripeEnv()) {
    redirectWithMessage("/dashboard", "error", "Stripe is not configured yet. Add STRIPE_SECRET_KEY.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const amountCents = readMoneyCents(formData, "amount");
  const currency = normalizeCurrency(readOptional(formData, "currency") || "usd");
  const cadenceUnit = normalizePaymentCadenceUnit(readOptional(formData, "cadence_unit"));
  const cadenceValue = readBoundedInt(formData, "cadence_value", {
    fallback: 1,
    min: 1,
    max: 3650,
  });
  const notes = readOptional(formData, "notes");

  if (!agreementId || amountCents <= 0) {
    redirectWithMessage(returnTo, "error", "Payment amount and agreement are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (agreementError || !agreement) {
    redirectWithMessage(returnTo, "error", agreementError?.message ?? "Agreement not found.");
  }

  const viewerIsParticipant =
    agreement.proposer_id === viewer.authUser.id || agreement.responder_id === viewer.authUser.id;

  if (!viewerIsParticipant) {
    redirectWithMessage(returnTo, "error", "You can only pay inside your own agreements.");
  }

  const payeeId =
    agreement.proposer_id === viewer.authUser.id ? agreement.responder_id : agreement.proposer_id;
  const { data: payeePaymentAccount, error: accountError } = await supabase
    .from("profile_payment_accounts")
    .select("*")
    .eq("profile_id", payeeId)
    .maybeSingle();

  if (accountError || !payeePaymentAccount) {
    redirectWithMessage(
      returnTo,
      "error",
      accountError?.message ??
        "The counterparty has not connected a Stripe account yet, so payment cannot be routed to them.",
    );
  }

  if (!payeePaymentAccount.charges_enabled || !payeePaymentAccount.payouts_enabled) {
    redirectWithMessage(
      returnTo,
      "error",
      "The counterparty must finish Stripe onboarding before receiving payments.",
    );
  }

  const platformFeeCents = calculatePlatformFeeCents(amountCents);
  const { data: payment, error: paymentError } = await supabase
    .from("agreement_payments")
    .insert({
      agreement_id: agreementId,
      payer_id: viewer.authUser.id,
      payee_id: payeeId,
      amount_cents: amountCents,
      currency,
      cadence_interval_unit: cadenceUnit,
      cadence_interval_value: cadenceValue,
      platform_fee_cents: platformFeeCents,
      notes,
      status: "draft",
    })
    .select("*")
    .single();

  if (paymentError || !payment) {
    logSupabaseActionError("Failed to create agreement payment record", paymentError, {
      agreementId,
      payerId: viewer.authUser.id,
      payeeId,
    });
    redirectWithMessage(returnTo, "error", paymentError?.message ?? "Unable to create payment record.");
  }

  const stripe = getStripe();
  const siteUrl = getSiteUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: {
            name: "Moral Trade agreement payment",
            description:
              cadenceUnit === "one_time"
                ? "One-time payment connected to a Moral Trade agreement."
                : `Installment for a negotiated ${cadenceValue} ${cadenceUnit.replace("_", " ")} cadence.`,
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: platformFeeCents || undefined,
      transfer_data: {
        destination: payeePaymentAccount.stripe_account_id,
      },
      metadata: {
        agreement_id: agreementId,
        agreement_payment_id: payment.id,
        payer_id: viewer.authUser.id,
        payee_id: payeeId,
      },
    },
    metadata: {
      agreement_id: agreementId,
      agreement_payment_id: payment.id,
      payer_id: viewer.authUser.id,
      payee_id: payeeId,
    },
    success_url: `${siteUrl}${returnTo}?message=${encodeURIComponent("Payment completed. Stripe will confirm it by webhook.")}`,
    cancel_url: `${siteUrl}${returnTo}?message=${encodeURIComponent("Payment checkout cancelled.")}`,
  });

  const { error: updateError } = await supabase
    .from("agreement_payments")
    .update({
      status: "checkout_created",
      stripe_checkout_session_id: session.id,
    })
    .eq("id", payment.id);

  if (updateError) {
    logSupabaseActionError("Failed to attach Stripe checkout session to payment record", updateError, {
      agreementId,
      paymentId: payment.id,
      sessionId: session.id,
    });
  }

  await supabase.from("agreement_events").insert({
    agreement_id: agreementId,
    actor_id: viewer.authUser.id,
    event_type: "payment_update",
    summary: `Payment checkout created for ${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}.`,
    details: notes,
  });

  if (!session.url) {
    redirectWithMessage(returnTo, "error", "Stripe did not return a checkout URL.");
  }

  redirect(session.url);
}

export async function createAgreementPaymentScheduleAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const amountCents = readMoneyCents(formData, "amount");
  const currency = normalizeCurrency(readOptional(formData, "currency") || "usd");
  const cadenceUnit = normalizePaymentScheduleUnit(readOptional(formData, "cadence_unit"));
  const cadenceValue = readBoundedInt(formData, "cadence_value", {
    fallback: 1,
    min: 1,
    max: 3650,
  });
  const firstDueAt = readOptional(formData, "next_due_at");
  const notes = readOptional(formData, "notes");

  if (!agreementId || amountCents <= 0) {
    redirectWithMessage(returnTo, "error", "Schedule amount and agreement are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (agreementError || !agreement) {
    redirectWithMessage(returnTo, "error", agreementError?.message ?? "Agreement not found.");
  }

  if (agreement.proposer_id !== viewer.authUser.id && agreement.responder_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You can only schedule payments inside your own agreements.");
  }

  const payeeId =
    agreement.proposer_id === viewer.authUser.id ? agreement.responder_id : agreement.proposer_id;
  const requestedDueDate = firstDueAt ? new Date(`${firstDueAt}T09:00:00.000Z`) : null;
  const nextDueAt =
    requestedDueDate && !Number.isNaN(requestedDueDate.getTime())
      ? requestedDueDate.toISOString()
      : computeNextDueAt({ cadenceValue, cadenceUnit });

  const { error: scheduleError } = await supabase.from("agreement_payment_schedules").insert({
    agreement_id: agreementId,
    payer_id: viewer.authUser.id,
    payee_id: payeeId,
    amount_cents: amountCents,
    currency,
    cadence_interval_unit: cadenceUnit,
    cadence_interval_value: cadenceValue,
    next_due_at: nextDueAt,
    status: "active",
  });

  if (scheduleError) {
    logSupabaseActionError("Failed to create payment schedule", scheduleError, {
      agreementId,
      payerId: viewer.authUser.id,
      payeeId,
    });
    redirectWithMessage(returnTo, "error", scheduleError.message);
  }

  await supabase.from("agreement_events").insert({
    agreement_id: agreementId,
    actor_id: viewer.authUser.id,
    event_type: "payment_update",
    summary: `Payment reminder schedule created for ${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}.`,
    details: notes || `Cadence: every ${cadenceValue} ${cadenceUnit.replace("_", " ")}.`,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${agreementId}`);
  redirectWithMessage(returnTo, "message", "Payment reminder schedule created.");
}

export async function requestPaymentReviewAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const paymentId = readRequired(formData, "payment_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const requestType = readRequired(formData, "request_type");
  const details = readOptional(formData, "details");

  if (!paymentId) {
    redirectWithMessage(returnTo, "error", "Payment ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: payment, error: paymentError } = await supabase
    .from("agreement_payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentError || !payment) {
    redirectWithMessage(returnTo, "error", paymentError?.message ?? "Payment record not found.");
  }

  if (payment.payer_id !== viewer.authUser.id && payment.payee_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You can only review payments from your own agreements.");
  }

  const eventType = requestType === "dispute" ? "dispute_opened" : "payment_update";
  const status: AgreementPaymentStatus =
    requestType === "dispute" ? "disputed" : "refund_requested";
  const summary =
    requestType === "dispute"
      ? "A participant opened a payment dispute."
      : "A participant requested refund review.";

  const { error: updateError } = await supabase
    .from("agreement_payments")
    .update({ status })
    .eq("id", paymentId);

  if (updateError) {
    logSupabaseActionError("Failed to update payment review status", updateError, {
      paymentId,
      userId: viewer.authUser.id,
      status,
    });
    redirectWithMessage(returnTo, "error", updateError.message);
  }

  const { error: eventError } = await supabase.from("agreement_events").insert({
    agreement_id: payment.agreement_id,
    actor_id: viewer.authUser.id,
    event_type: eventType,
    summary,
    details,
  });

  if (eventError) {
    logSupabaseActionError("Failed to record payment review event", eventError, {
      paymentId,
      agreementId: payment.agreement_id,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${payment.agreement_id}`);
  redirectWithMessage(returnTo, "message", "Payment review request recorded.");
}

export async function saveAgreementTermsAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!agreementId) {
    redirectWithMessage(returnTo, "error", "Agreement ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  await loadParticipantAgreementOrRedirect(supabase, agreementId, viewer.authUser.id, returnTo);

  const updatePayload: AgreementUpdate = {
    structured_terms: truncateText(readRequired(formData, "structured_terms"), 1600),
    no_trade_baseline: truncateText(readRequired(formData, "no_trade_baseline"), 1200),
    counterfactual_declaration: truncateText(
      readRequired(formData, "counterfactual_declaration"),
      1200,
    ),
    duration_terms: truncateText(readRequired(formData, "duration_terms"), 800),
    exit_conditions: truncateText(readRequired(formData, "exit_conditions"), 1000),
    evidence_rule: truncateText(readRequired(formData, "evidence_rule"), 1200),
    privacy_scope: truncateText(readRequired(formData, "privacy_scope"), 1000),
    disclosure_scope: truncateText(readRequired(formData, "disclosure_scope"), 1000),
    completion_state: "pending_evidence",
  };

  if (
    !updatePayload.structured_terms ||
    !updatePayload.no_trade_baseline ||
    !updatePayload.counterfactual_declaration ||
    !updatePayload.duration_terms ||
    !updatePayload.exit_conditions ||
    !updatePayload.evidence_rule ||
    !updatePayload.privacy_scope
  ) {
    redirectWithMessage(
      returnTo,
      "error",
      "Structured terms, baseline, counterfactual, duration, exit, evidence, and privacy fields are required.",
    );
  }

  const { error } = await supabase
    .from("agreements")
    .update(updatePayload)
    .eq("id", agreementId);

  if (error) {
    logSupabaseActionError("Failed to save agreement room terms", error, {
      agreementId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  await supabase.from("agreement_events").insert({
    agreement_id: agreementId,
    actor_id: viewer.authUser.id,
    event_type: "terms_updated",
    summary: "Structured agreement terms updated.",
    details:
      "Baseline, counterfactual declaration, duration, exit conditions, evidence rule, and privacy/disclosure scope were saved.",
  });

  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${agreementId}`);
  redirectWithMessage(returnTo, "message", "Agreement room terms saved.");
}

export async function submitAgreementEvidenceAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!agreementId) {
    redirectWithMessage(returnTo, "error", "Agreement ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  await loadParticipantAgreementOrRedirect(supabase, agreementId, viewer.authUser.id, returnTo);

  const tradeType = normalizeEvidenceTradeType(readOptional(formData, "trade_type"));
  const evidenceType = normalizeEvidenceType(readOptional(formData, "evidence_type"));
  const title = truncateText(readRequired(formData, "title"), 160);
  const evidenceUrl = truncateText(readOptional(formData, "evidence_url"), 900);
  const evidenceSummary = truncateText(readRequired(formData, "evidence_summary"), 1400);
  const reviewScope = truncateText(readOptional(formData, "review_scope"), 900);

  if (!title || !evidenceSummary) {
    redirectWithMessage(returnTo, "error", "Evidence title and summary are required.");
  }

  const evidencePayload: AgreementEvidenceItemInsert = {
    agreement_id: agreementId,
    uploader_id: viewer.authUser.id,
    trade_type: tradeType,
    evidence_type: evidenceType,
    schema_key: `${tradeType}_v1`,
    title,
    evidence_url: evidenceUrl,
    evidence_summary: evidenceSummary,
    status: "under_review",
  };

  const { data: evidenceItem, error: evidenceError } = await supabase
    .from("agreement_evidence_items")
    .insert(evidencePayload)
    .select("id")
    .single();

  if (evidenceError || !evidenceItem) {
    logSupabaseActionError("Failed to submit agreement evidence", evidenceError, {
      agreementId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", evidenceError?.message ?? "Unable to submit evidence.");
  }

  const reviewPayload: AgreementReviewCaseInsert = {
    agreement_id: agreementId,
    evidence_item_id: evidenceItem.id,
    opened_by: viewer.authUser.id,
    reviewer_role: "operator",
    review_scope:
      reviewScope ||
      `Review ${tradeType.replaceAll("_", " ")} evidence using schema ${tradeType}_v1.`,
    status: "under_review",
    sla_due_at: addHours(72),
  };

  const { error: reviewError } = await supabase.from("agreement_review_cases").insert(reviewPayload);

  if (reviewError) {
    logSupabaseActionError("Failed to open agreement review case", reviewError, {
      agreementId,
      evidenceItemId: evidenceItem.id,
    });
    redirectWithMessage(returnTo, "error", reviewError.message);
  }

  await supabase
    .from("agreements")
    .update({ completion_state: "under_review" })
    .eq("id", agreementId);

  await supabase.from("agreement_events").insert({
    agreement_id: agreementId,
    actor_id: viewer.authUser.id,
    event_type: "evidence_submitted",
    summary: `Evidence submitted: ${title}`,
    details: evidenceSummary,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${agreementId}`);
  redirectWithMessage(returnTo, "message", "Evidence submitted for review.");
}

export async function requestAgreementReviewAppealAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const reviewCaseId = readRequired(formData, "review_case_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const appealReason = truncateText(readRequired(formData, "appeal_reason"), 1400);

  if (!reviewCaseId || !appealReason) {
    redirectWithMessage(returnTo, "error", "Review case and appeal reason are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: reviewCase, error: reviewCaseError } = await supabase
    .from("agreement_review_cases")
    .select("*")
    .eq("id", reviewCaseId)
    .maybeSingle();

  if (reviewCaseError || !reviewCase) {
    redirectWithMessage(returnTo, "error", reviewCaseError?.message ?? "Review case not found.");
  }

  await loadParticipantAgreementOrRedirect(
    supabase,
    reviewCase.agreement_id,
    viewer.authUser.id,
    returnTo,
  );

  const appealedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("agreement_review_cases")
    .update({
      status: "appealed",
      appeal_requested_by: viewer.authUser.id,
      appeal_reason: appealReason,
      appealed_at: appealedAt,
    })
    .eq("id", reviewCaseId);

  if (updateError) {
    logSupabaseActionError("Failed to request review appeal", updateError, {
      reviewCaseId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", updateError.message);
  }

  await supabase
    .from("agreements")
    .update({ completion_state: "disputed_unresolved" })
    .eq("id", reviewCase.agreement_id);

  if (reviewCase.evidence_item_id) {
    await supabase
      .from("agreement_evidence_items")
      .update({ status: "disputed_unresolved" })
      .eq("id", reviewCase.evidence_item_id);
  }

  await supabase.from("agreement_events").insert({
    agreement_id: reviewCase.agreement_id,
    actor_id: viewer.authUser.id,
    event_type: "appeal_requested",
    summary: "Review appeal requested.",
    details: appealReason,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${reviewCase.agreement_id}`);
  redirectWithMessage(returnTo, "message", "Appeal requested.");
}

export async function addAgreementEventAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const eventType = normalizeAgreementEventType(readOptional(formData, "event_type"));
  const summary = readRequired(formData, "summary");
  const details = readOptional(formData, "details");

  if (!agreementId || !summary) {
    redirectWithMessage(returnTo, "error", "Agreement event and summary are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (agreementError || !agreement) {
    redirectWithMessage(returnTo, "error", agreementError?.message ?? "Agreement not found.");
  }

  if (agreement.proposer_id !== viewer.authUser.id && agreement.responder_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You can only update your own agreements.");
  }

  const { error } = await supabase.from("agreement_events").insert({
    agreement_id: agreementId,
    actor_id: viewer.authUser.id,
    event_type: eventType,
    summary,
    details,
  });

  if (error) {
    logSupabaseActionError("Failed to add agreement event", error, {
      agreementId,
      userId: viewer.authUser.id,
      eventType,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${agreementId}`);
  redirectWithMessage(returnTo, "message", "Agreement update recorded.");
}

export async function updateAgreementStatusAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const status = normalizeAgreementStatus(readRequired(formData, "status"));
  const summary = readOptional(formData, "summary") || `Agreement marked ${status}.`;

  if (!agreementId) {
    redirectWithMessage(returnTo, "error", "Agreement ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (agreementError || !agreement) {
    redirectWithMessage(returnTo, "error", agreementError?.message ?? "Agreement not found.");
  }

  if (agreement.proposer_id !== viewer.authUser.id && agreement.responder_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You can only update your own agreements.");
  }

  const { error } = await supabase
    .from("agreements")
    .update({ status })
    .eq("id", agreementId);

  if (error) {
    logSupabaseActionError("Failed to update agreement status", error, {
      agreementId,
      userId: viewer.authUser.id,
      status,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  const { error: eventError } = await supabase.from("agreement_events").insert({
    agreement_id: agreementId,
    actor_id: viewer.authUser.id,
    event_type: "status_change",
    summary,
  });

  if (eventError) {
    logSupabaseActionError("Failed to record agreement status event", eventError, {
      agreementId,
      userId: viewer.authUser.id,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${agreementId}`);
  redirectWithMessage(returnTo, "message", "Agreement status updated.");
}

export async function saveSearchAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const label = readRequired(formData, "label");
  const query = readOptional(formData, "query");
  const causes = readStringList(formData, "causes_json");
  const cadence = normalizeMatchFrequency(readOptional(formData, "cadence"));
  const minScore = readBoundedInt(formData, "min_score", {
    fallback: 50,
    min: 0,
    max: 100,
  });

  if (!label) {
    redirectWithMessage(returnTo, "error", "Saved search label is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase.from("saved_searches").insert({
    profile_id: viewer.authUser.id,
    label,
    query,
    causes,
    cadence,
    min_score: minScore,
    status: "active",
  });

  if (error) {
    logSupabaseActionError("Failed to save match search", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Saved search created.");
}

export async function updateMatchReportStatusAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const reportId = readRequired(formData, "report_id");
  const rawStatus = readRequired(formData, "status");
  const status =
    rawStatus === "reviewed" || rawStatus === "dismissed" ? rawStatus : "open";

  if (!reportId) {
    redirectWithMessage(returnTo, "error", "Report ID is required.");
  }

  await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("match_reports")
    .update({
      status,
      reviewed_at: status === "open" ? null : new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    logSupabaseActionError("Failed to update match report status", error, {
      reportId,
      status,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/admin");
  redirectWithMessage(returnTo, "message", "Report status updated.");
}

async function upsertVerificationBadgeForProfile({
  badgeType,
  evidenceSummary,
  profileId,
  reviewedBy,
  source = "agreement_review",
  status = "verified",
  supabase,
}: {
  badgeType: ProfileVerificationBadgeInsert["badge_type"];
  evidenceSummary: string;
  profileId: string;
  reviewedBy: string;
  source?: string;
  status?: ProfileVerificationBadgeInsert["status"];
  supabase: ReturnType<typeof createServiceClient>;
}) {
  const { error } = await supabase.from("profile_verification_badges").upsert(
    {
      profile_id: profileId,
      badge_type: badgeType,
      status,
      evidence_summary: evidenceSummary,
      source,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    },
    {
      onConflict: "profile_id,badge_type",
    },
  );

  if (error) {
    logSupabaseActionError("Failed to upsert verification badge", error, {
      badgeType,
      profileId,
      status,
    });
  }
}

async function refreshRepeatCounterpartyBadge({
  profileId,
  reviewedBy,
  supabase,
}: {
  profileId: string;
  reviewedBy: string;
  supabase: ReturnType<typeof createServiceClient>;
}) {
  const { data, error } = await supabase
    .from("agreements")
    .select("id")
    .or(`proposer_id.eq.${profileId},responder_id.eq.${profileId}`)
    .eq("completion_state", "reviewed_complete")
    .limit(2);

  if (error) {
    logSupabaseActionError("Failed to count reviewed completions for repeat badge", error, {
      profileId,
    });
    return;
  }

  if ((data ?? []).length >= 2) {
    await upsertVerificationBadgeForProfile({
      badgeType: "repeat_counterparty",
      evidenceSummary: "At least two agreement rooms have reached reviewed-complete state.",
      profileId,
      reviewedBy,
      source: "automatic_review_count",
      supabase,
    });
  }
}

export async function updateAgreementReviewCaseAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const reviewCaseId = readRequired(formData, "review_case_id");

  if (!reviewCaseId) {
    redirectWithMessage(returnTo, "error", "Review case ID is required.");
  }

  const admin = await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const nextStatus = normalizeReviewCaseStatus(readRequired(formData, "status"));
  const reviewerRole = normalizeReviewerRole(readOptional(formData, "reviewer_role"));
  const reviewerConfidence = readBoundedInt(formData, "reviewer_confidence", {
    fallback: 0,
    min: 0,
    max: 100,
  });
  const challengeWindowEndsAt =
    nextStatus === "challenge_window_open" ? addDaysFromNow(7) : null;
  const reviewedAt =
    nextStatus === "open" || nextStatus === "under_review" ? null : new Date().toISOString();

  const updatePayload: AgreementReviewCaseUpdate = {
    status: nextStatus,
    reviewer_role: reviewerRole,
    assigned_reviewer_id: admin.authUser.id,
    review_scope: truncateText(readOptional(formData, "review_scope"), 900),
    conflict_of_interest_notes: truncateText(
      readOptional(formData, "conflict_of_interest_notes"),
      1000,
    ),
    reviewer_notes: truncateText(readOptional(formData, "reviewer_notes"), 1400),
    public_reasoning_summary: truncateText(
      readOptional(formData, "public_reasoning_summary"),
      1400,
    ),
    reviewed_by: reviewedAt ? admin.authUser.id : null,
    reviewed_at: reviewedAt,
    challenge_window_ends_at: challengeWindowEndsAt,
  };

  const { data: reviewCase, error } = await supabase
    .from("agreement_review_cases")
    .update(updatePayload)
    .eq("id", reviewCaseId)
    .select("*")
    .single();

  if (error || !reviewCase) {
    logSupabaseActionError("Failed to update agreement review case", error, {
      reviewCaseId,
      nextStatus,
    });
    redirectWithMessage(returnTo, "error", error?.message ?? "Review case not found.");
  }

  const evidenceStatus: NonNullable<AgreementEvidenceItemUpdate["status"]> =
    nextStatus === "reviewed_complete"
      ? "reviewed_complete"
      : nextStatus === "challenge_window_open"
        ? "challenge_window_open"
        : nextStatus === "disputed_unresolved" || nextStatus === "appealed"
          ? "disputed_unresolved"
          : "under_review";
  const agreementCompletionState: NonNullable<AgreementUpdate["completion_state"]> =
    evidenceStatus === "reviewed_complete"
      ? "reviewed_complete"
      : evidenceStatus === "challenge_window_open"
        ? "challenge_window_open"
        : evidenceStatus === "disputed_unresolved"
          ? "disputed_unresolved"
          : "under_review";

  let evidenceItem:
    | Database["public"]["Tables"]["agreement_evidence_items"]["Row"]
    | null = null;

  if (reviewCase.evidence_item_id) {
    const { data: updatedEvidenceItem, error: evidenceError } = await supabase
      .from("agreement_evidence_items")
      .update({
        status: evidenceStatus,
        reviewer_confidence: reviewerConfidence || null,
      })
      .eq("id", reviewCase.evidence_item_id)
      .select("*")
      .maybeSingle();

    if (evidenceError) {
      logSupabaseActionError("Failed to update evidence item review status", evidenceError, {
        reviewCaseId,
        evidenceItemId: reviewCase.evidence_item_id,
      });
    }

    evidenceItem = updatedEvidenceItem;
  }

  const agreementUpdatePayload: AgreementUpdate = {
    completion_state: agreementCompletionState,
    challenge_window_ends_at: challengeWindowEndsAt,
  };

  if (agreementCompletionState === "reviewed_complete") {
    agreementUpdatePayload.status = "completed";
  }

  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .update(agreementUpdatePayload)
    .eq("id", reviewCase.agreement_id)
    .select("*")
    .maybeSingle();

  if (agreementError || !agreement) {
    logSupabaseActionError("Failed to update agreement completion state", agreementError, {
      reviewCaseId,
      agreementId: reviewCase.agreement_id,
    });
  }

  await supabase.from("agreement_events").insert({
    agreement_id: reviewCase.agreement_id,
    actor_id: admin.authUser.id,
    event_type:
      nextStatus === "challenge_window_open"
        ? "challenge_opened"
        : "review_status_changed",
    summary: `Review case moved to ${nextStatus.replaceAll("_", " ")}.`,
    details: updatePayload.public_reasoning_summary || updatePayload.reviewer_notes || "",
  });

  if (nextStatus === "reviewed_complete" && agreement) {
    const badgeSummary =
      updatePayload.public_reasoning_summary ||
      "An agreement room reached reviewed-complete state after evidence review.";
    for (const profileId of [agreement.proposer_id, agreement.responder_id]) {
      await upsertVerificationBadgeForProfile({
        badgeType: "completion_reviewed",
        evidenceSummary: badgeSummary,
        profileId,
        reviewedBy: admin.authUser.id,
        supabase,
      });

      if (
        evidenceItem &&
        ["receipt", "provider_record", "third_party_review"].includes(evidenceItem.evidence_type)
      ) {
        await upsertVerificationBadgeForProfile({
          badgeType: "payment_evidence_verified",
          evidenceSummary: `Evidence item reviewed: ${evidenceItem.title}`,
          profileId,
          reviewedBy: admin.authUser.id,
          supabase,
        });
      }

      await refreshRepeatCounterpartyBadge({
        profileId,
        reviewedBy: admin.authUser.id,
        supabase,
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${reviewCase.agreement_id}`);
  redirectWithMessage(returnTo, "message", "Evidence review case updated.");
}

export async function updateProfileVerificationBadgeAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const profileId = readRequired(formData, "profile_id");

  if (!profileId) {
    redirectWithMessage(returnTo, "error", "Profile ID is required.");
  }

  const admin = await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const badgeType = normalizeVerificationBadgeType(readRequired(formData, "badge_type"));
  const status = normalizeVerificationBadgeStatus(readRequired(formData, "status"));

  await upsertVerificationBadgeForProfile({
    badgeType,
    evidenceSummary: truncateText(readOptional(formData, "evidence_summary"), 1200),
    profileId,
    reviewedBy: admin.authUser.id,
    source: truncateText(readOptional(formData, "source") || "operator_review", 120),
    status,
    supabase,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/people/${profileId}`);
  redirectWithMessage(returnTo, "message", "Verification badge updated.");
}

export async function updatePaymentReviewStatusAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const paymentId = readRequired(formData, "payment_id");
  const rawStatus = readRequired(formData, "status");
  const status: AgreementPaymentStatus =
    rawStatus === "refunded" ||
    rawStatus === "disputed" ||
    rawStatus === "cancelled" ||
    rawStatus === "paid"
      ? rawStatus
      : "refund_requested";

  if (!paymentId) {
    redirectWithMessage(returnTo, "error", "Payment ID is required.");
  }

  const admin = await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const { data: payment, error: paymentError } = await supabase
    .from("agreement_payments")
    .update({ status })
    .eq("id", paymentId)
    .select("*")
    .maybeSingle();

  if (paymentError || !payment) {
    logSupabaseActionError("Failed to update payment review status as admin", paymentError, {
      paymentId,
      status,
    });
    redirectWithMessage(returnTo, "error", paymentError?.message ?? "Payment not found.");
  }

  await supabase.from("agreement_events").insert({
    agreement_id: payment.agreement_id,
    actor_id: admin.authUser.id,
    event_type: "payment_update",
    summary: `Admin marked payment ${status.replace("_", " ")}.`,
    details: "Administrative payment review action. This records platform state only; Stripe disputes or refunds still need Stripe-side handling when applicable.",
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${payment.agreement_id}`);
  redirectWithMessage(returnTo, "message", "Payment review status updated.");
}

export async function suppressEmailOutboxAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const emailId = readRequired(formData, "email_id");

  if (!emailId) {
    redirectWithMessage(returnTo, "error", "Email ID is required.");
  }

  await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("email_outbox")
    .update({
      status: "suppressed",
      last_error: "Suppressed by administrator.",
    })
    .eq("id", emailId);

  if (error) {
    logSupabaseActionError("Failed to suppress queued email", error, {
      emailId,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/admin");
  redirectWithMessage(returnTo, "message", "Email suppressed.");
}

export async function reviewDonationOffsetOfferAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const offerId = readRequired(formData, "offer_id");
  const rawStatus = readRequired(formData, "moderation_status");
  const moderationStatus =
    rawStatus === "clear" || rawStatus === "blocked" ? rawStatus : "flagged";
  const moderationNotes = readOptional(formData, "moderation_notes");

  if (!offerId) {
    redirectWithMessage(returnTo, "error", "Offer ID is required.");
  }

  const admin = await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const reviewedAt = new Date().toISOString();

  const { data: offsetOffer, error: offsetOfferError } = await supabase
    .from("donation_offset_offers")
    .update({
      moderation_status: moderationStatus,
      moderation_notes: moderationNotes,
      moderation_reviewed_by: admin.authUser.id,
      moderation_reviewed_at: reviewedAt,
    })
    .eq("offer_id", offerId)
    .select("*")
    .maybeSingle();

  if (offsetOfferError || !offsetOffer) {
    logSupabaseActionError("Failed to review donation offset offer", offsetOfferError, {
      offerId,
      moderationStatus,
    });
    redirectWithMessage(returnTo, "error", offsetOfferError?.message ?? "Donation offset offer not found.");
  }

  const nextOfferStatus =
    moderationStatus === "clear" ? "open" : moderationStatus === "blocked" ? "closed" : "paused";

  const { error: offerError } = await supabase
    .from("offers")
    .update({
      status: nextOfferStatus,
    })
    .eq("id", offerId);

  if (offerError) {
    logSupabaseActionError("Failed to update offer status after donation offset review", offerError, {
      offerId,
      moderationStatus,
    });
    redirectWithMessage(returnTo, "error", offerError.message);
  }

  if (offsetOffer.pool_id) {
    const { error: poolError } = await supabase
      .from("donation_offset_pools")
      .update({
        moderation_status: moderationStatus,
        moderation_notes: moderationNotes,
      })
      .eq("id", offsetOffer.pool_id);

    if (poolError) {
      logSupabaseActionError("Failed to update donation offset pool review state", poolError, {
        offerId,
        poolId: offsetOffer.pool_id,
        moderationStatus,
      });
      redirectWithMessage(returnTo, "error", poolError.message);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/offers");
  revalidatePath("/donation-offsets");
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(returnTo, "message", "Donation offset review updated.");
}

export async function toggleFollowAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/", "error", "Supabase is not configured yet.");
  }

  const profileId = readRequired(formData, "profile_id");
  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    profileId ? `/people/${profileId}` : "/people",
  );

  if (!profileId) {
    redirectWithMessage("/people", "error", "Profile ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  if (viewer.authUser.id === profileId) {
    redirectWithMessage(returnTo, "error", "You cannot follow your own profile.");
  }

  const supabase = await createClient();
  await ensureAccountRowsForUser(viewer.authUser, supabase);

  const { data: existing } = await supabase
    .from("user_follows")
    .select("*")
    .eq("follower_id", viewer.authUser.id)
    .eq("followed_id", profileId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", viewer.authUser.id)
      .eq("followed_id", profileId);

    if (error) {
      logSupabaseActionError("Failed to unfollow profile", error, {
        followerId: viewer.authUser.id,
        followedId: profileId,
      });
      redirectWithMessage(returnTo, "error", error.message);
    }

    revalidatePath("/people");
    revalidatePath(`/people/${profileId}`);
    revalidatePath(`/people/${viewer.authUser.id}`);
    redirectWithMessage(returnTo, "message", "Unfollowed.");
  }

  const { error } = await supabase.from("user_follows").insert({
    follower_id: viewer.authUser.id,
    followed_id: profileId,
  });

  if (error) {
    logSupabaseActionError("Failed to follow profile", error, {
      followerId: viewer.authUser.id,
      followedId: profileId,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/people");
  revalidatePath(`/people/${profileId}`);
  revalidatePath(`/people/${viewer.authUser.id}`);
  redirectWithMessage(returnTo, "message", "Now following this member.");
}

export async function toggleCartAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const offerId = readRequired(formData, "offer_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);

  if (!offerId) {
    redirectWithMessage("/offers", "error", "Offer ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    redirectWithMessage("/offers", "error", offerError?.message ?? "Offer not found.");
  }

  if (offer.owner_id === viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You cannot add your own offer to your cart.");
  }

  const { data: existing } = await supabase
    .from("offer_carts")
    .select("*")
    .eq("offer_id", offerId)
    .eq("user_id", viewer.authUser.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("offer_carts")
      .delete()
      .eq("offer_id", offerId)
      .eq("user_id", viewer.authUser.id);

    if (error) {
      logSupabaseActionError("Failed to remove offer from cart", error, {
        offerId,
        userId: viewer.authUser.id,
      });
      redirectWithMessage(returnTo, "error", error.message);
    }

    revalidatePath("/cart");
    revalidatePath("/dashboard");
    revalidatePath(`/offers/${offerId}`);
    redirectWithMessage(returnTo, "message", "Removed from cart.");
  }

  const { error } = await supabase.from("offer_carts").insert({
    offer_id: offerId,
    user_id: viewer.authUser.id,
  });

  if (error) {
    logSupabaseActionError("Failed to add offer to cart", error, {
      offerId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/cart");
  revalidatePath("/dashboard");
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(returnTo, "message", "Added to cart.");
}

export async function updateOfferDiscountAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const offerId = readRequired(formData, "offer_id");
  const discountNote = readOptional(formData, "discount_note");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);

  if (!offerId) {
    redirectWithMessage("/offers", "error", "Offer ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    redirectWithMessage("/offers", "error", offerError?.message ?? "Offer not found.");
  }

  if (offer.owner_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "Only the offer owner can change discounts.");
  }

  const { error } = await supabase
    .from("offers")
    .update({
      discount_note: discountNote,
    })
    .eq("id", offerId);

  if (error) {
    logSupabaseActionError("Failed to update offer discount", error, {
      offerId,
      ownerId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/cart");
  revalidatePath("/dashboard");
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(returnTo, "message", "Offer discount updated.");
}

export async function addOfferRecommendationAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const recommendedOfferId = readRequired(formData, "recommended_offer_id");
  const sourceOfferId = readOptional(formData, "source_offer_id");
  const profilePageId = readOptional(formData, "profile_page_id");
  const fallbackPath = profilePageId ? `/people/${profilePageId}` : `/offers/${sourceOfferId}`;
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), fallbackPath);

  if (!recommendedOfferId) {
    redirectWithMessage(returnTo, "error", "Choose an offer to recommend.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();

  const { data: recommendedOffer, error: recommendedOfferError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", recommendedOfferId)
    .maybeSingle();

  if (recommendedOfferError || !recommendedOffer) {
    redirectWithMessage(returnTo, "error", recommendedOfferError?.message ?? "Offer not found.");
  }

  if (recommendedOffer.owner_id === viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "Recommendations must point to another member's offer.");
  }

  if (sourceOfferId) {
    const { data: sourceOffer, error: sourceOfferError } = await supabase
      .from("offers")
      .select("*")
      .eq("id", sourceOfferId)
      .maybeSingle();

    if (sourceOfferError || !sourceOffer) {
      redirectWithMessage(returnTo, "error", sourceOfferError?.message ?? "Source offer not found.");
    }

    if (sourceOffer.owner_id !== viewer.authUser.id) {
      redirectWithMessage(returnTo, "error", "You can only recommend from your own offer pages.");
    }
  } else if (profilePageId && profilePageId !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You can only add profile recommendations to your own page.");
  }

  const duplicateQuery = supabase
    .from("offer_recommendations")
    .select("*")
    .eq("recommender_id", viewer.authUser.id)
    .eq("recommended_offer_id", recommendedOfferId);

  const { data: existing, error: existingError } = sourceOfferId
    ? await duplicateQuery.eq("source_offer_id", sourceOfferId).maybeSingle()
    : await duplicateQuery.is("source_offer_id", null).maybeSingle();

  if (existingError) {
    logSupabaseActionError("Failed to check existing recommendation", existingError, {
      recommenderId: viewer.authUser.id,
      recommendedOfferId,
      sourceOfferId: sourceOfferId || null,
    });
  }

  if (existing) {
    redirectWithMessage(returnTo, "message", "That recommendation is already published.");
  }

  const { error } = await supabase.from("offer_recommendations").insert({
    recommender_id: viewer.authUser.id,
    source_offer_id: sourceOfferId || null,
    recommended_offer_id: recommendedOfferId,
  });

  if (error) {
    logSupabaseActionError("Failed to add recommendation", error, {
      recommenderId: viewer.authUser.id,
      recommendedOfferId,
      sourceOfferId: sourceOfferId || null,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/offers");
  revalidatePath(`/offers/${recommendedOfferId}`);
  if (sourceOfferId) {
    revalidatePath(`/offers/${sourceOfferId}`);
  }
  if (profilePageId) {
    revalidatePath(`/people/${profilePageId}`);
  }
  redirectWithMessage(returnTo, "message", "Recommendation published.");
}

export async function removeOfferRecommendationAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const recommendationId = readRequired(formData, "recommendation_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!recommendationId) {
    redirectWithMessage(returnTo, "error", "Recommendation ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();

  const { error } = await supabase
    .from("offer_recommendations")
    .delete()
    .eq("id", recommendationId)
    .eq("recommender_id", viewer.authUser.id);

  if (error) {
    logSupabaseActionError("Failed to remove recommendation", error, {
      recommendationId,
      recommenderId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/offers");
  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  redirectWithMessage(returnTo, "message", "Recommendation removed.");
}

export async function addOfferCommentAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const offerId = readRequired(formData, "offer_id");
  const parentId = readOptional(formData, "parent_id");
  const body = readOptional(formData, "body");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);

  if (!offerId || !body) {
    redirectWithMessage(returnTo, "error", "Comments cannot be empty.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  let depth = 0;

  enforceActionRateLimit({
    key: `offer-comment:${viewer.authUser.id}`,
    limit: 12,
    message: "You are posting comments too quickly. Wait a few minutes before trying again.",
    returnTo,
    windowMs: 5 * 60 * 1000,
  });

  if (parentId) {
    const { data: parentComment, error: parentError } = await supabase
      .from("offer_comments")
      .select("*")
      .eq("id", parentId)
      .maybeSingle();

    if (parentError || !parentComment) {
      redirectWithMessage(returnTo, "error", parentError?.message ?? "Parent comment not found.");
    }

    if (parentComment.offer_id !== offerId) {
      redirectWithMessage(returnTo, "error", "Reply target does not belong to this offer.");
    }

    if (parentComment.depth >= 49) {
      redirectWithMessage(returnTo, "error", "Replies are capped at 50 nested levels.");
    }

    depth = parentComment.depth + 1;
  }

  const { error } = await supabase.from("offer_comments").insert({
    offer_id: offerId,
    author_id: viewer.authUser.id,
    parent_id: parentId || null,
    depth,
    body,
  });

  if (error) {
    logSupabaseActionError("Failed to add offer comment", error, {
      offerId,
      authorId: viewer.authUser.id,
      parentId: parentId || null,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/people");
  revalidatePath(`/people/${viewer.authUser.id}`);
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(returnTo, "message", "Comment posted.");
}

export async function voteCommentAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const commentId = readRequired(formData, "comment_id");
  const offerId = readRequired(formData, "offer_id");
  const value = Number(readRequired(formData, "value"));
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);

  if (!commentId || !offerId || ![-1, 1].includes(value)) {
    redirectWithMessage(returnTo, "error", "Invalid comment vote.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: comment, error: commentError } = await supabase
    .from("offer_comments")
    .select("*")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError || !comment) {
    redirectWithMessage(returnTo, "error", commentError?.message ?? "Comment not found.");
  }

  if (comment.author_id === viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You cannot vote on your own comment.");
  }

  const { data: existing } = await supabase
    .from("comment_votes")
    .select("*")
    .eq("comment_id", commentId)
    .eq("user_id", viewer.authUser.id)
    .maybeSingle();

  if (existing && existing.value === value) {
    const { error } = await supabase
      .from("comment_votes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", viewer.authUser.id);

    if (error) {
      logSupabaseActionError("Failed to clear comment vote", error, {
        commentId,
        userId: viewer.authUser.id,
      });
      redirectWithMessage(returnTo, "error", error.message);
    }

    revalidatePath("/people");
    revalidatePath(`/people/${comment.author_id}`);
    revalidatePath(`/offers/${offerId}`);
    redirectWithMessage(returnTo, "message", "Vote removed.");
  }

  const { error } = await supabase.from("comment_votes").upsert(
    {
      comment_id: commentId,
      user_id: viewer.authUser.id,
      value,
    },
    {
      onConflict: "comment_id,user_id",
    },
  );

  if (error) {
    logSupabaseActionError("Failed to record comment vote", error, {
      commentId,
      userId: viewer.authUser.id,
      value,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/people");
  revalidatePath(`/people/${comment.author_id}`);
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(returnTo, "message", value > 0 ? "Upvoted." : "Downvoted.");
}

export async function acceptInterestAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const interestId = readRequired(formData, "interest_id");
  const offerId = readRequired(formData, "offer_id");
  const notes = readOptional(formData, "notes");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);

  if (!interestId || !offerId) {
    redirectWithMessage(returnTo, "error", "Interest ID and offer ID are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    redirectWithMessage(returnTo, "error", offerError?.message ?? "Offer not found.");
  }

  if (offer.owner_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "Only the offer owner can accept interest.");
  }

  const { data: interest, error: interestError } = await supabase
    .from("interests")
    .select("*")
    .eq("id", interestId)
    .maybeSingle();

  if (interestError || !interest) {
    redirectWithMessage(returnTo, "error", interestError?.message ?? "Interest not found.");
  }

  if (interest.offer_id !== offerId) {
    redirectWithMessage(returnTo, "error", "That interest is not attached to this offer.");
  }

  const { error: acceptError } = await supabase
    .from("interests")
    .update({
      status: "accepted",
    })
    .eq("id", interestId);

  if (acceptError) {
    logSupabaseActionError("Failed to accept interest", acceptError, {
      interestId,
      offerId,
      ownerId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", acceptError.message);
  }

  const { error: declineOthersError } = await supabase
    .from("interests")
    .update({
      status: "declined",
    })
    .eq("offer_id", offerId)
    .neq("id", interestId)
    .eq("status", "pending");

  if (declineOthersError) {
    logSupabaseActionError("Failed to decline competing interests", declineOthersError, {
      offerId,
      acceptedInterestId: interestId,
    });
  }

  const { error: agreementError } = await supabase.from("agreements").upsert(
    {
      offer_id: offerId,
      interest_id: interestId,
      proposer_id: viewer.authUser.id,
      responder_id: interest.user_id,
      status: "active",
      notes,
      source: "offer",
      structured_terms: `${offer.offer_action} for ${offer.request_action}`,
      duration_terms: offer.duration,
      evidence_rule: offer.verification,
      privacy_scope: "Agreement participants can see this room. Broader publication waits for reviewed completion.",
      disclosure_scope: "Share only the details needed to verify this agreement and resolve disputes.",
      completion_state: "pending_evidence",
    },
    {
      onConflict: "interest_id",
    },
  );

  if (agreementError) {
    logSupabaseActionError("Failed to create agreement after accepting interest", agreementError, {
      offerId,
      interestId,
      proposerId: viewer.authUser.id,
      responderId: interest.user_id,
    });
    redirectWithMessage(returnTo, "error", agreementError.message);
  }

  if (offer.mode === "offset") {
    const { data: offsetDetails, error: offsetError } = await supabase
      .from("donation_offset_offers")
      .select("*")
      .eq("offer_id", offerId)
      .maybeSingle();

    if (offsetError || !offsetDetails) {
      logSupabaseActionError("Failed to load donation offset details during acceptance", offsetError, {
        offerId,
        interestId,
      });
      redirectWithMessage(
        returnTo,
        "error",
        offsetError?.message ?? "Donation offset details were missing for this offer.",
      );
    }

    if (offsetDetails.participation_mode === "pool") {
      redirectWithMessage(
        returnTo,
        "error",
        "Pool commitments are aggregated through the pool itself. Join the pool instead of accepting it one-to-one.",
      );
    }

    const preview = calculateDonationOffsetPreview({
      baselineAmountUsd: offsetDetails.baseline_amount_cents / 100,
      requestedMatchingAmountUsd: offsetDetails.requested_matching_amount_cents / 100,
      offsetRatio: offsetDetails.offset_ratio,
      unmatchedSurplusRule: offsetDetails.unmatched_surplus_rule,
    });

    const matchInsert: DonationOffsetMatchInsert = {
      offer_id: offerId,
      interest_id: interestId,
      owner_profile_id: viewer.authUser.id,
      counterparty_profile_id: interest.user_id,
      matched_baseline_cents: convertUsdToCents(preview.matchedBaselineUsd),
      matched_counterparty_cents: convertUsdToCents(preview.matchedCounterpartyUsd),
      compromise_total_cents: convertUsdToCents(preview.compromiseTotalUsd),
      unmatched_baseline_cents: convertUsdToCents(preview.unmatchedBaselineUsd),
      unmatched_counterparty_cents: convertUsdToCents(preview.unmatchedCounterpartyUsd),
      status: "completed",
      owner_evidence_url: offsetDetails.evidence_url,
      compromise_evidence_url: offsetDetails.evidence_url,
    };

    const { error: matchError } = await supabase.from("donation_offset_matches").insert(matchInsert);

    if (matchError) {
      logSupabaseActionError("Failed to record donation offset match", matchError, {
        offerId,
        interestId,
      });
      redirectWithMessage(returnTo, "error", matchError.message);
    }
  }

  const { data: responderProfile } = await supabase
    .from("profiles")
    .select("email, display_name")
    .eq("id", interest.user_id)
    .maybeSingle();

  await queueEmailOutbox({
    profileId: viewer.authUser.id,
    recipientEmail: responderProfile?.email,
    subject: "Your Moral Trade response was accepted",
    body: `An agreement was created for ${offer.offered_cause} for ${offer.requested_cause}. Sign in to review payment, evidence, verification, and status options.`,
  });

  const { error: offerUpdateError } = await supabase
    .from("offers")
    .update({
      status: "matched",
    })
    .eq("id", offerId);

  if (offerUpdateError) {
    logSupabaseActionError("Failed to mark offer as matched", offerUpdateError, {
      offerId,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(returnTo, "message", "Interest accepted and agreement created.");
}

export async function acceptGuestInterestAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const guestInterestId = readRequired(formData, "guest_interest_id");
  const offerId = readRequired(formData, "offer_id");
  const notes = readOptional(formData, "notes");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);

  if (!guestInterestId || !offerId) {
    redirectWithMessage(returnTo, "error", "Guest response ID and offer ID are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    redirectWithMessage(returnTo, "error", offerError?.message ?? "Offer not found.");
  }

  if (offer.owner_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "Only the offer owner can accept responses.");
  }

  const { data: guestInterest, error: guestInterestError } = await supabase
    .from("guest_interests")
    .select("*")
    .eq("id", guestInterestId)
    .maybeSingle();

  if (guestInterestError || !guestInterest) {
    redirectWithMessage(returnTo, "error", guestInterestError?.message ?? "Guest response not found.");
  }

  if (guestInterest.offer_id !== offerId) {
    redirectWithMessage(returnTo, "error", "That guest response is not attached to this offer.");
  }

  if (!guestInterest.claimed_by_profile_id) {
    redirectWithMessage(
      returnTo,
      "error",
      "That guest respondent has not created an account yet. Ask them to sign up with the same email first.",
    );
  }

  const { data: existingAgreement, error: existingAgreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("offer_id", offerId)
    .maybeSingle();

  if (existingAgreementError) {
    logSupabaseActionError("Failed to check existing agreement before accepting guest response", existingAgreementError, {
      offerId,
      guestInterestId,
    });
    redirectWithMessage(returnTo, "error", existingAgreementError.message);
  }

  if (existingAgreement) {
    redirectWithMessage(returnTo, "message", "This offer already has an agreement.");
  }

  const { error: acceptError } = await supabase
    .from("guest_interests")
    .update({
      status: "accepted",
    })
    .eq("id", guestInterestId);

  if (acceptError) {
    logSupabaseActionError("Failed to accept guest response", acceptError, {
      guestInterestId,
      offerId,
      ownerId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", acceptError.message);
  }

  const { error: declineGuestError } = await supabase
    .from("guest_interests")
    .update({
      status: "declined",
    })
    .eq("offer_id", offerId)
    .neq("id", guestInterestId)
    .eq("status", "pending");

  if (declineGuestError) {
    logSupabaseActionError("Failed to decline competing guest responses", declineGuestError, {
      offerId,
      acceptedGuestInterestId: guestInterestId,
    });
  }

  const { error: declineMemberError } = await supabase
    .from("interests")
    .update({
      status: "declined",
    })
    .eq("offer_id", offerId)
    .eq("status", "pending");

  if (declineMemberError) {
    logSupabaseActionError("Failed to decline competing member interests after guest acceptance", declineMemberError, {
      offerId,
      acceptedGuestInterestId: guestInterestId,
    });
  }

  const { error: agreementError } = await supabase.from("agreements").insert({
    offer_id: offerId,
    interest_id: null,
    proposer_id: viewer.authUser.id,
    responder_id: guestInterest.claimed_by_profile_id,
    status: "active",
    notes,
    source: "offer",
    structured_terms: `${offer.offer_action} for ${offer.request_action}`,
    duration_terms: offer.duration,
    evidence_rule: offer.verification,
    privacy_scope: "Agreement participants can see this room. Broader publication waits for reviewed completion.",
    disclosure_scope: "Share only the details needed to verify this agreement and resolve disputes.",
    completion_state: "pending_evidence",
  });

  if (agreementError) {
    logSupabaseActionError("Failed to create agreement after accepting guest response", agreementError, {
      offerId,
      guestInterestId,
      proposerId: viewer.authUser.id,
      responderId: guestInterest.claimed_by_profile_id,
    });
    redirectWithMessage(returnTo, "error", agreementError.message);
  }

  if (offer.mode === "offset") {
    const { data: offsetDetails, error: offsetError } = await supabase
      .from("donation_offset_offers")
      .select("*")
      .eq("offer_id", offerId)
      .maybeSingle();

    if (offsetError || !offsetDetails) {
      logSupabaseActionError(
        "Failed to load donation offset details during guest acceptance",
        offsetError,
        {
          offerId,
          guestInterestId,
        },
      );
      redirectWithMessage(
        returnTo,
        "error",
        offsetError?.message ?? "Donation offset details were missing for this offer.",
      );
    }

    if (offsetDetails.participation_mode === "pool") {
      redirectWithMessage(
        returnTo,
        "error",
        "Pool commitments are aggregated through the pool itself. Join the pool instead of accepting it one-to-one.",
      );
    }

    const preview = calculateDonationOffsetPreview({
      baselineAmountUsd: offsetDetails.baseline_amount_cents / 100,
      requestedMatchingAmountUsd: offsetDetails.requested_matching_amount_cents / 100,
      offsetRatio: offsetDetails.offset_ratio,
      unmatchedSurplusRule: offsetDetails.unmatched_surplus_rule,
    });

    const matchInsert: DonationOffsetMatchInsert = {
      offer_id: offerId,
      guest_interest_id: guestInterestId,
      owner_profile_id: viewer.authUser.id,
      counterparty_profile_id: guestInterest.claimed_by_profile_id,
      counterparty_email: guestInterest.contact_email,
      matched_baseline_cents: convertUsdToCents(preview.matchedBaselineUsd),
      matched_counterparty_cents: convertUsdToCents(preview.matchedCounterpartyUsd),
      compromise_total_cents: convertUsdToCents(preview.compromiseTotalUsd),
      unmatched_baseline_cents: convertUsdToCents(preview.unmatchedBaselineUsd),
      unmatched_counterparty_cents: convertUsdToCents(preview.unmatchedCounterpartyUsd),
      status: "completed",
      owner_evidence_url: offsetDetails.evidence_url,
      compromise_evidence_url: offsetDetails.evidence_url,
    };

    const { error: matchError } = await supabase.from("donation_offset_matches").insert(matchInsert);

    if (matchError) {
      logSupabaseActionError("Failed to record guest donation offset match", matchError, {
        offerId,
        guestInterestId,
      });
      redirectWithMessage(returnTo, "error", matchError.message);
    }
  }

  await queueEmailOutbox({
    profileId: viewer.authUser.id,
    recipientEmail: guestInterest.contact_email,
    subject: "Your Moral Trade response was accepted",
    body: `An agreement was created for ${offer.offered_cause} for ${offer.requested_cause}. Sign in with the same email to manage the agreement.`,
  });

  const { error: offerUpdateError } = await supabase
    .from("offers")
    .update({
      status: "matched",
    })
    .eq("id", offerId);

  if (offerUpdateError) {
    logSupabaseActionError("Failed to mark offer as matched after guest response acceptance", offerUpdateError, {
      offerId,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(
    returnTo,
    "message",
    "Guest response accepted. The linked account was used to create a formal agreement.",
  );
}

export async function rateAgreementAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const ratedUserId = readRequired(formData, "rated_user_id");
  const score = Math.max(1, Math.min(10, Number(readRequired(formData, "score")) || 0));
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!agreementId || !ratedUserId || !score) {
    redirectWithMessage(returnTo, "error", "Agreement rating is incomplete.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (agreementError || !agreement) {
    redirectWithMessage(returnTo, "error", agreementError?.message ?? "Agreement not found.");
  }

  const viewerIsParticipant =
    agreement.proposer_id === viewer.authUser.id || agreement.responder_id === viewer.authUser.id;

  if (!viewerIsParticipant) {
    redirectWithMessage(returnTo, "error", "You are not a participant in that agreement.");
  }

  const expectedCounterpartyId =
    agreement.proposer_id === viewer.authUser.id ? agreement.responder_id : agreement.proposer_id;

  if (ratedUserId !== expectedCounterpartyId) {
    redirectWithMessage(returnTo, "error", "You can only rate the other party to the agreement.");
  }

  const { error } = await supabase.from("agreement_ratings").upsert(
    {
      agreement_id: agreementId,
      rater_id: viewer.authUser.id,
      rated_user_id: ratedUserId,
      score,
    },
    {
      onConflict: "agreement_id,rater_id,rated_user_id",
    },
  );

  if (error) {
    logSupabaseActionError("Failed to record agreement rating", error, {
      agreementId,
      raterId: viewer.authUser.id,
      ratedUserId,
      score,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  const { data: ratings } = await supabase
    .from("agreement_ratings")
    .select("*")
    .eq("agreement_id", agreementId);

  if ((ratings?.length ?? 0) >= 2) {
    const { error: completeError } = await supabase
      .from("agreements")
      .update({
        status: "completed",
      })
      .eq("id", agreementId);

    if (completeError) {
      logSupabaseActionError("Failed to mark agreement as completed", completeError, {
        agreementId,
      });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/people");
  revalidatePath(`/people/${ratedUserId}`);
  redirectWithMessage(returnTo, "message", "Agreement rating recorded.");
}

function getPriorityFundServiceClient() {
  return createServiceClient() as any;
}

async function requirePriorityAssignment({
  cycleId,
  profileId,
  role,
  causeArea,
}: {
  cycleId: string;
  profileId: string;
  role: "specific_action_arbiter" | "cause_area_arbiter";
  causeArea?: string | null;
}) {
  const supabase = getPriorityFundServiceClient();
  let query = supabase
    .from("priority_correction_arbiter_assignments")
    .select("*")
    .eq("cycle_id", cycleId)
    .eq("profile_id", profileId)
    .eq("role", role)
    .eq("status", "active");

  if (role === "specific_action_arbiter") {
    query = query.eq("cause_area", causeArea ?? "");
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("You are not assigned to that Priority Correction Fund role.");
  }

  return data as {
    id: string;
    cycle_id: string;
    profile_id: string;
    role: "specific_action_arbiter" | "cause_area_arbiter";
    cause_area: string | null;
  };
}

export async function logImpactContributionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireViewer(returnTo);
  const supabase = getPriorityFundServiceClient();
  const contributionKind =
    readOptional(formData, "contribution_kind") === "money_equivalent"
      ? "money_equivalent"
      : "donation";
  const causeArea = readRequired(formData, "cause_area");
  const actionLabel = readOptional(formData, "action_label");
  const amountDollars = Number(readRequired(formData, "amount_dollars"));
  const occurredAt = readOptional(formData, "occurred_at");
  const evidenceUrl = readOptional(formData, "evidence_url");
  const evidenceNote = readOptional(formData, "evidence_note");
  const verificationStatus =
    readOptional(formData, "verification_status") === "verified"
      ? "verified"
      : readOptional(formData, "verification_status") === "imported"
        ? "imported"
        : "self_reported";

  if (!causeArea) {
    redirectWithMessage(returnTo, "error", "Choose a cause area for this contribution.");
  }

  if (!Number.isFinite(amountDollars) || amountDollars <= 0) {
    redirectWithMessage(returnTo, "error", "Contribution amount must be greater than zero.");
  }

  const amountCents = Math.round(amountDollars * 100);
  const occurredAtIso = occurredAt
    ? new Date(`${occurredAt}T12:00:00.000Z`).toISOString()
    : new Date().toISOString();

  const { error } = await supabase.from("impact_contributions").insert({
    profile_id: viewer.authUser.id,
    contribution_kind: contributionKind,
    cause_area: causeArea,
    action_label: actionLabel,
    amount_cents: amountCents,
    currency: "usd",
    occurred_at: occurredAtIso,
    evidence_url: evidenceUrl,
    evidence_note: evidenceNote,
    verification_status: verificationStatus,
    source_label: "manual_dashboard_entry",
  });

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/priority-correction-fund");
  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Contribution logged.");
}

export async function publishPriorityCorrectionCycleAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireAdminViewer(returnTo);

  try {
    await publishPriorityCorrectionCycleForMonth({
      actingProfileId: viewer.authUser.id,
      cycleMonth: readOptional(formData, "cycle_month") || null,
    });
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to publish the Priority Correction Fund cycle.",
    );
  }

  revalidatePath("/priority-correction-fund");
  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Priority Correction Fund cycle published.");
}

export async function finalizePriorityCorrectionCycleAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  await requireAdminViewer(returnTo);
  const cycleId = readRequired(formData, "cycle_id");

  if (!cycleId) {
    redirectWithMessage(returnTo, "error", "Priority Correction Fund cycle id is missing.");
  }

  try {
    const result = await finalizePriorityCorrectionCycle(cycleId);

    revalidatePath("/priority-correction-fund");
    revalidatePath("/dashboard");
    redirectWithMessage(
      returnTo,
      "message",
      result.status === "reserved"
        ? "This month’s fund was reserved and carried forward."
        : "Priority Correction Fund cycle finalized.",
    );
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to finalize the Priority Correction Fund cycle.",
    );
  }
}

export async function submitPrioritySpecificActionReasoningAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireViewer(returnTo);
  const supabase = getPriorityFundServiceClient();
  const cycleId = readRequired(formData, "cycle_id");
  const causeArea = readRequired(formData, "cause_area");
  const title = readRequired(formData, "title");
  const combinationSummary = readRequired(formData, "combination_summary");
  const allocationSchedule = parseStructuredLines(readOptional(formData, "allocation_schedule"));
  const effectSchedule = parseStructuredLines(readOptional(formData, "effect_schedule"));
  const reasoning = readRequired(formData, "reasoning");

  if (!cycleId || !causeArea || !title || !combinationSummary || !reasoning) {
    redirectWithMessage(returnTo, "error", "Specific-action reasoning is incomplete.");
  }

  try {
    await requirePriorityAssignment({
      cycleId,
      profileId: viewer.authUser.id,
      role: "specific_action_arbiter",
      causeArea,
    });
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Assignment required.");
  }

  const { data: previousSubmissions, error: previousError } = await supabase
    .from("priority_specific_action_submissions")
    .select("id,version")
    .eq("cycle_id", cycleId)
    .eq("cause_area", causeArea)
    .order("version", { ascending: false });

  if (previousError) {
    redirectWithMessage(returnTo, "error", previousError.message);
  }

  const nextVersion = (((previousSubmissions ?? []) as Array<{ version: number }>)[0]?.version ?? 0) + 1;

  if ((previousSubmissions ?? []).length) {
    const { error: supersedeError } = await supabase
      .from("priority_specific_action_submissions")
      .update({
        status: "superseded",
      })
      .eq("cycle_id", cycleId)
      .eq("cause_area", causeArea)
      .neq("status", "excluded");

    if (supersedeError) {
      redirectWithMessage(returnTo, "error", supersedeError.message);
    }
  }

  const { error } = await supabase.from("priority_specific_action_submissions").insert({
    cycle_id: cycleId,
    cause_area: causeArea,
    version: nextVersion,
    submitted_by: viewer.authUser.id,
    title,
    combination_summary: combinationSummary,
    allocation_schedule: allocationSchedule,
    effect_schedule: effectSchedule,
    reasoning,
    status: "draft",
  });

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/priority-correction-fund");
  redirectWithMessage(returnTo, "message", "Specific-action reasoning draft submitted.");
}

export async function recordPrioritySpecificActionPositionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireViewer(returnTo);
  const supabase = getPriorityFundServiceClient();
  const cycleId = readRequired(formData, "cycle_id");
  const causeArea = readRequired(formData, "cause_area");
  const submissionId = readRequired(formData, "submission_id");
  const stance = readOptional(formData, "stance") === "dissent" ? "dissent" : "agree";
  const note = readOptional(formData, "note");

  if (!submissionId || !cycleId || !causeArea) {
    redirectWithMessage(returnTo, "error", "Specific-action arbiter response is incomplete.");
  }

  let assignmentId = "";

  try {
    const assignment = await requirePriorityAssignment({
      cycleId,
      profileId: viewer.authUser.id,
      role: "specific_action_arbiter",
      causeArea,
    });
    assignmentId = assignment.id;
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Assignment required.");
  }

  const { error } = await supabase.from("priority_specific_action_positions").upsert(
    {
      submission_id: submissionId,
      arbiter_assignment_id: assignmentId,
      stance,
      note,
    },
    {
      onConflict: "submission_id,arbiter_assignment_id",
    },
  );

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  const { data: positions, error: positionsError } = await supabase
    .from("priority_specific_action_positions")
    .select("stance")
    .eq("submission_id", submissionId);

  if (positionsError) {
    redirectWithMessage(returnTo, "error", positionsError.message);
  }

  const agreeCount = ((positions ?? []) as Array<{ stance: "agree" | "dissent" }>).filter(
    (position) => position.stance === "agree",
  ).length;

  if (agreeCount >= 3) {
    const { error: publishError } = await supabase
      .from("priority_specific_action_submissions")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (publishError) {
      redirectWithMessage(returnTo, "error", publishError.message);
    }
  }

  revalidatePath("/priority-correction-fund");
  redirectWithMessage(returnTo, "message", "Specific-action arbiter position recorded.");
}

export async function recordPrioritySpecificActionFeedbackAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireViewer(returnTo);
  const supabase = getPriorityFundServiceClient();
  const submissionId = readRequired(formData, "submission_id");
  const cycleId = readRequired(formData, "cycle_id");
  const causeArea = readRequired(formData, "cause_area");
  const stance =
    readOptional(formData, "stance") === "agree_with_dissent"
      ? "agree_with_dissent"
      : "object";

  if (!submissionId || !cycleId || !causeArea) {
    redirectWithMessage(returnTo, "error", "Specific-action feedback is incomplete.");
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from("priority_correction_member_snapshots")
    .select("prioritized_cause_area")
    .eq("cycle_id", cycleId)
    .eq("profile_id", viewer.authUser.id)
    .maybeSingle();

  if (snapshotError) {
    redirectWithMessage(returnTo, "error", snapshotError.message);
  }

  if (!snapshot || snapshot.prioritized_cause_area !== causeArea) {
    redirectWithMessage(
      returnTo,
      "error",
      "Only members who currently prioritize this cause area can file feedback here.",
    );
  }

  const { error } = await supabase.from("priority_specific_action_feedback").upsert(
    {
      submission_id: submissionId,
      profile_id: viewer.authUser.id,
      stance,
    },
    {
      onConflict: "submission_id,profile_id",
    },
  );

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  const [{ data: feedbackRows, error: feedbackError }, { count, error: countError }] =
    await Promise.all([
      supabase
        .from("priority_specific_action_feedback")
        .select("profile_id", { count: "exact" })
        .eq("submission_id", submissionId),
      supabase
        .from("priority_correction_member_snapshots")
        .select("profile_id", { count: "exact", head: true })
        .eq("cycle_id", cycleId)
        .eq("prioritized_cause_area", causeArea),
    ]);

  if (feedbackError || countError) {
    redirectWithMessage(
      returnTo,
      "error",
      feedbackError?.message ?? countError?.message ?? "Unable to evaluate feedback threshold.",
    );
  }

  const eligibleCount = count ?? 0;
  const feedbackCount = (feedbackRows ?? []).length;

  if (eligibleCount > 0 && feedbackCount / eligibleCount >= 0.2) {
    const { error: reconsiderError } = await supabase
      .from("priority_specific_action_submissions")
      .update({
        status: "reconsideration_requested",
      })
      .eq("id", submissionId);

    if (reconsiderError) {
      redirectWithMessage(returnTo, "error", reconsiderError.message);
    }
  }

  revalidatePath("/priority-correction-fund");
  redirectWithMessage(returnTo, "message", "Specific-action feedback recorded.");
}

export async function submitPriorityCauseAreaAllocationAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireViewer(returnTo);
  const supabase = getPriorityFundServiceClient();
  const cycleId = readRequired(formData, "cycle_id");
  const allocationSchedule = parseStructuredLines(readOptional(formData, "allocation_schedule"));
  const expectedImpact = readRequired(formData, "expected_impact");
  const reasoning = readRequired(formData, "reasoning");

  if (!cycleId || !allocationSchedule.length || !expectedImpact || !reasoning) {
    redirectWithMessage(returnTo, "error", "Cause-area allocation reasoning is incomplete.");
  }

  try {
    await requirePriorityAssignment({
      cycleId,
      profileId: viewer.authUser.id,
      role: "cause_area_arbiter",
    });
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Assignment required.");
  }

  const { data: previousRows, error: previousError } = await supabase
    .from("priority_cause_area_allocations")
    .select("id,version")
    .eq("cycle_id", cycleId)
    .order("version", { ascending: false });

  if (previousError) {
    redirectWithMessage(returnTo, "error", previousError.message);
  }

  const nextVersion = (((previousRows ?? []) as Array<{ version: number }>)[0]?.version ?? 0) + 1;

  if ((previousRows ?? []).length) {
    const { error: supersedeError } = await supabase
      .from("priority_cause_area_allocations")
      .update({
        status: "superseded",
      })
      .eq("cycle_id", cycleId);

    if (supersedeError) {
      redirectWithMessage(returnTo, "error", supersedeError.message);
    }
  }

  const { error } = await supabase.from("priority_cause_area_allocations").insert({
    cycle_id: cycleId,
    version: nextVersion,
    submitted_by: viewer.authUser.id,
    allocation_schedule: allocationSchedule,
    expected_impact: expectedImpact,
    reasoning,
    status: "draft",
  });

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/priority-correction-fund");
  redirectWithMessage(returnTo, "message", "Cause-area allocation draft submitted.");
}

export async function recordPriorityCauseAreaPositionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireViewer(returnTo);
  const supabase = getPriorityFundServiceClient();
  const cycleId = readRequired(formData, "cycle_id");
  const allocationId = readRequired(formData, "allocation_id");
  const stance = readOptional(formData, "stance") === "dissent" ? "dissent" : "agree";
  const note = readOptional(formData, "note");

  if (!cycleId || !allocationId) {
    redirectWithMessage(returnTo, "error", "Cause-area arbiter response is incomplete.");
  }

  let assignmentId = "";

  try {
    const assignment = await requirePriorityAssignment({
      cycleId,
      profileId: viewer.authUser.id,
      role: "cause_area_arbiter",
    });
    assignmentId = assignment.id;
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Assignment required.");
  }

  const { error } = await supabase.from("priority_cause_area_positions").upsert(
    {
      allocation_id: allocationId,
      arbiter_assignment_id: assignmentId,
      stance,
      note,
    },
    {
      onConflict: "allocation_id,arbiter_assignment_id",
    },
  );

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  const { data: positions, error: positionsError } = await supabase
    .from("priority_cause_area_positions")
    .select("stance")
    .eq("allocation_id", allocationId);

  if (positionsError) {
    redirectWithMessage(returnTo, "error", positionsError.message);
  }

  const agreeCount = ((positions ?? []) as Array<{ stance: "agree" | "dissent" }>).filter(
    (position) => position.stance === "agree",
  ).length;

  if (agreeCount >= 4) {
    const { error: publishError } = await supabase
      .from("priority_cause_area_allocations")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", allocationId);

    if (publishError) {
      redirectWithMessage(returnTo, "error", publishError.message);
    }
  }

  revalidatePath("/priority-correction-fund");
  redirectWithMessage(returnTo, "message", "Cause-area arbiter position recorded.");
}

export async function recordPriorityCauseAreaFeedbackAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireViewer(returnTo);
  const supabase = getPriorityFundServiceClient();
  const allocationId = readRequired(formData, "allocation_id");
  const cycleId = readRequired(formData, "cycle_id");
  const stance =
    readOptional(formData, "stance") === "agree_with_dissent"
      ? "agree_with_dissent"
      : "object";

  if (!allocationId || !cycleId) {
    redirectWithMessage(returnTo, "error", "Cause-area allocation feedback is incomplete.");
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from("priority_correction_member_snapshots")
    .select("prioritized_cause_area")
    .eq("cycle_id", cycleId)
    .eq("profile_id", viewer.authUser.id)
    .maybeSingle();

  if (snapshotError) {
    redirectWithMessage(returnTo, "error", snapshotError.message);
  }

  if (!snapshot?.prioritized_cause_area) {
    redirectWithMessage(
      returnTo,
      "error",
      "Only members with a recorded prioritized cause area can file community feedback here.",
    );
  }

  const { error } = await supabase.from("priority_cause_area_feedback").upsert(
    {
      allocation_id: allocationId,
      profile_id: viewer.authUser.id,
      stance,
    },
    {
      onConflict: "allocation_id,profile_id",
    },
  );

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  const [{ data: feedbackRows, error: feedbackError }, { count, error: countError }] =
    await Promise.all([
      supabase
        .from("priority_cause_area_feedback")
        .select("profile_id")
        .eq("allocation_id", allocationId),
      supabase
        .from("priority_correction_member_snapshots")
        .select("profile_id", { count: "exact", head: true })
        .eq("cycle_id", cycleId)
        .not("prioritized_cause_area", "is", null),
    ]);

  if (feedbackError || countError) {
    redirectWithMessage(
      returnTo,
      "error",
      feedbackError?.message ?? countError?.message ?? "Unable to evaluate community feedback.",
    );
  }

  const communityEligibleCount = count ?? 0;
  const feedbackCount = (feedbackRows ?? []).length;

  if (communityEligibleCount > 0 && feedbackCount / communityEligibleCount >= 0.4) {
    const { error: reconsiderError } = await supabase
      .from("priority_cause_area_allocations")
      .update({
        status: "reconsideration_requested",
      })
      .eq("id", allocationId);

    if (reconsiderError) {
      redirectWithMessage(returnTo, "error", reconsiderError.message);
    }
  }

  revalidatePath("/priority-correction-fund");
  redirectWithMessage(returnTo, "message", "Community feedback recorded.");
}
