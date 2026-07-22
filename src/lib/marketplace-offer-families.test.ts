import assert from "node:assert/strict";
import test from "node:test";

import {
  buildParticipantOfferFamilies,
  getMarketplaceFamilyMetrics,
  type MarketplaceOfferSourceRow,
} from "./marketplace-offer-families";

function row(
  overrides: Partial<MarketplaceOfferSourceRow>,
): MarketplaceOfferSourceRow {
  return {
    id: "offer-1",
    owner_id: "owner-1",
    owner_alias: "Ellen",
    mode: "pledge",
    offered_cause: "Research",
    requested_cause: "Animal welfare",
    offer_action: "Read 1,000 words and provide a summary.",
    request_action: "Take one animal-welfare action.",
    compromise_cause: "Not needed",
    verification: "Summary and receipt",
    duration: "30 days",
    discount_note: "Bounded terms",
    created_at: "2026-07-20T10:00:00.000Z",
    updated_at: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

test("collapses generated pairings into participant-level offer menus", () => {
  const families = buildParticipantOfferFamilies([
    row({ id: "pair-1" }),
    row({
      id: "pair-2",
      requested_cause: "Climate",
      request_action: "Complete one climate action.",
      updated_at: "2026-07-21T10:00:00.000Z",
    }),
    row({
      id: "pair-3",
      offer_action: "Read 3,000 words and provide a detailed summary.",
      updated_at: "2026-07-22T10:00:00.000Z",
    }),
  ]);

  assert.equal(families.length, 1);
  assert.equal(families[0]?.pairingCount, 3);
  assert.equal(families[0]?.offerVariants.length, 2);
  assert.equal(families[0]?.offerVariants[1]?.pairings.length, 2);
});

test("deduplicates identical generated request routes without inflating menus", () => {
  const families = buildParticipantOfferFamilies([
    row({ id: "old", updated_at: "2026-07-20T10:00:00.000Z" }),
    row({ id: "new", updated_at: "2026-07-21T10:00:00.000Z" }),
  ]);

  assert.equal(families[0]?.pairingCount, 2);
  assert.equal(families[0]?.offerVariants[0]?.pairings.length, 1);
  assert.equal(families[0]?.offerVariants[0]?.pairings[0]?.id, "new");
});

test("reports participants, distinct offer families, and possible pairings separately", () => {
  const families = buildParticipantOfferFamilies([
    row({ id: "pair-1" }),
    row({
      id: "pair-2",
      request_action: "Complete one climate action.",
      requested_cause: "Climate",
    }),
    row({
      id: "pair-3",
      owner_alias: "Sam",
      owner_id: "owner-2",
      offer_action: "Review one paper.",
    }),
  ]);

  assert.deepEqual(getMarketplaceFamilyMetrics(families), {
    participantCount: 2,
    offerFamilyCount: 2,
    pairingCount: 3,
  });
});
