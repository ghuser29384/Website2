import { validateProfileUsername } from "@/lib/profile-username";
import { normalizeProfileSetupValues, type ProfileSetupValues } from "@/lib/profile-setup-draft";

export function normalizeProfileSetupSubmission(value: unknown): ProfileSetupValues | null {
  const values = normalizeProfileSetupValues(value);
  if (!values) return null;
  const username = validateProfileUsername(values.username);
  if (values.displayName.trim().length < 2 || !username.ok) return null;
  return Object.fromEntries(Object.entries(values).map(([key, text]) =>
    [key, key === "username" ? username.username : text.trim()])) as ProfileSetupValues;
}
/** Blank or skipped fields are omissions, never commands to erase existing preferences. */
export function profileSetupPrivateFields(values: ProfileSetupValues, enabled: boolean): Record<string, string> {
  if (!enabled) return {};
  return Object.fromEntries([
    ["uncertainty_notes", values.outcomes ? `User-stated outcomes: ${values.outcomes}` : ""],
    ["capabilities", values.capabilities],
    ["constraints", values.limits],
  ].filter(([, value]) => Boolean(value.trim())));
}
export function privateProfileSetupDefaults() {
  return {
    participant_kind: "individual", causes: [], privacy_stage: "strict", is_discoverable: false,
    share_public_preview: false, share_location: false, public_preview: "",
    openness_to_payment: false, openness_to_pledges: false, background_search_enabled: false,
    manual_source_review_enabled: false, notification_email_enabled: false,
    notification_dashboard_enabled: false, match_frequency: "manual",
  };
}
