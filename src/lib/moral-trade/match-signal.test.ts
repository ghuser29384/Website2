import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateMoralTradeRedactedProfileMatch,
  validateMoralTradeMatchSignal,
  type MoralTradeMatchSignal,
  type MoralTradeRedactedProfile,
} from "./match-signal";

const leftProfile = {
  profileId: "profile-left",
  causeAreas: ["Animal welfare", "Global health"],
  tradeModes: ["pledge_swap", "donation_offset"],
  verificationPreferences: ["receipt", "public_log"],
  locationSensitivity: "region",
  locationRegion: "New York",
  locationCity: "New York",
  privacyStage: "broad_preview",
  privacyConstraints: ["broad previews only"],
  statedExclusions: ["no political campaign offsets"],
} satisfies MoralTradeRedactedProfile;

const rightProfile = {
  profileId: "profile-right",
  causeAreas: ["Animal welfare", "Climate"],
  tradeModes: ["pledge_swap"],
  verificationPreferences: ["receipt", "attestation"],
  locationSensitivity: "region",
  locationRegion: "New York",
  locationCity: "Albany",
  privacyStage: "broad_preview",
  privacyConstraints: ["keep contact private"],
  statedExclusions: ["no anonymous paid action"],
} satisfies MoralTradeRedactedProfile;

test("redacted profile match signals use factor codes, redactions, and human review", () => {
  const signal = evaluateMoralTradeRedactedProfileMatch({
    left: leftProfile,
    right: rightProfile,
  });

  assert.equal(signal.status, "matchable");
  assert.equal(signal.confidenceBand, "high");
  assert.equal(signal.humanReviewRequired, true);
  assert.deepEqual(signal.blockers, []);
  assert.equal(signal.counts.sharedCauseAreas, 1);
  assert.ok(signal.factorCodes.includes("cause_area_overlap"));
  assert.ok(signal.factorCodes.includes("trade_mode_compatible"));
  assert.ok(signal.factorCodes.includes("verification_preference_compatible"));
  assert.ok(signal.factorCodes.includes("privacy_safe_preview"));
  assert.ok(signal.factorCodes.includes("human_review_required"));
  assert.ok(signal.redactedFields.includes("exact_private_wishes"));
  assert.ok(signal.redactedFields.includes("ideology_or_psychology_inferences"));
  assert.equal(validateMoralTradeMatchSignal(signal).status, "pass");
});

test("redacted profile matching accepts cause-area complementarity without direct overlap", () => {
  const signal = evaluateMoralTradeRedactedProfileMatch({
    left: {
      ...leftProfile,
      causeAreas: ["Animal welfare"],
      offeredCauseAreas: ["Animal welfare"],
      requestedCauseAreas: ["Global health"],
    },
    right: {
      ...rightProfile,
      causeAreas: ["Climate"],
      offeredCauseAreas: ["Global health"],
      requestedCauseAreas: ["Animal welfare"],
    },
  });

  assert.equal(signal.status, "matchable");
  assert.equal(signal.counts.sharedCauseAreas, 0);
  assert.equal(signal.counts.causeAreaComplementarity, 2);
  assert.ok(signal.factorCodes.includes("cause_area_complementarity"));
  assert.ok(!signal.factorCodes.includes("cause_area_overlap"));
  assert.equal(validateMoralTradeMatchSignal(signal).status, "pass");
});

test("redacted profile matching blocks unresolved location, privacy, and exclusion conflicts", () => {
  const signal = evaluateMoralTradeRedactedProfileMatch({
    left: {
      ...leftProfile,
      locationSensitivity: "city",
      locationCity: "New York",
      privacyConstraints: ["manual only"],
    },
    right: {
      ...rightProfile,
      causeAreas: ["Animal welfare"],
      locationSensitivity: "city",
      locationCity: "Albany",
      statedExclusions: ["animal welfare"],
    },
  });

  assert.equal(signal.status, "not_matchable");
  assert.equal(signal.confidenceBand, "low");
  assert.equal(signal.humanReviewRequired, true);
  assert.ok(signal.blockers.includes("location_constraint_unresolved"));
  assert.ok(signal.blockers.includes("privacy_stage_or_constraint_unresolved"));
  assert.ok(signal.blockers.includes("stated_exclusion_conflict"));
  assert.ok(!signal.factorCodes.includes("privacy_safe_preview"));
  assert.ok(!signal.factorCodes.includes("privacy_stage_compatible"));
  assert.equal(validateMoralTradeMatchSignal(signal).status, "pass");
});

test("redacted profile matching ignores unsupported private inference fields", () => {
  const signal = evaluateMoralTradeRedactedProfileMatch({
    left: {
      ...leftProfile,
      ideology: "private ideology should never appear",
      psychology: "hidden preference should never appear",
    } as MoralTradeRedactedProfile,
    right: rightProfile,
  });
  const serialized = JSON.stringify(signal);

  assert.doesNotMatch(serialized, /private ideology/i);
  assert.doesNotMatch(serialized, /hidden preference/i);
  assert.equal(validateMoralTradeMatchSignal(signal).status, "pass");
});

test("match signal validation rejects autonomous disclosure and unapproved factors", () => {
  const signal = evaluateMoralTradeRedactedProfileMatch({
    left: leftProfile,
    right: rightProfile,
  }) as MoralTradeMatchSignal;

  signal.humanReviewRequired = false;
  signal.redactedFields = [];
  signal.factorCodes = [...signal.factorCodes, "raw_private_text_overlap" as MoralTradeMatchSignal["factorCodes"][number]];

  const validation = validateMoralTradeMatchSignal(signal);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("human_review_required")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("redacted_fields")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("factor_codes")));
});

test("match signal validation rejects privacy-safe preview without compatible privacy stage", () => {
  const signal = evaluateMoralTradeRedactedProfileMatch({
    left: leftProfile,
    right: rightProfile,
  }) as MoralTradeMatchSignal;

  signal.factorCodes = signal.factorCodes.filter((code) => code !== "privacy_stage_compatible");

  const validation = validateMoralTradeMatchSignal(signal);

  assert.equal(validation.status, "fail");
  assert.ok(
    validation.blockers.some((blocker) =>
      blocker.includes("privacy_safe_preview: requires compatible privacy stage"),
    ),
  );
});
