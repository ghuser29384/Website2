import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { emptyProfileSetupValues } from "./profile-setup-draft";
import { normalizeProfileSetupSubmission, privateProfileSetupDefaults, profileSetupPrivateFields } from "./profile-setup";
const identity = { ...emptyProfileSetupValues(), displayName: "Alex Morgan", username: "alex-morgan" };
test("basic profile completion has no mandatory role, time, money, topic, or allocation", () => {
  const parsed = normalizeProfileSetupSubmission(identity); assert.ok(parsed);
  assert.equal(parsed.outcomes, ""); assert.equal(parsed.capabilities, ""); assert.equal(parsed.limits, "");
  assert.equal(normalizeProfileSetupSubmission({ ...identity, username: "bad username" }), null);
  assert.equal(normalizeProfileSetupSubmission({ ...identity, outcomes: "x".repeat(1001) }), null);
});
test("unselected and blank optional fields do not erase or infer preferences", () => {
  assert.deepEqual(profileSetupPrivateFields({ ...identity, outcomes: "My own cause", capabilities: "Translation", limits: "No travel" }, false), {});
  assert.deepEqual(profileSetupPrivateFields(identity, true), {});
  assert.deepEqual(profileSetupPrivateFields({ ...identity, outcomes: "My own cause" }, true), { uncertainty_notes: "User-stated outcomes: My own cause" });
});
test("new private notes never opt an account into discovery, payment, or autonomous contact", () => {
  const defaults = privateProfileSetupDefaults();
  for (const key of ["is_discoverable", "share_public_preview", "share_location", "openness_to_payment", "openness_to_pledges", "background_search_enabled", "manual_source_review_enabled", "notification_email_enabled", "notification_dashboard_enabled"] as const) assert.equal(defaults[key], false);
  assert.equal(defaults.privacy_stage, "strict"); assert.equal(defaults.match_frequency, "manual");
});
test("profile writes remain owner-bound, encrypted, omission-preserving, and concurrency checked", () => {
  const action = readFileSync("src/app/complete-profile/actions.ts", "utf8");
  assert.ok(action.indexOf("isProfileSetupOwner(read") < action.indexOf('.update({'));
  assert.match(action, /eq\("id", viewer\.authUser\.id\)/);
  assert.match(action, /eq\("profile_id", viewer\.authUser\.id\)/);
  assert.match(action, /hasBackgroundFieldEncryptionKey/);
  assert.match(action, /prepareRecordSensitiveTextFields\(appended\)/);
  assert.match(action, /oldCiphertexts \?\? \{\}/);
  assert.match(action, /eq\("updated_at", existing\.data\.updated_at\)/);
  assert.doesNotMatch(action, /\.from\("(?:cohort_onboarding_profiles|profile_syntheses)"\)/);
  assert.doesNotMatch(action, /service_role|SERVICE_ROLE|WALKTHROUGH_PROFILE_COOKIE/);
});
