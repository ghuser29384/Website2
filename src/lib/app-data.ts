import { isAuthSessionMissingError, type User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import {
  calculateDonationOffsetPoolProgress,
  type DonationOffsetPoolProgress,
} from "@/lib/donation-offsets";
import {
  BACKGROUND_PROFILE_INTERVIEW_SENSITIVE_TEXT_FIELDS,
  BACKGROUND_SOURCE_SUMMARY_SENSITIVE_TEXT_FIELDS,
  PROFILE_SOURCE_SENSITIVE_TEXT_FIELDS,
  PROFILE_SYNTHESIS_SENSITIVE_TEXT_FIELDS,
  SOURCE_CONNECTION_SENSITIVE_TEXT_FIELDS,
  WISH_PROFILE_SENSITIVE_TEXT_FIELDS,
  overlayBackgroundRecordSensitiveText,
  overlayEncryptedWishEntryBody,
} from "@/lib/background-field-encryption";
import {
  serializeOpportunityBriefCard,
  type BackgroundRequesterOpportunityBriefCard,
} from "@/lib/background-opportunity-briefs";
import {
  AUTH_RESOLUTION_TIMEOUT_MS,
  resolveAuthUserWithDeadline,
} from "@/lib/auth-resolution";
import { isMissingOptionalLegacyAgreementRelation } from "@/lib/optional-legacy-agreement-relations";
import {
  chunkForPostgrestIn,
  PUBLIC_PROFILE_OFFERS_PAGE_SIZE,
} from "@/lib/public-profile-offers";
import type { Database } from "@/lib/supabase/database.types";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
type RegisteredCharityRow = Database["public"]["Tables"]["registered_charities"]["Row"];
type DonationOffsetPoolRow = Database["public"]["Tables"]["donation_offset_pools"]["Row"];
type DonationOffsetOfferRow = Database["public"]["Tables"]["donation_offset_offers"]["Row"];
type DonationOffsetMatchRow = Database["public"]["Tables"]["donation_offset_matches"]["Row"];
type InterestRow = Database["public"]["Tables"]["interests"]["Row"];
type GuestInterestRow = Database["public"]["Tables"]["guest_interests"]["Row"];
type AgreementRow = Database["public"]["Tables"]["agreements"]["Row"];
type AgreementRatingRow = Database["public"]["Tables"]["agreement_ratings"]["Row"];
type ProfilePaymentAccountRow = Database["public"]["Tables"]["profile_payment_accounts"]["Row"];
type AgreementPaymentRow = Database["public"]["Tables"]["agreement_payments"]["Row"];
type AgreementPaymentScheduleRow = Database["public"]["Tables"]["agreement_payment_schedules"]["Row"];
type AgreementEventRow = Database["public"]["Tables"]["agreement_events"]["Row"];
type AgreementEvidenceItemRow = Database["public"]["Tables"]["agreement_evidence_items"]["Row"];
type AgreementReviewCaseRow = Database["public"]["Tables"]["agreement_review_cases"]["Row"];
type PerformanceBondRow = Database["public"]["Tables"]["performance_bonds"]["Row"];
type BondEvidenceRow = Database["public"]["Tables"]["bond_evidence"]["Row"];
type BondChallengeRow = Database["public"]["Tables"]["bond_challenges"]["Row"];
type BondAdjudicationRow = Database["public"]["Tables"]["bond_adjudications"]["Row"];
type BondLedgerEntryRow = Database["public"]["Tables"]["bond_ledger_entries"]["Row"];
type PerformanceBondAuditEventRow =
  Database["public"]["Tables"]["performance_bond_audit_events"]["Row"];
type ProfileVerificationBadgeRow =
  Database["public"]["Tables"]["profile_verification_badges"]["Row"];
type SavedSearchRow = Database["public"]["Tables"]["saved_searches"]["Row"];
type UserFollowRow = Database["public"]["Tables"]["user_follows"]["Row"];
type OfferRecommendationRow = Database["public"]["Tables"]["offer_recommendations"]["Row"];
type OfferCommentRow = Database["public"]["Tables"]["offer_comments"]["Row"];
type CommentVoteRow = Database["public"]["Tables"]["comment_votes"]["Row"];
type OfferCartRow = Database["public"]["Tables"]["offer_carts"]["Row"];
type WishProfileRow = Database["public"]["Tables"]["wish_profiles"]["Row"];
type WishEntryRow = Database["public"]["Tables"]["wish_entries"]["Row"];
type WishProfilePreviewRow = Database["public"]["Views"]["wish_profile_previews"]["Row"];
type MatchSuggestionPreviewRow = Database["public"]["Views"]["match_suggestion_previews"]["Row"];
type WishNotificationRow = Database["public"]["Tables"]["wish_notifications"]["Row"];
type ProfileSourceRow = Database["public"]["Tables"]["profile_sources"]["Row"];
type ClarificationQuestionRow = Database["public"]["Tables"]["clarification_questions"]["Row"];
type BackgroundMatchRunRow = Database["public"]["Tables"]["background_match_runs"]["Row"];
type MatchExplanationSnapshotRow =
  Database["public"]["Tables"]["match_explanation_snapshots"]["Row"];
type BackgroundIntroPacketRow =
  Database["public"]["Tables"]["background_intro_packets"]["Row"];
type BackgroundSourceSummaryRow =
  Database["public"]["Tables"]["background_source_summaries"]["Row"];
type BackgroundProfileSignalRow =
  Database["public"]["Tables"]["background_profile_signals"]["Row"];
type BackgroundShadowRunRow =
  Database["public"]["Tables"]["background_shadow_runs"]["Row"];
type BackgroundGrantReceiptRow =
  Database["public"]["Tables"]["background_grant_receipts"]["Row"];
type BackgroundProfileInterviewAnswerRow =
  Database["public"]["Tables"]["background_profile_interview_answers"]["Row"];
type BackgroundCollectivePolicyRow =
  Database["public"]["Tables"]["background_collective_policies"]["Row"];
type BackgroundMuteRuleRow =
  Database["public"]["Tables"]["background_mute_rules"]["Row"];
type BackgroundQueryEventRow = Database["public"]["Tables"]["background_query_events"]["Row"];
type BackgroundNotificationPreferenceRow =
  Database["public"]["Tables"]["background_notification_preferences"]["Row"];
type ProfileDataRightRequestRow =
  Database["public"]["Tables"]["profile_data_right_requests"]["Row"];
type MatchReportRow = Database["public"]["Tables"]["match_reports"]["Row"];
type MatchConciergeRequestRow =
  Database["public"]["Tables"]["match_concierge_requests"]["Row"];
type NetworkInviteRow = Database["public"]["Tables"]["network_invites"]["Row"];
type PersonalDelegateRow = Database["public"]["Tables"]["personal_delegates"]["Row"];
type SourceConnectionRow = Database["public"]["Tables"]["source_connections"]["Row"];
type ProfileSynthesisRow = Database["public"]["Tables"]["profile_syntheses"]["Row"];
type BackgroundIntentClaimRow =
  Database["public"]["Tables"]["background_intent_claims"]["Row"];
type HelperStrategyRow = Database["public"]["Tables"]["helper_strategies"]["Row"];
type HelperRunRow = Database["public"]["Tables"]["helper_runs"]["Row"];
type MatchIntroductionPlanRow =
  Database["public"]["Tables"]["match_introduction_plans"]["Row"];
type MatchIntroductionTaskRow =
  Database["public"]["Tables"]["match_introduction_tasks"]["Row"];
type PrivacyGrantRow = Database["public"]["Tables"]["privacy_grants"]["Row"];
type PrivacyAccessRequestRow =
  Database["public"]["Tables"]["privacy_access_requests"]["Row"];
type RiskSignalRow = Database["public"]["Tables"]["risk_signals"]["Row"];
type BrokerageBountyRow = Database["public"]["Tables"]["brokerage_bounties"]["Row"];
type CollectiveRow = Database["public"]["Tables"]["collectives"]["Row"];
type CollectiveMemberRow = Database["public"]["Tables"]["collective_members"]["Row"];
type CollectiveDecisionRow = Database["public"]["Tables"]["collective_decisions"]["Row"];
type CollectiveDecisionResponseRow =
  Database["public"]["Tables"]["collective_decision_responses"]["Row"];
type InterestStatus = Database["public"]["Enums"]["interest_status"];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type PeopleSort = "reviewed" | "offers" | "newest";
export type PublicLocationGranularity = "hidden" | "country" | "region" | "city";
export const OFFERS_PAGE_SIZE = 24;
export const PEOPLE_PAGE_SIZE = 24;
export const DASHBOARD_PAGE_SIZE = 50;

interface LoggedErrorLike {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message: string;
}

export interface Viewer {
  authUser: User;
  profile: ProfileRow;
  displayName: string;
  profileStatus: "loaded" | "created" | "fallback";
  profileSyncError: string | null;
}

export interface PublicProfileSummary extends ProfileRow {
  resolvedName: string;
  followerCount: number;
  followingCount: number;
  karma: number;
  commentCount: number;
  rating: number | null;
  ratingCount: number;
  offerCount: number;
  isFollowedByViewer: boolean;
  wishPreview: string | null;
  wishCauses: string[];
  wishLocation: string | null;
  wishOpenToPayment: boolean;
  wishOpenToPledges: boolean;
  wishParticipantKind: "individual" | "collective" | "institution" | null;
  wishCollectiveName: string | null;
  wishPrivacyStage: "strict" | "broad" | "limited" | null;
  verificationBadges: ProfileVerificationBadgeRow[];
}

export interface DonationOffsetPoolRecord extends DonationOffsetPoolRow {
  compromiseCharity: RegisteredCharityRow | null;
  commitmentCount: number;
  sideACommitmentCount: number;
  sideBCommitmentCount: number;
  sideATotalCents: number;
  sideBTotalCents: number;
  matchedCompromiseCents: number;
  progress: DonationOffsetPoolProgress;
}

export interface OfferRecord extends OfferRow {
  ownerProfile: PublicProfileSummary | null;
  recommendationCount: number;
  commentCount: number;
  isInCart: boolean;
  performanceBonds: PerformanceBondRow[];
  donationOffset: (DonationOffsetOfferRow & {
    compromiseCharity: RegisteredCharityRow | null;
    pool: DonationOffsetPoolRecord | null;
  }) | null;
}

export interface InterestRecord extends InterestRow {
  offer: OfferRecord | null;
  participantProfile: PublicProfileSummary | null;
}

export interface IncomingResponseRecord {
  id: string;
  kind: "member" | "guest";
  offer_id: string;
  offer: OfferRecord | null;
  status: InterestStatus;
  message: string;
  created_at: string;
  participantProfile: PublicProfileSummary | null;
  displayName: string;
  contactEmail: string | null;
  location: string | null;
  canCreateAgreement: boolean;
  memberInterestId: string | null;
  guestInterestId: string | null;
  performanceBond: PerformanceBondRow | null;
}

export interface AgreementRatingRecord extends AgreementRatingRow {
  rater: PublicProfileSummary | null;
  ratedUser: PublicProfileSummary | null;
}

export interface AgreementRecord extends AgreementRow {
  offer: OfferRecord | null;
  proposer: PublicProfileSummary | null;
  responder: PublicProfileSummary | null;
  counterparty: PublicProfileSummary | null;
  viewerRating: AgreementRatingRecord | null;
  payments: AgreementPaymentRow[];
  paymentSchedules: AgreementPaymentScheduleRow[];
  events: AgreementEventRow[];
  legacyEvidenceReviewAvailable: boolean;
  evidenceItems: AgreementEvidenceItemRow[];
  reviewCases: AgreementReviewCaseRow[];
  performanceBonds: PerformanceBondRow[];
  bondEvidence: BondEvidenceRow[];
  bondChallenges: BondChallengeRow[];
  bondAdjudications: BondAdjudicationRow[];
  bondLedgerEntries: BondLedgerEntryRow[];
  performanceBondAuditEvents: PerformanceBondAuditEventRow[];
}

export interface DonationOffsetMatchRecord extends DonationOffsetMatchRow {
  offer: OfferRecord | null;
}

export interface OfferRecommendationRecord extends OfferRecommendationRow {
  recommender: PublicProfileSummary | null;
  sourceOffer: OfferRecord | null;
  recommendedOffer: OfferRecord | null;
}

export interface OfferCommentNode extends OfferCommentRow {
  author: PublicProfileSummary | null;
  score: number;
  viewerVote: -1 | 1 | null;
  replies: OfferCommentNode[];
}

export interface CartItemRecord {
  addedAt: string;
  offer: OfferRecord | null;
}

export interface WishProfileRecord extends WishProfileRow {
  wishes: WishEntryRow[];
  offers: WishEntryRow[];
  asks: WishEntryRow[];
}

export interface MatchSuggestionRecord {
  id: string;
  counterpartyId: string | null;
  counterparty: PublicProfileSummary | null;
  counterpartyPreview: WishProfilePreviewRow | null;
  viewerReason: string;
  counterpartyReason: string;
  score: number;
  matchBasis: string[];
  sharedCauses: string[];
  suggestedFirstStep: string;
  riskNotes: string;
  generatedBy: string;
  status: "suggested" | "dismissed" | "introduced" | "archived";
  identityRevealed: boolean;
  viewerConsented: boolean;
  counterpartyConsented: boolean;
  canRevealIdentity: boolean;
  lastScoredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WishNotificationRecord extends WishNotificationRow {
  match: MatchSuggestionRecord | null;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface DashboardDataResult {
  offers: OfferRecord[];
  incomingInterests: IncomingResponseRecord[];
  interests: InterestRecord[];
  agreements: AgreementRecord[];
  cartItems: CartItemRecord[];
  wishProfile: WishProfileRecord | null;
  profileSources: ProfileSourceRow[];
  clarificationQuestions: ClarificationQuestionRow[];
  matchSuggestions: MatchSuggestionRecord[];
  wishNotifications: WishNotificationRecord[];
  backgroundRuns: BackgroundMatchRunRow[];
  matchExplanationSnapshots: MatchExplanationSnapshotRow[];
  opportunityBriefs: BackgroundRequesterOpportunityBriefCard[];
  introPackets: BackgroundIntroPacketRow[];
  sourceSummaries: BackgroundSourceSummaryRow[];
  profileSignals: BackgroundProfileSignalRow[];
  shadowRuns: BackgroundShadowRunRow[];
  grantReceipts: BackgroundGrantReceiptRow[];
  profileInterviewAnswers: BackgroundProfileInterviewAnswerRow[];
  collectivePolicies: BackgroundCollectivePolicyRow[];
  muteRules: BackgroundMuteRuleRow[];
  backgroundQueryEvents: BackgroundQueryEventRow[];
  backgroundNotificationPreferences: BackgroundNotificationPreferenceRow[];
  profileDataRightRequests: ProfileDataRightRequestRow[];
  matchReports: MatchReportRow[];
  matchConciergeRequests: MatchConciergeRequestRow[];
  networkInvites: NetworkInviteRow[];
  personalDelegate: PersonalDelegateRow | null;
  sourceConnections: SourceConnectionRow[];
  profileSynthesis: ProfileSynthesisRow | null;
  intentClaims: BackgroundIntentClaimRow[];
  helperStrategies: HelperStrategyRow[];
  helperRuns: HelperRunRow[];
  introductionPlans: MatchIntroductionPlanRow[];
  introductionTasks: MatchIntroductionTaskRow[];
  privacyGrants: PrivacyGrantRow[];
  privacyAccessRequests: PrivacyAccessRequestRow[];
  riskSignals: RiskSignalRow[];
  brokerageBounties: BrokerageBountyRow[];
  collectives: CollectiveRow[];
  collectiveMemberships: CollectiveMemberRow[];
  collectiveDecisions: CollectiveDecisionRow[];
  collectiveDecisionResponses: CollectiveDecisionResponseRow[];
  paymentAccount: ProfilePaymentAccountRow | null;
  savedSearches: SavedSearchRow[];
  errors: {
    offers: string | null;
    incomingInterests: string | null;
    interests: string | null;
    relatedOffers: string | null;
    agreements: string | null;
    cartItems: string | null;
    wishProfile: string | null;
    profileSources: string | null;
    clarificationQuestions: string | null;
    matchSuggestions: string | null;
    wishNotifications: string | null;
    backgroundRuns: string | null;
    matchExplanationSnapshots: string | null;
    opportunityBriefs: string | null;
    introPackets: string | null;
    sourceSummaries: string | null;
    profileSignals: string | null;
    shadowRuns: string | null;
    grantReceipts: string | null;
    profileInterviewAnswers: string | null;
    collectivePolicies: string | null;
    muteRules: string | null;
    backgroundQueryEvents: string | null;
    backgroundNotificationPreferences: string | null;
    profileDataRightRequests: string | null;
    matchReports: string | null;
    matchConciergeRequests: string | null;
    networkInvites: string | null;
    personalDelegate: string | null;
    sourceConnections: string | null;
    profileSynthesis: string | null;
    intentClaims: string | null;
    helperStrategies: string | null;
    helperRuns: string | null;
    introductionPlans: string | null;
    introductionTasks: string | null;
    privacyGrants: string | null;
    privacyAccessRequests: string | null;
    riskSignals: string | null;
    brokerageBounties: string | null;
    collectives: string | null;
    collectiveMemberships: string | null;
    collectiveDecisions: string | null;
    collectiveDecisionResponses: string | null;
    paymentAccount: string | null;
    savedSearches: string | null;
  };
}

export interface PublicProfilePageData {
  profile: PublicProfileSummary | null;
  offers: OfferRecord[];
  offersPage: PaginatedResult<OfferRecord>;
  profileRecommendations: OfferRecommendationRecord[];
  authoredCommentCount: number;
}

export interface OfferCartState {
  isInCart: boolean;
  cartCount: number | null;
}

export interface DonationOffsetOverview {
  totalRedirectedCents: number;
  completedMatchCount: number;
  pooledCommitmentCents: number;
  moralPublicGoodsRedirectedCents: number;
  moralPublicGoodsMatchCount: number;
  topCompromiseDestinations: Array<{
    charity: RegisteredCharityRow | null;
    totalRedirectedCents: number;
    matchCount: number;
  }>;
  pools: DonationOffsetPoolRecord[];
}

export interface MarketplaceOverview {
  hasLiveData: boolean;
  openOfferCount: number | null;
  publicProfileCount: number | null;
  completedAgreementCount: number | null;
  redirectedOffsetCents: number | null;
  pooledCommitmentCents: number | null;
}

function logSupabaseError(
  context: string,
  error: LoggedErrorLike,
  metadata: Record<string, string | number | boolean | null | undefined> = {},
) {
  console.error(`[supabase] ${context}`, {
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    message: error.message,
    ...metadata,
  });
}

function buildFallbackProfile(user: User, profile?: Partial<ProfileRow> | null) {
  const timestamp = new Date().toISOString();

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? `${user.id}@members.moraltrade.local`,
    display_name:
      profile?.display_name ??
      deriveDisplayName(
        user,
        profile ? { display_name: profile.display_name ?? null } : null,
    ),
    username: profile?.username ?? null,
    public_invitation_mentions_enabled:
      profile?.public_invitation_mentions_enabled ?? true,
    avatar_url: profile?.avatar_url ?? null,
    account_kind: profile?.account_kind ?? "individual",
    accepts_group_invitations: profile?.accepts_group_invitations ?? true,
    organization_approval_count: profile?.organization_approval_count ?? 1,
    affiliation: profile?.affiliation ?? "",
    city: profile?.city ?? null,
    region: profile?.region ?? null,
    country: profile?.country ?? null,
    public_location_granularity: normalizePublicLocationGranularity(
      profile?.public_location_granularity,
    ),
    bio: profile?.bio ?? "",
    follower_count: profile?.follower_count ?? 0,
    following_count: profile?.following_count ?? 0,
    karma: profile?.karma ?? 0,
    comment_count: profile?.comment_count ?? 0,
    rating_avg: profile?.rating_avg ?? null,
    rating_count: profile?.rating_count ?? 0,
    offer_count: profile?.offer_count ?? 0,
    created_at: profile?.created_at ?? timestamp,
  } satisfies ProfileRow;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function formatLocation(city?: string | null, region?: string | null) {
  const parts = [city?.trim(), region?.trim()].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function normalizePublicLocationGranularity(
  value?: string | null,
): PublicLocationGranularity {
  if (value === "country" || value === "region" || value === "city") {
    return value;
  }

  return "hidden";
}

export function formatPublicProfileLocation(
  profile: Pick<
    ProfileRow,
    "city" | "region" | "country" | "public_location_granularity"
  >,
) {
  const granularity = normalizePublicLocationGranularity(
    profile.public_location_granularity,
  );
  const city = profile.city?.trim();
  const region = profile.region?.trim();
  const country = profile.country?.trim();

  if (granularity === "city") {
    return [city, region, country].filter(Boolean).join(", ") || null;
  }

  if (granularity === "region") {
    return [region, country].filter(Boolean).join(", ") || null;
  }

  if (granularity === "country") {
    return country || null;
  }

  return null;
}

function getGuestInterestDisplayName(guestInterest: Pick<GuestInterestRow, "display_name" | "contact_email">) {
  const explicitName = guestInterest.display_name.trim();
  if (explicitName) {
    return explicitName;
  }

  const emailPrefix = normalizeEmail(guestInterest.contact_email).split("@")[0];
  return emailPrefix || "Guest respondent";
}

function normalizePage(page?: number) {
  if (!page || !Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.floor(page);
}

function buildPaginatedResult<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  return {
    items: items.slice(0, pageSize),
    page,
    pageSize,
    hasNextPage: items.length > pageSize,
    hasPreviousPage: page > 1,
  };
}

function incrementCount(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function buildDonationOffsetPoolMap({
  pools,
  poolOffers,
  offersById,
  charities,
}: {
  pools: DonationOffsetPoolRow[];
  poolOffers: DonationOffsetOfferRow[];
  offersById: Map<string, OfferRow>;
  charities: RegisteredCharityRow[];
}) {
  const charityMap = new Map(charities.map((row) => [row.id, row] as const));
  const entries = new Map<string, DonationOffsetPoolRecord>();

  for (const pool of pools) {
    entries.set(pool.id, {
      ...pool,
      compromiseCharity: charityMap.get(pool.compromise_charity_id) ?? null,
      commitmentCount: 0,
      sideACommitmentCount: 0,
      sideBCommitmentCount: 0,
      sideATotalCents: 0,
      sideBTotalCents: 0,
      matchedCompromiseCents: 0,
      progress: calculateDonationOffsetPoolProgress({
        sideATotalUsd: 0,
        sideBTotalUsd: 0,
        offsetRatio: pool.offset_ratio,
        assuranceMinimumUsd: pool.assurance_minimum_cents / 100,
        deadlineAt: pool.assurance_deadline_at,
      }),
    });
  }

  for (const poolOffer of poolOffers) {
    if (!poolOffer.pool_id) {
      continue;
    }

    const pool = entries.get(poolOffer.pool_id);
    const offer = offersById.get(poolOffer.offer_id);

    if (!pool || !offer || (offer.status !== "open" && offer.status !== "matched")) {
      continue;
    }

    const sideKey = poolOffer.pool_side === "side_b" ? "sideB" : "sideA";
    const baselineContribution = poolOffer.baseline_amount_cents;

    pool.commitmentCount += 1;

    if (sideKey === "sideA") {
      pool.sideACommitmentCount += 1;
      pool.sideATotalCents += baselineContribution;
    } else {
      pool.sideBCommitmentCount += 1;
      pool.sideBTotalCents += baselineContribution;
    }
  }

  for (const pool of entries.values()) {
    pool.progress = calculateDonationOffsetPoolProgress({
      sideATotalUsd: pool.sideATotalCents / 100,
      sideBTotalUsd: pool.sideBTotalCents / 100,
      offsetRatio: pool.offset_ratio,
      assuranceMinimumUsd: pool.assurance_minimum_cents / 100,
      deadlineAt: pool.assurance_deadline_at,
    });
    pool.matchedCompromiseCents = Math.round(pool.progress.matchedCompromiseUsd * 100);
  }

  return entries;
}

async function ensureUserProfile(
  supabase: SupabaseServerClient,
  user: User,
): Promise<{
  profile: ProfileRow;
  profileStatus: Viewer["profileStatus"];
  profileSyncError: string | null;
}> {
  const seedProfile = buildFallbackProfile(user);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logSupabaseError("Failed to read public.profiles row", profileError, {
      userId: user.id,
    });
  }

  if (profile) {
    return {
      profile: profile as ProfileRow,
      profileStatus: "loaded",
      profileSyncError: null,
    };
  }

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: seedProfile.id,
        email: seedProfile.email,
        display_name: seedProfile.display_name,
        city: seedProfile.city,
        region: seedProfile.region,
        country: seedProfile.country,
        public_location_granularity: seedProfile.public_location_granularity,
        bio: seedProfile.bio,
      },
      {
        onConflict: "id",
      },
    )
    .select("*")
    .maybeSingle();

  if (insertError) {
    logSupabaseError("Failed to create missing public.profiles row", insertError, {
      userId: user.id,
    });

    return {
      profile: seedProfile,
      profileStatus: "fallback",
      profileSyncError:
        insertError.message ||
        profileError?.message ||
        "Unable to synchronize your account profile to Supabase.",
    };
  }

  if (!insertedProfile) {
    console.error("[supabase] public.profiles upsert returned no profile row", {
      userId: user.id,
    });

    return {
      profile: seedProfile,
      profileStatus: "fallback",
      profileSyncError:
        profileError?.message ?? "Unable to confirm your account profile in Supabase.",
    };
  }

  return {
    profile: insertedProfile as ProfileRow,
    profileStatus: "created",
    profileSyncError: null,
  };
}

async function getProfileSummaryMap(
  viewerId: string | null | undefined,
  profileIds: string[],
): Promise<Map<string, PublicProfileSummary>> {
  if (!hasSupabaseEnv()) {
    return new Map();
  }

  const uniqueProfileIds = [...new Set(profileIds)];
  if (!uniqueProfileIds.length) {
    return new Map();
  }

  const supabase = await createClient();
  const [
    { data: publicProfiles, error: profilesError },
    selfProfileResult,
    followsResult,
    previewResult,
    badgesResult,
  ] = await Promise.all([
    (supabase as any)
      .from("public_profile_cards_v1")
      .select("*")
      .in("id", uniqueProfileIds),
    viewerId && uniqueProfileIds.includes(viewerId)
      ? supabase.from("profiles").select("*").eq("id", viewerId).maybeSingle()
      : Promise.resolve({ data: null as ProfileRow | null, error: null }),
    viewerId
      ? supabase
          .from("user_follows")
          .select("followed_id")
          .eq("follower_id", viewerId)
          .in("followed_id", uniqueProfileIds)
      : Promise.resolve({ data: [] as Pick<UserFollowRow, "followed_id">[], error: null }),
    supabase.from("wish_profile_previews").select("*").in("profile_id", uniqueProfileIds),
    supabase
      .from("profile_verification_badges")
      .select("*")
      .in("profile_id", uniqueProfileIds)
      .eq("status", "verified"),
  ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }
  if (selfProfileResult.error) {
    throw new Error(selfProfileResult.error.message);
  }
  if (followsResult.error) {
    throw new Error(followsResult.error.message);
  }

  const viewerFollowing = new Set((followsResult.data ?? []).map((row) => row.followed_id));
  const previewMap = new Map<string, WishProfilePreviewRow>();
  const badgesByProfileId = new Map<string, ProfileVerificationBadgeRow[]>();

  if (previewResult.error) {
    logSupabaseError("Failed to load public wish profile previews", previewResult.error);
  } else {
    for (const preview of (previewResult.data ?? []) as WishProfilePreviewRow[]) {
      previewMap.set(preview.profile_id, preview);
    }
  }

  if (badgesResult.error) {
    logSupabaseError("Failed to load profile verification badges", badgesResult.error);
  } else {
    for (const badge of (badgesResult.data ?? []) as ProfileVerificationBadgeRow[]) {
      const bucket = badgesByProfileId.get(badge.profile_id) ?? [];
      bucket.push(badge);
      badgesByProfileId.set(badge.profile_id, bucket);
    }
  }

  const selfProfile = selfProfileResult.data as ProfileRow | null;
  const profiles = ((publicProfiles ?? []) as Array<Omit<ProfileRow, "email">>).map(
    (profile) =>
      selfProfile?.id === profile.id
        ? selfProfile
        : ({ ...profile, email: "" } satisfies ProfileRow),
  );

  return new Map(
    profiles.map((profile) => {
      const preview = previewMap.get(profile.id);

      return [
        profile.id,
        {
          ...profile,
          resolvedName: deriveDisplayName(
            { email: profile.email, user_metadata: { display_name: profile.display_name ?? undefined } },
            profile,
          ),
          followerCount: profile.follower_count,
          followingCount: profile.following_count,
          karma: profile.karma,
          commentCount: profile.comment_count,
          rating: profile.rating_count ? profile.rating_avg : null,
          ratingCount: profile.rating_count,
          offerCount: profile.offer_count,
          isFollowedByViewer: viewerFollowing.has(profile.id),
          wishPreview: preview?.public_preview || null,
          wishCauses: preview?.causes ?? [],
          wishLocation: preview
            ? formatLocation(preview.location_city, preview.location_region)
            : null,
          wishOpenToPayment: preview?.openness_to_payment ?? false,
          wishOpenToPledges: preview?.openness_to_pledges ?? false,
          wishParticipantKind: preview?.participant_kind ?? null,
          wishCollectiveName: preview?.collective_name || null,
          wishPrivacyStage: preview?.privacy_stage ?? null,
          verificationBadges: badgesByProfileId.get(profile.id) ?? [],
        } satisfies PublicProfileSummary,
      ];
    }),
  );
}

export async function getPublicProfileSummary(
  profileId: string,
  viewerId?: string | null,
) {
  const profileMap = await getProfileSummaryMap(viewerId, [profileId]);
  return profileMap.get(profileId) ?? null;
}

async function hydrateOffers(
  offers: OfferRow[],
  viewerId?: string | null,
): Promise<OfferRecord[]> {
  const hydrated: OfferRecord[] = [];
  for (const offerChunk of chunkForPostgrestIn(offers)) {
    hydrated.push(...(await hydrateOffersChunk(offerChunk, viewerId)));
  }
  return hydrated;
}

async function hydrateOffersChunk(
  offers: OfferRow[],
  viewerId?: string | null,
): Promise<OfferRecord[]> {
  if (!offers.length) {
    return [];
  }

  const supabase = await createClient();
  const offerIds = offers.map((offer) => offer.id);
  const ownerIds = [...new Set(offers.map((offer) => offer.owner_id))];
  const [
    profileMap,
    { data: recommendations, error: recommendationsError },
    { data: comments, error: commentsError },
    cartResult,
    { data: offsetOffers, error: offsetOffersError },
    { data: offsetPools, error: offsetPoolsError },
    { data: charities, error: charitiesError },
    { data: performanceBonds, error: performanceBondsError },
  ] =
    await Promise.all([
      getProfileSummaryMap(viewerId, ownerIds),
      supabase.from("offer_recommendations").select("*").in("recommended_offer_id", offerIds),
      supabase.from("offer_comments").select("*").in("offer_id", offerIds),
      viewerId
        ? supabase.from("offer_carts").select("*").eq("user_id", viewerId).in("offer_id", offerIds)
        : Promise.resolve({ data: [] as OfferCartRow[], error: null }),
      supabase.from("donation_offset_offers").select("*").in("offer_id", offerIds),
      supabase.from("donation_offset_pools").select("*"),
      supabase.from("registered_charities").select("*"),
      supabase.from("performance_bonds").select("*").in("offer_id", offerIds),
    ]);

  if (recommendationsError) {
    throw new Error(recommendationsError.message);
  }
  if (commentsError) {
    throw new Error(commentsError.message);
  }
  if (cartResult.error) {
    throw new Error(cartResult.error.message);
  }
  if (offsetOffersError) {
    throw new Error(offsetOffersError.message);
  }
  if (offsetPoolsError) {
    throw new Error(offsetPoolsError.message);
  }
  if (charitiesError) {
    throw new Error(charitiesError.message);
  }
  if (performanceBondsError) {
    throw new Error(performanceBondsError.message);
  }

  const recommendationCounts = new Map<string, number>();
  for (const row of (recommendations ?? []) as OfferRecommendationRow[]) {
    incrementCount(recommendationCounts, row.recommended_offer_id);
  }

  const commentCounts = new Map<string, number>();
  for (const row of (comments ?? []) as OfferCommentRow[]) {
    incrementCount(commentCounts, row.offer_id);
  }

  const cartSet = new Set(
    ((cartResult.data ?? []) as OfferCartRow[]).map((row) => row.offer_id),
  );
  const charityRows = (charities ?? []) as RegisteredCharityRow[];
  const charityMap = new Map(charityRows.map((row) => [row.id, row] as const));
  const poolMap = buildDonationOffsetPoolMap({
    pools: (offsetPools ?? []) as DonationOffsetPoolRow[],
    poolOffers: (offsetOffers ?? []) as DonationOffsetOfferRow[],
    offersById: new Map(offers.map((offer) => [offer.id, offer] as const)),
    charities: charityRows,
  });
  const offsetOfferMap = new Map<
    string,
    DonationOffsetOfferRow & {
      compromiseCharity: RegisteredCharityRow | null;
      pool: DonationOffsetPoolRecord | null;
    }
  >();
  const performanceBondsByOffer = new Map<string, PerformanceBondRow[]>();

  for (const row of (offsetOffers ?? []) as DonationOffsetOfferRow[]) {
    offsetOfferMap.set(row.offer_id, {
      ...row,
      compromiseCharity: charityMap.get(row.compromise_charity_id) ?? null,
      pool: row.pool_id ? poolMap.get(row.pool_id) ?? null : null,
    });
  }

  for (const row of (performanceBonds ?? []) as PerformanceBondRow[]) {
    const bucket = performanceBondsByOffer.get(row.offer_id) ?? [];
    bucket.push(row);
    performanceBondsByOffer.set(row.offer_id, bucket);
  }

  return offers.map((offer) => ({
    ...offer,
    ownerProfile: profileMap.get(offer.owner_id) ?? null,
    recommendationCount: recommendationCounts.get(offer.id) ?? 0,
    commentCount: commentCounts.get(offer.id) ?? 0,
    isInCart: cartSet.has(offer.id),
    performanceBonds: performanceBondsByOffer.get(offer.id) ?? [],
    donationOffset: offsetOfferMap.get(offer.id) ?? null,
  }));
}

async function claimGuestInterestsForUser(user: User, supabase: SupabaseServerClient) {
  const email = user.email ? normalizeEmail(user.email) : "";

  if (!email) {
    return;
  }

  const { error } = await supabase
    .from("guest_interests")
    .update({
      claimed_by_profile_id: user.id,
    })
    .is("claimed_by_profile_id", null)
    .ilike("contact_email", email);

  if (error) {
    logSupabaseError("Failed to claim guest interests for authenticated user", error, {
      userId: user.id,
      email,
    });
  }
}

export async function ensureProfileForUser(
  user: User,
  supabaseClient?: SupabaseServerClient,
) {
  const supabase = supabaseClient ?? (await createClient());
  return ensureUserProfile(supabase, user);
}

export async function ensureAccountRowsForUser(
  user: User,
  supabaseClient?: SupabaseServerClient,
) {
  const supabase = supabaseClient ?? (await createClient());
  const profileResult = await ensureUserProfile(supabase, user);
  await claimGuestInterestsForUser(user, supabase);

  return {
    profileResult,
    profile: profileResult.profile,
  };
}

export function deriveDisplayName(
  user: Pick<User, "email" | "user_metadata">,
  profile?: Pick<ProfileRow, "display_name"> | null,
) {
  return (
    profile?.display_name?.trim() ||
    (typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : "") ||
    user.email?.split("@")[0] ||
    "Member"
  );
}

export async function getViewer() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const authResult = await resolveAuthUserWithDeadline(supabase.auth.getUser());
  const {
    data: { user },
    error: authError,
    timedOut,
  } = authResult;

  if (authError) {
    if (timedOut) {
      console.warn("[supabase] Auth resolution timed out; rendering signed-out state.", {
        timeoutMs: AUTH_RESOLUTION_TIMEOUT_MS,
      });
    } else if (!isAuthSessionMissingError(authError)) {
      logSupabaseError("Failed to resolve authenticated user", authError);
    }
    return null;
  }

  if (!user) {
    return null;
  }

  const { profileResult, profile: resolvedProfile } = await ensureAccountRowsForUser(user, supabase);

  return {
    authUser: user,
    profile: resolvedProfile,
    displayName: deriveDisplayName(user, resolvedProfile),
    profileStatus: profileResult.profileStatus,
    profileSyncError: profileResult.profileSyncError,
  } satisfies Viewer;
}

function applyPublicProfileSort(query: any, sort: PeopleSort) {
  if (sort === "offers") {
    return query
      .order("offer_count", { ascending: false })
      .order("rating_count", { ascending: false })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
  }

  if (sort === "newest") {
    return query.order("created_at", { ascending: false }).order("id", { ascending: true });
  }

  return query
    .order("rating_avg", { ascending: false, nullsFirst: false })
    .order("rating_count", { ascending: false })
    .order("offer_count", { ascending: false })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
}

export async function requireViewer(nextPath?: string) {
  const viewer = await getViewer();

  if (!viewer) {
    const target = nextPath ? `/login?returnTo=${encodeURIComponent(nextPath)}` : "/login";
    redirect(target);
  }

  return viewer;
}

export async function listOpenOffersPage(
  page = 1,
  pageSize = OFFERS_PAGE_SIZE,
  mode: OfferRow["mode"] | "all" = "all",
  searchQuery = "",
): Promise<PaginatedResult<OfferRecord>> {
  if (!hasSupabaseEnv()) {
    return buildPaginatedResult([], normalizePage(page), pageSize);
  }

  const normalizedPage = normalizePage(page);
  const offset = (normalizedPage - 1) * pageSize;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const supabase = await createClient();
  let query = supabase
    .from("offers")
    .select("*")
    .eq("status", "open");

  if (mode !== "all") {
    query = query.eq("mode", mode);
  }

  const orderedQuery = query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });
  const { data, error } = normalizedSearchQuery
    ? await orderedQuery.limit(240)
    : await orderedQuery.range(offset, offset + pageSize);

  if (error) {
    throw new Error(error.message);
  }

  const viewer = await getViewer();
  const hydrated = await hydrateOffers((data ?? []) as OfferRow[], viewer?.authUser.id);
  const searched = normalizedSearchQuery
    ? hydrated.filter((offer) => offerMatchesSearchQuery(offer, normalizedSearchQuery))
    : hydrated;
  const pagedItems = normalizedSearchQuery ? searched.slice(offset) : searched;

  return buildPaginatedResult(pagedItems, normalizedPage, pageSize);
}

export async function listOpenOffersPreview(limit = 120, mode: OfferRow["mode"] | "all" = "all") {
  if (!hasSupabaseEnv()) {
    return [] as OfferRecord[];
  }

  const supabase = await createClient();
  let query = supabase
    .from("offers")
    .select("*")
    .eq("status", "open");

  if (mode !== "all") {
    query = query.eq("mode", mode);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const viewer = await getViewer();
  return hydrateOffers((data ?? []) as OfferRow[], viewer?.authUser.id);
}

function offerMatchesSearchQuery(offer: OfferRecord, normalizedSearchQuery: string) {
  const haystack = [
    offer.offered_cause,
    offer.requested_cause,
    offer.compromise_cause,
    offer.offer_action,
    offer.request_action,
    offer.notes,
    offer.verification,
    offer.duration,
    offer.owner_alias,
    offer.mode,
    offer.donationOffset?.baseline_opposed_cause,
    offer.donationOffset?.requested_opposed_cause,
    offer.donationOffset?.compromiseCharity?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return normalizedSearchQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export async function getDonationOffsetOverview(): Promise<DonationOffsetOverview> {
  if (!hasSupabaseEnv()) {
    return {
      totalRedirectedCents: 0,
      completedMatchCount: 0,
      pooledCommitmentCents: 0,
      moralPublicGoodsRedirectedCents: 0,
      moralPublicGoodsMatchCount: 0,
      topCompromiseDestinations: [],
      pools: [],
    };
  }

  // This function returns a narrow aggregate only. Service access prevents
  // participant-scoped RLS from silently turning real transferred totals into
  // zero while no private match, identity, or receipt fields leave the server.
  const supabase = createServiceClient() as any;
  const [
    { data: matches, error: matchesError },
    { data: offsetOffers, error: offsetOffersError },
    { data: pools, error: poolsError },
    { data: charities, error: charitiesError },
    { data: offers, error: offersError },
    { data: transferredBatches, error: transferredBatchesError },
  ] = await Promise.all([
    supabase.from("donation_offset_matches").select("*"),
    supabase.from("donation_offset_offers").select("*"),
    supabase.from("donation_offset_pools").select("*"),
    supabase.from("registered_charities").select("*"),
    supabase.from("offers").select("*").eq("mode", "offset"),
    supabase
      .from("conditional_settlement_batches")
      .select("subject_id, total_amount_cents, condition_snapshot, completed_at")
      .eq("purpose", "donation_offset")
      .eq("subject_type", "donation_offset_match")
      .eq("status", "transferred")
      .eq("livemode", true),
  ]);

  if (matchesError) {
    throw new Error(matchesError.message);
  }
  if (offsetOffersError) {
    throw new Error(offsetOffersError.message);
  }
  if (poolsError) {
    throw new Error(poolsError.message);
  }
  if (charitiesError) {
    throw new Error(charitiesError.message);
  }
  if (offersError) {
    throw new Error(offersError.message);
  }
  if (transferredBatchesError) {
    throw new Error(transferredBatchesError.message);
  }

  const matchRows = (matches ?? []) as DonationOffsetMatchRow[];
  const offsetRows = (offsetOffers ?? []) as DonationOffsetOfferRow[];
  const charityRows = (charities ?? []) as RegisteredCharityRow[];
  const offerRows = (offers ?? []) as OfferRow[];
  const charityMap = new Map(charityRows.map((row) => [row.id, row] as const));
  const offsetMap = new Map(offsetRows.map((row) => [row.offer_id, row] as const));
  const transferredBatchByMatch = new Map<string, Record<string, any>>();
  for (const batch of (transferredBatches ?? []) as Array<Record<string, any>>) {
    const matchId = String(batch.subject_id);
    const current = transferredBatchByMatch.get(matchId);
    if (!current || String(batch.completed_at) > String(current.completed_at)) {
      transferredBatchByMatch.set(matchId, batch);
    }
  }
  const poolMap = buildDonationOffsetPoolMap({
    pools: (pools ?? []) as DonationOffsetPoolRow[],
    poolOffers: offsetRows.filter((row) => row.participation_mode === "pool"),
    offersById: new Map(offerRows.map((row) => [row.id, row] as const)),
    charities: charityRows,
  });

  const destinationTotals = new Map<
    string,
    { totalRedirectedCents: number; matchCount: number }
  >();
  let totalRedirectedCents = 0;
  let completedMatchCount = 0;
  let moralPublicGoodsRedirectedCents = 0;
  let moralPublicGoodsMatchCount = 0;

  for (const match of matchRows) {
    const transferredBatch = transferredBatchByMatch.get(match.id);
    if (!transferredBatch) {
      continue;
    }

    const offset = offsetMap.get(match.offer_id);
    if (!offset) {
      continue;
    }

    const redirected = Number(transferredBatch.total_amount_cents);
    const snapshot = transferredBatch.condition_snapshot as Record<string, any> | null;
    const redirects = snapshot?.schemaVersion === "donation-offset-payment-condition-v2"
      ? [snapshot.redirects?.owner, snapshot.redirects?.counterparty].filter(Boolean)
      : null;
    const charity = charityMap.get(offset.compromise_charity_id) ?? null;

    totalRedirectedCents += redirected;
    completedMatchCount += 1;

    const moralPublicGoodsForMatch = redirects
      ? redirects.reduce((total: number, participantRedirect: Record<string, any>) => {
          const redirectCharity = charityMap.get(String(participantRedirect.charityId));
          return redirectCharity?.is_moral_public_good
            ? total + Number(participantRedirect.amountCents ?? 0)
            : total;
        }, 0)
      : charity?.is_moral_public_good
        ? redirected
        : 0;
    if (moralPublicGoodsForMatch > 0) {
      moralPublicGoodsRedirectedCents += moralPublicGoodsForMatch;
      moralPublicGoodsMatchCount += 1;
    }

    const destinationParts = redirects
      ? redirects.map((participantRedirect: Record<string, any>) => ({
          charityId: String(participantRedirect.charityId),
          amountCents: Number(participantRedirect.amountCents ?? 0),
        }))
      : charity
        ? [{ charityId: charity.id, amountCents: redirected }]
        : [];
    const countedDestinations = new Set<string>();
    for (const part of destinationParts) {
      if (!charityMap.has(part.charityId) || part.amountCents <= 0) continue;
      const current = destinationTotals.get(part.charityId) ?? {
        totalRedirectedCents: 0,
        matchCount: 0,
      };
      current.totalRedirectedCents += part.amountCents;
      if (!countedDestinations.has(part.charityId)) {
        current.matchCount += 1;
        countedDestinations.add(part.charityId);
      }
      destinationTotals.set(part.charityId, current);
    }
  }

  const activePools = [...poolMap.values()]
    .filter((pool) => pool.status !== "closed" && pool.moderation_status === "clear")
    .sort((left, right) => right.matchedCompromiseCents - left.matchedCompromiseCents);

  return {
    totalRedirectedCents,
    completedMatchCount,
    pooledCommitmentCents: activePools.reduce(
      (total, pool) => total + pool.matchedCompromiseCents,
      0,
    ),
    moralPublicGoodsRedirectedCents,
    moralPublicGoodsMatchCount,
    topCompromiseDestinations: [...destinationTotals.entries()]
      .map(([charityId, totals]) => ({
        charity: charityMap.get(charityId) ?? null,
        totalRedirectedCents: totals.totalRedirectedCents,
        matchCount: totals.matchCount,
      }))
      .sort((left, right) => right.totalRedirectedCents - left.totalRedirectedCents)
      .slice(0, 6),
    pools: activePools,
  };
}

export async function getMarketplaceOverview(): Promise<MarketplaceOverview> {
  if (!hasSupabaseEnv()) {
    return {
      hasLiveData: false,
      openOfferCount: null,
      publicProfileCount: null,
      completedAgreementCount: null,
      redirectedOffsetCents: null,
      pooledCommitmentCents: null,
    };
  }

  const supabase = await createClient();
  const [openOffersResult, profilesResult, completedAgreementsResult, donationOffsetOverview] =
    await Promise.all([
      supabase.from("offers").select("id", { count: "exact", head: true }).eq("status", "open"),
      (supabase as any)
        .from("public_profile_cards_v1")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("agreements")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
      getDonationOffsetOverview().catch((error) => {
        const message =
          error instanceof Error ? error.message : "Unable to load donation offset overview.";
        console.error("[supabase] Failed to load donation offset metrics", { message });
        return null;
      }),
    ]);

  if (openOffersResult.error) {
    logSupabaseError("Failed to count open public offers", openOffersResult.error);
  }
  if (profilesResult.error) {
    logSupabaseError("Failed to count public profiles", profilesResult.error);
  }
  if (completedAgreementsResult.error) {
    logSupabaseError("Failed to count completed agreements", completedAgreementsResult.error);
  }

  return {
    hasLiveData: true,
    openOfferCount: openOffersResult.error ? null : openOffersResult.count ?? 0,
    publicProfileCount: profilesResult.error ? null : profilesResult.count ?? 0,
    completedAgreementCount: completedAgreementsResult.error
      ? null
      : completedAgreementsResult.count ?? 0,
    redirectedOffsetCents: donationOffsetOverview?.totalRedirectedCents ?? null,
    pooledCommitmentCents: donationOffsetOverview?.pooledCommitmentCents ?? null,
  };
}

export async function getOfferById(offerId: string) {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const viewer = await getViewer();
  const hydrated = await hydrateOffers([data as OfferRow], viewer?.authUser.id);
  return hydrated[0] ?? null;
}

export async function getInterestForOffer(offerId: string, userId: string) {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interests")
    .select("*")
    .eq("offer_id", offerId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const profileMap = await getProfileSummaryMap(userId, [userId]);

  return {
    ...(data as InterestRow),
    offer: null,
    participantProfile: profileMap.get(userId) ?? null,
  } satisfies InterestRecord;
}

export async function listOfferInterests(offerId: string) {
  if (!hasSupabaseEnv()) {
    return [] as InterestRecord[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interests")
    .select("*")
    .eq("offer_id", offerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const interests = (data ?? []) as InterestRow[];
  const profileIds = interests.map((interest) => interest.user_id);
  const profileMap = await getProfileSummaryMap(undefined, profileIds);

  return interests.map((interest) => ({
    ...interest,
    offer: null,
    participantProfile: profileMap.get(interest.user_id) ?? null,
  }));
}

async function hydrateIncomingResponses(
  memberInterests: InterestRow[],
  guestInterests: GuestInterestRow[],
  offersById: Map<string, OfferRecord>,
  viewerId?: string | null,
) {
  const profileIds = [
    ...new Set([
      ...memberInterests.map((interest) => interest.user_id),
      ...guestInterests
        .map((interest) => interest.claimed_by_profile_id)
        .filter((profileId): profileId is string => Boolean(profileId)),
    ]),
  ];

  const profileMap = profileIds.length
    ? await getProfileSummaryMap(viewerId, profileIds)
    : new Map<string, PublicProfileSummary>();
  const memberInterestIds = memberInterests.map((interest) => interest.id);
  let performanceBondByInterest = new Map<string, PerformanceBondRow>();

  if (memberInterestIds.length) {
    const supabase = await createClient();
    const { data: takerBonds, error: takerBondsError } = await supabase
      .from("performance_bonds")
      .select("*")
      .in("interest_id", memberInterestIds)
      .eq("side", "taker");

    if (takerBondsError) {
      throw new Error(takerBondsError.message);
    }

    performanceBondByInterest = new Map(
      ((takerBonds ?? []) as PerformanceBondRow[])
        .filter((bond) => bond.interest_id)
        .map((bond) => [bond.interest_id as string, bond] as const),
    );
  }

  const combined: IncomingResponseRecord[] = [
    ...memberInterests.map((interest) => {
      const participantProfile = profileMap.get(interest.user_id) ?? null;

      return {
        id: interest.id,
        kind: "member",
        offer_id: interest.offer_id,
        offer: offersById.get(interest.offer_id) ?? null,
        status: interest.status,
        message: interest.message,
        created_at: interest.created_at,
        participantProfile,
        displayName: participantProfile?.resolvedName ?? interest.interested_alias,
        contactEmail: participantProfile?.email ?? null,
        location: participantProfile
          ? formatLocation(participantProfile.city, participantProfile.region)
          : null,
        canCreateAgreement: true,
        memberInterestId: interest.id,
        guestInterestId: null,
        performanceBond: performanceBondByInterest.get(interest.id) ?? null,
      } satisfies IncomingResponseRecord;
    }),
    ...guestInterests.map((interest) => {
      const participantProfile = interest.claimed_by_profile_id
        ? profileMap.get(interest.claimed_by_profile_id) ?? null
        : null;

      return {
        id: interest.id,
        kind: "guest",
        offer_id: interest.offer_id,
        offer: offersById.get(interest.offer_id) ?? null,
        status: interest.status,
        message: interest.message,
        created_at: interest.created_at,
        participantProfile,
        displayName: participantProfile?.resolvedName ?? getGuestInterestDisplayName(interest),
        contactEmail: interest.contact_email,
        location: formatLocation(
          participantProfile?.city ?? interest.city,
          participantProfile?.region ?? interest.region,
        ),
        canCreateAgreement: Boolean(interest.claimed_by_profile_id),
        memberInterestId: null,
        guestInterestId: interest.id,
        performanceBond: null,
      } satisfies IncomingResponseRecord;
    }),
  ];

  return combined.sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

export async function listOfferResponses(offerId: string, viewerId?: string | null) {
  if (!hasSupabaseEnv()) {
    return [] as IncomingResponseRecord[];
  }

  const supabase = await createClient();
  const [{ data: memberInterests, error: memberInterestsError }, { data: guestInterests, error: guestInterestsError }] =
    await Promise.all([
      supabase
        .from("interests")
        .select("*")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("guest_interests")
        .select("*")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: false }),
    ]);

  if (memberInterestsError) {
    throw new Error(memberInterestsError.message);
  }

  if (guestInterestsError) {
    throw new Error(guestInterestsError.message);
  }

  const offer = await getOfferById(offerId);
  const offersById = new Map<string, OfferRecord>(offer ? [[offerId, offer]] : []);

  return hydrateIncomingResponses(
    (memberInterests ?? []) as InterestRow[],
    (guestInterests ?? []) as GuestInterestRow[],
    offersById,
    viewerId,
  );
}

export async function listOfferRecommendations(offerId: string) {
  if (!hasSupabaseEnv()) {
    return [] as OfferRecommendationRecord[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offer_recommendations")
    .select("*")
    .eq("source_offer_id", offerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as OfferRecommendationRow[];
  const viewer = await getViewer();
  const recommenderIds = [...new Set(rows.map((row) => row.recommender_id))];
  const offerIds = [...new Set(rows.map((row) => row.recommended_offer_id))];
  const [profileMap, recommendedOffers] = await Promise.all([
    getProfileSummaryMap(viewer?.authUser.id, recommenderIds),
    offerIds.length
      ? (async () => {
          const { data: offers, error: offersError } = await supabase
            .from("offers")
            .select("*")
            .in("id", offerIds);

          if (offersError) {
            throw new Error(offersError.message);
          }

          return hydrateOffers((offers ?? []) as OfferRow[], viewer?.authUser.id);
        })()
      : Promise.resolve([] as OfferRecord[]),
  ]);

  const offersById = new Map(recommendedOffers.map((offer) => [offer.id, offer]));

  return rows.map((row) => ({
    ...row,
    recommender: profileMap.get(row.recommender_id) ?? null,
    sourceOffer: null,
    recommendedOffer: offersById.get(row.recommended_offer_id) ?? null,
  }));
}

export async function listProfileRecommendations(profileId: string) {
  if (!hasSupabaseEnv()) {
    return [] as OfferRecommendationRecord[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offer_recommendations")
    .select("*")
    .eq("recommender_id", profileId)
    .is("source_offer_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as OfferRecommendationRow[];
  const viewer = await getViewer();
  const offerIds = [...new Set(rows.map((row) => row.recommended_offer_id))];
  const [profileMap, recommendedOffers] = await Promise.all([
    getProfileSummaryMap(viewer?.authUser.id, [profileId]),
    offerIds.length
      ? (async () => {
          const { data: offers, error: offersError } = await supabase
            .from("offers")
            .select("*")
            .in("id", offerIds);

          if (offersError) {
            throw new Error(offersError.message);
          }

          return hydrateOffers((offers ?? []) as OfferRow[], viewer?.authUser.id);
        })()
      : Promise.resolve([] as OfferRecord[]),
  ]);

  const offersById = new Map(recommendedOffers.map((offer) => [offer.id, offer]));

  return rows.map((row) => ({
    ...row,
    recommender: profileMap.get(row.recommender_id) ?? null,
    sourceOffer: null,
    recommendedOffer: offersById.get(row.recommended_offer_id) ?? null,
  }));
}

export async function listRecommendableOffers(userId: string, excludeOfferId?: string) {
  if (!hasSupabaseEnv()) {
    return [] as OfferRecord[];
  }

  const supabase = await createClient();
  let query = supabase
    .from("offers")
    .select("*")
    .eq("status", "open")
    .neq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (excludeOfferId) {
    query = query.neq("id", excludeOfferId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return hydrateOffers((data ?? []) as OfferRow[], userId);
}

export async function getOfferCartState(
  offerId: string,
  viewerId?: string | null,
  ownerId?: string | null,
) {
  if (!hasSupabaseEnv() || !viewerId) {
    return {
      isInCart: false,
      cartCount: null,
    } satisfies OfferCartState;
  }

  const supabase = await createClient();

  if (ownerId && viewerId === ownerId) {
    const { count, error } = await supabase
      .from("offer_carts")
      .select("*", { count: "exact", head: true })
      .eq("offer_id", offerId);

    if (error) {
      throw new Error(error.message);
    }

    return {
      isInCart: false,
      cartCount: count ?? 0,
    } satisfies OfferCartState;
  }

  const { data, error } = await supabase
    .from("offer_carts")
    .select("*")
    .eq("offer_id", offerId)
    .eq("user_id", viewerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    isInCart: Boolean(data),
    cartCount: null,
  } satisfies OfferCartState;
}

export async function listCartItems(userId: string, limit?: number) {
  if (!hasSupabaseEnv()) {
    return [] as CartItemRecord[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offer_carts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit ?? 1000);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as OfferCartRow[];
  const offerIds = rows.map((row) => row.offer_id);

  if (!offerIds.length) {
    return [];
  }

  const { data: offers, error: offersError } = await supabase
    .from("offers")
    .select("*")
    .in("id", offerIds);

  if (offersError) {
    throw new Error(offersError.message);
  }

  const hydratedOffers = await hydrateOffers((offers ?? []) as OfferRow[], userId);
  const offersById = new Map(hydratedOffers.map((offer) => [offer.id, offer]));

  return rows.map((row) => ({
    addedAt: row.created_at,
    offer: offersById.get(row.offer_id) ?? null,
  }));
}

export async function listOfferComments(offerId: string, viewerId?: string | null) {
  if (!hasSupabaseEnv()) {
    return [] as OfferCommentNode[];
  }

  const supabase = await createClient();
  const { data: comments, error: commentsError } = await supabase
    .from("offer_comments")
    .select("*")
    .eq("offer_id", offerId)
    .order("created_at", { ascending: true });

  if (commentsError) {
    throw new Error(commentsError.message);
  }

  const commentRows = (comments ?? []) as OfferCommentRow[];
  if (!commentRows.length) {
    return [];
  }

  const commentIds = commentRows.map((comment) => comment.id);
  const authorIds = [...new Set(commentRows.map((comment) => comment.author_id))];
  const [{ data: votes, error: votesError }, profileMap] = await Promise.all([
    supabase.from("comment_votes").select("*").in("comment_id", commentIds),
    getProfileSummaryMap(viewerId, authorIds),
  ]);

  if (votesError) {
    throw new Error(votesError.message);
  }

  const voteTotals = new Map<string, number>();
  const viewerVotes = new Map<string, -1 | 1>();
  for (const vote of (votes ?? []) as CommentVoteRow[]) {
    incrementCount(voteTotals, vote.comment_id, vote.value);
    if (viewerId && vote.user_id === viewerId && (vote.value === -1 || vote.value === 1)) {
      viewerVotes.set(vote.comment_id, vote.value);
    }
  }

  const nodes = new Map<string, OfferCommentNode>(
    commentRows.map((comment) => [
      comment.id,
      {
        ...comment,
        author: profileMap.get(comment.author_id) ?? null,
        score: voteTotals.get(comment.id) ?? 0,
        viewerVote: viewerVotes.get(comment.id) ?? null,
        replies: [],
      },
    ]),
  );

  const roots: OfferCommentNode[] = [];

  for (const comment of commentRows) {
    const node = nodes.get(comment.id);
    if (!node) {
      continue;
    }

    if (comment.parent_id) {
      const parent = nodes.get(comment.parent_id);
      if (parent) {
        parent.replies.push(node);
        continue;
      }
    }

    roots.push(node);
  }

  return roots;
}

export async function listPublicProfilesPage(
  sort: PeopleSort,
  page = 1,
  pageSize = PEOPLE_PAGE_SIZE,
  viewerId?: string | null,
): Promise<PaginatedResult<PublicProfileSummary>> {
  if (!hasSupabaseEnv()) {
    return buildPaginatedResult([], normalizePage(page), pageSize);
  }

  const normalizedPage = normalizePage(page);
  const offset = (normalizedPage - 1) * pageSize;
  const supabase = await createClient();
  const query = applyPublicProfileSort(
    (supabase as any).from("public_profile_cards_v1").select("*"),
    sort,
  ).range(offset, offset + pageSize - 1);
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const profiles = ((data ?? []) as Array<Omit<ProfileRow, "email">>).map(
    (profile) => ({ ...profile, email: "" }) satisfies ProfileRow,
  );
  const profileMap = await getProfileSummaryMap(
    viewerId,
    profiles.map((profile) => profile.id),
  );

  return buildPaginatedResult(
    profiles
      .map((profile) => profileMap.get(profile.id))
      .filter((profile): profile is PublicProfileSummary => Boolean(profile)),
    normalizedPage,
    pageSize,
  );
}

export async function listProfileOffers(profileId: string, viewerId?: string | null) {
  if (!hasSupabaseEnv()) {
    return [] as OfferRecord[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("owner_id", profileId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return hydrateOffers((data ?? []) as OfferRow[], viewerId);
}

export async function listPublicProfileOffersPage(
  profileId: string,
  viewerId?: string | null,
  page = 1,
  pageSize = PUBLIC_PROFILE_OFFERS_PAGE_SIZE,
): Promise<PaginatedResult<OfferRecord>> {
  const normalizedPage = normalizePage(page);
  if (!hasSupabaseEnv()) {
    return buildPaginatedResult([], normalizedPage, pageSize);
  }

  const offset = (normalizedPage - 1) * pageSize;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("owner_id", profileId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + pageSize);

  if (error) {
    throw new Error(error.message);
  }

  const hydrated = await hydrateOffers((data ?? []) as OfferRow[], viewerId);
  return buildPaginatedResult(hydrated, normalizedPage, pageSize);
}

export async function getPublicProfilePageData(
  profileId: string,
  viewerId?: string | null,
  requestedOfferPage = 1,
) {
  const requestedPage = normalizePage(requestedOfferPage);
  if (!hasSupabaseEnv()) {
    return {
      profile: null,
      offers: [],
      offersPage: buildPaginatedResult([], requestedPage, PUBLIC_PROFILE_OFFERS_PAGE_SIZE),
      profileRecommendations: [],
      authoredCommentCount: 0,
    } satisfies PublicProfilePageData;
  }

  const profile = await getPublicProfileSummary(profileId, viewerId);
  if (!profile) {
    return {
      profile: null,
      offers: [],
      offersPage: buildPaginatedResult([], requestedPage, PUBLIC_PROFILE_OFFERS_PAGE_SIZE),
      profileRecommendations: [],
      authoredCommentCount: 0,
    } satisfies PublicProfilePageData;
  }

  const maximumPage = Math.max(
    1,
    Math.ceil(profile.offerCount / PUBLIC_PROFILE_OFFERS_PAGE_SIZE),
  );
  const offerPage = Math.min(requestedPage, maximumPage);
  const supabase = await createClient();
  const [offersPage, recommendations, commentsResult] = await Promise.all([
    listPublicProfileOffersPage(profileId, viewerId, offerPage),
    listProfileRecommendations(profileId),
    supabase
      .from("offer_comments")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profileId),
  ]);

  if (commentsResult.error) {
    throw new Error(commentsResult.error.message);
  }

  return {
    profile,
    offers: offersPage.items,
    offersPage,
    profileRecommendations: recommendations,
    authoredCommentCount: commentsResult.count ?? 0,
  } satisfies PublicProfilePageData;
}

export async function listAgreementsForUser(userId: string) {
  if (!hasSupabaseEnv()) {
    return [] as AgreementRecord[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agreements")
    .select("*")
    .or(`proposer_id.eq.${userId},responder_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return hydrateAgreementRows((data ?? []) as AgreementRow[], userId);
}

export async function getAgreementForUser(agreementId: string, userId: string) {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const agreement = data as AgreementRow | null;
  if (
    !agreement ||
    (agreement.proposer_id !== userId && agreement.responder_id !== userId)
  ) {
    return null;
  }

  const [hydratedAgreement] = await hydrateAgreementRows([agreement], userId);
  return hydratedAgreement ?? null;
}

async function hydrateAgreementRows(agreements: AgreementRow[], userId: string) {
  if (!agreements.length) {
    return [];
  }

  const supabase = await createClient();
  const offerIds = [
    ...new Set(agreements.map((agreement) => agreement.offer_id).filter((id): id is string => Boolean(id))),
  ];
  const profileIds = [
    ...new Set(
      agreements.flatMap((agreement) => [agreement.proposer_id, agreement.responder_id]),
    ),
  ];
  const agreementIds = agreements.map((agreement) => agreement.id);
  const [
    { data: offers, error: offersError },
    { data: ratings, error: ratingsError },
    { data: payments, error: paymentsError },
    { data: paymentSchedules, error: paymentSchedulesError },
    { data: events, error: eventsError },
    { data: evidenceItems, error: evidenceItemsError },
    { data: reviewCases, error: reviewCasesError },
    { data: performanceBonds, error: performanceBondsError },
    profileMap,
  ] =
    await Promise.all([
      offerIds.length
        ? supabase.from("offers").select("*").in("id", offerIds)
        : Promise.resolve({ data: [] as OfferRow[], error: null }),
      supabase.from("agreement_ratings").select("*").in("agreement_id", agreementIds),
      supabase
        .from("agreement_payments")
        .select("*")
        .in("agreement_id", agreementIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("agreement_payment_schedules")
        .select("*")
        .in("agreement_id", agreementIds)
        .order("next_due_at", { ascending: true }),
      supabase
        .from("agreement_events")
        .select("*")
        .in("agreement_id", agreementIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("agreement_evidence_items")
        .select("*")
        .in("agreement_id", agreementIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("agreement_review_cases")
        .select("*")
        .in("agreement_id", agreementIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("performance_bonds")
        .select("*")
        .in("swap_id", agreementIds)
        .order("created_at", { ascending: false }),
      getProfileSummaryMap(userId, profileIds),
    ]);

  if (offersError) {
    throw new Error(offersError.message);
  }
  if (ratingsError) {
    throw new Error(ratingsError.message);
  }
  if (paymentsError) {
    throw new Error(paymentsError.message);
  }
  if (paymentSchedulesError) {
    throw new Error(paymentSchedulesError.message);
  }
  if (eventsError) {
    throw new Error(eventsError.message);
  }
  const evidenceItemsUnavailable = isMissingOptionalLegacyAgreementRelation(
    evidenceItemsError,
    "agreement_evidence_items",
  );
  const reviewCasesUnavailable = isMissingOptionalLegacyAgreementRelation(
    reviewCasesError,
    "agreement_review_cases",
  );

  if (evidenceItemsError && !evidenceItemsUnavailable) {
    throw new Error(evidenceItemsError.message);
  }
  if (reviewCasesError && !reviewCasesUnavailable) {
    throw new Error(reviewCasesError.message);
  }
  if (performanceBondsError) {
    throw new Error(performanceBondsError.message);
  }

  const hydratedOffers = await hydrateOffers((offers ?? []) as OfferRow[], userId);
  const offersById = new Map(hydratedOffers.map((offer) => [offer.id, offer]));
  const performanceBondRows = (performanceBonds ?? []) as PerformanceBondRow[];
  const performanceBondIds = performanceBondRows.map((bond) => bond.id);
  const [
    { data: bondEvidence, error: bondEvidenceError },
    { data: bondChallenges, error: bondChallengesError },
    { data: bondAdjudications, error: bondAdjudicationsError },
    { data: bondLedgerEntries, error: bondLedgerEntriesError },
    { data: performanceBondAuditEvents, error: performanceBondAuditEventsError },
  ] = performanceBondIds.length
    ? await Promise.all([
        supabase
          .from("bond_evidence")
          .select("*")
          .in("bond_id", performanceBondIds)
          .order("submitted_at", { ascending: false }),
        supabase
          .from("bond_challenges")
          .select("*")
          .in("bond_id", performanceBondIds)
          .order("challenged_at", { ascending: false }),
        supabase
          .from("bond_adjudications")
          .select("*")
          .in("bond_id", performanceBondIds)
          .order("decided_at", { ascending: false }),
        supabase
          .from("bond_ledger_entries")
          .select("*")
          .in("bond_id", performanceBondIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("performance_bond_audit_events")
          .select("*")
          .in("bond_id", performanceBondIds)
          .order("created_at", { ascending: false }),
      ])
    : [
        { data: [] as BondEvidenceRow[], error: null },
        { data: [] as BondChallengeRow[], error: null },
        { data: [] as BondAdjudicationRow[], error: null },
        { data: [] as BondLedgerEntryRow[], error: null },
        { data: [] as PerformanceBondAuditEventRow[], error: null },
      ];

  if (bondEvidenceError) {
    throw new Error(bondEvidenceError.message);
  }
  if (bondChallengesError) {
    throw new Error(bondChallengesError.message);
  }
  if (bondAdjudicationsError) {
    throw new Error(bondAdjudicationsError.message);
  }
  if (bondLedgerEntriesError) {
    throw new Error(bondLedgerEntriesError.message);
  }
  if (performanceBondAuditEventsError) {
    throw new Error(performanceBondAuditEventsError.message);
  }
  const ratingsByAgreement = new Map<string, AgreementRatingRecord[]>();
  const paymentsByAgreement = new Map<string, AgreementPaymentRow[]>();
  const paymentSchedulesByAgreement = new Map<string, AgreementPaymentScheduleRow[]>();
  const eventsByAgreement = new Map<string, AgreementEventRow[]>();
  const evidenceItemsByAgreement = new Map<string, AgreementEvidenceItemRow[]>();
  const reviewCasesByAgreement = new Map<string, AgreementReviewCaseRow[]>();
  const performanceBondsByAgreement = new Map<string, PerformanceBondRow[]>();
  const bondEvidenceByBond = new Map<string, BondEvidenceRow[]>();
  const bondChallengesByBond = new Map<string, BondChallengeRow[]>();
  const bondAdjudicationsByBond = new Map<string, BondAdjudicationRow[]>();
  const bondLedgerByBond = new Map<string, BondLedgerEntryRow[]>();
  const bondAuditByBond = new Map<string, PerformanceBondAuditEventRow[]>();

  for (const rating of (ratings ?? []) as AgreementRatingRow[]) {
    const bucket = ratingsByAgreement.get(rating.agreement_id) ?? [];
    bucket.push({
      ...rating,
      rater: profileMap.get(rating.rater_id) ?? null,
      ratedUser: profileMap.get(rating.rated_user_id) ?? null,
    });
    ratingsByAgreement.set(rating.agreement_id, bucket);
  }

  for (const payment of (payments ?? []) as AgreementPaymentRow[]) {
    const bucket = paymentsByAgreement.get(payment.agreement_id) ?? [];
    bucket.push(payment);
    paymentsByAgreement.set(payment.agreement_id, bucket);
  }

  for (const schedule of (paymentSchedules ?? []) as AgreementPaymentScheduleRow[]) {
    const bucket = paymentSchedulesByAgreement.get(schedule.agreement_id) ?? [];
    bucket.push(schedule);
    paymentSchedulesByAgreement.set(schedule.agreement_id, bucket);
  }

  for (const event of (events ?? []) as AgreementEventRow[]) {
    const bucket = eventsByAgreement.get(event.agreement_id) ?? [];
    bucket.push(event);
    eventsByAgreement.set(event.agreement_id, bucket);
  }

  for (const evidenceItem of (evidenceItems ?? []) as AgreementEvidenceItemRow[]) {
    const bucket = evidenceItemsByAgreement.get(evidenceItem.agreement_id) ?? [];
    bucket.push(evidenceItem);
    evidenceItemsByAgreement.set(evidenceItem.agreement_id, bucket);
  }

  for (const reviewCase of (reviewCases ?? []) as AgreementReviewCaseRow[]) {
    const bucket = reviewCasesByAgreement.get(reviewCase.agreement_id) ?? [];
    bucket.push(reviewCase);
    reviewCasesByAgreement.set(reviewCase.agreement_id, bucket);
  }

  for (const bond of performanceBondRows) {
    if (!bond.swap_id) {
      continue;
    }

    const bucket = performanceBondsByAgreement.get(bond.swap_id) ?? [];
    bucket.push(bond);
    performanceBondsByAgreement.set(bond.swap_id, bucket);
  }

  for (const row of (bondEvidence ?? []) as BondEvidenceRow[]) {
    const bucket = bondEvidenceByBond.get(row.bond_id) ?? [];
    bucket.push(row);
    bondEvidenceByBond.set(row.bond_id, bucket);
  }

  for (const row of (bondChallenges ?? []) as BondChallengeRow[]) {
    const bucket = bondChallengesByBond.get(row.bond_id) ?? [];
    bucket.push(row);
    bondChallengesByBond.set(row.bond_id, bucket);
  }

  for (const row of (bondAdjudications ?? []) as BondAdjudicationRow[]) {
    const bucket = bondAdjudicationsByBond.get(row.bond_id) ?? [];
    bucket.push(row);
    bondAdjudicationsByBond.set(row.bond_id, bucket);
  }

  for (const row of (bondLedgerEntries ?? []) as BondLedgerEntryRow[]) {
    const bucket = bondLedgerByBond.get(row.bond_id) ?? [];
    bucket.push(row);
    bondLedgerByBond.set(row.bond_id, bucket);
  }

  for (const row of (performanceBondAuditEvents ?? []) as PerformanceBondAuditEventRow[]) {
    const bucket = bondAuditByBond.get(row.bond_id) ?? [];
    bucket.push(row);
    bondAuditByBond.set(row.bond_id, bucket);
  }

  return agreements.map((agreement) => {
    const ratingsForAgreement = ratingsByAgreement.get(agreement.id) ?? [];
    const viewerRating =
      ratingsForAgreement.find((rating) => rating.rater_id === userId) ?? null;
    const counterpartyId =
      agreement.proposer_id === userId ? agreement.responder_id : agreement.proposer_id;
    const agreementPerformanceBonds = performanceBondsByAgreement.get(agreement.id) ?? [];

    return {
      ...agreement,
      offer: agreement.offer_id ? offersById.get(agreement.offer_id) ?? null : null,
      proposer: profileMap.get(agreement.proposer_id) ?? null,
      responder: profileMap.get(agreement.responder_id) ?? null,
      counterparty: profileMap.get(counterpartyId) ?? null,
      viewerRating,
      payments: paymentsByAgreement.get(agreement.id) ?? [],
      paymentSchedules: paymentSchedulesByAgreement.get(agreement.id) ?? [],
      events: eventsByAgreement.get(agreement.id) ?? [],
      legacyEvidenceReviewAvailable:
        !evidenceItemsUnavailable && !reviewCasesUnavailable,
      evidenceItems: evidenceItemsByAgreement.get(agreement.id) ?? [],
      reviewCases: reviewCasesByAgreement.get(agreement.id) ?? [],
      performanceBonds: agreementPerformanceBonds,
      bondEvidence: agreementPerformanceBonds.flatMap((bond) => bondEvidenceByBond.get(bond.id) ?? []),
      bondChallenges: agreementPerformanceBonds.flatMap((bond) => bondChallengesByBond.get(bond.id) ?? []),
      bondAdjudications: agreementPerformanceBonds.flatMap((bond) => bondAdjudicationsByBond.get(bond.id) ?? []),
      bondLedgerEntries: agreementPerformanceBonds.flatMap((bond) => bondLedgerByBond.get(bond.id) ?? []),
      performanceBondAuditEvents: agreementPerformanceBonds.flatMap((bond) => bondAuditByBond.get(bond.id) ?? []),
    } satisfies AgreementRecord;
  });
}

export async function getWishProfileForUser(userId: string): Promise<WishProfileRecord | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const [{ data: profile, error: profileError }, { data: entries, error: entriesError }] =
    await Promise.all([
      supabase.from("wish_profiles").select("*").eq("profile_id", userId).maybeSingle(),
      supabase
        .from("wish_entries")
        .select("*")
        .eq("profile_id", userId)
        .order("created_at", { ascending: true }),
    ]);

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  if (!profile) {
    return null;
  }

  const rows = ((entries ?? []) as WishEntryRow[]).map((entry) =>
    overlayEncryptedWishEntryBody(entry),
  );
  const decryptedProfile = overlayBackgroundRecordSensitiveText(
    profile as WishProfileRow,
    WISH_PROFILE_SENSITIVE_TEXT_FIELDS,
  );

  return {
    ...decryptedProfile,
    wishes: rows.filter((entry) => entry.entry_type === "wish"),
    offers: rows.filter((entry) => entry.entry_type === "offer"),
    asks: rows.filter((entry) => entry.entry_type === "ask"),
  };
}

async function listMatchSuggestionsForUser(
  userId: string,
  limit = DASHBOARD_PAGE_SIZE,
): Promise<MatchSuggestionRecord[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_suggestion_previews")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as MatchSuggestionPreviewRow[];
  if (!rows.length) {
    return [];
  }

  const counterpartyIds = [
    ...new Set(
      rows
        .map((row) => row.counterparty_profile_id)
        .filter((profileId): profileId is string => Boolean(profileId)),
    ),
  ];
  const counterpartyMap = counterpartyIds.length
    ? await getProfileSummaryMap(userId, counterpartyIds)
    : new Map<string, PublicProfileSummary>();

  return rows.map((row) => ({
    id: row.id,
    counterpartyId: row.counterparty_profile_id,
    counterparty: row.counterparty_profile_id
      ? counterpartyMap.get(row.counterparty_profile_id) ?? null
      : null,
    counterpartyPreview: {
      profile_id: row.counterparty_profile_id ?? "",
      causes: row.counterparty_causes,
      public_preview: row.counterparty_public_preview,
      location_city: row.counterparty_location_city,
      location_region: row.counterparty_location_region,
      openness_to_payment: row.counterparty_openness_to_payment,
      openness_to_pledges: row.counterparty_openness_to_pledges,
      participant_kind: "individual",
      collective_name: "",
      background_search_enabled: true,
      privacy_stage: "broad",
      updated_at: row.updated_at,
    },
    viewerReason: row.viewer_reason,
    counterpartyReason: row.counterparty_reason,
    score: row.score,
    matchBasis: row.match_basis ?? [],
    sharedCauses: row.shared_causes ?? [],
    suggestedFirstStep: row.suggested_first_step,
    riskNotes: row.risk_notes,
    generatedBy: row.generated_by,
    status: row.status,
    identityRevealed: row.identity_revealed,
    viewerConsented: row.viewer_consented,
    counterpartyConsented: row.counterparty_consented,
    canRevealIdentity: row.can_reveal_identity,
    lastScoredAt: row.last_scored_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function listWishNotificationsForUser(
  userId: string,
  matches: MatchSuggestionRecord[],
): Promise<WishNotificationRecord[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wish_notifications")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  const matchesById = new Map(matches.map((match) => [match.id, match]));

  return ((data ?? []) as WishNotificationRow[]).map((notification) => ({
    ...notification,
    match: notification.match_id ? matchesById.get(notification.match_id) ?? null : null,
  }));
}

async function listProfileSourcesForUser(userId: string): Promise<ProfileSourceRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_sources")
    .select("*")
    .eq("profile_id", userId)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProfileSourceRow[]).map((row) =>
    overlayBackgroundRecordSensitiveText(row, PROFILE_SOURCE_SENSITIVE_TEXT_FIELDS),
  );
}

async function listClarificationQuestionsForUser(
  userId: string,
): Promise<ClarificationQuestionRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clarification_questions")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ClarificationQuestionRow[];
}

async function listBackgroundMatchRunsForUser(userId: string): Promise<BackgroundMatchRunRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_match_runs")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BackgroundMatchRunRow[];
}

async function listMatchExplanationSnapshotsForUser(
  userId: string,
): Promise<MatchExplanationSnapshotRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_explanation_snapshots")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MatchExplanationSnapshotRow[];
}

async function listOpportunityBriefsForUser(
  userId: string,
): Promise<BackgroundRequesterOpportunityBriefCard[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_opportunity_briefs")
    .select(
      "id, title, confidence_band, delivery_state, factor_codes, shared_counts, safe_summary, redacted_fields, why_text, next_step_type, hidden_fields_notice, human_review_required, reveal_consequence_notice, review_status, status, expires_at, purpose_code, purpose_policy_version, output_schema_version, redacted_receipt_id",
    )
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((brief) => serializeOpportunityBriefCard(brief));
}

async function listIntroPacketsForUser(userId: string): Promise<BackgroundIntroPacketRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_intro_packets")
    .select("*")
    .or(`requester_profile_id.eq.${userId},counterparty_profile_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BackgroundIntroPacketRow[];
}

async function listBackgroundSourceSummariesForUser(
  userId: string,
): Promise<BackgroundSourceSummaryRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_source_summaries")
    .select("*")
    .eq("profile_id", userId)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as BackgroundSourceSummaryRow[]).map((row) =>
    overlayBackgroundRecordSensitiveText(row, BACKGROUND_SOURCE_SUMMARY_SENSITIVE_TEXT_FIELDS),
  );
}

async function listBackgroundProfileSignalsForUser(
  userId: string,
): Promise<BackgroundProfileSignalRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_profile_signals")
    .select("*")
    .eq("profile_id", userId)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BackgroundProfileSignalRow[];
}

async function listBackgroundShadowRunsForUser(userId: string): Promise<BackgroundShadowRunRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_shadow_runs")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BackgroundShadowRunRow[];
}

async function listBackgroundGrantReceiptsForUser(
  userId: string,
): Promise<BackgroundGrantReceiptRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_grant_receipts")
    .select("*")
    .or(`profile_id.eq.${userId},counterparty_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BackgroundGrantReceiptRow[];
}

async function listProfileInterviewAnswersForUser(
  userId: string,
): Promise<BackgroundProfileInterviewAnswerRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_profile_interview_answers")
    .select("*")
    .eq("profile_id", userId)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as BackgroundProfileInterviewAnswerRow[]).map((row) =>
    overlayBackgroundRecordSensitiveText(row, BACKGROUND_PROFILE_INTERVIEW_SENSITIVE_TEXT_FIELDS),
  );
}

async function listBackgroundCollectivePoliciesForUser(
  collectiveIds: string[],
): Promise<BackgroundCollectivePolicyRow[]> {
  if (!hasSupabaseEnv() || !collectiveIds.length) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_collective_policies")
    .select("*")
    .in("collective_id", collectiveIds)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BackgroundCollectivePolicyRow[];
}

async function listBackgroundMuteRulesForUser(userId: string): Promise<BackgroundMuteRuleRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_mute_rules")
    .select("*")
    .eq("profile_id", userId)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BackgroundMuteRuleRow[];
}

async function listBackgroundQueryEventsForUser(
  userId: string,
): Promise<BackgroundQueryEventRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_query_events")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BackgroundQueryEventRow[];
}

async function listBackgroundNotificationPreferencesForUser(
  userId: string,
): Promise<BackgroundNotificationPreferenceRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_notification_preferences")
    .select("*")
    .eq("profile_id", userId)
    .order("event_kind", { ascending: true })
    .order("channel", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BackgroundNotificationPreferenceRow[];
}

async function listProfileDataRightRequestsForUser(
  userId: string,
): Promise<ProfileDataRightRequestRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_data_right_requests")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProfileDataRightRequestRow[];
}

async function listMatchReportsForUser(userId: string): Promise<MatchReportRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_reports")
    .select("*")
    .eq("reporter_profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MatchReportRow[];
}

async function listMatchConciergeRequestsForUser(
  userId: string,
): Promise<MatchConciergeRequestRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_concierge_requests")
    .select("*")
    .or(`requester_profile_id.eq.${userId},target_profile_id.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MatchConciergeRequestRow[];
}

async function listNetworkInvitesForUser(userId: string): Promise<NetworkInviteRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_invites")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as NetworkInviteRow[];
}

async function getPersonalDelegateForUser(userId: string): Promise<PersonalDelegateRow | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("personal_delegates")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as PersonalDelegateRow | null;
}

async function listSourceConnectionsForUser(userId: string): Promise<SourceConnectionRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("source_connections")
    .select("*")
    .eq("profile_id", userId)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SourceConnectionRow[]).map((row) =>
    overlayBackgroundRecordSensitiveText(row, SOURCE_CONNECTION_SENSITIVE_TEXT_FIELDS),
  );
}

async function getProfileSynthesisForUser(userId: string): Promise<ProfileSynthesisRow | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_syntheses")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data
    ? overlayBackgroundRecordSensitiveText(
        data as ProfileSynthesisRow,
        PROFILE_SYNTHESIS_SENSITIVE_TEXT_FIELDS,
      )
    : null;
}

async function listBackgroundIntentClaimsForUser(
  userId: string,
): Promise<BackgroundIntentClaimRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("background_intent_claims")
    .select("*")
    .eq("profile_id", userId)
    .order("status", { ascending: true })
    .order("claim_type", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(80);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BackgroundIntentClaimRow[];
}

async function listHelperStrategiesForUser(userId: string): Promise<HelperStrategyRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("helper_strategies")
    .select("*")
    .eq("profile_id", userId)
    .order("priority", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as HelperStrategyRow[];
}

async function listHelperRunsForUser(userId: string): Promise<HelperRunRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("helper_runs")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as HelperRunRow[];
}

async function listIntroductionPlansForUser(userId: string): Promise<MatchIntroductionPlanRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_introduction_plans")
    .select("*")
    .or(`profile_id.eq.${userId},counterparty_id.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MatchIntroductionPlanRow[];
}

async function listIntroductionTasksForUser(userId: string): Promise<MatchIntroductionTaskRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_introduction_tasks")
    .select("*")
    .eq("profile_id", userId)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE * 3);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MatchIntroductionTaskRow[];
}

async function listPrivacyGrantsForUser(userId: string): Promise<PrivacyGrantRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("privacy_grants")
    .select("*")
    .or(`profile_id.eq.${userId},counterparty_id.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PrivacyGrantRow[];
}

async function listPrivacyAccessRequestsForUser(
  userId: string,
): Promise<PrivacyAccessRequestRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("privacy_access_requests")
    .select("*")
    .or(`owner_profile_id.eq.${userId},requester_profile_id.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PrivacyAccessRequestRow[];
}

async function listRiskSignalsForUser(userId: string): Promise<RiskSignalRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("risk_signals")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RiskSignalRow[];
}

async function listBrokerageBountiesForUser(userId: string): Promise<BrokerageBountyRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brokerage_bounties")
    .select("*")
    .eq("profile_id", userId)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BrokerageBountyRow[];
}

async function listAccessibleCollectiveIdsForUser(userId: string): Promise<string[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const [{ data: ownedCollectives, error: ownedError }, { data: memberships, error: membershipError }] =
    await Promise.all([
      supabase.from("collectives").select("id").eq("owner_id", userId),
      supabase
        .from("collective_members")
        .select("collective_id")
        .eq("profile_id", userId)
        .in("status", ["active", "invited"]),
    ]);

  if (ownedError) {
    throw new Error(ownedError.message);
  }

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  return [
    ...new Set([
      ...((ownedCollectives ?? []).map((collective) => collective.id) as string[]),
      ...((memberships ?? []).map((membership) => membership.collective_id) as string[]),
    ]),
  ];
}

async function listCollectivesForUser(userId: string): Promise<CollectiveRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const collectiveIds = await listAccessibleCollectiveIdsForUser(userId);
  if (!collectiveIds.length) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collectives")
    .select("*")
    .in("id", collectiveIds)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CollectiveRow[];
}

async function listCollectiveMembershipsForUser(userId: string): Promise<CollectiveMemberRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const collectiveIds = await listAccessibleCollectiveIdsForUser(userId);
  if (!collectiveIds.length) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collective_members")
    .select("*")
    .in("collective_id", collectiveIds)
    .order("created_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CollectiveMemberRow[];
}

async function listCollectiveDecisionsForUser(
  userId: string,
): Promise<CollectiveDecisionRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const collectiveIds = await listAccessibleCollectiveIdsForUser(userId);
  if (!collectiveIds.length) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collective_decisions")
    .select("*")
    .in("collective_id", collectiveIds)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CollectiveDecisionRow[];
}

async function listCollectiveDecisionResponsesForUser(
  userId: string,
): Promise<CollectiveDecisionResponseRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const collectiveIds = await listAccessibleCollectiveIdsForUser(userId);
  if (!collectiveIds.length) {
    return [];
  }

  const supabase = await createClient();
  const { data: decisions, error: decisionsError } = await supabase
    .from("collective_decisions")
    .select("id")
    .in("collective_id", collectiveIds);

  if (decisionsError) {
    throw new Error(decisionsError.message);
  }

  const decisionIds = ((decisions ?? []).map((decision) => decision.id) as string[]).slice(
    0,
    DASHBOARD_PAGE_SIZE,
  );

  if (!decisionIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("collective_decision_responses")
    .select("*")
    .in("decision_id", decisionIds)
    .order("responded_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CollectiveDecisionResponseRow[];
}

async function getPaymentAccountForUser(userId: string): Promise<ProfilePaymentAccountRow | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_payment_accounts")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as ProfilePaymentAccountRow | null;
}

async function listSavedSearchesForUser(userId: string): Promise<SavedSearchRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("profile_id", userId)
    .order("updated_at", { ascending: false })
    .limit(DASHBOARD_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SavedSearchRow[];
}

export async function getDashboardData(userId: string): Promise<DashboardDataResult> {
  if (!hasSupabaseEnv()) {
    return {
      offers: [],
      incomingInterests: [],
      interests: [],
      agreements: [],
      cartItems: [],
      wishProfile: null,
      profileSources: [],
      clarificationQuestions: [],
      matchSuggestions: [],
      wishNotifications: [],
      backgroundRuns: [],
      matchExplanationSnapshots: [],
      opportunityBriefs: [],
      introPackets: [],
      sourceSummaries: [],
      profileSignals: [],
      shadowRuns: [],
      grantReceipts: [],
      profileInterviewAnswers: [],
      collectivePolicies: [],
      muteRules: [],
      backgroundQueryEvents: [],
      backgroundNotificationPreferences: [],
      profileDataRightRequests: [],
      matchReports: [],
      matchConciergeRequests: [],
      networkInvites: [],
      personalDelegate: null,
      sourceConnections: [],
      profileSynthesis: null,
      intentClaims: [],
      helperStrategies: [],
      helperRuns: [],
      introductionPlans: [],
      introductionTasks: [],
      privacyGrants: [],
      privacyAccessRequests: [],
      riskSignals: [],
      brokerageBounties: [],
      collectives: [],
      collectiveMemberships: [],
      collectiveDecisions: [],
      collectiveDecisionResponses: [],
      paymentAccount: null,
      savedSearches: [],
      errors: {
        offers: null,
        incomingInterests: null,
        interests: null,
        relatedOffers: null,
        agreements: null,
        cartItems: null,
        wishProfile: null,
        profileSources: null,
        clarificationQuestions: null,
        matchSuggestions: null,
        wishNotifications: null,
        backgroundRuns: null,
        matchExplanationSnapshots: null,
        opportunityBriefs: null,
        introPackets: null,
        sourceSummaries: null,
        profileSignals: null,
        shadowRuns: null,
        grantReceipts: null,
        profileInterviewAnswers: null,
        collectivePolicies: null,
        muteRules: null,
        backgroundQueryEvents: null,
        backgroundNotificationPreferences: null,
        profileDataRightRequests: null,
        matchReports: null,
        matchConciergeRequests: null,
        networkInvites: null,
        personalDelegate: null,
        sourceConnections: null,
        profileSynthesis: null,
        intentClaims: null,
        helperStrategies: null,
        helperRuns: null,
        introductionPlans: null,
        introductionTasks: null,
        privacyGrants: null,
        privacyAccessRequests: null,
        riskSignals: null,
        brokerageBounties: null,
        collectives: null,
        collectiveMemberships: null,
        collectiveDecisions: null,
        collectiveDecisionResponses: null,
        paymentAccount: null,
        savedSearches: null,
      },
    };
  }

  const supabase = await createClient();
  const errors: DashboardDataResult["errors"] = {
    offers: null,
    incomingInterests: null,
    interests: null,
    relatedOffers: null,
    agreements: null,
    cartItems: null,
    wishProfile: null,
    profileSources: null,
    clarificationQuestions: null,
    matchSuggestions: null,
    wishNotifications: null,
    backgroundRuns: null,
    matchExplanationSnapshots: null,
    opportunityBriefs: null,
    introPackets: null,
    sourceSummaries: null,
    profileSignals: null,
    shadowRuns: null,
    grantReceipts: null,
    profileInterviewAnswers: null,
    collectivePolicies: null,
    muteRules: null,
    backgroundQueryEvents: null,
    backgroundNotificationPreferences: null,
    profileDataRightRequests: null,
    matchReports: null,
    matchConciergeRequests: null,
    networkInvites: null,
    personalDelegate: null,
    sourceConnections: null,
    profileSynthesis: null,
    intentClaims: null,
    helperStrategies: null,
    helperRuns: null,
    introductionPlans: null,
    introductionTasks: null,
    privacyGrants: null,
    privacyAccessRequests: null,
    riskSignals: null,
    brokerageBounties: null,
    collectives: null,
    collectiveMemberships: null,
    collectiveDecisions: null,
    collectiveDecisionResponses: null,
    paymentAccount: null,
    savedSearches: null,
  };

  const [{ data: ownOffers, error: ownOffersError }, { data: interests, error: interestsError }] =
    await Promise.all([
      supabase
        .from("offers")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(DASHBOARD_PAGE_SIZE),
      supabase
        .from("interests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(DASHBOARD_PAGE_SIZE),
    ]);

  if (ownOffersError) {
    errors.offers = ownOffersError.message;
    logSupabaseError("Failed to load dashboard offers", ownOffersError, { userId });
  }

  if (interestsError) {
    errors.interests = interestsError.message;
    logSupabaseError("Failed to load dashboard interests", interestsError, { userId });
  }

  let hydratedOwnOffers: OfferRecord[] = [];
  if (ownOffers?.length) {
    try {
      hydratedOwnOffers = await hydrateOffers((ownOffers ?? []) as OfferRow[], userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load offers.";
      errors.offers = message;
      console.error("[supabase] Failed to hydrate dashboard offers", { message, userId });
    }
  }
  const ownOffersById = new Map(hydratedOwnOffers.map((offer) => [offer.id, offer]));

  const ownOfferIds = (ownOffers ?? []).map((offer) => offer.id);
  let incomingInterestRows: InterestRow[] = [];
  let incomingGuestInterestRows: GuestInterestRow[] = [];
  if (ownOfferIds.length) {
    const [{ data: incomingInterests, error: incomingInterestsError }, { data: incomingGuestInterests, error: incomingGuestInterestsError }] =
      await Promise.all([
        supabase
          .from("interests")
          .select("*")
          .in("offer_id", ownOfferIds)
          .order("created_at", { ascending: false })
          .limit(DASHBOARD_PAGE_SIZE),
        supabase
          .from("guest_interests")
          .select("*")
          .in("offer_id", ownOfferIds)
          .order("created_at", { ascending: false })
          .limit(DASHBOARD_PAGE_SIZE),
      ]);

    if (incomingInterestsError) {
      errors.incomingInterests = incomingInterestsError.message;
      logSupabaseError("Failed to load incoming member interests for owned offers", incomingInterestsError, {
        userId,
      });
    } else {
      incomingInterestRows = (incomingInterests ?? []) as InterestRow[];
    }

    if (incomingGuestInterestsError) {
      errors.incomingInterests = errors.incomingInterests ?? incomingGuestInterestsError.message;
      logSupabaseError(
        "Failed to load incoming guest interests for owned offers",
        incomingGuestInterestsError,
        {
          userId,
        },
      );
    } else {
      incomingGuestInterestRows = (incomingGuestInterests ?? []) as GuestInterestRow[];
    }
  }

  const interestRows = (interests ?? []) as InterestRow[];
  const relatedOfferIds = [...new Set(interestRows.map((interest) => interest.offer_id))];
  let relatedOffers = new Map<string, OfferRecord>();

  if (relatedOfferIds.length) {
    const { data: rawRelatedOffers, error: relatedOffersError } = await supabase
      .from("offers")
      .select("*")
      .in("id", relatedOfferIds);

    if (relatedOffersError) {
      errors.relatedOffers = relatedOffersError.message;
      logSupabaseError("Failed to load related offers for dashboard interests", relatedOffersError, {
        userId,
      });
    } else {
      try {
        const hydrated = await hydrateOffers((rawRelatedOffers ?? []) as OfferRow[], userId);
        relatedOffers = new Map(hydrated.map((offer) => [offer.id, offer]));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to hydrate related offers.";
        errors.relatedOffers = message;
        console.error("[supabase] Failed to hydrate related offers", { message, userId });
      }
    }
  }

  let participantMap = new Map<string, PublicProfileSummary>();
  if (interestRows.length) {
    try {
      participantMap = await getProfileSummaryMap(
        userId,
        interestRows.map((interest) => interest.user_id),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load participant profiles.";
      errors.interests = errors.interests ?? message;
      console.error("[supabase] Failed to load interest participant profiles", { message, userId });
    }
  }

  let incomingResponses: IncomingResponseRecord[] = [];
  if (incomingInterestRows.length || incomingGuestInterestRows.length) {
    try {
      incomingResponses = await hydrateIncomingResponses(
        incomingInterestRows,
        incomingGuestInterestRows,
        ownOffersById,
        userId,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load incoming response details.";
      errors.incomingInterests = errors.incomingInterests ?? message;
      console.error("[supabase] Failed to hydrate incoming responses", {
        message,
        userId,
      });
    }
  }

  let agreements: AgreementRecord[] = [];
  try {
    agreements = await listAgreementsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load agreements.";
    errors.agreements = message;
    console.error("[supabase] Failed to load dashboard agreements", { message, userId });
  }

  let cartItems: CartItemRecord[] = [];
  try {
    cartItems = await listCartItems(userId, DASHBOARD_PAGE_SIZE);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load saved offers.";
    errors.cartItems = message;
    console.error("[supabase] Failed to load dashboard saved offers", { message, userId });
  }

  let wishProfile: WishProfileRecord | null = null;
  try {
    wishProfile = await getWishProfileForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load wish profile.";
    errors.wishProfile = message;
    console.error("[supabase] Failed to load dashboard wish profile", { message, userId });
  }

  let profileSources: ProfileSourceRow[] = [];
  try {
    profileSources = await listProfileSourcesForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load profile sources.";
    errors.profileSources = message;
    console.error("[supabase] Failed to load profile sources", { message, userId });
  }

  let clarificationQuestions: ClarificationQuestionRow[] = [];
  try {
    clarificationQuestions = await listClarificationQuestionsForUser(userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load clarification questions.";
    errors.clarificationQuestions = message;
    console.error("[supabase] Failed to load clarification questions", { message, userId });
  }

  let matchSuggestions: MatchSuggestionRecord[] = [];
  try {
    matchSuggestions = await listMatchSuggestionsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load match suggestions.";
    errors.matchSuggestions = message;
    console.error("[supabase] Failed to load dashboard match suggestions", { message, userId });
  }

  let wishNotifications: WishNotificationRecord[] = [];
  try {
    wishNotifications = await listWishNotificationsForUser(userId, matchSuggestions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load wish notifications.";
    errors.wishNotifications = message;
    console.error("[supabase] Failed to load dashboard wish notifications", { message, userId });
  }

  let backgroundRuns: BackgroundMatchRunRow[] = [];
  try {
    backgroundRuns = await listBackgroundMatchRunsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load background runs.";
    errors.backgroundRuns = message;
    console.error("[supabase] Failed to load background match runs", { message, userId });
  }

  let matchExplanationSnapshots: MatchExplanationSnapshotRow[] = [];
  try {
    matchExplanationSnapshots = await listMatchExplanationSnapshotsForUser(userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load match explanation snapshots.";
    errors.matchExplanationSnapshots = message;
    console.error("[supabase] Failed to load match explanation snapshots", { message, userId });
  }

  let opportunityBriefs: BackgroundRequesterOpportunityBriefCard[] = [];
  try {
    opportunityBriefs = await listOpportunityBriefsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load opportunity briefs.";
    errors.opportunityBriefs = message;
    console.error("[supabase] Failed to load opportunity briefs", { message, userId });
  }

  let introPackets: BackgroundIntroPacketRow[] = [];
  try {
    introPackets = await listIntroPacketsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load intro packets.";
    errors.introPackets = message;
    console.error("[supabase] Failed to load intro packets", { message, userId });
  }

  let sourceSummaries: BackgroundSourceSummaryRow[] = [];
  try {
    sourceSummaries = await listBackgroundSourceSummariesForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load source summaries.";
    errors.sourceSummaries = message;
    console.error("[supabase] Failed to load source summaries", { message, userId });
  }

  let profileSignals: BackgroundProfileSignalRow[] = [];
  try {
    profileSignals = await listBackgroundProfileSignalsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load profile signals.";
    errors.profileSignals = message;
    console.error("[supabase] Failed to load profile signals", { message, userId });
  }

  let shadowRuns: BackgroundShadowRunRow[] = [];
  try {
    shadowRuns = await listBackgroundShadowRunsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load shadow source runs.";
    errors.shadowRuns = message;
    console.error("[supabase] Failed to load shadow source runs", { message, userId });
  }

  let grantReceipts: BackgroundGrantReceiptRow[] = [];
  try {
    grantReceipts = await listBackgroundGrantReceiptsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load grant receipts.";
    errors.grantReceipts = message;
    console.error("[supabase] Failed to load grant receipts", { message, userId });
  }

  let profileInterviewAnswers: BackgroundProfileInterviewAnswerRow[] = [];
  try {
    profileInterviewAnswers = await listProfileInterviewAnswersForUser(userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load profile interview answers.";
    errors.profileInterviewAnswers = message;
    console.error("[supabase] Failed to load profile interview answers", { message, userId });
  }

  let muteRules: BackgroundMuteRuleRow[] = [];
  try {
    muteRules = await listBackgroundMuteRulesForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load mute rules.";
    errors.muteRules = message;
    console.error("[supabase] Failed to load mute rules", { message, userId });
  }

  let backgroundQueryEvents: BackgroundQueryEventRow[] = [];
  try {
    backgroundQueryEvents = await listBackgroundQueryEventsForUser(userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load background query events.";
    errors.backgroundQueryEvents = message;
    console.error("[supabase] Failed to load background query events", { message, userId });
  }

  let backgroundNotificationPreferences: BackgroundNotificationPreferenceRow[] = [];
  try {
    backgroundNotificationPreferences = await listBackgroundNotificationPreferencesForUser(userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load background notification preferences.";
    errors.backgroundNotificationPreferences = message;
    console.error("[supabase] Failed to load background notification preferences", {
      message,
      userId,
    });
  }

  let profileDataRightRequests: ProfileDataRightRequestRow[] = [];
  try {
    profileDataRightRequests = await listProfileDataRightRequestsForUser(userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load data-right requests.";
    errors.profileDataRightRequests = message;
    console.error("[supabase] Failed to load profile data-right requests", { message, userId });
  }

  let matchReports: MatchReportRow[] = [];
  try {
    matchReports = await listMatchReportsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load match reports.";
    errors.matchReports = message;
    console.error("[supabase] Failed to load match reports", { message, userId });
  }

  let matchConciergeRequests: MatchConciergeRequestRow[] = [];
  try {
    matchConciergeRequests = await listMatchConciergeRequestsForUser(userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load match concierge requests.";
    errors.matchConciergeRequests = message;
    console.error("[supabase] Failed to load match concierge requests", { message, userId });
  }

  let networkInvites: NetworkInviteRow[] = [];
  try {
    networkInvites = await listNetworkInvitesForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load network invites.";
    errors.networkInvites = message;
    console.error("[supabase] Failed to load network invites", { message, userId });
  }

  let personalDelegate: PersonalDelegateRow | null = null;
  try {
    personalDelegate = await getPersonalDelegateForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load personal delegate.";
    errors.personalDelegate = message;
    console.error("[supabase] Failed to load personal delegate", { message, userId });
  }

  let sourceConnections: SourceConnectionRow[] = [];
  try {
    sourceConnections = await listSourceConnectionsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load source connections.";
    errors.sourceConnections = message;
    console.error("[supabase] Failed to load source connections", { message, userId });
  }

  let profileSynthesis: ProfileSynthesisRow | null = null;
  try {
    profileSynthesis = await getProfileSynthesisForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load profile synthesis.";
    errors.profileSynthesis = message;
    console.error("[supabase] Failed to load profile synthesis", { message, userId });
  }

  let intentClaims: BackgroundIntentClaimRow[] = [];
  try {
    intentClaims = await listBackgroundIntentClaimsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load intent claims.";
    errors.intentClaims = message;
    console.error("[supabase] Failed to load background intent claims", { message, userId });
  }

  let helperStrategies: HelperStrategyRow[] = [];
  try {
    helperStrategies = await listHelperStrategiesForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load helper strategies.";
    errors.helperStrategies = message;
    console.error("[supabase] Failed to load helper strategies", { message, userId });
  }

  let helperRuns: HelperRunRow[] = [];
  try {
    helperRuns = await listHelperRunsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load helper runs.";
    errors.helperRuns = message;
    console.error("[supabase] Failed to load helper runs", { message, userId });
  }

  let introductionPlans: MatchIntroductionPlanRow[] = [];
  try {
    introductionPlans = await listIntroductionPlansForUser(userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load introduction plans.";
    errors.introductionPlans = message;
    console.error("[supabase] Failed to load introduction plans", { message, userId });
  }

  let introductionTasks: MatchIntroductionTaskRow[] = [];
  try {
    introductionTasks = await listIntroductionTasksForUser(userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load introduction tasks.";
    errors.introductionTasks = message;
    console.error("[supabase] Failed to load introduction tasks", { message, userId });
  }

  let privacyGrants: PrivacyGrantRow[] = [];
  try {
    privacyGrants = await listPrivacyGrantsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load privacy grants.";
    errors.privacyGrants = message;
    console.error("[supabase] Failed to load privacy grants", { message, userId });
  }

  let privacyAccessRequests: PrivacyAccessRequestRow[] = [];
  try {
    privacyAccessRequests = await listPrivacyAccessRequestsForUser(userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load privacy access requests.";
    errors.privacyAccessRequests = message;
    console.error("[supabase] Failed to load privacy access requests", { message, userId });
  }

  let riskSignals: RiskSignalRow[] = [];
  try {
    riskSignals = await listRiskSignalsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load risk signals.";
    errors.riskSignals = message;
    console.error("[supabase] Failed to load risk signals", { message, userId });
  }

  let brokerageBounties: BrokerageBountyRow[] = [];
  try {
    brokerageBounties = await listBrokerageBountiesForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load brokerage bounties.";
    errors.brokerageBounties = message;
    console.error("[supabase] Failed to load brokerage bounties", { message, userId });
  }

  let collectives: CollectiveRow[] = [];
  try {
    collectives = await listCollectivesForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load collectives.";
    errors.collectives = message;
    console.error("[supabase] Failed to load collectives", { message, userId });
  }

  let collectiveMemberships: CollectiveMemberRow[] = [];
  try {
    collectiveMemberships = await listCollectiveMembershipsForUser(userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load collective memberships.";
    errors.collectiveMemberships = message;
    console.error("[supabase] Failed to load collective memberships", { message, userId });
  }

  let collectiveDecisions: CollectiveDecisionRow[] = [];
  try {
    collectiveDecisions = await listCollectiveDecisionsForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load collective decisions.";
    errors.collectiveDecisions = message;
    console.error("[supabase] Failed to load collective decisions", { message, userId });
  }

  let collectiveDecisionResponses: CollectiveDecisionResponseRow[] = [];
  try {
    collectiveDecisionResponses = await listCollectiveDecisionResponsesForUser(userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load collective decision responses.";
    errors.collectiveDecisionResponses = message;
    console.error("[supabase] Failed to load collective decision responses", { message, userId });
  }

  const collectivePolicyIds = [
    ...new Set([
      ...collectives.map((collective) => collective.id),
      ...collectiveMemberships.map((membership) => membership.collective_id),
    ]),
  ];
  let collectivePolicies: BackgroundCollectivePolicyRow[] = [];
  try {
    collectivePolicies = await listBackgroundCollectivePoliciesForUser(collectivePolicyIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load collective policies.";
    errors.collectivePolicies = message;
    console.error("[supabase] Failed to load collective policies", { message, userId });
  }

  let paymentAccount: ProfilePaymentAccountRow | null = null;
  try {
    paymentAccount = await getPaymentAccountForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load payment account.";
    errors.paymentAccount = message;
    console.error("[supabase] Failed to load payment account", { message, userId });
  }

  let savedSearches: SavedSearchRow[] = [];
  try {
    savedSearches = await listSavedSearchesForUser(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load saved searches.";
    errors.savedSearches = message;
    console.error("[supabase] Failed to load saved searches", { message, userId });
  }

  return {
    offers: hydratedOwnOffers,
    incomingInterests: incomingResponses,
    interests: interestRows.map((interest) => ({
      ...interest,
      offer: relatedOffers.get(interest.offer_id) ?? null,
      participantProfile: participantMap.get(interest.user_id) ?? null,
    })),
    agreements,
    cartItems,
    wishProfile,
    profileSources,
    clarificationQuestions,
    matchSuggestions,
    wishNotifications,
    backgroundRuns,
    matchExplanationSnapshots,
    opportunityBriefs,
    introPackets,
    sourceSummaries,
    profileSignals,
    shadowRuns,
    grantReceipts,
    profileInterviewAnswers,
    collectivePolicies,
    muteRules,
    backgroundQueryEvents,
    backgroundNotificationPreferences,
    profileDataRightRequests,
    matchReports,
    matchConciergeRequests,
    networkInvites,
    personalDelegate,
    sourceConnections,
    profileSynthesis,
    intentClaims,
    helperStrategies,
    helperRuns,
    introductionPlans,
    introductionTasks,
    privacyGrants,
    privacyAccessRequests,
    riskSignals,
    brokerageBounties,
    collectives,
    collectiveMemberships,
    collectiveDecisions,
    collectiveDecisionResponses,
    paymentAccount,
    savedSearches,
    errors,
  };
}
