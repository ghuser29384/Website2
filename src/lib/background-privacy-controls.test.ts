import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_DATA_INVENTORY,
  BACKGROUND_NOTIFICATION_EVENT_KIND_OPTIONS,
  BACKGROUND_SENSITIVE_FIELD_KEYS,
  BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION,
  BACKGROUND_SELF_SERVE_DELETION_SURFACES,
  buildBackgroundNotificationPreferenceRows,
  createDefaultBackgroundNotificationPreferences,
  getDataRightRequestDueAt,
  getBackgroundNotificationEventKindForWishNotification,
  getPrivateNoStoreHeaders,
  isBackgroundSensitiveFieldKey,
  validateBackgroundSelfServeDeletion,
  validateProfileDataRightRequest,
} from "@/lib/background-privacy-controls";

test("default background notification preferences use inbox and digest, not push", () => {
  const profileId = "00000000-0000-0000-0000-000000000001";
  const preferences = createDefaultBackgroundNotificationPreferences(profileId);

  assert.equal(preferences.length, BACKGROUND_NOTIFICATION_EVENT_KIND_OPTIONS.length * 3);
  assert.equal(preferences.every((preference) => preference.profileId === profileId), true);
  assert.equal(
    preferences.every((preference) =>
      preference.channel === "web_push" ? !preference.enabled : preference.enabled,
    ),
    true,
  );
  assert.equal(
    preferences.every((preference) =>
      preference.channel === "email_digest" && preference.eventKind === "match_suggestions"
        ? preference.digestCadence === "daily"
        : true,
    ),
    true,
  );
  assert.equal(
    preferences.every((preference) =>
      preference.channel === "email_digest" && preference.eventKind !== "match_suggestions"
        ? preference.digestCadence === "immediate"
        : true,
    ),
    true,
  );
  const matchDigest = preferences.find(
    (preference) =>
      preference.channel === "email_digest" && preference.eventKind === "match_suggestions",
  );

  assert.equal(matchDigest?.dailyCap, 1);
  assert.equal(matchDigest?.quietHoursStart, 22);
  assert.equal(matchDigest?.quietHoursEnd, 8);
  assert.equal(matchDigest?.sourceCooldownHours, 24);
});

test("preference rows preserve explicit opt-outs and keep disabled push off", () => {
  const profileId = "00000000-0000-0000-0000-000000000001";
  const rows = buildBackgroundNotificationPreferenceRows({
    enabledKeys: new Set(["match_suggestions:in_app", "operator_review:email_digest"]),
    profileId,
  });

  const matchInbox = rows.find(
    (row) => row.eventKind === "match_suggestions" && row.channel === "in_app",
  );
  const matchDigest = rows.find(
    (row) => row.eventKind === "match_suggestions" && row.channel === "email_digest",
  );
  const matchPush = rows.find(
    (row) => row.eventKind === "match_suggestions" && row.channel === "web_push",
  );

  assert.equal(matchInbox?.enabled, true);
  assert.equal(matchDigest?.enabled, false);
  assert.equal(matchPush?.enabled, false);
  assert.equal(matchPush?.digestCadence, "none");
});

test("wish notification kinds map to preference event kinds", () => {
  assert.equal(getBackgroundNotificationEventKindForWishNotification("match"), "match_suggestions");
  assert.equal(getBackgroundNotificationEventKindForWishNotification("consent"), "consent_decisions");
  assert.equal(getBackgroundNotificationEventKindForWishNotification("safety"), "safety_review");
  assert.equal(getBackgroundNotificationEventKindForWishNotification("system"), "operator_review");
});

test("data-right requests require detail for destructive or corrective requests", () => {
  const exportRequest = validateProfileDataRightRequest({
    requestType: "export",
    scope: "background_networking",
  });
  const deletionRequest = validateProfileDataRightRequest({
    requestDetails: "Too short",
    requestType: "deletion",
    scope: "full_account",
  });

  assert.deepEqual(exportRequest.errors, []);
  assert.equal(deletionRequest.requestType, "deletion");
  assert.equal(deletionRequest.scope, "full_account");
  assert.ok(deletionRequest.errors.some((error) => error.includes("Add enough detail")));
});

test("privacy inventory separates sensitive stores from public previews", () => {
  assert.ok(BACKGROUND_DATA_INVENTORY.some((item) => item.surface === "wish_profile_previews"));
  assert.ok(
    BACKGROUND_DATA_INVENTORY.some((item) => item.surface.includes("background_match_feedback")),
  );
  assert.ok(
    BACKGROUND_DATA_INVENTORY.some((item) => item.surface.includes("background_profile_signals")),
  );
  assert.ok(
    BACKGROUND_DATA_INVENTORY.some((item) => item.surface.includes("background_shadow_runs")),
  );
  assert.ok(BACKGROUND_DATA_INVENTORY.some((item) => item.classification === "private-profile"));
  assert.ok(BACKGROUND_SENSITIVE_FIELD_KEYS.includes("exact_wish"));
  assert.equal(isBackgroundSensitiveFieldKey("exact_wish"), true);
  assert.equal(isBackgroundSensitiveFieldKey("cause_areas"), false);
});

test("authenticated route cache headers are private no-store only on private prefixes", () => {
  assert.deepEqual(getPrivateNoStoreHeaders("/dashboard"), {
    "Cache-Control": "private, no-store, max-age=0",
    Expires: "0",
    Pragma: "no-cache",
  });
  assert.deepEqual(getPrivateNoStoreHeaders("/admin/review"), {
    "Cache-Control": "private, no-store, max-age=0",
    Expires: "0",
    Pragma: "no-cache",
  });
  assert.deepEqual(getPrivateNoStoreHeaders("/agreements/agreement-123"), {
    "Cache-Control": "private, no-store, max-age=0",
    Expires: "0",
    Pragma: "no-cache",
  });
  assert.deepEqual(getPrivateNoStoreHeaders("/saved-offers"), {
    "Cache-Control": "private, no-store, max-age=0",
    Expires: "0",
    Pragma: "no-cache",
  });
  assert.deepEqual(getPrivateNoStoreHeaders("/api/wish-registry/search"), {
    "Cache-Control": "private, no-store, max-age=0",
    Expires: "0",
    Pragma: "no-cache",
  });
  assert.deepEqual(getPrivateNoStoreHeaders("/account-state-unavailable"), {
    "Cache-Control": "private, no-store, max-age=0",
    Expires: "0",
    Pragma: "no-cache",
  });
  assert.equal(getPrivateNoStoreHeaders("/background-networking"), null);
});

test("data-right request due date defaults to thirty days", () => {
  assert.equal(getDataRightRequestDueAt(new Date("2026-05-27T00:00:00Z")), "2026-06-26T00:00:00.000Z");
});

test("self-serve background deletion requires exact owner confirmation", () => {
  const rejected = validateBackgroundSelfServeDeletion({
    confirmation: "delete background networking",
  });
  const accepted = validateBackgroundSelfServeDeletion({
    confirmation: ` ${BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION} `,
  });

  assert.ok(rejected.errors.some((error) => error.includes(BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION)));
  assert.deepEqual(accepted.errors, []);
  assert.equal(accepted.confirmation, BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION);
  assert.ok(BACKGROUND_SELF_SERVE_DELETION_SURFACES.some((surface) => surface.includes("Safety")));
});
