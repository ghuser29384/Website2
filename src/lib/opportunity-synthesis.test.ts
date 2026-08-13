import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSynthesizedTradeDraftPrefill,
  isOpportunitySynthesisEnabled,
  mergeExistingAndSynthesizedRecommendations,
  parseSynthesizedOpportunityId,
  synthesizeBottleneckAtlasRecommendations,
} from "./opportunity-synthesis";
import { getSynthesisTemplate } from "./bottleneck-atlas";
import { opportunityKey } from "./recommendation-learning";

const checkedAt = new Date("2026-08-11T16:00:00.000Z");

test("synthesis generates specific and generic possibilities without inventing consent", () => {
  const result = synthesizeBottleneckAtlasRecommendations({
    profile: {
      causes: ["AI governance", "animal welfare"],
      causeSignals: [
        { cause: "AI governance", weight: 100, source: "explicit_priority", rank: 1 },
        { cause: "animal welfare", weight: 82, source: "profile_priority", rank: 2 },
      ],
    },
    now: checkedAt,
    limit: 6,
  });

  assert.ok(
    result.recommendations.some(
      (recommendation) =>
        recommendation.metadata.templateId === "ai-governance-advocacy-operations",
    ),
  );
  assert.ok(result.recommendations.some((recommendation) => recommendation.metadata.templateId === "reciprocal-donation-redirect"));
  assert.equal(result.diagnostics.privateTextSentToProvider, false);
  assert.equal(result.diagnostics.counterpartyClaimsMade, false);
  assert.equal(result.diagnostics.liveOffersCreated, false);

  for (const recommendation of result.recommendations) {
    assert.equal(recommendation.metadata.origin, "platform_generated");
    assert.equal(recommendation.metadata.moralTradeStatus, "unconfirmed");
    assert.equal(recommendation.metadata.verifiedCounterparty, false);
    assert.equal(recommendation.metadata.liveOffer, false);
    assert.match(recommendation.ownerAlias, /no counterparty has agreed/i);
    assert.match(recommendation.reasonDetails.join(" "), /hypothesis, not a live offer/i);
    assert.match(recommendation.verification, /Unconfirmed synthesis/);
    assert.match(recommendation.href, /^\/suggested-opportunities\//);
    assert.doesNotMatch(recommendation.href, /[?&]cause=/);
  }
});

test("synthesis is empty when no declared priority exists", () => {
  const result = synthesizeBottleneckAtlasRecommendations({
    profile: { causes: [] },
    now: checkedAt,
  });
  assert.deepEqual(result.recommendations, []);
  assert.equal(result.diagnostics.profileSignalCount, 0);
});

test("synthesis identifiers are stable and cause-specific", () => {
  const build = (cause: string) =>
    synthesizeBottleneckAtlasRecommendations({
      profile: { causes: [cause] },
      now: checkedAt,
      limit: 8,
    }).recommendations;
  const first = build("biosecurity");
  const second = build("biosecurity");
  const other = build("air quality");

  assert.deepEqual(first.map((item) => item.id), second.map((item) => item.id));
  assert.equal(new Set(first.map((item) => item.id)).size, first.length);
  assert.notDeepEqual(first.map((item) => item.id), other.map((item) => item.id));
});

test("generated identifiers resolve only to known synthesis templates", () => {
  const recommendation = synthesizeBottleneckAtlasRecommendations({
    profile: { causes: ["AI governance"] },
    now: checkedAt,
    limit: 8,
  }).recommendations.find(
    (item) => item.metadata.templateId === "ai-governance-advocacy-operations",
  );

  assert.ok(recommendation);
  const parsed = parseSynthesizedOpportunityId(recommendation.id);
  assert.equal(parsed?.template.id, "ai-governance-advocacy-operations");
  assert.equal(parsed?.matchedCause, "ai governance");
  assert.equal(parseSynthesizedOpportunityId("synth:not-a-template:ai-governance"), null);
  assert.equal(parseSynthesizedOpportunityId("offer:ai-governance"), null);
  assert.equal(parseSynthesizedOpportunityId("synth:ai-governance-advocacy-operations:"), null);
});

test("atlas candidates prefill a private draft without inventing a counterparty or executable terms", () => {
  const template = getSynthesisTemplate("ai-governance-advocacy-operations");
  assert.ok(template);

  const firstParty = buildSynthesizedTradeDraftPrefill({
    template,
    matchedCause: "AI governance",
    role: "first_party",
  });
  const counterparty = buildSynthesizedTradeDraftPrefill({
    template,
    matchedCause: "animal welfare",
    role: "counterparty",
  });

  assert.equal(firstParty.requestedCause, "AI governance");
  assert.equal(counterparty.requestedCause, "animal welfare");
  assert.match(firstParty.proposedAction, /Full backfill/);
  assert.match(counterparty.proposedAction, /Defined transferable capability/);
  assert.match(firstParty.offeredCause, /^\[Replace:/);
  assert.match(firstParty.noTradeBaseline, /^\[Replace:/);
  assert.match(firstParty.notes, /No named counterparty is confirmed/);
  assert.match(firstParty.notes, /not a live offer or agreement/);
  assert.equal(firstParty.voluntaryCertification, false);

  const privateFallback = buildSynthesizedTradeDraftPrefill({
    template,
    matchedCause: "",
    role: "first_party",
  });
  assert.match(privateFallback.requestedCause, /^\[Replace:/);
});

test("the kill switch is explicit and fail-operational only when not disabled", () => {
  assert.equal(isOpportunitySynthesisEnabled({ OPPORTUNITY_SYNTHESIS_ENABLED: "false" }), false);
  assert.equal(isOpportunitySynthesisEnabled({ OPPORTUNITY_SYNTHESIS_ENABLED: "FALSE" }), false);
  assert.equal(isOpportunitySynthesisEnabled({ OPPORTUNITY_SYNTHESIS_ENABLED: "true" }), true);
  assert.equal(isOpportunitySynthesisEnabled({}), true);
});

test("generated possibilities are interleaved without displacing the entire existing feed", () => {
  const existing = Array.from({ length: 10 }, (_, index) => ({ id: `existing-${index + 1}` }));
  const synthesized = Array.from({ length: 6 }, (_, index) => ({ id: `synthesized-${index + 1}` }));
  const merged = mergeExistingAndSynthesizedRecommendations(existing, synthesized, 12);

  assert.equal(merged.length, 12);
  assert.deepEqual(merged.slice(0, 3).map((item) => item.id), [
    "existing-1",
    "existing-2",
    "synthesized-1",
  ]);
  assert.equal(merged.filter((item) => item.id.startsWith("synthesized-")).length, 3);
  assert.equal(new Set(merged.map((item) => item.id)).size, merged.length);
});

test("when no published inventory exists, the feed can still surface generated possibilities", () => {
  const synthesized = Array.from({ length: 8 }, (_, index) => ({ id: `synthesized-${index + 1}` }));
  const merged = mergeExistingAndSynthesizedRecommendations([], synthesized, 12);
  assert.equal(merged.length, 5);
  assert.ok(merged.every((item) => item.id.startsWith("synthesized-")));
});


test("generated feedback persists across feed refreshes without exposing the private cause in a URL", () => {
  const profile = {
    causes: ["AI governance"],
    causeSignals: [
      { cause: "AI governance", weight: 100, source: "explicit_priority" as const, rank: 1 },
    ],
  };
  const initial = synthesizeBottleneckAtlasRecommendations({
    profile,
    now: checkedAt,
    limit: 8,
  }).recommendations.find(
    (item) => item.metadata.templateId === "ai-governance-advocacy-operations",
  );
  assert.ok(initial);
  assert.doesNotMatch(initial.href, /[?&]cause=/);

  const key = opportunityKey(initial.opportunityType, initial.id);
  const learned = {
    actionKey: initial.actionKey,
    actionLabel: initial.actionLabel,
    difficulty: 4.2,
    willingness: 24,
    observationCount: 3,
    explicitDifficultyCount: 2,
  };
  const refreshed = synthesizeBottleneckAtlasRecommendations({
    profile: {
      ...profile,
      actionPreferences: new Map([[initial.actionKey, learned]]),
      savedOpportunityKeys: new Set([key]),
    },
    now: checkedAt,
    limit: 8,
  }).recommendations.find((item) => item.id === initial.id);

  assert.ok(refreshed);
  assert.equal(refreshed.saved, true);
  assert.equal(refreshed.actionKey, initial.actionKey);
  assert.equal(refreshed.difficulty, 4.2);
  assert.equal(refreshed.willingness, 24);
  assert.equal(refreshed.learnedActionSignalCount, 3);

  const hidden = synthesizeBottleneckAtlasRecommendations({
    profile: {
      ...profile,
      hiddenOpportunityKeys: new Set([key]),
    },
    now: checkedAt,
    limit: 8,
  }).recommendations;
  assert.equal(hidden.some((item) => item.id === initial.id), false);
});
