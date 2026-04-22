"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getSiteUrl, hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { deriveDisplayName, ensureAccountRowsForUser, getViewer, requireViewer } from "@/lib/app-data";
import { getSafeInternalPath } from "@/lib/paths";
import {
  calculatePlatformFeeCents,
  getStripe,
  hasStripeEnv,
} from "@/lib/stripe";

type WishEntryRow = Database["public"]["Tables"]["wish_entries"]["Row"];
type WishProfileRow = Database["public"]["Tables"]["wish_profiles"]["Row"];
type WishProfilePreviewRow = Database["public"]["Views"]["wish_profile_previews"]["Row"];
type ProfileSourceInsert = Database["public"]["Tables"]["profile_sources"]["Insert"];
type ClarificationQuestionInsert = Database["public"]["Tables"]["clarification_questions"]["Insert"];
type AgreementEventInsert = Database["public"]["Tables"]["agreement_events"]["Insert"];
type AgreementPaymentScheduleInsert = Database["public"]["Tables"]["agreement_payment_schedules"]["Insert"];
type AgreementPaymentStatus = NonNullable<
  Database["public"]["Tables"]["agreement_payments"]["Update"]["status"]
>;

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

function normalizeAgreementEventType(value: string): AgreementEventInsert["event_type"] {
  if (
    value === "counterproposal" ||
    value === "verification_submitted" ||
    value === "cancellation_requested" ||
    value === "dispute_opened" ||
    value === "status_change" ||
    value === "payment_update"
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

function getMeaningfulTokens(value: string) {
  const stopWords = new Set([
    "about",
    "after",
    "again",
    "could",
    "their",
    "there",
    "these",
    "those",
    "would",
    "should",
    "which",
    "while",
    "where",
    "people",
    "person",
    "trade",
    "moral",
  ]);

  return [
    ...new Set(
      value
        .toLowerCase()
        .split(/\W+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 4 && !stopWords.has(token)),
    ),
  ].slice(0, 24);
}

function buildClarificationQuestions({
  profileId,
  causes,
  offers,
  wishText,
  askText,
  constraints,
  verificationPreferences,
  capabilities,
  uncertaintyNotes,
}: {
  profileId: string;
  causes: string[];
  offers: string[];
  wishText: string;
  askText: string;
  constraints: string;
  verificationPreferences: string;
  capabilities: string;
  uncertaintyNotes: string;
}) {
  const questions: ClarificationQuestionInsert[] = [];

  if (!causes.length) {
    questions.push({
      profile_id: profileId,
      question: "Which cause areas matter most for possible moral trades?",
      reason: "Cause areas are the strongest non-AI filter for finding plausible counterparties.",
    });
  }

  if (!wishText) {
    questions.push({
      profile_id: profileId,
      question: "What concrete change would you most like another person or group to help bring about?",
      reason: "Specific wishes make rule-based matching less noisy.",
    });
  }

  if (!offers.length && !capabilities) {
    questions.push({
      profile_id: profileId,
      question: "What resources, actions, or commitments could you realistically offer?",
      reason: "The registry needs capabilities, not only values.",
    });
  }

  if (!askText) {
    questions.push({
      profile_id: profileId,
      question: "What would you ask a counterparty to do if a match looked promising?",
      reason: "Asks let possible counterparties decide whether exploration is worth their time.",
    });
  }

  if (!constraints) {
    questions.push({
      profile_id: profileId,
      question: "What proposals should be ruled out before any introduction is made?",
      reason: "Constraints are a safety filter and a privacy filter.",
    });
  }

  if (!verificationPreferences) {
    questions.push({
      profile_id: profileId,
      question: "What evidence, check-in, or verification would make a trade credible enough?",
      reason: "Verification preferences reduce factual-trust failures.",
    });
  }

  if (!uncertaintyNotes) {
    questions.push({
      profile_id: profileId,
      question: "Where are you uncertain enough that a clarifying conversation would help?",
      reason: "Uncertainty notes help distinguish serious opportunities from speculative noise.",
    });
  }

  return questions.slice(0, 6);
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
  const { data: previews, error } = await supabase
    .from("wish_profile_previews")
    .select("*")
    .neq("profile_id", profileId)
    .eq("background_search_enabled", true)
    .limit(40);

  if (error) {
    logSupabaseActionError("Failed to load wish previews for match generation", error, {
      profileId,
    });
    return { candidatesScanned: 0, matchesCreated: 0, matchesRefreshed: 0 };
  }

  let matchesCreated = 0;
  let matchesRefreshed = 0;
  const currentProfileText = `${causes.join(" ")} ${wishText} ${askText} ${offerText}`.toLowerCase();
  const currentTokens = getMeaningfulTokens(currentProfileText);
  const generatedNotifications: Database["public"]["Tables"]["wish_notifications"]["Insert"][] = [];

  for (const preview of (previews ?? []) as WishProfilePreviewRow[]) {
    const sharedCauses = causes.filter((cause) =>
      (preview.causes ?? []).map(normalizeMatchToken).includes(normalizeMatchToken(cause)),
    );
    const sharedCause = getSharedCause(causes, preview.causes ?? []);
    const previewText = `${preview.public_preview} ${(preview.causes ?? []).join(" ")}`.toLowerCase();
    const previewTokens = new Set(getMeaningfulTokens(previewText));
    const sharedTokens = currentTokens.filter((token) => previewTokens.has(token)).slice(0, 5);
    const paymentCompatible = openToPayment && preview.openness_to_payment;
    const pledgeCompatible = openToPledges && preview.openness_to_pledges;
    const vegetarianCue =
      causes.some((cause) => normalizeMatchToken(cause).includes("animal")) &&
      /\b(vegetarian|vegan|meat|diet)\b/i.test(previewText);
    const textCompatible = sharedTokens.length > 0 || vegetarianCue;

    if (!sharedCause && !paymentCompatible && !pledgeCompatible && !textCompatible) {
      continue;
    }

    const { profileAId, profileBId, viewerIsProfileA } = getOrderedProfilePair(
      profileId,
      preview.profile_id,
    );
    const score =
      (sharedCause ? 45 : 0) +
      (Math.min(sharedTokens.length, 4) * 7) +
      (vegetarianCue ? 18 : 0) +
      (paymentCompatible ? 15 : 0) +
      (pledgeCompatible ? 15 : 0);
    const matchBasis = [
      sharedCause ? `Shared cause area: ${sharedCause}` : "",
      sharedTokens.length ? `Shared terms: ${sharedTokens.join(", ")}` : "",
      paymentCompatible ? "Both profiles are open to payment-mediated trades" : "",
      pledgeCompatible ? "Both profiles are open to pledge-based trades" : "",
      vegetarianCue ? "Animal-welfare profile with vegetarianism-related language" : "",
      `Generated by non-AI rule scan: ${runReason}`,
    ].filter(Boolean);
    const viewerReason = sharedCause
      ? `You named ${sharedCause}; this profile has a compatible public preview and may be worth exploring without revealing exact wishes first.`
      : `This profile appears compatible with your stated wishes and trade constraints, but exact asks remain private until both sides consent.`;
    const counterpartyReason = sharedCause
      ? `A potential counterparty also named ${sharedCause}; exact wishes remain private until both sides consent.`
      : `A potential counterparty has a compatible private wish profile; exact wishes remain private until both sides consent.`;
    const suggestedFirstStep = sharedCause
      ? `If both sides opt in, start with a bounded proposal around ${sharedCause}: define the action, duration, cost, verification method, and exit condition.`
      : "If both sides opt in, exchange a short proposal before revealing any more sensitive details: action, burden, evidence, and non-negotiable constraints.";
    const riskNotes =
      "Rule-based suggestion only. Do not treat this as endorsement; review legality, coercion risk, privacy, and verification before acting.";
    const dedupeKey = [
      profileAId,
      profileBId,
      normalizeMatchToken(sharedCause ?? sharedTokens[0] ?? "general"),
    ].join(":");
    const { data: matchResult, error: matchError } = await supabase.rpc(
      "upsert_match_suggestion",
      {
        target_profile_a_id: profileAId,
        target_profile_b_id: profileBId,
        target_profile_a_entry_id: viewerIsProfileA ? viewerEntry?.id ?? null : null,
        target_profile_b_entry_id: viewerIsProfileA ? null : viewerEntry?.id ?? null,
        target_reason_for_a: viewerIsProfileA ? viewerReason : counterpartyReason,
        target_reason_for_b: viewerIsProfileA ? counterpartyReason : viewerReason,
        target_score: Math.min(100, Math.max(0, score || 45)),
        target_dedupe_key: dedupeKey,
        target_match_basis: matchBasis,
        target_shared_causes: sharedCauses,
        target_suggested_first_step: suggestedFirstStep,
        target_risk_notes: riskNotes,
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
          body: viewerReason,
        },
        {
          profile_id: preview.profile_id,
          match_id: match.match_id,
          kind: "match",
          title: "A potential moral trade was found",
          body: counterpartyReason,
        },
      );
    } else {
      matchesRefreshed += 1;
    }

    const { error: auditError } = await supabase.from("match_audit_events").insert({
      match_id: match.match_id,
      actor_profile_id: profileId,
      event_type: match.was_created ? "match_created" : "match_refreshed",
      summary: `Rule-based scan found compatibility with score ${Math.min(100, Math.max(0, score || 45))}.`,
      metadata: {
        basis: matchBasis,
        sharedCauses,
        runReason,
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
    candidatesScanned: (previews ?? []).length,
    matchesCreated,
    matchesRefreshed,
  };
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

  const clarificationQuestions = buildClarificationQuestions({
    profileId: viewer.authUser.id,
    causes,
    offers,
    wishText,
    askText,
    constraints,
    verificationPreferences,
    capabilities,
    uncertaintyNotes,
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

  if (manualSourceReviewEnabled && sourceLabel) {
    const sourcePayload: ProfileSourceInsert = {
      profile_id: viewer.authUser.id,
      source_type: sourceType,
      label: sourceLabel,
      url: sourceUrl,
      access_level: sourceAccessLevel,
      notes: sourceNotes,
      is_active: true,
    };
    const { error: sourceError } = await supabase.from("profile_sources").insert(sourcePayload);

    if (sourceError) {
      logSupabaseActionError("Failed to save manual profile source", sourceError, {
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
  const supabase = await createClient();
  const payload: ProfileSourceInsert = {
    profile_id: viewer.authUser.id,
    source_type: normalizeSourceType(readOptional(formData, "source_type")),
    label,
    url: readOptional(formData, "source_url"),
    access_level: normalizeAccessLevel(readOptional(formData, "source_access_level")),
    notes: readOptional(formData, "source_notes"),
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
    target_label: targetLabel,
    target_context: readOptional(formData, "target_context"),
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
