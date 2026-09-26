import assert from "node:assert/strict";
import test from "node:test";

import {
  chunkForPostgrestIn,
  OFFER_HYDRATION_CHUNK_SIZE,
  parsePublicProfileOfferPage,
  PUBLIC_PROFILE_OFFERS_PAGE_SIZE,
} from "@/lib/public-profile-offers";

test("public profile offer pages fail closed to page one", () => {
  assert.equal(parsePublicProfileOfferPage(undefined), 1);
  assert.equal(parsePublicProfileOfferPage("0"), 1);
  assert.equal(parsePublicProfileOfferPage("-8"), 1);
  assert.equal(parsePublicProfileOfferPage("not-a-page"), 1);
  assert.equal(parsePublicProfileOfferPage(["3", "4"]), 3);
  assert.equal(parsePublicProfileOfferPage("17"), 17);
  assert.equal(PUBLIC_PROFILE_OFFERS_PAGE_SIZE, 24);
});

test("one thousand offers are split into bounded PostgREST filters without loss", () => {
  const offerIds = Array.from({ length: 1_000 }, (_, index) => `offer-${index}`);
  const chunks = chunkForPostgrestIn(offerIds);

  assert.equal(OFFER_HYDRATION_CHUNK_SIZE, 100);
  assert.equal(chunks.length, 10);
  assert.ok(chunks.every((chunk) => chunk.length <= OFFER_HYDRATION_CHUNK_SIZE));
  assert.deepEqual(chunks.flat(), offerIds);
});

test("PostgREST chunking handles empty and partial final chunks", () => {
  assert.deepEqual(chunkForPostgrestIn([]), []);
  assert.deepEqual(chunkForPostgrestIn([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.throws(() => chunkForPostgrestIn([1], 0), RangeError);
});
