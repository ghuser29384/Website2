import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  CommitmentSheet,
  MarketplaceHome,
  MoralDealCard,
} from "@/components/marketplace/marketplace-components";
import {
  MIN_PUBLIC_GROUP_COUNT,
  buildDealEconomics,
  buildMarketplaceDeals,
  buildMarketplaceHref,
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

test("marketplace card surfaces optional fallback evidence without proof language", () => {
  const markup = renderToStaticMarkup(
    createElement(MoralDealCard, {
      deal: requiredDealFields({
        fallbackLivestreamEvidence: {
          actionStatement: "Record the stated fallback action in the scheduled external stream.",
          branchLabel: "No-trade branch evidence",
          href: "/evidence/fallback-livestream/fallback-route-1",
          observationLabel: "Observed if no trade clears",
          providerLabel: "External stream URL",
          recordingDueLabel: "Jul 8, 2026, 1:00 PM",
          scheduleLabel: "Jul 7, 2026, 12:30 PM - Jul 7, 2026, 1:00 PM",
          statusLabel: "Livestream scheduled",
          title: "Fallback livestream evidence",
        },
      }),
    }),
  );

  assert.match(markup, /Observed if no trade clears/);
  assert.doesNotMatch(markup, /Counterfactual verified|Natural baseline proven|Verified intent|Guaranteed counterfactual|Counterfactual proof|Public proof badge/);
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

test("marketplace source filters are derived from display-model owners", () => {
  const workedOffer = SEED_OFFERS.find((offer) => offer.mode === "offset");
  assert.ok(workedOffer);
  const workedDeal = marketplaceDealFromWorkedOffer(workedOffer);
  const [publicGoodsDeal] = marketplaceDealsFromPublicGoodsCampaigns({
    campaigns: demoMpgfPublicGoodsCampaigns.slice(0, 1),
    matchPool: demoMpgfMatchPool,
    round: demoMpgfAssuranceRound,
  });
  assert.ok(publicGoodsDeal);

  assert.ok(workedDeal.filterTags?.includes("source_worked_example"));
  assert.ok(workedDeal.filterTags?.includes("preview_only"));
  assert.ok(publicGoodsDeal.filterTags?.includes("source_public_goods"));
  assert.ok(publicGoodsDeal.filterTags?.includes("preview_only"));

  const publicGoodsSurface = buildMarketplaceSurface(
    [workedDeal, publicGoodsDeal],
    parseMarketplaceQuery({ marketplace_filter: "source_public_goods" }),
  );
  assert.equal(publicGoodsSurface.deals.length, 1);
  assert.equal(publicGoodsSurface.deals[0].sourceLabel, "Public Goods Fund");

  const emptySurface = buildMarketplaceSurface(
    [workedDeal, publicGoodsDeal],
    parseMarketplaceQuery({
      marketplace_filter: ["source_public_goods", "source_worked_example"],
    }),
  );
  assert.equal(emptySurface.deals.length, 0);
  assert.match(emptySurface.emptyState ?? "", /No reliable public deal data matches these filters/);
});

test("compact browse cause filters use honest query state", () => {
  const healthDeal = requiredDealFields({
    filterTags: ["cause_health", "requires_evidence"],
    id: "health-deal",
    title: "Public health pledge",
  });
  const animalDeal = requiredDealFields({
    filterTags: ["cause_animals"],
    id: "animal-deal",
    title: "Animal welfare pledge",
  });
  const query = parseMarketplaceQuery({ marketplace_filter: "cause_health" });
  const surface = buildMarketplaceSurface([healthDeal, animalDeal], query);
  const markup = renderToStaticMarkup(
    createElement(MarketplaceHome, {
      createHref: "/offers/new",
      liveOfferCount: 0,
      query,
      surface,
    }),
  );

  assert.deepEqual(query.filters, ["cause_health"]);
  assert.equal(surface.deals.length, 1);
  assert.equal(surface.deals[0].id, "health-deal");
  assert.match(markup, /href="\/offers\?marketplace_filter=cause_health"/);
  assert.match(markup, /aria-current="true" href="\/offers\?marketplace_filter=cause_health">Health/);
  assert.doesNotMatch(markup, /Health<\/a><a[^>]+requires_evidence/);
});

test("non-MVP labs inventory is omitted from Region A marketplace browse", () => {
  const ordinaryDeals = buildMarketplaceDeals({
    liveOffers: [],
    publicGoodsCampaigns: demoMpgfPublicGoodsCampaigns.slice(0, 1),
    publicGoodsMatchPool: demoMpgfMatchPool,
    publicGoodsRound: demoMpgfAssuranceRound,
    workedOffers: [],
  });
  const labsDeals = buildMarketplaceDeals({
    includeNonMvpLabs: true,
    liveOffers: [],
    publicGoodsCampaigns: demoMpgfPublicGoodsCampaigns.slice(0, 1),
    publicGoodsMatchPool: demoMpgfMatchPool,
    publicGoodsRound: demoMpgfAssuranceRound,
    workedOffers: [],
  });

  assert.equal(ordinaryDeals.some((deal) => deal.href.startsWith("/donation-cancellation")), false);
  assert.equal(labsDeals.some((deal) => deal.href.startsWith("/donation-cancellation")), false);
});

test("marketplace home renders one-rail filter sheet with URL apply controls", () => {
  const workedOffer = SEED_OFFERS.find((offer) => offer.mode === "offset");
  assert.ok(workedOffer);
  const workedDeal = marketplaceDealFromWorkedOffer(workedOffer);
  const [publicGoodsDeal] = marketplaceDealsFromPublicGoodsCampaigns({
    campaigns: demoMpgfPublicGoodsCampaigns.slice(0, 1),
    matchPool: demoMpgfMatchPool,
    round: demoMpgfAssuranceRound,
  });
  assert.ok(publicGoodsDeal);
  const query = parseMarketplaceQuery({ marketplace_filter: "source_worked_example", search: "gun" });
  const surface = buildMarketplaceSurface([workedDeal, publicGoodsDeal], query);
  const markup = renderToStaticMarkup(
    createElement(MarketplaceHome, {
      createHref: "/offers/new",
      liveOfferCount: 0,
      query,
      surface,
    }),
  );

  assert.match(markup, /browse_filters=1/);
  assert.match(markup, /id="browse-filter-sheet"/);
  assert.match(markup, /All filters/);
  assert.match(markup, /href="\/offers\?search=gun&amp;marketplace_filter=source_worked_example"/);
  assert.match(markup, /name="marketplace_filter"/);
  assert.match(markup, /value="source_worked_example"/);
  assert.match(markup, /Clear all/);
  assert.match(markup, /Apply filters/);
  assert.match(markup, /checked/);
  assert.equal(markup.includes("popular-filter-row"), false);
  assert.equal(buildMarketplaceHref({ query: surface.query }), "/offers?search=gun");
});

test("marketplace app shell keeps desktop browse cards in mobile-app proportions", () => {
  const css = readFileSync("src/app/globals.css", "utf8");

  assert.match(
    css,
    /\.marketplace-app-shell\s*{[\s\S]*?max-width:\s*500px;/,
    "desktop Browse shell should be capped to a mobile-app canvas",
  );
  assert.equal(
    css.includes("0 0 0 100vmax"),
    false,
    "app-shell background should not create horizontal scroll on desktop",
  );
  assert.match(
    css,
    /\.marketplace-app-shell \.marketplace-directory-layout,\s*\.marketplace-app-shell \.collection-trust-panel,\s*\.marketplace-app-shell \.footer\s*{[\s\S]*?display:\s*none;/,
    "legacy desktop browse rails should be hidden inside the v72 app shell",
  );
  assert.match(
    css,
    /\.marketplace-app-shell \.moral-marketplace-search\s*{[\s\S]*?position:\s*sticky;[\s\S]*?top:/,
    "search should remain a real sticky top control",
  );
  assert.match(
    css,
    /\.marketplace-app-shell \.moral-marketplace-search-button\s*{[\s\S]*?clip-path:\s*inset\(50%\);/,
    "app-shell search should not render a separate oversized submit button",
  );
  assert.match(
    css,
    /\.marketplace-app-shell \.moral-deal-card\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    "desktop cards should no longer stretch into a two-column desktop ad row",
  );
  assert.match(
    css,
    /\.marketplace-app-shell \.moral-deal-card-main\s*{[\s\S]*?grid-template-columns:\s*5\.85rem minmax\(0,\s*1fr\);/,
    "card visual and copy should use compact marketplace proportions",
  );
  assert.match(
    css,
    /\.marketplace-app-shell \.marketplace-bottom-nav\s*{[\s\S]*?grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);/,
    "bottom navigation should stay app-like with v76 Browse, Planner, Track, Messages, and Profile destinations",
  );
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

test("browse cards avoid default charge-state copy while preserving safety and sheet copy", () => {
  const query = parseMarketplaceQuery({});
  const deals = buildMarketplaceDeals({
    liveOffers: [],
    publicGoodsCampaigns: demoMpgfPublicGoodsCampaigns.slice(0, 1),
    publicGoodsMatchPool: demoMpgfMatchPool,
    publicGoodsRound: demoMpgfAssuranceRound,
    workedOffers: SEED_OFFERS,
  });
  const surface = buildMarketplaceSurface(deals, query);
  const markup = renderToStaticMarkup(
    createElement(MarketplaceHome, {
      createHref: "/offers/new",
      liveOfferCount: 0,
      query,
      surface,
    }),
  );
  const seedPaulDeal = surface.deals.find((deal) => deal.id === "seed-paul");
  assert.ok(seedPaulDeal);
  const sheetMarkup = renderToStaticMarkup(
    createElement(CommitmentSheet, {
      commitHref: "/offers/examples/seed-paul",
      deal: seedPaulDeal,
      paymentSupportAvailable: false,
    }),
  );

  assert.match(markup, /data-marketplace-featured/);
  assert.match(markup, /Preview only until you confirm/);
  assert.match(markup, /No commitment · No charge · You review every detail/);
  assert.match(markup, /12-month pledge/);
  assert.match(markup, /Effective poverty fund/);
  assert.match(markup, /Your action: vegetarian meals/);
  assert.match(markup, /No charge now/);
  assert.doesNotMatch(markup, /No commitment yet/);
  assert.doesNotMatch(markup, /<small>No commitment<\/small>/);
  assert.doesNotMatch(markup, /No commitment will be created/);
  assert.match(sheetMarkup, /No commitment was created\./);
  assert.match(sheetMarkup, /No commitment will be created/);
  assert.match(sheetMarkup, /Preview only/);
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
  assert.match(cardMarkup, /Review required/);
  assert.match(cardMarkup, /Exposure unknown/);
  assert.match(cardMarkup, /View details/);
  assert.match(sheetMarkup, /<details/);
  assert.match(sheetMarkup, /Preview budget/);
  assert.match(sheetMarkup, /No charge now/);
  assert.match(sheetMarkup, /No commitment was created\./);
  assert.match(sheetMarkup, /No commitment will be created/);
});
