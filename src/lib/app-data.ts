import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import type { Database } from "@/lib/supabase/database.types";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
type InterestRow = Database["public"]["Tables"]["interests"]["Row"];
type GuestInterestRow = Database["public"]["Tables"]["guest_interests"]["Row"];
type AgreementRow = Database["public"]["Tables"]["agreements"]["Row"];
type AgreementRatingRow = Database["public"]["Tables"]["agreement_ratings"]["Row"];
type UserFollowRow = Database["public"]["Tables"]["user_follows"]["Row"];
type OfferRecommendationRow = Database["public"]["Tables"]["offer_recommendations"]["Row"];
type OfferCommentRow = Database["public"]["Tables"]["offer_comments"]["Row"];
type CommentVoteRow = Database["public"]["Tables"]["comment_votes"]["Row"];
type OfferCartRow = Database["public"]["Tables"]["offer_carts"]["Row"];
type InterestStatus = Database["public"]["Enums"]["interest_status"];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type PeopleSort = "rating" | "followers" | "karma" | "comments";
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
}

export interface OfferRecord extends OfferRow {
  ownerProfile: PublicProfileSummary | null;
  recommendationCount: number;
  commentCount: number;
  isInCart: boolean;
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
  errors: {
    offers: string | null;
    incomingInterests: string | null;
    interests: string | null;
    relatedOffers: string | null;
    agreements: string | null;
    cartItems: string | null;
  };
}

export interface PublicProfilePageData {
  profile: PublicProfileSummary | null;
  offers: OfferRecord[];
  profileRecommendations: OfferRecommendationRecord[];
  authoredCommentCount: number;
}

export interface OfferCartState {
  isInCart: boolean;
  cartCount: number | null;
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
    city: profile?.city ?? null,
    region: profile?.region ?? null,
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
  const [{ data: profiles, error: profilesError }, followsResult] = await Promise.all([
    supabase.from("profiles").select("*").in("id", uniqueProfileIds),
    viewerId
      ? supabase
          .from("user_follows")
          .select("followed_id")
          .eq("follower_id", viewerId)
          .in("followed_id", uniqueProfileIds)
      : Promise.resolve({ data: [] as Pick<UserFollowRow, "followed_id">[], error: null }),
  ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }
  if (followsResult.error) {
    throw new Error(followsResult.error.message);
  }

  const viewerFollowing = new Set((followsResult.data ?? []).map((row) => row.followed_id));

  return new Map(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [
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
      } satisfies PublicProfileSummary,
    ]),
  );
}

async function hydrateOffers(
  offers: OfferRow[],
  viewerId?: string | null,
): Promise<OfferRecord[]> {
  if (!offers.length) {
    return [];
  }

  const supabase = await createClient();
  const offerIds = offers.map((offer) => offer.id);
  const ownerIds = [...new Set(offers.map((offer) => offer.owner_id))];
  const [profileMap, { data: recommendations, error: recommendationsError }, { data: comments, error: commentsError }, cartResult] =
    await Promise.all([
      getProfileSummaryMap(viewerId, ownerIds),
      supabase.from("offer_recommendations").select("*").in("recommended_offer_id", offerIds),
      supabase.from("offer_comments").select("*").in("offer_id", offerIds),
      viewerId
        ? supabase.from("offer_carts").select("*").eq("user_id", viewerId).in("offer_id", offerIds)
        : Promise.resolve({ data: [] as OfferCartRow[], error: null }),
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

  return offers.map((offer) => ({
    ...offer,
    ownerProfile: profileMap.get(offer.owner_id) ?? null,
    recommendationCount: recommendationCounts.get(offer.id) ?? 0,
    commentCount: commentCounts.get(offer.id) ?? 0,
    isInCart: cartSet.has(offer.id),
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
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    logSupabaseError("Failed to resolve authenticated user", authError);
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
  if (sort === "followers") {
    return query
      .order("follower_count", { ascending: false })
      .order("offer_count", { ascending: false })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
  }

  if (sort === "karma") {
    return query
      .order("karma", { ascending: false })
      .order("offer_count", { ascending: false })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
  }

  if (sort === "comments") {
    return query
      .order("comment_count", { ascending: false })
      .order("offer_count", { ascending: false })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
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
    const target = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
    redirect(target);
  }

  return viewer;
}

export async function listOpenOffersPage(
  page = 1,
  pageSize = OFFERS_PAGE_SIZE,
): Promise<PaginatedResult<OfferRecord>> {
  if (!hasSupabaseEnv()) {
    return buildPaginatedResult([], normalizePage(page), pageSize);
  }

  const normalizedPage = normalizePage(page);
  const offset = (normalizedPage - 1) * pageSize;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + pageSize);

  if (error) {
    throw new Error(error.message);
  }

  const viewer = await getViewer();
  const hydrated = await hydrateOffers((data ?? []) as OfferRow[], viewer?.authUser.id);
  return buildPaginatedResult(hydrated, normalizedPage, pageSize);
}

export async function listOpenOffersPreview(limit = 120) {
  if (!hasSupabaseEnv()) {
    return [] as OfferRecord[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const viewer = await getViewer();
  return hydrateOffers((data ?? []) as OfferRow[], viewer?.authUser.id);
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
  const query = applyPublicProfileSort(supabase.from("profiles").select("*"), sort).range(
    offset,
    offset + pageSize,
  );
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const profiles = (data ?? []) as ProfileRow[];
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

export async function getPublicProfilePageData(profileId: string, viewerId?: string | null) {
  if (!hasSupabaseEnv()) {
    return {
      profile: null,
      offers: [],
      profileRecommendations: [],
      authoredCommentCount: 0,
    } satisfies PublicProfilePageData;
  }

  const supabase = await createClient();
  const [profileMap, offers, recommendations, { data: comments, error: commentsError }] =
    await Promise.all([
      getProfileSummaryMap(viewerId, [profileId]),
      listProfileOffers(profileId, viewerId),
      listProfileRecommendations(profileId),
      supabase.from("offer_comments").select("*").eq("author_id", profileId),
    ]);

  if (commentsError) {
    throw new Error(commentsError.message);
  }

  return {
    profile: profileMap.get(profileId) ?? null,
    offers,
    profileRecommendations: recommendations,
    authoredCommentCount: (comments ?? []).length,
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

  const agreements = (data ?? []) as AgreementRow[];
  if (!agreements.length) {
    return [];
  }

  const offerIds = [...new Set(agreements.map((agreement) => agreement.offer_id))];
  const profileIds = [
    ...new Set(
      agreements.flatMap((agreement) => [agreement.proposer_id, agreement.responder_id]),
    ),
  ];
  const agreementIds = agreements.map((agreement) => agreement.id);
  const [{ data: offers, error: offersError }, { data: ratings, error: ratingsError }, profileMap] =
    await Promise.all([
      supabase.from("offers").select("*").in("id", offerIds),
      supabase.from("agreement_ratings").select("*").in("agreement_id", agreementIds),
      getProfileSummaryMap(userId, profileIds),
    ]);

  if (offersError) {
    throw new Error(offersError.message);
  }
  if (ratingsError) {
    throw new Error(ratingsError.message);
  }

  const hydratedOffers = await hydrateOffers((offers ?? []) as OfferRow[], userId);
  const offersById = new Map(hydratedOffers.map((offer) => [offer.id, offer]));
  const ratingsByAgreement = new Map<string, AgreementRatingRecord[]>();

  for (const rating of (ratings ?? []) as AgreementRatingRow[]) {
    const bucket = ratingsByAgreement.get(rating.agreement_id) ?? [];
    bucket.push({
      ...rating,
      rater: profileMap.get(rating.rater_id) ?? null,
      ratedUser: profileMap.get(rating.rated_user_id) ?? null,
    });
    ratingsByAgreement.set(rating.agreement_id, bucket);
  }

  return agreements.map((agreement) => {
    const ratingsForAgreement = ratingsByAgreement.get(agreement.id) ?? [];
    const viewerRating =
      ratingsForAgreement.find((rating) => rating.rater_id === userId) ?? null;
    const counterpartyId =
      agreement.proposer_id === userId ? agreement.responder_id : agreement.proposer_id;

    return {
      ...agreement,
      offer: offersById.get(agreement.offer_id) ?? null,
      proposer: profileMap.get(agreement.proposer_id) ?? null,
      responder: profileMap.get(agreement.responder_id) ?? null,
      counterparty: profileMap.get(counterpartyId) ?? null,
      viewerRating,
    } satisfies AgreementRecord;
  });
}

export async function getDashboardData(userId: string): Promise<DashboardDataResult> {
  if (!hasSupabaseEnv()) {
    return {
      offers: [],
      incomingInterests: [],
      interests: [],
      agreements: [],
      cartItems: [],
      errors: {
        offers: null,
        incomingInterests: null,
        interests: null,
        relatedOffers: null,
        agreements: null,
        cartItems: null,
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
    const message = error instanceof Error ? error.message : "Unable to load cart items.";
    errors.cartItems = message;
    console.error("[supabase] Failed to load dashboard cart items", { message, userId });
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
    errors,
  };
}
