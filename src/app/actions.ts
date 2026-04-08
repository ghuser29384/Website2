"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, hasSupabaseEnv } from "@/lib/supabase/config";
import { deriveDisplayName, ensureAccountRowsForUser, requireViewer } from "@/lib/app-data";
import { getSafeInternalPath } from "@/lib/paths";

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

export async function signUpAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/signup", "error", "Supabase is not configured yet.");
  }

  const email = readRequired(formData, "email");
  const password = readRequired(formData, "password");
  const displayName = readRequired(formData, "display_name");

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
