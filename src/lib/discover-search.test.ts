import assert from "node:assert/strict";
import test from "node:test";

import type { PublicProfileSummary } from "@/lib/app-data";
import {
  filterAndRankDiscoverCoFunds,
  filterAndRankDiscoverPeople,
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
  source: "worked_example",
  isWorkedExample: true,
});

const coFundRoute = {
  id: "cofund-1",
  publicKey: "cofund-1",
  title: "Co-Fund a wild-animal welfare research trade",
  summary: "A live reciprocal trade fulfilled by a contributor group.",
  causeArea: "Wild animal suffering",
  recipientName: "Wild Animal Initiative",
  intervention: "Fund one verified research tranche",
  verificationSummary: "Reviewed milestone plan",
  expectedEffect: "Research begins after the threshold activates",
  timeline: "30 days",
  statusLabel: "Near threshold",
  statusSentence: "The Co-Fund is near threshold.",
  fundingMode: "pledge_only",
  currency: "USD",
  minimumFundingCents: 500,
  targetFundingCents: 100_000,
  deadlineAt: "2026-08-15T23:59:59Z",
  failureBehavior: "No charge if the threshold is missed.",
  href: "/moral-goods-group-buying?pool=cofund-1",
} satisfies LiveGroupBuyingRoute;

test("a recognized cause is a hard filter rather than a ranking hint", () => {
  const plan = buildDiscoverSearchPlan({ query: "Wild animal suffering", domain: "offers" });
  const results = filterAndRankDiscoverOffers([wildOffer, aiOffer, exampleOffer], plan);
  assert.deepEqual(results.map((result) => result.id), ["wild"]);
  assert.equal(results[0].offerKind, "individual");
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

test("domain and Offer-subtype language follow the canonical boundary", () => {
  const coFundPlan = buildDiscoverSearchPlan({ query: "group buying a moral trade" });
  assert.equal(coFundPlan.domain, "offers");
  assert.equal(coFundPlan.offerKind, "co-fund");
  assert.deepEqual(coFundPlan.exchange.residualTerms, []);

  const poolPlan = buildDiscoverSearchPlan({ query: "dominant assurance contracts" });
  assert.equal(poolPlan.domain, "pools");
  assert.equal(poolPlan.offerKind, "all");
  assert.deepEqual(poolPlan.exchange.residualTerms, []);

  assert.equal(
    buildDiscoverSearchPlan({ query: "People who can review biosecurity protocols" }).domain,
    "people",
  );
});

test("live group-buying routes render as Co-Fund Offers", () => {
  const plan = buildDiscoverSearchPlan({
    query: "group buying a moral trade for wild animal suffering",
  });
  const results = filterAndRankDiscoverCoFunds([coFundRoute], plan);
  assert.deepEqual(results.map((result) => result.id), ["cofund-1"]);
  assert.equal(results[0].kind, "offer");
  assert.equal(results[0].offerKind, "co-fund");
  assert.equal(results[0].exactMatchLabel, "Join Co-Fund");
  assert.equal(results[0].counteroffersAllowed, false);
});

test("standalone amounts surface one material clarification", () => {
  const plan = buildDiscoverSearchPlan({ query: "Animal welfare for $50" });
  assert.equal(plan.interpretation.needsClarification, true);
  assert.equal(plan.interpretation.clarification?.field, "amount");
});

test("people search never substitutes hard-coded examples", () => {
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
  const peoplePlan = buildDiscoverSearchPlan({
    query: "People who can review biosecurity protocols",
  });
  assert.deepEqual(
    filterAndRankDiscoverPeople([person], peoplePlan).map((result) => result.id),
    ["person-1"],
  );
});
