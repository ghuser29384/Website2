import assert from "node:assert/strict";
import test from "node:test";

process.env.MORAL_TRADE_DISABLE_SUPABASE = "true";

import { POST as offerCreateSimilarRoute } from "../app/api/offers/[offerId]/create-similar/route";

import type { OfferRecord } from "./app-data";
import {
  buildCreateSimilarTemplateFromLiveOffer,
  buildOfferCreateSimilarPayload,
  validateOfferCreateSimilarPayload,
} from "./offer-create-similar";

const LIVE_OFFER_ID = "123e4567-e89b-42d3-a456-426614174000";

const liveOffer = {
  id: LIVE_OFFER_ID,
  owner_id: "owner-1",
  owner_alias: "Public participant",
  mode: "offset",
  offered_cause: "Animal welfare",
  requested_cause: "Global poverty",
  offer_action: "I will redirect a planned donation into the compromise destination.",
  request_action: "The counterparty will redirect a matching planned donation.",
  compromise_cause: "Global poverty",
  offer_impact: 8,
  min_counterparty_impact: 7,
  verification: "Manual review required",
  duration: "3 months",
  payment_interval_value: null,
  payment_interval_unit: null,
  trust_level: 4,
  notes: "Public summary with no contact details.",
  discount_note: "",
  status: "open",
  created_at: "2026-05-29T12:00:00.000Z",
  updated_at: "2026-05-29T12:00:00.000Z",
  ownerProfile: null,
  recommendationCount: 0,
  commentCount: 0,
  isInCart: false,
  donationOffset: {
    offer_id: LIVE_OFFER_ID,
    baseline_amount_cents: 150000,
    baseline_opposed_cause: "Democracy",
    requested_matching_amount_cents: 150000,
    requested_opposed_cause: "Gun rights",
    compromise_charity_id: "givewell-top-charities-fund",
    offset_ratio: 1,
    time_horizon: "one_off",
    verification_method: "funds_in_escrow",
    unmatched_surplus_rule: "donate_to_compromise_destination",
    participation_mode: "direct",
    pool_id: null,
    pool_side: null,
    assurance_minimum_cents: 0,
    assurance_deadline_at: null,
    evidence_url: "https://example.org/private-receipt",
    moderation_status: "clear",
    moderation_notes: "internal note",
    moderation_reviewed_by: null,
    moderation_reviewed_at: null,
    created_at: "2026-05-29T12:00:00.000Z",
    updated_at: "2026-05-29T12:00:00.000Z",
    compromiseCharity: null,
    pool: null,
  },
} as OfferRecord;

test("create-similar template copies public offer terms without private evidence", () => {
  const template = buildCreateSimilarTemplateFromLiveOffer(liveOffer);
  const payload = buildOfferCreateSimilarPayload({
    mode: "ready",
    offer: liveOffer,
    offerId: LIVE_OFFER_ID,
  });
  const validation = validateOfferCreateSimilarPayload(payload);
  const serializedTemplate = JSON.stringify(template);

  assert.ok(template);
  assert.equal(validation.status, "pass");
  assert.equal(template.offset?.baselineAmountUsd, "1500");
  assert.equal(template.offset?.verificationMethod, "proof_of_past_donations");
  assert.equal(template.notes.includes(LIVE_OFFER_ID), true);
  assert.equal(serializedTemplate.includes("private-receipt"), false);
  assert.equal(payload.draft.requiresReview, true);
  assert.equal(payload.draft.stateMutation, false);
  assert.match(payload.draft.draftUrl, /source_offer=/);
});

test("create-similar logged-out payload includes sign-in draft URL without storage", () => {
  const payload = buildOfferCreateSimilarPayload({
    mode: "auth_required",
    offerId: LIVE_OFFER_ID,
  });
  const validation = validateOfferCreateSimilarPayload(payload);

  assert.equal(validation.status, "pass");
  assert.equal(payload.draft.template, null);
  assert.equal(payload.publicContract.storageSurface, "none_draft_prefill");
  assert.ok(payload.signInUrl?.startsWith("/login?returnTo="));
  assert.ok(payload.publicContract.nonClaims.some((claim) => claim.includes("No create-similar storage")));
});

test("create-similar validator blocks worked-example slugs and private-looking payloads", () => {
  const workedExamplePayload = buildOfferCreateSimilarPayload({
    mode: "validated",
    offerId: "examples/seed-victoria",
  });
  const privatePayload = buildOfferCreateSimilarPayload({
    mode: "ready",
    offer: liveOffer,
    offerId: LIVE_OFFER_ID,
  });

  if (privatePayload.draft.template) {
    privatePayload.draft.template.offerAction = "Email me at person@example.com.";
  }

  assert.equal(validateOfferCreateSimilarPayload(workedExamplePayload).status, "fail");
  assert.ok(
    validateOfferCreateSimilarPayload(workedExamplePayload).blockers.some((blocker) =>
      blocker.includes("live-offer-id"),
    ),
  );
  assert.equal(validateOfferCreateSimilarPayload(privatePayload).status, "fail");
  assert.ok(
    validateOfferCreateSimilarPayload(privatePayload).blockers.some((blocker) =>
      blocker.includes("template-safety"),
    ),
  );
});

test("create-similar API route rejects worked examples before draft preparation", async () => {
  const response = await offerCreateSimilarRoute(
    new Request("http://localhost/api/offers/examples/seed-victoria/create-similar", {
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

test("create-similar API route returns safe fallback when storage is unavailable", async () => {
  const response = await offerCreateSimilarRoute(
    new Request(`http://localhost/api/offers/${LIVE_OFFER_ID}/create-similar`, {
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
  assert.equal(body.publicContract.storageSurface, "none_draft_prefill");
  assert.equal(body.draft.stateMutation, false);

  if (response.status === 503) {
    assert.ok(body.blockers.includes("supabase_unconfigured:offer_create_similar"));
  } else {
    assert.ok([200, 401, 404, 409].includes(response.status));
  }
});
