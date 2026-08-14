"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildCompleteProfilePublicPreview,
  getCompleteProfileOfferOpenness,
  getCompleteProfilePrivacyStage,
  normalizeCompleteProfileSubmission,
} from "@/lib/complete-profile";
import { getAccountActivationState } from "@/lib/account-activation";
import { prepareCompleteProfilePrivatePreferences } from "@/lib/complete-profile-private-preferences";
import { ensureAccountRowsForUser, requireViewer } from "@/lib/app-data";
import { getSafeInternalPath } from "@/lib/paths";
import {
  buildPersistedProfilePriorities,
  getRankedProfileCauseAreas,
  getRankedProfilePriorityLabels,
  normalizeProfilePriorityAllocation,
} from "@/lib/profile-priorities";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  createWalkthroughProfileDraft,
  WALKTHROUGH_PROFILE_COOKIE_NAME,
} from "@/lib/walkthrough-profile";

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectWithMessage(path: string, key: "error" | "message", text: string): never {
  const url = new URL(path, "https://moraltrade.org");
  url.searchParams.set(key, text);
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

export async function completeWalkthroughProfileAction(formData: FormData) {
  const returnTo = getSafeInternalPath(read(formData, "return_to"), "/complete-profile");
  const successTo = "/feed";

  if (!hasSupabaseEnv()) {
    redirectWithMessage(
      returnTo,
      "error",
      "Account storage is unavailable. Contact support before continuing.",
    );
  }

  const profileSource =
    read(formData, "profile_source") === "direct" ? "direct" : "walkthrough";

  const profileDraft = createWalkthroughProfileDraft({
    originalCause: read(formData, "walkthrough_cause"),
    causeArea: read(formData, "cause_area"),
    offerType: read(formData, "offer_type"),
    matchName: read(formData, "match_name"),
    matchGet: read(formData, "match_get"),
    matchGive: read(formData, "match_give"),
    participantKind: read(formData, "participant_kind"),
    primaryGoal: read(formData, "primary_goal"),
    firstAction: read(formData, "first_action"),
  });

  if (!profileDraft) {
    redirectWithMessage(
      returnTo,
      "error",
      "The profile setup could not be verified. Reload Complete Profile and try again.",
    );
  }

  const rawPriorityAllocation = read(formData, "priority_allocation");
  const normalizedPriorityAllocation = normalizeProfilePriorityAllocation(
    rawPriorityAllocation,
  );
  const rankedCauseAreas = normalizedPriorityAllocation
    ? getRankedProfileCauseAreas(normalizedPriorityAllocation)
    : [];
  const primaryCauseArea =
    profileSource === "direct"
      ? rankedCauseAreas[0] ?? profileDraft.causeArea
      : profileDraft.causeArea;

  const submission = normalizeCompleteProfileSubmission({
    displayName: read(formData, "display_name"),
    username: read(formData, "username"),
    publicInvitationMentionsEnabled: read(formData, "public_invitation_mentions_enabled"),
    role: read(formData, "role"),
    affiliation: read(formData, "affiliation"),
    bio: read(formData, "bio"),
    maxCommitment: read(formData, "max_commitment"),
    monthlyTime: read(formData, "monthly_time"),
    contactRule: read(formData, "contact_rule"),
    privateProfile: read(formData, "private_profile"),
    offerType: profileDraft.offerType,
    causeArea: primaryCauseArea,
    matchGet: profileDraft.matchGet,
    priorityAllocation: rawPriorityAllocation,
  });

  if (!submission) {
    redirectWithMessage(
      returnTo,
      "error",
      "Review your priorities, choose a valid username, add a display name and role, then check the participation limits before saving.",
    );
  }

  const persistedPriorities = buildPersistedProfilePriorities(
    submission.priorityAllocation,
  );
  const savedCauseAreas =
    profileSource === "direct"
      ? rankedCauseAreas
      : rankedCauseAreas.includes(profileDraft.causeArea)
        ? rankedCauseAreas
        : [...rankedCauseAreas, profileDraft.causeArea];

  const viewer = await requireViewer(returnTo);
  const activationState = getAccountActivationState({ authenticated: true, viewer });

  if (activationState.kind !== "available") {
    redirectWithMessage(
      returnTo,
      "error",
      "Your persisted setup stage is unavailable. No completion state was changed.",
    );
  }

  if (activationState.stage === "walkthrough_required") {
    redirect("/walkthrough");
  }

  const supabase = await createClient();
  await ensureAccountRowsForUser(viewer.authUser, supabase);

  let privatePreferences: ReturnType<typeof prepareCompleteProfilePrivatePreferences>;
  try {
    privatePreferences = prepareCompleteProfilePrivatePreferences(submission, {
      includeOfferType: profileSource === "walkthrough",
    });
  } catch (error) {
    console.error("Failed to encrypt complete-profile preferences", error);
    redirectWithMessage(
      returnTo,
      "error",
      "Secure private matching storage failed. Try again or contact support.",
    );
  }

  const privateMatchingAvailable = privatePreferences.available;
  const encryptedPreferences = privatePreferences.prepared;

  if (!privateMatchingAvailable) {
    console.warn(
      "Complete Profile private-field encryption is unavailable; saving non-sensitive profile data with private matching paused.",
    );
  }

  const { error: profileError } = await (supabase as any)
    .from("profiles")
    .update({
      display_name: submission.displayName,
      username: submission.username,
      public_invitation_mentions_enabled: submission.publicInvitationMentionsEnabled,
      affiliation: submission.affiliation,
      bio: submission.bio,
    })
    .eq("id", viewer.authUser.id);

  if (profileError) {
    console.error("Failed to update complete profile identity", profileError);
    const usernameConflict =
      profileError.code === "23505" ||
      /username.*(?:claimed|reserved|unique|already)/iu.test(profileError.message ?? "");
    redirectWithMessage(
      returnTo,
      "error",
      usernameConflict
        ? "That username is already claimed or reserved. Choose another username."
        : "Your identity details could not be saved. Try again.",
    );
  }

  const { error: onboardingError } = await (supabase as any)
    .from("cohort_onboarding_profiles")
    .upsert(
      {
        cause_areas: savedCauseAreas,
        completed_at: new Date().toISOString(),
        first_action: profileDraft.firstAction,
        invite_target: profileSource === "walkthrough" ? profileDraft.matchName : "",
        participant_kind: profileDraft.participantKind,
        primary_goal: profileDraft.primaryGoal,
        priority_allocations: persistedPriorities,
        profile_id: viewer.authUser.id,
        referral_source:
          profileSource === "walkthrough"
            ? "Moral Trade walkthrough"
            : "Direct Complete Profile",
        status: "completed",
      },
      { onConflict: "profile_id" },
    );

  if (onboardingError) {
    console.error("Failed to save complete profile onboarding", onboardingError);
    redirectWithMessage(
      returnTo,
      "error",
      "The profile selections could not be attached to your account.",
    );
  }

  const { openToPayment, openToPledges } =
    profileSource === "walkthrough"
      ? getCompleteProfileOfferOpenness(profileDraft.offerType)
      : { openToPayment: false, openToPledges: false };
  const privacyStage = getCompleteProfilePrivacyStage(
    submission.privateProfile,
    submission.contactRule,
  );
  const publicPreview = buildCompleteProfilePublicPreview(submission);
  const wishProfileBasePayload = {
    profile_id: viewer.authUser.id,
    participant_kind: profileDraft.participantKind,
    collective_name: "",
    causes: savedCauseAreas,
    location_city: null,
    location_region: null,
    openness_to_payment: openToPayment,
    openness_to_pledges: openToPledges,
    background_search_enabled: privateMatchingAvailable,
    manual_source_review_enabled: privateMatchingAvailable,
    notification_email_enabled: privateMatchingAvailable,
    notification_dashboard_enabled: privateMatchingAvailable,
    privacy_stage: privacyStage,
    match_frequency: "manual",
    is_discoverable: !submission.privateProfile,
    share_public_preview: !submission.privateProfile,
    share_location: false,
    public_preview: submission.privateProfile ? "" : publicPreview,
    safety_status: "clear",
    safety_notes: "",
  };

  let wishProfileError: unknown = null;

  if (privateMatchingAvailable) {
    const { error } = await (supabase as any).from("wish_profiles").upsert(
      {
        ...wishProfileBasePayload,
        capabilities: encryptedPreferences.plaintextFields.capabilities,
        constraints: encryptedPreferences.plaintextFields.constraints,
        verification_preferences:
          encryptedPreferences.plaintextFields.verification_preferences,
        uncertainty_notes: encryptedPreferences.plaintextFields.uncertainty_notes,
        brokerage_preference: encryptedPreferences.plaintextFields.brokerage_preference,
        sensitive_ciphertexts: encryptedPreferences.ciphertexts,
        sensitive_encryption_version: encryptedPreferences.version,
      },
      { onConflict: "profile_id" },
    );
    wishProfileError = error;
  } else {
    const { data: existingWishProfile, error: updateError } = await (supabase as any)
      .from("wish_profiles")
      .update(wishProfileBasePayload)
      .eq("profile_id", viewer.authUser.id)
      .select("profile_id")
      .maybeSingle();

    if (updateError) {
      wishProfileError = updateError;
    } else if (!existingWishProfile) {
      const { error: insertError } = await (supabase as any).from("wish_profiles").insert({
        ...wishProfileBasePayload,
        capabilities: "",
        constraints: "",
        verification_preferences: "",
        uncertainty_notes: "",
        brokerage_preference: "",
        sensitive_ciphertexts: {},
        sensitive_encryption_version: "",
      });
      wishProfileError = insertError;
    }
  }

  if (wishProfileError) {
    console.error("Failed to save complete profile matching preferences", wishProfileError);
    redirectWithMessage(returnTo, "error", "Your profile preferences could not be saved.");
  }

  const { error: synthesisError } = await (supabase as any)
    .from("profile_syntheses")
    .upsert(
      {
        profile_id: viewer.authUser.id,
        cause_priorities: getRankedProfilePriorityLabels(submission.priorityAllocation),
      },
      { onConflict: "profile_id" },
    );

  if (synthesisError) {
    console.error("Failed to attach ranked priorities to profile synthesis", synthesisError);
    redirectWithMessage(
      returnTo,
      "error",
      "Your ranked priorities could not be saved. Your setup remains incomplete; retry safely.",
    );
  }

  let transitionError: { message?: string } | null = null;
  let transitionedStage: string | null = null;

  try {
    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase.rpc(
      "complete_profile_activation_v1",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_profile_id: viewer.authUser.id,
      },
    );
    transitionError = error;
    transitionedStage = data;
  } catch (error) {
    transitionError = {
      message: error instanceof Error ? error.message : "Unknown activation transition error",
    };
  }

  if (transitionError || transitionedStage !== "setup_complete") {
    console.error("Failed to persist completed profile activation", {
      message: transitionError?.message ?? "Unexpected activation stage",
      profileId: viewer.authUser.id,
      transitionedStage,
    });
    redirectWithMessage(
      returnTo,
      "error",
      "Your profile data was saved, but setup completion was not. Retry to finish safely.",
    );
  }

  if (profileSource === "walkthrough") {
    const cookieStore = await cookies();
    cookieStore.delete(WALKTHROUGH_PROFILE_COOKIE_NAME);
  }

  revalidatePath("/complete-profile");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/people");
  revalidatePath(`/people/${viewer.authUser.id}`);

  const successMessage = privateMatchingAvailable
    ? submission.privateProfile
      ? "Private profile saved. Explore matches when you are ready."
      : "Profile saved and made discoverable."
    : submission.privateProfile
      ? "Private profile saved. Private matching is paused until secure storage is restored."
      : "Profile saved and made discoverable. Private matching is paused until secure storage is restored.";

  redirectWithMessage(successTo, "message", successMessage);
}
