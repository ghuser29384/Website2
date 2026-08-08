import assert from "node:assert/strict";
import test from "node:test";

import { groupOffersByParticipant } from "./marketplace-participant-groups";

const offers = [
  {
    created_at: "2026-07-29T00:00:00.000Z",
    id: "offer-a",
    owner_alias: "Victoria",
    owner_id: "owner-v",
    offered_cause: "Global health",
    requested_cause: "Animal welfare",
  },
  {
    created_at: "2026-07-29T00:01:00.000Z",
    id: "offer-b",
    owner_alias: "Paul",
    owner_id: "owner-p",
    offered_cause: "Animal welfare",
    requested_cause: "Global health",
  },
  {
    created_at: "2026-07-29T00:02:00.000Z",
    id: "offer-c",
    owner_alias: "Victoria",
    owner_id: "owner-v",
    offered_cause: "Grant review",
    requested_cause: "Vegetarian meals",
  },
] as const;

test("groups exact offers by participant without generating cross-product pairings", () => {
  const groups = groupOffersByParticipant(offers);

  assert.deepEqual(
    groups.map((group) => ({
      ids: group.offers.map((offer) => offer.id),
      ownerId: group.ownerId,
      participantName: group.participantName,
    })),
    [
      {
        ids: ["offer-a", "offer-c"],
        ownerId: "owner-v",
        participantName: "Victoria",
      },
      {
        ids: ["offer-b"],
        ownerId: "owner-p",
        participantName: "Paul",
      },
    ],
  );

  assert.deepEqual(
    groups.flatMap((group) => group.offers.map((offer) => offer.id)).toSorted(),
    offers.map((offer) => offer.id).toSorted(),
  );
});

test("preserves first-seen participant order and exact offer order", () => {
  const groups = groupOffersByParticipant(offers);
  assert.deepEqual(groups.map((group) => group.ownerId), ["owner-v", "owner-p"]);
  assert.deepEqual(groups[0]?.offers.map((offer) => offer.id), ["offer-a", "offer-c"]);
});
