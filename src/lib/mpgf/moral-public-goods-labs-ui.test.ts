import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

import {
  MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_FEATURE_FLAG,
  MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_LIVE_MONEY_FLAG,
  MORAL_PUBLIC_GOODS_LABS_ORDINARY_COPY,
  MORAL_PUBLIC_GOODS_LABS_POOL,
  MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_FEATURE_FLAG,
  MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_LIVE_MONEY_FLAG,
  MORAL_PUBLIC_GOODS_LABS_SUCCESS_PREMIUM_SCHEDULE,
  evaluateMoralPublicGoodsLabsAccess,
  findProhibitedMoralPublicGoodsLabsCopy,
  formatUsd,
  getMoralPublicGoodsLabsSidebarNotes,
  parseUsdInputToCents,
  roundHalfUpBasisPoints,
} from "./moral-public-goods-labs-ui";

const routePagePath = "src/app/labs/moral-public-goods/[poolSlug]/page.tsx";
const clientPath = "src/app/labs/moral-public-goods/[poolSlug]/moral-public-goods-labs-client.tsx";
const cssPath = "src/app/labs/moral-public-goods/[poolSlug]/moral-public-goods-labs.module.css";
const docsPath = "docs/moral-public-goods-labs-ui.md";

test("moral public goods labs fixture matches the required reviewed pool", () => {
  assert.equal(MORAL_PUBLIC_GOODS_LABS_POOL.slug, "global-biosecurity-coordination");
  assert.equal(MORAL_PUBLIC_GOODS_LABS_POOL.title, "Global Biosecurity Coordination");
  assert.equal(
    MORAL_PUBLIC_GOODS_LABS_POOL.description,
    "Funding independent research and coordination to reduce catastrophic biological risks that no single actor can solve alone.",
  );
  assert.equal(MORAL_PUBLIC_GOODS_LABS_POOL.closesAt, "2026-07-14T23:59:00Z");
  assert.equal(MORAL_PUBLIC_GOODS_LABS_POOL.closesLabel, "Closes Jul 14, 2026, 23:59 UTC (6d 12h remaining)");
  assert.equal(MORAL_PUBLIC_GOODS_LABS_POOL.qualitativeProgress, "building");
  assert.equal(MORAL_PUBLIC_GOODS_LABS_POOL.minVerifiedSupporters, 150);
  assert.equal(MORAL_PUBLIC_GOODS_LABS_POOL.progressSealed, true);
  assert.equal(MORAL_PUBLIC_GOODS_LABS_POOL.reserveBacked, true);
  assert.equal(MORAL_PUBLIC_GOODS_LABS_POOL.nonMvp, true);
  assert.deepEqual(
    MORAL_PUBLIC_GOODS_LABS_POOL.projects.map((project) => project.name),
    [
      "Pathogen Surveillance Data Commons",
      "Open Biosecurity Methods Lab",
      "Global Outbreak Coordination Network",
    ],
  );
  assert.equal(MORAL_PUBLIC_GOODS_LABS_SUCCESS_PREMIUM_SCHEDULE.thresholds[0]?.premiumRateBps, 201);
  assert.equal(MORAL_PUBLIC_GOODS_LABS_SUCCESS_PREMIUM_SCHEDULE.thresholds[0]?.successPremiumCents, 20_100);
  assert.equal(
    MORAL_PUBLIC_GOODS_LABS_SUCCESS_PREMIUM_SCHEDULE.thresholds[0]?.grossSuccessRequirementCents,
    1_020_100,
  );
  assert.equal(
    MORAL_PUBLIC_GOODS_LABS_SUCCESS_PREMIUM_SCHEDULE.thresholds[0]?.premiumIncludedInNetRecipientThreshold,
    false,
  );
  assert.deepEqual(
    MORAL_PUBLIC_GOODS_LABS_POOL.platformTiers.map((tier) => [
      tier.tierIndex,
      tier.thresholdCents,
      tier.forecastProbabilityBps,
      tier.platformMatchRateBps,
    ]),
    [
      [1, 100_000, 7_500, 500],
      [2, 300_000, 5_500, 900],
      [3, 500_000, 3_500, 1_500],
      [4, 1_000_000, 2_000, 2_300],
      [5, 2_500_000, 1_000, 3_500],
    ],
  );
});

test("moral public goods labs math uses integer cents and round-half-up basis points", () => {
  assert.equal(parseUsdInputToCents("25.00"), 2_500);
  assert.equal(parseUsdInputToCents("25.5"), 2_550);
  assert.equal(formatUsd(375), "$3.75");
  assert.equal(roundHalfUpBasisPoints(2_500, 1_500), 375);
  assert.equal(roundHalfUpBasisPoints(1, 5_000), 1);
  assert.equal(roundHalfUpBasisPoints(1, 4_999), 0);
});

test("dynamic sidebar copy preserves refund-bonus and platform-match semantics", () => {
  const refundNotes = getMoralPublicGoodsLabsSidebarNotes("refund_bonus");
  const atLeastNotes = getMoralPublicGoodsLabsSidebarNotes("at_least_tier");

  assert.equal(refundNotes.some((note) => note.includes("No direct user payout")), false);
  assert.ok(refundNotes.some((note) => note === "Failure bonus is conditional and backed."));
  assert.ok(refundNotes.some((note) => note === "Exact progress is hidden until the round closes."));
  assert.ok(refundNotes.some((note) => note.includes("Successful pools replenish the common reserve")));
  assert.ok(refundNotes.some((note) => note === "The premium is separate from the net recipient threshold."));
  assert.ok(atLeastNotes.some((note) => note === "No direct user payout. Platform match goes to projects."));
  assert.ok(atLeastNotes.some((note) => note === "Your own commitment and same-control accounts do not count."));
});

test("ordinary labs UI copy avoids prohibited terms and exact progress claims", () => {
  assert.deepEqual(findProhibitedMoralPublicGoodsLabsCopy(MORAL_PUBLIC_GOODS_LABS_ORDINARY_COPY), []);
  const joined = MORAL_PUBLIC_GOODS_LABS_ORDINARY_COPY.join("\n").toLowerCase();
  for (const leak of [
    "exact live threshold gap",
    "supporter gap",
    "different-view cluster gap",
    "your pledge is pivotal",
    "success-without-me",
    "damped odds",
    "odds",
  ]) {
    assert.equal(joined.includes(leak), false, leak);
  }
});

test("labs route gates production public access and allows non-production labs access", () => {
  const productionPublic = evaluateMoralPublicGoodsLabsAccess({
    actorRole: "public",
    atLeastTierFeatureEnabled: false,
    atLeastTierViewAllowed: false,
    environment: "production",
    refundBonusFeatureEnabled: false,
    refundBonusViewAllowed: false,
  });
  assert.equal(productionPublic.canRenderInteractiveUi, false);
  assert.ok(productionPublic.reasonCodes.includes("requires_labs_or_admin_role"));
  assert.ok(productionPublic.reasonCodes.includes(`${MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_FEATURE_FLAG}_disabled`));
  assert.ok(productionPublic.reasonCodes.includes(`${MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_FEATURE_FLAG}_disabled`));

  const developmentLabs = evaluateMoralPublicGoodsLabsAccess({
    actorRole: "labs_participant",
    atLeastTierFeatureEnabled: true,
    atLeastTierViewAllowed: true,
    environment: "development",
    refundBonusFeatureEnabled: true,
    refundBonusViewAllowed: true,
  });
  assert.equal(developmentLabs.canRenderInteractiveUi, true);
  assert.deepEqual(developmentLabs.reasonCodes, []);
});

test("combined labs route uses existing v137 gates and stays out of the CGPP MVP path", () => {
  assert.equal(existsSync(routePagePath), true);
  assert.equal(existsSync(clientPath), true);
  assert.equal(existsSync(cssPath), true);

  const routePage = readFileSync(routePagePath, "utf8");
  const helper = readFileSync("src/lib/mpgf/moral-public-goods-labs-ui.ts", "utf8");
  const mvpRoundPage = readFileSync("src/app/mpgf/rounds/[roundId]/page.tsx", "utf8");

  assert.match(routePage, /evaluateRefundBonusCapability/);
  assert.match(routePage, /evaluateAtLeastTierPlatformMatchCapability/);
  assert.match(routePage, /MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_FEATURE_FLAG/);
  assert.match(routePage, /MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_FEATURE_FLAG/);
  assert.match(routePage, /MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_LIVE_MONEY_FLAG/);
  assert.match(routePage, /MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_LIVE_MONEY_FLAG/);
  assert.match(helper, new RegExp(MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_FEATURE_FLAG));
  assert.match(helper, new RegExp(MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_FEATURE_FLAG));
  assert.match(helper, new RegExp(MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_LIVE_MONEY_FLAG));
  assert.match(helper, new RegExp(MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_LIVE_MONEY_FLAG));
  assert.match(routePage, /LabsUnavailablePage/);
  assert.equal(routePage.includes("SiteFooter"), false);
  assert.equal(mvpRoundPage.includes("/labs/moral-public-goods"), false);
  assert.equal(mvpRoundPage.includes("Global Biosecurity Coordination"), false);
});

test("client UI source covers selector behavior, drawers, review modal, and accessibility hooks", () => {
  const client = readFileSync(clientPath, "utf8");

  assert.match(client, /role="radiogroup"/);
  assert.match(client, /role="radio"/);
  assert.match(client, /aria-checked=\{mechanism === "refund_bonus"\}/);
  assert.match(client, /aria-checked=\{mechanism === "at_least_tier"\}/);
  assert.match(client, /onKeyDown=\{\(event\) => handleMechanismKeyDown/);
  assert.match(client, /mechanism === "refund_bonus" \? \(/);
  assert.match(client, /mechanism === "at_least_tier" \? \(/);
  assert.match(client, /aria-live="polite"/);
  assert.match(client, /aria-expanded=\{activePanel === "refund_rules"\}/);
  assert.match(client, /aria-expanded=\{activePanel === "tier_rules"\}/);
  assert.match(client, /role="dialog"/);
  assert.match(client, /I understand I am not being charged now/);
  assert.match(client, /I understand my own commitment does not count toward my forecast result/);
  assert.match(client, /disabled=\{!refundAcks\.allChecked \|\| !simulationOnly\}/);
  assert.match(client, /disabled=\{!platformAcks\.allChecked \|\| !simulationOnly\}/);
  assert.match(client, /No production commitment, payment-method setup, authorization, capture, routing, platform match, or bonus payment was created/);
  assert.match(client, /Common Failure Bonus Reserve/);
  assert.match(client, /The success premium is outside the net recipient threshold/);
});

test("route CSS preserves the simplified two-column desktop and single-column mobile layout", () => {
  const css = readFileSync(cssPath, "utf8");

  assert.match(css, /\.grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(380px,\s*420px\)/);
  assert.match(css, /gap:\s*32px/);
  assert.match(css, /background:\s*#ffffff/);
  assert.match(css, /background:\s*#0d8f45/);
  assert.match(css, /@media \(max-width:\s*980px\)[\s\S]*\.grid\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /:focus-visible/);
});

test("labs UI documentation records route, flags, copy choices, tests, and production gating", () => {
  assert.equal(existsSync(docsPath), true);
  const docs = readFileSync(docsPath, "utf8");

  assert.match(docs, /\/labs\/moral-public-goods\/\[poolSlug\]/);
  assert.match(docs, new RegExp(MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_FEATURE_FLAG));
  assert.match(docs, new RegExp(MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_FEATURE_FLAG));
  assert.match(docs, new RegExp(MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_LIVE_MONEY_FLAG));
  assert.match(docs, new RegExp(MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_LIVE_MONEY_FLAG));
  assert.match(docs, /Refund-Bonus Pledge sidebar does not say "No direct user payout"/);
  assert.match(docs, /Production\/public access renders an unavailable Labs page/);
  assert.match(docs, /integer-cent platform-match calculation/);
  assert.match(docs, /Common Failure Bonus Reserve and Success Premium/);
  assert.match(docs, /success premium is outside the net recipient threshold/);
});
