import assert from "node:assert/strict";
import test from "node:test";

import {
  applyKnownFeasibilityToHybridFeed,
  buildHybridLiveNowFeed,
  buildPublicEmbeddingInputs,
} from "./live-now-hybrid-feed";
import type { LiveNowOfferCandidate, LiveNowProfileSignals } from "./live-now-recommendations";
import type { PublicEmbeddingInput, PublicEmbeddingProvider } from "./public-semantic-embeddings";

const now = new Date("2026-07-23T12:00:00.000Z");

function candidate(
  id: string,
  offeredCause: string,
  requestedCause: string,
  options: Partial<LiveNowOfferCandidate> = {},
): LiveNowOfferCandidate {
  return {
    id,
    ownerId: `owner-${id}`,
    ownerAlias: `Participant ${id}`,
    mode: "payment",
    offeredCause,
    requestedCause,
    compromiseCause: "Not needed",
    offerAction: `Produce a verified public result concerning ${offeredCause}`,
    requestAction: `Complete a bounded 60-minute task concerning ${requestedCause}`,
    verification: "Public artifact and counterparty confirmation",
    duration: "Complete within 30 days",
    trustLevel: 4,
    createdAt: "2026-07-22T12:00:00.000Z",
    updatedAt: "2026-07-23T10:00:00.000Z",
    ...options,
  };
}

function fakeProvider(
  vectorFor: (input: PublicEmbeddingInput) => number[],
): PublicEmbeddingProvider & { seen: PublicEmbeddingInput[] } {
  const seen: PublicEmbeddingInput[] = [];
  return {
    seen,
    async embed(inputs) {
      seen.push(...inputs);
      return {
        vectors: new Map(inputs.map((input) => [input.key, vectorFor(input)])),
        mode: "openai",
        model: "test-public-embedding",
        dimensions: 3,
        cacheHitCount: 0,
        providerInputCount: inputs.length,
        privateTextSentToProvider: false,
      };
    },
  };
}

const profile: LiveNowProfileSignals = {
  causes: ["AI safety"],
  causeSignals: [{ cause: "AI safety", weight: 98, source: "explicit_priority", rank: 1 }],
  openToPayment: true,
  openToPledges: true,
  explorationPercent: 12,
};

test("semantic retrieval can find an indirect public-text match without sending profile prose", async () => {
  const secret = "PRIVATE REFLECTION ABOUT MY FAMILY";
  const provider = fakeProvider((input) => {
    if (input.key === "concept:existential-risk") return [1, 0, 0];
    if (input.key.includes("indirect")) return [0.99, 0.01, 0];
    return [0, 1, 0];
  });
  const indirect = candidate(
    "indirect",
    "Robust automated decision systems",
    "Independent red-team evaluation",
    {
      offerAction: "Publish a reproducible adversarial evaluation of a frontier decision system.",
      summary: "A public technical stress test for rare, high-consequence failures.",
      benefitCauses: ["Robust automated decision systems"],
      actionCauses: ["Independent technical evaluation"],
    },
  );

  const result = await buildHybridLiveNowFeed({
    candidates: [indirect],
    profile: { ...profile, causes: ["AI safety", secret] },
    now,
    embeddingProvider: provider,
  });

  assert.equal(result.recommendations[0]?.id, "indirect");
  assert.ok(["direct", "near"].includes(result.recommendations[0]?.matchClass ?? ""));
  assert.equal(result.diagnostics.privateTextSentToProvider, false);
  assert.equal(provider.seen.some((input) => input.publicText.includes(secret)), false);
  assert.equal(provider.seen.every((input) => input.kind === "canonical" || input.kind === "opportunity"), true);
});

test("unmapped private priorities do not trigger an external embedding request", async () => {
  const provider = fakeProvider(() => [1, 0, 0]);
  const result = await buildHybridLiveNowFeed({
    candidates: [candidate("opaque", "Community project", "Volunteer task")],
    profile: {
      causes: ["Private family-specific reflective objective"],
      openToPayment: true,
      openToPledges: true,
    },
    now,
    embeddingProvider: provider,
  });

  assert.equal(provider.seen.length, 0);
  assert.equal(result.diagnostics.retrievalMode, "lexical_only");
  assert.equal(result.diagnostics.unmappedPriorityCount, 1);
  assert.equal(result.diagnostics.privateTextSentToProvider, false);
});

test("hard participation and hidden-state filters run before semantic retrieval", async () => {
  const provider = fakeProvider(() => [1, 0, 0]);
  const payment = candidate("payment", "AI safety", "Evaluation");
  const pledge = candidate("pledge", "AI safety", "Evaluation", { mode: "pledge" });
  const hidden = candidate("hidden", "AI safety", "Evaluation");

  const result = await buildHybridLiveNowFeed({
    candidates: [payment, pledge, hidden],
    profile: {
      ...profile,
      openToPayment: false,
      openToPledges: false,
      hiddenOpportunityKeys: new Set(["offer:hidden"]),
    },
    now,
    embeddingProvider: provider,
  });

  assert.deepEqual(result.recommendations, []);
  assert.equal(result.diagnostics.excludedByReason.payment_disabled, 2);
  assert.equal(result.diagnostics.excludedByReason.pledge_disabled, 1);
  assert.equal(provider.seen.length, 0);
});

test("reciprocal scoring lowers a hard action below an easier alternative", async () => {
  const provider = fakeProvider(() => [1, 0, 0]);
  const hard = candidate("hard", "AI safety", "Animal welfare", {
    requestAction: "Do not eat meat for one month",
    actionKey: "diet:reduce-meat",
  });
  const easy = candidate("easy", "AI safety", "Research support", {
    requestAction: "Review one public evaluation for 30 minutes",
    actionKey: "research:review",
  });
  const learned = new Map([
    [
      "diet:reduce-meat",
      {
        actionKey: "diet:reduce-meat",
        actionLabel: "Reduce meat",
        difficulty: 5,
        willingness: 15,
        observationCount: 4,
        explicitDifficultyCount: 2,
      },
    ],
    [
      "research:review",
      {
        actionKey: "research:review",
        actionLabel: "Review research",
        difficulty: 1.5,
        willingness: 80,
        observationCount: 4,
        explicitDifficultyCount: 2,
      },
    ],
  ]);

  const result = await buildHybridLiveNowFeed({
    candidates: [hard, easy],
    profile: { ...profile, actionPreferences: learned },
    now,
    embeddingProvider: provider,
  });

  assert.deepEqual(result.recommendations.map((item) => item.id), ["easy", "hard"]);
  const hardResult = result.recommendations.find((item) => item.id === "hard")!;
  const easyResult = result.recommendations.find((item) => item.id === "easy")!;
  assert.ok(easyResult.acceptanceEstimates.user > hardResult.acceptanceEstimates.user);
  assert.ok(easyResult.reciprocalScore > hardResult.reciprocalScore);
});

test("diagnostics expose the whole funnel and all calibrated feed classes", async () => {
  const provider = fakeProvider((input) => {
    if (input.kind === "canonical") return [1, 0, 0];
    if (input.key.includes("direct")) return [1, 0, 0];
    if (input.key.includes("near")) return [0.75, 0.25, 0];
    if (input.key.includes("adjacent")) return [0.45, 0.55, 0];
    return [0, 1, 0];
  });
  const candidates = [
    candidate("direct", "AI safety", "Evaluation"),
    candidate("near", "Robust systems", "Evaluation", { trustLevel: 2 }),
    candidate("adjacent", "Technical governance", "Public explanation", { trustLevel: 2 }),
    candidate("discovery", "Community gardening", "Volunteer shift", { trustLevel: 3 }),
  ];

  const result = await buildHybridLiveNowFeed({ candidates, profile, now, embeddingProvider: provider });
  const classes = new Set(result.recommendations.map((item) => item.matchClass));
  assert.ok(classes.has("direct"));
  assert.ok(result.diagnostics.checkedInventoryCount === 4);
  assert.ok(result.diagnostics.eligibleCount === 4);
  assert.equal(result.diagnostics.embeddingCoveragePercent, 100);
  assert.equal(result.diagnostics.retrievalMode, "openai");
  assert.equal(
    result.diagnostics.directCount +
      result.diagnostics.nearMatchCount +
      result.diagnostics.adjacentCount +
      result.diagnostics.discoveryCount,
    4,
  );
});

test("known complete-profile constraints downgrade an otherwise direct match", async () => {
  const provider = fakeProvider(() => [1, 0, 0]);
  const result = await buildHybridLiveNowFeed({
    candidates: [candidate("budget-blocked", "AI safety", "Evaluation")],
    profile,
    now,
    embeddingProvider: provider,
  });
  assert.equal(result.recommendations[0]?.matchClass, "direct");

  const adjusted = applyKnownFeasibilityToHybridFeed(result, [
    { sourceId: "budget-blocked", reasons: ["time_budget", "horizon"] },
  ]);

  assert.equal(adjusted.recommendations[0]?.matchClass, "near");
  assert.equal(adjusted.directRecommendations.length, 0);
  assert.equal(adjusted.diagnostics.directCount, 0);
  assert.equal(adjusted.diagnostics.nearMatchCount, 1);
  assert.equal(adjusted.diagnostics.knownConstraintBlockers.time_budget, 1);
  assert.match(adjusted.recommendations[0]?.reason ?? "", /known profile constraints/);
});

test("saved opportunities remain in the bounded semantic retrieval pool", async () => {
  const previous = process.env.LIVE_FEED_RETRIEVAL_POOL_SIZE;
  process.env.LIVE_FEED_RETRIEVAL_POOL_SIZE = "60";
  try {
    const provider = fakeProvider((input) =>
      input.kind === "canonical" ? [1, 0, 0] : [0, 1, 0],
    );
    const candidates = Array.from({ length: 70 }, (_, index) =>
      candidate(`candidate-${index}`, "Community activity", "General volunteer task"),
    );
    candidates.push(candidate("saved", "Unrelated niche outcome", "Unusual task", { trustLevel: 1 }));

    await buildHybridLiveNowFeed({
      candidates,
      profile: {
        ...profile,
        savedOpportunityKeys: new Set(["offer:saved"]),
      },
      now,
      embeddingProvider: provider,
    });

    assert.equal(
      provider.seen.some((input) => input.key === "opportunity:offer:saved"),
      true,
    );
    assert.equal(
      provider.seen.filter((input) => input.kind === "opportunity").length,
      60,
    );
  } finally {
    if (previous === undefined) delete process.env.LIVE_FEED_RETRIEVAL_POOL_SIZE;
    else process.env.LIVE_FEED_RETRIEVAL_POOL_SIZE = previous;
  }
});

test("the embedding input builder accepts no private profile fields", () => {
  const privatePriorityText = "My private family-specific reflective priority";
  const inputs = buildPublicEmbeddingInputs(
    [candidate("one", "Animal welfare", "Research")],
    {
      causes: ["Animal welfare", privatePriorityText],
      openToPayment: true,
      openToPledges: true,
    },
  ).inputs;

  assert.equal(inputs.some((input) => "goal" in input || "profile" in input), false);
  assert.equal(inputs.some((input) => input.publicText.includes(privatePriorityText)), false);
  assert.equal(inputs.every((input) => input.publicText.length > 0), true);
});
