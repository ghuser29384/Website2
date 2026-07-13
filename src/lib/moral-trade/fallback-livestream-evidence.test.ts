import assert from "node:assert/strict";
import test from "node:test";

import {
  FALLBACK_LIVESTREAM_BRANCH_LABEL,
  FALLBACK_LIVESTREAM_OBSERVATION_LABEL,
  assertNoForbiddenFallbackLivestreamCopy,
  buildFallbackLivestreamEvidenceDisplay,
  createFallbackLivestreamChallengeCode,
  deriveFallbackLivestreamEvidenceStatus,
  fallbackLivestreamReviewStatus,
  validateFallbackLivestreamEvidenceDraft,
  type FallbackLivestreamEvidenceRouteLike,
} from "@/lib/moral-trade/fallback-livestream-evidence";

function routeFixture(overrides: Partial<FallbackLivestreamEvidenceRouteLike> = {}) {
  return {
    baseline_claim: "If no trade clears, I will follow the ordinary no-trade branch.",
    challenge_code: "MT-FLE-ABCD-2345",
    challenge_issued_at: "2026-07-06T12:00:00.000Z",
    clearing_deadline_at: "2026-07-07T12:00:00.000Z",
    fallback_action_statement: "Stream the stated fallback action during the scheduled window.",
    fallback_event_label: FALLBACK_LIVESTREAM_BRANCH_LABEL,
    id: "route-1",
    recording_due_at: "2026-07-08T13:00:00.000Z",
    recording_url: "",
    review_decision: null,
    review_notes: "",
    reviewed_at: null,
    scheduled_end_at: "2026-07-07T13:00:00.000Z",
    scheduled_start_at: "2026-07-07T12:30:00.000Z",
    status: "scheduled",
    stream_provider: "external_url",
    stream_url: "https://example.com/live",
    submitted_at: null,
    visibility: "private_review",
    ...overrides,
  } satisfies FallbackLivestreamEvidenceRouteLike;
}

test("fallback livestream evidence labels describe observed no-trade branch evidence", () => {
  const display = buildFallbackLivestreamEvidenceDisplay(routeFixture());

  assert.equal(display.title, "Fallback livestream evidence");
  assert.equal(display.observationLabel, FALLBACK_LIVESTREAM_OBSERVATION_LABEL);
  assert.equal(display.branchLabel, FALLBACK_LIVESTREAM_BRANCH_LABEL);
  assert.equal(display.statusLabel, "Livestream scheduled");
  assertNoForbiddenFallbackLivestreamCopy([
    display.title,
    display.observationLabel,
    display.branchLabel,
    display.statusLabel,
    display.challengeInstruction,
  ]);
});

test("fallback livestream evidence derives due and recording states deterministically", () => {
  assert.equal(
    deriveFallbackLivestreamEvidenceStatus(
      routeFixture(),
      new Date("2026-07-07T12:10:00.000Z"),
    ),
    "due",
  );
  assert.equal(
    deriveFallbackLivestreamEvidenceStatus(
      routeFixture(),
      new Date("2026-07-07T12:45:00.000Z"),
    ),
    "live_window",
  );
  assert.equal(
    deriveFallbackLivestreamEvidenceStatus(
      routeFixture(),
      new Date("2026-07-08T13:01:00.000Z"),
    ),
    "recording_due",
  );
  assert.equal(
    deriveFallbackLivestreamEvidenceStatus(
      routeFixture({ recording_url: "https://example.com/recording" }),
      new Date("2026-07-08T13:01:00.000Z"),
    ),
    "submitted",
  );
});

test("fallback livestream evidence validation only applies when the route is enabled", () => {
  assert.deepEqual(
    validateFallbackLivestreamEvidenceDraft({
      baselineClaim: "",
      enabled: false,
      fallbackActionStatement: "",
      scheduledEndAt: "",
      scheduledStartAt: "",
      streamProvider: "external_url",
      visibility: "private_review",
    }),
    [],
  );

  const errors = validateFallbackLivestreamEvidenceDraft({
    baselineClaim: "too short",
    enabled: true,
    fallbackActionStatement: "",
    clearingDeadlineAt: "2026-07-08T12:30",
    scheduledEndAt: "2026-07-07T12:00",
    scheduledStartAt: "2026-07-07T13:00",
    streamProvider: "unsupported",
    streamUrl: "ftp://example.com/live",
    visibility: "public",
  });

  assert.ok(errors.includes("Describe the no-trade branch claim being observed."));
  assert.ok(errors.includes("Describe what the participant will stream or record if no trade clears."));
  assert.ok(errors.includes("The livestream end time must be after the start time."));
  assert.ok(errors.includes("Choose a supported external stream provider."));
  assert.ok(errors.includes("Choose who can see the fallback livestream evidence route."));
  assert.ok(errors.includes("Use an http or https stream URL."));
});

test("fallback livestream challenge and review status mapping are bounded", () => {
  assert.equal(createFallbackLivestreamChallengeCode(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])), "MT-FLE-ABCD-EFGH");
  assert.equal(fallbackLivestreamReviewStatus("observed"), "reviewed_observed");
  assert.equal(fallbackLivestreamReviewStatus("unclear"), "reviewed_unclear");
  assert.equal(fallbackLivestreamReviewStatus("missed"), "missed");
});
