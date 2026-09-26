import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
  BACKGROUND_FIELD_ENCRYPTION_VERSION,
} from "@/lib/background-field-encryption";
import { normalizeCompleteProfileSubmission } from "@/lib/complete-profile";
import { prepareCompleteProfilePrivatePreferences } from "@/lib/complete-profile-private-preferences";
import {
  buildInitialProfilePriorityAllocation,
  serializeProfilePriorityAllocation,
} from "@/lib/profile-priorities";

const FIELD_ENCRYPTION_ENV_NAMES = [
  "BACKGROUND_FIELD_ENCRYPTION_ACTIVE_KEY_ID",
  "BACKGROUND_FIELD_ENCRYPTION_KEY",
  "BACKGROUND_FIELD_ENCRYPTION_KEYS",
  "BACKGROUND_FIELD_ENCRYPTION_LEGACY_KEY",
  "MORAL_TRADE_FIELD_ENCRYPTION_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

function withFieldEncryptionEnv(
  values: Partial<Record<(typeof FIELD_ENCRYPTION_ENV_NAMES)[number], string>>,
  callback: () => void,
) {
  const previousValues = Object.fromEntries(
    FIELD_ENCRYPTION_ENV_NAMES.map((envName) => [envName, process.env[envName]] as const),
  );

  for (const envName of FIELD_ENCRYPTION_ENV_NAMES) {
    delete process.env[envName];
  }

  for (const [envName, value] of Object.entries(values)) {
    if (value !== undefined) {
      process.env[envName] = value;
    }
  }

  try {
    callback();
  } finally {
    for (const envName of FIELD_ENCRYPTION_ENV_NAMES) {
      const previousValue = previousValues[envName];
      if (previousValue === undefined) {
        delete process.env[envName];
      } else {
        process.env[envName] = previousValue;
      }
    }
  }
}

function buildSubmission() {
  const submission = normalizeCompleteProfileSubmission({
    displayName: "Mina Park",
    username: "mina-park",
    publicInvitationMentionsEnabled: true,
    role: "Policy researcher",
    affiliation: "Future Institute",
    bio: "Interested in bounded, verifiable exchanges.",
    maxCommitment: 100,
    monthlyTime: "4 hours",
    contactRule: "Verified members",
    privateProfile: true,
    offerType: "A pledge",
    causeArea: "Cause prioritization",
    matchGet: "$25 to poverty relief",
    priorityAllocation: serializeProfilePriorityAllocation(
      buildInitialProfilePriorityAllocation(),
    ),
  });

  assert.ok(submission);
  return submission;
}

test("Complete Profile omits private text instead of blocking when no server key exists", () => {
  withFieldEncryptionEnv({}, () => {
    const result = prepareCompleteProfilePrivatePreferences(buildSubmission());

    assert.equal(result.available, false);
    assert.equal(result.prepared.version, "");
    assert.deepEqual(result.prepared.ciphertexts, {});
    assert.deepEqual(result.prepared.plaintextFields, {
      brokerage_preference: "",
      capabilities: "",
      constraints: "",
      uncertainty_notes: "",
      verification_preferences: "",
    });
    assert.doesNotMatch(
      JSON.stringify(result.prepared),
      /Policy researcher|Future Institute|Maximum one-time commitment|Verified members/,
    );
  });
});

test("Complete Profile encrypts private text when a server-only fallback key exists", () => {
  withFieldEncryptionEnv(
    { SUPABASE_SERVICE_ROLE_KEY: "test-only-supabase-service-role-key" },
    () => {
      const result = prepareCompleteProfilePrivatePreferences(buildSubmission());

      assert.equal(result.available, true);
      assert.equal(result.prepared.version, BACKGROUND_FIELD_ENCRYPTION_VERSION);
      assert.equal(
        result.prepared.plaintextFields.capabilities,
        BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
      );
      assert.equal(
        result.prepared.plaintextFields.constraints,
        BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
      );
      assert.equal(
        result.prepared.ciphertexts.capabilities.includes("Policy researcher"),
        false,
      );
      assert.equal(
        result.prepared.ciphertexts.constraints.includes("Maximum one-time commitment"),
        false,
      );
    },
  );
});
