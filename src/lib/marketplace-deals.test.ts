import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  CommitmentSheet,
  MoralDealCard,
} from "@/components/marketplace/marketplace-components";
import {
  MIN_PUBLIC_GROUP_COUNT,
  buildDealEconomics,
  buildMarketplaceSurface,
  getCommitmentStatusLabel,
  mapAgreementToCommitmentStatus,
  marketplaceDealFromWorkedOffer,
  marketplaceDealsFromPublicGoodsCampaigns,
  parseMarketplaceQuery,
  recommendMarketplaceDeals,
  type MarketplaceDeal,
} from "@/lib/marketplace-deals";
import { demoMpgfAssuranceRound, demoMpgfMatchPool, demoMpgfPublicGoodsCampaigns } from "@/lib/mpgf/data";
import { SEED_OFFERS } from "@/lib/offers";

function requiredDealFields(overrides: Partial<MarketplaceDeal> = {}): MarketplaceDeal {
  return {
    causeTags: ["Global poverty"],
    ctaLabel: "Commit conditionally",
    href: "/offers/test",
    id: "test-deal",
    mechanismType: "local_pledge",
    title: "Test public deal",
    ...overrides,
  };
}

function agreementFixture(overrides: Record<string, unknown> = {}) {
  return {
    bondChallenges: [],
    bondEvidence: [],
    evidenceItems: [],
    paymentSchedules: [],
    payments: [],
    performanceBonds: [],
    reviewCases: [],
    status: "active",
    ...overrides,
  } as Parameters<typeof mapAgreementToCommitmentStatus>[0];
}

test("marketplace adapter maps worked offers into bounded deal economics without fabricated metrics", () => {
  const offsetOffer = SEED_OFFERS.find((offer) => offer.mode === "offset");
  assert.ok(offsetOffer);

  const deal = marketplaceDealFromWorkedOffer(offsetOffer);
  const economics = buildDealEconomics(deal);

  assert.equal(deal.mechanismType, "cross_view_donation_swap");
  assert.equal(deal.userMaxExposureCents, 100_000);
  assert.equal(deal.counterpartyVolumeCents, 100_000);
  assert.equal(deal.totalMovedIfClearedCents, 200_000);
  assert.equal(deal.effectiveMultiplier, 2);
  assert.equal(deal.ctaLabel, "View details");
  assert.equal(economics.userMaxExposureLabel, "$1,000");
  assert.equal(economics.totalMovedIfClearedLabel, "$2,000");
  assert.equal(economics.effectiveMultiplierLabel, "2.00x if cleared");
  assert.match(economics.chargeTiming, /do not charge/i);
});

test("public-goods adapter keeps unavailable sponsor-match economics unavailable", () => {
  const [deal] = marketplaceDealsFromPublicGoodsCampaigns({
    campaigns: demoMpgfPublicGoodsCampaigns.slice(0, 1),
    matchPool: demoMpgfMatchPool,
    round: demoMpgfAssuranceRound,
  });
  assert.ok(deal);

  const economics = buildDealEconomics(deal);

  assert.equal(deal.mechanismType, "public_goods_round");
  assert.equal(deal.sponsorMatchCents, undefined);
  assert.equal(economics.sponsorMatchLabel, "Unavailable");
  assert.equal(deal.ctaLabel, "Preview budget");
  assert.ok(deal.privacyNotes?.some((note) => /campaign-level match allocation is unavailable/i.test(note)));
});

test("marketplace filtering, search, and privacy threshold labels use public deal fields only", () => {
  const hiddenCountDeals = Array.from({ length: MIN_PUBLIC_GROUP_COUNT - 1 }, (_, index) =>
    requiredDealFields({
      categoryKeys: ["recommended", "public_goods_rounds"],
      causeTags: ["Animal welfare"],
      filterTags: ["public_goods_round", "requires_evidence"],
      href: `/offers/test-${index}`,
      id: `test-${index}`,
      mechanismType: "public_goods_round",
      title: `Animal welfare threshold ${index}`,
    }),
  );
  const publicCountDeals = Array.from({ length: MIN_PUBLIC_GROUP_COUNT }, (_, index) =>
    requiredDealFields({
      categoryKeys: ["recommended", "low_friction_pledges"],
      causeTags: ["Public health"],
      filterTags: ["lowest_effort", "no_personal_exposure"],
      href: `/offers/low-${index}`,
      id: `low-${index}`,
      title: `Public health pledge ${index}`,
      userMaxExposureCents: 0,
    }),
  );

  const hiddenSurface = buildMarketplaceSurface(
    hiddenCountDeals,
    parseMarketplaceQuery({ marketplace_category: "public_goods_rounds", search: "animal" }),
  );
  const publicGoodsCategory = hiddenSurface.categories.find(
    (category) => category.key === "public_goods_rounds",
  );

  assert.equal(hiddenSurface.deals.length, MIN_PUBLIC_GROUP_COUNT - 1);
  assert.equal(publicGoodsCategory?.availabilityLabel, "Available");
  assert.equal(publicGoodsCategory?.exactCountSuppressed, true);

  const publicSurface = buildMarketplaceSurface(
    publicCountDeals,
    parseMarketplaceQuery({ marketplace_category: "low_friction_pledges" }),
  );
  const lowFrictionCategory = publicSurface.categories.find(
    (category) => category.key === "low_friction_pledges",
  );

  assert.equal(publicSurface.deals.length, MIN_PUBLIC_GROUP_COUNT);
  assert.equal(lowFrictionCategory?.availabilityLabel, "5 available");
  assert.equal(lowFrictionCategory?.exactCountSuppressed, false);

  const noExposureSurface = buildMarketplaceSurface(
    [...hiddenCountDeals, ...publicCountDeals],
    parseMarketplaceQuery({ marketplace_filter: "no_personal_exposure" }),
  );

  assert.ok(noExposureSurface.deals.length >= MIN_PUBLIC_GROUP_COUNT);
  assert.ok(noExposureSurface.deals.every((deal) => deal.filterTags?.includes("no_personal_exposure")));
});

test("commitment status mapper exposes user-facing center states", () => {
  assert.equal(
    mapAgreementToCommitmentStatus(
      agreementFixture({
        payments: [{ authorization_status: "authorized", status: "checkout_created" }],
      }),
    ),
    "authorized",
  );
  assert.equal(
    mapAgreementToCommitmentStatus(
      agreementFixture({
        performanceBonds: [{ enabled: true, status: "evidence_due" }],
      }),
    ),
    "evidence_due",
  );
  assert.equal(
    mapAgreementToCommitmentStatus(
      agreementFixture({
        payments: [{ authorization_status: "not_required_for_stage", status: "refunded" }],
      }),
    ),
    "refunded_or_released",
  );
  assert.equal(
    mapAgreementToCommitmentStatus(
      agreementFixture({
        reviewCases: [{ status: "open" }],
      }),
    ),
    "under_review",
  );
  assert.equal(getCommitmentStatusLabel("challenge_window"), "Challenge window");
});

test("DealScout recommendations are deterministic and bounded to explicit preferences", () => {
  const deals = [
    requiredDealFields({
      causeTags: ["Animal welfare"],
      filterTags: ["lowest_effort", "no_personal_exposure"],
      id: "animal-low",
      reviewStatus: "reviewer_approved",
      title: "Animal welfare low effort pledge",
      userMaxExposureCents: 0,
    }),
    requiredDealFields({
      causeTags: ["Climate"],
      filterTags: ["requires_evidence"],
      id: "climate-evidence",
      title: "Climate evidence route",
      userMaxExposureCents: 10_000,
    }),
  ];

  const recommendations = recommendMarketplaceDeals(
    deals,
    parseMarketplaceQuery({
      scout_budget: "25",
      scout_cause: "animal",
      scout_reviewer_approved: "1",
      scout_verification: "low",
    }),
  );

  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].deal.id, "animal-low");
  assert.deepEqual(recommendations[0].reasons, [
    "Matches your cause preference",
    "Within your monthly cap",
    "Low verification burden",
    "Reviewer-approved",
    "No personal exposure",
  ]);
});

test("deal card and commitment sheet render missing optional fields as unavailable and conditional", () => {
  const incompleteDeal = requiredDealFields({
    ctaLabel: "View details",
    mechanismType: "unknown",
    title: "Incomplete public preview",
  });
  const publicGoodsDeal = requiredDealFields({
    ctaLabel: "Preview budget",
    mechanismType: "public_goods_round",
    thresholdTargetCents: 50_000,
    title: "Threshold public-good round",
  });

  const cardMarkup = renderToStaticMarkup(createElement(MoralDealCard, { deal: incompleteDeal }));
  const sheetMarkup = renderToStaticMarkup(
    createElement(CommitmentSheet, {
      commitHref: "/mpgf/rounds/demo",
      deal: publicGoodsDeal,
      paymentSupportAvailable: false,
    }),
  );

  assert.match(cardMarkup, /Incomplete public preview/);
  assert.match(cardMarkup, /Review unavailable/);
  assert.match(cardMarkup, /Unavailable/);
  assert.match(cardMarkup, /View details/);
  assert.match(sheetMarkup, /<details/);
  assert.match(sheetMarkup, /Preview this round/);
  assert.match(sheetMarkup, /Preview budget/);
  assert.match(sheetMarkup, /No charge from this preview/);
  assert.match(sheetMarkup, /does not create a completed commitment/);
});
