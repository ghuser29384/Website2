import assert from "node:assert/strict";
import test from "node:test";

process.env.MORAL_TRADE_DISABLE_SUPABASE = "true";

import { POST as offerFollowRoute } from "../app/api/offers/[offerId]/follow/route";

import {
  buildOfferFollowPayload,
  isPublicLiveOfferId,
  normalizeOfferFollowAction,
  validateOfferFollowPayload,
} from "./offer-follows";

const LIVE_OFFER_ID = "123e4567-e89b-42d3-a456-426614174000";

test("offer follow payload preserves viewer-owned saved-offer boundary", () => {
  const payload = buildOfferFollowPayload({
    action: "follow",
    createdAt: "2026-05-29T12:00:00.000Z",
    isFollowing: true,
    mode: "followed",
    offerId: LIVE_OFFER_ID,
  });
  const validation = validateOfferFollowPayload(payload);

  assert.equal(validation.status, "pass");
  assert.equal(payload.publicContract.publicApiRoute, "/api/offers/:id/follow");
  assert.equal(payload.publicContract.storageSurface, "offer_carts");
  assert.equal(payload.savedOffer.viewerOwned, true);
  assert.equal(payload.savedOffer.isFollowing, true);
  assert.ok(payload.publicContract.nonClaims.some((claim) => claim.includes("not public social follows")));
});

test("offer follow logged-out payload includes a sign-in return path", () => {
  const payload = buildOfferFollowPayload({
    action: normalizeOfferFollowAction("toggle"),
    mode: "auth_required",
    offerId: LIVE_OFFER_ID,
  });
  const validation = validateOfferFollowPayload(payload);

  assert.equal(validation.status, "pass");
  assert.equal(payload.action, "toggle");
  assert.ok(payload.signInUrl?.startsWith("/login?returnTo="));
});

test("offer follow validator blocks worked-example slugs and private-looking payloads", () => {
  const workedExamplePayload = buildOfferFollowPayload({
    action: "follow",
    mode: "validated",
    offerId: "examples/seed-victoria",
  });
  const privatePayload = buildOfferFollowPayload({
    action: "follow",
    mode: "validated",
    offerId: LIVE_OFFER_ID,
  });
  privatePayload.publicContract.nonClaims = ["ContactEmail leak"] as string[];

  assert.equal(isPublicLiveOfferId(LIVE_OFFER_ID), true);
  assert.equal(isPublicLiveOfferId("examples/seed-victoria"), false);
  assert.equal(validateOfferFollowPayload(workedExamplePayload).status, "fail");
  assert.ok(
    validateOfferFollowPayload(workedExamplePayload).blockers.some((blocker) =>
      blocker.includes("live-offer-id"),
    ),
  );
  assert.equal(validateOfferFollowPayload(privatePayload).status, "fail");
  assert.ok(
    validateOfferFollowPayload(privatePayload).blockers.some((blocker) =>
      blocker.includes("privacy-and-nonclaims"),
    ),
  );
});

test("offer follow API route rejects worked examples before storage", async () => {
  const response = await offerFollowRoute(
    new Request("http://localhost/api/offers/examples/seed-victoria/follow", {
      body: JSON.stringify({ action: "follow" }),
      method: "POST",
    }),
    {
      params: Promise.resolve({
        offerId: "examples",
      }),
    },
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.ok(body.blockers.some((blocker: string) => blocker.includes("live-offer-id")));
});

test("offer follow API route returns safe fallback when storage is unavailable", async () => {
  const response = await offerFollowRoute(
    new Request(`http://localhost/api/offers/${LIVE_OFFER_ID}/follow`, {
      body: JSON.stringify({ action: "toggle" }),
      method: "POST",
    }),
    {
      params: Promise.resolve({
        offerId: LIVE_OFFER_ID,
      }),
    },
  );
  const body = await response.json();

  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.publicContract.storageSurface, "offer_carts");
  assert.equal(body.action, "toggle");

  if (response.status === 503) {
    assert.ok(body.blockers.includes("supabase_unconfigured:offer_follow_write"));
  } else {
    assert.ok([200, 201, 401, 403, 404, 409].includes(response.status));
  }
});
