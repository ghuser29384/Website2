"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { deriveDisplayName, ensureAccountRowsForUser, getViewer, requireViewer } from "@/lib/app-data";
import { getSafeInternalPath } from "@/lib/paths";

type WishEntryRow = Database["public"]["Tables"]["wish_entries"]["Row"];
type WishProfilePreviewRow = Database["public"]["Views"]["wish_profile_previews"]["Row"];

function redirectWithMessage(
  path: string,
  key: "error" | "message",
  message: string,
): never {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
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

function normalizeOfferMode(value: string) {
  if (value === "offset" || value === "payment") {
    return value;
  }

  return "pledge";
}

function normalizePaymentIntervalUnit(value: string) {
  if (value === "day" || value === "month" || value === "year") {
    return value;
  }

  return null;
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

function getOrderedProfilePair(profileId: string, counterpartyId: string) {
  return profileId < counterpartyId
    ? { profileAId: profileId, profileBId: counterpartyId, viewerIsProfileA: true }
    : { profileAId: counterpartyId, profileBId: profileId, viewerIsProfileA: false };
}

function getSharedCause(left: string[], right: string[]) {
  const rightSet = new Set(right.map(normalizeMatchToken));
  return left.find((cause) => rightSet.has(normalizeMatchToken(cause))) ?? null;
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
}: {
  profileId: string;
  causes: string[];
  wishText: string;
  askText: string;
  offerText: string;
  openToPayment: boolean;
  openToPledges: boolean;
  viewerEntry: WishEntryRow | null;
}) {
  const supabase = await createClient();
  const { data: previews, error } = await supabase
    .from("wish_profile_previews")
    .select("*")
    .neq("profile_id", profileId)
    .limit(40);

  if (error) {
    logSupabaseActionError("Failed to load wish previews for match generation", error, {
      profileId,
    });
    return;
  }

  const currentProfileText = `${wishText} ${askText} ${offerText}`.toLowerCase();
  const generatedNotifications: Database["public"]["Tables"]["wish_notifications"]["Insert"][] = [];

  for (const preview of (previews ?? []) as WishProfilePreviewRow[]) {
    const sharedCause = getSharedCause(causes, preview.causes ?? []);
    const previewText = `${preview.public_preview} ${(preview.causes ?? []).join(" ")}`.toLowerCase();
    const paymentCompatible = openToPayment && preview.openness_to_payment;
    const pledgeCompatible = openToPledges && preview.openness_to_pledges;
    const vegetarianCue =
      causes.some((cause) => normalizeMatchToken(cause).includes("animal")) &&
      /\b(vegetarian|vegan|meat|diet)\b/i.test(previewText);
    const textCompatible =
      currentProfileText
        .split(/\W+/)
        .filter((token) => token.length > 5)
        .some((token) => previewText.includes(token)) || vegetarianCue;

    if (!sharedCause && !paymentCompatible && !pledgeCompatible && !textCompatible) {
      continue;
    }

    const { profileAId, profileBId, viewerIsProfileA } = getOrderedProfilePair(
      profileId,
      preview.profile_id,
    );
    const score =
      (sharedCause ? 45 : 0) +
      (textCompatible ? 25 : 0) +
      (paymentCompatible ? 15 : 0) +
      (pledgeCompatible ? 15 : 0);
    const viewerReason = sharedCause
      ? `You named ${sharedCause}; this profile has a compatible public preview and may be worth exploring without revealing exact wishes first.`
      : `This profile appears compatible with your stated wishes and trade constraints, but exact asks remain private until both sides consent.`;
    const counterpartyReason = sharedCause
      ? `A potential counterparty also named ${sharedCause}; exact wishes remain private until both sides consent.`
      : `A potential counterparty has a compatible private wish profile; exact wishes remain private until both sides consent.`;
    const dedupeKey = [profileAId, profileBId, normalizeMatchToken(sharedCause ?? "general")].join(":");
    const { data: existingMatch } = await supabase
      .from("match_suggestions")
      .select("id")
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();
    const { data: match, error: matchError } = await supabase
      .from("match_suggestions")
      .upsert(
        {
          profile_a_id: profileAId,
          profile_b_id: profileBId,
          profile_a_entry_id: viewerIsProfileA ? viewerEntry?.id ?? null : null,
          profile_b_entry_id: viewerIsProfileA ? null : viewerEntry?.id ?? null,
          reason_for_a: viewerIsProfileA ? viewerReason : counterpartyReason,
          reason_for_b: viewerIsProfileA ? counterpartyReason : viewerReason,
          score: Math.min(100, Math.max(0, score || 45)),
          status: "suggested",
          dedupe_key: dedupeKey,
        },
        {
          onConflict: "dedupe_key",
        },
      )
      .select("*")
      .maybeSingle();

    if (matchError || !match) {
      logSupabaseActionError("Failed to generate wish match suggestion", matchError, {
        profileId,
        counterpartyId: preview.profile_id,
      });
      continue;
    }

    if (!existingMatch) {
      generatedNotifications.push(
        {
          profile_id: profileId,
          match_id: match.id,
          kind: "match",
          title: "A potential moral trade was found",
          body: viewerReason,
        },
        {
          profile_id: preview.profile_id,
          match_id: match.id,
          kind: "match",
          title: "A potential moral trade was found",
          body: counterpartyReason,
        },
      );
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
}

export async function signUpAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/signup", "error", "Supabase is not configured yet.");
  }

  const email = readRequired(formData, "email");
  const password = readRequired(formData, "password");
  const displayName = readRequired(formData, "display_name");
  const city = readOptional(formData, "city");
  const region = readOptional(formData, "region");

  if (!email || !password) {
    redirectWithMessage("/signup", "error", "Email and password are required.");
  }

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

  const email = readRequired(formData, "email");
  const password = readRequired(formData, "password");
  const next = getSafeInternalPath(readRequired(formData, "next"), "/dashboard");

  if (!email || !password) {
    redirectWithMessage("/login", "error", "Email and password are required.");
  }

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

  const mode = readRequired(formData, "mode");
  const normalizedMode = normalizeOfferMode(mode);
  const offeredCause = readRequired(formData, "offered_cause");
  const requestedCause = readRequired(formData, "requested_cause");
  const offerAction = readRequired(formData, "offer_action");
  const requestAction = readRequired(formData, "request_action");
  const compromiseCause = readRequired(formData, "compromise_cause") || "Not needed";
  const verification = readRequired(formData, "verification");
  const duration = readRequired(formData, "duration");
  const paymentIntervalUnit = normalizePaymentIntervalUnit(
    readOptional(formData, "payment_interval_unit"),
  );
  const paymentIntervalValue =
    normalizedMode === "payment" && paymentIntervalUnit
      ? readBoundedInt(formData, "payment_interval_value", {
          fallback: 1,
          min: 1,
          max: 3650,
        })
      : null;
  const notes = readRequired(formData, "notes");
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

  if (!offerAction || !requestAction || !offeredCause || !requestedCause) {
    redirectWithMessage("/offers/new", "error", "Complete all required offer fields.");
  }

  const ownerAlias = deriveDisplayName(viewer.authUser, viewer.profile);
  await ensureAccountRowsForUser(viewer.authUser, supabase);

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
      payment_interval_unit: normalizedMode === "payment" ? paymentIntervalUnit : null,
      payment_interval_value: paymentIntervalValue,
      trust_level: trustLevel,
      notes,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    logSupabaseActionError("Failed to create offer", error, {
      ownerId: viewer.authUser.id,
      mode: normalizedMode,
    });
    redirectWithMessage("/offers/new", "error", error?.message ?? "Unable to create offer.");
  }

  revalidatePath("/offers");
  revalidatePath("/dashboard");
  redirectWithMessage(`/offers/${data.id}`, "message", "Offer created successfully.");
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
  const bio = readOptional(formData, "bio");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      city: city || null,
      region: region || null,
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
  const tradeShape = readOptional(formData, "trade_shape") || "Open to proposals";
  const openToPayment = readBoolean(formData, "open_to_payment");
  const openToPledges = readBoolean(formData, "open_to_pledges");
  const isDiscoverable = readBoolean(formData, "is_discoverable");
  const shareLocation = readBoolean(formData, "share_location");
  const sharePublicPreview = readBoolean(formData, "share_public_preview");

  const safetyBlock = detectBlockedWishText([
    ...causes,
    ...offers,
    wishText,
    askText,
    constraints,
    verificationPreferences,
    locationCity,
    locationRegion,
  ]);

  if (safetyBlock) {
    const { error: profileError } = await supabase.from("wish_profiles").upsert(
      {
        profile_id: viewer.authUser.id,
        causes,
        location_city: locationCity || null,
        location_region: locationRegion || null,
        constraints: "",
        verification_preferences: "",
        openness_to_payment: false,
        openness_to_pledges: false,
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
      causes,
      location_city: locationCity || null,
      location_region: locationRegion || null,
      constraints,
      verification_preferences: verificationPreferences,
      openness_to_payment: openToPayment,
      openness_to_pledges: openToPledges,
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

  if (isDiscoverable && sharePublicPreview) {
    const viewerEntry =
      ((insertedEntries ?? []) as WishEntryRow[]).find((entry) => entry.entry_type === "ask") ??
      ((insertedEntries ?? []) as WishEntryRow[])[0] ??
      null;

    await generateWishMatchSuggestions({
      profileId: viewer.authUser.id,
      causes,
      wishText,
      askText,
      offerText: offers.join(", "),
      openToPayment,
      openToPledges,
      viewerEntry,
    });
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
  const { data: match, error: matchError } = await supabase
    .from("match_suggestions")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    redirectWithMessage(returnTo, "error", matchError?.message ?? "Match suggestion not found.");
  }

  const viewerIsParticipant =
    match.profile_a_id === viewer.authUser.id || match.profile_b_id === viewer.authUser.id;

  if (!viewerIsParticipant) {
    redirectWithMessage(returnTo, "error", "You can only consent to your own match suggestions.");
  }

  const counterpartyId =
    match.profile_a_id === viewer.authUser.id ? match.profile_b_id : match.profile_a_id;

  const { error: consentError } = await supabase.from("match_consents").upsert(
    {
      match_id: matchId,
      profile_id: viewer.authUser.id,
      note,
      consented_at: new Date().toISOString(),
    },
    {
      onConflict: "match_id,profile_id",
    },
  );

  if (consentError) {
    logSupabaseActionError("Failed to record match consent", consentError, {
      matchId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", consentError.message);
  }

  const { data: consents, error: consentsError } = await supabase
    .from("match_consents")
    .select("*")
    .eq("match_id", matchId);

  if (consentsError) {
    logSupabaseActionError("Failed to check match consent state", consentsError, {
      matchId,
    });
  }

  const consentedProfiles = new Set((consents ?? []).map((consent) => consent.profile_id));
  const bothConsented =
    consentedProfiles.has(viewer.authUser.id) && consentedProfiles.has(counterpartyId);

  if (bothConsented) {
    const { error: revealError } = await supabase
      .from("match_suggestions")
      .update({
        identity_revealed: true,
        status: "introduced",
      })
      .eq("id", matchId);

    if (revealError) {
      logSupabaseActionError("Failed to reveal consented match", revealError, {
        matchId,
      });
    }

    const { error: notificationError } = await supabase.from("wish_notifications").insert([
      {
        profile_id: viewer.authUser.id,
        match_id: matchId,
        kind: "consent",
        title: "Both sides opted in",
        body: "Identity details can now be shown for this possible moral trade.",
      },
      {
        profile_id: counterpartyId,
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
