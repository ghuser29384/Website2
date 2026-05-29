import assert from "node:assert/strict";
import test from "node:test";

import { GET as publicOffersRoute } from "../app/api/offers/route";

import {
  buildPublicOffersCollectionPayload,
  getPublicOffersLiveModeFromSearchParams,
  validatePublicOffersCollectionPayload,
} from "./public-offers";

test("public offers collection defaults to worked examples when live inventory is empty", () => {
  const payload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams: new URLSearchParams(),
  });
  const validation = validatePublicOffersCollectionPayload(payload);

  assert.equal(validation.status, "pass");
  assert.equal(payload.meta.defaultTab, "examples");
  assert.equal(payload.meta.tab, "examples");
  assert.equal(payload.meta.defaultedToWorkedExamples, true);
  assert.equal(payload.meta.liveOfferCount, 0);
  assert.equal(payload.meta.workedExampleCount, 8);
  assert.equal(payload.items.length, 8);
  assert.ok(payload.items.every((item) => item.isWorkedExample));
  assert.ok(payload.items.every((item) => item.reviewState === "manual-review-required"));
  assert.ok(payload.items.every((item) => item.noEscrow));
  assert.ok(payload.meta.availableFacets.cause.every((facet) => facet.count > 0));
});

test("public offers collection filters by query, cause, format, review state, and page size", () => {
  const searchParams = new URLSearchParams({
    cause: "animal-welfare",
    format: "pledge-swap",
    pageSize: "2",
    q: "vegetarian",
    reviewState: "manual-review-required",
    sort: "best-fit",
    tab: "examples",
  });
  const payload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams,
  });
  const validation = validatePublicOffersCollectionPayload(payload);

  assert.equal(validation.status, "pass");
  assert.equal(payload.meta.tab, "examples");
  assert.equal(payload.meta.pageSize, 2);
  assert.equal(payload.items.length, 2);
  assert.ok(
    payload.items.every(
      (item) =>
        item.format === "pledge-swap" &&
        [item.primaryCause, item.secondaryCause].join(" ").includes("Animal welfare"),
    ),
  );
  assert.ok(payload.items.some((item) => item.offeredAction.toLowerCase().includes("vegetarian")));
});

test("public offers live-mode parser maps public formats to internal offer modes", () => {
  assert.equal(
    getPublicOffersLiveModeFromSearchParams(new URLSearchParams("format=pledge-swap")),
    "pledge",
  );
  assert.equal(
    getPublicOffersLiveModeFromSearchParams(new URLSearchParams("mode=offset")),
    "offset",
  );
  assert.equal(
    getPublicOffersLiveModeFromSearchParams(new URLSearchParams("format=public-good")),
    "all",
  );
  assert.equal(
    getPublicOffersLiveModeFromSearchParams(
      new URLSearchParams("format=pledge-swap&format=donation-offset"),
    ),
    "all",
  );
});

test("public offers API route returns validator-backed collection JSON", async () => {
  const response = await publicOffersRoute(
    new Request("http://localhost/api/offers?tab=examples&pageSize=3"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(body.ok, true);
  assert.equal(body.meta.tab, "examples");
  assert.equal(body.items.length, 3);
  assert.equal(body.publicContract.publicApiRoute, "/api/offers");
  assert.equal(
    body.publicContract.listingSchemaId,
    "https://www.moraltrade.org/schemas/moral-trade/public-offer-listing.schema.json",
  );
  assert.equal(body.validation.status, "pass");
  assert.deepEqual(body.blockers, []);
});
