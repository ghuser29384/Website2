import {
  buildCompleteProfileCapabilityText,
  buildCompleteProfileConstraintText,
  type CompleteProfileSubmission,
} from "@/lib/complete-profile";
import {
  hasBackgroundFieldEncryptionKey,
  prepareRecordSensitiveTextFields,
  type PreparedEncryptedFields,
  type SensitiveTextFieldMap,
} from "@/lib/background-field-encryption";

const COMPLETE_PROFILE_PRIVATE_PREFERENCE_KEYS = [
  "brokerage_preference",
  "capabilities",
  "constraints",
  "uncertainty_notes",
  "verification_preferences",
] as const;

export interface CompleteProfilePrivatePreferenceOptions {
  includeOfferType?: boolean;
}

function buildCompleteProfilePrivatePreferenceFields(
  submission: CompleteProfileSubmission,
  options: CompleteProfilePrivatePreferenceOptions,
): SensitiveTextFieldMap {
  return {
    brokerage_preference: submission.contactRule,
    capabilities: buildCompleteProfileCapabilityText(submission, options),
    constraints: buildCompleteProfileConstraintText(submission),
    uncertainty_notes: "",
    verification_preferences:
      "Review identity and evidence requirements before contact details are shared.",
  };
}

function buildUnavailablePrivatePreferenceFields(): PreparedEncryptedFields {
  return {
    ciphertexts: {},
    plaintextFields: Object.fromEntries(
      COMPLETE_PROFILE_PRIVATE_PREFERENCE_KEYS.map((key) => [key, ""]),
    ),
    version: "",
  };
}

export interface CompleteProfilePrivatePreferences {
  available: boolean;
  prepared: PreparedEncryptedFields;
}

export function prepareCompleteProfilePrivatePreferences(
  submission: CompleteProfileSubmission,
  options: CompleteProfilePrivatePreferenceOptions = {},
): CompleteProfilePrivatePreferences {
  if (!hasBackgroundFieldEncryptionKey()) {
    return {
      available: false,
      prepared: buildUnavailablePrivatePreferenceFields(),
    };
  }

  return {
    available: true,
    prepared: prepareRecordSensitiveTextFields(
      buildCompleteProfilePrivatePreferenceFields(submission, options),
    ),
  };
}
