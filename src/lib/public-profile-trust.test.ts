import assert from "node:assert/strict";
import test from "node:test";

import {
  getPublicProfileMetaSummary,
  getPublicProfileTrustSignals,
} from "@/lib/public-profile-trust";

const emptyProfile = {
  resolvedName: "Dana Example",
  offerCount: 0,
  rating: null,
  ratingCount: 0,
  verificationBadges: [],
  wishPreview: null,
  wishCauses: [],
};

test("public profile trust summaries hide empty social proof", () => {
  const signals = getPublicProfileTrustSignals(emptyProfile);
  const summary = getPublicProfileMetaSummary(emptyProfile);

  assert.deepEqual(signals, []);
  assert.match(summary, /reviewable records are not public yet/);
  assert.equal(summary.includes("0 open"), false);
  assert.equal(summary.includes("0 reviewed"), false);
  assert.equal(summary.includes("followers"), false);
  assert.equal(summary.includes("karma"), false);
});

test("public profile trust summaries expose only populated record signals", () => {
  const signals = getPublicProfileTrustSignals(
    {
      ...emptyProfile,
      offerCount: 2,
      rating: 8.5,
      ratingCount: 1,
      verificationBadges: [{ badge_type: "reviewed_proof" }],
      wishCauses: ["Animal welfare"],
    },
    { publicLocation: "Canada", authoredCommentCount: 3 },
  );

  assert.deepEqual(signals, [
    "Canada",
    "2 open offers",
    "1 reviewed proof badge",
    "8.5/10 from 1 reviewed rating",
    "3 public comments",
    "broad wish preview visible",
  ]);
});
