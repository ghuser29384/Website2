import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveOfferPlaneCauseAreas,
  offerPlaneItemFromWorkedOffer,
  scoreDurationChallenge,
  scoreOfferChallenge,
  scoreOffererCredit,
  scoreOfferReturn,
} from "@/lib/offer-plane";
import { SEED_OFFERS } from "@/lib/offers";

test("challenge scoring treats a year without meat as harder than one meal", () => {
  const meal = scoreOfferChallenge({
    action: "Do not eat meat for one meal.",
    duration: "One meal",
    verification: "Public pledge",
  });
  const year = scoreOfferChallenge({
    action: "Adopt a vegetarian diet for 12 months with monthly check-ins.",
    duration: "12 months",
    verification: "Peer witness",
  });

  assert.ok(year.score > meal.score);
  assert.ok(year.score >= 90);
  assert.ok(meal.score <= 25);
});

test("duration parser preserves the intended ordinal scale", () => {
  assert.ok(scoreDurationChallenge("One meal").score < scoreDurationChallenge("30 days").score);
  assert.ok(scoreDurationChallenge("30 days").score < scoreDurationChallenge("12 months").score);
  assert.ok(scoreDurationChallenge("12 months").score < scoreDurationChallenge("Open-ended").score);
  assert.equal(
    scoreDurationChallenge("12 months", "Avoid meat for one meal each day for 12 months.").score,
    90,
  );
});

test("cause extraction adds a vegetarianism facet without dropping named causes", () => {
  const causes = deriveOfferPlaneCauseAreas([
    "Animal welfare",
    "Global poverty",
    "Adopt a vegetarian diet for 12 months.",
  ]);

  assert.ok(causes.includes("Vegetarianism"));
  assert.ok(causes.includes("Animal welfare"));
  assert.ok(causes.includes("Global poverty"));
  assert.ok(!causes.some((cause) => cause.startsWith("Adopt a vegetarian")));
});

test("return scoring responds to stated impact and monetary value", () => {
  const lower = scoreOfferReturn({ action: "Make a public pledge.", impactScore: 3 });
  const higher = scoreOfferReturn({ action: "Pay $1,000 after completion.", impactScore: 8 });

  assert.ok(higher.score > lower.score);
});

test("offerer credit is null without public history and rises with backed signals", () => {
  assert.equal(scoreOffererCredit(null).score, null);
  const backed = scoreOffererCredit({
    karma: 160,
    rating: 4.8,
    ratingCount: 12,
    verificationBadgeCount: 2,
  });

  assert.ok(typeof backed.score === "number");
  assert.ok((backed.score ?? 0) >= 75);
});

test("offered payments increase return without being counted as requested exposure", () => {
  const template = SEED_OFFERS.find((candidate) => candidate.id === "seed-lina");
  assert.ok(template);
  const item = offerPlaneItemFromWorkedOffer({
    ...template,
    id: "paid-meal",
    offerAction: "Pay $20 after completion.",
    requestAction: "Do not eat meat for one meal.",
    duration: "One meal",
  });

  assert.equal(item.maxExposureCents, null);
  assert.ok(item.challengeScore <= 25);
  assert.ok(item.returnScore >= 70);
});

test("worked offer adapter exposes plane coordinates and keeps examples unrated", () => {
  const offer = SEED_OFFERS.find((candidate) => candidate.id === "seed-victoria");
  assert.ok(offer);
  const item = offerPlaneItemFromWorkedOffer(offer);

  assert.equal(item.source, "worked_example");
  assert.equal(item.creditScore, null);
  assert.ok(item.causeAreas.includes("Vegetarianism"));
  assert.ok(item.challengeScore >= 90);
  assert.ok(item.returnScore > 0);
});
