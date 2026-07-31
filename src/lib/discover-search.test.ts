import assert from "node:assert/strict";
import test from "node:test";

import type { PublicProfileSummary } from "@/lib/app-data";
import {
  filterAndRankDiscoverPeople,
  filterAndRankDiscoverPools,
  parseDiscoverExchangeIntent,
} from "@/lib/discover-search";
import {
  buildDiscoverSearchPlan,
  filterAndRankDiscoverOffers,
} from "@/lib/discover-search-plan";
import type { LiveGroupBuyingRoute } from "@/lib/moral-trade/group-buying-live";
import type { PublicOfferListing } from "@/lib/public-offers";

function offer(overrides: Partial<PublicOfferListing>): PublicOfferListing {
  return {
    id: "offer-1",
    slug: "offer-1",
    title: "Read a paper for wild-animal welfare",
    summary: "A live reviewed moral trade.",
    format: "pledge-swap",
    status: "live",
    source: "live",
    isWorkedExample: false,
    reviewState: "manual-review-required",
    primaryCause: "Counterparty-selected learning or attention",
    secondaryCause: "wild-animal welfare and reducing wild-animal suffering",
    offeredAction: "O4 — Read one paper and produce a summary.",
    requestedAction: "R5 — Donate $100 to Wild Animal Initiative.",
    baselineBondBadge: null,
    verificationMethod: "Receipt or public link",
    verificationSummary: "Receipt or public link | Low",
    duration: { value: 30, unit: "days", label: "Complete within 30 days" },
    offeredImpactScore: 8,
    requestedImpactThreshold: 8,
    displayName: "Ellen",
    canonicalUrl: "https://www.moraltrade.org/offers/offer-1",
    createdAt: "2026-07-21T15:21:07.175Z",
    updatedAt: "2026-07-21T16:45:17.920Z",
    manualReviewRequired: true,
    evidenceGated: true,
    noEscrow: true,
    ...overrides,
  } as PublicOfferListing;
}

const wildOffer = offer({ id: "wild", slug: "wild" });
const aiOffer = offer({
  id: "ai",
  slug: "ai",
  title: "Build an alignment evaluation harness",
  secondaryCause: "AI safety",
  offeredAction: "O2 — Donate $50 to an AI-safety charity.",
  requestedAction: "R2 — Complete two hours of software engineering.",
});
const exampleOffer = offer({
  id: "example",
  slug: "example",
  status: "example",
  source: "worked_example",
  isWorkedExample: true,
});

test("a recognized cause is a hard filter rather than a ranking hint", () => {
  const plan = buildDiscoverSearchPlan({ query: "Wild animal suffering", domain: "offers" });
  const results = filterAndRankDiscoverOffers([wildOffer, aiOffer, exampleOffer], plan);
  assert.deepEqual(results.map((result) => result.id), ["wild"]);
  assert.equal(results[0].youOffer[0], "Donate $100 to Wild Animal Initiative.");
  assert.equal(results[0].youGet[0], "Read one paper and produce a summary.");
});

test("high-confidence typo resolution still enforces the canonical cause", () => {
  const plan = buildDiscoverSearchPlan({ query: "wild animl sufferng", domain: "offers" });
  assert.deepEqual(plan.facets.causes, ["wild-animal-suffering"]);
  assert.deepEqual(
    filterAndRankDiscoverOffers([wildOffer, aiOffer], plan).map((result) => result.id),
    ["wild"],
  );
});

test("mixed exchange language parses You offer and You get separately", () => {
  const intent = parseDiscoverExchangeIntent(
    "Software engineering for donations to AI safety under $100",
  );
  assert.ok(intent.offerTypes.includes("skill"));
  assert.ok(intent.returnTypes.includes("donation"));
  assert.equal(intent.returnMaximumCents, 10_000);
  const plan = buildDiscoverSearchPlan({
    query: "Software engineering for donations to AI safety under $100",
  });
  assert.deepEqual(
    filterAndRankDiscoverOffers([wildOffer, aiOffer], plan).map((result) => result.id),
    ["ai"],
  );
});

test("domain language switches the active live directory", () => {
  assert.equal(
    buildDiscoverSearchPlan({ query: "Pools near threshold for animal welfare" }).domain,
    "pools",
  );
  assert.equal(
    buildDiscoverSearchPlan({ query: "People who can review biosecurity protocols" }).domain,
    "people",
  );
});

test("standalone amounts surface one material clarification", () => {
  const plan = buildDiscoverSearchPlan({ query: "Animal welfare for $50" });
  assert.equal(plan.interpretation.needsClarification, true);
  assert.equal(plan.interpretation.clarification?.field, "amount");
});

test("pool and people search never substitute hard-coded examples", () => {
  const pool = {
    id: "pool-1",
    publicKey: "pool-1",
    title: "Wild-animal welfare research pool",
    summary: "Near threshold",
    causeArea: "Wild animal suffering",
    recipientName: "Wild Animal Initiative",
    intervention: "Fund one research tranche",
    verificationSummary: "Reviewed milestone plan",
    expectedEffect: "Research begins after activation",
    timeline: "30 days",
    statusLabel: "Near threshold",
    statusSentence: "The pool is near threshold.",
    fundingMode: "pledge_only",
    currency: "USD",
    minimumFundingCents: 500,
    targetFundingCents: 100_000,
    deadlineAt: "2026-08-15T23:59:59Z",
    failureBehavior: "No charge if the threshold is missed.",
    href: "/pools/pool-1",
  } satisfies LiveGroupBuyingRoute;
  const poolPlan = buildDiscoverSearchPlan({ query: "Pools near threshold for wild animal suffering" });
  assert.deepEqual(filterAndRankDiscoverPools([pool], poolPlan).map((result) => result.id), ["pool-1"]);

  const person = {
    id: "person-1",
    resolvedName: "Sasha",
    bio: "Biosecurity engineer who reviews laboratory protocols",
    wishPreview: "Open to protocol review",
    wishCauses: ["Biosecurity"],
    wishLocation: "Boston",
    wishParticipantKind: "individual",
    wishCollectiveName: null,
    wishOpenToPayment: true,
    wishOpenToPledges: true,
    verificationBadges: [{ id: "badge-1" }],
    offerCount: 2,
  } as unknown as PublicProfileSummary;
  const peoplePlan = buildDiscoverSearchPlan({ query: "People who can review biosecurity protocols" });
  assert.deepEqual(filterAndRankDiscoverPeople([person], peoplePlan).map((result) => result.id), ["person-1"]);
});
