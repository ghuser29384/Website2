import assert from "node:assert/strict";
import test from "node:test";

import { GET as publicOfferDetailRoute } from "../app/api/offers/[...slug]/route";
import { GET as publicOffersFacetsRoute } from "../app/api/offers/facets/route";
import { GET as publicOffersRoute } from "../app/api/offers/route";

import {
  buildPublicOfferDetailPayload,
  buildPublicOffersCollectionPayload,
  buildPublicOffersFacetsPayload,
  getPublicOffersLiveModeFromSearchParams,
  getPublicOfferSlugFromSegments,
  validatePublicOfferDetailPayload,
  validatePublicOffersCollectionPayload,
  validatePublicOffersFacetsPayload,
} from "./public-offers";

test("public offers collection defaults to worked examples when live inventory is empty", () => {
  const payload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams: new URLSearchParams(),
  });
  const validation = validatePublicOffersCollectionPayload(payload);

  assert.equal(validation.status, "pass");
  assert.ok(validation.checks.some((check) => check.id === "listing-json-schema"));
  assert.equal(payload.meta.defaultTab, "worked_examples");
  assert.equal(payload.meta.tab, "worked_examples");
  assert.equal(payload.meta.defaultedToWorkedExamples, true);
  assert.equal(payload.meta.liveOfferCount, 0);
  assert.equal(payload.meta.workedExampleCount, 8);
  assert.equal(payload.meta.reviewedSeedTemplateCount, 4);
  assert.equal(payload.meta.reviewedDonationOffsetTemplateCount, 2);
  assert.equal(payload.meta.reviewedPledgeSwapTemplateCount, 2);
  assert.deepEqual(
    payload.meta.availableTabs.map((tab) => tab.value),
    ["live", "templates", "worked_examples", "demo", "public_goods"],
  );
  assert.deepEqual(
    payload.meta.reviewedSeedTemplates.map((template) => template.id),
    ["pure-opposed-cause", "market-mediated", "reciprocal-mixed", "bargained-coordination"],
  );
  assert.ok(payload.meta.reviewedSeedTemplates.every((template) => !template.liveMetricEligible));
  assert.ok(
    payload.meta.reviewedSeedTemplates
      .filter((template) => template.format === "pledge_swap")
      .every(
        (template) =>
          template.microPledgeDefaults?.defaultDurations.includes("One meal") &&
          !template.microPledgeDefaults.defaultDurations.includes("30 days"),
      ),
  );
  assert.ok(
    payload.meta.availableTabs
      .filter((tab) => tab.value !== "live")
      .every((tab) => tab.noLiveAgreementCount),
  );
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
    tab: "worked_examples",
  });
  const payload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams,
  });
  const validation = validatePublicOffersCollectionPayload(payload);

  assert.equal(validation.status, "pass");
  assert.equal(payload.meta.tab, "worked_examples");
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

test("public offers collection accepts legacy examples tab aliases", () => {
  const payload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams: new URLSearchParams("tab=examples&pageSize=1"),
  });
  const dashedPayload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams: new URLSearchParams("view=worked-examples&pageSize=1"),
  });

  assert.equal(payload.meta.tab, "worked_examples");
  assert.equal(dashedPayload.meta.tab, "worked_examples");
  assert.equal(payload.items.length, 1);
  assert.equal(dashedPayload.items.length, 1);
});

test("public offers collection validation fails when listings drift from the public schema", () => {
  const payload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams: new URLSearchParams("tab=worked_examples&pageSize=1"),
  });
  const driftedPayload = {
    ...payload,
    items: payload.items.map((item, index) =>
      index === 0
        ? ({
            ...item,
            debugOnlyField: true,
          } as typeof item)
        : item,
    ),
  };
  const validation = validatePublicOffersCollectionPayload(driftedPayload);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("listing-json-schema")));
  assert.ok(
    validation.checks.some(
      (check) =>
        check.id === "listing-json-schema" &&
        check.evidence.includes("debugOnlyField: additional property"),
    ),
  );
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

test("public offers collection separates template, Common Ground Budget, and demo lanes from offer listings", () => {
  const externalCrecPayload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams: new URLSearchParams("tab=external_crecm"),
  });
  const legacyRoundsPayload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams: new URLSearchParams("tab=rounds"),
  });
  const templatesPayload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams: new URLSearchParams("tab=templates"),
  });
  const demoPayload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams: new URLSearchParams("tab=demo"),
  });
  const publicGoodFormatPayload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams: new URLSearchParams("format=public-good"),
  });
  const publicGoodSearchPayload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams: new URLSearchParams("search=moral%20public%20goods"),
  });
  const assuranceSearchPayload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams: new URLSearchParams("search=assurance%20matching"),
  });
  const crossViewSearchPayload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams: new URLSearchParams("search=cross-view%20funding"),
  });

  assert.equal(validatePublicOffersCollectionPayload(externalCrecPayload).status, "pass");
  assert.equal(validatePublicOffersCollectionPayload(publicGoodFormatPayload).status, "pass");
  assert.equal(validatePublicOffersCollectionPayload(publicGoodSearchPayload).status, "pass");
  assert.equal(validatePublicOffersCollectionPayload(assuranceSearchPayload).status, "pass");
  assert.equal(validatePublicOffersCollectionPayload(crossViewSearchPayload).status, "pass");
  assert.equal(validatePublicOffersCollectionPayload(templatesPayload).status, "pass");
  assert.equal(validatePublicOffersCollectionPayload(demoPayload).status, "pass");
  assert.equal(publicGoodSearchPayload.contractVersion, "public-offers-api-v0.4-2026-06");
  assert.equal(
    validatePublicOffersCollectionPayload(publicGoodSearchPayload).validatorVersion,
    "public-offers-api-validator-v0.4",
  );
  assert.equal(externalCrecPayload.meta.tab, "public_goods");
  assert.equal(legacyRoundsPayload.meta.tab, "public_goods");
  assert.equal(publicGoodFormatPayload.meta.tab, "public_goods");
  assert.equal(publicGoodSearchPayload.meta.tab, "public_goods");
  assert.equal(assuranceSearchPayload.meta.tab, "public_goods");
  assert.equal(crossViewSearchPayload.meta.tab, "public_goods");
  assert.equal(publicGoodFormatPayload.meta.defaultedToPublicGoods, true);
  assert.equal(publicGoodSearchPayload.meta.defaultedToPublicGoods, true);
  assert.equal(assuranceSearchPayload.meta.defaultedToPublicGoods, true);
  assert.equal(crossViewSearchPayload.meta.defaultedToPublicGoods, true);
  assert.equal(templatesPayload.meta.defaultedToPublicGoods, false);
  assert.equal(templatesPayload.meta.tab, "templates");
  assert.equal(demoPayload.meta.tab, "demo");
  assert.equal(externalCrecPayload.items.length, 0);
  assert.equal(publicGoodFormatPayload.items.length, 0);
  assert.equal(publicGoodSearchPayload.items.length, 0);
  assert.equal(templatesPayload.items.length, 0);
  assert.equal(demoPayload.items.length, 0);
  assert.equal(externalCrecPayload.publicGoodsEntry?.resultRank, 1);
  assert.equal(publicGoodSearchPayload.publicGoodsEntry?.label, "Common Ground Budget");
  assert.match(
    publicGoodSearchPayload.publicGoodsEntry?.summary ?? "",
    /Fund public goods only if enough different-view support joins/,
  );
  assert.match(publicGoodSearchPayload.publicGoodsEntry?.summary ?? "", /No charge now/);
  assert.match(
    publicGoodSearchPayload.publicGoodsEntry?.summary ?? "",
    /Exact live progress may be hidden until the round closes/,
  );
  assert.equal(publicGoodSearchPayload.publicGoodsEntry?.primaryCta.label, "Preview a Common Ground Budget");
  assert.deepEqual(
    publicGoodSearchPayload.publicGoodsEntry?.secondaryCtas.map((action) => action.label),
    ["View current round", "Learn how it works / View audit and rules"],
  );
  assert.equal(publicGoodSearchPayload.publicGoodsEntry?.countsAsLiveOffer, false);
  assert.equal(publicGoodSearchPayload.publicGoodsEntry?.countsAsOrdinaryListing, false);
  assert.equal(publicGoodSearchPayload.publicGoodsEntry?.createsBindingIntent, false);
  assert.equal(publicGoodSearchPayload.publicGoodsEntry?.noPrimaryZeroState, true);
  assert.equal(publicGoodSearchPayload.publicGoodsEntry?.ordinaryOfferFiltersCollapsed, true);
  assert.equal(publicGoodSearchPayload.publicGoodsEntry?.exactLiveProgressExposed, false);
  assert.equal(publicGoodSearchPayload.publicGoodsEntry?.laneSeparation.publicGoodsModuleCount, 1);
  assert.equal(publicGoodSearchPayload.publicGoodsEntry?.laneSeparation.liveOfferCount, 0);
  assert.ok(
    publicGoodSearchPayload.publicGoodsEntry?.copyGuards.some((claim) =>
      /does not expose exact live threshold/i.test(claim),
    ),
  );
  assert.equal(templatesPayload.publicGoodsEntry, null);
  assert.equal(externalCrecPayload.meta.reviewedSeedTemplateCount, 4);
  assert.equal(externalCrecPayload.meta.availableTabs.find((tab) => tab.value === "public_goods")?.count, 1);
  assert.equal(
    externalCrecPayload.meta.availableTabs.find((tab) => tab.value === "public_goods")?.label,
    "Common Ground Budget",
  );
  assert.match(
    externalCrecPayload.meta.availableTabs.find((tab) => tab.value === "public_goods")
      ?.description ?? "",
    /moralpublicgoods131\.md \/ CRECM v1\.125/,
  );
  assert.ok(
    externalCrecPayload.publicContract.nonClaims.some((claim) =>
      /moralpublicgoods131\.md \/ CRECM v1\.125/.test(claim),
    ),
  );
  assert.equal(
    externalCrecPayload.publicContract.nonClaims.some((claim) =>
      /moralpublicgoods102\.md|CRECM v1\.96|Verified Assurance Matching/.test(claim),
    ),
    false,
  );
  assert.equal(templatesPayload.meta.availableTabs.find((tab) => tab.value === "templates")?.count, 4);
  assert.ok(
    (demoPayload.meta.availableTabs.find((tab) => tab.value === "demo")?.count ?? 0) > 0,
  );
  assert.equal(
    externalCrecPayload.meta.availableTabs.find((tab) => tab.value === "public_goods")?.noLiveAgreementCount,
    true,
  );
  assert.equal(
    templatesPayload.meta.availableTabs.find((tab) => tab.value === "templates")?.noLiveAgreementCount,
    true,
  );
});

test("public offer detail resolves worked-example slugs and keeps actions consent gated", () => {
  const slug = getPublicOfferSlugFromSegments(["examples", "seed-victoria"]);
  const payload = buildPublicOfferDetailPayload({
    liveOffers: [],
    slug,
  });
  const validation = validatePublicOfferDetailPayload(payload);

  assert.equal(slug, "examples/seed-victoria");
  assert.equal(validation.status, "pass");
  assert.ok(validation.checks.some((check) => check.id === "listing-json-schema"));
  assert.equal(payload.item?.isWorkedExample, true);
  assert.equal(payload.publicContract.publicApiRoute, "/api/offers/:slug");
  assert.ok(payload.actions.some((action) => action.key === "create-similar"));
  assert.ok(payload.actions.every((action) => action.authRequired));
  assert.ok(payload.publicContract.nonClaims.some((claim) => claim.includes("does not grant contact access")));
});

test("public offer facets endpoint payload hides zero-count options", () => {
  const payload = buildPublicOffersFacetsPayload({
    liveOffers: [],
    searchParams: new URLSearchParams("tab=worked_examples&q=vegetarian"),
  });
  const publicGoodsPayload = buildPublicOffersFacetsPayload({
    liveOffers: [],
    searchParams: new URLSearchParams("search=moral%20public%20goods"),
  });
  const validation = validatePublicOffersFacetsPayload(payload);
  const publicGoodsValidation = validatePublicOffersFacetsPayload(publicGoodsPayload);
  const allFacets = Object.values(payload.availableFacets).flat();

  assert.equal(validation.status, "pass");
  assert.equal(publicGoodsValidation.status, "pass");
  assert.equal(payload.publicContract.publicApiRoute, "/api/offers/facets");
  assert.equal(payload.meta.tab, "worked_examples");
  assert.equal(payload.publicGoodsEntry, null);
  assert.equal(publicGoodsPayload.meta.tab, "public_goods");
  assert.equal(publicGoodsPayload.publicGoodsEntry?.resultRank, 1);
  assert.match(publicGoodsPayload.publicGoodsEntry?.summary ?? "", /not an ordinary offer listing/);
  assert.equal(publicGoodsPayload.publicGoodsEntry?.countsAsLiveOffer, false);
  assert.deepEqual(Object.values(publicGoodsPayload.availableFacets).flat(), []);
  assert.deepEqual(
    payload.meta.availableTabs.map((tab) => tab.value),
    ["live", "templates", "worked_examples", "demo", "public_goods"],
  );
  assert.equal(payload.meta.reviewedSeedTemplateCount, 4);
  assert.ok(payload.meta.reviewedSeedTemplates.every((template) => !template.liveMetricEligible));
  assert.ok(allFacets.length > 0);
  assert.ok(allFacets.every((facet) => facet.count > 0));
});

test("public offers API route returns validator-backed collection JSON", async () => {
  const response = await publicOffersRoute(
    new Request("http://localhost/api/offers?tab=worked_examples&pageSize=3"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(body.ok, true);
  assert.equal(body.meta.tab, "worked_examples");
  assert.equal(body.items.length, 3);
  assert.deepEqual(
    body.meta.availableTabs.map((tab: { value: string }) => tab.value),
    ["live", "templates", "worked_examples", "demo", "public_goods"],
  );
  assert.equal(body.meta.reviewedSeedTemplateCount, 4);
  assert.ok(
    body.meta.reviewedSeedTemplates.every(
      (template: { liveMetricEligible: boolean }) => template.liveMetricEligible === false,
    ),
  );
  assert.equal(body.publicContract.publicApiRoute, "/api/offers");
  assert.equal(
    body.publicContract.listingSchemaId,
    "https://www.moraltrade.org/schemas/moral-trade/public-offer-listing.schema.json",
  );
  assert.equal(body.validation.status, "pass");
  assert.deepEqual(body.blockers, []);
});

test("public offers API route returns Common Ground Budget entry for moral-public-goods search", async () => {
  const response = await publicOffersRoute(
    new Request("http://localhost/api/offers?search=moral%20public%20goods"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.meta.tab, "public_goods");
  assert.equal(body.meta.defaultedToPublicGoods, true);
  assert.equal(body.items.length, 0);
  assert.equal(body.publicGoodsEntry.resultRank, 1);
  assert.equal(body.publicGoodsEntry.label, "Common Ground Budget");
  assert.equal(body.publicGoodsEntry.primaryCta.key, "preview-common-ground-budget");
  assert.equal(body.publicGoodsEntry.countsAsLiveOffer, false);
  assert.equal(body.publicGoodsEntry.countsAsOrdinaryListing, false);
  assert.equal(body.publicGoodsEntry.createsBindingIntent, false);
  assert.equal(body.publicGoodsEntry.noPrimaryZeroState, true);
  assert.equal(body.publicGoodsEntry.ordinaryOfferFiltersCollapsed, true);
  assert.equal(body.publicGoodsEntry.exactLiveProgressExposed, false);
  assert.equal(body.validation.status, "pass");
  assert.deepEqual(body.blockers, []);
});

test("public offer detail API route returns validator-backed worked example JSON", async () => {
  const response = await publicOfferDetailRoute(
    new Request("http://localhost/api/offers/examples/seed-victoria"),
    {
      params: Promise.resolve({
        slug: ["examples", "seed-victoria"],
      }),
    },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(body.ok, true);
  assert.equal(body.item.slug, "examples/seed-victoria");
  assert.equal(body.item.noEscrow, true);
  assert.equal(body.publicContract.publicApiRoute, "/api/offers/:slug");
  assert.equal(body.validation.status, "pass");
  assert.deepEqual(body.blockers, []);
});

test("public offer detail API route returns 404 blockers for non-public slugs", async () => {
  const response = await publicOfferDetailRoute(
    new Request("http://localhost/api/offers/not-a-public-offer"),
    {
      params: Promise.resolve({
        slug: ["not-a-public-offer"],
      }),
    },
  );
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(body.ok, false);
  assert.equal(body.item, null);
  assert.ok(body.blockers.some((blocker: string) => blocker.includes("listing-found")));
});

test("public offer facets API route returns validator-backed facets JSON", async () => {
  const response = await publicOffersFacetsRoute(
    new Request("http://localhost/api/offers/facets?tab=worked_examples&q=vegetarian"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(body.ok, true);
  assert.equal(body.meta.tab, "worked_examples");
  assert.deepEqual(
    body.meta.availableTabs.map((tab: { value: string }) => tab.value),
    ["live", "templates", "worked_examples", "demo", "public_goods"],
  );
  assert.equal(body.meta.reviewedSeedTemplateCount, 4);
  assert.equal(body.publicContract.publicApiRoute, "/api/offers/facets");
  assert.equal(body.validation.status, "pass");
  assert.deepEqual(body.blockers, []);
});

test("public offer facets API route preserves Common Ground Budget entry for public-goods intent", async () => {
  const response = await publicOffersFacetsRoute(
    new Request("http://localhost/api/offers/facets?search=moral%20public%20goods"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.meta.tab, "public_goods");
  assert.equal(body.meta.defaultedToPublicGoods, true);
  assert.equal(body.publicGoodsEntry.resultRank, 1);
  assert.equal(body.publicGoodsEntry.label, "Common Ground Budget");
  assert.equal(body.publicGoodsEntry.countsAsLiveOffer, false);
  assert.equal(body.publicGoodsEntry.noPrimaryZeroState, true);
  assert.deepEqual(Object.values(body.availableFacets).flat(), []);
  assert.equal(body.validation.status, "pass");
  assert.deepEqual(body.blockers, []);
});
