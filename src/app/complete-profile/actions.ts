"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureAccountRowsForUser, requireViewer } from "@/lib/app-data";
import { BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER, BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE, decryptBackgroundSensitiveText, hasBackgroundFieldEncryptionKey, isEncryptedBackgroundText, prepareRecordSensitiveTextFields } from "@/lib/background-field-encryption";
import { isProfileSetupOwner } from "@/lib/profile-setup-draft";
import { normalizeProfileSetupSubmission, privateProfileSetupDefaults, profileSetupPrivateFields } from "@/lib/profile-setup";
import { getSafeInternalPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";

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
  const successTo = getSafeInternalPath(read(formData, "success_to"), "/discover");
  if (!hasSupabaseEnv()) redirectWithMessage(returnTo, "error", "Account storage is unavailable. Contact support before continuing.");
  const viewer = await requireViewer(returnTo);
  if (read(formData, "profile_setup_version") !== "2" || !isProfileSetupOwner(read(formData, "profile_owner_id"), viewer.authUser.id)) {
    redirectWithMessage(returnTo, "error", "Your account or this form changed. Reload profile setup before saving.");
  }
  if (viewer.profileStatus === "fallback") redirectWithMessage(returnTo, "error", "Your existing profile could not be loaded. Reload before changing it.");
  const submission = normalizeProfileSetupSubmission({
    displayName: read(formData, "display_name"), username: read(formData, "username"),
    affiliation: read(formData, "affiliation"), bio: read(formData, "bio"),
    outcomes: read(formData, "outcomes"), capabilities: read(formData, "capabilities"), limits: read(formData, "limits"),
  });
  if (!submission) redirectWithMessage(returnTo, "error", "Enter a display name and a valid username, and check the field lengths.");

  const fields = profileSetupPrivateFields(submission, read(formData, "save_preferences") === "on");
  const hasPrivateNotes = Object.keys(fields).length > 0;
  if (hasPrivateNotes && !hasBackgroundFieldEncryptionKey()) {
    redirectWithMessage(returnTo, "error", "Encrypted private-note storage is unavailable. Uncheck private matching notes to save only account details, or try later.");
  }
  const supabase = await createClient();
  await ensureAccountRowsForUser(viewer.authUser, supabase);
  const typed = supabase as any;
  const existing = hasPrivateNotes ? await typed.from("wish_profiles")
    .select("profile_id,sensitive_ciphertexts,sensitive_encryption_version,updated_at,capabilities,constraints,uncertainty_notes")
    .eq("profile_id", viewer.authUser.id).maybeSingle() : null;
  if (existing?.error) redirectWithMessage(returnTo, "error", "Existing private preferences could not be read. Nothing has been overwritten.");
  const oldCiphertexts = existing?.data?.sensitive_ciphertexts;
  if (oldCiphertexts && (typeof oldCiphertexts !== "object" || Array.isArray(oldCiphertexts))) {
    redirectWithMessage(returnTo, "error", "Existing private notes need repair before updating. Nothing has been overwritten.");
  }
  // Add notes instead of replacing unseen constraints or contextual history.
  // Decrypt and re-encrypt only the explicitly submitted fields, before profile writes.
  let prepared: ReturnType<typeof prepareRecordSensitiveTextFields> | null = null;
  try {
    if (hasPrivateNotes) {
      const appended: Record<string, string> = {};
      for (const [field, addition] of Object.entries(fields)) {
        const ciphertext = oldCiphertexts?.[field];
        if (ciphertext && (typeof ciphertext !== "string" || !isEncryptedBackgroundText(ciphertext))) throw new Error("Invalid private field");
        const current = ciphertext ? decryptBackgroundSensitiveText(ciphertext, field)
          : typeof existing?.data?.[field] === "string" ? existing.data[field] : "";
        if (current === BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE || current === BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER) throw new Error("Unreadable private field");
        appended[field] = current.trim() === addition || current.split("\n\n").includes(addition)
          ? current : [current.trim(), addition].filter(Boolean).join("\n\n");
        if (appended[field].length > 6000) throw new Error("Private note limit");
      }
      prepared = prepareRecordSensitiveTextFields(appended);
    }
  } catch { redirectWithMessage(returnTo, "error", "Existing private notes could not be safely extended or encrypted. No profile details or notes were overwritten."); }
  if (existing?.data && (!existing.data.updated_at || (existing.data.sensitive_encryption_version
    && existing.data.sensitive_encryption_version !== prepared?.version))) {
    redirectWithMessage(returnTo, "error", "Existing private preferences need a compatible secure update. Contact support; nothing has been overwritten.");
  }
  const { error: profileError } = await typed.from("profiles").update({
    display_name: submission.displayName, username: submission.username,
    affiliation: submission.affiliation, bio: submission.bio,
    public_invitation_mentions_enabled: read(formData, "public_invitation_mentions_enabled") === "true",
  }).eq("id", viewer.authUser.id);
  if (profileError) redirectWithMessage(returnTo, "error", profileError.code === "23505"
    ? "That username is already claimed or reserved. Choose another username."
    : "Account details could not be saved. Try again.");

  if (prepared) {
    const payload = { ...prepared.plaintextFields,
      sensitive_ciphertexts: { ...(oldCiphertexts ?? {}), ...prepared.ciphertexts },
      sensitive_encryption_version: prepared.version };
    // Compare-and-set prevents a stale form from replacing a newer encrypted map.
    const result = existing?.data
      ? await typed.from("wish_profiles").update(payload).eq("profile_id", viewer.authUser.id)
          .eq("updated_at", existing.data.updated_at).select("profile_id")
      : await typed.from("wish_profiles").insert({ ...privateProfileSetupDefaults(), ...payload, profile_id: viewer.authUser.id })
          .select("profile_id");
    if (result.error || result.data?.length !== 1) redirectWithMessage(returnTo, "error",
      "Account details were saved, but private notes changed elsewhere or could not be saved. Reload before retrying; existing preferences were preserved.");
  }
  // Skipping personalization never rewrites onboarding allocations, causes, consent, or history.
  for (const path of ["/complete-profile", "/dashboard", "/profile", "/people", `/people/${viewer.authUser.id}`]) revalidatePath(path);
  redirectWithMessage(successTo, "message", hasPrivateNotes
    ? "Profile details and the private notes you selected were saved. Existing visibility and outreach permissions were not broadened."
    : "Profile details saved. Existing matching preferences, priority allocations, and visibility are unchanged.");
}
