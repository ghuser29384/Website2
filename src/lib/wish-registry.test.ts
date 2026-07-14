import assert from "node:assert/strict";
import test from "node:test";

import {
  filterWishRegistryExamplePreviews,
  getWishRegistryCompatibilityBand,
  getWishRegistryRedactedOverlapTokens,
  toPublicWishRegistrySearchResult,
} from "@/lib/wish-registry";

const examplePreviews = [
  {
    causes: ["Animal welfare", "Global poverty"],
    location: "Public preview",
    name: "Animal welfare and poverty donor",
    openness: ["Payment-open", "Pledge-open"],
    participantKind: "individual",
    preview:
      "Interested in reciprocal pledge swaps between animal welfare actions and evidence-backed global poverty donations.",
  },
  {
    causes: ["Existential risk", "Public health", "Institutions"],
    location: "Remote",
    name: "Risk and health working group",
    openness: ["Pledge-open"],
    participantKind: "collective",
    preview:
      "Looking for counterparties who value public health, biosecurity, and institution-building enough to test shared moral public goods.",
  },
  {
    causes: ["Climate", "Public health", "Community service"],
    location: "Regional preview",
    name: "Climate and community-service participant",
    openness: ["Pledge-open"],
    participantKind: "individual",
    preview:
      "Open to bounded trades pairing climate-friendly habit changes with local public-health or community-service commitments.",
  },
] as const;

test("wish registry example previews respect cause and openness filters", () => {
  assert.deepEqual(
    filterWishRegistryExamplePreviews(examplePreviews, {
      cause: "Animal welfare",
      opennessToPledges: true,
      query: "animal",
    }).map((preview) => preview.name),
    ["Animal welfare and poverty donor"],
  );

  assert.deepEqual(
    filterWishRegistryExamplePreviews(examplePreviews, {
      cause: "Public health",
      opennessToPayment: true,
    }).map((preview) => preview.name),
    [],
  );
});

test("wish registry example previews stay unfiltered without search inputs", () => {
  assert.equal(filterWishRegistryExamplePreviews(examplePreviews).length, examplePreviews.length);
});

test("wish registry overlap markers never echo raw query tokens", () => {
  const markers = getWishRegistryRedactedOverlapTokens([
    "exact",
    "private",
    "counterparty",
  ]);

  assert.deepEqual(markers, [
    "broad_language_overlap_1",
    "broad_language_overlap_2",
    "broad_language_overlap_3",
  ]);
  assert.equal(JSON.stringify(markers).includes("counterparty"), false);
});

test("wish registry compatibility display uses broad bands instead of exact scores", () => {
  assert.equal(getWishRegistryCompatibilityBand(82), "High");
  assert.equal(getWishRegistryCompatibilityBand(50), "Moderate");
  assert.equal(getWishRegistryCompatibilityBand(10), "Tentative");
  assert.equal(getWishRegistryCompatibilityBand(0), "Exploratory");
});

test("public wish registry results omit exact internal ranking scores", () => {
  const publicResult = toPublicWishRegistrySearchResult({
    causes: ["Animal welfare"],
    collectiveName: "Preview collective",
    locationCity: null,
    locationRegion: "Public region",
    opennessToPayment: true,
    opennessToPledges: false,
    participantKind: "collective",
    privacyStage: "broad_preview",
    profileId: "profile-1",
    publicPreview: "Broad preview only.",
    score: 82,
    sharedTokens: ["broad_language_overlap_1"],
  });
  const serialized = JSON.stringify(publicResult);

  assert.equal("score" in publicResult, false);
  assert.equal(publicResult.compatibilityBand, "High");
  assert.match(publicResult.compatibilityExplanation, /not moral worth/);
  assert.doesNotMatch(serialized, /82|match score/);
});
