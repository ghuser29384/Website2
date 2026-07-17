"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildCompleteProfileCapabilityText,
  buildCompleteProfileConstraintText,
  buildCompleteProfilePublicPreview,
  getCompleteProfileOfferOpenness,
  getCompleteProfilePrivacyStage,
  normalizeCompleteProfileSubmission,
} from "@/lib/complete-profile";
import { ensureAccountRowsForUser, requireViewer } from "@/lib/app-data";
import { prepareRecordSensitiveTextFields } from "@/lib/background-field-encryption";
import { getSafeInternalPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/server";
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
  const successTo = getSafeInternalPath(
    read(formData, "success_to"),
    "/discover?source=profile-complete&domain=offers&view=constellation",
  );

  if (!hasSupabaseEnv()) {
    redirectWithMessage(returnTo, "error", "Account storage is unavailable. Contact support before continuing.");
  }

  const walkthroughDraft = createWalkthroughProfileDraft({
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

  if (!walkthroughDraft) {
    redirectWithMessage(returnTo, "error", "The walkthrough profile could not be verified. Return to the walkthrough and try again.");
  }

  const submission = normalizeCompleteProfileSubmission({
    displayName: read(formData, "display_name"),
    role: read(formData, "role"),
    bio: read(formData, "bio"),
    maxCommitment: read(formData, "max_commitment"),
    monthlyTime: read(formData, "monthly_time"),
    contactRule: read(formData, "contact_rule"),
    privateProfile: read(formData, "private_profile"),
    offerType: walkthroughDraft.offerType,
    causeArea: walkthroughDraft.causeArea,
    matchGet: walkthroughDraft.matchGet,
  });

  if (!submission) {
    redirectWithMessage(
      returnTo,
      "error",
      "Add a display name and role, then review the participation limits before saving.",
    );
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  await ensureAccountRowsForUser(viewer.authUser, supabase);

  let encryptedPreferences: ReturnType<typeof prepareRecordSensitiveTextFields>;
  try {
    encryptedPreferences = prepareRecordSensitiveTextFields({
      brokerage_preference: submission.contactRule,
      capabilities: buildCompleteProfileCapabilityText(submission),
      constraints: buildCompleteProfileConstraintText(submission),
      uncertainty_notes: "",
      verification_preferences:
        "Review identity and evidence requirements before contact details are shared.",
    });
  } catch (error) {
    console.error("Failed to encrypt complete-profile preferences", error);
    redirectWithMessage(
      returnTo,
      "error",
      "Private matching preferences cannot be saved right now. Try again or contact support.",
    );
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: submission.displayName,
      bio: submission.bio,
    })
    .eq("id", viewer.authUser.id);

  if (profileError) {
    console.error("Failed to update complete profile identity", profileError);
    redirectWithMessage(returnTo, "error", "Your identity details could not be saved. Try again.");
  }

  const { error: onboardingError } = await (supabase as any)
    .from("cohort_onboarding_profiles")
    .upsert(
      {
        cause_areas: [walkthroughDraft.causeArea],
        completed_at: new Date().toISOString(),
        first_action: walkthroughDraft.firstAction,
        invite_target: walkthroughDraft.matchName,
        participant_kind: walkthroughDraft.participantKind,
        primary_goal: walkthroughDraft.primaryGoal,
        profile_id: viewer.authUser.id,
        referral_source: "Moral Trade walkthrough",
        status: "completed",
      },
      { onConflict: "profile_id" },
    );

  if (onboardingError) {
    console.error("Failed to save complete profile onboarding", onboardingError);
    redirectWithMessage(returnTo, "error", "The walkthrough selections could not be attached to your profile.");
  }

  const { openToPayment, openToPledges } = getCompleteProfileOfferOpenness(
    walkthroughDraft.offerType,
  );
  const privacyStage = getCompleteProfilePrivacyStage(
    submission.privateProfile,
    submission.contactRule,
  );
  const publicPreview = buildCompleteProfilePublicPreview(submission);

  const { error: wishProfileError } = await (supabase as any).from("wish_profiles").upsert(
    {
      profile_id: viewer.authUser.id,
      participant_kind: walkthroughDraft.participantKind,
      collective_name: "",
      causes: [walkthroughDraft.causeArea],
      location_city: null,
      location_region: null,
      capabilities: encryptedPreferences.plaintextFields.capabilities,
      constraints: encryptedPreferences.plaintextFields.constraints,
      verification_preferences:
        encryptedPreferences.plaintextFields.verification_preferences,
      uncertainty_notes: encryptedPreferences.plaintextFields.uncertainty_notes,
      openness_to_payment: openToPayment,
      openness_to_pledges: openToPledges,
      background_search_enabled: true,
      manual_source_review_enabled: true,
      notification_email_enabled: true,
      notification_dashboard_enabled: true,
      privacy_stage: privacyStage,
      brokerage_preference: encryptedPreferences.plaintextFields.brokerage_preference,
      match_frequency: "manual",
      is_discoverable: !submission.privateProfile,
      share_public_preview: !submission.privateProfile,
      share_location: false,
      public_preview: submission.privateProfile ? "" : publicPreview,
      safety_status: "clear",
      safety_notes: "",
      sensitive_ciphertexts: encryptedPreferences.ciphertexts,
      sensitive_encryption_version: encryptedPreferences.version,
    },
    { onConflict: "profile_id" },
  );

  if (wishProfileError) {
    console.error("Failed to save complete profile matching preferences", wishProfileError);
    redirectWithMessage(returnTo, "error", "Your private matching preferences could not be saved.");
  }

  const cookieStore = await cookies();
  cookieStore.delete(WALKTHROUGH_PROFILE_COOKIE_NAME);

  revalidatePath("/complete-profile");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/people");
  revalidatePath(`/people/${viewer.authUser.id}`);

  redirectWithMessage(
    successTo,
    "message",
    submission.privateProfile
      ? "Private profile saved. Explore matches when you are ready."
      : "Profile saved and made discoverable.",
  );
}
